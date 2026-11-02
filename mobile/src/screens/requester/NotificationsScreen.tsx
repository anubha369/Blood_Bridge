import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../../constants/theme';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { EmptyState } from '../../components/EmptyState';

interface NotificationItem {
  id: string;
  type: 'emergency' | 'response' | 'reward' | 'system';
  title: string;
  message: string;
  time: string;
  read: boolean;
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    type: 'response',
    title: 'Volunteer Donor Accepted!',
    message: 'Donor Sarah Jenkins accepted your emergency contact request for B+ blood.',
    time: '5 mins ago',
    read: false
  },
  {
    id: 'notif-2',
    type: 'emergency',
    title: 'Emergency Geo-Alert Dispatched',
    message: 'Dispatched emergency alerts to 12 compatible donors within 30km radius of Jaipur.',
    time: '25 mins ago',
    read: false
  },
  {
    id: 'notif-3',
    type: 'reward',
    title: 'Registration Credits Credited',
    message: '+50 Life Saver credit points deposited into your BloodBridge wallet.',
    time: '2 hours ago',
    read: true
  },
  {
    id: 'notif-4',
    type: 'system',
    title: 'Telegram Alert Bot Active',
    message: 'BloodBridge Emergency Bot is active and synchronized for instant callback notifications.',
    time: '1 day ago',
    read: true
  }
];

export const NotificationsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 600);
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const renderItem = ({ item }: { item: NotificationItem }) => {
    const getIcon = () => {
      switch (item.type) {
        case 'emergency':
          return { name: 'megaphone' as const, color: THEME.colors.urgent, bg: THEME.colors.urgentBg };
        case 'response':
          return { name: 'checkmark-circle' as const, color: THEME.colors.success, bg: THEME.colors.successBg };
        case 'reward':
          return { name: 'gift' as const, color: THEME.colors.gold, bg: THEME.colors.goldBg };
        default:
          return { name: 'notifications' as const, color: THEME.colors.primary, bg: THEME.colors.crimsonLight };
      }
    };

    const icon = getIcon();

    return (
      <Card variant="elevated" style={[styles.card, !item.read && styles.unreadCard]}>
        <View style={styles.cardRow}>
          <View style={[styles.iconCircle, { backgroundColor: icon.bg }]}>
            <Ionicons name={icon.name} size={22} color={icon.color} />
          </View>
          <View style={styles.textCol}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>{item.title}</Text>
              {!item.read && <View style={styles.unreadDot} />}
            </View>
            <Text style={styles.message}>{item.message}</Text>
            <Text style={styles.time}>{item.time}</Text>
          </View>
        </View>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <Header
        title="Notifications"
        subtitle="Live Dispatch & Response Feeds"
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity onPress={markAllAsRead} style={styles.markReadBtn}>
            <Text style={styles.markReadText}>Mark read</Text>
          </TouchableOpacity>
        }
      />

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={THEME.colors.primary}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="notifications-off-outline"
            title="No Notifications"
            description="You are caught up! Emergency alert broadcasts and donor responses will show here."
          />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background
  },
  markReadBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  markReadText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.primary
  },
  listContent: {
    padding: THEME.spacing.base
  },
  card: {
    padding: 14,
    marginBottom: 10
  },
  unreadCard: {
    backgroundColor: '#FFFDFD',
    borderColor: THEME.colors.crimsonBorder
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start'
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  textCol: {
    flex: 1
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.navy,
    flex: 1
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: THEME.colors.primary,
    marginLeft: 6
  },
  message: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    lineHeight: 17,
    marginBottom: 6
  },
  time: {
    fontSize: 11,
    color: THEME.colors.textLight
  }
});

