import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Linking,
  TouchableOpacity,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../../constants/theme';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { LoadingScreen } from '../../components/LoadingScreen';
import { api } from '../../services/api';

export const ConsentScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [contactConsent, setContactConsent] = useState(true);
  const [telegramStatus, setTelegramStatus] = useState<any>(null);
  const [linkCode, setLinkCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [togglingConsent, setTogglingConsent] = useState(false);
  const [generatingCode, setGeneratingCode] = useState(false);

  const fetchStatus = async () => {
    try {
      const [profileRes, tgRes] = await Promise.allSettled([
        api.donors.getProfile(),
        api.telegram.getStatus()
      ]);

      if (profileRes.status === 'fulfilled' && profileRes.value.success) {
        const p = profileRes.value.profile || profileRes.value.donor;
        if (p) setContactConsent(p.consent_to_contact !== false);
      }

      if (tgRes.status === 'fulfilled' && tgRes.value.success) {
        setTelegramStatus(tgRes.value);
      }
    } catch (err: any) {
      console.warn('Error fetching consent state:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleToggleContactConsent = async (val: boolean) => {
    try {
      setTogglingConsent(true);
      if (val) {
        await api.donors.grantConsent();
      } else {
        await api.donors.withdrawConsent();
      }
      setContactConsent(val);
      Alert.alert(
        val ? 'Consent Granted' : 'Consent Withdrawn',
        val
          ? 'You have consented to receive emergency contact calls from hospital coordinators when your blood is requested.'
          : 'You have withdrawn contact consent. Your profile will be suppressed from emergency matches until consent is re-granted.'
      );
    } catch (err: any) {
      Alert.alert('Consent Error', err.message);
    } finally {
      setTogglingConsent(false);
    }
  };

  const handleGenerateTelegramCode = async () => {
    try {
      setGeneratingCode(true);
      const res = await api.telegram.getLinkCode();
      if (res.success && res.link_code) {
        setLinkCode(res.link_code);
        Alert.alert(
          'Telegram Link Code Ready',
          `Use this one-time code in Telegram:\n\n${res.link_code}\n\nSend "/start ${res.link_code}" to the BloodBridge Emergency Bot.`
        );
      } else {
        Alert.alert('Telegram Link Notice', res.error || 'Failed to generate link code.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setGeneratingCode(false);
    }
  };

  const handleToggleTelegramConsent = async (val: boolean) => {
    try {
      const res = await api.telegram.updateConsent(val);
      if (res.success) {
        fetchStatus();
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const handleUnlinkTelegram = () => {
    Alert.alert(
      'Unlink Telegram Bot',
      'Are you sure you want to unlink your Telegram account from BloodBridge emergency alerts?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unlink',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await api.telegram.unlink();
              if (res.success) {
                Alert.alert('Unlinked', 'Telegram notifications have been disconnected.');
                fetchStatus();
              }
            } catch (err: any) {
              Alert.alert('Error', err.message);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return <LoadingScreen message="Loading consent and integration settings..." />;
  }

  const isTelegramLinked = telegramStatus?.linked || Boolean(telegramStatus?.telegram_chat_id);

  return (
    <View style={styles.container}>
      <Header
        title="Consent & Notifications"
        subtitle="Emergency Channels & Privacy"
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Contact Consent Master Switch */}
        <Card variant="elevated" style={styles.card}>
          <View style={styles.cardRow}>
            <View style={styles.infoCol}>
              <Text style={styles.cardTitle}>Emergency Contact Consent</Text>
              <Text style={styles.cardDesc}>
                Allow BloodBridge to share your availability and request your consent when nearby
                critical patients require your compatible blood group.
              </Text>
            </View>
            <Switch
              value={contactConsent}
              onValueChange={handleToggleContactConsent}
              disabled={togglingConsent}
              trackColor={{ false: '#CBD5E1', true: THEME.colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
          <View style={styles.statusRow}>
            <Badge
              label={contactConsent ? 'CONSENT ACTIVE' : 'CONSENT WITHDRAWN'}
              variant={contactConsent ? 'success' : 'critical'}
              size="sm"
            />
          </View>
        </Card>

        {/* Telegram Emergency Alerts Channel */}
        <Card variant="elevated" style={styles.card}>
          <View style={styles.channelHeader}>
            <View style={styles.tgIconBadge}>
              <Ionicons name="send" size={20} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Telegram Emergency Alerts</Text>
              <Text style={styles.cardDesc}>
                Receive 1-second instant dispatch alerts with interactive Accept/Decline buttons on
                Telegram.
              </Text>
            </View>
            <Badge
              label={isTelegramLinked ? 'LINKED' : 'NOT LINKED'}
              variant={isTelegramLinked ? 'success' : 'neutral'}
              size="sm"
            />
          </View>

          {isTelegramLinked ? (
            <View style={styles.linkedSection}>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Telegram Alert Broadcasts:</Text>
                <Switch
                  value={telegramStatus?.telegram_alerts_enabled !== false}
                  onValueChange={handleToggleTelegramConsent}
                  trackColor={{ false: '#CBD5E1', true: THEME.colors.success }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <Button
                title="Unlink Telegram Account"
                variant="outline"
                size="sm"
                onPress={handleUnlinkTelegram}
                style={{ marginTop: 10 }}
              />
            </View>
          ) : (
            <View style={styles.unlinkedSection}>
              {linkCode ? (
                <View style={styles.codeBox}>
                  <Text style={styles.codeLabel}>One-Time Link Code:</Text>
                  <Text style={styles.codeText}>{linkCode}</Text>
                  <Text style={styles.codeInstructions}>
                    Open Telegram, search for the BloodBridge bot, and send:
                    {'\n'}
                    <Text style={{ fontWeight: '800' }}>/start {linkCode}</Text>
                  </Text>
                </View>
              ) : (
                <Button
                  title="Generate Telegram One-Time Link Code"
                  variant="primary"
                  icon={<Ionicons name="key-outline" size={18} color="#FFFFFF" />}
                  loading={generatingCode}
                  onPress={handleGenerateTelegramCode}
                  style={{ marginTop: 10 }}
                />
              )}
            </View>
          )}
        </Card>

        {/* Data Rights Card */}
        <Card variant="outlined" style={styles.rightsCard}>
          <View style={styles.rightsHeader}>
            <Ionicons name="shield-checkmark" size={18} color={THEME.colors.primary} />
            <Text style={styles.rightsTitle}>Your Consent Rights</Text>
          </View>
          <Text style={styles.rightsText}>
            You retain absolute ownership of your donor participation. Withdrawing consent
            immediately purges your record from active matching queues with zero penalty.
          </Text>
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
  card: {
    padding: 16,
    marginBottom: 14
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between'
  },
  infoCol: {
    flex: 1,
    marginRight: 10
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.navy
  },
  cardDesc: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 4,
    lineHeight: 17
  },
  statusRow: {
    marginTop: 10
  },
  channelHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start'
  },
  tgIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0088cc',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10
  },
  linkedSection: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.borderLight
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  switchLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.navy
  },
  unlinkedSection: {
    marginTop: 10
  },
  codeBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: THEME.borderRadius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight
  },
  codeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textMuted
  },
  codeText: {
    fontSize: 20,
    fontWeight: '900',
    color: THEME.colors.primary,
    marginVertical: 4
  },
  codeInstructions: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    lineHeight: 16
  },
  rightsCard: {
    padding: 14,
    backgroundColor: '#F8FAFC'
  },
  rightsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6
  },
  rightsTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.colors.navy,
    marginLeft: 6
  },
  rightsText: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    lineHeight: 16
  }
});

