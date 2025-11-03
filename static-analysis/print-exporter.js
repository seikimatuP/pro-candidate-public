/**
 * 高品質な印刷・PDF出力機能
 */

function addPrintExporter(html) {
  const printStyles = `
    <style>
      @media print {
        @page {
          size: A4;
          margin: 2cm;
        }
        body {
          font-family: 'Noto Sans JP', Arial, sans-serif;
          color: #000;
          background: #fff;
        }
        .dashboard-sections {
          display: block !important;
        }
        .widget {
          page-break-inside: avoid;
          border: 1px solid #ddd;
          margin-bottom: 20px;
          box-shadow: none !important;
        }
        .print-hide {
          display: none !important;
        }
        .widget-header {
          background-color: #f5f5f5 !important;
          color: #333 !important;
        }
        table {
          border-collapse: collapse;
          width: 100%;
        }
        td, th {
          border: 1px solid #ddd;
          padding: 8px;
        }
        canvas {
          max-width: 100%;
          height: auto !important;
        }
        
        /* ヘッダーとフッター */
        .print-header, .print-footer {
          display: block !important;
        }
        .print-header {
          position: running(header);
          text-align: center;
        }
        .print-footer {
          position: running(footer);
          text-align: center;
        }
        @page {
          @top-center { content: element(header) }
          @bottom-center { content: element(footer) }
        }
      }
      
      .print-header, .print-footer {
        display: none;
      }
      
      .pdf-options {
        background: white;
        border-radius: 8px;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        padding: 1rem;
        position: fixed;
        top: 4rem;
        right: 1rem;
        z-index: 100;
        width: 300px;
        display: none;
      }
      
      .pdf-options.show {
        display: block;
      }
    </style>
  `;
  
  const printElements = `
    <div class="print-header">
      <img src="data:image/svg+xml,%3Csvg width='200' height='50' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='100%25' height='100%25' fill='%23f1f5f9'/%3E%3Ctext x='50%25' y='50%25' font-family='Arial' font-size='14' text-anchor='middle' dominant-baseline='middle' fill='%23334155'%3E静的解析レポート%3C/text%3E%3C/svg%3E" alt="レポートロゴ" style="height: 40px;">
      <p style="margin: 5px 0 0;">静的コード品質分析レポート - ${new Date().toLocaleDateString('ja-JP')}</p>
    </div>
    
    <div class="print-footer">
      <p>ページ <span class="pageNumber"></span> / <span class="totalPages"></span> - 生成日時: ${new Date().toLocaleString('ja-JP')}</p>
    </div>
    
    <div class="pdf-options" id="pdfOptions">
      <h3 class="text-lg font-bold mb-3">PDF出力オプション</h3>
      <div class="mb-3">
        <label class="block text-sm mb-1">出力形式</label>
        <select class="w-full p-2 border rounded">
          <option value="a4">A4</option>
          <option value="letter">レター</option>
          <option value="legal">リーガル</option>
        </select>
      </div>
      <div class="mb-3">
        <label class="block text-sm mb-1">セクションを含める</label>
        <div class="space-y-1">
          <div><input type="checkbox" id="incSummary" checked> <label for="incSummary">サマリー</label></div>
          <div><input type="checkbox" id="incErrors" checked> <label for="incErrors">エラー詳細</label></div>
          <div><input type="checkbox" id="incComplexity" checked> <label for="incComplexity">複雑度</label></div>
          <div><input type="checkbox" id="incCoverage" checked> <label for="incCoverage">カバレッジ</label></div>
          <div><input type="checkbox" id="incCharts" checked> <label for="incCharts">グラフとチャート</label></div>
        </div>
      </div>
      <div class="flex justify-between">
        <button id="cancelPdfBtn" class="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300">キャンセル</button>
        <button id="generatePdfBtn" class="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">PDF生成</button>
      </div>
    </div>
  `;
  
  const printScript = `
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
    <script>
      document.addEventListener('DOMContentLoaded', function() {
        // ページ番号を設定する関数
        function setPageNumbers() {
          let pageNum = 1;
          const pageNumbers = document.querySelectorAll('.pageNumber');
          pageNumbers.forEach(el => {
            el.textContent = pageNum++;
          });
          
          const totalPages = document.querySelectorAll('.totalPages');
          totalPages.forEach(el => {
            el.textContent = pageNumbers.length;
          });
        }
        
        // 印刷前に実行
        window.onbeforeprint = function() {
          setPageNumbers();
        };
        
        // 印刷ボタンを追加
        const printBtn = document.createElement('button');
        printBtn.className = 'fixed top-4 right-16 z-50 p-2 rounded-full bg-blue-500 text-white hover:bg-blue-600 focus:outline-none';
        printBtn.innerHTML = '<span>🖨️</span>';
        printBtn.title = '印刷・PDF出力';
        
        // PDFボタンを追加
        const pdfBtn = document.createElement('button');
        pdfBtn.className = 'fixed top-4 right-28 z-50 p-2 rounded-full bg-red-500 text-white hover:bg-red-600 focus:outline-none';
        pdfBtn.innerHTML = '<span>📄</span>';
        pdfBtn.title = 'PDF設定';
        
        // 印刷ボタンクリック時の処理
        printBtn.addEventListener('click', function() {
          window.print();
        });
        
        // PDFボタンクリック時の処理
        pdfBtn.addEventListener('click', function() {
          const pdfOptions = document.getElementById('pdfOptions');
          pdfOptions.classList.toggle('show');
        });
        
        // PDFオプションのキャンセルボタン
        document.getElementById('cancelPdfBtn').addEventListener('click', function() {
          document.getElementById('pdfOptions').classList.remove('show');
        });
        
        // PDF生成ボタン
        document.getElementById('generatePdfBtn').addEventListener('click', function() {
          const element = document.body;
          
          // チェックされていないセクションを一時的に非表示
          document.querySelectorAll('input[type="checkbox"]:not(:checked)').forEach(checkbox => {
            const sectionId = checkbox.id.replace('inc', '');
            const section = document.getElementById(sectionId.toLowerCase() + 'Section');
            if (section) {
              section.dataset.originalDisplay = section.style.display;
              section.style.display = 'none';
            }
          });
          
          // PDF作成オプション
          const opt = {
            margin: [15, 15],
            filename: '静的解析レポート_' + new Date().toISOString().split('T')[0] + '.pdf',
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
          };
          
          // PDF作成
          html2pdf().set(opt).from(element).save().then(() => {
            // 非表示にしたセクションを元に戻す
            document.querySelectorAll('[data-original-display]').forEach(section => {
              section.style.display = section.dataset.originalDisplay;
              delete section.dataset.originalDisplay;
            });
            
            document.getElementById('pdfOptions').classList.remove('show');
          });
        });
        
        document.body.appendChild(printBtn);
        document.body.appendChild(pdfBtn);
      });
    </script>
  `;
  
  // HTMLに追加
  html = html.replace('</head>', `${printStyles}</head>`);
  html = html.replace('<body>', `<body>${printElements}`);
  html = html.replace('</body>', `${printScript}</body>`);
  
  return html;
}

module.exports = {
  addPrintExporter
};
