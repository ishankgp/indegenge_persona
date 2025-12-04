import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileText, CheckCircle, Circle, Plus, Loader2, Sparkles, Library, Users, ArrowRight, UserPlus } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { BrandsAPI } from "@/lib/api";

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
  const [personaCount, setPersonaCount] = useState<number>(0);
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
      <CheckCircle className="h-5 w-5 text-green-500" />
    ) : (
      <Circle className="h-5 w-5 text-gray-300" />
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Indegene Purple Page Header */}
      <div className="bg-gradient-to-r from-[hsl(262,60%,38%)] via-[hsl(262,60%,42%)] to-[hsl(280,60%,45%)]">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                <Library className="h-8 w-8 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold text-white tracking-tight">Brand Library</h1>
                  <Badge className="bg-white/20 backdrop-blur-sm text-white border-white/30 font-normal">
                    <FileText className="h-3 w-3 mr-1" />
                    Knowledge Assets
                  </Badge>
                </div>
                <p className="text-white/80 mt-1">Manage brand knowledge and ground your personas</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Select value={selectedBrandId} onValueChange={setSelectedBrandId}>
                <SelectTrigger className="w-[240px] bg-white/10 backdrop-blur-sm border-white/20 text-white">
                  <SelectValue placeholder="Select Brand Context" />
                </SelectTrigger>
                <SelectContent>
                  {brands.map(b => (
                    <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2">
                <Input
                  placeholder="New Brand Name"
                  value={newBrandName}
                  onChange={(e) => setNewBrandName(e.target.value)}
                  className="w-[200px] bg-white/10 backdrop-blur-sm border-white/20 text-white placeholder:text-white/50"
                />
                <Button onClick={handleCreateBrand} disabled={isCreatingBrand || !newBrandName} className="bg-white text-primary hover:bg-white/90">
                  {isCreatingBrand ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8">

        {selectedBrandId ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left Column: Upload & Files */}
            <div className="md:col-span-2 space-y-6">
              {/* Upload Zone */}
              <Card className="border-2 border-dashed border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors">
                <CardContent className="flex flex-col items-center justify-center h-48 space-y-4 pt-8">
                  <div className="p-4 bg-background rounded-full shadow-sm">
                    <Upload className="h-8 w-8 text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold text-foreground">Upload Knowledge Assets</p>
                    <p className="text-sm text-muted-foreground mt-1">Drag & drop PDF, DOCX, TXT files here</p>
                  </div>
                  <Input
                    type="file"
                    className="hidden"
                    id="file-upload"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                  />
                  <div className="flex gap-3 pt-2">
                    <div className="relative">
                      <Button disabled={isUploading} className="btn-primary cursor-pointer pointer-events-none">
                        {isUploading ? "Uploading..." : "Select File"}
                      </Button>
                      <label
                        htmlFor="file-upload"
                        className="absolute inset-0 cursor-pointer"
                        aria-label="Select File"
                      />
                    </div>
                    <Button
                      variant="outline"
                      onClick={handleSeedData}
                      disabled={isSeeding || isUploading}
                      className="bg-background"
                    >
                      {isSeeding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2 text-primary" />}
                      Populate Demo Data
                    </Button>
                  </div>
                </CardContent>
              </Card>


              {/* File List with MBT Insights */}
              <Card>
                <CardHeader>
                  <CardTitle>Uploaded Documents</CardTitle>
                  <CardDescription>Files grounding this brand's personas with extracted MBT insights.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px] pr-4">
                    {documents.length === 0 ? (
                      <div className="text-center py-10 text-muted-foreground">
                        No documents uploaded yet.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {documents.map((doc) => {
                          const insights = doc.extracted_insights || [];
                          const motivations = insights.filter(i => i.type === "Motivation");
                          const beliefs = insights.filter(i => i.type === "Belief");
                          const tensions = insights.filter(i => i.type === "Tension");
                          const totalInsights = insights.length;

                          return (
                            <div key={doc.id} className="border rounded-lg overflow-hidden">
                              {/* Document Header */}
                              <div className="flex items-start justify-between p-4 bg-muted/30">
                                <div className="flex items-start gap-3 flex-1">
                                  <FileText className="h-5 w-5 mt-1 text-blue-500 shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm">{doc.filename}</p>
                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{doc.summary}</p>
                                  </div>
                                </div>
                                <Badge variant="outline" className="ml-2 shrink-0">
                                  {doc.category}
                                </Badge>
                              </div>

                              {/* MBT Insights Section */}
                              {totalInsights > 0 && (
                                <div className="p-4 space-y-3 bg-white dark:bg-gray-950">
                                  <div className="flex items-center gap-2">
                                    <Sparkles className="h-4 w-4 text-amber-500" />
                                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                      MBT Insights ({totalInsights})
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-3 gap-2 text-xs">
                                    {motivations.length > 0 && (
                                      <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                                        <span className="font-mono">🎯</span>
                                        <span className="font-medium">{motivations.length} Motivations</span>
                                      </div>
                                    )}
                                    {beliefs.length > 0 && (
                                      <div className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400">
                                        <span className="font-mono">💭</span>
                                        <span className="font-medium">{beliefs.length} Beliefs</span>
                                      </div>
                                    )}
                                    {tensions.length > 0 && (
                                      <div className="flex items-center gap-1.5 text-orange-600 dark:text-orange-400">
                                        <span className="font-mono">⚠️</span>
                                        <span className="font-medium">{tensions.length} Tensions</span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Detailed Insights (first 2 of each type) */}
                                  <div className="space-y-2 mt-3">
                                    {motivations.slice(0, 2).map((insight, idx) => (
                                      <div key={`m-${idx}`} className="text-xs p-2 bg-blue-50 dark:bg-blue-950/30 rounded border-l-2 border-blue-500">
                                        <span className="font-semibold text-blue-700 dark:text-blue-300">M: </span>
                                        <span className="text-gray-700 dark:text-gray-300">{insight.text}</span>
                                      </div>
                                    ))}
                                    {beliefs.slice(0, 2).map((insight, idx) => (
                                      <div key={`b-${idx}`} className="text-xs p-2 bg-purple-50 dark:bg-purple-950/30 rounded border-l-2 border-purple-500">
                                        <span className="font-semibold text-purple-700 dark:text-purple-300">B: </span>
                                        <span className="text-gray-700 dark:text-gray-300">{insight.text}</span>
                                      </div>
                                    ))}
                                    {tensions.slice(0, 2).map((insight, idx) => (
                                      <div key={`t-${idx}`} className="text-xs p-2 bg-orange-50 dark:bg-orange-950/30 rounded border-l-2 border-orange-500">
                                        <span className="font-semibold text-orange-700 dark:text-orange-300">T: </span>
                                        <span className="text-gray-700 dark:text-gray-300">{insight.text}</span>
                                      </div>
                                    ))}
                                  </div>

                                  {totalInsights > 6 && (
                                    <p className="text-xs text-muted-foreground italic mt-2">
                                      +{totalInsights - 6} more insights available
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Knowledge Checklist + Personas */}
            <div className="md:col-span-1 space-y-6">
              {/* Brand Personas Card */}
              <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      <CardTitle className="text-base font-semibold">Brand Personas</CardTitle>
                    </div>
                    <Badge variant="secondary" className="text-lg px-3 py-1">
                      {personaCount}
                    </Badge>
                  </div>
                  <CardDescription>Personas grounded in this brand's knowledge</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    className="w-full justify-between" 
                    variant="outline"
                    onClick={() => navigate(`/personas?brand_id=${selectedBrandId}`)}
                  >
                    <span className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      View Personas
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  <Button 
                    className="w-full justify-between"
                    onClick={() => navigate(`/create?brand_id=${selectedBrandId}`)}
                  >
                    <span className="flex items-center gap-2">
                      <UserPlus className="h-4 w-4" />
                      Create Persona
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  {personaCount === 0 && (
                    <p className="text-xs text-muted-foreground text-center pt-2">
                      No personas yet. Create one to get started!
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Knowledge Pillars Card */}
              <Card>
                <CardHeader className="border-b border-border/50 bg-muted/30">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-1 bg-primary rounded-full" />
                    <CardTitle className="text-base font-semibold">Knowledge Pillars</CardTitle>
                  </div>
                  <CardDescription>Required context for accurate personas.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {KNOWLEDGE_PILLARS.map((pillar, index) => (
                      <div key={index} className="flex items-center gap-3">
                        {getCategoryStatus(pillar)}
                        <span className="text-sm font-medium leading-none">{pillar}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
            <div className="p-6 bg-muted rounded-full">
              <FileText className="h-12 w-12 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-semibold">Select or Create a Brand</h2>
            <p className="text-muted-foreground max-w-md">
              Get started by selecting an existing brand context or creating a new one to begin uploading knowledge assets.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BrandLibrary;
