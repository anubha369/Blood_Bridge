import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface HeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  isEmergency?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  showBack = false,
  onBack,
  rightAction,
  isEmergency = false
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + 8 },
        isEmergency && styles.emergencyContainer
      ]}
    >
      <View style={styles.contentRow}>
        <View style={styles.left}>
          {showBack && (
            <TouchableOpacity
              onPress={onBack}
              style={styles.backBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons
                name="chevron-back"
                size={24}
                color={isEmergency ? THEME.colors.textInverse : THEME.colors.navy}
              />
            </TouchableOpacity>
          )}
          <View style={styles.titleCol}>
            <Text
              style={[
                styles.title,
                isEmergency && { color: THEME.colors.textInverse }
              ]}
              numberOfLines={1}
            >
              {title}
            </Text>
            {subtitle && (
              <Text
                style={[
                  styles.subtitle,
                  isEmergency && { color: 'rgba(255,255,255,0.85)' }
                ]}
                numberOfLines={1}
              >
                {subtitle}
              </Text>
            )}
          </View>
        </View>

        {rightAction && <View style={styles.right}>{rightAction}</View>}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: THEME.colors.card,
    paddingHorizontal: THEME.spacing.base,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.borderLight,
    ...THEME.shadows.sm
  },
  emergencyContainer: {
    backgroundColor: THEME.colors.primary,
    borderBottomColor: THEME.colors.primaryDark
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  left: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center'
  },
  backBtn: {
    marginRight: 10
  },
  titleCol: {
    flex: 1
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.navy,
    letterSpacing: 0.2
  },
  subtitle: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 2
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center'
  }
});

