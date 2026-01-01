import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

export function Auth() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signUp, signIn } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = isSignUp
      ? await signUp(email, password)
      : await signIn(email, password)

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      if (isSignUp) {
        setError('Check your email to confirm your account!')
      } else {
        navigate('/')
      }
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-base">
      <div className="max-w-md w-full p-8 bg-card corner-clip shadow-card">
        <h1 className="text-3xl font-bold mb-6 text-center">
          RPG Life Tracker
        </h1>

        <div className="mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setIsSignUp(false)}
              className={`flex-1 py-2 rounded ${
                !isSignUp
                  ? 'bg-red text-white'
                  : 'bg-card-secondary text-secondary'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setIsSignUp(true)}
              className={`flex-1 py-2 rounded ${
                isSignUp
                  ? 'bg-red text-white'
                  : 'bg-card-secondary text-secondary'
              }`}
            >
              Sign Up
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 bg-card-secondary border-subtle rounded focus:outline-none focus:border-red focus:border-2"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-3 py-2 bg-card-secondary border-subtle rounded focus:outline-none focus:border-red focus:border-2"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className={`p-3 rounded ${
              error.includes('Check your email')
                ? 'bg-green/10 text-green border border-green/20 rounded'
                : 'bg-accent-primary/10 text-accent-primary border border-accent-primary/20'
            }`}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-accent-primary hover:bg-accent-primary/90 disabled:opacity-50 disabled:cursor-not-allowed rounded font-medium transition-colors"
          >
            {loading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Sign In'}
          </button>
        </form>

        {isSignUp && (
          <p className="mt-4 text-sm text-secondary text-center">
            You'll receive a confirmation email after signing up.
          </p>
        )}
      </div>
    </div>
  )
}
