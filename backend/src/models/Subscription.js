import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  stockId: {
    type: String,
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'expired', 'cancelled', 'rejected'],
    default: 'pending'
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date
  },
  monthlyFee: {
    type: Number,
    default: 10
  },
  paymentProof: {
    type: String, // URL to uploaded screenshot
    default: null
  },
  apiToken: {
    type: String,
    default: null
  },
  isActive: {
    type: Boolean,
    default: false
  },
  // 30-day active period tracking
  lastActivatedAt: {
    type: Date,
    default: null
  },
  activeUntil: {
    type: Date,
    default: null
  },
  // Rejection tracking
  rejectionReason: {
    type: String,
    default: null
  },
  // Continuation tracking
  continuedFrom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription',
    default: null,
    index: true
  }
}, {
  timestamps: true
});

// Check if subscription is currently active (within 30 days of activation)
subscriptionSchema.methods.isActivePeriod = function() {
  if (!this.isActive || !this.activeUntil) {
    return false;
  }
  return new Date() <= this.activeUntil;
};

// Check if user is actively paying (paid within last 30 days)
subscriptionSchema.methods.isActivelyPaying = function() {
  if (!this.isActive || !this.activeUntil) {
    return false;
  }
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  return this.activeUntil >= thirtyDaysAgo;
};

subscriptionSchema.index({ userId: 1, status: 1 });
subscriptionSchema.index({ stockId: 1 });

export default mongoose.model('Subscription', subscriptionSchema);
