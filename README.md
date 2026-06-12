# 🎉 Party AOFA

แพลตฟอร์ม Party Game สำหรับงานเลี้ยงองค์กร — แสดงผลบนจอ TV/Projector ใหญ่
มี **Game Master (แอดมิน)** คุมเกม + ตั้งค่า + ล็อกผล และ **ผู้เล่น/ผู้ชม** ดูบนจอ

> Production build ตาม [`design/Party-AOFA-Spec.md`](design/Party-AOFA-Spec.md)
> Theme: Modern Cartoon Party (Fall Guys / Mario Party / Kahoot)

## Stack

| ส่วน | เทคโนโลยี |
|---|---|
| Frontend | Nuxt 4, Vue 3, Tailwind CSS |
| Realtime | Socket.IO |
| Game Engine | PixiJS (เกมอนิเมชันหนัก) |
| Sound | Howler.js |
| Backend | NestJS |
| Database | PostgreSQL (Prisma) |

## โครงสร้าง (monorepo — npm workspaces)

```
party-aofa/
├── apps/
│   ├── api/   → NestJS + Prisma + Socket.IO (source of truth, ตัดสินผลที่ server)
│   └── web/   → Nuxt 4 + Tailwind + PixiJS (TV screen + admin + remote)
├── docker-compose.yml   → PostgreSQL 16
└── design/   → spec + prototype เดิม (อ้างอิง)
```

## เริ่มใช้งาน (Quick start)

ต้องมี **Node ≥ 20** และ **Docker** (สำหรับ PostgreSQL)

```bash
# 1. คัดลอก env
cp .env.example .env

# 2. ติดตั้ง dependencies ทั้ง workspace
npm install

# 3. รัน PostgreSQL ด้วย Docker
npm run db:up

# 4. สร้าง schema + seed ข้อมูลตัวอย่าง (ผู้เล่น 12 คน, 10 เกม)
npm run db:migrate
npm run db:seed

# 5. รัน API + Web พร้อมกัน
npm run dev
```

- Web (TV/Admin): http://localhost:3000
- API: http://localhost:3001/api
- รหัส Game Master: `aofa2026` (ตั้งใน `.env` → `ADMIN_PASSWORD`)

> ลัด: `npm run setup` = install + db:up + migrate + seed

## Routes (Spec §4)

| Route | ใคร | หน้าที่ |
|---|---|---|
| `/select` | TV | เลือกเกม (กริดการ์ดทุกเกม) |
| `/play/:gameKey` | TV | จอเล่นเกม (แสดงผลใหญ่) |
| `/players` | Admin | จัดการผู้เล่น + อัปโหลดรูป |
| `/dashboard` | ทุกคน | สถิติรวม + Ranking |
| `/admin` | Admin (Game Master) | ตั้งค่าโหมด/รอบ/รางวัล/ล็อกผล |
| `/remote` | Admin มือถือ | รีโมตคุมจอ TV ผ่าน Socket.IO |

## Realtime model (Spec §6)

Server เป็น **source of truth**: สุ่ม/ตัดสินผลที่ NestJS (กันโกง) แล้ว broadcast `game:event`
ให้ TV เล่นอนิเมชันให้ออกมาตรงผลที่ตัดสินไว้ Admin remote แค่ส่งคำสั่ง

- `admin:*` → server (setMode / setLock / setRound / setSpotlight / startGame / resolveGame …)
- `state:sync` → ทุก client (session + players + games + rewards)
- `game:event` → ทุก client (start / result / reset)

3 โหมดตัดสินผล: `random` (สุ่มจริง) · `weight` (ถ่วงน้ำหนัก %) · `lock` (ล็อกผลล่วงหน้า)

## หมายเหตุการพัฒนา

- ถ้ายังไม่มี Docker ติดตั้ง: ติดตั้ง Docker Desktop ก่อน แล้ว `npm run db:up`
  หรือชี้ `DATABASE_URL` ใน `.env` ไป PostgreSQL ที่มีอยู่
- เฟสถัดไปตามลำดับ Spec §9: ใส่ Rive สำหรับตัวละคร, ขยายอนิเมชัน PixiJS ทุกเกม,
  และทดสอบ flow ล็อกผลข้ามเครื่อง (admin remote → TV)
