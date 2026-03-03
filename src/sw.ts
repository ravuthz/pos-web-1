/// <reference lib="webworker" />

import { clientsClaim } from 'workbox-core';
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';

declare let self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<unknown>;
};

const DB_NAME = 'pos-offline-db';
const DB_VERSION = 1;
const STORE = 'sales_queue';
const SALES_SYNC_TAG = 'sync-sales-queue';

self.skipWaiting();
clientsClaim();
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

registerRoute(
  ({ request }) => request.mode === 'navigate',
  new NetworkFirst({
    cacheName: 'pages-cache',
    networkTimeoutSeconds: 4
  })
);

registerRoute(
  ({ url, request }) => url.pathname.startsWith('/api') && request.method === 'GET',
  new NetworkFirst({
    cacheName: 'api-cache',
    networkTimeoutSeconds: 5
  })
);

registerRoute(
  ({ request }) => ['script', 'style', 'worker'].includes(request.destination),
  new StaleWhileRevalidate({ cacheName: 'asset-cache' })
);

registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'image-cache',
    matchOptions: { ignoreVary: true }
  })
);

interface QueuedSale {
  id: string;
  payload: Record<string, unknown>;
  token: string;
  branchId: number;
  apiUrl?: string;
  attempts: number;
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

async function getAllQueuedSales() {
  const db = await openDb();

  return new Promise<QueuedSale[]>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const store = tx.objectStore(STORE);
    const request = store.getAll();

    request.onsuccess = () => {
      resolve((request.result as QueuedSale[]) ?? []);
      db.close();
    };

    request.onerror = () => {
      reject(request.error);
      db.close();
    };
  });
}

async function removeQueuedSale(id: string) {
  const db = await openDb();

  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const request = store.delete(id);

    request.onsuccess = () => {
      resolve();
      db.close();
    };

    request.onerror = () => {
      reject(request.error);
      db.close();
    };
  });
}

async function updateAttempts(id: string, attempts: number) {
  const db = await openDb();

  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const getRequest = store.get(id);

    getRequest.onsuccess = () => {
      const value = getRequest.result as QueuedSale | undefined;
      if (!value) {
        resolve();
        db.close();
        return;
      }

      value.attempts = attempts;
      const putRequest = store.put(value);

      putRequest.onsuccess = () => {
        resolve();
        db.close();
      };

      putRequest.onerror = () => {
        reject(putRequest.error);
        db.close();
      };
    };

    getRequest.onerror = () => {
      reject(getRequest.error);
      db.close();
    };
  });
}

async function replayQueuedSales() {
  const queued = await getAllQueuedSales();

  for (const item of queued) {
    try {
      const response = await fetch(item.apiUrl || '/api/sales', {
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
        await updateAttempts(item.id, item.attempts + 1);
        continue;
      }

      await removeQueuedSale(item.id);
    } catch {
      await updateAttempts(item.id, item.attempts + 1);
    }
  }
}

self.addEventListener('sync', (event: Event) => {
  const syncEvent = event as Event & {
    tag?: string;
    waitUntil: (promise: Promise<unknown>) => void;
  };

  if (syncEvent.tag === SALES_SYNC_TAG) {
    syncEvent.waitUntil(replayQueuedSales());
  }
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SYNC_SALES_QUEUE') {
    void replayQueuedSales();
  }
});
