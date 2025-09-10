import { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  Plus,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';

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

export default function Dashboard() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [stats, setStats] = useState<any>({
    total_simulations: 0,
    monthly_simulations: 0,
    avg_response_rate: 0,
    total_insights: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch personas
      const personasResponse = await axios.get(`${API_BASE_URL}/personas/`);
      setPersonas(personasResponse.data);
      
      // Fetch statistics
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

  return (
    <div className="min-h-screen animate-fade-in">
      {/* Enhanced Header Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-bg"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-black/10 to-transparent"></div>
        <div className="relative p-8 lg:p-12">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-6 lg:space-y-0">
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm border border-white/30">
                    <Activity className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h1 className="text-4xl lg:text-5xl font-bold text-white">
                      Welcome Back
                    </h1>
                    <p className="text-blue-100 text-lg lg:text-xl font-medium">
                      Transform qualitative personas into quantitative insights
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4 text-blue-100">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium">Live System</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Sparkles className="h-4 w-4" />
                    <span className="text-sm font-medium">AI-Powered</span>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  className="bg-white/20 hover:bg-white/30 text-white border border-white/30 backdrop-blur-sm"
                  variant="outline"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Persona
                </Button>
                <Button 
                  className="bg-white text-primary hover:bg-white/90 shadow-lg"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Run Simulation
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Stats Grid */}
      <div className="max-w-7xl mx-auto px-8 -mt-12 relative z-10">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8 animate-slide-up">
          {/* Total Personas Card */}
          <Card className="stat-card-premium border-0 shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <div>
                <CardTitle className="metric-label">Total Personas</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Ready for simulation
                </CardDescription>
              </div>
              <div className="p-3 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl">
                <Users className="h-5 w-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="stat-number mb-2">
                {loading ? '...' : error ? 'Error' : personas.length}
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex items-center text-green-600 text-xs font-medium">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Active
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Simulations Run Card */}
          <Card className="stat-card-premium border-0 shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <div>
                <CardTitle className="metric-label">Simulations Run</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  This month
                </CardDescription>
              </div>
              <div className="p-3 bg-gradient-to-br from-secondary/20 to-secondary/10 rounded-xl">
                <PlayCircle className="h-5 w-5 text-secondary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="stat-number mb-2">
                {loading ? '...' : stats.total_simulations || 0}
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex items-center text-blue-600 text-xs font-medium">
                  <Clock className="h-3 w-3 mr-1" />
                  +{stats.monthly_simulations || 0} monthly
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Response Rate Card */}
          <Card className="stat-card-premium border-0 shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <div>
                <CardTitle className="metric-label">Avg. Response Rate</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Across all cohorts
                </CardDescription>
              </div>
              <div className="p-3 bg-gradient-to-br from-green-500/20 to-green-500/10 rounded-xl">
                <BarChart3 className="h-5 w-5 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="stat-number mb-2">
                {loading ? '...' : `${stats.avg_response_rate || 0}%`}
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex items-center text-green-600 text-xs font-medium">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Optimal range
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Insights Generated Card */}
          <Card className="stat-card-premium border-0 shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <div>
                <CardTitle className="metric-label">Insights Generated</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Actionable insights
                </CardDescription>
              </div>
              <div className="p-3 bg-gradient-to-br from-purple-500/20 to-purple-500/10 rounded-xl">
                <Sparkles className="h-5 w-5 text-purple-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="stat-number mb-2">
                {loading ? '...' : stats.total_insights || 0}
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex items-center text-purple-600 text-xs font-medium">
                  <Activity className="h-3 w-3 mr-1" />
                  AI-powered
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Main Content Grid */}
        <div className="grid gap-8 lg:grid-cols-3 mb-8">
          {/* Quick Start Guide */}
          <Card className="lg:col-span-2 stat-card-premium border-0 shadow-xl">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-semibold text-gray-900 mb-2">
                    Quick Start Guide
                  </CardTitle>
                  <CardDescription>
                    Get started with PharmaPersonaSim
                  </CardDescription>
                </div>
                <div className="p-3 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl">
                  <CheckCircle className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4">
                <div className="flex items-start space-x-4 p-4 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-xl border border-primary/20">
                  <div className="flex items-center justify-center w-8 h-8 bg-primary text-white rounded-lg text-sm font-bold">
                    1
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 mb-1">Create personas in the Persona Library</h4>
                    <p className="text-sm text-muted-foreground">Generate detailed patient personas</p>
                  </div>
                  <Button variant="outline" size="sm" className="btn-primary">
                    <Plus className="h-4 w-4 mr-1" />
                    Create
                  </Button>
                </div>

                <div className="flex items-start space-x-4 p-4 bg-gradient-to-r from-secondary/5 to-primary/5 rounded-xl border border-secondary/20">
                  <div className="flex items-center justify-center w-8 h-8 bg-secondary text-white rounded-lg text-sm font-bold">
                    2
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 mb-1">Select personas for your cohort</h4>
                    <p className="text-sm text-muted-foreground">Build targeted simulation groups</p>
                  </div>
                  <Button variant="outline" size="sm" className="btn-secondary">
                    <Users className="h-4 w-4 mr-1" />
                    Select
                  </Button>
                </div>

                <div className="flex items-start space-x-4 p-4 bg-gradient-to-r from-green-500/5 to-blue-500/5 rounded-xl border border-green-500/20">
                  <div className="flex items-center justify-center w-8 h-8 bg-green-600 text-white rounded-lg text-sm font-bold">
                    3
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 mb-1">Input your stimulus content</h4>
                    <p className="text-sm text-muted-foreground">Add copy, messaging, or materials</p>
                  </div>
                  <Button variant="outline" size="sm">
                    <Activity className="h-4 w-4 mr-1" />
                    Add Content
                  </Button>
                </div>

                <div className="flex items-start space-x-4 p-4 bg-gradient-to-r from-purple-500/5 to-pink-500/5 rounded-xl border border-purple-500/20">
                  <div className="flex items-center justify-center w-8 h-8 bg-purple-600 text-white rounded-lg text-sm font-bold">
                    4
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 mb-1">Run simulation & view results</h4>
                    <p className="text-sm text-muted-foreground">Get actionable insights in Analytics</p>
                  </div>
                  <Button variant="outline" size="sm">
                    <Zap className="h-4 w-4 mr-1" />
                    Simulate
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Persona Distribution */}
          <Card className="stat-card-premium border-0 shadow-xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-semibold text-gray-900 mb-2">
                Persona Distribution
              </CardTitle>
              <CardDescription>
                Current persona breakdown by condition
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : Object.keys(conditionStats).length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(conditionStats).map(([condition, count]) => (
                    <div key={condition} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700 truncate">
                          {condition}
                        </span>
                        <span className="text-sm font-bold text-primary">
                          {count}
                        </span>
                      </div>
                       <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                         <div 
                           className="bg-gradient-to-r from-primary to-secondary h-full rounded-full transition-all duration-500" 
                           style={{ width: `${(count / personas.length) * 100}%` }}
                         />
                       </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="p-4 bg-muted/50 rounded-2xl inline-block mb-4">
                    <AlertCircle className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground text-sm">No personas available</p>
                  <Button size="sm" className="mt-3 btn-primary">
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Persona
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="stat-card-premium border-0 shadow-xl">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-semibold text-gray-900 mb-2">
                  Recent Activity
                </CardTitle>
                <CardDescription>
                  Your latest simulations and updates
                </CardDescription>
              </div>
              <div className="p-3 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl">
                <Clock className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {personas.length > 0 ? (
              <div className="space-y-4">
                {personas.slice(0, 3).map((persona) => (
                  <div key={persona.id} className="flex items-center space-x-4 p-3 bg-gradient-to-r from-muted/30 to-muted/10 rounded-xl">
                    <div className="w-10 h-10 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-xl flex items-center justify-center">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {persona.name} created
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {persona.condition} • {persona.age} years old • {persona.location}
                      </p>
                    </div>
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="p-4 bg-muted/50 rounded-2xl inline-block mb-4">
                  <Activity className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground text-sm mb-2">No recent activity</p>
                <p className="text-xs text-muted-foreground">
                  Start by creating personas and running simulations to see activity here
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
