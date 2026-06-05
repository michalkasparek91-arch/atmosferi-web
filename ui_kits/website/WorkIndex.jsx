// Work index — numbered rows, baseline meta, slide-on-hover. Click → case study.
function IndexRow({ work, onOpen }) {
  const [h, setH] = React.useState(false);
  return (
    <a onClick={() => onOpen(work.id)}
       onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
       style={{ display: 'block', cursor: 'pointer', borderBottom: '1px solid var(--line)',
         paddingLeft: h ? 18 : 0, transition: 'padding-left var(--dur-standard) var(--curve)' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-4)',
        padding: 'var(--space-4) 0' }}>
        <span className="eyebrow" style={{ width: 44, flex: 'none' }}>{work.id}</span>
        <span style={{ flex: 1, fontSize: 'var(--text-6xl)', fontWeight: 600,
          letterSpacing: '-0.03em', lineHeight: 1 }}>{work.title}</span>
        <span className="eyebrow" style={{ width: 120, flex: 'none' }}>{work.cat}</span>
        <span className="eyebrow" style={{ width: 56, flex: 'none', textAlign: 'right' }}>{work.year}</span>
      </div>
    </a>
  );
}

function WorkIndex({ onOpen }) {
  return (
    <section className="wrap" style={{ paddingTop: 'var(--space-7)', paddingBottom: 'var(--space-8)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        marginBottom: 'var(--space-2)' }}>
        <Eyebrow>Index — selected work</Eyebrow>
        <Eyebrow>{window.ATMOS_WORKS.length} projects</Eyebrow>
      </div>
      <div style={{ borderTop: '1px solid var(--line)' }}>
        {window.ATMOS_WORKS.map(w => <IndexRow key={w.id} work={w} onOpen={onOpen} />)}
      </div>
    </section>
  );
}
window.WorkIndex = WorkIndex;
