import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Linking,
  TouchableOpacity,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../../constants/theme';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { LoadingScreen } from '../../components/LoadingScreen';
import { api } from '../../services/api';
import { BloodRequest } from '../../constants/types';

export const SelectDonorScreen: React.FC<{ navigation: any; route: any }> = ({
  navigation,
  route
}) => {
  const { requestId, donorId, donorName } = route.params;

  const [request, setRequest] = useState<BloodRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedDonor, setSelectedDonor] = useState<{
    id: string;
    name: string;
    phone?: string;
  } | null>(null);

  const fetchRequest = async () => {
    try {
      const res = await api.requests.getById(requestId);
      if (res.success && res.request) {
        setRequest(res.request);
        if (res.request.selected_donor_id) {
          setSelectedDonor({
            id: res.request.selected_donor_id,
            name: res.request.selected_donor_name || donorName || 'Selected Donor',
            phone: res.request.selected_donor_phone
          });
        }
      }
    } catch (err: any) {
      console.warn('Error fetching request:', err.message);
    }
  };

  useEffect(() => {
    fetchRequest();
  }, [requestId]);

  const handleConfirmSelection = async () => {
    try {
      setLoading(true);
      const res = await api.requests.selectDonor(requestId, donorId, true);
      if (res.success) {
        Alert.alert(
          'Donor Selected & Confirmed',
          'The donor has been locked for this request and contact details are unmasked below. Please coordinate directly with the donor for hospital arrival.'
        );
        fetchRequest();
      } else {
        Alert.alert('Selection Notice', res.error || 'Failed to select donor.');
      }
    } catch (err: any) {
      Alert.alert('Selection Error', err.message || 'Error communicating with server.');
    } finally {
      setLoading(false);
    }
  };

  const handleCall = () => {
    if (selectedDonor?.phone) {
      Linking.openURL(`tel:${selectedDonor.phone}`);
    }
  };

  const handleReselect = () => {
    Alert.alert(
      'Reselect Different Donor',
      'Are you sure you want to release this donor and choose another accepted donor?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Release',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const res = await api.requests.reselectDonor(requestId);
              if (res.success) {
                Alert.alert('Donor Released', 'You may now select another donor.');
                navigation.goBack();
              }
            } catch (err: any) {
              Alert.alert('Error', err.message);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Header
        title="Select & Confirm Donor"
        subtitle="Stage 4: Donor Coordination"
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card variant="elevated" style={styles.mainCard}>
          <View style={styles.topHeader}>
            <View style={styles.avatarCircle}>
              <Ionicons name="person" size={28} color="#FFFFFF" />
            </View>
            <View style={styles.topInfo}>
              <Text style={styles.name}>{donorName || selectedDonor?.name || 'Volunteer Donor'}</Text>
              <Text style={styles.subText}>Accepted Emergency Contact Request</Text>
            </View>
            <Badge label="ACCEPTED" variant="success" size="sm" />
          </View>

          {/* Privacy & Unmasking Banner */}
          <View style={styles.infoBanner}>
            <Ionicons name="information-circle" size={18} color={THEME.colors.primary} />
            <Text style={styles.infoBannerText}>
              By selecting this donor, BloodBridge unmasks the verified telephone contact to enable
              immediate bedside and blood bank coordination.
            </Text>
          </View>

          {selectedDonor?.phone ? (
            <View style={styles.phoneSection}>
              <Text style={styles.phoneLabel}>Verified Direct Contact Phone:</Text>
              <View style={styles.phoneRow}>
                <Ionicons name="call" size={20} color={THEME.colors.primary} />
                <Text style={styles.phoneNumber}>{selectedDonor.phone}</Text>
              </View>
              <Button
                title="Call Donor Directly"
                variant="primary"
                icon={<Ionicons name="call" size={18} color="#FFFFFF" />}
                onPress={handleCall}
                style={{ marginTop: 10 }}
              />
            </View>
          ) : (
            <Button
              title="Lock Selection & Reveal Contact"
              variant="primary"
              size="lg"
              loading={loading}
              icon={<Ionicons name="lock-open" size={18} color="#FFFFFF" />}
              onPress={handleConfirmSelection}
              style={{ marginTop: 12 }}
            />
          )}
        </Card>

        {/* Next Step Action: Confirm Fulfillment */}
        {selectedDonor && (
          <Card variant="outlined" style={styles.fulfillPromptCard}>
            <Text style={styles.promptTitle}>Blood Transfusion Arrived?</Text>
            <Text style={styles.promptDesc}>
              Once the donor completes donation at the hospital and units are received, confirm
              fulfillment to reward the donor with credits and trigger the clinical cooldown.
            </Text>
            <Button
              title="Confirm Blood Received (Fulfill)"
              variant="crimson"
              size="lg"
              icon={<Ionicons name="shield-checkmark" size={18} color="#FFFFFF" />}
              onPress={() =>
                navigation.navigate('ConfirmFulfillment', {
                  requestId,
                  donorName: selectedDonor.name
                })
              }
              style={{ marginTop: 10 }}
            />
          </Card>
        )}

        {selectedDonor && (
          <TouchableOpacity onPress={handleReselect} style={styles.reselectBtn}>
            <Text style={styles.reselectText}>Reselect Another Donor</Text>
          </TouchableOpacity>
        )}
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
  mainCard: {
    padding: 16,
    marginBottom: 16
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  avatarCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  topInfo: {
    flex: 1
  },
  name: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.navy
  },
  subText: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 2
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: THEME.colors.crimsonLight,
    borderWidth: 1,
    borderColor: THEME.colors.crimsonBorder,
    borderRadius: THEME.borderRadius.md,
    padding: 10,
    marginVertical: 10
  },
  infoBannerText: {
    fontSize: 12,
    color: THEME.colors.primary,
    marginLeft: 8,
    flex: 1,
    lineHeight: 16
  },
  phoneSection: {
    marginTop: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: THEME.borderRadius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight
  },
  phoneLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.navy,
    marginBottom: 6
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4
  },
  phoneNumber: {
    fontSize: 18,
    fontWeight: '900',
    color: THEME.colors.primary
  },
  fulfillPromptCard: {
    backgroundColor: '#FFFDF9',
    borderColor: '#FDE68A',
    marginBottom: 16
  },
  promptTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.navy,
    marginBottom: 4
  },
  promptDesc: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    lineHeight: 17
  },
  reselectBtn: {
    alignItems: 'center',
    paddingVertical: 12
  },
  reselectText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.urgent
  }
});

