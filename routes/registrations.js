const express = require('express');
const router = express.Router();
const Registration = require('../models/Registration');
const Event = require('../models/Event');

// GET /registrations — 只顯示自己嘅報名
router.get('/', async (req, res, next) => {
  try {
    const registrations = await Registration
      .find({ userId: req.session.userId })
      .sort({ registeredAt: -1 });

    const eventCodes = registrations.map((reg) => reg.eventCode);
    const events = await Event.find({ eventCode: { $in: eventCodes } });
    const eventMap = {};
    events.forEach((event) => { eventMap[event.eventCode] = event; });

    res.render('registrations/index', {
      registrations: registrations,
      eventMap: eventMap,
      name: req.session.userName
    });
  } catch (err) {
    next(err);
  }
});

// POST /registrations — 建立報名
router.post('/', async (req, res, next) => {
  try {
    const eventCode = String(req.body.eventCode || '').trim().toUpperCase();
    const userId = req.session.userId;

    if (!eventCode) return res.status(400).send('eventCode is required');

    const event = await Event.findOne({ eventCode: eventCode });
    if (!event) return res.status(404).send('Event not found');
    if (event.status !== 'open') return res.status(400).send('This event is not open for registration');

    const confirmedCount = await Registration.countDocuments({ eventCode: eventCode, status: 'Confirmed' });
    if (confirmedCount >= event.capacity) return res.status(400).send('This event is full');

    const existing = await Registration.findOne({ eventCode: eventCode, userId: userId });
    if (existing) {
      if (existing.status === 'Confirmed') {
        return res.status(400).send('You have already registered for this event.');
      }
      // 之前取消過 → 重新確認
      existing.status = 'Confirmed';
      existing.registeredAt = new Date();
      await existing.save();
      return res.redirect('/registrations');
    }

    await Registration.create({
      eventCode: eventCode,
      userId: userId,
      userName: req.session.userName,
      status: 'Confirmed'
    });

    res.redirect('/registrations');
  } catch (err) {
    console.error(err);
    res.status(400).send('Failed to register, please try again.');
  }
});

// POST /registrations/:id/cancel — 只可以取消自己嘅報名（IDOR 修正）
router.post('/:id/cancel', async (req, res, next) => {
  try {
    const updated = await Registration.findOneAndUpdate(
      { _id: req.params.id, userId: req.session.userId },
      { status: 'Cancelled' },
      { new: true }
    );

    if (!updated) return res.status(404).send('Registration not found');
    res.redirect('/registrations');
  } catch (err) {
    next(err);
  }
});

module.exports = router;
