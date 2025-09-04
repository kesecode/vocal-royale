import { execSync } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Global teardown script to stop Docker backend after all tests
 */
async function globalTeardown() {
	try {
		console.log('Stopping Docker backend...')

		// Get script path and make it executable
		const scriptPath = path.join(__dirname, 'stop-backend.sh')

		// Execute the stop script
		execSync(scriptPath, { stdio: 'inherit' })

		console.log('✅ Backend teardown completed')
	} catch (error) {
		console.error('❌ Error during backend teardown:', error)
	}
}

export default globalTeardown
