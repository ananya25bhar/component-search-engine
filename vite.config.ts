import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Forward /search requests to backend
      "/search": {
        target: "http://127.0.0.1:3000",
        changeOrigin: true,
      },
      // Forward /svgs requests to backend
      "/svgs": {
        target: "http://127.0.0.1:3000",
        changeOrigin: true,
      },
    },
  },
});
