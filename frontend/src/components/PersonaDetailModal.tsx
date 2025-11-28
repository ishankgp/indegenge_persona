"use client";

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import BrandInsightSelector from '@/components/BrandInsightSelector';
import type { BrandInsight, SuggestionResponse } from '@/components/BrandInsightSelector';
import { PersonasAPI } from '@/lib/api';
import { User, Heart, MapPin, Activity, Brain, MessageSquare, Target, Users, Calendar } from 'lucide-react';

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
    try {
      setEditablePersona(JSON.parse(persona.full_persona_json));
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
  const createdDate = new Date(persona.created_at).toLocaleDateString();

  const getMBTData = () => {
    if (personaData?.mbt) {
      return {
        motivations: personaData.mbt.goals_motivations,
        beliefs: personaData.mbt.beliefs,
        pain_points: personaData.mbt.tensions_and_pain_points,
      }
    }

    return {
      motivations: personaData?.motivations,
      beliefs: personaData?.beliefs,
      pain_points: personaData?.pain_points,
    }
  }

  const mbtData = getMBTData()

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
      setEditablePersona(JSON.parse(response.full_persona_json))
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-2xl">
            <div className="p-2 bg-primary/10 rounded-lg">
              <User className="h-6 w-6 text-primary" />
            </div>
            {persona.name}
          </DialogTitle>
          <DialogDescription>
            Complete persona profile • Created on {createdDate}
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2 mb-4">
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

        <ScrollArea className="h-[calc(90vh-120px)] pr-4">
          <div className="space-y-6">
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
                  <p className="text-base">{persona.age} years old</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Gender</label>
                  <p className="text-base">{persona.gender}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Location</label>
                  <p className="text-base flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-blue-600" />
                    {persona.location}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Condition</label>
                  <p className="text-base flex items-center gap-1">
                    <Heart className="h-3 w-3 text-red-600" />
                    {persona.condition}
                  </p>
                </div>
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
                        : Object.entries(mbtData.motivations).map(([key, value]) => (
                          <div key={key}>
                            <label className="text-sm font-medium text-gray-600 capitalize">
                              {key.replace(/_/g, ' ')}
                            </label>
                            <p className="text-base">{value as string}</p>
                          </div>
                        ))
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
                        : Object.entries(mbtData.beliefs).map(([key, value]) => (
                          <div key={key}>
                            <label className="text-sm font-medium text-gray-600 capitalize">
                              {key.replace(/_/g, ' ')}
                            </label>
                            <p className="text-base">{value as string}</p>
                          </div>
                        ))
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
                        : Object.entries(mbtData.pain_points).map(([key, value]) => (
                          <div key={key}>
                            <label className="text-sm font-medium text-gray-600 capitalize">
                              {key.replace(/_/g, ' ')}
                            </label>
                            <p className="text-base">{value as string}</p>
                          </div>
                        ))
                      }
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
                    <p className="text-base">{persona.persona_type}</p>
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
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
