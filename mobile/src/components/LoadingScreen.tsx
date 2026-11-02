import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { THEME } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';

interface LoadingScreenProps {
  message?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = 'Connecting to BloodBridge Vision-X...'
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Ionicons name="heart" size={32} color={THEME.colors.primary} />
      </View>
      <ActivityIndicator size="large" color={THEME.colors.primary} style={styles.spinner} />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: THEME.colors.crimsonLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16
  },
  spinner: {
    marginBottom: 12
  },
  message: {
    fontSize: 14,
    color: THEME.colors.textMuted,
    fontWeight: '500',
    textAlign: 'center'
  }
});

