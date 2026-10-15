import { useState } from 'react';
import { useApp } from '../state';
import { getQP } from '../data/qp';
import {
  computeCompetencyProfile,
  evidenceRatioFor,
  generateRecommendation,
  statusLabel,
  BOUNDARY_NOTICE
} from '../engine/scoring';
import { navigate } from '../lib/router';
import { Badge, Callout, Card, KV, ProgressBar, Stat } from './ui';
import { pct, round } from '../lib/format';

const DECISION_LABEL: Record<string, string> = {
  recommend: 'Recommend for certification',
  recommend_with_gaps: 'Recommend with gaps to confirm',
  not_yet: 'Not yet competent - assess again after gap training'
};

export function CompetencyProfileView() {
  const { current, evidenceForCurrent, actions } = useApp();
  const [assessorName, setAssessorName] = useState(current?.assessorName ?? '');
  const [overrides, setOverrides] = useState(current?.assessorOverrides ?? '');
  const qp = getQP(current?.selectedQpId);

  if (!current || !qp) {
    return (
      <Card title="Nothing to profile yet">
        <button className="btn" onClick={() => navigate('mapping')}>Go to mapping</button>
      </Card>
    );
  }

  const profile = computeCompetencyProfile(qp, current.tasks);
  const evidenceRatio = evidenceRatioFor(qp, current.tasks);
  const recommendation = generateRecommendation(profile, {
    evidenceRatio,
    assessorReviewed: !!current.assessorSignedAt
  });
  const signed = !!current.assessorSignedAt;

  const tone =
    recommendation.decision === 'recommend' ? 'recommend' :
    recommendation.decision === 'recommend_with_gaps' ? 'recommend_with_gaps' : 'not_yet';

  return (
    <div className="stack">
      <Card
        title="NSQF-aligned competency profile"
        subtitle={`${profile.qpTitle} · NSQF Level ${profile.nsqfLevel}`}
        actions={<Badge tone={profile.overallStatus}>{statusLabel(profile.overallStatus)}</Badge>}
      >
        <div className="grid cols-4">
          <Stat k="Overall score" v={pct(profile.overallNormalized)} sub="weighted" />
          <Stat k="NOS passed" v={`${profile.nos.filter((n) => n.status === 'competent' || n.status === 'proficient').length}/${profile.nos.length}`} />
          <Stat k="Evidence coverage" v={pct(evidenceRatio)} />
          <Stat k="Open gaps" v={profile.gaps.length} />
        </div>
        <div style={{ marginTop: 14 }}><ProgressBar value={profile.overallNormalized} tone={profile.overallNormalized >= 0.7 ? 'green' : profile.overallNormalized >= 0.5 ? 'amber' : 'red'} /></div>
      </Card>

      <Card title="Competency by National Occupational Standard">
        <table className="tbl">
          <thead>
            <tr><th>NOS</th><th>Score</th><th>Status</th><th>Critical failures</th></tr>
          </thead>
          <tbody>
            {profile.nos.map((n) => (
              <tr key={n.nosId}>
                <td><span className="mono">{n.code}</span><br /><span className="muted">{n.title}</span></td>
                <td>{round(n.normalized * 100, 1)}%</td>
                <td><Badge tone={n.status}>{statusLabel(n.status)}</Badge></td>
                <td>{n.failedCritical.length ? n.failedCritical.join('; ') : <span className="muted">—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {profile.gaps.length > 0 && (
        <Card title="Gaps to address">
          <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14 }}>
            {profile.gaps.map((g) => <li key={g}>{g}</li>)}
          </ul>
        </Card>
      )}

      <Card title="Certification recommendation">
        <div className="row between" style={{ marginBottom: 12 }}>
          <Badge tone={tone}>{DECISION_LABEL[recommendation.decision]}</Badge>
          <span className="hint">Tool confidence {pct(recommendation.confidence)}</span>
        </div>
        <div className="stack" style={{ gap: 6 }}>
          {recommendation.rationale.map((r, i) => <div key={i} style={{ fontSize: 13 }}>• {r}</div>)}
        </div>
        {recommendation.conditions.length > 0 && (
          <>
            <h3 style={{ marginTop: 14 }}>Conditions before sign-off</h3>
            <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13 }}>
              {recommendation.conditions.map((c, i) => <li key={i}>{c}</li>)}
            </ul>
          </>
        )}
        <Callout tone="warn" ><strong>Support, not replacement.</strong> {BOUNDARY_NOTICE}</Callout>
      </Card>

      <Card title="Assessor review & sign-off">
        {signed ? (
          <div className="stack">
            <Callout tone="info">
              Signed off by <strong>{current.assessorName}</strong> on {new Date(current.assessorSignedAt!).toLocaleString()}.
              This is the authoritative decision.
            </Callout>
            {current.assessorOverrides && <KV k="Assessor notes / overrides" v={current.assessorOverrides} />}
          </div>
        ) : (
          <div className="stack">
            <Callout>
              The recommendation above is advisory. Confirm it against the evidence and your professional judgement,
              then record your decision. Any overrides belong in the notes.
            </Callout>
            <label className="field">
              <span>Assessor name</span>
              <input type="text" value={assessorName} placeholder="Your name" onChange={(e) => setAssessorName(e.target.value)} />
            </label>
            <label className="field">
              <span>Assessor notes / overrides (optional)</span>
              <textarea
                value={overrides}
                placeholder="e.g. Accepted recommendation. Upgraded ELE-T3-r1 to 3 after observing a second test."
                onChange={(e) => setOverrides(e.target.value)}
              />
            </label>
            <div className="row end">
              <button
                className="btn"
                disabled={!assessorName.trim() || evidenceForCurrent.length === 0}
                onClick={() => actions.signOff(assessorName.trim(), overrides.trim())}
              >
                Sign off assessment
              </button>
            </div>
            {evidenceForCurrent.length === 0 && (
              <p className="hint" style={{ color: 'var(--red)' }}>At least one evidence item must be attached before sign-off.</p>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
