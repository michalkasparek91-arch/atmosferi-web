// Hero — editorial silence + macro/micro tension.
function Hero({ onNavigate }) {
  return (
    <header>
      <div className="wrap" style={{ paddingTop: 'var(--space-8)', paddingBottom: 'var(--space-7)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
          borderBottom: '1px solid var(--line)', paddingBottom: 'var(--space-3)' }}>
          <Eyebrow>Atmospheric design studio</Eyebrow>
          <Eyebrow>Selected work · 2024—2026</Eyebrow>
        </div>

        <h1 style={{ margin: 'var(--space-6) 0 0', fontSize: 'var(--text-9xl)',
          fontWeight: 700, lineHeight: 'var(--leading-display)', letterSpacing: 'var(--track-display)' }}>
          Studio for<br />atmospheric<br />design<span style={{ fontWeight: 400 }}>°</span>
        </h1>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
          gap: 'var(--space-6)', marginTop: 'var(--space-6)', flexWrap: 'wrap' }}>
          <p style={{ maxWidth: 460, margin: 0, fontSize: 'var(--text-lg)', lineHeight: 'var(--leading-body)',
            color: 'var(--neutral-700)' }}>
            Film, identity, and spatial systems for people who measure light. We design
            the conditions, not the decoration.
          </p>
          <ArrowLink onClick={() => onNavigate('index')}>View the index</ArrowLink>
        </div>
      </div>

      <a className="reveal" style={{ height: '52vh', minHeight: 360 }}>
        <img src="https://picsum.photos/seed/atm-hero/1600/900" alt="" />
      </a>
    </header>
  );
}
window.Hero = Hero;
