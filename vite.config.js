import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

// 화면(편집기·출력 창)이 읽을 수 있는 곳을 제한한다: 자기 파일, 프로젝트 그림·영상(media:), 채팅 이모지 그림(https 이미지)만.
// 글이나 스크립트를 밖에서 끌어오거나 실행하지 못하게 한다. 개발 서버(vite)는 인라인 코드를 쓰므로 빌드에만 넣는다.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: media: https:",
  "media-src 'self' blob: media:",
  "font-src 'self' data:",
  "connect-src 'self' media:",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ')
const cspPlugin = {
  name: 'cueframe-csp',
  apply: 'build',
  transformIndexHtml: (html) => html.replace('<meta charset="UTF-8" />', `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`),
}

export default defineConfig({
  base: './',
  plugins: [react(), cspPlugin],
  server: { port: 5173, strictPort: true },
  // 편집기(index.html)와 방송 출력 창(output.html)을 따로 만들어 출력 창은 편집기 코드를 읽지 않게 한다
  build: { outDir: 'dist', emptyOutDir: true, rollupOptions: { input: { main: resolve('index.html'), output: resolve('output.html') } } },
  test: { environment: 'node', include: ['tests/**/*.test.js'] },
})
