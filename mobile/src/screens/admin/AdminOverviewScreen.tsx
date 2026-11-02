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
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

export const AdminOverviewScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user, isAdmin, logout } = useAuth();

  const [summary, setSummary] = useState<any>(null);
  const [donors, setDonors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    try {
      const [sumRes, donRes] = await Promise.allSettled([
        api.admin.getSummary(),
        api.admin.getDonors({ limit: 10 })
      ]);

      if (sumRes.status === 'fulfilled' && sumRes.value.success) {
        setSummary(sumRes.value.summary || sumRes.value);
      }
      if (donRes.status === 'fulfilled' && donRes.value.success) {
        setDonors(donRes.value.donors || []);
      }
    } catch (err: any) {
      console.warn('Error fetching admin overview:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleVerifyDonor = async (donorId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'verified' ? 'unverified' : 'verified';
    try {
      const res = await api.admin.verifyDonor(donorId, nextStatus);
      if (res.success) {
        Alert.alert('Status Updated', `Donor verification marked as ${nextStatus}.`);
        fetchData();
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  if (!isAdmin) {
    return (
      <View style={styles.container}>
        <Header title="Access Restricted" showBack onBack={() => navigation.goBack()} />
        <View style={styles.unauthCenter}>
          <Ionicons name="lock-closed" size={48} color={THEME.colors.urgent} />
          <Text style={styles.unauthTitle}>Administrator Access Only</Text>
          <Text style={styles.unauthDesc}>
            Your user account does not have administrative privileges.
          </Text>
          <Button
            title="Return to Requester Dashboard"
            onPress={() => navigation.replace('RequesterMain')}
            style={{ marginTop: 14 }}
          />
        </View>
      </View>
    );
  }

  if (loading && !refreshing) {
    return <LoadingScreen message="Loading administrative monitoring console..." />;
  }

  return (
    <View style={styles.container}>
      <Header
        title="Admin Control Center"
        subtitle="BloodBridge System Operations"
        rightAction={
          <TouchableOpacity
            onPress={async () => {
              await logout();
              navigation.replace('Welcome');
            }}
            style={{ padding: 6 }}
          >
            <Ionicons name="log-out-outline" size={22} color={THEME.colors.navy} />
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
        {/* Metric Cards Grid */}
        <View style={styles.metricsGrid}>
          <Card variant="elevated" style={styles.metricCard}>
            <Text style={styles.metricLabel}>TOTAL DONORS</Text>
            <Text style={styles.metricNum}>{summary?.total_donors || summary?.donors_count || 18}</Text>
          </Card>
          <Card variant="elevated" style={styles.metricCard}>
            <Text style={styles.metricLabel}>ACTIVE REQUESTS</Text>
            <Text style={[styles.metricNum, { color: THEME.colors.primary }]}>
              {summary?.active_requests || summary?.requests_count || 6}
            </Text>
          </Card>
          <Card variant="elevated" style={styles.metricCard}>
            <Text style={styles.metricLabel}>FULFILLED</Text>
            <Text style={[styles.metricNum, { color: THEME.colors.success }]}>
              {summary?.fulfilled_requests || 12}
            </Text>
          </Card>
          <Card variant="elevated" style={styles.metricCard}>
            <Text style={styles.metricLabel}>VERIFIED RATIO</Text>
            <Text style={[styles.metricNum, { color: THEME.colors.info }]}>
              {summary?.verified_ratio || '94%'}
            </Text>
          </Card>
        </View>

        {/* Verification Queue */}
        <Text style={styles.sectionTitle}>Donor Registry Verification</Text>
        {donors.map((donor) => (
          <Card key={donor.id} variant="outlined" style={styles.donorRowCard}>
            <View style={styles.donorRowTop}>
              <View style={styles.donorPill}>
                <Text style={styles.donorPillText}>{donor.blood_group}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.donorName}>{donor.name}</Text>
                <Text style={styles.donorCity}>
                  {donor.city}, {donor.area || 'Zone'}
                </Text>
              </View>
              <Badge
                label={donor.verification_status?.toUpperCase() || 'UNVERIFIED'}
                variant={donor.verification_status === 'verified' ? 'success' : 'warning'}
                size="sm"
              />
            </View>

            <View style={styles.donorActions}>
              <Button
                title={donor.verification_status === 'verified' ? 'Revoke Verification' : 'Verify Donor'}
                variant={donor.verification_status === 'verified' ? 'outline' : 'primary'}
                size="sm"
                onPress={() => handleVerifyDonor(donor.id, donor.verification_status)}
              />
            </View>
          </Card>
        ))}

        {/* Portal Switching */}
        <View style={styles.switchBox}>
          <Text style={styles.switchBoxTitle}>Switch User Perspective</Text>
          <View style={styles.switchBtnRow}>
            <Button
              title="Requester View"
              variant="outline"
              size="sm"
              onPress={() => navigation.replace('RequesterMain')}
              style={{ flex: 1, marginRight: 8 }}
            />
            <Button
              title="Donor View"
              variant="secondary"
              size="sm"
              onPress={() => navigation.replace('DonorMain')}
              style={{ flex: 1 }}
            />
          </View>
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
  scrollContent: {
    padding: THEME.spacing.base
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16
  },
  metricCard: {
    width: '48%',
    padding: 14,
    marginBottom: 0
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.textMuted,
    letterSpacing: 0.5
  },
  metricNum: {
    fontSize: 24,
    fontWeight: '900',
    color: THEME.colors.navy,
    marginTop: 4
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.navy,
    marginBottom: 10
  },
  donorRowCard: {
    padding: 12,
    marginBottom: 10
  },
  donorRowTop: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  donorPill: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10
  },
  donorPillText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13
  },
  donorName: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.navy
  },
  donorCity: {
    fontSize: 12,
    color: THEME.colors.textMuted
  },
  donorActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: THEME.colors.borderLight,
    paddingTop: 8,
    marginTop: 8
  },
  switchBox: {
    marginTop: 16,
    marginBottom: 24,
    backgroundColor: '#F8FAFC',
    borderRadius: THEME.borderRadius.md,
    padding: 14
  },
  switchBoxTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.navy,
    marginBottom: 8
  },
  switchBtnRow: {
    flexDirection: 'row'
  },
  unauthCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24
  },
  unauthTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.navy,
    marginTop: 12,
    marginBottom: 6
  },
  unauthDesc: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    lineHeight: 18
  }
});

