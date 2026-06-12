# 🚀 Deploy — Party AOFA

```
aofa.cloud        → Vercel   (Nuxt web / SSR)
api.aofa.cloud    → VPS      (NestJS + Socket.IO, Docker + Caddy auto-HTTPS)
DB / Auth / Storage → Supabase (already live)
```

`aofa.cloud` DNS is on Cloudflare and the apex already points to Vercel.

---

## 1) API on your VPS (api.aofa.cloud)

**Prereqs:** a VPS with a public IP, Docker + Docker Compose, ports **80 & 443** open.

### a. Point DNS
In Cloudflare add an **A record**:

| Type | Name | Value | Proxy |
|---|---|---|---|
| A | `api` | `<VPS public IP>` | **DNS only** (grey cloud) |

> ใช้ "DNS only" (ปิด proxy สีส้ม) เพื่อให้ Caddy ขอใบรับรอง Let's Encrypt ได้ และ WebSocket ทำงานตรง ๆ

### b. Deploy on the VPS
```bash
git clone https://github.com/nirodomwaranung/partyaofa.git
cd partyaofa

# create the production env (fill Supabase values + your admin email)
cp deploy/.env.production.example .env
nano .env           # set <DB-PASSWORD>, SERVICE_ROLE/ANON keys, ADMIN_EMAILS

# build + run (API + Caddy)
docker compose -f docker-compose.prod.yml up -d --build

# (one-time, if the DB schema isn't applied yet)
docker compose -f docker-compose.prod.yml exec api \
  npx prisma migrate deploy --schema apps/api/prisma/schema.prisma
```
Caddy auto-issues HTTPS for `api.aofa.cloud`. Check: `https://api.aofa.cloud/api/games` → JSON.

Update later: `git pull && docker compose -f docker-compose.prod.yml up -d --build`

---

## 2) Web on Vercel (aofa.cloud)

1. **Import** the GitHub repo `nirodomwaranung/partyaofa` into Vercel.
2. **Root Directory:** `apps/web`  (Vercel auto-detects Nuxt; Nitro builds the Vercel preset).
3. **Environment Variables** (Production):
   ```
   NUXT_PUBLIC_API_BASE        = https://api.aofa.cloud
   NUXT_PUBLIC_SOCKET_URL      = https://api.aofa.cloud
   NUXT_PUBLIC_SUPABASE_URL    = https://madppayyvvhvvjlltoma.supabase.co
   NUXT_PUBLIC_SUPABASE_ANON_KEY = <anon public key>
   ```
4. **Domains:** add `aofa.cloud` (and `www.aofa.cloud`) to the Vercel project.
5. Deploy.

---

## 3) Wire-up checklist

- [ ] API `.env` → `CORS_ORIGIN="https://aofa.cloud,https://www.aofa.cloud"`
- [ ] API `.env` → `ADMIN_EMAILS="you@email.com"` (lock Game Master access)
- [ ] Supabase → Authentication → URL Configuration → add `https://aofa.cloud` to redirect/site URLs
- [ ] Supabase → Authentication → Providers → Email → **disable public signup** (only admin-created accounts)
- [ ] `api.aofa.cloud` A record → VPS IP (DNS only)
- [ ] Create Game Master: `npm run create-admin -- you@email.com '<password>'`
- [ ] Test: open https://aofa.cloud → /admin → log in → start a game on /play/:key

---

## Notes
- Socket.IO needs a persistent server → that's why the API is on the VPS, not Vercel.
- The VPS only runs the API + Caddy; PostgreSQL is Supabase (no DB container).
- Secrets live only in the VPS `.env` and Vercel env vars — never committed.
