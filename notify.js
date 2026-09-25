// In-app reminders (while Dayline is open) and the Home Screen badge count.
import { store } from './store.js';
import { todayKey, combine, fmtTime, fmtDuration } from './dates.js';

const FIRED_KEY = 'dayline:fired';
let fired = new Set();
try {
  fired = new Set(JSON.parse(localStorage.getItem(FIRED_KEY) || '[]'));
} catch {
  fired = new Set();
}

function saveFired() {
  // keep the most recent 300
  const arr = [...fired].slice(-300);
  fired = new Set(arr);
  localStorage.setItem(FIRED_KEY, JSON.stringify(arr));
}

export function notificationsSupported() {
  return 'Notification' in window && 'serviceWorker' in navigator;
}

export async function requestPermission() {
  if (!notificationsSupported()) return 'unsupported';
  try {
    return await Notification.requestPermission();
  } catch {
    return 'denied';
  }
}

export function badgeCount() {
  const today = todayKey();
  return store.tasks.filter((t) => !t.done && t.date && t.date <= today).length;
}

export function updateBadge() {
  if (!('setAppBadge' in navigator)) return;
  try {
    const n = store.settings.notifications ? badgeCount() : 0;
    if (n > 0) navigator.setAppBadge(n).catch(() => {});
    else if (navigator.clearAppBadge) navigator.clearAppBadge().catch(() => {});
  } catch {
    /* ignore */
  }
}

export async function tick() {
  updateBadge();
  if (!store.settings.notifications || !notificationsSupported() || Notification.permission !== 'granted') return;
  const now = Date.now();
  const due = [];
  for (const t of store.tasks) {
    if (t.done || !t.date || !t.time || t.reminder === null) continue;
    const at = combine(t.date, t.time).getTime() - t.reminder * 60000;
    const key = `${t.id}@${at}`;
    if (at <= now && now - at < 15 * 60000 && !fired.has(key)) due.push({ t, key });
  }
  if (!due.length) return;
  let reg = null;
  try {
    reg = await navigator.serviceWorker.getRegistration();
  } catch {
    reg = null;
  }
  for (const { t, key } of due) {
    fired.add(key);
    const body = `${fmtTime(t.time)}${t.duration ? ` · ${fmtDuration(t.duration)}` : ''}${t.notes ? ` — ${t.notes.slice(0, 80)}` : ''}`;
    const opts = { body, tag: key, data: { taskId: t.id }, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png' };
    try {
      if (reg && reg.showNotification) await reg.showNotification(t.title, opts);
      else new Notification(t.title, opts);
    } catch (err) {
      console.warn('Notification failed', err);
    }
  }
  saveFired();
}

let started = false;
export function initNotifications() {
  if (started) return;
  started = true;
  tick();
  setInterval(() => {
    if (!document.hidden) tick();
  }, 20000);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) tick();
  });
  store.subscribe(() => updateBadge());
}
