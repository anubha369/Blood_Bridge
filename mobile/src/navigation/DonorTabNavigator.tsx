import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { DonorTabParamList } from './types';

// Screens
import { DonorDashboardScreen } from '../screens/donor/DonorDashboardScreen';
import { ContactRequestsScreen } from '../screens/donor/ContactRequestsScreen';
import { AIAssistantScreen } from '../screens/ai/AIAssistantScreen';
import { CreditWalletScreen } from '../screens/common/CreditWalletScreen';
import { ProfileScreen } from '../screens/common/ProfileScreen';

const Tab = createBottomTabNavigator<DonorTabParamList>();

export const DonorTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: THEME.colors.primary,
        tabBarInactiveTintColor: THEME.colors.navySubtle,
        tabBarStyle: {
          backgroundColor: THEME.colors.card,
          borderTopColor: THEME.colors.borderLight,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 6
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700'
        }
      }}
    >
      <Tab.Screen
        name="DonorDashboard"
        component={DonorDashboardScreen}
        options={{
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="heart" size={size} color={color} />
          )
        }}
      />
      <Tab.Screen
        name="ContactRequests"
        component={ContactRequestsScreen}
        options={{
          tabBarLabel: 'Requests',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles-outline" size={size} color={color} />
          )
        }}
      />
      <Tab.Screen
        name="CreditWallet"
        component={CreditWalletScreen}
        options={{
          tabBarLabel: 'Rewards',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="gift-outline" size={size} color={color} />
          )
        }}
      />
      <Tab.Screen
        name="AIAssistant"
        component={AIAssistantScreen}
        options={{
          tabBarLabel: 'AI Assistant',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="sparkles" size={size} color={color} />
          )
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          )
        }}
      />
    </Tab.Navigator>
  );
};

