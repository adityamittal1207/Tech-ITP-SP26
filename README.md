# Lumnus ITP — MERN Stack Backbone
A starter **MERN** project (MongoDB, Express, React, Node.js) with a working API, database connection, and React client wired together.

## Tech stack
| Layer | Technology |
|-------|------------|
| **M** | MongoDB + Mongoose |
| **E** | Express 5 |
| **R** | React 19 + Vite |
| **N** | Node.js (ES modules) |

## Prerequisites
- [Node.js](https://nodejs.org/) (v18+ recommended)
- [MongoDB](https://www.mongodb.com/try/download/community) running locally, or a remote connection string

## Quick start

### 1. Install dependencies
From the project root:
```bash
npm run install:all
```
Or install each package manually:
```bash
npm install
npm install --prefix server
npm install --prefix client
```

### 2. Configure environment
Copy the example env file and adjust if needed:
```bash
cp server/.env.example server/.env
```

Default values:
```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/lumnus
NODE_ENV=development
```

### 3. Start MongoDB
Make sure MongoDB is running on your machine. On macOS with Homebrew:
```bash
brew services start mongodb-community
```

### 4. Run the app
Start both the API and the React dev server:
```bash
npm run dev
```
- **Client:** http://localhost:5173  
- **API:** http://localhost:5000  

Run them separately if you prefer:
```bash
npm run dev:server   # Express API only
npm run dev:client   # Vite dev server only
```

## Scripts
| Command | Description |
|---------|-------------|
| `npm run install:all` | Install root, server, and client dependencies |
| `npm run dev` | Run API + client in development |
| `npm run dev:server` | Run API only (with file watch) |
| `npm run dev:client` | Run React dev server only |
| `npm run build` | Build the React app for production |
| `npm run start` | Start the API in production mode |

## Project structure
Lumnus_ITP_Project/
├── client/                 # React frontend (Vite)
│   ├── src/
│   │   ├── api/            # API client helpers
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── vite.config.js      # Proxies /api → localhost:5000
├── server/                 # Express backend
│   ├── config/db.js        # MongoDB connection
│   ├── controllers/        # Route handlers
│   ├── middleware/         # Error handling, etc.
│   ├── models/             # Mongoose schemas
│   ├── routes/             # API routes
│   ├── index.js            # Server entry point
│   └── .env                # Environment variables (not committed)
├── package.json            # Root scripts (concurrently)
└── README.md

## Environment variables
All env vars live in `server/.env` (never committed). Copy from `server/.env.example` to get started.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `5000` | Port the Express server listens on |
| `MONGODB_URI` | Yes | `mongodb://127.0.0.1:27017/lumnus` | MongoDB connection string (local or Atlas) |
| `NODE_ENV` | No | `development` | Set to `production` for production builds |

> **Never commit `server/.env`.** It is listed in `.gitignore`. If you accidentally push secrets, rotate them immediately.

## API
Base URL: `http://localhost:5000/api`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |
| `GET` | `/items` | List all items |
| `POST` | `/items` | Create an item (`{ name, description? }`) |
| `DELETE` | `/items/:id` | Delete an item by ID |

### Example requests
```bash
# Health check
curl http://localhost:5000/api/health

# Create an item
curl -X POST http://localhost:5000/api/items \
  -H "Content-Type: application/json" \
  -d '{"name":"My task","description":"Optional"}'

# List items
curl http://localhost:5000/api/items
```

During development, the Vite dev server proxies `/api` requests to the Express server, so the React app can call `/api/...` without CORS issues.

## Extending the project
**Backend:** Add a Mongoose model in `server/models/`, a controller in `server/controllers/`, and register routes in `server/index.js`.

**Frontend:** Add API helpers in `client/src/api/` and build UI in `client/src/`.

### Feature roadmap / open TODOs
This backbone intentionally leaves the following out — they're in scope for fellows to build:

- [ ] Authentication (JWT or session-based)
- [ ] Input validation (e.g. `express-validator` or `zod`)
- [ ] Pagination on list endpoints
- [ ] Rate limiting (`express-rate-limit`)
- [ ] Unit and integration tests
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Role-based access control

### Architecture decisions
- **ES modules over CommonJS** — `"type": "module"` is set in both `server/package.json` and the root. Use `import`/`export` throughout; avoid `require()`.
- **Vite proxy over server-side CORS config** — In development, Vite forwards `/api` requests to Express, so no CORS headers are needed locally. In production you'll need to configure CORS explicitly or serve client and API from the same origin.
- **Express 5** — Uses the release candidate; async errors are caught automatically without `try/catch` wrappers in every route handler.

## MongoDB Atlas setup (no local install)
If you'd rather not run MongoDB locally, use a free Atlas cluster:

1. Sign up at [mongodb.com/atlas](https://www.mongodb.com/atlas) and create a free M0 cluster.
2. Under **Database Access**, create a user with read/write permissions.
3. Under **Network Access**, add your IP (or `0.0.0.0/0` for development).
4. Click **Connect → Drivers** and copy your connection string.
5. Paste it into `server/.env`:
```env
   MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/lumnus?retryWrites=true&w=majority
```
6. Skip the `brew services start mongodb-community` step entirely.

## Testing
Tests are not yet implemented in the backbone. When you add them, follow this structure:
server/
└── tests/
├── unit/          # Pure function / model tests (Jest)
└── integration/   # Route-level tests (supertest)
client/
└── src/
└── tests/     # Component tests (Vitest + React Testing Library)

Run all tests (once configured):
```bash
npm test
```

## Troubleshooting

**MongoDB connection refused**
- Make sure MongoDB is running: `brew services list | grep mongodb`
- Restart it: `brew services restart mongodb-community`
- If using Atlas, check that your IP is whitelisted under Network Access.

**Port already in use**
- Kill whatever is on port 5000: `lsof -ti :5000 | xargs kill -9`
- Or change `PORT` in `server/.env`.

**`MODULE_NOT_FOUND` / missing packages**
- You likely skipped `npm run install:all`. Run it from the project root.

**CORS errors in production**
- The Vite proxy only works in development. In production, either serve the built client from Express or add `cors` middleware to the server with your deployed client origin.

**Changes not reflected after editing**
- Server uses `--watch` (Node 18+) so it restarts on save. If it doesn't, restart `npm run dev:server` manually.
- Client uses Vite HMR; a full page refresh usually resolves stale state.

## Contributing
We use a simple branch-based workflow.

### Branches
| Prefix | Use |
|--------|-----|
| `feature/` | New functionality (e.g. `feature/auth-jwt`) |
| `fix/` | Bug fixes (e.g. `fix/item-delete-500`) |
| `chore/` | Config, deps, tooling (e.g. `chore/update-eslint`) |
| `docs/` | Documentation only |

### Workflow
1. Branch off `main`: `git checkout -b feature/your-feature`
2. Make your changes, keeping commits focused.
3. Open a PR against `main` with a short description of what and why.
4. Get at least one review before merging.

### Commit style
Follow [Conventional Commits](https://www.conventionalcommits.org/):
feat: add JWT authentication middleware
fix: return 404 when item not found
chore: upgrade mongoose to 8.x
docs: add Atlas setup instructions

### `.gitignore` reminders
These are excluded and should never be committed:
- `server/.env` — contains secrets
- `node_modules/` — reinstall with `npm run install:all`
- `client/dist/` — generated by `npm run build`

## Production notes
1. Build the client: `npm run build` (output in `client/dist/`).
2. Serve the static build from Express or a separate host (e.g. Nginx, Vercel).
3. Set `NODE_ENV=production` and use a production MongoDB URI in `server/.env`.

## License
Private project — add a license if you plan to open-source it.
