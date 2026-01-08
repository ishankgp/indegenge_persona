"use client"

import { useState } from 'react'
import type { AssetAnalysisResult } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2, ImageIcon, ChevronLeft, ChevronRight, Download, AlertCircle } from 'lucide-react'

interface AnnotatedAssetViewerProps {
    results: AssetAnalysisResult[]
    originalAssetUrl?: string
    isLoading?: boolean
}

export function AnnotatedAssetViewer({
    results,
    originalAssetUrl,
    isLoading = false
}: AnnotatedAssetViewerProps) {
    const [currentIndex, setCurrentIndex] = useState(0)

    if (isLoading) {
        return (
            <Card className="w-full">
                <CardContent className="flex flex-col items-center justify-center py-16">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                    <p className="text-muted-foreground">Analyzing asset with Nano Banana Pro...</p>
                    <p className="text-sm text-muted-foreground mt-2">Each persona is providing their professional feedback</p>
                </CardContent>
            </Card>
        )
    }

    if (!results || results.length === 0) {
        return (
            <Card className="w-full">
                <CardContent className="flex flex-col items-center justify-center py-16">
                    <ImageIcon className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No analysis results yet</p>
                    <p className="text-sm text-muted-foreground mt-2">Upload an asset and select personas to analyze</p>
                </CardContent>
            </Card>
        )
    }

    const currentResult = results[currentIndex]
    const hasError = !!currentResult.error
    const hasImage = !!currentResult.annotated_image

    const handlePrevious = () => {
        setCurrentIndex((prev) => (prev === 0 ? results.length - 1 : prev - 1))
    }

    const handleNext = () => {
        setCurrentIndex((prev) => (prev === results.length - 1 ? 0 : prev + 1))
    }

    const handleDownload = () => {
        if (!currentResult.annotated_image) return

        const link = document.createElement('a')
        link.href = `data:image/png;base64,${currentResult.annotated_image}`
        link.download = `${currentResult.persona_name.replace(/\s+/g, '_')}_feedback.png`
        link.click()
    }

    return (
        <Card className="w-full">
            <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <CardTitle className="text-lg">Asset Feedback</CardTitle>
                        <Badge variant="secondary" className="font-normal">
                            {currentIndex + 1} of {results.length} personas
                        </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handlePrevious}
                            disabled={results.length <= 1}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleNext}
                            disabled={results.length <= 1}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                        {hasImage && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleDownload}
                            >
                                <Download className="h-4 w-4 mr-1" />
                                Download
                            </Button>
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Persona Badge */}
                <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                            <span className="text-sm font-semibold text-primary">
                                {currentResult.persona_name.charAt(0)}
                            </span>
                        </div>
                        <div>
                            <p className="font-medium">{currentResult.persona_name}</p>
                            <p className="text-xs text-muted-foreground">Persona #{currentResult.persona_id}</p>
                        </div>
                    </div>
                    {hasError && (
                        <Badge variant="destructive" className="gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Error
                        </Badge>
                    )}
                </div>

                {/* Annotated Image or Error */}
                {hasError ? (
                    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-destructive mb-2">
                            <AlertCircle className="h-5 w-5" />
                            <span className="font-medium">Analysis Failed</span>
                        </div>
                        <p className="text-sm text-destructive/80">{currentResult.error}</p>
                        {originalAssetUrl && (
                            <div className="mt-4">
                                <p className="text-sm text-muted-foreground mb-2">Original Asset:</p>
                                <img
                                    src={originalAssetUrl}
                                    alt="Original asset"
                                    className="max-w-full max-h-[400px] object-contain rounded border"
                                />
                            </div>
                        )}
                    </div>
                ) : hasImage ? (
                    <div className="relative">
                        <img
                            src={`data:image/png;base64,${currentResult.annotated_image}`}
                            alt={`Annotated feedback from ${currentResult.persona_name}`}
                            className="w-full max-h-[600px] object-contain rounded-lg border shadow-sm"
                        />
                    </div>
                ) : (
                    <div className="bg-muted/30 rounded-lg p-8 text-center">
                        <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                        <p className="text-muted-foreground">No annotated image returned</p>
                        {originalAssetUrl && (
                            <div className="mt-4">
                                <p className="text-sm text-muted-foreground mb-2">Original Asset:</p>
                                <img
                                    src={originalAssetUrl}
                                    alt="Original asset"
                                    className="max-w-full max-h-[400px] object-contain rounded border mx-auto"
                                />
                            </div>
                        )}
                    </div>
                )}

                {/* Text Summary */}
                {currentResult.text_summary && (
                    <div className="bg-muted/30 rounded-lg p-4">
                        <p className="text-sm font-medium mb-2 text-foreground">Feedback Summary</p>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {currentResult.text_summary}
                        </p>
                    </div>
                )}

                {/* Navigation Dots */}
                {results.length > 1 && (
                    <div className="flex items-center justify-center gap-2 pt-2">
                        {results.map((_, index) => (
                            <button
                                key={index}
                                onClick={() => setCurrentIndex(index)}
                                className={`w-2 h-2 rounded-full transition-colors ${index === currentIndex
                                        ? 'bg-primary'
                                        : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                                    }`}
                                aria-label={`View result ${index + 1}`}
                            />
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
