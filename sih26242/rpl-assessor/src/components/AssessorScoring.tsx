import { useState } from 'react';
import { useApp } from '../state';
import { getQP } from '../data/qp';
import { suggestScore } from '../engine/assist';
import { computeCompetencyProfile, statusLabel } from '../engine/scoring';
import { navigate } from '../lib/router';
import type { ScoreLevel } from '../types';
import { EvidenceStrip } from './EvidenceCapture';
import { Badge, Callout, Card, ProgressBar } from './ui';
import { pct } from '../lib/format';

export function AssessorScoring() {
  const { current, evidenceForCurrent, actions } = useApp();
  const [showHints, setShowHints] = useState(true);
  const qp = getQP(current?.selectedQpId);

  if (!current || !qp) {
    return (
      <Card title="No qualification pack selected">
        <button className="btn" onClick={() => navigate('mapping')}>Go to mapping</button>
      </Card>
    );
  }

  const profile = computeCompetencyProfile(qp, current.tasks);
  const scoredCount = qp.tasks.flatMap((t) => t.rubric).filter((c) =>
    qp.tasks.some((t) => current.tasks[t.id]?.scores.some((s) => s.criterionId === c.id))
  ).length;
  const totalCriteria = qp.tasks.flatMap((t) => t.rubric).length;

  return (
    <div className="stack">
      <Card
        title="Assessor scoring interface"
        subtitle={`${qp.title} · ${qp.code}`}
        actions={
          <label className="row" style={{ gap: 6, fontSize: 13 }}>
            <input type="checkbox" checked={showHints} onChange={(e) => setShowHints(e.target.checked)} />
            Show assistive pre-score
          </label>
        }
      >
        <Callout tone="warn">
          <strong>Assessor authority:</strong> the tool suggests a starting score and standardises the rubric. You may
          override every value. Nothing here is auto-submitted; the competency profile and recommendation are advisory.
        </Callout>
        <div className="row" style={{ gap: 14, marginTop: 12 }}>
          <div style={{ flex: 1 }}><ProgressBar value={totalCriteria ? scoredCount / totalCriteria : 0} /></div>
          <span className="hint">{scoredCount} / {totalCriteria} criteria scored · running result {pct(profile.overallNormalized)}</span>
          <Badge tone={profile.overallStatus}>{statusLabel(profile.overallStatus)}</Badge>
        </div>
      </Card>

      {qp.tasks.map((task) => {
        const ta = current.tasks[task.id];
        const items = evidenceForCurrent.filter((e) => e.taskId === task.id);
        return (
          <Card key={task.id} title={task.title} subtitle={qp.nos.find((n) => n.id === task.nosId)?.code}>
            {items.length > 0 ? (
              <EvidenceStrip items={items} />
            ) : (
              <p className="hint" style={{ marginBottom: 8 }}>No evidence captured for this task.</p>
            )}

            {task.rubric.map((crit) => {
              const currentScore = ta?.scores.find((s) => s.criterionId === crit.id);
              const suggestion = suggestScore({
                criterion: crit,
                hasEvidence: items.length > 0,
                evidenceCount: items.length
              });
              return (
                <div className="crit" key={crit.id}>
                  <div className="crit-label">
                    {crit.label}
                    {crit.critical && <span className="req">critical</span>}
                  </div>
                  <div className="score-group">
                    {crit.levels.labels.map((label, idx) => {
                      const level = idx as ScoreLevel;
                      const selected = currentScore?.level === level;
                      return (
                        <button
                          type="button"
                          key={label}
                          className={`score-btn ${selected ? 'selected' : ''}`}
                          onClick={() => actions.scoreCriterion(task.id, crit.id, level)}
                          aria-pressed={selected}
                        >
                          <span className="lvl">{label} ({level})</span>
                          <span className="desc">{crit.levels.descriptors[idx]}</span>
                        </button>
                      );
                    })}
                  </div>
                  {showHints && (
                    <div className="row" style={{ marginTop: 8, gap: 8 }}>
                      <Badge tone="info">Assistive pre-score {suggestion.level} · {pct(suggestion.confidence)}</Badge>
                      <span className="hint">{suggestion.rationale.join(' ')}</span>
                      <button
                        className="btn ghost sm"
                        onClick={() => actions.scoreCriterion(task.id, crit.id, suggestion.level)}
                      >
                        Use suggestion
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </Card>
        );
      })}

      <div className="row end">
        <button className="btn secondary" onClick={() => navigate('practical')}>Back to evidence</button>
        <button className="btn" onClick={() => navigate('profile')}>View competency profile</button>
      </div>
    </div>
  );
}
