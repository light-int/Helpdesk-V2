
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { NAVIGATION } from '../constants';
import { LogOut, Terminal, Bell, X, Check } from 'lucide-react';
import { useUser, useNotifications } from '../App';

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { currentUser, logout } = useUser();
  const { notifications, removeNotification, markNotificationAsRead } = useNotifications();
  const [showNotifications, setShowNotifications] = useState(false);

  if (!currentUser) return null;

  const unreadCount = notifications.filter((n: any) => !n.read).length;

  return (
    <div className="w-64 bg-white flex flex-col h-screen fixed left-0 top-0 z-50 no-print border-r border-[#ededed]">
      <div className="px-6 py-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#1c1c1c] rounded flex items-center justify-center text-[#3ecf8e]">
              <Terminal size={18} />
            </div>
            <h1 className="text-sm font-bold text-[#1c1c1c] tracking-tight uppercase">
              Royal <span className="text-[#3ecf8e]">Plaza</span>
            </h1>
          </div>
          
          {/* Notification Bell */}
          <div className="relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className={`p-2 rounded-lg transition-all ${showNotifications ? 'bg-[#f0fdf4] text-[#3ecf8e]' : 'text-[#686868] hover:bg-[#f8f9fa]'}`}
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Popover */}
            {showNotifications && (
              <div className="absolute left-10 top-0 w-80 bg-white shadow-2xl rounded-2xl border border-[#ededed] animate-sb-entry overflow-hidden flex flex-col max-h-[500px]">
                <div className="p-4 bg-[#fcfcfc] border-b border-[#ededed] flex items-center justify-between">
                   <h3 className="text-xs font-black text-[#1c1c1c] uppercase tracking-widest">Centre d'Alertes</h3>
                   <button onClick={() => setShowNotifications(false)} className="text-[#686868] hover:text-[#1c1c1c]"><X size={14}/></button>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                  {notifications.length > 0 ? (
                    notifications.map((n: any) => (
                      <div key={n.id} className={`p-4 border-b border-[#f5f5f5] last:border-none group transition-colors ${n.read ? 'opacity-60' : 'bg-[#f0fdf4]/30'}`}>
                         <div className="flex justify-between items-start mb-1">
                            <p className="text-[11px] font-black text-[#1c1c1c] uppercase">{n.title}</p>
                            <div className="flex gap-2">
                               {!n.read && <button onClick={() => markNotificationAsRead(n.id)} className="text-[#3ecf8e] hover:scale-110"><Check size={12}/></button>}
                               <button onClick={() => removeNotification(n.id)} className="text-[#9ca3af] hover:text-red-500 opacity-0 group-hover:opacity-100"><X size={12}/></button>
                            </div>
                         </div>
                         <p className="text-[12px] text-[#686868] font-medium leading-relaxed">{n.message}</p>
                         <p className="text-[9px] text-[#9ca3af] mt-2 font-bold">{new Date(n.timestamp).toLocaleTimeString()}</p>
                      </div>
                    ))
                  ) : (
                    <div className="py-12 text-center opacity-30">
                       < Bell size={32} className="mx-auto mb-2" />
                       <p className="text-[10px] font-black uppercase tracking-widest">Aucune alerte</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
      </div>
      
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <nav className="px-3 space-y-0.5">
          {NAVIGATION.map((item) => {
            const isActive = location.pathname === item.path;
            const role = currentUser.role;
            
            if (['/finances', '/technicians', '/settings'].includes(item.path) && 
                (role !== 'ADMIN' && role !== 'MANAGER')) return null;
            
            if (role === 'TECHNICIAN' && 
                ['/customers', '/products', '/inbox', '/documentation'].includes(item.path)) return null;
            
            if (item.path === '/maintenance' && role !== 'TECHNICIAN') return null;

            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-150 text-[13px] font-medium group relative ${
                  isActive 
                    ? 'bg-[#fcfcfc] text-[#1c1c1c]' 
                    : 'text-[#686868] hover:bg-[#f8f9fa] hover:text-[#1c1c1c]'
                }`}
              >
                {isActive && (
                  <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-[#3ecf8e]" />
                )}
                <span className={`${isActive ? 'text-[#3ecf8e]' : 'text-[#686868] group-hover:text-[#1c1c1c]'}`}>
                  {React.cloneElement(item.icon as React.ReactElement<any>, { 
                    size: 16,
                    strokeWidth: 2
                  })}
                </span>
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-[#ededed]">
        <div className="flex items-center gap-3 px-2">
           <img src={currentUser.avatar} className="w-8 h-8 rounded-full border border-[#ededed]" alt="" />
           <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold text-[#1c1c1c] truncate">{currentUser.name}</p>
              <p className="text-[9px] text-[#686868] font-bold uppercase tracking-tight">{currentUser.role}</p>
           </div>
           <button onClick={logout} className="p-1.5 text-[#686868] hover:text-[#1c1c1c] transition-colors">
              <LogOut size={14} />
           </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
