// No-setup ways to put a task on a calendar: Google/Outlook "add event" links and .ics files.
import { combine, utcBasic, utcExtended, addDays } from '../dates.js';
import { toRRule } from '../recur.js';

export function taskWindow(task, defaultDuration = 30) {
  if (!task.date) return null;
  if (!task.time) return { allDay: true, startKey: task.date, endKey: addDays(task.date, 1) };
  const start = combine(task.date, task.time);
  const end = new Date(start.getTime() + (task.duration || defaultDuration) * 60000);
  return { allDay: false, start, end };
}

export function eventDetails(task) {
  const parts = [];
  if (task.notes) parts.push(task.notes.trim());
  if (task.subtasks && task.subtasks.length) parts.push(task.subtasks.map((s) => `${s.done ? '☑' : '☐'} ${s.title}`).join('\n'));
  parts.push('— from Dayline');
  return parts.join('\n\n');
}

export function googleTemplateUrl(task, { defaultDuration = 30 } = {}) {
  const w = taskWindow(task, defaultDuration);
  const p = new URLSearchParams({ action: 'TEMPLATE', text: task.title });
  if (w) {
    p.set('dates', w.allDay ? `${w.startKey.replace(/-/g, '')}/${w.endKey.replace(/-/g, '')}` : `${utcBasic(w.start)}/${utcBasic(w.end)}`);
  }
  p.set('details', eventDetails(task));
  const rrule = task.recur ? toRRule(task.recur) : null;
  if (rrule) p.set('recur', `RRULE:${rrule}`);
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

export function outlookComposeUrl(task, { defaultDuration = 30, linkType = 'work' } = {}) {
  const base = linkType === 'personal' ? 'https://outlook.live.com/calendar/deeplink/compose' : 'https://outlook.office.com/calendar/deeplink/compose';
  const w = taskWindow(task, defaultDuration);
  const q = [
    ['path', '/calendar/action/compose'],
    ['rru', 'addevent'],
    ['subject', task.title],
  ];
  if (w) {
    if (w.allDay) {
      q.push(['startdt', w.startKey], ['enddt', w.endKey], ['allday', 'true']);
    } else {
      q.push(['startdt', utcExtended(w.start)], ['enddt', utcExtended(w.end)], ['allday', 'false']);
    }
  }
  q.push(['body', eventDetails(task)]);
  return `${base}?${q.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')}`;
}

function icsEscape(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

// Fold lines longer than 75 octets (RFC 5545 §3.1).
function fold(line) {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const out = [];
  let cur = '';
  let curLen = 0;
  for (const ch of line) {
    const len = new TextEncoder().encode(ch).length;
    const limit = out.length === 0 ? 75 : 74; // continuation lines start with a space
    if (curLen + len > limit) {
      out.push(cur);
      cur = '';
      curLen = 0;
    }
    cur += ch;
    curLen += len;
  }
  out.push(cur);
  return out.map((l, i) => (i === 0 ? l : ' ' + l)).join('\r\n');
}

export function buildICS(task, { defaultDuration = 30 } = {}) {
  const w = taskWindow(task, defaultDuration);
  if (!w) return null;
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Dayline//Dayline 1.0//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${task.id}@dayline`,
    `DTSTAMP:${utcBasic(new Date())}`,
  ];
  if (w.allDay) {
    lines.push(`DTSTART;VALUE=DATE:${w.startKey.replace(/-/g, '')}`, `DTEND;VALUE=DATE:${w.endKey.replace(/-/g, '')}`);
  } else {
    lines.push(`DTSTART:${utcBasic(w.start)}`, `DTEND:${utcBasic(w.end)}`);
  }
  lines.push(`SUMMARY:${icsEscape(task.title)}`, `DESCRIPTION:${icsEscape(eventDetails(task))}`);
  const rrule = task.recur ? toRRule(task.recur) : null;
  if (rrule) lines.push(`RRULE:${rrule}`);
  if (task.reminder !== null && task.reminder !== undefined) {
    lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsEscape(task.title)}`, `TRIGGER:-PT${Math.max(0, task.reminder)}M`, 'END:VALARM');
  }
  lines.push('END:VEVENT', 'END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}

export function icsFileName(task) {
  const slug = task.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'event';
  return `${slug}.ics`;
}
