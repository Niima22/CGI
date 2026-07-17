import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

export default function Layout({ role }) {
  return (
    <div className="app-shell">
      <Sidebar role={role} />
      <main className="app-main">
        <Header />
        <div className="app-content fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
