import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { TrendDirection } from '@/types/analytics';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { ComponentType, ReactNode } from 'react';

type ColorKey = 'primary' | 'secondary' | 'success' | 'warning';

export interface MetricCardProps {
  title: string;
  value: ReactNode;
  subtitle?: string;
  icon?: ComponentType<{ className?: string }>;
  trend?: TrendDirection;
  color?: ColorKey;
}

const COLOR_CLASSES: Record<ColorKey, string> = {
  primary: 'from-violet-500 to-purple-500',
  secondary: 'from-blue-500 to-cyan-500',
  success: 'from-emerald-500 to-green-500',
  warning: 'from-amber-500 to-orange-500',
};

export function MetricCard({ title, value, subtitle, icon: Icon, trend, color = 'primary' }: MetricCardProps) {
  return (
    <Card className="relative overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-300 backdrop-blur-sm bg-white/90 dark:bg-gray-900/90">
      <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${COLOR_CLASSES[color]}`}></div>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</CardTitle>
          {Icon && (
            <div className={`p-2.5 rounded-xl bg-gradient-to-br ${COLOR_CLASSES[color]} bg-opacity-10`}>
              <Icon className="h-5 w-5 text-gray-700 dark:text-gray-300" />
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <div className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            {value}
          </div>
          {trend && (
            <div className="flex items-center">
              {trend === 'up' && <TrendingUp className="h-4 w-4 text-emerald-500" />}
              {trend === 'down' && <TrendingDown className="h-4 w-4 text-red-500" />}
              {trend === 'neutral' && <Minus className="h-4 w-4 text-gray-500" />}
            </div>
          )}
        </div>
        {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

export default MetricCard;


