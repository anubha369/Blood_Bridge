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
import { StageIndicator } from '../../components/StageIndicator';
import { LoadingScreen } from '../../components/LoadingScreen';
import { api } from '../../services/api';
import { BloodRequest, DonorCandidate, ContactRequest } from '../../constants/types';

export const RequestTrackingScreen: React.FC<{ navigation: any; route: any }> = ({
  navigation,
  route
}) => {
  const { requestId } = route.params;

  const [request, setRequest] = useState<BloodRequest | null>(null);
  const [candidates, setCandidates] = useState<DonorCandidate[]>([]);
  const [contactRequests, setContactRequests] = useState<ContactRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [alerting, setAlerting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [reqRes, candRes, crRes] = await Promise.allSettled([
        api.requests.getById(requestId),
        api.requests.getCandidates(requestId, 30),
        api.requests.getContactRequests(requestId)
      ]);

      if (reqRes.status === 'fulfilled' && reqRes.value.success && reqRes.value.request) {
        setRequest(reqRes.value.request);
      }
      if (candRes.status === 'fulfilled' && candRes.value.success) {
        setCandidates(candRes.value.candidates || []);
      }
      if (crRes.status === 'fulfilled' && crRes.value.success) {
        setContactRequests(crRes.value.contact_requests || []);
      }
    } catch (err: any) {
      console.warn('Error fetching tracking data:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [requestId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleBroadcastAlert = async () => {
    try {
      setAlerting(true);
      const res = await api.requests.alertDonors(requestId);
      if (res.success) {
        Alert.alert(
          'Emergency Alert Broadcast Dispatched',
          `Successfully notified ${res.alerts_sent || candidates.length || 'compatible'} donors via Telegram, WhatsApp, and SMS.`
        );
        fetchData();
      } else {
        Alert.alert('Alert Notification Notice', res.error || 'Failed to dispatch alerts.');
      }
    } catch (err: any) {
      Alert.alert('Alert Error', err.message || 'Error communicating with dispatch server.');
    } finally {
      setAlerting(false);
    }
  };

  const handleCancelRequest = () => {
    Alert.alert(
      'Cancel Blood Request',
      'Are you sure you want to cancel this emergency request? Any pending notifications will be suppressed.',
      [
        { text: 'No, Keep Active', style: 'cancel' },
        {
          text: 'Yes, Cancel Request',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const res = await api.requests.cancel(requestId);
              if (res.success) {
                Alert.alert('Request Cancelled', 'The blood request has been marked as cancelled.');
                fetchData();
              }
            } catch (err: any) {
              Alert.alert('Cancellation Error', err.message);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  if (loading && !refreshing) {
    return <LoadingScreen message="Tracking live donor responses and dispatch status..." />;
  }

  if (!request) {
    return (
      <View style={styles.container}>
        <Header title="Request Not Found" showBack onBack={() => navigation.goBack()} />
        <View style={styles.notFoundCenter}>
          <Text style={styles.notFoundText}>This request could not be located or has expired.</Text>
          <Button title="Back to Dashboard" onPress={() => navigation.goBack()} />
        </View>
      </View>
    );
  }

  const isFulfilled = request.status === 'fulfilled';
  const isCancelled = request.status === 'cancelled';
  const hasAcceptedDonors = contactRequests.some((c) => c.status === 'accepted');

  return (
    <View style={styles.container}>
      <Header
        title="Live Request Tracking"
        subtitle={`Request #${request.id.slice(0, 8)}`}
        showBack
        onBack={() => navigation.goBack()}
        isEmergency={request.urgency_level === 'critical'}
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
        {/* Five-Stage Journey Progress Tracker */}
        <Text style={styles.sectionHeader}>Five-Stage Coordination Lifecycle</Text>
        <StageIndicator
          status={request.status}
          selectedDonorId={request.selected_donor_id}
          hasResponses={contactRequests.length > 0}
        />

        {/* Primary Request Overview Card */}
        <Card variant={request.urgency_level === 'critical' ? 'urgent' : 'elevated'}>
          <View style={styles.cardTopRow}>
            <View style={styles.bloodCircle}>
              <Text style={styles.bloodText}>{request.blood_group}</Text>
            </View>
            <View style={styles.requestMetaCol}>
              <Text style={styles.patientName}>{request.patient_name || 'Emergency Patient'}</Text>
              <Text style={styles.hospitalName}>{request.hospital_name}</Text>
              {request.hospital_address && (
                <Text style={styles.hospitalAddress} numberOfLines={1}>
                  {request.hospital_address}
                </Text>
              )}
            </View>
            <Badge
              label={request.status.replace('_', ' ')}
              variant={isFulfilled ? 'success' : isCancelled ? 'neutral' : 'urgent'}
            />
          </View>

          <View style={styles.specsRow}>
            <View style={styles.specItem}>
              <Ionicons name="water" size={16} color={THEME.colors.primary} />
              <Text style={styles.specLabel}>{request.units_needed} Units Required</Text>
            </View>
            <View style={styles.specItem}>
              <Ionicons name="time" size={16} color={THEME.colors.warning} />
              <Text style={styles.specLabel}>{request.urgency_level.toUpperCase()} Priority</Text>
            </View>
          </View>

          {request.notes && (
            <View style={styles.notesBox}>
              <Text style={styles.notesLabel}>Clinical Notes:</Text>
              <Text style={styles.notesText}>{request.notes}</Text>
            </View>
          )}
        </Card>

        {/* Selected Donor Card (Stage 4 & 5) */}
        {request.selected_donor_id && (
          <Card variant="elevated" style={styles.selectedDonorCard}>
            <View style={styles.selectedDonorHeader}>
              <Ionicons name="checkmark-circle" size={24} color={THEME.colors.success} />
              <Text style={styles.selectedDonorTitle}>Confirmed Donor Matched</Text>
            </View>
            <Text style={styles.selectedDonorName}>
              {request.selected_donor_name || 'Volunteer Donor'}
            </Text>
            {request.selected_donor_phone && (
              <View style={styles.phoneRow}>
                <Ionicons name="call" size={16} color={THEME.colors.primary} />
                <Text style={styles.selectedDonorPhone}>{request.selected_donor_phone}</Text>
              </View>
            )}

            {!isFulfilled && (
              <Button
                title="Confirm Blood Received (Fulfill Request)"
                variant="primary"
                icon={<Ionicons name="shield-checkmark" size={18} color="#FFFFFF" />}
                onPress={() =>
                  navigation.navigate('ConfirmFulfillment', {
                    requestId: request.id,
                    donorName: request.selected_donor_name
                  })
                }
                style={{ marginTop: 12 }}
              />
            )}
          </Card>
        )}

        {/* Action Bar (Alert Broadcast / Donor Responses) */}
        {!isFulfilled && !isCancelled && (
          <View style={styles.actionSection}>
            <Button
              title="Broadcast Emergency Alert to Donors"
              variant="crimson"
              size="lg"
              loading={alerting}
              icon={<Ionicons name="megaphone" size={18} color="#FFFFFF" />}
              onPress={handleBroadcastAlert}
              style={{ marginBottom: 10 }}
            />

            <Button
              title={`View Responding Donors (${contactRequests.length})`}
              variant="outline"
              size="md"
              icon={<Ionicons name="people" size={18} color={THEME.colors.primary} />}
              onPress={() =>
                navigation.navigate('DonorResponses', {
                  requestId: request.id,
                  contactRequests
                })
              }
              style={{ marginBottom: 10 }}
            />
          </View>
        )}

        {/* Nearby Compatible Candidates */}
        <Card variant="outlined" style={styles.candidatesCard}>
          <View style={styles.candidatesHeader}>
            <Ionicons name="location" size={18} color={THEME.colors.primary} />
            <Text style={styles.candidatesTitle}>
              Nearby Compatible Donors ({candidates.length})
            </Text>
          </View>
          <Text style={styles.candidatesDesc}>
            Calculated via PostGIS spatial engine within 30km. Exact coordinates are protected by
            privacy bands.
          </Text>

          {candidates.slice(0, 5).map((cand, idx) => (
            <View key={cand.id || idx} style={styles.candidateRow}>
              <View style={styles.candPill}>
                <Text style={styles.candBlood}>{cand.blood_group}</Text>
              </View>
              <View style={styles.candInfo}>
                <Text style={styles.candName}>{cand.name}</Text>
                <Text style={styles.candDist}>
                  {cand.distance_km ? `~${cand.distance_km.toFixed(1)} km away` : 'Within radius'}
                </Text>
              </View>
              <Badge label="Compatible" variant="success" size="sm" />
            </View>
          ))}
        </Card>

        {/* Cancel Action */}
        {!isFulfilled && !isCancelled && (
          <TouchableOpacity onPress={handleCancelRequest} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>Cancel This Emergency Request</Text>
          </TouchableOpacity>
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
  sectionHeader: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.navy,
    marginBottom: 8
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  bloodCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  bloodText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF'
  },
  requestMetaCol: {
    flex: 1
  },
  patientName: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.navy
  },
  hospitalName: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    marginTop: 2
  },
  hospitalAddress: {
    fontSize: 11,
    color: THEME.colors.textLight,
    marginTop: 1
  },
  specsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.borderLight,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.borderLight
  },
  specItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  specLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.navy
  },
  notesBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: THEME.borderRadius.sm,
    padding: 8,
    marginTop: 10
  },
  notesLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.navy,
    marginBottom: 2
  },
  notesText: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    lineHeight: 16
  },
  selectedDonorCard: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0'
  },
  selectedDonorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6
  },
  selectedDonorTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.success,
    marginLeft: 8
  },
  selectedDonorName: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.navy,
    marginTop: 2
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6
  },
  selectedDonorPhone: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.colors.primary,
    marginLeft: 8
  },
  actionSection: {
    marginVertical: 12
  },
  candidatesCard: {
    marginBottom: 16
  },
  candidatesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4
  },
  candidatesTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.navy,
    marginLeft: 6
  },
  candidatesDesc: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    lineHeight: 15,
    marginBottom: 12
  },
  candidateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.borderLight
  },
  candPill: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: THEME.colors.crimsonLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10
  },
  candBlood: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.primary
  },
  candInfo: {
    flex: 1
  },
  candName: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.navy
  },
  candDist: {
    fontSize: 11,
    color: THEME.colors.textMuted
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: 16,
    marginBottom: 20
  },
  cancelText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.urgent
  },
  notFoundCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24
  },
  notFoundText: {
    fontSize: 14,
    color: THEME.colors.textMuted,
    marginBottom: 16
  }
});

