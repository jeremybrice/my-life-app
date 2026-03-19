import { Outlet } from 'react-router';
import { BottomNav } from '@/components/BottomNav';
import { Sidebar } from '@/components/Sidebar';
import { APP_NAME } from '@/lib/constants';

export function AppShell() {
  return (
    <div className="min-h-screen bg-surface">
      {/* Desktop sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div className="md:ml-64">
        {/* Mobile header */}
        <header className="sticky top-0 z-40 flex items-center h-14 px-4 bg-surface-card border-b border-edge pt-safe md:hidden">
          <h1 className="text-lg font-bold text-fg">
            {APP_NAME}
          </h1>
        </header>

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
