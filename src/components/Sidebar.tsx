import { NavLink } from 'react-router';
import { NAV_ITEMS, APP_NAME } from '@/lib/constants';
import { NavIcon } from '@/components/NavIcon';

export function Sidebar() {
  return (
    <aside className="hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0 bg-slate-800 dark:bg-slate-900 text-white">
      <div className="flex items-center h-16 px-6 border-b border-slate-700">
        <h1 className="text-xl font-bold">{APP_NAME}</h1>
      </div>
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary-600 text-white'
                      : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`
                }
              >
                <NavIcon icon={item.icon} className="w-5 h-5" />
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
