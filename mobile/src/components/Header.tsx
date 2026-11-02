import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  showBrand?: boolean;
  rightAction?: React.ReactNode;
  isEmergency?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  showBack = false,
  onBack,
  showBrand = false,
  rightAction,
  isEmergency = false
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + 6 },
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
                size={22}
                color={isEmergency ? THEME.colors.textInverse : THEME.colors.navy}
              />
            </TouchableOpacity>
          )}

          {showBrand ? (
            <View style={styles.brandContainer}>
              <View style={styles.emblemBox}>
                <Image
                  source={require('../assets/bloodbridge-hero-emblem-transparent.png')}
                  style={styles.emblem}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.brandText}>
                Blood<Text style={styles.brandRed}>Bridge</Text>
              </Text>
            </View>
          ) : (
            <View style={styles.titleCol}>
              {title && (
                <Text
                  style={[
                    styles.title,
                    isEmergency && { color: THEME.colors.textInverse }
                  ]}
                  numberOfLines={1}
                >
                  {title}
                </Text>
              )}
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
          )}
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
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
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
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: THEME.colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  emblemBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center'
  },
  emblem: {
    width: '100%',
    height: '100%'
  },
  brandText: {
    fontSize: 20,
    fontWeight: '900',
    color: THEME.colors.navy,
    letterSpacing: -0.3
  },
  brandRed: {
    color: THEME.colors.primary
  },
  titleCol: {
    flex: 1
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.navy,
    letterSpacing: -0.2
  },
  subtitle: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 1
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center'
  }
});
