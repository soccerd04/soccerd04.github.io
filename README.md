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

## Public site (`https://soccerd04.github.io`)

GitHub Pages only hosts the **client**. The URL `soccerd04.github.io` only works from a public repo named **`soccerd04.github.io`**.

1. On GitHub, create an empty public repository named `soccerd04.github.io` (no README).
2. In this folder:

```powershell
$env:Path = "$env:LOCALAPPDATA\Programs\Git\cmd;C:\Program Files\nodejs;" + $env:Path
git remote add github-io https://github.com/soccerd04/soccerd04.github.io.git
git push -u github-io main
```

3. In that repo: **Settings → Pages → Source: GitHub Actions**.

The form will load for anyone. **Run fact check** still needs the Node server on a host that can keep `OPENAI_API_KEY` secret. After that exists, set Actions variable `VITE_API_URL` to the API origin (no trailing slash) and redeploy.

## Layout

- `client/` — Vite page with two text areas
- `server/` — Express `POST /api/fact-check`
- `.env` — API key (never commit this)
