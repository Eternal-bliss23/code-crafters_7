import { useState } from 'react';
import { useApp } from '../state';
import { getQP } from '../data/qp';
import { navigate, type Route } from '../lib/router';
import { computeCompetencyProfile } from '../engine/scoring';
import { Badge, Callout, Card, ProgressBar, Stat } from './ui';
import { relativeTime } from '../lib/format';
import { StateDistrictSelects, type StateDistrictValue } from './StateDistrict';
import { formatLocation } from '../data/geo';

const TRADES = ['Electrician', 'Solar PV Installer', 'Electrical Panel Technician'];

export function Dashboard() {
  const { assessments, current, pending, serverRecords, actions } = useApp();
  const [form, setForm] = useState({ workerName: '', workerId: '', trade: TRADES[0] });
  const [geo, setGeo] = useState<StateDistrictValue>({ state: '', district: '' });

  const create = async () => {
    if (!form.workerName.trim()) return;
    await actions.createAssessment({
      ...form,
      workerName: form.workerName.trim(),
      location: geo.state && geo.district ? formatLocation(geo.district, geo.state) : ''
    });
    navigate('declare');
  };

  const qp = getQP(current?.selectedQpId);
  const profile = current && qp ? computeCompetencyProfile(qp, current.tasks) : undefined;

  const steps: { key: Route; label: string; done: boolean }[] = [
    { key: 'declare', label: '1. Self-declaration', done: !!current?.declaration },
    { key: 'mapping', label: '2. QP mapping', done: !!current?.selectedQpId },
    { key: 'practical', label: '3. Practical & evidence', done: Object.values(current?.tasks ?? {}).some((t) => t.evidenceIds.length > 0) },
    { key: 'scoring', label: '4. Assessor scoring', done: Object.values(current?.tasks ?? {}).some((t) => t.scores.length > 0) },
    { key: 'profile', label: '5. Profile & sign-off', done: current?.status === 'submitted' }
  ];

  return (
    <div className="stack">
      <Card title="AI-assisted RPL assessment" subtitle="Recognition of Prior Learning against NSQF qualification packs">
        <Callout>
          Certify what an informal worker can already do - assessed against NSQF-aligned criteria, with the human
          assessor in control. Built for low-connectivity field use.
        </Callout>
        <div className="grid cols-4" style={{ marginTop: 14 }}>
          <Stat k="Assessments" v={assessments.length} />
          <Stat k="Queued for sync" v={pending} />
          <Stat k="On server" v={serverRecords} />
          <Stat k="Current result" v={profile ? `${(profile.overallNormalized * 100).toFixed(0)}%` : '—'} sub={profile ? profile.overallStatus.replace(/_/g, ' ') : ''} />
        </div>
      </Card>

      <div className="grid cols-2">
        <Card title="Register a worker for assessment">
          <div className="stack">
            <label className="field">
              <span>Worker name</span>
              <input type="text" value={form.workerName} placeholder="e.g. Ramesh Kumar" onChange={(e) => setForm((f) => ({ ...f, workerName: e.target.value }))} />
            </label>
            <label className="field">
              <span>Worker ID / reference (optional)</span>
              <input type="text" value={form.workerId} placeholder="RPL-2026-00187" onChange={(e) => setForm((f) => ({ ...f, workerId: e.target.value }))} />
            </label>
            <StateDistrictSelects value={geo} onChange={setGeo} stateLabel="State / UT" districtLabel="District / location" />
            <label className="field">
              <span>Trade</span>
              <select value={form.trade} onChange={(e) => setForm((f) => ({ ...f, trade: e.target.value }))}>
                {TRADES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </label>
            <button className="btn" disabled={!form.workerName.trim()} onClick={create}>Create & start self-declaration</button>
          </div>
        </Card>

        <Card
          title="Current assessment"
          actions={current ? <button className="btn ghost sm" onClick={() => navigate('declare')}>Open</button> : undefined}
        >
          {!current ? (
            <div className="empty"><h3>No assessment in progress</h3><p>Create one to begin.</p></div>
          ) : (
            <div className="stack">
              <div className="row between">
                <div>
                  <div style={{ fontWeight: 700 }}>{current.workerName || '(unnamed)'}</div>
                  <div className="muted">{current.location || 'location not set'} · {current.trade}</div>
                </div>
                <Badge tone={current.status === 'submitted' ? 'competent' : 'info'}>{current.status}</Badge>
              </div>
              {profile && (
                <div>
                  <div className="row between"><span className="hint">{profile.qpTitle}</span><strong>{(profile.overallNormalized * 100).toFixed(0)}%</strong></div>
                  <ProgressBar value={profile.overallNormalized} tone={profile.overallNormalized >= 0.7 ? 'green' : 'amber'} />
                </div>
              )}
              <div className="stack" style={{ gap: 4 }}>
                {steps.map((s) => (
                  <div className="row between" key={s.key} style={{ padding: '7px 0', borderBottom: '1px solid var(--slate-100)' }}>
                    <button className="btn ghost sm" onClick={() => navigate(s.key)}>{s.label}</button>
                    <Badge tone={s.done ? 'competent' : 'not_assessed'}>{s.done ? 'done' : 'pending'}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>

      <Card title="Recent assessments">
        {assessments.length === 0 ? (
          <p className="muted">None yet.</p>
        ) : (
          <table className="tbl">
            <thead><tr><th>Worker</th><th>Trade</th><th>Status</th><th>Updated</th><th></th></tr></thead>
            <tbody>
              {assessments.slice(0, 6).map((a) => (
                <tr key={a.id}>
                  <td>{a.workerName || '(unnamed)'}<br /><span className="mono muted">{a.id.slice(0, 12)}</span></td>
                  <td>{a.trade}</td>
                  <td><Badge tone={a.status === 'submitted' ? 'competent' : 'info'}>{a.status}</Badge></td>
                  <td className="muted">{relativeTime(a.updatedAt)}</td>
                  <td><button className="btn ghost sm" onClick={() => actions.openAssessment(a.id).then(() => navigate('profile'))}>View</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
