import { resolve } from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // Blocos que dependem de outro bloco importam `@/components/<bloco>`, como
    // no consumidor; na vitrine esses dois apontam para registry/ (fonte única).
    alias: [
      {
        find: /^@\/components\/(states|feedback)(?=\/|$)/,
        replacement: resolve(import.meta.dirname, "./registry/$1"),
      },
      {
        find: /^@registry/,
        replacement: resolve(import.meta.dirname, "./registry"),
      },
      { find: /^@(?=\/)/, replacement: resolve(import.meta.dirname, "./src") },
    ],
  },
  test: {
    include: ["tests/**/*.test.{ts,tsx}"],
  },
})
