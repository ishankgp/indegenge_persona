"use client"

import React, { useState, useEffect, useMemo, useCallback } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { PersonasAPI, BrandsAPI, type TranscriptSuggestions, type FieldStatus, type EnrichedField } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Upload,
  FileText,
  Loader2,
  Sparkles,
  CheckCircle,
  AlertCircle,
  User,
  Brain,
  Target,
  MessageSquare,
  Shield,
  Radio,
  Plus,
  X,
  Search,
  ArrowRight,
  ArrowLeft,
  Save,
  PlayCircle,
  Lightbulb,
  Quote,
  Stethoscope,
  Heart,
} from "lucide-react"

// ============================================================================
// Types
// ============================================================================

interface BrandOption {
  id: number
  name: string
}

interface FormSection {
  id: string
  label: string
  icon: React.ElementType
  fields: string[]
}

interface ListItem {
  value: string
  evidence?: string[]
  status: FieldStatus
  confidence?: number
}

interface PersonaFormData {
  // Basic info
  name: string
  persona_type: "Patient" | "HCP"
  age: string
  gender: string
  condition: string
  location: string
  
  // Patient fields
  medical_background: string
  lifestyle_and_values: string
  
  // HCP fields
  specialty: string
  practice_setup: string
  decision_influencers: string
  
  // MBT
  motivations: ListItem[]
  beliefs: ListItem[]
  tensions: ListItem[]
  
  // Additional enriched fields
  decision_drivers: ListItem[]
  messaging_hooks: ListItem[]
  objections: ListItem[]
  channel_preferences: ListItem[]
}

const FORM_SECTIONS: FormSection[] = [
  { id: "demographics", label: "Demographics", icon: User, fields: ["name", "age", "gender", "condition", "location"] },
  { id: "background", label: "Background", icon: FileText, fields: ["medical_background", "lifestyle_and_values"] },
  { id: "motivations", label: "Motivations", icon: Target, fields: ["motivations"] },
  { id: "beliefs", label: "Beliefs", icon: Brain, fields: ["beliefs"] },
  { id: "tensions", label: "Tensions", icon: Shield, fields: ["tensions"] },
  { id: "decision_drivers", label: "Decision Drivers", icon: Lightbulb, fields: ["decision_drivers"] },
  { id: "messaging", label: "Messaging Hooks", icon: MessageSquare, fields: ["messaging_hooks"] },
  { id: "objections", label: "Objections", icon: AlertCircle, fields: ["objections"] },
  { id: "channel", label: "Channel Behavior", icon: Radio, fields: ["channel_preferences"] },
]

const HCP_SECTIONS: FormSection[] = [
  { id: "hcp_context", label: "HCP Context", icon: Stethoscope, fields: ["specialty", "practice_setup", "decision_influencers"] },
]

const EMPTY_LIST_ITEM: ListItem = { value: "", status: "empty", evidence: [], confidence: 0 }

const initialFormData: PersonaFormData = {
  name: "",
  persona_type: "Patient",
  age: "",
  gender: "",
  condition: "",
  location: "",
  medical_background: "",
  lifestyle_and_values: "",
  specialty: "",
  practice_setup: "",
  decision_influencers: "",
  motivations: [{ ...EMPTY_LIST_ITEM }, { ...EMPTY_LIST_ITEM }, { ...EMPTY_LIST_ITEM }],
  beliefs: [{ ...EMPTY_LIST_ITEM }, { ...EMPTY_LIST_ITEM }, { ...EMPTY_LIST_ITEM }],
  tensions: [{ ...EMPTY_LIST_ITEM }, { ...EMPTY_LIST_ITEM }, { ...EMPTY_LIST_ITEM }],
  decision_drivers: [{ ...EMPTY_LIST_ITEM }, { ...EMPTY_LIST_ITEM }],
  messaging_hooks: [{ ...EMPTY_LIST_ITEM }, { ...EMPTY_LIST_ITEM }],
  objections: [{ ...EMPTY_LIST_ITEM }, { ...EMPTY_LIST_ITEM }],
  channel_preferences: [{ ...EMPTY_LIST_ITEM }, { ...EMPTY_LIST_ITEM }],
}

// ============================================================================
// Helper Components
// ============================================================================

function FieldStatusIndicator({ status, confidence }: { status: FieldStatus; confidence?: number }) {
  if (status === "confirmed") {
    return (
      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300">
        <CheckCircle className="h-3 w-3 mr-1" />
        Confirmed
      </Badge>
    )
  }
  if (status === "suggested") {
    return (
      <Badge className="bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300">
        <Sparkles className="h-3 w-3 mr-1" />
        AI Suggested
        {confidence && <span className="ml-1 opacity-70">({Math.round(confidence * 100)}%)</span>}
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="text-gray-500 border-gray-300">
      <AlertCircle className="h-3 w-3 mr-1" />
      Empty
    </Badge>
  )
}

function EvidenceTooltip({ evidence, children }: { evidence: string[]; children: React.ReactNode }) {
  if (!evidence || evidence.length === 0) {
    return <>{children}</>
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent className="max-w-md p-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Quote className="h-4 w-4 text-blue-500" />
              Evidence from transcript
            </div>
            <div className="space-y-1">
              {evidence.map((quote, idx) => (
                <p key={idx} className="text-sm italic text-gray-600 dark:text-gray-300 border-l-2 border-blue-300 pl-2">
                  "{quote}"
                </p>
              ))}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

function ListFieldEditor({
  label,
  items,
  onChange,
  onAdd,
  maxItems = 5,
  placeholder = "Enter item...",
}: {
  label: string
  items: ListItem[]
  onChange: (index: number, value: string) => void
  onAdd: () => void
  maxItems?: number
  placeholder?: string
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{label}</Label>
        <span className="text-xs text-gray-500">
          {items.filter(i => i.value.trim()).length} / {maxItems}
        </span>
      </div>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={index} className="flex items-start gap-2">
            <div className="flex-1 relative">
              <Input
                value={item.value}
                onChange={(e) => onChange(index, e.target.value)}
                placeholder={placeholder}
                className={`pr-10 ${
                  item.status === "empty" && !item.value ? "border-red-200 bg-red-50/50" : 
                  item.status === "suggested" ? "border-amber-200 bg-amber-50/50" :
                  item.status === "confirmed" ? "border-emerald-200 bg-emerald-50/50" : ""
                }`}
              />
              {item.evidence && item.evidence.length > 0 && (
                <EvidenceTooltip evidence={item.evidence}>
                  <button className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-500 hover:text-blue-700">
                    <Search className="h-4 w-4" />
                  </button>
                </EvidenceTooltip>
              )}
            </div>
            <FieldStatusIndicator status={item.status} confidence={item.confidence} />
          </div>
        ))}
      </div>
      {items.length < maxItems && (
        <Button type="button" variant="outline" size="sm" onClick={onAdd} className="w-full">
          <Plus className="h-4 w-4 mr-1" />
          Add {label.slice(0, -1)}
        </Button>
      )}
    </div>
  )
}

function SectionProgress({ sections, formData }: { sections: FormSection[]; formData: PersonaFormData }) {
  const getSectionCompletion = useCallback((section: FormSection): number => {
    let total = 0
    let completed = 0

    section.fields.forEach((field) => {
      const value = (formData as any)[field]
      if (Array.isArray(value)) {
        total += value.length
        completed += value.filter((item: ListItem) => item.value.trim()).length
      } else if (typeof value === "string") {
        total += 1
        if (value.trim()) completed += 1
      }
    })

    return total > 0 ? Math.round((completed / total) * 100) : 0
  }, [formData])

  const totalCompletion = useMemo(() => {
    const completions = sections.map(getSectionCompletion)
    return Math.round(completions.reduce((a, b) => a + b, 0) / sections.length)
  }, [sections, getSectionCompletion])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Overall Progress</span>
        <Badge variant="secondary">{totalCompletion}%</Badge>
      </div>
      <Progress value={totalCompletion} className="h-2" />
      <ScrollArea className="h-[300px]">
        <div className="space-y-2 pr-4">
          {sections.map((section) => {
            const completion = getSectionCompletion(section)
            const Icon = section.icon
            return (
              <div key={section.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                <div className={`p-1.5 rounded-md ${
                  completion === 100 ? "bg-emerald-100 text-emerald-600" :
                  completion > 0 ? "bg-amber-100 text-amber-600" :
                  "bg-gray-100 text-gray-400"
                }`}>
                  {completion === 100 ? <CheckCircle className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{section.label}</p>
                  <div className="h-1.5 bg-gray-200 rounded-full mt-1">
                    <div
                      className={`h-full rounded-full transition-all ${
                        completion === 100 ? "bg-emerald-500" :
                        completion > 0 ? "bg-amber-500" :
                        "bg-gray-300"
                      }`}
                      style={{ width: `${completion}%` }}
                    />
                  </div>
                </div>
                <span className="text-xs text-gray-500">{completion}%</span>
              </div>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function PersonaBuilder() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const editId = searchParams.get("id")
  const urlBrandId = searchParams.get("brand_id")

  // State
  const [step, setStep] = useState<"upload" | "review">(editId ? "review" : "upload")
  const [formData, setFormData] = useState<PersonaFormData>(initialFormData)
  const [transcriptText, setTranscriptText] = useState("")
  const [transcriptFile, setTranscriptFile] = useState<File | null>(null)
  const [suggestions, setSuggestions] = useState<TranscriptSuggestions | null>(null)
  const [brands, setBrands] = useState<BrandOption[]>([])
  const [selectedBrandId, setSelectedBrandId] = useState<number | null>(urlBrandId ? parseInt(urlBrandId) : null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedPersonaId, setSavedPersonaId] = useState<number | null>(editId ? parseInt(editId) : null)
  const [editedFields, setEditedFields] = useState<Set<string>>(new Set())

  // Load brands
  useEffect(() => {
    BrandsAPI.list().then(setBrands).catch(console.error)
  }, [])

  // Load persona for editing
  useEffect(() => {
    if (editId) {
      setLoading(true)
      PersonasAPI.get(parseInt(editId))
        .then((persona) => {
          // Populate form from existing persona
          const json = typeof persona.full_persona_json === 'string' 
            ? JSON.parse(persona.full_persona_json) 
            : persona.full_persona_json || {}
          
          setFormData({
            name: persona.name || "",
            persona_type: persona.persona_type === "HCP" ? "HCP" : "Patient",
            age: String(persona.age || ""),
            gender: persona.gender || "",
            condition: persona.condition || "",
            location: persona.location || "",
            medical_background: json.medical_background || "",
            lifestyle_and_values: json.lifestyle_and_values || "",
            specialty: persona.specialty || "",
            practice_setup: persona.practice_setup || "",
            decision_influencers: persona.decision_influencers || "",
            motivations: (json.motivations || []).map((m: string) => ({ 
              value: m, status: "confirmed" as FieldStatus, evidence: [] 
            })).concat([EMPTY_LIST_ITEM, EMPTY_LIST_ITEM, EMPTY_LIST_ITEM]).slice(0, 5),
            beliefs: (json.beliefs || []).map((b: string) => ({ 
              value: b, status: "confirmed" as FieldStatus, evidence: [] 
            })).concat([EMPTY_LIST_ITEM, EMPTY_LIST_ITEM, EMPTY_LIST_ITEM]).slice(0, 5),
            tensions: (json.pain_points || []).map((t: string) => ({ 
              value: t, status: "confirmed" as FieldStatus, evidence: [] 
            })).concat([EMPTY_LIST_ITEM, EMPTY_LIST_ITEM, EMPTY_LIST_ITEM]).slice(0, 5),
            decision_drivers: [EMPTY_LIST_ITEM, EMPTY_LIST_ITEM],
            messaging_hooks: [EMPTY_LIST_ITEM, EMPTY_LIST_ITEM],
            objections: [EMPTY_LIST_ITEM, EMPTY_LIST_ITEM],
            channel_preferences: [EMPTY_LIST_ITEM, EMPTY_LIST_ITEM],
          })
          setStep("review")
        })
        .catch((err) => {
          setError("Failed to load persona for editing")
          console.error(err)
        })
        .finally(() => setLoading(false))
    }
  }, [editId])

  // Handle transcript file change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    setTranscriptFile(file || null)
    setError(null)
  }

  // Analyze transcript
  const handleAnalyzeTranscript = async () => {
    if (!transcriptFile && !transcriptText.trim()) {
      setError("Please upload a file or paste transcript text")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const formDataPayload = new FormData()
      if (transcriptFile) {
        formDataPayload.append("file", transcriptFile)
      }
      if (transcriptText.trim()) {
        formDataPayload.append("transcript_text", transcriptText.trim())
      }

      const result = await PersonasAPI.extractFromTranscript(formDataPayload, {
        use_llm: true,
        verify_quotes: true,
      })

      setSuggestions(result)
      applyTranscriptSuggestions(result)
      setStep("review")
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to analyze transcript")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Apply transcript suggestions to form
  const applyTranscriptSuggestions = (data: TranscriptSuggestions) => {
    const demographics = data.demographics || {}
    const legacy = data.legacy || {}
    const core = data.core || {}

    // Helper to create list items from suggestions
    const createListItems = (
      values: string[], 
      evidence?: string[],
      minItems: number = 3
    ): ListItem[] => {
      const items = values.map((v, i) => ({
        value: v,
        status: "suggested" as FieldStatus,
        evidence: evidence && evidence[i] ? [evidence[i]] : [],
        confidence: 0.75,
      }))
      while (items.length < minItems) {
        items.push({ ...EMPTY_LIST_ITEM })
      }
      return items
    }

    // Extract MBT with evidence
    const mbtMotivation = core?.mbt?.motivation || {}
    const mbtBeliefs = core?.mbt?.beliefs || {}
    const mbtTension = core?.mbt?.tension || {}

    setFormData((prev) => ({
      ...prev,
      age: demographics.age?.value || prev.age,
      gender: demographics.gender?.value || prev.gender,
      location: demographics.location?.value || prev.location,
      condition: demographics.condition?.value || prev.condition,
      motivations: createListItems(
        mbtMotivation.top_outcomes?.value || legacy.motivations || [],
        mbtMotivation.top_outcomes?.evidence
      ),
      beliefs: createListItems(
        mbtBeliefs.core_belief_statements?.value || legacy.beliefs || [],
        mbtBeliefs.core_belief_statements?.evidence
      ),
      tensions: createListItems(
        mbtTension.sensitivity_points?.value || legacy.tensions || [],
        mbtTension.sensitivity_points?.evidence
      ),
      decision_drivers: createListItems(
        core?.decision_drivers?.ranked_drivers?.map((d: any) => d.driver || d.detail) || [],
        undefined,
        2
      ),
      messaging_hooks: createListItems(
        core?.messaging?.what_lands?.value || [],
        core?.messaging?.what_lands?.evidence,
        2
      ),
      objections: createListItems(
        core?.barriers_objections?.objections?.value || [],
        core?.barriers_objections?.objections?.evidence,
        2
      ),
      channel_preferences: createListItems(
        core?.channel_behavior?.preferred_sources?.value || [],
        core?.channel_behavior?.preferred_sources?.evidence,
        2
      ),
    }))
  }

  // Handle form field changes
  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setEditedFields((prev) => new Set(prev).add(field))
  }

  const handleListItemChange = (field: keyof PersonaFormData, index: number, value: string) => {
    setFormData((prev) => {
      const items = [...(prev[field] as ListItem[])]
      items[index] = {
        ...items[index],
        value,
        status: value.trim() ? "confirmed" : "empty",
      }
      return { ...prev, [field]: items }
    })
    setEditedFields((prev) => new Set(prev).add(`${field}.${index}`))
  }

  const handleAddListItem = (field: keyof PersonaFormData) => {
    setFormData((prev) => ({
      ...prev,
      [field]: [...(prev[field] as ListItem[]), { ...EMPTY_LIST_ITEM }],
    }))
  }

  // Save persona
  const handleSave = async () => {
    setSaving(true)
    setError(null)

    try {
      // Build persona payload
      const personaPayload = {
        name: formData.name || "Unnamed Persona",
        age: parseInt(formData.age) || 0,
        gender: formData.gender,
        condition: formData.condition,
        location: formData.location,
        persona_type: formData.persona_type,
        brand_id: selectedBrandId || undefined,
        specialty: formData.persona_type === "HCP" ? formData.specialty : undefined,
        practice_setup: formData.persona_type === "HCP" ? formData.practice_setup : undefined,
        decision_influencers: formData.persona_type === "HCP" ? formData.decision_influencers : undefined,
        full_persona_json: {
          name: formData.name,
          persona_type: formData.persona_type,
          demographics: {
            age: parseInt(formData.age) || 0,
            gender: formData.gender,
            location: formData.location,
            occupation: "",
          },
          medical_background: formData.medical_background,
          lifestyle_and_values: formData.lifestyle_and_values,
          motivations: formData.motivations.filter(m => m.value.trim()).map(m => m.value),
          beliefs: formData.beliefs.filter(b => b.value.trim()).map(b => b.value),
          pain_points: formData.tensions.filter(t => t.value.trim()).map(t => t.value),
          communication_preferences: {},
          // Include enriched structure
          core: {
            mbt: {
              motivation: {
                top_outcomes: {
                  value: formData.motivations.filter(m => m.value.trim()).map(m => m.value),
                  status: "confirmed",
                  evidence: formData.motivations.flatMap(m => m.evidence || []),
                },
              },
              beliefs: {
                core_belief_statements: {
                  value: formData.beliefs.filter(b => b.value.trim()).map(b => b.value),
                  status: "confirmed",
                  evidence: formData.beliefs.flatMap(b => b.evidence || []),
                },
              },
              tension: {
                sensitivity_points: {
                  value: formData.tensions.filter(t => t.value.trim()).map(t => t.value),
                  status: "confirmed",
                  evidence: formData.tensions.flatMap(t => t.evidence || []),
                },
              },
            },
            decision_drivers: {
              ranked_drivers: formData.decision_drivers
                .filter(d => d.value.trim())
                .map((d, i) => ({ rank: i + 1, driver: d.value, detail: "" })),
            },
            messaging: {
              what_lands: {
                value: formData.messaging_hooks.filter(m => m.value.trim()).map(m => m.value),
                status: "confirmed",
                evidence: formData.messaging_hooks.flatMap(m => m.evidence || []),
              },
            },
            barriers_objections: {
              objections: {
                value: formData.objections.filter(o => o.value.trim()).map(o => o.value),
                status: "confirmed",
                evidence: formData.objections.flatMap(o => o.evidence || []),
              },
            },
            channel_behavior: {
              preferred_sources: {
                value: formData.channel_preferences.filter(c => c.value.trim()).map(c => c.value),
                status: "confirmed",
                evidence: formData.channel_preferences.flatMap(c => c.evidence || []),
              },
            },
          },
        },
      }

      let result
      if (savedPersonaId) {
        // Update existing persona
        result = await PersonasAPI.saveWithConfirmation(
          savedPersonaId,
          personaPayload,
          Array.from(editedFields)
        )
      } else {
        // Create new persona
        result = await PersonasAPI.createManual(personaPayload)
        setSavedPersonaId(result.id)
      }

      // Success - show option to test
      setError(null)
      alert(`Persona "${result.name}" saved successfully!`)
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to save persona")
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  // Navigate to simulation
  const handleTestPersona = () => {
    if (savedPersonaId) {
      navigate("/simulation", { state: { preselectedPersonaIds: [savedPersonaId] } })
    }
  }

  // Get active sections based on persona type
  const activeSections = useMemo(() => {
    const base = [...FORM_SECTIONS]
    if (formData.persona_type === "HCP") {
      // Insert HCP sections after background
      const bgIndex = base.findIndex(s => s.id === "background")
      base.splice(bgIndex + 1, 0, ...HCP_SECTIONS)
    }
    return base
  }, [formData.persona_type])

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50 dark:from-gray-950 dark:via-gray-900 dark:to-violet-950">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[hsl(262,60%,38%)] via-[hsl(262,60%,42%)] to-[hsl(280,60%,45%)]">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 right-20 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse" />
        </div>
        <div className="relative z-10 px-8 py-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-5">
                <div className="relative p-4 bg-white/20 backdrop-blur-sm rounded-2xl border border-white/20">
                  <Brain className="h-10 w-10 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h1 className="text-4xl font-bold text-white">Persona Builder</h1>
                    <Badge className="bg-white/20 backdrop-blur-sm text-white border-white/30 px-3 py-1">
                      <Sparkles className="h-3 w-3 mr-1" />
                      AI-Powered
                    </Badge>
                  </div>
                  <p className="text-white/80 text-base">
                    Build data-driven personas from interview transcripts with AI extraction
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => navigate("/personas")}
                  className="bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Library
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${
            step === "upload" ? "bg-violet-100 text-violet-700" : "bg-gray-100 text-gray-600"
          }`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${
              step === "upload" ? "bg-violet-600 text-white" : "bg-gray-300 text-gray-600"
            }`}>1</div>
            <span className="font-medium">Upload Transcript</span>
          </div>
          <ArrowRight className="h-5 w-5 text-gray-400" />
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${
            step === "review" ? "bg-violet-100 text-violet-700" : "bg-gray-100 text-gray-600"
          }`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${
              step === "review" ? "bg-violet-600 text-white" : "bg-gray-300 text-gray-600"
            }`}>2</div>
            <span className="font-medium">Review & Edit</span>
          </div>
        </div>

        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-red-700">
                <AlertCircle className="h-5 w-5" />
                <span>{error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 1: Upload */}
        {step === "upload" && (
          <Card className="border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload Interview Transcript
              </CardTitle>
              <CardDescription>
                Upload a transcript file or paste text to extract persona insights using AI
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* File Upload */}
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-violet-400 transition-colors">
                <input
                  type="file"
                  id="transcript-file"
                  accept=".txt,.md,.pdf,.docx"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label htmlFor="transcript-file" className="cursor-pointer">
                  <div className="flex flex-col items-center">
                    <div className="p-4 bg-violet-100 rounded-full mb-4">
                      <FileText className="h-8 w-8 text-violet-600" />
                    </div>
                    <h3 className="text-lg font-medium mb-2">
                      {transcriptFile ? transcriptFile.name : "Drop transcript file here"}
                    </h3>
                    <p className="text-sm text-gray-500 mb-4">
                      Supports TXT, MD, PDF, DOCX
                    </p>
                    <Button variant="outline" type="button">
                      Browse Files
                    </Button>
                  </div>
                </label>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-4 text-sm text-gray-500">or paste text</span>
                </div>
              </div>

              {/* Text Input */}
              <div>
                <Label htmlFor="transcript-text">Transcript Text</Label>
                <Textarea
                  id="transcript-text"
                  value={transcriptText}
                  onChange={(e) => setTranscriptText(e.target.value)}
                  placeholder="Paste interview transcript or notes here..."
                  rows={10}
                  className="mt-2"
                />
              </div>

              {/* Brand Selection */}
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Label>Associate with Brand (Optional)</Label>
                  <Select
                    value={selectedBrandId ? String(selectedBrandId) : "none"}
                    onValueChange={(v) => setSelectedBrandId(v !== "none" ? parseInt(v) : null)}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select brand" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No brand</SelectItem>
                      {brands.map((brand) => (
                        <SelectItem key={brand.id} value={String(brand.id)}>
                          {brand.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Extraction Summary Preview */}
              {suggestions && (
                <Card className="bg-emerald-50 border-emerald-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-5 w-5 text-emerald-600" />
                      <span className="font-medium text-emerald-700">Extraction Complete</span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Motivations:</span>
                        <span className="ml-2 font-medium">{suggestions.extraction_summary?.motivations_count || 0}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Beliefs:</span>
                        <span className="ml-2 font-medium">{suggestions.extraction_summary?.beliefs_count || 0}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Tensions:</span>
                        <span className="ml-2 font-medium">{suggestions.extraction_summary?.tensions_count || 0}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Actions */}
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => navigate("/personas")}>
                  Cancel
                </Button>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setStep("review")}
                  >
                    Skip to Manual Entry
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                  <Button
                    onClick={handleAnalyzeTranscript}
                    disabled={loading || (!transcriptFile && !transcriptText.trim())}
                    className="bg-gradient-to-r from-violet-600 to-purple-600"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Analyze with AI
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Review & Edit */}
        {step === "review" && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Progress Sidebar */}
            <div className="lg:col-span-1">
              <Card className="sticky top-6">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  <SectionProgress sections={activeSections} formData={formData} />
                </CardContent>
              </Card>
            </div>

            {/* Main Form */}
            <div className="lg:col-span-3 space-y-6">
              {/* Persona Type Toggle */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Persona Type
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4">
                    <Button
                      variant={formData.persona_type === "Patient" ? "default" : "outline"}
                      onClick={() => handleInputChange("persona_type", "Patient")}
                      className="flex-1"
                    >
                      <Heart className="h-4 w-4 mr-2" />
                      Patient
                    </Button>
                    <Button
                      variant={formData.persona_type === "HCP" ? "default" : "outline"}
                      onClick={() => handleInputChange("persona_type", "HCP")}
                      className="flex-1"
                    >
                      <Stethoscope className="h-4 w-4 mr-2" />
                      Healthcare Provider (HCP)
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Demographics */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Demographics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Name</Label>
                      <Input
                        value={formData.name}
                        onChange={(e) => handleInputChange("name", e.target.value)}
                        placeholder="Persona name or archetype"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Age</Label>
                      <Input
                        type="number"
                        value={formData.age}
                        onChange={(e) => handleInputChange("age", e.target.value)}
                        placeholder="Age"
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Gender</Label>
                      <Select
                        value={formData.gender}
                        onValueChange={(v) => handleInputChange("gender", v)}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Condition</Label>
                      <Input
                        value={formData.condition}
                        onChange={(e) => handleInputChange("condition", e.target.value)}
                        placeholder="Medical condition"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Location</Label>
                      <Input
                        value={formData.location}
                        onChange={(e) => handleInputChange("location", e.target.value)}
                        placeholder="Country/Region"
                        className="mt-1"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Background */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Background
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {formData.persona_type === "Patient" ? (
                    <>
                      <div>
                        <Label>Medical Background</Label>
                        <Textarea
                          value={formData.medical_background}
                          onChange={(e) => handleInputChange("medical_background", e.target.value)}
                          placeholder="Describe medical history, diagnoses, treatments..."
                          rows={3}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>Lifestyle & Values</Label>
                        <Textarea
                          value={formData.lifestyle_and_values}
                          onChange={(e) => handleInputChange("lifestyle_and_values", e.target.value)}
                          placeholder="Describe lifestyle, values, daily routines..."
                          rows={3}
                          className="mt-1"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <Label>Specialty</Label>
                        <Input
                          value={formData.specialty}
                          onChange={(e) => handleInputChange("specialty", e.target.value)}
                          placeholder="e.g., Endocrinology, Cardiology"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>Practice Setup</Label>
                        <Textarea
                          value={formData.practice_setup}
                          onChange={(e) => handleInputChange("practice_setup", e.target.value)}
                          placeholder="Describe practice environment, patient volume..."
                          rows={2}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>Decision Influencers</Label>
                        <Textarea
                          value={formData.decision_influencers}
                          onChange={(e) => handleInputChange("decision_influencers", e.target.value)}
                          placeholder="What influences their prescribing decisions..."
                          rows={2}
                          className="mt-1"
                        />
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* MBT Section */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Motivations, Beliefs & Tensions
                  </CardTitle>
                  <CardDescription>
                    Core MBT framework fields. AI suggestions include evidence from the transcript.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <ListFieldEditor
                    label="Motivations"
                    items={formData.motivations}
                    onChange={(i, v) => handleListItemChange("motivations", i, v)}
                    onAdd={() => handleAddListItem("motivations")}
                    placeholder="What drives this persona?"
                  />
                  <Separator />
                  <ListFieldEditor
                    label="Beliefs"
                    items={formData.beliefs}
                    onChange={(i, v) => handleListItemChange("beliefs", i, v)}
                    onAdd={() => handleAddListItem("beliefs")}
                    placeholder="What do they believe about treatment/health?"
                  />
                  <Separator />
                  <ListFieldEditor
                    label="Tensions / Pain Points"
                    items={formData.tensions}
                    onChange={(i, v) => handleListItemChange("tensions", i, v)}
                    onAdd={() => handleAddListItem("tensions")}
                    placeholder="What concerns or frustrates them?"
                  />
                </CardContent>
              </Card>

              {/* Additional Fields */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5" />
                    Enriched Insights
                  </CardTitle>
                  <CardDescription>
                    Additional persona attributes for deeper simulation context
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <ListFieldEditor
                    label="Decision Drivers"
                    items={formData.decision_drivers}
                    onChange={(i, v) => handleListItemChange("decision_drivers", i, v)}
                    onAdd={() => handleAddListItem("decision_drivers")}
                    placeholder="What influences their decisions?"
                    maxItems={4}
                  />
                  <Separator />
                  <ListFieldEditor
                    label="Messaging Hooks"
                    items={formData.messaging_hooks}
                    onChange={(i, v) => handleListItemChange("messaging_hooks", i, v)}
                    onAdd={() => handleAddListItem("messaging_hooks")}
                    placeholder="What messaging resonates?"
                    maxItems={4}
                  />
                  <Separator />
                  <ListFieldEditor
                    label="Objections"
                    items={formData.objections}
                    onChange={(i, v) => handleListItemChange("objections", i, v)}
                    onAdd={() => handleAddListItem("objections")}
                    placeholder="What objections do they have?"
                    maxItems={4}
                  />
                  <Separator />
                  <ListFieldEditor
                    label="Channel Preferences"
                    items={formData.channel_preferences}
                    onChange={(i, v) => handleListItemChange("channel_preferences", i, v)}
                    onAdd={() => handleAddListItem("channel_preferences")}
                    placeholder="How do they prefer to get information?"
                    maxItems={4}
                  />
                </CardContent>
              </Card>

              {/* Actions */}
              <Card className="border-violet-200 bg-violet-50/50">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-lg">Ready to save?</h3>
                      <p className="text-sm text-gray-600">
                        {savedPersonaId 
                          ? "Update persona and optionally test with simulations" 
                          : "Create persona and optionally test with simulations"}
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <Button variant="outline" onClick={() => setStep("upload")}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                      </Button>
                      <Button
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-gradient-to-r from-violet-600 to-purple-600"
                      >
                        {saving ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            {savedPersonaId ? "Update Persona" : "Save Persona"}
                          </>
                        )}
                      </Button>
                      {savedPersonaId && (
                        <Button
                          variant="outline"
                          onClick={handleTestPersona}
                          className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                        >
                          <PlayCircle className="h-4 w-4 mr-2" />
                          Test This Persona
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default PersonaBuilder

