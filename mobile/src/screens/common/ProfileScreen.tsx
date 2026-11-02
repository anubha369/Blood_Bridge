import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../../constants/theme';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { useAuth } from '../../context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const ProfileScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out of BloodBridge?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          navigation.replace('Welcome');
        }
      }
    ]);
  };

  const getInitials = (name?: string) => {
    if (!name) return 'BB';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <View style={styles.container}>
      <Header title="Account Profile" subtitle="Identity, Registry & Settings" />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* User Card */}
        <Card variant="elevated" style={styles.userCard}>
          <View style={styles.userRow}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{getInitials(user?.name)}</Text>
            </View>
            <View style={styles.userInfoCol}>
              <Text style={styles.name}>{user?.name || 'Healthcare User'}</Text>
              <Text style={styles.email}>{user?.email}</Text>
              <View style={styles.badgeRow}>
                <Badge
                  label={user?.role?.toUpperCase() || 'USER'}
                  variant={user?.role === 'donor' ? 'verified' : 'brand'}
                  size="sm"
                />
                {user?.blood_group && (
                  <Badge label={`Blood: ${user.blood_group}`} variant="neutral" size="sm" />
                )}
              </View>
            </View>
          </View>
        </Card>

        {/* Account Details Breakdown */}
        <Card variant="elevated" style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Registration Details</Text>

          <View style={styles.detailItem}>
            <Ionicons name="call-outline" size={17} color={THEME.colors.slate400} />
            <Text style={styles.detailLabel}>Mobile Phone:</Text>
            <Text style={styles.detailVal}>{user?.phone || 'Not configured'}</Text>
          </View>

          <View style={styles.detailItem}>
            <Ionicons name="location-outline" size={17} color={THEME.colors.slate400} />
            <Text style={styles.detailLabel}>City & Area:</Text>
            <Text style={styles.detailVal}>
              {user?.city ? `${user.city}${user.area ? `, ${user.area}` : ''}` : 'Jaipur, Rajasthan'}
            </Text>
          </View>

          <View style={styles.detailItem}>
            <Ionicons name="shield-checkmark-outline" size={17} color={THEME.colors.success} />
            <Text style={styles.detailLabel}>Registry Status:</Text>
            <Text style={[styles.detailVal, { color: THEME.colors.successText }]}>
              Officially Verified
            </Text>
          </View>
        </Card>

        {/* Quick Links Menu */}
        <Card variant="elevated" style={styles.menuCard}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('CreditWallet')}
          >
            <Ionicons name="trophy-outline" size={19} color="#D97706" />
            <Text style={styles.menuText}>Life Saver Credit Wallet & Rewards</Text>
            <Ionicons name="chevron-forward" size={18} color={THEME.colors.slate400} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('BloodBankDirectory')}
          >
            <Ionicons name="business-outline" size={19} color={THEME.colors.primary} />
            <Text style={styles.menuText}>Hospital Blood Banks Directory</Text>
            <Ionicons name="chevron-forward" size={18} color={THEME.colors.slate400} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('PrivacyPolicy')}
          >
            <Ionicons name="lock-closed-outline" size={19} color={THEME.colors.navy} />
            <Text style={styles.menuText}>Healthcare Data Privacy & Consent</Text>
            <Ionicons name="chevron-forward" size={18} color={THEME.colors.slate400} />
          </TouchableOpacity>
        </Card>

        {/* Role Switcher (Evaluation Helper) */}
        <Card variant="outlined" style={styles.roleCard}>
          <Text style={styles.sectionTitle}>Switch View (Portal Navigation)</Text>
          <Text style={styles.roleDesc}>
            Easily navigate between requester and donor interfaces for complete evaluation:
          </Text>
          <View style={styles.roleBtnRow}>
            <Button
              title="Donor Portal"
              variant="outline"
              size="sm"
              onPress={() => navigation.replace('DonorMain')}
              style={{ flex: 1, marginRight: 8 }}
            />
            <Button
              title="Requester Portal"
              variant="secondary"
              size="sm"
              onPress={() => navigation.replace('RequesterMain')}
              style={{ flex: 1 }}
            />
          </View>
        </Card>

        {/* Logout Button */}
        <Button
          title="Sign Out of BloodBridge"
          variant="outline"
          size="lg"
          icon={<Ionicons name="log-out-outline" size={18} color={THEME.colors.primary} />}
          onPress={handleLogout}
          style={styles.logoutBtn}
          textStyle={{ color: THEME.colors.primary }}
        />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.slate50
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12
  },
  userCard: {
    padding: 16,
    marginBottom: 14,
    borderRadius: 18
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: THEME.colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    ...THEME.shadows.sm
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF'
  },
  userInfoCol: {
    flex: 1
  },
  name: {
    fontSize: 18,
    fontWeight: '900',
    color: THEME.colors.navy
  },
  email: {
    fontSize: 13,
    color: THEME.colors.slate500,
    marginTop: 2,
    marginBottom: 6
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6
  },
  detailsCard: {
    padding: 16,
    marginBottom: 14,
    borderRadius: 18
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: THEME.colors.navy,
    marginBottom: 10,
    letterSpacing: -0.2
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.slate100
  },
  detailLabel: {
    fontSize: 13,
    color: THEME.colors.slate500,
    marginLeft: 8,
    width: 110,
    fontWeight: '500'
  },
  detailVal: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.navy,
    flex: 1
  },
  menuCard: {
    paddingVertical: 4,
    marginBottom: 14,
    borderRadius: 18
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.slate100
  },
  menuText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.navy,
    marginLeft: 12
  },
  roleCard: {
    padding: 16,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 18
  },
  roleDesc: {
    fontSize: 12,
    color: THEME.colors.slate600,
    lineHeight: 16,
    marginBottom: 12
  },
  roleBtnRow: {
    flexDirection: 'row'
  },
  logoutBtn: {
    marginBottom: 24,
    borderColor: '#FECDD3',
    backgroundColor: '#FFF1F2'
  }
});
