const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const Registration = require('../models/Registration');

const REGEX_SPECIAL = String.fromCharCode(92) + '^$.*+?()[]{}|';
const escapeRegex = (value) => {
  let escaped = '';
  for (const ch of value) {
    escaped += REGEX_SPECIAL.includes(ch) ? String.fromCharCode(92) + ch : ch;
  }
  return escaped;
};

const EVENT_FIELDS = ['eventCode', 'title', 'description', 'category', 'venue', 'startAt', 'endAt', 'capacity', 'status', 'organizer'];
const UPDATE_FIELDS = EVENT_FIELDS.filter((field) => field !== 'eventCode');

const pickFields = (body, fields) => {
  const picked = {};
  for (const field of fields) {
    if (Object.prototype.hasOwnProperty.call(body, field)) picked[field] = body[field];
  }
  return picked;
};

// GET /events — list + search（requirement: search by different query conditions）
router.get('/', async (req, res, next) => {
  try {
    const filter = {};
    const keyword = String(req.query.keyword || '').trim();
    const status = String(req.query.status || '').trim().toLowerCase();
    const category = String(req.query.category || '').trim();

    if (keyword) filter.title = new RegExp(escapeRegex(keyword), 'i');
    if (status) filter.status = status;
    if (category) filter.category = category;

    const events = await Event.find(filter).sort({ startAt: 1 });

    res.render('events/index', {
      events: events,
      name: req.session.userName,
      filters: { keyword: keyword, status: status, category: category },
      categories: Event.CATEGORIES,
      statuses: Event.STATUSES
    });
  } catch (err) {
    next(err);
  }
});

// GET /events/new
router.get('/new', (req, res) => {
  res.render('events/new', {
    name: req.session.userName,
    categories: Event.CATEGORIES,
    statuses: Event.STATUSES,
    error: null
  });
});

// POST /events — create（whitelist，避免 mass assignment）
router.post('/', async (req, res, next) => {
  try {
    const payload = pickFields(req.body, EVENT_FIELDS);
    await Event.create(payload);
    res.redirect('/events');
  } catch (err) {
    console.error(err);
    res.status(400).render('events/new', {
      name: req.session.userName,
      categories: Event.CATEGORIES,
      statuses: Event.STATUSES,
      error: err.message
    });
  }
});

// GET /events/:eventCode — details + 自己嘅報名狀態
router.get('/:eventCode', async (req, res, next) => {
  try {
    const eventCode = req.params.eventCode.toUpperCase();
    const event = await Event.findOne({ eventCode: eventCode });
    if (!event) return res.status(404).send('Cannot find the event');

    const registration = await Registration.findOne({
      eventCode: eventCode,
      userId: req.session.userId,
      status: 'Confirmed'
    });

    res.render('events/show', {
      event: event,
      registration: registration,
      name: req.session.userName
    });
  } catch (err) {
    next(err);
  }
});

// GET /events/:eventCode/edit
router.get('/:eventCode/edit', async (req, res, next) => {
  try {
    const event = await Event.findOne({ eventCode: req.params.eventCode.toUpperCase() });
    if (!event) return res.status(404).send('Cannot find the event');

    res.render('events/edit', {
      event: event,
      name: req.session.userName,
      categories: Event.CATEGORIES,
      statuses: Event.STATUSES,
      error: null
    });
  } catch (err) {
    next(err);
  }
});

// POST /events/:eventCode/update — whitelist update（唔可以改 eventCode）
router.post('/:eventCode/update', async (req, res, next) => {
  try {
    const eventCode = req.params.eventCode.toUpperCase();
    const update = pickFields(req.body, UPDATE_FIELDS);

    const updatedEvent = await Event.findOneAndUpdate(
      { eventCode: eventCode },
      update,
      { new: true, runValidators: true }
    );

    if (!updatedEvent) return res.status(404).send('Cannot find the event');
    res.redirect('/events/' + updatedEvent.eventCode);
  } catch (err) {
    console.error(err);
    const event = await Event.findOne({ eventCode: req.params.eventCode.toUpperCase() });
    if (!event) return res.status(404).send('Cannot find the event');
    res.status(400).render('events/edit', {
      event: event,
      name: req.session.userName,
      categories: Event.CATEGORIES,
      statuses: Event.STATUSES,
      error: err.message
    });
  }
});

// POST /events/:eventCode/delete — 連同報名記錄一齊清（避免 orphan）
router.post('/:eventCode/delete', async (req, res, next) => {
  try {
    const eventCode = req.params.eventCode.toUpperCase();
    await Registration.deleteMany({ eventCode: eventCode });
    await Event.findOneAndDelete({ eventCode: eventCode });
    res.redirect('/events');
  } catch (err) {
    next(err);
  }
});

module.exports = router;
