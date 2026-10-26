const API_BASE = '/api';

/**
 * Core HTTP Request Wrapper
 */
async function request(endpoint, options = {}) {
  const token = localStorage.getItem('bloodbridge_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  const data = await response.json();

  if (!response.ok) {
    const errorMsg = data.error || `Request failed with status ${response.status}`;
    const error = new Error(errorMsg);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  // Authentication
  auth: {
    signup: (payload) => request('/auth/signup', { method: 'POST', body: JSON.stringify(payload) }),
    login: (payload) => request('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
    getMe: () => request('/auth/me')
  },

  // Donors
  donors: {
    searchNearby: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/donors/nearby?${qs}`);
    },
    register: (payload) => request('/donors/register', { method: 'POST', body: JSON.stringify(payload) }),
    getProfile: () => request('/donors/profile'),
    updateProfile: (payload) => request('/donors/profile', { method: 'PUT', body: JSON.stringify(payload) }),
    withdrawConsent: () => request('/donors/consent/withdraw', { method: 'POST' })
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
    getAuditLogs: () => request('/admin/audit-logs'),
    getIntegrationLogs: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/integrations/logs?${qs}`);
    }
  }
};
