'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, RefreshCw, Merge, Trash2, CheckCircle, AlertTriangle, Search } from 'lucide-react'
import { Slider } from '@/components/ui/slider'

interface DuplicateCandidate {
    primary: {
        id: string
        text: string
        summary: string
        node_type: string
        confidence: number
    }
    secondary: {
        id: string
        text: string
        summary: string
        node_type: string
        confidence: number
    }
    similarity: number
    recommendation: 'auto_merge' | 'review'
}

interface NodeMergePanelProps {
    brandId: number
}

const NODE_TYPE_COLORS: Record<string, string> = {
    key_message: 'bg-purple-100 text-purple-700',
    value_proposition: 'bg-pink-100 text-pink-700',
    patient_tension: 'bg-rose-100 text-rose-700',
    patient_motivation: 'bg-emerald-100 text-emerald-700',
    differentiator: 'bg-indigo-100 text-indigo-700',
    proof_point: 'bg-blue-100 text-blue-700',
    unmet_need: 'bg-amber-100 text-amber-700',
}

export function NodeMergePanel({ brandId }: NodeMergePanelProps) {
    const [duplicates, setDuplicates] = useState<DuplicateCandidate[]>([])
    const [loading, setLoading] = useState(true)
    const [threshold, setThreshold] = useState(0.60)
    const [merging, setMerging] = useState<string | null>(null)
    const [stats, setStats] = useState({ merged: 0, deleted: 0 })

    const fetchDuplicates = useCallback(async () => {
        setLoading(true)
        try {
            const response = await fetch(
                `http://localhost:8000/api/knowledge/brands/${brandId}/duplicates?threshold=${threshold}`
            )
            if (response.ok) {
                const data = await response.json()
                setDuplicates(data.duplicates || [])
            }
        } catch (error) {
            console.error('Failed to fetch duplicates:', error)
        } finally {
            setLoading(false)
        }
    }, [brandId, threshold])

    useEffect(() => {
        fetchDuplicates()
    }, [fetchDuplicates])

    const handleMerge = async (primaryId: string, secondaryId: string) => {
        setMerging(secondaryId)
        try {
            const response = await fetch('http://localhost:8000/api/knowledge/nodes/merge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    primary_id: primaryId,
                    secondary_ids: [secondaryId]
                })
            })

            if (response.ok) {
                setStats(prev => ({ ...prev, merged: prev.merged + 1 }))
                setDuplicates(prev => prev.filter(d =>
                    d.primary.id !== secondaryId && d.secondary.id !== secondaryId
                ))
            }
        } catch (error) {
            console.error('Merge failed:', error)
        } finally {
            setMerging(null)
        }
    }

    const handleDelete = async (nodeId: string) => {
        setMerging(nodeId)
        try {
            const response = await fetch(`http://localhost:8000/api/knowledge/nodes/${nodeId}`, {
                method: 'DELETE'
            })

            if (response.ok) {
                setStats(prev => ({ ...prev, deleted: prev.deleted + 1 }))
                setDuplicates(prev => prev.filter(d =>
                    d.primary.id !== nodeId && d.secondary.id !== nodeId
                ))
            }
        } catch (error) {
            console.error('Delete failed:', error)
        } finally {
            setMerging(null)
        }
    }

    const handleAutoMerge = async () => {
        setLoading(true)
        try {
            const response = await fetch(
                `http://localhost:8000/api/knowledge/brands/${brandId}/auto-merge?threshold=0.85`,
                { method: 'POST' }
            )

            if (response.ok) {
                const data = await response.json()
                setStats(prev => ({ ...prev, merged: prev.merged + data.nodes_merged }))
                await fetchDuplicates()
            }
        } catch (error) {
            console.error('Auto-merge failed:', error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card className="border-0 shadow-xl bg-white/90 backdrop-blur">
            <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-xl">
                            <Search className="h-5 w-5 text-indigo-600" />
                            Duplicate Node Manager
                        </CardTitle>
                        <CardDescription className="mt-1">
                            Review and merge similar knowledge nodes
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-3">
                        {stats.merged > 0 && (
                            <Badge variant="secondary" className="bg-green-100 text-green-700">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                {stats.merged} merged
                            </Badge>
                        )}
                        <Button variant="outline" size="sm" onClick={fetchDuplicates} disabled={loading}>
                            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleAutoMerge}
                            disabled={loading}
                            className="bg-indigo-600 hover:bg-indigo-700"
                        >
                            <Merge className="h-4 w-4 mr-2" />
                            Auto-Merge (≥85%)
                        </Button>
                    </div>
                </div>

                {/* Threshold Slider */}
                <div className="mt-4 flex items-center gap-4">
                    <span className="text-sm text-muted-foreground w-32">
                        Similarity: {Math.round(threshold * 100)}%
                    </span>
                    <Slider
                        value={[threshold * 100]}
                        onValueChange={(v) => setThreshold(v[0] / 100)}
                        min={40}
                        max={95}
                        step={5}
                        className="flex-1"
                    />
                    <Button variant="ghost" size="sm" onClick={fetchDuplicates}>
                        Apply
                    </Button>
                </div>
            </CardHeader>

            <CardContent className="p-4 max-h-[600px] overflow-y-auto">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                        <span className="ml-3 text-muted-foreground">Scanning for duplicates...</span>
                    </div>
                ) : duplicates.length === 0 ? (
                    <div className="text-center py-12">
                        <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                        <h3 className="text-lg font-medium">No Duplicates Found</h3>
                        <p className="text-sm text-muted-foreground mt-2">
                            All nodes are unique at {Math.round(threshold * 100)}% similarity threshold
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="text-sm text-muted-foreground mb-4">
                            Found {duplicates.length} potential duplicate pairs
                        </div>

                        {duplicates.map((dup, index) => (
                            <div
                                key={`${dup.primary.id}-${dup.secondary.id}`}
                                className={`border rounded-lg p-4 ${dup.recommendation === 'auto_merge'
                                        ? 'border-amber-200 bg-amber-50/50'
                                        : 'border-gray-200'
                                    }`}
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <Badge
                                            variant="outline"
                                            className={`${dup.similarity >= 0.85
                                                    ? 'border-red-300 text-red-700 bg-red-50'
                                                    : 'border-amber-300 text-amber-700 bg-amber-50'
                                                }`}
                                        >
                                            {Math.round(dup.similarity * 100)}% similar
                                        </Badge>
                                        <Badge className={NODE_TYPE_COLORS[dup.primary.node_type] || 'bg-gray-100'}>
                                            {dup.primary.node_type.replace(/_/g, ' ')}
                                        </Badge>
                                        {dup.recommendation === 'auto_merge' && (
                                            <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                                                <AlertTriangle className="h-3 w-3 mr-1" />
                                                Recommended merge
                                            </Badge>
                                        )}
                                    </div>
                                    <span className="text-xs text-muted-foreground">#{index + 1}</span>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    {/* Primary Node */}
                                    <div className="bg-white rounded border p-3">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-medium text-green-600">KEEP</span>
                                            <span className="text-xs text-muted-foreground">
                                                {dup.primary.id.substring(0, 8)}...
                                            </span>
                                        </div>
                                        <p className="text-sm">{dup.primary.text}</p>
                                    </div>

                                    {/* Secondary Node */}
                                    <div className="bg-gray-50 rounded border p-3">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-medium text-red-600">MERGE INTO</span>
                                            <span className="text-xs text-muted-foreground">
                                                {dup.secondary.id.substring(0, 8)}...
                                            </span>
                                        </div>
                                        <p className="text-sm">{dup.secondary.text}</p>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-2 mt-3">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleDelete(dup.secondary.id)}
                                        disabled={merging === dup.secondary.id}
                                        className="text-red-600 hover:bg-red-50"
                                    >
                                        <Trash2 className="h-4 w-4 mr-1" />
                                        Delete
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={() => handleMerge(dup.primary.id, dup.secondary.id)}
                                        disabled={merging === dup.secondary.id}
                                        className="bg-green-600 hover:bg-green-700"
                                    >
                                        {merging === dup.secondary.id ? (
                                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                        ) : (
                                            <Merge className="h-4 w-4 mr-1" />
                                        )}
                                        Merge
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
