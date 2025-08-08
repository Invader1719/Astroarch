import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import path from "path"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    proxy: {
      "/tasks": "http://localhost:8001",
      "/topics": "http://localhost:8001",
      "/sources": "http://localhost:8001",
      "/subtopics": "http://localhost:8001",
      "/generate": "http://localhost:8001",
      "/auth": "http://localhost:8001",
    },
  },
})
