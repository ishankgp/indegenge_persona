import type { TrendDirection } from '@/types/analytics'
import { metricRegistry, mapBackendMetricToFrontend, mapFrontendMetricToBackend, normalizeBackendMetricKey, getMetricByBackendKey } from './metricsRegistry'

/**
 * Maps a frontend metric ID to the corresponding backend metric key
 */
export { mapFrontendMetricToBackend, mapBackendMetricToFrontend, normalizeBackendMetricKey }

export function getMetricLabelFromBackendKey(backendKey: string): string {
  const metric = getMetricByBackendKey(backendKey)
  return metric?.label || backendKey.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
}

export function getMetricScale(backendKey: string): { min: number; max: number } | undefined {
  return getMetricByBackendKey(backendKey)?.scale
}

export function listSentimentBackends(): string[] {
  return metricRegistry.filter((metric) => metric.type === 'sentiment').flatMap((metric) => metric.backendKeys)
}

export function computeScoreColor(score: number, max: number = 10): string {
  const percentage = (score / max) * 100
  if (percentage >= 70) return 'text-emerald-600'
  if (percentage >= 40) return 'text-amber-600'
  return 'text-red-600'
}

export function computeScoreProgress(score: number, max: number = 10): number {
  return (score / max) * 100
}

export function getTrendFromScore(score: number, threshold: number): TrendDirection {
  if (score > threshold) return 'up'
  if (score < threshold) return 'down'
  return 'neutral'
}

export function getSentimentDescriptor(sentiment: number): {
  level: 'Positive' | 'Neutral' | 'Negative'
  color: string
  badgeClassName: string
  iconTone: 'up' | 'down' | 'neutral'
} {
  if (sentiment > 0.2) {
    return {
      level: 'Positive',
      color: 'text-emerald-600',
      badgeClassName: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
      iconTone: 'up',
    }
  }
  if (sentiment < -0.2) {
    return {
      level: 'Negative',
      color: 'text-red-600',
      badgeClassName: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      iconTone: 'down',
    }
  }
  return {
    level: 'Neutral',
    color: 'text-gray-600',
    badgeClassName: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
    iconTone: 'neutral',
  }
}
