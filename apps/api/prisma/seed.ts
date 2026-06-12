import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Mirrors the demo seed (Party AOFA.dc.html constructor)
const palette = [
  '#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#C780FA', '#FF9F45',
  '#22D3EE', '#F368A8', '#A0E548', '#FF7A59', '#5CE1E6', '#FFB84C',
];

const seedPlayers: [string, string, string, string][] = [
  ['ออฟ', 'ออฟ อนุชา', 'AOFA Tech', 'Dev'],
  ['บีม', 'บีม ปวริศา', 'AOFA Tech', 'Design'],
  ['ปอนด์', 'ปอนด์ ธนกฤต', 'Creative', 'Marketing'],
  ['มิ้น', 'มิ้น ชนัญชิดา', 'Creative', 'Sales'],
  ['เจมส์', 'เจมส์ ศุภวิชญ์', 'AOFA Tech', 'Dev'],
  ['แนน', 'แนน กัญญารัตน์', 'HR Group', 'HR'],
  ['ตูน', 'ตูน ภาคิน', 'Creative', 'Marketing'],
  ['ฟ้า', 'ฟ้า ปุณยาพร', 'AOFA Tech', 'Design'],
  ['กอล์ฟ', 'กอล์ฟ ณัฐพล', 'Logistics', 'Ops'],
  ['พลอย', 'พลอย จิราพร', 'HR Group', 'Finance'],
  ['เอิร์ธ', 'เอิร์ธ พสิษฐ์', 'Logistics', 'Ops'],
  ['จอย', 'จอย ธัญชนก', 'Creative', 'Sales'],
];
const prizeSeed = [0, 300, 500, 800, 1200, 2000, 500, 1500, 0, 700, 200, 900];

// 10 games (Spec §5)
const games = [
  { key: 'yk1', name: 'ยกเดียวโลกจำ', icon: 'timer', type: 'แข่งยกจับเวลา', p1: 1000 },
  { key: 'wheel', name: 'วงล้อชะตาเมา', icon: 'disc-3', type: 'Wheel Spin' },
  { key: 'bomb', name: 'ระเบิดอยู่ที่ใคร', icon: 'bomb', type: 'Bomb Timer' },
  { key: 'boxing', name: 'ศึกมวยเดือด', icon: 'swords', type: 'Boxing Battle' },
  { key: 'td', name: 'เสือ มังกร', icon: 'cat', type: 'Tiger-Dragon' },
  { key: 'mine', name: 'ทุ่งระเบิด', icon: 'grid-3x3', type: 'Minefield' },
  { key: 'number', name: 'เลขนี้พี่ขอ', icon: 'hash', type: 'Lucky Number', p1: 1000, p2: 500, p3: 300 },
  { key: 'slot', name: 'เมาหรือรวย', icon: 'cherry', type: 'Slot Machine' },
  { key: 'horse', name: 'ม้าเมาเข้าวิน', icon: 'rabbit', type: 'Horse Racing', p1: 1000, p2: 500, p3: 300 },
  { key: 'box', name: 'เปิดเลยอย่าคิดเยอะ', icon: 'gift', type: 'Mystery Box' },
];

const rewards = [
  { id: 'r1', icon: 'banknote', label: 'เงิน 500฿', order: 0 },
  { id: 'r2', icon: 'coins', label: 'เงิน 1,000฿', order: 1 },
  { id: 'r3', icon: 'ticket', label: 'Voucher', order: 2 },
  { id: 'r4', icon: 'sparkles', label: 'Jackpot 5,000฿', order: 3 },
  { id: 'r5', icon: 'beer', label: 'ยกเหล้า 1 ช็อต', order: 4 },
];

async function main() {
  // Players (deterministic ids p0..p11 so locks/round refer stably)
  const playerIds: string[] = [];
  for (let i = 0; i < seedPlayers.length; i++) {
    const [nick, name, company, dept] = seedPlayers[i];
    const id = `p${i}`;
    playerIds.push(id);
    await prisma.player.upsert({
      where: { id },
      update: {},
      create: {
        id, nick, name, company, dept,
        color: palette[i % palette.length],
        prize: prizeSeed[i] ?? 0,
        createdAt: i,
      },
    });
  }

  for (let i = 0; i < games.length; i++) {
    const g = games[i];
    await prisma.game.upsert({
      where: { key: g.key },
      update: {},
      create: {
        key: g.key, name: g.name, type: g.type, icon: g.icon, order: i,
        p1: g.p1 ?? 0, p2: g.p2 ?? 0, p3: g.p3 ?? 0,
      },
    });
  }

  for (const r of rewards) {
    await prisma.reward.upsert({ where: { id: r.id }, update: {}, create: r });
  }

  const roundIds = playerIds.slice(0, 6);
  const weights: Record<string, number> = {};
  roundIds.forEach((id) => (weights[id] = 50));

  await prisma.session.upsert({
    where: { id: 'live' },
    update: {},
    create: {
      id: 'live',
      eventName: 'งานเลี้ยง AOFA 2026',
      resultMode: 'random',
      roundIds,
      spotlightId: roundIds[0],
      weights,
      lock: {
        wheel: 6, slot: 'jackpot', race: roundIds[0], card: 'jackpot',
        bomb: roundIds[0], number: 50, boxing: 'blue', td: 'tiger', mine: roundIds[0],
      },
    },
  });

  console.log(`Seeded ${playerIds.length} players, ${games.length} games, ${rewards.length} rewards.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
