import api from './api'

export function getAdminSettings() {
  return api.get('/admin/settings')
}

export function updateAdminSettings(payload) {
  return api.patch('/admin/settings', payload)
}

export function getPublicPlatformStatus() {
  return api.get('/platform/status', { skipAuth: true, skipAuthRefresh: true })
}
