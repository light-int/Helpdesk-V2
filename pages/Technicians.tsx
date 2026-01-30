
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Users, Star, Activity, UserPlus, MessageSquare, Phone, 
  RefreshCw, Edit3, Trash2, ShieldCheck, Zap, MoreVertical,
  X, Mail, Briefcase, Award, TrendingUp, Clock, CheckCircle2,
  AlertCircle, ChevronRight, MapPin, Save, User as UserIcon,
  BarChart3, Calendar, ClipboardCheck, ArrowUpRight,
  ClipboardList, Hash, Tag, Info, CalendarDays, ExternalLink,
  Search, Filter, Eye, Wrench, History, BadgeCheck, Timer,
  Trophy, SlidersHorizontal, LayoutGrid
} from 'lucide-react';
import { useNotifications, useData, useUser } from '../App';
import { Technician, TicketCategory, Showroom, Ticket } from '../types';
import Modal from '../components/Modal';
import Drawer from '../components/Drawer';

const CATEGORIES: TicketCategory[] = ['Livraison', 'Installation', 'SAV', 'Remboursement', 'Maintenance', 'Climatisation', 'Électronique'];

const Technicians: React.FC = () => {
  const { technicians, isLoading, refreshAll, isSyncing, saveTechnician, deleteTechnician, showrooms, tickets } = useData();
  const { currentUser } = useUser();
  const { addNotification } = useNotifications();
  
  const [selectedTech, setSelectedTech] = useState<Technician | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTech, setEditingTech] = useState<Technician | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  
  const [previewTicket, setPreviewTicket] = useState<Ticket | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  const canManageRH = currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER';

  useEffect(() => { refreshAll(); }, []);

  const handleSaveTech = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canManageRH) return;
    const formData = new FormData(e.currentTarget);
    const specialties: TicketCategory[] = [];
    formData.getAll('specialty').forEach(s => specialties.push(s as TicketCategory));

    const techData: Technician = {
      id: editingTech?.id || `TECH-${Math.floor(100 + Math.random() * 899)}`,
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      specialty: specialties,
      showroom: formData.get('showroom') as Showroom,
      status: (formData.get('status') as any) || 'Disponible',
      avatar: editingTech?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.get('name') as string)}&background=1a73e8&color=ffffff`,
      activeTickets: editingTech?.activeTickets || 0,
      completedTickets: editingTech?.completedTickets || 0,
      avgResolutionTime: editingTech?.avgResolutionTime || '0h',
      rating: editingTech?.rating || 5.0,
      nps: editingTech?.nps || 100,
      firstFixRate: editingTech?.firstFixRate || 100,
      performanceHistory: editingTech?.performanceHistory || []
    };

    try {
      await saveTechnician(techData);
      setIsModalOpen(false);
      setEditingTech(null);
      addNotification({ title: 'Ressources Humaines', message: `Expert technique ${techData.name} enregistré.`, type: 'success' });
    } catch (err) {
      addNotification({ title: 'Erreur', message: 'Échec de la sauvegarde Cloud.', type: 'error' });
    }
  };

  const techTickets = useMemo(() => {
    if (!selectedTech) return [];
    return (tickets || [])
      .filter(t => t.assignedTechnicianId === selectedTech.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [selectedTech, tickets]);

  const activeTicketsCount = techTickets.filter(t => t.status !== 'Fermé' && t.status !== 'Résolu').length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Disponible': return 'bg-green-500';
      case 'En intervention': return 'bg-orange-500';
      default: return 'bg-gray-400';
    }
  };

  if (isLoading) return <div className="h-[80vh] flex items-center justify-center"><RefreshCw className="animate-spin text-[#1a73e8]" size={32} /></div>;

  return (
    <div className="space-y-8 animate-page-entry pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-light text-[#202124]">Équipe Technique Élite</h1>
          <p className="text-[10px] text-[#5f6368] font-black uppercase tracking-widest mt-1">Management du Capital Humain Royal Plaza Horizon</p>
        </div>
        <div className="flex gap-3">
          <button onClick={refreshAll} className="btn-google-outlined h-11 px-4">
             <RefreshCw size={18} className={isSyncing ? 'animate-spin' : ''} />
          </button>
          {canManageRH && (
            <button onClick={() => { setEditingTech(null); setIsModalOpen(true); }} className="btn-google-primary h-11 px-6 shadow-xl shadow-blue-600/10">
              <UserPlus size={20} /> <span>Recruter un expert</span>
            </button>
          )}
        </div>
      </header>

      {/* STATS GLOBALES ÉQUIPE */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Effectif Total', value: technicians.length, icon: <Users size={20}/>, color: '#1a73e8' },
          { label: 'Disponibilité', value: `${((technicians.filter(t => t.status === 'Disponible').length / (technicians.length || 1)) * 100).toFixed(0)}%`, icon: <CheckCircle2 size={20}/>, color: '#188038' },
          { label: 'Indice NPS Moyen', value: '92', icon: <Trophy size={20}/>, color: '#f9ab00' },
          { label: 'First Fix Global', value: '88%', icon: <Zap size={20}/>, color: '#a142f4' }
        ].map((s, i) => (
          <div key={i} className="stats-card border-l-4" style={{ borderLeftColor: s.color }}>
             <div className="flex justify-between items-start">
               <div>
                 <p className="text-[10px] font-black text-[#5f6368] uppercase tracking-[0.15em] mb-1">{s.label}</p>
                 <h3 className="text-3xl font-bold text-[#202124] tracking-tight">{s.value}</h3>
               </div>
               <div className="p-2 bg-gray-50 text-gray-400">{s.icon}</div>
             </div>
          </div>
        ))}
      </div>

      {/* GRILLE DES TECHNICIENS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {(technicians || []).map((tech) => (
          <div 
            key={tech.id} 
            onClick={() => setSelectedTech(tech)}
            className="group bg-white border border-[#dadce0] cursor-pointer hover:border-[#1a73e8] transition-all flex flex-col shadow-sm"
          >
            <div className="p-8 space-y-6 flex-1">
              <div className="flex items-start justify-between">
                 <div className="relative">
                    <img src={tech.avatar} className="w-16 h-16 rounded-2xl border-2 border-white shadow-lg object-cover" alt={tech.name} />
                    <div className={`absolute -bottom-1 -right-1 w-4 h-4 border-2 border-white rounded-full ${getStatusColor(tech.status)}`} />
                 </div>
                 <div className="text-right">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{tech.id}</p>
                    <div className="flex items-center justify-end gap-1 mt-1 text-[#1a73e8]">
                       <Star size={12} fill="currentColor" />
                       <span className="text-xs font-black">{tech.rating || '5.0'}</span>
                    </div>
                 </div>
              </div>

              <div>
                 <h3 className="text-base font-black text-[#3c4043] uppercase tracking-tight group-hover:text-[#1a73e8] transition-colors">{tech.name}</h3>
                 <p className="text-[10px] text-[#9aa0a6] font-bold uppercase tracking-widest mt-1 flex items-center gap-2">
                    <MapPin size={10} /> {tech.showroom || 'Expert Mobile'}
                 </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="p-4 bg-[#f8f9fa] border border-[#f1f3f4] text-center">
                    <p className="text-[9px] text-[#5f6368] font-black uppercase tracking-tighter">Clôtures</p>
                    <p className="text-xl font-black text-[#3c4043]">{tech.completedTickets || 0}</p>
                 </div>
                 <div className="p-4 bg-blue-50 border border-blue-100 text-center">
                    <p className="text-[9px] text-[#1a73e8] font-black uppercase tracking-tighter">Missions</p>
                    <p className="text-xl font-black text-[#1a73e8]">{tech.activeTickets || 0}</p>
                 </div>
              </div>
            </div>

            <div className="px-8 py-5 border-t border-[#f1f3f4] flex justify-between items-center bg-[#fcfcfc]">
              <div className="flex gap-2">
                <div className="w-8 h-8 rounded-full border border-gray-100 flex items-center justify-center text-gray-400 group-hover:text-blue-600 group-hover:border-blue-100 transition-colors"><Phone size={14}/></div>
                <div className="w-8 h-8 rounded-full border border-gray-100 flex items-center justify-center text-gray-400 group-hover:text-blue-600 group-hover:border-blue-100 transition-colors"><Mail size={14}/></div>
              </div>
              <span className="text-[9px] font-black text-[#1a73e8] uppercase tracking-widest flex items-center gap-2">Expert Profile <ChevronRight size={14} /></span>
            </div>
          </div>
        ))}
      </div>

      {/* DRAWER PROFILE */}
      <Drawer
        isOpen={!!selectedTech}
        onClose={() => setSelectedTech(null)}
        title="Dossier de Compétences Expert"
        subtitle={`Expert ID: ${selectedTech?.id}`}
        icon={<BadgeCheck size={20} />}
        footer={
          <div className="flex gap-3">
             <button onClick={() => setSelectedTech(null)} className="flex-1 btn-google-outlined justify-center py-4 text-xs font-black uppercase tracking-widest">Fermer</button>
             {canManageRH && (
               <button 
                onClick={() => { if(selectedTech) { setEditingTech(selectedTech); setIsModalOpen(true); setSelectedTech(null); } }}
                className="flex-1 btn-google-primary justify-center py-4 text-xs font-black uppercase tracking-widest shadow-xl shadow-blue-600/10"
               >
                 <Edit3 size={18} /> Modifier la Fiche
               </button>
             )}
          </div>
        }
      >
        {selectedTech && (
          <div className="space-y-12">
             <div className="flex flex-col items-center text-center space-y-6">
                <img src={selectedTech.avatar} className="w-32 h-32 rounded-3xl border-4 border-white shadow-2xl object-cover" alt="" />
                <div>
                   <h3 className="text-3xl font-black text-[#202124] tracking-tighter uppercase">{selectedTech.name}</h3>
                   <div className="flex items-center justify-center gap-4 mt-3">
                      <span className="px-3 py-1 bg-blue-50 text-[#1a73e8] text-[9px] font-black border border-blue-100 uppercase tracking-widest">
                         {selectedTech.showroom || 'Corporate Mobile'}
                      </span>
                      <div className={`flex items-center gap-2 px-3 py-1 text-[9px] font-black uppercase border tracking-widest ${selectedTech.status === 'Disponible' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-orange-50 text-orange-700 border-orange-100'}`}>
                         <div className={`w-2 h-2 rounded-full ${selectedTech.status === 'Disponible' ? 'bg-green-500' : 'bg-orange-500'}`} />
                         {selectedTech.status}
                      </div>
                   </div>
                </div>
             </div>

             <div className="grid grid-cols-3 gap-6">
                <div className="p-6 bg-white border border-[#dadce0] shadow-sm text-center space-y-2">
                   <p className="text-[9px] font-black text-[#5f6368] uppercase tracking-widest">Note Client</p>
                   <div className="flex items-center justify-center gap-2 text-amber-500">
                      <span className="text-3xl font-black text-[#202124] tracking-tighter">{selectedTech.rating || '5.0'}</span>
                      <Star size={20} fill="currentColor" />
                   </div>
                </div>
                <div className="p-6 bg-white border border-[#dadce0] shadow-sm text-center space-y-2">
                   <p className="text-[9px] font-black text-[#5f6368] uppercase tracking-widest">Impact NPS</p>
                   <div className="flex items-center justify-center gap-2 text-green-600">
                      <span className="text-3xl font-black text-[#202124] tracking-tighter">{selectedTech.nps || 100}</span>
                      <TrendingUp size={20} />
                   </div>
                </div>
                <div className="p-6 bg-white border border-[#dadce0] shadow-sm text-center space-y-2">
                   <p className="text-[9px] font-black text-[#5f6368] uppercase tracking-widest">First Fix</p>
                   <div className="flex items-center justify-center gap-2 text-blue-600">
                      <span className="text-3xl font-black text-[#202124] tracking-tighter">{selectedTech.firstFixRate || 100}%</span>
                      <ShieldCheck size={20} />
                   </div>
                </div>
             </div>

             <section className="space-y-6">
                <h4 className="text-[10px] font-black text-[#9aa0a6] uppercase tracking-[0.2em] flex items-center gap-3">
                   <Briefcase size={20} /> Missions Actives ({activeTicketsCount})
                </h4>
                <div className="space-y-4">
                   {techTickets.filter(t => t.status !== 'Fermé' && t.status !== 'Résolu').slice(0, 3).map(ticket => (
                     <div key={ticket.id} className="p-6 bg-white border border-[#dadce0] rounded-3xl flex items-center justify-between hover:border-[#1a73e8] transition-all group shadow-sm">
                        <div className="space-y-1">
                           <span className="text-[9px] font-black text-[#1a73e8] uppercase bg-blue-50 px-2 py-0.5 border border-blue-100 rounded">#{ticket.id}</span>
                           <h5 className="text-sm font-black text-[#3c4043] leading-none mt-2">{ticket.customerName}</h5>
                           <p className="text-[10px] text-[#5f6368] font-bold uppercase">{ticket.productName}</p>
                        </div>
                        <ArrowUpRight size={20} className="text-[#dadce0] group-hover:text-[#1a73e8] transition-colors" />
                     </div>
                   ))}
                   {activeTicketsCount === 0 && (
                     <div className="p-12 text-center border-2 border-dashed border-[#dadce0] rounded-[40px] bg-gray-50/50">
                        <CheckCircle2 size={40} className="mx-auto text-green-100 mb-4" />
                        <p className="text-[10px] font-black text-[#9aa0a6] uppercase tracking-widest">Aucune mission en cours</p>
                     </div>
                   )}
                </div>
             </section>

             <section className="space-y-4">
                <h4 className="text-[10px] font-black text-[#9aa0a6] uppercase tracking-[0.2em] flex items-center gap-3">
                   <Wrench size={20} /> Domaines d'Expertise Certifiés
                </h4>
                <div className="flex flex-wrap gap-2">
                   {(selectedTech.specialty || []).map(spec => (
                     <span key={spec} className="px-5 py-2.5 bg-[#f8f9fa] border border-[#dadce0] text-[10px] font-black uppercase tracking-widest shadow-sm">
                       {spec}
                     </span>
                   ))}
                </div>
             </section>
          </div>
        )}
      </Drawer>

      {/* MODAL RH */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Gestion Dossier RH Horizon" size="lg">
         <form onSubmit={handleSaveTech} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest ml-1">Nom Complet</label>
                  <input name="name" type="text" defaultValue={editingTech?.name} required className="h-12 bg-[#f8f9fa] border-none font-black" />
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest ml-1">Mobile Terrain</label>
                  <input name="phone" type="tel" defaultValue={editingTech?.phone} required className="h-12 bg-[#f8f9fa] border-none font-black" />
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest ml-1">Email Pro</label>
                  <input name="email" type="email" defaultValue={editingTech?.email} required className="h-12 bg-[#f8f9fa] border-none font-bold" />
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest ml-1">Showroom / Zone</label>
                  <select name="showroom" defaultValue={editingTech?.showroom || 'Glass'} className="h-12 bg-[#f8f9fa] border-none font-black px-4">
                     {showrooms.map(s => <option key={s.id} value={s.id}>{s.id}</option>)}
                     <option value="">Technicien Mobile</option>
                  </select>
               </div>
               <div className="md:col-span-2 space-y-4 pt-4 border-t border-gray-100">
                  <label className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest ml-1">Expertises Validées</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                     {CATEGORIES.map(cat => (
                        <label key={cat} className="flex items-center gap-3 p-4 bg-[#f8f9fa] border border-[#dadce0] cursor-pointer hover:bg-white transition-all group has-[:checked]:border-[#1a73e8] has-[:checked]:bg-blue-50">
                           <input type="checkbox" name="specialty" value={cat} defaultChecked={editingTech?.specialty?.includes(cat)} className="w-5 h-5 rounded text-[#1a73e8] focus:ring-0" />
                           <span className="text-[10px] font-black text-[#3c4043] uppercase tracking-tighter">{cat}</span>
                        </label>
                     ))}
                  </div>
               </div>
            </div>
            <div className="flex gap-4 pt-8 border-t border-[#dadce0]">
               <button type="submit" className="btn-google-primary flex-1 justify-center py-5 text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-blue-600/20">
                  <Save size={20} /> Valider la fiche expert
               </button>
               <button type="button" onClick={() => setIsModalOpen(false)} className="btn-google-outlined px-12 font-black uppercase text-[10px] tracking-widest">Abandonner</button>
            </div>
         </form>
      </Modal>
    </div>
  );
};

export default Technicians;
