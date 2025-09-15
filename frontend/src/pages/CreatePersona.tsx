"use client"

import React, { useState } from "react"
import { useNavigate } from "react-router-dom"
import { PersonasAPI } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { Textarea } from "../components/ui/textarea"
import { Badge } from "../components/ui/badge"
import { Separator } from "../components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select"
import { VeevaCRMImporter } from "../components/VeevaCRMImporter"
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

export function CreatePersona() {
  const navigate = useNavigate()
  const [generating, setGenerating] = useState(false)
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0 })
  const [creationMode, setCreationMode] = useState<"manual" | "ai">("manual")
  const [error, setError] = useState<string | null>(null)

  // Form data for manual persona creation
  const [manualFormData, setManualFormData] = useState({
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
    condition: '',
    region: '',
    concerns: "",
    count: '1'
  })

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
    setAiFormData({
      ...aiFormData,
      [name]: value
    })
  }

  const handleArrayInputChange = (field: 'pain_points' | 'motivations', index: number, value: string) => {
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

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const age = parseInt(manualFormData.age)
    if (isNaN(age) || age < 1 || age > 120) {
      const errorMessage = "Please enter a valid age between 1 and 120."
      setError(errorMessage)
      alert(errorMessage)
      return
    }

    // Validate required fields
    if (!manualFormData.name || !manualFormData.gender || !manualFormData.condition || !manualFormData.region) {
      setError("Please fill in all required fields.")
      alert("Please fill in all required fields.")
      return
    }

    setGenerating(true)
    try {
      // Create manual persona by calling a new API endpoint
      const personaData = {
        name: manualFormData.name,
        age: age,
        gender: manualFormData.gender,
        condition: manualFormData.condition,
        region: manualFormData.region,
        demographics: {
          age: age,
          gender: manualFormData.gender,
          location: manualFormData.region,
          occupation: manualFormData.occupation
        },
        medical_background: manualFormData.medical_background,
        lifestyle_and_values: manualFormData.lifestyle_and_values,
        pain_points: manualFormData.pain_points.filter(p => p.trim() !== ''),
        motivations: manualFormData.motivations.filter(m => m.trim() !== ''),
        communication_preferences: manualFormData.communication_preferences
      }

      const newPersona = await PersonasAPI.createManual(personaData)
      console.log("Created manual persona:", newPersona.id)
      
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
        communication_preferences: {
          preferred_channels: "",
          information_style: "",
          frequency: ""
        }
      })
      
      alert(`Successfully created manual persona. Redirecting to Persona Library...`)
      
      // Redirect to persona library after successful creation
      setTimeout(() => {
        navigate('/personas')
      }, 2000)

    } catch (error: any) {
      console.error("Error creating manual persona:", error)
      const errorMessage = error.response?.data?.detail || "An unexpected error occurred. Please check the console and ensure the backend is running."
      setError(errorMessage)
      alert(`Creation Failed: ${errorMessage}`)
    } finally {
      setGenerating(false)
    }
  }

  const handleAiSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const age = parseInt(aiFormData.age)
    if (isNaN(age) || age < 1 || age > 120) {
      const errorMessage = "Please enter a valid age between 1 and 120."
      setError(errorMessage)
      alert(errorMessage)
      return
    }

    setGenerating(true)
    try {
      const count = parseInt(aiFormData.count) || 1
      setGenerationProgress({ current: 0, total: count })
      
      const basePersonaData = {
        age: age,
        gender: aiFormData.gender,
        condition: aiFormData.condition,
        location: aiFormData.region,
        concerns: aiFormData.concerns
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
      }

      setAiFormData({
        age: '',
        gender: '',
        condition: '',
        region: '',
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

                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-4">
                      <div className="flex">
                        <div className="ml-3">
                          <p className="text-sm text-red-800">{error}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleManualSubmit} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name">Name *</Label>
                        <Input
                          id="name"
                          name="name"
                          value={manualFormData.name}
                          onChange={handleManualInputChange}
                          required
                          className="mt-1"
                          placeholder="Enter persona name"
                        />
                      </div>

                      <div>
                        <Label htmlFor="age">Age *</Label>
                        <Input
                          id="age"
                          name="age"
                          type="number"
                          min="1"
                          max="120"
                          value={manualFormData.age}
                          onChange={handleManualInputChange}
                          required
                          className="mt-1"
                          placeholder="Enter age"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="gender">Gender *</Label>
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
                        <Label htmlFor="condition">Medical Condition *</Label>
                        <Input
                          id="condition"
                          name="condition"
                          value={manualFormData.condition}
                          onChange={handleManualInputChange}
                          required
                          className="mt-1"
                          placeholder="Enter medical condition"
                        />
                      </div>

                      <div>
                        <Label htmlFor="region">Region *</Label>
                        <Input
                          id="region"
                          name="region"
                          value={manualFormData.region}
                          onChange={handleManualInputChange}
                          required
                          className="mt-1"
                          placeholder="Enter region"
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
                <form onSubmit={handleAiSubmit} className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="ai-age" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        Age
                      </Label>
                      <Input
                        id="ai-age"
                        name="age"
                        type="number"
                        placeholder="e.g., 45"
                        value={aiFormData.age}
                        onChange={handleAiInputChange}
                        className="border-gray-300 focus:border-primary focus:ring-primary"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ai-gender" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-500" />
                        Gender
                      </Label>
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
                      <Label htmlFor="ai-condition" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <Heart className="h-4 w-4 text-gray-500" />
                        Primary Medical Condition
                      </Label>
                      <Input
                        id="ai-condition"
                        name="condition"
                        placeholder="e.g., Type 2 Diabetes"
                        value={aiFormData.condition}
                        onChange={handleAiInputChange}
                        className="border-gray-300 focus:border-primary focus:ring-primary"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="ai-region" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-500" />
                        Region
                      </Label>
                      <Input
                        id="ai-region"
                        name="region"
                        placeholder="e.g., Austin, Texas"
                        value={aiFormData.region}
                        onChange={handleAiInputChange}
                        className="border-gray-300 focus:border-primary focus:ring-primary"
                        required
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