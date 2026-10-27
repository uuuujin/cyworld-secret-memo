# 🌟 싸이월드 미니홈피 감성 나만의 비밀 메모장

2000년대 싸이월드 미니홈피 감성의 레트로 도트 디자인과 Google Firebase (Auth & Firestore) 기반의 1인 비공개 보안 메모장 & 다이어리 웹 애플리케이션입니다.

---

## 🚀 배포 및 GitHub 연동 가이드

### 1단계: GitHub 저장소(Repository) 생성 및 푸시
1. [GitHub](https://github.com/uuuujin)에 접속하여 **New Repository**를 생성합니다 (예: `cyworld-secret-memo`).
2. 로컬 터미널에서 다음 명령어를 실행하여 코드를 푸시합니다:

```bash
git init
git add .
git commit -m "feat: Cyworld retro secret memo app with Firebase"
git branch -M main
git remote add origin https://github.com/uuuujin/cyworld-secret-memo.git
git push -u origin main
```

---

### 2단계: Vercel로 무료 1분 배포하기 (가장 추천)
1. [Vercel](https://vercel.com)에 로그인 (GitHub 계정으로 간편 로그인).
2. **"Add New Project"** 클릭 후 위에서 생성한 `cyworld-secret-memo` 저장소를 선택합니다.
3. Framework Preset: **Vite** 자동 감지 확인 후 **"Deploy"** 버튼 클릭!
4. 1분 후 `https://cyworld-secret-memo.vercel.app` 과 같은 무료 배포 URL이 생성됩니다.

---

### 3단계: 커스텀 도메인(내 도메인) 연결하기
1. 도메인 구매 사이트(가비아, 후이즈, Cloudflare, Namecheap 등)에서 원하는 도메인(예: `mymemo.kr` 또는 `cyworld-memo.com`)을 구매합니다.
2. Vercel 프로젝트 대시보드 -> **Settings** -> **Domains** 메뉴로 이동합니다.
3. 구매한 도메인을 입력하고 추가합니다.
4. 안내되는 DNS 레코드(CNAME 또는 A 레코드)를 도메인 구매처의 DNS 설정에 입력하면 연결이 완료됩니다.

---

### ⚠️ 필수 확인 사항 (Google 로그인 도메인 승인)
새 도메인(`*.vercel.app` 또는 구매하신 개인 도메인)에서 Google 로그인이 정상 작동하려면 Firebase 콘솔에 도메인을 추가해야 합니다:

1. [Firebase Console](https://console.firebase.google.com) 접속
2. 프로젝트 선택 (`emergent-poetry-mq6d2`)
3. **Authentication** -> **설정(Settings)** -> **승인된 도메인(Authorized Domains)** 탭으로 이동
4. **"도메인 추가"** 버튼을 눌러 배포된 도메인(예: `cyworld-secret-memo.vercel.app` 또는 `mymemo.com`)을 등록해주세요.

---

## 🛠️ 주요 기능
- **회색 체크 배경 & 픽셀 도트 글씨체**: 갈무리9 & 네오둥근모 웹폰트 적용
- **하늘색 입체 베벨 버튼**: 2000년대 싸이월드 시그니처 탭 디자인
- **Firebase Firestore 실시간 동기화**: 본인 계정 UID 전용 비공개 보안 규칙
- **4자리 레트로 PIN 비밀번호 잠금**: 비밀 금고 탭 보안 인증
- **BGM 플레이어**: 2000년대 감성 칩튠 사운드 (프리스타일 - Y 등)
- **속지 테마 & 태그 & 검색 & 캘린더 달력 뷰 & JSON 백업**
