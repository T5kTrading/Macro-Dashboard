import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/Macro-Dashboard/', // <-- DAS IST DER FIX
})
