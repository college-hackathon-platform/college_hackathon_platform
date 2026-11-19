import { useCallback, useEffect, useMemo, useState } from 'react'
import AuthContext from './authContext'
import api, {
  getApiErrorMessage,
  refreshAuthSession,
  setAuthSession,
  subscribeToAuthSession,
} from '../services/api'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [accessToken, setAccessToken] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  const applySession = useCallback((session) => {
    setAccessToken(session?.accessToken || null)
    setUser(session?.user || null)
  }, [])

  useEffect(() => {
    let active = true
    const unsubscribe = subscribeToAuthSession((session) => {
      if (active) {
        applySession(session)
      }
    })

    refreshAuthSession()
      .catch(() => {})
      .finally(() => {
        if (active) {
          setIsLoading(false)
        }
      })

    return () => {
      active = false
      unsubscribe()
    }
  }, [applySession])

  const login = useCallback(async ({ email, password }) => {
    const response = await api.post(
      '/auth/login',
      { email, password },
      { skipAuth: true, skipAuthRefresh: true },
    )
    const session = response.data?.data
    if (!session?.accessToken || !session?.user) {
      throw new Error('The server returned an invalid login response.')
    }

    setAuthSession(session)
    return session.user
  }, [])

  const register = useCallback(async ({ name, email, password }) => {
    const response = await api.post(
      '/auth/register',
      { name, email, password },
      { skipAuth: true, skipAuthRefresh: true },
    )
    return response.data?.data?.user
  }, [])

  const logout = useCallback(async () => {
    let errorMessage = ''
    try {
      await api.post('/auth/logout', {}, { skipAuth: true, skipAuthRefresh: true })
    } catch (error) {
      errorMessage = getApiErrorMessage(error, 'Could not contact the server to end your session.')
    } finally {
      setAuthSession(null)
    }

    return { errorMessage }
  }, [])

  const refreshSession = useCallback(async () => {
    try {
      return await refreshAuthSession()
    } catch {
      return null
    }
  }, [])

  const value = useMemo(
    () => ({
      user,
      accessToken,
      isAuthenticated: Boolean(user && accessToken),
      isLoading,
      login,
      register,
      logout,
      refreshSession,
    }),
    [user, accessToken, isLoading, login, register, logout, refreshSession],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
