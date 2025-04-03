import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import firestore from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LoanApplication = ({ navigation }) => {
  // State for form fields
  const [cropCultivated, setCropCultivated] = useState('');
  const [loanAmount, setLoanAmount] = useState('');
  const [estimatedProduce, setEstimatedProduce] = useState('');
  const [contractYears, setContractYears] = useState('');

  // State for user data and loading
  const [userId, setUserId] = useState(null);
  const [farmerName, setFarmerName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load farmer's ID and then their name when the screen loads
  useEffect(() => {
    const loadUserData = async () => {
      setIsLoading(true);
      let fetchedUserId = null;
      try {
        fetchedUserId = await AsyncStorage.getItem('loggedInUserId');
        if (!fetchedUserId) {
          throw new Error('User ID not found in storage.');
        }
        setUserId(fetchedUserId);

        const farmerDoc = await firestore().collection('Farmers').doc(fetchedUserId).get();
        
        if (farmerDoc.exists) {
          const farmerData = farmerDoc.data();
          setFarmerName(farmerData.name || '');
        } else {
          throw new Error('Farmer data not found in Firestore.');
        }
      } catch (error) {
        console.error('Error retrieving user/farmer data:', error);
        Alert.alert(
          'Error',
          `Could not load farmer details: ${error.message}. Please try logging in again.`,
          [{ text: 'OK', onPress: () => navigation.replace('FarmerLogin') }]
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadUserData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation]);

  const handleApply = async () => {
    // Basic validation
    if (!cropCultivated || !loanAmount || !estimatedProduce || !contractYears) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }
    // Validate numeric fields
    if (isNaN(parseFloat(loanAmount)) || isNaN(parseFloat(estimatedProduce)) || isNaN(parseInt(contractYears, 10))) {
      Alert.alert('Error', 'Loan Amount, Estimated Produce, and Contract Years must be valid numbers.');
      return;
    }

    // Ensure userId is available
    if (!userId) {
      Alert.alert('Error', 'Farmer ID not available. Cannot submit application.');
      return;
    }

    setIsSubmitting(true);

    try {
      const farmerDocRef = firestore().collection('Farmers').doc(userId);
      const loanRef = firestore().collection('loanApplicants').doc();

      const loanData = {
        farmerId: userId,
        farmerName: farmerName,
        cropCultivated,
        loanAmount: parseFloat(loanAmount),
        estimatedProduce: parseFloat(estimatedProduce),
        contractYears: parseInt(contractYears, 10),
        status: 'Pending',
        approved: false, // Added default approved field
        applicantLoanId: loanRef.id,
        createdAt: firestore.FieldValue.serverTimestamp(),
      };

      // Store in farmer's Loans subcollection
      await farmerDocRef.collection('Loans').doc(loanRef.id).set({
        ...loanData,
      });

      // Store in central loanApplicants collection
      const centralLoanData = {
        ...loanData,
        processedBy: null,
        processedAt: null,
      };
      await loanRef.set(centralLoanData);

      Alert.alert('Success', 'Loan application submitted successfully!');
      navigation.goBack();
    } catch (error) {
      console.error('Error submitting loan application:', error);
      Alert.alert('Error', `Loan submission failed: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="green" />
        <Text>Loading Application...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={styles.backButton}
        disabled={isSubmitting}
      >
        <Icon name="arrow-back" size={24} color={isSubmitting ? '#ccc' : '#333'} />
      </TouchableOpacity>

      <Text style={styles.title}>Loan Application</Text>

      <View style={styles.inputContainer}>
        <Icon name="person" size={20} color="#888" style={styles.icon}/>
        <TextInput
          style={[styles.input, styles.readOnlyInput]}
          placeholder="Farmer Name"
          value={farmerName}
          editable={false}
          placeholderTextColor="#555"
        />
      </View>

      <View style={styles.inputContainer}>
        <Icon name="eco" size={20} color="#888" style={styles.icon}/>
        <TextInput 
          style={styles.input} 
          placeholder="Crop Cultivated (e.g., Rice, Wheat)" 
          value={cropCultivated} 
          onChangeText={setCropCultivated} 
          editable={!isSubmitting} 
        />
      </View>
      
      <View style={styles.inputContainer}>
        <Icon name="attach-money" size={20} color="#888" style={styles.icon}/>
        <TextInput 
          style={styles.input} 
          placeholder="Loan Amount Required" 
          keyboardType="numeric" 
          value={loanAmount} 
          onChangeText={setLoanAmount} 
          editable={!isSubmitting} 
        />
      </View>
      
      <View style={styles.inputContainer}>
        <Icon name="grass" size={20} color="#888" style={styles.icon}/>
        <TextInput 
          style={styles.input} 
          placeholder="Estimated Produce (e.g., in Kg, Quintals)" 
          keyboardType="numeric" 
          value={estimatedProduce} 
          onChangeText={setEstimatedProduce} 
          editable={!isSubmitting} 
        />
      </View>
      
      <View style={styles.inputContainer}>
        <Icon name="calendar-today" size={20} color="#888" style={styles.icon}/>
        <TextInput 
          style={styles.input} 
          placeholder="Contract Duration (Years)" 
          keyboardType="numeric" 
          value={contractYears} 
          onChangeText={setContractYears} 
          editable={!isSubmitting} 
        />
      </View>

      <TouchableOpacity
        style={[styles.applyButton, isSubmitting && styles.disabledButton]}
        onPress={handleApply}
        disabled={isSubmitting || isLoading}
      >
        {isSubmitting ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.applyButtonText}>Submit Application</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#F8F9FA',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 55 : 35,
    left: 15,
    zIndex: 1,
    padding: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    color: '#333',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CED4DA',
    borderRadius: 8,
    marginBottom: 18,
    backgroundColor: '#fff',
    height: 55,
    paddingHorizontal: 10,
  },
  icon: {
    marginRight: 10,
    color: '#6c757d',
  },
  input: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 5,
    fontSize: 16,
    color: '#495057',
  },
  readOnlyInput: {
    backgroundColor: '#e9ecef',
    color: '#495057',
  },
  applyButton: {
    backgroundColor: '#28A745',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    minHeight: 50,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  disabledButton: {
    backgroundColor: '#A5D6A7',
    elevation: 0,
    shadowOpacity: 0,
  },
  applyButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default LoanApplication;