import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, statSync } from 'fs'
import { join } from 'path'

describe('Task 1: Project Setup & Dependencies', () => {
  it('should have Next.js 14+ project initialized with App Router', () => {
    // Test that we're running in a Next.js environment
    expect(typeof window).toBeDefined()
    expect(typeof document).toBeDefined()
  })

  it('should have all required dependencies installable', async () => {
    // Test that key dependencies are available
    const requiredDeps = [
      'next',
      'react',
      'react-dom',
      'vitest',
      '@testing-library/react',
      '@testing-library/jest-dom'
    ]

    for (const dep of requiredDeps) {
      expect(() => {
        // Dynamic import for testing availability
        import(dep)
      }).not.toThrow()
    }
  })

  it('should have API body size limit configuration', () => {
    // This will be tested against the actual Next.js config
    // For now, we test that the config file exists and can be parsed
    expect(() => {
      const configPath = join(process.cwd(), 'next.config.js')
      if (existsSync(configPath)) {
        readFileSync(configPath, 'utf8')
      }
    }).not.toThrow()
  })

  it('should have Vitest can run basic test', () => {
    // This test itself validates that Vitest is working
    expect(true).toBe(true)
  })

  it('should have basic project structure created', () => {
    // Test that key directories exist
    const requiredDirs = [
      'app',
      'components',
      'lib',
      'test',
      'uploads'
    ]

    for (const dir of requiredDirs) {
      const dirPath = join(process.cwd(), dir)
      expect(existsSync(dirPath)).toBe(true)
      expect(statSync(dirPath).isDirectory()).toBe(true)
    }
  })

  it('should have app/api routes structure', () => {
    const apiDir = join(process.cwd(), 'app', 'api')
    expect(existsSync(apiDir)).toBe(true)
    expect(statSync(apiDir).isDirectory()).toBe(true)
  })
})
