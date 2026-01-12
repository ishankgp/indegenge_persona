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
        <div className="min-h-screen bg-gray-50/50 dark:bg-gray-950/50">
            {/* Header */}
            <div className="bg-white dark:bg-gray-900 border-b relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-blue-500/10" />
                <div className="absolute inset-0 bg-grid-pattern opacity-[0.03]" />

                <div className="max-w-7xl mx-auto px-6 py-6 relative">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-violet-100 dark:bg-violet-900/30 rounded-xl shadow-sm ring-1 ring-violet-200 dark:ring-violet-800">
                                <Network className="h-7 w-7 text-violet-600 dark:text-violet-400" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Knowledge Graph</h1>
                                <p className="text-muted-foreground mt-1 text-sm">
                                    Interactive visualization of brand insights, market dynamics, and patient needs
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <Select value={selectedBrandId} onValueChange={setSelectedBrandId}>
                                <SelectTrigger className="w-[240px] h-10 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm transition-all hover:bg-gray-50">
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

            <div className="max-w-[1600px] mx-auto px-6 py-8">
                {!loading && brands.length === 0 ? (
                    <Card className="border-dashed border-2 shadow-none bg-transparent">
                        <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                                <AlertCircle className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">No Brands Available</h3>
                            <p className="text-muted-foreground max-w-sm mx-auto">
                                Get started by creating your first brand persona in the Brand Library.
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    selectedBrandId && (
                        <div className="animate-in fade-in zoom-in-95 duration-500">
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
