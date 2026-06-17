# 🎬 Movies REST API

A clean, production-style REST API for a movie catalogue, built with **Node.js, Express and MySQL** following an MVC architecture. It features JWT authentication, input validation, pagination, automated tests and interactive API docs — packaged so you can clone it and have everything running with a single command.

[![CI](https://github.com/Hector-0-0/Api-rest-movies/actions/workflows/ci.yml/badge.svg)](https://github.com/Hector-0-0/Api-rest-movies/actions/workflows/ci.yml)
![Node.js](https://img.shields.io/badge/node-%3E%3D18-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/express-5-000000?logo=express&logoColor=white)
![MySQL](https://img.shields.io/badge/mysql-8-4479A1?logo=mysql&logoColor=white)
![Tests](https://img.shields.io/badge/tests-vitest-6E9F18?logo=vitest&logoColor=white)
![License](https://img.shields.io/badge/license-ISC-blue)

## 🔗 Live demo

| What | URL |
| --- | --- |
| API base | https://rainy-bettine-hector0-0-1de8c0b3.koyeb.app |
| Interactive docs (Swagger) | https://rainy-bettine-hector0-0-1de8c0b3.koyeb.app/docs |
| Frontend (Vercel) | _add your Vercel URL here_ |

> Backend deployed on **Koyeb**, MySQL hosted on **Aiven**, frontend on **Vercel**.

## ✨ Features

- **RESTful CRUD** for movies with a clean MVC structure (routes → controllers → models).
- **JWT authentication**: register/login, passwords hashed with bcrypt, role-based access (`user` / `admin`).
- **Protected writes**: reads are public; creating, updating and deleting movies requires an admin token.
- **Robust validation** with [Zod](https://zod.dev) on every endpoint.
- **Pagination, filtering and sorting** on `GET /movies` (`?page`, `?limit`, `?genre`, `?sort`).
- **Security hardening**: `helmet`, configurable CORS whitelist and rate limiting.
- **Consistent error responses** (`{ status, code, message, details? }`) via centralized error handling.
- **Interactive API docs** (OpenAPI 3.0 + Swagger UI) served at `/docs`.
- **Automated tests** with Vitest + Supertest (~96% statement coverage on the app layer).
- **Dockerized**: `docker compose up` spins up the API and a seeded MySQL database.
- **CI** with GitHub Actions running lint + tests on every push and PR.

## 🧱 Tech stack

| Layer | Tools |
| --- | --- |
| Runtime | Node.js (ESM, `.mjs`) |
| Framework | Express 5 |
| Database | MySQL 8 (`mysql2` connection pool) |
| Validation | Zod |
| Auth | jsonwebtoken, bcryptjs |
| Security | helmet, cors, express-rate-limit |
| Docs | swagger-ui-express (OpenAPI 3.0) |
| Testing | Vitest, Supertest |
| Tooling | ESLint, Docker, GitHub Actions |

## 🏗️ Architecture

```
                      ┌──────────────────────────────────────────────┐
   HTTP request  ──▶  │  Express app (src/app.mjs)                    │
                      │                                               │
                      │  helmet → cors → json → rate-limit            │
                      │              │                                │
                      │              ▼                                │
                      │   Router  ──▶  validate (Zod)  ──▶  auth      │
                      │   (routes)         │              (JWT guard) │
                      │                    ▼                          │
                      │              Controller                       │
                      │                    │                          │
                      │                    ▼                          │
                      │                  Model  ──────────────▶  MySQL│
                      │                    │                          │
                      │                    ▼                          │
                      │            Central error handler              │
                      └──────────────────────────────────────────────┘
                            │
                            ▼
                   JSON response (consistent shape)
```

Server start-up (`src/server.mjs`) is kept separate from the app definition (`src/app.mjs`), so tests can import the app and run it in-memory without opening a port. Data models are **injected** into the app, which lets the same code run against MySQL in production and an in-memory store in tests.

## 🚀 Getting started

### Option A — Docker (recommended)

Requires Docker and Docker Compose. From the project root:

```bash
docker compose up --build
```

This starts MySQL (auto-seeded from `movies_db.sql`) and the API together.

- API: http://localhost:3000
- Docs: http://localhost:3000/docs

A seed admin is created so you can test protected routes right away:

| Email | Password | Role |
| --- | --- | --- |
| `admin@example.com` | `admin12345` | admin |

### Option B — Manual

Requires Node.js ≥ 18 and a running MySQL instance.

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env       # then edit values to match your MySQL

# 3. Create and seed the database
mysql -u root -p < movies_db.sql

# 4. Run
npm run dev                # auto-reload, or `npm start` for production
```

## ⚙️ Environment variables

| Variable | Description | Default |
| --- | --- | --- |
| `NODE_ENV` | Environment (`development`, `production`, `test`) | `development` |
| `PORT` | Port the server listens on | `3000` |
| `CORS_ORIGINS` | Comma-separated allowed origins (any `*.vercel.app` is allowed too) | _(empty)_ |
| `DB_HOST` | MySQL host | `localhost` |
| `DB_USER` | MySQL user | `root` |
| `DB_PASSWORD` | MySQL password | _(empty)_ |
| `DB_NAME` | Database name | `moviesdb` |
| `DB_PORT` | MySQL port | `3306` |
| `DB_SSL` | Set to `true` for managed providers requiring TLS (e.g. Aiven) | `false` |
| `JWT_SECRET` | Secret used to sign JWTs (**set a strong value in production**) | dev fallback |
| `JWT_EXPIRES_IN` | Token lifetime (e.g. `1h`, `7d`) | `1d` |
| `BCRYPT_ROUNDS` | bcrypt cost factor | `10` |

## 📚 API endpoints

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/auth/register` | — | Register a user (role `user`), returns a JWT |
| `POST` | `/auth/login` | — | Log in, returns a JWT |
| `GET` | `/movies` | — | List movies (supports `?page`, `?limit`, `?genre`, `?sort`) |
| `GET` | `/movies/:id` | — | Get a movie by id |
| `POST` | `/movies` | admin | Create a movie |
| `PATCH` | `/movies/:id` | admin | Partially update a movie |
| `DELETE` | `/movies/:id` | admin | Delete a movie |
| `GET` | `/health` | — | Health check |
| `GET` | `/docs` | — | Interactive Swagger UI |

`GET /movies` returns a plain array; pagination metadata travels in the
`X-Total-Count`, `X-Total-Pages`, `X-Page` and `X-Limit` response headers.

### Example: authenticate and create a movie

```bash
# 1. Log in and grab the token
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin12345"}' | jq -r .token)

# 2. Create a movie (admin only)
curl -X POST http://localhost:3000/movies \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Inception",
    "year": 2010,
    "director": "Christopher Nolan",
    "duration": 148,
    "poster": "https://example.com/poster.jpg",
    "rate": 8.8,
    "genre": ["Action", "Sci-Fi"]
  }'
```

See [`api.http`](./api.http) for a ready-to-run request collection (VS Code REST Client).

## 🧪 Tests

```bash
npm test          # run the suite once
npm run test:watch
npm run coverage  # with coverage report
npm run lint      # ESLint
```

Tests run against in-memory models, so **no database is required** to run them.

## 🗂️ Project structure

```
src/
├── app.mjs              # Express app definition (no listen)
├── server.mjs           # Entry point: wires MySQL models and starts listening
├── config/              # Centralized env-based configuration
├── routes/              # Route definitions (movies, auth)
├── controllers/         # HTTP layer
├── models/
│   ├── database/        # MySQL-backed models
│   └── local-file-system/  # In-memory models (local runs & tests)
├── middlewares/         # validate, auth, cors, rate-limit, error-handler
├── schemas/             # Zod schemas (source of truth for input shape)
├── auth/                # JWT helpers
├── errors/              # ApiError
└── docs/                # OpenAPI spec
tests/                   # Vitest + Supertest suites
```

## 📸 Screenshots

> _Add a screenshot or GIF of the Swagger UI (`/docs`) and/or the frontend here._

## 📄 License

ISC © Hector
