# Rive animations

วางไฟล์ `.riv` ที่ export จาก [Rive](https://rive.app) ไว้ในโฟลเดอร์นี้
แล้วเรียกผ่าน `<RiveCharacter src="ชื่อไฟล์.riv" state-machine="..." />`

ถ้าไม่มีไฟล์ คอมโพเนนต์จะ fallback เป็น Bean avatar การ์ตูน CSS อัตโนมัติ
(ไม่พังหน้าจอ) — ใส่ไฟล์เมื่อไหร่ก็แสดงผลทันที

แนะนำให้มี:
- `mascot.riv` — มาสคอตงานบนหน้า /select และตอนประกาศผู้ชนะ
- `runner.riv` / `horse.riv` — ตัวละครวิ่ง/ม้า (ใช้แทน sprite ใน RaceGame ได้)
- `confetti.riv`, `explosion.riv` — เอฟเฟกต์

> ปัจจุบันยังไม่ผูกไฟล์จริง (เป็นงานออกแบบ) — runtime + fallback พร้อมแล้ว
