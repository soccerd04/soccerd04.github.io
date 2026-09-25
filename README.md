# The Nancy Drew Files

A vintage detective-inspired consulting fact checker. Paste **reference material** and an **AI-generated deliverable**. A Cloudflare Worker uses Workers AI to identify unsupported or contradictory claims.

## Run locally

No external AI API key is required. Workers AI uses the `AI` binding on your Cloudflare account.

```powershell
cd "$env:USERPROFILE\Documents\AI innovation"
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The UI proxies `/api` to Wrangler on port 8787. Wrangler may ask you to authenticate with Cloudflare because local AI inference still runs on Cloudflare.

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

Set the GitHub Actions variable `VITE_API_URL` to the deployed Worker's origin (no trailing slash), then redeploy Pages.

## Cloudflare Worker

The Worker uses `@cf/meta/llama-3.3-70b-instruct-fp8-fast` through a Workers AI binding. No API key is stored in this repository.

```powershell
npm run worker:deploy
```

Cloudflare currently includes 10,000 free Workers AI neurons per day. Long documents consume more of that allocation. Review Cloudflare's data-processing terms and your organization's policy before submitting client-confidential material.

## Layout

- `client/` — Vite page with two text areas
- `worker/` — Cloudflare Worker with `POST /api/fact-check`

This is an unofficial, detective-inspired project and is not affiliated with the Nancy Drew rights holders.
