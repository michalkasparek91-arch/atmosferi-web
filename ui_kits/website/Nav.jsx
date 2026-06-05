// Sticky hairline navigation with the global color toggle.
function Nav({ route, onNavigate, colorOn, setColorOn }) {
  const links = [
    { id: 'index', label: 'Index' },
    { id: 'studio', label: 'Studio' },
    { id: 'contact', label: 'Contact' },
  ];
  return (
    <nav className="nav">
      <div className="wrap nav__inner">
        <Wordmark onClick={() => onNavigate('index')} />
        <div className="nav__links">
          {links.map(l => (
            <a key={l.id} className="navlink"
               aria-current={route === l.id}
               onClick={() => onNavigate(l.id)}
               style={{ cursor: 'pointer' }}>
              {l.label}
            </a>
          ))}
          <Toggle pressed={colorOn} onChange={setColorOn} label="Color" />
        </div>
      </div>
    </nav>
  );
}
window.Nav = Nav;
