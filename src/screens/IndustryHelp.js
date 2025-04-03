import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';

const IndustryHelp = () => {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState('Help');
  const [searchQuery, setSearchQuery] = useState('');

  // Existing industry-specific FAQ data
  const faqs = [
   
    {
      question: 'How can I view my transaction history?',
      answer: 'Navigate to the Transaction tab, where you can see all past and pending transactions with farmers.',
    },
    
    {
      question: 'How do I update my industry profile?',
      answer: 'Access the Profile tab, tap "Edit Profile," and update your name, location, contact, and raw materials handled.',
    },
    {
      question:'How do I review loan applications?',
      answer:'Go to the Home tab. You can view applications submitted by farmers. Based on the information, you can approve or reject the application.'
    },
  ];

  // Filter FAQs based on search query (unchanged)
  const filteredFaqs = faqs.filter((faq) =>
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Search Input */}
      <View style={styles.searchBox}>
        <Feather name="search" size={20} color="#777" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search FAQs"
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={(text) => setSearchQuery(text)}
        />
      </View>

      <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
        {/* FAQs */}
        <Text style={styles.sectionHeading}>Frequently Asked Questions</Text>

        {filteredFaqs.length > 0 ? (
          filteredFaqs.map((faq, index) => (
            <View key={index} style={styles.faqItem}>
              <Text style={styles.faqQuestion}>{faq.question}</Text>
              <Text style={styles.faqAnswer}>{faq.answer}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.noResultsText}>No matching FAQs found.</Text>
        )}

        {/* Contact Information */}
        <Text style={styles.sectionHeading}>Contact Us</Text>
        <View style={styles.contactInfo}>
          <View style={styles.contactItem}>
            <MaterialIcons name="email" size={22} color="#0f9b6e" style={styles.contactIcon} />
            <Text style={styles.contactText}>support@agriconnect.com</Text>
          </View>
          <View style={styles.contactItem}>
            <MaterialIcons name="call" size={22} color="#0f9b6e" style={styles.contactIcon} />
            <Text style={styles.contactText}>+91 9830462302</Text>
          </View>
        </View>
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
            <Icon
              name={tab.icon}
              size={28}
              color={activeTab === tab.name ? '#0f9b6e' : 'gray'}
            />
            <Text
              style={[styles.navText, activeTab === tab.name && styles.activeNavText]}
            >
              {tab.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

// FAQ Item Component (unchanged but included for completeness)
const FAQItem = ({ question, answer }) => (
  <View style={styles.faqItem}>
    <Text style={styles.faqQuestion}>{question}</Text>
    <Text style={styles.faqAnswer}>{answer}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingTop: Platform.OS === 'android' ? 40 : 50,
    paddingHorizontal: 20,
    backgroundColor: '#0f9b6e',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  headerSpacer: {
    width: 40,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 15,
    marginHorizontal: 15,
    marginVertical: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: 10,
  },
  scrollArea: {
    flex: 1,
    paddingHorizontal: 15,
  },
  sectionHeading: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 15,
    letterSpacing: 0.3,
  },
  faqItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  faqAnswer: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  noResultsText: {
    fontSize: 16,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 20,
  },
  contactInfo: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  contactIcon: {
    marginRight: 12,
  },
  contactText: {
    fontSize: 16,
    color: '#444',
    fontWeight: '500',
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderColor: '#e0e0e0',
    paddingVertical: 8,
    backgroundColor: '#fff',
    paddingBottom: Platform.OS === 'ios' ? 25 : 10,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  navText: {
    fontSize: 11,
    color: 'gray',
    marginTop: 3,
  },
  activeNavText: {
    color: '#0f9b6e',
    fontWeight: '600',
  },
});

export default IndustryHelp;