// 저장소 추상화
// - Vercel 배포 시: Redis(Upstash / Vercel Storage)가 연결되어 있으면 자동으로 그걸 사용
// - 로컬(node server.js) 실행 시: KV 환경변수가 없으므로 data/responses.json 파일로 자동 대체
// 서버리스 함수는 파일시스템이 요청마다 초기화되므로, 배포 환경에서는 반드시 Redis 경로를 타야 함.
const fs = require('fs');
const path = require('path');

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const useRedis = !!(REDIS_URL && REDIS_TOKEN);

let redis = null;
if (useRedis) {
  const { Redis } = require('@upstash/redis');
  redis = new Redis({ url: REDIS_URL, token: REDIS_TOKEN });
}

const DATA_FILE = path.join(__dirname, '..', 'data', 'responses.json');
const KEY = 'landbot:responses';

async function loadAll() {
  if (useRedis) {
    const items = await redis.lrange(KEY, 0, -1);
    return items.map(x => (typeof x === 'string' ? JSON.parse(x) : x));
  }
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
  catch { return []; }
}

async function appendOne(rec) {
  if (useRedis) { await redis.rpush(KEY, JSON.stringify(rec)); return; }
  const all = await loadAll();
  all.push(rec);
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(all, null, 2));
}

async function resetAll() {
  if (useRedis) { await redis.del(KEY); return; }
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, '[]');
}

module.exports = { loadAll, appendOne, resetAll, useRedis };
