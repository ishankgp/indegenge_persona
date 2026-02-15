import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, AlertCircle, Lightbulb, ChevronRight } from 'lucide-react';
import type { PanelFeedbackSummary } from '@/lib/api';

interface PanelFeedbackSummaryProps {
    summary: PanelFeedbackSummary | null;
    personaCount?: number;
    isLoading?: boolean;
}

const LoadingSummary: React.FC = () => (
    <Card className="animate-pulse bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/50 dark:to-purple-950/50">
        <CardHeader>
            <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="space-y-2">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded" />
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-5/6" />
            </div>
        </CardContent>
    </Card>
);

export const PanelFeedbackSummaryComponent: React.FC<PanelFeedbackSummaryProps> = ({
    summary,
    personaCount = 0,
    isLoading = false,
}) => {
    if (isLoading) {
        return <LoadingSummary />;
    }

    if (!summary) {
        return null;
    }

    return (
        <Card className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-950/50 dark:via-purple-950/50 dark:to-pink-950/50 border-indigo-200 dark:border-indigo-800">
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                    Panel Synthesis
                    <Badge variant="secondary" className="ml-2">
                        {personaCount} {personaCount === 1 ? 'persona' : 'personas'}
                    </Badge>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Aggregated Themes */}
                {summary.aggregated_themes && summary.aggregated_themes.length > 0 && (
                    <div className="space-y-2">
                        <h4 className="font-medium text-sm flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
                            <Lightbulb className="h-4 w-4" />
                            Aggregated Themes
                        </h4>
                        <ul className="space-y-2">
                            {summary.aggregated_themes.map((theme, idx) => (
                                <li
                                    key={idx}
                                    className="flex items-start gap-2 text-sm bg-white/60 dark:bg-slate-800/60 p-2 rounded-lg"
                                >
                                    <ChevronRight className="h-4 w-4 mt-0.5 text-indigo-500 flex-shrink-0" />
                                    <span>{theme}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Dissent Highlights */}
                {summary.dissent_highlights && summary.dissent_highlights.length > 0 && (
                    <div className="space-y-2">
                        <h4 className="font-medium text-sm flex items-center gap-2 text-amber-700 dark:text-amber-300">
                            <AlertCircle className="h-4 w-4" />
                            Dissent Highlights
                        </h4>
                        <ul className="space-y-2">
                            {summary.dissent_highlights.map((dissent, idx) => (
                                <li
                                    key={idx}
                                    className="flex items-start gap-2 text-sm bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 p-2 rounded-lg"
                                >
                                    <AlertCircle className="h-4 w-4 mt-0.5 text-amber-500 flex-shrink-0" />
                                    <span>{dissent}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Recommendations */}
                {summary.recommendations && summary.recommendations.length > 0 && (
                    <div className="space-y-2">
                        <h4 className="font-medium text-sm flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                            <TrendingUp className="h-4 w-4" />
                            Actionable Recommendations
                        </h4>
                        <div className="space-y-3">
                            {summary.recommendations.map((rec, idx) => (
                                <div
                                    key={idx}
                                    className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 p-3 rounded-lg"
                                >
                                    <p className="font-medium text-sm text-emerald-800 dark:text-emerald-200">
                                        {rec.suggestion}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">{rec.reasoning}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default PanelFeedbackSummaryComponent;
