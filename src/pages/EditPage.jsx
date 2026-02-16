import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ImageDropZone } from '../components/ImageDropZone';
import { getRecordById, updateRecord, deleteRecord, getRecordStorageSizeBytes, formatStorageSize } from '../lib/storage';
import { SWIPE_WIDTH_OPTIONS, BACKGROUND_CHIPS, DEFAULT_VIEW_BACKGROUND, effectiveBackgroundColor } from '../lib/constants';
import { downloadStandaloneRecordAsZip } from '../lib/downloadHtml';

export function EditPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const id = searchParams.get('id');
  const [record, setRecord] = useState(null);
  const [name, setName] = useState('');
  const [before, setBefore] = useState(null);
  const [after, setAfter] = useState(null);
  const [swipeWidth, setSwipeWidth] = useState('images');
  const [customWidthPx, setCustomWidthPx] = useState(800);
  const [backgroundColor, setBackgroundColor] = useState(null);
  const [hexInputValue, setHexInputValue] = useState(DEFAULT_VIEW_BACKGROUND);
  const beforeZoneRef = useRef(null);
  const afterZoneRef = useRef(null);
  const colorPickerRef = useRef(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  useEffect(() => {
    setHexInputValue(effectiveBackgroundColor(backgroundColor));
  }, [backgroundColor]);

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

  useEffect(() => {
    if (!id) {
      navigate('/');
      return;
    }
    let cancelled = false;
    getRecordById(id).then((r) => {
      if (cancelled) return;
      if (!r) {
        navigate('/');
        return;
      }
      setRecord(r);
      setName(r.name || '');
      setBefore(
        r.imageBefore
          ? {
              dataUrl: r.imageBefore,
              width: r.imageBeforeWidth ?? undefined,
              height: r.imageBeforeHeight ?? undefined,
            }
          : null
      );
      setAfter(
        r.imageAfter
          ? {
              dataUrl: r.imageAfter,
              width: r.imageAfterWidth ?? undefined,
              height: r.imageAfterHeight ?? undefined,
            }
          : null
      );
      setSwipeWidth(r.swipeWidth || 'images');
      setCustomWidthPx(r.customWidthPx ?? 800);
      setBackgroundColor(r.backgroundColor ?? null);
      setHexInputValue(effectiveBackgroundColor(r.backgroundColor));
    });
    return () => { cancelled = true; };
  }, [id, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!record || !before?.dataUrl || !after?.dataUrl) return;
    await updateRecord(record.id, {
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
    navigate(`/view?id=${record.id}`, { replace: true });
  };

  const canSubmit = record && before?.dataUrl && after?.dataUrl && !before?.error && !after?.error;

  const handleSwap = () => {
    setBefore(after);
    setAfter(before);
  };

  const handleDownloadHtml = async () => {
    const recordForDownload = {
      ...record,
      name: name.trim() || record.name,
      swipeWidth,
      customWidthPx: swipeWidth === 'custom' ? customWidthPx : undefined,
      backgroundColor: backgroundColor ?? record.backgroundColor,
    };
    try {
      await downloadStandaloneRecordAsZip(recordForDownload);
    } catch (err) {
      console.error('Download failed', err);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this comparison? This cannot be undone.')) return;
    await deleteRecord(record.id);
    navigate('/', { replace: true });
  };

  if (!record) return <div className="page">Loading…</div>;

  return (
    <div className="page edit-page">
      <header className="page-header">
        <h1>Edit comparison</h1>
        <p className="page-desc">Replace images, rename, or change swipe width. Changes update the modified time.</p>
      </header>
      <form className="form edit-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">Name</label>
          <input
            id="name"
            type="text"
            className="input"
            placeholder="e.g. Homepage before/after"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="form-row form-row--two edit-page__image-row">
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
              editMode
              dragOverViewport={isDraggingFile}
            />
          </div>
          <div className="edit-page__swap-wrap">
            <button
              type="button"
              className="edit-page__swap-btn"
              onClick={handleSwap}
              title="Swap before and after"
              aria-label="Swap before and after"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M16 3l4 4-4 4" />
                <path d="M20 7H4" />
                <path d="M8 21l-4-4 4-4" />
                <path d="M4 17h16" />
              </svg>
            </button>
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
              editMode
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
          <button type="submit" className="btn btn--primary" disabled={!canSubmit}>
            Save changes
          </button>
          <button type="button" className="btn btn--secondary" onClick={handleDownloadHtml}>
            Download as ZIP
          </button>
        </div>
        <div className="edit-page__danger-row">
          <button type="button" className="btn btn--danger" onClick={handleDelete}>
            Delete
          </button>
          <span className="edit-page__storage-size" title="Approximate space used by this record in browser storage">
            {formatStorageSize(
              getRecordStorageSizeBytes({
                ...record,
                name: name.trim() || record.name,
                imageBefore: before?.dataUrl ?? record.imageBefore,
                imageAfter: after?.dataUrl ?? record.imageAfter,
                imageBeforeWidth: before?.width ?? record.imageBeforeWidth,
                imageBeforeHeight: before?.height ?? record.imageBeforeHeight,
                imageAfterWidth: after?.width ?? record.imageAfterWidth,
                imageAfterHeight: after?.height ?? record.imageAfterHeight,
                swipeWidth,
                customWidthPx: swipeWidth === 'custom' ? customWidthPx : undefined,
                backgroundColor: backgroundColor ?? record.backgroundColor,
              })
            )}{' '}
            in storage
          </span>
        </div>
        {record?.createdAt && (
          <div className="edit-page__meta">
            {record.modifiedAt && record.modifiedAt !== record.createdAt && (
              <p className="edit-page__meta-line">
                Last modified:{' '}
                <time dateTime={record.modifiedAt}>
                  {new Date(record.modifiedAt).toLocaleString(undefined, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </time>
              </p>
            )}
            <p className="edit-page__meta-line">
              Created:{' '}
              <time dateTime={record.createdAt}>
                {new Date(record.createdAt).toLocaleString(undefined, {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </time>
            </p>
          </div>
        )}
      </form>
    </div>
  );
}
