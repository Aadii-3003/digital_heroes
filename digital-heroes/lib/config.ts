// Central place for every business rule, so pricing / pool splits are easy to change.
export const CURRENCY_SYMBOL = '₹';
export const CURRENCY_CODE = 'inr';

export const PLANS = {
  monthly: { label: 'Monthly', price: 499, months: 1, interval: 'month' as const },
  yearly: { label: 'Yearly', price: 4999, months: 12, interval: 'year' as const }, // ~17% cheaper
};
export type PlanKey = keyof typeof PLANS;

/** Share of every subscription fee that goes into the prize pool. */
export const PRIZE_POOL_PERCENT = 50;
/** Charity share: users choose between the minimum and maximum. */
export const MIN_CHARITY_PERCENT = 10;
export const MAX_CHARITY_PERCENT = 50;

/** Pool split per match tier (must add up to 1). Only the 5-match tier rolls over. */
export const TIER_SHARES: Record<3 | 4 | 5, number> = { 5: 0.4, 4: 0.35, 3: 0.25 };

export const SCORE_MIN = 1;
export const SCORE_MAX = 45;
export const MAX_SCORES = 5;
/** Scores a subscriber needs on file to be entered into a draw. */
export const MIN_SCORES_FOR_DRAW = 5;

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

/** Monthly prize-pool contribution of one subscriber on a given plan. */
export function monthlyPoolContribution(plan?: string | null) {
  const p = plan === 'yearly' ? PLANS.yearly.price / 12 : PLANS.monthly.price;
  return round2((p * PRIZE_POOL_PERCENT) / 100);
}
export function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
