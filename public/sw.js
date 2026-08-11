// LAND-BOT 설문 PWA 서비스워커
// 정적 자산(설문 화면 껍데기)만 캐싱 — /api/*, /admin은 항상 네트워크로 (오래된 데이터 방지)
// 내용을 바꿔 재배포할 때는 아래 CACHE 이름의 버전 숫자를 올려주세요.
const CACHE = 'landbot-survey-v1';
const SHELL = ['/', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // API·관리자 경로는 서비스워커가 개입하지 않음 (항상 실네트워크)
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/admin')) return;
  if (e.request.method !== 'GET') return;

  // 정적 자산: 캐시 우선 응답 + 백그라운드 갱신 (stale-while-revalidate)
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const network = fetch(e.request)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
