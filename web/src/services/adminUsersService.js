import api from './api'

export function getAdminUsers(params) {
  return api.get('/admin/users', { params })
}

export function getAdminUserStatistics() {
  return api.get('/admin/users/statistics')
}

export function getAdminUserById(userId) {
  return api.get('/admin/users/' + encodeURIComponent(userId))
}

export function updateAdminUser(userId, payload) {
  return api.patch('/admin/users/' + encodeURIComponent(userId), payload)
}

export function updateAdminUserStatus(userId, status) {
  return api.patch('/admin/users/' + encodeURIComponent(userId) + '/status', { status })
}

export function updateAdminUserRole(userId, role) {
  return api.patch('/admin/users/' + encodeURIComponent(userId) + '/role', { role })
}

export function createFaculty(payload) {
  return api.post('/admin/users/faculty', payload)
}
