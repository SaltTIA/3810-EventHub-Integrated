const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { requireLogin } = require('../middleware/auth');
const router = express.Router();

router.get('/login', (req, res) => {
  res.render('login', { error: null });
});
router.get('/register', (req, res) => {
  res.render('register', { error: null });
});

router.post('/register', async (req, res) => {
  const { name, email, password, confirmPassword } = req.body;
  if (!name?.trim() || !email?.trim() || !password || password !== confirmPassword || password.length < 8) {
    return res.status(400).render('register', { error: 'Please complete all fields. Passwords must match and be at least 8 characters.' });
  }
  try {
    const normalizedEmail = email.trim().toLowerCase();
    if (await User.exists({ email: normalizedEmail })) {
      return res.status(400).render('register', { error: 'Email already registered.' });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    await User.create({ name: name.trim(), email: normalizedEmail, passwordHash });
    res.redirect('/auth/login');
  } catch (err) {
    console.error('Register error:', err.message);
    res.status(500).render('register', { error: 'Registration failed. Please try again.' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email: (email || '').trim().toLowerCase() });
    if (!user || !(await bcrypt.compare(password || '', user.passwordHash))) {
      return res.status(401).render('login', { error: 'Invalid email or password.' });
    }
    req.session.regenerate(err => {
      if (err) return res.status(500).render('login', { error: 'Session error.' });
      req.session.userId = user.id;
      req.session.userName = user.name;
      req.session.role = user.role;
      res.redirect('/dashboard');
    });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).render('login', { error: 'Login failed. Please try again.' });
  }
});

router.post('/logout', requireLogin, (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).send('Could not log out.');
    res.clearCookie('connect.sid');
    res.redirect('/auth/login');
  });
});
module.exports = router;
