import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    restoreMocks: true,
    // Same results on every machine and in CI, whatever the local timezone.
    env: { TZ: 'Asia/Singapore' },
  },
})
