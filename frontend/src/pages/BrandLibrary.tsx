import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  Upload, FileText, CheckCircle, Circle, Plus, Loader2, Sparkles,
  Library, Users, ArrowRight, UserPlus, Search, MoreVertical,
  LayoutDashboard, Target, Brain, AlertTriangle, ShieldCheck
} from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { BrandsAPI } from "@/lib/api";
import { BrandMBTDashboard } from "@/components/BrandMBTDashboard";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface Brand {
  id: number;
  name: string;
}

interface BrandInsight {
  type: "Motivation" | "Belief" | "Tension";
  text: string;
  source_document?: string;
}

interface BrandDocument {
  id: number;
  filename: string;
  category: string;
  summary: string;
  created_at: string;
  extracted_insights?: BrandInsight[];
}

const KNOWLEDGE_PILLARS = [
  "Disease & Patient Journey Overview",
  "Treatment Landscape / SoC",
  "Brand Value Proposition & Core Messaging",
  "Safety & Tolerability Summary",
  "HCP & Patient Segmentation",
  "Market Research & Insight Summaries",
  "Adherence / Persistence / Discontinuation Insights"
];

const BrandLibrary = () => {
  const navigate = useNavigate();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<string>("");
  const [newBrandName, setNewBrandName] = useState("");
  const [documents, setDocuments] = useState<BrandDocument[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isCreatingBrand, setIsCreatingBrand] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isIngesting, setIsIngesting] = useState(false);
  const [personaCount, setPersonaCount] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchBrands();
  }, []);

  useEffect(() => {
    if (selectedBrandId) {
      fetchDocuments(parseInt(selectedBrandId));
      fetchPersonaCount(parseInt(selectedBrandId));
    } else {
      setDocuments([]);
      setPersonaCount(0);
    }
  }, [selectedBrandId]);

  const fetchPersonaCount = async (brandId: number) => {
    try {
      const data = await BrandsAPI.getPersonasCount(brandId);
      setPersonaCount(data.persona_count);
    } catch (error) {
      console.error("Failed to fetch persona count", error);
      setPersonaCount(0);
    }
  };

  const fetchBrands = async () => {
    try {
      const data = await BrandsAPI.list();
      setBrands(data);
      // Optional: Auto-select first brand if none selected
      // if (data.length > 0 && !selectedBrandId) setSelectedBrandId(data[0].id.toString());
    } catch (error) {
      console.error("Failed to fetch brands", error);
      toast({ title: "Error", description: "Failed to load brands.", variant: "destructive" });
    }
  };

  const fetchDocuments = async (brandId: number) => {
    try {
      const data = await BrandsAPI.getDocuments(brandId);
      setDocuments(data);
    } catch (error) {
      console.error("Failed to fetch documents", error);
      toast({ title: "Error", description: "Failed to load documents.", variant: "destructive" });
    }
  };

  const handleCreateBrand = async () => {
    if (!newBrandName.trim()) return;
    setIsCreatingBrand(true);
    try {
      const newBrand = await BrandsAPI.create(newBrandName);
      setBrands([...brands, newBrand]);
      setSelectedBrandId(newBrand.id.toString());
      setNewBrandName("");
      toast({ title: "Brand created", description: `${newBrand.name} has been created.` });
    } catch (error: any) {
      console.error("Failed to create brand", error);
      const errorMessage = error?.response?.data?.detail || "Failed to create brand.";
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
    } finally {
      setIsCreatingBrand(false);
    }
  };

  const handleSeedData = async () => {
    if (!selectedBrandId) return;
    setIsSeeding(true);
    try {
      const newDocs = await BrandsAPI.seed(parseInt(selectedBrandId));
      setDocuments([...documents, ...newDocs]);
      toast({
        title: "Demo Data Populated",
        description: `Added ${newDocs.length} mock documents.`
      });
    } catch (error: any) {
      console.error("Failed to seed data", error);
      const errorMessage = error?.response?.data?.detail || "Failed to seed data.";
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
    } finally {
      setIsSeeding(false);
    }
  };

  const handleBulkIngest = async () => {
    if (!selectedBrandId) return;

    // Simple prompt for now - could be a dialog in future
    const folderPath = window.prompt(
      "Enter absolute folder path to ingest (on server):",
      "data/mounjaro_resources"
    );

    if (!folderPath) return;

    setIsIngesting(true);
    try {
      const result = await BrandsAPI.ingestFolder(parseInt(selectedBrandId), folderPath);

      // Refresh documents
      fetchDocuments(parseInt(selectedBrandId));

      toast({
        title: "Ingestion Complete",
        description: `Processed ${result.total_files} files. Created ${result.total_nodes_created} knowledge nodes.`
      });
    } catch (error: any) {
      console.error("Failed to ingest folder", error);
      const errorMessage = error?.response?.data?.detail || "Failed to ingest folder.";
      toast({ title: "Ingestion Failed", description: errorMessage, variant: "destructive" });
    } finally {
      setIsIngesting(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !selectedBrandId) return;

    const file = e.target.files[0];
    setIsUploading(true);
    try {
      const newDoc = await BrandsAPI.upload(parseInt(selectedBrandId), file);
      setDocuments([...documents, newDoc]);
      toast({
        title: "File uploaded",
        description: `Classified as: ${newDoc.category}`
      });
    } catch (error: any) {
      console.error("Failed to upload file", error);
      const errorMessage = error?.response?.data?.detail || "Could not upload file.";
      toast({ title: "Upload failed", description: errorMessage, variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const getCategoryStatus = (category: string) => {
    const hasDoc = documents.some(d => d.category === category);
    return hasDoc ? (
      <CheckCircle className="h-4 w-4 text-emerald-500" />
    ) : (
      <Circle className="h-4 w-4 text-muted-foreground/30" />
    );
  };

  const filteredBrands = brands.filter(b =>
    b.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedBrand = brands.find(b => b.id.toString() === selectedBrandId);

  return (
    <div className="flex w-full h-screen bg-background overflow-hidden">

      {/* 1. LEFT SIDEBAR: Brand List */}
      <div className="w-72 flex-shrink-0 border-r bg-muted/10 flex flex-col">
        <div className="p-4 border-b bg-background">
          <div className="flex items-center gap-2 mb-4 text-violet-600 font-bold text-lg">
            <div className="bg-violet-100 p-1.5 rounded">
              <Library className="h-5 w-5" />
            </div>
            Brand Library
          </div>

          <div className="relative mb-3">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search brands..."
              className="pl-8 h-9 bg-background"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="New Brand Name"
              className="h-8 text-xs"
              value={newBrandName}
              onChange={(e) => setNewBrandName(e.target.value)}
            />
            <Button size="sm" onClick={handleCreateBrand} disabled={!newBrandName || isCreatingBrand} className="h-8 px-2 bg-violet-600 hover:bg-violet-700">
              {isCreatingBrand ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {filteredBrands.map(brand => (
              <button
                key={brand.id}
                onClick={() => setSelectedBrandId(brand.id.toString())}
                className={`w-full text-left px-3 py-2.5 rounded-md text-sm font-medium transition-all flex items-center justify-between group ${selectedBrandId === brand.id.toString()
                  ? 'bg-violet-100 text-violet-900 shadow-sm ring-1 ring-violet-200 dark:bg-violet-900/40 dark:text-violet-100'
                  : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                  }`}
              >
                <span className="truncate">{brand.name}</span>
                {selectedBrandId === brand.id.toString() && (
                  <ArrowRight className="h-3 w-3 opacity-50" />
                )}
              </button>
            ))}
            {filteredBrands.length === 0 && (
              <div className="text-center p-4 text-xs text-muted-foreground">
                No brands found
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* 2. CENTER: Knowledge Assets */}
      <div className="flex-1 flex flex-col min-w-0 bg-background overflow-hidden relative">

        {!selectedBrandId ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8 text-muted-foreground">
            <div className="bg-muted/30 p-6 rounded-full mb-4">
              <Library className="h-12 w-12 opacity-20" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">Select a Brand Context</h2>
            <p className="max-w-sm">
              Choose a brand from the sidebar or create a new one to manage its knowledge assets and personas.
            </p>
          </div>
        ) : (
          <>
            {/* Toolbar */}
            <div className="h-14 border-b flex items-center justify-between px-6 bg-background/50 backdrop-blur z-10 sticky top-0">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold">{selectedBrand?.name}</h2>
                <Badge variant="outline" className="font-normal text-muted-foreground">
                  {documents.length} Assets
                </Badge>
              </div>

              <div className="flex items-center gap-2">
                <label className="cursor-pointer">
                  <Button size="sm" variant="default" disabled={isUploading || isIngesting} className="pointer-events-none">
                    <Upload className="h-3.5 w-3.5 mr-2" />
                    {isUploading ? "Uploading..." : "Upload PDF/Doc"}
                  </Button>
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={isUploading || isIngesting}
                    accept=".pdf,.txt,.docx,.md"
                  />
                </label>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon" variant="ghost">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleSeedData} disabled={isSeeding || isIngesting}>
                      <Sparkles className="h-4 w-4 mr-2" />
                      {isSeeding ? "Seeding..." : "Populate Demo Data"}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleBulkIngest} disabled={isSeeding || isIngesting}>
                      {isIngesting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Library className="h-4 w-4 mr-2" />}
                      {isIngesting ? "Ingesting..." : "Bulk Ingest Folder"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 dark:bg-black/20">

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 w-full">
                {documents.length === 0 ? (
                  <Card className="col-span-1 xl:col-span-2 border-dashed py-12 flex flex-col items-center justify-center text-center">
                    <div className="p-4 bg-muted rounded-full mb-4">
                      <Upload className="h-8 w-8 text-muted-foreground/50" />
                    </div>
                    <h3 className="font-semibold text-lg">No Knowledge Assets</h3>
                    <p className="text-muted-foreground text-sm max-w-sm mt-1 mb-4">
                      Upload clinical studies, brand guidelines, or market research to ground your personas in reality.
                    </p>
                    <Button variant="outline" onClick={handleSeedData} disabled={isSeeding}>
                      Populate with Demo Data
                    </Button>
                  </Card>
                ) : (
                  documents.map((doc) => {
                    const insights = doc.extracted_insights || [];
                    const motivations = insights.filter(i => i.type === "Motivation");
                    const beliefs = insights.filter(i => i.type === "Belief");
                    const tensions = insights.filter(i => i.type === "Tension");

                    return (
                      <Card key={doc.id} className="group hover:shadow-md transition-all border-border/60 flex flex-col">
                        <CardHeader className="py-3 px-4 border-b bg-muted/20 flex flex-row items-center justify-between space-y-0">
                          <div className="flex items-center gap-3 overflow-hidden">
                            <div className="p-2 bg-background rounded border shadow-sm text-blue-600 shrink-0">
                              <FileText className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <CardTitle className="text-sm font-medium leading-none mb-1 truncate">{doc.filename}</CardTitle>
                              <CardDescription className="text-xs truncate">{doc.summary}</CardDescription>
                            </div>
                          </div>
                          <Badge variant="secondary" className="font-normal text-[10px] opacity-70 group-hover:opacity-100 shrink-0 ml-2">
                            {doc.category}
                          </Badge>
                        </CardHeader>
                        <CardContent className="p-4 flex-1">
                          {insights.length > 0 ? (
                            <div className="space-y-3">
                              <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs font-medium text-muted-foreground">
                                <div className="flex items-center gap-1.5"><Target className="h-3 w-3 text-blue-500" /> {motivations.length} Motivations</div>
                                <div className="flex items-center gap-1.5"><Brain className="h-3 w-3 text-purple-500" /> {beliefs.length} Beliefs</div>
                                <div className="flex items-center gap-1.5"><AlertTriangle className="h-3 w-3 text-orange-500" /> {tensions.length} Tensions</div>
                              </div>

                              <div className="grid grid-cols-1 gap-2 mt-2">
                                {[...motivations, ...beliefs, ...tensions].slice(0, 4).map((insight, idx) => (
                                  <div key={idx} className="text-xs p-2 bg-muted/30 rounded border flex gap-2">
                                    <span className={`font-bold shrink-0 ${insight.type === 'Motivation' ? 'text-blue-600' :
                                      insight.type === 'Belief' ? 'text-purple-600' : 'text-orange-600'
                                      }`}>
                                      {insight.type.charAt(0)}
                                    </span>
                                    <span className="truncate">{insight.text}</span>
                                  </div>
                                ))}
                                {insights.length > 4 && (
                                  <div className="text-xs text-muted-foreground p-2 flex items-center justify-center">
                                    +{insights.length - 4} more insights
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="text-xs text-muted-foreground italic flex items-center gap-2">
                              <Loader2 className="h-3 w-3 animate-spin" /> Processing insights...
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* 3. RIGHT SIDEBAR: Brand Intelligence */}
      {selectedBrandId && (
        <div className="w-96 flex-shrink-0 border-l bg-background flex flex-col shadow-xl z-20">
          <ScrollArea className="flex-1">
            <div className="p-6 space-y-6">

              {/* Personas Widget */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    Brand Personas
                  </h3>
                  <Badge variant="secondary">{personaCount}</Badge>
                </div>
                <Card className="bg-muted/30 border-dashed shadow-none">
                  <CardContent className="p-3 space-y-2">
                    <Button
                      className="w-full text-xs h-8"
                      variant="default"
                      onClick={() => navigate(`/create?brand_id=${selectedBrandId}`)}
                    >
                      <UserPlus className="h-3 w-3 mr-2" />
                      New Persona
                    </Button>
                    <Button
                      className="w-full text-xs h-8"
                      variant="outline"
                      onClick={() => navigate(`/personas?brand_id=${selectedBrandId}`)}
                    >
                      View All Personas
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Dashboard Widget */}
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <LayoutDashboard className="h-4 w-4 text-primary" />
                  Aggregated Insights
                </h3>
                {/* We use class override to make it fit better */}
                <BrandMBTDashboard
                  brandId={parseInt(selectedBrandId)}
                  brandName={selectedBrand?.name || ''}
                  className="text-xs"
                />
              </div>

              {/* Knowledge Coverage Widget */}
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Knowledge Coverage
                </h3>
                <div className="space-y-2 bg-muted/10 p-3 rounded-lg border">
                  {KNOWLEDGE_PILLARS.map((pillar, index) => (
                    <div key={index} className="flex items-start gap-2.5">
                      <div className="mt-0.5">{getCategoryStatus(pillar)}</div>
                      <span className="text-xs text-muted-foreground leading-tight">{pillar}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </ScrollArea>
        </div>
      )}

    </div>
  );
};

export default BrandLibrary;
