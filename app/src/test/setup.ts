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

// Ensure a stable timezone for snapshots (if any)
process.env.TZ = 'UTC'

