import { apiRequest } from './client.js';

export const fetchClasses = () => apiRequest('/classes');
