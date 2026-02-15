import { Brain, MessageSquare, Shield, Target, AlertCircle } from "lucide-react"
import type { AnalyzedMetricKey, FrontendMetricId } from "@/types/analytics"
import type { LucideIcon } from "lucide-react"

type MetricKind = "score" | "sentiment" | "flag"

export interface MetricDefinition {
  id: FrontendMetricId | string
  backendKeys: AnalyzedMetricKey[]
  label: string
  description: string
  type: MetricKind
  scale: { min: number; max: number }
  defaultSelected?: boolean
  defaultWeight?: number
  icon?: { component: LucideIcon; color: string; bgColor: string }
}

export const metricRegistry: MetricDefinition[] = [
  {
    id: "emotional_response",
    backendKeys: ["sentiment", "emotional_response"],
    label: "Emotional Response",
    description: "Primary emotional reaction and sentiment toward messaging",
    type: "sentiment",
    scale: { min: -1, max: 1 },
    defaultSelected: true,
    defaultWeight: 1,
    icon: {
      component: Brain,
      color: "text-violet-600",
      bgColor: "bg-violet-100 dark:bg-violet-900/30",
    },
  },
  {
    id: "message_clarity",
    backendKeys: ["message_clarity"],
    label: "Message Clarity",
    description: "How well they understand the key messages",
    type: "score",
    scale: { min: 0, max: 10 },
    defaultSelected: true,
    defaultWeight: 1,
    icon: {
      component: MessageSquare,
      color: "text-blue-600",
      bgColor: "bg-blue-100 dark:bg-blue-900/30",
    },
  },
  {
    id: "brand_trust",
    backendKeys: ["trust_in_brand", "brand_trust"],
    label: "Brand Trust",
    description: "Credibility and trustworthiness of the message and brand",
    type: "score",
    scale: { min: 0, max: 10 },
    defaultSelected: true,
    defaultWeight: 1,
    icon: {
      component: Shield,
      color: "text-emerald-600",
      bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
    },
  },
  {
    id: "intent_to_action",
    backendKeys: ["purchase_intent", "intent_to_action"],
    label: "Request/Prescribe Intent",
    description: "Likelihood to request (patients) or prescribe (HCPs)",
    type: "score",
    scale: { min: 0, max: 10 },
    defaultSelected: true,
    defaultWeight: 1,
    icon: {
      component: Target,
      color: "text-amber-600",
      bgColor: "bg-amber-100 dark:bg-amber-900/30",
    },
  },
  {
    id: "key_concerns",
    backendKeys: ["key_concerns", "key_concern_flagged"],
    label: "Key Concerns",
    description: "Barriers and objections identified",
    type: "flag",
    scale: { min: 0, max: 1 },
    defaultSelected: false,
    defaultWeight: 1,
    icon: {
      component: AlertCircle,
      color: "text-red-600",
      bgColor: "bg-red-100 dark:bg-red-900/30",
    },
  },
]

const registryById = new Map(metricRegistry.map((metric) => [metric.id, metric]))
const registryByBackendKey = new Map<AnalyzedMetricKey | string, MetricDefinition>()
metricRegistry.forEach((metric) => {
  metric.backendKeys.forEach((key) => registryByBackendKey.set(key, metric))
})

export function getMetricById(id: FrontendMetricId | string): MetricDefinition | undefined {
  return registryById.get(id as FrontendMetricId)
}

export function getMetricByBackendKey(key: string): MetricDefinition | undefined {
  return registryByBackendKey.get(key)
}

export function normalizeBackendMetricKey(key: string): AnalyzedMetricKey {
  const match = getMetricByBackendKey(key)
  return match?.backendKeys[0] ?? (key as AnalyzedMetricKey)
}

export function mapFrontendMetricToBackend(frontendId: FrontendMetricId): AnalyzedMetricKey {
  const metric = getMetricById(frontendId)
  return metric?.backendKeys[0] ?? (frontendId as AnalyzedMetricKey)
}

export function mapBackendMetricToFrontend(backendKey: string): FrontendMetricId | string {
  const metric = getMetricByBackendKey(backendKey)
  return metric?.id ?? backendKey
}
