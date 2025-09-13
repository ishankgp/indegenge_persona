import React, { useState, useEffect } from 'react';
import { PersonasAPI } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { Skeleton } from '../components/ui/skeleton';
import { 
  User, 
  MapPin, 
  Heart, 
  Loader2, 
  Plus, 
  Users, 
  Activity,
  Search,
  Filter,
  Calendar,
  Globe,
  Sparkles,
  Brain,
  Target,
  ChevronRight,
  Star,
  TrendingUp,
  Shield,
  Clock,
  Award,
  Zap,
  CheckCircle
} from 'lucide-react';
import { PersonaDetailModal } from '../components/PersonaDetailModal';
import { cn } from '@/lib/utils';

// Base URL managed centrally via lib/api

interface Persona {
  id: number;
  name: string;
  persona_type: string;
  age: number;
  gender: string;
  condition: string;
  location: string;
  full_persona_json: string;
  created_at: string;
}

const conditionColors: Record<string, string> = {
  'Diabetes': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  'Hypertension': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  'Asthma': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  'Depression': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  'Arthritis': 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  'default': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
};

export function PersonaLibrary() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0 });
  const [activeTab, setActiveTab] = useState('');
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCondition, setFilterCondition] = useState('all');
  const [formData, setFormData] = useState({
    age: '',
    gender: '',
    condition: '',
    location: '',
    concerns: '',
    count: '1'
  });

  useEffect(() => {
    console.log('PersonaLibrary: Starting to fetch personas...');
    fetchPersonas();
  }, []);

  const fetchPersonas = async () => {
    console.log('PersonaLibrary: fetchPersonas called');
    setLoading(true);
    try {
      console.log('PersonaLibrary: Calling PersonasAPI.list()...');
      const data = await PersonasAPI.list();
      console.log('PersonaLibrary: Got personas data:', { count: data.length, data: data.slice(0, 2) });
      setPersonas(data);
    } catch (error) {
      console.error('PersonaLibrary: Error fetching personas:', error);
    } finally {
      setLoading(false);
      console.log('PersonaLibrary: Finished loading');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    try {
      const count = parseInt(formData.count) || 1;
      setGenerationProgress({ current: 0, total: count });
      
      const basePersonaData = {
        age: parseInt(formData.age),
        gender: formData.gender,
        condition: formData.condition,
        location: formData.location,
        concerns: formData.concerns
      };

      // Create personas sequentially to show progress
      for (let i = 0; i < count; i++) {
        setGenerationProgress({ current: i + 1, total: count });
        
        // Add slight variations to avoid identical personas
        const variations = [
          '', ' with family history', ' seeking treatment options', 
          ' concerned about side effects', ' looking for lifestyle changes',
          ' with financial concerns', ' preferring natural remedies',
          ' with mobility limitations', ' living in rural area', ' with strong family support'
        ];
        const variation = variations[i % variations.length];
        
        const personaData = {
          ...basePersonaData,
          concerns: formData.concerns + variation
        };
        
        await PersonasAPI.generate(personaData);
      }

      await fetchPersonas();
      setActiveTab('view');
      setFormData({
        age: '',
        gender: '',
        condition: '',
        location: '',
        concerns: '',
        count: '1'
      });
      setGenerationProgress({ current: 0, total: 0 });
    } catch (error) {
      console.error('Error generating persona:', error);
      alert('Error generating persona. Please check if the backend is running.');
    } finally {
      setGenerating(false);
    }
  };

  // Enhanced filtering with better debugging
  const filteredPersonas = React.useMemo(() => {
    console.log('Filtering with:', { searchTerm, filterCondition, totalPersonas: personas.length });
    if (personas.length === 0) return [];
    return personas.filter(persona => {
      const searchLower = searchTerm.toLowerCase().trim();
      const matchesSearch = searchTerm === '' || 
        persona.name.toLowerCase().includes(searchLower) ||
        (persona.condition || '').toLowerCase().includes(searchLower) ||
        persona.location.toLowerCase().includes(searchLower);
      // Normalize for comparison
      const personaCond = (persona.condition || '').trim().toLowerCase();
      const filterCond = (filterCondition || '').trim().toLowerCase();
      const matchesFilter = filterCond === 'all' || personaCond === filterCond;
      const result = matchesSearch && matchesFilter;
      if (!result && (searchTerm !== '' || filterCondition !== 'all')) {
        console.log(`Filtered out: ${persona.name}`, {
          searchTerm: searchTerm,
          condition: persona.condition,
          filterCondition: filterCondition,
          matchesSearch,
          matchesFilter
        });
      }
      return result;
    });
  }, [personas, searchTerm, filterCondition]);

  // Normalize and deduplicate conditions (trim/lowercase for robustness)
  const uniqueConditions = Array.from(
    new Set(personas.map(p => (p.condition || '').trim()))
  ).filter(Boolean).sort((a, b) => a.localeCompare(b));
  console.log('Available conditions:', uniqueConditions);
  console.log('Selected filter condition:', filterCondition);

  const PersonaCard = ({ persona }: { persona: Persona }) => {
    const personaData = JSON.parse(persona.full_persona_json);
    const conditionClass = conditionColors[persona.condition] || conditionColors.default;
    
    return (
      <Card className="group relative overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 backdrop-blur-sm bg-white/90 dark:bg-gray-900/90">
        {/* Gradient Border Effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        
        <CardHeader className="relative pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary to-secondary rounded-xl blur-lg opacity-50"></div>
                <div className="relative p-2.5 bg-gradient-to-br from-primary to-secondary rounded-xl">
                  <User className="h-5 w-5 text-white" />
                </div>
              </div>
              <div>
                <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100 group-hover:text-primary transition-colors">
                  {persona.name}
                </CardTitle>
                <CardDescription className="text-sm flex items-center gap-2 mt-1">
                  <span>{persona.age} years</span>
                  <Separator orientation="vertical" className="h-3" />
                  <span>{persona.gender}</span>
                </CardDescription>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge className={cn("text-xs", conditionClass)}>
                {persona.condition}
              </Badge>
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className={`h-3 w-3 ${i < 4 ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`} />
                ))}
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-3 relative">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <div className="p-1.5 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <Heart className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
              </div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Primary Condition:</span> 
              <span className="text-gray-600 dark:text-gray-400">{persona.condition}</span>
            </div>
            
            <div className="flex items-center gap-2 text-sm">
              <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <MapPin className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Location:</span> 
              <span className="text-gray-600 dark:text-gray-400">{persona.location}</span>
            </div>
            
            {personaData.demographics?.occupation && (
              <div className="flex items-center gap-2 text-sm">
                <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <Activity className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                </div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Occupation:</span> 
                <span className="text-gray-600 dark:text-gray-400">{personaData.demographics.occupation}</span>
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-2 pt-2">
            <div className="text-center p-2 bg-gradient-to-br from-violet-50 to-violet-100 dark:from-violet-950/30 dark:to-violet-900/30 rounded-lg">
              <TrendingUp className="h-3.5 w-3.5 mx-auto text-violet-600 dark:text-violet-400 mb-1" />
              <p className="text-xs font-semibold text-violet-900 dark:text-violet-100">Active</p>
            </div>
            <div className="text-center p-2 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/30 dark:to-emerald-900/30 rounded-lg">
              <Shield className="h-3.5 w-3.5 mx-auto text-emerald-600 dark:text-emerald-400 mb-1" />
              <p className="text-xs font-semibold text-emerald-900 dark:text-emerald-100">Verified</p>
            </div>
            <div className="text-center p-2 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/30 dark:to-amber-900/30 rounded-lg">
              <Clock className="h-3.5 w-3.5 mx-auto text-amber-600 dark:text-amber-400 mb-1" />
              <p className="text-xs font-semibold text-amber-900 dark:text-amber-100">Recent</p>
            </div>
          </div>
        </CardContent>
        
        <CardFooter className="pt-3 relative">
          <Button 
            variant="ghost" 
            className="w-full group-hover:bg-gradient-to-r group-hover:from-primary group-hover:to-secondary group-hover:text-white transition-all duration-200"
            onClick={() => {
              setSelectedPersona(persona);
              setIsDetailModalOpen(true);
            }}
          >
            View Detailed Profile
            <ChevronRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </CardFooter>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-violet-50 dark:from-gray-950 dark:via-gray-900 dark:to-violet-950">
      {/* Enhanced Header Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-secondary">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 right-20 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse animation-delay-2000"></div>
        </div>

        <div className="relative z-10 px-8 py-12">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-white/20 rounded-2xl blur-xl"></div>
                  <div className="relative p-4 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20">
                    <Users className="h-10 w-10 text-white" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-5xl font-bold text-white">Persona Library</h1>
                    <Badge className="bg-white/20 backdrop-blur-sm text-white border-white/30 px-3 py-1">
                      <Sparkles className="h-3 w-3 mr-1" />
                      AI-Enhanced
                    </Badge>
                  </div>
                  <p className="text-white/90 text-lg">
                    Create and manage realistic patient and HCP personas with advanced AI
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                  <div className="text-4xl font-bold text-white flex items-center gap-2">
                    <Award className="h-8 w-8 text-yellow-300" />
                    {personas.length}
                  </div>
                  <div className="text-white/80 text-sm mt-1">Total Personas</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 -mt-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between mb-6">
            <TabsList className="bg-white/90 dark:bg-gray-900/90 shadow-xl backdrop-blur-sm">
              <TabsTrigger value="view" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                View All Personas
              </TabsTrigger>
              <TabsTrigger value="create" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create New Personas
              </TabsTrigger>
            </TabsList>
            
            {activeTab === 'view' && (
              <div className="flex items-center gap-4">
                {/* Search Bar - Simplified for debugging */}
                <div className="relative z-50">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search personas..."
                    value={searchTerm}
                    onChange={(e) => {
                      console.log('Search term changed to:', e.target.value);
                      setSearchTerm(e.target.value);
                    }}
                    onFocus={() => console.log('Search input focused')}
                    onBlur={() => console.log('Search input blurred')}
                    className="pl-10 pr-4 w-64 h-10 rounded-md border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    style={{ position: 'relative', zIndex: 9999 }}
                  />
                </div>
                
                {/* Filter Dropdown */}
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-gray-500" />
                  <select
                    value={filterCondition}
                    onChange={(e) => {
                      console.log('Filter condition changed to:', e.target.value);
                      setFilterCondition(e.target.value);
                    }}
                    className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm text-sm"
                  >
                    <option value="all">All Conditions</option>
                    {uniqueConditions.map(condition => (
                      <option key={condition} value={condition.trim().toLowerCase()}>{condition.trim()}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          <TabsContent value="view">
            {loading ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="border-0 shadow-xl">
                    <CardHeader>
                      <Skeleton className="h-4 w-32 mb-2" />
                      <Skeleton className="h-3 w-20" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-3 w-full mb-2" />
                      <Skeleton className="h-3 w-full mb-2" />
                      <Skeleton className="h-3 w-3/4" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredPersonas.length === 0 ? (
              <Card className="border-0 shadow-xl backdrop-blur-sm bg-white/90 dark:bg-gray-900/90">
                <CardContent className="py-20 text-center">
                  <div className="relative inline-block">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary to-secondary rounded-full blur-2xl opacity-30"></div>
                    <div className="relative p-6 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-full">
                      <Users className="h-12 w-12 text-primary" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mt-6 mb-2">
                    {searchTerm || filterCondition !== 'all' ? 'No matching personas found' : 'No personas created yet'}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                    {searchTerm || filterCondition !== 'all' 
                      ? 'Try adjusting your search or filter criteria' 
                      : 'Start by creating your first AI-powered patient persona to unlock powerful insights'}
                  </p>
                  <Button 
                    size="lg"
                    className="bg-gradient-to-r from-primary to-secondary text-white hover:shadow-xl transition-all duration-200"
                    onClick={() => setActiveTab('create')}
                  >
                    <Plus className="mr-2 h-5 w-5" />
                    Create Your First Persona
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Stats Bar */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <Card className="border-0 shadow-lg bg-gradient-to-br from-violet-50 to-violet-100 dark:from-violet-950/30 dark:to-violet-900/30">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-violet-700 dark:text-violet-300">Total</p>
                        <p className="text-2xl font-bold text-violet-900 dark:text-violet-100">{filteredPersonas.length}</p>
                      </div>
                      <Users className="h-8 w-8 text-violet-500" />
                    </CardContent>
                  </Card>
                  <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Conditions</p>
                        <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{uniqueConditions.length}</p>
                      </div>
                      <Heart className="h-8 w-8 text-blue-500" />
                    </CardContent>
                  </Card>
                  <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/30 dark:to-emerald-900/30">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Avg Age</p>
                        <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">
                          {Math.round(filteredPersonas.reduce((acc, p) => acc + p.age, 0) / filteredPersonas.length) || 0}
                        </p>
                      </div>
                      <Calendar className="h-8 w-8 text-emerald-500" />
                    </CardContent>
                  </Card>
                  <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/30 dark:to-amber-900/30">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-amber-700 dark:text-amber-300">Locations</p>
                        <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">
                          {new Set(filteredPersonas.map(p => p.location)).size}
                        </p>
                      </div>
                      <Globe className="h-8 w-8 text-amber-500" />
                    </CardContent>
                  </Card>
                </div>

                {/* Personas Grid */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {filteredPersonas.map((persona) => (
                    <PersonaCard key={persona.id} persona={persona} />
                  ))}
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="create">
            <Card className="border-0 shadow-2xl backdrop-blur-sm bg-white/90 dark:bg-gray-900/90">
              <CardHeader className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-t-xl">
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary to-secondary rounded-xl blur-lg opacity-50"></div>
                    <div className="relative p-3 bg-gradient-to-br from-primary to-secondary rounded-xl">
                      <Brain className="h-7 w-7 text-white" />
                    </div>
                  </div>
                  <div>
                    <CardTitle className="text-2xl">Create AI-Powered Personas</CardTitle>
                    <CardDescription className="text-base">
                      Enter basic attributes and let AI generate comprehensive, realistic personas with variations
                    </CardDescription>
                  </div>
                  <div className="ml-auto">
                    <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">
                      <Zap className="h-3 w-3 mr-1" />
                      Advanced AI
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="age" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        Age
                      </Label>
                      <Input
                        id="age"
                        name="age"
                        type="number"
                        placeholder="e.g., 45"
                        value={formData.age}
                        onChange={handleInputChange}
                        className="border-gray-300 focus:border-primary focus:ring-primary"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gender" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-500" />
                        Gender
                      </Label>
                      <Input
                        id="gender"
                        name="gender"
                        placeholder="e.g., Female"
                        value={formData.gender}
                        onChange={handleInputChange}
                        className="border-gray-300 focus:border-primary focus:ring-primary"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="count" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <Users className="h-4 w-4 text-gray-500" />
                        Count
                      </Label>
                      <Input
                        id="count"
                        name="count"
                        type="number"
                        min="1"
                        max="10"
                        placeholder="1"
                        value={formData.count}
                        onChange={handleInputChange}
                        className="border-gray-300 focus:border-primary focus:ring-primary"
                        required
                      />
                      <p className="text-xs text-gray-500">Generate 1-10 personas</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="condition" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      <Heart className="h-4 w-4 text-gray-500" />
                      Primary Medical Condition
                    </Label>
                    <Input
                      id="condition"
                      name="condition"
                      placeholder="e.g., Type 2 Diabetes"
                      value={formData.condition}
                      onChange={handleInputChange}
                      className="border-gray-300 focus:border-primary focus:ring-primary"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      Location
                    </Label>
                    <Input
                      id="location"
                      name="location"
                      placeholder="e.g., Austin, Texas"
                      value={formData.location}
                      onChange={handleInputChange}
                      className="border-gray-300 focus:border-primary focus:ring-primary"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="concerns" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      <Target className="h-4 w-4 text-gray-500" />
                      Key Concerns & Context
                    </Label>
                    <Textarea
                      id="concerns"
                      name="concerns"
                      placeholder="e.g., Managing blood sugar levels, medication side effects, cost of treatment, lifestyle adjustments..."
                      value={formData.concerns}
                      onChange={handleInputChange}
                      className="border-gray-300 focus:border-primary focus:ring-primary min-h-[120px]"
                      required
                    />
                  </div>

                  <Separator />

                  <div className="bg-gradient-to-r from-primary/5 to-secondary/5 rounded-xl p-4">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-amber-500" />
                      AI will generate:
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-emerald-500" />
                        Full demographic profile
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-emerald-500" />
                        Medical history
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-emerald-500" />
                        Treatment preferences
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-emerald-500" />
                        Communication style
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-emerald-500" />
                        Decision-making factors
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-emerald-500" />
                        Lifestyle & behaviors
                      </div>
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-primary to-secondary text-white hover:shadow-xl transition-all duration-200 py-6 text-lg font-semibold" 
                    disabled={generating}
                  >
                    {generating ? (
                      <>
                        <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                        Generating Persona {generationProgress.current} of {generationProgress.total}...
                      </>
                    ) : (
                      <>
                        <Brain className="mr-3 h-5 w-5" />
                        Generate {formData.count} AI Persona{parseInt(formData.count) !== 1 ? 's' : ''}
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Persona Detail Modal */}
      <PersonaDetailModal 
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        persona={selectedPersona}
      />
    </div>
  );
}
