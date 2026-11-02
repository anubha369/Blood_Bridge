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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const CreateRequestScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
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

  const urgencyOptions: { level: UrgencyLevel; label: string; color: string }[] = [
    { level: 'critical', label: 'CRITICAL', color: '#B91C1C' },
    { level: 'urgent', label: 'URGENT', color: '#D97706' },
    { level: 'standard', label: 'STANDARD', color: '#2563EB' }
  ];

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Header
        title="Create Blood Request"
        subtitle="AI-Assisted Emergency Dispatch"
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <MedicalDisclaimerBanner />

        {/* Groq AI Parser Banner */}
        <TouchableOpacity
          style={styles.aiBanner}
          activeOpacity={0.88}
          onPress={() => setAiModalVisible(true)}
        >
          <View style={styles.aiIconBadge}>
            <Ionicons name="sparkles" size={18} color="#FFFFFF" />
          </View>
          <View style={styles.aiTextCol}>
            <Text style={styles.aiTitle}>Auto-Fill with Groq AI Parser</Text>
            <Text style={styles.aiSubtitle}>
              Paste doctor prescription, WhatsApp, or natural message to auto-extract details
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={THEME.colors.primary} />
        </TouchableOpacity>

        {error && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={18} color="#B91C1C" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Required Blood Group */}
        <BloodGroupSelector
          label="Required Blood Group *"
          selectedGroup={bloodGroup}
          onSelect={setBloodGroup}
        />

        {/* Units Needed & Urgency Level */}
        <View style={styles.row}>
          <Input
            label="Units Needed *"
            placeholder="e.g. 2"
            keyboardType="number-pad"
            value={unitsNeeded}
            onChangeText={setUnitsNeeded}
            containerStyle={{ width: 120, marginRight: 12 }}
          />

          <View style={{ flex: 1 }}>
            <Text style={styles.inputLabel}>Urgency Priority</Text>
            <View style={styles.urgencyTabs}>
              {urgencyOptions.map((opt) => {
                const isSelected = urgencyLevel === opt.level;
                return (
                  <TouchableOpacity
                    key={opt.level}
                    style={[
                      styles.urgencyTab,
                      isSelected && {
                        backgroundColor: opt.color,
                        borderColor: opt.color
                      }
                    ]}
                    onPress={() => setUrgencyLevel(opt.level)}
                  >
                    <Text
                      style={[
                        styles.urgencyTabText,
                        isSelected && { color: '#FFFFFF', fontWeight: '800' }
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* Hospital Details */}
        <Input
          label="Hospital or Transfusion Facility *"
          placeholder="e.g. Fortis Escorts Hospital"
          icon="business-outline"
          value={hospitalName}
          onChangeText={setHospitalName}
        />

        <Input
          label="Hospital Address / Locality"
          placeholder="e.g. JLN Marg, Malviya Nagar, Jaipur"
          icon="location-outline"
          value={hospitalAddress}
          onChangeText={setHospitalAddress}
        />

        {/* Patient Name */}
        <Input
          label="Patient Name"
          placeholder="e.g. Rajiv Kumar (or Anonymous)"
          icon="person-outline"
          value={patientName}
          onChangeText={setPatientName}
        />

        {/* Contact Phone */}
        <Input
          label="Attendant Emergency Contact Phone *"
          placeholder="10-digit emergency phone number"
          icon="call-outline"
          keyboardType="phone-pad"
          value={contactNumber}
          onChangeText={setContactNumber}
        />

        {/* Medical Notes */}
        <Input
          label="Clinical Notes / Replacement Criteria"
          placeholder="e.g. Surgery scheduled tomorrow 9 AM. Replacement donor accepted."
          multiline
          numberOfLines={3}
          value={notes}
          onChangeText={setNotes}
          style={{ height: 75, textAlignVertical: 'top' }}
        />

        {/* Submit Button */}
        <Button
          title="Create & Dispatch Blood Request"
          variant="primary"
          size="lg"
          showArrow
          loading={loading}
          onPress={handleSubmit}
          style={{ marginTop: 12, marginBottom: 20 }}
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
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="sparkles" size={20} color={THEME.colors.primary} />
                <Text style={styles.modalTitle}>Groq AI Natural Language Parser</Text>
              </View>
              <TouchableOpacity onPress={() => setAiModalVisible(false)}>
                <Ionicons name="close" size={24} color={THEME.colors.slate400} />
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
    backgroundColor: THEME.colors.slate50
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12
  },
  aiBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF1F2',
    borderWidth: 1.5,
    borderColor: '#FECDD3',
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
    ...THEME.shadows.sm
  },
  aiIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: THEME.colors.primary,
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
    color: THEME.colors.slate600,
    marginTop: 2,
    lineHeight: 15
  },
  row: {
    flexDirection: 'row'
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.navy,
    marginBottom: 6
  },
  urgencyTabs: {
    flexDirection: 'row',
    height: 52,
    gap: 4
  },
  urgencyTab: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: THEME.colors.slate300,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF'
  },
  urgencyTabText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: THEME.colors.slate600
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 13,
    flex: 1,
    fontWeight: '600'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: THEME.colors.overlay,
    justifyContent: 'flex-end'
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
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
    color: THEME.colors.navy
  },
  modalDesc: {
    fontSize: 12,
    color: THEME.colors.slate600,
    lineHeight: 17,
    marginBottom: 12
  },
  modalBtns: {
    flexDirection: 'row',
    marginTop: 10
  }
});
