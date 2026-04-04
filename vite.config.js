import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/onde-estou/',  // ← confirme que é exatamente esse o nome do repositório
})
