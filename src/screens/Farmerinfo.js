import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const Farmerinfo = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('Home');

  const handleConnect = () => {
    alert('Connect Farmer button pressed!');
  };

  return (
  <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
  <TouchableOpacity onPress={() => navigation.goBack()}>
    <Icon name="arrow-back" size={24} color="black" />
  </TouchableOpacity>
  <Text style={styles.headerTitle}>Farmer Details</Text>
  <Icon name="bar-chart" size={24} color="black" />
</View>


      <ScrollView contentContainerStyle={styles.content}>
        {/* Farmer Image */}
       

        <Text style={styles.imageCaption}>Farmer Profile</Text>

        {/* Crops Produced */}
        <Text style={styles.sectionTitle}>Crops Produced</Text>
        <Text style={styles.text}>Wheat - 15 tons</Text>
        <Text style={styles.text}>Rice - 12 tons</Text>
        <Text style={styles.text}>Corn - 8 tons</Text>

        {/* Farmer Contact Info */}
        <Text style={styles.sectionTitle}>Farmer Contact</Text>
        <Text style={styles.text}>Email: farmer.contact@example.com</Text>
        <Text style={styles.text}>Phone: +19876543210</Text>
        <Text style={styles.text}>Location: Village XYZ, District ABC</Text>

        {/* Connect Button */}
        <TouchableOpacity style={styles.button} onPress={handleConnect}>
          <Text style={styles.buttonText}>🔗 Connect Farmer</Text>
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
            <Icon name={tab.icon} size={28} color={activeTab === tab.name ? 'green' : 'gray'} />
            <Text style={[styles.navText, activeTab === tab.name && styles.activeNavText]}>
              {tab.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};



const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  image: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    marginBottom: 8,
  },
  imageCaption: {
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '500',
  },
  sectionTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    marginTop: 12,
    marginBottom: 4,
  },
  text: {
    fontSize: 14,
    marginBottom: 4,
  },
  button: {
    backgroundColor: '#006400',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#fff',
    position: 'absolute',
    bottom: 0,
    width: '100%',
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
    fontWeight: '600',
  },
});
export default Farmerinfo;