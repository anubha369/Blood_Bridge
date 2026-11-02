import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { THEME } from '../constants/theme';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: 'elevated' | 'outlined' | 'urgent';
  padding?: number;
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  variant = 'elevated',
  padding = THEME.spacing.base
}) => {
  return (
    <View
      style={[
        styles.card,
        { padding },
        variant === 'elevated' && THEME.shadows.sm,
        variant === 'outlined' && styles.outlined,
        variant === 'urgent' && styles.urgent,
        style
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.borderRadius.lg, // 16px (rounded-2xl)
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: THEME.spacing.md
  },
  outlined: {
    borderColor: THEME.colors.slate300,
    elevation: 0,
    shadowOpacity: 0
  },
  urgent: {
    borderColor: '#FECDD3',
    backgroundColor: '#FFF5F5',
    ...THEME.shadows.emergency
  }
});
