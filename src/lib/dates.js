export const iso = d => d.toISOString().slice(0, 10);
export const today = () => { const d = new Date(); d.setHours(0,0,0,0); return d; };

export function daysTo(dateStr) {
  return Math.round((new Date(dateStr + 'T00:00:00') - today()) / 86400000);
}

export function fmtDate(dateStr) {
  return new Date(dateStr + 'T00:00:00')
    .toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' });
}

export const fmtTime = ts => new Date(ts).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });

export function dayLabel(ts) {
  const d = Math.round((today() - new Date(new Date(ts).setHours(0,0,0,0))) / 86400000);
  if (d === 0) return 'Today';
  if (d === 1) return 'Yesterday';
  return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

// Clamped month arithmetic: 31 Jan + 1 month is 28/29 Feb, never 3 March.
export function addMonths(d, n) {
  const day = d.getDate();
  const x = new Date(d.getFullYear(), d.getMonth() + n, 1);
  const last = new Date(x.getFullYear(), x.getMonth() + 1, 0).getDate();
  x.setDate(Math.min(day, last));
  return x;
}

export function shiftCycle(dateStr, cycle, dir = 1) {
  const d = new Date(dateStr + 'T00:00:00');
  if (cycle === 'weekly') { const x = new Date(d); x.setDate(x.getDate() + 7 * dir); return iso(x); }
  if (cycle === 'quarterly') return iso(addMonths(d, 3 * dir));
  if (cycle === 'yearly') return iso(addMonths(d, 12 * dir));
  return iso(addMonths(d, 1 * dir));
}

export function monthEnd() {
  const t = new Date();
  return iso(new Date(t.getFullYear(), t.getMonth() + 1, 0));
}

export function elapsedLabel(days) {
  if (days < 31) return days + ' day' + (days === 1 ? '' : 's');
  const m = Math.floor(days / 30.44), y = Math.floor(m / 12), rm = m % 12;
  if (!y) return m + ' month' + (m === 1 ? '' : 's');
  return y + ' yr' + (rm ? ' ' + rm + ' mo' : '');
}
