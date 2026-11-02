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
  rightElement?: React.ReactNode;
  containerStyle?: ViewStyle;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  icon,
  isPassword = false,
  rightElement,
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
            size={20}
            color={isFocused ? THEME.colors.primary : THEME.colors.slate400}
            style={styles.icon}
          />
        )}
        <TextInput
          style={[styles.input, isPassword && { paddingRight: 40 }]}
          placeholderTextColor={THEME.colors.slate400}
          secureTextEntry={isPassword && !showPassword}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />
        {isPassword && (
          <TouchableOpacity
            style={styles.eyeBtn}
            onPress={() => setShowPassword(!showPassword)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={THEME.colors.slate500}
            />
          </TouchableOpacity>
        )}
        {rightElement && !isPassword && (
          <View style={styles.rightElementBox}>{rightElement}</View>
        )}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.navy,
    marginBottom: 6,
    letterSpacing: -0.1
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.slate50,
    borderWidth: 1.5,
    borderColor: THEME.colors.slate300,
    borderRadius: THEME.borderRadius.md,
    paddingHorizontal: 14,
    height: 52
  },
  focused: {
    borderColor: THEME.colors.primary,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.8
  },
  hasError: {
    borderColor: THEME.colors.urgent,
    backgroundColor: '#FFF5F5'
  },
  icon: {
    marginRight: 10
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: THEME.colors.navy,
    height: '100%',
    fontWeight: '500'
  },
  eyeBtn: {
    padding: 6
  },
  rightElementBox: {
    paddingLeft: 6
  },
  errorText: {
    color: THEME.colors.urgent,
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600'
  }
});
