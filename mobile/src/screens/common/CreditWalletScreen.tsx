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

export const CreditWalletScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
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
    return <LoadingScreen message="Loading BloodBridge Life Saver Credit Wallet..." />;
  }

  return (
    <View style={styles.container}>
      <Header
        title="Credit Wallet & Rewards"
        subtitle="Life Saver Recognition Points"
        showBack
        onBack={() => navigation.goBack()}
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
        {/* Wallet Hero Card */}
        <Card variant="elevated" style={styles.walletCard}>
          <View style={styles.walletTop}>
            <View>
              <Text style={styles.walletLabel}>AVAILABLE LIFE SAVER BALANCE</Text>
              <View style={styles.balanceRow}>
                <Ionicons name="sparkles" size={28} color={THEME.colors.gold} />
                <Text style={styles.balanceNum}>{balance}</Text>
                <Text style={styles.balanceUnit}>pts</Text>
              </View>
            </View>
            <Badge label={tier} variant="brand" />
          </View>

          <View style={styles.walletStatsRow}>
            <View style={styles.walletStatItem}>
              <Text style={styles.walletStatVal}>{lifetimeEarned} pts</Text>
              <Text style={styles.walletStatSub}>Lifetime Earned</Text>
            </View>
            <View style={styles.walletStatDivider} />
            <View style={styles.walletStatItem}>
              <Text style={styles.walletStatVal}>{transactions.length}</Text>
              <Text style={styles.walletStatSub}>Transactions</Text>
            </View>
          </View>

          {/* Monthly availability claim button */}
          <Button
            title="Check / Claim Monthly Availability Reward (+25 pts)"
            variant="outline"
            size="sm"
            loading={checkingMonthly}
            icon={<Ionicons name="calendar-outline" size={16} color={THEME.colors.primary} />}
            onPress={handleClaimMonthly}
            style={{ marginTop: 14 }}
          />
        </Card>

        {/* Reward Rules Breakdown */}
        <Card variant="outlined" style={styles.rulesCard}>
          <Text style={styles.rulesTitle}>How to Earn Recognition Points:</Text>
          <View style={styles.ruleItem}>
            <Ionicons name="checkmark-circle" size={16} color={THEME.colors.success} />
            <Text style={styles.ruleText}>+50 pts: Completing verified volunteer registration</Text>
          </View>
          <View style={styles.ruleItem}>
            <Ionicons name="checkmark-circle" size={16} color={THEME.colors.success} />
            <Text style={styles.ruleText}>+100 pts: Each confirmed emergency whole blood donation</Text>
          </View>
          <View style={styles.ruleItem}>
            <Ionicons name="checkmark-circle" size={16} color={THEME.colors.success} />
            <Text style={styles.ruleText}>+25 pts: Monthly active availability bonus</Text>
          </View>
        </Card>

        {/* Benefits Redemption Catalog */}
        <Text style={styles.sectionHeader}>Redeem Recognition Benefits ({catalog.length})</Text>
        {catalog.map((item) => {
          const canAfford = balance >= item.points_cost;
          return (
            <Card key={item.id} variant="elevated" style={styles.catalogCard}>
              <View style={styles.catalogRow}>
                <View style={styles.catalogIconCircle}>
                  <Ionicons name="gift" size={22} color={THEME.colors.primary} />
                </View>
                <View style={styles.catalogTextCol}>
                  <Text style={styles.catalogItemTitle}>{item.title}</Text>
                  <Text style={styles.catalogItemDesc}>{item.description}</Text>
                  <Text style={styles.costText}>{item.points_cost} Points Required</Text>
                </View>
                <Button
                  title={canAfford ? 'Redeem' : 'Locked'}
                  variant={canAfford ? 'primary' : 'outline'}
                  size="sm"
                  disabled={!canAfford}
                  loading={redeemingId === item.id}
                  onPress={() => handleRedeem(item)}
                />
              </View>
            </Card>
          );
        })}

        {/* Transaction History */}
        <Text style={styles.sectionHeader}>Transaction Ledger ({transactions.length})</Text>
        {transactions.length === 0 ? (
          <Text style={styles.emptyText}>No transaction records found.</Text>
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
    backgroundColor: THEME.colors.background
  },
  scrollContent: {
    padding: THEME.spacing.base
  },
  walletCard: {
    padding: 18,
    marginBottom: 14,
    backgroundColor: '#FFFDFD',
    borderColor: THEME.colors.crimsonBorder
  },
  walletTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14
  },
  walletLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.textMuted,
    letterSpacing: 0.8
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 4,
    gap: 6
  },
  balanceNum: {
    fontSize: 34,
    fontWeight: '900',
    color: THEME.colors.navy
  },
  balanceUnit: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.textMuted
  },
  walletStatsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: THEME.colors.borderLight,
    paddingTop: 12
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
    color: THEME.colors.textMuted,
    marginTop: 2
  },
  walletStatDivider: {
    width: 1,
    backgroundColor: THEME.colors.borderLight,
    marginHorizontal: 12
  },
  rulesCard: {
    padding: 12,
    marginBottom: 16,
    backgroundColor: '#F8FAFC'
  },
  rulesTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.navy,
    marginBottom: 8
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4
  },
  ruleText: {
    fontSize: 12,
    color: THEME.colors.textSecondary
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.navy,
    marginTop: 6,
    marginBottom: 10
  },
  catalogCard: {
    padding: 12,
    marginBottom: 10
  },
  catalogRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  catalogIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.colors.crimsonLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10
  },
  catalogTextCol: {
    flex: 1,
    marginRight: 8
  },
  catalogItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.navy
  },
  catalogItemDesc: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 2,
    lineHeight: 15
  },
  costText: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.gold,
    marginTop: 4
  },
  txCard: {
    padding: 10,
    marginBottom: 6
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
    fontWeight: '600',
    color: THEME.colors.navy
  },
  txDate: {
    fontSize: 11,
    color: THEME.colors.textLight,
    marginTop: 2
  },
  txAmount: {
    fontSize: 14,
    fontWeight: '800'
  },
  emptyText: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    fontStyle: 'italic',
    paddingVertical: 10
  }
});

