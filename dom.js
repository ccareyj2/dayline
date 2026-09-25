// Small DOM helpers shared by the views.

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export function esc(v) {
  return String(v === null || v === undefined ? '' : v).replace(/[&<>"']/g, (c) => ESC[c]);
}

// Only allow safe colors inside style attributes.
export function safeColor(c, fallback = '#64748B') {
  return /^#[0-9a-f]{3,8}$/i.test(String(c || '')) ? c : fallback;
}

export function icon(name, cls = '') {
  return `<svg class="icon ${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
}

// Shared UI state (kept out of the persisted store).
export const ui = {
  view: 'today',
  listId: null,
  scheduleDate: null,
  expanded: {},
  renderFn: null,
  sheet: null,
};

export function rerender() {
  if (ui.renderFn) ui.renderFn();
}

// ---------- toasts ----------
export function toast(message, { action, actionLabel = 'Undo', duration = 4200 } = {}) {
  const root = document.getElementById('toast-root');
  if (!root) return;
  while (root.children.length >= 2) root.firstElementChild.remove();
  const el = document.createElement('div');
  el.className = 'toast';
  el.setAttribute('role', 'status');
  el.innerHTML = `<span>${esc(message)}</span>${action ? `<button type="button">${esc(actionLabel)}</button>` : ''}`;
  let timer;
  const close = () => {
    clearTimeout(timer);
    el.classList.add('leaving');
    setTimeout(() => el.remove(), 200);
  };
  if (action) {
    el.querySelector('button').addEventListener('click', () => {
      close();
      action();
    });
  }
  root.appendChild(el);
  timer = setTimeout(close, duration);
  return close;
}

// ---------- sheets ----------
let sheetStack = [];

function updateKeyboardShift() {
  const vv = window.visualViewport;
  const top = sheetStack[sheetStack.length - 1];
  if (!vv || !top) return;
  const sheet = top.el.querySelector('.sheet');
  // Only compact sheets ride on top of the keyboard; tall sheets scroll instead.
  if (!sheet || !sheet.classList.contains('kb-aware')) return;
  const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
  sheet.style.setProperty('--kb-shift', kb > 80 ? `-${kb}px` : '0px');
}
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', updateKeyboardShift);
  window.visualViewport.addEventListener('scroll', updateKeyboardShift);
}

/**
 * Opens a bottom sheet. `render(el)` fills it; returns { el, close, update }.
 * onClose(reason) runs once when it closes.
 */
export function openSheet({ id, html, className = '', label = '', onClose, onMount }) {
  const root = document.getElementById('sheet-root');
  const wrap = document.createElement('div');
  wrap.className = 'sheet-wrap';
  wrap.dataset.sheet = id;
  wrap.innerHTML = `<div class="sheet-backdrop" data-sheet-close="backdrop"></div><div class="sheet ${className}" role="dialog" aria-modal="true" aria-label="${esc(label)}">${html}</div>`;
  root.appendChild(wrap);
  document.body.classList.add('sheet-open');
  const prevFocus = document.activeElement;
  let closed = false;
  const entry = {
    id,
    el: wrap,
    close(reason = 'close') {
      if (closed) return;
      closed = true;
      sheetStack = sheetStack.filter((s) => s !== entry);
      wrap.classList.add('closing');
      setTimeout(() => wrap.remove(), 200);
      if (!sheetStack.length) document.body.classList.remove('sheet-open');
      if (onClose) onClose(reason);
      if (prevFocus && prevFocus.focus && document.contains(prevFocus)) {
        try {
          prevFocus.focus({ preventScroll: true });
        } catch {
          /* ignore */
        }
      }
    },
    setBody(bodyHtml) {
      const body = wrap.querySelector('.sheet-body');
      if (body) body.innerHTML = bodyHtml;
    },
  };
  wrap.querySelector('.sheet-backdrop').addEventListener('click', () => entry.close('backdrop'));
  // Swipe down on the handle/header to dismiss.
  const handleArea = wrap.querySelector('.sheet-handle');
  if (handleArea) enableSwipeDown(wrap.querySelector('.sheet'), handleArea.parentElement.querySelector('.sheet-head') || handleArea, entry);
  sheetStack.push(entry);
  if (onMount) onMount(wrap, entry);
  updateKeyboardShift();
  return entry;
}

function enableSwipeDown(sheet, area, entry) {
  let startY = null;
  let dy = 0;
  const targets = [sheet.querySelector('.sheet-handle'), area].filter(Boolean);
  for (const t of targets) {
    t.addEventListener(
      'touchstart',
      (e) => {
        if (e.target.closest('button, input, select, textarea')) return;
        startY = e.touches[0].clientY;
        dy = 0;
        sheet.style.transition = 'none';
      },
      { passive: true }
    );
    t.addEventListener(
      'touchmove',
      (e) => {
        if (startY === null) return;
        dy = Math.max(0, e.touches[0].clientY - startY);
        sheet.style.transform = `translateY(${dy}px)`;
      },
      { passive: true }
    );
    t.addEventListener('touchend', () => {
      if (startY === null) return;
      sheet.style.transition = '';
      sheet.style.transform = '';
      if (dy > 90) entry.close('swipe');
      startY = null;
    });
  }
}

export function topSheet() {
  return sheetStack[sheetStack.length - 1] || null;
}

export function closeTopSheet(reason = 'escape') {
  const top = topSheet();
  if (top) top.close(reason);
  return !!top;
}

export function closeAllSheets() {
  while (sheetStack.length) sheetStack[sheetStack.length - 1].close('replace');
}

export function sheetHead({ title, left = '', right = '' }) {
  return `<div class="sheet-handle" aria-hidden="true"></div><div class="sheet-head">${left || '<span style="min-width:64px"></span>'}<h3>${esc(title)}</h3>${right || '<span style="min-width:64px"></span>'}</div>`;
}

// ---------- misc ----------
export function autosize(ta) {
  if (!ta) return;
  ta.style.height = 'auto';
  ta.style.height = `${Math.min(ta.scrollHeight, 240)}px`;
}

export function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

export function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      /* ignore */
    }
    ta.remove();
    return ok;
  }
}

// Offer a generated file: share sheet on iPhone (Save to Files, AirDrop…), download elsewhere.
export async function offerFile(text, filename, type) {
  const file = typeof File === 'function' ? new File([text], filename, { type }) : null;
  if (file && navigator.canShare && navigator.canShare({ files: [file] }) && isIOS()) {
    try {
      await navigator.share({ files: [file], title: filename });
      return 'shared';
    } catch (err) {
      if (err && err.name === 'AbortError') return 'cancelled';
    }
  }
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return 'downloaded';
}

export function haptic() {
  try {
    if (navigator.vibrate) navigator.vibrate(8);
  } catch {
    /* not supported on iOS */
  }
}
