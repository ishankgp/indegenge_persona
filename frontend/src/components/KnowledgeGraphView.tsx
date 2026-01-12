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
import { Loader2, RefreshCw, Network, AlertTriangle, CheckCircle, Filter, X, Layout } from 'lucide-react'
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
            const flowNodes: Node[] = rawNodes.map((n: any) => ({
                id: n.id,
                type: 'knowledgeNode',
                data: { ...n, label: n.text }, // Use text as label for custom node
                position: { x: 0, y: 0 } // Layout will set this
            }))

            // Style edges
            const flowEdges: Edge[] = rawEdges.map((edge: any) => ({
                id: edge.id || `${edge.source}-${edge.target}`,
                source: edge.source,
                target: edge.target,
                type: 'smoothstep', // Smoother curves
                animated: true,
                style: {
                    stroke: RELATION_COLORS[edge.data?.relation_type] || '#9ca3af',
                    strokeWidth: 2,
                    opacity: 0.6,
                },
                markerEnd: {
                    type: MarkerType.ArrowClosed,
                    color: RELATION_COLORS[edge.data?.relation_type] || '#9ca3af',
                },
                data: edge.data
            }))

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

    // Filter logic
    const filteredNodes = useMemo(() => {
        const visibleNodes = filterType === 'all'
            ? nodes
            : nodes.filter(n => n.data.node_type === filterType)

        // Re-run layout on filtered subset? 
        // For simplicity, we just hide/show but keep positions to prevent jumping
        // OR we could re-layout. Let's return filtered list, ReactFlow handles hiding if not present.
        return visibleNodes
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
