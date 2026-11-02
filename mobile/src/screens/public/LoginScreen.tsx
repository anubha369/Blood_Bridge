import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Image,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../../constants/theme';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { useAuth } from '../../context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const LoginScreen: React.FC<{ navigation: any; route?: any }> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { login, loginAsDemo } = useAuth();

  const defaultRole = route?.params?.defaultRole || 'donor';
  const [activeRole, setActiveRole] = useState<'donor' | 'patient' | 'admin'>(defaultRole);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
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

  const handleRoleSelect = (role: 'donor' | 'patient' | 'admin') => {
    setActiveRole(role);
    setError(null);
  };

  const handleSignIn = async () => {
    if (!identifier.trim() || !password.trim()) {
      setError('Please enter your email, mobile number, or username and password.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const rolePayload = activeRole === 'patient' ? 'requester' : activeRole;
      const user = await login(identifier.trim(), password.trim(), rolePayload);
      navigateBasedOnRole(user.role);
    } catch (err: any) {
      setError(err.message || 'Invalid credentials. Please verify and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFastDemo = async (role: 'donor' | 'requester' | 'admin') => {
    try {
      setLoading(true);
      setError(null);
      const user = await loginAsDemo(role);
      navigateBasedOnRole(user.role);
    } catch (err: any) {
      Alert.alert('Evaluation Login', err.message || 'Demo login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      {/* Top Header matching Screenshot 1 */}
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
            onPress={() => navigation.navigate('Welcome')}
            style={styles.returnBtn}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={14} color={THEME.colors.slate600} />
            <Text style={styles.returnBtnText}>Return to Home</Text>
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 24 }
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Main Card Section */}
          <View style={styles.cardWrapper}>
            <View style={styles.loginCard}>
              {/* Category Header */}
              <View style={styles.cardHeader}>
                <Text style={styles.portalTag}>SECURE HEALTHCARE PORTAL</Text>
                <Text style={styles.welcomeHeading}>Welcome Back</Text>
                <Text style={styles.welcomeSub}>
                  Select your access role and enter your credentials.
                </Text>
              </View>

              {/* 3-Segment Role Tabs matching Screenshot 1 */}
              <View style={styles.roleTabsContainer}>
                <TouchableOpacity
                  style={[
                    styles.roleTab,
                    activeRole === 'donor' && styles.roleTabActive
                  ]}
                  onPress={() => handleRoleSelect('donor')}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.roleTabText,
                      activeRole === 'donor' && styles.roleTabTextActiveCrimson
                    ]}
                  >
                    Donor
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.roleTab,
                    activeRole === 'patient' && styles.roleTabActive
                  ]}
                  onPress={() => handleRoleSelect('patient')}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.roleTabText,
                      activeRole === 'patient' && styles.roleTabTextActiveNavy
                    ]}
                  >
                    Patient / Hospital
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.roleTab,
                    activeRole === 'admin' && styles.roleTabActive
                  ]}
                  onPress={() => handleRoleSelect('admin')}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.roleTabText,
                      activeRole === 'admin' && styles.roleTabTextActiveNavy
                    ]}
                  >
                    Admin
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Error Banner */}
              {error && (
                <View style={styles.errorBanner}>
                  <Ionicons name="alert-circle" size={18} color="#B91C1C" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {/* Form Inputs */}
              <View style={styles.formSection}>
                <Input
                  label="Email Address, Mobile (+91), or Username"
                  placeholder="e.g. donor.sarah@bloodbridge.org or +91 98765 43210"
                  icon="person-outline"
                  autoCapitalize="none"
                  value={identifier}
                  onChangeText={setIdentifier}
                />

                <View style={styles.passwordHeaderRow}>
                  <Text style={styles.inputLabel}>Password</Text>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('ForgotPassword')}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.forgotLink}>Forgot Password?</Text>
                  </TouchableOpacity>
                </View>

                <Input
                  placeholder="••••••••••••"
                  icon="lock-closed-outline"
                  isPassword
                  value={password}
                  onChangeText={setPassword}
                />

                {/* Keep Me Authenticated Checkbox */}
                <TouchableOpacity
                  style={styles.checkboxRow}
                  activeOpacity={0.8}
                  onPress={() => setRememberMe(!rememberMe)}
                >
                  <View style={[styles.checkbox, rememberMe && styles.checkboxActive]}>
                    {rememberMe && (
                      <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                    )}
                  </View>
                  <Text style={styles.checkboxLabel}>
                    Keep me securely authenticated on this workstation
                  </Text>
                </TouchableOpacity>

                {/* Button Action Stack */}
                <View style={styles.actionStack}>
                  <Button
                    title="Sign In"
                    variant="primary"
                    size="lg"
                    showArrow
                    loading={loading}
                    onPress={handleSignIn}
                    style={styles.signInBtn}
                  />

                  <Button
                    title="Create New Account"
                    variant="secondary"
                    size="lg"
                    showArrow
                    onPress={() => navigation.navigate('Register', { defaultRole: activeRole })}
                    style={styles.createAccountBtn}
                  />
                </View>

                {/* Haven't Registered Yet Link */}
                <View style={styles.switchAuthRow}>
                  <Text style={styles.switchAuthText}>Haven't registered yet? </Text>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('Register', { defaultRole: activeRole })}
                  >
                    <Text style={styles.switchAuthLink}>Click here to sign up</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Fast 1-Click Evaluation Bar */}
              <View style={styles.fastEvalBox}>
                <Text style={styles.fastEvalTitle}>Quick Evaluation Access:</Text>
                <View style={styles.fastEvalButtons}>
                  <TouchableOpacity
                    style={styles.fastEvalPill}
                    onPress={() => handleFastDemo('donor')}
                  >
                    <Text style={styles.fastEvalPillText}>Donor Sarah</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.fastEvalPill}
                    onPress={() => handleFastDemo('requester')}
                  >
                    <Text style={styles.fastEvalPillText}>Hospital Mehta</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.fastEvalPill}
                    onPress={() => handleFastDemo('admin')}
                  >
                    <Text style={styles.fastEvalPillText}>System Admin</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Security Notice */}
              <View style={styles.securityRow}>
                <Ionicons name="shield-checkmark-outline" size={14} color={THEME.colors.slate400} />
                <Text style={styles.securityText}>
                  Protected by 256-Bit SSL & Healthcare Registry Standards
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: THEME.colors.slate50
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
    gap: 6
  },
  logoDrop: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center'
  },
  logoText: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5
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
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: THEME.colors.borderDark,
    backgroundColor: '#FFFFFF'
  },
  returnBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.slate600
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16
  },
  cardWrapper: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center'
  },
  loginCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24, // rounded-3xl
    padding: 20,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.md
  },
  cardHeader: {
    alignItems: 'center',
    marginBottom: 20
  },
  portalTag: {
    fontSize: 11,
    fontWeight: '900',
    color: THEME.colors.primary,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 6
  },
  welcomeHeading: {
    fontSize: 30,
    fontWeight: '900',
    color: THEME.colors.navy,
    letterSpacing: -0.6,
    marginBottom: 4
  },
  welcomeSub: {
    fontSize: 14,
    color: THEME.colors.slate600,
    textAlign: 'center'
  },
  roleTabsContainer: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.slate100,
    borderRadius: 16,
    padding: 4,
    marginBottom: 20
  },
  roleTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12
  },
  roleTabActive: {
    backgroundColor: '#FFFFFF',
    ...THEME.shadows.sm
  },
  roleTabText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.slate600
  },
  roleTabTextActiveCrimson: {
    color: THEME.colors.primary,
    fontWeight: '800'
  },
  roleTabTextActiveNavy: {
    color: THEME.colors.navy,
    fontWeight: '800'
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: '#B91C1C',
    fontWeight: '600'
  },
  formSection: {
    marginBottom: 10
  },
  passwordHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.navy
  },
  forgotLink: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.primary
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 20
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: THEME.colors.slate300,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    backgroundColor: '#FFFFFF'
  },
  checkboxActive: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary
  },
  checkboxLabel: {
    fontSize: 13,
    color: THEME.colors.slate700,
    flex: 1
  },
  actionStack: {
    gap: 12,
    marginBottom: 16
  },
  signInBtn: {
    width: '100%'
  },
  createAccountBtn: {
    width: '100%'
  },
  switchAuthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    marginBottom: 16
  },
  switchAuthText: {
    fontSize: 13,
    color: THEME.colors.slate500
  },
  switchAuthLink: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.colors.primary
  },
  fastEvalBox: {
    backgroundColor: '#FFFDF9',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 14,
    padding: 10,
    marginBottom: 16
  },
  fastEvalTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.navy,
    marginBottom: 6
  },
  fastEvalButtons: {
    flexDirection: 'row',
    gap: 6
  },
  fastEvalPill: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center'
  },
  fastEvalPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.navy
  },
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.slate100
  },
  securityText: {
    fontSize: 11,
    color: THEME.colors.slate400
  }
});
