import type { AnalysisResults } from '@/types/analytics';

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

    // Create CSV header
    const headers = ['Persona Name', 'Persona ID', 'Reasoning'];
    if (metrics_analyzed.includes('purchase_intent')) headers.push('Purchase Intent');
    if (metrics_analyzed.includes('sentiment')) headers.push('Sentiment');
    if (metrics_analyzed.includes('trust_in_brand')) headers.push('Trust in Brand');
    if (metrics_analyzed.includes('message_clarity')) headers.push('Message Clarity');
    if (metrics_analyzed.includes('key_concern_flagged')) headers.push('Key Concern');

    // Create CSV rows
    const rows = individual_responses.map((response) => {
        const row = [
            `"${response.persona_name}"`,
            response.persona_id,
            `"${response.reasoning.replace(/"/g, '""')}"`
        ];
        if (metrics_analyzed.includes('purchase_intent')) row.push(String(response.responses.purchase_intent || ''));
        if (metrics_analyzed.includes('sentiment')) row.push(String(response.responses.sentiment || ''));
        if (metrics_analyzed.includes('trust_in_brand')) row.push(String(response.responses.trust_in_brand || ''));
        if (metrics_analyzed.includes('message_clarity')) row.push(String(response.responses.message_clarity || ''));
        if (metrics_analyzed.includes('key_concern_flagged')) row.push(`"${response.responses.key_concern_flagged || ''}"`);
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

export async function copyToClipboard(text: string): Promise<boolean> {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (error) {
        console.error('Failed to copy to clipboard:', error);
        return false;
    }
}
