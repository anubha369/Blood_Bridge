import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../../constants/theme';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { MedicalDisclaimerBanner } from '../../components/MedicalDisclaimerBanner';

export const PrivacyPolicyScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <Header
        title="Privacy & Clinical Policy"
        subtitle="BloodBridge Vision-X Governance"
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <MedicalDisclaimerBanner />

        <Card variant="elevated" style={styles.sectionCard}>
          <View style={styles.headerRow}>
            <Ionicons name="shield-checkmark" size={22} color={THEME.colors.primary} />
            <Text style={styles.sectionTitle}>1. Donor Location Privacy & Geo-Banding</Text>
          </View>
          <Text style={styles.sectionBody}>
            BloodBridge Vision-X calculates spatial proximity using PostGIS spatial indexes and fuzzy
            distance bands (e.g. within 5km, within 15km). Raw GPS coordinates of donors are never
            transmitted or rendered directly to public requesters to safeguard volunteer privacy.
          </Text>
        </Card>

        <Card variant="elevated" style={styles.sectionCard}>
          <View style={styles.headerRow}>
            <Ionicons name="call" size={22} color={THEME.colors.primary} />
            <Text style={styles.sectionTitle}>2. Contact Masking & Explicit Consent</Text>
          </View>
          <Text style={styles.sectionBody}>
            Donor phone numbers and direct contact details remain masked until a volunteer donor
            explicitly accepts an incoming contact request. Requesters cannot view contact numbers
            until selection and confirmation is verified.
          </Text>
        </Card>

        <Card variant="elevated" style={styles.sectionCard}>
          <View style={styles.headerRow}>
            <Ionicons name="time" size={22} color={THEME.colors.primary} />
            <Text style={styles.sectionTitle}>3. 3-Month Clinical Cooldown Safeguard</Text>
          </View>
          <Text style={styles.sectionBody}>
            To protect donor physiology and comply with WHO / National Blood Transfusion Council
            guidelines, donors enter a strictly enforced 90-day cooldown following any confirmed whole
            blood donation. During cooldown, the matching engine automatically suppresses dispatch to
            the donor.
          </Text>
        </Card>

        <Card variant="elevated" style={styles.sectionCard}>
          <View style={styles.headerRow}>
            <Ionicons name="sparkles" size={22} color={THEME.colors.primary} />
            <Text style={styles.sectionTitle}>4. Groq AI & Medical RAG Guardrails</Text>
          </View>
          <Text style={styles.sectionBody}>
            The embedded BloodBridge AI assistant is strictly grounded in peer-reviewed transfusion
            medicine documentation via Retrieval-Augmented Generation (RAG). It provides operational
            coordination guidance and cannot issue prescription medical advice.
          </Text>
        </Card>

        <Card variant="elevated" style={styles.sectionCard}>
          <View style={styles.headerRow}>
            <Ionicons name="trash" size={22} color={THEME.colors.urgent} />
            <Text style={styles.sectionTitle}>5. Right to Withdraw Consent & Unlink</Text>
          </View>
          <Text style={styles.sectionBody}>
            Donors may toggle availability to "Unavailable" or withdraw contact consent at any
            time in one tap through the Donor Dashboard. Telegram alert channels can be unlinked
            instantly via the Consent Management screen.
          </Text>
        </Card>
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
  sectionCard: {
    marginBottom: 14
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.navy,
    marginLeft: 10
  },
  sectionBody: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    lineHeight: 19
  }
});

