import { describe, it, expect } from 'vitest'
import { normalizeAlert, defaultAlert, ttsText, ttsAccepts, donationsCsv, spokenAmount, amountNumber } from '../src/core/donation.js'

const item = (over = {}) => ({ nick: '민트초코', donation: { kind: 'cash', amount: '5,000원', text: '화이팅 https://x.com/a 😀 입니다', title: '', ...over } })

describe('알림 소리·읽어 주기 설정', () => {
  it('기본은 꺼져 있다', () => {
    const d = defaultAlert()
    expect(d.soundOn).toBe(false)
    expect(d.ttsOn).toBe(false)
  })
  it('엉뚱한 값은 범위 안으로', () => {
    const s = normalizeAlert({ soundOn: 1, sound: 'x', soundVolume: 9, ttsRate: 0, ttsMaxChars: 1, soundFile: 5 })
    expect(s.soundOn).toBe(false) // true일 때만 켜진다
    expect(s.sound).toBe('chime')
    expect(s.soundVolume).toBe(1)
    expect(s.ttsRate).toBe(0.5)
    expect(s.ttsMaxChars).toBe(10)
    expect(s.soundFile).toBe('')
  })
  it('예전 프로젝트(소리 설정 없음)도 그대로 열린다', () => {
    const s = normalizeAlert({ seconds: 8 })
    expect(s.seconds).toBe(8)
    expect(s.ttsOn).toBe(false)
    expect(s.ttsNick).toBe(true)
  })
})

describe('읽어 줄 글', () => {
  const s = normalizeAlert({ ttsOn: true })
  it('닉네임·금액·메시지를 잇고 주소·이모티콘은 뺀다', () => {
    expect(ttsText(s, item())).toBe('민트초코님. 5,000원 후원. 화이팅 입니다')
  })
  it('항목을 끌 수 있다', () => {
    expect(ttsText({ ...s, ttsNick: false, ttsMessage: false }, item())).toBe('5,000원 후원')
  })
  it('글자 수 제한은 메시지에만 걸린다', () => {
    const t = ttsText({ ...s, ttsMaxChars: 10 }, item({ text: '가나다라마바사아자차카타파하' }))
    expect(t.startsWith('민트초코님. 5,000원 후원. ')).toBe(true)
    expect(t.endsWith('가나다라마바사아자차')).toBe(true)
  })
  it('후원 정보가 없으면 빈 글', () => {
    expect(ttsText(s, { nick: 'a' })).toBe('')
  })
  it('읽는 최소 금액', () => {
    const t = { ...s, ttsMinAmount: 3000 }
    expect(ttsAccepts(t, { amount: '5,000원' })).toBe(true)
    expect(ttsAccepts(t, { amount: '1,000원' })).toBe(false)
  })
})

describe('YouTube 읽기 다듬기', () => {
  const s = normalizeAlert({ ttsOn: true })
  it('외화 금액은 읽기 좋게, 비교는 대략 원으로', () => {
    expect(spokenAmount('₩10,000')).toBe('10,000원')
    expect(spokenAmount('$5.00')).toBe('5달러')
    expect(spokenAmount('¥500')).toBe('500엔')
    expect(spokenAmount('5,000원')).toBe('5,000원')
    expect(amountNumber('$5.00')).toBe(7000)
    expect(amountNumber('₩10,000')).toBe(10000)
    expect(amountNumber('100개')).toBe(100)
  })
  it('아이디 @, :이모지:, 반복 글자 정리', () => {
    const t = ttsText(s, { nick: '@coding_bear', donation: { kind: 'superchat', amount: '$5.00', text: ':_hugging: 고마워요ㅋㅋㅋㅋㅋㅋㅋㅋ', title: '' } })
    expect(t).toBe('coding_bear님. 5달러 슈퍼챗. 고마워요ㅋㅋㅋ')
  })
  it('외화 슈퍼챗도 최소 금액을 넘으면 읽는다', () => {
    expect(ttsAccepts({ ...s, ttsMinAmount: 5000 }, { amount: '$5.00' })).toBe(true)
    expect(ttsAccepts({ ...s, ttsMinAmount: 5000 }, { amount: '$1.00' })).toBe(false)
  })
})

describe('후원 기록 CSV', () => {
  const m = (nick, text, amount = '5,000원') => ({ id: nick, platform: 'chzzk', nick, time: new Date(2026, 0, 2, 3, 4, 5).getTime(), donation: { kind: 'cash', amount, text, title: '' } })
  it('머리글·BOM·쉼표/따옴표 처리', () => {
    const csv = donationsCsv([m('a', '안녕, "세상"')])
    expect(csv.startsWith('﻿시간,플랫폼,종류,닉네임,금액,제목,내용\r\n')).toBe(true)
    expect(csv).toContain('2026-01-02 03:04:05,치지직,후원,a,"5,000원",,"안녕, ""세상"""')
  })
  it('엑셀 수식으로 시작하는 글은 무력화', () => {
    const csv = donationsCsv([m('=1+1', '+cmd|x', '-5')])
    expect(csv).toContain("'=1+1")
    expect(csv).toContain("'+cmd|x")
    expect(csv).toContain("'-5")
  })
  it('줄바꿈은 공백으로', () => {
    expect(donationsCsv([m('a', '한\n줄')])).toContain('한 줄')
  })
})
