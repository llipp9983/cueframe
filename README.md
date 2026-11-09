# CUEFRAME

방송 대기화면 편집기. Electron + React + Vite (JavaScript).

## 실행

```bash
npm install
npm run dev      # 개발 모드 (Vite + Electron)
npm start        # 빌드 후 실행
npm test         # core 단위 테스트 (Vitest)
npm run dist     # Windows 설치 파일(NSIS)·zip 만들기 (electron-builder)
```

## 구조

```
electron/   메인 프로세스: 창, IPC, 파일 저장, 암호화 보관(safeStorage), 치지직 연동, 로그
src/core/   화면과 무관한 순수 함수: 레이어·장면·크기 조절·투명도 분석·프로젝트 읽기/쓰기·채팅 설정·프리셋
src/renderer/
  editor/   편집기 (레이어 목록, 미리보기, 속성 패널, 채팅 설정)
  output/   방송 출력 창
  scene/    미리보기와 출력 창이 함께 쓰는 장면·채팅창 컴포넌트
  dialogs/  채팅 연결, 연결 방법, 확인·이름 입력 창
  theme/    디자인 토큰, 컨트롤 스타일, 아이콘
tests/      core 테스트
```

## OBS 연결

[출력 창 열기] → OBS 소스 [창 캡처] → "방송 출력 창" 선택. 최소화 대신 화면 밖으로 숨겨집니다.

## 데이터 위치 (기존 프로그램과 같음)

`%AppData%\StandbyScreen` (recent-projects.json, chat-presets.json, settings.json, logs)
`%LocalAppData%\StandbyScreen` (appkey.bin, credentials.bin — 암호화)
