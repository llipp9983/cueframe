// wiki-src/pages/*.md → docs/wiki/*.html (의존성 없는 정적 위키 생성기)
// 실행: node scripts/build-wiki.mjs
//
// 마크다운 외에 쓸 수 있는 블록:
//   :::hero            첫 줄 제목, 둘째 줄 설명, 이어서 "버튼 글자 | 링크" 줄들
//   :::cards           "아이콘 | 제목 | 설명 | 링크" 줄들
//   :::flow            "제목 | 설명" 줄들 (단계 흐름)
//   :::summary 제목    안에 마크다운 (한눈에 보기 상자)
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const srcDir = path.join(root, 'wiki-src', 'pages')
const outDir = path.join(root, 'docs', 'wiki')
const version = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version

// 목차: [그룹, [[slug, 제목, 아이콘], ...]]
const NAV = [
  ['시작하기', [['index', '홈', '🏠'], ['install', '설치와 Windows 경고', '📥'], ['quickstart', '5분 만에 시작하기', '⚡'], ['screen', '화면 구성', '🧭']]],
  ['화면 꾸미기', [['elements', '요소 추가하기', '➕'], ['effects', '효과와 움직임', '✨'], ['templates', '템플릿', '🖼️'], ['chat-style', '채팅창 꾸미기', '💬']]],
  ['방송 연결', [['chat-connect', '채팅 연결 (로그인)', '🔑'], ['donation', '후원 알림', '🎁'], ['obs', 'OBS에 넣기', '📺']]],
  ['방송 중에 쓰기', [['scenes', '장면과 전환 효과', '🎬'], ['live', '방송 리모컨·단축키·잠금', '🎛️']]],
  ['참고', [['files', '저장·복구·데이터 위치', '💾'], ['shortcuts', '단축키 모음', '⌨️'], ['troubleshooting', '문제 해결', '🛠️'], ['faq', '자주 묻는 질문', '❓']]],
]
const FLAT = NAV.flatMap(([g, items]) => items.map(([s, t, i]) => [s, t, i, g]))

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const slugify = (s) => s.trim().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '').toLowerCase()

const PLATFORM = { 치지직: 'chzzk', SOOP: 'soop', YouTube: 'yt', 'YouTube (간편)': 'yt', 'YouTube (공식 API)': 'yt' }
const KEY_RE = /^(Ctrl|Alt|Shift|Delete|Esc|Enter|F\d+)([A-Za-z0-9+~ ]*)$/
/** "Ctrl+Alt+1 ~ 9" 같은 글자를 키 모양으로 */
function keyify(text) {
  return text.split(/(\s~\s)/).map((piece) => (/^\s~\s$/.test(piece) ? '<span class="to">~</span>' : piece.split('+').map((k) => `<kbd>${esc(k.trim())}</kbd>`).join('<span class="plus">+</span>'))).join('')
}

function inline(raw) {
  const codes = []
  let s = raw.replace(/`([^`]+)`/g, (_, c) => { codes.push(c); return `\u0000${codes.length - 1}\u0000` })
  s = esc(s)
  s = s.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, a, u) => `<img src="${u}" alt="${a}" loading="lazy">`)
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, t, u) => {
    const href = u.replace(/^([a-z0-9-]+)\.md(#.*)?$/, '$1.html$2')
    const ext = /^https?:/.test(href)
    return `<a href="${href}"${ext ? ' target="_blank" rel="noopener noreferrer"' : ''}>${t}</a>`
  })
  s = s.replace(/\*\*([^*]+)\*\*/g, (_, t) => {
    if (/^\[.+\]$/.test(t)) return `<span class="ui">${t.slice(1, -1)}</span>`
    if (KEY_RE.test(t)) return keyify(t)
    return `<strong>${t}</strong>`
  })
  s = s.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${esc(codes[Number(i)])}</code>`)
  return s
}

function cell(c) {
  const t = c.trim().replace(/^\*\*(.+)\*\*$/, '$1')
  if (PLATFORM[t]) return `<span class="badge ${PLATFORM[t]}">${esc(t)}</span>`
  if (KEY_RE.test(t) && !/[가-힣]/.test(t)) return keyify(t)
  return inline(c)
}

const CALLOUT = { warn: ['⚠️', '주의'], tip: ['💡', '팁'], note: ['ℹ️', '참고'] }

/** 마크다운 일부(제목·목록·표·코드·인용·그림·링크·블록 지시어)만 지원한다. */
function render(md) {
  const lines = md.replace(/\r/g, '').split('\n')
  const out = []
  const toc = []
  let i = 0
  const isBlank = (l) => !l.trim()
  const listRe = /^(\s*)([-*]|\d+\.)\s+(.*)$/
  while (i < lines.length) {
    const l = lines[i]
    if (isBlank(l)) { i++; continue }
    let m
    if ((m = l.match(/^:::(\w+)\s*(.*)$/))) {
      const kind = m[1]
      const title = m[2]
      const buf = []
      i++
      while (i < lines.length && !/^:::\s*$/.test(lines[i])) buf.push(lines[i++])
      i++
      const rows = buf.filter((x) => x.trim()).map((x) => x.split('|').map((y) => y.trim()))
      if (kind === 'hero') {
        const [head, sub, ...btns] = buf.filter((x) => x.trim())
        out.push(`<section class="hero"><div class="hero-in"><div class="eyebrow">사용 설명서 · v${version}</div><h1>${inline(head)}</h1><p class="hero-sub">${inline(sub)}</p><div class="hero-btns">${btns.map((b, n) => { const [t, u] = b.split('|').map((y) => y.trim()); return `<a class="btn${n ? '' : ' primary'}" href="${u.replace(/\.md$/, '.html')}">${esc(t)}</a>` }).join('')}</div></div></section>`)
      } else if (kind === 'cards') {
        out.push(`<div class="cards">${rows.map(([ic, t, d, u]) => `<a class="card" href="${u.replace(/\.md(#.*)?$/, '.html$1')}"><span class="card-ic" aria-hidden="true">${ic}</span><span class="card-t">${inline(t)}</span><span class="card-d">${inline(d)}</span><span class="card-go" aria-hidden="true">→</span></a>`).join('')}</div>`)
      } else if (kind === 'flow') {
        out.push(`<ol class="flow">${rows.map(([t, d]) => `<li><b>${inline(t)}</b><span>${inline(d)}</span></li>`).join('')}</ol>`)
      } else if (kind === 'summary') {
        out.push(`<aside class="summary"><div class="summary-t">${esc(title || '한눈에 보기')}</div>${render(buf.join('\n')).html}</aside>`)
      }
      continue
    }
    if ((m = l.match(/^```(\w*)/))) {
      const buf = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) buf.push(lines[i++])
      i++
      out.push(`<div class="code"><button class="copy" type="button" aria-label="복사">복사</button><pre><code>${esc(buf.join('\n'))}</code></pre></div>`)
    } else if ((m = l.match(/^(#{1,3})\s+(.*)$/))) {
      const level = m[1].length
      const id = slugify(m[2])
      if (level >= 2) toc.push({ level, id, text: m[2] })
      out.push(`<h${level} id="${id}">${inline(m[2])}${level >= 2 ? `<a class="anchor" href="#${id}" aria-label="이 항목 링크">#</a>` : ''}</h${level}>`)
      i++
    } else if (/^---+\s*$/.test(l)) {
      out.push('<hr>')
      i++
    } else if (l.startsWith('>')) {
      const buf = []
      while (i < lines.length && lines[i].startsWith('>')) buf.push(lines[i++].replace(/^>\s?/, ''))
      const txt = buf.join('\n')
      const kind = /^\*\*(주의|꼭|중요)/.test(txt) ? 'warn' : /^\*\*(팁)/.test(txt) ? 'tip' : 'note'
      const body = txt.replace(/^\*\*(주의|꼭|중요|팁|참고)\*\*\s*/, '')
      const label = /^\*\*(주의|꼭|중요|팁|참고)/.test(txt) ? txt.match(/^\*\*([^*]+)\*\*/)[1] : CALLOUT[kind][1]
      out.push(`<div class="callout ${kind}"><div class="callout-h"><span aria-hidden="true">${CALLOUT[kind][0]}</span>${label}</div>${render(body).html}</div>`)
    } else if (l.includes('|') && lines[i + 1] && /^\s*\|?\s*:?-{2,}/.test(lines[i + 1])) {
      const cells = (r) => r.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim())
      const head = cells(l)
      i += 2
      const rows = []
      while (i < lines.length && lines[i].includes('|') && !isBlank(lines[i])) rows.push(cells(lines[i++]))
      out.push(`<div class="table-wrap"><table><thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c, n) => `<td${n === 0 ? ' class="first"' : ''}>${cell(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`)
    } else if (listRe.test(l)) {
      const items = []
      while (i < lines.length && (listRe.test(lines[i]) || (/^\s{2,}\S/.test(lines[i]) && items.length))) {
        const mm = lines[i].match(listRe)
        if (mm) items.push({ indent: mm[1].length, ordered: /\d/.test(mm[2]), text: mm[3] })
        else items[items.length - 1].text += ' ' + lines[i].trim()
        i++
      }
      const task = (t) => (/^\[( |x)\]\s/.test(t) ? t.replace(/^\[( |x)\]\s/, (_, c) => `<span class="chk${c === 'x' ? ' on' : ''}" aria-hidden="true"></span>`) : t)
      const build = (idx, indent) => {
        const ordered = items[idx].ordered
        const isTask = !ordered && /^\[( |x)\]\s/.test(items[idx].text)
        let html = ordered ? '<ol class="steps">' : `<ul${isTask ? ' class="tasks"' : ''}>`
        while (idx < items.length && items[idx].indent >= indent) {
          if (items[idx].indent > indent) {
            const [sub, next] = build(idx, items[idx].indent)
            html = html.replace(/<\/li>$/, sub + '</li>')
            idx = next
            continue
          }
          html += `<li>${inline(task(items[idx].text))}</li>`
          idx++
        }
        html += ordered ? '</ol>' : '</ul>'
        return [html, idx]
      }
      out.push(build(0, items[0].indent)[0])
    } else {
      const buf = []
      while (i < lines.length && !isBlank(lines[i]) && !/^(#{1,3}\s|```|>|---|:::)/.test(lines[i]) && !listRe.test(lines[i])) buf.push(lines[i++])
      const text = buf.join(' ')
      if (/^!\[[^\]]*\]\([^)]+\)$/.test(text.trim())) {
        const mm = text.trim().match(/^!\[([^\]]*)\]\(([^)]+)\)$/)
        out.push(`<figure><img src="${mm[2]}" alt="${esc(mm[1])}" loading="lazy">${mm[1] ? `<figcaption>${esc(mm[1])}</figcaption>` : ''}</figure>`)
      } else out.push(`<p${out.length === 0 ? ' class="lead"' : ''}>${inline(text)}</p>`)
    }
  }
  return { html: out.join('\n'), toc }
}

const plain = (md) => md.replace(/^\s*\|?[\s:|-]+\|?\s*$/gm, ' ').replace(/```[\s\S]*?```/g, ' ').replace(/^:::.*$/gm, ' ').replace(/!\[[^\]]*\]\([^)]*\)/g, ' ').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/[`*#>|]/g, ' ').replace(/\s+/g, ' ').trim()

const pages = FLAT.map(([slug, title, icon, group]) => {
  const file = path.join(srcDir, `${slug}.md`)
  if (!fs.existsSync(file)) throw new Error(`없는 문서: ${slug}.md`)
  const md = fs.readFileSync(file, 'utf8').split('\r').join('')
  const text = plain(md)
  return { slug, title, icon, group, md, minutes: Math.max(1, Math.round(text.length / 520)), ...render(md.replace(/^# .*\n/, '')) }
})

const searchIndex = pages.map((p) => ({ slug: p.slug, title: p.title, icon: p.icon, text: plain(p.md).slice(0, 6000) }))

const CSS = fs.readFileSync(path.join(root, 'wiki-src', 'style.css'), 'utf8')
const JS = fs.readFileSync(path.join(root, 'wiki-src', 'site.js'), 'utf8')

function layout(p, idx) {
  const prev = pages[idx - 1]
  const next = pages[idx + 1]
  const nav = NAV.map(([g, items]) => `<div class="nav-group"><div class="nav-title">${g}</div>${items.map(([s, t, ic]) => `<a href="${s}.html"${s === p.slug ? ' class="active" aria-current="page"' : ''}><span class="nav-ic" aria-hidden="true">${ic}</span>${t}</a>`).join('')}</div>`).join('')
  const toc = p.toc.filter((t) => t.level === 2)
  const isHome = p.slug === 'index'
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(p.title)} · CUEFRAME 사용 설명서</title>
<meta name="description" content="CUEFRAME 방송 대기화면 편집기 사용 설명서: ${esc(p.title)}">
<script>try{var t=localStorage.getItem('cf-theme');if(t)document.documentElement.dataset.theme=t}catch(e){}</script>
<style>${CSS}</style>
</head>
<body>
<div class="progress" id="progress" aria-hidden="true"></div>
<header class="top">
  <button class="icon-btn menu-btn" aria-label="메뉴 열기" aria-expanded="false" id="menuBtn">☰</button>
  <a class="brand" href="index.html"><span class="logo" aria-hidden="true">▣</span>CUEFRAME <span>사용 설명서</span></a>
  <div class="search"><input id="q" type="search" placeholder="검색  (예: 후원, 전환, OBS)" aria-label="문서 검색" autocomplete="off"><kbd class="slash" aria-hidden="true">/</kbd><div id="results" class="results" hidden></div></div>
  <button class="icon-btn" id="themeBtn" aria-label="밝게/어둡게 바꾸기" title="밝게/어둡게">◐</button>
</header>
<div class="wrap">
  <nav class="side" id="side" aria-label="문서 목차">${nav}</nav>
  <main>
    <article>
      ${isHome ? '' : `<div class="crumb"><a href="index.html">홈</a><span>›</span>${p.group}<span class="min">읽는 데 약 ${p.minutes}분</span></div><h1><span class="h1-ic" aria-hidden="true">${p.icon}</span>${inline(p.title)}</h1>`}
      ${p.html}
    </article>
    <div class="pager">${prev ? `<a href="${prev.slug}.html"><small>← 이전</small>${prev.icon} ${prev.title}</a>` : '<span></span>'}${next ? `<a class="next" href="${next.slug}.html"><small>다음 →</small>${next.icon} ${next.title}</a>` : '<span></span>'}</div>
    <footer>CUEFRAME ${version} 기준 설명서입니다. 화면 모양은 버전에 따라 조금 다를 수 있습니다.</footer>
  </main>
  <aside class="toc" aria-label="이 문서의 목차">${toc.length > 1 ? `<div class="nav-title">이 문서에서</div>${toc.map((t) => `<a href="#${t.id}">${esc(t.text)}</a>`).join('')}` : ''}</aside>
</div>
<div class="lightbox" id="lightbox" hidden><img alt=""><button class="icon-btn" aria-label="닫기">✕</button></div>
<script>window.__INDEX=${JSON.stringify(searchIndex).replace(/</g, '\\u003c')}</script>
<script>${JS}</script>
</body>
</html>
`
}

fs.mkdirSync(outDir, { recursive: true })
for (const f of fs.readdirSync(outDir)) if (f.endsWith('.html')) fs.rmSync(path.join(outDir, f))
pages.forEach((p, idx) => fs.writeFileSync(path.join(outDir, `${p.slug}.html`), layout(p, idx)))
console.log(`위키 ${pages.length}쪽 생성 → ${path.relative(root, outDir)}`)
