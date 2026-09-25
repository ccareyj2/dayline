// Shared OAuth helpers for the redirect-based sign-in flows (works inside an iPhone home-screen web app).

const PENDING_KEY = 'dayline:oauth:pending';

export class AuthError extends Error {
  constructor(message = 'auth') {
    super(message);
    this.name = 'AuthError';
  }
}

export class ApiError extends Error {
  constructor(status, message) {
    super(message || `Request failed (${status})`);
    this.name = 'ApiError';
    this.status = status;
  }
}

// The exact URL you register with Google / Microsoft. Always the app folder with a trailing slash.
export function redirectUri() {
  const u = new URL('./', location.href);
  u.hash = '';
  u.search = '';
  return u.href;
}

export function base64url(bytes) {
  let s = '';
  const arr = new Uint8Array(bytes);
  for (let i = 0; i < arr.length; i++) s += String.fromCharCode(arr[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function randomString(bytes = 32) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return base64url(arr);
}

export async function sha256b64url(str) {
  const data = new TextEncoder().encode(str);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return base64url(hash);
}

export function decodeJwt(token) {
  try {
    const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(part + '==='.slice((part.length + 3) % 4))
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(json);
  } catch {
    return {};
  }
}

export function savePending(obj) {
  localStorage.setItem(PENDING_KEY, JSON.stringify(obj));
}

export function peekPending() {
  try {
    return JSON.parse(localStorage.getItem(PENDING_KEY) || 'null');
  } catch {
    return null;
  }
}

export function clearPending() {
  localStorage.removeItem(PENDING_KEY);
}

// Reads OAuth response parameters from the URL fragment (or query string).
export function readReturnParams() {
  const out = {};
  const take = (str) => {
    if (!str) return;
    const p = new URLSearchParams(str.replace(/^[#?]/, ''));
    for (const [k, v] of p) out[k] = v;
  };
  take(location.search);
  take(location.hash);
  const isOAuth = 'state' in out && ('access_token' in out || 'code' in out || 'error' in out);
  return isOAuth ? out : null;
}

export function cleanUrl() {
  try {
    history.replaceState(null, '', redirectUri());
  } catch {
    /* ignore */
  }
}
