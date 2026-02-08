import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  googleId: {
    type: String,
    unique: true,
    sparse: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  firstName: {
    type: String,
    trim: true
  },
  lastName: {
    type: String,
    trim: true
  },
  displayName: {
    type: String,
    trim: true
  },
  picture: {
    type: String
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  lastLogin: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
userSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Method to check if user is admin
userSchema.methods.isAdmin = function() {
  return this.role === 'admin';
};

// Static method to find or create user from Google profile
userSchema.statics.findOrCreateFromGoogle = async function(profile) {
  const User = this;

  try {
    // Check if user exists by Google ID
    let user = await User.findOne({ googleId: profile.id });

    if (user) {
      // Update last login
      user.lastLogin = new Date();
      await user.save();
      return { user, created: false };
    }

    // Check if user exists by email
    user = await User.findOne({ email: profile.emails[0].value });

    if (user) {
      // Link Google account to existing user
      user.googleId = profile.id;
      user.emailVerified = true;
      if (!user.picture) {
        user.picture = profile.photos[0]?.value;
      }
      user.lastLogin = new Date();
      await user.save();
      return { user, created: false };
    }

    // Create new user
    const newUser = new User({
      googleId: profile.id,
      email: profile.emails[0].value,
      firstName: profile.name.givenName,
      lastName: profile.name.familyName,
      displayName: profile.displayName,
      picture: profile.photos[0]?.value,
      emailVerified: profile.emails[0]?.verified || false,
      lastLogin: new Date(),
      role: 'user' // Default role for new users
    });

    await newUser.save();
    return { user: newUser, created: true };

  } catch (error) {
    throw new Error(`Failed to find or create user: ${error.message}`);
  }
};

export default mongoose.model('User', userSchema);
