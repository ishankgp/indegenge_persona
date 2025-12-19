import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import MetricCard from '@/components/analytics/MetricCard';
import { computeScoreColor, computeScoreProgress, getSentimentDescriptor } from '@/lib/analytics';
import type { AnalysisResults, AnalyzedMetricKey, IndividualResponseRow, PersonaResponseScores } from '@/types/analytics';
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

  Filter,
  Clock,
  Gauge,
  Lightbulb,
  PlayCircle,
  Shield,
  Save,
  History
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SavedSimulationsAPI, type SavedSimulation } from '@/lib/api';
import { toast } from '@/components/ui/use-toast';

export function Analytics() {
  const location = useLocation();
  const navigate = useNavigate();
  // State for analysis results (either from location state or loaded from history)
  const [analysisResults, setAnalysisResults] = useState<AnalysisResults | undefined>(
    location.state?.analysisResults as AnalysisResults | undefined
  );

  // History / Saved Simulations State
  const [savedSimulations, setSavedSimulations] = useState<SavedSimulation[]>([]);
  const [selectedSimulationId, setSelectedSimulationId] = useState<string>("current");
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Load saved simulations on mount
  useEffect(() => {
    loadSavedSimulations();
  }, []);

  const loadSavedSimulations = async () => {
    try {
      const response = await SavedSimulationsAPI.list();
      setSavedSimulations(response.data);
    } catch (error) {
      console.error("Failed to load saved simulations:", error);
      toast({
        title: "Error loading history",
        description: "Could not fetch saved simulations.",
        variant: "destructive"
      });
    }
  };

  const handleSaveSimulation = async () => {
    if (!analysisResults || !saveName.trim()) return;

    setIsSaving(true);
    try {
      await SavedSimulationsAPI.save({
        name: saveName,
        simulation_data: analysisResults
      });

      toast({
        title: "Simulation Saved",
        description: "Your analysis results have been saved to history.",
      });

      setIsSaveDialogOpen(false);
      setSaveName("");
      loadSavedSimulations(); // Refresh list
    } catch (error) {
      console.error("Failed to save simulation:", error);
      toast({
        title: "Save Failed",
        description: "Could not save the simulation. Name might be duplicate.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadSimulation = async (simulationId: string) => {
    setSelectedSimulationId(simulationId);

    if (simulationId === "current") {
      // Revert to initial state from navigation if available
      if (location.state?.analysisResults) {
        setAnalysisResults(location.state.analysisResults);
      }
      return;
    }

    try {
      const numericId = parseInt(simulationId);
      const response = await SavedSimulationsAPI.get(numericId);
      setAnalysisResults(response.data.simulation_data);
      console.log("Loaded simulation:", response.data.name);
    } catch (error) {
      console.error("Failed to load simulation:", error);
      toast({
        title: "Load Failed",
        description: "Could not load the selected simulation.",
        variant: "destructive"
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
        {/* Indegene Purple Header */}
        <div className="bg-gradient-to-r from-[hsl(262,60%,38%)] via-[hsl(262,60%,42%)] to-[hsl(280,60%,45%)]">
          <div className="max-w-7xl mx-auto px-8 py-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                <BarChart3 className="h-8 w-8 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold text-white tracking-tight">Analytics Dashboard</h1>
                  <Badge className="bg-white/20 backdrop-blur-sm text-white border-white/30 font-normal">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Insights & Reports
                  </Badge>
                </div>
                <p className="text-white/80 mt-1">View and analyze cohort simulation results</p>
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
                Run a simulation from the Simulation Hub to see detailed analytics and insights
              </p>
              <Button
                size="lg"
                className="bg-gradient-to-r from-primary to-secondary text-white hover:shadow-xl transition-all duration-200"
                onClick={() => navigate('/simulation')}
              >
                <Activity className="mr-2 h-5 w-5" />
                Go to Simulation Hub
              </Button>
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

  const metricPresent = (...keys: string[]) =>
    keys.some((key) => metrics_analyzed.includes(key as AnalyzedMetricKey));

  const getResponseValue = (
    row: IndividualResponseRow,
    key: keyof PersonaResponseScores,
    legacyKey?: keyof PersonaResponseScores
  ) => {
    const responses = row?.responses || {};
    const value = responses[key];
    if (value !== undefined && value !== null) {
      return value;
    }
    if (legacyKey) {
      const legacyValue = responses[legacyKey];
      if (legacyValue !== undefined && legacyValue !== null) {
        return legacyValue;
      }
    }
    return undefined;
  };

  const getNumericScore = (
    row: IndividualResponseRow,
    key: keyof PersonaResponseScores,
    legacyKey?: keyof PersonaResponseScores
  ): number | undefined => {
    const value = getResponseValue(row, key, legacyKey);
    if (typeof value === 'number') {
      return value;
    }
    if (typeof value === 'string' && value.trim() !== '') {
      const parsed = Number(value);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
    return undefined;
  };

  const getConcernsList = (row: IndividualResponseRow): string[] => {
    const value = getResponseValue(row, 'key_concerns', 'key_concern_flagged');
    if (!value) return [];
    if (Array.isArray(value)) {
      return value.filter(Boolean).map((item) => String(item));
    }
    if (typeof value === 'string') {
      return [value];
    }
    if (typeof value === 'number') {
      return [value.toString()];
    }
    return [];
  };

  const summaryIntent = summary_statistics.intent_to_action_avg ?? summary_statistics.purchase_intent_avg;
  const summaryEmotion = summary_statistics.emotional_response_avg ?? summary_statistics.sentiment_avg;
  const summaryTrust = summary_statistics.brand_trust_avg ?? summary_statistics.trust_in_brand_avg;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-violet-50 dark:from-gray-950 dark:via-gray-900 dark:to-violet-950">
      {/* Indegene Purple Header Section */}
      <div className="bg-gradient-to-r from-[hsl(262,60%,38%)] via-[hsl(262,60%,42%)] to-[hsl(280,60%,45%)]">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                <BarChart3 className="h-8 w-8 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold text-white tracking-tight">Analytics Dashboard</h1>
                  <Badge className="bg-white/20 backdrop-blur-sm text-white border-white/30 font-normal">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Live Results
                  </Badge>
                </div>
                <p className="text-white/80 mt-1">Comprehensive analysis for {cohort_size} personas</p>
              </div>
            </div>
            <div className="flex gap-3">
              {/* History Dropdown */}
              <div className="w-[200px]">
                <Select
                  value={selectedSimulationId}
                  onValueChange={handleLoadSimulation}
                >
                  <SelectTrigger className="bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20 h-10">
                    <History className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Load History" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="current">Current Analysis</SelectItem>
                    {savedSimulations.map((sim) => (
                      <SelectItem key={sim.id} value={sim.id.toString()}>
                        {sim.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Save Analysis Dialog */}
              <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20">
                    <Save className="h-4 w-4 mr-2" />
                    Save Analysis
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Save Analysis Results</DialogTitle>
                    <DialogDescription>
                      Give this simulation a memorable name to save it for later reference.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="name" className="text-right">
                        Name
                      </Label>
                      <Input
                        id="name"
                        value={saveName}
                        onChange={(e) => setSaveName(e.target.value)}
                        placeholder="e.g. Campaign V1 Test"
                        className="col-span-3"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleSaveSimulation} disabled={isSaving || !saveName.trim()}>
                      {isSaving ? "Saving..." : "Save"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Button variant="outline" className="bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>

          {/* Quick Stats Bar */}
          <div className="grid grid-cols-4 gap-4 mt-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm">Completed</p>
                  <p className="text-xl font-bold text-white">{new Date(created_at).toLocaleTimeString()}</p>
                </div>
                <Clock className="h-6 w-6 text-white/50" />
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm">Cohort Size</p>
                  <p className="text-xl font-bold text-white">{cohort_size}</p>
                </div>
                <Users className="h-6 w-6 text-white/50" />
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm">Metrics</p>
                  <p className="text-xl font-bold text-white">{metrics_analyzed.length}</p>
                </div>
                <Gauge className="h-6 w-6 text-white/50" />
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm">Insights</p>
                  <p className="text-xl font-bold text-white">{insights?.length || 0}</p>
                </div>
                <Lightbulb className="h-6 w-6 text-white/50" />
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
          {summaryIntent !== undefined && (
            <MetricCard
              title="Average Purchase Intent"
              value={summaryIntent.toFixed(1)}
              subtitle="Scale of 1-10"
              icon={Target}
              trend={summaryIntent > 5 ? 'up' : 'down'}
              color="primary"
            />
          )}
          {summaryEmotion !== undefined && (
            <MetricCard
              title="Average Sentiment"
              value={
                <div className="flex items-center gap-2">
                  {(() => {
                    const d = getSentimentDescriptor(summaryEmotion);
                    return (
                      <span className={d.color}>
                        {summaryEmotion.toFixed(2)}
                      </span>
                    );
                  })()}
                  {(() => {
                    const d = getSentimentDescriptor(summaryEmotion);
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
          {summaryTrust !== undefined && (
            <MetricCard
              title="Average Brand Trust"
              value={summaryTrust.toFixed(1)}
              subtitle="Scale of 1-10"
              icon={Shield}
              trend={summaryTrust > 5 ? 'up' : 'down'}
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

        {insights && insights.length > 0 && (
          <Card className="mb-8 border-0 shadow-2xl backdrop-blur-sm bg-white/90 dark:bg-gray-900/90">
            <CardHeader className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl">
                    <Lightbulb className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">AI-Generated Insights</CardTitle>
                    <CardDescription>Key findings and recommendations</CardDescription>
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

        {/* Message Refinement Suggestions - NEW */}
        {individual_responses && individual_responses.length > 0 && (() => {
          const lowScorePersonas = individual_responses.filter((row) => {
            const trustScore = getNumericScore(row, 'brand_trust', 'trust_in_brand');
            const intentScore = getNumericScore(row, 'intent_to_action', 'purchase_intent');
            const score = trustScore ?? intentScore;
            return typeof score === 'number' && score < 5;
          });

          const hasConcern = (keywords: string[]) =>
            lowScorePersonas.some((row) =>
              getConcernsList(row).some((concern) => {
                const lower = concern.toLowerCase();
                return keywords.some((keyword) => lower.includes(keyword));
              })
            );

          const suggestions: Array<{ issue: string; suggestion: string; segment: string }> = [];

          if (hasConcern(['cost', 'price', 'afford'])) {
            suggestions.push({
              issue: "Cost sensitivity detected",
              suggestion: "Add language about patient assistance programs, copay cards, or insurance coverage options",
              segment: "Price-Conscious"
            });
          }

          if (hasConcern(['side effect', 'safety', 'risk'])) {
            suggestions.push({
              issue: "Safety concerns identified",
              suggestion: "Lead with safety profile data and tolerability messaging before efficacy claims",
              segment: "Safety-First"
            });
          }

          if (hasConcern(['complex', 'confus', 'understand'])) {
            suggestions.push({
              issue: "Message complexity issues",
              suggestion: "Simplify clinical language; use patient-friendly terms and visual explanations",
              segment: "Clarity-Seekers"
            });
          }

          if (suggestions.length === 0 && lowScorePersonas.length > 0) {
            suggestions.push({
              issue: "General engagement gap",
              suggestion: "Consider A/B testing with more emotional appeals or patient testimonials",
              segment: "General"
            });
          }

          if (suggestions.length === 0) return null;

          return (
            <Card className="mb-8 border-0 shadow-2xl backdrop-blur-sm bg-white/90 dark:bg-gray-900/90 border-l-4 border-l-emerald-500">
              <CardHeader className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-t-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl">
                      <Target className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">Message Refinement Suggestions</CardTitle>
                      <CardDescription>
                        Based on {lowScorePersonas.length} persona{lowScorePersonas.length !== 1 ? 's' : ''} with low engagement scores
                      </CardDescription>
                    </div>
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Asset Refinement
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                {suggestions.map((s, idx) => (
                  <div key={idx} className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-750 rounded-xl border border-gray-200 dark:border-gray-700">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                          <span className="font-medium text-gray-900 dark:text-gray-100">{s.issue}</span>
                          <Badge variant="outline" className="text-xs">{s.segment}</Badge>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                          {s.suggestion}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

                <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
                  <Button
                    onClick={() => {
                      // Navigate to simulation with refined message suggestion
                      const refinedMessage = `[REFINED VERSION]\n\n${stimulus_text}\n\n---\nSuggested improvements:\n${suggestions.map(s => `• ${s.suggestion}`).join('\n')}`;
                      navigate('/simulation', {
                        state: {
                          prefillMessage: refinedMessage,
                          isVariant: true,
                          originalMessage: stimulus_text
                        }
                      });
                    }}
                    className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:shadow-xl transition-all"
                  >
                    <PlayCircle className="h-4 w-4 mr-2" />
                    Create Message Variant
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })()}


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
                    {metricPresent('intent_to_action', 'purchase_intent') && (
                      <th className="p-4 text-center text-sm font-medium text-gray-700 dark:text-gray-300">
                        <div className="flex items-center justify-center gap-1">
                          <Target className="h-4 w-4" />
                          Intent
                        </div>
                      </th>
                    )}
                    {metricPresent('emotional_response', 'sentiment') && (
                      <th className="p-4 text-center text-sm font-medium text-gray-700 dark:text-gray-300">
                        <div className="flex items-center justify-center gap-1">
                          <Brain className="h-4 w-4" />
                          Sentiment
                        </div>
                      </th>
                    )}
                    {metricPresent('brand_trust', 'trust_in_brand') && (
                      <th className="p-4 text-center text-sm font-medium text-gray-700 dark:text-gray-300">
                        <div className="flex items-center justify-center gap-1">
                          <Shield className="h-4 w-4" />
                          Trust
                        </div>
                      </th>
                    )}
                    {metricPresent('message_clarity') && (
                      <th className="p-4 text-center text-sm font-medium text-gray-700 dark:text-gray-300">
                        <div className="flex items-center justify-center gap-1">
                          <MessageSquare className="h-4 w-4" />
                          Clarity
                        </div>
                      </th>
                    )}
                    {metricPresent('key_concerns', 'key_concern_flagged') && (
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
                          {response.avatar_url ? (
                            <img
                              src={response.avatar_url}
                              alt={response.persona_name}
                              className="w-10 h-10 rounded-full object-cover border-2 border-primary/20"
                              onError={(e) => {
                                // Fallback to initials if image fails
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                target.nextElementSibling?.classList.remove('hidden');
                              }}
                            />
                          ) : null}
                          <div className={`w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold ${response.avatar_url ? 'hidden' : ''}`}>
                            {response.persona_name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 dark:text-gray-100">{response.persona_name}</div>
                            <div className="text-xs text-gray-500 flex items-center gap-1">
                              <span>ID: {response.persona_id}</span>
                              {response.persona_type && (
                                <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-xs">{response.persona_type}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 max-w-md">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 cursor-help">
                                {response.reasoning}
                              </p>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-md p-4 bg-white dark:bg-gray-800 shadow-xl">
                              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                {response.reasoning}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </td>
                      {metricPresent('intent_to_action', 'purchase_intent') && (
                        <td className="p-4 text-center">
                          {(() => {
                            const intentScore = getNumericScore(response, 'intent_to_action', 'purchase_intent');
                            return (
                              <div className="flex flex-col items-center gap-1">
                                <span className={`text-lg font-bold ${computeScoreColor(intentScore ?? 0)}`}>
                                  {intentScore ?? '—'}
                                </span>
                                <Progress
                                  value={computeScoreProgress(intentScore ?? 0)}
                                  className="w-16 h-1.5"
                                />
                              </div>
                            );
                          })()}
                        </td>
                      )}
                      {metricPresent('emotional_response', 'sentiment') && (
                        <td className="p-4 text-center">
                          {(() => {
                            const sentimentScore = getNumericScore(response, 'emotional_response', 'sentiment') ?? 0;
                            const descriptor = getSentimentDescriptor(sentimentScore);
                            return (
                              <>
                                <Badge className={descriptor.badgeClassName}>
                                  {descriptor.level}
                                </Badge>
                                <div className="text-xs mt-1 text-gray-500">
                                  {sentimentScore.toFixed(2)}
                                </div>
                              </>
                            );
                          })()}
                        </td>
                      )}
                      {metricPresent('brand_trust', 'trust_in_brand') && (
                        <td className="p-4 text-center">
                          {(() => {
                            const trustScore = getNumericScore(response, 'brand_trust', 'trust_in_brand');
                            return (
                              <div className="flex flex-col items-center gap-1">
                                <span className={`text-lg font-bold ${computeScoreColor(trustScore ?? 0)}`}>
                                  {trustScore ?? '—'}
                                </span>
                                <Progress
                                  value={computeScoreProgress(trustScore ?? 0)}
                                  className="w-16 h-1.5"
                                />
                              </div>
                            );
                          })()}
                        </td>
                      )}
                      {metricPresent('message_clarity') && (
                        <td className="p-4 text-center">
                          {(() => {
                            const clarityScore = getNumericScore(response, 'message_clarity');
                            return (
                              <div className="flex flex-col items-center gap-1">
                                <span className={`text-lg font-bold ${computeScoreColor(clarityScore ?? 0)}`}>
                                  {clarityScore ?? '—'}
                                </span>
                                <Progress
                                  value={computeScoreProgress(clarityScore ?? 0)}
                                  className="w-16 h-1.5"
                                />
                              </div>
                            );
                          })()}
                        </td>
                      )}
                      {metricPresent('key_concerns', 'key_concern_flagged') && (
                        <td className="p-4">
                          {(() => {
                            const concernValue = getResponseValue(response, 'key_concerns', 'key_concern_flagged');
                            return (
                              <Badge variant="outline" className="text-xs">
                                {concernValue ? String(concernValue) : '—'}
                              </Badge>
                            );
                          })()}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

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
