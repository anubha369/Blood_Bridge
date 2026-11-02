# BloodBridge Vision-X – Mobile Application

A production-grade React Native & Expo mobile application built for emergency blood coordination, PostGIS spatial dispatch, Groq AI request parsing, and medical RAG intelligence.

---

## 1. System Architecture

The mobile application operates as an independent client consuming the shared BloodBridge Node.js / Express backend alongside the existing web frontend.

```text
                        BloodBridge Backend
                                |
                         Node.js / Express
                                |
                    Supabase PostgreSQL + PostGIS
                                |
        -------------------------------------------------
        |                                               |
   Web Frontend                                    Mobile App
React + Vite + Tailwind                       React Native + Expo SDK 58
(Browser Coordination)                       (iOS & Android Native)
```

### Shared Backend Guarantees
- Reuses all existing REST API endpoints (`/api/auth`, `/api/requests`, `/api/donors`, `/api/credits`, `/api/blood-banks`, `/api/ai`, `/api/telegram`).
- Zero backend duplication: spatial search, matching algorithms, Groq LLM inference, and Telegram dispatches remain backend-controlled.
- No second database: both web and mobile share the single source of truth.
- Security-first: mobile utilizes **Expo SecureStore** for JWT tokens and connects exclusively via Supabase Anon credentials (service-role keys are never embedded).

---

## 2. Technology Stack & Package Versions

| Package / Technology | Version | Purpose |
|----------------------|---------|---------|
| **Expo SDK** | `~58.0.22` | Universal React Native development framework |
| **React Native** | `0.88.1` | Native mobile runtime |
| **React** | `19.3.0` | Declarative UI library |
| **TypeScript** | `~6.0.3` | Type-safe static analysis |
| **@react-navigation/native** | `^7.5.1` | Navigation container & deep linking |
| **@react-navigation/native-stack** | `^7.21.0` | Native performance screen transitions |
| **@react-navigation/bottom-tabs** | `^7.21.0` | Role-based bottom navigation |
| **expo-secure-store** | `~58.0.2` | Encrypted keychain / keystore token persistence |
| **@expo/vector-icons** | `^15.0.2` | Medical & healthcare iconography |
| **@supabase/supabase-js** | `^2.118.0` | Supabase client for mobile sessions |

---

## 3. Project Directory Structure

```text
mobile/
├── src/
│   ├── assets/               # Logos, hero emblems, transparent brand graphics
│   ├── components/           # Reusable healthcare components
│   │   ├── Badge.tsx         # Clinical status pills (critical, urgent, success)
│   │   ├── BloodGroupSelector.tsx # 8-group selection matrix
│   │   ├── Button.tsx        # High-contrast action buttons
│   │   ├── Card.tsx          # Rounded elevated containers
│   │   ├── EmptyState.tsx    # Zero-data guidance states
│   │   ├── Header.tsx        # Branded navigation bar with emergency styling
│   │   ├── Input.tsx         # Outlined floating text & password inputs
│   │   ├── LoadingScreen.tsx # Pulse medical heartbeat loader
│   │   ├── MedicalDisclaimerBanner.tsx # NBTC/WHO clinical disclaimer
│   │   └── StageIndicator.tsx# 5-Stage visual journey tracker
│   ├── constants/
│   │   ├── config.ts         # Environment defaults & clinical constants
│   │   ├── theme.ts          # Crimson (#C41E3A), Burgundy (#8B0000), Navy (#0B132B)
│   │   └── types.ts          # TypeScript domain interfaces
│   ├── context/
│   │   └── AuthContext.tsx   # Session management with SecureStore persistence
│   ├── navigation/
│   │   ├── DonorTabNavigator.tsx     # Volunteer donor bottom tabs
│   │   ├── RequesterTabNavigator.tsx # Requester bottom tabs
│   │   ├── RootNavigator.tsx         # Native stack & role routing
│   │   └── types.ts                  # Navigation route parameter types
│   ├── screens/
│   │   ├── admin/
│   │   │   └── AdminOverviewScreen.tsx       # System stats & donor verification
│   │   ├── ai/
│   │   │   └── AIAssistantScreen.tsx         # Groq LLM + RAG medical chat
│   │   ├── common/
│   │   │   ├── CreditWalletScreen.tsx        # Life Saver points & redemptions
│   │   │   └── ProfileScreen.tsx             # Account settings & role switcher
│   │   ├── donor/
│   │   │   ├── AvailabilityScreen.tsx        # Instant toggle & schedule
│   │   │   ├── ConsentScreen.tsx             # Telegram linking & contact consent
│   │   │   ├── ContactRequestsScreen.tsx     # Incoming emergency calls
│   │   │   ├── DonationConfirmationScreen.tsx# Record donation (+100 pts & cooldown)
│   │   │   ├── DonorDashboardScreen.tsx      # Command center & 90-day cooldown
│   │   │   └── DonorProfileScreen.tsx        # Blood group & dispatch area
│   │   ├── public/
│   │   │   ├── ForgotPasswordScreen.tsx      # Recovery code & password reset
│   │   │   ├── LoginScreen.tsx               # Password, SMS OTP & 1-click pills
│   │   │   ├── PrivacyPolicyScreen.tsx       # Geo-banding & contact masking policy
│   │   │   ├── RegisterScreen.tsx            # Dual role registration
│   │   │   ├── SplashScreen.tsx              # Animated logo & auto session check
│   │   │   └── WelcomeScreen.tsx             # Vision overview & evaluation logins
│   │   └── requester/
│   │       ├── BloodBankDirectoryScreen.tsx  # Verified centers & live inventory
│   │       ├── ConfirmFulfillmentScreen.tsx  # Stage 5 reception & cooldown trigger
│   │       ├── CreateRequestScreen.tsx       # Groq AI voice/text auto-fill form
│   │       ├── DonorResponsesScreen.tsx      # Stage 3 response feed
│   │       ├── NotificationsScreen.tsx       # Real-time alert feed
│   │       ├── RequesterDashboardScreen.tsx  # Live requests & emergency banner
│   │       ├── RequestTrackingScreen.tsx     # 5-Stage tracker & alert dispatch
│   │       └── SelectDonorScreen.tsx         # Stage 4 unmasking & coordination
│   ├── services/
│   │   ├── api.ts            # Type-safe API client for Express backend
│   │   └── supabase.ts       # SecureStore-backed Supabase client
│   └── utils/
│       └── storage.ts        # Expo SecureStore token & user storage
├── app.json                  # Expo config, permissions, deep linking
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

---

## 4. Key Workflows & Features

### A. Five-Stage Blood Request Coordination
1. **Registered**: Request created via form or Groq AI Natural Language auto-fill.
2. **Alerting Donors**: Dispatches notifications to compatible donors within 30km via Telegram, WhatsApp, and SMS.
3. **Donors Responded**: Tracks donor accepts/declines while keeping telephone numbers masked.
4. **Donor Selected**: Requesters select an accepted donor, unlocking unmasked telephone coordination.
5. **Fulfilled**: Transfusion reception is confirmed; backend automatically activates the 90-day donor cooldown and credits +100 Life Saver points.

### B. Life Saver Recognition System
- **Registration Reward**: +50 pts upon volunteer signup.
- **Donation Reward**: +100 pts upon confirmed donation fulfillment.
- **Monthly Availability Reward**: +25 pts for maintaining uninterrupted readiness.
- **Redemption Catalog**: Healthcare checkup vouchers, pharmacy benefits, and recognition badges.

### C. Groq AI & Medical RAG Integration
- **Natural Language Request Parser**: Paste unstructured medical notes (e.g. *"2 units of B+ needed urgently at SMS Hospital Jaipur for Anita, call 9876543210"*) and Groq automatically populates blood group, units, hospital, and urgency level.
- **Clinical Chat Assistant**: Answers donor eligibility, tattoo wait periods, and transfusion questions with grounded RAG document citations.

### D. Privacy & Clinical Safety
- **Spatial Geo-Banding**: PostGIS calculates distances without transmitting raw donor coordinates.
- **Contact Masking**: Volunteer phone numbers remain hidden until mutual acceptance.
- **3-Month Medical Cooldown**: Strictly prevents over-donation per WHO / NBTC standards.

---

## 5. How to Run the Mobile Application

### Step 1: Install Dependencies
From the project root or inside `mobile/`:
```bash
cd mobile
npm install
```

### Step 2: Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Set the appropriate `EXPO_PUBLIC_API_URL`:
- **Android Emulator**: `http://10.0.2.2:5001/api`
- **iOS Simulator**: `http://localhost:5001/api`
- **Physical Device (Expo Go)**: `http://<YOUR_LAN_IP>:5001/api` (e.g. `http://192.168.1.100:5001/api`)
- **Production Server**: `https://your-production-url.com/api`

### Step 3: Start the Backend Server
In another terminal:
```bash
cd backend
npm run dev
```

### Step 4: Start the Expo Development Server
```bash
cd mobile
npx expo start
```

Press:
- `a` to run on Android Emulator.
- `i` to run on iOS Simulator (macOS only).
- Scan the QR code with **Expo Go** on your physical phone (both device and laptop must be on the same Wi-Fi).

---

## 6. Instant 1-Click Evaluation Accounts

The Welcome and Login screens provide 1-click evaluation accounts:
- **Volunteer Donor**: `donor.sarah@bloodbridge.org` (`DonorPass2026!`)
- **Hospital Requester**: `dr.mehta@cityhospital.org` (`HospitalPass2026!`)
- **System Administrator**: `admin@bloodbridge.org` (`AdminPass2026!`)

