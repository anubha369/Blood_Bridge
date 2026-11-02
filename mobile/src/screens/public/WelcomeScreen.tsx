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
      Alert.alert('Demo Login Error', err.message || 'Unable to log in with demo account.');
    } finally {
      setDemoLoading(null);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Brand Hero */}
      <View style={styles.heroSection}>
        <View style={styles.emblemBadge}>
          <Image
            source={require('../../assets/bloodbridge-hero-emblem-transparent.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.title}>BloodBridge Vision-X</Text>
        <Text style={styles.subtitle}>
          Geo-Spatial Emergency Blood Network & Groq AI Response Platform
        </Text>
      </View>

      <MedicalDisclaimerBanner />

      {/* Dual Path Directives */}
      <View style={styles.actionCards}>
        <TouchableOpacity
          activeOpacity={0.9}
          style={[styles.roleCard, styles.requesterCard]}
          onPress={() => navigation.navigate('Register', { defaultRole: 'requester' })}
        >
          <View style={styles.roleIconCircle}>
            <Ionicons name="pulse" size={24} color={THEME.colors.urgent} />
          </View>
          <View style={styles.roleCardText}>
            <Text style={styles.roleCardTitle}>I Need Blood (Urgent)</Text>
            <Text style={styles.roleCardDesc}>
              Broadcast immediate emergency alerts to compatible donors nearby
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={THEME.colors.primary} />
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.9}
          style={[styles.roleCard, styles.donorCard]}
          onPress={() => navigation.navigate('Register', { defaultRole: 'donor' })}
        >
          <View style={[styles.roleIconCircle, { backgroundColor: THEME.colors.successBg }]}>
            <Ionicons name="heart" size={24} color={THEME.colors.success} />
          </View>
          <View style={styles.roleCardText}>
            <Text style={styles.roleCardTitle}>I Want to Save Lives</Text>
            <Text style={styles.roleCardDesc}>
              Register as verified volunteer donor, receive urgent alerts & earn credits
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={THEME.colors.navy} />
        </TouchableOpacity>
      </View>

      {/* Quick 1-Click Evaluation Accounts */}
      <Card variant="outlined" style={styles.demoCard}>
        <View style={styles.demoHeader}>
          <Ionicons name="flash" size={16} color={THEME.colors.gold} />
          <Text style={styles.demoTitle}>1-Click Evaluation Accounts</Text>
        </View>
        <Text style={styles.demoSubtitle}>
          Instantly evaluate BloodBridge without entering manual credentials:
        </Text>

        <View style={styles.demoPills}>
          <Button
            title="Donor (Sarah)"
            size="sm"
            variant="outline"
            loading={demoLoading === 'donor'}
            onPress={() => handleDemoLogin('donor')}
            style={styles.demoBtn}
          />
          <Button
            title="Hospital (Dr. Mehta)"
            size="sm"
            variant="secondary"
            loading={demoLoading === 'requester'}
            onPress={() => handleDemoLogin('requester')}
            style={styles.demoBtn}
          />
          <Button
            title="Admin (System)"
            size="sm"
            variant="ghost"
            loading={demoLoading === 'admin'}
            onPress={() => handleDemoLogin('admin')}
            style={styles.demoBtn}
          />
        </View>
      </Card>

      {/* Auth Entry Actions */}
      <View style={styles.authButtons}>
        <Button
          title="Sign In to Existing Account"
          variant="primary"
          size="lg"
          onPress={() => navigation.navigate('Login')}
          style={{ marginBottom: 12 }}
        />
        <Button
          title="Create New Account"
          variant="outline"
          size="lg"
          onPress={() => navigation.navigate('Register')}
        />
      </View>

      {/* Privacy Policy Link */}
      <TouchableOpacity
        onPress={() => navigation.navigate('PrivacyPolicy')}
        style={styles.privacyLink}
      >
        <Text style={styles.privacyText}>Healthcare Data Privacy Policy & Consent Terms</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background
  },
  content: {
    paddingHorizontal: THEME.spacing.base
  },
  heroSection: {
    alignItems: 'center',
    marginVertical: 18
  },
  emblemBadge: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: THEME.colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: THEME.colors.crimsonBorder,
    ...THEME.shadows.sm
  },
  logo: {
    width: 60,
    height: 60
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: THEME.colors.navy,
    letterSpacing: 0.3
  },
  subtitle: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    paddingHorizontal: 16
  },
  actionCards: {
    marginVertical: 12,
    gap: 12
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.borderRadius.lg,
    padding: 16,
    borderWidth: 1.5,
    borderColor: THEME.colors.borderLight,
    ...THEME.shadows.sm
  },
  requesterCard: {
    borderColor: '#FECACA',
    backgroundColor: '#FFFBFB'
  },
  donorCard: {
    borderColor: '#E2E8F0'
  },
  roleIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: THEME.colors.urgentBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14
  },
  roleCardText: {
    flex: 1
  },
  roleCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.navy
  },
  roleCardDesc: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 3,
    lineHeight: 16
  },
  demoCard: {
    marginTop: 8,
    backgroundColor: '#FFFDF9',
    borderColor: '#FDE68A'
  },
  demoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4
  },
  demoTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.colors.navy,
    marginLeft: 6
  },
  demoSubtitle: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginBottom: 12
  },
  demoPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  demoBtn: {
    flex: 1,
    minWidth: 100
  },
  authButtons: {
    marginTop: 18,
    marginBottom: 16
  },
  privacyLink: {
    alignItems: 'center',
    paddingVertical: 12
  },
  privacyText: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    textDecorationLine: 'underline'
  }
});

