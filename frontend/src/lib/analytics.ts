import type { TrendDirection, AnalyzedMetricKey, FrontendMetricId } from '@/types/analytics';

// Metric mapping between frontend IDs and backend keys
const METRIC_MAPPING: Record<FrontendMetricId, AnalyzedMetricKey> = {
  'emotional_response': 'sentiment',
  'message_clarity': 'message_clarity',
  'brand_trust': 'trust_in_brand',
  'intent_to_action': 'purchase_intent',
  'key_concerns': 'key_concerns'
};

const REVERSE_METRIC_MAPPING: Record<string, FrontendMetricId> = {
  'sentiment': 'emotional_response',
  'message_clarity': 'message_clarity',
  'trust_in_brand': 'brand_trust',
  'purchase_intent': 'intent_to_action',
  'key_concerns': 'key_concerns',
  'key_concern_flagged': 'key_concerns'
};

/**
 * Maps a frontend metric ID to the corresponding backend metric key
 */
export function mapFrontendMetricToBackend(frontendId: FrontendMetricId): AnalyzedMetricKey {
  return METRIC_MAPPING[frontendId] || frontendId as AnalyzedMetricKey;
}

/**
 * Maps a backend metric key to the corresponding frontend metric ID
 */
export function mapBackendMetricToFrontend(backendKey: string): FrontendMetricId | string {
  return REVERSE_METRIC_MAPPING[backendKey] || backendKey;
}

/**
 * Normalizes metric key to handle both naming conventions
 */
export function normalizeMetricKey(metric: string): string {
  // Map common variations to canonical form
  const normalized: Record<string, string> = {
    'emotional_response': 'sentiment',
    'brand_trust': 'trust_in_brand',
    'intent_to_action': 'purchase_intent',
    'key_concern_flagged': 'key_concerns'
  };
  return normalized[metric] || metric;
}

export function normalizeMetricScore(metric: string, score: number): number {
  const key = normalizeMetricKey(metric);
  if (key === 'sentiment') {
    // Convert -1 to 1 sentiment into a 0-10 scale
    return ((score + 1) / 2) * 10;
  }
  return score;
}

export function formatMetricLabel(metric: string): string {
  return normalizeMetricKey(metric)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function computeScoreColor(score: number, max: number = 10): string {
  const percentage = (score / max) * 100;
  if (percentage >= 70) return 'text-emerald-600';
  if (percentage >= 40) return 'text-amber-600';
  return 'text-red-600';
}

export function computeScoreProgress(score: number, max: number = 10): number {
  return (score / max) * 100;
}

export function getTrendFromScore(score: number, threshold: number): TrendDirection {
  if (score > threshold) return 'up';
  if (score < threshold) return 'down';
  return 'neutral';
}

export function getSentimentDescriptor(sentiment: number): {
  level: 'Positive' | 'Neutral' | 'Negative';
  color: string;
  badgeClassName: string;
  iconTone: 'up' | 'down' | 'neutral';
} {
  if (sentiment > 0.2) {
    return {
      level: 'Positive',
      color: 'text-emerald-600',
      badgeClassName: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
      iconTone: 'up',
    };
  }
  if (sentiment < -0.2) {
    return {
      level: 'Negative',
      color: 'text-red-600',
      badgeClassName: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      iconTone: 'down',
    };
  }
  return {
    level: 'Neutral',
    color: 'text-gray-600',
    badgeClassName: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
    iconTone: 'neutral',
  };
}
