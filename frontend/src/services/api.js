import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${API_URL}/api`;

// Hotels API
export const hotelsAPI = {
  getAll: () => axios.get(`${API}/hotels/`),
  getOne: (id) => axios.get(`${API}/hotels/${id}`),
  create: (data) => axios.post(`${API}/hotels/`, data),
  update: (id, data) => axios.put(`${API}/hotels/${id}`, data),
  delete: (id) => axios.delete(`${API}/hotels/${id}`)
};

// Operators API
export const operatorsAPI = {
  getAll: () => axios.get(`${API}/operators/`),
  getOne: (id) => axios.get(`${API}/operators/${id}`),
  create: (data) => axios.post(`${API}/operators/`, data),
  update: (id, data) => axios.put(`${API}/operators/${id}`, data),
  delete: (id) => axios.delete(`${API}/operators/${id}`)
};

// Bookings API
export const bookingsAPI = {
  getAll: () => axios.get(`${API}/bookings/`),
  getOne: (id) => axios.get(`${API}/bookings/${id}`),
  create: (data) => axios.post(`${API}/bookings/`, data),
  update: (id, data) => axios.put(`${API}/bookings/${id}`, data),
  delete: (id) => axios.delete(`${API}/bookings/${id}`)
};

// Commissions API
export const commissionsAPI = {
  getAll: () => axios.get(`${API}/commissions/`),
  getOne: (id) => axios.get(`${API}/commissions/${id}`),
  getByBooking: (bookingId) => axios.get(`${API}/commissions/booking/${bookingId}`),
  create: (data) => axios.post(`${API}/commissions/`, data),
  update: (id, data) => axios.put(`${API}/commissions/${id}`, data),
  delete: (id) => axios.delete(`${API}/commissions/${id}`)
};

// Dashboard API
export const dashboardAPI = {
  getStats: () => axios.get(`${API}/dashboard/stats`),
  getMonthlyRevenue: () => axios.get(`${API}/dashboard/monthly-revenue`),
  getTopHotels: () => axios.get(`${API}/dashboard/top-hotels`),
  getTopOperators: () => axios.get(`${API}/dashboard/top-operators`)
};

// Auth API
export const authAPI = {
  login: (email, password) => axios.post(`${API}/auth/login`, { email, password }),
  logout: () => axios.post(`${API}/auth/logout`)
};
