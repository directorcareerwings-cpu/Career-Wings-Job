// vite.config.ts
import { defineConfig } from "file:///C:/Users/Ashikul/Documents/j%20Portal%20antigarvity/node_modules/.pnpm/vite@5.4.21_@types+node@20.19.43_terser@5.51.2/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/Ashikul/Documents/j%20Portal%20antigarvity/node_modules/.pnpm/@vitejs+plugin-react@4.7.0__ab157c3825f0e25de5addc502ac57608/node_modules/@vitejs/plugin-react/dist/index.js";
import { VitePWA } from "file:///C:/Users/Ashikul/Documents/j%20Portal%20antigarvity/node_modules/.pnpm/vite-plugin-pwa@0.20.5_supp_e0f44cdd48cbac28d66bdeae68fbf7e4/node_modules/vite-plugin-pwa/dist/index.js";
import path from "path";
var __vite_injected_original_dirname = "C:\\Users\\Ashikul\\Documents\\j Portal antigarvity\\client";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      devOptions: {
        enabled: false
      },
      manifest: {
        name: "Career Wings",
        short_name: "Career Wings",
        description: "Jobs in Guwahati & Northeast India",
        theme_color: "#0A2540",
        background_color: "#ffffff",
        display: "standalone",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" }
        ]
      }
    })
  ],
  root: path.resolve(__vite_injected_original_dirname, "."),
  resolve: { alias: { "@": path.resolve(__vite_injected_original_dirname, "./src") } },
  server: {
    host: true,
    port: 5173,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      "Pragma": "no-cache",
      "Expires": "0"
    },
    proxy: {
      "/api": "http://127.0.0.1:5000",
      "/uploads": "http://127.0.0.1:5000"
    }
  },
  preview: {
    host: true,
    port: 5173,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      "Pragma": "no-cache",
      "Expires": "0"
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxBc2hpa3VsXFxcXERvY3VtZW50c1xcXFxqIFBvcnRhbCBhbnRpZ2Fydml0eVxcXFxjbGllbnRcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXEFzaGlrdWxcXFxcRG9jdW1lbnRzXFxcXGogUG9ydGFsIGFudGlnYXJ2aXR5XFxcXGNsaWVudFxcXFx2aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvQXNoaWt1bC9Eb2N1bWVudHMvaiUyMFBvcnRhbCUyMGFudGlnYXJ2aXR5L2NsaWVudC92aXRlLmNvbmZpZy50c1wiO2ltcG9ydCB7IGRlZmluZUNvbmZpZyB9IGZyb20gJ3ZpdGUnXG5pbXBvcnQgcmVhY3QgZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3QnXG5pbXBvcnQgeyBWaXRlUFdBIH0gZnJvbSAndml0ZS1wbHVnaW4tcHdhJ1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCdcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgcGx1Z2luczogW1xuICAgIHJlYWN0KCksXG4gICAgVml0ZVBXQSh7XG4gICAgICByZWdpc3RlclR5cGU6ICdhdXRvVXBkYXRlJyxcbiAgICAgIGRldk9wdGlvbnM6IHtcbiAgICAgICAgZW5hYmxlZDogZmFsc2UsXG4gICAgICB9LFxuICAgICAgbWFuaWZlc3Q6IHtcbiAgICAgICAgbmFtZTogJ0NhcmVlciBXaW5ncycsXG4gICAgICAgIHNob3J0X25hbWU6ICdDYXJlZXIgV2luZ3MnLFxuICAgICAgICBkZXNjcmlwdGlvbjogJ0pvYnMgaW4gR3V3YWhhdGkgJiBOb3J0aGVhc3QgSW5kaWEnLFxuICAgICAgICB0aGVtZV9jb2xvcjogJyMwQTI1NDAnLFxuICAgICAgICBiYWNrZ3JvdW5kX2NvbG9yOiAnI2ZmZmZmZicsXG4gICAgICAgIGRpc3BsYXk6ICdzdGFuZGFsb25lJyxcbiAgICAgICAgaWNvbnM6IFtcbiAgICAgICAgICB7IHNyYzogJy9pY29ucy9pY29uLTE5Mi5wbmcnLCBzaXplczogJzE5MngxOTInLCB0eXBlOiAnaW1hZ2UvcG5nJyB9LFxuICAgICAgICAgIHsgc3JjOiAnL2ljb25zL2ljb24tNTEyLnBuZycsIHNpemVzOiAnNTEyeDUxMicsIHR5cGU6ICdpbWFnZS9wbmcnIH1cbiAgICAgICAgXVxuICAgICAgfVxuICAgIH0pXG4gIF0sXG4gIHJvb3Q6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuJyksXG4gIHJlc29sdmU6IHsgYWxpYXM6IHsgJ0AnOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi9zcmMnKSB9IH0sXG4gIHNlcnZlcjogeyBcbiAgICBob3N0OiB0cnVlLFxuICAgIHBvcnQ6IDUxNzMsXG4gICAgaGVhZGVyczoge1xuICAgICAgJ0NhY2hlLUNvbnRyb2wnOiAnbm8tc3RvcmUsIG5vLWNhY2hlLCBtdXN0LXJldmFsaWRhdGUsIHByb3h5LXJldmFsaWRhdGUsIG1heC1hZ2U9MCcsXG4gICAgICAnUHJhZ21hJzogJ25vLWNhY2hlJyxcbiAgICAgICdFeHBpcmVzJzogJzAnLFxuICAgIH0sXG4gICAgcHJveHk6IHtcbiAgICAgICcvYXBpJzogJ2h0dHA6Ly8xMjcuMC4wLjE6NTAwMCcsXG4gICAgICAnL3VwbG9hZHMnOiAnaHR0cDovLzEyNy4wLjAuMTo1MDAwJyxcbiAgICB9IFxuICB9LFxuICBwcmV2aWV3OiB7XG4gICAgaG9zdDogdHJ1ZSxcbiAgICBwb3J0OiA1MTczLFxuICAgIGhlYWRlcnM6IHtcbiAgICAgICdDYWNoZS1Db250cm9sJzogJ25vLXN0b3JlLCBuby1jYWNoZSwgbXVzdC1yZXZhbGlkYXRlLCBwcm94eS1yZXZhbGlkYXRlLCBtYXgtYWdlPTAnLFxuICAgICAgJ1ByYWdtYSc6ICduby1jYWNoZScsXG4gICAgICAnRXhwaXJlcyc6ICcwJyxcbiAgICB9XG4gIH1cbn0pXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQW9XLFNBQVMsb0JBQW9CO0FBQ2pZLE9BQU8sV0FBVztBQUNsQixTQUFTLGVBQWU7QUFDeEIsT0FBTyxVQUFVO0FBSGpCLElBQU0sbUNBQW1DO0FBS3pDLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVM7QUFBQSxJQUNQLE1BQU07QUFBQSxJQUNOLFFBQVE7QUFBQSxNQUNOLGNBQWM7QUFBQSxNQUNkLFlBQVk7QUFBQSxRQUNWLFNBQVM7QUFBQSxNQUNYO0FBQUEsTUFDQSxVQUFVO0FBQUEsUUFDUixNQUFNO0FBQUEsUUFDTixZQUFZO0FBQUEsUUFDWixhQUFhO0FBQUEsUUFDYixhQUFhO0FBQUEsUUFDYixrQkFBa0I7QUFBQSxRQUNsQixTQUFTO0FBQUEsUUFDVCxPQUFPO0FBQUEsVUFDTCxFQUFFLEtBQUssdUJBQXVCLE9BQU8sV0FBVyxNQUFNLFlBQVk7QUFBQSxVQUNsRSxFQUFFLEtBQUssdUJBQXVCLE9BQU8sV0FBVyxNQUFNLFlBQVk7QUFBQSxRQUNwRTtBQUFBLE1BQ0Y7QUFBQSxJQUNGLENBQUM7QUFBQSxFQUNIO0FBQUEsRUFDQSxNQUFNLEtBQUssUUFBUSxrQ0FBVyxHQUFHO0FBQUEsRUFDakMsU0FBUyxFQUFFLE9BQU8sRUFBRSxLQUFLLEtBQUssUUFBUSxrQ0FBVyxPQUFPLEVBQUUsRUFBRTtBQUFBLEVBQzVELFFBQVE7QUFBQSxJQUNOLE1BQU07QUFBQSxJQUNOLE1BQU07QUFBQSxJQUNOLFNBQVM7QUFBQSxNQUNQLGlCQUFpQjtBQUFBLE1BQ2pCLFVBQVU7QUFBQSxNQUNWLFdBQVc7QUFBQSxJQUNiO0FBQUEsSUFDQSxPQUFPO0FBQUEsTUFDTCxRQUFRO0FBQUEsTUFDUixZQUFZO0FBQUEsSUFDZDtBQUFBLEVBQ0Y7QUFBQSxFQUNBLFNBQVM7QUFBQSxJQUNQLE1BQU07QUFBQSxJQUNOLE1BQU07QUFBQSxJQUNOLFNBQVM7QUFBQSxNQUNQLGlCQUFpQjtBQUFBLE1BQ2pCLFVBQVU7QUFBQSxNQUNWLFdBQVc7QUFBQSxJQUNiO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
