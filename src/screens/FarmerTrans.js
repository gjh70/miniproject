import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore';
import { useIsFocused } from '@react-navigation/native';

const FarmerTrans = ({ navigation }) => {
  const [internalActiveTab, setInternalActiveTab] = useState('Pending');
  const [farmerId, setFarmerId] = useState(null);
  const [pendingLoans, setPendingLoans] = useState([]);
  const [historyLoans, setHistoryLoans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const isFocused = useIsFocused();

  useEffect(() => {
    const getFarmerId = async () => {
      try {
        const id = await AsyncStorage.getItem('loggedInUserId');
        if (id) {
          setFarmerId(id);
        } else {
          throw new Error("User ID not found.");
        }
      } catch (e) {
        console.error("Failed to get farmer ID:", e);
        setError("Could not identify user. Please log in again.");
        Alert.alert("Error", "Could not identify user. Please log in again.", [
          { text: "OK", onPress: () => navigation.replace('FarmerLogin') }
        ]);
      }
    };
    getFarmerId();
  }, [navigation]);

  const fetchLoans = useCallback(async () => {
    if (!farmerId) return;

    setIsLoading(true);
    setError(null);
    console.log(`Fetching loans for farmer ID: ${farmerId}`);

    try {
      const pendingSnapshot = await firestore()
        .collection('Farmers')
        .doc(farmerId)
        .collection('Loans')
        .where('status', '==', 'Pending')
        .get();

      const pending = pendingSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPendingLoans(pending);
      console.log(`Fetched ${pending.length} pending loans.`);

      const historySnapshot = await firestore()
        .collection('Farmers')
        .doc(farmerId)
        .collection('Loans')
        .where('status', '!=', 'Pending')
        .get();

      const history = historySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setHistoryLoans(history);
      console.log(`Fetched ${history.length} history loans.`);

    } catch (e) {
      console.error("Error fetching loans:", e);
      setError("Failed to load loan data. Please try again later.");
      Alert.alert("Error", "Failed to load loan data.");
      setPendingLoans([]);
      setHistoryLoans([]);
    } finally {
      setIsLoading(false);
    }
  }, [farmerId]);

  useEffect(() => {
    if (isFocused && farmerId) {
      fetchLoans();
    }
  }, [isFocused, farmerId, fetchLoans]);

  const renderLoanItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>Crop: {item.cropCultivated || 'N/A'}</Text>
        <Text style={styles.cardDetail}>Amount: ₹{item.loanAmount?.toLocaleString() || 'N/A'}</Text>
        <Text style={styles.cardDetail}>Status: {item.status || 'N/A'}</Text>
        {item.createdAt?.toDate && (
          <Text style={styles.cardDate}>
            Applied: {item.createdAt.toDate().toLocaleDateString()}
          </Text>
        )}
        {item.approvedAt?.toDate && item.status === 'Approved' && (
          <Text style={styles.cardDate}>
            Approved: {item.approvedAt.toDate().toLocaleDateString()}
          </Text>
        )}
      </View>
      <TouchableOpacity
        style={styles.detailsButton}
        onPress={() => {
          const details = [
            `Loan ID: ${item.id}`,
            `Crop: ${item.cropCultivated || 'N/A'}`,
            `Amount: ₹${item.loanAmount?.toLocaleString() || 'N/A'}`,
            `Status: ${item.status || 'N/A'}`,
            `Applied: ${item.createdAt?.toDate().toLocaleDateString() || 'N/A'}`,
            item.status === 'Approved' && item.approvedAt ? `Approved: ${item.approvedAt.toDate().toLocaleDateString()}` : null
          ].filter(Boolean).join('\n');
          Alert.alert('Loan Details', details);
        }}
      >
        <Text style={styles.detailsText}>Details</Text>
      </TouchableOpacity>
    </View>
  );

  const renderContent = () => {
    if (isLoading) {
      return <ActivityIndicator size="large" color="green" style={styles.loader} />;
    }
    if (error) {
      return <Text style={styles.errorText}>{error}</Text>;
    }

    const dataToShow = internalActiveTab === 'Pending' ? pendingLoans : historyLoans;
    const emptyMessage = internalActiveTab === 'Pending'
      ? "You have no pending loan applications."
      : "You have no loan application history.";

    if (dataToShow.length === 0) {
      return <Text style={styles.emptyText}>{emptyMessage}</Text>;
    }

    return (
      <FlatList
        data={dataToShow}
        keyExtractor={(item) => item.id}
        renderItem={renderLoanItem}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{width: 24}} />
        <Text style={styles.headerTitle}>Loan Applications</Text>
        <View style={{width: 24}} />
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, internalActiveTab === 'Pending' && styles.activeTabButton]}
          onPress={() => setInternalActiveTab('Pending')}
        >
          <Text style={[styles.tabText, internalActiveTab === 'Pending' && styles.activeTabText]}>Pending</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, internalActiveTab === 'History' && styles.activeTabButton]}
          onPress={() => setInternalActiveTab('History')}
        >
          <Text style={[styles.tabText, internalActiveTab === 'History' && styles.activeTabText]}>History</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.contentArea}>
        {renderContent()}
      </View>

      <View style={styles.bottomNav}>
        {[
          { name: 'Home', icon: 'home', screen: 'FarmerHome' },
          { name: 'Transaction', icon: 'account-balance-wallet', screen: 'FarmerTrans' },
          { name: 'Profile', icon: 'person-outline', screen: 'FarmerProfile' },
          { name: 'Help', icon: 'help-outline', screen: 'FarmerHelp' },
        ].map((tab) => {
          const isTabActive = navigation.getState()?.routes[navigation.getState()?.index]?.name === tab.screen;
          return (
            <TouchableOpacity
              key={tab.name}
              style={styles.navItem}
              onPress={() => {
                if (!isTabActive) {
                  navigation.navigate(tab.screen);
                }
              }}
            >
              <Icon
                name={tab.icon}
                size={28}
                color={isTabActive ? 'green' : 'gray'}
              />
              <Text
                style={[styles.navText, isTabActive && styles.activeNavText]}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 50,
    paddingBottom: 15,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTabButton: {
    borderBottomColor: 'green',
  },
  tabText: {
    fontSize: 16,
    color: 'gray',
    fontWeight: '500',
  },
  activeTabText: {
    color: 'green',
    fontWeight: '600',
  },
  contentArea: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  loader: {
    marginTop: 50,
  },
  errorText: {
    textAlign: 'center',
    marginTop: 50,
    color: 'red',
    fontSize: 16,
    paddingHorizontal: 20,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    color: '#666',
    fontSize: 16,
  },
  listContainer: {
    paddingBottom: 70,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  cardContent: { flex: 1, marginRight: 10 },
  cardTitle: { fontWeight: '600', fontSize: 16, color: '#333', marginBottom: 4 },
  cardDetail: { fontSize: 14, color: '#555', marginBottom: 2 },
  cardDate: { fontSize: 12, color: '#888', marginTop: 4 },
  detailsButton: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#A5D6A7',
  },
  detailsText: { color: '#1B5E20', fontSize: 12, fontWeight: 'bold' },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 25 : 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  navItem: { alignItems: 'center', flex: 1, paddingVertical: 5 },
  navText: { fontSize: 11, color: 'gray', marginTop: 3 },
  activeNavText: { color: 'green', fontWeight: '600' },
});

export default FarmerTrans;