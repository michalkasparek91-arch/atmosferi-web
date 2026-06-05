// Studio / about — manifesto principles set in macro type.
function Studio() {
  const principles = [
    ['01', 'The Obsidian Palette', 'Off-white canvas, pure black ink. Color belongs to the photograph, never the interface.'],
    ['02', 'Typographic Tension', 'Concrete-block titles beside 9-pixel metadata. Scale carries the hierarchy.'],
    ['03', 'The Mathematical Grid', 'Hairlines at ten percent. Flush alignment. Nothing rounded, nothing soft.'],
    ['04', 'Precision Kinetics', 'One curve, high friction. Media reveals from grey to colour, never faster than it should.'],
  ];
  return (
    <section>
      <div className="wrap" style={{ paddingTop: 'var(--space-8)', paddingBottom: 'var(--space-6)' }}>
        <Eyebrow>The studio</Eyebrow>
        <h2 style={{ margin: 'var(--space-4) 0 0', fontSize: 'var(--text-7xl)', fontWeight: 700,
          lineHeight: 'var(--leading-tight)', letterSpacing: 'var(--track-display)', maxWidth: 900 }}>
          We design the conditions, not the decoration.
        </h2>
      </div>

      <a className="reveal" style={{ height: '46vh', minHeight: 320 }}>
        <img src="https://picsum.photos/seed/atm-studio/1600/800" alt="" />
      </a>

      <div className="wrap" style={{ paddingTop: 'var(--space-7)', paddingBottom: 'var(--space-8)' }}>
        <div style={{ borderTop: '1px solid var(--line)' }}>
          {principles.map(([n, t, d]) => (
            <div key={n} style={{ display: 'grid', gridTemplateColumns: '64px 1fr 1.2fr',
              gap: 'var(--space-5)', alignItems: 'baseline', padding: 'var(--space-5) 0',
              borderBottom: '1px solid var(--line)' }}>
              <span className="eyebrow">{n}</span>
              <span style={{ fontSize: 'var(--text-3xl)', fontWeight: 600, letterSpacing: '-0.02em' }}>{t}</span>
              <span style={{ fontSize: 'var(--text-lg)', lineHeight: 'var(--leading-body)', color: 'var(--neutral-700)' }}>{d}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
window.Studio = Studio;
