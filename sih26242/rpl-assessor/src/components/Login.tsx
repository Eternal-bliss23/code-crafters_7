import { useState } from 'react';
import { useApp } from '../state';
import { Card, Callout } from './ui';
import { StateDistrictSelects, type StateDistrictValue } from './StateDistrict';

export function Login() {
  const { actions } = useApp();
  const [name, setName] = useState('');
  const [assessorId, setAssessorId] = useState('');
  const [geo, setGeo] = useState<StateDistrictValue>({ state: '', district: '' });
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const valid = name.trim().length > 1 && !!geo.state && !!geo.district;

  const submit = async () => {
    if (!valid) {
      setError('Enter your name, and select both a state/UT and a district.');
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      await actions.signIn({
        name: name.trim(),
        assessorId: assessorId.trim(),
        state: geo.state,
        district: geo.district
      });
    } catch {
      setError('Could not start the session. Please try again.');
      setBusy(false);
    }
  };

  return (
    <div className="main" style={{ maxWidth: 640 }}>
      <Card
        title="Assessor sign-in"
        subtitle="Identify the assessor for this session. This is stored on-device and stamps the assessments you sign."
      >
        <Callout>
          RPL Assessor keeps the human assessor in control. Your name and location are recorded for the audit trail;
          nothing is sent anywhere without a sync.
        </Callout>

        <div className="stack" style={{ marginTop: 16 }}>
          <div className="grid cols-2">
            <label className="field">
              <span>Assessor name</span>
              <input
                type="text"
                value={name}
                placeholder="e.g. Priya Sharma"
                autoFocus
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label className="field">
              <span>Assessor ID / registration (optional)</span>
              <input
                type="text"
                value={assessorId}
                placeholder="e.g. NCVET-AS-2026-0042"
                onChange={(e) => setAssessorId(e.target.value)}
              />
            </label>
          </div>

          <StateDistrictSelects value={geo} onChange={setGeo} />

          {error && <Callout tone="stop">{error}</Callout>}

          <div className="row end">
            <button className="btn" disabled={!valid || busy} onClick={submit}>
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </div>

          <p className="hint">
            Demo tool: the sign-in is a local profile, not an authenticated credential provider.
          </p>
        </div>
      </Card>
    </div>
  );
}
