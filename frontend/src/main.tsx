import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { log as logger } from './utils/logger';
// import { pwaManager } from './utils/pwa.ts'

// 開発環境でのみデバッグ情報を表示
if (import.meta.env.DEV) {
  logger.debug('🔧 Environment Configuration:', {
    VITE_USE_PRODUCTION_DATA: import.meta.env.VITE_USE_PRODUCTION_DATA,
    VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
    MODE: import.meta.env.MODE,
    DEV: import.meta.env.DEV
  });
  
  logger.info('🚀 PWA initialization temporarily disabled for debugging');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
