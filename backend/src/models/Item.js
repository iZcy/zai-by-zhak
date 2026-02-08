import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters']
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'archived'],
      default: 'active'
    },
    metadata: {
      type: Map,
      of: String,
      default: new Map()
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Index for better query performance
itemSchema.index({ name: 1, status: 1 });
itemSchema.index({ createdAt: -1 });

// Virtual for formatted date
itemSchema.virtual('formattedDate').get(function() {
  return this.createdAt.toLocaleDateString();
});

// Static method to get active items
itemSchema.statics.getActiveItems = function() {
  return this.find({ status: 'active' });
};

// Instance method to archive
itemSchema.methods.archive = function() {
  this.status = 'archived';
  return this.save();
};

const Item = mongoose.model('Item', itemSchema);

export default Item;
