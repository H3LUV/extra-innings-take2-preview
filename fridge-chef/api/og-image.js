import { deflateSync } from 'node:zlib';

export const maxDuration = 10;

const WIDTH = 1200;
const HEIGHT = 630;

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data = Buffer.alloc(0)) {
  const typeBuffer = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, checksum]);
}

function makeImage() {
  const pixels = new Uint8Array(WIDTH * HEIGHT * 4);

  function setPixel(x, y, color) {
    if (x < 0 || y < 0 || x >= WIDTH || y >= HEIGHT) return;
    const index = (y * WIDTH + x) * 4;
    pixels[index] = color[0];
    pixels[index + 1] = color[1];
    pixels[index + 2] = color[2];
    pixels[index + 3] = color[3] ?? 255;
  }

  function fill(color) {
    for (let y = 0; y < HEIGHT; y += 1) {
      for (let x = 0; x < WIDTH; x += 1) setPixel(x, y, color);
    }
  }

  function rect(x0, y0, x1, y1, color) {
    for (let y = Math.max(0, y0); y < Math.min(HEIGHT, y1); y += 1) {
      for (let x = Math.max(0, x0); x < Math.min(WIDTH, x1); x += 1) setPixel(x, y, color);
    }
  }

  function circle(cx, cy, radius, color) {
    const r2 = radius * radius;
    for (let y = Math.floor(cy - radius); y <= Math.ceil(cy + radius); y += 1) {
      for (let x = Math.floor(cx - radius); x <= Math.ceil(cx + radius); x += 1) {
        const dx = x - cx;
        const dy = y - cy;
        if ((dx * dx) + (dy * dy) <= r2) setPixel(x, y, color);
      }
    }
  }

  function ellipse(cx, cy, rx, ry, color) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y += 1) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x += 1) {
        const dx = (x - cx) / rx;
        const dy = (y - cy) / ry;
        if ((dx * dx) + (dy * dy) <= 1) setPixel(x, y, color);
      }
    }
  }

  function line(x0, y0, x1, y1, width, color) {
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let i = 0; i <= steps; i += 1) {
      const t = steps ? i / steps : 0;
      circle(Math.round(x0 + ((x1 - x0) * t)), Math.round(y0 + ((y1 - y0) * t)), width / 2, color);
    }
  }

  fill([246, 242, 232, 255]);

  // Subtle background grid, matching the warm paper texture of the site.
  for (let y = 18; y < HEIGHT; y += 28) {
    for (let x = 18; x < WIDTH; x += 28) {
      if (((x / 28) + (y / 28)) % 3 < 1) circle(x, y, 1, [222, 214, 197, 255]);
    }
  }

  // Left-side editorial blocks. The actual Korean title is supplied through OG metadata.
  rect(68, 70, 118, 118, [221, 85, 48, 255]);
  circle(68, 94, 24, [221, 85, 48, 255]);
  rect(118, 88, 152, 100, [221, 85, 48, 255]);

  rect(72, 190, 535, 238, [30, 81, 58, 255]);
  rect(72, 258, 472, 314, [224, 87, 49, 255]);
  rect(72, 358, 600, 372, [126, 113, 93, 255]);
  rect(72, 394, 540, 408, [126, 113, 93, 255]);

  // Three feature cards from the page's hero facts.
  const cards = [72, 282, 492];
  for (const x of cards) {
    rect(x, 505, x + 188, 583, [255, 255, 255, 255]);
    rect(x + 18, 526, x + 125, 537, [37, 91, 67, 255]);
    rect(x + 18, 554, x + 155, 563, [145, 132, 111, 255]);
  }

  // Hero sun and plate.
  circle(920, 265, 184, [244, 194, 75, 255]);
  ellipse(940, 515, 215, 42, [220, 211, 194, 255]);
  circle(940, 355, 205, [252, 250, 244, 255]);
  circle(940, 355, 155, [233, 228, 213, 255]);
  circle(940, 355, 103, [34, 91, 65, 255]);

  // Tomato.
  circle(795, 275, 39, [223, 70, 47, 255]);
  line(795, 242, 785, 257, 7, [46, 115, 67, 255]);
  line(795, 242, 807, 258, 7, [46, 115, 67, 255]);

  // Egg.
  ellipse(1065, 278, 50, 42, [255, 253, 237, 255]);
  circle(1065, 279, 18, [242, 184, 51, 255]);

  // Leafy greens.
  line(885, 396, 820, 438, 8, [45, 116, 67, 255]);
  line(892, 406, 842, 465, 7, [45, 116, 67, 255]);
  ellipse(830, 425, 29, 13, [76, 151, 83, 255]);
  ellipse(850, 449, 32, 14, [76, 151, 83, 255]);
  ellipse(874, 420, 30, 13, [76, 151, 83, 255]);

  // Mushrooms.
  ellipse(805, 475, 38, 21, [198, 160, 118, 255]);
  rect(797, 475, 813, 523, [235, 219, 194, 255]);
  ellipse(850, 487, 34, 18, [198, 160, 118, 255]);
  rect(843, 487, 857, 527, [235, 219, 194, 255]);

  // Carrot and leaves.
  line(1082, 414, 1049, 382, 8, [46, 118, 67, 255]);
  line(1087, 414, 1078, 370, 7, [46, 118, 67, 255]);
  for (let y = 414; y < 497; y += 1) {
    const t = (y - 414) / 83;
    const half = Math.round(37 * (1 - t));
    rect(1085 - half, y, 1085 + half, y + 1, [235, 123, 41, 255]);
  }

  // Floating notes, represented visually like the page chips.
  rect(785, 105, 1015, 162, [255, 255, 255, 255]);
  rect(825, 126, 970, 137, [42, 94, 70, 255]);
  rect(935, 518, 1150, 576, [255, 255, 255, 255]);
  rect(970, 539, 1118, 550, [42, 94, 70, 255]);

  const raw = Buffer.alloc((WIDTH * 4 + 1) * HEIGHT);
  for (let y = 0; y < HEIGHT; y += 1) {
    const rowStart = y * (WIDTH * 4 + 1);
    raw[rowStart] = 0;
    const pixelStart = y * WIDTH * 4;
    Buffer.from(pixels.buffer, pixelStart, WIDTH * 4).copy(raw, rowStart + 1);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(WIDTH, 0);
  ihdr.writeUInt32BE(HEIGHT, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND')
  ]);
}

let cachedImage;

export default {
  fetch(request) {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });
    }

    cachedImage ||= makeImage();
    return new Response(request.method === 'HEAD' ? null : cachedImage, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Length': String(cachedImage.length),
        'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000',
        'X-Content-Type-Options': 'nosniff'
      }
    });
  }
};
