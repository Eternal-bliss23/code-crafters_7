import { useState } from 'react';
import { QUALIFICATION_PACKS } from '../data/qp';
import { runAgreementStudy } from '../engine/agreement';
import { Badge, Callout, Card, ProgressBar, Stat } from './ui';
import { pct } from '../lib/format';

function kappaLabel(k: number): string {
  if (k >= 0.8) return 'almost perfect';
  if (k >= 0.6) return 'substantial';
  if (k >= 0.4) return 'moderate';
  if (k >= 0.2) return 'fair';
  if (k > 0) return 'slight';
  return 'poor';
}

export function AgreementTest() {
  const [assessors, setAssessors] = useState(5);
  const qp = QUALIFICATION_PACKS.find((q) => q.id === 'ELE-Q0101') ?? QUALIFICATION_PACKS[0];
  const [run, setRun] = useState(() => runAgreementStudy(qp, { assessors: 5 }));

  const rerun = (n: number) => {
    setAssessors(n);
    setRun(runAgreementStudy(qp, { assessors: n }));
  };

  const delta = run.assisted.fleissKappa - run.unassisted.fleissKappa;
  const deltaAgree = run.assisted.percentAgreement - run.unassisted.percentAgreement;

  return (
    <div className="stack">
      <Card
        title="Inter-assessor agreement study"
        subtitle={`Test set: ${run.cases} synthetic attempts across ${run.items} rubric items · trade: ${qp.title}`}
      >
        <Callout tone="warn">
          <strong>Simulation, clearly labelled.</strong> Human assessor behaviour is modelled with a persistent
          leniency/strictness bias plus per-item noise. The <em>method</em> (Fleiss' kappa, Cohen's kappa vs a
          referent, pairwise agreement) is the real validation method - replace the simulated scores with recorded
          human scores to obtain a real result.
        </Callout>
        <div className="row between" style={{ marginTop: 12 }}>
          <label className="row" style={{ gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Assessors</span>
            <input
              type="range"
              min={3}
              max={8}
              value={assessors}
              onChange={(e) => rerun(Number(e.target.value))}
            />
            <strong>{assessors}</strong>
          </label>
          <button className="btn secondary sm" onClick={() => rerun(assessors)}>Re-run</button>
        </div>
      </Card>

      <div className="grid cols-2">
        {[run.unassisted, run.assisted].map((r) => (
          <Card
            key={r.mode}
            title={r.mode === 'assisted' ? 'With tool-assisted rubric' : 'Unassisted manual scoring'}
            actions={<Badge tone={r.mode === 'assisted' ? 'recommend' : 'not_yet'}>{r.mode}</Badge>}
          >
            <div className="stack">
              <div>
                <div className="row between"><span className="hint">Mean pairwise agreement</span><strong>{pct(r.percentAgreement)}</strong></div>
                <ProgressBar value={r.percentAgreement} tone={r.percentAgreement >= 0.6 ? 'green' : 'amber'} />
              </div>
              <div>
                <div className="row between"><span className="hint">Fleiss' kappa ({kappaLabel(r.fleissKappa)})</span><strong>{r.fleissKappa.toFixed(3)}</strong></div>
                <ProgressBar value={Math.max(0, r.fleissKappa)} tone={r.fleissKappa >= 0.6 ? 'green' : r.fleissKappa >= 0.4 ? 'amber' : 'red'} />
              </div>
              <Stat k="Cohen's kappa vs referent" v={r.cohensKappaVsExpert.toFixed(3)} />
              <Stat k="Mean absolute error (levels)" v={r.meanAbsError.toFixed(3)} sub="0-3 scale" />
            </div>
          </Card>
        ))}
      </div>

      <Card title="Result">
        <div className="grid cols-3">
          <Stat k="Agreement gain" v={<span style={{ color: deltaAgree >= 0 ? 'var(--green)' : 'var(--red)' }}>{pct(deltaAgree)}</span>} />
          <Stat k="Fleiss' kappa gain" v={<span style={{ color: delta >= 0 ? 'var(--green)' : 'var(--red)' }}>{delta.toFixed(3)}</span>} />
          <Stat k="Error reduction" v={pct((run.unassisted.meanAbsError - run.assisted.meanAbsError) / Math.max(1e-6, run.unassisted.meanAbsError))} />
        </div>
        <p className="muted" style={{ marginTop: 12 }}>
          Anchored rubric descriptors plus the assistive pre-score reduce both the systematic bias and the per-item
          noise in scoring, which raises agreement between assessors and against the referent. In production this
          screen is populated with scores from a real multi-assessor test set to provide the evidence required for
          the RPL outcome.
        </p>
      </Card>
    </div>
  );
}
