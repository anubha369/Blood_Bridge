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
import { Header } from '../../components/Header';
import { MedicalDisclaimerBanner } from '../../components/MedicalDisclaimerBanner';
import { useAuth } from '../../context/AuthContext';
import { BloodGroup, UserRole } from '../../constants/types';

export const RegisterScreen: React.FC<{ navigation: any; route: any }> = ({
  navigation,
  route
}) => {
  const defaultRole: UserRole = route.params?.defaultRole || 'donor';
  const { signup } = useAuth();

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

      const payload = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        password: password,
        role: role,
        blood_group: bloodGroup,
        city: city.trim(),
        area: area.trim(),
        consent_to_contact: consentToContact
      };

      const user = await signup(payload);
      Alert.alert(
        'Account Registered',
        role === 'donor'
          ? 'Welcome to the BloodBridge Donor Network! You have been awarded +50 registration reward points.'
          : 'Welcome to BloodBridge! Your requester account is ready.'
      );

      if (user.role === 'donor') {
        navigation.replace('DonorMain');
      } else {
        navigation.replace('RequesterMain');
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
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
        title="Create Account"
        subtitle="Join BloodBridge Healthcare Network"
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <MedicalDisclaimerBanner />

        {/* Role Selector */}
        <Text style={styles.sectionLabel}>Select Your Primary Role</Text>
        <View style={styles.roleTabs}>
          <TouchableOpacity
            style={[styles.roleTab, role === 'donor' && styles.roleTabActive]}
            onPress={() => setRole('donor')}
          >
            <Ionicons
              name="heart"
              size={18}
              color={role === 'donor' ? '#FFFFFF' : THEME.colors.primary}
            />
            <Text style={[styles.roleTabText, role === 'donor' && styles.roleTabTextActive]}>
              Volunteer Donor
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.roleTab, role === 'requester' && styles.roleTabActive]}
            onPress={() => setRole('requester')}
          >
            <Ionicons
              name="pulse"
              size={18}
              color={role === 'requester' ? '#FFFFFF' : THEME.colors.urgent}
            />
            <Text style={[styles.roleTabText, role === 'requester' && styles.roleTabTextActive]}>
              Patient / Requester
            </Text>
          </TouchableOpacity>
        </View>

        {error && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={18} color={THEME.colors.urgent} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <Input
          label="Full Name"
          placeholder="e.g. Rahul Verma"
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
          label="Mobile Phone Number"
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
          loading={loading}
          onPress={handleRegister}
          style={{ marginTop: 12 }}
        />

        <View style={styles.bottomRow}>
          <Text style={styles.bottomPrompt}>Already have an account?</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.loginLink}> Sign In</Text>
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
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.navy,
    marginBottom: 8
  },
  roleTabs: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20
  },
  roleTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1.5,
    borderColor: THEME.colors.border
  },
  roleTabActive: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
    ...THEME.shadows.emergency
  },
  roleTabText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.navy,
    marginLeft: 6
  },
  roleTabTextActive: {
    color: '#FFFFFF'
  },
  locationRow: {
    flexDirection: 'row'
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFDFD',
    borderWidth: 1,
    borderColor: THEME.colors.crimsonBorder,
    borderRadius: THEME.borderRadius.md,
    padding: 12,
    marginVertical: 12
  },
  consentText: {
    flex: 1,
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginLeft: 10,
    lineHeight: 17
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
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    paddingBottom: 24
  },
  bottomPrompt: {
    fontSize: 14,
    color: THEME.colors.textMuted
  },
  loginLink: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.primary
  }
});

