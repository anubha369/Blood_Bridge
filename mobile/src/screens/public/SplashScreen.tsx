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
        <Text style={styles.brandTitle}>BloodBridge</Text>
        <Text style={styles.visionText}>VISION-X</Text>
        <Text style={styles.tagline}>Emergency Blood Coordination & AI Dispatch</Text>
      </View>

      <View style={styles.footer}>
        <ActivityIndicator color={THEME.colors.crimson} size="small" />
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
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 77, 109, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    ...THEME.shadows.emergency
  },
  logo: {
    width: 90,
    height: 90
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5
  },
  visionText: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.crimson,
    letterSpacing: 4,
    marginTop: 4,
    marginBottom: 10
  },
  tagline: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
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
    textTransform: 'uppercase'
  }
});

