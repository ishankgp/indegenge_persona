"use client"

import { useState, useEffect, useMemo } from "react"
import { PersonasAPI, CohortAPI, AssetIntelligenceAPI, type AssetAnalysisResult, type AssetHistoryItem } from "@/lib/api"
import { metricRegistry } from "@/lib/metricsRegistry"
import { AnnotatedAssetViewer } from "@/components/AnnotatedAssetViewer"
import { AssetIntelligenceWorkspace } from "@/components/AssetIntelligenceWorkspace"
import { useNavigate, useLocation } from "react-router-dom"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Slider } from "@/components/ui/slider"
import {
  Users,
  Sparkles,
  Settings,
  Search,
  BarChart3,
  Target,
  Brain,
  Zap,
  MessageSquare,
  PlayCircle,
  Plus,
  CheckCircle2,
  Gauge,
  FileText,
  Loader2,
  ChevronRight,
  ImageIcon,
  Upload,
  X,
  Eye,
  Filter,
  History,
  Clock,
  FolderOpen,
} from "lucide-react"
import { Input } from "@/components/ui/input"

// API base managed via shared client

interface Persona {
  id: number
  name: string
  age: number
  gender: string
  condition: string
  location: string
  persona_type: string
  specialty?: string | null
}

const SAMPLE_MESSAGES = [
  "Introducing our new diabetes management solution with 24/7 glucose monitoring",
  "Experience relief from chronic pain with our breakthrough therapy",
  "Take control of your health journey with personalized treatment plans",
] as const

const DEFAULT_AGE_RANGE: [number, number] = [18, 100]
const PERSONA_TYPES = ["HCP", "Patient"] as const
const MAX_QUESTIONS = 5

type PersonaType = (typeof PERSONA_TYPES)[number]

interface PersonaFilters {
  ageRange: [number, number]
  personaTypes: PersonaType[]
  genders: string[]
  locations: string[]
  conditions: string[]
}

export function SimulationHub() {
  const navigate = useNavigate()
  const [personas, setPersonas] = useState<Persona[]>([])
  const [selectedPersonas, setSelectedPersonas] = useState<Set<number>>(new Set())
  const [metricSelections, setMetricSelections] = useState<Record<string, { selected: boolean; weight?: number }>>(() => {
    return metricRegistry.reduce<Record<string, { selected: boolean; weight?: number }>>((acc, metric) => {
      acc[metric.id] = { selected: !!metric.defaultSelected, weight: metric.defaultWeight ?? 1 }
      return acc
    }, {})
  })
  const selectedMetrics = useMemo(
    () => new Set(Object.entries(metricSelections).filter(([, config]) => config.selected).map(([id]) => id)),
    [metricSelections],
  )
  const [stimulusText, setStimulusText] = useState("")
  const [stimulusImages, setStimulusImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [contentType, setContentType] = useState<"text" | "image" | "both">("text")
  const [questions, setQuestions] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [progress, setProgress] = useState(0)
  const [filters, setFilters] = useState<PersonaFilters>({
    ageRange: [...DEFAULT_AGE_RANGE] as [number, number],
    personaTypes: [...PERSONA_TYPES],
    genders: [],
    locations: [],
    conditions: [],
  })

  const [recruitmentMode, setRecruitmentMode] = useState<"manual" | "ai">("manual")
  const [recruitmentPrompt, setRecruitmentPrompt] = useState("")
  const [isRecruiting, setIsRecruiting] = useState(false)
  const [isVariant, setIsVariant] = useState(false)
  const [originalMessage, setOriginalMessage] = useState("")
  const [showMetricWeights, setShowMetricWeights] = useState(false)

  // Asset Intelligence Mode
  const [simulationMode, setSimulationMode] = useState<"text" | "asset">("text")
  const [assetAnalysisResults, setAssetAnalysisResults] = useState<AssetAnalysisResult[]>([])
  const [assetAnalyzing, setAssetAnalyzing] = useState(false)
  const [assetFile, setAssetFile] = useState<File | null>(null)
  const [assetPreview, setAssetPreview] = useState<string | null>(null)

  // Asset History
  const [assetHistory, setAssetHistory] = useState<AssetHistoryItem[]>([])
  const [loadingAssetHistory, setLoadingAssetHistory] = useState(false)
  const [assetRightPanelView, setAssetRightPanelView] = useState<"results" | "history">("history")

  // Handle pre-filled message from Analytics page (for message variants)
  const location = useLocation()
  useEffect(() => {
    const state = location.state as {
      prefillMessage?: string
      isVariant?: boolean
      originalMessage?: string
      preselectedPersonaIds?: number[]
    } | null

    if (state?.prefillMessage) {
      setStimulusText(state.prefillMessage)
      setIsVariant(state.isVariant ?? false)
      setOriginalMessage(state.originalMessage ?? "")
    }

    if (state?.preselectedPersonaIds?.length) {
      setSelectedPersonas(new Set(state.preselectedPersonaIds))
    }

    if (state) {
      // Clear the state to prevent re-filling on refresh
      window.history.replaceState({}, document.title)
    }
  }, [location.state])

  // Auto-load asset history when switching to asset mode
  useEffect(() => {
    if (simulationMode === "asset" && assetHistory.length === 0 && !loadingAssetHistory) {
      loadAssetHistory()
    }
  }, [simulationMode])

  // Switch to results view when analysis completes
  useEffect(() => {
    if (assetAnalysisResults.length > 0) {
      setAssetRightPanelView("results")
    }
  }, [assetAnalysisResults])

  const handleRecruit = async () => {
    if (!recruitmentPrompt.trim()) return
    setIsRecruiting(true)
    try {
      const recruitedPersonas = await PersonasAPI.recruit(recruitmentPrompt)

      if (recruitedPersonas.length === 0) {
        alert(`No personas found matching: "${recruitmentPrompt}"\n\nTry adjusting your search criteria.`)
        return
      }

      const newSelected = new Set(selectedPersonas)
      recruitedPersonas.forEach((p: Persona) => newSelected.add(p.id))
      setSelectedPersonas(newSelected)

      // Show detailed summary
      const genders = Array.from(new Set(recruitedPersonas.map((p: Persona) => p.gender)))
      const ageRange = recruitedPersonas.length > 0
        ? `${Math.min(...recruitedPersonas.map((p: Persona) => p.age))}-${Math.max(...recruitedPersonas.map((p: Persona) => p.age))}`
        : 'N/A'

      alert(
        `✅ Recruitment Complete!\n\n` +
        `Found and selected ${recruitedPersonas.length} personas:\n` +
        `• Genders: ${genders.join(', ')}\n` +
        `• Age range: ${ageRange}\n` +
        `• Total selected: ${newSelected.size}`
      )

      // Clear the prompt after successful recruitment
      setRecruitmentPrompt("")
    } catch (error) {
      console.error("Recruitment failed", error)
      alert("❌ Recruitment Failed\n\nCould not recruit personas. Please check your connection and try again.")
    } finally {
      setIsRecruiting(false)
    }
  }

  const filterOptions = useMemo(() => {
    const genders = new Set<string>()
    const locations = new Set<string>()
    const conditions = new Set<string>()
    const personaTypes = new Set<PersonaType>()

    personas.forEach((persona) => {
      const normalizedType = (persona.persona_type || "Patient").trim() as PersonaType
      if (PERSONA_TYPES.includes(normalizedType)) {
        personaTypes.add(normalizedType)
      }
      if (persona.gender) {
        genders.add(persona.gender)
      }
      if (persona.location) {
        locations.add(persona.location)
      }
      if (persona.condition) {
        conditions.add(persona.condition)
      }
    })

    return {
      personaTypes: PERSONA_TYPES.filter((type) => personaTypes.has(type)),
      genders: Array.from(genders).sort(),
      locations: Array.from(locations).sort(),
      conditions: Array.from(conditions).sort(),
    }
  }, [personas])

  const personaTypeOptions =
    filterOptions.personaTypes.length > 0 ? filterOptions.personaTypes : [...PERSONA_TYPES]

  const personaTypeCounts = useMemo(() => {
    return personas.reduce<Record<PersonaType, number>>(
      (acc, persona) => {
        const normalized = (persona.persona_type || "Patient").trim().toLowerCase()
        if (normalized === "hcp") {
          acc.HCP += 1
        } else {
          acc.Patient += 1
        }
        return acc
      },
      { HCP: 0, Patient: 0 },
    )
  }, [personas])

  const genderCounts = useMemo(() => {
    const counts = new Map<string, number>()
    personas.forEach((persona) => {
      if (!persona.gender) return
      const key = persona.gender.trim()
      counts.set(key, (counts.get(key) ?? 0) + 1)
    })
    return counts
  }, [personas])

  const locationCounts = useMemo(() => {
    const counts = new Map<string, number>()
    personas.forEach((persona) => {
      if (!persona.location) return
      const key = persona.location.trim()
      counts.set(key, (counts.get(key) ?? 0) + 1)
    })
    return counts
  }, [personas])

  const conditionCounts = useMemo(() => {
    const counts = new Map<string, number>()
    personas.forEach((persona) => {
      if (!persona.condition) return
      const key = persona.condition.trim()
      counts.set(key, (counts.get(key) ?? 0) + 1)
    })
    return counts
  }, [personas])

  const totalPersonas = personas.length

  const isAgeRangeDefault =
    filters.ageRange[0] === DEFAULT_AGE_RANGE[0] && filters.ageRange[1] === DEFAULT_AGE_RANGE[1]

  const activeFiltersCount = useMemo(() => {
    let count = 0
    if (!isAgeRangeDefault) count += 1
    if (filters.personaTypes.length > 0 && filters.personaTypes.length !== personaTypeOptions.length) count += 1
    if (filters.genders.length > 0) count += 1
    if (filters.locations.length > 0) count += 1
    if (filters.conditions.length > 0) count += 1
    return count
  }, [filters, isAgeRangeDefault, personaTypeOptions.length])

  const filterSummary = useMemo(() => {
    const parts: string[] = []
    if (!isAgeRangeDefault) {
      parts.push(`Age ${filters.ageRange[0]}-${filters.ageRange[1]}`)
    }
    if (filters.personaTypes.length > 0 && filters.personaTypes.length !== personaTypeOptions.length) {
      parts.push(`Type: ${filters.personaTypes.join(", ")}`)
    }
    if (filters.genders.length > 0) {
      parts.push(`Gender: ${filters.genders.join(", ")}`)
    }
    if (filters.locations.length > 0) {
      parts.push(`Locations: ${filters.locations.length}`)
    }
    if (filters.conditions.length > 0) {
      parts.push(`Conditions: ${filters.conditions.length}`)
    }
    return parts.join(" • ") || "No active filters"
  }, [filters, isAgeRangeDefault, personaTypeOptions.length])


  const handleResetFilters = () => {
    setFilters({
      ageRange: [...DEFAULT_AGE_RANGE] as [number, number],
      personaTypes: [...personaTypeOptions],
      genders: [],
      locations: [],
      conditions: [],
    })
  }

  const toggleFilterValue = (
    key: "personaTypes" | "genders" | "locations" | "conditions",
    value: string,
  ) => {
    setFilters((prev) => {
      const currentValues = new Set(prev[key])
      if (currentValues.has(value)) {
        currentValues.delete(value)
      } else {
        currentValues.add(value)
      }

      return {
        ...prev,
        [key]: Array.from(currentValues),
      }
    })
  }

  const updateAgeRange = (value: number[]) => {
    if (value.length !== 2) return
    const [min, max] = value[0] <= value[1] ? value : [value[1], value[0]]
    setFilters((prev) => ({
      ...prev,
      ageRange: [min, max] as [number, number],
    }))
  }

  const cohortType = useMemo(() => {
    const selectedList = personas.filter((persona) => selectedPersonas.has(persona.id))
    if (selectedList.length === 0) {
      return "Mixed"
    }

    let hcpCount = 0
    let patientCount = 0

    selectedList.forEach((persona) => {
      const type = persona.persona_type?.toLowerCase()
      if (type === "hcp") {
        hcpCount += 1
      } else if (type === "patient") {
        patientCount += 1
      }
    })

    if (hcpCount > 0 && patientCount === 0) {
      return "HCP"
    }
    if (patientCount > 0 && hcpCount === 0) {
      return "Patient"
    }
    return "Mixed"
  }, [personas, selectedPersonas])

  const intentLabel = useMemo(() => {
    if (cohortType === "HCP") return "Prescribe Intent"
    if (cohortType === "Patient") return "Request Intent"
    return "Request/Prescribe Intent"
  }, [cohortType])

  const intentDescription = useMemo(() => {
    if (cohortType === "HCP") {
      return "Likelihood an HCP would prescribe after reviewing the message"
    }
    if (cohortType === "Patient") {
      return "Likelihood a patient would request the therapy after seeing the message"
    }
    return "Likelihood to request (patients) or prescribe (HCPs) after reviewing the message"
  }, [cohortType])

  useEffect(() => {
    fetchPersonas()
  }, [])

  useEffect(() => {
    if (analyzing) {
      const timer = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90))
      }, 200)
      return () => clearInterval(timer)
    } else {
      setProgress(0)
    }
  }, [analyzing])

  const fetchPersonas = async () => {
    setLoading(true)
    try {
      const data = await PersonasAPI.list()
      setPersonas(data)
    } catch (error) {
      console.error("Error fetching personas:", error)
    } finally {
      setLoading(false)
    }
  }

  const togglePersona = (id: number) => {
    const newSelected = new Set(selectedPersonas)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedPersonas(newSelected)
  }

  const toggleMetric = (id: string) => {
    setMetricSelections((prev) => {
      const current = prev[id] || { selected: false, weight: metricRegistry.find((m) => m.id === id)?.defaultWeight ?? 1 }
      return {
        ...prev,
        [id]: {
          ...current,
          selected: !current.selected,
          weight: current.weight ?? metricRegistry.find((m) => m.id === id)?.defaultWeight ?? 1,
        },
      }
    })
  }

  const updateMetricWeight = (id: string, weight: number) => {
    const defaultWeight = metricRegistry.find((m) => m.id === id)?.defaultWeight ?? 1
    const safeWeight = Number.isFinite(weight) ? weight : defaultWeight
    setMetricSelections((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        selected: prev[id]?.selected ?? true,
        weight: safeWeight,
      },
    }))
  }

  const handleImageUpload = (files: FileList | null) => {
    if (!files) return

    const newImages: File[] = []

    Array.from(files).forEach((file) => {
      if (file.type.startsWith("image/")) {
        newImages.push(file)

        // Create preview URL
        const reader = new FileReader()
        reader.onload = (e) => {
          setImagePreviews((prev) => [...prev, e.target?.result as string])
        }
        reader.readAsDataURL(file)
      }
    })

    setStimulusImages((prev) => [...prev, ...newImages])
  }

  const addQuestion = () => {
    if (questions.length >= MAX_QUESTIONS) {
      alert(`You can add up to ${MAX_QUESTIONS} questions.`)
      return
    }
    setQuestions((prev) => [...prev, ""])
  }

  const updateQuestion = (index: number, value: string) => {
    setQuestions((prev) => prev.map((q, i) => (i === index ? value : q)))
  }

  const removeQuestion = (index: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index))
  }

  const removeImage = (index: number) => {
    setStimulusImages((prev) => prev.filter((_, i) => i !== index))
    setImagePreviews((prev) => prev.filter((_, i) => i !== index))
  }

  // Asset Intelligence handlers
  const handleAssetUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return
    const file = files[0]
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file')
      return
    }
    setAssetFile(file)
    const reader = new FileReader()
    reader.onload = (e) => {
      setAssetPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
    setAssetAnalysisResults([]) // Clear previous results
  }

  const handleAssetAnalysis = async () => {
    if (!assetFile) {
      alert('Please upload an asset image first')
      return
    }
    if (selectedPersonas.size === 0) {
      alert('Please select at least one persona')
      return
    }

    setAssetAnalyzing(true)
    setAssetAnalysisResults([])

    try {
      const personaIds = Array.from(selectedPersonas)
      console.log('🎨 Starting Asset Intelligence analysis...', {
        file: assetFile.name,
        personas: personaIds
      })

      const response = await AssetIntelligenceAPI.analyze(assetFile, personaIds)
      console.log('✅ Asset analysis complete:', response)

      // Debug: Log detailed info about each result's annotated_image
      response.results.forEach((result: AssetAnalysisResult, i: number) => {
        const hasImage = !!result.annotated_image
        const imageLength = result.annotated_image?.length || 0
        const imagePrefix = result.annotated_image?.substring(0, 50) || 'null'
        console.log(`📸 Result ${i} (${result.persona_name}):`, {
          hasImage,
          imageLength,
          imagePrefix,
          textSummaryLength: result.text_summary?.length || 0,
          error: result.error
        })
      })

      setAssetAnalysisResults(response.results)
    } catch (error) {
      console.error('❌ Asset analysis failed:', error)
      alert(`Asset analysis failed: ${String(error)}`)
    } finally {
      setAssetAnalyzing(false)
    }
  }

  const clearAsset = () => {
    setAssetFile(null)
    setAssetPreview(null)
    setAssetAnalysisResults([])
  }

  // Asset History handlers
  const loadAssetHistory = async () => {
    if (loadingAssetHistory) return

    setLoadingAssetHistory(true)
    try {
      const response = await AssetIntelligenceAPI.getHistory()
      setAssetHistory(response.assets)
    } catch (error) {
      console.error('Failed to load asset history:', error)
    } finally {
      setLoadingAssetHistory(false)
    }
  }

  const loadHistoricalAsset = (historyItem: AssetHistoryItem) => {
    // Load historical results into the viewer
    setAssetAnalysisResults(historyItem.results)
    // Clear current upload preview since we're loading from history
    setAssetFile(null)
    setAssetPreview(null)
  }

  // Format relative time for history items
  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }


  const handleRunAnalysis = async () => {
    if (selectedPersonas.size === 0) {
      alert("Please select at least one persona")
      return
    }

    const trimmedQuestions = questions.map((q) => q.trim()).filter((q) => q.length > 0)

    if (questions.some((q) => q.trim().length === 0) && questions.length > 0) {
      alert("Please fill in all questions or remove empty ones.")
      return
    }

    if (trimmedQuestions.length > MAX_QUESTIONS) {
      alert(`Please limit qualitative questions to ${MAX_QUESTIONS}.`)
      return
    }
    if (selectedMetrics.size === 0) {
      alert("Please select at least one metric")
      return
    }

    // Validate based on content type
    const hasText = stimulusText.trim() !== ""
    const hasImages = stimulusImages.length > 0

    if (contentType === "text" && !hasText) {
      alert("Please enter stimulus text")
      return
    }
    if (contentType === "image" && !hasImages) {
      alert("Please upload at least one image")
      return
    }
    if (contentType === "both" && (!hasText || !hasImages)) {
      alert("Please provide both text and images for analysis")
      return
    }

    setAnalyzing(true)
    try {
      const selectedMetricIds = Array.from(selectedMetrics)
      const metricWeights = selectedMetricIds.reduce<Record<string, number>>((acc, id) => {
        const selection = metricSelections[id]
        acc[id] = selection?.weight ?? metricRegistry.find((m) => m.id === id)?.defaultWeight ?? 1
        return acc
      }, {})

      let response: any
      const personaIds = Array.from(selectedPersonas)

      if (contentType === "text") {
        const payload = {
          persona_ids: personaIds,
          stimulus_text: stimulusText,
          metrics: selectedMetricIds,
          metric_weights: metricWeights,
          questions: trimmedQuestions.length > 0 ? trimmedQuestions : undefined,
        }

        console.log("🚀 Sending JSON request:", payload)
        response = await CohortAPI.analyze(payload)
      } else {
        // Create FormData for file upload (image-only or multimodal)
        const formData = new FormData()
        formData.append("persona_ids", JSON.stringify(personaIds))
        formData.append("metrics", JSON.stringify(selectedMetricIds))
        formData.append("metric_weights", JSON.stringify(metricWeights))
        formData.append("content_type", contentType)

        if (hasText) {
          formData.append("stimulus_text", stimulusText)
        }
        if (trimmedQuestions.length > 0) {
          formData.append("questions", JSON.stringify(trimmedQuestions))
        }
        stimulusImages.forEach((file) => {
          formData.append("stimulus_images", file)
        })

        console.log("🚀 Sending FormData request:", {
          persona_ids: formData.get("persona_ids"),
          metrics: formData.get("metrics"),
          metric_weights: formData.get("metric_weights"),
          content_type: formData.get("content_type"),
          stimulus_text: formData.get("stimulus_text"),
          questions: formData.get("questions"),
          stimulus_images_count: stimulusImages.length,
        })

        response = await CohortAPI.analyze(formData)
      }

      console.log("✅ Received response:", {
        responseType: typeof response,
        cohort_size: response?.cohort_size,
        individual_responses_count: response?.individual_responses?.length,
        has_summary_statistics: !!response?.summary_statistics,
        responseKeys: response ? Object.keys(response) : null,
      })

      // Validate response structure
      if (!response) {
        throw new Error("Received null/undefined response from server")
      }
      if (!response.individual_responses || !Array.isArray(response.individual_responses)) {
        throw new Error("Response missing individual_responses array")
      }
      if (response.individual_responses.length === 0) {
        throw new Error("Response contains no individual responses")
      }

      setProgress(100)
      setTimeout(() => {
        console.log("🧭 Navigating to analytics with data:", {
          cohort_size: response.cohort_size,
          responses_count: response.individual_responses.length,
        })
        navigate("/analytics", {
          state: {
            analysisResults: response,
            originalImages: stimulusImages, // Pass original images for improvement
            contentType: contentType
          }
        })
      }, 500)
    } catch (error) {
      console.error("❌ Error running analysis:", error)
      console.error("❌ Error type:", typeof error)
      console.error("❌ Error string:", String(error))

      // Try to extract useful info from the error
      const errorStr = String(error)
      alert(`Error running analysis: ${errorStr}\n\nCheck browser console for details.`)
    } finally {
      setAnalyzing(false)
    }
  }

  const filteredPersonas = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()

    return personas.filter((persona) => {
      const normalizedPersonaType = (persona.persona_type || "Patient").trim().toLowerCase()
      const normalizedGender = (persona.gender || "").trim().toLowerCase()
      const normalizedLocation = (persona.location || "").trim().toLowerCase()
      const normalizedCondition = (persona.condition || "").trim().toLowerCase()

      const matchesSearch =
        term.length === 0 ||
        persona.name.toLowerCase().includes(term) ||
        normalizedCondition.includes(term) ||
        normalizedLocation.includes(term)

      if (!matchesSearch) {
        return false
      }

      const [minAge, maxAge] = filters.ageRange
      const matchesAge = persona.age >= minAge && persona.age <= maxAge

      const matchesPersonaType =
        filters.personaTypes.length === 0 ||
        filters.personaTypes.some((type) => type.toLowerCase() === normalizedPersonaType)

      const matchesGender =
        filters.genders.length === 0 ||
        filters.genders.some((gender) => gender.trim().toLowerCase() === normalizedGender)

      const matchesLocation =
        filters.locations.length === 0 ||
        filters.locations.some((location) => location.trim().toLowerCase() === normalizedLocation)

      const matchesCondition =
        filters.conditions.length === 0 ||
        filters.conditions.some((condition) => condition.trim().toLowerCase() === normalizedCondition)

      return matchesAge && matchesPersonaType && matchesGender && matchesLocation && matchesCondition
    })
  }, [filters, personas, searchTerm])

  const coveragePercent =
    filteredPersonas.length > 0
      ? Math.round((selectedPersonas.size / filteredPersonas.length) * 100)
      : 0


  return (
    <div className="min-h-screen bg-background animate-fade-in">
      {/* Indegene Purple Page Header */}
      <div className="bg-gradient-to-r from-[hsl(262,60%,38%)] via-[hsl(262,60%,42%)] to-[hsl(280,60%,45%)]">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                <PlayCircle className="h-8 w-8 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold text-white tracking-tight">Simulation Hub</h1>
                  <Badge className="bg-white/20 backdrop-blur-sm text-white border-white/30 font-normal">
                    <Zap className="h-3 w-3 mr-1 text-amber-300" />
                    Real-time Analysis
                  </Badge>
                </div>
                <p className="text-white/80 mt-1">Test marketing messages with AI-powered persona simulations</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {/* Mode Toggle */}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-1 flex gap-1">
                <button
                  onClick={() => setSimulationMode("text")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${simulationMode === "text"
                    ? "bg-white text-primary shadow-sm"
                    : "text-white/80 hover:bg-white/10"
                    }`}
                >
                  <MessageSquare className="h-4 w-4 inline mr-2" />
                  Text Simulation
                </button>
                <button
                  onClick={() => setSimulationMode("asset")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${simulationMode === "asset"
                    ? "bg-white text-primary shadow-sm"
                    : "text-white/80 hover:bg-white/10"
                    }`}
                >
                  <ImageIcon className="h-4 w-4 inline mr-2" />
                  Asset Intelligence
                </button>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 text-right">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-white/70" />
                  <div className="text-2xl font-bold text-white">{selectedPersonas.size}</div>
                </div>
                <div className="text-xs text-white/60">Selected Personas</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={simulationMode === 'asset' ? "flex-1 flex flex-col bg-background" : "max-w-7xl mx-auto px-8 py-8"}>
        {simulationMode === "asset" ? (
          <AssetIntelligenceWorkspace
            results={assetAnalysisResults}
            history={assetHistory}
            isLoading={loadingAssetHistory}
            isAnalyzing={assetAnalyzing}
            onUpload={handleAssetUpload}
            onAnalyze={handleAssetAnalysis}
            onLoadHistory={loadHistoricalAsset}
            onBack={() => setSimulationMode("text")}
            assetPreview={assetPreview}
            selectedPersonasCount={selectedPersonas.size}
          />
        ) : (
          <>
            {/* Message Variant Indicator */}
            {isVariant && (
              <Card className="mb-6 border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-500/20 rounded-lg">
                        <Target className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div>
                        <span className="font-medium text-emerald-800 dark:text-emerald-200">Testing Message Variant</span>
                        <p className="text-xs text-emerald-600 dark:text-emerald-400">
                          Refined version based on previous simulation insights
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-emerald-500/20 text-emerald-700 border-emerald-300">
                      A/B Test
                    </Badge>
                  </div>
                  {originalMessage && (
                    <div className="mt-3 pt-3 border-t border-emerald-200 dark:border-emerald-800">
                      <p className="text-xs text-emerald-600 dark:text-emerald-400">Original message:</p>
                      <p className="text-sm text-emerald-800 dark:text-emerald-200 italic mt-1 line-clamp-2">
                        "{originalMessage.substring(0, 100)}..."
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Progress Bar */}
            {analyzing && (
              <Card className="mb-6 border border-primary/20 bg-primary/5 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-primary">Running Parallel AI Analysis...</span>
                    <span className="text-sm font-bold text-primary">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2 bg-primary/20" />
                </CardContent>
              </Card>
            )}

            {/* Asset Intelligence Mode */}
            {simulationMode === "asset" && (
              <div className="space-y-8">
                {/* Asset Upload */}
                <Card className="card-base overflow-hidden">
                  <CardHeader className="border-b border-border/50 bg-muted/30 pb-4">
                    <div className="flex items-center space-x-4">
                      <div className="p-2 bg-primary/10 rounded-md">
                        <ImageIcon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-3">
                          <CardTitle className="text-lg font-semibold">Asset Intelligence</CardTitle>
                          <Badge variant="outline" className="text-xs font-normal bg-amber-100 text-amber-800 border-amber-300">
                            <Sparkles className="h-3 w-3 mr-1" />
                            Nano Banana Pro
                          </Badge>
                        </div>
                        <CardDescription className="mt-1">
                          Upload a marketing asset to get persona-driven red-lining feedback
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Asset Upload Panel */}
                      <div className="space-y-4">
                        <Label className="text-sm font-medium">Upload Marketing Asset</Label>
                        {!assetPreview ? (
                          <div
                            className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
                            onClick={() => document.getElementById('asset-upload')?.click()}
                          >
                            <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                            <p className="text-sm text-muted-foreground mb-1">
                              Click to upload or drag and drop
                            </p>
                            <p className="text-xs text-muted-foreground">
                              PNG, JPG up to 10MB
                            </p>
                            <input
                              id="asset-upload"
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleAssetUpload(e.target.files)}
                            />
                          </div>
                        ) : (
                          <div className="relative">
                            <img
                              src={assetPreview}
                              alt="Uploaded asset"
                              className="w-full max-h-[300px] object-contain rounded-lg border"
                            />
                            <Button
                              variant="destructive"
                              size="sm"
                              className="absolute top-2 right-2"
                              onClick={clearAsset}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        )}

                        {/* Analyze Button */}
                        <Button
                          className="w-full btn-primary"
                          onClick={handleAssetAnalysis}
                          disabled={!assetFile || selectedPersonas.size === 0 || assetAnalyzing}
                        >
                          {assetAnalyzing ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Analyzing with Nano Banana Pro...
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-4 w-4 mr-2" />
                              Analyze Asset ({selectedPersonas.size} personas)
                            </>
                          )}
                        </Button>
                      </div>

                      {/* Right Panel - Results or History */}
                      <div className="space-y-3">
                        {/* Tab Toggle - only show when there are results */}
                        {assetAnalysisResults.length > 0 && (
                          <div className="flex gap-1 p-1 bg-muted/50 rounded-lg w-fit">
                            <button
                              onClick={() => setAssetRightPanelView("results")}
                              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${assetRightPanelView === "results"
                                ? "bg-white shadow-sm text-foreground"
                                : "text-muted-foreground hover:text-foreground"
                                }`}
                            >
                              <Eye className="h-3.5 w-3.5 inline mr-1.5" />
                              Results
                            </button>
                            <button
                              onClick={() => setAssetRightPanelView("history")}
                              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${assetRightPanelView === "history"
                                ? "bg-white shadow-sm text-foreground"
                                : "text-muted-foreground hover:text-foreground"
                                }`}
                            >
                              <History className="h-3.5 w-3.5 inline mr-1.5" />
                              History
                              {assetHistory.length > 0 && (
                                <Badge variant="secondary" className="ml-1.5 text-[10px] h-4 px-1.5">
                                  {assetHistory.length}
                                </Badge>
                              )}
                            </button>
                          </div>
                        )}

                        {/* Results View */}
                        {assetRightPanelView === "results" && assetAnalysisResults.length > 0 && (
                          <AnnotatedAssetViewer
                            results={assetAnalysisResults}
                            originalAssetUrl={assetPreview || undefined}
                            isLoading={assetAnalyzing}
                          />
                        )}

                        {/* History View (default when no results) */}
                        {(assetRightPanelView === "history" || assetAnalysisResults.length === 0) && (
                          <div className="rounded-lg border bg-card">
                            <div className="p-3 border-b bg-muted/30">
                              <div className="flex items-center justify-between">
                                <h4 className="text-sm font-medium flex items-center gap-2">
                                  <History className="h-4 w-4 text-muted-foreground" />
                                  Previous Analyses
                                </h4>
                                {assetHistory.length > 0 && (
                                  <Badge variant="outline" className="text-xs">
                                    {assetHistory.length} saved
                                  </Badge>
                                )}
                              </div>
                            </div>

                            {/* Loading State */}
                            {loadingAssetHistory && (
                              <div className="p-8 text-center">
                                <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                                <p className="text-sm text-muted-foreground mt-2">Loading history...</p>
                              </div>
                            )}

                            {/* Empty State */}
                            {!loadingAssetHistory && assetHistory.length === 0 && (
                              <div className="p-8 text-center">
                                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                                  <FolderOpen className="h-6 w-6 text-muted-foreground" />
                                </div>
                                <p className="text-sm font-medium">No previous analyses</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Upload an asset and run analysis to see it here
                                </p>
                              </div>
                            )}

                            {/* History Grid */}
                            {!loadingAssetHistory && assetHistory.length > 0 && (
                              <div className="p-3 grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto">
                                {assetHistory.map((item, idx) => (
                                  <button
                                    key={item.image_hash || idx}
                                    onClick={() => loadHistoricalAsset(item)}
                                    className="group relative rounded-lg border border-border/50 hover:border-primary/50 hover:shadow-md p-2 text-left transition-all bg-background"
                                  >
                                    {/* Thumbnail */}
                                    <div className="aspect-video rounded-md overflow-hidden bg-muted mb-2">
                                      {item.results[0]?.annotated_image ? (
                                        <img
                                          src={item.results[0].annotated_image}
                                          alt={item.asset_name || 'Asset'}
                                          className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                                        />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                          <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
                                        </div>
                                      )}
                                    </div>

                                    {/* Details */}
                                    <p className="text-xs font-medium truncate">
                                      {item.asset_name || 'Unnamed Asset'}
                                    </p>
                                    <div className="flex items-center justify-between mt-1">
                                      <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                                        {item.results.length} persona{item.results.length !== 1 ? 's' : ''}
                                      </Badge>
                                      <span className="text-[10px] text-muted-foreground">
                                        {formatRelativeTime(item.created_at)}
                                      </span>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Analyzing State - show in results area */}
                        {assetAnalyzing && assetRightPanelView === "results" && (
                          <AnnotatedAssetViewer
                            results={[]}
                            originalAssetUrl={assetPreview || undefined}
                            isLoading={true}
                          />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Persona Selection (reused for asset mode) */}
                <Card className="card-base overflow-hidden">
                  <CardHeader className="border-b border-border/50 bg-muted/30 pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="p-2 bg-primary/10 rounded-md">
                          <Users className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg font-semibold">Select Personas</CardTitle>
                          <CardDescription className="mt-1">
                            Choose personas to provide feedback on your asset
                          </CardDescription>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-foreground">{selectedPersonas.size}</p>
                        <p className="text-xs text-muted-foreground">Selected</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <ScrollArea className="h-[250px]">
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                        {filteredPersonas.map((persona) => (
                          <div
                            key={persona.id}
                            onClick={() => togglePersona(persona.id)}
                            className={`p-3 rounded-lg border cursor-pointer transition-all ${selectedPersonas.has(persona.id)
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50"
                              }`}
                          >
                            <div className="flex items-center gap-2">
                              <Checkbox
                                checked={selectedPersonas.has(persona.id)}
                                onCheckedChange={() => togglePersona(persona.id)}
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{persona.name}</p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {persona.persona_type} • {persona.condition}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Text Simulation Mode (Original Content) */}
            {simulationMode === "text" && (
              <div className="space-y-8">
                {/* Step 1: Select Cohort - Enhanced */}
                <Card className="card-base overflow-hidden">
                  <CardHeader className="border-b border-border/50 bg-muted/30 pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="p-2 bg-primary/10 rounded-md">
                          <Users className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-3">
                            <CardTitle className="text-lg font-semibold">Step 1: Build Your Cohort</CardTitle>
                            <Badge variant="outline" className="text-xs font-normal text-muted-foreground">
                              Required
                            </Badge>
                          </div>
                          <CardDescription className="mt-1">
                            Select personas to include in your simulation cohort
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <p className="text-2xl font-bold text-foreground">{selectedPersonas.size}</p>
                          <p className="text-xs text-muted-foreground">Selected</p>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6">
                    {loading ? (
                      <div className="space-y-4">
                        {[...Array(3)].map((_, i) => (
                          <Skeleton key={i} className="h-16 w-full" />
                        ))}
                      </div>
                    ) : personas.length === 0 ? (
                      <div className="text-center py-16">
                        <div className="inline-flex items-center justify-center p-4 bg-muted rounded-full mb-4">
                          <Users className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-semibold text-foreground mb-2">
                          No Personas Available
                        </h3>
                        <p className="text-muted-foreground mb-6">Create personas first to run simulations</p>
                        <Button
                          className="btn-primary"
                          onClick={() => navigate("/personas")}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Create Personas
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-6 lg:flex-row">
                        <div className="flex-1 space-y-4">
                          {/* Search and Action Bar */}
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                                <Button
                                  variant={recruitmentMode === "manual" ? "secondary" : "ghost"}
                                  size="sm"
                                  onClick={() => setRecruitmentMode("manual")}
                                  className={recruitmentMode === "manual" ? "shadow-sm" : ""}
                                >
                                  <Filter className="h-4 w-4 mr-2" />
                                  Manual Filter
                                </Button>
                                <Button
                                  variant={recruitmentMode === "ai" ? "secondary" : "ghost"}
                                  size="sm"
                                  onClick={() => setRecruitmentMode("ai")}
                                  className={recruitmentMode === "ai" ? "shadow-sm bg-primary/10 text-primary hover:bg-primary/20" : ""}
                                >
                                  <Sparkles className="h-4 w-4 mr-2" />
                                  AI Recruitment
                                </Button>
                              </div>

                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedPersonas(new Set(filteredPersonas.map((p) => p.id)))}
                                  className="border-violet-300 text-violet-700 hover:bg-violet-50 dark:text-violet-300 dark:hover:bg-violet-900/30"
                                >
                                  <CheckCircle2 className="h-4 w-4 mr-1" />
                                  Select All
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedPersonas(new Set())}
                                  className="border-gray-300"
                                >
                                  Clear All
                                </Button>
                              </div>
                            </div>

                            {recruitmentMode === "manual" ? (
                              <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                  type="text"
                                  placeholder="Search personas by name, condition, or location..."
                                  value={searchTerm}
                                  onChange={(e) => setSearchTerm(e.target.value)}
                                  className="pl-10"
                                />
                              </div>
                            ) : (
                              <div className="flex gap-2">
                                <div className="relative flex-1">
                                  <Sparkles className="absolute left-3 top-3 h-4 w-4 text-primary" />
                                  <Textarea
                                    placeholder="Describe the cohort you want to recruit (e.g., 'Find 5 elderly male patients with diabetes who are concerned about lifestyle changes')..."
                                    value={recruitmentPrompt}
                                    onChange={(e) => setRecruitmentPrompt(e.target.value)}
                                    className="pl-10 min-h-[80px] resize-none"
                                  />
                                </div>
                                <Button
                                  onClick={handleRecruit}
                                  disabled={isRecruiting || !recruitmentPrompt.trim()}
                                  className="h-auto btn-primary"
                                >
                                  {isRecruiting ? (
                                    <>
                                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                      Recruiting...
                                    </>
                                  ) : (
                                    <>
                                      <Zap className="h-4 w-4 mr-2" />
                                      Recruit
                                    </>
                                  )}
                                </Button>
                              </div>
                            )}
                          </div>

                          {/* Stats Bar */}
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            <div className="rounded-lg border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-4 shadow-sm dark:border-violet-900/40 dark:from-violet-950/20 dark:to-gray-900">
                              <p className="text-xs font-semibold uppercase tracking-wide text-violet-600 dark:text-violet-300">
                                All Personas
                              </p>
                              <div className="mt-1 flex items-end justify-between">
                                <p className="text-2xl font-bold text-violet-900 dark:text-violet-100">{totalPersonas}</p>
                                <Badge className="bg-violet-500/20 text-violet-600 dark:bg-violet-900/40 dark:text-violet-200">
                                  Dataset
                                </Badge>
                              </div>
                              <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                                Total personas available in your library.
                              </p>
                            </div>

                            <div className="rounded-lg border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-4 shadow-sm dark:border-blue-900/40 dark:from-blue-950/20 dark:to-gray-900">
                              <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-300">
                                Filtered Cohort
                              </p>
                              <div className="mt-1 flex items-end justify-between">
                                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                                  {filteredPersonas.length}
                                </p>
                                <span className="text-xs text-blue-600/80 dark:text-blue-300/80">
                                  of {totalPersonas}
                                </span>
                              </div>
                              <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                                Personas matching your current filters.
                              </p>
                            </div>

                            <div className="rounded-lg border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-4 shadow-sm dark:border-emerald-900/40 dark:from-emerald-950/20 dark:to-gray-900">
                              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-300">
                                Selected Personas
                              </p>
                              <div className="mt-1 flex items-end justify-between">
                                <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">
                                  {selectedPersonas.size}
                                </p>
                                <span className="text-xs text-emerald-600/80 dark:text-emerald-300/80">
                                  {coveragePercent}%
                                </span>
                              </div>
                              <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                                Coverage of filtered cohort selected for simulation.
                              </p>
                            </div>

                            <div className="rounded-lg border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-4 shadow-sm dark:border-amber-900/40 dark:from-amber-950/20 dark:to-gray-900">
                              <p className="text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-300">
                                Active Filters
                              </p>
                              <div className="mt-1 flex items-end justify-between">
                                <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">{activeFiltersCount}</p>
                                <span className="text-xs text-amber-600/80 dark:text-amber-300/80">in play</span>
                              </div>
                              <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">{filterSummary}</p>
                            </div>
                          </div>

                          {/* Personas Table */}
                          <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                            <div className="max-h-96 overflow-y-auto">
                              <table className="w-full">
                                <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0 z-10">
                                  <tr>
                                    <th className="p-4 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                                      <Checkbox
                                        checked={
                                          filteredPersonas.length > 0 &&
                                          filteredPersonas.every((p) => selectedPersonas.has(p.id))
                                        }
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            setSelectedPersonas(new Set(filteredPersonas.map((p) => p.id)))
                                          } else {
                                            setSelectedPersonas(new Set())
                                          }
                                        }}
                                      />
                                    </th>
                                    <th className="p-4 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Name</th>
                                    <th className="p-4 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Type</th>
                                    <th className="p-4 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Age</th>
                                    <th className="p-4 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                                      Gender
                                    </th>
                                    <th className="p-4 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                                      Condition
                                    </th>
                                    <th className="p-4 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                                      Location
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                  {filteredPersonas.map((persona) => {
                                    const isHCP = (persona.persona_type || "").trim().toLowerCase() === "hcp"
                                    const personaTypeLabel = isHCP ? "HCP" : "Patient"

                                    return (
                                      <tr
                                        key={persona.id}
                                        className={`hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer ${selectedPersonas.has(persona.id) ? "bg-violet-50 dark:bg-violet-900/20" : ""
                                          }`}
                                        onClick={() => togglePersona(persona.id)}
                                      >
                                        <td className="p-4">
                                          <Checkbox
                                            checked={selectedPersonas.has(persona.id)}
                                            onChange={() => togglePersona(persona.id)}
                                            onClick={(e) => e.stopPropagation()}
                                          />
                                        </td>
                                        <td className="p-4">
                                          <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-xs font-bold">
                                              {persona.name.charAt(0)}
                                            </div>
                                            <span className="font-medium text-gray-900 dark:text-gray-100">{persona.name}</span>
                                          </div>
                                        </td>
                                        <td className="p-4">
                                          <Badge
                                            variant="secondary"
                                            className={
                                              isHCP
                                                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200"
                                                : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200"
                                            }
                                          >
                                            {personaTypeLabel}
                                          </Badge>
                                        </td>
                                        <td className="p-4 text-sm text-gray-600 dark:text-gray-400">{persona.age}</td>
                                        <td className="p-4 text-sm text-gray-600 dark:text-gray-400">{persona.gender}</td>
                                        <td className="p-4">
                                          <Badge variant="outline" className="text-xs">
                                            {persona.condition}
                                          </Badge>
                                        </td>
                                        <td className="p-4 text-sm text-gray-600 dark:text-gray-400">{persona.location}</td>
                                      </tr>
                                    )
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>

                        {/* Filters Sidebar */}
                        <div className="w-full lg:w-80 xl:w-96">
                          <Card className="border border-violet-200/60 shadow-lg backdrop-blur-sm bg-white/95 dark:bg-gray-900/80 dark:border-violet-900/40">
                            <CardHeader className="pb-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 p-2 text-white">
                                    <Filter className="h-4 w-4" />
                                  </div>
                                  <div>
                                    <CardTitle className="text-lg">Recruitment Filters</CardTitle>
                                    <CardDescription>Refine personas by demographics and attributes</CardDescription>
                                  </div>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-6">
                              <div>
                                <div className="flex items-center justify-between">
                                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Age Range</Label>
                                  <span className="text-sm font-semibold text-primary">
                                    {filters.ageRange[0]} - {filters.ageRange[1]}
                                  </span>
                                </div>
                                <div className="mt-4">
                                  <Slider
                                    value={filters.ageRange}
                                    onValueChange={updateAgeRange}
                                    min={DEFAULT_AGE_RANGE[0]}
                                    max={DEFAULT_AGE_RANGE[1]}
                                    step={1}
                                  />
                                  <div className="mt-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                                    <span>{DEFAULT_AGE_RANGE[0]}</span>
                                    <span>{DEFAULT_AGE_RANGE[1]}</span>
                                  </div>
                                </div>
                              </div>

                              <Separator />

                              <div>
                                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Persona Type</Label>
                                <div className="mt-3 space-y-2">
                                  {personaTypeOptions.map((type) => {
                                    const count = personaTypeCounts[type as PersonaType] ?? 0
                                    const checked = filters.personaTypes.includes(type)
                                    return (
                                      <label
                                        key={type}
                                        className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white/80 px-3 py-2 shadow-sm transition hover:border-violet-300 dark:border-gray-700 dark:bg-gray-900/60 dark:hover:border-violet-700"
                                      >
                                        <div className="flex items-center gap-3">
                                          <Checkbox
                                            checked={checked}
                                            onChange={() => toggleFilterValue("personaTypes", type)}
                                            className="border-gray-300"
                                          />
                                          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{type}</span>
                                        </div>
                                        <Badge
                                          variant="secondary"
                                          className="ml-auto bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-200"
                                        >
                                          {count}
                                        </Badge>
                                      </label>
                                    )
                                  })}
                                </div>
                              </div>

                              <div>
                                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Gender</Label>
                                <div className="mt-3 space-y-2">
                                  {filterOptions.genders.map((gender) => {
                                    const count = genderCounts.get(gender) ?? 0
                                    const checked = filters.genders.includes(gender)
                                    return (
                                      <label
                                        key={gender}
                                        className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white/80 px-3 py-2 shadow-sm transition hover:border-violet-300 dark:border-gray-700 dark:bg-gray-900/60 dark:hover:border-violet-700"
                                      >
                                        <div className="flex items-center gap-3">
                                          <Checkbox
                                            checked={checked}
                                            onChange={() => toggleFilterValue("genders", gender)}
                                            className="border-gray-300"
                                          />
                                          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{gender}</span>
                                        </div>
                                        <Badge
                                          variant="secondary"
                                          className="ml-auto bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-200"
                                        >
                                          {count}
                                        </Badge>
                                      </label>
                                    )
                                  })}
                                  {filterOptions.genders.length === 0 && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                      No gender attributes available for current personas.
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div>
                                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Location</Label>
                                <ScrollArea className="mt-3 h-40 pr-1">
                                  <div className="space-y-2">
                                    {filterOptions.locations.map((location) => {
                                      const count = locationCounts.get(location) ?? 0
                                      const checked = filters.locations.includes(location)
                                      return (
                                        <label
                                          key={location}
                                          className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white/80 px-3 py-2 shadow-sm transition hover:border-violet-300 dark:border-gray-700 dark:bg-gray-900/60 dark:hover:border-violet-700"
                                        >
                                          <div className="flex items-center gap-3">
                                            <Checkbox
                                              checked={checked}
                                              onChange={() => toggleFilterValue("locations", location)}
                                              className="border-gray-300"
                                            />
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                              {location}
                                            </span>
                                          </div>
                                          <Badge
                                            variant="secondary"
                                            className="ml-auto bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-200"
                                          >
                                            {count}
                                          </Badge>
                                        </label>
                                      )
                                    })}
                                    {filterOptions.locations.length === 0 && (
                                      <p className="text-xs text-gray-500 dark:text-gray-400">
                                        No location data available for current personas.
                                      </p>
                                    )}
                                  </div>
                                </ScrollArea>
                              </div>

                              <div>
                                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Condition</Label>
                                <ScrollArea className="mt-3 h-40 pr-1">
                                  <div className="space-y-2">
                                    {filterOptions.conditions.map((condition) => {
                                      const count = conditionCounts.get(condition) ?? 0
                                      const checked = filters.conditions.includes(condition)
                                      return (
                                        <label
                                          key={condition}
                                          className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white/80 px-3 py-2 shadow-sm transition hover:border-violet-300 dark:border-gray-700 dark:bg-gray-900/60 dark:hover:border-violet-700"
                                        >
                                          <div className="flex items-center gap-3">
                                            <Checkbox
                                              checked={checked}
                                              onChange={() => toggleFilterValue("conditions", condition)}
                                              className="border-gray-300"
                                            />
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                              {condition}
                                            </span>
                                          </div>
                                          <Badge
                                            variant="secondary"
                                            className="ml-auto bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-200"
                                          >
                                            {count}
                                          </Badge>
                                        </label>
                                      )
                                    })}
                                    {filterOptions.conditions.length === 0 && (
                                      <p className="text-xs text-gray-500 dark:text-gray-400">
                                        No condition data available for current personas.
                                      </p>
                                    )}
                                  </div>
                                </ScrollArea>
                              </div>

                              <Button
                                variant="outline"
                                className="w-full border-dashed border-violet-300 text-violet-700 transition hover:bg-violet-50 dark:border-violet-800 dark:text-violet-200 dark:hover:bg-violet-900/40"
                                onClick={handleResetFilters}
                              >
                                Reset Filters
                              </Button>
                            </CardContent>
                          </Card>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Step 2: Configure Simulation - Enhanced */}
                <Card className="border-0 shadow-2xl backdrop-blur-sm bg-white/90 dark:bg-gray-900/90 overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl blur-lg opacity-50"></div>
                          <div className="relative p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl">
                            <Settings className="h-6 w-6 text-white" />
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center gap-3">
                            <CardTitle className="text-2xl">Step 2: Configure Analysis</CardTitle>
                            <Badge variant="outline" className="border-blue-300 text-blue-700 dark:text-blue-300">
                              Customize
                            </Badge>
                          </div>
                          <CardDescription className="text-base mt-1">
                            Enter your message and select metrics to analyze
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Gauge className="h-8 w-8 text-blue-500" />
                        <div className="text-right">
                          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{selectedMetrics.size}</p>
                          <p className="text-xs text-gray-500">Metrics</p>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6 pt-6">
                    {/* Content Type Selection */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-base font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                          <Settings className="h-4 w-4 text-gray-500" />
                          Content Type
                        </Label>
                        <Badge className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-0">
                          <Eye className="h-3 w-3 mr-1" />
                          Multi-Modal
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <Button
                          variant={contentType === "text" ? "default" : "outline"}
                          className={`p-4 h-auto ${contentType === "text" ? "bg-gradient-to-r from-primary to-secondary text-white" : ""}`}
                          onClick={() => setContentType("text")}
                        >
                          <div className="text-center">
                            <FileText className="h-6 w-6 mx-auto mb-2" />
                            <span className="block text-sm font-medium">Text Only</span>
                            <span className="text-xs opacity-80">Marketing copy, messaging</span>
                          </div>
                        </Button>
                        <Button
                          variant={contentType === "image" ? "default" : "outline"}
                          className={`p-4 h-auto ${contentType === "image" ? "bg-gradient-to-r from-primary to-secondary text-white" : ""}`}
                          onClick={() => setContentType("image")}
                        >
                          <div className="text-center">
                            <ImageIcon className="h-6 w-6 mx-auto mb-2" />
                            <span className="block text-sm font-medium">Image Only</span>
                            <span className="text-xs opacity-80">Visual ads, graphics</span>
                          </div>
                        </Button>
                        <Button
                          variant={contentType === "both" ? "default" : "outline"}
                          className={`p-4 h-auto ${contentType === "both" ? "bg-gradient-to-r from-primary to-secondary text-white" : ""}`}
                          onClick={() => setContentType("both")}
                        >
                          <div className="text-center">
                            <div className="flex justify-center gap-1 mb-2">
                              <FileText className="h-5 w-5" />
                              <ImageIcon className="h-5 w-5" />
                            </div>
                            <span className="block text-sm font-medium">Text + Image</span>
                            <span className="text-xs opacity-80">Complete campaigns</span>
                          </div>
                        </Button>
                      </div>
                    </div>

                    <Separator />

                    {/* Text Input Section */}
                    {(contentType === "text" || contentType === "both") && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label
                            htmlFor="stimulus"
                            className="text-base font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2"
                          >
                            <FileText className="h-4 w-4 text-gray-500" />
                            Marketing Message / Stimulus Text
                          </Label>
                          <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">
                            <Sparkles className="h-3 w-3 mr-1" />
                            AI Analysis
                          </Badge>
                        </div>
                        <Textarea
                          id="stimulus"
                          placeholder="Enter your marketing message, ad copy, or clinical communication here..."
                          value={stimulusText}
                          onChange={(e) => setStimulusText(e.target.value)}
                          rows={5}
                          className="resize-none font-medium"
                        />
                        <div className="flex gap-2">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Try a sample:</p>
                          {SAMPLE_MESSAGES.map((message, index) => (
                            <Button
                              key={index}
                              variant="ghost"
                              size="sm"
                              className="text-xs"
                              onClick={() => setStimulusText(message)}
                            >
                              Sample {index + 1}
                            </Button>
                          ))}
                        </div>

                        <div className="mt-4 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-4 bg-gray-50/60 dark:bg-gray-900/50">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                                <MessageSquare className="h-4 w-4 text-primary" />
                                Optional Qualitative Questions
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                Ask up to {MAX_QUESTIONS} custom questions and get persona-specific answers.
                              </p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={addQuestion}
                              disabled={questions.length >= MAX_QUESTIONS}
                              className="flex items-center gap-1"
                            >
                              <Plus className="h-4 w-4" />
                              Add Question
                            </Button>
                          </div>

                          {questions.length === 0 && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                              No questions added yet.
                            </p>
                          )}

                          <div className="space-y-3">
                            {questions.map((question, index) => (
                              <div key={index} className="flex items-start gap-2">
                                <Badge variant="outline" className="mt-2">Q{index + 1}</Badge>
                                <Input
                                  value={question}
                                  placeholder="e.g., What would make this message more convincing for you?"
                                  onChange={(e) => updateQuestion(index, e.target.value)}
                                  className="flex-1"
                                />
                                <Button variant="ghost" size="icon" onClick={() => removeQuestion(index)}>
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Image Upload Section */}
                    {(contentType === "image" || contentType === "both") && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label className="text-base font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                            <ImageIcon className="h-4 w-4 text-gray-500" />
                            Visual Content / Image Ads
                          </Label>
                          <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">
                            <Eye className="h-3 w-3 mr-1" />
                            Visual Analysis
                          </Badge>
                        </div>

                        {/* Image Upload Area */}
                        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 hover:border-primary transition-colors">
                          <input
                            type="file"
                            id="image-upload"
                            multiple
                            accept="image/*"
                            onChange={(e) => handleImageUpload(e.target.files)}
                            className="hidden"
                          />
                          <label htmlFor="image-upload" className="cursor-pointer block">
                            <div className="text-center pointer-events-none">
                              <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Upload Image Ads</h3>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                Drag and drop your ad creatives here, or click to browse
                              </p>
                              <span className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 pointer-events-auto">
                                <Plus className="h-4 w-4 mr-2" />
                                Choose Images
                              </span>
                            </div>
                          </label>
                        </div>

                        {/* Image Previews */}
                        {imagePreviews.length > 0 && (
                          <div className="space-y-3">
                            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              Uploaded Images ({imagePreviews.length})
                            </Label>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                              {imagePreviews.map((preview, index) => (
                                <div key={preview} className="relative group">
                                  <img
                                    src={preview || "/placeholder.svg"}
                                    alt={`Upload preview ${index + 1}`}
                                    className="w-full h-32 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                                  />
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => removeImage(index)}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                  <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                                    {stimulusImages[index]?.name || `Image ${index + 1}`}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <Separator />

                    {/* Metrics Selection */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-base font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                          <BarChart3 className="h-4 w-4 text-gray-500" />
                          Analysis Metrics
                        </Label>
                        <div className="flex items-center gap-3">
                          <Button
                            variant={showMetricWeights ? "secondary" : "ghost"}
                            size="sm"
                            className="h-8"
                            onClick={() => setShowMetricWeights((prev) => !prev)}
                          >
                            <Gauge className="h-4 w-4 mr-1" />
                            {showMetricWeights ? "Hide Weights" : "Set Weights"}
                          </Button>
                          <span className="text-sm text-gray-500">
                            {selectedMetrics.size} of {metricRegistry.length} selected
                          </span>
                        </div>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        {metricRegistry.map((metric) => {
                          const isSelected = selectedMetrics.has(metric.id)
                          const label = metric.id === "intent_to_action" ? intentLabel : metric.label
                          const description = metric.id === "intent_to_action" ? intentDescription : metric.description
                          const iconMeta = metric.icon
                          const Icon = iconMeta?.component
                          const weightValue = metricSelections[metric.id]?.weight ?? metric.defaultWeight ?? 1
                          return (
                            <div
                              key={metric.id}
                              className={`relative rounded-xl border-2 transition-all cursor-pointer ${isSelected
                                ? "border-primary bg-gradient-to-r from-primary/5 to-secondary/5"
                                : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                                }`}
                              onClick={() => toggleMetric(metric.id)}
                            >
                              <div className="p-4">
                                <div className="flex items-start space-x-3">
                                  <Checkbox
                                    checked={isSelected}
                                    onChange={() => toggleMetric(metric.id)}
                                    onClick={(e) => e.stopPropagation()}
                                    className="mt-1"
                                  />
                                  {Icon && iconMeta && (
                                    <div className={`p-2 rounded-lg ${iconMeta.bgColor}`}>
                                      <Icon className={`h-4 w-4 ${iconMeta.color}`} />
                                    </div>
                                  )}
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium text-gray-900 dark:text-gray-100">{label}</span>
                                      {isSelected && <CheckCircle2 className="h-4 w-4 text-primary" />}
                                    </div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{description}</p>
                                    {isSelected && showMetricWeights && (
                                      <div className="mt-3 flex items-center gap-2">
                                        <Label htmlFor={`${metric.id}-weight`} className="text-xs text-gray-500">
                                          Weight
                                        </Label>
                                        <Input
                                          id={`${metric.id}-weight`}
                                          type="number"
                                          min={0}
                                          step={0.1}
                                          value={weightValue}
                                          onClick={(e) => e.stopPropagation()}
                                          onChange={(e) => updateMetricWeight(metric.id, Number(e.target.value))}
                                          className="w-24 h-9"
                                        />
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    <Separator />

                    {/* Summary */}
                    <div className="bg-gradient-to-r from-primary/5 to-secondary/5 rounded-xl p-6">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                        <Brain className="h-5 w-5 text-primary" />
                        Simulation Summary
                      </h4>
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">Personas</p>
                          <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{selectedPersonas.size}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">Metrics</p>
                          <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{selectedMetrics.size}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">Content</p>
                          <p className="text-xl font-bold text-gray-900 dark:text-gray-100 capitalize">
                            {contentType === "both" ? "Multi-Modal" : contentType}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">Est. Time</p>
                          <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                            ~
                            {Math.max(
                              1,
                              Math.round(
                                selectedPersonas.size * (contentType === "image" || contentType === "both" ? 1.5 : 0.5),
                              ),
                            )}
                            s
                          </p>
                        </div>
                      </div>
                      {(stimulusText.trim() || stimulusImages.length > 0) && (
                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                          <div className="flex items-center gap-4 text-sm">
                            {stimulusText.trim() && (
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-primary" />
                                <span className="text-gray-600 dark:text-gray-400">Text message ready</span>
                              </div>
                            )}
                            {stimulusImages.length > 0 && (
                              <div className="flex items-center gap-2">
                                <ImageIcon className="h-4 w-4 text-purple-600" />
                                <span className="text-gray-600 dark:text-gray-400">
                                  {stimulusImages.length} image{stimulusImages.length > 1 ? "s" : ""} uploaded
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Run Button */}
                    <Button
                      className="w-full bg-gradient-to-r from-primary to-secondary text-white hover:shadow-2xl transition-all duration-200 py-6 text-lg font-semibold group"
                      size="lg"
                      onClick={handleRunAnalysis}
                      disabled={
                        analyzing ||
                        selectedPersonas.size === 0 ||
                        selectedMetrics.size === 0 ||
                        (contentType === "text" && !stimulusText.trim()) ||
                        (contentType === "image" && stimulusImages.length === 0) ||
                        (contentType === "both" && (!stimulusText.trim() || stimulusImages.length === 0))
                      }
                    >
                      {analyzing ? (
                        <>
                          <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                          Parallel AI Analysis... {progress.toFixed(0)}%
                        </>
                      ) : (
                        <>
                          <PlayCircle className="mr-3 h-5 w-5 group-hover:scale-110 transition-transform" />
                          Run {contentType === "image" ? "Visual" : contentType === "both" ? "Multi-Modal" : "Text"} Analysis
                          <ChevronRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
