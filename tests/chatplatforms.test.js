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
describe('새 전환 효과와 사진 전환', () => {
  it('대각선·원형·사진 전환', async () => {
    const { PHOTO, PHOTO_MS, PHOTO_IN_MS, MAX_TRANSITION_IMAGES } = await import('../src/core/transitions.js')
    expect(transitionFrames('diagonal').nextFrom.clipPath).toContain('polygon')
    expect(transitionFrames('diagonal').nextTo.clipPath).toContain('polygon')
    expect(transitionFrames('iris').nextTo.clipPath).toContain('circle')
    expect(transitionFrames('photo').nextFrom.opacity).toBe(0)
    expect(PHOTO_MS).toBe(PHOTO_IN_MS * 2 + PHOTO.hold)
    expect(transitionMs('photo')).toBe(PHOTO_MS)
    expect(MAX_TRANSITION_IMAGES).toBe(6)
  })
  it('사진 목록 정리: 6장까지, 디스크에서는 상대 경로만', () => {
    const imgs = ['a.png', 'media/b.png', 'C:/x/c.png', '../evil.png', '', 5, 'd.png', 'e.png', 'f.png', 'g.png']
    expect(normalizeOutput({ transitionImages: imgs }).transitionImages).toEqual(['a.png', 'media/b.png', 'C:/x/c.png', '../evil.png', 'd.png', 'e.png'])
    expect(normalizeOutput({ transitionImages: imgs }, { fromDisk: true }).transitionImages).toEqual(['a.png', 'media/b.png', 'd.png', 'e.png', 'f.png', 'g.png'])
    expect(normalizeOutput({}).transitionImages).toEqual([])
    expect(normalizeOutput({ transition: 'photo' }).transition).toBe('photo')
  })
})
describe('fx 새 항목', () => {
  it('scroll·twinkle 정리', async () => {
    const { normalizeFx, hasFx } = await import('../src/core/fx.js')
    expect(normalizeFx({ scroll: 9999, twinkle: 5 })).toMatchObject({ scroll: 400, twinkle: 1 })
    expect(hasFx(normalizeFx({ scroll: 20 }))).toBe(true)
    expect(hasFx(normalizeFx({}))).toBe(false)
  })
})

import { isTemplateFileName, isTemplateId, newUserTemplateId, normalizeTemplateDef, parseTemplateJson, serializeTemplate, templateFiles, projectToTemplateDef } from '../src/core/templatePack.js'
import { TEMPLATES as ALL_T, exportDefinition, templateParts, buildTemplateProject as buildT } from '../src/core/templates.js'
describe('템플릿 파일(.cftemplate)', () => {
  it('파일 이름·id 검사', () => {
    expect(isTemplateFileName('bg.jpg')).toBe(true)
    for (const bad of ['../bg.jpg', 'a/b.png', 'a\b.png', 'bg.exe', 'bg', '.png', 'a b.png', 'x'.repeat(90) + '.png', '', null]) expect(isTemplateFileName(bad), String(bad)).toBe(false)
    expect(isTemplateId('u-abc-1x2y')).toBe(true)
    expect(isTemplateId('../x')).toBe(false)
    expect(newUserTemplateId('내 템플릿 Cool!', () => 0)).toMatch(/^u-cool-/)
    expect(newUserTemplateId('한글만', () => 0.5)).toMatch(/^u-[a-z0-9]{4}$/)
  })
  it('기본 템플릿을 내보냈다가 다시 읽어도 같다', () => {
    for (const t of ALL_T) {
      const def = exportDefinition(t)
      const files = templateFiles(def)
      const back = parseTemplateJson(serializeTemplate(def), files)
      expect(back.name).toBe(t.name)
      expect(back.wait.length).toBe(t.wait.length)
      expect(back.transition).toBe(t.transition)
      expect(back.chatStyle).toBeTruthy()
    }
  })
  it('없는 파일·위험한 이름·잘못된 형식은 거절', () => {
    const t = exportDefinition(ALL_T[0])
    expect(() => normalizeTemplateDef(t, new Set())).toThrow(/들어 있지 않습니다/)
    const evil = JSON.parse(JSON.stringify(t))
    evil.wait[0].file = '../../evil.png'
    expect(() => normalizeTemplateDef(evil, new Set(['../../evil.png']))).toThrow(/이름이 올바르지/)
    expect(() => parseTemplateJson('not json', new Set())).toThrow(/읽을 수 없습니다/)
    expect(() => parseTemplateJson(JSON.stringify({ format: 'other' }), new Set())).toThrow(/템플릿 파일이 아닙니다/)
    expect(() => parseTemplateJson(JSON.stringify({ format: 'cueframe-template', version: 99, template: {} }), new Set())).toThrow(/새로운 버전/)
    expect(() => normalizeTemplateDef({ name: '', wait: [] }, new Set())).toThrow()
    expect(() => normalizeTemplateDef({ name: 'x', wait: [{ kind: 'Evil' }] }, new Set())).toThrow(/알 수 없는 레이어/)
    expect(() => normalizeTemplateDef({ name: 'x', wait: new Array(61).fill({ kind: 'Chat' }) }, new Set())).toThrow(/너무 많습니다/)
  })
  it('이상한 값은 범위 안으로, 채팅창 그림은 파일에 있는 것만', () => {
    const def = normalizeTemplateDef({ name: 'T', transition: 'nope', wait: [{ kind: 'Prop', file: 'a.png', x: 1e9, y: -1e9, w: -5, h: 1e9, fx: { glow: 9, scroll: 1e6 } }], chatStyle: { bgImage: 'missing.png', images: [{ src: 'a.png' }, { src: 'zzz.png' }] } }, new Set(['a.png']))
    expect(def.transition).toBe('fade')
    expect(def.wait[0]).toMatchObject({ x: 20000, y: -20000, w: 1, h: 20000, fx: { glow: 1, scroll: 400 } })
    expect(def.chatStyle.bgImage).toBe('')
    expect(def.chatStyle.images.map((i) => i.src)).toEqual(['a.png'])
  })
  it('현재 화면을 템플릿으로: 그림만 넣고 영상·위젯은 건너뜀', () => {
    const layers = [
      { kind: 'Background', name: '배경', mediaPath: 'C:/x/bg.png', x: 0, y: 0, width: 1920, height: 1080, opacity: 1, rotation: 0, flipX: false, fx: null },
      { kind: 'Prop', name: '소품', mediaPath: 'C:/x/video.mp4', x: 0, y: 0, width: 10, height: 10, opacity: 1, rotation: 0, flipX: false, fx: null },
      { kind: 'Text', name: '제목', x: 10, y: 10, width: 500, height: 100, text: { mode: 'text', content: '안녕', fontSize: 60 }, fx: null },
      { kind: 'Text', name: '카운트', x: 10, y: 200, width: 500, height: 100, text: { mode: 'countdown' }, fx: null },
      { kind: 'Particles', particles: { type: 'snow', count: 20 } },
      { kind: 'Widget' },
      { kind: 'Chat', x: 1440, y: 140, width: 440, height: 800, chat: { bgImage: 'C:/x/chatbg.png', images: [] } },
    ]
    const fileFor = (p) => (/\.(png)$/.test(p) ? p.split('/').pop() : null)
    const { def, skipped } = projectToTemplateDef({ name: '내 것', waitLayers: layers, output: { transition: 'zoom' }, fileFor })
    expect(skipped).toBe(2)
    expect(def.wait.map((s) => s.kind)).toEqual(['Background', 'Text', 'Text', 'Particles', 'Chat'])
    expect(def.wait[1].role).toBe('title')
    expect(def.wait[2].role).toBe('countdown')
    expect(def.chatStyle.bgImage).toBe('chatbg.png')
    const ok = normalizeTemplateDef({ ...def, id: 'x' }, new Set(['bg.png', 'chatbg.png']))
    expect(ok.transition).toBe('zoom')
  })
  it('일부만 적용: 채팅 모양·전환·움직임 레이어', () => {
    const t = ALL_T.find((x) => x.id === 'sky-online')
    const parts = templateParts(t, 'C:/t')
    expect(parts.transition).toBe(t.transition)
    expect(parts.chat.bgImage).toBe('')
    expect(parts.motion.length).toBeGreaterThan(2)
    expect(parts.motion.every((l) => l.kind === 'Particles' || l.kind === 'Prop')).toBe(true)
    const p = buildT({ ...t, transitionImages: ['a.png'] }, 'C:/t')
    expect(p.output.transitionImages).toEqual(['C:/t/sky-online/a.png'])
  })
})

describe('프로젝트 파일 안전: 읽을 때 밖을 가리키는 경로 제거', () => {
  it('채팅창 그림·전환 사진은 프로젝트 안의 상대 경로만', async () => {
    const { parseProject } = await import('../src/core/project.js')
    const project = {
      version: 1,
      name: 'x',
      output: { transition: 'photo', transitionImages: ['media/a.png', 'C:/Users/me/secret.png', '//server/share/x.png', '../x.png'] },
      scenes: [{ id: 's1', name: 's', layers: [{ id: 'c1', kind: 'Chat', chat: { bgImage: '//server/share/bg.png', images: [{ src: 'media/ok.png' }, { src: 'C:/Windows/x.png' }, { src: '//evil/x.png' }] } }] }],
      activeSceneId: 's1',
    }
    const r = parseProject(JSON.stringify(project)).project
    expect(r.output.transitionImages).toEqual(['media/a.png'])
    const chat = r.scenes[0].layers.find((l) => l.kind === 'Chat').chat
    expect(chat.bgImage).toBe('')
    expect(chat.images.map((i) => i.src)).toEqual(['media/ok.png'])
  })
})
