import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';

export const MedicalDisclaimerBanner: React.FC = () => {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.banner}>
      <View style={styles.headerRow}>
        <Ionicons name="warning-outline" size={16} color={THEME.colors.warningText} style={styles.icon} />
        <View style={styles.textContainer}>
          <Text style={styles.noticeText}>
            <Text style={styles.boldText}>Clinical Coordination Notice: </Text>
            BloodBridge is an emergency coordination and search navigation platform, NOT a medical authority.
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setExpanded(!expanded)}
          style={styles.toggleBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.toggleText}>
            {expanded ? 'Less info' : 'Important clinical details'}
          </Text>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-forward'}
            size={12}
            color={THEME.colors.warningText}
          />
        </TouchableOpacity>
      </View>

      {expanded && (
        <View style={styles.expandedContent}>
          <Text style={styles.bulletPoint}>
            • Blood group and spatial proximity matching indicates <Text style={styles.boldText}>potential donor candidates</Text>, but <Text style={styles.boldText}>never</Text> represents medical confirmation of compatibility.
          </Text>
          <Text style={styles.bulletPoint}>
            • Final donor screening, hemoglobin checks, cross-matching, antibody screening, and transfusion safety decisions belong exclusively to authorized blood bank pathologists and attending clinicians.
          </Text>
          <Text style={styles.bulletPoint}>
            • In extreme acute emergencies, do not delay immediate contact with hospital emergency teams or certified regional blood centres.
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: THEME.colors.warningBg,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.warningBorder,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.warningBorder,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start'
  },
  icon: {
    marginRight: 8,
    marginTop: 2
  },
  textContainer: {
    flex: 1,
    marginRight: 6
  },
  noticeText: {
    fontSize: 12,
    color: THEME.colors.warningText,
    lineHeight: 16
  },
  boldText: {
    fontWeight: '700',
    color: '#78350F'
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    alignSelf: 'flex-start',
    marginTop: 1
  },
  toggleText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.warningText,
    textDecorationLine: 'underline'
  },
  expandedContent: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#FDE68A',
    gap: 4
  },
  bulletPoint: {
    fontSize: 11,
    color: '#92400E',
    lineHeight: 15
  }
});
