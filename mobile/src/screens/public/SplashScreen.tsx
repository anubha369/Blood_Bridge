import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { THEME } from '../../constants/theme';

export const SplashScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => {
        if (user) {
          if (user.role === 'donor') {
            navigation.replace('DonorMain');
          } else if (user.role === 'admin') {
            navigation.replace('AdminMain');
          } else {
            navigation.replace('RequesterMain');
          }
        } else {
          navigation.replace('Welcome');
        }
      }, 1200);

      return () => clearTimeout(timer);
    }
  }, [user, loading, navigation]);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.emblemContainer}>
          <Image
            source={require('../../assets/bloodbridge-hero-emblem-transparent.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.brandTitle}>
          Blood<Text style={styles.brandCrimson}>Bridge</Text>
        </Text>
        <Text style={styles.visionText}>VISION-X</Text>
        <Text style={styles.tagline}>Emergency Blood Coordination & AI Dispatch</Text>
      </View>

      <View style={styles.footer}>
        <ActivityIndicator color={THEME.colors.primary} size="small" />
        <Text style={styles.footerText}>Secure Healthcare Intelligence</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.navy,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 60,
    paddingHorizontal: 24
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  emblemContainer: {
    width: 120,
    height: 120,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    ...THEME.shadows.emergency
  },
  logo: {
    width: '100%',
    height: '100%'
  },
  brandTitle: {
    fontSize: 34,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.6
  },
  brandCrimson: {
    color: THEME.colors.primary
  },
  visionText: {
    fontSize: 13,
    fontWeight: '900',
    color: THEME.colors.primary,
    letterSpacing: 4,
    marginTop: 4,
    marginBottom: 8
  },
  tagline: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.75)',
    textAlign: 'center',
    fontWeight: '500'
  },
  footer: {
    alignItems: 'center'
  },
  footerText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 8,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    fontWeight: '600'
  }
});
