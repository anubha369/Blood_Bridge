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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const DonorDashboardScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
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
            ? 'You will receive emergency contact requests when nearby patients require your compatible blood group.'
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

  const getInitials = (name?: string) => {
    if (!name) return 'D';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  if (loading && !refreshing) {
    return <LoadingScreen message="Loading Donor Command Center..." />;
  }

  const pendingRequests = contactRequests.filter((c) => c.status === 'sent');

  return (
    <View style={styles.container}>
      <Header
        showBrand
        rightAction={
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => navigation.navigate('Notifications')}
          >
            <Ionicons name="notifications-outline" size={20} color={THEME.colors.navy} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={THEME.colors.primary}
          />
        }
      >
        {/* User Portal Header Bar */}
        <View style={styles.userPortalBar}>
          <View style={styles.userProfilePill}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{getInitials(user?.name)}</Text>
            </View>
            <View style={styles.userTextCol}>
              <Text style={styles.userDisplayName} numberOfLines={1}>{user?.name || 'Donor'}</Text>
              <Text style={styles.userRoleTag}>VERIFIED VOLUNTEER DONOR</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.pointsBadge}
            onPress={() => navigation.navigate('CreditWallet')}
            activeOpacity={0.8}
          >
            <Ionicons name="trophy" size={14} color="#D97706" />
            <Text style={styles.pointsBadgeText}>{creditBalance} Pts</Text>
          </TouchableOpacity>
        </View>

        {/* Donor Profile Hero Card */}
        <Card variant="elevated" style={styles.heroCard}>
          <View style={styles.heroRow}>
            <View style={styles.bloodCircle}>
              <Text style={styles.bloodGroupText}>{user?.blood_group || 'O+'}</Text>
            </View>
            <View style={styles.heroInfo}>
              <Text style={styles.donorName}>{user?.name || 'Volunteer Donor'}</Text>
              <Text style={styles.locationText}>
                {user?.city ? `Registered in ${user.city}` : 'Jaipur, Rajasthan'}
              </Text>
              <View style={styles.tagRow}>
                <Badge label="VERIFIED DONOR" variant="verified" size="sm" />
                <Badge label="NBTC ALIGNED" variant="neutral" size="sm" />
              </View>
            </View>
          </View>
        </Card>

        {/* Availability Toggle */}
        <Card variant="elevated" style={styles.availCard}>
          <View style={styles.availRow}>
            <View style={styles.availInfo}>
              <View style={styles.statusIndicatorRow}>
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: available ? THEME.colors.success : THEME.colors.slate400 }
                  ]}
                />
                <Text style={styles.availTitle}>
                  {available ? 'Available for Emergency Dispatch' : 'Availability Paused'}
                </Text>
              </View>
              <Text style={styles.availSubtitle}>
                {available
                  ? 'You will be alerted if patients nearby match your blood group.'
                  : 'You will not receive emergency notifications while paused.'}
              </Text>
            </View>
            <Switch
              value={available}
              onValueChange={handleToggleAvailability}
              disabled={togglingAvail}
              trackColor={{ false: THEME.colors.slate300, true: '#BBF7D0' }}
              thumbColor={available ? THEME.colors.success : '#FFFFFF'}
            />
          </View>
        </Card>

        {/* Clinical Cooldown Status */}
        {cooldown && !cooldown.can_donate ? (
          <Card variant="elevated" style={styles.cooldownActiveCard}>
            <View style={styles.cooldownHeader}>
              <Ionicons name="time" size={20} color={THEME.colors.cooldown} />
              <Text style={styles.cooldownTitle}>90-Day Clinical Recovery Cooldown</Text>
            </View>
            <Text style={styles.cooldownDays}>
              {cooldown.days_remaining} Days Remaining
            </Text>
            <Text style={styles.cooldownDesc}>
              Medical guidelines enforce a mandatory 90-day cooldown between whole-blood donations
              to allow complete red blood cell and iron replenishment.
            </Text>
          </Card>
        ) : (
          <Card variant="elevated" style={styles.cooldownSafeCard}>
            <View style={styles.cooldownHeader}>
              <Ionicons name="checkmark-circle" size={20} color={THEME.colors.success} />
              <Text style={[styles.cooldownTitle, { color: THEME.colors.success }]}>
                Clinically Eligible to Donate
              </Text>
            </View>
            <Text style={styles.cooldownDesc}>
              No active recovery cooldown. You are medically eligible for urgent patient matching.
            </Text>
          </Card>
        )}

        {/* Urgent Contact Requests Banner */}
        {pendingRequests.length > 0 && (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => navigation.navigate('ContactRequests')}
          >
            <Card variant="urgent" style={styles.pendingCard}>
              <View style={styles.pendingHeader}>
                <Ionicons name="alert-circle" size={20} color={THEME.colors.primary} />
                <Text style={styles.pendingTitle}>
                  {pendingRequests.length} Urgent Dispatch Alert(s)
                </Text>
              </View>
              <Text style={styles.pendingDesc}>
                Nearby patients urgently require your blood group. Tap to review patient details and
                respond.
              </Text>
            </Card>
          </TouchableOpacity>
        )}

        {/* Quick Actions Grid */}
        <Text style={styles.sectionHeading}>Donor Services</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('DonationConfirmation')}
          >
            <Ionicons name="calendar-outline" size={22} color={THEME.colors.primary} />
            <Text style={styles.actionBtnText}>Record Donation</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('Consent')}
          >
            <Ionicons name="paper-plane-outline" size={22} color={THEME.colors.navy} />
            <Text style={styles.actionBtnText}>Telegram Alerts</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('AIAssistant')}
          >
            <Ionicons name="sparkles-outline" size={22} color="#D97706" />
            <Text style={styles.actionBtnText}>Clinical AI</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.slate50
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.sm
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12
  },
  userPortalBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 16,
    padding: 10,
    marginBottom: 14,
    ...THEME.shadows.sm
  },
  userProfilePill: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: THEME.colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF'
  },
  userTextCol: {
    flex: 1
  },
  userDisplayName: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.navy
  },
  userRoleTag: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.slate500,
    marginTop: 1
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20
  },
  pointsBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#B45309'
  },
  heroCard: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 18
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  bloodCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
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
    fontWeight: '900',
    color: THEME.colors.navy
  },
  locationText: {
    fontSize: 12,
    color: THEME.colors.slate500,
    marginTop: 2,
    marginBottom: 6
  },
  tagRow: {
    flexDirection: 'row',
    gap: 6
  },
  availCard: {
    padding: 14,
    marginBottom: 12,
    borderRadius: 16
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
    color: THEME.colors.slate500
  },
  cooldownActiveCard: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
    padding: 14,
    marginBottom: 12,
    borderRadius: 16
  },
  cooldownSafeCard: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    padding: 14,
    marginBottom: 12,
    borderRadius: 16
  },
  cooldownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6
  },
  cooldownTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.colors.cooldown,
    marginLeft: 6
  },
  cooldownDays: {
    fontSize: 22,
    fontWeight: '900',
    color: THEME.colors.cooldown,
    marginBottom: 4
  },
  cooldownDesc: {
    fontSize: 12,
    color: THEME.colors.slate700,
    lineHeight: 16
  },
  pendingCard: {
    padding: 14,
    marginBottom: 12,
    borderRadius: 16
  },
  pendingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6
  },
  pendingTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.primary,
    marginLeft: 8
  },
  pendingDesc: {
    fontSize: 12,
    color: THEME.colors.slate700,
    lineHeight: 16
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '900',
    color: THEME.colors.navy,
    marginTop: 8,
    marginBottom: 10
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20
  },
  actionBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.border,
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
