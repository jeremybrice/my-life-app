import { Outlet } from 'react-router';
import { BottomNav } from '@/components/BottomNav';
import { Sidebar } from '@/components/Sidebar';

export function AppShell() {
  return (
    <div className="min-h-screen bg-surface">
      {/* Desktop sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div className="md:ml-64">
        {/* Screen content */}
        <main className="px-4 py-6 pb-24 md:pb-6 md:px-8">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom tabs */}
      <BottomNav />
    </div>
  );
}
