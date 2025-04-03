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
  ActivityIndicator,
} from 'react-native';
import FeatherIcon from 'react-native-vector-icons/Feather';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore';

// Consistent Nav Tabs definition
const NAV_TABS = [
  { name: 'Home', icon: 'home', screen: 'IndustryHome' },
  { name: 'Transaction', icon: 'account-balance-wallet', screen: 'IndustryTrans' },
  { name: 'Profile', icon: 'person-outline', screen: 'IndustryProfile' },
  { name: 'Help', icon: 'help-outline', screen: 'IndustryHelp' },
];

const IndustryProfileEdit = () => {
  const navigation = useNavigation();

  // State Corrections
  const [industryId, setIndustryId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // State for profile form details
  const [form, setForm] = useState({
    name: '',
    location: '',
    contact: '',
  });

  // State for the dynamic list of raw materials required/handled by the industry
  const [rawMaterialsList, setRawMaterialsList] = useState([]);
  // State for the input field to add a new raw material
  const [newRawMaterial, setNewRawMaterial] = useState('');

  // Effects

  // Effect 1: Fetch Industry ID and Profile Data on Load
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setIndustryId(null);
      setForm({ name: '', location: '', contact: '' });
      setRawMaterialsList([]);

      let fetchedIndustryId = null;
      try {
        fetchedIndustryId = await AsyncStorage.getItem('loggedInUserId');

        if (fetchedIndustryId) {
          setIndustryId(fetchedIndustryId);
          console.log("IndustryProfileEdit: Logged in with Industry ID:", fetchedIndustryId);

          const industryDocRef = firestore().collection('Industries').doc(fetchedIndustryId);
          const industryDoc = await industryDocRef.get();

          if (industryDoc.exists) {
            console.log("Existing industry profile found.");
            const data = industryDoc.data();
            setForm({
              name: data.name || '',
              location: data.location || '',
              contact: data.contact || '',
            });
            setRawMaterialsList(Array.isArray(data.rawMaterials) ? data.rawMaterials : []);
          } else {
            console.log(`No profile found for industry ID: ${fetchedIndustryId}. Starting fresh.`);
          }
        } else {
          console.error('IndustryProfileEdit: No loggedInUserId found in AsyncStorage.');
          Alert.alert('Session Error', 'Could not identify your session. Please log in again.');
          setTimeout(() => navigation.replace('IndustryLogin'), 0);
        }
      } catch (error) {
        console.error('Error fetching industry data:', error);
        Alert.alert('Error', 'Failed to load profile data. Please check your connection and try again.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [navigation]);

  // Raw Material Handlers

  const handleAddRawMaterial = () => {
    const trimmedMaterial = newRawMaterial.trim();
    if (trimmedMaterial === '') {
      return;
    }
    if (rawMaterialsList.some(mat => mat.toLowerCase() === trimmedMaterial.toLowerCase())) {
      Alert.alert('Duplicate', `'${trimmedMaterial}' is already in the list.`);
      return;
    }

    setRawMaterialsList(prevList => [...prevList, trimmedMaterial]);
    setNewRawMaterial('');
  };

  const handleRemoveRawMaterial = (indexToRemove) => {
    setRawMaterialsList(prevList => prevList.filter((_, index) => index !== indexToRemove));
  };

  // Save Profile Function

  const saveProfileToFirestore = async () => {
    if (!industryId) {
      Alert.alert('Error', 'Cannot save profile. Your session seems invalid. Please try logging in again.');
      return;
    }
    if (!form.name.trim() || !form.location.trim() || !form.contact.trim()) {
      Alert.alert('Missing Information', 'Please fill in the industry name, location, and contact details.');
      return;
    }

    setIsLoading(true);
    console.log(`Saving profile for industry ID: ${industryId}`);
    try {
      const industryDocRef = firestore().collection('Industries').doc(industryId);

      const profileData = {
        name: form.name.trim(),
        location: form.location.trim(),
        contact: form.contact.trim(),
        rawMaterials: rawMaterialsList,
        lastUpdated: firestore.FieldValue.serverTimestamp(),
      };

      await industryDocRef.set(profileData, { merge: true });

      console.log("Profile successfully updated/created in Firestore.");
      Alert.alert('Success', 'Profile updated successfully!');
      navigation.goBack();
    } catch (error) {
      console.error('Error updating industry profile:', error);
      if (error.code === 'permission-denied') {
        Alert.alert('Permission Denied', 'You do not have permission to save this profile. Check Firestore rules.');
      } else {
        Alert.alert('Save Error', 'Failed to update profile. Please check your connection and try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Render Logic

  if (isLoading && !industryId) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0f9b6e" />
        <Text style={styles.loadingText}>Loading Profile Data...</Text>
      </View>
    );
  }

  const getCurrentRouteName = () => {
    try {
      return navigation.getState()?.routes[navigation.getState()?.index]?.name;
    } catch (e) {
      console.error("Could not get navigation state:", e);
      return null;
    }
  };
  const currentRouteName = getCurrentRouteName();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} disabled={isLoading}>
          <FeatherIcon name="arrow-left" size={24} color={isLoading ? '#aaa' : '#333'} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Industry Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.formContainer}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {isLoading && industryId && <ActivityIndicator style={styles.inlineLoader} size="small" color="#0f9b6e" />}

        {/* Profile Details Inputs */}
        <Text style={styles.sectionTitle}>Industry Details</Text>
        <View style={styles.inputWrapper}>
          <FeatherIcon name="briefcase" size={18} color="#888" style={styles.inputIcon} />
          <TextInput
            style={[styles.input, isLoading && styles.disabledInput]}
            placeholder="Industry Name"
            value={form.name}
            onChangeText={(text) => setForm({ ...form, name: text })}
            editable={!isLoading}
            placeholderTextColor="#888"
          />
        </View>
        <View style={styles.inputWrapper}>
          <FeatherIcon name="map-pin" size={18} color="#888" style={styles.inputIcon} />
          <TextInput
            style={[styles.input, isLoading && styles.disabledInput]}
            placeholder="Location (e.g., City, State)"
            value={form.location}
            onChangeText={(text) => setForm({ ...form, location: text })}
            editable={!isLoading}
            placeholderTextColor="#888"
          />
        </View>
        <View style={styles.inputWrapper}>
          <FeatherIcon name="phone" size={18} color="#888" style={styles.inputIcon} />
          <TextInput
            style={[styles.input, isLoading && styles.disabledInput]}
            placeholder="Contact (Phone or Email)"
            value={form.contact}
            onChangeText={(text) => setForm({ ...form, contact: text })}
            keyboardType={form.contact.includes('@') ? 'email-address' : 'phone-pad'}
            autoCapitalize="none"
            editable={!isLoading}
            placeholderTextColor="#888"
          />
        </View>

        {/* Raw Materials Section */}
        <Text style={styles.sectionTitle}>Raw Materials Handled</Text>

        {/* Input to add new material */}
        <View style={styles.addMaterialRow}>
          <TextInput
            style={[styles.addMaterialInput, isLoading && styles.disabledInput]}
            placeholder="Add material..."
            value={newRawMaterial}
            onChangeText={setNewRawMaterial}
            editable={!isLoading}
            onSubmitEditing={handleAddRawMaterial}
            placeholderTextColor="#888"
          />
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleAddRawMaterial}
            disabled={isLoading || !newRawMaterial.trim()}
          >
            <FeatherIcon name="plus-circle" size={30} color={(isLoading || !newRawMaterial.trim()) ? '#ccc' : '#0f9b6e'} />
          </TouchableOpacity>
        </View>

        {/* List of added materials */}
        {rawMaterialsList.length === 0 && !isLoading && (
          <Text style={styles.noMaterialsText}>No raw materials added yet.</Text>
        )}
        {rawMaterialsList.map((item, index) => (
          <View key={index} style={styles.materialItem}>
            <MaterialIcon name="inventory" size={18} color="#555" style={styles.materialIcon} />
            <Text style={styles.materialText}>{item}</Text>
            <TouchableOpacity onPress={() => handleRemoveRawMaterial(index)} disabled={isLoading}>
              <MaterialIcon name="delete" size={22} color={isLoading ? '#aaa' : '#e74c3c'} />
            </TouchableOpacity>
          </View>
        ))}

        {/* Spacing before action buttons */}
        <View style={{ height: 30 }} />

        {/* Save/Cancel Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.cancelButton, isLoading && styles.disabledButton]}
            onPress={() => navigation.goBack()}
            disabled={isLoading}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveButton, isLoading && styles.disabledButton]}
            onPress={saveProfileToFirestore}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Extra space at the bottom of scroll view */}
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Bottom Navigation Bar */}
      <View style={styles.bottomNav}>
        {NAV_TABS.map((tab) => {
          let isTabActive = false;
          try {
            isTabActive = navigation.getState()?.routes[navigation.getState()?.index]?.name === tab.screen;
          } catch (e) {
            console.warn("Could not determine active tab for bottom nav:", e);
          }
          return (
            <TouchableOpacity
              key={tab.name}
              style={styles.navItem}
              onPress={() => !isTabActive && !isLoading && navigation.navigate(tab.screen)}
              disabled={isLoading}
            >
              <MaterialIcon
                name={tab.icon}
                size={28}
                color={isTabActive ? 'green' : isLoading ? '#aaa' : 'gray'}
              />
              <Text
                style={[
                  styles.navText,
                  isTabActive && styles.activeNavText,
                  isLoading && { color: '#aaa' },
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

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#555',
  },
  inlineLoader: {
    marginVertical: 10,
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 5 : 50,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '600',
    color: '#333',
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CED4DA',
    borderRadius: 8,
    marginBottom: 16,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: '#333',
  },
  disabledInput: {
    color: '#888',
  },
  sectionTitle: {
    fontWeight: '600',
    fontSize: 17,
    marginBottom: 15,
    marginTop: 20,
    color: '#444',
  },
  addMaterialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CED4DA',
    borderRadius: 8,
    paddingLeft: 15,
  },
  addMaterialInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    marginRight: 10,
    color: '#333',
  },
  addButton: {
    padding: 10,
    marginLeft: 5,
  },
  materialItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    elevation: 1,
  },
  materialIcon: {
    marginRight: 12,
    color: '#0f9b6e',
  },
  materialText: {
    fontSize: 15,
    color: '#333',
    flex: 1,
    marginRight: 10,
  },
  noMaterialsText: {
    fontStyle: 'italic',
    color: '#888',
    textAlign: 'center',
    paddingVertical: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15,
    marginTop: 25,
    marginBottom: 20,
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#28a745',
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
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CED4DA',
    minHeight: 50,
  },
  cancelButtonText: {
    color: '#555',
    fontSize: 16,
    fontWeight: '500',
  },
  disabledButton: {
    opacity: 0.6,
    elevation: 0,
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderColor: '#E0E0E0',
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 25 : 10,
    elevation: 8,
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
});

export default IndustryProfileEdit;