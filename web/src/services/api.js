import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1',
  timeout: 10000,
  withCredentials: true,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
})

let accessToken = null
let refreshPromise = null
const sessionListeners = new Set()

function notifySessionListeners(session) {
  sessionListeners.forEach((listener) => listener(session))
}

export function setAuthSession(session) {
  accessToken = session?.accessToken || null
  notifySessionListeners(session || null)
}

export function subscribeToAuthSession(listener) {
  sessionListeners.add(listener)
  return () => sessionListeners.delete(listener)
}

export function refreshAuthSession() {
  if (!refreshPromise) {
    refreshPromise = api
      .post('/auth/refresh', {}, { skipAuth: true, skipAuthRefresh: true })
      .then((response) => {
        const session = response.data?.data
        if (!session?.accessToken || !session?.user) {
          throw new Error('The server returned an invalid session response.')
        }

        setAuthSession(session)
        return session
      })
      .catch((error) => {
        setAuthSession(null)
        throw error
      })
      .finally(() => {
        refreshPromise = null
      })
  }

  return refreshPromise
}

api.interceptors.request.use((config) => {
  if (accessToken && !config.skipAuth) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${accessToken}`
  }

  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    if (error.response?.status !== 401 || !originalRequest) {
      return Promise.reject(error)
    }

    if (originalRequest.skipAuthRefresh || originalRequest._retry) {
      if (originalRequest._retry) {
        setAuthSession(null)
      }
      return Promise.reject(error)
    }

    originalRequest._retry = true

    try {
      const session = await refreshAuthSession()
      originalRequest.headers = originalRequest.headers || {}
      originalRequest.headers.Authorization = `Bearer ${session.accessToken}`
      return api(originalRequest)
    } catch {
      setAuthSession(null)
      return Promise.reject(error)
    }
  },
)

export function getApiErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  const status = error.response?.status
  const backendMessage = error.response?.data?.message

  if (status === 400 || status === 409) {
    return backendMessage || (status === 409 ? 'An account with this email already exists.' : 'Please check the information you entered.')
  }
  if (status === 401) {
    return backendMessage || 'Your session has expired. Please sign in again.'
  }
  if (status === 403) {
    return backendMessage || 'You do not have permission to perform this action.'
  }
  if (status === 429) {
    return backendMessage || 'Too many attempts. Please wait a moment and try again.'
  }
  if (status >= 500) {
    return 'The server is temporarily unavailable. Please try again later.'
  }
  if (!error.response) {
    return 'Unable to reach the server. Check your connection and try again.'
  }

  return fallback
}

export default api
