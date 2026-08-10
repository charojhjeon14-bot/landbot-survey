# 「LAND-BOT」 사용자 만족도 설문 웹앱

설문 수집·분석 앱. Vercel에 배포하면 항상 켜져 있는 공개 링크가 생기고,
로컬에서는 파일 저장으로, 배포 환경에서는 Redis(서버리스 대응 저장소)로 자동 전환됩니다.

## 구성
- `api/index.js` — 앱 본체 (Express). Vercel에서는 이 파일이 서버리스 함수로 실행됨
- `public/index.html` — 설문지 (응답자용, 모바일 최적화, 상단에 "관리자" 탭 포함)
- `admin.html` — 분석 대시보드 (관리자 전용, 비밀번호 필요)
- `lib/storage.js` — 저장소 계층 (로컬=파일 / 배포=Redis 자동 전환)
- `server.js` — 로컬 실행 진입점
- `vercel.json` — 배포 라우팅 설정

## 로컬 실행
```
cd survey-app
npm install
node server.js
```
- 설문지 : http://localhost:4000
- 대시보드 : http://localhost:4000/admin?key=0114
- 비밀번호 변경 : `set ADMIN_KEY=원하는값 && node server.js`

## 접근 권한
- **응답자는 설문지만** 봅니다. 제출 완료 화면에 참여 인원 등 현황이 표시되지 않습니다.
- 설문지 상단 **"🔒 관리자" 탭**을 누르면 비밀번호 입력창이 뜨고, 맞으면 대시보드로 이동합니다.
- 비밀번호는 서버에서만 검증하며 설문지 페이지 소스에는 포함되지 않습니다.
- `/api/stats`, `/api/export.csv`도 비밀번호 없이는 401.

## Vercel 배포 (깃허브 연동)

**1) GitHub에 푸시**
```
git remote add origin https://github.com/<계정>/<저장소명>.git
git branch -M main
git push -u origin main
```

**2) Vercel에서 프로젝트 가져오기**
1. https://vercel.com → **Add New → Project** → 방금 만든 GitHub 저장소 선택 → Import
2. Root Directory는 저장소 루트 그대로 (survey-app 폴더 자체를 저장소로 만들었다면 기본값 유지)
3. **Deploy** 클릭 (일단 이대로 배포해도 됨 — 다음 단계에서 저장소만 추가하면 됨)

**3) Redis 저장소 추가 (필수 — 이거 없으면 응답이 저장되지 않음)**
1. 방금 만든 프로젝트 → **Storage** 탭 → **Create Database**
2. **Redis**(Upstash 제공) 선택 → 이름 입력 후 생성 → **Connect to Project**에서 방금 그 프로젝트 연결
3. 연결하면 `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` 환경변수가 프로젝트에 자동으로 추가됨 (코드 수정 불필요)

**4) 관리자 비밀번호 설정**
1. 프로젝트 → **Settings → Environment Variables**
2. `ADMIN_KEY` = 원하는 비밀번호 추가 (설정 안 하면 기본값 `0114` 사용)

**5) 재배포**
- Storage 연결·환경변수 추가 후 **Deployments → 최신 배포 → Redeploy** 한 번 실행 (환경변수를 반영하려면 재배포 필요)

배포되면 `https://<프로젝트명>.vercel.app` 링크가 생깁니다. 이 링크를 6개 지사에 QR코드나 공문으로 배포하면 됩니다.
관리자 대시보드는 `https://<프로젝트명>.vercel.app` 접속 후 상단 "🔒 관리자" 탭으로 들어가면 됩니다.

## 응답 분석 → 보고서 반영
- 대시보드 상단 KPI(★ 표시): 종합 만족도, 조사·민원 시간 평균 단축률, '1회 방문 종결' 증가 응답 비율
- 하단 카드: 개선·건의 / 좋았던 점(보고서 인용 후보) / 기타 의견 — 지사 태그 포함
- `⬇ CSV 내보내기`로 엑셀 추가 분석 가능 (한글 깨짐 없음)

## 데이터 관리
- 배포 환경 데이터는 Vercel 프로젝트의 Storage(Redis)에 저장됨 — Storage 탭에서 직접 조회·삭제 가능
- 초기화하려면 Storage 탭에서 `landbot:responses` 키 삭제, 또는 대시보드에 초기화 기능 추가 요청
- 개인정보: 이름·연락처를 받지 않는 익명 설문(소속 지사만 수집)
