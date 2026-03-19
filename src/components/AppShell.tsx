import { Outlet } from 'react-router';
import { BottomNav } from '@/components/BottomNav';
import { Sidebar } from '@/components/Sidebar';
import { APP_NAME } from '@/lib/constants';

export function AppShell() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Desktop sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div className="md:ml-64">
        {/* Mobile header */}
        <header className="sticky top-0 z-40 flex items-center h-14 px-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 pt-safe md:hidden">
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">
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
