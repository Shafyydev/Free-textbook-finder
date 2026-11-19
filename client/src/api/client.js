const rawBase = import.meta.env.VITE_API_BASE_URL || '';
const base = rawBase.replace(/\/$/, '').replace(/\/api$/i, '');

async function request(path, options = {}) {
  const res = await fetch(`${base}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    const msg = data && data.error ? data.error : `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

export const api = {
  searchBooks: (params) => {
    const qs = new URLSearchParams();
    Object.entries(params || {}).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') qs.set(k, v); });
    const q = qs.toString();
    return request(`/api/books${q ? `?${q}` : ''}`);
  },
  getBook: (id) => request(`/api/books/${id}`),
  getSubjects: () => request('/api/subjects'),
  getCourses: () => request('/api/courses'),
  getSources: () => request('/api/sources'),
  createRequest: (body) => request('/api/requests', { method: 'POST', body: JSON.stringify(body) }),
  admin: {
    headers: (password) => ({ 'x-admin-password': password }),
    listBooks: (password) => request('/api/books?limit=100', { headers: { 'x-admin-password': password } }),
    createBook: (password, body) => request('/api/admin/books', { method: 'POST', headers: { 'x-admin-password': password }, body: JSON.stringify(body) }),
    updateBook: (password, id, body) => request(`/api/admin/books/${id}`, { method: 'PUT', headers: { 'x-admin-password': password }, body: JSON.stringify(body) }),
    deleteBook: (password, id) => request(`/api/admin/books/${id}`, { method: 'DELETE', headers: { 'x-admin-password': password } }),
    createBookSource: (password, body) => request('/api/admin/book-sources', { method: 'POST', headers: { 'x-admin-password': password }, body: JSON.stringify(body) }),
    updateBookSource: (password, id, body) => request(`/api/admin/book-sources/${id}`, { method: 'PUT', headers: { 'x-admin-password': password }, body: JSON.stringify(body) }),
    deleteBookSource: (password, id) => request(`/api/admin/book-sources/${id}`, { method: 'DELETE', headers: { 'x-admin-password': password } }),
    listRequests: (password) => request('/api/admin/requests', { headers: { 'x-admin-password': password } }),
    updateRequest: (password, id, status) => request(`/api/admin/requests/${id}`, { method: 'PATCH', headers: { 'x-admin-password': password }, body: JSON.stringify({ status }) })
  }
};
