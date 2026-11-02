import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
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
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { CooldownStatus, ContactRequest } from '../../constants/types';

export const DonorDashboardScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useAuth();

  const [available, setAvailable] = useState<boolean>(true);
  const [cooldown, setCooldown] = useState<CooldownStatus | null>(null);
  const [contactRequests, setContactRequests] = useState<ContactRequest[]>([]);
  const [creditBalance, setCreditBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [togglingAvail, setTogglingAvail] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [profileRes, cooldownRes, crRes, balRes] = await Promise.allSettled([
        api.donors.getProfile(),
        api.donors.getCooldownStatus(),
        api.donors.getContactRequests(),
        api.credits.getBalance()
      ]);

      if (profileRes.status === 'fulfilled' && profileRes.value.success) {
        const p = profileRes.value.profile || profileRes.value.donor;
        if (p) {
          setAvailable(p.availability_status === 'available');
        }
      }

      if (cooldownRes.status === 'fulfilled' && cooldownRes.value.success) {
        setCooldown(cooldownRes.value as unknown as CooldownStatus);
      }

      if (crRes.status === 'fulfilled' && crRes.value.success) {
        setContactRequests(crRes.value.contact_requests || []);
      }

      if (balRes.status === 'fulfilled' && balRes.value.success) {
        setCreditBalance(balRes.value.balance || 0);
      }
    } catch (err: any) {
      console.warn('Error fetching donor dashboard:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleToggleAvailability = async (value: boolean) => {
    try {
      setTogglingAvail(true);
      const newStatus = value ? 'available' : 'unavailable';
      const res = await api.donors.toggleAvailability(newStatus);
      if (res.success) {
        setAvailable(value);
        Alert.alert(
          value ? 'Status: Available' : 'Status: Paused',
          value
            ? 'You will receive emergency contact requests when nearby patients require your blood group.'
            : 'Your availability has been temporarily paused. Emergency dispatches will not alert you.'
        );
      } else {
        Alert.alert('Status Update Notice', res.error || 'Failed to update availability.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setTogglingAvail(false);
    }
  };

  if (loading && !refreshing) {
    return <LoadingScreen message="Loading Donor Command Center..." />;
  }

  const pendingRequests = contactRequests.filter((c) => c.status === 'sent');

  return (
    <View style={styles.container}>
      <Header
        title="Donor Command Center"
        subtitle="Volunteer Life Saver Hub"
        rightAction={
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => navigation.navigate('Notifications')}
          >
            <Ionicons name="notifications-outline" size={22} color={THEME.colors.navy} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={THEME.colors.primary}
          />
        }
      >
        {/* Donor Hero Profile Card */}
        <Card variant="elevated" style={styles.heroCard}>
          <View style={styles.heroRow}>
            <View style={styles.bloodCircle}>
              <Text style={styles.bloodGroupText}>{user?.blood_group || 'O+'}</Text>
            </View>
            <View style={styles.heroInfo}>
              <Text style={styles.donorName}>{user?.name || 'Volunteer Donor'}</Text>
              <Text style={styles.locationText}>
                {user?.city || 'Jaipur'}, {user?.area || 'Active Zone'}
              </Text>
              <View style={styles.tagRow}>
                <Badge label="VERIFIED DONOR" variant="success" size="sm" />
                <Badge label="Whole Blood" variant="neutral" size="sm" />
              </View>
            </View>
          </View>
        </Card>

        {/* Live Availability Toggle Bar */}
        <Card variant="elevated" style={styles.availCard}>
          <View style={styles.availRow}>
            <View style={styles.availInfo}>
              <View style={styles.statusIndicatorRow}>
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: available ? THEME.colors.success : THEME.colors.textLight }
                  ]}
                />
                <Text style={styles.availTitle}>
                  {available ? 'Ready for Emergency Alerts' : 'Availability Paused'}
                </Text>
              </View>
              <Text style={styles.availSubtitle}>
                {available
                  ? 'Active in spatial dispatch pool for nearby patients'
                  : 'You will not receive urgent notifications'}
              </Text>
            </View>
            <Switch
              value={available}
              onValueChange={handleToggleAvailability}
              disabled={togglingAvail}
              trackColor={{ false: '#CBD5E1', true: THEME.colors.success }}
              thumbColor="#FFFFFF"
            />
          </View>
        </Card>

        {/* 3-Month Clinical Cooldown Status Card */}
        {cooldown?.inCooldown ? (
          <Card variant="elevated" style={styles.cooldownActiveCard}>
            <View style={styles.cooldownHeader}>
              <Ionicons name="time" size={22} color={THEME.colors.cooldown} />
              <Text style={styles.cooldownTitle}>Medical Cooldown Active</Text>
            </View>
            <Text style={styles.cooldownDays}>
              {cooldown.daysRemaining} Days Remaining
            </Text>
            <Text style={styles.cooldownDesc}>
              Per medical safety guidelines, whole blood donors observe a mandatory 90-day recovery
              period. You will be eligible for donation on{' '}
              {cooldown.cooldownUntil
                ? new Date(cooldown.cooldownUntil).toLocaleDateString()
                : 'next cycle'}
              .
            </Text>
          </Card>
        ) : (
          <Card variant="outlined" style={styles.cooldownSafeCard}>
            <View style={styles.cooldownHeader}>
              <Ionicons name="checkmark-circle" size={20} color={THEME.colors.success} />
              <Text style={[styles.cooldownTitle, { color: THEME.colors.success }]}>
                Eligible to Donate (Zero Cooldown)
              </Text>
            </View>
            <Text style={styles.cooldownDesc}>
              You are in optimal medical standing. When emergency alerts match your compatible
              group, notifications will be routed immediately.
            </Text>
          </Card>
        )}

        {/* Pending Contact Requests Alert */}
        {pendingRequests.length > 0 && (
          <Card variant="urgent" style={styles.pendingCard}>
            <View style={styles.pendingHeader}>
              <Ionicons name="alert-circle" size={22} color={THEME.colors.urgent} />
              <Text style={styles.pendingTitle}>
                {pendingRequests.length} Emergency Request{pendingRequests.length > 1 ? 's' : ''} Awaiting Response!
              </Text>
            </View>
            <Text style={styles.pendingDesc}>
              A hospital nearby has issued an emergency blood requirement matching your group.
            </Text>
            <Button
              title="Review & Respond to Requests"
              variant="primary"
              size="md"
              icon={<Ionicons name="arrow-forward" size={16} color="#FFFFFF" />}
              onPress={() => navigation.navigate('ContactRequests')}
              style={{ marginTop: 10 }}
            />
          </Card>
        )}

        {/* Life Saver Credit Points Summary */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => navigation.navigate('CreditWallet')}
        >
          <Card variant="elevated" style={styles.creditsCard}>
            <View style={styles.creditsRow}>
              <View style={styles.creditsIconCircle}>
                <Ionicons name="sparkles" size={24} color={THEME.colors.gold} />
              </View>
              <View style={styles.creditsTextCol}>
                <Text style={styles.creditsLabel}>Life Saver Points Balance</Text>
                <Text style={styles.creditsNum}>{creditBalance} pts</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={THEME.colors.textMuted} />
            </View>
          </Card>
        </TouchableOpacity>

        {/* Quick Actions Grid */}
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('DonationConfirmation')}
          >
            <Ionicons name="add-circle-outline" size={24} color={THEME.colors.primary} />
            <Text style={styles.actionBtnText}>Record Donation</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('Consent')}
          >
            <Ionicons name="send-outline" size={24} color={THEME.colors.navy} />
            <Text style={styles.actionBtnText}>Telegram Alerts</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('AIAssistant')}
          >
            <Ionicons name="sparkles-outline" size={24} color={THEME.colors.gold} />
            <Text style={styles.actionBtnText}>Ask AI Assistant</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.card,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight
  },
  scrollContent: {
    padding: THEME.spacing.base
  },
  heroCard: {
    padding: 16,
    marginBottom: 12
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  bloodCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    ...THEME.shadows.emergency
  },
  bloodGroupText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF'
  },
  heroInfo: {
    flex: 1
  },
  donorName: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.navy
  },
  locationText: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 2,
    marginBottom: 6
  },
  tagRow: {
    flexDirection: 'row',
    gap: 6
  },
  availCard: {
    padding: 14,
    marginBottom: 12
  },
  availRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  availInfo: {
    flex: 1,
    marginRight: 10
  },
  statusIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6
  },
  availTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.navy
  },
  availSubtitle: {
    fontSize: 11,
    color: THEME.colors.textMuted
  },
  cooldownActiveCard: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
    padding: 14,
    marginBottom: 12
  },
  cooldownSafeCard: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    padding: 14,
    marginBottom: 12
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
    fontSize: 22,
    fontWeight: '900',
    color: THEME.colors.cooldown,
    marginBottom: 4
  },
  cooldownDesc: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    lineHeight: 16
  },
  pendingCard: {
    padding: 14,
    marginBottom: 12
  },
  pendingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6
  },
  pendingTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.urgent,
    marginLeft: 8
  },
  pendingDesc: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    lineHeight: 16
  },
  creditsCard: {
    padding: 14,
    marginBottom: 14,
    backgroundColor: '#FFFDF9',
    borderColor: '#FDE68A'
  },
  creditsRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  creditsIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: THEME.colors.goldBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  creditsTextCol: {
    flex: 1
  },
  creditsLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textMuted
  },
  creditsNum: {
    fontSize: 20,
    fontWeight: '900',
    color: THEME.colors.navy
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24
  },
  actionBtn: {
    flex: 1,
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.borderRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
    ...THEME.shadows.sm
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.navy,
    marginTop: 6,
    textAlign: 'center'
  }
});
