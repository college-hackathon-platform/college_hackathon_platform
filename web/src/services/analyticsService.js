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

export function getTeamRegistrationAnalytics(params = {}) {
  return api.get('/admin/analytics/teams-registrations', { params })
}

export function getReportPreview(params = {}) {
  return api.get('/admin/analytics/reports/preview', { params })
}

export function exportReport(params = {}) {
  return api.get('/admin/analytics/reports/export', {
    params,
    responseType: 'blob',
  })
}
