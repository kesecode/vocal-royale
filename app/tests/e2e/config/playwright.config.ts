import { defineConfig, devices } from '@playwright/test'

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
	testDir: './tests/e2e',
	/* Serial test execution for better stability */
	fullyParallel: false,
	/* Fail the build on CI if you accidentally left test.only in the source code. */
	forbidOnly: !!process.env.CI,
	/* Minimal retries - fail fast for quicker feedback */
	retries: process.env.CI ? 1 : 0,
	/* Serial execution for test stability */
	workers: 1,
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
		video: 'retain-on-failure',

		/* Balanced timeouts for stability */
		actionTimeout: 4000, // 4s - give UI state changes time
		navigationTimeout: 5000 // 5s - allow for navigation
	},

	/* Global timeout - allow for complex flows */
	timeout: 12000,

	/* Configure projects - focus on stability over coverage */
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] }
		}
	],

	webServer: [
		// Start PocketBase backend first
		{
			command: './tests/e2e/scripts/start-backend.sh',
			port: 7090,
			reuseExistingServer: !process.env.CI,
			timeout: 120 * 1000
		},
		// Start frontend dev server
		{
			command: 'PB_URL=http://127.0.0.1:7090 SONG_CHOICE_VALIDATE=false npm run dev -- --port 4173',
			port: 4173,
			reuseExistingServer: !process.env.CI,
			timeout: 120 * 1000,
			env: {
				PB_URL: 'http://127.0.0.1:7090',
				SONG_CHOICE_VALIDATE: 'false'
			}
		}
	],

	globalTeardown: './tests/e2e/scripts/teardown.js'
})
