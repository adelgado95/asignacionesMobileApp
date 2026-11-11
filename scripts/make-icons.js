// Generates the generic "PM" app icons into assets/images (no dependencies beyond pngjs, already in node_modules).
//   node scripts/make-icons.js
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const TEAL = [0x38, 0x7c, 0x88]; // same teal as the login screen / program palette
const WHITE = [255, 255, 255];
const OUT = path.join(__dirname, '..', 'assets', 'images');

// Letters as polygons in a 100-unit-tall box (even-odd fill).
const M = [[0, 100], [0, 0], [18, 0], [50, 52], [82, 0], [100, 0], [100, 100], [84, 100], [84, 28], [54, 76], [46, 76], [16, 28], [16, 100]];
// P = stem + rounded bowl, minus the counter. Described as shapes, not a polygon.
const inRect = (x, y, x0, y0, x1, y1) => x >= x0 && x <= x1 && y >= y0 && y <= y1;
const inCircle = (x, y, cx, cy, r) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
const inP = (x, y) => {
  const solid = inRect(x, y, 0, 0, 16, 100) || inRect(x, y, 0, 0, 50, 60) || inCircle(x, y, 50, 30, 30);
  const hole = inRect(x, y, 16, 16, 50, 44) || inCircle(x, y, 50, 30, 14);
  return solid && !hole && x <= 80;
};
const inPoly = (x, y, poly) => {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
};
const GAP = 16, P_W = 80, M_W = 100, TEXT_W = P_W + GAP + M_W; // 196 units wide
const inText = (u, v) => (u <= P_W ? inP(u, v) : u >= P_W + GAP ? inPoly(u - P_W - GAP, v, M) : false);

// size: px; textWidth: px width of "PM"; bg: 'full' | 'rounded' | 'none'
function render(file, size, textWidth, bg) {
  const png = new PNG({ width: size, height: size });
  const scale = textWidth / TEXT_W;
  const x0 = (size - textWidth) / 2, y0 = (size - 100 * scale) / 2;
  const SS = size > 100 ? 3 : 4; // supersampling for smooth edges
  const radius = size * 0.22;
  const inRounded = (x, y) => {
    const cx = Math.min(Math.max(x, radius), size - radius), cy = Math.min(Math.max(y, radius), size - radius);
    return (x - cx) ** 2 + (y - cy) ** 2 <= radius * radius;
  };
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let bgA = 0, fgA = 0;
      for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
        const x = px + (sx + 0.5) / SS, y = py + (sy + 0.5) / SS;
        if (bg === 'full' || (bg === 'rounded' && inRounded(x, y))) bgA++;
        if (inText((x - x0) / scale, (y - y0) / scale)) fgA++;
      }
      const n = SS * SS, a = bgA / n, f = fgA / n; // f: letter coverage, a: background coverage
      const alpha = f + a * (1 - f);
      const i = (py * size + px) * 4;
      for (let k = 0; k < 3; k++) {
        png.data[i + k] = alpha === 0 ? 0 : Math.round((WHITE[k] * f + TEAL[k] * a * (1 - f)) / alpha);
      }
      png.data[i + 3] = Math.round(alpha * 255);
    }
  }
  fs.writeFileSync(path.join(OUT, file), PNG.sync.write(png));
  console.log('wrote', file, `${size}x${size}`);
}

render('icon.png', 1024, 600, 'full'); // iOS / store icon: the OS rounds the corners
render('adaptive-icon.png', 1024, 500, 'none'); // Android foreground; app.json sets the teal background, text inside the safe zone
render('splash-icon.png', 1024, 560, 'rounded'); // splash: teal rounded square
render('favicon.png', 48, 30, 'rounded');
