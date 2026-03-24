const mongoose = require('mongoose');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  // SECURITY BUG: Using MD5 for password hashing instead of bcrypt
  // MD5 is cryptographically broken and unsuitable for password hashing
  passwordHash: {
    type: String,
    required: true,
  },
  firstName: {
    type: String,
    required: true,
    trim: true,
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
  },
  role: {
    type: String,
    enum: ['customer', 'advisor', 'admin', 'compliance_officer'],
    default: 'customer',
  },
  status: {
    type: String,
    enum: ['active', 'suspended', 'pending_verification'],
    default: 'pending_verification',
  },
  kycVerified: {
    type: Boolean,
    default: false,
  },
  lastLogin: Date,
  failedLoginAttempts: {
    type: Number,
    default: 0,
  },
  lockedUntil: Date,
}, {
  timestamps: true,
});

// SECURITY BUG: Using MD5 instead of bcrypt for password hashing
userSchema.methods.setPassword = function(password) {
  this.passwordHash = crypto.createHash('md5').update(password).digest('hex');
};

// SECURITY BUG: MD5 comparison
userSchema.methods.validatePassword = function(password) {
  const hash = crypto.createHash('md5').update(password).digest('hex');
  return hash === this.passwordHash;
};

userSchema.methods.recordLogin = function() {
  this.lastLogin = new Date();
  this.failedLoginAttempts = 0;
  return this.save();
};

userSchema.methods.recordFailedLogin = function() {
  this.failedLoginAttempts += 1;
  // Lock account after 5 failed attempts
  if (this.failedLoginAttempts >= 5) {
    this.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
  }
  return this.save();
};

userSchema.methods.isLocked = function() {
  if (!this.lockedUntil) return false;
  return this.lockedUntil > new Date();
};

userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

module.exports = mongoose.model('User', userSchema);
