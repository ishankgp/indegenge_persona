import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Layers, User, Activity, Heart, Library } from 'lucide-react';

interface PersonaDNAProps {
  baseAttributes: {
    age: number;
    gender: string;
    location: string;
    condition: string;
  };
  archetype?: string;
  diseasePack?: string;
  brandName?: string | null;
}

export function PersonaDNA({ baseAttributes, archetype, diseasePack, brandName }: PersonaDNAProps) {
  return (
    <Card className="bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 border-dashed border-2">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2 text-slate-700 dark:text-slate-300">
          <Layers className="h-5 w-5" />
          Persona Generation DNA
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative pl-6 border-l-2 border-slate-200 dark:border-slate-800 space-y-6">
          
          {/* Layer 1: Base */}
          <div className="relative">
            <div className="absolute -left-[31px] top-0 bg-slate-100 dark:bg-slate-800 rounded-full p-1.5 border-2 border-white dark:border-slate-950">
              <User className="h-4 w-4 text-slate-600 dark:text-slate-400" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Layer 1: Base Inputs</span>
              <div className="mt-1 flex flex-wrap gap-2">
                <Badge variant="secondary" className="bg-white border-slate-200 text-slate-700">{baseAttributes.age} years</Badge>
                <Badge variant="secondary" className="bg-white border-slate-200 text-slate-700">{baseAttributes.gender}</Badge>
                <Badge variant="secondary" className="bg-white border-slate-200 text-slate-700">{baseAttributes.location}</Badge>
                <Badge variant="secondary" className="bg-white border-slate-200 text-slate-700">{baseAttributes.condition}</Badge>
              </div>
            </div>
          </div>

          {/* Layer 2: Archetype */}
          <div className="relative">
            <div className="absolute -left-[31px] top-0 bg-violet-100 dark:bg-violet-900/30 rounded-full p-1.5 border-2 border-white dark:border-slate-950">
              <Activity className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <span className="text-xs font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wider">Layer 2: Archetype</span>
              <div className="mt-1">
                {archetype ? (
                  <Badge className="bg-violet-600 hover:bg-violet-700 text-white border-0">
                    {archetype}
                  </Badge>
                ) : (
                  <span className="text-sm text-slate-400 italic">None applied</span>
                )}
              </div>
            </div>
          </div>

          {/* Layer 3: Disease Pack */}
          <div className="relative">
            <div className="absolute -left-[31px] top-0 bg-blue-100 dark:bg-blue-900/30 rounded-full p-1.5 border-2 border-white dark:border-slate-950">
              <Heart className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Layer 3: Disease Context</span>
              <div className="mt-1">
                {diseasePack ? (
                  <Badge className="bg-blue-600 hover:bg-blue-700 text-white border-0">
                    {diseasePack}
                  </Badge>
                ) : (
                  <span className="text-sm text-slate-400 italic">None applied</span>
                )}
              </div>
            </div>
          </div>

          {/* Layer 4: Brand */}
          <div className="relative">
            <div className="absolute -left-[31px] top-0 bg-amber-100 dark:bg-amber-900/30 rounded-full p-1.5 border-2 border-white dark:border-slate-950">
              <Library className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Layer 4: Brand Insights</span>
              <div className="mt-1">
                {brandName ? (
                  <Badge className="bg-amber-600 hover:bg-amber-700 text-white border-0">
                    {brandName}
                  </Badge>
                ) : (
                  <span className="text-sm text-slate-400 italic">None applied</span>
                )}
              </div>
            </div>
          </div>

        </div>
      </CardContent>
    </Card>
  );
}

