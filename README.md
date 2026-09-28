# 🚀 CVision AI — AI CV Analyzer & Smart Job Matcher

A production-ready, full-stack MERN SaaS application that evaluates CVs using xAI (Grok API), performs OCR on images/scanned documents, calculates transparent CV scores, and matches candidates with job descriptions.

---

## 📋 Features
- **Secure Authentication:** JWT-based user authentication with bcrypt password hashing.
- **Advanced Document Processing:** Supports PDF, DOCX, PNG, and JPG file uploads with automated text extraction and Tesseract.js OCR support.
- **xAI (Grok) Integration:** Server-side AI analysis that converts unstructured CV text into structured, validated JSON data.
- **Transparent CV Scoring:** Multi-category weighted scoring system (Skills, Experience, Education, Projects, etc.).
- **Smart Job Matcher:** Compares candidate profiles against job descriptions to compute compatibility percentages and identify missing skills.
- **Modern SaaS UI/UX:** Built with React, Vite, Tailwind CSS, Lucide icons, and interactive data visualization.

---

## 🛠️ Tech Stack
- **Frontend:** React.js, Vite, Tailwind CSS, Lucide React, Axios, Recharts
- **Backend:** Node.js, Express.js, Mongoose, JWT, bcryptjs, Multer, Tesseract.js, pdf-parse, mammoth
- **Database:** MongoDB Atlas

---

## 📂 Layout

Three independent npm trees — there are **no workspaces** and **no `concurrently`**,
so the API and the client are started in two terminals.

| Folder | What it is | Start command |
| --- | --- | --- |
| `client/` | React + Vite frontend (deployed to Vercel) | `npm run dev` → http://localhost:5173 |
| `server/` | Express API (deployed to Render) | `npm run dev` → http://localhost:5000 |
| *(repo root)* | Leftover Vite scaffold, not the app | don't run it — it serves an empty `src/App.jsx` on port 5173 |

---

## ⚙️ Environment Variables

### Server (`server/.env`)

Copy `server/.env.example` to `server/.env`. The name is **`MONGO_URI`**, not
`MONGODB_URI` — a typo makes the server exit before it binds a port, which the
client sees as a 502.

```ini
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/ai-cv-analyzer?retryWrites=true&w=majority
JWT_SECRET=<long random string>
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173      # must match the Vite port
ADDITIONAL_ORIGINS=                   # extra origins, comma separated
COOKIE_SAMESITE=lax
COOKIE_SECURE=false
AI_PROVIDER=xai
XAI_API_KEY=<your xai api key>
XAI_MODEL=grok-4.7
```

The server only starts listening **after** MongoDB connects. If you see 502s,
check the terminal for `[db] MongoDB connected` and `GET /api/health`.

### Client (`client/.env`)

Copy `client/.env.example` to `client/.env`. `VITE_API_URL` is the **origin** of
the API — no trailing slash and **no `/api` suffix**; `src/api/axios.js` appends
`/api` itself. Anything ending in `/api` is stripped, so a value like
`http://localhost:5000/api` will not break — but do not write it.

**Local development — leave it empty (or set the origin; both are equivalent):**

```ini
VITE_API_URL=            # -> baseURL "/api", Vite proxies to :5000
VITE_API_TIMEOUT=60000
VITE_ANALYSIS_TIMEOUT=240000
```

Requests stay same-origin in dev, so no CORS and no cookie flags are needed.
`vite.config.js` forwards `/api` and `/uploads` to the target below, and it
answers **502** whenever nothing is listening there.

**Production — set it in the Vercel project's environment variables and redeploy:**

```ini
VITE_API_URL=https://cv-analyzer-api.onrender.com
```

Only `VITE_`-prefixed variables are inlined into the bundle, and they are
inlined **at build time** — adding one to Vercel without a redeploy changes
nothing. Because the bundle is then calling another origin, the API must be
configured for it (`server/render.yaml` already sets these):

```ini
CLIENT_URL=https://<your-app>.vercel.app   # the CORS / CSRF allow-list
COOKIE_SAMESITE=none                       # cross-site cookie
COOKIE_SECURE=true
```

To stay same-origin in production instead, leave `VITE_API_URL` empty and add an
external rewrite to `client/vercel.json` **before** the SPA fallback:

```json
{ "source": "/api/:path*", "destination": "https://cv-analyzer-api.onrender.com/api/:path*" },
{ "source": "/uploads/:path*", "destination": "https://cv-analyzer-api.onrender.com/uploads/:path*" }
```

If neither is done, a production build logs
`[api] VITE_API_URL is not set in this build` on start-up.

---

## 📥 Installation & Local Running

```bash
git clone https://github.com/khaoula-elouarity/ai-cv-analyzer.git
cd ai-cv-analyzer

# terminal 1 — API
cd server
cp .env.example .env      # then fill in MONGO_URI, JWT_SECRET, XAI_API_KEY
npm install
npm run dev               # http://localhost:5000

# terminal 2 — client
cd client
cp .env.example .env      # leave VITE_API_URL empty
npm install
npm run dev               # http://localhost:5173
```

Check the API with `curl http://localhost:5000/api/health`. If that fails, the
client's `/api` requests will 502.

```bash
# production build of the client
cd client && npm run build   # -> client/dist
```

---

## 🚨 Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `502` on `/api/auth/login` in dev | backend not running, or it exited because MongoDB failed | run `cd server && npm run dev`, confirm `[db] MongoDB connected` |
| `502` on the Vercel URL | the API host is asleep, crashed at deploy, or `VITE_API_URL` was never set on Vercel | `curl <VITE_API_URL>/api/health`; set the variable and redeploy |
| `401` immediately after a successful login | the session cookie was dropped | `COOKIE_SAMESITE=none` + `COOKIE_SECURE=true`, and `CLIENT_URL` = the exact client origin |
| `403` on every request | the client origin is not in the allow-list | set `CLIENT_URL` (and `ADDITIONAL_ORIGINS`) to the exact origin, no trailing slash |
| `404` on `/api/api/...` | `VITE_API_URL` includes `/api` and an unpatched config forwarded it | use the bare origin |
| Blank page on :5173 | `npm run dev` was run at the repo root (the empty scaffold) | run it in `client/` |
