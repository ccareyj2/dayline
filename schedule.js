// The Schedule tab: a day timeline with calendar events, time-blocked tasks, auto-planning and drag-to-move.
import { store, tasksDueOn, overdueTasks } from '../store.js';
import * as cal from '../calendar/index.js';
import { todayKey, addDays, startOfWeek, fromKey, fmtLong, fmtTime, fmtDuration, fmtHourLabel, parseHHMM, toHHMM, minutesOfDay, roundUpMinutes, WEEKDAY_SHORT, diffDays } from '../dates.js';
import { esc, icon, safeColor, ui, toast, haptic } from './dom.js';
import { authBanners } from './views.js';

export const HOUR_H = 56;

export function scheduleDate() {
  return ui.scheduleDate || todayKey();
}

function eventMinutes(ev, key) {
  const dayStart = fromKey(key);
  const dayEnd = fromKey(addDays(key, 1));
  const s = new Date(ev.start);
  const e = new Date(ev.end);
  const start = s < dayStart ? 0 : minutesOfDay(s);
  const end = e >= dayEnd ? 24 * 60 : minutesOfDay(e);
  return [start, Math.max(end, start + 5)];
}

function busyIntervals(key, excludeTaskId = null) {
  const out = [];
  for (const ev of cal.eventsForDay(key)) {
    if (ev.allDay || !ev.busy) continue;
    out.push(eventMinutes(ev, key));
  }
  for (const t of tasksDueOn(store.tasks, key)) {
    if (!t.time || t.id === excludeTaskId) continue;
    const s = parseHHMM(t.time);
    out.push([s, s + (t.duration || store.settings.defaultDuration)]);
  }
  out.sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const iv of out) {
    const last = merged[merged.length - 1];
    if (last && iv[0] <= last[1]) last[1] = Math.max(last[1], iv[1]);
    else merged.push([...iv]);
  }
  return merged;
}

function freeSlots(key, { from, to }, excludeTaskId) {
  const busy = busyIntervals(key, excludeTaskId);
  const free = [];
  let cur = from;
  for (const [s, e] of busy) {
    if (e <= cur) continue;
    if (s >= to) break;
    if (s > cur) free.push({ start: cur, end: Math.min(s, to) });
    cur = Math.max(cur, e);
  }
  if (cur < to) free.push({ start: cur, end: to });
  return free.filter((f) => f.end - f.start >= 5);
}

function planWindow(key) {
  const st = store.settings;
  let from = parseHHMM(st.workStart) ?? 9 * 60;
  const to = parseHHMM(st.workEnd) ?? 17 * 60;
  const today = todayKey();
  if (key === today) from = Math.max(from, roundUpMinutes(minutesOfDay(new Date()) + 5, 15));
  return { from, to };
}

// Suggested start times for one task.
export function suggestSlots(key, duration, excludeTaskId, max = 4) {
  const today = todayKey();
  if (key < today) return [];
  let win = planWindow(key);
  let slots = freeSlots(key, win, excludeTaskId).filter((f) => f.end - f.start >= duration);
  if (!slots.length) {
    // outside work hours as a fallback
    win = { from: key === today ? roundUpMinutes(minutesOfDay(new Date()) + 5, 15) : 7 * 60, to: 22 * 60 };
    slots = freeSlots(key, win, excludeTaskId).filter((f) => f.end - f.start >= duration);
  }
  const out = [];
  for (const s of slots) {
    let t = roundUpMinutes(s.start, 15);
    while (t + duration <= s.end && out.length < max) {
      out.push(t);
      t += Math.max(60, duration);
    }
    if (out.length >= max) break;
  }
  return out;
}

export function unplannedFor(key) {
  const today = todayKey();
  let list = tasksDueOn(store.tasks, key).filter((t) => !t.time);
  if (key === today) list = [...overdueTasks(store.tasks, today).filter((t) => !t.time), ...list];
  return list;
}

export function autoPlan(key) {
  const today = todayKey();
  if (key < today) return { planned: 0, skipped: 0, reason: 'past' };
  const st = store.settings;
  const candidates = unplannedFor(key).sort((a, b) => b.priority - a.priority || (a.date || '').localeCompare(b.date || '') || a.order - b.order);
  if (!candidates.length) return { planned: 0, skipped: 0, reason: 'none' };
  const slots = freeSlots(key, planWindow(key));
  const plan = new Map();
  let skipped = 0;
  for (const t of candidates) {
    const need = t.duration || st.defaultDuration;
    const slot = slots.find((s) => s.end - roundUpMinutes(s.start, 5) >= need);
    if (!slot) {
      skipped++;
      continue;
    }
    const start = roundUpMinutes(slot.start, 5);
    plan.set(t.id, { time: toHHMM(start), duration: need });
    slot.start = start + need;
  }
  if (!plan.size) return { planned: 0, skipped, reason: 'full' };
  store.bulkUpdate([...plan.keys()], (t) => ({ date: key, time: plan.get(t.id).time, duration: t.duration || plan.get(t.id).duration }), 'Auto-plan');
  return { planned: plan.size, skipped, reason: 'ok', ids: [...plan.keys()] };
}

// Side-by-side columns for overlapping blocks.
function layout(items) {
  items.sort((a, b) => a.start - b.start || b.end - a.end);
  const clusters = [];
  let cur = null;
  let curEnd = -1;
  for (const it of items) {
    it.vend = Math.max(it.end, it.start + 25);
    if (!cur || it.start >= curEnd) {
      cur = [];
      clusters.push(cur);
      curEnd = it.vend;
    } else curEnd = Math.max(curEnd, it.vend);
    cur.push(it);
  }
  for (const cl of clusters) {
    const cols = [];
    for (const it of cl) {
      let c = cols.findIndex((end) => end <= it.start);
      if (c === -1) {
        c = cols.length;
        cols.push(it.vend);
      } else cols[c] = it.vend;
      it.col = c;
    }
    for (const it of cl) it.ncols = cols.length;
  }
  return items;
}

function weekStrip(key) {
  const today = todayKey();
  const ws = startOfWeek(key, store.settings.weekStart);
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = addDays(ws, i);
    const has = tasksDueOn(store.tasks, d).length > 0 || cal.eventsForDay(d).length > 0;
    days.push(`<button class="ws-day${d === today ? ' is-today' : ''}${d === key ? ' is-selected' : ''}${has ? ' has-items' : ''}" data-action="pick-day" data-date="${d}" aria-label="${esc(fmtLong(d))}"${d === key ? ' aria-current="date"' : ''}><span class="ws-wd">${WEEKDAY_SHORT[fromKey(d).getDay()].slice(0, 1)}</span><span class="ws-num">${fromKey(d).getDate()}</span><span class="ws-dot"></span></button>`);
  }
  return `<div class="weekstrip" data-swipe="week"><button class="ws-nav" data-action="week-shift" data-delta="-7" aria-label="Previous week">${icon('chev-left', 'sm')}</button><div class="ws-days">${days.join('')}</div><button class="ws-nav" data-action="week-shift" data-delta="7" aria-label="Next week">${icon('chev-right', 'sm')}</button></div>`;
}

function syncPills() {
  const out = [];
  for (const p of cal.PROVIDER_IDS) {
    const s = cal.getStatus(p);
    if (!s.connected) continue;
    const name = p === 'google' ? 'Google' : 'Outlook';
    if (s.needsAuth) continue; // banner covers it
    if (s.expired) out.push(`<button class="sync-pill expired" data-action="cal-connect" data-provider="${p}" aria-label="Refresh ${name} sign-in">${icon('sync')}${name} · refresh</button>`);
    else if (s.syncing) out.push(`<span class="sync-pill spinning">${icon('sync')}${name}</span>`);
    else if (s.error) out.push(`<button class="sync-pill warn" data-action="go" data-view="settings">${icon('alert')}${name}</button>`);
    else out.push(`<button class="sync-pill" data-action="cal-sync" aria-label="Sync ${name} now">${icon('sync')}${name}</button>`);
  }
  if (!out.length && !cal.anyConnected()) out.push(`<button class="sync-pill" data-action="go" data-view="settings">${icon('link')}Connect a calendar</button>`);
  return out.join('');
}

export function renderSchedule() {
  const today = todayKey();
  const key = scheduleDate();
  const st = store.settings;
  const H = HOUR_H;
  const events = cal.eventsForDay(key);
  const allDay = events.filter((e) => e.allDay);
  const timed = events.filter((e) => !e.allDay);
  const dayTasks = store.tasks.filter((t) => t.date === key && t.time);
  const unplanned = unplannedFor(key);

  const items = [];
  for (const ev of timed) {
    const [s, e] = eventMinutes(ev, key);
    items.push({ kind: 'event', start: s, end: e, ev });
  }
  for (const t of dayTasks) {
    const s = parseHHMM(t.time);
    items.push({ kind: 'task', start: s, end: s + (t.duration || st.defaultDuration), t });
  }
  layout(items);

  const blocks = items
    .map((it) => {
      const top = (it.start / 60) * H;
      const height = Math.max(((it.end - it.start) / 60) * H - 2, 22);
      const short = height < 40;
      const gap = 3;
      const style = `top:${top}px;height:${height}px;left:calc(${(it.col / it.ncols) * 100}% + ${gap}px);width:calc(${100 / it.ncols}% - ${gap * 2}px)`;
      if (it.kind === 'event') {
        const ev = it.ev;
        const range = `${fmtTime(it.start)} – ${fmtTime(it.end % (24 * 60))}`;
        const sub = short && it.ncols > 1 ? '' : `<span class="blk-sub">${esc(range)}${!short && ev.location ? ` · ${esc(ev.location)}` : ''}</span>`;
        return `<button class="blk blk-event${short ? ' is-short' : ''}${ev.busy ? '' : ' is-free'}" style="${style};--c:${safeColor(ev.color)}" data-action="open-event" data-key="${esc(ev.key)}"><span class="blk-title">${esc(ev.title)}</span>${sub}</button>`;
      }
      const t = it.t;
      const range = `${fmtTime(it.start)} – ${fmtTime(it.end % (24 * 60))}`;
      const tsub = short && it.ncols > 1 ? '' : `<span class="blk-sub" style="display:block">${esc(range)}</span>`;
      return `<div class="blk blk-task pri-${t.priority}${t.done ? ' is-done' : ''}${short ? ' is-short' : ''}" style="${style}" data-id="${esc(t.id)}" data-start="${it.start}" data-dur="${it.end - it.start}"><button class="check" data-action="toggle" data-id="${esc(t.id)}" role="checkbox" aria-checked="${t.done}" aria-label="Complete: ${esc(t.title)}">${icon('check')}</button><button class="blk-text" data-action="edit" data-id="${esc(t.id)}"><span class="blk-title" style="display:block">${esc(t.title)}</span>${tsub}</button></div>`;
    })
    .join('');

  const hours = [];
  const nowMin = key === today ? minutesOfDay(new Date()) : -999;
  for (let h = 1; h < 24; h++) {
    if (Math.abs(h * 60 - nowMin) < 14) continue; // the "now" label takes this spot
    hours.push(`<div class="tl-hour" style="top:${h * H}px">${fmtHourLabel(h)}</div>`);
  }
  const ws = parseHHMM(st.workStart) ?? 540;
  const we = parseHHMM(st.workEnd) ?? 1020;
  const work = we > ws ? `<div class="tl-work" style="top:${(ws / 60) * H}px;height:${((we - ws) / 60) * H}px"></div>` : '';
  let now = '';
  if (key === today) {
    const nm = minutesOfDay(new Date());
    now = `<div class="tl-now" style="top:${(nm / 60) * H}px"><span class="tl-now-label">${fmtTime(nm, { compact: true })}</span></div>`;
  }

  let body = authBanners();
  body += `<div class="sched-bar">${syncPills()}<span class="spacer"></span></div>`;
  if (allDay.length) body += `<div class="allday">${allDay.map((ev) => `<button class="ev-chip" style="--c:${safeColor(ev.color)}" data-action="open-event" data-key="${esc(ev.key)}"><i class="dot"></i><span class="ev-n">${esc(ev.title)}</span></button>`).join('')}</div>`;
  if (unplanned.length) {
    const canPlan = key >= today;
    const showAll = !!ui.expanded[`tray:${key}`];
    const visible = showAll ? unplanned : unplanned.slice(0, 3);
    const more = unplanned.length - visible.length;
    body += `<div class="tray"><div class="tray-head"><h2>To plan <span class="count">${unplanned.length}</span></h2>${canPlan ? `<button class="btn accent sm" data-action="auto-plan" data-date="${key}">${icon('sparkle', 'sm')} Auto-plan</button>` : ''}</div><ul>${visible
      .map(
        (t) =>
          `<li class="tray-item pri-${t.priority}"><button class="check" data-action="toggle" data-id="${esc(t.id)}" role="checkbox" aria-checked="false" aria-label="Complete: ${esc(t.title)}">${icon('check')}</button><button class="tray-title" data-action="edit" data-id="${esc(t.id)}">${esc(t.title)}<small>${t.date < key ? 'overdue' : fmtDuration(t.duration || st.defaultDuration)}</small></button>${canPlan ? `<button class="pill-btn" data-action="plan-task" data-id="${esc(t.id)}" data-date="${key}">Plan</button>` : ''}</li>`
      )
      .join('')}</ul>${more > 0 ? `<button class="tray-more" data-action="toggle-expand" data-key="tray:${key}">Show ${more} more</button>` : ''}</div>`;
  }
  body += `<div class="timeline" style="--hh:${H}px"><div class="tl-hours" style="height:${24 * H}px">${hours.join('')}</div><div class="tl-grid" style="height:${24 * H}px" data-action="timeline-tap" data-date="${key}">${work}${blocks}${now}</div></div>`;

  const actions = key !== today ? `<button class="pill-btn accent" data-action="pick-day" data-date="${today}">Today</button>` : '';
  const diff = diffDays(today, key);
  const sub = diff === 0 ? `Today · ${fmtLong(key)}` : diff === 1 ? `Tomorrow · ${fmtLong(key)}` : diff === -1 ? `Yesterday · ${fmtLong(key)}` : fmtLong(key);
  const top = `<div class="topbar-inner"><div class="topbar-row"><div class="topbar-titles"><h1 class="title">Schedule</h1><div class="subtitle">${esc(sub)}</div></div><div class="topbar-actions">${actions}<button class="icon-btn" data-action="search" aria-label="Search">${icon('search')}</button><button class="icon-btn" data-action="go" data-view="settings" aria-label="Settings">${icon('settings')}</button></div></div>${weekStrip(key)}</div>`;
  return { top, body, fabDefaults: { date: key } };
}

// Scroll so the useful part of the day is in view.
export function scrollTimelineIntoView() {
  const grid = document.querySelector('.tl-grid');
  if (!grid) return;
  // Tasks waiting to be planned come first.
  if (document.querySelector('.tray')) {
    window.scrollTo(0, 0);
    return;
  }
  const key = scheduleDate();
  const st = store.settings;
  let focusMin = (parseHHMM(st.workStart) ?? 540) - 30;
  if (key === todayKey()) focusMin = Math.max(0, minutesOfDay(new Date()) - 90);
  const firstBlock = [...grid.querySelectorAll('.blk')].map((b) => parseFloat(b.style.top)).sort((a, b) => a - b)[0];
  let y = (focusMin / 60) * HOUR_H;
  if (firstBlock !== undefined && key !== todayKey()) y = Math.min(y, firstBlock - 20);
  const topbar = document.getElementById('topbar');
  const offset = grid.getBoundingClientRect().top + window.scrollY - (topbar ? topbar.offsetHeight : 0) - 8;
  window.scrollTo({ top: Math.max(0, offset + y), behavior: 'instant' in window ? 'instant' : 'auto' });
}

export function minutesFromPointer(grid, clientY) {
  const rect = grid.getBoundingClientRect();
  const y = clientY - rect.top;
  return Math.max(0, Math.min(24 * 60 - 15, Math.floor(((y / HOUR_H) * 60) / 15) * 15));
}

// ---------- drag to move (long-press on touch, drag with a mouse) ----------
export function attachTimelineDrag() {
  const grid = document.querySelector('.tl-grid');
  if (!grid || grid.dataset.dragReady) return;
  grid.dataset.dragReady = '1';
  let drag = null;

  const begin = (blk, clientX, clientY) => {
    const rect = blk.getBoundingClientRect();
    drag = {
      blk,
      id: blk.dataset.id,
      dur: +blk.dataset.dur,
      startMin: +blk.dataset.start,
      grabOffset: clientY - rect.top,
      x0: clientX,
      y0: clientY,
      active: false,
      minutes: +blk.dataset.start,
      label: null,
      timer: null,
    };
  };
  const activate = () => {
    if (!drag) return;
    drag.active = true;
    drag.blk.classList.add('dragging');
    drag.label = document.createElement('span');
    drag.label.className = 'drag-time';
    drag.label.textContent = fmtTime(drag.startMin);
    drag.blk.appendChild(drag.label);
    haptic();
  };
  const move = (clientY) => {
    const rect = grid.getBoundingClientRect();
    const y = clientY - rect.top - drag.grabOffset;
    let m = Math.round(((y / HOUR_H) * 60) / 15) * 15;
    m = Math.max(0, Math.min(24 * 60 - Math.min(drag.dur, 60), m));
    drag.minutes = m;
    drag.blk.style.top = `${(m / 60) * HOUR_H}px`;
    if (drag.label) drag.label.textContent = fmtTime(m);
    const edge = 90;
    if (clientY < edge + 60) window.scrollBy(0, -10);
    else if (clientY > window.innerHeight - edge - 60) window.scrollBy(0, 10);
  };
  const finish = (commit) => {
    if (!drag) return;
    clearTimeout(drag.timer);
    const d = drag;
    drag = null;
    if (!d.active) return;
    ui.suppressClickUntil = Date.now() + 400;
    d.blk.classList.remove('dragging');
    if (d.label) d.label.remove();
    if (commit && d.minutes !== d.startMin) {
      store.updateTask(d.id, { time: toHHMM(d.minutes) }, { undoLabel: 'Moved' });
      toast(`Moved to ${fmtTime(d.minutes)}`, { action: () => store.undo() });
    } else {
      d.blk.style.top = `${(d.startMin / 60) * HOUR_H}px`;
    }
  };

  grid.addEventListener(
    'touchstart',
    (e) => {
      const blk = e.target.closest('.blk-task');
      if (!blk || e.touches.length > 1 || e.target.closest('.check')) return;
      begin(blk, e.touches[0].clientX, e.touches[0].clientY);
      drag.timer = setTimeout(activate, 380);
    },
    { passive: true }
  );
  grid.addEventListener(
    'touchmove',
    (e) => {
      if (!drag) return;
      const t = e.touches[0];
      if (!drag.active) {
        if (Math.abs(t.clientY - drag.y0) > 8 || Math.abs(t.clientX - drag.x0) > 8) {
          clearTimeout(drag.timer);
          drag = null;
        }
        return;
      }
      e.preventDefault();
      move(t.clientY);
    },
    { passive: false }
  );
  grid.addEventListener('touchend', (e) => {
    if (drag && drag.active) e.preventDefault();
    finish(true);
  });
  grid.addEventListener('touchcancel', () => finish(false));
  grid.addEventListener('contextmenu', (e) => {
    if (e.target.closest('.blk-task')) e.preventDefault();
  });

  // Mouse (desktop)
  grid.addEventListener('mousedown', (e) => {
    const blk = e.target.closest('.blk-task');
    if (!blk || e.button !== 0 || e.target.closest('.check')) return;
    begin(blk, e.clientX, e.clientY);
    const onMove = (ev) => {
      if (!drag) return;
      if (!drag.active && (Math.abs(ev.clientY - drag.y0) > 4 || Math.abs(ev.clientX - drag.x0) > 4)) activate();
      if (drag.active) {
        ev.preventDefault();
        move(ev.clientY);
      }
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      finish(true);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  });
}

export function updateNowLine() {
  const line = document.querySelector('.tl-now');
  if (!line) return;
  const nm = minutesOfDay(new Date());
  line.style.top = `${(nm / 60) * HOUR_H}px`;
  const label = line.querySelector('.tl-now-label');
  if (label) label.textContent = fmtTime(nm, { compact: true });
}

// Bring a specific task block into view (after auto-plan or planning one task).
export function scrollToTaskBlock(ids) {
  const blocks = [...document.querySelectorAll('.blk-task')].filter((b) => ids.includes(b.dataset.id));
  if (!blocks.length) return;
  blocks.sort((a, b) => parseFloat(a.style.top) - parseFloat(b.style.top));
  const topbar = document.getElementById('topbar');
  const y = blocks[0].getBoundingClientRect().top + window.scrollY - (topbar ? topbar.offsetHeight : 0) - 70;
  window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
}
