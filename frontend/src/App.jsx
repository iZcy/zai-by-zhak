import { useState, useEffect } from 'react'
import './App.css'
import api from './services/api'

function App() {
  const [message, setMessage] = useState('')
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const response = await api.get('/')
      setMessage(response.data.message)
      setData(response.data.data || [])
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
      setData([...data, response.data])
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading...</div>
      </div>
    )
  }

  return (
    <div className="container">
      <header className="header">
        <h1>🚀 Fullstack Docker App</h1>
        <p className="subtitle">{message}</p>
      </header>

      {error && (
        <div className="error">
          Error: {error}
        </div>
      )}

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
                <div key={index} className="data-item">
                  <span className="item-name">{item.name}</span>
                  <span className="item-time">
                    {new Date(item.timestamp).toLocaleTimeString()}
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
          </div>
        </section>
      </main>

      <footer className="footer">
        <p>Built with Vite, Express, and Docker</p>
      </footer>
    </div>
  )
}

export default App
