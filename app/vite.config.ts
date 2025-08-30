import tailwindcss from '@tailwindcss/vite'
import { sveltekit } from '@sveltejs/kit/vite'
import { defineConfig } from 'vite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = fileURLToPath(new URL('./', import.meta.url))

export default defineConfig(({ mode }) => {
  const isVitest = !!process.env.VITEST
  return {
    plugins: isVitest ? [] : [tailwindcss(), sveltekit()],
    resolve: isVitest
      ? {
          alias: {
            $lib: path.resolve(rootDir, 'src/lib'),
            $src: path.resolve(rootDir, 'src')
          }
        }
      : undefined,
    test: {
      environment: 'node',
      globals: true,
      setupFiles: ['src/test/setup.ts']
    }
  }
})
