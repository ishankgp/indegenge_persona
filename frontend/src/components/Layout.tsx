import { Outlet, Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  PlayCircle, 
  BarChart3,
  Activity,
  ChevronLeft,
  Menu,
  Moon,
  Sun,
  Sparkles,
  TrendingUp,
  Heart,
  Bell,
  Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard, color: 'text-violet-500', bgColor: 'bg-violet-500/10' },
  { name: 'Persona Library', href: '/personas', icon: Users, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  { name: 'Simulation Hub', href: '/simulation', icon: PlayCircle, color: 'text-emerald-500', bgColor: 'bg-emerald-500/10' },
  { name: 'Analytics', href: '/analytics', icon: BarChart3, color: 'text-amber-500', bgColor: 'bg-amber-500/10' },
];

export function Layout() {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showNotification, setShowNotification] = useState(true);

  useEffect(() => {
    // Check for saved theme preference or default to light mode
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    if (!isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 via-white to-violet-50 dark:from-gray-950 dark:via-gray-900 dark:to-violet-950">
      {/* Sidebar */}
      <div className={cn(
        "relative bg-white dark:bg-gray-900 shadow-2xl border-r border-gray-200 dark:border-gray-800 transition-all duration-300 ease-in-out",
        isCollapsed ? "w-20" : "w-72"
      )}>
        <div className="flex h-full flex-col">
          {/* Logo Section */}
          <div className="relative overflow-hidden bg-gradient-to-br from-primary to-secondary p-6">
            {/* Animated Background Pattern */}
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-0 -left-4 w-24 h-24 bg-white rounded-full mix-blend-overlay filter blur-xl animate-pulse"></div>
              <div className="absolute bottom-0 right-0 w-32 h-32 bg-white rounded-full mix-blend-overlay filter blur-xl animate-pulse animation-delay-2000"></div>
            </div>
            
            <div className="relative flex items-center justify-between">
              <div className={cn(
                "flex items-center space-x-3 transition-all duration-300",
                isCollapsed && "justify-center"
              )}>
                <div className="relative">
                  <div className="absolute inset-0 bg-white/20 rounded-xl blur-lg"></div>
                  <div className="relative p-2.5 bg-white/20 backdrop-blur-sm rounded-xl border border-white/30">
                    <Activity className="h-7 w-7 text-white" />
                  </div>
                </div>
                {!isCollapsed && (
                  <div className="slide-in">
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold text-white">PharmaSim</span>
                      <Sparkles className="h-4 w-4 text-yellow-300 animate-pulse" />
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-white/80">AI-Powered Insights</span>
                      <span className="px-2 py-0.5 text-xs bg-white/20 backdrop-blur-sm rounded-full text-white border border-white/30">
                        v2.0
                      </span>
                    </div>
                  </div>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="text-white hover:bg-white/20 rounded-lg"
              >
                {isCollapsed ? <Menu className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
              </Button>
            </div>
          </div>

          {/* Quick Stats (visible when not collapsed) */}
          {!isCollapsed && (
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center p-2 rounded-lg bg-gradient-to-br from-violet-50 to-violet-100 dark:from-violet-950 dark:to-violet-900">
                  <TrendingUp className="h-4 w-4 mx-auto text-violet-600 dark:text-violet-400 mb-1" />
                  <p className="text-xs font-semibold text-violet-900 dark:text-violet-100">98%</p>
                  <p className="text-xs text-violet-600 dark:text-violet-400">Active</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900">
                  <Heart className="h-4 w-4 mx-auto text-emerald-600 dark:text-emerald-400 mb-1" />
                  <p className="text-xs font-semibold text-emerald-900 dark:text-emerald-100">156</p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">Personas</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900">
                  <Sparkles className="h-4 w-4 mx-auto text-amber-600 dark:text-amber-400 mb-1" />
                  <p className="text-xs font-semibold text-amber-900 dark:text-amber-100">24</p>
                  <p className="text-xs text-amber-600 dark:text-amber-400">Insights</p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 space-y-1.5 px-3 py-4 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    isActive
                      ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-lg shadow-primary/25'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
                    'group flex items-center rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200 relative overflow-hidden',
                    isCollapsed && 'justify-center'
                  )}
                >
                  {isActive && (
                    <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary opacity-10"></div>
                  )}
                  <div className={cn(
                    "relative flex items-center",
                    isCollapsed ? "" : "w-full"
                  )}>
                    <div className={cn(
                      isActive ? 'text-white' : item.color,
                      'flex-shrink-0 transition-all duration-200',
                      !isActive && !isCollapsed && item.bgColor,
                      !isActive && !isCollapsed && 'p-2 rounded-lg'
                    )}>
                      <item.icon className={cn(
                        isActive || isCollapsed ? 'h-5 w-5' : 'h-4 w-4'
                      )} />
                    </div>
                    {!isCollapsed && (
                      <>
                        <span className="ml-3 flex-1">{item.name}</span>
                        {isActive && (
                          <div className="ml-auto">
                            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  {isCollapsed && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                      {item.name}
                    </div>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Bottom Section */}
          <div className="border-t border-gray-200 dark:border-gray-800 p-3 space-y-2">
            {/* Notification Bell */}
            {!isCollapsed && showNotification && (
              <div className="p-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950 rounded-xl border border-amber-200 dark:border-amber-800 relative">
                <button
                  onClick={() => setShowNotification(false)}
                  className="absolute top-2 right-2 text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200"
                >
                  ×
                </button>
                <div className="flex items-start space-x-2">
                  <Bell className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-amber-900 dark:text-amber-100">New Feature!</p>
                    <p className="text-xs text-amber-700 dark:text-amber-300">Try our enhanced AI analytics</p>
                  </div>
                </div>
              </div>
            )}

            {/* Theme Toggle & Settings */}
            <div className={cn(
              "flex items-center",
              isCollapsed ? "justify-center space-y-2 flex-col" : "justify-between"
            )}>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleDarkMode}
                className="rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                {isDarkMode ? (
                  <Sun className="h-5 w-5 text-amber-500" />
                ) : (
                  <Moon className="h-5 w-5 text-indigo-500" />
                )}
              </Button>
              {!isCollapsed && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <Settings className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </Button>
              )}
            </div>

            {/* User Profile Section */}
            {!isCollapsed && (
              <div className="pt-2">
                <div className="flex items-center space-x-3 p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold">
                      JD
                    </div>
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-gray-900 rounded-full"></div>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">John Doe</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Premium Plan</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        <div className="fade-in">
          <Outlet />
        </div>
      </div>
    </div>
  );
}