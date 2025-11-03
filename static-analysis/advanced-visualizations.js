/**
 * 高度なデータビジュアライゼーションを提供するモジュール
 */
const fs = require('fs');
const path = require('path');

/**
 * 高度なチャートを追加する
 */
function addAdvancedCharts(html) {
  const d3Script = `
    <script src="https://d3js.org/d3.v7.min.js"></script>
    <script>
      document.addEventListener('DOMContentLoaded', function() {
        // ファイル複雑度ヒートマップを作成（サンプル）
        if (document.getElementById('complexityHeatmap')) {
          createComplexityHeatmap();
        }
        
        // コード品質の時系列変化を表示（サンプル）
        if (document.getElementById('qualityTimeline')) {
          createQualityTimeline();
        }
      });
      
      function createComplexityHeatmap() {
        // サンプルデータ（実際の環境ではAPIから取得）
        const data = [
          {file: 'src/main.ts', complexity: 12, coverage: 85, issues: 2},
          {file: 'src/utils.ts', complexity: 5, coverage: 92, issues: 0},
          {file: 'src/models/user.ts', complexity: 8, coverage: 78, issues: 3},
          // ...その他のファイル
        ];
        
        const width = 600;
        const height = 300;
        const margin = {top: 30, right: 30, bottom: 60, left: 120};
        
        const svg = d3.select('#complexityHeatmap')
          .append('svg')
          .attr('width', width + margin.left + margin.right)
          .attr('height', height + margin.top + margin.bottom)
          .append('g')
          .attr('transform', \`translate(\${margin.left},\${margin.top})\`);
        
        // 色スケールの設定
        const colorScale = d3.scaleSequential()
          .domain([0, d3.max(data, d => d.complexity)])
          .interpolator(d3.interpolateInferno);
        
        // グリッドの作成
        svg.selectAll('rect')
          .data(data)
          .enter()
          .append('rect')
          .attr('x', 0)
          .attr('y', (d, i) => i * (height / data.length))
          .attr('width', width)
          .attr('height', height / data.length)
          .style('fill', d => colorScale(d.complexity))
          .style('stroke', 'white')
          .style('stroke-width', 1)
          .on('mouseover', function(event, d) {
            d3.select(this).style('stroke', '#333').style('stroke-width', 2);
            tooltip.style('opacity', 1);
            tooltip.html(\`ファイル: \${d.file}<br>複雑度: \${d.complexity}<br>カバレッジ: \${d.coverage}%<br>問題数: \${d.issues}\`)
              .style('left', (event.pageX + 10) + 'px')
              .style('top', (event.pageY - 15) + 'px');
          })
          .on('mouseout', function() {
            d3.select(this).style('stroke', 'white').style('stroke-width', 1);
            tooltip.style('opacity', 0);
          });
        
        // ファイル名を左に表示
        svg.selectAll('.file-label')
          .data(data)
          .enter()
          .append('text')
          .attr('class', 'file-label')
          .attr('x', -10)
          .attr('y', (d, i) => i * (height / data.length) + (height / data.length) / 2)
          .attr('text-anchor', 'end')
          .attr('dominant-baseline', 'middle')
          .text(d => d.file.split('/').pop())
          .style('font-size', '12px');
        
        // ツールチップ
        const tooltip = d3.select('body')
          .append('div')
          .style('position', 'absolute')
          .style('background', 'rgba(0, 0, 0, 0.8)')
          .style('color', 'white')
          .style('padding', '10px')
          .style('border-radius', '5px')
          .style('opacity', 0)
          .style('pointer-events', 'none')
          .style('z-index', 1000);
      }
      
      function createQualityTimeline() {
        // トレンドデータがあれば描画
        if (typeof trendData !== 'undefined') {
          // ここに時系列トレンド表示のD3.jsコードを実装
        }
      }
    </script>
  `;
  
  // ヒートマップ用コンテナを追加
  const heatmapContainer = `
    <div class="section mt-10">
      <h2 class="text-2xl font-bold mb-6">コード複雑度ヒートマップ</h2>
      <div class="bg-white p-6 rounded-xl shadow-lg">
        <div id="complexityHeatmap" class="w-full h-80"></div>
      </div>
    </div>
  `;
  
  // HTMLに追加
  html = html.replace('</body>', `${d3Script}</body>`);
  html = html.replace(
    /<div class="section">/,
    `${heatmapContainer}<div class="section">`
  );
  
  return html;
}

module.exports = {
  addAdvancedCharts
};
