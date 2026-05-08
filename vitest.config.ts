import { defineConfig } from 'vitest/config'
import { resolve } from 'path'
import { readFileSync } from 'fs'

// @next/env excludes .env.local when NODE_ENV=test. Load it directly so
// integration tests have access to ANTHROPIC_API_KEY and other server secrets.
function loadDotEnvLocal(): Record<string, string> {
  try {
    return Object.fromEntries(
      readFileSync('.env.local', 'utf-8')
        .split('\n')
        .filter((line) => line.trim() && !line.trim().startsWith('#'))
        .map((line) => {
          const idx = line.indexOf('=')
          return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()]
        })
        .filter(([key]) => key)
    )
  } catch {
    return {}
  }
}

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    include: ['test/**/*.test.{ts,tsx}'],
    env: loadDotEnvLocal(),
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './'),
    },
  },
})
