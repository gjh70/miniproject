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
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { useNavigation } from '@react-navigation/native';
import firestore from '@react-native-firebase/firestore';

const FarmerSignin = () => {
  const navigation = useNavigation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [retypePassword, setRetypePassword] = useState('');
  const [agree, setAgree] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // References to Firestore collections
  const usersCollection = firestore().collection('Users');
  const farmersCollection = firestore().collection('Farmers');

  const handleSignup = async () => {
    // --- Input Validation ---
    const farmerNameTrimmed = name.trim();
    const farmerEmailLower = email.trim().toLowerCase();

    // ... (keep existing validation checks: required fields, password length, password match, email format)
    if (!agree || !farmerNameTrimmed || !farmerEmailLower || !password || !retypePassword) {
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
    if (!emailRegex.test(farmerEmailLower)) {
        Alert.alert('Invalid Email', 'Please enter a valid email address.');
        return;
    }
    // --- End Validation ---

    setIsLoading(true);

    try {
      // --- Check for Existing User Email ---
      const userEmailQuery = await usersCollection.where('email', '==', farmerEmailLower).limit(1).get();
      if (!userEmailQuery.empty) {
        Alert.alert('Signup Failed', 'An account with this email address already exists.');
        setIsLoading(false);
        return;
      }

      // --- Generate ONE Shared Auto-ID ---
      // Get a reference to a new document in EITHER collection to generate the ID.
      // We'll use the Users collection here, but it doesn't matter which.
      const newDocRef = usersCollection.doc(); // Creates a reference with a unique auto-ID
      const sharedId = newDocRef.id; // This is the ID we'll use for both documents

      // --- Use Batch Write for Atomic Creation ---
      const batch = firestore().batch();

      // 1. Prepare the 'Users' document using the shared ID
      // Note: We already have the reference: newDocRef = usersCollection.doc(sharedId)
      const userData = {
        id: sharedId, // Store the shared ID within the document
        name: farmerNameTrimmed,
        email: farmerEmailLower,
        // 🚨 SECURITY WARNING: Storing plain text passwords is very insecure! Use Firebase Auth.
        password: password,
        userType: 'farmer',
        createdAt: firestore.FieldValue.serverTimestamp(),
        // No need for farmerId field, as the user doc ID *is* the farmer ID
      };
      batch.set(newDocRef, userData); // Set data for Users/{sharedId}

      // 2. Prepare the 'Farmers' document using the SAME shared ID
      const farmerDocRef = farmersCollection.doc(sharedId); // Explicitly create ref using the shared ID
      const farmerData = {
        id: sharedId, // Store the shared ID within the document
        name: farmerNameTrimmed,
        email: farmerEmailLower, // Optional: duplicate email for farmer-specific queries
        // No need for userId field, as the farmer doc ID *is* the user ID
        createdAt: firestore.FieldValue.serverTimestamp(),
        location: null,
        contact: null,
        rawMaterials: [],
      };
      batch.set(farmerDocRef, farmerData); // Set data for Farmers/{sharedId}

      // --- Commit the batch write ---
      await batch.commit(); // Atomically creates both Users/{sharedId} and Farmers/{sharedId}

      // --- Create Subcollections under the new Farmer document ---
      // Use 'farmerDocRef', which correctly points to Farmers/{sharedId}

      // 1. Credit Score Subcollection
      const creditScoreRef = farmerDocRef.collection('creditScore');
      await creditScoreRef.add({ // Add doc with its own auto-ID within subcollection
        score: 0,
        lastUpdated: firestore.FieldValue.serverTimestamp(),
        reason: 'Initial account creation',
      });

      // 2. Feedback Subcollection
      const feedbackRef = farmerDocRef.collection('feedback');
      await feedbackRef.add({ // Add placeholder doc with its own auto-ID
          message: 'Account created. No feedback yet.',
          rating: null,
          from: 'system',
          timestamp: firestore.FieldValue.serverTimestamp(),
      });

      // 3. Loans Subcollection (Implicitly exists, or add placeholder if needed)
      // const loansRef = farmerDocRef.collection('Loans');


      Alert.alert('Success', 'Farmer account created successfully!');
      navigation.navigate('FarmerLogin');

    } catch (error) {
      console.error("Firestore Signup Error: ", error);
      Alert.alert('Error', `Could not create account: ${error.message}. Check console for details.`);
    } finally {
      setIsLoading(false);
    }
  };

  // --- JSX (Remains the same as the previous version) ---
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
        disabled={isLoading}
      >
        <Icon name="arrow-left" size={24} color={isLoading ? '#ccc' : 'black'} />
      </TouchableOpacity>

      <Text style={styles.title}>Create Farmer Account</Text>
      <Text style={styles.subtitle}>Register User & Farmer Profile</Text>

      {/* Full Name */}
      <View style={styles.inputContainer}>
        <Icon name="user" size={20} color="#888" style={styles.icon} />
        <TextInput
          style={styles.input}
          placeholder="Enter Farmer's Full Name"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          editable={!isLoading}
        />
      </View>

      {/* Email */}
      <View style={styles.inputContainer}>
        <Icon name="envelope" size={20} color="#888" style={styles.icon} />
        <TextInput
          style={styles.input}
          placeholder="Your email address"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!isLoading}
        />
      </View>

      {/* Password */}
      <View style={styles.inputContainer}>
        <Icon name="lock" size={20} color="#888" style={styles.icon} />
        <TextInput
          style={styles.input}
          placeholder="Create a password (min. 6 characters)"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          editable={!isLoading}
        />
      </View>

      {/* Retype Password */}
      <View style={styles.inputContainer}>
        <Icon name="lock" size={20} color="#888" style={styles.icon} />
        <TextInput
          style={styles.input}
          placeholder="Retype your password"
          secureTextEntry
          value={retypePassword}
          onChangeText={setRetypePassword}
          editable={!isLoading}
        />
      </View>

      {/* Checkbox */}
      <TouchableOpacity
        style={styles.checkboxContainer}
        onPress={() => setAgree(!agree)}
        activeOpacity={0.7}
        disabled={isLoading}
      >
        <Icon
          name={agree ? 'check-square' : 'square-o'}
          size={20}
          color={agree ? '#4CAF50' : '#888'}
        />
        <Text style={styles.checkboxText}>I agree with Terms & Conditions</Text>
      </TouchableOpacity>

      {/* Sign Up Button */}
      <TouchableOpacity
        style={[styles.signupButton, (isLoading || !agree || !name.trim() || !email || !password || password !== retypePassword) && styles.disabledButton]}
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
          Already have an account?{' '}
        </Text>
        <TouchableOpacity onPress={() => navigation.navigate('FarmerLogin')} disabled={isLoading}>
          <Text style={[styles.loginLink, isLoading && { color: '#ccc' }]}>Log In</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// --- Styles (Use the same styles as provided previously) ---
const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 25,
        paddingTop: 60,
        paddingBottom: 20,
        backgroundColor: '#F8F9FA',
        alignItems: 'center',
        justifyContent: 'center',
    },
    backButton: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 60 : 40,
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
        marginBottom: 25,
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
        backgroundColor: '#28A745',
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
        backgroundColor: '#A5D6A7',
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
        color: 'green',
        fontWeight: 'bold',
        fontSize: 14,
        marginLeft: 5,
    },
});

export default FarmerSignin;