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

```
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
```

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

## Production notes

1. Build the client: `npm run build` (output in `client/dist/`).
2. Serve the static build from Express or a separate host (e.g. Nginx, Vercel).
3. Set `NODE_ENV=production` and use a production MongoDB URI in `server/.env`.

## License

Private project — add a license if you plan to open-source it.
