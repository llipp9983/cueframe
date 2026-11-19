(() => {
  const $ = (s, r = document) => r.querySelector(s)
  const btn = $('#menuBtn')
  const side = $('#side')
  btn.addEventListener('click', () => {
    const open = side.classList.toggle('open')
    btn.setAttribute('aria-expanded', String(open))
  })

  // 밝게/어둡게
  const root = document.documentElement
  $('#themeBtn').addEventListener('click', () => {
    const dark = root.dataset.theme ? root.dataset.theme === 'dark' : !matchMedia('(prefers-color-scheme: light)').matches
    const next = dark ? 'light' : 'dark'
    root.dataset.theme = next
    try { localStorage.setItem('cf-theme', next) } catch {}
  })

  // 읽은 정도 막대
  const bar = $('#progress')
  const onScroll = () => {
    const h = document.documentElement
    const max = h.scrollHeight - h.clientHeight
    bar.style.width = (max > 0 ? Math.min(100, (h.scrollTop / max) * 100) : 0) + '%'
  }
  addEventListener('scroll', onScroll, { passive: true })
  onScroll()

  // 오른쪽 목차: 지금 읽는 위치 표시
  const links = [...document.querySelectorAll('.toc a')]
  if (links.length && 'IntersectionObserver' in window) {
    const map = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]))
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => { if (e.isIntersecting) { links.forEach((a) => a.classList.remove('on')); map.get(e.target.id)?.classList.add('on') } })
    }, { rootMargin: '-80px 0px -70% 0px' })
    document.querySelectorAll('article h2').forEach((h) => io.observe(h))
  }

  // 코드 복사
  document.querySelectorAll('.copy').forEach((b) => b.addEventListener('click', async () => {
    const text = b.nextElementSibling.innerText
    try { await navigator.clipboard.writeText(text); b.textContent = '복사됨 ✓' } catch { b.textContent = '직접 선택해 복사하세요' }
    setTimeout(() => (b.textContent = '복사'), 1600)
  }))

  // 그림 크게 보기
  const lb = $('#lightbox')
  const lbImg = $('img', lb)
  document.querySelectorAll('article img').forEach((im) => im.addEventListener('click', () => { lbImg.src = im.src; lbImg.alt = im.alt; lb.hidden = false }))
  lb.addEventListener('click', () => (lb.hidden = true))
  addEventListener('keydown', (e) => { if (e.key === 'Escape') lb.hidden = true })

  // 검색
  const q = $('#q')
  const box = $('#results')
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
  const hit = (text, words) => {
    const low = text.toLowerCase()
    let score = 0
    for (const w of words) { const n = low.split(w).length - 1; if (!n) return 0; score += Math.min(n, 5) }
    return score
  }
  const run = () => {
    const words = q.value.trim().toLowerCase().split(/\s+/).filter(Boolean)
    if (!words.length) { box.hidden = true; return }
    const res = window.__INDEX
      .map((p) => ({ p, s: hit(p.title, words) * 8 + hit(p.text, words) }))
      .filter((r) => r.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 8)
    box.innerHTML = res.length
      ? res.map(({ p }) => {
          const low = p.text.toLowerCase()
          const at = Math.max(0, low.indexOf(words[0]) - 30)
          let snip = esc(p.text.slice(at, at + 110))
          for (const w of words) snip = snip.replace(new RegExp(esc(w).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), (m) => `<mark>${m}</mark>`)
          return `<a href="${p.slug}.html"><b>${p.icon} ${esc(p.title)}</b><small>${at ? '…' : ''}${snip}…</small></a>`
        }).join('')
      : '<a href="#" onclick="return false">찾는 내용이 없습니다. 다른 낱말로 검색해 보세요.</a>'
    box.hidden = false
  }
  q.addEventListener('input', run)
  q.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { box.hidden = true; q.blur() }
    if (e.key === 'Enter') { const a = box.querySelector('a[href$=".html"]'); if (a) location.href = a.getAttribute('href') }
  })
  document.addEventListener('click', (e) => { if (!e.target.closest('.search')) box.hidden = true })
  document.addEventListener('keydown', (e) => { if (e.key === '/' && document.activeElement !== q && !/input|textarea/i.test(document.activeElement.tagName)) { e.preventDefault(); q.focus() } })
})()
