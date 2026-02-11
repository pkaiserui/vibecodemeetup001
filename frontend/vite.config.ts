import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  build: {
    // Target modern browsers for smaller output
    target: "es2020",
    // Enable CSS code splitting (loaded per-chunk)
    cssCodeSplit: true,
    // Generate source maps for production debugging (optional, disable for smallest build)
    sourcemap: false,
    // Rollup-specific optimizations
    rollupOptions: {
      output: {
        // Manual chunk splitting to separate vendor code from app code
        manualChunks: {
          // Core React runtime — cached separately from app code
          "vendor-react": ["react", "react-dom"],
          // Routing — loaded on every page but changes rarely
          "vendor-router": ["react-router-dom"],
          // Supabase SDK — only needed for auth flows
          "vendor-supabase": ["@supabase/supabase-js"],
          // Helmet — SEO/meta tags
          "vendor-helmet": ["react-helmet-async"],
        },
      },
    },
    // Increase chunk size warning limit (vendor chunks are expected to be larger)
    chunkSizeWarningLimit: 250,
  },
});
