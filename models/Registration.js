const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema({
  eventCode: {
    type: String,
    required: true,
    uppercase: true,
    trim: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  userName: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['Confirmed', 'Cancelled'],
    default: 'Confirmed'
  },
  registeredAt: {
    type: Date,
    default: Date.now
  }
});

// 同一個 user 對同一個 event 只可以有一條記錄（避免 race condition）
registrationSchema.index({ eventCode: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('Registration', registrationSchema);
