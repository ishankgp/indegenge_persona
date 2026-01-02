import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PersonasAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Brain, Target, Shield, MessageSquare, Activity, AlertTriangle, AlertCircle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface ComparisonRowProps {
  label: string;
  icon?: React.ReactNode;
  data: (string | string[] | null | undefined)[];
  type?: 'text' | 'list' | 'badge';
}

const ComparisonRow = ({ label, icon, data, type = 'text' }: ComparisonRowProps) => (
  <tr className="border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
    <td className="p-4 bg-gray-50/50 dark:bg-gray-900/50 font-medium text-sm text-gray-700 dark:text-gray-300 w-[200px] align-top">
      <div className="flex items-center gap-2">
        {icon}
        {label}
      </div>
    </td>
    {data.map((item, idx) => (
      <td key={idx} className="p-4 border-r border-gray-100 dark:border-gray-800 last:border-0 text-sm align-top">
        {type === 'list' && Array.isArray(item) ? (
          <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
            {item.slice(0, 3).map((li, i) => (
              <li key={i}>{li}</li>
            ))}
          </ul>
        ) : type === 'badge' ? (
          <Badge variant="outline">{item}</Badge>
        ) : (
          <span className="text-gray-700 dark:text-gray-300">{item || '-'}</span>
        )}
      </td>
    ))}
  </tr>
);

export function ComparePersonas() {
  const location = useLocation();
  const navigate = useNavigate();
  const [personas, setPersonas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const personaIds = location.state?.personaIds as number[];

  useEffect(() => {
    console.log("ComparePersonas mounted. State:", location.state);
    
    if (!personaIds || personaIds.length === 0) {
      console.warn("No persona IDs found in state, redirecting...");
      navigate('/personas');
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        console.log("Fetching personas:", personaIds);
        
        // Use allSettled to prevent one failure from breaking everything
        const promises = personaIds.map(id => PersonasAPI.get(id));
        const results = await Promise.allSettled(promises);
        
        const successfulPersonas = results
          .filter(r => r.status === 'fulfilled')
          .map(r => (r as PromiseFulfilledResult<any>).value);
          
        const failures = results.filter(r => r.status === 'rejected');
        if (failures.length > 0) {
          console.error("Some personas failed to load:", failures);
        }

        if (successfulPersonas.length === 0) {
          setError("Failed to load any personas. Please try again.");
        } else {
          setPersonas(successfulPersonas);
        }
      } catch (err) {
        console.error("Critical error loading comparison:", err);
        setError("An unexpected error occurred.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [personaIds, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-8 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Activity className="h-8 w-8 text-violet-600 animate-pulse" />
          <p className="text-gray-500">Loading comparison...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-8 flex items-center justify-center">
        <div className="text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
          <h2 className="text-xl font-bold">Unable to Compare</h2>
          <p className="text-gray-500">{error}</p>
          <Button onClick={() => navigate('/personas')}>Return to Library</Button>
        </div>
      </div>
    );
  }

  // Helper to extract nested data safely
  const getField = (persona: any, path: string) => {
    try {
      const data = typeof persona.full_persona_json === 'string' 
        ? JSON.parse(persona.full_persona_json) 
        : persona.full_persona_json;
        
      return path.split('.').reduce((obj, key) => obj?.[key], data);
    } catch {
      return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-8">
      <div className="max-w-[1600px] mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/personas')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Library
          </Button>
          <h1 className="text-2xl font-bold">Persona Comparison</h1>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800">
                <th className="p-4 bg-gray-100/50 dark:bg-gray-800/50 font-semibold text-gray-500 uppercase text-xs tracking-wider w-[200px]">
                  Persona Profile
                </th>
                {personas.map(p => (
                  <th key={p.id} className="p-6 border-r border-gray-200 dark:border-gray-800 last:border-0 align-top min-w-[250px]">
                    <div className="flex flex-col gap-2">
                      <Badge className="w-fit bg-violet-100 text-violet-700 hover:bg-violet-200 border-0">
                        {p.persona_subtype || 'Standard'}
                      </Badge>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{p.name}</h3>
                        <p className="text-sm text-gray-500">{p.age} years • {p.gender}</p>
                      </div>
                      {p.disease_pack && (
                        <Badge variant="outline" className="w-fit text-xs border-blue-200 text-blue-700 bg-blue-50">
                          {p.disease_pack}
                        </Badge>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Comparison Sections */}
              <ComparisonRow 
                label="Condition" 
                icon={<Activity className="h-4 w-4" />}
                data={personas.map(p => p.condition)} 
              />
              <ComparisonRow 
                label="Location" 
                icon={<Target className="h-4 w-4" />}
                data={personas.map(p => p.location)} 
              />

              <ComparisonRow 
                label="Primary Motivation" 
                icon={<Brain className="h-4 w-4 text-green-500" />}
                type="list"
                data={personas.map(p => getField(p, 'motivations') || [])} 
              />
              
              <ComparisonRow 
                label="Key Beliefs" 
                icon={<Shield className="h-4 w-4 text-blue-500" />}
                type="list"
                data={personas.map(p => getField(p, 'beliefs') || [])} 
              />

              <ComparisonRow 
                label="Pain Points" 
                icon={<AlertTriangle className="h-4 w-4 text-red-500" />}
                type="list"
                data={personas.map(p => getField(p, 'pain_points') || [])} 
              />

              <ComparisonRow 
                label="Communication" 
                icon={<MessageSquare className="h-4 w-4 text-purple-500" />}
                data={personas.map(p => {
                  const prefs = getField(p, 'communication_preferences');
                  return prefs?.information_style || prefs?.preferred_channels || '-';
                })} 
              />
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
