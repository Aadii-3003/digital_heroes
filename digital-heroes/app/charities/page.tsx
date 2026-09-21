import Link from 'next/link';
import { admin } from '@/lib/supabase/admin';
import CharityArt from '@/components/CharityArt';

export const dynamic = 'force-dynamic';

export default async function Charities({ searchParams }: { searchParams: { q?: string; cat?: string } }) {
  const q = (searchParams.q || '').trim();
  const cat = searchParams.cat || '';
  let list: any[] = [];
  let cats: string[] = [];
  try {
    const all = (await admin().from('charities').select('*').eq('active', true).order('name')).data || [];
    cats = [...new Set(all.map((c) => c.category).filter(Boolean))] as string[];
    list = all.filter((c) => (!cat || c.category === cat) && (!q || `${c.name} ${c.tagline} ${c.description}`.toLowerCase().includes(q.toLowerCase())));
  } catch {}
  const chip = (active: boolean) => `badge cursor-pointer px-3.5 py-1.5 text-sm transition ${active ? 'bg-plum text-white' : 'bg-white ring-1 ring-plum/15 hover:bg-paper-deep'}`;

  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <h1 className="text-4xl font-extrabold md:text-5xl">Choose who your subscription helps</h1>
      <p className="mt-3 max-w-2xl text-plum/70">Every subscriber directs part of their fee to a cause. You can change your choice any time from your dashboard.</p>

      <form className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
        <input name="q" defaultValue={q} placeholder="Search charities" className="input sm:max-w-xs" aria-label="Search charities" />
        {cat && <input type="hidden" name="cat" value={cat} />}
        <button className="btn btn-dark">Search</button>
      </form>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link href={q ? `/charities?q=${encodeURIComponent(q)}` : '/charities'} className={chip(!cat)}>All</Link>
        {cats.map((c) => (
          <Link key={c} href={`/charities?cat=${encodeURIComponent(c)}${q ? `&q=${encodeURIComponent(q)}` : ''}`} className={chip(cat === c)}>{c}</Link>
        ))}
      </div>

      {list.length === 0 ? (
        <p className="mt-12 rounded-2xl bg-white p-8 text-center text-plum/70">No charities match that search. Clear the filters to see everyone.</p>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((c) => (
            <Link key={c.id} href={`/charities/${c.slug}`} className="card overflow-hidden p-0 transition hover:-translate-y-1 hover:shadow-lg">
              <CharityArt name={c.name} image={c.image_url} className="h-40 w-full" />
              <div className="p-5">
                <span className="badge bg-lagoon/10 text-lagoon-dark">{c.category}</span>
                <h2 className="mt-2 text-xl font-bold">{c.name}</h2>
                <p className="mt-1 text-sm text-plum/70">{c.tagline}</p>
                {c.events?.length > 0 && <p className="mt-3 text-xs font-semibold text-bloom">{c.events.length} upcoming event{c.events.length > 1 ? 's' : ''}</p>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
