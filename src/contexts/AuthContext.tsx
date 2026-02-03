import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'

export interface AuthUser {
  id: string
  email: string
  name: string | null
  subscriptionTier: string
}

interface AuthState {
  isAuthenticated: boolean
  isLoading: boolean
  user: AuthUser | null
  error: string | null
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>
  logout: () => Promise<void>
  refreshAuth: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    user: null,
    error: null,
  })

  // Check authentication status on mount
  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      // Check if we're in Electron environment
      if (!window.electronAPI?.auth) {
        // Running in browser (dev mode without Electron)
        setState({
          isAuthenticated: false,
          isLoading: false,
          user: null,
          error: null,
        })
        return
      }

      // First check if we have a stored session
      const isLoggedIn = await window.electronAPI.auth.isLoggedIn()
      
      if (!isLoggedIn) {
        setState({
          isAuthenticated: false,
          isLoading: false,
          user: null,
          error: null,
        })
        return
      }

      // Verify the token with the server
      const result = await window.electronAPI.auth.verify()
      
      if (result.valid && result.user) {
        setState({
          isAuthenticated: true,
          isLoading: false,
          user: result.user,
          error: null,
        })
      } else {
        // Token invalid, try to refresh
        const refreshResult = await window.electronAPI.auth.refresh()
        
        if (refreshResult.success && refreshResult.user) {
          setState({
            isAuthenticated: true,
            isLoading: false,
            user: refreshResult.user,
            error: null,
          })
        } else {
          // Refresh failed, user needs to login again
          setState({
            isAuthenticated: false,
            isLoading: false,
            user: null,
            error: refreshResult.message || 'Session expired. Please login again.',
          })
        }
      }
    } catch (error) {
      console.error('Auth check error:', error)
      
      // Check if we can access offline
      const canOffline = await window.electronAPI?.auth?.canAccessOffline()
      if (canOffline) {
        const authState = await window.electronAPI.auth.getState()
        if (authState.user) {
          setState({
            isAuthenticated: true,
            isLoading: false,
            user: authState.user,
            error: 'Offline mode - some features may be limited',
          })
          return
        }
      }
      
      setState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        error: 'Failed to verify authentication',
      })
    }
  }, [])

  const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; message?: string }> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      if (!window.electronAPI?.auth) {
        return { success: false, message: 'Authentication not available' }
      }

      const result = await window.electronAPI.auth.login(email, password)
      
      if (result.success && result.user) {
        setState({
          isAuthenticated: true,
          isLoading: false,
          user: result.user,
          error: null,
        })
        return { success: true }
      } else {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: result.message || 'Login failed',
        }))
        return { success: false, message: result.message || 'Login failed' }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed'
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: message,
      }))
      return { success: false, message }
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      if (window.electronAPI?.auth) {
        await window.electronAPI.auth.logout()
      }
    } catch (error) {
      console.error('Logout error:', error)
    }
    
    setState({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      error: null,
    })
  }, [])

  const refreshAuth = useCallback(async () => {
    await checkAuth()
  }, [checkAuth])

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        logout,
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
