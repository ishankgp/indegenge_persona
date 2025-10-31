import { Outlet, Link, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getApiBaseUrl, checkHealth } from '@/lib/api';
import { 
  LayoutDashboard, 
  Users, 
  PlayCircle, 
  BarChart3,
  Activity,
  Sparkles,
  ChevronRight,
  UserPlus
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navigation = [
  { 
    name: 'Dashboard', 
    href: '/', 
    icon: LayoutDashboard,
    description: 'Overview & metrics'
  },
  { 
    name: 'Create Persona', 
    href: '/create-persona', 
    icon: UserPlus,
    description: 'Generate new personas'
  },
  { 
    name: 'Persona Library', 
    href: '/personas', 
    icon: Users,
    description: 'Manage patient personas'
  },
  { 
    name: 'Simulation Hub', 
    href: '/simulation', 
    icon: PlayCircle,
    description: 'Run AI simulations'
  },
  { 
    name: 'Analytics', 
    href: '/analytics', 
    icon: BarChart3,
    description: 'Insights & reports'
  },
];

export function Layout() {
  const location = useLocation();
  const [apiOk, setApiOk] = useState<boolean | null>(null);
  const [personaCount, setPersonaCount] = useState<number | undefined>();
  const [baseUrl] = useState(getApiBaseUrl());

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
    <div className="flex h-screen bg-gradient-to-br from-purple-50 via-violet-50/30 to-fuchsia-50/20">
      {/* Enhanced Sidebar */}
      <div className="w-72 glass border-r border-border/50 shadow-2xl">
        <div className="flex h-full flex-col">
          {/* Premium Logo Section */}
          <div className="gradient-bg text-white p-8 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
            <div className="relative">
              <div className="flex items-center space-x-4 mb-3">
                <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm border border-white/30">
                  <Activity className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">Indegene PersonaSim</h1>
                  <p className="text-purple-100 text-sm font-medium">Healthcare Intelligence</p>
                </div>
              </div>
              <div className="flex items-center space-x-2 text-purple-100">
                <Sparkles className="h-4 w-4" />
                <span className="text-xs font-medium">Powered by Indegene</span>
              </div>
            </div>
          </div>

          {/* Enhanced Navigation */}
          <nav className="flex-1 px-6 py-8 space-y-3">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-6 px-3">
              Navigation
            </div>
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    'group relative flex items-center rounded-2xl px-4 py-4 text-sm font-medium transition-all duration-300 ease-out',
                    isActive
                      ? 'nav-link-active shadow-lg transform scale-[1.02]'
                      : 'text-gray-700 hover:bg-gradient-to-r hover:from-primary/5 hover:to-secondary/5 hover:text-primary hover:shadow-md'
                  )}
                >
                  <div className={cn(
                    'flex items-center justify-center w-10 h-10 rounded-xl mr-4 transition-all duration-300',
                    isActive 
                      ? 'bg-white/20 text-white' 
                      : 'bg-muted/50 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'
                  )}>
                    <item.icon className="h-5 w-5" />
                  </div>
                  
                  <div className="flex-1">
                    <div className={cn(
                      'font-semibold transition-colors',
                      isActive ? 'text-white' : 'text-gray-900 group-hover:text-primary'
                    )}>
                      {item.name}
                    </div>
                    <div className={cn(
                      'text-xs transition-colors',
                      isActive ? 'text-purple-100' : 'text-muted-foreground group-hover:text-primary/70'
                    )}>
                      {item.description}
                    </div>
                  </div>
                  
                  {isActive && (
                    <ChevronRight className="h-4 w-4 text-white ml-2" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Enhanced Footer */}
          <div className="border-t border-border/50 p-6 bg-gradient-to-r from-muted/30 to-muted/10">
            <div className="text-center">
              <div className="flex flex-col items-center mb-2 space-y-1">
                <div className="inline-flex items-center space-x-2 text-sm font-medium text-gray-700">
                  <div className={"w-2 h-2 rounded-full " + (apiOk === null ? 'bg-yellow-400 animate-pulse' : apiOk ? 'bg-green-500 animate-pulse' : 'bg-red-500')}></div>
                  <span>{apiOk === null ? 'Checking API...' : apiOk ? 'API Online' : 'API Down'}</span>
                </div>
                <div className="text-[10px] text-muted-foreground font-mono">
                  {baseUrl || 'relative'} {personaCount !== undefined && apiOk && (<span>• {personaCount} personas</span>)}
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Enabling healthcare organizations<br />to be future ready
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Main Content */}
      <div className="flex-1 overflow-auto bg-gradient-to-br from-background via-muted/10 to-accent/20">
        <div className="min-h-full">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
