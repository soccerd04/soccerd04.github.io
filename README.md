# CheckThat

CheckThat verifies a document against trusted reference material. Judges open **https://soccerd04.github.io**. That page is only the interface. Reviews go to a small API that holds the OpenAI key and calls OpenAI. The key is never in the GitHub Pages files.

Do not commit `OPENAI_API_KEY`. Do not paste it into chat. Revoke any key that was shared, then create a new one.

## Demo architecture

1. GitHub Pages serves the website.
2. The Cloudflare Worker `checkthat-api` stores `OPENAI_API_KEY` as an encrypted secret.
3. The Worker calls OpenAI and returns the review JSON.
4. The browser never sees the key.

## One-time: store the OpenAI key on the Worker

In a PowerShell window (do not paste the key into Cursor chat):

```powershell
$env:Path = "C:\Program Files\nodejs;" + $env:Path
cd "$env:USERPROFILE\Documents\AI innovation"
npx wrangler login
npx wrangler secret put OPENAI_API_KEY --cwd worker
```

When prompted, paste the **new** key. Then:

```powershell
npm run worker:deploy
```

Confirm `https://checkthat-api.silly-capacity-50d.workers.dev/health` returns `"ready": true`.

## Public site

Every push to `main` rebuilds GitHub Pages with `VITE_API_URL` pointing at that Worker. After the first successful Worker secret + deploy + Pages build, judges can use the site on a phone or laptop.

Warm the API once before the demo by opening the health URL above.

## Run locally

1. Copy `server/.env.example` to `server/.env` and add `OPENAI_API_KEY`.
2. `npm install` then `npm run dev`.
3. Open [http://localhost:5173](http://localhost:5173).

## Layout

- `client/` — Vite front end (GitHub Pages)
- `server/` — local Node API
- `worker/` — hosted OpenAI lockbox for the public demo

Results are AI-generated and require human review.
