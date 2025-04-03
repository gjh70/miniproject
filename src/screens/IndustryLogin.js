import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert, // Use Alert
  ActivityIndicator, // For loading
  Platform,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome'; // Keep FontAwesome
import { useNavigation } from '@react-navigation/native';
import firestore from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const IndustryLogin = () => {
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false); // Loading state
  const [isCheckingAuth, setIsCheckingAuth] = useState(true); // Initial auth check state

  // Check for existing logged-in user on mount
  useEffect(() => {
    const checkLoggedInUser = async () => {
      try {
        const storedUserId = await AsyncStorage.getItem('loggedInUserId');
        if (storedUserId) {
          navigation.replace('IndustryHome'); // Redirect if logged in
        }
      } catch (e) {
        console.error("Failed to check async storage for login status", e);
      } finally {
        setIsCheckingAuth(false); // Finished initial check
      }
    };
    checkLoggedInUser();
  }, [navigation]);

  // --- Login Handler ---
  const handleLogin = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !password) {
      Alert.alert('Error', 'Please enter both email and password.');
      return;
    }

    setIsLoading(true); // Start loading indicator

    try {
      const userSnapshot = await firestore()
        .collection('Users')
        .where('email', '==', trimmedEmail)
        .where('userType', '==', 'industry')
        .limit(1)
        .get();

      if (userSnapshot.empty) {
        Alert.alert('Login Failed', 'No industry account found with this email.');
        setIsLoading(false);
        return;
      }

      const userDoc = userSnapshot.docs[0];
      const userData = userDoc.data();
      const userId = userDoc.id;

      if (userData.password === password) {
        await AsyncStorage.setItem('loggedInUserId', userId);
        Alert.alert('Success', 'Login successful!');
        navigation.replace('IndustryHome');
      } else {
        Alert.alert('Login Failed', 'Incorrect password.');
      }
    } catch (error) {
      console.error('Industry Login Error:', error);
      Alert.alert('Error', 'An error occurred during login. Please try again.');
    } finally {
      setIsLoading(false); // Stop loading indicator
    }
  }; // --- End Login Handler ---

  // Show loading indicator during initial auth check
  if (isCheckingAuth) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007BFF" />
      </View>
    );
  }

  // --- Component Render ---
  return (
    <View style={styles.container}>
      {/* Back Button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.navigate('Login')} // Changed to navigate to 'Login'
        disabled={isLoading} // Disable when loading
      >
        <Icon name="arrow-left" size={24} color={isLoading ? '#aaa' : 'black'} />
      </TouchableOpacity>

      {/* Title/Subtitle */}
      <Text style={styles.title}>Industry Login</Text>
      <Text style={styles.subtitle}>Sign in to your industry account</Text>

      {/* Email Input */}
      <View style={styles.inputContainer}>
        <Icon name="envelope" size={20} color="#6c757d" style={styles.icon} />
        <TextInput
          style={styles.input}
          placeholder="Your email address"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          editable={!isLoading}
          autoCapitalize="none"
          autoCorrect={false}
          placeholderTextColor="#888"
        />
      </View>

      {/* Password Input */}
      <View style={styles.inputContainer}>
        <Icon name="lock" size={20} color="#6c757d" style={styles.icon} />
        <TextInput
          style={styles.input}
          placeholder="Enter your password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          editable={!isLoading}
          placeholderTextColor="#888"
        />
      </View>

      {/* Login Button */}
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

      {/* Sign Up Link */}
      <View style={styles.signupContainer}>
        <Text style={styles.signupText}>
          Don't have an account?{' '}
        </Text>
        <TouchableOpacity onPress={() => navigation.navigate('IndustrySignin')} disabled={isLoading}>
          <Text style={[styles.signupLink, isLoading && { color: 'green' }]}>Sign Up</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// --- Styles ---
const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  container: {
    flex: 1,
    paddingHorizontal: 25,
    paddingTop: Platform.OS === 'ios' ? 80 : StatusBar.currentHeight + 40,
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
  loginButton: {
    width: '100%',
    backgroundColor: 'green',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    marginTop: 10,
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
  loginText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  signupContainer: {
    flexDirection: 'row',
    marginTop: 25,
    alignItems: 'center',
  },
  signupText: {
    fontSize: 14,
    color: '#6c757d',
  },
  signupLink: {
    color: '#28A745',
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 5,
  },
});

export default IndustryLogin;