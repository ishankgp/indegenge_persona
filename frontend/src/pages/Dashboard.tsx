"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { PersonasAPI, StatsAPI } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Users,
  PlayCircle,
  BarChart3,
  TrendingUp,
  Activity,
  Sparkles,
  Plus,
  Zap,
  ArrowRight,
  LayoutDashboard,
  AlertCircle,
  RefreshCw
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"

interface Persona {
  id: number
  name: string
  persona_type: string
  age: number
  gender: string
  condition: string
  location: string
  full_persona_json: string
  created_at: string
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [personas, setPersonas] = useState<Persona[]>([])
  const [stats, setStats] = useState<any>({
    total_simulations: 0,
    monthly_simulations: 0,
    avg_response_rate: 0,
    total_insights: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      const [personasData, statsData] = await Promise.all([PersonasAPI.list(), StatsAPI.stats()])
      console.log("Dashboard: Fetched personas:", { count: personasData?.length || 0, data: personasData })
      setPersonas(Array.isArray(personasData) ? personasData : [])
      setStats(statsData || {
        total_simulations: 0,
        monthly_simulations: 0,
        avg_response_rate: 0,
        total_insights: 0,
      })
    } catch (error: any) {
      console.error("Error fetching data:", error)
      const errorMessage = error?.response?.data?.detail || error?.message || "Failed to fetch data. Please check your connection and try again."
      setError(errorMessage)
      toast({
        title: "Error loading dashboard",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const getConditionStats = () => {
    const conditions = personas
      .map((p) => p.condition)
      .filter((condition): condition is string => condition != null && condition.trim() !== '')
    const conditionCounts = conditions.reduce(
      (acc, condition) => {
        acc[condition] = (acc[condition] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )
    return conditionCounts
  }

  const conditionStats = getConditionStats()

  return (
    <div className="min-h-screen bg-background animate-fade-in">
      {/* Indegene Purple Page Header */}
      <div className="bg-gradient-to-r from-[hsl(262,60%,38%)] via-[hsl(262,60%,42%)] to-[hsl(280,60%,45%)]">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                <LayoutDashboard className="h-8 w-8 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold text-white tracking-tight">Dashboard</h1>
                  <Badge className="bg-white/20 backdrop-blur-sm text-white border-white/30 font-normal">
                    <Activity className="h-3 w-3 mr-1" />
                    Live
                  </Badge>
                </div>
                <p className="text-white/80 mt-1">Overview of your personas and simulation activities</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                className="bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20"
                onClick={() => navigate('/create-persona')}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Persona
              </Button>
              <Button 
                className="bg-white text-primary hover:bg-white/90"
                onClick={() => navigate('/simulation')}
              >
                <Zap className="h-4 w-4 mr-2" />
                Run Simulation
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8 space-y-8">
      {/* Error Banner */}
      {error && (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-destructive" />
                <div>
                  <p className="font-medium text-destructive">Failed to load dashboard data</p>
                  <p className="text-sm text-muted-foreground mt-1">{error}</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={fetchData}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Total Personas</CardTitle>
            <div className="p-2 bg-primary/10 rounded-full">
              <Users className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{loading ? "..." : error ? "Error" : personas.length}</div>
            <div className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
              <TrendingUp className="h-3 w-3 mr-1" />
              Active
            </div>
            <span className="text-xs text-muted-foreground ml-2">ready for simulation</span>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Simulations Run</CardTitle>
            <div className="p-2 bg-blue-100 rounded-full">
              <PlayCircle className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{loading ? "..." : stats.total_simulations || 0}</div>
            <p className="text-xs text-muted-foreground mt-2">
              <span className="font-medium text-foreground">+{stats.monthly_simulations || 0}</span> this month
            </p>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Avg. Response Rate</CardTitle>
            <div className="p-2 bg-amber-100 rounded-full">
              <BarChart3 className="h-4 w-4 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {loading ? "..." : `${(stats.avg_response_rate || 0).toFixed(1)}%`}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Across all cohorts
            </p>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Insights Generated</CardTitle>
            <div className="p-2 bg-purple-100 rounded-full">
              <Sparkles className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{loading ? "..." : stats.total_insights || 0}</div>
            <p className="text-xs text-muted-foreground mt-2">
              AI-powered analysis
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Quick Start Guide */}
        <Card className="lg:col-span-2 card-base">
          <CardHeader className="pb-4 border-b border-border/50 bg-primary/5">
            <div className="flex items-center gap-2">
              <div className="h-5 w-1 bg-primary rounded-full" />
              <CardTitle className="text-lg font-semibold text-foreground">Quick Start Guide</CardTitle>
            </div>
            <CardDescription className="text-sm">Get started with PersonaSim in 4 easy steps.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { title: "Create personas", desc: "Generate detailed patient personas", icon: Plus, action: "Create" },
              { title: "Select cohort", desc: "Build targeted simulation groups", icon: Users, action: "Select" },
              { title: "Input content", desc: "Add copy, messaging, or materials", icon: Activity, action: "Add Content" },
              { title: "Run simulation", desc: "Get actionable insights in Analytics", icon: Zap, action: "Simulate" },
            ].map((step, i) => (
              <div key={i} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                    {i + 1}
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">{step.title}</h4>
                    <p className="text-xs text-muted-foreground">{step.desc}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="h-8">
                  {step.action} <ArrowRight className="ml-2 h-3 w-3" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Persona Distribution */}
        <div className="space-y-8">
          <Card>
            <CardHeader className="pb-3 border-b border-border/50">
              <div className="flex items-center gap-2">
                <div className="h-4 w-1 bg-primary rounded-full" />
                <CardTitle className="text-base font-semibold">Persona Distribution</CardTitle>
              </div>
              <CardDescription className="text-xs">Breakdown by condition</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8 text-muted-foreground">Loading...</div>
              ) : error ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Unable to load persona distribution</p>
                </div>
              ) : Object.keys(conditionStats).length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(conditionStats).map(([condition, count]) => (
                    <div key={condition} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{condition}</span>
                        <span className="text-muted-foreground">{count}</span>
                      </div>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${(count / personas.length) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm font-medium text-muted-foreground mb-1">No personas yet</p>
                  <p className="text-xs text-muted-foreground mb-4">Create your first persona to get started</p>
                  <Button size="sm" onClick={() => navigate('/create-persona')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Persona
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 border-b border-border/50">
              <div className="flex items-center gap-2">
                <div className="h-4 w-1 bg-primary rounded-full" />
                <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
              </div>
              <CardDescription className="text-xs">Latest updates</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-6 text-muted-foreground text-sm">Loading...</div>
              ) : error ? (
                <div className="text-center py-6">
                  <AlertCircle className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Unable to load recent activity</p>
                </div>
              ) : personas.length > 0 ? (
                <div className="space-y-4">
                  {personas.slice(0, 3).map((persona) => (
                    <div key={persona.id} className="flex items-start gap-3 pb-3 border-b last:border-0 last:pb-0">
                      <div className="mt-1">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{persona.name} created</p>
                        <p className="text-xs text-muted-foreground">
                          {persona.condition || 'N/A'} • {persona.age || 'N/A'}y
                        </p>
                      </div>
                    </div>
                  ))}
                  {personas.length > 3 && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full mt-2"
                      onClick={() => navigate('/personas')}
                    >
                      View all personas <ArrowRight className="ml-2 h-3 w-3" />
                    </Button>
                  )}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Activity className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm font-medium text-muted-foreground mb-1">No recent activity</p>
                  <p className="text-xs text-muted-foreground mb-4">Create personas to see activity here</p>
                  <Button size="sm" variant="outline" onClick={() => navigate('/create-persona')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Persona
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      </div>
    </div>
  )
}
