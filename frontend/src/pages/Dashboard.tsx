import { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  PlayCircle, 
  BarChart3, 
  TrendingUp, 
  Activity, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Sparkles,
  Brain,
  Target,
  ArrowUp,
  ArrowDown,
  Zap,
  Award,
  Calendar,
  FileText,
  ChevronRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

interface Persona {
  id: number;
  name: string;
  persona_type: string;
  age: number;
  gender: string;
  condition: string;
  location: string;
  full_persona_json: string;
  created_at: string;
}

interface StatCard {
  title: string;
  value: string | number;
  subtitle: string;
  icon: any;
  trend?: number;
  color: string;
  bgGradient: string;
}

export function Dashboard() {
  const navigate = useNavigate();
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [stats, setStats] = useState<any>({
    total_simulations: 0,
    monthly_simulations: 0,
    avg_response_rate: 0,
    total_insights: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    fetchData();
    // Simulate progress animation
    const timer = setTimeout(() => setProgress(87), 500);
    return () => clearTimeout(timer);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const personasResponse = await axios.get(`${API_BASE_URL}/personas/`);
      setPersonas(personasResponse.data);
      
      const statsResponse = await axios.get(`${API_BASE_URL}/stats`);
      setStats(statsResponse.data);
      
      setError(null);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const getConditionStats = () => {
    const conditions = personas.map(p => p.condition);
    const conditionCounts = conditions.reduce((acc, condition) => {
      acc[condition] = (acc[condition] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return conditionCounts;
  };

  const conditionStats = getConditionStats();

  const statCards: StatCard[] = [
    {
      title: 'Total Personas',
      value: loading ? '...' : error ? 'Error' : personas.length,
      subtitle: 'Ready for simulation',
      icon: Users,
      trend: 12,
      color: 'text-violet-600',
      bgGradient: 'from-violet-500/20 to-purple-500/20'
    },
    {
      title: 'Simulations Run',
      value: loading ? '...' : stats.monthly_simulations,
      subtitle: 'This month',
      icon: PlayCircle,
      trend: 8,
      color: 'text-blue-600',
      bgGradient: 'from-blue-500/20 to-cyan-500/20'
    },
    {
      title: 'Avg. Response Rate',
      value: loading ? '...' : stats.avg_response_rate ? `${stats.avg_response_rate.toFixed(1)}%` : '-',
      subtitle: 'Across all cohorts',
      icon: Target,
      trend: -3,
      color: 'text-emerald-600',
      bgGradient: 'from-emerald-500/20 to-green-500/20'
    },
    {
      title: 'Insights Generated',
      value: loading ? '...' : stats.total_insights,
      subtitle: 'Actionable insights',
      icon: Brain,
      trend: 24,
      color: 'text-amber-600',
      bgGradient: 'from-amber-500/20 to-orange-500/20'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-violet-50 dark:from-gray-950 dark:via-gray-900 dark:to-violet-950">
      {/* Enhanced Header Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-secondary">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 right-20 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse animation-delay-2000"></div>
          <div className="absolute top-40 right-40 w-64 h-64 bg-white/5 rounded-full blur-2xl animate-pulse animation-delay-4000"></div>
        </div>

        <div className="relative z-10 px-8 py-12">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-white/20 rounded-2xl blur-xl"></div>
                  <div className="relative p-4 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20">
                    <Activity className="h-10 w-10 text-white" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-5xl font-bold text-white">Dashboard</h1>
                    <Sparkles className="h-6 w-6 text-yellow-300 animate-pulse" />
                  </div>
                  <p className="text-white/90 text-lg flex items-center gap-2">
                    Transform qualitative personas into quantitative insights
                    <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium border border-white/30">
                      AI-Powered
                    </span>
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                  <div className="text-3xl font-bold text-white flex items-center gap-2">
                    <Zap className="h-8 w-8 text-yellow-300" />
                    98%
                  </div>
                  <div className="text-white/80 text-sm mt-1">System Health</div>
                  <Progress value={progress} className="mt-2 h-2" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 -mt-8">
        {/* Enhanced Stats Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          {statCards.map((stat, index) => (
            <Card 
              key={stat.title}
              className="group relative overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 backdrop-blur-sm bg-white/90 dark:bg-gray-900/90"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.bgGradient} opacity-50 group-hover:opacity-70 transition-opacity`}></div>
              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {stat.title}
                </CardTitle>
                <div className={`p-2.5 rounded-xl bg-gradient-to-br ${stat.bgGradient} backdrop-blur-sm`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent className="relative">
                <div className="flex items-baseline justify-between">
                  <div className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    {stat.value}
                  </div>
                  {stat.trend && (
                    <div className={`flex items-center gap-1 text-sm font-medium ${
                      stat.trend > 0 ? 'text-emerald-600' : 'text-red-600'
                    }`}>
                      {stat.trend > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                      {Math.abs(stat.trend)}%
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{stat.subtitle}</p>
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary to-secondary transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Quick Actions Card */}
          <Card className="lg:col-span-1 border-0 shadow-xl backdrop-blur-sm bg-white/90 dark:bg-gray-900/90">
            <CardHeader className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-gradient-to-br from-primary to-secondary rounded-xl">
                    <Zap className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Quick Actions</CardTitle>
                    <CardDescription>Get started quickly</CardDescription>
                  </div>
                </div>
                <Award className="h-8 w-8 text-amber-500" />
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <Button 
                  className="w-full justify-between bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg"
                  onClick={() => navigate('/personas')}
                >
                  <span className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Create New Persona
                  </span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button 
                  className="w-full justify-between bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-lg"
                  onClick={() => navigate('/simulation')}
                >
                  <span className="flex items-center gap-2">
                    <PlayCircle className="h-4 w-4" />
                    Run Simulation
                  </span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button 
                  className="w-full justify-between bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white shadow-lg"
                  onClick={() => navigate('/analytics')}
                >
                  <span className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    View Analytics
                  </span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Separator className="my-4" />
                <Button 
                  variant="outline"
                  className="w-full justify-between border-2"
                >
                  <span className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Documentation
                  </span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Enhanced Persona Distribution */}
          <Card className="lg:col-span-1 border-0 shadow-xl backdrop-blur-sm bg-white/90 dark:bg-gray-900/90">
            <CardHeader className="bg-gradient-to-r from-secondary/10 to-primary/10 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-gradient-to-br from-secondary to-primary rounded-xl">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Persona Analytics</CardTitle>
                    <CardDescription>Distribution by condition</CardDescription>
                  </div>
                </div>
                <span className="text-2xl font-bold text-primary">{personas.length}</span>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {Object.keys(conditionStats).length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(conditionStats).slice(0, 5).map(([condition, count], index) => (
                    <div key={condition} className="group">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-primary transition-colors">
                          {condition}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-primary">{count}</span>
                          <span className="text-xs text-gray-500">
                            ({((count / personas.length) * 100).toFixed(0)}%)
                          </span>
                        </div>
                      </div>
                      <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary to-secondary rounded-full transition-all duration-500 ease-out"
                          style={{ 
                            width: `${(count / personas.length) * 100}%`,
                            animationDelay: `${index * 100}ms`
                          }}
                        />
                      </div>
                    </div>
                  ))}
                  {Object.keys(conditionStats).length > 5 && (
                    <Button variant="ghost" className="w-full mt-2" onClick={() => navigate('/personas')}>
                      View all conditions
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <Users className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">No personas created yet</p>
                  <Button 
                    size="sm"
                    className="bg-gradient-to-r from-primary to-secondary text-white"
                    onClick={() => navigate('/personas')}
                  >
                    Create First Persona
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity with Timeline */}
          <Card className="lg:col-span-1 border-0 shadow-xl backdrop-blur-sm bg-white/90 dark:bg-gray-900/90">
            <CardHeader className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl">
                    <Clock className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Recent Activity</CardTitle>
                    <CardDescription>Latest updates</CardDescription>
                  </div>
                </div>
                <Calendar className="h-5 w-5 text-gray-400" />
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {personas.length > 0 ? (
                  <>
                    {personas.slice(0, 4).map((persona, index) => (
                      <div key={persona.id} className="relative flex items-start space-x-3 group">
                        {index < personas.slice(0, 4).length - 1 && (
                          <div className="absolute left-4 top-10 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700"></div>
                        )}
                        <div className="relative">
                          <div className="w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center">
                            <CheckCircle className="h-4 w-4 text-white" />
                          </div>
                          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-gray-900 animate-pulse"></div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-primary transition-colors">
                            {persona.name} created
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {persona.condition} • {persona.age}y • {persona.gender}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            {new Date(persona.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                    <Button variant="ghost" className="w-full mt-2" onClick={() => navigate('/personas')}>
                      View all activity
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  </>
                ) : (
                  <div className="text-center py-12">
                    <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                      <AlertCircle className="h-8 w-8 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">No recent activity</p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      Start by creating personas
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* System Status Card */}
        <Card className="mt-8 border-0 shadow-xl backdrop-blur-sm bg-gradient-to-r from-primary/5 to-secondary/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-gradient-to-br from-emerald-500 to-green-500 rounded-xl">
                  <Activity className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">System Status</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">All systems operational</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-emerald-600">99.9%</p>
                  <p className="text-xs text-gray-500">Uptime</p>
                </div>
                <Separator orientation="vertical" className="h-12" />
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">23ms</p>
                  <p className="text-xs text-gray-500">Response Time</p>
                </div>
                <Separator orientation="vertical" className="h-12" />
                <div className="text-center">
                  <p className="text-2xl font-bold text-violet-600">v2.0</p>
                  <p className="text-xs text-gray-500">Version</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}