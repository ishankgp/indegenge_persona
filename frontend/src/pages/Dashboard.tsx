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
  Clock,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Plus,
  Zap,
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
    <div className="min-h-screen animate-fade-in bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50">
      {/* Enhanced Header Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-500"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-purple-900/10"></div>
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)",
            backgroundSize: "20px 20px",
          }}
        ></div>
        <div className="relative p-8 lg:p-12">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-6 lg:space-y-0">
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm border border-white/30 shadow-xl">
                    <Activity className="h-8 w-8 text-white drop-shadow-sm" />
                  </div>
                  <div>
                    <h1 className="text-4xl lg:text-6xl font-bold text-white drop-shadow-sm">Welcome Back</h1>
                    <p className="text-blue-100 text-lg lg:text-xl font-medium drop-shadow-sm">
                      Transform qualitative personas into quantitative insights
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-6 text-blue-100">
                  <div className="flex items-center space-x-2 bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-sm">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-lg shadow-emerald-400/50"></div>
                    <span className="text-sm font-medium">Live System</span>
                  </div>
                  <div className="flex items-center space-x-2 bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-sm">
                    <Sparkles className="h-4 w-4 text-yellow-300" />
                    <span className="text-sm font-medium">AI-Powered</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  className="bg-white/20 hover:bg-white/30 text-white border border-white/30 backdrop-blur-sm shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
                  variant="outline"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Persona
                </Button>
                <Button className="bg-gradient-to-r from-white to-blue-50 text-indigo-600 hover:from-blue-50 hover:to-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 font-semibold">
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
          <Card className="group bg-gradient-to-br from-white via-blue-50/50 to-indigo-50/30 border-0 shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 backdrop-blur-sm relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-blue-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative z-10">
              <div>
                <CardTitle className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Total Personas
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 mt-1">Ready for simulation</CardDescription>
              </div>
              <div className="p-3 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl shadow-lg group-hover:shadow-indigo-500/25 transition-all duration-300">
                <Users className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-3xl font-bold bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 bg-clip-text text-transparent mb-2">
                {loading ? "..." : error ? "Error" : personas.length}
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex items-center text-emerald-600 text-xs font-semibold bg-emerald-50 px-2 py-1 rounded-full">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Active
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Simulations Run Card */}
          <Card className="group bg-gradient-to-br from-white via-purple-50/50 to-pink-50/30 border-0 shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 backdrop-blur-sm relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-pink-500/5 to-rose-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative z-10">
              <div>
                <CardTitle className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Simulations Run
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 mt-1">This month</CardDescription>
              </div>
              <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl shadow-lg group-hover:shadow-purple-500/25 transition-all duration-300">
                <PlayCircle className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-3xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 bg-clip-text text-transparent mb-2">
                {loading ? "..." : stats.total_simulations || 0}
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex items-center text-blue-600 text-xs font-semibold bg-blue-50 px-2 py-1 rounded-full">
                  <Clock className="h-3 w-3 mr-1" />+{stats.monthly_simulations || 0} monthly
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Response Rate Card */}
          <Card className="group bg-gradient-to-br from-white via-emerald-50/50 to-teal-50/30 border-0 shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 backdrop-blur-sm relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-teal-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative z-10">
              <div>
                <CardTitle className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Avg. Response Rate
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 mt-1">Across all cohorts</CardDescription>
              </div>
              <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg group-hover:shadow-emerald-500/25 transition-all duration-300">
                <BarChart3 className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-3xl font-bold bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent mb-2">
                {loading ? "..." : `${(stats.avg_response_rate || 0).toFixed(2)}%`}
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex items-center text-emerald-600 text-xs font-semibold bg-emerald-50 px-2 py-1 rounded-full">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Optimal range
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Insights Generated Card */}
          <Card className="group bg-gradient-to-br from-white via-amber-50/50 to-orange-50/30 border-0 shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 backdrop-blur-sm relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-orange-500/5 to-red-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative z-10">
              <div>
                <CardTitle className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Insights Generated
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 mt-1">Actionable insights</CardDescription>
              </div>
              <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shadow-lg group-hover:shadow-amber-500/25 transition-all duration-300">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-3xl font-bold bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 bg-clip-text text-transparent mb-2">
                {loading ? "..." : stats.total_insights || 0}
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex items-center text-amber-600 text-xs font-semibold bg-amber-50 px-2 py-1 rounded-full">
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
          <Card className="lg:col-span-2 bg-gradient-to-br from-white via-slate-50/50 to-blue-50/30 border-0 shadow-xl backdrop-blur-sm relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/3 via-blue-500/3 to-cyan-500/3"></div>
            <CardHeader className="pb-4 relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl font-bold text-slate-800 mb-2">Quick Start Guide</CardTitle>
                  <CardDescription className="text-slate-600">Get started with PharmaPersonaSim</CardDescription>
                </div>
                <div className="p-3 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl shadow-lg">
                  <CheckCircle className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 relative z-10">
              <div className="grid gap-4">
                <div className="group flex items-start space-x-4 p-5 bg-gradient-to-r from-indigo-50 via-blue-50 to-cyan-50 rounded-2xl border border-indigo-100 hover:border-indigo-200 transition-all duration-300 hover:shadow-lg">
                  <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-indigo-500 to-blue-600 text-white rounded-xl text-sm font-bold shadow-lg group-hover:shadow-indigo-500/25 transition-all duration-300">
                    1
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-slate-800 mb-1">Create personas in the Persona Library</h4>
                    <p className="text-sm text-slate-600">Generate detailed patient personas</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-white/80 hover:bg-white border-indigo-200 text-indigo-600 hover:text-indigo-700 shadow-sm hover:shadow-md transition-all duration-300"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Create
                  </Button>
                </div>

                <div className="group flex items-start space-x-4 p-5 bg-gradient-to-r from-purple-50 via-pink-50 to-rose-50 rounded-2xl border border-purple-100 hover:border-purple-200 transition-all duration-300 hover:shadow-lg">
                  <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 text-white rounded-xl text-sm font-bold shadow-lg group-hover:shadow-purple-500/25 transition-all duration-300">
                    2
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-slate-800 mb-1">Select personas for your cohort</h4>
                    <p className="text-sm text-slate-600">Build targeted simulation groups</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-white/80 hover:bg-white border-purple-200 text-purple-600 hover:text-purple-700 shadow-sm hover:shadow-md transition-all duration-300"
                  >
                    <Users className="h-4 w-4 mr-1" />
                    Select
                  </Button>
                </div>

                <div className="group flex items-start space-x-4 p-5 bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 rounded-2xl border border-emerald-100 hover:border-emerald-200 transition-all duration-300 hover:shadow-lg">
                  <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-xl text-sm font-bold shadow-lg group-hover:shadow-emerald-500/25 transition-all duration-300">
                    3
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-slate-800 mb-1">Input your stimulus content</h4>
                    <p className="text-sm text-slate-600">Add copy, messaging, or materials</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-white/80 hover:bg-white border-emerald-200 text-emerald-600 hover:text-emerald-700 shadow-sm hover:shadow-md transition-all duration-300"
                  >
                    <Activity className="h-4 w-4 mr-1" />
                    Add Content
                  </Button>
                </div>

                <div className="group flex items-start space-x-4 p-5 bg-gradient-to-r from-amber-50 via-orange-50 to-red-50 rounded-2xl border border-amber-100 hover:border-amber-200 transition-all duration-300 hover:shadow-lg">
                  <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-xl text-sm font-bold shadow-lg group-hover:shadow-amber-500/25 transition-all duration-300">
                    4
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-slate-800 mb-1">Run simulation & view results</h4>
                    <p className="text-sm text-slate-600">Get actionable insights in Analytics</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-white/80 hover:bg-white border-amber-200 text-amber-600 hover:text-amber-700 shadow-sm hover:shadow-md transition-all duration-300"
                  >
                    <Zap className="h-4 w-4 mr-1" />
                    Simulate
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-white via-slate-50/50 to-purple-50/30 border-0 shadow-xl backdrop-blur-sm relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/3 via-pink-500/3 to-indigo-500/3"></div>
            <CardHeader className="pb-4 relative z-10">
              <CardTitle className="text-xl font-bold text-slate-800 mb-2">Persona Distribution</CardTitle>
              <CardDescription className="text-slate-600">Current persona breakdown by condition</CardDescription>
            </CardHeader>
            <CardContent className="relative z-10">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                </div>
              ) : Object.keys(conditionStats).length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(conditionStats).map(([condition, count]) => (
                    <div key={condition} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-semibold text-slate-700 truncate">{condition}</span>
                        <span className="text-sm font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                          {count}
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden shadow-inner">
                        <div
                          className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 h-full rounded-full transition-all duration-700 shadow-sm"
                          style={{ width: `${(count / personas.length) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="p-4 bg-slate-100 rounded-2xl inline-block mb-4">
                    <AlertCircle className="h-8 w-8 text-slate-400" />
                  </div>
                  <p className="text-slate-500 text-sm mb-2">No personas available</p>
                  <Button
                    size="sm"
                    className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Persona
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="bg-gradient-to-br from-white via-slate-50/50 to-indigo-50/30 border-0 shadow-xl backdrop-blur-sm relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/3 via-blue-500/3 to-cyan-500/3"></div>
          <CardHeader className="pb-4 relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-bold text-slate-800 mb-2">Recent Activity</CardTitle>
                <CardDescription className="text-slate-600">Your latest simulations and updates</CardDescription>
              </div>
              <div className="p-3 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl shadow-lg">
                <Clock className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            {personas.length > 0 ? (
              <div className="space-y-4">
                {personas.slice(0, 3).map((persona) => (
                  <div
                    key={persona.id}
                    className="group flex items-center space-x-4 p-4 bg-gradient-to-r from-slate-50 via-blue-50/50 to-indigo-50/50 rounded-xl border border-slate-100 hover:border-indigo-200 transition-all duration-300 hover:shadow-md"
                  >
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-indigo-500/25 transition-all duration-300">
                      <Users className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{persona.name} created</p>
                      <p className="text-xs text-slate-600">
                        {persona.condition} • {persona.age} years old • {persona.location}
                      </p>
                    </div>
                    <div className="w-3 h-3 bg-emerald-500 rounded-full shadow-lg shadow-emerald-500/50"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="p-4 bg-slate-100 rounded-2xl inline-block mb-4">
                  <Activity className="h-8 w-8 text-slate-400" />
                </div>
                <p className="text-slate-500 text-sm mb-2">No recent activity</p>
                <p className="text-xs text-slate-400">
                  Start by creating personas and running simulations to see activity here
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
