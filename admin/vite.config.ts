import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";
import fs from "fs";

// Plugin to generate /version.json at build time
// IMPORTANT: Keep this version in sync with src/config/version.ts APP_VERSION
const CURRENT_APP_VERSION = "2.5.4";

function versionJsonPlugin(): import('vite').Plugin {
  return {
    name: 'version-json',
    generateBundle() {
      const versionData = {
        version: CURRENT_APP_VERSION,
        buildTime: Date.now(),
      };
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: JSON.stringify(versionData)
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
  base: '/admin/',
  server: {
    host: "::",
    port: 8080,
  },
  build: {
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          // Core runtime — must stay together to avoid circular deps
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-supabase': ['@supabase/supabase-js'],
          // Utility libraries
          'vendor-utils': ['date-fns', 'clsx', 'tailwind-merge', 'class-variance-authority'],
          // Heavy feature-specific chunks (only loaded on relevant pages)
          'vendor-charts': ['recharts'],
          'vendor-map': ['mapbox-gl'],
        },
      },
    },
  },
  define: {
    'import.meta.env.VITE_BUILD_TIME': JSON.stringify(String(Date.now())),
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY),
  },
  plugins: [
    react(),
    versionJsonPlugin(),
    mode === "development" && componentTagger(),
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      registerType: "autoUpdate",
      injectRegister: "auto",
      manifestFilename: "manifest.webmanifest",

      includeAssets: ["favicon.svg", "apple-touch-icon.png", "offline.html"],
      manifest: ({
        gcm_sender_id: "103953800507",
        name: "Zrobee - Kvalitní řemeslníci",
        short_name: "Zrobee",
        description: "Najděte kvalitní řemeslníky a profesionály pro všechny vaše potřeby.",
        theme_color: "#a6d16f",
        background_color: "#a6d16f",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        icons: [
          { src: "/icons/icon-512x512.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
          { src: "/icons/icon-desktop.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
          { src: "/icons/badge-monochrome.svg", sizes: "any", type: "image/svg+xml", purpose: "monochrome" },
          { src: "/icons/icon-maskable.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
          { src: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/icons/icon-1024x1024.png", sizes: "1024x1024", type: "image/png", purpose: "any" }
        ]
      }) as any,


      injectManifest: {
        rollupFormat: 'iife',
        maximumFileSizeToCacheInBytes: 6000000,
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,woff,woff2}"],
      }
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  };
});
