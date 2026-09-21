import { admin } from '@/lib/supabase/admin';
import { deleteCharityAdmin, saveCharityAdmin } from '@/lib/actions/admin';
import Flash from '@/components/Flash';

export const dynamic = 'force-dynamic';

function Fields({ c }: { c?: any }) {
  const events = (c?.events || []).map((e: any) => `${e.title} | ${e.date} | ${e.location}`).join('\n');
  return (
    <>
      {c && <input type="hidden" name="id" value={c.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className="label">Name</label><input name="name" required defaultValue={c?.name} className="input" /></div>
        <div><label className="label">Category</label><input name="category" defaultValue={c?.category} className="input" placeholder="Education, Health…" /></div>
        <div><label className="label">Slug (URL)</label><input name="slug" defaultValue={c?.slug} className="input" placeholder="auto from name" /></div>
        <div><label className="label">Image URL</label><input name="image_url" defaultValue={c?.image_url || ''} className="input" placeholder="https://…" /></div>
      </div>
      <div><label className="label">Tagline</label><input name="tagline" defaultValue={c?.tagline || ''} className="input" /></div>
      <div><label className="label">Description</label><textarea name="description" rows={3} defaultValue={c?.description || ''} className="input" /></div>
      <div><label className="label">Upcoming events (one per line: title | YYYY-MM-DD | location)</label><textarea name="events" rows={3} defaultValue={events} className="input" /></div>
      <div className="flex gap-6 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" name="featured" defaultChecked={c?.featured} /> Featured on homepage</label>
        <label className="flex items-center gap-2"><input type="checkbox" name="active" defaultChecked={c ? c.active : true} /> Visible to the public</label>
      </div>
    </>
  );
}

export default async function CharitiesAdmin({ searchParams }: { searchParams: any }) {
  const list = (await admin().from('charities').select('*').order('name')).data || [];
  return (
    <div>
      <h1 className="text-3xl font-extrabold">Charity management</h1>
      <div className="mt-5"><Flash sp={searchParams} /></div>
      <details className="card group">
        <summary className="cursor-pointer list-none text-lg font-bold">Add a charity <span className="text-bloom">+</span></summary>
        <form action={saveCharityAdmin} className="mt-4 space-y-3"><Fields /><button className="btn btn-primary">Add charity</button></form>
      </details>
      <div className="mt-6 space-y-3">
        {list.map((c) => (
          <details key={c.id} className="card">
            <summary className="flex cursor-pointer list-none items-center justify-between">
              <span><b className="font-display text-lg">{c.name}</b> <span className="ml-2 text-sm text-plum/55">{c.category}</span></span>
              <span className="flex gap-2">{c.featured && <span className="badge bg-sun/40">Featured</span>}{!c.active && <span className="badge bg-plum/10">Hidden</span>}<span className="text-sm font-semibold text-bloom">Edit</span></span>
            </summary>
            <form action={saveCharityAdmin} className="mt-4 space-y-3"><Fields c={c} /><button className="btn btn-dark">Save changes</button></form>
            <form action={deleteCharityAdmin} className="mt-3"><input type="hidden" name="id" value={c.id} /><button className="btn btn-danger btn-sm">Delete charity</button></form>
          </details>
        ))}
      </div>
    </div>
  );
}
