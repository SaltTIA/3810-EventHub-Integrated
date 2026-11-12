/* Part 3 — RESTful CRUD API for events
 * Base path: /api  (mounted in server.js, no authentication required by the specification)
 *
 * 課程風格（Lecture 8 / Lab08 / lecturer restful repo）：
 *   - resource = 複數名詞；filter 用 path parameters；response 用 res.status(...).type('json').json(...)
 *   - 每個 route 上面寫 // curl 測試命令
 *   - request log 方便 demo 時睇 flow
 */
const express = require('express');
const Event = require('../models/Event');

const router = express.Router();

const CATEGORIES = Event.CATEGORIES;
const STATUSES = Event.STATUSES;
const EVENT_CODE_PATTERN = Event.EVENT_CODE_PATTERN;
const ALLOWED_FIELDS = ['title', 'description', 'category', 'venue', 'startAt', 'endAt', 'capacity', 'status', 'organizer'];

// API 自己 parse body（router 掛喺 global parser 之前，malformed JSON 都可以回 JSON 400）
router.use(express.json());
router.use(express.urlencoded({ extended: false }));

// 課程風格：log 每個 request（demo 時 terminal 見到 flow）
router.use((req, res, next) => {
  console.log('API: ' + req.method + ' ' + req.originalUrl);
  next();
});

// ---------- helpers ----------

const sendJson = (res, status, payload) => res.status(status).type('json').json(payload);

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const normalizeEventCode = (value) => String(value || '').trim().toUpperCase();

const isValidEventCode = (value) => EVENT_CODE_PATTERN.test(value);

// 避免 user 輸入嘅 regex 特殊字元影響搜尋（唔用 regex literal，避免 escaping 混亂）
const REGEX_SPECIAL = String.fromCharCode(92) + '^$.*+?()[]{}|';
const escapeRegex = (value) => {
  let escaped = '';
  for (const ch of value) {
    escaped += REGEX_SPECIAL.includes(ch) ? String.fromCharCode(92) + ch : ch;
  }
  return escaped;
};

const toCanonicalCategory = (value) => {
  if (typeof value !== 'string') return null;
  const cleaned = value.trim().toLowerCase();
  return CATEGORIES.find((category) => category.toLowerCase() === cleaned) || null;
};

const parseDate = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const pickFields = (body) => {
  const picked = {};
  for (const field of ALLOWED_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(body, field)) picked[field] = body[field];
  }
  return picked;
};

// Validate whitelisted event fields. partial = true 時只檢查有提供嘅欄位（PUT 用）。
const validateInput = (body, options) => {
  const partial = options && options.partial === true;
  const has = (field) => Object.prototype.hasOwnProperty.call(body, field);
  const errors = [];
  const data = {};

  if (!partial || has('title')) {
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    if (!title) errors.push('title is required');
    else if (title.length > 120) errors.push('title must be at most 120 characters');
    else data.title = title;
  }

  if (has('description')) {
    if (typeof body.description !== 'string') errors.push('description must be a string');
    else if (body.description.length > 2000) errors.push('description must be at most 2000 characters');
    else data.description = body.description.trim();
  }

  if (!partial || has('category')) {
    const category = toCanonicalCategory(body.category);
    if (!category) errors.push('category must be one of: ' + CATEGORIES.join(', '));
    else data.category = category;
  }

  if (!partial || has('venue')) {
    const venue = typeof body.venue === 'string' ? body.venue.trim() : '';
    if (!venue) errors.push('venue is required');
    else if (venue.length > 120) errors.push('venue must be at most 120 characters');
    else data.venue = venue;
  }

  if (!partial || has('startAt')) {
    const startAt = parseDate(body.startAt);
    if (!startAt) errors.push('startAt must be a valid date');
    else data.startAt = startAt;
  }

  if (has('endAt')) {
    if (body.endAt === null || body.endAt === '') {
      data.endAt = null;
    } else {
      const endAt = parseDate(body.endAt);
      if (!endAt) errors.push('endAt must be a valid date');
      else data.endAt = endAt;
    }
  }

  if (!partial || has('capacity')) {
    const capacity = Number(body.capacity);
    if (!Number.isInteger(capacity) || capacity < 1) errors.push('capacity must be a positive integer');
    else data.capacity = capacity;
  }

  if (has('status')) {
    const status = String(body.status || '').trim().toLowerCase();
    if (!STATUSES.includes(status)) errors.push('status must be one of: ' + STATUSES.join(', '));
    else data.status = status;
  }

  if (has('organizer')) {
    if (typeof body.organizer !== 'string') errors.push('organizer must be a string');
    else if (body.organizer.length > 100) errors.push('organizer must be at most 100 characters');
    else data.organizer = body.organizer.trim();
  }

  return { errors: errors, data: data };
};

const parseListOptions = (query) => {
  const errors = [];
  let limit = null;
  let skip = 0;

  if (query.limit !== undefined) {
    limit = Number(query.limit);
    if (!Number.isInteger(limit) || limit < 1 || limit > 50) errors.push('limit must be an integer between 1 and 50');
  }
  if (query.skip !== undefined) {
    skip = Number(query.skip);
    if (!Number.isInteger(skip) || skip < 0) errors.push('skip must be a non-negative integer');
  }

  return { errors: errors, limit: limit, skip: skip };
};

const respondWithEvents = async (res, filter) => {
  const total = await Event.countDocuments(filter);
  const events = await Event.find(filter).sort({ startAt: 1 });
  res.set('X-Total-Count', String(total));
  return sendJson(res, 200, events);
};

const createEvent = async (req, res, eventCodeFromPath) => {
  const body = req.body || {};
  const eventCode = normalizeEventCode(eventCodeFromPath || body.eventCode);

  if (!isValidEventCode(eventCode)) {
    return sendJson(res, 400, { error: 'Validation failed', details: ['eventCode must be 3-20 letters, digits or hyphens'] });
  }

  if (eventCodeFromPath && body.eventCode && normalizeEventCode(body.eventCode) !== eventCode) {
    return sendJson(res, 400, { error: 'Validation failed', details: ['eventCode in the path and body must match'] });
  }

  const validation = validateInput(body, { partial: false });
  if (validation.errors.length > 0) {
    return sendJson(res, 400, { error: 'Validation failed', details: validation.errors });
  }

  if (await Event.exists({ eventCode: eventCode })) {
    return sendJson(res, 409, { error: 'eventCode ' + eventCode + ' already exists' });
  }

  const event = await Event.create(Object.assign({ eventCode: eventCode }, validation.data));
  res.set('Location', '/api/events/' + event.eventCode);
  return sendJson(res, 201, event);
};

// ---------- READ ----------

// curl -i -X GET localhost:3000/api/events
router.get('/events', wrap(async (req, res) => {
  const options = parseListOptions(req.query);
  if (options.errors.length > 0) {
    return sendJson(res, 400, { error: 'Invalid query parameter(s)', details: options.errors });
  }

  const total = await Event.countDocuments({});
  let query = Event.find({}).sort({ startAt: 1 }).skip(options.skip);
  if (options.limit !== null) query = query.limit(options.limit);
  const events = await query;

  res.set('X-Total-Count', String(total));
  return sendJson(res, 200, events);
}));

// curl -i -X GET localhost:3000/api/events/status/open
router.get('/events/status/:status', wrap(async (req, res) => {
  const status = String(req.params.status || '').trim().toLowerCase();
  if (!STATUSES.includes(status)) {
    return sendJson(res, 400, { error: 'Invalid status', details: ['status must be one of: ' + STATUSES.join(', ')] });
  }
  return respondWithEvents(res, { status: status });
}));

// curl -i -X GET localhost:3000/api/events/category/Workshop
router.get('/events/category/:category', wrap(async (req, res) => {
  const category = toCanonicalCategory(req.params.category);
  if (!category) {
    return sendJson(res, 400, { error: 'Invalid category', details: ['category must be one of: ' + CATEGORIES.join(', ')] });
  }
  return respondWithEvents(res, { category: category });
}));

// curl -i -X GET localhost:3000/api/events/title/workshop
router.get('/events/title/:keyword', wrap(async (req, res) => {
  const keyword = String(req.params.keyword || '').trim();
  if (!keyword) {
    return sendJson(res, 400, { error: 'Invalid keyword', details: ['keyword must not be empty'] });
  }
  const keywordRegex = new RegExp(escapeRegex(keyword), 'i');
  return respondWithEvents(res, { title: keywordRegex });
}));

// ---- Read one（要放喺 filter routes 之後）----
// curl -i -X GET localhost:3000/api/events/EVT-2026-001
router.get('/events/:eventCode', wrap(async (req, res) => {
  const eventCode = normalizeEventCode(req.params.eventCode);
  const event = await Event.findOne({ eventCode: eventCode });
  if (!event) {
    return sendJson(res, 404, { error: 'Event ' + eventCode + ' not found' });
  }
  return sendJson(res, 200, event);
}));

// ---------- CREATE（兩種寫法，共用 createEvent）----------

// curl -i -X POST -H "Content-Type: application/json" --data '{...}' localhost:3000/api/events
router.post('/events', wrap((req, res) => createEvent(req, res, null)));

// curl -i -X POST -H "Content-Type: application/json" --data '{...}' localhost:3000/api/events/EVT-2026-001
router.post('/events/:eventCode', wrap((req, res) => createEvent(req, res, req.params.eventCode)));

// ---------- UPDATE ----------

// curl -i -X PUT -H "Content-Type: application/json" --data '{"capacity":60}' localhost:3000/api/events/EVT-2026-001
router.put('/events/:eventCode', wrap(async (req, res) => {
  const eventCode = normalizeEventCode(req.params.eventCode);
  const body = req.body || {};

  if (body.eventCode && normalizeEventCode(body.eventCode) !== eventCode) {
    return sendJson(res, 400, { error: 'Validation failed', details: ['eventCode in the path and body must match'] });
  }

  const event = await Event.findOne({ eventCode: eventCode });
  if (!event) {
    return sendJson(res, 404, { error: 'Event ' + eventCode + ' not found' });
  }

  const validation = validateInput(pickFields(body), { partial: true });
  if (validation.errors.length > 0) {
    return sendJson(res, 400, { error: 'Validation failed', details: validation.errors });
  }
  if (Object.keys(validation.data).length === 0) {
    return sendJson(res, 400, { error: 'Validation failed', details: ['No updatable fields provided'] });
  }

  Object.assign(event, validation.data);
  await event.save();
  return sendJson(res, 200, event);
}));

// ---------- DELETE ----------

// curl -i -X DELETE localhost:3000/api/events/EVT-2026-001
router.delete('/events/:eventCode', wrap(async (req, res) => {
  const eventCode = normalizeEventCode(req.params.eventCode);
  const event = await Event.findOneAndDelete({ eventCode: eventCode });
  if (!event) {
    return sendJson(res, 404, { error: 'Event ' + eventCode + ' not found' });
  }
  return sendJson(res, 200, { deleted: true, eventCode: event.eventCode, title: event.title });
}));

// ---------- API 404（JSON，唔好跌落 EJS）----------
router.use((req, res) => sendJson(res, 404, { error: 'API endpoint not found: ' + req.originalUrl }));

// ---------- 統一 error handler ----------
router.use((err, req, res, next) => {
  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors || {}).map((item) => item.message);
    return sendJson(res, 400, { error: 'Validation failed', details: details });
  }
  if (err.name === 'CastError') {
    return sendJson(res, 400, { error: 'Validation failed', details: [err.message] });
  }
  if (err.code === 11000) {
    return sendJson(res, 409, { error: 'Duplicate eventCode' });
  }
  if (err.type === 'entity.parse.failed') {
    return sendJson(res, 400, { error: 'Invalid JSON body' });
  }
  console.error('API error:', err);
  return sendJson(res, 500, { error: 'Internal server error' });
});

module.exports = router;
