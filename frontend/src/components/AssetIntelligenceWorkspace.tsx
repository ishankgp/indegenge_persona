import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import {
    Upload,
    History,
    ZoomIn,
    ZoomOut,
    Download,
    ArrowLeft,
    Clock,
    ImageIcon,
    Maximize2,
    BookOpen,
    AlertCircle,
    Zap,
    Users,
    ChevronDown,
    ChevronUp
} from 'lucide-react'
import type { AssetAnalysisResult, AssetHistoryItem } from '@/lib/api'
import { PreFlightCheckBanner } from './PreFlightCheckBanner'

// Persona type for selector
interface PersonaItem {
    id: number
    name: string
    persona_type?: string
}

interface AssetIntelligenceWorkspaceProps {
    results: AssetAnalysisResult[]
    history: AssetHistoryItem[]
    isLoading: boolean
    isAnalyzing: boolean
    onUpload: (files: FileList | null) => void
    onAnalyze: () => void
    onLoadHistory: (item: AssetHistoryItem) => void
    onBack: () => void
    assetPreview: string | null
    selectedPersonasCount: number
    // New props for pre-flight check
    brandId?: number | null
    selectedPersonaIds?: number[]
    onViewKnowledgeGraph?: () => void
    // New props for persona selector
    personas?: PersonaItem[]
    onTogglePersona?: (id: number) => void
}

export function AssetIntelligenceWorkspace({
    results,
    history,
    isLoading,
    isAnalyzing,
    onUpload,
    onAnalyze,
    onLoadHistory,
    onBack,
    assetPreview,
    selectedPersonasCount,
    brandId,
    selectedPersonaIds = [],
    onViewKnowledgeGraph,
    personas = [],
    onTogglePersona
}: AssetIntelligenceWorkspaceProps) {
    const [zoom, setZoom] = useState(1)
    const [pan, setPan] = useState({ x: 0, y: 0 })
    const [activePersonaIndex, setActivePersonaIndex] = useState(0)
    const [isDragging, setIsDragging] = useState(false)
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
    const [showPersonaSelector, setShowPersonaSelector] = useState(true)
    const imageRef = useRef<HTMLDivElement>(null)

    const activeResult = results[activePersonaIndex]
    const hasResults = results.length > 0

    // Reset zoom/pan when results change
    useEffect(() => {
        setZoom(1)
        setPan({ x: 0, y: 0 })
        setActivePersonaIndex(0)
    }, [results])

    const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.5, 4))
    const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.5, 0.5))
    const handleResetView = () => {
        setZoom(1)
        setPan({ x: 0, y: 0 })
    }

    // Pan handlers
    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true)
        setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
    }

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return
        setPan({
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y
        })
    }

    const handleMouseUp = () => setIsDragging(false)

    // Download handler
    const handleDownload = () => {
        if (!activeResult?.annotated_image) return
        const link = document.createElement('a')
        const imageData = activeResult.annotated_image.startsWith('data:')
            ? activeResult.annotated_image
            : `data:image/png;base64,${activeResult.annotated_image}`
        link.href = imageData
        link.download = `${activeResult.persona_name.replace(/\s+/g, '_')}_feedback.png`
        link.click()
    }

    // Format relative time for history
    const formatRelTime = (dateStr: string) => {
        const date = new Date(dateStr)
        const diff = Date.now() - date.getTime()
        const mins = Math.floor(diff / 60000)
        if (mins < 60) return `${mins}m ago`
        const hours = Math.floor(mins / 60)
        if (hours < 24) return `${hours}h ago`
        return `${Math.floor(hours / 24)}d ago`
    }

    return (
        <div className="flex h-full w-full bg-background overflow-hidden border-t">

            {/* LEFT SIDEBAR: History & Actions */}
            <div className="w-80 flex-shrink-0 border-r bg-muted/20 flex flex-col">
                <div className="p-4 border-b">
                    <Button variant="ghost" size="sm" onClick={onBack} className="mb-4 -ml-2 text-muted-foreground">
                        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Hub
                    </Button>

                    <h2 className="font-semibold text-lg flex items-center gap-2 mb-4">
                        <History className="h-5 w-5 text-violet-500" />
                        Recent Analyses
                    </h2>

                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-violet-200 rounded-lg cursor-pointer bg-violet-50/50 hover:bg-violet-50 hover:border-violet-300 transition-colors dark:border-violet-900 dark:bg-violet-900/10">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <Upload className="h-8 w-8 text-violet-500 mb-2" />
                            <p className="text-sm text-muted-foreground">New Asset Analysis</p>
                        </div>
                        <input type="file" className="hidden" accept="image/*" onChange={(e) => onUpload(e.target.files)} />
                    </label>
                </div>

                {/* Persona Selector Section */}
                {personas.length > 0 && onTogglePersona && (
                    <div className="border-b">
                        <button
                            onClick={() => setShowPersonaSelector(!showPersonaSelector)}
                            className="w-full p-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
                        >
                            <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-violet-500" />
                                <span className="font-medium text-sm">Target Personas</span>
                                <Badge variant="secondary" className="text-xs">
                                    {selectedPersonaIds.length} selected
                                </Badge>
                            </div>
                            {showPersonaSelector ? (
                                <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            ) : (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                        </button>

                        {showPersonaSelector && (
                            <div className="px-3 pb-3 space-y-1 max-h-48 overflow-y-auto">
                                {personas.slice(0, 20).map((persona) => {
                                    const isSelected = selectedPersonaIds.includes(persona.id)
                                    return (
                                        <button
                                            key={persona.id}
                                            onClick={() => onTogglePersona(persona.id)}
                                            className={`w-full flex items-center gap-2 p-2 rounded-md text-left text-sm transition-colors ${isSelected
                                                    ? 'bg-violet-50 border border-violet-200 dark:bg-violet-900/20 dark:border-violet-800'
                                                    : 'hover:bg-muted border border-transparent'
                                                }`}
                                        >
                                            <Checkbox checked={isSelected} className="pointer-events-none" />
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium truncate">{persona.name}</p>
                                                {persona.persona_type && (
                                                    <p className="text-xs text-muted-foreground">{persona.persona_type}</p>
                                                )}
                                            </div>
                                        </button>
                                    )
                                })}
                                {personas.length > 20 && (
                                    <p className="text-xs text-muted-foreground text-center py-2">
                                        +{personas.length - 20} more personas available
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Pre-flight Check Banner */}
                {selectedPersonaIds.length > 0 && (
                    <div className="p-3 border-b">
                        <PreFlightCheckBanner
                            brandId={brandId ?? null}
                            personaIds={selectedPersonaIds}
                            onViewKnowledgeGraph={onViewKnowledgeGraph}
                        />
                    </div>
                )}

                <ScrollArea className="flex-1">
                    <div className="p-2 space-y-1">
                        {history.map((item) => (
                            <button
                                key={item.image_hash}
                                onClick={() => onLoadHistory(item)}
                                className="w-full text-left p-3 rounded-md hover:bg-accent transition-colors group flex items-start gap-3 border border-transparent hover:border-border"
                            >
                                <div className="h-10 w-10 bg-muted rounded flex items-center justify-center shrink-0">
                                    <ImageIcon className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium truncate">{item.asset_name}</p>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                        <Clock className="h-3 w-3" />
                                        {formatRelTime(item.created_at)}
                                        <span className="text-violet-500 font-medium ml-auto">
                                            {item.results.length} personas
                                        </span>
                                    </div>
                                </div>
                            </button>
                        ))}
                        {history.length === 0 && (
                            <div className="text-center p-8 text-muted-foreground text-sm">
                                No history yet
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </div>

            {/* CENTER: Main Canvas */}
            <div className="flex-1 bg-zinc-900 relative overflow-hidden flex flex-col">
                {/* Canvas Toolbar */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-md rounded-full px-4 py-2 flex items-center gap-2 z-10 border border-white/10 shadow-xl">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20 rounded-full" onClick={handleZoomOut}>
                        <ZoomOut className="h-4 w-4" />
                    </Button>
                    <span className="text-xs text-white font-medium w-12 text-center">{Math.round(zoom * 100)}%</span>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20 rounded-full" onClick={handleZoomIn}>
                        <ZoomIn className="h-4 w-4" />
                    </Button>
                    <div className="w-px h-4 bg-white/20 mx-1" />
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20 rounded-full" onClick={handleResetView}>
                        <Maximize2 className="h-4 w-4" />
                    </Button>
                </div>

                {/* The Canvas */}
                <div
                    className={`flex-1 flex items-center justify-center overflow-hidden cursor-${isDragging ? 'grabbing' : 'grab'}`}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    ref={imageRef}
                >
                    <div
                        style={{
                            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                            transition: isDragging ? 'none' : 'transform 0.2s ease-out'
                        }}
                        className="relative shadow-2xl"
                    >
                        {isLoading || isAnalyzing ? (
                            <div className="bg-zinc-800/50 rounded-lg p-12 flex flex-col items-center animate-pulse">
                                <ImageIcon className="h-16 w-16 text-zinc-600 mb-4" />
                                <div className="text-zinc-400 font-medium">Analyzing Asset...</div>
                            </div>
                        ) : activeResult?.annotated_image ? (
                            <img
                                src={activeResult.annotated_image.startsWith('data:')
                                    ? activeResult.annotated_image
                                    : `data:image/png;base64,${activeResult.annotated_image}`}
                                alt="Annotated Asset"
                                className="max-w-[80vw] max-h-[80vh] object-contain rounded-md select-none pointer-events-none"
                                draggable={false}
                            />
                        ) : assetPreview ? (
                            <img
                                src={assetPreview}
                                alt="Preview"
                                className="max-w-[70vw] max-h-[70vh] object-contain rounded-md opacity-50"
                            />
                        ) : (
                            <div className="text-zinc-600 flex flex-col items-center">
                                <ImageIcon className="h-16 w-16 mb-4 opacity-20" />
                                <p>Upload an asset to begin</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* RIGHT SIDEBAR: Feedback & Details */}
            {hasResults && (
                <div className="w-96 flex-shrink-0 border-l bg-background flex flex-col shadow-xl z-20">
                    <div className="p-4 border-b bg-muted/10">
                        <h3 className="font-semibold mb-3">Persona Feedback</h3>
                        {/* Persona Selector Carousel */}
                        <ScrollArea className="w-full whitespace-nowrap pb-2">
                            <div className="flex gap-2">
                                {results.map((result, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setActivePersonaIndex(idx)}
                                        className={`flex flex-col items-center p-2 rounded-lg border min-w-[80px] transition-all ${idx === activePersonaIndex
                                            ? 'bg-violet-50 border-violet-500 ring-1 ring-violet-500 dark:bg-violet-900/20'
                                            : 'bg-background border-border hover:border-violet-300'
                                            }`}
                                    >
                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs mb-1">
                                            {result.persona_name.charAt(0)}
                                        </div>
                                        <span className="text-[10px] font-medium max-w-full truncate px-1">
                                            {result.persona_name.split(' ')[0]}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>

                    <ScrollArea className="flex-1 p-6">
                        {activeResult && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">

                                {/* Header */}
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-600 to-indigo-600">
                                            {activeResult.persona_name}
                                        </h2>
                                        {activeResult.research_alignment_score != null && (
                                            <Badge variant={activeResult.research_alignment_score && activeResult.research_alignment_score > 70 ? 'default' : 'secondary'}>
                                                {activeResult.research_alignment_score}% Aligned
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="text-sm text-muted-foreground">Detailed Persona Feedback</p>
                                </div>

                                {/* Text Feedback */}
                                <div className="prose prose-sm dark:prose-invert max-w-none">
                                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                        {activeResult.text_summary}
                                    </p>
                                </div>

                                {/* Citations Section - NEW */}
                                {activeResult.citations && activeResult.citations.length > 0 && (
                                    <div className="bg-blue-50/50 dark:bg-blue-900/10 rounded-xl p-4 border border-blue-100 dark:border-blue-900/50">
                                        <h4 className="flex items-center gap-2 text-sm font-semibold text-blue-700 dark:text-blue-300 mb-3">
                                            <BookOpen className="h-4 w-4" />
                                            Research Evidence
                                        </h4>
                                        <div className="space-y-3">
                                            {activeResult.citations.map((cite, i) => (
                                                <div key={i} className="text-xs bg-white dark:bg-black/20 p-2 rounded border border-blue-100 dark:border-blue-800/30">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <Badge variant="outline" className="h-5 text-[10px] px-1 border-blue-200 text-blue-600">
                                                            {cite.id}
                                                        </Badge>
                                                        {cite.confidence && (
                                                            <span className="text-[10px] text-muted-foreground">match: {(cite.confidence * 100).toFixed(0)}%</span>
                                                        )}
                                                    </div>
                                                    <p className="text-muted-foreground italic">"{cite.text}"</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="pt-4">
                                    <Button onClick={handleDownload} className="w-full" variant="outline">
                                        <Download className="h-4 w-4 mr-2" />
                                        Download Annotated Asset
                                    </Button>
                                </div>
                            </div>
                        )}
                        {!activeResult && !isAnalyzing && (
                            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-sm">
                                <AlertCircle className="h-8 w-8 mb-2 opacity-50" />
                                Select a persona to view details
                            </div>
                        )}
                    </ScrollArea>
                </div>
            )}

            {/* If no results and not analyzing, but we have preview */}
            {!hasResults && assetPreview && (
                <div className="w-96 flex-shrink-0 border-l bg-background p-6 flex flex-col justify-center items-center text-center">
                    <ImageIcon className="h-16 w-16 text-violet-200 mb-4" />
                    <h3 className="font-semibold text-lg mb-2">Ready to Analyze</h3>
                    <p className="text-muted-foreground text-sm mb-6">
                        You've selected {selectedPersonasCount} personas. <br />
                        Click the button below to generate AI-powered feedback.
                    </p>
                    <Button size="lg" className="w-full bg-violet-600 hover:bg-violet-700" onClick={onAnalyze} disabled={isAnalyzing}>
                        {isAnalyzing ? 'Analyzing...' : 'Run Asset Intelligence'}
                    </Button>
                </div>
            )}
        </div>
    )
}
