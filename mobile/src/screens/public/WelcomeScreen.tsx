import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../../constants/theme';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { MedicalDisclaimerBanner } from '../../components/MedicalDisclaimerBanner';
import { useAuth } from '../../context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const WelcomeScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { loginAsDemo } = useAuth();
  const [demoLoading, setDemoLoading] = useState<string | null>(null);

  const handleDemoLogin = async (role: 'donor' | 'requester' | 'admin') => {
    try {
      setDemoLoading(role);
      const user = await loginAsDemo(role);
      if (user.role === 'donor') {
        navigation.replace('DonorMain');
      } else if (user.role === 'admin') {
        navigation.replace('AdminMain');
      } else {
        navigation.replace('RequesterMain');
      }
    } catch (err: any) {
      Alert.alert('Evaluation Login', err.message || 'Unable to log in with evaluation account.');
    } finally {
      setDemoLoading(null);
    }
  };

  return (
    <View style={styles.screenWrapper}>
      {/* Top Clinical Coordination Notice Bar matching website */}
      <View style={{ paddingTop: insets.top }}>
        <MedicalDisclaimerBanner />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Minimal Navigation Bar Header */}
        <View style={styles.navHeader}>
          <View style={styles.brandGroup}>
            <View style={styles.emblemSquare}>
              <Image
                source={require('../../assets/bloodbridge-hero-emblem-transparent.png')}
                style={styles.emblemImage}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.brandText}>
              Blood<Text style={styles.brandCrimson}>Bridge</Text>
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => navigation.navigate('BloodBankDirectory')}
            style={styles.bloodBankPill}
            activeOpacity={0.8}
          >
            <Ionicons name="business-outline" size={14} color={THEME.colors.slate700} />
            <Text style={styles.bloodBankPillText}>Blood Banks</Text>
          </TouchableOpacity>
        </View>

        {/* Hero Section */}
        <View style={styles.heroSection}>
          {/* Eyebrow Badge */}
          <View style={styles.eyebrowBadge}>
            <View style={styles.pulseDot} />
            <Text style={styles.eyebrowText}>EMERGENCY BLOOD COORDINATION</Text>
          </View>

          {/* Large Hero Title */}
          <Text style={styles.heroTitle}>
            Blood<Text style={styles.heroTitleCrimson}>Bridge</Text>
          </Text>

          {/* Subheading */}
          <View style={styles.subheadingContainer}>
            <Text style={styles.subheadingMain}>Bridging the Gap Between</Text>
            <Text style={styles.subheadingPunch}>
              <Text style={styles.subheadingNavy}>Need </Text>
              <Text style={styles.subheadingGray}>and </Text>
              <Text style={styles.subheadingCrimson}>Hope</Text>
            </Text>
          </View>

          {/* Description */}
          <Text style={styles.heroDesc}>
            A platform that connects blood donors with those in need, helping save lives, one drop at a time.
          </Text>

          {/* Hero CTA Button: Log In */}
          <View style={styles.ctaRow}>
            <Button
              title="Log In"
              variant="primary"
              size="lg"
              showArrow
              icon={<Ionicons name="lock-closed" size={18} color="#FFFFFF" />}
              onPress={() => navigation.navigate('Login')}
              style={styles.heroLoginBtn}
            />
          </View>

          {/* Trust Indicators */}
          <View style={styles.trustGrid}>
            <View style={styles.trustItem}>
              <Ionicons name="checkmark-circle" size={16} color={THEME.colors.success} />
              <Text style={styles.trustText}>Verified Donors</Text>
            </View>
            <View style={styles.trustItem}>
              <Ionicons name="checkmark-circle" size={16} color={THEME.colors.success} />
              <Text style={styles.trustText}>Privacy-First</Text>
            </View>
            <View style={styles.trustItem}>
              <Ionicons name="checkmark-circle" size={16} color={THEME.colors.success} />
              <Text style={styles.trustText}>NBTC Guidelines</Text>
            </View>
            <View style={styles.trustItem}>
              <Ionicons name="checkmark-circle" size={16} color={THEME.colors.success} />
              <Text style={styles.trustText}>100% Unpaid</Text>
            </View>
          </View>

          {/* Hero Bridge Illustration Artwork */}
          <View style={styles.artworkContainer}>
            <Image
              source={require('../../assets/bloodbridge-hero-emblem-transparent.png')}
              style={styles.heroArtwork}
              resizeMode="contain"
            />
            <View style={styles.statusPill}>
              <View style={styles.greenDot} />
              <Text style={styles.statusPillText}>Clinical Coordination Active</Text>
              <Text style={styles.statusPillSep}>•</Text>
              <Ionicons name="shield-checkmark-outline" size={12} color={THEME.colors.primary} />
              <Text style={[styles.statusPillText, { color: THEME.colors.primary }]}>NBTC Standards</Text>
            </View>
          </View>
        </View>

        {/* 1-Click Evaluation Accounts */}
        <Card variant="outlined" style={styles.evalCard}>
          <View style={styles.evalHeader}>
            <Ionicons name="flash" size={16} color={THEME.colors.gold} />
            <Text style={styles.evalTitle}>1-Click Evaluation Accounts</Text>
          </View>
          <Text style={styles.evalSubtitle}>
            Instant mobile evaluation without entering manual credentials:
          </Text>

          <View style={styles.evalRow}>
            <Button
              title="Donor (Sarah)"
              size="sm"
              variant="outline"
              loading={demoLoading === 'donor'}
              onPress={() => handleDemoLogin('donor')}
              style={styles.evalBtn}
            />
            <Button
              title="Hospital (Mehta)"
              size="sm"
              variant="secondary"
              loading={demoLoading === 'requester'}
              onPress={() => handleDemoLogin('requester')}
              style={styles.evalBtn}
            />
            <Button
              title="Admin"
              size="sm"
              variant="ghost"
              loading={demoLoading === 'admin'}
              onPress={() => handleDemoLogin('admin')}
              style={styles.evalBtn}
            />
          </View>
        </Card>

        {/* Create Account Action */}
        <View style={styles.signupAction}>
          <Button
            title="Create New Account"
            variant="secondary"
            size="lg"
            showArrow
            onPress={() => navigation.navigate('Register')}
          />
        </View>

        {/* Privacy Policy Footer */}
        <TouchableOpacity
          onPress={() => navigation.navigate('PrivacyPolicy')}
          style={styles.privacyLink}
        >
          <Text style={styles.privacyText}>Healthcare Data Privacy Policy & Consent Terms</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    backgroundColor: THEME.colors.background
  },
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 12
  },
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    marginBottom: 16
  },
  brandGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  emblemSquare: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
    ...THEME.shadows.sm
  },
  emblemImage: {
    width: '100%',
    height: '100%'
  },
  brandText: {
    fontSize: 22,
    fontWeight: '900',
    color: THEME.colors.navy,
    letterSpacing: -0.4
  },
  brandCrimson: {
    color: THEME.colors.primary
  },
  bloodBankPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: THEME.colors.borderDark
  },
  bloodBankPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.slate700
  },
  heroSection: {
    marginTop: 4,
    marginBottom: 20
  },
  eyebrowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 14
  },
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: THEME.colors.primary,
    marginRight: 6
  },
  eyebrowText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#881337',
    letterSpacing: 0.6
  },
  heroTitle: {
    fontSize: 42,
    fontWeight: '900',
    color: THEME.colors.navy,
    letterSpacing: -1,
    lineHeight: 46
  },
  heroTitleCrimson: {
    color: THEME.colors.primary
  },
  subheadingContainer: {
    marginTop: 10,
    marginBottom: 12
  },
  subheadingMain: {
    fontSize: 24,
    fontWeight: '800',
    color: THEME.colors.slate800,
    letterSpacing: -0.4
  },
  subheadingPunch: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.4
  },
  subheadingNavy: {
    color: THEME.colors.navy
  },
  subheadingGray: {
    color: THEME.colors.slate400,
    fontWeight: '400'
  },
  subheadingCrimson: {
    color: THEME.colors.primary
  },
  heroDesc: {
    fontSize: 16,
    color: THEME.colors.slate600,
    lineHeight: 24,
    marginBottom: 20
  },
  ctaRow: {
    marginBottom: 20
  },
  heroLoginBtn: {
    width: '100%'
  },
  trustGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#FECDD3',
    marginBottom: 20
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minWidth: 130
  },
  trustText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.slate700
  },
  artworkContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 14,
    paddingVertical: 10
  },
  heroArtwork: {
    width: '100%',
    height: 180
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 10,
    ...THEME.shadows.sm
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.colors.success
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.slate700
  },
  statusPillSep: {
    color: THEME.colors.slate300
  },
  evalCard: {
    backgroundColor: '#FFFDF9',
    borderColor: '#FDE68A',
    marginBottom: 16
  },
  evalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4
  },
  evalTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.colors.navy,
    marginLeft: 6
  },
  evalSubtitle: {
    fontSize: 12,
    color: THEME.colors.slate500,
    marginBottom: 12
  },
  evalRow: {
    flexDirection: 'row',
    gap: 8
  },
  evalBtn: {
    flex: 1
  },
  signupAction: {
    marginBottom: 14
  },
  privacyLink: {
    alignItems: 'center',
    paddingVertical: 8
  },
  privacyText: {
    fontSize: 12,
    color: THEME.colors.slate500,
    textDecorationLine: 'underline'
  }
});
