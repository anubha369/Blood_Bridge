import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle
} from 'react-native';
import { THEME } from '../constants/theme';

export type ButtonVariant = 'primary' | 'crimson' | 'secondary' | 'outline' | 'danger' | 'ghost';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  style,
  textStyle
}) => {
  const isDisabled = disabled || loading;

  const getContainerStyle = () => {
    switch (variant) {
      case 'crimson':
        return { backgroundColor: THEME.colors.crimson };
      case 'secondary':
        return { backgroundColor: THEME.colors.navy };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          borderColor: THEME.colors.primary
        };
      case 'danger':
        return { backgroundColor: THEME.colors.urgent };
      case 'ghost':
        return { backgroundColor: 'transparent' };
      case 'primary':
      default:
        return { backgroundColor: THEME.colors.primary };
    }
  };

  const getTextColor = () => {
    if (variant === 'outline' || variant === 'ghost') {
      return THEME.colors.primary;
    }
    return THEME.colors.textInverse;
  };

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      disabled={isDisabled}
      style={[
        styles.base,
        getContainerStyle(),
        size === 'sm' && styles.sizeSm,
        size === 'lg' && styles.sizeLg,
        isDisabled && styles.disabled,
        style
      ]}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} size="small" />
      ) : (
        <>
          {icon && <>{icon}</>}
          <Text
            style={[
              styles.text,
              { color: getTextColor() },
              icon ? { marginLeft: 8 } : {},
              size === 'sm' && styles.textSm,
              size === 'lg' && styles.textLg,
              textStyle
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: THEME.borderRadius.md,
    ...THEME.shadows.sm
  },
  sizeSm: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: THEME.borderRadius.sm
  },
  sizeLg: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: THEME.borderRadius.lg
  },
  text: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3
  },
  textSm: {
    fontSize: 13
  },
  textLg: {
    fontSize: 17
  },
  disabled: {
    opacity: 0.55
  }
});

