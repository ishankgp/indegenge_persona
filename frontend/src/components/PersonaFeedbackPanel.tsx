import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CheckCircle, AlertTriangle, Lightbulb, MessageSquare } from 'lucide-react';
import type { PersonaFeedbackCard } from '@/lib/api';

interface PersonaFeedbackPanelProps {
    cards: PersonaFeedbackCard[];
    isLoading?: boolean;
}

const PersonaFeedbackCardComponent: React.FC<{ card: PersonaFeedbackCard }> = ({ card }) => {
    const initials = card.persona_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    return (
        <Card className="h-full flex flex-col bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow duration-300">
            <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                    <Avatar className="h-12 w-12 border-2 border-primary/20">
                        <AvatarImage src={card.avatar_url} alt={card.persona_name} />
                        <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground font-semibold">
                            {initials}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                        <CardTitle className="text-base font-semibold truncate">
                            {card.persona_name}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground truncate">{card.role}</p>
                        {card.segment && (
                            <Badge variant="outline" className="mt-1 text-xs">
                                {card.segment}
                            </Badge>
                        )}
                    </div>
                </div>
                {card.key_characteristics && card.key_characteristics.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                        {card.key_characteristics.slice(0, 3).map((char, idx) => (
                            <Badge
                                key={idx}
                                variant="secondary"
                                className="text-xs px-2 py-0.5 bg-primary/10 text-primary"
                            >
                                {char}
                            </Badge>
                        ))}
                    </div>
                )}
            </CardHeader>
            <CardContent className="flex-1 space-y-4">
                {card.error ? (
                    <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                        <p className="text-sm text-destructive">{card.error}</p>
                    </div>
                ) : (
                    <>
                        {/* Clean Read */}
                        <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                <MessageSquare className="h-4 w-4" />
                                <span>Clean Read</span>
                            </div>
                            <p className="text-sm leading-relaxed pl-6">{card.clean_read}</p>
                        </div>

                        {/* Key Themes */}
                        {card.key_themes && card.key_themes.length > 0 && (
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                    <Lightbulb className="h-4 w-4" />
                                    <span>Key Themes</span>
                                </div>
                                <ul className="text-sm space-y-1 pl-6">
                                    {card.key_themes.map((theme, idx) => (
                                        <li key={idx} className="flex items-start gap-2">
                                            <span className="text-primary mt-1">•</span>
                                            <span>{theme}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Strengths */}
                        {card.strengths && card.strengths.length > 0 && (
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                                    <CheckCircle className="h-4 w-4" />
                                    <span>Strengths</span>
                                </div>
                                <ul className="text-sm space-y-1 pl-6">
                                    {card.strengths.map((strength, idx) => (
                                        <li key={idx} className="flex items-start gap-2">
                                            <span className="text-emerald-500 mt-1">✓</span>
                                            <span>{strength}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Weaknesses */}
                        {card.weaknesses && card.weaknesses.length > 0 && (
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 text-sm font-medium text-amber-600 dark:text-amber-400">
                                    <AlertTriangle className="h-4 w-4" />
                                    <span>Weaknesses</span>
                                </div>
                                <ul className="text-sm space-y-1 pl-6">
                                    {card.weaknesses.map((weakness, idx) => (
                                        <li key={idx} className="flex items-start gap-2">
                                            <span className="text-amber-500 mt-1">⚠</span>
                                            <span>{weakness}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    );
};

const LoadingCard: React.FC = () => (
    <Card className="h-full flex flex-col animate-pulse bg-slate-100 dark:bg-slate-800">
        <CardHeader className="pb-3">
            <div className="flex items-start gap-3">
                <div className="h-12 w-12 rounded-full bg-slate-200 dark:bg-slate-700" />
                <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
                </div>
            </div>
        </CardHeader>
        <CardContent className="flex-1 space-y-3">
            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-5/6" />
            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-4/6" />
        </CardContent>
    </Card>
);

export const PersonaFeedbackPanel: React.FC<PersonaFeedbackPanelProps> = ({
    cards,
    isLoading = false,
}) => {
    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                    <LoadingCard key={i} />
                ))}
            </div>
        );
    }

    if (!cards || cards.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                <p>No persona feedback available.</p>
                <p className="text-sm mt-1">Select personas and submit an asset for analysis.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold">
                Persona Feedback ({cards.length} {cards.length === 1 ? 'persona' : 'personas'})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {cards.map((card) => (
                    <PersonaFeedbackCardComponent key={card.persona_id} card={card} />
                ))}
            </div>
        </div>
    );
};

export default PersonaFeedbackPanel;
