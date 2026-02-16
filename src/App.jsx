import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { HomePage } from './pages/HomePage';
import { CreatePage } from './pages/CreatePage';
import { EditPage } from './pages/EditPage';
import { ViewPage } from './pages/ViewPage';
import { Layout } from './components/Layout';

function RedirectToViewIfId() {
  const location = useLocation();
  const navigate = useNavigate();
  const id = new URLSearchParams(location.search).get('id');
  useEffect(() => {
    if (location.pathname === '/' && id) {
      navigate(`/view?id=${encodeURIComponent(id)}`, { replace: true });
    }
  }, [location.pathname, id, navigate]);
  return null;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<><RedirectToViewIfId /><HomePage /></>} />
        <Route path="create" element={<CreatePage />} />
        <Route path="edit" element={<EditPage />} />
        <Route path="view" element={<ViewPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
