// Google Calendar via the browser-only OAuth redirect flow + Calendar API v3.
import { savePending, redirectUri, randomString, AuthError, ApiError } from './oauth.js';
import { taskWindow, eventDetails } from './links.js';
import { isoWithOffset, localTimeZone, addDays } from '../dates.js';
import { toRRule } from '../recur.js';
import { ianaZone } from '../tz.js';

const TOKEN_KEY = 'dayline:auth:google';
const API = 'https://www.googleapis.com/calendar/v3';
export const SCOPES = ['https://www.googleapis.com/auth/calendar.events', 'https://www.googleapis.com/auth/calendar.calendarlist.readonly'];

export const id = 'google';
export const label = 'Google Calendar';

export function getAuth() {
  try {
    return JSON.parse(localStorage.getItem(TOKEN_KEY) || 'null');
  } catch {
    return null;
  }
}

function setAuth(a) {
  localStorage.setItem(TOKEN_KEY, JSON.stringify(a));
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
}

export function isConnected() {
  const a = getAuth();
  return !!(a && a.connected);
}

export function hasValidToken() {
  const a = getAuth();
  return !!(a && a.accessToken && a.expiresAt > Date.now() + 30000);
}

export function account() {
  const a = getAuth();
  return a ? a.email || '' : '';
}

// Google tokens can't be refreshed without a redirect, so a missing token means "needs a quick sign-in".
export async function ensureToken() {
  return hasValidToken() ? getAuth().accessToken : null;
}

export function startAuth({ clientId, prompt, silent = false, context = null }) {
  const state = randomString(16);
  savePending({ provider: 'google', state, silent, context, createdAt: Date.now() });
  const p = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri(),
    response_type: 'token',
    scope: SCOPES.join(' '),
    include_granted_scopes: 'true',
    state,
  });
  const hint = account();
  if (hint) p.set('login_hint', hint);
  if (prompt) p.set('prompt', prompt);
  location.assign(`https://accounts.google.com/o/oauth2/v2/auth?${p.toString()}`);
}

export async function completeAuth(params) {
  if (params.error) return { ok: false, error: params.error };
  const scope = params.scope || '';
  if (!/calendar\.events/.test(scope)) return { ok: false, error: 'scope_denied' };
  const prev = getAuth() || {};
  setAuth({
    ...prev,
    accessToken: params.access_token,
    expiresAt: Date.now() + (parseInt(params.expires_in, 10) || 3600) * 1000 - 60000,
    scope,
    connected: true,
    connectedAt: prev.connectedAt || Date.now(),
  });
  return { ok: true };
}

export function markExpired() {
  const a = getAuth();
  if (a) setAuth({ ...a, accessToken: null, expiresAt: 0 });
}

async function api(path, { method = 'GET', body, query, okStatuses = [] } = {}) {
  const token = await ensureToken();
  if (!token) throw new AuthError('expired');
  const url = new URL(API + path);
  if (query) for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== null) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) {
    markExpired();
    throw new AuthError('expired');
  }
  if (okStatuses.includes(res.status)) return null;
  if (res.status === 204) return null;
  if (!res.ok) {
    let msg = '';
    try {
      const j = await res.json();
      msg = j && j.error && j.error.message;
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, msg);
  }
  return res.json();
}

export async function listCalendars() {
  try {
    const data = await api('/users/me/calendarList', { query: { maxResults: 250, minAccessRole: 'reader' } });
    const items = (data.items || []).map((c) => ({
      id: c.id,
      name: c.summaryOverride || c.summary || c.id,
      color: c.backgroundColor || '#4F7FE8',
      primary: !!c.primary,
      canEdit: c.accessRole === 'owner' || c.accessRole === 'writer',
      selected: c.selected !== false,
    }));
    const primary = items.find((c) => c.primary);
    if (primary) {
      const a = getAuth();
      if (a) setAuth({ ...a, email: primary.id });
    }
    return items;
  } catch (err) {
    // The calendar list permission is optional; fall back to the primary calendar.
    if (err instanceof ApiError && err.status === 403) return [{ id: 'primary', name: 'Google Calendar', color: '#4F7FE8', primary: true, canEdit: true, selected: true }];
    throw err;
  }
}

function mapEvent(ev, cal) {
  const allDay = !!(ev.start && ev.start.date);
  return {
    key: `google|${cal.id}|${ev.id}`,
    provider: 'google',
    calendarId: cal.id,
    calendarName: cal.name,
    id: ev.id,
    seriesId: ev.recurringEventId || null,
    title: ev.summary || '(No title)',
    allDay,
    start: allDay ? ev.start.date : ev.start.dateTime,
    end: allDay ? (ev.end && ev.end.date) || addDays(ev.start.date, 1) : (ev.end && ev.end.dateTime) || ev.start.dateTime,
    location: ev.location || '',
    url: ev.htmlLink || '',
    joinUrl: ev.hangoutLink || '',
    color: cal.color,
    busy: ev.transparency !== 'transparent',
    taskId: (ev.extendedProperties && ev.extendedProperties.private && ev.extendedProperties.private.daylineTaskId) || null,
  };
}

export async function listEvents(cal, timeMin, timeMax) {
  const out = [];
  let pageToken;
  for (let page = 0; page < 6; page++) {
    const data = await api(`/calendars/${encodeURIComponent(cal.id)}/events`, {
      query: {
        timeMin,
        timeMax,
        singleEvents: 'true',
        orderBy: 'startTime',
        maxResults: 250,
        pageToken,
        fields: 'nextPageToken,items(id,status,summary,start,end,location,htmlLink,hangoutLink,transparency,recurringEventId,attendees(self,responseStatus),extendedProperties)',
      },
    });
    for (const ev of data.items || []) {
      if (ev.status === 'cancelled') continue;
      const me = (ev.attendees || []).find((a) => a.self);
      if (me && me.responseStatus === 'declined') continue;
      out.push(mapEvent(ev, cal));
    }
    pageToken = data.nextPageToken;
    if (!pageToken) break;
  }
  return out;
}

export function eventPayload(task, { defaultDuration = 30 } = {}) {
  const w = taskWindow(task, defaultDuration);
  if (!w) return null;
  const tz = ianaZone(localTimeZone());
  const body = {
    summary: task.title,
    description: eventDetails(task),
    reminders: task.reminder !== null && task.reminder !== undefined ? { useDefault: false, overrides: [{ method: 'popup', minutes: Math.max(0, task.reminder) }] } : { useDefault: true },
    extendedProperties: { private: { daylineTaskId: task.id } },
  };
  if (w.allDay) {
    body.start = { date: w.startKey };
    body.end = { date: w.endKey };
  } else {
    body.start = { dateTime: isoWithOffset(w.start), timeZone: tz };
    body.end = { dateTime: isoWithOffset(w.end), timeZone: tz };
  }
  const rrule = task.recur ? toRRule(task.recur) : null;
  if (rrule) {
    body.recurrence = [`RRULE:${rrule}`];
    if (w.allDay) {
      body.start.timeZone = tz;
      body.end.timeZone = tz;
    }
  }
  return body;
}

export async function createEvent(calendarId, task, opts) {
  const ev = await api(`/calendars/${encodeURIComponent(calendarId)}/events`, { method: 'POST', body: eventPayload(task, opts) });
  return { eventId: ev.id, url: ev.htmlLink || '' };
}

export async function patchEvent(calendarId, eventId, task, opts) {
  const body = eventPayload(task, opts);
  delete body.recurrence;
  const ev = await api(`/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`, { method: 'PATCH', body });
  return { eventId: ev.id, url: ev.htmlLink || '' };
}

export async function getEvent(calendarId, eventId) {
  try {
    return await api(`/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`, { query: { fields: 'id,status,start,end,summary,recurrence' } });
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 410)) return null;
    throw err;
  }
}

export async function deleteEvent(calendarId, eventId) {
  await api(`/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`, { method: 'DELETE', okStatuses: [404, 410] });
}

export async function revoke() {
  const a = getAuth();
  if (a && a.accessToken) {
    try {
      await fetch('https://oauth2.googleapis.com/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ token: a.accessToken }).toString(),
      });
    } catch {
      /* best effort */
    }
  }
  clearAuth();
}
