import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../../constants/theme';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { MedicalDisclaimerBanner } from '../../components/MedicalDisclaimerBanner';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const DispatchConfirmationScreen: React.FC<{ navigation: any; route: any }> = ({
  navigation,
  route
}) => {
  const insets = useSafeAreaInsets();
  const {
    requestId,
    patientName,
    hospitalName,
    bloodGroup,
    unitsNeeded,
    donorsAlertedCount
  } = route.params;

  return (
    <View style={styles.screen}>
      <Header
        title="Dispatch Confirmed (4/4)"
        subtitle="Step 4: Emergency Alerts Broadcast"
        showBack={false}
      />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 28 }]}
        showsVerticalScrollIndicator={false}
      >
        <MedicalDisclaimerBanner />

        {/* Step Badge */}
        <View style={styles.stepBadge}>
          <Text style={styles.stepBadgeText}>STEP 4 OF 4 • DISPATCH CONFIRMED</Text>
        </View>

        {/* Hero Success Block */}
        <View style={styles.heroSection}>
          <View style={styles.emblemContainer}>
            <Ionicons name="checkmark-circle" size={56} color="#059669" />
          </View>
          <Text style={styles.heroTitle}>Your request is on its way</Text>
          <Text style={styles.heroSubtitle}>
            Emergency alerts have been broadcast to compatible donors via the BloodBridge Telegram
            Dispatch Bot (@Blood_Bridgebot).
          </Text>
        </View>

        {/* Request Summary Card */}
        <Card variant="elevated" style={styles.summaryCard}>
          <View style={styles.summaryTopRow}>
            <View style={styles.bloodCircle}>
              <Text style={styles.bloodText}>{bloodGroup || 'O+'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.summaryPatient}>{patientName || 'Emergency Patient'}</Text>
              <Text style={styles.summaryHospital} numberOfLines={1}>{hospitalName}</Text>
              <Text style={styles.summaryUnits}>
                Required: <Text style={styles.bold}>{unitsNeeded || 1} Unit(s)</Text>
              </Text>
            </View>
            <Badge label="ALERT DISPATCHED" variant="urgent" size="sm" />
          </View>
        </Card>

        {/* "What Happens Next?" 3-Step Timeline Card matching Figma */}
        <Card variant="outlined" style={styles.timelineCard}>
          <View style={styles.timelineHeader}>
            <Ionicons name="git-network-outline" size={18} color={THEME.colors.navy} />
            <Text style={styles.timelineTitle}>What happens next?</Text>
          </View>

          {/* Timeline Step 1 */}
          <View style={styles.stepRow}>
            <View style={[styles.stepNumBox, { backgroundColor: '#EEF2FF' }]}>
              <Text style={[styles.stepNum, { color: '#4F46E5' }]}>1</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.stepHeading}>Donors Receive Instant Alerts</Text>
              <Text style={styles.stepDesc}>
                Nearby matching donors receive high-priority alerts with hospital location on Telegram.
              </Text>
            </View>
          </View>

          {/* Timeline Step 2 */}
          <View style={styles.stepRow}>
            <View style={[styles.stepNumBox, { backgroundColor: '#ECFDF5' }]}>
              <Text style={[styles.stepNum, { color: '#059669' }]}>2</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.stepHeading}>Donors Respond in Real Time</Text>
              <Text style={styles.stepDesc}>
                Available donors tap "Accept to Help". Your live tracking screen updates automatically
                every 5 seconds.
              </Text>
            </View>
          </View>

          {/* Timeline Step 3 */}
          <View style={styles.stepRow}>
            <View style={[styles.stepNumBox, { backgroundColor: '#FFF1F2' }]}>
              <Text style={[styles.stepNum, { color: THEME.colors.primary }]}>3</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.stepHeading}>Direct Telephone Unmasking</Text>
              <Text style={styles.stepDesc}>
                Select the donor to unmask their verified direct phone number for immediate bedside
                coordination.
              </Text>
            </View>
          </View>
        </Card>

        {/* Primary Action: Track Request Live */}
        <Button
          title="Track Request Live (5 Stages)"
          variant="primary"
          size="lg"
          showArrow
          icon={<Ionicons name="pulse" size={20} color="#FFFFFF" />}
          onPress={() => navigation.replace('RequestTracking', { requestId })}
          style={{ marginTop: 16 }}
        />

        {/* Secondary Action: Call Nearby Blood Banks */}
        <Button
          title="Call Nearby Blood Banks"
          variant="outline"
          size="lg"
          icon={<Ionicons name="business-outline" size={18} color={THEME.colors.navy} />}
          onPress={() => navigation.navigate('BloodBankDirectory')}
          style={{ marginTop: 10 }}
        />
      </ScrollView>
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
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    marginBottom: 10
  },
  stepBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#065F46',
    letterSpacing: 0.6
  },
  heroSection: {
    alignItems: 'center',
    marginVertical: 14
  },
  emblemContainer: {
    marginBottom: 8
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: THEME.colors.navy,
    letterSpacing: -0.4,
    marginBottom: 6,
    textAlign: 'center'
  },
  heroSubtitle: {
    fontSize: 13,
    color: THEME.colors.slate600,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 10
  },
  summaryCard: {
    padding: 16,
    borderRadius: 18,
    marginBottom: 14
  },
  summaryTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  bloodCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...THEME.shadows.emergency
  },
  bloodText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF'
  },
  summaryPatient: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.navy
  },
  summaryHospital: {
    fontSize: 12,
    color: THEME.colors.slate500,
    marginTop: 1
  },
  summaryUnits: {
    fontSize: 11,
    color: THEME.colors.slate600,
    marginTop: 2
  },
  bold: {
    fontWeight: '800',
    color: THEME.colors.navy
  },
  timelineCard: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#FFFFFF'
  },
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14
  },
  timelineTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.navy
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12
  },
  stepNumBox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1
  },
  stepNum: {
    fontSize: 12,
    fontWeight: '800'
  },
  stepHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.colors.navy
  },
  stepDesc: {
    fontSize: 11,
    color: THEME.colors.slate600,
    marginTop: 2,
    lineHeight: 15
  }
});
