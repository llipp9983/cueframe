export const OBS_GUIDE = `OBS에서 대기화면 보내기

1. CUEFRAME 아래쪽의 [출력 창 열기]를 눌러 '방송 출력 창'을 엽니다.
2. OBS의 소스 목록에서 + 를 눌러 [창 캡처]를 추가합니다.
3. 창 항목에서 '[CUEFRAME.exe]: 방송 출력 창'을 고릅니다.
4. 캡처 방식은 'Windows 10 (1903 이상)'을 고르고, 커서 캡처는 끕니다.
5. 출력 창이 다른 창에 가려져도 캡처됩니다. 최소화하면 화면이 멈추므로 최소화 대신 [-] 버튼을 쓰면 창이 화면 밖으로 숨겨집니다.
6. 숨긴 창을 되돌리려면 [출력 창 열기]를 다시 누르세요.

출력 해상도(1920x1080 / 1280x720)는 OBS 캔버스와 같게 맞추면 가장 선명합니다.`

export const CHZZK_GUIDE_STEPS = [
  { title: '치지직 개발자센터 접속', body: '브라우저에서 치지직 개발자센터(developers.chzzk.naver.com)에 접속하고 네이버 계정으로 로그인합니다.' },
  { title: '애플리케이션 등록', body: '[애플리케이션 등록] 버튼을 눌러 새 앱을 만듭니다. 앱 이름은 자유롭게 정하세요.' },
  { title: '로그인 리디렉션 URL 입력', body: '로그인 리디렉션 URL 칸에 아래 주소를 정확히 입력합니다.\n\nhttp://localhost:51789/callback' },
  { title: 'API 권한(Scope) 선택', body: '채팅 메시지 조회 권한을 선택합니다. 이 권한이 없으면 "채팅 조회 권한이 없습니다"라고 표시됩니다.' },
  { title: 'Client ID · Client Secret 확인', body: '등록이 끝나면 Client ID와 Client Secret이 나옵니다. Client Secret은 다른 사람에게 보여 주지 마세요.' },
  { title: 'CUEFRAME에 키 입력', body: 'CUEFRAME 아래쪽의 [채팅 연결…]을 열고 "앱 키" 칸에 두 값을 넣은 뒤 [저장]을 누릅니다. 키는 이 PC에 암호화되어 보관됩니다.' },
  { title: '로그인하고 연결', body: '[로그인]을 누르면 브라우저가 열립니다. 로그인하면 자동으로 연결되고, 연결 상태 점이 초록색으로 바뀝니다.' },
]

export const CHZZK_GUIDE_TEXT = CHZZK_GUIDE_STEPS.map((s, i) => `${i + 1}. ${s.title}\n${s.body}`).join('\n\n')

export const ABOUT_TEXT = (info) => `CUEFRAME ${info.version}
방송 대기화면 편집기

Electron ${info.electron} · Chromium ${info.chrome}

오픈소스 고지
이 프로그램은 다음 오픈소스를 사용합니다.
- Electron (MIT)
- React (MIT)
- Vite (MIT)
- Zustand (MIT)
- socket.io-client (MIT)
- fflate (MIT)
- Pretendard 글꼴 (SIL Open Font License 1.1)`
