/**
 * ダッシュボードアニメーション強化モジュール
 */
const fs = require('fs');
const path = require('path');

/**
 * アニメーション効果を追加
 */
function addAnimationEffects(html) {
  const animationScript = `
    <script>
      document.addEventListener('DOMContentLoaded', function() {
        // 要素を順番にフェードインさせる
        const staggeredElements = document.querySelectorAll('.card, .metric-card, .chart-container, h2');
        staggeredElements.forEach((element, index) => {
          element.style.opacity = '0';
          element.style.transform = 'translateY(20px)';
          
          setTimeout(() => {
            element.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
          }, 100 * index);
        });
        
        // 進捗バーのアニメーション
        const progressBars = document.querySelectorAll('.progress-fill');
        progressBars.forEach(bar => {
          const width = bar.style.width;
          bar.style.width = '0';
          
          setTimeout(() => {
            bar.style.width = width;
          }, 500);
        });
        
        // 数値カウントアップアニメーション
        const countElements = document.querySelectorAll('.count-animation');
        countElements.forEach(element => {
          const target = parseInt(element.getAttribute('data-target'));
          let count = 0;
          const duration = 1500; // ミリ秒
          const interval = Math.min(50, duration / target);
          const step = target / (duration / interval);
          
          const timer = setInterval(() => {
            count += step;
            if (count >= target) {
              element.textContent = target;
              clearInterval(timer);
            } else {
              element.textContent = Math.floor(count);
            }
          }, interval);
        });
        
        // キラキラ効果のポップアップ通知
        setTimeout(() => {
          createSuccessNotification('分析レポートの読み込みが完了しました！');
        }, 1000);
      });
      
      // ポップアップ通知を作成
      function createSuccessNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg animate__animated animate__fadeInUp';
        notification.innerHTML = \`
          <div class="flex items-center">
            <span class="text-xl mr-2">✨</span>
            <span>\${message}</span>
          </div>
        \`;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
          notification.classList.remove('animate__fadeInUp');
          notification.classList.add('animate__fadeOutDown');
          setTimeout(() => {
            notification.remove();
          }, 1000);
        }, 5000);
      }
    </script>
  `;
  
  return html.replace('</body>', `${animationScript}</body>`);
}

module.exports = {
  addAnimationEffects
};
