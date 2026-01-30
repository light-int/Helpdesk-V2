
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Search, Filter, Send, Phone, MoreHorizontal, 
  MessageSquare, Facebook, Mail, Menu, Loader2,
  Check, CheckCheck, Smartphone, Reply, User,
  BellRing, ShieldCheck, Zap, X, Image as ImageIcon,
  Smile, Mic, Paperclip, MoreVertical, LayoutDashboard
} from 'lucide-react';
import { useNotifications, useUser } from '../App';
import { ApiService } from '../services/apiService';
import { Conversation, Message } from '../types';

const Inbox: React.FC = () => {
  const { currentUser } = useUser();
  const { addNotification } = useNotifications();
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchInbox = async () => {
    try {
      const data = await ApiService.inbox.getConversations();
      setConversations(data);
      if (data.length > 0 && !selectedId) setSelectedId(data[0].id);
    } catch (e) {
      addNotification({ title: 'Erreur Flux', message: 'Impossible de charger les messages.', type: 'error' });
    } finally { setIsLoading(false); }
  };

  const fetchMessages = async (id: string) => {
    try {
      const data = await ApiService.inbox.getMessages(id);
      setMessages(data);
      await ApiService.inbox.markAsRead(id);
      setConversations(prev => prev.map(c => c.id === id ? { ...c, unread_count: 0 } : c));
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchInbox(); }, []);
  useEffect(() => { if (selectedId) fetchMessages(selectedId); }, [selectedId]);
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages]);

  const filteredConversations = useMemo(() => {
    return conversations.filter(c => 
      c.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.last_message || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [conversations, searchTerm]);

  const selectedConv = conversations.find(c => c.id === selectedId);

  const handleSend = async () => {
    if (!inputText.trim() || !selectedId || !currentUser) return;
    setIsSending(true);
    const content = inputText;
    setInputText('');
    try {
      const newMessage = await ApiService.inbox.sendMessage({
        conversation_id: selectedId,
        sender_type: 'agent',
        sender_name: currentUser.name,
        content,
        status: 'sent'
      });
      setMessages(prev => [...prev, newMessage]);
      setConversations(prev => prev.map(c => c.id === selectedId ? { ...c, last_message: content, last_activity: new Date().toISOString() } : c));
    } catch (e) {
      addNotification({ title: 'Erreur', message: 'Le message n\'a pas pu être transmis.', type: 'error' });
    } finally { setIsSending(false); }
  };

  if (isLoading) return <div className="h-[calc(100vh-130px)] flex items-center justify-center bg-white border border-[#dadce0]"><Loader2 className="animate-spin text-[#1a73e8]" size={32} /></div>;

  return (
    <div className="h-[calc(100vh-130px)] bg-white border border-[#dadce0] flex overflow-hidden animate-page-entry shadow-2xl">
      <div className="w-80 md:w-96 border-r border-[#dadce0] flex flex-col bg-[#f8f9fa] shrink-0">
        <div className="p-8 border-b border-[#dadce0] bg-white space-y-6">
          <div className="flex items-center justify-between">
             <h2 className="text-xl font-light text-[#202124]">Messages</h2>
             <div className="flex items-center gap-2">
                <span className="text-[9px] font-black text-green-600 uppercase bg-green-50 px-2 py-0.5 border border-green-100">Live</span>
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
             </div>
          </div>
          <div className="relative group">
             <Search className="absolute left-4 top-3.5 text-[#9aa0a6] transition-colors" size={20} />
             <input type="text" placeholder="Rechercher..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-12 h-12 bg-[#f1f3f4] border-none text-sm font-bold focus:bg-white focus:ring-2 focus:ring-blue-100" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {filteredConversations.map((chat) => (
            <div key={chat.id} onClick={() => setSelectedId(chat.id)} className={`px-8 py-5 flex gap-4 cursor-pointer transition-all border-b border-[#f1f3f4] ${selectedId === chat.id ? 'bg-white shadow-[inset_4px_0_0_0_#1a73e8]' : 'hover:bg-white/60'}`}>
              <div className="w-14 h-14 bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center font-black border border-[#d2e3fc] shrink-0">{chat.customer_name[0]}</div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1">
                  <p className={`text-sm truncate ${chat.unread_count > 0 ? 'font-black text-[#202124]' : 'font-bold text-[#5f6368]'}`}>{chat.customer_name}</p>
                  <span className="text-[10px] text-[#9aa0a6] font-bold uppercase">{new Date(chat.last_activity).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
                <p className={`text-xs truncate ${chat.unread_count > 0 ? 'font-black text-[#1a73e8]' : 'text-[#80868b] font-medium'}`}>{chat.last_message || 'Fichier'}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-white">
        {selectedConv ? (
          <>
            <div className="px-10 py-5 border-b border-[#dadce0] flex items-center justify-between bg-white shrink-0 z-10 shadow-sm">
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 bg-[#f8f9fa] flex items-center justify-center border border-[#dadce0] text-[#5f6368]">{selectedConv.customer_name[0]}</div>
                <div>
                   <p className="text-base font-black text-[#202124] tracking-tight">{selectedConv.customer_name}</p>
                   <p className="text-[9px] text-[#1a73e8] font-black uppercase tracking-widest">{selectedConv.source}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="p-3 text-[#5f6368] hover:bg-[#f1f3f4] transition-all"><Phone size={20} /></button>
                <button className="p-3 text-[#5f6368] hover:bg-[#f1f3f4] transition-all"><MoreVertical size={20} /></button>
              </div>
            </div>
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar bg-[#fdfdfd]">
              {messages.map((msg, i) => {
                const isAgent = msg.sender_type === 'agent';
                return (
                  <div key={i} className={`flex ${isAgent ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                    <div className={`max-w-[80%] space-y-2`}>
                      <div className={`px-6 py-4 text-sm shadow-sm ${isAgent ? 'bg-[#1a73e8] text-white border-none' : 'bg-white border border-[#dadce0] text-[#3c4043]'}`}>
                        {msg.content}
                      </div>
                      <p className={`text-[9px] font-black uppercase tracking-widest text-[#9aa0a6] ${isAgent ? 'text-right' : 'text-left'}`}>
                        {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="p-8 border-t border-[#dadce0] bg-white">
              <div className="flex items-center gap-4 bg-[#f1f3f4] p-2 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#1a73e8]/20 transition-all border border-transparent shadow-inner">
                <button className="p-3 text-[#5f6368] hover:text-[#1a73e8]"><Paperclip size={20} /></button>
                <input type="text" value={inputText} onChange={e => setInputText(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} placeholder={`Répondre via ${selectedConv.source}...`} className="flex-1 bg-transparent border-none text-sm font-bold focus:ring-0 h-12" />
                <button onClick={handleSend} disabled={!inputText.trim() || isSending} className="p-4 bg-[#1a73e8] text-white disabled:opacity-30 shadow-xl shadow-blue-600/20 active:scale-95 transition-all"><Send size={22} /></button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-20 bg-[#f8f9fa]">
             <MessageSquare size={48} className="text-[#1a73e8] mb-10" />
             <h3 className="text-2xl font-black text-[#202124] uppercase tracking-tighter">Horizon Omnichannel Inbox</h3>
             <p className="text-sm text-[#5f6368] mt-4 max-w-sm leading-relaxed font-medium">Sélectionnez une conversation pour engager l'assistance.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Inbox;
