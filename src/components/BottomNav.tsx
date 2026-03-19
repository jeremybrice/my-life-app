import { NavLink } from 'react-router';
import { NAV_ITEMS, ROUTES } from '@/lib/constants';
import { NavIcon } from '@/components/NavIcon';
import { useNotificationAlerts } from '@/hooks/useNotificationAlerts';

export function BottomNav() {
  const { budgetAlertCount, dashboardAlertCount } = useNotificationAlerts();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-surface-card border-t border-edge pb-safe md:hidden">
      <ul className="flex justify-around items-center h-16">
        {NAV_ITEMS.map((item) => (
          <li key={item.path}>
            <NavLink
              to={item.path}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-2 py-1 text-xs transition-colors ${
                  isActive
                    ? 'text-accent'
                    : 'text-fg-muted'
                }`
              }
            >
              <span className="relative">
                <NavIcon icon={item.icon} className="w-6 h-6" />
                {item.path === ROUTES.DASHBOARD && dashboardAlertCount > 0 && (
                  <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-accent" />
                )}
                {item.path === ROUTES.BUDGET && budgetAlertCount > 0 && (
                  <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-amber-500" />
                )}
              </span>
              <span>{item.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
