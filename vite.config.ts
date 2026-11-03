import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// Set SINGLE=1 to produce one self-contained index.html (handy for sharing).
const single = process.env.SINGLE === '1'

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss(), ...(single ? [viteSingleFile()] : [])],
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
})
