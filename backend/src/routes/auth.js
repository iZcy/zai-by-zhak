import express from 'express';
import passport from '../auth/google.js';
import { generateToken, authenticate, requireAdmin, optionalAuth } from '../auth/jwt.js';
import User from '../models/User.js';

const router = express.Router();

// Get Google OAuth URL
router.get('/google/url', (req, res) => {
  const baseURL = process.env.FRONTEND_URL || req.headers.origin || 'https://zai.izcy.tech';
  const state = JSON.stringify({
    redirect: req.query.redirect || '/',
    timestamp: Date.now()
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${encodeURIComponent(process.env.GOOGLE_CLIENT_ID)}&` +
    `redirect_uri=${encodeURIComponent(process.env.GOOGLE_CALLBACK_URL || `${baseURL}/api/auth/google/callback`)}&` +
    `response_type=code&` +
    `scope=${encodeURIComponent('profile email')}&` +
    `state=${encodeURIComponent(state)}`;

  res.json({
    success: true,
    authUrl
  });
});

// Google OAuth callback
router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login?error=oauth_failed' }),
  async (req, res) => {
    try {
      const { user, token, created } = req.authInfo;

      // Set HTTP-only cookie with token
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      // Redirect to frontend
      const frontendURL = process.env.FRONTEND_URL || 'https://zai.izcy.tech';
      res.redirect(`${frontendURL}/auth/callback?token=${token}&created=${created}`);
    } catch (error) {
      res.redirect(`${process.env.FRONTEND_URL || 'https://zai.izcy.tech'}/login?error=callback_failed`);
    }
  }
);

// Get current user
router.get('/me', optionalAuth, async (req, res) => {
  if (req.user) {
    res.json({
      success: true,
      user: {
        id: req.user._id,
        email: req.user.email,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        displayName: req.user.displayName,
        picture: req.user.picture,
        role: req.user.role,
        emailVerified: req.user.emailVerified,
        createdAt: req.user.createdAt,
        lastLogin: req.user.lastLogin
      }
    });
  } else {
    res.json({
      success: true,
      user: null
    });
  }
});

// Logout
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

// Admin-only endpoint example
router.get('/admin/users', authenticate, requireAdmin, async (req, res) => {
  try {
    const users = await User.find().select('-googleId').sort({ createdAt: -1 });

    res.json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Update user role (admin only)
router.put('/users/:id/role', authenticate, requireAdmin, async (req, res) => {
  try {
    const { role } = req.body;

    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be "user" or "admin"'
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        id: user._id,
        email: user.email,
        role: user.role
      },
      message: `User role updated to ${role}`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get user profile
router.get('/profile', authenticate, async (req, res) => {
  try {
    res.json({
      success: true,
      user: {
        id: req.user._id,
        email: req.user.email,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        displayName: req.user.displayName,
        picture: req.user.picture,
        role: req.user.role,
        emailVerified: req.user.emailVerified,
        createdAt: req.user.createdAt,
        lastLogin: req.user.lastLogin,
        isAdmin: req.user.isAdmin()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export default router;
