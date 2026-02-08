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
      <div className="container">
        <div className="loading">Loading...</div>
      </div>
    )
  }

  return (
    <div className="container">
      <header className="header">
        <div className="header-content">
          <div>
            <h1>🚀 Fullstack Docker App</h1>
            <p className="subtitle">{message}</p>
          </div>
          <LoginButton />
        </div>
        {isAdmin() && (
          <nav className="admin-nav">
            <button
              className={showAdmin ? 'btn btn-secondary' : 'btn btn-primary'}
              onClick={() => setShowAdmin(!showAdmin)}
            >
              {showAdmin ? 'Show App' : 'Admin Panel'}
            </button>
          </nav>
        )}
      </header>

      {error && (
        <div className="error">
          {error}
        </div>
      )}

      {!user ? (
        <div className="auth-required">
          <div className="auth-card">
            <h2>🔐 Authentication Required</h2>
            <p>Please sign in with your Google account to access this application.</p>
            <div className="auth-info">
              <p>📧 Two roles available:</p>
              <ul>
                <li>👤 <strong>User</strong> - Can view and create items</li>
                <li>👑 <strong>Admin</strong> - Can manage users and roles</li>
              </ul>
            </div>
          </div>
        </div>
      ) : showAdmin ? (
        <AdminPanel />
      ) : (
        <main className="main">
          <section className="card">
            <h2>API Data</h2>
            <button onClick={addItem} className="btn btn-primary">
              Add Item
            </button>

            <div className="data-list">
              {data.length === 0 ? (
                <p className="empty-state">No items yet. Click "Add Item" to create one!</p>
              ) : (
                data.map((item, index) => (
                  <div key={item._id || index} className="data-item">
                    <span className="item-name">{item.name}</span>
                    <span className="item-time">
                      {item.timestamp ? new Date(item.timestamp).toLocaleTimeString() : 'Just now'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="card">
            <h2>System Info</h2>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Frontend</span>
                <span className="info-value">Vite + React</span>
              </div>
              <div className="info-item">
                <span className="info-label">Backend</span>
                <span className="info-value">Express.js</span>
              </div>
              <div className="info-item">
                <span className="info-label">Deployment</span>
                <span className="info-value">Docker Compose</span>
              </div>
              <div className="info-item">
                <span className="info-label">Status</span>
                <span className="info-value status-active">✓ Running</span>
              </div>
              <div className="info-item">
                <span className="info-label">Authentication</span>
                <span className="info-value status-active">✓ Google OAuth</span>
              </div>
              <div className="info-item">
                <span className="info-label">Your Role</span>
                <span className={`info-value ${isAdmin() ? 'role-admin' : 'role-user'}`}>
                  {isAdmin() ? '👑 Admin' : '👤 User'}
                </span>
              </div>
            </div>
          </section>
        </main>
      )}

      <footer className="footer">
        <p>Built with Vite, Express, Docker & Google OAuth</p>
      </footer>
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
