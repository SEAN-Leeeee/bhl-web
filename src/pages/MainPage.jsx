import { useEffect, useRef, useState } from 'react';
import hero from '../assets/main-hero.jpg';
import { ApplyForm, ScheduleList, BracketView, SponsorGrid, TeamGrid } from '../components/LeagueSections.jsx';

const MENU = [
  { id: 'm-apply', label: '참가신청', cta: true },
  { id: 'm-schedule', label: '일정' },
  { id: 'm-bracket', label: '대진표' },
  { id: 'm-sponsors', label: '협찬사' },
  { id: 'm-teams', label: '참여 팀' },
];

function Section({ id, title, en, note, children }) {
  return (
    <section className="sec" id={id}>
      <div className="sh"><h2>{title}</h2><span>{en}</span></div>
      {note && <p className="note">{note}</p>}
      {children}
    </section>
  );
}

export default function MainPage() {
  const root = useRef(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const jump = (id) => (e) => {
    e.preventDefault();
    const el = id === 'top' ? root.current.querySelector('.hero') : document.getElementById(id);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <section id="main" ref={root} className={shown ? 'on in' : 'on'}>
      <header className="hero">
        <img alt="빈 체육관 마루 위에 떠 있는 농구공" src={hero} />
        <nav aria-label="주요 메뉴">
          <a className="brand" href="#top" onClick={jump('top')}>Bernice Hoop League<small>BERNICE CUP</small></a>
          <ul className="menu">
            {MENU.map((m) => (
              <li key={m.id}><a className={m.cta ? 'cta' : undefined} href={`#${m.id}`} onClick={jump(m.id)}>{m.label}</a></li>
            ))}
          </ul>
        </nav>
        <div className="title"><p>BERNICE HOOP LEAGUE</p><h1>우리의 코트는<br />계속 넓어진다.</h1></div>
        <div className="scroll">SCROLL ↓</div>
      </header>

      <Section id="m-apply" title="참가신청" en="APPLY" note="신청서 접수 방식(구글폼, 이메일 등)이 정해지면 연결할게요. 지금은 화면에서만 확인돼요.">
        <ApplyForm />
      </Section>

      <Section id="m-schedule" title="일정" en="SCHEDULE" note="예시 일정이에요. 확정되면 바꿔 넣을게요.">
        <ScheduleList />
      </Section>

      <Section id="m-bracket" title="대진표" en="BRACKET" note="8팀 토너먼트 예시예요. 추첨 후 팀 이름이 들어가요.">
        <BracketView />
      </Section>

      <Section id="m-sponsors" title="협찬사" en="SPONSORS">
        <SponsorGrid />
      </Section>

      <Section id="m-teams" title="참여 팀" en="TEAMS" note="참가 신청이 확정되면 팀이 하나씩 채워져요.">
        <TeamGrid />
      </Section>

      <footer>© Bernice Hoop League</footer>
    </section>
  );
}
