import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ImageDropZone } from '../components/ImageDropZone';
import { createRecord, addRecord } from '../lib/storage';
import { SWIPE_WIDTH_OPTIONS, BACKGROUND_CHIPS, DEFAULT_VIEW_BACKGROUND, normalizeHex, effectiveBackgroundColor } from '../lib/constants';

export function CreatePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const prefill = location.state;
  const [name, setName] = useState('');
  const [before, setBefore] = useState(() =>
    prefill?.before ?? (prefill?.imageBefore ? { dataUrl: prefill.imageBefore } : null)
  );
  const [after, setAfter] = useState(() =>
    prefill?.after ?? (prefill?.imageAfter ? { dataUrl: prefill.imageAfter } : null)
  );
  const [swipeWidth, setSwipeWidth] = useState('images');
  const [customWidthPx, setCustomWidthPx] = useState(800);
  const [backgroundColor, setBackgroundColor] = useState(null);
  const [hexInputValue, setHexInputValue] = useState(DEFAULT_VIEW_BACKGROUND);
  useEffect(() => {
    setHexInputValue(effectiveBackgroundColor(backgroundColor));
  }, [backgroundColor]);
  const beforeZoneRef = useRef(null);
  const afterZoneRef = useRef(null);
  const colorPickerRef = useRef(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const effectiveBg = effectiveBackgroundColor(backgroundColor);
  const isChipSelected = (chip) =>
    (chip.value == null && (backgroundColor == null || backgroundColor === '')) ||
    (chip.value != null && (backgroundColor || '').toLowerCase() === (chip.hex || '').toLowerCase());

  useEffect(() => {
    const hasFiles = (e) => e.dataTransfer?.types?.includes('Files');
    const onDocDragEnter = (e) => {
      if (hasFiles(e)) setIsDraggingFile(true);
    };
    const onDocDrop = () => setIsDraggingFile(false);
    const onDocDragLeave = (e) => {
      if (!e.relatedTarget || !document.body.contains(e.relatedTarget)) setIsDraggingFile(false);
    };
    document.addEventListener('dragenter', onDocDragEnter);
    document.addEventListener('drop', onDocDrop);
    document.addEventListener('dragleave', onDocDragLeave);
    return () => {
      document.removeEventListener('dragenter', onDocDragEnter);
      document.removeEventListener('drop', onDocDrop);
      document.removeEventListener('dragleave', onDocDragLeave);
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaveError(false);
    if (!before?.dataUrl || !after?.dataUrl) return;
    const record = createRecord({
      name: name.trim() || 'Untitled comparison',
      imageBefore: before.dataUrl,
      imageAfter: after.dataUrl,
      imageBeforeWidth: before.width,
      imageBeforeHeight: before.height,
      imageAfterWidth: after.width,
      imageAfterHeight: after.height,
      swipeWidth,
      customWidthPx: swipeWidth === 'custom' ? customWidthPx : undefined,
      backgroundColor: backgroundColor ?? undefined,
    });
    const saved = await addRecord(record);
    if (saved) {
      navigate(`/view?id=${encodeURIComponent(record.id)}`, { replace: true });
    } else {
      console.error('Failed to save comparison to storage (e.g. storage full)');
      setSaveError(true);
    }
  };

  const canSubmit = before?.dataUrl && after?.dataUrl && !before?.error && !after?.error;

  return (
    <div className="page create-page">
      <header className="page-header">
        <h1>New comparison</h1>
        <p className="page-desc">Add two images to compare with a swipe. Optional: give it a name.</p>
      </header>
      {saveError && (
        <p className="form-error" role="alert">
          Could not save comparison. Browser storage may be full (try smaller images or remove old comparisons) or unavailable. Try again or use a different browser.
        </p>
      )}
      <form className="form create-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">Name (optional)</label>
          <input
            id="name"
            type="text"
            className="input"
            placeholder="e.g. Homepage before/after"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="form-row form-row--two">
          <div className="form-group">
            <div className="edit-image-header">
              <label>Before image</label>
              {before?.dataUrl && (
                <button
                  type="button"
                  className="btn btn--secondary btn--xs"
                  onClick={() => beforeZoneRef.current?.openFileDialog?.()}
                >
                  Replace before
                </button>
              )}
            </div>
            <ImageDropZone
              ref={beforeZoneRef}
              value={before}
              onChange={setBefore}
              label="Before"
              editMode={!!before?.dataUrl}
              dragOverViewport={isDraggingFile}
            />
          </div>
          <div className="form-group">
            <div className="edit-image-header">
              <label>After image</label>
              {after?.dataUrl && (
                <button
                  type="button"
                  className="btn btn--secondary btn--xs"
                  onClick={() => afterZoneRef.current?.openFileDialog?.()}
                >
                  Replace after
                </button>
              )}
            </div>
            <ImageDropZone
              ref={afterZoneRef}
              value={after}
              onChange={setAfter}
              label="After"
              editMode={!!after?.dataUrl}
              dragOverViewport={isDraggingFile}
            />
          </div>
        </div>
        <div className="form-group">
          <label>Swipe width</label>
          <div className="radio-group">
            {Object.entries(SWIPE_WIDTH_OPTIONS).map(([value, label]) => (
              <label key={value} className="radio-label">
                <input
                  type="radio"
                  name="swipeWidth"
                  value={value}
                  checked={swipeWidth === value}
                  onChange={() => setSwipeWidth(value)}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
          {swipeWidth === 'custom' && (
            <div className="form-group form-group--inline">
              <input
                type="number"
                min={1}
                step={1}
                className="input input--sm"
                value={customWidthPx}
                onChange={(e) => setCustomWidthPx(Number(e.target.value) || 800)}
              />
              <span className="input-suffix">px</span>
            </div>
          )}
        </div>
        <div className="form-group">
          <label>Background colour</label>
          <div className="presentation-bar__color-row">
            {BACKGROUND_CHIPS.map((chip) => (
              <button
                key={chip.label}
                type="button"
                className={`presentation-bar__color-chip ${isChipSelected(chip) ? 'presentation-bar__color-chip--selected' : ''}`}
                style={{ background: chip.hex }}
                onClick={() => {
                  setBackgroundColor(chip.value);
                  setHexInputValue(chip.hex);
                }}
                title={chip.label}
                aria-label={`Background ${chip.label}`}
                aria-pressed={isChipSelected(chip)}
              />
            ))}
            <button
              type="button"
              className="presentation-bar__color-chip presentation-bar__color-chip--picker"
              onClick={() => colorPickerRef.current?.click()}
              title="Pick custom colour"
              aria-label="Pick background colour"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0L12 2.69z" />
              </svg>
              <input
                ref={colorPickerRef}
                type="color"
                className="presentation-bar__color-picker-input"
                value={effectiveBg.replace(/^#/, '')}
                onChange={(e) => {
                  const hex = e.target.value;
                  setBackgroundColor(hex);
                  setHexInputValue(hex);
                }}
              />
            </button>
            <input
              type="text"
              className="input input--sm form__hex-input"
              value={hexInputValue}
              onChange={(e) => {
                const raw = e.target.value;
                setHexInputValue(raw);
                const normalized = raw.trim().replace(/^#/, '');
                if (/^[0-9A-Fa-f]{3}$/.test(normalized) || /^[0-9A-Fa-f]{6}$/.test(normalized)) {
                  const hex = '#' + (normalized.length === 3
                    ? normalized[0] + normalized[0] + normalized[1] + normalized[1] + normalized[2] + normalized[2]
                    : normalized);
                  setBackgroundColor(hex);
                }
              }}
              placeholder="#0d1117"
              aria-label="Background colour hex"
            />
          </div>
        </div>
        <div className="form-actions">
          <button type="button" className="btn btn--secondary" onClick={() => navigate('/')}>
            Cancel
          </button>
          <button type="submit" className="btn btn--primary" disabled={!canSubmit}>
            Create comparison
          </button>
        </div>
      </form>
    </div>
  );
}
