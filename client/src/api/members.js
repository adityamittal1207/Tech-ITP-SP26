import { apiRequest } from './client.js';

export const fetchMembers  = ()     => apiRequest('/members');
export const createMember  = (data) => apiRequest('/members', { method: 'POST', body: JSON.stringify(data) });
export const deleteMember  = (id)   => apiRequest(`/members/${id}`, { method: 'DELETE' });
