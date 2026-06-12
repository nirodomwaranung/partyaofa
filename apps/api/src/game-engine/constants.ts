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
