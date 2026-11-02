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

export const ContactRequestsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [requests, setRequests] = useState<ContactRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    try {
      const res = await api.donors.getContactRequests();
      if (res.success && Array.isArray(res.contact_requests)) {
        setRequests(res.contact_requests);
      }
    } catch (err: any) {
      console.warn('Error fetching contact requests:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRequests();
  };

  const handleRespond = async (
    requestId: string,
    action: 'accept' | 'declined' | 'snoozed'
  ) => {
    try {
      setActingId(requestId);
      const res = await api.donors.respondToContactRequest(requestId, action);
      if (res.success) {
        Alert.alert(
          action === 'accept' ? 'Emergency Request Accepted! 🩸' : 'Response Recorded',
          action === 'accept'
            ? 'Thank you! The hospital requester has been alerted and will coordinate directly with you for arrival.'
            : 'Your response has been registered and this alert has been cleared.'
        );
        fetchRequests();
      } else {
        Alert.alert('Notice', res.error || 'Failed to submit response.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setActingId(null);
    }
  };

  if (loading && !refreshing) {
    return <LoadingScreen message="Checking emergency contact requests..." />;
  }

  const renderItem = ({ item }: { item: ContactRequest }) => {
    const isPending = item.status === 'sent';
    const isAccepted = item.status === 'accepted';
    const isDeclined = item.status === 'declined';

    return (
      <Card variant={isPending ? 'urgent' : 'elevated'} style={styles.card}>
        <View style={styles.topRow}>
          <View style={styles.bloodCircle}>
            <Text style={styles.bloodText}>{item.blood_group || 'O+'}</Text>
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.hospitalName}>{item.hospital_name || 'Emergency Hospital'}</Text>
            <Text style={styles.patientName}>
              Patient: {item.patient_name || 'Emergency Patient'}
            </Text>
            <Text style={styles.channelText}>Via {item.channel?.toUpperCase() || 'SYSTEM'}</Text>
          </View>
          <Badge
            label={item.status.toUpperCase()}
            variant={isPending ? 'urgent' : isAccepted ? 'success' : 'neutral'}
            size="sm"
          />
        </View>

        {isPending ? (
          <View style={styles.actionsContainer}>
            <Text style={styles.promptText}>
              Can you donate blood at this hospital within the requested timeframe?
            </Text>
            <View style={styles.btnRow}>
              <Button
                title="Decline"
                variant="outline"
                size="sm"
                loading={actingId === item.request_id}
                onPress={() => handleRespond(item.request_id, 'declined')}
                style={{ flex: 1, marginRight: 8 }}
              />
              <Button
                title="Accept to Help"
                variant="primary"
                size="sm"
                icon={<Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />}
                loading={actingId === item.request_id}
                onPress={() => handleRespond(item.request_id, 'accept')}
                style={{ flex: 1.5 }}
              />
            </View>
          </View>
        ) : (
          <View style={styles.completedRow}>
            <Ionicons
              name={isAccepted ? 'checkmark-circle' : 'close-circle'}
              size={18}
              color={isAccepted ? THEME.colors.success : THEME.colors.urgent}
            />
            <Text
              style={[
                styles.completedText,
                { color: isAccepted ? THEME.colors.success : THEME.colors.textMuted }
              ]}
            >
              {isAccepted ? 'You accepted this emergency request' : 'You declined this request'}
            </Text>
          </View>
        )}
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <Header
        title="Incoming Contact Requests"
        subtitle="Direct Emergency Hospital Calls"
        showBack
        onBack={() => navigation.goBack()}
      />

      <FlatList
        data={requests}
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
            icon="heart-outline"
            title="No Pending Emergency Requests"
            description="You have no active contact requests from hospitals right now. When an emergency matching your blood group is registered nearby, you will be notified here."
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
  bloodCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  bloodText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF'
  },
  infoCol: {
    flex: 1
  },
  hospitalName: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.navy
  },
  patientName: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 2
  },
  channelText: {
    fontSize: 11,
    color: THEME.colors.textLight,
    marginTop: 2
  },
  actionsContainer: {
    borderTopWidth: 1,
    borderTopColor: THEME.colors.borderLight,
    paddingTop: 10,
    marginTop: 4
  },
  promptText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.navy,
    marginBottom: 10
  },
  btnRow: {
    flexDirection: 'row'
  },
  completedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: THEME.colors.borderLight,
    paddingTop: 8,
    marginTop: 4,
    gap: 6
  },
  completedText: {
    fontSize: 12,
    fontWeight: '600'
  }
});

