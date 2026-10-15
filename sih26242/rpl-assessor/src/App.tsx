import { useEffect, useState } from 'react';
import { useApp } from './state';
import { navigate, useHashRoute, type Route } from './lib/router';
import { Dashboard } from './components/Dashboard';
import { SelfDeclaration } from './components/SelfDeclaration';
import { QPMapping } from './components/QPMapping';
import { PracticalAssessment } from './components/PracticalAssessment';
import { AssessorScoring } from './components/AssessorScoring';
import { CompetencyProfileView } from './components/CompetencyProfileView';
import { AgreementTest } from './components/AgreementTest';
import { SyncPanel } from './components/SyncPanel';
import { About } from './components/About';
import { Login } from './components/Login';

const NAV: { route: Route; label: string }[] = [
  { route: 'dashboard', label: 'Dashboard' },
  { route: 'declare', label: 'Self-declaration' },
  { route: 'mapping', label: 'QP mapping' },
  { route: 'practical', label: 'Practical' },
  { route: 'scoring', label: 'Scoring' },
  { route: 'profile', label: 'Profile' },
  { route: 'consistency', label: 'Consistency' },
  { route: 'sync', label: 'Offline & sync' },
  { route: 'about', label: 'About / boundaries' }
];

const FONT_STEPS: { label: string; value: number }[] = [
  { label: 'A-', value: 0.9 },
  { label: 'A', value: 1 },
  { label: 'A+', value: 1.15 }
];

function View({ route }: { route: Route }) {
  switch (route) {
    case 'declare': return <SelfDeclaration />;
    case 'mapping': return <QPMapping />;
    case 'practical': return <PracticalAssessment />;
    case 'scoring': return <AssessorScoring />;
    case 'profile': return <CompetencyProfileView />;
    case 'consistency': return <AgreementTest />;
    case 'sync': return <SyncPanel />;
    case 'about': return <About />;
    default: return <Dashboard />;
  }
}

export default function App() {
  const route = useHashRoute();
  const { assumeOnline, pending, session, actions } = useApp();
  const [toast, setToast] = useState<{ msg: string; err?: boolean }>();
  const [fontScale, setFontScale] = useState(1);

  useEffect(() => {
    document.body.style.zoom = fontScale === 1 ? '' : String(fontScale);
  }, [fontScale]);

  const flash = (msg: string, err = false) => {
    setToast({ msg, err });
    window.setTimeout(() => setToast(undefined), 3000);
  };

  const quickSync = async () => {
    const res = await actions.syncNow();
    if (res.stoppedReason) flash(`Synced ${res.pushed}. ${res.remaining} queued (${res.stoppedReason})`, true);
    else flash(`Synced ${res.pushed} record(s). Queue clear.`);
  };

  const signOut = () => {
    actions.signOut();
    navigate('dashboard');
  };

  return (
    <div className="app">
      <a className="skip-link" href="#main-content">Skip to main content</a>

      <div className="gov-utility">
        <div className="gov-utility-inner">
          <span className="gov-utility-note">
            Demonstration interface — not an official Government of India website
          </span>
          <div className="gov-utility-tools">
            <span className="lbl">Text size</span>
            {FONT_STEPS.map((s) => (
              <button
                key={s.label}
                aria-label={`Set text size ${s.label}`}
                aria-pressed={fontScale === s.value}
                onClick={() => setFontScale(s.value)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <header className="app-header">
        <div className="app-header-inner">
          <div className="brand">
            <img src="./icons/icon.svg" alt="" />
            <div>
              RPL Assessor
              <small>NSQF-aligned prior learning assessment</small>
            </div>
          </div>
          <div className="header-spacer" />
          <div className="header-tools">
            <span className={`conn ${assumeOnline ? '' : 'off'}`}>
              <span className="dot" />
              {assumeOnline ? 'Online' : 'Offline'}
            </span>
            {session && (
              <>
                <span className="conn" title={`${session.district}, ${session.state}`}>
                  {session.name} · {session.district}
                </span>
                <button className="btn-header" onClick={quickSync}>
                  Sync{pending > 0 ? ` (${pending})` : ''}
                </button>
                <button className="btn-header" onClick={signOut}>Sign out</button>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="tricolor" />

      {!session ? (
        <Login />
      ) : (
        <>
          <nav className="nav">
            <div className="nav-inner">
              {NAV.map((n) => (
                <button
                  key={n.route}
                  className={route === n.route ? 'active' : ''}
                  onClick={() => navigate(n.route)}
                >
                  {n.label}
                </button>
              ))}
            </div>
          </nav>

          <main className="main" id="main-content">
            <View route={route} />
          </main>
        </>
      )}

      <footer className="gov-footer">
        <div className="gov-footer-inner">
          <div>
            <h4>RPL Assessor</h4>
            <p>
              AI-assisted, NSQF-aligned recognition of prior learning. It supports the assessor — it never
              replaces human judgement or the awarding body.
            </p>
            <p>
              This is a demonstration tool. It is <strong>not</strong> an official Government of India, NCVET or
              NSDC website, and qualification-pack content shown is illustrative.
            </p>
          </div>
          <div>
            <h4>Navigate</h4>
            <ul>
              <li><a href="#/dashboard">Dashboard</a></li>
              <li><a href="#/declare">Self-declaration</a></li>
              <li><a href="#/about">About / boundaries</a></li>
            </ul>
          </div>
          <div>
            <h4>Please note</h4>
            <p>
              Sign-in is a local on-device profile, not an authenticated credential provider. Assessment data stays
              on this device unless you choose to sync.
            </p>
          </div>
        </div>
        <div className="gov-footer-bottom">
          <div className="gov-footer-bottom-inner">
            <span>© 2026 RPL Assessor — demonstration build.</span>
            <button className="linklike" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              Go to top
            </button>
          </div>
        </div>
      </footer>

      {toast && <div className={`toast ${toast.err ? 'err' : ''}`}>{toast.msg}</div>}
    </div>
  );
}
