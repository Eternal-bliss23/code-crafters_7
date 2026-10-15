import { useMemo } from 'react';
import { useApp } from '../state';
import { getQP } from '../data/qp';
import { tagLabel } from '../data/questions';
import { mapToQualificationPacks, matchQualityLabel } from '../engine/mapping';
import { navigate } from '../lib/router';
import type { QPMatch } from '../types';
import { Badge, Callout, Card, ProgressBar } from './ui';
import { pct } from '../lib/format';

export function QPMapping() {
  const { current, actions } = useApp();

  const result = useMemo(() => {
    if (!current?.declaration) return undefined;
    return mapToQualificationPacks(current.declaration);
  }, [current?.declaration]);

  if (!current) {
    return (
      <Card title="No worker selected">
        <button className="btn" onClick={() => navigate('dashboard')}>Go to Dashboard</button>
      </Card>
    );
  }

  if (!result) {
    return (
      <Card title="Complete the self-declaration first">
        <p className="muted">The mapping engine needs the worker's self-declaration answers.</p>
        <button className="btn" onClick={() => navigate('declare')}>Go to self-declaration</button>
      </Card>
    );
  }

  const select = async (m: QPMatch) => {
    await actions.chooseQp(m.qpId);
    navigate('practical');
  };

  return (
    <div className="stack">
      <Card
        title="NSQF qualification-pack mapping"
        subtitle={`Estimated level from self-declaration: NSQF ${result.estimatedLevel}. Ranked against the QP library.`}
      >
        <Callout>
          The mapping engine scores the self-declaration against each qualification pack's skill tags, tools and
          expected experience. It proposes candidates; the assessor confirms the correct pack and NSQF level.
        </Callout>
        <div className="grid cols-3" style={{ marginTop: 12 }}>
          <div className="stat"><div className="k">Declared skill tags</div><div className="v">{result.profile.tags.length}</div></div>
          <div className="stat"><div className="k">Years of experience</div><div className="v">{result.profile.years}</div></div>
          <div className="stat"><div className="k">Reported complexity</div><div className="v">{result.profile.complexity}<small> / 4</small></div></div>
        </div>
      </Card>

      {result.matches.map((m) => {
        const qp = getQP(m.qpId);
        if (!qp) return null;
        const selected = current.selectedQpId === qp.id;
        return (
          <Card
            key={m.qpId}
            title={
              <span className="row" style={{ gap: 8 }}>
                {qp.title} <Badge tone={m.confidence}>{matchQualityLabel(m)}</Badge>
                {selected && <Badge tone="info">Selected</Badge>}
              </span>
            }
            subtitle={`${qp.code} · NSQF Level ${qp.nsqfLevel} · ${qp.sector} · ~${qp.indicativeHours} hrs`}
            actions={
              <button className={`btn ${selected ? 'secondary' : ''} sm`} onClick={() => select(m)}>
                {selected ? 'Selected' : 'Select & assess'}
              </button>
            }
          >
            <div className="row" style={{ gap: 12, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <ProgressBar value={m.score} tone={m.confidence === 'high' ? 'green' : m.confidence === 'medium' ? 'amber' : 'red'} />
              </div>
              <strong>{pct(m.score)}</strong>
            </div>

            <table className="tbl">
              <thead>
                <tr><th>Factor</th><th>Detail</th><th style={{ textAlign: 'right' }}>Points</th></tr>
              </thead>
              <tbody>
                {m.reasons.filter((r) => r.contribution > 0).map((r) => (
                  <tr key={r.label}>
                    <td>{r.label}</td>
                    <td className="muted">{r.detail}</td>
                    <td style={{ textAlign: 'right' }}>{r.contribution.toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ marginTop: 12 }}>
              <div className="hint" style={{ marginBottom: 4 }}>Skills evidenced ({m.matchedTags.length})</div>
              <div className="pill-row">
                {m.matchedTags.map((t) => <span className="pill on" key={t}>{tagLabel(t)}</span>)}
              </div>
            </div>
            {m.missingTags.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <div className="hint" style={{ marginBottom: 4 }}>Skills this pack expects that were not declared ({m.missingTags.length})</div>
                <div className="pill-row">
                  {m.missingTags.map((t) => <span className="pill off" key={t}>{tagLabel(t)}</span>)}
                </div>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
