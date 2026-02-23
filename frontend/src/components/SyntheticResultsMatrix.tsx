"use client"

import React from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BarChart3, ImageIcon } from "lucide-react"
import type { SyntheticTestingResponse } from "@/lib/api"

interface Asset {
    id: string;
    name: string;
    preview?: string;
}

interface SyntheticResultsMatrixProps {
    results: SyntheticTestingResponse
    assets: Asset[]
}

export function SyntheticResultsMatrix({ results, assets }: SyntheticResultsMatrixProps) {
    const matrix = results.results_matrix || []

    // Get unique personas and assets from the matrix
    const uniquePersonas = Array.from(
        new Map(matrix.map(cell => [cell.persona_id, cell.persona_name])).entries()
    ).map(([id, name]) => ({ persona_id: id, persona_name: name }))

    const uniqueAssetIds = Array.from(new Set(matrix.map(cell => cell.asset_id)))
    const orderedAssets = uniqueAssetIds.map(id => assets.find(a => a.id === id)).filter(Boolean) as Asset[]

    if (matrix.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground bg-muted/10 rounded-lg border-2 border-dashed">
                <BarChart3 className="h-12 w-12 mb-4 opacity-20" />
                <p>No recommendation matrix data available.</p>
                <p className="text-sm">Rerun simulation to generate actionable recommendations.</p>
            </div>
        )
    }

    return (
        <Card className="shadow-sm border-slate-200 dark:border-slate-800">
            <CardHeader className="bg-slate-50 dark:bg-slate-900/50 pb-4">
                <div className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Actionable Recommendations Matrix</CardTitle>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                    Direct synthesized feedback for each Persona × Asset combination.
                </p>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                    <thead>
                        <tr className="bg-slate-800 dark:bg-slate-950 text-white">
                            <th className="p-4 text-left sticky left-0 bg-slate-800 dark:bg-slate-950 z-10 w-[180px] border-r border-slate-700">
                                Persona
                            </th>
                            {orderedAssets.map((asset) => (
                                <th key={asset.id} className="p-4 text-left min-w-[280px]">
                                    <div className="flex items-center gap-3">
                                        {asset.preview ? (
                                            <img
                                                src={asset.preview}
                                                alt=""
                                                className="h-10 w-10 rounded object-cover border border-slate-600 shadow-sm"
                                            />
                                        ) : (
                                            <div className="h-10 w-10 rounded bg-slate-700 flex items-center justify-center">
                                                <ImageIcon className="h-5 w-5 opacity-40" />
                                            </div>
                                        )}
                                        <div className="flex flex-col">
                                            <span className="font-bold truncate max-w-[200px]">{asset.name}</span>
                                            <span className="text-[10px] opacity-60 uppercase tracking-wider">Asset</span>
                                        </div>
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {uniquePersonas.map((persona, pIdx) => (
                            <tr key={persona.persona_id} className="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                <td className="p-4 align-top font-semibold text-slate-900 dark:text-slate-100 sticky left-0 bg-white dark:bg-slate-900 z-10 border-r dark:border-slate-800 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                                    {persona.persona_name}
                                </td>
                                {orderedAssets.map((asset) => {
                                    const cell = matrix.find(
                                        c => c.persona_id === persona.persona_id && c.asset_id === asset.id
                                    )
                                    return (
                                        <td key={asset.id} className="p-4 align-top">
                                            {cell ? (
                                                <div className="space-y-1">
                                                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed italic">
                                                        "{cell.recommendation}"
                                                    </p>
                                                </div>
                                            ) : (
                                                <span className="text-slate-400 italic">No feedback.</span>
                                            )}
                                        </td>
                                    )
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </CardContent>
        </Card>
    )
}
