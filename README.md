# TaskFlow

TaskFlow is a responsive to-do application for planning a day and keeping a clear view of weekly progress. The mobile UI follows the supplied Figma references with a compact date strip, progress bar, task checklist, blue add button, onboarding-inspired account screen, and a bottom-sheet task form.

## Features

- Dashboard summary cards for total, open, completed, and overdue tasks.
- Monday-to-Sunday week selector, weekly completion progress, and day-by-day task list.
- A dedicated **My week** sidebar report with weekly date ranges, task totals, progress bars, and task actions.
- Search across task titles and descriptions with a 300 ms debounce.
- Create, edit, complete/reopen, and confirm-before-delete task workflows.
- Priority and status selection, loading and error feedback, and responsive mobile navigation.
- Manual email/password signup and login, a user profile, session restore, and logout.
- Passwords are hashed before storage; every task API request is authenticated and tasks are scoped to their owner.
- REST API backed by MongoDB and Mongoose, request validation, and centralized error handling.
- UTC calendar-date storage to avoid shifting a selected date across time zones. Times use 24-hour `HH:mm` and are interpreted as UTC for overdue calculations.

## Technology

- Frontend: React 18, Vite, JavaScript, Axios, React Router DOM, Lucide React, React Hot Toast, Vitest, React Testing Library.
- Backend: Node.js, Express, Mongoose, Express Validator, Jest, Supertest.
- API test database: `mongodb-memory-server` (isolated in-memory MongoDB).

## Project structure

```text
.
├── frontend/
│   ├── src/
│   │   ├── services/       # Axios client and auth/task API functions
│   │   ├── test/           # Vitest setup
│   │   ├── AuthScreen.jsx  # Responsive signup and login
│   │   ├── App.jsx         # Dashboard and task workflows
│   │   ├── App.test.jsx
│   │   └── styles.css
│   ├── .env.example
│   └── package.json
├── backend/
│   ├── config/             # MongoDB connection
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── tests/
│   ├── utils/
│   ├── validators/
│   ├── .env.example
│   └── package.json
└── .gitignore
```

## Requirements

- Node.js 18 or later and npm.
- MongoDB Community Server running locally, or a MongoDB connection string.

## Setup

Open two terminals from the project root.

### 1. Configure and run the backend

```powershell
cd backend
npm install
Copy-Item .env.example .env
```

Open `backend/.env` and set `MONGODB_URI` to your own MongoDB connection string and `JWT_SECRET` to a private random value. Generate a secret with:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

The backend will not start with the example JWT placeholder; it requires a private secret of at least 32 characters. Do not commit `.env`.

```powershell
npm run dev
```

The API starts at `http://localhost:5000`. Check `http://localhost:5000/api/health` to verify it is available.

### 2. Run the frontend

In another terminal:

```powershell
cd frontend
npm install
Copy-Item .env.example .env
npm run dev
```

Open the Vite URL printed in the terminal (normally `http://localhost:5173`). Set `VITE_API_BASE_URL` in `frontend/.env` if the backend is hosted at a different URL. Restart Vite after changing environment variables.

## API reference

All responses use `{ "success": boolean, "message": string, "data": object }` for success. Validation errors include an `errors` array.

Sign up, login, and profile retrieval:

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/auth/signup` | Create a profile with name, email, and password |
| `POST` | `/api/auth/login` | Sign in with email and password |
| `GET` | `/api/auth/me` | Retrieve the signed-in profile |

Signup and login use regular forms; there is no OTP or email verification flow. The API returns a seven-day bearer token, which the frontend stores for session restore. All `/api/tasks` endpoints require an Authorization header using the Bearer scheme and only return or modify the signed-in user's tasks.

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/tasks` | Create a task |
| `GET` | `/api/tasks` | List tasks; supports `page`, `limit`, `status`, `priority`, and `date` |
| `GET` | `/api/tasks/search?q=term` | Case-insensitive title and description search |
| `GET` | `/api/tasks/weekly` | Tasks grouped into Monday-to-Sunday weeks with counts and progress |
| `GET` | `/api/tasks/stats` | Total, open, completed, and overdue counts |
| `GET` | `/api/tasks/:id` | Get a task |
| `PUT` | `/api/tasks/:id` | Update task fields |
| `PATCH` | `/api/tasks/:id/status` | Change status |
| `DELETE` | `/api/tasks/:id` | Delete a task |

Task creation requires `title`, `scheduledDate` (`YYYY-MM-DD`), and `scheduledTime` (`HH:mm`). `priority` can be `Low`, `Medium`, or `High`; `status` can be `In Progress` or `Completed`.

Tasks created in an older, unauthenticated version have no owner and are intentionally not exposed to newly created accounts. If your MongoDB already contains tasks that need to be retained, assign them to the intended user explicitly before using the authenticated app.

## Testing

Run the backend API tests (they use an isolated in-memory MongoDB and do not require your development database):

```powershell
cd backend
npm test
```

Run the frontend component tests:

```powershell
cd frontend
npm test
```

Create a production frontend build:

```powershell
cd frontend
npm run build
```

The included tests cover signup/login, password hashing, profile retrieval, authentication, task privacy, task creation/validation, CRUD/status/search routes, invalid IDs, weekly counts, overdue calculations, dashboard rendering, and account form behavior. The test scripts report their actual pass/fail results when run.

## Troubleshooting

- **MongoDB connection error:** Confirm the MongoDB service is running and `MONGODB_URI` in `backend/.env` is correct.
- **Missing `MONGODB_URI`:** Copy `backend/.env.example` to `backend/.env` and set the URI.
- **Dashboard API connection error:** Start the backend and confirm `VITE_API_BASE_URL` points to its `/api` root.
- **Dependency or port errors:** Run `npm install` in the relevant app folder and stop any other process using port 5000 or 5173.
