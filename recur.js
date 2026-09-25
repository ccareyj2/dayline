// Recurrence rules.
// rule = { freq: 'daily'|'weekdays'|'weekly'|'monthly'|'yearly', interval: 1, byDays?: [0..6], anchorDay?: 1..31, anchor?: 'YYYY-MM-DD' }
import { addDays, addMonths, weekday, startOfWeek, diffDays, fromKey, ordinal, WEEKDAY_SHORT, MONTH_SHORT } from './dates.js';

export function normalizeRule(rule) {
  if (!rule || !rule.freq) return null;
  const r = { freq: rule.freq, interval: Math.max(1, Math.min(99, parseInt(rule.interval, 10) || 1)) };
  if (r.freq === 'weekly' && Array.isArray(rule.byDays) && rule.byDays.length) {
    r.byDays = [...new Set(rule.byDays.map(Number).filter((d) => d >= 0 && d <= 6))].sort((a, b) => a - b);
  }
  if ((r.freq === 'monthly' || r.freq === 'yearly') && rule.anchorDay) r.anchorDay = Number(rule.anchorDay);
  if (rule.anchor) r.anchor = rule.anchor;
  return r;
}

// Next occurrence strictly after `fromKey`.
export function nextOccurrence(rule, fromKeyStr) {
  const r = normalizeRule(rule);
  if (!r) return null;
  switch (r.freq) {
    case 'daily':
      return addDays(fromKeyStr, r.interval);
    case 'weekdays': {
      let k = addDays(fromKeyStr, 1);
      while (weekday(k) === 0 || weekday(k) === 6) k = addDays(k, 1);
      return k;
    }
    case 'weekly': {
      if (!r.byDays || !r.byDays.length) return addDays(fromKeyStr, 7 * r.interval);
      const anchorWeek = startOfWeek(r.anchor || fromKeyStr, 0);
      let k = addDays(fromKeyStr, 1);
      for (let i = 0; i < 7 * r.interval * 2 + 7; i++) {
        const weeksApart = Math.floor(diffDays(anchorWeek, startOfWeek(k, 0)) / 7);
        if (r.byDays.includes(weekday(k)) && ((weeksApart % r.interval) + r.interval) % r.interval === 0) return k;
        k = addDays(k, 1);
      }
      return addDays(fromKeyStr, 7 * r.interval);
    }
    case 'monthly':
      return addMonths(fromKeyStr, r.interval, r.anchorDay || fromKey(fromKeyStr).getDate());
    case 'yearly':
      return addMonths(fromKeyStr, 12 * r.interval, r.anchorDay || fromKey(fromKeyStr).getDate());
    default:
      return null;
  }
}

// Next occurrence after `dueKey` that is on/after `todayKey` (skips missed ones).
export function nextFutureOccurrence(rule, dueKey, todayKeyStr) {
  let k = nextOccurrence(rule, dueKey);
  let guard = 0;
  while (k && k < todayKeyStr && guard++ < 2000) k = nextOccurrence(rule, k);
  return k;
}

// First date on/after `fromKeyStr` that matches the rule (used when a rule is set without a date).
export function firstOccurrenceOnOrAfter(rule, fromKeyStr) {
  const r = normalizeRule(rule);
  if (!r) return fromKeyStr;
  if (r.freq === 'weekdays') {
    let k = fromKeyStr;
    while (weekday(k) === 0 || weekday(k) === 6) k = addDays(k, 1);
    return k;
  }
  if (r.freq === 'weekly' && r.byDays && r.byDays.length) {
    let k = fromKeyStr;
    for (let i = 0; i < 7; i++) {
      if (r.byDays.includes(weekday(k))) return k;
      k = addDays(k, 1);
    }
  }
  return fromKeyStr;
}

export function describeRule(rule) {
  const r = normalizeRule(rule);
  if (!r) return '';
  const n = r.interval;
  switch (r.freq) {
    case 'daily':
      return n === 1 ? 'Every day' : `Every ${n} days`;
    case 'weekdays':
      return 'Every weekday';
    case 'weekly': {
      const days = r.byDays && r.byDays.length ? ` on ${r.byDays.map((d) => WEEKDAY_SHORT[d]).join(', ')}` : '';
      if (r.byDays && r.byDays.length === 5 && [1, 2, 3, 4, 5].every((d) => r.byDays.includes(d)) && n === 1) return 'Every weekday';
      return (n === 1 ? 'Every week' : n === 2 ? 'Every 2 weeks' : `Every ${n} weeks`) + days;
    }
    case 'monthly':
      return (n === 1 ? 'Every month' : `Every ${n} months`) + (r.anchorDay ? ` on the ${ordinal(r.anchorDay)}` : '');
    case 'yearly':
      return n === 1 ? 'Every year' : `Every ${n} years`;
    default:
      return '';
  }
}

export function shortRule(rule) {
  const r = normalizeRule(rule);
  if (!r) return '';
  if (r.freq === 'daily') return r.interval === 1 ? 'Daily' : `Every ${r.interval}d`;
  if (r.freq === 'weekdays') return 'Weekdays';
  if (r.freq === 'weekly') {
    if (r.byDays && r.byDays.length) return r.byDays.map((d) => WEEKDAY_SHORT[d].slice(0, 2)).join(' ') + (r.interval > 1 ? ` /${r.interval}w` : '');
    return r.interval === 1 ? 'Weekly' : `Every ${r.interval}w`;
  }
  if (r.freq === 'monthly') return r.interval === 1 ? 'Monthly' : `Every ${r.interval}mo`;
  if (r.freq === 'yearly') return 'Yearly';
  return '';
}

const RRULE_DAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

export function toRRule(rule) {
  const r = normalizeRule(rule);
  if (!r) return null;
  switch (r.freq) {
    case 'daily':
      return `FREQ=DAILY${r.interval > 1 ? `;INTERVAL=${r.interval}` : ''}`;
    case 'weekdays':
      return 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR';
    case 'weekly':
      return `FREQ=WEEKLY${r.interval > 1 ? `;INTERVAL=${r.interval}` : ''}${r.byDays && r.byDays.length ? `;BYDAY=${r.byDays.map((d) => RRULE_DAYS[d]).join(',')}` : ''}`;
    case 'monthly':
      return `FREQ=MONTHLY${r.interval > 1 ? `;INTERVAL=${r.interval}` : ''}`;
    case 'yearly':
      return `FREQ=YEARLY${r.interval > 1 ? `;INTERVAL=${r.interval}` : ''}`;
    default:
      return null;
  }
}

export { MONTH_SHORT };
