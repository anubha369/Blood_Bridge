const CLOUDFLARE_TUNNEL_URL = 'https://tonight-restructuring-eden-executive.trycloudflare.com/api';
const LOCAL_BACKEND_URL = 'http://localhost:5001/api';

const isHttps = typeof window !== 'undefined' && window.location && window.location.protocol === 'https:';

let activeApiBase = (import.meta.env.VITE_API_URL || import.meta.env.API_URL || '').replace(/\/$/, '');

// If running on HTTPS (e.g. Vercel deployment), prioritize secure HTTPS tunnel over plain HTTP
if (isHttps && (!activeApiBase || activeApiBase.startsWith('http://'))) {
  activeApiBase = CLOUDFLARE_TUNNEL_URL;
} else if (!activeApiBase) {
  activeApiBase = LOCAL_BACKEND_URL;
}

const CANDIDATE_API_URLS = [
  activeApiBase,
  CLOUDFLARE_TUNNEL_URL,
  LOCAL_BACKEND_URL,
  '/api'
].filter((url, index, arr) => Boolean(url) && arr.indexOf(url) === index);

/**
 * Core HTTP Request Wrapper with safe JSON / HTML content inspection & resilient failover
 */
async function request(endpoint, options = {}) {
  const token = localStorage.getItem('bloodbridge_token');
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const executeFetch = async (targetBase) => {
    return await fetch(`${targetBase}${endpoint}`, {
      ...options,
      headers
    });
  };

  let response;
  let lastNetworkErr = null;

  try {
    response = await executeFetch(activeApiBase);
  } catch (networkErr) {
    lastNetworkErr = networkErr;
  }

  // If initial base failed with network error or 502/503/504 Bad Gateway, try fallbacks
  if (!response || [502, 503, 504].includes(response.status)) {
    for (const candidate of CANDIDATE_API_URLS) {
      if (candidate === activeApiBase) continue;
      try {
        const candidateRes = await executeFetch(candidate);
        if (candidateRes && candidateRes.status !== 502 && candidateRes.status !== 503 && candidateRes.status !== 504) {
          response = candidateRes;
          activeApiBase = candidate;
          lastNetworkErr = null;
          break;
        }
      } catch (_) {}
    }
  }

  if (!response) {
    const error = new Error(`Unable to reach the server at ${activeApiBase}. Please ensure your backend is running.`);
    error.status = 0;
    error.originalError = lastNetworkErr;
    throw error;
  }

  // Safe response parsing: inspect Content-Type before parsing JSON to prevent syntax crashes on HTML error pages
  const contentType = response.headers.get('content-type') || '';
  let data = null;
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

    // 1. Inspect data.error (handle strings, nested objects, or Supabase/Vercel error shapes)
    if (data && data.error) {
      if (typeof data.error === 'string') {
        errorMsg = data.error;
      } else if (typeof data.error.message === 'string') {
        errorMsg = data.error.message;
      } else {
        try {
          errorMsg = JSON.stringify(data.error);
        } catch (_) {
          errorMsg = '';
        }
      }
    }

    // 2. Inspect data.message if no errorMsg yet
    if (!errorMsg && data && data.message) {
      if (typeof data.message === 'string') {
        errorMsg = data.message;
      } else if (typeof data.message.error === 'string') {
        errorMsg = data.message.error;
      } else {
        try {
          errorMsg = JSON.stringify(data.message);
        } catch (_) {
          errorMsg = '';
        }
      }
    }

    // 3. Fallback to status-specific human-readable messages
    if (!errorMsg) {
      if (response.status === 404) {
        errorMsg = `API service route not found (404): ${endpoint}. Please ensure the backend server is reachable and VITE_API_URL is configured.`;
      } else if (response.status === 502 || response.status === 503 || response.status === 504) {
        errorMsg = `Backend server temporarily unavailable (${response.status}). Please verify that the API server is reachable.`;
      } else if (rawText) {
        const titleMatch = rawText.match(/<title>(.*?)<\/title>/i);
        const cleanTitle = titleMatch ? titleMatch[1].trim() : '';
        errorMsg = cleanTitle || rawText.slice(0, 150).trim() || `Request failed with status ${response.status}`;
      } else {
        errorMsg = `Request failed with status ${response.status}`;
      }
    }

    // 4. Hard safety check: ensure errorMsg is never literally "[object Object]"
    if (typeof errorMsg !== 'string' || errorMsg.trim() === '[object Object]' || !errorMsg.trim()) {
      errorMsg = response.status === 404
        ? `API route not found (404): ${endpoint}. Please verify backend connection.`
        : `Request failed with status ${response.status}`;
    }

    const error = new Error(errorMsg);
    error.status = response.status;
    error.data = data;
    error.raw = rawText;
    throw error;
  }

  if (!data) {
    if (rawText) {
      return { success: true, text: rawText };
    }
    return { success: true };
  }

  return data;
}

export const api = {
  // Authentication
  auth: {
    signup: (payload) => request('/auth/signup', { method: 'POST', body: JSON.stringify(payload) }),
    login: (payload) => request('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
    getMe: () => request('/auth/me'),
    forgotPassword: (email) => request('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
    resetPassword: (token, new_password) => request('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, new_password }) }),
    sendOtp: (payload) => request('/auth/send-otp', { method: 'POST', body: JSON.stringify(payload) }),
    verifyOtp: (payload) => request('/auth/verify-otp', { method: 'POST', body: JSON.stringify(payload) }),
    resendOtp: (payload) => request('/auth/resend-otp', { method: 'POST', body: JSON.stringify(payload) }),
    registerInitiate: (payload) => request('/auth/register-initiate', { method: 'POST', body: JSON.stringify(payload) }),
    verifyEmailOtp: (payload) => request('/auth/verify-email-otp', { method: 'POST', body: JSON.stringify(payload) }),
    resendEmailOtp: (payload) => request('/auth/resend-email-otp', { method: 'POST', body: JSON.stringify(payload) })
  },

  // Donors
  donors: {
    searchNearby: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/donors/nearby?${qs}`);
    },
    getLocations: () => request('/donors/locations'),
    register: (payload) => request('/donors/register', { method: 'POST', body: JSON.stringify(payload) }),
    getProfile: () => request('/donors/profile'),
    updateProfile: (payload) => request('/donors/profile', { method: 'PUT', body: JSON.stringify(payload) }),
    toggleAvailability: (status) => request('/donors/availability', { method: 'POST', body: JSON.stringify({ status }) }),
    confirmDonation: (payload) => request('/donors/confirm-donation', { method: 'POST', body: JSON.stringify(payload) }),
    getCooldownStatus: () => request('/donors/cooldown-status'),
    withdrawConsent: () => request('/donors/consent/withdraw', { method: 'POST' }),
    grantConsent: () => request('/donors/consent/grant', { method: 'POST' }),
    claimGoogleFormRecord: (payload = {}) => request('/donors/claim-google-form-record', { method: 'POST', body: JSON.stringify(payload) }),
    getContactRequests: () => request('/donors/contact-requests'),
    respondToContactRequest: (requestId, action) => request(`/donors/contact-requests/${requestId}/respond`, { method: 'POST', body: JSON.stringify({ action }) })
  },

  // Credits & Recognition
  credits: {
    getBalance: () => request('/credits/balance'),
    getWallet: () => request('/credits/wallet'),
    getHistory: (limit = 50) => request(`/credits/history?limit=${limit}`),
    getCatalog: () => request('/credits/catalog'),
    redeem: (benefitId) => request('/credits/redeem', { method: 'POST', body: JSON.stringify({ benefit_id: benefitId }) }),
    checkMonthly: () => request('/credits/check-monthly', { method: 'POST' }),
    getAdminStats: () => request('/credits/admin/stats'),
    adminAdjust: (payload) => request('/credits/admin/adjust', { method: 'POST', body: JSON.stringify(payload) }),
    processMonthlyRewards: () => request('/credits/admin/process-monthly', { method: 'POST' })
  },

  // Places & Hospitals Autocomplete (Google Places API New Proxy)
  places: {
    getConfig: () => request('/places/config'),
    searchHospitals: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/places/hospitals?${qs}`);
    },
    searchLocations: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/places/locations?${qs}`);
    },
    getDetails: (placeId, sessionToken) => {
      const qs = sessionToken ? `?session_token=${encodeURIComponent(sessionToken)}` : '';
      return request(`/places/details/${placeId}${qs}`);
    }
  },

  // Telegram Emergency Alerts & Account Linking
  telegram: {
    getStatus: () => request('/telegram/status'),
    getLinkCode: () => request('/telegram/link-code', { method: 'POST' }),
    updateConsent: (enabled) => request('/telegram/consent', { method: 'POST', body: JSON.stringify({ enabled }) }),
    unlink: () => request('/telegram/unlink', { method: 'POST' }),
    sendRequestNotifications: (payload) => request('/telegram/send-request-notifications', { method: 'POST', body: JSON.stringify(payload) })
  },

  // Requests
  requests: {
    create: (payload) => request('/requests', { method: 'POST', body: JSON.stringify(payload) }),
    getAll: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/requests?${qs}`);
    },
    getById: (id) => request(`/requests/${id}`),
    getCandidates: (id, radiusKm = 30) => request(`/requests/${id}/candidates?radius_km=${radiusKm}`),
    getContactRequests: (id) => request(`/requests/${id}/contact-requests`),
    sendDonorRequest: (id, donorId) => request(`/requests/${id}/send-donor-request`, { method: 'POST', body: JSON.stringify({ donor_id: donorId }) }),
    alertDonors: (id, payload = {}) => request(`/requests/${id}/alert-donors`, { method: 'POST', body: JSON.stringify(payload) }),
    getAcceptedDonors: (id) => request(`/requests/${id}/accepted-donors`),
    selectDonor: (id, donorId, manualConfirm = false) => request(`/requests/${id}/select-donor`, { method: 'POST', body: JSON.stringify({ donor_id: donorId, manual_confirm: manualConfirm }) }),
    reconfirmDonor: (id, action, method = 'portal') => request(`/requests/${id}/reconfirm-donor`, { method: 'POST', body: JSON.stringify({ action, method }) }),
    reselectDonor: (id) => request(`/requests/${id}/reselect-donor`, { method: 'POST' }),
    fulfill: (id, payload = {}) => request(`/requests/${id}/fulfill`, { method: 'POST', body: JSON.stringify(payload) }),
    cancel: (id) => request(`/requests/${id}/cancel`, { method: 'POST' }),
    updateStatus: (id, status) => request(`/requests/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) })
  },

  // Blood Banks
  bloodBanks: {
    getAll: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/blood-banks?${qs}`);
    },
    getById: (id) => request(`/blood-banks/${id}`),
    create: (payload) => request('/blood-banks', { method: 'POST', body: JSON.stringify(payload) }),
    update: (id, payload) => request(`/blood-banks/${id}`, { method: 'PUT', body: JSON.stringify(payload) })
  },

  // AI & RAG
  ai: {
    parseRequest: (prompt) => request('/ai/parse-request', { method: 'POST', body: JSON.stringify({ prompt }) }),
    askAssistant: (question, history = []) => request('/ai/assistant', { method: 'POST', body: JSON.stringify({ question, conversation_history: history }) })
  },

  // RAG Document Management
  rag: {
    getDocuments: () => request('/rag/documents'),
    ingestDocument: (payload) => request('/rag/documents', { method: 'POST', body: JSON.stringify(payload) }),
    updateStatus: (id, status) => request(`/rag/documents/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    reingest: (id) => request(`/rag/documents/${id}/reingest`, { method: 'POST' }),
    deleteDoc: (id) => request(`/rag/documents/${id}`, { method: 'DELETE' }),
    testQuery: (query) => request('/rag/query', { method: 'POST', body: JSON.stringify({ query }) })
  },

  // Admin
  admin: {
    getSummary: () => request('/admin/summary'),
    getDonors: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/admin/donors?${qs}`);
    },
    verifyDonor: (id, verification_status) => request(`/admin/donors/${id}/verify`, { method: 'PATCH', body: JSON.stringify({ verification_status }) }),
    overrideCooldown: (id, payload) => request(`/admin/donors/${id}/cooldown`, { method: 'PATCH', body: JSON.stringify(payload) }),
    getWhatsappJobs: () => request('/admin/whatsapp-jobs'),
    getCreditLedger: () => request('/admin/credit-ledger'),
    getAuditLogs: () => request('/admin/audit-logs'),
    getIntegrationLogs: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/integrations/logs?${qs}`);
    },
    syncRecentRecords: (options = {}) => {
      return request('/integrations/google-forms/sync-recent-records', {
        method: 'POST',
        body: JSON.stringify(options)
      });
    }
  },

  // Integrations
  integrations: {
    syncRecentRecords: (options = {}) => {
      return request('/integrations/google-forms/sync-recent-records', {
        method: 'POST',
        body: JSON.stringify(options)
      });
    },
    getLogs: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/integrations/logs?${qs}`);
    }
  }
};
