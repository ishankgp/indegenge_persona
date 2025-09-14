import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import MetricCard from '@/components/analytics/MetricCard';
import { computeScoreColor, computeScoreProgress, getSentimentDescriptor } from '@/lib/analytics';
import type { AnalysisResults, AnalyzedMetricKey, IndividualResponseRow } from '@/types/analytics';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Users, 
  Target, 
  Brain, 
  MessageSquare, 
  Activity,
  BarChart3,
  Sparkles,
  Award,
  AlertTriangle,
  CheckCircle,
  Download,
  Share2,
  Filter,
  Clock,
  Gauge,
  Lightbulb,
  PlayCircle,
  Save,
  Trash2,
  Loader2,
  History,
  Shield
} from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { SavedSimulationsAPI, type SavedSimulation } from '@/lib/api';

export function Analytics() {
  const location = useLocation();
  const navigate = useNavigate();
  const [analysisResults, setAnalysisResults] = useState<AnalysisResults | undefined>(location.state?.analysisResults);
  
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [simulationName, setSimulationName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [savedSimulations, setSavedSimulations] = useState<SavedSimulation[]>([]);
  const [isLoadingSaved, setIsLoadingSaved] = useState(true);
  const [selectedSimulation, setSelectedSimulation] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    if (!analysisResults) {
      fetchSavedSimulations();
    }
  }, [analysisResults]);

  const fetchSavedSimulations = async () => {
    setIsLoadingSaved(true);
    try {
      const response = await SavedSimulationsAPI.list();
      setSavedSimulations(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Failed to fetch saved simulations", error);
      toast({
        title: "Error",
        description: "Could not load saved simulations.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingSaved(false);
    }
  };

  const handleSaveSimulation = async () => {
    if (!simulationName || !analysisResults) return;
    setIsSaving(true);
    try {
      await SavedSimulationsAPI.save({
        name: simulationName,
        simulation_data: analysisResults,
      });
      toast({
        title: "Success!",
        description: `Simulation "${simulationName}" has been saved.`,
      });
      setIsSaveDialogOpen(false);
      setSimulationName('');
      fetchSavedSimulations(); // Refresh the list of saved simulations
    } catch (error) {
      console.error("Failed to save simulation", error);
      toast({
        title: "Error",
        description: "Could not save the simulation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadSimulation = async () => {
    if (!selectedSimulation) return;
    setIsLoading(true);
    try {
      const response = await SavedSimulationsAPI.get(Number(selectedSimulation));
      setAnalysisResults(response.data.simulation_data);
      toast({
        title: "Success!",
        description: `Loaded simulation: ${response.data.name}`,
      });
    } catch (error) {
      console.error("Failed to load simulation", error);
      toast({
        title: "Error",
        description: "Could not load the selected simulation.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSimulation = async (id: number) => {
    try {
      await SavedSimulationsAPI.delete(id);
      toast({
        title: "Deleted",
        description: "The saved simulation has been removed.",
      });
      fetchSavedSimulations(); // Refresh the list
    } catch (error) {
      console.error("Failed to delete simulation", error);
      toast({
        title: "Error",
        description: "Could not delete the simulation.",
        variant: "destructive",
      });
    }
  };

  console.log('📊 Analytics page loaded:', {
    hasLocationState: !!location.state,
    hasAnalysisResults: !!analysisResults,
    analysisResultsKeys: analysisResults ? Object.keys(analysisResults) : null,
    cohortSize: analysisResults?.cohort_size,
    individualResponsesCount: analysisResults?.individual_responses?.length
  });

  if (!analysisResults) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-violet-50 dark:from-gray-950 dark:via-gray-900 dark:to-violet-950">
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-secondary">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-20 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-0 right-20 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse animation-delay-2000"></div>
          </div>

          <div className="relative z-10 px-8 py-12">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center space-x-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-white/20 rounded-2xl blur-xl"></div>
                  <div className="relative p-4 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20">
                    <Activity className="h-10 w-10 text-white" />
                  </div>
                </div>
                <div>
                  <h1 className="text-5xl font-bold text-white">Analytics Dashboard</h1>
                  <p className="text-white/90 text-lg mt-2">
                    View and analyze cohort simulation results
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Empty State */}
        <div className="max-w-7xl mx-auto px-8 py-12">
          <Card className="border-0 shadow-2xl backdrop-blur-sm bg-white/90 dark:bg-gray-900/90">
            <CardContent className="py-20 text-center">
              <div className="relative inline-block">
                <div className="absolute inset-0 bg-gradient-to-br from-primary to-secondary rounded-full blur-2xl opacity-30"></div>
                <div className="relative p-6 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-full">
                  <BarChart3 className="h-12 w-12 text-primary" />
                </div>
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mt-6 mb-2">
                No Analysis Results Available
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                Run a simulation from the Simulation Hub or load a previously saved result.
              </p>
              <div className="flex justify-center gap-4">
                <Button 
                  size="lg"
                  className="bg-gradient-to-r from-primary to-secondary text-white hover:shadow-xl transition-all duration-200"
                  onClick={() => navigate('/simulation')}
                >
                  <Activity className="mr-2 h-5 w-5" />
                  Go to Simulation Hub
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Load Saved Simulations */}
          <Card className="mt-8 border-0 shadow-2xl backdrop-blur-sm bg-white/90 dark:bg-gray-900/90">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <History className="h-6 w-6 text-primary" />
                <div>
                  <CardTitle>Load Saved Simulation</CardTitle>
                  <CardDescription>Review results from a previous run.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingSaved ? (
                <div className="flex items-center justify-center h-24">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : savedSimulations.length > 0 ? (
                <div className="flex gap-4">
                  <Select onValueChange={setSelectedSimulation} value={selectedSimulation}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a saved simulation..." />
                    </SelectTrigger>
                    <SelectContent>
                      {savedSimulations.map((sim) => (
                        <SelectItem key={sim.id} value={String(sim.id)}>
                          {sim.name} (Saved: {new Date(sim.created_at).toLocaleDateString()})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={handleLoadSimulation} disabled={!selectedSimulation || isLoading}>
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Load"}
                  </Button>
                  {selectedSimulation && (
                     <Button 
                        variant="destructive" 
                        size="icon" 
                        onClick={() => handleDeleteSimulation(Number(selectedSimulation))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                  )}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">No saved simulations found.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Extract data from results
  const {
    cohort_size,
    stimulus_text,
    metrics_analyzed,
    individual_responses,
    summary_statistics,
    insights,
    preamble,
    created_at
  } = analysisResults;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-violet-50 dark:from-gray-950 dark:via-gray-900 dark:to-violet-950">
      {/* Enhanced Header Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-secondary">
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
                    <Activity className="h-10 w-10 text-white" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-5xl font-bold text-white">Analytics Dashboard</h1>
                    <Badge className="bg-white/20 backdrop-blur-sm text-white border-white/30 px-3 py-1">
                      <Sparkles className="h-3 w-3 mr-1" />
                      Live Results
                    </Badge>
                  </div>
                  <p className="text-white/90 text-lg">
                    Comprehensive analysis for {cohort_size} personas
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="secondary" className="bg-white/20 backdrop-blur-sm text-white border-white/30 hover:bg-white/30">
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Save Simulation</DialogTitle>
                      <DialogDescription>
                        Enter a name for this simulation run to save it for later.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">
                          Name
                        </Label>
                        <Input
                          id="name"
                          value={simulationName}
                          onChange={(e) => setSimulationName(e.target.value)}
                          className="col-span-3"
                          placeholder="e.g., Q3 Campaign Test"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={handleSaveSimulation} disabled={isSaving || !simulationName}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Save
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <Button variant="secondary" className="bg-white/20 backdrop-blur-sm text-white border-white/30 hover:bg-white/30">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
                <Button variant="secondary" className="bg-white/20 backdrop-blur-sm text-white border-white/30 hover:bg-white/30">
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
              </div>
            </div>
            
            {/* Quick Stats Bar */}
            <div className="grid grid-cols-4 gap-4 mt-8">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/70 text-sm">Completed</p>
                    <p className="text-2xl font-bold text-white">{new Date(created_at).toLocaleTimeString()}</p>
                  </div>
                  <Clock className="h-8 w-8 text-white/50" />
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/70 text-sm">Cohort Size</p>
                    <p className="text-2xl font-bold text-white">{cohort_size}</p>
                  </div>
                  <Users className="h-8 w-8 text-white/50" />
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/70 text-sm">Metrics</p>
                    <p className="text-2xl font-bold text-white">{metrics_analyzed.length}</p>
                  </div>
                  <Gauge className="h-8 w-8 text-white/50" />
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/70 text-sm">Insights</p>
                    <p className="text-2xl font-bold text-white">{insights?.length || 0}</p>
                  </div>
                  <Lightbulb className="h-8 w-8 text-white/50" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 -mt-8">
        {/* Tool Preamble - Analysis Plan */}
        {preamble && (
          <Card className="mb-8 border-0 shadow-2xl backdrop-blur-sm bg-white/90 dark:bg-gray-900/90">
            <CardHeader className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl" />
                  <div>
                    <CardTitle className="text-xl">Analysis Plan</CardTitle>
                    <CardDescription>Generated by AI preamble</CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
                {preamble}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stimulus Card - Enhanced */}
        <Card className="mb-8 border-0 shadow-2xl backdrop-blur-sm bg-white/90 dark:bg-gray-900/90">
          <CardHeader className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-t-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-gradient-to-br from-primary to-secondary rounded-xl">
                  <MessageSquare className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl">Analyzed Stimulus</CardTitle>
                  <CardDescription>Marketing message tested across cohort</CardDescription>
                </div>
              </div>
              <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">
                <Brain className="h-3 w-3 mr-1" />
                AI Analyzed
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <blockquote className="border-l-4 border-primary pl-6 py-2 mb-6">
              <p className="text-lg text-gray-700 dark:text-gray-300 italic">"{stimulus_text}"</p>
            </blockquote>
            <div className="flex flex-wrap gap-2">
              {metrics_analyzed.map((metric: AnalyzedMetricKey) => (
                <Badge key={metric} variant="outline" className="px-3 py-1">
                  <CheckCircle className="h-3 w-3 mr-1 text-emerald-500" />
                  {metric.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Key Metrics Grid - Enhanced */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          {summary_statistics.purchase_intent_avg !== undefined && (
            <MetricCard
              title="Average Purchase Intent"
              value={summary_statistics.purchase_intent_avg.toFixed(1)}
              subtitle="Scale of 1-10"
              icon={Target}
              trend={summary_statistics.purchase_intent_avg > 5 ? 'up' : 'down'}
              color="primary"
            />
          )}
          {summary_statistics.sentiment_avg !== undefined && (
            <MetricCard
              title="Average Sentiment"
              value={
                <div className="flex items-center gap-2">
                  {(() => {
                    const d = getSentimentDescriptor(summary_statistics.sentiment_avg);
                    return (
                      <span className={d.color}>
                        {summary_statistics.sentiment_avg.toFixed(2)}
                      </span>
                    );
                  })()}
                  {(() => {
                    const d = getSentimentDescriptor(summary_statistics.sentiment_avg);
                    if (d.iconTone === 'up') return <TrendingUp className="h-4 w-4 text-emerald-500" />;
                    if (d.iconTone === 'down') return <TrendingDown className="h-4 w-4 text-red-500" />;
                    return <Minus className="h-4 w-4 text-gray-500" />;
                  })()}
                </div>
              }
              subtitle="Scale of -1 to 1"
              icon={Brain}
              color="secondary"
            />
          )}
          {summary_statistics.trust_in_brand_avg !== undefined && (
            <MetricCard
              title="Average Brand Trust"
              value={summary_statistics.trust_in_brand_avg.toFixed(1)}
              subtitle="Scale of 1-10"
              icon={Shield}
              trend={summary_statistics.trust_in_brand_avg > 5 ? 'up' : 'down'}
              color="success"
            />
          )}
          {summary_statistics.message_clarity_avg !== undefined && (
            <MetricCard
              title="Message Clarity"
              value={summary_statistics.message_clarity_avg.toFixed(1)}
              subtitle="Scale of 1-10"
              icon={MessageSquare}
              trend={summary_statistics.message_clarity_avg > 7 ? 'up' : 'neutral'}
              color="warning"
            />
          )}
        </div>

        {/* AI Insights - Enhanced */}
        {insights && insights.length > 0 && (
          <Card className="mb-8 border-0 shadow-2xl backdrop-blur-sm bg-white/90 dark:bg-gray-900/90">
            <CardHeader className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl">
                    <Lightbulb className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Cumulative Insights</CardTitle>
                    <CardDescription>Key findings and recommendations from the cohort analysis</CardDescription>
                  </div>
                </div>
                <Award className="h-8 w-8 text-amber-500" />
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid gap-4 md:grid-cols-2">
                {insights.map((insight: string, index: number) => (
                  <div key={index} className="relative p-4 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-xl border border-primary/20">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center text-white text-sm font-bold">
                        {index + 1}
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{insight}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Individual Responses - Enhanced Table */}
        <Card className="border-0 shadow-2xl backdrop-blur-sm bg-white/90 dark:bg-gray-900/90">
          <CardHeader className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-t-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-gradient-to-br from-primary to-secondary rounded-xl">
                  <Users className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl">Individual Persona Responses</CardTitle>
                  <CardDescription>Detailed breakdown by persona</CardDescription>
                </div>
              </div>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="p-4 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Persona</th>
                    <th className="p-4 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Reasoning</th>
                    {metrics_analyzed.includes('purchase_intent') && (
                      <th className="p-4 text-center text-sm font-medium text-gray-700 dark:text-gray-300">
                        <div className="flex items-center justify-center gap-1">
                          <Target className="h-4 w-4" />
                          Intent
                        </div>
                      </th>
                    )}
                    {metrics_analyzed.includes('sentiment') && (
                      <th className="p-4 text-center text-sm font-medium text-gray-700 dark:text-gray-300">
                        <div className="flex items-center justify-center gap-1">
                          <Brain className="h-4 w-4" />
                          Sentiment
                        </div>
                      </th>
                    )}
                    {metrics_analyzed.includes('trust_in_brand') && (
                      <th className="p-4 text-center text-sm font-medium text-gray-700 dark:text-gray-300">
                        <div className="flex items-center justify-center gap-1">
                          <Shield className="h-4 w-4" />
                          Trust
                        </div>
                      </th>
                    )}
                    {metrics_analyzed.includes('message_clarity') && (
                      <th className="p-4 text-center text-sm font-medium text-gray-700 dark:text-gray-300">
                        <div className="flex items-center justify-center gap-1">
                          <MessageSquare className="h-4 w-4" />
                          Clarity
                        </div>
                      </th>
                    )}
                    {metrics_analyzed.includes('key_concern_flagged') && (
                      <th className="p-4 text-center text-sm font-medium text-gray-700 dark:text-gray-300">
                        <div className="flex items-center justify-center gap-1">
                          <AlertTriangle className="h-4 w-4" />
                          Concern
                        </div>
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {individual_responses.map((response: IndividualResponseRow, index: number) => (
                    <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold">
                            {response.persona_name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 dark:text-gray-100">{response.persona_name}</div>
                            <div className="text-xs text-gray-500">ID: {response.persona_id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 max-w-md">
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{response.reasoning}</p>
                      </td>
                      {metrics_analyzed.includes('purchase_intent') && (
                        <td className="p-4 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className={`text-lg font-bold ${computeScoreColor(response.responses.purchase_intent || 0)}`}>
                              {response.responses.purchase_intent}
                            </span>
                            <Progress 
                              value={computeScoreProgress(response.responses.purchase_intent || 0)} 
                              className="w-16 h-1.5"
                            />
                          </div>
                        </td>
                      )}
                      {metrics_analyzed.includes('sentiment') && (
                        <td className="p-4 text-center">
                          {(() => {
                            const d = getSentimentDescriptor(response.responses.sentiment || 0);
                            return (
                              <Badge className={d.badgeClassName}>
                                {d.level}
                              </Badge>
                            );
                          })()}
                          <div className="text-xs mt-1 text-gray-500">
                            {response.responses.sentiment?.toFixed(2)}
                          </div>
                        </td>
                      )}
                      {metrics_analyzed.includes('trust_in_brand') && (
                        <td className="p-4 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className={`text-lg font-bold ${computeScoreColor(response.responses.trust_in_brand || 0)}`}>
                              {response.responses.trust_in_brand}
                            </span>
                            <Progress 
                              value={computeScoreProgress(response.responses.trust_in_brand || 0)} 
                              className="w-16 h-1.5"
                            />
                          </div>
                        </td>
                      )}
                      {metrics_analyzed.includes('message_clarity') && (
                        <td className="p-4 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className={`text-lg font-bold ${computeScoreColor(response.responses.message_clarity || 0)}`}>
                              {response.responses.message_clarity}
                            </span>
                            <Progress 
                              value={computeScoreProgress(response.responses.message_clarity || 0)} 
                              className="w-16 h-1.5"
                            />
                          </div>
                        </td>
                      )}
                      {metrics_analyzed.includes('key_concern_flagged') && (
                        <td className="p-4">
                          <Badge variant="outline" className="text-xs">
                            {response.responses.key_concern_flagged}
                          </Badge>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Cumulative Insights & Suggestions */}
        <div className="grid gap-8 md:grid-cols-2 mt-8">
          <Card className="border-0 shadow-2xl backdrop-blur-sm bg-white/90 dark:bg-gray-900/90">
            <CardHeader className="bg-gradient-to-r from-green-500/10 to-teal-500/10 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-gradient-to-br from-green-500 to-teal-500 rounded-xl">
                    <BarChart3 className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Cumulative Insights</CardTitle>
                    <CardDescription>Overall cohort analysis</CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div>
                <h4 className="font-semibold text-gray-800 dark:text-gray-200">Key Themes</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">Positive sentiment was often linked to mentions of convenience and efficacy, while negative sentiment frequently arose from concerns about side effects and cost.</p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-800 dark:text-gray-200">Performance Highlights</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
                  <li>Highest purchase intent from personas with a stated preference for new technology.</li>
                  <li>Lowest brand trust scores among personas with long-term chronic conditions.</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-2xl backdrop-blur-sm bg-white/90 dark:bg-gray-900/90">
            <CardHeader className="bg-gradient-to-r from-blue-500/10 to-sky-500/10 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-gradient-to-br from-blue-500 to-sky-500 rounded-xl">
                    <Lightbulb className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Actionable Suggestions</CardTitle>
                    <CardDescription>Improve your ad copy based on AI analysis</CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div>
                <h4 className="font-semibold text-gray-800 dark:text-gray-200">For Your Ad Copy: "{stimulus_text.substring(0, 30)}..."</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  To address the identified key concern of 'cost', consider adding a phrase like "Financial assistance available" or "Covered by most insurance plans" to your message. This can directly counter the negative sentiment from personas worried about affordability.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-800 dark:text-gray-200">For Visuals (If Applicable)</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  If your campaign includes images, ensure they depict relatable scenarios. For instance, instead of focusing solely on the product, show patients enjoying a better quality of life, which can improve brand trust and emotional connection.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-4 mt-8 pb-8">
          <Button 
            size="lg"
            className="bg-gradient-to-r from-primary to-secondary text-white hover:shadow-xl"
            onClick={() => navigate('/simulation')}
          >
            <PlayCircle className="h-5 w-5 mr-2" />
            Run New Simulation
          </Button>
          <Button 
            size="lg"
            variant="outline"
            onClick={() => window.print()}
          >
            <Download className="h-5 w-5 mr-2" />
            Export Report
          </Button>
        </div>
      </div>
    </div>
  );
}
