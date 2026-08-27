import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Sparkles, User, Loader2, Minimize2, Maximize2, Lightbulb } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { retrieveContext, getKnowledgeBaseIndex } from '../lib/mila-rag';

interface MilaWidgetProps {
    context: any;
}

interface Message {
    id: string;
    sender: 'user' | 'mila';
    text: string;
    timestamp: Date;
}

const MilaWidget: React.FC<MilaWidgetProps> = ({ context }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);

    // Extract user name and hotel info from context — no need to ask
    const userFirstName = context?.user?.firstName || context?.user?.name?.split(' ')[0] || 'there';
    const hotelName = context?.company?.name || 'your hotel';
    const outletName = context?.company?.outlet || 'All Outlets';
    const region = context?.company?.region || '';
    const city = context?.company?.city || '';

    // Dynamic Greeting Logic
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 12) return "Good morning";
        if (hour >= 12 && hour < 18) return "Good afternoon";
        return "Good evening";
    };

    const [messages, setMessages] = useState<Message[]>([]);

    // Initialize Greeting on Mount — use real name from context
    useEffect(() => {
        const greeting = getGreeting();
        const initialText = `${greeting}, ${userFirstName}. I'm Mila, your ESG strategist at ${hotelName}. I can see you're viewing ${outletName}${region ? ` in ${region}` : ''}. What would you like to analyze today?`;

        setMessages([
            {
                id: '1',
                sender: 'mila',
                text: initialText,
                timestamp: new Date()
            }
        ]);
    }, [userFirstName, hotelName, outletName, region]);

    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isOpen]);

    const handleSendMessage = async () => {
        if (!inputValue.trim()) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            sender: 'user',
            text: inputValue,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMsg]);
        setInputValue('');
        setIsLoading(true);

        // GAMIFICATION: Reward for Interaction (Recommendation/Contribution)
        try {
            const currentPoints = parseInt(localStorage.getItem('ecometricus_user_points') || '1250');
            localStorage.setItem('ecometricus_user_points', (currentPoints + 5).toString());
            // Dispatch event for StaffPortal to pick up
            window.dispatchEvent(new Event('gamification_update'));
        } catch (e) {
            console.error("Gamification sync error", e);
        }

        let currentUserName = userFirstName;

        try {
            // @ts-ignore
            const apiKey = import.meta.env.VITE_DEEPSEEK_API_KEY || "sk-0a92323227144880af7b3a250fbfbe42";

            if (!apiKey) {
                throw new Error("Configuration Error: VITE_DEEPSEEK_API_KEY is missing from .env");
            }

            // RAG: Retrieve relevant documents from Supabase based on user query
            const ragContext = await retrieveContext(userMsg.text, 5);
            console.log('[Mila RAG] Retrieved context:', ragContext ? `${ragContext.length} chars` : 'empty');

            // KB Index: Get list of all available documents for meta-questions
            const kbIndex = await getKnowledgeBaseIndex();
            const kbIndexStr = kbIndex
              ? `${kbIndex.total} documents (${kbIndex.totalWords.toLocaleString()} words total):\n${kbIndex.titles.map(t => `  - ${t}`).join('\n')}`
              : 'Knowledge base is empty. No documents uploaded yet.';
            console.log('[Mila RAG] KB index:', kbIndex ? `${kbIndex.total} docs` : 'empty');

            // INSTRUCTIONS UPDATED FOR MARKDOWN & STRUCTURE
            const systemPrompt = `
            IDENTITY: You are Mila, the Ecometricus ESG Strategist.

            === USER INFO ===
            Name: ${currentUserName}
            Hotel: ${hotelName}
            Outlet: ${outletName}
            ${region ? `Region: ${region}` : ''}
            ${city ? `City: ${city}` : ''}
            ==================

            === KNOWLEDGE BASE INDEX (AVAILABLE DOCUMENTS) ===
            ${kbIndexStr}
            ==================================================

            === RAG RETRIEVED CONTEXT (RELEVANT EXCERPTS FOR THIS QUERY) ===
            ${ragContext || 'No specific excerpts retrieved for this query — but the knowledge base index above shows what documents are available.'}
            ==================================================

            === SESSION CONTEXT (LIVE DASHBOARD VITALS) ===
            ${JSON.stringify(context, null, 2)}
            ===============================================

            INSTRUCTIONS:
            1. PERSONALIZATION:
               - The user's name is ${currentUserName}. Always address them by name.
               - The user works at ${hotelName}, currently viewing ${outletName}.
               - Use this context to give personalized, specific answers.

            2. KNOWLEDGE BASE USAGE:
               - The KNOWLEDGE BASE INDEX above lists ALL documents available to you. When asked "what is your knowledge base?" or "what do you know?", list the document titles from the index.
               - The RAG RETRIEVED CONTEXT contains relevant excerpts that match the user's question. Use these to answer specific questions.
               - If RAG context has relevant info, cite specific numbers and facts from it.
               - If RAG context is empty but the KB index shows documents, tell the user what documents exist and suggest they ask a more specific question.
               - NEVER say "I don't have access to a knowledge base" — the KB index above shows exactly what's available.

            3. STRATEGIC CONSULTANT MODE:
               - YOU ARE THE AUDITOR. Do not just list data the user can see.
               - Provide actionable insights with specific numbers from the RAG context and session data.
               - Reference the hotel name and outlet when giving recommendations.

            4. RESPONSE FORMAT (STRICT MARKDOWN STRUCTURE):
               - LIMIT: 3-4 concise bullet points MAX per response.
               - WORD COUNT: < 80 words total.
               - LAYOUT RULES:
                 * **Acknowledgement**: Start with 1 sentence addressing the user by name.
                 * **Bullets**: Each insight MUST be a new line with a bullet (*).
                 * **Spacing**: Add a DOUBLE LINE BREAK between every bullet for readability.
                 * **Bolding**: BOLD the header of each bullet (e.g., **Root Cause:**, **Action:**).

            5. CORE INTELLIGENCE:
               - ACTIVE ALERTS:
                 * KPI Alert: ${context.activeAlerts?.kpi ? "CRITICAL: Food Cost Spike detected." : "None."}
                 * Sustainability Alert: ${context.activeAlerts?.sustainability ? "CRITICAL: Excessive Waste detected." : "None."}

            Refuse generic advice. Cite specific numbers from RAG Context and Session Context.
            `;

            // DEEPSEEK API CALL (Standard OpenAI-compatible fetch)
            const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'deepseek-chat',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userMsg.text }
                    ],
                    stream: false,
                    temperature: 0.7
                })
            });

            const data = await response.json();

            if (data.error) {
                console.error("DeepSeek API Error:", data.error);
                throw new Error(`API Error: ${data.error.message || JSON.stringify(data.error)}`);
            }

            const aiText = data.choices?.[0]?.message?.content || "I'm having trouble retrieving my long-term memory right now.";

            const milaMsg: Message = {
                id: (Date.now() + 1).toString(),
                sender: 'mila',
                text: aiText,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, milaMsg]);

        } catch (error: any) {
            const errorMsg: Message = {
                id: (Date.now() + 1).toString(),
                sender: 'mila',
                text: `Connectivity Alert: ${error.message}`,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-8 right-8 z-[100] w-16 h-16 bg-[#0f2420] border border-[#39ff14] rounded-full flex items-center justify-center shadow-[0_4px_20px_rgba(0,0,0,0.6)] hover:scale-110 transition-transform duration-300 group"
            >
                {/* "Bright Green color icon... circular outline" */}
                <div className="absolute inset-0 rounded-full border border-[#39ff14] opacity-50 group-hover:opacity-100 transition-opacity"></div>
                <Lightbulb className="text-[#39ff14] animate-pulse" size={32} />
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-brand-gold rounded-full border-2 border-brand-dark flex items-center justify-center">
                    <span className="text-[10px] font-bold text-brand-dark">1</span>
                </div>
            </button>
        );
    }

    return (
        <div className={`fixed z-[100] transition-all duration-300 ease-in-out ${isMinimized ? 'bottom-8 right-8 w-72 h-auto' : 'bottom-8 right-8 w-[400px] h-[600px]'} bg-[#0f2420]/95 backdrop-blur-xl border border-brand-gold/50 rounded-[20px] shadow-[0_20px_60px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden`}>

            {/* Header */}
            <div className="p-4 bg-brand-dark/50 border-b border-brand-gold/20 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-brand-eco/10 flex items-center justify-center border border-brand-eco">
                        <Lightbulb className="text-brand-eco" size={16} />
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-white uppercase tracking-wider">Mila AI</h3>
                        <p className="text-[10px] text-brand-gold uppercase tracking-widest">ESG Strategist</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setIsMinimized(!isMinimized)} className="text-gray-400 hover:text-white transition-colors">
                        {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
                    </button>
                    <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                        <X size={18} />
                    </button>
                </div>
            </div>

            {!isMinimized && (
                <>
                    {/* Messages Area */}
                    <div className="flex-grow overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[#0a1a17]">
                        {messages.map((msg) => (
                            <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed ${msg.sender === 'user'
                                    ? 'bg-brand-gold/10 border border-brand-gold/30 text-white rounded-br-none'
                                    : 'bg-white/5 border border-white/10 text-gray-200 rounded-bl-none'
                                    }`}>
                                    {msg.sender === 'mila' ? (
                                        <ReactMarkdown
                                            components={{
                                                p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                                                strong: ({ node, ...props }) => <span className="font-bold text-brand-gold" {...props} />,
                                                ul: ({ node, ...props }) => <ul className="list-disc pl-4 space-y-2" {...props} />,
                                                li: ({ node, ...props }) => <li className="marker:text-brand-gold" {...props} />
                                            }}
                                        >
                                            {msg.text}
                                        </ReactMarkdown>
                                    ) : (
                                        msg.text
                                    )}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-white/5 border border-white/10 p-3 rounded-2xl rounded-bl-none flex items-center gap-2">
                                    <Loader2 className="animate-spin text-brand-gold" size={14} />
                                    <span className="text-[10px] text-gray-400 uppercase tracking-wider">Thinking...</span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-4 bg-brand-dark/50 border-t border-brand-gold/20 shrink-0">
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                placeholder="Ask about waste, costs, ESG, or water..."
                                className="flex-grow bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-gold transition-colors"
                            />
                            <button
                                onClick={handleSendMessage}
                                disabled={isLoading || !inputValue.trim()}
                                className="p-3 bg-brand-eco text-brand-dark rounded-xl hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                <Send size={16} />
                            </button>
                        </div>
                        <div className="text-[9px] text-center text-gray-600 mt-2 uppercase tracking-widest">
                            AI can make mistakes. Verify critical data.
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default MilaWidget;
