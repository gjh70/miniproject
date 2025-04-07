import React, { useState, useEffect, useCallback } from 'react'; // Added useCallback
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Alert,
    Platform,
    StatusBar, // Added StatusBar
} from 'react-native';

import FeatherIcon from 'react-native-vector-icons/Feather';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { useNavigation, useIsFocused } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore';

// --- Crop Icon Mapping ---
const cropIconMap = {
    corn: 'corn', maize: 'corn', wheat: 'barley', grain: 'barley', rice: 'rice', // Adjusted wheat/grain
    soybean: 'soybean', apple: 'food-apple', tomato: 'food-variant', // Keeping tomato/potato generic for now
    potato: 'food-variant', paddy: 'leaf', fruit: 'food-apple', vegetable: 'carrot', // Added common ones
};
const getCropIconName = (cropName) => {
    const lowerCaseCrop = cropName?.toLowerCase() || '';
    for (const key in cropIconMap) {
        if (lowerCaseCrop.includes(key)) { return cropIconMap[key]; }
    }
    return 'leaf'; // Default icon
};
// --- End Crop Icon Mapping ---


// --- Circular Progress Component (Updated to handle loading/no score) ---
const CircularProgress = ({ score, size, isLoading, hasError }) => {
    const maxScore = 5;
    const radius = size / 2;
    const strokeWidth = 8;

    let displayText = '';
    let progressColor = '#e0e0e0'; // Default to background color

    if (isLoading) {
        displayText = '...'; // Indicate loading
    } else if (hasError) {
        displayText = 'Error';
        progressColor = '#d32f2f'; // Error color
    } else if (score !== null && score >= 0) {
        displayText = `${score.toFixed(1)}/5`; // Format score to 1 decimal
        progressColor = '#0f9b6e'; // Progress color
    } else {
        displayText = 'N/A'; // No score available
    }

    // Simplified progress indication: Use color fill instead of complex SVG paths for simplicity here
    // A more accurate circular progress would require react-native-svg
    const progressStyle = score !== null && score > 0 && !isLoading && !hasError
        ? { borderColor: progressColor }
        : { borderColor: '#e0e0e0' }; // Show only background if no score or loading/error

    return (
        <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
            {/* Background Circle */}
            <View style={[styles.progressCircleBase, { width: size, height: size, borderRadius: radius, borderWidth: strokeWidth }]} />
            {/* Progress Indicator (Simplified: just uses the border color change) */}
            {/* For a real progress arc, SVG is needed. This is a visual approximation */}
            <View style={[
                styles.progressCircleBase,
                 {
                    width: size,
                    height: size,
                    borderRadius: radius,
                    borderWidth: strokeWidth,
                    position: 'absolute',
                 },
                 progressStyle // Apply dynamic border color
             ]} />
             {/* Score Text */}
            <Text style={[styles.progressText, { fontSize: size / 3.5, color: isLoading || hasError || score === null ? '#999' : '#333' }]}>
                {displayText}
            </Text>
        </View>
    );
};
// --- End Circular Progress Component ---


const FarmerProfileScreen = () => {
    const navigation = useNavigation();
    const isFocused = useIsFocused();

    const [activeViewTab, setActiveViewTab] = useState('Overview');
    const [farmerId, setFarmerId] = useState(null);
    const [farmerData, setFarmerData] = useState(null);
    const [isLoadingProfile, setIsLoadingProfile] = useState(true);
    const [profileError, setProfileError] = useState(null);

    const [feedbackItems, setFeedbackItems] = useState([]);
    const [isLoadingFeedback, setIsLoadingFeedback] = useState(false); // Separate loading for feedback
    const [feedbackError, setFeedbackError] = useState(null);
    const [hasFetchedFeedback, setHasFetchedFeedback] = useState(false);
    const [averageCreditScore, setAverageCreditScore] = useState(null); // State for average score

    // --- Fetch Feedback Function ---
    const fetchFeedback = useCallback(async (currentFarmerId) => {
        if (!currentFarmerId) {
            setFeedbackError("Cannot load feedback: Farmer ID missing.");
            setHasFetchedFeedback(true); setIsLoadingFeedback(false); setAverageCreditScore(null); return;
        }
        // Don't check isLoadingFeedback here if called automatically after profile load

        console.log(`Fetching feedback: Farmers/${currentFarmerId}/feedback`);
        setIsLoadingFeedback(true); setFeedbackError(null); setFeedbackItems([]); setAverageCreditScore(null); // Reset

        try {
            const querySnapshot = await firestore()
                .collection('Farmers')
                .doc(currentFarmerId)
                .collection('feedback')
                .orderBy('timestamp', 'desc')
                .limit(50)
                .get();

            let totalScore = 0;
            let scoreCount = 0;
            const items = querySnapshot.docs.map(doc => {
                const data = doc.data();
                const timestamp = data.timestamp instanceof firestore.Timestamp
                                    ? data.timestamp.toDate()
                                    : null;
                // Calculate average score
                if (typeof data.creditScore === 'number' && data.creditScore >= 0 && data.creditScore <= 5) { // Allow 0 score, check range
                    totalScore += data.creditScore;
                    scoreCount++;
                }
                return {
                    id: doc.id,
                    industryName: data.industryName || 'Unknown Industry',
                    feedbackText: data.feedbackText || '*No feedback text*',
                    creditScore: data.creditScore, // Keep original score
                    timestamp: timestamp,
                };
            });

            console.log(`Fetched ${items.length} feedback items. Found ${scoreCount} valid scores.`);
            setFeedbackItems(items);
            if (scoreCount > 0) {
                const avg = totalScore / scoreCount;
                setAverageCreditScore(parseFloat(avg.toFixed(1))); // Calculate and set average
                console.log(`Average Score: ${avg.toFixed(1)}`);
            } else {
                setAverageCreditScore(null); // No valid scores found
                console.log(`No valid scores found for average calculation.`);
            }
            setFeedbackError(null); // Clear previous errors
        } catch (error) {
            console.error("Error fetching feedback subcollection:", error);
            setAverageCreditScore(null); // Reset score on error
            if (error.code === 'failed-precondition') {
                setFeedbackError("Database index required for sorting feedback. Check Firestore console.");
                // Avoid alert if loading automatically
            } else if (error.code === 'permission-denied') {
                setFeedbackError("Permission denied accessing feedback.");
             } else {
                setFeedbackError("Could not load feedback data.");
            }
        } finally {
            setIsLoadingFeedback(false);
            setHasFetchedFeedback(true);
        }
    }, []); // End useCallback for fetchFeedback

    // --- Fetch Profile Effect ---
    useEffect(() => {
        const fetchFarmerProfile = async () => {
            if (!isFocused) return;

            console.log("FarmerProfileScreen: Focused. Fetching profile...");
            setIsLoadingProfile(true);
            setProfileError(null);
            setFarmerData(null);
            setFarmerId(null);
            // Reset feedback related state
            setFeedbackItems([]);
            setHasFetchedFeedback(false);
            setFeedbackError(null);
            setIsLoadingFeedback(false);
            setAverageCreditScore(null);
            setActiveViewTab('Overview');

            let fetchedId = null; // Temp variable for ID

            try {
                const id = await AsyncStorage.getItem('loggedInUserId');
                if (!id) {
                    // Handle missing ID more gracefully if possible, but logout is often necessary
                    console.error('FarmerProfileScreen: loggedInUserId not found.');
                    Alert.alert("Session Expired", "Please log in again.");
                    // Use timeout to allow state update before navigation
                    setTimeout(() => navigation.replace('FarmerLogin'), 0);
                    return; // Stop execution
                }
                fetchedId = id;
                setFarmerId(id);

                console.log(`Fetching Firestore document: Farmers/${id}`);
                const farmerDoc = await firestore().collection('Farmers').doc(id).get();

                if (farmerDoc.exists) {
                    console.log("Farmer profile document found.");
                    setFarmerData(farmerDoc.data()); // Set farmer data WITHOUT dummy score
                    setProfileError(null);
                    // --- Trigger feedback fetch AFTER profile is loaded ---
                    console.log("Profile loaded, initiating feedback fetch for average score...");
                    fetchFeedback(fetchedId); // Pass the confirmed ID
                    // --- End feedback fetch trigger ---
                } else {
                    console.log(`Farmer profile document for ID ${id} NOT found.`);
                    // Handle profile not found - maybe navigate to edit screen or show specific message
                    setProfileError('Your profile data was not found. Please create or edit your profile.');
                    setFarmerData(null); // Ensure farmerData is null
                    setHasFetchedFeedback(true); // Still mark feedback as 'checked'
                    // Consider navigating to edit screen:
                    // navigation.navigate('FarmerProfileEdit');
                }
            } catch (error) {
                console.error("Error fetching farmer profile:", error);
                setAverageCreditScore(null); // Reset score on error
                setHasFetchedFeedback(true); // Mark as checked
                setProfileError(`Error loading profile: ${error.message}. Check connection or log in again.`);
                setFarmerData(null);
                // Optional: Alert or navigate on critical errors
                // Alert.alert('Error', `Failed to load profile: ${error.message}.`);
                 // Consider logout only for specific errors like permissions
                 // if (error.code === 'permission-denied') {
                 //   setTimeout(() => navigation.replace('FarmerLogin'), 0);
                 // }
            } finally {
                setIsLoadingProfile(false);
            }
        };

        fetchFarmerProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isFocused, navigation, fetchFeedback]); // Add fetchFeedback dependency

    // --- Handle Tab Press ---
     const handleViewTabPress = (tabName) => {
        setActiveViewTab(tabName);
        // Fetch feedback if switching to Feedback tab AND it hasn't been fetched successfully yet,
        // OR if there was a previous error trying to fetch.
        if (tabName === 'Feedback' && (!hasFetchedFeedback || feedbackError)) {
             if (farmerId && !isLoadingFeedback) { // Only fetch if ID exists and not already loading
                fetchFeedback(farmerId);
            }
        }
    };

     // --- Retry Profile Load --- (Optional, but good practice)
    const retryProfileLoad = () => {
        console.log("Retrying profile load...");
        setIsLoadingProfile(true);
        setProfileError(null); setFarmerData(null); setFarmerId(null);
        setFeedbackItems([]); setHasFetchedFeedback(false); setFeedbackError(null);
        setIsLoadingFeedback(false); setActiveViewTab('Overview'); setAverageCreditScore(null);

        const fetchAgain = async () => {
             let fetchedId = null;
             try {
                const id = await AsyncStorage.getItem('loggedInUserId');
                if (!id) { console.error('Retry: ID not found.'); Alert.alert("Session Expired", "Log in again."); setTimeout(() => navigation.replace('FarmerLogin'), 0); return; }
                fetchedId = id;
                setFarmerId(id);
                const farmerDoc = await firestore().collection('Farmers').doc(id).get();
                if (farmerDoc.exists) {
                    setFarmerData(farmerDoc.data());
                    setProfileError(null);
                    console.log("Profile re-loaded, initiating feedback fetch...");
                    fetchFeedback(fetchedId); // Fetch feedback after successful retry
                } else {
                    setProfileError('Profile data not found.');
                    setFarmerData(null);
                    setHasFetchedFeedback(true); // Mark as checked
                }
            } catch (error) {
                 setHasFetchedFeedback(true); // Mark as checked on error
                 setProfileError(`Retry failed: ${error.message}`); setFarmerData(null);
                 setAverageCreditScore(null);
            }
            finally { setIsLoadingProfile(false); }
        };
        fetchAgain();
    };

    // --- Render Loading State ---
    if (isLoadingProfile) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#0f9b6e" />
                <Text style={styles.loadingText}>Loading Profile...</Text>
            </View>
        );
    }

    // --- Render Profile Error State (More specific handling) ---
    if (profileError && !farmerData) {
        // Differentiate between 'not found' and other errors
        const isNotFoundError = profileError.includes('not found');
        return (
            <View style={styles.container}>
                 <View style={styles.header}>
                    {/* Minimal header for error/not found state */}
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                         <FeatherIcon name="arrow-left" size={24} color="#fff" />
                    </TouchableOpacity>
                     <Text style={styles.headerTitle}>{isNotFoundError ? 'Create Profile' : 'Profile Error'}</Text>
                     <View style={styles.headerSpacer} />
                 </View>
                 <View style={styles.centered}>
                    <Icon name={isNotFoundError ? "person-add-alt-1" : "error-outline"} size={50} color={isNotFoundError ? "#aaa" : "#cc0000"} />
                    <Text style={styles.errorText}>{profileError}</Text>
                    {isNotFoundError ? (
                        <TouchableOpacity
                            style={styles.editButton}
                            onPress={() => navigation.navigate('FarmerProfileEdit', { farmerId: farmerId })} // Pass potential ID if available
                        >
                            <FeatherIcon name="edit-2" size={20} color="#fff" />
                            <Text style={styles.editButtonText}>Create / Edit Profile</Text>
                        </TouchableOpacity>
                    ) : (
                         <TouchableOpacity
                            style={[styles.editButton, { backgroundColor: '#6c757d', marginTop: 10 }]}
                            onPress={retryProfileLoad} // Provide retry for other errors
                         >
                            <Icon name="refresh" size={20} color="#fff" style={{marginRight: 5}}/>
                            <Text style={styles.editButtonText}>Retry Load</Text>
                         </TouchableOpacity>
                    )}
                 </View>
                 {/* Keep Bottom Nav accessible */}
                <View style={styles.bottomNav}>
                    {[
                        { name: 'Home', icon: 'home', screen: 'FarmerHome' },
                        { name: 'Transaction', icon: 'account-balance-wallet', screen: 'FarmerTrans' },
                        { name: 'Profile', icon: 'person-outline', screen: 'FarmerProfile' },
                        { name: 'Help', icon: 'help-outline', screen: 'FarmerHelp' },
                    ].map((tab) => {
                        const isTabActive = navigation.getState()?.routes[navigation.getState()?.index]?.name === tab.screen;
                        return (
                            <TouchableOpacity
                                key={tab.name}
                                style={styles.navItem}
                                onPress={() => { if (!isTabActive) navigation.navigate(tab.screen); }}
                            >
                                <Icon name={tab.icon} size={28} color={isTabActive ? '#0f9b6e' : 'gray'} /> {/* Updated active color */}
                                <Text style={[styles.navText, isTabActive && styles.activeNavText]}>{tab.name}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>
        );
    }

     // Fallback if data is somehow null after loading without error (should be rare)
    if (!farmerData) {
        return (
            <View style={styles.centered}>
                <Icon name="person-off" size={50} color="#aaa" />
                <Text style={styles.errorText}>Profile data unavailable. Try reloading.</Text>
                 <TouchableOpacity
                    style={[styles.editButton, { backgroundColor: '#6c757d', marginTop: 10 }]}
                    onPress={retryProfileLoad}
                 >
                     <Icon name="refresh" size={20} color="#fff" style={{marginRight: 5}}/>
                    <Text style={styles.editButtonText}>Reload</Text>
                 </TouchableOpacity>
            </View>
        );
    }


    // --- Render Main Profile Screen ---
    const name = farmerData?.name || 'N/A';
    const location = farmerData?.location || 'Location not set';
    const contact = farmerData?.contact || 'Contact not set';
    const crops = farmerData?.rawMaterials || []; // Assuming 'rawMaterials' field holds crops
    // creditScore is now from state: averageCreditScore

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <FeatherIcon name="arrow-left" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Farmer Profile</Text>
                <View style={styles.headerSpacer} />
            </View>

            {/* Tabs */}
             <View style={styles.tabs}>
                <TouchableOpacity style={styles.tabButton} onPress={() => handleViewTabPress('Overview')}>
                    <Text style={[styles.tabText, activeViewTab === 'Overview' && styles.activeTabText]}>
                        Overview
                    </Text>
                     {activeViewTab === 'Overview' && <View style={styles.activeTabIndicator} />}
                </TouchableOpacity>
                <TouchableOpacity style={styles.tabButton} onPress={() => handleViewTabPress('Feedback')}>
                    <Text style={[styles.tabText, activeViewTab === 'Feedback' && styles.activeTabText]}>
                        Feedback
                    </Text>
                     {activeViewTab === 'Feedback' && <View style={styles.activeTabIndicator} />}
                </TouchableOpacity>
            </View>

            {/* Content */}
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
                {activeViewTab === 'Overview' && (
                    <View style={styles.sectionCard}>
                        {/* Profile Header */}
                        <View style={styles.profileHeader}>
                            <View style={styles.avatar}>
                                <Icon name="person" size={40} color="#0f9b6e" />
                            </View>
                            <View style={styles.profileInfo}>
                                <Text style={styles.farmerName}>{name}</Text>
                                <View style={styles.infoRow}>
                                    <FeatherIcon name="map-pin" size={16} color="#777" />
                                    <Text style={styles.location}>{location}</Text>
                                </View>
                            </View>
                        </View>

                        {/* Average Credit Score */}
                        <View style={styles.sectionDivider} />
                        <Text style={styles.sectionTitle}>Average Rating</Text>
                        <View style={styles.creditScoreContainer}>
                            <CircularProgress
                                score={averageCreditScore}
                                size={100}
                                isLoading={isLoadingFeedback && !hasFetchedFeedback} // Loading only initially
                                hasError={!!feedbackError} // Pass error status
                             />
                             {/* Optional: Add text explanation */}
                             {!isLoadingFeedback && feedbackError && (
                                <Text style={[styles.errorText, {fontSize: 14, marginTop: 8}]}>Could not load rating</Text>
                             )}
                             {!isLoadingFeedback && !feedbackError && averageCreditScore === null && hasFetchedFeedback &&(
                                <Text style={styles.noDataTextSmall}>No ratings received yet</Text>
                             )}
                        </View>

                        {/* Contact Info */}
                        <View style={styles.sectionDivider} />
                        <Text style={styles.sectionTitle}>Contact Information</Text>
                        <View style={styles.contactCard}>
                            <FeatherIcon name={contact.includes('@') ? "mail" : "phone"} size={20} color="#0f9b6e" />
                            <Text style={styles.contactText}>{contact}</Text>
                        </View>

                        {/* Crops Grown */}
                        <View style={styles.sectionDivider} />
                        <Text style={styles.sectionTitle}>Crops Grown</Text>
                        <View style={styles.materialsList}>
                            {crops.length > 0 ? (
                                crops.map((crop, index) => (
                                    <View key={index} style={styles.materialItem}>
                                        <MaterialCommunityIcons name={getCropIconName(crop)} size={38} color="#0f9b6e" />
                                        <Text style={styles.materialLabel}>{crop}</Text>
                                    </View>
                                ))
                            ) : (
                                <Text style={styles.noDataText}>No crops listed yet.</Text>
                            )}
                        </View>
                    </View>
                )}

                 {/* --- Feedback Tab Content (Remains mostly the same) --- */}
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
                                <TouchableOpacity
                                     onPress={() => farmerId && fetchFeedback(farmerId)} // Retry with ID
                                     style={styles.retryFeedbackButton}
                                     disabled={isLoadingFeedback} // Disable while loading
                                >
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
                                            <Text style={styles.feedbackSender}>{item.industryName}</Text>
                                            {/* Display individual rating if available */}
                                            {typeof item.creditScore === 'number' && item.creditScore >= 0 && item.creditScore <= 5 && ( // Check range
                                                <View style={styles.feedbackRating}>
                                                    {/* Optional: Display numeric score next to stars */}
                                                    {/* <Text style={styles.ratingText}>{item.creditScore.toFixed(1)}</Text> */}
                                                    {[...Array(5)].map((_, i) => (
                                                        <Icon key={i} name={i < Math.round(item.creditScore) ? 'star' : 'star-border'} size={18} color="#ffca28" />
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
            <TouchableOpacity style={styles.editButton} onPress={() => navigation.navigate('FarmerProfileEdit', { farmerId: farmerId })}>
                <FeatherIcon name="edit-2" size={20} color="#fff" />
                <Text style={styles.editButtonText}>Edit Profile</Text>
            </TouchableOpacity>

            {/* Bottom Navigation */}
            <View style={styles.bottomNav}>
                {[
                    { name: 'Home', icon: 'home', screen: 'FarmerHome' },
                    { name: 'Transaction', icon: 'account-balance-wallet', screen: 'FarmerTrans' },
                    { name: 'Profile', icon: 'person-outline', screen: 'FarmerProfile' },
                    { name: 'Help', icon: 'help-outline', screen: 'FarmerHelp' },
                ].map((tab) => {
                    const isTabActive = navigation.getState()?.routes[navigation.getState()?.index]?.name === tab.screen;
                    return (
                        <TouchableOpacity
                            key={tab.name}
                            style={styles.navItem}
                            onPress={() => { if (!isTabActive) navigation.navigate(tab.screen); }}
                        >
                            <Icon name={tab.icon} size={28} color={isTabActive ? '#0f9b6e' : 'gray'} /> {/* Updated active color */}
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
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0, // Handle Android status bar
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
        paddingHorizontal: 20, // Prevent long errors overflowing
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12, // Slightly reduced padding
        paddingHorizontal: 15,
        backgroundColor: '#0f9b6e',
        // Removed explicit paddingTop, handled by container paddingTop
        // elevation: 4, // Keep elevation/shadow
        // shadowColor: '#000',
        // shadowOffset: { width: 0, height: 2 },
        // shadowOpacity: 0.2,
        // shadowRadius: 4,
    },
    backButton: {
        padding: 8, // Make tap area larger
        marginLeft: -5, // Adjust alignment
    },
    headerTitle: {
        fontSize: 20, // Slightly smaller title
        fontWeight: 'bold', // Use bold instead of 700
        color: '#fff',
        textAlign: 'center',
    },
    headerSpacer: {
        width: 40, // Keep for centering
    },
     tabs: {
        flexDirection: 'row',
        justifyContent: 'space-around', // Distribute tabs evenly
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    tabButton: {
        flex: 1, // Make buttons take equal width
        alignItems: 'center', // Center text
        paddingVertical: 15, // Adjust padding as needed
    },
    tabText: {
        fontSize: 16,
        color: '#777',
        fontWeight: '600',
    },
    activeTabText: {
        color: '#0f9b6e',
        fontWeight: '700',
    },
    activeTabIndicator: { // Simple underline indicator
        height: 3,
        width: '60%', // Adjust width as needed
        backgroundColor: '#0f9b6e',
        marginTop: 5,
        borderRadius: 1.5,
    },
    content: {
        flex: 1,
        paddingHorizontal: 15,
    },
    sectionCard: {
        backgroundColor: '#fff',
        borderRadius: 12, // Slightly smaller radius
        padding: 20,
        marginTop: 15, // Reduced margin
        marginBottom: 10,
        elevation: 3, // Slightly reduced elevation
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
    },
    profileHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15, // Reduced margin
    },
    avatar: {
        width: 55, // Slightly smaller avatar
        height: 55,
        borderRadius: 27.5,
        backgroundColor: '#e8f5e9',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    profileInfo: {
        flex: 1,
    },
    farmerName: {
        fontSize: 24, // Slightly smaller name
        fontWeight: 'bold',
        color: '#222',
        marginBottom: 4,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    location: {
        fontSize: 15, // Slightly smaller location text
        color: '#555', // Darker gray
        marginLeft: 8,
        fontWeight: '500',
    },
    sectionDivider: {
        height: 1,
        backgroundColor: '#eceff1',
        marginVertical: 15, // Reduced margin
    },
    sectionTitle: {
        fontSize: 18, // Slightly smaller title
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 12, // Reduced margin
        letterSpacing: 0.2,
    },
    // --- Credit Score / Progress Circle Styles ---
    creditScoreContainer: {
        alignItems: 'center',
        marginVertical: 10, // Add some vertical margin
    },
    progressCircleBase: {
        borderColor: '#e0e0e0', // Background color
        borderStyle: 'solid',
    },
    progressText: {
        position: 'absolute',
        fontWeight: '700',
        textAlign: 'center',
    },
    noDataTextSmall: { // For inline messages like 'No ratings'
        fontSize: 14,
        color: '#999',
        fontStyle: 'italic',
        marginTop: 8,
    },
    // --- End Credit Score Styles ---
    contactCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f1f8e9',
        padding: 15,
        borderRadius: 10, // Slightly smaller radius
        // marginBottom: 15, // Removed mb, handled by divider
        borderWidth: 1,
        borderColor: '#dcedc8',
    },
    contactText: {
        fontSize: 15, // Slightly smaller
        color: '#444',
        marginLeft: 12,
        fontWeight: '500',
    },
    materialsList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
        gap: 12, // Slightly reduced gap
    },
    materialItem: {
        alignItems: 'center',
        width: 85, // Slightly smaller item
        padding: 10, // Reduced padding
        backgroundColor: '#f1f8e9',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#dcedc8',
    },
    materialLabel: {
        marginTop: 6, // Reduced margin
        fontSize: 13, // Smaller label
        color: '#333',
        fontWeight: '600',
        textAlign: 'center',
    },
    noDataText: { // For empty lists (crops, feedback)
        fontSize: 15, // Slightly smaller
        color: '#999',
        fontStyle: 'italic',
        textAlign: 'center',
        marginVertical: 20, // Reduced margin
        width: '100%', // Ensure full width
    },
    editButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0f9b6e',
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 10, // Consistent radius
        marginHorizontal: 15,
        marginVertical: 15,
        elevation: 4, // Slightly reduced elevation
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    editButtonText: {
        fontWeight: 'bold',
        color: '#fff',
        fontSize: 16,
        marginLeft: 8,
        letterSpacing: 0.4,
    },
    bottomNav: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        borderTopWidth: 1,
        borderColor: '#e0e0e0',
        paddingTop: 8,
        paddingBottom: Platform.OS === 'ios' ? 25 : 10,
        backgroundColor: '#fff',
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
        color: '#0f9b6e', // Ensure active color matches theme
        fontWeight: '600',
    },
    // --- Feedback Styles ---
    feedbackLoader: {
        marginVertical: 30,
    },
    centeredFeedbackMessage: {
        alignItems: 'center',
        marginVertical: 25,
        paddingHorizontal: 20, // Add padding for text wrapping
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
        borderRadius: 10, // Consistent radius
        padding: 15,
        marginBottom: 12, // Slightly reduced margin
        borderWidth: 1,
        borderColor: '#e8e8e8', // Lighter border
        elevation: 1, // Minimal elevation
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
    },
    feedbackHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8, // Reduced margin
    },
    feedbackSender: {
        fontSize: 15, // Slightly smaller
        fontWeight: '600',
        color: '#333',
        flexShrink: 1,
        marginRight: 10,
    },
    feedbackRating: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    ratingText: { // Numeric rating next to stars (currently commented out in JSX)
        fontSize: 14,
        fontWeight: '600',
        color: '#ffca28',
        marginRight: 4,
    },
    feedbackComment: {
        fontSize: 14, // Slightly smaller comment text
        color: '#555',
        lineHeight: 20, // Adjust line height
        marginBottom: 8,
    },
    feedbackTimestamp: {
        fontSize: 11, // Smaller timestamp
        color: '#aaa', // Lighter gray
        textAlign: 'right',
        marginTop: 4,
    },
});

export default FarmerProfileScreen;
