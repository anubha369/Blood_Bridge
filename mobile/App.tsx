import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider } from './src/context/AuthContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { CONFIG } from './src/constants/config';
import { THEME } from './src/constants/theme';

const linking = {
  prefixes: [`${CONFIG.DEEP_LINK_SCHEME}://`, 'https://bloodbridge.org'],
  config: {
    screens: {
      Welcome: 'welcome',
      Login: 'login',
      Register: 'register',
      RequestTracking: 'requests/:requestId',
      DonorResponses: 'requests/:requestId/responses',
      ContactRequests: 'donor/requests',
      CreditWallet: 'wallet',
      BloodBankDirectory: 'blood-banks',
      PrivacyPolicy: 'privacy'
    }
  }
};

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer linking={linking}>
          <StatusBar style="dark" />
          <RootNavigator />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
