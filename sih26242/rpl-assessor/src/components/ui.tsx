import type { ReactNode } from 'react';

export function Card({
  title,
  subtitle,
  actions,
  children,
  className
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`card ${className ?? ''}`}>
      {(title || actions) && (
        <div className="row between" style={{ marginBottom: title ? 12 : 0 }}>
          <div>
            {title && <h2>{title}</h2>}
            {subtitle && <div className="muted">{subtitle}</div>}
          </div>
          {actions && <div className="row">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function Badge({ tone = '', children }: { tone?: string; children: ReactNode }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

export function Stat({ k, v, sub }: { k: string; v: ReactNode; sub?: ReactNode }) {
  return (
    <div className="stat">
      <div className="k">{k}</div>
      <div className="v">
        {v} {sub && <small>{sub}</small>}
      </div>
    </div>
  );
}

export function ProgressBar({ value, tone = '' }: { value: number; tone?: '' | 'green' | 'amber' | 'red' }) {
  const clamped = Math.max(0, Math.min(1, value));
  return (
    <div className={`progress ${tone}`} role="progressbar" aria-valuenow={Math.round(clamped * 100)} aria-valuemin={0} aria-valuemax={100}>
      <span style={{ width: `${clamped * 100}%` }} />
    </div>
  );
}

export function Callout({ tone = '', children }: { tone?: '' | 'warn' | 'stop' | 'info'; children: ReactNode }) {
  return <div className={`callout ${tone}`}>{children}</div>;
}

export function KV({ k, v }: { k: ReactNode; v: ReactNode }) {
  return (
    <div className="kv">
      <span className="k">{k}</span>
      <span className="v">{v}</span>
    </div>
  );
}
