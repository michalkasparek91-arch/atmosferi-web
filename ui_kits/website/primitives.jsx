// Atmosferi primitives — shared UI atoms. Exported to window for cross-file use.

function Wordmark({ onClick, size = 22, color }) {
  return (
    <span className="wordmark" style={{ fontSize: size, color }} onClick={onClick}>
      Atmosferi<sup>°</sup>
    </span>
  );
}

function Eyebrow({ children, style }) {
  return <span className="eyebrow" style={style}>{children}</span>;
}

function Horizon({ style }) {
  return <div className="horizon" style={style} />;
}

// Braun/Linear hardware toggle. Controlled.
function Toggle({ pressed, onChange, label }) {
  return (
    <button className="toggle" aria-pressed={pressed} onClick={() => onChange(!pressed)}>
      {label && <span className="navlink" style={{ color: pressed ? 'var(--ink)' : undefined }}>{label}</span>}
      <span className="toggle__track"><span className="toggle__knob" /></span>
    </button>
  );
}

function Button({ children, ghost, onClick, style }) {
  return (
    <button className={'btn' + (ghost ? ' btn--ghost' : '')} style={style} onClick={onClick}>
      {children}
    </button>
  );
}

// Arrow link that nudges on hover.
function ArrowLink({ children, onClick, style }) {
  const [h, setH] = React.useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ background: 'none', border: 0, cursor: 'pointer', padding: '14px 0',
        display: 'inline-flex', gap: 12, alignItems: 'center',
        fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.2em',
        textTransform: 'uppercase', color: 'var(--ink)', ...style }}>
      {children}
      <span style={{ display: 'inline-block', transition: 'transform var(--dur-standard) var(--curve)',
        transform: h ? 'translateX(6px)' : 'none' }}>→</span>
    </button>
  );
}

Object.assign(window, { Wordmark, Eyebrow, Horizon, Toggle, Button, ArrowLink });
