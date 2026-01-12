"use client"

import React, { useEffect, useState, useCallback, useMemo } from 'react'
import ReactFlow, {
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    MarkerType,
    Position,
} from 'reactflow'
import type { Node, Edge } from 'reactflow'
import 'reactflow/dist/style.css'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2, RefreshCw, Network, AlertTriangle, CheckCircle, Filter, X } from 'lucide-react'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

// Node type color mapping
const NODE_TYPE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
    // Brand Pillars - Purple shades
    key_message: { bg: '#f3e8ff', border: '#a855f7', text: '#7e22ce' },
    value_proposition: { bg: '#fae8ff', border: '#d946ef', text: '#a21caf' },
    differentiator: { bg: '#ede9fe', border: '#8b5cf6', text: '#6d28d9' },
    proof_point: { bg: '#e0e7ff', border: '#6366f1', text: '#4338ca' },

    // Disease Knowledge - Blue shades
    epidemiology: { bg: '#dbeafe', border: '#3b82f6', text: '#1d4ed8' },
    symptom_burden: { bg: '#cffafe', border: '#06b6d4', text: '#0891b2' },
    treatment_landscape: { bg: '#ccfbf1', border: '#14b8a6', text: '#0d9488' },
    unmet_need: { bg: '#fef3c7', border: '#f59e0b', text: '#b45309' },

    // Patient Insights - Green shades
    patient_motivation: { bg: '#dcfce7', border: '#22c55e', text: '#16a34a' },
    patient_belief: { bg: '#d1fae5', border: '#10b981', text: '#059669' },
    patient_tension: { bg: '#fee2e2', border: '#ef4444', text: '#dc2626' },
    journey_insight: { bg: '#fef9c3', border: '#eab308', text: '#ca8a04' },

    // HCP Insights - Orange shades
    prescribing_driver: { bg: '#fed7aa', border: '#f97316', text: '#ea580c' },
    clinical_concern: { bg: '#fecaca', border: '#f87171', text: '#dc2626' },
    practice_constraint: { bg: '#fce7f3', border: '#ec4899', text: '#db2777' },

    // Market - Gray shades
    competitor_position: { bg: '#e5e7eb', border: '#6b7280', text: '#374151' },
    market_barrier: { bg: '#fecdd3', border: '#fb7185', text: '#e11d48' },
}

// Relationship type colors
const RELATION_COLORS: Record<string, string> = {
    addresses: '#22c55e',
    supports: '#3b82f6',
    contradicts: '#ef4444',
    triggers: '#f59e0b',
    influences: '#8b5cf6',
    resonates: '#ec4899',
}

// Custom node component
const KnowledgeNodeComponent = ({ data }: { data: any }) => {
    const colors = NODE_TYPE_COLORS[data.node_type] || { bg: '#f3f4f6', border: '#9ca3af', text: '#4b5563' }

    return (
        <div
            className="px-4 py-3 rounded-lg shadow-md min-w-[180px] max-w-[280px] border-2 transition-all hover:shadow-lg"
            style={{
                backgroundColor: colors.bg,
                borderColor: colors.border,
            }}
        >
            <div className="flex items-center justify-between mb-2">
                <Badge
                    variant="outline"
                    className="text-[10px] font-medium"
                    style={{ borderColor: colors.border, color: colors.text }}
                >
                    {data.node_type.replace(/_/g, ' ')}
                </Badge>
                {data.verified && (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                )}
            </div>
            <p className="text-sm font-medium" style={{ color: colors.text }}>
                {data.label}
            </p>
            {data.segment && (
                <p className="text-xs text-gray-500 mt-1">
                    {data.segment}
                </p>
            )}
            {data.confidence && (
                <div className="mt-2">
                    <div className="h-1 w-full bg-gray-200 rounded-full overflow-hidden">
                        <div
                            className="h-1 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full"
                            style={{ width: `${data.confidence * 100}%` }}
                        />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                        {Math.round(data.confidence * 100)}% confidence
                    </p>
                </div>
            )}
        </div>
    )
}

// Node types for React Flow
const nodeTypes = {
    knowledgeNode: KnowledgeNodeComponent,
}

interface KnowledgeGraphViewProps {
    brandId: number
    brandName?: string
    onNodeSelect?: (nodeId: string) => void
}

export function KnowledgeGraphView({ brandId, brandName, onNodeSelect }: KnowledgeGraphViewProps) {
    const [nodes, setNodes, onNodesChange] = useNodesState([])
    const [edges, setEdges, onEdgesChange] = useEdgesState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [stats, setStats] = useState<{
        total_nodes: number
        total_edges: number
        contradictions: number
        node_types: Record<string, number>
    } | null>(null)
    const [selectedNode, setSelectedNode] = useState<any>(null)
    const [filterType, setFilterType] = useState<string>('all')

    // Layout algorithm - simple force-directed positioning
    const layoutNodes = useCallback((graphNodes: any[], graphEdges: any[]) => {
        const typeGroups: Record<string, string[]> = {
            brand: ['key_message', 'value_proposition', 'differentiator', 'proof_point'],
            disease: ['epidemiology', 'symptom_burden', 'treatment_landscape', 'unmet_need'],
            patient: ['patient_motivation', 'patient_belief', 'patient_tension', 'journey_insight'],
            hcp: ['prescribing_driver', 'clinical_concern', 'practice_constraint'],
            market: ['competitor_position', 'market_barrier'],
        }

        // Calculate positions based on node type groups
        const positions: Record<string, { x: number; y: number }> = {}
        const groupPositions = {
            brand: { x: 0, y: 0 },
            disease: { x: 500, y: 0 },
            patient: { x: 0, y: 400 },
            hcp: { x: 500, y: 400 },
            market: { x: 250, y: 200 },
        }

        graphNodes.forEach((node, index) => {
            let group = 'market'
            for (const [groupName, types] of Object.entries(typeGroups)) {
                if (types.includes(node.data.node_type)) {
                    group = groupName
                    break
                }
            }

            const basePos = groupPositions[group as keyof typeof groupPositions] || groupPositions.market
            const typeIndex = typeGroups[group]?.indexOf(node.data.node_type) || 0
            const countInType = graphNodes.filter(n => n.data.node_type === node.data.node_type).indexOf(node)

            positions[node.id] = {
                x: basePos.x + (typeIndex * 200) + (Math.random() * 50),
                y: basePos.y + (countInType * 100) + (Math.random() * 30),
            }
        })

        return graphNodes.map(node => ({
            ...node,
            position: positions[node.id] || { x: Math.random() * 800, y: Math.random() * 600 },
        }))
    }, [])

    // Fetch graph data
    const fetchGraph = useCallback(async () => {
        setLoading(true)
        setError(null)

        try {
            const response = await api.get(`/api/knowledge/brands/${brandId}/graph`)
            const { nodes: graphNodes, edges: graphEdges, stats: graphStats } = response.data

            // Apply layout
            const positionedNodes = layoutNodes(graphNodes, graphEdges)

            // Style edges
            const styledEdges = graphEdges.map((edge: any) => ({
                ...edge,
                style: {
                    stroke: RELATION_COLORS[edge.data?.relation_type] || '#9ca3af',
                    strokeWidth: edge.data?.strength > 0.7 ? 2 : 1,
                },
                markerEnd: {
                    type: MarkerType.ArrowClosed,
                    color: RELATION_COLORS[edge.data?.relation_type] || '#9ca3af',
                },
            }))

            setNodes(positionedNodes)
            setEdges(styledEdges)
            setStats(graphStats)
        } catch (err: any) {
            console.error('Failed to fetch knowledge graph:', err)
            setError(err.message || 'Failed to load knowledge graph')
        } finally {
            setLoading(false)
        }
    }, [brandId, layoutNodes, setNodes, setEdges])

    useEffect(() => {
        fetchGraph()
    }, [fetchGraph])

    // Filter nodes by type
    const filteredNodes = useMemo(() => {
        if (filterType === 'all') return nodes
        return nodes.filter(n => n.data.node_type === filterType)
    }, [nodes, filterType])

    const filteredEdges = useMemo(() => {
        const visibleNodeIds = new Set(filteredNodes.map(n => n.id))
        return edges.filter(e => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target))
    }, [filteredNodes, edges])

    // Handle node click
    const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
        setSelectedNode(node.data)
        onNodeSelect?.(node.id)
    }, [onNodeSelect])

    if (loading) {
        return (
            <Card className="h-[600px] flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                    <p className="mt-2 text-sm text-muted-foreground">Loading knowledge graph...</p>
                </div>
            </Card>
        )
    }

    if (error) {
        return (
            <Card className="h-[600px] flex items-center justify-center">
                <div className="text-center">
                    <AlertTriangle className="h-8 w-8 mx-auto text-amber-500" />
                    <p className="mt-2 text-sm text-red-600">{error}</p>
                    <Button variant="outline" onClick={fetchGraph} className="mt-4">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Retry
                    </Button>
                </div>
            </Card>
        )
    }

    if (nodes.length === 0) {
        return (
            <Card className="h-[600px] flex items-center justify-center">
                <div className="text-center max-w-md">
                    <Network className="h-12 w-12 mx-auto text-gray-400" />
                    <h3 className="mt-4 text-lg font-semibold">No Knowledge Graph Yet</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Upload and process brand documents to build the knowledge graph.
                        The graph visualizes insights extracted from your documents.
                    </p>
                </div>
            </Card>
        )
    }

    return (
        <Card className="h-[700px] overflow-hidden">
            <CardHeader className="border-b pb-4">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Network className="h-5 w-5" />
                            Knowledge Graph {brandName && `- ${brandName}`}
                        </CardTitle>
                        <CardDescription className="mt-1">
                            Visualize connections between brand insights, patient needs, and market dynamics
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Filter */}
                        <Select value={filterType} onValueChange={setFilterType}>
                            <SelectTrigger className="w-[180px]">
                                <Filter className="h-4 w-4 mr-2" />
                                <SelectValue placeholder="Filter by type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Types</SelectItem>
                                {stats?.node_types && Object.keys(stats.node_types).map(type => (
                                    <SelectItem key={type} value={type}>
                                        {type.replace(/_/g, ' ')} ({stats.node_types[type]})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Button variant="outline" size="sm" onClick={fetchGraph}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Refresh
                        </Button>
                    </div>
                </div>

                {/* Stats Row */}
                {stats && (
                    <div className="flex items-center gap-4 mt-4">
                        <Badge variant="secondary" className="px-3 py-1">
                            {stats.total_nodes} Nodes
                        </Badge>
                        <Badge variant="secondary" className="px-3 py-1">
                            {stats.total_edges} Connections
                        </Badge>
                        {stats.contradictions > 0 && (
                            <Badge variant="destructive" className="px-3 py-1">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                {stats.contradictions} Contradictions
                            </Badge>
                        )}
                    </div>
                )}
            </CardHeader>

            <CardContent className="p-0 h-[calc(100%-120px)]">
                <div className="flex h-full">
                    {/* Graph Area */}
                    <div className="flex-1">
                        <ReactFlow
                            nodes={filteredNodes}
                            edges={filteredEdges}
                            onNodesChange={onNodesChange}
                            onEdgesChange={onEdgesChange}
                            onNodeClick={onNodeClick}
                            nodeTypes={nodeTypes}
                            fitView
                            minZoom={0.3}
                            maxZoom={1.5}
                        >
                            <Background />
                            <Controls />
                            <MiniMap
                                nodeStrokeColor={(n) => {
                                    const colors = NODE_TYPE_COLORS[n.data?.node_type]
                                    return colors?.border || '#9ca3af'
                                }}
                                nodeColor={(n) => {
                                    const colors = NODE_TYPE_COLORS[n.data?.node_type]
                                    return colors?.bg || '#f3f4f6'
                                }}
                            />
                        </ReactFlow>
                    </div>

                    {/* Detail Panel */}
                    {selectedNode && (
                        <div className="w-80 border-l bg-gray-50 dark:bg-gray-900 p-4 overflow-y-auto">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold">Node Details</h3>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setSelectedNode(null)}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs text-muted-foreground uppercase">Type</label>
                                    <Badge className="mt-1 block w-fit">
                                        {selectedNode.node_type?.replace(/_/g, ' ')}
                                    </Badge>
                                </div>

                                <div>
                                    <label className="text-xs text-muted-foreground uppercase">Text</label>
                                    <p className="mt-1 text-sm">{selectedNode.text}</p>
                                </div>

                                {selectedNode.segment && (
                                    <div>
                                        <label className="text-xs text-muted-foreground uppercase">Segment</label>
                                        <p className="mt-1 text-sm">{selectedNode.segment}</p>
                                    </div>
                                )}

                                {selectedNode.source_quote && (
                                    <div>
                                        <label className="text-xs text-muted-foreground uppercase">Source Quote</label>
                                        <p className="mt-1 text-sm italic text-gray-600 dark:text-gray-400">
                                            "{selectedNode.source_quote}"
                                        </p>
                                    </div>
                                )}

                                <div>
                                    <label className="text-xs text-muted-foreground uppercase">Confidence</label>
                                    <div className="mt-1 flex items-center gap-2">
                                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                            <div
                                                className="h-2 bg-blue-500 rounded-full"
                                                style={{ width: `${(selectedNode.confidence || 0.7) * 100}%` }}
                                            />
                                        </div>
                                        <span className="text-sm font-medium">
                                            {Math.round((selectedNode.confidence || 0.7) * 100)}%
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 pt-2 border-t">
                                    {selectedNode.verified ? (
                                        <Badge variant="outline" className="text-green-600 border-green-600">
                                            <CheckCircle className="h-3 w-3 mr-1" />
                                            Verified
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline" className="text-amber-600 border-amber-600">
                                            Unverified
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}

export default KnowledgeGraphView
