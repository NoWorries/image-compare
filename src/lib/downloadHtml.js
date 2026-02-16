import JSZip from 'jszip';
import { effectiveBackgroundColor } from './constants';

/**
 * Generates a standalone HTML file that embeds the comparison and images
 * so it can be opened in a browser without the app.
 */
function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Parse data URL; returns { mime, base64 } or null. */
function parseDataUrl(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  const i = dataUrl.indexOf(',');
  if (i === -1) return null;
  const prefix = dataUrl.slice(0, i);
  const base64 = dataUrl.slice(i + 1);
  const mimeMatch = prefix.match(/^data:([^;]+)/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/png';
  return { mime, base64 };
}

/** File extension from MIME type. */
function extensionFromMime(mime) {
  const map = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/svg+xml': 'svg',
    'image/bmp': 'bmp',
    'image/avif': 'avif',
  };
  return map[mime] || 'png';
}

/** Escape for use in HTML attribute value (e.g. src="..."). */
function safeAttr(s) {
  if (s == null) return '';
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

export function getStandaloneHtmlForRecord(record) {
  const beforeSrc = safeAttr(record.imageBefore || '');
  const afterSrc = safeAttr(record.imageAfter || '');
  return buildStandaloneHtml(record, beforeSrc, afterSrc);
}

/**
 * Generates standalone HTML that references image files by path (for use inside a ZIP).
 * Includes a presentation-style top bar (colour, icons, size options) and scrollable main area.
 */
function getStandaloneHtmlForRecordWithFiles(record, beforeFilename, afterFilename) {
  return buildStandaloneHtml(record, escapeHtml(beforeFilename), escapeHtml(afterFilename));
}

function buildStandaloneHtml(record, beforeSrc, afterSrc) {
  const name = escapeHtml(record.name || 'Comparison');
  const initialSizeMode = record.swipeWidth || 'images';
  const initialCustomPx = record.customWidthPx || 800;
  const initialViewMode = record.viewMode || 'swipe';
  const initialStackedOpacity = record.stackedOpacity ?? 100;
  const initialBg = effectiveBackgroundColor(record?.backgroundColor);
  const defaultBgHex = '#0d1117';

  const css = `
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; min-height: 100vh; overflow-x: hidden; overflow-y: auto; font-family: system-ui, sans-serif; color: #e6edf3; display: flex; flex-direction: column; }
.presentation-bar { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 12px; background: #161b22; border-bottom: 1px solid #30363d; flex-shrink: 0; }
.presentation-bar__title { font-size: 1rem; font-weight: 600; margin: 0; color: #e6edf3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.presentation-bar__right { display: flex; align-items: center; gap: 8px; }
.presentation-bar__more { position: relative; }
.presentation-bar__btn--icon { display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; border: none; border-radius: 6px; background: transparent; color: #8b949e; cursor: pointer; }
.presentation-bar__btn--icon:hover { color: #c9d1d9; background: rgba(255,255,255,0.06); }
.presentation-bar__btn--icon.presentation-bar__btn--labeled { width: auto; padding: 0 10px; gap: 6px; }
.presentation-bar__btn--icon .presentation-bar__btn-label { font-size: 13px; font-weight: 500; }
.presentation-bar__settings-btn { display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; border: none; border-radius: 6px; background: transparent; color: #8b949e; cursor: pointer; }
.presentation-bar__settings-btn:hover { color: #c9d1d9; background: rgba(255,255,255,0.06); }
.presentation-bar__backdrop { position: fixed; inset: 0; z-index: 10; display: none; }
.presentation-bar__backdrop.is-open { display: block; }
.presentation-bar__dropdown { display: none; position: absolute; top: 100%; right: 0; margin-top: 4px; min-width: 220px; max-height: 80vh; overflow-y: auto; padding: 12px; background: #21262d; border: 1px solid #30363d; border-radius: 8px; box-shadow: 0 8px 24px rgba(0,0,0,0.4); z-index: 20; }
.presentation-bar__dropdown.is-open { display: block; }
.presentation-bar__dropdown-title { font-size: 11px; font-weight: 600; color: #8b949e; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 8px; }
.presentation-bar__dropdown-title--spaced { margin-top: 16px; padding-top: 12px; border-top: 1px solid #30363d; }
.presentation-bar__dropdown-option { display: flex; align-items: center; padding: 8px 10px; border-radius: 6px; cursor: pointer; font-size: 13px; color: #c9d1d9; }
.presentation-bar__dropdown-option:hover { background: rgba(255,255,255,0.06); color: #e6edf3; }
.presentation-bar__dropdown-option input { margin: 0 8px 0 0; }
.presentation-bar__opacity-row { display: flex; align-items: center; gap: 8px; margin-top: 8px; }
.presentation-bar__opacity-row input[type="range"] { flex: 1; min-width: 80px; }
.presentation-bar__custom-width { display: flex; align-items: center; gap: 8px; margin-top: 8px; }
.presentation-bar__custom-width input { width: 80px; padding: 6px 10px; font-size: 13px; background: #0d1117; border: 1px solid #30363d; border-radius: 6px; color: #e6edf3; }
.presentation-bar__color-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.presentation-bar__color-chip { width: 36px; height: 36px; border-radius: 6px; border: 2px solid transparent; cursor: pointer; padding: 0; }
.presentation-bar__color-chip:hover { border-color: #8b949e; }
.presentation-bar__hex-wrap { margin-top: 8px; }
.presentation-bar__hex-input { width: 100%; padding: 6px 10px; font-size: 13px; background: #0d1117; border: 1px solid #30363d; border-radius: 6px; color: #e6edf3; }
.view-main { flex: 1; min-height: 0; overflow: auto; display: flex; justify-content: center; align-items: flex-start; padding: 16px; }
.view-main:fullscreen, .view-main:-webkit-full-screen { padding: 0; }
.wrap { display: flex; justify-content: center; align-items: flex-start; }
.comp { position: relative; overflow: hidden; user-select: none; touch-action: none; }
.comp--hidden { display: none !important; }
.comp__base, .comp__overlay { position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; align-items: flex-start; justify-content: flex-start; }
.comp__base { z-index: 0; }
.comp__overlay { z-index: 1; pointer-events: none; }
.comp__img { display: block; flex-shrink: 0; object-fit: fill; }
.diff-canvas { position: absolute; top: 0; left: 0; z-index: 1; pointer-events: none; }
.diff-canvas--hidden { display: none; }
.handle { position: absolute; top: 0; left: 0; width: 48px; height: 100%; margin-left: -24px; z-index: 2; display: flex; align-items: center; justify-content: center; cursor: grab; pointer-events: none; }
.handle > * { pointer-events: auto; }
.handle:active { cursor: grabbing; }
.handle--hidden { display: none !important; }
.handle-line { position: absolute; left: 50%; top: 0; bottom: 0; width: 2px; margin-left: -1px; background: #fff; box-shadow: 0 0 0 1px rgba(0,0,0,0.3); z-index: 0; }
.handle-grip { position: relative; z-index: 1; width: 40px; height: 40px; border-radius: 50%; background: #fff; color: #24292f; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.25); }
.comp-sidebyside { display: none; flex: 1; width: 100%; max-width: 100%; flex-direction: row; align-items: flex-start; justify-content: center; gap: 0; }
.comp-sidebyside.is-open { display: flex; }
.comp-sidebyside__col { display: flex; flex-direction: column; align-items: center; flex: 1; min-width: 0; }
.comp-sidebyside__col--actual { flex: 0 0 auto; }
.comp-sidebyside .comp__img { max-width: 100%; max-height: 100%; object-fit: contain; }
`;

  const js = `
(function(){
  var base = document.getElementById('base');
  var overlay = document.getElementById('overlay');
  var handle = document.getElementById('handle');
  var diffCanvas = document.getElementById('diff-canvas');
  var container = document.querySelector('.comp');
  var sideBySideWrap = document.getElementById('comp-sidebyside');
  var viewMain = document.querySelector('.view-main');
  var wrap = document.querySelector('.wrap');
  var imgB = document.getElementById('img-before');
  var imgA = document.getElementById('img-after');
  var imgBSide = document.getElementById('img-before-side');
  var imgASide = document.getElementById('img-after-side');
  var position = 50;
  var isDrag = false;
  var startX = 0, startPos = 50;
  var widthMode = '${initialSizeMode}';
  var customPx = ${initialCustomPx};
  var viewMode = '${initialViewMode}';
  var stackedOpacity = ${initialStackedOpacity};
  var containerW = 0;

  function drawDiffOverlay(imgBefore, imgAfter, w, h, outCanvas) {
    try {
      var cA = document.createElement('canvas'); cA.width = w; cA.height = h;
      var cB = document.createElement('canvas'); cB.width = w; cB.height = h;
      var ctxA = cA.getContext('2d'); var ctxB = cB.getContext('2d');
      if (!ctxA || !ctxB) return;
      ctxA.drawImage(imgBefore, 0, 0, w, h); ctxB.drawImage(imgAfter, 0, 0, w, h);
      var dA = ctxA.getImageData(0, 0, w, h); var dB = ctxB.getImageData(0, 0, w, h);
      var outCtx = outCanvas.getContext('2d'); if (!outCtx) return;
      outCanvas.width = w; outCanvas.height = h;
      var out = outCtx.createImageData(w, h);
      var th = 30, hr = 255, hg = 0, hb = 255, ha = 200;
      for (var i = 0; i < dA.data.length; i += 4) {
        var dr = Math.abs(dA.data[i] - dB.data[i]); var dg = Math.abs(dA.data[i+1] - dB.data[i+1]); var db = Math.abs(dA.data[i+2] - dB.data[i+2]);
        if (dr > th || dg > th || db > th) { out.data[i] = hr; out.data[i+1] = hg; out.data[i+2] = hb; out.data[i+3] = ha; }
        else { out.data[i] = dA.data[i]; out.data[i+1] = dA.data[i+1]; out.data[i+2] = dA.data[i+2]; out.data[i+3] = 0; }
      }
      outCtx.putImageData(out, 0, 0);
    } catch (e) {}
  }

  function updateViewVisibility() {
    var isSide = viewMode === 'side-by-side';
    if (container) container.classList.toggle('comp--hidden', isSide);
    if (sideBySideWrap) sideBySideWrap.classList.toggle('is-open', isSide);
    var showHandle = viewMode === 'swipe' || viewMode === 'differences' || viewMode === 'stacked';
    if (handle) handle.classList.toggle('handle--hidden', !showHandle);
    if (diffCanvas) diffCanvas.classList.toggle('diff-canvas--hidden', viewMode !== 'differences');
  }

  function applyViewMode() {
    if (viewMode === 'stacked') {
      overlay.style.opacity = (stackedOpacity / 100).toString();
      base.style.clipPath = 'none';
    } else {
      overlay.style.opacity = '1';
    }
    updateViewVisibility();
    updateSize();
  }

  function updateSize(){
    if (!imgB || !imgA) return;
    if (!imgB.naturalWidth || !imgA.naturalWidth) return;
    var w1 = imgB.naturalWidth, h1 = imgB.naturalHeight, w2 = imgA.naturalWidth, h2 = imgA.naturalHeight;
    var baseW = Math.max(w1, w2), baseH = Math.max(h1, h2);
    var isSide = viewMode === 'side-by-side';

    if (isSide && sideBySideWrap) {
      var vw = viewMain ? viewMain.clientWidth : document.documentElement.clientWidth;
      if (widthMode === 'full') {
        var half = vw / 2;
        var s1 = half / w1, s2 = half / w2;
        var cw = vw, ch = Math.max(h1 * s1, h2 * s2);
        sideBySideWrap.style.width = cw + 'px'; sideBySideWrap.style.height = ch + 'px';
        if (imgBSide) { imgBSide.style.width = half + 'px'; imgBSide.style.height = (h1 * s1) + 'px'; }
        if (imgASide) { imgASide.style.width = half + 'px'; imgASide.style.height = (h2 * s2) + 'px'; }
        var colBefore = document.getElementById('side-col-before'); var colAfter = document.getElementById('side-col-after');
        if (colBefore) colBefore.classList.remove('comp-sidebyside__col--actual');
        if (colAfter) colAfter.classList.remove('comp-sidebyside__col--actual');
      } else {
        sideBySideWrap.style.width = (w1 + w2) + 'px'; sideBySideWrap.style.height = Math.max(h1, h2) + 'px';
        if (imgBSide) { imgBSide.style.width = w1 + 'px'; imgBSide.style.height = h1 + 'px'; }
        if (imgASide) { imgASide.style.width = w2 + 'px'; imgASide.style.height = h2 + 'px'; }
        var colBefore = document.getElementById('side-col-before'); var colAfter = document.getElementById('side-col-after');
        if (colBefore) colBefore.classList.add('comp-sidebyside__col--actual');
        if (colAfter) colAfter.classList.add('comp-sidebyside__col--actual');
      }
      return;
    }

    var displayW = widthMode === 'full' ? (viewMain || wrap || document.documentElement).clientWidth : (widthMode === 'custom' ? customPx : baseW);
    var scale = displayW / baseW;
    var cw = Math.round(displayW), ch = Math.round(baseH * scale);
    containerW = cw;
    container.style.width = cw + 'px'; container.style.height = ch + 'px';
    imgB.style.width = Math.round(w1*scale) + 'px'; imgB.style.height = Math.round(h1*scale) + 'px';
    imgA.style.width = Math.round(w2*scale) + 'px'; imgA.style.height = Math.round(h2*scale) + 'px';
    if (diffCanvas) { diffCanvas.width = cw; diffCanvas.height = ch; diffCanvas.style.width = cw + 'px'; diffCanvas.style.height = ch + 'px'; drawDiffOverlay(imgB, imgA, cw, ch, diffCanvas); }
    setPos(position);
  }

  function setPos(p){
    position = Math.max(0, Math.min(100, p));
    var cw = container.offsetWidth || containerW;
    var posPct = Math.round(position * 100) / 100;
    if (viewMode === 'stacked') {
      base.style.clipPath = 'none';
      overlay.style.clipPath = 'inset(0 ' + (100 - posPct) + '% 0 0)';
      overlay.style.opacity = (stackedOpacity / 100).toString();
    } else {
      base.style.clipPath = 'inset(0 0 0 ' + posPct + '%)';
      overlay.style.clipPath = 'inset(0 ' + (100 - posPct) + '% 0 0)';
      overlay.style.opacity = '1';
    }
    if (diffCanvas && viewMode === 'differences') {
      diffCanvas.style.clipPath = 'inset(0 ' + (100 - posPct) + '% 0 0)';
    }
    if (cw > 0 && handle) {
      var centerPx = (position / 100) * cw;
      handle.style.left = '0';
      handle.style.transform = 'translateX(' + (centerPx - 24) + 'px)';
    } else if (handle) {
      handle.style.left = position + '%';
      handle.style.transform = '';
    }
  }

  imgB.onload = imgA.onload = function() { updateSize(); if (viewMode === 'differences' && diffCanvas && containerW) drawDiffOverlay(imgB, imgA, containerW, container.offsetHeight, diffCanvas); };
  if (imgB.complete && imgA.complete) updateSize();
  if (viewMain) { var ro = new ResizeObserver(function() { if (widthMode === 'full') updateSize(); }); ro.observe(viewMain); }
  if (handle) {
    handle.onmousedown = function(e){ e.preventDefault(); isDrag = true; startX = e.clientX; startPos = position; };
  }
  document.addEventListener('mousemove', function(e){ if(!isDrag) return; var r = container.getBoundingClientRect(); if(r.width) { var dx = (e.clientX - startX) / r.width * 100; setPos(startPos + dx); } });
  document.addEventListener('mouseup', function(){ isDrag = false; });
  if (handle) {
    handle.addEventListener('touchstart', function(e){ e.preventDefault(); isDrag = true; startX = e.touches[0].clientX; startPos = position; }, { passive: false });
  }
  document.addEventListener('touchmove', function(e){ if(!isDrag) return; var r = container.getBoundingClientRect(); if(r.width) { var dx = (e.touches[0].clientX - startX) / r.width * 100; setPos(startPos + dx); } }, { passive: false });
  document.addEventListener('touchend', function(){ isDrag = false; });
  setPos(50);
  updateViewVisibility();
  updateSize();

  var dropdown = document.getElementById('standalone-dropdown');
  var moreBtn = document.getElementById('standalone-more');
  var backdrop = document.getElementById('standalone-backdrop');
  var sizeActual = document.getElementById('standalone-size-actual');
  var sizeFull = document.getElementById('standalone-size-full');
  var sizeCustom = document.getElementById('standalone-size-custom');
  var sizeSection = document.getElementById('standalone-size-section');
  var sizeCustomRow = document.getElementById('standalone-size-custom-row');
  var customPxInput = document.getElementById('standalone-custom-px');
  var viewSwipe = document.getElementById('view-swipe');
  var viewDiff = document.getElementById('view-differences');
  var viewStacked = document.getElementById('view-stacked');
  var viewSide = document.getElementById('view-sidebyside');
  var opacityRow = document.getElementById('standalone-opacity-row');
  var opacityInput = document.getElementById('standalone-opacity');
  var opacityValue = document.getElementById('standalone-opacity-value');
  var fullscreenBtn = document.getElementById('standalone-fullscreen');
  var fullscreenLabel = document.getElementById('standalone-fullscreen-label');
  var bgDefault = document.getElementById('standalone-bg-default');
  var bgBlack = document.getElementById('standalone-bg-black');
  var bgWhite = document.getElementById('standalone-bg-white');
  var bgPicker = document.getElementById('standalone-bg-picker');
  var hexInput = document.getElementById('standalone-hex');

  function applyBackground(hex) {
    if (viewMain) viewMain.style.background = hex || '${defaultBgHex}';
  }
  function closeDropdown() { if (dropdown) dropdown.classList.remove('is-open'); if (backdrop) backdrop.classList.remove('is-open'); }
  function openDropdown() { if (dropdown) dropdown.classList.add('is-open'); if (backdrop) backdrop.classList.add('is-open'); }
  if (moreBtn) moreBtn.addEventListener('click', function(e) { e.stopPropagation(); dropdown && dropdown.classList.contains('is-open') ? closeDropdown() : openDropdown(); });
  if (backdrop) backdrop.addEventListener('click', closeDropdown);

  function updateSizeSectionVisibility() {
    var isSide = viewMode === 'side-by-side';
    if (sizeSection) sizeSection.style.display = 'block';
    if (sizeCustomRow) sizeCustomRow.style.display = (!isSide && widthMode === 'custom') ? 'flex' : 'none';
    if (sizeCustom && sizeCustom.parentElement) sizeCustom.parentElement.style.display = isSide ? 'none' : 'block';
  }

  function onViewModeChange() {
    if (viewSwipe && viewSwipe.checked) viewMode = 'swipe';
    else if (viewDiff && viewDiff.checked) viewMode = 'differences';
    else if (viewStacked && viewStacked.checked) viewMode = 'stacked';
    else if (viewSide && viewSide.checked) viewMode = 'side-by-side';
    if (viewMode === 'side-by-side') widthMode = 'full';
    updateSizeSectionVisibility();
    applyViewMode();
    if (opacityRow) opacityRow.style.display = viewMode === 'stacked' ? 'flex' : 'none';
  }
  if (viewSwipe) viewSwipe.addEventListener('change', onViewModeChange);
  if (viewDiff) viewDiff.addEventListener('change', onViewModeChange);
  if (viewStacked) viewStacked.addEventListener('change', onViewModeChange);
  if (viewSide) viewSide.addEventListener('change', onViewModeChange);

  if (opacityInput) opacityInput.addEventListener('input', function() { stackedOpacity = parseInt(opacityInput.value, 10) || 100; if (opacityValue) opacityValue.textContent = stackedOpacity + '%'; setPos(position); });
  if (opacityRow) opacityRow.style.display = viewMode === 'stacked' ? 'flex' : 'none';
  if (opacityValue) opacityValue.textContent = stackedOpacity + '%';

  function onSizeChange() {
    if (sizeActual && sizeActual.checked) widthMode = 'images';
    else if (sizeFull && sizeFull.checked) widthMode = 'full';
    else if (sizeCustom && sizeCustom.checked) widthMode = 'custom';
    if (customPxInput) customPx = parseInt(customPxInput.value, 10) || 800;
    if (sizeCustomRow) sizeCustomRow.style.display = (widthMode === 'custom' && viewMode !== 'side-by-side') ? 'flex' : 'none';
    updateSize();
  }
  if (sizeActual) sizeActual.addEventListener('change', onSizeChange);
  if (sizeFull) sizeFull.addEventListener('change', onSizeChange);
  if (sizeCustom) sizeCustom.addEventListener('change', onSizeChange);
  if (customPxInput) customPxInput.addEventListener('input', function() { customPx = parseInt(customPxInput.value, 10) || 800; if (widthMode === 'custom') updateSize(); });
  if (customPxInput) customPxInput.addEventListener('change', onSizeChange);

  function isFullscreen() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement);
  }
  function requestFs(el) {
    var fn = el.requestFullscreen || el.webkitRequestFullscreen || el.webkitRequestFullScreen || el.msRequestFullscreen;
    if (typeof fn === 'function') fn.call(el);
  }
  function exitFs() {
    var d = document;
    var fn = d.exitFullscreen || d.webkitExitFullscreen || d.webkitCancelFullScreen || d.msExitFullscreen;
    if (typeof fn === 'function') fn.call(d);
  }
  function updateFullscreenLabel() {
    if (fullscreenLabel) fullscreenLabel.textContent = isFullscreen() ? 'Exit fullscreen' : 'Fullscreen';
  }
  if (fullscreenBtn) fullscreenBtn.addEventListener('click', function() {
    if (isFullscreen()) exitFs();
    else if (viewMain) requestFs(viewMain);
    updateFullscreenLabel();
  });
  document.addEventListener('fullscreenchange', updateFullscreenLabel);
  document.addEventListener('webkitfullscreenchange', updateFullscreenLabel);

  function onBgChange(hex) {
    applyBackground(hex);
    if (hexInput) hexInput.value = hex || '';
  }
  if (bgDefault) bgDefault.addEventListener('click', function() { onBgChange('${defaultBgHex}'); });
  if (bgBlack) bgBlack.addEventListener('click', function() { onBgChange('#000000'); });
  if (bgWhite) bgWhite.addEventListener('click', function() { onBgChange('#ffffff'); });
  if (bgPicker) bgPicker.addEventListener('input', function() { onBgChange(bgPicker.value ? '#' + bgPicker.value.replace(/^#/,'') : ''); });
  var pickerBtn = document.getElementById('standalone-bg-picker-btn');
  if (pickerBtn && bgPicker) pickerBtn.addEventListener('click', function() { bgPicker.click(); });
  if (hexInput) hexInput.addEventListener('input', function() { var v = hexInput.value.trim().replace(/^#/,''); if (/^[0-9A-Fa-f]{6}$/.test(v) || /^[0-9A-Fa-f]{3}$/.test(v)) { var hex = '#' + (v.length === 3 ? v[0]+v[0]+v[1]+v[1]+v[2]+v[2] : v); applyBackground(hex); if (bgPicker) bgPicker.value = hex.replace(/^#/,''); } });
  applyBackground('${initialBg.replace(/'/g, "\\'")}');
  if (hexInput) hexInput.value = '${initialBg.replace(/#/g, '')}';
  updateSizeSectionVisibility();
})();
`;

  const sizeActualChecked = initialSizeMode === 'images' ? ' checked' : '';
  const sizeFullChecked = initialSizeMode === 'full' ? ' checked' : '';
  const sizeCustomChecked = initialSizeMode === 'custom' ? ' checked' : '';
  const viewSwipeChecked = initialViewMode === 'swipe' ? ' checked' : '';
  const viewDiffChecked = initialViewMode === 'differences' ? ' checked' : '';
  const viewStackedChecked = initialViewMode === 'stacked' ? ' checked' : '';
  const viewSideChecked = initialViewMode === 'side-by-side' ? ' checked' : '';
  const defaultSelected = !record?.backgroundColor || record.backgroundColor === '' || record.backgroundColor.toLowerCase() === defaultBgHex.toLowerCase();
  const blackSelected = record?.backgroundColor?.toLowerCase() === '#000000';
  const whiteSelected = record?.backgroundColor?.toLowerCase() === '#ffffff';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name}</title>
  <style>${css}</style>
</head>
<body>
  <header class="presentation-bar">
    <h1 class="presentation-bar__title">${name}</h1>
    <div class="presentation-bar__right">
      <button type="button" id="standalone-fullscreen" class="presentation-bar__btn--icon presentation-bar__btn--labeled" title="Fullscreen" aria-label="Fullscreen">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
        <span id="standalone-fullscreen-label" class="presentation-bar__btn-label">Fullscreen</span>
      </button>
      <div class="presentation-bar__more">
        <button type="button" id="standalone-more" class="presentation-bar__settings-btn" title="Settings" aria-label="Settings">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </button>
        <div id="standalone-backdrop" class="presentation-bar__backdrop" aria-hidden></div>
        <div id="standalone-dropdown" class="presentation-bar__dropdown">
          <div class="presentation-bar__dropdown-title">View mode</div>
          <label class="presentation-bar__dropdown-option"><input type="radio" name="view" id="view-swipe" value="swipe"${viewSwipeChecked}/> Swipe</label>
          <label class="presentation-bar__dropdown-option"><input type="radio" name="view" id="view-differences" value="differences"${viewDiffChecked}/> Differences</label>
          <label class="presentation-bar__dropdown-option"><input type="radio" name="view" id="view-stacked" value="stacked"${viewStackedChecked}/> Stacked</label>
          <label class="presentation-bar__dropdown-option"><input type="radio" name="view" id="view-sidebyside" value="side-by-side"${viewSideChecked}/> Side by side</label>
          <div id="standalone-opacity-row" class="presentation-bar__dropdown-title presentation-bar__dropdown-title--spaced presentation-bar__opacity-row" style="display:${initialViewMode === 'stacked' ? 'flex' : 'none'}">
            <label class="presentation-bar__dropdown-title" style="margin:0">Top opacity</label>
            <input type="range" id="standalone-opacity" min="0" max="100" value="${initialStackedOpacity}" />
            <span id="standalone-opacity-value">${initialStackedOpacity}%</span>
          </div>
          <div id="standalone-size-section" class="presentation-bar__dropdown-title presentation-bar__dropdown-title--spaced">Size</div>
          <label class="presentation-bar__dropdown-option"><input type="radio" name="size" id="standalone-size-actual" value="actual"${sizeActualChecked}/> Actual size</label>
          <label class="presentation-bar__dropdown-option"><input type="radio" name="size" id="standalone-size-full" value="full"${sizeFullChecked}/> Fit to width</label>
          <label class="presentation-bar__dropdown-option"><input type="radio" name="size" id="standalone-size-custom" value="custom"${sizeCustomChecked}/> Custom</label>
          <div id="standalone-size-custom-row" class="presentation-bar__custom-width" style="display:${initialSizeMode === 'custom' ? 'flex' : 'none'}">
            <input type="number" id="standalone-custom-px" min="1" value="${initialCustomPx}" />
            <span>px</span>
          </div>
          <div class="presentation-bar__dropdown-title presentation-bar__dropdown-title--spaced">Background</div>
          <div class="presentation-bar__color-row">
            <button type="button" id="standalone-bg-default" class="presentation-bar__color-chip" title="Default" style="background:#0d1117" aria-pressed="${defaultSelected}"></button>
            <button type="button" id="standalone-bg-black" class="presentation-bar__color-chip" title="Black" style="background:#000000" aria-pressed="${blackSelected}"></button>
            <button type="button" id="standalone-bg-white" class="presentation-bar__color-chip" title="White" style="background:#ffffff" aria-pressed="${whiteSelected}"></button>
            <button type="button" id="standalone-bg-picker-btn" class="presentation-bar__color-chip" style="background:#21262d;color:#8b949e" title="Pick colour">
              <input type="color" id="standalone-bg-picker" style="position:absolute;width:0;height:0;opacity:0" value="${initialBg.replace(/^#/, '')}" />
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>
            </button>
          </div>
          <div class="presentation-bar__hex-wrap">
            <input type="text" id="standalone-hex" class="presentation-bar__hex-input" placeholder="#0d1117" value="${initialBg.replace(/^#/, '')}" />
          </div>
        </div>
      </div>
    </div>
  </header>
  <main class="view-main" style="background:${initialBg}">
    <div class="wrap">
      <div class="comp" id="comp-swipe">
        <div class="comp__base" id="base">
          <img id="img-after" src="${afterSrc}" alt="After" class="comp__img" />
        </div>
        <div class="comp__overlay" id="overlay">
          <img id="img-before" src="${beforeSrc}" alt="Before" class="comp__img" />
        </div>
        <canvas id="diff-canvas" class="diff-canvas diff-canvas--hidden" aria-hidden></canvas>
        <div class="handle" id="handle" role="slider" aria-label="Compare before and after">
          <div class="handle-line"></div>
          <div class="handle-grip">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 6h.01M8 12h.01M8 18h.01M16 6h.01M16 12h.01M16 18h.01" stroke-linecap="round"/></svg>
          </div>
        </div>
      </div>
    </div>
    <div id="comp-sidebyside" class="comp-sidebyside">
      <div id="side-col-before" class="comp-sidebyside__col">
        <img id="img-before-side" src="${beforeSrc}" alt="Before" class="comp__img" />
      </div>
      <div id="side-col-after" class="comp-sidebyside__col">
        <img id="img-after-side" src="${afterSrc}" alt="After" class="comp__img" />
      </div>
    </div>
  </main>
  <script>${js}<\/script>
</body>
</html>`;
}

/**
 * Downloads the comparison as a ZIP containing index.html and the before/after image files.
 * Opening index.html in a browser (from the extracted folder) provides full swipe functionality.
 */
export async function downloadStandaloneRecordAsZip(record, filename) {
  const beforeData = record.imageBefore || '';
  const afterData = record.imageAfter || '';
  const beforeParsed = parseDataUrl(beforeData);
  const afterParsed = parseDataUrl(afterData);
  if (!beforeParsed || !afterParsed) {
    throw new Error('Invalid image data');
  }

  const beforeExt = extensionFromMime(beforeParsed.mime);
  const afterExt = extensionFromMime(afterParsed.mime);
  const beforeFilename = `before.${beforeExt}`;
  const afterFilename = `after.${afterExt}`;

  const zip = new JSZip();
  zip.file('index.html', getStandaloneHtmlForRecordWithFiles(record, beforeFilename, afterFilename));
  zip.file(beforeFilename, beforeParsed.base64, { base64: true });
  zip.file(afterFilename, afterParsed.base64, { base64: true });

  const blob = await zip.generateAsync({ type: 'blob' });
  const name = (record.name || 'comparison').replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 60);
  const date = new Date(record.modifiedAt || record.createdAt).toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const zipName = (filename || `${name}_${date}.zip`).replace(/\.zip$/i, '') + '.zip';

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = zipName;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadStandaloneRecord(record, filename) {
  const html = getStandaloneHtmlForRecord(record);
  const name = (record.name || 'comparison').replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 60);
  const date = new Date(record.modifiedAt || record.createdAt).toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const fname = (filename || `${name}_${date}.html`).replace(/.html$/i, '') + '.html';
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fname;
  a.click();
  URL.revokeObjectURL(url);
}

export function getStandaloneHtmlForHistory(records) {
  const list = records
    .filter((r) => r.imageBefore && r.imageAfter)
    .map((r) => ({
      name: r.name || 'Comparison',
      before: r.imageBefore,
      after: r.imageAfter,
      swipeWidth: r.swipeWidth || 'images',
      customWidthPx: r.customWidthPx || 800,
    }));

  const css = `
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; min-height: 100%; font-family: system-ui, sans-serif; background: #1a1a1a; color: #e0e0e0; }
.page { padding: 16px; }
.nav { margin-bottom: 16px; }
.nav a { color: #58a6ff; margin-right: 12px; }
.comp-wrap { margin-bottom: 32px; }
.comp-title { font-size: 14px; margin-bottom: 8px; }
.comp { position: relative; overflow: hidden; user-select: none; touch-action: none; display: inline-block; }
.comp__base, .comp__overlay { position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; align-items: flex-start; justify-content: flex-start; }
.comp__base { z-index: 0; }
.comp__overlay { z-index: 1; pointer-events: none; }
.comp__img { display: block; flex-shrink: 0; object-fit: fill; }
.handle { position: absolute; top: 0; left: 50%; width: 48px; height: 100%; margin-left: -24px; z-index: 2; display: flex; align-items: center; justify-content: center; cursor: grab; }
.handle:active { cursor: grabbing; }
.handle-line { position: absolute; left: 50%; top: 0; bottom: 0; width: 2px; margin-left: -1px; background: #fff; box-shadow: 0 0 0 1px rgba(0,0,0,0.3); z-index: 0; }
.handle-grip { position: relative; z-index: 1; width: 40px; height: 40px; border-radius: 50%; background: #fff; color: #24292f; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.25); }
`;

  const itemsHtml = list
    .map(
      (r, i) => `
  <div class="comp-wrap" data-index="${i}">
    <div class="comp-title">${escapeHtml(r.name)}</div>
    <div class="comp" id="comp-${i}">
      <div class="comp__base" id="base-${i}"><img class="comp__img comp-after" alt="After" /></div>
      <div class="comp__overlay" id="overlay-${i}"><img class="comp__img comp-before" alt="Before" /></div>
      <div class="handle" id="handle-${i}"><div class="handle-line"></div><div class="handle-grip"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 6h.01M8 12h.01M8 18h.01M16 6h.01M16 12h.01M16 18h.01" stroke-linecap="round"/></svg></div></div>
    </div>
  </div>`
    )
    .join('');

  const js = `
var list = ${JSON.stringify(list)};
function init(){
  list.forEach(function(r, i){
    var container = document.getElementById('comp-' + i);
    var base = document.getElementById('base-' + i);
    var overlay = document.getElementById('overlay-' + i);
    var handle = document.getElementById('handle-' + i);
    var imgB = container.querySelector('.comp-before');
    var imgA = container.querySelector('.comp-after');
    imgB.src = r.before; imgA.src = r.after;
    var position = 50, isDrag = false, startX = 0, startPos = 50;
    function updateSize(){
      if(!imgB.naturalWidth || !imgA.naturalWidth) return;
      var w1=imgB.naturalWidth, h1=imgB.naturalHeight, w2=imgA.naturalWidth, h2=imgA.naturalHeight;
      var baseW = Math.max(w1,w2), baseH = Math.max(h1,h2);
      var displayW = r.swipeWidth === 'full' ? (container.parentElement ? container.parentElement.clientWidth : 800) : (r.swipeWidth === 'custom' ? (r.customWidthPx||800) : baseW);
      var scale = displayW / baseW;
      var cw = Math.round(displayW), ch = Math.round(baseH * scale);
      container.style.width = cw + 'px'; container.style.height = ch + 'px';
      imgB.style.width = Math.round(w1*scale) + 'px'; imgB.style.height = Math.round(h1*scale) + 'px';
      imgA.style.width = Math.round(w2*scale) + 'px'; imgA.style.height = Math.round(h2*scale) + 'px';
    }
    function setPos(p){ position = Math.max(0, Math.min(100, p)); base.style.clipPath = 'inset(0 0 0 ' + position + '%)'; overlay.style.clipPath = 'inset(0 ' + (100 - position) + '% 0 0)'; handle.style.left = position + '%'; }
    imgB.onload = imgA.onload = updateSize;
    if(imgB.complete && imgA.complete) updateSize();
    handle.onmousedown = function(e){ e.preventDefault(); isDrag = true; startX = e.clientX; startPos = position; };
    document.addEventListener('mousemove', function(e){ if(!isDrag) return; var dx = (e.clientX - startX) / container.getBoundingClientRect().width * 100; setPos(startPos + dx); });
    document.addEventListener('mouseup', function(){ isDrag = false; });
    handle.addEventListener('touchstart', function(e){ e.preventDefault(); isDrag = true; startX = e.touches[0].clientX; startPos = position; }, { passive: false });
    document.addEventListener('touchmove', function(e){ if(!isDrag) return; var dx = (e.touches[0].clientX - startX) / container.getBoundingClientRect().width * 100; setPos(startPos + dx); }, { passive: false });
    document.addEventListener('touchend', function(){ isDrag = false; });
    setPos(50);
  });
}
if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Image compare – History Export</title>
  <style>${css}</style>
</head>
<body>
  <div class="page">
    <div class="nav">Exported comparison history – open this file in a browser to view.</div>
    ${itemsHtml}
  </div>
  <script>${js}<\/script>
</body>
</html>`;
}

export function downloadStandaloneHistory(records) {
  const html = getStandaloneHtmlForHistory(records);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `xdl-swipe-history-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.html`;
  a.click();
  URL.revokeObjectURL(url);
}
