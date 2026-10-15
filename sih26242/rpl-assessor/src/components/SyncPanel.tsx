import { useEffect, useState } from 'react';
import { useApp } from '../state';
import { navigate } from '../lib/router';
import { Badge, Callout, Card, Stat } from './ui';
import { relativeTime } from '../lib/format';
import type { FlushResult } from '../storage/sync';

export function SyncPanel() {
  const { assessments, syncConfig, assumeOnline, pending, serverRecords, lastSync, persistence, actions } = useApp();
  const [mode, setMode] = useState(syncConfig.mode);
  const [endpoint, setEndpoint] = useState(syncConfig.endpoint);
  const [toast, setToast] = useState<{ msg: string; err?: boolean }>();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setMode(syncConfig.mode);
    setEndpoint(syncConfig.endpoint);
  }, [syncConfig]);

  const flash = (msg: string, err = false) => {
    setToast({ msg, err });
    window.setTimeout(() => setToast(undefined), 3200);
  };

  const sync = async () => {
    setBusy(true);
    const res: FlushResult = await actions.syncNow();
    setBusy(false);
    if (res.stoppedReason) {
      flash(`Synced ${res.pushed}. ${res.remaining} still queued: ${res.stoppedReason}`, true);
    } else {
      flash(`Synced ${res.pushed} record(s). Queue is clear.`);
    }
  };

  return (
    <div className="stack">
      {toast && <div className={`toast ${toast.err ? 'err' : ''}`}>{toast.msg}</div>}

      <Card
        title="Offline capture & sync"
        subtitle={`Local persistence: ${persistence === 'indexeddb' ? 'IndexedDB on this device' : 'in-memory (session only)'}`}
      >
        <Callout>
          The tool is fully usable with no connectivity. Assessments and evidence are written to this device first and
          placed in a sync queue. When a connection returns, the queue is replayed in order with retries. Nothing is
          lost while offline.
        </Callout>
        <div className="grid cols-3" style={{ marginTop: 12 }}>
          <Stat k="Queued for sync" v={pending} />
          <Stat k="Records on server" v={serverRecords} />
          <Stat k="Last sync" v={lastSync ? relativeTime(lastSync) : 'never'} />
        </div>

        <div className="row between" style={{ marginTop: 14 }}>
          <div className={`conn ${assumeOnline ? '' : 'off'} `} style={{ background: assumeOnline ? 'var(--green-bg)' : 'var(--red-bg)', color: assumeOnline ? 'var(--green)' : 'var(--red)' }}>
            <span className="dot" style={{ background: assumeOnline ? 'var(--green)' : 'var(--red)' }} />
            {assumeOnline ? 'Connected' : 'Offline'}
          </div>
          <div className="row">
            <button className="btn ghost sm" onClick={() => actions.setAssumeOnline(!assumeOnline)}>
              Simulate {assumeOnline ? 'going offline' : 'reconnecting'}
            </button>
            <button className="btn" onClick={sync} disabled={busy}>
              {busy ? 'Syncing…' : 'Sync now'}
            </button>
          </div>
        </div>
      </Card>

      <Card title="Sync transport" subtitle="Demo uses a simulated server; point at a real endpoint for field use.">
        <div className="grid cols-2">
          <label className="field">
            <span>Transport mode</span>
            <select value={mode} onChange={(e) => setMode(e.target.value as typeof mode)}>
              <option value="simulated">Simulated server (in-browser)</option>
              <option value="http">HTTP REST endpoint</option>
            </select>
          </label>
          <label className="field">
            <span>Endpoint base URL</span>
            <input
              type="text"
              value={endpoint}
              placeholder="https://rpl-sync.example.gov.in/api"
              disabled={mode !== 'http'}
              onChange={(e) => setEndpoint(e.target.value)}
            />
          </label>
        </div>
        <div className="row end">
          <button className="btn secondary sm" onClick={() => actions.setSyncConfig({ mode, endpoint })}>
            Save transport settings
          </button>
        </div>
        <p className="hint">
          HTTP mode pushes assessments as JSON (PUT /assessments/:id) and evidence as multipart
          (POST /evidence/:id). Any server implementing those two routes will work.
        </p>
      </Card>

      <Card
        title="Assessments on this device"
        actions={<button className="btn danger sm" onClick={() => actions.resetDemo()}>Reset demo data</button>}
      >
        {assessments.length === 0 ? (
          <div className="empty">
            <h3>No assessments yet</h3>
            <button className="btn" onClick={() => navigate('dashboard')}>Create one</button>
          </div>
        ) : (
          <table className="tbl">
            <thead>
              <tr><th>Worker</th><th>Status</th><th>Local</th><th>Updated</th></tr>
            </thead>
            <tbody>
              {assessments.map((a) => (
                <tr key={a.id}>
                  <td>{a.workerName || <span className="muted">(unnamed)</span>}<br /><span className="mono muted">{a.id.slice(0, 12)}</span></td>
                  <td><Badge tone={a.status}>{a.status}</Badge></td>
                  <td>{a.synced ? <Badge tone="competent">synced</Badge> : <Badge tone="medium">local</Badge>}</td>
                  <td className="muted">{relativeTime(a.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
