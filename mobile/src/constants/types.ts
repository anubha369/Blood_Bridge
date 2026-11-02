export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
export type UrgencyLevel = 'critical' | 'urgent' | 'standard';
export type UserRole = 'requester' | 'donor' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: UserRole;
  blood_group?: BloodGroup;
  city?: string;
  area?: string;
  created_at?: string;
}

export type RequestStatus =
  | 'registered'
  | 'pending'
  | 'alerting_donors'
  | 'alerting'
  | 'active'
  | 'donors_responded'
  | 'responses_received'
  | 'donor_selected'
  | 'fulfilled'
  | 'cancelled';

export interface BloodRequest {
  id: string;
  requester_id: string;
  patient_name: string;
  blood_group: BloodGroup;
  units_needed: number;
  hospital_name: string;
  hospital_address?: string;
  latitude?: number;
  longitude?: number;
  urgency_level: UrgencyLevel;
  contact_number: string;
  notes?: string;
  status: RequestStatus;
  selected_donor_id?: string | null;
  selected_donor_name?: string | null;
  selected_donor_phone?: string | null;
  confirmation_status?: 'pending' | 'confirmed' | 'declined';
  donors_alerted_count?: number;
  responses_count?: number;
  created_at: string;
  fulfilled_at?: string;
}

export interface DonorCandidate {
  id: string;
  donor_id: string;
  name: string;
  blood_group: BloodGroup;
  distance_km?: number;
  compatibility_rank?: number;
  match_reasons?: string[];
  masked_phone?: string;
  availability_status: 'available' | 'unavailable';
  verification_status: 'verified' | 'unverified';
}

export interface ContactRequest {
  id: string;
  request_id: string;
  donor_id: string;
  donor_name?: string;
  donor_phone?: string;
  blood_group?: BloodGroup;
  patient_name?: string;
  hospital_name?: string;
  units_needed?: number;
  urgency_level?: UrgencyLevel;
  status: 'sent' | 'accepted' | 'declined' | 'snoozed' | 'expired';
  channel: 'telegram' | 'whatsapp' | 'sms' | 'push' | 'app';
  sent_at: string;
  responded_at?: string;
}

export interface DonorProfile {
  id: string;
  user_id: string;
  name: string;
  blood_group: BloodGroup;
  city: string;
  area: string;
  postal_code?: string;
  latitude?: number;
  longitude?: number;
  availability_status: 'available' | 'unavailable';
  consent_to_contact: boolean;
  verification_status: 'verified' | 'unverified';
  last_donation_date?: string | null;
  donation_count?: number;
  cooldown_until?: string | null;
  in_cooldown?: boolean;
}

export interface CooldownStatus {
  inCooldown: boolean;
  daysRemaining: number;
  cooldownUntil: string | null;
  lastDonationDate: string | null;
}

export interface CreditTransaction {
  id: string;
  user_id: string;
  amount: number;
  type: 'earn' | 'redeem' | 'bonus' | 'adjustment';
  reason: string;
  balance_after?: number;
  created_at: string;
}

export interface CreditWallet {
  balance: number;
  lifetime_earned: number;
  tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Life Saver';
  recent_transactions: CreditTransaction[];
}

export interface CreditCatalogItem {
  id: string;
  title: string;
  points_cost: number;
  description: string;
  category: 'health_checkup' | 'pharmacy_discount' | 'badge' | 'partner_voucher';
  icon?: string;
}

export interface BloodBank {
  id: string;
  name: string;
  address: string;
  city: string;
  phone: string;
  operating_hours?: string;
  verified: boolean;
  distance_km?: number;
  available_groups: Record<BloodGroup, number>;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  sources?: string[];
  grounded?: boolean;
}

