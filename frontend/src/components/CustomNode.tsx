import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

// Node type visual mapping (High contrast)
const NODE_STYLES: Record<string, { border: string; text: string; label: string; accent: string }> = {
    // Brand - Purple/Indigo
    key_message: { border: 'border-purple-300 dark:border-purple-700', text: 'text-purple-950 dark:text-purple-100', label: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200', accent: 'bg-purple-500' },
    value_proposition: { border: 'border-fuchsia-300 dark:border-fuchsia-700', text: 'text-fuchsia-950 dark:text-fuchsia-100', label: 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900 dark:text-fuchsia-200', accent: 'bg-fuchsia-500' },
    differentiator: { border: 'border-violet-300 dark:border-violet-700', text: 'text-violet-950 dark:text-violet-100', label: 'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200', accent: 'bg-violet-500' },
    proof_point: { border: 'border-indigo-300 dark:border-indigo-700', text: 'text-indigo-950 dark:text-indigo-100', label: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200', accent: 'bg-indigo-500' },

    // Disease - Blue/Cyan
    epidemiology: { border: 'border-blue-300 dark:border-blue-700', text: 'text-blue-950 dark:text-blue-100', label: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', accent: 'bg-blue-500' },
    symptom_burden: { border: 'border-sky-300 dark:border-sky-700', text: 'text-sky-950 dark:text-sky-100', label: 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200', accent: 'bg-sky-500' },
    treatment_landscape: { border: 'border-cyan-300 dark:border-cyan-700', text: 'text-cyan-950 dark:text-cyan-100', label: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200', accent: 'bg-cyan-500' },
    unmet_need: { border: 'border-amber-300 dark:border-amber-700', text: 'text-amber-950 dark:text-amber-100', label: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200', accent: 'bg-amber-500' },

    // Patient - Green/Emerald
    patient_motivation: { border: 'border-emerald-300 dark:border-emerald-700', text: 'text-emerald-950 dark:text-emerald-100', label: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200', accent: 'bg-emerald-500' },
    patient_belief: { border: 'border-green-300 dark:border-green-700', text: 'text-green-950 dark:text-green-100', label: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', accent: 'bg-green-500' },
    patient_tension: { border: 'border-rose-300 dark:border-rose-700', text: 'text-rose-950 dark:text-rose-100', label: 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200', accent: 'bg-rose-500' },
    journey_insight: { border: 'border-yellow-300 dark:border-yellow-700', text: 'text-yellow-950 dark:text-yellow-100', label: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', accent: 'bg-yellow-500' },

    // HCP - Orange
    prescribing_driver: { border: 'border-orange-300 dark:border-orange-700', text: 'text-orange-950 dark:text-orange-100', label: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200', accent: 'bg-orange-500' },
    clinical_concern: { border: 'border-red-300 dark:border-red-700', text: 'text-red-950 dark:text-red-100', label: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', accent: 'bg-red-500' },
    practice_constraint: { border: 'border-pink-300 dark:border-pink-700', text: 'text-pink-950 dark:text-pink-100', label: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200', accent: 'bg-pink-500' },

    // Market - Gray
    competitor_position: { border: 'border-gray-300 dark:border-gray-600', text: 'text-gray-950 dark:text-gray-100', label: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200', accent: 'bg-gray-500' },
    market_barrier: { border: 'border-slate-300 dark:border-slate-600', text: 'text-slate-950 dark:text-slate-100', label: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200', accent: 'bg-slate-500' },
};

const DEFAULT_STYLE = { border: 'border-gray-200', text: 'text-gray-900', label: 'bg-gray-100', accent: 'bg-gray-500' };

export default memo(({ data, selected }: { data: any; selected?: boolean }) => {
    const style = NODE_STYLES[data.node_type] || DEFAULT_STYLE;

    return (
        <div className={cn(
            "relative group transition-all duration-300",
            selected ? "scale-105 z-50" : "scale-100 z-0"
        )}>
            {/* Connection Handle - Top */}
            <Handle type="target" position={Position.Top} className="!w-3 !h-3 !-top-1.5 !bg-gray-400 border-2 border-white" />

            {/* Main Card */}
            <Card className={cn(
                "w-[280px] border shadow-sm transition-all duration-300 bg-white dark:bg-gray-800 overflow-hidden",
                style.border,
                selected ? "ring-2 ring-primary ring-offset-2" : "hover:shadow-md"
            )}>
                {/* Top Colored Bar */}
                <div className={cn("h-1.5 w-full", style.accent)} />

                <CardHeader className="p-3 pb-2 space-y-0">
                    <div className="flex items-center justify-between gap-2">
                        <Badge variant="secondary" className={cn(
                            "text-[10px] font-bold tracking-wider uppercase border-0 px-2 py-0.5 rounded-sm",
                            style.label
                        )}>
                            {data.node_type?.replace(/_/g, ' ')}
                        </Badge>
                        {data.verified && <CheckCircle className="w-3.5 h-3.5 text-green-500" />}
                    </div>
                </CardHeader>

                <CardContent className="p-3 pt-1">
                    <p className={cn("text-sm font-semibold leading-snug line-clamp-3", style.text)}>
                        {data.label}
                    </p>

                    {data.segment && (
                        <div className="mt-2 flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {data.segment}
                            </p>
                        </div>
                    )}

                    {data.confidence && (
                        <div className="mt-3 flex items-center gap-2">
                            <span className="text-[10px] text-gray-400 font-mono">CONF</span>
                            <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div
                                    className={cn("h-full rounded-full", style.accent)}
                                    style={{ width: `${data.confidence * 100}%` }}
                                />
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Connection Handle - Bottom */}
            <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !-bottom-1.5 !bg-gray-400 border-2 border-white" />
        </div>
    );
});
