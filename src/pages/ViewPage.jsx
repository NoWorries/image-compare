import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import html2canvas from 'html2canvas';
import { getRecordById, getIdFromSearchParams, updateRecord } from '../lib/storage';
import { normalizeHex, effectiveBackgroundColor } from '../lib/constants';
import { ComparisonViewer } from '../components/ComparisonViewer';
import { PresentationBar } from '../components/PresentationBar';

/** Request fullscreen on an element using standard or prefixed APIs. */
function requestFullscreenOn(el) {
  if (!el) return Promise.reject(new Error('No element'));
  const fn =
    el.requestFullscreen ||
    el.webkitRequestFullscreen ||
    el.webkitRequestFullScreen ||
    el.msRequestFullscreen;
  if (typeof fn === 'function') {
    return Promise.resolve(fn.call(el));
  }
  return Promise.reject(new Error('Fullscreen not supported'));
}

/** Exit fullscreen using standard or prefixed APIs. */
function exitFullscreen() {
  const d = document;
  const fn =
    d.exitFullscreen ||
    d.webkitExitFullscreen ||
    d.webkitCancelFullScreen ||
    d.msExitFullscreen;
  if (typeof fn === 'function') {
    fn.call(d);
  }
}

/** Whether any fullscreen API reports we are fullscreen. */
function isInFullscreen() {
  const d = document;
  return !!(
    d.fullscreenElement ||
    d.webkitFullscreenElement ||
    d.msFullscreenElement
  );
}

export function ViewPage() {
  const [searchParams] = useSearchParams();
  const id = searchParams.get('id') || getIdFromSearchParams(window.location.search);
  const [record, setRecord] = useState(null);
  const [sizeMode, setSizeMode] = useState('actual');
  const [customWidthPx, setCustomWidthPx] = useState(800);
  const [viewMode, setViewMode] = useState('swipe');
  const [stackedOpacity, setStackedOpacity] = useState(100);
  const [backgroundColor, setBackgroundColor] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef(null);
  const comparisonRef = useRef(null);

  const effectiveBg = effectiveBackgroundColor(backgroundColor);

  useEffect(() => {
    let cancelled = false;
    (id ? getRecordById(id) : Promise.resolve(null)).then((r) => {
      if (cancelled) return;
      setRecord(r);
      if (r) {
        setSizeMode(r.swipeWidth === 'full' ? 'full' : r.swipeWidth === 'custom' ? 'custom' : 'actual');
        setCustomWidthPx(r.customWidthPx ?? 800);
        setViewMode(r.viewMode ?? 'swipe');
        setStackedOpacity(r.stackedOpacity ?? 100);
        setBackgroundColor(r.backgroundColor ?? null);
      }
    });
    return () => { cancelled = true; };
  }, [id]);

  const handleFullscreen = useCallback(() => {
    if (!isInFullscreen()) {
      const el = containerRef.current;
      if (!el || !el.isConnected) return;
      requestFullscreenOn(el)
        .then(() => setIsFullscreen(true))
        .catch((err) => {
          console.warn('Fullscreen request failed:', err);
          setIsFullscreen(false);
        });
    } else {
      exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(isInFullscreen());
    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);
    document.addEventListener('MSFullscreenChange', onFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
      document.removeEventListener('MSFullscreenChange', onFullscreenChange);
    };
  }, []);

  const handleRename = useCallback(
    async (newName) => {
      if (!record?.id) return;
      const updated = await updateRecord(record.id, { name: newName });
      if (updated) setRecord((prev) => (prev ? { ...prev, name: updated.name } : null));
    },
    [record?.id]
  );

  const handleViewModeChange = useCallback(
    async (value) => {
      setViewMode(value);
      if (value === 'side-by-side') {
        setSizeMode('full');
        if (record?.id) {
          const updated = await updateRecord(record.id, { viewMode: value, swipeWidth: 'full' });
          if (updated) setRecord((prev) => (prev ? { ...prev, viewMode: value, swipeWidth: 'full' } : null));
          return;
        }
      }
      if (record?.id) {
        const updated = await updateRecord(record.id, { viewMode: value });
        if (updated) setRecord((prev) => (prev ? { ...prev, viewMode: updated.viewMode } : null));
      }
    },
    [record?.id]
  );

  const handleSizeModeChange = useCallback(
    async (value) => {
      setSizeMode(value);
      if (record?.id) {
        const swipeWidth = value === 'full' ? 'full' : value === 'custom' ? 'custom' : 'actual';
        const updated = await updateRecord(record.id, {
          swipeWidth,
          customWidthPx: value === 'custom' ? customWidthPx : undefined,
        });
        if (updated) setRecord((prev) => (prev ? { ...prev, swipeWidth: updated.swipeWidth, customWidthPx: updated.customWidthPx } : null));
      }
    },
    [record?.id, customWidthPx]
  );

  const handleCustomWidthPxChange = useCallback(
    async (value) => {
      setCustomWidthPx(value);
      if (record?.id) {
        const updated = await updateRecord(record.id, { customWidthPx: value });
        if (updated) setRecord((prev) => (prev ? { ...prev, customWidthPx: updated.customWidthPx } : null));
      }
    },
    [record?.id]
  );

  const handleStackedOpacityChange = useCallback(
    async (value) => {
      setStackedOpacity(value);
      if (record?.id) {
        const updated = await updateRecord(record.id, { stackedOpacity: value });
        if (updated) setRecord((prev) => (prev ? { ...prev, stackedOpacity: updated.stackedOpacity } : null));
      }
    },
    [record?.id]
  );

  const handleBackgroundColorChange = useCallback(
    async (value) => {
      const next = value === null || value === '' ? null : (normalizeHex(value) ?? value);
      setBackgroundColor(next);
      if (record?.id) {
        await updateRecord(record.id, { backgroundColor: next });
        setRecord((prev) => (prev ? { ...prev, backgroundColor: next } : null));
      }
    },
    [record?.id]
  );

  const handleExport = useCallback(async () => {
    const api = comparisonRef.current;
    if (!api) return;
    const downloadFromCanvas = (canvas) => {
      const link = document.createElement('a');
      const baseName = record?.name ? `${record.name.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-') || 'comparison'}-swipe` : 'comparison-swipe';
      const datetimeSuffix = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      link.download = `${baseName}-${datetimeSuffix}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    if (typeof api.exportToCanvas === 'function') {
      try {
        const canvas = await api.exportToCanvas({ backgroundColor: effectiveBg });
        if (canvas) {
          downloadFromCanvas(canvas);
          return;
        }
      } catch (_) {
        // Fall through to html2canvas
      }
    }
    const el = typeof api.getElement === 'function' ? api.getElement() : comparisonRef.current;
    if (!el) return;
    const handleEl = el?.querySelector?.('.comparison-viewer__handle');
    if (handleEl) {
      handleEl.style.visibility = 'hidden';
    }
    const isSideBySideActual = viewMode === 'side-by-side' && sizeMode === 'actual';
    const opts = {
      useCORS: true,
      scale: 2,
      backgroundColor: effectiveBg,
      logging: false,
    };
    if (isSideBySideActual && el.scrollWidth > 0 && el.scrollHeight > 0) {
      opts.width = el.scrollWidth;
      opts.height = el.scrollHeight;
      opts.windowWidth = el.scrollWidth;
      opts.windowHeight = el.scrollHeight;
    }
    const prevBg = el.style.background;
    el.style.background = 'transparent';
    const reinstateHandle = () => {
      if (handleEl) handleEl.style.visibility = '';
    };
    html2canvas(el, opts).then((canvas) => {
      el.style.background = prevBg;
      downloadFromCanvas(canvas);
      setTimeout(reinstateHandle, 150);
    }).catch(() => {
      el.style.background = prevBg;
      setTimeout(reinstateHandle, 150);
    });
  }, [record?.name, viewMode, sizeMode, effectiveBg]);

  if (!id) {
    return (
      <div className="page view-page view-page--none">
        <p>No comparison selected.</p>
        <Link to="/">Go to history</Link>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="page view-page view-page--none">
        <p>Comparison not found.</p>
        <Link to="/">Go to history</Link>
      </div>
    );
  }

  return (
    <div className="view-page" ref={containerRef}>
      <PresentationBar
        name={record.name}
        recordId={record.id}
        sizeMode={sizeMode}
        onSizeModeChange={handleSizeModeChange}
        customWidthPx={customWidthPx}
        onCustomWidthPxChange={handleCustomWidthPxChange}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        stackedOpacity={stackedOpacity}
        onStackedOpacityChange={handleStackedOpacityChange}
        backgroundColor={backgroundColor}
        effectiveBackgroundColor={effectiveBg}
        onBackgroundColorChange={handleBackgroundColorChange}
        onFullscreen={handleFullscreen}
        isFullscreen={isFullscreen}
        onExport={handleExport}
        onRename={handleRename}
      />
      <main className="view-page__main" style={{ background: effectiveBg }}>
        <ComparisonViewer
          ref={comparisonRef}
          imageBefore={record.imageBefore}
          imageAfter={record.imageAfter}
          sizeMode={sizeMode}
          customWidthPx={customWidthPx}
          viewMode={viewMode}
          stackedOpacity={stackedOpacity}
        />
      </main>
    </div>
  );
}
