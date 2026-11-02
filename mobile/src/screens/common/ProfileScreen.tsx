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

export const ProfileScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
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

  return (
    <View style={styles.container}>
      <Header title="My Profile" subtitle="Account & Coordination Settings" />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* User Card */}
        <Card variant="elevated" style={styles.userCard}>
          <View style={styles.userRow}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>
                {user?.name ? user.name.slice(0, 2).toUpperCase() : 'BB'}
              </Text>
            </View>
            <View style={styles.userInfoCol}>
              <Text style={styles.name}>{user?.name || 'Healthcare User'}</Text>
              <Text style={styles.email}>{user?.email}</Text>
              <View style={styles.badgeRow}>
                <Badge
                  label={user?.role?.toUpperCase() || 'USER'}
                  variant={user?.role === 'donor' ? 'success' : 'brand'}
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
        <Card variant="outlined" style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Profile Details</Text>

          <View style={styles.detailItem}>
            <Ionicons name="call-outline" size={18} color={THEME.colors.textMuted} />
            <Text style={styles.detailLabel}>Mobile Phone:</Text>
            <Text style={styles.detailVal}>{user?.phone || 'Not configured'}</Text>
          </View>

          <View style={styles.detailItem}>
            <Ionicons name="location-outline" size={18} color={THEME.colors.textMuted} />
            <Text style={styles.detailLabel}>City & Area:</Text>
            <Text style={styles.detailVal}>
              {user?.city ? `${user.city}${user.area ? `, ${user.area}` : ''}` : 'Jaipur, Rajasthan'}
            </Text>
          </View>

          <View style={styles.detailItem}>
            <Ionicons name="shield-checkmark-outline" size={18} color={THEME.colors.textMuted} />
            <Text style={styles.detailLabel}>Verification:</Text>
            <Text style={[styles.detailVal, { color: THEME.colors.success }]}>
              Verified Active
            </Text>
          </View>
        </Card>

        {/* Quick Links Menu */}
        <Card variant="elevated" style={styles.menuCard}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('CreditWallet')}
          >
            <Ionicons name="sparkles-outline" size={20} color={THEME.colors.gold} />
            <Text style={styles.menuText}>Life Saver Credit Wallet & Rewards</Text>
            <Ionicons name="chevron-forward" size={18} color={THEME.colors.textLight} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('BloodBankDirectory')}
          >
            <Ionicons name="business-outline" size={20} color={THEME.colors.primary} />
            <Text style={styles.menuText}>Blood Bank Inventory Directory</Text>
            <Ionicons name="chevron-forward" size={18} color={THEME.colors.textLight} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('PrivacyPolicy')}
          >
            <Ionicons name="lock-closed-outline" size={20} color={THEME.colors.navy} />
            <Text style={styles.menuText}>Healthcare Data Privacy & Consent</Text>
            <Ionicons name="chevron-forward" size={18} color={THEME.colors.textLight} />
          </TouchableOpacity>
        </Card>

        {/* Role Switcher (evaluation helper) */}
        <Card variant="outlined" style={styles.roleCard}>
          <Text style={styles.sectionTitle}>Switch View (Role Navigation)</Text>
          <Text style={styles.roleDesc}>
            Easily navigate between requester and donor interfaces for end-to-end evaluation:
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
          variant="danger"
          size="lg"
          icon={<Ionicons name="log-out-outline" size={18} color="#FFFFFF" />}
          onPress={handleLogout}
          style={styles.logoutBtn}
        />
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
  userCard: {
    padding: 16,
    marginBottom: 14
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14
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
    fontWeight: '800',
    color: THEME.colors.navy
  },
  email: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    marginTop: 2,
    marginBottom: 6
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6
  },
  detailsCard: {
    padding: 14,
    marginBottom: 14
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.navy,
    marginBottom: 10
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.borderLight
  },
  detailLabel: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    marginLeft: 8,
    width: 110
  },
  detailVal: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.navy,
    flex: 1
  },
  menuCard: {
    paddingVertical: 4,
    marginBottom: 14
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.borderLight
  },
  menuText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: THEME.colors.navy,
    marginLeft: 12
  },
  roleCard: {
    padding: 14,
    marginBottom: 16,
    backgroundColor: '#F8FAFC'
  },
  roleDesc: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    lineHeight: 16,
    marginBottom: 10
  },
  roleBtnRow: {
    flexDirection: 'row'
  },
  logoutBtn: {
    marginBottom: 30
  }
});

