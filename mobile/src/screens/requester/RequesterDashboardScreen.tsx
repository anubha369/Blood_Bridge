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

export const RequesterDashboardScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<BloodRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRequests = useCallback(async () => {
    try {
      const res = await api.requests.getAll();
      if (res.success && Array.isArray(res.requests)) {
        setRequests(res.requests);
      }
    } catch (err: any) {
      console.warn('Error fetching requests:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRequests();
  };

  const activeRequests = requests.filter((r) => r.status !== 'fulfilled' && r.status !== 'cancelled');
  const fulfilledRequests = requests.filter((r) => r.status === 'fulfilled');

  if (loading && !refreshing) {
    return <LoadingScreen message="Loading emergency coordination dashboard..." />;
  }

  const renderHeader = () => (
    <View style={styles.dashboardHeader}>
      {/* Welcome Banner */}
      <View style={styles.greetingRow}>
        <View>
          <Text style={styles.greetingTitle}>Welcome back,</Text>
          <Text style={styles.userName}>{user?.name || 'Healthcare Requester'}</Text>
        </View>
        <TouchableOpacity
          style={styles.notifBtn}
          onPress={() => navigation.navigate('Notifications')}
        >
          <Ionicons name="notifications-outline" size={22} color={THEME.colors.navy} />
        </TouchableOpacity>
      </View>

      {/* Emergency Action Banner */}
      <Card variant="urgent" style={styles.emergencyCard}>
        <View style={styles.emergencyCardHeader}>
          <View style={styles.pulseDot} />
          <Text style={styles.emergencyCardTitle}>Urgent Blood Requirement?</Text>
        </View>
        <Text style={styles.emergencyCardDesc}>
          Create an instant request to broadcast to matching donors within 30km using AI Geo-Dispatch.
        </Text>
        <Button
          title="Create Emergency Blood Request"
          variant="primary"
          icon={<Ionicons name="add-circle" size={18} color="#FFFFFF" />}
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
          <Text style={styles.statLabel}>Donor Responses</Text>
        </View>
      </View>

      {/* Blood Bank Shortcut */}
      <TouchableOpacity
        style={styles.bloodBankRow}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('BloodBankDirectory')}
      >
        <View style={styles.bloodBankIconCircle}>
          <Ionicons name="business" size={20} color={THEME.colors.primary} />
        </View>
        <View style={styles.bloodBankTextCol}>
          <Text style={styles.bloodBankTitle}>Check Verified Blood Banks</Text>
          <Text style={styles.bloodBankSubtitle}>
            Browse direct stock availability in nearby licensed centers
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={THEME.colors.textMuted} />
      </TouchableOpacity>

      <Text style={styles.sectionHeading}>Your Blood Requests ({requests.length})</Text>
    </View>
  );

  const renderRequestItem = ({ item }: { item: BloodRequest }) => {
    const isUrgent = item.urgency_level === 'critical' || item.urgency_level === 'urgent';

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
              <Text style={styles.patientName}>{item.patient_name || 'Emergency Patient'}</Text>
              <Text style={styles.hospitalName} numberOfLines={1}>
                {item.hospital_name || 'Hospital location pending'}
              </Text>
            </View>
            <Badge
              label={item.status.replace('_', ' ')}
              variant={
                item.status === 'fulfilled'
                  ? 'success'
                  : isUrgent
                  ? 'critical'
                  : 'brand'
              }
              size="sm"
            />
          </View>

          {/* 5-Stage Mini Bar */}
          <StageIndicator
            status={item.status}
            selectedDonorId={item.selected_donor_id}
            hasResponses={(item.responses_count || 0) > 0}
          />

          <View style={styles.cardFooter}>
            <View style={styles.footerInfo}>
              <Ionicons name="water-outline" size={14} color={THEME.colors.textMuted} />
              <Text style={styles.footerText}>{item.units_needed || 1} Units Needed</Text>
            </View>
            <View style={styles.footerInfo}>
              <Ionicons name="chatbubbles-outline" size={14} color={THEME.colors.textMuted} />
              <Text style={styles.footerText}>
                {item.responses_count || 0} Responses
              </Text>
            </View>
            <Text style={styles.trackDetailsLink}>
              Track &gt;
            </Text>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Header
        title="Requester Dashboard"
        subtitle="Blood Coordination Live Feed"
        rightAction={
          <TouchableOpacity
            onPress={() => navigation.navigate('CreateRequest')}
            style={styles.headerAddBtn}
          >
            <Ionicons name="add" size={22} color={THEME.colors.textInverse} />
          </TouchableOpacity>
        }
      />

      <FlatList
        data={requests}
        keyExtractor={(item) => item.id}
        renderItem={renderRequestItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <EmptyState
            icon="heart-outline"
            title="No Active Blood Requests"
            description="You have not created any emergency blood requests yet. Tap below to create an immediate request."
            actionTitle="Create Blood Request"
            onAction={() => navigation.navigate('CreateRequest')}
          />
        }
        contentContainerStyle={styles.listContent}
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
    backgroundColor: THEME.colors.background
  },
  headerAddBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  listContent: {
    padding: THEME.spacing.base
  },
  dashboardHeader: {
    marginBottom: 8
  },
  greetingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14
  },
  greetingTitle: {
    fontSize: 13,
    color: THEME.colors.textMuted
  },
  userName: {
    fontSize: 20,
    fontWeight: '800',
    color: THEME.colors.navy
  },
  notifBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.colors.card,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    ...THEME.shadows.sm
  },
  emergencyCard: {
    marginBottom: 16
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
    backgroundColor: THEME.colors.urgent,
    marginRight: 8
  },
  emergencyCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.urgent
  },
  emergencyCardDesc: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    lineHeight: 17,
    marginBottom: 12
  },
  emergencyBtn: {
    backgroundColor: THEME.colors.primary
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.borderRadius.lg,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
    marginBottom: 14,
    ...THEME.shadows.sm
  },
  statBox: {
    flex: 1,
    alignItems: 'center'
  },
  statNum: {
    fontSize: 20,
    fontWeight: '900',
    color: THEME.colors.navy
  },
  statLabel: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 2,
    fontWeight: '500'
  },
  statDivider: {
    width: 1,
    height: '70%',
    backgroundColor: THEME.colors.borderLight,
    alignSelf: 'center'
  },
  bloodBankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.borderRadius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
    marginBottom: 18,
    ...THEME.shadows.sm
  },
  bloodBankIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: THEME.colors.crimsonLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10
  },
  bloodBankTextCol: {
    flex: 1
  },
  bloodBankTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.navy
  },
  bloodBankSubtitle: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 1
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.navy,
    marginBottom: 10
  },
  requestCard: {
    padding: 14,
    marginBottom: 12
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10
  },
  bloodPill: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10
  },
  bloodPillText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 16
  },
  cardHeaderInfo: {
    flex: 1
  },
  patientName: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.navy
  },
  hospitalName: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 2
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.borderLight,
    marginTop: 4
  },
  footerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  footerText: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    fontWeight: '500'
  },
  trackDetailsLink: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.primary
  }
});

