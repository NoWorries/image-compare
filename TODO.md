# TODO

## In progress / To fix

- [ ] **Fix slider mask positioning in downloaded standalone** – When opening the exported HTML (ZIP or single-file), the slider masking (clip-path split between before/after) should line up precisely with the grabber handle. Currently there may be misalignment; ensure the split line and handle position use the same calculation and stay in sync (including after resize and when switching view modes).

## Done

- [x] Show storage size per record on Edit page (next to Delete button)
- [x] Switch from localStorage to IndexedDB for much larger storage quota
- [x] One-time migration from existing localStorage data to IndexedDB
- [x] Downloaded ZIP: add presentation-style top bar (colour, icons)
- [x] Downloaded ZIP: add Size options (Actual size, Fit to width, Custom px)
- [x] Downloaded ZIP: add Background options (Default, Black, White, picker, hex)
- [x] Downloaded ZIP: scrollable main area when image is larger than viewport
- [x] Downloaded ZIP: fix handle z-index (grabber on top of line)
- [x] Downloaded ZIP: add View modes (Swipe, Differences, Stacked, Side by side)
- [x] Downloaded ZIP: add Stacked opacity slider
- [x] Downloaded ZIP: add Fullscreen button
- [x] Delete button to the left, file size to the right on Edit page

## Future ideas

- Optional: Show total storage used across all records (e.g. on Home or in Settings)
- Optional: Export/import backup so users can move comparisons between devices
