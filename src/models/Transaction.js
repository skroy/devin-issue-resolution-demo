const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  transactionId: {
    type: String,
    required: true,
    unique: true,
  },
  fromAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: true,
  },
  toAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
  },
  amount: {
    type: Number,
    required: true,
    min: 0.01,
  },
  currency: {
    type: String,
    default: 'USD',
  },
  type: {
    type: String,
    enum: ['deposit', 'withdrawal', 'transfer', 'payment', 'fee', 'refund'],
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'reversed', 'flagged'],
    default: 'pending',
  },
  description: {
    type: String,
    maxlength: 500,
  },
  metadata: {
    ip: String,
    userAgent: String,
    location: String,
    riskScore: Number,
    flagReason: String,
  },
  processedAt: Date,
  reversedAt: Date,
}, {
  timestamps: true,
});

// BUG: Index on createdAt is missing, making date-range queries slow
transactionSchema.index({ fromAccount: 1, status: 1 });

transactionSchema.methods.complete = function() {
  this.status = 'completed';
  this.processedAt = new Date();
  return this.save();
};

transactionSchema.methods.reverse = function(reason) {
  this.status = 'reversed';
  this.reversedAt = new Date();
  this.metadata.flagReason = reason;
  return this.save();
};

transactionSchema.statics.findByAccount = function(accountId) {
  return this.find({
    $or: [{ fromAccount: accountId }, { toAccount: accountId }]
  }).sort({ createdAt: -1 });
};

// TODO: Add aggregation pipeline for monthly summaries

module.exports = mongoose.model('Transaction', transactionSchema);
