// Calendar orchestration: connection state, event cache, two-way sync of linked tasks, and an offline-safe queue.
import * as google from './google.js';
import * as outlook from './outlook.js';
import { readReturnParams, peekPending, clearPending, cleanUrl, AuthError, ApiError, redirectUri } from './oauth.js';
import { googleTemplateUrl, outlookComposeUrl, buildICS, icsFileName } from './links.js';
import { store } from '../store.js';
import { todayKey, addDays, fromKey, toKey, toHHMM, minutesOfDay } from '../dates.js';

export const PROVIDERS = { google, outlook };
export const PROVIDER_IDS = ['google', 'outlook'];
export const PROVIDER_LABEL = { google: 'Google Calendar', outlook: 'Outlook' };

const CACHE_KEY = 'dayline:events';
const QUEUE_KEY = 'dayline:calqueue';
const AUTO_KEY = 'dayline:autoauth:';

const listeners = new Set();
export function onChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function emit(reason, data) {
  for (const fn of listeners) {
    try {
      fn(reason, data);
    } catch (err) {
      console.error(err);
    }
  }
}

function loadJSON(key, fallback) {
  try {
    const v = JSON.parse(localStorage.getItem(key) || 'null');
    return v === null ? fallback : v;
  } catch {
    return fallback;
  }
}

const status = {
  google: { syncing: false, error: null, needsAuth: false },
  outlook: { syncing: false, error: null, needsAuth: false },
};
let cache = loadJSON(CACHE_KEY, {});
let queue = loadJSON(QUEUE_KEY, []);

function saveCache() {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (err) {
    console.warn('Could not cache events', err);
  }
}
function saveQueue() {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

// ---------- configuration ----------
export function config(p) {
  const s = store.settings[p] || {};
  const g = window.DAYLINE_CONFIG || {};
  if (p === 'google') return { clientId: String(s.clientId || g.googleClientId || '').trim() };
  return {
    clientId: String(s.clientId || g.microsoftClientId || '').trim(),
    tenant: String(s.tenant || g.microsoftTenant || '').trim(),
  };
}

export function isConfigured(p) {
  return !!config(p).clientId;
}

export function isConnected(p) {
  return isConfigured(p) && PROVIDERS[p].isConnected();
}

export function anyConnected() {
  return PROVIDER_IDS.some(isConnected);
}

export function hasUsableToken(p) {
  const prov = PROVIDERS[p];
  return prov.hasValidToken() || (p === 'outlook' && outlook.canRefresh());
}

export function getStatus(p) {
  const prov = PROVIDERS[p];
  const c = cache[p] || {};
  return {
    configured: isConfigured(p),
    connected: isConnected(p),
    account: prov.account(),
    usable: hasUsableToken(p),
    lastSync: c.fetchedAt || null,
    calendars: c.calendars || [],
    error: status[p].error,
    // needsAuth: a sign-in is required (silent refresh failed, or changes are waiting). expired: just a stale token.
    needsAuth: isConnected(p) && (status[p].needsAuth || (!hasUsableToken(p) && queue.some((q) => q.provider === p))),
    expired: isConnected(p) && !hasUsableToken(p),
    syncing: status[p].syncing,
    queued: queue.filter((q) => q.provider === p).length,
  };
}

export function getRedirectUri() {
  return redirectUri();
}

export function calendarsFor(p) {
  return (cache[p] && cache[p].calendars) || [];
}

export function isCalendarShown(p, cal) {
  const pref = (store.settings[p].calendars || {})[cal.id];
  if (pref !== undefined) return pref;
  return p === 'google' ? cal.selected !== false : !!cal.primary;
}

function shownIds(p) {
  return new Set(calendarsFor(p).filter((c) => isCalendarShown(p, c)).map((c) => c.id));
}

export function defaultCalendarId(p) {
  const pref = store.settings[p].defaultCalendar;
  const cals = calendarsFor(p);
  if (pref && (cals.length === 0 || cals.some((c) => c.id === pref))) return pref;
  const primary = cals.find((c) => c.primary);
  if (primary) return primary.id;
  return p === 'google' ? 'primary' : '';
}

function opts() {
  return { defaultDuration: store.settings.defaultDuration || 30, linkType: store.settings.outlookLinkType || 'work' };
}

// ---------- sign-in ----------
// `context` (e.g. the current view) comes back after the redirect so the app can return there.
export async function connect(p, { silent = false, context = null } = {}) {
  const c = config(p);
  if (!c.clientId) throw new Error('not_configured');
  localStorage.setItem(AUTO_KEY + p, String(Date.now()));
  store.flush();
  const firstTime = !PROVIDERS[p].account();
  const prompt = silent ? 'none' : firstTime ? 'select_account' : undefined;
  if (p === 'google') google.startAuth({ clientId: c.clientId, prompt, silent, context });
  else await outlook.startAuth({ clientId: c.clientId, tenant: c.tenant, prompt, silent, context });
}

const SILENT_ERRORS = ['interaction_required', 'login_required', 'consent_required', 'account_selection_required'];

function describeAuthError(p, res) {
  const e = res.error || '';
  const d = res.description || '';
  if (p === 'google') {
    if (e === 'access_denied') return 'Access was declined. Tap Connect to try again.';
    if (e === 'scope_denied') return 'Dayline needs permission to view and edit your calendar events. Connect again and allow it.';
    return `Google sign-in failed (${e}).`;
  }
  if (/AADSTS65001|AADSTS90094|AADSTS90095|admin/i.test(d) || e === 'consent_required') return 'Your Microsoft 365 organization requires an admin to approve Dayline. See the setup guide: “Grant admin consent”.';
  if (/AADSTS50194/.test(d)) return 'Enter your Directory (tenant) ID in Settings — the app is registered for a single organization.';
  if (/AADSTS9002326|Single-Page Application/i.test(d)) return 'In Entra, the redirect URI must be added under the “Single-page application” platform.';
  if (/AADSTS50011|redirect/i.test(d)) return `The redirect URI doesn’t match. Register exactly: ${redirectUri()}`;
  if (/AADSTS700016/.test(d)) return 'Application (client) ID not found in that directory. Check the client ID and tenant.';
  if (e === 'access_denied') return 'Access was declined. Tap Connect to try again.';
  return d ? d.split('\r\n')[0].replace(/^AADSTS\d+:\s*/, '') : `Microsoft sign-in failed (${e}).`;
}

// Call once at startup, before the first sync. Returns a summary when the page was an OAuth return.
export async function handleRedirect() {
  const params = readReturnParams();
  if (!params) return null;
  const pending = peekPending();
  cleanUrl();
  clearPending();
  if (!pending || pending.state !== params.state) return { ok: false, provider: pending ? pending.provider : null, error: 'state_mismatch', message: 'Sign-in response didn’t match — please try again.' };
  const p = pending.provider;
  let res;
  if (p === 'google') res = await google.completeAuth(params);
  else {
    outlook.configure(config('outlook'));
    res = await outlook.completeAuth(params, pending, config('outlook'));
  }
  res.provider = p;
  res.silent = !!pending.silent;
  res.context = pending.context || null;
  if (res.ok) {
    status[p].needsAuth = false;
    status[p].error = null;
    localStorage.removeItem(AUTO_KEY + p);
  } else if (SILENT_ERRORS.includes(res.error) && PROVIDERS[p].isConnected()) {
    status[p].needsAuth = true;
    res.message = `${PROVIDER_LABEL[p]} needs you to sign in again.`;
  } else {
    status[p].error = describeAuthError(p, res);
    res.message = status[p].error;
  }
  emit('status');
  return res;
}

// Silently refresh an expired sign-in with a quick redirect (at most every 20 minutes per provider).
export function maybeAutoAuth(context = null) {
  if (!store.settings.autoRefreshAuth || !navigator.onLine) return false;
  for (const p of PROVIDER_IDS) {
    if (!isConnected(p) || hasUsableToken(p)) continue;
    const last = +localStorage.getItem(AUTO_KEY + p) || 0;
    if (Date.now() - last < 20 * 60 * 1000) continue;
    connect(p, { silent: true, context });
    return true;
  }
  return false;
}

export async function disconnect(p) {
  await PROVIDERS[p].revoke();
  delete cache[p];
  saveCache();
  queue = queue.filter((q) => q.provider !== p);
  saveQueue();
  // Keep task links so reconnecting the same account resumes syncing; drop them for safety only on request.
  status[p] = { syncing: false, error: null, needsAuth: false };
  emit('status');
  emit('events');
}

// ---------- sync ----------
let syncing = null;
export function sync({ force = false } = {}) {
  if (syncing) return syncing;
  syncing = (async () => {
    for (const p of PROVIDER_IDS) {
      if (isConnected(p)) await syncProvider(p, force);
    }
  })().finally(() => {
    syncing = null;
    emit('events');
  });
  return syncing;
}

function friendlyError(err) {
  if (!navigator.onLine) return 'Offline — showing saved events.';
  if (err instanceof ApiError) {
    if (err.status === 403) return 'Permission denied by the calendar service.';
    if (err.status === 429) return 'Too many requests — will retry shortly.';
    return err.message || `Calendar error (${err.status}).`;
  }
  if (err && err.name === 'TypeError') return 'Network error — showing saved events.';
  return (err && err.message) || 'Sync failed.';
}

async function syncProvider(p, force) {
  const prov = PROVIDERS[p];
  if (p === 'outlook') outlook.configure(config('outlook'));
  let token = null;
  try {
    token = await prov.ensureToken();
  } catch (err) {
    status[p].error = friendlyError(err);
    emit('status');
    return;
  }
  if (!token) {
    emit('status');
    return;
  }
  status[p].syncing = true;
  status[p].error = null;
  emit('status');
  const startedAt = new Date().toISOString();
  try {
    await processQueue(p);
    const c = cache[p] || {};
    let calendars = c.calendars;
    if (!calendars || !calendars.length || force || !c.calendarsAt || Date.now() - c.calendarsAt > 6 * 3600 * 1000) {
      calendars = await prov.listCalendars();
      c.calendarsAt = Date.now();
    }
    const from = addDays(todayKey(), -7);
    const to = addDays(todayKey(), 60);
    const timeMin = fromKey(from).toISOString();
    const timeMax = fromKey(to).toISOString();
    const events = [];
    let failed = 0;
    for (const cal of calendars.filter((x) => isCalendarShown(p, x))) {
      try {
        events.push(...(await prov.listEvents(cal, timeMin, timeMax)));
      } catch (err) {
        if (err instanceof AuthError) throw err;
        failed++;
        console.warn('Calendar fetch failed', cal.name, err);
      }
    }
    cache[p] = { ...c, calendars, events, fetchedAt: Date.now(), rangeStart: from, rangeEnd: to };
    saveCache();
    status[p].needsAuth = false;
    if (failed) status[p].error = `${failed} calendar${failed > 1 ? 's' : ''} couldn’t be loaded.`;
    await reconcileLinked(p, events, from, to, startedAt);
  } catch (err) {
    if (!(err instanceof AuthError)) status[p].error = friendlyError(err);
  } finally {
    status[p].syncing = false;
    emit('status');
  }
}

// Pull changes made in the calendar (moved/renamed/deleted events) back into linked tasks.
async function reconcileLinked(p, events, from, to, startedAt) {
  const prov = PROVIDERS[p];
  const byId = new Map(events.map((e) => [e.id, e]));
  const updated = [];
  const unlinked = [];
  // Skip links made in the last minute (calendar services can take a moment to list new events).
  const graceIso = new Date(Date.now() - 60 * 1000).toISOString();
  const linked = store.tasks.filter((t) => !t.done && t.cal && t.cal.provider === p && !t.recur && (t.updatedAt || '') < startedAt && (t.cal.syncedAt || '') < graceIso);
  let lookups = 0;
  for (const t of linked) {
    let ev = byId.get(t.cal.eventId);
    if (!ev) {
      if (lookups >= 8) continue;
      lookups++;
      let raw = null;
      try {
        raw = await prov.getEvent(t.cal.calendarId, t.cal.eventId);
      } catch (err) {
        if (err instanceof AuthError) throw err;
        continue;
      }
      if (!raw) {
        store.setCalLink(t.id, null);
        unlinked.push(t.title);
        continue;
      }
      ev = normalizeRawEvent(p, raw);
      if (!ev) continue;
    }
    const patch = patchFromEvent(t, ev);
    if (patch) {
      store.updateTask(t.id, patch, { hooks: false, silent: true });
      updated.push(t.title);
    }
  }
  if (updated.length || unlinked.length) {
    store.emit('task');
    const parts = [];
    if (updated.length) parts.push(`Updated from ${PROVIDER_LABEL[p]}: ${updated.slice(0, 2).join(', ')}${updated.length > 2 ? ` +${updated.length - 2}` : ''}`);
    if (unlinked.length) parts.push(`${unlinked.length} event${unlinked.length > 1 ? 's were' : ' was'} removed from ${PROVIDER_LABEL[p]}`);
    emit('toast', parts.join(' · '));
  }
}

function normalizeRawEvent(p, raw) {
  if (p === 'google') {
    if (raw.status === 'cancelled') return null;
    const allDay = !!(raw.start && raw.start.date);
    return { id: raw.id, title: raw.summary || '', allDay, start: allDay ? raw.start.date : raw.start.dateTime, end: allDay ? raw.end.date : raw.end.dateTime };
  }
  const allDay = !!raw.isAllDay;
  return {
    id: raw.id,
    title: raw.subject || '',
    allDay,
    start: allDay ? raw.start.dateTime.slice(0, 10) : `${raw.start.dateTime.slice(0, 19)}Z`,
    end: allDay ? raw.end.dateTime.slice(0, 10) : `${raw.end.dateTime.slice(0, 19)}Z`,
  };
}

function patchFromEvent(t, ev) {
  const patch = {};
  if (ev.allDay) {
    if (t.date !== ev.start) patch.date = ev.start;
    if (t.time) patch.time = null;
  } else {
    const s = new Date(ev.start);
    const e = new Date(ev.end);
    const date = toKey(s);
    const time = toHHMM(minutesOfDay(s));
    const dur = Math.max(5, Math.round((e - s) / 60000));
    if (t.date !== date) patch.date = date;
    if (t.time !== time) patch.time = time;
    if ((t.duration || store.settings.defaultDuration) !== dur) patch.duration = dur;
  }
  if (ev.title && ev.title !== t.title) patch.title = ev.title;
  return Object.keys(patch).length ? patch : null;
}

// ---------- queue of calendar writes ----------
function enqueue(item) {
  // one pending write per task/op; a delete replaces pending creates/updates
  if (item.op === 'delete') queue = queue.filter((q) => !(q.taskId === item.taskId && q.op !== 'delete'));
  else queue = queue.filter((q) => !(q.taskId === item.taskId && q.op === item.op));
  if (item.op === 'update' && queue.some((q) => q.taskId === item.taskId && q.op === 'create')) return; // create will carry latest state
  const prev = queue.find((q) => q.taskId === item.taskId);
  queue.push({ ...item, qid: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`, dateChanged: item.dateChanged || (prev && prev.dateChanged) || false, at: Date.now(), attempts: 0 });
  saveQueue();
}

let kickTimer = null;
function kick(delay = 700) {
  clearTimeout(kickTimer);
  kickTimer = setTimeout(async () => {
    for (const p of PROVIDER_IDS) {
      if (!queue.some((q) => q.provider === p) || !isConnected(p)) continue;
      if (p === 'outlook') outlook.configure(config('outlook'));
      let token = null;
      try {
        token = await PROVIDERS[p].ensureToken();
      } catch {
        /* offline */
      }
      if (!token) {
        status[p].needsAuth = true;
        emit('status');
        continue;
      }
      try {
        await processQueue(p);
      } catch (err) {
        if (err instanceof AuthError) status[p].needsAuth = true;
      }
      emit('status');
      emit('events');
    }
    const waiting = queue.filter((q) => q.notBefore && q.notBefore > Date.now());
    if (waiting.length) kick(Math.max(500, Math.min(...waiting.map((q) => q.notBefore)) - Date.now() + 100));
  }, delay);
}

export function pendingCount() {
  return queue.length;
}

const isDue = (q) => !q.notBefore || q.notBefore <= Date.now();
const running = {};

// Runs due writes for one provider, one run at a time (so a sync and a kick can't create the same event twice).
function processQueue(p) {
  if (running[p]) return running[p];
  running[p] = (async () => {
    const items = queue.filter((q) => q.provider === p && isDue(q));
    const seen = new Set(items);
    for (const item of items) {
      try {
        await runOp(item);
        queue = queue.filter((q) => q !== item);
      } catch (err) {
        if (err instanceof AuthError) {
          saveQueue();
          throw err;
        }
        if (!navigator.onLine || (err && err.name === 'TypeError')) break; // network trouble: keep everything for later
        item.attempts = (item.attempts || 0) + 1;
        if (item.attempts >= 5 || (err instanceof ApiError && [400, 403, 404].includes(err.status))) {
          queue = queue.filter((q) => q !== item);
          emit('toast', `Couldn’t update ${PROVIDER_LABEL[p]}: ${err.message || 'error'}`);
        }
      }
    }
    saveQueue();
    // Writes queued while this run was busy get their own run.
    if (queue.some((q) => q.provider === p && isDue(q) && !seen.has(q))) kick(300);
  })().finally(() => {
    running[p] = null;
  });
  return running[p];
}

function linkFor(task, p, calendarId, res) {
  return {
    provider: p,
    calendarId,
    eventId: res.eventId,
    url: res.url || '',
    seriesStart: task.recur ? task.date : null,
    recurKey: task.recur ? JSON.stringify(task.recur) : null,
    syncedAt: new Date().toISOString(),
  };
}

async function runOp(item) {
  const prov = PROVIDERS[item.provider];
  if (item.op === 'delete') {
    if (store.getTask(item.taskId)) return; // task was restored (undo) — keep the event
    await prov.deleteEvent(item.calendarId, item.eventId);
    return;
  }
  const task = store.getTask(item.taskId);
  if (!task) return;
  if (item.op === 'create') {
    if (task.cal || !task.date) return;
    const cal = item.calendarId !== undefined ? item.calendarId : defaultCalendarId(item.provider);
    const res = await prov.createEvent(cal, task, opts());
    store.setCalLink(task.id, linkFor(task, item.provider, cal, res));
    return;
  }
  if (item.op === 'update') {
    const link = task.cal;
    if (!link || link.provider !== item.provider) return;
    if (!task.date) {
      await prov.deleteEvent(link.calendarId, link.eventId);
      store.setCalLink(task.id, null);
      return;
    }
    const recurKey = task.recur ? JSON.stringify(task.recur) : null;
    if (recurKey !== (link.recurKey || null) || (task.recur && item.dateChanged)) {
      // Recurrence changed (or a series was moved): replace the event.
      await prov.deleteEvent(link.calendarId, link.eventId);
      const res = await prov.createEvent(link.calendarId, task, opts());
      store.setCalLink(task.id, linkFor(task, item.provider, link.calendarId, res));
      return;
    }
    const payloadTask = task.recur && link.seriesStart ? { ...task, date: link.seriesStart } : task;
    let res;
    try {
      res = await prov.patchEvent(link.calendarId, link.eventId, payloadTask, opts());
    } catch (err) {
      if (err instanceof ApiError && (err.status === 404 || err.status === 410)) {
        // The event was deleted in the calendar app: keep the task, drop the link.
        store.setCalLink(task.id, null);
        emit('toast', `“${task.title}” is no longer on ${PROVIDER_LABEL[item.provider]}`);
        return;
      }
      throw err;
    }
    store.setCalLink(task.id, { ...link, url: res.url || link.url, syncedAt: new Date().toISOString() });
  }
}

// ---------- hooks from the task store ----------
const SYNC_FIELDS = ['title', 'date', 'time', 'duration', 'notes', 'reminder'];

store.onTaskChange((before, after, meta) => {
  if (!after) return;
  const auto = store.settings.autoCalendar;
  if (!before) {
    if (auto && isConnected(auto) && after.date && after.time && !after.cal) {
      enqueue({ op: 'create', provider: auto, taskId: after.id, calendarId: defaultCalendarId(auto) });
      kick();
    }
    return;
  }
  const link = before.cal;
  if (!link) {
    // Gained a time on an auto-calendar setup
    if (auto && isConnected(auto) && after.date && after.time && !before.time && !after.done && !after.cal) {
      enqueue({ op: 'create', provider: auto, taskId: after.id, calendarId: defaultCalendarId(auto) });
      kick();
    }
    return;
  }
  if (!after.cal) return; // link removed explicitly
  if (meta && meta.reason === 'rollforward') return; // the recurring event continues on its own
  if (after.done !== before.done) return;
  const changed =
    SYNC_FIELDS.some((f) => before[f] !== after[f]) ||
    JSON.stringify(before.recur) !== JSON.stringify(after.recur) ||
    JSON.stringify(before.subtasks) !== JSON.stringify(after.subtasks);
  if (!changed) return;
  enqueue({ op: 'update', provider: link.provider, taskId: after.id, dateChanged: before.date !== after.date });
  kick();
});

store.onTaskDelete((task) => {
  if (!task.cal) return;
  // Wait a few seconds so "Undo" can cancel the deletion.
  enqueue({ op: 'delete', provider: task.cal.provider, taskId: task.id, calendarId: task.cal.calendarId, eventId: task.cal.eventId, notBefore: Date.now() + 7000 });
  kick(7200);
});

// ---------- user actions ----------
// Returns {mode:'api'|'queued'|'link', url?}
export async function addToCalendar(task, p, calendarId) {
  if (!task.date) throw new Error('Give the task a date first.');
  if (isConnected(p)) {
    const cal = calendarId !== undefined ? calendarId : defaultCalendarId(p);
    if (p === 'outlook') outlook.configure(config('outlook'));
    let token = null;
    try {
      token = await PROVIDERS[p].ensureToken();
    } catch {
      /* offline */
    }
    if (token) {
      const res = await PROVIDERS[p].createEvent(cal, task, opts());
      store.setCalLink(task.id, linkFor(task, p, cal, res));
      sync();
      return { mode: 'api' };
    }
    enqueue({ op: 'create', provider: p, taskId: task.id, calendarId: cal });
    status[p].needsAuth = true;
    emit('status');
    return { mode: 'queued' };
  }
  return { mode: 'link', url: linkUrl(task, p) };
}

export function linkUrl(task, p) {
  return p === 'google' ? googleTemplateUrl(task, opts()) : outlookComposeUrl(task, opts());
}

export async function removeFromCalendar(task) {
  const link = task.cal;
  if (!link) return;
  store.setCalLink(task.id, null);
  enqueue({ op: 'delete', provider: link.provider, taskId: `${task.id}#unlink`, calendarId: link.calendarId, eventId: link.eventId });
  kick(100);
}

export function icsFor(task) {
  return { text: buildICS(task, opts()), filename: icsFileName(task) };
}

// ---------- reading events ----------
function linkedIndex() {
  const m = new Map();
  for (const t of store.tasks) if (t.cal) m.set(t.cal.eventId, t);
  return m;
}

function overlapsDay(ev, key) {
  if (ev.allDay) return ev.start <= key && key < ev.end;
  const s = new Date(ev.start);
  const e = new Date(ev.end);
  return s < fromKey(addDays(key, 1)) && e > fromKey(key);
}

export function eventsForDay(key) {
  const out = [];
  const linked = linkedIndex();
  // Completed occurrences of a recurring task are shown as done blocks; hide that day's series instance.
  const doneOccurrences = new Set(store.tasks.filter((t) => t.done && t.fromRecurring && t.date).map((t) => `${t.fromRecurring}|${t.date}`));
  for (const p of PROVIDER_IDS) {
    if (!isConnected(p) || !cache[p] || !cache[p].events) continue;
    const shown = shownIds(p);
    for (const ev of cache[p].events) {
      if (!shown.has(ev.calendarId) || !overlapsDay(ev, key)) continue;
      const t = linked.get(ev.id) || (ev.seriesId && linked.get(ev.seriesId)) || (ev.taskId && store.getTask(ev.taskId));
      if (t && t.date === key) continue; // the task itself is shown instead
      if (t && !t.recur && !ev.seriesId) continue;
      if (t && t.recur && doneOccurrences.has(`${t.id}|${key}`)) continue;
      out.push(ev);
    }
  }
  const t = (ev) => (ev.allDay ? fromKey(ev.start).getTime() : new Date(ev.start).getTime());
  return out.sort((a, b) => (a.allDay === b.allDay ? t(a) - t(b) || a.title.localeCompare(b.title) : a.allDay ? -1 : 1));
}

export function hasEventsCache() {
  return PROVIDER_IDS.some((p) => isConnected(p) && cache[p] && cache[p].events && cache[p].events.length);
}

export function lastSyncAt() {
  const times = PROVIDER_IDS.filter(isConnected).map((p) => (cache[p] && cache[p].fetchedAt) || 0);
  return times.length ? Math.min(...times) : 0;
}

// For tests and debugging
export function _debug() {
  return { cache, queue, status };
}

// Load cached events injected for previews/tests
export function _setCache(p, data) {
  cache[p] = data;
  saveCache();
  emit('events');
}
