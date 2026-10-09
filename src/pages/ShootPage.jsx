import { useEffect, useRef } from 'react';
import { startShoot } from '../engine/shoot.js';

export default function ShootPage({ onMade }) {
  const ref = useRef(null);
  const cb = useRef(onMade);
  cb.current = onMade;

  useEffect(() => {
    const stop = startShoot(ref.current, { onMade: () => cb.current?.() });
    return stop;
  }, []);

  return <div ref={ref} />;
}
