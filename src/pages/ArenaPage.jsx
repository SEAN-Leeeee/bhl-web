import { useEffect, useRef, useState } from 'react';
import { createArena } from '../engine/arena.js';
import InviteReveal from '../components/InviteReveal.jsx';

export default function ArenaPage() {
  const ref = useRef(null);
  const arena = useRef(null);
  const [inviteOpen, setInviteOpen] = useState(false);

  useEffect(() => {
    const a = createArena(ref.current, { onInvite: () => setInviteOpen(true) });
    arena.current = a;
    a.start();
    return () => a.stop();
  }, []);

  return (
    <section id="arena" className="on">
      <div ref={ref} style={{ position: 'absolute', inset: 0 }} />
      {inviteOpen && <InviteReveal />}
    </section>
  );
}
