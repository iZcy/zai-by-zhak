import 'dotenv/config';
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import rateLimit from 'express-rate-limit'
import cookieParser from 'cookie-parser'
import apiRoutes from './routes/api.js'
import authRoutes from './routes/auth.js'
import subscriptionRoutes from './routes/subscription.js'
import { errorHandler } from './middleware/errorHandler.js'
import { connectDB, disconnectDB } from './config/database.js'
import { createServer } from 'http'

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
  origin: ['http://localhost:3000', 'http://frontend:3000', 'http://127.0.0.1:3000', 'http://0.0.0.0:3000', 'http://localhost:3500', 'http://127.0.0.1:3500', 'http://0.0.0.0:3500'],
  credentials: true
}))

// Rate limiting (disabled for development)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 10000, // Higher limit for development
  message: 'Too many requests from this IP, please try again later.'
})
if (process.env.NODE_ENV === 'production') {
  app.use('/api/', limiter)
}

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
app.use('/api/subscription', subscriptionRoutes)
app.use('/api', apiRoutes)

// Auth routes (must be before 404)
app.use('/api/auth', authRoutes)

// Debug: Log registered routes
console.log('Subscription routes stack:', subscriptionRoutes.stack.map(layer => ({ path: layer.path, method: Object.keys(layer.methods || {}).join(',') || layer.route?.methods ? Object.keys(layer.route.methods).join(',') : 'middleware' })))

// Serve static uploads
app.use('/uploads', express.static('uploads'));

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

      // Wait for MongoDB to be ready before starting server
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Create dummy accounts for development
      const User = (await import('./models/User.js')).default;

      // Check and create dummy admin
      const dummyAdmin = await User.findOne({ email: 'admin@zai.dev' });
      if (!dummyAdmin) {
        await User.create({
          email: 'admin@zai.dev',
          displayName: 'Dev Admin',
          role: 'admin',
          referralCode: 'ADMIN-DEV',
          emailVerified: true,
          lastLogin: new Date()
        });
        console.log('✅ Created dummy admin account: admin@zai.dev');
      }

      // Check and create 10 dummy users
      const dummyUsersCount = await User.countDocuments({ email: { $regex: '^user[0-9]+@zai\\.dev$' } });
      if (dummyUsersCount < 10) {
        const generateReferralCode = (num) => `USER${String(num).padStart(3, '0')}-DEV`;
        for (let i = 1; i <= 10; i++) {
          const email = `user${i}@zai.dev`;
          const existing = await User.findOne({ email });
          if (!existing) {
            await User.create({
              email,
              displayName: `Dev User ${i}`,
              role: 'user',
              referralCode: generateReferralCode(i),
              emailVerified: true,
              lastLogin: new Date()
            });
            console.log(`✅ Created dummy user account: ${email}`);
          }
        }
      }
    } else {
      console.warn('⚠️  No MONGODB_URI provided, running without database');
    }

    // Start Express server
    const server = createServer(app)
    server.listen(PORT, '0.0.0.0', () => {
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
await startServer();

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
