// Build a map of block hash → color
// Identical blocks get the same color; unique blocks get a neutral gray
export function analyzeBlockPatterns(rgb, blockSize = 16) {
  const blockMap = new Map(); // hash string → color string
  const blockColors = [];     // one color per block
  let colorIndex = 0;

  // A simple palette of bright colors for repeated blocks
  const palette = [
    '#ff4757', '#ffa502', '#2ed573', '#1e90ff', '#ff6b81',
    '#eccc68', '#a29bfe', '#fd79a8', '#00cec9', '#fdcb6e',
    '#e17055', '#74b9ff', '#55efc4', '#fab1a0', '#636e72'
  ];

  const numBlocks = Math.floor(rgb.length / blockSize);

  for (let i = 0; i < numBlocks; i++) {
    const block = rgb.slice(i * blockSize, (i + 1) * blockSize);
    const key = blockToKey(block);

    if (!blockMap.has(key)) {
      // First time we see this block — assign a color
      // If we've used all palette colors, cycle them
      blockMap.set(key, { color: palette[colorIndex % palette.length], count: 0 });
      colorIndex++;
    }

    const entry = blockMap.get(key);
    entry.count++;
    blockColors.push(entry.color);
  }

  return { blockColors, blockMap, numBlocks };
}

// Convert block bytes to a simple string key for comparison
function blockToKey(block) {
  return Array.from(block).join(',');
}

// Draw the block map onto a canvas
// Each block = BLOCK_PX x BLOCK_PX pixels on the visualization canvas
export function renderBlockMap(blockColors, width, height, canvasId, blockSize = 16) {
  const canvas = document.getElementById(canvasId);

  // How many 16-byte blocks fit per row of the image?
  // Each 16-byte block covers ~5.3 pixels of RGB data
  // For viz: we use 16-pixel tiles on the canvas matching image layout
  const bytesPerRow   = width * 3;           // RGB, 3 bytes per pixel
  const blocksPerRow  = Math.ceil(bytesPerRow / blockSize);
  const totalRows     = Math.ceil(blockColors.length / blocksPerRow);
  const TILE = 8; // each block drawn as 8x8px tile

  canvas.width  = blocksPerRow * TILE;
  canvas.height = totalRows * TILE;

  const ctx = canvas.getContext('2d');

  // Count occurrences of each color — blocks that appear only once get gray
  const colorCount = {};
  for (const c of blockColors) {
    colorCount[c] = (colorCount[c] || 0) + 1;
  }

  for (let i = 0; i < blockColors.length; i++) {
    const col = i % blocksPerRow;
    const row = Math.floor(i / blocksPerRow);
    const count = colorCount[blockColors[i]];

    // Only highlight color if block repeats — unique blocks are gray
    ctx.fillStyle = count > 1 ? blockColors[i] : '#2a2f3a';
    ctx.fillRect(col * TILE, row * TILE, TILE, TILE);
  }
}

// Return stats string for the block analysis panel
export function getBlockStats(blockMap, numBlocks) {
  let repeated = 0;
  let uniqueCount = 0;

  for (const [, entry] of blockMap) {
    if (entry.count > 1) {
      repeated += entry.count;
    } else {
      uniqueCount++;
    }
  }

  const repeatPct = ((repeated / numBlocks) * 100).toFixed(1);

  return `
    Total blocks: ${numBlocks}<br>
    Repeated blocks: ${repeated} (${repeatPct}%)<br>
    Unique blocks: ${uniqueCount}
  `;
}