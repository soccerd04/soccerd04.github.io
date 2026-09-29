# CheckThat

CheckThat verifies a document against trusted reference material. Upload or paste the reference and the document to check, and the review flags claims that contradict the reference or that the reference does not support.

Never commit a key. `server/.env` is gitignored.

## Run locally

1. Copy `server/.env.example` to `server/.env`.
2. Put the approved company API key in `server/.env`. The example already
   contains the shared-service URL and approved model name.
3. Start both the API and the site:

```powershell
$env:Path = "C:\Program Files\nodejs;" + $env:Path
cd "$env:USERPROFILE\Documents\AI innovation"
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

Check which provider is active at [http://localhost:8787/health](http://localhost:8787/health). `"ready": false` means no provider is configured yet.

If a review fails with a "could not reach" message, a VPN, proxy, or firewall is blocking the connection. That is a network problem, not a bad key.

## Public site

`https://soccerd04.github.io` is an interactive frontend preview. It does not
send documents to an AI service. Live review is intentionally local-only.

The public Worker review endpoint is disabled.

## Layout

- `client/` — Vite front end
- `server/` — local API at `POST /api/fact-check`
- `worker/` — hosted Cloudflare Worker for the public site

Results are AI-generated and require human review.
