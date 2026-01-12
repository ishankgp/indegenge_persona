"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { CoverageAPI, BrandsAPI, getApiBaseUrl } from "@/lib/api"
import type { CoverageSuggestion } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import {
  PieChart,
  Users,
  User,
  Stethoscope,
  Library,
  AlertTriangle,
  Plus,
  TrendingUp,
  Activity,
  Sparkles,
  Target,
  CheckCircle,
  XCircle,
  ArrowRight,
  Bot,
  Lightbulb,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Brand {
  id: number
  name: string
}

export function PersonaCoverage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<any>(null)
  const [brands, setBrands] = useState<Brand[]>([])
  const [selectedBrandId, setSelectedBrandId] = useState<string>('all')

  // Suggestions state
  const [suggestions, setSuggestions] = useState<CoverageSuggestion[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)

  useEffect(() => {
    fetchBrands()
  }, [])

  useEffect(() => {
    fetchAnalysis()
  }, [selectedBrandId])

  const fetchBrands = async () => {
    try {
      const data = await BrandsAPI.list()
      setBrands(data)
    } catch (err) {
      console.error("Failed to fetch brands", err)
    }
  }

  const fetchAnalysis = async () => {
    try {
      setLoading(true)
      const brandId = selectedBrandId === 'all' ? undefined : parseInt(selectedBrandId)

      // Fetch analysis and suggestions together
      const [analysisData, suggestionsResponse] = await Promise.all([
        CoverageAPI.getAnalysis(brandId),
        CoverageAPI.getSuggestions(brandId) // Pre-fetch suggestions
      ])

      setAnalysis(analysisData)
      if (suggestionsResponse && suggestionsResponse.suggestions) {
        setSuggestions(suggestionsResponse.suggestions)
      }
      setError(null)
    } catch (error: any) {
      console.error("Error fetching coverage data:", error)
      const apiBaseUrl = getApiBaseUrl() || window.location.origin
      let errorMessage = "Failed to fetch coverage analysis"
      if (error?.response) {
        errorMessage = `API Error (${error.response.status}): ${error.response.data?.detail || error.response.statusText}`
      }
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const refreshSuggestions = async () => {
    try {
      setLoadingSuggestions(true)
      const brandId = selectedBrandId === 'all' ? undefined : parseInt(selectedBrandId)
      const response = await CoverageAPI.getSuggestions(brandId)
      if (response && response.suggestions) {
        setSuggestions(response.suggestions)
      }
    } catch (err) {
      console.error("Failed to refresh suggestions", err)
    } finally {
      setLoadingSuggestions(false)
    }
  }

  const handleCreateSuggestion = (suggestion: CoverageSuggestion) => {
    // Navigate to create persona with pre-filled fields
    const params = new URLSearchParams()
    if (suggestion.name) params.append('name', suggestion.name)
    if (suggestion.age) params.append('age', suggestion.age.toString())
    if (suggestion.gender) params.append('gender', suggestion.gender)
    if (suggestion.persona_type) params.append('type', suggestion.persona_type)
    if (selectedBrandId !== 'all') params.append('brand_id', selectedBrandId)

    navigate(`/create-persona?${params.toString()}`)
  }

  if (loading && !analysis) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-violet-50 dark:from-gray-950 dark:via-gray-900 dark:to-violet-950">
        <div className="bg-gradient-to-r from-[hsl(262,60%,38%)] via-[hsl(262,60%,42%)] to-[hsl(280,60%,45%)]">
          <div className="max-w-7xl mx-auto px-8 py-6">
            <Skeleton className="h-12 w-64 bg-white/20" />
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-8 py-8">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-8 w-24 mb-2" />
                  <Skeleton className="h-4 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-violet-50 dark:from-gray-950 dark:via-gray-900 dark:to-violet-950">
      {/* Header */}
      <div className="bg-gradient-to-r from-[hsl(262,60%,38%)] via-[hsl(262,60%,42%)] to-[hsl(280,60%,45%)]">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                <PieChart className="h-8 w-8 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold text-white tracking-tight">Persona Coverage</h1>
                  <Badge className="bg-white/20 backdrop-blur-sm text-white border-white/30 font-normal">
                    <Sparkles className="h-3 w-3 mr-1" />
                    AI Analysis
                  </Badge>
                </div>
                <p className="text-white/80 mt-1">
                  {analysis?.message || "Analyze coverage gaps and get AI recommendations"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Select value={selectedBrandId} onValueChange={setSelectedBrandId}>
                <SelectTrigger className="w-[180px] bg-white/10 text-white border-white/20">
                  <SelectValue placeholder="All Brands" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Brands</SelectItem>
                  {brands.map(b => (
                    <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                className="bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20"
                onClick={() => navigate("/create-persona")}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Personas
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 -mt-8">
        {analysis && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
            <Card className="border-0 shadow-xl backdrop-blur-sm bg-white/90 dark:bg-gray-900/90">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Personas</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                      {analysis.total_personas}
                    </p>
                  </div>
                  <div className="p-3 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-xl">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-xl backdrop-blur-sm bg-white/90 dark:bg-gray-900/90">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Coverage Score</p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                        {analysis.overall_score}%
                      </p>
                    </div>
                  </div>
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${analysis.overall_score >= 80 ? 'from-emerald-500/20 to-emerald-600/20' :
                    analysis.overall_score >= 50 ? 'from-amber-500/20 to-amber-600/20' :
                      'from-red-500/20 to-red-600/20'
                    }`}>
                    <Activity className={`h-6 w-6 ${analysis.overall_score >= 80 ? 'text-emerald-600' :
                      analysis.overall_score >= 50 ? 'text-amber-600' :
                        'text-red-600'
                      }`} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Top Dimensions Analysis */}
            {analysis.chart_data?.slice(0, 2).map((dim: any, idx: number) => (
              <Card key={idx} className="border-0 shadow-xl backdrop-blur-sm bg-white/90 dark:bg-gray-900/90">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{dim.dimension}</p>
                    <Badge variant={dim.coverage >= 70 ? "outline" : "secondary"}>
                      {dim.coverage}%
                    </Badge>
                  </div>
                  <Progress value={dim.coverage} className="h-2 mb-2" />
                  <p className="text-xs text-gray-500">
                    {dim.gap_count > 0 ? `${dim.gap_count} gaps identified` : "Strong coverage"}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-3 mb-8">
          {/* Main Coverage Analysis */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-0 shadow-xl backdrop-blur-sm bg-white/90 dark:bg-gray-900/90">
              <CardHeader className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-t-xl">
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Gap Analysis
                </CardTitle>
                <CardDescription>Identified gaps in your persona library</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                {analysis?.top_gaps?.length > 0 ? (
                  <div className="space-y-4">
                    {analysis.top_gaps.map((gap: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="flex items-start gap-3">
                          {gap.severity === 'high' ? (
                            <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                          ) : (
                            <TrendingUp className="h-5 w-5 text-amber-500 mt-0.5" />
                          )}
                          <div>
                            <p className="font-medium text-sm">
                              Missing: <span className="font-bold">{gap.missing_value}</span>
                            </p>
                            <p className="text-xs text-muted-foreground">{gap.dimension_label}</p>
                          </div>
                        </div>
                        <Badge variant={gap.severity === 'high' ? "destructive" : "secondary"}>
                          {gap.severity} priority
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 mx-auto text-emerald-500 mb-2" />
                    <p className="text-gray-600">Great job! No major gaps detected.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Dimension Breakdown */}
            <div className="grid md:grid-cols-2 gap-6">
              {analysis?.chart_data?.map((dim: any, idx: number) => (
                <Card key={idx} className="border-0 shadow-lg">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{dim.dimension}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-center py-4">
                      {/* Placeholder for chart - using simple stats for now */}
                      <div className="text-center">
                        <div className="text-3xl font-bold text-primary mb-1">{dim.coverage}%</div>
                        <p className="text-xs text-muted-foreground">Coverage Score</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* AI Suggestions Panel */}
          <div className="lg:col-span-1">
            <Card className="border-0 shadow-xl backdrop-blur-sm bg-white/90 dark:bg-gray-900/90 h-full border-l-4 border-l-violet-500">
              <CardHeader className="bg-gradient-to-r from-violet-500/10 to-purple-500/10 rounded-t-xl">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Bot className="h-5 w-5 text-violet-600" />
                    AI Suggestions
                  </CardTitle>
                  <Button variant="ghost" size="icon" onClick={refreshSuggestions} disabled={loadingSuggestions}>
                    <Sparkles className={`h-4 w-4 ${loadingSuggestions ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
                <CardDescription>
                  Recommended personas to improve coverage
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                {suggestions.map((suggestion, idx) => (
                  <Card key={idx} className="border border-violet-100 dark:border-violet-900 overflow-hidden group hover:shadow-md transition-all">
                    <div className="p-3 bg-violet-50 dark:bg-violet-900/20 border-b border-violet-100 dark:border-violet-900 flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold text-sm text-violet-900 dark:text-violet-100">
                          {suggestion.name}
                        </h4>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="outline" className="text-[10px] h-5 px-1 bg-white">
                            {suggestion.persona_type}
                          </Badge>
                          {suggestion.priority === 'high' && (
                            <Badge className="text-[10px] h-5 px-1 bg-violet-600 border-0">
                              High Priority
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Lightbulb className="h-4 w-4 text-violet-400" />
                    </div>
                    <CardContent className="p-3">
                      <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                        {suggestion.rationale}
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                        <div className="bg-gray-50 p-1.5 rounded">
                          <span className="text-gray-500 block text-[10px]">Age</span>
                          <span className="font-medium">{suggestion.age || 'N/A'}</span>
                        </div>
                        <div className="bg-gray-50 p-1.5 rounded">
                          <span className="text-gray-500 block text-[10px]">Gender</span>
                          <span className="font-medium">{suggestion.gender || 'Any'}</span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        className="w-full bg-violet-600 hover:bg-violet-700 text-white h-8 text-xs"
                        onClick={() => handleCreateSuggestion(suggestion)}
                      >
                        <Plus className="h-3 w-3 mr-1.5" />
                        Generate This Persona
                      </Button>
                    </CardContent>
                  </Card>
                ))}

                {suggestions.length === 0 && !loadingSuggestions && (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No suggestions available.</p>
                  </div>
                )}

                {loadingSuggestions && (
                  <div className="flex flex-col items-center justify-center py-8 text-violet-600">
                    <Sparkles className="h-8 w-8 animate-spin mb-2" />
                    <p className="text-xs">Generating suggestions...</p>
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

