"use client"

import React, { useState, useEffect } from "react"
import { VeevaCRMAPI, type HCPProfile, type CRMConnectionStatus } from "@/lib/api"
import { Card, CardContent } from "./ui/card"
import { Button } from "./ui/button"
import { Badge } from "./ui/badge"
import { Checkbox } from "./ui/checkbox"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Textarea } from "./ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select"
import {
  Database,
  CheckCircle,
  Loader2,
  Users,
  Building,
  MapPin,
  TrendingUp,
  Download,
  Activity,
  Settings,
  ChevronLeft
} from "lucide-react"

interface VeevaCRMImporterProps {
  onImportComplete?: (result: any) => void;
  trigger?: React.ReactNode;
}

export function VeevaCRMImporter({ onImportComplete, trigger }: VeevaCRMImporterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<CRMConnectionStatus | null>(null)
  const [hcpProfiles, setHcpProfiles] = useState<HCPProfile[]>([])
  const [selectedProfiles, setSelectedProfiles] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [currentStep, setCurrentStep] = useState<'connect' | 'select' | 'configure' | 'import' | 'complete'>('connect')
  const [filters, setFilters] = useState({ specialty: 'all-specialties', tier: 'all-tiers' })
  const [importProgress, setImportProgress] = useState(0)
  
  // User configuration for persona generation
  const [userConfig, setUserConfig] = useState({
    maxPersonas: 5,
    ageRange: { min: 25, max: 75 },
    focusAreas: '',
    specificConditions: '',
    demographicPreferences: '',
    insightsGoal: ''
  })

  useEffect(() => {
    if (isOpen && currentStep === 'connect') {
      checkConnection()
    }
  }, [isOpen, currentStep])

  const checkConnection = async () => {
    setLoading(true)
    try {
      // Simulate connection check with delay
      await new Promise(resolve => setTimeout(resolve, 1500))
      const status = await VeevaCRMAPI.getConnectionStatus()
      setConnectionStatus(status)
      setCurrentStep('select')
      await loadHCPProfiles()
    } catch (error) {
      console.error('Failed to connect to Veeva CRM:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadHCPProfiles = async () => {
    setLoading(true)
    try {
      const specialtyFilter = filters.specialty === 'all-specialties' ? undefined : filters.specialty || undefined
      const tierFilter = filters.tier === 'all-tiers' ? undefined : filters.tier || undefined
      const response = await VeevaCRMAPI.getHCPProfiles(specialtyFilter, tierFilter)
      setHcpProfiles(response.profiles)
    } catch (error) {
      console.error('Failed to load HCP profiles:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleProfileSelection = (npi: string, checked: boolean) => {
    if (checked) {
      setSelectedProfiles([...selectedProfiles, npi])
    } else {
      setSelectedProfiles(selectedProfiles.filter(p => p !== npi))
    }
  }

  const handleSelectAll = () => {
    if (!hcpProfiles || hcpProfiles.length === 0) return
    
    if (selectedProfiles.length === hcpProfiles.length) {
      setSelectedProfiles([])
    } else {
      setSelectedProfiles(hcpProfiles.map(p => p.npi))
    }
  }

  const handleProceedToConfig = () => {
    if (selectedProfiles.length === 0) return
    setCurrentStep('configure')
  }

  const handleStartImport = async () => {
    setImporting(true)
    setCurrentStep('import')
    
    try {
      // Simulate progress
      let progress = 0
      const progressInterval = setInterval(() => {
        progress += Math.random() * 15
        if (progress > 95) progress = 95
        setImportProgress(progress)
      }, 200)

      // Pass user configuration to the import API
      const result = await VeevaCRMAPI.importPersonas(selectedProfiles, {
        maxPersonas: userConfig.maxPersonas,
        ageRange: userConfig.ageRange,
        focusAreas: userConfig.focusAreas,
        specificConditions: userConfig.specificConditions,
        demographicPreferences: userConfig.demographicPreferences,
        insightsGoal: userConfig.insightsGoal
      })
      
      clearInterval(progressInterval)
      setImportProgress(100)
      
      // Small delay to show 100% completion
      await new Promise(resolve => setTimeout(resolve, 500))
      
      setCurrentStep('complete')
      onImportComplete?.(result)
    } catch (error) {
      console.error('Import failed:', error)
    } finally {
      setImporting(false)
    }
  }

  const resetImporter = () => {
    setCurrentStep('connect')
    setSelectedProfiles([])
    setImportProgress(0)
    setConnectionStatus(null)
    setHcpProfiles([])
    setUserConfig({
      maxPersonas: 5,
      ageRange: { min: 25, max: 75 },
      focusAreas: '',
      specificConditions: '',
      demographicPreferences: '',
      insightsGoal: ''
    })
  }

  const getSpecialties = () => {
    if (!hcpProfiles || hcpProfiles.length === 0) return []
    const specialties = [...new Set(hcpProfiles.map(p => p.specialty))]
    return specialties.sort()
  }

  const getTiers = () => {
    if (!hcpProfiles || hcpProfiles.length === 0) return []
    const tiers = [...new Set(hcpProfiles.map(p => p.tier))]
    return tiers.sort()
  }

  const renderConnectionStep = () => (
    <div className="text-center py-8">
      <div className="relative inline-block mb-6">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full blur-xl opacity-30 animate-pulse"></div>
        <div className="relative p-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full">
          {loading ? (
            <Loader2 className="h-8 w-8 text-white animate-spin" />
          ) : (
            <Database className="h-8 w-8 text-white" />
          )}
        </div>
      </div>
      <h3 className="text-xl font-semibold mb-2">
        {loading ? "Connecting to Veeva CRM..." : "Connect to Veeva CRM"}
      </h3>
      <p className="text-gray-600 mb-6">
        {loading 
          ? "Establishing secure connection to your Veeva Vault instance..."
          : "Access your HCP profiles and patient data for persona generation"
        }
      </p>
      {loading && (
        <div className="max-w-sm mx-auto">
          <div className="space-y-2 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Authentication successful
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Vault instance verified
            </div>
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
              Loading HCP profiles...
            </div>
          </div>
        </div>
      )}
    </div>
  )

  const renderSelectionStep = () => (
    <div>
      {/* Connection Status */}
      <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <div className="flex-1">
            <p className="font-medium text-green-800">Connected to Veeva CRM</p>
            <p className="text-sm text-green-600">
              {connectionStatus?.vault_instance} • {connectionStatus?.total_hcp_profiles} HCP profiles available
            </p>
          </div>
          <Badge variant="outline" className="border-green-300 text-green-700">
            <Activity className="h-3 w-3 mr-1" />
            Live Data
          </Badge>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <Select value={filters.specialty} onValueChange={(value) => setFilters({...filters, specialty: value})}>
          <SelectTrigger>
            <SelectValue placeholder="Filter by Specialty" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all-specialties">All Specialties</SelectItem>
            {getSpecialties().map(specialty => (
              <SelectItem key={specialty} value={specialty}>{specialty}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select value={filters.tier} onValueChange={(value) => setFilters({...filters, tier: value})}>
          <SelectTrigger>
            <SelectValue placeholder="Filter by Tier" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all-tiers">All Tiers</SelectItem>
            {getTiers().map(tier => (
              <SelectItem key={tier} value={tier}>{tier}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Selection Controls */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="outline" size="sm" onClick={handleSelectAll}>
          {!hcpProfiles || hcpProfiles.length === 0 ? 'No Profiles' : 
           selectedProfiles.length === hcpProfiles.length ? 'Deselect All' : 'Select All'}
        </Button>
        <Badge variant="secondary">
          {selectedProfiles.length} of {hcpProfiles?.length || 0} selected
        </Badge>
      </div>

      {/* HCP Profiles List */}
      <div className="max-h-96 overflow-y-auto space-y-3">
        {!hcpProfiles || hcpProfiles.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No HCP profiles available</p>
            <Button onClick={loadHCPProfiles} variant="outline" className="mt-2">
              Load HCP Profiles
            </Button>
          </div>
        ) : (
          hcpProfiles.map((profile) => (
            <Card key={profile.npi} className={`cursor-pointer transition-all ${
              selectedProfiles.includes(profile.npi) ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'
            }`}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={selectedProfiles.includes(profile.npi)}
                  onChange={(e) => handleProfileSelection(profile.npi, e.target.checked)}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-semibold">{profile.name}</h4>
                    <Badge variant={profile.tier === 'Tier 1' ? 'default' : 'secondary'}>
                      {profile.tier}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Building className="h-3 w-3" />
                      {profile.specialty}
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {profile.location}
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {profile.prescribing_patterns.patient_volume}
                    </div>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      Score: {profile.interaction_history.engagement_score}/10
                    </div>
                  </div>
                  <div className="mt-2">
                    <p className="text-xs text-gray-500 line-clamp-2">
                      {profile.interaction_history.call_notes}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          ))
        )}
      </div>
    </div>
  )

  const renderConfigureStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="relative inline-block mb-4">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full blur-xl opacity-30 animate-pulse"></div>
          <div className="relative p-4 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full">
            <Settings className="h-8 w-8 text-white" />
          </div>
        </div>
        <h3 className="text-xl font-semibold mb-2">Configure Persona Generation</h3>
        <p className="text-gray-600">Customize how personas will be generated from the selected HCP profiles</p>
      </div>

      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-lg border">
        <div className="flex items-center gap-2 mb-2">
          <Users className="h-5 w-5 text-blue-600" />
          <h4 className="font-semibold text-blue-900">Selected HCP Profiles: {selectedProfiles.length}</h4>
        </div>
        <p className="text-sm text-blue-700">
          Personas will be generated based on patient data from these healthcare providers
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Left Column */}
        <div className="space-y-4">
          {/* Max Personas */}
          <div>
            <Label htmlFor="maxPersonas" className="text-sm font-medium">Maximum Personas to Generate</Label>
            <Input
              id="maxPersonas"
              type="number"
              min="1"
              max="20"
              value={userConfig.maxPersonas}
              onChange={(e) => setUserConfig({...userConfig, maxPersonas: parseInt(e.target.value) || 5})}
              className="mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">Generate up to {userConfig.maxPersonas} personas from selected profiles</p>
          </div>

          {/* Age Range */}
          <div>
            <Label className="text-sm font-medium">Patient Age Range</Label>
            <div className="flex gap-2 mt-1">
              <Input
                type="number"
                placeholder="Min"
                value={userConfig.ageRange.min}
                onChange={(e) => setUserConfig({
                  ...userConfig, 
                  ageRange: {...userConfig.ageRange, min: parseInt(e.target.value) || 25}
                })}
                className="w-20"
              />
              <span className="self-center">to</span>
              <Input
                type="number"
                placeholder="Max"
                value={userConfig.ageRange.max}
                onChange={(e) => setUserConfig({
                  ...userConfig, 
                  ageRange: {...userConfig.ageRange, max: parseInt(e.target.value) || 75}
                })}
                className="w-20"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Age range for generated patient personas</p>
          </div>

          {/* Specific Conditions */}
          <div>
            <Label htmlFor="conditions" className="text-sm font-medium">Focus on Specific Conditions</Label>
            <Textarea
              id="conditions"
              placeholder="e.g., Type 2 Diabetes, Hypertension, Cardiovascular Disease..."
              value={userConfig.specificConditions}
              onChange={(e) => setUserConfig({...userConfig, specificConditions: e.target.value})}
              className="mt-1 h-20"
            />
            <p className="text-xs text-gray-500 mt-1">Leave empty to include all conditions from HCP data</p>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {/* Focus Areas */}
          <div>
            <Label htmlFor="focusAreas" className="text-sm font-medium">Key Focus Areas</Label>
            <Textarea
              id="focusAreas"
              placeholder="e.g., Medication adherence, lifestyle factors, treatment barriers, cost concerns..."
              value={userConfig.focusAreas}
              onChange={(e) => setUserConfig({...userConfig, focusAreas: e.target.value})}
              className="mt-1 h-20"
            />
            <p className="text-xs text-gray-500 mt-1">What aspects should the personas emphasize?</p>
          </div>

          {/* Demographic Preferences */}
          <div>
            <Label htmlFor="demographics" className="text-sm font-medium">Demographic Preferences</Label>
            <Textarea
              id="demographics"
              placeholder="e.g., Urban/rural mix, diverse socioeconomic backgrounds, varying education levels..."
              value={userConfig.demographicPreferences}
              onChange={(e) => setUserConfig({...userConfig, demographicPreferences: e.target.value})}
              className="mt-1 h-20"
            />
            <p className="text-xs text-gray-500 mt-1">Guide the demographic diversity of personas</p>
          </div>

          {/* Insights Goal */}
          <div>
            <Label htmlFor="insights" className="text-sm font-medium">Research/Insights Goal</Label>
            <Textarea
              id="insights"
              placeholder="e.g., Understanding patient journey, identifying unmet needs, improving treatment outcomes..."
              value={userConfig.insightsGoal}
              onChange={(e) => setUserConfig({...userConfig, insightsGoal: e.target.value})}
              className="mt-1 h-20"
            />
            <p className="text-xs text-gray-500 mt-1">What insights are you trying to gain?</p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between pt-4 border-t">
        <Button variant="outline" onClick={() => setCurrentStep('select')}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back to Selection
        </Button>
        <Button 
          onClick={handleStartImport}
          className="bg-gradient-to-r from-green-600 to-emerald-600"
        >
          <Download className="h-4 w-4 mr-2" />
          Generate {userConfig.maxPersonas} Personas
        </Button>
      </div>
    </div>
  )

  const renderImportStep = () => (
    <div className="text-center py-8">
      <div className="relative inline-block mb-6">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full blur-xl opacity-30 animate-pulse"></div>
        <div className="relative p-4 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full">
          <Download className="h-8 w-8 text-white" />
        </div>
      </div>
      <h3 className="text-xl font-semibold mb-2">Generating Personas from CRM Data</h3>
      <p className="text-gray-600 mb-6">
        Processing {selectedProfiles.length} HCP profiles and their patient populations...
      </p>
      
      {/* Progress Bar */}
      <div className="max-w-sm mx-auto mb-6">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Progress</span>
          <span>{Math.round(importProgress)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${importProgress}%` }}
          />
        </div>
      </div>

      {/* Processing Steps */}
      <div className="space-y-2 text-sm text-gray-500 max-w-md mx-auto">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-green-500" />
          Analyzing HCP interaction patterns
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-green-500" />
          Processing patient demographics
        </div>
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-purple-500" />
          Generating AI-powered personas...
        </div>
      </div>
    </div>
  )

  const renderCompleteStep = () => (
    <div className="text-center py-8">
      <div className="relative inline-block mb-6">
        <div className="absolute inset-0 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full blur-xl opacity-30"></div>
        <div className="relative p-4 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full">
          <CheckCircle className="h-8 w-8 text-white" />
        </div>
      </div>
      <h3 className="text-xl font-semibold mb-2">Import Complete!</h3>
      <p className="text-gray-600 mb-6">
        Successfully generated {selectedProfiles.length} personas from Veeva CRM data
      </p>
      
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-medium text-gray-900">HCP Profiles Processed</p>
            <p className="text-gray-600">{selectedProfiles.length}</p>
          </div>
          <div>
            <p className="font-medium text-gray-900">Personas Generated</p>
            <p className="text-gray-600">{selectedProfiles.length}</p>
          </div>
        </div>
      </div>

      <Button onClick={() => {
        setIsOpen(false);
        onImportComplete?.(null);
      }} className="mr-2">
        View Personas
      </Button>
      <Button variant="outline" onClick={resetImporter}>
        Import More
      </Button>
    </div>
  )

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      console.log('Dialog onOpenChange:', open);
      setIsOpen(open);
      if (!open) {
        setTimeout(resetImporter, 300);
      }
    }}>
      <DialogTrigger asChild>
        {trigger ? (
          <div onClick={(e) => {
            console.log('Trigger clicked');
            e.preventDefault();
            setIsOpen(true);
          }}>
            {trigger}
          </div>
        ) : (
          <Button variant="outline" className="gap-2" onClick={() => {
            console.log('Default trigger clicked');
            setIsOpen(true);
          }}>
            <Database className="h-4 w-4" />
            Import from Veeva CRM
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-blue-600" />
            Veeva CRM Integration
          </DialogTitle>
          <DialogDescription>
            Import personas based on real HCP profiles and patient data from your Veeva CRM system
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          {currentStep === 'connect' && renderConnectionStep()}
          {currentStep === 'select' && renderSelectionStep()}
          {currentStep === 'configure' && renderConfigureStep()}
          {currentStep === 'import' && renderImportStep()}
          {currentStep === 'complete' && renderCompleteStep()}
        </div>

        {currentStep === 'select' && (
          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={loadHCPProfiles} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Refresh Data
              </Button>
              <Button 
                onClick={handleProceedToConfig} 
                disabled={selectedProfiles.length === 0}
                className="bg-gradient-to-r from-blue-600 to-indigo-600"
              >
                <Download className="h-4 w-4 mr-2" />
                Configure Generation ({selectedProfiles.length} selected)
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}