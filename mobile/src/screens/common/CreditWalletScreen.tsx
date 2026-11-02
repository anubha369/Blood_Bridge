import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
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
import { CreditTransaction, CreditCatalogItem } from '../../constants/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const CreditWalletScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [balance, setBalance] = useState<number>(0);
  const [lifetimeEarned, setLifetimeEarned] = useState<number>(0);
  const [tier, setTier] = useState<string>('Bronze');
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [catalog, setCatalog] = useState<CreditCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [checkingMonthly, setCheckingMonthly] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [walletRes, catalogRes] = await Promise.allSettled([
        api.credits.getWallet(),
        api.credits.getCatalog()
      ]);

      if (walletRes.status === 'fulfilled' && walletRes.value.success) {
        const w = walletRes.value;
        setBalance(w.balance || 0);
        setLifetimeEarned(w.lifetime_earned || w.balance || 0);
        setTier(w.tier || 'Life Saver');
        if (Array.isArray(w.recent_transactions)) {
          setTransactions(w.recent_transactions);
        }
      }

      if (catalogRes.status === 'fulfilled' && catalogRes.value.success) {
        setCatalog(catalogRes.value.catalog || []);
      }
    } catch (err: any) {
      console.warn('Error fetching credit wallet:', err.message);
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

  const handleClaimMonthly = async () => {
    try {
      setCheckingMonthly(true);
      const res = await api.credits.checkMonthly();
      if (res.success && res.awarded) {
        Alert.alert(
          'Monthly Availability Reward! 🌟',
          `+${res.points_awarded || 25} points added to your wallet for keeping your donor availability active.`
        );
        fetchData();
      } else {
        Alert.alert(
          'Monthly Reward Status',
          res.message || 'You have already claimed this month’s availability reward or are not currently eligible.'
        );
      }
    } catch (err: any) {
      Alert.alert('Monthly Check Error', err.message);
    } finally {
      setCheckingMonthly(false);
    }
  };

  const handleRedeem = (item: CreditCatalogItem) => {
    if (balance < item.points_cost) {
      Alert.alert(
        'Insufficient Points',
        `You need ${item.points_cost} points for this benefit. Your current balance is ${balance} points.`
      );
      return;
    }

    Alert.alert(
      'Confirm Redemption',
      `Redeem "${item.title}" for ${item.points_cost} Life Saver points?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              setRedeemingId(item.id);
              const res = await api.credits.redeem(item.id);
              if (res.success) {
                Alert.alert(
                  'Redemption Successful! 🎉',
                  `You have redeemed ${item.title}. Voucher details or partner code have been issued.`
                );
                fetchData();
              } else {
                Alert.alert('Redemption Failed', res.error || 'Could not redeem benefit.');
              }
            } catch (err: any) {
              Alert.alert('Error', err.message);
            } finally {
              setRedeemingId(null);
            }
          }
        }
      ]
    );
  };

  if (loading && !refreshing) {
    return <LoadingScreen message="Loading Life Saver Credit Wallet..." />;
  }

  return (
    <View style={styles.container}>
      <Header
        title="Life Saver Rewards"
        subtitle="Recognition & Community Points"
        showBack
        onBack={() => navigation.goBack()}
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
        {/* Figma Screen 8 Hero Header */}
        <View style={styles.figmaHeaderSection}>
          <View style={styles.eyebrowBadge}>
            <Ionicons name="trophy" size={12} color="#D97706" />
            <Text style={styles.eyebrowText}>LIFE SAVER REWARDS</Text>
          </View>
          <Text style={styles.figmaTitle}>Recognition, not payment</Text>
          <Text style={styles.figmaSubtitle}>
            Non-monetary appreciation honoring dedicated blood donors across India in accordance
            with NBTC ethical guidelines.
          </Text>
        </View>

        {/* Wallet Balance Card */}
        <Card variant="elevated" style={styles.walletCard}>
          <View style={styles.walletTop}>
            <View>
              <Text style={styles.walletLabel}>CURRENT AVAILABLE BALANCE</Text>
              <View style={styles.balanceRow}>
                <Text style={styles.balanceNum}>{balance}</Text>
                <Text style={styles.balanceUnit}>Life Saver Pts</Text>
              </View>
            </View>
            <View style={styles.tierBadge}>
              <Ionicons name="trophy" size={14} color="#D97706" />
              <Text style={styles.tierText}>{tier}</Text>
            </View>
          </View>

          <View style={styles.walletStatsRow}>
            <View style={styles.walletStatItem}>
              <Text style={styles.walletStatVal}>{lifetimeEarned} pts</Text>
              <Text style={styles.walletStatSub}>Lifetime Earned</Text>
            </View>
            <View style={styles.walletStatDivider} />
            <View style={styles.walletStatItem}>
              <Text style={styles.walletStatVal}>NBTC Altruistic</Text>
              <Text style={styles.walletStatSub}>100% Unpaid Rewards</Text>
            </View>
          </View>

          <Button
            title="Check Monthly Availability Reward (+25 Pts)"
            variant="primary"
            size="md"
            loading={checkingMonthly}
            onPress={handleClaimMonthly}
            style={styles.claimMonthlyBtn}
          />
        </Card>

        {/* Earning Rules Card */}
        <Card variant="outlined" style={styles.rulesCard}>
          <Text style={styles.rulesTitle}>HOW POINTS ARE AWARDED:</Text>
          <View style={styles.ruleItem}>
            <Ionicons name="checkmark-circle" size={15} color={THEME.colors.success} />
            <Text style={styles.ruleText}>+50 pts: Successful registration & phone verification</Text>
          </View>
          <View style={styles.ruleItem}>
            <Ionicons name="checkmark-circle" size={15} color={THEME.colors.success} />
            <Text style={styles.ruleText}>+100 pts: Confirmed clinical blood donation at verified hospital</Text>
          </View>
          <View style={styles.ruleItem}>
            <Ionicons name="checkmark-circle" size={15} color={THEME.colors.success} />
            <Text style={styles.ruleText}>+25 pts: Maintaining active availability status each calendar month</Text>
          </View>
        </Card>

        {/* Catalog Benefits */}
        {catalog.length > 0 && (
          <View>
            <Text style={styles.sectionHeader}>Redeemable Health Partner Benefits</Text>
            {catalog.map((item) => (
              <Card key={item.id} variant="elevated" style={styles.catalogCard}>
                <View style={styles.catalogRow}>
                  <View style={styles.catalogIconCircle}>
                    <Ionicons name="gift" size={20} color={THEME.colors.primary} />
                  </View>
                  <View style={styles.catalogTextCol}>
                    <Text style={styles.catalogItemTitle}>{item.title}</Text>
                    <Text style={styles.catalogItemDesc}>{item.description}</Text>
                    <Text style={styles.costText}>{item.points_cost} points needed</Text>
                  </View>
                  <Button
                    title="Redeem"
                    size="sm"
                    variant={balance >= item.points_cost ? 'primary' : 'outline'}
                    disabled={balance < item.points_cost || redeemingId === item.id}
                    loading={redeemingId === item.id}
                    onPress={() => handleRedeem(item)}
                  />
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* Recent Transactions */}
        <Text style={styles.sectionHeader}>Transaction History</Text>
        {transactions.length === 0 ? (
          <Text style={styles.emptyText}>No point activity recorded yet.</Text>
        ) : (
          transactions.map((tx) => {
            const isEarn = tx.type === 'earn' || tx.type === 'bonus' || tx.amount > 0;
            return (
              <Card key={tx.id} variant="outlined" style={styles.txCard}>
                <View style={styles.txRow}>
                  <View
                    style={[
                      styles.txIcon,
                      { backgroundColor: isEarn ? THEME.colors.successBg : THEME.colors.urgentBg }
                    ]}
                  >
                    <Ionicons
                      name={isEarn ? 'arrow-down' : 'arrow-up'}
                      size={16}
                      color={isEarn ? THEME.colors.success : THEME.colors.urgent}
                    />
                  </View>
                  <View style={styles.txInfo}>
                    <Text style={styles.txReason}>{tx.reason}</Text>
                    <Text style={styles.txDate}>
                      {new Date(tx.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.txAmount,
                      { color: isEarn ? THEME.colors.success : THEME.colors.urgent }
                    ]}
                  >
                    {isEarn ? `+${tx.amount}` : `-${Math.abs(tx.amount)}`} pts
                  </Text>
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.slate50
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12
  },
  figmaHeaderSection: {
    marginBottom: 14
  },
  eyebrowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    alignSelf: 'flex-start',
    marginBottom: 8
  },
  eyebrowText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B45309',
    letterSpacing: 0.6
  },
  figmaTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: THEME.colors.navy,
    letterSpacing: -0.4,
    marginBottom: 4
  },
  figmaSubtitle: {
    fontSize: 13,
    color: THEME.colors.slate600,
    lineHeight: 18
  },
  walletCard: {
    padding: 18,
    marginBottom: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.sm
  },
  walletTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14
  },
  walletLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.slate500,
    letterSpacing: 0.8
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 4,
    gap: 6
  },
  balanceNum: {
    fontSize: 36,
    fontWeight: '900',
    color: THEME.colors.navy,
    letterSpacing: -0.5
  },
  balanceUnit: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.slate500
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16
  },
  tierText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#B45309'
  },
  walletStatsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: THEME.colors.slate100,
    paddingTop: 12,
    marginBottom: 14
  },
  walletStatItem: {
    flex: 1
  },
  walletStatVal: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.navy
  },
  walletStatSub: {
    fontSize: 11,
    color: THEME.colors.slate500,
    marginTop: 2
  },
  walletStatDivider: {
    width: 1,
    backgroundColor: THEME.colors.slate100,
    marginHorizontal: 12
  },
  claimMonthlyBtn: {
    width: '100%'
  },
  rulesCard: {
    padding: 14,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16
  },
  rulesTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.navy,
    marginBottom: 8,
    letterSpacing: 0.5
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6
  },
  ruleText: {
    fontSize: 12,
    color: THEME.colors.slate700,
    flex: 1,
    lineHeight: 16
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '900',
    color: THEME.colors.navy,
    marginTop: 6,
    marginBottom: 10,
    letterSpacing: -0.2
  },
  catalogCard: {
    padding: 14,
    marginBottom: 10,
    borderRadius: 16
  },
  catalogRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  catalogIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: THEME.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  catalogTextCol: {
    flex: 1,
    marginRight: 8
  },
  catalogItemTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.navy
  },
  catalogItemDesc: {
    fontSize: 12,
    color: THEME.colors.slate600,
    marginTop: 2,
    lineHeight: 16
  },
  costText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#D97706',
    marginTop: 4
  },
  txCard: {
    padding: 12,
    marginBottom: 8,
    borderRadius: 14
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  txIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10
  },
  txInfo: {
    flex: 1
  },
  txReason: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.navy
  },
  txDate: {
    fontSize: 11,
    color: THEME.colors.slate400,
    marginTop: 2
  },
  txAmount: {
    fontSize: 14,
    fontWeight: '800'
  },
  emptyText: {
    fontSize: 13,
    color: THEME.colors.slate400,
    fontStyle: 'italic',
    paddingVertical: 10
  }
});
