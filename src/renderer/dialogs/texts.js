export const OBS_GUIDE = `OBS에서 대기화면 보내기

1. CUEFRAME 오른쪽 아래의 [출력 창 열기]를 눌러 '방송 출력 창'을 엽니다.
2. OBS의 소스 목록에서 + 를 눌러 [창 캡처]를 추가합니다.
3. 창 항목에서 '[CUEFRAME.exe]: 방송 출력 창'을 고릅니다.
4. 캡처 방식은 'Windows 10 (1903 이상)'을 고르고, 커서 캡처는 끕니다.
5. 출력 창이 다른 창에 가려져도 캡처됩니다. 최소화하면 화면이 멈추므로 최소화 대신 [-] 버튼을 쓰면 창이 화면 밖으로 숨겨집니다.
6. 숨긴 창을 되돌리려면 [출력 창 열기]를 다시 누르세요.

출력 해상도(1920x1080 / 1280x720)는 [⚙ 출력 설정]에서 바꿀 수 있고, OBS 캔버스와 같게 맞추면 가장 선명합니다.`

/** images: public/guide/ 안의 그림 파일. 치지직 개발자센터 화면은 치지직이 바꿀 수 있어 그림 대신 글로 안내한다. */
export const CHZZK_GUIDE_STEPS = [
  { title: '치지직 개발자센터 접속', body: '브라우저에서 치지직 개발자센터(developers.chzzk.naver.com)에 접속하고 네이버 계정으로 로그인합니다.\n\n채팅 연결 창의 [치지직 개발자센터 열기] 버튼으로도 열 수 있습니다.' },
  { title: '애플리케이션 등록', body: '[애플리케이션 등록] 버튼을 눌러 새 앱을 만듭니다. 앱 이름은 자유롭게 정하세요.' },
  { title: '로그인 리디렉션 URL 입력', body: '로그인 리디렉션 URL 칸에 아래 주소를 정확히 입력합니다. 채팅 연결 창의 [복사] 버튼으로 복사해서 붙여 넣으면 틀리지 않습니다.\n\nhttp://localhost:51789/callback', images: ['connect-key.png'] },
  { title: 'API 권한(Scope) 선택', body: '채팅 메시지 조회 권한을 선택합니다. 이 권한이 없으면 "채팅 조회 권한이 없습니다"라고 표시됩니다.' },
  { title: 'Client ID · Client Secret 확인', body: '등록이 끝나면 Client ID와 Client Secret이 나옵니다. Client Secret은 다른 사람에게 보여 주지 마세요.' },
  { title: 'CUEFRAME에 키 입력', body: '화면 아래의 채팅 상태 버튼(예: "채팅 설정 필요")을 누르면 채팅 연결 창이 열립니다. 두 값을 붙여 넣고 [저장하고 다음으로]를 누르세요. 키는 이 PC에 암호화되어 보관됩니다.', images: ['connect-key.png'] },
  { title: '로그인하고 연결', body: '[치지직 로그인]을 누르면 브라우저가 열립니다. 로그인하고 허용을 누르면 자동으로 돌아와 연결됩니다. 연결되면 상태가 "연결됨"으로 바뀝니다.', images: ['connect-login.png', 'connect-wait.png', 'connect-done.png'] },
]

export const CHZZK_GUIDE_TEXT = CHZZK_GUIDE_STEPS.map((s, i) => `${i + 1}. ${s.title}\n${s.body}`).join('\n\n')

/** 처음 쓰는 분을 위한 안내. 그림은 이 프로그램의 실제 화면(샘플 데이터)이다. */
export const START_GUIDE_STEPS = [
  { title: '템플릿으로 시작하기', body: '[파일] > [템플릿으로 새 프로젝트…]에서 마음에 드는 대기화면을 고르면 배경, 테이블, 소품, 문구, 채팅창이 한 번에 만들어집니다. 빈 화면에서 시작하려면 [＋ 추가] 메뉴를 쓰세요.', images: ['templates.png'] },
  { title: '화면 구성', body: '왼쪽은 레이어 목록(위가 앞), 가운데는 미리보기, 오른쪽은 고른 요소의 설정입니다. 미리보기에서 요소를 끌어 옮기고, 손잡이로 크기와 회전을 바꿉니다. 이미지 파일을 미리보기로 끌어다 놓아도 추가됩니다.', images: ['editor.png'] },
  { title: '요소 추가하기', body: '왼쪽 아래 [＋ 추가]에서 배경, 테이블, 소품, 채팅창, 문구·시계·카운트다운, 분위기 효과(눈·꽃잎 등), 치지직 위젯을 추가합니다. 소품은 테이블 윗면에 자동으로 붙습니다.', images: ['add-menu.png'] },
  { title: '장면과 방송', body: '위쪽 탭이 장면입니다. "대기 중", "곧 시작"처럼 여러 장면을 만들고 Ctrl+1~9로 바꿉니다. [방송: …]에서 "편집 중인 장면을 바로 방송"을 끄면, 방송에 나가는 장면과 편집하는 장면을 따로 둘 수 있습니다.', images: ['live-menu.png'] },
  { title: '채팅 연결', body: '화면 오른쪽 아래의 채팅 상태 버튼을 누르면 채팅을 연결하는 창이 열립니다. 위쪽 탭에서 치지직, YouTube, SOOP 중 하나를 고르세요. YouTube(간편 연결)와 SOOP은 방송 주소나 ID만 넣으면 되고, 치지직은 처음 한 번 앱 키를 만들어야 합니다. 연결되면 채팅창에 실제 채팅이 나옵니다. (치지직·YouTube는 이모티콘 이미지도 표시)', images: ['connect-done.png'] },
  { title: '출력 창과 OBS', body: '[출력 창 열기]를 누르면 방송용 창이 열립니다. OBS에서 소스 > [창 캡처]로 "방송 출력 창"을 고르세요. 해상도와 장면 전환 효과(페이드·밀기·줌·흐림·닦아내기)는 [⚙ 출력 설정]에서 바꿉니다. 자세한 방법은 [도움말] > [OBS 설정 안내]에 있습니다.', images: ['output-settings.png', 'output.jpg'] },
]

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
- ws (MIT)
- electron-updater (MIT)
- fflate (MIT)
- font-list (MIT)
- Orbitron, Press Start 2P, Bungee, Fredoka 글꼴 (SIL Open Font License 1.1)
- Pretendard 글꼴 (SIL Open Font License 1.1)
- 주아(Jua), 블랙 한 산스(Black Han Sans), 도현(Do Hyeon), 고운돋움(Gowun Dodum) 글꼴 (SIL Open Font License 1.1)

템플릿 그림은 이 프로그램을 위해 직접 그린 것입니다.`
