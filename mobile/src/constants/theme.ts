export const THEME = {
  colors: {
    // Primary Brand - Website Crimson & Deep Rose (#D71935 / #e11d48)
    primary: '#D71935', // Website signature brand red
    primaryDark: '#BE123C', // Rose 700
    primaryLight: '#FFF1F2', // Rose 50
    primaryBorder: '#FECDD3', // Rose 200
    crimson: '#D71935',
    crimsonLight: '#FFF1F2',
    crimsonBorder: '#FECDD3',
    burgundy: '#881337',
    ruby: '#BE123C',

    // Midnight Navy & Slate Palette (#0F172A)
    navy: '#0F172A', // Slate 900
    navyLight: '#1E293B', // Slate 800
    navyMuted: '#334155', // Slate 700
    navySubtle: '#64748B', // Slate 500
    slate900: '#0F172A',
    slate800: '#1E293B',
    slate700: '#334155',
    slate600: '#475569',
    slate500: '#64748B',
    slate400: '#94A3B8',
    slate300: '#CBD5E1',
    slate200: '#E2E8F0',
    slate100: '#F1F5F9',
    slate50: '#F8FAFC',

    // Healthcare Backgrounds & Surfaces
    background: '#FAF9F6', // Website body warm off-white / ivory
    backgroundSecondary: '#F8FAFC', // Slate 50
    card: '#FFFFFF',
    cardAlt: '#FCFDFD',
    surface: '#FFFFFF',
    border: '#E2E8F0',
    borderLight: '#F1F5F9',
    borderDark: '#CBD5E1',
    divider: '#E2E8F0',

    // Status & Clinical Accents
    urgent: '#D71935',
    urgentBg: '#FFF1F2',
    warning: '#D97706',
    warningBg: '#FFFBEB',
    warningBorder: '#FDE68A',
    warningText: '#B45309',
    success: '#059669',
    successBg: '#ECFDF5',
    successBorder: '#A7F3D0',
    successText: '#047857',
    info: '#2563EB',
    infoBg: '#EFF6FF',
    infoBorder: '#BFDBFE',
    infoText: '#1D4ED8',
    cooldown: '#EA580C',
    cooldownBg: '#FFF7ED',

    // Typography
    text: '#0F172A',
    textSecondary: '#475569',
    textMuted: '#64748B',
    textLight: '#94A3B8',
    textInverse: '#FFFFFF',
    textBrand: '#D71935',

    // Interactive & Rewards
    disabled: '#CBD5E1',
    disabledText: '#94A3B8',
    overlay: 'rgba(15, 23, 42, 0.65)',
    gold: '#D97706',
    goldBg: '#FEF3C7',
    goldBorder: '#FDE68A'
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
    lg: 16, // rounded-2xl
    xl: 24, // rounded-3xl
    round: 9999
  },
  shadows: {
    sm: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 3,
      elevation: 2
    },
    md: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 4
    },
    lg: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 8
    },
    emergency: {
      shadowColor: '#D71935',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.22,
      shadowRadius: 12,
      elevation: 5
    }
  }
};
