import { useState } from 'react';
import { schedule, bracket, sponsors, teams } from '../data/league.js';

// Section bodies shared by the main page and the ball menu on the reveal photo.

export function ApplyForm() {
  const [form, setForm] = useState({ team: '', name: '', phone: '', size: '5명', msg: '' });
  const [done, setDone] = useState('');
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const submit = (e) => {
    e.preventDefault();
    // TODO: 접수 방식(구글폼 / 이메일 / GHL 서버)이 정해지면 여기서 전송
    setDone(`${form.team} 팀 신청 내용을 확인했어요. 접수 방식이 연결되면 실제로 제출돼요.`);
  };
  return (
    <form onSubmit={submit}>
      <label>팀 이름<input id="ap-team" value={form.team} onChange={set('team')} required autoComplete="organization" /></label>
      <label>대표자 이름<input id="ap-name" value={form.name} onChange={set('name')} required autoComplete="name" /></label>
      <label>연락처<input id="ap-phone" type="tel" value={form.phone} onChange={set('phone')} required autoComplete="tel" placeholder="010-0000-0000" /></label>
      <label>참가 인원
        <select id="ap-size" value={form.size} onChange={set('size')}>
          {['5명', '6명', '7명', '8명', '9명 이상'].map((v) => <option key={v}>{v}</option>)}
        </select>
      </label>
      <label className="full">하고 싶은 말<textarea id="ap-msg" value={form.msg} onChange={set('msg')} placeholder="팀 소개나 문의 사항을 적어주세요" /></label>
      <button className="submit" type="submit">신청하기</button>
      {done && <p className="ok" role="status">{done}</p>}
    </form>
  );
}

export function ScheduleList() {
  return (
    <ol className="tl">
      {schedule.map((s, i) => (
        <li key={i}><b>{s.date}</b><div><strong>{s.title}</strong><em>{s.note}</em></div></li>
      ))}
    </ol>
  );
}

export function BracketView() {
  return (
    <div className="bracket-wrap"><div className="bracket">
      {bracket.map((r) => (
        <div className="round" key={r.round}>
          <h3>{r.round}</h3>
          <div className="col">
            {r.matches.map(([a, b], i) => (
              <div className="match" key={i}><div>{a}<i>–</i></div><div>{b}<i>–</i></div></div>
            ))}
          </div>
        </div>
      ))}
    </div></div>
  );
}

export function SponsorGrid() {
  return <div className="grid">{sponsors.map((s, i) => <div className="sp" key={i}>{s}</div>)}</div>;
}

export function TeamGrid() {
  return (
    <div className="grid">
      {teams.map((t, i) => (
        <div className="team" key={i}><div className="dot" style={{ background: t.color }} /><strong>{t.name}</strong><em>{t.status}</em></div>
      ))}
    </div>
  );
}
