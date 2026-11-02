import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../../constants/theme';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { MedicalDisclaimerBanner } from '../../components/MedicalDisclaimerBanner';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const HowItWorksScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.screenWrapper}>
      <Header
        showBrand
        title="How It Works"
        subtitle="Architecture & Verification Guide"
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 28 }]}
        showsVerticalScrollIndicator={false}
      >
        <MedicalDisclaimerBanner />

        {/* Hero Title Section */}
        <View style={styles.heroSection}>
          <View style={styles.badgeWrapper}>
            <Badge label="ARCHITECTURE & VERIFICATION GUIDE" variant="urgent" size="sm" />
          </View>
          <Text style={styles.heroTitle}>How BloodBridge Coordinates Emergencies</Text>
          <Text style={styles.heroSubtitle}>
            BloodBridge replaces chaotic social media requests and manual phone calling with a
            deterministic, privacy-first coordination platform.
          </Text>
        </View>

        {/* Workflow Title */}
        <View style={styles.sectionHeader}>
          <Ionicons name="layers-outline" size={20} color={THEME.colors.primary} />
          <Text style={styles.sectionTitle}>The End-to-End Coordination Workflow</Text>
        </View>

        {/* 4 Steps matching website */}
        {/* Step 1 */}
        <Card variant="elevated" style={styles.stepCard}>
          <View style={styles.stepHeader}>
            <View style={[styles.stepNumCircle, { backgroundColor: THEME.colors.primary }]}>
              <Text style={styles.stepNumText}>1</Text>
            </View>
            <View style={styles.stepTagPillRose}>
              <Text style={styles.stepTagTextRose}>Smart Request Parsing</Text>
            </View>
          </View>
          <Text style={styles.stepTitle}>Request Formulation</Text>
          <Text style={styles.stepBody}>
            Users describe what they need in natural language or a structured form (e.g.{' '}
            <Text style={styles.italic}>"Need 2 units of B+ near Ghaziabad tomorrow"</Text>). Our
            intelligent parser extracts the blood group, units, location, and urgency into
            structured fields without hallucinating medical facts.
          </Text>
        </Card>

        {/* Step 2 */}
        <Card variant="elevated" style={styles.stepCard}>
          <View style={styles.stepHeader}>
            <View style={[styles.stepNumCircle, { backgroundColor: '#4F46E5' }]}>
              <Text style={styles.stepNumText}>2</Text>
            </View>
            <View style={styles.stepTagPillIndigo}>
              <Text style={styles.stepTagTextIndigo}>PostGIS GiST</Text>
            </View>
          </View>
          <Text style={styles.stepTitle}>Spatial Database Filtering</Text>
          <Text style={styles.stepBody}>
            The backend queries the PostGIS database using{' '}
            <Text style={styles.code}>ST_DWithin</Text> and{' '}
            <Text style={styles.code}>ST_Distance</Text> on SRID 4326 geography points. PostGIS uses
            GiST spatial indexes to evaluate nearby points in under 15ms.
          </Text>
        </Card>

        {/* Step 3 */}
        <Card variant="elevated" style={styles.stepCard}>
          <View style={styles.stepHeader}>
            <View style={[styles.stepNumCircle, { backgroundColor: '#059669' }]}>
              <Text style={styles.stepNumText}>3</Text>
            </View>
            <View style={styles.stepTagPillEmerald}>
              <Text style={styles.stepTagTextEmerald}>Privacy Enforcement</Text>
            </View>
          </View>
          <Text style={styles.stepTitle}>Consent & Geo-Privacy Masking</Text>
          <Text style={styles.stepBody}>
            Donors who withdraw consent or mark themselves unavailable are automatically excluded.
            For consenting donors, exact coordinates and home addresses are never sent to the client;
            only approximate bands like <Text style={styles.bold}>"Within 2 km"</Text> are returned.
          </Text>
        </Card>

        {/* Step 4 */}
        <Card variant="elevated" style={styles.stepCard}>
          <View style={styles.stepHeader}>
            <View style={[styles.stepNumCircle, { backgroundColor: '#D97706' }]}>
              <Text style={styles.stepNumText}>4</Text>
            </View>
            <View style={styles.stepTagPillAmber}>
              <Text style={styles.stepTagTextAmber}>Clinical Boundary</Text>
            </View>
          </View>
          <Text style={styles.stepTitle}>Hospital Clinical Validation</Text>
          <Text style={styles.stepBody}>
            When a potential donor is located, they report to the hospital or blood bank. Certified
            blood bank pathologists perform ABO cross-matching, antibody screening, and hemoglobin
            validation before any transfusion takes place.
          </Text>
        </Card>

        {/* Google Forms Pipeline matching Screenshot 5 */}
        <Card variant="elevated" style={styles.pipelineCard}>
          <View style={styles.pipelineHeader}>
            <View style={styles.pipelineIconCircle}>
              <Ionicons name="document-text-outline" size={20} color="#059669" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.pipelineTitle}>Google Forms & Sheets Pipeline</Text>
              <Text style={styles.pipelineSub}>
                How external donor drive submissions reach the database securely
              </Text>
            </View>
          </View>

          <View style={styles.pipelineStep}>
            <Text style={styles.pipelineStepNum}>1. Google Form</Text>
            <Text style={styles.pipelineStepText}>
              Donor submits name, blood group, city, phone, and contact consent.
            </Text>
          </View>

          <View style={styles.pipelineStep}>
            <Text style={styles.pipelineStepNum}>2. Google Sheet</Text>
            <Text style={styles.pipelineStepText}>
              Row is inserted and triggers Google Apps Script onFormSubmit event.
            </Text>
          </View>

          <View style={styles.pipelineStep}>
            <Text style={styles.pipelineStepNum}>3. Apps Script Webhook</Text>
            <Text style={styles.pipelineStepText}>
              Sends HTTP POST to backend with <Text style={styles.code}>x-webhook-secret</Text> header.
            </Text>
          </View>

          <View style={styles.pipelineStep}>
            <Text style={styles.pipelineStepNum}>4. Pending Verification</Text>
            <Text style={styles.pipelineStepText}>
              Backend validates payload, geocodes city, and inserts with{' '}
              <Text style={styles.italic}>pending_verification</Text> status.
            </Text>
          </View>
        </Card>

        {/* RAG Knowledge Architecture */}
        <Card variant="elevated" style={styles.ragCard}>
          <View style={styles.pipelineHeader}>
            <View style={[styles.pipelineIconCircle, { backgroundColor: '#EEF2FF' }]}>
              <Ionicons name="server-outline" size={20} color="#4F46E5" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.pipelineTitle}>RAG Knowledge Architecture</Text>
              <Text style={styles.pipelineSub}>Grounded medical assistance without hallucinations</Text>
            </View>
          </View>

          <Text style={styles.ragText}>
            Unlike generic AI chatbots that hallucinate medical facts, BloodBridge implements a strict{' '}
            <Text style={styles.bold}>RAG pipeline</Text>:
          </Text>

          <View style={styles.bulletRow}>
            <Ionicons name="checkmark-circle" size={16} color="#059669" style={{ marginTop: 2 }} />
            <Text style={styles.bulletText}>
              <Text style={styles.bold}>Admin Ingestion Gate: </Text>Only documents reviewed and given{' '}
              <Text style={styles.code}>status = 'approved'</Text> can be retrieved.
            </Text>
          </View>

          <View style={styles.bulletRow}>
            <Ionicons name="checkmark-circle" size={16} color="#059669" style={{ marginTop: 2 }} />
            <Text style={styles.bulletText}>
              <Text style={styles.bold}>Text Chunking: </Text>Long documents from NBTC, WHO, and DGHS are chunked into overlapping segments.
            </Text>
          </View>

          <View style={styles.bulletRow}>
            <Ionicons name="checkmark-circle" size={16} color="#059669" style={{ marginTop: 2 }} />
            <Text style={styles.bulletText}>
              <Text style={styles.bold}>Vector Retrieval: </Text>User queries are vectorized and matched using cosine similarity against approved chunks.
            </Text>
          </View>

          <View style={styles.bulletRow}>
            <Ionicons name="checkmark-circle" size={16} color="#059669" style={{ marginTop: 2 }} />
            <Text style={styles.bulletText}>
              <Text style={styles.bold}>Citations & Fallback: </Text>If approved documents do not contain the answer, the AI clearly states so and cites its sources.
            </Text>
          </View>
        </Card>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    backgroundColor: '#FAF9F6'
  },
  container: {
    flex: 1
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 12
  },
  heroSection: {
    alignItems: 'center',
    marginVertical: 14,
    paddingHorizontal: 8
  },
  badgeWrapper: {
    marginBottom: 8
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: THEME.colors.navy,
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: 8
  },
  heroSubtitle: {
    fontSize: 13,
    color: THEME.colors.slate600,
    textAlign: 'center',
    lineHeight: 18
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    marginBottom: 12
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.navy
  },
  stepCard: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 16
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10
  },
  stepNumCircle: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  stepNumText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF'
  },
  stepTagPillRose: {
    backgroundColor: '#FFF1F2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12
  },
  stepTagTextRose: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.primary
  },
  stepTagPillIndigo: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12
  },
  stepTagTextIndigo: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4F46E5'
  },
  stepTagPillEmerald: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12
  },
  stepTagTextEmerald: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669'
  },
  stepTagPillAmber: {
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12
  },
  stepTagTextAmber: {
    fontSize: 10,
    fontWeight: '700',
    color: '#D97706'
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.navy,
    marginBottom: 6
  },
  stepBody: {
    fontSize: 12,
    color: THEME.colors.slate600,
    lineHeight: 18
  },
  italic: {
    fontStyle: 'italic',
    color: THEME.colors.slate800
  },
  bold: {
    fontWeight: '700',
    color: THEME.colors.slate900
  },
  code: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 11,
    backgroundColor: '#F1F5F9',
    color: '#4F46E5',
    paddingHorizontal: 4,
    borderRadius: 4
  },
  pipelineCard: {
    padding: 16,
    marginBottom: 14,
    borderRadius: 18
  },
  pipelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14
  },
  pipelineIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center'
  },
  pipelineTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.navy
  },
  pipelineSub: {
    fontSize: 11,
    color: THEME.colors.slate500,
    marginTop: 1
  },
  pipelineStep: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 12,
    padding: 10,
    marginBottom: 8
  },
  pipelineStepNum: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.navy,
    marginBottom: 2
  },
  pipelineStepText: {
    fontSize: 11,
    color: THEME.colors.slate600,
    lineHeight: 15
  },
  ragCard: {
    padding: 16,
    marginBottom: 16,
    borderRadius: 18
  },
  ragText: {
    fontSize: 12,
    color: THEME.colors.slate600,
    marginBottom: 10,
    lineHeight: 16
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8
  },
  bulletText: {
    flex: 1,
    fontSize: 11,
    color: THEME.colors.slate600,
    lineHeight: 16
  }
});
