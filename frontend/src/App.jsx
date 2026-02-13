import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ToastProvider } from './contexts/ToastContext'
import LoginButton from './components/auth/LoginButton'
import SubscriptionPanel from './components/subscription/SubscriptionPanel'
import AdminSubscriptionPanel from './components/subscription/AdminPanel'
import './App.css'

// Logo component
function Logo({ size = 'default' }) {
  const sizes = {
    default: { img: 'h-8', subtitle: 'text-xs' },
    large: { img: 'h-12', subtitle: 'text-sm' }
  }
  const s = sizes[size] || sizes.default

  return (
    <div className="flex items-center gap-3">
      <img
        src="/zhipu-logo.png"
        alt="Zhipu AI"
        className={`${s.img} w-auto object-contain`}
      />
      <div className="h-5 w-px bg-stone-700"></div>
      <span className={`${s.subtitle} font-medium text-stone-500 tracking-wide`}>
        Zai by Zhak
      </span>
    </div>
  )
}

function AppContent() {
  const { isAdmin, user, loading, loginWithGoogle } = useAuth()

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-stone-400 text-sm">Loading...</span>
        </div>
      </div>
    )
  }

  // Show sign-in page if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-stone-950 flex flex-col">
        {/* Top Bar */}
        <header className="border-b border-stone-800/60 bg-black/60 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <Logo />
            </div>
          </div>
        </header>

        {/* Sign In Content */}
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="text-center space-y-8 fade-in">
            <div className="space-y-4">
              <div className="flex justify-center">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-900/50 to-teal-900/30 flex items-center justify-center border border-emerald-800/30 shadow-lg shadow-emerald-900/20">
                  <img
                    src="/zhipu-logo.png"
                    alt="Zhipu AI"
                    className="w-14 h-14 object-contain"
                  />
                </div>
              </div>
              <h1 className="text-3xl font-semibold text-stone-100">Welcome to Zai</h1>
              <p className="text-stone-400 max-w-md mx-auto">
                Manage your subscriptions and stocks with ease. Sign in to access your dashboard.
              </p>
            </div>

            <button
              onClick={loginWithGoogle}
              className="h-12 px-6 rounded-lg text-sm font-medium shadow-sm transition-all flex items-center gap-3 mx-auto bg-stone-100 text-black hover:bg-emerald-100"
            >
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path d="M17.64 9.2c0-.637-.057-1.252-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.144 0-3.993-1.457-4.646-3.43H2.366v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                <path d="M4.354 9c0-.718.117-1.413.323-2.07L1.836 5.658A8.997 8.997 0 0 0 1.836 12.342h2.518v-3.342z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 1 9 1 5.656 1 2.228 1.836 1.836 5.658l2.518 2.342C4.471 5.027 4.354 4.282 4.354 3.58z" fill="#EA4335"/>
              </svg>
              Sign in with Google
            </button>
          </div>
        </main>

        {/* Footer */}
        <div className="pb-6 flex items-center justify-center">
          <span className="text-[10px] uppercase tracking-widest text-stone-700">Built with GLM 4.7 & GLM 5 prompted by iZcy</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-950">
      {/* Top Bar */}
      <header className="border-b border-stone-800/60 bg-black/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Logo />
            <LoginButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6 md:p-8 lg:p-12">
        <div className="max-w-5xl mx-auto space-y-8 fade-in">
          {/* Subscription Section */}
          {isAdmin() ? (
            <AdminSubscriptionPanel />
          ) : (
            <SubscriptionPanel />
          )}
        </div>

        {/* Footer */}
        <div className="mt-12 mb-6 flex items-center justify-center">
          <span className="text-[10px] uppercase tracking-widest text-stone-700">Built with GLM 4.7 & GLM 5 prompted by iZcy</span>
        </div>
      </main>
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </AuthProvider>
  )
}

export default App
