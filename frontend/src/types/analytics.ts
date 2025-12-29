// Types for Analytics domain

// Frontend metric IDs (used in SimulationHub)
export type FrontendMetricId =
  | 'emotional_response'
  | 'message_clarity'
  | 'brand_trust'
  | 'intent_to_action'
  | 'key_concerns';

// Backend metric keys (used in API responses)
export type AnalyzedMetricKey =
  | 'purchase_intent'
  | 'sentiment'
  | 'trust_in_brand'
  | 'message_clarity'
  | 'key_concern_flagged'
  | 'key_concerns'
  | 'emotional_response'  // Support both naming conventions
  | 'brand_trust'
  | 'intent_to_action';

export interface SummaryStatistics {
  intent_to_action_avg?: number;
  purchase_intent_avg?: number;  // legacy alias
  emotional_response_avg?: number;
  sentiment_avg?: number;        // legacy alias
  brand_trust_avg?: number;
  trust_in_brand_avg?: number;   // legacy alias
  message_clarity_avg?: number;
}

export interface PersonaResponseScores {
  intent_to_action?: number;
  purchase_intent?: number;  // legacy alias
  emotional_response?: number;
  sentiment?: number;        // legacy alias
  brand_trust?: number;
  trust_in_brand?: number;   // legacy alias
  message_clarity?: number;
  key_concern_flagged?: string | boolean | number;
  key_concerns?: string | boolean | number;  // Support both naming conventions
}

export interface IndividualResponseRow {
  persona_id: number | string;
  persona_name: string;
  avatar_url?: string;
  persona_type?: string;
  reasoning: string;
  responses: PersonaResponseScores;
  answers?: string[];
}

export interface ActionableSuggestion {
  suggestion: string;
  reasoning: string;
}

export interface AnalysisResults {
  cohort_size: number;
  stimulus_text: string;
  metrics_analyzed: AnalyzedMetricKey[];
  questions?: string[];
  individual_responses: IndividualResponseRow[];
  summary_statistics: SummaryStatistics;
  insights?: string[];
  suggestions?: ActionableSuggestion[];
  preamble?: string;
  created_at: string;
}

export type TrendDirection = 'up' | 'down' | 'neutral';
