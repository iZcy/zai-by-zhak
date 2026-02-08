import 'dotenv/config';
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import rateLimit from 'express-rate-limit'
import cookieParser from 'cookie-parser'
import apiRoutes from './routes/api.js'
import authRoutes from './routes/auth.js'
import { errorHandler } from './middleware/errorHandler.js'
import { connectDB, disconnectDB } from './config/database.js'

const app = express()
const PORT = process.env.PORT || 5000
const NODE_ENV = process.env.NODE_ENV || 'development'
const MONGODB_URI = process.env.MONGODB_URI

// Security middleware
app.use(helmet({
  contentSecurityPolicy: NODE_ENV === 'production' ? undefined : false,
  crossOriginEmbedderPolicy: false
}))

// CORS configuration
app.use(cors({
  origin: NODE_ENV === 'production'
    ? process.env.FRONTEND_URL
    : ['http://localhost:3000', 'http://frontend:3000'],
  credentials: true
}))

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
})
app.use('/api/', limiter)

// Body parsing middleware
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Cookie parser for JWT tokens
app.use(cookieParser())

// Compression middleware
app.use(compression())

// Health check endpoint
app.get('/health', async (req, res) => {
  const dbStatus = await checkDatabaseHealth();

  res.json({
    status: dbStatus.healthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: NODE_ENV,
    database: dbStatus
  })
})

const checkDatabaseHealth = async () => {
  try {
    const mongoose = await import('mongoose');
    const state = mongoose.default.connection.readyState;

    return {
      healthy: state === 1,
      status: state === 1 ? 'connected' : state === 2 ? 'connecting' : 'disconnected',
      name: mongoose.default.connection.name,
      host: mongoose.default.connection.host
    };
  } catch (error) {
    return {
      healthy: false,
      status: 'error',
      error: error.message
    };
  }
};

// API routes
app.use('/api', apiRoutes)

// Auth routes (must be before 404)
app.use('/api/auth', authRoutes)

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`
  })
})

// Error handling middleware (must be last)
app.use(errorHandler)

// Initialize server
const startServer = async () => {
  try {
    // Connect to MongoDB if URI is provided
    if (MONGODB_URI) {
      await connectDB();
    } else {
      console.warn('⚠️  No MONGODB_URI provided, running without database');
    }

    // Start Express server
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running in ${NODE_ENV} mode`)
      console.log(`📡 Listening on port ${PORT}`)
      console.log(`🏥 Health check: http://localhost:${PORT}/health`)
      console.log(`📡 API endpoint: http://localhost:${PORT}/api`)
      console.log(`💾 Database: ${MONGODB_URI ? 'Connected' : 'Not configured'}`)
    })
  } catch (error) {
    console.error('❌ Failed to start server:', error)
    process.exit(1)
  }
}

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  console.log(`\n${signal} received, shutting down gracefully...`)

  try {
    // Close database connection
    await disconnectDB();

    // Close HTTP server
    server.close(() => {
      console.log('✅ Server closed successfully')
      process.exit(0)
    })

    // Force shutdown after 10 seconds
    setTimeout(() => {
      console.error('❌ Forced shutdown after timeout')
      process.exit(1)
    }, 10000)
  } catch (error) {
    console.error('❌ Error during shutdown:', error)
    process.exit(1)
  }
}

// Start the server
const server = startServer();

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error)
  gracefulShutdown('uncaughtException')
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason)
  gracefulShutdown('unhandledRejection')
})

export default app
