import { useState, useEffect } from 'react';
import {
  getFileTypeLabelFromDataUrl,
  estimateSizeFromDataUrl,
  formatFileSize,
} from '../lib/imageUtils';

function getFileTypeLabel(value) {
  if (value?.fileType) {
    const m = value.fileType.toLowerCase();
    if (m === 'image/png') return 'PNG';
    if (m === 'image/jpeg' || m === 'image/jpg') return 'JPEG';
    if (m === 'image/gif') return 'GIF';
    if (m === 'image/webp') return 'WebP';
    if (m === 'image/svg+xml') return 'SVG';
    if (m === 'image/bmp') return 'BMP';
    if (m === 'image/avif') return 'AVIF';
    return value.fileType.replace('image/', '').toUpperCase() || '—';
  }
  return value?.dataUrl ? getFileTypeLabelFromDataUrl(value.dataUrl) : '—';
}

function getSizeBytes(value) {
  if (value?.fileSize != null) return value.fileSize;
  if (value?.dataUrl) return estimateSizeFromDataUrl(value.dataUrl);
  return null;
}

export function ImageFileDetails({ value }) {
  const [dimensions, setDimensions] = useState(() =>
    value?.width != null && value?.height != null
      ? { width: value.width, height: value.height }
      : { width: null, height: null }
  );

  useEffect(() => {
    if (!value?.dataUrl) {
      setDimensions({ width: null, height: null });
      return;
    }
    if (value.width != null && value.height != null) {
      setDimensions({ width: value.width, height: value.height });
      return;
    }
    const img = new Image();
    img.onload = () => {
      setDimensions({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => setDimensions({ width: null, height: null });
    img.src = value.dataUrl;
    return () => {
      img.src = '';
    };
  }, [value?.dataUrl, value?.width, value?.height]);

  if (!value?.dataUrl) return null;

  const fileType = getFileTypeLabel(value);
  const sizeBytes = getSizeBytes(value);
  const { width, height } = dimensions;

  const dimensionsStr =
    width != null && height != null ? `${width} × ${height} px` : '—';

  const rows = [
    { label: 'Filename', value: value.fileName || '—' },
    { label: 'File type', value: fileType },
    { label: 'Size', value: formatFileSize(sizeBytes) },
    { label: 'Image dimensions', value: dimensionsStr },
    { label: 'Image width', value: width != null ? `${width} px` : '—' },
    { label: 'Image height', value: height != null ? `${height} px` : '—' },
  ];

  return (
    <div className="image-file-details">
      <table className="image-file-details__table">
        <tbody>
          {rows.map(({ label, value: val }) => (
            <tr key={label}>
              <td className="image-file-details__label">{label}</td>
              <td className="image-file-details__value">{val}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
