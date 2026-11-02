import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../../constants/theme';
import { Header } from '../../components/Header';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { BloodGroupSelector } from '../../components/BloodGroupSelector';
import { MedicalDisclaimerBanner } from '../../components/MedicalDisclaimerBanner';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { BloodGroup, UrgencyLevel } from '../../constants/types';
import { CONFIG } from '../../constants/config';

export const CreateRequestScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useAuth();

  const [bloodGroup, setBloodGroup] = useState<BloodGroup | null>('B+');
  const [unitsNeeded, setUnitsNeeded] = useState('2');
  const [hospitalName, setHospitalName] = useState('');
  const [hospitalAddress, setHospitalAddress] = useState('');
  const [patientName, setPatientName] = useState('');
  const [urgencyLevel, setUrgencyLevel] = useState<UrgencyLevel>('urgent');
  const [contactNumber, setContactNumber] = useState(user?.phone || '');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Groq AI natural language parser modal state
  const [aiModalVisible, setAiModalVisible] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const handleAiParse = async () => {
    if (!aiPrompt.trim()) {
      Alert.alert('Empty Input', 'Please describe your blood requirement.');
      return;
    }

    try {
      setAiLoading(true);
      const res = await api.ai.parseRequest(aiPrompt.trim());
      if (res.success && res.data) {
        const d = res.data;
        if (d.blood_group) setBloodGroup(d.blood_group as BloodGroup);
        if (d.units_needed) setUnitsNeeded(String(d.units_needed));
        if (d.hospital_name) setHospitalName(d.hospital_name);
        if (d.patient_name) setPatientName(d.patient_name);
        if (d.contact_number) setContactNumber(d.contact_number);
        if (d.urgency_level) setUrgencyLevel(d.urgency_level as UrgencyLevel);
        if (d.notes) setNotes(d.notes);

        setAiModalVisible(false);
        setAiPrompt('');
        Alert.alert('AI Auto-Fill Complete', 'Request parameters successfully parsed by Groq AI. Please review the details below.');
      } else {
        Alert.alert('Extraction Note', res.message || 'Unable to extract all parameters. Please enter details manually.');
      }
    } catch (err: any) {
      Alert.alert('AI Parsing Failed', err.message || 'Failed to parse natural language request.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!bloodGroup) {
      setError('Please select the required blood group.');
      return;
    }
    const units = parseInt(unitsNeeded, 10);
    if (isNaN(units) || units < 1 || units > 20) {
      setError('Units needed must be between 1 and 20.');
      return;
    }
    if (!hospitalName.trim()) {
      setError('Please enter the hospital or medical facility name.');
      return;
    }
    if (!contactNumber.trim()) {
      setError('Please provide an emergency contact phone number.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const payload = {
        blood_group: bloodGroup,
        units_needed: units,
        hospital_name: hospitalName.trim(),
        hospital_address: hospitalAddress.trim() || undefined,
        patient_name: patientName.trim() || 'Emergency Patient',
        urgency_level: urgencyLevel,
        contact_number: contactNumber.trim(),
        notes: notes.trim() || undefined
      };

      const res = await api.requests.create(payload);
      if (res.success && res.request) {
        Alert.alert(
          'Blood Request Created',
          'Your emergency blood request is registered. You can now alert donors nearby.',
          [
            {
              text: 'Track Request',
              onPress: () => navigation.replace('RequestTracking', { requestId: res.request.id })
            }
          ]
        );
      } else {
        setError(res.error || 'Failed to create blood request.');
      }
    } catch (err: any) {
      setError(err.message || 'Request creation failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Header
        title="Create Blood Request"
        subtitle="Initiate Emergency Geo-Dispatch"
        showBack
        onBack={() => navigation.goBack()}
        isEmergency
      />

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Groq AI Natural Language Assistant Banner */}
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.aiBanner}
          onPress={() => setAiModalVisible(true)}
        >
          <View style={styles.aiIconBadge}>
            <Ionicons name="sparkles" size={18} color="#FFFFFF" />
          </View>
          <View style={styles.aiTextCol}>
            <Text style={styles.aiTitle}>Groq AI Natural Language Auto-Fill</Text>
            <Text style={styles.aiSubtitle}>
              Paste emergency doctor notes or WhatsApp message to auto-populate form
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={THEME.colors.crimson} />
        </TouchableOpacity>

        <MedicalDisclaimerBanner />

        {error && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={18} color={THEME.colors.urgent} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Blood Group Selector */}
        <BloodGroupSelector
          label="Required Blood Group *"
          selectedGroup={bloodGroup}
          onSelect={setBloodGroup}
        />

        {/* Units & Urgency */}
        <View style={styles.row}>
          <Input
            label="Units Needed (Bags) *"
            placeholder="e.g. 2"
            keyboardType="number-pad"
            value={unitsNeeded}
            onChangeText={setUnitsNeeded}
            containerStyle={{ flex: 1, marginRight: 10 }}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.inputLabel}>Urgency Priority *</Text>
            <View style={styles.urgencyTabs}>
              {CONFIG.URGENCY_LEVELS.map((u) => {
                const isSelected = urgencyLevel === u.id;
                return (
                  <TouchableOpacity
                    key={u.id}
                    onPress={() => setUrgencyLevel(u.id as UrgencyLevel)}
                    style={[
                      styles.urgencyTab,
                      isSelected && { backgroundColor: u.color, borderColor: u.color }
                    ]}
                  >
                    <Text
                      style={[
                        styles.urgencyTabText,
                        isSelected && { color: '#FFFFFF', fontWeight: '800' }
                      ]}
                      numberOfLines={1}
                    >
                      {u.id.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* Hospital & Location Details */}
        <Input
          label="Hospital / Medical Facility Name *"
          placeholder="e.g. SMS Hospital, Jaipur"
          icon="business-outline"
          value={hospitalName}
          onChangeText={setHospitalName}
        />

        <Input
          label="Hospital Address / Department"
          placeholder="e.g. ICU Block 3, Tonk Road"
          icon="location-outline"
          value={hospitalAddress}
          onChangeText={setHospitalAddress}
        />

        {/* Patient & Emergency Contact */}
        <View style={styles.row}>
          <Input
            label="Patient Name"
            placeholder="e.g. Anita Sharma"
            icon="person-outline"
            value={patientName}
            onChangeText={setPatientName}
            containerStyle={{ flex: 1, marginRight: 10 }}
          />
          <Input
            label="Emergency Contact Phone *"
            placeholder="e.g. 9876543210"
            icon="call-outline"
            keyboardType="phone-pad"
            value={contactNumber}
            onChangeText={setContactNumber}
            containerStyle={{ flex: 1 }}
          />
        </View>

        <Input
          label="Clinical Notes / Special Requirements"
          placeholder="e.g. Fresh frozen plasma needed, surgery scheduled at 2 PM"
          multiline
          numberOfLines={3}
          value={notes}
          onChangeText={setNotes}
          style={{ height: 70, textAlignVertical: 'top' }}
        />

        <Button
          title="Publish Blood Request"
          variant="primary"
          size="lg"
          icon={<Ionicons name="send" size={18} color="#FFFFFF" />}
          loading={loading}
          onPress={handleSubmit}
          style={{ marginTop: 12, marginBottom: 30 }}
        />
      </ScrollView>

      {/* Groq AI Modal */}
      <Modal visible={aiModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="sparkles" size={20} color={THEME.colors.primary} />
                <Text style={styles.modalTitle}>Groq AI Natural Language Parser</Text>
              </View>
              <TouchableOpacity onPress={() => setAiModalVisible(false)}>
                <Ionicons name="close" size={24} color={THEME.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDesc}>
              Paste freeform hospital texts, doctor notes, or emergency WhatsApp messages. Groq AI
              extracts the blood group, units, hospital, urgency, and contact:
            </Text>

            <Input
              placeholder="e.g. Need 2 units of B+ blood for patient Rajiv at Fortis Hospital Jaipur urgently for surgery. Contact 9876543210."
              multiline
              numberOfLines={4}
              value={aiPrompt}
              onChangeText={setAiPrompt}
              style={{ height: 100, textAlignVertical: 'top' }}
            />

            <View style={styles.modalBtns}>
              <Button
                title="Cancel"
                variant="ghost"
                onPress={() => setAiModalVisible(false)}
                style={{ flex: 1, marginRight: 8 }}
              />
              <Button
                title="Extract & Fill Form"
                variant="primary"
                loading={aiLoading}
                onPress={handleAiParse}
                style={{ flex: 2 }}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: THEME.colors.background
  },
  scrollContent: {
    padding: THEME.spacing.base
  },
  aiBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF0F2',
    borderWidth: 1.5,
    borderColor: THEME.colors.crimsonBorder,
    borderRadius: THEME.borderRadius.lg,
    padding: 12,
    marginBottom: 14,
    ...THEME.shadows.sm
  },
  aiIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: THEME.colors.crimson,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10
  },
  aiTextCol: {
    flex: 1
  },
  aiTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.colors.primary
  },
  aiSubtitle: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 2
  },
  row: {
    flexDirection: 'row'
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.navy,
    marginBottom: 6
  },
  urgencyTabs: {
    flexDirection: 'row',
    height: 48,
    gap: 4
  },
  urgencyTab: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: THEME.colors.border,
    borderRadius: THEME.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.card
  },
  urgencyTabText: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.textMuted
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.urgentBg,
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: THEME.borderRadius.md,
    padding: 12,
    marginBottom: 16
  },
  errorText: {
    color: THEME.colors.urgent,
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
    fontWeight: '500'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: THEME.colors.overlay,
    justifyContent: 'flex-end'
  },
  modalCard: {
    backgroundColor: THEME.colors.card,
    borderTopLeftRadius: THEME.borderRadius.xl,
    borderTopRightRadius: THEME.borderRadius.xl,
    padding: 20
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.navy,
    marginLeft: 8
  },
  modalDesc: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    lineHeight: 17,
    marginBottom: 12
  },
  modalBtns: {
    flexDirection: 'row',
    marginTop: 10
  }
});

