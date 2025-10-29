// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Allows overriding the base path in CI (GitHub Actions)
const base = process.env.BASE_PATH || '/'

export default defineConfig({
  plugins: [react()],
  base, // important for GitHub Pages
})
