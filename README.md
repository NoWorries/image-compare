# Image compare

A web app for designers to compare two images with a swipe slider. Create before/after pairs, store them in your browser, and share or export as standalone HTML.

## Features

- **Create comparisons** – Add two images (drag & drop or click), optional name, and choose swipe width (fit to images, fit-to-width, or custom px).
- **History** – All pairs are stored in local storage. Rename, replace either image, swap order, delete, or open in a new tab.
- **Presentation view** – Full-screen, copy link, size options (actual / fit-to-width / custom), and edit link. Each pair has a unique URL (`?id=...`) so you can have multiple diffs open.
- **Export** – Download a single comparison or your full history as a standalone HTML file with images embedded, so you can run it in any browser offline.

## Tech

- React 18, React Router, Vite
- Local storage only (no backend)
- 5MB max per image; JPEG, PNG, GIF, WebP, SVG, BMP, AVIF

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:5173. Build for production: `npm run build` (output in `dist/`).

## Usage

1. **New comparison** – Click “New comparison”, add a name (optional), upload Before and After images, set swipe width, then Create.
2. **History** – From the list you can: Open in new tab, View, Edit, Swap order, Replace images (toggle to show drop zones), Rename (click title), Delete, or Download HTML for that pair.
3. **View** – Use the bar to toggle fullscreen, copy link, or open “More” for size (Actual / Fit to width / Custom) and “Edit comparison”.
4. **Download** – “Download HTML” on an item saves one comparison as a single HTML file. “Download history (HTML)” saves all comparisons in one file; open either in a browser to use the swipe without the app.
