import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { User, Heart, MapPin, Activity, Brain, MessageSquare, Target, Users, Calendar } from 'lucide-react';

interface PersonaDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  persona: any;
}

export function PersonaDetailModal({ isOpen, onClose, persona }: PersonaDetailModalProps) {
  if (!persona) return null;

  const personaData = JSON.parse(persona.full_persona_json);
  const createdDate = new Date(persona.created_at).toLocaleDateString();

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

            {/* Pain Points */}
            {personaData.pain_points && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" />
                    Pain Points
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Array.isArray(personaData.pain_points) 
                      ? personaData.pain_points.map((point: string, idx: number) => (
                          <div key={idx} className="flex items-start gap-2">
                            <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
                            <p className="text-base">{point}</p>
                          </div>
                        ))
                      : Object.entries(personaData.pain_points).map(([key, value]) => (
                          <div key={key}>
                            <label className="text-sm font-medium text-gray-600 capitalize">
                              {key.replace(/_/g, ' ')}
                            </label>
                            <p className="text-base">{value as string}</p>
                          </div>
                        ))
                    }
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Motivations */}
            {personaData.motivations && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" />
                    Motivations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Array.isArray(personaData.motivations)
                      ? personaData.motivations.map((motivation: string, idx: number) => (
                          <div key={idx} className="flex items-start gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                            <p className="text-base">{motivation}</p>
                          </div>
                        ))
                      : Object.entries(personaData.motivations).map(([key, value]) => (
                          <div key={key}>
                            <label className="text-sm font-medium text-gray-600 capitalize">
                              {key.replace(/_/g, ' ')}
                            </label>
                            <p className="text-base">{value as string}</p>
                          </div>
                        ))
                    }
                  </div>
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

            {/* Raw JSON (for debugging) */}
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
