/**
 * インタラクティブなダッシュボード機能を提供するモジュール
 */

function addDashboardWidgets(html) {
  // ダッシュボードのドラッグ＆ドロップ機能を追加
  const widgetScript = `
    <script src="https://cdn.jsdelivr.net/npm/sortablejs@1.14.0/Sortable.min.js"></script>
    <script>
      document.addEventListener('DOMContentLoaded', function() {
        // セクションをドラッグ可能にする
        const sectionsContainer = document.querySelector('.dashboard-sections');
        if (sectionsContainer) {
          Sortable.create(sectionsContainer, {
            animation: 150,
            handle: '.widget-handle',
            ghostClass: 'widget-ghost',
            onEnd: function() {
              saveWidgetLayout();
            }
          });
          
          // 保存済みのレイアウトがあれば適用
          applyWidgetLayout();
        }
        
        // ウィジェットの最小化/展開機能
        document.querySelectorAll('.widget-toggle').forEach(toggle => {
          toggle.addEventListener('click', function() {
            const widget = this.closest('.widget');
            const content = widget.querySelector('.widget-content');
            const isMinimized = content.classList.toggle('hidden');
            this.innerHTML = isMinimized ? '🔽' : '🔼';
            saveWidgetStates();
          });
        });
      });
      
      // ウィジェットレイアウトを保存
      function saveWidgetLayout() {
        const sections = document.querySelectorAll('.widget');
        const layout = Array.from(sections).map(section => section.id);
        localStorage.setItem('dashboard-layout', JSON.stringify(layout));
      }
      
      // 保存済みのレイアウトを適用
      function applyWidgetLayout() {
        const savedLayout = localStorage.getItem('dashboard-layout');
        if (savedLayout) {
          try {
            const layout = JSON.parse(savedLayout);
            const container = document.querySelector('.dashboard-sections');
            const sections = document.querySelectorAll('.widget');
            
            // IDに基づいてセクションを並べ替え
            layout.forEach(id => {
              const section = document.getElementById(id);
              if (section) {
                container.appendChild(section);
              }
            });
          } catch (e) {
            console.error('レイアウトの適用に失敗しました:', e);
          }
        }
      }
      
      // ウィジェットの状態を保存
      function saveWidgetStates() {
        const states = {};
        document.querySelectorAll('.widget').forEach(widget => {
          const content = widget.querySelector('.widget-content');
          states[widget.id] = content.classList.contains('hidden');
        });
        localStorage.setItem('widget-states', JSON.stringify(states));
      }
    </script>
  `;
  
  // スタイルを追加
  const widgetStyles = `
    <style>
      .dashboard-sections {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
        gap: 1.5rem;
      }
      .widget {
        background: white;
        border-radius: 1rem;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        overflow: hidden;
        transition: box-shadow 0.3s ease;
        height: fit-content;
      }
      .widget:hover {
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
      }
      .widget-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 1rem;
        background: #f9fafb;
        border-bottom: 1px solid #e5e7eb;
        cursor: move;
      }
      .widget-handle {
        cursor: grab;
        padding: 0.25rem;
      }
      .widget-toggle {
        cursor: pointer;
        user-select: none;
      }
      .widget-content {
        padding: 1rem;
      }
      .widget-ghost {
        opacity: 0.6;
        background: #e5e7eb;
      }
      .dark-mode .widget {
        background: #1f2937;
      }
      .dark-mode .widget-header {
        background: #111827;
        border-bottom: 1px solid #374151;
      }
    </style>
  `;
  
  // 既存のセクションをウィジェット形式に変換
  const containerStart = `<div class="dashboard-sections">`;
  const containerEnd = `</div>`;
  
  html = html.replace(/(<div class="section[^>]*>)/g, 
    `${containerStart}<div class="widget" id="widget-$1">
      <div class="widget-header">
        <h2 class="text-lg font-semibold">セクションタイトル</h2>
        <div class="flex">
          <span class="widget-handle mr-2">⋮⋮</span>
          <span class="widget-toggle">🔼</span>
        </div>
      </div>
      <div class="widget-content">`
  );
  
  html = html.replace(/<\/div>\s*(?=<div class="section|<\/body>)/g, 
    `</div></div>${containerEnd}`
  );
  
  html = html.replace('</head>', `${widgetStyles}</head>`);
  html = html.replace('</body>', `${widgetScript}</body>`);
  
  return html;
}

module.exports = {
  addDashboardWidgets
};
