// App state: tasks, lists and settings, persisted to localStorage.
import { todayKey, isKey, toKey } from './dates.js';
import { nextFutureOccurrence, normalizeRule } from './recur.js';

const KEY = 'dayline:data';

export const LIST_COLORS = ['#E8553A', '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EC4899', '#14B8A6', '#64748B'];

export function uid() {
  try {
    if (crypto && crypto.randomUUID) return crypto.randomUUID();
  } catch {
    /* insecure context */
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 12);
}

export function defaultSettings() {
  return {
    theme: 'auto', // auto | light | dark
    weekStart: 0, // 0 = Sunday, 1 = Monday
    workStart: '09:00',
    workEnd: '17:00',
    defaultDuration: 30,
    defaultReminder: null, // minutes before; null = none
    autoCalendar: '', // '' | 'google' | 'outlook' — put timed tasks on this calendar automatically
    outlookLinkType: 'work', // work (outlook.office.com) | personal (outlook.live.com)
    autoRefreshAuth: true,
    notifications: false,
    badge: true,
    lastView: 'today',
    installDismissed: false,
    google: { clientId: '', calendars: {}, defaultCalendar: 'primary' },
    outlook: { clientId: '', tenant: '', calendars: {}, defaultCalendar: '' },
  };
}

function defaults() {
  return {
    version: 1,
    tasks: [],
    lists: [
      { id: 'inbox', name: 'Inbox', color: '#64748B', system: true },
      { id: uid(), name: 'Work', color: '#3B82F6' },
      { id: uid(), name: 'Personal', color: '#10B981' },
    ],
    settings: defaultSettings(),
    meta: { createdAt: new Date().toISOString(), lastBackupAt: null },
  };
}

export function makeTask(p = {}) {
  const now = new Date().toISOString();
  const date = isKey(p.date) ? p.date : null;
  const time = date && /^\d{2}:\d{2}$/.test(p.time || '') ? p.time : null;
  return {
    id: p.id || uid(),
    title: String(p.title || '').trim() || 'Untitled',
    notes: p.notes ? String(p.notes) : '',
    listId: p.listId || 'inbox',
    priority: Math.max(0, Math.min(3, parseInt(p.priority, 10) || 0)),
    date,
    time,
    duration: p.duration ? Math.max(5, Math.min(24 * 60, parseInt(p.duration, 10))) : null,
    recur: normalizeRule(p.recur),
    reminder: Number.isFinite(parseInt(p.reminder, 10)) ? parseInt(p.reminder, 10) : null,
    tags: Array.isArray(p.tags) ? p.tags.map((t) => String(t).toLowerCase()).filter(Boolean) : [],
    subtasks: Array.isArray(p.subtasks) ? p.subtasks.map((s) => ({ id: s.id || uid(), title: String(s.title || ''), done: !!s.done })) : [],
    done: !!p.done,
    doneAt: p.done ? p.doneAt || now : null,
    createdAt: p.createdAt || now,
    updatedAt: p.updatedAt || now,
    order: typeof p.order === 'number' ? p.order : Date.now(),
    cal: p.cal && p.cal.provider && p.cal.eventId ? { ...p.cal } : null,
    fromRecurring: p.fromRecurring || null,
  };
}

function sanitize(data) {
  const base = defaults();
  if (!data || typeof data !== 'object') return base;
  const lists = Array.isArray(data.lists) && data.lists.length ? data.lists.filter((l) => l && l.id && l.name) : base.lists;
  if (!lists.some((l) => l.id === 'inbox')) lists.unshift({ id: 'inbox', name: 'Inbox', color: '#64748B', system: true });
  const listIds = new Set(lists.map((l) => l.id));
  const tasks = Array.isArray(data.tasks)
    ? data.tasks.filter((t) => t && t.id).map((t) => {
        const task = makeTask(t);
        if (!listIds.has(task.listId)) task.listId = 'inbox';
        return task;
      })
    : [];
  const settings = { ...defaultSettings(), ...(data.settings || {}) };
  settings.google = { ...defaultSettings().google, ...((data.settings || {}).google || {}) };
  settings.outlook = { ...defaultSettings().outlook, ...((data.settings || {}).outlook || {}) };
  return { version: 1, tasks, lists, settings, meta: { ...base.meta, ...(data.meta || {}) } };
}

export function localDateOfIso(iso) {
  if (!iso) return null;
  return toKey(new Date(iso));
}

class Store {
  constructor() {
    this.listeners = new Set();
    this.undoStack = [];
    this.changeHooks = new Set();
    this.deleteHooks = new Set();
    this.saveTimer = null;
    this.state = this.load();
    window.addEventListener('storage', (e) => {
      if (e.key === KEY && e.newValue) {
        try {
          this.state = sanitize(JSON.parse(e.newValue));
          this.emit('external');
        } catch {
          /* ignore */
        }
      }
    });
  }

  load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return sanitize(JSON.parse(raw));
    } catch (err) {
      console.warn('Could not read saved data', err);
    }
    return defaults();
  }

  save(immediate = false) {
    clearTimeout(this.saveTimer);
    const write = () => {
      try {
        localStorage.setItem(KEY, JSON.stringify(this.state));
      } catch (err) {
        console.error('Save failed', err);
        this.emit('save-error');
      }
    };
    if (immediate) write();
    else this.saveTimer = setTimeout(write, 120);
  }

  flush() {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
      try {
        localStorage.setItem(KEY, JSON.stringify(this.state));
      } catch {
        /* ignore */
      }
    }
  }

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  emit(reason = 'change') {
    for (const fn of this.listeners) {
      try {
        fn(reason);
      } catch (err) {
        console.error(err);
      }
    }
  }

  onTaskChange(fn) {
    this.changeHooks.add(fn);
  }

  onTaskDelete(fn) {
    this.deleteHooks.add(fn);
  }

  fireChange(before, after, meta = {}) {
    for (const fn of this.changeHooks) {
      try {
        fn(before, after, meta);
      } catch (err) {
        console.error(err);
      }
    }
  }

  // ---------- undo ----------
  pushUndo(label) {
    this.undoStack.push({ label, snap: JSON.stringify({ tasks: this.state.tasks, lists: this.state.lists }) });
    if (this.undoStack.length > 30) this.undoStack.shift();
  }

  canUndo() {
    return this.undoStack.length > 0;
  }

  undo() {
    const item = this.undoStack.pop();
    if (!item) return null;
    const snap = JSON.parse(item.snap);
    this.state.tasks = snap.tasks;
    this.state.lists = snap.lists;
    this.save();
    this.emit('undo');
    return item.label;
  }

  // ---------- getters ----------
  get tasks() {
    return this.state.tasks;
  }
  get lists() {
    return this.state.lists;
  }
  get settings() {
    return this.state.settings;
  }
  getTask(id) {
    return this.state.tasks.find((t) => t.id === id) || null;
  }
  getList(id) {
    return this.state.lists.find((l) => l.id === id) || this.state.lists[0];
  }

  // ---------- tasks ----------
  addTask(partial, { undoLabel = 'Task added', silent = false } = {}) {
    if (undoLabel) this.pushUndo(undoLabel);
    const task = makeTask(partial);
    this.state.tasks.push(task);
    this.save();
    if (!silent) this.emit('task');
    this.fireChange(null, task);
    return task;
  }

  updateTask(id, patch, { undoLabel = null, silent = false, hooks = true } = {}) {
    const idx = this.state.tasks.findIndex((t) => t.id === id);
    if (idx < 0) return null;
    if (undoLabel) this.pushUndo(undoLabel);
    const before = this.state.tasks[idx];
    const after = makeTask({ ...before, ...patch, id, createdAt: before.createdAt, updatedAt: new Date().toISOString() });
    this.state.tasks[idx] = after;
    this.save();
    if (!silent) this.emit('task');
    if (hooks) this.fireChange(before, after);
    return after;
  }

  // Replace calendar link without triggering sync hooks.
  setCalLink(id, cal) {
    const t = this.getTask(id);
    if (!t) return;
    t.cal = cal ? { ...cal } : null;
    t.updatedAt = new Date().toISOString();
    this.save();
    this.emit('task');
  }

  deleteTask(id, { undoLabel = 'Task deleted' } = {}) {
    const t = this.getTask(id);
    if (!t) return null;
    if (undoLabel) this.pushUndo(undoLabel);
    this.state.tasks = this.state.tasks.filter((x) => x.id !== id);
    this.save();
    this.emit('task');
    for (const fn of this.deleteHooks) {
      try {
        fn(t);
      } catch (err) {
        console.error(err);
      }
    }
    return t;
  }

  // Completes/uncompletes. Recurring tasks log a completed copy and roll forward.
  toggleDone(id) {
    const t = this.getTask(id);
    if (!t) return null;
    const now = new Date().toISOString();
    if (!t.done && t.recur) {
      this.pushUndo('Completed');
      const today = todayKey();
      const nextDate = nextFutureOccurrence(t.recur, t.date || today, today);
      // The completed copy is a plain record; the original keeps its calendar link (a recurring event continues on its own).
      const doneCopy = makeTask({ ...t, id: uid(), done: true, doneAt: now, recur: null, cal: null, fromRecurring: t.id, subtasks: t.subtasks.map((s) => ({ ...s, id: uid() })) });
      this.state.tasks.push(doneCopy);
      const before = { ...t };
      const after = makeTask({ ...t, date: nextDate, subtasks: t.subtasks.map((s) => ({ ...s, done: false })), updatedAt: now });
      this.state.tasks[this.state.tasks.findIndex((x) => x.id === id)] = after;
      this.save();
      this.emit('task');
      this.fireChange(before, after, { reason: 'rollforward' });
      return { task: after, completed: doneCopy, rolledTo: nextDate };
    }
    this.pushUndo(t.done ? 'Marked not done' : 'Completed');
    const before = { ...t };
    const after = makeTask({ ...t, done: !t.done, doneAt: t.done ? null : now, updatedAt: now });
    this.state.tasks[this.state.tasks.findIndex((x) => x.id === id)] = after;
    this.save();
    this.emit('task');
    this.fireChange(before, after);
    return { task: after };
  }

  bulkUpdate(ids, patchFn, undoLabel) {
    if (undoLabel) this.pushUndo(undoLabel);
    let n = 0;
    for (const id of ids) {
      const idx = this.state.tasks.findIndex((t) => t.id === id);
      if (idx < 0) continue;
      const before = this.state.tasks[idx];
      const after = makeTask({ ...before, ...patchFn(before), id, updatedAt: new Date().toISOString() });
      this.state.tasks[idx] = after;
      this.fireChange(before, after);
      n++;
    }
    this.save();
    this.emit('task');
    return n;
  }

  // ---------- lists ----------
  addList(name, color) {
    this.pushUndo('List added');
    const list = { id: uid(), name: name.trim() || 'New list', color: color || LIST_COLORS[this.state.lists.length % LIST_COLORS.length] };
    this.state.lists.push(list);
    this.save();
    this.emit('list');
    return list;
  }

  updateList(id, patch) {
    const l = this.state.lists.find((x) => x.id === id);
    if (!l) return;
    Object.assign(l, patch);
    this.save();
    this.emit('list');
  }

  deleteList(id) {
    if (id === 'inbox') return;
    this.pushUndo('List deleted');
    this.state.lists = this.state.lists.filter((l) => l.id !== id);
    for (const t of this.state.tasks) if (t.listId === id) t.listId = 'inbox';
    this.save();
    this.emit('list');
  }

  // ---------- settings ----------
  setSetting(key, value, { silent = false } = {}) {
    this.state.settings[key] = value;
    this.save();
    if (!silent) this.emit('settings');
  }

  setProviderSetting(provider, key, value, { silent = false } = {}) {
    this.state.settings[provider] = { ...this.state.settings[provider], [key]: value };
    this.save();
    if (!silent) this.emit('settings');
  }

  setMeta(key, value) {
    this.state.meta[key] = value;
    this.save();
  }

  // ---------- backup ----------
  exportData() {
    const s = { ...this.state.settings };
    return JSON.stringify({ app: 'Dayline', exportedAt: new Date().toISOString(), ...this.state, settings: s }, null, 2);
  }

  importData(json, mode = 'merge') {
    const incoming = sanitize(typeof json === 'string' ? JSON.parse(json) : json);
    this.pushUndo('Imported backup');
    if (mode === 'replace') {
      this.state = { ...incoming, settings: { ...this.state.settings, ...incoming.settings } };
    } else {
      const byId = new Map(this.state.tasks.map((t) => [t.id, t]));
      for (const t of incoming.tasks) {
        const cur = byId.get(t.id);
        if (!cur || (t.updatedAt || '') > (cur.updatedAt || '')) byId.set(t.id, t);
      }
      const lists = new Map(this.state.lists.map((l) => [l.id, l]));
      for (const l of incoming.lists) if (!lists.has(l.id)) lists.set(l.id, l);
      this.state.tasks = [...byId.values()];
      this.state.lists = [...lists.values()];
    }
    this.save(true);
    this.emit('import');
    return { tasks: incoming.tasks.length, lists: incoming.lists.length };
  }

  resetAll() {
    const keepSettings = this.state.settings;
    this.pushUndo('Erased tasks');
    this.state = defaults();
    this.state.settings = keepSettings;
    this.save(true);
    this.emit('import');
  }
}

export const store = new Store();

// ---------- selectors ----------
export const isOpen = (t) => !t.done;

export function sortForDay(a, b) {
  if (a.time && b.time) return a.time < b.time ? -1 : a.time > b.time ? 1 : b.priority - a.priority;
  if (a.time) return -1;
  if (b.time) return 1;
  if (b.priority !== a.priority) return b.priority - a.priority;
  return a.order - b.order;
}

export function sortByDate(a, b) {
  const ad = a.date || '9999-99-99';
  const bd = b.date || '9999-99-99';
  if (ad !== bd) return ad < bd ? -1 : 1;
  return sortForDay(a, b);
}

export function tasksDueOn(tasks, key) {
  return tasks.filter((t) => !t.done && t.date === key).sort(sortForDay);
}

export function overdueTasks(tasks, today) {
  return tasks.filter((t) => !t.done && t.date && t.date < today).sort(sortByDate);
}

export function doneOn(tasks, key) {
  return tasks.filter((t) => t.done && t.doneAt && localDateOfIso(t.doneAt) === key).sort((a, b) => (a.doneAt < b.doneAt ? 1 : -1));
}

export function openInList(tasks, listId) {
  return tasks.filter((t) => !t.done && t.listId === listId).sort(sortByDate);
}

export function searchTasks(tasks, q) {
  const query = q.trim().toLowerCase();
  if (!query) return [];
  if (query.startsWith('#')) {
    const tag = query.slice(1);
    return tasks.filter((t) => t.tags.some((x) => x.startsWith(tag)));
  }
  const words = query.split(/\s+/);
  return tasks.filter((t) => {
    const hay = `${t.title} ${t.notes} ${t.tags.join(' ')} ${t.subtasks.map((s) => s.title).join(' ')}`.toLowerCase();
    return words.every((w) => hay.includes(w));
  });
}
