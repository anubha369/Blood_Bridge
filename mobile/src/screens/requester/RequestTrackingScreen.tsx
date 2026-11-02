import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Linking,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../../constants/theme';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { StageIndicator } from '../../components/StageIndicator';
import { LoadingScreen } from '../../components/LoadingScreen';
import { api } from '../../services/api';
import { BloodRequest, DonorCandidate, ContactRequest } from '../../constants/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const RequestTrackingScreen: React.FC<{ navigation: any; route: any }> = ({
  navigation,
  route
}) => {
  const insets = useSafeAreaInsets();
  const { requestId } = route.params;

  const [request, setRequest] = useState<BloodRequest | null>(null);
  const [candidates, setCandidates] = useState<DonorCandidate[]>([]);
  const [contactRequests, setContactRequests] = useState<ContactRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [alertingDonors, setAlertingDonors] = useState(false);
  const [sendingDonorId, setSendingDonorId] = useState<string | null>(null);
  const [selectingDonorId, setSelectingDonorId] = useState<string | null>(null);
  const [reselecting, setReselecting] = useState(false);

  // Fulfillment Modal State
  const [showFulfillModal, setShowFulfillModal] = useState(false);
  const [unitsReceived, setUnitsReceived] = useState('1');
  const [fulfillNotes, setFulfillNotes] = useState('');
  const [fulfilling, setFulfilling] = useState(false);

  const fetchTrackingData = useCallback(async () => {
    try {
      const [reqRes, candRes, crRes] = await Promise.allSettled([
        api.requests.getById(requestId),
        api.requests.getCandidates(requestId, 30),
        api.requests.getContactRequests(requestId)
      ]);

      if (reqRes.status === 'fulfilled' && reqRes.value.success && reqRes.value.request) {
        setRequest(reqRes.value.request);
        setUnitsReceived(String(reqRes.value.request.units_needed || 1));
      }
      if (candRes.status === 'fulfilled' && candRes.value.success) {
        setCandidates(candRes.value.candidates || []);
      }
      if (crRes.status === 'fulfilled' && crRes.value.success) {
        setContactRequests(crRes.value.contact_requests || []);
      }
    } catch (err: any) {
      console.warn('Tracking fetch error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [requestId]);

  useEffect(() => {
    fetchTrackingData();
    // Realtime polling every 6 seconds while on this screen
    const interval = setInterval(fetchTrackingData, 6000);
    return () => clearInterval(interval);
  }, [fetchTrackingData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTrackingData();
  };

  // Stage 2: Broadcast alerts to all compatible donors
  const handleBroadcastAlert = async () => {
    try {
      setAlertingDonors(true);
      const res = await api.requests.alertDonors(requestId);
      if (res.success) {
        Alert.alert(
          'Emergency Telegram Alerts Dispatched! 📢',
          `Notified ${res.alerts_sent || candidates.length || 'compatible'} donors nearby. Their live responses will appear below.`
        );
        fetchTrackingData();
      } else {
        Alert.alert('Dispatch Notice', res.error || 'Failed to dispatch alerts.');
      }
    } catch (err: any) {
      Alert.alert('Dispatch Error', err.message);
    } finally {
      setAlertingDonors(false);
    }
  };

  // Stage 2: Send individual Telegram alert to a single candidate
  const handleSendSingleTelegram = async (donorId: string, donorName: string) => {
    try {
      setSendingDonorId(donorId);
      const res = await api.requests.sendDonorRequest(requestId, donorId);
      if (res.success) {
        Alert.alert('Alert Dispatched', `Emergency Telegram request sent to ${donorName}.`);
        fetchTrackingData();
      } else {
        Alert.alert('Notice', res.error || 'Could not send Telegram request.');
      }
    } catch (err: any) {
      Alert.alert('Dispatch Error', err.message);
    } finally {
      setSendingDonorId(null);
    }
  };

  // Stage 4: Select an accepted donor
  const handleSelectDonor = async (donorId: string, donorName: string) => {
    try {
      setSelectingDonorId(donorId);
      const res = await api.requests.selectDonor(requestId, donorId, false);
      if (res.success) {
        Alert.alert(
          'Donor Selected & Reconfirmation Sent',
          `You have selected ${donorName}. Contact telephone has been unmasked below for bedside coordination.`
        );
        fetchTrackingData();
      } else {
        Alert.alert('Selection Notice', res.error || 'Failed to select donor.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSelectingDonorId(null);
    }
  };

  // Stage 4: Reselect another donor
  const handleReselectDonor = () => {
    Alert.alert(
      'Change Selected Donor',
      'Are you sure you want to release the currently selected donor? This allows you to pick another responding donor.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Release & Reselect',
          style: 'destructive',
          onPress: async () => {
            try {
              setReselecting(true);
              const res = await api.requests.reselectDonor(requestId);
              if (res.success) {
                Alert.alert('Donor Released', 'You can now select another eligible donor who accepted.');
                fetchTrackingData();
              } else {
                Alert.alert('Notice', res.error || 'Could not release donor.');
              }
            } catch (err: any) {
              Alert.alert('Error', err.message);
            } finally {
              setReselecting(false);
            }
          }
        }
      ]
    );
  };

  // Stage 5: Confirm Fulfillment
  const handleConfirmFulfillment = async () => {
    const units = parseInt(unitsReceived, 10);
    if (isNaN(units) || units < 1) {
      Alert.alert('Invalid Units', 'Please enter valid units received.');
      return;
    }

    try {
      setFulfilling(true);
      const res = await api.requests.fulfill(requestId, {
        units_received: units,
        notes: fulfillNotes.trim() || undefined
      });

      if (res.success) {
        setShowFulfillModal(false);
        Alert.alert(
          'Blood Request Fulfilled! 🩸',
          `The request is officially marked as Fulfilled.\n\n• Donor awarded +100 Life Saver credit points.\n• Mandatory 90-day clinical recovery cooldown activated.\n\nThank you for coordinating with BloodBridge.`
        );
        fetchTrackingData();
      } else {
        Alert.alert('Fulfillment Notice', res.error || 'Could not mark request fulfilled.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setFulfilling(false);
    }
  };

  // Cancel Request
  const handleCancelRequest = () => {
    Alert.alert(
      'Cancel Blood Request',
      'Are you sure you want to cancel this emergency request? Any active notifications will be stopped.',
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
                Alert.alert('Request Cancelled', 'The blood request is now cancelled.');
                fetchTrackingData();
              }
            } catch (err: any) {
              Alert.alert('Error', err.message);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  if (loading && !refreshing) {
    return <LoadingScreen message="Loading 5-Stage Emergency Request Tracking..." />;
  }

  if (!request) {
    return (
      <View style={styles.container}>
        <Header title="Request Not Found" showBack onBack={() => navigation.goBack()} />
        <View style={styles.emptyCenter}>
          <Ionicons name="alert-circle-outline" size={48} color={THEME.colors.urgent} />
          <Text style={styles.emptyTitle}>Request Not Found</Text>
          <Text style={styles.emptyDesc}>This request could not be located or has expired.</Text>
          <Button title="Back to Dashboard" onPress={() => navigation.goBack()} style={{ marginTop: 14 }} />
        </View>
      </View>
    );
  }

  const isFulfilled = request.status === 'fulfilled';
  const isCancelled = request.status === 'cancelled';
  const hasAcceptedDonors = contactRequests.some((c) => c.status === 'accepted');

  // Find contact record for currently selected donor if present
  const selectedContact = contactRequests.find((c) => c.donor_id === request.selected_donor_id);

  return (
    <View style={styles.container}>
      <Header
        title="Live Request Tracking"
        subtitle={`Request #${request.id.slice(0, 8)}`}
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity
            style={styles.refreshIconBtn}
            onPress={onRefresh}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="refresh" size={18} color={THEME.colors.slate700} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 28 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={THEME.colors.primary}
          />
        }
      >
        {/* 5-STAGE LIFECYCLE COORDINATION STEPPER matching Website */}
        <Text style={styles.sectionHeader}>5-STAGE COORDINATION LIFECYCLE</Text>
        <Card variant="elevated" style={styles.stageCard}>
          <StageIndicator
            currentStatus={request.status}
            selectedDonorId={request.selected_donor_id}
            hasResponses={contactRequests.length > 0}
          />
        </Card>

        {/* Request Details Summary Card */}
        <Card variant="elevated" style={styles.metaCard}>
          <View style={styles.cardTopRow}>
            <View style={styles.bloodCircle}>
              <Text style={styles.bloodText}>{request.blood_group}</Text>
            </View>
            <View style={styles.requestMetaCol}>
              <Text style={styles.patientName}>{request.patient_name || 'Emergency Patient'}</Text>
              <Text style={styles.hospitalName}>{request.hospital_name}</Text>
              {request.hospital_address && (
                <Text style={styles.hospitalAddress}>{request.hospital_address}</Text>
              )}
            </View>
            <Badge
              label={request.status.toUpperCase()}
              variant={isFulfilled ? 'success' : isCancelled ? 'neutral' : 'urgent'}
            />
          </View>

          <View style={styles.specsRow}>
            <View style={styles.specItem}>
              <Ionicons name="water-outline" size={16} color={THEME.colors.primary} />
              <Text style={styles.specLabel}>{request.units_needed} Unit(s) Needed</Text>
            </View>
            <View style={styles.specItem}>
              <Ionicons name="alert-circle-outline" size={16} color="#D97706" />
              <Text style={styles.specLabel}>{(request.urgency || request.urgency_level)?.toUpperCase() || 'URGENT'}</Text>
            </View>
            <View style={styles.specItem}>
              <Ionicons name="location-outline" size={16} color={THEME.colors.slate500} />
              <Text style={styles.specLabel}>{request.city || 'Nearby Radius'}</Text>
            </View>
          </View>

          {request.notes && (
            <View style={styles.notesBox}>
              <Text style={styles.notesLabel}>Clinical Notes:</Text>
              <Text style={styles.notesText}>{request.notes}</Text>
            </View>
          )}
        </Card>

        {/* ======================================================================
            STAGE 4: CONFIRMED ATTENDING DONOR CARD (When Donor Selected)
            ====================================================================== */}
        {request.selected_donor_id && (
          <Card variant="elevated" style={styles.selectedDonorCard}>
            <View style={styles.selectedDonorHeader}>
              <Ionicons name="checkmark-circle" size={20} color={THEME.colors.success} />
              <Text style={styles.selectedDonorTitle}>Confirmed Attending Donor (Stage 4)</Text>
            </View>

            <Text style={styles.selectedDonorName}>
              {request.selected_donor_name || selectedContact?.donor_name || 'Verified Attending Donor'}
            </Text>

            {/* Direct Phone Number Unmasked */}
            {(request.selected_donor_phone || selectedContact?.donor_phone) ? (
              <View style={styles.phoneActionRow}>
                <View style={styles.phoneDisplay}>
                  <Ionicons name="call" size={16} color={THEME.colors.primary} />
                  <Text style={styles.phoneDisplayText}>
                    {request.selected_donor_phone || selectedContact?.donor_phone}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.callDonorBtn}
                  onPress={() => Linking.openURL(`tel:${request.selected_donor_phone || selectedContact?.donor_phone}`)}
                >
                  <Ionicons name="call" size={14} color="#FFFFFF" />
                  <Text style={styles.callDonorBtnText}>Call Donor</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {!isFulfilled && (
              <View style={styles.selectedDonorBtnRow}>
                <Button
                  title="Confirm Blood Received (Fulfill)"
                  variant="primary"
                  size="md"
                  showArrow
                  onPress={() => setShowFulfillModal(true)}
                  style={{ flex: 1.5, marginRight: 8 }}
                />

                <Button
                  title="Reselect"
                  variant="outline"
                  size="md"
                  loading={reselecting}
                  onPress={handleReselectDonor}
                  style={{ flex: 1 }}
                />
              </View>
            )}
          </Card>
        )}

        {/* ======================================================================
            STAGE 2 & 3: ACTION CONTROLS & LIVE DONOR RESPONSES
            ====================================================================== */}
        {!isFulfilled && !isCancelled && (
          <View style={styles.actionControls}>
            {/* If request is registered, allow broadcasting alerts */}
            {request.status === 'registered' && (
              <Button
                title="Broadcast Emergency Alert to Donors (Stage 2)"
                variant="primary"
                size="lg"
                showArrow
                loading={alertingDonors}
                onPress={handleBroadcastAlert}
                style={{ marginBottom: 12 }}
              />
            )}
          </View>
        )}

        {/* Live Incoming Responses Section (Stage 3) */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionHeader}>
            LIVE DONOR RESPONSES ({contactRequests.length})
          </Text>
          <Text style={styles.livePollingBadge}>• Auto-refreshing</Text>
        </View>

        {contactRequests.length === 0 ? (
          <Card variant="outlined" style={styles.emptyResponsesCard}>
            <Ionicons name="time-outline" size={24} color={THEME.colors.slate400} />
            <Text style={styles.emptyResponsesText}>
              Waiting for responses from nearby donors. When compatible donors tap Accept or Decline on Telegram, their status will update here in real time.
            </Text>
          </Card>
        ) : (
          contactRequests.map((cr) => {
            const isAccepted = cr.status === 'accepted';
            const isDeclined = cr.status === 'declined';
            const isSelectedThis = cr.donor_id === request.selected_donor_id;

            return (
              <Card
                key={cr.id}
                variant={isAccepted ? 'elevated' : 'outlined'}
                style={[styles.crCard, isSelectedThis && styles.crCardSelected]}
              >
                <View style={styles.crTopRow}>
                  <View style={[styles.crAvatar, isAccepted && { backgroundColor: THEME.colors.successBg }]}>
                    <Ionicons
                      name={isAccepted ? 'checkmark-circle' : 'person-outline'}
                      size={20}
                      color={isAccepted ? THEME.colors.success : THEME.colors.navy}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.crDonorName}>{cr.donor_name || 'Volunteer Donor'}</Text>
                    <Text style={styles.crChannelText}>
                      Via {cr.channel?.toUpperCase() || 'TELEGRAM'} • {new Date(cr.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                  <Badge
                    label={cr.status.toUpperCase()}
                    variant={isAccepted ? 'success' : isDeclined ? 'critical' : 'warning'}
                    size="sm"
                  />
                </View>

                {/* If donor accepted and no donor selected yet (or to select this donor) */}
                {isAccepted && !request.selected_donor_id && !isFulfilled && (
                  <Button
                    title="Select This Donor (Stage 4)"
                    variant="primary"
                    size="sm"
                    loading={selectingDonorId === cr.donor_id}
                    onPress={() => handleSelectDonor(cr.donor_id, cr.donor_name || 'Volunteer')}
                    style={{ marginTop: 8 }}
                  />
                )}
              </Card>
            );
          })
        )}

        {/* ======================================================================
            POTENTIAL DONOR MATCHES (Spatial GiST Matrix)
            ====================================================================== */}
        <View style={styles.sectionRow}>
          <Text style={[styles.sectionHeader, { marginTop: 12 }]}>
            MATCHING DONOR POOL IN RADIUS ({candidates.length})
          </Text>
        </View>

        <Card variant="elevated" style={styles.candidatesCard}>
          <Text style={styles.candidatesDesc}>
            Compatible red blood cell candidates located via PostGIS GiST index within 30km:
          </Text>

          {candidates.slice(0, 8).map((cand) => {
            const hasSent = contactRequests.some((c) => c.donor_id === cand.donor_id);

            return (
              <View key={cand.id || cand.donor_id} style={styles.candidateRow}>
                <View style={styles.candPill}>
                  <Text style={styles.candBlood}>{cand.blood_group}</Text>
                </View>

                <View style={styles.candInfo}>
                  <Text style={styles.candName}>{cand.name}</Text>
                  <Text style={styles.candDist}>
                    {cand.distance_km ? `~${cand.distance_km.toFixed(1)} km away` : 'Within radius'}
                  </Text>
                </View>

                {hasSent ? (
                  <Badge label="ALERTED" variant="neutral" size="sm" />
                ) : (
                  <TouchableOpacity
                    style={styles.sendTgBtn}
                    disabled={sendingDonorId === cand.donor_id}
                    onPress={() => handleSendSingleTelegram(cand.donor_id, cand.name)}
                  >
                    <Ionicons name="paper-plane" size={12} color="#FFFFFF" />
                    <Text style={styles.sendTgBtnText}>Alert</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </Card>

        {/* Cancel Action */}
        {!isFulfilled && !isCancelled && (
          <TouchableOpacity onPress={handleCancelRequest} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>Cancel This Emergency Request</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* ======================================================================
          STAGE 5: FULFILLMENT CONFIRMATION MODAL
          ====================================================================== */}
      <Modal visible={showFulfillModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="heart-circle" size={24} color={THEME.colors.primary} />
                <Text style={styles.modalTitle}>Confirm Blood Received (Stage 5)</Text>
              </View>
              <TouchableOpacity onPress={() => setShowFulfillModal(false)}>
                <Ionicons name="close" size={24} color={THEME.colors.slate400} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDesc}>
              Confirming fulfillment officially marks the emergency request fulfilled, awards the donor +100 Life Saver points, and triggers their mandatory 90-day clinical cooldown.
            </Text>

            <Input
              label="Actual Units of Blood Received *"
              placeholder="e.g. 1"
              keyboardType="number-pad"
              value={unitsReceived}
              onChangeText={setUnitsReceived}
            />

            <Input
              label="Hospital Notes / Transfusion Verification"
              placeholder="e.g. Received at hospital blood bank. Patient condition stable."
              multiline
              numberOfLines={3}
              value={fulfillNotes}
              onChangeText={setFulfillNotes}
              style={{ height: 75, textAlignVertical: 'top' }}
            />

            <View style={styles.modalBtns}>
              <Button
                title="Cancel"
                variant="ghost"
                onPress={() => setShowFulfillModal(false)}
                style={{ flex: 1, marginRight: 8 }}
              />
              <Button
                title="Sign & Fulfill Request"
                variant="primary"
                loading={fulfilling}
                onPress={handleConfirmFulfillment}
                style={{ flex: 2 }}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.slate50
  },
  refreshIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: THEME.colors.slate100,
    alignItems: 'center',
    justifyContent: 'center'
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.slate500,
    letterSpacing: 0.8
  },
  livePollingBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.success
  },
  stageCard: {
    padding: 16,
    marginBottom: 14,
    borderRadius: 18
  },
  metaCard: {
    padding: 16,
    marginBottom: 14,
    borderRadius: 18
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
    marginRight: 12,
    ...THEME.shadows.emergency
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
    color: THEME.colors.slate600,
    marginTop: 2
  },
  hospitalAddress: {
    fontSize: 11,
    color: THEME.colors.slate400,
    marginTop: 1
  },
  specsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.slate100,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.slate100
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
    backgroundColor: THEME.colors.slate50,
    borderRadius: 10,
    padding: 10,
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
    color: THEME.colors.slate700,
    lineHeight: 16
  },
  selectedDonorCard: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14
  },
  selectedDonorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6
  },
  selectedDonorTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.colors.successText,
    marginLeft: 6
  },
  selectedDonorName: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.navy,
    marginTop: 2
  },
  phoneActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0'
  },
  phoneDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  phoneDisplayText: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.primary
  },
  callDonorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8
  },
  callDonorBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF'
  },
  selectedDonorBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8
  },
  actionControls: {
    marginBottom: 10
  },
  emptyResponsesCard: {
    alignItems: 'center',
    padding: 18,
    borderRadius: 16,
    marginBottom: 14
  },
  emptyResponsesText: {
    fontSize: 12,
    color: THEME.colors.slate500,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 17
  },
  crCard: {
    padding: 14,
    marginBottom: 10,
    borderRadius: 16
  },
  crCardSelected: {
    borderColor: THEME.colors.success,
    backgroundColor: '#F0FDF4'
  },
  crTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  crAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: THEME.colors.slate100,
    alignItems: 'center',
    justifyContent: 'center'
  },
  crDonorName: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.navy
  },
  crChannelText: {
    fontSize: 11,
    color: THEME.colors.slate500,
    marginTop: 1
  },
  candidatesCard: {
    marginBottom: 16,
    borderRadius: 18,
    padding: 16
  },
  candidatesDesc: {
    fontSize: 12,
    color: THEME.colors.slate500,
    lineHeight: 16,
    marginBottom: 12
  },
  candidateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.slate100
  },
  candPill: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: THEME.colors.primaryLight,
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
    color: THEME.colors.slate500
  },
  sendTgBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8
  },
  sendTgBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF'
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: 14,
    marginBottom: 16
  },
  cancelText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.urgent
  },
  emptyCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.navy,
    marginTop: 10
  },
  emptyDesc: {
    fontSize: 13,
    color: THEME.colors.slate500,
    marginTop: 4,
    textAlign: 'center'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: THEME.colors.overlay,
    justifyContent: 'flex-end'
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.navy
  },
  modalDesc: {
    fontSize: 12,
    color: THEME.colors.slate600,
    lineHeight: 17,
    marginBottom: 12
  },
  modalBtns: {
    flexDirection: 'row',
    marginTop: 10
  }
});
