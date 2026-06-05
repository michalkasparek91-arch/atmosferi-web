// App shell — fake routing, global color mode, scroll-to-top on navigate.
function App() {
  const [route, setRoute] = React.useState('index'); // 'index' | 'studio' | 'contact' | <caseId>
  const [colorOn, setColorOn] = React.useState(false);

  React.useEffect(() => {
    document.body.classList.toggle('color-on', colorOn);
  }, [colorOn]);

  const navigate = (r) => { setRoute(r); window.scrollTo(0, 0); };

  const works = window.ATMOS_WORKS;
  const activeCase = works.find(w => w.id === route);
  const topRoute = activeCase ? 'index' : route;

  return (
    <React.Fragment>
      <Nav route={topRoute} onNavigate={navigate} colorOn={colorOn} setColorOn={setColorOn} />
      {route === 'index' && (
        <React.Fragment>
          <Hero onNavigate={navigate} />
          <WorkIndex onOpen={navigate} />
        </React.Fragment>
      )}
      {activeCase && (
        <CaseStudy work={activeCase} onBack={() => navigate('index')} onOpen={navigate} />
      )}
      {route === 'studio' && (
        <React.Fragment>
          <Studio />
          <Contact />
        </React.Fragment>
      )}
      {route === 'contact' && <Contact />}
      <Footer />
    </React.Fragment>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
