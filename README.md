# Bernice Hoop League

웹캠 자유투 → 3D 경기장에서 초대장 찾기 → 메인 페이지로 이어지는 대회 홈페이지예요.

## 실행

```bash
npm install
npm run dev
```

터미널에 뜨는 주소(보통 http://localhost:5173)를 크롬으로 열고 카메라를 허용하면 돼요.
`npm run build`로 배포용 파일을 `dist/`에 만들어요. Vercel이나 Netlify에 올리면 https가 붙어서 웹캠도 그대로 작동해요.

주소 뒤에 붙이면 해당 페이지로 바로 가요.

- `#arena`: 3D 경기장
- `#main`: 메인 페이지

## 구조

```
src/
  App.jsx                 페이지 흐름 (자유투 → 경기장 → 메인)
  pages/
    ShootPage.jsx         1. 웹캠 자유투
    ArenaPage.jsx         2. 3D 경기장 + 초대장
    MainPage.jsx          3. 메인 (참가신청 · 일정 · 대진표 · 협찬사 · 참여 팀)
  components/
    InviteCard.jsx        초대장 카드 (Rope 공으로 바꿀 자리)
  engine/
    shoot.js / shoot.html 자유투 엔진 (카메라, 손 인식, 공 물리, 그물)
    arena.js / arena.html 3D 경기장 엔진 (three.js)
  data/league.js          일정 · 대진 · 협찬사 · 팀 데이터 (여기만 고치면 메인에 반영)
  assets/                 체육관 사진, 공 텍스처, 메인 사진
  styles/app.css
```

## 슛 판정 기준

`src/engine/shoot.js`의 `STD_DEFAULT`가 모든 사람에게 같은 기준이에요.
