# E2E Test Configuration

This directory contains all E2E test configuration files for the Vocal Royale application.

## Files

- **`compose.e2e.yml`** - Docker Compose configuration for E2E tests
  - Uses port 7090 instead of production 8090
  - No persistent volumes for clean test state
  - Custom build with test admin user

- **`Dockerfile.e2e`** - Custom Docker image for E2E testing
  - Based on Alpine Linux with PocketBase
  - Pre-creates admin user for tests
  - Includes init script for proper startup

- **`init-admin.sh`** - Initialization script for PocketBase
  - Creates admin user: `admin_db@vocal.royale`
  - Starts PocketBase server on port 8090 (mapped to 7090)

- **`playwright.config.ts`** - Standard Playwright configuration
  - Runs full E2E test suite
  - Supports chromium, mobile, and tablet projects
  - Includes teardown for clean container state

- **`playwright.config.backend.ts`** - Backend-focused Playwright configuration
  - Optimized for testing against real PocketBase backend
  - Use with: `npx playwright test --config=tests/e2e/config/playwright.config.backend.ts`

## Usage

From the `app/` directory:

```bash
# Run all E2E tests
npx playwright test

# Run with backend config
npx playwright test --config=tests/e2e/config/playwright.config.backend.ts

# Run specific test file
npx playwright test basic.spec.ts

# Run with UI
npx playwright test --ui
```

## Docker Context

The Docker build context is set to `../../../..` (project root) to access:

- `backend/pb_migrations/` - Database migrations
- `app/tests/e2e/config/init-admin.sh` - Admin initialization script

This ensures the E2E backend has the same database schema as production.
