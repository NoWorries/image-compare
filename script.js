(function () {
  const overlay = document.getElementById('overlay');
  const handle = document.getElementById('handle');
  const handleLine = handle?.querySelector('.comparison__handle-line');
  const handleGrip = handle?.querySelector('.comparison__handle-grip');
  const container = document.querySelector('.comparison');
  const comparisonWrap = document.querySelector('.comparison-wrap');
  const imgBefore = document.getElementById('img-before');
  const imgAfter = document.getElementById('img-after');
  if (!overlay || !handle || !handleLine || !handleGrip || !container || !imgBefore || !imgAfter) return;

  const ACTUAL_WIDTH = 1811;
  const HANDLE_HALF = 24;

  let positionPercent = 100;
  let isDragging = false;
  let dragSource = null; // 'line' | 'grip' for cursor during drag
  let startX = 0;
  let startPosition = 50;
  const sizeMode = 'actual';
  let baseContainerW = 0;
  let baseContainerH = 0;
  let containerW = 0;
  let rafId = null;
  let lastPointerX = 0;
  let startRect = null;

  function updateSize() {
    if (!imgBefore.naturalWidth || !imgAfter.naturalWidth) return;
    const w1 = imgBefore.naturalWidth;
    const h1 = imgBefore.naturalHeight;
    const w2 = imgAfter.naturalWidth;
    const h2 = imgAfter.naturalHeight;
    // One scale factor: container = largest image; both images scaled by same factor (no stretching).
    baseContainerW = Math.max(w1, w2);
    baseContainerH = Math.max(h1, h2);

    let displayW;
    if (sizeMode === 'actual') {
      displayW = ACTUAL_WIDTH;
    } else {
      displayW = comparisonWrap ? comparisonWrap.clientWidth : document.documentElement.clientWidth;
    }
    const displayScale = displayW / baseContainerW;
    containerW = Math.round(displayW);
    const containerH = Math.round(baseContainerH * displayScale);
    const dw1 = Math.round(w1 * displayScale);
    const dh1 = Math.round(h1 * displayScale);
    const dw2 = Math.round(w2 * displayScale);
    const dh2 = Math.round(h2 * displayScale);

    container.style.width = containerW + 'px';
    container.style.height = containerH + 'px';
    setPosition(positionPercent);
    imgBefore.style.width = dw1 + 'px';
    imgBefore.style.height = dh1 + 'px';
    imgAfter.style.width = dw2 + 'px';
    imgAfter.style.height = dh2 + 'px';
  }

  function onImagesLoad() {
    updateSize();
  }

  function setPosition(percent) {
    positionPercent = Math.max(0, Math.min(100, percent));
    overlay.style.clipPath = `inset(0 0 0 ${positionPercent}%)`;
    if (containerW > 0) {
      handle.style.left = '0';
      handle.style.transform = `translateX(${(positionPercent / 100) * containerW - HANDLE_HALF}px)`;
    } else {
      handle.style.left = `${positionPercent}%`;
      handle.style.transform = '';
    }
    handle.setAttribute('aria-valuenow', Math.round(positionPercent));
    // Force clip-path to be applied this frame so overlay doesn't lag behind handle (avoids black gap)
    if (isDragging && containerW > 0) {
      void overlay.offsetHeight;
    }
  }

  function tick() {
    rafId = null;
    if (!isDragging || !startRect) return;
    const deltaPercent = ((lastPointerX - startX) / startRect.width) * 100;
    setPosition(startPosition + deltaPercent);
    if (isDragging) {
      rafId = requestAnimationFrame(tick);
    }
  }

  function startDrag(e, source) {
    e.preventDefault();
    isDragging = true;
    dragSource = source;
    startX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    lastPointerX = startX;
    startPosition = positionPercent;
    startRect = container.getBoundingClientRect();
    container.classList.add('is-dragging');
    overlay.classList.add('is-dragging');
    if (source === 'line') {
      container.classList.add('is-dragging-line');
      document.body.classList.add('is-dragging-line');
    }
    if (source === 'grip') {
      container.classList.add('is-dragging-grip');
      document.body.classList.add('is-dragging-grip');
    }
    rafId = requestAnimationFrame(tick);
  }

  function move(e) {
    if (!isDragging) return;
    lastPointerX = 'touches' in e ? e.touches[0].clientX : e.clientX;
  }

  function endDrag() {
    if (!isDragging) return;
    isDragging = false;
    dragSource = null;
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    if (startRect) {
      const deltaPercent = ((lastPointerX - startX) / startRect.width) * 100;
      setPosition(startPosition + deltaPercent);
      startRect = null;
    }
    container.classList.remove('is-dragging', 'is-dragging-line', 'is-dragging-grip');
    overlay.classList.remove('is-dragging');
    document.body.classList.remove('is-dragging-line', 'is-dragging-grip');
  }

  // Set container height from tallest image when both have loaded
  imgBefore.addEventListener('load', onImagesLoad);
  imgAfter.addEventListener('load', onImagesLoad);
  if (imgBefore.complete && imgAfter.complete) onImagesLoad();

  document.body.classList.add('size-actual');

  if (comparisonWrap) {
    const resizeObserver = new ResizeObserver(function () {
      if (sizeMode === 'fill') updateSize();
    });
    resizeObserver.observe(comparisonWrap);
  }
  window.addEventListener('resize', function () {
    if (sizeMode === 'fill') updateSize();
  });

  // Handle drag: line (col-resize) and grip (grab) only — not the handle container
  handleLine.addEventListener('mousedown', function (e) { startDrag(e, 'line'); });
  handleLine.addEventListener('touchstart', function (e) { startDrag(e, 'line'); }, { passive: false });
  handleGrip.addEventListener('mousedown', function (e) { startDrag(e, 'grip'); });
  handleGrip.addEventListener('touchstart', function (e) { startDrag(e, 'grip'); }, { passive: false });

  document.addEventListener('mousemove', move);
  document.addEventListener('touchmove', move, { passive: false });

  document.addEventListener('mouseup', endDrag);
  document.addEventListener('touchend', endDrag);

  setPosition(100);
})();
