// Date helpers. Tasks store "floating" local dates ("YYYY-MM-DD") and times ("HH:MM").

export const pad2 = (n) => String(n).padStart(2, '0');

export function toKey(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function fromKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function isKey(v) {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

export function todayKey(now = new Date()) {
  return toKey(now);
}

export function addDays(key, n) {
  const d = fromKey(key);
  d.setDate(d.getDate() + n);
  return toKey(d);
}

export function daysInMonth(y, m0) {
  return new Date(y, m0 + 1, 0).getDate();
}

// Add months, clamping to the end of the month. `anchorDay` keeps e.g. the 31st sticky.
export function addMonths(key, n, anchorDay) {
  const [y, m, d] = key.split('-').map(Number);
  const target = new Date(y, m - 1 + n, 1);
  const day = Math.min(anchorDay || d, daysInMonth(target.getFullYear(), target.getMonth()));
  return toKey(new Date(target.getFullYear(), target.getMonth(), day));
}

export function diffDays(a, b) {
  // whole days from a to b (b - a)
  const [y1, m1, d1] = a.split('-').map(Number);
  const [y2, m2, d2] = b.split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
}

export function weekday(key) {
  return fromKey(key).getDay();
}

export function startOfWeek(key, weekStart = 0) {
  const wd = weekday(key);
  return addDays(key, -((wd - weekStart + 7) % 7));
}

export function isWeekend(key) {
  const wd = weekday(key);
  return wd === 0 || wd === 6;
}

// ---- time ----
export function parseHHMM(t) {
  if (!t) return null;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export function toHHMM(min) {
  min = Math.max(0, Math.min(24 * 60 - 1, Math.round(min)));
  return `${pad2(Math.floor(min / 60))}:${pad2(min % 60)}`;
}

let hour12Cache = null;
export function uses12h() {
  if (hour12Cache === null) {
    try {
      const opts = new Intl.DateTimeFormat(undefined, { hour: 'numeric' }).resolvedOptions();
      hour12Cache = opts.hour12 !== undefined ? opts.hour12 : /am|pm/i.test(new Date(2020, 0, 1, 15).toLocaleTimeString());
    } catch {
      hour12Cache = true;
    }
  }
  return hour12Cache;
}

export function fmtTime(hhmmOrMin, { compact = false } = {}) {
  const min = typeof hhmmOrMin === 'number' ? hhmmOrMin : parseHHMM(hhmmOrMin);
  if (min === null || min === undefined) return '';
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  if (!uses12h()) return `${pad2(h)}:${pad2(m)}`;
  const suffix = h < 12 ? 'AM' : 'PM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  if (compact) return m === 0 ? `${h12}${suffix.toLowerCase()[0]}` : `${h12}:${pad2(m)}${suffix.toLowerCase()[0]}`;
  return m === 0 ? `${h12} ${suffix}` : `${h12}:${pad2(m)} ${suffix}`;
}

export function fmtDateTime(date) {
  return `${fmtDay(toKey(date))} · ${fmtTime(date.getHours() * 60 + date.getMinutes())}`;
}

export function fmtHourLabel(h) {
  if (!uses12h()) return `${pad2(h)}:00`;
  const suffix = h < 12 ? 'AM' : 'PM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12} ${suffix}`;
}

export function fmtDuration(min) {
  if (!min) return '';
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

// ---- labels ----
const WD_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WD_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MON_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MON_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export const WEEKDAY_SHORT = WD_SHORT;
export const WEEKDAY_LONG = WD_LONG;
export const MONTH_SHORT = MON_SHORT;
export const MONTH_LONG = MON_LONG;

export function fmtShort(key, { withYear } = {}) {
  const d = fromKey(key);
  const showYear = withYear ?? d.getFullYear() !== new Date().getFullYear();
  return `${WD_SHORT[d.getDay()]}, ${MON_SHORT[d.getMonth()]} ${d.getDate()}${showYear ? `, ${d.getFullYear()}` : ''}`;
}

export function fmtLong(key) {
  const d = fromKey(key);
  const showYear = d.getFullYear() !== new Date().getFullYear();
  return `${WD_LONG[d.getDay()]}, ${MON_LONG[d.getMonth()]} ${d.getDate()}${showYear ? `, ${d.getFullYear()}` : ''}`;
}

// "Today", "Tomorrow", "Yesterday", weekday name within the next 6 days, otherwise "Thu, Sep 25"
export function fmtDay(key, today = todayKey()) {
  const diff = diffDays(today, key);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff > 1 && diff < 7) return WD_LONG[weekday(key)];
  return fmtShort(key);
}

export function fmtMonthYear(key) {
  const d = fromKey(key);
  return `${MON_LONG[d.getMonth()]} ${d.getFullYear()}`;
}

export function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// ---- instants ----
export function combine(key, hhmm) {
  const d = fromKey(key);
  const min = parseHHMM(hhmm) || 0;
  d.setHours(Math.floor(min / 60), min % 60, 0, 0);
  return d;
}

export function minutesOfDay(date) {
  return date.getHours() * 60 + date.getMinutes();
}

// RFC3339 with the local UTC offset, e.g. 2026-09-24T15:00:00-04:00
export function isoWithOffset(date) {
  const off = -date.getTimezoneOffset();
  const sign = off >= 0 ? '+' : '-';
  const abs = Math.abs(off);
  return `${toKey(date)}T${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}${sign}${pad2(Math.floor(abs / 60))}:${pad2(abs % 60)}`;
}

// Local wall-clock ISO without offset, e.g. 2026-09-24T15:00:00
export function isoLocal(date) {
  return `${toKey(date)}T${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
}

// UTC basic format, e.g. 20260924T190000Z
export function utcBasic(date) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

// UTC extended without millis, e.g. 2026-09-24T19:00:00Z
export function utcExtended(date) {
  return date.toISOString().replace(/\.\d{3}/, '');
}

export function localTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export function relativeFromNow(date, now = new Date()) {
  const diffMin = Math.round((date - now) / 60000);
  const abs = Math.abs(diffMin);
  if (abs < 1) return 'now';
  let txt;
  if (abs < 60) txt = `${abs} min`;
  else if (abs < 60 * 24) {
    const h = Math.floor(abs / 60);
    const m = abs % 60;
    txt = m && h < 3 ? `${h}h ${m}m` : `${h}h`;
  } else txt = `${Math.round(abs / 1440)}d`;
  return diffMin > 0 ? `in ${txt}` : `${txt} ago`;
}

export function roundUpMinutes(min, step = 15) {
  return Math.ceil(min / step) * step;
}
