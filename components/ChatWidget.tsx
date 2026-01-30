
import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, AlertTriangle, ShieldAlert } from 'lucide-react';
import { chatWithAI, isAiOperational } from '../services/geminiService';
import { useData } from '../App';

const ChatWidget: React.FC = () => {
  const { config } = useData();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<{role: 'user' | 'model', parts: {text: string}[]}[]>([
    { role: 'model', parts: [{ text: "Bienvenue sur l'assistance Royal Plaza. Comment puis-je vous aider ?" }] }
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
    
    if (!aiReady) {
      setMessages(prev => [...prev, { role: 'model', parts: [{ text: "Je suis désolé, mon module de réponse intelligente est actuellement hors-ligne car aucune clé API Gemini n'a été détectée. Veuillez contacter un administrateur." }] }]);
      return;
    }

    if (!chatbotAllowed) {
      setMessages(prev => [...prev, { role: 'model', parts: [{ text: "L'assistance par IA a été suspendue par la direction. Veuillez vous référer à la documentation manuelle." }] }]);
      return;
    }

    setIsLoading(true);
    const aiResponse = await chatWithAI(userMsg, messages, config.aiModel);
    setMessages(prev => [...prev, { role: 'model', parts: [{ text: aiResponse || "Service momentanément indisponible." }] }]);
    setIsLoading(false);
  };

  return (
    <div className="fixed bottom-10 right-10 z-[60] no-print">
      {isOpen ? (
        <div className="bg-white w-[400px] h-[600px] shadow-[12px_12px_0px_0px_#003049] border-4 border-[#003049] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-300">
          <div className="bg-[#003049] p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#c1121f] rounded flex items-center justify-center border-2 border-[#780000] shadow-xl">
                <Bot size={24} className="text-white" />
              </div>
              <div>
                <p className="text-white font-black text-xs uppercase tracking-widest">Royal Assistant</p>
                <p className={`${chatbotAllowed && aiReady ? 'text-[#669bbc]' : 'text-amber-400'} text-[8px] uppercase font-black tracking-widest`}>
                   {!aiReady ? 'IA Horizon • Hors-ligne' : !chatbotAllowed ? 'IA Horizon • Désactivée' : 'IA Horizon • En ligne'}
                </p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white/40 hover:text-[#c1121f] transition-colors">
              <X size={24} />
            </button>
          </div>

          {!aiReady && (
            <div className="bg-amber-50 p-3 flex items-center gap-3 border-b-2 border-[#003049]">
               <AlertTriangle size={16} className="text-amber-600 shrink-0" />
               <p className="text-[10px] font-bold text-amber-800 uppercase leading-tight">Clé API manquante : Mode Démo Actif</p>
            </div>
          )}

          {!config.aiEnabled && aiReady && (
            <div className="bg-red-50 p-3 flex items-center gap-3 border-b-2 border-[#003049]">
               <ShieldAlert size={16} className="text-red-600 shrink-0" />
               <p className="text-[10px] font-bold text-red-800 uppercase leading-tight">Gouvernance : IA Désactivée Globalement</p>
            </div>
          )}

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#fdf0d5]/50 custom-scrollbar">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-5 py-4 text-xs font-bold leading-relaxed shadow-sm ${
                  m.role === 'user' 
                    ? 'bg-[#003049] text-[#fdf0d5] border-l-4 border-[#c1121f]' 
                    : 'bg-white text-[#003049] border-l-4 border-[#669bbc]'
                }`}>
                  {m.parts[0].text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white px-4 py-2 border-l-4 border-[#669bbc] flex gap-1">
                  <div className="w-1.5 h-1.5 bg-[#669bbc] rounded-full animate-bounce" />
                  <div className="w-1.5 h-1.5 bg-[#669bbc] rounded-full animate-bounce [animation-delay:0.2s]" />
                  <div className="w-1.5 h-1.5 bg-[#669bbc] rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            )}
          </div>

          <div className="p-6 bg-white border-t-2 border-[#003049]">
            <div className="flex gap-3">
              <input
                type="text" value={message} onChange={(e) => setMessage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder={chatbotAllowed ? "Question technique..." : "Service IA suspendu"}
                disabled={!chatbotAllowed}
                className="flex-1 px-4 py-3 bg-[#fdf0d5]/30 border-2 border-[#003049] text-xs font-bold focus:outline-none focus:border-[#c1121f] disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button 
                onClick={handleSend} disabled={!message.trim() || isLoading || !chatbotAllowed}
                className="w-12 h-12 bg-[#c1121f] text-white flex items-center justify-center hover:bg-[#780000] disabled:opacity-30 transition-all border border-[#780000]"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button 
          onClick={() => setIsOpen(true)}
          className="w-20 h-20 bg-[#c1121f] text-white flex items-center justify-center shadow-[8px_8px_0px_0px_#003049] hover:scale-105 transition-transform duration-300 border-2 border-[#780000]"
        >
          <MessageCircle size={36} />
        </button>
      )}
    </div>
  );
};

export default ChatWidget;
