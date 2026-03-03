import { ENV } from '@/lib/env';
import type { StoreSalePayload } from '@/types/api';

const DB_NAME = 'pos-offline-db';
const DB_VERSION = 1;
const STORE = 'sales_queue';
export const SALES_SYNC_TAG = 'sync-sales-queue';

export interface QueuedSale {
  id: string;
  payload: StoreSalePayload;
  token: string;
  branchId: number;
  apiUrl: string;
  createdAt: number;
  attempts: number;
}

function randomId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => Promise<T>) {
  const db = await openDb();

  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const store = tx.objectStore(STORE);

    run(store)
      .then((result) => {
        tx.oncomplete = () => {
          db.close();
          resolve(result);
        };
      })
      .catch((error) => {
        db.close();
        reject(error);
      });

    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

async function getAllQueuedSales() {
  return withStore<QueuedSale[]>('readonly', async (store) => {
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve((request.result as QueuedSale[]) ?? []);
      request.onerror = () => reject(request.error);
    });
  });
}

async function removeQueuedSale(id: string) {
  return withStore<void>('readwrite', async (store) => {
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  });
}

async function updateAttempts(id: string, attempts: number) {
  return withStore<void>('readwrite', async (store) => {
    return new Promise((resolve, reject) => {
      const getRequest = store.get(id);
      getRequest.onsuccess = () => {
        const value = getRequest.result as QueuedSale | undefined;
        if (!value) {
          resolve();
          return;
        }
        value.attempts = attempts;
        const putRequest = store.put(value);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  });
}

export async function queueSaleForOffline(payload: StoreSalePayload, token: string, branchId: number) {
  const record: QueuedSale = {
    id: randomId(),
    payload,
    token,
    branchId,
    apiUrl: salesEndpoint(),
    createdAt: Date.now(),
    attempts: 0
  };

  await withStore<void>('readwrite', async (store) => {
    return new Promise((resolve, reject) => {
      const request = store.put(record);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  });

  await registerSalesSync();
}

export async function countQueuedSales() {
  if (typeof indexedDB === 'undefined') {
    return 0;
  }

  try {
    const queued = await getAllQueuedSales();
    return queued.length;
  } catch {
    return 0;
  }
}

export async function registerSalesSync() {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  const registration = (await navigator.serviceWorker.ready) as ServiceWorkerRegistration & {
    sync?: {
      register: (tag: string) => Promise<void>;
    };
  };

  if (registration.sync?.register) {
    try {
      await registration.sync.register(SALES_SYNC_TAG);
      return;
    } catch {
      // Ignore and fallback to direct postMessage.
    }
  }

  registration.active?.postMessage({ type: 'SYNC_SALES_QUEUE' });
}

function salesEndpoint() {
  return `${ENV.API_URL.replace(/\/$/, '')}/sales`;
}

export async function flushQueuedSales() {
  const queued = await getAllQueuedSales();
  if (!queued.length || !navigator.onLine) {
    return { sent: 0, failed: queued.length };
  }

  let sent = 0;
  let failed = 0;

  for (const item of queued) {
    try {
      const response = await fetch(item.apiUrl || salesEndpoint(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${item.token}`,
          'X-Branch-Id': String(item.branchId),
          branch_id: String(item.branchId)
        },
        body: JSON.stringify(item.payload)
      });

      if (!response.ok) {
        failed += 1;
        await updateAttempts(item.id, item.attempts + 1);
        continue;
      }

      sent += 1;
      await removeQueuedSale(item.id);
    } catch {
      failed += 1;
      await updateAttempts(item.id, item.attempts + 1);
    }
  }

  return { sent, failed };
}
