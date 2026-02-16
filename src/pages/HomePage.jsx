import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loadHistory, deleteRecord } from '../lib/storage';
import { downloadStandaloneHistory } from '../lib/downloadHtml';
import { timeAgo } from '../lib/timeAgo';
import { ImageDropZone } from '../components/ImageDropZone';

export function HomePage() {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);

  useEffect(() => {
    loadHistory().then(setHistory);
  }, []);
  const [emptyBefore, setEmptyBefore] = useState(null);
  const [emptyAfter, setEmptyAfter] = useState(null);
  const [now, setNow] = useState(() => new Date());

  // Refresh "time ago" every minute
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(t);
  }, []);

  const handleDownloadHistory = () => downloadStandaloneHistory(history);

  const handleDelete = async (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm('Delete this comparison? This cannot be undone.')) return;
    const ok = await deleteRecord(id);
    if (ok) loadHistory().then(setHistory);
  };

  return (
    <div className="home-layout">
      <aside className="home-sidebar">
        <div className="home-sidebar__actions">
          <h1 className="home-sidebar__title">Image compare</h1>
          <Link to="/create" className="btn btn--secondary home-sidebar__btn">
            New comparison
          </Link>
        </div>
        <div className="home-sidebar__section">
          <h2 className="home-sidebar__heading">Comparisons</h2>
          {history.length === 0 ? (
            <p className="home-sidebar__empty">No comparisons yet</p>
          ) : (
            <ul className="sidebar-list">
              {history.map((r) => (
                <li key={r.id} className="sidebar-list__item">
                  <Link
                    to={`/view?id=${encodeURIComponent(r.id)}`}
                    className="sidebar-list__btn"
                  >
                    <span className="sidebar-list__icon" aria-hidden>
                      {r.imageBefore && r.imageAfter ? (
                        <img src={r.imageBefore} alt="" className="sidebar-list__thumb" />
                      ) : (
                        <span className="sidebar-list__thumb-placeholder" />
                      )}
                    </span>
                    <span className="sidebar-list__label">{r.name || 'Untitled'}</span>
                    <span className="sidebar-list__row-actions">
                      <Link
                        to={`/edit?id=${encodeURIComponent(r.id)}`}
                        className="sidebar-list__edit"
                        title="Edit"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Edit
                      </Link>
                      <button
                        type="button"
                        className="sidebar-list__delete"
                        title="Delete"
                        aria-label="Delete comparison"
                        onClick={(e) => handleDelete(e, r.id)}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          <line x1="10" y1="11" x2="10" y2="17" />
                          <line x1="14" y1="11" x2="14" y2="17" />
                        </svg>
                      </button>
                    </span>
                    <span className="sidebar-list__time">{timeAgo(r.modifiedAt, now)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        {/* Download option hidden for now – logic kept in handleDownloadHistory
        {history.length > 0 && (
          <div className="home-sidebar__footer">
            <button type="button" className="sidebar-more" onClick={handleDownloadHistory}>
              Download all (HTML)
            </button>
          </div>
        )}
        */}
        <div className="home-sidebar__footer">
          <p className="home-sidebar__credit">Built by Josh Harwood</p>
        </div>
      </aside>
      <main className="home-main home-main--empty">
        <div className="empty-state">
          <header className="empty-state__hero">
            <h2 className="empty-state__title">Compare before and after—without the guesswork</h2>
            <p className="empty-state__subtitle">
            Drop two images below and drag the divider to reveal the difference. Ideal for design reviews, mockups, and screenshots.
            </p>
          </header>

          <div className="empty-state__drop-row">
            <div className="empty-state__drop-col">
              <span className="empty-state__drop-label">Before</span>
              <ImageDropZone value={emptyBefore} onChange={setEmptyBefore} label="Before" />
            </div>
            <div className="empty-state__drop-col">
              <span className="empty-state__drop-label">After</span>
              <ImageDropZone value={emptyAfter} onChange={setEmptyAfter} label="After" />
            </div>
          </div>
          {emptyBefore?.dataUrl && emptyAfter?.dataUrl && !emptyBefore?.error && !emptyAfter?.error && (
            <div className="empty-state__actions">
              <button
                type="button"
                className="btn btn--primary"
                onClick={() =>
                  navigate('/create', {
                    state: {
                      before: emptyBefore,
                      after: emptyAfter,
                      imageBefore: emptyBefore.dataUrl,
                      imageAfter: emptyAfter.dataUrl,
                    },
                  })
                }
              >
                Add details & create
              </button>
            </div>
          )}

          <section className="empty-state__features" aria-label="What you can do">
            <h3 className="empty-state__features-title">What you can do</h3>
            <div className="empty-state__features-grid">
              <div className="empty-state__feature">
                <h4 className="empty-state__feature-title">Multiple view modes</h4>
                <p className="empty-state__feature-desc">
                  <strong>Swipe</strong> — drag the divider to reveal before or after. <strong>Differences</strong> — highlight changed pixels. <strong>Stacked</strong> — overlay with adjustable opacity. <strong>Side by side</strong> — two columns, fit or actual size.
                </p>
              </div>
              <div className="empty-state__feature">
                <h4 className="empty-state__feature-title">Export views</h4>
                <p className="empty-state__feature-desc">
                  Export the comparison as an image (PNG) to use in docs, slides, or reports.
                </p>
              </div>
              <div className="empty-state__feature">
                <h4 className="empty-state__feature-title">Local only — nothing uploaded</h4>
                <p className="empty-state__feature-desc">
                  All comparisons and images are stored in your browser. Nothing is sent to any server; your files stay on your device.
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
