/**
 * PWA（Progressive Web App）ユーティリティ
 * Service Worker登録、プッシュ通知、インストール管理
 */

// PWA install event interface
interface BeforeInstallPromptEvent extends Event {
  platforms: string[];
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
  prompt(): Promise<void>;
}

// Service Worker登録状態
export interface PWAServiceWorkerStatus {
  active: boolean;
  registration?: ServiceWorker;
  error?: string;
}

// プッシュ通知設定
export interface PushNotificationConfig {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: Record<string, unknown>;
  // actions?: Array<{action: string; title: string}>;
}

// PWA インストール状態
export interface PWAInstallStatus {
  canInstall: boolean;
  isInstalled: boolean;
  platform: string;
}

// バックグラウンド同期状態
export interface BackgroundSyncStatus {
  supported: boolean;
  lastSync?: string;
  pendingSync: string[];
}

class PWAManager {
  private registration: ServiceWorkerRegistration | null = null;
  public deferredPrompt: BeforeInstallPromptEvent | null = null;
  private isOnline: boolean = navigator.onLine;
  
  constructor() {
    this.setupEventListeners();
  }

  /**
   * Service Workerを登録
   */
  async registerServiceWorker(): Promise<PWAServiceWorkerStatus> {
    if (!('serviceWorker' in navigator)) {
      const error = 'Service Worker is not supported';
      console.warn('[PWA Manager]', error);
      return { active: false, error };
    }

    try {
      console.log('[PWA Manager] Registering Service Worker...');
      
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      console.log('[PWA Manager] Service Worker registered:', registration);

      // Service Worker の状態変更を監視
      registration.addEventListener('updatefound', () => {
        console.log('[PWA Manager] New Service Worker found');
        const newWorker = registration.installing;
        
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[PWA Manager] New Service Worker available');
              this.notifyUpdateAvailable();
            }
          });
        }
      });

      this.registration = registration;
      return { active: true, registration: registration as unknown as ServiceWorker };
      
    } catch (error) {
      const errorMessage = `Service Worker registration failed: ${error}`;
      console.error('[PWA Manager]', errorMessage);
      return { active: false, error: errorMessage };
    }
  }

  /**
   * プッシュ通知の権限を要求
   */
  async requestNotificationPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('[PWA Manager] Notifications not supported');
      return 'denied';
    }

    if (Notification.permission === 'default') {
      console.log('[PWA Manager] Requesting notification permission...');
      const permission = await Notification.requestPermission();
      console.log('[PWA Manager] Notification permission:', permission);
      return permission;
    }

    return Notification.permission;
  }

  /**
   * プッシュ通知を送信
   */
  async sendNotification(config: PushNotificationConfig): Promise<void> {
    const permission = await this.requestNotificationPermission();
    
    if (permission !== 'granted') {
      console.warn('[PWA Manager] Notification permission denied');
      return;
    }

    try {
      const notification = new Notification(config.title, {
        body: config.body,
        icon: config.icon || '/icons/icon-192x192.png',
        badge: config.badge || '/icons/icon-72x72.png',
        data: config.data,
        tag: 'pro-baseball-notification',
        requireInteraction: true
        // actions: config.actions
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
        
        if (config.data?.url && typeof config.data.url === 'string') {
          window.location.href = config.data.url;
        }
      };

      console.log('[PWA Manager] Notification sent:', config.title);
      
    } catch (error) {
      console.error('[PWA Manager] Failed to send notification:', error);
    }
  }

  /**
   * バックグラウンド同期を登録
   */
  async requestBackgroundSync(tag: string): Promise<boolean> {
    if (!this.registration || !('sync' in window.ServiceWorkerRegistration.prototype)) {
      console.warn('[PWA Manager] Background Sync not supported');
      return false;
    }

    try {
      await (this.registration as unknown as { sync: { register: (tag: string) => Promise<void> } }).sync.register(tag);
      console.log('[PWA Manager] Background sync registered:', tag);
      return true;
    } catch (error) {
      console.error('[PWA Manager] Failed to register background sync:', error);
      return false;
    }
  }

  /**
   * PWAインストール状態を取得
   */
  getPWAInstallStatus(): PWAInstallStatus {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    
    let platform = 'desktop';
    if (isIOS) platform = 'ios';
    else if (isAndroid) platform = 'android';

    return {
      canInstall: this.deferredPrompt !== null,
      isInstalled: isStandalone || Boolean((window as unknown as { navigator?: { standalone?: boolean } }).navigator?.standalone),
      platform
    };
  }

  /**
   * PWAインストールプロンプトを表示
   */
  async promptInstall(): Promise<boolean> {
    if (!this.deferredPrompt) {
      console.warn('[PWA Manager] Install prompt not available');
      return false;
    }

    try {
      console.log('[PWA Manager] Showing install prompt...');
      this.deferredPrompt.prompt();
      
      const choiceResult = await this.deferredPrompt.userChoice;
      console.log('[PWA Manager] Install choice:', choiceResult.outcome);
      
      this.deferredPrompt = null;
      return choiceResult.outcome === 'accepted';
      
    } catch (error) {
      console.error('[PWA Manager] Install prompt failed:', error);
      return false;
    }
  }

  /**
   * オンライン/オフライン状態を取得
   */
  getNetworkStatus(): { online: boolean; effectiveType?: string } {
    const connection = (navigator as unknown as { connection?: { effectiveType?: string; downlink?: number }; mozConnection?: { effectiveType?: string; downlink?: number }; webkitConnection?: { effectiveType?: string; downlink?: number } }).connection || (navigator as unknown as { mozConnection?: { effectiveType?: string; downlink?: number } }).mozConnection || (navigator as unknown as { webkitConnection?: { effectiveType?: string; downlink?: number } }).webkitConnection;
    
    return {
      online: this.isOnline,
      effectiveType: connection?.effectiveType
    };
  }

  /**
   * キャッシュ情報を取得
   */
  async getCacheInfo(): Promise<{ cacheNames: string[]; storageEstimate?: StorageEstimate }> {
    if (!this.registration) {
      return { cacheNames: [] };
    }

    return new Promise((resolve, reject) => {
      const messageChannel = new MessageChannel();
      
      messageChannel.port1.onmessage = (event) => {
        if (event.data.success) {
          resolve(event.data.data);
        } else {
          reject(new Error(event.data.error));
        }
      };

      navigator.serviceWorker.controller?.postMessage(
        { type: 'GET_CACHE_STATUS' },
        [messageChannel.port2]
      );
    });
  }

  /**
   * Service Workerからのメッセージを処理
   */
  private setupEventListeners(): void {
    // PWAインストールプロンプト
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e as BeforeInstallPromptEvent;
      console.log('[PWA Manager] Install prompt deferred');
      this.notifyInstallAvailable();
    });

    // PWAインストール完了
    window.addEventListener('appinstalled', () => {
      console.log('[PWA Manager] PWA installed successfully');
      this.deferredPrompt = null;
      this.notifyInstallComplete();
    });

    // オンライン/オフライン状態の変更
    window.addEventListener('online', () => {
      this.isOnline = true;
      console.log('[PWA Manager] Network: Online');
      this.notifyNetworkStatusChange(true);
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      console.log('[PWA Manager] Network: Offline');
      this.notifyNetworkStatusChange(false);
    });

    // Service Workerからのメッセージ
    navigator.serviceWorker?.addEventListener('message', (event) => {
      console.log('[PWA Manager] Message from Service Worker:', event.data);
      
      switch (event.data.type) {
        case 'BACKGROUND_SYNC_SUCCESS':
          this.notifyBackgroundSyncComplete(event.data.data);
          break;
        default:
          console.log('[PWA Manager] Unknown message type:', event.data.type);
      }
    });
  }

  /**
   * アップデート利用可能の通知
   */
  private notifyUpdateAvailable(): void {
    this.sendNotification({
      title: 'アプリの更新',
      body: '新しいバージョンが利用可能です。ページを再読み込みしてください。',
      data: { action: 'update' }
    });
  }

  /**
   * インストール可能の通知
   */
  private notifyInstallAvailable(): void {
    // UIコンポーネントにイベントを送信
    window.dispatchEvent(new CustomEvent('pwaInstallAvailable'));
  }

  /**
   * インストール完了の通知
   */
  private notifyInstallComplete(): void {
    this.sendNotification({
      title: 'インストール完了',
      body: 'プロ野球志望届アプリのインストールが完了しました！'
    });
  }

  /**
   * ネットワーク状態変更の通知
   */
  private notifyNetworkStatusChange(online: boolean): void {
    window.dispatchEvent(new CustomEvent('networkStatusChange', {
      detail: { online }
    }));
  }

  /**
   * バックグラウンド同期完了の通知
   */
  private notifyBackgroundSyncComplete(dataType: string): void {
    this.sendNotification({
      title: 'データ同期完了',
      body: `${dataType === 'players' ? '選手データ' : '学校データ'}の同期が完了しました。`
    });
  }
}

// シングルトンインスタンス
export const pwaManager = new PWAManager();

// 便利な関数をエクスポート
// 安全なアクセス用のラッパー関数を追加
export function getPWAInstallStatus(): PWAInstallStatus {
  if (!pwaManager) {
    return {
      canInstall: false,
      isInstalled: false,
      platform: 'unknown'
    };
  }
  return {
    canInstall: pwaManager.deferredPrompt !== null,
    isInstalled: window.matchMedia('(display-mode: standalone)').matches,
    platform: navigator.userAgent.includes('Mobile') ? 'mobile' : 'desktop'
  };
}

export const {
  registerServiceWorker,
  requestNotificationPermission,
  sendNotification,
  requestBackgroundSync,
  promptInstall,
  getNetworkStatus,
  getCacheInfo
} = pwaManager;