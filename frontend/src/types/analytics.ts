// Types for Analytics domain

export type AnalyzedMetricKey =
  | 'purchase_intent'
  | 'sentiment'
  | 'trust_in_brand'
  | 'message_clarity'
  | 'key_concern_flagged';

export interface SummaryStatistics {
  purchase_intent_avg?: number;
  sentiment_avg?: number;
  trust_in_brand_avg?: number;
  message_clarity_avg?: number;
}

export interface PersonaResponseScores {
  purchase_intent?: number;
  sentiment?: number;
  trust_in_brand?: number;
  message_clarity?: number;
  key_concern_flagged?: string | boolean | number;
}

export interface IndividualResponseRow {
  persona_id: number | string;
  persona_name: string;
  reasoning: string;
  responses: PersonaResponseScores;
}

export interface AnalysisResults {
  cohort_size: number;
  stimulus_text: string;
  metrics_analyzed: AnalyzedMetricKey[];
  individual_responses: IndividualResponseRow[];
  summary_statistics: SummaryStatistics;
  insights?: string[];
  suggestions?: string[];
  preamble?: string;
  created_at: string;
}

export type TrendDirection = 'up' | 'down' | 'neutral';
