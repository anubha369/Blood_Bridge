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
import { Header } from '../../components/Header';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { MedicalDisclaimerBanner } from '../../components/MedicalDisclaimerBanner';
import { api } from '../../services/api';

export const DonationConfirmationScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [donationDate, setDonationDate] = useState(new Date().toISOString().slice(0, 10));
  const [centerName, setCenterName] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (!centerName.trim()) {
      setError('Please provide the hospital or blood bank facility name.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const payload = {
        donation_date: donationDate,
        donation_center: centerName.trim(),
        notes: notes.trim() || undefined
      };

      const res = await api.donors.confirmDonation(payload);
      if (res.success) {
        Alert.alert(
          'Donation Confirmed! 🩸',
          'Thank you for your life-saving contribution!\n\n' +
            '• +100 Life Saver Credit Points added to your wallet.\n' +
            '• Mandatory 90-day medical cooldown activated for donor wellness.',
          [
            {
              text: 'Open Wallet',
              onPress: () => navigation.replace('CreditWallet')
            }
          ]
        );
      } else {
        setError(res.error || 'Failed to confirm donation.');
      }
    } catch (err: any) {
      setError(err.message || 'Error communicating with server.');
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
        title="Record Donation"
        subtitle="Earn Life Saver Points & Track Wellness"
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <MedicalDisclaimerBanner />

        <Card variant="elevated" style={styles.heroCard}>
          <View style={styles.iconCircle}>
            <Ionicons name="ribbon" size={32} color={THEME.colors.primary} />
          </View>
          <Text style={styles.heroTitle}>Self-Report Whole Blood Donation</Text>
          <Text style={styles.heroDesc}>
            Did you recently donate blood at a hospital or blood drive? Record it here to keep your
            wellness cooldown accurate and earn +100 Life Saver reward points.
          </Text>
        </Card>

        {error && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={18} color={THEME.colors.urgent} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <Input
          label="Donation Date (YYYY-MM-DD) *"
          placeholder="e.g. 2026-11-03"
          icon="calendar-outline"
          value={donationDate}
          onChangeText={setDonationDate}
        />

        <Input
          label="Hospital or Blood Donation Center *"
          placeholder="e.g. SMS Medical College Hospital Blood Bank"
          icon="business-outline"
          value={centerName}
          onChangeText={setCenterName}
        />

        <Input
          label="Batch / Reference Notes (Optional)"
          placeholder="e.g. Whole blood whole unit, donation camp Jaipur"
          multiline
          numberOfLines={2}
          value={notes}
          onChangeText={setNotes}
          style={{ height: 60, textAlignVertical: 'top' }}
        />

        <Button
          title="Submit & Claim +100 Points"
          variant="primary"
          size="lg"
          loading={loading}
          icon={<Ionicons name="sparkles" size={18} color="#FFFFFF" />}
          onPress={handleConfirm}
          style={{ marginTop: 12, marginBottom: 24 }}
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
  heroCard: {
    alignItems: 'center',
    padding: 18,
    marginBottom: 16
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: THEME.colors.crimsonLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10
  },
  heroTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.navy,
    marginBottom: 4,
    textAlign: 'center'
  },
  heroDesc: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
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
  }
});

