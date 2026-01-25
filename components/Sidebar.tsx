
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { NAVIGATION } from '../constants';
import { LogOut, Menu, Languages, Globe } from 'lucide-react';
import { useUser, useNotifications } from '../App';
import { UserRole } from '../types';

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { currentUser, logout } = useUser();
  const { addNotification } = useNotifications();
  const [lang, setLang] = useState<'FR' | 'EN'>('FR');
  const [isTranslating, setIsTranslating] = useState(false);

  if (!currentUser) return null;

  // Logique de filtrage RBAC pour la navigation
  const filteredNavigation = NAVIGATION.filter(item => {
    const role = currentUser.role;
    
    // Restrictions par page
    if (item.path === '/finances' || item.path === '/technicians') {
      return role === 'ADMIN' || role === 'MANAGER';
    }
    if (item.path === '/settings') {
      return role === 'ADMIN' || role === 'MANAGER';
    }
    if (item.path === '/inbox' || item.path === '/customers' || item.path === '/products') {
      return role !== 'TECHNICIAN';
    }
    if (item.path === '/parts' || item.path === '/maintenance') {
      return role === 'ADMIN' || role === 'TECHNICIAN' || role === 'MANAGER';
    }
    
    return true; // Les autres pages (Dashboard, Profile, Doc) sont communes
  });

  const handleTranslate = async () => {
    setIsTranslating(true);
    const nextLang = lang === 'FR' ? 'EN' : 'FR';
    addNotification({ 
      title: 'Traduction IA', 
      message: `Passage de l'interface en ${nextLang === 'EN' ? 'Anglais' : 'Français'} via Gemini...`, 
      type: 'info' 
    });
    await new Promise(r => setTimeout(r, 800));
    setLang(nextLang);
    setIsTranslating(false);
  };

  return (
    <div className="w-64 bg-white flex flex-col h-screen fixed left-0 top-0 z-50 border-r border-[#dadce0] no-print">
      {/* BRANDING */}
      <div className="px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-[#5f6368]">
            <Menu size={24} />
          </div>
          <h1 className="text-xl font-normal text-[#5f6368]">
            Royal <span className="font-medium">Plaza</span>
          </h1>
        </div>
        <button 
          onClick={handleTranslate} 
          disabled={isTranslating}
          className={`p-1.5 rounded-full hover:bg-[#f1f3f4] transition-colors ${isTranslating ? 'animate-spin' : ''}`}
          title="Traduire l'interface"
        >
          <Languages size={18} className="text-[#5f6368]" />
        </button>
      </div>
      
      {/* NAVIGATION FILTRÉE */}
      <nav className="flex-1 mt-2 px-3 space-y-0.5 overflow-y-auto custom-scrollbar">
        {filteredNavigation.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex items-center gap-4 px-4 py-2.5 rounded-r-full transition-colors text-sm font-medium ${
                isActive 
                  ? 'bg-[#e8f0fe] text-[#1a73e8]' 
                  : 'text-[#3c4043] hover:bg-[#f1f3f4]'
              }`}
            >
              <span className={`${isActive ? 'text-[#1a73e8]' : 'text-[#5f6368]'}`}>
                {React.cloneElement(item.icon as React.ReactElement<any>, { size: 20 })}
              </span>
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* USER FOOTER */}
      <div className="p-4 border-t border-[#dadce0]">
        <div className="flex items-center gap-3 p-2">
           <img src={currentUser.avatar} className="w-8 h-8 rounded-full border shadow-sm" alt="" />
           <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-[#3c4043] truncate">{currentUser.name}</p>
              <p className="text-[9px] text-[#1a73e8] truncate font-black uppercase tracking-widest">{currentUser.role}</p>
           </div>
           <button onClick={logout} className="p-1.5 text-[#5f6368] hover:bg-[#f1f3f4] rounded-full transition-colors">
              <LogOut size={16} />
           </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
