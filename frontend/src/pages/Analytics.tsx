import { useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus, Users, Target, Brain, MessageSquare, Activity } from 'lucide-react';

export function Analytics() {
  const location = useLocation();
  const analysisResults = location.state?.analysisResults;

  if (!analysisResults) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="gradient-bg text-white p-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-white/20 rounded-xl">
                <Activity className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-4xl font-bold">Analytics Dashboard</h1>
                <p className="text-blue-100 text-lg">
                  View and analyze cohort simulation results
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto p-8">
          <Card className="stat-card">
            <CardContent className="py-16 text-center">
              <div className="p-4 bg-primary/10 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Activity className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No analysis results available</h3>
              <p className="text-gray-600">
                Run a simulation from the Simulation Hub first.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Extract data from the actual backend response structure
  const {
    cohort_size,
    stimulus_text,
    metrics_analyzed,
    individual_responses,
    summary_statistics,
    insights,
    created_at
  } = analysisResults;

  const getSentimentIcon = (sentiment: number) => {
    if (sentiment > 0.3) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (sentiment < -0.3) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  const getSentimentColor = (sentiment: number) => {
    if (sentiment > 0.3) return 'text-green-600';
    if (sentiment < -0.3) return 'text-red-600';
    return 'text-gray-600';
  };

  const MetricCard = ({ 
    title, 
    value, 
    subtitle, 
    icon: Icon 
  }: { 
    title: string; 
    value: any; 
    subtitle?: string;
    icon?: any;
  }) => (
    <Card className="stat-card border-l-4 border-l-primary">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
          {Icon && (
            <div className="p-2 bg-primary/10 rounded-lg">
              <Icon className="h-4 w-4 text-primary" />
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="stat-number">{value}</div>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header Section */}
      <div className="gradient-bg text-white p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-white/20 rounded-xl">
                <Activity className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-4xl font-bold">Analytics Dashboard</h1>
                <p className="text-blue-100 text-lg">
                  Analysis results for {cohort_size} personas
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-blue-100">Analysis completed</div>
              <div className="text-xs text-blue-200">{new Date(created_at).toLocaleString()}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-8 -mt-8">
        {/* Stimulus Card */}
        <Card className="stat-card mb-8">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-secondary/10 rounded-lg">
                <MessageSquare className="h-5 w-5 text-secondary" />
              </div>
              <CardTitle className="text-lg">Stimulus Text</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 italic">"{stimulus_text}"</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {metrics_analyzed.map((metric: string) => (
                <span key={metric} className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                  {metric.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Metric Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          {summary_statistics.purchase_intent_avg !== undefined && (
            <MetricCard
              title="Avg. Purchase Intent"
              value={summary_statistics.purchase_intent_avg.toFixed(1)}
              subtitle="Scale of 1-10"
              icon={Target}
            />
          )}
          {summary_statistics.sentiment_avg !== undefined && (
            <MetricCard
              title="Avg. Sentiment"
              value={
                <div className="flex items-center gap-2">
                  <span className={getSentimentColor(summary_statistics.sentiment_avg)}>
                    {summary_statistics.sentiment_avg.toFixed(2)}
                  </span>
                  {getSentimentIcon(summary_statistics.sentiment_avg)}
                </div>
              }
              subtitle="Scale of -1 to 1"
              icon={Brain}
            />
          )}
          {summary_statistics.trust_in_brand_avg !== undefined && (
            <MetricCard
              title="Avg. Brand Trust"
              value={summary_statistics.trust_in_brand_avg.toFixed(1)}
              subtitle="Scale of 1-10"
              icon={Users}
            />
          )}
          {summary_statistics.message_clarity_avg !== undefined && (
            <MetricCard
              title="Avg. Message Clarity"
              value={summary_statistics.message_clarity_avg.toFixed(1)}
              subtitle="Scale of 1-10"
              icon={MessageSquare}
            />
          )}
        </div>

        {/* Insights */}
        {insights && insights.length > 0 && (
          <Card className="stat-card mb-8">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-warning/10 rounded-lg">
                  <Brain className="h-5 w-5 text-warning" />
                </div>
                <CardTitle className="text-lg">Key Insights</CardTitle>
              </div>
              <CardDescription>AI-generated insights from the cohort analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {insights.map((insight: string, index: number) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold">
                      {index + 1}
                    </div>
                    <p className="text-sm text-gray-700">{insight}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Individual Responses Table */}
        <Card className="stat-card">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-lg">Individual Persona Responses</CardTitle>
            </div>
            <CardDescription>Detailed responses from each persona in the cohort</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-gray-50">
                  <tr>
                    <th className="p-3 text-left text-sm font-medium text-gray-700">Persona</th>
                    <th className="p-3 text-left text-sm font-medium text-gray-700">Reasoning</th>
                    {metrics_analyzed.includes('purchase_intent') && (
                      <th className="p-3 text-center text-sm font-medium text-gray-700">Purchase Intent</th>
                    )}
                    {metrics_analyzed.includes('sentiment') && (
                      <th className="p-3 text-center text-sm font-medium text-gray-700">Sentiment</th>
                    )}
                    {metrics_analyzed.includes('trust_in_brand') && (
                      <th className="p-3 text-center text-sm font-medium text-gray-700">Brand Trust</th>
                    )}
                    {metrics_analyzed.includes('message_clarity') && (
                      <th className="p-3 text-center text-sm font-medium text-gray-700">Message Clarity</th>
                    )}
                    {metrics_analyzed.includes('key_concern_flagged') && (
                      <th className="p-3 text-center text-sm font-medium text-gray-700">Key Concern</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {individual_responses.map((response: any, index: number) => (
                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                      <td className="p-3">
                        <div className="font-medium text-gray-900">{response.persona_name}</div>
                        <div className="text-xs text-gray-500">ID: {response.persona_id}</div>
                      </td>
                      <td className="p-3 max-w-md">
                        <p className="text-sm text-gray-600">{response.reasoning}</p>
                      </td>
                      {metrics_analyzed.includes('purchase_intent') && (
                        <td className="p-3 text-center">
                          <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                            {response.responses.purchase_intent}
                          </span>
                        </td>
                      )}
                      {metrics_analyzed.includes('sentiment') && (
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <span className={`font-medium ${getSentimentColor(response.responses.sentiment)}`}>
                              {response.responses.sentiment?.toFixed(2)}
                            </span>
                            {getSentimentIcon(response.responses.sentiment)}
                          </div>
                        </td>
                      )}
                      {metrics_analyzed.includes('trust_in_brand') && (
                        <td className="p-3 text-center">
                          <span className="inline-block px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                            {response.responses.trust_in_brand}
                          </span>
                        </td>
                      )}
                      {metrics_analyzed.includes('message_clarity') && (
                        <td className="p-3 text-center">
                          <span className="inline-block px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                            {response.responses.message_clarity}
                          </span>
                        </td>
                      )}
                      {metrics_analyzed.includes('key_concern_flagged') && (
                        <td className="p-3">
                          <p className="text-xs text-gray-600 text-center">
                            {response.responses.key_concern_flagged}
                          </p>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Summary Statistics Details */}
        <Card className="stat-card mt-8">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-success/10 rounded-lg">
                <Activity className="h-5 w-5 text-success" />
              </div>
              <CardTitle className="text-lg">Statistical Summary</CardTitle>
            </div>
            <CardDescription>Detailed statistics for analyzed metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Object.entries(summary_statistics).map(([key, value]) => {
                if (key === 'key_concern_flagged') {
                  return (
                    <div key={key} className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Most Common Concern</h4>
                      <p className="text-sm text-gray-600">{value as string}</p>
                    </div>
                  );
                }
                return (
                  <div key={key} className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </h4>
                    <p className="text-2xl font-bold text-primary">{String(value)}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}