import api from './api'

export async function getHealth({ signal } = {}) {
  const response = await api.get('/health', { signal, skipAuth: true })
  return response.data
}
