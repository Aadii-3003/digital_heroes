// Pure draw logic (no I/O) – easy to unit test.
import { SCORE_MAX, SCORE_MIN, TIER_SHARES, round2 } from './config';

export type Participant = { userId: string; scores: number[] };
export type DrawWinner = { userId: string; matches: 3 | 4 | 5; prize: number };

const RANGE = Array.from({ length: SCORE_MAX - SCORE_MIN + 1 }, (_, i) => i + SCORE_MIN);
const sortAsc = (a: number[]) => [...a].sort((x, y) => x - y);

/** Standard lottery style: 5 unique numbers, all equally likely. */
export function randomNumbers(): number[] {
  const pool = [...RANGE];
  const out: number[] = [];
  while (out.length < 5) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  return sortAsc(out);
}

/**
 * Algorithmic mode: numbers that subscribers log more often are more likely to be drawn.
 * weight(n) = 1 + how many stored scores equal n.  Sampling is without replacement.
 */
export function weightedNumbers(freq: Record<number, number>): number[] {
  const pool = RANGE.map((n) => ({ n, w: 1 + (freq[n] || 0) }));
  const out: number[] = [];
  while (out.length < 5) {
    const total = pool.reduce((s, x) => s + x.w, 0);
    let r = Math.random() * total;
    const idx = pool.findIndex((x) => (r -= x.w) < 0);
    out.push(pool.splice(idx === -1 ? pool.length - 1 : idx, 1)[0].n);
  }
  return sortAsc(out);
}

/** Admin-supplied numbers (testing aid). Returns null when invalid. */
export function parseManual(input: string): number[] | null {
  const nums = input.split(/[\s,]+/).filter(Boolean).map(Number);
  if (nums.length !== 5) return null;
  if (nums.some((n) => !Number.isInteger(n) || n < SCORE_MIN || n > SCORE_MAX)) return null;
  if (new Set(nums).size !== 5) return null;
  return sortAsc(nums);
}

/** How many of the winning numbers appear among a user's stored scores. */
export function matchCount(scores: number[], winning: number[]) {
  const s = new Set(scores);
  return winning.filter((n) => s.has(n)).length;
}

export function computeDraw(opts: { winning: number[]; participants: Participant[]; poolTotal: number; carryIn: number }) {
  const { winning, participants, poolTotal, carryIn } = opts;
  const tierPool: Record<3 | 4 | 5, number> = {
    5: round2(poolTotal * TIER_SHARES[5] + carryIn), // jackpot includes rolled-over amount
    4: round2(poolTotal * TIER_SHARES[4]),
    3: round2(poolTotal * TIER_SHARES[3]),
  };
  const entries = participants.map((p) => ({ ...p, matches: matchCount(p.scores, winning) }));
  const winners: DrawWinner[] = [];
  ([5, 4, 3] as const).forEach((t) => {
    const group = entries.filter((e) => e.matches === t);
    group.forEach((e) => winners.push({ userId: e.userId, matches: t, prize: round2(tierPool[t] / group.length) })); // equal split
  });
  const jackpotWinners = winners.filter((w) => w.matches === 5).length;
  return { tierPool, entries, winners, carryOut: jackpotWinners === 0 ? tierPool[5] : 0 };
}
