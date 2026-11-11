import { describe, it, expect } from 'vitest'
import { F, buildPacket, parseFrame, parseSoopTarget, mapSoopFrame, parseChannelInfo, parseBno, connectPacket, joinPacket, pingPacket, soopWsUrl } from '../src/core/soop.js'
import { ytWebTarget, parseWatchPage, nextContinuation, mapWebItem, mapWebResponse, runsToText } from '../src/core/ytweb.js'

describe('SOOP', () => {
  it('주소에서 방송인 ID를 뽑는다', () => {
    expect(parseSoopTarget('abc123')).toBe('abc123')
    expect(parseSoopTarget('https://play.sooplive.com/abc123/12345')).toBe('abc123')
    expect(parseSoopTarget('https://ch.sooplive.co.kr/abc123')).toBe('abc123')
    expect(parseSoopTarget('play.afreecatv.com/abc123')).toBe('abc123')
    expect(parseSoopTarget('https://evil.com/abc123')).toBeNull()
    expect(parseSoopTarget('https://sooplive.com.evil.com/abc123')).toBeNull()
    expect(parseSoopTarget('')).toBeNull()
  })
  it('패킷 길이는 UTF-8 바이트 기준', () => {
    const p = buildPacket('0005', '가' + F)
    expect(p.slice(2, 6)).toBe('0005')
    expect(p.slice(6, 12)).toBe('000004')
    expect(connectPacket()).toContain('16')
    expect(joinPacket('777')).toContain('777')
    expect(pingPacket().length).toBeGreaterThan(10)
  })
  it('채팅 프레임을 읽고 변환한다', () => {
    const raw = buildPacket('0005', F + ['안녕하세요', 'userid', '1', '0', '0', '닉네임', '0', '0'].join(F))
    const fr = parseFrame(raw)
    expect(fr.code).toBe('0005')
    const m = mapSoopFrame(fr, { bjId: 'bj', now: 5, seq: 1 })
    expect(m).toMatchObject({ nick: '닉네임', text: '안녕하세요', streamer: false, platform: 'soop' })
    const bj = mapSoopFrame(parseFrame(buildPacket('0005', F + ['hi', 'BJ', '1', '0', '0', 'n', '0', '0'].join(F))), { bjId: 'bj' })
    expect(bj.streamer).toBe(true)
  })
  it('이상한 프레임은 무시한다', () => {
    expect(parseFrame('x')).toBeNull()
    expect(parseFrame(null)).toBeNull()
    expect(mapSoopFrame(parseFrame(buildPacket('0005', 'a' + F + 'b')))).toBeNull()
    expect(mapSoopFrame(parseFrame(buildPacket('0004', F + ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].join(F))))).toBeNull()
  })
  it('별풍선', () => {
    const m = mapSoopFrame(parseFrame(buildPacket('0018', F + ['x', 'id', '후원자', '10', '1', '0', '0', '0', '0', '0'].join(F))))
    expect(m.text).toBe('[별풍선 10개]')
  })
  it('방송 정보 해석과 도메인 제한', () => {
    const ok = parseChannelInfo({ CHANNEL: { RESULT: 1, BJID: 'bj', CHDOMAIN: 'CHAT.sooplive.com', CHATNO: '123', CHPT: '8999', TITLE: 't' } })
    expect(ok.info.port).toBe(9000)
    expect(soopWsUrl(ok.info)).toBe('wss://chat.sooplive.com:9000/Websocket/bj')
    expect(parseChannelInfo({ CHANNEL: { RESULT: -6 } }).error.code).toBe('adult')
    expect(parseChannelInfo({ CHANNEL: { RESULT: 0 } }).error.code).toBe('offair')
    expect(parseChannelInfo({ CHANNEL: { RESULT: 1, BJID: 'b', CHDOMAIN: 'evil.com', CHATNO: '1', CHPT: '1' } }).error.code).toBe('malformed')
    expect(parseChannelInfo({}).error.code).toBe('none')
  })
  it('방송 번호', () => {
    expect(parseBno('<img src="https://liveimg.sooplive.com/m/123456">')).toBe('123456')
    expect(parseBno('{"bno":"777"}')).toBe('777')
    expect(parseBno('')).toBeNull()
  })
})

describe('YouTube 간편 연결', () => {
  it('주소 해석', () => {
    expect(ytWebTarget('dQw4w9WgXcQ')).toMatchObject({ kind: 'video' })
    expect(ytWebTarget('https://youtu.be/dQw4w9WgXcQ').url).toContain('dQw4w9WgXcQ')
    expect(ytWebTarget('https://www.youtube.com/live/dQw4w9WgXcQ?feature=share').url).toContain('v=dQw4w9WgXcQ')
    expect(ytWebTarget('@someone')).toEqual({ kind: 'channel', url: 'https://www.youtube.com/@someone/live' })
    expect(ytWebTarget('https://www.youtube.com/@someone')).toMatchObject({ kind: 'channel' })
    expect(ytWebTarget('https://www.youtube.com/channel/UCabcdefghijklmnopqrstuv')).toMatchObject({ kind: 'channel' })
    expect(ytWebTarget('https://evil.com/watch?v=dQw4w9WgXcQ')).toBeNull()
    expect(ytWebTarget('https://youtube.com.evil.com/watch?v=dQw4w9WgXcQ')).toBeNull()
    expect(ytWebTarget('')).toBeNull()
  })
  it('방송 페이지에서 값 뽑기', () => {
    const html = '<title>제목 - YouTube</title>"INNERTUBE_API_KEY":"KEY","INNERTUBE_CONTEXT_CLIENT_VERSION":"2.2024","isLiveNow":true,"liveChatRenderer":{"continuations":[{"reloadContinuationData":{"continuation":"CONT"}}]}'
    expect(parseWatchPage(html)).toMatchObject({ key: 'KEY', version: '2.2024', continuation: 'CONT' })
    expect(parseWatchPage('"INNERTUBE_API_KEY":"K","INNERTUBE_CONTEXT_CLIENT_VERSION":"1"').error.code).toBe('nolive')
    expect(parseWatchPage('nothing').error.code).toBe('page')
  })
  it('다음 조회 값', () => {
    const j = { continuationContents: { liveChatContinuation: { continuations: [{ timedContinuationData: { continuation: 'N', timeoutMs: 100 } }] } } }
    expect(nextContinuation(j)).toEqual({ continuation: 'N', delayMs: 1500 })
    expect(nextContinuation({}).ended).toBe(true)
  })
  it('일반·슈퍼챗·멤버십 변환', () => {
    const text = { liveChatTextMessageRenderer: { id: 'a', timestampUsec: '1700000000000000', authorName: { simpleText: '닉' }, message: { runs: [{ text: '안녕 ' }, { emoji: { emojiId: '😀', isCustomEmoji: false } }] }, authorBadges: [{ liveChatAuthorBadgeRenderer: { icon: { iconType: 'OWNER' } } }] } }
    expect(mapWebItem(text)).toMatchObject({ id: 'ya', nick: '닉', text: '안녕 😀', streamer: true, time: 1700000000000, platform: 'youtube' })
    const paid = { liveChatPaidMessageRenderer: { id: 'b', authorName: { simpleText: 'x' }, purchaseAmountText: { simpleText: '₩5,000' }, message: { runs: [{ text: '응원' }] } } }
    expect(mapWebItem(paid).text).toBe('[슈퍼챗 ₩5,000] 응원')
    expect(mapWebItem({ liveChatMembershipItemRenderer: { id: 'c', authorName: { simpleText: 'm' }, headerSubtext: { runs: [{ text: '새 멤버' }] } } }).text).toBe('새 멤버')
    expect(mapWebItem({ liveChatViewerEngagementMessageRenderer: { id: 'z' } })).toBeNull()
    expect(mapWebItem({ liveChatTextMessageRenderer: { authorName: { simpleText: 'x' }, message: { runs: [{ text: 'a' }] } } })).toBeNull()
  })
  it('커스텀 이모지는 허용된 주소만', () => {
    const ok = runsToText([{ emoji: { isCustomEmoji: true, image: { thumbnails: [{ url: 'https://yt3.ggpht.com/a=s24' }] } } }])
    expect(ok.text).toBe('{:y0:}')
    expect(ok.emojis.y0).toContain('ggpht.com')
    const bad = runsToText([{ emoji: { isCustomEmoji: true, image: { thumbnails: [{ url: 'https://evil.com/a.png' }] } } }])
    expect(bad.emojis).toEqual({})
    expect(runsToText([{ text: '{:y0:}' }]).text).not.toContain('{:y0:}')
  })
  it('중복 id는 한 번만', () => {
    const j = { continuationContents: { liveChatContinuation: { actions: [{ addChatItemAction: { item: { liveChatTextMessageRenderer: { id: 'q', authorName: { simpleText: 'n' }, message: { runs: [{ text: 'hi' }] } } } } }] } } }
    const seen = new Set()
    expect(mapWebResponse(j, seen)).toHaveLength(1)
    expect(mapWebResponse(j, seen)).toHaveLength(0)
  })
})

import { normalizeChatStyle, defaultChatStyle } from '../src/core/chatStyle.js'
describe('채팅창 배경 그림', () => {
  it('기본값과 정리', () => {
    const d = normalizeChatStyle(defaultChatStyle())
    expect(d).toMatchObject({ bgImage: '', bgImageFit: 'cover', bgImageOpacity: 1 })
    const n = normalizeChatStyle({ bgImage: 'media/a.png', bgImageFit: 'tile', bgImageOpacity: 5 })
    expect(n).toMatchObject({ bgImage: 'media/a.png', bgImageFit: 'tile', bgImageOpacity: 1 })
    expect(normalizeChatStyle({ bgImageFit: 'x', bgImage: 3 })).toMatchObject({ bgImageFit: 'cover', bgImage: '' })
  })
})

import { TRANSITIONS, transitionFrames, transitionMs, isTransition } from '../src/core/transitions.js'
import { normalizeOutput } from '../src/core/project.js'
import { TEMPLATES, buildTemplateProject } from '../src/core/templates.js'
describe('장면 전환 효과', () => {
  it('목록과 정리', () => {
    expect(TRANSITIONS.length).toBeGreaterThanOrEqual(9)
    expect(normalizeOutput({ transition: 'zoom' }).transition).toBe('zoom')
    expect(normalizeOutput({ transition: 'wipe' }).transition).toBe('wipe')
    expect(normalizeOutput({ transition: 'cut' }).transition).toBe('cut')
    expect(normalizeOutput({ transition: 'evil' }).transition).toBe('fade')
    expect(isTransition('blur')).toBe(true)
    expect(transitionMs('cut')).toBe(0)
  })
  it('밀기는 새 장면이 옆에서 들어오고 이전 장면은 반대로 나간다', () => {
    const f = transitionFrames('slide-left')
    expect(f.nextFrom.transform).toBe('translate(100%, 0%)')
    expect(f.prevTo.transform).toBe('translate(-100%, 0%)')
    expect(transitionFrames('wipe').nextFrom.clipPath).toContain('100%')
    expect(transitionFrames('fade').prevTo.opacity).toBe(0)
  })
})
describe('템플릿 10종', () => {
  it('고유 id, 전환 효과가 프로젝트에 들어간다', () => {
    expect(TEMPLATES.length).toBe(10)
    expect(new Set(TEMPLATES.map((t) => t.id)).size).toBe(10)
    for (const t of TEMPLATES) expect(isTransition(t.transition ?? 'fade')).toBe(true)
    const p = buildTemplateProject(TEMPLATES.find((t) => t.id === 'arcade-night'), 'x')
    expect(p.output.transition).toBe('wipe')
    expect(buildTemplateProject(TEMPLATES[0], 'x').output.transition).toBe('fade')
  })
})
