import { CURRENCY_SYMBOL } from './config';
export const money = (n: number | string | null | undefined) =>
  `${CURRENCY_SYMBOL}${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
export const fmtDate = (d?: string | Date | null) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
export const fmtMonth = (d?: string | Date | null) =>
  d ? new Date(d).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }) : '—';
