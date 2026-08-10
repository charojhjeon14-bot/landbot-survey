// LAND-BOT 사용자 만족도 설문 — Express 앱 본체
// Vercel에서는 이 파일이 서버리스 함수로 실행됨 (vercel.json 라우팅 참조)
// 로컬에서는 ../server.js 가 이 app을 불러와 app.listen()으로 구동
const express = require('express');
const path = require('path');
const storage = require('../lib/storage');

const app = express();
const ADMIN_KEY = process.env.ADMIN_KEY || '0114';

app.use(express.json());

// ── 관리자 전용 대시보드 페이지 (비밀번호가 있어야만 열림) ──
const ADMIN_HTML = path.join(__dirname, '..', 'admin.html');
function loginPage(msg) {
  return `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>관리자 접속</title>
<style>body{margin:0;font-family:'Malgun Gothic',sans-serif;background:#eef1f6;display:flex;min-height:100vh;align-items:center;justify-content:center}
.box{background:#fff;border:1px solid #dbe2ee;border-radius:14px;padding:32px 28px;width:340px;text-align:center;box-shadow:0 2px 10px rgba(0,0,0,.05)}
h2{color:#1f3864;margin:0 0 6px}p{color:#6a7280;font-size:13px;margin:0 0 16px}
input{width:100%;padding:12px;border:1.5px solid #dbe2ee;border-radius:10px;font-size:15px;box-sizing:border-box}
button{width:100%;padding:13px;margin-top:14px;background:#1f3864;color:#fff;border:0;border-radius:10px;font-size:15px;font-weight:700;cursor:pointer}
.err{color:#c00000;font-size:13px;height:18px;margin-top:10px}
.back{display:inline-block;margin-top:12px;font-size:12.5px;color:#2e5c9a;text-decoration:none}</style></head>
<body><form class="box" method="get" action="/admin">
<h2>🔒 분석 대시보드</h2><p>관리자만 접근할 수 있습니다.</p>
<input type="password" name="key" placeholder="비밀번호" autofocus>
<button type="submit">접속</button><div class="err">${msg || ''}</div>
<a class="back" href="/">← 설문지로 돌아가기</a>
</form></body></html>`;
}
app.get('/admin', (req, res) => {
  const key = req.query.key;
  if (key === ADMIN_KEY) return res.sendFile(ADMIN_HTML);
  res.status(key ? 401 : 200).send(loginPage(key ? '비밀번호가 올바르지 않습니다.' : ''));
});

// 로컬 개발용 정적 서빙 (배포 시엔 vercel.json이 /public을 직접 서빙하므로 보통 도달하지 않음)
app.use(express.static(path.join(__dirname, '..', 'public')));

// ── 문항 메타 (검증·집계 공용) ──
const SCALE = [1, 2, 3, 4, 5];
const FIELDS = {
  A1: [1, 2, 3, 4, 5, 6],
  A2: [1, 2, 3],
  A4: [1, 2, 3, 4],
  Q1: SCALE, Q2: SCALE, Q3: SCALE, Q4: SCALE,
  Q5: [0, 20, 40, 60, 75],
  Q6: [0, 20, 40, 60, 75],
  Q7: [1, 2, 3, 4],
  Q8: SCALE, Q9: SCALE, Q10: SCALE, Q11: SCALE, Q12: SCALE,
  Q13: SCALE, Q14: SCALE,
  Q15: [1, 2, 3, 4, 5, 6],
};
const A3_OPTS = ['전자지도', 'AI보고서', '임대료계산', '챗봇'];

// ── 설문 제출 ──
app.post('/api/submit', async (req, res) => {
  const b = req.body || {};
  const rec = { ts: new Date().toISOString() };
  for (const [k, allowed] of Object.entries(FIELDS)) {
    const v = Number(b[k]);
    if (b[k] === undefined || b[k] === '' || Number.isNaN(v)) {
      if (['Q8', 'Q9', 'Q10', 'Q11', 'Q12'].includes(k)) { rec[k] = null; continue; }
      return res.status(400).json({ ok: false, msg: `필수 항목 누락: ${k}` });
    }
    if (!allowed.includes(v)) return res.status(400).json({ ok: false, msg: `잘못된 값: ${k}=${b[k]}` });
    rec[k] = v;
  }
  rec.A3 = Array.isArray(b.A3) ? b.A3.filter(x => A3_OPTS.includes(x)) : [];
  const txt = (v, n) => typeof v === 'string' ? v.trim().slice(0, n) : '';
  rec.Q15_etc = txt(b.Q15_etc, 200);
  rec.improve = txt(b.improve, 1000);
  rec.good = txt(b.good, 1000);
  rec.free = txt(b.free, 1000);

  try {
    await storage.appendOne(rec);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, msg: '저장 중 오류가 발생했습니다.' });
  }
});

// ── 관리자 인증 ──
function auth(req, res, next) {
  const key = req.query.key || req.headers['x-admin-key'];
  if (key !== ADMIN_KEY) return res.status(401).json({ ok: false, msg: '비밀번호가 올바르지 않습니다.' });
  next();
}

function avg(nums) { const a = nums.filter(n => typeof n === 'number'); return a.length ? a.reduce((x, y) => x + y, 0) / a.length : null; }
function round(n, d = 2) { return n == null ? null : Math.round(n * 10 ** d) / 10 ** d; }

// ── 데이터 초기화 (관리자 전용) ──
app.post('/api/reset', auth, async (req, res) => {
  await storage.resetAll();
  res.json({ ok: true });
});

app.get('/api/stats', auth, async (req, res) => {
  const all = await storage.loadAll();
  const n = all.length;
  const col = k => all.map(r => r[k]).filter(v => typeof v === 'number');

  const part1 = avg([...col('Q1'), ...col('Q2'), ...col('Q3'), ...col('Q4')]);
  const feat = k => avg(all.map(r => r[k]).filter(v => typeof v === 'number' && v > 0));
  const q7 = col('Q7');
  const q7up = q7.length ? (q7.filter(v => v === 1 || v === 2).length / q7.length) * 100 : null;
  const q15labels = ['현장 민원 즉시 처리', '서류작성 시간 단축', '규정확인 빨라져 판단 용이', '유휴지 현황 한눈 파악', '본부-지사 정보공유 원활', '기타'];
  const q15 = q15labels.map((lab, i) => {
    const c = all.filter(r => r.Q15 === i + 1).length;
    return { label: lab, count: c, pct: n ? Math.round(c / n * 100) : 0 };
  });
  const jisa = [1, 2, 3, 4, 5, 6].map(i => {
    const c = all.filter(r => r.A1 === i).length;
    return { code: i, count: c, pct: n ? Math.round(c / n * 100) : 0 };
  });
  const a3 = A3_OPTS.map(opt => {
    const c = all.filter(r => Array.isArray(r.A3) && r.A3.includes(opt)).length;
    return { label: opt, count: c, pct: n ? Math.round(c / n * 100) : 0 };
  });
  function dist(k, vals) { return vals.map(v => all.filter(r => r[k] === v).length); }

  res.json({
    ok: true,
    n,
    updated: new Date().toISOString(),
    satisfaction: {
      part1: round(part1),
      items: [
        { key: 'Q1', label: '전반 만족도', avg: round(avg(col('Q1'))), dist: dist('Q1', SCALE) },
        { key: 'Q2', label: '업무 도움', avg: round(avg(col('Q2'))), dist: dist('Q2', SCALE) },
        { key: 'Q3', label: '조작 직관성', avg: round(avg(col('Q3'))), dist: dist('Q3', SCALE) },
        { key: 'Q4', label: '추천 의향', avg: round(avg(col('Q4'))), dist: dist('Q4', SCALE) },
      ],
    },
    efficiency: {
      q5: round(avg(col('Q5')), 1),
      q6: round(avg(col('Q6')), 1),
      q7up: round(q7up, 0),
    },
    features: [
      { key: 'Q8', label: '전자지도', avg: round(feat('Q8')) },
      { key: 'Q9', label: 'AI 사진분석·보고서', avg: round(feat('Q9')) },
      { key: 'Q10', label: '임대료 자동계산', avg: round(feat('Q10')) },
      { key: 'Q11', label: '규정·법령 챗봇', avg: round(feat('Q11')) },
      { key: 'Q12', label: '본부-지사 정보공유', avg: round(feat('Q12')) },
    ],
    reliability: [
      { key: 'Q13', label: 'AI 현장 일치도', avg: round(avg(col('Q13'))) },
      { key: 'Q14', label: '담당자 확인 절차 적절성', avg: round(avg(col('Q14'))) },
    ],
    q15,
    jisa,
    a3,
    etcs: all.filter(r => r.Q15_etc && r.Q15_etc.trim()).map(r => r.Q15_etc),
    comments: {
      improve: all.filter(r => r.improve).map(r => ({ jisa: r.A1, text: r.improve })),
      good: all.filter(r => r.good).map(r => ({ jisa: r.A1, text: r.good })),
      free: all.filter(r => r.free).map(r => ({ jisa: r.A1, text: r.free })),
    },
  });
});

app.get('/api/export.csv', auth, async (req, res) => {
  const all = await storage.loadAll();
  const cols = ['ts', 'A1', 'A2', 'A4', 'A3', 'Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6', 'Q7', 'Q8', 'Q9', 'Q10', 'Q11', 'Q12', 'Q13', 'Q14', 'Q15', 'Q15_etc', 'improve', 'good', 'free'];
  const esc = v => {
    if (v == null) return '';
    const s = Array.isArray(v) ? v.join('|') : String(v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const lines = [cols.join(',')];
  all.forEach(r => lines.push(cols.map(c => esc(r[c])).join(',')));
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="landbot_survey.csv"');
  res.send('﻿' + lines.join('\n'));
});

module.exports = app;
