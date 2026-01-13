"use client"

import React, { useState, useEffect, useMemo, useCallback } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { PersonasAPI, BrandsAPI, type TranscriptSuggestions, type FieldStatus } from "@/lib/api"
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
  Search,
  ArrowRight,
  ArrowLeft,
  Save,
  PlayCircle,
  Lightbulb,
  Quote,
  Stethoscope,
  Heart,
  LayoutTemplate,
  ChevronRight
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
  practical_barriers: ListItem[]
  perceptual_barriers: ListItem[]
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
  { id: "barriers", label: "Barriers & Objections", icon: AlertCircle, fields: ["objections", "practical_barriers", "perceptual_barriers"] },
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
  practical_barriers: [{ ...EMPTY_LIST_ITEM }, { ...EMPTY_LIST_ITEM }],
  perceptual_barriers: [{ ...EMPTY_LIST_ITEM }, { ...EMPTY_LIST_ITEM }],
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
  id,
}: {
  label: string
  items: ListItem[]
  onChange: (index: number, value: string) => void
  onAdd: () => void
  maxItems?: number
  placeholder?: string
  id?: string
}) {
  return (
    <div className="space-y-3" id={id}>
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
                className={`pr-10 ${item.status === "empty" && !item.value ? "border-red-200 bg-red-50/50" :
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
      <div className="space-y-1">
        {sections.map((section) => {
          const completion = getSectionCompletion(section)
          const Icon = section.icon
          return (
            <a href={`#${section.id}`} key={section.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-muted/20 transition-colors group">
              <div className={`p-1.5 rounded-md transition-colors ${completion === 100 ? "bg-emerald-100 text-emerald-600" :
                  completion > 0 ? "bg-amber-100 text-amber-600" :
                    "bg-muted text-muted-foreground group-hover:text-primary"
                }`}>
                {completion === 100 ? <CheckCircle className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-foreground">{section.label}</p>
                <div className="h-1 bg-muted rounded-full mt-1 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${completion === 100 ? "bg-emerald-500" :
                        completion > 0 ? "bg-amber-500" :
                          "bg-transparent"
                      }`}
                    style={{ width: `${completion}%` }}
                  />
                </div>
              </div>
            </a>
          )
        })}
      </div>
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
            practical_barriers: [EMPTY_LIST_ITEM, EMPTY_LIST_ITEM],
            perceptual_barriers: [EMPTY_LIST_ITEM, EMPTY_LIST_ITEM],
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
      const items: ListItem[] = values.map((v, i) => ({
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
      practical_barriers: createListItems(
        core?.barriers_objections?.practical_barriers?.value || [],
        core?.barriers_objections?.practical_barriers?.evidence,
        2
      ),
      perceptual_barriers: createListItems(
        core?.barriers_objections?.perceptual_barriers?.value || [],
        core?.barriers_objections?.perceptual_barriers?.evidence,
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
              practical_barriers: {
                value: formData.practical_barriers.filter(b => b.value.trim()).map(b => b.value),
                status: "confirmed",
                evidence: formData.practical_barriers.flatMap(b => b.evidence || []),
              },
              perceptual_barriers: {
                value: formData.perceptual_barriers.filter(b => b.value.trim()).map(b => b.value),
                status: "confirmed",
                evidence: formData.perceptual_barriers.flatMap(b => b.evidence || []),
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

  const currentBrand = brands.find(b => b.id === selectedBrandId)?.name

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden font-sans">

      {/* 1. LEFT SIDEBAR: Navigation & Progress */}
      <aside className="w-80 border-r bg-muted/10 flex flex-col shrink-0">
        <div className="p-4 border-b h-16 flex items-center bg-background/50 backdrop-blur">
          <div className="flex items-center gap-2 font-bold text-lg tracking-tight">
            <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
              <Brain className="h-5 w-5" />
            </div>
            Persona Studio
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-6">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-muted-foreground"
              onClick={() => navigate("/personas")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Library
            </Button>

            {step === "review" ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Completion Status</h3>
                  <SectionProgress sections={activeSections} formData={formData} />
                </div>
              </div>
            ) : (
              <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
                <h4 className="font-semibold text-sm mb-1 text-primary">Getting Started</h4>
                <p className="text-xs text-muted-foreground">Upload a transcript to automatically extract persona traits, or start manually.</p>
              </div>
            )}
          </div>
        </ScrollArea>

        {step === "review" && (
          <div className="p-4 border-t bg-background/50">
            <Button variant="outline" className="w-full" onClick={() => setStep('upload')}>
              <Upload className="h-4 w-4 mr-2" />
              Import New Transcript
            </Button>
          </div>
        )}
      </aside>

      {/* 2. MAIN CENTER: Workspace */}
      <main className="flex-1 flex flex-col items-stretch relative bg-slate-50/50 dark:bg-slate-950/50">
        <header className="h-16 border-b bg-background/80 backdrop-blur sticky top-0 z-20 flex items-center justify-between px-6">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              {formData.name || "Untitled Persona"}
              {savedPersonaId && <Badge variant="outline" className="font-normal text-xs">v{savedPersonaId}</Badge>}
            </h1>
            <p className="text-xs text-muted-foreground flex items-center gap-2">
              {formData.persona_type}
              {currentBrand && <span className="flex items-center gap-1">• <Target className="h-3 w-3" /> {currentBrand}</span>}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate('/personas')}>Cancel</Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="gap-2"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {savedPersonaId ? "Update Persona" : "Save Persona"}
            </Button>
            {savedPersonaId && (
              <Button variant="secondary" onClick={handleTestPersona} className="gap-2 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200">
                <PlayCircle className="h-4 w-4" /> Test
              </Button>
            )}
          </div>
        </header>

        <ScrollArea className="flex-1">
          <div className="max-w-4xl mx-auto p-8 pb-32">

            {error && (
              <Card className="mb-6 border-red-200 bg-red-50 text-red-800">
                <CardContent className="p-4 flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <p>{error}</p>
                </CardContent>
              </Card>
            )}

            {step === "upload" && (
              <Card className="border shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5 text-primary" />
                    Upload Interview Source
                  </CardTitle>
                  <CardDescription>Drag and drop a transcript file (PDF, DOCX, TXT) to auto-generate this persona.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="border-2 border-dashed rounded-xl p-10 text-center hover:bg-muted/50 transition-colors cursor-pointer relative" onClick={() => document.getElementById('transcript-file')?.click()}>
                    <input type="file" id="transcript-file" className="hidden" accept=".txt,.md,.pdf,.docx" onChange={handleFileChange} />
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 text-primary">
                      <FileText className="h-8 w-8" />
                    </div>
                    <h3 className="font-medium text-lg mb-1">{transcriptFile ? transcriptFile.name : "Drop transcript file here"}</h3>
                    <p className="text-sm text-muted-foreground">or click to browse</p>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center"><Separator /></div>
                    <div className="relative flex justify-center"><span className="bg-background px-4 text-xs text-muted-foreground uppercase">Or paste text</span></div>
                  </div>

                  <Textarea
                    placeholder="Paste raw transcript text here..."
                    className="min-h-[200px] font-mono text-sm"
                    value={transcriptText}
                    onChange={(e) => setTranscriptText(e.target.value)}
                  />

                  <div className="flex items-center gap-4 pt-4">
                    <div className="flex-1">
                      <Label>Associate Brand</Label>
                      <Select value={selectedBrandId ? String(selectedBrandId) : "none"} onValueChange={(v) => setSelectedBrandId(v !== "none" ? parseInt(v) : null)}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select Brand" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {brands.map(b => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      className="self-end"
                      size="lg"
                      onClick={handleAnalyzeTranscript}
                      disabled={loading || (!transcriptFile && !transcriptText.trim())}
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                      Analyze & Extract
                    </Button>
                  </div>

                  <div className="text-center pt-2">
                    <Button variant="link" size="sm" onClick={() => setStep('review')} className="text-muted-foreground hover:text-foreground">
                      Skip to manual entry <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {step === "review" && (
              <div className="space-y-8">

                {/* 1. Core Profile */}
                <div id="demographics" className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-semibold">Core Profile</h2>
                  </div>
                  <Card>
                    <CardContent className="p-6 space-y-6">
                      <div className="flex gap-4 p-4 bg-muted/20 rounded-lg border">
                        <div className="flex-1">
                          <Label className="mb-2 block">Persona Type</Label>
                          <div className="flex gap-2">
                            <Button size="sm" variant={formData.persona_type === "Patient" ? "default" : "outline"} onClick={() => handleInputChange("persona_type", "Patient")}>Patient</Button>
                            <Button size="sm" variant={formData.persona_type === "HCP" ? "default" : "outline"} onClick={() => handleInputChange("persona_type", "HCP")}>HCP</Button>
                          </div>
                        </div>
                        <div className="flex-1">
                          <Label className="mb-2 block">Name</Label>
                          <Input value={formData.name} onChange={(e) => handleInputChange("name", e.target.value)} placeholder="e.g. 'The Anxious Caregiver'" className="bg-background" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div><Label>Age</Label><Input type="number" value={formData.age} onChange={e => handleInputChange("age", e.target.value)} /></div>
                        <div><Label>Gender</Label>
                          <Select value={formData.gender} onValueChange={v => handleInputChange("gender", v)}>
                            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-2"><Label>Location</Label><Input value={formData.location} onChange={e => handleInputChange("location", e.target.value)} /></div>
                      </div>
                      <div>
                        <Label>Medical Condition</Label>
                        <Input value={formData.condition} onChange={e => handleInputChange("condition", e.target.value)} />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* 2. Background */}
                <div id="background" className="space-y-4 pt-4 scroll-mt-20">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-semibold">Background & Context</h2>
                  </div>
                  <Card>
                    <CardContent className="p-6 space-y-4">
                      {formData.persona_type === "Patient" ? (
                        <>
                          <div><Label>Medical History</Label><Textarea rows={3} value={formData.medical_background} onChange={e => handleInputChange("medical_background", e.target.value)} /></div>
                          <div><Label>Lifestyle & Values</Label><Textarea rows={3} value={formData.lifestyle_and_values} onChange={e => handleInputChange("lifestyle_and_values", e.target.value)} /></div>
                        </>
                      ) : (
                        <>
                          <div><Label>Specialty</Label><Input value={formData.specialty} onChange={e => handleInputChange("specialty", e.target.value)} /></div>
                          <div><Label>Practice Setup</Label><Textarea rows={2} value={formData.practice_setup} onChange={e => handleInputChange("practice_setup", e.target.value)} /></div>
                          <div><Label>Influencers</Label><Textarea rows={2} value={formData.decision_influencers} onChange={e => handleInputChange("decision_influencers", e.target.value)} /></div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* 3. Psychographics (MBT) */}
                <div id="motivations" className="space-y-4 pt-4 scroll-mt-20">
                  <div className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-semibold">Psychographics (MBT)</h2>
                  </div>
                  <Card>
                    <CardHeader><CardDescription>Motivations, Beliefs, and Tensions extracted from the transcript.</CardDescription></CardHeader>
                    <CardContent className="space-y-8 p-6">
                      <ListFieldEditor id="motivations-list" label="Motivations" items={formData.motivations} onChange={(i, v) => handleListItemChange("motivations", i, v)} onAdd={() => handleAddListItem("motivations")} />
                      <Separator />
                      <div id="beliefs">
                        <ListFieldEditor label="Beliefs" items={formData.beliefs} onChange={(i, v) => handleListItemChange("beliefs", i, v)} onAdd={() => handleAddListItem("beliefs")} />
                      </div>
                      <Separator />
                      <div id="tensions">
                        <ListFieldEditor label="Tensions / Pain Points" items={formData.tensions} onChange={(i, v) => handleListItemChange("tensions", i, v)} onAdd={() => handleAddListItem("tensions")} />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* 4. Enriched Insights */}
                <div id="decision_drivers" className="space-y-4 pt-4 scroll-mt-20">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-semibold">Strategic Insights</h2>
                  </div>
                  <Card>
                    <CardContent className="space-y-8 p-6">
                      <ListFieldEditor label="Decision Drivers" items={formData.decision_drivers} onChange={(i, v) => handleListItemChange("decision_drivers", i, v)} onAdd={() => handleAddListItem("decision_drivers")} maxItems={4} />
                      <Separator />
                      <div id="messaging">
                        <ListFieldEditor label="Messaging Hooks" items={formData.messaging_hooks} onChange={(i, v) => handleListItemChange("messaging_hooks", i, v)} onAdd={() => handleAddListItem("messaging_hooks")} maxItems={4} />
                      </div>
                      <Separator />
                      <div id="barriers">
                        <ListFieldEditor label="Objections" items={formData.objections} onChange={(i, v) => handleListItemChange("objections", i, v)} onAdd={() => handleAddListItem("objections")} maxItems={4} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <ListFieldEditor label="Practical Barriers" items={formData.practical_barriers} onChange={(i, v) => handleListItemChange("practical_barriers", i, v)} onAdd={() => handleAddListItem("practical_barriers")} maxItems={2} />
                        <ListFieldEditor label="Perceptual Barriers" items={formData.perceptual_barriers} onChange={(i, v) => handleListItemChange("perceptual_barriers", i, v)} onAdd={() => handleAddListItem("perceptual_barriers")} maxItems={2} />
                      </div>
                      <Separator />
                      <div id="channel">
                        <ListFieldEditor label="Channel Preferences" items={formData.channel_preferences} onChange={(i, v) => handleListItemChange("channel_preferences", i, v)} onAdd={() => handleAddListItem("channel_preferences")} maxItems={4} />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="h-20" /> {/* Spacer */}
              </div>
            )}
          </div>
        </ScrollArea>
      </main>

      {/* 3. RIGHT SIDEBAR: Intelligence */}
      <aside className="w-80 border-l bg-background flex flex-col shrink-0">
        <div className="p-4 border-b h-16 flex items-center bg-background/50 backdrop-blur">
          <div className="font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-500" />
            Intelligence
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-6">
            {!suggestions ? (
              <div className="text-center py-10 text-muted-foreground px-4">
                <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                  <LayoutTemplate className="h-6 w-6 opacity-30" />
                </div>
                <p className="text-sm">Upload a transcript to see AI-extracted insights and evidence.</p>
              </div>
            ) : (
              <div className="space-y-6 animate-in fade-in duration-500">
                <div className="p-3 bg-emerald-50 text-emerald-900 rounded-lg border border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-100 dark:border-emerald-800">
                  <div className="flex items-center gap-2 font-medium mb-1">
                    <CheckCircle className="h-4 w-4 text-emerald-600" />
                    Extraction Complete
                  </div>
                  <p className="text-xs opacity-90">Analyzed {transcriptFile?.name || "text input"}</p>
                </div>

                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Extraction Stats</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-3 bg-muted/30 rounded border text-center">
                      <div className="text-xl font-bold">{suggestions.extraction_summary?.motivations_count || 0}</div>
                      <div className="text-[10px] text-muted-foreground uppercase">Motivations</div>
                    </div>
                    <div className="p-3 bg-muted/30 rounded border text-center">
                      <div className="text-xl font-bold">{suggestions.extraction_summary?.beliefs_count || 0}</div>
                      <div className="text-[10px] text-muted-foreground uppercase">Beliefs</div>
                    </div>
                    <div className="p-3 bg-muted/30 rounded border text-center">
                      <div className="text-xl font-bold">{suggestions.extraction_summary?.tensions_count || 0}</div>
                      <div className="text-[10px] text-muted-foreground uppercase">Tensions</div>
                    </div>
                    <div className="p-3 bg-muted/30 rounded border text-center">
                      <div className="text-xl font-bold text-primary">{Math.round((suggestions.extraction_summary?.confidence_score || 0) * 100)}%</div>
                      <div className="text-[10px] text-muted-foreground uppercase">Confidence</div>
                    </div>
                  </div>
                </div>

                {suggestions.missing_info && suggestions.missing_info.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> Missing Data
                    </h4>
                    <ul className="space-y-2">
                      {suggestions.missing_info.map((info: string, i: number) => (
                        <li key={i} className="text-xs p-2 bg-amber-50 text-amber-800 rounded border border-amber-100 dark:bg-amber-900/20 dark:text-amber-200">
                          {info}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      </aside>

    </div>
  )
}

export default PersonaBuilder
