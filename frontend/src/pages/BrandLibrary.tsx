import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileText, CheckCircle, Circle, Plus, Loader2, Sparkles } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";

interface Brand {
  id: number;
  name: string;
}

interface BrandDocument {
  id: number;
  filename: string;
  category: string;
  summary: string;
  created_at: string;
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
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<string>("");
  const [newBrandName, setNewBrandName] = useState("");
  const [documents, setDocuments] = useState<BrandDocument[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isCreatingBrand, setIsCreatingBrand] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchBrands();
  }, []);

  useEffect(() => {
    if (selectedBrandId) {
      fetchDocuments(parseInt(selectedBrandId));
    } else {
      setDocuments([]);
    }
  }, [selectedBrandId]);

  const fetchBrands = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/brands');
      if (res.ok) {
        const data = await res.json();
        setBrands(data);
      }
    } catch (error) {
      console.error("Failed to fetch brands", error);
    }
  };

  const fetchDocuments = async (brandId: number) => {
    try {
      const res = await fetch(`http://localhost:8000/api/brands/${brandId}/documents`);
      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
      }
    } catch (error) {
      console.error("Failed to fetch documents", error);
    }
  };

  const handleCreateBrand = async () => {
    if (!newBrandName.trim()) return;
    setIsCreatingBrand(true);
    try {
      const res = await fetch('http://localhost:8000/api/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newBrandName })
      });

      if (res.ok) {
        const newBrand = await res.json();
        setBrands([...brands, newBrand]);
        setSelectedBrandId(newBrand.id.toString());
        setNewBrandName("");
        toast({ title: "Brand created", description: `${newBrand.name} has been created.` });
      } else {
        toast({ title: "Error", description: "Failed to create brand.", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to create brand.", variant: "destructive" });
    } finally {
      setIsCreatingBrand(false);
    }
  };

  const handleSeedData = async () => {
    if (!selectedBrandId) return;
    setIsSeeding(true);
    try {
      const res = await fetch(`http://localhost:8000/api/brands/${selectedBrandId}/seed`, {
        method: 'POST'
      });

      if (res.ok) {
        const newDocs = await res.json();
        setDocuments([...documents, ...newDocs]);
        toast({
          title: "Demo Data Populated",
          description: `Added ${newDocs.length} mock documents.`
        });
      } else {
        toast({ title: "Error", description: "Failed to seed data.", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Network error.", variant: "destructive" });
    } finally {
      setIsSeeding(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !selectedBrandId) return;

    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);

    setIsUploading(true);
    try {
      const res = await fetch(`http://localhost:8000/api/brands/${selectedBrandId}/upload`, {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        const newDoc = await res.json();
        setDocuments([...documents, newDoc]);
        toast({
          title: "File uploaded",
          description: `Classified as: ${newDoc.category}`
        });
      } else {
        toast({ title: "Upload failed", description: "Could not upload file.", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Upload failed", description: "Network error.", variant: "destructive" });
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
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Brand Library</h1>
          <p className="text-muted-foreground">Manage brand knowledge and ground your personas.</p>
        </div>

        <div className="flex items-center gap-4">
          <Select value={selectedBrandId} onValueChange={setSelectedBrandId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select Brand" />
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
              className="w-[200px]"
            />
            <Button onClick={handleCreateBrand} disabled={isCreatingBrand || !newBrandName}>
              {isCreatingBrand ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>

      {selectedBrandId ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Column: Upload & Files */}
          <div className="md:col-span-2 space-y-6">
            {/* Upload Zone */}
            <Card className="border-dashed border-2">
              <CardContent className="flex flex-col items-center justify-center h-40 space-y-4 pt-6">
                <div className="p-4 bg-muted rounded-full">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">Drag & drop files or click to upload</p>
                  <p className="text-xs text-muted-foreground">PDF, DOCX, TXT supported</p>
                </div>
                <Input
                  type="file"
                  className="hidden"
                  id="file-upload"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                />
                <div className="flex gap-3">
                  <Button asChild disabled={isUploading} variant="secondary">
                    <label htmlFor="file-upload" className="cursor-pointer">
                      {isUploading ? "Uploading & Classifying..." : "Select File"}
                    </label>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleSeedData}
                    disabled={isSeeding || isUploading}
                  >
                    {isSeeding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2 text-purple-500" />}
                    Populate Demo Data
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* File List */}
            <Card>
              <CardHeader>
                <CardTitle>Uploaded Documents</CardTitle>
                <CardDescription>Files grounding this brand's personas.</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px] pr-4">
                  {documents.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">
                      No documents uploaded yet.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {documents.map((doc) => (
                        <div key={doc.id} className="flex items-start justify-between p-4 border rounded-lg">
                          <div className="flex items-start gap-3">
                            <FileText className="h-5 w-5 mt-1 text-blue-500" />
                            <div>
                              <p className="font-medium text-sm">{doc.filename}</p>
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{doc.summary}</p>
                            </div>
                          </div>
                          <Badge variant="outline" className="ml-2 shrink-0">
                            {doc.category}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Knowledge Checklist */}
          <div className="md:col-span-1">
            <Card className="h-full">
              <CardHeader>
                <CardTitle>Knowledge Pillars</CardTitle>
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
  );
};

export default BrandLibrary;
