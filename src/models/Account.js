const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema({
  accountNumber: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  accountType: {
    type: String,
    enum: ['checking', 'savings', 'investment', 'credit'],
    required: true,
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  balance: {
    type: Number,
    default: 0,
    min: 0,
  },
  currency: {
    type: String,
    default: 'USD',
    enum: ['USD', 'EUR', 'GBP', 'JPY'],
  },
  status: {
    type: String,
    enum: ['active', 'frozen', 'closed', 'pending_review'],
    default: 'active',
  },
  openedAt: {
    type: Date,
    default: Date.now,
  },
  closedAt: {
    type: Date,
    default: null,
  },
  metadata: {
    branch: String,
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'low',
    },
    lastAuditDate: Date,
  },
}, {
  timestamps: true,
});

accountSchema.methods.freeze = function() {
  this.status = 'frozen';
  return this.save();
};

accountSchema.methods.close = function() {
  this.status = 'closed';
  this.closedAt = new Date();
  return this.save();
};

// BUG: This virtual doesn't account for pending transactions
accountSchema.virtual('availableBalance').get(function() {
  return this.balance;
});

accountSchema.statics.findByOwner = function(ownerId) {
  return this.find({ owner: ownerId, status: { $ne: 'closed' } });
};

module.exports = mongoose.model('Account', accountSchema);
