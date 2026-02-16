import { useState, useCallback, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DEFAULT_VIEW_BACKGROUND, BACKGROUND_CHIPS } from '../lib/constants';

const VIEW_MODES = [
  { value: 'swipe', label: 'Swipe' },
  { value: 'differences', label: 'Differences' },
  { value: 'stacked', label: 'Stacked' },
  { value: 'side-by-side', label: 'Side by side' },
];

export function PresentationBar({
  name,
  recordId,
  sizeMode,
  onSizeModeChange,
  customWidthPx,
  onCustomWidthPxChange,
  viewMode = 'swipe',
  onViewModeChange,
  stackedOpacity = 100,
  onStackedOpacityChange,
  backgroundColor,
  effectiveBackgroundColor,
  onBackgroundColorChange,
  onFullscreen,
  isFullscreen,
  onExport,
  onRename,
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editValue, setEditValue] = useState(name || '');
  const [hexInputValue, setHexInputValue] = useState(effectiveBackgroundColor || DEFAULT_VIEW_BACKGROUND);
  const editInputRef = useRef(null);
  const colorPickerRef = useRef(null);

  useEffect(() => {
    setEditValue(name || '');
  }, [name]);

  useEffect(() => {
    setHexInputValue(effectiveBackgroundColor || DEFAULT_VIEW_BACKGROUND);
  }, [effectiveBackgroundColor]);

  useEffect(() => {
    if (isEditingTitle && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [isEditingTitle]);

  const handleRenameSubmit = useCallback(() => {
    const trimmed = editValue.trim() || 'Untitled comparison';
    if (trimmed !== (name || '')) {
      onRename?.(trimmed);
    }
    setEditValue(name || '');
    setIsEditingTitle(false);
  }, [editValue, name, onRename]);

  const handleRenameKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleRenameSubmit();
      }
      if (e.key === 'Escape') {
        setEditValue(name || '');
        setIsEditingTitle(false);
        editInputRef.current?.blur();
      }
    },
    [handleRenameSubmit, name]
  );

  const isChipSelected = (chip) =>
    (chip.value == null && (backgroundColor == null || backgroundColor === '')) ||
    (chip.value != null && (backgroundColor || '').toLowerCase() === (chip.hex || '').toLowerCase());

  const handleHexInputChange = (e) => {
    const raw = e.target.value;
    setHexInputValue(raw);
    const normalized = raw.trim().replace(/^#/, '');
    if (/^[0-9A-Fa-f]{3}$/.test(normalized) || /^[0-9A-Fa-f]{6}$/.test(normalized)) {
      const hex = '#' + normalized;
      if (normalized.length === 3) {
        const hex6 = '#' + normalized[0] + normalized[0] + normalized[1] + normalized[1] + normalized[2] + normalized[2];
        onBackgroundColorChange?.(hex6);
      } else {
        onBackgroundColorChange?.(hex);
      }
    }
  };

  const handleHexInputBlur = () => {
    setHexInputValue(effectiveBackgroundColor || DEFAULT_VIEW_BACKGROUND);
  };

  const handleColorPickerChange = (e) => {
    const hex = e.target.value;
    setHexInputValue(hex);
    onBackgroundColorChange?.(hex);
  };

  return (
    <header className="presentation-bar">
      <div className="presentation-bar__left">
        <Link
          to="/"
          className="presentation-bar__back"
          title="Back to list"
          aria-label="Back to list"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </Link>
        <div className="presentation-bar__title-wrap">
          {isEditingTitle ? (
            <input
              ref={editInputRef}
              type="text"
              className="presentation-bar__title-input"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleRenameSubmit}
              onKeyDown={handleRenameKeyDown}
              aria-label="Rename comparison"
            />
          ) : (
            <>
              <h1 className="presentation-bar__title">{name || 'Comparison'}</h1>
              {onRename && (
                <button
                  type="button"
                  className="btn btn--icon presentation-bar__rename-btn"
                  onClick={() => setIsEditingTitle(true)}
                  title="Rename"
                  aria-label="Rename comparison"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 3l4 4-12 12-5 1 1-5 12-12z" />
                  </svg>
                </button>
              )}
            </>
          )}
        </div>
      </div>
      <div className="presentation-bar__right">
        {viewMode === 'stacked' && (
          <div className="presentation-bar__opacity-control">
            <label htmlFor="stacked-opacity" className="presentation-bar__opacity-label">
              Top opacity
            </label>
            <input
              id="stacked-opacity"
              type="range"
              min={0}
              max={100}
              value={stackedOpacity}
              onChange={(e) => onStackedOpacityChange?.(Number(e.target.value))}
              className="presentation-bar__opacity-slider"
              aria-label="Top image opacity"
            />
            <span className="presentation-bar__opacity-value">{stackedOpacity}%</span>
          </div>
        )}
        <Link
          to={`/edit?id=${recordId}`}
          className="btn btn--icon presentation-bar__btn--labeled"
          title="Edit"
          aria-label="Edit comparison"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          <span className="presentation-bar__btn-label">Edit</span>
        </Link>
        <button
          type="button"
          className="btn btn--icon presentation-bar__btn--labeled"
          onClick={onFullscreen}
          title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
        >
          {isFullscreen ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
            </svg>
          )}
          <span className="presentation-bar__btn-label">{isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}</span>
        </button>
        {onExport && (
          <button
            type="button"
            className="btn btn--icon presentation-bar__btn--labeled"
            onClick={onExport}
            title="Export as image"
            aria-label="Export comparison as image"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span className="presentation-bar__btn-label">Export</span>
          </button>
        )}
        <div className="presentation-bar__more">
          <button
            type="button"
            className="btn btn--icon"
            onClick={() => setMoreOpen((o) => !o)}
            title="Settings"
            aria-label="Settings"
            aria-expanded={moreOpen}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
          {moreOpen && (
            <>
              <div className="presentation-bar__backdrop" onClick={() => setMoreOpen(false)} aria-hidden />
              <div className="presentation-bar__dropdown">
                <div className="presentation-bar__dropdown-title">View mode</div>
                {VIEW_MODES.map(({ value, label }) => (
                  <label
                    key={value}
                    className={`presentation-bar__dropdown-option ${viewMode === value ? 'presentation-bar__dropdown-option--selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name="viewMode"
                      value={value}
                      checked={viewMode === value}
                      onChange={() => onViewModeChange?.(value)}
                    />
                    <span>{label}</span>
                    {viewMode === value && (
                      <span className="presentation-bar__dropdown-check" aria-hidden>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </span>
                    )}
                  </label>
                ))}
                <div className="presentation-bar__dropdown-title presentation-bar__dropdown-title--spaced">Size</div>
                {(viewMode === 'side-by-side' ? ['full', 'actual'] : ['actual', 'full', 'custom']).map((mode) => (
                  <label
                    key={mode}
                    className={`presentation-bar__dropdown-option ${sizeMode === mode ? 'presentation-bar__dropdown-option--selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name="sizeMode"
                      value={mode}
                      checked={sizeMode === mode}
                      onChange={() => onSizeModeChange(mode)}
                    />
                    <span>
                      {mode === 'actual' && 'Actual size'}
                      {mode === 'full' && (viewMode === 'side-by-side' ? 'Fit' : 'Fit to width')}
                      {mode === 'custom' && 'Custom'}
                    </span>
                    {sizeMode === mode && (
                      <span className="presentation-bar__dropdown-check" aria-hidden>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </span>
                    )}
                  </label>
                ))}
                {sizeMode === 'custom' && viewMode !== 'side-by-side' && (
                  <div className="presentation-bar__custom-width">
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={customWidthPx}
                      onChange={(e) => onCustomWidthPxChange(Number(e.target.value) || 800)}
                    />
                    <span>px</span>
                  </div>
                )}
                <div className="presentation-bar__dropdown-title presentation-bar__dropdown-title--spaced">Background</div>
                <div className="presentation-bar__color-row">
                  {BACKGROUND_CHIPS.map((chip) => (
                    <button
                      key={chip.label}
                      type="button"
                      className={`presentation-bar__color-chip ${isChipSelected(chip) ? 'presentation-bar__color-chip--selected' : ''}`}
                      style={{ background: chip.hex }}
                      onClick={() => {
                        setHexInputValue(chip.hex);
                        onBackgroundColorChange?.(chip.value);
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
                    title="Pick colour"
                    aria-label="Pick background colour"
                  >
                    <input
                      ref={colorPickerRef}
                      type="color"
                      className="presentation-bar__color-picker-input"
                      value={effectiveBackgroundColor?.replace(/^#/, '') ? effectiveBackgroundColor : DEFAULT_VIEW_BACKGROUND}
                      onChange={handleColorPickerChange}
                      aria-hidden
                    />
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
                    </svg>
                  </button>
                </div>
                <div className="presentation-bar__hex-wrap">
                  <input
                    type="text"
                    className="presentation-bar__hex-input"
                    value={hexInputValue}
                    onChange={handleHexInputChange}
                    onBlur={handleHexInputBlur}
                    placeholder="#000000"
                    aria-label="Background colour hex"
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
