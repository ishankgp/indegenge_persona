import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import MetricCard from '@/components/analytics/MetricCard';
import {
  computeScoreColor,
  computeScoreProgress,
  formatMetricLabel,
  getSentimentDescriptor,
  normalizeMetricKey,
  normalizeMetricScore
} from '@/lib/analytics';
import type {
  AnalysisResults,
  AnalyzedMetricKey,
  CustomQuestionResponse,
  IndividualResponseRow,
  PersonaResponseScores
} from '@/types/analytics';
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
  Shield,
  Save,
  History,
  Loader2,
  SlidersHorizontal,
  PieChart,
  LayoutGrid
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
  const [improvedImages, setImprovedImages] = useState<Array<{original: string, improved: string, improvements: string}>>([]);
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

  type MetricType = 'score' | 'sentiment' | 'text';
  type MetricCardColor = 'primary' | 'secondary' | 'success' | 'warning';

  interface MetricDefinition {
    key: string;
    label: string;
    subtitle?: string;
    icon?: typeof Gauge;
    color?: MetricCardColor;
    type: MetricType;
    responseKeys: Array<keyof PersonaResponseScores>;
    averageKeys: string[];
  }

  const normalizedMetrics = useMemo(
    () => Array.from(new Set(metrics_analyzed.map((metric) => normalizeMetricKey(metric)))),
    [metrics_analyzed]
  );

  const metricDefinitions: Record<string, MetricDefinition> = {
    purchase_intent: {
      key: 'purchase_intent',
      label: 'Request/Prescribe Intent',
      subtitle: 'Scale of 1-10',
      icon: Target,
      color: 'primary',
      type: 'score',
      responseKeys: ['intent_to_action', 'purchase_intent'],
      averageKeys: ['intent_to_action_avg', 'purchase_intent_avg']
    },
    sentiment: {
      key: 'sentiment',
      label: 'Sentiment',
      subtitle: 'Scale of -1 to 1',
      icon: Brain,
      color: 'secondary',
      type: 'sentiment',
      responseKeys: ['emotional_response', 'sentiment'],
      averageKeys: ['emotional_response_avg', 'sentiment_avg']
    },
    trust_in_brand: {
      key: 'trust_in_brand',
      label: 'Brand Trust',
      subtitle: 'Scale of 1-10',
      icon: Shield,
      color: 'success',
      type: 'score',
      responseKeys: ['brand_trust', 'trust_in_brand'],
      averageKeys: ['brand_trust_avg', 'trust_in_brand_avg']
    },
    message_clarity: {
      key: 'message_clarity',
      label: 'Message Clarity',
      subtitle: 'Scale of 1-10',
      icon: MessageSquare,
      color: 'warning',
      type: 'score',
      responseKeys: ['message_clarity'],
      averageKeys: ['message_clarity_avg']
    },
    key_concerns: {
      key: 'key_concerns',
      label: 'Key Concerns',
      subtitle: 'Top concern surfaced',
      icon: AlertTriangle,
      color: 'warning',
      type: 'text',
      responseKeys: ['key_concerns', 'key_concern_flagged'],
      averageKeys: ['key_concerns']
    }
  };

  const getMetricConfig = (metricKey: AnalyzedMetricKey | string): MetricDefinition => {
    const normalizedKey = normalizeMetricKey(metricKey);
    if (metricDefinitions[normalizedKey]) {
      return metricDefinitions[normalizedKey];
    }

    return {
      key: normalizedKey,
      label: formatMetricLabel(normalizedKey),
      subtitle: 'Scale of 1-10',
      icon: Gauge,
      color: 'primary',
      type: 'score',
      responseKeys: [metricKey as keyof PersonaResponseScores],
      averageKeys: [`${normalizedKey}_avg`]
    };
  };

  const [metricWeights, setMetricWeights] = useState<Record<string, number>>({});

  useEffect(() => {
    const initialWeights: Record<string, number> = {};
    const existingWeights = analysisResults.metric_weights || {};
    normalizedMetrics.forEach((metric) => {
      initialWeights[metric] = existingWeights[metric] ?? 1;
    });
    setMetricWeights(initialWeights);
  }, [analysisResults.metric_weights, normalizedMetrics]);

  const weightTotal = useMemo(
    () => normalizedMetrics.reduce((sum, metric) => sum + (metricWeights[metric] ?? 1), 0),
    [metricWeights, normalizedMetrics]
  );

  const updateWeight = (metric: string, value: number) => {
    setMetricWeights((prev) => ({ ...prev, [metric]: value }));
  };

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

  const getMetricAverageValue = (metricKey: AnalyzedMetricKey | string): number | undefined => {
    const config = getMetricConfig(metricKey);
    for (const avgKey of config.averageKeys) {
      const value = summary_statistics[avgKey];
      if (typeof value === 'number') return value;
    }
    const fallback = summary_statistics[`${config.key}_avg`];
    return typeof fallback === 'number' ? fallback : undefined;
  };

  const metricColumns = useMemo(
    () => normalizedMetrics.map((metric) => getMetricConfig(metric)),
    [normalizedMetrics]
  );

  const numericMetricKeys = useMemo(
    () => metricColumns.filter((metric) => metric.type !== 'text').map((metric) => metric.key),
    [metricColumns]
  );

  const computeMetricScore = (row: IndividualResponseRow, metricKey: string): number | undefined => {
    const config = getMetricConfig(metricKey);
    for (const key of config.responseKeys) {
      const score = getNumericScore(row, key, key);
      if (score !== undefined) return score;
    }
    return undefined;
  };

  const computeCompositeScore = (row: IndividualResponseRow): number | undefined => {
    if (numericMetricKeys.length < 2) return undefined;
    let weightedTotal = 0;
    let totalWeight = 0;

    numericMetricKeys.forEach((metricKey) => {
      const score = computeMetricScore(row, metricKey);
      if (score === undefined) return;
      const normalizedScore = normalizeMetricScore(metricKey, score);
      const weight = metricWeights[metricKey] ?? 1;
      weightedTotal += normalizedScore * weight;
      totalWeight += weight;
    });

    if (totalWeight === 0) return undefined;
    return Number((weightedTotal / totalWeight).toFixed(2));
  };

  const compositeAverage = useMemo(() => {
    const scores = individual_responses
      .map((row) => computeCompositeScore(row))
      .filter((score): score is number => typeof score === 'number');
    if (scores.length === 0) return undefined;
    const total = scores.reduce((sum, score) => sum + score, 0);
    return Number((total / scores.length).toFixed(2));
  }, [individual_responses, metricWeights, numericMetricKeys]);

  const metricChartData = useMemo(
    () =>
      metricColumns
        .map((metric) => {
          const average = getMetricAverageValue(metric.key);
          if (average === undefined || metric.type === 'text') return null;
          return {
            metric: metric.label,
            score: Number(normalizeMetricScore(metric.key, average).toFixed(2)),
            rawScore: average,
            isSentiment: metric.type === 'sentiment'
          };
        })
        .filter(Boolean) as Array<{ metric: string; score: number; rawScore: number; isSentiment: boolean }>,
    [metricColumns, summary_statistics]
  );

  const chartTooltipFormatter: Formatter<string | number, string | number> = (value, name) => {
    const numeric = typeof value === 'number' ? value : Number(value);
    const display = Number.isFinite(numeric) ? numeric.toFixed(2) : String(value ?? '');
    return [`${display}/10`, String(name ?? '')];
  };

  const radarTooltipFormatter: Formatter<string | number, string | number> = (value) => {
    const numeric = typeof value === 'number' ? value : Number(value);
    const display = Number.isFinite(numeric) ? numeric.toFixed(2) : String(value ?? '');
    return `${display}/10`;
  };

  const metricCardItems = useMemo(() => {
    const items = metricColumns
      .map((metric) => {
        const average = getMetricAverageValue(metric.key);
        if (average === undefined || metric.type === 'text') return null;

        if (metric.type === 'sentiment') {
          const descriptor = getSentimentDescriptor(average);
          return {
            key: metric.key,
            label: metric.label,
            value: (
              <div className="flex items-center gap-2">
                <span className={descriptor.color}>{average.toFixed(2)}</span>
                {descriptor.iconTone === 'up' && <TrendingUp className="h-4 w-4 text-emerald-500" />}
                {descriptor.iconTone === 'down' && <TrendingDown className="h-4 w-4 text-red-500" />}
                {descriptor.iconTone === 'neutral' && <Minus className="h-4 w-4 text-gray-500" />}
              </div>
            ),
            subtitle: metric.subtitle,
            icon: metric.icon,
            color: metric.color,
            trend: descriptor.iconTone === 'neutral' ? 'neutral' : 'up'
          };
        }

        return {
          key: metric.key,
          label: metric.label,
          value: average.toFixed(1),
          subtitle: metric.subtitle,
          icon: metric.icon,
          color: metric.color,
          trend: average > 7 ? 'up' : average < 4 ? 'down' : 'neutral'
        };
      })
      .filter(Boolean) as Array<{
        key: string;
        label: string;
        value: ReactNode;
        subtitle?: string;
        icon?: typeof Gauge;
        color?: MetricCardColor;
        trend?: 'up' | 'down' | 'neutral';
      }>;

    if (numericMetricKeys.length > 1 && compositeAverage !== undefined) {
      items.unshift({
        key: 'composite',
        label: 'Overall Composite',
        value: compositeAverage.toFixed(2),
        subtitle: 'Weighted by selected metrics',
        icon: Gauge,
        color: 'primary',
        trend: compositeAverage > 7 ? 'up' : compositeAverage < 4 ? 'down' : 'neutral'
      });
    }

    return items;
  }, [metricColumns, numericMetricKeys, compositeAverage, summary_statistics]);

  const showCompositeScore = numericMetricKeys.length > 1;

  const extractCustomQuestions = (response: IndividualResponseRow): CustomQuestionResponse[] => {
    const qas: CustomQuestionResponse[] = [];

    const addPair = (question?: string, answer?: unknown) => {
      if (!question || answer === undefined || answer === null) return;
      qas.push({ question: String(question), answer: String(answer) });
    };

    if (Array.isArray(response.custom_questions)) {
      response.custom_questions.forEach((qa) => addPair(qa.question, qa.answer));
    }

    const responseCustomQuestions = response.responses?.custom_questions;
    if (Array.isArray(responseCustomQuestions)) {
      responseCustomQuestions.forEach((qa: any) => addPair(qa.question, qa.answer));
    }

    const customQuestionAnswers = response.responses?.custom_question_answers;
    if (customQuestionAnswers && typeof customQuestionAnswers === 'object') {
      Object.entries(customQuestionAnswers).forEach(([question, answer]) => addPair(question, answer));
    }

    return qas.filter((qa) => qa.question && qa.answer);
  };

  const aggregatedCustomQuestions = useMemo(() => {
    const map = new Map<string, { question: string; answers: string[] }>();

    individual_responses.forEach((response) => {
      extractCustomQuestions(response).forEach((qa) => {
        const existing = map.get(qa.question) || { question: qa.question, answers: [] };
        existing.answers.push(`${response.persona_name}: ${qa.answer}`);
        map.set(qa.question, existing);
      });
    });

    return Array.from(map.values());
  }, [individual_responses]);

  const hasCustomQuestions = aggregatedCustomQuestions.length > 0;

  const renderMetricCell = (response: IndividualResponseRow, metric: MetricDefinition) => {
    if (metric.type === 'text') {
      const concerns = getConcernsList(response);
      const rawValue = getResponseValue(response, metric.responseKeys[0], metric.responseKeys[1]);
      const textValue = concerns.length > 0 ? concerns.join(', ') : rawValue ? String(rawValue) : '—';
      return (
        <Badge variant="outline" className="text-xs whitespace-pre-wrap">
          {textValue || '—'}
        </Badge>
      );
    }

    if (metric.type === 'sentiment') {
      const sentimentScore = computeMetricScore(response, metric.key) ?? 0;
      const descriptor = getSentimentDescriptor(sentimentScore);
      return (
        <div className="flex flex-col items-center gap-1">
          <Badge className={descriptor.badgeClassName}>{descriptor.level}</Badge>
          <div className="text-xs mt-1 text-gray-500">{sentimentScore.toFixed(2)}</div>
        </div>
      );
    }

    const score = computeMetricScore(response, metric.key);
    return (
      <div className="flex flex-col items-center gap-1">
        <span className={`text-lg font-bold ${computeScoreColor(score ?? 0)}`}>
          {score ?? '—'}
        </span>
        <Progress value={computeScoreProgress(score ?? 0)} className="w-16 h-1.5" />
      </div>
    );
  };

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
            {stimulus_text && (
              <blockquote className="border-l-4 border-primary pl-6 py-2 mb-6">
                <p className="text-lg text-gray-700 dark:text-gray-300 italic">"{stimulus_text}"</p>
              </blockquote>
            )}
            {(contentType === 'image' || contentType === 'both') && originalImages.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <ImageIcon className="h-5 w-5" />
                    Marketing Images Analyzed
                  </h3>
                  {improvedImages.length === 0 && (
                    <Button 
                      onClick={handleImproveImages} 
                      disabled={isImprovingImages}
                      className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                    >
                      {isImprovingImages ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Improving...
                        </>
                      ) : (
                        <>
                          <Wand2 className="h-4 w-4 mr-2" />
                          Improve Images
                        </>
                      )}
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {originalImages.map((image, index) => {
                    const originalUrl = URL.createObjectURL(image);
                    const improved = improvedImages[index];
                    return (
                      <div key={index} className="border rounded-lg overflow-hidden">
                        {improved ? (
                          <div className="grid grid-cols-2 gap-2">
                            <div className="p-2">
                              <p className="text-xs font-medium mb-2 text-gray-600">Original</p>
                              <img src={originalUrl} alt={`Original ${index + 1}`} className="w-full rounded" />
                            </div>
                            <div className="p-2 bg-green-50 dark:bg-green-950/20">
                              <p className="text-xs font-medium mb-2 text-green-700 dark:text-green-400 flex items-center gap-1">
                                <Wand2 className="h-3 w-3" />
                                Improved
                              </p>
                              <img src={improved.improved} alt={`Improved ${index + 1}`} className="w-full rounded" />
                            </div>
                          </div>
                        ) : (
                          <div className="p-4">
                            <img src={originalUrl} alt={`Image ${index + 1}`} className="w-full rounded" />
                            <p className="text-xs text-gray-500 mt-2">{image.name}</p>
                          </div>
                        )}
                        {improved && (
                          <div className="p-3 bg-gray-50 dark:bg-gray-800 border-t">
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              <strong>Improvements:</strong> {improved.improvements.substring(0, 150)}...
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
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

        {showCompositeScore && (
          <Card className="mb-6 border-0 shadow-2xl backdrop-blur-sm bg-white/90 dark:bg-gray-900/90">
            <CardHeader className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-gradient-to-br from-primary to-secondary rounded-xl">
                    <SlidersHorizontal className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Metric Weights</CardTitle>
                    <CardDescription>Adjust how each metric influences the composite score</CardDescription>
                  </div>
                </div>
                <Badge variant="outline" className="bg-white/40">
                  Composite Avg: {compositeAverage ?? '—'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                We normalize sentiment (-1 to 1) onto a 0-10 scale so it blends fairly with 1-10 metrics. Use weights to emphasize
                priority metrics.
              </p>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {numericMetricKeys.map((metricKey) => {
                  const config = getMetricConfig(metricKey);
                  const weight = metricWeights[metricKey] ?? 0;
                  const share = weightTotal > 0 ? Math.round((weight / weightTotal) * 100) : 0;
                  return (
                    <div
                      key={metricKey}
                      className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-900/50"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {config.icon && <config.icon className="h-4 w-4 text-primary" />}
                          <span className="font-medium text-sm text-gray-900 dark:text-gray-100">{config.label}</span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {share}%
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3">
                        <Input
                          type="number"
                          min={0}
                          step={0.1}
                          value={weight}
                          onChange={(e) => updateWeight(metricKey, Math.max(0, Number(e.target.value)))}
                          className="h-9"
                        />
                        <span className="text-xs text-gray-500">weight</span>
                      </div>
                      <Progress value={weightTotal > 0 ? (weight / weightTotal) * 100 : 0} className="mt-2 h-2" />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Key Metrics Grid - Enhanced */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mb-8">
          {metricCardItems.map((metric) => (
            <MetricCard
              key={metric.key}
              title={metric.label}
              value={metric.value}
              subtitle={metric.subtitle}
              icon={metric.icon}
              trend={metric.trend}
              color={metric.color}
            />
          ))}
        </div>

        {metricChartData.length > 0 && (
          <Card className="mb-8 border-0 shadow-2xl backdrop-blur-sm bg-white/90 dark:bg-gray-900/90">
            <CardHeader className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl">
                    <PieChart className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Metric Performance Overview</CardTitle>
                    <CardDescription>Normalized averages across all analyzed metrics</CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className={`grid gap-6 ${metricChartData.length > 1 ? 'lg:grid-cols-2' : 'grid-cols-1'}`}>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metricChartData} margin={{ left: 0, right: 12 }}>
                      <XAxis dataKey="metric" tick={{ fontSize: 12 }} angle={-10} textAnchor="end" height={60} interval={0} />
                      <YAxis domain={[0, 10]} tick={{ fontSize: 12 }} />
                      <RechartsTooltip formatter={chartTooltipFormatter} />
                      <Legend />
                      <Bar dataKey="score" name="Normalized Score" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={metricChartData} margin={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 10]} tick={{ fontSize: 12 }} />
                      <Radar
                        name="Normalized Score"
                        dataKey="score"
                        stroke="#6366f1"
                        fill="#6366f1"
                        fillOpacity={0.3}
                      />
                      <Legend />
                      <RechartsTooltip formatter={radarTooltipFormatter} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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


        {hasCustomQuestions && (
          <Card className="mb-8 border-0 shadow-2xl backdrop-blur-sm bg-white/90 dark:bg-gray-900/90">
            <CardHeader className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl">
                    <LayoutGrid className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Custom Question Responses</CardTitle>
                    <CardDescription>Quick view of persona answers to custom prompts</CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-3">
              {aggregatedCustomQuestions.map((qa, idx) => (
                <div
                  key={`${qa.question}-${idx}`}
                  className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/60"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{qa.question}</p>
                    <Badge variant="outline" className="text-xs">
                      {qa.answers.length} response{qa.answers.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                  <ul className="mt-2 space-y-1 text-sm text-gray-700 dark:text-gray-300 max-h-32 overflow-y-auto list-disc list-inside">
                    {qa.answers.map((answer, answerIdx) => (
                      <li key={`${qa.question}-${answerIdx}`}>{answer}</li>
                    ))}
                  </ul>
                </div>
              ))}
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
                    {showCompositeScore && (
                      <th className="p-4 text-center text-sm font-medium text-gray-700 dark:text-gray-300">
                        <div className="flex items-center justify-center gap-1">
                          <Gauge className="h-4 w-4" />
                          Overall
                        </div>
                      </th>
                    )}
                    {metricColumns.map((metric) => (
                      <th key={metric.key} className="p-4 text-center text-sm font-medium text-gray-700 dark:text-gray-300">
                        <div className="flex items-center justify-center gap-1">
                          {metric.icon && <metric.icon className="h-4 w-4" />}
                          {metric.label}
                        </div>
                      </th>
                    ))}
                    {hasCustomQuestions && (
                      <th className="p-4 text-center text-sm font-medium text-gray-700 dark:text-gray-300">
                        Custom Q&A
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
                      {showCompositeScore && (
                        <td className="p-4 text-center">
                          {(() => {
                            const compositeScore = computeCompositeScore(response);
                            if (compositeScore === undefined) return <span className="text-xs text-gray-500">—</span>;
                            return (
                              <div className="flex flex-col items-center gap-1">
                                <span className={`text-lg font-bold ${computeScoreColor(compositeScore)}`}>
                                  {compositeScore.toFixed(2)}
                                </span>
                                <Progress
                                  value={computeScoreProgress(compositeScore)}
                                  className="w-16 h-1.5"
                                />
                              </div>
                            );
                          })()}
                        </td>
                      )}
                      {metricColumns.map((metric) => (
                        <td key={`${response.persona_id}-${metric.key}`} className="p-4 text-center">
                          {renderMetricCell(response, metric)}
                        </td>
                      ))}
                      {hasCustomQuestions && (
                        <td className="p-4 text-center">
                          {(() => {
                            const qaResponses = extractCustomQuestions(response);
                            if (qaResponses.length === 0) return <span className="text-xs text-gray-500">—</span>;
                            return (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedQAResponse({ persona: response.persona_name, qas: qaResponses })}
                              >
                                View ({qaResponses.length})
                              </Button>
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
