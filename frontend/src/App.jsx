import { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import LoginButton from './components/auth/LoginButton'
import AdminPanel from './components/auth/AdminPanel'
import SubscriptionPanel from './components/subscription/SubscriptionPanel'
import AdminSubscriptionPanel from './components/subscription/AdminPanel'
import './App.css'
import api from './services/api'

function AppContent() {
  const [showAdmin, setShowAdmin] = useState(false)
  const [devUsers, setDevUsers] = useState([])
  const { isAdmin, user, switchTestUser } = useAuth()

  useEffect(() => {
    // Fetch dev users for testing
    if (import.meta.env.DEV) {
      api.get('/auth/dev/users')
        .then(res => setDevUsers(res.data.users || []))
        .catch(err => console.error('Failed to fetch dev users:', err))
    }
  }, [])

  return (
    <div className="min-h-screen bg-stone-950">
      {/* Top Bar */}
      <header className="border-b border-stone-800/60 bg-black/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <iconify-icon icon="solar:leaf-linear" width="20" className="text-emerald-100" stroke-width="1.5"></iconify-icon>
              <span className="font-semibold tracking-tight text-sm text-emerald-100">ZAI</span>
            </div>
            <div className="flex items-center gap-4">
              {/* Test User Switcher */}
              {import.meta.env.DEV && devUsers.length > 0 && (
                <select
                  value={user?.email || ''}
                  onChange={(e) => switchTestUser(e.target.value)}
                  className="h-8 px-2 rounded text-xs bg-stone-900 text-stone-300 border border-stone-700 focus:outline-none focus:border-emerald-700"
                >
                  {devUsers.map((devUser) => (
                    <option key={devUser.email} value={devUser.email}>
                      {devUser.displayName} ({devUser.role})
                    </option>
                  ))}
                </select>
              )}
              {isAdmin() && (
                <button
                  onClick={() => setShowAdmin(!showAdmin)}
                  className="text-sm text-stone-400 hover:text-emerald-100 transition-colors"
                >
                  {showAdmin ? 'Dashboard' : 'Admin Panel'}
                </button>
              )}
              <LoginButton />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6 md:p-8 lg:p-12">
        <div className="max-w-5xl mx-auto space-y-8 fade-in">
          {showAdmin ? (
            isAdmin() ? (
              <AdminSubscriptionPanel />
            ) : (
              <AdminPanel />
            )
          ) : (
            <SubscriptionPanel />
          )}
        </div>

        {/* Footer */}
        <div className="mt-12 mb-6 flex items-center justify-center">
          <span className="text-[10px] uppercase tracking-widest text-stone-700">Built with GLM 4.7 prompted by iZcy</span>
        </div>
      </main>
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
