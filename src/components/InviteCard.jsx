import { useEffect, useState } from 'react';

// The invitation that opens over the arena. (The rope-ball version will replace this component.)
export default function InviteCard({ onNo, onYes }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div id="invite" className={shown ? 'on' : ''} role="dialog" aria-labelledby="invTitle">
      <div className="card">
        <p className="lab">INVITATION · 초대장</p>
        <h2 id="invTitle">Bernice Hoop League</h2>
        <p className="msg">당신을 우리의 코트로 초대합니다.</p>
        <dl>
          <div><dt>일시</dt><dd>추후 공지</dd></div>
          <div><dt>장소</dt><dd>추후 공지</dd></div>
        </dl>
        <p className="q">초대에 응하시겠습니까?</p>
        <div className="btns">
          <button type="button" className="ghost" onClick={onNo}>아니요</button>
          <button type="button" onClick={onYes}>예</button>
        </div>
      </div>
    </div>
  );
}
