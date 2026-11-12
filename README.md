# EventHub — Integrated Group Project Build

Integrated demo build for COMP 3810SEF group project: Event Registration System.

This folder combines:

- Part 1 authentication (login / register / logout, session based)
- Part 2 Event CRUD web pages and Registration pages (from teammate UI repo, with fixes)
- Part 3 RESTful CRUD API (`/api/events`)

## Stack

Express.js 4, MongoDB (Mongoose 8), EJS, express-session, bcryptjs, dotenv.

## Quick start

1. `npm install`
2. Create `.env` (do not commit it):

   ```env
   MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>/<dbname>?retryWrites=true&w=majority
   SESSION_SECRET=<long random string>
   ```

3. `npm start` → http://localhost:3000
4. Register an account at `/auth/register`, then log in.

## Web pages

| Method | URI | Purpose |
|---|---|---|
| GET | /events | List events + search by keyword / status / category |
| GET | /events/new | Create event form |
| POST | /events | Create event |
| GET | /events/:eventCode | Event details + register / cancel button |
| GET | /events/:eventCode/edit | Edit event form |
| POST | /events/:eventCode/update | Update event |
| POST | /events/:eventCode/delete | Delete event (and its registrations) |
| GET | /registrations | My registration records |
| POST | /registrations | Register for an event |
| POST | /registrations/:id/cancel | Cancel my registration |

## REST API

Base URL: `http://localhost:3000/api` (no authentication required, as specified).

| Method | URI | Purpose |
|---|---|---|
| GET | /api/events | List events (optional ?limit= &skip=) |
| GET | /api/events/status/:status | Filter by status |
| GET | /api/events/category/:category | Filter by category |
| GET | /api/events/title/:keyword | Search title |
| GET | /api/events/:eventCode | Get one event |
| POST | /api/events | Create (eventCode in body) |
| POST | /api/events/:eventCode | Create (eventCode in path) |
| PUT | /api/events/:eventCode | Update |
| DELETE | /api/events/:eventCode | Delete |

Testing example:

```bash
curl -i http://localhost:3000/api/events
```

## Notes

- This is a local integrated build, not yet pushed to the shared GitHub repository.
- The event pages, registration flow, search, IDOR fix, mass-assignment fix and dashboard links were integrated from the teammate UI work.
