import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, User, Loader2, Minimize2, Maximize2, Lightbulb, Wrench, CheckCircle2, AlertCircle, Bell, TrendingDown, AlertTriangle, Info } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { retrieveContext } from '../lib/mila-rag';
import { getToolsForRole, executeTool, type ToolCall, type ToolResult, type ToolExecutionContext } from '../lib/mila-tools';
import { supabase } from '../lib/supabase';
import { useI18n } from '../lib/useI18n';
import type { UserProfile } from '../types';

interface MilaWidgetProps {
    context: any;
}

interface Insight {
    id: string;
    severity: 'critical' | 'warning' | 'info';
    category: string;
    title: string;
    description: string;
    recommendation?: string;
    created_at: string;
}

interface Message {
    id: string;
    sender: 'user' | 'mila' | 'tool';
    text: string;
    timestamp: Date;
    toolName?: string;
    toolStatus?: 'running' | 'done' | 'error';
}

const MAX_TOOL_ROUNDS = 5; // Safety limit to prevent infinite loops

const MilaWidget: React.FC<MilaWidgetProps> = ({ context }) => {
    const { t } = useI18n();
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [proactiveInsights, setProactiveInsights] = useState<Insight[]>([]);
    const [showInsightsPanel, setShowInsightsPanel] = useState(false);

    // Extract user name and hotel info from context
    const userFirstName = context?.user?.firstName || context?.user?.name?.split(' ')[0] || t('mila.greetingFallback');
    const hotelName = context?.company?.name || t('mila.hotelFallback');
    const outletName = context?.company?.outlet || t('mila.outletFallback');
    const region = context?.company?.region || '';
    const city = context?.company?.city || '';
    const userProfile: UserProfile = context?.userProfile || {
        id: '', fullName: userFirstName, email: '', role: 'admin', position: 'GM', outletCode: ''
    };

    // Dynamic Greeting Logic
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 12) return t('mila.greetingMorning');
        if (hour >= 12 && hour < 18) return t('mila.greetingAfternoon');
        return t('mila.greetingEvening');
    };

    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [activeTool, setActiveTool] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Conversation history for the API (system + user + assistant + tool messages)
    const conversationHistory = useRef<any[]>([]);

    // Initialize Greeting on Mount
    useEffect(() => {
        const greeting = getGreeting();
        const initialText = `${greeting}, ${userFirstName}. I'm Mila, your ESG strategist at ${hotelName}. I can see you're viewing ${outletName}${region ? ` in ${region}` : ''}.\n\nI can now **take actions** for you — log waste entries, query your data, generate reports, search the knowledge base, and more. What would you like to do?`;

        setMessages([
            { id: '1', sender: 'mila', text: initialText, timestamp: new Date() }
        ]);
    }, [userFirstName, hotelName, outletName, region]);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isOpen]);

    // Check for proactive insights on mount
    useEffect(() => {
        const fetchInsights = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) return;
                const { data, error } = await supabase
                    .from('mila_insights')
                    .select('*')
                    .eq('user_id', session.user.id)
                    .eq('is_read', false)
                    .order('created_at', { ascending: false })
                    .limit(10);
                if (!error && data) {
                    setProactiveInsights(data as Insight[]);
                }
            } catch {}
        };
        fetchInsights();
    }, []);

    // Mark insight as read
    const dismissInsight = async (id: string) => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;
            await supabase.from('mila_insights').update({ is_read: true }).eq('id', id).eq('user_id', session.user.id);
            setProactiveInsights(prev => prev.filter(i => i.id !== id));
        } catch {}
    };

    const handleSendMessage = async () => {
        if (!inputValue.trim() || isLoading) return;

        const userText = inputValue.trim();
        const userMsg: Message = {
            id: Date.now().toString(),
            sender: 'user',
            text: userText,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMsg]);
        setInputValue('');
        setIsLoading(true);

        // GAMIFICATION: Reward for Interaction
        try {
            const currentPoints = parseInt(localStorage.getItem('ecometricus_user_points') || '1250');
            localStorage.setItem('ecometricus_user_points', (currentPoints + 5).toString());
            window.dispatchEvent(new Event('gamification_update'));
        } catch (e) {
            console.error("Gamification sync error", e);
        }

        try {
            // @ts-ignore
            const apiKey = import.meta.env.VITE_DEEPSEEK_API_KEY || "sk-0a92323227144880af7b3a250fbfbe42";
            if (!apiKey) throw new Error(t('mila.errorMissingApiKey'));

            // RAG: Retrieve relevant documents from internal knowledge base
            const ragContext = await retrieveContext(userText, 5);

            // Get role-based tools
            const tools = getToolsForRole(userProfile.role);

            // System prompt — agentic
            const systemPrompt = `IDENTITY: You are Mila, the Ecometricus ESG Strategist — an AI agent that can both analyze data AND take actions.

=== USER INFO ===
Name: ${userFirstName}
Role: ${userProfile.role}
Hotel: ${hotelName}
Outlet: ${outletName}
${region ? `Region: ${region}` : ''}
${city ? `City: ${city}` : ''}
==================

=== INTERNAL KNOWLEDGE BASE CONTEXT ===
${ragContext || 'No specific excerpts retrieved from the Ecometricus knowledge base for this query. The knowledge base contains ESG criteria, GHG protocol references, GSTC standards, and sustainability best practices.'}
=========================================

=== SESSION CONTEXT (LIVE DASHBOARD) ===
${JSON.stringify(context, null, 2)}
========================================

=== AVAILABLE TOOLS ===
You have access to ${tools.length} tools based on your role (${userProfile.role}):
${tools.map(t => `- ${t.function.name}: ${t.function.description}`).join('\n')}
========================

INSTRUCTIONS:
1. PERSONALIZATION: Address the user by name (${userFirstName}). They work at ${hotelName}, viewing ${outletName}.

2. TOOL USAGE — YOU ARE AN AGENT:
   - When the user asks you to DO something (log data, generate a report, query data), USE THE APPROPRIATE TOOL.
   - When the user asks about ESG/GHG/GSTC criteria, use search_knowledge_base FIRST, then web_search to find the latest updates and trends.
   - When the user asks about industry trends, benchmarks, or "what are other hotels doing", use web_search to find current information.
   - When the user asks "what do you know?", use get_kb_index.
   - When the user asks about KPIs or performance, use get_kpi_summary.
   - When the user says "log X kg of Y" or "I threw out X", use log_waste_entry.
   - When the user says "log water/energy", use log_resource_entry.
   - When the user asks to compare outlets, use compare_outlets.
   - When the user asks about staff compliance, use get_staff_compliance.
   - Do NOT just describe what you would do — actually CALL the tools.
   - After receiving tool results, synthesize them into a clear, actionable response.

3. DUAL SOURCE STRATEGY (INTERNAL + EXTERNAL):
   - You have TWO knowledge sources: the Ecometricus knowledge base (internal) and web search (external).
   - For ESG/GHG/GSTC questions: search the internal knowledge base first, then use web_search to verify, update, or find newer information.
   - For industry trends and best practices: use web_search to find current data, then cross-reference with internal knowledge.
   - ALWAYS combine both sources when possible for comprehensive, up-to-date answers.

4. SOURCE ATTRIBUTION (CRITICAL):
   - NEVER disclose specific file names, document titles, or URLs from your knowledge sources.
   - When citing information, refer to sources broadly as:
     * "Based on the Ecometricus knowledge base..." for internal data
     * "According to ESG and GSTC external sources..." for web search results
     * "Drawing from both internal ESG frameworks and external sustainability sources..." when combining
   - Do NOT say "according to document X" or "file Y states" — always use broad references.
   - Do NOT include URLs or links in your responses.

5. RESPONSE FORMAT:
   - LIMIT: 3-4 concise bullet points MAX.
   - WORD COUNT: < 100 words total (unless generating a report).
   - Start with 1 sentence addressing the user by name.
   - Use bullet points with BOLD headers (**Root Cause:**, **Action:**, etc.).
   - Double line break between bullets.
   - Cite specific numbers from tool results and session context.

6. ROLE AWARENESS:
   - ${userProfile.role === 'admin' || userProfile.role === 'super_admin' ? 'You are talking to an ADMIN/GM. They have full access. You can use all tools including audit trail and cross-outlet comparison.' : ''}
   - ${userProfile.role === 'supervisor' ? 'You are talking to a SUPERVISOR. They review data and log entries. Help them validate and triage alerts.' : ''}
   - ${userProfile.role === 'basic' ? 'You are talking to a STAFF member. Help them log entries quickly and give them quick feedback on their performance.' : ''}

7. SAFETY: Never fabricate data. If a tool returns no results, say so honestly.`;

            // Build conversation messages for the API
            const apiMessages: any[] = [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userText },
            ];

            // Agentic loop: call API, execute tools, feed back, repeat
            let rounds = 0;
            let finalText = '';

            while (rounds < MAX_TOOL_ROUNDS) {
                rounds++;
                setActiveTool(rounds > 1 ? 'continuing' : null);

                const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify({
                        model: 'deepseek-chat',
                        messages: apiMessages,
                        tools: tools.length > 0 ? tools : undefined,
                        tool_choice: 'auto',
                        stream: false,
                        temperature: 0.7,
                    })
                });

                const data = await response.json();

                if (data.error) {
                    throw new Error(`API Error: ${data.error.message || JSON.stringify(data.error)}`);
                }

                const choice = data.choices?.[0];
                const assistantMessage = choice?.message;

                // Check if the model wants to call tools
                if (assistantMessage?.tool_calls && assistantMessage.tool_calls.length > 0) {
                    // Add assistant message (with tool_calls) to conversation
                    apiMessages.push(assistantMessage);

                    // Execute each tool call
                    for (const toolCall of assistantMessage.tool_calls as ToolCall[]) {
                        const toolName = toolCall.function.name;
                        let toolArgs: any;
                        try {
                            toolArgs = JSON.parse(toolCall.function.arguments);
                        } catch {
                            toolArgs = {};
                        }

                        // Show tool status in UI
                        setActiveTool(toolName);
                        const toolMsgId = `tool-${Date.now()}-${Math.random()}`;
                        setMessages(prev => [...prev, {
                            id: toolMsgId,
                            sender: 'tool',
                            text: t('mila.toolExecuting', { toolName }),
                            timestamp: new Date(),
                            toolName,
                            toolStatus: 'running',
                        }]);

                        // Execute the tool
                        const toolCtx: ToolExecutionContext = { user: userProfile, context };
                        const result = await executeTool(toolName, toolArgs, toolCtx);

                        // Update tool message status
                        setMessages(prev => prev.map(m =>
                            m.id === toolMsgId
                                ? { ...m, text: t('mila.toolCompleted', { toolName }), toolStatus: 'done' }
                                : m
                        ));

                        // Add tool result to conversation
                        apiMessages.push({
                            role: 'tool',
                            tool_call_id: toolCall.id,
                            content: result,
                        });
                    }

                    // Continue the loop — the model will process tool results
                    continue;
                }

                // No tool calls — this is the final response
                finalText = assistantMessage?.content || t('mila.errorProcessing');
                break;
            }

            if (!finalText) {
                finalText = t('mila.doneResponse');
            }

            setActiveTool(null);

            const milaMsg: Message = {
                id: (Date.now() + 1).toString(),
                sender: 'mila',
                text: finalText,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, milaMsg]);

        } catch (error: any) {
            setActiveTool(null);
            const errorMsg: Message = {
                id: (Date.now() + 1).toString(),
                sender: 'mila',
                text: t('mila.errorConnectivity', { errorMessage: error.message }),
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsLoading(false);
            setActiveTool(null);
        }
    };

    // Tool display names
    const toolDisplayNames: Record<string, string> = {
        query_waste_data: t('mila.toolQueryWaste'),
        query_resource_data: t('mila.toolQueryResource'),
        get_kpi_summary: t('mila.toolKpiSummary'),
        compare_outlets: t('mila.toolCompareOutlets'),
        list_outlets: t('mila.toolListOutlets'),
        get_staff_compliance: t('mila.toolStaffCompliance'),
        get_benchmarks: t('mila.toolGetBenchmarks'),
        get_audit_trail: t('mila.toolGetAuditTrail'),
        search_knowledge_base: t('mila.toolSearchKb'),
        get_kb_index: t('mila.toolGetKbIndex'),
        web_search: t('mila.toolWebSearch'),
        log_waste_entry: t('mila.toolLogWaste'),
        log_resource_entry: t('mila.toolLogResource'),
        generate_report: t('mila.toolGenerateReport'),
        get_proactive_insights: t('mila.toolGetInsights'),
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-8 right-8 z-[100] group"
                aria-label={t('mila.openButtonAria')}
            >
                {/* Outer pulsing ring */}
                <div className="absolute inset-0 rounded-full bg-brand-eco/20 animate-ping-slow" />
                {/* Glow halo */}
                <div className="absolute -inset-2 rounded-full bg-gradient-to-br from-brand-eco/30 to-brand-eco/10 blur-xl opacity-60 group-hover:opacity-100 transition-opacity duration-500" />

                {/* Main orb */}
                <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-brand-dark via-brand-dark to-[#0a1a17] flex items-center justify-center shadow-[0_8px_32px_rgba(74,222,128,0.3)] group-hover:scale-110 group-active:scale-95 transition-transform duration-300 border-2 border-brand-eco/50">
                    {/* Inner shine */}
                    <div className="absolute inset-1 rounded-full bg-gradient-to-tr from-transparent via-white/5 to-white/10" />

                    {/* AI Avatar — lightbulb icon */}
                    <Lightbulb className="text-brand-eco drop-shadow-lg" size={26} />

                    {/* Status dot */}
                    <div className="absolute bottom-1 right-1 w-3.5 h-3.5 rounded-full bg-brand-eco border-2 border-brand-dark" />

                    {/* Insight badge */}
                    {proactiveInsights.length > 0 && (
                        <div className="absolute -top-1.5 -right-1.5 min-w-6 h-6 px-1.5 bg-brand-alert rounded-full border-2 border-brand-dark flex items-center justify-center shadow-lg">
                            <span className="text-[10px] font-black text-white">{proactiveInsights.length}</span>
                        </div>
                    )}
                </div>

                {/* Tooltip on hover */}
                <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-3 py-2 rounded-lg bg-brand-dark border border-brand-gold/30 text-[11px] font-bold text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none shadow-xl">
                    {t('mila.openButtonTooltip')}
                    <div className="absolute left-full top-1/2 -translate-y-1/2 border-4 border-transparent border-l-brand-dark" />
                </div>
            </button>
        );
    }

    return (
        <div className={`fixed z-[100] transition-all duration-300 ease-in-out ${isMinimized ? 'bottom-8 right-8 w-72 h-auto' : 'bottom-8 right-8 w-[400px] h-[600px]'} bg-[#0f2420]/95 backdrop-blur-xl border border-brand-gold/50 rounded-[20px] shadow-[0_20px_60px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden`}>

            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-brand-gold/10 to-transparent border-b border-brand-gold/20 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-brand-dark to-[#0a1a17] flex items-center justify-center border border-brand-eco/50 shadow-[0_4px_16px_rgba(74,222,128,0.25)]">
                        <div className="absolute inset-0.5 rounded-full bg-gradient-to-tr from-transparent via-white/5 to-white/10" />
                        <Lightbulb className="text-brand-eco relative z-10" size={18} />
                        {activeTool && (
                            <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-brand-alert rounded-full animate-pulse border border-brand-dark"></div>
                        )}
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                            {t('mila.headerTitle')}
                            <span className="w-1.5 h-1.5 rounded-full bg-brand-eco animate-pulse" />
                        </h3>
                        <p className="text-[10px] text-brand-gold uppercase tracking-widest">
                            {activeTool ? t('mila.headerWorking') : t('mila.headerAgent')}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {proactiveInsights.length > 0 && (
                        <button
                            onClick={() => setShowInsightsPanel(!showInsightsPanel)}
                            className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-all ${showInsightsPanel ? 'bg-brand-alert/25 border border-brand-alert/50' : 'bg-brand-alert/15 border border-brand-alert/30 hover:bg-brand-alert/20'}`}
                        >
                            <Bell size={11} className="text-brand-alert" />
                            <span className="text-[9px] font-bold text-brand-alert">{proactiveInsights.length}</span>
                        </button>
                    )}
                    <button onClick={() => setIsMinimized(!isMinimized)} className="text-gray-400 hover:text-white transition-colors">
                        {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
                    </button>
                    <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                        <X size={18} />
                    </button>
                </div>
            </div>

            {/* Proactive Insights Panel */}
            {showInsightsPanel && proactiveInsights.length > 0 && (
                <div className="border-b border-brand-gold/20 bg-brand-dark/60 max-h-[280px] overflow-y-auto custom-scrollbar">
                    <div className="px-4 py-2 border-b border-brand-gold/5 flex items-center justify-between sticky top-0 bg-brand-dark/80 backdrop-blur-sm">
                        <span className="text-[10px] font-black uppercase tracking-widest text-brand-gold">{t('mila.insightsTitle')}</span>
                        <button onClick={() => setShowInsightsPanel(false)} className="text-white/30 hover:text-white transition-colors">
                            <X size={12} />
                        </button>
                    </div>
                    {proactiveInsights.map((insight) => (
                        <div key={insight.id} className="px-4 py-3 border-b border-brand-gold/5 hover:bg-white/3 transition-colors">
                            <div className="flex items-start gap-2 mb-1.5">
                                {insight.severity === 'critical' ? (
                                    <AlertTriangle size={13} className="text-brand-alert shrink-0 mt-0.5" />
                                ) : insight.severity === 'warning' ? (
                                    <AlertCircle size={13} className="text-brand-gold shrink-0 mt-0.5" />
                                ) : (
                                    <Info size={13} className="text-brand-eco shrink-0 mt-0.5" />
                                )}
                                <span className="text-[11px] font-bold text-white leading-tight">{insight.title}</span>
                            </div>
                            <p className="text-[10px] text-white/50 leading-relaxed mb-1.5 pl-5">{insight.description}</p>
                            {insight.recommendation && (
                                <p className="text-[10px] text-brand-eco/70 leading-relaxed pl-5 mb-1.5">
                                    <span className="font-bold">→ </span>{insight.recommendation}
                                </p>
                            )}
                            <button
                                onClick={() => dismissInsight(insight.id)}
                                className="text-[9px] text-white/30 hover:text-white/60 uppercase tracking-widest transition-colors pl-5"
                            >
                                {t('mila.dismiss')}
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {!isMinimized && (
                <>
                    {/* Messages Area */}
                    <div className="flex-grow overflow-y-auto p-4 space-y-3 custom-scrollbar bg-[#0a1a17]">
                        {messages.map((msg) => (
                            <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                {msg.sender === 'tool' ? (
                                    /* Tool status message */
                                    <div className="flex items-center gap-2 w-full bg-brand-eco/5 border border-brand-eco/15 rounded-xl px-3 py-2">
                                        {msg.toolStatus === 'running' ? (
                                            <Loader2 size={12} className="text-brand-eco animate-spin shrink-0" />
                                        ) : msg.toolStatus === 'done' ? (
                                            <CheckCircle2 size={12} className="text-brand-eco shrink-0" />
                                        ) : (
                                            <AlertCircle size={12} className="text-brand-alert shrink-0" />
                                        )}
                                        <span className="text-[10px] text-brand-eco/80 font-medium uppercase tracking-wider">
                                            {toolDisplayNames[msg.toolName || ''] || msg.toolName || t('mila.toolFallback')} {msg.toolStatus === 'running' ? '...' : '✓'}
                                        </span>
                                    </div>
                                ) : (
                                    <div className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed ${msg.sender === 'user'
                                        ? 'bg-brand-gold/10 border border-brand-gold/30 text-white rounded-br-none'
                                        : 'bg-white/5 border border-brand-gold/10 text-gray-200 rounded-bl-none'
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
                                )}
                            </div>
                        ))}
                        {isLoading && !activeTool && (
                            <div className="flex justify-start">
                                <div className="bg-white/5 border border-brand-gold/10 p-3 rounded-2xl rounded-bl-none flex items-center gap-2">
                                    <Loader2 className="animate-spin text-brand-gold" size={14} />
                                    <span className="text-[10px] text-gray-400 uppercase tracking-wider">{t('mila.loading')}</span>
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
                                disabled={isLoading}
                                placeholder={t('mila.inputPlaceholder')}
                                className="flex-grow bg-white/5 border border-brand-gold/10 rounded-xl px-4 py-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-gold transition-colors disabled:opacity-50"
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
                            {t('mila.inputFooter')}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default MilaWidget;
