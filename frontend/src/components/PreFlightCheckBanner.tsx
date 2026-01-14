/**
 * PreFlightCheckBanner - Shows persona alignment status before asset analysis
 * 
 * Displays warnings for triggers/gaps found in Knowledge Graph
 * Collapsible design with link to Knowledge Graph for details
 */

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
    AlertTriangle, 
    CheckCircle2, 
    ChevronDown, 
    ChevronUp, 
    Info, 
    Zap,
    ExternalLink,
    Loader2
} from 'lucide-react'
import { api } from '@/lib/api'

interface TriggerInfo {
    persona_id: number
    persona_name: string
    from_message: string
    from_message_id: string
    to_tension: string
    to_tension_id: string
    relationship: string
    strength: number
    context: string
    recommended_approach: string | null
}

interface GapInfo {
    persona_id: number
    persona_name: string
    tension: string
    tension_id: string
    segment: string
    confidence: number
}

interface PreFlightCheckResult {
    personas_checked: { id: number; name: string; persona_type: string }[]
    is_aligned: boolean
    triggers: TriggerInfo[]
    gaps: GapInfo[]
    alignment_score: number
    summary: string
}

interface PreFlightCheckBannerProps {
    brandId: number | null
    personaIds: number[]
    onViewKnowledgeGraph?: () => void
}

export function PreFlightCheckBanner({ 
    brandId, 
    personaIds, 
    onViewKnowledgeGraph 
}: PreFlightCheckBannerProps) {
    const [isExpanded, setIsExpanded] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [result, setResult] = useState<PreFlightCheckResult | null>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!brandId || personaIds.length === 0) {
            setResult(null)
            return
        }

        const fetchCheck = async () => {
            setIsLoading(true)
            setError(null)
            try {
                const response = await api.get(
                    `/api/knowledge/brands/${brandId}/persona-check`,
                    { params: { persona_ids: personaIds.join(',') } }
                )
                setResult(response.data)
            } catch (err: any) {
                console.error('Pre-flight check failed:', err)
                setError('Could not check persona alignment')
                setResult(null)
            } finally {
                setIsLoading(false)
            }
        }

        fetchCheck()
    }, [brandId, personaIds])

    // Don't render if no brand or personas selected
    if (!brandId || personaIds.length === 0) {
        return null
    }

    // Loading state
    if (isLoading) {
        return (
            <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg flex items-center gap-2 text-sm text-gray-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Checking persona alignment...</span>
            </div>
        )
    }

    // Error state
    if (error) {
        return (
            <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg flex items-center gap-2 text-sm text-gray-500">
                <Info className="h-4 w-4" />
                <span>{error}</span>
            </div>
        )
    }

    // No result yet
    if (!result) {
        return null
    }

    // Aligned state (green)
    if (result.is_aligned) {
        return (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span className="text-sm text-emerald-700 font-medium">
                    Personas align with brand messaging
                </span>
            </div>
        )
    }

    // Has triggers or gaps (warning state)
    const hasTriggers = result.triggers.length > 0
    const hasGaps = result.gaps.length > 0

    return (
        <div className="mb-4 border rounded-lg overflow-hidden">
            {/* Header - always visible */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className={`w-full p-3 flex items-center justify-between text-left transition-colors ${
                    hasTriggers 
                        ? 'bg-amber-50 border-amber-200 hover:bg-amber-100' 
                        : 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                }`}
            >
                <div className="flex items-center gap-2">
                    {hasTriggers ? (
                        <Zap className="h-4 w-4 text-amber-600" />
                    ) : (
                        <Info className="h-4 w-4 text-blue-600" />
                    )}
                    <span className={`text-sm font-medium ${
                        hasTriggers ? 'text-amber-700' : 'text-blue-700'
                    }`}>
                        {hasTriggers && `${result.triggers.length} messaging trigger${result.triggers.length > 1 ? 's' : ''} detected`}
                        {hasTriggers && hasGaps && ' • '}
                        {hasGaps && `${result.gaps.length} unaddressed concern${result.gaps.length > 1 ? 's' : ''}`}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                        {Math.round(result.alignment_score * 100)}% aligned
                    </Badge>
                    {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-gray-500" />
                    ) : (
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                    )}
                </div>
            </button>

            {/* Expanded content */}
            {isExpanded && (
                <div className="p-4 bg-white border-t space-y-4">
                    {/* Triggers */}
                    {result.triggers.map((trigger, idx) => (
                        <div key={idx} className="p-3 bg-amber-50/50 rounded-lg border border-amber-100">
                            <div className="flex items-start gap-2 mb-2">
                                <Zap className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                                <div className="text-sm">
                                    <span className="text-amber-700 font-medium">Trigger: </span>
                                    <span className="text-gray-700">
                                        Brand message "{trigger.from_message.slice(0, 60)}..." 
                                        may activate anxiety for {trigger.persona_name}
                                    </span>
                                </div>
                            </div>
                            
                            {trigger.recommended_approach && (
                                <div className="ml-6 p-2 bg-white rounded border border-amber-100 text-sm">
                                    <span className="text-amber-600 font-medium">💡 Recommended: </span>
                                    <span className="text-gray-600">{trigger.recommended_approach}</span>
                                </div>
                            )}
                        </div>
                    ))}

                    {/* Gaps */}
                    {result.gaps.map((gap, idx) => (
                        <div key={idx} className="p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                            <div className="flex items-start gap-2">
                                <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                                <div className="text-sm">
                                    <span className="text-blue-700 font-medium">Gap: </span>
                                    <span className="text-gray-700">
                                        "{gap.tension.slice(0, 80)}..." is not addressed by current messaging
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* View Knowledge Graph link */}
                    {onViewKnowledgeGraph && (
                        <div className="pt-2 border-t">
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={onViewKnowledgeGraph}
                                className="text-violet-600 hover:text-violet-700 hover:bg-violet-50"
                            >
                                <ExternalLink className="h-4 w-4 mr-2" />
                                View in Knowledge Graph
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
