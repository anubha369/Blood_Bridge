import React, { useState, useEffect } from 'react';
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
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { BloodGroupSelector } from '../../components/BloodGroupSelector';
import { LoadingScreen } from '../../components/LoadingScreen';
import { api } from '../../services/api';
import { DonorProfile, BloodGroup } from '../../constants/types';

export const DonorProfileScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [profile, setProfile] = useState<DonorProfile | null>(null);
  const [city, setCity] = useState('');
  const [area, setArea] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [bloodGroup, setBloodGroup] = useState<BloodGroup | null>('O+');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchProfile = async () => {
    try {
      const res = await api.donors.getProfile();
      if (res.success) {
        const p = res.profile || res.donor;
        if (p) {
          setProfile(p);
          setCity(p.city || 'Jaipur');
          setArea(p.area || '');
          setPostalCode(p.postal_code || '');
          setBloodGroup((p.blood_group as BloodGroup) || 'O+');
        }
      }
    } catch (err: any) {
      console.warn('Error fetching donor profile:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleSave = async () => {
    if (!city.trim()) {
      Alert.alert('Required Field', 'Please provide your primary city.');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        city: city.trim(),
        area: area.trim(),
        postal_code: postalCode.trim() || undefined,
        blood_group: bloodGroup
      };

      const res = await api.donors.updateProfile(payload);
      if (res.success) {
        Alert.alert('Profile Updated', 'Your donor profile and dispatch area have been saved.');
        fetchProfile();
      } else {
        Alert.alert('Update Notice', res.error || 'Failed to update profile.');
      }
    } catch (err: any) {
      Alert.alert('Save Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingScreen message="Loading donor profile..." />;
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Header
        title="Donor Profile & Area"
        subtitle="Volunteer Credentials"
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Verification Overview Card */}
        <Card variant="elevated" style={styles.topCard}>
          <View style={styles.topRow}>
            <View style={styles.bloodCircle}>
              <Text style={styles.bloodText}>{profile?.blood_group || bloodGroup}</Text>
            </View>
            <View style={styles.topInfo}>
              <Text style={styles.name}>{profile?.name || 'Verified Donor'}</Text>
              <Text style={styles.subText}>
                {profile?.donation_count || 0} Whole Blood Donations Recorded
              </Text>
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                <Badge
                  label={profile?.verification_status?.toUpperCase() || 'VERIFIED'}
                  variant="success"
                  size="sm"
                />
                <Badge
                  label={profile?.availability_status?.toUpperCase() || 'AVAILABLE'}
                  variant="brand"
                  size="sm"
                />
              </View>
            </View>
          </View>

          {profile?.last_donation_date && (
            <View style={styles.lastDonationRow}>
              <Ionicons name="calendar-outline" size={14} color={THEME.colors.textMuted} />
              <Text style={styles.lastDonationText}>
                Last Donation: {new Date(profile.last_donation_date).toLocaleDateString()}
              </Text>
            </View>
          )}
        </Card>

        {/* Blood Group */}
        <BloodGroupSelector
          label="Your Blood Group"
          selectedGroup={bloodGroup}
          onSelect={setBloodGroup}
        />

        {/* Spatial Dispatch Area Form */}
        <Card variant="outlined" style={styles.areaCard}>
          <Text style={styles.cardHeader}>Spatial Dispatch Coverage Area</Text>
          <Text style={styles.cardDesc}>
            BloodBridge matches you with hospital emergency calls based on your verified city and
            zone:
          </Text>

          <Input
            label="City *"
            placeholder="e.g. Jaipur"
            icon="location-outline"
            value={city}
            onChangeText={setCity}
          />

          <Input
            label="Area / Locality"
            placeholder="e.g. Malviya Nagar / C-Scheme"
            value={area}
            onChangeText={setArea}
          />

          <Input
            label="Postal / PIN Code"
            placeholder="e.g. 302017"
            keyboardType="number-pad"
            value={postalCode}
            onChangeText={setPostalCode}
          />
        </Card>

        <Button
          title="Save Profile Updates"
          variant="primary"
          size="lg"
          loading={saving}
          icon={<Ionicons name="save-outline" size={18} color="#FFFFFF" />}
          onPress={handleSave}
          style={{ marginBottom: 24 }}
        />
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
  topCard: {
    padding: 16,
    marginBottom: 16
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  bloodCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14
  },
  bloodText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF'
  },
  topInfo: {
    flex: 1
  },
  name: {
    fontSize: 17,
    fontWeight: '800',
    color: THEME.colors.navy
  },
  subText: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 2
  },
  lastDonationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.borderLight,
    gap: 6
  },
  lastDonationText: {
    fontSize: 12,
    color: THEME.colors.textMuted
  },
  areaCard: {
    padding: 14,
    marginBottom: 16
  },
  cardHeader: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.navy,
    marginBottom: 4
  },
  cardDesc: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    lineHeight: 16,
    marginBottom: 12
  }
});

