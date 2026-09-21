import { subscribe } from '@/lib/actions/subscription';
import { requireProfile, subscription } from '@/lib/auth';
import { stripe } from '@/lib/stripe';
import { PLANS, PRIZE_POOL_PERCENT } from '@/lib/config';
import { money } from '@/lib/format';
import Flash from '@/components/Flash';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function Subscribe({ searchParams }: { searchParams: any }) {
  const p = await requireProfile();
  const sub = subscription(p);
  if (sub.active && !sub.cancelling) redirect('/dashboard');
  const saving = Math.round((1 - PLANS.yearly.price / (PLANS.monthly.price * 12)) * 100);

  return (
    <div className="mx-auto max-w-4xl px-5 py-14">
      <h1 className="text-4xl font-extrabold md:text-5xl">Pick your plan</h1>
      <p className="mt-3 max-w-xl text-plum/70">Both plans include score tracking, every monthly draw and your chosen charity. {PRIZE_POOL_PERCENT}% of the fee goes to the prize pool.</p>
      <div className="mt-6"><Flash sp={searchParams} /></div>
      <div className="grid gap-6 md:grid-cols-2">
        {(Object.keys(PLANS) as (keyof typeof PLANS)[]).map((k) => {
          const yearly = k === 'yearly';
          return (
            <form key={k} action={subscribe} className={`card flex flex-col ${yearly ? 'bg-plum text-white ring-0' : ''}`}>
              <input type="hidden" name="plan" value={k} />
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">{PLANS[k].label}</h2>
                {yearly && <span className="badge bg-sun text-plum">Save {saving}%</span>}
              </div>
              <p className="mt-4 font-display text-5xl font-extrabold">{money(PLANS[k].price)}<span className={`text-base font-medium ${yearly ? 'text-white/60' : 'text-plum/50'}`}> / {yearly ? 'year' : 'month'}</span></p>
              {yearly && <p className="mt-1 text-sm text-white/70">That&apos;s {money(Math.round(PLANS.yearly.price / 12))} a month.</p>}
              <ul className={`mt-6 flex-1 space-y-2 text-sm ${yearly ? 'text-white/80' : 'text-plum/75'}`}>
                <li>Log your latest five scores</li><li>Entered in every monthly draw</li><li>Donate to the charity you choose</li>
              </ul>
              <button className={`btn mt-8 w-full py-3 ${yearly ? 'btn-primary' : 'btn-dark'}`}>Subscribe {PLANS[k].label.toLowerCase()}</button>
            </form>
          );
        })}
      </div>
      {!stripe && <p className="mt-6 rounded-xl bg-sun/25 p-4 text-sm">Demo mode: Stripe keys are not configured, so checkout is simulated and activates instantly.</p>}
    </div>
  );
}
