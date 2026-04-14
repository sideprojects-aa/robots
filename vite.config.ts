import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// GitHub Pages serves this repo at https://<user>.github.io/robots/,
// so production builds target that subpath. Dev + preview stay at "/".
const isGhPagesBuild = process.env.DEPLOY_TARGET === 'gh-pages'

export default defineConfig({
  base: isGhPagesBuild ? '/robots/' : '/',
  plugins: [vue()],
  server: {
    host: '127.0.0.1',
    port: 5174,
    strictPort: false,
  },
  preview: {
    host: '127.0.0.1',
    port: 5174,
    strictPort: false,
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
  },
})
