import React, {useState} from 'react';
import {View, Text, Image, TouchableOpacity, StyleSheet} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

const LoginScreen = ({navigation}) => {
  const [selectedRole, setSelectedRole] = useState(null);

  return (
    <LinearGradient
      colors={['rgba(0,0,0,0.7)', 'rgba(0,0,0,0.3)']}
      style={styles.container}>
      <Image
        source={require('../../src/assets/background.png')}
        style={styles.backgroundImage}
      />

      <View style={styles.logoContainer}>
        <Image source={require('../assets/logo.png')} style={styles.logo} />
        <Text style={styles.title}>AgriConnect</Text>
        <Text style={styles.subtitle}>
          Connect with agriculture and industry{'\n'}in one place.
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        {/* Farmer Login Button */}
        <TouchableOpacity
          style={[
            styles.button,
            selectedRole === 'farmer'
              ? styles.selectedButton
              : styles.defaultButton,
          ]}
          onPress={() => {
            setSelectedRole('farmer');
            navigation.navigate('FarmerSignin');
          }}>
          <Text
            style={[
              styles.buttonText,
              selectedRole === 'farmer'
                ? styles.selectedText
                : styles.defaultText,
            ]}>
            Farmer Login
          </Text>
        </TouchableOpacity>

        {/* Industry Login Button */}
        <TouchableOpacity
          style={[
            styles.button,
            selectedRole === 'industry'
              ? styles.selectedButton
              : styles.defaultButton,
          ]}
          onPress={() => {
            setSelectedRole('industry');
            navigation.navigate('IndustrySignin');
          }}>
          <Text
            style={[
              styles.buttonText,
              selectedRole === 'industry'
                ? styles.selectedText
                : styles.defaultText,
            ]}>
            Industry Login
          </Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  backgroundImage: {position: 'absolute', width: '100%', height: '100%'},
  logoContainer: {alignItems: 'center', marginBottom: 20},
  logo: {width: 80, height: 80, marginBottom: 10},
  title: {fontSize: 24, fontWeight: 'bold', color: 'white'},
  subtitle: {
    fontSize: 14,
    color: 'white',
    textAlign: 'center',
    marginVertical: 10,
  },
  buttonContainer: {marginTop: 20},
  button: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
    width: 200,
  },
  defaultButton: {
    borderColor: 'white',
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  selectedButton: {
    backgroundColor: '#2E7D32',
    borderWidth: 0,
  },
  buttonText: {fontSize: 16, fontWeight: 'bold'},
  defaultText: {color: 'white'},
  selectedText: {color: 'white'},
});

export default LoginScreen;
