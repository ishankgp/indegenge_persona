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
import dagre from 'dagre'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2, RefreshCw, Network, AlertTriangle, Filter, X } from 'lucide-react'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import CustomNode from './CustomNode'

// Register safe default
const nodeTypes = {
    knowledgeNode: CustomNode,
}

// Relationship type colors with better visibility
const RELATION_COLORS: Record<string, string> = {
    addresses: '#10b981', // green-500
    supports: '#3b82f6',  // blue-500
    contradicts: '#ef4444', // red-500
    triggers: '#f59e0b',  // amber-500
    influences: '#8b5cf6', // violet-500
    resonates: '#ec4899', // pink-500
}

interface KnowledgeGraphViewProps {
    brandId: number
    brandName?: string
    onNodeSelect?: (nodeId: string) => void
}

export function KnowledgeGraphView({ brandId, onNodeSelect }: KnowledgeGraphViewProps) {
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
    const [filterRelation, setFilterRelation] = useState<string>('all')
    const [filterSegment, setFilterSegment] = useState<string>('all')
    const [focusNodeId, setFocusNodeId] = useState<string | null>(null)

    // Dagre Layout
    const getLayoutedElements = useCallback((nodes: Node[], edges: Edge[], direction = 'TB') => {
        const dagreGraph = new dagre.graphlib.Graph()
        dagreGraph.setDefaultEdgeLabel(() => ({}))

        // Set direction and spacing
        const isHorizontal = direction === 'LR'
        dagreGraph.setGraph({
            rankdir: direction,
            nodesep: 100, // Horizontal spacing between nodes
            ranksep: 180  // Vertical spacing between ranks
        })

        nodes.forEach((node) => {
            dagreGraph.setNode(node.id, { width: 300, height: 160 }) // Approximate card size
        })

        edges.forEach((edge) => {
            dagreGraph.setEdge(edge.source, edge.target)
        })

        dagre.layout(dagreGraph)

        return {
            nodes: nodes.map((node) => {
                const nodeWithPosition = dagreGraph.node(node.id)
                return {
                    ...node,
                    targetPosition: isHorizontal ? Position.Left : Position.Top,
                    sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
                    position: {
                        x: nodeWithPosition.x - 150, // Center offset
                        y: nodeWithPosition.y - 80,
                    },
                }
            }),
            edges,
        }
    }, [])

    // Fetch graph data
    const fetchGraph = useCallback(async () => {
        setLoading(true)
        setError(null)

        try {
            const response = await api.get(`/api/knowledge/brands/${brandId}/graph`)
            const { nodes: rawNodes, edges: rawEdges, stats: graphStats } = response.data

            // Transform nodes for React Flow
            // Transform nodes for React Flow
            const flowNodes: Node[] = rawNodes.map((n: any) => ({
                id: n.id,
                type: 'knowledgeNode',
                data: n.data, // Backend already returns correct structure
                position: n.position || { x: 0, y: 0 }
            }))

            // Style edges with visible labels
            const flowEdges: Edge[] = rawEdges.map((edge: any) => {
                const relationType = edge.data?.relation_type || edge.label || 'related'
                const color = RELATION_COLORS[relationType] || '#6b7280'

                return {
                    id: edge.id || `${edge.source}-${edge.target}`,
                    source: String(edge.source),
                    target: String(edge.target),
                    type: 'smoothstep',
                    animated: relationType === 'contradicts',
                    label: relationType.replace(/_/g, ' ').toUpperCase(),
                    labelStyle: {
                        fill: color,
                        fontWeight: 700,
                        fontSize: 10,
                        textTransform: 'uppercase' as const,
                    },
                    labelBgStyle: {
                        fill: '#ffffff',
                        fillOpacity: 0.9,
                        rx: 4,
                        ry: 4,
                    },
                    labelBgPadding: [6, 4] as [number, number],
                    style: {
                        stroke: color,
                        strokeWidth: 2,
                        strokeDasharray: relationType === 'contradicts' ? '5,5' : undefined,
                    },
                    markerEnd: {
                        type: MarkerType.ArrowClosed,
                        color: color,
                        width: 20,
                        height: 20,
                    },
                    data: edge.data
                }
            })

            const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(flowNodes, flowEdges)

            setNodes(layoutedNodes)
            setEdges(layoutedEdges)
            setStats(graphStats)
        } catch (err: any) {
            console.error('Failed to fetch knowledge graph:', err)
            setError(err.message || 'Failed to load knowledge graph')
        } finally {
            setLoading(false)
        }
    }, [brandId, getLayoutedElements, setNodes, setEdges])

    useEffect(() => {
        fetchGraph()
    }, [fetchGraph])

    // Get unique relationship types for filter dropdown
    const relationTypes = useMemo(() => {
        const types = new Set<string>()
        edges.forEach(e => {
            const relType = e.data?.relation_type || (e.label as string)?.toLowerCase() || 'related'
            types.add(relType)
        })
        return Array.from(types)
    }, [edges])

    // Find all connected nodes for focus mode
    const getConnectedNodeIds = useCallback((nodeId: string): Set<string> => {
        const connected = new Set<string>([nodeId])
        const toProcess = [nodeId]

        while (toProcess.length > 0) {
            const current = toProcess.pop()!
            edges.forEach(e => {
                if (e.source === current && !connected.has(e.target)) {
                    connected.add(e.target)
                    toProcess.push(e.target)
                }
                if (e.target === current && !connected.has(e.source)) {
                    connected.add(e.source)
                    toProcess.push(e.source)
                }
            })
        }
        return connected
    }, [edges])

    // Filter logic with relationship type, segment, and focus mode
    const { filteredNodes, filteredEdges } = useMemo(() => {
        let visibleEdges = edges

        // Filter by relationship type
        if (filterRelation !== 'all') {
            visibleEdges = edges.filter(e => {
                const relType = e.data?.relation_type || (e.label as string)?.toLowerCase() || 'related'
                return relType === filterRelation
            })
        }

        // Get nodes connected by visible edges
        const connectedByEdges = new Set<string>()
        visibleEdges.forEach(e => {
            connectedByEdges.add(e.source)
            connectedByEdges.add(e.target)
        })

        // Start with all nodes
        let visibleNodes = [...nodes]

        // Filter by segment (HCP vs Patient)
        if (filterSegment !== 'all') {
            visibleNodes = visibleNodes.filter(n => {
                const segment = (n.data.segment || '').toLowerCase()
                if (filterSegment === 'hcp') {
                    return segment.includes('hcp') || segment.includes('physician') || segment.includes('doctor')
                } else if (filterSegment === 'patient') {
                    return segment.includes('patient') || segment.includes('all') || segment === ''
                }
                return true
            })
        }

        // Filter nodes by type
        if (filterType !== 'all') {
            visibleNodes = visibleNodes.filter(n => n.data.node_type === filterType)
        }

        // If filtering by relation, only show nodes in those relationships
        if (filterRelation !== 'all') {
            visibleNodes = visibleNodes.filter(n => connectedByEdges.has(n.id))
        }

        // Focus mode: highlight connected path
        if (focusNodeId) {
            const connectedIds = getConnectedNodeIds(focusNodeId)
            visibleNodes = visibleNodes.map(n => ({
                ...n,
                style: {
                    ...n.style,
                    opacity: connectedIds.has(n.id) ? 1 : 0.15,
                }
            }))
            visibleEdges = visibleEdges.map(e => ({
                ...e,
                style: {
                    ...e.style,
                    opacity: (connectedIds.has(e.source) && connectedIds.has(e.target)) ? 1 : 0.1,
                }
            }))
        }

        // Final edge filter to only show edges between visible nodes
        const visibleNodeIds = new Set(visibleNodes.map(n => n.id))
        visibleEdges = visibleEdges.filter(e => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target))

        return { filteredNodes: visibleNodes, filteredEdges: visibleEdges }
    }, [nodes, edges, filterType, filterRelation, filterSegment, focusNodeId, getConnectedNodeIds])

    // Handle node click - toggle focus mode
    const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
        setSelectedNode(node.data)
        onNodeSelect?.(node.id)
        // Toggle focus mode on double-tap same node, or set new focus
        setFocusNodeId(prev => prev === node.id ? null : node.id)
    }, [onNodeSelect])

    if (loading) {
        return (
            <Card className="h-[600px] flex items-center justify-center border-0 bg-white/50 backdrop-blur-sm">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                    <p className="mt-2 text-sm text-muted-foreground">Mapping knowledge network...</p>
                </div>
            </Card>
        )
    }

    if (error) {
        return (
            <Card className="h-[600px] flex items-center justify-center border-dashed">
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
            <Card className="h-[600px] flex items-center justify-center border-dashed">
                <div className="text-center max-w-md">
                    <div className="bg-gray-50 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                        <Network className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold">Knowledge Graph Empty</h3>
                    <p className="mt-2 text-sm text-muted-foreground mb-6">
                        No insights extracted yet. Upload brand documents to generate the knowledge graph.
                    </p>
                </div>
            </Card>
        )
    }

    return (
        <Card className="h-[800px] border-0 shadow-2xl overflow-hidden bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl ring-1 ring-black/5">
            <CardHeader className="border-b pb-4 bg-white/50 dark:bg-gray-900/50">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-xl">
                            <Network className="h-5 w-5 text-indigo-600" />
                            Knowledge Graph
                        </CardTitle>
                        <CardDescription className="mt-1">
                            {stats?.total_nodes} insights connected by {stats?.total_edges} relationships
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-3">
                        <Select value={filterType} onValueChange={setFilterType}>
                            <SelectTrigger className="w-[200px] bg-white">
                                <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                                <SelectValue placeholder="All Categories" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Categories</SelectItem>
                                {stats?.node_types && Object.keys(stats.node_types).map(type => (
                                    <SelectItem key={type} value={type}>
                                        {type.replace(/_/g, ' ')} ({stats.node_types[type]})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Segment Filter (HCP vs Patient) */}
                        <Select value={filterSegment} onValueChange={(val) => { setFilterSegment(val); setFocusNodeId(null); }}>
                            <SelectTrigger className="w-[140px] bg-white">
                                <SelectValue placeholder="All Segments" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">👥 All Segments</SelectItem>
                                <SelectItem value="patient">😷 Patients</SelectItem>
                                <SelectItem value="hcp">🩺 HCPs</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* Relationship Type Filter */}
                        <Select value={filterRelation} onValueChange={(val) => { setFilterRelation(val); setFocusNodeId(null); }}>
                            <SelectTrigger className="w-[180px] bg-white">
                                <SelectValue placeholder="All Relations" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Relations</SelectItem>
                                {relationTypes.map(type => (
                                    <SelectItem key={type} value={type}>
                                        {type.replace(/_/g, ' ').toUpperCase()}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Focus Mode Indicator */}
                        {focusNodeId && (
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setFocusNodeId(null)}
                                className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
                            >
                                <X className="h-3 w-3 mr-1" />
                                Clear Focus
                            </Button>
                        )}

                        <div className="h-8 w-px bg-gray-200 mx-2" />

                        <Button variant="outline" size="sm" onClick={fetchGraph} className="bg-white">
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Refresh
                        </Button>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-0 h-[calc(100%-80px)] relative">
                <ReactFlow
                    nodes={filteredNodes}
                    edges={filteredEdges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onNodeClick={onNodeClick}
                    nodeTypes={nodeTypes}
                    fitView
                    minZoom={0.2}
                    maxZoom={2}
                    className="bg-dots-pattern"
                >
                    <Background color="#94a3b8" gap={20} size={1} style={{ opacity: 0.1 }} />
                    <Controls showInteractive={false} className="bg-white shadow-lg border-0 rounded-lg overflow-hidden" />
                    <MiniMap
                        className="!bottom-4 !right-4 rounded-lg overflow-hidden border shadow-lg"
                        zoomable
                        pannable
                        nodeColor={(n) => {
                            // Simple mapping for minimap
                            return n.data?.node_type?.includes('patient') ? '#10b981' :
                                n.data?.node_type?.includes('disease') ? '#3b82f6' :
                                    n.data?.node_type?.includes('hcp') ? '#f97316' : '#8b5cf6'
                        }}
                    />
                </ReactFlow>

                {/* Relationship Legend */}
                <div className="absolute top-4 left-4 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md shadow-lg rounded-lg border p-3 text-xs max-w-[200px]">
                    <h4 className="font-semibold text-sm mb-2 text-gray-700">Relationship Types</h4>
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-0.5 bg-emerald-500" />
                            <span className="text-gray-600">Addresses (solves a tension)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-0.5 bg-blue-500" />
                            <span className="text-gray-600">Supports (reinforces)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-0.5 bg-red-500 border-dashed border-t-2 border-red-500 bg-transparent" style={{ borderStyle: 'dashed' }} />
                            <span className="text-gray-600">Contradicts (conflicts)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-0.5 bg-amber-500" />
                            <span className="text-gray-600">Triggers (causes)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-0.5 bg-violet-500" />
                            <span className="text-gray-600">Influences</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-0.5 bg-pink-500" />
                            <span className="text-gray-600">Resonates (aligns with)</span>
                        </div>
                    </div>

                    {/* Story Flow Presets */}
                    <div className="mt-3 pt-3 border-t">
                        <h4 className="font-semibold text-sm mb-2 text-gray-700">Quick Views</h4>
                        <div className="space-y-1.5">
                            <button
                                onClick={() => { setFilterType('all'); setFilterRelation('all'); setFocusNodeId(null); }}
                                className={`w-full text-left px-2 py-1 rounded text-xs transition-colors ${filterType === 'all' && filterRelation === 'all' ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-gray-100'}`}
                            >
                                🔍 Full Graph
                            </button>
                            <button
                                onClick={() => { setFilterType('patient_tension'); setFilterRelation('all'); setFocusNodeId(null); }}
                                className={`w-full text-left px-2 py-1 rounded text-xs transition-colors ${filterType === 'patient_tension' ? 'bg-rose-100 text-rose-700' : 'hover:bg-gray-100'}`}
                            >
                                😰 Patient Tensions
                            </button>
                            <button
                                onClick={() => { setFilterType('key_message'); setFilterRelation('all'); setFocusNodeId(null); }}
                                className={`w-full text-left px-2 py-1 rounded text-xs transition-colors ${filterType === 'key_message' ? 'bg-purple-100 text-purple-700' : 'hover:bg-gray-100'}`}
                            >
                                💬 Key Messages
                            </button>
                            <button
                                onClick={() => { setFilterType('value_proposition'); setFilterRelation('all'); setFocusNodeId(null); }}
                                className={`w-full text-left px-2 py-1 rounded text-xs transition-colors ${filterType === 'value_proposition' ? 'bg-pink-100 text-pink-700' : 'hover:bg-gray-100'}`}
                            >
                                💎 Value Propositions
                            </button>
                            <button
                                onClick={() => { setFilterType('all'); setFilterRelation('addresses'); setFocusNodeId(null); }}
                                className={`w-full text-left px-2 py-1 rounded text-xs transition-colors ${filterRelation === 'addresses' ? 'bg-emerald-100 text-emerald-700' : 'hover:bg-gray-100'}`}
                            >
                                🎯 Messages → Tensions
                            </button>
                            <button
                                onClick={() => { setFilterType('all'); setFilterRelation('triggers'); setFocusNodeId(null); }}
                                className={`w-full text-left px-2 py-1 rounded text-xs transition-colors ${filterRelation === 'triggers' ? 'bg-amber-100 text-amber-700' : 'hover:bg-gray-100'}`}
                            >
                                ⚡ What Triggers What
                            </button>
                        </div>
                    </div>

                    <div className="mt-3 pt-2 border-t text-[10px] text-gray-400">
                        Click nodes for details. Drag to rearrange.
                    </div>
                </div>

                {/* Floating Detail Panel */}
                {selectedNode && (
                    <div className="absolute top-4 right-4 w-80 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md shadow-2xl rounded-xl border border-white/20 p-5 animate-in slide-in-from-right-10 duration-200">
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h3 className="font-semibold text-lg leading-tight">Insight Details</h3>
                                <p className="text-xs text-muted-foreground mt-1">ID: {selectedNode.id?.substring(0, 8)}...</p>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 rounded-full hover:bg-gray-100"
                                onClick={() => setSelectedNode(null)}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>

                        <div className="space-y-4">
                            <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                                <Badge variant="outline" className="mb-2 bg-white dark:bg-gray-900">
                                    {selectedNode.node_type?.replace(/_/g, ' ')}
                                </Badge>
                                <p className="text-sm font-medium leading-relaxed">
                                    {selectedNode.text}
                                </p>
                            </div>

                            {selectedNode.source_quote && (
                                <div>
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Source Evidence</label>
                                    <div className="mt-1.5 pl-3 border-l-2 border-indigo-500 italic text-sm text-gray-600 dark:text-gray-400">
                                        "{selectedNode.source_quote}"
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Segment</label>
                                    <p className="text-sm mt-1">{selectedNode.segment || "General"}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Confidence</label>
                                    <div className="flex items-center gap-2 mt-1">
                                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-green-500 rounded-full"
                                                style={{ width: `${(selectedNode.confidence || 0.7) * 100}%` }}
                                            />
                                        </div>
                                        <span className="text-xs font-mono">{Math.round((selectedNode.confidence || 0.7) * 100)}%</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

export default KnowledgeGraphView
