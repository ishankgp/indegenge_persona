"use client"

import React, { useState, useEffect } from "react"
import { PersonasAPI } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { Textarea } from "../components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs"
import { Badge } from "../components/ui/badge"
import { Separator } from "../components/ui/separator"
import { Skeleton } from "../components/ui/skeleton"
import { VeevaCRMImporter } from "../components/VeevaCRMImporter"
import {
  User,
  MapPin,
  Heart,
  Loader2,
  Plus,
  Users,
  Activity,
  Search,
  Calendar,
  Globe,
  Sparkles,
  Brain,
  Target,
  ChevronRight,
  Star,
  TrendingUp,
  Shield,
  Clock,
  Award,
  Zap,
  CheckCircle,
  Copy,
  Settings,
  Wand2,
  UserPlus,
  X,
  Database,
  Trash2,
} from "lucide-react"
import { PersonaDetailModal } from "../components/PersonaDetailModal"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"

// Base URL managed centrally via lib/api

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

interface BulkPersonaTemplate {
  id: string
  age: string
  gender: string
  condition: string
  location: string
  concerns: string
}

const conditionColors: Record<string, string> = {
  Diabetes: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  Hypertension: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  Asthma: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  Depression: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
  Arthritis: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  default: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
}

export function PersonaLibrary() {
  const { toast } = useToast();
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0 });
  const [activeTab, setActiveTab] = useState<"view" | "create">("view");
  const [creationMode, setCreationMode] = useState<"single" | "bulk" | "prompt">("single");
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Form data for single persona creation
  const [formData, setFormData] = useState({
    age: "",
    gender: "",
    condition: "",
    location: "",
    concerns: "",
    count: '1'
  });

  const [bulkTemplates, setBulkTemplates] = useState<BulkPersonaTemplate[]>([
    { id: "1", age: "", gender: "", condition: "", location: "", concerns: "" },
  ]);
  const [bulkPrompt, setBulkPrompt] = useState("")
  const [bulkCount, setBulkCount] = useState(3)
  const [bulkFilters, setBulkFilters] = useState({
    ageRange: { min: 25, max: 75 },
    genders: ["Male", "Female"],
    conditions: [] as string[],
    locations: [] as string[],
  })

  useEffect(() => {
    console.log("PersonaLibrary: Starting to fetch personas...")
    fetchPersonas()
  }, [])

  const fetchPersonas = async () => {
    console.log("PersonaLibrary: fetchPersonas called")
    setLoading(true)
    try {
      console.log("PersonaLibrary: Calling PersonasAPI.list()...")
      const data = await PersonasAPI.list()
      console.log("PersonaLibrary: Got personas data:", { count: data.length, data: data.slice(0, 2) })
      setPersonas(data)
      setError(null)
    } catch (error: any) {
      console.error("PersonaLibrary: Error fetching personas:", error)
      const errorMessage = error?.response?.data?.detail || "Failed to load personas. Please check your connection and try again."
      setError(errorMessage)
      toast({
        title: "Error loading personas",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
      console.log("PersonaLibrary: Finished loading")
    }
  }

  const handleDeletePersona = async (personaId: number, personaName: string) => {
    try {
      await PersonasAPI.delete(personaId);
      setPersonas(personas.filter(p => p.id !== personaId));
      toast({
        title: "Deleted",
        description: `Persona "${personaName}" has been removed.`,
        variant: "default"
      });
    } catch (error) {
      console.error("Failed to delete persona", error);
      toast({
        title: "Error",
        description: "Could not delete the persona.",
        variant: "destructive"
      });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); // Clear previous errors

    const age = parseInt(formData.age);
    if (isNaN(age) || age < 1 || age > 120) {
      const errorMessage = "Please enter a valid age between 1 and 120.";
      setError(errorMessage);
      alert(errorMessage);
      return;
    }

    setGenerating(true);
    try {
      const count = parseInt(formData.count) || 1;
      setGenerationProgress({ current: 0, total: count });
      
      const basePersonaData = {
        age: age,
        gender: formData.gender,
        condition: formData.condition,
        location: formData.location,
        concerns: formData.concerns
      };

      const createdPersonas = [];
      for (let i = 0; i < count; i++) {
        setGenerationProgress({ current: i + 1, total: count });
        
        const variations = [
          '', ' with family history', ' seeking treatment options', 
          ' concerned about side effects', ' looking for lifestyle changes',
          ' with financial concerns', ' preferring natural remedies',
          ' with mobility limitations', ' living in rural area', ' with strong family support'
        ];
        const variation = variations[i % variations.length];
        
        const personaData = {
          ...basePersonaData,
          concerns: formData.concerns + variation
        };
        
        const newPersona = await PersonasAPI.generate(personaData);
        createdPersonas.push(newPersona);
      }

      await fetchPersonas();
      setActiveTab("view");
      setFormData({
        age: '',
        gender: '',
        condition: '',
        location: '',
        concerns: '',
        count: '1'
      });
      setGenerationProgress({ current: 0, total: 0 });
      alert(`Successfully generated ${count} new persona${count > 1 ? 's' : ''}.`);
    } catch (error: any) {
      console.error("Error generating persona:", error);
      const errorMessage = error.response?.data?.detail || "An unexpected error occurred. Please check the console and ensure the backend is running.";
      setError(errorMessage);
      alert(`Generation Failed: ${errorMessage}`);
    } finally {
      setGenerating(false);
    }
  }

  const addBulkTemplate = () => {
    const newTemplate: BulkPersonaTemplate = {
      id: Date.now().toString(),
      age: "",
      gender: "",
      condition: "",
      location: "",
      concerns: "",
    }
    setBulkTemplates([...bulkTemplates, newTemplate])
  }

  const removeBulkTemplate = (id: string) => {
    if (bulkTemplates.length > 1) {
      setBulkTemplates(bulkTemplates.filter((template) => template.id !== id))
    }
  }

  const handleBulkTemplateChange = (id: string, field: keyof Omit<BulkPersonaTemplate, 'id'>, value: string) => {
    setBulkTemplates(bulkTemplates.map((template) => (template.id === id ? { ...template, [field]: value } : template)))
  }

  const duplicateBulkTemplate = (id: string) => {
    const templateToDuplicate = bulkTemplates.find((t) => t.id === id)
    if (templateToDuplicate) {
      const newTemplate = {
        ...templateToDuplicate,
        id: Date.now().toString(),
      }
      setBulkTemplates([...bulkTemplates, newTemplate])
    }
  }

  const validateBulkTemplates = () => {
    const errors: string[] = []
    bulkTemplates.forEach((template, index) => {
      if (!template.age || !template.gender || !template.condition || !template.location || !template.concerns) {
        errors.push(`Template ${index + 1}: All fields are required`)
      }
      const age = Number.parseInt(template.age);
      if (isNaN(age) || age < 1 || age > 120) {
        errors.push(`Template ${index + 1}: Age must be a valid number between 1 and 120`)
      }
    })
    return errors
  }

  const handleBulkGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const validationErrors = validateBulkTemplates()
    if (validationErrors.length > 0) {
      const errorMsg = "Validation errors:\n" + validationErrors.join("\n");
      setError(errorMsg);
      alert(errorMsg);
      return
    }

    setBulkGenerating(true)
    try {
      const promises = bulkTemplates.map((template) =>
        PersonasAPI.generate({
          age: Number.parseInt(template.age),
          gender: template.gender,
          condition: template.condition,
          location: template.location,
          concerns: template.concerns,
        }),
      )

      const results = await Promise.allSettled(promises);
      const successfulCreations = results.filter(r => r.status === 'fulfilled').length;
      const failedCreations = results.length - successfulCreations;

      if (successfulCreations > 0) {
        await fetchPersonas();
        setActiveTab("view");
        setBulkTemplates([{ id: "1", age: "", gender: "", condition: "", location: "", concerns: "" }]);
        setCreationMode("single");
      }
      
      alert(`Bulk Generation Complete: Successfully created ${successfulCreations} personas. ${failedCreations > 0 ? `Failed to create ${failedCreations}.` : ''}`);

      if (failedCreations > 0) {
        const firstError = results.find(r => r.status === 'rejected') as PromiseRejectedResult | undefined;
        const errorMessage = firstError?.reason?.response?.data?.detail || "Some personas could not be generated. Check the console for details.";
        setError(errorMessage);
      }

    } catch (error: any) {
      console.error("Error generating bulk personas:", error)
      const errorMessage = error.response?.data?.detail || "An unexpected error occurred during bulk generation.";
      setError(errorMessage);
      alert(`Bulk Generation Failed: ${errorMessage}`);
    } finally {
      setBulkGenerating(false)
    }
  }

  const handleBulkGenerateFromPrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!bulkPrompt.trim()) {
      const errorMsg = "Please enter a prompt for persona generation";
      setError(errorMsg);
      alert(errorMsg);
      return
    }

    setBulkGenerating(true)
    try {
      const promises = Array.from({ length: bulkCount }, (_, index) => {
        const randomAge =
          Math.floor(Math.random() * (bulkFilters.ageRange.max - bulkFilters.ageRange.min + 1)) +
          bulkFilters.ageRange.min
        const randomGender = bulkFilters.genders[Math.floor(Math.random() * bulkFilters.genders.length)]

        return PersonasAPI.generate({
          age: randomAge,
          gender: randomGender,
          condition:
            bulkFilters.conditions.length > 0
              ? bulkFilters.conditions[Math.floor(Math.random() * bulkFilters.conditions.length)]
              : "General Health",
          location:
            bulkFilters.locations.length > 0
              ? bulkFilters.locations[Math.floor(Math.random() * bulkFilters.locations.length)]
              : "United States",
          concerns: `${bulkPrompt} (Persona ${index + 1})`,
        })
      })

      const results = await Promise.allSettled(promises);
      const successfulCreations = results.filter(r => r.status === 'fulfilled').length;
      const failedCreations = results.length - successfulCreations;

      if (successfulCreations > 0) {
        await fetchPersonas();
        setActiveTab("view");
        setBulkPrompt("");
        setCreationMode("single");
      }

      alert(`Prompt Generation Complete: Successfully created ${successfulCreations} personas. ${failedCreations > 0 ? `Failed to create ${failedCreations}.` : ''}`);

      if (failedCreations > 0) {
        const firstError = results.find(r => r.status === 'rejected') as PromiseRejectedResult | undefined;
        const errorMessage = firstError?.reason?.response?.data?.detail || "Some personas could not be generated. Check the console for details.";
        setError(errorMessage);
      }

    } catch (error: any) {
      console.error("Error generating prompt-based personas:", error)
      const errorMessage = error.response?.data?.detail || "An unexpected error occurred during prompt-based generation.";
      setError(errorMessage);
      alert(`Prompt Generation Failed: ${errorMessage}`);
    } finally {
      setBulkGenerating(false)
    }
  }

  // Enhanced filtering with better debugging
  const filteredPersonas = React.useMemo(() => {
    console.log("Filtering with:", { searchTerm, totalPersonas: personas.length })
    if (personas.length === 0) return []
    return personas.filter((persona) => {
      const searchLower = searchTerm.toLowerCase().trim()
      const matchesSearch =
        searchTerm === "" ||
        persona.name.toLowerCase().includes(searchLower) ||
        (persona.condition || "").toLowerCase().includes(searchLower) ||
        persona.location.toLowerCase().includes(searchLower)
      return matchesSearch
    })
  }, [personas, searchTerm])

  // Normalize and deduplicate conditions (trim/lowercase for robustness)
  const uniqueConditions = Array.from(new Set(personas.map((p) => (p.condition || "").trim())))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b))
  console.log("Available conditions:", uniqueConditions)

  const PersonaCard = ({ persona, onDelete }: { persona: Persona, onDelete: (id: number, name: string) => void }) => {
    let personaData: any = {};
    try {
      personaData = JSON.parse(persona.full_persona_json);
    } catch (error) {
      console.error("Failed to parse persona JSON:", error);
      personaData = {};
    }
    const conditionClass = conditionColors[persona.condition] || conditionColors.default

    return (
      <Card className="group relative overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 backdrop-blur-sm bg-white/90 dark:bg-gray-900/90">
        {/* Gradient Border Effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

        <CardHeader className="relative pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary to-secondary rounded-xl blur-lg opacity-50"></div>
                <div className="relative p-2.5 bg-gradient-to-br from-primary to-secondary rounded-xl">
                  <User className="h-5 w-5 text-white" />
                </div>
              </div>
              <div>
                <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100 group-hover:text-primary transition-colors">
                  {persona.name}
                </CardTitle>
                <CardDescription className="text-sm flex items-center gap-2 mt-1">
                  <span>{persona.age} years</span>
                  <Separator orientation="vertical" className="h-3" />
                  <span>{persona.gender}</span>
                </CardDescription>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-2">
                <Badge className={cn("text-xs", conditionClass)}>{persona.condition}</Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Are you sure you want to delete persona "${persona.name}"?`)) {
                      onDelete(persona.id, persona.name);
                    }
                  }}
                  className="h-6 w-6 p-0 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className={`h-3 w-3 ${i < 4 ? "text-amber-400 fill-amber-400" : "text-gray-300"}`} />
                ))}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3 relative">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <div className="p-1.5 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <Heart className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
              </div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Primary Condition:</span>
              <span className="text-gray-600 dark:text-gray-400">{persona.condition}</span>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <MapPin className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Location:</span>
              <span className="text-gray-600 dark:text-gray-400">{persona.location}</span>
            </div>

            {personaData.demographics?.occupation && (
              <div className="flex items-center gap-2 text-sm">
                <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <Activity className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                </div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Occupation:</span>
                <span className="text-gray-600 dark:text-gray-400">{personaData.demographics.occupation}</span>
              </div>
            )}

            {/* CRM Data Lineage Indicator */}
            {personaData.crm_metadata && (
              <div className="flex items-center gap-2 text-xs bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2">
                <Database className="h-3 w-3 text-blue-600" />
                <span className="text-blue-800 dark:text-blue-300">
                  Generated from {personaData.crm_metadata.hcp_profile.name}'s patient data
                </span>
                <Badge variant="outline" className="border-blue-300 text-blue-700 text-xs">
                  Veeva CRM
                </Badge>
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-2 pt-2">
            <div className="text-center p-2 bg-gradient-to-br from-violet-50 to-violet-100 dark:from-violet-950/30 dark:to-violet-900/30 rounded-lg">
              <TrendingUp className="h-3.5 w-3.5 mx-auto text-violet-600 dark:text-violet-400 mb-1" />
              <p className="text-xs font-semibold text-violet-900 dark:text-violet-100">Active</p>
            </div>
            <div className="text-center p-2 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/30 dark:to-emerald-900/30 rounded-lg">
              <Shield className="h-3.5 w-3.5 mx-auto text-emerald-600 dark:text-emerald-400 mb-1" />
              <p className="text-xs font-semibold text-emerald-900 dark:text-emerald-100">Verified</p>
            </div>
            <div className="text-center p-2 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/30 dark:to-amber-900/30 rounded-lg">
              <Clock className="h-3.5 w-3.5 mx-auto text-amber-600 dark:text-amber-400 mb-1" />
              <p className="text-xs font-semibold text-amber-900 dark:text-amber-100">Recent</p>
            </div>
          </div>
        </CardContent>

        <CardFooter className="pt-3 relative">
          <Button
            variant="ghost"
            className="w-full group-hover:bg-gradient-to-r group-hover:from-primary group-hover:to-secondary group-hover:text-white transition-all duration-200"
            onClick={() => {
              setSelectedPersona(persona)
              setIsDetailModalOpen(true)
            }}
          >
            View Detailed Profile
            <ChevronRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </CardFooter>
      </Card>
    )
  }

  const handleCreateNewPersona = () => {
    setActiveTab("create")
    setCreationMode("single")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-violet-50 dark:from-gray-950 dark:via-gray-900 dark:to-violet-950">
      {/* Enhanced Header Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-secondary">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 right-20 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse animation-delay-2000"></div>
        </div>

        <div className="relative z-10 px-8 py-12">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-white/20 rounded-2xl blur-xl"></div>
                  <div className="relative p-4 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20">
                    <Users className="h-10 w-10 text-white" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-5xl font-bold text-white">Persona Library</h1>
                    <Badge className="bg-white/20 backdrop-blur-sm text-white border-white/30 px-3 py-1">
                      <Sparkles className="h-3 w-3 mr-1" />
                      AI-Enhanced
                    </Badge>
                  </div>
                  <p className="text-white/90 text-lg">
                    Create and manage realistic patient and HCP personas with advanced AI
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                  <div className="text-4xl font-bold text-white flex items-center gap-2">
                    <Award className="h-8 w-8 text-yellow-300" />
                    {personas.length}
                  </div>
                  <div className="text-white/80 text-sm mt-1">Total Personas</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 -mt-8">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "view" | "create")}>
          <div className="flex items-center justify-between mb-6">
            <TabsList className="bg-white/90 dark:bg-gray-900/90 shadow-xl backdrop-blur-sm">
              <TabsTrigger value="view" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                View All Personas
              </TabsTrigger>
              <TabsTrigger value="create" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create Personas
              </TabsTrigger>
            </TabsList>

            {activeTab === "view" && (
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search personas..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm"
                  />
                </div>
              </div>
            )}
          </div>

          <TabsContent value="view">
            {loading ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="border-0 shadow-xl">
                    <CardHeader>
                      <Skeleton className="h-4 w-32 mb-2" />
                      <Skeleton className="h-3 w-20" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-3 w-full mb-2" />
                      <Skeleton className="h-3 w-full mb-2" />
                      <Skeleton className="h-3 w-3/4" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredPersonas.length === 0 ? (
              <Card className="border-0 shadow-xl backdrop-blur-sm bg-white/90 dark:bg-gray-900/90">
                <CardContent className="py-20 text-center">
                  <div className="relative inline-block">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary to-secondary rounded-full blur-2xl opacity-30"></div>
                    <div className="relative p-6 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-full">
                      <Users className="h-12 w-12 text-primary" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mt-6 mb-2">
                    {searchTerm ? "No matching personas found" : "No personas created yet"}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                    {searchTerm
                      ? "Try adjusting your search criteria"
                      : "Start by creating your first AI-powered patient persona to unlock powerful insights"}
                  </p>
                  <Button
                    size="lg"
                    className="bg-gradient-to-r from-primary to-secondary text-white hover:shadow-xl transition-all duration-200"
                    onClick={() => handleCreateNewPersona()}
                  >
                    <Plus className="mr-2 h-5 w-5" />
                    Create Your First Persona
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Stats Bar */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <Card className="border-0 shadow-lg bg-gradient-to-br from-violet-50 to-violet-100 dark:from-violet-950/30 dark:to-violet-900/30">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-violet-700 dark:text-violet-300">Total</p>
                        <p className="text-2xl font-bold text-violet-900 dark:text-violet-100">
                          {filteredPersonas.length}
                        </p>
                      </div>
                      <Users className="h-8 w-8 text-violet-500" />
                    </CardContent>
                  </Card>
                  <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Conditions</p>
                        <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{uniqueConditions.length}</p>
                      </div>
                      <Heart className="h-8 w-8 text-blue-500" />
                    </CardContent>
                  </Card>
                  <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/30 dark:to-emerald-900/30">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Avg Age</p>
                        <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">
                          {Math.round(filteredPersonas.reduce((acc, p) => acc + p.age, 0) / filteredPersonas.length) ||
                            0}
                        </p>
                      </div>
                      <Calendar className="h-8 w-8 text-emerald-500" />
                    </CardContent>
                  </Card>
                  <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/30 dark:to-amber-900/30">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-amber-700 dark:text-amber-300">Locations</p>
                        <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">
                          {new Set(filteredPersonas.map((p) => p.location)).size}
                        </p>
                      </div>
                      <Globe className="h-8 w-8 text-amber-500" />
                    </CardContent>
                  </Card>
                </div>

                {/* Personas Grid */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {filteredPersonas.map((persona) => (
                    <PersonaCard key={persona.id} persona={persona} onDelete={handleDeletePersona} />
                  ))}
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="create">
            <div className="space-y-6">
              {/* Creation Mode Selector */}
              <Card className="border-0 shadow-xl backdrop-blur-sm bg-white/90 dark:bg-gray-900/90">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Creation Mode
                  </CardTitle>
                  <CardDescription>Choose how you want to create personas</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <Button
                      variant={creationMode === "single" ? "default" : "outline"}
                      onClick={() => setCreationMode("single")}
                      className="h-20 flex flex-col items-center gap-2"
                    >
                      <User className="h-6 w-6" />
                      <span>Single Persona</span>
                    </Button>
                    <Button
                      variant={creationMode === "bulk" ? "default" : "outline"}
                      onClick={() => setCreationMode("bulk")}
                      className="h-20 flex flex-col items-center gap-2"
                    >
                      <Users className="h-6 w-6" />
                      <span>Bulk Creation</span>
                    </Button>
                    <Button
                      variant={creationMode === "prompt" ? "default" : "outline"}
                      onClick={() => setCreationMode("prompt")}
                      className="h-20 flex flex-col items-center gap-2"
                    >
                      <Wand2 className="h-6 w-6" />
                      <span>Prompt-Based</span>
                    </Button>
                    <VeevaCRMImporter 
                      onImportComplete={() => {
                        fetchPersonas();
                        setActiveTab("view");
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

              {/* Single Persona Creation */}
              {creationMode === "single" && (
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
                      <div className="ml-auto">
                        <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">
                          <Zap className="h-3 w-3 mr-1" />
                          Advanced AI
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="grid gap-6 md:grid-cols-3">
                        <div className="space-y-2">
                          <Label htmlFor="age" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-500" />
                            Age
                          </Label>
                          <Input
                            id="age"
                            name="age"
                            type="number"
                            placeholder="e.g., 45"
                            value={formData.age}
                            onChange={handleInputChange}
                            className="border-gray-300 focus:border-primary focus:ring-primary"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="gender" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-500" />
                            Gender
                          </Label>
                          <Input
                            id="gender"
                            name="gender"
                            placeholder="e.g., Female"
                            value={formData.gender}
                            onChange={handleInputChange}
                            className="border-gray-300 focus:border-primary focus:ring-primary"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="condition" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                            <Heart className="h-4 w-4 text-gray-500" />
                            Primary Medical Condition
                          </Label>
                          <Input
                            id="condition"
                            name="condition"
                            placeholder="e.g., Type 2 Diabetes"
                            value={formData.condition}
                            onChange={handleInputChange}
                            className="border-gray-300 focus:border-primary focus:ring-primary"
                            required
                          />
                        </div>
                      </div>

                      <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="location" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-gray-500" />
                            Location
                          </Label>
                          <Input
                            id="location"
                            name="location"
                            placeholder="e.g., Austin, Texas"
                            value={formData.location}
                            onChange={handleInputChange}
                            className="border-gray-300 focus:border-primary focus:ring-primary"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="count" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                            <Users className="h-4 w-4 text-gray-500" />
                            Number of Personas
                          </Label>
                          <Input
                            id="count"
                            name="count"
                            type="number"
                            min="1"
                            max="10"
                            placeholder="1"
                            value={formData.count}
                            onChange={handleInputChange}
                            className="border-gray-300 focus:border-primary focus:ring-primary"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="concerns" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                          <Target className="h-4 w-4 text-gray-500" />
                          Key Concerns & Context
                        </Label>
                        <Textarea
                          id="concerns"
                          name="concerns"
                          placeholder="e.g., Managing blood sugar levels, medication side effects, cost of treatment, lifestyle adjustments..."
                          value={formData.concerns}
                          onChange={handleInputChange}
                          className="border-gray-300 focus:border-primary focus:ring-primary min-h-[120px]"
                          required
                        />
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
                            Generate {formData.count} AI Persona{parseInt(formData.count) !== 1 ? 's' : ''}
                          </>
                        )}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              )}

              {/* Bulk Creation Mode */}
              {creationMode === "bulk" && (
                <Card className="border-0 shadow-2xl backdrop-blur-sm bg-white/90 dark:bg-gray-900/90">
                  <CardHeader className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 rounded-t-xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-blue-500 rounded-xl blur-lg opacity-50"></div>
                          <div className="relative p-3 bg-gradient-to-br from-emerald-500 to-blue-500 rounded-xl">
                            <Users className="h-7 w-7 text-white" />
                          </div>
                        </div>
                        <div>
                          <CardTitle className="text-2xl">Bulk Persona Creation</CardTitle>
                          <CardDescription className="text-base">
                            Create multiple personas simultaneously with individual customization
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-gradient-to-r from-emerald-500 to-blue-500 text-white border-0">
                          <UserPlus className="h-3 w-3 mr-1" />
                          {bulkTemplates.length} Personas
                        </Badge>
                        <Button
                          onClick={addBulkTemplate}
                          size="sm"
                          className="bg-gradient-to-r from-emerald-500 to-blue-500 text-white"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add Template
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <form onSubmit={handleBulkGenerate} className="space-y-6">
                      {bulkTemplates.map((template, index) => (
                        <Card key={template.id} className="border border-gray-200 dark:border-gray-700">
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-lg flex items-center gap-2">
                                <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                                  {index + 1}
                                </div>
                                Persona Template {index + 1}
                              </CardTitle>
                              <div className="flex items-center gap-2">
                                <Button onClick={() => duplicateBulkTemplate(template.id)} size="sm" variant="outline">
                                  <Copy className="h-3 w-3" />
                                </Button>
                                {bulkTemplates.length > 1 && (
                                  <Button
                                    onClick={() => removeBulkTemplate(template.id)}
                                    size="sm"
                                    variant="outline"
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                              <div className="space-y-2">
                                <Label className="text-sm font-medium">Age</Label>
                                <Input
                                  type="number"
                                  placeholder="e.g., 45"
                                  value={template.age}
                                  onChange={(e) => handleBulkTemplateChange(template.id, "age", e.target.value)}
                                  className="border-gray-300 focus:border-primary focus:ring-primary"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-sm font-medium">Gender</Label>
                                <Input
                                  placeholder="e.g., Female"
                                  value={template.gender}
                                  onChange={(e) => handleBulkTemplateChange(template.id, "gender", e.target.value)}
                                  className="border-gray-300 focus:border-primary focus:ring-primary"
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">Primary Medical Condition</Label>
                              <Input
                                placeholder="e.g., Type 2 Diabetes"
                                value={template.condition}
                                onChange={(e) => handleBulkTemplateChange(template.id, "condition", e.target.value)}
                                className="border-gray-300 focus:border-primary focus:ring-primary"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">Location</Label>
                              <Input
                                placeholder="e.g., Austin, Texas"
                                value={template.location}
                                onChange={(e) => handleBulkTemplateChange(template.id, "location", e.target.value)}
                                className="border-gray-300 focus:border-primary focus:ring-primary"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">Key Concerns & Context</Label>
                              <Textarea
                                placeholder="e.g., Managing blood sugar levels, medication side effects..."
                                value={template.concerns}
                                onChange={(e) => handleBulkTemplateChange(template.id, "concerns", e.target.value)}
                                className="border-gray-300 focus:border-primary focus:ring-primary min-h-[80px]"
                              />
                            </div>
                          </CardContent>
                        </Card>
                      ))}

                      {error && (
                        <div className="p-4 bg-red-100 dark:bg-red-900/30 border border-red-400 text-red-700 dark:text-red-300 rounded-lg">
                          <p className="font-bold">Generation Error</p>
                          <p className="text-sm">{error}</p>
                        </div>
                      )}

                      <Separator className="my-6" />

                      <Button
                        type="submit"
                        className="w-full bg-gradient-to-r from-emerald-500 to-blue-500 text-white hover:shadow-xl transition-all duration-200 py-6 text-lg font-semibold"
                        disabled={bulkGenerating}
                      >
                        {bulkGenerating ? (
                          <>
                            <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                            Generating {bulkTemplates.length} Personas...
                          </>
                        ) : (
                          <>
                            <Users className="mr-3 h-5 w-5" />
                            Generate {bulkTemplates.length} AI Personas
                          </>
                        )}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              )}

              {/* Prompt-Based Creation Mode */}
              {creationMode === "prompt" && (
                <Card className="border-0 shadow-2xl backdrop-blur-sm bg-white/90 dark:bg-gray-900/90">
                  <CardHeader className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-t-xl">
                    <div className="flex items-center space-x-4">
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl blur-lg opacity-50"></div>
                        <div className="relative p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
                          <Wand2 className="h-7 w-7 text-white" />
                        </div>
                      </div>
                      <div>
                        <CardTitle className="text-2xl">Prompt-Based Bulk Creation</CardTitle>
                        <CardDescription className="text-base">
                          Describe your needs and let AI generate multiple diverse personas automatically
                        </CardDescription>
                      </div>
                      <div className="ml-auto">
                        <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">
                          <Sparkles className="h-3 w-3 mr-1" />
                          Smart AI
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-6">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <Target className="h-4 w-4 text-gray-500" />
                        Persona Generation Prompt
                      </Label>
                      <Textarea
                        placeholder="e.g., Create personas for patients with chronic conditions who are tech-savvy and prefer digital health solutions..."
                        value={bulkPrompt}
                        onChange={(e) => setBulkPrompt(e.target.value)}
                        className="border-gray-300 focus:border-primary focus:ring-primary min-h-[120px]"
                      />
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                      <div className="space-y-4">
                        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Number of Personas
                        </Label>
                        <div className="flex items-center gap-4">
                          <Input
                            type="number"
                            min="1"
                            max="10"
                            value={bulkCount}
                            onChange={(e) => setBulkCount(Number.parseInt(e.target.value) || 3)}
                            className="w-20"
                          />
                          <span className="text-sm text-gray-600">personas to generate</span>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Age Range</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            placeholder="Min"
                            value={bulkFilters.ageRange.min}
                            onChange={(e) =>
                              setBulkFilters({
                                ...bulkFilters,
                                ageRange: { ...bulkFilters.ageRange, min: Number.parseInt(e.target.value) || 25 },
                              })
                            }
                            className="w-20"
                          />
                          <span>to</span>
                          <Input
                            type="number"
                            placeholder="Max"
                            value={bulkFilters.ageRange.max}
                            onChange={(e) =>
                              setBulkFilters({
                                ...bulkFilters,
                                ageRange: { ...bulkFilters.ageRange, max: Number.parseInt(e.target.value) || 75 },
                              })
                            }
                            className="w-20"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Preferred Genders
                        </Label>
                        <div className="flex flex-wrap gap-2">
                          {["Male", "Female", "Non-binary"].map((gender) => (
                            <Button
                              key={gender}
                              size="sm"
                              variant={bulkFilters.genders.includes(gender) ? "default" : "outline"}
                              onClick={() => {
                                const newGenders = bulkFilters.genders.includes(gender)
                                  ? bulkFilters.genders.filter((g) => g !== gender)
                                  : [...bulkFilters.genders, gender]
                                setBulkFilters({ ...bulkFilters, genders: newGenders })
                              }}
                            >
                              {gender}
                            </Button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Preferred Conditions
                        </Label>
                        <Input
                          placeholder="e.g., Diabetes, Hypertension (comma-separated)"
                          onChange={(e) =>
                            setBulkFilters({
                              ...bulkFilters,
                              conditions: e.target.value
                                .split(",")
                                .map((c) => c.trim())
                                .filter(Boolean),
                            })
                          }
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Preferred Locations
                      </Label>
                      <Input
                        placeholder="e.g., New York, California, Texas (comma-separated)"
                        onChange={(e) =>
                          setBulkFilters({
                            ...bulkFilters,
                            locations: e.target.value
                              .split(",")
                              .map((l) => l.trim())
                              .filter(Boolean),
                          })
                        }
                      />
                    </div>

                    {error && (
                        <div className="p-4 bg-red-100 dark:bg-red-900/30 border border-red-400 text-red-700 dark:text-red-300 rounded-lg">
                          <p className="font-bold">Generation Error</p>
                          <p className="text-sm">{error}</p>
                        </div>
                      )}

                    <Separator />

                    <Button
                      onClick={handleBulkGenerateFromPrompt}
                      className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-xl transition-all duration-200 py-6 text-lg font-semibold"
                      disabled={bulkGenerating || !bulkPrompt.trim()}
                    >
                      {bulkGenerating ? (
                        <>
                          <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                          AI is Generating {bulkCount} Personas...
                        </>
                      ) : (
                        <>
                          <Wand2 className="mr-3 h-5 w-5" />
                          Generate {bulkCount} AI Personas from Prompt
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <PersonaDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        persona={selectedPersona}
      />
    </div>
  )
}
