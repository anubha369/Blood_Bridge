import { CONFIG } from '../constants/config';
import { storage } from '../utils/storage';

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
  [key: string]: any;
}

export function getErrorMessage(err: any, fallback = 'Operation failed.'): string {
  if (!err) return fallback;
  if (typeof err === 'string') return err;
  if (typeof err?.message === 'string') return err.message;
  return fallback;
}

/**
 * Robust HTTP client that communicates with the shared BloodBridge Express backend
 */
async function request<T = any>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const token = await storage.getToken();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${CONFIG.API_BASE_URL}${cleanEndpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options.headers as Record<string, string>) || {})
  };

  let response: Response;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout for clinical resilience

    response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
  } catch (networkErr: any) {
    if (networkErr?.name === 'AbortError') {
      const err = new Error('Network request timed out. Please check your internet connection.');
      (err as any).status = 408;
      throw err;
    }
    const err = new Error(
      `Unable to reach the BloodBridge server at ${CONFIG.API_BASE_URL}. Please check your connection or backend status.`
    );
    (err as any).status = 0;
    (err as any).originalError = networkErr;
    throw err;
  }

  // Safe JSON inspection
  const contentType = response.headers.get('content-type') || '';
  let data: any = null;
  let rawText = '';

  if (contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch (_) {
      data = null;
    }
  } else {
    try {
      rawText = await response.text();
    } catch (_) {}
  }

  if (!response.ok) {
    let errorMsg = '';

    if (data && data.error) {
      if (typeof data.error === 'string') {
        errorMsg = data.error;
      } else if (typeof data.error.message === 'string') {
        errorMsg = data.error.message;
      } else {
        try {
          errorMsg = JSON.stringify(data.error);
        } catch (_) {}
      }
    }

    if (!errorMsg && data && data.message) {
      if (typeof data.message === 'string') {
        errorMsg = data.message;
      } else if (typeof data.message.error === 'string') {
        errorMsg = data.message.error;
      }
    }

    if (!errorMsg) {
      if (response.status === 404) {
        errorMsg = `API service route not found (404): ${endpoint}`;
      } else if (response.status === 401) {
        errorMsg = 'Session expired. Please log in again.';
      } else if (response.status === 403) {
        errorMsg = 'You do not have permission to perform this action.';
      } else if (response.status >= 500) {
        errorMsg = `Server error (${response.status}). Please try again in a moment.`;
      } else if (rawText) {
        errorMsg = rawText.slice(0, 150).trim();
      } else {
        errorMsg = `Request failed with status ${response.status}`;
      }
    }

    const error = new Error(errorMsg);
    (error as any).status = response.status;
    (error as any).data = data;
    throw error;
  }

  return (data || { success: true }) as ApiResponse<T>;
}

export const api = {
  // Authentication & Session
  auth: {
    signup: (payload: any) =>
      request('/auth/signup', { method: 'POST', body: JSON.stringify(payload) }),
    login: (payload: any) =>
      request('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
    getMe: () => request('/auth/me'),
    forgotPassword: (email: string) =>
      request('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
    resetPassword: (token: string, new_password: string) =>
      request('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, new_password })
      }),
    sendOtp: (payload: { phone: string }) =>
      request('/auth/send-otp', { method: 'POST', body: JSON.stringify(payload) }),
    verifyOtp: (payload: { phone: string; otp: string; challenge_id: string }) =>
      request('/auth/verify-otp', { method: 'POST', body: JSON.stringify(payload) }),
    resendOtp: (payload: { phone: string; challenge_id: string }) =>
      request('/auth/resend-otp', { method: 'POST', body: JSON.stringify(payload) }),
    registerInitiate: (payload: any) =>
      request('/auth/register-initiate', { method: 'POST', body: JSON.stringify(payload) }),
    verifyEmailOtp: (payload: { email: string; otp: string; challenge_id: string }) =>
      request('/auth/verify-email-otp', { method: 'POST', body: JSON.stringify(payload) }),
    resendEmailOtp: (payload: { email: string; challenge_id: string }) =>
      request('/auth/resend-email-otp', { method: 'POST', body: JSON.stringify(payload) })
  },

  // Donors
  donors: {
    searchNearby: (params: Record<string, any> = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/donors/nearby?${qs}`);
    },
    getLocations: () => request('/donors/locations'),
    register: (payload: any) =>
      request('/donors/register', { method: 'POST', body: JSON.stringify(payload) }),
    getProfile: () => request('/donors/profile'),
    updateProfile: (payload: any) =>
      request('/donors/profile', { method: 'PUT', body: JSON.stringify(payload) }),
    toggleAvailability: (status: 'available' | 'unavailable') =>
      request('/donors/availability', { method: 'POST', body: JSON.stringify({ status }) }),
    confirmDonation: (payload: any = {}) =>
      request('/donors/confirm-donation', { method: 'POST', body: JSON.stringify(payload) }),
    getCooldownStatus: () => request('/donors/cooldown-status'),
    withdrawConsent: () => request('/donors/consent/withdraw', { method: 'POST' }),
    grantConsent: () => request('/donors/consent/grant', { method: 'POST' }),
    getContactRequests: () => request('/donors/contact-requests'),
    respondToContactRequest: (requestId: string, action: 'accept' | 'declined' | 'snoozed') =>
      request(`/donors/contact-requests/${requestId}/respond`, {
        method: 'POST',
        body: JSON.stringify({ action })
      })
  },

  // Blood Requests & Lifecycle
  requests: {
    create: (payload: any) =>
      request('/requests', { method: 'POST', body: JSON.stringify(payload) }),
    getAll: (params: Record<string, any> = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/requests?${qs}`);
    },
    getById: (id: string) => request(`/requests/${id}`),
    getCandidates: (id: string, radiusKm = 30) =>
      request(`/requests/${id}/candidates?radius_km=${radiusKm}`),
    getContactRequests: (id: string) => request(`/requests/${id}/contact-requests`),
    sendDonorRequest: (id: string, donorId: string) =>
      request(`/requests/${id}/send-donor-request`, {
        method: 'POST',
        body: JSON.stringify({ donor_id: donorId })
      }),
    alertDonors: (id: string, payload: any = {}) =>
      request(`/requests/${id}/alert-donors`, { method: 'POST', body: JSON.stringify(payload) }),
    getAcceptedDonors: (id: string) => request(`/requests/${id}/accepted-donors`),
    selectDonor: (id: string, donorId: string, manualConfirm = false) =>
      request(`/requests/${id}/select-donor`, {
        method: 'POST',
        body: JSON.stringify({ donor_id: donorId, manual_confirm: manualConfirm })
      }),
    reconfirmDonor: (id: string, action: 'confirm' | 'decline', method = 'portal') =>
      request(`/requests/${id}/reconfirm-donor`, {
        method: 'POST',
        body: JSON.stringify({ action, method })
      }),
    reselectDonor: (id: string) => request(`/requests/${id}/reselect-donor`, { method: 'POST' }),
    fulfill: (id: string, payload: any = {}) =>
      request(`/requests/${id}/fulfill`, { method: 'POST', body: JSON.stringify(payload) }),
    cancel: (id: string) => request(`/requests/${id}/cancel`, { method: 'POST' }),
    updateStatus: (id: string, status: string) =>
      request(`/requests/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) })
  },

  // Blood Banks
  bloodBanks: {
    getAll: (params: Record<string, any> = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/blood-banks?${qs}`);
    },
    getById: (id: string) => request(`/blood-banks/${id}`)
  },

  // Places / Hospitals Autocomplete
  places: {
    getConfig: () => request('/places/config'),
    searchHospitals: (params: Record<string, any> = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/places/hospitals?${qs}`);
    },
    searchLocations: (params: Record<string, any> = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/places/locations?${qs}`);
    }
  },

  // Credit & Reward System
  credits: {
    getBalance: () => request('/credits/balance'),
    getWallet: () => request('/credits/wallet'),
    getHistory: (limit = 50) => request(`/credits/history?limit=${limit}`),
    getCatalog: () => request('/credits/catalog'),
    redeem: (benefitId: string) =>
      request('/credits/redeem', {
        method: 'POST',
        body: JSON.stringify({ benefit_id: benefitId })
      }),
    checkMonthly: () => request('/credits/check-monthly', { method: 'POST' })
  },

  // AI Assistant & Groq Natural Language Parsing
  ai: {
    parseRequest: (prompt: string) =>
      request('/ai/parse-request', { method: 'POST', body: JSON.stringify({ prompt }) }),
    askAssistant: (question: string, history: any[] = []) =>
      request('/ai/assistant', {
        method: 'POST',
        body: JSON.stringify({ question, conversation_history: history })
      })
  },

  // RAG Knowledge Base
  rag: {
    getDocuments: () => request('/rag/documents'),
    query: (query: string) =>
      request('/rag/query', { method: 'POST', body: JSON.stringify({ query }) })
  },

  // Telegram Emergency Link
  telegram: {
    getStatus: () => request('/telegram/status'),
    getLinkCode: () => request('/telegram/link-code', { method: 'POST' }),
    updateConsent: (enabled: boolean) =>
      request('/telegram/consent', { method: 'POST', body: JSON.stringify({ enabled }) }),
    unlink: () => request('/telegram/unlink', { method: 'POST' })
  },

  // Admin
  admin: {
    getSummary: () => request('/admin/summary'),
    getDonors: (params: Record<string, any> = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/admin/donors?${qs}`);
    },
    verifyDonor: (id: string, verification_status: string) =>
      request(`/admin/donors/${id}/verify`, {
        method: 'PATCH',
        body: JSON.stringify({ verification_status })
      }),
    getCreditLedger: () => request('/admin/credit-ledger'),
    getAuditLogs: () => request('/admin/audit-logs')
  }
};
