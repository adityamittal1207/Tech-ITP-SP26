import { apiRequest } from './client.js';

export const fetchBookings = () => apiRequest('/bookings');
