"use client"

import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { PersonasAPI } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { Textarea } from "../components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs"
import { Badge } from "../components/ui/badge"
import { Separator } from "../components/ui/separator"
import {
  User,
  MapPin,
  Heart,
  Loader2,
  Plus,
  Users,
  Calendar,
  Sparkles,
  Brain,
  Target,
  CheckCircle,
  Copy,
  Settings,
  Wand2,
  UserPlus,
  X,
  ArrowRight,
  ArrowLeft,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface BulkPersonaTemplate {
  id: string
  age: string
  gender: string
  condition: string
  location: string
  concerns: string
}

export function CreatePersona() {
  const navigate = useNavigate()
  const [generating, setGenerating] = useState(false)
  const [bulkGenerating, setBulkGenerating] = useState(false)
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0 })
  const [creationMode, setCreationMode] = useState<"single" | "bulk" | "prompt">("single")
  const [error, setError] = useState<string | null>(null)

  // Form data for single persona creation
  const [formData, setFormData] = useState({
    age: "",
    gender: "",
    condition: "",
    location: "",
    concerns: "",
    count: '1'
  })

  const [bulkTemplate, setBulkTemplate] = useState<Omit<BulkPersonaTemplate, "id">>({
    age: "",
    gender: "",
    condition: "",
    location: "",
    concerns: "",
  });
  const [bulkCount, setBulkCount] = useState(3);
  const [bulkPrompt, setBulkPrompt] = useState("");
  const [bulkFilters, setBulkFilters] = useState({
    ageRange: { min: 25, max: 75 },
    genders: ["Male", "Female"],
    conditions: [] as string[],
    locations: [] as string[],
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const age = parseInt(formData.age)
    if (isNaN(age) || age < 1 || age > 120) {
      const errorMessage = "Please enter a valid age between 1 and 120."
      setError(errorMessage)
      alert(errorMessage)
      return
    }

    setGenerating(true)
    try {
      const count = parseInt(formData.count) || 1
      setGenerationProgress({ current: 0, total: count })
      
      const basePersonaData = {
        age: age,
        gender: formData.gender,
        condition: formData.condition,
        location: formData.location,
        concerns: formData.concerns
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
          concerns: formData.concerns + variation
        }
        
        const newPersona = await PersonasAPI.generate(personaData)
        createdPersonas.push(newPersona)
      }

      setFormData({
        age: '',
        gender: '',
        condition: '',
        location: '',
        concerns: '',
        count: '1'
      })
      setGenerationProgress({ current: 0, total: 0 })
      alert(`Successfully generated ${count} new persona${count > 1 ? 's' : ''}. Redirecting to Persona Library...`)
      
      // Redirect to persona library after successful creation
      setTimeout(() => {
        navigate('/personas')
      }, 2000)

    } catch (error: any) {
      console.error("Error generating persona:", error)
      const errorMessage = error.response?.data?.detail || "An unexpected error occurred. Please check the console and ensure the backend is running."
      setError(errorMessage)
      alert(`Generation Failed: ${errorMessage}`)
    } finally {
      setGenerating(false)
    }
  }

  const handleBulkTemplateChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setBulkTemplate({
      ...bulkTemplate,
      [e.target.name]: e.target.value,
    });
  };

  const validateBulkTemplate = () => {
    const errors: string[] = [];
    if (
      !bulkTemplate.age ||
      !bulkTemplate.gender ||
      !bulkTemplate.condition ||
      !bulkTemplate.location ||
      !bulkTemplate.concerns
    ) {
      errors.push("All fields in the template are required");
    }
    const age = Number.parseInt(bulkTemplate.age);
    if (isNaN(age) || age < 1 || age > 120) {
      errors.push("Age must be a valid number between 1 and 120");
    }
    if (bulkCount < 1) {
      errors.push("Number of personas must be at least 1");
    }
    return errors;
  };

  const handleBulkGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const validationErrors = validateBulkTemplate();
    if (validationErrors.length > 0) {
      const errorMsg = "Validation errors:\n" + validationErrors.join("\n");
      setError(errorMsg);
      alert(errorMsg);
      return;
    }

    setBulkGenerating(true);
    try {
      const promises = Array.from({ length: bulkCount }, () =>
        PersonasAPI.generate({
          age: Number.parseInt(bulkTemplate.age),
          gender: bulkTemplate.gender,
          condition: bulkTemplate.condition,
          location: bulkTemplate.location,
          concerns: bulkTemplate.concerns,
        })
      );

      const results = await Promise.allSettled(promises);
      const successfulCreations = results.filter(
        (r) => r.status === "fulfilled"
      ).length;
      const failedCreations = results.length - successfulCreations;

      if (successfulCreations > 0) {
        setBulkTemplate({
          age: "",
          gender: "",
          condition: "",
          location: "",
          concerns: "",
        });
        setBulkCount(3);
        setCreationMode("single");
      }

      alert(
        `Bulk Generation Complete: Successfully created ${successfulCreations} personas. ${
          failedCreations > 0 ? `Failed to create ${failedCreations}.` : ""
        } Redirecting to Persona Library...`
      );

      if (failedCreations > 0) {
        const firstError = results.find(
          (r) => r.status === "rejected"
        ) as PromiseRejectedResult | undefined;
        const errorMessage =
          firstError?.reason?.response?.data?.detail ||
          "Some personas could not be generated. Check the console for details.";
        setError(errorMessage);
      }

      // Redirect to persona library after successful creation
      if (successfulCreations > 0) {
        setTimeout(() => {
          navigate("/personas");
        }, 2000);
      }
    } catch (error: any) {
      console.error("Error generating bulk personas:", error);
      const errorMessage =
        error.response?.data?.detail ||
        "An unexpected error occurred during bulk generation.";
      setError(errorMessage);
      alert(`Bulk Generation Failed: ${errorMessage}`);
    } finally {
      setBulkGenerating(false);
    }
  }

  const handleBulkGenerateFromPrompt = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!bulkPrompt.trim()) {
      const errorMsg = "Please enter a prompt for persona generation"
      setError(errorMsg)
      alert(errorMsg)
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

      const results = await Promise.allSettled(promises)
      const successfulCreations = results.filter(r => r.status === 'fulfilled').length
      const failedCreations = results.length - successfulCreations

      if (successfulCreations > 0) {
        setBulkPrompt("")
        setCreationMode("single")
      }

      alert(`Prompt Generation Complete: Successfully created ${successfulCreations} personas. ${failedCreations > 0 ? `Failed to create ${failedCreations}.` : ''} Redirecting to Persona Library...`)

      if (failedCreations > 0) {
        const firstError = results.find(r => r.status === 'rejected') as PromiseRejectedResult | undefined
        const errorMessage = firstError?.reason?.response?.data?.detail || "Some personas could not be generated. Check the console for details."
        setError(errorMessage)
      }

      // Redirect to persona library after successful creation
      if (successfulCreations > 0) {
        setTimeout(() => {
          navigate('/personas')
        }, 2000)
      }

    } catch (error: any) {
      console.error("Error generating prompt-based personas:", error)
      const errorMessage = error.response?.data?.detail || "An unexpected error occurred during prompt-based generation."
      setError(errorMessage)
      alert(`Prompt Generation Failed: ${errorMessage}`)
    } finally {
      setBulkGenerating(false)
    }
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
                    <UserPlus className="h-10 w-10 text-white" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-5xl font-bold text-white">Create Persona</h1>
                    <Badge className="bg-white/20 backdrop-blur-sm text-white border-white/30 px-3 py-1">
                      <Sparkles className="h-3 w-3 mr-1" />
                      AI-Powered
                    </Badge>
                  </div>
                  <p className="text-white/90 text-lg">
                    Generate realistic patient and HCP personas with advanced AI
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button 
                  variant="secondary" 
                  className="bg-white/20 backdrop-blur-sm text-white border-white/30 hover:bg-white/30"
                  onClick={() => navigate('/personas')}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Library
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 -mt-8">
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
              <div className="grid grid-cols-3 gap-4">
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
                      {bulkCount} Personas
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <form onSubmit={handleBulkGenerate} className="space-y-6">
                  <Card className="border border-gray-200 dark:border-gray-700">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                          1
                        </div>
                        Persona Template
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Age</Label>
                          <Input
                            type="number"
                            name="age"
                            placeholder="e.g., 45"
                            value={bulkTemplate.age}
                            onChange={handleBulkTemplateChange}
                            className="border-gray-300 focus:border-primary focus:ring-primary"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Gender</Label>
                          <Input
                            name="gender"
                            placeholder="e.g., Female"
                            value={bulkTemplate.gender}
                            onChange={handleBulkTemplateChange}
                            className="border-gray-300 focus:border-primary focus:ring-primary"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">
                          Primary Medical Condition
                        </Label>
                        <Input
                          name="condition"
                          placeholder="e.g., Type 2 Diabetes"
                          value={bulkTemplate.condition}
                          onChange={handleBulkTemplateChange}
                          className="border-gray-300 focus:border-primary focus:ring-primary"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Location</Label>
                        <Input
                          name="location"
                          placeholder="e.g., Austin, Texas"
                          value={bulkTemplate.location}
                          onChange={handleBulkTemplateChange}
                          className="border-gray-300 focus:border-primary focus:ring-primary"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">
                          Key Concerns & Context
                        </Label>
                        <Textarea
                          name="concerns"
                          placeholder="e.g., Managing blood sugar levels, medication side effects..."
                          value={bulkTemplate.concerns}
                          onChange={handleBulkTemplateChange}
                          className="border-gray-300 focus:border-primary focus:ring-primary min-h-[80px]"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <div className="space-y-2">
                    <Label
                      htmlFor="bulk-count"
                      className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2"
                    >
                      <Users className="h-4 w-4 text-gray-500" />
                      Number of Personas to Generate
                    </Label>
                    <Input
                      id="bulk-count"
                      name="bulk-count"
                      type="number"
                      min="1"
                      max="50"
                      placeholder="e.g., 5"
                      value={bulkCount}
                      onChange={(e) => setBulkCount(parseInt(e.target.value, 10))}
                      className="border-gray-300 focus:border-primary focus:ring-primary"
                      required
                    />
                  </div>

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
                        Generating {bulkCount} Personas...
                      </>
                    ) : (
                      <>
                        <Users className="mr-3 h-5 w-5" />
                        Generate {bulkCount} AI Personas
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
                    <CardTitle className="text-2xl">Prompt-Based Generation</CardTitle>
                    <CardDescription className="text-base">
                      Describe the personas you need, and let AI create them for you
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <form onSubmit={handleBulkGenerateFromPrompt} className="space-y-6">
                  <div>
                    <Label htmlFor="bulkPrompt" className="text-lg font-medium text-gray-800 dark:text-gray-200 flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-purple-500" />
                      Your Persona Request
                    </Label>
                    <Textarea
                      id="bulkPrompt"
                      value={bulkPrompt}
                      onChange={(e) => setBulkPrompt(e.target.value)}
                      placeholder="e.g., 'Create three personas of elderly patients with hypertension living in rural areas, who are skeptical of new medications.'"
                      className="mt-2 min-h-[150px] text-base border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="bulkCount" className="font-medium">Number of Personas</Label>
                      <Input
                        id="bulkCount"
                        type="number"
                        min="1"
                        max="10"
                        value={bulkCount}
                        onChange={(e) => setBulkCount(Number(e.target.value))}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="font-medium">Age Range</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Input
                          type="number"
                          placeholder="Min"
                          value={bulkFilters.ageRange.min}
                          onChange={(e) => setBulkFilters(f => ({ ...f, ageRange: { ...f.ageRange, min: Number(e.target.value) } }))}
                        />
                        <span>-</span>
                        <Input
                          type="number"
                          placeholder="Max"
                          value={bulkFilters.ageRange.max}
                          onChange={(e) => setBulkFilters(f => ({ ...f, ageRange: { ...f.ageRange, max: Number(e.target.value) } }))}
                        />
                      </div>
                    </div>
                  </div>
                  
                  {error && (
                    <div className="p-4 bg-red-100 dark:bg-red-900/30 border border-red-400 text-red-700 dark:text-red-300 rounded-lg">
                      <p className="font-bold">Generation Error</p>
                      <p className="text-sm">{error}</p>
                    </div>
                  )}

                  <Separator />

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-xl transition-all duration-200 py-6 text-lg font-semibold"
                    disabled={bulkGenerating}
                  >
                    {bulkGenerating ? (
                      <>
                        <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                        Generating {bulkCount} Personas...
                      </>
                    ) : (
                      <>
                        <Wand2 className="mr-3 h-5 w-5" />
                        Generate {bulkCount} AI Personas from Prompt
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