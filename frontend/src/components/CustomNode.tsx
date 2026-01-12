import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

// Node type visual mapping (High contrast)
const NODE_STYLES: Record<string, { border: string; text: string; bg: string; badge: string; accent: string }> = {
    // Brand - Purple/Indigo
    key_message: { border: 'border-purple-500', text: 'text-purple-950', bg: 'bg-white', badge: 'bg-purple-100 text-purple-800', accent: 'bg-purple-600' },
    value_proposition: { border: 'border-fuchsia-500', text: 'text-fuchsia-950', bg: 'bg-white', badge: 'bg-fuchsia-100 text-fuchsia-800', accent: 'bg-fuchsia-600' },
    differentiator: { border: 'border-violet-500', text: 'text-violet-950', bg: 'bg-white', badge: 'bg-violet-100 text-violet-800', accent: 'bg-violet-600' },
    proof_point: { border: 'border-indigo-500', text: 'text-indigo-950', bg: 'bg-white', badge: 'bg-indigo-100 text-indigo-800', accent: 'bg-indigo-600' },

    // Disease - Blue/Cyan
    epidemiology: { border: 'border-blue-500', text: 'text-blue-950', bg: 'bg-white', badge: 'bg-blue-100 text-blue-800', accent: 'bg-blue-600' },
    symptom_burden: { border: 'border-sky-500', text: 'text-sky-950', bg: 'bg-white', badge: 'bg-sky-100 text-sky-800', accent: 'bg-sky-600' },
    treatment_landscape: { border: 'border-cyan-500', text: 'text-cyan-950', bg: 'bg-white', badge: 'bg-cyan-100 text-cyan-800', accent: 'bg-cyan-600' },
    unmet_need: { border: 'border-amber-500', text: 'text-amber-950', bg: 'bg-white', badge: 'bg-amber-100 text-amber-800', accent: 'bg-amber-600' },

    // Patient - Green/Emerald
    patient_motivation: { border: 'border-emerald-500', text: 'text-emerald-950', bg: 'bg-white', badge: 'bg-emerald-100 text-emerald-800', accent: 'bg-emerald-600' },
    patient_belief: { border: 'border-green-500', text: 'text-green-950', bg: 'bg-white', badge: 'bg-green-100 text-green-800', accent: 'bg-green-600' },
    patient_tension: { border: 'border-rose-500', text: 'text-rose-950', bg: 'bg-white', badge: 'bg-rose-100 text-rose-800', accent: 'bg-rose-600' },
    journey_insight: { border: 'border-yellow-500', text: 'text-yellow-950', bg: 'bg-white', badge: 'bg-yellow-100 text-yellow-800', accent: 'bg-yellow-600' },

    // HCP - Orange
    prescribing_driver: { border: 'border-orange-500', text: 'text-orange-950', bg: 'bg-white', badge: 'bg-orange-100 text-orange-800', accent: 'bg-orange-600' },
    clinical_concern: { border: 'border-red-500', text: 'text-red-950', bg: 'bg-white', badge: 'bg-red-100 text-red-800', accent: 'bg-red-600' },
    practice_constraint: { border: 'border-pink-500', text: 'text-pink-950', bg: 'bg-white', badge: 'bg-pink-100 text-pink-800', accent: 'bg-pink-600' },

    // Market - Gray
    competitor_position: { border: 'border-gray-500', text: 'text-gray-950', bg: 'bg-white', badge: 'bg-gray-100 text-gray-800', accent: 'bg-gray-600' },
    market_barrier: { border: 'border-slate-500', text: 'text-slate-950', bg: 'bg-white', badge: 'bg-slate-100 text-slate-800', accent: 'bg-slate-600' },
};

const DEFAULT_STYLE = { border: 'border-gray-300', text: 'text-gray-900', bg: 'bg-white', badge: 'bg-gray-100 text-gray-800', accent: 'bg-gray-500' };

export default memo(({ data, selected }: { data: any; selected?: boolean }) => {
    const style = NODE_STYLES[data.node_type] || DEFAULT_STYLE;

    return (
        <div className={cn(
            "relative group transition-all duration-300",
            selected ? "scale-105 z-50" : "scale-100 z-0"
        )}>
            {/* Connection Handle - Top */}
            <Handle type="target" position={Position.Top} className="!w-3 !h-3 !-top-1.5 !bg-gray-400 border-2 border-white" />

            {/* Main Card Container */}
            <div className={cn(
                "w-[280px] rounded-lg border-2 shadow-sm bg-white overflow-hidden flex flex-col",
                style.border,
                selected ? "ring-2 ring-blue-500 ring-offset-2" : "hover:shadow-md"
            )}>
                {/* Top Colored Bar */}
                <div className={cn("h-2 w-full shrink-0", style.accent)} />

                {/* Header Section */}
                <div className="p-3 pb-2 flex items-center justify-between gap-2 border-b border-gray-100">
                    <span className={cn(
                        "text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-sm whitespace-nowrap overflow-hidden text-ellipsis",
                        style.badge
                    )}>
                        {data.node_type?.replace(/_/g, ' ') || 'UNKNOWN TYPE'}
                    </span>
                    {data.verified && <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />}
                </div>

                {/* Content Section */}
                <div className="p-3 pt-2 bg-white">
                    <p className={cn("text-sm font-semibold leading-snug line-clamp-3 text-slate-900", style.text)}>
                        {data.label || "No content available"}
                    </p>

                    {data.segment && (
                        <div className="mt-2 flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0" />
                            <p className="text-xs text-gray-500 truncate font-medium">
                                {data.segment}
                            </p>
                        </div>
                    )}

                    {data.confidence && (
                        <div className="mt-3 flex items-center gap-2">
                            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Conf</span>
                            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden border border-gray-100">
                                <div
                                    className={cn("h-full rounded-full", style.accent)}
                                    style={{ width: `${data.confidence * 100}%` }}
                                />
                            </div>
                            <span className="text-[9px] text-gray-400 font-mono">
                                {Math.round(data.confidence * 100)}%
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Connection Handle - Bottom */}
            <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !-bottom-1.5 !bg-gray-400 border-2 border-white" />
        </div>
    );
});
