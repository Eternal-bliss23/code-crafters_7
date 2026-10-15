import { db, getMeta, setMeta } from './db';
import { newId } from '../lib/id';
import type { Assessment, EvidenceRecord, SyncQueueItem } from '../types';

export interface SyncConfig {
  mode: 'simulated' | 'http';
  endpoint: string;
}

export const DEFAULT_SYNC_CONFIG: SyncConfig = { mode: 'simulated', endpoint: '' };

const CONFIG_KEY = 'syncConfig';

export async function loadSyncConfig(): Promise<SyncConfig> {
  return (await getMeta<SyncConfig>(CONFIG_KEY)) ?? DEFAULT_SYNC_CONFIG;
}

export async function saveSyncConfig(config: SyncConfig): Promise<void> {
  await setMeta(CONFIG_KEY, config);
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function pushToTransport(
  item: SyncQueueItem,
  config: SyncConfig,
  assumeOnline: boolean
): Promise<void> {
  if (config.mode === 'http' && config.endpoint) {
    if (!assumeOnline) throw new Error('Device reports no connectivity');
    const base = config.endpoint.replace(/\/$/, '');
    if (item.entity === 'assessment') {
      const payload = await db.get<Assessment>('assessments', item.refId);
      const res = await fetch(`${base}/assessments/${item.refId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload ?? {})
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } else {
      const payload = await db.get<EvidenceRecord>('evidence', item.refId);
      if (payload) {
        const form = new FormData();
        form.append('meta', JSON.stringify({ ...payload, blob: undefined }));
        form.append('file', payload.blob, `${payload.id}.bin`);
        const res = await fetch(`${base}/evidence/${item.refId}`, { method: 'POST', body: form });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      }
    }
    return;
  }

  // Simulated transport: behaves like a server that is unreachable while offline.
  if (!assumeOnline) throw new Error('Offline - queued for later sync');
  await delay(180 + Math.random() * 220);
  if (Math.random() < 0.06) throw new Error('Transient network error');
}

async function mirrorLocally(item: SyncQueueItem): Promise<void> {
  const source = item.entity === 'assessment' ? 'assessments' : 'evidence';
  const record = await db.get<Assessment | EvidenceRecord>(source, item.refId);
  if (record) await db.put('serverMirror', { ...record, synced: true });
}

export async function enqueue(
  entity: SyncQueueItem['entity'],
  refId: string,
  op: SyncQueueItem['op'] = 'upsert'
): Promise<void> {
  const existing = await db.getAll<SyncQueueItem>('syncQueue');
  const match = existing.find((q) => q.entity === entity && q.refId === refId);
  if (match) return;
  await db.put<SyncQueueItem>('syncQueue', {
    id: newId('q'),
    entity,
    refId,
    op,
    queuedAt: new Date().toISOString(),
    tries: 0
  });
}

export interface FlushResult {
  pushed: number;
  remaining: number;
  stoppedReason?: string;
}

export async function flushQueue(
  config: SyncConfig,
  assumeOnline: boolean
): Promise<FlushResult> {
  const queue = (await db.getAll<SyncQueueItem>('syncQueue')).sort((a, b) =>
    a.queuedAt.localeCompare(b.queuedAt)
  );
  let pushed = 0;

  for (const item of queue) {
    try {
      await pushToTransport(item, config, assumeOnline);
      await mirrorLocally(item);
      await db.del('syncQueue', item.id);
      pushed += 1;

      const store = item.entity === 'assessment' ? 'assessments' : 'evidence';
      const rec = await db.get<Assessment | EvidenceRecord>(store, item.refId);
      if (rec) {
        rec.synced = true;
        await db.put(store, rec);
      }
    } catch (err) {
      item.tries += 1;
      item.lastError = err instanceof Error ? err.message : String(err);
      await db.put('syncQueue', item);
      const remaining = (await db.getAll<SyncQueueItem>('syncQueue')).length;
      return { pushed, remaining, stoppedReason: item.lastError };
    }
  }

  const remaining = (await db.getAll<SyncQueueItem>('syncQueue')).length;
  return { pushed, remaining };
}

export async function pendingCount(): Promise<number> {
  return db.count('syncQueue');
}

export async function serverRecordCount(): Promise<number> {
  return db.count('serverMirror');
}
