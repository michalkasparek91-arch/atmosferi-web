// Contact block + global footer.
function Contact() {
  const [val, setVal] = React.useState('');
  const [sent, setSent] = React.useState(false);
  return (
    <section className="wrap" style={{ paddingTop: 'var(--space-8)', paddingBottom: 'var(--space-7)' }}>
      <Eyebrow>Contact — open for 2026</Eyebrow>
      <h2 style={{ margin: 'var(--space-4) 0 var(--space-6)', fontSize: 'var(--text-8xl)', fontWeight: 700,
        lineHeight: 'var(--leading-display)', letterSpacing: 'var(--track-display)' }}>
        Let&rsquo;s measure<br />the light.
      </h2>
      <div style={{ maxWidth: 560 }}>
        <label className="eyebrow" style={{ display: 'block', marginBottom: 12 }}>
          {sent ? 'Received — we will reply within two days' : 'Your email'}
        </label>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 'var(--space-3)' }}>
          <input value={val} onChange={e => setVal(e.target.value)} placeholder="name@studio.com"
            style={{ flex: 1, fontFamily: 'var(--font-sans)', fontSize: 'var(--text-2xl)', color: 'var(--ink)',
              background: 'none', border: 0, borderBottom: '1px solid var(--ink)', padding: '10px 0', outline: 'none' }} />
          <Button onClick={() => { if (val) setSent(true); }}>Send →</Button>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer style={{ borderTop: '1px solid var(--line)' }}>
      <div className="wrap" style={{ paddingTop: 'var(--space-6)', paddingBottom: 'var(--space-6)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          gap: 'var(--space-6)', flexWrap: 'wrap' }}>
          <Wordmark size={40} />
          <div style={{ display: 'flex', gap: 'var(--space-7)', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Eyebrow>Studio</Eyebrow>
              <span className="mono" style={{ fontSize: 13 }}>Milan · Tromsø</span>
              <span className="mono" style={{ fontSize: 13 }}>atelier@atmosferi.studio</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Eyebrow>Elsewhere</Eyebrow>
              <span className="mono muted" style={{ fontSize: 13 }}>Instagram</span>
              <span className="mono muted" style={{ fontSize: 13 }}>Are.na</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-7)' }}>
          <Eyebrow>© MMXXVI Atmosferi°</Eyebrow>
          <Eyebrow>N 45°27′ E 09°11′ · 09°C</Eyebrow>
        </div>
      </div>
    </footer>
  );
}
window.Contact = Contact;
window.Footer = Footer;
