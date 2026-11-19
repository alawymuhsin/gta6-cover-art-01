// Fixed scenes for screenshots: ?shot=editor shows the editor with a sample photo
// loaded; ?shot=cover shows the exported cover alone at the requested post size.
// window.__shotReady is set once the cover is painted and the fonts are in.
import { drawCover, GRADES, LAYOUTS, panelsForLayout, SIZES } from './cover.js';

function ready() {
  return new Promise((resolve) => {
    const done = () => requestAnimationFrame(() => requestAnimationFrame(() => {
      window.__shotReady = true;
      resolve();
    }));
    if (document.fonts?.ready) document.fonts.ready.then(done).catch(done);
    else done();
  });
}

export async function runShot(shot, query, api) {
  const { state, loadImage, addPhoto, redraw, titleInput, subtitleInput, sizeSelect } = api;
  const canvas = document.getElementById('cover');

  const photoName = query.get('photo') ?? 'pier';
  const caption = query.get('caption') ?? 'Sunset Heist';
  const layout = query.get('layout');
  const grade = query.get('grade');
  const sizeKey = query.get('size') ?? '1080x1080';

  if (layout && LAYOUTS[layout]) {
    state.layout = layout;
    state.panels = panelsForLayout(layout, state.panels);
    document.querySelectorAll('[data-layout]').forEach((x) =>
      x.setAttribute('aria-pressed', String(x.dataset.layout === layout)));
  }
  if (grade && GRADES[grade]) {
    state.grade = grade;
    document.querySelectorAll('[data-grade]').forEach((x) =>
      x.setAttribute('aria-pressed', String(x.dataset.grade === grade)));
  }
  state.title = caption;
  state.subtitle = query.get('subtitle') ?? state.subtitle;
  titleInput.value = state.title;
  subtitleInput.value = state.subtitle;

  let img = null;
  try {
    img = await loadImage(`samples/${photoName}.jpg`);
  } catch {
    img = null;
  }
  if (img) {
    const idx = addPhoto(img, `Sample: ${photoName[0].toUpperCase()}${photoName.slice(1)}`);
    state.panels.forEach((p) => { p.photo = idx; });
  }

  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    const [w, h] = SIZES[sizeKey] ?? SIZES['1080x1080'];
    canvas.width = w;
    canvas.height = h;
    // The cover scene draws the same cover the export writes, at the post size.
    drawCover(canvas.getContext('2d'), w, h, state);
  } else if (shot === 'editor') {
    document.body.classList.add('shot-editor');
    if (sizeSelect) sizeSelect.value = sizeKey;
    const [w, h] = SIZES[sizeKey] ?? SIZES['1080x1080'];
    canvas.width = w;
    canvas.height = h;
    redraw();
  }
  await ready();
}
