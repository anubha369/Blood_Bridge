import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Switch,
  TouchableOpacity,
  Linking,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../../constants/theme';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { LoadingScreen } from '../../components/LoadingScreen';
import { MedicalDisclaimerBanner } from '../../components/MedicalDisclaimerBanner';
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
  const [telegramStatus, setTelegramStatus] = useState<any>(null);
  const [linkCodeData, setLinkCodeData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [togglingAvail, setTogglingAvail] = useState(false);
  const [generatingTgCode, setGeneratingTgCode] = useState(false);
  const [togglingTgConsent, setTogglingTgConsent] = useState(false);
  const [claimingMonthly, setClaimingMonthly] = useState(false);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [profileRes, cooldownRes, crRes, balRes, tgRes] = await Promise.allSettled([
        api.donors.getProfile(),
        api.donors.getCooldownStatus(),
        api.donors.getContactRequests(),
        api.credits.getBalance(),
        api.telegram.getStatus()
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
        setContactRequests(crRes.value.contact_requests || crRes.value.notifications || []);
      }

      if (balRes.status === 'fulfilled' && balRes.value.success) {
        setCreditBalance(balRes.value.balance || 0);
      }

      if (tgRes.status === 'fulfilled' && tgRes.value.success) {
        setTelegramStatus(tgRes.value);
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

  const handleRespondToRequest = async (
    requestId: string,
    action: 'accept' | 'declined'
  ) => {
    try {
      setRespondingId(requestId);
      const res = await api.donors.respondToContactRequest(requestId, action);
      if (res.success) {
        Alert.alert(
          action === 'accept' ? 'Emergency Request Accepted! 🩸' : 'Response Registered',
          action === 'accept'
            ? 'Thank you! The hospital requester has been alerted and will coordinate directly with you for arrival.'
            : 'You have declined this request. The alert has been removed.'
        );
        fetchData();
      } else {
        Alert.alert('Notice', res.error || 'Failed to submit response.');
      }
    } catch (err: any) {
      Alert.alert('Response Error', err.message);
    } finally {
      setRespondingId(null);
    }
  };

  const handleGenerateTelegramCode = async () => {
    try {
      setGeneratingTgCode(true);
      const res = await api.telegram.getLinkCode();
      if (res.success && res.link_code) {
        setLinkCodeData(res);
      } else {
        Alert.alert('Notice', res.error || 'Failed to generate link code.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setGeneratingTgCode(false);
    }
  };

  const handleToggleTelegramConsent = async (val: boolean) => {
    try {
      setTogglingTgConsent(true);
      const res = await api.telegram.updateConsent(val);
      if (res.success) {
        setTelegramStatus((prev: any) => ({
          ...prev,
          telegram_opt_in: val
        }));
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setTogglingTgConsent(false);
    }
  };

  const handleUnlinkTelegram = () => {
    Alert.alert(
      'Unlink Telegram Bot',
      'Are you sure you want to unlink your Telegram account? You will stop receiving instant emergency dispatch alerts on Telegram.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unlink',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await api.telegram.unlink();
              if (res.success) {
                setTelegramStatus((prev: any) => ({ ...prev, linked: false }));
                setLinkCodeData(null);
                Alert.alert('Unlinked', 'Telegram notifications disconnected.');
              }
            } catch (err: any) {
              Alert.alert('Error', err.message);
            }
          }
        }
      ]
    );
  };

  const handleClaimMonthlyReward = async () => {
    try {
      setClaimingMonthly(true);
      const res = await api.credits.checkMonthly();
      if (res.success) {
        Alert.alert('Monthly Availability Reward', res.message || 'Reward processed successfully.');
        const balRes = await api.credits.getBalance().catch(() => null);
        if (balRes && balRes.success) {
          setCreditBalance(balRes.balance || 0);
        }
      } else {
        Alert.alert('Reward Notice', res.error || res.message || 'Reward condition not yet met.');
      }
    } catch (err: any) {
      Alert.alert('Reward Notice', err.message || 'Error checking monthly reward.');
    } finally {
      setClaimingMonthly(false);
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
  const isTgLinked = telegramStatus?.linked || Boolean(telegramStatus?.telegram_chat_id);

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
        <MedicalDisclaimerBanner />

        {/* User Portal Header Bar */}
        <View style={styles.userPortalBar}>
          <View style={styles.userProfilePill}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{getInitials(user?.name)}</Text>
            </View>
            <View style={styles.userTextCol}>
              <Text style={styles.userDisplayName} numberOfLines={1}>
                {user?.name || 'Volunteer Donor'}
              </Text>
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

        {/* In-Line Incoming Emergency Dispatch Requests */}
        <View style={styles.sectionHeadingRow}>
          <Text style={styles.sectionHeading}>Emergency Dispatch Alerts</Text>
          {pendingRequests.length > 0 && (
            <Badge label={`${pendingRequests.length} URGENT`} variant="urgent" size="sm" />
          )}
        </View>

        {pendingRequests.length > 0 ? (
          pendingRequests.map((req, idx) => (
            <Card key={req.id || req.request_id || idx} variant="urgent" style={styles.requestCard}>
              <View style={styles.requestTopRow}>
                <View style={styles.requestBloodCircle}>
                  <Text style={styles.requestBloodText}>{req.blood_group || user?.blood_group || 'O+'}</Text>
                </View>
                <View style={styles.requestInfoCol}>
                  <Text style={styles.requestHospitalName}>
                    {req.hospital_name || 'Emergency Hospital'}
                  </Text>
                  <Text style={styles.requestPatientName}>
                    Patient: {req.patient_name || 'Emergency Patient'}
                  </Text>
                  <Text style={styles.requestChannelText}>
                    Units: {req.units_requested || 1} • Via {req.channel?.toUpperCase() || 'SYSTEM'}
                  </Text>
                </View>
                <Badge label="ALERT SENT" variant="urgent" size="sm" />
              </View>

              <View style={styles.requestPromptBox}>
                <Text style={styles.requestPromptText}>
                  Can you donate at this hospital within the requested timeframe?
                </Text>
                <View style={styles.requestBtnRow}>
                  <Button
                    title="Decline"
                    variant="outline"
                    size="sm"
                    loading={respondingId === (req.id || req.request_id)}
                    onPress={() => handleRespondToRequest(req.id || req.request_id, 'declined')}
                    style={{ flex: 1, marginRight: 8 }}
                  />
                  <Button
                    title="Accept to Help"
                    variant="primary"
                    size="sm"
                    icon={<Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />}
                    loading={respondingId === (req.id || req.request_id)}
                    onPress={() => handleRespondToRequest(req.id || req.request_id, 'accept')}
                    style={{ flex: 1.5 }}
                  />
                </View>
              </View>
            </Card>
          ))
        ) : (
          <Card variant="outlined" style={styles.noAlertsCard}>
            <View style={styles.noAlertsRow}>
              <Ionicons name="shield-checkmark" size={24} color={THEME.colors.success} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.noAlertsTitle}>No Active Emergency Alerts</Text>
                <Text style={styles.noAlertsDesc}>
                  You are registered and available. When a matching hospital creates an emergency
                  request nearby, you will receive an alert here and on Telegram.
                </Text>
              </View>
            </View>
          </Card>
        )}

        {/* Telegram Alerts Integration Card matching website */}
        <Card variant="elevated" style={styles.telegramCard}>
          <View style={styles.telegramHeaderRow}>
            <View style={styles.telegramIconCircle}>
              <Ionicons name="paper-plane" size={20} color="#0088CC" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.tgTitleRow}>
                <Text style={styles.telegramTitle}>Telegram Emergency Alerts</Text>
                {isTgLinked && (
                  <Badge label="CONNECTED" variant="success" size="sm" />
                )}
              </View>
              <Text style={styles.telegramSub}>
                {isTgLinked
                  ? 'Connected to @Blood_Bridgebot for zero-latency hospital dispatches.'
                  : 'Link your Telegram to receive instant alerts with 1-tap accept.'}
              </Text>
            </View>
          </View>

          {isTgLinked ? (
            <View style={styles.tgLinkedContent}>
              <View style={styles.tgHandleRow}>
                <Text style={styles.tgHandleLabel}>Linked Account:</Text>
                <Text style={styles.tgHandleValue}>
                  {telegramStatus.telegram_username ? `@${telegramStatus.telegram_username}` : 'Direct Telegram Bot'}
                </Text>
              </View>

              <View style={styles.tgConsentToggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.tgToggleTitle}>Instant Push Notifications</Text>
                  <Text style={styles.tgToggleDesc}>
                    Receive urgent hospital donor alerts in Telegram chat
                  </Text>
                </View>
                <Switch
                  value={telegramStatus.telegram_opt_in !== false}
                  onValueChange={handleToggleTelegramConsent}
                  disabled={togglingTgConsent}
                  trackColor={{ false: THEME.colors.slate300, true: '#BBF7D0' }}
                  thumbColor={telegramStatus.telegram_opt_in !== false ? THEME.colors.success : '#FFFFFF'}
                />
              </View>

              <View style={styles.tgBtnRow}>
                <TouchableOpacity
                  style={styles.tgOpenBtn}
                  onPress={() => Linking.openURL('https://t.me/Blood_Bridgebot')}
                >
                  <Ionicons name="chatbubble-ellipses-outline" size={16} color="#0088CC" />
                  <Text style={styles.tgOpenBtnText}>Open @Blood_Bridgebot</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.tgUnlinkBtn}
                  onPress={handleUnlinkTelegram}
                >
                  <Ionicons name="link-outline" size={16} color={THEME.colors.urgent} />
                  <Text style={styles.tgUnlinkBtnText}>Unlink</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.tgUnlinkedContent}>
              {linkCodeData ? (
                <View style={styles.codeDisplayBox}>
                  <Text style={styles.codeInstruction}>
                    Send this one-time code to <Text style={styles.bold}>@Blood_Bridgebot</Text>:
                  </Text>
                  <View style={styles.codePill}>
                    <Text style={styles.codeText}>{linkCodeData.link_code}</Text>
                  </View>
                  <Text style={styles.codeExpiry}>
                    Code valid for {linkCodeData.expires_in_minutes || 15} minutes
                  </Text>
                  <Button
                    title="Open Bot in Telegram"
                    variant="primary"
                    size="sm"
                    icon={<Ionicons name="paper-plane" size={16} color="#FFFFFF" />}
                    onPress={() =>
                      Linking.openURL(
                        `https://t.me/Blood_Bridgebot?start=${linkCodeData.link_code}`
                      )
                    }
                    style={{ marginTop: 10 }}
                  />
                </View>
              ) : (
                <Button
                  title="Connect Telegram Alerts"
                  variant="outline"
                  size="sm"
                  loading={generatingTgCode}
                  icon={<Ionicons name="paper-plane-outline" size={16} color={THEME.colors.primary} />}
                  onPress={handleGenerateTelegramCode}
                  style={{ marginTop: 10 }}
                />
              )}
            </View>
          )}
        </Card>

        {/* Life Saver Rewards Monthly Claim Card */}
        <Card variant="elevated" style={styles.rewardsCard}>
          <View style={styles.rewardsHeader}>
            <View style={styles.rewardsIconCircle}>
              <Ionicons name="trophy" size={20} color="#D97706" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rewardsTitle}>Life Saver Availability Reward</Text>
              <Text style={styles.rewardsSub}>
                Maintain active readiness for 30 consecutive days to earn +50 points.
              </Text>
            </View>
          </View>

          <Button
            title="Check Monthly Bonus (+50 Pts)"
            variant="outline"
            size="sm"
            loading={claimingMonthly}
            icon={<Ionicons name="sparkles" size={16} color="#D97706" />}
            onPress={handleClaimMonthlyReward}
            style={{ marginTop: 10, borderColor: '#FDE68A' }}
          />
        </Card>

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
            onPress={() => navigation.navigate('CreditWallet')}
          >
            <Ionicons name="gift-outline" size={22} color="#059669" />
            <Text style={styles.actionBtnText}>Rewards</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('Consent')}
          >
            <Ionicons name="shield-outline" size={22} color={THEME.colors.navy} />
            <Text style={styles.actionBtnText}>Consent</Text>
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
  sectionHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 10
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '900',
    color: THEME.colors.navy
  },
  requestCard: {
    padding: 14,
    marginBottom: 12,
    borderRadius: 16
  },
  requestTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10
  },
  requestBloodCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10
  },
  requestBloodText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF'
  },
  requestInfoCol: {
    flex: 1
  },
  requestHospitalName: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.navy
  },
  requestPatientName: {
    fontSize: 12,
    color: THEME.colors.slate600,
    marginTop: 1
  },
  requestChannelText: {
    fontSize: 11,
    color: THEME.colors.slate400,
    marginTop: 2
  },
  requestPromptBox: {
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
    paddingTop: 10
  },
  requestPromptText: {
    fontSize: 12,
    color: THEME.colors.slate700,
    marginBottom: 8
  },
  requestBtnRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  noAlertsCard: {
    padding: 14,
    marginBottom: 12,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: THEME.colors.border
  },
  noAlertsRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  noAlertsTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.colors.navy
  },
  noAlertsDesc: {
    fontSize: 11,
    color: THEME.colors.slate500,
    marginTop: 2,
    lineHeight: 15
  },
  telegramCard: {
    padding: 14,
    marginBottom: 12,
    borderRadius: 16
  },
  telegramHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  telegramIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center'
  },
  tgTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  telegramTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.navy
  },
  telegramSub: {
    fontSize: 11,
    color: THEME.colors.slate500,
    marginTop: 2
  },
  tgLinkedContent: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
    paddingTop: 10
  },
  tgHandleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  tgHandleLabel: {
    fontSize: 12,
    color: THEME.colors.slate600
  },
  tgHandleValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0088CC'
  },
  tgConsentToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginTop: 4
  },
  tgToggleTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.navy
  },
  tgToggleDesc: {
    fontSize: 10,
    color: THEME.colors.slate500
  },
  tgBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    gap: 10
  },
  tgOpenBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD'
  },
  tgOpenBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0088CC'
  },
  tgUnlinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3'
  },
  tgUnlinkBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.urgent
  },
  tgUnlinkedContent: {
    marginTop: 8
  },
  codeDisplayBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: THEME.colors.border
  },
  codeInstruction: {
    fontSize: 11,
    color: THEME.colors.slate600,
    marginBottom: 6
  },
  codePill: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: THEME.colors.primary,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  codeText: {
    fontSize: 18,
    fontWeight: '900',
    color: THEME.colors.primary,
    letterSpacing: 2
  },
  codeExpiry: {
    fontSize: 10,
    color: THEME.colors.slate400,
    marginTop: 4,
    textAlign: 'center'
  },
  bold: {
    fontWeight: '800',
    color: THEME.colors.navy
  },
  rewardsCard: {
    padding: 14,
    marginBottom: 12,
    borderRadius: 16
  },
  rewardsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  rewardsIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFFBEB',
    alignItems: 'center',
    justifyContent: 'center'
  },
  rewardsTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.colors.navy
  },
  rewardsSub: {
    fontSize: 11,
    color: THEME.colors.slate500,
    marginTop: 1
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20
  },
  actionBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.sm
  },
  actionBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.navy,
    marginTop: 5,
    textAlign: 'center'
  }
});
