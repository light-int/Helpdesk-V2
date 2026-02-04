
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, RefreshCw, MapPin, 
  Filter, CheckCircle2, 
  Clock, Activity, Wrench, ChevronLeft, ChevronRight,
  Edit3, ClipboardCheck, LayoutList, Calendar as CalendarIcon
} from 'lucide-react';
import { useData, useNotifications, useUser } from '../App';
import { Ticket, InterventionReport, Technician } from '../types';
import Modal from '../components/Modal';
import Drawer from '../components/Drawer';

const MaintenanceLog: React.FC = () => {
  const { tickets, technicians, isLoading, refreshAll, isSyncing, saveTicket } = useData();
  const { currentUser } = useUser();
  const { addNotification } = useNotifications();
  
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Tous');
  const [techFilter, setTechFilter] = useState<string>('Tous');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedMaintenance, setSelectedMaintenance] = useState<Ticket | null>(null);
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isInterventionModalOpen, setIsInterventionModalOpen] = useState(false);
  
  // State for report editor
  const [reportData, setReportData] = useState<Partial<InterventionReport>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => { refreshAll(); }, [refreshAll]);

  const isTechnician = currentUser?.role === 'TECHNICIAN';

  const filteredMaintenance = useMemo(() => {
    return (tickets || []).filter((t: Ticket) => {
      const isTerrain = t.category === 'Maintenance' || t.category === 'Installation' || t.category === 'SAV';
      if (!isTerrain) return false;
      
      // RESTRICTION RÔLE : Un tech ne voit que son travail
      if (isTechnician && t.assignedTechnicianId !== currentUser?.id) return false;
      
      // Filtre manager
      if (!isTechnician && techFilter !== 'Tous' && t.assignedTechnicianId !== techFilter) return false;
      
      const matchesSearch = (t.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (t.id || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'Tous' || t.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    }).sort((a: Ticket, b: Ticket) => new Date(b.lastUpdate || b.createdAt || '').getTime() - new Date(a.lastUpdate || a.createdAt || '').getTime());
  }, [tickets, searchTerm, statusFilter, techFilter, currentUser, isTechnician]);

  // CALCULS STATISTIQUES PERSONNALISÉS - AJOUT DU TYPE Ticket SUR LE PARAMETRE 'm'
  const techStats = useMemo(() => {
    const total = filteredMaintenance.length;
    const resolved = filteredMaintenance.filter((m: Ticket) => m.status === 'Résolu' || m.status === 'Fermé').length;
    const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 100;
    
    return {
      active: filteredMaintenance.filter((m: Ticket) => m.status === 'En cours').length,
      pending: filteredMaintenance.filter((m: Ticket) => m.status === 'En attente d\'approbation' || m.status === 'Nouveau').length,
      rate: resolutionRate
    };
  }, [filteredMaintenance]);

  const daysInMonth = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= lastDate; i++) days.push(new Date(year, month, i));
    return days;
  }, [currentDate]);

  const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'Résolu': return 'bg-[#f0fdf4] text-[#16a34a] border-[#dcfce7]';
      case 'En attente d\'approbation': return 'bg-[#fffbeb] text-[#b45309] border-[#fef3c7]';
      case 'En cours': return 'bg-[#eff6ff] text-[#2563eb] border-[#dbeafe]';
      default: return 'bg-[#f9fafb] text-[#4b5563] border-[#f3f4f6]';
    }
  };

  const handleOpenReport = (ticket: Ticket) => {
    setSelectedMaintenance(ticket);
    setReportData(ticket.interventionReport || {
      equipmentStatus: 'Bon',
      actionsTaken: [],
      recommendations: ''
    });
    setIsInterventionModalOpen(true);
  };

  const handleSaveReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMaintenance) return;
    setIsSaving(true);
    
    const updatedTicket: Ticket = {
      ...selectedMaintenance,
      status: 'En attente d\'approbation',
      lastUpdate: new Date().toISOString(),
      interventionReport: {
        ...selectedMaintenance.interventionReport,
        ...reportData,
        performedAt: new Date().toISOString()
      }
    };

    try {
      await saveTicket(updatedTicket);
      addNotification({ title: 'Succès', message: 'Rapport enregistré et transmis.', type: 'success' });
      setIsInterventionModalOpen(false);
      refreshAll();
    } catch (err) {
      addNotification({ title: 'Erreur', message: 'Échec de l\'enregistrement.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="h-[80vh] flex items-center justify-center"><RefreshCw className="animate-spin text-[#3ecf8e]" size={32} /></div>;

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-sb-entry pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1c1c1c] tracking-tight">
            {isTechnician ? 'Mon Planning Maintenance' : 'Maintenance Terrain'}
          </h1>
          <p className="text-xs text-[#686868] mt-1 font-medium">
            {isTechnician ? 'Gestion de vos interventions et rapports techniques.' : 'Logistique et suivi des interventions Plaza.'}
          </p>
        </div>
        <div className="flex gap-2">
          <div className="flex bg-white border border-[#ededed] rounded-lg p-1 shadow-sm">
            <button 
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'list' ? 'bg-[#1c1c1c] text-white' : 'text-[#686868] hover:bg-[#f8f9fa]'}`}
            >
              <LayoutList size={14} /> Liste
            </button>
            <button 
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'calendar' ? 'bg-[#1c1c1c] text-white' : 'text-[#686868] hover:bg-[#f8f9fa]'}`}
            >
              <CalendarIcon size={14} /> Calendrier
            </button>
          </div>
          <button onClick={refreshAll} className="btn-sb-outline h-10 px-3">
             <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      {/* KPI Section - FILTRÉE POUR TECH */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: isTechnician ? 'Mes Missions Actives' : 'Missions Actives', value: techStats.active, icon: <Activity size={16}/>, color: 'text-blue-500' },
          { label: 'Validation Requise', value: techStats.pending, icon: <Clock size={16}/>, color: 'text-amber-500' },
          { label: isTechnician ? 'Mon Taux de Résolution' : 'Taux Global Cluster', value: `${techStats.rate}%`, icon: <CheckCircle2 size={16}/>, color: 'text-[#3ecf8e]' }
        ].map((s, i) => (
          <div key={i} className="sb-card flex items-center gap-4 py-4 px-6 shadow-sm border-[#ededed]">
             <div className={`p-2.5 bg-[#f8f9fa] rounded-md ${s.color}`}>{s.icon}</div>
             <div>
                <p className="text-[10px] font-bold text-[#686868] uppercase tracking-widest">{s.label}</p>
                <p className="text-xl font-black text-[#1c1c1c]">{s.value}</p>
             </div>
          </div>
        ))}
      </div>

      {viewMode === 'list' ? (
        <>
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 text-[#686868]" size={16} />
                <input 
                  type="text" 
                  placeholder="Rechercher par client ou matériel..." 
                  className="w-full pl-10 h-11 bg-white"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              <button 
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className={`btn-sb-outline h-11 px-4 ${showAdvancedFilters ? 'border-[#3ecf8e] text-[#3ecf8e]' : ''}`}
              >
                <Filter size={16} /> <span className="text-xs font-bold uppercase tracking-widest">Filtres</span>
              </button>
            </div>

            {showAdvancedFilters && (
              <div className="sb-card p-5 flex flex-wrap gap-6 animate-sb-entry bg-[#fcfcfc] border-[#ededed]">
                {!isTechnician && (
                  <div className="space-y-1.5 min-w-[180px]">
                    <label className="text-[10px] font-black text-[#686868] uppercase tracking-widest">Technicien</label>
                    <select value={techFilter} onChange={e => setTechFilter(e.target.value)} className="w-full h-10 text-xs font-bold">
                      <option value="Tous">Tous les experts</option>
                      {(technicians || []).map((t: Technician) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                )}
                <div className="space-y-1.5 min-w-[180px]">
                  <label className="text-[10px] font-black text-[#686868] uppercase tracking-widest">État du Dossier</label>
                  <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full h-10 text-xs font-bold">
                    <option value="Tous">Tous</option>
                    <option value="En cours">En cours</option>
                    <option value="En attente d'approbation">Validation</option>
                    <option value="Résolu">Résolu</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          <div className="sb-table-container shadow-sm">
            <table className="w-full text-left sb-table">
              <thead>
                <tr>
                  <th className="w-24">ID</th>
                  <th>Client & Secteur</th>
                  <th>Matériel</th>
                  {!isTechnician && <th>Expert</th>}
                  <th className="text-right">État</th>
                </tr>
              </thead>
              <tbody>
                {filteredMaintenance.map((t: Ticket) => (
                  <tr key={t.id} onClick={() => setSelectedMaintenance(t)} className="cursor-pointer group hover:bg-[#fafafa]">
                    <td className="font-mono text-[11px] font-black text-[#686868]">#{t.id}</td>
                    <td>
                      <p className="text-[13px] font-black text-[#1c1c1c]">{t.customerName}</p>
                      <p className="text-[11px] text-[#686868] flex items-center gap-1.5 font-bold"><MapPin size={10} className="text-[#3ecf8e]"/> {t.location || t.showroom}</p>
                    </td>
                    <td>
                      <p className="text-[12px] font-black text-[#1c1c1c] truncate max-w-[180px]">{t.productName || 'Matériel non spécifié'}</p>
                      <p className="text-[10px] text-[#3ecf8e] font-black uppercase tracking-tighter">{t.brand}</p>
                    </td>
                    {!isTechnician && (
                      <td>
                        <div className="flex items-center gap-2">
                          <img src={(technicians || []).find((tec: Technician) => tec.id === t.assignedTechnicianId)?.avatar} className="w-7 h-7 rounded-lg border border-[#ededed] bg-white object-cover" alt="" />
                          <span className="text-[11px] font-black text-[#4b5563]">{(technicians || []).find((tec: Technician) => tec.id === t.assignedTechnicianId)?.name.split(' ')[0] || 'Unassigned'}</span>
                        </div>
                      </td>
                    )}
                    <td className="text-right">
                      <span className={`px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${getStatusChip(t.status)}`}>
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="sb-card p-0 overflow-hidden animate-sb-entry border-[#ededed] shadow-sm bg-white">
          <div className="p-6 border-b border-[#ededed] flex items-center justify-between bg-[#fcfcfc]">
            <h2 className="text-sm font-black text-[#1c1c1c] uppercase tracking-widest">
              {currentDate.toLocaleString('fr-FR', { month: 'long', year: 'numeric' })}
            </h2>
            <div className="flex gap-2">
              <button onClick={handlePrevMonth} className="p-2.5 hover:bg-white border border-[#ededed] rounded-xl"><ChevronLeft size={18}/></button>
              <button onClick={() => setCurrentDate(new Date())} className="px-5 text-[10px] font-black uppercase border border-[#ededed] rounded-xl hover:bg-white transition-colors">Aujourd'hui</button>
              <button onClick={handleNextMonth} className="p-2.5 hover:bg-white border border-[#ededed] rounded-xl"><ChevronRight size={18}/></button>
            </div>
          </div>
          <div className="grid grid-cols-7 border-b border-[#ededed] bg-[#f8f9fa]">
            {['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map((day: string) => (
              <div key={day} className="py-2.5 text-center text-[10px] font-black text-[#686868] uppercase border-r border-[#ededed] last:border-r-0">{day}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {daysInMonth.map((date: Date | null, i: number) => {
              const dayInterventions = date ? filteredMaintenance.filter((m: Ticket) => new Date(m.createdAt || '').toDateString() === date.toDateString()) : [];
              const isToday = date?.toDateString() === new Date().toDateString();
              
              return (
                <div key={i} className={`min-h-[140px] p-2 border-r border-b border-[#ededed] transition-colors ${!date ? 'bg-[#fcfcfc]' : 'hover:bg-[#fcfcfc] bg-white'} ${i % 7 === 6 ? 'border-r-0' : ''}`}>
                  {date && (
                    <>
                      <div className="flex justify-between items-start mb-3">
                        <span className={`text-[11px] font-black ${isToday ? 'w-6 h-6 bg-[#3ecf8e] text-white flex items-center justify-center rounded-lg shadow-sm shadow-[#3ecf8e]/20' : 'text-[#686868]'}`}>
                          {date.getDate()}
                        </span>
                        {dayInterventions.length > 0 && <span className="text-[9px] font-black text-[#3ecf8e] uppercase bg-[#f0fdf4] px-1.5 rounded-sm border border-[#dcfce7]">{dayInterventions.length} Mission</span>}
                      </div>
                      <div className="space-y-1.5">
                        {dayInterventions.slice(0, 3).map((m: Ticket) => (
                          <div 
                            key={m.id} 
                            onClick={() => setSelectedMaintenance(m)}
                            className="text-[9px] p-1.5 bg-white border border-[#ededed] rounded-lg shadow-sm truncate font-black text-[#1c1c1c] cursor-pointer hover:border-[#3ecf8e] transition-all"
                          >
                            {m.customerName}
                          </div>
                        ))}
                        {dayInterventions.length > 3 && <p className="text-[8px] text-[#686868] font-black text-center uppercase tracking-tighter">+{dayInterventions.length - 3} Dossiers</p>}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ... Le reste du code Drawer et Modal reste identique car il gère l'édition du rapport déjà filtré ... */}
      <Drawer isOpen={!!selectedMaintenance} onClose={() => setSelectedMaintenance(null)} title="Contrôle Technique Intervention" icon={<ClipboardCheck size={18}/>}>
        {selectedMaintenance && (
          <div className="space-y-8 animate-sb-entry pb-10">
            <div className="p-8 bg-[#f8f9fa] border border-[#ededed] rounded-2xl shadow-sm relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-[#3ecf8e]/5 rounded-full blur-3xl -mr-16 -mt-16" />
               <div className="flex items-center gap-3 text-[#3ecf8e] mb-4 relative z-10">
                  <Activity size={18} />
                  <span className="text-[11px] font-black uppercase tracking-widest">Certification Intervention</span>
               </div>
               <h3 className="text-2xl font-black text-[#1c1c1c] tracking-tight relative z-10">{selectedMaintenance.productName || 'Sans désignation'}</h3>
               <p className="text-xs text-[#686868] font-mono mt-1.5 uppercase font-bold relative z-10">Ref: {selectedMaintenance.id} • S/N: {selectedMaintenance.serialNumber || 'NON DÉFINI'}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="p-5 bg-white border border-[#ededed] rounded-2xl shadow-sm space-y-1">
                  <p className="text-[10px] font-black text-[#686868] uppercase tracking-widest mb-1">Localisation Site</p>
                  <p className="text-[13px] font-black text-[#1c1c1c] flex items-center gap-2"><MapPin size={14} className="text-[#3ecf8e]"/> {selectedMaintenance.location || 'Site Central'}</p>
               </div>
               <div className="p-5 bg-white border border-[#ededed] rounded-2xl shadow-sm space-y-1">
                  <p className="text-[10px] font-black text-[#686868] uppercase tracking-widest mb-1">Échéance Cluster</p>
                  <p className="text-[13px] font-black text-[#1c1c1c] flex items-center gap-2"><CalendarIcon size={14} className="text-[#3ecf8e]"/> {new Date(selectedMaintenance.createdAt || '').toLocaleDateString()}</p>
               </div>
            </div>

            <section className="space-y-5">
               <h4 className="text-[11px] font-black text-[#686868] uppercase tracking-widest border-b border-[#f5f5f5] pb-3">Expertise Technique</h4>
               {selectedMaintenance.interventionReport?.equipmentStatus ? (
                 <div className="space-y-5">
                    <div className="p-5 bg-[#f0fdf4] border border-[#dcfce7] rounded-2xl">
                       <p className="text-[10px] font-black text-[#16a34a] uppercase tracking-widest mb-2">Verdict Matériel</p>
                       <p className="text-lg font-black text-[#1c1c1c]">{selectedMaintenance.interventionReport.equipmentStatus}</p>
                    </div>
                    <div className="space-y-3">
                       <p className="text-[10px] font-black text-[#686868] uppercase tracking-widest">Actions de Maintenance</p>
                       <div className="flex flex-wrap gap-2">
                          {(selectedMaintenance.interventionReport.actionsTaken || []).map((a: string, i: number) => (
                            <span key={i} className="px-3 py-1.5 bg-[#f8f9fa] border border-[#ededed] text-[10px] font-black uppercase rounded-lg text-[#4b5563] shadow-sm">{a}</span>
                          ))}
                       </div>
                    </div>
                    <div className="p-5 bg-[#fcfcfc] border border-[#ededed] rounded-2xl">
                       <p className="text-[10px] font-black text-[#686868] uppercase mb-2 tracking-widest">Préconisations Expert</p>
                       <p className="text-[13px] text-[#4b5563] italic leading-relaxed">"{selectedMaintenance.interventionReport.recommendations || 'Aucune recommandation enregistrée.'}"</p>
                    </div>
                 </div>
               ) : (
                 <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-[#ededed] rounded-3xl bg-[#fcfcfc] text-center px-10">
                    <Wrench size={40} className="text-[#dadce0] mb-5" />
                    <p className="text-[11px] text-[#686868] font-black uppercase tracking-widest mb-6">En attente de rapport final</p>
                    <button onClick={() => handleOpenReport(selectedMaintenance)} className="btn-sb-primary h-12 px-10 rounded-xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-[#3ecf8e]/10">Éditer le Rapport</button>
                 </div>
               )}
            </section>

            {selectedMaintenance.interventionReport?.equipmentStatus && (
              <button onClick={() => handleOpenReport(selectedMaintenance)} className="btn-sb-outline w-full justify-center gap-3 h-14 font-black uppercase text-[11px] tracking-widest rounded-2xl transition-all hover:bg-[#fcfcfc]">
                <Edit3 size={16}/><span>Ajuster le rapport technique</span>
              </button>
            )}
          </div>
        )}
      </Drawer>

      <Modal isOpen={isInterventionModalOpen} onClose={() => setIsInterventionModalOpen(false)} title="Validation d'Intervention">
         <form onSubmit={handleSaveReport} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-[#686868] uppercase tracking-widest">Verdict Technique</label>
                  <select 
                    className="w-full h-12 font-bold px-4 rounded-xl border-[#ededed]"
                    value={reportData.equipmentStatus}
                    onChange={e => setReportData({...reportData, equipmentStatus: e.target.value as any})}
                  >
                     <option value="Excellent">Parfait État</option>
                     <option value="Bon">Opérationnel</option>
                     <option value="Critique">Critique (Réparation en attente)</option>
                     <option value="À remplacer">Déclassement requis</option>
                  </select>
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-[#686868] uppercase tracking-widest">Temps Technique (Minutes)</label>
                  <input 
                    type="number" className="w-full h-12 font-bold px-4 rounded-xl border-[#ededed]" placeholder="Minutes" 
                    onChange={e => setReportData({...reportData, durationMs: parseInt(e.target.value) * 60000})}
                  />
               </div>
            </div>

            <div className="space-y-2">
               <label className="text-[10px] font-black text-[#686868] uppercase tracking-widest">Actions Menées (Séparateur: Virgule)</label>
               <textarea 
                  rows={2} className="w-full font-bold p-4 rounded-xl border-[#ededed]" placeholder="ex: Lavage haute pression, Contrôle gaz..." 
                  value={reportData.actionsTaken?.join(', ')}
                  onChange={e => setReportData({...reportData, actionsTaken: e.target.value.split(',').map(s => s.trim())})}
               />
            </div>

            <div className="space-y-2">
               <label className="text-[10px] font-black text-[#686868] uppercase tracking-widest">Recommandations Client</label>
               <textarea 
                  rows={3} className="w-full font-bold p-4 rounded-xl border-[#ededed]" placeholder="Conseils d'utilisation ou entretien..." 
                  value={reportData.recommendations}
                  onChange={e => setReportData({...reportData, recommendations: e.target.value})}
               />
            </div>

            <div className="flex justify-end gap-3 pt-8 border-t border-[#f5f5f5]">
               <button type="button" onClick={() => setIsInterventionModalOpen(false)} className="btn-sb-outline h-12 px-8 text-[11px] font-black uppercase rounded-xl">Annuler</button>
               <button type="submit" disabled={isSaving} className="btn-sb-primary h-12 px-12 text-[11px] font-black uppercase rounded-xl shadow-lg shadow-[#3ecf8e]/20">
                  {isSaving ? <RefreshCw className="animate-spin" size={18}/> : 'Certifier Rapport'}
               </button>
            </div>
         </form>
      </Modal>
    </div>
  );
};

export default MaintenanceLog;
