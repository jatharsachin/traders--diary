import { getSupabaseClient } from './supabaseClient';

const DB_NAME = 'traders_diary_charts_db';
const STORE_NAME = 'charts';
const DB_VERSION = 1;

function openChartDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not supported in this browser.'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Compresses a pasted image file into a lightweight WebP data URL,
 * stores it in IndexedDB (hundreds of MB capacity, 0 bytes in localStorage),
 * and returns a tiny `idb://chart-...` reference key.
 */
export async function savePastedChartImage(file: File): Promise<string> {
  const dataUrl = await compressImageToWebP(file);
  const key = `idb://chart-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const db = await openChartDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(dataUrl, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();

  // Best-effort background upload to Supabase Storage bucket `trade-charts` if configured
  try {
    const client = getSupabaseClient();
    if (client) {
      const { data: sessionData } = await client.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (userId) {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const fileName = `${userId}/${key.replace('idb://', '')}.webp`;
        await client.storage.from('trade-charts').upload(fileName, blob, {
          contentType: 'image/webp',
          upsert: true,
        });
      }
    }
  } catch {
    // Graceful no-op if Supabase storage bucket is not configured
  }

  return key;
}

/**
 * Lazily loads a chart image from IndexedDB (on-demand when viewing a trade or review).
 */
export async function loadChartImage(chartRef: string): Promise<string | null> {
  if (!chartRef) return null;
  if (!chartRef.startsWith('idb://')) return chartRef;

  try {
    const db = await openChartDB();
    const result = await new Promise<string | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(chartRef);
      req.onsuccess = () => resolve(typeof req.result === 'string' ? req.result : null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    if (result) return result;
  } catch (e) {
    console.warn('Failed to load chart from IndexedDB:', e);
  }

  // Fallback to Supabase Storage if synced from another device
  try {
    const client = getSupabaseClient();
    if (client) {
      const { data: sessionData } = await client.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (userId) {
        const fileName = `${userId}/${chartRef.replace('idb://', '')}.webp`;
        const { data } = await client.storage.from('trade-charts').createSignedUrl(fileName, 3600);
        if (data?.signedUrl) return data.signedUrl;
      }
    }
  } catch {
    // Ignore
  }

  return null;
}

export async function deleteChartImage(chartRef: string): Promise<void> {
  if (!chartRef || !chartRef.startsWith('idb://')) return;
  try {
    const db = await openChartDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(chartRef);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // Ignore
  }
}

function compressImageToWebP(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const maxW = 1080;
        const scale = img.width > maxW ? maxW / img.width : 1;
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable'));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/webp', 0.8));
      };
      img.onerror = () => reject(new Error('Failed to decode pasted image'));
      if (typeof ev.target?.result === 'string') {
        img.src = ev.target.result;
      } else {
        reject(new Error('Invalid image data'));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
