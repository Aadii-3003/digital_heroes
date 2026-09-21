import Link from 'next/link';
import { requireProfile, subscription } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { addScore, deleteScore, saveCharity, updateScore, uploadProof } from '@/lib/actions/member';
import { cancelSubscription } from '@/lib/actions/subscription';
import { fmtDate, fmtMonth, money } from '@/lib/format';
import { MAX_CHARITY_PERCENT, MAX_SCORES, MIN_CHARITY_PERCENT, MIN_SCORES_FOR_DRAW, PLANS, SCORE_MAX, SCORE_MIN } from '@/lib/config';
import Flash from '@/components/Flash';

export const dynamic = 'force-dynamic';

const VERIFY: Record<string, [string, string]> = {
  awaiting_proof: ['Upload proof', 'bg-sun/40'],
  submitted: ['Under review', 'bg-plum/10'],
  approved: ['Approved', 'bg-lagoon/15 text-lagoon-dark'],
  rejected: ['Rejected', 'bg-red-100 text-red-700'],
};

export default async function Dashboard({ searchParams }: { searchParams: any }) {
  const p = await requireProfile();
  const sub = subscription(p);
  const sb = createClient();
  const [scoresR, charitiesR, entriesR, winnersR, lastDrawR] = await Promise.all([
    sb.from('scores').select('*').eq('user_id', p.id).order('played_on', { ascending: false }),
    sb.from('charities').select('id,name').order('name'),
    sb.from('draw_entries').select('id,match_count,draws(draw_month)').eq('user_id', p.id),
    sb.from('winners').select('*, draws(draw_month)').eq('user_id', p.id).order('created_at', { ascending: false }),
    sb.from('draws').select('draw_month').order('draw_month', { ascending: false }).limit(1).maybeSingle(),
  ]);
  const scores = scoresR.data || [];
  const charities = charitiesR.data || [];
  const entries = entriesR.data || [];
  const winners = winnersR.data || [];
  const myCharity = charities.find((c) => c.id === p.charity_id);
  const fee = p.plan ? PLANS[p.plan as keyof typeof PLANS].price : PLANS.monthly.price;

  const now = new Date();
  const thisMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
  const nextDraw = lastDrawR.data?.draw_month >= thisMonth ? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)) : new Date(thisMonth);
  const totalWon = winners.reduce((s, w) => s + Number(w.prize_amount), 0);
  const paid = winners.filter((w) => w.payment_status === 'paid').reduce((s, w) => s + Number(w.prize_amount), 0);
  const need = Math.max(0, MIN_SCORES_FOR_DRAW - scores.length);
  const locked = !sub.active;

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <h1 className="text-3xl font-extrabold md:text-4xl">Hi {p.full_name?.split(' ')[0] || 'there'}</h1>
      <div className="mt-5"><Flash sp={searchParams} /></div>

      {/* Subscription */}
      <section className="card flex flex-wrap items-center justify-between gap-5" aria-label="Subscription">
        <div>
          <p className="text-sm font-medium text-plum/60">Subscription</p>
          <div className="mt-1 flex items-center gap-3">
            <span className={`badge px-3 py-1 text-sm ${sub.active ? (sub.cancelling ? 'bg-sun/40' : 'bg-lagoon/15 text-lagoon-dark') : 'bg-red-100 text-red-700'}`}>{sub.label}</span>
            {p.plan && <span className="text-sm text-plum/70">{PLANS[p.plan as keyof typeof PLANS].label} plan</span>}
          </div>
          <p className="mt-2 text-sm text-plum/70">
            {sub.active ? (sub.cancelling ? `Access ends on ${fmtDate(sub.end)}.` : `Renews on ${fmtDate(sub.end)}.`) : sub.label === 'Lapsed' ? `Your access ended on ${fmtDate(sub.end)}.` : 'Subscribe to enter scores and join the draw.'}
          </p>
        </div>
        {sub.active && !sub.cancelling ? (
          <form action={cancelSubscription}><button className="btn btn-danger btn-sm">Cancel subscription</button></form>
        ) : (
          <Link href="/subscribe" className="btn btn-primary">{sub.cancelling ? 'Resubscribe' : 'Subscribe now'}</Link>
        )}
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        {/* Scores */}
        <section className="card" aria-label="Scores">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xl font-bold">Your latest scores</h2>
            <span className="text-sm text-plum/60">{scores.length} of {MAX_SCORES}</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-paper-deep"><div className="h-full rounded-full bg-lagoon transition-all duration-500" style={{ width: `${(scores.length / MAX_SCORES) * 100}%` }} /></div>
          <p className="mt-2 text-sm text-plum/65">{need > 0 ? `Add ${need} more score${need > 1 ? 's' : ''} to be entered in the next draw.` : 'You have all five scores, so you are entered in the next draw.'}</p>

          <form action={addScore} className={`mt-5 grid gap-3 sm:grid-cols-[1fr_1fr_auto] ${locked ? 'pointer-events-none opacity-50' : ''}`}>
            <div><label className="label" htmlFor="score">Stableford score ({SCORE_MIN}–{SCORE_MAX})</label><input id="score" name="score" type="number" min={SCORE_MIN} max={SCORE_MAX} required disabled={locked} className="input" /></div>
            <div><label className="label" htmlFor="played_on">Date played</label><input id="played_on" name="played_on" type="date" max={new Date().toISOString().slice(0, 10)} required disabled={locked} className="input" /></div>
            <button disabled={locked} className="btn btn-primary self-end">Add score</button>
          </form>
          {locked && <p className="mt-2 text-sm text-red-700">Score entry is locked until you have an active subscription.</p>}

          {scores.length === 0 ? (
            <p className="mt-6 rounded-xl bg-paper p-5 text-center text-sm text-plum/65">No scores yet. Add the score from your most recent round.</p>
          ) : (
            <ul className="mt-6 divide-y divide-plum/10">
              {scores.map((s) => (
                <li key={s.id} className="py-3">
                  <details className="group">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-plum font-display text-lg font-bold text-white">{s.score}</span>
                        <span className="font-medium">{fmtDate(s.played_on)}</span>
                      </div>
                      <span className="text-sm font-semibold text-bloom group-open:hidden">Edit</span>
                    </summary>
                    <div className="mt-3 flex flex-wrap items-end gap-2 rounded-xl bg-paper p-3">
                      <form action={updateScore} className="flex flex-wrap items-end gap-2">
                        <input type="hidden" name="id" value={s.id} />
                        <div><label className="label">Score</label><input name="score" type="number" min={SCORE_MIN} max={SCORE_MAX} defaultValue={s.score} className="input w-24" required /></div>
                        <div><label className="label">Date</label><input name="played_on" type="date" defaultValue={s.played_on} className="input" required /></div>
                        <button className="btn btn-dark btn-sm">Save</button>
                      </form>
                      <form action={deleteScore}><input type="hidden" name="id" value={s.id} /><button className="btn btn-danger btn-sm">Delete</button></form>
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="space-y-6">
          {/* Charity */}
          <section className="card" aria-label="Charity">
            <h2 className="text-xl font-bold">Your charity</h2>
            <p className="mt-1 text-sm text-plum/65">Currently supporting <b>{myCharity?.name || 'no one yet'}</b> with {p.charity_percent}% of each payment (about {money((fee * p.charity_percent) / 100)}).</p>
            <form action={saveCharity} className="mt-4 space-y-3">
              <div><label className="label" htmlFor="c">Charity</label>
                <select id="c" name="charity_id" defaultValue={p.charity_id || ''} className="input" required>
                  <option value="" disabled>Choose a charity</option>
                  {charities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select></div>
              <div><label className="label" htmlFor="pct">Share of your fee ({MIN_CHARITY_PERCENT}–{MAX_CHARITY_PERCENT}%)</label>
                <input id="pct" name="charity_percent" type="number" min={MIN_CHARITY_PERCENT} max={MAX_CHARITY_PERCENT} defaultValue={p.charity_percent} className="input" required /></div>
              <button className="btn btn-dark w-full">Save charity</button>
            </form>
            <Link href="/charities" className="mt-3 inline-block text-sm font-semibold text-bloom">Browse charities or donate separately</Link>
          </section>

          {/* Participation */}
          <section className="card" aria-label="Participation">
            <h2 className="text-xl font-bold">Draw participation</h2>
            <dl className="mt-3 grid grid-cols-2 gap-4">
              <div><dd className="font-display text-3xl font-extrabold">{entries.length}</dd><dt className="text-sm text-plum/65">draws entered</dt></div>
              <div><dd className="font-display text-xl font-extrabold">{fmtMonth(nextDraw)}</dd><dt className="text-sm text-plum/65">next draw</dt></div>
            </dl>
            <p className="mt-3 text-sm text-plum/70">{!sub.active ? 'Not entered: subscription inactive.' : need > 0 ? 'Not entered yet: add more scores.' : 'You are entered in the next draw.'}</p>
          </section>
        </div>
      </div>

      {/* Winnings */}
      <section className="card mt-6" aria-label="Winnings">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-xl font-bold">Winnings</h2>
          <dl className="flex gap-8 text-right">
            <div><dd className="font-display text-2xl font-extrabold text-bloom">{money(totalWon)}</dd><dt className="text-xs text-plum/60">total won</dt></div>
            <div><dd className="font-display text-2xl font-extrabold text-lagoon">{money(paid)}</dd><dt className="text-xs text-plum/60">paid out</dt></div>
          </dl>
        </div>
        {winners.length === 0 ? (
          <p className="mt-4 rounded-xl bg-paper p-5 text-center text-sm text-plum/65">No wins yet. Match 3 or more of the monthly numbers to win.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[560px]">
              <thead><tr className="border-b border-plum/10"><th className="th">Draw</th><th className="th">Match</th><th className="th">Prize</th><th className="th">Verification</th><th className="th">Payment</th></tr></thead>
              <tbody>
                {winners.map((w: any) => (
                  <tr key={w.id} className="border-b border-plum/5">
                    <td className="td">{fmtMonth(w.draws?.draw_month)}</td>
                    <td className="td">{w.match_count} numbers</td>
                    <td className="td font-semibold">{money(w.prize_amount)}</td>
                    <td className="td">
                      <span className={`badge ${VERIFY[w.verification_status][1]}`}>{VERIFY[w.verification_status][0]}</span>
                      {['awaiting_proof', 'rejected'].includes(w.verification_status) && (
                        <form action={uploadProof} className="mt-2 flex flex-wrap items-center gap-2">
                          <input type="hidden" name="winner_id" value={w.id} />
                          <input type="file" name="proof" accept="image/png,image/jpeg,image/webp,application/pdf" required className="max-w-[200px] text-xs" aria-label="Score screenshot" />
                          <button className="btn btn-dark btn-sm">{w.verification_status === 'rejected' ? 'Upload again' : 'Upload screenshot'}</button>
                        </form>
                      )}
                    </td>
                    <td className="td"><span className={`badge ${w.payment_status === 'paid' ? 'bg-lagoon/15 text-lagoon-dark' : 'bg-plum/10'}`}>{w.payment_status === 'paid' ? 'Paid' : 'Pending'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-xs text-plum/55">To claim a prize, upload a screenshot of your scores from your golf platform. Prizes are paid after an admin approves it.</p>
          </div>
        )}
      </section>
    </div>
  );
}
