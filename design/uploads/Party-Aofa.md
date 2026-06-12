เอาเวอร์ชันนี้ไปวางให้ Claude Design ได้เลยครับ

Project Party AOFA

Overview

Party AOFA เป็นระบบ Party Game Platform สำหรับงานเลี้ยงบริษัท งานปีใหม่ งาน Outing งาน Team Building และกิจกรรมสังสรรค์ภายในองค์กร

ระบบทำงานผ่าน Browser ทั้งหมด และออกแบบให้แสดงผลบนจอ TV หรือ Projector ขนาดใหญ่ เพื่อให้ทุกคนในงานสามารถดูและร่วมลุ้นผลได้พร้อมกัน

ผู้ควบคุมเกม (Admin/Game Master) จะเป็นผู้จัดการผู้เล่น ตั้งค่าเกม ควบคุมการเล่น และประกาศผลรางวัล

⸻

Design Direction

Theme

Modern Cartoon Party Platform

อ้างอิงสไตล์จาก

* Fall Guys
* Mario Party
* Stumble Guys
* Kahoot

Mood & Tone

* สนุก
* สดใส
* น่ารัก
* ขำขัน
* ตื่นเต้น
* สีสันจัดจ้าน
* Animation เยอะ
* เหมาะกับงานบริษัททุกวัย

⸻

Technical Stack

Frontend

* Nuxt 4
* Vue 3
* Tailwind CSS
* shadcn/vue

Realtime

* Socket.IO

Game Engine

* PixiJS

Animation

* Rive

Sound Effect

* Howler.js

Backend

* NestJS

Database

* PostgreSQL

⸻

User Roles

1. Game Master (Admin)

สิทธิ์

* เพิ่มผู้เล่น
* แก้ไขผู้เล่น
* ลบผู้เล่น
* ตั้งค่าเกม
* ตั้งค่ารางวัล
* ล็อคผล
* เริ่มเกม
* หยุดเกม
* รีเซ็ตเกม
* ดูสถิติ

⸻

2. Viewer

สิทธิ์

* ดูเกม
* ดูอันดับ
* ดูผลรางวัล

ไม่มีสิทธิ์แก้ไขข้อมูล

⸻

Player Management

ข้อมูลผู้เล่น

* รูปโปรไฟล์
* ชื่อจริง
* ชื่อเล่น
* บริษัท
* แผนก
* ตำแหน่ง

สถิติ

* จำนวนครั้งเข้าร่วม
* จำนวนครั้งชนะ
* จำนวนครั้งโดนยกเหล้า
* จำนวนเงินรางวัลสะสม
* อันดับ Top Winner
* อันดับ Top Drinker

⸻

Main Flow

1. Admin ลงทะเบียนผู้เล่น
2. Admin ตั้งค่าเกม
3. เปิดหน้าจอเลือกเกม
4. เลือกผู้เล่นเข้าแข่งขัน
5. เริ่มเกม
6. แสดง Animation ระหว่างเล่น
7. ประกาศผล
8. บันทึกประวัติ
9. แสดงสถิติรวม

⸻

Result Control System

ระบบรองรับ 3 รูปแบบ

Random Mode

สุ่มจริง 100%

⸻

Weight Mode

กำหนดเปอร์เซ็นต์โอกาสชนะ

ตัวอย่าง

* นาย A = 30%
* นาย B = 20%
* นาย C = 10%

⸻

Lock Result Mode

Admin สามารถกำหนดผลล่วงหน้าได้

ตัวอย่าง

* ผู้ชนะคือ A
* ผู้แพ้คือ B
* รางวัลที่จะออกคือ 500 บาท

ผู้เล่นและผู้ชมไม่สามารถทราบได้

⸻

GAME 01

ยกเดียวโลกจำ

ประเภท

แข่งขันยกเหล้าจับเวลา

รายละเอียด

ผู้เล่นแข่งขันดื่มตามกติกา

Admin เป็นผู้กรอกเวลา

ระบบจัดอันดับอัตโนมัติ

Effect

* Stopwatch ขนาดใหญ่
* Cheer Sound
* Confetti

Admin Setting

* จำนวนผู้เล่น
* จำนวนรางวัล
* เวลาตัดสิทธิ์
* ประเภทเครื่องดื่ม

⸻

GAME 02

วงล้อชะตาเมา

ประเภท

Wheel Spin

รายละเอียด

ผู้เล่นหมุนวงล้อสุ่มรางวัล

รางวัล

* เงินสด
* Voucher
* รอดตัว
* ยกเหล้า 1 Shot
* ยกเหล้า 3 Shot
* Jackpot

Admin Setting

* จำนวนช่อง
* น้ำหนักรางวัล
* ล็อคผล
* สุ่มจริง

Effect

* 3D Wheel
* Drum Roll
* Flash Light

⸻

GAME 03

ไพ่แห่งโชคและโศก

ประเภท

Lucky Card

รายละเอียด

ผู้เล่นเลือกเปิดการ์ด

รางวัล

* เงิน
* Voucher
* ยกเหล้า
* Jackpot
* Double Reward

Admin Setting

* จำนวนการ์ด
* โอกาสออกแต่ละรางวัล
* ล็อคผล

Effect

* Flip Card Animation
* Glow Effect

⸻

GAME 04

วิ่งหนีเมา

ประเภท

Animated Race

รายละเอียด

ผู้เล่นทุกคนกลายเป็น Avatar

แข่งขันวิ่งบนสนาม

ระหว่างทางมี Event สุ่ม

Random Events

* สะดุดล้ม
* หลับกลางทาง
* แวะเข้าห้องน้ำ
* โดนเพื่อนแกล้ง
* ได้พลังสปีด

รางวัล

อันดับ 1
อันดับ 2
อันดับ 3

ผู้แพ้โดนยกเหล้า

Admin Setting

* จำนวนผู้เล่น
* จำนวนผู้ชนะ
* ล็อคผล
* สุ่มจริง

Effect

* Cartoon Race Track
* Character Animation
* Crowd Cheer

⸻

GAME 05

ระเบิดอยู่ที่ใคร

ประเภท

Bomb Timer

รายละเอียด

ส่งระเบิดต่อกัน

ระเบิดนับถอยหลัง

ใครถืออยู่ตอนหมดเวลาโดนยกเหล้า

Effect

* Countdown
* Explosion Animation

⸻

GAME 06

คีบผิดชีวิตเปลี่ยน

ประเภท

Lucky Grab

รายละเอียด

เลือกกล่องของขวัญ

รางวัลภายใน

* เงิน
* Voucher
* เหล้า
* Jackpot

⸻

GAME 07

เลขนี้พี่ขอ

ประเภท

Lucky Number

รายละเอียด

ผู้เล่นเลือกเลข

ระบบสุ่มเลขกลาง

ใกล้ที่สุดได้เงิน

ไกลที่สุดยกเหล้า

⸻

GAME 08

เมาหรือรวย

ประเภท

Party Slot Machine

รายละเอียด

สล็อตสุ่มรางวัล

Combination

💰💰💰 = เงินสด

🍺🍺🍺 = ยกเหล้า

⭐️⭐️⭐️ = Jackpot

⸻

GAME 09

ม้าเมาเข้าวิน

ประเภท

Horse Racing

รายละเอียด

ผู้เล่นเลือกม้า

แข่งแบบ Animation

Random Events

* ม้าหลับ
* ม้าสะดุด
* ม้าวิ่งผิดทาง
* ม้าติดบูสต์

⸻

GAME 10

เปิดเลยอย่าคิดเยอะ

ประเภท

Mystery Box

รายละเอียด

เลือกกล่องปริศนา

รางวัลภายใน

* เงิน
* Voucher
* เหล้า
* Jackpot

⸻

Dashboard

Overview

* ผู้เล่นทั้งหมด
* เกมทั้งหมด
* เงินที่แจกทั้งหมด
* จำนวนเหล้าที่โดนยกทั้งหมด

⸻

Rankings

Top Winner

Top Drinker

Top Lucky

Top Unlucky

⸻

Statistics

* ประวัติการเล่น
* ประวัติการชนะ
* ประวัติการรับรางวัล
* ประวัติการโดนยกเหล้า

⸻

Avatar System

ผู้เล่นทุกคนมี Avatar การ์ตูน

ใช้ในทุกเกม

* วิ่งแข่ง
* ม้าแข่ง
* วงล้อ
* ตารางคะแนน

Style

* Cute Chibi
* Cartoon Party
* Company Theme

⸻

Display Modes

Admin Screen

หน้าควบคุมเกม

⸻

TV Screen

แสดงผลบนจอใหญ่

⸻

Dashboard Screen

สรุปสถิติ

⸻

Sound System

รองรับ

* Cheer
* Drum Roll
* Jackpot
* Confetti
* Explosion
* Winner Theme
* Lose Theme

⸻

Goal

สร้างประสบการณ์ Party Game Platform สำหรับองค์กร ที่สนุก น่ารัก ตื่นเต้น และสามารถควบคุมผลลัพธ์ได้ตามความต้องการของผู้จัดงาน โดยรองรับการแสดงผลบน Browser และจอขนาดใหญ่แบบ Realtime

อันนี้เป็นเวอร์ชัน Product Design Brief พร้อมส่งให้ Claude Design ออกแบบ UI/UX และ Design System ได้เลยครับ।