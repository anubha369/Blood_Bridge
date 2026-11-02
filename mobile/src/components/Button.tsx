import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  View
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
  rightIcon?: React.ReactNode;
  showArrow?: boolean;
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
  rightIcon,
  showArrow = false,
  style,
  textStyle
}) => {
  const isDisabled = disabled || loading;

  const getContainerStyle = () => {
    switch (variant) {
      case 'crimson':
      case 'primary':
        return {
          backgroundColor: THEME.colors.primary,
          ...THEME.shadows.sm
        };
      case 'secondary':
        return {
          backgroundColor: THEME.colors.card,
          borderWidth: 2,
          borderColor: THEME.colors.borderDark
        };
      case 'outline':
        return {
          backgroundColor: THEME.colors.card,
          borderWidth: 1.5,
          borderColor: THEME.colors.borderDark
        };
      case 'danger':
        return {
          backgroundColor: THEME.colors.urgent
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent'
        };
      default:
        return {
          backgroundColor: THEME.colors.primary
        };
    }
  };

  const getTextColor = () => {
    if (variant === 'secondary') {
      return THEME.colors.navy;
    }
    if (variant === 'outline') {
      return THEME.colors.navy;
    }
    if (variant === 'ghost') {
      return THEME.colors.primary;
    }
    return THEME.colors.textInverse;
  };

  const textColor = getTextColor();

  return (
    <TouchableOpacity
      activeOpacity={0.88}
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
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <View style={styles.innerRow}>
          {icon && <View style={styles.leftIconBox}>{icon}</View>}
          <Text
            style={[
              styles.text,
              { color: textColor },
              size === 'sm' && styles.textSm,
              size === 'lg' && styles.textLg,
              textStyle
            ]}
          >
            {title}
          </Text>
          {showArrow && (
            <Ionicons
              name="arrow-forward"
              size={size === 'lg' ? 18 : 16}
              color={textColor}
              style={styles.arrowIcon}
            />
          )}
          {rightIcon && <View style={styles.rightIconBox}>{rightIcon}</View>}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: THEME.borderRadius.lg // 16px rounded-2xl
  },
  innerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  sizeSm: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: THEME.borderRadius.md
  },
  sizeLg: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: THEME.borderRadius.lg
  },
  text: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.1
  },
  textSm: {
    fontSize: 13
  },
  textLg: {
    fontSize: 18,
    fontWeight: '800'
  },
  leftIconBox: {
    marginRight: 8
  },
  rightIconBox: {
    marginLeft: 8
  },
  arrowIcon: {
    marginLeft: 8
  },
  disabled: {
    opacity: 0.5
  }
});
