import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  FlatList,
  TextInput,
  Modal, // Ensure Modal is imported
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore';

const FarmerHome = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('Home');
  const [farmerName, setFarmerName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [approvedLoans, setApprovedLoans] = useState([]);
  const [isFeedbackModalVisible, setIsFeedbackModalVisible] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  // Fetch data function (improved)
  const fetchUserDataAndLoans = async () => {
    let storedUserId = null;
    try {
      storedUserId = await AsyncStorage.getItem('loggedInUserId');
      console.log('[FarmerHome] Fetched userId:', storedUserId);
      setUserId(storedUserId);

      if (storedUserId) {
        // Fetch User Data
        const userDoc = await firestore().collection('Users').doc(storedUserId).get();
        if (userDoc.exists) {
          setFarmerName(userDoc.data()?.name || 'Farmer');
        } else {
          console.error('[FarmerHome] User doc not found:', storedUserId);
          Alert.alert('Error', 'User data not found. Logging out.');
          await handleLogout(false); return;
        }

        // Fetch Approved Loans + Industry Names
        console.log(`[FarmerHome] Fetching approved loans for farmer ${storedUserId}...`);
        const loansSnapshot = await firestore()
          .collection('Farmers')
          .doc(storedUserId)
          .collection('Loans')
          .where('status', '==', 'Approved')
          .get();

        const loansPromises = loansSnapshot.docs.map(async (doc) => {
          const loanData = doc.data();
          let approvedByName = 'Industry';
          if (loanData.approvedBy) {
            try {
              const industryDoc = await firestore().collection('Industries').doc(loanData.approvedBy).get();
              if (industryDoc.exists) {
                approvedByName = industryDoc.data()?.industryName || 'Industry';
              }
            } catch (nameError) { console.error(`[FarmerHome] Error fetching industry name ${loanData.approvedBy}:`, nameError); }
          }
          // Convert Timestamp to Date object for reliable formatting
          const approvedAtDate = loanData.approvedAt instanceof firestore.Timestamp
                                ? loanData.approvedAt.toDate()
                                : null;
          return { id: doc.id, ...loanData, approvedByName, approvedAt: approvedAtDate }; // Store the Date object
        });

        const loans = await Promise.all(loansPromises);
        setApprovedLoans(loans);
        console.log(`[FarmerHome] Fetched ${loans.length} approved loans.`);

      } else {
        console.log('[FarmerHome] No userId found, navigating to Login.');
        navigation.replace('FarmerLogin'); return;
      }
    } catch (error) {
      console.error('[FarmerHome] Failed fetch:', error);
      Alert.alert('Error', 'Failed to load data. Please check connection and try again.');
    } finally {
       if (isLoading) setIsLoading(false); // Set loading false after initial fetch attempt
    }
  };

  // UseEffect for initial load and focus listener
  useEffect(() => {
    setIsLoading(true); // Set loading true when the effect runs initially
    fetchUserDataAndLoans(); // Initial fetch

    const unsubscribe = navigation.addListener('focus', () => {
       console.log("[FarmerHome] Screen focused, re-fetching data...");
       // Optionally set loading true here if you want a spinner on focus refresh
       // setIsLoading(true);
       fetchUserDataAndLoans();
    });

    return unsubscribe; // Cleanup listener
  }, [navigation]); // Re-run if navigation object changes (usually stable)

  // Logout function
  const handleLogout = async (showAlert = true) => {
    console.log('[FarmerHome] handleLogout called');
    try {
      await AsyncStorage.removeItem('loggedInUserId');
      navigation.replace('FarmerLogin');
    } catch (error) {
      console.error('[FarmerHome] Logout Error:', error);
      if (showAlert) Alert.alert('Error', 'Failed to logout.');
    }
  };

  // Function called when the "Feedback" button is pressed
  const handleFeedbackPress = (loan) => {
    console.log('[FarmerHome] Feedback button pressed for loan ID:', loan?.id);
    if (!loan) { Alert.alert('Error', 'Loan data missing.'); return; }
    setSelectedLoan(loan);
    setFeedbackText('');
    setIsFeedbackModalVisible(true); // Show the modal
  };

  // Function to handle feedback submission
  const handleSubmitFeedback = async () => {
    if (!feedbackText.trim()) { Alert.alert('Error', 'Please enter feedback.'); return; }
    if (!selectedLoan || !selectedLoan.approvedBy || !userId) {
       console.error('[FarmerHome] Feedback submission failed: Missing data.', { loan: selectedLoan?.id, user: userId });
       Alert.alert('Error', 'Cannot submit feedback: Missing required info.'); return;
    }

    setIsSubmittingFeedback(true);
    try {
      const feedbackData = { /* ... feedback data fields ... */
        farmerId: userId, farmerName: farmerName, loanId: selectedLoan.id,
        loanCrop: selectedLoan.cropCultivated || 'N/A', loanAmount: selectedLoan.loanAmount || 0,
        feedbackText: feedbackText.trim(), timestamp: firestore.FieldValue.serverTimestamp(),
        industryName: selectedLoan.approvedByName || 'Unknown',
      };
      await firestore().collection('Industries').doc(selectedLoan.approvedBy)
                      .collection('feedback').add(feedbackData);
      Alert.alert('Success', 'Feedback submitted!');
      setIsFeedbackModalVisible(false); setFeedbackText(''); setSelectedLoan(null);
    } catch (error) {
      console.error('[FarmerHome] Error submitting feedback:', error);
      Alert.alert('Error', 'Failed to submit feedback.');
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  // --- Corrected renderLoanItem ---
  const renderLoanItem = ({ item }) => {
    const approvedDate = item.approvedAt; // Use the Date object fetched earlier

    return (
      <View style={styles.loanItem}>
        {/* Details View */}
        <View style={styles.loanDetails}>
          <Text style={styles.loanItemText}>Crop: {item.cropCultivated || 'N/A'}</Text>
          <Text style={styles.loanItemText}>Amount: ₹{item.loanAmount?.toLocaleString() || 'N/A'}</Text>
          <Text style={styles.loanItemDate}>
            Approved: {approvedDate ? approvedDate.toLocaleDateString() : 'N/A'}
          </Text>
           {item.approvedByName && (
             <Text style={styles.loanItemDate}>Approved By: {item.approvedByName}</Text>
           )}
        </View>

        {/* Feedback Button */}
        <TouchableOpacity
          style={styles.feedbackButton}
          onPress={() => handleFeedbackPress(item)}
          activeOpacity={0.7}
        >
          <Text style={styles.feedbackButtonText}>Feedback</Text>
        </TouchableOpacity>
      </View>
    );
  };
  // --- End renderLoanItem ---


  // Loading Indicator UI
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="green" />
        <Text>Loading Home...</Text>
      </View>
    );
  }

  // Main Component UI
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIconPlaceholder} />
        <Text style={styles.title}>Home</Text>
        <TouchableOpacity onPress={() => handleLogout(true)} style={styles.headerIcon}>
          <Icon name="logout" size={24} color="#d32f2f" />
        </TouchableOpacity>
      </View>

      <Text style={styles.welcomeText}>Welcome, {farmerName || '...'}!</Text>

      {/* Content Area */}
      <View style={styles.content}>
        {/* Loan Request Box */}
        <View style={styles.loanBox}>
          <Text style={styles.loanText}>Need a Loan? Apply Here</Text>
          <TouchableOpacity style={styles.requestButton} onPress={() => navigation.navigate('LoanApplication')}>
            <Text style={styles.requestButtonText}>Request Loan</Text>
          </TouchableOpacity>
        </View>

        {/* Approved Loans Section */}
        <View style={styles.approvedLoansContainer}>
          <Text style={styles.approvedLoansTitle}>Your Approved Loans</Text>
          {approvedLoans.length > 0 ? (
            <FlatList
              data={approvedLoans}
              renderItem={renderLoanItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.loanList}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <Text style={styles.noLoansText}>No approved loans yet.</Text>
          )}
          {/* --- Misplaced Modal Content REMOVED from here --- */}
        </View>
      </View>

      {/* --- Feedback Modal Placed Correctly Here --- */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isFeedbackModalVisible} // Controlled by state
        onRequestClose={() => { // Allows closing with back button on Android
             if (!isSubmittingFeedback) { // Prevent closing while submitting
                setIsFeedbackModalVisible(false);
                setSelectedLoan(null); // Clear selection on close
             }
        }}
      >
        {/* The Modal's content structure */}
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Provide Feedback</Text>
             {selectedLoan && ( // Show details only when a loan is selected
                 <Text style={styles.modalSubtitle}>
                    For loan ({selectedLoan.cropCultivated || 'N/A'}) - ₹{selectedLoan.loanAmount?.toLocaleString() || 'N/A'}
                    {selectedLoan.approvedByName && `\nApproved by: ${selectedLoan.approvedByName}`}
                 </Text>
            )}
            <TextInput
                style={styles.feedbackInput}
                placeholder="Write your feedback here..."
                multiline
                numberOfLines={4}
                value={feedbackText}
                onChangeText={setFeedbackText}
                editable={!isSubmittingFeedback}
            />
            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                  style={[styles.submitButton, (isSubmittingFeedback || !feedbackText.trim()) && styles.disabledButton]}
                  onPress={handleSubmitFeedback}
                  disabled={isSubmittingFeedback || !feedbackText.trim()} // Also disable if no text
              >
                {isSubmittingFeedback ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.submitButtonText}>Submit</Text>}
              </TouchableOpacity>
              <TouchableOpacity
                  style={[styles.cancelButton, isSubmittingFeedback && styles.disabledButton]}
                  onPress={() => { setIsFeedbackModalVisible(false); setSelectedLoan(null); }} // Close and clear selection
                  disabled={isSubmittingFeedback}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* --- End of Correctly Placed Modal --- */}


      {/* Bottom Navigation Bar */}
      <View style={styles.bottomNav}>
        {[ { name: 'Home', icon: 'home', screen: 'FarmerHome' }, { name: 'Transaction', icon: 'account-balance-wallet', screen: 'FarmerTrans' }, { name: 'Profile', icon: 'person-outline', screen: 'FarmerProfile' }, { name: 'Help', icon: 'help-outline', screen: 'FarmerHelp' } ].map((tab) => (
          <TouchableOpacity key={tab.name} style={styles.navItem} onPress={() => { if (activeTab !== tab.name) { setActiveTab(tab.name); navigation.navigate(tab.screen); } }}>
            <Icon name={tab.icon} size={26} color={activeTab === tab.name ? '#2e7d32' : '#757575'} />
            <Text style={[styles.navText, activeTab === tab.name && styles.activeNavText]}>{tab.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View> // End main container View
  );
};

// --- Styles (with corrections applied) ---
const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F9FA' },
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: Platform.OS === 'ios' ? 50 : 30, paddingBottom: 10, paddingHorizontal: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  headerIcon: { padding: 8 },
  headerIconPlaceholder: { width: 40, height: 40 },
  title: { fontSize: 20, fontWeight: '600', color: '#333', textAlign: 'center' },
  welcomeText: { fontSize: 22, fontWeight: '500', textAlign: 'center', marginVertical: 20, color: '#444', paddingHorizontal: 16 },
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 10 },
  loanBox: { backgroundColor: '#E8F5E9', padding: 20, borderRadius: 12, alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 2, marginBottom: 25 },
  loanText: { fontSize: 18, fontWeight: 'bold', color: '#1B5E20', marginBottom: 15, textAlign: 'center' },
  requestButton: { backgroundColor: '#388E3C', paddingVertical: 12, paddingHorizontal: 30, borderRadius: 8 },
  requestButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  approvedLoansContainer: { flex: 1 },
  approvedLoansTitle: { fontSize: 19, fontWeight: '600', color: '#333', marginBottom: 15, textAlign: 'left' },
  loanList: { paddingBottom: 90 },

  // --- Corrected loanItem styles ---
  loanItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between', // Space between details and button
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingLeft: 15,
    paddingRight: 10,
    borderRadius: 8,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    // Removed flexWrap: 'wrap'
  },
  loanDetails: {
    flex: 1, // Allow details to take available space
    marginRight: 10, // Space between details and button
  },
  loanItemText: { fontSize: 16, color: '#333', marginBottom: 5 },
  loanItemDate: { fontSize: 13, color: '#777', marginTop: 5 },

  // --- Corrected feedbackButton styles ---
  feedbackButton: {
    backgroundColor: '#28a745', // Green background
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    // Removed alignSelf: 'center'
  },
  feedbackButtonText: {
    color: '#fff', // White text
    fontSize: 13,
    fontWeight: 'bold',
  },
  // --- End corrected styles ---

  noLoansText: { fontSize: 16, color: '#666', textAlign: 'center', marginTop: 30, fontStyle: 'italic' },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.6)' },
  modalContent: { width: '90%', maxWidth: 400, backgroundColor: '#fff', borderRadius: 12, padding: 25, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#333', textAlign: 'center', marginBottom: 10 },
  modalSubtitle: { fontSize: 15, color: '#555', textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  feedbackInput: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, minHeight: 100, textAlignVertical: 'top', fontSize: 16, color: '#333', marginBottom: 25, backgroundColor: '#f9f9f9' },
  modalButtonRow: { flexDirection: 'row', justifyContent: 'space-between' },
  submitButton: { backgroundColor: '#388E3C', paddingVertical: 12, borderRadius: 8, flex: 1, alignItems: 'center', marginRight: 10 },
  submitButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  cancelButton: { backgroundColor: '#888', paddingVertical: 12, borderRadius: 8, flex: 1, alignItems: 'center', marginLeft: 10 },
  cancelButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  disabledButton: { opacity: 0.5, backgroundColor: '#aaa' },
  bottomNav: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 8, paddingBottom: Platform.OS === 'ios' ? 25 : 10, borderTopWidth: 1, borderTopColor: '#e0e0e0', backgroundColor: '#fff' },
  navItem: { alignItems: 'center', paddingHorizontal: 10, paddingTop: 5 },
  navText: { fontSize: 11, color: '#757575', marginTop: 3 },
  activeNavText: { color: '#2e7d32', fontWeight: '600' },
});

export default FarmerHome;