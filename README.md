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

## 주요 기능

- 템플릿 6종(별빛 밤하늘·벚꽃 카페·네온 도시·민트 룸·노을 해변·미니멀 다크)으로 한 번에 시작, 처음 쓰는 분을 위한 시작하기 안내
- 글꼴 선택(내장 4종 + 내 PC 글꼴), 레이어 효과(그림자·빛나기·둥실둥실·흔들림·숨쉬기·돌기), 눈·꽃잎 같은 분위기 효과 레이어
- 치지직 이모티콘 이미지 표시, YouTube 라이브 채팅 연결(내 구글 인증 정보 방식, 하루 사용량 표시)
- 장면 여러 개(최대 20개)와 방송용 장면 따로 고르기, 페이드 전환
- 문구·시계·카운트다운, 치지직 위젯(후원 알림·영상 후원) 레이어
- 레이어 효과: 그림자, 둥실둥실, 흔들림, 흐리게, 어둡게
- 정렬·스냅·끌어다 놓기·단축키, 레이어 이름 바꾸기(F2)·끌어서 순서 바꾸기
- 채팅 프리셋 16종 + 내 프리셋 가져오기·내보내기
- 자동 저장(1분마다)과 비정상 종료 후 복구, 자동 업데이트(설치 파일 기준)

## OBS 연결

[출력 창 열기] → OBS 소스 [창 캡처] → "방송 출력 창" 선택. 최소화 대신 화면 밖으로 숨겨집니다.

## 자동 업데이트

설치 파일(.exe)로 설치한 경우에만 동작합니다. 올릴 곳은 `package.json`의 `build.publish`에서 정합니다(지금은 이 저장소의 GitHub 릴리즈). 새 버전은 `.exe`, `.exe.blockmap`, `latest.yml`을 릴리즈에 올리면 설치된 앱이 알려 줍니다. 확인에 실패하면 로그에만 남습니다.

## 데이터 위치 (기존 프로그램과 같음)

`%AppData%\StandbyScreen` (recent-projects.json, chat-presets.json, settings.json, logs)
`%LocalAppData%\StandbyScreen` (appkey.bin, credentials.bin — 암호화)
