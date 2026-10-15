import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type {
  Assessment,
  EvidenceRecord,
  SelfDeclarationAnswers,
  ScoreLevel,
  QPMatch,
  TaskAssessment
} from './types';
import { db, isIndexedDBAvailable } from './storage/db';
import {
  DEFAULT_SYNC_CONFIG,
  enqueue,
  flushQueue,
  loadSyncConfig,
  pendingCount,
  saveSyncConfig,
  serverRecordCount,
  type FlushResult,
  type SyncConfig
} from './storage/sync';
import { newId } from './lib/id';

const emptyTask = (): TaskAssessment => ({ taskId: '', scores: [], evidenceIds: [], completed: false });

const SESSION_KEY = 'rpl_assessor_session';

export interface AssessorSession {
  name: string;
  assessorId: string;
  state: string;
  district: string;
  signedInAt: string;
}

function loadSession(): AssessorSession | undefined {
  try {
    if (typeof localStorage === 'undefined') return undefined;
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as AssessorSession) : undefined;
  } catch {
    return undefined;
  }
}

function saveSession(session?: AssessorSession): void {
  try {
    if (typeof localStorage === 'undefined') return;
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

function upsertTask(a: Assessment, taskId: string, fn: (t: TaskAssessment) => TaskAssessment): Assessment {
  const current = a.tasks[taskId] ?? { ...emptyTask(), taskId };
  return { ...a, tasks: { ...a.tasks, [taskId]: fn(current) }, updatedAt: new Date().toISOString() };
}

interface AppValue {
  ready: boolean;
  session?: AssessorSession;
  assessments: Assessment[];
  current?: Assessment;
  evidenceForCurrent: EvidenceRecord[];
  syncConfig: SyncConfig;
  assumeOnline: boolean;
  pending: number;
  serverRecords: number;
  lastSync?: string;
  persistence: 'indexeddb' | 'memory';
  actions: {
    signIn: (session: Omit<AssessorSession, 'signedInAt'>) => Promise<void>;
    signOut: () => void;
    createAssessment: (init: Partial<Assessment>) => Promise<Assessment>;
    openAssessment: (id: string) => Promise<void>;
    updateCurrent: (patch: Partial<Assessment>) => Promise<void>;
    saveDeclaration: (answers: SelfDeclarationAnswers, matches: QPMatch[]) => Promise<void>;
    chooseQp: (qpId: string) => Promise<void>;
    scoreCriterion: (taskId: string, criterionId: string, level: ScoreLevel, note?: string) => Promise<void>;
    setTaskEvidence: (taskId: string, evidenceIds: string[]) => Promise<void>;
    markTaskComplete: (taskId: string, complete: boolean) => Promise<void>;
    attachEvidence: (rec: Omit<EvidenceRecord, 'id' | 'synced'>) => Promise<EvidenceRecord>;
    removeEvidence: (id: string) => Promise<void>;
    signOff: (assessorName: string, overrides: string) => Promise<void>;
    setSyncConfig: (cfg: SyncConfig) => Promise<void>;
    setAssumeOnline: (online: boolean) => void;
    syncNow: () => Promise<FlushResult>;
    resetDemo: () => Promise<void>;
  };
}

const AppContext = createContext<AppValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<AssessorSession | undefined>(loadSession);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const assessmentsRef = useRef<Assessment[]>([]);
  const [currentId, setCurrentId] = useState<string>();
  const [evidenceAll, setEvidenceAll] = useState<EvidenceRecord[]>([]);
  const [syncConfig, setSyncConfigState] = useState<SyncConfig>(DEFAULT_SYNC_CONFIG);
  const [assumeOnline, setAssumeOnline] = useState<boolean>(
    typeof navigator === 'undefined' ? true : navigator.onLine
  );
  const [pending, setPending] = useState(0);
  const [serverRecords, setServerRecords] = useState(0);
  const [lastSync, setLastSync] = useState<string>();
  const persistence: AppValue['persistence'] = isIndexedDBAvailable() ? 'indexeddb' : 'memory';

  const persistAssessment = useCallback(async (a: Assessment) => {
    try {
      await db.put('assessments', a);
      await enqueue('assessment', a.id);
    } catch {
      /* memory fallback: state remains the source of truth */
    }
  }, []);

  const refreshCounts = useCallback(async () => {
    try {
      setPending(await pendingCount());
      setServerRecords(await serverRecordCount());
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [items, cfg, evidence] = await Promise.all([
          db.getAll<Assessment>('assessments'),
          loadSyncConfig(),
          db.getAll<EvidenceRecord>('evidence')
        ]);
        items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
        setAssessments(items);
        setEvidenceAll(evidence);
        setSyncConfigState(cfg);
        if (items[0]) setCurrentId(items[0].id);
      } catch {
        /* no persistence available */
      } finally {
        await refreshCounts();
        setReady(true);
      }
    })();
  }, [refreshCounts]);

  useEffect(() => {
    const on = () => setAssumeOnline(true);
    const off = () => setAssumeOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  useEffect(() => {
    assessmentsRef.current = assessments;
  }, [assessments]);

  const current = useMemo(() => assessments.find((a) => a.id === currentId), [assessments, currentId]);
  const evidenceForCurrent = useMemo(
    () => evidenceAll.filter((e) => e.assessmentId === currentId),
    [evidenceAll, currentId]
  );

  const mutateCurrent = useCallback(
    async (fn: (a: Assessment) => Assessment) => {
      const list = assessmentsRef.current;
      const idx = list.findIndex((a) => a.id === currentId);
      if (idx < 0) return;
      const next = fn(list[idx]);
      const copy = [...list];
      copy[idx] = next;
      assessmentsRef.current = copy;
      setAssessments(copy);
      await persistAssessment(next);
    },
    [currentId, persistAssessment]
  );

  const signIn = useCallback(async (init: Omit<AssessorSession, 'signedInAt'>) => {
    const full: AssessorSession = { ...init, signedInAt: new Date().toISOString() };
    setSession(full);
    saveSession(full);
  }, []);

  const signOut = useCallback(() => {
    setSession(undefined);
    saveSession(undefined);
  }, []);

  const createAssessment = useCallback(
    async (init: Partial<Assessment>) => {
      const now = new Date().toISOString();
      const a: Assessment = {
        id: newId('asmt'),
        workerName: init.workerName ?? '',
        workerId: init.workerId ?? '',
        trade: init.trade ?? 'Electrician',
        location: init.location ?? '',
        createdAt: now,
        updatedAt: now,
        status: 'draft',
        tasks: {},
        offlineCreated: !assumeOnline,
        synced: false,
        ...init
      };
      assessmentsRef.current = [a, ...assessmentsRef.current];
      setAssessments(assessmentsRef.current);
      setCurrentId(a.id);
      await persistAssessment(a);
      await refreshCounts();
      return a;
    },
    [assumeOnline, persistAssessment, refreshCounts]
  );

  const openAssessment = useCallback(async (id: string) => {
    setCurrentId(id);
  }, []);

  const updateCurrent = useCallback(
    async (patch: Partial<Assessment>) => {
      await mutateCurrent((a) => ({ ...a, ...patch, updatedAt: new Date().toISOString() }));
    },
    [mutateCurrent]
  );

  const saveDeclaration = useCallback(
    async (answers: SelfDeclarationAnswers, matches: QPMatch[]) => {
      await mutateCurrent((a) => ({
        ...a,
        declaration: answers,
        matches,
        status: a.selectedQpId ? 'in_progress' : 'declared',
        updatedAt: new Date().toISOString()
      }));
    },
    [mutateCurrent]
  );

  const chooseQp = useCallback(
    async (qpId: string) => {
      await mutateCurrent((a) => ({
        ...a,
        selectedQpId: qpId,
        status: a.status === 'draft' ? 'in_progress' : a.status,
        updatedAt: new Date().toISOString()
      }));
    },
    [mutateCurrent]
  );

  const scoreCriterion = useCallback(
    async (taskId: string, criterionId: string, level: ScoreLevel, note?: string) => {
      await mutateCurrent((a) =>
        upsertTask(a, taskId, (t) => {
          const scores = t.scores.filter((s) => s.criterionId !== criterionId);
          scores.push({ criterionId, level, note });
          return { ...t, scores };
        })
      );
    },
    [mutateCurrent]
  );

  const setTaskEvidence = useCallback(
    async (taskId: string, evidenceIds: string[]) => {
      await mutateCurrent((a) => upsertTask(a, taskId, (t) => ({ ...t, evidenceIds })));
    },
    [mutateCurrent]
  );

  const markTaskComplete = useCallback(
    async (taskId: string, complete: boolean) => {
      await mutateCurrent((a) => upsertTask(a, taskId, (t) => ({ ...t, completed: complete })));
    },
    [mutateCurrent]
  );

  const attachEvidence = useCallback(
    async (rec: Omit<EvidenceRecord, 'id' | 'synced'>) => {
      const full: EvidenceRecord = { ...rec, id: newId('ev'), synced: false };
      setEvidenceAll((prev) => [...prev, full]);
      try {
        await db.put('evidence', full);
        await enqueue('evidence', full.id);
      } catch {
        /* ignore */
      }
      await refreshCounts();
      return full;
    },
    [refreshCounts]
  );

  const removeEvidence = useCallback(async (id: string) => {
    setEvidenceAll((prev) => prev.filter((e) => e.id !== id));
    try {
      await db.del('evidence', id);
      await db.del('syncQueue', id);
    } catch {
      /* ignore */
    }
  }, []);

  const signOff = useCallback(
    async (assessorName: string, overrides: string) => {
      await mutateCurrent((a) => ({
        ...a,
        assessorName,
        assessorOverrides: overrides,
        assessorSignedAt: new Date().toISOString(),
        status: 'submitted',
        updatedAt: new Date().toISOString()
      }));
    },
    [mutateCurrent]
  );

  const setSyncConfig = useCallback(async (cfg: SyncConfig) => {
    setSyncConfigState(cfg);
    try {
      await saveSyncConfig(cfg);
    } catch {
      /* ignore */
    }
  }, []);

  const syncNow = useCallback(async () => {
    const result = await flushQueue(syncConfig, assumeOnline);
    setLastSync(new Date().toISOString());
    try {
      const items = await db.getAll<Assessment>('assessments');
      items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      assessmentsRef.current = items;
      setAssessments(items);
      setEvidenceAll(await db.getAll<EvidenceRecord>('evidence'));
    } catch {
      /* ignore */
    }
    await refreshCounts();
    return result;
  }, [syncConfig, assumeOnline, refreshCounts]);

  const resetDemo = useCallback(async () => {
    try {
      await Promise.all([
        db.clear('assessments'),
        db.clear('evidence'),
        db.clear('syncQueue'),
        db.clear('serverMirror')
      ]);
    } catch {
      /* ignore */
    }
    assessmentsRef.current = [];
    setAssessments([]);
    setEvidenceAll([]);
    setCurrentId(undefined);
    await refreshCounts();
  }, [refreshCounts]);

  const value: AppValue = {
    ready,
    session,
    assessments,
    current,
    evidenceForCurrent,
    syncConfig,
    assumeOnline,
    pending,
    serverRecords,
    lastSync,
    persistence,
    actions: {
      signIn,
      signOut,
      createAssessment,
      openAssessment,
      updateCurrent,
      saveDeclaration,
      chooseQp,
      scoreCriterion,
      setTaskEvidence,
      markTaskComplete,
      attachEvidence,
      removeEvidence,
      signOff,
      setSyncConfig,
      setAssumeOnline,
      syncNow,
      resetDemo
    }
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
