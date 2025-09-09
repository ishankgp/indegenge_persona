import { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, PlayCircle, BarChart3, TrendingUp, Activity, Clock, CheckCircle, AlertCircle } from 'lucide-react';

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

export function Dashboard() {
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header Section */}
      <div className="gradient-bg text-white p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center space-x-4 mb-6">
            <div className="p-3 bg-white/20 rounded-xl">
              <Activity className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-4xl font-bold">PharmaPersonaSim</h1>
              <p className="text-blue-100 text-lg">
                Transform qualitative personas into quantitative insights
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-8 -mt-8">
        {/* Stats Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card className="stat-card border-l-4 border-l-primary">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Personas</CardTitle>
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="stat-number">
                {loading ? '...' : error ? 'Error' : personas.length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Ready for simulation</p>
            </CardContent>
          </Card>

          <Card className="stat-card border-l-4 border-l-secondary">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Simulations Run</CardTitle>
              <div className="p-2 bg-secondary/10 rounded-lg">
                <PlayCircle className="h-4 w-4 text-secondary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="stat-number">
                {loading ? '...' : stats.monthly_simulations}
              </div>
              <p className="text-xs text-muted-foreground mt-1">This month</p>
            </CardContent>
          </Card>

          <Card className="stat-card border-l-4 border-l-success">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Avg. Response Rate</CardTitle>
              <div className="p-2 bg-success/10 rounded-lg">
                <BarChart3 className="h-4 w-4 text-success" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="stat-number">
                {loading ? '...' : stats.avg_response_rate ? `${stats.avg_response_rate.toFixed(1)}%` : '-'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Across all cohorts</p>
            </CardContent>
          </Card>

          <Card className="stat-card border-l-4 border-l-warning">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Insights Generated</CardTitle>
              <div className="p-2 bg-warning/10 rounded-lg">
                <TrendingUp className="h-4 w-4 text-warning" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="stat-number">
                {loading ? '...' : stats.total_insights}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Actionable insights</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-8 md:grid-cols-3">
          {/* Quick Start Guide */}
          <Card className="stat-card">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg">Quick Start Guide</CardTitle>
              </div>
              <CardDescription>Get started with PharmaPersonaSim</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold">1</div>
                  <div>
                    <p className="text-sm font-medium">Create personas in the Persona Library</p>
                    <p className="text-xs text-muted-foreground">Generate detailed patient personas</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-secondary text-white rounded-full flex items-center justify-center text-xs font-bold">2</div>
                  <div>
                    <p className="text-sm font-medium">Select personas for your cohort</p>
                    <p className="text-xs text-muted-foreground">Build targeted simulation groups</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-success text-white rounded-full flex items-center justify-center text-xs font-bold">3</div>
                  <div>
                    <p className="text-sm font-medium">Input your stimulus content</p>
                    <p className="text-xs text-muted-foreground">Ad copy, messaging, or materials</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-warning text-white rounded-full flex items-center justify-center text-xs font-bold">4</div>
                  <div>
                    <p className="text-sm font-medium">Run simulation & view results</p>
                    <p className="text-xs text-muted-foreground">Get actionable insights in Analytics</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Persona Distribution */}
          <Card className="stat-card">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-secondary/10 rounded-lg">
                  <Users className="h-5 w-5 text-secondary" />
                </div>
                <CardTitle className="text-lg">Persona Distribution</CardTitle>
              </div>
              <CardDescription>Current persona breakdown by condition</CardDescription>
            </CardHeader>
            <CardContent>
              {Object.keys(conditionStats).length > 0 ? (
                <div className="space-y-3">
                  {Object.entries(conditionStats).map(([condition, count]) => (
                    <div key={condition} className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">{condition}</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-primary to-secondary h-2 rounded-full"
                            style={{ width: `${(count / personas.length) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-bold text-primary">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No personas available</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="stat-card">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-warning/10 rounded-lg">
                  <Clock className="h-5 w-5 text-warning" />
                </div>
                <CardTitle className="text-lg">Recent Activity</CardTitle>
              </div>
              <CardDescription>Your latest simulations and updates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {personas.length > 0 ? (
                  personas.slice(0, 3).map((persona) => (
                    <div key={persona.id} className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-success rounded-full"></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {persona.name} created
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {persona.condition} • {persona.age} years old
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No recent activity</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
