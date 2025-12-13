"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, ChevronDown, ChevronRight, Target, Brain, AlertTriangle, Sparkles, Filter } from "lucide-react";
import { BrandsAPI, type BrandInsight, type BrandContextResponse } from "@/lib/api";
import { cn } from "@/lib/utils";

interface BrandMBTDashboardProps {
    brandId: number;
    brandName: string;
    className?: string;
}

const SEGMENT_OPTIONS = [
    { value: "all", label: "All Segments" },
    { value: "Patient", label: "Patient" },
    { value: "HCP", label: "HCP" },
    { value: "Elderly", label: "Elderly Patients" },
    { value: "Caregiver", label: "Caregivers" },
];

export function BrandMBTDashboard({ brandId, brandName, className }: BrandMBTDashboardProps) {
    const [loading, setLoading] = useState(false);
    const [context, setContext] = useState<BrandContextResponse | null>(null);
    const [segment, setSegment] = useState("all");
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
        motivations: true,
        beliefs: false,
        tensions: false,
    });

    useEffect(() => {
        if (brandId) {
            loadContext();
        }
    }, [brandId, segment]);

    const loadContext = async () => {
        setLoading(true);
        try {
            const params = segment !== "all" ? { target_segment: segment, limit_per_category: 10 } : { limit_per_category: 10 };
            const data = await BrandsAPI.getContext(brandId, params);
            setContext(data);
        } catch (error) {
            console.error("Failed to load brand context", error);
        } finally {
            setLoading(false);
        }
    };

    const toggleSection = (section: string) => {
        setExpandedSections((prev) => ({
            ...prev,
            [section]: !prev[section],
        }));
    };

    const totalInsights =
        (context?.motivations?.length || 0) +
        (context?.beliefs?.length || 0) +
        (context?.tensions?.length || 0);

    const InsightSection = ({
        title,
        insights,
        icon: Icon,
        color,
        bgColor,
        borderColor,
        sectionKey,
    }: {
        title: string;
        insights: BrandInsight[];
        icon: React.ElementType;
        color: string;
        bgColor: string;
        borderColor: string;
        sectionKey: string;
    }) => {
        const isExpanded = expandedSections[sectionKey];

        return (
            <div className="border rounded-lg overflow-hidden">
                <Button
                    variant="ghost"
                    onClick={() => toggleSection(sectionKey)}
                    className={cn(
                        "w-full justify-between p-3 h-auto rounded-none",
                        bgColor,
                        "hover:opacity-90 transition-opacity"
                    )}
                >
                    <div className="flex items-center gap-2">
                        <Icon className={cn("h-5 w-5", color)} />
                        <span className="font-semibold">{title}</span>
                        <Badge variant="secondary" className="ml-2">
                            {insights.length}
                        </Badge>
                    </div>
                    {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                    ) : (
                        <ChevronRight className="h-4 w-4" />
                    )}
                </Button>
                {isExpanded && (
                    <div className="space-y-2 p-3 bg-background">
                        {insights.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                                No {title.toLowerCase()} found for this segment.
                            </p>
                        ) : (
                            insights.map((insight, idx) => (
                                <div
                                    key={idx}
                                    className={cn(
                                        "text-sm p-3 rounded-lg border-l-4",
                                        bgColor,
                                        borderColor
                                    )}
                                >
                                    <p className="text-gray-800 dark:text-gray-200">{insight.text}</p>
                                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                                        {insight.segment && insight.segment !== "General" && (
                                            <Badge variant="outline" className="text-[10px]">
                                                {insight.segment}
                                            </Badge>
                                        )}
                                        {insight.source_document && (
                                            <span className="truncate max-w-[150px]" title={insight.source_document}>
                                                📄 {insight.source_document}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        );
    };

    return (
        <Card className={cn("border-primary/20", className)}>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-amber-500" />
                        <CardTitle className="text-base font-semibold">MBT Insights</CardTitle>
                    </div>
                    {totalInsights > 0 && (
                        <Badge variant="secondary" className="text-xs">
                            {totalInsights} total
                        </Badge>
                    )}
                </div>
                <CardDescription>
                    Aggregated Motivations, Beliefs & Tensions for {brandName}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Segment Filter */}
                <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <Select value={segment} onValueChange={setSegment}>
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Filter by segment" />
                        </SelectTrigger>
                        <SelectContent>
                            {SEGMENT_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                ) : context ? (
                    <ScrollArea className="h-[350px] pr-2">
                        <div className="space-y-2">
                            <InsightSection
                                title="Motivations"
                                insights={context.motivations}
                                icon={Target}
                                color="text-blue-600"
                                bgColor="bg-blue-50 dark:bg-blue-950/30"
                                borderColor="border-l-blue-500"
                                sectionKey="motivations"
                            />
                            <InsightSection
                                title="Beliefs"
                                insights={context.beliefs}
                                icon={Brain}
                                color="text-purple-600"
                                bgColor="bg-purple-50 dark:bg-purple-950/30"
                                borderColor="border-l-purple-500"
                                sectionKey="beliefs"
                            />
                            <InsightSection
                                title="Tensions"
                                insights={context.tensions}
                                icon={AlertTriangle}
                                color="text-orange-600"
                                bgColor="bg-orange-50 dark:bg-orange-950/30"
                                borderColor="border-l-orange-500"
                                sectionKey="tensions"
                            />
                        </div>
                    </ScrollArea>
                ) : (
                    <div className="text-center py-8 text-muted-foreground">
                        <p className="text-sm">Upload documents to see brand insights.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default BrandMBTDashboard;
