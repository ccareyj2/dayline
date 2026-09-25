// Dayline — app bootstrap, navigation and event wiring.
import { store } from './store.js';
import * as cal from './calendar/index.js';
import { ui, $, toast, closeTopSheet, topSheet, copyText, offerFile, isStandalone, haptic, icon, esc } from './ui/dom.js';
import { renderToday, renderUpcoming, renderLists, renderList, renderSettings } from './ui/views.js';
import { renderSchedule, scheduleDate, autoPlan, scrollTimelineIntoView, attachTimelineDrag, updateNowLine, minutesFromPointer, scrollToTaskBlock } from './ui/schedule.js';
import { openQuickAdd, openEditSheet, openEventSheet, openPlanSheet, openSearch, openListEditor, confirmSheet, openInstallHelp, openCheatSheet } from './ui/sheets.js';
import { initNotifications, requestPermission, updateBadge } from './notify.js';
import { todayKey, addDays, fmtDay, toHHMM } from './dates.js';

const TOP_VIEWS = ['today', 'schedule', 'upcoming', 'lists'];
const scrollMemory = {};
let lastKey = null;
let prevView = 'today';
let currentDay = todayKey();

// ---------- theme ----------
function applyTheme() {
  const t = store.settings.theme;
  const root = document.documentElement;
  if (t === 'light' || t === 'dark') root.dataset.theme = t;
  else delete root.dataset.theme;
  const metas = document.querySelectorAll('meta[name="theme-color"]');
  metas.forEach((m) => {
    const isDarkMeta = (m.getAttribute('media') || '').includes('dark');
    if (t === 'light') m.setAttribute('content', '#f6f4ef');
    else if (t === 'dark') m.setAttribute('content', '#0e121c');
    else m.setAttribute('content', isDarkMeta ? '#0e121c' : '#f6f4ef');
  });
}

// ---------- rendering ----------
function viewKey() {
  if (ui.view === 'list') return `list:${ui.listId}`;
  if (ui.view === 'schedule') return `schedule:${scheduleDate()}`;
  return ui.view;
}

function render() {
  const v = ui.view;
  let out;
  if (v === 'schedule') out = renderSchedule();
  else if (v === 'upcoming') out = renderUpcoming();
  else if (v === 'lists') out = renderLists();
  else if (v === 'list') out = renderList(ui.listId);
  else if (v === 'settings') out = renderSettings();
  else out = renderToday();

  const key = viewKey();
  const same = key === lastKey;
  const y = window.scrollY;
  const active = document.activeElement;
  const activeId = active && active.id && $('#view').contains(active) ? active.id : null;

  $('#topbar').innerHTML = out.top;
  const view = $('#view');
  view.innerHTML = out.body;
  view.classList.toggle('no-fab', !!out.noFab);
  $('#fab').hidden = !!out.noFab;
  ui.fabDefaults = out.fabDefaults || {};
  const tabView = v === 'list' ? 'lists' : v;
  for (const tab of document.querySelectorAll('.tab')) {
    if (tab.dataset.view === tabView) tab.setAttribute('aria-current', 'page');
    else tab.removeAttribute('aria-current');
  }
  if (same) window.scrollTo(0, y);
  else {
    if (lastKey) scrollMemory[lastKey] = y;
    if (v === 'schedule') scrollTimelineIntoView();
    else window.scrollTo(0, scrollMemory[key] || 0);
  }
  if (activeId) {
    const el = document.getElementById(activeId);
    if (el) el.focus({ preventScroll: true });
  }
  if (v === 'schedule') attachTimelineDrag();
  lastKey = key;
}

let raf = 0;
function scheduleRender() {
  if (raf) return;
  raf = requestAnimationFrame(() => {
    raf = 0;
    render();
  });
}
ui.renderFn = scheduleRender;

function go(view) {
  if (view === ui.view && view !== 'list') {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  if (ui.view !== 'settings') prevView = ui.view === 'list' ? 'lists' : ui.view;
  ui.view = view;
  if (TOP_VIEWS.includes(view)) store.setSetting('lastView', view, { silent: true });
  render();
}

function showOverlay(message) {
  const el = document.createElement('div');
  el.className = 'overlay-msg';
  el.innerHTML = `<div>${icon('sync')}${esc(message)}</div>`;
  document.body.appendChild(el);
  return () => el.remove();
}

// ---------- task actions ----------
const pendingToggle = new Set();
function toggleTask(id, el) {
  const t = store.getTask(id);
  if (!t || pendingToggle.has(id)) return;
  if (t.done) {
    store.toggleDone(id);
    return;
  }
  pendingToggle.add(id);
  const row = el && el.closest('.task, .blk-task, .tray-item');
  if (row) row.classList.add('completing');
  if (el) el.setAttribute('aria-checked', 'true');
  haptic();
  setTimeout(() => {
    pendingToggle.delete(id);
    const res = store.toggleDone(id);
    if (!res) return;
    const msg = res.rolledTo ? `Done — next one: ${fmtDay(res.rolledTo)}` : `Completed “${res.task.title}”`;
    toast(msg, { action: () => store.undo() });
  }, 300);
}

function navContext() {
  return { view: ui.view, listId: ui.listId || null, scheduleDate: ui.scheduleDate || null };
}

function restoreNav(ctx) {
  if (!ctx || !ctx.view) return;
  if (ctx.view === 'list' && !store.lists.some((l) => l.id === ctx.listId) && !['__all', '__done'].includes(ctx.listId)) return;
  if (!['today', 'schedule', 'upcoming', 'lists', 'list', 'settings'].includes(ctx.view)) return;
  ui.view = ctx.view;
  ui.listId = ctx.listId;
  if (ctx.scheduleDate) ui.scheduleDate = ctx.scheduleDate;
  if (ctx.view === 'settings') prevView = store.settings.lastView || 'today';
}

async function connectProvider(p) {
  const hide = showOverlay(`Opening ${cal.PROVIDER_LABEL[p]} sign-in…`);
  try {
    await cal.connect(p, { context: navContext() });
  } catch (err) {
    hide();
    toast(err.message === 'not_configured' ? 'Add the client ID first (Settings → Calendars).' : `Couldn’t start sign-in: ${err.message || err}`);
  }
  // If navigation didn't happen (e.g. blocked), remove the overlay after a moment.
  setTimeout(hide, 6000);
}

const actions = {
  go: (el) => go(el.dataset.view),
  'go-back': () => go(prevView || 'today'),
  toggle: (el) => toggleTask(el.dataset.id, el),
  edit: (el) => openEditSheet(el.dataset.id),
  'quick-add': (el) => openQuickAdd({ ...(el.id === 'fab' ? ui.fabDefaults : {}), ...(el.dataset.date ? { date: el.dataset.date } : {}), ...(el.dataset.text ? { text: el.dataset.text } : {}) }),
  search: () => openSearch(),
  'open-event': (el) => openEventSheet(el.dataset.key),
  'overdue-to-today': () => {
    const today = todayKey();
    const ids = store.tasks.filter((t) => !t.done && t.date && t.date < today).map((t) => t.id);
    if (!ids.length) return;
    store.bulkUpdate(ids, () => ({ date: today }), 'Moved to today');
    toast(`Moved ${ids.length} task${ids.length > 1 ? 's' : ''} to today`, { action: () => store.undo() });
  },
  'toggle-expand': (el) => {
    ui.expanded[el.dataset.key] = !ui.expanded[el.dataset.key];
    render();
  },
  'dismiss-install': () => store.setSetting('installDismissed', true),
  'cal-connect': (el) => connectProvider(el.dataset.provider),
  'cal-sync': () => {
    cal.sync({ force: true });
    render();
  },
  'cal-disconnect': async (el) => {
    const p = el.dataset.provider;
    const ok = await confirmSheet({ title: `Disconnect ${cal.PROVIDER_LABEL[p]}?`, message: 'Events stop showing in Dayline. Events already on your calendar stay there.', confirmLabel: 'Disconnect' });
    if (ok) {
      await cal.disconnect(p);
      toast(`${cal.PROVIDER_LABEL[p]} disconnected`);
    }
  },
  'save-provider': (el) => {
    const p = el.dataset.provider;
    for (const input of document.querySelectorAll(`[data-provider-field^="${p}:"]`)) {
      const field = input.dataset.providerField.split(':')[1];
      store.setProviderSetting(p, field, input.value.trim(), { silent: true });
    }
    ui.expanded[`cfg:${p}`] = false;
    store.emit('settings');
    toast(cal.isConfigured(p) ? 'Saved — now tap Connect' : 'Cleared');
  },
  copy: async (el) => {
    const ok = await copyText(el.dataset.text || '');
    toast(ok ? 'Copied' : 'Couldn’t copy — select and copy it manually');
  },
  'pick-day': (el) => {
    ui.scheduleDate = el.dataset.date;
    if (ui.view !== 'schedule') ui.view = 'schedule';
    render();
  },
  'week-shift': (el) => {
    ui.scheduleDate = addDays(scheduleDate(), +el.dataset.delta);
    render();
  },
  'auto-plan': (el) => {
    const r = autoPlan(el.dataset.date);
    if (r.reason === 'ok') {
      render();
      requestAnimationFrame(() => scrollToTaskBlock(r.ids));
      toast(`Planned ${r.planned} task${r.planned > 1 ? 's' : ''}${r.skipped ? ` · ${r.skipped} didn’t fit` : ''}`, { action: () => store.undo() });
    }
    else if (r.reason === 'full') toast('No free time left in your work hours. Adjust hours in Settings or plan one by one.');
    else if (r.reason === 'none') toast('Nothing to plan.');
  },
  'plan-task': (el) => openPlanSheet(el.dataset.id, el.dataset.date),
  'timeline-tap': (el, e) => {
    if (e.target.closest('.blk')) return;
    const m = minutesFromPointer(el, e.clientY);
    openQuickAdd({ date: el.dataset.date, time: toHHMM(m) });
  },
  'open-list': (el) => {
    ui.listId = el.dataset.id;
    go('list');
  },
  'new-list': () => openListEditor(),
  'edit-list': (el) => openListEditor(el.dataset.id),
  'clear-completed': async () => {
    const done = store.tasks.filter((t) => t.done);
    if (!done.length) return;
    const ok = await confirmSheet({ title: 'Clear completed?', message: `Delete ${done.length} completed task${done.length > 1 ? 's' : ''}. You can undo right after.`, confirmLabel: 'Delete' });
    if (!ok) return;
    store.pushUndo('Cleared completed');
    store.state.tasks = store.state.tasks.filter((t) => !t.done);
    store.save();
    store.emit('task');
    toast('Cleared completed tasks', { action: () => store.undo() });
  },
  export: async () => {
    const res = await offerFile(store.exportData(), `dayline-backup-${todayKey()}.json`, 'application/json');
    if (res !== 'cancelled') {
      store.setMeta('lastBackupAt', new Date().toISOString());
      render();
    }
  },
  import: () => {
    const input = document.getElementById('import-file');
    if (input) input.click();
  },
  erase: async () => {
    const ok = await confirmSheet({ title: 'Erase all tasks?', message: 'This removes every task and list on this device. Settings and calendar connections stay. You can undo right after.', confirmLabel: 'Erase' });
    if (!ok) return;
    store.resetAll();
    toast('All tasks erased', { action: () => store.undo() });
  },
  'install-help': () => openInstallHelp(),
  'quick-add-help': () => openCheatSheet(),
};

document.addEventListener('click', (e) => {
  // Swallow the one click that follows a drag on the timeline.
  if (ui.suppressClickUntil) {
    const until = ui.suppressClickUntil;
    ui.suppressClickUntil = 0;
    if (Date.now() < until) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
  }
  const el = e.target.closest('[data-action]');
  if (!el || el.disabled) return;
  const fn = actions[el.dataset.action];
  if (fn) fn(el, e);
});

document.addEventListener('change', async (e) => {
  const t = e.target;
  if (t.dataset.providerSelect) {
    store.setProviderSetting(t.dataset.providerSelect, 'defaultCalendar', t.value);
    return;
  }
  if (t.dataset.calToggle) {
    const p = t.dataset.calToggle;
    const cur = { ...(store.settings[p].calendars || {}) };
    cur[t.dataset.calId] = t.checked;
    store.setProviderSetting(p, 'calendars', cur, { silent: true });
    cal.sync();
    scheduleRender();
    return;
  }
  if (t.dataset.setting) {
    const k = t.dataset.setting;
    let v = t.value;
    if (k === 'weekStart' || k === 'defaultDuration') v = +v;
    if (k === 'defaultReminder') v = v === '' ? null : +v;
    if ((k === 'workStart' || k === 'workEnd') && !v) return;
    store.setSetting(k, v);
    if (k === 'theme') applyTheme();
    if (k === 'autoCalendar' && v) toast(`New tasks with a time will be added to ${cal.PROVIDER_LABEL[v]}`);
    return;
  }
  if (t.dataset.settingBool) {
    store.setSetting(t.dataset.settingBool, t.checked);
    return;
  }
  if (t.dataset.actionChange === 'toggle-notifications') {
    if (t.checked) {
      const perm = await requestPermission();
      if (perm === 'granted') {
        store.setSetting('notifications', true);
        updateBadge();
        toast('Notifications on');
      } else {
        t.checked = false;
        store.setSetting('notifications', false);
        toast(perm === 'denied' ? 'Notifications are blocked in iPhone Settings' : 'Notifications aren’t available here');
      }
    } else {
      store.setSetting('notifications', false);
      updateBadge();
    }
    return;
  }
  if (t.id === 'import-file' && t.files && t.files[0]) {
    const file = t.files[0];
    t.value = '';
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const n = Array.isArray(data.tasks) ? data.tasks.length : 0;
      const replace = await confirmSheet({ title: 'Restore backup', message: `This backup has ${n} task${n === 1 ? '' : 's'}. Replace everything on this device with it? (Choose Cancel to merge it with your current tasks instead.)`, confirmLabel: 'Replace', danger: true });
      const res = store.importData(data, replace ? 'replace' : 'merge');
      toast(`Restored ${res.tasks} task${res.tasks === 1 ? '' : 's'}`, { action: () => store.undo() });
    } catch (err) {
      toast(`That file couldn’t be read: ${err.message || err}`);
    }
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (closeTopSheet('escape')) e.preventDefault();
    return;
  }
  const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement && document.activeElement.tagName);
  if (typing || topSheet() || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === 'n' || e.key === 'a') {
    e.preventDefault();
    openQuickAdd(ui.fabDefaults || {});
  } else if (e.key === '/') {
    e.preventDefault();
    openSearch();
  } else if (e.key === '1') go('today');
  else if (e.key === '2') go('schedule');
  else if (e.key === '3') go('upcoming');
  else if (e.key === '4') go('lists');
  else if (ui.view === 'schedule' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
    ui.scheduleDate = addDays(scheduleDate(), e.key === 'ArrowLeft' ? -1 : 1);
    render();
  }
});

// Swipe the week strip to change weeks
let swipe = null;
document.addEventListener(
  'touchstart',
  (e) => {
    const strip = e.target.closest('[data-swipe="week"]');
    swipe = strip ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null;
  },
  { passive: true }
);
document.addEventListener('touchend', (e) => {
  if (!swipe) return;
  const t = e.changedTouches[0];
  const dx = t.clientX - swipe.x;
  const dy = t.clientY - swipe.y;
  swipe = null;
  if (Math.abs(dx) > 60 && Math.abs(dy) < 40) {
    ui.scheduleDate = addDays(scheduleDate(), dx < 0 ? 7 : -7);
    render();
  }
});

window.addEventListener(
  'scroll',
  () => {
    const tb = $('#topbar');
    if (tb) tb.classList.toggle('scrolled', window.scrollY > 4);
  },
  { passive: true }
);

// ---------- store & calendar subscriptions ----------
store.subscribe((reason) => {
  if (reason === 'settings') applyTheme();
  if (reason === 'save-error') toast('Couldn’t save — your device storage may be full.');
  scheduleRender();
});

cal.onChange((reason, data) => {
  if (reason === 'toast') {
    toast(data);
    return;
  }
  scheduleRender();
});

// ---------- service worker ----------
function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker
    .register('sw.js')
    .then((reg) => {
      const offer = (worker) =>
        toast('A new version of Dayline is ready', {
          actionLabel: 'Update',
          duration: 15000,
          action: () => worker.postMessage('skipWaiting'),
        });
      if (reg.waiting && hadController) offer(reg.waiting);
      reg.addEventListener('updatefound', () => {
        const w = reg.installing;
        if (!w) return;
        w.addEventListener('statechange', () => {
          if (w.state === 'installed' && navigator.serviceWorker.controller) offer(w);
        });
      });
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) reg.update().catch(() => {});
      });
    })
    .catch((err) => console.warn('Service worker registration failed', err));
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloading) return;
    reloading = true;
    store.flush();
    location.reload();
  });
  navigator.serviceWorker.addEventListener('message', (e) => {
    if (e.data && e.data.type === 'open-task' && e.data.id) openEditSheet(e.data.id);
  });
}

// ---------- lifecycle ----------
// Renew expired calendar sign-ins with a quick redirect. Returns true if the page is navigating away.
function autoRefresh() {
  if (!store.settings.autoRefreshAuth || !navigator.onLine || topSheet()) return false;
  const expired = cal.PROVIDER_IDS.some((p) => cal.isConnected(p) && !cal.hasUsableToken(p));
  if (!expired) return false;
  const hide = showOverlay('Refreshing your calendar…');
  if (cal.maybeAutoAuth(navContext())) return true;
  hide();
  return false;
}

function checkDayRollover() {
  const k = todayKey();
  if (k !== currentDay) {
    if (ui.scheduleDate === currentDay) ui.scheduleDate = k;
    currentDay = k;
    render();
  }
}

async function start() {
  applyTheme();
  const saved = store.settings.lastView;
  ui.view = TOP_VIEWS.includes(saved) ? saved : 'today';
  const params = new URLSearchParams(location.search);
  if (params.get('view') && TOP_VIEWS.includes(params.get('view'))) ui.view = params.get('view');

  let ret = null;
  try {
    ret = await cal.handleRedirect();
  } catch (err) {
    console.error(err);
  }
  if (ret) restoreNav(ret.context);
  render();
  registerServiceWorker();
  initNotifications();

  if (ret) {
    if (ret.ok && !ret.silent) toast(`${cal.PROVIDER_LABEL[ret.provider]} connected`);
    else if (!ret.ok && ret.message && !(ret.silent && ret.error !== 'state_mismatch' && /sign in again/.test(ret.message))) toast(ret.message);
  }

  if (cal.anyConnected()) {
    if (!(ret && !ret.ok) && !autoRefresh()) cal.sync();
  }

  if (params.get('action') === 'add') setTimeout(() => openQuickAdd(ui.fabDefaults || {}), 300);
  if (params.has('view') || params.has('action')) history.replaceState(null, '', location.pathname);

  setInterval(() => {
    if (document.hidden) return;
    updateNowLine();
    checkDayRollover();
  }, 30000);
  setInterval(() => {
    if (!document.hidden && cal.anyConnected()) cal.sync();
  }, 5 * 60 * 1000);
  let hiddenAt = 0;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      hiddenAt = Date.now();
      store.flush();
      return;
    }
    checkDayRollover();
    // Coming back after a while counts as "opening the app": renew an expired sign-in first.
    if (hiddenAt && Date.now() - hiddenAt > 10 * 60 * 1000 && autoRefresh()) return;
    if (cal.anyConnected() && Date.now() - cal.lastSyncAt() > 2 * 60 * 1000) cal.sync();
    scheduleRender();
  });
  window.addEventListener('pagehide', () => store.flush());
  window.addEventListener('online', () => cal.anyConnected() && cal.sync());
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    ui.installPrompt = e;
  });
  if (navigator.storage && navigator.storage.persist && isStandalone()) navigator.storage.persist().catch(() => {});
}

start();

// Handy for debugging from the console
window.dayline = { store, cal };
