import { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { User, MapPin, Heart, Loader2, Plus, Users, Activity } from 'lucide-react';
import { PersonaDetailModal } from '../components/PersonaDetailModal';

const API_BASE_URL = 'http://127.0.0.1:8000';

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

export function PersonaLibrary() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState('view');
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    age: '',
    gender: '',
    condition: '',
    location: '',
    concerns: ''
  });

  useEffect(() => {
    fetchPersonas();
  }, []);

  const fetchPersonas = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/personas`);
      setPersonas(response.data);
    } catch (error) {
      console.error('Error fetching personas:', error);
    } finally {
      setLoading(false);
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
      await axios.post(`${API_BASE_URL}/personas/generate`, {
        ...formData,
        age: parseInt(formData.age)
      });

      await fetchPersonas();
      setActiveTab('view');
      setFormData({
        age: '',
        gender: '',
        condition: '',
        location: '',
        concerns: ''
      });
    } catch (error) {
      console.error('Error generating persona:', error);
      alert('Error generating persona. Please check if the backend is running.');
    } finally {
      setGenerating(false);
    }
  };

  const PersonaCard = ({ persona }: { persona: Persona }) => {
    const personaData = JSON.parse(persona.full_persona_json);
    
    return (
      <Card className="stat-card hover:shadow-xl transition-all duration-300 group">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold text-gray-900 group-hover:text-primary transition-colors">
                  {persona.name}
                </CardTitle>
                <CardDescription className="text-sm">
                  {persona.age} years old • {persona.gender}
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <div className="p-1 bg-red-100 rounded">
              <Heart className="h-3 w-3 text-red-600" />
            </div>
            <span className="font-medium text-gray-700">Condition:</span> 
            <span className="text-gray-600">{persona.condition}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="p-1 bg-blue-100 rounded">
              <MapPin className="h-3 w-3 text-blue-600" />
            </div>
            <span className="font-medium text-gray-700">Location:</span> 
            <span className="text-gray-600">{persona.location}</span>
          </div>
          {personaData.demographics?.occupation && (
            <div className="flex items-center gap-2 text-sm">
              <div className="p-1 bg-green-100 rounded">
                <Activity className="h-3 w-3 text-green-600" />
              </div>
              <span className="font-medium text-gray-700">Occupation:</span> 
              <span className="text-gray-600">{personaData.demographics.occupation}</span>
            </div>
          )}
        </CardContent>
        <CardFooter className="pt-3">
          <Button 
            variant="outline" 
            className="w-full group-hover:bg-primary group-hover:text-white transition-all duration-200"
            onClick={() => {
              setSelectedPersona(persona);
              setIsDetailModalOpen(true);
            }}
          >
            View Details
          </Button>
        </CardFooter>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header Section */}
      <div className="gradient-bg text-white p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-white/20 rounded-xl">
                <Users className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-4xl font-bold">Persona Library</h1>
                <p className="text-blue-100 text-lg">
                  Create and manage realistic patient and HCP personas
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">{personas.length}</div>
              <div className="text-blue-100">Total Personas</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-8 -mt-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-8 bg-white shadow-sm">
            <TabsTrigger value="view" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              View All Personas
            </TabsTrigger>
            <TabsTrigger value="create" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create New Persona
            </TabsTrigger>
          </TabsList>

          <TabsContent value="view">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="text-center">
                  <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
                  <p className="text-gray-600">Loading personas...</p>
                </div>
              </div>
            ) : personas.length === 0 ? (
              <Card className="stat-card">
                <CardContent className="py-16 text-center">
                  <div className="p-4 bg-primary/10 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <Users className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No personas created yet</h3>
                  <p className="text-gray-600 mb-6">Start by creating your first patient persona</p>
                  <Button 
                    className="bg-gradient-to-r from-primary to-secondary text-white hover:shadow-lg transition-all duration-200" 
                    onClick={() => setActiveTab('create')}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create Your First Persona
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {personas.map((persona) => (
                  <PersonaCard key={persona.id} persona={persona} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="create">
            <Card className="stat-card">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Plus className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl">Create New Patient Persona</CardTitle>
                    <CardDescription className="text-base">
                      Enter the basic attributes to generate a detailed, realistic persona
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="age" className="text-sm font-medium text-gray-700">Age</Label>
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
                      <Label htmlFor="gender" className="text-sm font-medium text-gray-700">Gender</Label>
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
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="condition" className="text-sm font-medium text-gray-700">Primary Medical Condition</Label>
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
                    <Label htmlFor="location" className="text-sm font-medium text-gray-700">Location</Label>
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
                    <Label htmlFor="concerns" className="text-sm font-medium text-gray-700">Key Concerns</Label>
                    <Textarea
                      id="concerns"
                      name="concerns"
                      placeholder="e.g., Managing blood sugar levels, medication side effects, cost of treatment"
                      value={formData.concerns}
                      onChange={handleInputChange}
                      className="border-gray-300 focus:border-primary focus:ring-primary min-h-[100px]"
                      required
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-primary to-secondary text-white hover:shadow-lg transition-all duration-200 py-3" 
                    disabled={generating}
                  >
                    {generating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating Persona...
                      </>
                    ) : (
                      <>
                        <Plus className="mr-2 h-4 w-4" />
                        Generate Persona
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
