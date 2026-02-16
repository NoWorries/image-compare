import { Outlet, Link, useLocation } from 'react-router-dom';

export function Layout() {
  const location = useLocation();
  const isView = location.pathname === '/view';
  const isHome = location.pathname === '/';
  const showTopNav = !isView && !isHome;

  if (isView) {
    return (
      <div className="app app--view">
        <Outlet />
      </div>
    );
  }

  return (
    <div className="app">
      {showTopNav && (
        <nav className="nav">
          <Link to="/" className="nav__link">
            ← Back
          </Link>
          {location.pathname !== '/create' && location.pathname !== '/edit' && (
            <Link to="/create" className="nav__link">
              New comparison
            </Link>
          )}
        </nav>
      )}
      <main className={isHome ? 'main main--home' : 'main'}>
        <Outlet />
      </main>
    </div>
  );
}
