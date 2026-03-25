const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

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

userSchema.methods.setPassword = async function(password) {
  const salt = await bcrypt.genSalt(10);
  this.passwordHash = await bcrypt.hash(password, salt);
};

userSchema.methods.validatePassword = async function(password) {
  return bcrypt.compare(password, this.passwordHash);
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
