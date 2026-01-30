import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle, Lightbulb, ImageIcon } from 'lucide-react';
import type { SyntheticTestingResponse } from '@/lib/api';

interface Asset {
    id: string;
    name: string;
    preview?: string;
}

interface ComparativeAnalysisTableProps {
    results: SyntheticTestingResponse | null;
    assets: Asset[];
}

export const ComparativeAnalysisTable: React.FC<ComparativeAnalysisTableProps> = ({ results, assets }) => {
    if (!results) return null;

    // Helper to group feedback by asset
    // We want to show a consolidated view. Since we don't have a backend consolidated "text" yet for qualitative,
    // we will merge all bullets from all personas for a given asset.
    // To avoid overwhelming text, we might want to deduplicate or just show the top ones.
    // For now, let's show per-persona attributed points or just a list if anonymous.

    // Better approach matching the user's "Summary of Concept Findings":
    // It seems to be a high level summary.
    // Let's aggregate: For each asset, collect all 'does_well', 'challenges', 'considerations'.

    const getAssetFeedback = (assetId: string) => {
        const assetResults = results.results.filter(r => r.asset_id === assetId);

        // Flatten lists
        const doesWell = assetResults.flatMap(r => r.feedback?.does_well || []);
        const challenges = assetResults.flatMap(r => r.feedback?.does_not_do_well || []);
        const considerations = assetResults.flatMap(r => r.feedback?.considerations || []);

        // Simple dedupe (exact string match)
        const uniqueDoesWell = Array.from(new Set(doesWell));
        const uniqueChallenges = Array.from(new Set(challenges));
        const uniqueConsiderations = Array.from(new Set(considerations));

        return {
            doesWell: uniqueDoesWell,
            challenges: uniqueChallenges,
            considerations: uniqueConsiderations,
            // Get aggregated stats
            stats: results.aggregated[assetId]
        };
    };

    return (
        <Card className="shadow-sm border-slate-200 dark:border-slate-800">
            <CardHeader className="bg-slate-50 dark:bg-slate-900/50 pb-4">
                <CardTitle className="text-xl text-center">Summary of Concept Findings and Areas for Potential Improvement</CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                    <thead>
                        <tr className="text-white">
                            <th className="p-4 bg-slate-800 dark:bg-slate-950 text-left w-1/4 min-w-[250px] rounded-tl-lg">
                                Cover Concepts
                            </th>
                            <th className="p-4 bg-emerald-700 dark:bg-emerald-900 text-left w-1/4 min-w-[250px]">
                                What This Cover Concept <br /> Does Well
                            </th>
                            <th className="p-4 bg-amber-700 dark:bg-amber-900 text-left w-1/4 min-w-[250px]">
                                What This Cover Concept <br /> Does Not Do as Well
                            </th>
                            <th className="p-4 bg-blue-800 dark:bg-blue-900 text-left w-1/4 min-w-[250px] rounded-tr-lg">
                                Considerations to Improve <br /> Cover Concept
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {assets.map((asset, idx) => {
                            const data = getAssetFeedback(asset.id);
                            if (!data.stats) return null; // Should not happen if results exist

                            return (
                                <tr key={asset.id} className="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    {/* Asset Column */}
                                    <td className="p-4 align-top border-r dark:border-slate-800 relative bg-slate-50/10">
                                        <div className="flex flex-col gap-3">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Badge className="bg-slate-700 hover:bg-slate-600 rounded-full h-6 w-6 flex items-center justify-center p-0">
                                                    {idx + 1}
                                                </Badge>
                                                <span className="font-bold text-lg">{asset.name}</span>
                                            </div>

                                            <div className="relative aspect-[4/3] w-full bg-slate-100 dark:bg-slate-800 rounded-md overflow-hidden border shadow-sm">
                                                {asset.preview ? (
                                                    <img
                                                        src={asset.preview}
                                                        alt={asset.name}
                                                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                                                    />
                                                ) : (
                                                    <div className="flex items-center justify-center h-full text-slate-400">
                                                        <ImageIcon className="h-10 w-10" />
                                                    </div>
                                                )}
                                                <div className="absolute font-bold bottom-0 left-0 right-0 bg-black/60 text-white p-2 text-xs backdrop-blur-sm flex justify-between">
                                                    <span>Pref: {data.stats.average_preference}%</span>
                                                    <span>N={data.stats.respondent_count}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Does Well - Green Tint */}
                                    <td className="p-4 align-top border-r dark:border-slate-800 bg-emerald-50/10 dark:bg-emerald-950/5">
                                        <ul className="space-y-3">
                                            {data.doesWell.slice(0, 6).map((point, i) => (
                                                <li key={i} className="flex gap-2">
                                                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                                                    <span className="text-slate-700 dark:text-slate-300">{point}</span>
                                                </li>
                                            ))}
                                            {data.doesWell.length === 0 && <span className="text-slate-400 italic">No specific strengths flagged.</span>}
                                        </ul>
                                    </td>

                                    {/* Challenges - Amber Tint */}
                                    <td className="p-4 align-top border-r dark:border-slate-800 bg-amber-50/10 dark:bg-amber-950/5">
                                        <ul className="space-y-3">
                                            {data.challenges.slice(0, 6).map((point, i) => (
                                                <li key={i} className="flex gap-2">
                                                    <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                                                    <span className="text-slate-700 dark:text-slate-300">{point}</span>
                                                </li>
                                            ))}
                                            {data.challenges.length === 0 && <span className="text-slate-400 italic">No specific challenges flagged.</span>}
                                        </ul>
                                    </td>

                                    {/* Considerations - Blue Tint */}
                                    <td className="p-4 align-top bg-blue-50/10 dark:bg-blue-950/5">
                                        <ul className="space-y-3">
                                            {data.considerations.slice(0, 6).map((point, i) => (
                                                <li key={i} className="flex gap-2">
                                                    <Lightbulb className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                                                    <span className="text-slate-700 dark:text-slate-300">{point}</span>
                                                </li>
                                            ))}
                                            {data.considerations.length === 0 && <span className="text-slate-400 italic">No specific considerations.</span>}
                                        </ul>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </CardContent>
        </Card>
    );
};
