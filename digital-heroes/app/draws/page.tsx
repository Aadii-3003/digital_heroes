import Link from 'next/link';
import { admin } from '@/lib/supabase/admin';
import { getImpact } from '@/lib/stats';
import { fmtMonth, money } from '@/lib/format';
import { MAX_SCORES, MIN_SCORES_FOR_DRAW, PRIZE_POOL_PERCENT, SCORE_MAX, SCORE_MIN, TIER_SHARES } from '@/lib/config';

export const dynamic = 'force-dynamic';

export default async function Draws() {
  let draws: any[] = [];
  const winnerCount: Record<string, number> = {};
  try {
    const db = admin();
    draws = (await db.from('draws').select('*').eq('status', 'published').order('draw_month', { ascending: false }).limit(12)).data || [];
    const w = (await db.from('winners').select('draw_id')).data || [];
    w.forEach((r: any) => (winnerCount[r.draw_id] = (winnerCount[r.draw_id] || 0) + 1));
  } catch {}
  const impact = await getImpact();
  const carry = draws[0]?.jackpot_carry_out || 0;

  return (
    <div className="mx-auto max-w-5xl px-5 py-12">
      <h1 className="text-4xl font-extrabold md:text-5xl">How the monthly draw works</h1>
      <div className="mt-8 grid gap-5 md:grid-cols-2">
        <div className="card">
          <h2 className="text-xl font-bold">Your entries</h2>
          <p className="mt-2 leading-relaxed text-plum/75">Keep your latest {MAX_SCORES} Stableford scores ({SCORE_MIN}–{SCORE_MAX}) on your dashboard, each with the date you played. You need {MIN_SCORES_FOR_DRAW} stored scores and an active subscription to be in the draw.</p>
        </div>
        <div className="card">
          <h2 className="text-xl font-bold">The draw</h2>
          <p className="mt-2 leading-relaxed text-plum/75">Once a month five numbers are drawn, either randomly or weighted by how often members log each score. Your prize tier is how many of those numbers appear among your five scores.</p>
        </div>
      </div>

      <div className="card mt-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><h2 className="text-xl font-bold">Prize tiers</h2><p className="text-sm text-plum/65">{PRIZE_POOL_PERCENT}% of every subscription feeds the pool. Winners in the same tier share it equally.</p></div>
          <div className="text-right"><p className="text-sm text-plum/60">Estimated pool this month</p><p className="font-display text-3xl font-extrabold text-bloom">{money(impact.pool)}</p></div>
        </div>
        <table className="mt-5 w-full">
          <thead><tr className="border-b border-plum/10"><th className="th">Match</th><th className="th">Pool share</th><th className="th">Estimated prize pool</th><th className="th">If nobody wins</th></tr></thead>
          <tbody>
            {([5, 4, 3] as const).map((t) => (
              <tr key={t} className="border-b border-plum/5">
                <td className="td font-semibold">{t} numbers</td>
                <td className="td">{TIER_SHARES[t] * 100}%</td>
                <td className="td">{money(impact.pool * TIER_SHARES[t] + (t === 5 ? Number(carry) : 0))}</td>
                <td className="td">{t === 5 ? 'Jackpot rolls over to next month' : 'Stays with the platform'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {carry > 0 && <p className="mt-3 text-sm font-medium text-bloom">{money(carry)} has rolled over into this month&apos;s jackpot.</p>}
      </div>

      <h2 className="mt-12 text-2xl font-bold">Past results</h2>
      {draws.length === 0 ? (
        <p className="mt-3 rounded-2xl bg-white p-6 text-plum/70">No draws have been published yet. The first results will appear here.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {draws.map((d) => (
            <div key={d.id} className="card flex flex-wrap items-center justify-between gap-4 py-4">
              <div><p className="font-display text-lg font-bold">{fmtMonth(d.draw_month)}</p><p className="text-sm text-plum/60">{winnerCount[d.id] || 0} winners · pool {money(d.pool_total)}</p></div>
              <div className="flex gap-2">{d.winning_numbers.map((n: number) => <span key={n} className="flex h-10 w-10 items-center justify-center rounded-full bg-plum font-display font-bold text-white">{n}</span>)}</div>
            </div>
          ))}
        </div>
      )}
      <div className="mt-10 text-center"><Link href="/signup" className="btn btn-primary px-8 py-3">Join the next draw</Link></div>
    </div>
  );
}
