import Link from 'next/link';
import { admin } from '@/lib/supabase/admin';
import { getImpact } from '@/lib/stats';
import { money, fmtMonth } from '@/lib/format';
import { PLANS, PRIZE_POOL_PERCENT, MIN_CHARITY_PERCENT, TIER_SHARES } from '@/lib/config';
import CharityArt from '@/components/CharityArt';
import Reveal from '@/components/Reveal';

export const dynamic = 'force-dynamic';

const BALL = ['bg-bloom text-white', 'bg-sun text-plum', 'bg-lagoon text-white', 'bg-white text-plum', 'bg-plum-line text-white'];

export default async function Home() {
  let charities: any[] = [];
  let lastDraw: any = null;
  try {
    const db = admin();
    charities = (await db.from('charities').select('*').eq('active', true).order('featured', { ascending: false }).limit(6)).data || [];
    lastDraw = (await db.from('draws').select('*').eq('status', 'published').order('draw_month', { ascending: false }).limit(1).maybeSingle()).data;
  } catch {}
  const impact = await getImpact();
  const featured = charities[0];
  const numbers: number[] = lastDraw?.winning_numbers || [7, 19, 24, 33, 41];

  return (
    <>
      {/* Hero */}
      <section className="bg-plum text-white">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 md:grid-cols-[1.1fr_.9fr] md:py-24">
          <div>
            <h1 className="text-5xl font-extrabold leading-[1.02] md:text-7xl">
              Log your scores.<br />Fund a cause.<br />Win the monthly draw.
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-white/75">
              From {money(PLANS.monthly.price)} a month. At least {MIN_CHARITY_PERCENT}% of your fee goes to a charity you choose, {PRIZE_POOL_PERCENT}% funds the prize pool, and your five latest Stableford scores are your entries.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/signup" className="btn btn-primary px-7 py-3.5 text-base">Subscribe and pick a charity</Link>
              <Link href="/draws" className="btn px-6 py-3.5 text-base text-white ring-1 ring-white/30 hover:bg-white/10">See how the draw works</Link>
            </div>
          </div>

          {/* The one orchestrated moment: the draw drops in ball by ball */}
          <div className="rounded-3xl bg-plum-soft p-8 ring-1 ring-plum-line">
            <p className="text-sm font-medium text-white/60">{lastDraw ? `${fmtMonth(lastDraw.draw_month)} winning numbers` : 'Example draw'}</p>
            <div className="mt-5 flex justify-between gap-2">
              {numbers.map((n, i) => (
                <span key={i} style={{ animationDelay: `${0.35 + i * 0.28}s` }} className={`flex h-16 w-16 animate-drop items-center justify-center rounded-full font-display text-2xl font-extrabold shadow-lg sm:h-[4.5rem] sm:w-[4.5rem] ${BALL[i % 5]}`}>
                  {n}
                </span>
              ))}
            </div>
            <p className="mt-6 text-sm leading-relaxed text-white/70">
              Match 3, 4 or 5 of these against your five stored scores to win. Nobody hits all five? The jackpot rolls into next month.
            </p>
          </div>
        </div>
      </section>

      {/* Live impact */}
      <section className="mx-auto max-w-6xl px-5 py-14">
        <dl className="grid gap-8 sm:grid-cols-3">
          <div><dd className="font-display text-4xl font-extrabold text-bloom">{money(impact.given)}</dd><dt className="mt-1 text-sm text-plum/70">given to charities so far</dt></div>
          <div><dd className="font-display text-4xl font-extrabold text-lagoon">{impact.subscribers}</dd><dt className="mt-1 text-sm text-plum/70">active subscribers this month</dt></div>
          <div><dd className="font-display text-4xl font-extrabold">{money(impact.pool)}</dd><dt className="mt-1 text-sm text-plum/70">in this month&apos;s prize pool</dt></div>
        </dl>
      </section>

      {/* How it works — a real sequence */}
      <section className="mx-auto max-w-6xl px-5 py-10">
        <Reveal>
          <h2 className="max-w-xl text-3xl font-extrabold md:text-4xl">Three steps, then the draw does the rest</h2>
          <ol className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              ['1', 'Subscribe and choose who benefits', `Pick a monthly or yearly plan and a charity. You decide how much of your fee goes to them, from ${MIN_CHARITY_PERCENT}% up.`],
              ['2', 'Add your latest five scores', 'Enter Stableford scores from 1 to 45 with the date you played. A new score replaces your oldest one automatically.'],
              ['3', 'Get entered in the monthly draw', 'Five numbers are drawn each month. The more of them that appear in your scores, the bigger your prize tier.'],
            ].map(([n, t, d]) => (
              <li key={n} className="card">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-plum font-display font-bold text-white">{n}</span>
                <h3 className="mt-4 text-xl font-bold">{t}</h3>
                <p className="mt-2 leading-relaxed text-plum/70">{d}</p>
              </li>
            ))}
          </ol>
        </Reveal>
      </section>

      {/* Prize tiers */}
      <section className="mx-auto max-w-6xl px-5 py-14">
        <div className="grid gap-10 md:grid-cols-[.8fr_1.2fr] md:items-center">
          <div>
            <h2 className="text-3xl font-extrabold md:text-4xl">Every tier is a share of the pool</h2>
            <p className="mt-4 leading-relaxed text-plum/70">Prizes are calculated automatically from the number of active subscribers and split equally when several people win the same tier.</p>
          </div>
          <div className="space-y-3">
            {([5, 4, 3] as const).map((t) => (
              <div key={t} className="card flex items-center gap-5 py-4">
                <div className="w-24 font-display text-lg font-bold">{t} matches</div>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-paper-deep">
                  <div className={`h-full rounded-full ${t === 5 ? 'bg-sun' : t === 4 ? 'bg-bloom' : 'bg-lagoon'}`} style={{ width: `${TIER_SHARES[t] * 100 * 2.2}%` }} />
                </div>
                <div className="w-40 text-right text-sm"><b className="font-display text-lg">{TIER_SHARES[t] * 100}%</b> <span className="text-plum/60">{t === 5 ? 'jackpot, rolls over' : 'of the pool'}</span></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Charity spotlight */}
      {featured && (
        <section className="mx-auto max-w-6xl px-5 py-10">
          <div className="grid overflow-hidden rounded-3xl bg-white ring-1 ring-plum/[.07] md:grid-cols-2">
            <CharityArt name={featured.name} image={featured.image_url} className="min-h-64" />
            <div className="p-8 md:p-10">
              <p className="text-sm font-semibold text-lagoon-dark">Charity spotlight</p>
              <h2 className="mt-2 text-3xl font-extrabold">{featured.name}</h2>
              <p className="mt-3 leading-relaxed text-plum/75">{featured.description}</p>
              <Link href={`/charities/${featured.slug}`} className="btn btn-dark mt-6">Read their story</Link>
            </div>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {charities.slice(1).map((c) => (
              <Link key={c.id} href={`/charities/${c.slug}`} className="group card flex items-center gap-4 p-4 transition hover:-translate-y-0.5 hover:shadow-md">
                <CharityArt name={c.name} image={c.image_url} className="h-16 w-16 shrink-0 rounded-xl" />
                <div><p className="font-display font-bold">{c.name}</p><p className="text-sm text-plum/60">{c.category}</p></div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="mx-auto mt-14 max-w-6xl px-5">
        <div className="rounded-3xl bg-bloom px-8 py-14 text-center text-white md:px-16">
          <h2 className="mx-auto max-w-2xl text-3xl font-extrabold md:text-5xl">Your next round can help someone off the sidelines</h2>
          <p className="mx-auto mt-4 max-w-xl text-white/85">Plans start at {money(PLANS.monthly.price)} a month, or {money(PLANS.yearly.price)} a year. Cancel any time.</p>
          <Link href="/signup" className="btn btn-dark mt-8 px-8 py-3.5 text-base">Start subscribing</Link>
        </div>
      </section>
    </>
  );
}
