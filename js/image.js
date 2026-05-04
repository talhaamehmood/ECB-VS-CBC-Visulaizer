// Load image file → draw on canvas → return ImageData
export function loadImageToCanvas(file, canvasId) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      const canvas = document.getElementById(canvasId);
      // Cap size so it doesn't get too large
      const MAX = 256;
      let w = img.width;
      let h = img.height;

      if (w > MAX || h > MAX) {
        const scale = Math.min(MAX / w, MAX / h);
        w = Math.floor(w * scale);
        h = Math.floor(h * scale);
      }

      // Make dimensions divisible by 16 (AES block = 16 bytes, we use 16px blocks for viz)
      w = Math.floor(w / 16) * 16;
      h = Math.floor(h / 16) * 16;

      canvas.width  = w;
      canvas.height = h;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);

      const imageData = ctx.getImageData(0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve({ imageData, width: w, height: h });
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = url;
  });
}

// ImageData → flat Uint8Array of RGB pixels (drop alpha for encryption simplicity)
export function imageDataToRGB(imageData) {
  const { data, width, height } = imageData;
  const rgb = new Uint8Array(width * height * 3);

  for (let i = 0, j = 0; i < data.length; i += 4, j += 3) {
    rgb[j]     = data[i];      // R
    rgb[j + 1] = data[i + 1];  // G
    rgb[j + 2] = data[i + 2];  // B
    // skip alpha
  }

  return rgb;
}

// RGB bytes back into ImageData for rendering
export function rgbToImageData(rgb, width, height) {
  const imageData = new ImageData(width, height);

  for (let i = 0, j = 0; i < rgb.length; i += 3, j += 4) {
    imageData.data[j]     = rgb[i];
    imageData.data[j + 1] = rgb[i + 1];
    imageData.data[j + 2] = rgb[i + 2];
    imageData.data[j + 3] = 255; // full alpha
  }

  return imageData;
}

// Draw ImageData onto a named canvas
export function renderToCanvas(imageData, canvasId) {
  const canvas = document.getElementById(canvasId);
  canvas.width  = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext('2d');
  ctx.putImageData(imageData, 0, 0);
}

// Split RGB pixel array into 16-byte blocks
// Each block = 16 bytes of pixel data (not 16x16 pixels — that's for block highlighting)
export function splitIntoBlocks(rgb, blockSize = 16) {
  const blocks = [];
  for (let i = 0; i < rgb.length; i += blockSize) {
    // last block might be smaller — pad with zeros
    const block = new Uint8Array(blockSize);
    const slice = rgb.slice(i, i + blockSize);
    block.set(slice);
    blocks.push(block);
  }
  return blocks;
}

// Reassemble blocks back into one flat Uint8Array (trim to original length)
export function joinBlocks(blocks, originalLength) {
  const flat = new Uint8Array(blocks.length * 16);
  for (let i = 0; i < blocks.length; i++) {
    flat.set(blocks[i], i * 16);
  }
  return flat.slice(0, originalLength);
}