import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { THEME } from '../constants/theme';
import { CONFIG } from '../constants/config';
import { BloodGroup } from '../constants/types';

interface BloodGroupSelectorProps {
  selectedGroup: BloodGroup | null;
  onSelect: (group: BloodGroup) => void;
  label?: string;
  error?: string;
}

export const BloodGroupSelector: React.FC<BloodGroupSelectorProps> = ({
  selectedGroup,
  onSelect,
  label = 'Select Blood Group',
  error
}) => {
  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.grid}>
        {CONFIG.BLOOD_GROUPS.map((group) => {
          const isSelected = selectedGroup === group;
          return (
            <TouchableOpacity
              key={group}
              activeOpacity={0.8}
              onPress={() => onSelect(group)}
              style={[
                styles.item,
                isSelected && styles.itemSelected
              ]}
            >
              <Text
                style={[
                  styles.itemText,
                  isSelected && styles.itemTextSelected
                ]}
              >
                {group}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: THEME.spacing.md
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.navy,
    marginBottom: 8,
    letterSpacing: 0.2
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  item: {
    width: '23%',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.card,
    borderWidth: 1.5,
    borderColor: THEME.colors.border,
    borderRadius: THEME.borderRadius.md
  },
  itemSelected: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
    ...THEME.shadows.emergency
  },
  itemText: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.navy
  },
  itemTextSelected: {
    color: '#FFFFFF'
  },
  errorText: {
    color: THEME.colors.urgent,
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500'
  }
});

