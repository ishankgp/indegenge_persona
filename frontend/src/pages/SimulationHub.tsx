import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Users, 
  Sparkles, 
  Settings, 
  Search, 
  BarChart3, 
  Target, 
  Brain,
  Activity,
  Zap,
  Shield,
  MessageSquare,
  AlertCircle,
  PlayCircle,
  Award,
  Plus,
  CheckCircle2,
  Gauge,
  FileText,
  Loader2,
  ChevronRight
} from 'lucide-react';
import { Input } from '@/components/ui/input';

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
  { 
    id: 'purchase_intent', 
    label: 'Purchase Intent', 
    description: 'Likelihood to ask doctor about treatment', 
    icon: Target,
    color: 'text-violet-600',
    bgColor: 'bg-violet-100 dark:bg-violet-900/30'
  },
  { 
    id: 'sentiment', 
    label: 'Sentiment Analysis', 
    description: 'Emotional response to messaging', 
    icon: Brain,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30'
  },
  { 
    id: 'trust_in_brand', 
    label: 'Brand Trust', 
    description: 'Impact on brand perception', 
    icon: Shield,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30'
  },
  { 
    id: 'message_clarity', 
    label: 'Message Clarity', 
    description: 'Understanding of key messages', 
    icon: MessageSquare,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30'
  },
  { 
    id: 'key_concern_flagged', 
    label: 'Key Concerns', 
    description: 'Primary concerns identified', 
    icon: AlertCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-100 dark:bg-red-900/30'
  }
];

const sampleMessages = [
  "Introducing our new diabetes management solution with 24/7 glucose monitoring",
  "Experience relief from chronic pain with our breakthrough therapy",
  "Take control of your health journey with personalized treatment plans"
];

export function SimulationHub() {
  const navigate = useNavigate();
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [selectedPersonas, setSelectedPersonas] = useState<Set<number>>(new Set());
  const [selectedMetrics, setSelectedMetrics] = useState<Set<string>>(new Set(['purchase_intent', 'sentiment']));
  const [stimulusText, setStimulusText] = useState('');
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    fetchPersonas();
  }, []);

  useEffect(() => {
    if (analyzing) {
      const timer = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 200);
      return () => clearInterval(timer);
    } else {
      setProgress(0);
    }
  }, [analyzing]);

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
      
      setProgress(100);
      setTimeout(() => {
        navigate('/analytics', { state: { analysisResults: response.data } });
      }, 500);
    } catch (error) {
      console.error('Error running analysis:', error);
      alert('Error running analysis. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const filteredPersonas = personas.filter(persona => 
    persona.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    persona.condition.toLowerCase().includes(searchTerm.toLowerCase()) ||
    persona.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
                    <PlayCircle className="h-10 w-10 text-white" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-5xl font-bold text-white">Simulation Hub</h1>
                    <Badge className="bg-white/20 backdrop-blur-sm text-white border-white/30 px-3 py-1">
                      <Zap className="h-3 w-3 mr-1" />
                      Real-time Analysis
                    </Badge>
                  </div>
                  <p className="text-white/90 text-lg">
                    Test marketing messages with AI-powered persona simulations
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                  <div className="text-4xl font-bold text-white flex items-center gap-2">
                    <Activity className="h-8 w-8 text-yellow-300" />
                    {selectedPersonas.size}
                  </div>
                  <div className="text-white/80 text-sm mt-1">Selected Personas</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 -mt-8">
        {/* Progress Bar */}
        {analyzing && (
          <Card className="mb-6 border-0 shadow-xl backdrop-blur-sm bg-white/90 dark:bg-gray-900/90">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Running AI Analysis...</span>
                <span className="text-sm font-bold text-primary">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </CardContent>
          </Card>
        )}

        <div className="space-y-8">
          {/* Step 1: Select Cohort - Enhanced */}
          <Card className="border-0 shadow-2xl backdrop-blur-sm bg-white/90 dark:bg-gray-900/90 overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-violet-500/10 to-purple-500/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-violet-500 to-purple-500 rounded-xl blur-lg opacity-50"></div>
                    <div className="relative p-3 bg-gradient-to-br from-violet-500 to-purple-500 rounded-xl">
                      <Users className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-2xl">Step 1: Build Your Cohort</CardTitle>
                      <Badge variant="outline" className="border-violet-300 text-violet-700 dark:text-violet-300">
                        Required
                      </Badge>
                    </div>
                    <CardDescription className="text-base mt-1">
                      Select personas to include in your simulation cohort
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Award className="h-8 w-8 text-amber-500" />
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{selectedPersonas.size}</p>
                    <p className="text-xs text-gray-500">Selected</p>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {loading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : personas.length === 0 ? (
                <div className="text-center py-16">
                  <div className="relative inline-block">
                    <div className="absolute inset-0 bg-gradient-to-br from-violet-500 to-purple-500 rounded-full blur-2xl opacity-30"></div>
                    <div className="relative p-6 bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/30 rounded-full">
                      <Users className="h-12 w-12 text-violet-600 dark:text-violet-400" />
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-6 mb-2">No Personas Available</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">Create personas first to run simulations</p>
                  <Button 
                    className="bg-gradient-to-r from-violet-600 to-purple-600 text-white"
                    onClick={() => navigate('/personas')}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Personas
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Search and Action Bar */}
                  <div className="flex items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        type="text"
                        placeholder="Search personas by name, condition, or location..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedPersonas(new Set(filteredPersonas.map(p => p.id)))}
                        className="border-violet-300 text-violet-700 hover:bg-violet-50 dark:text-violet-300 dark:hover:bg-violet-900/30"
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Select All
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedPersonas(new Set())}
                        className="border-gray-300"
                      >
                        Clear All
                      </Button>
                    </div>
                  </div>

                  {/* Stats Bar */}
                  <div className="grid grid-cols-4 gap-3">
                    <div className="bg-gradient-to-r from-violet-50 to-violet-100 dark:from-violet-950/30 dark:to-violet-900/30 rounded-lg p-3">
                      <p className="text-xs text-violet-600 dark:text-violet-400">Total Available</p>
                      <p className="text-xl font-bold text-violet-900 dark:text-violet-100">{filteredPersonas.length}</p>
                    </div>
                    <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30 rounded-lg p-3">
                      <p className="text-xs text-blue-600 dark:text-blue-400">Selected</p>
                      <p className="text-xl font-bold text-blue-900 dark:text-blue-100">{selectedPersonas.size}</p>
                    </div>
                    <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 dark:from-emerald-950/30 dark:to-emerald-900/30 rounded-lg p-3">
                      <p className="text-xs text-emerald-600 dark:text-emerald-400">Coverage</p>
                      <p className="text-xl font-bold text-emerald-900 dark:text-emerald-100">
                        {filteredPersonas.length > 0 ? Math.round((selectedPersonas.size / filteredPersonas.length) * 100) : 0}%
                      </p>
                    </div>
                    <div className="bg-gradient-to-r from-amber-50 to-amber-100 dark:from-amber-950/30 dark:to-amber-900/30 rounded-lg p-3">
                      <p className="text-xs text-amber-600 dark:text-amber-400">Conditions</p>
                      <p className="text-xl font-bold text-amber-900 dark:text-amber-100">
                        {new Set(filteredPersonas.filter(p => selectedPersonas.has(p.id)).map(p => p.condition)).size}
                      </p>
                    </div>
                  </div>

                  {/* Personas Table */}
                  <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="max-h-96 overflow-y-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0 z-10">
                          <tr>
                            <th className="p-4 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                              <Checkbox
                                checked={filteredPersonas.length > 0 && filteredPersonas.every(p => selectedPersonas.has(p.id))}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedPersonas(new Set(filteredPersonas.map(p => p.id)));
                                  } else {
                                    setSelectedPersonas(new Set());
                                  }
                                }}
                              />
                            </th>
                            <th className="p-4 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Name</th>
                            <th className="p-4 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Age</th>
                            <th className="p-4 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Gender</th>
                            <th className="p-4 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Condition</th>
                            <th className="p-4 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Location</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {filteredPersonas.map((persona) => (
                            <tr 
                              key={persona.id} 
                              className={`hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer ${
                                selectedPersonas.has(persona.id) ? 'bg-violet-50 dark:bg-violet-900/20' : ''
                              }`}
                              onClick={() => togglePersona(persona.id)}
                            >
                              <td className="p-4">
                                <Checkbox
                                  checked={selectedPersonas.has(persona.id)}
                                  onChange={() => togglePersona(persona.id)}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </td>
                              <td className="p-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-xs font-bold">
                                    {persona.name.charAt(0)}
                                  </div>
                                  <span className="font-medium text-gray-900 dark:text-gray-100">{persona.name}</span>
                                </div>
                              </td>
                              <td className="p-4 text-sm text-gray-600 dark:text-gray-400">{persona.age}</td>
                              <td className="p-4 text-sm text-gray-600 dark:text-gray-400">{persona.gender}</td>
                              <td className="p-4">
                                <Badge variant="outline" className="text-xs">
                                  {persona.condition}
                                </Badge>
                              </td>
                              <td className="p-4 text-sm text-gray-600 dark:text-gray-400">{persona.location}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Step 2: Configure Simulation - Enhanced */}
          <Card className="border-0 shadow-2xl backdrop-blur-sm bg-white/90 dark:bg-gray-900/90 overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl blur-lg opacity-50"></div>
                    <div className="relative p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl">
                      <Settings className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-2xl">Step 2: Configure Analysis</CardTitle>
                      <Badge variant="outline" className="border-blue-300 text-blue-700 dark:text-blue-300">
                        Customize
                      </Badge>
                    </div>
                    <CardDescription className="text-base mt-1">
                      Enter your message and select metrics to analyze
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Gauge className="h-8 w-8 text-blue-500" />
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{selectedMetrics.size}</p>
                    <p className="text-xs text-gray-500">Metrics</p>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              {/* Stimulus Text Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="stimulus" className="text-base font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-gray-500" />
                    Marketing Message / Stimulus Text
                  </Label>
                  <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">
                    <Sparkles className="h-3 w-3 mr-1" />
                    AI Analysis
                  </Badge>
                </div>
                <Textarea
                  id="stimulus"
                  placeholder="Enter your marketing message, ad copy, or clinical communication here..."
                  value={stimulusText}
                  onChange={(e) => setStimulusText(e.target.value)}
                  rows={5}
                  className="resize-none font-medium"
                />
                <div className="flex gap-2">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Try a sample:</p>
                  {sampleMessages.map((message, index) => (
                    <Button
                      key={index}
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      onClick={() => setStimulusText(message)}
                    >
                      Sample {index + 1}
                    </Button>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Metrics Selection */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-gray-500" />
                    Analysis Metrics
                  </Label>
                  <span className="text-sm text-gray-500">
                    {selectedMetrics.size} of {availableMetrics.length} selected
                  </span>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {availableMetrics.map((metric) => {
                    const isSelected = selectedMetrics.has(metric.id);
                    return (
                      <div 
                        key={metric.id} 
                        className={`relative rounded-xl border-2 transition-all cursor-pointer ${
                          isSelected 
                            ? 'border-primary bg-gradient-to-r from-primary/5 to-secondary/5' 
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                        onClick={() => toggleMetric(metric.id)}
                      >
                        <div className="p-4">
                          <div className="flex items-start space-x-3">
                            <Checkbox
                              checked={isSelected}
                              onChange={() => toggleMetric(metric.id)}
                              onClick={(e) => e.stopPropagation()}
                              className="mt-1"
                            />
                            <div className={`p-2 rounded-lg ${metric.bgColor}`}>
                              <metric.icon className={`h-4 w-4 ${metric.color}`} />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900 dark:text-gray-100">
                                  {metric.label}
                                </span>
                                {isSelected && (
                                  <CheckCircle2 className="h-4 w-4 text-primary" />
                                )}
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                {metric.description}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <Separator />

              {/* Summary */}
              <div className="bg-gradient-to-r from-primary/5 to-secondary/5 rounded-xl p-6">
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <Brain className="h-5 w-5 text-primary" />
                  Simulation Summary
                </h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Personas</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{selectedPersonas.size}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Metrics</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{selectedMetrics.size}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Est. Time</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-gray-100">~{Math.max(1, Math.round(selectedPersonas.size * 0.5))}s</p>
                  </div>
                </div>
              </div>

              {/* Run Button */}
              <Button 
                className="w-full bg-gradient-to-r from-primary to-secondary text-white hover:shadow-2xl transition-all duration-200 py-6 text-lg font-semibold group" 
                size="lg"
                onClick={handleRunAnalysis}
                disabled={analyzing || selectedPersonas.size === 0 || !stimulusText.trim() || selectedMetrics.size === 0}
              >
                {analyzing ? (
                  <>
                    <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                    Running AI Analysis... {progress}%
                  </>
                ) : (
                  <>
                    <PlayCircle className="mr-3 h-5 w-5 group-hover:scale-110 transition-transform" />
                    Run Cohort Simulation
                    <ChevronRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
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