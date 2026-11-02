export const THEME = {
  colors: {
    // Primary Brand - Deep Burgundy and Crimson Accents
    primary: '#8B0000', // Deep Burgundy
    primaryDark: '#5E0000',
    primaryLight: '#A31621',
    crimson: '#C41E3A', // Vibrant Crimson
    crimsonLight: '#FFF0F2',
    crimsonBorder: '#FFCCD5',
    accent: '#E63946',
    ruby: '#9B1D20',

    // Midnight Navy & Cool Grays
    navy: '#0B132B', // Midnight Navy
    navyLight: '#1C2541',
    navyMuted: '#3A506B',
    navySubtle: '#475569',

    // Healthcare Backgrounds & Surfaces
    background: '#F8F9FA', // Warm off-white
    backgroundSecondary: '#F1F5F9',
    card: '#FFFFFF',
    cardAlt: '#FCFDFD',
    surface: '#FFFFFF',
    border: '#E2E8F0',
    borderLight: '#EDF2F7',
    divider: '#F1F5F9',

    // Status & Clinical Accents
    urgent: '#DC2626',
    urgentBg: '#FEF2F2',
    warning: '#D97706',
    warningBg: '#FFFBEB',
    success: '#16A34A',
    successBg: '#F0FDF4',
    info: '#2563EB',
    infoBg: '#EFF6FF',
    cooldown: '#EA580C',
    cooldownBg: '#FFF7ED',

    // Typography
    text: '#0B132B',
    textSecondary: '#475569',
    textMuted: '#64748B',
    textLight: '#94A3B8',
    textInverse: '#FFFFFF',
    textBrand: '#8B0000',

    // Interactive
    disabled: '#CBD5E1',
    disabledText: '#94A3B8',
    overlay: 'rgba(11, 19, 43, 0.55)',
    gold: '#D97706',
    goldBg: '#FEF3C7'
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    base: 16,
    lg: 20,
    xl: 24,
    xxl: 32,
    xxxl: 40
  },
  borderRadius: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 22,
    round: 9999
  },
  shadows: {
    sm: {
      shadowColor: '#0B132B',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 3,
      elevation: 2
    },
    md: {
      shadowColor: '#0B132B',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
      elevation: 3
    },
    lg: {
      shadowColor: '#0B132B',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.12,
      shadowRadius: 12,
      elevation: 6
    },
    emergency: {
      shadowColor: '#DC2626',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 10,
      elevation: 5
    }
  }
};

