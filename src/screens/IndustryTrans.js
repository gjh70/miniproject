import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  StatusBar,
  Alert,
  Modal,
  ScrollView,
  TextInput, // Ensure TextInput is imported
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import firestore from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Navigation Tabs Definition
const NAV_TABS = [
  { name: 'Home', icon: 'home', screen: 'IndustryHome' },
  { name: 'Transaction', icon: 'account-balance-wallet', screen: 'IndustryTrans' },
  { name: 'Profile', icon: 'person-outline', screen: 'IndustryProfile' },
  { name: 'Help', icon: 'help-outline', screen: 'IndustryHelp' },
];

const IndustryTrans = () => {
  const navigation = useNavigation();
  const isFocused = useIsFocused();

  // State for UI and Data
  const [activeViewTab, setActiveViewTab] = useState('Shortlisted');
  const [shortlistedApplicants, setShortlistedApplicants] = useState([]);
  const [currentContracts, setCurrentContracts] = useState([]);
  const [contractHistory, setContractHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [industryId, setIndustryId] = useState(null);
  const [industryName, setIndustryName] = useState('');

  // State for Farmer Details Modal
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [selectedFarmer, setSelectedFarmer] = useState(null);
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);
  const [farmerDetails, setFarmerDetails] = useState({
    creditScore: null,
    feedback: null,
    name: null,
    contact: null,
    email: null,
    location: null,
    rawMaterials: null,
  });
  const [modalActiveTab, setModalActiveTab] = useState('Details');
  const [isApproving, setIsApproving] = useState(false);

  // --- State for Feedback Modal ---
  const [isFeedbackModalVisible, setIsFeedbackModalVisible] = useState(false);
  const [selectedContractForFeedback, setSelectedContractForFeedback] = useState(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackRating, setFeedbackRating] = useState(''); // Store rating as string initially
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  // --- End Feedback Modal State ---

  // Fetch All Data (Shortlist, Contracts, History, Industry Name)
  const fetchAllData = useCallback(
    async (isRefresh = false) => {
      if (!isFocused && !isRefresh) return;
      console.log(`IndustryTrans: Starting fetch... (isFocused: ${isFocused}, isRefresh: ${isRefresh})`);
      if (isRefresh) setIsRefreshing(true);
      else if (!industryId) setIsLoading(true);
      setError(null);

      let currentIndustryId = industryId;
      try {
        if (!currentIndustryId) {
          currentIndustryId = await AsyncStorage.getItem('loggedInUserId');
          if (!currentIndustryId)
            throw new Error('Industry ID not found. Please log in again.');
          setIndustryId(currentIndustryId);
        }
        const industryDocRef = firestore().collection('Industries').doc(currentIndustryId);
        const industryDoc = await industryDocRef.get();
        if (industryDoc.exists) {
          setIndustryName(industryDoc.data()?.name || 'Unknown Industry');
        } else {
          setIndustryName('Unknown Industry');
        }

        const [shortlistSnapshot, approvedSnapshot] = await Promise.all([
          industryDocRef
            .collection('ShortlistedApplicants')
            .orderBy('shortlistedTimestamp', 'desc')
            .get(),
          industryDocRef
            .collection('ApprovedApplicants')
            .orderBy('approvalTimestamp', 'desc')
            .get(),
        ]);

        const shortlist = shortlistSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setShortlistedApplicants(shortlist);

        const approvedList = approvedSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        const current = [];
        const history = [];
        approvedList.forEach((item) => {
          const status = String(item.contractStatus || 'active').toLowerCase();
          if (['completed', 'expired', 'terminated'].includes(status)) {
            history.push(item);
          } else {
            current.push(item);
          }
        });
        setCurrentContracts(current);
        setContractHistory(history);
        console.log(`Fetched ${shortlist.length} SL, ${current.length} CC, ${history.length} CH.`);
      } catch (err) {
        console.error('Error fetching transaction data:', err);
        if (err.message.includes('Industry ID not found')) {
          setError(err.message);
          Alert.alert('Session Expired', 'Please log in again.');
          setTimeout(() => navigation.replace('IndustryLogin'), 0);
        } else {
          setError(`Failed to load data. Check connection.`);
        }
      } finally {
        if (isRefresh) setIsRefreshing(false);
        setIsLoading(false);
      }
    },
    [isFocused, industryId, navigation]
  );

  // Effect to Fetch Data on Focus
  useEffect(() => {
    if (isFocused) {
      if (!industryId && !error) setIsLoading(true);
      fetchAllData(false);
    }
  }, [isFocused, fetchAllData, industryId, error]);

  // UI Handlers
  const handleViewTabPress = (tabName) => setActiveViewTab(tabName);
  const handleRefresh = () => fetchAllData(true);

  // Farmer Details Modal Handlers
  const handleSelectFarmer = useCallback(
    async (applicantData) => {
      if (!applicantData?.farmerId) {
        Alert.alert('Data Error', 'Farmer ID missing.');
        return;
      }
      const farmerId = applicantData.farmerId;
      setSelectedFarmer(applicantData);
      setFarmerDetails({
        creditScore: null,
        feedback: null,
        name: null,
        contact: null,
        email: null,
        location: null,
        rawMaterials: null,
      });
      setModalActiveTab('Details');
      setIsFetchingDetails(true);
      setIsDetailModalVisible(true);
      try {
        const farmerRef = firestore().collection('Farmers').doc(farmerId);
        const [creditScoreSnapshot, feedbackSnapshot, farmerDocSnapshot] = await Promise.all([
          farmerRef.collection('creditScore').limit(1).get(),
          farmerRef.collection('feedback').limit(1).get(),
          farmerRef.get(),
        ]);
        let fetchedName = null,
          fetchedContact = null,
          fetchedEmail = null,
          fetchedLocation = null,
          fetchedRawMaterials = null;
        if (farmerDocSnapshot.exists) {
          const d = farmerDocSnapshot.data();
          fetchedName = d.name;
          fetchedContact = d.contact;
          fetchedEmail = d.email;
          fetchedLocation = d.location;
          fetchedRawMaterials = d.rawMaterials;
        } else {
          fetchedName = applicantData.farmerName;
        }
        let score = 'N/A';
        if (!creditScoreSnapshot.empty) score = creditScoreSnapshot.docs[0].data()?.scoreValue ?? 'N/A';
        let fb = 'No feedback found.';
        if (!feedbackSnapshot.empty) fb = feedbackSnapshot.docs[0].data()?.feedbackText ?? 'N/A';
        setFarmerDetails({
          creditScore: score,
          feedback: fb,
          name: fetchedName || 'N/A',
          contact: fetchedContact || 'N/A',
          email: fetchedEmail || 'N/A',
          location: fetchedLocation || 'N/A',
          rawMaterials: fetchedRawMaterials || [],
        });
      } catch (error) {
        console.error('Error fetching farmer details:', error);
        Alert.alert('Fetch Error', 'Could not fetch full farmer details.');
        setFarmerDetails({
          creditScore: 'Error',
          feedback: 'Error',
          name: applicantData.farmerName || 'Error',
          contact: 'Error',
          email: 'Error',
          location: 'Error',
          rawMaterials: [],
        });
      } finally {
        setIsFetchingDetails(false);
      }
    },
    []
  );
  const handleCloseModal = useCallback(() => {
    setIsDetailModalVisible(false);
    setSelectedFarmer(null);
    setFarmerDetails({
      creditScore: null,
      feedback: null,
      name: null,
      contact: null,
      email: null,
      location: null,
      rawMaterials: null,
    });
    setModalActiveTab('Details');
    setIsApproving(false);
  }, []);
  const handleApproveApplicant = async () => {
    if (!selectedFarmer || !industryId || !selectedFarmer.id || !selectedFarmer.farmerId) {
      Alert.alert('Error', 'Cannot approve. Data missing.');
      console.error('Approval Error: Missing data', { selectedFarmer, industryId });
      return;
    }
    const applicantId = selectedFarmer.id;
    const farmerIdToApprove = selectedFarmer.farmerId;
    setIsApproving(true);
    try {
      const batch = firestore().batch();
      const shortlistRef = firestore()
        .collection('Industries')
        .doc(industryId)
        .collection('ShortlistedApplicants')
        .doc(applicantId);
      const approvedRef = firestore()
        .collection('Industries')
        .doc(industryId)
        .collection('ApprovedApplicants')
        .doc(applicantId);
      const loanApplicantRef = firestore().collection('loanApplicants').doc(applicantId);
      const farmerLoanRef = firestore()
        .collection('Farmers')
        .doc(farmerIdToApprove)
        .collection('Loans')
        .doc(applicantId);
      const dataToApprove = {
        farmerId: farmerIdToApprove,
        farmerName: selectedFarmer.farmerName || farmerDetails.name || 'N/A',
        cropCultivated: selectedFarmer.cropCultivated || 'N/A',
        loanAmount: selectedFarmer.loanAmount || 0,
        estimatedProduce: selectedFarmer.estimatedProduce || 0,
        contractYears: selectedFarmer.contractYears || 'N/A',
        farmerContact: farmerDetails.contact || selectedFarmer.farmerContact || 'N/A',
        farmerLocation: farmerDetails.location || selectedFarmer.farmerLocation || 'N/A',
        contractStatus: 'active',
        approvedBy: industryId,
        approvalTimestamp: firestore.FieldValue.serverTimestamp(),
      };
      batch.delete(shortlistRef);
      batch.set(approvedRef, dataToApprove);
      batch.update(loanApplicantRef, {
        approved: true,
        status: 'Approved',
        approvedBy: industryId,
        approvedAt: firestore.FieldValue.serverTimestamp(),
      });
      batch.update(farmerLoanRef, {
        status: 'Approved',
        approvedBy: industryId,
        approvedByName: industryName || 'Unknown Industry',
        approvedAt: firestore.FieldValue.serverTimestamp(),
      });
      await batch.commit();
      Alert.alert('Success', `${dataToApprove.farmerName} has been approved.`);
      handleCloseModal();
      fetchAllData(true);
    } catch (error) {
      console.error('Error approving applicant:', error);
      Alert.alert('Approval Failed', `Failed. ${error.message}`);
    } finally {
      setIsApproving(false);
    }
  };

  // --- Feedback Modal Handlers ---
  const handleCompletePress = useCallback((contractItem) => {
    if (!contractItem || !contractItem.farmerId) {
      Alert.alert('Error', 'Farmer details missing.');
      return;
    }
    console.log(`Opening feedback modal for contract: ${contractItem.id}, Farmer: ${contractItem.farmerId}`);
    setSelectedContractForFeedback(contractItem);
    setFeedbackText('');
    setFeedbackRating(''); // Reset rating
    setIsFeedbackModalVisible(true);
  }, []);

  const handleCloseFeedbackModal = useCallback(() => {
    setIsFeedbackModalVisible(false);
    setSelectedContractForFeedback(null);
    setFeedbackText('');
    setFeedbackRating(''); // Reset rating
    setIsSubmittingFeedback(false);
  }, []);

  const handleSubmitContractFeedback = async () => {
    // --- Validation ---
    const ratingValue = parseInt(feedbackRating, 10);
    if (!feedbackText.trim()) {
      Alert.alert('Input Required', 'Please enter feedback comments.');
      return;
    }
    if (!feedbackRating.trim()) {
      Alert.alert('Input Required', 'Please enter a credit rating (1-5).');
      return;
    }
    if (isNaN(ratingValue) || ratingValue < 1 || ratingValue > 5) {
      Alert.alert('Invalid Rating', 'Please enter a valid rating between 1 and 5.');
      return;
    }
    if (!selectedContractForFeedback || !industryId || !selectedContractForFeedback.farmerId) {
      Alert.alert('Error', 'Cannot submit. Data missing.');
      console.error('Feedback Submit Error: Missing data', { selectedContractForFeedback, industryId });
      return;
    }
    // --- End Validation ---

    const contractId = selectedContractForFeedback.id;
    const farmerIdForFeedback = selectedContractForFeedback.farmerId;
    setIsSubmittingFeedback(true);
    try {
      console.log(`Submitting feedback & rating (${ratingValue}) for Farmer ${farmerIdForFeedback}, Contract ${contractId}`);
      const batch = firestore().batch();
      const industryContractRef = firestore()
        .collection('Industries')
        .doc(industryId)
        .collection('ApprovedApplicants')
        .doc(contractId);
      batch.update(industryContractRef, {
        contractStatus: 'completed',
        completionTimestamp: firestore.FieldValue.serverTimestamp(),
      });
      const farmerFeedbackRef = firestore()
        .collection('Farmers')
        .doc(farmerIdForFeedback)
        .collection('feedback')
        .doc();
      batch.set(farmerFeedbackRef, {
        industryId: industryId,
        industryName: industryName || 'Unknown Industry',
        contractId: contractId,
        loanAmount: selectedContractForFeedback.loanAmount || 0,
        cropCultivated: selectedContractForFeedback.cropCultivated || 'N/A',
        feedbackText: feedbackText.trim(),
        creditScore: ratingValue, // Store numeric rating
        timestamp: firestore.FieldValue.serverTimestamp(),
      });
      const farmerLoanRef = firestore()
        .collection('Farmers')
        .doc(farmerIdForFeedback)
        .collection('Loans')
        .doc(contractId);
      batch.update(farmerLoanRef, { status: 'Completed' });
      await batch.commit();
      console.log(`Feedback submitted & contract ${contractId} completed.`);
      Alert.alert(
        'Success',
        `Feedback & Rating submitted and contract completed for ${selectedContractForFeedback.farmerName || 'Farmer'}.`
      );
      handleCloseFeedbackModal();
      fetchAllData(true);
    } catch (error) {
      console.error('Error submitting feedback/completing:', error);
      Alert.alert('Submission Failed', `Failed. ${error.message}`);
    } finally {
      setIsSubmittingFeedback(false);
    }
  };
  // --- End Feedback Handlers ---

  // --- Render List Item Function ---
  const renderListItem = useCallback(
    ({ item }) => {
      const isShortlistedTab = activeViewTab === 'Shortlisted';
      const isContractsTab = activeViewTab === 'Contracts';
      const isHistoryTab = activeViewTab === 'History';
      const isPressable = isShortlistedTab && item.farmerId;
      const PressableComponent = isPressable ? TouchableOpacity : View;
      const pressableProps = isPressable
        ? { onPress: () => handleSelectFarmer(item), activeOpacity: 0.7, disabled: isRefreshing || isLoading }
        : {};
      const formatTimestamp = (ts) => (ts?.toDate ? ts.toDate().toLocaleDateString() : null);
      const shortlistedDate = formatTimestamp(item.shortlistedTimestamp);
      const approvalDate = formatTimestamp(item.approvalTimestamp);
      const completionDate = formatTimestamp(item.completionTimestamp);

      return (
        <PressableComponent style={styles.cardContainer} {...pressableProps}>
          <View style={styles.card}>
            <Text style={styles.itemName}>Farmer: {item.farmerName || 'N/A'}</Text>
            <Text style={styles.itemDetail}>Crop: {item.cropCultivated || 'N/A'}</Text>
            <Text style={styles.itemDetail}>
              Loan Amount: {item.loanAmount ? `₹${item.loanAmount.toLocaleString()}` : 'N/A'}
            </Text>
            {item.estimatedProduce != null && (
              <Text style={styles.itemDetail}>Est. Produce: {item.estimatedProduce} units</Text>
            )}
            {item.contractYears && <Text style={styles.itemDetail}>Contract: {item.contractYears} Years</Text>}
            {!isShortlistedTab && item.contractStatus && (
              <Text style={[styles.itemDetail, styles.statusText]}>
                Status: <Text style={styles.statusValue}>{item.contractStatus}</Text>
              </Text>
            )}
            {isShortlistedTab && shortlistedDate && (
              <Text style={styles.timestamp}>Shortlisted: {shortlistedDate}</Text>
            )}
            {!isShortlistedTab && approvalDate && (
              <Text style={styles.timestamp}>Approved: {approvalDate}</Text>
            )}
            {isHistoryTab && completionDate && (
              <Text style={styles.timestamp}>Completed: {completionDate}</Text>
            )}
            {isShortlistedTab && (
              <View style={styles.tapIndicator}>
                {!item.farmerId && <Icon name="warning" size={14} color="#FFA500" style={{ marginRight: 5 }} />}
                <Text
                  style={[
                    styles.tapIndicatorText,
                    !item.farmerId && styles.disabledTapIndicator,
                  ]}
                >
                  {item.farmerId ? 'Tap for details' : 'Details Unavailable'}
                </Text>
                {item.farmerId && <Icon name="touch-app" size={16} color="green" />}
              </View>
            )}
            {isContractsTab && (
              <TouchableOpacity
                style={[
                  styles.completeButton,
                  (isRefreshing || isLoading || isSubmittingFeedback) && styles.disabledButton,
                ]}
                onPress={() => handleCompletePress(item)}
                disabled={isRefreshing || isLoading || isSubmittingFeedback}
              >
                <Text style={styles.completeButtonText}>Mark Completed & Feedback</Text>
              </TouchableOpacity>
            )}
          </View>
        </PressableComponent>
      );
    },
    [activeViewTab, isRefreshing, isLoading, isSubmittingFeedback, handleSelectFarmer, handleCompletePress]
  );

  // Helper to get current route name
  const getCurrentRouteName = () =>
    navigation?.getState()?.routes[navigation?.getState()?.index]?.name || null;
  const currentRoute = getCurrentRouteName();

  // --- Loading State ---
  if (isLoading && !isRefreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="green" />
        <Text style={styles.loadingText}>Loading Transactions...</Text>
      </View>
    );
  }

  // --- Initial Error State ---
  if (error && !isRefreshing && shortlistedApplicants.length === 0 && currentContracts.length === 0 && contractHistory.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color="black" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Transactions</Text>
          <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
            <Icon name="refresh" size={24} color="#333" />
          </TouchableOpacity>
        </View>
        <View style={styles.centered}>
          <Icon name="error-outline" size={40} color="#D83933" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={handleRefresh} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.bottomNav}>
          {NAV_TABS.map((tab) => {
            const isTabActive = currentRoute === tab.screen;
            return (
              <TouchableOpacity
                key={tab.name}
                style={styles.navItem}
                onPress={() => currentRoute !== tab.screen && navigation.navigate(tab.screen)}
              >
                <Icon name={tab.icon} size={28} color={isTabActive ? 'green' : 'gray'} />
                <Text style={[styles.navText, isTabActive && styles.activeNavText]}>{tab.name}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  }

  // --- Main Render ---
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} disabled={isRefreshing}>
          <Icon name="arrow-back" size={24} color={isRefreshing ? '#aaa' : 'black'} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transactions & Contracts</Text>
        <TouchableOpacity onPress={handleRefresh} disabled={isRefreshing} style={styles.refreshButton}>
          {isRefreshing ? <ActivityIndicator size="small" color="green" /> : <Icon name="refresh" size={24} color="#333" />}
        </TouchableOpacity>
      </View>

      {/* Top Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity onPress={() => handleViewTabPress('Shortlisted')} disabled={isRefreshing}>
          <Text style={[styles.tab, activeViewTab === 'Shortlisted' && styles.activeTab, isRefreshing && styles.disabledText]}>
            Shortlisted
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleViewTabPress('Contracts')} disabled={isRefreshing}>
          <Text style={[styles.tab, activeViewTab === 'Contracts' && styles.activeTab, isRefreshing && styles.disabledText]}>
            Contracts
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleViewTabPress('History')} disabled={isRefreshing}>
          <Text style={[styles.tab, activeViewTab === 'History' && styles.activeTab, isRefreshing && styles.disabledText]}>
            History
          </Text>
        </TouchableOpacity>
      </View>

      {/* Refresh Error Banner */}
      {error && isRefreshing && (
        <View style={styles.refreshErrorBanner}>
          <Text style={styles.refreshErrorText}>Refresh failed: {error}</Text>
        </View>
      )}

      {/* Content Area with FlatLists */}
      <View style={styles.contentArea}>
        {activeViewTab === 'Shortlisted' && (
          <FlatList
            style={styles.listStyle}
            data={shortlistedApplicants}
            renderItem={renderListItem}
            keyExtractor={(item) => item.id + '-sl'}
            ListEmptyComponent={
              <View style={styles.emptyComponentContainer}>
                <Text style={styles.emptyListText}>No shortlisted applicants.</Text>
              </View>
            }
            contentContainerStyle={styles.listContentContainer}
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
          />
        )}
        {activeViewTab === 'Contracts' && (
          <FlatList
            style={styles.listStyle}
            data={currentContracts}
            renderItem={renderListItem}
            keyExtractor={(item) => item.id + '-co'}
            ListEmptyComponent={
              <View style={styles.emptyComponentContainer}>
                <Text style={styles.emptyListText}>No active contracts.</Text>
              </View>
            }
            contentContainerStyle={styles.listContentContainer}
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
          />
        )}
        {activeViewTab === 'History' && (
          <FlatList
            style={styles.listStyle}
            data={contractHistory}
            renderItem={renderListItem}
            keyExtractor={(item) => item.id + '-hi'}
            ListEmptyComponent={
              <View style={styles.emptyComponentContainer}>
                <Text style={styles.emptyListText}>No contract history.</Text>
              </View>
            }
            contentContainerStyle={styles.listContentContainer}
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
          />
        )}
      </View>

      {/* Farmer Details Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isDetailModalVisible}
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedFarmer ? (
              <>
                <Text style={styles.modalTitle}>Farmer Profile</Text>
                <View style={styles.modalTabBar}>
                  <TouchableOpacity
                    style={[styles.modalTabButton, modalActiveTab === 'Details' && styles.modalActiveTabButton]}
                    onPress={() => setModalActiveTab('Details')}
                    disabled={isFetchingDetails || isApproving}
                  >
                    <Text
                      style={[styles.modalTabText, modalActiveTab === 'Details' && styles.modalActiveTabText]}
                    >
                      Details
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalTabButton, modalActiveTab === 'CreditScore' && styles.modalActiveTabButton]}
                    onPress={() => setModalActiveTab('CreditScore')}
                    disabled={isFetchingDetails || isApproving}
                  >
                    <Text
                      style={[styles.modalTabText, modalActiveTab === 'CreditScore' && styles.modalActiveTabText]}
                    >
                      Credit Score
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalTabButton, modalActiveTab === 'Feedback' && styles.modalActiveTabButton]}
                    onPress={() => setModalActiveTab('Feedback')}
                    disabled={isFetchingDetails || isApproving}
                  >
                    <Text
                      style={[styles.modalTabText, modalActiveTab === 'Feedback' && styles.modalActiveTabText]}
                    >
                      Feedback
                    </Text>
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.modalScrollView}>
                  {modalActiveTab === 'Details' && (
                    <View>
                      <Text style={styles.modalDetailLabel}>Name:</Text>
                      {isFetchingDetails ? (
                        <ActivityIndicator size="small" color="green" style={styles.detailLoader} />
                      ) : (
                        <Text style={styles.modalDetailValue}>{farmerDetails.name ?? '...'}</Text>
                      )}
                      <Text style={styles.modalDetailLabel}>Contact:</Text>
                      {isFetchingDetails ? (
                        <ActivityIndicator size="small" color="green" style={styles.detailLoader} />
                      ) : (
                        <Text style={styles.modalDetailValue}>{farmerDetails.contact ?? '...'}</Text>
                      )}
                      <Text style={styles.modalDetailLabel}>Email:</Text>
                      {isFetchingDetails ? (
                        <ActivityIndicator size="small" color="green" style={styles.detailLoader} />
                      ) : (
                        <Text style={styles.modalDetailValue}>{farmerDetails.email ?? '...'}</Text>
                      )}
                      <Text style={styles.modalDetailLabel}>Location:</Text>
                      {isFetchingDetails ? (
                        <ActivityIndicator size="small" color="green" style={styles.detailLoader} />
                      ) : (
                        <Text style={styles.modalDetailValue}>{farmerDetails.location ?? '...'}</Text>
                      )}
                      <Text style={styles.modalDetailLabel}>Crops:</Text>
                      {isFetchingDetails ? (
                        <ActivityIndicator size="small" color="green" style={styles.detailLoader} />
                      ) : (
                        <Text style={styles.modalDetailValue}>
                          {farmerDetails.rawMaterials?.join(', ') || 'N/A'}
                        </Text>
                      )}
                      <Text style={styles.modalSectionTitle}>Loan Req.</Text>
                      <Text style={styles.modalDetailLabel}>Crop:</Text>
                      <Text style={styles.modalDetailValue}>{selectedFarmer.cropCultivated || 'N/A'}</Text>
                      <Text style={styles.modalDetailLabel}>Amount:</Text>
                      <Text style={styles.modalDetailValue}>
                        {selectedFarmer.loanAmount ? `₹${selectedFarmer.loanAmount.toLocaleString()}` : 'N/A'}
                      </Text>
                      <Text style={styles.modalDetailLabel}>Est. Produce:</Text>
                      <Text style={styles.modalDetailValue}>
                        {selectedFarmer.estimatedProduce ? `${selectedFarmer.estimatedProduce} units` : 'N/A'}
                      </Text>
                      <Text style={styles.modalDetailLabel}>Years:</Text>
                      <Text style={styles.modalDetailValue}>{selectedFarmer.contractYears || 'N/A'}</Text>
                    </View>
                  )}
                  {modalActiveTab === 'CreditScore' && (
                    <View>
                      <Text style={styles.modalDetailLabel}>Credit Score:</Text>
                      {isFetchingDetails ? (
                        <ActivityIndicator size="small" color="green" style={styles.detailLoader} />
                      ) : (
                        <Text style={styles.modalDetailValue}>{farmerDetails.creditScore ?? '...'}</Text>
                      )}
                    </View>
                  )}
                  {modalActiveTab === 'Feedback' && (
                    <View>
                      <Text style={styles.modalDetailLabel}>General Feedback:</Text>
                      {isFetchingDetails ? (
                        <ActivityIndicator size="small" color="green" style={styles.detailLoader} />
                      ) : (
                        <Text style={styles.modalDetailValue}>{farmerDetails.feedback ?? '...'}</Text>
                      )}
                    </View>
                  )}
                </ScrollView>
                <View style={styles.modalButtonRow}>
                  <TouchableOpacity
                    style={[styles.approveButton, (isFetchingDetails || isApproving) && styles.disabledButton]}
                    onPress={handleApproveApplicant}
                    disabled={isFetchingDetails || isApproving}
                  >
                    {isApproving ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.approveButtonText}>Approve</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.closeButton, (isFetchingDetails || isApproving) && styles.disabledButton]}
                    onPress={handleCloseModal}
                    disabled={isFetchingDetails || isApproving}
                  >
                    <Text style={styles.closeButtonText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <View style={styles.centered}>
                <ActivityIndicator size="large" color="green" />
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* --- Feedback Modal --- */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isFeedbackModalVisible}
        onRequestClose={handleCloseFeedbackModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedContractForFeedback ? (
              <>
                <Text style={styles.modalTitle}>
                  Feedback & Rating for {selectedContractForFeedback.farmerName || 'Farmer'}
                </Text>
                <Text style={styles.modalSubtitle}>
                  Contract: {selectedContractForFeedback.cropCultivated || 'N/A'} - ₹
                  {selectedContractForFeedback.loanAmount?.toLocaleString() || 'N/A'}
                </Text>

                {/* Credit Rating Input */}
                <Text style={styles.ratingLabel}>Credit Rating (1-5):</Text>
                <TextInput
                  style={styles.ratingInput}
                  placeholder="Enter rating (e.g., 1, 2, 3, 4, 5)"
                  keyboardType="numeric"
                  maxLength={1}
                  value={feedbackRating}
                  onChangeText={(text) => {
                    const ft = text.replace(/[^1-5]/g, '');
                    setFeedbackRating(ft);
                  }}
                  editable={!isSubmittingFeedback}
                />

                {/* Feedback Comments Input */}
                <Text style={styles.feedbackLabel}>Feedback Comments:</Text>
                <TextInput
                  style={styles.feedbackInput}
                  placeholder="Enter feedback comments here..."
                  multiline
                  numberOfLines={4}
                  value={feedbackText}
                  onChangeText={setFeedbackText}
                  editable={!isSubmittingFeedback}
                />

                {/* Buttons */}
                <View style={styles.modalButtonRow}>
                  <TouchableOpacity
                    style={[
                      styles.submitFeedbackButton,
                      (isSubmittingFeedback || !feedbackText.trim() || !feedbackRating.trim()) &&
                        styles.disabledButton,
                    ]}
                    onPress={handleSubmitContractFeedback}
                    disabled={isSubmittingFeedback || !feedbackText.trim() || !feedbackRating.trim()}
                  >
                    {isSubmittingFeedback ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.submitFeedbackButtonText}>Submit & Complete</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.closeButton, isSubmittingFeedback && styles.disabledButton]}
                    onPress={handleCloseFeedbackModal}
                    disabled={isSubmittingFeedback}
                  >
                    <Text style={styles.closeButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <View style={styles.centered}>
                <ActivityIndicator size="large" color="green" />
              </View>
            )}
          </View>
        </View>
      </Modal>
      {/* --- End Feedback Modal --- */}

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        {NAV_TABS.map((tab) => {
          const isTabActive = currentRoute === tab.screen;
          return (
            <TouchableOpacity
              key={tab.name}
              style={styles.navItem}
              onPress={() => !isRefreshing && currentRoute !== tab.screen && navigation.navigate(tab.screen)}
              disabled={isRefreshing}
            >
              <Icon
                name={tab.icon}
                size={28}
                color={isTabActive ? 'green' : isRefreshing ? '#aaa' : 'gray'}
              />
              <Text
                style={[
                  styles.navText,
                  isTabActive && styles.activeNavText,
                  isRefreshing && styles.disabledText,
                ]}
              >
                {tab.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

// --- Stylesheet ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#F8F9FA' },
  loadingText: { marginTop: 15, fontSize: 16, color: '#555' },
  errorText: { marginTop: 15, fontSize: 16, color: '#D83933', textAlign: 'center', marginHorizontal: 20, marginBottom: 20 },
  retryButton: { backgroundColor: 'green', paddingVertical: 10, paddingHorizontal: 25, borderRadius: 5, marginTop: 10 },
  retryButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 5 : 50,
    zIndex: 1, // Ensure header stays on top
  },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#333' },
  refreshButton: { padding: 8 },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
    justifyContent: 'space-around',
    height: 50, // Explicit height to ensure visibility
    zIndex: 1, // Ensure tabs stay above content
  },
  tab: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    fontSize: 15,
    color: '#666',
    fontWeight: '500',
    textAlign: 'center',
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTab: {
    fontWeight: 'bold',
    color: 'green',
    borderBottomWidth: 3,
    borderBottomColor: 'green',
    marginBottom: -1,
  },
  disabledText: { color: '#aaa' },
  refreshErrorBanner: {
    backgroundColor: '#FFEBEB',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5C6CB',
    alignItems: 'center',
    left: 0,
    right: 0,
    zIndex: 10,
  },
  refreshErrorText: { color: '#721C24', fontSize: 13, textAlign: 'center' },
  contentArea: { flex: 1, backgroundColor: '#F8F9FA' }, // Ensure content area doesn't overlap
  listStyle: { flex: 1 },
  listContentContainer: { paddingTop: 8, paddingBottom: 80, paddingHorizontal: 16, flexGrow: 1 },
  emptyComponentContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emptyListText: { textAlign: 'center', fontSize: 15, color: '#777' },
  cardContainer: { marginVertical: 8 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2.0,
  },
  itemName: { fontSize: 16, fontWeight: '600', marginBottom: 6, color: '#333' },
  itemDetail: { fontSize: 14, color: '#555', marginBottom: 4, lineHeight: 20 },
  statusText: { fontStyle: 'italic', color: '#444', marginTop: 4 },
  statusValue: { fontWeight: 'bold', textTransform: 'capitalize' },
  timestamp: { fontSize: 12, color: '#888', textAlign: 'right', marginTop: 8 },
  tapIndicator: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 10, opacity: 0.8 },
  tapIndicatorText: { fontSize: 11, color: 'green', marginRight: 4, fontStyle: 'italic' },
  disabledTapIndicator: { color: '#a0a0a0', fontStyle: 'normal' },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.6)' },
  modalContent: {
    width: '90%',
    maxHeight: '85%',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15, color: '#333', textAlign: 'center' },
  modalTabBar: { flexDirection: 'row', justifyContent: 'space-around', borderBottomWidth: 1, borderBottomColor: '#e0e0e0', marginBottom: 15 },
  modalTabButton: { paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 3, borderBottomColor: 'transparent', flex: 1, alignItems: 'center' },
  modalActiveTabButton: { borderBottomColor: 'green' },
  modalTabText: { fontSize: 14, color: '#666', fontWeight: '500', textAlign: 'center' },
  modalActiveTabText: { color: 'green', fontWeight: '600' },
  modalScrollView: { flexGrow: 1, marginBottom: 15, paddingHorizontal: 5 },
  modalDetailLabel: { fontSize: 14, color: '#555', fontWeight: '600', marginTop: 12, marginBottom: 4 },
  modalDetailValue: { fontSize: 16, color: '#222', lineHeight: 22, marginBottom: 10 },
  modalSectionTitle: { fontSize: 16, fontWeight: 'bold', color: 'green', marginTop: 25, marginBottom: 10, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  detailLoader: { alignSelf: 'flex-start', marginTop: 5, marginBottom: 5, height: 22 },
  modalButtonRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15, paddingHorizontal: 5 },
  approveButton: { backgroundColor: '#28a745', borderRadius: 8, paddingVertical: 14, alignItems: 'center', minHeight: 48, justifyContent: 'center', flex: 1, marginRight: 8 },
  approveButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  closeButton: { backgroundColor: '#6c757d', borderRadius: 8, paddingVertical: 14, alignItems: 'center', minHeight: 48, justifyContent: 'center', flex: 1, marginLeft: 8 },
  disabledButton: { opacity: 0.6 },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: '#E0E0E0',
    paddingBottom: Platform.OS === 'ios' ? 25 : 10,
    elevation: 8,
  },
  navItem: { alignItems: 'center', flex: 1, paddingVertical: 4 },
  navText: { fontSize: 11, color: 'gray', marginTop: 3 },
  activeNavText: { color: 'green', fontWeight: '600' },
  // Styles for Feedback/Complete Button and Modal
  completeButton: { backgroundColor: '#007bff', paddingVertical: 8, paddingHorizontal: 15, borderRadius: 20, marginTop: 15, alignSelf: 'flex-start', elevation: 1 },
  completeButtonText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  ratingLabel: { fontSize: 15, fontWeight: '600', color: '#444', marginBottom: 8, marginTop: 5 },
  ratingInput: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12, fontSize: 16, color: '#333', marginBottom: 20, backgroundColor: '#f9f9f9', width: '100%' },
  feedbackLabel: { fontSize: 15, fontWeight: '600', color: '#444', marginBottom: 8 },
  feedbackInput: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, minHeight: 100, textAlignVertical: 'top', fontSize: 15, color: '#333', marginBottom: 20, backgroundColor: '#f9f9f9' },
  submitFeedbackButton: { backgroundColor: '#28a745', borderRadius: 8, paddingVertical: 14, alignItems: 'center', minHeight: 48, justifyContent: 'center', flex: 1, marginRight: 8 },
  submitFeedbackButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  modalSubtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 15 },
});

export default IndustryTrans;