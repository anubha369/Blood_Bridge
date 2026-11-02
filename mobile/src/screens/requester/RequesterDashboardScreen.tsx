import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
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
import { StageIndicator } from '../../components/StageIndicator';
import { EmptyState } from '../../components/EmptyState';
import { LoadingScreen } from '../../components/LoadingScreen';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { BloodRequest } from '../../constants/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const RequesterDashboardScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [requests, setRequests] = useState<BloodRequest[]>([]);
  const [creditBalance, setCreditBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    try {
      const [reqRes, credRes] = await Promise.allSettled([
        api.requests.getAll(),
        api.credits.getBalance()
      ]);

      if (reqRes.status === 'fulfilled' && reqRes.value.success && Array.isArray(reqRes.value.requests)) {
        setRequests(reqRes.value.requests);
      }
      if (credRes.status === 'fulfilled' && credRes.value.success) {
        setCreditBalance(credRes.value.balance || 0);
      }
    } catch (err: any) {
      console.warn('Error fetching requester dashboard:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const activeRequests = requests.filter((r) => r.status !== 'fulfilled' && r.status !== 'cancelled');
  const fulfilledRequests = requests.filter((r) => r.status === 'fulfilled');

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  if (loading && !refreshing) {
    return <LoadingScreen message="Loading requester emergency command center..." />;
  }

  const renderHeader = () => (
    <View style={styles.dashboardHeader}>
      {/* Top User Portal Bar matching Website Navbar */}
      <View style={styles.userPortalBar}>
        <View style={styles.userProfilePill}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{getInitials(user?.name)}</Text>
          </View>
          <View style={styles.userTextCol}>
            <Text style={styles.userDisplayName} numberOfLines={1}>{user?.name || 'Requester'}</Text>
            <Text style={styles.userRoleTag}>PATIENT / REQUESTER</Text>
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

      {/* 3 Primary Navigation Options: Create Request | Donor Portal | Clinical AI */}
      <View style={styles.primaryActionsRow}>
        {/* A. Create Request */}
        <TouchableOpacity
          style={[styles.primaryActionCard, styles.createRequestCard]}
          activeOpacity={0.88}
          onPress={() => navigation.navigate('CreateRequest')}
        >
          <View style={[styles.primaryIconBox, { backgroundColor: THEME.colors.primary }]}>
            <Ionicons name="add" size={20} color="#FFFFFF" />
          </View>
          <Text style={styles.primaryActionTitle}>Create Request</Text>
          <Text style={styles.primaryActionSub}>Emergency Dispatch</Text>
        </TouchableOpacity>

        {/* B. Donor Portal */}
        <TouchableOpacity
          style={[styles.primaryActionCard, styles.donorPortalCard]}
          activeOpacity={0.88}
          onPress={() => navigation.navigate('DonorMain')}
        >
          <View style={[styles.primaryIconBox, { backgroundColor: THEME.colors.navy }]}>
            <Ionicons name="heart" size={18} color="#FFFFFF" />
          </View>
          <Text style={styles.primaryActionTitle}>Donor Portal</Text>
          <Text style={styles.primaryActionSub}>Volunteer Center</Text>
        </TouchableOpacity>

        {/* C. Clinical AI */}
        <TouchableOpacity
          style={[styles.primaryActionCard, styles.clinicalAICard]}
          activeOpacity={0.88}
          onPress={() => navigation.navigate('AIAssistant')}
        >
          <View style={[styles.primaryIconBox, { backgroundColor: '#B45309' }]}>
            <Ionicons name="sparkles" size={18} color="#FFFFFF" />
          </View>
          <Text style={styles.primaryActionTitle}>Clinical AI</Text>
          <Text style={styles.primaryActionSub}>Medical RAG</Text>
        </TouchableOpacity>
      </View>

      {/* Emergency Action Banner */}
      <Card variant="urgent" style={styles.emergencyCard}>
        <View style={styles.emergencyCardHeader}>
          <View style={styles.pulseDot} />
          <Text style={styles.emergencyCardTitle}>Urgent Blood Requirement?</Text>
        </View>
        <Text style={styles.emergencyCardDesc}>
          Create an instant emergency request to broadcast to compatible donors within 30km using AI Geo-Dispatch.
        </Text>
        <Button
          title="+ Create Blood Request"
          variant="primary"
          size="lg"
          showArrow
          onPress={() => navigation.navigate('CreateRequest')}
          style={styles.emergencyBtn}
        />
      </Card>

      {/* Stats Counter Bar */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{activeRequests.length}</Text>
          <Text style={styles.statLabel}>Active Requests</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={[styles.statNum, { color: THEME.colors.success }]}>
            {fulfilledRequests.length}
          </Text>
          <Text style={styles.statLabel}>Fulfilled</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={[styles.statNum, { color: THEME.colors.primary }]}>
            {requests.reduce((acc, r) => acc + (r.responses_count || 0), 0)}
          </Text>
          <Text style={styles.statLabel}>Donor Matches</Text>
        </View>
      </View>

      {/* Blood Bank Shortcut */}
      <TouchableOpacity
        style={styles.bloodBankRow}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('BloodBankDirectory')}
      >
        <View style={styles.bloodBankIconCircle}>
          <Ionicons name="business" size={20} color={THEME.colors.primary} />
        </View>
        <View style={styles.bloodBankTextCol}>
          <Text style={styles.bloodBankTitle}>Verified Hospital Blood Banks</Text>
          <Text style={styles.bloodBankSubtitle}>
            Direct inventory records from accredited transfusion centres
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={THEME.colors.slate400} />
      </TouchableOpacity>

      <Text style={styles.sectionHeading}>Emergency Blood Requests</Text>
    </View>
  );

  const renderItem = ({ item }: { item: BloodRequest }) => {
    const isUrgent = item.urgency === 'critical' || item.urgency_level === 'critical';

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => navigation.navigate('RequestTracking', { requestId: item.id })}
      >
        <Card variant={isUrgent ? 'urgent' : 'elevated'} style={styles.requestCard}>
          <View style={styles.cardTopRow}>
            <View style={styles.bloodPill}>
              <Text style={styles.bloodPillText}>{item.blood_group}</Text>
            </View>

            <View style={styles.cardHeaderInfo}>
              <View style={styles.patientRow}>
                <Text style={styles.patientName}>{item.patient_name || 'Emergency Patient'}</Text>
                <Badge
                  label={item.urgency || 'STANDARD'}
                  variant={isUrgent ? 'critical' : 'neutral'}
                  size="sm"
                />
              </View>
              <Text style={styles.hospitalName} numberOfLines={1}>
                {item.hospital_name}, {item.city}
              </Text>
              <Text style={styles.unitsText}>
                Required: <Text style={styles.unitsBold}>{item.units_needed || 1} Unit(s)</Text>
              </Text>
            </View>
          </View>

          {/* 5-Stage Journey Progress Indicator */}
          <View style={styles.stageIndicatorWrapper}>
            <StageIndicator currentStatus={item.status} compact />
          </View>

          <View style={styles.cardFooter}>
            <View style={styles.footerInfo}>
              <Ionicons name="people-outline" size={14} color={THEME.colors.slate500} />
              <Text style={styles.footerText}>
                {item.responses_count || 0} Donor(s) Alerted / Responded
              </Text>
            </View>
            <View style={styles.trackDetailsRow}>
              <Text style={styles.trackDetailsLink}>View Details</Text>
              <Ionicons name="chevron-forward" size={14} color={THEME.colors.primary} />
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Header
        showBrand
        rightAction={
          <TouchableOpacity
            style={styles.headerAddBtn}
            onPress={() => navigation.navigate('CreateRequest')}
          >
            <Ionicons name="add" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        }
      />

      <FlatList
        data={requests}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <EmptyState
            icon="pulse-outline"
            title="No Active Blood Requests"
            description="You have not created any emergency blood requests yet. Tap below to create an immediate request."
            actionTitle="+ Create Blood Request"
            onAction={() => navigation.navigate('CreateRequest')}
          />
        }
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={THEME.colors.primary}
          />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.slate50
  },
  headerAddBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...THEME.shadows.sm
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12
  },
  dashboardHeader: {
    marginBottom: 8
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
  primaryActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14
  },
  primaryActionCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    ...THEME.shadows.sm
  },
  createRequestCard: {
    borderColor: '#FECDD3',
    backgroundColor: '#FFF1F2'
  },
  donorPortalCard: {
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC'
  },
  clinicalAICard: {
    borderColor: '#FDE68A',
    backgroundColor: '#FFFBEB'
  },
  primaryIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6
  },
  primaryActionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.navy,
    textAlign: 'center'
  },
  primaryActionSub: {
    fontSize: 9,
    fontWeight: '600',
    color: THEME.colors.slate500,
    marginTop: 2,
    textAlign: 'center'
  },
  emergencyCard: {
    marginBottom: 14,
    borderRadius: 18
  },
  emergencyCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6
  },
  pulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: THEME.colors.primary,
    marginRight: 8
  },
  emergencyCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.primary
  },
  emergencyCardDesc: {
    fontSize: 13,
    color: THEME.colors.slate700,
    lineHeight: 18,
    marginBottom: 14
  },
  emergencyBtn: {
    width: '100%'
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: 14,
    ...THEME.shadows.sm
  },
  statBox: {
    flex: 1,
    alignItems: 'center'
  },
  statNum: {
    fontSize: 22,
    fontWeight: '900',
    color: THEME.colors.navy
  },
  statLabel: {
    fontSize: 11,
    color: THEME.colors.slate500,
    marginTop: 2,
    fontWeight: '600'
  },
  statDivider: {
    width: 1,
    height: '70%',
    backgroundColor: THEME.colors.border,
    alignSelf: 'center'
  },
  bloodBankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: 18,
    ...THEME.shadows.sm
  },
  bloodBankIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: THEME.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10
  },
  bloodBankTextCol: {
    flex: 1
  },
  bloodBankTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.navy
  },
  bloodBankSubtitle: {
    fontSize: 11,
    color: THEME.colors.slate500,
    marginTop: 1
  },
  sectionHeading: {
    fontSize: 17,
    fontWeight: '900',
    color: THEME.colors.navy,
    marginBottom: 10,
    letterSpacing: -0.2
  },
  requestCard: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 18
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  bloodPill: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    ...THEME.shadows.emergency
  },
  bloodPillText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 17
  },
  cardHeaderInfo: {
    flex: 1
  },
  patientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2
  },
  patientName: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.navy
  },
  hospitalName: {
    fontSize: 12,
    color: THEME.colors.slate600,
    marginTop: 1
  },
  unitsText: {
    fontSize: 12,
    color: THEME.colors.slate500,
    marginTop: 2
  },
  unitsBold: {
    fontWeight: '700',
    color: THEME.colors.navy
  },
  stageIndicatorWrapper: {
    marginVertical: 6,
    paddingVertical: 4
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.slate100,
    marginTop: 6
  },
  footerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  footerText: {
    fontSize: 12,
    color: THEME.colors.slate500,
    fontWeight: '600'
  },
  trackDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2
  },
  trackDetailsLink: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.primary
  }
});
