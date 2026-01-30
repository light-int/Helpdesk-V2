
import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, AlertTriangle, ShieldAlert, Cpu, Zap } from 'lucide-react';
import { chatWithAI, isAiOperational } from '../services/geminiService';
import { useData } from '../App';

const ChatWidget: React.FC = () => {
  const { config } = useData();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<{role: 'user' | 'model', parts: {text: string}[]}[]>([
    { role: 'model', parts: [{ text: "Système Horizon Initialisé. Prêt pour assistance technique." }] }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const aiReady = isAiOperational();
  const chatbotAllowed = config.aiEnabled && config.aiChatbotEnabled;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!message.trim() || isLoading) return;
    const userMsg = message;
    setMessage('');
    setMessages(prev => [...prev, { role: 'user', parts: [{ text: userMsg }] }]);
    
    if (!aiReady || !chatbotAllowed) {
      setMessages(prev => [...prev, { role: 'model', parts: [{ text: "Accès IA restreint. Veuillez vérifier votre configuration cloud." }] }]);
      return;
    }

    setIsLoading(true);
    const aiResponse = await chatWithAI(userMsg, messages, config.aiModel);
    setMessages(prev => [...prev, { role: 'model', parts: [{ text: aiResponse || "Interruption du flux Gemini." }] }]);
    setIsLoading(false);
  };

  return (
    <div className="fixed bottom-10 right-10 z-[60] no-print">
      {isOpen ? (
        <div className="bg-[#202124] w-[400px] h-[600px] shadow-2xl border-none flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-500 ring-1 ring-white/10">
          {/* Header Terminal Style */}
          <div className="bg-[#1a73e8] p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white flex items-center justify-center shadow-xl">
                <Cpu size={24} className="text-[#1a73e8]" />
              </div>
              <div>
                <p className="text-white font-black text-xs uppercase tracking-widest">Horizon Expert AI</p>
                <div className="flex items-center gap-2 mt-1">
                   <div className={`w-1.5 h-1.5 rounded-full ${aiReady && chatbotAllowed ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
                   <span className="text-[8px] text-white/60 uppercase font-black tracking-widest">Connecté Cloud LBV</span>
                </div>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white/40 hover:text-white transition-all">
              <X size={24} />
            </button>
          </div>

          {!aiReady && (
            <div className="bg-amber-500 p-2 flex items-center justify-center gap-3">
               <AlertTriangle size={14} className="text-white shrink-0" />
               <p className="text-[9px] font-black text-white uppercase tracking-widest">Mode Démo : API Manquante</p>
            </div>
          )}

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-8 bg-[#1a1b1e] custom-scrollbar">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-5 py-4 text-xs shadow-lg transition-all ${
                  m.role === 'user' 
                    ? 'bg-[#1a73e8] text-white rounded-none border-none' 
                    : 'bg-[#2a2b2f] text-gray-300 border-l-4 border-[#1a73e8] font-medium leading-relaxed'
                }`}>
                  {m.parts[0].text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-[#2a2b2f] px-5 py-3 border-l-4 border-[#1a73e8] flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-[#1a73e8] rounded-full animate-bounce" />
                  <div className="w-1.5 h-1.5 bg-[#1a73e8] rounded-full animate-bounce [animation-delay:0.2s]" />
                  <div className="w-1.5 h-1.5 bg-[#1a73e8] rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            )}
          </div>

          <div className="p-6 bg-[#202124] border-t border-white/5">
            <div className="flex gap-3">
              <input
                type="text" value={message} onChange={(e) => setMessage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Question technique Horizon..."
                className="flex-1 px-4 py-4 bg-white/5 border border-white/10 text-xs font-bold text-white focus:outline-none focus:border-[#1a73e8] placeholder:text-gray-600 transition-all"
              />
              <button 
                onClick={handleSend} disabled={!message.trim() || isLoading}
                className="w-14 h-14 bg-[#1a73e8] text-white flex items-center justify-center hover:bg-blue-600 disabled:opacity-30 transition-all shadow-xl shadow-blue-600/20"
              >
                <Send size={20} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button 
          onClick={() => setIsOpen(true)}
          className="w-20 h-20 bg-[#1a73e8] text-white flex items-center justify-center shadow-2xl hover:scale-110 transition-transform duration-300 border-none ring-4 ring-blue-600/20"
        >
          <Zap size={32} fill="currentColor" />
        </button>
      )}
    </div>
  );
};

export default ChatWidget;
