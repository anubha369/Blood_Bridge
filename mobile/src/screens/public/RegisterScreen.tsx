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
import { BloodGroupSelector } from '../../components/BloodGroupSelector';
import { useAuth } from '../../context/AuthContext';
import { BloodGroup, UserRole } from '../../constants/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const RegisterScreen: React.FC<{ navigation: any; route: any }> = ({
  navigation,
  route
}) => {
  const insets = useSafeAreaInsets();
  const defaultRole: UserRole = route.params?.defaultRole === 'requester' ? 'requester' : 'donor';
  const { registerInitiate, signup } = useAuth();

  const [role, setRole] = useState<UserRole>(defaultRole);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [bloodGroup, setBloodGroup] = useState<BloodGroup | null>('O+');
  const [city, setCity] = useState('Jaipur');
  const [area, setArea] = useState('');
  const [consentToContact, setConsentToContact] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async () => {
    if (!name.trim()) {
      setError('Please provide your full legal name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please provide a valid email address.');
      return;
    }
    if (!phone.trim()) {
      setError('Please enter your 10-digit mobile number.');
      return;
    }
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (role === 'donor' && !bloodGroup) {
      setError('Please select your blood group.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const fullPhone = phone.trim().startsWith('+91')
        ? phone.trim()
        : `+91 ${phone.trim()}`;

      const payload = {
        name: name.trim(),
        username: email.trim().split('@')[0],
        email: email.trim().toLowerCase(),
        phone: fullPhone,
        password: password,
        role: role,
        blood_group: bloodGroup,
        city: city.trim(),
        area: area.trim(),
        consent_to_contact: consentToContact
      };

      // 1. Dispatch 6-digit OTP verification via backend
      try {
        const initRes = await registerInitiate(payload);
        if (initRes && initRes.success) {
          navigation.navigate('VerifyOtp', {
            email: payload.email,
            phone: payload.phone,
            role: payload.role,
            challenge_id: initRes.challenge_id,
            email_masked: initRes.email_masked
          });
          return;
        }
      } catch (initErr: any) {
        // If register-initiate failed specifically because user exists
        if (initErr.message?.toLowerCase().includes('already registered') || initErr.message?.toLowerCase().includes('exists')) {
          throw initErr;
        }
        // Otherwise attempt direct signup fallback
        const user = await signup(payload);
        Alert.alert(
          'Account Registered',
          role === 'donor'
            ? 'Welcome to the BloodBridge Donor Network! You have received +50 registration reward points.'
            : 'Welcome to BloodBridge! Your requester account is ready.'
        );

        if (user.role === 'donor') {
          navigation.replace('DonorMain');
        } else {
          navigation.replace('RequesterMain');
        }
        return;
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      {/* Header Bar matching Login */}
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
          <View style={styles.cardWrapper}>
            <View style={styles.registerCard}>
              {/* Category Header */}
              <View style={styles.cardHeader}>
                <Text style={styles.portalTag}>SECURE HEALTHCARE PORTAL</Text>
                <Text style={styles.welcomeHeading}>Create Account</Text>
                <Text style={styles.welcomeSub}>
                  Register to join the BloodBridge emergency coordination registry.
                </Text>
              </View>

              {/* Role Tabs */}
              <View style={styles.roleTabsContainer}>
                <TouchableOpacity
                  style={[
                    styles.roleTab,
                    role === 'donor' && styles.roleTabActive
                  ]}
                  onPress={() => setRole('donor')}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.roleTabText,
                      role === 'donor' && styles.roleTabTextActiveCrimson
                    ]}
                  >
                    Volunteer Donor
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.roleTab,
                    role === 'requester' && styles.roleTabActive
                  ]}
                  onPress={() => setRole('requester')}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.roleTabText,
                      role === 'requester' && styles.roleTabTextActiveNavy
                    ]}
                  >
                    Patient / Hospital
                  </Text>
                </TouchableOpacity>
              </View>

              {error && (
                <View style={styles.errorBanner}>
                  <Ionicons name="alert-circle" size={18} color="#B91C1C" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {/* Form Inputs */}
              <View style={styles.formSection}>
                <Input
                  label="Full Legal Name"
                  placeholder="e.g. Rahul Sharma"
                  icon="person-outline"
                  value={name}
                  onChangeText={setName}
                />

                <Input
                  label="Email Address"
                  placeholder="e.g. rahul@example.com"
                  icon="mail-outline"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                />

                <Input
                  label="Mobile Phone Number (+91)"
                  placeholder="10-digit mobile (e.g. 9876543210)"
                  icon="call-outline"
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                />

                <Input
                  label="Password"
                  placeholder="At least 6 characters"
                  icon="lock-closed-outline"
                  isPassword
                  value={password}
                  onChangeText={setPassword}
                />

                {role === 'donor' && (
                  <BloodGroupSelector
                    label="Your Blood Group"
                    selectedGroup={bloodGroup}
                    onSelect={setBloodGroup}
                  />
                )}

                <View style={styles.locationRow}>
                  <Input
                    label="City"
                    placeholder="e.g. Jaipur"
                    icon="location-outline"
                    value={city}
                    onChangeText={setCity}
                    containerStyle={{ flex: 1, marginRight: 8 }}
                  />
                  <Input
                    label="Area / Neighborhood"
                    placeholder="e.g. Malviya Nagar"
                    value={area}
                    onChangeText={setArea}
                    containerStyle={{ flex: 1 }}
                  />
                </View>

                {role === 'donor' && (
                  <TouchableOpacity
                    style={styles.consentRow}
                    activeOpacity={0.8}
                    onPress={() => setConsentToContact(!consentToContact)}
                  >
                    <Ionicons
                      name={consentToContact ? 'checkbox' : 'square-outline'}
                      size={22}
                      color={THEME.colors.primary}
                    />
                    <Text style={styles.consentText}>
                      I consent to receive urgent, emergency blood availability requests when patients nearby
                      require my compatible blood group.
                    </Text>
                  </TouchableOpacity>
                )}

                <Button
                  title={role === 'donor' ? 'Register as Volunteer Donor' : 'Register as Blood Requester'}
                  variant="primary"
                  size="lg"
                  showArrow
                  loading={loading}
                  onPress={handleRegister}
                  style={styles.submitBtn}
                />

                <View style={styles.switchAuthRow}>
                  <Text style={styles.switchAuthText}>Already have an account? </Text>
                  <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                    <Text style={styles.switchAuthLink}>Sign in</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Security Badge */}
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
  registerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
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
  locationRow: {
    flexDirection: 'row'
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#FECDD3',
    borderRadius: 12,
    padding: 12,
    marginVertical: 14
  },
  consentText: {
    flex: 1,
    fontSize: 12,
    color: THEME.colors.slate700,
    marginLeft: 10,
    lineHeight: 18
  },
  submitBtn: {
    width: '100%',
    marginTop: 6
  },
  switchAuthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    marginBottom: 8
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
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.slate100
  },
  securityText: {
    fontSize: 11,
    color: THEME.colors.slate400
  }
});
