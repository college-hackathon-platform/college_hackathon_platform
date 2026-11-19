import api from './api'

export function getAdminEvents(params) {
  return api.get('/admin/events', { params })
}

export function getAdminEventStatistics() {
  return api.get('/admin/events/statistics')
}

export function getAdminEventById(eventId) {
  return api.get(`/admin/events/${encodeURIComponent(eventId)}`)
}

export function createAdminEvent(payload) {
  return api.post('/admin/events', payload)
}

export function updateAdminEvent(eventId, payload) {
  return api.patch(`/admin/events/${encodeURIComponent(eventId)}`, payload)
}

export function updateAdminEventStatus(eventId, status) {
  return api.patch(`/admin/events/${encodeURIComponent(eventId)}/status`, { status })
}
