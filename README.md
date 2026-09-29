# CheckThat

CheckThat verifies a document against trusted reference material. Upload or paste the reference and the document to check, and the review flags claims that contradict the reference or that the reference does not support.

The backend picks its provider automatically:

- **Cloudflare Workers AI** by default. No OpenAI account or billing needed.
- **OpenAI** as soon as an OpenAI key is present. Nothing else has to change.

Never commit a key. `server/.env` is gitignored.

## Run locally

1. Copy `server/.env.example` to `server/.env`.
2. Fill in **one** provider:
   - Cloudflare: set `CLOUDFLARE_API_TOKEN` (the account ID is prefilled).
   - OpenAI: uncomment `OPENAI_API_KEY`. If set, it wins over Cloudflare.
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

`https://soccerd04.github.io` serves the front end only. It calls the Cloudflare Worker `checkthat-api`, which runs Workers AI with no key. Adding an `OPENAI_API_KEY` secret to that Worker switches it to OpenAI.

Pushing to `main` redeploys the site and the Worker through GitHub Actions.

## Layout

- `client/` — Vite front end
- `server/` — local API at `POST /api/fact-check`
- `worker/` — hosted Cloudflare Worker for the public site

Results are AI-generated and require human review.
