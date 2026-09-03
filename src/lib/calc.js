import { daysTo, monthEnd } from './dates';
import { money } from './money';

export const CYC = { weekly:'Weekly', monthly:'Monthly', quarterly:'Every 3 months', yearly:'Yearly' };
export const FREQ = { 12:'monthly', 4:'quarterly', 1:'yearly' };

// --- pockets ---------------------------------------------------------------
export const goalTotal = s => s.pockets.reduce((a, p) => a + p.amount, 0);

// Normal savings is never stored. It is always balance minus the goal pockets,
// which is what keeps the allocation bar honest.
export const normal = s => s.balance - goalTotal(s);

export function allTargets(s, slate = '#8A929C') {
  return [{ id:'normal', name:'Normal savings', color: slate, amount: normal(s) }]
    .concat(s.pockets.map(p => ({ id:p.id, name:p.name, color:p.color, amount:p.amount })));
}

// Required saving rate, not projected completion. "You need ₹6.6k a month"
// prompts an action; "you'll finish in 2028" just tells you you're losing.
export function paceNote(p) {
  if (!p.due) return '';
  const days = daysTo(p.due), rem = p.target - p.amount;
  if (p.target > 0 && rem <= 0) return days >= 0 ? `Done, ${days} days early` : 'Done';
  if (days < 0) return 'Date passed' + (p.target > 0 ? ` · ${money(rem)} short` : '');
  if (days === 0) return 'Due today' + (p.target > 0 ? ` · ${money(rem)} short` : '');
  if (!p.target) return `${days} days left`;
  const months = days / 30.44;
  if (months >= 1) return `${money(Math.ceil(rem / months))} a month to finish on time`;
  const weeks = days / 7;
  if (weeks >= 1) return `${money(Math.ceil(rem / weeks))} a week to finish on time`;
  return `${money(rem)} in ${days} day${days > 1 ? 's' : ''}`;
}

export const isLate = p => p.due && daysTo(p.due) < 0 && !(p.target > 0 && p.amount >= p.target);

// --- loans -----------------------------------------------------------------
export function loanMath(l) {
  const start = new Date(l.start + 'T00:00:00');
  const now = new Date(); now.setHours(0,0,0,0);
  const days = Math.max(0, Math.round((now - start) / 86400000));
  const years = days / 365.25, r = l.rate / 100;
  const paid = (l.payments || []).reduce((a, p) => a + p.amount, 0);
  let interest = 0, total = 0, emi = 0;
  const monthsTotal = l.months || 0;

  if (l.type === 'emi') {
    const i = r / 12, n = monthsTotal || 1;
    emi = i > 0 ? (l.principal * i * Math.pow(1+i, n)) / (Math.pow(1+i, n) - 1) : l.principal / n;
    total = emi * n;
    interest = total - l.principal;
  } else if (l.type === 'compound') {
    const n = l.freq || 1;
    total = l.principal * Math.pow(1 + r/n, n * years);
    interest = total - l.principal;
  } else {
    interest = l.principal * r * years;
    total = l.principal + interest;
  }
  return {
    days, years, interest, total, paid,
    left: Math.max(0, total - paid),
    emi, monthsTotal,
    monthsElapsed: Math.floor(days / 30.44),
  };
}

export const typeLabel = l =>
  l.type === 'emi' ? `EMI over ${l.months} months`
  : l.type === 'compound' ? `Compound, ${FREQ[l.freq || 1]}`
  : 'Simple interest';

// --- subscriptions ---------------------------------------------------------
export function perMonth(s) {
  if (s.cycle === 'weekly') return s.amount * 52 / 12;
  if (s.cycle === 'quarterly') return s.amount / 3;
  if (s.cycle === 'yearly') return s.amount / 12;
  return s.amount;
}

export const dueThisMonth = s => s.next <= monthEnd();

export function paidThisMonth(s) {
  const t = new Date(), y = t.getFullYear(), m = t.getMonth();
  return (s.payments || []).filter(p => {
    const d = new Date(p.at);
    return d.getFullYear() === y && d.getMonth() === m;
  });
}
