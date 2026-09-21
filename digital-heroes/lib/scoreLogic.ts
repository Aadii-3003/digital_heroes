import { admin } from './supabase/admin';
import { MAX_SCORES, SCORE_MAX, SCORE_MIN } from './config';

const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(new Date(s).getTime());
const today = () => new Date().toISOString().slice(0, 10);

function validate(score: number, played_on: string): string | null {
  if (!Number.isInteger(score) || score < SCORE_MIN || score > SCORE_MAX) return `Score must be a whole number from ${SCORE_MIN} to ${SCORE_MAX}.`;
  if (!isDate(played_on)) return 'Pick the date you played.';
  if (played_on > today()) return 'The date cannot be in the future.';
  return null;
}

/** Shared by the subscriber dashboard and the admin panel. Returns an error string or null. */
export async function insertScore(userId: string, score: number, played_on: string) {
  const bad = validate(score, played_on);
  if (bad) return bad;
  const db = admin();
  const { data: rows } = await db.from('scores').select('played_on').eq('user_id', userId).order('played_on', { ascending: false });
  const existing = rows || [];
  if (existing.some((r) => r.played_on === played_on)) return 'You already have a score for that date. Edit or delete it instead.';
  if (existing.length >= MAX_SCORES && played_on < existing[existing.length - 1].played_on)
    return `That round is older than your latest ${MAX_SCORES} scores, so it would not be kept.`;
  const { error } = await db.from('scores').insert({ user_id: userId, score, played_on }); // DB trigger trims to latest 5
  return error ? error.message : null;
}

export async function changeScore(userId: string, id: string, score: number, played_on: string) {
  const bad = validate(score, played_on);
  if (bad) return bad;
  const db = admin();
  const { data: clash } = await db.from('scores').select('id').eq('user_id', userId).eq('played_on', played_on).neq('id', id).maybeSingle();
  if (clash) return 'Another score already exists for that date.';
  const { error } = await db.from('scores').update({ score, played_on }).eq('id', id).eq('user_id', userId);
  return error ? error.message : null;
}

export async function removeScore(userId: string, id: string) {
  const { error } = await admin().from('scores').delete().eq('id', id).eq('user_id', userId);
  return error ? error.message : null;
}
