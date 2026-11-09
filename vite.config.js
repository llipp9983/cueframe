import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

export default defineConfig({
  base: './',
  plugins: [react()],
  server: { port: 5173, strictPort: true },
  // 편집기(index.html)와 방송 출력 창(output.html)을 따로 만들어 출력 창은 편집기 코드를 읽지 않게 한다
  build: { outDir: 'dist', emptyOutDir: true, rollupOptions: { input: { main: resolve('index.html'), output: resolve('output.html') } } },
  test: { environment: 'node', include: ['tests/**/*.test.js'] },
})
