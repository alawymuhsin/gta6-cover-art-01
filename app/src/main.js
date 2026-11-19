// Vice Cover Studio — wires the editor: photos, layout and grade picks, per-panel
// crop and position, caption editing, and one-click PNG export in three post sizes.
// A `?shot=` query sets up a fixed scene for a screenshot instead (./shots.js).
import { createState, drawCover, GRADES, LAYOUTS, panelRects, panelsForLayout, SIZES } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const ctx = canvas.getContext('2d');
const titleInput = document.getElementById('title');
const subtitleInput = document.getElementById('subtitle');
const statusEl = document.getElementById('status');
const zoomInput = document.getElementById('zoom');
const panelPhotoSelect = document.getElementById('panel-photo');
const sizeSelect = document.getElementById('size');

const state = createState();
state.size = sizeSelect.value;
let selected = 0;

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${url}`));
    img.src = url;
  });
}

function redraw() {
  state.selected = selected;
  drawCover(ctx, canvas.width, canvas.height, state);
}

/** Rebuilds the layout and grade choice buttons from cover.js. */
function buildChoices() {
  const layoutBox = document.getElementById('layout-choices');
  for (const [key, def] of Object.entries(LAYOUTS)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'choice-btn';
    b.dataset.layout = key;
    b.setAttribute('aria-pressed', String(state.layout === key));
    b.innerHTML = '';
    b.append(document.createTextNode(def.label));
    const hint = document.createElement('small');
    hint.textContent = def.hint;
    b.append(hint);
    b.addEventListener('click', () => {
      state.layout = key;
      state.panels = panelsForLayout(key, state.panels);
      selected = Math.min(selected, state.panels.length - 1);
      syncPanelControls();
      layoutBox.querySelectorAll('.choice-btn').forEach((x) =>
        x.setAttribute('aria-pressed', String(x.dataset.layout === key)));
      redraw();
    });
    layoutBox.append(b);
  }
  const gradeBox = document.getElementById('grade-choices');
  for (const [key, def] of Object.entries(GRADES)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'choice-btn';
    b.dataset.grade = key;
    b.setAttribute('aria-pressed', String(state.grade === key));
    b.append(document.createTextNode(def.label));
    const hint = document.createElement('small');
    hint.textContent = def.hint;
    b.append(hint);
    b.addEventListener('click', () => {
      state.grade = key;
      gradeBox.querySelectorAll('.choice-btn').forEach((x) =>
        x.setAttribute('aria-pressed', String(x.dataset.grade === key)));
      redraw();
    });
    gradeBox.append(b);
  }
}

/** Keeps the per-panel controls (photo select, zoom) in sync with the selection. */
function syncPanelControls() {
  const panel = state.panels[selected];
  panelPhotoSelect.innerHTML = '';
  const none = document.createElement('option');
  none.value = '-1';
  none.textContent = '— empty —';
  panelPhotoSelect.append(none);
  state.photos.forEach((p, i) => {
    const opt = document.createElement('option');
    opt.value = String(i);
    opt.textContent = p.name;
    panelPhotoSelect.append(opt);
  });
  panelPhotoSelect.value = String(panel.photo);
  zoomInput.value = String(panel.zoom);
}

panelPhotoSelect.addEventListener('change', () => {
  state.panels[selected].photo = Number(panelPhotoSelect.value);
  redraw();
});

zoomInput.addEventListener('input', () => {
  state.panels[selected].zoom = Number(zoomInput.value);
  redraw();
});

document.getElementById('fill-all').addEventListener('click', () => {
  const photo = state.panels[selected].photo;
  if (photo < 0) {
    statusEl.textContent = 'Pick a photo for the selected panel first.';
    return;
  }
  state.panels.forEach((p) => { p.photo = photo; });
  statusEl.textContent = `Every panel now uses ${state.photos[photo].name}.`;
  redraw();
});

/** Adds a loaded image to the photo library and assigns it to empty panels. */
function addPhoto(img, name) {
  state.photos.push({ img, name });
  const idx = state.photos.length - 1;
  state.panels.forEach((p) => {
    if (p.photo < 0) p.photo = idx;
  });
  syncPanelControls();
  redraw();
  return idx;
}

async function addSample(kind) {
  const file = kind === 'pier' ? 'samples/pier.jpg' : 'samples/boulevard.jpg';
  const name = kind === 'pier' ? 'Sample: Pier' : 'Sample: Boulevard';
  if (state.photos.some((p) => p.name === name)) {
    statusEl.textContent = `${name} is already loaded.`;
    return;
  }
  try {
    const img = await loadImage(file);
    addPhoto(img, name);
    statusEl.textContent = `${name} loaded into the cover.`;
  } catch {
    statusEl.textContent = `Could not load ${name}.`;
  }
}

document.getElementById('sample-pier').addEventListener('click', () => addSample('pier'));
document.getElementById('sample-boulevard').addEventListener('click', () => addSample('boulevard'));

document.getElementById('photo').addEventListener('change', async (e) => {
  for (const file of e.target.files) {
    if (!file.type.startsWith('image/')) continue;
    try {
      const img = await loadImage(URL.createObjectURL(file));
      addPhoto(img, file.name);
      statusEl.textContent = `${file.name} loaded.`;
    } catch {
      statusEl.textContent = `Could not read ${file.name}.`;
    }
  }
  e.target.value = '';
});

// Drag & drop straight onto the preview.
canvas.addEventListener('dragover', (e) => e.preventDefault());
canvas.addEventListener('drop', async (e) => {
  e.preventDefault();
  for (const file of e.dataTransfer.files) {
    if (!file.type.startsWith('image/')) continue;
    try {
      const img = await loadImage(URL.createObjectURL(file));
      addPhoto(img, file.name);
      statusEl.textContent = `${file.name} loaded.`;
    } catch {
      statusEl.textContent = `Could not read ${file.name}.`;
    }
  }
});

titleInput.addEventListener('input', () => { state.title = titleInput.value; redraw(); });
subtitleInput.addEventListener('input', () => { state.subtitle = subtitleInput.value; redraw(); });

sizeSelect.addEventListener('change', () => {
  state.size = sizeSelect.value;
  const [w, h] = SIZES[state.size];
  canvas.width = w;
  canvas.height = h;
  redraw();
});

/** Hit-tests a point on the preview canvas (CSS pixels) against the panels. */
function pickPanel(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const x = ((clientX - rect.left) / rect.width) * canvas.width;
  const y = ((clientY - rect.top) / rect.height) * canvas.height;
  const rects = panelRects(state.layout, canvas.width, canvas.height);
  for (let i = rects.length - 1; i >= 0; i--) {
    const r = rects[i];
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2;
    const dx = x - cx;
    const dy = y - cy;
    const cos = Math.cos(-r.rot);
    const sin = Math.sin(-r.rot);
    const lx = dx * cos - dy * sin;
    const ly = dx * sin + dy * cos;
    if (Math.abs(lx) <= r.w / 2 && Math.abs(ly) <= r.h / 2) return i;
  }
  return -1;
}

// Click selects a panel; dragging pans its photo inside the frame.
let drag = null;
canvas.addEventListener('pointerdown', (e) => {
  const i = pickPanel(e.clientX, e.clientY);
  if (i < 0) return;
  selected = i;
  syncPanelControls();
  redraw();
  const panel = state.panels[i];
  drag = { x: e.clientX, y: e.clientY, ox: panel.ox, oy: panel.oy, rect: panelRects(state.layout, canvas.width, canvas.height)[i] };
  canvas.setPointerCapture(e.pointerId);
  canvas.classList.add('dragging');
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const panel = state.panels[selected];
  panel.ox = Math.max(-0.5, Math.min(0.5, drag.ox + ((e.clientX - drag.x) * scaleX) / drag.rect.w));
  panel.oy = Math.max(-0.5, Math.min(0.5, drag.oy + ((e.clientY - drag.y) * scaleY) / drag.rect.h));
  redraw();
});
canvas.addEventListener('pointerup', () => {
  drag = null;
  canvas.classList.remove('dragging');
});

/** Renders the cover at full export size and downloads it as a PNG. */
export function exportPng(sizeKey) {
  const [w, h] = SIZES[sizeKey];
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  drawCover(off.getContext('2d'), w, h, state);
  off.toBlob((blob) => {
    if (!blob) {
      statusEl.textContent = 'Export failed — the browser could not make the PNG.';
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-cover-${w}x${h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    statusEl.textContent = `Saved vice-cover-${w}x${h}.png`;
  }, 'image/png');
}

document.getElementById('export').addEventListener('click', () => exportPng(sizeSelect.value));
document.querySelectorAll('[data-export]').forEach((b) =>
  b.addEventListener('click', () => exportPng(b.dataset.export)));

buildChoices();
syncPanelControls();
redraw();

const params = new URLSearchParams(location.search);
const shot = params.get('shot');
if (shot) {
  runShot(shot, params, { state, loadImage, addPhoto, redraw, titleInput, subtitleInput, sizeSelect });
}
