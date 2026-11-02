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

export const ConfirmFulfillmentScreen: React.FC<{ navigation: any; route: any }> = ({
  navigation,
  route
}) => {
  const { requestId, donorName } = route.params;

  const [unitsReceived, setUnitsReceived] = useState('1');
  const [hospitalNotes, setHospitalNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFulfill = async () => {
    const units = parseInt(unitsReceived, 10);
    if (isNaN(units) || units < 1) {
      setError('Please provide a valid count of blood units received.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const payload = {
        units_received: units,
        notes: hospitalNotes.trim() || undefined,
        donation_confirmed: true
      };

      const res = await api.requests.fulfill(requestId, payload);
      if (res.success) {
        Alert.alert(
          'Blood Request Fulfilled! 🩸',
          `The request is successfully marked as fulfilled.\n\n` +
            `• Donor ${donorName || 'Volunteer'} has been awarded +100 Life Saver credit points.\n` +
            `• 3-month clinical cooldown has been activated for donor safety.\n\nThank you for coordinating with BloodBridge.`,
          [
            {
              text: 'Return to Dashboard',
              onPress: () => navigation.navigate('RequesterDashboard')
            }
          ]
        );
      } else {
        setError(res.error || 'Failed to complete fulfillment.');
      }
    } catch (err: any) {
      setError(err.message || 'Error communicating with fulfillment server.');
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
        title="Confirm Blood Received"
        subtitle="Stage 5: Request Fulfillment"
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <MedicalDisclaimerBanner />

        <Card variant="elevated" style={styles.summaryCard}>
          <View style={styles.iconCircle}>
            <Ionicons name="heart-circle" size={40} color={THEME.colors.primary} />
          </View>
          <Text style={styles.title}>Confirm Life-Saving Transfusion</Text>
          <Text style={styles.desc}>
            Confirming fulfillment formally completes the emergency request, credits the volunteer
            donor with reward points, and activates the mandatory 90-day medical cooldown.
          </Text>

          <View style={styles.donorPill}>
            <Ionicons name="person" size={16} color={THEME.colors.primary} />
            <Text style={styles.donorPillText}>Assigned Donor: {donorName || 'Matched Donor'}</Text>
          </View>
        </Card>

        {error && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={18} color={THEME.colors.urgent} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <Input
          label="Actual Units of Blood Received *"
          placeholder="e.g. 1"
          keyboardType="number-pad"
          value={unitsReceived}
          onChangeText={setUnitsReceived}
        />

        <Input
          label="Hospital Verification / Gratitude Notes"
          placeholder="e.g. Received at SMS Hospital Blood Bank. Successful transfusion. Gratitude to the donor!"
          multiline
          numberOfLines={3}
          value={hospitalNotes}
          onChangeText={setHospitalNotes}
          style={{ height: 80, textAlignVertical: 'top' }}
        />

        <Button
          title="Sign & Complete Fulfillment"
          variant="primary"
          size="lg"
          loading={loading}
          icon={<Ionicons name="shield-checkmark" size={18} color="#FFFFFF" />}
          onPress={handleFulfill}
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
  summaryCard: {
    alignItems: 'center',
    padding: 20,
    marginBottom: 16
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: THEME.colors.crimsonLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.navy,
    marginBottom: 6,
    textAlign: 'center'
  },
  desc: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 14
  },
  donorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.crimsonLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: THEME.borderRadius.round,
    gap: 6
  },
  donorPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.primary
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

