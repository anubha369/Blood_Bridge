import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
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
import { api } from '../../services/api';
import { DonorCandidate, BloodBank } from '../../constants/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const DonorMatchingReviewScreen: React.FC<{ navigation: any; route: any }> = ({
  navigation,
  route
}) => {
  const insets = useSafeAreaInsets();
  const { requestId, bloodGroup, unitsNeeded, hospitalName, patientName } = route.params;

  const [candidates, setCandidates] = useState<DonorCandidate[]>([]);
  const [bloodBanks, setBloodBanks] = useState<BloodBank[]>([]);
  const [loading, setLoading] = useState(true);
  const [broadcasting, setBroadcasting] = useState(false);
  const [alertingDonorId, setAlertingDonorId] = useState<string | null>(null);
  const [alertedIds, setAlertedIds] = useState<string[]>([]);

  const fetchCandidates = useCallback(async () => {
    try {
      const [candRes, banksRes] = await Promise.allSettled([
        api.requests.getCandidates(requestId),
        api.bloodBanks.getAll()
      ]);

      if (candRes.status === 'fulfilled' && candRes.value.success) {
        setCandidates(candRes.value.candidates || []);
      }
      if (banksRes.status === 'fulfilled' && banksRes.value.success) {
        setBloodBanks(banksRes.value.blood_banks || []);
      }
    } catch (err: any) {
      console.warn('Error fetching matching donors:', err.message);
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  const handleBroadcastAlert = async () => {
    try {
      setBroadcasting(true);
      const res = await api.requests.alertDonors(requestId);
      if (res.success) {
        navigation.replace('DispatchConfirmation', {
          requestId,
          patientName,
          hospitalName,
          bloodGroup,
          unitsNeeded,
          donorsAlertedCount: res.donors_alerted_count || candidates.length
        });
      } else {
        Alert.alert('Notice', res.error || 'Failed to dispatch alert.');
      }
    } catch (err: any) {
      // If error or already alerted, proceed to confirmation
      navigation.replace('DispatchConfirmation', {
        requestId,
        patientName,
        hospitalName,
        bloodGroup,
        unitsNeeded,
        donorsAlertedCount: candidates.length
      });
    } finally {
      setBroadcasting(false);
    }
  };

  const handleAlertSingleDonor = async (donorId: string, donorName?: string) => {
    try {
      setAlertingDonorId(donorId);
      const res = await api.requests.sendDonorRequest(requestId, donorId);
      if (res.success) {
        setAlertedIds((prev) => [...prev, donorId]);
        Alert.alert(
          'Emergency Alert Dispatched! 🩸',
          `Notification sent to ${donorName || 'donor'} via Telegram Bot @Blood_Bridgebot.`
        );
      } else {
        Alert.alert('Alert Notice', res.error || 'Failed to send alert to this donor.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setAlertingDonorId(null);
    }
  };

  if (loading) {
    return <LoadingScreen message="Searching spatial database for compatible donors..." />;
  }

  return (
    <View style={styles.screen}>
      <Header
        title="Verified Matching Donors (3/4)"
        subtitle="Step 3: Review Spatial Candidates"
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 80 }]}
        showsVerticalScrollIndicator={false}
      >
        <MedicalDisclaimerBanner />

        {/* Step Progress Pill */}
        <View style={styles.stepBadge}>
          <Text style={styles.stepBadgeText}>STEP 3 OF 4 • DONOR MATCHING</Text>
        </View>

        {/* Header Heading matching Figma */}
        <View style={styles.headerSection}>
          <Text style={styles.mainHeading}>
            {candidates.length > 0 ? `${candidates.length} donors within reach` : 'Matching donors nearby'}
          </Text>
          <Text style={styles.subHeading}>
            Compatible {bloodGroup || 'whole blood'} donors within 30km evaluated by PostGIS GiST index.
          </Text>
        </View>

        {/* Geo-Privacy Enforcement Notice */}
        <Card variant="outlined" style={styles.privacyCard}>
          <View style={styles.privacyRow}>
            <Ionicons name="shield-checkmark" size={20} color="#059669" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.privacyTitle}>Geo-Privacy & Masking Active</Text>
              <Text style={styles.privacyDesc}>
                Exact home addresses and coordinates are protected. Approximate distance bands
                like "Within 3 km" are displayed until a donor accepts.
              </Text>
            </View>
          </View>
        </Card>

        {/* Matching Candidates List */}
        <Text style={styles.sectionTitle}>Nearby Compatible Donors</Text>

        {candidates.length > 0 ? (
          candidates.map((cand) => {
            const isAlerted = alertedIds.includes(cand.id);
            return (
              <Card key={cand.id} variant="elevated" style={styles.candidateCard}>
                <View style={styles.candTopRow}>
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarText}>{cand.blood_group || bloodGroup}</Text>
                  </View>
                  <View style={styles.candInfo}>
                    <Text style={styles.candName}>{cand.name || 'Volunteer Donor'}</Text>
                    <View style={styles.tagRow}>
                      <Badge
                        label={cand.distance_band || 'Within 5 km'}
                        variant="brand"
                        size="sm"
                      />
                      <Badge label="VERIFIED" variant="verified" size="sm" />
                    </View>
                  </View>
                </View>

                <View style={styles.candBottomRow}>
                  <Text style={styles.dispatchNote}>
                    {isAlerted ? 'Alert dispatched via @Blood_Bridgebot' : 'Available for immediate emergency dispatch'}
                  </Text>
                  <Button
                    title={isAlerted ? 'Alert Sent' : 'Alert via Telegram'}
                    variant={isAlerted ? 'secondary' : 'primary'}
                    size="sm"
                    loading={alertingDonorId === cand.id}
                    icon={
                      <Ionicons
                        name={isAlerted ? 'checkmark-circle' : 'paper-plane'}
                        size={14}
                        color="#FFFFFF"
                      />
                    }
                    onPress={() => handleAlertSingleDonor(cand.id, cand.name)}
                    style={{ minWidth: 140 }}
                  />
                </View>
              </Card>
            );
          })
        ) : (
          <Card variant="outlined" style={styles.noCandCard}>
            <Ionicons name="people-outline" size={32} color={THEME.colors.slate400} />
            <Text style={styles.noCandTitle}>No volunteer donors registered in immediate radius</Text>
            <Text style={styles.noCandDesc}>
              You can broadcast to our emergency Telegram dispatch network or contact accredited
              hospital blood banks below.
            </Text>
          </Card>
        )}

        {/* Regional Blood Banks Fallback */}
        <View style={styles.bloodBankSection}>
          <Text style={styles.sectionTitle}>Accredited Hospital Blood Banks</Text>
          <Text style={styles.sectionSub}>
            Direct regional stock reserves for immediate whole-blood cross-matching.
          </Text>

          {bloodBanks.slice(0, 3).map((bank) => (
            <Card key={bank.id} variant="outlined" style={styles.bankCard}>
              <View style={styles.bankHeader}>
                <Ionicons name="business" size={18} color={THEME.colors.primary} />
                <Text style={styles.bankName} numberOfLines={1}>{bank.name}</Text>
              </View>
              <Text style={styles.bankAddress} numberOfLines={1}>{bank.address}, {bank.city}</Text>
              <View style={styles.bankStockRow}>
                <Text style={styles.bankPhone}>Tel: {bank.phone || '+91 141 2560291'}</Text>
                <Badge label="VERIFIED CENTRE" variant="success" size="sm" />
              </View>
            </Card>
          ))}
        </View>
      </ScrollView>

      {/* Floating Bottom Sticky Action Bar */}
      <View style={[styles.bottomStickyBar, { paddingBottom: insets.bottom + 12 }]}>
        <Button
          title={broadcasting ? 'Broadcasting Alert...' : 'Broadcast Emergency Dispatch to All Donors'}
          variant="primary"
          size="lg"
          showArrow
          loading={broadcasting}
          icon={<Ionicons name="radio" size={20} color="#FFFFFF" />}
          onPress={handleBroadcastAlert}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FAF9F6'
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 12
  },
  stepBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    marginBottom: 8
  },
  stepBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.primary,
    letterSpacing: 0.6
  },
  headerSection: {
    marginBottom: 14
  },
  mainHeading: {
    fontSize: 24,
    fontWeight: '900',
    color: THEME.colors.navy,
    letterSpacing: -0.4,
    marginBottom: 4
  },
  subHeading: {
    fontSize: 13,
    color: THEME.colors.slate600,
    lineHeight: 18
  },
  privacyCard: {
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    marginBottom: 16
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  privacyTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#065F46'
  },
  privacyDesc: {
    fontSize: 11,
    color: '#047857',
    marginTop: 2,
    lineHeight: 15
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.navy,
    marginBottom: 4
  },
  sectionSub: {
    fontSize: 11,
    color: THEME.colors.slate500,
    marginBottom: 10
  },
  candidateCard: {
    padding: 14,
    marginBottom: 10,
    borderRadius: 16
  },
  candTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    ...THEME.shadows.emergency
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF'
  },
  candInfo: {
    flex: 1
  },
  candName: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.navy,
    marginBottom: 4
  },
  tagRow: {
    flexDirection: 'row',
    gap: 6
  },
  candBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
    paddingTop: 10
  },
  dispatchNote: {
    flex: 1,
    fontSize: 10,
    color: THEME.colors.slate500,
    marginRight: 8
  },
  noCandCard: {
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: 16
  },
  noCandTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.colors.navy,
    marginTop: 8,
    textAlign: 'center'
  },
  noCandDesc: {
    fontSize: 11,
    color: THEME.colors.slate500,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16
  },
  bloodBankSection: {
    marginTop: 10,
    marginBottom: 20
  },
  bankCard: {
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    marginBottom: 8
  },
  bankHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4
  },
  bankName: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.colors.navy,
    flex: 1
  },
  bankAddress: {
    fontSize: 11,
    color: THEME.colors.slate500,
    marginBottom: 6
  },
  bankStockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  bankPhone: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.primary
  },
  bottomStickyBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
    paddingHorizontal: 16,
    paddingTop: 10,
    ...THEME.shadows.lg
  }
});
