import Link from 'next/link';
import { notFound } from 'next/navigation';
import { admin } from '@/lib/supabase/admin';
import { getProfile } from '@/lib/auth';
import { donate } from '@/lib/actions/member';
import { fmtDate } from '@/lib/format';
import CharityArt from '@/components/CharityArt';
import Flash from '@/components/Flash';

export const dynamic = 'force-dynamic';

export default async function CharityPage({ params, searchParams }: { params: { slug: string }; searchParams: any }) {
  const { data: c } = await admin().from('charities').select('*').eq('slug', params.slug).eq('active', true).maybeSingle();
  if (!c) notFound();
  const me = await getProfile();
  const events: any[] = c.events || [];

  return (
    <div className="mx-auto max-w-5xl px-5 py-12">
      <Link href="/charities" className="text-sm font-medium text-plum/60 hover:text-plum">← All charities</Link>
      <div className="mt-4"><Flash sp={searchParams} /></div>
      <div className="overflow-hidden rounded-3xl bg-white ring-1 ring-plum/[.07]">
        <CharityArt name={c.name} image={c.image_url} className="h-56 w-full md:h-72" />
        <div className="grid gap-10 p-8 md:grid-cols-[1.4fr_1fr] md:p-10">
          <div>
            <span className="badge bg-lagoon/10 text-lagoon-dark">{c.category}</span>
            <h1 className="mt-3 text-4xl font-extrabold">{c.name}</h1>
            <p className="mt-2 text-lg text-plum/70">{c.tagline}</p>
            <p className="mt-6 max-w-prose leading-relaxed">{c.description}</p>

            <h2 className="mt-10 text-xl font-bold">Upcoming events</h2>
            {events.length === 0 ? (
              <p className="mt-2 text-plum/60">No events scheduled right now.</p>
            ) : (
              <ul className="mt-3 divide-y divide-plum/10">
                {events.map((e, i) => (
                  <li key={i} className="flex items-center justify-between py-3">
                    <div><p className="font-semibold">{e.title}</p><p className="text-sm text-plum/60">{e.location}</p></div>
                    <span className="badge bg-sun/30">{fmtDate(e.date)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <aside className="h-fit rounded-2xl bg-paper p-6">
            <h2 className="text-xl font-bold">Make a one-off donation</h2>
            <p className="mt-1 text-sm text-plum/70">Separate from your subscription and not linked to any draw.</p>
            {me ? (
              <form action={donate} className="mt-4 space-y-3">
                <input type="hidden" name="charity_id" value={c.id} />
                <input type="hidden" name="slug" value={c.slug} />
                <label className="label" htmlFor="amount">Amount (₹)</label>
                <input id="amount" name="amount" type="number" min={50} defaultValue={500} className="input" required />
                <button className="btn btn-primary w-full">Donate</button>
              </form>
            ) : (
              <Link href="/login" className="btn btn-dark mt-4 w-full">Log in to donate</Link>
            )}
            <div className="mt-6 border-t border-plum/10 pt-5">
              <p className="text-sm text-plum/70">Want to support them every month?</p>
              <Link href="/signup" className="btn btn-ghost mt-2 w-full">Subscribe and choose {c.name.split(' ')[0]}</Link>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
