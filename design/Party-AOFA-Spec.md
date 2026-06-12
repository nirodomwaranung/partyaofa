# Party AOFA — Developer Handoff & Spec

> โปรโตไทป์ UI/UX + กลไกเกม สร้างไว้ใน `Party AOFA.dc.html` (HTML/React-in-DC, client-side ล้วน)
> เอกสารนี้สรุปทุกอย่างเพื่อนำไปพัฒนาเป็นโปรดักชันจริงตาม stack ที่วางไว้

---

## 1. ภาพรวม (Overview)

Party AOFA = แพลตฟอร์ม Party Game สำหรับงานเลี้ยงองค์กร แสดงผลบนจอ TV/Projector ใหญ่
มี **Game Master (แอดมิน)** คุมเกม + ตั้งค่า + ล็อกผล และ **ผู้เล่น/ผู้ชม** ดูบนจอ

**Theme:** Modern Cartoon Party (Fall Guys / Mario Party / Kahoot) — สีสันจัด, ขอบหนา, เงาแข็งสไตล์สติกเกอร์, อนิเมชันเยอะ

### Stack เป้าหมาย (production)
| ส่วน | เทคโนโลยี |
|---|---|
| Frontend | Nuxt 4, Vue 3, Tailwind CSS, shadcn/vue |
| Realtime | Socket.IO |
| Game Engine | PixiJS (เกมที่มีอนิเมชันหนัก เช่น วิ่งแข่ง/มวย/สล็อต 3D) |
| Animation | Rive (ตัวละคร/เอฟเฟกต์) |
| Sound | Howler.js |
| Backend | NestJS |
| Database | PostgreSQL |

---

## 2. Design System

### สี (Color tokens)
```
--bg-gradient: radial-gradient(120% 90% at 80% -10%, #9333EA 0%, #7C3AED 38%, #5B21B6 72%, #4C1D95 100%)
--outline:     #2A1B4D   /* ขอบเข้ม + เงาแข็งทุกการ์ด */
--card:        #FFFFFF
--accent-yellow: #FFD93D
--accent-pink:   #FF5C8A
--accent-green:  #34D399
--accent-blue:   #4D96FF
--accent-red:    #FF6B6B
```
- **การ์ด:** พื้นขาว, `border: 3px solid #2A1B4D`, `border-radius: 22–26px`, `box-shadow: 0 7–8px 0 #2A1B4D` (เงาแข็งไม่เบลอ)
- **ปุ่ม:** สีจัด + ขอบเข้ม + เงาแข็ง `0 5px 0 <darker>`, กดแล้ว translateY

### ฟอนต์
- หัวข้อ/ตัวเลข: **Baloo Thai 2** (700–800)
- เนื้อหา: **Mali** (400–700)

### ไอคอน
- ใช้ **Lucide** (line icons) ทั้งระบบ — ไม่มี emoji
- ในเดโมห่อด้วย web component `<l-icon name="..." size color stroke fill>` (render เป็น inline SVG ใน Shadow DOM กันชนกับ React)
- โปรดักชัน: ใช้ `lucide-vue-next`

### Avatar
- ผู้เล่นมีรูปโปรไฟล์ (อัปโหลดได้) — ถ้าไม่มีใช้ **Bean** (ตัวการ์ตูนกลม CSS) เป็น fallback
- โชว์ทุกที่: สปอตไลต์, วิ่งแข่ง, ม้า, ระเบิด, Ranking, ทีมเกม

---

## 3. Data Model (เสนอสำหรับ DB)

### Player
```ts
Player {
  id: string
  nick: string            // ชื่อเล่น
  name: string            // ชื่อจริง
  company: string
  dept: string
  role?: string
  color: string           // สีประจำตัว (hex)
  photo: string | null    // dataURL/URL รูปโปรไฟล์
  // สถิติสะสม
  wins: number
  drinks: number          // จำนวนครั้งโดนยกเหล้า
  prize: number           // เงินรางวัลสะสม (บาท)
  plays: number
}
```

### Game (config ปรับได้จากหลังบ้าน)
```ts
Game {
  key: string             // 'wheel' | 'slot' | ...
  name: string            // ชื่อเกม (แก้ได้)
  type: string            // คำอธิบาย (แก้ได้)
  icon: string            // lucide icon name
  cover: string | null    // ภาพปก/ไอคอนที่อัปโหลด (override)
  // รางวัลตามอันดับ (ต่อเกม)
  p1?: number             // อันดับ 1 / ผู้ชนะ (บาท)
  p2?: number             // อันดับ 2
  p3?: number             // อันดับ 3
  loserDrink?: boolean    // ผู้แพ้โดนยก (default true)
  // เกมทีม (เสือ-มังกร) อัปโหลดรูปฝั่ง
  tigerImg?: string | null
  dragonImg?: string | null
}
```

### Reward (รางวัลในกล่อง — CRUD ได้)
```ts
Reward { id: string; icon: string; label: string; img?: string | null }
```

### Round / Session (สถานะรอบเล่น — ควรอยู่บน server + sync ผ่าน Socket.IO)
```ts
Session {
  eventName: string                 // ชื่องาน ON AIR (แอดมินแก้ได้)
  roundIds: string[]                // ผู้เล่นในรอบนี้
  spotlightId: string               // ผู้เล่นที่กำลังเล่น (เกมเดี่ยว)
  resultMode: 'random'|'weight'|'lock'
  weights: Record<playerId, number> // โหมดถ่วงน้ำหนัก (5–100)
  // ค่าล็อกผลต่อเกม (ดูหัวข้อ 5)
  lock: { wheel:number; slot:string; race:id; card:string; bomb:id;
          number:number; boxing:'blue'|'red'; td:'tiger'|'dragon'; mine:id }
}
```

> **localStorage keys ในเดโม** (ย้ายไป DB): `aofa_photos`, `aofa_games`, `aofa_rewards`, `aofa_event`, `aofa_admin`(session)

---

## 4. Screens / Routes (เสนอแยกหน้า)

| Route | ใคร | หน้าที่ |
|---|---|---|
| `/select` | TV | เลือกเกม (กริดการ์ดทุกเกม) |
| `/play/:gameKey` | TV | จอเล่นเกม (แสดงผลใหญ่) |
| `/players` | Admin (ล็อกอิน) | จัดการผู้เล่น + อัปโหลดรูป |
| `/dashboard` | TV/ทุกคน | สถิติรวม + Ranking |
| `/admin` (Game Master) | Admin (ล็อกอิน) | ตั้งค่าโหมด/รอบ/รางวัล/ชื่องาน/ล็อกผล |
| `/remote` *(ใหม่)* | Admin มือถือ | รีโมตคุมจอ TV ผ่าน Socket.IO |

**Auth:** เดโมใช้รหัส client-side `aofa2026` (แค่เดโม) — โปรดักชันต้องตรวจที่ NestJS (JWT/role) คุมหน้า `/players` และ `/admin`

---

## 5. กลไกเกม (Game Mechanics)

ทุกเกมรองรับ **3 โหมดตัดสินผล**: `random` (สุ่มจริง), `weight` (ถ่วงน้ำหนัก %), `lock` (ล็อกผลล่วงหน้า — ผู้เล่นไม่รู้)
แอดมินตั้ง **รางวัลผู้ชนะ/อันดับ** และ **บทลงโทษผู้แพ้ (โดนยก)** ได้ต่อเกมจาก Game Master

### รายการเกม (10)
| key | ชื่อ | ประเภท | ผล/รางวัล |
|---|---|---|---|
| `yk1` | ยกเดียวโลกจำ | จับเวลา (2 โหมด: กดจับเวลา / กรอกเวลาเอง) | เร็วสุดชนะ+เงิน, ช้าสุดโดนยก |
| `wheel` | วงล้อชะตาเมา | Wheel Spin (หมุน state-driven ~4s) | ตามช่องที่ออก (เงิน/Voucher/Jackpot/ยกเหล้า/รอด) |
| `race` | วิ่งหนีเมา *(ถูกตัดออกจากลิสต์)* | Animated Race 2D | อันดับ 1 +เงิน, สุดท้ายโดนยก |
| `bomb` | ระเบิดอยู่ที่ใคร | Bomb Timer (ระเบิดวิ่งวน) | คนถือตอนระเบิดโดนยก |
| `number` | เลขนี้พี่ขอ | Lucky Number (ทุกคนเลือกเลข, สุ่มเลขกลาง ~15s) | ใกล้สุดชนะ (จัดอันดับ 1-2-3), ไกลสุดโดนยก |
| `slot` | เมาหรือรวย | Slot Machine **3D** (รีลทรงกระบอก CSS @keyframes ~8s + ประวัติแพ้-ชนะ) | 3 ตรง = เงิน/ยกเหล้า/Jackpot |
| `horse` | ม้าเมาเข้าวิน | Horse Racing **3D perspective** (~16-18s, เดินหน้าตลอด มีแซง, ม้า+จ๊อกกี้รูปจริง) | อันดับ 1-2-3 +เงิน, สุดท้ายโดนยก |
| `box` | เปิดเลยอย่าคิดเยอะ | Mystery Box (กล่องใหญ่ + ประวัติการเปิด) | เปิดได้รางวัลตามกล่อง |
| `boxing` | ศึกมวยเดือด | Team Battle (น้ำเงิน vs แดง, สู้ ~20s + นับถอยหลัง + HP + สกิล) | ทีมชนะรอด, **ทีมแพ้โดนยกทั้งทีม** (โชว์รูปทีมแพ้ใหญ่) |
| `td` | เสือ มังกร | Team Bet (เชียร์เสือ/มังกร, ลุ้น ~10s) | ทีมชนะรอด, ทีมแพ้โดนยกทั้งทีม (โชว์รูปทีมแพ้ใหญ่) |
| `mine` | ทุ่งระเบิด | Minefield 5×5 (ผลัดกันเดิน) | คนเหยียบระเบิดรับโทษ (โชว์รูปใหญ่ + เสียงระเบิด), ที่เหลือรอด |

### Logic การล็อกผล (สำคัญสำหรับ realtime)
แต่ละเกมอ่านค่า lock ของตัวเองเมื่อ `resultMode === 'lock'`:
- `wheel`: `lock.wheel` = index ช่องที่จะออก
- `slot`: `lock.slot` = `'jackpot'|'cash'|'drink'|'none'`
- `horse`: `lock.race` = playerId ที่ชนะ (จัดอันดับให้คนนี้เข้าวิน)
- `number`: `lock.number` = เลขกลางที่จะออก (1–100)
- `bomb`: `lock.bomb` = playerId ที่จะโดน
- `box`: `lock.card` = ชนิดรางวัลที่การ์ดที่เลือกจะออก
- `boxing`: `lock.boxing` = `'blue'|'red'` ฝั่งที่ชนะ
- `td`: `lock.td` = `'tiger'|'dragon'` ฝั่งที่ชนะ
- `mine`: `lock.mine` = playerId ที่จะเหยียบระเบิด
- `yk1`/`weight`: ถ่วงน้ำหนักด้วย `weights[playerId]`

> หลักการ: ระบบ "กำหนดผู้ชนะ/ผู้แพ้ก่อน" แล้ว**ขับอนิเมชันให้ออกมาตรงผลนั้น** (เช่น วงล้อหมุนไปหยุดช่องที่ล็อก, ม้าที่ล็อกได้สปีดให้เข้าเส้นก่อน, ทุ่งระเบิดให้ทุ่นไป "ลง" ตอนคนที่ล็อกกด)

### อนิเมชันที่ต้องระวัง (บทเรียนจากเดโม)
- เดโมขับอนิเมชันด้วย **state-stepping (setInterval อัปเดตตำแหน่งทุก ~40ms)** สำหรับวงล้อ/วิ่ง/ม้า เพื่อให้เห็นจริงและ deterministic
- สล็อต 3D ใช้ **CSS @keyframes** (รันบน GPU, ลื่นไม่กระตุก, inject keyframe ต่อสปิน)
- โปรดักชันแนะนำ **PixiJS** สำหรับเกมหนัก (วิ่ง/ม้า/มวย) + **Rive** สำหรับตัวละคร/เอฟเฟกต์

---

## 6. Realtime (Socket.IO) — สิ่งที่เดโมยังไม่มี

เดโมเป็น single-screen. โปรดักชันต้องซิงค์ TV ↔ Admin Remote:

**Events ที่เสนอ:**
```
// Admin → Server
admin:setMode      { mode }
admin:setLock      { gameKey, value }
admin:setRound     { playerIds }
admin:setSpotlight { playerId }
admin:startGame    { gameKey }       // สั่งจอ TV เริ่มเกม
admin:resetGame
admin:updateGame   { gameKey, patch } // ชื่อ/รางวัล/รูป
admin:updateReward / admin:updatePlayer

// Server → ทุก client (TV + remote)
state:sync         { session, players, games, rewards }
game:event         { gameKey, type, payload }  // เช่น เริ่มหมุน/ผลออก เพื่อให้ TV เล่นอนิเมชันพร้อมกัน
```

แนวคิด: **Server เป็นแหล่งความจริง (source of truth)** — สุ่ม/ตัดสินผลที่ server (กันโกง) แล้ว broadcast ให้ TV เล่นอนิเมชันตามผล, Admin remote แค่ส่งคำสั่ง

**เสียง (Howler.js):** cheer, drum roll, jackpot, confetti, explosion, winner/lose theme — เล่นที่จอ TV ตาม `game:event`

---

## 7. ฟีเจอร์ Admin (Game Master) ที่ทำไว้ในเดโม
- ล็อกอินรหัสผ่าน (คุมหน้า Game Master + ผู้เล่น)
- เลือกโหมดตัดสินผล (สุ่ม/ถ่วงน้ำหนัก/ล็อก) + รีโมตลับบนจอเล่น (ปุ่มเฟือง→กุญแจสีทองตอนล็อก)
- เลือกผู้เล่นในรอบ + ปรับน้ำหนัก %
- จัดการผู้เล่น: เพิ่ม/อัปโหลดรูปโปรไฟล์
- ตั้งค่าต่อเกม: ชื่อ/คำอธิบาย/ภาพปก + **รางวัลตามอันดับ** + บทลงโทษ + (เสือ-มังกร) อัปโหลดรูปฝั่ง
- รางวัลในกล่อง: เพิ่ม/แก้/ลบ + อัปโหลดรูป
- แก้ชื่องาน ON AIR
- Dashboard: ผู้เล่นรวม/รอบรวม/เงินแจก/โดนยกรวม + Ranking (Top ผู้ชนะ/ดื่ม/โชคดี/โชคร้าย)

---

## 8. ไฟล์เดโม
- `Party AOFA.dc.html` — โปรโตไทป์เต็ม (เปิดในเบราว์เซอร์ได้เลย) ใช้อ้างอิง UI/สี/อนิเมชัน/flow
- โครงสร้าง: template (markup + holes) + logic class (`renderVals()` คืนค่าให้ template) — แปลงเป็น Vue component ได้ตรงๆ (state → ref/reactive, renderVals → computed, methods เหมือนเดิม)

---

## 9. ลำดับแนะนำในการพัฒนา
1. ตั้ง NestJS + PostgreSQL: schema (Player/Game/Reward/Session) + Auth (JWT, role admin)
2. ตั้ง Nuxt + แยก route `/select /play /players /dashboard /admin /remote`
3. แปลง UI จากเดโมเป็น Vue components + Tailwind (ยึดสี/สเปกข้อ 2)
4. ต่อ Socket.IO: state:sync + game flow (server ตัดสินผล)
5. ใส่อนิเมชันจริงด้วย PixiJS/Rive ตามเกม + เสียง Howler.js
6. ทดสอบ flow ล็อกผลข้ามเครื่อง (admin remote → TV)
