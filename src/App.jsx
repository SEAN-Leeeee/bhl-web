import { lazy, Suspense, useCallback, useState } from 'react';

// each page loads only when it is reached (the 3D arena pulls in three.js)
const ShootPage = lazy(() => import('./pages/ShootPage.jsx'));
const ArenaPage = lazy(() => import('./pages/ArenaPage.jsx'));
const MainPage = lazy(() => import('./pages/MainPage.jsx'));

// Flow: 1. free throw (webcam)  →  2. 3D arena, find the invitation  →  3. main page
// Jump straight to a page with #arena or #main in the address.
const initial = { '#arena': 'arena', '#main': 'main' }[window.location.hash] || 'shoot';

export default function App() {
  const [page, setPage] = useState(initial);
  const [fading, setFading] = useState(false);

  const go = useCallback((next) => {
    setFading(true);
    setTimeout(() => {
      setPage(next);
      setTimeout(() => setFading(false), 250);
    }, 700);
  }, []);

  return (
    <Suspense fallback={null}>
      {page === 'shoot' && <ShootPage onMade={() => go('arena')} />}
      {page === 'arena' && <ArenaPage onAccept={() => go('main')} />}
      {page === 'main' && <MainPage />}
      <div id="fade" className={fading ? 'on' : ''} />
    </Suspense>
  );
}
