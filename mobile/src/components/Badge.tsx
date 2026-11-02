import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { THEME } from '../constants/theme';

export type BadgeVariant =
  | 'critical'
  | 'urgent'
  | 'warning'
  | 'success'
  | 'info'
  | 'cooldown'
  | 'neutral'
  | 'brand';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({ label, variant = 'neutral', size = 'md' }) => {
  const getColors = () => {
    switch (variant) {
      case 'critical':
      case 'urgent':
        return { bg: THEME.colors.urgentBg, text: THEME.colors.urgent, border: '#FECACA' };
      case 'warning':
        return { bg: THEME.colors.warningBg, text: THEME.colors.warning, border: '#FDE68A' };
      case 'success':
        return { bg: THEME.colors.successBg, text: THEME.colors.success, border: '#BBF7D0' };
      case 'info':
        return { bg: THEME.colors.infoBg, text: THEME.colors.info, border: '#BFDBFE' };
      case 'cooldown':
        return { bg: THEME.colors.cooldownBg, text: THEME.colors.cooldown, border: '#FED7AA' };
      case 'brand':
        return { bg: THEME.colors.crimsonLight, text: THEME.colors.primary, border: THEME.colors.crimsonBorder };
      default:
        return { bg: '#F1F5F9', text: '#475569', border: '#E2E8F0' };
    }
  };

  const colors = getColors();

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: colors.bg, borderColor: colors.border },
        size === 'sm' && styles.badgeSm
      ]}
    >
      <Text
        style={[
          styles.text,
          { color: colors.text },
          size === 'sm' && styles.textSm
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: THEME.borderRadius.round,
    borderWidth: 1,
    alignSelf: 'flex-start'
  },
  badgeSm: {
    paddingHorizontal: 8,
    paddingVertical: 2
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  textSm: {
    fontSize: 10
  }
});

