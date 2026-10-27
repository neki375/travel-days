import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Same-origin API in development, as behind the production reverse proxy.
    proxy: {
      "/api": "http://127.0.0.1:3000",
    },
  },
});
