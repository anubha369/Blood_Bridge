import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';

// Public Screens
import { SplashScreen } from '../screens/public/SplashScreen';
import { WelcomeScreen } from '../screens/public/WelcomeScreen';
import { LoginScreen } from '../screens/public/LoginScreen';
import { RegisterScreen } from '../screens/public/RegisterScreen';
import { ForgotPasswordScreen } from '../screens/public/ForgotPasswordScreen';
import { PrivacyPolicyScreen } from '../screens/public/PrivacyPolicyScreen';

// Tab Navigators
import { RequesterTabNavigator } from './RequesterTabNavigator';
import { DonorTabNavigator } from './DonorTabNavigator';

// Role-Guarded Admin Console
import { AdminOverviewScreen } from '../screens/admin/AdminOverviewScreen';

// Requester Detail Screens
import { RequestTrackingScreen } from '../screens/requester/RequestTrackingScreen';
import { DonorResponsesScreen } from '../screens/requester/DonorResponsesScreen';
import { SelectDonorScreen } from '../screens/requester/SelectDonorScreen';
import { ConfirmFulfillmentScreen } from '../screens/requester/ConfirmFulfillmentScreen';
import { BloodBankDirectoryScreen } from '../screens/requester/BloodBankDirectoryScreen';
import { CreateRequestScreen } from '../screens/requester/CreateRequestScreen';
import { NotificationsScreen } from '../screens/requester/NotificationsScreen';

// Donor Detail Screens
import { AvailabilityScreen } from '../screens/donor/AvailabilityScreen';
import { ConsentScreen } from '../screens/donor/ConsentScreen';
import { DonationConfirmationScreen } from '../screens/donor/DonationConfirmationScreen';
import { DonorProfileScreen } from '../screens/donor/DonorProfileScreen';
import { ContactRequestsScreen } from '../screens/donor/ContactRequestsScreen';

// Common Detail Screens
import { CreditWalletScreen } from '../screens/common/CreditWalletScreen';
import { AIAssistantScreen } from '../screens/ai/AIAssistantScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="Splash"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right'
      }}
    >
      {/* Public Flow */}
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />

      {/* Main Tab Portals */}
      <Stack.Screen name="RequesterMain" component={RequesterTabNavigator} />
      <Stack.Screen name="DonorMain" component={DonorTabNavigator} />
      <Stack.Screen name="AdminMain" component={AdminOverviewScreen} />

      {/* Requester Detail / Modal Screens */}
      <Stack.Screen name="RequestTracking" component={RequestTrackingScreen} />
      <Stack.Screen name="DonorResponses" component={DonorResponsesScreen} />
      <Stack.Screen name="SelectDonor" component={SelectDonorScreen} />
      <Stack.Screen name="ConfirmFulfillment" component={ConfirmFulfillmentScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="CreateRequest" component={CreateRequestScreen} />
      <Stack.Screen name="BloodBankDirectory" component={BloodBankDirectoryScreen} />

      {/* Donor Detail / Modal Screens */}
      <Stack.Screen name="Availability" component={AvailabilityScreen} />
      <Stack.Screen name="Consent" component={ConsentScreen} />
      <Stack.Screen name="DonationConfirmation" component={DonationConfirmationScreen} />
      <Stack.Screen name="DonorProfile" component={DonorProfileScreen} />
      <Stack.Screen name="ContactRequests" component={ContactRequestsScreen} />

      {/* Common Screens */}
      <Stack.Screen name="CreditWallet" component={CreditWalletScreen} />
      <Stack.Screen name="AIAssistant" component={AIAssistantScreen} />
    </Stack.Navigator>
  );
};

