# 🚀 Deploy — Party AOFA (all on one VPS)

Everything runs on the VPS in Docker: **PostgreSQL + API (NestJS/Socket.IO) +
Web (Nuxt SSR) + Caddy** (auto-HTTPS). No Vercel, no Supabase.

```
aofa.cloud / www.aofa.cloud → Caddy → web (Nuxt)
api.aofa.cloud              → Caddy → api (NestJS + Socket.IO)
                                      └→ db (PostgreSQL)  +  /uploads volume
```

## DNS (Cloudflare) — all A records → VPS, proxy OFF (grey cloud)
| Type | Name | Value |
|---|---|---|
| A | `@` | `139.180.141.21` |
| A | `www` | `139.180.141.21` |
| A | `api` | `139.180.141.21` |

> ปิด Cloudflare proxy (เมฆเทา = DNS only) เพื่อให้ Caddy ขอใบรับรอง Let's Encrypt ได้

## Deploy on the VPS
```bash
# prerequisites: Docker + Docker Compose, ports 80 & 443 open
git clone -b movevps https://github.com/nirodomwaranung/partyaofa.git
cd partyaofa

cp .env.example .env
nano .env          # set POSTGRES_PASSWORD, DATABASE_URL/DIRECT_URL (same password),
                   # JWT_SECRET, ADMIN_PASSWORD, CORS_ORIGIN, PUBLIC_API_BASE

docker compose -f docker-compose.prod.yml up -d --build

# FIRST TIME ONLY — seed the 10 games + sample players:
docker compose -f docker-compose.prod.yml exec -w /app/apps/api api npx prisma db seed
```
Caddy auto-issues HTTPS for all three hostnames. Open **https://aofa.cloud** 🎉

Update later:
```bash
git pull && docker compose -f docker-compose.prod.yml up -d --build
```

## What's where
- **DB**: `db` container (PostgreSQL 16), data in the `pgdata` volume. Migrations
  run automatically on API start (`prisma migrate deploy`).
- **Uploads**: avatars/covers/reward images saved to the `uploads` volume, served
  by the API at `https://api.aofa.cloud/uploads/...`.
- **Auth**: single Game Master password (`ADMIN_PASSWORD`) → JWT. Login at `/admin`.

## .env keys (VPS)
```
POSTGRES_USER=aofa
POSTGRES_PASSWORD=<strong-db-password>
POSTGRES_DB=party_aofa
DATABASE_URL="postgresql://aofa:<strong-db-password>@db:5432/party_aofa?schema=public"
DIRECT_URL="postgresql://aofa:<strong-db-password>@db:5432/party_aofa?schema=public"
API_PORT=3001
JWT_SECRET=<long-random-string>
ADMIN_PASSWORD=<game-master-password>
CORS_ORIGIN="https://aofa.cloud,https://www.aofa.cloud"
PUBLIC_API_BASE="https://api.aofa.cloud"
NUXT_PUBLIC_API_BASE="https://api.aofa.cloud"
NUXT_PUBLIC_SOCKET_URL="https://api.aofa.cloud"
```

## Auto-deploy (GitHub Actions → VPS)
Every push to `main` rebuilds on the VPS automatically (`.github/workflows/deploy.yml`).
Add these repo secrets once (GitHub → Settings → Secrets and variables → Actions):

| Secret | Value |
|---|---|
| `VPS_HOST` | `139.180.141.21` |
| `VPS_USER` | `root` |
| `VPS_SSH_KEY` | contents of the deploy **private** key |

Copy the private key into the secret (run in your own terminal, never paste in chat):
```bash
pbcopy < ~/.ssh/id_ed25519   # then paste into the VPS_SSH_KEY secret
```
After secrets are set, `git push` (or run the workflow manually) → it pulls + rebuilds.
Manual deploy still works any time: `ssh root@139.180.141.21 'cd ~/partyaofa && git pull && docker compose -f docker-compose.prod.yml up -d --build'`

## Notes
- One VPS = lowest latency (DB is local to the API, no cross-region hop).
- Secrets live only in the VPS `.env` (gitignored) — never committed.
- Backups: `docker compose -f docker-compose.prod.yml exec db pg_dump -U aofa party_aofa > backup.sql`
