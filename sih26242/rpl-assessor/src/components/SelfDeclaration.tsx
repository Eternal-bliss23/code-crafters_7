import { useMemo, useState } from 'react';
import { useApp } from '../state';
import { QUESTIONS, type Option, type Question } from '../data/questions';
import { mapToQualificationPacks } from '../engine/mapping';
import { navigate } from '../lib/router';
import type { SelfDeclarationAnswers } from '../types';
import { Card, Callout } from './ui';
import { StateDistrictSelects, type StateDistrictValue } from './StateDistrict';
import { formatLocation, parseLocation } from '../data/geo';

const DEFAULTS: SelfDeclarationAnswers = {
  yearsExperience: '',
  learningRoute: '',
  activities: [],
  tools: [],
  priorCredential: '',
  taskComplexity: '',
  tradeFocus: ''
};

export function SelfDeclaration() {
  const { current, actions } = useApp();
  const [answers, setAnswers] = useState<SelfDeclarationAnswers>(current?.declaration ?? DEFAULTS);
  const [identity, setIdentity] = useState({
    workerName: current?.workerName ?? '',
    workerId: current?.workerId ?? '',
    location: current?.location ?? ''
  });
  const [geo, setGeo] = useState<StateDistrictValue>(() => parseLocation(current?.location ?? ''));
  const [error, setError] = useState<string>();

  const complete = useMemo(() => {
    return (
      !!identity.workerName &&
      !!answers.tradeFocus &&
      !!answers.yearsExperience &&
      !!answers.learningRoute &&
      answers.activities.length > 0 &&
      !!answers.priorCredential &&
      !!answers.taskComplexity
    );
  }, [identity.workerName, answers]);

  if (!current) {
    return (
      <Card title="Start with a worker record">
        <p className="muted">Create a worker assessment first from the Dashboard, then complete the self-declaration.</p>
        <button className="btn" onClick={() => navigate('dashboard')}>Go to Dashboard</button>
      </Card>
    );
  }

  const setSingle = (id: Question['id'], value: string) =>
    setAnswers((a) => ({ ...a, [id]: value } as SelfDeclarationAnswers));

  const toggleMulti = (id: 'activities' | 'tools', value: string) =>
    setAnswers((a) => {
      const list = a[id];
      const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
      return { ...a, [id]: next };
    });

  const isMulti = (q: Question) => q.id === 'activities' || q.id === 'tools';

  const submit = async () => {
    if (!complete) {
      setError('Please answer every question and enter the worker name.');
      return;
    }
    setError(undefined);
    const location = geo.state && geo.district ? formatLocation(geo.district, geo.state) : identity.location;
    await actions.updateCurrent({ ...identity, location });
    const { matches } = mapToQualificationPacks(answers);
    await actions.saveDeclaration(answers, matches);
    navigate('mapping');
  };

  return (
    <div className="stack">
      <Card
        title="Worker self-declaration"
        subtitle="A structured interview of the worker's informal experience. Answers drive the NSQF qualification-pack match."
      >
        <Callout>
          This is a guided self-declaration, not a test. The worker describes what they actually do; the tool maps it
          to the closest NSQF qualification packs. The assessor confirms the match later.
        </Callout>
      </Card>

      <Card title="Worker details">
        <div className="grid cols-2">
          <label className="field">
            <span>Worker name</span>
            <input
              type="text"
              value={identity.workerName}
              placeholder="e.g. Ramesh Kumar"
              onChange={(e) => setIdentity((s) => ({ ...s, workerName: e.target.value }))}
            />
          </label>
          <label className="field">
            <span>Worker ID / reference (optional)</span>
            <input
              type="text"
              value={identity.workerId}
              placeholder="e.g. RPL-2026-00187"
              onChange={(e) => setIdentity((s) => ({ ...s, workerId: e.target.value }))}
            />
          </label>
        </div>
        <StateDistrictSelects value={geo} onChange={setGeo} stateLabel="State / UT" districtLabel="District / location" />
      </Card>

      {QUESTIONS.map((q) => (
        <Card key={q.id} title={q.prompt} subtitle={q.help}>
          <div className={q.options.length > 5 ? 'grid cols-2' : 'stack'} style={{ gap: 8 }}>
            {q.options.map((opt: Option) => {
              const multi = isMulti(q);
              const selected = multi
                ? (answers[q.id] as string[]).includes(opt.id)
                : answers[q.id] === opt.id;
              return (
                <label key={opt.id} className={`choice ${selected ? 'selected' : ''}`}>
                  <input
                    type={multi ? 'checkbox' : 'radio'}
                    name={q.id}
                    checked={selected}
                    onChange={() =>
                      multi ? toggleMulti(q.id as 'activities' | 'tools', opt.id) : setSingle(q.id, opt.id)
                    }
                  />
                  <span className="t">{opt.label}</span>
                </label>
              );
            })}
          </div>
        </Card>
      ))}

      {error && <Callout tone="stop">{error}</Callout>}

      <div className="row end">
        <button className="btn secondary" onClick={() => navigate('dashboard')}>Cancel</button>
        <button className="btn" onClick={submit} disabled={!complete}>
          Map to qualification packs
        </button>
      </div>
    </div>
  );
}
