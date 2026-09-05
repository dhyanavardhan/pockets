// Rupee formatting. The one rule that matters: shorthand is used ONLY when it
// is exact. 1234 must never render as "1.23k" — that lie caused a real bug
// where editing a pocket silently rounded its balance.

const clean = q => Math.abs(q * 100 - Math.round(q * 100)) < 1e-9;

// minShorten: smallest magnitude that's allowed to shorten at all. Callers
// that want the full number spelled out until some larger cutoff (e.g. the
// header balance, kept exact below 10 crore) can raise it past the default.
export function shorten(n, minShorten = 1e3) {
  const a = Math.abs(n);
  const full = () => a.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  if (a < minShorten) return full();
  let u, s;
  if (a >= 1e7) { u = 1e7; s = 'Cr'; }
  else if (a >= 1e5) { u = 1e5; s = 'L'; }
  else if (a >= 1e3) { u = 1e3; s = 'k'; }
  else return full();
  const q = a / u;
  if (clean(q)) return String(Math.round(q * 100) / 100) + s;
  return full();
}

export const money = (n, minShorten) => (n < 0 ? '-₹' : '₹') + shorten(n, minShorten);
export const exact = n => (n < 0 ? '-₹' : '₹') + Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
export const alt = (n, minShorten) => (money(n, minShorten) === exact(n) ? '' : exact(n));

export const UNITS = [
  { v: 1, l: 'Rupees' },
  { v: 1000, l: 'Thousand' },
  { v: 100000, l: 'Lakh' },
  { v: 10000000, l: 'Crore' },
];

// Which unit should a number pre-fill as in an editable field? Never one that
// would round it.
export function bestUnit(v) {
  const a = Math.abs(v);
  for (const u of [1e7, 1e5, 1e3]) if (a >= u) return clean(a / u) ? u : 1;
  return 1;
}

export function splitAmount(v) {
  const u = v ? bestUnit(v) : 1;
  return { n: v ? String(Math.round((v / u) * 100) / 100) : '', u };
}

export function joinAmount(text, unit) {
  const raw = String(text).replace(/[,\s₹]/g, '');
  if (raw === '') return 0;
  if (!/^\d*\.?\d+$/.test(raw)) return NaN;
  return Math.round(parseFloat(raw) * unit * 100) / 100;
}
