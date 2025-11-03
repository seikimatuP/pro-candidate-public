#!/usr/bin/env node

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function convertToPdf() {
  const inputFile = '/home/ynozue/pro_candidate/pro-baseball-er-diagram.md';
  const outputPdf = '/home/ynozue/pro_candidate/pro-baseball-er-diagram.pdf';
  
  console.log('Converting ER diagram to PDF using Playwright...');
  
  // Read the markdown content
  const content = fs.readFileSync(inputFile, 'utf8');
  
  // Create HTML with proper Mermaid rendering
  const htmlContent = `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>プロ野球志望届システム ER図</title>
    <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700&display=swap');
        
        body {
            font-family: 'Noto Sans JP', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            line-height: 1.8;
            color: #333;
            max-width: 210mm;
            margin: 0 auto;
            padding: 20mm;
            background: white;
            font-size: 11pt;
        }
        
        h1 {
            color: #1a5490;
            font-size: 24pt;
            border-bottom: 3px solid #1a5490;
            padding-bottom: 10px;
            margin-bottom: 30px;
        }
        
        h2 {
            color: #2c5aa0;
            font-size: 18pt;
            margin-top: 40px;
            margin-bottom: 20px;
            border-left: 5px solid #2c5aa0;
            padding-left: 10px;
        }
        
        h3 {
            color: #3a6bb0;
            font-size: 14pt;
            margin-top: 30px;
            margin-bottom: 15px;
        }
        
        h4 {
            color: #4a7cc0;
            font-size: 12pt;
            margin-top: 20px;
            margin-bottom: 10px;
        }
        
        code {
            background-color: #f5f5f5;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Consolas', 'Monaco', monospace;
            font-size: 0.9em;
        }
        
        pre {
            background-color: #f8f8f8;
            border: 1px solid #e0e0e0;
            border-radius: 5px;
            padding: 15px;
            overflow-x: auto;
            font-size: 0.85em;
            line-height: 1.4;
        }
        
        ul, ol {
            margin-left: 25px;
            margin-bottom: 15px;
        }
        
        li {
            margin-bottom: 8px;
        }
        
        strong {
            color: #1a5490;
            font-weight: 700;
        }
        
        .mermaid {
            text-align: center;
            margin: 30px 0;
            page-break-inside: avoid;
            width: 100%;
            overflow-x: auto;
        }
        
        .mermaid svg {
            max-width: 100%;
            height: auto;
            background: white;
        }
        
        hr {
            border: none;
            border-top: 2px solid #e0e0e0;
            margin: 40px 0;
        }
        
        p {
            margin-bottom: 15px;
            text-align: justify;
        }
        
        /* Print specific styles */
        @media print {
            body {
                padding: 15mm;
            }
            .mermaid {
                page-break-inside: avoid;
            }
            h2, h3 {
                page-break-after: avoid;
            }
        }
        
        /* Table styles */
        table {
            border-collapse: collapse;
            width: 100%;
            margin: 20px 0;
        }
        
        th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }
        
        th {
            background-color: #f5f5f5;
            font-weight: bold;
        }
        
        /* Section dividers */
        .section {
            margin-bottom: 50px;
        }
        
        /* Footer */
        .footer {
            margin-top: 60px;
            padding-top: 20px;
            border-top: 1px solid #e0e0e0;
            text-align: center;
            font-size: 0.9em;
            color: #666;
        }
    </style>
</head>
<body>
${convertMarkdownToHtml(content)}
<div class="footer">
    <p>生成日: ${new Date().toLocaleDateString('ja-JP')}</p>
</div>
<script>
    mermaid.initialize({ 
        startOnLoad: true,
        theme: 'default',
        er: {
            diagramPadding: 20,
            layoutDirection: 'TB',
            minEntityWidth: 100,
            minEntityHeight: 75,
            entityPadding: 15,
            fontSize: 12
        },
        themeVariables: {
            primaryColor: '#ffffff',
            primaryTextColor: '#333333',
            primaryBorderColor: '#1a5490',
            lineColor: '#2c5aa0',
            secondaryColor: '#f8f9fa',
            tertiaryColor: '#ffffff',
            background: '#ffffff',
            mainBkg: '#ffffff',
            secondBkg: '#f8f9fa',
            labelBoxBkgColor: '#e8f4f8',
            labelTextColor: '#333333',
            labelBackground: '#e8f4f8',
            entityBkg: '#ffffff',
            entityTextColor: '#333333',
            relationLabelColor: '#333333',
            relationLabelBackground: '#ffffff',
            attributeBackgroundColorOdd: '#ffffff',
            attributeBackgroundColorEven: '#f8f9fa'
        }
    });
    
    // Wait for mermaid to render
    window.addEventListener('load', () => {
        setTimeout(() => {
            window.MERMAID_READY = true;
        }, 2000);
    });
</script>
</body>
</html>`;
  
  // Launch browser
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Set content
  await page.setContent(htmlContent, { waitUntil: 'networkidle' });
  
  // Wait for Mermaid to render
  await page.waitForFunction(() => window.MERMAID_READY, { timeout: 5000 });
  
  // Generate PDF
  await page.pdf({
    path: outputPdf,
    format: 'A4',
    printBackground: true,
    margin: {
      top: '20mm',
      right: '20mm',
      bottom: '20mm',
      left: '20mm'
    }
  });
  
  await browser.close();
  
  console.log(`✅ PDF successfully created: ${outputPdf}`);
  console.log(`   File size: ${(fs.statSync(outputPdf).size / 1024).toFixed(2)} KB`);
}

function convertMarkdownToHtml(markdown) {
  let html = markdown;
  
  // Headers
  html = html.replace(/^#### (.*$)/gim, '<h4>$1</h4>');
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<div class="section"><h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
  
  // Close section divs
  html = html.replace(/<div class="section"><h2>/g, '</div><div class="section"><h2>');
  html = html.replace(/^<\/div>/, ''); // Remove first closing div
  html += '</div>'; // Add final closing div
  
  // Bold and italic
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  
  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  
  // Lists
  let inList = false;
  html = html.split('\n').map(line => {
    if (line.match(/^[-*] /)) {
      const listItem = line.replace(/^[-*] /, '<li>') + '</li>';
      if (!inList) {
        inList = true;
        return '<ul>\n' + listItem;
      }
      return listItem;
    } else if (inList && !line.trim()) {
      return '</ul>\n';
    } else if (inList && line.trim()) {
      inList = false;
      return '</ul>\n' + line;
    }
    return line;
  }).join('\n');
  
  if (inList) {
    html += '\n</ul>';
  }
  
  // Mermaid blocks
  html = html.replace(/```mermaid\n([\s\S]*?)```/g, '<div class="mermaid">$1</div>');
  
  // Code blocks
  html = html.replace(/```[a-z]*\n([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
  html = html.replace(/```\n([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
  
  // Paragraphs
  html = html.split('\n\n').map(para => {
    para = para.trim();
    if (para && !para.match(/^<[^>]+>/) && !para.match(/^[-*#]/)) {
      return '<p>' + para + '</p>';
    }
    return para;
  }).join('\n\n');
  
  // Horizontal rules
  html = html.replace(/^---$/gim, '<hr>');
  
  return html;
}

// Run the conversion
convertToPdf().catch(console.error);