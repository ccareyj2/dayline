// Dayline — all of the app's code in one file.
var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// ../dayline/js/dates.js
var pad2 = (n) => String(n).padStart(2, "0");
function toKey(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function fromKey(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function isKey(v) {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
}
function todayKey(now = /* @__PURE__ */ new Date()) {
  return toKey(now);
}
function addDays(key, n) {
  const d = fromKey(key);
  d.setDate(d.getDate() + n);
  return toKey(d);
}
function daysInMonth(y, m0) {
  return new Date(y, m0 + 1, 0).getDate();
}
function addMonths(key, n, anchorDay) {
  const [y, m, d] = key.split("-").map(Number);
  const target = new Date(y, m - 1 + n, 1);
  const day = Math.min(anchorDay || d, daysInMonth(target.getFullYear(), target.getMonth()));
  return toKey(new Date(target.getFullYear(), target.getMonth(), day));
}
function diffDays(a, b) {
  const [y1, m1, d1] = a.split("-").map(Number);
  const [y2, m2, d2] = b.split("-").map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 864e5);
}
function weekday(key) {
  return fromKey(key).getDay();
}
function startOfWeek(key, weekStart = 0) {
  const wd = weekday(key);
  return addDays(key, -((wd - weekStart + 7) % 7));
}
function parseHHMM(t) {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
function toHHMM(min) {
  min = Math.max(0, Math.min(24 * 60 - 1, Math.round(min)));
  return `${pad2(Math.floor(min / 60))}:${pad2(min % 60)}`;
}
var hour12Cache = null;
function uses12h() {
  if (hour12Cache === null) {
    try {
      const opts2 = new Intl.DateTimeFormat(void 0, { hour: "numeric" }).resolvedOptions();
      hour12Cache = opts2.hour12 !== void 0 ? opts2.hour12 : /am|pm/i.test(new Date(2020, 0, 1, 15).toLocaleTimeString());
    } catch {
      hour12Cache = true;
    }
  }
  return hour12Cache;
}
function fmtTime(hhmmOrMin, { compact = false } = {}) {
  const min = typeof hhmmOrMin === "number" ? hhmmOrMin : parseHHMM(hhmmOrMin);
  if (min === null || min === void 0) return "";
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  if (!uses12h()) return `${pad2(h)}:${pad2(m)}`;
  const suffix = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  if (compact) return m === 0 ? `${h12}${suffix.toLowerCase()[0]}` : `${h12}:${pad2(m)}${suffix.toLowerCase()[0]}`;
  return m === 0 ? `${h12} ${suffix}` : `${h12}:${pad2(m)} ${suffix}`;
}
function fmtHourLabel(h) {
  if (!uses12h()) return `${pad2(h)}:00`;
  const suffix = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12} ${suffix}`;
}
function fmtDuration(min) {
  if (!min) return "";
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}
var WD_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
var WD_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
var MON_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
var MON_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
var WEEKDAY_SHORT = WD_SHORT;
var MONTH_SHORT = MON_SHORT;
var MONTH_LONG = MON_LONG;
function fmtShort(key, { withYear } = {}) {
  const d = fromKey(key);
  const showYear = withYear ?? d.getFullYear() !== (/* @__PURE__ */ new Date()).getFullYear();
  return `${WD_SHORT[d.getDay()]}, ${MON_SHORT[d.getMonth()]} ${d.getDate()}${showYear ? `, ${d.getFullYear()}` : ""}`;
}
function fmtLong(key) {
  const d = fromKey(key);
  const showYear = d.getFullYear() !== (/* @__PURE__ */ new Date()).getFullYear();
  return `${WD_LONG[d.getDay()]}, ${MON_LONG[d.getMonth()]} ${d.getDate()}${showYear ? `, ${d.getFullYear()}` : ""}`;
}
function fmtDay(key, today = todayKey()) {
  const diff = diffDays(today, key);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff > 1 && diff < 7) return WD_LONG[weekday(key)];
  return fmtShort(key);
}
function ordinal(n) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
function combine(key, hhmm) {
  const d = fromKey(key);
  const min = parseHHMM(hhmm) || 0;
  d.setHours(Math.floor(min / 60), min % 60, 0, 0);
  return d;
}
function minutesOfDay(date) {
  return date.getHours() * 60 + date.getMinutes();
}
function isoWithOffset(date) {
  const off = -date.getTimezoneOffset();
  const sign = off >= 0 ? "+" : "-";
  const abs = Math.abs(off);
  return `${toKey(date)}T${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}${sign}${pad2(Math.floor(abs / 60))}:${pad2(abs % 60)}`;
}
function isoLocal(date) {
  return `${toKey(date)}T${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
}
function utcBasic(date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}
function utcExtended(date) {
  return date.toISOString().replace(/\.\d{3}/, "");
}
function localTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}
function relativeFromNow(date, now = /* @__PURE__ */ new Date()) {
  const diffMin = Math.round((date - now) / 6e4);
  const abs = Math.abs(diffMin);
  if (abs < 1) return "now";
  let txt;
  if (abs < 60) txt = `${abs} min`;
  else if (abs < 60 * 24) {
    const h = Math.floor(abs / 60);
    const m = abs % 60;
    txt = m && h < 3 ? `${h}h ${m}m` : `${h}h`;
  } else txt = `${Math.round(abs / 1440)}d`;
  return diffMin > 0 ? `in ${txt}` : `${txt} ago`;
}
function roundUpMinutes(min, step = 15) {
  return Math.ceil(min / step) * step;
}

// ../dayline/js/recur.js
function normalizeRule(rule) {
  if (!rule || !rule.freq) return null;
  const r = { freq: rule.freq, interval: Math.max(1, Math.min(99, parseInt(rule.interval, 10) || 1)) };
  if (r.freq === "weekly" && Array.isArray(rule.byDays) && rule.byDays.length) {
    r.byDays = [...new Set(rule.byDays.map(Number).filter((d) => d >= 0 && d <= 6))].sort((a, b) => a - b);
  }
  if ((r.freq === "monthly" || r.freq === "yearly") && rule.anchorDay) r.anchorDay = Number(rule.anchorDay);
  if (rule.anchor) r.anchor = rule.anchor;
  return r;
}
function nextOccurrence(rule, fromKeyStr) {
  const r = normalizeRule(rule);
  if (!r) return null;
  switch (r.freq) {
    case "daily":
      return addDays(fromKeyStr, r.interval);
    case "weekdays": {
      let k = addDays(fromKeyStr, 1);
      while (weekday(k) === 0 || weekday(k) === 6) k = addDays(k, 1);
      return k;
    }
    case "weekly": {
      if (!r.byDays || !r.byDays.length) return addDays(fromKeyStr, 7 * r.interval);
      const anchorWeek = startOfWeek(r.anchor || fromKeyStr, 0);
      let k = addDays(fromKeyStr, 1);
      for (let i = 0; i < 7 * r.interval * 2 + 7; i++) {
        const weeksApart = Math.floor(diffDays(anchorWeek, startOfWeek(k, 0)) / 7);
        if (r.byDays.includes(weekday(k)) && (weeksApart % r.interval + r.interval) % r.interval === 0) return k;
        k = addDays(k, 1);
      }
      return addDays(fromKeyStr, 7 * r.interval);
    }
    case "monthly":
      return addMonths(fromKeyStr, r.interval, r.anchorDay || fromKey(fromKeyStr).getDate());
    case "yearly":
      return addMonths(fromKeyStr, 12 * r.interval, r.anchorDay || fromKey(fromKeyStr).getDate());
    default:
      return null;
  }
}
function nextFutureOccurrence(rule, dueKey, todayKeyStr) {
  let k = nextOccurrence(rule, dueKey);
  let guard = 0;
  while (k && k < todayKeyStr && guard++ < 2e3) k = nextOccurrence(rule, k);
  return k;
}
function firstOccurrenceOnOrAfter(rule, fromKeyStr) {
  const r = normalizeRule(rule);
  if (!r) return fromKeyStr;
  if (r.freq === "weekdays") {
    let k = fromKeyStr;
    while (weekday(k) === 0 || weekday(k) === 6) k = addDays(k, 1);
    return k;
  }
  if (r.freq === "weekly" && r.byDays && r.byDays.length) {
    let k = fromKeyStr;
    for (let i = 0; i < 7; i++) {
      if (r.byDays.includes(weekday(k))) return k;
      k = addDays(k, 1);
    }
  }
  return fromKeyStr;
}
function describeRule(rule) {
  const r = normalizeRule(rule);
  if (!r) return "";
  const n = r.interval;
  switch (r.freq) {
    case "daily":
      return n === 1 ? "Every day" : `Every ${n} days`;
    case "weekdays":
      return "Every weekday";
    case "weekly": {
      const days = r.byDays && r.byDays.length ? ` on ${r.byDays.map((d) => WEEKDAY_SHORT[d]).join(", ")}` : "";
      if (r.byDays && r.byDays.length === 5 && [1, 2, 3, 4, 5].every((d) => r.byDays.includes(d)) && n === 1) return "Every weekday";
      return (n === 1 ? "Every week" : n === 2 ? "Every 2 weeks" : `Every ${n} weeks`) + days;
    }
    case "monthly":
      return (n === 1 ? "Every month" : `Every ${n} months`) + (r.anchorDay ? ` on the ${ordinal(r.anchorDay)}` : "");
    case "yearly":
      return n === 1 ? "Every year" : `Every ${n} years`;
    default:
      return "";
  }
}
function shortRule(rule) {
  const r = normalizeRule(rule);
  if (!r) return "";
  if (r.freq === "daily") return r.interval === 1 ? "Daily" : `Every ${r.interval}d`;
  if (r.freq === "weekdays") return "Weekdays";
  if (r.freq === "weekly") {
    if (r.byDays && r.byDays.length) return r.byDays.map((d) => WEEKDAY_SHORT[d].slice(0, 2)).join(" ") + (r.interval > 1 ? ` /${r.interval}w` : "");
    return r.interval === 1 ? "Weekly" : `Every ${r.interval}w`;
  }
  if (r.freq === "monthly") return r.interval === 1 ? "Monthly" : `Every ${r.interval}mo`;
  if (r.freq === "yearly") return "Yearly";
  return "";
}
var RRULE_DAYS = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
function toRRule(rule) {
  const r = normalizeRule(rule);
  if (!r) return null;
  switch (r.freq) {
    case "daily":
      return `FREQ=DAILY${r.interval > 1 ? `;INTERVAL=${r.interval}` : ""}`;
    case "weekdays":
      return "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR";
    case "weekly":
      return `FREQ=WEEKLY${r.interval > 1 ? `;INTERVAL=${r.interval}` : ""}${r.byDays && r.byDays.length ? `;BYDAY=${r.byDays.map((d) => RRULE_DAYS[d]).join(",")}` : ""}`;
    case "monthly":
      return `FREQ=MONTHLY${r.interval > 1 ? `;INTERVAL=${r.interval}` : ""}`;
    case "yearly":
      return `FREQ=YEARLY${r.interval > 1 ? `;INTERVAL=${r.interval}` : ""}`;
    default:
      return null;
  }
}

// ../dayline/js/store.js
var KEY = "dayline:data";
var LIST_COLORS = ["#E8553A", "#3B82F6", "#10B981", "#8B5CF6", "#F59E0B", "#EC4899", "#14B8A6", "#64748B"];
function uid() {
  try {
    if (crypto && crypto.randomUUID) return crypto.randomUUID();
  } catch {
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 12);
}
function defaultSettings() {
  return {
    theme: "auto",
    // auto | light | dark
    weekStart: 0,
    // 0 = Sunday, 1 = Monday
    workStart: "09:00",
    workEnd: "17:00",
    defaultDuration: 30,
    defaultReminder: null,
    // minutes before; null = none
    autoCalendar: "",
    // '' | 'google' | 'outlook' — put timed tasks on this calendar automatically
    outlookLinkType: "work",
    // work (outlook.office.com) | personal (outlook.live.com)
    autoRefreshAuth: true,
    notifications: false,
    badge: true,
    lastView: "today",
    installDismissed: false,
    google: { clientId: "", calendars: {}, defaultCalendar: "primary" },
    outlook: { clientId: "", tenant: "", calendars: {}, defaultCalendar: "" }
  };
}
function defaults() {
  return {
    version: 1,
    tasks: [],
    lists: [
      { id: "inbox", name: "Inbox", color: "#64748B", system: true },
      { id: uid(), name: "Work", color: "#3B82F6" },
      { id: uid(), name: "Personal", color: "#10B981" }
    ],
    settings: defaultSettings(),
    meta: { createdAt: (/* @__PURE__ */ new Date()).toISOString(), lastBackupAt: null }
  };
}
function makeTask(p = {}) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const date = isKey(p.date) ? p.date : null;
  const time = date && /^\d{2}:\d{2}$/.test(p.time || "") ? p.time : null;
  return {
    id: p.id || uid(),
    title: String(p.title || "").trim() || "Untitled",
    notes: p.notes ? String(p.notes) : "",
    listId: p.listId || "inbox",
    priority: Math.max(0, Math.min(3, parseInt(p.priority, 10) || 0)),
    date,
    time,
    duration: p.duration ? Math.max(5, Math.min(24 * 60, parseInt(p.duration, 10))) : null,
    recur: normalizeRule(p.recur),
    reminder: Number.isFinite(parseInt(p.reminder, 10)) ? parseInt(p.reminder, 10) : null,
    tags: Array.isArray(p.tags) ? p.tags.map((t) => String(t).toLowerCase()).filter(Boolean) : [],
    subtasks: Array.isArray(p.subtasks) ? p.subtasks.map((s) => ({ id: s.id || uid(), title: String(s.title || ""), done: !!s.done })) : [],
    done: !!p.done,
    doneAt: p.done ? p.doneAt || now : null,
    createdAt: p.createdAt || now,
    updatedAt: p.updatedAt || now,
    order: typeof p.order === "number" ? p.order : Date.now(),
    cal: p.cal && p.cal.provider && p.cal.eventId ? { ...p.cal } : null,
    fromRecurring: p.fromRecurring || null
  };
}
function sanitize(data) {
  const base = defaults();
  if (!data || typeof data !== "object") return base;
  const lists = Array.isArray(data.lists) && data.lists.length ? data.lists.filter((l) => l && l.id && l.name) : base.lists;
  if (!lists.some((l) => l.id === "inbox")) lists.unshift({ id: "inbox", name: "Inbox", color: "#64748B", system: true });
  const listIds = new Set(lists.map((l) => l.id));
  const tasks = Array.isArray(data.tasks) ? data.tasks.filter((t) => t && t.id).map((t) => {
    const task = makeTask(t);
    if (!listIds.has(task.listId)) task.listId = "inbox";
    return task;
  }) : [];
  const settings = { ...defaultSettings(), ...data.settings || {} };
  settings.google = { ...defaultSettings().google, ...(data.settings || {}).google || {} };
  settings.outlook = { ...defaultSettings().outlook, ...(data.settings || {}).outlook || {} };
  return { version: 1, tasks, lists, settings, meta: { ...base.meta, ...data.meta || {} } };
}
function localDateOfIso(iso) {
  if (!iso) return null;
  return toKey(new Date(iso));
}
var Store = class {
  constructor() {
    this.listeners = /* @__PURE__ */ new Set();
    this.undoStack = [];
    this.changeHooks = /* @__PURE__ */ new Set();
    this.deleteHooks = /* @__PURE__ */ new Set();
    this.saveTimer = null;
    this.state = this.load();
    window.addEventListener("storage", (e) => {
      if (e.key === KEY && e.newValue) {
        try {
          this.state = sanitize(JSON.parse(e.newValue));
          this.emit("external");
        } catch {
        }
      }
    });
  }
  load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return sanitize(JSON.parse(raw));
    } catch (err) {
      console.warn("Could not read saved data", err);
    }
    return defaults();
  }
  save(immediate = false) {
    clearTimeout(this.saveTimer);
    const write = () => {
      try {
        localStorage.setItem(KEY, JSON.stringify(this.state));
      } catch (err) {
        console.error("Save failed", err);
        this.emit("save-error");
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
      }
    }
  }
  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  emit(reason = "change") {
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
  pushUndo(label3) {
    this.undoStack.push({ label: label3, snap: JSON.stringify({ tasks: this.state.tasks, lists: this.state.lists }) });
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
    this.emit("undo");
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
  getTask(id3) {
    return this.state.tasks.find((t) => t.id === id3) || null;
  }
  getList(id3) {
    return this.state.lists.find((l) => l.id === id3) || this.state.lists[0];
  }
  // ---------- tasks ----------
  addTask(partial, { undoLabel = "Task added", silent = false } = {}) {
    if (undoLabel) this.pushUndo(undoLabel);
    const task = makeTask(partial);
    this.state.tasks.push(task);
    this.save();
    if (!silent) this.emit("task");
    this.fireChange(null, task);
    return task;
  }
  updateTask(id3, patch, { undoLabel = null, silent = false, hooks = true } = {}) {
    const idx = this.state.tasks.findIndex((t) => t.id === id3);
    if (idx < 0) return null;
    if (undoLabel) this.pushUndo(undoLabel);
    const before = this.state.tasks[idx];
    const after = makeTask({ ...before, ...patch, id: id3, createdAt: before.createdAt, updatedAt: (/* @__PURE__ */ new Date()).toISOString() });
    this.state.tasks[idx] = after;
    this.save();
    if (!silent) this.emit("task");
    if (hooks) this.fireChange(before, after);
    return after;
  }
  // Replace calendar link without triggering sync hooks.
  setCalLink(id3, cal) {
    const t = this.getTask(id3);
    if (!t) return;
    t.cal = cal ? { ...cal } : null;
    t.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    this.save();
    this.emit("task");
  }
  deleteTask(id3, { undoLabel = "Task deleted" } = {}) {
    const t = this.getTask(id3);
    if (!t) return null;
    if (undoLabel) this.pushUndo(undoLabel);
    this.state.tasks = this.state.tasks.filter((x) => x.id !== id3);
    this.save();
    this.emit("task");
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
  toggleDone(id3) {
    const t = this.getTask(id3);
    if (!t) return null;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    if (!t.done && t.recur) {
      this.pushUndo("Completed");
      const today = todayKey();
      const nextDate = nextFutureOccurrence(t.recur, t.date || today, today);
      const doneCopy = makeTask({ ...t, id: uid(), done: true, doneAt: now, recur: null, cal: null, fromRecurring: t.id, subtasks: t.subtasks.map((s) => ({ ...s, id: uid() })) });
      this.state.tasks.push(doneCopy);
      const before2 = { ...t };
      const after2 = makeTask({ ...t, date: nextDate, subtasks: t.subtasks.map((s) => ({ ...s, done: false })), updatedAt: now });
      this.state.tasks[this.state.tasks.findIndex((x) => x.id === id3)] = after2;
      this.save();
      this.emit("task");
      this.fireChange(before2, after2, { reason: "rollforward" });
      return { task: after2, completed: doneCopy, rolledTo: nextDate };
    }
    this.pushUndo(t.done ? "Marked not done" : "Completed");
    const before = { ...t };
    const after = makeTask({ ...t, done: !t.done, doneAt: t.done ? null : now, updatedAt: now });
    this.state.tasks[this.state.tasks.findIndex((x) => x.id === id3)] = after;
    this.save();
    this.emit("task");
    this.fireChange(before, after);
    return { task: after };
  }
  bulkUpdate(ids, patchFn, undoLabel) {
    if (undoLabel) this.pushUndo(undoLabel);
    let n = 0;
    for (const id3 of ids) {
      const idx = this.state.tasks.findIndex((t) => t.id === id3);
      if (idx < 0) continue;
      const before = this.state.tasks[idx];
      const after = makeTask({ ...before, ...patchFn(before), id: id3, updatedAt: (/* @__PURE__ */ new Date()).toISOString() });
      this.state.tasks[idx] = after;
      this.fireChange(before, after);
      n++;
    }
    this.save();
    this.emit("task");
    return n;
  }
  // ---------- lists ----------
  addList(name, color) {
    this.pushUndo("List added");
    const list = { id: uid(), name: name.trim() || "New list", color: color || LIST_COLORS[this.state.lists.length % LIST_COLORS.length] };
    this.state.lists.push(list);
    this.save();
    this.emit("list");
    return list;
  }
  updateList(id3, patch) {
    const l = this.state.lists.find((x) => x.id === id3);
    if (!l) return;
    Object.assign(l, patch);
    this.save();
    this.emit("list");
  }
  deleteList(id3) {
    if (id3 === "inbox") return;
    this.pushUndo("List deleted");
    this.state.lists = this.state.lists.filter((l) => l.id !== id3);
    for (const t of this.state.tasks) if (t.listId === id3) t.listId = "inbox";
    this.save();
    this.emit("list");
  }
  // ---------- settings ----------
  setSetting(key, value, { silent = false } = {}) {
    this.state.settings[key] = value;
    this.save();
    if (!silent) this.emit("settings");
  }
  setProviderSetting(provider, key, value, { silent = false } = {}) {
    this.state.settings[provider] = { ...this.state.settings[provider], [key]: value };
    this.save();
    if (!silent) this.emit("settings");
  }
  setMeta(key, value) {
    this.state.meta[key] = value;
    this.save();
  }
  // ---------- backup ----------
  exportData() {
    const s = { ...this.state.settings };
    return JSON.stringify({ app: "Dayline", exportedAt: (/* @__PURE__ */ new Date()).toISOString(), ...this.state, settings: s }, null, 2);
  }
  importData(json, mode = "merge") {
    const incoming = sanitize(typeof json === "string" ? JSON.parse(json) : json);
    this.pushUndo("Imported backup");
    if (mode === "replace") {
      this.state = { ...incoming, settings: { ...this.state.settings, ...incoming.settings } };
    } else {
      const byId = new Map(this.state.tasks.map((t) => [t.id, t]));
      for (const t of incoming.tasks) {
        const cur = byId.get(t.id);
        if (!cur || (t.updatedAt || "") > (cur.updatedAt || "")) byId.set(t.id, t);
      }
      const lists = new Map(this.state.lists.map((l) => [l.id, l]));
      for (const l of incoming.lists) if (!lists.has(l.id)) lists.set(l.id, l);
      this.state.tasks = [...byId.values()];
      this.state.lists = [...lists.values()];
    }
    this.save(true);
    this.emit("import");
    return { tasks: incoming.tasks.length, lists: incoming.lists.length };
  }
  resetAll() {
    const keepSettings = this.state.settings;
    this.pushUndo("Erased tasks");
    this.state = defaults();
    this.state.settings = keepSettings;
    this.save(true);
    this.emit("import");
  }
};
var store = new Store();
function sortForDay(a, b) {
  if (a.time && b.time) return a.time < b.time ? -1 : a.time > b.time ? 1 : b.priority - a.priority;
  if (a.time) return -1;
  if (b.time) return 1;
  if (b.priority !== a.priority) return b.priority - a.priority;
  return a.order - b.order;
}
function sortByDate(a, b) {
  const ad = a.date || "9999-99-99";
  const bd = b.date || "9999-99-99";
  if (ad !== bd) return ad < bd ? -1 : 1;
  return sortForDay(a, b);
}
function tasksDueOn(tasks, key) {
  return tasks.filter((t) => !t.done && t.date === key).sort(sortForDay);
}
function overdueTasks(tasks, today) {
  return tasks.filter((t) => !t.done && t.date && t.date < today).sort(sortByDate);
}
function doneOn(tasks, key) {
  return tasks.filter((t) => t.done && t.doneAt && localDateOfIso(t.doneAt) === key).sort((a, b) => a.doneAt < b.doneAt ? 1 : -1);
}
function searchTasks(tasks, q) {
  const query = q.trim().toLowerCase();
  if (!query) return [];
  if (query.startsWith("#")) {
    const tag = query.slice(1);
    return tasks.filter((t) => t.tags.some((x) => x.startsWith(tag)));
  }
  const words = query.split(/\s+/);
  return tasks.filter((t) => {
    const hay = `${t.title} ${t.notes} ${t.tags.join(" ")} ${t.subtasks.map((s) => s.title).join(" ")}`.toLowerCase();
    return words.every((w) => hay.includes(w));
  });
}

// ../dayline/js/calendar/index.js
var calendar_exports = {};
__export(calendar_exports, {
  PROVIDERS: () => PROVIDERS,
  PROVIDER_IDS: () => PROVIDER_IDS,
  PROVIDER_LABEL: () => PROVIDER_LABEL,
  _debug: () => _debug,
  _setCache: () => _setCache,
  addToCalendar: () => addToCalendar,
  anyConnected: () => anyConnected,
  calendarsFor: () => calendarsFor,
  config: () => config,
  connect: () => connect,
  defaultCalendarId: () => defaultCalendarId,
  disconnect: () => disconnect,
  eventsForDay: () => eventsForDay,
  getRedirectUri: () => getRedirectUri,
  getStatus: () => getStatus,
  handleRedirect: () => handleRedirect,
  hasEventsCache: () => hasEventsCache,
  hasUsableToken: () => hasUsableToken,
  icsFor: () => icsFor,
  isCalendarShown: () => isCalendarShown,
  isConfigured: () => isConfigured,
  isConnected: () => isConnected3,
  lastSyncAt: () => lastSyncAt,
  linkUrl: () => linkUrl,
  maybeAutoAuth: () => maybeAutoAuth,
  onChange: () => onChange,
  pendingCount: () => pendingCount,
  removeFromCalendar: () => removeFromCalendar,
  sync: () => sync
});

// ../dayline/js/calendar/google.js
var google_exports = {};
__export(google_exports, {
  SCOPES: () => SCOPES,
  account: () => account,
  clearAuth: () => clearAuth,
  completeAuth: () => completeAuth,
  createEvent: () => createEvent,
  deleteEvent: () => deleteEvent,
  ensureToken: () => ensureToken,
  eventPayload: () => eventPayload,
  getAuth: () => getAuth,
  getEvent: () => getEvent,
  hasValidToken: () => hasValidToken,
  id: () => id,
  isConnected: () => isConnected,
  label: () => label,
  listCalendars: () => listCalendars,
  listEvents: () => listEvents,
  markExpired: () => markExpired,
  patchEvent: () => patchEvent,
  revoke: () => revoke,
  startAuth: () => startAuth
});

// ../dayline/js/calendar/oauth.js
var PENDING_KEY = "dayline:oauth:pending";
var AuthError = class extends Error {
  constructor(message = "auth") {
    super(message);
    this.name = "AuthError";
  }
};
var ApiError = class extends Error {
  constructor(status2, message) {
    super(message || `Request failed (${status2})`);
    this.name = "ApiError";
    this.status = status2;
  }
};
function redirectUri() {
  const u = new URL("./", location.href);
  u.hash = "";
  u.search = "";
  return u.href;
}
function base64url(bytes) {
  let s = "";
  const arr = new Uint8Array(bytes);
  for (let i = 0; i < arr.length; i++) s += String.fromCharCode(arr[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function randomString(bytes = 32) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return base64url(arr);
}
async function sha256b64url(str) {
  const data = new TextEncoder().encode(str);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return base64url(hash);
}
function decodeJwt(token) {
  try {
    const part = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(part + "===".slice((part.length + 3) % 4)).split("").map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)).join("")
    );
    return JSON.parse(json);
  } catch {
    return {};
  }
}
function savePending(obj) {
  localStorage.setItem(PENDING_KEY, JSON.stringify(obj));
}
function peekPending() {
  try {
    return JSON.parse(localStorage.getItem(PENDING_KEY) || "null");
  } catch {
    return null;
  }
}
function clearPending() {
  localStorage.removeItem(PENDING_KEY);
}
function readReturnParams() {
  const out = {};
  const take = (str) => {
    if (!str) return;
    const p = new URLSearchParams(str.replace(/^[#?]/, ""));
    for (const [k, v] of p) out[k] = v;
  };
  take(location.search);
  take(location.hash);
  const isOAuth = "state" in out && ("access_token" in out || "code" in out || "error" in out);
  return isOAuth ? out : null;
}
function cleanUrl() {
  try {
    history.replaceState(null, "", redirectUri());
  } catch {
  }
}

// ../dayline/js/calendar/links.js
function taskWindow(task, defaultDuration = 30) {
  if (!task.date) return null;
  if (!task.time) return { allDay: true, startKey: task.date, endKey: addDays(task.date, 1) };
  const start2 = combine(task.date, task.time);
  const end = new Date(start2.getTime() + (task.duration || defaultDuration) * 6e4);
  return { allDay: false, start: start2, end };
}
function eventDetails(task) {
  const parts = [];
  if (task.notes) parts.push(task.notes.trim());
  if (task.subtasks && task.subtasks.length) parts.push(task.subtasks.map((s) => `${s.done ? "☑" : "☐"} ${s.title}`).join("\n"));
  parts.push("— from Dayline");
  return parts.join("\n\n");
}
function googleTemplateUrl(task, { defaultDuration = 30 } = {}) {
  const w = taskWindow(task, defaultDuration);
  const p = new URLSearchParams({ action: "TEMPLATE", text: task.title });
  if (w) {
    p.set("dates", w.allDay ? `${w.startKey.replace(/-/g, "")}/${w.endKey.replace(/-/g, "")}` : `${utcBasic(w.start)}/${utcBasic(w.end)}`);
  }
  p.set("details", eventDetails(task));
  const rrule = task.recur ? toRRule(task.recur) : null;
  if (rrule) p.set("recur", `RRULE:${rrule}`);
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}
function outlookComposeUrl(task, { defaultDuration = 30, linkType = "work" } = {}) {
  const base = linkType === "personal" ? "https://outlook.live.com/calendar/deeplink/compose" : "https://outlook.office.com/calendar/deeplink/compose";
  const w = taskWindow(task, defaultDuration);
  const q = [
    ["path", "/calendar/action/compose"],
    ["rru", "addevent"],
    ["subject", task.title]
  ];
  if (w) {
    if (w.allDay) {
      q.push(["startdt", w.startKey], ["enddt", w.endKey], ["allday", "true"]);
    } else {
      q.push(["startdt", utcExtended(w.start)], ["enddt", utcExtended(w.end)], ["allday", "false"]);
    }
  }
  q.push(["body", eventDetails(task)]);
  return `${base}?${q.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&")}`;
}
function icsEscape(s) {
  return String(s).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}
function fold(line) {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const out = [];
  let cur = "";
  let curLen = 0;
  for (const ch of line) {
    const len = new TextEncoder().encode(ch).length;
    const limit = out.length === 0 ? 75 : 74;
    if (curLen + len > limit) {
      out.push(cur);
      cur = "";
      curLen = 0;
    }
    cur += ch;
    curLen += len;
  }
  out.push(cur);
  return out.map((l, i) => i === 0 ? l : " " + l).join("\r\n");
}
function buildICS(task, { defaultDuration = 30 } = {}) {
  const w = taskWindow(task, defaultDuration);
  if (!w) return null;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Dayline//Dayline 1.0//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${task.id}@dayline`,
    `DTSTAMP:${utcBasic(/* @__PURE__ */ new Date())}`
  ];
  if (w.allDay) {
    lines.push(`DTSTART;VALUE=DATE:${w.startKey.replace(/-/g, "")}`, `DTEND;VALUE=DATE:${w.endKey.replace(/-/g, "")}`);
  } else {
    lines.push(`DTSTART:${utcBasic(w.start)}`, `DTEND:${utcBasic(w.end)}`);
  }
  lines.push(`SUMMARY:${icsEscape(task.title)}`, `DESCRIPTION:${icsEscape(eventDetails(task))}`);
  const rrule = task.recur ? toRRule(task.recur) : null;
  if (rrule) lines.push(`RRULE:${rrule}`);
  if (task.reminder !== null && task.reminder !== void 0) {
    lines.push("BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${icsEscape(task.title)}`, `TRIGGER:-PT${Math.max(0, task.reminder)}M`, "END:VALARM");
  }
  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
function icsFileName(task) {
  const slug = task.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "event";
  return `${slug}.ics`;
}

// ../dayline/js/tz.js
var LEGACY = {
  "America/Indianapolis": "America/Indiana/Indianapolis",
  "America/Fort_Wayne": "America/Indiana/Indianapolis",
  "America/Louisville": "America/Kentucky/Louisville",
  "America/Buenos_Aires": "America/Argentina/Buenos_Aires",
  "Asia/Calcutta": "Asia/Kolkata",
  "Asia/Saigon": "Asia/Ho_Chi_Minh",
  "Asia/Katmandu": "Asia/Kathmandu",
  "Asia/Rangoon": "Asia/Yangon",
  "Europe/Kiev": "Europe/Kyiv",
  "Atlantic/Faeroe": "Atlantic/Faroe",
  "US/Eastern": "America/New_York",
  "US/Central": "America/Chicago",
  "US/Mountain": "America/Denver",
  "US/Pacific": "America/Los_Angeles",
  "US/East-Indiana": "America/Indiana/Indianapolis",
  "Etc/UTC": "UTC",
  "Etc/GMT": "UTC"
};
var WINDOWS = {
  "Pacific/Honolulu": "Hawaiian Standard Time",
  "America/Anchorage": "Alaskan Standard Time",
  "America/Los_Angeles": "Pacific Standard Time",
  "America/Vancouver": "Pacific Standard Time",
  "America/Tijuana": "Pacific Standard Time (Mexico)",
  "America/Phoenix": "US Mountain Standard Time",
  "America/Denver": "Mountain Standard Time",
  "America/Edmonton": "Mountain Standard Time",
  "America/Boise": "Mountain Standard Time",
  "America/Chicago": "Central Standard Time",
  "America/Winnipeg": "Central Standard Time",
  "America/Indiana/Knox": "Central Standard Time",
  "America/Menominee": "Central Standard Time",
  "America/Regina": "Canada Central Standard Time",
  "America/Mexico_City": "Central Standard Time (Mexico)",
  "America/New_York": "Eastern Standard Time",
  "America/Toronto": "Eastern Standard Time",
  "America/Detroit": "Eastern Standard Time",
  "America/Kentucky/Louisville": "Eastern Standard Time",
  "America/Indiana/Indianapolis": "US Eastern Standard Time",
  "America/Indiana/Marengo": "US Eastern Standard Time",
  "America/Indiana/Vevay": "US Eastern Standard Time",
  "America/Halifax": "Atlantic Standard Time",
  "America/Puerto_Rico": "SA Western Standard Time",
  "America/St_Johns": "Newfoundland Standard Time",
  "America/Bogota": "SA Pacific Standard Time",
  "America/Lima": "SA Pacific Standard Time",
  "America/Sao_Paulo": "E. South America Standard Time",
  "America/Argentina/Buenos_Aires": "Argentina Standard Time",
  "Atlantic/Reykjavik": "Greenwich Standard Time",
  "Europe/London": "GMT Standard Time",
  "Europe/Dublin": "GMT Standard Time",
  "Europe/Lisbon": "GMT Standard Time",
  "Europe/Berlin": "W. Europe Standard Time",
  "Europe/Amsterdam": "W. Europe Standard Time",
  "Europe/Rome": "W. Europe Standard Time",
  "Europe/Stockholm": "W. Europe Standard Time",
  "Europe/Vienna": "W. Europe Standard Time",
  "Europe/Zurich": "W. Europe Standard Time",
  "Europe/Oslo": "W. Europe Standard Time",
  "Europe/Paris": "Romance Standard Time",
  "Europe/Brussels": "Romance Standard Time",
  "Europe/Madrid": "Romance Standard Time",
  "Europe/Copenhagen": "Romance Standard Time",
  "Europe/Warsaw": "Central European Standard Time",
  "Europe/Zagreb": "Central European Standard Time",
  "Europe/Budapest": "Central Europe Standard Time",
  "Europe/Prague": "Central Europe Standard Time",
  "Europe/Belgrade": "Central Europe Standard Time",
  "Europe/Athens": "GTB Standard Time",
  "Europe/Bucharest": "GTB Standard Time",
  "Europe/Helsinki": "FLE Standard Time",
  "Europe/Kyiv": "FLE Standard Time",
  "Europe/Riga": "FLE Standard Time",
  "Europe/Sofia": "FLE Standard Time",
  "Europe/Tallinn": "FLE Standard Time",
  "Europe/Vilnius": "FLE Standard Time",
  "Europe/Istanbul": "Turkey Standard Time",
  "Europe/Moscow": "Russian Standard Time",
  "Africa/Cairo": "Egypt Standard Time",
  "Africa/Johannesburg": "South Africa Standard Time",
  "Africa/Lagos": "W. Central Africa Standard Time",
  "Africa/Nairobi": "E. Africa Standard Time",
  "Asia/Jerusalem": "Israel Standard Time",
  "Asia/Riyadh": "Arab Standard Time",
  "Asia/Dubai": "Arabian Standard Time",
  "Asia/Kolkata": "India Standard Time",
  "Asia/Shanghai": "China Standard Time",
  "Asia/Hong_Kong": "China Standard Time",
  "Asia/Singapore": "Singapore Standard Time",
  "Asia/Tokyo": "Tokyo Standard Time",
  "Asia/Seoul": "Korea Standard Time",
  "Australia/Sydney": "AUS Eastern Standard Time",
  "Australia/Melbourne": "AUS Eastern Standard Time",
  "Australia/Brisbane": "E. Australia Standard Time",
  "Australia/Perth": "W. Australia Standard Time",
  "Pacific/Auckland": "New Zealand Standard Time",
  UTC: "UTC"
};
function ianaZone(tz) {
  return LEGACY[tz] || tz || "UTC";
}
function windowsZone(tz) {
  return WINDOWS[ianaZone(tz)] || null;
}

// ../dayline/js/calendar/google.js
var TOKEN_KEY = "dayline:auth:google";
var API = "https://www.googleapis.com/calendar/v3";
var SCOPES = ["https://www.googleapis.com/auth/calendar.events", "https://www.googleapis.com/auth/calendar.calendarlist.readonly"];
var id = "google";
var label = "Google Calendar";
function getAuth() {
  try {
    return JSON.parse(localStorage.getItem(TOKEN_KEY) || "null");
  } catch {
    return null;
  }
}
function setAuth(a) {
  localStorage.setItem(TOKEN_KEY, JSON.stringify(a));
}
function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
}
function isConnected() {
  const a = getAuth();
  return !!(a && a.connected);
}
function hasValidToken() {
  const a = getAuth();
  return !!(a && a.accessToken && a.expiresAt > Date.now() + 3e4);
}
function account() {
  const a = getAuth();
  return a ? a.email || "" : "";
}
async function ensureToken() {
  return hasValidToken() ? getAuth().accessToken : null;
}
function startAuth({ clientId, prompt, silent = false, context = null }) {
  const state = randomString(16);
  savePending({ provider: "google", state, silent, context, createdAt: Date.now() });
  const p = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri(),
    response_type: "token",
    scope: SCOPES.join(" "),
    include_granted_scopes: "true",
    state
  });
  const hint = account();
  if (hint) p.set("login_hint", hint);
  if (prompt) p.set("prompt", prompt);
  location.assign(`https://accounts.google.com/o/oauth2/v2/auth?${p.toString()}`);
}
async function completeAuth(params) {
  if (params.error) return { ok: false, error: params.error };
  const scope = params.scope || "";
  if (!/calendar\.events/.test(scope)) return { ok: false, error: "scope_denied" };
  const prev = getAuth() || {};
  setAuth({
    ...prev,
    accessToken: params.access_token,
    expiresAt: Date.now() + (parseInt(params.expires_in, 10) || 3600) * 1e3 - 6e4,
    scope,
    connected: true,
    connectedAt: prev.connectedAt || Date.now()
  });
  return { ok: true };
}
function markExpired() {
  const a = getAuth();
  if (a) setAuth({ ...a, accessToken: null, expiresAt: 0 });
}
async function api(path, { method = "GET", body, query, okStatuses = [] } = {}) {
  const token = await ensureToken();
  if (!token) throw new AuthError("expired");
  const url = new URL(API + path);
  if (query) {
    for (const [k, v] of Object.entries(query)) if (v !== void 0 && v !== null) url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString(), {
    method,
    headers: { Authorization: `Bearer ${token}`, ...body ? { "Content-Type": "application/json" } : {} },
    body: body ? JSON.stringify(body) : void 0
  });
  if (res.status === 401) {
    markExpired();
    throw new AuthError("expired");
  }
  if (okStatuses.includes(res.status)) return null;
  if (res.status === 204) return null;
  if (!res.ok) {
    let msg = "";
    try {
      const j = await res.json();
      msg = j && j.error && j.error.message;
    } catch {
    }
    throw new ApiError(res.status, msg);
  }
  return res.json();
}
async function listCalendars() {
  try {
    const data = await api("/users/me/calendarList", { query: { maxResults: 250, minAccessRole: "reader" } });
    const items = (data.items || []).map((c) => ({
      id: c.id,
      name: c.summaryOverride || c.summary || c.id,
      color: c.backgroundColor || "#4F7FE8",
      primary: !!c.primary,
      canEdit: c.accessRole === "owner" || c.accessRole === "writer",
      selected: c.selected !== false
    }));
    const primary = items.find((c) => c.primary);
    if (primary) {
      const a = getAuth();
      if (a) setAuth({ ...a, email: primary.id });
    }
    return items;
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) return [{ id: "primary", name: "Google Calendar", color: "#4F7FE8", primary: true, canEdit: true, selected: true }];
    throw err;
  }
}
function mapEvent(ev, cal) {
  const allDay = !!(ev.start && ev.start.date);
  return {
    key: `google|${cal.id}|${ev.id}`,
    provider: "google",
    calendarId: cal.id,
    calendarName: cal.name,
    id: ev.id,
    seriesId: ev.recurringEventId || null,
    title: ev.summary || "(No title)",
    allDay,
    start: allDay ? ev.start.date : ev.start.dateTime,
    end: allDay ? ev.end && ev.end.date || addDays(ev.start.date, 1) : ev.end && ev.end.dateTime || ev.start.dateTime,
    location: ev.location || "",
    url: ev.htmlLink || "",
    joinUrl: ev.hangoutLink || "",
    color: cal.color,
    busy: ev.transparency !== "transparent",
    taskId: ev.extendedProperties && ev.extendedProperties.private && ev.extendedProperties.private.daylineTaskId || null
  };
}
async function listEvents(cal, timeMin, timeMax) {
  const out = [];
  let pageToken;
  for (let page = 0; page < 6; page++) {
    const data = await api(`/calendars/${encodeURIComponent(cal.id)}/events`, {
      query: {
        timeMin,
        timeMax,
        singleEvents: "true",
        orderBy: "startTime",
        maxResults: 250,
        pageToken,
        fields: "nextPageToken,items(id,status,summary,start,end,location,htmlLink,hangoutLink,transparency,recurringEventId,attendees(self,responseStatus),extendedProperties)"
      }
    });
    for (const ev of data.items || []) {
      if (ev.status === "cancelled") continue;
      const me = (ev.attendees || []).find((a) => a.self);
      if (me && me.responseStatus === "declined") continue;
      out.push(mapEvent(ev, cal));
    }
    pageToken = data.nextPageToken;
    if (!pageToken) break;
  }
  return out;
}
function eventPayload(task, { defaultDuration = 30 } = {}) {
  const w = taskWindow(task, defaultDuration);
  if (!w) return null;
  const tz = ianaZone(localTimeZone());
  const body = {
    summary: task.title,
    description: eventDetails(task),
    reminders: task.reminder !== null && task.reminder !== void 0 ? { useDefault: false, overrides: [{ method: "popup", minutes: Math.max(0, task.reminder) }] } : { useDefault: true },
    extendedProperties: { private: { daylineTaskId: task.id } }
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
async function createEvent(calendarId, task, opts2) {
  const ev = await api(`/calendars/${encodeURIComponent(calendarId)}/events`, { method: "POST", body: eventPayload(task, opts2) });
  return { eventId: ev.id, url: ev.htmlLink || "" };
}
async function patchEvent(calendarId, eventId, task, opts2) {
  const body = eventPayload(task, opts2);
  delete body.recurrence;
  const ev = await api(`/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`, { method: "PATCH", body });
  return { eventId: ev.id, url: ev.htmlLink || "" };
}
async function getEvent(calendarId, eventId) {
  try {
    return await api(`/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`, { query: { fields: "id,status,start,end,summary,recurrence" } });
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 410)) return null;
    throw err;
  }
}
async function deleteEvent(calendarId, eventId) {
  await api(`/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`, { method: "DELETE", okStatuses: [404, 410] });
}
async function revoke() {
  const a = getAuth();
  if (a && a.accessToken) {
    try {
      await fetch("https://oauth2.googleapis.com/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ token: a.accessToken }).toString()
      });
    } catch {
    }
  }
  clearAuth();
}

// ../dayline/js/calendar/outlook.js
var outlook_exports = {};
__export(outlook_exports, {
  account: () => account2,
  canRefresh: () => canRefresh,
  clearAuth: () => clearAuth2,
  completeAuth: () => completeAuth2,
  configure: () => configure,
  createEvent: () => createEvent2,
  deleteEvent: () => deleteEvent2,
  ensureToken: () => ensureToken2,
  eventPayload: () => eventPayload2,
  getAuth: () => getAuth2,
  getEvent: () => getEvent2,
  hasValidToken: () => hasValidToken2,
  id: () => id2,
  isConnected: () => isConnected2,
  label: () => label2,
  listCalendars: () => listCalendars2,
  listEvents: () => listEvents2,
  markExpired: () => markExpired2,
  patchEvent: () => patchEvent2,
  revoke: () => revoke2,
  startAuth: () => startAuth2
});
var TOKEN_KEY2 = "dayline:auth:outlook";
var GRAPH = "https://graph.microsoft.com/v1.0";
var SCOPES2 = "openid profile offline_access User.Read Calendars.ReadWrite";
var id2 = "outlook";
var label2 = "Outlook";
var loginBase = (tenant) => `https://login.microsoftonline.com/${encodeURIComponent((tenant || "").trim() || "organizations")}/oauth2/v2.0`;
function getAuth2() {
  try {
    return JSON.parse(localStorage.getItem(TOKEN_KEY2) || "null");
  } catch {
    return null;
  }
}
function setAuth2(a) {
  localStorage.setItem(TOKEN_KEY2, JSON.stringify(a));
}
function clearAuth2() {
  localStorage.removeItem(TOKEN_KEY2);
}
function isConnected2() {
  const a = getAuth2();
  return !!(a && a.connected);
}
function hasValidToken2() {
  const a = getAuth2();
  return !!(a && a.accessToken && a.expiresAt > Date.now() + 3e4);
}
function canRefresh() {
  const a = getAuth2();
  return !!(a && a.refreshToken && a.refreshExpiresAt > Date.now() + 6e4);
}
function account2() {
  const a = getAuth2();
  return a && a.account ? a.account.username || "" : "";
}
var cfg = { clientId: "", tenant: "" };
function configure(c) {
  cfg = { ...cfg, ...c };
}
async function startAuth2({ clientId, tenant, prompt, silent = false, context = null }) {
  const verifier = randomString(48);
  const challenge = await sha256b64url(verifier);
  const state = randomString(16);
  savePending({ provider: "outlook", state, verifier, silent, context, createdAt: Date.now() });
  const p = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri(),
    response_mode: "fragment",
    scope: SCOPES2,
    state,
    code_challenge: challenge,
    code_challenge_method: "S256"
  });
  const hint = account2();
  if (hint) p.set("login_hint", hint);
  if (prompt) p.set("prompt", prompt);
  location.assign(`${loginBase(tenant)}/authorize?${p.toString()}`);
}
async function tokenRequest(params, tenant) {
  const res = await fetch(`${loginBase(tenant)}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params).toString()
  });
  let json = {};
  try {
    json = await res.json();
  } catch {
  }
  if (!res.ok) {
    const err = new Error(json.error_description || json.error || `Token request failed (${res.status})`);
    err.code = json.error || "token_error";
    throw err;
  }
  return json;
}
async function completeAuth2(params, pending, { clientId, tenant }) {
  if (params.error) return { ok: false, error: params.error, description: params.error_description || "" };
  try {
    const json = await tokenRequest(
      {
        client_id: clientId,
        scope: SCOPES2,
        code: params.code,
        redirect_uri: redirectUri(),
        grant_type: "authorization_code",
        code_verifier: pending.verifier
      },
      tenant
    );
    const claims = json.id_token ? decodeJwt(json.id_token) : {};
    const prev = getAuth2() || {};
    setAuth2({
      accessToken: json.access_token,
      expiresAt: Date.now() + (json.expires_in || 3600) * 1e3 - 6e4,
      refreshToken: json.refresh_token || null,
      // SPA refresh tokens last 24 hours from sign-in and don't extend when used.
      refreshExpiresAt: Date.now() + 24 * 3600 * 1e3 - 10 * 60 * 1e3,
      account: { name: claims.name || prev.account && prev.account.name || "", username: claims.preferred_username || prev.account && prev.account.username || "" },
      connected: true,
      connectedAt: prev.connectedAt || Date.now()
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.code || "token_error", description: err.message };
  }
}
var refreshing = null;
async function refresh() {
  const a = getAuth2();
  if (!a || !a.refreshToken || a.refreshExpiresAt < Date.now()) return null;
  if (!refreshing) {
    refreshing = tokenRequest(
      { client_id: cfg.clientId, scope: SCOPES2, refresh_token: a.refreshToken, grant_type: "refresh_token" },
      cfg.tenant
    ).then((json) => {
      const cur = getAuth2() || a;
      setAuth2({
        ...cur,
        accessToken: json.access_token,
        expiresAt: Date.now() + (json.expires_in || 3600) * 1e3 - 6e4,
        refreshToken: json.refresh_token || cur.refreshToken
      });
      return json.access_token;
    }).catch((err) => {
      if (err.code === "invalid_grant" || err.code === "interaction_required") {
        const cur = getAuth2();
        if (cur) setAuth2({ ...cur, accessToken: null, expiresAt: 0, refreshToken: null, refreshExpiresAt: 0 });
        return null;
      }
      throw err;
    }).finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
}
async function ensureToken2() {
  if (hasValidToken2()) return getAuth2().accessToken;
  return refresh();
}
function markExpired2() {
  const a = getAuth2();
  if (a) setAuth2({ ...a, accessToken: null, expiresAt: 0 });
}
async function graph(pathOrUrl, { method = "GET", body, headers = {}, okStatuses = [], retry = true } = {}) {
  const token = await ensureToken2();
  if (!token) throw new AuthError("expired");
  const url = pathOrUrl.startsWith("https://") ? pathOrUrl : GRAPH + pathOrUrl;
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...body ? { "Content-Type": "application/json" } : {}, ...headers },
    body: body ? JSON.stringify(body) : void 0
  });
  if (res.status === 401) {
    markExpired2();
    if (retry && canRefresh()) return graph(pathOrUrl, { method, body, headers, okStatuses, retry: false });
    throw new AuthError("expired");
  }
  if (okStatuses.includes(res.status)) return null;
  if (res.status === 204) return null;
  if (!res.ok) {
    let msg = "";
    try {
      const j = await res.json();
      msg = j && j.error && j.error.message;
    } catch {
    }
    throw new ApiError(res.status, msg);
  }
  return res.json();
}
var COLOR_MAP = {
  lightBlue: "#4A90D9",
  lightGreen: "#5DB36B",
  lightOrange: "#E8923C",
  lightGray: "#8A8F98",
  lightYellow: "#D9B43A",
  lightTeal: "#2FA5A5",
  lightPink: "#D96BA6",
  lightBrown: "#A67C52",
  lightRed: "#D9534F",
  maxColor: "#1A8FA3",
  auto: "#1A8FA3"
};
async function listCalendars2() {
  const data = await graph("/me/calendars?$select=id,name,color,hexColor,isDefaultCalendar,canEdit&$top=100");
  return (data.value || []).map((c) => ({
    id: c.id,
    name: c.name,
    color: c.hexColor || COLOR_MAP[c.color] || "#1A8FA3",
    primary: !!c.isDefaultCalendar,
    canEdit: c.canEdit !== false,
    selected: true
  }));
}
function graphUtcToIso(s) {
  return s ? `${s.slice(0, 19)}Z` : null;
}
function mapEvent2(ev, cal) {
  const allDay = !!ev.isAllDay;
  return {
    key: `outlook|${cal.id}|${ev.id}`,
    provider: "outlook",
    calendarId: cal.id,
    calendarName: cal.name,
    id: ev.id,
    seriesId: ev.seriesMasterId || null,
    title: ev.subject || "(No title)",
    allDay,
    start: allDay ? ev.start.dateTime.slice(0, 10) : graphUtcToIso(ev.start.dateTime),
    end: allDay ? ev.end.dateTime.slice(0, 10) : graphUtcToIso(ev.end.dateTime),
    location: ev.location && ev.location.displayName || "",
    url: ev.webLink || "",
    joinUrl: ev.onlineMeeting && ev.onlineMeeting.joinUrl || "",
    color: cal.color,
    busy: ev.showAs !== "free",
    taskId: null
  };
}
async function listEvents2(cal, timeMin, timeMax) {
  const out = [];
  const select = "id,subject,start,end,isAllDay,location,webLink,isCancelled,showAs,responseStatus,onlineMeeting,seriesMasterId";
  let url = `/me/calendars/${encodeURIComponent(cal.id)}/calendarView?startDateTime=${encodeURIComponent(timeMin)}&endDateTime=${encodeURIComponent(timeMax)}&$top=250&$select=${select}&$orderby=start/dateTime`;
  for (let page = 0; page < 6 && url; page++) {
    const data = await graph(url);
    for (const ev of data.value || []) {
      if (ev.isCancelled) continue;
      if (ev.responseStatus && ev.responseStatus.response === "declined") continue;
      out.push(mapEvent2(ev, cal));
    }
    url = data["@odata.nextLink"] || null;
  }
  return out;
}
var DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
function graphRecurrence(rule, startKey) {
  const r = normalizeRule(rule);
  if (!r) return null;
  const d = fromKey(startKey);
  let pattern;
  switch (r.freq) {
    case "daily":
      pattern = { type: "daily", interval: r.interval };
      break;
    case "weekdays":
      pattern = { type: "weekly", interval: 1, daysOfWeek: ["monday", "tuesday", "wednesday", "thursday", "friday"] };
      break;
    case "weekly":
      pattern = { type: "weekly", interval: r.interval, daysOfWeek: (r.byDays && r.byDays.length ? r.byDays : [weekday(startKey)]).map((i) => DAY_NAMES[i]) };
      break;
    case "monthly":
      pattern = { type: "absoluteMonthly", interval: r.interval, dayOfMonth: d.getDate() };
      break;
    case "yearly":
      pattern = { type: "absoluteYearly", interval: r.interval, dayOfMonth: d.getDate(), month: d.getMonth() + 1 };
      break;
    default:
      return null;
  }
  return { pattern, range: { type: "noEnd", startDate: startKey } };
}
function eventPayload2(task, { defaultDuration = 30 } = {}) {
  const w = taskWindow(task, defaultDuration);
  if (!w) return null;
  const raw = localTimeZone();
  const tz = windowsZone(raw) || ianaZone(raw);
  const body = {
    subject: task.title,
    body: { contentType: "text", content: eventDetails(task) },
    isReminderOn: task.reminder !== null && task.reminder !== void 0,
    reminderMinutesBeforeStart: task.reminder !== null && task.reminder !== void 0 ? Math.max(0, task.reminder) : 15,
    showAs: "busy"
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
    body.start = { dateTime: utcExtended(w.start).replace("Z", ""), timeZone: "UTC" };
    body.end = { dateTime: utcExtended(w.end).replace("Z", ""), timeZone: "UTC" };
  }
  if (task.recur) body.recurrence = graphRecurrence(task.recur, task.date);
  return body;
}
async function createEvent2(calendarId, task, opts2) {
  const path = calendarId ? `/me/calendars/${encodeURIComponent(calendarId)}/events` : "/me/events";
  const ev = await graph(path, { method: "POST", body: eventPayload2(task, opts2) });
  return { eventId: ev.id, url: ev.webLink || "" };
}
async function patchEvent2(calendarId, eventId, task, opts2) {
  const body = eventPayload2(task, opts2);
  delete body.recurrence;
  const ev = await graph(`/me/events/${encodeURIComponent(eventId)}`, { method: "PATCH", body });
  return { eventId: ev.id, url: ev.webLink || "" };
}
async function getEvent2(calendarId, eventId) {
  try {
    const ev = await graph(`/me/events/${encodeURIComponent(eventId)}?$select=id,subject,start,end,isAllDay,isCancelled,type`);
    if (!ev || ev.isCancelled) return null;
    return ev;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}
async function deleteEvent2(calendarId, eventId) {
  await graph(`/me/events/${encodeURIComponent(eventId)}`, { method: "DELETE", okStatuses: [404] });
}
async function revoke2() {
  clearAuth2();
}

// ../dayline/js/calendar/index.js
var PROVIDERS = { google: google_exports, outlook: outlook_exports };
var PROVIDER_IDS = ["google", "outlook"];
var PROVIDER_LABEL = { google: "Google Calendar", outlook: "Outlook" };
var CACHE_KEY = "dayline:events";
var QUEUE_KEY = "dayline:calqueue";
var AUTO_KEY = "dayline:autoauth:";
var listeners = /* @__PURE__ */ new Set();
function onChange(fn) {
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
    const v = JSON.parse(localStorage.getItem(key) || "null");
    return v === null ? fallback : v;
  } catch {
    return fallback;
  }
}
var status = {
  google: { syncing: false, error: null, needsAuth: false },
  outlook: { syncing: false, error: null, needsAuth: false }
};
var cache = loadJSON(CACHE_KEY, {});
var queue = loadJSON(QUEUE_KEY, []);
function saveCache() {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (err) {
    console.warn("Could not cache events", err);
  }
}
function saveQueue() {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}
function config(p) {
  const s = store.settings[p] || {};
  const g = window.DAYLINE_CONFIG || {};
  if (p === "google") return { clientId: String(s.clientId || g.googleClientId || "").trim() };
  return {
    clientId: String(s.clientId || g.microsoftClientId || "").trim(),
    tenant: String(s.tenant || g.microsoftTenant || "").trim()
  };
}
function isConfigured(p) {
  return !!config(p).clientId;
}
function isConnected3(p) {
  return isConfigured(p) && PROVIDERS[p].isConnected();
}
function anyConnected() {
  return PROVIDER_IDS.some(isConnected3);
}
function hasUsableToken(p) {
  const prov = PROVIDERS[p];
  return prov.hasValidToken() || p === "outlook" && canRefresh();
}
function getStatus(p) {
  const prov = PROVIDERS[p];
  const c = cache[p] || {};
  return {
    configured: isConfigured(p),
    connected: isConnected3(p),
    account: prov.account(),
    usable: hasUsableToken(p),
    lastSync: c.fetchedAt || null,
    calendars: c.calendars || [],
    error: status[p].error,
    // needsAuth: a sign-in is required (silent refresh failed, or changes are waiting). expired: just a stale token.
    needsAuth: isConnected3(p) && (status[p].needsAuth || !hasUsableToken(p) && queue.some((q) => q.provider === p)),
    expired: isConnected3(p) && !hasUsableToken(p),
    syncing: status[p].syncing,
    queued: queue.filter((q) => q.provider === p).length
  };
}
function getRedirectUri() {
  return redirectUri();
}
function calendarsFor(p) {
  return cache[p] && cache[p].calendars || [];
}
function isCalendarShown(p, cal) {
  const pref = (store.settings[p].calendars || {})[cal.id];
  if (pref !== void 0) return pref;
  return p === "google" ? cal.selected !== false : !!cal.primary;
}
function shownIds(p) {
  return new Set(calendarsFor(p).filter((c) => isCalendarShown(p, c)).map((c) => c.id));
}
function defaultCalendarId(p) {
  const pref = store.settings[p].defaultCalendar;
  const cals = calendarsFor(p);
  if (pref && (cals.length === 0 || cals.some((c) => c.id === pref))) return pref;
  const primary = cals.find((c) => c.primary);
  if (primary) return primary.id;
  return p === "google" ? "primary" : "";
}
function opts() {
  return { defaultDuration: store.settings.defaultDuration || 30, linkType: store.settings.outlookLinkType || "work" };
}
async function connect(p, { silent = false, context = null } = {}) {
  const c = config(p);
  if (!c.clientId) throw new Error("not_configured");
  localStorage.setItem(AUTO_KEY + p, String(Date.now()));
  store.flush();
  const firstTime = !PROVIDERS[p].account();
  const prompt = silent ? "none" : firstTime ? "select_account" : void 0;
  if (p === "google") startAuth({ clientId: c.clientId, prompt, silent, context });
  else await startAuth2({ clientId: c.clientId, tenant: c.tenant, prompt, silent, context });
}
var SILENT_ERRORS = ["interaction_required", "login_required", "consent_required", "account_selection_required"];
function describeAuthError(p, res) {
  const e = res.error || "";
  const d = res.description || "";
  if (p === "google") {
    if (e === "access_denied") return "Access was declined. Tap Connect to try again.";
    if (e === "scope_denied") return "Dayline needs permission to view and edit your calendar events. Connect again and allow it.";
    return `Google sign-in failed (${e}).`;
  }
  if (/AADSTS65001|AADSTS90094|AADSTS90095|admin/i.test(d) || e === "consent_required") return "Your Microsoft 365 organization requires an admin to approve Dayline. See the setup guide: “Grant admin consent”.";
  if (/AADSTS50194/.test(d)) return "Enter your Directory (tenant) ID in Settings — the app is registered for a single organization.";
  if (/AADSTS9002326|Single-Page Application/i.test(d)) return "In Entra, the redirect URI must be added under the “Single-page application” platform.";
  if (/AADSTS50011|redirect/i.test(d)) return `The redirect URI doesn’t match. Register exactly: ${redirectUri()}`;
  if (/AADSTS700016/.test(d)) return "Application (client) ID not found in that directory. Check the client ID and tenant.";
  if (e === "access_denied") return "Access was declined. Tap Connect to try again.";
  return d ? d.split("\r\n")[0].replace(/^AADSTS\d+:\s*/, "") : `Microsoft sign-in failed (${e}).`;
}
async function handleRedirect() {
  const params = readReturnParams();
  if (!params) return null;
  const pending = peekPending();
  cleanUrl();
  clearPending();
  if (!pending || pending.state !== params.state) return { ok: false, provider: pending ? pending.provider : null, error: "state_mismatch", message: "Sign-in response didn’t match — please try again." };
  const p = pending.provider;
  let res;
  if (p === "google") res = await completeAuth(params);
  else {
    configure(config("outlook"));
    res = await completeAuth2(params, pending, config("outlook"));
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
  emit("status");
  return res;
}
function maybeAutoAuth(context = null) {
  if (!store.settings.autoRefreshAuth || !navigator.onLine) return false;
  for (const p of PROVIDER_IDS) {
    if (!isConnected3(p) || hasUsableToken(p)) continue;
    const last = +localStorage.getItem(AUTO_KEY + p) || 0;
    if (Date.now() - last < 20 * 60 * 1e3) continue;
    connect(p, { silent: true, context });
    return true;
  }
  return false;
}
async function disconnect(p) {
  await PROVIDERS[p].revoke();
  delete cache[p];
  saveCache();
  queue = queue.filter((q) => q.provider !== p);
  saveQueue();
  status[p] = { syncing: false, error: null, needsAuth: false };
  emit("status");
  emit("events");
}
var syncing = null;
function sync({ force = false } = {}) {
  if (syncing) return syncing;
  syncing = (async () => {
    for (const p of PROVIDER_IDS) {
      if (isConnected3(p)) await syncProvider(p, force);
    }
  })().finally(() => {
    syncing = null;
    emit("events");
  });
  return syncing;
}
function friendlyError(err) {
  if (!navigator.onLine) return "Offline — showing saved events.";
  if (err instanceof ApiError) {
    if (err.status === 403) return "Permission denied by the calendar service.";
    if (err.status === 429) return "Too many requests — will retry shortly.";
    return err.message || `Calendar error (${err.status}).`;
  }
  if (err && err.name === "TypeError") return "Network error — showing saved events.";
  return err && err.message || "Sync failed.";
}
async function syncProvider(p, force) {
  const prov = PROVIDERS[p];
  if (p === "outlook") configure(config("outlook"));
  let token = null;
  try {
    token = await prov.ensureToken();
  } catch (err) {
    status[p].error = friendlyError(err);
    emit("status");
    return;
  }
  if (!token) {
    emit("status");
    return;
  }
  status[p].syncing = true;
  status[p].error = null;
  emit("status");
  const startedAt = (/* @__PURE__ */ new Date()).toISOString();
  try {
    await processQueue(p);
    const c = cache[p] || {};
    let calendars = c.calendars;
    if (!calendars || !calendars.length || force || !c.calendarsAt || Date.now() - c.calendarsAt > 6 * 3600 * 1e3) {
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
        events.push(...await prov.listEvents(cal, timeMin, timeMax));
      } catch (err) {
        if (err instanceof AuthError) throw err;
        failed++;
        console.warn("Calendar fetch failed", cal.name, err);
      }
    }
    cache[p] = { ...c, calendars, events, fetchedAt: Date.now(), rangeStart: from, rangeEnd: to };
    saveCache();
    status[p].needsAuth = false;
    if (failed) status[p].error = `${failed} calendar${failed > 1 ? "s" : ""} couldn’t be loaded.`;
    await reconcileLinked(p, events, from, to, startedAt);
  } catch (err) {
    if (!(err instanceof AuthError)) status[p].error = friendlyError(err);
  } finally {
    status[p].syncing = false;
    emit("status");
  }
}
async function reconcileLinked(p, events, from, to, startedAt) {
  const prov = PROVIDERS[p];
  const byId = new Map(events.map((e) => [e.id, e]));
  const updated = [];
  const unlinked = [];
  const graceIso = new Date(Date.now() - 60 * 1e3).toISOString();
  const linked = store.tasks.filter((t) => !t.done && t.cal && t.cal.provider === p && !t.recur && (t.updatedAt || "") < startedAt && (t.cal.syncedAt || "") < graceIso);
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
    store.emit("task");
    const parts = [];
    if (updated.length) parts.push(`Updated from ${PROVIDER_LABEL[p]}: ${updated.slice(0, 2).join(", ")}${updated.length > 2 ? ` +${updated.length - 2}` : ""}`);
    if (unlinked.length) parts.push(`${unlinked.length} event${unlinked.length > 1 ? "s were" : " was"} removed from ${PROVIDER_LABEL[p]}`);
    emit("toast", parts.join(" · "));
  }
}
function normalizeRawEvent(p, raw) {
  if (p === "google") {
    if (raw.status === "cancelled") return null;
    const allDay2 = !!(raw.start && raw.start.date);
    return { id: raw.id, title: raw.summary || "", allDay: allDay2, start: allDay2 ? raw.start.date : raw.start.dateTime, end: allDay2 ? raw.end.date : raw.end.dateTime };
  }
  const allDay = !!raw.isAllDay;
  return {
    id: raw.id,
    title: raw.subject || "",
    allDay,
    start: allDay ? raw.start.dateTime.slice(0, 10) : `${raw.start.dateTime.slice(0, 19)}Z`,
    end: allDay ? raw.end.dateTime.slice(0, 10) : `${raw.end.dateTime.slice(0, 19)}Z`
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
    const dur = Math.max(5, Math.round((e - s) / 6e4));
    if (t.date !== date) patch.date = date;
    if (t.time !== time) patch.time = time;
    if ((t.duration || store.settings.defaultDuration) !== dur) patch.duration = dur;
  }
  if (ev.title && ev.title !== t.title) patch.title = ev.title;
  return Object.keys(patch).length ? patch : null;
}
function enqueue(item) {
  if (item.op === "delete") queue = queue.filter((q) => !(q.taskId === item.taskId && q.op !== "delete"));
  else queue = queue.filter((q) => !(q.taskId === item.taskId && q.op === item.op));
  if (item.op === "update" && queue.some((q) => q.taskId === item.taskId && q.op === "create")) return;
  const prev = queue.find((q) => q.taskId === item.taskId);
  queue.push({ ...item, qid: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`, dateChanged: item.dateChanged || prev && prev.dateChanged || false, at: Date.now(), attempts: 0 });
  saveQueue();
}
var kickTimer = null;
function kick(delay = 700) {
  clearTimeout(kickTimer);
  kickTimer = setTimeout(async () => {
    for (const p of PROVIDER_IDS) {
      if (!queue.some((q) => q.provider === p) || !isConnected3(p)) continue;
      if (p === "outlook") configure(config("outlook"));
      let token = null;
      try {
        token = await PROVIDERS[p].ensureToken();
      } catch {
      }
      if (!token) {
        status[p].needsAuth = true;
        emit("status");
        continue;
      }
      try {
        await processQueue(p);
      } catch (err) {
        if (err instanceof AuthError) status[p].needsAuth = true;
      }
      emit("status");
      emit("events");
    }
    const waiting = queue.filter((q) => q.notBefore && q.notBefore > Date.now());
    if (waiting.length) kick(Math.max(500, Math.min(...waiting.map((q) => q.notBefore)) - Date.now() + 100));
  }, delay);
}
function pendingCount() {
  return queue.length;
}
var isDue = (q) => !q.notBefore || q.notBefore <= Date.now();
var running = {};
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
        if (!navigator.onLine || err && err.name === "TypeError") break;
        item.attempts = (item.attempts || 0) + 1;
        if (item.attempts >= 5 || err instanceof ApiError && [400, 403, 404].includes(err.status)) {
          queue = queue.filter((q) => q !== item);
          emit("toast", `Couldn’t update ${PROVIDER_LABEL[p]}: ${err.message || "error"}`);
        }
      }
    }
    saveQueue();
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
    url: res.url || "",
    seriesStart: task.recur ? task.date : null,
    recurKey: task.recur ? JSON.stringify(task.recur) : null,
    syncedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
async function runOp(item) {
  const prov = PROVIDERS[item.provider];
  if (item.op === "delete") {
    if (store.getTask(item.taskId)) return;
    await prov.deleteEvent(item.calendarId, item.eventId);
    return;
  }
  const task = store.getTask(item.taskId);
  if (!task) return;
  if (item.op === "create") {
    if (task.cal || !task.date) return;
    const cal = item.calendarId !== void 0 ? item.calendarId : defaultCalendarId(item.provider);
    const res = await prov.createEvent(cal, task, opts());
    store.setCalLink(task.id, linkFor(task, item.provider, cal, res));
    return;
  }
  if (item.op === "update") {
    const link = task.cal;
    if (!link || link.provider !== item.provider) return;
    if (!task.date) {
      await prov.deleteEvent(link.calendarId, link.eventId);
      store.setCalLink(task.id, null);
      return;
    }
    const recurKey = task.recur ? JSON.stringify(task.recur) : null;
    if (recurKey !== (link.recurKey || null) || task.recur && item.dateChanged) {
      await prov.deleteEvent(link.calendarId, link.eventId);
      const res2 = await prov.createEvent(link.calendarId, task, opts());
      store.setCalLink(task.id, linkFor(task, item.provider, link.calendarId, res2));
      return;
    }
    const payloadTask = task.recur && link.seriesStart ? { ...task, date: link.seriesStart } : task;
    let res;
    try {
      res = await prov.patchEvent(link.calendarId, link.eventId, payloadTask, opts());
    } catch (err) {
      if (err instanceof ApiError && (err.status === 404 || err.status === 410)) {
        store.setCalLink(task.id, null);
        emit("toast", `“${task.title}” is no longer on ${PROVIDER_LABEL[item.provider]}`);
        return;
      }
      throw err;
    }
    store.setCalLink(task.id, { ...link, url: res.url || link.url, syncedAt: (/* @__PURE__ */ new Date()).toISOString() });
  }
}
var SYNC_FIELDS = ["title", "date", "time", "duration", "notes", "reminder"];
store.onTaskChange((before, after, meta) => {
  if (!after) return;
  const auto = store.settings.autoCalendar;
  if (!before) {
    if (auto && isConnected3(auto) && after.date && after.time && !after.cal) {
      enqueue({ op: "create", provider: auto, taskId: after.id, calendarId: defaultCalendarId(auto) });
      kick();
    }
    return;
  }
  const link = before.cal;
  if (!link) {
    if (auto && isConnected3(auto) && after.date && after.time && !before.time && !after.done && !after.cal) {
      enqueue({ op: "create", provider: auto, taskId: after.id, calendarId: defaultCalendarId(auto) });
      kick();
    }
    return;
  }
  if (!after.cal) return;
  if (meta && meta.reason === "rollforward") return;
  if (after.done !== before.done) return;
  const changed = SYNC_FIELDS.some((f) => before[f] !== after[f]) || JSON.stringify(before.recur) !== JSON.stringify(after.recur) || JSON.stringify(before.subtasks) !== JSON.stringify(after.subtasks);
  if (!changed) return;
  enqueue({ op: "update", provider: link.provider, taskId: after.id, dateChanged: before.date !== after.date });
  kick();
});
store.onTaskDelete((task) => {
  if (!task.cal) return;
  enqueue({ op: "delete", provider: task.cal.provider, taskId: task.id, calendarId: task.cal.calendarId, eventId: task.cal.eventId, notBefore: Date.now() + 7e3 });
  kick(7200);
});
async function addToCalendar(task, p, calendarId) {
  if (!task.date) throw new Error("Give the task a date first.");
  if (isConnected3(p)) {
    const cal = calendarId !== void 0 ? calendarId : defaultCalendarId(p);
    if (p === "outlook") configure(config("outlook"));
    let token = null;
    try {
      token = await PROVIDERS[p].ensureToken();
    } catch {
    }
    if (token) {
      const res = await PROVIDERS[p].createEvent(cal, task, opts());
      store.setCalLink(task.id, linkFor(task, p, cal, res));
      sync();
      return { mode: "api" };
    }
    enqueue({ op: "create", provider: p, taskId: task.id, calendarId: cal });
    status[p].needsAuth = true;
    emit("status");
    return { mode: "queued" };
  }
  return { mode: "link", url: linkUrl(task, p) };
}
function linkUrl(task, p) {
  return p === "google" ? googleTemplateUrl(task, opts()) : outlookComposeUrl(task, opts());
}
async function removeFromCalendar(task) {
  const link = task.cal;
  if (!link) return;
  store.setCalLink(task.id, null);
  enqueue({ op: "delete", provider: link.provider, taskId: `${task.id}#unlink`, calendarId: link.calendarId, eventId: link.eventId });
  kick(100);
}
function icsFor(task) {
  return { text: buildICS(task, opts()), filename: icsFileName(task) };
}
function linkedIndex() {
  const m = /* @__PURE__ */ new Map();
  for (const t of store.tasks) if (t.cal) m.set(t.cal.eventId, t);
  return m;
}
function overlapsDay(ev, key) {
  if (ev.allDay) return ev.start <= key && key < ev.end;
  const s = new Date(ev.start);
  const e = new Date(ev.end);
  return s < fromKey(addDays(key, 1)) && e > fromKey(key);
}
function eventsForDay(key) {
  const out = [];
  const linked = linkedIndex();
  const doneOccurrences = new Set(store.tasks.filter((t2) => t2.done && t2.fromRecurring && t2.date).map((t2) => `${t2.fromRecurring}|${t2.date}`));
  for (const p of PROVIDER_IDS) {
    if (!isConnected3(p) || !cache[p] || !cache[p].events) continue;
    const shown = shownIds(p);
    for (const ev of cache[p].events) {
      if (!shown.has(ev.calendarId) || !overlapsDay(ev, key)) continue;
      const t2 = linked.get(ev.id) || ev.seriesId && linked.get(ev.seriesId) || ev.taskId && store.getTask(ev.taskId);
      if (t2 && t2.date === key) continue;
      if (t2 && !t2.recur && !ev.seriesId) continue;
      if (t2 && t2.recur && doneOccurrences.has(`${t2.id}|${key}`)) continue;
      out.push(ev);
    }
  }
  const t = (ev) => ev.allDay ? fromKey(ev.start).getTime() : new Date(ev.start).getTime();
  return out.sort((a, b) => a.allDay === b.allDay ? t(a) - t(b) || a.title.localeCompare(b.title) : a.allDay ? -1 : 1);
}
function hasEventsCache() {
  return PROVIDER_IDS.some((p) => isConnected3(p) && cache[p] && cache[p].events && cache[p].events.length);
}
function lastSyncAt() {
  const times = PROVIDER_IDS.filter(isConnected3).map((p) => cache[p] && cache[p].fetchedAt || 0);
  return times.length ? Math.min(...times) : 0;
}
function _debug() {
  return { cache, queue, status };
}
function _setCache(p, data) {
  cache[p] = data;
  saveCache();
  emit("events");
}

// ../dayline/js/ui/dom.js
var $ = (sel, root = document) => root.querySelector(sel);
var ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
function esc(v) {
  return String(v === null || v === void 0 ? "" : v).replace(/[&<>"']/g, (c) => ESC[c]);
}
function safeColor(c, fallback = "#64748B") {
  return /^#[0-9a-f]{3,8}$/i.test(String(c || "")) ? c : fallback;
}
function icon(name, cls = "") {
  return `<svg class="icon ${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
}
var ui = {
  view: "today",
  listId: null,
  scheduleDate: null,
  expanded: {},
  renderFn: null,
  sheet: null
};
function toast(message, { action, actionLabel = "Undo", duration = 4200 } = {}) {
  const root = document.getElementById("toast-root");
  if (!root) return;
  while (root.children.length >= 2) root.firstElementChild.remove();
  const el = document.createElement("div");
  el.className = "toast";
  el.setAttribute("role", "status");
  el.innerHTML = `<span>${esc(message)}</span>${action ? `<button type="button">${esc(actionLabel)}</button>` : ""}`;
  let timer;
  const close = () => {
    clearTimeout(timer);
    el.classList.add("leaving");
    setTimeout(() => el.remove(), 200);
  };
  if (action) {
    el.querySelector("button").addEventListener("click", () => {
      close();
      action();
    });
  }
  root.appendChild(el);
  timer = setTimeout(close, duration);
  return close;
}
var sheetStack = [];
function updateKeyboardShift() {
  const vv = window.visualViewport;
  const top = sheetStack[sheetStack.length - 1];
  if (!vv || !top) return;
  const sheet = top.el.querySelector(".sheet");
  if (!sheet || !sheet.classList.contains("kb-aware")) return;
  const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
  sheet.style.setProperty("--kb-shift", kb > 80 ? `-${kb}px` : "0px");
}
if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", updateKeyboardShift);
  window.visualViewport.addEventListener("scroll", updateKeyboardShift);
}
function openSheet({ id: id3, html, className = "", label: label3 = "", onClose, onMount }) {
  const root = document.getElementById("sheet-root");
  const wrap = document.createElement("div");
  wrap.className = "sheet-wrap";
  wrap.dataset.sheet = id3;
  wrap.innerHTML = `<div class="sheet-backdrop" data-sheet-close="backdrop"></div><div class="sheet ${className}" role="dialog" aria-modal="true" aria-label="${esc(label3)}">${html}</div>`;
  root.appendChild(wrap);
  document.body.classList.add("sheet-open");
  const prevFocus = document.activeElement;
  let closed = false;
  const entry = {
    id: id3,
    el: wrap,
    close(reason = "close") {
      if (closed) return;
      closed = true;
      sheetStack = sheetStack.filter((s) => s !== entry);
      wrap.classList.add("closing");
      setTimeout(() => wrap.remove(), 200);
      if (!sheetStack.length) document.body.classList.remove("sheet-open");
      if (onClose) onClose(reason);
      if (prevFocus && prevFocus.focus && document.contains(prevFocus)) {
        try {
          prevFocus.focus({ preventScroll: true });
        } catch {
        }
      }
    },
    setBody(bodyHtml) {
      const body = wrap.querySelector(".sheet-body");
      if (body) body.innerHTML = bodyHtml;
    }
  };
  wrap.querySelector(".sheet-backdrop").addEventListener("click", () => entry.close("backdrop"));
  const handleArea = wrap.querySelector(".sheet-handle");
  if (handleArea) enableSwipeDown(wrap.querySelector(".sheet"), handleArea.parentElement.querySelector(".sheet-head") || handleArea, entry);
  sheetStack.push(entry);
  if (onMount) onMount(wrap, entry);
  updateKeyboardShift();
  return entry;
}
function enableSwipeDown(sheet, area, entry) {
  let startY = null;
  let dy = 0;
  const targets = [sheet.querySelector(".sheet-handle"), area].filter(Boolean);
  for (const t of targets) {
    t.addEventListener(
      "touchstart",
      (e) => {
        if (e.target.closest("button, input, select, textarea")) return;
        startY = e.touches[0].clientY;
        dy = 0;
        sheet.style.transition = "none";
      },
      { passive: true }
    );
    t.addEventListener(
      "touchmove",
      (e) => {
        if (startY === null) return;
        dy = Math.max(0, e.touches[0].clientY - startY);
        sheet.style.transform = `translateY(${dy}px)`;
      },
      { passive: true }
    );
    t.addEventListener("touchend", () => {
      if (startY === null) return;
      sheet.style.transition = "";
      sheet.style.transform = "";
      if (dy > 90) entry.close("swipe");
      startY = null;
    });
  }
}
function topSheet() {
  return sheetStack[sheetStack.length - 1] || null;
}
function closeTopSheet(reason = "escape") {
  const top = topSheet();
  if (top) top.close(reason);
  return !!top;
}
function sheetHead({ title, left = "", right = "" }) {
  return `<div class="sheet-handle" aria-hidden="true"></div><div class="sheet-head">${left || '<span style="min-width:64px"></span>'}<h3>${esc(title)}</h3>${right || '<span style="min-width:64px"></span>'}</div>`;
}
function autosize(ta) {
  if (!ta) return;
  ta.style.height = "auto";
  ta.style.height = `${Math.min(ta.scrollHeight, 240)}px`;
}
function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}
function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {
    }
    ta.remove();
    return ok;
  }
}
async function offerFile(text, filename, type) {
  const file = typeof File === "function" ? new File([text], filename, { type }) : null;
  if (file && navigator.canShare && navigator.canShare({ files: [file] }) && isIOS()) {
    try {
      await navigator.share({ files: [file], title: filename });
      return "shared";
    } catch (err) {
      if (err && err.name === "AbortError") return "cancelled";
    }
  }
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4e3);
  return "downloaded";
}
function haptic() {
  try {
    if (navigator.vibrate) navigator.vibrate(8);
  } catch {
  }
}

// ../dayline/js/ui/views.js
var PRI_LABEL = ["None", "Low", "Medium", "High"];
var PROVIDER_COLOR = { google: "var(--google)", outlook: "var(--outlook)" };
function taskRow(t, { showDate = true, showList = true, today = todayKey() } = {}) {
  const list = store.getList(t.listId);
  const meta = [];
  if (t.time) meta.push(`<span class="m m-time">${fmtTime(t.time)}${t.duration ? `<span class="m-dur"> · ${fmtDuration(t.duration)}</span>` : ""}</span>`);
  if (showDate && t.date) {
    const cls = !t.done && t.date < today ? "is-overdue" : t.date === today ? "is-today" : "";
    meta.push(`<span class="m m-date ${cls}">${esc(fmtDay(t.date, today))}</span>`);
  }
  if (showList && list && t.listId !== "inbox") meta.push(`<span class="m"><i class="dot" style="--c:${safeColor(list.color)}"></i>${esc(list.name)}</span>`);
  if (t.recur) meta.push(`<span class="m">${icon("repeat", "xs")}${esc(shortRule(t.recur))}</span>`);
  if (t.subtasks.length) meta.push(`<span class="m">${icon("subtasks", "xs")}${t.subtasks.filter((s) => s.done).length}/${t.subtasks.length}</span>`);
  if (t.reminder !== null && !t.done) meta.push(`<span class="m" title="Reminder">${icon("bell", "xs")}</span>`);
  if (t.cal) meta.push(`<span class="m m-cal" style="--c:${PROVIDER_COLOR[t.cal.provider] || "var(--text-2)"}">${icon("cal-check", "xs")}${t.cal.provider === "google" ? "Google" : "Outlook"}</span>`);
  if (t.notes) meta.push(`<span class="m" title="Has notes">${icon("notes", "xs")}</span>`);
  for (const tag of t.tags) meta.push(`<span class="m m-tag">#${esc(tag)}</span>`);
  return `<li class="task pri-${t.priority}${t.done ? " is-done" : ""}" data-id="${esc(t.id)}">
    <button class="check" data-action="toggle" data-id="${esc(t.id)}" role="checkbox" aria-checked="${t.done}" aria-label="${t.done ? "Mark not done" : "Complete"}: ${esc(t.title)}">${icon("check")}</button>
    <button class="task-main" data-action="edit" data-id="${esc(t.id)}"><span class="task-title">${esc(t.title)}</span><span class="task-meta">${meta.join("")}</span></button>
  </li>`;
}
function taskList(tasks, opts2) {
  return `<ul class="task-list">${tasks.map((t) => taskRow(t, opts2)).join("")}</ul>`;
}
function groupHead(title, count, extra = "", cls = "") {
  return `<header class="group-head"><h2 class="${cls}">${esc(title)}</h2>${count !== null && count !== void 0 ? `<span class="count">${count}</span>` : ""}<span class="spacer"></span>${extra}</header>`;
}
function emptyArt() {
  return `<svg class="empty-art" viewBox="0 0 120 80" aria-hidden="true"><path d="M30 55a30 30 0 0160 0z" fill="var(--accent)" opacity=".85"/><path d="M60 14v8M33 25l5 5M87 25l-5 5M20 44h7M93 44h7" stroke="var(--accent)" stroke-width="3" stroke-linecap="round" opacity=".6"/><path d="M10 56h100" stroke="currentColor" stroke-width="3" stroke-linecap="round" opacity=".35"/><path d="M26 66h68M40 74h40" stroke="currentColor" stroke-width="3" stroke-linecap="round" opacity=".16"/></svg>`;
}
function topbar({ title, subtitle = "", actions: actions2 = "", back = "", below = "" }) {
  return `<div class="topbar-inner">${back}<div class="topbar-row"><div class="topbar-titles"><h1 class="title">${esc(title)}</h1>${subtitle ? `<div class="subtitle">${esc(subtitle)}</div>` : ""}</div><div class="topbar-actions">${actions2}<button class="icon-btn" data-action="search" aria-label="Search">${icon("search")}</button><button class="icon-btn" data-action="go" data-view="settings" aria-label="Settings">${icon("settings")}${settingsNeedsAttention() ? '<span class="badge-dot"></span>' : ""}</button></div></div>${below}</div>`;
}
function settingsNeedsAttention() {
  return PROVIDER_IDS.some((p) => {
    const s = getStatus(p);
    return s.connected && (s.needsAuth || s.error);
  });
}
function authBanners() {
  const out = [];
  for (const p of PROVIDER_IDS) {
    const s = getStatus(p);
    if (!s.connected || !s.needsAuth) continue;
    out.push(`<div class="banner"><div class="banner-icon">${icon("sync")}</div><div class="banner-body"><div class="banner-title">Refresh ${esc(PROVIDER_LABEL[p])}</div><div class="banner-text">${s.queued ? `${s.queued} change${s.queued > 1 ? "s are" : " is"} waiting to sync. ` : ""}Your sign-in expired — it takes a second.</div><div class="banner-actions"><button class="btn sm" data-action="cal-connect" data-provider="${p}">Sign in again</button></div></div></div>`);
  }
  return out.join("");
}
function installBanner() {
  if (isStandalone() || store.settings.installDismissed || !isIOS()) return "";
  return `<div class="banner"><div class="banner-icon">${icon("add-home")}</div><div class="banner-body"><div class="banner-title">Put Dayline on your Home Screen</div>
    <ol class="install-steps"><li><span>Tap <span class="kbd">···</span> then <span class="kbd">${icon("share", "xs")} Share</span></span></li><li><span>Choose <span class="kbd">Add to Home Screen</span></span></li><li><span>Keep <b>Open as Web App</b> on, then tap <b>Add</b></span></li></ol>
    </div><button class="x-btn" data-action="dismiss-install" aria-label="Dismiss">${icon("x", "sm")}</button></div>`;
}
function nextUp(today) {
  const now = /* @__PURE__ */ new Date();
  const items = [];
  for (const ev of eventsForDay(today)) {
    if (ev.allDay) continue;
    const s = new Date(ev.start);
    const e = new Date(ev.end);
    if (e <= now) continue;
    items.push({ kind: "event", start: s, end: e, title: ev.title, color: ev.color, key: ev.key, sub: ev.calendarName || PROVIDER_LABEL[ev.provider], join: ev.joinUrl });
  }
  for (const t of tasksDueOn(store.tasks, today)) {
    if (!t.time) continue;
    const s = combine(today, t.time);
    const e = new Date(s.getTime() + (t.duration || store.settings.defaultDuration) * 6e4);
    if (e <= now) continue;
    items.push({ kind: "task", start: s, end: e, title: t.title, color: "var(--accent)", id: t.id, sub: fmtTime(t.time) + (t.duration ? ` · ${fmtDuration(t.duration)}` : "") });
  }
  items.sort((a, b) => a.start - b.start);
  const it = items[0];
  if (!it) return "";
  const ongoing = it.start <= now;
  const when = ongoing ? "Now" : relativeFromNow(it.start, now);
  const timeRange = `${fmtTime(minutesOfDay(it.start))} – ${fmtTime(minutesOfDay(it.end))}`;
  const attrs = it.kind === "event" ? `data-action="open-event" data-key="${esc(it.key)}"` : `data-action="edit" data-id="${esc(it.id)}"`;
  return `<button class="card next-up" ${attrs}><span class="nu-bar" style="--c:${it.kind === "event" ? safeColor(it.color) : "var(--accent)"}"></span><span class="nu-body"><span class="nu-label">${ongoing ? "Happening now" : "Next up"}</span><span class="nu-title" style="display:block">${esc(it.title)}</span><span class="nu-sub" style="display:block">${esc(timeRange)}${it.kind === "event" ? ` · ${esc(it.sub)}` : ""}</span></span><span class="nu-when">${esc(when)}</span></button>`;
}
function agendaStrip(today) {
  const evs = eventsForDay(today).filter((e) => !e.allDay);
  if (!evs.length) return "";
  const now = /* @__PURE__ */ new Date();
  return `<div class="agenda-strip" aria-label="Today's events">${evs.map((ev) => {
    const past = new Date(ev.end) < now;
    return `<button class="ev-chip" style="--c:${safeColor(ev.color)};${past ? "opacity:.5" : ""}" data-action="open-event" data-key="${esc(ev.key)}"><i class="dot"></i><span class="ev-t">${fmtTime(minutesOfDay(new Date(ev.start)), { compact: true })}</span><span class="ev-n">${esc(ev.title)}</span></button>`;
  }).join("")}</div>`;
}
function renderToday() {
  const today = todayKey();
  const tasks = store.tasks;
  const overdue = overdueTasks(tasks, today);
  const due = tasksDueOn(tasks, today);
  const done = doneOn(tasks, today);
  const total = due.length + done.length + overdue.length;
  const pct = total ? Math.round(done.length / total * 100) : 0;
  let html = installBanner() + authBanners();
  if (total) html += `<div class="progress"><div class="progress-bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><span style="width:${pct}%"></span></div><span>${done.length} of ${total} done</span></div>`;
  html += nextUp(today);
  html += agendaStrip(today);
  if (overdue.length) {
    html += `<section class="group">${groupHead("Overdue", overdue.length, `<button class="link-btn" data-action="overdue-to-today">Move to today</button>`, "is-overdue")}${taskList(overdue, { today })}</section>`;
  }
  if (due.length) {
    html += `<section class="group">${groupHead("Today", due.length)}${taskList(due, { showDate: false, today })}</section>`;
  } else if (!overdue.length) {
    const anyTasks = store.tasks.some((t) => !t.done);
    html += `<div class="empty">${emptyArt()}<h3>${done.length ? "All done for today" : anyTasks ? "A clear day" : "Welcome to Dayline"}</h3><p>${done.length ? "Nice work. Enjoy the rest of your day — or plan tomorrow." : anyTasks ? "Nothing is due today. Add something with +, or pull a task in from Lists." : "Tap + and type naturally. Dates, times and lists are picked up for you."}</p>${!anyTasks && !done.length ? `<p class="try">Try one:</p><div class="try-examples"><button class="chip" data-action="quick-add" data-text="Call Ana tomorrow 3pm #work">Call Ana tomorrow 3pm #work</button><button class="chip" data-action="quick-add" data-text="Stretch every weekday 7am for 15m">Stretch every weekday 7am for 15m</button></div>` : ""}</div>`;
  }
  if (done.length) {
    const open = !!ui.expanded.doneToday;
    html += `<section class="group"><button class="collapser" data-action="toggle-expand" data-key="doneToday" aria-expanded="${open}">${icon("chev-down", "sm")}Completed today · ${done.length}</button>${open ? taskList(done, { showDate: false, today }) : ""}</section>`;
  }
  return {
    top: topbar({ title: "Today", subtitle: fmtLong(today) }),
    body: html,
    fabDefaults: { date: today }
  };
}
function eventRows(events) {
  if (!events.length) return "";
  return `<div class="ev-rows">${events.map((ev) => {
    const t = ev.allDay ? "All day" : fmtTime(minutesOfDay(new Date(ev.start)));
    return `<button class="ev-row" style="--c:${safeColor(ev.color)}" data-action="open-event" data-key="${esc(ev.key)}"><span class="ev-bar"></span><span class="ev-time">${esc(t)}</span><span class="ev-name">${esc(ev.title)}</span></button>`;
  }).join("")}</div>`;
}
function renderUpcoming() {
  const today = todayKey();
  const tasks = store.tasks;
  let html = authBanners();
  const overdue = overdueTasks(tasks, today);
  if (overdue.length) html += `<section class="group">${groupHead("Overdue", overdue.length, `<button class="link-btn" data-action="overdue-to-today">Move to today</button>`, "is-overdue")}${taskList(overdue, { today })}</section>`;
  const DAYS = 14;
  for (let i = 0; i < DAYS; i++) {
    const key = addDays(today, i);
    const due = tasksDueOn(tasks, key);
    const events = eventsForDay(key);
    const label3 = i === 0 ? "Today" : i === 1 ? "Tomorrow" : fmtDay(key, today);
    const d = fromKey(key);
    const sub = i < 7 ? `${i < 2 ? `${WEEKDAY_SHORT[d.getDay()]}, ` : ""}${MONTH_SHORT[d.getMonth()]} ${d.getDate()}` : "";
    const head = `<header class="day-head"><h2>${esc(label3)}</h2>${sub ? `<span class="day-sub">${esc(sub)}</span>` : ""}<span class="spacer"></span><button class="icon-btn" data-action="quick-add" data-date="${key}" aria-label="Add task on ${esc(label3)}">${icon("plus", "sm")}</button></header>`;
    if (!due.length && !events.length) {
      if (i < 2) html += `<section class="group">${head}<div class="day-empty">Nothing planned.</div></section>`;
      continue;
    }
    html += `<section class="group">${head}${eventRows(events)}${due.length ? taskList(due, { showDate: false, today }) : ""}</section>`;
  }
  const later = tasks.filter((t) => !t.done && t.date && t.date >= addDays(today, DAYS)).sort(sortByDate);
  if (later.length) {
    let curMonth = "";
    let buf = [];
    const flush = () => {
      if (buf.length) html += `<section class="group">${groupHead(curMonth, buf.length)}${taskList(buf, { today })}</section>`;
      buf = [];
    };
    for (const t of later) {
      const d = fromKey(t.date);
      const m = `${MONTH_LONG[d.getMonth()]}${d.getFullYear() !== fromKey(today).getFullYear() ? ` ${d.getFullYear()}` : ""}`;
      if (m !== curMonth) {
        flush();
        curMonth = m;
      }
      buf.push(t);
    }
    flush();
  }
  const undated = tasks.filter((t) => !t.done && !t.date).length;
  if (undated) html += `<p class="hint" style="text-align:center;margin:18px 0">${undated} task${undated > 1 ? "s have" : " has"} no date — find ${undated > 1 ? "them" : "it"} in <button class="link-btn" data-action="go" data-view="lists">Lists</button>.</p>`;
  return { top: topbar({ title: "Upcoming", subtitle: "Next two weeks" }), body: html };
}
function renderLists() {
  const today = todayKey();
  const open = store.tasks.filter((t) => !t.done);
  const cards = [];
  const allCount = open.length;
  const doneCount = store.tasks.filter((t) => t.done).length;
  for (const l of store.lists) {
    const n = open.filter((t) => t.listId === l.id).length;
    const overdue = open.filter((t) => t.listId === l.id && t.date && t.date < today).length;
    cards.push(`<button class="list-card" data-action="open-list" data-id="${esc(l.id)}"><span class="lc-top"><span class="lc-icon" style="--c:${safeColor(l.color)}">${icon(l.id === "inbox" ? "inbox" : "lists")}</span><span class="lc-count">${n}</span></span><span><span class="lc-name" style="display:block">${esc(l.name)}</span><span class="lc-sub" style="display:block">${overdue ? `<span style="color:var(--danger)">${overdue} overdue</span>` : n ? `${n} open` : "All clear"}</span></span></button>`);
  }
  cards.push(`<button class="list-card" data-action="open-list" data-id="__all"><span class="lc-top"><span class="lc-icon" style="--c:#1F2A44">${icon("today")}</span><span class="lc-count">${allCount}</span></span><span><span class="lc-name" style="display:block">All tasks</span><span class="lc-sub" style="display:block">Everything open</span></span></button>`);
  cards.push(`<button class="list-card" data-action="open-list" data-id="__done"><span class="lc-top"><span class="lc-icon" style="--c:#15803D">${icon("check")}</span><span class="lc-count">${doneCount}</span></span><span><span class="lc-name" style="display:block">Completed</span><span class="lc-sub" style="display:block">Your logbook</span></span></button>`);
  cards.push(`<button class="list-card new" data-action="new-list">${icon("plus", "sm")} New list</button>`);
  return { top: topbar({ title: "Lists", subtitle: `${allCount} open task${allCount === 1 ? "" : "s"}` }), body: `<div class="list-grid">${cards.join("")}</div>` };
}
function renderList(listId) {
  const today = todayKey();
  const back = `<button class="back-btn" data-action="go" data-view="lists">${icon("chev-left", "sm")}Lists</button>`;
  if (listId === "__done") {
    const done = store.tasks.filter((t) => t.done).sort((a, b) => a.doneAt < b.doneAt ? 1 : -1).slice(0, 300);
    let html2 = "";
    if (!done.length) html2 = `<div class="empty">${emptyArt()}<h3>Nothing completed yet</h3><p>Finished tasks land here so you can look back on what you got done.</p></div>`;
    else {
      let cur = "";
      let buf = [];
      const flush = () => {
        if (buf.length) html2 += `<section class="group">${groupHead(cur, buf.length)}${taskList(buf, { showDate: false, today })}</section>`;
        buf = [];
      };
      for (const t of done) {
        const k = localDateOfIso(t.doneAt) || today;
        const label3 = fmtDay(k, today);
        if (label3 !== cur) {
          flush();
          cur = label3;
        }
        buf.push(t);
      }
      flush();
      html2 += `<div style="text-align:center;margin-top:18px"><button class="btn soft sm" data-action="clear-completed">${icon("trash", "sm")} Clear completed</button></div>`;
    }
    return { top: topbar({ title: "Completed", back }), body: html2 };
  }
  const isAll = listId === "__all";
  const list = isAll ? { id: "__all", name: "All tasks" } : store.getList(listId);
  const open = store.tasks.filter((t) => !t.done && (isAll || t.listId === list.id));
  const dated = open.filter((t) => t.date).sort(sortByDate);
  const undated = open.filter((t) => !t.date).sort(sortForDay);
  let html = "";
  if (!open.length) html += `<div class="empty">${emptyArt()}<h3>Nothing here</h3><p>Add a task to ${esc(list.name)} with + — or type <code>#${esc((list.name || "").replace(/\s+/g, "-").toLowerCase())}</code> in any new task.</p></div>`;
  if (dated.length) html += `<section class="group">${groupHead("Scheduled", dated.length)}${taskList(dated, { today, showList: isAll })}</section>`;
  if (undated.length) html += `<section class="group">${groupHead("No date", undated.length)}${taskList(undated, { today, showList: isAll })}</section>`;
  if (!isAll) {
    const done = store.tasks.filter((t) => t.done && t.listId === list.id).sort((a, b) => a.doneAt < b.doneAt ? 1 : -1);
    if (done.length) {
      const openKey = `done:${list.id}`;
      const exp = !!ui.expanded[openKey];
      html += `<section class="group"><button class="collapser" data-action="toggle-expand" data-key="${esc(openKey)}" aria-expanded="${exp}">${icon("chev-down", "sm")}Completed · ${done.length}</button>${exp ? taskList(done.slice(0, 100), { today }) : ""}</section>`;
    }
  }
  const actions2 = !isAll && list.id !== "inbox" ? `<button class="icon-btn" data-action="edit-list" data-id="${esc(list.id)}" aria-label="Edit list">${icon("edit")}</button>` : "";
  return { top: topbar({ title: list.name, back, actions: actions2 }), body: html, fabDefaults: isAll ? {} : { listId: list.id } };
}
function selectHtml(name, options, value, attrs = "") {
  return `<select ${attrs} data-setting="${esc(name)}">${options.map(([v, l]) => `<option value="${esc(v)}"${String(v) === String(value) ? " selected" : ""}>${esc(l)}</option>`).join("")}</select>`;
}
var REMINDER_OPTIONS = [
  ["", "None"],
  ["0", "At time of task"],
  ["5", "5 minutes before"],
  ["10", "10 minutes before"],
  ["15", "15 minutes before"],
  ["30", "30 minutes before"],
  ["60", "1 hour before"],
  ["1440", "1 day before"]
];
var DURATION_OPTIONS = [15, 30, 45, 60, 90, 120, 180, 240].map((m) => [String(m), fmtDuration(m)]);
function timeAgo(ts) {
  if (!ts) return "never";
  const mins = Math.round((Date.now() - ts) / 6e4);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h} h ago`;
  return `${Math.round(h / 24)} d ago`;
}
function providerCard(p) {
  const s = getStatus(p);
  const color = p === "google" ? "var(--google)" : "var(--outlook)";
  const name = PROVIDER_LABEL[p];
  const cfg2 = config(p);
  let state = "";
  let stateCls = "";
  if (!s.configured) state = "Not set up yet — one-time setup";
  else if (!s.connected) state = "Ready to connect";
  else if (s.needsAuth) {
    state = "Sign-in expired";
    stateCls = "warn";
  } else if (s.error) {
    state = s.error;
    stateCls = "warn";
  } else {
    state = `${s.account ? `${s.account} · ` : ""}synced ${timeAgo(s.lastSync)}`;
    stateCls = "ok";
  }
  let body = "";
  const redirect = `<label class="field-label">Redirect URI to register</label><div class="redirect-box"><span>${esc(getRedirectUri())}</span><button class="icon-btn" style="width:34px;height:34px" data-action="copy" data-text="${esc(getRedirectUri())}" aria-label="Copy redirect URI">${icon("copy", "sm")}</button></div>`;
  if (!s.configured || ui.expanded[`cfg:${p}`]) {
    body += `<p class="hint" style="margin:0 2px 4px">${p === "google" ? "Create a free Google Cloud OAuth client (about 15 minutes, once). The setup guide walks you through it." : "Register Dayline in Microsoft Entra for your work organization (about 15 minutes, once). An admin may need to approve calendar access."}</p>`;
    body += `<label class="field-label" for="cid-${p}">${p === "google" ? "Client ID" : "Application (client) ID"}</label><input id="cid-${p}" class="text-input mono" data-provider-field="${p}:clientId" value="${esc(store.settings[p].clientId || "")}" placeholder="${p === "google" ? "1234567890-abc….apps.googleusercontent.com" : "00000000-0000-0000-0000-000000000000"}" autocapitalize="off" autocomplete="off" spellcheck="false">`;
    if (p === "outlook") body += `<label class="field-label" for="tenant-outlook">Directory (tenant) ID or domain</label><input id="tenant-outlook" class="text-input mono" data-provider-field="outlook:tenant" value="${esc(store.settings.outlook.tenant || "")}" placeholder="yourcompany.com" autocapitalize="off" autocomplete="off" spellcheck="false">`;
    if (cfg2.clientId && !store.settings[p].clientId) body += `<p class="hint">Using the ID from config.js.</p>`;
    body += redirect;
    body += `<div class="banner-actions"><button class="btn sm" data-action="save-provider" data-provider="${p}">Save</button><a class="btn soft sm" href="help.html#${p}">${icon("info", "sm")} Setup guide</a></div>`;
  } else if (!s.connected) {
    body += `<button class="btn block" data-action="cal-connect" data-provider="${p}">${icon("link", "sm")} Connect ${esc(name)}</button><p class="hint">You’ll sign in with ${p === "google" ? "Google" : "Microsoft"} and come right back. <button class="link-btn" data-action="toggle-expand" data-key="cfg:${p}">Edit IDs</button></p>`;
  } else {
    const cals = s.calendars;
    if (s.needsAuth) body += `<button class="btn block" data-action="cal-connect" data-provider="${p}" style="margin-bottom:12px">${icon("sync", "sm")} Sign in again</button>`;
    if (cals.length) {
      body += `<div class="form-group cal-list">${cals.map(
        (c) => `<label class="row"><span class="dot" style="--c:${safeColor(c.color)};width:12px;height:12px"></span><span class="row-label">${esc(c.name)}${c.primary ? ' <small style="display:inline;margin-left:4px">default</small>' : ""}</span><span class="switch"><input type="checkbox" data-cal-toggle="${p}" data-cal-id="${esc(c.id)}" ${isCalendarShown(p, c) ? "checked" : ""} aria-label="Show ${esc(c.name)}"><span class="switch-ui"></span></span></label>`
      ).join("")}</div>`;
      const writable = cals.filter((c) => c.canEdit);
      body += `<label class="field-label">New events go to</label><div class="form-group"><div class="row"><span class="row-label">Calendar</span>${selectHtml(`${p}:defaultCalendar`, writable.map((c) => [c.id, c.name]), defaultCalendarId(p), `data-provider-select="${p}"`)}</div></div>`;
    } else body += `<p class="hint">Calendars will appear after the first sync.</p>`;
    body += `<div class="banner-actions"><button class="btn soft sm" data-action="cal-sync">${icon("sync", "sm")} Sync now</button><button class="btn soft sm" data-action="cal-disconnect" data-provider="${p}">Disconnect</button></div>`;
  }
  return `<div class="card prov-card"><div class="prov-head"><span class="prov-logo" style="--c:${color}">${icon("cal")}</span><div style="flex:1;min-width:0"><div class="prov-name">${esc(name)}</div><div class="prov-state ${stateCls}">${esc(state)}</div></div></div><div class="prov-body">${body}</div></div>`;
}
function renderSettings() {
  const st = store.settings;
  const anyConn = anyConnected();
  const autoOpts = [["", "Off"], ...PROVIDER_IDS.filter((p) => isConnected3(p)).map((p) => [p, PROVIDER_LABEL[p]])];
  const notifSupported = "Notification" in window && "serviceWorker" in navigator;
  const notifState = notifSupported ? Notification.permission : "unsupported";
  const lastBackup = store.state.meta.lastBackupAt ? fmtDay(toKey(new Date(store.state.meta.lastBackupAt))) : "never";
  const html = `
  <section class="settings-section"><h2>Calendars</h2>
    ${providerCard("google")}
    <div style="height:12px"></div>
    ${providerCard("outlook")}
    <p class="hint">Not connected? “Add to calendar” on any task still opens Google Calendar or Outlook with the event filled in — no setup needed.</p>
    <div class="form-group" style="margin-top:12px">
      <div class="row"><span class="row-label">Outlook links open<small>For “Add to calendar” without connecting</small></span>${selectHtml("outlookLinkType", [["work", "Work or school"], ["personal", "Outlook.com"]], st.outlookLinkType)}</div>
      <div class="row"><span class="row-label">Put timed tasks on my calendar<small>${anyConn ? "Automatically, for new tasks with a time" : "Connect a calendar first"}</small></span>${selectHtml("autoCalendar", autoOpts, st.autoCalendar, anyConn ? "" : "disabled")}</div>
      <label class="row"><span class="row-label">Refresh sign-in automatically<small>Google sign-ins last an hour; Dayline renews them when you open the app</small></span><span class="switch"><input type="checkbox" data-setting-bool="autoRefreshAuth" ${st.autoRefreshAuth ? "checked" : ""}><span class="switch-ui"></span></span></label>
    </div>
  </section>

  <section class="settings-section"><h2>Planning</h2>
    <div class="form-group">
      <div class="row"><span class="row-label">Work day starts</span><input type="time" data-setting="workStart" value="${esc(st.workStart)}"></div>
      <div class="row"><span class="row-label">Work day ends</span><input type="time" data-setting="workEnd" value="${esc(st.workEnd)}"></div>
      <div class="row"><span class="row-label">Default task length</span>${selectHtml("defaultDuration", DURATION_OPTIONS, st.defaultDuration)}</div>
      <div class="row"><span class="row-label">Week starts on</span>${selectHtml("weekStart", [["0", "Sunday"], ["1", "Monday"]], st.weekStart)}</div>
    </div>
    <p class="hint">Auto-plan fills open time between your events within these hours.</p>
  </section>

  <section class="settings-section"><h2>Reminders</h2>
    <div class="form-group">
      <div class="row"><span class="row-label">Default reminder</span>${selectHtml("defaultReminder", REMINDER_OPTIONS, st.defaultReminder === null ? "" : st.defaultReminder)}</div>
      <label class="row"><span class="row-label">Notifications while Dayline is open<small>${notifState === "denied" ? isIOS() ? "Blocked — allow in iPhone Settings → Notifications → Dayline" : "Blocked — allow notifications for this site in your browser settings" : notifState === "unsupported" ? isIOS() && !isStandalone() ? "Add Dayline to your Home Screen first" : "Not supported in this browser" : "Also sets the app-icon badge count"}</small></span><span class="switch"><input type="checkbox" data-action-change="toggle-notifications" ${st.notifications && notifState === "granted" ? "checked" : ""} ${notifState === "unsupported" || notifState === "denied" ? "disabled" : ""}><span class="switch-ui"></span></span></label>
    </div>
    <p class="hint">Web apps can’t wake your phone on a schedule. For alerts you can rely on, add the task to your calendar — its reminder comes from Google Calendar or Outlook.</p>
  </section>

  <section class="settings-section"><h2>Appearance</h2>
    <div class="form-group"><div class="row"><span class="row-label">Theme</span>${selectHtml("theme", [["auto", "Match system"], ["light", "Light"], ["dark", "Dark"]], st.theme)}</div></div>
  </section>

  <section class="settings-section"><h2>Your data</h2>
    <div class="form-group">
      <button class="row row-link" data-action="export"><span class="row-icon" style="--c:#3B7BE8">${icon("download")}</span><span class="row-label">Back up tasks<small>Last backup: ${esc(lastBackup)}</small></span>${icon("chev-right", "sm")}</button>
      <button class="row row-link" data-action="import"><span class="row-icon" style="--c:#15803D">${icon("upload")}</span><span class="row-label">Restore from backup</span>${icon("chev-right", "sm")}</button>
      <button class="row row-link" data-action="erase"><span class="row-icon" style="--c:#C62828">${icon("trash")}</span><span class="row-label" style="color:var(--danger)">Erase all tasks</span></button>
    </div>
    <p class="hint">Tasks live on this device only. Back up now and then — especially before switching phones.</p>
    <input type="file" id="import-file" accept="application/json,.json" hidden>
  </section>

  <section class="settings-section"><h2>Help</h2>
    <div class="form-group">
      ${isStandalone() ? "" : `<button class="row row-link" data-action="install-help"><span class="row-icon" style="--c:#E4572E">${icon("add-home")}</span><span class="row-label">Install on iPhone</span>${icon("chev-right", "sm")}</button>`}
      <a class="row row-link" href="help.html" style="color:inherit;text-decoration:none"><span class="row-icon" style="--c:#64748B">${icon("info")}</span><span class="row-label">Setup guide &amp; tips</span>${icon("chev-right", "sm")}</a>
      <button class="row row-link" data-action="quick-add-help"><span class="row-icon" style="--c:#8B5CF6">${icon("sparkle")}</span><span class="row-label">Quick-add cheat sheet</span>${icon("chev-right", "sm")}</button>
    </div>
  </section>
  <p class="about">Dayline 1.0 · Your tasks stay on this device.<br>Calendar data is fetched directly from Google and Microsoft.</p>`;
  const back = `<button class="back-btn" data-action="go-back">${icon("chev-left", "sm")}Back</button>`;
  return { top: `<div class="topbar-inner">${back}<div class="topbar-row"><div class="topbar-titles"><h1 class="title">Settings</h1></div></div></div>`, body: html, noFab: true };
}

// ../dayline/js/ui/schedule.js
var HOUR_H = 56;
function scheduleDate() {
  return ui.scheduleDate || todayKey();
}
function eventMinutes(ev, key) {
  const dayStart = fromKey(key);
  const dayEnd = fromKey(addDays(key, 1));
  const s = new Date(ev.start);
  const e = new Date(ev.end);
  const start2 = s < dayStart ? 0 : minutesOfDay(s);
  const end = e >= dayEnd ? 24 * 60 : minutesOfDay(e);
  return [start2, Math.max(end, start2 + 5)];
}
function busyIntervals(key, excludeTaskId = null) {
  const out = [];
  for (const ev of eventsForDay(key)) {
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
  if (key === today) from = Math.max(from, roundUpMinutes(minutesOfDay(/* @__PURE__ */ new Date()) + 5, 15));
  return { from, to };
}
function suggestSlots(key, duration, excludeTaskId, max = 4) {
  const today = todayKey();
  if (key < today) return [];
  let win = planWindow(key);
  let slots = freeSlots(key, win, excludeTaskId).filter((f) => f.end - f.start >= duration);
  if (!slots.length) {
    win = { from: key === today ? roundUpMinutes(minutesOfDay(/* @__PURE__ */ new Date()) + 5, 15) : 7 * 60, to: 22 * 60 };
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
function unplannedFor(key) {
  const today = todayKey();
  let list = tasksDueOn(store.tasks, key).filter((t) => !t.time);
  if (key === today) list = [...overdueTasks(store.tasks, today).filter((t) => !t.time), ...list];
  return list;
}
function autoPlan(key) {
  const today = todayKey();
  if (key < today) return { planned: 0, skipped: 0, reason: "past" };
  const st = store.settings;
  const candidates = unplannedFor(key).sort((a, b) => b.priority - a.priority || (a.date || "").localeCompare(b.date || "") || a.order - b.order);
  if (!candidates.length) return { planned: 0, skipped: 0, reason: "none" };
  const slots = freeSlots(key, planWindow(key));
  const plan = /* @__PURE__ */ new Map();
  let skipped = 0;
  for (const t of candidates) {
    const need = t.duration || st.defaultDuration;
    const slot = slots.find((s) => s.end - roundUpMinutes(s.start, 5) >= need);
    if (!slot) {
      skipped++;
      continue;
    }
    const start2 = roundUpMinutes(slot.start, 5);
    plan.set(t.id, { time: toHHMM(start2), duration: need });
    slot.start = start2 + need;
  }
  if (!plan.size) return { planned: 0, skipped, reason: "full" };
  store.bulkUpdate([...plan.keys()], (t) => ({ date: key, time: plan.get(t.id).time, duration: t.duration || plan.get(t.id).duration }), "Auto-plan");
  return { planned: plan.size, skipped, reason: "ok", ids: [...plan.keys()] };
}
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
    const has = tasksDueOn(store.tasks, d).length > 0 || eventsForDay(d).length > 0;
    days.push(`<button class="ws-day${d === today ? " is-today" : ""}${d === key ? " is-selected" : ""}${has ? " has-items" : ""}" data-action="pick-day" data-date="${d}" aria-label="${esc(fmtLong(d))}"${d === key ? ' aria-current="date"' : ""}><span class="ws-wd">${WEEKDAY_SHORT[fromKey(d).getDay()].slice(0, 1)}</span><span class="ws-num">${fromKey(d).getDate()}</span><span class="ws-dot"></span></button>`);
  }
  return `<div class="weekstrip" data-swipe="week"><button class="ws-nav" data-action="week-shift" data-delta="-7" aria-label="Previous week">${icon("chev-left", "sm")}</button><div class="ws-days">${days.join("")}</div><button class="ws-nav" data-action="week-shift" data-delta="7" aria-label="Next week">${icon("chev-right", "sm")}</button></div>`;
}
function syncPills() {
  const out = [];
  for (const p of PROVIDER_IDS) {
    const s = getStatus(p);
    if (!s.connected) continue;
    const name = p === "google" ? "Google" : "Outlook";
    if (s.needsAuth) continue;
    if (s.expired) out.push(`<button class="sync-pill expired" data-action="cal-connect" data-provider="${p}" aria-label="Refresh ${name} sign-in">${icon("sync")}${name} · refresh</button>`);
    else if (s.syncing) out.push(`<span class="sync-pill spinning">${icon("sync")}${name}</span>`);
    else if (s.error) out.push(`<button class="sync-pill warn" data-action="go" data-view="settings">${icon("alert")}${name}</button>`);
    else out.push(`<button class="sync-pill" data-action="cal-sync" aria-label="Sync ${name} now">${icon("sync")}${name}</button>`);
  }
  if (!out.length && !anyConnected()) out.push(`<button class="sync-pill" data-action="go" data-view="settings">${icon("link")}Connect a calendar</button>`);
  return out.join("");
}
function renderSchedule() {
  const today = todayKey();
  const key = scheduleDate();
  const st = store.settings;
  const H = HOUR_H;
  const events = eventsForDay(key);
  const allDay = events.filter((e) => e.allDay);
  const timed = events.filter((e) => !e.allDay);
  const dayTasks = store.tasks.filter((t) => t.date === key && t.time);
  const unplanned = unplannedFor(key);
  const items = [];
  for (const ev of timed) {
    const [s, e] = eventMinutes(ev, key);
    items.push({ kind: "event", start: s, end: e, ev });
  }
  for (const t of dayTasks) {
    const s = parseHHMM(t.time);
    items.push({ kind: "task", start: s, end: s + (t.duration || st.defaultDuration), t });
  }
  layout(items);
  const blocks = items.map((it) => {
    const top2 = it.start / 60 * H;
    const height = Math.max((it.end - it.start) / 60 * H - 2, 22);
    const short = height < 40;
    const gap = 3;
    const style = `top:${top2}px;height:${height}px;left:calc(${it.col / it.ncols * 100}% + ${gap}px);width:calc(${100 / it.ncols}% - ${gap * 2}px)`;
    if (it.kind === "event") {
      const ev = it.ev;
      const range2 = `${fmtTime(it.start)} – ${fmtTime(it.end % (24 * 60))}`;
      const sub2 = short && it.ncols > 1 ? "" : `<span class="blk-sub">${esc(range2)}${!short && ev.location ? ` · ${esc(ev.location)}` : ""}</span>`;
      return `<button class="blk blk-event${short ? " is-short" : ""}${ev.busy ? "" : " is-free"}" style="${style};--c:${safeColor(ev.color)}" data-action="open-event" data-key="${esc(ev.key)}"><span class="blk-title">${esc(ev.title)}</span>${sub2}</button>`;
    }
    const t = it.t;
    const range = `${fmtTime(it.start)} – ${fmtTime(it.end % (24 * 60))}`;
    const tsub = short && it.ncols > 1 ? "" : `<span class="blk-sub" style="display:block">${esc(range)}</span>`;
    return `<div class="blk blk-task pri-${t.priority}${t.done ? " is-done" : ""}${short ? " is-short" : ""}" style="${style}" data-id="${esc(t.id)}" data-start="${it.start}" data-dur="${it.end - it.start}"><button class="check" data-action="toggle" data-id="${esc(t.id)}" role="checkbox" aria-checked="${t.done}" aria-label="Complete: ${esc(t.title)}">${icon("check")}</button><button class="blk-text" data-action="edit" data-id="${esc(t.id)}"><span class="blk-title" style="display:block">${esc(t.title)}</span>${tsub}</button></div>`;
  }).join("");
  const hours = [];
  const nowMin = key === today ? minutesOfDay(/* @__PURE__ */ new Date()) : -999;
  for (let h = 1; h < 24; h++) {
    if (Math.abs(h * 60 - nowMin) < 14) continue;
    hours.push(`<div class="tl-hour" style="top:${h * H}px">${fmtHourLabel(h)}</div>`);
  }
  const ws = parseHHMM(st.workStart) ?? 540;
  const we = parseHHMM(st.workEnd) ?? 1020;
  const work = we > ws ? `<div class="tl-work" style="top:${ws / 60 * H}px;height:${(we - ws) / 60 * H}px"></div>` : "";
  let now = "";
  if (key === today) {
    const nm = minutesOfDay(/* @__PURE__ */ new Date());
    now = `<div class="tl-now" style="top:${nm / 60 * H}px"><span class="tl-now-label">${fmtTime(nm, { compact: true })}</span></div>`;
  }
  let body = authBanners();
  body += `<div class="sched-bar">${syncPills()}<span class="spacer"></span></div>`;
  if (allDay.length) body += `<div class="allday">${allDay.map((ev) => `<button class="ev-chip" style="--c:${safeColor(ev.color)}" data-action="open-event" data-key="${esc(ev.key)}"><i class="dot"></i><span class="ev-n">${esc(ev.title)}</span></button>`).join("")}</div>`;
  if (unplanned.length) {
    const canPlan = key >= today;
    const showAll = !!ui.expanded[`tray:${key}`];
    const visible = showAll ? unplanned : unplanned.slice(0, 3);
    const more = unplanned.length - visible.length;
    body += `<div class="tray"><div class="tray-head"><h2>To plan <span class="count">${unplanned.length}</span></h2>${canPlan ? `<button class="btn accent sm" data-action="auto-plan" data-date="${key}">${icon("sparkle", "sm")} Auto-plan</button>` : ""}</div><ul>${visible.map(
      (t) => `<li class="tray-item pri-${t.priority}"><button class="check" data-action="toggle" data-id="${esc(t.id)}" role="checkbox" aria-checked="false" aria-label="Complete: ${esc(t.title)}">${icon("check")}</button><button class="tray-title" data-action="edit" data-id="${esc(t.id)}">${esc(t.title)}<small>${t.date < key ? "overdue" : fmtDuration(t.duration || st.defaultDuration)}</small></button>${canPlan ? `<button class="pill-btn" data-action="plan-task" data-id="${esc(t.id)}" data-date="${key}">Plan</button>` : ""}</li>`
    ).join("")}</ul>${more > 0 ? `<button class="tray-more" data-action="toggle-expand" data-key="tray:${key}">Show ${more} more</button>` : ""}</div>`;
  }
  body += `<div class="timeline" style="--hh:${H}px"><div class="tl-hours" style="height:${24 * H}px">${hours.join("")}</div><div class="tl-grid" style="height:${24 * H}px" data-action="timeline-tap" data-date="${key}">${work}${blocks}${now}</div></div>`;
  const actions2 = key !== today ? `<button class="pill-btn accent" data-action="pick-day" data-date="${today}">Today</button>` : "";
  const diff = diffDays(today, key);
  const sub = diff === 0 ? `Today · ${fmtLong(key)}` : diff === 1 ? `Tomorrow · ${fmtLong(key)}` : diff === -1 ? `Yesterday · ${fmtLong(key)}` : fmtLong(key);
  const top = `<div class="topbar-inner"><div class="topbar-row"><div class="topbar-titles"><h1 class="title">Schedule</h1><div class="subtitle">${esc(sub)}</div></div><div class="topbar-actions">${actions2}<button class="icon-btn" data-action="search" aria-label="Search">${icon("search")}</button><button class="icon-btn" data-action="go" data-view="settings" aria-label="Settings">${icon("settings")}</button></div></div>${weekStrip(key)}</div>`;
  return { top, body, fabDefaults: { date: key } };
}
function scrollTimelineIntoView() {
  const grid = document.querySelector(".tl-grid");
  if (!grid) return;
  if (document.querySelector(".tray")) {
    window.scrollTo(0, 0);
    return;
  }
  const key = scheduleDate();
  const st = store.settings;
  let focusMin = (parseHHMM(st.workStart) ?? 540) - 30;
  if (key === todayKey()) focusMin = Math.max(0, minutesOfDay(/* @__PURE__ */ new Date()) - 90);
  const firstBlock = [...grid.querySelectorAll(".blk")].map((b) => parseFloat(b.style.top)).sort((a, b) => a - b)[0];
  let y = focusMin / 60 * HOUR_H;
  if (firstBlock !== void 0 && key !== todayKey()) y = Math.min(y, firstBlock - 20);
  const topbar2 = document.getElementById("topbar");
  const offset = grid.getBoundingClientRect().top + window.scrollY - (topbar2 ? topbar2.offsetHeight : 0) - 8;
  window.scrollTo({ top: Math.max(0, offset + y), behavior: "instant" in window ? "instant" : "auto" });
}
function minutesFromPointer(grid, clientY) {
  const rect = grid.getBoundingClientRect();
  const y = clientY - rect.top;
  return Math.max(0, Math.min(24 * 60 - 15, Math.floor(y / HOUR_H * 60 / 15) * 15));
}
function attachTimelineDrag() {
  const grid = document.querySelector(".tl-grid");
  if (!grid || grid.dataset.dragReady) return;
  grid.dataset.dragReady = "1";
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
      timer: null
    };
  };
  const activate = () => {
    if (!drag) return;
    drag.active = true;
    drag.blk.classList.add("dragging");
    drag.label = document.createElement("span");
    drag.label.className = "drag-time";
    drag.label.textContent = fmtTime(drag.startMin);
    drag.blk.appendChild(drag.label);
    haptic();
  };
  const move = (clientY) => {
    const rect = grid.getBoundingClientRect();
    const y = clientY - rect.top - drag.grabOffset;
    let m = Math.round(y / HOUR_H * 60 / 15) * 15;
    m = Math.max(0, Math.min(24 * 60 - Math.min(drag.dur, 60), m));
    drag.minutes = m;
    drag.blk.style.top = `${m / 60 * HOUR_H}px`;
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
    d.blk.classList.remove("dragging");
    if (d.label) d.label.remove();
    if (commit && d.minutes !== d.startMin) {
      store.updateTask(d.id, { time: toHHMM(d.minutes) }, { undoLabel: "Moved" });
      toast(`Moved to ${fmtTime(d.minutes)}`, { action: () => store.undo() });
    } else {
      d.blk.style.top = `${d.startMin / 60 * HOUR_H}px`;
    }
  };
  grid.addEventListener(
    "touchstart",
    (e) => {
      const blk = e.target.closest(".blk-task");
      if (!blk || e.touches.length > 1 || e.target.closest(".check")) return;
      begin(blk, e.touches[0].clientX, e.touches[0].clientY);
      drag.timer = setTimeout(activate, 380);
    },
    { passive: true }
  );
  grid.addEventListener(
    "touchmove",
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
  grid.addEventListener("touchend", (e) => {
    if (drag && drag.active) e.preventDefault();
    finish(true);
  });
  grid.addEventListener("touchcancel", () => finish(false));
  grid.addEventListener("contextmenu", (e) => {
    if (e.target.closest(".blk-task")) e.preventDefault();
  });
  grid.addEventListener("mousedown", (e) => {
    const blk = e.target.closest(".blk-task");
    if (!blk || e.button !== 0 || e.target.closest(".check")) return;
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
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      finish(true);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  });
}
function updateNowLine() {
  const line = document.querySelector(".tl-now");
  if (!line) return;
  const nm = minutesOfDay(/* @__PURE__ */ new Date());
  line.style.top = `${nm / 60 * HOUR_H}px`;
  const label3 = line.querySelector(".tl-now-label");
  if (label3) label3.textContent = fmtTime(nm, { compact: true });
}
function scrollToTaskBlock(ids) {
  const blocks = [...document.querySelectorAll(".blk-task")].filter((b) => ids.includes(b.dataset.id));
  if (!blocks.length) return;
  blocks.sort((a, b) => parseFloat(a.style.top) - parseFloat(b.style.top));
  const topbar2 = document.getElementById("topbar");
  const y = blocks[0].getBoundingClientRect().top + window.scrollY - (topbar2 ? topbar2.offsetHeight : 0) - 70;
  window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
}

// ../dayline/js/parse.js
var WD = "sun(?:day)?|mon(?:day)?|tue(?:s(?:day)?)?|wed(?:s|nesday)?|thu(?:r(?:s(?:day)?)?)?|fri(?:day)?|sat(?:urday)?";
var MONTH = "jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?";
var SEP = "(?:\\s*,\\s*(?:and\\s+)?|\\s+and\\s+|\\s*&\\s*|\\s*\\/\\s*|\\s+)";
var AMPM = "(am|pm|a\\.m\\.|p\\.m\\.)";
var NUMWORDS = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
var PART_OF_DAY = { morning: "09:00", afternoon: "14:00", evening: "18:00", night: "20:00", tonight: "20:00" };
var WD_INDEX = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
var MONTH_INDEX = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
var wdIndex = (s) => WD_INDEX[s.slice(0, 3).toLowerCase()];
var monthIndex = (s) => MONTH_INDEX[s.slice(0, 3).toLowerCase()];
function rx(body) {
  return new RegExp(`(^|[^\\p{L}\\p{N}_])(${body})(?![\\p{L}\\p{N}_])`, "giu");
}
function normWord(s) {
  return s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
}
function to24(h, suffix) {
  const pm = /^p/i.test(suffix);
  return h % 12 + (pm ? 12 : 0);
}
function guessHour(h, hadLeadingZero) {
  if (hadLeadingZero || h === 0 || h >= 13) return h;
  if (h >= 1 && h <= 6) return h + 12;
  return h;
}
function nextWeekday(fromKeyStr, wd, includeToday = true) {
  let k = includeToday ? fromKeyStr : addDays(fromKeyStr, 1);
  for (let i = 0; i < 7; i++) {
    if (weekday(k) === wd) return k;
    k = addDays(k, 1);
  }
  return k;
}
function mondayAfter(today) {
  return nextWeekday(today, 1, false);
}
function inferYear(month, day, today) {
  const y = fromKey(today).getFullYear();
  if (day > daysInMonth(y, month)) return null;
  let key = toKey(new Date(y, month, day));
  if (diffDays(key, today) > 30) {
    const y2 = y + 1;
    if (day > daysInMonth(y2, month)) return null;
    key = toKey(new Date(y2, month, day));
  }
  return key;
}
function validDate(y, m0, d) {
  if (m0 < 0 || m0 > 11 || d < 1 || d > daysInMonth(y, m0)) return null;
  return toKey(new Date(y, m0, d));
}
var Scan = class {
  constructor(text, ignore) {
    this.text = text;
    this.used = new Array(text.length).fill(false);
    this.ignore = ignore;
    this.chips = [];
  }
  working() {
    let s = "";
    for (let i = 0; i < this.text.length; i++) s += this.used[i] ? "\0" : this.text[i];
    return s;
  }
  isIgnored(raw) {
    const r = raw.trim().toLowerCase();
    if (this.ignore.has(r)) return true;
    for (const ig of this.ignore) {
      if (ig.length >= 3 && (r.includes(ig) || ig.includes(r))) return true;
    }
    return false;
  }
  // Try `body` and call handler(groups, raw) for each candidate until it returns a truthy value.
  first(body, handler) {
    const re = rx(body);
    const w = this.working();
    let m;
    while ((m = re.exec(w)) !== null) {
      const start2 = m.index + m[1].length;
      const end = start2 + m[2].length;
      const raw = this.text.slice(start2, end);
      if (!this.isIgnored(raw)) {
        const ok = handler(m.slice(3), raw);
        if (ok) {
          for (let i = start2; i < end; i++) this.used[i] = true;
          return raw;
        }
      }
      re.lastIndex = start2 + 1;
    }
    return null;
  }
  chip(kind, label3, raw) {
    this.chips.push({ kind, label: label3, raw });
  }
  remainder() {
    let s = "";
    for (let i = 0; i < this.text.length; i++) s += this.used[i] ? " " : this.text[i];
    return s;
  }
};
var DANGLING = /(?:^|\s)(?:at|on|by|for|from|due|in|the|every|each|and|,|-|–|@)\s*$/i;
var LEADING = /^\s*(?:on|at|by|and|,|-|–)\s+/i;
function cleanTitle(s) {
  let t = s.replace(/\s+/g, " ").trim();
  let guard = 0;
  while (DANGLING.test(t) && guard++ < 5) t = t.replace(DANGLING, "").trim();
  guard = 0;
  while (LEADING.test(t) && guard++ < 3) t = t.replace(LEADING, "").trim();
  return t.replace(/\s+([,.;:!?])/g, "$1");
}
function parseQuickAdd(text, opts2 = {}) {
  const today = opts2.today || todayKey();
  const now = opts2.now || /* @__PURE__ */ new Date();
  const lists = opts2.lists || [];
  const ignore = new Set((opts2.ignore || []).map((s) => s.trim().toLowerCase()));
  const sc = new Scan(text || "", ignore);
  let date = null;
  let time = null;
  let duration = null;
  let recur = null;
  let priority = 0;
  let listId = null;
  const tags = [];
  let impliedTime = null;
  const setRecur = (r, raw) => {
    recur = r;
    sc.chip("recur", describeRule(r), raw);
    return true;
  };
  sc.first(`(?:every|each)\\s+(\\d{1,2})\\s+(day|week|month|year)s?`, (g, raw) => {
    const n = parseInt(g[0], 10);
    if (!n) return false;
    const freq = { day: "daily", week: "weekly", month: "monthly", year: "yearly" }[g[1].toLowerCase()];
    return setRecur({ freq, interval: n }, raw);
  }) || sc.first(`(?:every|each)\\s+other\\s+(day|week|month|year)`, (g, raw) => {
    const freq = { day: "daily", week: "weekly", month: "monthly", year: "yearly" }[g[0].toLowerCase()];
    return setRecur({ freq, interval: 2 }, raw);
  }) || sc.first(`(?:every|each)\\s+(?:weekday|workday|work\\s+day)s?`, (g, raw) => setRecur({ freq: "weekdays", interval: 1 }, raw)) || sc.first(`(?:every|each)\\s+((?:${WD})(?:${SEP}(?:${WD}))*)`, (g, raw) => {
    const names = g[0].match(new RegExp(WD, "gi")) || [];
    const days = [...new Set(names.map(wdIndex))];
    if (!days.length) return false;
    if (days.length === 5 && [1, 2, 3, 4, 5].every((d) => days.includes(d))) return setRecur({ freq: "weekdays", interval: 1 }, raw);
    return setRecur({ freq: "weekly", interval: 1, byDays: days.sort((a, b) => a - b) }, raw);
  }) || sc.first(`(?:every|each)\\s+(morning|afternoon|evening|night)`, (g, raw) => {
    impliedTime = PART_OF_DAY[g[0].toLowerCase()];
    return setRecur({ freq: "daily", interval: 1 }, raw);
  }) || sc.first(`(?:every|each)\\s+(day|week|month|year)`, (g, raw) => {
    const freq = { day: "daily", week: "weekly", month: "monthly", year: "yearly" }[g[0].toLowerCase()];
    return setRecur({ freq, interval: 1 }, raw);
  }) || sc.first(`(daily|weekly|monthly|yearly|annually|biweekly|fortnightly)`, (g, raw) => {
    const w = g[0].toLowerCase();
    const map = { daily: ["daily", 1], weekly: ["weekly", 1], monthly: ["monthly", 1], yearly: ["yearly", 1], annually: ["yearly", 1], biweekly: ["weekly", 2], fortnightly: ["weekly", 2] };
    const [freq, interval] = map[w];
    return setRecur({ freq, interval }, raw);
  }) || sc.first(`(?:on\\s+)?weekdays`, (g, raw) => setRecur({ freq: "weekdays", interval: 1 }, raw));
  const setDate = (k, raw, label3) => {
    if (!k) return false;
    date = k;
    sc.chip("date", label3 || fmtDay(k, today), raw);
    return true;
  };
  const PRE = "(?:(?:on|by|due|before)\\s+)?";
  sc.first(`(this|today|tonight|tomorrow|tmrw|tmr|${WD})\\s+(morning|afternoon|evening|night)`, (g, raw) => {
    const w = g[0].toLowerCase();
    let k = null;
    if (w === "this" || w === "today" || w === "tonight") k = today;
    else if (w.startsWith("tom") || w.startsWith("tm")) k = addDays(today, 1);
    else k = nextWeekday(today, wdIndex(w));
    impliedTime = PART_OF_DAY[g[1].toLowerCase()];
    return setDate(k, raw);
  }) || // ISO 2026-09-30
  sc.first(`${PRE}(\\d{4})-(\\d{1,2})-(\\d{1,2})`, (g, raw) => setDate(validDate(+g[0], +g[1] - 1, +g[2]), raw)) || // Sep 30, September 30th 2026
  sc.first(`${PRE}(${MONTH})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(\\d{4}))?`, (g, raw) => {
    const m0 = monthIndex(g[0]);
    const d = +g[1];
    const k = g[2] ? validDate(+g[2], m0, d) : inferYear(m0, d, today);
    return setDate(k, raw);
  }) || // 30 Sep, 30th of September
  sc.first(`${PRE}(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?(${MONTH})\\.?(?:,?\\s+(\\d{4}))?`, (g, raw) => {
    const m0 = monthIndex(g[1]);
    const d = +g[0];
    const k = g[2] ? validDate(+g[2], m0, d) : inferYear(m0, d, today);
    return setDate(k, raw);
  }) || // 9/30 or 9/30/26
  sc.first(`${PRE}(\\d{1,2})\\/(\\d{1,2})(?:\\/(\\d{4}|\\d{2}))?`, (g, raw) => {
    const m0 = +g[0] - 1;
    const d = +g[1];
    let k;
    if (g[2]) {
      const y = g[2].length === 2 ? 2e3 + +g[2] : +g[2];
      k = validDate(y, m0, d);
    } else k = inferYear(m0, d, today);
    return setDate(k, raw);
  }) || sc.first(`${PRE}(?:the\\s+)?day\\s+after\\s+(?:tomorrow|tmrw|tmr)`, (g, raw) => setDate(addDays(today, 2), raw)) || sc.first(`${PRE}(today|tonight|tomorrow|tmrw|tmr)`, (g, raw) => {
    const w = g[0].toLowerCase();
    if (w === "tonight") impliedTime = PART_OF_DAY.tonight;
    return setDate(w === "today" || w === "tonight" ? today : addDays(today, 1), raw);
  }) || // in 2 hours / in 30 min  -> today (or tomorrow) at now+X
  sc.first(`in\\s+(\\d{1,3}|an?|one|two|three)\\s*(hours?|hrs?|h|minutes?|mins?|m)`, (g, raw) => {
    const n = NUMWORDS[g[0].toLowerCase()] || parseInt(g[0], 10);
    if (!n) return false;
    const mins = /^h/i.test(g[1]) ? n * 60 : n;
    if (mins > 24 * 60) return false;
    const t = new Date(now.getTime() + mins * 6e4);
    t.setMinutes(Math.ceil(t.getMinutes() / 5) * 5, 0, 0);
    time = toHHMM(t.getHours() * 60 + t.getMinutes());
    sc.chip("time", fmtTime(time), raw);
    return setDate(toKey(t), raw);
  }) || sc.first(`in\\s+(\\d{1,3}|an?|one|two|three|four|five|six|seven|eight|nine|ten)\\s+(day|week|month|year)s?`, (g, raw) => {
    const n = NUMWORDS[g[0].toLowerCase()] || parseInt(g[0], 10);
    const unit = g[1].toLowerCase();
    let k;
    if (unit === "day") k = addDays(today, n);
    else if (unit === "week") k = addDays(today, 7 * n);
    else if (unit === "month") k = addMonths(today, n);
    else k = addMonths(today, 12 * n);
    return setDate(k, raw);
  }) || sc.first(`next\\s+(week|month|year)`, (g, raw) => {
    const unit = g[0].toLowerCase();
    const d = fromKey(today);
    if (unit === "week") return setDate(mondayAfter(today), raw);
    if (unit === "month") return setDate(toKey(new Date(d.getFullYear(), d.getMonth() + 1, 1)), raw);
    return setDate(toKey(new Date(d.getFullYear() + 1, 0, 1)), raw);
  }) || sc.first(`${PRE}(?:this\\s+|the\\s+)?weekend`, (g, raw) => {
    const wd = weekday(today);
    return setDate(wd === 0 || wd === 6 ? today : nextWeekday(today, 6), raw);
  }) || sc.first(`${PRE}(?:(?:the\\s+)?end\\s+of\\s+(?:the\\s+)?week|eow)`, (g, raw) => {
    const wd = weekday(today);
    return setDate(wd === 6 || wd === 0 ? nextWeekday(today, 5, false) : nextWeekday(today, 5), raw);
  }) || sc.first(`${PRE}(?:(?:the\\s+)?end\\s+of\\s+(?:the\\s+)?month|eom)`, (g, raw) => {
    const d = fromKey(today);
    return setDate(toKey(new Date(d.getFullYear(), d.getMonth() + 1, 0)), raw);
  }) || sc.first(`(?:(on|this|next|by|due|before)\\s+)?(${WD})`, (g, raw) => {
    const pre = (g[0] || "").toLowerCase();
    const word = g[1].toLowerCase();
    if ((word === "sat" || word === "sun") && !pre) return false;
    const wd = wdIndex(word);
    if (pre === "next") {
      const mon = mondayAfter(today);
      return setDate(addDays(mon, (wd + 6) % 7), raw);
    }
    return setDate(nextWeekday(today, wd), raw);
  });
  const setTime = (min, raw, dur) => {
    if (min === null || min < 0 || min >= 24 * 60) return false;
    time = toHHMM(min);
    sc.chip("time", fmtTime(time), raw);
    if (dur) {
      duration = dur;
      sc.chip("duration", fmtDuration(dur), raw);
    }
    return true;
  };
  const AT = "(?:(?:at|@|by)\\s*)?";
  if (!time) {
    sc.first(`(from\\s+)?(\\d{1,2})(?::([0-5]\\d))?\\s*${AMPM}?\\s*(?:-|–|—|to|until|till|til)\\s*(\\d{1,2})(?::([0-5]\\d))?\\s*${AMPM}?`, (g, raw) => {
      const [from, sh, sm, sx, eh, em, ex] = g;
      if (!(sx || ex || sm || em || from)) return false;
      const shN = +sh;
      const ehN = +eh;
      if (shN > 23 || ehN > 23) return false;
      if (sx && (shN < 1 || shN > 12) || ex && (ehN < 1 || ehN > 12)) return false;
      let end;
      let start2;
      if (ex) end = to24(ehN, ex);
      else if (sx) end = to24(ehN, sx);
      else end = guessHour(ehN, eh.length === 2 && eh[0] === "0");
      end = end * 60 + (+em || 0);
      if (sx) start2 = to24(shN, sx) * 60 + (+sm || 0);
      else if (ex) {
        start2 = to24(shN, ex) * 60 + (+sm || 0);
        if (start2 >= end) start2 = to24(shN, /^p/i.test(ex) ? "am" : "pm") * 60 + (+sm || 0);
      } else start2 = guessHour(shN, sh.length === 2 && sh[0] === "0") * 60 + (+sm || 0);
      if (!ex && sx && end <= start2) end = to24(ehN, /^p/i.test(sx) ? "am" : "pm") * 60 + (+em || 0);
      if (!ex && !sx && end <= start2 && ehN <= 12) end += 12 * 60;
      const dur = end - start2;
      if (dur <= 0 || dur > 16 * 60) return false;
      return setTime(start2, raw, dur);
    }) || // 3pm, 3:30 pm, at 10am
    sc.first(`${AT}(\\d{1,2})(?::([0-5]\\d))?\\s*${AMPM}`, (g, raw) => {
      const h = +g[0];
      if (h < 1 || h > 12) return false;
      return setTime(to24(h, g[2]) * 60 + (+g[1] || 0), raw);
    }) || // compact 3p / 10a
    sc.first(`${AT}(\\d{1,2})(?::([0-5]\\d))?(a|p)`, (g, raw) => {
      const h = +g[0];
      if (h < 1 || h > 12) return false;
      return setTime(to24(h, g[2]) * 60 + (+g[1] || 0), raw);
    }) || // 15:00, at 5:30
    sc.first(`${AT}([01]?\\d|2[0-3]):([0-5]\\d)`, (g, raw) => {
      const lead = g[0].length === 2 && g[0][0] === "0";
      return setTime(guessHour(+g[0], lead) * 60 + +g[1], raw);
    }) || // at 3 / @ 7
    sc.first(`(?:at|@)\\s*(\\d{1,2})(?![\\d:.\\/])`, (g, raw) => {
      const h = +g[0];
      if (h < 1 || h > 23) return false;
      return setTime(guessHour(h, g[0].length === 2 && g[0][0] === "0") * 60, raw);
    }) || sc.first(`(?:at\\s+)?(?:noon|midday)`, (g, raw) => setTime(12 * 60, raw)) || sc.first(`in\\s+the\\s+(morning|afternoon|evening)`, (g, raw) => {
      const t = PART_OF_DAY[g[0].toLowerCase()];
      return setTime(parseInt(t, 10) * 60, raw);
    });
  }
  const setDur = (min, raw) => {
    if (!min || min < 5 || min > 16 * 60) return false;
    duration = Math.round(min);
    sc.chip("duration", fmtDuration(duration), raw);
    return true;
  };
  if (!duration) {
    sc.first(`for\\s+(\\d+(?:\\.\\d+)?)\\s*(?:h|hrs?|hours?)(?:\\s*(?:and\\s*)?(\\d{1,2})\\s*(?:m|mins?|minutes?))?`, (g, raw) => setDur(parseFloat(g[0]) * 60 + (+g[1] || 0), raw)) || sc.first(`for\\s+(\\d{1,3})\\s*(?:m|mins?|minutes?)`, (g, raw) => setDur(+g[0], raw)) || sc.first(`for\\s+(?:an?|one)\\s+hour`, (g, raw) => setDur(60, raw)) || sc.first(`for\\s+(?:half\\s+an\\s+hour|a\\s+half\\s+hour)`, (g, raw) => setDur(30, raw)) || sc.first(`(\\d+(?:\\.\\d+)?)(?:h|hr|hrs)(?:\\s*(\\d{1,2})(?:m|min|mins))?`, (g, raw) => setDur(parseFloat(g[0]) * 60 + (+g[1] || 0), raw)) || sc.first(`(\\d{1,3})(?:m|min|mins)`, (g, raw) => setDur(+g[0], raw));
  }
  const setPri = (p, raw) => {
    priority = p;
    sc.chip("priority", ["", "Low", "Medium", "High"][p] + " priority", raw);
    return true;
  };
  const priRe = /(^|\s)(!!!|!!|!(?:high|hi|h|1|medium|med|m|2|low|lo|l|3)?)(?=\s|$)/gi;
  {
    const w = sc.working();
    let m;
    while ((m = priRe.exec(w)) !== null) {
      const start2 = m.index + m[1].length;
      const raw = text.slice(start2, start2 + m[2].length);
      if (sc.isIgnored(raw)) continue;
      const t = m[2].toLowerCase();
      let p = 1;
      if (t === "!!!" || /^!(high|hi|h|1)$/.test(t)) p = 3;
      else if (t === "!!" || /^!(medium|med|m|2)$/.test(t)) p = 2;
      for (let i = start2; i < start2 + m[2].length; i++) sc.used[i] = true;
      setPri(p, raw);
      break;
    }
  }
  {
    const tagRe = /(^|\s)#([\p{L}\p{N}][\p{L}\p{N}_-]*)/gu;
    const w = sc.working();
    let m;
    while ((m = tagRe.exec(w)) !== null) {
      const start2 = m.index + m[1].length;
      const raw = text.slice(start2, start2 + m[2].length + 1);
      if (sc.isIgnored(raw)) continue;
      const word = m[2];
      if (/^\d+$/.test(word)) continue;
      const list = lists.find((l) => normWord(l.name) === normWord(word));
      if (list && !listId) {
        listId = list.id;
        sc.chip("list", list.name, raw);
      } else if (!list) {
        const tag = word.toLowerCase();
        if (!tags.includes(tag)) tags.push(tag);
        sc.chip("tag", "#" + tag, raw);
      } else continue;
      for (let i = start2; i < start2 + raw.length; i++) sc.used[i] = true;
    }
  }
  if (!time && impliedTime) {
    time = impliedTime;
    if (!sc.chips.some((c) => c.kind === "time")) {
      const src = sc.chips.find((c) => c.kind === "date" || c.kind === "recur");
      sc.chip("time", fmtTime(time), src ? src.raw : "");
    }
  }
  if (recur) {
    if (!date) {
      date = firstOccurrenceOnOrAfter(recur, today);
      if (date === today && time) {
        const [h, mm] = time.split(":").map(Number);
        if (h * 60 + mm < now.getHours() * 60 + now.getMinutes()) date = firstOccurrenceOnOrAfter(recur, addDays(today, 1));
      }
      const rc = sc.chips.find((c) => c.kind === "recur");
      sc.chip("date", fmtDay(date, today), rc ? rc.raw : "");
    }
    recur = { ...recur, anchor: date };
    if (recur.freq === "monthly" || recur.freq === "yearly") recur.anchorDay = fromKey(date).getDate();
  }
  if (time && !date) {
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const [h, mm] = time.split(":").map(Number);
    date = h * 60 + mm < nowMin - 1 ? addDays(today, 1) : today;
    const tc = sc.chips.find((c) => c.kind === "time");
    sc.chip("date", fmtDay(date, today), tc ? tc.raw : "");
  }
  let title = cleanTitle(sc.remainder());
  if (!title) title = (text || "").trim();
  const order = ["date", "time", "duration", "recur", "priority", "list", "tag"];
  const chips = sc.chips.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));
  return { title, date, time, duration, priority, listId, tags, recur, chips };
}

// ../dayline/js/ui/sheets.js
var PRI_COLOR = ["var(--muted)", "var(--p1)", "var(--p2)", "var(--p3)"];
var CHIP_ICON = { date: "cal", time: "clock", duration: "clock", recur: "repeat", priority: "flag", list: "lists", tag: "hash" };
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
function openQuickAdd(defaults2 = {}) {
  const today = todayKey();
  let ignore = [];
  let override = {};
  let lastAdded = null;
  const html = `<div class="sheet-handle" aria-hidden="true"></div>
  <div class="qa">
    <div class="qa-input-wrap"><textarea class="qa-input" rows="1" placeholder="Add a task…" enterkeyhint="done" autocapitalize="sentences" aria-label="New task"></textarea><button class="qa-send" data-e="send" disabled aria-label="Add task">${icon("arrow-up")}</button></div>
    <div class="qa-chips" aria-live="polite"></div>
    <div class="qa-tools">
      <button class="chip" data-e="date" data-v="${today}">Today</button>
      <button class="chip" data-e="date" data-v="${addDays(today, 1)}">Tomorrow</button>
      <button class="chip" data-e="date" data-v="${weekendKey(today)}">Weekend</button>
      <button class="chip" data-e="date" data-v="${nextWeekMonday(today)}">Next week</button>
      <span class="chip" style="position:relative">${icon("cal", "sm")}Date<input type="date" data-e="pick-date" aria-label="Pick a date" style="position:absolute;inset:0;opacity:0;width:100%"></span>
      <span class="chip" style="position:relative">${icon("clock", "sm")}Time<input type="time" data-e="pick-time" aria-label="Pick a time" style="position:absolute;inset:0;opacity:0;width:100%"></span>
      <button class="chip" data-e="more">${icon("dots", "sm")}More</button>
    </div>
    <div class="qa-hint">Type naturally: <b>tomorrow 3pm</b> · <b>fri 9-10am</b> · <b>every mon</b> · <b>for 45m</b> · <b>#work</b> · <b>!high</b></div>
    <div class="qa-added" hidden></div>
  </div>`;
  const sheet = openSheet({ id: "quick-add", html, className: "kb-aware", label: "Add task" });
  const el = sheet.el;
  const input = el.querySelector(".qa-input");
  const chipsEl = el.querySelector(".qa-chips");
  const sendBtn = el.querySelector(".qa-send");
  const addedEl = el.querySelector(".qa-added");
  const compute = () => {
    const p = parseQuickAdd(input.value, { today, lists: store.lists, ignore });
    const r = { ...p };
    if (!r.date && defaults2.date) r.date = defaults2.date;
    if (!r.time && defaults2.time && (!r.date || r.date === defaults2.date)) r.time = defaults2.time;
    if (!r.listId && defaults2.listId) r.listId = defaults2.listId;
    if (override.date !== void 0) r.date = override.date;
    if (override.time !== void 0) r.time = override.time;
    if (r.time && !r.date) r.date = today;
    return r;
  };
  const renderChips = () => {
    const r = compute();
    const chips = [];
    const parsedKinds = new Set(r.chips.map((c) => c.kind));
    if (r.date && (!parsedKinds.has("date") || override.date !== void 0)) chips.push({ kind: "date", label: fmtDay(r.date, today), removable: "date" });
    if (r.time && (!parsedKinds.has("time") || override.time !== void 0)) chips.push({ kind: "time", label: fmtTime(r.time), removable: "time" });
    if (r.listId && !parsedKinds.has("list")) chips.push({ kind: "list", label: store.getList(r.listId).name, removable: null });
    const all = [...r.chips.filter((c) => !(override[c.kind] !== void 0 && (c.kind === "date" || c.kind === "time"))).map((c) => ({ ...c, fromText: true })), ...chips];
    chipsEl.innerHTML = all.map((c) => {
      const style = c.kind === "priority" ? ` style="--pc:${PRI_COLOR[r.priority]}"` : "";
      const x = c.fromText ? `<button class="qa-x" data-e="ignore" data-raw="${esc(c.raw)}" aria-label="Keep “${esc(c.raw)}” as text">${icon("x")}</button>` : c.removable ? `<button class="qa-x" data-e="clear" data-k="${c.removable}" aria-label="Clear ${c.kind}">${icon("x")}</button>` : "";
      return `<span class="qa-chip kind-${c.kind}"${style}>${icon(CHIP_ICON[c.kind] || "tag")}${esc(c.label)}${x}</span>`;
    }).join("");
    sendBtn.disabled = !input.value.trim();
    for (const b of el.querySelectorAll('[data-e="date"]')) b.classList.toggle("is-on", r.date === b.dataset.v);
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
      listId: r.listId || "inbox",
      tags: r.tags || [],
      recur: r.recur || null,
      reminder: r.time && st.defaultReminder !== null ? st.defaultReminder : null
    };
    if (draft.recur && draft.date) draft.recur = { ...draft.recur, anchor: draft.date };
    if (openMore) {
      sheet.close("more");
      openEditSheet(null, { draft: text ? draft : { ...draft, title: "" } });
      return;
    }
    const task = store.addTask(draft);
    lastAdded = task;
    input.value = "";
    ignore = [];
    override = {};
    autosize(input);
    renderChips();
    addedEl.hidden = false;
    addedEl.innerHTML = `${icon("check", "sm")} Added “${esc(task.title)}”${task.date ? ` · ${esc(fmtDay(task.date, today))}${task.time ? ` ${esc(fmtTime(task.time))}` : ""}` : ""} <button class="link-btn" data-e="undo" style="margin-left:6px">Undo</button>`;
    input.focus();
  };
  input.addEventListener("input", () => {
    autosize(input);
    addedEl.hidden = true;
    renderChips();
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      submit();
    } else if (e.key === "Escape") sheet.close("escape");
  });
  el.addEventListener("click", (e) => {
    const b = e.target.closest("[data-e]");
    if (!b) return;
    const k = b.dataset.e;
    if (k === "send") submit();
    else if (k === "more") submit(true);
    else if (k === "date") {
      override.date = override.date === b.dataset.v ? void 0 : b.dataset.v;
      renderChips();
      input.focus();
    } else if (k === "ignore") {
      ignore.push(b.dataset.raw);
      renderChips();
      input.focus();
    } else if (k === "clear") {
      if (b.dataset.k === "date") {
        override.date = null;
        override.time = null;
      } else override[b.dataset.k] = null;
      renderChips();
    } else if (k === "undo" && lastAdded) {
      store.undo();
      addedEl.hidden = true;
      lastAdded = null;
    }
  });
  el.addEventListener("change", (e) => {
    const t = e.target;
    if (t.dataset.e === "pick-date") {
      override.date = t.value || null;
      renderChips();
    } else if (t.dataset.e === "pick-time") {
      override.time = t.value || null;
      renderChips();
    }
  });
  if (defaults2.text) input.value = defaults2.text;
  renderChips();
  autosize(input);
  input.focus();
  return sheet;
}
var RECUR_CHOICES = [
  ["none", "Never"],
  ["daily", "Every day"],
  ["weekdays", "Every weekday"],
  ["weekly", "Every week"],
  ["biweekly", "Every 2 weeks"],
  ["monthly", "Every month"],
  ["yearly", "Every year"]
];
function recurChoice(rule) {
  const r = normalizeRule(rule);
  if (!r) return "none";
  if (r.freq === "daily" && r.interval === 1) return "daily";
  if (r.freq === "weekdays") return "weekdays";
  if (r.freq === "weekly" && r.interval === 1) return "weekly";
  if (r.freq === "weekly" && r.interval === 2) return "biweekly";
  if (r.freq === "monthly" && r.interval === 1) return "monthly";
  if (r.freq === "yearly" && r.interval === 1) return "yearly";
  return "keep";
}
function ruleFromChoice(choice, date, byDays) {
  switch (choice) {
    case "daily":
      return { freq: "daily", interval: 1 };
    case "weekdays":
      return { freq: "weekdays", interval: 1 };
    case "weekly":
      return { freq: "weekly", interval: 1, byDays: byDays && byDays.length ? byDays : date ? [weekday(date)] : void 0, anchor: date || void 0 };
    case "biweekly":
      return { freq: "weekly", interval: 2, byDays: byDays && byDays.length ? byDays : date ? [weekday(date)] : void 0, anchor: date || void 0 };
    case "monthly":
      return { freq: "monthly", interval: 1, anchorDay: date ? fromKey(date).getDate() : void 0 };
    case "yearly":
      return { freq: "yearly", interval: 1, anchorDay: date ? fromKey(date).getDate() : void 0 };
    default:
      return null;
  }
}
function sameJSON(a, b) {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}
function openEditSheet(id3, { draft: seed } = {}) {
  const existing = id3 ? store.getTask(id3) : null;
  if (id3 && !existing) return null;
  const isNew = !existing;
  const base = existing || makeTask({ title: "", ...seed || {} });
  const draft = JSON.parse(JSON.stringify(base));
  if (isNew && seed && !seed.title) draft.title = "";
  let closedByDone = false;
  const html = `${sheetHead({ title: isNew ? "New task" : "Edit task", left: `<button class="text-btn muted" data-e="cancel">Cancel</button>`, right: `<button class="text-btn strong" data-e="done">${isNew ? "Add" : "Done"}</button>` })}<div class="sheet-body"></div>`;
  const sheet = openSheet({
    id: "edit",
    html,
    className: "tall",
    label: isNew ? "New task" : "Edit task",
    onClose: (reason) => {
      if (reason === "cancel" || reason === "replace" || closedByDone) return;
      commit();
    }
  });
  const el = sheet.el;
  const body = el.querySelector(".sheet-body");
  function commit() {
    draft.title = (draft.title || "").trim();
    if (isNew) {
      if (!draft.title) return null;
      const t = store.addTask(draft);
      return t;
    }
    const cur = store.getTask(id3);
    if (!cur) return null;
    if (!draft.title) draft.title = cur.title;
    const fields = ["title", "notes", "listId", "priority", "date", "time", "duration", "recur", "reminder", "tags", "subtasks"];
    const patch = {};
    for (const f of fields) if (!sameJSON(cur[f], draft[f])) patch[f] = draft[f];
    if (!Object.keys(patch).length) return cur;
    return store.updateTask(id3, patch, { undoLabel: "Edited" });
  }
  function recurRow() {
    const choice = recurChoice(draft.recur);
    const opts2 = RECUR_CHOICES.map(([v, l]) => `<option value="${v}"${v === choice ? " selected" : ""}>${l}</option>`).join("");
    const keep = choice === "keep" ? `<option value="keep" selected>${esc(describeRule(draft.recur))}</option>` : "";
    return `<div class="row"><span class="row-icon" style="--c:#15803D">${icon("repeat")}</span><span class="row-label">Repeat</span><select data-f="recur">${keep}${opts2}</select></div>`;
  }
  function dayPicker() {
    const r = normalizeRule(draft.recur);
    if (!r || r.freq !== "weekly") return "";
    const on = new Set(r.byDays || (draft.date ? [weekday(draft.date)] : []));
    const order = store.settings.weekStart === 1 ? [1, 2, 3, 4, 5, 6, 0] : [0, 1, 2, 3, 4, 5, 6];
    return `<div class="daypick" role="group" aria-label="Repeat on">${order.map((d) => `<button type="button" class="${on.has(d) ? "is-on" : ""}" data-e="day" data-d="${d}" aria-pressed="${on.has(d)}">${WEEKDAY_SHORT[d].slice(0, 2)}</button>`).join("")}</div>`;
  }
  function calSection() {
    const t = isNew ? null : store.getTask(id3);
    const link = t && t.cal;
    if (link) {
      const s = getStatus(link.provider);
      const calName = (s.calendars.find((c) => c.id === link.calendarId) || {}).name || PROVIDER_LABEL[link.provider];
      return `<div class="form-group"><div class="cal-status"><span class="row-icon" style="--c:var(--${link.provider})">${icon("cal-check")}</span><div class="cal-status-text">On ${esc(PROVIDER_LABEL[link.provider])}<small>${esc(calName)} · changes here update the event</small></div></div></div>
      <div class="cal-actions">${link.url ? `<a class="btn soft" href="${esc(link.url)}" target="_blank" rel="noopener">${icon("external", "sm")} Open event</a>` : ""}<button class="btn soft" data-e="cal-remove">${icon("x", "sm")} Remove</button></div>`;
    }
    if (!draft.date) return `<p class="hint" style="margin-top:0">Give this task a date to put it on a calendar.</p>`;
    const g = isConnected3("google");
    const o = isConnected3("outlook");
    return `<div class="cal-actions">
      <button class="btn soft" data-e="cal-add" data-p="google"><span class="prov-dot" style="--c:var(--google)"></span>Google${g ? "" : ` ${icon("external", "sm")}`}</button>
      <button class="btn soft" data-e="cal-add" data-p="outlook"><span class="prov-dot" style="--c:var(--outlook)"></span>Outlook${o ? "" : ` ${icon("external", "sm")}`}</button>
      <button class="btn soft wide" data-e="cal-ics">${icon("download", "sm")} .ics file (Apple Calendar &amp; others)</button>
    </div><p class="hint">${g || o ? "Connected calendars get the event directly and stay in sync." : "Opens your calendar with the event filled in. Connect a calendar in Settings to add and sync events directly."}${draft.reminder !== null ? " Your reminder is included." : ""}</p>`;
  }
  function render2() {
    const lists = store.lists.map((l) => `<option value="${esc(l.id)}"${l.id === draft.listId ? " selected" : ""}>${esc(l.name)}</option>`).join("");
    const listColor = safeColor(store.getList(draft.listId).color);
    const today = todayKey();
    const dateChips = [
      [today, "Today"],
      [addDays(today, 1), "Tomorrow"],
      [weekendKey(today), "Weekend"],
      [nextWeekMonday(today), "Next week"]
    ].map(([v, l]) => `<button type="button" class="chip${draft.date === v ? " is-on" : ""}" data-e="set-date" data-v="${v}">${l}</button>`).join("");
    const durOpts = `<option value=""${!draft.duration ? " selected" : ""}>Default (${fmtDuration(store.settings.defaultDuration)})</option>` + DURATION_OPTIONS.map(([v, l]) => `<option value="${v}"${String(draft.duration) === v ? " selected" : ""}>${l}</option>`).join("") + (draft.duration && !DURATION_OPTIONS.some(([v]) => v === String(draft.duration)) ? `<option value="${draft.duration}" selected>${fmtDuration(draft.duration)}</option>` : "");
    const remOpts = REMINDER_OPTIONS.map(([v, l]) => `<option value="${v}"${String(draft.reminder ?? "") === v ? " selected" : ""}>${l}</option>`).join("");
    const subDone = draft.subtasks.filter((s) => s.done).length;
    body.innerHTML = `
      <textarea class="field-title" data-f="title" rows="1" placeholder="What needs doing?" aria-label="Task title">${esc(draft.title)}</textarea>
      <div class="form-label">When</div>
      <div class="form-group">
        <div class="row"><span class="row-icon" style="--c:#E4572E">${icon("cal")}</span><span class="row-label">${draft.date ? esc(fmtDay(draft.date)) : "Date"}</span><input type="date" data-f="date" value="${draft.date || ""}" aria-label="Date" class="${draft.date ? "" : "is-empty"}">${draft.date ? `<button class="clear-btn" data-e="clear-date" aria-label="Remove date">${icon("x")}</button>` : ""}</div>
        <div class="row"><span class="row-icon" style="--c:#3B7BE8">${icon("clock")}</span><span class="row-label">Time</span><input type="time" data-f="time" value="${draft.time || ""}" aria-label="Time" class="${draft.time ? "" : "is-empty"}" ${draft.date ? "" : "disabled"}>${draft.time ? `<button class="clear-btn" data-e="clear-time" aria-label="Remove time">${icon("x")}</button>` : ""}</div>
        <div class="row"><span class="row-icon" style="--c:#8B5CF6">${icon("schedule")}</span><span class="row-label">Duration</span><select data-f="duration" aria-label="Duration">${durOpts}</select></div>
        ${recurRow()}
        <div class="row"><span class="row-icon" style="--c:#E59400">${icon("bell")}</span><span class="row-label">Reminder</span><select data-f="reminder" aria-label="Reminder">${remOpts}</select></div>
      </div>
      ${dayPicker()}
      <div class="chips">${dateChips}</div>
      ${draft.recur ? `<p class="hint">${esc(describeRule(draft.recur))}. Completing it schedules the next one.</p>` : ""}

      <div class="form-label">Priority</div>
      <div class="seg" role="radiogroup" aria-label="Priority">${PRI_LABEL.map((l, i) => `<button type="button" class="seg-btn${draft.priority === i ? " is-on" : ""}" data-e="pri" data-v="${i}" role="radio" aria-checked="${draft.priority === i}">${i ? `<i class="dot" style="--c:${PRI_COLOR[i]}"></i>` : ""}${l}</button>`).join("")}</div>

      <div class="form-label">Organize</div>
      <div class="form-group">
        <div class="row"><span class="row-icon" style="--c:${listColor}">${icon(draft.listId === "inbox" ? "inbox" : "lists")}</span><span class="row-label">List</span><select data-f="listId" aria-label="List">${lists}</select></div>
        <div class="row"><span class="row-icon" style="--c:#64748B">${icon("hash")}</span><input class="inline-input" style="flex:1" data-f="tags" value="${esc(draft.tags.join(", "))}" placeholder="Tags, separated by commas" autocapitalize="off" aria-label="Tags"></div>
      </div>

      <div class="form-label">Subtasks${draft.subtasks.length ? `<span>${subDone}/${draft.subtasks.length}</span>` : ""}</div>
      <div class="form-group">
        ${draft.subtasks.map(
      (s, i) => `<div class="subtask-row${s.done ? " is-done" : ""}"><button type="button" class="check" data-e="sub-toggle" data-i="${i}" role="checkbox" aria-checked="${s.done}" aria-label="Toggle subtask">${icon("check")}</button><input value="${esc(s.title)}" data-e="sub-title" data-i="${i}" aria-label="Subtask"><button type="button" class="icon-btn" data-e="sub-del" data-i="${i}" aria-label="Delete subtask">${icon("x", "sm")}</button></div>`
    ).join("")}
        <div class="subtask-row"><span class="check" aria-hidden="true" style="color:var(--muted)">${icon("plus", "sm")}</span><input data-e="sub-new" placeholder="Add a subtask" enterkeyhint="done" aria-label="New subtask"></div>
      </div>

      <div class="form-label">Notes</div>
      <textarea class="text-input" data-f="notes" placeholder="Links, details, context…" aria-label="Notes">${esc(draft.notes)}</textarea>

      <div class="form-label">Calendar</div>
      <div data-cal-section>${calSection()}</div>

      ${isNew ? "" : `<div class="sheet-actions"><button class="btn soft" data-e="duplicate">${icon("copy", "sm")} Duplicate</button><button class="btn danger" data-e="delete">${icon("trash", "sm")} Delete</button></div>`}
    `;
    autosize(body.querySelector(".field-title"));
  }
  render2();
  const titleEl = body.querySelector(".field-title");
  if (isNew) titleEl.focus();
  body.addEventListener("input", (e) => {
    const t = e.target;
    const f = t.dataset.f;
    if (f === "title") {
      draft.title = t.value.replace(/\n/g, " ");
      autosize(t);
    } else if (f === "notes") draft.notes = t.value;
    else if (f === "tags")
      draft.tags = t.value.split(",").map((s) => s.trim().replace(/^#/, "").toLowerCase()).filter(Boolean);
    else if (t.dataset.e === "sub-title") draft.subtasks[+t.dataset.i].title = t.value;
  });
  body.addEventListener("keydown", (e) => {
    const t = e.target;
    if (t.dataset.f === "title" && e.key === "Enter") {
      e.preventDefault();
      t.blur();
    }
    if (t.dataset.e === "sub-new" && e.key === "Enter") {
      e.preventDefault();
      const v = t.value.trim();
      t.value = "";
      if (!v) return;
      draft.subtasks.push({ id: uid(), title: v, done: false });
      render2();
      const again = body.querySelector('[data-e="sub-new"]');
      if (again) again.focus();
    }
  });
  body.addEventListener("change", (e) => {
    const t = e.target;
    const f = t.dataset.f;
    if (f === "date") {
      draft.date = t.value || null;
      if (!draft.date) draft.time = null;
      if (draft.recur && draft.date) {
        const r = normalizeRule(draft.recur);
        if (r.freq === "weekly" && r.byDays && r.byDays.length === 1) draft.recur = { ...r, byDays: [weekday(draft.date)], anchor: draft.date };
        if (r.freq === "monthly" || r.freq === "yearly") draft.recur = { ...r, anchorDay: fromKey(draft.date).getDate() };
      }
      render2();
    } else if (f === "time") {
      draft.time = t.value || null;
      if (draft.time && draft.reminder === null && store.settings.defaultReminder !== null && isNew) draft.reminder = store.settings.defaultReminder;
      render2();
    } else if (f === "duration") draft.duration = t.value ? +t.value : null;
    else if (f === "reminder") draft.reminder = t.value === "" ? null : +t.value;
    else if (f === "listId") {
      draft.listId = t.value;
      render2();
    } else if (f === "recur") {
      if (t.value === "keep") return;
      if (t.value !== "none" && !draft.date) draft.date = todayKey();
      draft.recur = ruleFromChoice(t.value, draft.date, null);
      if (draft.recur && draft.date) draft.date = firstOccurrenceOnOrAfter(draft.recur, draft.date);
      render2();
    } else if (t.dataset.e === "sub-new" && t.isConnected) {
      const v = t.value.trim();
      t.value = "";
      if (v) {
        draft.subtasks.push({ id: uid(), title: v, done: false });
        render2();
      }
    }
  });
  el.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-e]");
    if (!b) return;
    const k = b.dataset.e;
    if (k === "cancel") sheet.close("cancel");
    else if (k === "done") {
      commit();
      closedByDone = true;
      sheet.close("done");
    } else if (k === "clear-date") {
      draft.date = null;
      draft.time = null;
      draft.recur = null;
      render2();
    } else if (k === "clear-time") {
      draft.time = null;
      render2();
    } else if (k === "set-date") {
      draft.date = b.dataset.v;
      render2();
    } else if (k === "pri") {
      draft.priority = +b.dataset.v;
      render2();
    } else if (k === "day") {
      const r = normalizeRule(draft.recur);
      const set = new Set(r.byDays || (draft.date ? [weekday(draft.date)] : []));
      const d = +b.dataset.d;
      if (set.has(d)) set.delete(d);
      else set.add(d);
      if (!set.size) return;
      draft.recur = { ...r, byDays: [...set].sort((a, c) => a - c), anchor: draft.date || r.anchor };
      if (draft.date) draft.date = firstOccurrenceOnOrAfter(draft.recur, draft.date < todayKey() ? todayKey() : draft.date);
      render2();
    } else if (k === "sub-toggle") {
      const s = draft.subtasks[+b.dataset.i];
      s.done = !s.done;
      render2();
    } else if (k === "sub-del") {
      draft.subtasks.splice(+b.dataset.i, 1);
      render2();
    } else if (k === "delete") {
      closedByDone = true;
      sheet.close("delete");
      const t = store.deleteTask(id3);
      if (t) toast(`Deleted “${t.title}”`, { action: () => store.undo() });
    } else if (k === "duplicate") {
      commit();
      const src = store.getTask(id3);
      if (src) {
        const copy = store.addTask({ ...src, id: void 0, cal: null, done: false, doneAt: null, title: `${src.title}`, subtasks: src.subtasks.map((s) => ({ ...s, id: uid(), done: false })) }, { undoLabel: "Duplicated" });
        closedByDone = true;
        sheet.close("duplicate");
        toast("Duplicated", { action: () => store.undo() });
        openEditSheet(copy.id);
      }
    } else if (k === "cal-add" || k === "cal-ics") {
      const saved = commit();
      if (!saved) {
        toast("Add a title first");
        return;
      }
      if (isNew) {
        closedByDone = true;
        sheet.close("replace");
        const next = openEditSheet(saved.id);
        void next;
      }
      if (k === "cal-ics") {
        const { text, filename } = icsFor(saved);
        if (text) offerFile(text, filename, "text/calendar");
        return;
      }
      const p = b.dataset.p;
      if (!isConnected3(p)) {
        window.open(linkUrl(saved, p), "_blank", "noopener");
        return;
      }
      b.disabled = true;
      try {
        const res = await addToCalendar(saved, p);
        if (res.mode === "api") toast(`Added to ${PROVIDER_LABEL[p]}`);
        else if (res.mode === "queued") toast(`Will add to ${PROVIDER_LABEL[p]} after you sign in again`);
      } catch (err) {
        toast(`Couldn’t add to ${PROVIDER_LABEL[p]}: ${err.message || err}`);
      }
      refreshCal();
    } else if (k === "cal-remove") {
      const t = store.getTask(id3);
      if (t && t.cal) {
        const provider = t.cal.provider;
        await removeFromCalendar(t);
        toast(`Removed from ${PROVIDER_LABEL[provider]}`);
        refreshCal();
      }
    }
  });
  function refreshCal() {
    const sec = document.querySelector('.sheet-wrap[data-sheet="edit"]:last-of-type [data-cal-section]');
    if (sec) sec.innerHTML = calSection();
  }
  const unsub = onChange((reason) => {
    if (!document.contains(el)) {
      unsub();
      return;
    }
    if (reason === "events" || reason === "status") {
      const sec = el.querySelector("[data-cal-section]");
      if (sec) sec.innerHTML = calSection();
    }
  });
  return sheet;
}
function openEventSheet(evKey) {
  const key = scheduleDate();
  let ev = null;
  for (let i = -1; i <= 1 && !ev; i++) ev = eventsForDay(addDays(key, i)).find((e) => e.key === evKey);
  if (!ev) for (let i = 0; i < 15 && !ev; i++) ev = eventsForDay(addDays(todayKey(), i)).find((e) => e.key === evKey);
  if (!ev) return;
  let when;
  if (ev.allDay) {
    const last = addDays(ev.end, -1);
    when = last === ev.start ? `${fmtLong(ev.start)} · All day` : `${fmtLong(ev.start)} – ${fmtLong(last)}`;
  } else {
    const s = new Date(ev.start);
    const e = new Date(ev.end);
    const sk = `${s.getFullYear()}-${String(s.getMonth() + 1).padStart(2, "0")}-${String(s.getDate()).padStart(2, "0")}`;
    when = `${fmtLong(sk)} · ${fmtTime(minutesOfDay(s))} – ${fmtTime(minutesOfDay(e))}`;
  }
  const provName = PROVIDER_LABEL[ev.provider];
  const body = `<div class="ev-detail"><div class="ev-title"><span class="prov-dot" style="--c:${safeColor(ev.color)}"></span><span>${esc(ev.title)}</span></div><div class="ev-when">${esc(when)}</div>
    <div class="ev-meta">
      <div>${icon("cal", "sm")}<span>${esc(ev.calendarName || provName)} · ${esc(provName)}</span></div>
      ${ev.location ? `<div>${icon("pin", "sm")}<span>${esc(ev.location)}</span></div>` : ""}
      ${ev.busy ? "" : `<div>${icon("info", "sm")}<span>Shown as free</span></div>`}
    </div>
    <div class="cal-actions" style="margin-top:18px">
      ${ev.joinUrl ? `<a class="btn wide" href="${esc(ev.joinUrl)}" target="_blank" rel="noopener">${icon("video", "sm")} Join meeting</a>` : ""}
      ${ev.url ? `<a class="btn soft" href="${esc(ev.url)}" target="_blank" rel="noopener">${icon("external", "sm")} Open</a>` : ""}
      <button class="btn soft" data-e="prep">${icon("plus", "sm")} Prep task</button>
    </div></div>`;
  const sheet = openSheet({ id: "event", html: `${sheetHead({ title: "Event", right: `<button class="text-btn strong" data-e="close">Done</button>` })}<div class="sheet-body">${body}</div>`, label: "Event details" });
  sheet.el.addEventListener("click", (e) => {
    const b = e.target.closest("[data-e]");
    if (!b) return;
    if (b.dataset.e === "close") sheet.close("done");
    if (b.dataset.e === "prep") {
      sheet.close("replace");
      const date = ev.allDay ? ev.start : `${new Date(ev.start).getFullYear()}-${String(new Date(ev.start).getMonth() + 1).padStart(2, "0")}-${String(new Date(ev.start).getDate()).padStart(2, "0")}`;
      openQuickAdd({ text: `Prep for ${ev.title} `, date });
    }
  });
}
function openPlanSheet(taskId, dateKey) {
  const t = store.getTask(taskId);
  if (!t) return;
  const key = dateKey || t.date || todayKey();
  let duration = t.duration || store.settings.defaultDuration;
  const render2 = () => {
    const slots = suggestSlots(key, duration, t.id);
    return `<p class="hint" style="margin:0 2px 10px">Free times ${key === todayKey() ? "today" : `on ${esc(fmtDay(key))}`} for <b>${esc(t.title)}</b></p>
      ${slots.length ? `<div class="chips">${slots.map((m) => `<button class="chip" data-e="slot" data-m="${m}">${fmtTime(m)}</button>`).join("")}</div>` : `<p class="hint">No free ${fmtDuration(duration)} slot left${key === todayKey() ? " today" : ""}. Pick a time below.</p>`}
      <div class="form-label">Or choose</div>
      <div class="form-group">
        <div class="row"><span class="row-label">Start</span><input type="time" data-e="time" value="${slots[0] !== void 0 ? toHHMM(slots[0]) : ""}"></div>
        <div class="row"><span class="row-label">Duration</span><select data-e="dur">${DURATION_OPTIONS.map(([v, l]) => `<option value="${v}"${+v === duration ? " selected" : ""}>${l}</option>`).join("")}</select></div>
      </div>
      <div class="sheet-actions"><button class="btn soft" data-e="tomorrow">Move to tomorrow</button><button class="btn" data-e="apply">Schedule</button></div>`;
  };
  const sheet = openSheet({ id: "plan", html: `${sheetHead({ title: "Plan a time", left: `<button class="text-btn muted" data-e="cancel">Cancel</button>` })}<div class="sheet-body">${render2()}</div>`, label: "Plan a time" });
  const el = sheet.el;
  const apply = (min) => {
    store.updateTask(t.id, { date: key, time: toHHMM(min), duration }, { undoLabel: "Planned" });
    sheet.close("done");
    toast(`Planned for ${fmtTime(min)}`, { action: () => store.undo() });
  };
  el.addEventListener("click", (e) => {
    const b = e.target.closest("[data-e]");
    if (!b) return;
    const k = b.dataset.e;
    if (k === "cancel") sheet.close("cancel");
    else if (k === "slot") apply(+b.dataset.m);
    else if (k === "apply") {
      const v = el.querySelector('[data-e="time"]').value;
      if (!v) {
        toast("Pick a start time");
        return;
      }
      apply(parseHHMM(v));
    } else if (k === "tomorrow") {
      store.updateTask(t.id, { date: addDays(todayKey(), 1), time: null }, { undoLabel: "Moved" });
      sheet.close("done");
      toast("Moved to tomorrow", { action: () => store.undo() });
    }
  });
  el.addEventListener("change", (e) => {
    if (e.target.dataset.e === "dur") {
      duration = +e.target.value;
      el.querySelector(".sheet-body").innerHTML = render2();
    }
  });
}
function openSearch() {
  const html = `<div class="sheet-handle" aria-hidden="true"></div><div class="search-bar"><label class="search-field">${icon("search", "sm")}<input type="search" placeholder="Search tasks, notes, #tags" enterkeyhint="search" aria-label="Search"></label><button class="text-btn" data-e="close">Cancel</button></div><div class="sheet-body"><div data-results></div></div>`;
  const sheet = openSheet({ id: "search", html, className: "tall", label: "Search" });
  const el = sheet.el;
  const input = el.querySelector("input");
  const results = el.querySelector("[data-results]");
  const run = () => {
    const q = input.value;
    if (!q.trim()) {
      const tags = [...new Set(store.tasks.flatMap((t) => t.tags))].slice(0, 20);
      results.innerHTML = tags.length ? `<div class="form-label">Tags</div><div class="chips">${tags.map((t) => `<button class="chip" data-e="tag" data-tag="${esc(t)}">#${esc(t)}</button>`).join("")}</div>` : `<p class="hint" style="text-align:center;margin-top:30px">Search titles, notes, subtasks and #tags.</p>`;
      return;
    }
    const found = searchTasks(store.tasks, q);
    const open = found.filter((t) => !t.done);
    const done = found.filter((t) => t.done).slice(0, 50);
    let out = "";
    if (open.length) out += `<div class="form-label">Open · ${open.length}</div><ul class="task-list">${open.map((t) => taskRow(t)).join("")}</ul>`;
    if (done.length) out += `<div class="form-label">Completed · ${done.length}</div><ul class="task-list">${done.map((t) => taskRow(t)).join("")}</ul>`;
    if (!found.length) out = `<p class="hint" style="text-align:center;margin-top:30px">No tasks match “${esc(q)}”.</p>`;
    results.innerHTML = out;
  };
  input.addEventListener("input", run);
  el.addEventListener("click", (e) => {
    const b = e.target.closest("[data-e]");
    if (!b) return;
    if (b.dataset.e === "close") sheet.close("cancel");
    if (b.dataset.e === "tag") {
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
function openListEditor(listId) {
  const existing = listId ? store.lists.find((l) => l.id === listId) : null;
  let color = existing ? existing.color : LIST_COLORS[store.lists.length % LIST_COLORS.length];
  const html = `${sheetHead({ title: existing ? "Edit list" : "New list", left: `<button class="text-btn muted" data-e="cancel">Cancel</button>`, right: `<button class="text-btn strong" data-e="save">${existing ? "Save" : "Create"}</button>` })}
  <div class="sheet-body"><input class="text-input" data-e="name" value="${esc(existing ? existing.name : "")}" placeholder="List name" aria-label="List name" enterkeyhint="done">
  <div class="form-label">Color</div><div class="color-pick">${LIST_COLORS.map((c) => `<button type="button" data-e="color" data-c="${c}" class="${c === color ? "is-on" : ""}" style="--c:${c}" aria-label="Color ${c}"></button>`).join("")}</div>
  ${existing ? `<div class="sheet-actions"><button class="btn danger" data-e="delete">${icon("trash", "sm")} Delete list</button></div><p class="hint">Its tasks move to Inbox.</p>` : ""}</div>`;
  const sheet = openSheet({ id: "list", html, className: "kb-aware", label: "List" });
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
      ui.view = "list";
      ui.listId = l.id;
    }
    sheet.close("done");
  };
  name.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      save();
    }
  });
  el.addEventListener("click", (e) => {
    const b = e.target.closest("[data-e]");
    if (!b) return;
    const k = b.dataset.e;
    if (k === "cancel") sheet.close("cancel");
    else if (k === "save") save();
    else if (k === "color") {
      color = b.dataset.c;
      for (const x of el.querySelectorAll('[data-e="color"]')) x.classList.toggle("is-on", x.dataset.c === color);
    } else if (k === "delete") {
      sheet.close("done");
      store.deleteList(existing.id);
      ui.view = "lists";
      toast(`Deleted “${existing.name}”`, { action: () => store.undo() });
    }
  });
  if (!existing) name.focus();
}
function confirmSheet({ title, message, confirmLabel = "Confirm", danger = true }) {
  return new Promise((resolve) => {
    let answered = false;
    const sheet = openSheet({
      id: "confirm",
      html: `${sheetHead({ title })}<div class="sheet-body"><p style="color:var(--text-2);line-height:1.5;margin:0 4px">${esc(message)}</p><div class="sheet-actions"><button class="btn soft" data-e="no">Cancel</button><button class="btn ${danger ? "danger" : ""}" data-e="yes">${esc(confirmLabel)}</button></div></div>`,
      label: title,
      onClose: () => {
        if (!answered) resolve(false);
      }
    });
    sheet.el.addEventListener("click", (e) => {
      const b = e.target.closest("[data-e]");
      if (!b) return;
      answered = true;
      resolve(b.dataset.e === "yes");
      sheet.close("done");
    });
  });
}
function openInstallHelp() {
  const ios = isIOS();
  const body = ios ? `<ol class="install-steps" style="font-size:16px"><li>Open this page in <b>Safari</b></li><li>Tap <span class="kbd">···</span> (bottom right), then <span class="kbd">${icon("share", "xs")} Share</span></li><li>Scroll and tap <span class="kbd">${icon("add-home", "xs")} Add to Home Screen</span></li><li>Keep <b>Open as Web App</b> on, then tap <b>Add</b></li></ol><p class="hint">Dayline then opens full-screen from its own icon, works offline, and can show notifications and a badge.</p>` : `<ol class="install-steps" style="font-size:16px"><li><b>Chrome / Edge:</b> menu ⋮ → <b>Install Dayline</b> (or the install icon in the address bar)</li><li><b>Safari on Mac:</b> File → <b>Add to Dock</b></li><li><b>Android:</b> Chrome menu ⋮ → <b>Install app</b></li></ol>`;
  const sheet = openSheet({ id: "install", html: `${sheetHead({ title: "Install Dayline", right: `<button class="text-btn strong" data-e="close">Done</button>` })}<div class="sheet-body">${body}${ui.installPrompt ? `<div class="sheet-actions"><button class="btn" data-e="prompt">${icon("add-home", "sm")} Install now</button></div>` : ""}</div>`, label: "Install" });
  sheet.el.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-e]");
    if (!b) return;
    if (b.dataset.e === "close") sheet.close("done");
    if (b.dataset.e === "prompt" && ui.installPrompt) {
      ui.installPrompt.prompt();
      ui.installPrompt = null;
      sheet.close("done");
    }
  });
}
function openCheatSheet() {
  const rows = [
    ["Dentist fri 9am", "Friday at 9:00 AM"],
    ["Call Ana tomorrow 3-4pm", "Tomorrow, 3:00 PM for 1 hour"],
    ["Write aims for 90m", "90-minute block"],
    ["Stretch every weekday 7am", "Repeats Mon–Fri"],
    ["Team sync every mon, wed", "Repeats Mon & Wed"],
    ["Pay rent monthly", "Repeats every month"],
    ["Grant report due 10/15", "October 15"],
    ["Book flights in 2 weeks", "Two weeks from today"],
    ["Email IRB tonight", "Today at 8:00 PM"],
    ["Review draft #work !high", "Work list · High priority"],
    ["Pick up meds #errands", "Tag #errands (or a list with that name)"]
  ];
  const body = `<div class="form-group">${rows.map(([a, b]) => `<div class="row" style="flex-direction:column;align-items:flex-start;gap:2px;padding:10px 14px"><code style="font-family:ui-monospace,Menlo,monospace;font-size:14px;color:var(--text)">${esc(a)}</code><span style="font-size:13.5px;color:var(--muted)">${esc(b)}</span></div>`).join("")}</div><p class="hint">Words Dayline picks up appear as chips under the text box. Tap a chip’s × to keep that word in the title instead.</p>`;
  const sheet = openSheet({ id: "cheat", html: `${sheetHead({ title: "Quick-add cheat sheet", right: `<button class="text-btn strong" data-e="close">Done</button>` })}<div class="sheet-body">${body}</div>`, className: "tall", label: "Cheat sheet" });
  sheet.el.addEventListener("click", (e) => {
    if (e.target.closest('[data-e="close"]')) sheet.close("done");
  });
}

// ../dayline/js/notify.js
var FIRED_KEY = "dayline:fired";
var fired = /* @__PURE__ */ new Set();
try {
  fired = new Set(JSON.parse(localStorage.getItem(FIRED_KEY) || "[]"));
} catch {
  fired = /* @__PURE__ */ new Set();
}
function saveFired() {
  const arr = [...fired].slice(-300);
  fired = new Set(arr);
  localStorage.setItem(FIRED_KEY, JSON.stringify(arr));
}
function notificationsSupported() {
  return "Notification" in window && "serviceWorker" in navigator;
}
async function requestPermission() {
  if (!notificationsSupported()) return "unsupported";
  try {
    return await Notification.requestPermission();
  } catch {
    return "denied";
  }
}
function badgeCount() {
  const today = todayKey();
  return store.tasks.filter((t) => !t.done && t.date && t.date <= today).length;
}
function updateBadge() {
  if (!("setAppBadge" in navigator)) return;
  try {
    const n = store.settings.notifications ? badgeCount() : 0;
    if (n > 0) navigator.setAppBadge(n).catch(() => {
    });
    else if (navigator.clearAppBadge) navigator.clearAppBadge().catch(() => {
    });
  } catch {
  }
}
async function tick() {
  updateBadge();
  if (!store.settings.notifications || !notificationsSupported() || Notification.permission !== "granted") return;
  const now = Date.now();
  const due = [];
  for (const t of store.tasks) {
    if (t.done || !t.date || !t.time || t.reminder === null) continue;
    const at = combine(t.date, t.time).getTime() - t.reminder * 6e4;
    const key = `${t.id}@${at}`;
    if (at <= now && now - at < 15 * 6e4 && !fired.has(key)) due.push({ t, key });
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
    const body = `${fmtTime(t.time)}${t.duration ? ` · ${fmtDuration(t.duration)}` : ""}${t.notes ? ` — ${t.notes.slice(0, 80)}` : ""}`;
    const opts2 = { body, tag: key, data: { taskId: t.id }, icon: "icon-192.png", badge: "icon-192.png" };
    try {
      if (reg && reg.showNotification) await reg.showNotification(t.title, opts2);
      else new Notification(t.title, opts2);
    } catch (err) {
      console.warn("Notification failed", err);
    }
  }
  saveFired();
}
var started = false;
function initNotifications() {
  if (started) return;
  started = true;
  tick();
  setInterval(() => {
    if (!document.hidden) tick();
  }, 2e4);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) tick();
  });
  store.subscribe(() => updateBadge());
}

// ../dayline/js/main.js
var TOP_VIEWS = ["today", "schedule", "upcoming", "lists"];
var scrollMemory = {};
var lastKey = null;
var prevView = "today";
var currentDay = todayKey();
function applyTheme() {
  const t = store.settings.theme;
  const root = document.documentElement;
  if (t === "light" || t === "dark") root.dataset.theme = t;
  else delete root.dataset.theme;
  const metas = document.querySelectorAll('meta[name="theme-color"]');
  metas.forEach((m) => {
    const isDarkMeta = (m.getAttribute("media") || "").includes("dark");
    if (t === "light") m.setAttribute("content", "#f6f4ef");
    else if (t === "dark") m.setAttribute("content", "#0e121c");
    else m.setAttribute("content", isDarkMeta ? "#0e121c" : "#f6f4ef");
  });
}
function viewKey() {
  if (ui.view === "list") return `list:${ui.listId}`;
  if (ui.view === "schedule") return `schedule:${scheduleDate()}`;
  return ui.view;
}
function render() {
  const v = ui.view;
  let out;
  if (v === "schedule") out = renderSchedule();
  else if (v === "upcoming") out = renderUpcoming();
  else if (v === "lists") out = renderLists();
  else if (v === "list") out = renderList(ui.listId);
  else if (v === "settings") out = renderSettings();
  else out = renderToday();
  const key = viewKey();
  const same = key === lastKey;
  const y = window.scrollY;
  const active = document.activeElement;
  const activeId = active && active.id && $("#view").contains(active) ? active.id : null;
  $("#topbar").innerHTML = out.top;
  const view = $("#view");
  view.innerHTML = out.body;
  view.classList.toggle("no-fab", !!out.noFab);
  $("#fab").hidden = !!out.noFab;
  ui.fabDefaults = out.fabDefaults || {};
  const tabView = v === "list" ? "lists" : v;
  for (const tab of document.querySelectorAll(".tab")) {
    if (tab.dataset.view === tabView) tab.setAttribute("aria-current", "page");
    else tab.removeAttribute("aria-current");
  }
  if (same) window.scrollTo(0, y);
  else {
    if (lastKey) scrollMemory[lastKey] = y;
    if (v === "schedule") scrollTimelineIntoView();
    else window.scrollTo(0, scrollMemory[key] || 0);
  }
  if (activeId) {
    const el = document.getElementById(activeId);
    if (el) el.focus({ preventScroll: true });
  }
  if (v === "schedule") attachTimelineDrag();
  lastKey = key;
}
var raf = 0;
function scheduleRender() {
  if (raf) return;
  raf = requestAnimationFrame(() => {
    raf = 0;
    render();
  });
}
ui.renderFn = scheduleRender;
function go(view) {
  if (view === ui.view && view !== "list") {
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  if (ui.view !== "settings") prevView = ui.view === "list" ? "lists" : ui.view;
  ui.view = view;
  if (TOP_VIEWS.includes(view)) store.setSetting("lastView", view, { silent: true });
  render();
}
function showOverlay(message) {
  const el = document.createElement("div");
  el.className = "overlay-msg";
  el.innerHTML = `<div>${icon("sync")}${esc(message)}</div>`;
  document.body.appendChild(el);
  return () => el.remove();
}
var pendingToggle = /* @__PURE__ */ new Set();
function toggleTask(id3, el) {
  const t = store.getTask(id3);
  if (!t || pendingToggle.has(id3)) return;
  if (t.done) {
    store.toggleDone(id3);
    return;
  }
  pendingToggle.add(id3);
  const row = el && el.closest(".task, .blk-task, .tray-item");
  if (row) row.classList.add("completing");
  if (el) el.setAttribute("aria-checked", "true");
  haptic();
  setTimeout(() => {
    pendingToggle.delete(id3);
    const res = store.toggleDone(id3);
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
  if (ctx.view === "list" && !store.lists.some((l) => l.id === ctx.listId) && !["__all", "__done"].includes(ctx.listId)) return;
  if (!["today", "schedule", "upcoming", "lists", "list", "settings"].includes(ctx.view)) return;
  ui.view = ctx.view;
  ui.listId = ctx.listId;
  if (ctx.scheduleDate) ui.scheduleDate = ctx.scheduleDate;
  if (ctx.view === "settings") prevView = store.settings.lastView || "today";
}
async function connectProvider(p) {
  const hide = showOverlay(`Opening ${PROVIDER_LABEL[p]} sign-in…`);
  try {
    await connect(p, { context: navContext() });
  } catch (err) {
    hide();
    toast(err.message === "not_configured" ? "Add the client ID first (Settings → Calendars)." : `Couldn’t start sign-in: ${err.message || err}`);
  }
  setTimeout(hide, 6e3);
}
var actions = {
  go: (el) => go(el.dataset.view),
  "go-back": () => go(prevView || "today"),
  toggle: (el) => toggleTask(el.dataset.id, el),
  edit: (el) => openEditSheet(el.dataset.id),
  "quick-add": (el) => openQuickAdd({ ...el.id === "fab" ? ui.fabDefaults : {}, ...el.dataset.date ? { date: el.dataset.date } : {}, ...el.dataset.text ? { text: el.dataset.text } : {} }),
  search: () => openSearch(),
  "open-event": (el) => openEventSheet(el.dataset.key),
  "overdue-to-today": () => {
    const today = todayKey();
    const ids = store.tasks.filter((t) => !t.done && t.date && t.date < today).map((t) => t.id);
    if (!ids.length) return;
    store.bulkUpdate(ids, () => ({ date: today }), "Moved to today");
    toast(`Moved ${ids.length} task${ids.length > 1 ? "s" : ""} to today`, { action: () => store.undo() });
  },
  "toggle-expand": (el) => {
    ui.expanded[el.dataset.key] = !ui.expanded[el.dataset.key];
    render();
  },
  "dismiss-install": () => store.setSetting("installDismissed", true),
  "cal-connect": (el) => connectProvider(el.dataset.provider),
  "cal-sync": () => {
    sync({ force: true });
    render();
  },
  "cal-disconnect": async (el) => {
    const p = el.dataset.provider;
    const ok = await confirmSheet({ title: `Disconnect ${PROVIDER_LABEL[p]}?`, message: "Events stop showing in Dayline. Events already on your calendar stay there.", confirmLabel: "Disconnect" });
    if (ok) {
      await disconnect(p);
      toast(`${PROVIDER_LABEL[p]} disconnected`);
    }
  },
  "save-provider": (el) => {
    const p = el.dataset.provider;
    for (const input of document.querySelectorAll(`[data-provider-field^="${p}:"]`)) {
      const field = input.dataset.providerField.split(":")[1];
      store.setProviderSetting(p, field, input.value.trim(), { silent: true });
    }
    ui.expanded[`cfg:${p}`] = false;
    store.emit("settings");
    toast(isConfigured(p) ? "Saved — now tap Connect" : "Cleared");
  },
  copy: async (el) => {
    const ok = await copyText(el.dataset.text || "");
    toast(ok ? "Copied" : "Couldn’t copy — select and copy it manually");
  },
  "pick-day": (el) => {
    ui.scheduleDate = el.dataset.date;
    if (ui.view !== "schedule") ui.view = "schedule";
    render();
  },
  "week-shift": (el) => {
    ui.scheduleDate = addDays(scheduleDate(), +el.dataset.delta);
    render();
  },
  "auto-plan": (el) => {
    const r = autoPlan(el.dataset.date);
    if (r.reason === "ok") {
      render();
      requestAnimationFrame(() => scrollToTaskBlock(r.ids));
      toast(`Planned ${r.planned} task${r.planned > 1 ? "s" : ""}${r.skipped ? ` · ${r.skipped} didn’t fit` : ""}`, { action: () => store.undo() });
    } else if (r.reason === "full") toast("No free time left in your work hours. Adjust hours in Settings or plan one by one.");
    else if (r.reason === "none") toast("Nothing to plan.");
  },
  "plan-task": (el) => openPlanSheet(el.dataset.id, el.dataset.date),
  "timeline-tap": (el, e) => {
    if (e.target.closest(".blk")) return;
    const m = minutesFromPointer(el, e.clientY);
    openQuickAdd({ date: el.dataset.date, time: toHHMM(m) });
  },
  "open-list": (el) => {
    ui.listId = el.dataset.id;
    go("list");
  },
  "new-list": () => openListEditor(),
  "edit-list": (el) => openListEditor(el.dataset.id),
  "clear-completed": async () => {
    const done = store.tasks.filter((t) => t.done);
    if (!done.length) return;
    const ok = await confirmSheet({ title: "Clear completed?", message: `Delete ${done.length} completed task${done.length > 1 ? "s" : ""}. You can undo right after.`, confirmLabel: "Delete" });
    if (!ok) return;
    store.pushUndo("Cleared completed");
    store.state.tasks = store.state.tasks.filter((t) => !t.done);
    store.save();
    store.emit("task");
    toast("Cleared completed tasks", { action: () => store.undo() });
  },
  export: async () => {
    const res = await offerFile(store.exportData(), `dayline-backup-${todayKey()}.json`, "application/json");
    if (res !== "cancelled") {
      store.setMeta("lastBackupAt", (/* @__PURE__ */ new Date()).toISOString());
      render();
    }
  },
  import: () => {
    const input = document.getElementById("import-file");
    if (input) input.click();
  },
  erase: async () => {
    const ok = await confirmSheet({ title: "Erase all tasks?", message: "This removes every task and list on this device. Settings and calendar connections stay. You can undo right after.", confirmLabel: "Erase" });
    if (!ok) return;
    store.resetAll();
    toast("All tasks erased", { action: () => store.undo() });
  },
  "install-help": () => openInstallHelp(),
  "quick-add-help": () => openCheatSheet()
};
document.addEventListener("click", (e) => {
  if (ui.suppressClickUntil) {
    const until = ui.suppressClickUntil;
    ui.suppressClickUntil = 0;
    if (Date.now() < until) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
  }
  const el = e.target.closest("[data-action]");
  if (!el || el.disabled) return;
  const fn = actions[el.dataset.action];
  if (fn) fn(el, e);
});
document.addEventListener("change", async (e) => {
  const t = e.target;
  if (t.dataset.providerSelect) {
    store.setProviderSetting(t.dataset.providerSelect, "defaultCalendar", t.value);
    return;
  }
  if (t.dataset.calToggle) {
    const p = t.dataset.calToggle;
    const cur = { ...store.settings[p].calendars || {} };
    cur[t.dataset.calId] = t.checked;
    store.setProviderSetting(p, "calendars", cur, { silent: true });
    sync();
    scheduleRender();
    return;
  }
  if (t.dataset.setting) {
    const k = t.dataset.setting;
    let v = t.value;
    if (k === "weekStart" || k === "defaultDuration") v = +v;
    if (k === "defaultReminder") v = v === "" ? null : +v;
    if ((k === "workStart" || k === "workEnd") && !v) return;
    store.setSetting(k, v);
    if (k === "theme") applyTheme();
    if (k === "autoCalendar" && v) toast(`New tasks with a time will be added to ${PROVIDER_LABEL[v]}`);
    return;
  }
  if (t.dataset.settingBool) {
    store.setSetting(t.dataset.settingBool, t.checked);
    return;
  }
  if (t.dataset.actionChange === "toggle-notifications") {
    if (t.checked) {
      const perm = await requestPermission();
      if (perm === "granted") {
        store.setSetting("notifications", true);
        updateBadge();
        toast("Notifications on");
      } else {
        t.checked = false;
        store.setSetting("notifications", false);
        toast(perm === "denied" ? "Notifications are blocked in iPhone Settings" : "Notifications aren’t available here");
      }
    } else {
      store.setSetting("notifications", false);
      updateBadge();
    }
    return;
  }
  if (t.id === "import-file" && t.files && t.files[0]) {
    const file = t.files[0];
    t.value = "";
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const n = Array.isArray(data.tasks) ? data.tasks.length : 0;
      const replace = await confirmSheet({ title: "Restore backup", message: `This backup has ${n} task${n === 1 ? "" : "s"}. Replace everything on this device with it? (Choose Cancel to merge it with your current tasks instead.)`, confirmLabel: "Replace", danger: true });
      const res = store.importData(data, replace ? "replace" : "merge");
      toast(`Restored ${res.tasks} task${res.tasks === 1 ? "" : "s"}`, { action: () => store.undo() });
    } catch (err) {
      toast(`That file couldn’t be read: ${err.message || err}`);
    }
  }
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (closeTopSheet("escape")) e.preventDefault();
    return;
  }
  const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement && document.activeElement.tagName);
  if (typing || topSheet() || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === "n" || e.key === "a") {
    e.preventDefault();
    openQuickAdd(ui.fabDefaults || {});
  } else if (e.key === "/") {
    e.preventDefault();
    openSearch();
  } else if (e.key === "1") go("today");
  else if (e.key === "2") go("schedule");
  else if (e.key === "3") go("upcoming");
  else if (e.key === "4") go("lists");
  else if (ui.view === "schedule" && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
    ui.scheduleDate = addDays(scheduleDate(), e.key === "ArrowLeft" ? -1 : 1);
    render();
  }
});
var swipe = null;
document.addEventListener(
  "touchstart",
  (e) => {
    const strip = e.target.closest('[data-swipe="week"]');
    swipe = strip ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null;
  },
  { passive: true }
);
document.addEventListener("touchend", (e) => {
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
  "scroll",
  () => {
    const tb = $("#topbar");
    if (tb) tb.classList.toggle("scrolled", window.scrollY > 4);
  },
  { passive: true }
);
store.subscribe((reason) => {
  if (reason === "settings") applyTheme();
  if (reason === "save-error") toast("Couldn’t save — your device storage may be full.");
  scheduleRender();
});
onChange((reason, data) => {
  if (reason === "toast") {
    toast(data);
    return;
  }
  scheduleRender();
});
function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register("sw.js").then((reg) => {
    const offer = (worker) => toast("A new version of Dayline is ready", {
      actionLabel: "Update",
      duration: 15e3,
      action: () => worker.postMessage("skipWaiting")
    });
    if (reg.waiting && hadController) offer(reg.waiting);
    reg.addEventListener("updatefound", () => {
      const w = reg.installing;
      if (!w) return;
      w.addEventListener("statechange", () => {
        if (w.state === "installed" && navigator.serviceWorker.controller) offer(w);
      });
    });
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) reg.update().catch(() => {
      });
    });
  }).catch((err) => console.warn("Service worker registration failed", err));
  let reloading = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!hadController || reloading) return;
    reloading = true;
    store.flush();
    location.reload();
  });
  navigator.serviceWorker.addEventListener("message", (e) => {
    if (e.data && e.data.type === "open-task" && e.data.id) openEditSheet(e.data.id);
  });
}
function autoRefresh() {
  if (!store.settings.autoRefreshAuth || !navigator.onLine || topSheet()) return false;
  const expired = PROVIDER_IDS.some((p) => isConnected3(p) && !hasUsableToken(p));
  if (!expired) return false;
  const hide = showOverlay("Refreshing your calendar…");
  if (maybeAutoAuth(navContext())) return true;
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
  ui.view = TOP_VIEWS.includes(saved) ? saved : "today";
  const params = new URLSearchParams(location.search);
  if (params.get("view") && TOP_VIEWS.includes(params.get("view"))) ui.view = params.get("view");
  let ret = null;
  try {
    ret = await handleRedirect();
  } catch (err) {
    console.error(err);
  }
  if (ret) restoreNav(ret.context);
  render();
  registerServiceWorker();
  initNotifications();
  if (ret) {
    if (ret.ok && !ret.silent) toast(`${PROVIDER_LABEL[ret.provider]} connected`);
    else if (!ret.ok && ret.message && !(ret.silent && ret.error !== "state_mismatch" && /sign in again/.test(ret.message))) toast(ret.message);
  }
  if (anyConnected()) {
    if (!(ret && !ret.ok) && !autoRefresh()) sync();
  }
  if (params.get("action") === "add") setTimeout(() => openQuickAdd(ui.fabDefaults || {}), 300);
  if (params.has("view") || params.has("action")) history.replaceState(null, "", location.pathname);
  setInterval(() => {
    if (document.hidden) return;
    updateNowLine();
    checkDayRollover();
  }, 3e4);
  setInterval(() => {
    if (!document.hidden && anyConnected()) sync();
  }, 5 * 60 * 1e3);
  let hiddenAt = 0;
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      hiddenAt = Date.now();
      store.flush();
      return;
    }
    checkDayRollover();
    if (hiddenAt && Date.now() - hiddenAt > 10 * 60 * 1e3 && autoRefresh()) return;
    if (anyConnected() && Date.now() - lastSyncAt() > 2 * 60 * 1e3) sync();
    scheduleRender();
  });
  window.addEventListener("pagehide", () => store.flush());
  window.addEventListener("online", () => anyConnected() && sync());
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    ui.installPrompt = e;
  });
  if (navigator.storage && navigator.storage.persist && isStandalone()) navigator.storage.persist().catch(() => {
  });
}
start();
window.dayline = { store, cal: calendar_exports };
