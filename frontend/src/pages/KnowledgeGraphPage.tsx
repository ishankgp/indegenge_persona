"use client"

import { useState, useEffect } from "react"
import { BrandsAPI } from "@/lib/api"
import { KnowledgeGraphView } from "@/components/KnowledgeGraphView"
import { Network, AlertCircle } from "lucide-react"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"

interface Brand {
    id: number
    name: string
}

export function KnowledgeGraphPage() {
    const [brands, setBrands] = useState<Brand[]>([])
    const [selectedBrandId, setSelectedBrandId] = useState<string>("")
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchBrands()
    }, [])

    const fetchBrands = async () => {
        try {
            const data = await BrandsAPI.list()
            setBrands(data)
            if (data.length > 0) {
                setSelectedBrandId(data[0].id.toString())
            }
        } catch (err) {
            console.error("Failed to fetch brands", err)
        } finally {
            setLoading(false)
        }
    }

    const selectedBrand = brands.find(b => b.id.toString() === selectedBrandId)

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-violet-50 dark:from-gray-950 dark:via-gray-900 dark:to-violet-950">
            {/* Header */}
            <div className="bg-gradient-to-r from-[hsl(262,60%,38%)] via-[hsl(262,60%,42%)] to-[hsl(280,60%,45%)]">
                <div className="max-w-7xl mx-auto px-8 py-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                                <Network className="h-8 w-8 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-white tracking-tight">Knowledge Graph</h1>
                                <p className="text-white/80 mt-1">
                                    Visualize connections between brand pillars, market insights, and patient needs
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <Select value={selectedBrandId} onValueChange={setSelectedBrandId}>
                                <SelectTrigger className="w-[200px] bg-white/10 text-white border-white/20">
                                    <SelectValue placeholder="Select Brand" />
                                </SelectTrigger>
                                <SelectContent>
                                    {brands.map(b => (
                                        <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-8 py-8">
                {!loading && brands.length === 0 ? (
                    <Card className="border-0 shadow-xl backdrop-blur-sm bg-white/90 dark:bg-gray-900/90">
                        <CardContent className="flex flex-col items-center justify-center py-12">
                            <AlertCircle className="h-12 w-12 text-gray-400 mb-4" />
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">No Brands Found</h3>
                            <p className="text-gray-500 text-center max-w-sm mt-2">
                                Create a brand in the Brand Library to start visualizing its knowledge graph.
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    selectedBrandId && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <KnowledgeGraphView
                                brandId={parseInt(selectedBrandId)}
                                brandName={selectedBrand?.name}
                            />
                        </div>
                    )
                )}
            </div>
        </div>
    )
}
