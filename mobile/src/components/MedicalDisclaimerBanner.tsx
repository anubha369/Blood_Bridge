import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { CONFIG } from '../constants/config';

export const MedicalDisclaimerBanner: React.FC = () => {
  return (
    <View style={styles.banner}>
      <Ionicons name="shield-checkmark" size={16} color={THEME.colors.primary} style={styles.icon} />
      <Text style={styles.text}>{CONFIG.CLINICAL_DISCLAIMER}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.crimsonLight,
    borderWidth: 1,
    borderColor: THEME.colors.crimsonBorder,
    borderRadius: THEME.borderRadius.md,
    padding: 10,
    marginBottom: THEME.spacing.md
  },
  icon: {
    marginRight: 8
  },
  text: {
    flex: 1,
    fontSize: 11,
    color: THEME.colors.primary,
    lineHeight: 15,
    fontWeight: '500'
  }
});

