import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{js,jsx,ts,tsx}'],
      exclude: ['src/**/*.test.{js,jsx,ts,tsx}', 'src/main.tsx', 'src/vite-env.d.ts'],
    },
  },
  plugins: [
    react(),
    // 一時的にPWA（サービスワーカー）を完全に無効化
    // VitePWA({
    //   registerType: 'prompt',
    //   workbox: {
    //     globPatterns: ['**/*.{js,css,html,ico,png,svg,json,woff2}'],
    //     runtimeCaching: [
    //       {
    //         urlPattern: /^https:\/\/.*\.amazonaws\.com\/api\/.*/i,
    //         handler: 'NetworkFirst',
    //         options: {
    //           cacheName: 'api-cache',
    //           expiration: {
    //             maxEntries: 100,
    //             maxAgeSeconds: 60 * 5 // 5分に短縮（データ更新頻度を考慮）
    //           },
    //           networkTimeoutSeconds: 10
    //         }
    //       },
    //       {
    //         urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
    //         handler: 'CacheFirst',
    //         options: {
    //           cacheName: 'images-cache',
    //           expiration: {
    //             maxEntries: 50,
    //             maxAgeSeconds: 60 * 60 * 24 * 30 // 30日
    //           }
    //         }
    //       }
    //     ]
    //   },
    //   includeAssets: ['icons/*.png', 'icons/*.svg', 'manifest.json'],
    //   manifest: {
    //     name: 'プロ野球志望届データ管理システム',
    //     short_name: '野球志望届',
    //     description: 'プロ野球志望届の収集・管理・分析を行うWebアプリケーション',
    //     theme_color: '#1976d2',
    //     background_color: '#ffffff',
    //     display: 'standalone',
    //     orientation: 'portrait-primary',
    //     scope: '/',
    //     start_url: '/',
    //     icons: [
    //       {
    //         src: '/icons/icon-72x72.png',
    //         sizes: '72x72',
    //         type: 'image/png'
    //       },
    //       {
    //         src: '/icons/icon-96x96.png',
    //         sizes: '96x96',
    //         type: 'image/png'
    //       },
    //       {
    //         src: '/icons/icon-128x128.png',
    //         sizes: '128x128',
    //         type: 'image/png'
    //       },
    //       {
    //         src: '/icons/icon-144x144.png',
    //         sizes: '144x144',
    //         type: 'image/png'
    //       },
    //       {
    //         src: '/icons/icon-152x152.png',
    //         sizes: '152x152',
    //         type: 'image/png'
    //       },
    //       {
    //         src: '/icons/icon-192x192.png',
    //         sizes: '192x192',
    //         type: 'image/png',
    //         purpose: 'any maskable'
    //       },
    //       {
    //         src: '/icons/icon-384x384.png',
    //         sizes: '384x384',
    //         type: 'image/png'
    //       },
    //       {
    //         src: '/icons/icon-512x512.png',
    //         sizes: '512x512',
    //         type: 'image/png',
    //         purpose: 'any maskable'
    //       }
    //     ],
    //     shortcuts: [
    //       {
    //         name: 'ダッシュボード',
    //         short_name: 'ダッシュボード',
    //         description: '統計ダッシュボードを表示',
    //         url: '/dashboard',
    //         icons: [
    //           {
    //             src: '/icons/icon-96x96.png',
    //             sizes: '96x96'
    //           }
    //         ]
    //       },
    //       {
    //         name: '選手管理',
    //         short_name: '選手管理',
    //         description: '選手データの管理',
    //         url: '/players',
    //         icons: [
    //           {
    //             src: '/icons/icon-96x96.png',
    //             sizes: '96x96'
    //           }
    //         ]
    //       }
    //     ]
    //   },
    //   devOptions: {
    //     enabled: false,
    //     type: 'module'
    //   }
    // })
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    open: false,
    hmr: {
      port: 5174,
      host: 'localhost'
    },
    watch: {
      usePolling: true
    },
    proxy: {
      '/api': {
        target: 'https://2esje5au24.execute-api.ap-northeast-1.amazonaws.com/dev',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        secure: true,
        configure: (proxy) => {
          proxy.on('error', (err) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (_proxyReq, req) => {
            console.log('Sending Request to the Target:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req) => {
            console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
          });
        },
      }
    }
  },
  build: {
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: mode === 'prod', // prod環境のみでconsole.logを削除（modeベースで判定）
        drop_debugger: true
      }
    },
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (!id.includes('node_modules/')) return undefined;
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) return 'vendor';
          if (id.includes('node_modules/@mui/')) return 'mui';
          if (id.includes('node_modules/chart.js/') || id.includes('node_modules/react-chartjs-2/')) return 'charts';
          return undefined;
        }
      }
    }
  }
}))
