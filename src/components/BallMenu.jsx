import { useEffect, useRef, useState } from 'react';
import { ApplyForm, ScheduleList, BracketView, SponsorGrid, TeamGrid } from './LeagueSections.jsx';

// Some of the balls in the reveal photo are menu buttons.
// BALLS: centre and radius of the balls we use, in px of the photo scaled to 1200×675,
// fitted against the full-size photo. The last five are not buttons; they are only listed
// because they sit in front of button balls and have to be cut out of them.
const BALLS = {
  front: [625, 480, 100], bnbkba: [719, 404, 83], behindFront: [544, 397, 88], top: [551, 187, 55],
  topRight: [656, 214, 63], right: [886, 467, 91], hyak: [360, 454, 95], low: [510, 654, 116],
  lowLeft: [303, 636, 111], lowRight: [748, 646, 114], ahdn: [937, 622, 105],
  underTop: [545, 300, 62], underTopRight: [700, 312, 62],
};
const W = 1200, H = 675;

// The photo is cropped to cover the screen, so a tall screen only sees the middle ~25% of its width;
// `tall` picks balls inside that strip.
const ITEMS = [
  { id: 'apply', label: '참가신청', en: 'APPLY', Body: ApplyForm, note: '신청서 접수 방식이 정해지면 연결할게요. 지금은 화면에서만 확인돼요.',
    wide: 'front', tall: 'front' },
  { id: 'schedule', label: '일정', en: 'SCHEDULE', Body: ScheduleList, note: '예시 일정이에요. 확정되면 바꿔 넣을게요.',
    wide: 'bnbkba', tall: 'behindFront' },
  { id: 'bracket', label: '대진표', en: 'BRACKET', Body: BracketView, note: '8팀 토너먼트 예시예요. 추첨 후 팀 이름이 들어가요.',
    wide: 'right', tall: 'topRight' },
  { id: 'teams', label: '참여 팀', en: 'TEAMS', Body: TeamGrid, note: '참가 신청이 확정되면 팀이 하나씩 채워져요.',
    wide: 'hyak', tall: 'low' },
  { id: 'sponsors', label: '협찬사', en: 'SPONSORS', Body: SponsorGrid, wide: 'top', tall: 'top' },
];

// Where the button sits (% of the photo) and how its cut-out is lined up over the original ball.
// Balls lower in the frame sit in front, so any of those that overlap this one are masked out of the cut-out,
// otherwise a slice of the ball in front would lift off with it.
function place(key) {
  const [cx, cy, r] = BALLS[key];
  const d = 2 * r, x0 = cx - r, y0 = cy - r;
  const holes = Object.values(BALLS)
    .filter(([ox, oy, or]) => oy > cy && Math.hypot(ox - cx, oy - cy) < r + or)
    .map(([ox, oy, or]) => {
      const rr = ((or * 1.08) / d) * 100;   // a little wider, so no sliver of the front ball's rim survives
      return `radial-gradient(ellipse ${rr}% ${rr}% at ${((ox - x0) / d) * 100}% ${((oy - y0) / d) * 100}%, transparent 97%, #000 100%)`;
    });
  return {
    pos: { left: `${(cx / W) * 100}%`, top: `${(cy / H) * 100}%`, width: `${(d / W) * 100}%` },
    img: { width: `${(W / d) * 100}%`, left: `${(-x0 / d) * 100}%`, top: `${(-y0 / d) * 100}%` },
    mask: holes.length ? { WebkitMaskImage: holes.join(','), maskImage: holes.join(','), WebkitMaskComposite: 'source-in', maskComposite: 'intersect' } : undefined,
  };
}

const TALL = '(max-aspect-ratio: 1/1)';

// tilt toward the pointer, like the ball is turning to face it
function tilt(e) {
  const r = e.currentTarget.getBoundingClientRect();
  const nx = (e.clientX - r.left) / r.width - 0.5;
  const ny = (e.clientY - r.top) / r.height - 0.5;
  e.currentTarget.style.setProperty('--ry', `${nx * 28}deg`);
  e.currentTarget.style.setProperty('--rx', `${-ny * 28}deg`);
}
function untilt(e) {
  e.currentTarget.style.setProperty('--ry', '0deg');
  e.currentTarget.style.setProperty('--rx', '0deg');
}

export default function BallMenu({ shown, photo }) {
  const [tall, setTall] = useState(() => window.matchMedia(TALL).matches);
  const [open, setOpen] = useState(null);
  const closeRef = useRef(null);

  useEffect(() => {
    const mq = window.matchMedia(TALL);
    const on = () => setTall(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape') setOpen(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const item = ITEMS.find((i) => i.id === open);

  return (
    <>
      <nav className={`balls${shown ? ' on' : ''}`} aria-label="리그 메뉴">
        {ITEMS.map((it) => {
          const p = place(tall ? it.tall : it.wide);
          return (
            <button key={it.id} type="button" className="ball" onClick={() => setOpen(it.id)}
              onPointerMove={tilt} onPointerLeave={untilt}
              style={p.pos}>
              <i className="lift">
                <i className="orb" style={p.mask}><img src={photo} alt="" style={p.img} /></i>
                <span className="tag"><small>{it.en}</small>{it.label}</span>
              </i>
            </button>
          );
        })}
      </nav>
      {item && (
        <div id="ballSheet" role="dialog" aria-modal="true" aria-labelledby="ballSheetTitle" onClick={() => setOpen(null)}>
          <div className="panel" onClick={(e) => e.stopPropagation()}>
            <div className="sh">
              <h2 id="ballSheetTitle">{item.label}</h2><span>{item.en}</span>
              <button ref={closeRef} type="button" className="x" aria-label="닫기" onClick={() => setOpen(null)}>×</button>
            </div>
            {item.note && <p className="note">{item.note}</p>}
            <item.Body />
          </div>
        </div>
      )}
    </>
  );
}
