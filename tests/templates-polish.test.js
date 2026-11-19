import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import { TEMPLATES, soonSpecs, withVignette, templateLayers } from '../src/core/templates.js'

describe('템플릿 다듬기', () => {
  it('모든 템플릿에 비네트가 글자·채팅창 아래, 그림 위에 한 번만 깔린다', () => {
    for (const t of TEMPLATES) {
      const names = t.wait.map((s) => s.file ?? s.kind)
      expect(names.filter((n) => n === 'vignette.png').length, t.id).toBe(1)
      const v = t.wait.findIndex((s) => s.file === 'vignette.png')
      const firstText = t.wait.findIndex((s) => s.kind === 'Text' || s.kind === 'Particles' || s.kind === 'Chat')
      expect(v, t.id).toBeLessThan(firstText)
      expect(fs.existsSync(`assets/templates/${t.id}/vignette.png`), t.id).toBe(true)
    }
  })
  it('withVignette 는 두 번 적용해도 늘어나지 않고, vignette 0 이면 쓰지 않는다', () => {
    const t = TEMPLATES[0]
    expect(withVignette(t).wait.length).toBe(t.wait.length)
    expect(withVignette({ ...t, wait: t.wait.filter((s) => s.file !== 'vignette.png'), vignette: 0 }).wait.some((s) => s.file === 'vignette.png')).toBe(false)
  })
  it('곧 시작 장면은 soonBox·soonScale 이 있으면 제목을 옮기고 키운다', () => {
    const t = TEMPLATES.find((x) => x.id === 'neon-city')
    const wait = t.wait.find((s) => s.role === 'title')
    const soon = soonSpecs(t).find((s) => s.role === 'title')
    expect(soon.box).toEqual(t.soonBox)
    expect(soon.style.fontSize).toBe(Math.round(wait.style.fontSize * t.soonScale))
    expect(soon.style.content).toBe(t.soonTitle)
    // 지정하지 않은 템플릿은 그대로
    const g = TEMPLATES.find((x) => x.id === 'gaming-room')
    expect(soonSpecs(g).find((s) => s.role === 'title').box).toEqual(g.wait.find((s) => s.role === 'title').box)
  })
  it('모든 템플릿이 레이어로 만들어진다(곧 시작 포함)', () => {
    for (const t of TEMPLATES) {
      expect(templateLayers(t, 'x', 'wait').length).toBeGreaterThan(5)
      expect(templateLayers(t, 'x', 'soon').length).toBeGreaterThan(3)
    }
  })
})
