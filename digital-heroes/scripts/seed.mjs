// Creates demo accounts. Run:  npm run seed   (needs .env.local with Supabase keys)
import { createClient } from '@supabase/supabase-js';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { data: charity } = await sb.from('charities').select('id').eq('slug', 'bright-start').single();

async function ensureUser(email, password, full_name) {
  const { data, error } = await sb.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name, charity_id: charity?.id, charity_percent: 10 } });
  if (error) {
    const { data: list } = await sb.auth.admin.listUsers({ perPage: 1000 });
    const found = list.users.find((u) => u.email === email);
    if (!found) throw error;
    console.log('exists:', email);
    return found.id;
  }
  console.log('created:', email);
  return data.user.id;
}

const adminId = await ensureUser('admin@digitalheroes.test', 'Admin@12345', 'Site Admin');
await sb.from('profiles').update({ role: 'admin' }).eq('id', adminId);

const userId = await ensureUser('user@digitalheroes.test', 'User@12345', 'Demo Subscriber');
const end = new Date(); end.setFullYear(end.getFullYear() + 1);
await sb.from('profiles').update({ plan: 'yearly', subscription_status: 'active', current_period_end: end.toISOString(), charity_id: charity?.id }).eq('id', userId);
const { count } = await sb.from('scores').select('id', { count: 'exact', head: true }).eq('user_id', userId);
if (!count) {
  const day = (n) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);
  await sb.from('scores').insert([[32, 3], [28, 10], [36, 17], [24, 24], [30, 31]].map(([score, d]) => ({ user_id: userId, score, played_on: day(d) })));
}
console.log('\nAdmin  : admin@digitalheroes.test / Admin@12345\nUser   : user@digitalheroes.test  / User@12345');
