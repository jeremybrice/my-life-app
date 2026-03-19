import { NavLink } from 'react-router';
import { NAV_ITEMS } from '@/lib/constants';
import { NavIcon } from '@/components/NavIcon';

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 pb-safe md:hidden">
      <ul className="flex justify-around items-center h-16">
        {NAV_ITEMS.map((item) => (
          <li key={item.path}>
            <NavLink
              to={item.path}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-2 py-1 text-xs transition-colors ${
                  isActive
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-slate-500 dark:text-slate-400'
                }`
              }
            >
              <NavIcon icon={item.icon} className="w-6 h-6" />
              <span>{item.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
