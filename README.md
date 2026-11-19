# FRAME — 이미지·프롬프트 갤러리

이미지, 생성 프롬프트, 태그, 메모를 함께 보관하는 GitHub Pages 웹앱입니다. 정적 파일만 사용하며 방문자는 로그인 없이 공개 갤러리를 볼 수 있습니다.

## 처음 배포

1. GitHub에서 **공개 저장소**를 만들고 이 폴더의 **내용 전체**를 저장소 루트의 `main` 브랜치에 올립니다. `index.html`이 저장소 루트에 있어야 합니다.
2. 저장소의 **Settings → Pages → Build and deployment → Source**를 **GitHub Actions**로 선택합니다.
3. **Actions**에서 `Deploy gallery` 워크플로가 끝나면 `https://사용자명.github.io/저장소명/`으로 접속합니다.

## 작품 등록

1. GitHub **Settings → Developer settings → Personal access tokens → Fine-grained tokens**에서 이 저장소만 접근하는 토큰을 만듭니다. 저장소 권한은 **Contents: Read and write**로 설정합니다.
2. 사이트의 **GitHub 연결 설정**에서 저장소 URL과 토큰을 입력합니다.
3. **작품 등록**에서 이미지(10MB 이하), 제목, 프롬프트를 입력해 게시합니다. `images/`에 이미지가 올라가고 `data/entries.json`에 프롬프트가 저장됩니다. GitHub Actions가 자동으로 사이트를 갱신합니다.

토큰은 서버나 브라우저 저장소에 기록하지 않고 열린 탭의 메모리에만 유지합니다. 탭을 새로 열거나 새로고침하면 게시할 때 다시 입력해야 합니다. 저장소 주소만 이 브라우저에 기억됩니다. 토큰을 타인과 공유하지 마세요. 갤러리와 프롬프트는 공개 저장소에서 누구나 볼 수 있습니다.

## 로컬 미리보기

정적 서버를 이 폴더에서 실행합니다. 예: `python -m http.server 8080` 후 `http://localhost:8080/` 접속. 로컬 미리보기에서도 연결 설정 후 게시할 수 있습니다.

## 파일 구조

- `index.html`, `styles.css`, `app.js`: 웹앱
- `data/entries.json`: 이미지와 프롬프트 목록
- `images/`: 등록된 원본 이미지
- `.github/workflows/pages.yml`: 자동 배포
