import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Alert,
    Platform,
    StatusBar,
} from 'react-native';

// --- Icons ---
import FeatherIcon from 'react-native-vector-icons/Feather';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Icon from 'react-native-vector-icons/MaterialIcons';

// --- Navigation ---
import { useNavigation, useIsFocused } from '@react-navigation/native';

// --- Other Components/Libraries ---
import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore';

// --- Helper Function to Map Material Names to Icons (Adapted for Industry) ---
const materialIconMap = {
    corn: 'corn', maize: 'corn', grain: 'barley', wheat: 'wheat',
    rice: 'rice', soybean: 'soybean', fruit: 'food-apple', vegetable: 'carrot',
    wood: 'tree', cotton: 'cotton', textile: 'hanger', metal: 'mine',
};
const getMaterialIconName = (materialName) => {
    const lowerCaseMaterial = materialName?.toLowerCase() || '';
    for (const key in materialIconMap) {
        if (lowerCaseMaterial.includes(key)) { return materialIconMap[key]; }
    }
    return 'package-variant';
};
// --- End Helper Function ---

const IndustryProfileScreen = () => {
    const navigation = useNavigation();
    const isFocused = useIsFocused();

    const [activeViewTab, setActiveViewTab] = useState('Overview');
    const [industryId, setIndustryId] = useState(null);
    const [industryData, setIndustryData] = useState(null);
    const [isLoadingProfile, setIsLoadingProfile] = useState(true);
    const [profileError, setProfileError] = useState(null);
    const [feedbackItems, setFeedbackItems] = useState([]);
    const [isLoadingFeedback, setIsLoadingFeedback] = useState(false);
    const [feedbackError, setFeedbackError] = useState(null);
    const [hasFetchedFeedback, setHasFetchedFeedback] = useState(false);

    useEffect(() => {
        const fetchIndustryProfile = async () => {
            if (!isFocused) return;

            console.log("IndustryProfileScreen: Focused. Fetching profile...");
            setIsLoadingProfile(true);
            setProfileError(null);
            setIndustryData(null);
            setIndustryId(null);
            setFeedbackItems([]); setHasFetchedFeedback(false); setFeedbackError(null);
            setIsLoadingFeedback(false); setActiveViewTab('Overview');

            try {
                const id = await AsyncStorage.getItem('loggedInUserId');
                if (!id) {
                    console.error('IndustryProfileScreen: loggedInUserId not found.');
                    Alert.alert("Session Expired", "Please log in again.");
                    setTimeout(() => navigation.replace('IndustryLogin'), 0);
                    return;
                }
                setIndustryId(id);

                console.log(`Fetching Firestore document: Industries/${id}`);
                const industryDoc = await firestore().collection('Industries').doc(id).get();

                if (industryDoc.exists) {
                    console.log("Industry profile document found.");
                    setIndustryData(industryDoc.data());
                    setProfileError(null);
                } else {
                    console.log(`Industry profile document for ID ${id} NOT found.`);
                    setProfileError('Your industry profile data was not found. Please create or edit your profile.');
                    setIndustryData(null);
                }
            } catch (error) {
                console.error("Error fetching industry profile:", error);
                if (error.code === 'permission-denied') {
                    setProfileError('Permission denied accessing profile.');
                    Alert.alert('Access Denied', 'Cannot view profile.');
                    setTimeout(() => navigation.replace('IndustryLogin'), 0);
                } else {
                    setProfileError(`Error loading profile: ${error.message}. Check connection.`);
                }
                setIndustryData(null);
            } finally {
                setIsLoadingProfile(false);
            }
        };

        fetchIndustryProfile();
    }, [isFocused, navigation]);

    const fetchFeedback = async () => {
        if (!industryId) {
            setFeedbackError("Industry session invalid. Cannot load feedback.");
            setHasFetchedFeedback(true); setIsLoadingFeedback(false); return;
        }
        if (isLoadingFeedback) return;

        console.log(`Fetching feedback: Industries/${industryId}/feedback`);
        setIsLoadingFeedback(true); setFeedbackError(null); setFeedbackItems([]);

        try {
            const querySnapshot = await firestore()
                .collection('Industries')
                .doc(industryId)
                .collection('feedback')
                .orderBy('timestamp', 'desc')
                .limit(50)
                .get();

            const items = querySnapshot.docs.map(doc => {
                const data = doc.data();
                const timestamp = data.timestamp instanceof firestore.Timestamp
                    ? data.timestamp.toDate()
                    : null;
                return {
                    id: doc.id,
                    farmerName: data.farmerName || 'Unknown Farmer',
                    feedbackText: data.feedbackText || '*No feedback text*',
                    creditScore: data.creditScore,
                    timestamp: timestamp,
                };
            });
            console.log(`Fetched ${items.length} feedback items.`);
            setFeedbackItems(items);
        } catch (error) {
            console.error(`Error fetching feedback for ${industryId}:`, error);
            if (error.code === 'failed-precondition') {
                setFeedbackError("Database index required for sorting feedback. Check Firestore console.");
                Alert.alert("Database Index Required", "An index is needed to sort feedback. Please check the Firestore console for instructions.");
            } else if (error.code === 'permission-denied') {
                setFeedbackError("Permission denied accessing feedback data.");
                Alert.alert("Access Denied", "You do not have permission to view feedback.");
            } else {
                setFeedbackError("Could not load feedback. Check connection and try again.");
            }
        } finally {
            setIsLoadingFeedback(false);
            setHasFetchedFeedback(true);
        }
    };

    const handleViewTabPress = (tabName) => {
        setActiveViewTab(tabName);
        if (tabName === 'Feedback' && (!hasFetchedFeedback || feedbackError)) {
            fetchFeedback();
        }
    };

    const retryProfileLoad = () => {
        console.log("Retrying profile load...");
        setIsLoadingProfile(true);
        const fetchAgain = async () => {
            if (!isFocused) return;
            setProfileError(null); setIndustryData(null); setIndustryId(null);
            setFeedbackItems([]); setHasFetchedFeedback(false); setFeedbackError(null);
            setIsLoadingFeedback(false); setActiveViewTab('Overview');
            try {
                const id = await AsyncStorage.getItem('loggedInUserId');
                if (!id) { console.error('Retry: ID not found.'); Alert.alert("Session Expired", "Log in again."); setTimeout(() => navigation.replace('IndustryLogin'), 0); return; }
                setIndustryId(id);
                const industryDoc = await firestore().collection('Industries').doc(id).get();
                if (industryDoc.exists) { setIndustryData(industryDoc.data()); setProfileError(null); }
                else { setProfileError('Profile data not found.'); setIndustryData(null); }
            } catch (error) { setProfileError(`Retry failed: ${error.message}`); setIndustryData(null); }
            finally { setIsLoadingProfile(false); }
        };
        fetchAgain();
    };

    if (isLoadingProfile) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#0f9b6e" />
                <Text style={styles.loadingText}>Loading Profile...</Text>
            </View>
        );
    }

    if (profileError && !industryData && !profileError.includes('not found')) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <FeatherIcon name="arrow-left" size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Profile Error</Text>
                    <View style={styles.headerSpacer} />
                </View>
                <View style={styles.centered}>
                    <Icon name="error-outline" size={50} color="#cc0000" />
                    <Text style={styles.errorText}>{profileError}</Text>
                    <TouchableOpacity
                        style={[styles.editButton, { backgroundColor: '#6c757d', marginTop: 10 }]}
                        onPress={retryProfileLoad}
                    >
                        <Text style={styles.editButtonText}>Retry Load</Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.bottomNav}>
                    {[
                        { name: 'Home', icon: 'home', screen: 'IndustryHome' },
                        { name: 'Transaction', icon: 'account-balance-wallet', screen: 'IndustryTrans' },
                        { name: 'Profile', icon: 'person-outline', screen: 'IndustryProfile' },
                        { name: 'Help', icon: 'help-outline', screen: 'IndustryHelp' },
                    ].map((tab) => {
                        const isTabActive = navigation.getState()?.routes[navigation.getState()?.index]?.name === tab.screen;
                        return (
                            <TouchableOpacity
                                key={tab.name}
                                style={styles.navItem}
                                onPress={() => { if (!isTabActive) navigation.navigate(tab.screen); }}
                            >
                                <Icon name={tab.icon} size={28} color={isTabActive ? '#0f9b6e' : 'gray'} />
                                <Text style={[styles.navText, isTabActive && styles.activeNavText]}>{tab.name}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>
        );
    }

    if (!isLoadingProfile && !industryData) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <FeatherIcon name="arrow-left" size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Industry Profile</Text>
                    <View style={styles.headerSpacer} />
                </View>
                <View style={styles.centered}>
                    <Icon name="business" size={50} color="#aaa" />
                    <Text style={styles.errorText}>
                        {profileError || "Industry profile data not found."}
                    </Text>
                    <TouchableOpacity
                        style={styles.editButton}
                        onPress={() => navigation.navigate('IndustryProfileEdit')}
                    >
                        <Text style={styles.editButtonText}>Create / Edit Profile</Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.bottomNav}>
                    {[
                        { name: 'Home', icon: 'home', screen: 'IndustryHome' },
                        { name: 'Transaction', icon: 'account-balance-wallet', screen: 'IndustryTrans' },
                        { name: 'Profile', icon: 'person-outline', screen: 'IndustryProfile' },
                        { name: 'Help', icon: 'help-outline', screen: 'IndustryHelp' },
                    ].map((tab) => {
                        const isTabActive = navigation.getState()?.routes[navigation.getState()?.index]?.name === tab.screen;
                        return (
                            <TouchableOpacity
                                key={tab.name}
                                style={styles.navItem}
                                onPress={() => { if (!isTabActive) navigation.navigate(tab.screen); }}
                            >
                                <Icon name={tab.icon} size={28} color={isTabActive ? '#0f9b6e' : 'gray'} />
                                <Text style={[styles.navText, isTabActive && styles.activeNavText]}>{tab.name}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>
        );
    }

    const name = industryData?.name || 'Industry Name Not Set';
    const location = industryData?.location || 'Location Not Set';
    const contact = industryData?.contact || 'Contact Not Set';
    const materials = industryData?.rawMaterials || [];

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <FeatherIcon name="arrow-left" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Industry Profile</Text>
                <View style={styles.headerSpacer} />
            </View>

            {/* Tabs */}
            <View style={styles.tabs}>
                <TouchableOpacity style={styles.tabButton} onPress={() => handleViewTabPress('Overview')}>
                    <Text style={[styles.tab, activeViewTab === 'Overview' && styles.activeTab]}>
                        Overview
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.tabButton} onPress={() => handleViewTabPress('Feedback')}>
                    <Text style={[styles.tab, activeViewTab === 'Feedback' && styles.activeTab]}>
                        Feedback
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Content */}
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
                {activeViewTab === 'Overview' && (
                    <View style={styles.sectionCard}>
                        <View style={styles.profileHeader}>
                            <View style={styles.avatar}>
                                <Icon name="business" size={40} color="#0f9b6e" />
                            </View>
                            <View style={styles.profileInfo}>
                                <Text style={styles.farmerName}>{name}</Text>
                                <View style={styles.infoRow}>
                                    <FeatherIcon name="map-pin" size={16} color="#777" />
                                    <Text style={styles.location}>{location}</Text>
                                </View>
                            </View>
                        </View>

                        <View style={styles.sectionDivider} />
                        <Text style={styles.sectionTitle}>Contact Information</Text>
                        <View style={styles.contactCard}>
                            <FeatherIcon name={contact.includes('@') ? "mail" : "phone"} size={20} color="#0f9b6e" />
                            <Text style={styles.contactText}>{contact}</Text>
                        </View>

                        <View style={styles.sectionDivider} />
                        <Text style={styles.sectionTitle}>Raw Materials Handled</Text>
                        <View style={styles.materialsList}>
                            {materials.length > 0 ? (
                                materials.map((material, index) => (
                                    <View key={index} style={styles.materialItem}>
                                        <MaterialCommunityIcons name={getMaterialIconName(material)} size={38} color="#0f9b6e" />
                                        <Text style={styles.materialLabel}>{material}</Text>
                                    </View>
                                ))
                            ) : (
                                <Text style={styles.noDataText}>No raw materials listed yet.</Text>
                            )}
                        </View>
                    </View>
                )}

                {activeViewTab === 'Feedback' && (
                    <View style={styles.sectionCard}>
                        <Text style={styles.sectionTitle}>Feedback Received</Text>
                        {isLoadingFeedback && (
                            <ActivityIndicator style={styles.feedbackLoader} size="large" color="#0f9b6e" />
                        )}
                        {feedbackError && !isLoadingFeedback && (
                            <View style={styles.centeredFeedbackMessage}>
                                <Icon name="error-outline" size={32} color="#cc0000" />
                                <Text style={styles.errorText}>{feedbackError}</Text>
                                <TouchableOpacity onPress={fetchFeedback} style={styles.retryFeedbackButton}>
                                    <Text style={styles.retryButtonText}>Retry</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                        {!isLoadingFeedback && !feedbackError && feedbackItems.length === 0 && hasFetchedFeedback && (
                            <View style={styles.centeredFeedbackMessage}>
                                <Icon name="chat-bubble-outline" size={32} color="#999" />
                                <Text style={styles.noDataText}>No feedback received yet.</Text>
                            </View>
                        )}
                        {!isLoadingFeedback && !feedbackError && feedbackItems.length > 0 && (
                            <View style={styles.feedbackListContainer}>
                                {feedbackItems.map((item) => (
                                    <View key={item.id} style={styles.feedbackItem}>
                                        <View style={styles.feedbackHeader}>
                                            <Text style={styles.feedbackSender}>{item.farmerName}</Text>
                                            {typeof item.creditScore === 'number' && item.creditScore > 0 && (
                                                <View style={styles.feedbackRating}>
                                                    <Text style={styles.ratingText}>{item.creditScore}</Text>
                                                    {[...Array(5)].map((_, i) => (
                                                        <Icon key={i} name={i < item.creditScore ? 'star' : 'star-border'} size={18} color="#ffca28" />
                                                    ))}
                                                </View>
                                            )}
                                        </View>
                                        <Text style={styles.feedbackComment}>{item.feedbackText}</Text>
                                        {item.timestamp && (
                                            <Text style={styles.feedbackTimestamp}>
                                                {item.timestamp.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                                {' • '}
                                                {item.timestamp.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                                            </Text>
                                        )}
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>
                )}
            </ScrollView>

            {/* Edit Button */}
            <TouchableOpacity style={styles.editButton} onPress={() => navigation.navigate('IndustryProfileEdit')}>
                <FeatherIcon name="edit-2" size={20} color="#fff" />
                <Text style={styles.editButtonText}>Edit Profile</Text>
            </TouchableOpacity>

            {/* Bottom Navigation */}
            <View style={styles.bottomNav}>
                {[
                    { name: 'Home', icon: 'home', screen: 'IndustryHome' },
                    { name: 'Transaction', icon: 'account-balance-wallet', screen: 'IndustryTrans' },
                    { name: 'Profile', icon: 'person-outline', screen: 'IndustryProfile' },
                    { name: 'Help', icon: 'help-outline', screen: 'IndustryHelp' },
                ].map((tab) => {
                    const isTabActive = navigation.getState()?.routes[navigation.getState()?.index]?.name === tab.screen;
                    return (
                        <TouchableOpacity
                            key={tab.name}
                            style={styles.navItem}
                            onPress={() => { if (!isTabActive) navigation.navigate(tab.screen); }}
                        >
                            <Icon name={tab.icon} size={28} color={isTabActive ? '#0f9b6e' : 'gray'} />
                            <Text style={[styles.navText, isTabActive && styles.activeNavText]}>{tab.name}</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
};

// --- Stylesheet ---
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fafafa',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#fafafa',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 18,
        color: '#666',
        fontWeight: '500',
    },
    errorText: {
        marginTop: 12,
        fontSize: 16,
        color: '#d32f2f',
        textAlign: 'center',
        lineHeight: 24,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 15,
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 5 : 50,
        paddingHorizontal: 20,
        backgroundColor: '#0f9b6e',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#fff',
        letterSpacing: 0.5,
    },
    headerSpacer: {
        width: 40,
    },
    tabs: {
        flexDirection: 'row',
        justifyContent: 'center',
        backgroundColor: '#fff',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
        elevation: 2,
    },
    tabButton: {
        paddingHorizontal: 25,
        paddingVertical: 12,
        borderRadius: 20,
        marginHorizontal: 5,
    },
    tab: {
        fontSize: 16,
        color: '#777',
        fontWeight: '600',
    },
    activeTab: {
        color: '#0f9b6e',
        fontWeight: '700',
        backgroundColor: '#e8f5e9',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 15,
    },
    content: {
        flex: 1,
        paddingHorizontal: 15,
    },
    sectionCard: {
        backgroundColor: '#fff',
        borderRadius: 15,
        padding: 20,
        marginTop: 20,
        marginBottom: 10,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
    },
    profileHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#e8f5e9',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    profileInfo: {
        flex: 1,
    },
    farmerName: {
        fontSize: 26,
        fontWeight: '700',
        color: '#222',
        marginBottom: 5,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    location: {
        fontSize: 16,
        color: '#555',
        marginLeft: 8,
        fontWeight: '500',
    },
    sectionDivider: {
        height: 1,
        backgroundColor: '#eceff1',
        marginVertical: 20,
    },
    sectionTitle: {
        fontSize: 19,
        fontWeight: '700',
        color: '#333',
        marginBottom: 15,
        letterSpacing: 0.3,
    },
    contactCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f1f8e9',
        padding: 15,
        borderRadius: 12,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#dcedc8',
    },
    contactText: {
        fontSize: 16,
        color: '#444',
        marginLeft: 12,
        fontWeight: '500',
    },
    materialsList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
        gap: 15,
    },
    materialItem: {
        alignItems: 'center',
        width: 90,
        padding: 12,
        backgroundColor: '#f1f8e9',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#dcedc8',
    },
    materialLabel: {
        marginTop: 8,
        fontSize: 14,
        color: '#333',
        fontWeight: '600',
        textAlign: 'center',
    },
    noDataText: {
        fontSize: 16,
        color: '#999',
        fontStyle: 'italic',
        textAlign: 'center',
        marginVertical: 25,
    },
    editButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0f9b6e',
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 12,
        marginHorizontal: 15,
        marginVertical: 15,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 5,
    },
    editButtonText: {
        fontWeight: '700',
        color: '#fff',
        fontSize: 16,
        marginLeft: 8,
        letterSpacing: 0.5,
    },
    bottomNav: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        borderTopWidth: 1,
        borderColor: '#e0e0e0',
        paddingVertical: 8,
        backgroundColor: '#fff',
        paddingBottom: Platform.OS === 'ios' ? 25 : 10,
    },
    navItem: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
    },
    navText: {
        fontSize: 11,
        color: 'gray',
        marginTop: 3,
    },
    activeNavText: {
        color: '#0f9b6e',
        fontWeight: '600',
    },
    feedbackLoader: {
        marginVertical: 30,
    },
    centeredFeedbackMessage: {
        alignItems: 'center',
        marginVertical: 25,
    },
    retryFeedbackButton: {
        marginTop: 15,
        backgroundColor: '#0f9b6e',
        paddingVertical: 10,
        paddingHorizontal: 25,
        borderRadius: 8,
        elevation: 2,
    },
    retryButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    feedbackListContainer: {
        marginTop: 10,
    },
    feedbackItem: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 15,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
    },
    feedbackHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    feedbackSender: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        flexShrink: 1,
    },
    feedbackRating: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    ratingText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#ffca28',
        marginRight: 5,
    },
    feedbackComment: {
        fontSize: 15,
        color: '#555',
        lineHeight: 22,
        marginBottom: 8,
    },
    feedbackTimestamp: {
        fontSize: 12,
        color: '#999',
        textAlign: 'right',
    },
});

export default IndustryProfileScreen;