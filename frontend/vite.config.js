import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

// Expose the app version (from the root package.json) to the frontend as the
// compile-time constant __APP_VERSION__, so the UI can show which build is
// running without hard-coding the number in two places.
const rootDir = dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(
  readFileSync(resolve(rootDir, '..', 'package.json'), 'utf-8')
)

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
})
