const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

/**
 * Core HTTP Request Wrapper with safe JSON / HTML content inspection
 */
async function request(endpoint, options = {}) {
  const token = localStorage.getItem('bloodbridge_token');
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  let response;
  try {
    response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });
  } catch (networkErr) {
    const error = new Error(`Unable to reach the server at ${API_BASE}. Please ensure your backend is running.`);
    error.status = 0;
    error.originalError = networkErr;
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
    if (data && data.error) {
      errorMsg = data.error;
    } else if (data && data.message) {
      errorMsg = data.message;
    } else if (response.status === 404) {
      errorMsg = `API route not found (404): ${endpoint}. Please ensure the backend server is running and VITE_API_URL is configured.`;
    } else if (response.status === 502 || response.status === 503 || response.status === 504) {
      errorMsg = `Backend server temporarily unavailable (${response.status}). Please verify that the API server is reachable.`;
    } else if (rawText) {
      const titleMatch = rawText.match(/<title>(.*?)<\/title>/i);
      const cleanTitle = titleMatch ? titleMatch[1].trim() : '';
      errorMsg = cleanTitle || `Request failed with status ${response.status}`;
    } else {
      errorMsg = `Request failed with status ${response.status}`;
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
    resetPassword: (token, new_password) => request('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, new_password }) })
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
    grantConsent: () => request('/donors/consent/grant', { method: 'POST' })
  },

  // Credits & Recognition
  credits: {
    getBalance: () => request('/credits/balance'),
    getHistory: () => request('/credits/history'),
    earn: (payload) => request('/credits/earn', { method: 'POST', body: JSON.stringify(payload) })
  },

  // WhatsApp Notifications
  whatsapp: {
    sendRequestNotifications: (payload) => request('/whatsapp/send-request-notifications', { method: 'POST', body: JSON.stringify(payload) }),
    getJobs: (requestId) => request(`/whatsapp/jobs/${requestId}`),
    getAction: (token) => request(`/whatsapp/action/${token}`),
    submitAction: (token, action) => request(`/whatsapp/action/${token}`, { method: 'POST', body: JSON.stringify({ action }) }),
    getManualLink: (payload) => request('/whatsapp/manual-link', { method: 'POST', body: JSON.stringify(payload) })
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
    getAcceptedDonors: (id) => request(`/requests/${id}/accepted-donors`),
    selectDonor: (id, donorId) => request(`/requests/${id}/select-donor`, { method: 'POST', body: JSON.stringify({ donor_id: donorId }) }),
    reselectDonor: (id) => request(`/requests/${id}/reselect-donor`, { method: 'POST' }),
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
