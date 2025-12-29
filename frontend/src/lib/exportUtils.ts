import type { AnalysisResults } from '@/types/analytics';
import type { MetricDefinition } from './metricsRegistry';
import { getMetricByBackendKey, normalizeBackendMetricKey } from './metricsRegistry';

export function exportToJSON(analysisResults: AnalysisResults, filename?: string) {
    const dataStr = JSON.stringify(analysisResults, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = filename || `simulation_${new Date().toISOString().split('T')[0]}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
}

export function exportToCSV(analysisResults: AnalysisResults, filename?: string) {
    const { individual_responses, metrics_analyzed } = analysisResults;

    const metricDefinitions: MetricDefinition[] = Array.from(
        (metrics_analyzed || []).reduce((map, metricKey) => {
            const normalized = normalizeBackendMetricKey(metricKey);
            const definition = getMetricByBackendKey(normalized) || {
                id: normalized,
                backendKeys: [normalized],
                label: normalized.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
                description: '',
                type: 'score',
                scale: { min: 0, max: 10 }
            };
            if (!map.has(definition.id)) {
                map.set(definition.id, definition);
            }
            return map;
        }, new Map<string, MetricDefinition>()).values()
    );

    const headers = ['Persona Name', 'Persona ID', 'Reasoning', ...metricDefinitions.map((metric) => metric.label)];

    const getResponseValue = (response: any, metric: MetricDefinition) => {
        const keysToCheck = [metric.id, ...(metric.backendKeys || [])];
        for (const key of keysToCheck) {
            const value = response.responses?.[key];
            if (value !== undefined && value !== null) return value;
        }
        return '';
    };

    const rows = individual_responses.map((response) => {
        const row = [
            `"${response.persona_name}"`,
            response.persona_id,
            `"${response.reasoning.replace(/"/g, '""')}"`
        ];

        metricDefinitions.forEach((metric) => {
            const value = getResponseValue(response, metric);
            if (Array.isArray(value)) {
                row.push(`"${value.map((v) => String(v)).join('; ').replace(/"/g, '""')}"`);
            } else {
                row.push(`"${String(value ?? '').replace(/"/g, '""')}"`);
            }
        });
        return row.join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const dataUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent);
    const exportFileDefaultName = filename || `simulation_${new Date().toISOString().split('T')[0]}.csv`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
}

function getMetricValue(response: IndividualResponseRow, metric: string) {
    const normalized = normalizeMetricKey(metric);
    const variants: Record<string, string[]> = {
        sentiment: ['sentiment', 'emotional_response'],
        purchase_intent: ['purchase_intent', 'intent_to_action'],
        trust_in_brand: ['trust_in_brand', 'brand_trust'],
        message_clarity: ['message_clarity'],
        key_concerns: ['key_concerns', 'key_concern_flagged'],
    };

    const possibleKeys = variants[normalized] || [metric];
    for (const key of possibleKeys) {
        const value = response.responses[key];
        if (value !== undefined && value !== null) {
            return value;
        }
    }
    return '';
}

export async function copyToClipboard(text: string): Promise<boolean> {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (error) {
        console.error('Failed to copy to clipboard:', error);
        return false;
    }
}
