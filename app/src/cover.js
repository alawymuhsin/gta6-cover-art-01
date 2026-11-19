// Vice Cover Studio — the cover engine. Draws a multi-panel poster cover onto any
// 2D canvas: panel layouts, a sunset/neon colour grade, bold Anton lettering with a
// Pacifico script subtitle, film grain and a vignette. Pure canvas, no network.

export const LAYOUTS = {
  hero: { label: 'Full-bleed hero', hint: 'One big photo', panels: 1 },
  hero3: { label: 'Hero + 3 strips', hint: 'Poster classic', panels: 4 },
  grid4: { label: 'Grid of 4', hint: 'Four moments', panels: 4 },
  tilted: { label: 'Tilted snapshots', hint: 'Fanned photos', panels: 3 },
};

export const GRADES = {
  'vice-sunset': {
    label: 'Vice Sunset', hint: 'Orange → magenta',
    top: [255, 122, 61], mid: [255, 46, 136], bottom: [88, 24, 130],
    title: ['#ffe9a8', '#ff7a3d', '#ff2e88'], accent: '#ffb347', wash: [255, 80, 120],
  },
  'neon-nights': {
    label: 'Neon Nights', hint: 'Cyan → magenta',
    top: [25, 227, 255], mid: [255, 92, 225], bottom: [32, 16, 88],
    title: ['#aefcff', '#19e3ff', '#ff5ce1'], accent: '#19e3ff', wash: [40, 120, 255],
  },
  'palm-dusk': {
    label: 'Palm Dusk', hint: 'Teal → gold',
    top: [45, 190, 170], mid: [255, 179, 71], bottom: [60, 30, 90],
    title: ['#fff3c4', '#ffb347', '#ff8a5c'], accent: '#ffe9a8', wash: [255, 170, 60],
  },
  'heat-haze': {
    label: 'Heat Haze', hint: 'Hot pink punch',
    top: [255, 77, 109], mid: [255, 140, 66], bottom: [120, 10, 60],
    title: ['#fff7ae', '#ff8a5c', '#ff4d6d'], accent: '#ff5c8a', wash: [255, 60, 110],
  },
};

export const SIZES = {
  '1920x1080': [1920, 1080],
  '1080x1350': [1080, 1350],
  '1080x1080': [1080, 1080],
};

/** The default editor state: no photos yet, hero layout, Vice Sunset grade. */
export function createState() {
  return {
    layout: 'hero',
    grade: 'vice-sunset',
    size: '1080x1080',
    title: 'SUNSET HEIST',
    subtitle: 'Neon nights · endless summer',
    photos: [],
    panels: [{ photo: -1, zoom: 1, ox: 0, oy: 0 }],
    selected: 0,
  };
}

/** Rebuilds the panel list for a layout, keeping each panel's settings by index. */
export function panelsForLayout(layout, previous) {
  const count = LAYOUTS[layout].panels;
  const out = [];
  for (let i = 0; i < count; i++) {
    const old = previous[i];
    out.push(old ? { ...old } : { photo: -1, zoom: 1, ox: 0, oy: 0 });
  }
  return out;
}

/** Panel rectangles (fractions of the cover) for a layout. `rot` is radians. */
export function panelRects(layout, w, h) {
  const g = Math.round(Math.min(w, h) * 0.012); // poster gap between panels
  const full = { x: 0, y: 0, w, h, rot: 0 };
  if (layout === 'hero') return [full];
  if (layout === 'hero3') {
    const heroH = Math.round(h * 0.6);
    const stripW = Math.floor((w - 2 * g) / 3);
    return [
      { x: 0, y: 0, w, h: heroH, rot: 0 },
      { x: 0, y: heroH + g, w: stripW, h: h - heroH - g, rot: 0 },
      { x: stripW + g, y: heroH + g, w: stripW, h: h - heroH - g, rot: 0 },
      { x: 2 * (stripW + g), y: heroH + g, w: w - 2 * (stripW + g), h: h - heroH - g, rot: 0 },
    ];
  }
  if (layout === 'grid4') {
    const cw = Math.floor((w - g) / 2);
    const ch = Math.floor((h - g) / 2);
    return [
      { x: 0, y: 0, w: cw, h: ch, rot: 0 },
      { x: cw + g, y: 0, w: w - cw - g, h: ch, rot: 0 },
      { x: 0, y: ch + g, w: cw, h: h - ch - g, rot: 0 },
      { x: cw + g, y: ch + g, w: w - cw - g, h: h - ch - g, rot: 0 },
    ];
  }
  // tilted: three snapshots fanned across the cover, like photos tossed on a table.
  const pw = Math.round(w * 0.52);
  const ph = Math.round(h * 0.62);
  return [
    { x: Math.round(w * 0.04), y: Math.round(h * 0.06), w: pw, h: ph, rot: -0.09 },
    { x: Math.round(w * 0.44), y: Math.round(h * 0.02), w: pw, h: ph, rot: 0.07 },
    { x: Math.round(w * 0.24), y: Math.round(h * 0.3), w: pw, h: ph, rot: -0.02 },
  ];
}

function rgba(rgb, a) {
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${a})`;
}

/** Draws one photo into a rectangle, cover-fit, with zoom and pan offsets. */
function drawPhotoInto(ctx, img, rect, zoom, ox, oy) {
  const scale = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight) * zoom;
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const dx = rect.x + (rect.w - dw) / 2 + ox * rect.w;
  const dy = rect.y + (rect.h - dh) / 2 + oy * rect.h;
  ctx.drawImage(img, dx, dy, dw, dh);
}

/** A small tiled noise canvas, generated once, reused for the film grain. */
let noiseTile = null;
function grainTile() {
  if (noiseTile) return noiseTile;
  const size = 160;
  const tile = document.createElement('canvas');
  tile.width = size;
  tile.height = size;
  const tctx = tile.getContext('2d');
  const data = tctx.createImageData(size, size);
  for (let i = 0; i < data.data.length; i += 4) {
    const v = Math.floor(Math.random() * 256);
    data.data[i] = v;
    data.data[i + 1] = v;
    data.data[i + 2] = v;
    data.data[i + 3] = 255;
  }
  tctx.putImageData(data, 0, 0);
  noiseTile = tile;
  return tile;
}

/** Fits a font size so `text` fits within `maxWidth`, starting from `start`. */
function fitFont(ctx, text, fontFamily, start, maxWidth, weight = '') {
  let size = start;
  ctx.font = `${weight} ${size}px ${fontFamily}`;
  while (size > 10 && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = `${weight} ${size}px ${fontFamily}`;
  }
  return size;
}

/** Draws the title block: big gradient capitals, script subtitle, thin rules. */
function drawTitleBlock(ctx, w, h, state, grade) {
  const title = state.title.trim().toUpperCase();
  const subtitle = state.subtitle.trim();
  if (!title && !subtitle) return;

  // A dark band rising from the foot keeps the lettering readable on any photo.
  const band = ctx.createLinearGradient(0, h * 0.62, 0, h);
  band.addColorStop(0, 'rgba(10, 4, 20, 0)');
  band.addColorStop(0.55, 'rgba(10, 4, 20, 0.45)');
  band.addColorStop(1, 'rgba(10, 4, 20, 0.82)');
  ctx.fillStyle = band;
  ctx.fillRect(0, h * 0.62, w, h * 0.38);

  const cx = w / 2;
  let titleBaseline = h - h * 0.1;
  if (title) {
    const size = fitFont(ctx, title, '"Anton", "Arial Narrow", sans-serif', h * 0.13, w * 0.92);
    const grad = ctx.createLinearGradient(0, titleBaseline - size, 0, titleBaseline + size * 0.15);
    grad.addColorStop(0, grade.title[0]);
    grad.addColorStop(0.55, grade.title[1]);
    grad.addColorStop(1, grade.title[2]);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(16, 4, 28, 0.9)';
    ctx.lineWidth = Math.max(2, size * 0.07);
    ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
    ctx.shadowBlur = size * 0.18;
    ctx.shadowOffsetY = size * 0.03;
    ctx.strokeText(title, cx, titleBaseline);
    ctx.fillStyle = grad;
    ctx.fillText(title, cx, titleBaseline);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }
  if (subtitle) {
    const subSize = fitFont(ctx, subtitle, '"Pacifico", cursive', h * 0.045, w * 0.8);
    const subY = title ? titleBaseline + subSize * 1.15 : h - h * 0.12;
    ctx.textAlign = 'center';
    ctx.fillStyle = grade.accent;
    ctx.shadowColor = grade.accent;
    ctx.shadowBlur = subSize * 0.5;
    ctx.fillText(subtitle, cx, subY);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
  }

  // Thin neon rules flanking the title block.
  const ruleY = h - h * 0.035;
  const ruleW = w * 0.16;
  ctx.strokeStyle = rgba(grade.wash, 0.9);
  ctx.lineWidth = Math.max(2, h * 0.003);
  ctx.beginPath();
  ctx.moveTo(w * 0.06, ruleY);
  ctx.lineTo(w * 0.06 + ruleW, ruleY);
  ctx.moveTo(w * 0.94 - ruleW, ruleY);
  ctx.lineTo(w * 0.94, ruleY);
  ctx.stroke();
}

/** The full cover: panels, grade, grain, vignette, title block. */
export function drawCover(ctx, w, h, state) {
  const grade = GRADES[state.grade] ?? GRADES['vice-sunset'];
  ctx.save();
  ctx.fillStyle = '#12081f';
  ctx.fillRect(0, 0, w, h);

  const rects = panelRects(state.layout, w, h);
  rects.forEach((rect, i) => {
    const panel = state.panels[i] ?? { photo: -1, zoom: 1, ox: 0, oy: 0 };
    const entry = panel.photo >= 0 ? state.photos[panel.photo] : null;
    const img = entry && entry.img ? entry.img : null;
    ctx.save();
    const cx = rect.x + rect.w / 2;
    const cy = rect.y + rect.h / 2;
    ctx.translate(cx, cy);
    if (rect.rot) ctx.rotate(rect.rot);
    ctx.translate(-cx, -cy);
    // Soft drop shadow for tilted snapshots.
    if (rect.rot) {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = Math.max(8, w * 0.02);
      ctx.shadowOffsetY = Math.max(4, h * 0.01);
    }
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
    ctx.fillStyle = '#241534';
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.clip();
    if (img) {
      drawPhotoInto(ctx, img, rect, panel.zoom, panel.ox, panel.oy);
    } else {
      // Empty panel: a sunset gradient placeholder with a dashed frame.
      const ph = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
      ph.addColorStop(0, rgba(grade.top, 0.85));
      ph.addColorStop(0.55, rgba(grade.mid, 0.85));
      ph.addColorStop(1, rgba(grade.bottom, 0.9));
      ctx.fillStyle = ph;
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.lineWidth = Math.max(2, w * 0.002);
      ctx.setLineDash([w * 0.02, w * 0.012]);
      ctx.strokeRect(rect.x + w * 0.01, rect.y + h * 0.01, rect.w - w * 0.02, rect.h - h * 0.02);
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      const label = 'DROP A PHOTO HERE';
      const ls = fitFont(ctx, label, '"Anton", sans-serif', Math.min(rect.w, rect.h) * 0.07, rect.w * 0.8);
      ctx.textAlign = 'center';
      ctx.fillText(label, cx, cy + ls * 0.35);
    }
    // Colour grade: a warm wash plus a vertical sunset gradient, softly blended.
    ctx.globalCompositeOperation = 'soft-light';
    const wash = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
    wash.addColorStop(0, rgba(grade.top, 0.55));
    wash.addColorStop(0.5, rgba(grade.mid, 0.35));
    wash.addColorStop(1, rgba(grade.bottom, 0.6));
    ctx.fillStyle = wash;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.globalCompositeOperation = 'source-over';
    // Crisp white poster frame around each panel.
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = Math.max(2, Math.min(w, h) * 0.004);
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    ctx.restore();
  });

  // Film grain over the whole cover, then a soft vignette.
  ctx.save();
  ctx.globalAlpha = 0.07;
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = ctx.createPattern(grainTile(), 'repeat');
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
  const vig = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.75);
  vig.addColorStop(0, 'rgba(8, 2, 16, 0)');
  vig.addColorStop(1, 'rgba(8, 2, 16, 0.42)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);

  drawTitleBlock(ctx, w, h, state, grade);
  ctx.restore();
}

/** Convenience: size a canvas and draw the cover onto it. */
export function drawCoverOn(canvas, state) {
  const [w, h] = SIZES[state.size ?? '1080x1080'] ?? [1080, 1080];
  canvas.width = w;
  canvas.height = h;
  drawCover(canvas.getContext('2d'), w, h, state);
}
