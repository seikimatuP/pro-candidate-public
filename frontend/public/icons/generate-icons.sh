#!/bin/bash
# PWA用アイコン生成スクリプト
# 簡易的なSVGアイコンからPNG画像を生成

# ベースSVGアイコンを作成
cat > base-icon.svg << 'EOF'
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1976d2;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#42a5f5;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- 背景 -->
  <rect width="512" height="512" rx="80" fill="url(#bg)"/>
  
  <!-- 野球ボール -->
  <circle cx="256" cy="200" r="80" fill="white" stroke="#333" stroke-width="4"/>
  <path d="M 200 160 Q 256 180 312 160" stroke="#333" stroke-width="4" fill="none"/>
  <path d="M 200 240 Q 256 220 312 240" stroke="#333" stroke-width="4" fill="none"/>
  
  <!-- テキスト -->
  <text x="256" y="340" font-family="Arial, sans-serif" font-size="48" font-weight="bold" text-anchor="middle" fill="white">野球</text>
  <text x="256" y="390" font-family="Arial, sans-serif" font-size="32" text-anchor="middle" fill="white">志望届</text>
  
  <!-- ボーダー -->
  <rect width="512" height="512" rx="80" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="2"/>
</svg>
EOF

# 各サイズのPNGアイコンを生成（ImageMagickまたはInkscapeが必要）
sizes=(32 72 96 128 144 152 192 384 512)

for size in "${sizes[@]}"; do
  # ImageMagickが利用可能な場合
  if command -v convert &> /dev/null; then
    convert -background transparent base-icon.svg -resize ${size}x${size} icon-${size}x${size}.png
    echo "Generated icon-${size}x${size}.png"
  # Inkscapeが利用可能な場合
  elif command -v inkscape &> /dev/null; then
    inkscape --export-png=icon-${size}x${size}.png --export-width=${size} --export-height=${size} base-icon.svg
    echo "Generated icon-${size}x${size}.png"
  else
    echo "Warning: ImageMagick or Inkscape not found. Creating placeholder for icon-${size}x${size}.png"
    # プレースホルダーとして簡易的なHTMLファイルを作成
    cat > icon-${size}x${size}.html << EOF
<!-- Placeholder for icon-${size}x${size}.png -->
<!-- Install ImageMagick or Inkscape to generate actual PNG files -->
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#1976d2"/>
  <text x="256" y="280" font-family="Arial" font-size="120" text-anchor="middle" fill="white">⚾</text>
</svg>
EOF
  fi
done

# ベースSVGファイルを削除
rm base-icon.svg

echo "Icon generation complete!"
echo "Note: If actual PNG files were not generated, install ImageMagick (convert) or Inkscape"