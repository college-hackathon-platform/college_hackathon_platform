import api from './api'

export function getFaculty(params) {
  return api.get('/admin/faculty', { params })
}

export function getFacultyDetails(facultyId) {
  return api.get(`/admin/faculty/${facultyId}`)
}

export function assignFaculty(eventId, facultyId) {
  return api.post(`/admin/events/${eventId}/faculty`, { facultyId })
}

export function removeFacultyAssignment(eventId, facultyId) {
  return api.delete(`/admin/events/${eventId}/faculty/${facultyId}`)
}

export function getEventEvaluators(eventId, params) {
  return api.get(`/admin/events/${eventId}/evaluators`, { params })
}

export function inviteEvaluator(eventId, payload) {
  return api.post(`/admin/events/${eventId}/evaluators`, payload)
}

export function revokeEvaluatorInvitation(invitationId) {
  return api.patch(`/admin/evaluators/${invitationId}/revoke`)
}

export function regenerateEvaluatorInvitation(invitationId) {
  return api.post(`/admin/evaluators/${invitationId}/regenerate`)
}
