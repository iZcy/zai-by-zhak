import { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import LoginButton from './components/auth/LoginButton'
import AdminPanel from './components/auth/AdminPanel'
import './App.css'
import api from './services/api'

function AppContent() {
  const [message, setMessage] = useState('')
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showAdmin, setShowAdmin] = useState(false)
  const { user, isAdmin } = useAuth()

  useEffect(() => {
    if (user) {
      fetchData()
    } else {
      setLoading(false)
    }
  }, [user])

  const fetchData = async () => {
    try {
      setLoading(true)
      const response = await api.get('/')
      setMessage(response.data.message)
      setData(response.data.data || [])
      setError(null)
    } catch (err) {
      setError(err.message)
      console.error('Error fetching data:', err)
    } finally {
      setLoading(false)
    }
  }

  const addItem = async () => {
    try {
      const response = await api.post('/items', {
        name: `Item ${data.length + 1}`,
        timestamp: new Date().toISOString()
      })
      setData([...data, response.data.data])
    } catch (err) {
      console.error('Error adding item:', err)
    }
  }

  if (loading && !user) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center">
        <div className="text-stone-400">Loading...</div>
      </div>
    )
  }

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
          {error && (
            <div className="p-4 rounded-lg border border-red-900 bg-red-950/50 text-red-300 text-sm">
              {error}
            </div>
          )}

          {!user ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
              <div className="text-center space-y-4 max-w-md">
                <div className="w-16 h-16 mx-auto rounded-full bg-emerald-950 flex items-center justify-center">
                  <iconify-icon icon="solar:lock-linear" width="32" className="text-emerald-400"></iconify-icon>
                </div>
                <h1 className="text-2xl font-medium text-stone-100">Welcome to Zai</h1>
                <p className="text-stone-500">Please sign in with your Google account to access this application.</p>
                <div className="p-4 rounded-xl border border-stone-800 bg-black space-y-2 text-sm">
                  <p className="text-stone-400">Available roles:</p>
                  <div className="flex items-center gap-2 text-stone-300">
                    <iconify-icon icon="solar:user-linear" width="16"></iconify-icon>
                    <span><strong className="text-stone-100">User</strong> - View and create items</span>
                  </div>
                  <div className="flex items-center gap-2 text-stone-300">
                    <iconify-icon icon="solar:crown-linear" width="16"></iconify-icon>
                    <span><strong className="text-stone-100">Admin</strong> - Manage users and roles</span>
                  </div>
                </div>
              </div>
            </div>
          ) : showAdmin ? (
            <AdminPanel />
          ) : (
            <>
              {/* Header */}
              <div className="flex flex-col gap-1">
                <h1 className="text-xl font-medium tracking-tight text-stone-100">Overview</h1>
                <p className="text-sm text-stone-600">{message || 'Manage your data and settings'}</p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-5 rounded-xl border border-stone-800 bg-black hover:border-emerald-800 transition-colors group flex flex-col justify-between h-32">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-medium text-stone-500">Total Items</span>
                    <iconify-icon icon="solar:document-text-linear" width="20" className="text-stone-700 group-hover:text-emerald-500 transition-colors"></iconify-icon>
                  </div>
                  <div>
                    <span className="text-2xl font-semibold tracking-tight text-stone-200">{data.length}</span>
                    <div className="flex items-center gap-1 mt-1">
                      <iconify-icon icon="solar:trending-up-linear" width="14" className="text-emerald-500"></iconify-icon>
                      <span className="text-xs text-stone-600">Click Add Item to create more</span>
                    </div>
                  </div>
                </div>

                <div className="p-5 rounded-xl border border-stone-800 bg-black hover:border-emerald-800 transition-colors group flex flex-col justify-between h-32">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-medium text-stone-500">Your Role</span>
                    <iconify-icon icon={isAdmin() ? "solar:crown-linear" : "solar:user-linear"} width="20" className="text-stone-700 group-hover:text-emerald-500 transition-colors"></iconify-icon>
                  </div>
                  <div>
                    <span className="text-2xl font-semibold tracking-tight text-stone-200">{isAdmin() ? 'Admin' : 'User'}</span>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-xs text-stone-600">{isAdmin() ? 'Full access granted' : 'Standard access'}</span>
                    </div>
                  </div>
                </div>

                <div className="p-5 rounded-xl border border-stone-800 bg-black hover:border-emerald-800 transition-colors group flex flex-col justify-between h-32">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-medium text-stone-500">Status</span>
                    <iconify-icon icon="solar:check-circle-linear" width="20" className="text-stone-700 group-hover:text-emerald-500 transition-colors"></iconify-icon>
                  </div>
                  <div>
                    <span className="text-2xl font-semibold tracking-tight text-stone-200">Active</span>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      <span className="text-xs text-stone-600">All systems operational</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Items Section */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-medium text-stone-100">Data Items</h2>
                  <button onClick={addItem} className="h-9 px-4 rounded-md text-xs font-medium shadow-sm transition-all flex items-center gap-2 bg-stone-100 text-black hover:bg-emerald-100">
                    <iconify-icon icon="solar:add-circle-linear" width="14"></iconify-icon>
                    Add Item
                  </button>
                </div>

                <div className="border rounded-xl overflow-hidden shadow-sm bg-black border-stone-800">
                  {data.length === 0 ? (
                    <div className="p-12 text-center">
                      <iconify-icon icon="solar:box-linear" width="48" className="mx-auto text-stone-800 mb-4"></iconify-icon>
                      <p className="text-stone-500 mb-1">No items yet</p>
                      <p className="text-xs text-stone-600">Click "Add Item" to create your first item</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-stone-900">
                      {data.map((item, index) => (
                        <div key={item._id || index} className="p-4 flex items-center justify-between transition-colors hover:bg-stone-950">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-emerald-950 text-emerald-400">
                              <iconify-icon icon="solar:document-linear" width="18"></iconify-icon>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-stone-300">{item.name}</span>
                              <span className="text-[10px] text-stone-600">
                                {item.timestamp ? new Date(item.timestamp).toLocaleString() : 'Just created'}
                              </span>
                            </div>
                          </div>
                          <iconify-icon icon="solar:arrow-right-linear" width="18" className="text-stone-700"></iconify-icon>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              {/* System Info */}
              <section className="space-y-4">
                <h2 className="text-sm font-medium text-stone-100">System Information</h2>
                <div className="border rounded-xl overflow-hidden shadow-sm bg-black border-stone-800">
                  <div className="divide-y divide-stone-900">
                    <div className="p-4 flex items-center justify-between">
                      <span className="text-sm text-stone-400">Frontend</span>
                      <span className="text-sm font-medium text-stone-200">Vite + React</span>
                    </div>
                    <div className="p-4 flex items-center justify-between">
                      <span className="text-sm text-stone-400">Backend</span>
                      <span className="text-sm font-medium text-stone-200">Express.js</span>
                    </div>
                    <div className="p-4 flex items-center justify-between">
                      <span className="text-sm text-stone-400">Deployment</span>
                      <span className="text-sm font-medium text-stone-200">Docker Compose</span>
                    </div>
                    <div className="p-4 flex items-center justify-between">
                      <span className="text-sm text-stone-400">Authentication</span>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-emerald-950/50 text-emerald-300 border-emerald-900">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Google OAuth
                      </span>
                    </div>
                  </div>
                </div>
              </section>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="mt-12 mb-6 flex items-center justify-center">
          <span className="text-[10px] uppercase tracking-widest text-stone-700">Built with Vite, Express, Docker & Google OAuth</span>
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
