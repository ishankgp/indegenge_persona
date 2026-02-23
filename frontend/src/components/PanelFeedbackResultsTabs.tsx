"use client"

import React, { useState } from "react"
import { PanelFeedbackSummaryComponent } from "./PanelFeedbackSummary"
import { PersonaFeedbackPanel } from "./PersonaFeedbackPanel"
import type { PanelFeedbackResponse } from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import { ImageIcon, BarChart3 } from "lucide-react"

interface PanelFeedbackResultsTabsProps {
    results: PanelFeedbackResponse
    imagePreviews: string[]
}

export function PanelFeedbackResultsTabs({ results, imagePreviews }: PanelFeedbackResultsTabsProps) {
    const [activeTab, setActiveTab] = useState(0)

    const imageResults = results.image_results || []
    const resultsTable = results.results_table || []

    // Tabs: one per image + "Results" tab at the end
    const totalTabs = imageResults.length + 1

    // Get unique personas and images for the results table
    const uniquePersonas = Array.from(
        new Map(resultsTable.map(cell => [cell.persona_id, cell.persona_name])).entries()
    ).map(([id, name]) => ({ persona_id: id, persona_name: name }))

    const uniqueImages = Array.from(new Set(resultsTable.map(cell => cell.image_filename)))

    return (
        <div className="flex flex-col h-full">
            {/* Tab bar */}
            <div className="flex items-center border-b bg-muted/30 overflow-x-auto shrink-0">
                {imageResults.map((imgResult, idx) => (
                    <button
                        key={idx}
                        onClick={() => setActiveTab(idx)}
                        className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === idx
                                ? "border-primary text-primary bg-background"
                                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
                            }`}
                    >
                        {imagePreviews[idx] ? (
                            <img
                                src={imagePreviews[idx]}
                                alt=""
                                className="h-6 w-6 rounded object-cover border"
                            />
                        ) : (
                            <ImageIcon className="h-4 w-4" />
                        )}
                        <span className="max-w-[120px] truncate">{imgResult.image_filename}</span>
                    </button>
                ))}
                <button
                    onClick={() => setActiveTab(imageResults.length)}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === imageResults.length
                            ? "border-primary text-primary bg-background"
                            : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        }`}
                >
                    <BarChart3 className="h-4 w-4" />
                    Results
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {uniquePersonas.length}×{uniqueImages.length}
                    </Badge>
                </button>
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-auto p-6">
                {activeTab < imageResults.length ? (
                    // Image tab: show panel synthesis + persona cards for this image
                    <div className="space-y-6">
                        {/* Image preview */}
                        {imagePreviews[activeTab] && (
                            <div className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg border">
                                <img
                                    src={imagePreviews[activeTab]}
                                    alt={imageResults[activeTab].image_filename}
                                    className="h-16 w-16 rounded-md object-cover border"
                                />
                                <div>
                                    <p className="text-sm font-medium">{imageResults[activeTab].image_filename}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {imageResults[activeTab].persona_cards.length} persona responses
                                    </p>
                                </div>
                            </div>
                        )}

                        <PanelFeedbackSummaryComponent
                            summary={imageResults[activeTab].summary}
                            personaCount={imageResults[activeTab].persona_cards.length}
                        />
                        <PersonaFeedbackPanel cards={imageResults[activeTab].persona_cards} />
                    </div>
                ) : (
                    // Results tab: summary table
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <BarChart3 className="h-5 w-5 text-primary" />
                            <h3 className="text-lg font-semibold">Recommendations Matrix</h3>
                            <p className="text-sm text-muted-foreground ml-2">
                                1 actionable recommendation per persona × image
                            </p>
                        </div>

                        {resultsTable.length > 0 ? (
                            <div className="border rounded-lg overflow-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b bg-muted/50">
                                            <th className="text-left p-3 font-semibold sticky left-0 bg-muted/50 min-w-[160px]">
                                                Persona
                                            </th>
                                            {uniqueImages.map((imgName, idx) => (
                                                <th key={idx} className="text-left p-3 font-semibold min-w-[250px]">
                                                    <div className="flex items-center gap-2">
                                                        {imagePreviews[idx] ? (
                                                            <img
                                                                src={imagePreviews[idx]}
                                                                alt=""
                                                                className="h-6 w-6 rounded object-cover border"
                                                            />
                                                        ) : (
                                                            <ImageIcon className="h-4 w-4" />
                                                        )}
                                                        <span className="max-w-[180px] truncate">{imgName}</span>
                                                    </div>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {uniquePersonas.map((persona, pIdx) => (
                                            <tr key={persona.persona_id} className={pIdx % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                                                <td className={`p-3 font-medium sticky left-0 ${pIdx % 2 === 0 ? "bg-background" : "bg-muted/20"}`}>
                                                    {persona.persona_name}
                                                </td>
                                                {uniqueImages.map((imgName, iIdx) => {
                                                    const cell = resultsTable.find(
                                                        c => c.persona_id === persona.persona_id && c.image_filename === imgName
                                                    )
                                                    return (
                                                        <td key={iIdx} className="p-3">
                                                            <p className="text-sm leading-relaxed">
                                                                {cell?.recommendation || "—"}
                                                            </p>
                                                        </td>
                                                    )
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center text-muted-foreground py-8">
                                No results available
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
