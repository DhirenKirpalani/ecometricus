import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, X, Lightbulb, Minimize2, Maximize2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface MilaFeedbackWidgetProps {
    user: {
        fullName: string;
        outletCode: string;
    };
}

const MilaFeedbackWidget: React.FC<MilaFeedbackWidgetProps> = ({ user }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Auto-scroll ref (kept for consistency with standard widget behavior)
    const messagesEndRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [isSubmitted, isOpen]);

    const handleSubmit = async () => {
        if (!inputValue.trim()) return;
        setIsLoading(true);

        try {
            // 1. Save to Supabase
            const { error } = await supabase
                .from('mila_suggestions')
                .insert([{
                    user_name: user.fullName,
                    outlet_code: user.outletCode,
                    content: inputValue,
                    created_at: new Date().toISOString()
                }]);

            if (error) {
                console.error("Submission error:", error);
            }

            // 2. Award Points (Gamification)
            const currentPoints = parseInt(localStorage.getItem('ecometricus_user_points') || '0');
            const newPoints = currentPoints + 5;
            localStorage.setItem('ecometricus_user_points', newPoints.toString());

            // Dispatch event to update StaffPortal UI instantly
            window.dispatchEvent(new Event('gamification_update'));

            // 3. Show Success State
            setIsSubmitted(true);
            setInputValue('');

            // Reset after 4 seconds
            setTimeout(() => {
                setIsSubmitted(false);
                setIsOpen(false);
            }, 4000);

        } catch (err) {
            console.error("Unexpected error:", err);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 z-[100] w-16 h-16 bg-[#0f2420] border border-[#39ff14] rounded-full flex items-center justify-center shadow-[0_4px_20px_rgba(0,0,0,0.6)] hover:scale-110 transition-transform duration-300 group"
            >
                {/* Neon Green Ripple Effect */}
                <div className="absolute inset-0 rounded-full border border-[#39ff14] opacity-50 group-hover:opacity-100 transition-opacity"></div>
                <Lightbulb className="text-[#39ff14] animate-pulse" size={32} />
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-brand-alert rounded-full border-2 border-brand-dark flex items-center justify-center">
                    <span className="text-[10px] font-bold text-white">1</span>
                </div>
            </button>
        );
    }

    return (
        <div className="fixed bottom-6 right-6 z-[100] w-[350px] h-[500px] bg-[#0f2420]/95 backdrop-blur-xl border border-brand-gold/50 rounded-[20px] shadow-[0_20px_60px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-300">

            {/* Header - EXACT COPY OF MILAWIDGET */}
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
                    <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                        <X size={18} />
                    </button>
                </div>
            </div>

            {/* Messages Area - Styled like Chat History */}
            <div className="flex-grow overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[#0a1a17]">

                {/* Intro Message - Mila Style */}
                <div className="flex justify-start">
                    <div className="max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed bg-white/5 border border-white/10 text-gray-200 rounded-bl-none">
                        Thank you for sharing your thoughts and comments to improve Ecometricus Sustainability system.
                    </div>
                </div>

                {/* Submitting State or Success State */}
                {isSubmitted ? (
                    <div className="flex justify-start">
                        <div className="max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed bg-white/5 border border-brand-eco/50 text-white rounded-bl-none shadow-[0_0_15px_rgba(119,177,57,0.1)]">
                            <p className="mb-2">Thank you for sharing your thoughts and comments to improve Ecometricus sustainability system.</p>
                            <div className="inline-block px-3 py-1 bg-brand-eco/20 border border-brand-eco rounded-full text-brand-eco font-bold text-[10px] uppercase tracking-wider">
                                +5 Points Awarded
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex justify-center mt-10 opacity-50">
                        <div className="flex flex-col items-center gap-2">
                            <Lightbulb size={24} className="text-brand-gold/50" />
                            <p className="text-[10px] text-gray-500 uppercase tracking-widest">Listening Mode Active</p>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input Area - EXACT COPY OF MILAWIDGET INPUT */}
            <div className="p-4 bg-brand-dark/50 border-t border-brand-gold/20 shrink-0">
                <div className="flex items-center gap-2">
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
                        placeholder="Type your suggestion..."
                        className="flex-grow bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-gold transition-colors"
                        disabled={isLoading || isSubmitted}
                    />
                    <button
                        onClick={handleSubmit}
                        disabled={isLoading || !inputValue.trim() || isSubmitted}
                        className="p-3 bg-brand-eco text-brand-dark rounded-xl hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        {isLoading ? <div className="w-4 h-4 border-2 border-brand-dark border-t-transparent rounded-full animate-spin" /> : <Send size={16} />}
                    </button>
                </div>
                <div className="text-[9px] text-center text-gray-600 mt-2 uppercase tracking-widest">
                    AI can make mistakes. Verify critical data.
                </div>
            </div>
        </div>
    );
};

export default MilaFeedbackWidget;
