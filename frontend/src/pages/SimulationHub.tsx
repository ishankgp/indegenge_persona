import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { PlayCircle, Loader2, Users, Target, BarChart3, Settings } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

interface Persona {
  id: number;
  name: string;
  age: number;
  gender: string;
  condition: string;
  location: string;
}

const availableMetrics = [
  { id: 'purchase_intent', label: 'Purchase Intent', description: 'Likelihood to ask doctor (1-10)', icon: Target },
  { id: 'sentiment', label: 'Sentiment', description: 'Emotional response (-1 to 1)', icon: BarChart3 },
  { id: 'trust_in_brand', label: 'Trust in Brand', description: 'Brand trust impact (1-10)', icon: Target },
  { id: 'message_clarity', label: 'Message Clarity', description: 'Message understanding (1-10)', icon: Settings },
  { id: 'key_concern_flagged', label: 'Key Concern', description: 'Primary concern identified', icon: Users }
];

export function SimulationHub() {
  const navigate = useNavigate();
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [selectedPersonas, setSelectedPersonas] = useState<Set<number>>(new Set());
  const [selectedMetrics, setSelectedMetrics] = useState<Set<string>>(new Set(['purchase_intent', 'sentiment']));
  const [stimulusText, setStimulusText] = useState('');
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    fetchPersonas();
  }, []);

  const fetchPersonas = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/personas`);
      setPersonas(response.data);
    } catch (error) {
      console.error('Error fetching personas:', error);
    } finally {
      setLoading(false);
    }
  };

  const togglePersona = (id: number) => {
    const newSelected = new Set(selectedPersonas);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedPersonas(newSelected);
  };

  const toggleMetric = (id: string) => {
    const newSelected = new Set(selectedMetrics);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedMetrics(newSelected);
  };

  const handleRunAnalysis = async () => {
    if (selectedPersonas.size === 0) {
      alert('Please select at least one persona');
      return;
    }
    if (selectedMetrics.size === 0) {
      alert('Please select at least one metric');
      return;
    }
    if (!stimulusText.trim()) {
      alert('Please enter stimulus text');
      return;
    }

    setAnalyzing(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/cohorts/analyze`, {
        persona_ids: Array.from(selectedPersonas),
        stimulus_text: stimulusText,
        metrics: Array.from(selectedMetrics)
      });
      
      // Navigate to analytics page with results
      navigate('/analytics', { state: { analysisResults: response.data } });
    } catch (error) {
      console.error('Error running analysis:', error);
      alert('Error running analysis. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header Section */}
      <div className="gradient-bg text-white p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-white/20 rounded-xl">
                <PlayCircle className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-4xl font-bold">Simulation Hub</h1>
                <p className="text-blue-100 text-lg">
                  Test how your personas respond to marketing messages and stimuli
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">{selectedPersonas.size}</div>
              <div className="text-blue-100">Selected Personas</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-8 -mt-8">
        <div className="space-y-8">
          {/* Step 1: Select Cohort */}
          <Card className="stat-card">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-2xl">Step 1: Select Your Cohort</CardTitle>
                  <CardDescription className="text-base">
                    Choose the personas you want to include in this simulation
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-gray-600">Loading personas...</p>
                  </div>
                </div>
              ) : personas.length === 0 ? (
                <div className="text-center py-12">
                  <div className="p-4 bg-primary/10 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <Users className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No personas available</h3>
                  <p className="text-gray-600">Create some personas first in the Persona Library.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedPersonas(new Set(personas.map(p => p.id)))}
                      className="border-primary text-primary hover:bg-primary hover:text-white"
                    >
                      Select All
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedPersonas(new Set())}
                      className="border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      Clear All
                    </Button>
                    <span className="text-sm text-gray-600 font-medium">
                      {selectedPersonas.size} of {personas.length} selected
                    </span>
                  </div>
                  <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-200">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="p-3 text-left text-sm font-medium text-gray-700">Select</th>
                          <th className="p-3 text-left text-sm font-medium text-gray-700">Name</th>
                          <th className="p-3 text-left text-sm font-medium text-gray-700">Age</th>
                          <th className="p-3 text-left text-sm font-medium text-gray-700">Gender</th>
                          <th className="p-3 text-left text-sm font-medium text-gray-700">Condition</th>
                          <th className="p-3 text-left text-sm font-medium text-gray-700">Location</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {personas.map((persona) => (
                          <tr key={persona.id} className="hover:bg-gray-50 transition-colors">
                            <td className="p-3">
                              <Checkbox
                                checked={selectedPersonas.has(persona.id)}
                                onChange={() => togglePersona(persona.id)}
                                className="border-gray-300 text-primary focus:ring-primary"
                              />
                            </td>
                            <td className="p-3 text-sm font-medium text-gray-900">{persona.name}</td>
                            <td className="p-3 text-sm text-gray-600">{persona.age}</td>
                            <td className="p-3 text-sm text-gray-600">{persona.gender}</td>
                            <td className="p-3 text-sm text-gray-600">{persona.condition}</td>
                            <td className="p-3 text-sm text-gray-600">{persona.location}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Step 2: Configure Simulation */}
          <Card className="stat-card">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-secondary/10 rounded-lg">
                  <Settings className="h-6 w-6 text-secondary" />
                </div>
                <div>
                  <CardTitle className="text-2xl">Step 2: Configure Simulation</CardTitle>
                  <CardDescription className="text-base">
                    Enter your stimulus and select metrics to analyze
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="stimulus" className="text-sm font-medium text-gray-700">
                  Stimulus Text (Ad Copy / Message / Question)
                </Label>
                <Textarea
                  id="stimulus"
                  placeholder="Enter your marketing message, ad copy, or question here..."
                  value={stimulusText}
                  onChange={(e) => setStimulusText(e.target.value)}
                  rows={4}
                  className="border-gray-300 focus:border-primary focus:ring-primary"
                />
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-medium text-gray-700">Select Metrics to Analyze</Label>
                <div className="space-y-3 rounded-lg border border-gray-200 p-4 bg-gray-50">
                  {availableMetrics.map((metric) => {
                    const IconComponent = metric.icon;
                    return (
                      <div key={metric.id} className="flex items-start space-x-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-primary/50 transition-colors">
                        <Checkbox
                          id={metric.id}
                          checked={selectedMetrics.has(metric.id)}
                          onChange={() => toggleMetric(metric.id)}
                          className="border-gray-300 text-primary focus:ring-primary mt-1"
                        />
                        <div className="flex items-center space-x-2 flex-1">
                          <div className="p-1 bg-primary/10 rounded">
                            <IconComponent className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1">
                            <Label htmlFor={metric.id} className="font-medium text-gray-900">
                              {metric.label}
                            </Label>
                            <p className="text-sm text-gray-600">{metric.description}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <Button 
                className="w-full bg-gradient-to-r from-primary to-secondary text-white hover:shadow-lg transition-all duration-200 py-4 text-lg font-semibold" 
                size="lg"
                onClick={handleRunAnalysis}
                disabled={analyzing || selectedPersonas.size === 0 || !stimulusText.trim()}
              >
                {analyzing ? (
                  <>
                    <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                    Running Analysis...
                  </>
                ) : (
                  <>
                    <PlayCircle className="mr-3 h-5 w-5" />
                    Run Cohort Analysis
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
