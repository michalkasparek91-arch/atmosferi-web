// Case study detail. Viewfinder hero + 8-second auto-scroll panel.
function Viewfinder({ seed, place }) {
  const tick = { position: 'absolute', width: 18, height: 18 };
  const line = (extra) => ({ position: 'absolute', background: 'var(--canvas)', ...extra });
  return (
    <div className="reveal" style={{ position: 'relative', height: '64vh', minHeight: 420 }}>
      <img src={`https://picsum.photos/seed/${seed}/1600/1000`} alt="" />
      {/* corner ticks */}
      {[['tl',{top:16,left:16}],['tr',{top:16,right:16}],['bl',{bottom:16,left:16}],['br',{bottom:16,right:16}]].map(([k,pos]) => (
        <span key={k} style={{ ...tick, ...pos }}>
          <span style={line({ top: pos.top!==undefined?0:'auto', bottom: pos.bottom!==undefined?0:'auto', left: pos.left!==undefined?0:'auto', right: pos.right!==undefined?0:'auto', width: 18, height: 1 })} />
          <span style={line({ top: pos.top!==undefined?0:'auto', bottom: pos.bottom!==undefined?0:'auto', left: pos.left!==undefined?0:'auto', right: pos.right!==undefined?0:'auto', width: 1, height: 18 })} />
        </span>
      ))}
      {/* center crosshair */}
      <span style={{ position: 'absolute', top: '50%', left: '50%', width: 26, height: 26, transform: 'translate(-50%,-50%)' }}>
        <span style={{ position: 'absolute', top: '50%', left: 0, width: '100%', height: 1, background: 'var(--canvas)' }} />
        <span style={{ position: 'absolute', left: '50%', top: 0, height: '100%', width: 1, background: 'var(--canvas)' }} />
      </span>
      <span className="mono" style={{ position: 'absolute', left: 44, top: 18, fontSize: 9, letterSpacing: '0.2em', color: 'var(--canvas)', textTransform: 'uppercase' }}>● REC</span>
      <span className="mono" style={{ position: 'absolute', left: 44, bottom: 18, fontSize: 9, letterSpacing: '0.2em', color: 'var(--canvas)', textTransform: 'uppercase' }}>{place}</span>
      <span className="mono" style={{ position: 'absolute', right: 44, bottom: 18, fontSize: 9, letterSpacing: '0.2em', color: 'var(--canvas)', textTransform: 'uppercase' }}>F2.8 · 1/250 · ISO 100</span>
    </div>
  );
}

function CaseStudy({ work, onBack, onOpen }) {
  const works = window.ATMOS_WORKS;
  const idx = works.findIndex(w => w.id === work.id);
  const next = works[(idx + 1) % works.length];
  return (
    <article>
      <div className="wrap" style={{ paddingTop: 'var(--space-5)', paddingBottom: 'var(--space-5)' }}>
        <ArrowLink onClick={onBack} style={{ transform: 'scaleX(-1)' }}>
          <span style={{ transform: 'scaleX(-1)', display: 'inline-block' }}>Back to index</span>
        </ArrowLink>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
          marginTop: 'var(--space-4)', borderTop: '1px solid var(--line)', paddingTop: 'var(--space-4)' }}>
          <Eyebrow>Case {work.id}</Eyebrow>
          <Eyebrow>{work.cat} · {work.year}</Eyebrow>
        </div>
        <h1 style={{ margin: 'var(--space-3) 0 0', fontSize: 'var(--text-8xl)', fontWeight: 700,
          lineHeight: 'var(--leading-tight)', letterSpacing: 'var(--track-display)' }}>{work.title}</h1>
        <p style={{ maxWidth: 520, marginTop: 'var(--space-4)', fontSize: 'var(--text-2xl)',
          lineHeight: 'var(--leading-snug)', color: 'var(--neutral-700)', letterSpacing: '-0.01em' }}>{work.blurb}</p>
      </div>

      <Viewfinder seed={work.seed} place={work.place} />

      <div className="wrap" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)',
        paddingTop: 'var(--space-7)', paddingBottom: 'var(--space-7)' }}>
        <div>
          <Eyebrow>The brief</Eyebrow>
          <p style={{ marginTop: 'var(--space-3)', fontSize: 'var(--text-lg)', lineHeight: 'var(--leading-body)', color: 'var(--neutral-700)' }}>
            We were asked to make weather legible. The work proceeds from a single
            constraint — the camera does not move until the light does.
          </p>
        </div>
        <div>
          <Eyebrow>Scope</Eyebrow>
          <ul style={{ marginTop: 'var(--space-3)', padding: 0, listStyle: 'none',
            fontFamily: 'var(--font-mono)', fontSize: 13, lineHeight: 2, color: 'var(--ink)' }}>
            <li>Direction</li><li>Photography</li><li>Identity</li><li>Spatial</li>
          </ul>
        </div>
      </div>

      {/* The 8-second auto-scroll panel — hover to glide. */}
      <div className="wrap" style={{ paddingBottom: 'var(--space-3)' }}>
        <Eyebrow>Hover to play — 8-second glide</Eyebrow>
      </div>
      <div className="wrap" style={{ paddingBottom: 'var(--space-8)' }}>
        <div className="scroller" style={{ height: '70vh', minHeight: 460, '--scroll-shift': '-58%' }}>
          <img src={`https://picsum.photos/seed/${work.seed}-tall/1200/3000`} alt="" />
        </div>
      </div>

      <Horizon />
      <div className="wrap" style={{ paddingTop: 'var(--space-5)', paddingBottom: 'var(--space-8)' }}>
        <Eyebrow>Next</Eyebrow>
        <a onClick={() => onOpen(next.id)} style={{ cursor: 'pointer', display: 'flex',
          alignItems: 'baseline', justifyContent: 'space-between', marginTop: 'var(--space-2)' }}>
          <span style={{ fontSize: 'var(--text-7xl)', fontWeight: 700, letterSpacing: 'var(--track-display)',
            lineHeight: 1 }}>{next.title}</span>
          <span className="eyebrow">{next.id} →</span>
        </a>
      </div>
    </article>
  );
}
window.CaseStudy = CaseStudy;
