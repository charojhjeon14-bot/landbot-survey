// PWA 아이콘 생성 스크립트 (1회성) - LAND-BOT 로고: 네이비 배경 + 흰색 위치핀
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const NAVY = '#1a3fd6';
const OUT = path.join(__dirname, 'public', 'icons');
fs.mkdirSync(OUT, { recursive: true });

// 일반 아이콘 (전체 프레임 활용)
function iconSvg(size) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
    <rect width="512" height="512" rx="112" fill="${NAVY}"/>
    <path d="M256 88c-77 0-139 62-139 139 0 104 139 246 139 246s139-142 139-246c0-77-62-139-139-139z" fill="#ffffff"/>
    <circle cx="256" cy="227" r="56" fill="${NAVY}"/>
  </svg>`;
}

// 마스커블 아이콘 (안드로이드 원형 크롭 대비, 세이프존 확보 위해 안쪽으로 축소)
function maskableSvg(size) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
    <rect width="512" height="512" fill="${NAVY}"/>
    <g transform="translate(256 256) scale(0.68) translate(-256 -256)">
      <path d="M256 88c-77 0-139 62-139 139 0 104 139 246 139 246s139-142 139-246c0-77-62-139-139-139z" fill="#ffffff"/>
      <circle cx="256" cy="227" r="56" fill="${NAVY}"/>
    </g>
  </svg>`;
}

// 파비콘 (작은 사이즈에서도 잘 보이게 핀 모양 단순화, 여백 최소화)
function faviconSvg(size) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
    <rect width="512" height="512" rx="112" fill="${NAVY}"/>
    <path d="M256 70c-88 0-159 71-159 159 0 119 159 283 159 283s159-164 159-283c0-88-71-159-159-159z" fill="#ffffff"/>
    <circle cx="256" cy="229" r="64" fill="${NAVY}"/>
  </svg>`;
}

const jobs = [
  { name: 'icon-192.png', svg: iconSvg(192), size: 192 },
  { name: 'icon-512.png', svg: iconSvg(512), size: 512 },
  { name: 'icon-maskable-192.png', svg: maskableSvg(192), size: 192 },
  { name: 'icon-maskable-512.png', svg: maskableSvg(512), size: 512 },
  { name: 'apple-touch-icon.png', svg: iconSvg(180), size: 180 },
  { name: 'favicon-32.png', svg: faviconSvg(32), size: 32 },
  { name: 'favicon-16.png', svg: faviconSvg(16), size: 16 },
];

(async () => {
  for (const j of jobs) {
    await sharp(Buffer.from(j.svg)).resize(j.size, j.size).png().toFile(path.join(OUT, j.name));
    console.log('생성:', j.name);
  }
  console.log('아이콘 생성 완료 →', OUT);
})();
