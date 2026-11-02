import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../../constants/theme';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { LoadingScreen } from '../../components/LoadingScreen';
import { api } from '../../services/api';
import { CooldownStatus } from '../../constants/types';

export const AvailabilityScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [available, setAvailable] = useState(true);
  const [cooldown, setCooldown] = useState<CooldownStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  const fetchData = async () => {
    try {
      const [pRes, cRes] = await Promise.allSettled([
        api.donors.getProfile(),
        api.donors.getCooldownStatus()
      ]);

      if (pRes.status === 'fulfilled' && pRes.value.success) {
        const p = pRes.value.profile || pRes.value.donor;
        if (p) setAvailable(p.availability_status === 'available');
      }

      if (cRes.status === 'fulfilled' && cRes.value.success) {
        setCooldown(cRes.value as unknown as CooldownStatus);
      }
    } catch (err: any) {
      console.warn('Error fetching availability:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleToggle = async (val: boolean) => {
    try {
      setToggling(true);
      const res = await api.donors.toggleAvailability(val ? 'available' : 'unavailable');
      if (res.success) {
        setAvailable(val);
      } else {
        Alert.alert('Notice', res.error || 'Failed to update availability.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setToggling(false);
    }
  };

  if (loading) {
    return <LoadingScreen message="Checking availability state..." />;
  }

  return (
    <View style={styles.container}>
      <Header
        title="Availability Management"
        subtitle="Emergency Dispatch Readiness"
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Master Switch Card */}
        <Card variant="elevated" style={styles.switchCard}>
          <View style={styles.switchRow}>
            <View style={styles.switchInfo}>
              <Text style={styles.switchTitle}>Emergency Dispatch Status</Text>
              <Text style={styles.switchSubtitle}>
                {available
                  ? 'Your profile is active. You will receive real-time notifications for matching emergencies.'
                  : 'Availability is paused. You will not be alerted for blood requests.'}
              </Text>
            </View>
            <Switch
              value={available}
              onValueChange={handleToggle}
              disabled={toggling}
              trackColor={{ false: '#CBD5E1', true: THEME.colors.success }}
              thumbColor="#FFFFFF"
            />
          </View>
        </Card>

        {/* Cooldown Information Card */}
        {cooldown?.inCooldown ? (
          <Card variant="elevated" style={styles.cooldownCard}>
            <View style={styles.cooldownHeader}>
              <Ionicons name="time" size={20} color={THEME.colors.cooldown} />
              <Text style={styles.cooldownTitle}>Medical Cooldown Countdown</Text>
            </View>
            <Text style={styles.cooldownDays}>{cooldown.daysRemaining} Days Left</Text>
            <Text style={styles.cooldownText}>
              Following your last donation on{' '}
              {cooldown.lastDonationDate
                ? new Date(cooldown.lastDonationDate).toLocaleDateString()
                : 'record'}
              , our clinical safety engine automatically suppresses alert dispatch until full
              erythrocyte recovery ({new Date(cooldown.cooldownUntil || '').toLocaleDateString()}).
            </Text>
          </Card>
        ) : (
          <Card variant="outlined" style={styles.safeCard}>
            <View style={styles.cooldownHeader}>
              <Ionicons name="shield-checkmark" size={20} color={THEME.colors.success} />
              <Text style={[styles.cooldownTitle, { color: THEME.colors.success }]}>
                Full Medical Eligibility
              </Text>
            </View>
            <Text style={styles.cooldownText}>
              No cooldown restrictions active. You are eligible to donate whole blood when an
              emergency arises.
            </Text>
          </Card>
        )}

        {/* Monthly Availability Reward Notice */}
        <Card variant="outlined" style={styles.rewardNoticeCard}>
          <View style={styles.rewardRow}>
            <Ionicons name="gift" size={22} color={THEME.colors.gold} />
            <View style={styles.rewardTextCol}>
              <Text style={styles.rewardTitle}>Monthly Active Availability Bonus</Text>
              <Text style={styles.rewardDesc}>
                Donors who maintain active availability throughout the month receive +25 Life Saver
                points claimable in your Credit Wallet.
              </Text>
            </View>
          </View>
          <Button
            title="Open Credit Wallet"
            variant="outline"
            size="sm"
            onPress={() => navigation.navigate('CreditWallet')}
            style={{ marginTop: 10 }}
          />
        </Card>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background
  },
  scrollContent: {
    padding: THEME.spacing.base
  },
  switchCard: {
    padding: 16,
    marginBottom: 14
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  switchInfo: {
    flex: 1,
    marginRight: 12
  },
  switchTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.navy
  },
  switchSubtitle: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 4,
    lineHeight: 17
  },
  cooldownCard: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
    padding: 16,
    marginBottom: 14
  },
  safeCard: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    padding: 16,
    marginBottom: 14
  },
  cooldownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6
  },
  cooldownTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.cooldown,
    marginLeft: 8
  },
  cooldownDays: {
    fontSize: 24,
    fontWeight: '900',
    color: THEME.colors.cooldown,
    marginBottom: 6
  },
  cooldownText: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    lineHeight: 17
  },
  rewardNoticeCard: {
    backgroundColor: '#FFFDF9',
    borderColor: '#FDE68A',
    padding: 14
  },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start'
  },
  rewardTextCol: {
    flex: 1,
    marginLeft: 10
  },
  rewardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.colors.navy
  },
  rewardDesc: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: 2,
    lineHeight: 16
  }
});
