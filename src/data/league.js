// Everything on the main page lives here. Replace the examples as details are confirmed.
export const schedule = [
  { date: '추후 공지', title: '참가 신청 마감', note: '신청서 접수 종료' },
  { date: '추후 공지', title: '대진 추첨', note: '참가 팀 확정 및 대진표 공개' },
  { date: '추후 공지', title: '예선 · 8강', note: '장소 추후 공지' },
  { date: '추후 공지', title: '4강 · 결승', note: '시상식 진행' },
];

export const bracket = [
  { round: '8강', matches: [['1번 시드', '2번 시드'], ['3번 시드', '4번 시드'], ['5번 시드', '6번 시드'], ['7번 시드', '8번 시드']] },
  { round: '4강', matches: [['8강 1경기 승자', '8강 2경기 승자'], ['8강 3경기 승자', '8강 4경기 승자']] },
  { round: '결승', matches: [['4강 1경기 승자', '4강 2경기 승자']] },
];

export const sponsors = ['협찬사 로고', '협찬사 로고', '협찬사 로고', '협찬 문의 환영'];

export const teams = [
  { name: '버니스', color: '#c8452f', status: '주최' },
  { name: '팀 이름', color: '#2f5d8c', status: '모집 중' },
  { name: '팀 이름', color: '#4b7a3c', status: '모집 중' },
  { name: '팀 이름', color: '#8c6a2f', status: '모집 중' },
  { name: '팀 이름', color: '#6b3f8c', status: '모집 중' },
  { name: '팀 이름', color: '#2f8c86', status: '모집 중' },
  { name: '팀 이름', color: '#8c2f55', status: '모집 중' },
  { name: '팀 이름', color: '#5a5a5a', status: '모집 중' },
];
