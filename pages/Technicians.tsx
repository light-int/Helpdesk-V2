
import React, { useState, useEffect } from 'react';
import { 
  Users, Star, Activity, UserPlus, RefreshCw, Edit3, Trash2, 
  BadgeCheck, Trophy, ChevronRight, Mail, Phone, MapPin, Zap
} from 'lucide-react';
import { useNotifications, useData, useUser } from '../App';
import { Technician } from '../types';
import Modal from '../components/Modal';
import Drawer from '../components/Drawer';

const Technicians: React.FC = () => {
  const { technicians, isLoading, refreshAll, isSyncing, saveTechnician, deleteTechnician } = useData();
  const { currentUser } = useUser();
  const { addNotification } = useNotifications();
  
  const [selectedTech, setSelectedTech] = useState<Technician | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTech, setEditingTech] = useState<Technician | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const canManageRH = currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER';

  useEffect(() => { refreshAll(); }, [refreshAll]);

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
      addNotification({ title: 'Ressources RH', message: 'Fiche expert mise à jour.', type: 'success' });
    } catch (err) {
      addNotification({ title: 'Erreur', message: 'Échec de la sauvegarde.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTech = async (id: string) => {
    if (!window.confirm('Retirer cet expert ?')) return;
    try {
      await deleteTechnician(id);
      addNotification({ title: 'RH', message: 'Collaborateur retiré.', type: 'info' });
      setSelectedTech(null);
    } catch (err) {
      addNotification({ title: 'Erreur', message: 'Échec suppression.', type: 'error' });
    }
  };

  if (isLoading) return <div className="h-[80vh] flex items-center justify-center"><RefreshCw className="animate-spin text-[#3ecf8e]" size={32} /></div>;

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-sb-entry pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1c1c1c] tracking-tight">Ressources Techniques</h1>
          <p className="text-xs text-[#686868] mt-1 font-medium">Management des experts et techniciens Royal Plaza.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={refreshAll} className="btn-sb-outline h-10 px-3"><RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} /></button>
          {canManageRH && (
            <button onClick={() => { setEditingTech(null); setIsModalOpen(true); }} className="btn-sb-primary h-10 px-4">
              <UserPlus size={16} /> <span>Recruter Expert</span>
            </button>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Effectif Team', value: (technicians || []).length, icon: <Users size={18}/>, color: 'text-blue-500', bg: 'bg-[#eff6ff]' },
          { label: 'En Mission', value: (technicians || []).filter((t: Technician) => t.status === 'En intervention').length, icon: <Activity size={18}/>, color: 'text-amber-500', bg: 'bg-[#fffbeb]' },
          { label: 'NPS Moyen', value: '4.8/5', icon: <Star size={18}/>, color: 'text-[#3ecf8e]', bg: 'bg-[#f0fdf4]' },
          { label: 'Disponibilité', value: '88%', icon: <Zap size={18}/>, color: 'text-purple-500', bg: 'bg-[#f5f3ff]' }
        ].map((s, i) => (
          <div key={i} className="sb-card flex items-center gap-4 py-4 px-6 border-[#ededed] shadow-sm bg-white">
             <div className={`p-3 rounded-xl ${s.bg} ${s.color}`}>
               {s.icon}
             </div>
             <div>
               <p className="text-[10px] font-black text-[#686868] uppercase tracking-widest">{s.label}</p>
               <h3 className="text-xl font-black text-[#1c1c1c]">{s.value}</h3>
             </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(technicians || []).map((tech: Technician) => (
          <div key={tech.id} onClick={() => setSelectedTech(tech)} className="sb-card group hover:border-[#3ecf8e] transition-all cursor-pointer flex flex-col border-[#ededed] shadow-sm bg-white">
            <div className="flex items-start justify-between mb-6">
               <div className="relative">
                  <img src={tech.avatar} className="w-16 h-16 rounded-xl object-cover border border-[#ededed] bg-[#f8f9fa]" alt="" />
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
                  <div className="p-3 bg-[#f8f9fa] border border-[#ededed] rounded-xl text-center">
                     <p className="text-[9px] font-black text-[#686868] uppercase">En cours</p>
                     <p className="text-lg font-black text-[#1c1c1c]">{tech.activeTickets}</p>
                  </div>
                  <div className="p-3 bg-[#f8f9fa] border border-[#ededed] rounded-xl text-center">
                     <p className="text-[9px] font-black text-[#686868] uppercase">Clôturés</p>
                     <p className="text-lg font-black text-[#3ecf8e]">{tech.completedTickets}</p>
                  </div>
               </div>
            </div>

            <div className="mt-6 pt-5 border-t border-[#f5f5f5] flex justify-between items-center">
               <div className="flex gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#f8f9fa] border border-[#ededed] flex items-center justify-center text-[#686868] hover:text-[#3ecf8e]"><Mail size={14}/></div>
                  <div className="w-8 h-8 rounded-lg bg-[#f8f9fa] border border-[#ededed] flex items-center justify-center text-[#686868] hover:text-[#3ecf8e]"><Phone size={14}/></div>
               </div>
               <span className="text-[10px] font-black text-[#1c1c1c] flex items-center gap-1 uppercase tracking-widest group-hover:translate-x-1 transition-transform">Détails <ChevronRight size={14} className="text-[#3ecf8e]"/></span>
            </div>
          </div>
        ))}
      </div>

      <Drawer isOpen={!!selectedTech} onClose={() => setSelectedTech(null)} title="Fiche Certification Expert" icon={<BadgeCheck size={20}/>}>
         {selectedTech && (
            <div className="space-y-8 animate-sb-entry pb-10">
               <div className="flex flex-col items-center text-center p-8 bg-[#f8f9fa] border border-[#ededed] rounded-2xl">
                  <div className="relative mb-4">
                    <img src={selectedTech.avatar} className="w-24 h-24 rounded-3xl shadow-xl border-4 border-white object-cover" alt="" />
                    <div className="absolute -bottom-2 -right-2 bg-amber-400 text-white p-2 rounded-xl border-2 border-white shadow-lg">
                       <Trophy size={18} />
                    </div>
                  </div>
                  <h3 className="text-2xl font-black text-[#1c1c1c] tracking-tight">{selectedTech.name}</h3>
                  <p className="text-[11px] text-[#3ecf8e] font-black uppercase tracking-widest mt-2 border border-[#3ecf8e]/20 px-4 py-1.5 rounded-full bg-[#f0fdf4]">
                    Expert Certifié Plaza GABON
                  </p>
               </div>

               <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-white border border-[#ededed] rounded-2xl text-center shadow-sm">
                     <p className="text-[10px] font-black text-[#686868] uppercase mb-1">Score NPS</p>
                     <p className="text-xl font-black text-[#3ecf8e]">{selectedTech.nps}</p>
                  </div>
                  <div className="p-4 bg-white border border-[#ededed] rounded-2xl text-center shadow-sm">
                     <p className="text-[10px] font-black text-[#686868] uppercase mb-1">Fix Rate</p>
                     <p className="text-xl font-black text-blue-50">{selectedTech.firstFixRate}%</p>
                  </div>
                  <div className="p-4 bg-white border border-[#ededed] rounded-2xl text-center shadow-sm">
                     <p className="text-[10px] font-black text-[#686868] uppercase mb-1">Audit</p>
                     <p className="text-xl font-black text-amber-500">{selectedTech.rating.toFixed(1)}</p>
                  </div>
               </div>

               <section className="space-y-4">
                  <h4 className="text-[11px] font-black text-[#1c1c1c] uppercase tracking-widest border-b border-[#ededed] pb-3">Expertise & Compétences</h4>
                  <div className="flex flex-wrap gap-2">
                     {selectedTech.specialty.map((s: string) => <span key={s} className="px-3 py-1.5 bg-[#f8f9fa] border border-[#ededed] rounded-lg text-[10px] font-black text-[#686868] uppercase">{s}</span>)}
                  </div>
               </section>

               <div className="grid grid-cols-2 gap-3 pt-6">
                  <button onClick={() => { setEditingTech(selectedTech); setIsModalOpen(true); }} className="btn-sb-outline h-12 justify-center font-black uppercase text-[11px] tracking-widest rounded-xl">Modifier</button>
                  <button onClick={() => handleDeleteTech(selectedTech.id)} className="btn-sb-outline h-12 justify-center font-black uppercase text-[11px] tracking-widest text-red-500 hover:bg-red-50 border-red-100 rounded-xl">Supprimer</button>
               </div>
            </div>
         )}
      </Drawer>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingTech ? "Mise à jour Expert" : "Ouverture Fiche RH Expert"}>
         <form onSubmit={handleSaveTech} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="space-y-1.5"><label className="text-[10px] font-bold text-[#686868] uppercase">Identité Expert</label><input name="name" type="text" defaultValue={editingTech?.name} placeholder="Nom complet" required className="w-full" /></div>
               <div className="space-y-1.5"><label className="text-[10px] font-bold text-[#686868] uppercase">Email Pro</label><input name="email" type="email" defaultValue={editingTech?.email} placeholder="email@royalplaza.ga" required className="w-full" /></div>
               <div className="space-y-1.5"><label className="text-[10px] font-bold text-[#686868] uppercase">Mobile</label><input name="phone" type="tel" defaultValue={editingTech?.phone} placeholder="+241 ..." required className="w-full" /></div>
               <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-[#686868] uppercase">Showroom</label>
                  <select name="showroom" defaultValue={editingTech?.showroom || 'Glass'} className="w-full">
                     <option value="Glass">Plaza Glass</option>
                     <option value="Oloumi">Plaza Oloumi</option>
                     <option value="Bord de mer">Plaza Bord de mer</option>
                     <option value="Libreville">Mobile</option>
                  </select>
               </div>
            </div>
            <div className="flex justify-end gap-3 pt-6 border-t border-[#ededed]">
               <button type="button" onClick={() => setIsModalOpen(false)} className="btn-sb-outline">Annuler</button>
               <button type="submit" disabled={isSaving} className="btn-sb-primary h-11 px-10 shadow-md">{isSaving ? <RefreshCw className="animate-spin" size={16}/> : 'Valider Profil'}</button>
            </div>
         </form>
      </Modal>
    </div>
  );
};

export default Technicians;
