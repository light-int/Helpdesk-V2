
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { NAVIGATION } from '../constants';
import { LogOut, LayoutGrid, Terminal } from 'lucide-react';
import { useUser } from '../App';

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { currentUser, logout } = useUser();

  if (!currentUser) return null;

  return (
    <div className="w-64 bg-white flex flex-col h-screen fixed left-0 top-0 z-50 no-print border-r border-[#ededed]">
      <div className="px-6 py-8 flex items-center gap-3">
          <div className="w-8 h-8 bg-[#1c1c1c] rounded flex items-center justify-center text-[#3ecf8e]">
            <Terminal size={18} />
          </div>
          <h1 className="text-sm font-bold text-[#1c1c1c] tracking-tight uppercase">
            Royal <span className="text-[#3ecf8e]">Plaza</span>
          </h1>
      </div>
      
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <nav className="px-3 space-y-0.5">
          {NAVIGATION.map((item) => {
            const isActive = location.pathname === item.path;
            const role = currentUser.role;
            
            // Accès restreints par rôles
            if (item.path === '/finances' && (role !== 'ADMIN' && role !== 'MANAGER')) return null;
            if (item.path === '/technicians' && (role !== 'ADMIN' && role !== 'MANAGER')) return null;
            
            // La page maintenance n'est accessible qu'au compte technicien
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
