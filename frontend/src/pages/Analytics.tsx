import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from "@/components/ui/scroll-area";
import MetricCard from '@/components/analytics/MetricCard';
import { computeScoreColor, getMetricLabelFromBackendKey, getSentimentDescriptor, normalizeBackendMetricKey } from '@/lib/analytics';
import { getMetricByBackendKey, mapBackendMetricToFrontend } from '@/lib/metricsRegistry';
import type { MetricDefinition } from '@/lib/metricsRegistry';
import type { AnalysisResults, AnalyzedMetricKey, IndividualResponseRow, PersonaResponseScores, SummaryStatistics } from '@/types/analytics';
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
  ImageIcon,
  Wand2,
  Filter,
  Clock,
  Gauge,
  Lightbulb,
  PlayCircle,
  Save,
  History,
  Loader2,
  PieChart,
  LayoutGrid,
  Search
} from 'lucide-react';
import {
  Bar,
  BarChart,
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis
} from 'recharts';
import type { Formatter } from 'recharts/types/component/DefaultTooltipContent';
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
import { SavedSimulationsAPI, CohortAPI, type SavedSimulation } from '@/lib/api';
import { toast } from '@/components/ui/use-toast';

type CustomQuestionResponse = { question: string; answer: string };

/**
 * Computes a weighted composite score from metric values.
 * Normalizes sentiment (-1 to 1) to 0-10 scale before averaging.
 * Returns undefined if no valid numeric scores are available.
 */
function computeCompositeScore(
  metricValues: Record<string, number | undefined>,
  metricWeights: Record<string, number> | undefined,
  analyzedMetricDefinitions: MetricDefinition[]
): number | undefined {
  let weightedSum = 0;
  let totalWeight = 0;

  for (const metric of analyzedMetricDefinitions) {
    // Skip non-numeric metrics like key_concerns
    if (metric.type === 'flag') continue;

    const value = metricValues[metric.id] ?? metricValues[metric.backendKeys[0]];
    if (typeof value !== 'number' || !Number.isFinite(value)) continue;

    // Normalize sentiment from -1..1 to 0..10
    let normalizedValue = value;
    if (metric.type === 'sentiment') {
      normalizedValue = ((value + 1) / 2) * 10;
    }

    const weight = metricWeights?.[metric.id] ?? metricWeights?.[metric.backendKeys[0]] ?? 1;
    weightedSum += normalizedValue * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) return undefined;
  return weightedSum / totalWeight;
}

export function Analytics() {
  const location = useLocation();
  const navigate = useNavigate();
  // State for analysis results (either from location state or loaded from history)
  const [analysisResults, setAnalysisResults] = useState<AnalysisResults | undefined>(
    location.state?.analysisResults as AnalysisResults | undefined
  );
  const [originalImages] = useState<File[]>(
    location.state?.originalImages as File[] | undefined || []
  );
  const [contentType] = useState<string>(
    location.state?.contentType as string | undefined || 'text'
  );
  const [improvedImages, setImprovedImages] = useState<Array<{ original: string, improved: string, improvements: string }>>([]);
  const [isImprovingImages, setIsImprovingImages] = useState(false);

  // History / Saved Simulations State
  const [savedSimulations, setSavedSimulations] = useState<SavedSimulation[]>([]);
  const [selectedSimulationId, setSelectedSimulationId] = useState<string>("current");
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [selectedQAResponse, setSelectedQAResponse] = useState<
    { persona: string; qas: CustomQuestionResponse[] } | null
  >(null);

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

  const handleImproveImages = async () => {
    if (!analysisResults || originalImages.length === 0) return;

    setIsImprovingImages(true);
    try {
      const improvedResults = await Promise.all(
        originalImages.map(async (image) => {
          const result = await CohortAPI.improveImage(analysisResults, image);
          return {
            original: URL.createObjectURL(image),
            improved: `data:image/${result.original_format || 'png'};base64,${result.improved_image_base64}`,
            improvements: result.improvements || result.analysis || 'Image enhanced based on persona feedback'
          };
        })
      );
      setImprovedImages(improvedResults);
      toast({
        title: "Images Improved",
        description: `Successfully improved ${improvedResults.length} image(s) based on persona reactions.`,
      });
    } catch (error: any) {
      console.error("Failed to improve images:", error);
      toast({
        title: "Error improving images",
        description: error?.response?.data?.detail || "Could not improve images. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsImprovingImages(false);
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

  // Extract data from results or defaults
  const EMPTY_RESULTS: Partial<AnalysisResults> = {};
  const currentResults = analysisResults || EMPTY_RESULTS as AnalysisResults;

  const {
    cohort_size,
    stimulus_text,
    metrics_analyzed,
    questions,
    individual_responses,
    summary_statistics,
    insights,
    preamble,
    created_at,
    metric_weights
  } = currentResults;

  const analyzedMetricDefinitions: MetricDefinition[] = analysisResults ? Array.from(
    (metrics_analyzed || []).reduce((map, metricKey) => {
      const normalized = normalizeBackendMetricKey(metricKey)
      const definition =
        getMetricByBackendKey(normalized) || {
          id: mapBackendMetricToFrontend(normalized),
          backendKeys: [normalized as AnalyzedMetricKey],
          label: getMetricLabelFromBackendKey(normalized),
          description: "",
          type: "score",
          scale: { min: 0, max: 10 },
        }

      if (!map.has(definition.id)) {
        map.set(definition.id, definition)
      }
      return map
    }, new Map<string, MetricDefinition>()).values()
  ) : [];

  const getResponseValue = (row: IndividualResponseRow, metric: MetricDefinition) => {
    const responses = row?.responses || {}
    const keysToCheck = [...metric.backendKeys, metric.id]
    for (const key of keysToCheck) {
      const value = responses[key as keyof PersonaResponseScores]
      if (value !== undefined && value !== null) return value
    }
    return undefined
  }

  const getNumericScore = (row: IndividualResponseRow, metric: MetricDefinition): number | undefined => {
    const value = getResponseValue(row, metric)
    if (typeof value === "number") return value
    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value)
      if (!Number.isNaN(parsed)) return parsed
    }
    return undefined
  }

  const concernsMetric = analyzedMetricDefinitions.find((metric) => metric.id === "key_concerns")

  const getConcernsList = (row: IndividualResponseRow): string[] => {
    if (!concernsMetric) return []
    const value = getResponseValue(row, concernsMetric)
    if (!value) return []
    if (Array.isArray(value)) {
      return value.filter(Boolean).map((item) => String(item))
    }
    if (typeof value === "string") {
      return [value]
    }
    if (typeof value === "number") {
      return [value.toString()]
    }
    return []
  }

  const getSummaryValueForMetric = (summary: SummaryStatistics, metric: MetricDefinition): number | undefined => {
    if (!summary) return undefined;
    const keysToCheck = [metric.id, ...metric.backendKeys].map((key) => `${key}_avg` as keyof SummaryStatistics)
    for (const key of keysToCheck) {
      const value = summary[key]
      if (typeof value === "number") return value
    }
    return undefined
  }

  const metricProgress = (metric: MetricDefinition, score: number) => {
    const { min, max } = metric.scale
    if (max === min) return 0
    return ((score - min) / (max - min)) * 100
  }

  const summaryMetricEntries = analyzedMetricDefinitions
    .filter((metric) => metric.type !== "flag")
    .map((metric) => ({ metric, value: getSummaryValueForMetric(summary_statistics, metric) }))
    .filter((entry) => typeof entry.value === "number")

  const scoreMetrics = analyzedMetricDefinitions.filter((metric) => metric.type === "score")
  const primaryScoreMetric = scoreMetrics.find((metric) => metric.id === "brand_trust")
    || scoreMetrics.find((metric) => metric.id === "intent_to_action")
    || scoreMetrics[0]

  const metricChartData = summaryMetricEntries.map(({ metric, value }) => ({
    metric: metric.label,
    score: Number(value),
  }))

  // Compute overall composite score from summary statistics averages
  const summaryMetricValues: Record<string, number | undefined> = {};
  summaryMetricEntries.forEach(({ metric, value }) => {
    if (typeof value === 'number') {
      summaryMetricValues[metric.id] = value;
    }
  });
  const overallCompositeScore = computeCompositeScore(
    summaryMetricValues,
    metric_weights,
    analyzedMetricDefinitions
  );

  // Compute per-persona composite scores
  const personaCompositeScores = new Map<number | string, number | undefined>();
  individual_responses?.forEach((response) => {
    const personaMetricValues: Record<string, number | undefined> = {};
    analyzedMetricDefinitions.forEach((metric) => {
      const value = getNumericScore(response, metric);
      if (typeof value === 'number') {
        personaMetricValues[metric.id] = value;
      }
    });
    const composite = computeCompositeScore(
      personaMetricValues,
      metric_weights,
      analyzedMetricDefinitions
    );
    personaCompositeScores.set(response.persona_id, composite);
  });

  const chartTooltipFormatter: Formatter<number, string> = (value) => {
    const numeric = typeof value === 'number' ? value : Number(value)
    return [Number.isFinite(numeric) ? numeric.toFixed(2) : String(value), 'Score']
  }

  const radarTooltipFormatter: Formatter<number, string> = (value) => {
    const numeric = typeof value === 'number' ? value : Number(value)
    return [Number.isFinite(numeric) ? numeric.toFixed(2) : String(value), 'Score']
  }

  const hasCustomQuestions = (questions?.length ?? 0) > 0
  const aggregatedCustomQuestions = (questions || []).map((question, idx) => {
    const answers =
      individual_responses
        ?.map((r) => r.answers?.[idx])
        .filter((a): a is string => typeof a === 'string' && a.trim().length > 0) || []
    return { question, answers }
  })

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden font-sans">

      {/* 1. LEFT SIDEBAR: History & Navigation */}
      <aside className="w-80 bg-muted/10 border-r flex flex-col shrink-0 transition-all">
        <div className="p-4 border-b bg-background/50 backdrop-blur">
          <h2 className="font-semibold text-lg flex items-center gap-2 tracking-tight">
            <History className="h-5 w-5 text-primary" />
            Runs History
          </h2>
          <p className="text-xs text-muted-foreground mt-1">Previous simulation reports</p>
        </div>

        <div className="p-3 border-b bg-muted/5">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Search history..." className="pl-8 h-9 text-xs bg-background" />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-3 space-y-2">
            <button
              onClick={() => handleLoadSimulation("current")}
              className={`w-full text-left p-3 rounded-lg border transition-all hover:border-primary/50 group ${selectedSimulationId === "current" ? "bg-background border-primary shadow-sm" : "bg-transparent border-transparent hover:bg-white/50"}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-sm font-semibold ${selectedSimulationId === "current" ? "text-primary" : "text-foreground"}`}>Current Analysis</span>
                {selectedSimulationId === "current" && <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />}
              </div>
              <div className="text-xs text-muted-foreground">Unsaved working session</div>
            </button>

            <div className="px-1 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Saved Reports</div>

            {savedSimulations.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-xs italic">
                No saved simulations yet.
              </div>
            )}

            {savedSimulations.map((sim) => (
              <button
                key={sim.id}
                onClick={() => handleLoadSimulation(sim.id.toString())}
                className={`w-full text-left p-3 rounded-lg border transition-all hover:bg-background/80 hover:shadow-sm ${selectedSimulationId === sim.id.toString() ? "bg-background border-primary shadow-sm ring-1 ring-primary/10" : "bg-card border-border hover:border-primary/30"}`}
              >
                <div className="font-medium text-sm truncate mb-1">{sim.name}</div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{new Date(sim.created_at).toLocaleDateString()}</span>
                  <Badge variant="secondary" className="h-4 px-1 text-[10px] font-normal">v{sim.id}</Badge>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </aside>

      {/* 2. MAIN CONTENT: Analytics Dashboard */}
      <main className="flex-1 flex flex-col h-full bg-slate-50/50 dark:bg-slate-950/50 relative overflow-hidden">

        {/* Header */}
        <header className="h-16 border-b bg-background/80 backdrop-blur sticky top-0 z-20 flex items-center justify-between px-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">Analytics Dashboard</h1>
              {analysisResults && <p className="text-xs text-muted-foreground flex items-center gap-2">
                <span>Cohort: {cohort_size} Personas</span>
                <span className="w-1 h-1 rounded-full bg-muted-foreground" />
                <span>{new Date(created_at).toLocaleTimeString()}</span>
              </p>}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => navigate('/simulation')}>
              <PlayCircle className="h-4 w-4 mr-2" />
              New Run
            </Button>
            <div className="h-6 w-px bg-border" />
            <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Save Analysis Results</DialogTitle>
                  <DialogDescription>Give this simulation a name to save it to history.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">Name</Label>
                    <Input
                      id="name"
                      value={saveName}
                      onChange={(e) => setSaveName(e.target.value)}
                      placeholder="e.g. Diabetes Campaign V1"
                      className="col-span-3"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleSaveSimulation} disabled={isSaving || !saveName.trim()}>
                    {isSaving ? "Saving..." : "Save Report"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </header>

        {/* Scrollable Content */}
        {!analysisResults ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="max-w-md text-center">
              <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                <BarChart3 className="h-10 w-10 text-muted-foreground/50" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No Analysis Selected</h3>
              <p className="text-muted-foreground mb-6">Select a report from the history sidebar or run a new simulation to view results.</p>
              <Button onClick={() => navigate('/simulation')} className="gap-2">
                <Activity className="h-4 w-4" /> Go to Simulation Hub
              </Button>
            </div>
          </div>
        ) : (
          <ScrollArea className="flex-1">
            <div className="max-w-[1400px] mx-auto p-8 space-y-8 pb-20">

              {/* 1. Quick Stats Row */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-card/50 backdrop-blur border shadow-sm">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Composite Score</p>
                      <p className="text-2xl font-bold mt-1 text-primary">{overallCompositeScore?.toFixed(1) ?? "—"}</p>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <Gauge className="h-5 w-5" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-card/50 backdrop-blur border shadow-sm">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Metrics</p>
                      <p className="text-2xl font-bold mt-1">{metrics_analyzed.length}</p>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                      <Target className="h-5 w-5" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-card/50 backdrop-blur border shadow-sm">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Insights</p>
                      <p className="text-2xl font-bold mt-1">{insights?.length || 0}</p>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
                      <Lightbulb className="h-5 w-5" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-card/50 backdrop-blur border shadow-sm">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Responses</p>
                      <p className="text-2xl font-bold mt-1">{individual_responses?.length || 0}</p>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                      <Users className="h-5 w-5" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 2. Stimulus & Preamble */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  {/* Stimulus */}
                  <Card className="border shadow-sm overflow-hidden">
                    <CardHeader className="bg-muted/30 pb-4 border-b">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-primary/10 rounded text-primary"><MessageSquare className="h-4 w-4" /></div>
                          <CardTitle className="text-base">Analyzed Stimulus</CardTitle>
                        </div>
                        <Badge variant="outline" className="font-normal text-muted-foreground">Original Asset</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6">
                      {stimulus_text && (
                        <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground bg-muted/20 p-4 rounded-lg border-l-4 border-primary italic">
                          "{stimulus_text}"
                        </div>
                      )}

                      {/* Images Section (Simplified) */}
                      {(contentType === 'image' || contentType === 'both') && originalImages.length > 0 && (
                        <div className="mt-6">
                          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2"><ImageIcon className="h-4 w-4" /> Visual Assets</h4>
                          <div className="grid grid-cols-2 gap-4">
                            {originalImages.map((image, i) => (
                              <div key={i} className="rounded-lg border overflow-hidden">
                                <img src={URL.createObjectURL(image)} alt="Stimulus" className="w-full h-auto" />
                                {improvedImages[i] && (
                                  <div className="p-2 bg-green-50/50 text-xs text-green-700">
                                    <span className="font-bold">Improved:</span> View enhanced version
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                          {improvedImages.length === 0 && (
                            <Button onClick={handleImproveImages} disabled={isImprovingImages} variant="secondary" size="sm" className="mt-3 w-full">
                              {isImprovingImages ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Wand2 className="h-3 w-3 mr-2" />}
                              Generate AI Improvements
                            </Button>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Charts */}
                  {metricChartData.length > 0 && (
                    <Card className="border shadow-sm">
                      <CardHeader className="border-b bg-muted/5 pb-4">
                        <CardTitle className="text-base flex items-center gap-2">
                          <PieChart className="h-4 w-4 text-muted-foreground" /> Metric Breakdown
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6">
                        <div className="h-[300px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={metricChartData} margin={{ left: 0, right: 0 }}>
                              <XAxis dataKey="metric" tick={{ fontSize: 11 }} interval={0} height={40} />
                              <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} />
                              <RechartsTooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px' }} />
                              <Bar dataKey="score" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={40} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Right Column: Insights & Preamble */}
                <div className="space-y-6">
                  {preamble && (
                    <Card className="border shadow-sm bg-blue-50/30 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-blue-700 dark:text-blue-400">
                          <Sparkles className="h-4 w-4" /> Analysis Plan
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">{preamble}</p>
                      </CardContent>
                    </Card>
                  )}

                  {insights && insights.length > 0 && (
                    <Card className="border shadow-sm">
                      <CardHeader className="border-b bg-amber-50/50 dark:bg-amber-900/10 pb-4">
                        <CardTitle className="text-base flex items-center gap-2 text-amber-700 dark:text-amber-500">
                          <Lightbulb className="h-4 w-4" /> AI Insights
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 space-y-3">
                        {insights.map((insight, idx) => (
                          <div key={idx} className="flex gap-3 text-sm text-foreground bg-amber-50/30 dark:bg-amber-900/10 p-3 rounded-lg border border-amber-100 dark:border-amber-900/20">
                            <span className="font-bold text-amber-600 shrink-0">{idx + 1}.</span>
                            <p className="leading-relaxed">{insight}</p>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>

              {/* 3. Detailed Metrics Grid */}
              <section>
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Gauge className="h-5 w-5 text-primary" /> Metric Deep Dive
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {summaryMetricEntries.map(({ metric, value }) => {
                    const Icon = metric.icon?.component || BarChart3
                    return (
                      <MetricCard
                        key={metric.id}
                        title={metric.label}
                        value={(value as number).toFixed(1)}
                        subtitle={`Range: ${metric.scale.min}-${metric.scale.max}`}
                        icon={Icon}
                        trend={((value as number) > 7) ? 'up' : 'neutral'}
                        color={metric.id === "brand_trust" ? "success" : "primary"}
                      />
                    )
                  })}
                </div>
              </section>

              {/* 4. Questions Table */}
              {questions && questions.length > 0 && (
                <section>
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-primary" /> Qualitative Responses
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    {aggregatedCustomQuestions.map((qa, idx) => (
                      <Card key={idx} className="border shadow-sm">
                        <CardHeader className="py-3 bg-muted/30 border-b">
                          <CardTitle className="text-sm font-medium">{qa.question}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4">
                          <ul className="space-y-2 text-sm max-h-40 overflow-y-auto pr-2">
                            {qa.answers.map((ans, i) => (
                              <li key={i} className="bg-muted/20 p-2 rounded text-muted-foreground border-l-2 border-primary/20 pl-3">"{ans}"</li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </section>
              )}

              {/* 5. Individual Responses Table (Detailed) */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" /> Individual Persona Data
                  </h3>
                  <Button variant="outline" size="sm">Download CSV</Button>
                </div>
                <Card className="border shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-muted/50 border-b text-xs uppercase text-muted-foreground">
                        <tr>
                          <th className="p-4 font-semibold">Persona</th>
                          <th className="p-4 font-semibold w-96">Reasoning</th>
                          {analyzedMetricDefinitions.map(m => (
                            <th key={m.id} className="p-4 font-semibold text-center whitespace-nowrap">{m.label}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {individual_responses.map((row, i) => (
                          <tr key={i} className="hover:bg-muted/5 transition-colors">
                            <td className="p-4 font-medium flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                {row.persona_name.charAt(0)}
                              </div>
                              <div>
                                <div>{row.persona_name}</div>
                                <div className="text-[10px] text-muted-foreground">ID: {row.persona_id}</div>
                              </div>
                            </td>
                            <td className="p-4 text-muted-foreground line-clamp-2 max-w-md" title={row.reasoning}>
                              {row.reasoning?.substring(0, 100)}...
                            </td>
                            {analyzedMetricDefinitions.map(m => (
                              <td key={m.id} className="p-4 text-center">
                                <Badge variant="outline" className={`font-mono ${getNumericScore(row, m)! > 7 ? "border-green-500 bg-green-50 text-green-700" : ""}`}>
                                  {getNumericScore(row, m)?.toFixed(1) ?? "-"}
                                </Badge>
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </section>
            </div>
          </ScrollArea>
        )}
      </main>

      {/* Dialog for Custom Answers */}
      <Dialog open={!!selectedQAResponse} onOpenChange={(open) => !open && setSelectedQAResponse(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Custom Q&A {selectedQAResponse ? `- ${selectedQAResponse.persona}` : ''}</DialogTitle>
            <DialogDescription>Detailed answers for persona-specific custom questions.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            {selectedQAResponse?.qas.map((qa, idx) => (
              <div
                key={`${qa.question}-${idx}`}
                className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800"
              >
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{qa.question}</p>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 whitespace-pre-wrap">{qa.answer}</p>
              </div>
            )) || <p className="text-sm text-gray-500">No answers available.</p>}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
