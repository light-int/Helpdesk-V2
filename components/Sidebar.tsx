
import React, { useState, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { NAVIGATION } from '../constants';
import { LogOut, Menu, Languages } from 'lucide-react';
import { useUser, useNotifications, useData } from '../App';

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { currentUser, logout } = useUser();
  const { addNotification } = useNotifications();
  const { tickets, parts } = useData();
  const [lang, setLang] = useState<'FR' | 'EN'>('FR');
  const [isTranslating, setIsTranslating] = useState(false);

  if (!currentUser) return null;

  const badges = useMemo(() => ({
    '/tickets': tickets.filter(t => t.priority === 'Urgent' || t.status === 'Nouveau').length,
    '/parts': parts.filter(p => p.currentStock <= p.minStock).length,
  }), [tickets, parts]);

  const filteredNavigation = NAVIGATION.filter(item => {
    const role = currentUser.role;
    if (item.path === '/finances' || item.path === '/technicians' || item.path === '/settings') return role === 'ADMIN' || role === 'MANAGER';
    if (item.path === '/inbox' || item.path === '/customers' || item.path === '/products') return role !== 'TECHNICIAN';
    return true;
  });

  return (
    <div className="w-64 bg-white flex flex-col h-screen fixed left-0 top-0 z-50 border-r border-[#dadce0] no-print">
      <div className="px-6 py-6 flex items-center justify-between border-b border-[#dadce0]">
        <div className="flex items-center gap-3">
          <div className="text-[#1a73e8]"><Menu size={20} /></div>
          <h1 className="text-lg font-light text-[#3c4043]">
            Royal <span className="font-bold text-[#1a73e8]">Plaza</span>
          </h1>
        </div>
      </div>
      
      <nav className="flex-1 mt-4 px-3 space-y-1 overflow-y-auto custom-scrollbar">
        {filteredNavigation.map((item) => {
          const isActive = location.pathname === item.path;
          const badgeCount = (badges as any)[item.path] || 0;

          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex items-center justify-between px-4 py-2.5 transition-all text-[13px] font-medium border-l-4 ${
                isActive 
                  ? 'bg-[#f8faff] text-[#1a73e8] border-[#1a73e8]' 
                  : 'text-[#5f6368] border-transparent hover:bg-[#f8f9fa]'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={isActive ? 'text-[#1a73e8]' : 'text-[#5f6368]'}>
                  {React.cloneElement(item.icon as React.ReactElement<any>, { size: 18 })}
                </span>
                <span>{item.name}</span>
              </div>
              
              {badgeCount > 0 && (
                <span className={`px-1.5 py-0.5 min-w-[1.25rem] h-5 flex items-center justify-center text-[9px] font-black text-white ${
                  item.path === '/tickets' ? 'bg-[#d93025]' : 'bg-[#1a73e8]'
                }`}>
                  {badgeCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-[#dadce0] bg-[#f8f9fa]">
        <div className="flex items-center gap-3 p-2">
           <img src={currentUser.avatar} className="w-8 h-8 border border-[#dadce0] p-0.5 bg-white" alt="" />
           <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold text-[#3c4043] truncate">{currentUser.name}</p>
              <p className="text-[9px] text-[#1a73e8] truncate font-black uppercase tracking-widest">{currentUser.role}</p>
           </div>
           <button onClick={logout} className="p-1.5 text-[#5f6368] hover:text-[#d93025] transition-colors" title="Déconnexion">
              <LogOut size={16} />
           </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
