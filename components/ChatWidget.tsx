
import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Cpu, Zap, Terminal } from 'lucide-react';
import { chatWithAI, isAiOperational } from '../services/geminiService';
import { useData } from '../App';

const ChatWidget: React.FC = () => {
  const { config } = useData();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<{role: 'user' | 'model', parts: {text: string}[]}[]>([
    { role: 'model', parts: [{ text: "Horizon AI prêt. Comment puis-je vous aider aujourd'hui ?" }] }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const aiReady = isAiOperational();

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
    
    setIsLoading(true);
    const aiResponse = await chatWithAI(userMsg, messages, config.aiModel);
    setMessages(prev => [...prev, { role: 'model', parts: [{ text: aiResponse || "Erreur de connexion Gemini." }] }]);
    setIsLoading(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-[60] no-print">
      {isOpen ? (
        <div className="bg-white w-[380px] h-[500px] shadow-xl border border-[#ededed] flex flex-col overflow-hidden rounded-lg animate-sb-entry">
          <div className="bg-[#1c1c1c] p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Terminal size={16} className="text-[#3ecf8e]" />
              <p className="text-white font-bold text-xs uppercase tracking-widest">Horizon AI</p>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-[#686868] hover:text-white transition-all">
              <X size={18} />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-white custom-scrollbar">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[90%] px-3 py-2 text-[13px] rounded ${
                  m.role === 'user' 
                    ? 'bg-[#3ecf8e] text-white' 
                    : 'bg-[#f8f9fa] text-[#1c1c1c] border border-[#ededed]'
                }`}>
                  {m.parts[0].text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-[#f8f9fa] px-3 py-2 border border-[#ededed] rounded flex items-center gap-1">
                  <div className="w-1 h-1 bg-[#3ecf8e] rounded-full animate-bounce" />
                  <div className="w-1 h-1 bg-[#3ecf8e] rounded-full animate-bounce [animation-delay:0.2s]" />
                  <div className="w-1 h-1 bg-[#3ecf8e] rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            )}
          </div>

          <div className="p-3 bg-white border-t border-[#ededed]">
            <div className="flex gap-2">
              <input
                type="text" value={message} onChange={(e) => setMessage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Message à l'IA..."
                className="flex-1 h-9"
              />
              <button 
                onClick={handleSend} disabled={!message.trim() || isLoading}
                className="w-9 h-9 bg-[#1c1c1c] text-[#3ecf8e] flex items-center justify-center rounded hover:bg-black disabled:opacity-30"
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button 
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 bg-[#1c1c1c] text-[#3ecf8e] flex items-center justify-center shadow-lg hover:scale-105 transition-transform rounded-lg"
        >
          <Zap size={24} fill="currentColor" />
        </button>
      )}
    </div>
  );
};

export default ChatWidget;
