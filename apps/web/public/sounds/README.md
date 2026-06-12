# Sound effects (Howler.js)

วางไฟล์ `.mp3` ตามชื่อ cue เหล่านี้ ระบบจะใช้ไฟล์จริงทันที
ถ้าไม่มีไฟล์ จะ fallback เป็นเสียงสังเคราะห์ WebAudio (ไม่เงียบ)

| ไฟล์ | ใช้ตอน |
|---|---|
| `cheer.mp3` | เชียร์ |
| `drum.mp3` | drum roll ก่อนออกผล |
| `jackpot.mp3` | แจ็กพ็อต |
| `confetti.mp3` | กระดาษโปรย |
| `explosion.mp3` | ระเบิด (bomb/mine) |
| `winner.mp3` | ผู้ชนะ |
| `lose.mp3` | ผู้แพ้/โดนยก |
| `click.mp3` | กดปุ่ม/ติ๊ก |

อ้างอิง cue ในโค้ด: `apps/web/app/composables/useSounds.ts`
