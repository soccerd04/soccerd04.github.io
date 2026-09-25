# SoW fact-check shell

Rough Node.js client + server. Paste **reference material** and an **AI-generated deliverable**. The server sends both to an LLM and returns fact-check issues.

## Run locally

1. Copy `.env.example` to `.env` and set `OPENAI_API_KEY`.
2. In a new terminal (so Node is on PATH after the admin install):

```powershell
cd "$env:USERPROFILE\Documents\AI innovation"
npm install
npm run dev
```

3. Open [http://localhost:5173](http://localhost:5173). The UI proxies `/api` to the server on port 3001.

If `node` is still not recognized, use:

```powershell
$env:Path = "C:\Program Files\nodejs;" + $env:Path
```

## Layout

- `client/` — Vite page with two text areas
- `server/` — Express `POST /api/fact-check`
- `.env` — API key (never commit this)
