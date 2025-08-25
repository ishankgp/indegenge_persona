import { Outlet, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  PlayCircle, 
  BarChart3,
  Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Persona Library', href: '/personas', icon: Users },
  { name: 'Simulation Hub', href: '/simulation', icon: PlayCircle },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
];

export function Layout() {
  const location = useLocation();

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-xl border-r border-gray-200">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="gradient-bg text-white p-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Activity className="h-6 w-6" />
              </div>
              <div>
                <span className="text-lg font-bold">PharmaPersonaSim</span>
                <p className="text-xs text-blue-100">v1.0.0</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-2 px-4 py-6">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    isActive
                      ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-md'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-primary',
                    'group flex items-center rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200'
                  )}
                >
                  <item.icon
                    className={cn(
                      isActive ? 'text-white' : 'text-gray-500 group-hover:text-primary',
                      'mr-3 h-5 w-5 flex-shrink-0 transition-colors'
                    )}
                  />
                  {item.name}
                  {isActive && (
                    <div className="ml-auto w-2 h-2 bg-white rounded-full"></div>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="border-t border-gray-200 p-4">
            <div className="text-xs text-gray-500 text-center">
              <p className="font-medium text-gray-700 mb-1">PharmaPersonaSim</p>
              <p>Transform personas into insights</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        <Outlet />
      </div>
    </div>
  );
}
