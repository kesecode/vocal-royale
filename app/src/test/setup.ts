import { vi } from 'vitest'

// Quiet logger output in tests
vi.mock('$lib/server/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn()
  }
}))

// Provide env access in tests like SvelteKit's $env/dynamic/private
vi.mock('$env/dynamic/private', () => ({
  env: process.env as Record<string, string | undefined>
}))

// Ensure a stable timezone for snapshots (if any)
process.env.TZ = 'UTC'
