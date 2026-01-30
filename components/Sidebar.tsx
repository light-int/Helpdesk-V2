
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

  if (!currentUser) return null;

  const badges = useMemo(() => ({
    '/tickets': tickets.filter(t => t.priority === 'Urgent' && t.status !== 'Fermé').length,
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
      <div className="px-8 py-8 flex items-center gap-4 border-b border-[#dadce0] bg-[#f8f9fa]">
          <div className="w-10 h-10 bg-[#1a73e8] text-white flex items-center justify-center shadow-lg shadow-blue-600/10">
            <Menu size={20} />
          </div>
          <h1 className="text-xl font-light text-[#202124] tracking-tight">
            Royal <span className="font-black text-[#1a73e8]">Plaza</span>
          </h1>
      </div>
      
      <nav className="flex-1 mt-6 px-4 space-y-1.5 overflow-y-auto custom-scrollbar">
        {filteredNavigation.map((item) => {
          const isActive = location.pathname === item.path;
          const badgeCount = (badges as any)[item.path] || 0;

          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex items-center justify-between px-5 py-3 transition-all text-xs font-black uppercase tracking-widest border-l-4 ${
                isActive 
                  ? 'bg-[#f8faff] text-[#1a73e8] border-[#1a73e8] shadow-sm' 
                  : 'text-[#5f6368] border-transparent hover:bg-[#f8f9fa] hover:text-[#202124]'
              }`}
            >
              <div className="flex items-center gap-4">
                <span className={isActive ? 'text-[#1a73e8]' : 'text-[#9aa0a6] transition-colors group-hover:text-[#5f6368]'}>
                  {React.cloneElement(item.icon as React.ReactElement<any>, { size: 18 })}
                </span>
                <span>{item.name}</span>
              </div>
              
              {badgeCount > 0 && (
                <span className={`px-2 py-0.5 min-w-[1.5rem] h-5 flex items-center justify-center text-[9px] font-black text-white shadow-sm ${
                  item.path === '/tickets' ? 'bg-[#d93025]' : 'bg-[#1a73e8]'
                }`}>
                  {badgeCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-6 border-t border-[#dadce0] bg-[#f8f9fa]">
        <div className="flex items-center gap-4 p-3 bg-white border border-[#dadce0] shadow-sm">
           <img src={currentUser.avatar} className="w-10 h-10 border border-[#dadce0] p-0.5 bg-white" alt="" />
           <div className="flex-1 min-w-0">
              <p className="text-[11px] font-black text-[#202124] truncate uppercase tracking-tighter">{currentUser.name}</p>
              <p className="text-[9px] text-[#1a73e8] truncate font-black uppercase tracking-widest mt-0.5">{currentUser.role}</p>
           </div>
           <button onClick={logout} className="p-2 text-gray-300 hover:text-[#d93025] transition-colors">
              <LogOut size={18} />
           </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
