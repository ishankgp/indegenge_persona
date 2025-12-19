"use client"

import { useState, useEffect, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { PersonasAPI, BrandsAPI, getApiBaseUrl } from "@/lib/api"
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
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Persona {
  id: number
  name: string
  persona_type: string
  age: number
  gender: string
  condition: string
  location: string
  brand_id?: number
  created_at: string
}

interface Brand {
  id: number
  name: string
}

interface CoverageStats {
  totalPersonas: number
  patientCount: number
  hcpCount: number
  brandsCovered: number
  conditionCounts: Record<string, number>
  brandPersonaCounts: Record<number, { name: string; count: number; patientCount: number; hcpCount: number }>
  gaps: {
    brandsWithNoPersonas: Brand[]
    brandsWithLowPersonas: Array<{ brand: Brand; count: number }>
    missingPersonaTypes: Array<{ brand: Brand; missingType: string }>
    underrepresentedConditions: Array<{ condition: string; count: number }>
  }
}

export function PersonaCoverage() {
  const navigate = useNavigate()
  const [personas, setPersonas] = useState<Persona[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [personasData, brandsData] = await Promise.all([
        PersonasAPI.list(),
        BrandsAPI.list(),
      ])
      setPersonas(personasData)
      setBrands(brandsData)
      setError(null)
    } catch (error: any) {
      console.error("Error fetching data:", error)
      const apiBaseUrl = getApiBaseUrl() || window.location.origin
      // Provide more detailed error message
      let errorMessage = "Failed to fetch persona coverage data"
      if (error?.response) {
        // API responded with error status
        errorMessage = `API Error (${error.response.status}): ${error.response.data?.detail || error.response.statusText || 'Unknown error'}`
      } else if (error?.request) {
        // Request was made but no response received
        errorMessage = `No response from backend API at ${apiBaseUrl}. Please ensure the backend server is deployed and accessible.`
      } else if (error?.message) {
        // Error setting up the request
        errorMessage = `Network Error: ${error.message}`
      }
      // Add helpful context for production
      if (!(import.meta as any).env?.DEV && apiBaseUrl === window.location.origin) {
        errorMessage += " (Hint: Set VITE_API_URL environment variable in Vercel to point to your backend API)"
      }
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const coverageStats: CoverageStats = useMemo(() => {
    const totalPersonas = personas.length
    const patientCount = personas.filter((p) => p.persona_type === "Patient").length
    const hcpCount = personas.filter((p) => p.persona_type === "HCP" || p.persona_type === "Healthcare Provider").length

    // Condition counts
    const conditionCounts: Record<string, number> = {}
    personas.forEach((p) => {
      if (p.condition) {
        conditionCounts[p.condition] = (conditionCounts[p.condition] || 0) + 1
      }
    })

    // Brand persona counts
    const brandPersonaCounts: Record<number, { name: string; count: number; patientCount: number; hcpCount: number }> = {}
    brands.forEach((brand) => {
      const brandPersonas = personas.filter((p) => p.brand_id === brand.id)
      brandPersonaCounts[brand.id] = {
        name: brand.name,
        count: brandPersonas.length,
        patientCount: brandPersonas.filter((p) => p.persona_type === "Patient").length,
        hcpCount: brandPersonas.filter((p) => p.persona_type === "HCP" || p.persona_type === "Healthcare Provider").length,
      }
    })

    // Brands with personas
    const brandsWithPersonas = new Set(personas.filter((p) => p.brand_id).map((p) => p.brand_id!))
    const brandsWithNoPersonas = brands.filter((b) => !brandsWithPersonas.has(b.id))
    const brandsWithLowPersonas = brands
      .filter((b) => {
        const count = brandPersonaCounts[b.id]?.count || 0
        return count > 0 && count < 3
      })
      .map((b) => ({
        brand: b,
        count: brandPersonaCounts[b.id]?.count || 0,
      }))

    // Missing persona types per brand
    const missingPersonaTypes: Array<{ brand: Brand; missingType: string }> = []
    brands.forEach((brand) => {
      const brandData = brandPersonaCounts[brand.id]
      if (brandData && brandData.count > 0) {
        if (brandData.patientCount === 0) {
          missingPersonaTypes.push({ brand, missingType: "Patient" })
        }
        if (brandData.hcpCount === 0) {
          missingPersonaTypes.push({ brand, missingType: "HCP" })
        }
      }
    })

    // Underrepresented conditions (less than 2 personas)
    const underrepresentedConditions = Object.entries(conditionCounts)
      .filter(([_, count]) => count < 2)
      .map(([condition, count]) => ({ condition, count }))
      .sort((a, b) => a.count - b.count)

    return {
      totalPersonas,
      patientCount,
      hcpCount,
      brandsCovered: brandsWithPersonas.size,
      conditionCounts,
      brandPersonaCounts,
      gaps: {
        brandsWithNoPersonas,
        brandsWithLowPersonas,
        missingPersonaTypes,
        underrepresentedConditions,
      },
    }
  }, [personas, brands])

  const topConditions = useMemo(() => {
    return Object.entries(coverageStats.conditionCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
  }, [coverageStats.conditionCounts])

  const patientPercentage = coverageStats.totalPersonas > 0
    ? Math.round((coverageStats.patientCount / coverageStats.totalPersonas) * 100)
    : 0
  const hcpPercentage = coverageStats.totalPersonas > 0
    ? Math.round((coverageStats.hcpCount / coverageStats.totalPersonas) * 100)
    : 0

  if (loading) {
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

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-violet-50 dark:from-gray-950 dark:via-gray-900 dark:to-violet-950">
        <div className="bg-gradient-to-r from-[hsl(262,60%,38%)] via-[hsl(262,60%,42%)] to-[hsl(280,60%,45%)]">
          <div className="max-w-7xl mx-auto px-8 py-6">
            <h1 className="text-3xl font-bold text-white">Persona Coverage</h1>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-8 py-8">
          <Card>
            <CardContent className="py-20 text-center">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Error Loading Coverage</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
              <Button onClick={fetchData}>Retry</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-violet-50 dark:from-gray-950 dark:via-gray-900 dark:to-violet-950">
      {/* Indegene Purple Header */}
      <div className="bg-gradient-to-r from-[hsl(262,60%,38%)] via-[hsl(262,60%,42%)] to-[hsl(280,60%,45%)]">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                <PieChart className="h-8 w-8 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold text-white tracking-tight">Persona Coverage</h1>
                  <Badge className="bg-white/20 backdrop-blur-sm text-white border-white/30 font-normal">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Marketing View
                  </Badge>
                </div>
                <p className="text-white/80 mt-1">Quick overview of available personas and coverage gaps</p>
              </div>
            </div>
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

      <div className="max-w-7xl mx-auto px-8 -mt-8">
        {/* Quick Stats Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card className="border-0 shadow-xl backdrop-blur-sm bg-white/90 dark:bg-gray-900/90">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Personas</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                    {coverageStats.totalPersonas}
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
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Patient Personas</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                    {coverageStats.patientCount}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{patientPercentage}% of total</p>
                </div>
                <div className="p-3 bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-xl">
                  <User className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl backdrop-blur-sm bg-white/90 dark:bg-gray-900/90">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">HCP Personas</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                    {coverageStats.hcpCount}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{hcpPercentage}% of total</p>
                </div>
                <div className="p-3 bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 rounded-xl">
                  <Stethoscope className="h-6 w-6 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl backdrop-blur-sm bg-white/90 dark:bg-gray-900/90">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Brands Covered</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                    {coverageStats.brandsCovered}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">of {brands.length} total brands</p>
                </div>
                <div className="p-3 bg-gradient-to-br from-amber-500/20 to-amber-600/20 rounded-xl">
                  <Library className="h-6 w-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-8 lg:grid-cols-2 mb-8">
          {/* Persona Type Distribution */}
          <Card className="border-0 shadow-xl backdrop-blur-sm bg-white/90 dark:bg-gray-900/90">
            <CardHeader className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-t-xl">
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Persona Type Distribution
              </CardTitle>
              <CardDescription>Breakdown by persona type</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {coverageStats.totalPersonas > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <User className="h-5 w-5 text-blue-600" />
                      <span className="font-medium">Patient</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-bold">{coverageStats.patientCount}</span>
                      <Badge variant="outline">{patientPercentage}%</Badge>
                    </div>
                  </div>
                  <Progress value={patientPercentage} className="h-3" />

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Stethoscope className="h-5 w-5 text-emerald-600" />
                      <span className="font-medium">HCP</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-bold">{coverageStats.hcpCount}</span>
                      <Badge variant="outline">{hcpPercentage}%</Badge>
                    </div>
                  </div>
                  <Progress value={hcpPercentage} className="h-3" />
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No personas created yet</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Condition Coverage */}
          <Card className="border-0 shadow-xl backdrop-blur-sm bg-white/90 dark:bg-gray-900/90">
            <CardHeader className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-t-xl">
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Top Conditions Covered
              </CardTitle>
              <CardDescription>Most represented medical conditions</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {topConditions.length > 0 ? (
                <div className="space-y-4">
                  {topConditions.map(([condition, count]) => {
                    const maxCount = Math.max(...topConditions.map(([, c]) => c))
                    const percentage = (count / maxCount) * 100
                    return (
                      <div key={condition} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{condition}</span>
                          <Badge variant="outline">{count}</Badge>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No condition data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Brand Coverage Matrix */}
        <Card className="border-0 shadow-xl backdrop-blur-sm bg-white/90 dark:bg-gray-900/90 mb-8">
          <CardHeader className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-t-xl">
            <CardTitle className="flex items-center gap-2">
              <Library className="h-5 w-5" />
              Brand Coverage Matrix
            </CardTitle>
            <CardDescription>Persona distribution across brands</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {brands.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {brands.map((brand) => {
                  const brandData = coverageStats.brandPersonaCounts[brand.id] || {
                    name: brand.name,
                    count: 0,
                    patientCount: 0,
                    hcpCount: 0,
                  }
                  const statusColor =
                    brandData.count === 0
                      ? "border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900"
                      : brandData.count < 3
                        ? "border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900"
                        : "border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-900"

                  return (
                    <Card key={brand.id} className={cn("border-2", statusColor)}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-semibold text-gray-900 dark:text-gray-100">{brand.name}</h4>
                            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                              {brandData.count}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">personas</p>
                          </div>
                          {brandData.count === 0 ? (
                            <XCircle className="h-5 w-5 text-red-500" />
                          ) : brandData.count < 3 ? (
                            <AlertTriangle className="h-5 w-5 text-amber-500" />
                          ) : (
                            <CheckCircle className="h-5 w-5 text-emerald-500" />
                          )}
                        </div>
                        <div className="flex gap-2 text-xs">
                          <Badge variant="outline" className="text-xs">
                            <User className="h-3 w-3 mr-1" />
                            {brandData.patientCount} Patient
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            <Stethoscope className="h-3 w-3 mr-1" />
                            {brandData.hcpCount} HCP
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Library className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No brands available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Gap Analysis Panel */}
        {(coverageStats.gaps.brandsWithNoPersonas.length > 0 ||
          coverageStats.gaps.brandsWithLowPersonas.length > 0 ||
          coverageStats.gaps.missingPersonaTypes.length > 0 ||
          coverageStats.gaps.underrepresentedConditions.length > 0) && (
          <Card className="border-0 shadow-xl backdrop-blur-sm bg-white/90 dark:bg-gray-900/90 border-l-4 border-l-amber-500 mb-8">
            <CardHeader className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-t-xl">
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Coverage Gaps & Recommendations
              </CardTitle>
              <CardDescription>Areas where additional personas would strengthen coverage</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {/* Brands with no personas */}
              {coverageStats.gaps.brandsWithNoPersonas.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-500" />
                      Brands Without Personas ({coverageStats.gaps.brandsWithNoPersonas.length})
                    </h4>
                  </div>
                  <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                    {coverageStats.gaps.brandsWithNoPersonas.map((brand) => (
                      <div
                        key={brand.id}
                        className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-900"
                      >
                        <span className="text-sm font-medium">{brand.name}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => navigate(`/create-persona?brand_id=${brand.id}`)}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Create
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Brands with low personas */}
              {coverageStats.gaps.brandsWithLowPersonas.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      Brands with Low Coverage ({coverageStats.gaps.brandsWithLowPersonas.length})
                    </h4>
                  </div>
                  <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                    {coverageStats.gaps.brandsWithLowPersonas.map(({ brand, count }) => (
                      <div
                        key={brand.id}
                        className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-900"
                      >
                        <div>
                          <span className="text-sm font-medium">{brand.name}</span>
                          <p className="text-xs text-gray-500">Only {count} persona{count !== 1 ? "s" : ""}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => navigate(`/create-persona?brand_id=${brand.id}`)}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add More
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Missing persona types */}
              {coverageStats.gaps.missingPersonaTypes.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                      <Target className="h-4 w-4 text-blue-500" />
                      Missing Persona Types ({coverageStats.gaps.missingPersonaTypes.length})
                    </h4>
                  </div>
                  <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                    {coverageStats.gaps.missingPersonaTypes.map(({ brand, missingType }, idx) => (
                      <div
                        key={`${brand.id}-${missingType}-${idx}`}
                        className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900"
                      >
                        <div>
                          <span className="text-sm font-medium">{brand.name}</span>
                          <p className="text-xs text-gray-500">No {missingType} personas</p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => navigate(`/create-persona?brand_id=${brand.id}&persona_type=${missingType}`)}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add {missingType}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Underrepresented conditions */}
              {coverageStats.gaps.underrepresentedConditions.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-purple-500" />
                      Underrepresented Conditions ({coverageStats.gaps.underrepresentedConditions.length})
                    </h4>
                  </div>
                  <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                    {coverageStats.gaps.underrepresentedConditions.map(({ condition, count }) => (
                      <div
                        key={condition}
                        className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-900"
                      >
                        <div>
                          <span className="text-sm font-medium">{condition}</span>
                          <p className="text-xs text-gray-500">Only {count} persona{count !== 1 ? "s" : ""}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => navigate(`/create-persona?condition=${encodeURIComponent(condition)}`)}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add More
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button
                  className="w-full bg-gradient-to-r from-primary to-secondary text-white hover:shadow-xl"
                  onClick={() => navigate("/create-persona")}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Personas
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* No gaps message */}
        {coverageStats.gaps.brandsWithNoPersonas.length === 0 &&
          coverageStats.gaps.brandsWithLowPersonas.length === 0 &&
          coverageStats.gaps.missingPersonaTypes.length === 0 &&
          coverageStats.gaps.underrepresentedConditions.length === 0 &&
          coverageStats.totalPersonas > 0 && (
            <Card className="border-0 shadow-xl backdrop-blur-sm bg-white/90 dark:bg-gray-900/90 border-l-4 border-l-emerald-500">
              <CardContent className="py-8 text-center">
                <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Excellent Coverage!
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Your persona library has good coverage across brands, types, and conditions.
                </p>
                <Button
                  variant="outline"
                  onClick={() => navigate("/create-persona")}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add More Personas
                </Button>
              </CardContent>
            </Card>
          )}
      </div>
    </div>
  )
}

