import { MAX_FILE_SIZE_BYTES, ALLOWED_IMAGE_TYPES } from './constants';

export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function validateImageFile(file) {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { ok: false, error: `File is over 5MB (${(file.size / 1024 / 1024).toFixed(1)}MB). Max size is 5MB.` };
  }
  const type = (file.type || '').toLowerCase();
  if (!ALLOWED_IMAGE_TYPES.some((t) => t.toLowerCase() === type)) {
    return { ok: false, error: `Format not supported. Use: JPEG, PNG, GIF, WebP, SVG, BMP, or AVIF.` };
  }
  return { ok: true };
}

export function generateStoredImageName(recordName, side, datetime) {
  const safe = (recordName || 'comparison').replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 60);
  const datePart = datetime ? new Date(datetime).toISOString().replace(/[:.]/g, '-').slice(0, 19) : '';
  return `${safe}_${side}_${datePart}`.replace(/_+/g, '_') || `${side}_${Date.now()}`;
}

/** Get MIME type from data URL (e.g. "image/png" -> "PNG"). */
export function getFileTypeLabelFromDataUrl(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') return '—';
  const match = dataUrl.match(/^data:([^;,]+)/);
  if (!match) return '—';
  const mime = match[1].toLowerCase();
  if (mime === 'image/png') return 'PNG';
  if (mime === 'image/jpeg' || mime === 'image/jpg') return 'JPEG';
  if (mime === 'image/gif') return 'GIF';
  if (mime === 'image/webp') return 'WebP';
  if (mime === 'image/svg+xml') return 'SVG';
  if (mime === 'image/bmp') return 'BMP';
  if (mime === 'image/avif') return 'AVIF';
  return mime.replace('image/', '').toUpperCase() || '—';
}

/** Estimate byte size from data URL (base64 is ~4/3 of raw bytes). */
export function estimateSizeFromDataUrl(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  const comma = dataUrl.indexOf(',');
  if (comma === -1) return null;
  const b64 = dataUrl.slice(comma + 1);
  return Math.round((b64.length * 3) / 4);
}

/** Format bytes as human-readable size (e.g. "981.49KB"). */
export function formatFileSize(bytes) {
  if (bytes == null || bytes < 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
