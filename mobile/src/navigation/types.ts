import { NavigatorScreenParams } from '@react-navigation/native';
import { ContactRequest } from '../constants/types';

export type RootStackParamList = {
  Splash: undefined;
  Welcome: undefined;
  Login: undefined;
  Register: { defaultRole?: 'requester' | 'donor' } | undefined;
  ForgotPassword: undefined;
  PrivacyPolicy: undefined;
  HowItWorks: undefined;
  VerifyOtp: {
    email?: string;
    phone?: string;
    role?: 'donor' | 'requester' | 'admin';
    challenge_id?: string;
    email_masked?: string;
  };
  DonorRegistration: undefined;

  // Main Role Hubs
  RequesterMain: NavigatorScreenParams<RequesterTabParamList>;
  DonorMain: NavigatorScreenParams<DonorTabParamList>;
  AdminMain: undefined;

  // Requester Modals & Detail screens
  RequestTracking: { requestId: string };
  DonorResponses: { requestId: string; contactRequests?: ContactRequest[] };
  SelectDonor: { requestId: string; donorId: string; donorName?: string };
  ConfirmFulfillment: { requestId: string; donorName?: string };
  Notifications: undefined;
  BloodBankDirectory: undefined;
  CreateRequest: undefined;
  DonorMatchingReview: {
    requestId: string;
    bloodGroup?: string;
    unitsNeeded?: number;
    hospitalName?: string;
    patientName?: string;
  };
  DispatchConfirmation: {
    requestId: string;
    patientName?: string;
    hospitalName?: string;
    bloodGroup?: string;
    unitsNeeded?: number;
    donorsAlertedCount?: number;
  };

  // Donor Modals & Detail screens
  Availability: undefined;
  Consent: undefined;
  DonationConfirmation: undefined;
  DonorProfile: undefined;
  ContactRequests: undefined;
  CreditWallet: undefined;
  AIAssistant: undefined;
};

export type RequesterTabParamList = {
  RequesterDashboard: undefined;
  CreateRequest: undefined;
  BloodBankDirectory: undefined;
  AIAssistant: undefined;
  Profile: undefined;
};

export type DonorTabParamList = {
  DonorDashboard: undefined;
  ContactRequests: undefined;
  AIAssistant: undefined;
  CreditWallet: undefined;
  Profile: undefined;
};

