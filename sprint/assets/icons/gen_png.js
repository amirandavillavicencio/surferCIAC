const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function createPng(width, height, colorR, colorG, colorB) {
  // Signature
  const signature = Buffer.from([138, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // 8-bit depth
  ihdr.writeUInt8(6, 9); // RGBA
  ihdr.writeUInt8(0, 10); // compression
  ihdr.writeUInt8(0, 11); // filter
  ihdr.writeUInt8(0, 12); // interlace

  const ihdrChunk = makeChunk('IHDR', ihdr);

  // Raw Image Data (Filter 0 for each scanline + RGBA pixels)
  const rowLength = 1 + width * 4;
  const rawData = Buffer.alloc(rowLength * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowLength;
    rawData[rowOffset] = 0; // Filter byte: None

    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;

      // Gradient / Circular icon effect
      const dx = (x - width / 2) / (width / 2);
      const dy = (y - height / 2) / (height / 2);
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 0.9) {
        // Runner reddish/orange neon gradient
        const factor = 1 - dist;
        rawData[pixelOffset] = Math.min(255, Math.floor(colorR * factor + 255 * (1 - factor)));     // R
        rawData[pixelOffset + 1] = Math.floor(colorG * factor + 71 * (1 - factor));  // G
        rawData[pixelOffset + 2] = Math.floor(colorB * factor + 87 * (1 - factor));  // B
        rawData[pixelOffset + 3] = 255;                                              // Alpha
      } else {
        // Dark background
        rawData[pixelOffset] = 11;
        rawData[pixelOffset + 1] = 14;
        rawData[pixelOffset + 2] = 20;
        rawData[pixelOffset + 3] = 255;
      }
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressedData);

  // IEND chunk
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function makeChunk(type, data) {
  const length = data.length;
  const chunk = Buffer.alloc(8 + length + 4);
  chunk.writeUInt32BE(length, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);

  const crcData = Buffer.alloc(4 + length);
  chunk.copy(crcData, 0, 4, 8 + length);
  const crc = crc32(crcData);
  chunk.writeUInt32BE(crc, 8 + length);

  return chunk;
}

// CRC32 implementation
function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    let byte = buf[i];
    crc = crc ^ byte;
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (-(crc & 1) & 0xedb88320);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// Generate 192x192 and 512x512
const png192 = createPng(192, 192, 255, 56, 56);
const png512 = createPng(512, 512, 255, 71, 87);

fs.writeFileSync(path.join(__dirname, 'icon-192.png'), png192);
fs.writeFileSync(path.join(__dirname, 'icon-512.png'), png512);

console.log('Valid PNG icons (192 & 512) generated successfully!');
