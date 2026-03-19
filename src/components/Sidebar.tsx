import { NavLink } from 'react-router';
import { NAV_ITEMS, APP_NAME } from '@/lib/constants';
import { NavIcon } from '@/components/NavIcon';

export function Sidebar() {
  return (
    <aside className="hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0 bg-[#262625] text-white">
      <div className="flex items-center h-16 px-6 border-b border-[#565551]">
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
                      ? 'bg-accent text-white'
                      : 'text-[#b6b5b1] hover:bg-[#3a3938] hover:text-white'
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
