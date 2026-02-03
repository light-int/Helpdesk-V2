
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Users, Star, Activity, UserPlus, RefreshCw, Edit3, Trash2, 
  ShieldCheck, Zap, MoreVertical, Mail, Phone, MapPin, 
  Save, BadgeCheck, Trophy, ChevronRight
} from 'lucide-react';
import { useNotifications, useData, useUser } from '../App';
import { Technician, TicketCategory, Showroom, Ticket } from '../types';
import Modal from '../components/Modal';
import Drawer from '../components/Drawer';

const Technicians: React.FC = () => {
  const { technicians, isLoading, refreshAll, isSyncing, saveTechnician, showrooms, tickets } = useData();
  const { currentUser } = useUser();
  const { addNotification } = useNotifications();
  
  const [selectedTech, setSelectedTech] = useState<Technician | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTech, setEditingTech] = useState<Technician | null>(null);

  const canManageRH = currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER';

  useEffect(() => { refreshAll(); }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Disponible': return 'bg-[#137333]';
      case 'En intervention': return 'bg-[#b06000]';
      default: return 'bg-[#747775]';
    }
  };

  const handleSaveTech = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const techData: Technician = {
      id: editingTech?.id || `TECH-${Date.now()}`,
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      specialty: editingTech?.specialty || [],
      showroom: formData.get('showroom') as string,
      status: (formData.get('status') as any) || 'Disponible',
      avatar: editingTech?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.get('name') as string)}&background=0b57d0&color=ffffff`,
      activeTickets: editingTech?.activeTickets || 0,
      completedTickets: editingTech?.completedTickets || 0,
      avgResolutionTime: editingTech?.avgResolutionTime || '0h',
      rating: editingTech?.rating || 5.0,
      nps: editingTech?.nps || 100,
      firstFixRate: editingTech?.firstFixRate || 100,
      performanceHistory: editingTech?.performanceHistory || []
    };
    await saveTechnician(techData);
    setIsModalOpen(false);
    addNotification({ title: 'Équipe', message: 'Expert synchronisé.', type: 'success' });
  };

  if (isLoading) return <div className="h-[80vh] flex items-center justify-center"><RefreshCw className="animate-spin text-[#0b57d0]" size={32} /></div>;

  return (
    <div className="space-y-8 animate-m3-entry pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-normal text-[#1f1f1f]">Équipe Technique</h1>
          <p className="text-sm text-[#747775] mt-1 font-medium">Experts certifiés Royal Plaza</p>
        </div>
        <div className="flex gap-2">
          <button onClick={refreshAll} className="p-3 bg-[#f0f4f9] hover:bg-[#e1e3e1] rounded-full transition-colors">
             <RefreshCw size={20} className={isSyncing ? 'animate-spin' : ''} />
          </button>
          {canManageRH && (
            <button onClick={() => { setEditingTech(null); setIsModalOpen(true); }} className="btn-md-primary">
              <UserPlus size={20} /> <span>Recruter</span>
            </button>
          )}
        </div>
      </header>

      {/* STATS STRIP M3 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Effectif', value: technicians.length, icon: <Users />, color: '#0b57d0', bg: 'bg-[#d3e3fd]' },
          { label: 'Disponibilité', value: '84%', icon: <Activity />, color: '#137333', bg: 'bg-[#c4eed0]' },
          { label: 'Indice NPS', value: '92', icon: <Star />, color: '#b06000', bg: 'bg-[#ffdec2]' },
          { label: 'First Fix', value: '88%', icon: <Zap />, color: '#b3261e', bg: 'bg-[#f9dedc]' }
        ].map((s, i) => (
          <div key={i} className="md-card flex items-center gap-4 bg-white border border-[#e3e3e3]">
             <div className={`w-12 h-12 ${s.bg} rounded-2xl flex items-center justify-center`} style={{ color: s.color }}>
               {React.cloneElement(s.icon as React.ReactElement, { size: 22 })}
             </div>
             <div>
               <p className="text-[10px] font-bold text-[#747775] uppercase tracking-widest">{s.label}</p>
               <h3 className="text-2xl font-bold text-[#1f1f1f]">{s.value}</h3>
             </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {technicians.map((tech) => (
          <div 
            key={tech.id} 
            onClick={() => setSelectedTech(tech)}
            className="md-card bg-white border border-[#e3e3e3] hover:border-[#0b57d0] transition-all cursor-pointer group flex flex-col"
          >
            <div className="flex items-start justify-between mb-6">
               <div className="relative">
                  <img src={tech.avatar} className="w-16 h-16 rounded-[20px] object-cover border border-[#e3e3e3]" alt="" />
                  <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${getStatusColor(tech.status)}`} />
               </div>
               <div className="text-right">
                  <div className="flex items-center justify-end gap-1 text-[#b06000]">
                    <Star size={14} fill="currentColor" />
                    <span className="text-xs font-bold">{tech.rating}</span>
                  </div>
                  <p className="text-[10px] font-black text-[#747775] uppercase mt-1">ID: {tech.id}</p>
               </div>
            </div>

            <div className="flex-1">
               <h3 className="text-base font-bold text-[#1f1f1f] group-hover:text-[#0b57d0] transition-colors">{tech.name}</h3>
               <p className="text-xs text-[#747775] mt-1 font-medium flex items-center gap-1.5"><MapPin size={12}/> {tech.showroom || 'Expert Itinérant'}</p>
               
               <div className="grid grid-cols-2 gap-3 mt-6">
                  <div className="p-3 bg-[#f0f4f9] rounded-2xl text-center">
                     <p className="text-[9px] font-black text-[#747775] uppercase">Missions</p>
                     <p className="text-lg font-bold text-[#0b57d0]">{tech.activeTickets}</p>
                  </div>
                  <div className="p-3 bg-[#f0f4f9] rounded-2xl text-center">
                     <p className="text-[9px] font-black text-[#747775] uppercase">Terminés</p>
                     <p className="text-lg font-bold text-[#1f1f1f]">{tech.completedTickets}</p>
                  </div>
               </div>
            </div>

            <div className="mt-6 pt-6 border-t border-[#f1f1f1] flex justify-between items-center">
               <div className="flex gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#f8fafd] flex items-center justify-center text-[#444746] hover:bg-[#d3e3fd] hover:text-[#0b57d0] transition-all"><Mail size={14}/></div>
                  <div className="w-8 h-8 rounded-full bg-[#f8fafd] flex items-center justify-center text-[#444746] hover:bg-[#d3e3fd] hover:text-[#0b57d0] transition-all"><Phone size={14}/></div>
               </div>
               <span className="text-[10px] font-bold text-[#0b57d0] flex items-center gap-1 uppercase tracking-wider">Dossier <ChevronRight size={14}/></span>
            </div>
          </div>
        ))}
      </div>

      <Drawer isOpen={!!selectedTech} onClose={() => setSelectedTech(null)} title="Expert Certification" icon={<BadgeCheck size={20}/>}>
         {selectedTech && (
            <div className="space-y-8 animate-m3-entry">
               <div className="flex flex-col items-center text-center p-8 bg-[#f0f4f9] rounded-[40px]">
                  <img src={selectedTech.avatar} className="w-24 h-24 rounded-[32px] shadow-lg border-2 border-white mb-4" alt="" />
                  <h3 className="text-2xl font-bold text-[#1f1f1f]">{selectedTech.name}</h3>
                  <div className="flex items-center gap-3 mt-2">
                     <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase text-white ${getStatusColor(selectedTech.status)}`}>{selectedTech.status}</div>
                  </div>
               </div>

               <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-white border border-[#e3e3e3] rounded-[24px] text-center">
                     <p className="text-[9px] font-black text-[#747775] uppercase mb-1">NPS</p>
                     <p className="text-xl font-bold text-[#137333]">{selectedTech.nps}</p>
                  </div>
                  <div className="p-4 bg-white border border-[#e3e3e3] rounded-[24px] text-center">
                     <p className="text-[9px] font-black text-[#747775] uppercase mb-1">Fix Rate</p>
                     <p className="text-xl font-bold text-[#0b57d0]">{selectedTech.firstFixRate}%</p>
                  </div>
                  <div className="p-4 bg-white border border-[#e3e3e3] rounded-[24px] text-center">
                     <p className="text-[9px] font-black text-[#747775] uppercase mb-1">Rating</p>
                     <div className="flex items-center justify-center gap-1"><p className="text-xl font-bold text-[#b06000]">{selectedTech.rating}</p><Star size={12} fill="currentColor" className="text-[#b06000]"/></div>
                  </div>
               </div>

               <section className="space-y-4">
                  <h4 className="text-xs font-bold text-[#1f1f1f] uppercase tracking-widest border-b pb-2">Spécialisations</h4>
                  <div className="flex flex-wrap gap-2">
                     {selectedTech.specialty.map(s => (
                        <span key={s} className="px-4 py-2 bg-[#f0f4f9] rounded-full text-xs font-bold text-[#444746] border border-[#e3e3e3]">{s}</span>
                     ))}
                  </div>
               </section>
            </div>
         )}
      </Drawer>
    </div>
  );
};

export default Technicians;
