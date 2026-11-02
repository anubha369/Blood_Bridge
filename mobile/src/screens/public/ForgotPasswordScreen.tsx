import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../../constants/theme';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Header } from '../../components/Header';
import { api } from '../../services/api';

export const ForgotPasswordScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRequestReset = async () => {
    if (!email.trim() || !email.includes('@')) {
      setError('Please provide a valid registered email address.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await api.auth.forgotPassword(email.trim());
      if (res.success) {
        Alert.alert(
          'Recovery Code Sent',
          'If an account exists for this email, password recovery instructions or a reset token have been dispatched.'
        );
        if (res.reset_token) {
          setToken(res.reset_token);
        }
        setStep('reset');
      } else {
        setError(res.error || 'Failed to initiate password reset.');
      }
    } catch (err: any) {
      setError(err.message || 'Error communicating with server.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!token.trim()) {
      setError('Please enter the reset token received.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await api.auth.resetPassword(token.trim(), newPassword);
      if (res.success) {
        Alert.alert('Password Updated', 'Your password has been successfully reset. Please log in.', [
          { text: 'OK', onPress: () => navigation.replace('Login') }
        ]);
      } else {
        setError(res.error || 'Failed to update password.');
      }
    } catch (err: any) {
      setError(err.message || 'Reset password failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Header
        title="Reset Password"
        subtitle="Account Recovery"
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.iconCircle}>
          <Ionicons name="key" size={32} color={THEME.colors.primary} />
        </View>

        <Text style={styles.heading}>
          {step === 'request' ? 'Forgot Your Password?' : 'Enter New Password'}
        </Text>
        <Text style={styles.subtext}>
          {step === 'request'
            ? 'Enter your registered email address and we will send you secure recovery instructions.'
            : 'Enter the recovery code or token and your new password below.'}
        </Text>

        {error && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={18} color={THEME.colors.urgent} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {step === 'request' ? (
          <View>
            <Input
              label="Registered Email Address"
              placeholder="e.g. donor@bloodbridge.org"
              icon="mail-outline"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />

            <Button
              title="Send Recovery Instructions"
              variant="primary"
              size="lg"
              loading={loading}
              onPress={handleRequestReset}
              style={{ marginTop: 8 }}
            />
          </View>
        ) : (
          <View>
            <Input
              label="Reset Token / Code"
              placeholder="Paste token received"
              icon="shield-outline"
              value={token}
              onChangeText={setToken}
            />

            <Input
              label="New Password"
              placeholder="At least 6 characters"
              icon="lock-closed-outline"
              isPassword
              value={newPassword}
              onChangeText={setNewPassword}
            />

            <Button
              title="Set New Password & Log In"
              variant="primary"
              size="lg"
              loading={loading}
              onPress={handleResetPassword}
              style={{ marginTop: 8 }}
            />

            <Button
              title="Back to Email Input"
              variant="ghost"
              size="sm"
              onPress={() => setStep('request')}
              style={{ marginTop: 8 }}
            />
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: THEME.colors.background
  },
  scrollContent: {
    padding: THEME.spacing.base,
    alignItems: 'center'
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: THEME.colors.crimsonLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 16
  },
  heading: {
    fontSize: 20,
    fontWeight: '800',
    color: THEME.colors.navy,
    marginBottom: 6,
    textAlign: 'center'
  },
  subtext: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
    paddingHorizontal: 16
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.urgentBg,
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: THEME.borderRadius.md,
    padding: 12,
    marginBottom: 16,
    width: '100%'
  },
  errorText: {
    color: THEME.colors.urgent,
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
    fontWeight: '500'
  }
});

