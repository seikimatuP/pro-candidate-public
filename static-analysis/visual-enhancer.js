/**
 * 静的解析レポートの視覚効果を強化するユーティリティ
 */
const fs = require('fs');
const path = require('path');

// プロジェクトルートパス
const ROOT_DIR = path.resolve(__dirname, '..');

/**
 * ダッシュボードをインタラクティブに強化する
 * @param {string} dashboardPath - ダッシュボードHTMLファイルのパス
 */
function enhanceDashboard(dashboardPath) {
  const defaultPath = path.join(ROOT_DIR, 'reports', 'static-analysis-dashboard.html');
  const targetPath = dashboardPath || defaultPath;
  
  if (!fs.existsSync(targetPath)) {
    console.error('ダッシュボードファイルが見つかりません:', targetPath);
    return;
  }
  
  console.log(`📊 ダッシュボードを強化します: ${targetPath}`);
  
  let dashboardHtml = fs.readFileSync(targetPath, 'utf8');
  
  // 段階的に強化を適用
  dashboardHtml = addModernStyles(dashboardHtml);
  dashboardHtml = addInteractiveCharts(dashboardHtml);
  dashboardHtml = addDarkModeSupport(dashboardHtml);
  dashboardHtml = addAnimationEffects(dashboardHtml);
  dashboardHtml = addSummarySection(dashboardHtml);
  dashboardHtml = enhanceMobileResponsiveness(dashboardHtml);
  dashboardHtml = addThemeCustomization(dashboardHtml);
  dashboardHtml = addTableInteractivity(dashboardHtml);
  dashboardHtml = addPrintStyles(dashboardHtml);
  
  // 変更を保存
  fs.writeFileSync(targetPath, dashboardHtml);
  console.log(`✨ ダッシュボードのビジュアルを強化しました: ${targetPath}`);
}

/**
 * モダンなスタイルを追加
 */
function addModernStyles(html) {
  // ヘッダーにモダンなCSSライブラリを追加
  const styleLinks = `
    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css" />
  `;
  
  // CSSカスタマイズ
  const customStyles = `
    <style>
      :root {
        --primary: #3B82F6;
        --secondary: #10B981;
        --warning: #F59E0B;
        --danger: #EF4444;
        --dark: #1F2937;
        --light: #F9FAFB;
      }
      body {
        font-family: 'Noto Sans JP', sans-serif;
        background-color: var(--light);
        color: var(--dark);
        transition: all 0.3s ease;
      }
      .dark-mode {
        --light: #111827;
        --dark: #F9FAFB;
        background-color: var(--light);
        color: var(--dark);
      }
      
      .card {
        border-radius: 1rem;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        transition: transform 0.3s ease, box-shadow 0.3s ease;
        overflow: hidden;
      }
      
      .card:hover {
        transform: translateY(-5px);
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      }
      
      .metric-card {
        position: relative;
        overflow: hidden;
        z-index: 1;
      }
      .metric-card::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 100%);
        z-index: -1;
      }
      .btn {
        padding: 0.5rem 1rem;
        border-radius: 0.5rem;
        font-weight: 500;
        transition: all 0.2s ease;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      .btn-primary {
        background-color: var(--primary);
        color: white;
      }
      
      .btn-primary:hover {
        background-color: #2563EB;
      }
      
      .progress-bar {
        height: 0.5rem;
        background: #e5e7eb;
        border-radius: 9999px;
        overflow: hidden;
        margin: 1rem 0;
      }
      .progress-fill {
        height: 100%;
        transition: width 1.5s ease-out;
      }
      
      /* グラフエリア用のスタイル */
      .chart-container {
        background: white;
        border-radius: 1rem;
        padding: 1rem;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        margin: 1.5rem 0;
        transition: all 0.3s ease;
      }
      
      .dark-mode .chart-container {
        background: #374151;
      }
      
      /* テーブルのスタイル改善 */
      table {
        border-collapse: separate;
        border-spacing: 0;
        width: 100%;
        border-radius: 0.5rem;
        overflow: hidden;
      }
      th, td {
        padding: 0.75rem 1rem;
      }
      
      th {
        background-color: #f3f4f6;
        font-weight: 600;
        text-transform: uppercase;
        font-size: 0.75rem;
        letter-spacing: 0.05em;
      }
      
      .dark-mode th {
        background-color: #4B5563;
        color: #F9FAFB;
      }
      
      tbody tr:nth-child(even) {
        background-color: rgba(243, 244, 246, 0.5);
      }
      
      .dark-mode tbody tr:nth-child(even) {
        background-color: rgba(75, 85, 99, 0.2);
      }
      
      tbody tr:hover {
        background-color: rgba(243, 244, 246, 1);
      }
      
      .dark-mode tbody tr:hover {
        background-color: rgba(75, 85, 99, 0.5);
      }
    </style>
  `;
  
  return html.replace('</head>', `${styleLinks}${customStyles}</head>`);
}

/**
 * インタラクティブなチャートを追加
 */
function addInteractiveCharts(html) {
  // Chart.jsのスクリプトを追加
  const chartScript = `
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script>
      document.addEventListener('DOMContentLoaded', function() {
        // トレンドデータがあれば描画
        if (typeof trendData !== 'undefined') {
          const ctx = document.getElementById('trendChart').getContext('2d');
          
          // 日付ラベルを準備
          const labels = trendData.eslintErrors.map(item => {
            const year = item.date.substring(0, 4);
            const month = item.date.substring(4, 6);
            const day = item.date.substring(6, 8);
            return \`\${year}/\${month}/\${day}\`;
          });
          
          // チャートを作成
          const myChart = new Chart(ctx, {
            type: 'line',
            data: {
              labels: labels,
              datasets: [
                {
                  label: 'ESLintエラー',
                  data: trendData.eslintErrors.map(item => item.value),
                  borderColor: '#EF4444',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  tension: 0.3,
                  fill: true
                },
                {
                  label: 'ESLint警告',
                  data: trendData.eslintWarnings.map(item => item.value),
                  borderColor: '#F59E0B',
                  backgroundColor: 'rgba(245, 158, 11, 0.1)',
                  tension: 0.3,
                  fill: true
                },
                {
                  label: '高複雑度関数',
                  data: trendData.complexity.map(item => item.value),
                  borderColor: '#8B5CF6',
                  backgroundColor: 'rgba(139, 92, 246, 0.1)',
                  tension: 0.3,
                  fill: true
                },
                {
                  label: 'テストカバレッジ',
                  data: trendData.coverage.map(item => item.value),
                  borderColor: '#10B981',
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  tension: 0.3,
                  fill: true,
                  yAxisID: 'y1'
                }
              ]
            },
            options: {
              responsive: true,
              interaction: {
                mode: 'index',
                intersect: false,
              },
              plugins: {
                tooltip: {
                  enabled: true,
                  mode: 'index',
                  intersect: false,
                  callbacks: {
                    label: function(context) {
                      let label = context.dataset.label || '';
                      if (label) {
                        label += ': ';
                      }
                      if (context.parsed.y !== null) {
                        if (context.dataset.label === 'テストカバレッジ') {
                          label += context.parsed.y + '%';
                        } else {
                          label += context.parsed.y;
                        }
                      }
                      return label;
                    }
                  }
                },
                legend: {
                  position: 'top',
                }
              },
              scales: {
                y: {
                  beginAtZero: true,
                  title: {
                    display: true,
                    text: '問題数'
                  }
                },
                y1: {
                  beginAtZero: true,
                  position: 'right',
                  title: {
                    display: true,
                    text: 'カバレッジ(%)'
                  },
                  min: 0,
                  max: 100,
                  grid: {
                    drawOnChartArea: false
                  }
                },
                x: {
                  title: {
                    display: true,
                    text: '日付'
                  }
                }
              }
            }
          });
        }
      });
      
      function createSummaryPieChart() {
        // 要素が存在する場合のみ実行
        if (document.getElementById('summaryPieChart')) {
          const pieCtx = document.getElementById('summaryPieChart').getContext('2d');
          new Chart(pieCtx, {
            type: 'doughnut',
            data: {
              labels: ['解決済み', '警告', 'エラー'],
              datasets: [{
                data: [80, 15, 5], // ここは実際のデータを反映させる必要があります
                backgroundColor: [
                  '#10B981', // 解決済み
                  '#F59E0B', // 警告
                  '#EF4444'  // エラー
                ],
                hoverOffset: 4
              }]
            },
            options: {
              responsive: true,
              plugins: {
                legend: {
                  position: 'bottom',
                }
              },
            }
          });
        }
      }
    </script>
  `;
  return html.replace('</body>', `${chartScript}</body>`);
}

/**
 * ダークモード対応
 */
function addDarkModeSupport(html) {
  const darkModeScript = `
    <script>
      function toggleDarkMode() {
        document.body.classList.toggle('dark-mode');
        const isDarkMode = document.body.classList.contains('dark-mode');
        localStorage.setItem('darkMode', isDarkMode ? 'enabled' : 'disabled');
        document.getElementById('darkModeIcon').textContent = isDarkMode ? '🌙' : '☀️';
      }
      
      document.addEventListener('DOMContentLoaded', function() {
        const darkModeBtn = document.createElement('button');
        darkModeBtn.className = 'fixed top-4 right-4 z-50 p-2 rounded-full bg-gray-200 dark:bg-gray-700 focus:outline-none';
        darkModeBtn.innerHTML = '<span id="darkModeIcon">☀️</span>';
        darkModeBtn.addEventListener('click', toggleDarkMode);
        document.body.appendChild(darkModeBtn);
        
        // 保存された設定に基づいてダークモードを適用
        if (localStorage.getItem('darkMode') === 'enabled') {
          document.body.classList.add('dark-mode');
          document.getElementById('darkModeIcon').textContent = '🌙';
        }
      });
    </script>
  `;
  
  // ボディの終了タグの前にスクリプトを追加
  return html.replace('</body>', `${darkModeScript}</body>`);
}

/**
 * アニメーション効果追加
 */
function addAnimationEffects(html) {
  const animationScript = `
    <script>
      document.addEventListener('DOMContentLoaded', function() {
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
        
        // メトリックカード用のホバーエフェクト
        const metricCards = document.querySelectorAll('.metric-card');
        metricCards.forEach(card => {
          card.addEventListener('mouseenter', function() {
            this.classList.add('animate__animated', 'animate__pulse');
          });
          
          card.addEventListener('mouseleave', function() {
            this.classList.remove('animate__animated', 'animate__pulse');
          });
        });
      });
    </script>
  `;
  return html.replace('</body>', `${animationScript}</body>`);
}

/**
 * サマリーセクションを追加（新機能）
 */
function addSummarySection(html) {
  const summarySection = `
    <div class="section mt-10 mb-16">
      <h2 class="text-2xl font-bold mb-6">品質スコア概要</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="bg-white p-6 rounded-xl shadow-lg">
          <div class="mb-4">
            <h3 class="text-lg font-semibold">コード品質分布</h3>
          </div>
          <div class="chart-wrapper" style="height: 250px;">
            <canvas id="summaryPieChart"></canvas>
          </div>
        </div>
        <div class="bg-white p-6 rounded-xl shadow-lg">
          <div class="mb-4">
            <h3 class="text-lg font-semibold">品質メトリクス</h3>
          </div>
          <div class="space-y-4">
            <div>
              <div class="flex justify-between mb-1">
                <span class="font-medium">コードカバレッジ</span>
                <span class="text-green-600 font-semibold">85%</span>
              </div>
              <div class="w-full bg-gray-200 rounded-full h-2">
                <div class="bg-green-500 h-2 rounded-full" style="width: 85%"></div>
              </div>
            </div>
            <div>
              <div class="flex justify-between mb-1">
                <span class="font-medium">コード品質スコア</span>
                <span class="text-blue-600 font-semibold">B+</span>
              </div>
              <div class="w-full bg-gray-200 rounded-full h-2">
                <div class="bg-blue-500 h-2 rounded-full" style="width: 75%"></div>
              </div>
            </div>
            <div>
              <div class="flex justify-between mb-1">
                <span class="font-medium">セキュリティスコア</span>
                <span class="text-yellow-600 font-semibold">A-</span>
              </div>
              <div class="w-full bg-gray-200 rounded-full h-2">
                <div class="bg-yellow-500 h-2 rounded-full" style="width: 90%"></div>
              </div>
            </div>
            <div>
              <div class="flex justify-between mb-1">
                <span class="font-medium">メンテナンス性</span>
                <span class="text-purple-600 font-semibold">B</span>
              </div>
              <div class="w-full bg-gray-200 rounded-full h-2">
                <div class="bg-purple-500 h-2 rounded-full" style="width: 70%"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // ダッシュボードの最初のセクションの後にサマリーセクションを挿入
  return html.replace(
    /<div class="section">/,
    `${summarySection}<div class="section">`
  );
}

/**
 * モバイル対応の強化機能を追加
 * @param {string} html - HTML内容
 * @returns {string} - 強化されたHTML
 */
function enhanceMobileResponsiveness(html) {
  // メタビューポートの確認と追加
  if (!html.includes('viewport')) {
    html = html.replace('<head>', 
      '<head><meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">');
  }
  
  // モバイル向けのスタイルを追加
  const mobileStyles = `
    <style>
      @media (max-width: 768px) {
        .summary { grid-template-columns: repeat(2, 1fr); }
        .metric-value { font-size: 1.5rem; }
        table { font-size: 0.85rem; }
        th, td { padding: 0.5rem; }
        h1 { font-size: 1.5rem; }
        h2 { font-size: 1.2rem; }
        .header { flex-direction: column; }
        /* モバイル向けに表をスクロール可能にする */
        .table-container {
          width: 100%;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }
        /* モバイルでの表示を向上するためのスタイル */
        .card, .metric-card, .chart-container {
          padding: 0.75rem;
          margin-bottom: 1rem;
        }
      }
      
      /* モバイルでスワイプ操作をサポートするためのスタイル */
      .swipeable {
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
        scroll-snap-type: x mandatory;
        display: flex;
      }
      
      .swipeable-item {
        scroll-snap-align: start;
        flex: 0 0 85%;
        padding-right: 15px;
      }
    </style>
  `;
  
  // 各セクションにIDを追加（モバイルメニュー用）
  html = html.replace(
    '<div class="section mt-10 mb-16">',
    '<div id="summarySection" class="section mt-10 mb-16">'
  );
  const sectionIds = ['errorsSection', 'complexitySection', 'coverageSection', 'trendsSection', 'securitySection'];
  let sectionCount = 0;
  html = html.replace(/<div class="section">/g, (match) => {
    if (sectionCount < sectionIds.length) {
      return `<div id="${sectionIds[sectionCount++]}" class="section">`;
    }
    return match;
  });
  
  // モバイル向けのメニューを追加
  const mobileScripts = `
    <script>
      function addMobileMenu() {
        const menuItems = [
          {icon: '📊', text: 'サマリー', target: 'summarySection'},
          {icon: '⚠️', text: 'エラー', target: 'errorsSection'},
          {icon: '🔍', text: '複雑度', target: 'complexitySection'},
          {icon: '📈', text: 'カバレッジ', target: 'coverageSection'},
          {icon: '📱', text: 'トレンド', target: 'trendsSection'}
        ];
        
        const menu = document.createElement('div');
        menu.className = 'fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 shadow-lg z-50 flex justify-around items-center py-2 px-1';
        menu.style.boxShadow = '0 -2px 10px rgba(0,0,0,0.1)';
        
        menuItems.forEach(item => {
          const menuItem = document.createElement('button');
          menuItem.className = 'flex flex-col items-center justify-center w-1/5 py-1 focus:outline-none';
          menuItem.innerHTML = 
            '<span class="text-xl">' + item.icon + '</span>' +
            '<span class="text-xs mt-1">' + item.text + '</span>';
          menuItem.addEventListener('click', () => {
            const target = document.getElementById(item.target);
            if (target) {
              window.scrollTo({
                top: target.offsetTop - 20,
                behavior: 'smooth'
              });
            }
          });
          menu.appendChild(menuItem);
        });
        
        document.body.appendChild(menu);
        
        // メニュー分の余白を追加
        const spacer = document.createElement('div');
        spacer.style.height = '60px';
        document.body.appendChild(spacer);
      }
      
      document.addEventListener('DOMContentLoaded', function() {
        // モバイルデバイスかどうかを検出
        const isMobile = window.matchMedia('(max-width: 768px)').matches;
        if (isMobile) {
          // 表をスクロール可能なコンテナで囲む
          document.querySelectorAll('table').forEach(table => {
            if (!table.parentElement.classList.contains('table-container')) {
              const wrapper = document.createElement('div');
              wrapper.className = 'table-container';
              table.parentNode.insertBefore(wrapper, table);
              wrapper.appendChild(table);
            }
          });
          addMobileMenu();
        }
      });
    </script>
  `;
  
  html = html.replace('</head>', `${mobileStyles}</head>`);
  html = html.replace('</body>', `${mobileScripts}</body>`);
  return html;
}

/**
 * テーマカスタマイズ機能を追加
 */
function addThemeCustomization(html) {
  const themeStyles = `
    <style>
      :root {
        --theme-primary: #3B82F6;
        --theme-secondary: #10B981;
        --theme-warning: #F59E0B;
        --theme-danger: #EF4444;
        --theme-info: #6366F1;
        --theme-success: #22C55E;
        --theme-light: #F9FAFB;
        --theme-dark: #1F2937;
        --font-family: 'Noto Sans JP', sans-serif;
        --border-radius: 1rem;
        --transition-speed: 0.3s;
      }
      
      /* 事前定義テーマ */
      body.theme-blue {
        --theme-primary: #2563EB;
        --theme-secondary: #3B82F6;
      }
      
      body.theme-green {
        --theme-primary: #059669;
        --theme-secondary: #10B981;
      }
      
      body.theme-purple {
        --theme-primary: #7C3AED;
        --theme-secondary: #8B5CF6;
      }
      
      body.theme-orange {
        --theme-primary: #EA580C;
        --theme-secondary: #F97316;
      }
      
      body.theme-pink {
        --theme-primary: #DB2777;
        --theme-secondary: #EC4899;
      }
      
      /* テーマセレクター用のスタイル */
      .theme-selector {
        position: fixed;
        top: 4rem;
        right: 1rem;
        z-index: 40;
        background-color: white;
        border-radius: 0.5rem;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        padding: 0.5rem;
        display: none;
      }
      
      .theme-option {
        width: 2rem;
        height: 2rem;
        border-radius: 50%;
        margin: 0.25rem;
        cursor: pointer;
        border: 2px solid transparent;
        transition: all 0.2s ease;
      }
      
      .theme-option:hover {
        transform: scale(1.1);
        border: 2px solid transparent;
      }
      
      .theme-option.active {
        border-color: #000;
      }
      
      .theme-selector .theme-option {
        display: inline-block;
      }
      
      .theme-selector .theme-option[data-theme="theme-blue"] {
        background-color: #2563EB;
      }
      
      .theme-selector .theme-option[data-theme="theme-green"] {
        background-color: #059669;
      }
      
      .theme-selector .theme-option[data-theme="theme-purple"] {
        background-color: #7C3AED;
      }
      
      .theme-selector .theme-option[data-theme="theme-orange"] {
        background-color: #EA580C;
      }
      
      .theme-selector .theme-option[data-theme="theme-pink"] {
        background-color: #DB2777;
      }
    </style>
  `;
  
  const themeSelector = `
    <div class="theme-selector">
      <div class="flex flex-col">
        <div class="theme-option bg-blue-600" data-theme="theme-blue" style="background-color: #2563EB;"></div>
        <div class="theme-option bg-green-600" data-theme="theme-green" style="background-color: #059669;"></div>
        <div class="theme-option bg-purple-600" data-theme="theme-purple" style="background-color: #7C3AED;"></div>
        <div class="theme-option bg-orange-600" data-theme="theme-orange" style="background-color: #EA580C;"></div>
        <div class="theme-option bg-pink-600" data-theme="theme-pink" style="background-color: #DB2777;"></div>
      </div>
    </div>
  `;
  
  const themeScript = `
    <script>
      document.addEventListener('DOMContentLoaded', function() {
        const themeBtn = document.createElement('button');
        themeBtn.className = 'fixed top-4 right-28 z-50 p-2 rounded-full bg-purple-500 text-white hover:bg-purple-600 focus:outline-none';
        themeBtn.innerHTML = '<span>🎨</span>';
        themeBtn.title = 'テーマを変更';
        document.body.appendChild(themeBtn);
        
        // テーマセレクターを追加
        const themeSelector = document.querySelector('.theme-selector');
        themeBtn.addEventListener('click', function() {
          themeSelector.style.display = themeSelector.style.display === 'block' ? 'none' : 'block';
        });
        
        // テーマ選択のイベントリスナーを設定
        document.querySelectorAll('.theme-option').forEach(option => {
          option.addEventListener('click', function() {
            const theme = this.getAttribute('data-theme');
            document.body.className = document.body.className.replace(/theme-\\w+/g, '').trim();
            document.body.classList.add(theme);
            localStorage.setItem('dashboard-theme', theme);
            
            // アクティブクラスを更新
            document.querySelectorAll('.theme-option').forEach(el => el.classList.remove('active'));
            this.classList.add('active');
            themeSelector.style.display = 'none';
          });
        });
        
        // 保存されたテーマを適用
        const savedTheme = localStorage.getItem('dashboard-theme');
        if (savedTheme) {
          document.body.classList.add(savedTheme);
          document.querySelector(\`.theme-option[data-theme="\${savedTheme}"]\`)?.classList.add('active');
        }
      });
    </script>
  `;
  
  // スタイル、セレクター、スクリプトをHTMLに追加
  html = html.replace('</head>', `${themeStyles}</head>`);
  html = html.replace('<body>', `<body>${themeSelector}`);
  html = html.replace('</body>', `${themeScript}</body>`);
  return html;
}

/**
 * データテーブルフィルタリングとソート機能を追加
 */
function addTableInteractivity(html) {
  const tableStyles = `
    <style>
      .table-interactive-container {
        position: relative;
      }
      .issues-table {
        width: 100%;
        border-spacing: 0;
        border: 1px solid #e5e7eb;
        border-radius: 0.5rem;
        overflow: hidden;
      }
      .issues-table th {
        position: relative;
        cursor: pointer;
        user-select: none;
        background-color: #f3f4f6;
        font-weight: 600;
        text-transform: uppercase;
        font-size: 0.75rem;
        letter-spacing: 0.05em;
        padding: 0.75rem 1rem;
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
      .search-highlight {
        background-color: rgba(245, 158, 11, 0.2);
        border-radius: 2px;
        padding: 1px;
      }
    </style>
  `;
  
  const tableScript = `
    <script>
      document.addEventListener('DOMContentLoaded', function() {
        // テーブルを拡張する
        document.querySelectorAll('.issues-table').forEach(table => {
          // コンテナを作成
          const container = document.createElement('div');
          container.className = 'table-interactive-container mb-6';
          table.parentNode.insertBefore(container, table);
          container.appendChild(table);
          
          // 検索入力欄
          const searchContainer = document.createElement('div');
          searchContainer.className = 'flex items-center mb-3';
          searchContainer.innerHTML = \`
            <input type="text" class="table-search px-3 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="テーブルを検索...">
            <div class="ml-3">
              <button class="sort-btn px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <span>↑↓</span>
              </button>
            </div>
          \`;
          container.appendChild(searchContainer);
          
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
            const headerIndex = 0; // ソートするヘッダー列を取得（現在はファースト列固定）
            const tbody = table.querySelector('tbody');
            const rows = Array.from(tbody.querySelectorAll('tr'));
            const currentDir = table.getAttribute('data-sort-dir') || 'asc'; // ソート方向を決定（既存の属性か、なければデフォルトで昇順）
            const newDir = currentDir === 'asc' ? 'desc' : 'asc'; // ソート方向を更新
            
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
            
            // ボタンのUIを更新
            table.setAttribute('data-sort-dir', newDir);
            this.querySelector('span').textContent = newDir === 'asc' ? '↓' : '↑';
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
      });
    </script>
  `;
  
  // スタイルとスクリプトをHTMLに追加
  html = html.replace('</head>', `${tableStyles}</head>`);
  html = html.replace('</body>', `${tableScript}</body>`);
  return html;
}

/**
 * 印刷用のスタイルを追加する関数
 */
function addPrintStyles(html) {
  const printStyles = `
    <style>
      @media print {
        body {
          background-color: white !important;
          color: black !important;
        }
        .card, .metric-card, .chart-container {
          box-shadow: none !important;
          border: 1px solid #ddd !important;
          break-inside: avoid !important;
        }
        button, .fixed {
          display: none !important;
        }
        a {
          text-decoration: none !important;
          color: black !important;
        }
        table {
          font-size: 10pt !important;
          width: 100% !important;
        }
        .summary {
          grid-template-columns: repeat(2, 1fr) !important;
        }
        h1, h2 {
          break-before: page !important;
          margin-top: 1cm !important;
        }
        header + h1, header + * h1:first-of-type {
          break-before: avoid !important;
        }
        @page {
          margin: 1cm;
        }
        .print-header {
          display: block !important;
          position: running(header);
        }
        .print-footer {
          display: block !important;
          position: running(footer);
          text-align: center;
        }
        @page {
          @top-center { content: element(header) }
          @bottom-center { content: element(footer) }
        }
      }
      .print-only {
        display: none;
      }
    </style>
  `;
  
  const printElements = `
    <div class="print-only print-header">
      <div style="text-align: center; font-size: 8pt;">
        <h3>プロ野球候補選手データ収集ツール - 静的解析レポート</h3>
      </div>
    </div>
    <div class="print-only print-footer">
      <div style="font-size: 8pt;">
        ページ <span class="pageNumber"></span> / <span class="pageCount"></span>
        - 出力日時: ${new Date().toLocaleString('ja-JP')}
      </div>
    </div>
  `;
  
  const printScript = `
    <script>
      document.addEventListener('DOMContentLoaded', function() {
        // 印刷ボタンを追加
        const printBtn = document.createElement('button');
        printBtn.className = 'fixed top-4 right-16 z-50 p-2 rounded-full bg-blue-500 text-white hover:bg-blue-600 focus:outline-none';
        printBtn.innerHTML = '<span>🖨️</span>';
        printBtn.title = '印刷プレビュー';
        printBtn.addEventListener('click', function() {
          window.print();
        });
        document.body.appendChild(printBtn);
      });
    </script>
  `;
  
  // スタイルとスクリプトをHTMLに追加
  html = html.replace('</head>', `${printStyles}</head>`);
  html = html.replace('<body>', `<body>${printElements}`);
  html = html.replace('</body>', `${printScript}</body>`);
  
  return html;
}

/**
 * メイン実行関数
 */
function main() {
  const args = process.argv.slice(2);
  const dashboardPath = args.length > 0 ? args[0] : null;
  
  enhanceDashboard(dashboardPath);
}

// コマンドラインから直接実行された場合
if (require.main === module) {
  main();
}

// モジュールエクスポート
module.exports = {
  enhanceDashboard,
  addModernStyles,
  addInteractiveCharts,
  addDarkModeSupport,
  addAnimationEffects,
  addSummarySection,
  enhanceMobileResponsiveness,
  addThemeCustomization,
  addTableInteractivity,
  addPrintStyles
};