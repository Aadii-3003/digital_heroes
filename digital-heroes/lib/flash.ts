import { redirect } from 'next/navigation';
/** Redirect back to a page with a one-off success (msg) or error message in the URL. */
export function go(path: string, kind: 'msg' | 'error', text: string): never {
  const sep = path.includes('?') ? '&' : '?';
  redirect(`${path}${sep}${kind}=${encodeURIComponent(text)}`);
}
