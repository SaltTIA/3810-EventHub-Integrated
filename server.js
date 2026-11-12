require('dotenv').config();
const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const path = require('path');
const authRoutes = require('./routes/auth');
const { requireLogin } = require('./middleware/auth');

const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// RESTful CRUD API (Part 3) — self-contained body parsers, no authentication
app.use('/api', require('./routes/api'));

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

if (!process.env.SESSION_SECRET) {
  console.error('Missing SESSION_SECRET in .env');
  process.exit(1);
}
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', maxAge: 1000 * 60 * 60 }
}));

app.use('/auth', authRoutes);

// Part 2 — Event CRUD pages (require login)
app.use('/events', requireLogin, require('./routes/events'));

// Part 2 — Registration pages (require login)
app.use('/registrations', requireLogin, require('./routes/registrations'));

app.get('/', (req, res) => res.redirect(req.session.userId ? '/dashboard' : '/auth/login'));
app.get('/dashboard', requireLogin, (req, res) => {
  res.render('dashboard', { name: req.session.userName });
});

const port = Number(process.env.PORT || 3000);
if (!process.env.MONGODB_URI) {
  console.error('Missing MONGODB_URI in .env');
  process.exit(1);
}
mongoose.connect(process.env.MONGODB_URI)
  .then(() => app.listen(port, () => console.log('Server: http://localhost:' + port)))
  .catch((err) => {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  });
