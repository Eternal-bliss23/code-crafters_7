import { useApp } from '../state';
import { getQP } from '../data/qp';
import { navigate } from '../lib/router';
import { EvidenceCapture, EvidenceStrip } from './EvidenceCapture';
import { Badge, Callout, Card, ProgressBar } from './ui';

const EVIDENCE_LABEL: Record<string, string> = {
  photo: 'Photo evidence',
  video: 'Video evidence',
  audio: 'Audio evidence',
  measurement: 'Instrument reading + optional photo',
  observation: 'Direct observation (assessor)'
};

export function PracticalAssessment() {
  const { current, evidenceForCurrent, actions } = useApp();
  const qp = getQP(current?.selectedQpId);

  if (!current || !qp) {
    return (
      <Card title="Select a qualification pack first">
        <p className="muted">Choose the NSQF qualification pack from the mapping step before running the practical assessment.</p>
        <button className="btn" onClick={() => navigate('mapping')}>Go to mapping</button>
      </Card>
    );
  }

  const withEvidence = qp.tasks.filter((t) => (current.tasks[t.id]?.evidenceIds?.length ?? 0) > 0);
  const progress = qp.tasks.length ? withEvidence.length / qp.tasks.length : 0;

  const attach = async (taskId: string, evidenceId: string) => {
    const existing = current.tasks[taskId]?.evidenceIds ?? [];
    if (!existing.includes(evidenceId)) {
      await actions.setTaskEvidence(taskId, [...existing, evidenceId]);
    }
  };

  const detach = async (taskId: string, evidenceId: string) => {
    const existing = current.tasks[taskId]?.evidenceIds ?? [];
    await actions.setTaskEvidence(taskId, existing.filter((id) => id !== evidenceId));
    await actions.removeEvidence(evidenceId);
  };

  return (
    <div className="stack">
      <Card
        title="Guided practical assessment"
        subtitle={`${qp.title} · ${qp.code} · NSQF Level ${qp.nsqfLevel}`}
      >
        <Callout>
          Each task lists what the assessor must observe and what evidence to capture. Evidence is an aid: it helps a
          remote or off-site assessor score consistently. The final score is always the assessor's.
        </Callout>
        <div className="row" style={{ gap: 14, marginTop: 12 }}>
          <div style={{ flex: 1 }}><ProgressBar value={progress} /></div>
          <span className="hint">{withEvidence.length} of {qp.tasks.length} tasks have evidence</span>
        </div>
      </Card>

      {qp.nos.map((nos) => {
        const tasks = qp.tasks.filter((t) => t.nosId === nos.id);
        if (!tasks.length) return null;
        return (
          <div key={nos.id}>
            <h3 style={{ margin: '4px 2px 10px' }}>
              <span className="mono">{nos.code}</span> · {nos.title}
            </h3>
            {tasks.map((task) => {
              const ta = current.tasks[task.id];
              const items = evidenceForCurrent.filter((e) => e.taskId === task.id);
              const done = (ta?.evidenceIds?.length ?? 0) > 0;
              return (
                <div className={`task-block ${done ? 'done' : ''}`} key={task.id}>
                  <div className="row between">
                    <h3 style={{ margin: 0 }}>{task.title}</h3>
                    <Badge tone={done ? 'competent' : 'not_assessed'}>
                      {done ? 'Evidence ready' : 'Not started'}
                    </Badge>
                  </div>
                  <p className="muted" style={{ marginTop: 6 }}>{task.instruction}</p>
                  <p className="hint">Preferred evidence: {EVIDENCE_LABEL[task.evidenceType]}</p>

                  <div style={{ marginTop: 8 }}>
                    <strong style={{ fontSize: 13 }}>Assessor checklist (what good looks like)</strong>
                    <ul style={{ margin: '6px 0 0', paddingLeft: 20, fontSize: 13 }}>
                      {task.rubric.map((c) => (
                        <li key={c.id}>
                          {c.label}
                          {c.critical && <span style={{ color: 'var(--red)', fontWeight: 700 }}> · critical</span>}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div style={{ marginTop: 12 }}>
                    <EvidenceCapture
                      assessmentId={current.id}
                      taskId={task.id}
                      type={task.evidenceType}
                      onCaptured={(rec) => attach(task.id, rec.id)}
                    />
                    <EvidenceStrip items={items} onRemove={(id) => detach(task.id, id)} />
                  </div>

                  <div className="row end" style={{ marginTop: 10 }}>
                    <button
                      className="btn ghost sm"
                      onClick={() => actions.markTaskComplete(task.id, !ta?.completed)}
                    >
                      {ta?.completed ? 'Mark as not ready' : 'Mark ready for scoring'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}

      <div className="row end">
        <button className="btn" onClick={() => navigate('scoring')}>Continue to assessor scoring</button>
      </div>
    </div>
  );
}
