import { useCallback, useRef, useImperativeHandle, forwardRef } from 'react';
import { validateImageFile } from '../lib/imageUtils';
import { MAX_FILE_SIZE_MB } from '../lib/constants';
import { ImageFileDetails } from './ImageFileDetails';

export const ImageDropZone = forwardRef(function ImageDropZone(
  { value, onChange, label, error, disabled, editMode, dragOverViewport },
  ref
) {
  const inputRef = useRef(null);

  useImperativeHandle(ref, () => ({
    openFileDialog: () => inputRef.current?.click(),
  }), []);

  const handleFile = useCallback(
    (file) => {
      if (!file) return;
      const result = validateImageFile(file);
      if (!result.ok) {
        onChange({ error: result.error });
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result;
        const img = new Image();
        img.onload = () =>
          onChange({
            dataUrl,
            error: null,
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            width: img.naturalWidth,
            height: img.naturalHeight,
          });
        img.onerror = () =>
          onChange({
            dataUrl,
            error: null,
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
          });
        img.src = dataUrl;
      };
      reader.onerror = () => onChange({ error: 'Failed to read file' });
      reader.readAsDataURL(file);
    },
    [onChange]
  );

  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      if (disabled) return;
      const file = e.dataTransfer?.files?.[0];
      if (file) handleFile(file);
    },
    [disabled, handleFile]
  );

  const onDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const onChoose = useCallback(() => {
    if (disabled) return;
    inputRef.current?.click();
  }, [disabled]);

  const onInputChange = useCallback(
    (e) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      e.target.value = '';
    },
    [handleFile]
  );

  const hasImage = value?.dataUrl;
  const errMsg = value?.error || error;
  const isEditWithImage = editMode && hasImage;
  const showAsDropTarget = isEditWithImage && dragOverViewport;

  return (
    <div
      className={`drop-zone ${hasImage ? 'drop-zone--has-image' : ''} ${isEditWithImage ? 'drop-zone--edit' : ''} ${showAsDropTarget ? 'drop-zone--drag-over-viewport' : ''} ${errMsg ? 'drop-zone--error' : ''} ${disabled ? 'drop-zone--disabled' : ''}`}
      onDrop={showAsDropTarget || !isEditWithImage ? onDrop : undefined}
      onDragOver={showAsDropTarget || !isEditWithImage ? onDragOver : undefined}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,image/svg+xml,image/bmp,image/avif"
        onChange={onInputChange}
        className="drop-zone__input"
        aria-label={label}
      />
      {hasImage ? (
        <>
          <div className="drop-zone__preview drop-zone__preview--no-click" aria-hidden>
            <img src={value.dataUrl} alt="" draggable={false} />
          </div>
          <ImageFileDetails value={value} />
        </>
      ) : (
        <button type="button" className="drop-zone__placeholder" onClick={onChoose} disabled={disabled}>
          <span className="drop-zone__icon">↑</span>
          <span>Drag & drop or click to upload</span>
          <span className="drop-zone__hint">Max {MAX_FILE_SIZE_MB}MB · JPEG, PNG, GIF, WebP, SVG, BMP, AVIF</span>
        </button>
      )}
      {errMsg && <p className="drop-zone__error">{errMsg}</p>}
    </div>
  );
});
