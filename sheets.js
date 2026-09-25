// Bottom sheets: quick add, task editor, event details, plan-a-time, search, list editor, confirmations, help.
import { store, makeTask, searchTasks, LIST_COLORS, uid } from '../store.js';
import { parseQuickAdd } from '../parse.js';
import { todayKey, addDays, fmtDay, fmtTime, fmtDuration, fmtLong, weekday, parseHHMM, toHHMM, minutesOfDay, fromKey, WEEKDAY_SHORT } from '../dates.js';
import { describeRule, normalizeRule, firstOccurrenceOnOrAfter } from '../recur.js';
import * as cal from '../calendar/index.js';
import { esc, icon, safeColor, openSheet, sheetHead, toast, autosize, offerFile, isIOS, ui } from './dom.js';
import { taskRow, REMINDER_OPTIONS, DURATION_OPTIONS, PRI_LABEL } from './views.js';
import { suggestSlots, scheduleDate } from './schedule.js';

const PRI_COLOR = ['var(--muted)', 'var(--p1)', 'var(--p2)', 'var(--p3)'];
const CHIP_ICON = { date: 'cal', time: 'clock', duration: 'clock', recur: 'repeat', priority: 'flag', list: 'lists', tag: 'hash' };

function nextWeekMonday(today) {
  let k = addDays(today, 1);
  while (weekday(k) !== 1) k = addDays(k, 1);
  return k;
}
function weekendKey(today) {
  const wd = weekday(today);
  if (wd === 6 || wd === 0) return today;
  return addDays(today, 6 - wd);
}

// ============ Quick add ============
export function openQuickAdd(defaults = {}) {
  const today = todayKey();
  let ignore = [];
  let override = {};
  let lastAdded = null;
  const html = `<div class="sheet-handle" aria-hidden="true"></div>
  <div class="qa">
    <div class="qa-input-wrap"><textarea class="qa-input" rows="1" placeholder="Add a task…" enterkeyhint="done" autocapitalize="sentences" aria-label="New task"></textarea><button class="qa-send" data-e="send" disabled aria-label="Add task">${icon('arrow-up')}</button></div>
    <div class="qa-chips" aria-live="polite"></div>
    <div class="qa-tools">
      <button class="chip" data-e="date" data-v="${today}">Today</button>
      <button class="chip" data-e="date" data-v="${addDays(today, 1)}">Tomorrow</button>
      <button class="chip" data-e="date" data-v="${weekendKey(today)}">Weekend</button>
      <button class="chip" data-e="date" data-v="${nextWeekMonday(today)}">Next week</button>
      <span class="chip" style="position:relative">${icon('cal', 'sm')}Date<input type="date" data-e="pick-date" aria-label="Pick a date" style="position:absolute;inset:0;opacity:0;width:100%"></span>
      <span class="chip" style="position:relative">${icon('clock', 'sm')}Time<input type="time" data-e="pick-time" aria-label="Pick a time" style="position:absolute;inset:0;opacity:0;width:100%"></span>
      <button class="chip" data-e="more">${icon('dots', 'sm')}More</button>
    </div>
    <div class="qa-hint">Type naturally: <b>tomorrow 3pm</b> · <b>fri 9-10am</b> · <b>every mon</b> · <b>for 45m</b> · <b>#work</b> · <b>!high</b></div>
    <div class="qa-added" hidden></div>
  </div>`;

  const sheet = openSheet({ id: 'quick-add', html, className: 'kb-aware', label: 'Add task' });
  const el = sheet.el;
  const input = el.querySelector('.qa-input');
  const chipsEl = el.querySelector('.qa-chips');
  const sendBtn = el.querySelector('.qa-send');
  const addedEl = el.querySelector('.qa-added');

  const compute = () => {
    const p = parseQuickAdd(input.value, { today, lists: store.lists, ignore });
    const r = { ...p };
    if (!r.date && defaults.date) r.date = defaults.date;
    if (!r.time && defaults.time && (!r.date || r.date === defaults.date)) r.time = defaults.time;
    if (!r.listId && defaults.listId) r.listId = defaults.listId;
    if (override.date !== undefined) r.date = override.date;
    if (override.time !== undefined) r.time = override.time;
    if (r.time && !r.date) r.date = today;
    return r;
  };

  const renderChips = () => {
    const r = compute();
    const chips = [];
    const parsedKinds = new Set(r.chips.map((c) => c.kind));
    // Explicit/default values not coming from text
    if (r.date && (!parsedKinds.has('date') || override.date !== undefined)) chips.push({ kind: 'date', label: fmtDay(r.date, today), removable: 'date' });
    if (r.time && (!parsedKinds.has('time') || override.time !== undefined)) chips.push({ kind: 'time', label: fmtTime(r.time), removable: 'time' });
    if (r.listId && !parsedKinds.has('list')) chips.push({ kind: 'list', label: store.getList(r.listId).name, removable: null });
    const all = [...r.chips.filter((c) => !(override[c.kind] !== undefined && (c.kind === 'date' || c.kind === 'time'))).map((c) => ({ ...c, fromText: true })), ...chips];
    chipsEl.innerHTML = all
      .map((c) => {
        const style = c.kind === 'priority' ? ` style="--pc:${PRI_COLOR[r.priority]}"` : '';
        const x = c.fromText ? `<button class="qa-x" data-e="ignore" data-raw="${esc(c.raw)}" aria-label="Keep “${esc(c.raw)}” as text">${icon('x')}</button>` : c.removable ? `<button class="qa-x" data-e="clear" data-k="${c.removable}" aria-label="Clear ${c.kind}">${icon('x')}</button>` : '';
        return `<span class="qa-chip kind-${c.kind}"${style}>${icon(CHIP_ICON[c.kind] || 'tag')}${esc(c.label)}${x}</span>`;
      })
      .join('');
    sendBtn.disabled = !input.value.trim();
    for (const b of el.querySelectorAll('[data-e="date"]')) b.classList.toggle('is-on', r.date === b.dataset.v);
  };

  const submit = (openMore = false) => {
    const text = input.value.trim();
    if (!text && !openMore) return;
    const r = compute();
    const st = store.settings;
    const draft = {
      title: r.title || text,
      date: r.date || null,
      time: r.time || null,
      duration: r.duration || null,
      priority: r.priority || 0,
      listId: r.listId || 'inbox',
      tags: r.tags || [],
      recur: r.recur || null,
      reminder: r.time && st.defaultReminder !== null ? st.defaultReminder : null,
    };
    if (draft.recur && draft.date) draft.recur = { ...draft.recur, anchor: draft.date };
    if (openMore) {
      sheet.close('more');
      openEditSheet(null, { draft: text ? draft : { ...draft, title: '' } });
      return;
    }
    const task = store.addTask(draft);
    lastAdded = task;
    input.value = '';
    ignore = [];
    override = {};
    autosize(input);
    renderChips();
    addedEl.hidden = false;
    addedEl.innerHTML = `${icon('check', 'sm')} Added “${esc(task.title)}”${task.date ? ` · ${esc(fmtDay(task.date, today))}${task.time ? ` ${esc(fmtTime(task.time))}` : ''}` : ''} <button class="link-btn" data-e="undo" style="margin-left:6px">Undo</button>`;
    input.focus();
  };

  input.addEventListener('input', () => {
    autosize(input);
    addedEl.hidden = true;
    renderChips();
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      submit();
    } else if (e.key === 'Escape') sheet.close('escape');
  });
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-e]');
    if (!b) return;
    const k = b.dataset.e;
    if (k === 'send') submit();
    else if (k === 'more') submit(true);
    else if (k === 'date') {
      override.date = override.date === b.dataset.v ? undefined : b.dataset.v;
      renderChips();
      input.focus();
    } else if (k === 'ignore') {
      ignore.push(b.dataset.raw);
      renderChips();
      input.focus();
    } else if (k === 'clear') {
      if (b.dataset.k === 'date') {
        override.date = null;
        override.time = null;
      } else override[b.dataset.k] = null;
      renderChips();
    } else if (k === 'undo' && lastAdded) {
      store.undo();
      addedEl.hidden = true;
      lastAdded = null;
    }
  });
  el.addEventListener('change', (e) => {
    const t = e.target;
    if (t.dataset.e === 'pick-date') {
      override.date = t.value || null;
      renderChips();
    } else if (t.dataset.e === 'pick-time') {
      override.time = t.value || null;
      renderChips();
    }
  });
  if (defaults.text) input.value = defaults.text;
  renderChips();
  autosize(input);
  // iOS only shows the keyboard for focus() inside the tap that opened the sheet.
  input.focus();
  return sheet;
}

// ============ Task editor ============
const RECUR_CHOICES = [
  ['none', 'Never'],
  ['daily', 'Every day'],
  ['weekdays', 'Every weekday'],
  ['weekly', 'Every week'],
  ['biweekly', 'Every 2 weeks'],
  ['monthly', 'Every month'],
  ['yearly', 'Every year'],
];

function recurChoice(rule) {
  const r = normalizeRule(rule);
  if (!r) return 'none';
  if (r.freq === 'daily' && r.interval === 1) return 'daily';
  if (r.freq === 'weekdays') return 'weekdays';
  if (r.freq === 'weekly' && r.interval === 1) return 'weekly';
  if (r.freq === 'weekly' && r.interval === 2) return 'biweekly';
  if (r.freq === 'monthly' && r.interval === 1) return 'monthly';
  if (r.freq === 'yearly' && r.interval === 1) return 'yearly';
  return 'keep';
}

function ruleFromChoice(choice, date, byDays) {
  switch (choice) {
    case 'daily':
      return { freq: 'daily', interval: 1 };
    case 'weekdays':
      return { freq: 'weekdays', interval: 1 };
    case 'weekly':
      return { freq: 'weekly', interval: 1, byDays: byDays && byDays.length ? byDays : date ? [weekday(date)] : undefined, anchor: date || undefined };
    case 'biweekly':
      return { freq: 'weekly', interval: 2, byDays: byDays && byDays.length ? byDays : date ? [weekday(date)] : undefined, anchor: date || undefined };
    case 'monthly':
      return { freq: 'monthly', interval: 1, anchorDay: date ? fromKey(date).getDate() : undefined };
    case 'yearly':
      return { freq: 'yearly', interval: 1, anchorDay: date ? fromKey(date).getDate() : undefined };
    default:
      return null;
  }
}

function sameJSON(a, b) {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

export function openEditSheet(id, { draft: seed } = {}) {
  const existing = id ? store.getTask(id) : null;
  if (id && !existing) return null;
  const isNew = !existing;
  const base = existing || makeTask({ title: '', ...(seed || {}) });
  const draft = JSON.parse(JSON.stringify(base));
  if (isNew && seed && !seed.title) draft.title = '';
  let closedByDone = false;

  const html = `${sheetHead({ title: isNew ? 'New task' : 'Edit task', left: `<button class="text-btn muted" data-e="cancel">Cancel</button>`, right: `<button class="text-btn strong" data-e="done">${isNew ? 'Add' : 'Done'}</button>` })}<div class="sheet-body"></div>`;
  const sheet = openSheet({
    id: 'edit',
    html,
    className: 'tall',
    label: isNew ? 'New task' : 'Edit task',
    onClose: (reason) => {
      if (reason === 'cancel' || reason === 'replace' || closedByDone) return;
      commit();
    },
  });
  const el = sheet.el;
  const body = el.querySelector('.sheet-body');

  function commit() {
    draft.title = (draft.title || '').trim();
    if (isNew) {
      if (!draft.title) return null;
      const t = store.addTask(draft);
      return t;
    }
    const cur = store.getTask(id);
    if (!cur) return null;
    if (!draft.title) draft.title = cur.title;
    const fields = ['title', 'notes', 'listId', 'priority', 'date', 'time', 'duration', 'recur', 'reminder', 'tags', 'subtasks'];
    const patch = {};
    for (const f of fields) if (!sameJSON(cur[f], draft[f])) patch[f] = draft[f];
    if (!Object.keys(patch).length) return cur;
    return store.updateTask(id, patch, { undoLabel: 'Edited' });
  }

  function recurRow() {
    const choice = recurChoice(draft.recur);
    const opts = RECUR_CHOICES.map(([v, l]) => `<option value="${v}"${v === choice ? ' selected' : ''}>${l}</option>`).join('');
    const keep = choice === 'keep' ? `<option value="keep" selected>${esc(describeRule(draft.recur))}</option>` : '';
    return `<div class="row"><span class="row-icon" style="--c:#15803D">${icon('repeat')}</span><span class="row-label">Repeat</span><select data-f="recur">${keep}${opts}</select></div>`;
  }

  function dayPicker() {
    const r = normalizeRule(draft.recur);
    if (!r || r.freq !== 'weekly') return '';
    const on = new Set(r.byDays || (draft.date ? [weekday(draft.date)] : []));
    const order = store.settings.weekStart === 1 ? [1, 2, 3, 4, 5, 6, 0] : [0, 1, 2, 3, 4, 5, 6];
    return `<div class="daypick" role="group" aria-label="Repeat on">${order.map((d) => `<button type="button" class="${on.has(d) ? 'is-on' : ''}" data-e="day" data-d="${d}" aria-pressed="${on.has(d)}">${WEEKDAY_SHORT[d].slice(0, 2)}</button>`).join('')}</div>`;
  }

  function calSection() {
    const t = isNew ? null : store.getTask(id);
    const link = t && t.cal;
    if (link) {
      const s = cal.getStatus(link.provider);
      const calName = (s.calendars.find((c) => c.id === link.calendarId) || {}).name || cal.PROVIDER_LABEL[link.provider];
      return `<div class="form-group"><div class="cal-status"><span class="row-icon" style="--c:var(--${link.provider})">${icon('cal-check')}</span><div class="cal-status-text">On ${esc(cal.PROVIDER_LABEL[link.provider])}<small>${esc(calName)} · changes here update the event</small></div></div></div>
      <div class="cal-actions">${link.url ? `<a class="btn soft" href="${esc(link.url)}" target="_blank" rel="noopener">${icon('external', 'sm')} Open event</a>` : ''}<button class="btn soft" data-e="cal-remove">${icon('x', 'sm')} Remove</button></div>`;
    }
    if (!draft.date) return `<p class="hint" style="margin-top:0">Give this task a date to put it on a calendar.</p>`;
    const g = cal.isConnected('google');
    const o = cal.isConnected('outlook');
    return `<div class="cal-actions">
      <button class="btn soft" data-e="cal-add" data-p="google"><span class="prov-dot" style="--c:var(--google)"></span>Google${g ? '' : ` ${icon('external', 'sm')}`}</button>
      <button class="btn soft" data-e="cal-add" data-p="outlook"><span class="prov-dot" style="--c:var(--outlook)"></span>Outlook${o ? '' : ` ${icon('external', 'sm')}`}</button>
      <button class="btn soft wide" data-e="cal-ics">${icon('download', 'sm')} .ics file (Apple Calendar &amp; others)</button>
    </div><p class="hint">${g || o ? 'Connected calendars get the event directly and stay in sync.' : 'Opens your calendar with the event filled in. Connect a calendar in Settings to add and sync events directly.'}${draft.reminder !== null ? ' Your reminder is included.' : ''}</p>`;
  }

  function render() {
    const lists = store.lists.map((l) => `<option value="${esc(l.id)}"${l.id === draft.listId ? ' selected' : ''}>${esc(l.name)}</option>`).join('');
    const listColor = safeColor(store.getList(draft.listId).color);
    const today = todayKey();
    const dateChips = [
      [today, 'Today'],
      [addDays(today, 1), 'Tomorrow'],
      [weekendKey(today), 'Weekend'],
      [nextWeekMonday(today), 'Next week'],
    ]
      .map(([v, l]) => `<button type="button" class="chip${draft.date === v ? ' is-on' : ''}" data-e="set-date" data-v="${v}">${l}</button>`)
      .join('');
    const durOpts = `<option value=""${!draft.duration ? ' selected' : ''}>Default (${fmtDuration(store.settings.defaultDuration)})</option>` + DURATION_OPTIONS.map(([v, l]) => `<option value="${v}"${String(draft.duration) === v ? ' selected' : ''}>${l}</option>`).join('') + (draft.duration && !DURATION_OPTIONS.some(([v]) => v === String(draft.duration)) ? `<option value="${draft.duration}" selected>${fmtDuration(draft.duration)}</option>` : '');
    const remOpts = REMINDER_OPTIONS.map(([v, l]) => `<option value="${v}"${String(draft.reminder ?? '') === v ? ' selected' : ''}>${l}</option>`).join('');
    const subDone = draft.subtasks.filter((s) => s.done).length;
    body.innerHTML = `
      <textarea class="field-title" data-f="title" rows="1" placeholder="What needs doing?" aria-label="Task title">${esc(draft.title)}</textarea>
      <div class="form-label">When</div>
      <div class="form-group">
        <div class="row"><span class="row-icon" style="--c:#E4572E">${icon('cal')}</span><span class="row-label">${draft.date ? esc(fmtDay(draft.date)) : 'Date'}</span><input type="date" data-f="date" value="${draft.date || ''}" aria-label="Date" class="${draft.date ? '' : 'is-empty'}">${draft.date ? `<button class="clear-btn" data-e="clear-date" aria-label="Remove date">${icon('x')}</button>` : ''}</div>
        <div class="row"><span class="row-icon" style="--c:#3B7BE8">${icon('clock')}</span><span class="row-label">Time</span><input type="time" data-f="time" value="${draft.time || ''}" aria-label="Time" class="${draft.time ? '' : 'is-empty'}" ${draft.date ? '' : 'disabled'}>${draft.time ? `<button class="clear-btn" data-e="clear-time" aria-label="Remove time">${icon('x')}</button>` : ''}</div>
        <div class="row"><span class="row-icon" style="--c:#8B5CF6">${icon('schedule')}</span><span class="row-label">Duration</span><select data-f="duration" aria-label="Duration">${durOpts}</select></div>
        ${recurRow()}
        <div class="row"><span class="row-icon" style="--c:#E59400">${icon('bell')}</span><span class="row-label">Reminder</span><select data-f="reminder" aria-label="Reminder">${remOpts}</select></div>
      </div>
      ${dayPicker()}
      <div class="chips">${dateChips}</div>
      ${draft.recur ? `<p class="hint">${esc(describeRule(draft.recur))}. Completing it schedules the next one.</p>` : ''}

      <div class="form-label">Priority</div>
      <div class="seg" role="radiogroup" aria-label="Priority">${PRI_LABEL.map((l, i) => `<button type="button" class="seg-btn${draft.priority === i ? ' is-on' : ''}" data-e="pri" data-v="${i}" role="radio" aria-checked="${draft.priority === i}">${i ? `<i class="dot" style="--c:${PRI_COLOR[i]}"></i>` : ''}${l}</button>`).join('')}</div>

      <div class="form-label">Organize</div>
      <div class="form-group">
        <div class="row"><span class="row-icon" style="--c:${listColor}">${icon(draft.listId === 'inbox' ? 'inbox' : 'lists')}</span><span class="row-label">List</span><select data-f="listId" aria-label="List">${lists}</select></div>
        <div class="row"><span class="row-icon" style="--c:#64748B">${icon('hash')}</span><input class="inline-input" style="flex:1" data-f="tags" value="${esc(draft.tags.join(', '))}" placeholder="Tags, separated by commas" autocapitalize="off" aria-label="Tags"></div>
      </div>

      <div class="form-label">Subtasks${draft.subtasks.length ? `<span>${subDone}/${draft.subtasks.length}</span>` : ''}</div>
      <div class="form-group">
        ${draft.subtasks
          .map(
            (s, i) => `<div class="subtask-row${s.done ? ' is-done' : ''}"><button type="button" class="check" data-e="sub-toggle" data-i="${i}" role="checkbox" aria-checked="${s.done}" aria-label="Toggle subtask">${icon('check')}</button><input value="${esc(s.title)}" data-e="sub-title" data-i="${i}" aria-label="Subtask"><button type="button" class="icon-btn" data-e="sub-del" data-i="${i}" aria-label="Delete subtask">${icon('x', 'sm')}</button></div>`
          )
          .join('')}
        <div class="subtask-row"><span class="check" aria-hidden="true" style="color:var(--muted)">${icon('plus', 'sm')}</span><input data-e="sub-new" placeholder="Add a subtask" enterkeyhint="done" aria-label="New subtask"></div>
      </div>

      <div class="form-label">Notes</div>
      <textarea class="text-input" data-f="notes" placeholder="Links, details, context…" aria-label="Notes">${esc(draft.notes)}</textarea>

      <div class="form-label">Calendar</div>
      <div data-cal-section>${calSection()}</div>

      ${isNew ? '' : `<div class="sheet-actions"><button class="btn soft" data-e="duplicate">${icon('copy', 'sm')} Duplicate</button><button class="btn danger" data-e="delete">${icon('trash', 'sm')} Delete</button></div>`}
    `;
    autosize(body.querySelector('.field-title'));
  }

  render();
  const titleEl = body.querySelector('.field-title');
  if (isNew) titleEl.focus();

  body.addEventListener('input', (e) => {
    const t = e.target;
    const f = t.dataset.f;
    if (f === 'title') {
      draft.title = t.value.replace(/\n/g, ' ');
      autosize(t);
    } else if (f === 'notes') draft.notes = t.value;
    else if (f === 'tags')
      draft.tags = t.value
        .split(',')
        .map((s) => s.trim().replace(/^#/, '').toLowerCase())
        .filter(Boolean);
    else if (t.dataset.e === 'sub-title') draft.subtasks[+t.dataset.i].title = t.value;
  });
  body.addEventListener('keydown', (e) => {
    const t = e.target;
    if (t.dataset.f === 'title' && e.key === 'Enter') {
      e.preventDefault();
      t.blur();
    }
    if (t.dataset.e === 'sub-new' && e.key === 'Enter') {
      e.preventDefault();
      const v = t.value.trim();
      t.value = ''; // so the input's pending "change" event doesn't add it again
      if (!v) return;
      draft.subtasks.push({ id: uid(), title: v, done: false });
      render();
      const again = body.querySelector('[data-e="sub-new"]');
      if (again) again.focus();
    }
  });
  body.addEventListener('change', (e) => {
    const t = e.target;
    const f = t.dataset.f;
    if (f === 'date') {
      draft.date = t.value || null;
      if (!draft.date) draft.time = null;
      if (draft.recur && draft.date) {
        const r = normalizeRule(draft.recur);
        if (r.freq === 'weekly' && r.byDays && r.byDays.length === 1) draft.recur = { ...r, byDays: [weekday(draft.date)], anchor: draft.date };
        if (r.freq === 'monthly' || r.freq === 'yearly') draft.recur = { ...r, anchorDay: fromKey(draft.date).getDate() };
      }
      render();
    } else if (f === 'time') {
      draft.time = t.value || null;
      if (draft.time && draft.reminder === null && store.settings.defaultReminder !== null && isNew) draft.reminder = store.settings.defaultReminder;
      render();
    } else if (f === 'duration') draft.duration = t.value ? +t.value : null;
    else if (f === 'reminder') draft.reminder = t.value === '' ? null : +t.value;
    else if (f === 'listId') {
      draft.listId = t.value;
      render();
    } else if (f === 'recur') {
      if (t.value === 'keep') return;
      if (t.value !== 'none' && !draft.date) draft.date = todayKey();
      draft.recur = ruleFromChoice(t.value, draft.date, null);
      if (draft.recur && draft.date) draft.date = firstOccurrenceOnOrAfter(draft.recur, draft.date);
      render();
    } else if (t.dataset.e === 'sub-new' && t.isConnected) {
      const v = t.value.trim();
      t.value = '';
      if (v) {
        draft.subtasks.push({ id: uid(), title: v, done: false });
        render();
      }
    }
  });

  el.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-e]');
    if (!b) return;
    const k = b.dataset.e;
    if (k === 'cancel') sheet.close('cancel');
    else if (k === 'done') {
      commit();
      closedByDone = true;
      sheet.close('done');
    } else if (k === 'clear-date') {
      draft.date = null;
      draft.time = null;
      draft.recur = null;
      render();
    } else if (k === 'clear-time') {
      draft.time = null;
      render();
    } else if (k === 'set-date') {
      draft.date = b.dataset.v;
      render();
    } else if (k === 'pri') {
      draft.priority = +b.dataset.v;
      render();
    } else if (k === 'day') {
      const r = normalizeRule(draft.recur);
      const set = new Set(r.byDays || (draft.date ? [weekday(draft.date)] : []));
      const d = +b.dataset.d;
      if (set.has(d)) set.delete(d);
      else set.add(d);
      if (!set.size) return;
      draft.recur = { ...r, byDays: [...set].sort((a, c) => a - c), anchor: draft.date || r.anchor };
      if (draft.date) draft.date = firstOccurrenceOnOrAfter(draft.recur, draft.date < todayKey() ? todayKey() : draft.date);
      render();
    } else if (k === 'sub-toggle') {
      const s = draft.subtasks[+b.dataset.i];
      s.done = !s.done;
      render();
    } else if (k === 'sub-del') {
      draft.subtasks.splice(+b.dataset.i, 1);
      render();
    } else if (k === 'delete') {
      closedByDone = true;
      sheet.close('delete');
      const t = store.deleteTask(id);
      if (t) toast(`Deleted “${t.title}”`, { action: () => store.undo() });
    } else if (k === 'duplicate') {
      commit();
      const src = store.getTask(id);
      if (src) {
        const copy = store.addTask({ ...src, id: undefined, cal: null, done: false, doneAt: null, title: `${src.title}`, subtasks: src.subtasks.map((s) => ({ ...s, id: uid(), done: false })) }, { undoLabel: 'Duplicated' });
        closedByDone = true;
        sheet.close('duplicate');
        toast('Duplicated', { action: () => store.undo() });
        openEditSheet(copy.id);
      }
    } else if (k === 'cal-add' || k === 'cal-ics') {
      const saved = commit();
      if (!saved) {
        toast('Add a title first');
        return;
      }
      if (isNew) {
        // Now it exists; keep editing it as an existing task.
        closedByDone = true;
        sheet.close('replace');
        const next = openEditSheet(saved.id);
        void next;
      }
      if (k === 'cal-ics') {
        const { text, filename } = cal.icsFor(saved);
        if (text) offerFile(text, filename, 'text/calendar');
        return;
      }
      const p = b.dataset.p;
      if (!cal.isConnected(p)) {
        window.open(cal.linkUrl(saved, p), '_blank', 'noopener');
        return;
      }
      b.disabled = true;
      try {
        const res = await cal.addToCalendar(saved, p);
        if (res.mode === 'api') toast(`Added to ${cal.PROVIDER_LABEL[p]}`);
        else if (res.mode === 'queued') toast(`Will add to ${cal.PROVIDER_LABEL[p]} after you sign in again`);
      } catch (err) {
        toast(`Couldn’t add to ${cal.PROVIDER_LABEL[p]}: ${err.message || err}`);
      }
      refreshCal();
    } else if (k === 'cal-remove') {
      const t = store.getTask(id);
      if (t && t.cal) {
        const provider = t.cal.provider;
        await cal.removeFromCalendar(t);
        toast(`Removed from ${cal.PROVIDER_LABEL[provider]}`);
        refreshCal();
      }
    }
  });

  function refreshCal() {
    const sec = document.querySelector('.sheet-wrap[data-sheet="edit"]:last-of-type [data-cal-section]');
    if (sec) sec.innerHTML = calSection();
  }
  const unsub = cal.onChange((reason) => {
    if (!document.contains(el)) {
      unsub();
      return;
    }
    if (reason === 'events' || reason === 'status') {
      const sec = el.querySelector('[data-cal-section]');
      if (sec) sec.innerHTML = calSection();
    }
  });
  return sheet;
}

// ============ Event details ============
export function openEventSheet(evKey) {
  const key = scheduleDate();
  let ev = null;
  for (let i = -1; i <= 1 && !ev; i++) ev = cal.eventsForDay(addDays(key, i)).find((e) => e.key === evKey);
  if (!ev) for (let i = 0; i < 15 && !ev; i++) ev = cal.eventsForDay(addDays(todayKey(), i)).find((e) => e.key === evKey);
  if (!ev) return;
  let when;
  if (ev.allDay) {
    const last = addDays(ev.end, -1);
    when = last === ev.start ? `${fmtLong(ev.start)} · All day` : `${fmtLong(ev.start)} – ${fmtLong(last)}`;
  } else {
    const s = new Date(ev.start);
    const e = new Date(ev.end);
    const sk = `${s.getFullYear()}-${String(s.getMonth() + 1).padStart(2, '0')}-${String(s.getDate()).padStart(2, '0')}`;
    when = `${fmtLong(sk)} · ${fmtTime(minutesOfDay(s))} – ${fmtTime(minutesOfDay(e))}`;
  }
  const provName = cal.PROVIDER_LABEL[ev.provider];
  const body = `<div class="ev-detail"><div class="ev-title"><span class="prov-dot" style="--c:${safeColor(ev.color)}"></span><span>${esc(ev.title)}</span></div><div class="ev-when">${esc(when)}</div>
    <div class="ev-meta">
      <div>${icon('cal', 'sm')}<span>${esc(ev.calendarName || provName)} · ${esc(provName)}</span></div>
      ${ev.location ? `<div>${icon('pin', 'sm')}<span>${esc(ev.location)}</span></div>` : ''}
      ${ev.busy ? '' : `<div>${icon('info', 'sm')}<span>Shown as free</span></div>`}
    </div>
    <div class="cal-actions" style="margin-top:18px">
      ${ev.joinUrl ? `<a class="btn wide" href="${esc(ev.joinUrl)}" target="_blank" rel="noopener">${icon('video', 'sm')} Join meeting</a>` : ''}
      ${ev.url ? `<a class="btn soft" href="${esc(ev.url)}" target="_blank" rel="noopener">${icon('external', 'sm')} Open</a>` : ''}
      <button class="btn soft" data-e="prep">${icon('plus', 'sm')} Prep task</button>
    </div></div>`;
  const sheet = openSheet({ id: 'event', html: `${sheetHead({ title: 'Event', right: `<button class="text-btn strong" data-e="close">Done</button>` })}<div class="sheet-body">${body}</div>`, label: 'Event details' });
  sheet.el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-e]');
    if (!b) return;
    if (b.dataset.e === 'close') sheet.close('done');
    if (b.dataset.e === 'prep') {
      sheet.close('replace');
      const date = ev.allDay ? ev.start : `${new Date(ev.start).getFullYear()}-${String(new Date(ev.start).getMonth() + 1).padStart(2, '0')}-${String(new Date(ev.start).getDate()).padStart(2, '0')}`;
      openQuickAdd({ text: `Prep for ${ev.title} `, date });
    }
  });
}

// ============ Plan a time ============
export function openPlanSheet(taskId, dateKey) {
  const t = store.getTask(taskId);
  if (!t) return;
  const key = dateKey || t.date || todayKey();
  let duration = t.duration || store.settings.defaultDuration;
  const render = () => {
    const slots = suggestSlots(key, duration, t.id);
    return `<p class="hint" style="margin:0 2px 10px">Free times ${key === todayKey() ? 'today' : `on ${esc(fmtDay(key))}`} for <b>${esc(t.title)}</b></p>
      ${slots.length ? `<div class="chips">${slots.map((m) => `<button class="chip" data-e="slot" data-m="${m}">${fmtTime(m)}</button>`).join('')}</div>` : `<p class="hint">No free ${fmtDuration(duration)} slot left${key === todayKey() ? ' today' : ''}. Pick a time below.</p>`}
      <div class="form-label">Or choose</div>
      <div class="form-group">
        <div class="row"><span class="row-label">Start</span><input type="time" data-e="time" value="${slots[0] !== undefined ? toHHMM(slots[0]) : ''}"></div>
        <div class="row"><span class="row-label">Duration</span><select data-e="dur">${DURATION_OPTIONS.map(([v, l]) => `<option value="${v}"${+v === duration ? ' selected' : ''}>${l}</option>`).join('')}</select></div>
      </div>
      <div class="sheet-actions"><button class="btn soft" data-e="tomorrow">Move to tomorrow</button><button class="btn" data-e="apply">Schedule</button></div>`;
  };
  const sheet = openSheet({ id: 'plan', html: `${sheetHead({ title: 'Plan a time', left: `<button class="text-btn muted" data-e="cancel">Cancel</button>` })}<div class="sheet-body">${render()}</div>`, label: 'Plan a time' });
  const el = sheet.el;
  const apply = (min) => {
    store.updateTask(t.id, { date: key, time: toHHMM(min), duration }, { undoLabel: 'Planned' });
    sheet.close('done');
    toast(`Planned for ${fmtTime(min)}`, { action: () => store.undo() });
  };
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-e]');
    if (!b) return;
    const k = b.dataset.e;
    if (k === 'cancel') sheet.close('cancel');
    else if (k === 'slot') apply(+b.dataset.m);
    else if (k === 'apply') {
      const v = el.querySelector('[data-e="time"]').value;
      if (!v) {
        toast('Pick a start time');
        return;
      }
      apply(parseHHMM(v));
    } else if (k === 'tomorrow') {
      store.updateTask(t.id, { date: addDays(todayKey(), 1), time: null }, { undoLabel: 'Moved' });
      sheet.close('done');
      toast('Moved to tomorrow', { action: () => store.undo() });
    }
  });
  el.addEventListener('change', (e) => {
    if (e.target.dataset.e === 'dur') {
      duration = +e.target.value;
      el.querySelector('.sheet-body').innerHTML = render();
    }
  });
}

// ============ Search ============
export function openSearch() {
  const html = `<div class="sheet-handle" aria-hidden="true"></div><div class="search-bar"><label class="search-field">${icon('search', 'sm')}<input type="search" placeholder="Search tasks, notes, #tags" enterkeyhint="search" aria-label="Search"></label><button class="text-btn" data-e="close">Cancel</button></div><div class="sheet-body"><div data-results></div></div>`;
  const sheet = openSheet({ id: 'search', html, className: 'tall', label: 'Search' });
  const el = sheet.el;
  const input = el.querySelector('input');
  const results = el.querySelector('[data-results]');
  const run = () => {
    const q = input.value;
    if (!q.trim()) {
      const tags = [...new Set(store.tasks.flatMap((t) => t.tags))].slice(0, 20);
      results.innerHTML = tags.length ? `<div class="form-label">Tags</div><div class="chips">${tags.map((t) => `<button class="chip" data-e="tag" data-tag="${esc(t)}">#${esc(t)}</button>`).join('')}</div>` : `<p class="hint" style="text-align:center;margin-top:30px">Search titles, notes, subtasks and #tags.</p>`;
      return;
    }
    const found = searchTasks(store.tasks, q);
    const open = found.filter((t) => !t.done);
    const done = found.filter((t) => t.done).slice(0, 50);
    let out = '';
    if (open.length) out += `<div class="form-label">Open · ${open.length}</div><ul class="task-list">${open.map((t) => taskRow(t)).join('')}</ul>`;
    if (done.length) out += `<div class="form-label">Completed · ${done.length}</div><ul class="task-list">${done.map((t) => taskRow(t)).join('')}</ul>`;
    if (!found.length) out = `<p class="hint" style="text-align:center;margin-top:30px">No tasks match “${esc(q)}”.</p>`;
    results.innerHTML = out;
  };
  input.addEventListener('input', run);
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-e]');
    if (!b) return;
    if (b.dataset.e === 'close') sheet.close('cancel');
    if (b.dataset.e === 'tag') {
      input.value = `#${b.dataset.tag}`;
      run();
    }
  });
  const unsub = store.subscribe(() => {
    if (!document.contains(el)) {
      unsub();
      return;
    }
    run();
  });
  run();
  input.focus();
}

// ============ Lists ============
export function openListEditor(listId) {
  const existing = listId ? store.lists.find((l) => l.id === listId) : null;
  let color = existing ? existing.color : LIST_COLORS[store.lists.length % LIST_COLORS.length];
  const html = `${sheetHead({ title: existing ? 'Edit list' : 'New list', left: `<button class="text-btn muted" data-e="cancel">Cancel</button>`, right: `<button class="text-btn strong" data-e="save">${existing ? 'Save' : 'Create'}</button>` })}
  <div class="sheet-body"><input class="text-input" data-e="name" value="${esc(existing ? existing.name : '')}" placeholder="List name" aria-label="List name" enterkeyhint="done">
  <div class="form-label">Color</div><div class="color-pick">${LIST_COLORS.map((c) => `<button type="button" data-e="color" data-c="${c}" class="${c === color ? 'is-on' : ''}" style="--c:${c}" aria-label="Color ${c}"></button>`).join('')}</div>
  ${existing ? `<div class="sheet-actions"><button class="btn danger" data-e="delete">${icon('trash', 'sm')} Delete list</button></div><p class="hint">Its tasks move to Inbox.</p>` : ''}</div>`;
  const sheet = openSheet({ id: 'list', html, className: 'kb-aware', label: 'List' });
  const el = sheet.el;
  const name = el.querySelector('[data-e="name"]');
  const save = () => {
    const v = name.value.trim();
    if (!v) {
      name.focus();
      return;
    }
    if (existing) store.updateList(existing.id, { name: v, color });
    else {
      const l = store.addList(v, color);
      ui.view = 'list';
      ui.listId = l.id;
    }
    sheet.close('done');
  };
  name.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      save();
    }
  });
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-e]');
    if (!b) return;
    const k = b.dataset.e;
    if (k === 'cancel') sheet.close('cancel');
    else if (k === 'save') save();
    else if (k === 'color') {
      color = b.dataset.c;
      for (const x of el.querySelectorAll('[data-e="color"]')) x.classList.toggle('is-on', x.dataset.c === color);
    } else if (k === 'delete') {
      sheet.close('done');
      store.deleteList(existing.id);
      ui.view = 'lists';
      toast(`Deleted “${existing.name}”`, { action: () => store.undo() });
    }
  });
  if (!existing) name.focus();
}

// ============ Confirm ============
export function confirmSheet({ title, message, confirmLabel = 'Confirm', danger = true }) {
  return new Promise((resolve) => {
    let answered = false;
    const sheet = openSheet({
      id: 'confirm',
      html: `${sheetHead({ title })}<div class="sheet-body"><p style="color:var(--text-2);line-height:1.5;margin:0 4px">${esc(message)}</p><div class="sheet-actions"><button class="btn soft" data-e="no">Cancel</button><button class="btn ${danger ? 'danger' : ''}" data-e="yes">${esc(confirmLabel)}</button></div></div>`,
      label: title,
      onClose: () => {
        if (!answered) resolve(false);
      },
    });
    sheet.el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-e]');
      if (!b) return;
      answered = true;
      resolve(b.dataset.e === 'yes');
      sheet.close('done');
    });
  });
}

// ============ Help sheets ============
export function openInstallHelp() {
  const ios = isIOS();
  const body = ios
    ? `<ol class="install-steps" style="font-size:16px"><li>Open this page in <b>Safari</b></li><li>Tap <span class="kbd">···</span> (bottom right), then <span class="kbd">${icon('share', 'xs')} Share</span></li><li>Scroll and tap <span class="kbd">${icon('add-home', 'xs')} Add to Home Screen</span></li><li>Keep <b>Open as Web App</b> on, then tap <b>Add</b></li></ol><p class="hint">Dayline then opens full-screen from its own icon, works offline, and can show notifications and a badge.</p>`
    : `<ol class="install-steps" style="font-size:16px"><li><b>Chrome / Edge:</b> menu ⋮ → <b>Install Dayline</b> (or the install icon in the address bar)</li><li><b>Safari on Mac:</b> File → <b>Add to Dock</b></li><li><b>Android:</b> Chrome menu ⋮ → <b>Install app</b></li></ol>`;
  const sheet = openSheet({ id: 'install', html: `${sheetHead({ title: 'Install Dayline', right: `<button class="text-btn strong" data-e="close">Done</button>` })}<div class="sheet-body">${body}${ui.installPrompt ? `<div class="sheet-actions"><button class="btn" data-e="prompt">${icon('add-home', 'sm')} Install now</button></div>` : ''}</div>`, label: 'Install' });
  sheet.el.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-e]');
    if (!b) return;
    if (b.dataset.e === 'close') sheet.close('done');
    if (b.dataset.e === 'prompt' && ui.installPrompt) {
      ui.installPrompt.prompt();
      ui.installPrompt = null;
      sheet.close('done');
    }
  });
}

export function openCheatSheet() {
  const rows = [
    ['Dentist fri 9am', 'Friday at 9:00 AM'],
    ['Call Ana tomorrow 3-4pm', 'Tomorrow, 3:00 PM for 1 hour'],
    ['Write aims for 90m', '90-minute block'],
    ['Stretch every weekday 7am', 'Repeats Mon–Fri'],
    ['Team sync every mon, wed', 'Repeats Mon & Wed'],
    ['Pay rent monthly', 'Repeats every month'],
    ['Grant report due 10/15', 'October 15'],
    ['Book flights in 2 weeks', 'Two weeks from today'],
    ['Email IRB tonight', 'Today at 8:00 PM'],
    ['Review draft #work !high', 'Work list · High priority'],
    ['Pick up meds #errands', 'Tag #errands (or a list with that name)'],
  ];
  const body = `<div class="form-group">${rows.map(([a, b]) => `<div class="row" style="flex-direction:column;align-items:flex-start;gap:2px;padding:10px 14px"><code style="font-family:ui-monospace,Menlo,monospace;font-size:14px;color:var(--text)">${esc(a)}</code><span style="font-size:13.5px;color:var(--muted)">${esc(b)}</span></div>`).join('')}</div><p class="hint">Words Dayline picks up appear as chips under the text box. Tap a chip’s × to keep that word in the title instead.</p>`;
  const sheet = openSheet({ id: 'cheat', html: `${sheetHead({ title: 'Quick-add cheat sheet', right: `<button class="text-btn strong" data-e="close">Done</button>` })}<div class="sheet-body">${body}</div>`, className: 'tall', label: 'Cheat sheet' });
  sheet.el.addEventListener('click', (e) => {
    if (e.target.closest('[data-e="close"]')) sheet.close('done');
  });
}

