import type { AnalysisResults, IndividualResponseRow } from '@/types/analytics';
import { formatMetricLabel, normalizeMetricKey } from '@/lib/analytics';

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

    const metricOrder = Array.from(new Set(metrics_analyzed.map((metric) => normalizeMetricKey(metric))));

    const headers = ['Persona Name', 'Persona ID', 'Reasoning', ...metricOrder.map((metric) => formatMetricLabel(metric))];

    const rows = individual_responses.map((response) => {
        const row = [
            `"${response.persona_name}"`,
            response.persona_id,
            `"${response.reasoning.replace(/"/g, '""')}"`
        ];

        metricOrder.forEach((metric) => {
            const value = getMetricValue(response, metric);
            if (typeof value === 'string') {
                row.push(`"${value.replace(/"/g, '""')}"`);
            } else {
                row.push(value === undefined || value === null ? '' : String(value));
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
