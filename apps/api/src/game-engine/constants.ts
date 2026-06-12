// Prize tables ported verbatim from the demo (Party AOFA.dc.html).
export type Kind = 'cash' | 'jackpot' | 'drink' | 'safe' | 'none';

export interface WheelSlice {
  label: string;
  icon: string;
  color: string;
  kind: Kind;
  amount?: number;
}

export const WHEEL: WheelSlice[] = [
  { label: 'เงิน 500', icon: 'banknote', color: '#6BCB77', kind: 'cash', amount: 500 },
  { label: 'Voucher', icon: 'ticket', color: '#4D96FF', kind: 'cash', amount: 300 },
  { label: 'รอดตัว', icon: 'shield-check', color: '#A0E548', kind: 'safe' },
  { label: 'ยก 1 ช็อต', icon: 'beer', color: '#FF9F45', kind: 'drink' },
  { label: 'เงิน 1,000', icon: 'coins', color: '#FFD93D', kind: 'cash', amount: 1000 },
  { label: 'ยก 3 ช็อต', icon: 'beer', color: '#FF6B6B', kind: 'drink' },
  { label: 'JACKPOT', icon: 'sparkles', color: '#C780FA', kind: 'jackpot', amount: 5000 },
  { label: 'รอดตัว', icon: 'shield-check', color: '#22D3EE', kind: 'safe' },
];

export const CARD: { icon: string; label: string; kind: Kind; amount?: number }[] = [
  { icon: 'coins', label: 'เงิน 1,000', kind: 'cash', amount: 1000 },
  { icon: 'banknote', label: 'เงิน 500', kind: 'cash', amount: 500 },
  { icon: 'ticket', label: 'Voucher', kind: 'cash', amount: 300 },
  { icon: 'sparkles', label: 'JACKPOT', kind: 'jackpot', amount: 5000 },
  { icon: 'gem', label: 'Double', kind: 'cash', amount: 2000 },
  { icon: 'beer', label: 'ยกเหล้า', kind: 'drink' },
  { icon: 'beer', label: 'ยก 2 ช็อต', kind: 'drink' },
  { icon: 'shield-check', label: 'รอดตัว', kind: 'safe' },
];

// lock.card key -> reward
export const CARD_LOCK_MAP: Record<string, { icon: string; label: string; kind: Kind; amount?: number }> = {
  jackpot: { icon: 'sparkles', label: 'JACKPOT', kind: 'jackpot', amount: 5000 },
  cash: { icon: 'coins', label: 'เงิน 1,000', kind: 'cash', amount: 1000 },
  voucher: { icon: 'ticket', label: 'Voucher', kind: 'cash', amount: 300 },
  drink: { icon: 'beer', label: 'ยกเหล้า', kind: 'drink' },
  double: { icon: 'gem', label: 'Double', kind: 'cash', amount: 2000 },
};

export const SLOT_POOL = ['coins', 'beer', 'sparkles', 'gift', 'gem', 'bell', 'star', 'cherry'];

// Slice colors for the wheel — frontend uses the SAME array+index so colors match.
export const WHEEL_PALETTE = [
  '#6BCB77', '#4D96FF', '#FFD93D', '#FF9F45', '#C780FA', '#FF6B6B',
  '#22D3EE', '#A0E548', '#F368A8', '#5CE1E6', '#FFB84C', '#34D399',
];

type RewardLike = { icon?: string | null; label?: string | null };

/** Infer the outcome kind from an admin reward (no explicit kind field). */
export function rewardKind(r: RewardLike): Kind {
  const icon = (r.icon || '').toLowerCase();
  const lbl = (r.label || '').toLowerCase();
  if (icon === 'beer' || icon === 'wine' || /ยก|เหล้า|ดื่ม|drink/.test(lbl)) return 'drink';
  if (icon === 'sparkles' || /jackpot|แจ็ก|แจ๊ก/.test(lbl)) return 'jackpot';
  if (icon === 'shield-check' || /รอด|safe/.test(lbl)) return 'safe';
  return 'cash';
}

/** Parse a money amount from the reward label (e.g. "เงิน 2,000฿" → 2000). */
export function rewardAmount(r: RewardLike, kind: Kind): number {
  if (kind === 'drink' || kind === 'safe') return 0;
  const m = (r.label || '').replace(/,/g, '').match(/\d+/);
  return m ? parseInt(m[0], 10) : 0;
}
