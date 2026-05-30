import { apiRequest } from './client.js';

export const fetchAnalyticsDashboard = () => apiRequest('/analytics/dashboard');
