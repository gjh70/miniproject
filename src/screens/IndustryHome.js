import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  Modal,
  Button,
  Platform,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import firestore from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NAV_TABS = [
  { name: 'Home', icon: 'home', screen: 'IndustryHome' },
  { name: 'Transaction', icon: 'account-balance-wallet', screen: 'IndustryTrans' },
  { name: 'Profile', icon: 'person-outline', screen: 'IndustryProfile' },
  { name: 'Help', icon: 'help-outline', screen: 'IndustryHelp' },
];

const IndustryHome = ({ navigation }) => {
  const [allLoanApplicants, setAllLoanApplicants] = useState([]);
  const [displayApplicants, setDisplayApplicants] = useState([]);
  const [shortlistedIdsSet, setShortlistedIdsSet] = useState(new Set());
  const [userName, setUserName] = useState('');
  const [isLoadingApplicants, setIsLoadingApplicants] = useState(true);
  const [isLoadingShortlist, setIsLoadingShortlist] = useState(true);
  const [isInitialUserLoad, setIsInitialUserLoad] = useState(true);
  const [filterInputs, setFilterInputs] = useState({ crop: '', maxAmount: '', minYield: '' });
  const [activeFilters, setActiveFilters] = useState({ crop: '', maxAmount: null, minYield: null });
  const [isFilterModalVisible, setFilterModalVisible] = useState(false);

  // Fetch logged-in user
  useEffect(() => {
    const fetchUserName = async () => {
      setIsInitialUserLoad(true);
      try {
        const storedUserId = await AsyncStorage.getItem('loggedInUserId');
        if (storedUserId) {
          setUserName(storedUserId);
          console.log("IndustryHome: User ID/Name found:", storedUserId);
        } else {
          console.log("IndustryHome: No user ID found in storage.");
          Alert.alert("Login Error", "User session not found. Please log in again.");
          navigation.replace('IndustryLogin');
        }
      } catch (e) {
        console.error('IndustryHome: Failed to fetch user ID:', e);
        Alert.alert("Error", "Failed to retrieve user session.");
        navigation.replace('IndustryLogin');
      } finally {
        setIsInitialUserLoad(false);
      }
    };
    fetchUserName();
  }, [navigation]);

  // Fetch applicants with 'Pending' status and approved: false
  useEffect(() => {
    console.log("Setting up listener for 'pending' and unapproved loan applicants...");
    setIsLoadingApplicants(true);
    const unsubscribe = firestore()
      .collection('loanApplicants')
      .where('status', '==', 'Pending')
      .where('approved', '==', false) // Added filter for approved: false
      .onSnapshot(snapshot => {
        if (snapshot) {
          const applicants = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          console.log(`Fetched ${applicants.length} 'pending' and unapproved applicants.`);
          if (applicants.length > 0 && !applicants[0]?.farmerId) {
            console.warn("Warning: Sample applicant is missing 'farmerId'.");
          }
          setAllLoanApplicants(applicants);
        } else {
          console.log("Pending and unapproved applicants snapshot is null or undefined.");
          setAllLoanApplicants([]);
        }
        setIsLoadingApplicants(false);
      }, error => {
        console.error("Error fetching applicants: ", error);
        Alert.alert("Error", "Could not fetch applicants list.");
        setAllLoanApplicants([]);
        setIsLoadingApplicants(false);
      });

    return () => {
      console.log("Unsubscribing from applicants listener.");
      unsubscribe();
    };
  }, []);

  // Fetch shortlisted IDs for this industry
  useEffect(() => {
    if (!userName) {
      console.log("Username not set, skipping shortlist fetch.");
      setIsLoadingShortlist(false);
      return;
    }
    console.log(`Setting up shortlist listener for industry: ${userName}`);
    setIsLoadingShortlist(true);

    const shortlistRef = firestore()
      .collection('Industries')
      .doc(userName)
      .collection('ShortlistedApplicants');

    const unsubscribeShortlist = shortlistRef.onSnapshot(snapshot => {
      if (snapshot) {
        const ids = new Set(snapshot.docs.map(doc => doc.id));
        console.log(`Fetched ${ids.size} shortlisted IDs for ${userName}.`);
        setShortlistedIdsSet(ids);
      } else {
        console.log("Shortlist snapshot is null or undefined for", userName);
        setShortlistedIdsSet(new Set());
      }
      setIsLoadingShortlist(false);
    }, error => {
      console.error(`Error fetching shortlist for ${userName}: `, error);
      Alert.alert("Error", "Could not fetch your shortlisted applicants.");
      setShortlistedIdsSet(new Set());
      setIsLoadingShortlist(false);
    });

    return () => {
      console.log(`Unsubscribing from shortlist listener for ${userName}.`);
      unsubscribeShortlist();
    };
  }, [userName]);

  // Filter and exclude applicants for display
  useEffect(() => {
    console.log("Applying filters and exclusion...");
    let filteredData = [...allLoanApplicants];
    const { crop, maxAmount, minYield } = activeFilters;

    // Apply filters
    if (crop) {
      const lowerCaseCrop = crop.toLowerCase();
      filteredData = filteredData.filter(app =>
        app.cropCultivated?.toLowerCase().includes(lowerCaseCrop)
      );
    }
    if (maxAmount !== null) {
      filteredData = filteredData.filter(app => {
        const loanAmt = parseFloat(app.loanAmount);
        return !isNaN(loanAmt) && loanAmt <= maxAmount;
      });
    }
    if (minYield !== null) {
      filteredData = filteredData.filter(app => {
        const yieldAmt = parseFloat(app.estimatedProduce);
        return !isNaN(yieldAmt) && yieldAmt >= minYield;
      });
    }

    // Exclude already shortlisted applicants
    if (shortlistedIdsSet.size > 0) {
      const countBeforeExclusion = filteredData.length;
      filteredData = filteredData.filter(app => !shortlistedIdsSet.has(app.id));
      console.log(`Excluded ${countBeforeExclusion - filteredData.length} already shortlisted applicants.`);
    }

    setDisplayApplicants(filteredData);
    console.log("Filtering complete. Displaying:", filteredData.length, "applicants");
  }, [allLoanApplicants, shortlistedIdsSet, activeFilters]);

  // Filter modal actions
  const openFilterModal = () => {
    setFilterInputs({
      crop: activeFilters.crop,
      maxAmount: activeFilters.maxAmount !== null ? String(activeFilters.maxAmount) : '',
      minYield: activeFilters.minYield !== null ? String(activeFilters.minYield) : ''
    });
    setFilterModalVisible(true);
  };

  const handleApplyFilters = () => {
    const maxAmountValue = parseFloat(filterInputs.maxAmount);
    const minYieldValue = parseFloat(filterInputs.minYield);
    setActiveFilters({
      crop: filterInputs.crop.trim(),
      maxAmount: !isNaN(maxAmountValue) ? maxAmountValue : null,
      minYield: !isNaN(minYieldValue) ? minYieldValue : null,
    });
    setFilterModalVisible(false);
  };

  const handleClearFilters = () => {
    setActiveFilters({ crop: '', maxAmount: null, minYield: null });
    setFilterInputs({ crop: '', maxAmount: '', minYield: '' });
    setFilterModalVisible(false);
  };

  // Shortlist action
  const shortlistApplicant = async (applicant) => {
    if (!userName) {
      Alert.alert('Error', 'Cannot shortlist. User session is invalid.');
      return;
    }
    if (!applicant?.id || !applicant?.farmerId) {
      Alert.alert('Error', 'Cannot shortlist. Invalid applicant data.');
      return;
    }
    if (shortlistedIdsSet.has(applicant.id)) {
      Alert.alert('Info', 'You have already shortlisted this applicant.');
      return;
    }

    console.log(`Shortlisting applicant ${applicant.id} for industry ${userName}...`);
    try {
      await firestore()
        .collection('Industries')
        .doc(userName)
        .collection('ShortlistedApplicants')
        .doc(applicant.id)
        .set({
          farmerId: applicant.farmerId,
          farmerName: applicant.farmerName || 'N/A',
          cropCultivated: applicant.cropCultivated || 'N/A',
          loanAmount: applicant.loanAmount || 0,
          estimatedProduce: applicant.estimatedProduce || 0,
          contractYears: applicant.contractYears || 'N/A',
          originalApplicantId: applicant.id,
          shortlistedBy: userName,
          shortlistedTimestamp: firestore.FieldValue.serverTimestamp(),
          status: 'shortlisted',
        });

      console.log(`Applicant ${applicant.id} successfully shortlisted.`);
    } catch (error) {
      console.error(`Error shortlisting applicant ${applicant.id}:`, error);
      Alert.alert('Error', `Could not shortlist applicant ${applicant.farmerName || ''}.`);
    }
  };

  // Logout action
  const handleLogout = async () => {
    console.log("Logging out industry user...");
    try {
      await AsyncStorage.removeItem('loggedInUserId');
      setUserName('');
      setShortlistedIdsSet(new Set());
      setAllLoanApplicants([]);
      setDisplayApplicants([]);
      setActiveFilters({ crop: '', maxAmount: null, minYield: null });
      navigation.replace('IndustryLogin');
    } catch (error) {
      console.error('Error logging out:', error);
      Alert.alert('Error', 'Logout failed. Please try again.');
    }
  };

  // Render applicant card
  const renderApplicantCard = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.farmerName}>Farmer: {item.farmerName || 'N/A'}</Text>
      <Text style={styles.detailText}>Crop: {item.cropCultivated || 'N/A'}</Text>
      <Text style={styles.detailText}>Loan: {item.loanAmount != null ? `₹${item.loanAmount}` : 'N/A'}</Text>
      <Text style={styles.detailText}>Yield Est: {item.estimatedProduce != null ? `${item.estimatedProduce} units` : 'N/A'}</Text>
      <Text style={styles.detailText}>Contract Years: {item.contractYears || 'N/A'}</Text>
      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => shortlistApplicant(item)}
        disabled={!item.farmerId}
      >
        <Text style={styles.actionButtonText}>
          {item.farmerId ? 'Shortlist' : 'Cannot Shortlist (Missing ID)'}
        </Text>
      </TouchableOpacity>
      {!item.farmerId && (
        <Text style={styles.warningText}>Missing Farmer ID - Cannot be shortlisted.</Text>
      )}
    </View>
  );

  const filtersAreActive = activeFilters.crop || activeFilters.maxAmount !== null || activeFilters.minYield !== null;
  const getCurrentRouteName = () => navigation?.getState()?.routes[navigation?.getState()?.index]?.name || null;
  const currentRoute = getCurrentRouteName();
  const isLoading = isInitialUserLoad || isLoadingApplicants || isLoadingShortlist;

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="green" />
        <Text style={styles.loadingText}>Loading Data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ width: 32 }} />
        <Text style={styles.title}>Available Applicants</Text>
        <TouchableOpacity onPress={openFilterModal} style={styles.iconButton}>
          <Icon name="filter-list" size={26} color={filtersAreActive ? 'green' : 'black'} />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleLogout} style={styles.iconButton}>
          <Icon name="logout" size={24} color="black" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={displayApplicants}
        keyExtractor={(item) => item.id}
        renderItem={renderApplicantCard}
        ListEmptyComponent={
          <View style={styles.emptyListContainer}>
            <Text style={styles.emptyListText}>
              {isLoadingApplicants || isLoadingShortlist
                ? 'Loading applicants...'
                : filtersAreActive
                ? "No pending unapproved applicants match the current filters."
                : "No pending unapproved applicants available to show."}
            </Text>
            {filtersAreActive && displayApplicants.length === 0 && !(isLoadingApplicants || isLoadingShortlist) && (
              <Button title="Clear Filters" onPress={handleClearFilters} color="gray" />
            )}
          </View>
        }
        contentContainerStyle={displayApplicants.length === 0 ? styles.emptyListContentContainer : { paddingBottom: 80 }}
      />

      <Modal
        animationType="slide"
        transparent={true}
        visible={isFilterModalVisible}
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <TouchableOpacity style={styles.closeButton} onPress={() => setFilterModalVisible(false)}>
              <Icon name="close" size={28} color="#555" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Filter Applicants</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Crop Name (e.g., Wheat)"
              value={filterInputs.crop}
              onChangeText={(text) => setFilterInputs(prev => ({ ...prev, crop: text }))}
              placeholderTextColor="#888"
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Maximum Loan Amount (e.g., 50000)"
              value={filterInputs.maxAmount}
              onChangeText={(text) => setFilterInputs(prev => ({ ...prev, maxAmount: text.replace(/[^0-9]/g, '') }))}
              keyboardType="numeric"
              placeholderTextColor="#888"
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Minimum Estimated Yield (e.g., 10)"
              value={filterInputs.minYield}
              onChangeText={(text) => setFilterInputs(prev => ({ ...prev, minYield: text.replace(/[^0-9.]/g, '') }))}
              keyboardType="numeric"
              placeholderTextColor="#888"
            />
            <View style={styles.modalButtonContainer}>
              <Button title="Clear Filters" onPress={handleClearFilters} color="gray" />
              <Button title="Apply Filters" onPress={handleApplyFilters} />
            </View>
          </View>
        </View>
      </Modal>

      <View style={styles.bottomNav}>
        {NAV_TABS.map((tab) => (
          <TouchableOpacity
            key={tab.name}
            style={styles.navItem}
            onPress={() => {
              if (currentRoute !== tab.screen) {
                navigation.navigate(tab.screen);
              }
            }}
          >
            <Icon name={tab.icon} size={28} color={currentRoute === tab.screen ? 'green' : 'gray'} />
            <Text style={[styles.navText, currentRoute === tab.screen && styles.activeNavText]}>
              {tab.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: 'gray',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 12 : 12,
  },
  title: {
    fontSize: 19,
    fontWeight: '600',
    textAlign: 'center',
    color: '#333',
  },
  iconButton: {
    padding: 8,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  farmerName: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 8,
    color: '#212529',
  },
  detailText: {
    fontSize: 14,
    color: '#495057',
    marginBottom: 4,
    lineHeight: 20,
  },
  actionButton: {
    marginTop: 15,
    backgroundColor: '#28a745',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  actionButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 15,
  },
  warningText: {
    fontSize: 12,
    color: '#dc3545',
    marginTop: 8,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 20 : 10,
    borderTopWidth: 1,
    borderColor: '#E0E0E0',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  navItem: {
    alignItems: 'center',
    flex: 1,
    paddingVertical: 4,
  },
  navText: {
    fontSize: 11,
    color: 'gray',
    marginTop: 3,
  },
  activeNavText: {
    color: 'green',
    fontWeight: '600',
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: 50,
  },
  emptyListContentContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyListText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#6c757d',
    marginBottom: 15,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    paddingTop: 45,
    paddingBottom: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 10,
    position: 'relative',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 25,
    color: '#333',
    textAlign: 'center',
  },
  modalInput: {
    width: '100%',
    height: 50,
    borderColor: '#ced4da',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
    color: '#212529',
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    marginTop: 20,
    width: '100%',
  },
  closeButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    padding: 8,
    zIndex: 1,
  },
});

export default IndustryHome;