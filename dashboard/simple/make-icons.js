// Rasterize the NI leaf mark (favicon.svg) to full-bleed PNG app icons, no dependencies.
const fs = require('fs'), zlib = require('zlib'), path = require('path');
const OUT = process.argv[2];
const BG = [0x8F, 0xA0, 0x4A], FG = [0xFB, 0xF8, 0xF1];
const T = p => [32 + 1.12 * (p[0] - 32), 32 + 1.12 * (p[1] - 32)];
function cubic(p0, p1, p2, p3, n = 40) { const pts = []; for (let i = 1; i <= n; i++) { const t = i / n, u = 1 - t; pts.push([u*u*u*p0[0] + 3*u*u*t*p1[0] + 3*u*t*t*p2[0] + t*t*t*p3[0], u*u*u*p0[1] + 3*u*u*t*p1[1] + 3*u*t*t*p2[1] + t*t*t*p3[1]]); } return pts; }
// leaf: M18 46 c0-16 10-26 28-28 -1 17-11 27-26 28 (closed)
const leaf = [[18, 46], ...cubic([18, 46], [18, 30], [28, 20], [46, 18]), ...cubic([46, 18], [45, 35], [35, 45], [20, 46])].map(T);
const stemA = T([21, 44]), stemB = T([43, 22]), stemW = 2.5 * 1.12 / 2;
function inPoly(x, y, poly) { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; }
function segDist(x, y, a, b) { const dx = b[0] - a[0], dy = b[1] - a[1]; let t = ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy); t = Math.max(0, Math.min(1, t)); const px = a[0] + t * dx - x, py = a[1] + t * dy - y; return Math.sqrt(px * px + py * py); }
const CRC = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc32 = b => { let c = -1; for (const x of b) c = CRC[(c ^ x) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
function chunk(type, data) { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, crc]); }
function png(size) {
  const S = 4, k = 64 / size, raw = Buffer.alloc(size * (size * 3 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      let cov = 0;
      for (let sy = 0; sy < S; sy++) for (let sx = 0; sx < S; sx++) {
        const px = (x + (sx + .5) / S) * k, py = (y + (sy + .5) / S) * k;
        if (inPoly(px, py, leaf) && segDist(px, py, stemA, stemB) > stemW) cov++;
      }
      const a = cov / (S * S), o = y * (size * 3 + 1) + 1 + x * 3;
      for (let ch = 0; ch < 3; ch++) raw[o + ch] = Math.round(BG[ch] * (1 - a) + FG[ch] * a);
    }
  }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
for (const [s, name] of [[180, 'apple-touch-icon.png'], [192, 'icon-192.png'], [512, 'icon-512.png']]) { const b = png(s); fs.writeFileSync(path.join(OUT, name), b); console.log(name, b.length, 'bytes'); }
