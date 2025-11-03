import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
// import { pwaManager } from './utils/pwa.ts'

// 開発環境でのみデバッグ情報を表示
if (import.meta.env.DEV) {
  console.group('🔧 Environment Configuration');
  console.log('VITE_USE_PRODUCTION_DATA:', import.meta.env.VITE_USE_PRODUCTION_DATA);
  console.log('VITE_API_BASE_URL:', import.meta.env.VITE_API_BASE_URL);
  console.log('MODE:', import.meta.env.MODE);
  console.log('DEV:', import.meta.env.DEV);
  console.groupEnd();
  
  console.group('🚀 PWA Initialization');
  console.log('PWA initialization temporarily disabled for debugging');
  console.groupEnd();
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
