import { STORAGE_KEY } from './constants';

const DB_NAME = 'xdl-swipe-db';
const DB_VERSION = 1;
const STORE_NAME = 'history';
const RECORDS_KEY = 'records';

/** In-memory cache; null = not yet loaded from IndexedDB. */
let _cache = null;

function generateId() {
  return 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9);
}

function safeFilename(name) {
  return (name || 'comparison').replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 80) || 'comparison';
}

function timestamp() {
  const d = new Date();
  return d.toISOString();
}

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

/**
 * Migrate from localStorage (one-time). Call when IDB is empty.
 */
async function migrateFromLocalStorage(db) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    const records = Array.isArray(parsed) ? parsed : [];
    if (records.length === 0) return;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(records, RECORDS_KEY);
      tx.oncomplete = () => {
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch (_) {}
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
  } catch (_) {
    // Ignore migration errors (e.g. invalid JSON in localStorage)
  }
}

export function createRecord({
  name = '',
  imageBefore,
  imageAfter,
  imageBeforeWidth,
  imageBeforeHeight,
  imageAfterWidth,
  imageAfterHeight,
  swipeWidth = 'images',
  customWidthPx,
  backgroundColor,
}) {
  const now = timestamp();
  const id = generateId();
  const safeName = safeFilename(name);
  const label = name.trim() || 'Untitled comparison';
  return {
    id,
    name: label,
    imageBefore,
    imageAfter,
    imageBeforeWidth: imageBeforeWidth ?? undefined,
    imageBeforeHeight: imageBeforeHeight ?? undefined,
    imageAfterWidth: imageAfterWidth ?? undefined,
    imageAfterHeight: imageAfterHeight ?? undefined,
    swipeWidth: swipeWidth === 'custom' ? 'custom' : swipeWidth,
    customWidthPx: swipeWidth === 'custom' ? (customWidthPx || 800) : undefined,
    backgroundColor: backgroundColor ?? undefined,
    createdAt: now,
    modifiedAt: now,
    _safeName: safeName,
  };
}

export function updateRecordModified(record) {
  return { ...record, modifiedAt: timestamp() };
}

export function getViewUrl(id, base = window.location.origin + window.location.pathname) {
  const separator = base.includes('?') ? '&' : '?';
  return `${base}${separator}id=${encodeURIComponent(id)}`;
}

export function getIdFromSearchParams(search) {
  const params = new URLSearchParams(search);
  return params.get('id') || null;
}

/**
 * Load history from IndexedDB (with in-memory cache and one-time migration from localStorage).
 * @returns {Promise<Array>}
 */
export async function loadHistory() {
  if (_cache !== null) return _cache;
  try {
    const db = await openDB();
    const records = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(RECORDS_KEY);
      req.onsuccess = () => resolve(req.result ?? []);
      req.onerror = () => reject(req.error);
    });
    if (records.length === 0) {
      await migrateFromLocalStorage(db);
      const after = await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(RECORDS_KEY);
        req.onsuccess = () => resolve(req.result ?? []);
        req.onerror = () => reject(req.error);
      });
      _cache = Array.isArray(after) ? after : [];
    } else {
      _cache = Array.isArray(records) ? records : [];
    }
    return _cache;
  } catch (e) {
    console.error('Failed to load history from IndexedDB', e);
    _cache = [];
    return _cache;
  }
}

/**
 * Save history to IndexedDB.
 * @returns {Promise<boolean>}
 */
export async function saveHistory(records) {
  try {
    _cache = records;
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(records, RECORDS_KEY);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => {
        console.error('Failed to save history', tx.error);
        resolve(false);
      };
    });
  } catch (e) {
    console.error('Failed to save history', e);
    return false;
  }
}

/**
 * Appends a record to history in IndexedDB.
 * @returns {Promise<object|null>} The record if save succeeded, or null if save failed.
 */
export async function addRecord(record) {
  const history = await loadHistory();
  history.unshift(record);
  const ok = await saveHistory(history);
  return ok ? record : null;
}

/**
 * @returns {Promise<object|null>}
 */
export async function updateRecord(id, updates) {
  const history = await loadHistory();
  const index = history.findIndex((r) => r.id === id);
  if (index === -1) return null;
  const next = { ...history[index], ...updates, modifiedAt: timestamp() };
  history[index] = next;
  await saveHistory(history);
  return next;
}

/**
 * Deletes a record (and its images stored as data URLs).
 */
export async function deleteRecord(id) {
  const history = await loadHistory();
  const record = history.find((r) => r.id === id);
  if (!record) return false;
  const next = history.filter((r) => r.id !== id);
  await saveHistory(next);
  return true;
}

/**
 * @returns {Promise<object|null>}
 */
export async function getRecordById(id) {
  const history = await loadHistory();
  return history.find((r) => r.id === id) ?? null;
}

/**
 * Approximate size in bytes of a record when stored (JSON string, UTF-8).
 */
export function getRecordStorageSizeBytes(record) {
  if (!record) return 0;
  try {
    const json = JSON.stringify(record);
    return new TextEncoder().encode(json).length;
  } catch {
    return 0;
  }
}

/** Human-readable size (e.g. "1.2 MB", "450 KB"). */
export function formatStorageSize(bytes) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, i);
  return `${value >= 10 || i === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[i]}`;
}

export { generateId, safeFilename, timestamp };
