import { defineConfig, devices } from '@playwright/test'

/**
 * E2E Test Configuration with Docker Backend
 *
 * Use this config when you want to test against real PocketBase backend.
 * Make sure Docker is running: `docker compose up -d backend`
 *
 * Run with: npx playwright test --config=playwright.config.backend.ts
 */
export default defineConfig({
	testDir: './tests/e2e',
	/* Run tests in files in parallel */
	fullyParallel: true,
	/* Fail the build on CI if you accidentally left test.only in the source code. */
	forbidOnly: !!process.env.CI,
	/* Retry on CI only */
	retries: process.env.CI ? 2 : 0,
	/* Opt out of parallel tests on CI. */
	workers: process.env.CI ? 1 : undefined,
	/* Reporter to use. See https://playwright.dev/docs/test-reporters */
	reporter: 'html',
	/* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
	use: {
		/* Base URL to use in actions like `await page.goto('/')`. */
		baseURL: 'http://localhost:4173',

		/* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
		trace: 'on-first-retry',

		/* Screenshots on failure */
		screenshot: 'only-on-failure',

		/* Videos on failure */
		video: 'retain-on-failure'
	},

	/* Configure projects for major browsers */
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] }
		},
		{
			name: 'mobile',
			use: { ...devices['iPhone 13'] }
		},
		{
			name: 'tablet',
			use: { ...devices['iPad'] }
		}
	],

	webServer: [
		// Start PocketBase backend (requires Docker)
		{
			command: './tests/e2e/scripts/start-backend.sh',
			port: 7090,
			reuseExistingServer: !process.env.CI,
			timeout: 120 * 1000
		},
		// Start frontend dev server
		{
			command: 'npm run dev -- --port 4173',
			port: 4173,
			reuseExistingServer: !process.env.CI,
			timeout: 120 * 1000
		}
	]
})
