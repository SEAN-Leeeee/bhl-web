import { useEffect, useState } from 'react';
import TypeSlabField from './originkit/ui/type-slab-field.tsx';
import bgBalls from '../assets/bg-balls.png';
import BallMenu from './BallMenu.jsx';
import logo from '../assets/bhl-logo-light.png';

// What the envelope opens into, in place of a card:
// white light swells until it fills the frame -> the type-slab field takes over -> the photo lands,
// and some of the balls in it become the league menu.
const T_WHITE = 1200;   // white light grows out to cover the screen
const T_XFADE = 800;    // white hands over to the slab field
const T_HOLD = 4000;    // slab field holds before the photo
const T_PHOTO = 900;    // photo fade-in

export default function InviteReveal() {
  const [phase, setPhase] = useState('start');
  const [shader, setShader] = useState(true);

  // the photo is ~4 MB; start fetching it while the white is still growing
  useEffect(() => { new Image().src = bgBalls; }, []);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setPhase('glow'));   // a frame late, so the CSS transition runs
    const timers = [
      setTimeout(() => setPhase('ribbons'), T_WHITE),
      setTimeout(() => setPhase('photo'), T_WHITE + T_XFADE + T_HOLD),
      // once the photo covers it, the shader is just burning GPU
      setTimeout(() => setShader(false), T_WHITE + T_XFADE + T_HOLD + T_PHOTO),
    ];
    return () => { cancelAnimationFrame(raf); timers.forEach(clearTimeout); };
  }, []);

  return (
    <div id="reveal" className={phase}>
      {/* mounted from the start, so the hand-over is not also a cold shader compile */}
      <div className="field" aria-hidden="true">{shader && (
          <TypeSlabField
            text="2026 BHL"
            font={{ fontFamily: '"Archivo", "Helvetica Neue", Arial, sans-serif', fontWeight: 900 }}
            // flat letters: thin slabs (depth > 0, the shader divides by it); reach left at default so the pointer wave stays
            grid={{ depth: 2 }}
            style={{ position: 'absolute', inset: 0, minWidth: 0, minHeight: 0 }}
          />
        )}</div>
      <div className="lightburst" aria-hidden="true" />
      {/* sized like object-fit:cover, so the ball buttons stay pinned to their balls at any screen shape */}
      <div className="stage">
        <img className="photo" src={bgBalls} alt="" />
        <BallMenu shown={phase === 'photo'} photo={bgBalls} />
      </div>
      {/* the photo is the home page: logo top-left, season top-right */}
      <header className="home-bar">
        <img className="logo" src={logo} alt="Bernice Hoop League" />
        <span className="season">2026</span>
      </header>
    </div>
  );
}
