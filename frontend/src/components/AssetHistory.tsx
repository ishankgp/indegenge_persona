"use client"

import { useState, useEffect } from 'react'
import { AssetIntelligenceAPI, type AssetHistoryItem, type AssetAnalysisResult } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
    ImageIcon,
    Trash2,
    Eye,
    Users,
    Clock,
    AlertCircle,
    RefreshCw,
    Database
} from 'lucide-react'

interface AssetHistoryProps {
    onLoadResults?: (results: AssetAnalysisResult[], assetName: string) => void
}

export function AssetHistory({ onLoadResults }: AssetHistoryProps) {
    const [history, setHistory] = useState<AssetHistoryItem[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set())

    const fetchHistory = async () => {
        setLoading(true)
        setError(null)
        try {
            const response = await AssetIntelligenceAPI.getHistory()
            setHistory(response.assets)
        } catch (err) {
            setError('Failed to load history')
            console.error('Error fetching history:', err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchHistory()
    }, [])

    const handleDelete = async (analysisId: number, assetHash: string) => {
        setDeletingIds(prev => new Set(prev).add(analysisId))
        try {
            await AssetIntelligenceAPI.deleteHistory(analysisId)
            // Update local state
            setHistory(prev => {
                return prev.map(asset => {
                    if (asset.image_hash === assetHash) {
                        return {
                            ...asset,
                            personas: asset.personas.filter(p => p.id !== analysisId)
                        }
                    }
                    return asset
                }).filter(asset => asset.personas.length > 0)
            })
        } catch (err) {
            console.error('Error deleting analysis:', err)
            alert('Failed to delete analysis record')
        } finally {
            setDeletingIds(prev => {
                const newSet = new Set(prev)
                newSet.delete(analysisId)
                return newSet
            })
        }
    }

    const handleLoadAsset = (asset: AssetHistoryItem) => {
        if (!onLoadResults) return
        const results: AssetAnalysisResult[] = asset.personas.map(p => p.result_json)
        onLoadResults(results, asset.asset_name || 'Unknown Asset')
    }

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return 'Unknown'
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Database className="h-5 w-5" />
                        Asset Intelligence History
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {[1, 2, 3].map(i => (
                        <Skeleton key={i} className="h-24 w-full" />
                    ))}
                </CardContent>
            </Card>
        )
    }

    if (error) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Database className="h-5 w-5" />
                        Asset Intelligence History
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center py-8 text-destructive">
                        <AlertCircle className="h-12 w-12 mb-4" />
                        <p>{error}</p>
                        <Button
                            variant="outline"
                            onClick={fetchHistory}
                            className="mt-4"
                        >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Retry
                        </Button>
                    </div>
                </CardContent>
            </Card>
        )
    }

    if (history.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Database className="h-5 w-5" />
                        Asset Intelligence History
                    </CardTitle>
                    <CardDescription>
                        View past asset analyses and their results
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                        <ImageIcon className="h-16 w-16 mb-4 opacity-50" />
                        <p className="text-lg font-medium">No analysis history yet</p>
                        <p className="text-sm mt-2">
                            Analyze an asset in Asset Intelligence mode to see it here
                        </p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Database className="h-5 w-5" />
                            Asset Intelligence History
                        </CardTitle>
                        <CardDescription>
                            {history.length} unique asset{history.length !== 1 ? 's' : ''} analyzed
                        </CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={fetchHistory}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[500px] pr-4">
                    <div className="space-y-4">
                        {history.map((asset, index) => (
                            <div
                                key={asset.image_hash}
                                className="border rounded-lg p-4 hover:border-primary/50 transition-colors"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-primary/10 rounded-lg">
                                            <ImageIcon className="h-6 w-6 text-primary" />
                                        </div>
                                        <div>
                                            <p className="font-medium">
                                                {asset.asset_name || `Asset ${index + 1}`}
                                            </p>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                                <Clock className="h-3 w-3" />
                                                {formatDate(asset.first_analyzed)}
                                            </div>
                                        </div>
                                    </div>
                                    {onLoadResults && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleLoadAsset(asset)}
                                        >
                                            <Eye className="h-4 w-4 mr-2" />
                                            Load
                                        </Button>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 mb-3">
                                    <Badge variant="secondary" className="gap-1">
                                        <Users className="h-3 w-3" />
                                        {asset.personas.length} persona{asset.personas.length !== 1 ? 's' : ''}
                                    </Badge>
                                    <Badge variant="outline" className="text-xs font-mono">
                                        {asset.image_hash.slice(0, 12)}...
                                    </Badge>
                                </div>

                                <div className="space-y-2">
                                    {asset.personas.map(persona => (
                                        <div
                                            key={persona.id}
                                            className="flex items-center justify-between bg-muted/50 rounded px-3 py-2 text-sm"
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium">
                                                    {persona.result_json?.persona_name || `Persona ${persona.persona_id}`}
                                                </span>
                                                <span className="text-muted-foreground">
                                                    #{persona.persona_id}
                                                </span>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDelete(persona.id, asset.image_hash)}
                                                disabled={deletingIds.has(persona.id)}
                                                className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                            >
                                                {deletingIds.has(persona.id) ? (
                                                    <RefreshCw className="h-3 w-3 animate-spin" />
                                                ) : (
                                                    <Trash2 className="h-3 w-3" />
                                                )}
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    )
}
