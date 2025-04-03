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
import Icon from 'react-native-vector-icons/FontAwesome';
import firestore from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FarmerLogin = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false); // Add loading state
  const [isCheckingAuth, setIsCheckingAuth] = useState(true); // State for initial auth check

  useEffect(() => {
    // Check if a user ID is already stored
    const checkLoggedInUser = async () => {
      try {
        const storedUserId = await AsyncStorage.getItem('loggedInUserId');
        if (storedUserId) {
          // Optional: You could quickly verify if this user still exists in Firestore
          // const userDoc = await firestore().collection('Users').doc(storedUserId).get();
          // if (userDoc.exists) {
          navigation.replace('FarmerHome'); // Redirect if ID exists
          // } else {
          //    await AsyncStorage.removeItem('loggedInUserId'); // Clean up invalid stored ID
          // }
        }
      } catch (e) {
        console.error('Failed to check async storage', e);
        // Handle error, maybe show a message
      } finally {
        setIsCheckingAuth(false); // Finish checking auth state
      }
    };

    checkLoggedInUser();
  }, [navigation]);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password.');
      return;
    }

    setIsLoading(true); // Start loading

    try {
      const userSnapshot = await firestore()
        .collection('Users')
        .where('email', '==', email.trim().toLowerCase())
        .limit(1)
        .get();

      if (userSnapshot.empty) {
        Alert.alert('Error', 'No account found with this email address.');
        setIsLoading(false);
        return;
      }

      const userDoc = userSnapshot.docs[0];
      const userData = userDoc.data();
      const userId = userDoc.id;

      // 🚨 SECURITY WARNING: Comparing plain text passwords is highly insecure!
      // Use Firebase Authentication for proper password handling (hashing, secure comparison).
      if (userData.password === password) {
        await AsyncStorage.setItem('loggedInUserId', userId);
        Alert.alert('Success', 'Login successful!');
        navigation.replace('FarmerHome');
      } else {
        Alert.alert('Error', 'Incorrect password.');
      }
    } catch (error) {
      console.error('Login Error:', error);
      Alert.alert('Error', 'An unexpected error occurred during login. Please try again.');
    } finally {
      setIsLoading(false); // Stop loading
    }
  };

  // Show a loading indicator while checking auth state initially
  if (isCheckingAuth) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#14532d" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.navigate('Login')} // Navigate to LoginScreen.js
        disabled={isLoading}
      >
        <Icon name="arrow-left" size={22} color={isLoading ? '#ccc' : '#000'} />
      </TouchableOpacity>

      <Text style={styles.title}>Farmer Log In</Text>
      <Text style={styles.subtitle}>Access your farmer account</Text>

      <View style={styles.inputContainer}>
        <Icon name="envelope" size={18} color="#888" style={styles.icon} />
        <TextInput
          style={styles.input}
          placeholder="Your email address"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          placeholderTextColor="#888"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!isLoading}
        />
      </View>

      <View style={styles.inputContainer}>
        <Icon name="lock" size={18} color="#888" style={styles.icon} />
        <TextInput
          style={styles.input}
          placeholder="Enter your password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          placeholderTextColor="#888"
          editable={!isLoading}
        />
      </View>

      <TouchableOpacity
        style={[styles.loginButton, isLoading && styles.disabledButton]}
        onPress={handleLogin}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.loginText}>Log In</Text>
        )}
      </TouchableOpacity>

      <View style={styles.signupContainer}>
        <Text style={styles.signupText}>Don't have an account? </Text>
        <TouchableOpacity onPress={() => navigation.navigate('FarmerSignin')} disabled={isLoading}>
          <Text style={[styles.signupLink, isLoading && { color: '#aaa' }]}>Sign Up</Text>
        </TouchableOpacity>
      </View>
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
    paddingHorizontal: 25,
    paddingTop: 80,
    paddingBottom: 40,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 20,
    zIndex: 10,
    padding: 5,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 35,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CED4DA',
    paddingHorizontal: 15,
    marginBottom: 20,
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
  loginButton: {
    backgroundColor: '#28A745',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 15,
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
  loginText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 25,
  },
  signupText: {
    fontSize: 14,
    color: '#6c757d',
  },
  signupLink: {
    color: 'green',
    fontWeight: 'bold',
    marginLeft: 5,
  },
});

export default FarmerLogin;