import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../../constants/theme';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { LoadingScreen } from '../../components/LoadingScreen';
import { api } from '../../services/api';
import { ContactRequest } from '../../constants/types';

export const DonorResponsesScreen: React.FC<{ navigation: any; route: any }> = ({
  navigation,
  route
}) => {
  const { requestId } = route.params;

  const [responses, setResponses] = useState<ContactRequest[]>(route.params?.contactRequests || []);
  const [loading, setLoading] = useState(!route.params?.contactRequests);
  const [refreshing, setRefreshing] = useState(false);

  const fetchResponses = useCallback(async () => {
    try {
      const res = await api.requests.getContactRequests(requestId);
      if (res.success && Array.isArray(res.contact_requests)) {
        setResponses(res.contact_requests);
      }
    } catch (err: any) {
      console.warn('Error fetching responses:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [requestId]);

  useEffect(() => {
    fetchResponses();
  }, [fetchResponses]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchResponses();
  };

  if (loading && !refreshing) {
    return <LoadingScreen message="Fetching incoming donor responses..." />;
  }

  const renderItem = ({ item }: { item: ContactRequest }) => {
    const isAccepted = item.status === 'accepted';
    const isDeclined = item.status === 'declined';

    return (
      <Card variant={isAccepted ? 'elevated' : 'outlined'} style={styles.card}>
        <View style={styles.topRow}>
          <View
            style={[
              styles.avatarCircle,
              isAccepted && { backgroundColor: THEME.colors.successBg }
            ]}
          >
            <Ionicons
              name={isAccepted ? 'person-circle' : 'person-outline'}
              size={28}
              color={isAccepted ? THEME.colors.success : THEME.colors.navy}
            />
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.donorName}>{item.donor_name || 'Volunteer Donor'}</Text>
            <View style={styles.metaRow}>
              <Ionicons name="chatbubble-ellipses-outline" size={12} color={THEME.colors.textMuted} />
              <Text style={styles.metaText}>Via {item.channel.toUpperCase()}</Text>
              <Text style={styles.dot}>•</Text>
              <Text style={styles.metaText}>
                {item.responded_at
                  ? new Date(item.responded_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })
                  : 'Pending reply'}
              </Text>
            </View>
          </View>
          <Badge
            label={item.status.toUpperCase()}
            variant={isAccepted ? 'success' : isDeclined ? 'critical' : 'warning'}
            size="sm"
          />
        </View>

        {/* Security Masking Notice */}
        <View style={styles.securityBox}>
          <Ionicons name="shield-outline" size={14} color={THEME.colors.textMuted} />
          <Text style={styles.securityText}>
            {isAccepted
              ? 'Donor accepted contact! Select this donor to reveal full phone number and coordinate hospital arrival.'
              : 'Contact details remain securely masked until donor accepts request.'}
          </Text>
        </View>

        {isAccepted && (
          <Button
            title="Select This Donor for Coordination"
            variant="primary"
            icon={<Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />}
            onPress={() =>
              navigation.navigate('SelectDonor', {
                requestId,
                donorId: item.donor_id,
                donorName: item.donor_name
              })
            }
            style={{ marginTop: 10 }}
          />
        )}
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <Header
        title="Donor Responses"
        subtitle="Stage 3: Responses Tracked"
        showBack
        onBack={() => navigation.goBack()}
      />

      <FlatList
        data={responses}
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
            icon="time-outline"
            title="Waiting for Donor Responses"
            description="Emergency alert notifications have been broadcast. When donors accept via Telegram, WhatsApp, or App, they will appear here immediately."
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
  listContent: {
    padding: THEME.spacing.base
  },
  card: {
    padding: 14,
    marginBottom: 12
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10
  },
  infoCol: {
    flex: 1
  },
  donorName: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.navy
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2
  },
  metaText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginLeft: 4
  },
  dot: {
    marginHorizontal: 6,
    color: THEME.colors.textLight
  },
  securityBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: THEME.borderRadius.sm,
    padding: 8,
    marginTop: 4
  },
  securityText: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginLeft: 6,
    flex: 1,
    lineHeight: 15
  }
});

