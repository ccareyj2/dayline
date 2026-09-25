// Natural-language quick add.
// "Call Ana tomorrow at 3pm for 30m #work !high every week"
//   -> { title: 'Call Ana', date, time: '15:00', duration: 30, listId, priority: 3, recur }
import { addDays, addMonths, weekday, todayKey, toKey, fromKey, daysInMonth, diffDays, toHHMM, fmtTime, fmtDay, fmtDuration } from './dates.js';
import { firstOccurrenceOnOrAfter, describeRule } from './recur.js';

const WD = 'sun(?:day)?|mon(?:day)?|tue(?:s(?:day)?)?|wed(?:s|nesday)?|thu(?:r(?:s(?:day)?)?)?|fri(?:day)?|sat(?:urday)?';
const MONTH = 'jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?';
const SEP = '(?:\\s*,\\s*(?:and\\s+)?|\\s+and\\s+|\\s*&\\s*|\\s*\\/\\s*|\\s+)';
const AMPM = '(am|pm|a\\.m\\.|p\\.m\\.)';
const NUMWORDS = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
const PART_OF_DAY = { morning: '09:00', afternoon: '14:00', evening: '18:00', night: '20:00', tonight: '20:00' };

const WD_INDEX = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
const MONTH_INDEX = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };

const wdIndex = (s) => WD_INDEX[s.slice(0, 3).toLowerCase()];
const monthIndex = (s) => MONTH_INDEX[s.slice(0, 3).toLowerCase()];

// Boundary-aware regex: group 1 = boundary prefix, group 2 = the match body, 3+ = body groups.
function rx(body) {
  return new RegExp(`(^|[^\\p{L}\\p{N}_])(${body})(?![\\p{L}\\p{N}_])`, 'giu');
}

function normWord(s) {
  return s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
}

function to24(h, suffix) {
  const pm = /^p/i.test(suffix);
  return (h % 12) + (pm ? 12 : 0);
}

// Hour without am/pm: 1–6 -> afternoon, 7–11 -> morning, 12 -> noon, 13–23 as-is.
function guessHour(h, hadLeadingZero) {
  if (hadLeadingZero || h === 0 || h >= 13) return h;
  if (h >= 1 && h <= 6) return h + 12;
  return h;
}

function nextWeekday(fromKeyStr, wd, includeToday = true) {
  let k = includeToday ? fromKeyStr : addDays(fromKeyStr, 1);
  for (let i = 0; i < 7; i++) {
    if (weekday(k) === wd) return k;
    k = addDays(k, 1);
  }
  return k;
}

function mondayAfter(today) {
  return nextWeekday(today, 1, false);
}

function inferYear(month, day, today) {
  const y = fromKey(today).getFullYear();
  if (day > daysInMonth(y, month)) return null;
  let key = toKey(new Date(y, month, day));
  if (diffDays(key, today) > 30) {
    const y2 = y + 1;
    if (day > daysInMonth(y2, month)) return null;
    key = toKey(new Date(y2, month, day));
  }
  return key;
}

function validDate(y, m0, d) {
  if (m0 < 0 || m0 > 11 || d < 1 || d > daysInMonth(y, m0)) return null;
  return toKey(new Date(y, m0, d));
}

class Scan {
  constructor(text, ignore) {
    this.text = text;
    this.used = new Array(text.length).fill(false);
    this.ignore = ignore;
    this.chips = [];
  }
  working() {
    let s = '';
    for (let i = 0; i < this.text.length; i++) s += this.used[i] ? '\u0000' : this.text[i];
    return s;
  }
  isIgnored(raw) {
    const r = raw.trim().toLowerCase();
    if (this.ignore.has(r)) return true;
    // "Friday" dismissed also dismisses "Friday Night" (and vice versa).
    for (const ig of this.ignore) {
      if (ig.length >= 3 && (r.includes(ig) || ig.includes(r))) return true;
    }
    return false;
  }
  // Try `body` and call handler(groups, raw) for each candidate until it returns a truthy value.
  first(body, handler) {
    const re = rx(body);
    const w = this.working();
    let m;
    while ((m = re.exec(w)) !== null) {
      const start = m.index + m[1].length;
      const end = start + m[2].length;
      const raw = this.text.slice(start, end);
      if (!this.isIgnored(raw)) {
        const ok = handler(m.slice(3), raw);
        if (ok) {
          for (let i = start; i < end; i++) this.used[i] = true;
          return raw;
        }
      }
      re.lastIndex = start + 1;
    }
    return null;
  }
  chip(kind, label, raw) {
    this.chips.push({ kind, label, raw });
  }
  remainder() {
    let s = '';
    for (let i = 0; i < this.text.length; i++) s += this.used[i] ? ' ' : this.text[i];
    return s;
  }
}

const DANGLING = /(?:^|\s)(?:at|on|by|for|from|due|in|the|every|each|and|,|-|–|@)\s*$/i;
const LEADING = /^\s*(?:on|at|by|and|,|-|–)\s+/i;

function cleanTitle(s) {
  let t = s.replace(/\s+/g, ' ').trim();
  let guard = 0;
  while (DANGLING.test(t) && guard++ < 5) t = t.replace(DANGLING, '').trim();
  guard = 0;
  while (LEADING.test(t) && guard++ < 3) t = t.replace(LEADING, '').trim();
  return t.replace(/\s+([,.;:!?])/g, '$1');
}

/**
 * @param {string} text
 * @param {{today?: string, now?: Date, lists?: {id:string,name:string}[], ignore?: string[]}} opts
 */
export function parseQuickAdd(text, opts = {}) {
  const today = opts.today || todayKey();
  const now = opts.now || new Date();
  const lists = opts.lists || [];
  const ignore = new Set((opts.ignore || []).map((s) => s.trim().toLowerCase()));
  const sc = new Scan(text || '', ignore);

  let date = null;
  let time = null;
  let duration = null;
  let recur = null;
  let priority = 0;
  let listId = null;
  const tags = [];
  let impliedTime = null;

  // ---------- recurrence ----------
  const setRecur = (r, raw) => {
    recur = r;
    sc.chip('recur', describeRule(r), raw);
    return true;
  };
  sc.first(`(?:every|each)\\s+(\\d{1,2})\\s+(day|week|month|year)s?`, (g, raw) => {
    const n = parseInt(g[0], 10);
    if (!n) return false;
    const freq = { day: 'daily', week: 'weekly', month: 'monthly', year: 'yearly' }[g[1].toLowerCase()];
    return setRecur({ freq, interval: n }, raw);
  }) ||
    sc.first(`(?:every|each)\\s+other\\s+(day|week|month|year)`, (g, raw) => {
      const freq = { day: 'daily', week: 'weekly', month: 'monthly', year: 'yearly' }[g[0].toLowerCase()];
      return setRecur({ freq, interval: 2 }, raw);
    }) ||
    sc.first(`(?:every|each)\\s+(?:weekday|workday|work\\s+day)s?`, (g, raw) => setRecur({ freq: 'weekdays', interval: 1 }, raw)) ||
    sc.first(`(?:every|each)\\s+((?:${WD})(?:${SEP}(?:${WD}))*)`, (g, raw) => {
      const names = g[0].match(new RegExp(WD, 'gi')) || [];
      const days = [...new Set(names.map(wdIndex))];
      if (!days.length) return false;
      if (days.length === 5 && [1, 2, 3, 4, 5].every((d) => days.includes(d))) return setRecur({ freq: 'weekdays', interval: 1 }, raw);
      return setRecur({ freq: 'weekly', interval: 1, byDays: days.sort((a, b) => a - b) }, raw);
    }) ||
    sc.first(`(?:every|each)\\s+(morning|afternoon|evening|night)`, (g, raw) => {
      impliedTime = PART_OF_DAY[g[0].toLowerCase()];
      return setRecur({ freq: 'daily', interval: 1 }, raw);
    }) ||
    sc.first(`(?:every|each)\\s+(day|week|month|year)`, (g, raw) => {
      const freq = { day: 'daily', week: 'weekly', month: 'monthly', year: 'yearly' }[g[0].toLowerCase()];
      return setRecur({ freq, interval: 1 }, raw);
    }) ||
    sc.first(`(daily|weekly|monthly|yearly|annually|biweekly|fortnightly)`, (g, raw) => {
      const w = g[0].toLowerCase();
      const map = { daily: ['daily', 1], weekly: ['weekly', 1], monthly: ['monthly', 1], yearly: ['yearly', 1], annually: ['yearly', 1], biweekly: ['weekly', 2], fortnightly: ['weekly', 2] };
      const [freq, interval] = map[w];
      return setRecur({ freq, interval }, raw);
    }) ||
    sc.first(`(?:on\\s+)?weekdays`, (g, raw) => setRecur({ freq: 'weekdays', interval: 1 }, raw));

  // ---------- dates ----------
  const setDate = (k, raw, label) => {
    if (!k) return false;
    date = k;
    sc.chip('date', label || fmtDay(k, today), raw);
    return true;
  };
  const PRE = '(?:(?:on|by|due|before)\\s+)?';

  // "tomorrow morning", "friday evening", "this afternoon"
  sc.first(`(this|today|tonight|tomorrow|tmrw|tmr|${WD})\\s+(morning|afternoon|evening|night)`, (g, raw) => {
    const w = g[0].toLowerCase();
    let k = null;
    if (w === 'this' || w === 'today' || w === 'tonight') k = today;
    else if (w.startsWith('tom') || w.startsWith('tm')) k = addDays(today, 1);
    else k = nextWeekday(today, wdIndex(w));
    impliedTime = PART_OF_DAY[g[1].toLowerCase()];
    return setDate(k, raw);
  }) ||
    // ISO 2026-09-30
    sc.first(`${PRE}(\\d{4})-(\\d{1,2})-(\\d{1,2})`, (g, raw) => setDate(validDate(+g[0], +g[1] - 1, +g[2]), raw)) ||
    // Sep 30, September 30th 2026
    sc.first(`${PRE}(${MONTH})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(\\d{4}))?`, (g, raw) => {
      const m0 = monthIndex(g[0]);
      const d = +g[1];
      const k = g[2] ? validDate(+g[2], m0, d) : inferYear(m0, d, today);
      return setDate(k, raw);
    }) ||
    // 30 Sep, 30th of September
    sc.first(`${PRE}(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?(${MONTH})\\.?(?:,?\\s+(\\d{4}))?`, (g, raw) => {
      const m0 = monthIndex(g[1]);
      const d = +g[0];
      const k = g[2] ? validDate(+g[2], m0, d) : inferYear(m0, d, today);
      return setDate(k, raw);
    }) ||
    // 9/30 or 9/30/26
    sc.first(`${PRE}(\\d{1,2})\\/(\\d{1,2})(?:\\/(\\d{4}|\\d{2}))?`, (g, raw) => {
      const m0 = +g[0] - 1;
      const d = +g[1];
      let k;
      if (g[2]) {
        const y = g[2].length === 2 ? 2000 + +g[2] : +g[2];
        k = validDate(y, m0, d);
      } else k = inferYear(m0, d, today);
      return setDate(k, raw);
    }) ||
    sc.first(`${PRE}(?:the\\s+)?day\\s+after\\s+(?:tomorrow|tmrw|tmr)`, (g, raw) => setDate(addDays(today, 2), raw)) ||
    sc.first(`${PRE}(today|tonight|tomorrow|tmrw|tmr)`, (g, raw) => {
      const w = g[0].toLowerCase();
      if (w === 'tonight') impliedTime = PART_OF_DAY.tonight;
      return setDate(w === 'today' || w === 'tonight' ? today : addDays(today, 1), raw);
    }) ||
    // in 2 hours / in 30 min  -> today (or tomorrow) at now+X
    sc.first(`in\\s+(\\d{1,3}|an?|one|two|three)\\s*(hours?|hrs?|h|minutes?|mins?|m)`, (g, raw) => {
      const n = NUMWORDS[g[0].toLowerCase()] || parseInt(g[0], 10);
      if (!n) return false;
      const mins = /^h/i.test(g[1]) ? n * 60 : n;
      if (mins > 24 * 60) return false;
      const t = new Date(now.getTime() + mins * 60000);
      t.setMinutes(Math.ceil(t.getMinutes() / 5) * 5, 0, 0);
      time = toHHMM(t.getHours() * 60 + t.getMinutes());
      sc.chip('time', fmtTime(time), raw);
      return setDate(toKey(t), raw);
    }) ||
    sc.first(`in\\s+(\\d{1,3}|an?|one|two|three|four|five|six|seven|eight|nine|ten)\\s+(day|week|month|year)s?`, (g, raw) => {
      const n = NUMWORDS[g[0].toLowerCase()] || parseInt(g[0], 10);
      const unit = g[1].toLowerCase();
      let k;
      if (unit === 'day') k = addDays(today, n);
      else if (unit === 'week') k = addDays(today, 7 * n);
      else if (unit === 'month') k = addMonths(today, n);
      else k = addMonths(today, 12 * n);
      return setDate(k, raw);
    }) ||
    sc.first(`next\\s+(week|month|year)`, (g, raw) => {
      const unit = g[0].toLowerCase();
      const d = fromKey(today);
      if (unit === 'week') return setDate(mondayAfter(today), raw);
      if (unit === 'month') return setDate(toKey(new Date(d.getFullYear(), d.getMonth() + 1, 1)), raw);
      return setDate(toKey(new Date(d.getFullYear() + 1, 0, 1)), raw);
    }) ||
    sc.first(`${PRE}(?:this\\s+|the\\s+)?weekend`, (g, raw) => {
      const wd = weekday(today);
      return setDate(wd === 0 || wd === 6 ? today : nextWeekday(today, 6), raw);
    }) ||
    sc.first(`${PRE}(?:(?:the\\s+)?end\\s+of\\s+(?:the\\s+)?week|eow)`, (g, raw) => {
      const wd = weekday(today);
      return setDate(wd === 6 || wd === 0 ? nextWeekday(today, 5, false) : nextWeekday(today, 5), raw);
    }) ||
    sc.first(`${PRE}(?:(?:the\\s+)?end\\s+of\\s+(?:the\\s+)?month|eom)`, (g, raw) => {
      const d = fromKey(today);
      return setDate(toKey(new Date(d.getFullYear(), d.getMonth() + 1, 0)), raw);
    }) ||
    sc.first(`(?:(on|this|next|by|due|before)\\s+)?(${WD})`, (g, raw) => {
      const pre = (g[0] || '').toLowerCase();
      const word = g[1].toLowerCase();
      // "sat"/"sun" are common English words; only treat them as dates with a lead-in or the full name.
      if ((word === 'sat' || word === 'sun') && !pre) return false;
      const wd = wdIndex(word);
      if (pre === 'next') {
        const mon = mondayAfter(today);
        return setDate(addDays(mon, (wd + 6) % 7), raw);
      }
      return setDate(nextWeekday(today, wd), raw);
    });

  // ---------- times ----------
  const setTime = (min, raw, dur) => {
    if (min === null || min < 0 || min >= 24 * 60) return false;
    time = toHHMM(min);
    sc.chip('time', fmtTime(time), raw);
    if (dur) {
      duration = dur;
      sc.chip('duration', fmtDuration(dur), raw);
    }
    return true;
  };
  const AT = '(?:(?:at|@|by)\\s*)?';

  if (!time) {
    // ranges: 3-4pm, 9:00-10:30, from 2 to 3pm
    sc.first(`(from\\s+)?(\\d{1,2})(?::([0-5]\\d))?\\s*${AMPM}?\\s*(?:-|–|—|to|until|till|til)\\s*(\\d{1,2})(?::([0-5]\\d))?\\s*${AMPM}?`, (g, raw) => {
      const [from, sh, sm, sx, eh, em, ex] = g;
      if (!(sx || ex || sm || em || from)) return false;
      const shN = +sh;
      const ehN = +eh;
      if (shN > 23 || ehN > 23) return false;
      if ((sx && (shN < 1 || shN > 12)) || (ex && (ehN < 1 || ehN > 12))) return false;
      let end;
      let start;
      if (ex) end = to24(ehN, ex);
      else if (sx) end = to24(ehN, sx);
      else end = guessHour(ehN, eh.length === 2 && eh[0] === '0');
      end = end * 60 + (+em || 0);
      if (sx) start = to24(shN, sx) * 60 + (+sm || 0);
      else if (ex) {
        start = to24(shN, ex) * 60 + (+sm || 0);
        if (start >= end) start = to24(shN, /^p/i.test(ex) ? 'am' : 'pm') * 60 + (+sm || 0);
      } else start = guessHour(shN, sh.length === 2 && sh[0] === '0') * 60 + (+sm || 0);
      if (!ex && sx && end <= start) end = (to24(ehN, /^p/i.test(sx) ? 'am' : 'pm')) * 60 + (+em || 0);
      if (!ex && !sx && end <= start && ehN <= 12) end += 12 * 60;
      const dur = end - start;
      if (dur <= 0 || dur > 16 * 60) return false;
      return setTime(start, raw, dur);
    }) ||
      // 3pm, 3:30 pm, at 10am
      sc.first(`${AT}(\\d{1,2})(?::([0-5]\\d))?\\s*${AMPM}`, (g, raw) => {
        const h = +g[0];
        if (h < 1 || h > 12) return false;
        return setTime(to24(h, g[2]) * 60 + (+g[1] || 0), raw);
      }) ||
      // compact 3p / 10a
      sc.first(`${AT}(\\d{1,2})(?::([0-5]\\d))?(a|p)`, (g, raw) => {
        const h = +g[0];
        if (h < 1 || h > 12) return false;
        return setTime(to24(h, g[2]) * 60 + (+g[1] || 0), raw);
      }) ||
      // 15:00, at 5:30
      sc.first(`${AT}([01]?\\d|2[0-3]):([0-5]\\d)`, (g, raw) => {
        const lead = g[0].length === 2 && g[0][0] === '0';
        return setTime(guessHour(+g[0], lead) * 60 + +g[1], raw);
      }) ||
      // at 3 / @ 7
      sc.first(`(?:at|@)\\s*(\\d{1,2})(?![\\d:.\\/])`, (g, raw) => {
        const h = +g[0];
        if (h < 1 || h > 23) return false;
        return setTime(guessHour(h, g[0].length === 2 && g[0][0] === '0') * 60, raw);
      }) ||
      sc.first(`(?:at\\s+)?(?:noon|midday)`, (g, raw) => setTime(12 * 60, raw)) ||
      sc.first(`in\\s+the\\s+(morning|afternoon|evening)`, (g, raw) => {
        const t = PART_OF_DAY[g[0].toLowerCase()];
        return setTime(parseInt(t, 10) * 60, raw);
      });
  }

  // ---------- duration ----------
  const setDur = (min, raw) => {
    if (!min || min < 5 || min > 16 * 60) return false;
    duration = Math.round(min);
    sc.chip('duration', fmtDuration(duration), raw);
    return true;
  };
  if (!duration) {
    sc.first(`for\\s+(\\d+(?:\\.\\d+)?)\\s*(?:h|hrs?|hours?)(?:\\s*(?:and\\s*)?(\\d{1,2})\\s*(?:m|mins?|minutes?))?`, (g, raw) => setDur(parseFloat(g[0]) * 60 + (+g[1] || 0), raw)) ||
      sc.first(`for\\s+(\\d{1,3})\\s*(?:m|mins?|minutes?)`, (g, raw) => setDur(+g[0], raw)) ||
      sc.first(`for\\s+(?:an?|one)\\s+hour`, (g, raw) => setDur(60, raw)) ||
      sc.first(`for\\s+(?:half\\s+an\\s+hour|a\\s+half\\s+hour)`, (g, raw) => setDur(30, raw)) ||
      sc.first(`(\\d+(?:\\.\\d+)?)(?:h|hr|hrs)(?:\\s*(\\d{1,2})(?:m|min|mins))?`, (g, raw) => setDur(parseFloat(g[0]) * 60 + (+g[1] || 0), raw)) ||
      sc.first(`(\\d{1,3})(?:m|min|mins)`, (g, raw) => setDur(+g[0], raw));
  }

  // ---------- priority ----------
  const setPri = (p, raw) => {
    priority = p;
    sc.chip('priority', ['', 'Low', 'Medium', 'High'][p] + ' priority', raw);
    return true;
  };
  const priRe = /(^|\s)(!!!|!!|!(?:high|hi|h|1|medium|med|m|2|low|lo|l|3)?)(?=\s|$)/gi;
  {
    const w = sc.working();
    let m;
    while ((m = priRe.exec(w)) !== null) {
      const start = m.index + m[1].length;
      const raw = text.slice(start, start + m[2].length);
      if (sc.isIgnored(raw)) continue;
      const t = m[2].toLowerCase();
      let p = 1;
      if (t === '!!!' || /^!(high|hi|h|1)$/.test(t)) p = 3;
      else if (t === '!!' || /^!(medium|med|m|2)$/.test(t)) p = 2;
      for (let i = start; i < start + m[2].length; i++) sc.used[i] = true;
      setPri(p, raw);
      break;
    }
  }

  // ---------- lists & tags ----------
  {
    const tagRe = /(^|\s)#([\p{L}\p{N}][\p{L}\p{N}_-]*)/gu;
    const w = sc.working();
    let m;
    while ((m = tagRe.exec(w)) !== null) {
      const start = m.index + m[1].length;
      const raw = text.slice(start, start + m[2].length + 1);
      if (sc.isIgnored(raw)) continue;
      const word = m[2];
      if (/^\d+$/.test(word)) continue;
      const list = lists.find((l) => normWord(l.name) === normWord(word));
      if (list && !listId) {
        listId = list.id;
        sc.chip('list', list.name, raw);
      } else if (!list) {
        const tag = word.toLowerCase();
        if (!tags.includes(tag)) tags.push(tag);
        sc.chip('tag', '#' + tag, raw);
      } else continue;
      for (let i = start; i < start + raw.length; i++) sc.used[i] = true;
    }
  }

  // ---------- resolve ----------
  if (!time && impliedTime) {
    time = impliedTime;
    if (!sc.chips.some((c) => c.kind === 'time')) {
      const src = sc.chips.find((c) => c.kind === 'date' || c.kind === 'recur');
      sc.chip('time', fmtTime(time), src ? src.raw : '');
    }
  }
  if (recur) {
    if (!date) {
      date = firstOccurrenceOnOrAfter(recur, today);
      // "every day at 7am" typed in the evening starts tomorrow, not overdue today.
      if (date === today && time) {
        const [h, mm] = time.split(':').map(Number);
        if (h * 60 + mm < now.getHours() * 60 + now.getMinutes()) date = firstOccurrenceOnOrAfter(recur, addDays(today, 1));
      }
      const rc = sc.chips.find((c) => c.kind === 'recur');
      sc.chip('date', fmtDay(date, today), rc ? rc.raw : '');
    }
    recur = { ...recur, anchor: date };
    if (recur.freq === 'monthly' || recur.freq === 'yearly') recur.anchorDay = fromKey(date).getDate();
  }
  if (time && !date) {
    // A time without a date means today (or tomorrow if that time has passed).
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const [h, mm] = time.split(':').map(Number);
    date = h * 60 + mm < nowMin - 1 ? addDays(today, 1) : today;
    const tc = sc.chips.find((c) => c.kind === 'time');
    sc.chip('date', fmtDay(date, today), tc ? tc.raw : '');
  }

  let title = cleanTitle(sc.remainder());
  if (!title) title = (text || '').trim();

  const order = ['date', 'time', 'duration', 'recur', 'priority', 'list', 'tag'];
  const chips = sc.chips.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));

  return { title, date, time, duration, priority, listId, tags, recur, chips };
}
