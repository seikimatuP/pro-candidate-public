/**
 * パフォーマンス最適化モジュール
 */

/**
 * ダッシュボードのパフォーマンスを最適化
 */
function optimizeDashboardPerformance(html) {
  const optimizationScript = `
    <script>
      // 遅延ロード関数
      function lazyLoadImages() {
        const images = document.querySelectorAll('img[data-src]');
        
        const imageObserver = new IntersectionObserver((entries, observer) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const img = entry.target;
              img.src = img.getAttribute('data-src');
              img.removeAttribute('data-src');
              observer.unobserve(img);
            }
          });
        });
        
        images.forEach(img => imageObserver.observe(img));
      }
      
      // 非表示セクションを遅延ロード
      function lazyLoadSections() {
        const sections = document.querySelectorAll('.lazy-section');
        
        const sectionObserver = new IntersectionObserver((entries, observer) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const section = entry.target;
              const content = section.getAttribute('data-content');
              if (content) {
                section.innerHTML = atob(content);
                section.classList.remove('lazy-section');
                observer.unobserve(section);
                
                // 遅延ロードされたセクション内の画像も処理
                lazyLoadImages();
              }
            }
          });
        });
        
        sections.forEach(section => sectionObserver.observe(section));
      }
      
      // DOMコンテンツのロード完了時に実行
      document.addEventListener('DOMContentLoaded', function() {
        lazyLoadImages();
        lazyLoadSections();
        
        // リソース消費が大きい操作は遅延実行
        setTimeout(() => {
          // 必要に応じてここに重い処理を追加
        }, 1000);
      });
      
      // ページロード完了時
      window.addEventListener('load', function() {
        // ここでパフォーマンスメトリクスを収集できます
        if (window.performance) {
          const timing = window.performance.timing;
          const loadTime = timing.loadEventEnd - timing.navigationStart;
          console.log('ページロード時間: ' + loadTime + 'ms');
        }
      });
    </script>
  `;
  
  return html.replace('</body>', `${optimizationScript}</body>`);
}

module.exports = {
  optimizeDashboardPerformance
};
