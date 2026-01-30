
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Search, Filter, Send, Phone, MoreHorizontal, 
  MessageSquare, Facebook, Mail, Menu, Loader2,
  Check, CheckCheck, Smartphone, Reply, User
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
      if (data.length > 0 && !selectedId) {
        setSelectedId(data[0].id);
      }
    } catch (e) {
      addNotification({ title: 'Erreur Inbox', message: 'Impossible de charger les conversations.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMessages = async (id: string) => {
    try {
      const data = await ApiService.inbox.getMessages(id);
      setMessages(data);
      await ApiService.inbox.markAsRead(id);
      // Refresh count locally
      setConversations(prev => prev.map(c => c.id === id ? { ...c, unread_count: 0 } : c));
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => { fetchInbox(); }, []);

  useEffect(() => {
    if (selectedId) {
      fetchMessages(selectedId);
    }
  }, [selectedId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const filteredConversations = useMemo(() => {
    return conversations.filter(c => 
      c.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.last_message.toLowerCase().includes(searchTerm.toLowerCase())
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
        status: 'sent',
        metadata: {}
      });

      setMessages(prev => [...prev, newMessage]);
      // Update last message in list
      setConversations(prev => prev.map(c => c.id === selectedId ? { ...c, last_message: content, last_activity: new Date().toISOString() } : c));
    } catch (e) {
      addNotification({ title: 'Erreur d\'envoi', message: 'Le message n\'a pas pu être transmis au cloud.', type: 'error' });
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-[calc(100vh-130px)] flex items-center justify-center bg-white google-card">
        <Loader2 className="animate-spin text-[#1a73e8]" size={32} />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-130px)] bg-white google-card flex overflow-hidden animate-page-entry">
      {/* LISTE DES CONVERSATIONS */}
      <div className="w-80 md:w-96 border-r border-[#dadce0] flex flex-col bg-[#f8f9fa]">
        <div className="p-6 border-b border-[#dadce0] bg-white">
          <h2 className="text-xl font-normal text-[#3c4043] mb-4">Messages</h2>
          <div className="relative">
             <Search className="absolute left-3 top-3 text-[#5f6368]" size={18} />
             <input 
              type="text" 
              placeholder="Rechercher un client..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 h-11 bg-[#f1f3f4] border-transparent focus:bg-white focus:border-[#dadce0]" 
             />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {filteredConversations.length > 0 ? filteredConversations.map((chat) => (
            <div 
              key={chat.id} 
              onClick={() => setSelectedId(chat.id)}
              className={`px-6 py-4 flex gap-4 cursor-pointer transition-all border-b border-[#f1f3f4] relative ${selectedId === chat.id ? 'bg-white shadow-[inset_4px_0_0_0_#1a73e8]' : 'hover:bg-white/60'}`}
            >
              <div className="relative shrink-0">
                {chat.customer_avatar ? (
                  <img src={chat.customer_avatar} className="w-12 h-12 rounded-2xl object-cover border shadow-sm" alt="" />
                ) : (
                  <div className="w-12 h-12 rounded-2xl bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center font-black border border-[#d2e3fc]">
                    {chat.customer_name[0]}
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 p-0.5 bg-white rounded-lg shadow-sm border">
                  {chat.source === 'WhatsApp' && <Smartphone size={12} className="text-green-600" />}
                  {chat.source === 'Messenger' && <Facebook size={12} className="text-blue-600" />}
                  {chat.source === 'Email' && <Mail size={12} className="text-red-500" />}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1">
                  <p className={`text-sm truncate ${chat.unread_count > 0 ? 'font-black text-[#202124]' : 'font-bold text-[#5f6368]'}`}>{chat.customer_name}</p>
                  <span className="text-[10px] text-[#9aa0a6] font-medium">{new Date(chat.last_activity).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
                <p className={`text-xs truncate ${chat.unread_count > 0 ? 'font-bold text-[#1a73e8]' : 'text-[#80868b]'}`}>{chat.last_message}</p>
              </div>
              {chat.unread_count > 0 && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 bg-[#1a73e8] text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-lg shadow-blue-600/30">
                  {chat.unread_count}
                </div>
              )}
            </div>
          )) : (
            <div className="p-10 text-center text-gray-400">
               <MessageSquare className="mx-auto mb-4 opacity-20" size={48} />
               <p className="text-xs font-bold uppercase tracking-widest">Aucune conversation</p>
            </div>
          )}
        </div>
      </div>

      {/* ZONE DE CHAT RÉELLE */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedConv ? (
          <>
            <div className="px-8 py-4 border-b border-[#dadce0] flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#f8f9fa] flex items-center justify-center border text-[#5f6368]">
                  <User size={20} />
                </div>
                <div>
                   <p className="text-sm font-black text-[#202124]">{selectedConv.customer_name}</p>
                   <p className="text-[10px] text-[#1a73e8] font-black uppercase tracking-widest flex items-center gap-1">
                     {selectedConv.source} • Connecté
                   </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="p-2.5 text-[#5f6368] hover:bg-[#f1f3f4] rounded-full transition-all active:scale-90"><Phone size={18} /></button>
                <button className="p-2.5 text-[#5f6368] hover:bg-[#f1f3f4] rounded-full transition-all active:scale-90"><MoreHorizontal size={18} /></button>
              </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar bg-[#fdfdfd]">
              {messages.map((msg, i) => {
                const isAgent = msg.sender_type === 'agent';
                return (
                  <div key={msg.id || i} className={`flex ${isAgent ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
                    <div className={`max-w-[75%] space-y-1`}>
                      <div className={`px-5 py-3 text-sm rounded-3xl shadow-sm ${
                        isAgent 
                          ? 'bg-[#1a73e8] text-white rounded-tr-none' 
                          : 'bg-white border border-[#dadce0] text-[#3c4043] rounded-tl-none'
                      }`}>
                        {msg.content}
                      </div>
                      <div className={`flex items-center gap-2 text-[9px] font-black uppercase tracking-tighter ${isAgent ? 'justify-end text-[#9aa0a6]' : 'text-[#9aa0a6]'}`}>
                        {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        {isAgent && (
                          <span className="text-[#1a73e8]">
                            {msg.status === 'read' ? <CheckCheck size={12}/> : <Check size={12}/>}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {isSending && (
                <div className="flex justify-end opacity-50">
                  <div className="bg-[#1a73e8] text-white px-5 py-3 rounded-3xl rounded-tr-none text-sm animate-pulse">
                    Envoi en cours...
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-[#dadce0] bg-white">
              <div className="flex items-center gap-4 bg-[#f1f3f4] p-2 rounded-2xl focus-within:bg-white focus-within:ring-2 focus-within:ring-[#1a73e8]/20 transition-all border border-transparent focus-within:border-[#1a73e8]">
                <button className="p-2.5 text-[#5f6368] hover:text-[#1a73e8] hover:bg-white rounded-xl transition-all">
                  <Menu size={20} />
                </button>
                <input 
                  type="text" 
                  value={inputText} 
                  onChange={(e) => setInputText(e.target.value)} 
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder={`Répondre via ${selectedConv.source}...`} 
                  className="flex-1 bg-transparent border-none text-sm font-medium focus:ring-0 placeholder:text-gray-400 h-10"
                />
                <button 
                  onClick={handleSend} 
                  disabled={!inputText.trim() || isSending} 
                  className="p-3 bg-[#1a73e8] text-white rounded-xl disabled:opacity-30 shadow-lg shadow-blue-600/20 active:scale-95 transition-all"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-10 bg-[#f8f9fa]">
             <div className="w-24 h-24 bg-white rounded-[40px] shadow-xl border border-[#dadce0] flex items-center justify-center mb-8 text-[#1a73e8]">
                <MessageSquare size={48} />
             </div>
             <h3 className="text-xl font-black text-[#202124] uppercase tracking-tight">Poste de Communication</h3>
             <p className="text-sm text-[#5f6368] mt-2 max-w-xs leading-relaxed">
                Sélectionnez une conversation dans la liste de gauche pour traiter les demandes clients en attente.
             </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Inbox;
