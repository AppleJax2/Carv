import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { 
  Loader2, 
  Mail, 
  Lock, 
  ExternalLink,
  AlertCircle,
  Wifi,
  WifiOff,
} from 'lucide-react'

const WEBSITE_URL = 'https://carvapp.netlify.app'

// Helper to open URLs in system browser (not Electron window)
const openInBrowser = (url: string) => {
  if (window.electronAPI?.shell?.openExternal) {
    window.electronAPI.shell.openExternal(url)
  } else {
    // Fallback for dev mode without Electron
    window.open(url, '_blank')
  }
}

export function LoginScreen() {
  const { login, isLoading, error } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError(null)

    if (!email.trim()) {
      setLocalError('Email is required')
      return
    }

    if (!password) {
      setLocalError('Password is required')
      return
    }

    setIsSubmitting(true)
    const result = await login(email.trim(), password)
    setIsSubmitting(false)

    if (!result.success) {
      setLocalError(result.message || 'Login failed')
    }
  }

  const openSignUp = () => {
    openInBrowser(`${WEBSITE_URL}/sign-up`)
  }

  const openForgotPassword = () => {
    openInBrowser(`${WEBSITE_URL}/forgot-password`)
  }

  const displayError = localError || error

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 mb-4">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-8 h-8 text-white"
            >
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Welcome to Carv</h1>
          <p className="text-slate-400">Sign in to your account to continue</p>
        </div>

        {/* Login Form */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Display */}
            {displayError && (
              <div className="flex items-start gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-400">{displayError}</p>
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-300">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="pl-10 bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500"
                  disabled={isSubmitting || isLoading}
                  autoComplete="email"
                  autoFocus
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-slate-300">
                  Password
                </Label>
                <button
                  type="button"
                  onClick={openForgotPassword}
                  className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-10 bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500"
                  disabled={isSubmitting || isLoading}
                  autoComplete="current-password"
                />
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium py-2.5"
              disabled={isSubmitting || isLoading}
            >
              {isSubmitting || isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-700" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-slate-800/50 text-slate-500">
                Don't have an account?
              </span>
            </div>
          </div>

          {/* Sign Up Link */}
          <Button
            type="button"
            variant="outline"
            className="w-full border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
            onClick={openSignUp}
          >
            Create Account
            <ExternalLink className="w-4 h-4 ml-2" />
          </Button>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-sm text-slate-500">
            By signing in, you agree to our{' '}
            <button
              type="button"
              onClick={() => openInBrowser(`${WEBSITE_URL}/terms`)}
              className="text-blue-400 hover:text-blue-300 underline-offset-2 hover:underline"
            >
              Terms of Service
            </button>{' '}
            and{' '}
            <button
              type="button"
              onClick={() => openInBrowser(`${WEBSITE_URL}/privacy`)}
              className="text-blue-400 hover:text-blue-300 underline-offset-2 hover:underline"
            >
              Privacy Policy
            </button>
          </p>
        </div>

        {/* Connection Status */}
        <div className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-500">
          {navigator.onLine ? (
            <>
              <Wifi className="w-4 h-4 text-green-500" />
              <span>Connected</span>
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4 text-red-500" />
              <span>Offline - Please connect to sign in</span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
