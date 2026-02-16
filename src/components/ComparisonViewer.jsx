import { useRef, useEffect, useCallback, useState, forwardRef, useImperativeHandle } from 'react';

const ACTUAL_WIDTH = 1200;

/** Compare two images at same dimensions and draw diff highlight onto output canvas (no external library). */
function drawDiffOverlay(imgBefore, imgAfter, width, height, outputCanvas) {
  const ctxA = document.createElement('canvas').getContext('2d');
  const ctxB = document.createElement('canvas').getContext('2d');
  if (!ctxA || !ctxB) return;
  ctxA.canvas.width = width;
  ctxA.canvas.height = height;
  ctxB.canvas.width = width;
  ctxB.canvas.height = height;
  ctxA.drawImage(imgBefore, 0, 0, width, height);
  ctxB.drawImage(imgAfter, 0, 0, width, height);
  const dataA = ctxA.getImageData(0, 0, width, height);
  const dataB = ctxB.getImageData(0, 0, width, height);
  const outCtx = outputCanvas.getContext('2d');
  if (!outCtx) return;
  outputCanvas.width = width;
  outputCanvas.height = height;
  const out = outCtx.createImageData(width, height);
  const threshold = 30; // pixel difference threshold (0-255)
  const highlightR = 255;
  const highlightG = 0;
  const highlightB = 255;
  const highlightA = 200;
  for (let i = 0; i < dataA.data.length; i += 4) {
    const r = Math.abs(dataA.data[i] - dataB.data[i]);
    const g = Math.abs(dataA.data[i + 1] - dataB.data[i + 1]);
    const b = Math.abs(dataA.data[i + 2] - dataB.data[i + 2]);
    if (r > threshold || g > threshold || b > threshold) {
      out.data[i] = highlightR;
      out.data[i + 1] = highlightG;
      out.data[i + 2] = highlightB;
      out.data[i + 3] = highlightA;
    } else {
      out.data[i] = dataA.data[i];
      out.data[i + 1] = dataA.data[i + 1];
      out.data[i + 2] = dataA.data[i + 2];
      out.data[i + 3] = 0;
    }
  }
  outCtx.putImageData(out, 0, 0);
}

function setRef(ref, el) {
  if (typeof ref === 'function') ref(el);
  else if (ref) ref.current = el;
}

export const ComparisonViewer = forwardRef(function ComparisonViewer({
  imageBefore,
  imageAfter,
  sizeMode = 'actual',
  customWidthPx = 800,
  viewMode = 'swipe',
  stackedOpacity = 100,
  className = '',
}, ref) {
  const containerRef = useRef(null);
  const setContainerRef = useCallback((el) => {
    containerRef.current = el;
    setRef(ref, el);
  }, [ref]);
  const wrapRef = useRef(null);
  const overlayRef = useRef(null);
  const handleRef = useRef(null);
  const diffCanvasRef = useRef(null);
  const imgBeforeRef = useRef(null);
  const imgAfterRef = useRef(null);
  const [position, setPosition] = useState(50);
  const [sizes, setSizes] = useState({
    containerW: 0,
    containerH: 0,
    imgBeforeW: 0,
    imgBeforeH: 0,
    imgAfterW: 0,
    imgAfterH: 0,
  });
  const [wrapWidth, setWrapWidth] = useState(0);
  const isDragging = useRef(false);
  const dragSourceRef = useRef(null); // 'line' | 'grip' for cursor during drag
  const startX = useRef(0);
  const startPosition = useRef(50);

  const isSideBySide = viewMode === 'side-by-side';

  const updateSize = useCallback(() => {
    const imgB = containerRef.current?.querySelector('.comparison-viewer__img-before');
    const imgA = containerRef.current?.querySelector('.comparison-viewer__img-after');
    const wrap = wrapRef.current;
    if (!imgB || !imgA || !imgB.naturalWidth || !imgA.naturalWidth) return;

    const w1 = imgB.naturalWidth;
    const h1 = imgB.naturalHeight;
    const w2 = imgA.naturalWidth;
    const h2 = imgA.naturalHeight;
    const baseW = Math.max(w1, w2);
    const baseH = Math.max(h1, h2);

    let containerW, containerH, imgBeforeW, imgBeforeH, imgAfterW, imgAfterH;

    if (isSideBySide) {
      if (sizeMode === 'full') {
        const viewportW = wrapWidth || wrap?.clientWidth || document.documentElement.clientWidth;
        const halfW = viewportW / 2;
        const scale1 = halfW / w1;
        const scale2 = halfW / w2;
        const scaledH1 = h1 * scale1;
        const scaledH2 = h2 * scale2;
        containerW = Math.round(viewportW);
        containerH = Math.round(Math.max(scaledH1, scaledH2));
        imgBeforeW = Math.round(halfW);
        imgBeforeH = Math.round(scaledH1);
        imgAfterW = Math.round(halfW);
        imgAfterH = Math.round(scaledH2);
      } else {
        containerW = w1 + w2;
        containerH = Math.max(h1, h2);
        imgBeforeW = w1;
        imgBeforeH = h1;
        imgAfterW = w2;
        imgAfterH = h2;
      }
    } else {
      let displayW;
      if (sizeMode === 'actual') {
        displayW = ACTUAL_WIDTH;
      } else if (sizeMode === 'full' && wrap) {
        const fullWidth = wrap.parentElement?.clientWidth ?? wrap.clientWidth ?? document.documentElement.clientWidth;
        displayW = fullWidth;
      } else if (sizeMode === 'custom') {
        displayW = customWidthPx || 800;
      } else {
        displayW = baseW;
      }

      const scale = displayW / baseW;
      containerW = Math.round(displayW);
      containerH = Math.round(baseH * scale);
      imgBeforeW = Math.round(w1 * scale);
      imgBeforeH = Math.round(h1 * scale);
      imgAfterW = Math.round(w2 * scale);
      imgAfterH = Math.round(h2 * scale);
    }

    setSizes({
      containerW,
      containerH,
      imgBeforeW,
      imgBeforeH,
      imgAfterW,
      imgAfterH,
    });
  }, [sizeMode, customWidthPx, isSideBySide, wrapWidth]);

  useEffect(() => {
    updateSize();
  }, [imageBefore, imageAfter, updateSize]);

  useEffect(() => {
    if (sizeMode === 'full') {
      const raf = requestAnimationFrame(() => updateSize());
      return () => cancelAnimationFrame(raf);
    }
    updateSize();
  }, [sizeMode, customWidthPx, updateSize]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const ro = new ResizeObserver(() => {
      if (isSideBySide) setWrapWidth(wrap.clientWidth);
      if (sizeMode === 'full' || isSideBySide) updateSize();
    });
    ro.observe(wrap);
    if (isSideBySide) setWrapWidth(wrap.clientWidth);
    return () => ro.disconnect();
  }, [sizeMode, updateSize, isSideBySide]);

  const setPos = useCallback((p) => {
    const percent = Math.max(0, Math.min(100, p));
    setPosition(percent);
    if (viewMode === 'swipe' || viewMode === 'stacked' || viewMode === 'differences') {
      if (overlayRef.current) overlayRef.current.style.clipPath = `inset(0 ${100 - percent}% 0 0)`;
      if (handleRef.current) handleRef.current.style.left = `${percent}%`;
    }
  }, [viewMode]);

  const onMouseDown = useCallback((e, source) => {
    e.preventDefault();
    isDragging.current = true;
    dragSourceRef.current = source;
    startX.current = e.clientX;
    startPosition.current = position;
    if (source === 'line') document.body.classList.add('comparison-viewer-dragging-line');
    if (source === 'grip') document.body.classList.add('comparison-viewer-dragging-grip');
  }, [position]);

  const onTouchStart = useCallback((e, source) => {
    e.preventDefault();
    isDragging.current = true;
    dragSourceRef.current = source;
    startX.current = e.touches[0].clientX;
    startPosition.current = position;
    if (source === 'line') document.body.classList.add('comparison-viewer-dragging-line');
    if (source === 'grip') document.body.classList.add('comparison-viewer-dragging-grip');
  }, [position]);

  useEffect(() => {
    const onMove = (e) => {
      if (!isDragging.current) return;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const deltaPercent = ((clientX - startX.current) / rect.width) * 100;
      setPos(startPosition.current + deltaPercent);
    };
    const onEnd = () => {
      isDragging.current = false;
      dragSourceRef.current = null;
      document.body.classList.remove('comparison-viewer-dragging-line', 'comparison-viewer-dragging-grip');
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('mouseup', onEnd);
    document.addEventListener('touchend', onEnd);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('mouseup', onEnd);
      document.removeEventListener('touchend', onEnd);
    };
  }, [setPos]);

  // Differences mode: draw pixel-diff overlay when images and sizes are ready (no extra library)
  useEffect(() => {
    if (viewMode !== 'differences' || !sizes.containerW || !sizes.containerH) return;
    const imgB = imgBeforeRef.current;
    const imgA = imgAfterRef.current;
    const canvas = diffCanvasRef.current;
    if (!imgB || !imgA || !canvas || !imgB.complete || !imgA.complete) return;
    const w = sizes.containerW;
    const h = sizes.containerH;
    const maxDim = 800;
    const scale = Math.min(1, maxDim / Math.max(w, h));
    const sw = Math.max(1, Math.round(w * scale));
    const sh = Math.max(1, Math.round(h * scale));
    try {
      drawDiffOverlay(imgB, imgA, sw, sh, canvas);
    } catch (_) {
      // CORS or canvas tainted
    }
  }, [viewMode, sizes.containerW, sizes.containerH, imageBefore, imageAfter]);

  /** Export the comparison at full resolution (natural image dimensions), with masking applied. */
  const exportToCanvas = useCallback(async (options = {}) => {
    const { backgroundColor: fillColor } = options;
    const container = containerRef.current;
    const imgBefore = container?.querySelector('.comparison-viewer__img-before');
    const imgAfter = container?.querySelector('.comparison-viewer__img-after');
    if (!container || !imgBefore || !imgAfter) return null;
    const waitForImages = () => {
      if (imgBefore.complete && imgAfter.complete) return Promise.resolve();
      return new Promise((resolve) => {
        const done = () => {
          if (imgBefore.complete && imgAfter.complete) resolve();
        };
        imgBefore.addEventListener('load', done);
        imgAfter.addEventListener('load', done);
      });
    };
    await waitForImages();

    const nw1 = imgBefore.naturalWidth;
    const nh1 = imgBefore.naturalHeight;
    const nw2 = imgAfter.naturalWidth;
    const nh2 = imgAfter.naturalHeight;
    if (!nw1 || !nh1 || !nw2 || !nh2) return null;

    const drawImg = (ctx, img, sx, sy, sw, sh, dx, dy, dw, dh) => {
      ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
    };

    const fillBackground = (ctx, w, h) => {
      if (fillColor) {
        ctx.fillStyle = fillColor;
        ctx.fillRect(0, 0, w, h);
      }
    };

    if (viewMode === 'side-by-side') {
      const gap = 16;
      const W = nw1 + gap + nw2;
      const H = Math.max(nh1, nh2);
      const canvas = document.createElement('canvas');
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      fillBackground(ctx, W, H);
      drawImg(ctx, imgBefore, 0, 0, nw1, nh1, 0, 0, nw1, nh1);
      drawImg(ctx, imgAfter, 0, 0, nw2, nh2, nw1 + gap, 0, nw2, nh2);
      return canvas;
    }

    const baseW = Math.max(nw1, nw2);
    const baseH = Math.max(nh1, nh2);
    const canvas = document.createElement('canvas');
    canvas.width = baseW;
    canvas.height = baseH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    fillBackground(ctx, baseW, baseH);

    if (viewMode === 'stacked') {
      drawImg(ctx, imgAfter, 0, 0, nw2, nh2, 0, 0, nw2, nh2);
      ctx.globalAlpha = stackedOpacity / 100;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, (position / 100) * baseW, baseH);
      ctx.clip();
      drawImg(ctx, imgBefore, 0, 0, nw1, nh1, 0, 0, nw1, nh1);
      ctx.restore();
      ctx.globalAlpha = 1;
      return canvas;
    }

    if (viewMode === 'swipe' || viewMode === 'differences') {
      const posPx = (position / 100) * baseW;
      const rightPx = ((100 - position) / 100) * baseW;
      ctx.save();
      ctx.beginPath();
      ctx.rect(posPx, 0, rightPx, baseH);
      ctx.clip();
      drawImg(ctx, imgAfter, 0, 0, nw2, nh2, 0, 0, nw2, nh2);
      ctx.restore();
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, posPx, baseH);
      ctx.clip();
      drawImg(ctx, imgBefore, 0, 0, nw1, nh1, 0, 0, nw1, nh1);
      ctx.restore();
      if (viewMode === 'differences') {
        try {
          const diffCanvas = document.createElement('canvas');
          drawDiffOverlay(imgBefore, imgAfter, baseW, baseH, diffCanvas);
          ctx.save();
          ctx.beginPath();
          ctx.rect(0, 0, posPx, baseH);
          ctx.clip();
          ctx.drawImage(diffCanvas, 0, 0, baseW, baseH, 0, 0, baseW, baseH);
          ctx.restore();
        } catch (_) {
          // CORS or canvas tainted
        }
      }
      return canvas;
    }

    return null;
  }, [position, viewMode, stackedOpacity]);

  useImperativeHandle(ref, () => ({
    exportToCanvas,
    getElement: () => containerRef.current,
  }), [exportToCanvas]);

  const isSwipe = viewMode === 'swipe';
  const isStacked = viewMode === 'stacked';
  const isDifferences = viewMode === 'differences';
  const isStackedOrDiff = isStacked || isDifferences;
  const showHandle = isSwipe || isStackedOrDiff;

  if (!imageBefore || !imageAfter) {
    return (
      <div className={`comparison-viewer comparison-viewer--empty ${className}`}>
        <p>Add both images to compare.</p>
      </div>
    );
  }

  const containerStyle = {
    width: sizes.containerW ? `${sizes.containerW}px` : 'auto',
    height: sizes.containerH ? `${sizes.containerH}px` : 'auto',
  };

  // Stacked: base (after) is fully visible; overlay (before) is clipped so swipe reveals more/less of after.
  // Swipe/diff: both layers clipped for split view.
  const baseClip =
    isStacked
      ? 'none'
      : isSwipe || isDifferences
        ? `inset(0 0 0 ${position}%)`
        : 'none';
  const overlayClip = isSwipe || isStackedOrDiff ? `inset(0 ${100 - position}% 0 0)` : 'none';
  const overlayOpacity = isStackedOrDiff ? stackedOpacity / 100 : 1;

  const imgStyleBefore =
    sizes.imgBeforeW
      ? { width: `${sizes.imgBeforeW}px`, height: `${sizes.imgBeforeH}px` }
      : undefined;
  const imgStyleAfter =
    sizes.imgAfterW
      ? { width: `${sizes.imgAfterW}px`, height: `${sizes.imgAfterH}px` }
      : undefined;

  // Side-by-side: two columns spanning viewport (Fit) or actual size with scroll (Actual size). No swipe/handle.
  if (isSideBySide) {
    const columnBeforeStyle = sizeMode === 'actual' && sizes.imgBeforeW ? { width: `${sizes.imgBeforeW}px`, flex: '0 0 auto' } : undefined;
    const columnAfterStyle = sizeMode === 'actual' && sizes.imgAfterW ? { width: `${sizes.imgAfterW}px`, flex: '0 0 auto' } : undefined;
    return (
      <div ref={wrapRef} className={`comparison-viewer-wrap comparison-viewer-wrap--side-by-side ${className}`}>
        <div
          ref={setContainerRef}
          className={`comparison-viewer comparison-viewer--side-by-side ${sizeMode === 'actual' ? 'comparison-viewer--side-by-side-actual' : ''}`}
          style={containerStyle}
        >
          <div className="comparison-viewer__column comparison-viewer__column--before" style={columnBeforeStyle}>
            <img
              ref={imgBeforeRef}
              className="comparison-viewer__img comparison-viewer__img-before"
              src={imageBefore}
              alt="Before"
              onLoad={updateSize}
              crossOrigin={imageBefore?.startsWith('data:') ? undefined : 'anonymous'}
              style={{ ...imgStyleBefore, objectFit: 'contain' }}
            />
            <span className="comparison-viewer__label comparison-viewer__label--before" aria-hidden>Before</span>
          </div>
          <div className="comparison-viewer__column comparison-viewer__column--after" style={columnAfterStyle}>
            <img
              ref={imgAfterRef}
              className="comparison-viewer__img comparison-viewer__img-after"
              src={imageAfter}
              alt="After"
              onLoad={updateSize}
              crossOrigin="anonymous"
              style={{ ...imgStyleAfter, objectFit: 'contain' }}
            />
            <span className="comparison-viewer__label comparison-viewer__label--after" aria-hidden>After</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={wrapRef} className={`comparison-viewer-wrap ${className}`}>
      <div
        ref={setContainerRef}
        className={`comparison-viewer comparison-viewer--${viewMode}`}
        style={containerStyle}
      >
        <div
          className="comparison-viewer__base"
          style={{ clipPath: baseClip }}
          aria-hidden
        >
          <img
            ref={imgAfterRef}
            className="comparison-viewer__img comparison-viewer__img-after"
            src={imageAfter}
            alt="After"
            onLoad={updateSize}
            crossOrigin="anonymous"
            style={imgStyleAfter}
          />
          <span className="comparison-viewer__label comparison-viewer__label--after" aria-hidden>After</span>
        </div>
        <div
          ref={overlayRef}
          className="comparison-viewer__overlay"
          style={{
            clipPath: overlayClip,
            opacity: overlayOpacity,
          }}
          aria-hidden
        >
          <img
            ref={imgBeforeRef}
            className="comparison-viewer__img comparison-viewer__img-before"
            src={imageBefore}
            alt="Before"
            onLoad={updateSize}
            crossOrigin={imageBefore?.startsWith('data:') ? undefined : 'anonymous'}
            style={imgStyleBefore}
          />
          <span className="comparison-viewer__label comparison-viewer__label--before" aria-hidden>Before</span>
        </div>
        {isDifferences && (
          <canvas
            ref={diffCanvasRef}
            className="comparison-viewer__diff-overlay"
            style={{
              width: sizes.containerW ? `${sizes.containerW}px` : 0,
              height: sizes.containerH ? `${sizes.containerH}px` : 0,
              clipPath: `inset(0 ${100 - position}% 0 0)`,
            }}
            aria-hidden
          />
        )}
        {showHandle && (
          <div
            ref={handleRef}
            className="comparison-viewer__handle"
            style={{ left: `${position}%` }}
            role="slider"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(position)}
            aria-label="Compare before and after"
          >
            <div
              className="comparison-viewer__handle-line"
              onMouseDown={(e) => onMouseDown(e, 'line')}
              onTouchStart={(e) => onTouchStart(e, 'line')}
            />
            <div
              className="comparison-viewer__handle-grip"
              onMouseDown={(e) => onMouseDown(e, 'grip')}
              onTouchStart={(e) => onTouchStart(e, 'grip')}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M8 6h.01M8 12h.01M8 18h.01M16 6h.01M16 12h.01M16 18h.01" strokeLinecap="round" />
              </svg>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
