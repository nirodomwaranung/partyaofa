# 🚀 Deploy — Party AOFA

```
DB / Auth / Storage → Supabase (already live)
Web + API           → your choice below
```

Two ways to serve the frontend. The API (NestJS + Socket.IO) always runs on the
VPS because it needs persistent WebSocket connections.

---

## ✅ Option A (recommended): everything on the VPS

Web **and** API on one VPS, both behind Caddy (auto-HTTPS). Nothing to log into.

### a. DNS (Cloudflare) — all → VPS IP, proxy **OFF** (grey cloud / "DNS only")
| Type | Name | Value |
|---|---|---|
| A | `@` (aofa.cloud) | `<VPS IP>` |
| A | `www` | `<VPS IP>` |
| A | `api` | `<VPS IP>` |

> ปิด Cloudflare proxy (เมฆเทา) ทุกตัว เพื่อให้ Caddy ขอใบรับรอง Let's Encrypt ได้

### b. On the VPS
```bash
cd ~/partyaofa
git pull

# .env must include the web vars too (NUXT_PUBLIC_*). See deploy/.env.production.example
nano .env

docker compose -f docker-compose.prod.yml up -d --build
```
Caddy issues HTTPS for `aofa.cloud`, `www.aofa.cloud`, and `api.aofa.cloud`.
Open **https://aofa.cloud** 🎉

Update later: `git pull && docker compose -f docker-compose.prod.yml up -d --build`

---

## Option B: Web on Vercel, API on VPS

Keep the apex on Vercel (managed CDN/SSR). Requires a Vercel login.

1. Vercel → **Add New → Project** → import `nirodomwaranung/partyaofa`
2. **Root Directory:** `apps/web`
3. **Environment Variables** (Production):
   ```
   NUXT_PUBLIC_API_BASE          = https://api.aofa.cloud
   NUXT_PUBLIC_SOCKET_URL        = https://api.aofa.cloud
   NUXT_PUBLIC_SUPABASE_URL      = https://madppayyvvhvvjlltoma.supabase.co
   NUXT_PUBLIC_SUPABASE_ANON_KEY = <anon public key>
   ```
4. **Domains:** add `aofa.cloud` + `www.aofa.cloud`.
5. On the VPS, run only the API (the `web` + its Caddy block aren't needed).

---

## Wire-up checklist (both options)

- [ ] VPS `.env` → `CORS_ORIGIN="https://aofa.cloud,https://www.aofa.cloud"`
- [ ] VPS `.env` → `ADMIN_EMAILS="you@email.com"` (lock Game Master access)
- [ ] VPS `.env` → `NUXT_PUBLIC_*` filled (Option A only)
- [ ] Supabase → Authentication → URL Configuration → Site URL = `https://aofa.cloud`
- [ ] Supabase → Authentication → Providers → Email → **disable public signup**
- [ ] Create Game Master: `npm run create-admin -- you@email.com '<password>'`
- [ ] Test: https://aofa.cloud → /admin → log in → start a game on /play/:key

## Notes
- Socket.IO needs a persistent server → the API is always on the VPS.
- The VPS runs the app containers + Caddy; PostgreSQL is Supabase (no DB container).
- Secrets live only in the VPS `.env` (and Vercel env vars for Option B) — never committed.
