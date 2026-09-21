import { admin } from './supabase/admin';
import { gatherParticipants } from './drawService';

/** Public headline numbers. Fails soft so pages still render before the database is set up. */
export async function getImpact() {
  try {
    const db = admin();
    const [pay, don, members, g] = await Promise.all([
      db.from('payments').select('charity_amount'),
      db.from('donations').select('amount'),
      db.from('profiles').select('id', { count: 'exact', head: true }),
      gatherParticipants(),
    ]);
    const given = (pay.data || []).reduce((s, r: any) => s + Number(r.charity_amount), 0) + (don.data || []).reduce((s, r: any) => s + Number(r.amount), 0);
    return { given, members: members.count || 0, subscribers: g.active.length, pool: g.poolTotal };
  } catch {
    return { given: 0, members: 0, subscribers: 0, pool: 0 };
  }
}
