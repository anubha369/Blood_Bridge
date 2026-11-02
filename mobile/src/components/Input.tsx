import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInputProps,
  ViewStyle
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  isPassword?: boolean;
  containerStyle?: ViewStyle;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  icon,
  isPassword = false,
  containerStyle,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View
        style={[
          styles.inputWrapper,
          isFocused && styles.focused,
          Boolean(error) && styles.hasError
        ]}
      >
        {icon && (
          <Ionicons
            name={icon}
            size={18}
            color={isFocused ? THEME.colors.primary : THEME.colors.textMuted}
            style={styles.icon}
          />
        )}
        <TextInput
          style={[styles.input, isPassword && { paddingRight: 40 }]}
          placeholderTextColor={THEME.colors.textLight}
          secureTextEntry={isPassword && !showPassword}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />
        {isPassword && (
          <TouchableOpacity
            style={styles.eyeBtn}
            onPress={() => setShowPassword(!showPassword)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={18}
              color={THEME.colors.textMuted}
            />
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: THEME.spacing.md
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.navy,
    marginBottom: 6,
    letterSpacing: 0.2
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.card,
    borderWidth: 1.5,
    borderColor: THEME.colors.border,
    borderRadius: THEME.borderRadius.md,
    paddingHorizontal: 12,
    height: 48
  },
  focused: {
    borderColor: THEME.colors.primary,
    backgroundColor: '#FFFFFF'
  },
  hasError: {
    borderColor: THEME.colors.urgent
  },
  icon: {
    marginRight: 8
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: THEME.colors.text,
    height: '100%'
  },
  eyeBtn: {
    position: 'absolute',
    right: 12
  },
  errorText: {
    color: THEME.colors.urgent,
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500'
  }
});

