import mongoose from 'mongoose';

const referralSchema = new mongoose.Schema({
  referrerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  referredUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  referralCode: {
    type: String,
    required: true
  },
  profitPerMonth: {
    type: Number,
    default: 2.5
  },
  // Track monthly earnings
  monthlyEarnings: [{
    month: {
      type: String, // Format: "2024-02"
      required: true
    },
    activeReferrals: {
      type: Number,
      default: 0
    },
    earnings: {
      type: Number,
      default: 0
    }
  }],
  // When the referred user became actively paying
  firstActiveDate: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Compound index to prevent duplicate referrals
referralSchema.index({ referrerId: 1, referredUserId: 1 }, { unique: true });

export default mongoose.model('Referral', referralSchema);
