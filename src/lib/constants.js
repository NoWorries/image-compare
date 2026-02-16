export const STORAGE_KEY = 'xdl-swipe-history';
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
export const MAX_FILE_SIZE_MB = 5;

export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/bmp',
  'image/avif',
];

export const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.avif'];

export const SWIPE_WIDTH_OPTIONS = {
  images: 'Fit to images (default)',
  full: 'Fit to width',
  custom: 'Custom (px)',
};

/** Default background for view page and export when no custom color is set. */
export const DEFAULT_VIEW_BACKGROUND = '#0d1117';

/** Preset background colour options for create/edit/view. */
export const BACKGROUND_CHIPS = [
  { value: null, label: 'Default', hex: DEFAULT_VIEW_BACKGROUND },
  { value: '#000000', label: 'Black', hex: '#000000' },
  { value: '#ffffff', label: 'White', hex: '#ffffff' },
];

/** Normalize input to #RRGGBB or return null if invalid. */
export function normalizeHex(value) {
  if (value == null || value === '') return null;
  const s = String(value).trim().replace(/^#/, '');
  if (/^[0-9A-Fa-f]{6}$/.test(s)) return '#' + s;
  if (/^[0-9A-Fa-f]{3}$/.test(s)) return '#' + s[0] + s[0] + s[1] + s[1] + s[2] + s[2];
  return null;
}

/** Effective background colour (normalized hex or default). */
export function effectiveBackgroundColor(backgroundColor) {
  const hex = normalizeHex(backgroundColor);
  return hex ?? DEFAULT_VIEW_BACKGROUND;
}
