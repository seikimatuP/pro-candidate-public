/**
 * テーブル強化モジュール
 */

/**
 * データテーブルフィルタリングとソート機能を追加
 */
function addTableInteractivity(html) {
  // テーブルスタイル追加
  const tableStyles = `
    <style>
      .table-interactive-container {
        position: relative;
      }
      
      .issues-table {
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
        border: 1px solid #e5e7eb;
        border-radius: 0.5rem;
        overflow: hidden;
      }
      
      .issues-table th {
        position: relative;
        cursor: pointer;
        user-select: none;
      }
      
      .issues-table th:hover {
        background-color: #e5e7eb;
      }
      
      .issues-table tbody tr {
        transition: background-color 0.2s ease;
      }
      
      .issues-table tbody tr:hover {
        background-color: rgba(59, 130, 246, 0.1);
      }
      
      /* 検索ハイライト */
      .search-highlight {
        background-color: rgba(245, 158, 11, 0.2);
        border-radius: 2px;
        padding: 1px;
      }
    </style>
  `;
  
  // テーブル機能スクリプト
  const tableScript = `
    <script>
      document.addEventListener('DOMContentLoaded', function() {
        // テーブルを拡張する
        document.querySelectorAll('.issues-table').forEach(table => {
          // コンテナを作成
          const container = document.createElement('div');
          container.className = 'table-interactive-container mb-6';
          table.parentNode.insertBefore(container, table);
          
          // 検索入力欄
          const searchContainer = document.createElement('div');
          searchContainer.className = 'flex items-center mb-3';
          searchContainer.innerHTML = \`
            <input type="text" class="table-search px-3 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="テーブルを検索...">
            <div class="ml-3">
              <button class="sort-btn px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <span>↑↓</span>
              </button>
            </div>
          \`;
          
          container.appendChild(searchContainer);
          container.appendChild(table);
          
          // 検索機能
          const searchInput = searchContainer.querySelector('.table-search');
          searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            const tbody = table.querySelector('tbody');
            
            Array.from(tbody.querySelectorAll('tr')).forEach(row => {
              const text = row.textContent.toLowerCase();
              row.style.display = text.includes(searchTerm) ? '' : 'none';
            });
          });
          
          // ソート機能
          const sortBtn = searchContainer.querySelector('.sort-btn');
          sortBtn.addEventListener('click', function() {
            // ソートするヘッダー列を取得（現在はファースト列固定）
            const headerIndex = 0;
            const tbody = table.querySelector('tbody');
            const rows = Array.from(tbody.querySelectorAll('tr'));
            
            // ソート方向を決定（既存の属性か、なければデフォルトで昇順）
            const currentDir = table.getAttribute('data-sort-dir') || 'asc';
            const newDir = currentDir === 'asc' ? 'desc' : 'asc';
            
            // ソート処理
            rows.sort((a, b) => {
              const cellA = a.cells[headerIndex].textContent.trim();
              const cellB = b.cells[headerIndex].textContent.trim();
              
              return currentDir === 'asc'
                ? cellA.localeCompare(cellB, 'ja')
                : cellB.localeCompare(cellA, 'ja');
            });
            
            // ソートした行を再配置
            rows.forEach(row => tbody.appendChild(row));
            
            // ソート方向を更新
            table.setAttribute('data-sort-dir', newDir);
            
            // ボタンのUIを更新
            this.querySelector('span').textContent = newDir === 'asc' ? '↓' : '↑';
          });
        });
        
        // 空のテーブルにメッセージを表示
        document.querySelectorAll('.issues-table tbody').forEach(tbody => {
          if (!tbody.querySelector('tr')) {
            const tr = document.createElement('tr');
            tr.innerHTML = '<td colspan="10" class="text-center py-4 italic text-gray-500">データがありません</td>';
            tbody.appendChild(tr);
          }
        });
      });
    </script>
  `;
  
  // スクリプトをHTMLに追加
  html = html.replace('</head>', `${tableStyles}</head>`);
  html = html.replace('</body>', `${tableScript}</body>`);
  
  return html;
}

module.exports = {
  addTableInteractivity
};
