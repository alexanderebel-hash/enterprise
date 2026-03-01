const API = import.meta.env.VITE_BACKEND_URL;

function getHeaders(token) {
  const h = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

async function request(path, options = {}) {
  const res = await fetch(`${API}${path}`, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Verbindungsfehler' }));
    throw new Error(err.detail || `Fehler ${res.status}`);
  }
  return res.json();
}

export const api = {
  login: (username, password) =>
    request('/api/auth/login', { method: 'POST', headers: getHeaders(), body: JSON.stringify({ username, password }) }),

  getMe: (token) =>
    request('/api/auth/me', { headers: getHeaders(token) }),

  getCategories: () =>
    request('/api/categories'),

  createCategory: (token, data) =>
    request('/api/categories', { method: 'POST', headers: getHeaders(token), body: JSON.stringify(data) }),

  getArticles: (params = {}) => {
    const q = new URLSearchParams();
    if (params.category) q.set('category', params.category);
    if (params.search) q.set('search', params.search);
    return request(`/api/articles?${q.toString()}`);
  },

  getArticle: (id) =>
    request(`/api/articles/${id}`),

  createArticle: (token, data) =>
    request('/api/articles', { method: 'POST', headers: getHeaders(token), body: JSON.stringify(data) }),

  updateArticle: (token, id, data) =>
    request(`/api/articles/${id}`, { method: 'PUT', headers: getHeaders(token), body: JSON.stringify(data) }),

  deleteArticle: (token, id) =>
    request(`/api/articles/${id}`, { method: 'DELETE', headers: getHeaders(token) }),

  getDashboardStats: () =>
    request('/api/dashboard/stats'),

  chat: (token, message, sessionId) =>
    request('/api/chat', { method: 'POST', headers: getHeaders(token), body: JSON.stringify({ message, session_id: sessionId }) }),

  getChatHistory: (token, sessionId) => {
    const q = sessionId ? `?session_id=${sessionId}` : '';
    return request(`/api/chat/history${q}`, { headers: getHeaders(token) });
  },

  getChatSessions: (token) =>
    request('/api/chat/sessions', { headers: getHeaders(token) }),

  health: () => request('/api/health'),

  getLocations: () => request('/api/locations'),
  getLocation: (id) => request(`/api/locations/${id}`),
  getTickets: (params = {}) => {
    const q = new URLSearchParams();
    if (params.location_id) q.set('location_id', params.location_id);
    if (params.status) q.set('status', params.status);
    return request(`/api/tickets?${q.toString()}`);
  },
  createTicket: (token, data) =>
    request('/api/tickets', { method: 'POST', headers: getHeaders(token), body: JSON.stringify(data) }),
  updateTicket: (token, id, data) =>
    request(`/api/tickets/${id}`, { method: 'PUT', headers: getHeaders(token), body: JSON.stringify(data) }),
  deleteTicket: (token, id) =>
    request(`/api/tickets/${id}`, { method: 'DELETE', headers: getHeaders(token) }),

  transcribe: async (token, audioBlob) => {
    const formData = new FormData();
    formData.append('file', audioBlob, 'logbuch.webm');
    const res = await fetch(`${API}/api/transcribe`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Transkriptionsfehler' }));
      throw new Error(err.detail || `Fehler ${res.status}`);
    }
    return res.json();
  },

  importArticle: async (token, file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API}/api/articles/import`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Importfehler' }));
      throw new Error(err.detail || `Fehler ${res.status}`);
    }
    return res.json();
  },

  getStardate: () => request('/api/stardate'),
};
