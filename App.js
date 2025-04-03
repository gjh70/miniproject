import React from 'react';
import '@react-native-firebase/app';

import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import LoginScreen from './src/screens/LoginScreen.js';
import IndustryHome from './src/screens/IndustryHome.js';
import FarmerHome from './src/screens/FarmerHome.js';
import IndustryTrans from './src/screens/IndustryTrans.js';
import FarmerTrans from './src/screens/FarmerTrans.js';
import IndustryHelp from './src/screens/IndustryHelp.js';
import FarmerHelp from './src/screens/FarmerHelp.js';
import IndustryProfile from './src/screens/IndustryProfile.js';
import FarmerProfile from './src/screens/FarmerProfile.js';
import IndustryProfileEdit from './src/screens/IndustryProfileEdit.js';
import FarmerProfileEdit from './src/screens/FarmerProfileEdit.js';
import IndustryMaterial from './src/screens/IndustryMaterial.js';
import FarmerMaterial from './src/screens/FarmerMaterial.js';
import FarmerSignin from './src/screens/FarmerSignin.js';
import IndustrySignin from './src/screens/IndustrySignin.js';
import FarmerLogin from './src/screens/FarmerLogin.js';
import IndustryLogin from './src/screens/IndustryLogin.js';
import Farmerinfo from './src/screens/Farmerinfo.js';
import LoanApplication from './src/screens/LoanApplication.js';

const Stack = createStackNavigator();

const App = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{headerShown: false}}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="IndustryHome" component={IndustryHome} />
        <Stack.Screen name="FarmerHome" component={FarmerHome} />
        <Stack.Screen name="FarmerTrans" component={FarmerTrans} />
        <Stack.Screen name="IndustryTrans" component={IndustryTrans} />
        <Stack.Screen name="IndustryHelp" component={IndustryHelp} />
        <Stack.Screen name="FarmerHelp" component={FarmerHelp} />
        <Stack.Screen name="IndustryProfile" component={IndustryProfile} />
        <Stack.Screen name="FarmerProfile" component={FarmerProfile} />
        <Stack.Screen name="IndustryProfileEdit"component={IndustryProfileEdit}/>
        <Stack.Screen name="FarmerProfileEdit" component={FarmerProfileEdit} />
        <Stack.Screen name="IndustryMaterial" component={IndustryMaterial} />
        <Stack.Screen name="FarmerMaterial" component={FarmerMaterial} />
        <Stack.Screen name="IndustrySignin" component={IndustrySignin} />
        <Stack.Screen name="FarmerSignin" component={FarmerSignin} />
        <Stack.Screen name="FarmerLogin" component={FarmerLogin} />
        <Stack.Screen name="IndustryLogin" component={IndustryLogin} />
        <Stack.Screen name="Farmerinfo" component={Farmerinfo} />
        <Stack.Screen name="LoanApplication" component={LoanApplication} />

      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;
