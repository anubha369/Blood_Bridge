import { Platform } from 'react-native';

/**
 * BloodBridge Vision-X Mobile Configuration
 *
 * NOTE: Production builds must point to the production API server.
 * Local development dynamically falls back to localhost or Android emulator 10.0.2.2.
 */

// Resolves default API URL for development
const getDefaultDevApiUrl = (): string => {
  if (Platform.OS === 'android') {
    // Android emulator cannot reach host via 'localhost', it uses '10.0.2.2'
    return 'http://10.0.2.2:5001/api';
  }
  return 'http://localhost:5001/api';
};

export const CONFIG = {
  // Configured production API base URL - defaults to environment variable or production endpoint
  API_BASE_URL:
    process.env.EXPO_PUBLIC_API_URL ||
    (process.env.NODE_ENV === 'production'
      ? 'https://bloodbridge-api.vercel.app/api'
      : getDefaultDevApiUrl()),

  // Supabase Configuration (Anon Key only - Never service role)
  SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://your-project-id.supabase.co',
  SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',

  // Deep linking scheme
  DEEP_LINK_SCHEME: 'bloodbridge',

  // Request 5-stage lifecycle stages
  REQUEST_STAGES: [
    { key: 'registered', label: 'Registered', step: 1, desc: 'Request created & queued' },
    { key: 'alerting_donors', label: 'Alerting Donors', step: 2, desc: 'Emergency alerts sent' },
    { key: 'donors_responded', label: 'Donors Responded', step: 3, desc: 'Responses tracked' },
    { key: 'donor_selected', label: 'Donor Selected', step: 4, desc: 'Direct contact coordinated' },
    { key: 'fulfilled', label: 'Fulfilled', step: 5, desc: 'Blood received & completed' }
  ],

  // Blood groups supported
  BLOOD_GROUPS: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const,

  // Urgency levels
  URGENCY_LEVELS: [
    { id: 'critical', label: 'Critical (Immediate)', color: '#DC2626' },
    { id: 'urgent', label: 'Urgent (Within 4 hrs)', color: '#EA580C' },
    { id: 'standard', label: 'Standard (Within 24 hrs)', color: '#2563EB' }
  ] as const,

  // Clinical Disclaimer per BloodBridge medical ethics
  CLINICAL_DISCLAIMER:
    'BloodBridge coordinates potential blood availability; clinical cross-matching and transfusion compatibility belong exclusively to authorized medical professionals.'
};

