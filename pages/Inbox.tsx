
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Search, Send, Phone, MessageSquare, Loader2, Smartphone, 
  Paperclip, MoreVertical, X, CheckCheck, User, Info, MoreHorizontal
} from 'lucide-react';
import { useNotifications, useUser, useData } from '../App';
import { ApiService } from '../services/apiService';
import { Conversation, Message } from '../types';

const Inbox: React.FC = () => {
  const { currentUser } = (() => { try { return useUser(); } catch { return { currentUser: null }; } })();
  const { isSyncing } = (() => { try { return useData(); } catch { return { isSyncing: false }; } })();
  const { addNotification } = (() => { try { return useNotifications(); } catch { return { addNotification: () => {} }; } })();

  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchInbox = async () => {
      try {
        const data = await ApiService.inbox.getConversations();
        setConversations(data);
        if (data.length > 0 && !selectedId) setSelectedId(data[0].id);
      } catch (e) {
        addNotification({ title: 'Erreur', message: 'Impossible de charger les messages.', type: 'error' });
      } finally { setIsLoading(false); }
    };
    fetchInbox();
  }, [addNotification, selectedId]);

  useEffect(() => {
    if (selectedId) {
      const fetchMessages = async () => {
        try {
          const data = await ApiService.inbox.getMessages(selectedId);
          setMessages(data);
          await ApiService.inbox.markAsRead(selectedId);
          setConversations(prev => prev.map(c => c.id === selectedId ? { ...c, unread_count: 0 } : c));
        } catch (e) { console.error(e); }
      };
      fetchMessages();
    }
  }, [selectedId]);

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages]);

  const filteredConversations = useMemo(() => {
    return conversations.filter(c => 
      c.customer_name.toLowerCase().includes(searchTerm.toLowerCase())
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
      addNotification({ title: 'Erreur', message: 'Échec de transmission.', type: 'error' });
    } finally { setIsSending(false); }
  };

  if (isLoading) return <div className="h-[80vh] flex items-center justify-center"><Loader2 className="animate-spin text-[#3ecf8e]" size={32} /></div>;

  return (
    <div className="h-[calc(100vh-140px)] flex bg-white rounded-md border border-[#e5e5e5] overflow-hidden shadow-sm animate-sb-entry">
      {/* Sidebar Inbox */}
      <div className="w-80 md:w-96 border-r border-[#e5e5e5] flex flex-col bg-[#fcfcfc]">
        <div className="p-3 space-y-4 bg-white border-b border-[#e5e5e5]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#3ecf8e]/10 rounded-xl flex items-center justify-center text-[#3ecf8e]">
              <MessageSquare size={18} />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
                Messages
              </h1>
              <p className="text-xs text-[#686868] font-semibold uppercase tracking-wider mt-0.5">Messages et communications clients.</p>
            </div>
          </div>
          <div className="relative">
             <Search className="absolute left-3 top-2.5 text-[#686868]" size={16} />
             <input 
              type="text" placeholder="Rechercher un client..." 
              value={searchTerm} onChange={e => setSearchTerm(e.target.value)} 
              className="w-full pl-10 h-9 text-[12px] font-semibold" 
             />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {filteredConversations.length > 0 ? (
            filteredConversations.map((chat) => (
              <div 
                key={chat.id} 
                onClick={() => setSelectedId(chat.id)} 
                className={`p-3 cursor-pointer transition-all border-b border-[#f5f5f5] flex gap-3 ${selectedId === chat.id ? 'bg-[#f0fdf4] border-l-4 border-l-[#3ecf8e]' : 'hover:bg-white'}`}
              >
                <div className="w-9 h-9 rounded-md bg-white border border-[#e5e5e5] text-[#3ecf8e] flex items-center justify-center font-semibold text-sm shrink-0 shadow-sm uppercase">
                  {chat.customer_name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <p className={`text-[12px] truncate ${chat.unread_count > 0 ? 'font-semibold text-[#1c1c1c]' : 'font-semibold text-[#4b5563]'}`}>{chat.customer_name}</p>
                    <span className="text-[11px] text-[#686868] font-semibold">
                      {new Date(chat.last_activity).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-semibold text-[#3ecf8e] uppercase tracking-tighter border border-[#3ecf8e]/30 px-1 rounded-sm leading-none">{chat.source}</span>
                    <p className={`text-[13px] truncate ${chat.unread_count > 0 ? 'text-[#1c1c1c] font-semibold' : 'text-[#686868]'}`}>
                      {chat.last_message || '—'}
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-10 text-center space-y-2 opacity-50">
              <Search size={32} className="mx-auto text-[#686868]" />
              <p className="text-[13px] font-semibold text-[#686868] uppercase tracking-widest">Aucune conversation</p>
            </div>
          )}
        </div>
      </div>

      {/* Message Area */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedConv ? (
          <>
            <div className="px-4 py-3 border-b border-[#e5e5e5] flex items-center justify-between shrink-0 bg-white">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-md bg-[#f8f9fa] border border-[#e5e5e5] flex items-center justify-center text-[#3ecf8e] font-semibold uppercase shadow-sm">
                  {selectedConv.customer_name[0]}
                </div>
                <div>
                   <p className="text-[13px] font-semibold text-[#1c1c1c]">{selectedConv.customer_name}</p>
                   <div className="flex items-center gap-2 mt-0.5">
                      <span className="w-1.5 h-1.5 bg-[#3ecf8e] rounded-full" />
                      <p className="text-[11px] text-[#3ecf8e] font-semibold uppercase tracking-widest">{selectedConv.source}</p>
                   </div>
                </div>
              </div>
              <div className="flex gap-1">
                <button className="p-2 hover:bg-[#f8f9fa] rounded-md text-[#686868] transition-colors"><Phone size={16} /></button>
                <button className="p-2 hover:bg-[#f8f9fa] rounded-md text-[#686868] transition-colors"><Info size={16} /></button>
                <button className="p-2 hover:bg-[#f8f9fa] rounded-md text-[#686868] transition-colors"><MoreHorizontal size={16} /></button>
              </div>
            </div>
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[#fcfcfc]">
              {messages.map((msg, i) => {
                const isAgent = msg.sender_type === 'agent';
                return (
                  <div key={i} className={`flex ${isAgent ? 'justify-end' : 'justify-start'}`}>
                    <div className="max-w-[75%] space-y-1.5">
                      <div className={`px-3 py-2 text-[12px] leading-relaxed shadow-sm ${
                        isAgent 
                        ? 'bg-[#1c1c1c] text-white rounded-xl rounded-tr-none' 
                        : 'bg-white border border-[#e5e5e5] text-[#1c1c1c] rounded-xl rounded-tl-none'
                      }`}>
                        {msg.content}
                      </div>
                      <div className={`flex items-center gap-2 ${isAgent ? 'justify-end' : ''}`}>
                         <p className="text-[11px] text-[#686868] font-semibold uppercase tracking-tighter">
                            {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                         </p>
                         {isAgent && <CheckCheck size={12} className="text-[#3ecf8e]" />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="p-3 bg-white border-t border-[#e5e5e5]">
              <div className="flex items-center gap-2">
                <button className="p-2.5 text-[#686868] hover:bg-[#f8f9fa] rounded-md transition-colors"><Paperclip size={16} /></button>
                <div className="flex-1 flex items-center bg-[#f8f9fa] rounded-md border border-[#e5e5e5] px-3 focus-within:border-[#3ecf8e] focus-within:ring-1 focus-within:ring-[#3ecf8e]/20 transition-all">
                  <input 
                    type="text" value={inputText} 
                    onChange={e => setInputText(e.target.value)} 
                    onKeyDown={e => e.key === 'Enter' && handleSend()} 
                    placeholder="Écrire une réponse..." 
                    className="flex-1 bg-transparent border-none text-[12px] font-semibold h-11 focus:ring-0" 
                  />
                  <button onClick={handleSend} disabled={!inputText.trim() || isSending} className="p-2 text-[#3ecf8e] disabled:opacity-30 transition-transform active:scale-90">
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-10 bg-[#fcfcfc]">
             <div className="w-20 h-20 bg-white border border-[#e5e5e5] rounded-xl flex items-center justify-center text-[#3ecf8e] mb-6 shadow-sm"><MessageSquare size={36} /></div>
             <h3 className="text-xl font-semibold text-[#1c1c1c]">Inbox Horizon</h3>
             <p className="text-sm text-[#686868] mt-2 max-w-[280px] font-semibold">Sélectionnez une conversation dans la liste de gauche pour répondre à vos clients.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Inbox;
