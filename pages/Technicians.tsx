
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Users, Star, Activity, UserPlus, RefreshCw, Edit3, Trash2, 
  ShieldCheck, Zap, MoreVertical, Mail, Phone, MapPin, 
  Save, BadgeCheck, Trophy, ChevronRight, User as UserIcon
} from 'lucide-react';
import { useNotifications, useData, useUser } from '../App';
import { Technician, TicketCategory, Showroom, Ticket } from '../types';
import Modal from '../components/Modal';
import Drawer from '../components/Drawer';

const Technicians: React.FC = () => {
  const { technicians, isLoading, refreshAll, isSyncing, saveTechnician, deleteTechnician, showrooms, tickets } = useData();
  const { currentUser } = useUser();
  const { addNotification } = useNotifications();
  
  const [selectedTech, setSelectedTech] = useState<Technician | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTech, setEditingTech] = useState<Technician | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const canManageRH = currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER';

  useEffect(() => { refreshAll(); }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Disponible': return 'bg-[#3ecf8e]';
      case 'En intervention': return 'bg-amber-500';
      default: return 'bg-[#686868]';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Disponible': return 'bg-[#f0fdf4] text-[#16a34a] border-[#dcfce7]';
      case 'En intervention': return 'bg-[#fffbeb] text-[#b45309] border-[#fef3c7]';
      default: return 'bg-[#f9fafb] text-[#4b5563] border-[#f3f4f6]';
    }
  };

  const handleSaveTech = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    const formData = new FormData(e.currentTarget);
    const techData: Technician = {
      id: editingTech?.id || `TECH-${Date.now()}`,
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      specialty: editingTech?.specialty || ['SAV', 'Installation'],
      showroom: formData.get('showroom') as string,
      status: (formData.get('status') as any) || 'Disponible',
      avatar: editingTech?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.get('name') as string)}&background=3ecf8e&color=ffffff`,
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
      addNotification({ title: 'Équipe', message: 'Fiche expert synchronisée.', type: 'success' });
    } catch (err) {
      addNotification({ title: 'Erreur', message: 'Impossible de sauvegarder.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTech = async (id: string) => {
    if (!window.confirm('Retirer cet expert de l\'équipe ? Cette action est irréversible.')) return;
    try {
      await deleteTechnician(id);
      addNotification({ title: 'Supprimé', message: 'Collaborateur retiré de la base.', type: 'info' });
      setSelectedTech(null);
    } catch (err) {
      addNotification({ title: 'Erreur', message: 'Échec de la suppression.', type: 'error' });
    }
  };

  if (isLoading) return <div className="h-[80vh] flex items-center justify-center"><RefreshCw className="animate-spin text-[#3ecf8e]" size={32} /></div>;

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-sb-entry pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1c1c1c] tracking-tight">Ressources Techniques</h1>
          <p className="text-xs text-[#686868] mt-1 font-medium">Management des experts certifiés et techniciens terrain Royal Plaza.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={refreshAll} className="btn-sb-outline h-10 px-3">
             <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
          </button>
          {canManageRH && (
            <button onClick={() => { setEditingTech(null); setIsModalOpen(true); }} className="btn-sb-primary h-10 px-4">
              <UserPlus size={16} /> <span>Recruter un expert</span>
            </button>
          )}
        </div>
      </header>

      {/* KPI STRIP */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Effectif Total', value: technicians.length, icon: <Users />, color: 'text-blue-500', bg: 'bg-[#eff6ff]' },
          { label: 'En Mission', value: technicians.filter(t => t.status === 'En intervention').length, icon: <Activity />, color: 'text-amber-500', bg: 'bg-[#fffbeb]' },
          { label: 'Indice Satisfaction', value: '4.8/5', icon: <Star />, color: 'text-[#3ecf8e]', bg: 'bg-[#f0fdf4]' },
          { label: 'Disponibilité', value: '88%', icon: <Zap />, color: 'text-purple-500', bg: 'bg-[#f5f3ff]' }
        ].map((s, i) => (
          <div key={i} className="sb-card flex items-center gap-4 py-4 px-6 border-[#ededed]">
             <div className={`p-3 rounded-xl ${s.bg} ${s.color} shadow-sm`}>
               {React.cloneElement(s.icon as React.ReactElement, { size: 18 })}
             </div>
             <div>
               <p className="text-[10px] font-bold text-[#686868] uppercase tracking-widest">{s.label}</p>
               <h3 className="text-xl font-black text-[#1c1c1c]">{s.value}</h3>
             </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {technicians.map((tech) => (
          <div 
            key={tech.id} 
            onClick={() => setSelectedTech(tech)}
            className="sb-card group hover:border-[#3ecf8e] transition-all cursor-pointer flex flex-col border-[#ededed]"
          >
            <div className="flex items-start justify-between mb-6">
               <div className="relative">
                  <img src={tech.avatar} className="w-16 h-16 rounded-xl object-cover border border-[#ededed] shadow-sm" alt="" />
                  <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${getStatusColor(tech.status)} shadow-sm`} />
               </div>
               <div className="text-right">
                  <div className="flex items-center justify-end gap-1 text-amber-500">
                    <Star size={12} fill="currentColor" />
                    <span className="text-[11px] font-black">{tech.rating.toFixed(1)}</span>
                  </div>
                  <span className={`mt-2 inline-block px-2 py-0.5 rounded border text-[9px] font-black uppercase tracking-tight ${getStatusBadge(tech.status)}`}>
                    {tech.status}
                  </span>
               </div>
            </div>

            <div className="flex-1">
               <h3 className="text-base font-black text-[#1c1c1c] group-hover:text-[#3ecf8e] transition-colors">{tech.name}</h3>
               <p className="text-[11px] text-[#686868] mt-1 font-bold flex items-center gap-1.5"><MapPin size={12} className="text-[#3ecf8e]"/> {tech.showroom || 'Secteur Libreville'}</p>
               
               <div className="grid grid-cols-2 gap-3 mt-6">
                  <div className="p-3 bg-[#f8f9fa] border border-[#ededed] rounded-lg text-center">
                     <p className="text-[9px] font-black text-[#686868] uppercase">En cours</p>
                     <p className="text-lg font-black text-[#1c1c1c]">{tech.activeTickets}</p>
                  </div>
                  <div className="p-3 bg-[#f8f9fa] border border-[#ededed] rounded-lg text-center">
                     <p className="text-[9px] font-black text-[#686868] uppercase">Clôturés</p>
                     <p className="text-lg font-black text-[#3ecf8e]">{tech.completedTickets}</p>
                  </div>
               </div>
            </div>

            <div className="mt-6 pt-5 border-t border-[#f5f5f5] flex justify-between items-center">
               <div className="flex gap-1.5">
                  <div className="w-8 h-8 rounded-lg bg-[#f8f9fa] border border-[#ededed] flex items-center justify-center text-[#686868] hover:text-[#3ecf8e] transition-colors"><Mail size={14}/></div>
                  <div className="w-8 h-8 rounded-lg bg-[#f8f9fa] border border-[#ededed] flex items-center justify-center text-[#686868] hover:text-[#3ecf8e] transition-colors"><Phone size={14}/></div>
               </div>
               <span className="text-[10px] font-black text-[#1c1c1c] flex items-center gap-1 uppercase tracking-widest group-hover:translate-x-1 transition-transform">Détails <ChevronRight size={14} className="text-[#3ecf8e]"/></span>
            </div>
          </div>
        ))}
      </div>

      <Drawer isOpen={!!selectedTech} onClose={() => setSelectedTech(null)} title="Certification Expert" icon={<BadgeCheck size={20}/>}>
         {selectedTech && (
            <div className="space-y-8 animate-sb-entry pb-10">
               <div className="flex flex-col items-center text-center p-8 bg-[#f8f9fa] border border-[#ededed] rounded-xl">
                  <div className="relative mb-4">
                    <img src={selectedTech.avatar} className="w-24 h-24 rounded-2xl shadow-md border-2 border-white object-cover" alt="" />
                    <div className="absolute -bottom-2 -right-2 bg-amber-400 text-white p-1.5 rounded-lg border-2 border-white shadow-sm">
                       <Trophy size={16} />
                    </div>
                  </div>
                  <h3 className="text-2xl font-black text-[#1c1c1c] tracking-tight">{selectedTech.name}</h3>
                  <p className="text-[11px] text-[#3ecf8e] font-black uppercase tracking-widest mt-2 border border-[#3ecf8e]/20 px-3 py-1 rounded-full bg-[#3ecf8e]/5">
                    Expert Certifié Horizon
                  </p>
               </div>

               <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-white border border-[#ededed] rounded-xl text-center shadow-sm">
                     <p className="text-[9px] font-black text-[#686868] uppercase mb-1">Score NPS</p>
                     <p className="text-xl font-black text-[#3ecf8e]">{selectedTech.nps}</p>
                  </div>
                  <div className="p-4 bg-white border border-[#ededed] rounded-xl text-center shadow-sm">
                     <p className="text-[9px] font-black text-[#686868] uppercase mb-1">First Fix</p>
                     <p className="text-xl font-black text-blue-500">{selectedTech.firstFixRate}%</p>
                  </div>
                  <div className="p-4 bg-white border border-[#ededed] rounded-xl text-center shadow-sm">
                     <p className="text-[9px] font-black text-[#686868] uppercase mb-1">Rating</p>
                     <div className="flex items-center justify-center gap-1"><p className="text-xl font-black text-amber-500">{selectedTech.rating.toFixed(1)}</p></div>
                  </div>
               </div>

               <section className="space-y-4">
                  <h4 className="text-[11px] font-black text-[#1c1c1c] uppercase tracking-widest border-b border-[#ededed] pb-2">Spécialisations Techniques</h4>
                  <div className="flex flex-wrap gap-2">
                     {selectedTech.specialty.map(s => (
                        <span key={s} className="px-4 py-2 bg-[#f8f9fa] border border-[#ededed] rounded-lg text-[10px] font-black text-[#686868] uppercase tracking-tight">{s}</span>
                     ))}
                  </div>
               </section>

               <section className="space-y-4">
                  <h4 className="text-[11px] font-black text-[#1c1c1c] uppercase tracking-widest border-b border-[#ededed] pb-2">Coordonnées Pro</h4>
                  <div className="space-y-3">
                     <div className="flex items-center gap-3 p-3 bg-[#fcfcfc] border border-[#ededed] rounded-lg">
                        <Phone size={14} className="text-[#3ecf8e]"/>
                        <span className="text-sm font-bold text-[#1c1c1c]">{selectedTech.phone}</span>
                     </div>
                     <div className="flex items-center gap-3 p-3 bg-[#fcfcfc] border border-[#ededed] rounded-lg">
                        <Mail size={14} className="text-[#3ecf8e]"/>
                        <span className="text-sm font-medium text-[#1c1c1c]">{selectedTech.email}</span>
                     </div>
                  </div>
               </section>

               <div className="grid grid-cols-2 gap-3 pt-6">
                  <button 
                    onClick={() => { setEditingTech(selectedTech); setIsModalOpen(true); }}
                    className="btn-sb-outline h-12 justify-center font-black uppercase text-[11px] tracking-widest"
                  >
                    <Edit3 size={14}/><span>Modifier</span>
                  </button>
                  <button 
                    onClick={() => handleDeleteTech(selectedTech.id)}
                    className="btn-sb-outline h-12 justify-center font-black uppercase text-[11px] tracking-widest text-red-500 hover:bg-red-50 border-red-100"
                  >
                    <Trash2 size={14}/><span>Supprimer</span>
                  </button>
               </div>
            </div>
         )}
      </Drawer>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingTech ? "Mise à jour Fiche Expert" : "Recrutement Nouvel Expert"}>
         <form onSubmit={handleSaveTech} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-[#686868] uppercase">Nom de l'expert</label>
                  <input name="name" type="text" defaultValue={editingTech?.name} placeholder="Nom complet" required className="w-full" />
               </div>
               <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-[#686868] uppercase">Email Professionnel</label>
                  <input name="email" type="email" defaultValue={editingTech?.email} placeholder="email@royalplaza.ga" required className="w-full" />
               </div>
               <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-[#686868] uppercase">Téléphone (WhatsApp)</label>
                  <input name="phone" type="tel" defaultValue={editingTech?.phone} placeholder="+241 ..." required className="w-full" />
               </div>
               <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-[#686868] uppercase">Showroom d'affectation</label>
                  <select name="showroom" defaultValue={editingTech?.showroom || 'Glass'} className="w-full">
                     <option value="Glass">Plaza Glass</option>
                     <option value="Oloumi">Plaza Oloumi</option>
                     <option value="Bord de mer">Plaza Bord de mer</option>
                     <option value="Libreville">Libreville (Itinérant)</option>
                  </select>
               </div>
               <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-[#686868] uppercase">Statut actuel</label>
                  <select name="status" defaultValue={editingTech?.status || 'Disponible'} className="w-full">
                     <option value="Disponible">Disponible</option>
                     <option value="En intervention">En mission</option>
                     <option value="Hors ligne">Hors ligne / Congés</option>
                  </select>
               </div>
            </div>
            <div className="flex justify-end gap-3 pt-6 border-t border-[#ededed]">
               <button type="button" onClick={() => setIsModalOpen(false)} className="btn-sb-outline h-11 px-6">Annuler</button>
               <button type="submit" disabled={isSaving} className="btn-sb-primary h-11 px-10 shadow-md">
                  {isSaving ? <RefreshCw className="animate-spin" size={16}/> : 'Valider Profil'}
               </button>
            </div>
         </form>
      </Modal>
    </div>
  );
};

export default Technicians;
