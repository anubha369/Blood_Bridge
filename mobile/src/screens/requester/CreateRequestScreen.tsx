import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
  Modal,
  ActivityIndicator,
  FlatList
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

  // 2-Step Form Navigation: 1 = Blood & Hospital Requirement, 2 = Patient & Location Details
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);

  // Step 1: Blood Requirement Fields
  const [bloodGroup, setBloodGroup] = useState<BloodGroup | null>('B+');
  const [unitsNeeded, setUnitsNeeded] = useState('1');
  const [city, setCity] = useState('Ghaziabad');
  const [hospitalName, setHospitalName] = useState('');
  const [urgencyLevel, setUrgencyLevel] = useState<UrgencyLevel>('urgent');
  const [contactNumber, setContactNumber] = useState(user?.phone || '');

  // Hospital Autocomplete State (Google Places API Proxy)
  const [hospitalQuery, setHospitalQuery] = useState('');
  const [hospitalSuggestions, setHospitalSuggestions] = useState<any[]>([]);
  const [loadingHospitals, setLoadingHospitals] = useState(false);
  const [showHospitalDropdown, setShowHospitalDropdown] = useState(false);
  const [selectedPlaceId, setSelectedPlaceId] = useState('');
  const [hospitalAddress, setHospitalAddress] = useState('');
  const [hospitalCoords, setHospitalCoords] = useState<{ lat?: number; lon?: number }>({});

  // Step 2: Patient & Medical Details
  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [wardBed, setWardBed] = useState('');
  const [neededBy, setNeededBy] = useState('');
  const [clinicalNotes, setClinicalNotes] = useState('');

  // Groq AI natural language parser modal state
  const [aiModalVisible, setAiModalVisible] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('Need 2 units of B+ blood urgently at Max Hospital Vaishali Ghaziabad tomorrow morning');
  const [aiLoading, setAiLoading] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounced search for hospitals using backend Google Places proxy
  useEffect(() => {
    if (!showHospitalDropdown || !hospitalQuery || hospitalQuery.trim().length < 2) {
      setHospitalSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoadingHospitals(true);
      try {
        const res = await api.places.searchHospitals({
          input: hospitalQuery.trim(),
          city: city
        });
        if (res.success && Array.isArray(res.suggestions)) {
          setHospitalSuggestions(res.suggestions);
        }
      } catch (err: any) {
        console.warn('Hospital search error:', err.message);
      } finally {
        setLoadingHospitals(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [hospitalQuery, city, showHospitalDropdown]);

  const handleSelectHospital = (hosp: any) => {
    setHospitalName(hosp.name);
    setHospitalQuery(hosp.name);
    setSelectedPlaceId(hosp.place_id || '');
    const addr = hosp.address || hosp.full_text || '';
    setHospitalAddress(addr);
    if (hosp.latitude && hosp.longitude) {
      setHospitalCoords({ lat: hosp.latitude, lon: hosp.longitude });
    }
    setShowHospitalDropdown(false);
    setError(null);
  };

  const handleUseCustomHospital = () => {
    if (!hospitalQuery.trim()) return;
    setHospitalName(hospitalQuery.trim());
    setSelectedPlaceId('');
    setShowHospitalDropdown(false);
  };

  const handleAiParse = async () => {
    if (!aiPrompt.trim()) {
      Alert.alert('Empty Input', 'Please describe your emergency blood requirement.');
      return;
    }

    try {
      setAiLoading(true);
      const res = await api.ai.parseRequest(aiPrompt.trim());
      if (res.success && (res.parsed_request || res.data)) {
        const d = res.parsed_request || res.data;
        if (d.blood_group) setBloodGroup(d.blood_group as BloodGroup);
        if (d.units_needed) setUnitsNeeded(String(d.units_needed));
        if (d.hospital_name && d.hospital_name !== 'City Emergency Hospital') {
          setHospitalName(d.hospital_name);
          setHospitalQuery(d.hospital_name);
        }
        if (d.location?.city || d.city) setCity(d.location?.city || d.city);
        if (d.patient_name) setPatientName(d.patient_name);
        if (d.contact_number || d.contact_phone) setContactNumber(d.contact_number || d.contact_phone);
        if (d.urgency) setUrgencyLevel(d.urgency as UrgencyLevel);
        if (d.needed_by) setNeededBy(d.needed_by);
        if (d.notes) setClinicalNotes(d.notes);

        setAiModalVisible(false);
        Alert.alert('AI Auto-Fill Complete', 'Blood group, hospital, units, and details extracted by Groq AI.');
      } else {
        Alert.alert('Extraction Note', res.message || 'Unable to extract all parameters. Please fill in remaining details.');
      }
    } catch (err: any) {
      Alert.alert('AI Parsing Failed', err.message || 'Failed to parse natural language text.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleNextStep = () => {
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
      setError('Please provide the hospital or medical facility name.');
      return;
    }
    if (!contactNumber.trim()) {
      setError('Please provide an attendant emergency contact phone number.');
      return;
    }

    setError(null);
    setCurrentStep(2);
  };

  const handleSubmit = async () => {
    if (!patientName.trim()) {
      setError('Please enter patient or recipient name.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      let finalAddress = hospitalAddress.trim();
      if (wardBed.trim()) {
        finalAddress = finalAddress ? `${finalAddress} • Ward/Bed: ${wardBed.trim()}` : `Ward/Bed: ${wardBed.trim()}`;
      }

      const payload = {
        patient_name: patientName.trim(),
        patient_age: patientAge.trim() ? parseInt(patientAge.trim(), 10) : undefined,
        blood_group: bloodGroup,
        units_needed: parseInt(unitsNeeded, 10),
        hospital_name: hospitalName.trim(),
        hospital_address: finalAddress || undefined,
        city: city.trim(),
        urgency: urgencyLevel,
        urgency_level: urgencyLevel,
        needed_by: neededBy || null,
        contact_phone: contactNumber.trim(),
        contact_number: contactNumber.trim(),
        notes: clinicalNotes.trim() || undefined,
        place_id: selectedPlaceId || undefined,
        latitude: hospitalCoords.lat,
        longitude: hospitalCoords.lon
      };

      const res = await api.requests.create(payload);
      if (res.success && res.request) {
        navigation.navigate('DonorMatchingReview', {
          requestId: res.request.id,
          bloodGroup,
          unitsNeeded: parseInt(unitsNeeded, 10),
          hospitalName: hospitalName.trim(),
          patientName: patientName.trim()
        });
      } else {
        setError(res.error || 'Failed to register blood request.');
      }
    } catch (err: any) {
      setError(err.message || 'Request registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const cities = ['Ghaziabad', 'Jaipur', 'Delhi', 'Noida', 'Bengaluru', 'Mumbai', 'Lucknow'];

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
        title={currentStep === 1 ? 'Create Blood Request (1/2)' : 'Patient & Medical Details (2/2)'}
        subtitle="Stage 1: Emergency Request Registration"
        showBack
        onBack={() => {
          if (currentStep === 2) {
            setCurrentStep(1);
            setError(null);
          } else {
            navigation.goBack();
          }
        }}
      />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 28 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <MedicalDisclaimerBanner />

        {/* Step Indicator Stepper matching Website */}
        <View style={styles.stepStepperCard}>
          <TouchableOpacity
            style={[styles.stepItem, currentStep === 1 && styles.stepItemActive]}
            onPress={() => setCurrentStep(1)}
          >
            <View style={[styles.stepBadge, currentStep === 1 ? styles.stepBadgeActive : styles.stepBadgeDone]}>
              <Text style={[styles.stepBadgeText, currentStep === 1 ? styles.stepBadgeTextActive : styles.stepBadgeTextDone]}>1</Text>
            </View>
            <Text style={[styles.stepLabel, currentStep === 1 && styles.stepLabelActive]}>Requirement</Text>
          </TouchableOpacity>

          <View style={styles.stepDivider} />

          <TouchableOpacity
            style={[styles.stepItem, currentStep === 2 && styles.stepItemActive]}
            onPress={() => {
              if (hospitalName) setCurrentStep(2);
            }}
          >
            <View style={[styles.stepBadge, currentStep === 2 ? styles.stepBadgeActive : styles.stepBadgeInactive]}>
              <Text style={[styles.stepBadgeText, currentStep === 2 ? styles.stepBadgeTextActive : styles.stepBadgeTextInactive]}>2</Text>
            </View>
            <Text style={[styles.stepLabel, currentStep === 2 && styles.stepLabelActive]}>Patient Details</Text>
          </TouchableOpacity>
        </View>

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
              Paste doctor prescription, WhatsApp, or clinical message to auto-extract parameters
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

        {/* ======================================================================
            STEP 1: BLOOD & HOSPITAL REQUIREMENT (Figma Step 1)
            ====================================================================== */}
        {currentStep === 1 && (
          <View>
            <View style={styles.figmaStepHeadingBox}>
              <Text style={styles.figmaStepTitle}>What blood is needed?</Text>
              <Text style={styles.figmaStepSubtitle}>
                Every second counts in an emergency. Specify the required blood group and whole-blood units needed.
              </Text>
            </View>

            {/* Required Blood Group */}
            <BloodGroupSelector
              label="Select Required Blood Group *"
              selectedGroup={bloodGroup}
              onSelect={setBloodGroup}
            />

            {/* Units Needed & Urgency Level */}
            <View style={styles.row}>
              <Input
                label="Units Needed *"
                placeholder="1"
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

            {/* City / Region Selector */}
            <View style={styles.fieldSection}>
              <Text style={styles.inputLabel}>City / Primary Medical Region *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cityPillsRow}>
                {cities.map((c) => {
                  const isSelected = city === c;
                  return (
                    <TouchableOpacity
                      key={c}
                      style={[styles.cityPill, isSelected && styles.cityPillSelected]}
                      onPress={() => setCity(c)}
                    >
                      <Text style={[styles.cityPillText, isSelected && styles.cityPillTextSelected]}>
                        {c}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Hospital Search with Google Places Autocomplete */}
            <View style={styles.fieldSection}>
              <Text style={styles.inputLabel}>Hospital or Transfusion Center *</Text>
              <Input
                placeholder="Search hospital (e.g. Max Hospital, Fortis, SMS)..."
                icon="business-outline"
                value={hospitalQuery}
                onChangeText={(text) => {
                  setHospitalQuery(text);
                  setHospitalName(text);
                  setShowHospitalDropdown(true);
                }}
                onFocus={() => setShowHospitalDropdown(true)}
              />

              {loadingHospitals && (
                <View style={styles.autocompleteLoadingRow}>
                  <ActivityIndicator size="small" color={THEME.colors.primary} />
                  <Text style={styles.autocompleteLoadingText}>Searching verified hospitals in {city}...</Text>
                </View>
              )}

              {/* Suggestions Dropdown */}
              {showHospitalDropdown && hospitalSuggestions.length > 0 && (
                <Card variant="outlined" style={styles.suggestionsBox}>
                  {hospitalSuggestions.map((hosp, idx) => (
                    <TouchableOpacity
                      key={hosp.place_id || idx}
                      style={styles.suggestionItem}
                      onPress={() => handleSelectHospital(hosp)}
                    >
                      <Ionicons name="location" size={16} color={THEME.colors.primary} style={{ marginRight: 8, marginTop: 2 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.suggestionName}>{hosp.name}</Text>
                        <Text style={styles.suggestionAddress} numberOfLines={1}>{hosp.address || hosp.full_text}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity
                    style={styles.customHospitalBtn}
                    onPress={handleUseCustomHospital}
                  >
                    <Ionicons name="create-outline" size={15} color={THEME.colors.slate600} />
                    <Text style={styles.customHospitalText}>Use "{hospitalQuery}" as custom facility</Text>
                  </TouchableOpacity>
                </Card>
              )}
            </View>

            {/* Attendant Contact Number */}
            <Input
              label="Attendant Emergency Contact Phone (+91) *"
              placeholder="10-digit mobile number"
              icon="call-outline"
              keyboardType="phone-pad"
              value={contactNumber}
              onChangeText={setContactNumber}
            />

            <Button
              title="Continue to Patient Details"
              variant="primary"
              size="lg"
              showArrow
              onPress={handleNextStep}
              style={{ marginTop: 8 }}
            />
          </View>
        )}

        {/* ======================================================================
            STEP 2: PATIENT & CLINICAL DETAILS (Figma Step 2)
            ====================================================================== */}
        {currentStep === 2 && (
          <View>
            <View style={styles.figmaStepHeadingBox}>
              <Text style={styles.figmaStepTitle}>Patient & clinical details</Text>
              <Text style={styles.figmaStepSubtitle}>
                Provide patient and hospital details to guide volunteer donors to the correct bedside and transfusion centre.
              </Text>
            </View>

            <Card variant="elevated" style={styles.reviewSummaryCard}>
              <View style={styles.reviewRow}>
                <View style={styles.bloodCircleSmall}>
                  <Text style={styles.bloodCircleText}>{bloodGroup}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.reviewTitle}>{unitsNeeded} Unit(s) at {hospitalName}</Text>
                  <Text style={styles.reviewSub}>{city} • Priority: {urgencyLevel.toUpperCase()}</Text>
                </View>
                <TouchableOpacity onPress={() => setCurrentStep(1)}>
                  <Ionicons name="pencil" size={16} color={THEME.colors.primary} />
                </TouchableOpacity>
              </View>
            </Card>

            <Input
              label="Patient Full Name *"
              placeholder="e.g. Rajiv Kumar (or Emergency Patient)"
              icon="person-outline"
              value={patientName}
              onChangeText={setPatientName}
            />

            <View style={styles.row}>
              <Input
                label="Patient Age"
                placeholder="e.g. 42"
                keyboardType="number-pad"
                value={patientAge}
                onChangeText={setPatientAge}
                containerStyle={{ width: 120, marginRight: 12 }}
              />
              <Input
                label="Ward / Bed Number"
                placeholder="e.g. ICU Bed 4"
                icon="bed-outline"
                value={wardBed}
                onChangeText={setWardBed}
                containerStyle={{ flex: 1 }}
              />
            </View>

            <Input
              label="Hospital Address / Road Locality"
              placeholder="e.g. Sector 1, Vaishali, Ghaziabad"
              icon="location-outline"
              value={hospitalAddress}
              onChangeText={setHospitalAddress}
            />

            <Input
              label="Needed By (Date / Time)"
              placeholder="e.g. Tomorrow by 9:00 AM (Surgery)"
              icon="calendar-outline"
              value={neededBy}
              onChangeText={setNeededBy}
            />

            <Input
              label="Clinical Notes / Diagnosis"
              placeholder="e.g. Scheduled cardiac bypass surgery. Replacement blood group accepted."
              multiline
              numberOfLines={3}
              value={clinicalNotes}
              onChangeText={setClinicalNotes}
              style={{ height: 75, textAlignVertical: 'top' }}
            />

            <View style={styles.btnRow}>
              <Button
                title="Back"
                variant="outline"
                size="lg"
                onPress={() => setCurrentStep(1)}
                style={{ flex: 1, marginRight: 10 }}
              />
              <Button
                title="Register Request"
                variant="primary"
                size="lg"
                showArrow
                loading={loading}
                onPress={handleSubmit}
                style={{ flex: 2 }}
              />
            </View>
          </View>
        )}
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
              Paste doctor prescription, hospital alert, or WhatsApp message. Groq AI extracts blood group, units, hospital, and urgency:
            </Text>

            <Input
              placeholder="e.g. Need 2 units of B+ blood for patient Rajiv at Fortis Hospital Jaipur urgently for surgery. Contact 9876543210."
              multiline
              numberOfLines={4}
              value={aiPrompt}
              onChangeText={setAiPrompt}
              style={{ height: 95, textAlignVertical: 'top' }}
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
  stepStepperCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 14,
    ...THEME.shadows.sm
  },
  figmaStepHeadingBox: {
    marginBottom: 14
  },
  figmaStepTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: THEME.colors.navy,
    letterSpacing: -0.4,
    marginBottom: 4
  },
  figmaStepSubtitle: {
    fontSize: 12,
    color: THEME.colors.slate600,
    lineHeight: 16
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  stepItemActive: {},
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  stepBadgeActive: {
    backgroundColor: THEME.colors.primary
  },
  stepBadgeDone: {
    backgroundColor: THEME.colors.success
  },
  stepBadgeInactive: {
    backgroundColor: THEME.colors.slate200
  },
  stepBadgeText: {
    fontSize: 12,
    fontWeight: '800'
  },
  stepBadgeTextActive: {
    color: '#FFFFFF'
  },
  stepBadgeTextDone: {
    color: '#FFFFFF'
  },
  stepBadgeTextInactive: {
    color: THEME.colors.slate600
  },
  stepLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.slate500
  },
  stepLabelActive: {
    color: THEME.colors.navy,
    fontWeight: '800'
  },
  stepDivider: {
    flex: 0.5,
    height: 1,
    backgroundColor: THEME.colors.slate200,
    marginHorizontal: 8
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
  fieldSection: {
    marginBottom: 12
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
  cityPillsRow: {
    gap: 6,
    paddingVertical: 4
  },
  cityPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: THEME.colors.borderDark
  },
  cityPillSelected: {
    backgroundColor: THEME.colors.navy,
    borderColor: THEME.colors.navy
  },
  cityPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.slate700
  },
  cityPillTextSelected: {
    color: '#FFFFFF'
  },
  autocompleteLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: -8,
    marginBottom: 10
  },
  autocompleteLoadingText: {
    fontSize: 12,
    color: THEME.colors.slate500
  },
  suggestionsBox: {
    marginTop: -8,
    marginBottom: 14,
    padding: 8,
    borderRadius: 14,
    maxHeight: 220
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.slate100
  },
  suggestionName: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.colors.navy
  },
  suggestionAddress: {
    fontSize: 11,
    color: THEME.colors.slate500,
    marginTop: 1
  },
  customHospitalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 4
  },
  customHospitalText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.primary
  },
  reviewSummaryCard: {
    padding: 14,
    marginBottom: 14,
    borderRadius: 16
  },
  reviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  bloodCircleSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  bloodCircleText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF'
  },
  reviewTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.navy
  },
  reviewSub: {
    fontSize: 12,
    color: THEME.colors.slate500,
    marginTop: 1
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
  btnRow: {
    flexDirection: 'row',
    marginTop: 8
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
