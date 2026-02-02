"use client"

import React, { useEffect, useMemo, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { PersonasAPI, BrandsAPI, SegmentsAPI, DiseasePacksAPI } from "@/lib/api"
import type { Segment, DiseasePack } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { Textarea } from "../components/ui/textarea"
import { Badge } from "../components/ui/badge"
import { Separator } from "../components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select"
import { VeevaCRMImporter } from "../components/VeevaCRMImporter"
import BrandInsightSelector from "@/components/BrandInsightSelector"
import type { BrandInsight, SuggestionResponse } from "@/components/BrandInsightSelector"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../components/ui/tooltip"
import {
  User,
  MapPin,
  Heart,
  Loader2,
  Users,
  Calendar,
  Sparkles,
  Brain,
  Target,
  CheckCircle,
  Settings,
  UserPlus,
  ArrowLeft,
  Database,
} from "lucide-react"

interface BrandOption {
  id: number
  name: string
}

interface FieldStatus {
  key: string
  label: string
  complete: boolean
  message?: string
}

interface TranscriptSuggestions {
  summary?: string
  demographics?: Record<string, any>
  legacy?: {
    motivations?: string[]
    beliefs?: string[]
    tensions?: string[]
  }
  core?: any
  source?: Record<string, any>
}

export function CreatePersona() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const urlBrandId = searchParams.get('brand_id')
  const urlCondition = searchParams.get('condition')

  const [generating, setGenerating] = useState(false)
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0 })
  const [creationMode, setCreationMode] = useState<"manual" | "ai">("manual")
  const [error, setError] = useState<string | null>(null)

  // Form data for manual persona creation
  const [manualFormData, setManualFormData] = useState({
    name: "",
    age: "",
    gender: "",
    condition: urlCondition || "",
    region: "",
    occupation: "",
    medical_background: "",
    lifestyle_and_values: "",
    pain_points: ["", "", "", ""],
    motivations: ["", "", "", ""],
    beliefs: ["", "", "", ""],
    communication_preferences: {
      preferred_channels: "",
      information_style: "",
      frequency: ""
    }
  })

  // Form data for AI persona creation
  const [aiFormData, setAiFormData] = useState({
    age: '',
    gender: '',
    condition: urlCondition || '',
    region: '',
    concerns: "",
    count: '1',

    segment: '',
    disease: ''
  })

  const [brands, setBrands] = useState<BrandOption[]>([])
  const [segments, setSegments] = useState<Segment[]>([])
  const [diseasePacks, setDiseasePacks] = useState<DiseasePack[]>([])
  const [manualSelectedInsights, setManualSelectedInsights] = useState<BrandInsight[]>([])
  const [manualSuggestions, setManualSuggestions] = useState<SuggestionResponse | null>(null)
  const [manualBrandId, setManualBrandId] = useState<number | null>(urlBrandId ? parseInt(urlBrandId) : null)
  const [aiBrandId, setAiBrandId] = useState<number | null>(urlBrandId ? parseInt(urlBrandId) : null)
  const [aiTargetSegment, setAiTargetSegment] = useState("")
  const [transcriptText, setTranscriptText] = useState("")
  const [transcriptFile, setTranscriptFile] = useState<File | null>(null)
  const [transcriptSuggestions, setTranscriptSuggestions] = useState<TranscriptSuggestions | null>(null)
  const [transcriptLoading, setTranscriptLoading] = useState(false)
  const [recentlyCreated, setRecentlyCreated] = useState<{ ids: number[]; names: string[] }>({ ids: [], names: [] })

  // Similarity check modal state
  const [similarityModal, setSimilarityModal] = useState<{
    open: boolean;
    similarityScore: number;
    mostSimilar: { id: number; name: string } | null;
    overlappingTraits: string[];
    recommendation: string;
    pendingSubmit: (() => Promise<void>) | null;
  }>({
    open: false,
    similarityScore: 0,
    mostSimilar: null,
    overlappingTraits: [],
    recommendation: '',
    pendingSubmit: null,
  })

  const manualFieldStatuses = useMemo<FieldStatus[]>(() => {
    const ageValue = parseInt(manualFormData.age)
    const ageValid = !isNaN(ageValue) && ageValue >= 1 && ageValue <= 120

    return [
      {
        key: "name",
        label: "Name",
        complete: manualFormData.name.trim().length > 0,
        message: "Add a persona name to identify this profile."
      },
      {
        key: "age",
        label: "Age",
        complete: manualFormData.age.trim().length === 0 ? false : ageValid,
        message: "Use a realistic age between 1 and 120."
      },
      {
        key: "gender",
        label: "Gender",
        complete: manualFormData.gender.trim().length > 0,
        message: "Capture gender to enrich demographics."
      },
      {
        key: "condition",
        label: "Primary Medical Condition",
        complete: manualFormData.condition.trim().length > 0,
        message: "Specify at least one condition for better grounding."
      },
      {
        key: "region",
        label: "Country",
        complete: manualFormData.region.trim().length > 0,
        message: "Add a country or region to localize insights."
      },
    ]
  }, [manualFormData])

  const aiFieldStatuses = useMemo<FieldStatus[]>(() => {
    const ageValue = parseInt(aiFormData.age)
    const ageValid = !isNaN(ageValue) && ageValue >= 1 && ageValue <= 120

    return [
      {
        key: "age",
        label: "Age",
        complete: aiFormData.age.trim().length === 0 ? false : ageValid,
        message: "Use a realistic age between 1 and 120."
      },
      {
        key: "gender",
        label: "Gender",
        complete: aiFormData.gender.trim().length > 0,
        message: "Gender helps tailor generated personas."
      },
      {
        key: "condition",
        label: "Primary Medical Condition",
        complete: aiFormData.condition.trim().length > 0,
        message: "Condition improves medical relevance."
      },
      {
        key: "region",
        label: "Country",
        complete: aiFormData.region.trim().length > 0,
        message: "Region informs cultural context."
      },
    ]
  }, [aiFormData])

  const renderCompletenessMeter = (fieldStatuses: FieldStatus[], title: string) => {
    const completeCount = fieldStatuses.filter((f) => f.complete).length
    const percent = Math.round((completeCount / Math.max(fieldStatuses.length, 1)) * 100)
    const missing = fieldStatuses.filter((f) => !f.complete)

    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50/70 p-4 dark:border-gray-800 dark:bg-gray-900/40">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{title}</p>
            <p className="text-xs text-muted-foreground">Track how complete this persona setup is.</p>
          </div>
          <Badge variant="secondary" className="text-xs">
            {percent}% complete
          </Badge>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
          <div
            className="h-2 rounded-full bg-gradient-to-r from-primary to-secondary transition-all"
            style={{ width: `${percent}%` }}
          ></div>
        </div>
        {missing.length > 0 && (
          <div className="mt-3 text-xs text-amber-700 dark:text-amber-300">
            <p className="font-semibold">Suggested additions:</p>
            <div className="flex flex-wrap gap-2 mt-1">
              {missing.map((item) => (
                <Badge
                  key={item.key}
                  variant="outline"
                  className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/50"
                >
                  {item.label}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  const handleNavigateToSimulator = (personaIds: number[]) => {
    if (personaIds.length === 0) return
    navigate('/simulation', { state: { preselectedPersonaIds: personaIds } })
  }

  const renderLabelWithStatus = (id: string, label: string, fieldStatuses: FieldStatus[], key: string) => {
    const status = fieldStatuses.find((f) => f.key === key)

    if (!status) return <Label htmlFor={id}>{label}</Label>

    return (
      <div className="flex items-center gap-2">
        <Label htmlFor={id}>{label}</Label>
        {!status.complete && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="outline"
                  className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/50"
                >
                  Incomplete
                </Badge>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs text-sm">
                {status.message || "Adding this field will make the persona richer."}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    )
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [brandsData, segmentsData, diseasesData] = await Promise.all([
          BrandsAPI.list(),
          SegmentsAPI.list(),
          DiseasePacksAPI.list()
        ])
        setBrands(brandsData)
        setSegments(segmentsData)
        setDiseasePacks(diseasesData)
      } catch (err) {
        console.error("Failed to load initial data", err)
      }
    }
    fetchData()
  }, [])

  const handleManualInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target

    // Check if it's a communication preference field
    if (name.includes('.')) {
      const [, commField] = name.split('.')
      setManualFormData({
        ...manualFormData,
        communication_preferences: {
          ...manualFormData.communication_preferences,
          [commField]: value
        }
      })
    } else {
      setManualFormData({
        ...manualFormData,
        [name]: value
      })
    }
  }

  const handleAiInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setAiFormData({
      ...aiFormData,
      [e.target.name]: e.target.value,
    })
  }

  const handleManualSelectChange = (name: string, value: string) => {
    setManualFormData({
      ...manualFormData,
      [name]: value
    })
  }

  const handleAiSelectChange = (name: string, value: string) => {
    setAiFormData(prev => {
      const updates: any = { [name]: value }

      // Auto-fill logic for Disease Packs
      if (name === 'disease') {
        const pack = diseasePacks.find(d => d.name === value)
        if (pack) {
          updates.condition = pack.condition
        }
      }
      return { ...prev, ...updates }
    })
  }

  const handleArrayInputChange = (field: 'pain_points' | 'motivations' | 'beliefs', index: number, value: string) => {
    setManualFormData(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => i === index ? value : item)
    }))
  }

  const handleCommunicationChange = (field: string, value: string) => {
    setManualFormData(prev => ({
      ...prev,
      communication_preferences: {
        ...prev.communication_preferences,
        [field]: value
      }
    }))
  }

  const mergeValuesWithSlots = (existing: string[], additions: string[]) => {
    const cleanExisting = existing.filter(value => value.trim() !== "")
    const cleanAdditions = additions.filter(value => value && value.trim() !== "")
    const combined = [...cleanAdditions, ...cleanExisting].filter(
      (value, index, self) => value && self.indexOf(value) === index
    )
    return Array.from({ length: existing.length }, (_, idx) => combined[idx] ?? "")
  }

  const applyInsightsToManualForm = () => {
    if (!manualSelectedInsights.length) {
      alert("Select brand insights to apply.")
      return
    }
    const motivations = manualSelectedInsights.filter(i => i.type === "Motivation").map(i => i.text)
    const beliefs = manualSelectedInsights.filter(i => i.type === "Belief").map(i => i.text)
    const tensions = manualSelectedInsights.filter(i => i.type === "Tension").map(i => i.text)

    setManualFormData(prev => ({
      ...prev,
      motivations: mergeValuesWithSlots(prev.motivations, motivations),
      beliefs: mergeValuesWithSlots(prev.beliefs, beliefs),
      pain_points: mergeValuesWithSlots(prev.pain_points, tensions),
    }))
  }

  const applySuggestionsToManualForm = () => {
    if (!manualSuggestions) {
      alert("Generate brand suggestions first.")
      return
    }
    setManualFormData(prev => ({
      ...prev,
      motivations: mergeValuesWithSlots(prev.motivations, manualSuggestions.motivations || []),
      beliefs: mergeValuesWithSlots(prev.beliefs, manualSuggestions.beliefs || []),
      pain_points: mergeValuesWithSlots(prev.pain_points, manualSuggestions.tensions || []),
    }))
  }

  const handleTranscriptFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    setTranscriptFile(file || null)
  }

  const handleTranscriptAnalysis = async () => {
    if (!transcriptFile && !transcriptText.trim()) {
      setError("Provide transcript text or upload a transcript file.")
      return
    }

    setTranscriptLoading(true)
    setError(null)
    try {
      const formData = new FormData()
      if (transcriptFile) {
        formData.append('file', transcriptFile)
      }
      if (transcriptText.trim()) {
        formData.append('transcript_text', transcriptText.trim())
      }

      const suggestions = await PersonasAPI.extractFromTranscript(formData)
      setTranscriptSuggestions(suggestions)
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err?.message || "Failed to analyze transcript."
      setError(detail)
    } finally {
      setTranscriptLoading(false)
    }
  }

  const applyTranscriptSuggestionsToManualForm = () => {
    const legacy = transcriptSuggestions?.legacy
    if (!legacy) {
      alert("Run transcript analysis to load AI suggestions.")
      return
    }

    setManualFormData(prev => ({
      ...prev,
      motivations: mergeValuesWithSlots(prev.motivations, legacy.motivations || []),
      beliefs: mergeValuesWithSlots(prev.beliefs, legacy.beliefs || []),
      pain_points: mergeValuesWithSlots(prev.pain_points, legacy.tensions || []),
    }))
  }

  const acceptTranscriptDemographic = (field: "age" | "gender" | "region") => {
    const demographics = transcriptSuggestions?.demographics || {}
    const valueMap: Record<string, string> = {
      age: demographics?.age?.value ?? "",
      gender: demographics?.gender?.value ?? "",
      region: demographics?.location?.value ?? "",
    }

    const value = valueMap[field]
    if (!value) return

    setManualFormData(prev => ({
      ...prev,
      age: field === "age" ? String(value) : prev.age,
      gender: field === "gender" ? value : prev.gender,
      region: field === "region" ? value : prev.region,
    }))
  }

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const age = parseInt(manualFormData.age)
    const ageValid = !isNaN(age) && age >= 1 && age <= 120
    const safeAge = ageValid ? age : undefined

    // Build persona data for similarity check and creation
    const personaData = {
      name: manualFormData.name,
      age: safeAge,
      gender: manualFormData.gender,
      condition: manualFormData.condition,
      region: manualFormData.region,
      brand_id: manualBrandId || undefined,
      demographics: {
        age: safeAge,
        gender: manualFormData.gender,
        location: manualFormData.region,
        occupation: manualFormData.occupation
      },
      medical_background: manualFormData.medical_background,
      lifestyle_and_values: manualFormData.lifestyle_and_values,
      motivations: manualFormData.motivations.filter(m => m.trim() !== ''),
      beliefs: manualFormData.beliefs.filter(b => b.trim() !== ''),
      pain_points: manualFormData.pain_points.filter(p => p.trim() !== ''),
      communication_preferences: manualFormData.communication_preferences
    }

    // Function to actually create the persona
    const createPersona = async () => {
      setGenerating(true)
      try {
        const newPersona = await PersonasAPI.createManual(personaData)
        console.log("Created manual persona:", newPersona.id, "with brand_id:", manualBrandId)

        // Reset form
        setManualFormData({
          name: "",
          age: "",
          gender: "",
          condition: "",
          region: "",
          occupation: "",
          medical_background: "",
          lifestyle_and_values: "",
          pain_points: ["", "", "", ""],
          motivations: ["", "", "", ""],
          beliefs: ["", "", "", ""],
          communication_preferences: {
            preferred_channels: "",
            information_style: "",
            frequency: ""
          }
        })

        setRecentlyCreated({ ids: [newPersona.id], names: [newPersona.name || manualFormData.name] })
      } catch (error: any) {
        console.error("Error creating manual persona:", error)
        const errorMessage = error.response?.data?.detail || "An unexpected error occurred. Please check the console and ensure the backend is running."
        setError(errorMessage)
        alert(`Creation Failed: ${errorMessage}`)
      } finally {
        setGenerating(false)
      }
    }

    // Check for similar personas before creating
    setGenerating(true)
    try {
      const similarityResult = await PersonasAPI.checkSimilarity({
        persona_attrs: personaData,
        brand_id: manualBrandId || undefined,
        threshold: 0.7
      })

      if (similarityResult.has_similar && similarityResult.most_similar) {
        // Show similarity modal instead of creating directly
        setSimilarityModal({
          open: true,
          similarityScore: similarityResult.similarity_score,
          mostSimilar: similarityResult.most_similar,
          overlappingTraits: similarityResult.overlapping_traits,
          recommendation: similarityResult.recommendation,
          pendingSubmit: createPersona,
        })
        setGenerating(false)
      } else {
        // No similar personas found, proceed with creation
        await createPersona()
      }
    } catch (error: any) {
      console.error("Similarity check failed, proceeding with creation:", error)
      // If similarity check fails, still allow creation
      await createPersona()
    }
  }

  const handleAiSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const age = parseInt(aiFormData.age)
    const ageValid = !isNaN(age) && age >= 1 && age <= 120
    const safeAge = ageValid ? age : undefined

    setGenerating(true)
    try {
      const count = parseInt(aiFormData.count) || 1
      setGenerationProgress({ current: 0, total: count })

      // Include brand_id in base data - backend now handles automatic MBT grounding
      const basePersonaData = {
        age: safeAge,
        gender: aiFormData.gender,
        condition: aiFormData.condition,
        location: aiFormData.region,
        concerns: aiFormData.concerns,
        brand_id: aiBrandId || undefined,
        segment: aiFormData.segment || undefined,
        disease: aiFormData.disease || undefined
      }

      const createdPersonas = []

      for (let i = 0; i < count; i++) {
        setGenerationProgress({ current: i + 1, total: count })

        const variations = [
          '', ' with family history', ' seeking treatment options',
          ' concerned about side effects', ' looking for lifestyle changes',
          ' with financial concerns', ' preferring natural remedies',
          ' with mobility limitations', ' living in rural area', ' with strong family support'
        ]
        const variation = variations[i % variations.length]

        const personaData = {
          ...basePersonaData,
          concerns: aiFormData.concerns + variation
        }

        const newPersona = await PersonasAPI.generate(personaData)
        createdPersonas.push(newPersona)
        console.log(`Created persona ${i + 1}/${count}:`, newPersona.id, "with brand_id:", aiBrandId)
      }

      setAiFormData({
        age: '',
        gender: '',
        condition: '',
        region: '',
        concerns: '',
        count: '1',
        segment: '',
        disease: ''
      })
      setGenerationProgress({ current: 0, total: 0 })
      setRecentlyCreated({
        ids: createdPersonas.map((persona) => persona.id),
        names: createdPersonas.map((persona) => persona.name)
      })

    } catch (error: any) {
      console.error("Error generating persona:", error)
      const errorMessage = error.response?.data?.detail || "An unexpected error occurred. Please check the console and ensure the backend is running."
      setError(errorMessage)
      alert(`Generation Failed: ${errorMessage}`)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-violet-50 dark:from-gray-950 dark:via-gray-900 dark:to-violet-950">
      {/* Similarity Warning Modal */}
      {similarityModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <Card className="w-full max-w-lg mx-4 shadow-2xl">
            <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-b">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-full">
                  <Users className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <CardTitle className="text-lg text-amber-800 dark:text-amber-200">
                    Similar Persona Found
                  </CardTitle>
                  <CardDescription className="text-amber-600 dark:text-amber-400">
                    This persona is {Math.round(similarityModal.similarityScore * 100)}% similar to an existing one
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {similarityModal.mostSimilar && (
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Most similar to:</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {similarityModal.mostSimilar.name}
                  </p>
                  <Button
                    variant="link"
                    size="sm"
                    className="p-0 h-auto text-primary"
                    onClick={() => navigate(`/personas/${similarityModal.mostSimilar?.id}`)}
                  >
                    View this persona →
                  </Button>
                </div>
              )}

              {similarityModal.overlappingTraits.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Overlapping characteristics:</p>
                  <div className="flex flex-wrap gap-2">
                    {similarityModal.overlappingTraits.slice(0, 5).map((trait, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {trait}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  {similarityModal.recommendation === 'use_existing'
                    ? "Consider using the existing persona instead of creating a duplicate."
                    : "You can proceed, but the personas may have significant overlap."}
                </p>
              </div>
            </CardContent>
            <div className="flex justify-end gap-3 p-4 border-t bg-gray-50 dark:bg-gray-900/50">
              <Button
                variant="outline"
                onClick={() => setSimilarityModal(prev => ({ ...prev, open: false, pendingSubmit: null }))}
              >
                Cancel
              </Button>
              <Button
                variant="default"
                onClick={async () => {
                  setSimilarityModal(prev => ({ ...prev, open: false }))
                  if (similarityModal.pendingSubmit) {
                    await similarityModal.pendingSubmit()
                  }
                }}
              >
                Create Anyway
              </Button>
            </div>
          </Card>
        </div>
      )}
      {/* Indegene Purple Header Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[hsl(262,60%,38%)] via-[hsl(262,60%,42%)] to-[hsl(280,60%,45%)]">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 right-20 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse animation-delay-2000"></div>
        </div>

        <div className="relative z-10 px-8 py-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-5">
                <div className="relative">
                  <div className="relative p-4 bg-white/20 backdrop-blur-sm rounded-2xl border border-white/20">
                    <UserPlus className="h-10 w-10 text-white" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h1 className="text-4xl font-bold text-white">Create Persona</h1>
                    <Badge className="bg-white/20 backdrop-blur-sm text-white border-white/30 px-3 py-1">
                      <Sparkles className="h-3 w-3 mr-1" />
                      AI-Powered
                    </Badge>
                  </div>
                  <p className="text-white/80 text-base">
                    Generate realistic patient and HCP personas with advanced AI
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => navigate('/personas')}
                  className="bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20"
                >
                  <ArrowLeft className="h-5 w-5 mr-2" />
                  Back to Library
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => navigate('/dashboard')}
                  className="bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20"
                >
                  <Settings className="h-5 w-5 mr-2" />
                  Dashboard
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-8 py-12">
        <div className="space-y-8">
          {recentlyCreated.ids.length > 0 && (
            <Card className="border-0 shadow-2xl bg-gradient-to-r from-emerald-50 via-white to-violet-50 dark:from-emerald-950/30 dark:via-gray-900 dark:to-violet-900/30">
              <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between py-6">
                <div className="flex items-start gap-3">
                  <div className="mt-1 rounded-full bg-emerald-500/10 p-3 text-emerald-600 dark:text-emerald-300">
                    <CheckCircle className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm uppercase tracking-wide text-emerald-600 dark:text-emerald-300 font-semibold">
                      Persona Ready
                    </p>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                      {recentlyCreated.names.length === 1
                        ? `${recentlyCreated.names[0]} is ready for testing`
                        : `${recentlyCreated.names.length} personas ready for cohort simulation`}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Jump straight into the simulator to see how this persona responds to your content.
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    onClick={() => handleNavigateToSimulator(recentlyCreated.ids)}
                    className="bg-gradient-to-r from-primary to-secondary text-white shadow-lg"
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    {recentlyCreated.ids.length > 1 ? "Test this cohort" : "Test this persona"}
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/personas')}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    View in Persona Library
                  </Button>
                  <Button variant="ghost" onClick={() => setRecentlyCreated({ ids: [], names: [] })}>
                    Create another
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Creation Mode Selection */}
          <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Choose Creation Method</CardTitle>
              <CardDescription>Choose how you want to create personas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant={creationMode === "manual" ? "default" : "outline"}
                  onClick={() => setCreationMode("manual")}
                  className="h-20 flex flex-col items-center gap-2"
                >
                  <User className="h-6 w-6" />
                  <span>Manual Persona</span>
                </Button>
                <Button
                  variant={creationMode === "ai" ? "default" : "outline"}
                  onClick={() => setCreationMode("ai")}
                  className="h-20 flex flex-col items-center gap-2"
                >
                  <Brain className="h-6 w-6" />
                  <span>AI Generated</span>
                </Button>
              </div>
              <div className="mt-4">
                <VeevaCRMImporter
                  onImportComplete={() => {
                    alert("CRM Import Complete! Redirecting to Persona Library...");
                    setTimeout(() => {
                      navigate('/personas');
                    }, 2000);
                  }}
                  trigger={
                    <Button
                      variant="outline"
                      className="h-20 flex flex-col items-center gap-2 w-full border-2 border-dashed border-blue-300 hover:border-blue-500 hover:bg-blue-50"
                    >
                      <Database className="h-6 w-6 text-blue-600" />
                      <span className="text-blue-600">Import from CRM</span>
                    </Button>
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Manual Persona Creation */}
          {creationMode === "manual" && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-6">
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-gray-900">Manual Persona Creation</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Create a detailed persona manually by filling in all attributes
                    </p>
                  </div>

                  <div className="rounded-lg border border-dashed border-blue-200 bg-blue-50/60 p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Import from transcript</p>
                        <p className="text-xs text-muted-foreground">Upload an interview transcript or paste notes to auto-suggest persona fields.</p>
                      </div>
                      <Badge variant="outline" className="border-blue-200 bg-white text-blue-700">
                        AI
                      </Badge>
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor="transcript-file">Transcript file</Label>
                          <Input
                            id="transcript-file"
                            type="file"
                            accept=".txt,.md,.doc,.docx,.pdf"
                            onChange={handleTranscriptFileChange}
                            disabled={transcriptLoading || generating}
                          />
                        </div>
                        <div>
                          <Label htmlFor="transcript-text">Or paste transcript text</Label>
                          <Textarea
                            id="transcript-text"
                            value={transcriptText}
                            onChange={(e) => setTranscriptText(e.target.value)}
                            placeholder="Paste interview transcript or notes to extract motivations, beliefs, tensions..."
                            disabled={transcriptLoading || generating}
                            className="mt-1"
                            rows={6}
                          />
                        </div>
                        <Button
                          type="button"
                          onClick={handleTranscriptAnalysis}
                          disabled={transcriptLoading || generating}
                          className="gap-2"
                        >
                          {transcriptLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                          Analyze transcript
                        </Button>
                      </div>

                      <div className="space-y-3 rounded-lg border bg-white p-3 shadow-inner">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold">AI suggestions</p>
                            <p className="text-xs text-muted-foreground">Mapped to the enriched persona schema.</p>
                          </div>
                          <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">
                            AI
                          </Badge>
                        </div>

                        {transcriptSuggestions ? (
                          <div className="space-y-3">
                            <p className="text-sm text-muted-foreground">
                              {transcriptSuggestions.summary || "We pulled a short summary of the transcript to ground the suggestions."}
                            </p>

                            <div className="grid gap-3 sm:grid-cols-3">
                              {[{ key: 'motivations', label: 'Motivations' }, { key: 'beliefs', label: 'Beliefs' }, { key: 'tensions', label: 'Tensions' }].map(({ key, label }) => (
                                <div key={key} className="rounded-md border p-3">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">AI</Badge>
                                    <p className="text-xs font-semibold text-gray-900">{label}</p>
                                  </div>
                                  <ul className="mt-2 space-y-1 text-xs text-gray-700">
                                    {(transcriptSuggestions.legacy?.[key as keyof TranscriptSuggestions['legacy']] || []).length ? (
                                      (transcriptSuggestions.legacy?.[key as keyof TranscriptSuggestions['legacy']] || []).map((item: string, idx: number) => (
                                        <li key={idx} className="flex gap-2">
                                          <span className="text-blue-500">•</span>
                                          <span>{item}</span>
                                        </li>
                                      ))
                                    ) : (
                                      <li className="text-muted-foreground">No signals yet.</li>
                                    )}
                                  </ul>
                                </div>
                              ))}
                            </div>

                            <div className="grid gap-3 sm:grid-cols-3">
                              {[{ key: 'age', label: 'Age', field: 'age' }, { key: 'gender', label: 'Gender', field: 'gender' }, { key: 'location', label: 'Region', field: 'region' }].map(({ key, label, field }) => {
                                const entry = transcriptSuggestions.demographics?.[key] || {}
                                const confidenceText = entry.confidence ? `Confidence ${(entry.confidence * 100).toFixed(0)}%` : null
                                return (
                                  <div key={key} className="rounded-md border p-3 bg-slate-50">
                                    <p className="text-xs uppercase text-muted-foreground">{label}</p>
                                    <p className="mt-1 text-sm font-semibold">{entry.value || 'No signal yet'}</p>
                                    {confidenceText && <p className="text-[11px] text-muted-foreground">{confidenceText}</p>}
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="ghost"
                                      className="mt-2 h-8 px-2"
                                      onClick={() => acceptTranscriptDemographic(field as 'age' | 'gender' | 'region')}
                                      disabled={!entry.value}
                                    >
                                      Use suggestion
                                    </Button>
                                  </div>
                                )
                              })}
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <Button type="button" size="sm" variant="outline" onClick={applyTranscriptSuggestionsToManualForm}>
                                Apply AI suggestions to form
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex h-full items-center justify-center rounded-md border border-dashed border-gray-200 p-4 text-xs text-muted-foreground">
                            AI will suggest motivations, beliefs, tensions, and demographics once you analyze a transcript.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <BrandInsightSelector
                    selectionLimit={8}
                    disabled={generating}
                    onSelectionChange={setManualSelectedInsights}
                    onSuggestions={setManualSuggestions}
                    onBrandChange={(id) => setManualBrandId(id)}
                  />

                  <div className="flex flex-wrap items-center justify-end gap-3">
                    <Button
                      variant="outline"
                      type="button"
                      onClick={applySuggestionsToManualForm}
                      disabled={!manualSuggestions}
                    >
                      Apply AI Suggestions
                    </Button>
                    <Button
                      type="button"
                      onClick={applyInsightsToManualForm}
                      disabled={!manualSelectedInsights.length}
                    >
                      Insert Selected Insights
                    </Button>
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-4">
                      <div className="flex">
                        <div className="ml-3">
                          <p className="text-sm text-red-800">{error}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {renderCompletenessMeter(manualFieldStatuses, "Manual persona completeness")}

                  <form onSubmit={handleManualSubmit} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        {renderLabelWithStatus("name", "Name", manualFieldStatuses, "name")}
                        <Input
                          id="name"
                          name="name"
                          value={manualFormData.name}
                          onChange={handleManualInputChange}
                          className="mt-1"
                          placeholder="Enter persona name"
                        />
                      </div>

                      <div>
                        {renderLabelWithStatus("age", "Age", manualFieldStatuses, "age")}
                        <Input
                          id="age"
                          name="age"
                          type="number"
                          min="1"
                          max="120"
                          value={manualFormData.age}
                          onChange={handleManualInputChange}
                          className="mt-1"
                          placeholder="Enter age"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        {renderLabelWithStatus("gender", "Gender", manualFieldStatuses, "gender")}
                        <Select name="gender" value={manualFormData.gender} onValueChange={(value) => handleManualSelectChange('gender', value)}>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Male">Male</SelectItem>
                            <SelectItem value="Female">Female</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        {renderLabelWithStatus("condition", "Medical Condition", manualFieldStatuses, "condition")}
                        <Input
                          id="condition"
                          name="condition"
                          value={manualFormData.condition}
                          onChange={handleManualInputChange}
                          className="mt-1"
                          placeholder="Enter medical condition"
                        />
                      </div>

                      <div>
                        {renderLabelWithStatus("region", "Country", manualFieldStatuses, "region")}
                        <Input
                          id="region"
                          name="region"
                          value={manualFormData.region}
                          onChange={handleManualInputChange}
                          className="mt-1"
                          placeholder="e.g., United States, UK"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="occupation">Occupation</Label>
                      <Input
                        id="occupation"
                        name="occupation"
                        value={manualFormData.occupation}
                        onChange={handleManualInputChange}
                        className="mt-1"
                        placeholder="Enter occupation"
                      />
                    </div>

                    <div>
                      <Label htmlFor="medical_background">Medical Background</Label>
                      <Textarea
                        id="medical_background"
                        name="medical_background"
                        value={manualFormData.medical_background}
                        onChange={handleManualInputChange}
                        className="mt-1"
                        rows={3}
                        placeholder="Describe medical history, diagnoses, treatments..."
                      />
                    </div>

                    <div>
                      <Label htmlFor="lifestyle_and_values">Lifestyle and Values</Label>
                      <Textarea
                        id="lifestyle_and_values"
                        name="lifestyle_and_values"
                        value={manualFormData.lifestyle_and_values}
                        onChange={handleManualInputChange}
                        className="mt-1"
                        rows={3}
                        placeholder="Describe lifestyle, values, beliefs..."
                      />
                    </div>

                    <div>
                      <Label>Pain Points</Label>
                      <p className="text-sm text-gray-500 mt-1 mb-2">
                        What obstacles or challenges stand in their way?
                      </p>
                      <div className="space-y-2 mt-1">
                        {manualFormData.pain_points.map((point, index) => (
                          <Input
                            key={index}
                            value={point}
                            onChange={(e) => handleArrayInputChange('pain_points', index, e.target.value)}
                            placeholder={`Pain point ${index + 1}`}
                          />
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label>Motivations</Label>
                      <p className="text-sm text-gray-500 mt-1 mb-2">
                        What goals do they want to achieve?
                      </p>
                      <div className="space-y-2 mt-1">
                        {manualFormData.motivations.map((motivation, index) => (
                          <Input
                            key={index}
                            value={motivation}
                            onChange={(e) => handleArrayInputChange('motivations', index, e.target.value)}
                            placeholder={`Motivation ${index + 1}`}
                          />
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label>Beliefs</Label>
                      <p className="text-sm text-gray-500 mt-1 mb-2">
                        What core convictions drive their behavior and decisions?
                      </p>
                      <div className="space-y-2 mt-1">
                        {manualFormData.beliefs.map((belief, index) => (
                          <Input
                            key={index}
                            value={belief}
                            onChange={(e) => handleArrayInputChange('beliefs', index, e.target.value)}
                            placeholder={`Belief ${index + 1}`}
                          />
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label>Communication Preferences</Label>
                      <div className="grid grid-cols-3 gap-4 mt-1">
                        <div>
                          <Label htmlFor="preferred_channels" className="text-sm">Preferred Channels</Label>
                          <Input
                            id="preferred_channels"
                            value={manualFormData.communication_preferences.preferred_channels}
                            onChange={(e) => handleCommunicationChange('preferred_channels', e.target.value)}
                            placeholder="Email, phone, in-person..."
                          />
                        </div>
                        <div>
                          <Label htmlFor="information_style" className="text-sm">Information Style</Label>
                          <Input
                            id="information_style"
                            value={manualFormData.communication_preferences.information_style}
                            onChange={(e) => handleCommunicationChange('information_style', e.target.value)}
                            placeholder="Detailed, brief, visual..."
                          />
                        </div>
                        <div>
                          <Label htmlFor="frequency" className="text-sm">Frequency</Label>
                          <Input
                            id="frequency"
                            value={manualFormData.communication_preferences.frequency}
                            onChange={(e) => handleCommunicationChange('frequency', e.target.value)}
                            placeholder="Weekly, monthly, as needed..."
                          />
                        </div>
                      </div>
                    </div>

                    <Button type="submit" disabled={generating} className="w-full">
                      {generating ? "Creating..." : "Create Manual Persona"}
                    </Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          )}

          {/* AI Persona Creation */}
          {creationMode === "ai" && (
            <Card className="border-0 shadow-2xl backdrop-blur-sm bg-white/90 dark:bg-gray-900/90">
              <CardHeader className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-t-xl">
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary to-secondary rounded-xl blur-lg opacity-50"></div>
                    <div className="relative p-3 bg-gradient-to-br from-primary to-secondary rounded-xl">
                      <Brain className="h-7 w-7 text-white" />
                    </div>
                  </div>
                  <div>
                    <CardTitle className="text-2xl">Create AI-Powered Personas</CardTitle>
                    <CardDescription className="text-base">
                      Enter basic attributes and let AI generate comprehensive, realistic personas with variations
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-8">
                {renderCompletenessMeter(aiFieldStatuses, "AI persona completeness")}

                <form onSubmit={handleAiSubmit} className="space-y-6">
                  {/* Layer Selection Section */}
                  <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-6 dark:border-indigo-900/50 dark:bg-indigo-950/20">
                    <h3 className="mb-4 text-base font-semibold text-indigo-900 dark:text-indigo-100 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-indigo-500" />
                      Persona Foundation Layers (Optional)
                    </h3>
                    <div className="grid gap-6 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="ai-segment" className="text-sm font-medium">Segment Base</Label>
                        <Select name="segment" value={aiFormData.segment} onValueChange={(value) => handleAiSelectChange('segment', value)}>
                          <SelectTrigger className="bg-white dark:bg-gray-900 border-indigo-200 dark:border-indigo-800">
                            <SelectValue placeholder="Select a segment..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None (Standard Generation)</SelectItem>
                            {segments.map((seg) => (
                              <SelectItem key={seg.name} value={seg.name}>
                                {seg.name} ({seg.persona_type})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {aiFormData.segment && (
                          <p className="text-xs text-indigo-700 dark:text-indigo-300">
                            {segments.find(s => s.name === aiFormData.segment)?.description}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="ai-disease" className="text-sm font-medium">Disease Context Pack</Label>
                        <Select name="disease" value={aiFormData.disease} onValueChange={(value) => handleAiSelectChange('disease', value)}>
                          <SelectTrigger className="bg-white dark:bg-gray-900 border-indigo-200 dark:border-indigo-800">
                            <SelectValue placeholder="Select disease context..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {diseasePacks.map((pack) => (
                              <SelectItem key={pack.name} value={pack.name}>
                                {pack.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {aiFormData.disease && (
                          <p className="text-xs text-indigo-700 dark:text-indigo-300">
                            Auto-fills condition: {diseasePacks.find(d => d.name === aiFormData.disease)?.condition}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <Separator className="my-6" />
                  <div className="grid gap-6 md:grid-cols-3">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        {renderLabelWithStatus("ai-age", "Age", aiFieldStatuses, "age")}
                      </div>
                      <Input
                        id="ai-age"
                        name="age"
                        type="number"
                        placeholder="e.g., 45"
                        value={aiFormData.age}
                        onChange={handleAiInputChange}
                        className="border-gray-300 focus:border-primary focus:ring-primary"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                        <User className="h-4 w-4 text-gray-500" />
                        {renderLabelWithStatus("ai-gender", "Gender", aiFieldStatuses, "gender")}
                      </div>
                      <Select name="gender" value={aiFormData.gender} onValueChange={(value) => handleAiSelectChange('gender', value)}>
                        <SelectTrigger className="border-gray-300 focus:border-primary focus:ring-primary">
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                        <Heart className="h-4 w-4 text-gray-500" />
                        {renderLabelWithStatus("ai-condition", "Primary Medical Condition", aiFieldStatuses, "condition")}
                      </div>
                      <Input
                        id="ai-condition"
                        name="condition"
                        placeholder="e.g., Type 2 Diabetes"
                        value={aiFormData.condition}
                        onChange={handleAiInputChange}
                        className="border-gray-300 focus:border-primary focus:ring-primary"
                      />
                    </div>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                        <MapPin className="h-4 w-4 text-gray-500" />
                        {renderLabelWithStatus("ai-region", "Country", aiFieldStatuses, "region")}
                      </div>
                      <Input
                        id="ai-region"
                        name="region"
                        placeholder="e.g., USA, Germany, Japan"
                        value={aiFormData.region}
                        onChange={handleAiInputChange}
                        className="border-gray-300 focus:border-primary focus:ring-primary"
                      />

                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ai-count" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <Users className="h-4 w-4 text-gray-500" />
                        Number of Personas
                      </Label>
                      <Select name="count" value={aiFormData.count} onValueChange={(value) => handleAiSelectChange('count', value)}>
                        <SelectTrigger className="border-gray-300 focus:border-primary focus:ring-primary">
                          <SelectValue placeholder="Select count" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 Persona</SelectItem>
                          <SelectItem value="2">2 Personas</SelectItem>
                          <SelectItem value="3">3 Personas</SelectItem>
                          <SelectItem value="5">5 Personas</SelectItem>
                          <SelectItem value="10">10 Personas</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ai-concerns" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      <Target className="h-4 w-4 text-gray-500" />
                      Additional Context
                    </Label>
                    <Textarea
                      id="ai-concerns"
                      name="concerns"
                      placeholder="e.g., Managing blood sugar levels, medication side effects, cost of treatment, lifestyle adjustments..."
                      value={aiFormData.concerns}
                      onChange={handleAiInputChange}
                      className="border-gray-300 focus:border-primary focus:ring-primary min-h-[120px]"
                    />
                  </div>

                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-gray-900 dark:text-gray-100">Brand grounding (optional)</p>
                      <span className="text-xs text-muted-foreground">Auto-enrich after generation</span>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <Select
                        value={aiBrandId ? String(aiBrandId) : "none"}
                        onValueChange={(value) => setAiBrandId(value && value !== "none" ? Number(value) : null)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select brand (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No brand</SelectItem>
                          {brands && brands.length > 0 ? (
                            brands.map((brand) => (
                              <SelectItem key={brand.id} value={String(brand.id)}>
                                {brand.name}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="no-brands-available" disabled>
                              No brands available
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <Input
                        value={aiTargetSegment}
                        onChange={(e) => setAiTargetSegment(e.target.value)}
                        placeholder="Target segment (e.g., Early adopters)"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      If a brand is selected, each generated persona is enriched using that brand's MBT insights.
                    </p>
                  </div>

                  {error && (
                    <div className="p-4 bg-red-100 dark:bg-red-900/30 border border-red-400 text-red-700 dark:text-red-300 rounded-lg">
                      <p className="font-bold">Generation Error</p>
                      <p className="text-sm">{error}</p>
                    </div>
                  )}

                  <Separator />

                  <div className="bg-gradient-to-r from-primary/5 to-secondary/5 rounded-xl p-4">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-amber-500" />
                      AI will generate:
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-emerald-500" />
                        Full demographic profile
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-emerald-500" />
                        Medical history
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-emerald-500" />
                        Treatment preferences
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-emerald-500" />
                        Communication style
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-emerald-500" />
                        Decision-making factors
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-emerald-500" />
                        Lifestyle & behaviors
                      </div>
                    </div>
                  </div>

                  {generationProgress.total > 0 && (
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(generationProgress.current / generationProgress.total) * 100}%` }}
                      ></div>
                      <p className="text-sm text-gray-600 mt-2">
                        Generating persona {generationProgress.current} of {generationProgress.total}...
                      </p>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-primary to-secondary text-white hover:shadow-xl transition-all duration-200 py-6 text-lg font-semibold"
                    disabled={generating}
                  >
                    {generating ? (
                      <>
                        <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                        Generating Persona {generationProgress.current} of {generationProgress.total}...
                      </>
                    ) : (
                      <>
                        <Brain className="mr-3 h-5 w-5" />
                        Generate {aiFormData.count} AI Persona{parseInt(aiFormData.count) !== 1 ? 's' : ''}
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

        </div>
      </div>
    </div>
  )
}