
import React, { useState, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { NAVIGATION } from '../constants';
import { LogOut, Terminal, Bell, X, Check, HelpCircle, Menu } from 'lucide-react';
import { useUser, useNotifications, useData } from '../App';

interface NavBadge {
  count: number;
  color: string;
  pulse?: boolean;
}

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { currentUser, logout } = useUser();
  const { persistentNotifications, markNotificationAsRead } = useNotifications();
  const { tickets, parts, warranties, cashRegisterSessions } = useData();
  const [showNotifications, setShowNotifications] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (!currentUser) return null;

  const unreadCount = persistentNotifications.filter((n: any) => !n.isRead).length;

  // Calculer les badges pour chaque section
  const getNavBadges = useMemo(() => {
    const badges: Record<string, NavBadge> = {};

    // Tickets urgents
    const urgentTickets = tickets?.filter((t: any) => t.priority === 'Urgent' && t.status !== 'Fermé').length || 0;
    if (urgentTickets > 0) {
      badges['/tickets'] = { count: urgentTickets, color: '#ef4444', pulse: true };
    }

    // Tickets assignés au technicien connecté (non clôturés)
    if (currentUser?.role === 'TECHNICIAN') {
      const assignedTickets = tickets?.filter((t: any) =>
        t.assignedTechnicianId === currentUser.id &&
        t.status !== 'Fermé' &&
        t.status !== 'Payé - Clôturé'
      ).length || 0;
      if (assignedTickets > 0) {
        badges['/tickets'] = { count: assignedTickets, color: '#3ecf8e', pulse: true };
      }
    }

    // Stock critique
    const criticalParts = parts?.filter((p: any) => p.currentStock <= p.minStock && p.currentStock > 0).length || 0;
    if (criticalParts > 0) {
      badges['/parts'] = { count: criticalParts, color: '#f59e0b', pulse: true };
    }

    // Garanties expirantes (dans 30 jours)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const expiringWarranties = warranties?.filter((w: any) => {
      const expiry = new Date(w.expiryDate);
      return expiry <= thirtyDaysFromNow && expiry > new Date();
    }).length || 0;
    if (expiringWarranties > 0) {
      badges['/warranties'] = { count: expiringWarranties, color: '#8b5cf6' };
    }

    // Sessions de caisse ouvertes
    if (currentUser && ['AGENT', 'MANAGER', 'ADMIN'].includes(currentUser.role)) {
      const openSessions = cashRegisterSessions?.filter((s: any) => {
        if (currentUser.role === 'AGENT') {
          return s.status === 'Ouverte' && s.openedBy === currentUser.id;
        }
        return s.status === 'Ouverte';
      }).length || 0;
      if (openSessions > 0) {
        badges['/caisse'] = { count: openSessions, color: '#3ecf8e', pulse: true };
      }
    }

    return badges;
  }, [tickets, parts, warranties, cashRegisterSessions, currentUser]);

  return (
    <>
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-[#e5e5e5] z-50 flex items-center justify-between px-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-[#1c1c1c] rounded flex items-center justify-center text-[#3ecf8e]">
            <Terminal size={15} />
          </div>
          <h1 className="text-[12px] font-semibold text-[#1c1c1c] tracking-tight uppercase">
            Royal <span className="text-[#3ecf8e]">Plaza</span>
          </h1>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-1.5 rounded-lg text-[#686868] hover:bg-[#f8f9fa] hover:text-[#1c1c1c] transition-colors"
        >
          <Menu size={20} />
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Hidden on mobile by default, shown when menu open */}
      <div className={`w-56 bg-white flex flex-col h-screen fixed left-0 top-0 z-50 no-print border-r border-[#e5e5e5] transition-transform duration-300 md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="px-4 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[#1c1c1c] rounded flex items-center justify-center text-[#3ecf8e]">
              <Terminal size={15} />
            </div>
            <h1 className="text-[12px] font-semibold text-[#1c1c1c] tracking-tight uppercase">
              Royal <span className="text-[#3ecf8e]">Plaza</span>
            </h1>
          </div>

          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="md:hidden p-1.5 rounded-lg text-[#686868] hover:bg-[#f8f9fa] hover:text-[#1c1c1c] transition-colors"
          >
            <X size={18} />
          </button>

          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className={`p-1.5 rounded-lg transition-all duration-200 ${showNotifications ? 'bg-[#f0fdf4] text-[#3ecf8e]' : 'text-[#686868] hover:bg-[#f8f9fa] hover:text-[#1c1c1c]'}`}
            >
              <Bell size={16} className={`transition-transform duration-200 ${showNotifications ? 'rotate-12' : ''}`} />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 min-w-[16px] h-[16px] bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border border-white animate-pulse px-1">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute left-8 top-0 w-72 bg-white shadow-lg rounded-xl border border-[#e5e5e5] animate-sb-entry overflow-hidden flex flex-col max-h-[450px]">
                <div className="p-3 bg-[#fcfcfc] border-b border-[#e5e5e5] flex items-center justify-between">
                  <h3 className="text-[10px] font-semibold text-[#1c1c1c] uppercase tracking-widest flex items-center gap-2">
                    <Bell size={12} className="text-[#3ecf8e]" />
                    Alertes
                  </h3>
                  <button
                    onClick={() => setShowNotifications(false)}
                    className="p-1 text-[#686868] hover:text-[#1c1c1c] hover:bg-[#f8f9fa] rounded-md transition-all"
                  >
                    <X size={12} />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                  {persistentNotifications.length > 0 ? (
                    persistentNotifications.map((n: any, index: number) => (
                      <div
                        key={n.id}
                        className={`p-3 border-b border-[#f5f5f5] last:border-none group transition-all duration-200 hover:bg-[#f8f9fa] ${n.isRead ? 'opacity-60' : 'bg-[#f0fdf4]/30'}`}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <p className="text-[11px] font-semibold text-[#1c1c1c] uppercase flex items-center gap-1.5">
                            <span
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: n.type === 'urgent' ? '#ef4444' : n.type === 'warning' ? '#f59e0b' : '#3ecf8e' }}
                            />
                            {n.type}
                          </p>
                          <div className="flex gap-2">
                            {!n.isRead && (
                              <button
                                onClick={() => markNotificationAsRead(n.id)}
                                className="p-1 text-[#3ecf8e] hover:bg-[#3ecf8e]/10 rounded-md transition-all"
                              >
                                <Check size={11} />
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-[12px] text-[#686868] font-semibold leading-relaxed">{n.message}</p>
                        <p className="text-[9px] text-[#9ca3af] mt-1 font-semibold">{new Date(n.createdAt).toLocaleString()}</p>
                      </div>
                    ))
                  ) : (
                    <div className="py-10 text-center opacity-30">
                      <Bell size={28} className="mx-auto mb-2" />
                      <p className="text-[10px] font-semibold uppercase tracking-widest">Aucune alerte</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <nav className="px-2 space-y-3 py-3">
            {[
              { label: 'Opérations', items: ['/', '/tickets', '/logistics', '/historique'] },
                { label: 'Inventaire', items: ['/parts', '/products', '/warranties'] },
                { label: 'Clients & Finances', items: ['/customers', '/workshop-finances', '/finances', '/caisse'] },
                { label: 'Admin', items: ['/technicians', '/settings', '/knowledge', '/documentation'] }
            ].map(group => {
              const groupItems = NAVIGATION.filter(item => group.items.includes(item.path));

              const visibleItems = groupItems.filter(item => {
                const role = currentUser.role;
                if (role === 'ADMIN') return true;

                if (item.path === '/settings' && role !== 'MANAGER') return false;
                if (item.path === '/finances' && role !== 'MANAGER') return false;
                if (item.path === '/workshop-finances' && !['MANAGER', 'AGENT'].includes(role)) return false;
                if (item.path === '/technicians' && !['AGENT', 'MANAGER'].includes(role)) return false;
                if (item.path === '/logistics' && !['AGENT', 'MANAGER'].includes(role)) return false;

                if (role === 'TECHNICIAN') {
                  if (['/customers', '/products', '/inbox', '/documentation', '/finances', '/workshop-finances', '/technicians', '/caisse'].includes(item.path)) return false;
                }

                if (item.path === '/historique' && role !== 'TECHNICIAN') return false;

                if (role === 'AGENT') {
                  if (['/technicians', '/workshop-finances', '/finances', '/tickets', '/parts', '/customers', '/'].includes(item.path)) return true;
                }

                return true;
              });

              if (visibleItems.length === 0) return null;

              return (
                <div key={group.label} className="space-y-0.5">
                  <p className="px-2 text-[9px] font-semibold text-[#9ca3af] uppercase tracking-widest mb-1 mt-1">{group.label}</p>
                  {visibleItems.map(item => {
                    const isActive = location.pathname === item.path;
                    const badge = getNavBadges[item.path];
                    const isHovered = hoveredItem === item.path;

                    return (
                      <Link
                        key={item.name}
                        to={item.path}
                        onMouseEnter={() => setHoveredItem(item.path)}
                        onMouseLeave={() => setHoveredItem(null)}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center gap-2 px-2 py-1.5 rounded-md transition-all duration-200 text-[13px] font-semibold group relative overflow-hidden ${isActive
                          ? 'bg-[#f0fdf4] text-[#1c1c1c]'
                          : 'text-[#686868] hover:bg-[#f8f9fa] hover:text-[#1c1c1c]'
                          } ${isHovered && !isActive ? 'translate-x-0.5' : ''}`}
                      >
                        {isActive && (
                          <div className="absolute left-0 top-1 bottom-1 w-[2px] bg-[#3ecf8e] rounded-r-full" />
                        )}

                        <span className={`transition-all duration-200 ${isActive ? 'text-[#3ecf8e]' : 'text-[#686868] group-hover:text-[#1c1c1c]'}`}>
                          {React.cloneElement(item.icon as React.ReactElement<any>, {
                            size: 15,
                            strokeWidth: 1.5
                          })}
                        </span>

                        <span className="flex-1">{item.name}</span>

                        {badge && (
                          <span
                            className={`px-1 py-0.5 rounded-full text-[9px] font-semibold text-white min-w-[16px] text-center ${badge.pulse ? 'animate-pulse' : ''}`}
                            style={{ backgroundColor: badge.color }}
                          >
                            {badge.count > 9 ? '9+' : badge.count}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              );
            })}
          </nav>
        </div>

        <div className="p-3 border-t border-[#e5e5e5]">
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[#f8f9fa] transition-all duration-200 group cursor-pointer">
            <div className="relative">
              <img
                src={currentUser.avatar}
                className="w-8 h-8 rounded-full border border-[#e5e5e5] group-hover:border-[#3ecf8e]/30 transition-all duration-200"
                alt=""
              />
              <div className="absolute bottom-0 right-0 w-2 h-2 bg-[#3ecf8e] rounded-full border-[2px] border-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-[#1c1c1c] truncate group-hover:text-[#3ecf8e] transition-colors">{currentUser.name}</p>
              <p className="text-[9px] text-[#686868] font-semibold uppercase tracking-tight">{currentUser.role}</p>
            </div>
            <button
              onClick={logout}
              className="p-1.5 text-[#686868] hover:text-red-500 hover:bg-red-50 rounded-md transition-all duration-200"
              title="Déconnexion"
            >
              <LogOut size={12} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
