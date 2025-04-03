import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import FeatherIcon from 'react-native-vector-icons/Feather';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';

const AddRawMaterialScreen = () => {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState('AddRawMaterial');

  const [materialName, setMaterialName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [description, setDescription] = useState('');

  const handleAddMaterial = () => {
    // You can handle submission logic here (API call, form validation, etc.)
    console.log('Material Added:', {
      materialName,
      quantity,
      description,
    });

    // Clear form
    setMaterialName('');
    setQuantity('');
    setDescription('');
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <FeatherIcon name="arrow-left" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Raw Material</Text>
        <FeatherIcon name="plus" size={22} />
      </View>

      <ScrollView style={styles.formContainer}>
        {/* Material Name */}
        <TextInput
          style={styles.input}
          placeholder="Raw Material Name"
          value={materialName}
          onChangeText={setMaterialName}
        />

        {/* Quantity */}
        <TextInput
          style={styles.input}
          placeholder="Quantity (e.g. 50kg)"
          value={quantity}
          onChangeText={setQuantity}
        />

        {/* Description */}
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Description"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
        />

        {/* Add Button */}
        <TouchableOpacity style={styles.addButton} onPress={handleAddMaterial}>
          <Text style={styles.addButtonText}>Add Material</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Bottom Navigation Bar */}
      <View style={styles.bottomNav}>
        {[
          { name: 'Home', icon: 'home', screen: 'IndustryHome' },
          { name: 'Transaction', icon: 'account-balance-wallet', screen: 'IndustryTrans' },
          { name: 'Profile', icon: 'person-outline', screen: 'IndustryProfile' },
          { name: 'Help', icon: 'help-outline', screen: 'IndustryHelp' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.name}
            style={styles.navItem}
            onPress={() => {
              setActiveTab(tab.name);
              navigation.navigate(tab.screen);
            }}
          >
            <MaterialIcon
              name={tab.icon}
              size={28}
              color={activeTab === tab.name ? 'green' : 'gray'}
            />
            <Text
              style={[
                styles.navText,
                activeTab === tab.name && styles.activeNavText,
              ]}
            >
              {tab.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

export default AddRawMaterialScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 48,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  formContainer: {
    flex: 1,
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    fontSize: 14,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  addButton: {
    backgroundColor: '#0f9b6e',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderColor: '#eee',
    paddingVertical: 10,
  },
  navItem: {
    alignItems: 'center',
  },
  navText: {
    fontSize: 12,
    color: 'gray',
  },
  activeNavText: {
    color: 'green',
    fontWeight: 'bold',
  },
});
