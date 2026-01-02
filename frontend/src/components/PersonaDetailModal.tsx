"use client";

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import BrandInsightSelector from '@/components/BrandInsightSelector';
import type { BrandInsight, SuggestionResponse } from '@/components/BrandInsightSelector';
import { PersonasAPI } from '@/lib/api';
import { User, Heart, MapPin, Activity, Brain, MessageSquare, Target, Users, Calendar, Lightbulb, Shield, Radio, Quote } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import { PersonaDNA } from './PersonaDNA';

interface PersonaDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  persona: any;
}

export function PersonaDetailModal({ isOpen, onClose, persona }: PersonaDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editablePersona, setEditablePersona] = useState<any>({});
  const [selectedInsights, setSelectedInsights] = useState<BrandInsight[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestionResponse | null>(null);
  const [selectedBrandId, setSelectedBrandId] = useState<number | null>(null);
  const [targetSegment, setTargetSegment] = useState("");

  const resetPersonaState = () => {
    if (!persona) return;
    const rawData = persona.full_persona_json;
    try {
      const parsed = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
      setEditablePersona(parsed || {});
    } catch {
      setEditablePersona({});
    }
    setIsEditing(false);
  }

  useEffect(() => {
    if (!persona) return;
    resetPersonaState();
    setIsEditing(false);
    setSelectedInsights([]);
    setSuggestions(null);
  }, [persona]);

  if (!persona) return null;

  const personaData = editablePersona;
  const createdDate = persona.created_at 
    ? (() => {
        try {
          const date = new Date(persona.created_at);
          return isNaN(date.getTime()) ? 'N/A' : date.toLocaleDateString();
        } catch {
          return 'N/A';
        }
      })()
    : 'N/A';

  // Helper to extract value from enriched field structure
  const getEnrichedValue = (field: any): string[] | string => {
    if (!field) return [];
    if (Array.isArray(field)) return field;
    if (typeof field === 'object' && 'value' in field) {
      return field.value;
    }
    if (typeof field === 'string') return field;
    return [];
  }

  // Helper to extract evidence from enriched field
  const getEvidence = (field: any): string[] => {
    if (!field) return [];
    if (typeof field === 'object' && 'evidence' in field) {
      return Array.isArray(field.evidence) ? field.evidence : [];
    }
    return [];
  }

  const getMBTData = () => {
    if (personaData?.core?.mbt) {
      // Handle the nested structure from persona_engine.py
      const mbt = personaData.core.mbt;
      return {
        // Extract from motivation.top_outcomes or motivation.primary_motivation
        motivations: getEnrichedValue(mbt.motivation?.top_outcomes) ||
          [getEnrichedValue(mbt.motivation?.primary_motivation)].filter(Boolean),

        // Extract from beliefs.core_belief_statements
        beliefs: getEnrichedValue(mbt.beliefs?.core_belief_statements),

        // Extract from tension.sensitivity_points or tension.main_worry
        pain_points: getEnrichedValue(mbt.tension?.sensitivity_points) ||
          [getEnrichedValue(mbt.tension?.main_worry)].filter(Boolean),
      }
    } else if (personaData?.mbt) {
      // Handle legacy/flat MBT structure if it exists
      return {
        motivations: personaData.mbt.goals_motivations || personaData.mbt.motivations,
        beliefs: personaData.mbt.beliefs,
        pain_points: personaData.mbt.tensions_and_pain_points || personaData.mbt.pain_points,
      }
    }

    return {
      motivations: personaData?.motivations,
      beliefs: personaData?.beliefs,
      pain_points: personaData?.pain_points,
    }
  }

  const mbtData = getMBTData()

  // Get core enriched data
  const getCoreData = () => {
    const core = personaData?.core || {};
    return {
      decisionDrivers: core?.decision_drivers?.ranked_drivers || [],
      tieBreakers: getEnrichedValue(core?.decision_drivers?.tie_breakers),
      messagingWhatLands: getEnrichedValue(core?.messaging?.what_lands),
      messagingWhatLandsEvidence: getEvidence(core?.messaging?.what_lands),
      messagingWhatFails: getEnrichedValue(core?.messaging?.what_fails),
      messagingWhatFailsEvidence: getEvidence(core?.messaging?.what_fails),
      preferredVoice: getEnrichedValue(core?.messaging?.preferred_voice),
      objections: getEnrichedValue(core?.barriers_objections?.objections),
      objectionsEvidence: getEvidence(core?.barriers_objections?.objections),
      practicalBarriers: getEnrichedValue(core?.barriers_objections?.practical_barriers),
      practicalBarriersEvidence: getEvidence(core?.barriers_objections?.practical_barriers),
      perceptualBarriers: getEnrichedValue(core?.barriers_objections?.perceptual_barriers),
      perceptualBarriersEvidence: getEvidence(core?.barriers_objections?.perceptual_barriers),
      preferredSources: getEnrichedValue(core?.channel_behavior?.preferred_sources),
      preferredSourcesEvidence: getEvidence(core?.channel_behavior?.preferred_sources),
      engagementDepth: getEnrichedValue(core?.channel_behavior?.engagement_depth),
      visitBehavior: getEnrichedValue(core?.channel_behavior?.visit_behavior),
      digitalHabits: getEnrichedValue(core?.channel_behavior?.digital_habits),
    };
  }

  const coreData = getCoreData();

  // Component to display a list item with optional evidence tooltip
  const ListItemWithEvidence = ({ item, evidence, color = "bg-gray-500" }: { item: string; evidence?: string; color?: string }) => (
    <div className="flex items-start gap-2">
      <div className={`w-2 h-2 ${color} rounded-full mt-2 flex-shrink-0`}></div>
      <p className="text-base flex-1">{item}</p>
      {evidence && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="text-blue-500 hover:text-blue-700 flex-shrink-0">
                <Quote className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-sm">
              <p className="text-sm italic">"{evidence}"</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );

  const updateMbtField = (field: "motivations" | "beliefs" | "pain_points", value: string) => {
    const entries = value.split("\n").map(item => item.trim()).filter(Boolean)
    setEditablePersona((prev: any) => ({
      ...prev,
      [field]: entries
    }))
  }

  const mergeUnique = (base?: string[], additions?: string[]) => {
    return Array.from(new Set([...(additions || []), ...(base || [])])).filter(Boolean)
  }

  const appendInsights = () => {
    if (!selectedInsights.length) {
      alert("Select insights to append.")
      return
    }
    const motivations = selectedInsights.filter(i => i.type === "Motivation").map(i => i.text)
    const beliefs = selectedInsights.filter(i => i.type === "Belief").map(i => i.text)
    const tensions = selectedInsights.filter(i => i.type === "Tension").map(i => i.text)

    setEditablePersona((prev: any) => ({
      ...prev,
      motivations: mergeUnique(prev?.motivations, motivations),
      beliefs: mergeUnique(prev?.beliefs, beliefs),
      pain_points: mergeUnique(prev?.pain_points, tensions)
    }))
  }

  const applySuggestionSet = () => {
    if (!suggestions) {
      alert("Generate suggestions first.")
      return
    }
    setEditablePersona((prev: any) => ({
      ...prev,
      motivations: suggestions.motivations?.length ? suggestions.motivations : prev.motivations,
      beliefs: suggestions.beliefs?.length ? suggestions.beliefs : prev.beliefs,
      pain_points: suggestions.tensions?.length ? suggestions.tensions : prev.pain_points
    }))
  }

  const handleSaveChanges = async () => {
    setSaving(true)
    try {
      await PersonasAPI.update(persona.id, {
        full_persona_json: editablePersona
      })
      alert("Persona updated successfully.")
      setIsEditing(false)
    } catch (err) {
      console.error("Failed to save persona", err)
      alert("Failed to save persona changes.")
    } finally {
      setSaving(false)
    }
  }

  const handleBrandEnrich = async () => {
    if (!selectedBrandId) {
      alert("Select a brand to enrich.")
      return
    }
    setSaving(true)
    try {
      const response = await PersonasAPI.enrichFromBrand(persona.id, {
        brand_id: selectedBrandId,
        target_segment: targetSegment || undefined
      })
      const enrichedData = typeof response.full_persona_json === 'string'
        ? JSON.parse(response.full_persona_json)
        : response.full_persona_json
      setEditablePersona(enrichedData || {})
      alert("Persona enriched with brand insights.")
    } catch (err) {
      console.error("Brand enrichment failed", err)
      alert("Unable to enrich persona with brand data.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] p-0" style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="flex-shrink-0 p-6 pb-2">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-2xl">
              <div className="p-2 bg-primary/10 rounded-lg">
                <User className="h-6 w-6 text-primary" />
              </div>
              {persona.name || 'Unknown Persona'}
            </DialogTitle>
            <DialogDescription>
              Complete persona profile • Created on {createdDate}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            {isEditing ? (
              <>
                <Button variant="ghost" onClick={resetPersonaState}>
                  Cancel
                </Button>
                <Button onClick={handleSaveChanges} disabled={saving}>
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </>
            ) : (
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                Edit Persona
              </Button>
            )}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-6 pb-6">
          {isEditing && (
            <div className="border rounded-lg p-4 mb-4 space-y-4">
              <BrandInsightSelector
                selectionLimit={6}
                onSelectionChange={setSelectedInsights}
                onSuggestions={setSuggestions}
                onBrandChange={(id) => setSelectedBrandId(id)}
                onTargetSegmentChange={setTargetSegment}
              />
              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="outline" onClick={applySuggestionSet} disabled={!suggestions}>
                  Apply Suggestions
                </Button>
                <Button variant="outline" onClick={appendInsights} disabled={!selectedInsights.length}>
                  Append Selected
                </Button>
                <Button onClick={handleBrandEnrich} disabled={!selectedBrandId || saving}>
                  {saving ? "Enriching..." : "LLM Enrich"}
                </Button>
              </div>
            </div>
          )}
          <div className="space-y-6">
            <PersonaDNA
              baseAttributes={{
                age: persona.age,
                gender: persona.gender,
                location: persona.location,
                condition: persona.condition
              }}
              archetype={persona.persona_subtype}
              diseasePack={persona.disease_pack}
              brandName={selectedBrandId ? "Mounjaro" : null} // In a real app, fetch brand name
            />

            {/* Basic Information */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Age</label>
                  <p className="text-base">{persona.age || 'N/A'} years old</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Gender</label>
                  <p className="text-base">{persona.gender || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Location</label>
                  <p className="text-base flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-blue-600" />
                    {persona.location || 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Condition</label>
                  <p className="text-base flex items-center gap-1">
                    <Heart className="h-3 w-3 text-red-600" />
                    {persona.condition || 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Archetype</label>
                  <p className="text-base flex items-center gap-1">
                    <Users className="h-3 w-3 text-violet-600" />
                    {persona.persona_subtype || 'N/A'}
                  </p>
                </div>
                {persona.disease_pack && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Disease Pack</label>
                    <p className="text-base flex items-center gap-1">
                      <Heart className="h-3 w-3 text-blue-600" />
                      {persona.disease_pack}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Demographics */}
            {personaData.demographics && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    Demographics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {personaData.demographics.occupation && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Occupation</label>
                      <p className="text-base">{personaData.demographics.occupation}</p>
                    </div>
                  )}
                  {personaData.demographics.education && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Education</label>
                      <p className="text-base">{personaData.demographics.education}</p>
                    </div>
                  )}
                  {personaData.demographics.income && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Income</label>
                      <p className="text-base">{personaData.demographics.income}</p>
                    </div>
                  )}
                  {personaData.demographics.family_status && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Family Status</label>
                      <p className="text-base">{personaData.demographics.family_status}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Medical Background */}
            {personaData.medical_background && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" />
                    Medical Background
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {personaData.medical_background.diagnosis_date && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Diagnosis Date</label>
                      <p className="text-base">{personaData.medical_background.diagnosis_date}</p>
                    </div>
                  )}
                  {personaData.medical_background.current_medications && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Current Medications</label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {Array.isArray(personaData.medical_background.current_medications)
                          ? personaData.medical_background.current_medications.map((med: string, idx: number) => (
                            <Badge key={idx} variant="secondary">{med}</Badge>
                          ))
                          : <p className="text-base">{personaData.medical_background.current_medications}</p>
                        }
                      </div>
                    </div>
                  )}
                  {personaData.medical_background.treatment_history && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Treatment History</label>
                      <p className="text-base whitespace-pre-wrap">{personaData.medical_background.treatment_history}</p>
                    </div>
                  )}
                  {personaData.medical_background.comorbidities && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Comorbidities</label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {Array.isArray(personaData.medical_background.comorbidities)
                          ? personaData.medical_background.comorbidities.map((condition: string, idx: number) => (
                            <Badge key={idx} variant="outline">{condition}</Badge>
                          ))
                          : <p className="text-base">{personaData.medical_background.comorbidities}</p>
                        }
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Lifestyle and Values */}
            {personaData.lifestyle_and_values && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Brain className="h-4 w-4 text-primary" />
                    Lifestyle & Values
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {personaData.lifestyle_and_values.daily_routine && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Daily Routine</label>
                      <p className="text-base">{personaData.lifestyle_and_values.daily_routine}</p>
                    </div>
                  )}
                  {personaData.lifestyle_and_values.hobbies && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Hobbies & Interests</label>
                      <p className="text-base">{personaData.lifestyle_and_values.hobbies}</p>
                    </div>
                  )}
                  {personaData.lifestyle_and_values.health_beliefs && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Health Beliefs</label>
                      <p className="text-base">{personaData.lifestyle_and_values.health_beliefs}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Motivations */}
            {mbtData.motivations && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" />
                    Motivations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isEditing ? (
                    <Textarea
                      rows={5}
                      value={Array.isArray(personaData.motivations) ? personaData.motivations.join("\n") : ""}
                      onChange={(e) => updateMbtField("motivations", e.target.value)}
                      placeholder="One motivation per line"
                    />
                  ) : (
                    <div className="space-y-2">
                      {Array.isArray(mbtData.motivations)
                        ? mbtData.motivations.map((motivation: string, idx: number) => (
                          <div key={idx} className="flex items-start gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                            <p className="text-base">{motivation}</p>
                          </div>
                        ))
                        : typeof mbtData.motivations === 'string'
                        ? (
                          <div className="flex items-start gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                            <p className="text-base">{mbtData.motivations}</p>
                          </div>
                        )
                        : typeof mbtData.motivations === 'object' && mbtData.motivations !== null
                        ? Object.entries(mbtData.motivations).map(([key, value]) => (
                          <div key={key}>
                            <label className="text-sm font-medium text-gray-600 capitalize">
                              {key.replace(/_/g, ' ')}
                            </label>
                            <p className="text-base">{value as string}</p>
                          </div>
                        ))
                        : null
                      }
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Beliefs */}
            {mbtData.beliefs && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Brain className="h-4 w-4 text-primary" />
                    Beliefs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isEditing ? (
                    <Textarea
                      rows={5}
                      value={Array.isArray(personaData.beliefs) ? personaData.beliefs.join("\n") : ""}
                      onChange={(e) => updateMbtField("beliefs", e.target.value)}
                      placeholder="One belief per line"
                    />
                  ) : (
                    <div className="space-y-2">
                      {Array.isArray(mbtData.beliefs)
                        ? mbtData.beliefs.map((belief: string, idx: number) => (
                          <div key={idx} className="flex items-start gap-2">
                            <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                            <p className="text-base">{belief}</p>
                          </div>
                        ))
                        : typeof mbtData.beliefs === 'string'
                        ? (
                          <div className="flex items-start gap-2">
                            <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                            <p className="text-base">{mbtData.beliefs}</p>
                          </div>
                        )
                        : typeof mbtData.beliefs === 'object' && mbtData.beliefs !== null
                        ? Object.entries(mbtData.beliefs).map(([key, value]) => (
                          <div key={key}>
                            <label className="text-sm font-medium text-gray-600 capitalize">
                              {key.replace(/_/g, ' ')}
                            </label>
                            <p className="text-base">{value as string}</p>
                          </div>
                        ))
                        : null
                      }
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Pain Points */}
            {mbtData.pain_points && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" />
                    Pain Points
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isEditing ? (
                    <Textarea
                      rows={5}
                      value={Array.isArray(personaData.pain_points) ? personaData.pain_points.join("\n") : ""}
                      onChange={(e) => updateMbtField("pain_points", e.target.value)}
                      placeholder="One pain point per line"
                    />
                  ) : (
                    <div className="space-y-2">
                      {Array.isArray(mbtData.pain_points)
                        ? mbtData.pain_points.map((point: string, idx: number) => (
                          <div key={idx} className="flex items-start gap-2">
                            <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
                            <p className="text-base">{point}</p>
                          </div>
                        ))
                        : typeof mbtData.pain_points === 'string'
                        ? (
                          <div className="flex items-start gap-2">
                            <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
                            <p className="text-base">{mbtData.pain_points}</p>
                          </div>
                        )
                        : typeof mbtData.pain_points === 'object' && mbtData.pain_points !== null
                        ? Object.entries(mbtData.pain_points).map(([key, value]) => (
                          <div key={key}>
                            <label className="text-sm font-medium text-gray-600 capitalize">
                              {key.replace(/_/g, ' ')}
                            </label>
                            <p className="text-base">{value as string}</p>
                          </div>
                        ))
                        : null
                      }
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Decision Drivers */}
            {(coreData.decisionDrivers.length > 0 || (Array.isArray(coreData.tieBreakers) && coreData.tieBreakers.length > 0)) && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-primary" />
                    Decision Drivers
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {coreData.decisionDrivers.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-600">Ranked Factors</label>
                      {coreData.decisionDrivers.map((driver: any, idx: number) => (
                        <div key={idx} className="flex items-start gap-3 p-2 bg-gray-50 rounded-lg">
                          <Badge variant="outline" className="flex-shrink-0">#{driver.rank || idx + 1}</Badge>
                          <div>
                            <p className="font-medium">{driver.driver}</p>
                            {driver.detail && <p className="text-sm text-gray-600">{driver.detail}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {Array.isArray(coreData.tieBreakers) && coreData.tieBreakers.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-600">Tie Breakers</label>
                      {coreData.tieBreakers.map((tb: string, idx: number) => (
                        <ListItemWithEvidence key={idx} item={tb} color="bg-yellow-500" />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Messaging Hooks */}
            {((Array.isArray(coreData.messagingWhatLands) && coreData.messagingWhatLands.length > 0) ||
              (Array.isArray(coreData.messagingWhatFails) && coreData.messagingWhatFails.length > 0) ||
              coreData.preferredVoice) && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-primary" />
                      Messaging Hooks
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {Array.isArray(coreData.messagingWhatLands) && coreData.messagingWhatLands.length > 0 && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-green-700">✓ What Resonates</label>
                        {coreData.messagingWhatLands.map((item: string, idx: number) => (
                          <ListItemWithEvidence
                            key={idx}
                            item={item}
                            evidence={coreData.messagingWhatLandsEvidence[idx]}
                            color="bg-green-500"
                          />
                        ))}
                      </div>
                    )}
                    {Array.isArray(coreData.messagingWhatFails) && coreData.messagingWhatFails.length > 0 && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-red-700">✗ What Fails</label>
                        {coreData.messagingWhatFails.map((item: string, idx: number) => (
                          <ListItemWithEvidence
                            key={idx}
                            item={item}
                            evidence={coreData.messagingWhatFailsEvidence[idx]}
                            color="bg-red-500"
                          />
                        ))}
                      </div>
                    )}
                    {coreData.preferredVoice && (
                      <div>
                        <label className="text-sm font-medium text-gray-600">Preferred Voice/Tone</label>
                        <p className="text-base mt-1">{coreData.preferredVoice}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

            {/* Barriers & Objections */}
            {((Array.isArray(coreData.objections) && coreData.objections.length > 0) ||
              (Array.isArray(coreData.practicalBarriers) && coreData.practicalBarriers.length > 0) ||
              (Array.isArray(coreData.perceptualBarriers) && coreData.perceptualBarriers.length > 0)) && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Shield className="h-4 w-4 text-primary" />
                      Barriers & Objections
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {Array.isArray(coreData.objections) && coreData.objections.length > 0 && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-600">Direct Objections</label>
                        {coreData.objections.map((item: string, idx: number) => (
                          <ListItemWithEvidence
                            key={idx}
                            item={item}
                            evidence={coreData.objectionsEvidence[idx]}
                            color="bg-orange-500"
                          />
                        ))}
                      </div>
                    )}
                    {Array.isArray(coreData.practicalBarriers) && coreData.practicalBarriers.length > 0 && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-600">Practical Barriers</label>
                        <p className="text-xs text-gray-500 mb-1">Cost, access, time, insurance</p>
                        {coreData.practicalBarriers.map((item: string, idx: number) => (
                          <ListItemWithEvidence
                            key={idx}
                            item={item}
                            evidence={coreData.practicalBarriersEvidence[idx]}
                            color="bg-amber-500"
                          />
                        ))}
                      </div>
                    )}
                    {Array.isArray(coreData.perceptualBarriers) && coreData.perceptualBarriers.length > 0 && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-600">Perceptual Barriers</label>
                        <p className="text-xs text-gray-500 mb-1">Trust issues, skepticism, fears</p>
                        {coreData.perceptualBarriers.map((item: string, idx: number) => (
                          <ListItemWithEvidence
                            key={idx}
                            item={item}
                            evidence={coreData.perceptualBarriersEvidence[idx]}
                            color="bg-red-400"
                          />
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

            {/* Channel Behavior */}
            {((Array.isArray(coreData.preferredSources) && coreData.preferredSources.length > 0) ||
              coreData.engagementDepth ||
              coreData.visitBehavior ||
              coreData.digitalHabits) && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Radio className="h-4 w-4 text-primary" />
                      Channel Behavior
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {Array.isArray(coreData.preferredSources) && coreData.preferredSources.length > 0 && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-600">Preferred Information Sources</label>
                        {coreData.preferredSources.map((item: string, idx: number) => (
                          <ListItemWithEvidence
                            key={idx}
                            item={item}
                            evidence={coreData.preferredSourcesEvidence[idx]}
                            color="bg-blue-500"
                          />
                        ))}
                      </div>
                    )}
                    {coreData.engagementDepth && (
                      <div>
                        <label className="text-sm font-medium text-gray-600">Engagement Depth</label>
                        <p className="text-base mt-1">{coreData.engagementDepth}</p>
                      </div>
                    )}
                    {coreData.visitBehavior && (
                      <div>
                        <label className="text-sm font-medium text-gray-600">Visit Behavior</label>
                        <p className="text-base mt-1">{coreData.visitBehavior}</p>
                      </div>
                    )}
                    {coreData.digitalHabits && (
                      <div>
                        <label className="text-sm font-medium text-gray-600">Digital Habits</label>
                        <p className="text-base mt-1">{coreData.digitalHabits}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

            {/* Communication Preferences */}
            {personaData.communication_preferences && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-primary" />
                    Communication Preferences
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {personaData.communication_preferences.preferred_channels && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Preferred Channels</label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {Array.isArray(personaData.communication_preferences.preferred_channels)
                          ? personaData.communication_preferences.preferred_channels.map((channel: string, idx: number) => (
                            <Badge key={idx} variant="secondary">{channel}</Badge>
                          ))
                          : <p className="text-base">{personaData.communication_preferences.preferred_channels}</p>
                        }
                      </div>
                    </div>
                  )}
                  {personaData.communication_preferences.information_seeking_behavior && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Information Seeking Behavior</label>
                      <p className="text-base">{personaData.communication_preferences.information_seeking_behavior}</p>
                    </div>
                  )}
                  {personaData.communication_preferences.trust_factors && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Trust Factors</label>
                      <p className="text-base">{personaData.communication_preferences.trust_factors}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* HCP Professional Context */}
            {persona.persona_type === "HCP" && (persona.specialty || persona.practice_setup || persona.system_context || persona.decision_influencers) && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" />
                    Professional Context
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  {persona.specialty && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Specialty</label>
                      <p className="text-base">{persona.specialty}</p>
                    </div>
                  )}
                  {persona.practice_setup && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Practice Setup</label>
                      <p className="text-base">{persona.practice_setup}</p>
                    </div>
                  )}
                  {persona.system_context && (
                    <div className="col-span-2">
                      <label className="text-sm font-medium text-gray-600">System Context</label>
                      <p className="text-base">{persona.system_context}</p>
                    </div>
                  )}
                  {persona.decision_influencers && (
                    <div className="col-span-2">
                      <label className="text-sm font-medium text-gray-600">Decision Influencers</label>
                      <p className="text-base">{persona.decision_influencers}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Metadata */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  Metadata
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Persona ID</label>
                    <p className="text-base">#{persona.id}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Type</label>
                    <p className="text-base">{persona.persona_type || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Created</label>
                    <p className="text-base">{createdDate}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Status</label>
                    <Badge className="bg-green-100 text-green-800">Active</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
