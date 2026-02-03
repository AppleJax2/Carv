import ElectronStore from 'electron-store'
import { net } from 'electron'

// API base URL - production website
const API_BASE_URL = process.env.CARV_API_URL || 'https://carvapp.netlify.app'

export interface AuthUser {
  id: string
  email: string
  name: string | null
  subscriptionTier: string
}

export interface AuthState {
  token: string | null
  user: AuthUser | null
  lastVerified: number | null // timestamp
}

interface AuthStoreSchema {
  auth: AuthState
}

const defaultAuthState: AuthState = {
  token: null,
  user: null,
  lastVerified: null,
}

export class AuthStore {
  private store: ElectronStore<AuthStoreSchema>

  constructor() {
    this.store = new ElectronStore<AuthStoreSchema>({
      defaults: {
        auth: defaultAuthState,
      },
      name: 'carv-auth',
      encryptionKey: 'carv-secure-auth-key', // Basic encryption for token storage
    })
  }

  getAuthState(): AuthState {
    return this.store.get('auth')
  }

  setAuthState(state: AuthState): void {
    this.store.set('auth', state)
  }

  clearAuth(): void {
    this.store.set('auth', defaultAuthState)
  }

  isLoggedIn(): boolean {
    const state = this.getAuthState()
    return !!state.token && !!state.user
  }

  // Check if we should allow offline access (verified within last 24 hours)
  canAccessOffline(): boolean {
    const state = this.getAuthState()
    if (!state.token || !state.lastVerified) return false
    
    const offlineGracePeriod = 24 * 60 * 60 * 1000 // 24 hours
    return Date.now() - state.lastVerified < offlineGracePeriod
  }

  async login(email: string, password: string, machineId?: string): Promise<{
    success: boolean
    user?: AuthUser
    message?: string
  }> {
    try {
      const response = await this.makeRequest('/api/auth/desktop/login', {
        email,
        password,
        machineId,
      })

      if (response.success && response.token && response.user) {
        this.setAuthState({
          token: response.token,
          user: response.user,
          lastVerified: Date.now(),
        })
        return { success: true, user: response.user }
      }

      return { success: false, message: response.message || 'Login failed' }
    } catch (error) {
      console.error('Login error:', error)
      return { success: false, message: 'Network error. Please check your connection.' }
    }
  }

  async verifyToken(): Promise<{
    valid: boolean
    user?: AuthUser
    message?: string
  }> {
    const state = this.getAuthState()
    if (!state.token) {
      return { valid: false, message: 'No token stored' }
    }

    try {
      const response = await this.makeRequest('/api/auth/desktop/verify', {
        token: state.token,
      })

      if (response.valid && response.user) {
        // Update stored user info and verification timestamp
        this.setAuthState({
          ...state,
          user: response.user,
          lastVerified: Date.now(),
        })
        return { valid: true, user: response.user }
      }

      // Token invalid - clear auth
      this.clearAuth()
      return { valid: false, message: response.message || 'Token invalid' }
    } catch (error) {
      console.error('Token verification error:', error)
      
      // If network error but we have recent verification, allow offline access
      if (this.canAccessOffline()) {
        return { valid: true, user: state.user! }
      }
      
      return { valid: false, message: 'Network error. Please check your connection.' }
    }
  }

  async refreshToken(): Promise<{
    success: boolean
    user?: AuthUser
    message?: string
  }> {
    const state = this.getAuthState()
    if (!state.token) {
      return { success: false, message: 'No token to refresh' }
    }

    try {
      const response = await this.makeRequest('/api/auth/desktop/refresh', {
        token: state.token,
      })

      if (response.success && response.token && response.user) {
        this.setAuthState({
          token: response.token,
          user: response.user,
          lastVerified: Date.now(),
        })
        return { success: true, user: response.user }
      }

      // Refresh failed - clear auth
      this.clearAuth()
      return { success: false, message: response.message || 'Token refresh failed' }
    } catch (error) {
      console.error('Token refresh error:', error)
      return { success: false, message: 'Network error. Please check your connection.' }
    }
  }

  logout(): void {
    this.clearAuth()
  }

  private async makeRequest(endpoint: string, body: object): Promise<any> {
    return new Promise((resolve, reject) => {
      const url = `${API_BASE_URL}${endpoint}`
      
      const request = net.request({
        method: 'POST',
        url,
      })

      request.setHeader('Content-Type', 'application/json')

      let responseData = ''

      request.on('response', (response) => {
        response.on('data', (chunk) => {
          responseData += chunk.toString()
        })

        response.on('end', () => {
          try {
            const parsed = JSON.parse(responseData)
            resolve(parsed)
          } catch {
            reject(new Error('Invalid JSON response'))
          }
        })

        response.on('error', (error: Error) => {
          reject(error)
        })
      })

      request.on('error', (error) => {
        reject(error)
      })

      request.write(JSON.stringify(body))
      request.end()
    })
  }
}
