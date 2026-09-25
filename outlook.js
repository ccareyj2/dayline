// Outlook / Microsoft 365 calendar via Microsoft identity platform (auth code + PKCE, SPA) and Microsoft Graph.
import { savePending, redirectUri, randomString, sha256b64url, decodeJwt, AuthError, ApiError } from './oauth.js';
import { taskWindow, eventDetails } from './links.js';
import { isoLocal, localTimeZone, utcExtended, fromKey, weekday } from '../dates.js';
import { normalizeRule } from '../recur.js';
import { ianaZone, windowsZone } from '../tz.js';

const TOKEN_KEY = 'dayline:auth:outlook';
const GRAPH = 'https://graph.microsoft.com/v1.0';
const SCOPES = 'openid profile offline_access User.Read Calendars.ReadWrite';

export const id = 'outlook';
export const label = 'Outlook';

const loginBase = (tenant) => `https://login.microsoftonline.com/${encodeURIComponent((tenant || '').trim() || 'organizations')}/oauth2/v2.0`;

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

export function canRefresh() {
  const a = getAuth();
  return !!(a && a.refreshToken && a.refreshExpiresAt > Date.now() + 60000);
}

export function account() {
  const a = getAuth();
  return a && a.account ? a.account.username || '' : '';
}

let cfg = { clientId: '', tenant: '' };
export function configure(c) {
  cfg = { ...cfg, ...c };
}

export async function startAuth({ clientId, tenant, prompt, silent = false, context = null }) {
  const verifier = randomString(48);
  const challenge = await sha256b64url(verifier);
  const state = randomString(16);
  savePending({ provider: 'outlook', state, verifier, silent, context, createdAt: Date.now() });
  const p = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri(),
    response_mode: 'fragment',
    scope: SCOPES,
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });
  const hint = account();
  if (hint) p.set('login_hint', hint);
  if (prompt) p.set('prompt', prompt);
  location.assign(`${loginBase(tenant)}/authorize?${p.toString()}`);
}

async function tokenRequest(params, tenant) {
  const res = await fetch(`${loginBase(tenant)}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params).toString(),
  });
  let json = {};
  try {
    json = await res.json();
  } catch {
    /* ignore */
  }
  if (!res.ok) {
    const err = new Error(json.error_description || json.error || `Token request failed (${res.status})`);
    err.code = json.error || 'token_error';
    throw err;
  }
  return json;
}

export async function completeAuth(params, pending, { clientId, tenant }) {
  if (params.error) return { ok: false, error: params.error, description: params.error_description || '' };
  try {
    const json = await tokenRequest(
      {
        client_id: clientId,
        scope: SCOPES,
        code: params.code,
        redirect_uri: redirectUri(),
        grant_type: 'authorization_code',
        code_verifier: pending.verifier,
      },
      tenant
    );
    const claims = json.id_token ? decodeJwt(json.id_token) : {};
    const prev = getAuth() || {};
    setAuth({
      accessToken: json.access_token,
      expiresAt: Date.now() + (json.expires_in || 3600) * 1000 - 60000,
      refreshToken: json.refresh_token || null,
      // SPA refresh tokens last 24 hours from sign-in and don't extend when used.
      refreshExpiresAt: Date.now() + 24 * 3600 * 1000 - 10 * 60 * 1000,
      account: { name: claims.name || (prev.account && prev.account.name) || '', username: claims.preferred_username || (prev.account && prev.account.username) || '' },
      connected: true,
      connectedAt: prev.connectedAt || Date.now(),
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.code || 'token_error', description: err.message };
  }
}

let refreshing = null;
async function refresh() {
  const a = getAuth();
  if (!a || !a.refreshToken || a.refreshExpiresAt < Date.now()) return null;
  if (!refreshing) {
    refreshing = tokenRequest(
      { client_id: cfg.clientId, scope: SCOPES, refresh_token: a.refreshToken, grant_type: 'refresh_token' },
      cfg.tenant
    )
      .then((json) => {
        const cur = getAuth() || a;
        setAuth({
          ...cur,
          accessToken: json.access_token,
          expiresAt: Date.now() + (json.expires_in || 3600) * 1000 - 60000,
          refreshToken: json.refresh_token || cur.refreshToken,
        });
        return json.access_token;
      })
      .catch((err) => {
        if (err.code === 'invalid_grant' || err.code === 'interaction_required') {
          const cur = getAuth();
          if (cur) setAuth({ ...cur, accessToken: null, expiresAt: 0, refreshToken: null, refreshExpiresAt: 0 });
          return null;
        }
        throw err;
      })
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

export async function ensureToken() {
  if (hasValidToken()) return getAuth().accessToken;
  return refresh();
}

export function markExpired() {
  const a = getAuth();
  if (a) setAuth({ ...a, accessToken: null, expiresAt: 0 });
}

async function graph(pathOrUrl, { method = 'GET', body, headers = {}, okStatuses = [], retry = true } = {}) {
  const token = await ensureToken();
  if (!token) throw new AuthError('expired');
  const url = pathOrUrl.startsWith('https://') ? pathOrUrl : GRAPH + pathOrUrl;
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) {
    markExpired();
    if (retry && canRefresh()) return graph(pathOrUrl, { method, body, headers, okStatuses, retry: false });
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

const COLOR_MAP = {
  lightBlue: '#4A90D9',
  lightGreen: '#5DB36B',
  lightOrange: '#E8923C',
  lightGray: '#8A8F98',
  lightYellow: '#D9B43A',
  lightTeal: '#2FA5A5',
  lightPink: '#D96BA6',
  lightBrown: '#A67C52',
  lightRed: '#D9534F',
  maxColor: '#1A8FA3',
  auto: '#1A8FA3',
};

export async function listCalendars() {
  const data = await graph('/me/calendars?$select=id,name,color,hexColor,isDefaultCalendar,canEdit&$top=100');
  return (data.value || []).map((c) => ({
    id: c.id,
    name: c.name,
    color: c.hexColor || COLOR_MAP[c.color] || '#1A8FA3',
    primary: !!c.isDefaultCalendar,
    canEdit: c.canEdit !== false,
    selected: true,
  }));
}

// Graph returns UTC wall-clock strings like 2026-09-24T19:00:00.0000000 (no zone designator).
function graphUtcToIso(s) {
  return s ? `${s.slice(0, 19)}Z` : null;
}

function mapEvent(ev, cal) {
  const allDay = !!ev.isAllDay;
  return {
    key: `outlook|${cal.id}|${ev.id}`,
    provider: 'outlook',
    calendarId: cal.id,
    calendarName: cal.name,
    id: ev.id,
    seriesId: ev.seriesMasterId || null,
    title: ev.subject || '(No title)',
    allDay,
    start: allDay ? ev.start.dateTime.slice(0, 10) : graphUtcToIso(ev.start.dateTime),
    end: allDay ? ev.end.dateTime.slice(0, 10) : graphUtcToIso(ev.end.dateTime),
    location: (ev.location && ev.location.displayName) || '',
    url: ev.webLink || '',
    joinUrl: (ev.onlineMeeting && ev.onlineMeeting.joinUrl) || '',
    color: cal.color,
    busy: ev.showAs !== 'free',
    taskId: null,
  };
}

export async function listEvents(cal, timeMin, timeMax) {
  const out = [];
  const select = 'id,subject,start,end,isAllDay,location,webLink,isCancelled,showAs,responseStatus,onlineMeeting,seriesMasterId';
  let url = `/me/calendars/${encodeURIComponent(cal.id)}/calendarView?startDateTime=${encodeURIComponent(timeMin)}&endDateTime=${encodeURIComponent(timeMax)}&$top=250&$select=${select}&$orderby=start/dateTime`;
  for (let page = 0; page < 6 && url; page++) {
    // Without a Prefer header Graph returns start/end in UTC.
    const data = await graph(url);
    for (const ev of data.value || []) {
      if (ev.isCancelled) continue;
      if (ev.responseStatus && ev.responseStatus.response === 'declined') continue;
      out.push(mapEvent(ev, cal));
    }
    url = data['@odata.nextLink'] || null;
  }
  return out;
}

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function graphRecurrence(rule, startKey) {
  const r = normalizeRule(rule);
  if (!r) return null;
  const d = fromKey(startKey);
  let pattern;
  switch (r.freq) {
    case 'daily':
      pattern = { type: 'daily', interval: r.interval };
      break;
    case 'weekdays':
      pattern = { type: 'weekly', interval: 1, daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] };
      break;
    case 'weekly':
      pattern = { type: 'weekly', interval: r.interval, daysOfWeek: (r.byDays && r.byDays.length ? r.byDays : [weekday(startKey)]).map((i) => DAY_NAMES[i]) };
      break;
    case 'monthly':
      pattern = { type: 'absoluteMonthly', interval: r.interval, dayOfMonth: d.getDate() };
      break;
    case 'yearly':
      pattern = { type: 'absoluteYearly', interval: r.interval, dayOfMonth: d.getDate(), month: d.getMonth() + 1 };
      break;
    default:
      return null;
  }
  return { pattern, range: { type: 'noEnd', startDate: startKey } };
}

export function eventPayload(task, { defaultDuration = 30 } = {}) {
  const w = taskWindow(task, defaultDuration);
  if (!w) return null;
  const raw = localTimeZone();
  // Outlook reliably understands Windows zone names; fall back to IANA, or UTC for one-off events.
  const tz = windowsZone(raw) || ianaZone(raw);
  const body = {
    subject: task.title,
    body: { contentType: 'text', content: eventDetails(task) },
    isReminderOn: task.reminder !== null && task.reminder !== undefined,
    reminderMinutesBeforeStart: task.reminder !== null && task.reminder !== undefined ? Math.max(0, task.reminder) : 15,
    showAs: 'busy',
  };
  if (w.allDay) {
    body.isAllDay = true;
    body.start = { dateTime: `${w.startKey}T00:00:00`, timeZone: tz };
    body.end = { dateTime: `${w.endKey}T00:00:00`, timeZone: tz };
  } else if (windowsZone(raw) || task.recur) {
    body.isAllDay = false;
    body.start = { dateTime: isoLocal(w.start), timeZone: tz };
    body.end = { dateTime: isoLocal(w.end), timeZone: tz };
  } else {
    body.isAllDay = false;
    body.start = { dateTime: utcExtended(w.start).replace('Z', ''), timeZone: 'UTC' };
    body.end = { dateTime: utcExtended(w.end).replace('Z', ''), timeZone: 'UTC' };
  }
  if (task.recur) body.recurrence = graphRecurrence(task.recur, task.date);
  return body;
}

export async function createEvent(calendarId, task, opts) {
  const path = calendarId ? `/me/calendars/${encodeURIComponent(calendarId)}/events` : '/me/events';
  const ev = await graph(path, { method: 'POST', body: eventPayload(task, opts) });
  return { eventId: ev.id, url: ev.webLink || '' };
}

export async function patchEvent(calendarId, eventId, task, opts) {
  const body = eventPayload(task, opts);
  delete body.recurrence;
  const ev = await graph(`/me/events/${encodeURIComponent(eventId)}`, { method: 'PATCH', body });
  return { eventId: ev.id, url: ev.webLink || '' };
}

export async function getEvent(calendarId, eventId) {
  try {
    const ev = await graph(`/me/events/${encodeURIComponent(eventId)}?$select=id,subject,start,end,isAllDay,isCancelled,type`);
    if (!ev || ev.isCancelled) return null;
    return ev;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

export async function deleteEvent(calendarId, eventId) {
  await graph(`/me/events/${encodeURIComponent(eventId)}`, { method: 'DELETE', okStatuses: [404] });
}

export async function revoke() {
  clearAuth();
}
