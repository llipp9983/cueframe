// 채팅 메시지 버퍼, 표시 목록, 샘플 채팅.
export const BUFFER_MAX = 200

const NICKS = ['고양이집사', '민트초코', '밤하늘별', '코딩하는곰', '새벽라디오', '말랑젤리', '구름빵', '달빛산책']
const LINES = [
  '안녕하세요! 오늘도 방송 기대하고 있었어요',
  '화면 너무 예쁘다 ㅎㅎ {:cf_star:}',
  '대기 화면 BGM 좋은데요?',
  '오늘 메뉴는 뭔가요?',
  '잘 들려요~',
  '오늘도 고생 많으셨어요!',
  '곧 시작하나요?',
  '이 소품 어디서 구하셨어요?',
  '채팅창 디자인 바꾸셨네요',
  '구독하고 갑니다 ♥ {:cf_heart:}',
]
const svg = (body) => 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">' + body + '</svg>')
export const SAMPLE_EMOJIS = {
  cf_heart: svg('<path fill="#ff5a87" d="M16 28C4 20 2 12 6 8c3-3 8-2 10 2 2-4 7-5 10-2 4 4 2 12-10 20z"/>'),
  cf_star: svg('<path fill="#ffc83d" d="M16 2l4 9 10 1-7.5 6.5L25 29l-9-5-9 5 2.5-10.5L2 12l10-1z"/>'),
}
let sampleIndex = 0

export function resetSample() {
  sampleIndex = 0
}

/** 2초마다 호출. 닉네임 8개·문장 10개를 같은 순서로, 5번째마다 방송인. */
export function nextSampleMessage(now = Date.now()) {
  const i = sampleIndex++
  const streamer = (i + 1) % 5 === 0
  return {
    id: `s${now}-${i}`,
    nick: streamer ? '방송인' : NICKS[i % NICKS.length],
    text: LINES[i % LINES.length],
    ...(LINES[i % LINES.length].includes('{:') ? { emojis: SAMPLE_EMOJIS } : {}),
    streamer,
    time: now,
  }
}

export function pushMessage(buffer, msg) {
  const next = [...buffer, msg]
  return next.length > BUFFER_MAX ? next.slice(next.length - BUFFER_MAX) : next
}

/** 최신 n개에서 숨김 시간이 지난 것을 뺀다. */
export function visibleMessages(buffer, maxMessages, hideSeconds, now = Date.now()) {
  const latest = buffer.slice(-maxMessages)
  if (!hideSeconds) return latest
  return latest.filter((m) => now - m.time < hideSeconds * 1000)
}
