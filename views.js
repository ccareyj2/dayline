// List-style views: Today, Upcoming, Lists, a single list, Settings.
import { store, tasksDueOn, overdueTasks, doneOn, sortByDate, sortForDay, localDateOfIso } from '../store.js';
import { todayKey, addDays, fmtDay, fmtTime, fmtDuration, fmtLong, fromKey, relativeFromNow, combine, minutesOfDay, MONTH_LONG, MONTH_SHORT, WEEKDAY_SHORT, toKey } from '../dates.js';
import { shortRule } from '../recur.js';
import * as cal from '../calendar/index.js';
import { esc, icon, safeColor, ui, isStandalone, isIOS } from './dom.js';

export const PRI_LABEL = ['None', 'Low', 'Medium', 'High'];
const PROVIDER_COLOR = { google: 'var(--google)', outlook: 'var(--outlook)' };

// ---------- shared pieces ----------
export function taskRow(t, { showDate = true, showList = true, today = todayKey() } = {}) {
  const list = store.getList(t.listId);
  const meta = [];
  if (t.time) meta.push(`<span class="m m-time">${fmtTime(t.time)}${t.duration ? `<span class="m-dur"> · ${fmtDuration(t.duration)}</span>` : ''}</span>`);
  if (showDate && t.date) {
    const cls = !t.done && t.date < today ? 'is-overdue' : t.date === today ? 'is-today' : '';
    meta.push(`<span class="m m-date ${cls}">${esc(fmtDay(t.date, today))}</span>`);
  }
  if (showList && list && t.listId !== 'inbox') meta.push(`<span class="m"><i class="dot" style="--c:${safeColor(list.color)}"></i>${esc(list.name)}</span>`);
  if (t.recur) meta.push(`<span class="m">${icon('repeat', 'xs')}${esc(shortRule(t.recur))}</span>`);
  if (t.subtasks.length) meta.push(`<span class="m">${icon('subtasks', 'xs')}${t.subtasks.filter((s) => s.done).length}/${t.subtasks.length}</span>`);
  if (t.reminder !== null && !t.done) meta.push(`<span class="m" title="Reminder">${icon('bell', 'xs')}</span>`);
  if (t.cal) meta.push(`<span class="m m-cal" style="--c:${PROVIDER_COLOR[t.cal.provider] || 'var(--text-2)'}">${icon('cal-check', 'xs')}${t.cal.provider === 'google' ? 'Google' : 'Outlook'}</span>`);
  if (t.notes) meta.push(`<span class="m" title="Has notes">${icon('notes', 'xs')}</span>`);
  for (const tag of t.tags) meta.push(`<span class="m m-tag">#${esc(tag)}</span>`);
  return `<li class="task pri-${t.priority}${t.done ? ' is-done' : ''}" data-id="${esc(t.id)}">
    <button class="check" data-action="toggle" data-id="${esc(t.id)}" role="checkbox" aria-checked="${t.done}" aria-label="${t.done ? 'Mark not done' : 'Complete'}: ${esc(t.title)}">${icon('check')}</button>
    <button class="task-main" data-action="edit" data-id="${esc(t.id)}"><span class="task-title">${esc(t.title)}</span><span class="task-meta">${meta.join('')}</span></button>
  </li>`;
}

export function taskList(tasks, opts) {
  return `<ul class="task-list">${tasks.map((t) => taskRow(t, opts)).join('')}</ul>`;
}

function groupHead(title, count, extra = '', cls = '') {
  return `<header class="group-head"><h2 class="${cls}">${esc(title)}</h2>${count !== null && count !== undefined ? `<span class="count">${count}</span>` : ''}<span class="spacer"></span>${extra}</header>`;
}

export function emptyArt() {
  return `<svg class="empty-art" viewBox="0 0 120 80" aria-hidden="true"><path d="M30 55a30 30 0 0160 0z" fill="var(--accent)" opacity=".85"/><path d="M60 14v8M33 25l5 5M87 25l-5 5M20 44h7M93 44h7" stroke="var(--accent)" stroke-width="3" stroke-linecap="round" opacity=".6"/><path d="M10 56h100" stroke="currentColor" stroke-width="3" stroke-linecap="round" opacity=".35"/><path d="M26 66h68M40 74h40" stroke="currentColor" stroke-width="3" stroke-linecap="round" opacity=".16"/></svg>`;
}

function topbar({ title, subtitle = '', actions = '', back = '', below = '' }) {
  return `<div class="topbar-inner">${back}<div class="topbar-row"><div class="topbar-titles"><h1 class="title">${esc(title)}</h1>${subtitle ? `<div class="subtitle">${esc(subtitle)}</div>` : ''}</div><div class="topbar-actions">${actions}<button class="icon-btn" data-action="search" aria-label="Search">${icon('search')}</button><button class="icon-btn" data-action="go" data-view="settings" aria-label="Settings">${icon('settings')}${settingsNeedsAttention() ? '<span class="badge-dot"></span>' : ''}</button></div></div>${below}</div>`;
}

function settingsNeedsAttention() {
  return cal.PROVIDER_IDS.some((p) => {
    const s = cal.getStatus(p);
    return s.connected && (s.needsAuth || s.error);
  });
}

export function authBanners() {
  const out = [];
  for (const p of cal.PROVIDER_IDS) {
    const s = cal.getStatus(p);
    if (!s.connected || !s.needsAuth) continue;
    out.push(`<div class="banner"><div class="banner-icon">${icon('sync')}</div><div class="banner-body"><div class="banner-title">Refresh ${esc(cal.PROVIDER_LABEL[p])}</div><div class="banner-text">${s.queued ? `${s.queued} change${s.queued > 1 ? 's are' : ' is'} waiting to sync. ` : ''}Your sign-in expired — it takes a second.</div><div class="banner-actions"><button class="btn sm" data-action="cal-connect" data-provider="${p}">Sign in again</button></div></div></div>`);
  }
  return out.join('');
}

function installBanner() {
  if (isStandalone() || store.settings.installDismissed || !isIOS()) return '';
  return `<div class="banner"><div class="banner-icon">${icon('add-home')}</div><div class="banner-body"><div class="banner-title">Put Dayline on your Home Screen</div>
    <ol class="install-steps"><li><span>Tap <span class="kbd">···</span> then <span class="kbd">${icon('share', 'xs')} Share</span></span></li><li><span>Choose <span class="kbd">Add to Home Screen</span></span></li><li><span>Keep <b>Open as Web App</b> on, then tap <b>Add</b></span></li></ol>
    </div><button class="x-btn" data-action="dismiss-install" aria-label="Dismiss">${icon('x', 'sm')}</button></div>`;
}

// ---------- Today ----------
function nextUp(today) {
  const now = new Date();
  const items = [];
  for (const ev of cal.eventsForDay(today)) {
    if (ev.allDay) continue;
    const s = new Date(ev.start);
    const e = new Date(ev.end);
    if (e <= now) continue;
    items.push({ kind: 'event', start: s, end: e, title: ev.title, color: ev.color, key: ev.key, sub: ev.calendarName || cal.PROVIDER_LABEL[ev.provider], join: ev.joinUrl });
  }
  for (const t of tasksDueOn(store.tasks, today)) {
    if (!t.time) continue;
    const s = combine(today, t.time);
    const e = new Date(s.getTime() + (t.duration || store.settings.defaultDuration) * 60000);
    if (e <= now) continue;
    items.push({ kind: 'task', start: s, end: e, title: t.title, color: 'var(--accent)', id: t.id, sub: fmtTime(t.time) + (t.duration ? ` · ${fmtDuration(t.duration)}` : '') });
  }
  items.sort((a, b) => a.start - b.start);
  const it = items[0];
  if (!it) return '';
  const ongoing = it.start <= now;
  const when = ongoing ? 'Now' : relativeFromNow(it.start, now);
  const timeRange = `${fmtTime(minutesOfDay(it.start))} – ${fmtTime(minutesOfDay(it.end))}`;
  const attrs = it.kind === 'event' ? `data-action="open-event" data-key="${esc(it.key)}"` : `data-action="edit" data-id="${esc(it.id)}"`;
  return `<button class="card next-up" ${attrs}><span class="nu-bar" style="--c:${it.kind === 'event' ? safeColor(it.color) : 'var(--accent)'}"></span><span class="nu-body"><span class="nu-label">${ongoing ? 'Happening now' : 'Next up'}</span><span class="nu-title" style="display:block">${esc(it.title)}</span><span class="nu-sub" style="display:block">${esc(timeRange)}${it.kind === 'event' ? ` · ${esc(it.sub)}` : ''}</span></span><span class="nu-when">${esc(when)}</span></button>`;
}

function agendaStrip(today) {
  const evs = cal.eventsForDay(today).filter((e) => !e.allDay);
  if (!evs.length) return '';
  const now = new Date();
  return `<div class="agenda-strip" aria-label="Today's events">${evs
    .map((ev) => {
      const past = new Date(ev.end) < now;
      return `<button class="ev-chip" style="--c:${safeColor(ev.color)};${past ? 'opacity:.5' : ''}" data-action="open-event" data-key="${esc(ev.key)}"><i class="dot"></i><span class="ev-t">${fmtTime(minutesOfDay(new Date(ev.start)), { compact: true })}</span><span class="ev-n">${esc(ev.title)}</span></button>`;
    })
    .join('')}</div>`;
}

export function renderToday() {
  const today = todayKey();
  const tasks = store.tasks;
  const overdue = overdueTasks(tasks, today);
  const due = tasksDueOn(tasks, today);
  const done = doneOn(tasks, today);
  const total = due.length + done.length + overdue.length;
  const pct = total ? Math.round((done.length / total) * 100) : 0;

  let html = installBanner() + authBanners();
  if (total) html += `<div class="progress"><div class="progress-bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><span style="width:${pct}%"></span></div><span>${done.length} of ${total} done</span></div>`;
  html += nextUp(today);
  html += agendaStrip(today);

  if (overdue.length) {
    html += `<section class="group">${groupHead('Overdue', overdue.length, `<button class="link-btn" data-action="overdue-to-today">Move to today</button>`, 'is-overdue')}${taskList(overdue, { today })}</section>`;
  }
  if (due.length) {
    html += `<section class="group">${groupHead('Today', due.length)}${taskList(due, { showDate: false, today })}</section>`;
  } else if (!overdue.length) {
    const anyTasks = store.tasks.some((t) => !t.done);
    html += `<div class="empty">${emptyArt()}<h3>${done.length ? 'All done for today' : anyTasks ? 'A clear day' : 'Welcome to Dayline'}</h3><p>${
      done.length ? 'Nice work. Enjoy the rest of your day — or plan tomorrow.' : anyTasks ? 'Nothing is due today. Add something with +, or pull a task in from Lists.' : 'Tap + and type naturally. Dates, times and lists are picked up for you.'
    }</p>${!anyTasks && !done.length ? `<p class="try">Try one:</p><div class="try-examples"><button class="chip" data-action="quick-add" data-text="Call Ana tomorrow 3pm #work">Call Ana tomorrow 3pm #work</button><button class="chip" data-action="quick-add" data-text="Stretch every weekday 7am for 15m">Stretch every weekday 7am for 15m</button></div>` : ''}</div>`;
  }
  if (done.length) {
    const open = !!ui.expanded.doneToday;
    html += `<section class="group"><button class="collapser" data-action="toggle-expand" data-key="doneToday" aria-expanded="${open}">${icon('chev-down', 'sm')}Completed today · ${done.length}</button>${open ? taskList(done, { showDate: false, today }) : ''}</section>`;
  }
  return {
    top: topbar({ title: 'Today', subtitle: fmtLong(today) }),
    body: html,
    fabDefaults: { date: today },
  };
}

// ---------- Upcoming ----------
function eventRows(events) {
  if (!events.length) return '';
  return `<div class="ev-rows">${events
    .map((ev) => {
      const t = ev.allDay ? 'All day' : fmtTime(minutesOfDay(new Date(ev.start)));
      return `<button class="ev-row" style="--c:${safeColor(ev.color)}" data-action="open-event" data-key="${esc(ev.key)}"><span class="ev-bar"></span><span class="ev-time">${esc(t)}</span><span class="ev-name">${esc(ev.title)}</span></button>`;
    })
    .join('')}</div>`;
}

export function renderUpcoming() {
  const today = todayKey();
  const tasks = store.tasks;
  let html = authBanners();
  const overdue = overdueTasks(tasks, today);
  if (overdue.length) html += `<section class="group">${groupHead('Overdue', overdue.length, `<button class="link-btn" data-action="overdue-to-today">Move to today</button>`, 'is-overdue')}${taskList(overdue, { today })}</section>`;
  const DAYS = 14;
  for (let i = 0; i < DAYS; i++) {
    const key = addDays(today, i);
    const due = tasksDueOn(tasks, key);
    const events = cal.eventsForDay(key);
    const label = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : fmtDay(key, today);
    const d = fromKey(key);
    const sub = i < 7 ? `${i < 2 ? `${WEEKDAY_SHORT[d.getDay()]}, ` : ''}${MONTH_SHORT[d.getMonth()]} ${d.getDate()}` : '';
    const head = `<header class="day-head"><h2>${esc(label)}</h2>${sub ? `<span class="day-sub">${esc(sub)}</span>` : ''}<span class="spacer"></span><button class="icon-btn" data-action="quick-add" data-date="${key}" aria-label="Add task on ${esc(label)}">${icon('plus', 'sm')}</button></header>`;
    if (!due.length && !events.length) {
      if (i < 2) html += `<section class="group">${head}<div class="day-empty">Nothing planned.</div></section>`;
      continue;
    }
    html += `<section class="group">${head}${eventRows(events)}${due.length ? taskList(due, { showDate: false, today }) : ''}</section>`;
  }
  const later = tasks.filter((t) => !t.done && t.date && t.date >= addDays(today, DAYS)).sort(sortByDate);
  if (later.length) {
    let curMonth = '';
    let buf = [];
    const flush = () => {
      if (buf.length) html += `<section class="group">${groupHead(curMonth, buf.length)}${taskList(buf, { today })}</section>`;
      buf = [];
    };
    for (const t of later) {
      const d = fromKey(t.date);
      const m = `${MONTH_LONG[d.getMonth()]}${d.getFullYear() !== fromKey(today).getFullYear() ? ` ${d.getFullYear()}` : ''}`;
      if (m !== curMonth) {
        flush();
        curMonth = m;
      }
      buf.push(t);
    }
    flush();
  }
  const undated = tasks.filter((t) => !t.done && !t.date).length;
  if (undated) html += `<p class="hint" style="text-align:center;margin:18px 0">${undated} task${undated > 1 ? 's have' : ' has'} no date — find ${undated > 1 ? 'them' : 'it'} in <button class="link-btn" data-action="go" data-view="lists">Lists</button>.</p>`;
  return { top: topbar({ title: 'Upcoming', subtitle: 'Next two weeks' }), body: html };
}

// ---------- Lists ----------
export function renderLists() {
  const today = todayKey();
  const open = store.tasks.filter((t) => !t.done);
  const cards = [];
  const allCount = open.length;
  const doneCount = store.tasks.filter((t) => t.done).length;
  for (const l of store.lists) {
    const n = open.filter((t) => t.listId === l.id).length;
    const overdue = open.filter((t) => t.listId === l.id && t.date && t.date < today).length;
    cards.push(`<button class="list-card" data-action="open-list" data-id="${esc(l.id)}"><span class="lc-top"><span class="lc-icon" style="--c:${safeColor(l.color)}">${icon(l.id === 'inbox' ? 'inbox' : 'lists')}</span><span class="lc-count">${n}</span></span><span><span class="lc-name" style="display:block">${esc(l.name)}</span><span class="lc-sub" style="display:block">${overdue ? `<span style="color:var(--danger)">${overdue} overdue</span>` : n ? `${n} open` : 'All clear'}</span></span></button>`);
  }
  cards.push(`<button class="list-card" data-action="open-list" data-id="__all"><span class="lc-top"><span class="lc-icon" style="--c:#1F2A44">${icon('today')}</span><span class="lc-count">${allCount}</span></span><span><span class="lc-name" style="display:block">All tasks</span><span class="lc-sub" style="display:block">Everything open</span></span></button>`);
  cards.push(`<button class="list-card" data-action="open-list" data-id="__done"><span class="lc-top"><span class="lc-icon" style="--c:#15803D">${icon('check')}</span><span class="lc-count">${doneCount}</span></span><span><span class="lc-name" style="display:block">Completed</span><span class="lc-sub" style="display:block">Your logbook</span></span></button>`);
  cards.push(`<button class="list-card new" data-action="new-list">${icon('plus', 'sm')} New list</button>`);
  return { top: topbar({ title: 'Lists', subtitle: `${allCount} open task${allCount === 1 ? '' : 's'}` }), body: `<div class="list-grid">${cards.join('')}</div>` };
}

export function renderList(listId) {
  const today = todayKey();
  const back = `<button class="back-btn" data-action="go" data-view="lists">${icon('chev-left', 'sm')}Lists</button>`;
  if (listId === '__done') {
    const done = store.tasks.filter((t) => t.done).sort((a, b) => (a.doneAt < b.doneAt ? 1 : -1)).slice(0, 300);
    let html = '';
    if (!done.length) html = `<div class="empty">${emptyArt()}<h3>Nothing completed yet</h3><p>Finished tasks land here so you can look back on what you got done.</p></div>`;
    else {
      let cur = '';
      let buf = [];
      const flush = () => {
        if (buf.length) html += `<section class="group">${groupHead(cur, buf.length)}${taskList(buf, { showDate: false, today })}</section>`;
        buf = [];
      };
      for (const t of done) {
        const k = localDateOfIso(t.doneAt) || today;
        const label = fmtDay(k, today);
        if (label !== cur) {
          flush();
          cur = label;
        }
        buf.push(t);
      }
      flush();
      html += `<div style="text-align:center;margin-top:18px"><button class="btn soft sm" data-action="clear-completed">${icon('trash', 'sm')} Clear completed</button></div>`;
    }
    return { top: topbar({ title: 'Completed', back }), body: html };
  }
  const isAll = listId === '__all';
  const list = isAll ? { id: '__all', name: 'All tasks' } : store.getList(listId);
  const open = store.tasks.filter((t) => !t.done && (isAll || t.listId === list.id));
  const dated = open.filter((t) => t.date).sort(sortByDate);
  const undated = open.filter((t) => !t.date).sort(sortForDay);
  let html = '';
  if (!open.length) html += `<div class="empty">${emptyArt()}<h3>Nothing here</h3><p>Add a task to ${esc(list.name)} with + — or type <code>#${esc((list.name || '').replace(/\s+/g, '-').toLowerCase())}</code> in any new task.</p></div>`;
  if (dated.length) html += `<section class="group">${groupHead('Scheduled', dated.length)}${taskList(dated, { today, showList: isAll })}</section>`;
  if (undated.length) html += `<section class="group">${groupHead('No date', undated.length)}${taskList(undated, { today, showList: isAll })}</section>`;
  if (!isAll) {
    const done = store.tasks.filter((t) => t.done && t.listId === list.id).sort((a, b) => (a.doneAt < b.doneAt ? 1 : -1));
    if (done.length) {
      const openKey = `done:${list.id}`;
      const exp = !!ui.expanded[openKey];
      html += `<section class="group"><button class="collapser" data-action="toggle-expand" data-key="${esc(openKey)}" aria-expanded="${exp}">${icon('chev-down', 'sm')}Completed · ${done.length}</button>${exp ? taskList(done.slice(0, 100), { today }) : ''}</section>`;
    }
  }
  const actions = !isAll && list.id !== 'inbox' ? `<button class="icon-btn" data-action="edit-list" data-id="${esc(list.id)}" aria-label="Edit list">${icon('edit')}</button>` : '';
  return { top: topbar({ title: list.name, back, actions }), body: html, fabDefaults: isAll ? {} : { listId: list.id } };
}

// ---------- Settings ----------
function selectHtml(name, options, value, attrs = '') {
  return `<select ${attrs} data-setting="${esc(name)}">${options.map(([v, l]) => `<option value="${esc(v)}"${String(v) === String(value) ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
}

export const REMINDER_OPTIONS = [
  ['', 'None'],
  ['0', 'At time of task'],
  ['5', '5 minutes before'],
  ['10', '10 minutes before'],
  ['15', '15 minutes before'],
  ['30', '30 minutes before'],
  ['60', '1 hour before'],
  ['1440', '1 day before'],
];

export const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120, 180, 240].map((m) => [String(m), fmtDuration(m)]);

function timeAgo(ts) {
  if (!ts) return 'never';
  const mins = Math.round((Date.now() - ts) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h} h ago`;
  return `${Math.round(h / 24)} d ago`;
}

function providerCard(p) {
  const s = cal.getStatus(p);
  const color = p === 'google' ? 'var(--google)' : 'var(--outlook)';
  const name = cal.PROVIDER_LABEL[p];
  const cfg = cal.config(p);
  let state = '';
  let stateCls = '';
  if (!s.configured) state = 'Not set up yet — one-time setup';
  else if (!s.connected) state = 'Ready to connect';
  else if (s.needsAuth) {
    state = 'Sign-in expired';
    stateCls = 'warn';
  } else if (s.error) {
    state = s.error;
    stateCls = 'warn';
  } else {
    state = `${s.account ? `${s.account} · ` : ''}synced ${timeAgo(s.lastSync)}`;
    stateCls = 'ok';
  }
  let body = '';
  const redirect = `<label class="field-label">Redirect URI to register</label><div class="redirect-box"><span>${esc(cal.getRedirectUri())}</span><button class="icon-btn" style="width:34px;height:34px" data-action="copy" data-text="${esc(cal.getRedirectUri())}" aria-label="Copy redirect URI">${icon('copy', 'sm')}</button></div>`;
  if (!s.configured || ui.expanded[`cfg:${p}`]) {
    body += `<p class="hint" style="margin:0 2px 4px">${
      p === 'google'
        ? 'Create a free Google Cloud OAuth client (about 15 minutes, once). The setup guide walks you through it.'
        : 'Register Dayline in Microsoft Entra for your work organization (about 15 minutes, once). An admin may need to approve calendar access.'
    }</p>`;
    body += `<label class="field-label" for="cid-${p}">${p === 'google' ? 'Client ID' : 'Application (client) ID'}</label><input id="cid-${p}" class="text-input mono" data-provider-field="${p}:clientId" value="${esc(store.settings[p].clientId || '')}" placeholder="${p === 'google' ? '1234567890-abc….apps.googleusercontent.com' : '00000000-0000-0000-0000-000000000000'}" autocapitalize="off" autocomplete="off" spellcheck="false">`;
    if (p === 'outlook') body += `<label class="field-label" for="tenant-outlook">Directory (tenant) ID or domain</label><input id="tenant-outlook" class="text-input mono" data-provider-field="outlook:tenant" value="${esc(store.settings.outlook.tenant || '')}" placeholder="yourcompany.com" autocapitalize="off" autocomplete="off" spellcheck="false">`;
    if (cfg.clientId && !store.settings[p].clientId) body += `<p class="hint">Using the ID from config.js.</p>`;
    body += redirect;
    body += `<div class="banner-actions"><button class="btn sm" data-action="save-provider" data-provider="${p}">Save</button><a class="btn soft sm" href="help.html#${p}">${icon('info', 'sm')} Setup guide</a></div>`;
  } else if (!s.connected) {
    body += `<button class="btn block" data-action="cal-connect" data-provider="${p}">${icon('link', 'sm')} Connect ${esc(name)}</button><p class="hint">You’ll sign in with ${p === 'google' ? 'Google' : 'Microsoft'} and come right back. <button class="link-btn" data-action="toggle-expand" data-key="cfg:${p}">Edit IDs</button></p>`;
  } else {
    const cals = s.calendars;
    if (s.needsAuth) body += `<button class="btn block" data-action="cal-connect" data-provider="${p}" style="margin-bottom:12px">${icon('sync', 'sm')} Sign in again</button>`;
    if (cals.length) {
      body += `<div class="form-group cal-list">${cals
        .map(
          (c) => `<label class="row"><span class="dot" style="--c:${safeColor(c.color)};width:12px;height:12px"></span><span class="row-label">${esc(c.name)}${c.primary ? ' <small style="display:inline;margin-left:4px">default</small>' : ''}</span><span class="switch"><input type="checkbox" data-cal-toggle="${p}" data-cal-id="${esc(c.id)}" ${cal.isCalendarShown(p, c) ? 'checked' : ''} aria-label="Show ${esc(c.name)}"><span class="switch-ui"></span></span></label>`
        )
        .join('')}</div>`;
      const writable = cals.filter((c) => c.canEdit);
      body += `<label class="field-label">New events go to</label><div class="form-group"><div class="row"><span class="row-label">Calendar</span>${selectHtml(`${p}:defaultCalendar`, writable.map((c) => [c.id, c.name]), cal.defaultCalendarId(p), `data-provider-select="${p}"`)}</div></div>`;
    } else body += `<p class="hint">Calendars will appear after the first sync.</p>`;
    body += `<div class="banner-actions"><button class="btn soft sm" data-action="cal-sync">${icon('sync', 'sm')} Sync now</button><button class="btn soft sm" data-action="cal-disconnect" data-provider="${p}">Disconnect</button></div>`;
  }
  return `<div class="card prov-card"><div class="prov-head"><span class="prov-logo" style="--c:${color}">${icon('cal')}</span><div style="flex:1;min-width:0"><div class="prov-name">${esc(name)}</div><div class="prov-state ${stateCls}">${esc(state)}</div></div></div><div class="prov-body">${body}</div></div>`;
}

export function renderSettings() {
  const st = store.settings;
  const anyConn = cal.anyConnected();
  const autoOpts = [['', 'Off'], ...cal.PROVIDER_IDS.filter((p) => cal.isConnected(p)).map((p) => [p, cal.PROVIDER_LABEL[p]])];
  const notifSupported = 'Notification' in window && 'serviceWorker' in navigator;
  const notifState = notifSupported ? Notification.permission : 'unsupported';
  const lastBackup = store.state.meta.lastBackupAt ? fmtDay(toKey(new Date(store.state.meta.lastBackupAt))) : 'never';
  const html = `
  <section class="settings-section"><h2>Calendars</h2>
    ${providerCard('google')}
    <div style="height:12px"></div>
    ${providerCard('outlook')}
    <p class="hint">Not connected? “Add to calendar” on any task still opens Google Calendar or Outlook with the event filled in — no setup needed.</p>
    <div class="form-group" style="margin-top:12px">
      <div class="row"><span class="row-label">Outlook links open<small>For “Add to calendar” without connecting</small></span>${selectHtml('outlookLinkType', [['work', 'Work or school'], ['personal', 'Outlook.com']], st.outlookLinkType)}</div>
      <div class="row"><span class="row-label">Put timed tasks on my calendar<small>${anyConn ? 'Automatically, for new tasks with a time' : 'Connect a calendar first'}</small></span>${selectHtml('autoCalendar', autoOpts, st.autoCalendar, anyConn ? '' : 'disabled')}</div>
      <label class="row"><span class="row-label">Refresh sign-in automatically<small>Google sign-ins last an hour; Dayline renews them when you open the app</small></span><span class="switch"><input type="checkbox" data-setting-bool="autoRefreshAuth" ${st.autoRefreshAuth ? 'checked' : ''}><span class="switch-ui"></span></span></label>
    </div>
  </section>

  <section class="settings-section"><h2>Planning</h2>
    <div class="form-group">
      <div class="row"><span class="row-label">Work day starts</span><input type="time" data-setting="workStart" value="${esc(st.workStart)}"></div>
      <div class="row"><span class="row-label">Work day ends</span><input type="time" data-setting="workEnd" value="${esc(st.workEnd)}"></div>
      <div class="row"><span class="row-label">Default task length</span>${selectHtml('defaultDuration', DURATION_OPTIONS, st.defaultDuration)}</div>
      <div class="row"><span class="row-label">Week starts on</span>${selectHtml('weekStart', [['0', 'Sunday'], ['1', 'Monday']], st.weekStart)}</div>
    </div>
    <p class="hint">Auto-plan fills open time between your events within these hours.</p>
  </section>

  <section class="settings-section"><h2>Reminders</h2>
    <div class="form-group">
      <div class="row"><span class="row-label">Default reminder</span>${selectHtml('defaultReminder', REMINDER_OPTIONS, st.defaultReminder === null ? '' : st.defaultReminder)}</div>
      <label class="row"><span class="row-label">Notifications while Dayline is open<small>${notifState === 'denied' ? (isIOS() ? 'Blocked — allow in iPhone Settings → Notifications → Dayline' : 'Blocked — allow notifications for this site in your browser settings') : notifState === 'unsupported' ? (isIOS() && !isStandalone() ? 'Add Dayline to your Home Screen first' : 'Not supported in this browser') : 'Also sets the app-icon badge count'}</small></span><span class="switch"><input type="checkbox" data-action-change="toggle-notifications" ${st.notifications && notifState === 'granted' ? 'checked' : ''} ${notifState === 'unsupported' || notifState === 'denied' ? 'disabled' : ''}><span class="switch-ui"></span></span></label>
    </div>
    <p class="hint">Web apps can’t wake your phone on a schedule. For alerts you can rely on, add the task to your calendar — its reminder comes from Google Calendar or Outlook.</p>
  </section>

  <section class="settings-section"><h2>Appearance</h2>
    <div class="form-group"><div class="row"><span class="row-label">Theme</span>${selectHtml('theme', [['auto', 'Match system'], ['light', 'Light'], ['dark', 'Dark']], st.theme)}</div></div>
  </section>

  <section class="settings-section"><h2>Your data</h2>
    <div class="form-group">
      <button class="row row-link" data-action="export"><span class="row-icon" style="--c:#3B7BE8">${icon('download')}</span><span class="row-label">Back up tasks<small>Last backup: ${esc(lastBackup)}</small></span>${icon('chev-right', 'sm')}</button>
      <button class="row row-link" data-action="import"><span class="row-icon" style="--c:#15803D">${icon('upload')}</span><span class="row-label">Restore from backup</span>${icon('chev-right', 'sm')}</button>
      <button class="row row-link" data-action="erase"><span class="row-icon" style="--c:#C62828">${icon('trash')}</span><span class="row-label" style="color:var(--danger)">Erase all tasks</span></button>
    </div>
    <p class="hint">Tasks live on this device only. Back up now and then — especially before switching phones.</p>
    <input type="file" id="import-file" accept="application/json,.json" hidden>
  </section>

  <section class="settings-section"><h2>Help</h2>
    <div class="form-group">
      ${isStandalone() ? '' : `<button class="row row-link" data-action="install-help"><span class="row-icon" style="--c:#E4572E">${icon('add-home')}</span><span class="row-label">Install on iPhone</span>${icon('chev-right', 'sm')}</button>`}
      <a class="row row-link" href="help.html" style="color:inherit;text-decoration:none"><span class="row-icon" style="--c:#64748B">${icon('info')}</span><span class="row-label">Setup guide &amp; tips</span>${icon('chev-right', 'sm')}</a>
      <button class="row row-link" data-action="quick-add-help"><span class="row-icon" style="--c:#8B5CF6">${icon('sparkle')}</span><span class="row-label">Quick-add cheat sheet</span>${icon('chev-right', 'sm')}</button>
    </div>
  </section>
  <p class="about">Dayline 1.0 · Your tasks stay on this device.<br>Calendar data is fetched directly from Google and Microsoft.</p>`;
  const back = `<button class="back-btn" data-action="go-back">${icon('chev-left', 'sm')}Back</button>`;
  return { top: `<div class="topbar-inner">${back}<div class="topbar-row"><div class="topbar-titles"><h1 class="title">Settings</h1></div></div></div>`, body: html, noFab: true };
}

