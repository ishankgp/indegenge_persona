import { Outlet, Link, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { checkHealth } from '@/lib/api';
import {
  LayoutDashboard,
  PlayCircle,
  BarChart3,
  Activity,
  UserPlus,
  Library,
  Bell,
  Settings,
  Search,
  Menu
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';

const navigation = [
  {
    name: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    name: 'Create Persona',
    href: '/create-persona',
    icon: UserPlus,
  },
  {
    name: 'Brand Library',
    href: '/brand-library',
    icon: Library,
  },
  {
    name: 'Simulation Hub',
    href: '/simulation',
    icon: PlayCircle,
  },
  {
    name: 'Analytics',
    href: '/analytics',
    icon: BarChart3,
  },
];

export function Layout() {
  const location = useLocation();
  const [apiOk, setApiOk] = useState<boolean | null>(null);
  const [personaCount, setPersonaCount] = useState<number | undefined>();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await checkHealth();
      if (!cancelled) {
        setApiOk(res.ok);
        setPersonaCount(res.personas);
      }
    })();
    const interval = setInterval(async () => {
      const res = await checkHealth();
      if (!cancelled) {
        setApiOk(res.ok);
        setPersonaCount(res.personas);
      }
    }, 15000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  return (
    <div className="flex h-screen bg-background font-sans text-foreground">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-[hsl(var(--sidebar-background))] flex flex-col hidden md:flex">
        {/* Logo Area */}
        <div className="h-16 flex items-center px-6 border-b border-border">
          <Activity className="h-6 w-6 text-primary mr-2" />
          <span className="font-bold text-lg tracking-tight">PersonaSim</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-6">
          <div>
            <div className="px-3 mb-2 text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">
              Core
            </div>
            <div className="space-y-1">
              {navigation.slice(0, 2).map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={cn(
                      'group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-all duration-200',
                      isActive
                        ? 'bg-white text-primary shadow-sm border-l-4 border-primary'
                        : 'text-muted-foreground hover:bg-white/50 hover:text-foreground'
                    )}
                  >
                    <item.icon
                      className={cn(
                        'mr-3 h-5 w-5 flex-shrink-0 transition-colors',
                        isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                      )}
                    />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>

          <div>
            <div className="px-3 mb-2 text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">
              Analysis
            </div>
            <div className="space-y-1">
              {navigation.slice(2).map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={cn(
                      'group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-all duration-200',
                      isActive
                        ? 'bg-white text-primary shadow-sm border-l-4 border-primary'
                        : 'text-muted-foreground hover:bg-white/50 hover:text-foreground'
                    )}
                  >
                    <item.icon
                      className={cn(
                        'mr-3 h-5 w-5 flex-shrink-0 transition-colors',
                        isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                      )}
                    />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>
        </nav>

        {/* Sidebar Footer (Status) */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center space-x-3">
            <div className={cn("w-2 h-2 rounded-full", apiOk ? "bg-emerald-500" : "bg-red-500")} />
            <div className="flex flex-col">
              <span className="text-xs font-medium text-foreground">System Status</span>
              <span className="text-[10px] text-muted-foreground">
                {apiOk ? 'Online' : 'Offline'} • {personaCount ?? 0} Personas
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navigation Bar */}
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6">
          <div className="flex items-center md:hidden">
            <Button variant="ghost" size="icon" className="mr-2">
              <Menu className="h-5 w-5" />
            </Button>
            <span className="font-bold text-lg">PersonaSim</span>
          </div>

          {/* Breadcrumbs / Page Title (Placeholder) */}
          <div className="hidden md:flex items-center text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              {navigation.find(n => n.href === location.pathname)?.name || 'Dashboard'}
            </span>
          </div>

          {/* Right Actions */}
          <div className="flex items-center space-x-4">
            <div className="relative hidden sm:block">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search..."
                className="w-64 pl-9 h-9 bg-muted/50 border-none focus-visible:ring-1"
              />
            </div>

            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
              <Bell className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
              <Settings className="h-5 w-5" />
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <Avatar className="h-8 w-8">
              <AvatarImage src="https://github.com/shadcn.png" />
              <AvatarFallback>AD</AvatarFallback>
            </Avatar>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-background p-8">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
