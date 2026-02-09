import express from 'express';
import { authenticate, requireAdmin } from '../auth/jwt.js';
import Subscription from '../models/Subscription.js';
import Referral from '../models/Referral.js';
import User from '../models/User.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/payment-proofs');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'payment-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only image and PDF files are allowed'));
  }
});

// Generate unique referral code
function generateReferralCode() {
  return 'REF-' + Math.random().toString(36).substring(2, 10).toUpperCase();
}

// Get user's referral code
router.get('/referral/code', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user.referralCode) {
      user.referralCode = generateReferralCode();
      await user.save();
    }

    res.json({
      success: true,
      referralCode: user.referralCode
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Insert referral code (can only be done once per account)
router.post('/referral/insert', authenticate, async (req, res) => {
  try {
    const { referralCode } = req.body;
    const userId = req.user._id;

    // Check if user already used a referral code
    const user = await User.findById(userId);
    if (user.referralCodeUsed) {
      return res.status(400).json({
        success: false,
        message: 'You have already used a referral code'
      });
    }

    // Don't allow self-referral
    if (user.referralCode === referralCode) {
      return res.status(400).json({
        success: false,
        message: 'Cannot use your own referral code'
      });
    }

    // Find referrer
    const referrer = await User.findOne({ referralCode });
    if (!referrer) {
      return res.status(404).json({
        success: false,
        message: 'Invalid referral code'
      });
    }

    // Check if already referred
    const existingReferral = await Referral.findOne({ referredUserId: userId });
    if (existingReferral) {
      return res.status(400).json({
        success: false,
        message: 'You have already been referred'
      });
    }

    // Create referral record
    await Referral.create({
      referrerId: referrer._id,
      referredUserId: userId,
      referralCode: referralCode
    });

    // Update user record
    user.referredBy = referrer._id;
    user.referralCodeUsed = referralCode;
    await user.save();

    res.json({
      success: true,
      message: 'Referral code applied successfully',
      referrer: {
        displayName: referrer.displayName,
        email: referrer.email
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get referral stats
router.get('/referral/stats', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;

    // Get all referrals made by this user
    const referrals = await Referral.find({ referrerId: userId })
      .populate('referredUserId', 'email displayName')
      .sort({ createdAt: -1 });

    // Get active referrals (referred users who are actively paying)
    const activeReferrals = [];
    for (const referral of referrals) {
      const subscription = await Subscription.findOne({
        userId: referral.referredUserId._id,
        status: 'active'
      });

      if (subscription && subscription.isActivelyPaying()) {
        activeReferrals.push({
          user: referral.referredUserId,
          referredAt: referral.createdAt,
          firstActiveDate: referral.firstActiveDate
        });
      }
    }

    // Calculate earnings for current month
    const currentMonth = new Date().toISOString().slice(0, 7); // "2024-02"
    const currentMonthEarnings = activeReferrals.length * 2.5;

    // Get historical earnings
    const referralWithEarnings = await Referral.findOne({ referrerId: userId });
    const historicalEarnings = referralWithEarnings?.monthlyEarnings || [];

    res.json({
      success: true,
      stats: {
        totalReferrals: referrals.length,
        activeReferralsCount: activeReferrals.length,
        activeReferrals: activeReferrals,
        currentMonthEarnings: currentMonthEarnings,
        historicalEarnings: historicalEarnings
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get active referrals list
router.get('/referral/active', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;

    const referrals = await Referral.find({ referrerId: userId })
      .populate('referredUserId', 'email displayName')
      .sort({ createdAt: -1 });

    const activeReferrals = [];
    for (const referral of referrals) {
      const subscription = await Subscription.findOne({
        userId: referral.referredUserId._id,
        status: 'active'
      });

      if (subscription && subscription.isActivelyPaying()) {
        activeReferrals.push({
          user: referral.referredUserId,
          referredAt: referral.createdAt,
          activeSince: referral.firstActiveDate,
          profitThisMonth: 2.5
        });
      }
    }

    res.json({
      success: true,
      activeReferrals: activeReferrals,
      totalProfit: activeReferrals.length * 2.5
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Create subscription request (buy stock)
router.post('/request', authenticate, upload.single('paymentProof'), async (req, res) => {
  try {
    const userId = req.user._id;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Payment proof is required'
      });
    }

    // Auto-generate unique stock ID
    const generateStockId = () => {
      const timestamp = Date.now().toString(36).toUpperCase();
      const random = Math.random().toString(36).substring(2, 8).toUpperCase();
      return `STOCK-${timestamp}-${random}`;
    };

    let stockId;
    let attempts = 0;
    const maxAttempts = 10;

    // Generate unique stock ID
    do {
      stockId = generateStockId();
      const existing = await Subscription.findOne({ stockId });
      if (!existing) break;
      attempts++;
    } while (attempts < maxAttempts);

    if (attempts >= maxAttempts) {
      return res.status(500).json({
        success: false,
        message: 'Failed to generate unique stock ID'
      });
    }

    // Create subscription with pending status
    const subscription = await Subscription.create({
      userId,
      stockId,
      status: 'pending',
      paymentProof: `/uploads/payment-proofs/${req.file.filename}`,
      monthlyFee: 10
    });

    res.json({
      success: true,
      message: 'Subscription request created. Please wait for admin approval.',
      subscription: {
        id: subscription._id,
        stockId: subscription.stockId,
        status: subscription.status,
        paymentProof: subscription.paymentProof
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get user's subscriptions
router.get('/my', authenticate, async (req, res) => {
  try {
    const subscriptions = await Subscription.find({ userId: req.user._id })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      subscriptions: subscriptions.map(sub => ({
        id: sub._id,
        stockId: sub.stockId,
        status: sub.status,
        isActive: sub.isActive,
        activeUntil: sub.activeUntil,
        monthlyFee: sub.monthlyFee,
        hasApiToken: !!sub.apiToken,
        paymentProof: sub.paymentProof
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Admin: Get all pending subscriptions
router.get('/admin/subscriptions/pending', authenticate, requireAdmin, async (req, res) => {
  try {
    const subscriptions = await Subscription.find({ status: 'pending' })
      .populate('userId', 'email displayName')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      subscriptions: subscriptions.map(sub => ({
        id: sub._id,
        user: sub.userId,
        stockId: sub.stockId,
        paymentProof: sub.paymentProof,
        requestedAt: sub.createdAt
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Admin: Get all active subscriptions
router.get('/admin/subscriptions/active', authenticate, requireAdmin, async (req, res) => {
  try {
    const subscriptions = await Subscription.find({ status: 'active' })
      .populate('userId', 'email displayName')
      .sort({ activeUntil: -1 });

    res.json({
      success: true,
      subscriptions: subscriptions.map(sub => ({
        id: sub._id,
        user: sub.userId,
        stockId: sub.stockId,
        apiToken: sub.apiToken,
        activeUntil: sub.activeUntil,
        isActivelyPaying: sub.isActivelyPaying()
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Admin: Approve subscription and set API token
router.post('/admin/subscriptions/:subscriptionId/approve', authenticate, requireAdmin, async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const { apiToken } = req.body;

    if (!apiToken) {
      return res.status(400).json({
        success: false,
        message: 'API token is required'
      });
    }

    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    // Set active for 30 days
    const activeUntil = new Date();
    activeUntil.setDate(activeUntil.getDate() + 30);

    subscription.status = 'active';
    subscription.isActive = true;
    subscription.apiToken = apiToken;
    subscription.activeUntil = activeUntil;
    subscription.lastActivatedAt = new Date();
    await subscription.save();

    // Check if this is a referral and update firstActiveDate
    const referral = await Referral.findOne({ referredUserId: subscription.userId });
    if (referral && !referral.firstActiveDate) {
      referral.firstActiveDate = new Date();
      await referral.save();
    }

    res.json({
      success: true,
      message: 'Subscription approved and activated for 30 days',
      subscription: {
        stockId: subscription.stockId,
        activeUntil: subscription.activeUntil,
        apiToken: subscription.apiToken
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Admin: Reject subscription
router.post('/admin/subscriptions/:subscriptionId/reject', authenticate, requireAdmin, async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const { reason } = req.body;

    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    subscription.status = 'cancelled';
    subscription.isActive = false;
    await subscription.save();

    res.json({
      success: true,
      message: reason || 'Subscription rejected'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Admin: Toggle user role (admin ↔ user)
router.post('/admin/users/:userId/toggle-role', authenticate, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    // Don't allow toggling your own role
    if (userId === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot change your own role'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.role = user.role === 'admin' ? 'user' : 'admin';
    await user.save();

    res.json({
      success: true,
      message: `User role changed to ${user.role}`,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        displayName: user.displayName
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get dashboard summary
router.get('/dashboard', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;

    // Get user's subscription
    const subscription = await Subscription.findOne({
      userId: userId,
      status: 'active'
    });

    // Get referral stats
    const referrals = await Referral.find({ referrerId: userId });
    const activeReferrals = [];
    for (const referral of referrals) {
      const sub = await Subscription.findOne({
        userId: referral.referredUserId,
        status: 'active'
      });
      if (sub && sub.isActivelyPaying()) {
        activeReferrals.push(referral);
      }
    }

    const monthlyFee = activeReferrals.length * 2.5;
    const stockCount = await Subscription.countDocuments({ userId });

    res.json({
      success: true,
      dashboard: {
        hasActiveSubscription: !!subscription && subscription.isActivelyPaying(),
        activeUntil: subscription?.activeUntil || null,
        stockCount: stockCount,
        totalReferrals: referrals.length,
        activeReferrals: activeReferrals.length,
        monthlyProfit: monthlyFee,
        netCost: (stockCount * 10) - monthlyFee
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Serve uploaded files
router.get('/uploads/payment-proofs/:filename', authenticate, requireAdmin, (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, '../../uploads/payment-proofs', filename);

  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ success: false, message: 'File not found' });
  }
});

export default router;
