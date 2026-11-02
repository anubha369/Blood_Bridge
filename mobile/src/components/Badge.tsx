import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';

export type BadgeVariant =
  | 'critical'
  | 'urgent'
  | 'warning'
  | 'success'
  | 'info'
  | 'cooldown'
  | 'neutral'
  | 'brand'
  | 'verified';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  icon?: keyof typeof Ionicons.glyphMap;
}

export const Badge: React.FC<BadgeProps> = ({ label, variant = 'neutral', size = 'md', icon }) => {
  const getColors = () => {
    switch (variant) {
      case 'verified':
      case 'success':
        return { bg: THEME.colors.successBg, text: THEME.colors.successText, border: THEME.colors.successBorder };
      case 'critical':
      case 'urgent':
        return { bg: THEME.colors.urgentBg, text: THEME.colors.urgent, border: THEME.colors.primaryBorder };
      case 'warning':
        return { bg: THEME.colors.warningBg, text: THEME.colors.warningText, border: THEME.colors.warningBorder };
      case 'info':
        return { bg: THEME.colors.infoBg, text: THEME.colors.infoText, border: THEME.colors.infoBorder };
      case 'cooldown':
        return { bg: THEME.colors.cooldownBg, text: THEME.colors.cooldown, border: '#FED7AA' };
      case 'brand':
        return { bg: THEME.colors.primaryLight, text: THEME.colors.primary, border: THEME.colors.primaryBorder };
      default:
        return { bg: THEME.colors.slate100, text: THEME.colors.slate700, border: THEME.colors.slate200 };
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
      {icon && (
        <Ionicons
          name={icon}
          size={size === 'sm' ? 12 : 14}
          color={colors.text}
          style={styles.icon}
        />
      )}
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: THEME.borderRadius.round,
    borderWidth: 1,
    alignSelf: 'flex-start'
  },
  badgeSm: {
    paddingHorizontal: 8,
    paddingVertical: 2.5
  },
  icon: {
    marginRight: 4
  },
  text: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3
  },
  textSm: {
    fontSize: 10.5
  }
});
