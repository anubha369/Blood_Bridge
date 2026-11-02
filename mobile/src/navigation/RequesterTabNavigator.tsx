import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { RequesterTabParamList } from './types';

// Screens
import { RequesterDashboardScreen } from '../screens/requester/RequesterDashboardScreen';
import { CreateRequestScreen } from '../screens/requester/CreateRequestScreen';
import { BloodBankDirectoryScreen } from '../screens/requester/BloodBankDirectoryScreen';
import { AIAssistantScreen } from '../screens/ai/AIAssistantScreen';
import { ProfileScreen } from '../screens/common/ProfileScreen';

const Tab = createBottomTabNavigator<RequesterTabParamList>();

export const RequesterTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: THEME.colors.primary,
        tabBarInactiveTintColor: THEME.colors.slate400,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: THEME.colors.border,
          borderTopWidth: 1,
          height: 62,
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
        name="RequesterDashboard"
        component={RequesterDashboardScreen}
        options={{
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="pulse" size={size} color={color} />
          )
        }}
      />
      <Tab.Screen
        name="CreateRequest"
        component={CreateRequestScreen}
        options={{
          tabBarLabel: 'New Request',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="add-circle" size={size + 2} color={color} />
          )
        }}
      />
      <Tab.Screen
        name="BloodBankDirectory"
        component={BloodBankDirectoryScreen}
        options={{
          tabBarLabel: 'Blood Banks',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="business-outline" size={size} color={color} />
          )
        }}
      />
      <Tab.Screen
        name="AIAssistant"
        component={AIAssistantScreen}
        options={{
          tabBarLabel: 'Clinical AI',
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
