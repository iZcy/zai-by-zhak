import express from 'express';
import axios from 'axios';
import { generateToken, authenticate, requireAdmin, optionalAuth } from '../auth/jwt.js';
import User from '../models/User.js';
import { GOOGLE_CONFIG } from '../auth/google.js';

const router = express.Router();

// ============================================
// DEVELOPMENT ENDPOINTS - Remove in production
// ============================================

// Get all dev users for testing
router.get('/dev/users', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ success: false, message: 'Not found' });
  }

  try {
    const devEmails = ['admin@zai.dev'];
    for (let i = 1; i <= 10; i++) {
      devEmails.push(`user${i}@zai.dev`);
    }

    const users = await User.find({
      email: { $in: devEmails }
    }).select('email displayName role referralCode');

    res.json({
      success: true,
      users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Dev login - switch between test users
router.post('/dev/login', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ success: false, message: 'Not found' });
  }

  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Generate JWT token
    const token = generateToken(user);

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        referralCode: user.referralCode
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// END DEVELOPMENT ENDPOINTS
// ============================================

// Get Google OAuth URL
router.get('/google/url', (req, res) => {
  const baseURL = process.env.FRONTEND_URL || req.headers.origin || 'https://zai.izcy.tech';
  const params = new URLSearchParams({
    client_id: GOOGLE_CONFIG.clientId,
    redirect_uri: `${baseURL}/api/auth/google/callback`,
    response_type: 'code',
    scope: 'profile email'
  });

  const authUrl = `${GOOGLE_CONFIG.authURL}?${params.toString()}`;

  res.json({
    success: true,
    authUrl
  });
});

// Google OAuth callback
router.get('/google/callback', async (req, res) => {
  try {
    const { code } = req.query;

    if (!code) {
      return res.redirect(`${process.env.FRONTEND_URL || 'https://zai.izcy.tech'}?error=no_code`);
    }

    // Exchange code for access token
    // Get the actual callback URL from the request
    const protocol = req.protocol;
    const host = req.get('host');
    const callbackUrl = `${protocol}://${host}/api/auth/google/callback`;

    console.log('🔍 OAuth Callback Debug:');
    console.log('protocol:', protocol);
    console.log('host:', host);
    console.log('callbackUrl:', callbackUrl);

    const tokenResponse = await axios.post(GOOGLE_CONFIG.tokenURL, {
      code,
      client_id: GOOGLE_CONFIG.clientId,
      client_secret: GOOGLE_CONFIG.clientSecret,
      redirect_uri: callbackUrl,
      grant_type: 'authorization_code'
    });

    const { access_token } = tokenResponse.data;

    // Get user info from Google
    const userResponse = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    const googleUser = userResponse.data;

    // Find or create user in database
    let user = await User.findOne({ googleId: googleUser.id });

    const isAdminUser = process.env.ADMIN_EMAILS?.split(',').includes(googleUser.email) ||
                        googleUser.email === 'yitzhaketmanalu@gmail.com';

    if (user) {
      // Update existing user
      user.displayName = googleUser.name;
      user.firstName = googleUser.given_name;
      user.lastName = googleUser.family_name;
      user.picture = googleUser.picture;
      user.emailVerified = googleUser.verified_email;
      user.lastLogin = new Date();
      await user.save();
    } else {
      // Create new user
      user = await User.create({
        googleId: googleUser.id,
        email: googleUser.email,
        displayName: googleUser.name,
        firstName: googleUser.given_name,
        lastName: googleUser.family_name,
        picture: googleUser.picture,
        emailVerified: googleUser.verified_email,
        role: isAdminUser ? 'admin' : 'user',
        lastLogin: new Date()
      });
    }

    // Generate JWT token
    const token = generateToken(user);

    // Set HTTP-only cookie with token
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    // Redirect to frontend with success
    const frontendURL = process.env.FRONTEND_URL || 'https://zai.izcy.tech';
    res.redirect(`${frontendURL}/?auth=success&token=${token}`);
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    res.redirect(`${process.env.FRONTEND_URL || 'https://zai.izcy.tech'}?error=oauth_failed`);
  }
});

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
        isAdmin: req.user.role === 'admin'
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
