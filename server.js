// 로컬 개발 실행용 (node server.js). 실제 앱 로직은 api/index.js에 있음 — Vercel 배포 시 그 파일이 서버리스 함수로 그대로 실행됨.
const app = require('./api/index.js');
const storage = require('./lib/storage');

const PORT = process.env.PORT || 4000;
const ADMIN_KEY = process.env.ADMIN_KEY || '0114';

app.listen(PORT, () => {
  console.log(`LAND-BOT 설문 서버 실행 : http://localhost:${PORT}`);
  console.log(`  설문지  : http://localhost:${PORT}/`);
  console.log(`  대시보드 : http://localhost:${PORT}/admin?key=${ADMIN_KEY}`);
  console.log(`  저장소  : ${storage.useRedis ? 'Redis (배포 환경과 동일)' : '로컬 파일 (data/responses.json)'}`);
});
