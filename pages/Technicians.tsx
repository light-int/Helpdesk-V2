
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Users, Star, Activity, UserPlus, MessageSquare, Phone, 
  RefreshCw, Edit3, Trash2, ShieldCheck, Zap, MoreVertical,
  X, Mail, Briefcase, Award, TrendingUp, Clock, CheckCircle2,
  AlertCircle, ChevronRight, MapPin, Save, User as UserIcon,
  BarChart3, Calendar, ClipboardCheck, ArrowUpRight,
  ClipboardList, Hash, Tag, Info, CalendarDays, ExternalLink,
  Search, Filter, Eye, Wrench, History
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
      addNotification({ title: 'RH Horizon', message: `Expert ${techData.name} enregistré.`, type: 'success' });
    } catch (err) {
      addNotification({ title: 'Erreur', message: 'Échec de la sauvegarde Cloud.', type: 'error' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!canManageRH) return;
    if (window.confirm('Voulez-vous vraiment révoquer cet expert ?')) {
      try {
        await deleteTechnician(id);
        addNotification({ title: 'RH Horizon', message: 'Expert retiré des effectifs.', type: 'info' });
        if (selectedTech?.id === id) setSelectedTech(null);
      } catch (err) {
        addNotification({ title: 'Erreur', message: 'Impossible de supprimer cet expert.', type: 'error' });
      }
    }
  };

  const techTickets = useMemo(() => {
    if (!selectedTech) return [];
    return (tickets || [])
      .filter(t => t.assignedTechnicianId === selectedTech.id)
      .sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
  }, [selectedTech, tickets]);

  const activeTickets = techTickets.filter(t => t.status !== 'Fermé' && t.status !== 'Résolu');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Résolu': return 'bg-green-50 text-green-700 border-green-100';
      case 'Fermé': return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'Nouveau': return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'Urgent': return 'bg-red-50 text-red-700 border-red-100';
      default: return 'bg-amber-50 text-amber-700 border-amber-100';
    }
  };

  if (isLoading) return <div className="h-[60vh] flex items-center justify-center"><RefreshCw className="animate-spin text-[#1a73e8]" /></div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 relative">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-normal text-[#3c4043]">Équipe Élite Horizon</h1>
          <p className="text-[#5f6368] text-sm">Pilotage du capital humain et des expertises Royal Plaza.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={refreshAll} className="btn-google-outlined h-10 px-4">
             <RefreshCw size={18} className={isSyncing ? 'animate-spin' : ''} />
          </button>
          {canManageRH && (
            <button onClick={() => { setEditingTech(null); setIsModalOpen(true); }} className="btn-google-primary">
              <UserPlus size={18} /> Recruter un expert
            </button>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(technicians || []).map((tech) => (
          <div key={tech.id} className="google-card p-6 flex flex-col group relative hover:border-[#1a73e8] transition-all">
            <div className="flex items-start justify-between mb-4">
               <div className="flex items-center gap-4">
                  <img src={tech.avatar} className="w-14 h-14 rounded-full border shadow-sm" alt={tech.name} />
                  <div>
                     <h3 className="text-sm font-bold text-[#3c4043]">{tech.name}</h3>
                     <p className="text-[10px] text-[#5f6368] font-bold uppercase">{tech.showroom || 'Expert Mobile'}</p>
                     <div className="flex items-center gap-1 mt-1">
                        <div className={`w-1.5 h-1.5 rounded-full ${tech.status === 'Disponible' ? 'bg-green-500' : 'bg-orange-500'}`} />
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">{tech.status}</span>
                     </div>
                  </div>
               </div>
               {canManageRH && (
                 <div className="relative">
                   <button 
                    onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === tech.id ? null : tech.id); }} 
                    className="p-2 text-[#5f6368] hover:bg-[#f1f3f4] rounded-full transition-colors"
                   >
                     <MoreVertical size={18}/>
                   </button>
                   {activeMenuId === tech.id && (
                     <>
                       <div className="fixed inset-0 z-10" onClick={() => setActiveMenuId(null)} />
                       <div className="absolute right-0 top-10 w-48 bg-white border border-[#dadce0] rounded-lg shadow-xl z-20 py-2 animate-in fade-in zoom-in-95 duration-150">
                          <button 
                            onClick={() => { setEditingTech(tech); setIsModalOpen(true); setActiveMenuId(null); }} 
                            className="w-full flex items-center gap-3 px-4 py-2 text-xs font-medium text-[#3c4043] hover:bg-[#f1f3f4]"
                          >
                            <Edit3 size={14} className="text-[#1a73e8]" /> Modifier la fiche
                          </button>
                          <button 
                            onClick={() => { handleDelete(tech.id); setActiveMenuId(null); }} 
                            className="w-full flex items-center gap-3 px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50"
                          >
                            <Trash2 size={14} /> Révoquer l'accès
                          </button>
                       </div>
                     </>
                   )}
                 </div>
               )}
            </div>

            <div className="grid grid-cols-2 gap-4 mb-5">
               <div className="p-3 bg-[#f8f9fa] rounded-lg border border-[#f1f3f4]">
                  <p className="text-[9px] text-[#5f6368] font-black uppercase tracking-widest">Clôtures</p>
                  <p className="text-xl font-black text-[#3c4043]">{tech.completedTickets || 0}</p>
               </div>
               <div className="p-3 bg-[#e8f0fe] rounded-lg border border-[#d2e3fc]">
                  <p className="text-[9px] text-[#1a73e8] font-black uppercase tracking-widest">Rating</p>
                  <div className="flex items-center gap-1">
                    <p className="text-xl font-black text-[#1a73e8]">{tech.rating || '5.0'}</p>
                    <Star size={12} className="text-[#1a73e8]" fill="currentColor" />
                  </div>
               </div>
            </div>

            <div className="pt-4 border-t border-[#f1f3f4] flex items-center justify-between">
               <div className="flex gap-1">
                  <a href={`tel:${tech.phone}`} className="p-2 text-[#5f6368] hover:bg-[#e8f0fe] hover:text-[#1a73e8] rounded-full transition-colors"><Phone size={16}/></a>
                  <a href={`mailto:${tech.email}`} className="p-2 text-[#5f6368] hover:bg-[#e8f0fe] hover:text-[#1a73e8] rounded-full transition-colors"><Mail size={16}/></a>
               </div>
               <button 
                onClick={() => setSelectedTech(tech)} 
                className="text-[10px] font-black text-[#1a73e8] hover:underline uppercase flex items-center gap-1 py-1.5 px-3 rounded-lg hover:bg-[#e8f0fe] transition-all"
               >
                 Voir Profil <ChevronRight size={14} />
               </button>
            </div>
          </div>
        ))}
      </div>

      {/* COMPOSANT DRAWER CENTRALISÉ */}
      <Drawer
        isOpen={!!selectedTech}
        onClose={() => setSelectedTech(null)}
        title={selectedTech?.name || ''}
        subtitle={`${selectedTech?.showroom || 'Expert Corporate'}`}
        icon={<Award size={20} />}
        footer={
          <div className="flex gap-3">
             <button 
               onClick={() => setIsHistoryModalOpen(true)}
               className="flex-1 btn-google-outlined justify-center text-xs font-black uppercase tracking-widest"
             >
               Registre de Performance
             </button>
             <button 
               onClick={() => setSelectedTech(null)}
               className="flex-1 btn-google-primary justify-center py-4 text-xs font-black uppercase tracking-widest shadow-xl shadow-blue-600/20"
             >
               Fermer
             </button>
          </div>
        }
      >
        {selectedTech && (
          <div className="space-y-10">
             <div className="flex items-center gap-6">
                <img src={selectedTech.avatar} className="w-24 h-24 rounded-full border-4 border-white shadow-lg" alt="" />
                <div className="space-y-2 flex-1">
                   <h3 className="text-2xl font-black text-[#3c4043] tracking-tight leading-none">{selectedTech.name}</h3>
                   <div className="flex flex-wrap gap-2 pt-1">
                      {(selectedTech.specialty || []).map(spec => (
                        <span key={spec} className="px-2 py-0.5 bg-blue-50 text-[#1a73e8] text-[9px] font-black rounded border border-blue-100 uppercase tracking-widest">
                          {spec}
                        </span>
                      ))}
                   </div>
                </div>
             </div>

             <div className="grid grid-cols-3 gap-4">
                <div className="p-5 bg-white border border-[#dadce0] rounded-2xl shadow-sm text-center">
                   <p className="text-[9px] font-black text-[#5f6368] uppercase tracking-widest mb-2">Note Client</p>
                   <div className="flex items-center justify-center gap-1 text-amber-500">
                      <span className="text-2xl font-black text-[#3c4043]">{selectedTech.rating || '5.0'}</span>
                      <Star size={16} fill="currentColor" />
                   </div>
                </div>
                <div className="p-5 bg-white border border-[#dadce0] rounded-2xl shadow-sm text-center">
                   <p className="text-[9px] font-black text-[#5f6368] uppercase tracking-widest mb-2">Impact NPS</p>
                   <div className="flex items-center justify-center gap-1 text-green-600">
                      <span className="text-2xl font-black text-[#3c4043]">{selectedTech.nps || 100}</span>
                      <TrendingUp size={16} />
                   </div>
                </div>
                <div className="p-5 bg-white border border-[#dadce0] rounded-2xl shadow-sm text-center">
                   <p className="text-[9px] font-black text-[#5f6368] uppercase tracking-widest mb-2">First Fix</p>
                   <div className="flex items-center justify-center gap-1 text-blue-600">
                      <span className="text-2xl font-black text-[#3c4043]">{selectedTech.firstFixRate || 100}%</span>
                      <ShieldCheck size={16} />
                   </div>
                </div>
             </div>

             <section className="space-y-4">
                <h4 className="text-[10px] font-black text-[#9aa0a6] uppercase tracking-[0.2em] flex items-center gap-2">
                   <Briefcase size={16} /> Missions Actives ({activeTickets.length})
                </h4>
                <div className="space-y-3">
                   {activeTickets.slice(0, 5).map(ticket => (
                     <div 
                       key={ticket.id} 
                       onClick={() => setPreviewTicket(ticket)}
                       className="p-4 bg-white border border-[#dadce0] rounded-2xl shadow-sm flex items-center justify-between hover:border-[#1a73e8] cursor-pointer transition-all group"
                     >
                        <div>
                           <p className="text-xs font-bold text-[#3c4043]">Dossier #{ticket.id}</p>
                           <p className="text-[10px] text-[#5f6368] font-medium">{ticket.customerName}</p>
                        </div>
                        <ArrowUpRight size={14} className="text-[#dadce0] group-hover:text-[#1a73e8]" />
                     </div>
                   ))}
                </div>
             </section>
          </div>
        )}
      </Drawer>

      {/* MODAL HISTORIQUE */}
      <Modal 
        isOpen={isHistoryModalOpen} 
        onClose={() => setIsHistoryModalOpen(false)} 
        title={`Registre Missions : ${selectedTech?.name}`}
        size="lg"
      >
        <div className="space-y-8">
           <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                 <p className="text-[9px] font-black text-blue-700 uppercase tracking-widest">Missions totales</p>
                 <p className="text-2xl font-black text-blue-900">{techTickets.length}</p>
              </div>
              <div className="p-4 bg-green-50 border border-green-100 rounded-xl">
                 <p className="text-[9px] font-black text-green-700 uppercase tracking-widest">Taux de succès</p>
                 <p className="text-2xl font-black text-green-900">{selectedTech?.firstFixRate || 100}%</p>
              </div>
           </div>

           <div className="space-y-4">
              <h4 className="text-xs font-black uppercase tracking-widest text-[#3c4043] flex items-center gap-2">
                 <History size={16} className="text-[#1a73e8]" /> Journal Exhaustif
              </h4>
              <div className="google-card overflow-hidden">
                 <table className="w-full text-left">
                    <thead className="bg-[#f8f9fa] border-b text-[9px] font-black uppercase">
                       <tr>
                          <th className="px-6 py-3">Dossier</th>
                          <th className="px-6 py-3">Client</th>
                          <th className="px-6 py-3 text-center">État</th>
                          <th className="px-6 py-3 text-right">Action</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y text-xs">
                       {techTickets.map(t => (
                          <tr key={t.id}>
                             <td className="px-6 py-4 font-bold text-[#1a73e8]">#{t.id}</td>
                             <td className="px-6 py-4 font-medium">{t.customerName}</td>
                             <td className="px-6 py-4 text-center">
                                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border ${getStatusColor(t.status)}`}>
                                   {t.status}
                                </span>
                             </td>
                             <td className="px-6 py-4 text-right">
                                <button onClick={() => setPreviewTicket(t)} className="p-1.5 hover:bg-gray-100 rounded"><Eye size={14}/></button>
                             </td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
           </div>
        </div>
      </Modal>

      {/* MODAL PREVIEW TICKET */}
      <Modal isOpen={!!previewTicket} onClose={() => setPreviewTicket(null)} title={`Aperçu Dossier #${previewTicket?.id}`} size="lg">
         {previewTicket && (
           <div className="space-y-6">
              <div className="p-6 bg-[#f8f9fa] border rounded-2xl italic text-xs leading-relaxed">
                 "{previewTicket.description}"
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div className="p-4 border rounded-xl">
                    <p className="text-[10px] font-black uppercase text-gray-400">Marque</p>
                    <p className="text-sm font-bold">{previewTicket.brand}</p>
                 </div>
                 <div className="p-4 border rounded-xl">
                    <p className="text-[10px] font-black uppercase text-gray-400">Modèle</p>
                    <p className="text-sm font-bold">{previewTicket.productName}</p>
                 </div>
              </div>
           </div>
         )}
      </Modal>

      {/* MODAL CREATION/EDITION RH */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingTech ? `Modification Fiche : ${editingTech.name}` : "Recrutement d'un Nouvel Expert"}
        size="lg"
      >
        <form onSubmit={handleSaveTech} className="space-y-6">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
              <div className="space-y-1.5">
                 <label className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest ml-1">Nom complet</label>
                 <input name="name" type="text" defaultValue={editingTech?.name || ''} required className="bg-white h-11 font-bold" />
              </div>
              <div className="space-y-1.5">
                 <label className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest ml-1">Email professionnel</label>
                 <input name="email" type="email" defaultValue={editingTech?.email || ''} required className="bg-white h-11" />
              </div>
              <div className="space-y-1.5">
                 <label className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest ml-1">Mobile</label>
                 <input name="phone" type="tel" defaultValue={editingTech?.phone || ''} required className="bg-white h-11 font-bold" />
              </div>
              <div className="space-y-1.5">
                 <label className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest ml-1">Showroom</label>
                 <select name="showroom" defaultValue={editingTech?.showroom || 'Glass'} className="bg-white h-11 font-bold">
                    {(showrooms || []).map(s => <option key={s.id} value={s.id}>{s.id}</option>)}
                    <option value="">Expert Mobile</option>
                 </select>
              </div>
              <div className="md:col-span-2 space-y-3">
                 <label className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest ml-1">Spécialités</label>
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {CATEGORIES.map(cat => (
                      <label key={cat} className="flex items-center gap-2 p-3 bg-[#f8f9fa] border border-[#dadce0] rounded-xl cursor-pointer hover:bg-white transition-all group has-[:checked]:border-[#1a73e8] has-[:checked]:bg-[#e8f0fe]">
                         <input type="checkbox" name="specialty" value={cat} defaultChecked={editingTech?.specialty?.includes(cat)} className="w-4 h-4 rounded text-[#1a73e8]" />
                         <span className="text-[10px] font-bold text-[#3c4043] uppercase">{cat}</span>
                      </label>
                    ))}
                 </div>
              </div>
           </div>
           <div className="flex gap-3 pt-8 border-t">
              <button type="submit" className="btn-google-primary flex-1 justify-center py-4 text-xs font-black uppercase tracking-[0.2em] shadow-xl">
                 <Save size={18} /> Enregistrer
              </button>
              <button type="button" onClick={() => setIsModalOpen(false)} className="btn-google-outlined px-10 font-black uppercase text-[10px]">Abandonner</button>
           </div>
        </form>
      </Modal>
    </div>
  );
};

export default Technicians;
