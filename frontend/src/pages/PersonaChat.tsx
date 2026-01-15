"use client"

import React, { useState, useEffect, useRef } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { ChatAPI, PersonasAPI, ChatMessage, ChatSession } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/components/ui/use-toast"
import {
    Send,
    Bot,
    User,
    ArrowLeft,
    Clock,
    Loader2,
    MoreVertical,
    MessageSquare
} from "lucide-react"

export function PersonaChat() {
    const { sessionId } = useParams<{ sessionId: string }>()
    const navigate = useNavigate()
    const { toast } = useToast()

    const [session, setSession] = useState<ChatSession | null>(null)
    const [persona, setPersona] = useState<any>(null)
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [loading, setLoading] = useState(true)
    const [input, setInput] = useState("")
    const [sending, setSending] = useState(false)
    const scrollRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (sessionId) {
            loadSessionData(parseInt(sessionId))
        }
    }, [sessionId])

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    const scrollToBottom = () => {
        if (scrollRef.current) {
            const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
            if (scrollContainer) {
                scrollContainer.scrollTop = scrollContainer.scrollHeight;
            }
        }
    }

    const loadSessionData = async (id: number) => {
        setLoading(true)
        try {
            // 1. Fetch Session
            const sessionData = await ChatAPI.getSession(id)
            setSession(sessionData)

            // 2. Fetch Persona
            if (sessionData.persona_id) {
                const personaData = await PersonasAPI.get(sessionData.persona_id)
                setPersona(personaData)
            }

            // 3. Fetch History
            const history = await ChatAPI.getHistory(id)
            setMessages(history)
        } catch (error) {
            console.error("Failed to load chat data", error)
            toast({
                title: "Error",
                description: "Failed to load chat session",
                variant: "destructive"
            })
        } finally {
            setLoading(false)
        }
    }

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!input.trim() || sending || !sessionId) return

        const userMessage = input.trim()
        setInput("")
        setSending(true)

        // Optimistic Update
        const optimisticMsg: ChatMessage = {
            id: Date.now(), // Temp ID
            session_id: parseInt(sessionId),
            role: 'user',
            content: userMessage,
            created_at: new Date().toISOString()
        }
        setMessages(prev => [...prev, optimisticMsg])

        try {
            const response = await ChatAPI.sendMessage(parseInt(sessionId), userMessage)
            // Append assistant response
            setMessages(prev => [...prev, response])
        } catch (error) {
            console.error("Failed to send message", error)
            toast({
                title: "Error",
                description: "Failed to send message",
                variant: "destructive"
            })
            // Remove optimistic message on failure? Or show error state?
            // For now, simple error toast
        } finally {
            setSending(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-50">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2 text-muted-foreground">Loading specific conversation...</span>
            </div>
        )
    }

    if (!session || !persona) {
        return (
            <div className="flex flex-col items-center justify-center h-screen gap-4">
                <h2 className="text-xl font-semibold">Session not found</h2>
                <Button onClick={() => navigate('/personas')}>Back to Library</Button>
            </div>
        )
    }

    return (
        <div className="flex h-screen bg-background overflow-hidden">
            {/* Left Sidebar: Persona Profile */}
            <div className="w-80 border-r bg-muted/10 hidden md:flex flex-col">
                <div className="p-6 border-b">
                    <Button variant="ghost" className="pl-0 -ml-2 mb-4 text-muted-foreground hover:text-foreground" onClick={() => navigate('/personas')}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                    </Button>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                            {persona.avatar_url ? <img src={persona.avatar_url} alt={persona.name} className="h-full w-full rounded-full object-cover" /> : persona.name[0]}
                        </div>
                        <div>
                            <h2 className="font-bold text-lg">{persona.name}</h2>
                            <Badge variant="outline">{persona.persona_type}</Badge>
                        </div>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                        <p>{persona.age} years old</p>
                        <p>{persona.condition}</p>
                        <p>{persona.location}</p>
                    </div>
                </div>

                <ScrollArea className="flex-1 p-6">
                    <div className="space-y-6">
                        <div>
                            <h3 className="font-semibold mb-2 text-sm uppercase text-muted-foreground">About</h3>
                            <p className="text-sm leading-relaxed">{JSON.parse(persona.full_persona_json || '{}').bio || "No bio available."}</p>
                        </div>

                        {/* Add more persona details like motivations/beliefs if needed */}
                    </div>
                </ScrollArea>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col min-w-0 bg-background">
                {/* Chat Header */}
                <header className="h-16 border-b px-6 flex items-center justify-between bg-background/95 backdrop-blur z-10">
                    <div className="flex items-center gap-3">
                        <MessageSquare className="h-5 w-5 text-primary" />
                        <div>
                            <h1 className="font-semibold text-base">{session.name}</h1>
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Started {new Date(session.created_at).toLocaleDateString()}
                            </div>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon">
                        <MoreVertical className="h-5 w-5" />
                    </Button>
                </header>

                {/* Messages List */}
                <ScrollArea ref={scrollRef} className="flex-1 p-4 md:p-8">
                    <div className="max-w-3xl mx-auto space-y-6">
                        {messages.length === 0 ? (
                            <div className="text-center py-20 text-muted-foreground">
                                <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                <p>Start the conversation with {persona.name}.</p>
                            </div>
                        ) : (
                            messages.map((msg) => (
                                <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    {msg.role === 'assistant' && (
                                        <div className="h-8 w-8 rounded-full bg-primary/10 flex-shrink-0 flex items-center justify-center mt-1">
                                            <Bot className="h-5 w-5 text-primary" />
                                        </div>
                                    )}

                                    <div className={`flex flex-col max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                        <div className={`rounded-2xl px-5 py-3 text-sm shadow-sm ${msg.role === 'user'
                                                ? 'bg-primary text-primary-foreground rounded-tr-none'
                                                : 'bg-muted/50 border rounded-tl-none'
                                            }`}>
                                            <p className="whitespace-pre-wrap">{msg.content}</p>
                                        </div>
                                        <span className="text-[10px] text-muted-foreground mt-1 px-1">
                                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>

                                    {msg.role === 'user' && (
                                        <div className="h-8 w-8 rounded-full bg-gray-200 flex-shrink-0 flex items-center justify-center mt-1">
                                            <User className="h-4 w-4 text-gray-600" />
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                        {sending && (
                            <div className="flex gap-4 justify-start">
                                <div className="h-8 w-8 rounded-full bg-primary/10 flex-shrink-0 flex items-center justify-center mt-1">
                                    <Bot className="h-5 w-5 text-primary" />
                                </div>
                                <div className="bg-muted/50 border rounded-2xl rounded-tl-none px-5 py-4">
                                    <div className="flex gap-1">
                                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>

                {/* Input Area */}
                <div className="p-4 bg-background border-t">
                    <div className="max-w-3xl mx-auto">
                        <form onSubmit={handleSend} className="relative flex items-center gap-2">
                            <Input
                                placeholder={`Message ${persona.name}...`}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                disabled={sending}
                                className="pr-12 py-6 rounded-full shadow-sm bg-muted/10 border-muted-foreground/20 focus-visible:ring-primary"
                            />
                            <Button
                                type="submit"
                                size="icon"
                                disabled={!input.trim() || sending}
                                className="absolute right-1.5 top-1.5 h-9 w-9 rounded-full"
                            >
                                <Send className="h-4 w-4" />
                            </Button>
                        </form>
                        <p className="text-[10px] text-center text-muted-foreground mt-2">
                            AI personas can make mistakes. Verify important medical information.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
