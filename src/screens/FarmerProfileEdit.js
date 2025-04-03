import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  StatusBar,
  ActivityIndicator, // Import ActivityIndicator
} from 'react-native';
import FeatherIcon from 'react-native-vector-icons/Feather';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native'; // Keep useNavigation hook
import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore';

// Add route prop to access navigation params
const FarmerProfileEdit = ({ route }) => {
  const navigation = useNavigation();
  const passedFarmerId = route.params?.farmerId; // Get ID passed from Profile screen

  const [userId, setUserId] = useState(null); // State to store the user's Document ID
  const [isLoading, setIsLoading] = useState(true); // Loading state for fetching data
  const [isSaving, setIsSaving] = useState(false); // Loading state for saving data

  // State for profile details form
  const [form, setForm] = useState({
    name: '',
    location: '',
    contact: '',
    // rawMaterials is handled separately
  });

  // State for the list of raw materials (crops)
  const [rawMaterialsList, setRawMaterialsList] = useState([]);
  const [newRawMaterial, setNewRawMaterial] = useState('');

  // Fetch farmer's ID and existing profile data on component mount
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      let idToFetch = null;

      try {
        // 1. Determine the User ID (Prioritize route param, fallback to AsyncStorage)
        if (passedFarmerId) {
            console.log('Using farmerId from route params:', passedFarmerId);
            idToFetch = passedFarmerId;
        } else {
            console.log('No farmerId in route params, trying AsyncStorage...');
            idToFetch = await AsyncStorage.getItem('loggedInUserId'); // <-- Use correct key
            if (idToFetch) {
                console.log('Using userId from AsyncStorage:', idToFetch);
            }
        }

        if (!idToFetch) {
            throw new Error('Could not determine Farmer ID. Please log in again.');
        }
        setUserId(idToFetch); // Store the determined ID in state

        // 2. Fetch existing profile data from Firestore using the determined ID
        console.log(`Fetching Firestore document: Farmers/${idToFetch}`);
        const farmerDoc = await firestore().collection('Farmers').doc(idToFetch).get();

        if (farmerDoc.exists) {
          const data = farmerDoc.data();
          console.log('Existing data found:', data);
          setForm({
            // Use existing data or default to empty strings
            name: data.name ?? '',
            location: data.location ?? '',
            contact: data.contact ?? '',
          });
          setRawMaterialsList(data.rawMaterials ?? []); // Load existing materials or empty array
        } else {
          console.log(`No profile document found for farmer ID: ${idToFetch}. Starting fresh edit form.`);
          // Keep initial empty state if no document exists, but maybe prefill name if possible?
          // Could fetch from Users collection if needed: const userDoc = await firestore().collection('Users').doc(idToFetch).get();
          setForm({ name: '', location: '', contact: '' });
          setRawMaterialsList([]);
          // Optionally Alert the user they are creating a profile
          // Alert.alert('New Profile', 'Enter your details to create your farmer profile.');
        }
      } catch (error) {
        console.error('Error fetching farmer data:', error);
        Alert.alert(
            'Error',
            `Failed to load profile data: ${error.message}`,
            [{ text: 'OK', onPress: () => navigation.goBack() }] // Go back on critical fetch error
        );
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [navigation, passedFarmerId]); // Depend on navigation and passed ID

  // --- Raw Material Functions (Keep as is) ---
  const handleAddRawMaterial = () => {
    const trimmedMaterial = newRawMaterial.trim();
    if (trimmedMaterial === '') {
      Alert.alert('Input Required', 'Please enter a crop name.');
      return;
    }
    if (rawMaterialsList.some(mat => mat.toLowerCase() === trimmedMaterial.toLowerCase())) {
       Alert.alert('Duplicate', `'${trimmedMaterial}' is already in the list.`);
       return;
    }
    setRawMaterialsList([...rawMaterialsList, trimmedMaterial]);
    setNewRawMaterial('');
  };

  const handleRemoveRawMaterial = (indexToRemove) => {
    setRawMaterialsList(currentList => currentList.filter((_, index) => index !== indexToRemove));
  };
  // --- End Raw Material Functions ---


  // --- Save Profile ---
  const saveProfileToFirestore = async () => {
    // Use the userId from state
    if (!userId) {
      Alert.alert('Error', 'Farmer ID not found. Cannot save profile.');
      return;
    }
     // Basic Validation
     if (!form.name.trim() || !form.location.trim() || !form.contact.trim()) {
        Alert.alert('Missing Information', 'Please fill in your name, location, and contact details.');
        return;
     }

    setIsSaving(true); // Indicate saving process

    try {
      console.log(`Saving profile for ID: ${userId}`);
      // Use the userId from state to reference the correct document
      await firestore().collection('Farmers').doc(userId).set(
        {
          // Always include ID and essential fields
          id: userId, // Ensure ID is stored/updated in the document
          name: form.name.trim(),
          location: form.location.trim(),
          contact: form.contact.trim(),
          rawMaterials: rawMaterialsList, // Save the updated list
          // Include timestamp for last update
          lastUpdatedAt: firestore.FieldValue.serverTimestamp(),
        },
        { merge: true } // Use merge: true to update fields or create doc if non-existent
      );

      Alert.alert('Success', 'Profile updated successfully!');
      // Optionally update AsyncStorage if name changed? Usually not necessary here.
      navigation.goBack(); // Go back after successful save

    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', `Failed to update profile: ${error.message}`);
    } finally {
        setIsSaving(false); // Stop saving indicator
    }
  };
  // --- End Save Profile ---

  // Render Initial Loading state
  if (isLoading) {
      return (
          <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#0f9b6e" />
              <Text style={{ marginTop: 10, color: '#555' }}>Loading Profile...</Text>
          </View>
      );
  }

  // Main Render
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} disabled={isSaving}>
          <FeatherIcon name="arrow-left" size={24} color={isSaving ? '#aaa' : '#000'} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        {/* Optional: Add placeholder if needed for centering title */}
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.formContainer} keyboardShouldPersistTaps="handled">
        {/* Profile Details Inputs */}
        <Text style={styles.sectionTitle}>Profile Details</Text>
        <TextInput
          style={[styles.input, isSaving && styles.disabledInput]}
          placeholder="Enter your name"
          value={form.name}
          onChangeText={(text) => setForm({ ...form, name: text })}
          editable={!isSaving}
          placeholderTextColor="#888"
        />
        <TextInput
          style={[styles.input, isSaving && styles.disabledInput]}
          placeholder="Enter your location (e.g., City, State)"
          value={form.location}
          onChangeText={(text) => setForm({ ...form, location: text })}
          editable={!isSaving}
          placeholderTextColor="#888"
        />
        <TextInput
          style={[styles.input, isSaving && styles.disabledInput]}
          placeholder="Enter your contact (phone or email)"
          value={form.contact}
          onChangeText={(text) => setForm({ ...form, contact: text })}
          // Consider adjusting keyboardType based on validation or expected input
          // keyboardType="phone-pad"
          autoCapitalize="none"
          editable={!isSaving}
          placeholderTextColor="#888"
        />

        {/* --- Raw Materials Section --- */}
        <Text style={styles.sectionTitle}>Crops Grown</Text>

        {/* Input to add new material */}
        <View style={styles.addMaterialRow}>
          <TextInput
            style={[styles.addMaterialInput, isSaving && styles.disabledInput]}
            placeholder="Enter crop name (e.g., Corn)"
            value={newRawMaterial}
            onChangeText={setNewRawMaterial}
            editable={!isSaving}
             placeholderTextColor="#888"
          />
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleAddRawMaterial}
            disabled={isSaving}
          >
            <FeatherIcon name="plus-circle" size={28} color={isSaving ? '#aaa' : '#0f9b6e'} />
          </TouchableOpacity>
        </View>

        {/* List of added materials */}
        {rawMaterialsList.length === 0 ? (
             <Text style={styles.noMaterialsText}>No crops added yet.</Text>
        ) : (
            rawMaterialsList.map((item, index) => (
              <View key={index} style={styles.materialItem}>
                <Text style={styles.materialText}>{item}</Text>
                <TouchableOpacity onPress={() => handleRemoveRawMaterial(index)} disabled={isSaving}>
                  <MaterialIcon name="delete-outline" size={22} color={isSaving ? '#aaa' : '#cc0000'} />
                </TouchableOpacity>
              </View>
            ))
        )}

        {/* Spacing before buttons */}
        <View style={{ height: 30 }} />

        {/* Save/Cancel Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.disabledButton]}
            onPress={saveProfileToFirestore}
            disabled={isSaving}
          >
            {isSaving ? (
                <ActivityIndicator size="small" color="#fff" />
            ) : (
                <Text style={styles.saveButtonText}>Save Changes</Text>
            )}
          </TouchableOpacity>
          {/* Cancel button is less important to disable, but can if needed */}
          <TouchableOpacity
            style={[styles.cancelButton, isSaving && styles.disabledButton]}
            onPress={() => navigation.goBack()}
            disabled={isSaving}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
         {/* Extra space at bottom of scroll view */}
         <View style={{ height: 50 }} />
      </ScrollView>
    </View>
  );
};

// --- Styles (Add styles for loading/disabled states) ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA', // Light background
    paddingHorizontal: 0, // Remove horizontal padding here, apply to inner content
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 50,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between', // Distribute space
    paddingHorizontal: 16, // Add padding back to header
    paddingBottom: 15, // Space below header
    paddingTop: 10, // Space above content
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff', // White header background
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600', // Semibold
    color: '#333',
    textAlign: 'center', // Ensure title is centered if placeholders are balanced
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: 20, // Add padding to the scrollable content area
    paddingTop: 10,
  },
  input: {
    backgroundColor: '#fff', // White input background
    borderWidth: 1,
    borderColor: '#CED4DA', // Standard border color
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 15,
    marginBottom: 16,
    fontSize: 16, // Slightly larger font
    color: '#495057', // Darker text
  },
  disabledInput: { // Style for disabled inputs during save
    backgroundColor: '#e9ecef', // Grey background
    borderColor: '#ced4da',
    color: '#6c757d', // Grey text
  },
  sectionTitle: {
    fontWeight: '600',
    fontSize: 18, // Slightly larger section titles
    marginBottom: 15, // More space below title
    marginTop: 15,
    color: '#343a40', // Darker title color
  },
  addMaterialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20, // More space below add row
  },
  addMaterialInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#CED4DA',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 15,
    fontSize: 16,
    marginRight: 10,
    color: '#495057',
  },
  addButton: {
    padding: 8, // Slightly larger touch area
  },
  materialItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff', // White background for items
    paddingVertical: 12, // More vertical padding
    paddingHorizontal: 15,
    borderRadius: 8,
    marginBottom: 10, // Space between items
    borderWidth: 1,
    borderColor: '#e9ecef', // Light border for items
  },
  materialText: {
    fontSize: 16,
    color: '#495057',
    flexShrink: 1, // Allow text to shrink if long
    marginRight: 10,
  },
   noMaterialsText: {
    fontStyle: 'italic',
    color: '#6c757d', // Standard grey text
    textAlign: 'center',
    marginVertical: 15, // More vertical space
 },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around', // Use space-around or space-between
    gap: 15,
    marginTop: 25,
    marginBottom: 40,
  },
  saveButton: {
    flex: 1, // Make buttons take equal width
    backgroundColor: '#28A745', // Standard success green
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center', // Center content (for activity indicator)
    minHeight: 50, // Ensure consistent height
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  cancelButton: {
    flex: 1, // Make buttons take equal width
    backgroundColor: '#6c757d', // Standard secondary grey
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 0, // Remove border if using solid grey background
    justifyContent: 'center',
    minHeight: 50,
  },
  cancelButtonText: {
    color: '#fff', // White text on grey button
    fontSize: 16,
    fontWeight: '500',
  },
   disabledButton: { // Combined style for disabled buttons
    opacity: 0.65,
    elevation: 0, // Remove shadow when disabled
    shadowOpacity: 0,
   }
});

export default FarmerProfileEdit;