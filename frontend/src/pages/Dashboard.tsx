"use client"

import { useState, useEffect } from "react"
import { PersonasAPI, StatsAPI } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Users,
  PlayCircle,
  BarChart3,
  TrendingUp,
  Activity,
  Sparkles,
  Plus,
  Zap,
  ArrowRight
} from "lucide-react"
import { Button } from "@/components/ui/button"

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
      const [personasData, statsData] = await Promise.all([PersonasAPI.list(), StatsAPI.stats()])
      setPersonas(personasData)
      setStats(statsData)
      setError(null)
    } catch (error) {
      console.error("Error fetching data:", error)
      setError("Failed to fetch data")
    } finally {
      setLoading(false)
    }
  }

  const getConditionStats = () => {
    const conditions = personas.map((p) => p.condition)
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
    <div className="space-y-8 animate-fade-in">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Overview of your personas and simulation activities.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Create Persona
          </Button>
          <Button>
            <Zap className="h-4 w-4 mr-2" />
            Run Simulation
          </Button>
        </div>
      </div>

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
                <div className="text-center py-8 text-muted-foreground">
                  No personas available.
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
              {personas.length > 0 ? (
                <div className="space-y-4">
                  {personas.slice(0, 3).map((persona) => (
                    <div key={persona.id} className="flex items-start gap-3 pb-3 border-b last:border-0 last:pb-0">
                      <div className="mt-1">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{persona.name} created</p>
                        <p className="text-xs text-muted-foreground">
                          {persona.condition} • {persona.age}y
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  No recent activity.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
