import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../../constants/theme';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { MedicalDisclaimerBanner } from '../../components/MedicalDisclaimerBanner';
import { useAuth } from '../../context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const VerifyOtpScreen: React.FC<{ navigation: any; route: any }> = ({
  navigation,
  route
}) => {
  const insets = useSafeAreaInsets();
  const { verifyEmailOtp, resendEmailOtp, verifyOtp, resendOtp } = useAuth();

  const emailParam = route.params?.email || '';
  const phoneParam = route.params?.phone || '';
  const roleParam = route.params?.role || 'donor';
  const initialChallengeId = route.params?.challenge_id || '';
  const emailMasked = route.params?.email_masked || '';

  const [challengeId, setChallengeId] = useState(initialChallengeId);
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  // 5-minute code expiration timer (300 seconds)
  const [expirySeconds, setExpirySeconds] = useState(300);

  // 60-second resend cooldown timer
  const [cooldown, setCooldown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  const inputsRef = useRef<Array<any>>([]);

  // Masked email format helper: e.g. a***a@gmail.com
  const getDisplayTarget = () => {
    if (emailMasked) return emailMasked;
    if (emailParam && emailParam.includes('@')) {
      const [name, domain] = emailParam.split('@');
      const masked = name.length <= 2 ? `${name[0]}***` : `${name[0]}***${name[name.length - 1]}`;
      return `${masked}@${domain}`;
    }
    if (phoneParam) return phoneParam;
    return 'your registered address';
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Expiration countdown
  useEffect(() => {
    if (expirySeconds <= 0) return;
    const interval = setInterval(() => {
      setExpirySeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [expirySeconds]);

  // Resend cooldown countdown
  useEffect(() => {
    if (cooldown <= 0) {
      setCanResend(true);
      return;
    }
    const interval = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  const handleDigitChange = (index: number, val: string) => {
    const clean = val.replace(/\D/g, '');

    // Case: user pasted multiple digits
    if (clean.length > 1) {
      const newDigits = [...digits];
      for (let i = 0; i < 6 && i < clean.length; i++) {
        newDigits[i] = clean[i];
      }
      setDigits(newDigits);
      setError(null);
      const nextIndex = Math.min(clean.length, 5);
      inputsRef.current[nextIndex]?.focus();
      return;
    }

    const newDigits = [...digits];
    newDigits[index] = clean;
    setDigits(newDigits);
    setError(null);

    // Auto-advance
    if (clean && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (index: number, key: string) => {
    if (key === 'Backspace') {
      if (!digits[index] && index > 0) {
        const newDigits = [...digits];
        newDigits[index - 1] = '';
        setDigits(newDigits);
        inputsRef.current[index - 1]?.focus();
      } else {
        const newDigits = [...digits];
        newDigits[index] = '';
        setDigits(newDigits);
      }
    }
  };

  const handleVerify = async () => {
    const code = digits.join('').trim();
    if (code.length !== 6) {
      setError('Please enter all 6 digits of the verification code.');
      return;
    }

    if (expirySeconds <= 0) {
      setError('Verification code has expired. Please tap "Resend Code".');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      let res: any;
      if (emailParam) {
        res = await verifyEmailOtp(emailParam, code, challengeId);
      } else {
        res = await verifyOtp(phoneParam, code, challengeId);
      }

      if (res && (res.success || res.verified)) {
        setSuccess(true);
        Alert.alert(
          'Verification Complete! 🩸',
          'Your account has been securely verified. Welcome to BloodBridge.',
          [
            {
              text: 'Continue to Portal',
              onPress: () => {
                if (roleParam === 'donor') {
                  navigation.replace('DonorMain');
                } else if (roleParam === 'admin') {
                  navigation.replace('AdminMain');
                } else {
                  navigation.replace('RequesterMain');
                }
              }
            }
          ]
        );
      } else {
        setError(res?.error || 'Verification failed. Please check the code.');
      }
    } catch (err: any) {
      setError(err.message || 'Incorrect verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend || resending) return;

    try {
      setResending(true);
      setError(null);

      let res: any;
      if (emailParam) {
        res = await resendEmailOtp(emailParam, challengeId);
      } else {
        res = await resendOtp(phoneParam, challengeId);
      }

      if (res && res.success) {
        if (res.challenge_id) setChallengeId(res.challenge_id);
        setDigits(['', '', '', '', '', '']);
        setExpirySeconds(300);
        setCooldown(60);
        setCanResend(false);
        Alert.alert('Code Dispatched', 'A new 6-digit verification code has been sent.');
        inputsRef.current[0]?.focus();
      } else {
        setError(res?.error || 'Could not resend verification code.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to resend code.');
    } finally {
      setResending(false);
    }
  };

  return (
    <View style={styles.screen}>
      {/* Header Bar matching Website */}
      <View style={[styles.headerBar, { paddingTop: insets.top + 6 }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.logoRow}
            onPress={() => navigation.navigate('Welcome')}
            activeOpacity={0.8}
          >
            <View style={styles.logoDrop}>
              <Ionicons name="water" size={24} color={THEME.colors.primary} />
            </View>
            <Text style={styles.logoText}>
              <Text style={styles.logoRed}>Blood</Text>
              <Text style={styles.logoNavy}>Bridge</Text>
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('Login')}
            style={styles.returnBtn}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={14} color={THEME.colors.slate600} />
            <Text style={styles.returnBtnText}>Return to Login</Text>
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <MedicalDisclaimerBanner />

          {/* Main Card */}
          <Card variant="elevated" style={styles.mainCard}>
            <View style={styles.cardHeader}>
              <View style={styles.eyebrowBadge}>
                <Ionicons name="shield-checkmark" size={12} color={THEME.colors.primary} />
                <Text style={styles.eyebrowText}>SECURE HEALTHCARE PORTAL</Text>
              </View>
              <Text style={styles.cardTitle}>Verify Your Email</Text>
              <Text style={styles.cardSubtitle}>
                Enter the 6-digit verification code dispatched to{' '}
                <Text style={styles.targetText}>{getDisplayTarget()}</Text>
              </Text>
            </View>

            {error && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color={THEME.colors.urgent} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* 6 Digit Input Boxes */}
            <View style={styles.otpRow}>
              {digits.map((digit, idx) => (
                <TextInput
                  key={idx}
                  ref={(r) => {
                    inputsRef.current[idx] = r;
                  }}
                  style={[
                    styles.otpBox,
                    digit ? styles.otpBoxFilled : null,
                    focusedIndex === idx ? styles.otpBoxActive : null
                  ]}
                  value={digit}
                  onChangeText={(val) => handleDigitChange(idx, val)}
                  onKeyPress={({ nativeEvent }) => handleKeyPress(idx, nativeEvent.key)}
                  onFocus={() => setFocusedIndex(idx)}
                  onBlur={() => setFocusedIndex(null)}
                  keyboardType="number-pad"
                  maxLength={1}
                  selectTextOnFocus
                  autoFocus={idx === 0}
                />
              ))}
            </View>

            {/* Expiry Countdown */}
            <View style={styles.timerRow}>
              <Ionicons
                name="time-outline"
                size={14}
                color={expirySeconds <= 60 ? THEME.colors.urgent : THEME.colors.slate500}
              />
              <Text
                style={[
                  styles.timerText,
                  expirySeconds <= 60 && { color: THEME.colors.urgent, fontWeight: '800' }
                ]}
              >
                Code expires in {formatTime(expirySeconds)}
              </Text>
            </View>

            {/* Submit Button */}
            <Button
              title="Verify Code"
              variant="primary"
              size="lg"
              showArrow
              loading={loading}
              onPress={handleVerify}
              style={{ marginTop: 14 }}
            />

            {/* Resend Cooldown Section */}
            <View style={styles.resendContainer}>
              <Text style={styles.resendQuestion}>Didn't receive the verification code? </Text>
              <TouchableOpacity
                onPress={handleResend}
                disabled={!canResend || resending}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.resendAction,
                    (!canResend || resending) && styles.resendDisabled
                  ]}
                >
                  {resending
                    ? 'Resending...'
                    : canResend
                    ? 'Resend Code'
                    : `Resend in ${cooldown}s`}
                </Text>
              </TouchableOpacity>
            </View>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FAF9F6'
  },
  flex: {
    flex: 1
  },
  headerBar: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
    paddingHorizontal: 16,
    paddingBottom: 12
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  logoDrop: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FFF1F2',
    alignItems: 'center',
    justifyContent: 'center'
  },
  logoText: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.4
  },
  logoRed: {
    color: THEME.colors.primary
  },
  logoNavy: {
    color: THEME.colors.navy
  },
  returnBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: THEME.colors.borderDark
  },
  returnBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.slate700
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12
  },
  mainCard: {
    padding: 22,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    marginTop: 10
  },
  cardHeader: {
    alignItems: 'center',
    marginBottom: 20
  },
  eyebrowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    marginBottom: 10
  },
  eyebrowText: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.primary,
    letterSpacing: 0.8
  },
  cardTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: THEME.colors.navy,
    letterSpacing: -0.4,
    marginBottom: 6,
    textAlign: 'center'
  },
  cardSubtitle: {
    fontSize: 13,
    color: THEME.colors.slate600,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 10
  },
  targetText: {
    fontWeight: '800',
    color: THEME.colors.navy
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: THEME.colors.urgent,
    fontWeight: '600'
  },
  otpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16
  },
  otpBox: {
    width: 46,
    height: 54,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: THEME.colors.borderDark,
    backgroundColor: '#F8FAFC',
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '900',
    color: THEME.colors.navy
  },
  otpBoxFilled: {
    borderColor: THEME.colors.primary,
    backgroundColor: '#FFFFFF'
  },
  otpBoxActive: {
    borderColor: THEME.colors.primary,
    backgroundColor: '#FFF1F2'
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 10
  },
  timerText: {
    fontSize: 12,
    color: THEME.colors.slate500,
    fontWeight: '600'
  },
  resendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    flexWrap: 'wrap'
  },
  resendQuestion: {
    fontSize: 12,
    color: THEME.colors.slate600
  },
  resendAction: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.primary
  },
  resendDisabled: {
    color: THEME.colors.slate400
  }
});
