/* Event model — Part 3 RESTful API (Mongoose ODM)
 * Collection: events
 * 課程風格參考：Lab06 mongoose + Lecture 6（new mongoose.Schema / mongoose.model / models 資料夾匯出）
 */
const mongoose = require('mongoose');

// 分類與狀態的 single source of truth（routes/api.js 會 require 呢個 model 再用）
const CATEGORIES = ['Workshop', 'Seminar', 'Sports', 'Social', 'Other'];
const STATUSES = ['open', 'closed', 'cancelled'];
const EVENT_CODE_PATTERN = /^[A-Z0-9-]{3,20}$/;

const eventSchema = new mongoose.Schema({
  eventCode: {
    type: String,
    required: [true, 'eventCode is required'],
    unique: true,
    trim: true,
    uppercase: true,
    match: [EVENT_CODE_PATTERN, 'eventCode must be 3-20 letters, digits or hyphens']
  },
  title: {
    type: String,
    required: [true, 'title is required'],
    trim: true,
    maxlength: [120, 'title must be at most 120 characters']
  },
  description: {
    type: String,
    default: '',
    trim: true,
    maxlength: [2000, 'description must be at most 2000 characters']
  },
  category: {
    type: String,
    required: [true, 'category is required'],
    enum: { values: CATEGORIES, message: 'category must be one of: ' + CATEGORIES.join(', ') }
  },
  venue: {
    type: String,
    required: [true, 'venue is required'],
    trim: true,
    maxlength: [120, 'venue must be at most 120 characters']
  },
  startAt: {
    type: Date,
    required: [true, 'startAt is required'],
    validate: {
      validator: function (value) {
        if (!value || !this.endAt) return true;
        return value.getTime() < this.endAt.getTime();
      },
      message: 'startAt must be earlier than endAt'
    }
  },
  endAt: {
    type: Date,
    validate: {
      validator: function (value) {
        if (!value || !this.startAt) return true;
        return value.getTime() > this.startAt.getTime();
      },
      message: 'endAt must be later than startAt'
    }
  },
  capacity: {
    type: Number,
    required: [true, 'capacity is required'],
    min: [1, 'capacity must be a positive integer'],
    validate: { validator: Number.isInteger, message: 'capacity must be a positive integer' }
  },
  status: {
    type: String,
    enum: { values: STATUSES, message: 'status must be one of: ' + STATUSES.join(', ') },
    default: 'open'
  },
  organizer: {
    type: String,
    default: '',
    trim: true,
    maxlength: [100, 'organizer must be at most 100 characters']
  }
}, { timestamps: true, versionKey: false });

// Indexes for common queries (list 預設按 startAt 排；filter 用 status / category)
eventSchema.index({ startAt: 1 });
eventSchema.index({ status: 1, startAt: 1 });
eventSchema.index({ category: 1, startAt: 1 });

const Event = mongoose.model('Event', eventSchema);

module.exports = Event;
module.exports.CATEGORIES = CATEGORIES;
module.exports.STATUSES = STATUSES;
module.exports.EVENT_CODE_PATTERN = EVENT_CODE_PATTERN;
