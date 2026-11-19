import api from './api'

export function getPublishedEvents() {
  return api.get('/teams/events/available')
}

export function createTeam(payload) { return api.post('/teams', payload) }
export function getMyTeams(params) { return api.get('/teams/my', { params }) }
export function getTeam(teamId) { return api.get(`/teams/${teamId}`) }
export function generateTeamInvitation(teamId) { return api.post(`/teams/${teamId}/invitation`) }
export function revokeTeamInvitation(teamId) { return api.delete(`/teams/${teamId}/invitation`) }
export function joinTeam(invitationCode) { return api.post('/teams/join', { invitationCode }) }
export function leaveTeam(teamId) { return api.post(`/teams/${teamId}/leave`) }
export function removeTeamMember(teamId, memberId) { return api.delete(`/teams/${teamId}/members/${memberId}`) }
export function submitRegistration(teamId) { return api.post('/registrations', { teamId }) }
export function getMyRegistrations(params) { return api.get('/registrations/my', { params }) }
export function getRegistration(registrationId) { return api.get(`/registrations/${registrationId}`) }
export function cancelRegistration(registrationId) { return api.post(`/registrations/${registrationId}/cancel`) }

export function getAdminTeams(params) { return api.get('/admin/teams', { params }) }
export function getAdminTeamStatistics() { return api.get('/admin/teams/statistics') }
export function getAdminTeam(teamId) { return api.get(`/admin/teams/${teamId}`) }
export function getAdminRegistrations(params) { return api.get('/admin/registrations', { params }) }
export function getAdminRegistrationStatistics() { return api.get('/admin/registrations/statistics') }
export function getAdminRegistration(registrationId) { return api.get(`/admin/registrations/${registrationId}`) }
export function updateAdminRegistrationStatus(registrationId, payload) {
  return api.patch(`/admin/registrations/${registrationId}/status`, payload)
}
