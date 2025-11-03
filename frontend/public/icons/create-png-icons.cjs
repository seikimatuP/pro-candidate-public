// PWAアイコン生成（Node.js用）
// 実際のプロジェクトではCanvasやssharpライブラリを使用

const fs = require('fs');

// Base64エンコードされた野球アイコンデータ（簡易版）
const baseIconData = {
  '32': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAMrSURBVFhH7ZdLaBNBFIafJBsrNmq1WhHBR7EWFXwgCj5QwYciuBBBFy5c6MKFCBcuXLhw4cKFCy1cuHDhQhcuXLhw4cKFCxcuXLhw4cKFC1e68J3n7zsztpOZndlks5v0g3+SmTnznz/vzNk9kFJaGhoa6g+FQpuDweBRJpOZ8fv9c4FA4GMymXyYTCavDwwMXI1Go1eDweBZJpM5x+fzx3w+31G/33+cyWROer3eE16v91xLS8syTU1Na3R2dm7V2dk5JCQkNA3a2trW6ejoWKuzs3NIZ2fnhpycnNXZkpOTs0Z7e/smHR0dQzR//vxFNE8xMzNzk87OzkHyKcVEJBIZkcvl8yKRyFAiVyqVr4vF4o9ErnQ6/YfnfqJUKl+RKRQKhUKhUCgUCoVCoVAoFAqFQqFQKBQKhUKhUCgUCoVCoVAoFAqFQqFQKBQKhUKhUCgUCoVCoVAoFAqFQqFQKBQKhUKhUCgUCoVCoVAoFAqFQqFQKBQKhUKhUCgUCoVCoVAoFAqFQqFQKBQKhUKhUCgUCoVCoVAoFAqFQqFQKBQKhUKhUCgUCoVCoVAoFAqFQqFQKBQKhUKhUCgUCoVCoVAoFAqFQqFQKBQKhUKhUCgUCoVCoVAoFAqFQqFQKBQKhUKhUCgUCoVCoVAoFAqFQqFQKBQKhUKhUCgUCoVCoVAoFAqFQqFQKBQKhUKhUCgUCoVCoVAoFAqFQqFQKBQKhUKhUCgUCoVCoVAoFAqFQqFQKBQKhUKhUCgUCoVCoVAoFAqFQqFQKBQKhUKhUCgUCoVCoVAoFAqFQqFQKBQKhUKhUCgUCoVCoVAoFAqFQqFQKBQKhUKhUCgUCoVCoVAoFAqFQqFQKBQKhUKhUCgUCoVCoVAoFAqFQqFQKBQKhUKhUCgUCoVCoVAoFAqFQqFQKBQKhUKhUCgUCoVCoVAoFAqFQqFQKBQKhUKhUCgUCoVCoVAoFAqFQqFQKBQKhUKhUCgUCoVCoVAoFAqFQqFQKBQKhUKhUCgUCoVCoVAoFAqFQqFQKBQKhUKhUCgUCoVCoVAoFAqFQqFQKBQKhUKhUCgUCoVCoVAoFAqFQqFQKBQKhUKhUCgUCoVCoVAoFAqFQqFQKBQKhUKhUCgUCoVCoVD+D6RSSAAAAABJRU5ErkJggg==',
  '192': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMAAAADACAYAAABS3GwHAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAN1wAADdcBQiibeAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAABgMSURBVHic7Z15vBbV1cc/v3vvfe99H...'
};

const sizes = [32, 72, 96, 128, 144, 152, 192, 384, 512];

// 簡易的なPNGファイル生成（実際のプロジェクトではCanvas/sharpを使用）
function createSimplePNG(size) {
  // 最小限のPNGヘッダ（透明な画像）
  const pngSignature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const ihdrChunk = Buffer.alloc(25);
  
  ihdrChunk.writeUInt32BE(13, 0); // Chunk length
  ihdrChunk.write('IHDR', 4); // Chunk type
  ihdrChunk.writeUInt32BE(size, 8); // Width
  ihdrChunk.writeUInt32BE(size, 12); // Height
  ihdrChunk.writeUInt8(8, 16); // Bit depth
  ihdrChunk.writeUInt8(6, 17); // Color type (RGBA)
  ihdrChunk.writeUInt8(0, 18); // Compression method
  ihdrChunk.writeUInt8(0, 19); // Filter method
  ihdrChunk.writeUInt8(0, 20); // Interlace method
  
  // CRC for IHDR (simplified)
  ihdrChunk.writeUInt32BE(0x00000000, 21);
  
  // IEND chunk
  const iendChunk = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82]);
  
  return Buffer.concat([pngSignature, ihdrChunk, iendChunk]);
}

// 野球アイコンSVGを作成
function createBaseballIconSVG(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
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
  <text x="256" y="340" font-family="Arial, sans-serif" font-size="48" font-weight="bold" text-anchor="middle" fill="white">⚾</text>
  <text x="256" y="390" font-family="Arial, sans-serif" font-size="32" text-anchor="middle" fill="white">野球志望届</text>
  
  <!-- ボーダー -->
  <rect width="512" height="512" rx="80" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="2"/>
</svg>`;
}

// 各サイズのアイコンファイルを作成
sizes.forEach(size => {
  // SVGファイルを作成
  const svgContent = createBaseballIconSVG(size);
  fs.writeFileSync(`icon-${size}x${size}.svg`, svgContent);
  
  // 簡易的なPNGファイルを作成（プレースホルダー）
  const pngData = createSimplePNG(size);
  fs.writeFileSync(`icon-${size}x${size}.png`, pngData);
  
  console.log(`Created icon-${size}x${size}.svg and icon-${size}x${size}.png`);
});

console.log('All icon files created successfully!');
console.log('Note: PNG files are minimal placeholders. For production, use proper image conversion tools.');