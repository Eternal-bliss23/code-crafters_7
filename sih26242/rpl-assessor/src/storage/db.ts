import type { Assessment, EvidenceRecord, SyncQueueItem } from '../types';

export const DB_NAME = 'rpl_assessor';
export const DB_VERSION = 1;

export type StoreName = 'assessments' | 'evidence' | 'syncQueue' | 'serverMirror' | 'meta';

const STORES: StoreName[] = ['assessments', 'evidence', 'syncQueue', 'serverMirror', 'meta'];

let dbPromise: Promise<IDBDatabase> | null = null;

export function isIndexedDBAvailable(): boolean {
  return typeof indexedDB !== 'undefined';
}

export function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (!isIndexedDBAvailable()) {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const name of STORES) {
        if (!db.objectStoreNames.contains(name)) {
          db.createObjectStore(name, { keyPath: name === 'meta' ? 'key' : 'id' });
        }
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx<T>(store: StoreName, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(store, mode);
        const req = fn(t.objectStore(store));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      })
  );
}

export const db = {
  getAll<T>(store: StoreName): Promise<T[]> {
    return tx<T[]>(store, 'readonly', (s) => s.getAll() as IDBRequest<T[]>);
  },
  get<T>(store: StoreName, key: string): Promise<T | undefined> {
    return tx<T | undefined>(store, 'readonly', (s) => s.get(key) as IDBRequest<T | undefined>);
  },
  put<T>(store: StoreName, value: T): Promise<IDBValidKey> {
    return tx<IDBValidKey>(store, 'readwrite', (s) => s.put(value as unknown as object));
  },
  del(store: StoreName, key: string): Promise<undefined> {
    return tx<undefined>(store, 'readwrite', (s) => s.delete(key) as IDBRequest<undefined>);
  },
  count(store: StoreName): Promise<number> {
    return tx<number>(store, 'readonly', (s) => s.count());
  },
  clear(store: StoreName): Promise<undefined> {
    return tx<undefined>(store, 'readwrite', (s) => s.clear() as IDBRequest<undefined>);
  }
};

export interface MetaRecord<T = unknown> {
  key: string;
  value: T;
}

export async function getMeta<T>(key: string): Promise<T | undefined> {
  const rec = await db.get<MetaRecord<T>>('meta', key);
  return rec?.value;
}

export async function setMeta<T>(key: string, value: T): Promise<void> {
  await db.put<MetaRecord<T>>('meta', { key, value });
}

export type { Assessment, EvidenceRecord, SyncQueueItem };
