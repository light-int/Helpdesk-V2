
import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, Filter, Send, Phone, MoreHorizontal, 
  MessageSquare, Facebook, Mail, Menu
} from 'lucide-react';
import { useNotifications } from '../App';

interface Message { id: string; sender: 'client' | 'agent' | 'system'; text: string; time: string; status: 'sent' | 'delivered' | 'read'; }
interface Chat { id: string; name: string; lastMessage: string; time: string; source: 'WhatsApp' | 'Messenger' | 'Email'; unread: number; avatar: string; status: 'online' | 'offline'; history: Message[]; }

const MOCK_CHATS_INIT: Chat[] = [
  { id: '1', name: 'Aimé Ndong', lastMessage: 'Prix pour le split LG 12k BTU ?', time: '10:30', source: 'WhatsApp', unread: 2, status: 'online', avatar: 'https://i.pravatar.cc/150?u=aime', history: [
    { id: 'm1', sender: 'client', text: "Bonjour Royal Plaza. Quel est le prix du split LG ?", time: '10:30', status: 'read' },
    { id: 'm2', sender: 'agent', text: "Bonjour ! Il est à 450 000 FCFA.", time: '10:32', status: 'read' },
  ]},
  { id: '2', name: 'Marie Essono', lastMessage: 'Merci pour l\'info.', time: 'Hier', source: 'Messenger', unread: 0, status: 'online', avatar: 'https://i.pravatar.cc/150?u=marie', history: [
    { id: 'm1', sender: 'client', text: "Merci pour les photos !", time: 'Hier', status: 'read' },
  ]},
];

const Inbox: React.FC = () => {
  const [chats, setChats] = useState<Chat[]>(MOCK_CHATS_INIT);
  const [selectedChatId, setSelectedChatId] = useState<string>(MOCK_CHATS_INIT[0].id);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const selectedChat = chats.find(c => c.id === selectedChatId) || chats[0];

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [selectedChat.history, isTyping]);

  const handleSend = () => {
    if (!inputText.trim()) return;
    const newMessage: Message = { id: Date.now().toString(), sender: 'agent', text: inputText, time: '11:00', status: 'sent' };
    setChats(chats.map(c => c.id === selectedChatId ? { ...c, lastMessage: inputText, history: [...c.history, newMessage], unread: 0 } : c));
    setInputText('');
  };

  return (
    <div className="h-[calc(100vh-130px)] bg-white google-card flex overflow-hidden">
      <div className="w-80 md:w-96 border-r border-[#dadce0] flex flex-col">
        <div className="p-4 border-b border-[#dadce0] space-y-4">
          <div className="flex items-center gap-2 px-3 py-2 bg-[#f1f3f4] rounded-full border border-transparent focus-within:bg-white focus-within:border-[#dadce0] focus-within:shadow-sm">
             <Search className="text-[#5f6368]" size={18} />
             <input type="text" placeholder="Rechercher dans les messages" className="bg-transparent border-none p-0 h-6 text-sm focus:ring-0 w-full" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {chats.map((chat) => (
            <div 
              key={chat.id} 
              onClick={() => setSelectedChatId(chat.id)}
              className={`px-4 py-3 flex gap-3 cursor-pointer transition-colors ${selectedChatId === chat.id ? 'bg-[#e8f0fe] border-l-4 border-[#1a73e8]' : 'hover:bg-[#f1f3f4]'}`}
            >
              <img src={chat.avatar} className="w-10 h-10 rounded-full border border-[#dadce0]" alt="" />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center">
                  <p className={`text-sm ${chat.unread > 0 ? 'font-bold' : 'font-medium'} text-[#3c4043]`}>{chat.name}</p>
                  <span className="text-[10px] text-[#5f6368]">{chat.time}</span>
                </div>
                <p className={`text-xs text-[#5f6368] truncate ${chat.unread > 0 ? 'font-medium' : ''}`}>{chat.lastMessage}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="px-6 py-4 border-b border-[#dadce0] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={selectedChat.avatar} className="w-9 h-9 rounded-full border border-[#dadce0]" alt="" />
            <div>
               <p className="text-sm font-medium text-[#3c4043]">{selectedChat.name}</p>
               <p className="text-[10px] text-[#1a73e8] font-medium">{selectedChat.source} • En ligne</p>
            </div>
          </div>
          <div className="flex gap-1">
            <button className="p-2 text-[#5f6368] hover:bg-[#f1f3f4] rounded-full"><Phone size={18} /></button>
            <button className="p-2 text-[#5f6368] hover:bg-[#f1f3f4] rounded-full"><MoreHorizontal size={18} /></button>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6">
          {selectedChat.history.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender === 'agent' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%] px-4 py-3 text-sm rounded-2xl ${
                msg.sender === 'agent' 
                  ? 'bg-[#1a73e8] text-white rounded-tr-none' 
                  : 'bg-[#f1f3f4] text-[#3c4043] rounded-tl-none'
              }`}>
                {msg.text}
                <div className={`text-[10px] mt-1 opacity-70 ${msg.sender === 'agent' ? 'text-white' : 'text-[#5f6368]'}`}>{msg.time}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-[#dadce0]">
          <div className="flex items-center gap-2 bg-[#f1f3f4] p-2 rounded-2xl">
            <button className="p-2 text-[#5f6368] hover:text-[#1a73e8] rounded-full">
              <Menu size={18} />
            </button>
            <input 
              type="text" value={inputText} onChange={(e) => setInputText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Écrire un message..." className="flex-1 bg-transparent border-none text-sm focus:ring-0"
            />
            <button onClick={handleSend} disabled={!inputText.trim()} className="p-2 text-[#1a73e8] disabled:opacity-30">
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Inbox;
