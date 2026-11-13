import { describe, it, expect } from 'vitest'
import { F, buildPacket, parseFrame, mapSoopFrame, mapSoopFrames } from '../src/core/soop.js'
import { mapWebItem } from '../src/core/ytweb.js'
import { mapChatItem } from '../src/core/youtube.js'
import { cleanDonation, donationMessage, normalizeAlert, alertAccepts, amountNumber, wonText } from '../src/core/donation.js'
import { normalizeLayer } from '../src/core/layer.js'
import { parseProject, serializeProject } from '../src/core/project.js'

const fr = (cmd, fields) => parseFrame(buildPacket(cmd, F + fields.join(F)))

describe('후원 정보', () => {
  it('종류가 없으면 버리고, 길이를 줄인다', () => {
    expect(cleanDonation({ kind: 'x' })).toBeNull()
    expect(cleanDonation(null)).toBeNull()
    expect(cleanDonation({ kind: 'cash', amount: '1'.repeat(99), text: 'a'.repeat(999) }).text.length).toBe(300)
  })
  it('금액 글', () => {
    expect(wonText(5000)).toBe('5,000원')
    expect(wonText('x')).toBe('')
    expect(amountNumber('5,000원')).toBe(5000)
    expect(amountNumber('₩1,000')).toBe(1000)
  })
  it('알림 칸은 종류·최소 금액으로 거른다', () => {
    const s = normalizeAlert({ kinds: ['cash'], minAmount: 1000 })
    expect(alertAccepts(s, { kind: 'cash', amount: '5,000원' })).toBe(true)
    expect(alertAccepts(s, { kind: 'cash', amount: '500원' })).toBe(false)
    expect(alertAccepts(s, { kind: 'mission', amount: '5,000원' })).toBe(false)
    expect(alertAccepts(s, null)).toBe(false)
  })
  it('알림 칸 설정은 잘못된 값을 바로잡는다', () => {
    const s = normalizeAlert({ seconds: 999, anim: 'zzz', textColor: 'red', kinds: ['cash', 'bad'] })
    expect(s.seconds).toBe(30)
    expect(s.anim).toBe('pop')
    expect(s.textColor).toBe('#ffffff')
    expect(s.kinds).toEqual(['cash'])
  })
  it('알림 레이어가 저장·열기를 거쳐도 남는다', () => {
    const l = normalizeLayer({ kind: 'Alert', alert: { seconds: 9 } })
    expect(l.alert.seconds).toBe(9)
    const p = parseProject(serializeProject({ name: 'x', output: {}, scenes: [{ id: 's', name: 's', layers: [l] }], activeSceneId: 's' })).project
    expect(p.layers[0].kind).toBe('Alert')
    expect(p.layers[0].alert.seconds).toBe(9)
  })
})

describe('SOOP 후원', () => {
  it('별풍선', () => {
    const m = mapSoopFrame(fr('0018', ['bj', 'uid', '닉', '100', '1', '0', '0', 'f', '0', '0']), { now: 5 })
    expect(m.donation).toMatchObject({ kind: 'balloon', amount: '100개' })
    expect(m.text).toBe('[별풍선 100개]')
  })
  it('영상풍선·애드벌룬', () => {
    const v = mapSoopFrame(fr('0105', ['1', 'bj', 'uid', '닉', '30', '0', '0', '0', 'f', '0', '0', '0', 'x', '0']), { now: 5 })
    expect(v.donation).toMatchObject({ kind: 'video', amount: '30개' })
    expect(v.nick).toBe('닉')
    const a = mapSoopFrame(fr('0087', ['1', 'bj', 'uid', '닉', '문구', '', '제목', 'u', 'd', '7', '0', '0', '0', '0']), { now: 5 })
    expect(a.donation).toMatchObject({ kind: 'adballoon', amount: '7개', title: '제목', text: '문구' })
  })
  it('미션과 미션 정산', () => {
    const m = mapSoopFrame(parseFrame(buildPacket('0121', F + JSON.stringify({ type: 'CHALLENGE_NOTICE', mission_status: 'FAIL', title: '미션1' }))), { now: 5 })
    expect(m.donation).toMatchObject({ kind: 'mission', title: '미션1', text: '실패' })
    expect(mapSoopFrame(fr('0121', ['not json']))).toBeNull()
    const list = mapSoopFrames(parseFrame(buildPacket('0125', F + JSON.stringify({ chno: 1, list: [['u1', '닉1', 100], ['u2', '닉2', 0]] }))), { now: 5 })
    expect(list).toHaveLength(1)
    expect(list[0].donation).toMatchObject({ kind: 'mission', amount: '100개' })
    expect(mapSoopFrames(fr('0005', ['hi', 'u', '1', '0', '0', 'n', '0', '0']))).toHaveLength(1)
    expect(mapSoopFrames(fr('9999', ['x']))).toEqual([])
  })
  it('짧은 패킷은 무시', () => {
    expect(mapSoopFrame(fr('0105', ['1']))).toBeNull()
    expect(mapSoopFrame(fr('0087', ['1']))).toBeNull()
  })
})

describe('YouTube 후원', () => {
  it('간편 연결: 슈퍼챗·스티커·멤버십', () => {
    const sc = mapWebItem({ liveChatPaidMessageRenderer: { id: 'a', authorName: { simpleText: '가' }, purchaseAmountText: { simpleText: '₩5,000' }, message: { runs: [{ text: '화이팅' }] } } })
    expect(sc.donation).toMatchObject({ kind: 'superchat', amount: '₩5,000', text: '화이팅' })
    const st = mapWebItem({ liveChatPaidStickerRenderer: { id: 'b', authorName: { simpleText: '나' }, purchaseAmountText: { simpleText: '$2' } } })
    expect(st.donation.kind).toBe('sticker')
    const mb = mapWebItem({ liveChatMembershipItemRenderer: { id: 'c', authorName: { simpleText: '다' }, headerSubtext: { runs: [{ text: '가입' }] } } })
    expect(mb.donation.kind).toBe('member')
    expect(mapWebItem({ liveChatTextMessageRenderer: { id: 'd', authorName: { simpleText: '라' }, message: { runs: [{ text: 'hi' }] } } }).donation).toBeUndefined()
  })
  it('공식 API: 슈퍼챗', () => {
    const m = mapChatItem({ id: 'x', snippet: { type: 'superChatEvent', publishedAt: '2026-01-01T00:00:00Z', superChatDetails: { amountDisplayString: '₩1,000', userComment: '굿' } }, authorDetails: { displayName: '마' } })
    expect(m.donation).toMatchObject({ kind: 'superchat', amount: '₩1,000', text: '굿' })
  })
})

describe('donationMessage', () => {
  it('채팅 한 줄과 후원 정보를 같이 만든다', () => {
    const m = donationMessage({ id: 'i', platform: 'chzzk', nick: '닉', kind: 'cash', amount: '5,000원', text: '안녕' })
    expect(m.text).toBe('[후원 5,000원] 안녕')
    expect(m.platform).toBe('chzzk')
    expect(donationMessage({ id: 'i', platform: 'chzzk', nick: 'n', kind: 'zzz' })).toBeNull()
  })
})
