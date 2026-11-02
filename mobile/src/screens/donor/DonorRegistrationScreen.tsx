import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Switch,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../../constants/theme';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { BloodGroupSelector } from '../../components/BloodGroupSelector';
import { MedicalDisclaimerBanner } from '../../components/MedicalDisclaimerBanner';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { BloodGroup } from '../../constants/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const CITIES = [
  'Jaipur (Rajasthan)',
  'Ghaziabad (Uttar Pradesh)',
  'Delhi (NCR)',
  'Noida (Uttar Pradesh)',
  'Bengaluru (Karnataka)',
  'Mumbai (Maharashtra)'
];

export const DonorRegistrationScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { refreshUser } = useAuth();

  const [bloodGroup, setBloodGroup] = useState<BloodGroup | null>('O+');
  const [selectedCity, setSelectedCity] = useState('Jaipur');
  const [area, setArea] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [lastDonationDate, setLastDonationDate] = useState('');
  const [consentToContact, setConsentToContact] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!bloodGroup) {
      setError('Please select your verified blood group.');
      return;
    }
    if (!selectedCity) {
      setError('Please select your primary city.');
      return;
    }
    if (!consentToContact) {
      setError('You must grant consent to be contacted to join the emergency donor coordination network.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const payload = {
        blood_group: bloodGroup,
        city: selectedCity,
        area: area.trim(),
        postal_code: postalCode.trim() || undefined,
        consent_to_contact: consentToContact,
        last_donation_date: lastDonationDate.trim() || null
      };

      const res = await api.donors.register(payload);
      if (res.success) {
        await refreshUser();
        Alert.alert(
          'Registration Complete! 🩸',
          'You are now registered as an active volunteer donor in the BloodBridge Emergency Network.',
          [
            {
              text: 'Open Donor Portal',
              onPress: () => navigation.replace('DonorMain')
            }
          ]
        );
      } else {
        setError(res.error || 'Failed to complete donor registration.');
      }
    } catch (err: any) {
      setError(err.message || 'Error communicating with server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <Header
        title="Become a Verified Donor"
        subtitle="Volunteer Registration & Consent"
        showBack
        onBack={() => navigation.goBack()}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
        >
          <MedicalDisclaimerBanner />

          {/* Hero Banner */}
          <Card variant="elevated" style={styles.heroCard}>
            <View style={styles.iconCircle}>
              <Ionicons name="heart" size={32} color="#FFFFFF" />
            </View>
            <Text style={styles.heroTitle}>Join the Life-Saving Network</Text>
            <Text style={styles.heroSubtitle}>
              Provide your details to be matched during urgent blood emergencies when patients nearby
              need your compatible blood type.
            </Text>
          </Card>

          {error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color={THEME.colors.urgent} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Blood Group Selector */}
          <BloodGroupSelector
            label="Select Your Blood Group *"
            selectedGroup={bloodGroup}
            onSelect={setBloodGroup}
          />

          {/* City Selection Pills */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>City / Primary Region *</Text>
            <View style={styles.cityGrid}>
              {CITIES.map((c) => {
                const cityName = c.split(' ')[0];
                const isSelected = selectedCity === cityName;
                return (
                  <TouchableOpacity
                    key={c}
                    style={[styles.cityPill, isSelected && styles.cityPillActive]}
                    onPress={() => setSelectedCity(cityName)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.cityText, isSelected && styles.cityTextActive]}>
                      {c}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Area / Locality */}
          <Input
            label="Approximate Locality / Area"
            placeholder="e.g. Malviya Nagar, Indirapuram"
            icon="location-outline"
            value={area}
            onChangeText={setArea}
          />

          {/* Postal Code */}
          <Input
            label="Postal Pincode (Optional)"
            placeholder="e.g. 302017"
            keyboardType="number-pad"
            icon="navigate-outline"
            value={postalCode}
            onChangeText={setPostalCode}
          />

          {/* Last Donation Date */}
          <Input
            label="Last Whole Blood Donation Date (YYYY-MM-DD)"
            placeholder="e.g. 2026-08-15 (Leave blank if first time)"
            icon="calendar-outline"
            value={lastDonationDate}
            onChangeText={setLastDonationDate}
          />

          {/* Consent Checkbox Card */}
          <Card variant="outlined" style={styles.consentCard}>
            <View style={styles.consentRow}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.consentTitle}>Emergency Contact Consent</Text>
                <Text style={styles.consentDesc}>
                  I give explicit consent to be contacted through BloodBridge for emergency blood
                  coordination. I can pause or withdraw this consent at any time.
                </Text>
              </View>
              <Switch
                value={consentToContact}
                onValueChange={setConsentToContact}
                trackColor={{ false: THEME.colors.slate300, true: '#BBF7D0' }}
                thumbColor={consentToContact ? THEME.colors.success : '#FFFFFF'}
              />
            </View>
          </Card>

          {/* Submit Button */}
          <Button
            title="Complete Donor Registration"
            variant="primary"
            size="lg"
            loading={loading}
            icon={<Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />}
            onPress={handleSubmit}
            style={{ marginTop: 14 }}
          />
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
  content: {
    paddingHorizontal: 16,
    paddingTop: 12
  },
  heroCard: {
    alignItems: 'center',
    padding: 18,
    marginBottom: 14,
    borderRadius: 20
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    ...THEME.shadows.emergency
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: THEME.colors.navy,
    marginBottom: 4
  },
  heroSubtitle: {
    fontSize: 12,
    color: THEME.colors.slate600,
    textAlign: 'center',
    lineHeight: 16
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
    marginBottom: 14
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: THEME.colors.urgent,
    fontWeight: '600'
  },
  section: {
    marginBottom: 14
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.navy,
    marginBottom: 8
  },
  cityGrid: {
    gap: 6
  },
  cityPill: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: THEME.colors.borderDark
  },
  cityPillActive: {
    backgroundColor: '#FFF1F2',
    borderColor: THEME.colors.primary
  },
  cityText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.slate700
  },
  cityTextActive: {
    color: THEME.colors.primary,
    fontWeight: '800'
  },
  consentCard: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 12
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  consentTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.colors.navy,
    marginBottom: 2
  },
  consentDesc: {
    fontSize: 11,
    color: THEME.colors.slate600,
    lineHeight: 15
  }
});
