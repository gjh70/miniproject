import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { useNavigation } from '@react-navigation/native';
import firestore from '@react-native-firebase/firestore';

const IndustrySignin = () => {
  const navigation = useNavigation();
  const [name, setName] = useState(''); // Industry Name
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [retypePassword, setRetypePassword] = useState('');
  const [agree, setAgree] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // Loading state

  // References to Firestore collections
  const usersCollection = firestore().collection('Users');
  const industriesCollection = firestore().collection('Industries');

  // --- Signup Handler ---
  const handleSignup = async () => {
    // --- Input Validation ---
    const industryNameTrimmed = name.trim();
    const industryEmailLower = email.trim().toLowerCase();

    if (!agree || !industryNameTrimmed || !industryEmailLower || !password || !retypePassword) {
      Alert.alert('Missing Information', 'Please fill all fields and agree to Terms & Conditions.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters long.');
      return;
    }
    if (password !== retypePassword) {
      Alert.alert('Password Mismatch', 'Passwords do not match.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(industryEmailLower)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }
    // --- End Validation ---

    setIsLoading(true); // Start loading indicator

    try {
      // --- Check if Email Already Exists in Users Collection ---
      const userEmailQuery = await usersCollection.where('email', '==', industryEmailLower).limit(1).get();
      if (!userEmailQuery.empty) {
        Alert.alert('Signup Failed', 'An account with this email address already exists.');
        setIsLoading(false);
        return;
      }

      // --- Generate ONE Shared Auto-ID ---
      const newDocRef = usersCollection.doc();
      const sharedId = newDocRef.id; // This ID will be used for both documents

      // --- Use Batch Write for Atomic Creation ---
      const batch = firestore().batch(); // Initialize a batch write

      // 1. Prepare the 'Users' document data
      const userDocRef = newDocRef; // Reference to Users/{sharedId}
      const userData = {
        id: sharedId,
        name: industryNameTrimmed,
        email: industryEmailLower,
        // 🚨 SECURITY WARNING 1: Storing plain text password in Users collection
        password: password,
        userType: 'industry',
        createdAt: firestore.FieldValue.serverTimestamp(),
      };
      batch.set(userDocRef, userData);

      // 2. Prepare the 'Industries' document data using the SAME shared ID
      const industryDocRef = industriesCollection.doc(sharedId); // Reference to Industries/{sharedId}
      const industryData = {
        id: sharedId,
        name: industryNameTrimmed,
        email: industryEmailLower,
        createdAt: firestore.FieldValue.serverTimestamp(),
        address: null,
        requiredMaterials: [],
        phone: null,
        // 🚨 SECURITY WARNING 2: Storing plain text password ALSO in Industries collection (as per your edit)
        password: password,
        // Add any other fields needed for the industry's profile
      };
      batch.set(industryDocRef, industryData);

      // --- Commit the batch write ---
      await batch.commit();

      Alert.alert('Success', 'Industry account created successfully!');
      navigation.navigate('IndustryLogin');

    } catch (error) {
      console.error('Industry Signup Error: ', error);
      Alert.alert('Error', `Could not create account: ${error.message}.`);
    } finally {
      setIsLoading(false);
    }
  }; // --- End Signup Handler ---

  // --- Component Render ---
  return (
    <View style={styles.container}>
      {/* Back Button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
        disabled={isLoading}
      >
        <Icon name="arrow-left" size={24} color={isLoading ? '#aaa' : 'black'} />
      </TouchableOpacity>

      {/* Title and Subtitle */}
      <Text style={styles.title}>Create Industry Account</Text>
      <Text style={styles.subtitle}>Register your industry profile</Text>

      {/* Input Fields */}
      {/* Industry Name */}
      <View style={styles.inputContainer}>
        <Icon name="industry" size={20} color="#6c757d" style={styles.icon} />
        <TextInput
          style={styles.input}
          placeholder="Enter your industry name"
          value={name}
          onChangeText={setName}
          editable={!isLoading}
          autoCapitalize="words"
          placeholderTextColor="#888"
        />
      </View>

      {/* Email */}
      <View style={styles.inputContainer}>
        <Icon name="envelope" size={20} color="#6c757d" style={styles.icon} />
        <TextInput
          style={styles.input}
          placeholder="Your industry email address"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          editable={!isLoading}
          autoCapitalize="none"
          autoCorrect={false}
          placeholderTextColor="#888"
        />
      </View>

      {/* Password */}
      <View style={styles.inputContainer}>
        <Icon name="lock" size={20} color="#6c757d" style={styles.icon} />
        <TextInput
          style={styles.input}
          placeholder="Create a password (min. 6 chars)"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          editable={!isLoading}
          placeholderTextColor="#888"
        />
      </View>

      {/* Retype Password */}
      <View style={styles.inputContainer}>
        <Icon name="lock" size={20} color="#6c757d" style={styles.icon} />
        <TextInput
          style={styles.input}
          placeholder="Retype your password"
          secureTextEntry
          value={retypePassword}
          onChangeText={setRetypePassword}
          editable={!isLoading}
          placeholderTextColor="#888"
        />
      </View>

      {/* Terms Checkbox */}
      <TouchableOpacity
        style={styles.checkboxContainer}
        onPress={() => setAgree(!agree)}
        activeOpacity={0.7}
        disabled={isLoading}
      >
        <Icon
          name={agree ? 'check-square' : 'square-o'}
          size={20}
          color={agree ? '#28A745' : '#888'}
        />
        <Text style={styles.checkboxText}>I agree with Terms & Conditions</Text>
      </TouchableOpacity>

      {/* Sign Up Button */}
      <TouchableOpacity
        style={[styles.signupButton, isLoading && styles.disabledButton]}
        onPress={handleSignup}
        disabled={isLoading || !agree || !name.trim() || !email || !password || password !== retypePassword}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.signupText}>Sign Up</Text>
        )}
      </TouchableOpacity>

      {/* Login Link */}
      <View style={styles.loginContainer}>
        <Text style={styles.loginText}>
          Already registered?{' '}
        </Text>
        <TouchableOpacity onPress={() => navigation.navigate('IndustryLogin')} disabled={isLoading}>
          <Text style={[styles.loginLink, isLoading && { color: '#aaa' }]}>Log In</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}; // --- End Component ---

// --- Styles ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 25,
    paddingTop: Platform.OS === 'ios' ? 60 : StatusBar.currentHeight + 20,
    paddingBottom: 20,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : StatusBar.currentHeight + 10,
    left: 20,
    zIndex: 1,
    padding: 5,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6c757d',
    marginBottom: 30,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CED4DA',
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    width: '100%',
    height: 55,
  },
  icon: {
    marginRight: 12,
    color: '#6c757d',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#495057',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
    width: '100%',
    justifyContent: 'flex-start',
  },
  checkboxText: {
    fontSize: 14,
    marginLeft: 10,
    color: '#495057',
  },
  signupButton: {
    width: '100%',
    backgroundColor: 'green',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
  },
  disabledButton: {
    backgroundColor: '#6c757d',
    opacity: 0.7,
    elevation: 0,
    shadowOpacity: 0,
  },
  signupText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  loginContainer: {
    flexDirection: 'row',
    marginTop: 20,
    alignItems: 'center',
  },
  loginText: {
    fontSize: 14,
    color: '#6c757d',
  },
  loginLink: {
    color: '#28A745', // Changed to green
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 5,
  },
});

export default IndustrySignin;