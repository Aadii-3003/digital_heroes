import { admin } from './supabase/admin';
import { subscription } from './auth';
import { MIN_SCORES_FOR_DRAW, monthlyPoolContribution, round2 } from './config';
import { computeDraw, randomNumbers, weightedNumbers } from './draw';

async function fetchAll<T = any>(build: (from: number, to: number) => any): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; ; i += 1000) {
    const { data, error } = await build(i, i + 999);
    if (error) throw new Error(error.message);
    out.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

/** Everyone who currently pays, and the subset who are eligible to be drawn. */
export async function gatherParticipants() {
  const db = admin();
  const profiles = await fetchAll((f, t) =>
    db.from('profiles').select('id,full_name,email,plan,subscription_status,current_period_end').in('subscription_status', ['active', 'cancelled']).order('id').range(f, t)
  );
  const active = profiles.filter((p) => subscription(p).active);
  const activeIds = new Set(active.map((p) => p.id));
  const scoreRows = await fetchAll((f, t) => db.from('scores').select('user_id,score').order('id').range(f, t));
  const byUser: Record<string, number[]> = {};
  scoreRows.forEach((r) => {
    if (activeIds.has(r.user_id)) (byUser[r.user_id] ||= []).push(r.score);
  });
  const participants = active.filter((p) => (byUser[p.id]?.length || 0) >= MIN_SCORES_FOR_DRAW).map((p) => ({ userId: p.id, scores: byUser[p.id] }));
  const poolTotal = round2(active.reduce((s, p) => s + monthlyPoolContribution(p.plan), 0));
  return { active, participants, poolTotal, names: Object.fromEntries(profiles.map((p) => [p.id, p])) };
}

async function carryInFor(month: string) {
  const { data } = await admin().from('draws').select('jackpot_carry_out').eq('status', 'published').lt('draw_month', month).order('draw_month', { ascending: false }).limit(1).maybeSingle();
  return Number(data?.jackpot_carry_out || 0);
}

/** Run (or re-run) a simulation for a month. Nothing is visible to users until published. */
export async function simulateDraw(month: string, mode: 'random' | 'algorithmic', manual: number[] | null) {
  const db = admin();
  const { data: existing } = await db.from('draws').select('id,status').eq('draw_month', month).maybeSingle();
  if (existing?.status === 'published') return 'That month has already been published.';

  const g = await gatherParticipants();
  const carryIn = await carryInFor(month);
  let winning = manual;
  if (!winning) {
    if (mode === 'algorithmic') {
      const freq: Record<number, number> = {};
      g.participants.forEach((p) => p.scores.forEach((s) => (freq[s] = (freq[s] || 0) + 1)));
      winning = weightedNumbers(freq);
    } else winning = randomNumbers();
  }
  const r = computeDraw({ winning, participants: g.participants, poolTotal: g.poolTotal, carryIn });
  const preview = r.winners.map((w) => ({ user_id: w.userId, name: g.names[w.userId]?.full_name || g.names[w.userId]?.email, matches: w.matches, prize: w.prize }));
  const row = {
    draw_month: month,
    mode,
    status: 'simulated',
    winning_numbers: winning,
    subscriber_count: g.active.length,
    participant_count: g.participants.length,
    pool_total: g.poolTotal,
    tier5_pool: r.tierPool[5],
    tier4_pool: r.tierPool[4],
    tier3_pool: r.tierPool[3],
    jackpot_carry_in: carryIn,
    jackpot_carry_out: r.carryOut,
    preview,
  };
  const { error } = await db.from('draws').upsert(row, { onConflict: 'draw_month' });
  return error ? error.message : null;
}

/** Freeze a simulated draw: snapshot entries, create winners, roll the jackpot if nobody hit 5. */
export async function publishDraw(drawId: string) {
  const db = admin();
  const { data: draw } = await db.from('draws').select('*').eq('id', drawId).single();
  if (!draw) return 'Draw not found.';
  if (draw.status === 'published') return 'Already published.';

  const g = await gatherParticipants();
  const carryIn = await carryInFor(draw.draw_month);
  const r = computeDraw({ winning: draw.winning_numbers, participants: g.participants, poolTotal: g.poolTotal, carryIn });

  if (r.entries.length) {
    const { error } = await db.from('draw_entries').upsert(
      r.entries.map((e) => ({ draw_id: drawId, user_id: e.userId, scores: e.scores, match_count: e.matches })),
      { onConflict: 'draw_id,user_id' }
    );
    if (error) return error.message;
  }
  if (r.winners.length) {
    const { error } = await db.from('winners').upsert(
      r.winners.map((w) => ({ draw_id: drawId, user_id: w.userId, match_count: w.matches, prize_amount: w.prize })),
      { onConflict: 'draw_id,user_id' }
    );
    if (error) return error.message;
  }
  const { error } = await db
    .from('draws')
    .update({
      status: 'published',
      published_at: new Date().toISOString(),
      subscriber_count: g.active.length,
      participant_count: g.participants.length,
      pool_total: g.poolTotal,
      tier5_pool: r.tierPool[5],
      tier4_pool: r.tierPool[4],
      tier3_pool: r.tierPool[3],
      jackpot_carry_in: carryIn,
      jackpot_carry_out: r.carryOut,
    })
    .eq('id', drawId);
  return error ? error.message : null;
}
