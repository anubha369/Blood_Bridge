import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../../constants/theme';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Header } from '../../components/Header';
import { useAuth } from '../../context/AuthContext';

export const LoginScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { login, sendOtp, verifyOtp, loginAsDemo } = useAuth();

  const [mode, setMode] = useState<'password' | 'otp'>('password');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigateBasedOnRole = (role?: string) => {
    if (role === 'donor') {
      navigation.replace('DonorMain');
    } else if (role === 'admin') {
      navigation.replace('AdminMain');
    } else {
      navigation.replace('RequesterMain');
    }
  };

  const handlePasswordLogin = async () => {
    if (!identifier.trim() || !password.trim()) {
      setError('Please provide your email / phone and password.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const user = await login(identifier.trim(), password);
      navigateBasedOnRole(user.role);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (!phone.trim()) {
      setError('Please enter your 10-digit mobile number.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await sendOtp(phone.trim());
      if (res.success) {
        setOtpSent(true);
        setChallengeId(res.challenge_id || '');
        Alert.alert('OTP Sent', `Verification code sent to ${res.masked_phone || phone}`);
      } else {
        setError(res.error || 'Failed to send OTP.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send SMS OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim()) {
      setError('Please enter the 6-digit OTP.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await verifyOtp(phone.trim(), otp.trim(), challengeId);
      if (res.success && res.user) {
        navigateBasedOnRole(res.user.role);
      } else {
        setError(res.error || 'Invalid or expired OTP.');
      }
    } catch (err: any) {
      setError(err.message || 'OTP verification failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = async (role: 'donor' | 'requester' | 'admin') => {
    try {
      setLoading(true);
      setError(null);
      const user = await loginAsDemo(role);
      navigateBasedOnRole(user.role);
    } catch (err: any) {
      setError(err.message || 'Demo login failed.');
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
        title="Sign In"
        subtitle="BloodBridge Vision-X Secure Access"
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Mode Switcher */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, mode === 'password' && styles.tabActive]}
            onPress={() => {
              setMode('password');
              setError(null);
            }}
          >
            <Text style={[styles.tabText, mode === 'password' && styles.tabTextActive]}>
              Password
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, mode === 'otp' && styles.tabActive]}
            onPress={() => {
              setMode('otp');
              setError(null);
            }}
          >
            <Text style={[styles.tabText, mode === 'otp' && styles.tabTextActive]}>
              Mobile OTP
            </Text>
          </TouchableOpacity>
        </View>

        {error && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={18} color={THEME.colors.urgent} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {mode === 'password' ? (
          <View style={styles.formSection}>
            <Input
              label="Email or Phone Number"
              placeholder="e.g. donor.sarah@bloodbridge.org or +91 98765 43210"
              icon="person-outline"
              autoCapitalize="none"
              keyboardType="email-address"
              value={identifier}
              onChangeText={setIdentifier}
            />

            <Input
              label="Password"
              placeholder="Enter your password"
              icon="lock-closed-outline"
              isPassword
              value={password}
              onChangeText={setPassword}
            />

            <TouchableOpacity
              onPress={() => navigation.navigate('ForgotPassword')}
              style={styles.forgotBtn}
            >
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>

            <Button
              title="Sign In"
              variant="primary"
              size="lg"
              loading={loading}
              onPress={handlePasswordLogin}
              style={{ marginTop: 8 }}
            />
          </View>
        ) : (
          <View style={styles.formSection}>
            <Input
              label="Indian Mobile Number"
              placeholder="10-digit mobile (e.g. 9876543210)"
              icon="call-outline"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              editable={!otpSent}
            />

            {otpSent && (
              <Input
                label="6-Digit Verification Code"
                placeholder="Enter 6-digit OTP"
                icon="key-outline"
                keyboardType="number-pad"
                maxLength={6}
                value={otp}
                onChangeText={setOtp}
              />
            )}

            {!otpSent ? (
              <Button
                title="Send Verification Code"
                variant="primary"
                size="lg"
                loading={loading}
                onPress={handleSendOtp}
              />
            ) : (
              <View>
                <Button
                  title="Verify OTP & Sign In"
                  variant="primary"
                  size="lg"
                  loading={loading}
                  onPress={handleVerifyOtp}
                  style={{ marginBottom: 12 }}
                />
                <Button
                  title="Change Phone Number"
                  variant="ghost"
                  size="sm"
                  onPress={() => {
                    setOtpSent(false);
                    setOtp('');
                  }}
                />
              </View>
            )}
          </View>
        )}

        {/* Demo Fast Login */}
        <Card variant="outlined" style={styles.demoCard}>
          <Text style={styles.demoTitle}>Fast Evaluation Logins:</Text>
          <View style={styles.demoPills}>
            <Button
              title="Donor Sarah"
              size="sm"
              variant="outline"
              onPress={() => handleDemo('donor')}
              style={{ flex: 1 }}
            />
            <Button
              title="Dr. Mehta (Hospital)"
              size="sm"
              variant="secondary"
              onPress={() => handleDemo('requester')}
              style={{ flex: 1 }}
            />
            <Button
              title="Admin"
              size="sm"
              variant="ghost"
              onPress={() => handleDemo('admin')}
              style={{ flex: 1 }}
            />
          </View>
        </Card>

        {/* Register Prompt */}
        <View style={styles.bottomRow}>
          <Text style={styles.bottomPrompt}>Don't have an account?</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.registerLink}> Register Now</Text>
          </TouchableOpacity>
        </View>
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
    padding: THEME.spacing.base
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: THEME.borderRadius.md,
    padding: 4,
    marginBottom: 20
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: THEME.borderRadius.sm
  },
  tabActive: {
    backgroundColor: THEME.colors.card,
    ...THEME.shadows.sm
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.colors.textMuted
  },
  tabTextActive: {
    color: THEME.colors.primary,
    fontWeight: '800'
  },
  formSection: {
    marginBottom: 20
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginBottom: 16
  },
  forgotText: {
    fontSize: 13,
    color: THEME.colors.primary,
    fontWeight: '600'
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.urgentBg,
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: THEME.borderRadius.md,
    padding: 12,
    marginBottom: 16
  },
  errorText: {
    color: THEME.colors.urgent,
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
    fontWeight: '500'
  },
  demoCard: {
    backgroundColor: '#FFFDF9',
    borderColor: '#FDE68A',
    marginTop: 10
  },
  demoTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.navy,
    marginBottom: 10
  },
  demoPills: {
    flexDirection: 'row',
    gap: 8
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    paddingBottom: 20
  },
  bottomPrompt: {
    fontSize: 14,
    color: THEME.colors.textMuted
  },
  registerLink: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.primary
  }
});

