import api from './api'

export function getAnalyticsMetadata(params = {}) {
  return api.get('/admin/analytics/metadata', { params })
}

export function getAnalyticsOverview(params = {}) {
  return api.get('/admin/analytics/overview', { params })
}

export function getUserAnalytics(params = {}) {
  return api.get('/admin/analytics/users', { params })
}

export function getEventAnalytics(params = {}) {
  return api.get('/admin/analytics/events', { params })
}
