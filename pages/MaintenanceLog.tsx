
import React, { useState, useMemo, useEffect } from 'react';
import { 
  ClipboardList, Search, RefreshCw, CalendarDays, MapPin, 
  Filter, User, History, Package, CheckCircle2, 
  Clock, Activity, Wrench, ChevronLeft, ChevronRight, Plus, Trash2, Save,
  AlertTriangle, ShieldCheck, Tag, Lock,
  SlidersHorizontal, RotateCcw, Boxes, MapPinned, Users, 
  Edit3, ClipboardCheck, LayoutList, Calendar as CalendarIcon
} from 'lucide-react';
import { useData, useNotifications, useUser } from '../App';
import { Ticket, UsedPart, InterventionReport } from '../types';
import Modal from '../components/Modal';
import Drawer from '../components/Drawer';

const MaintenanceLog: React.FC = () => {
  const { tickets, technicians, isLoading, refreshAll, isSyncing, saveTicket, showrooms } = useData();
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

  useEffect(() => { refreshAll(); }, []);

  const filteredMaintenance = useMemo(() => {
    return tickets.filter(t => {
      const isTerrain = t.category === 'Maintenance' || t.category === 'Installation' || t.category === 'SAV';
      if (!isTerrain) return false;
      if (currentUser?.role === 'TECHNICIAN' && t.assignedTechnicianId !== currentUser.id) return false;
      if (techFilter !== 'Tous' && t.assignedTechnicianId !== techFilter) return false;
      
      const matchesSearch = (t.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (t.id || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'Tous' || t.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    }).sort((a, b) => new Date(b.lastUpdate || b.createdAt).getTime() - new Date(a.lastUpdate || a.createdAt).getTime());
  }, [tickets, searchTerm, statusFilter, techFilter, currentUser]);

  // Calendar Logic
  const daysInMonth = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    // Padding for first day of week (assuming Sunday start, adjust if needed)
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
          <h1 className="text-2xl font-bold text-[#1c1c1c] tracking-tight">Maintenance Terrain</h1>
          <p className="text-xs text-[#686868] mt-1 font-medium">Planification et suivi des interventions techniques Royal Plaza.</p>
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

      {/* KPI Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Interventions Actives', value: filteredMaintenance.filter(m => m.status === 'En cours').length, icon: <Activity size={16}/>, color: 'text-blue-500' },
          { label: 'En attente Validation', value: filteredMaintenance.filter(m => m.status === 'En attente d\'approbation').length, icon: <Clock size={16}/>, color: 'text-amber-500' },
          { label: 'Taux de Résolution', value: '94%', icon: <CheckCircle2 size={16}/>, color: 'text-[#3ecf8e]' }
        ].map((s, i) => (
          <div key={i} className="sb-card flex items-center gap-4 py-4 px-6">
             <div className={`p-2.5 bg-[#f8f9fa] rounded-md ${s.color}`}>{s.icon}</div>
             <div>
                <p className="text-[10px] font-bold text-[#686868] uppercase tracking-widest">{s.label}</p>
                <p className="text-xl font-bold text-[#1c1c1c]">{s.value}</p>
             </div>
          </div>
        ))}
      </div>

      {viewMode === 'list' ? (
        <>
          {/* Filters Area */}
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 text-[#686868]" size={16} />
                <input 
                  type="text" 
                  placeholder="Rechercher un dossier ou client..." 
                  className="w-full pl-10 h-11"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              <button 
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className={`btn-sb-outline h-11 px-4 ${showAdvancedFilters ? 'border-[#3ecf8e] text-[#3ecf8e]' : ''}`}
              >
                <Filter size={16} /> <span className="text-xs">Filtres</span>
              </button>
            </div>

            {showAdvancedFilters && (
              <div className="sb-card p-4 flex flex-wrap gap-6 animate-sb-entry bg-[#fcfcfc]">
                <div className="space-y-1.5 min-w-[180px]">
                  <label className="text-[10px] font-bold text-[#686868] uppercase">Technicien</label>
                  <select value={techFilter} onChange={e => setTechFilter(e.target.value)} className="w-full h-9 text-xs">
                    <option value="Tous">Tous les experts</option>
                    {technicians.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5 min-w-[180px]">
                  <label className="text-[10px] font-bold text-[#686868] uppercase">Statut</label>
                  <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full h-9 text-xs">
                    <option value="Tous">Tous les statuts</option>
                    <option value="En cours">En cours</option>
                    <option value="En attente d'approbation">En attente</option>
                    <option value="Résolu">Résolu</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Table Area */}
          <div className="sb-table-container">
            <table className="w-full text-left sb-table">
              <thead>
                <tr>
                  <th className="w-24">ID</th>
                  <th>Client & Localisation</th>
                  <th>Matériel</th>
                  <th>Technicien</th>
                  <th className="text-right">État</th>
                </tr>
              </thead>
              <tbody>
                {filteredMaintenance.map((t) => (
                  <tr key={t.id} onClick={() => setSelectedMaintenance(t)} className="cursor-pointer group">
                    <td className="font-mono text-[11px] font-black text-[#686868]">#{t.id}</td>
                    <td>
                      <p className="text-[13px] font-bold text-[#1c1c1c]">{t.customerName}</p>
                      <p className="text-[11px] text-[#686868] flex items-center gap-1.5"><MapPin size={10}/> {t.location || t.showroom}</p>
                    </td>
                    <td>
                      <p className="text-[12px] font-medium text-[#1c1c1c]">{t.productName}</p>
                      <p className="text-[10px] text-[#3ecf8e] font-bold uppercase">{t.brand}</p>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <img src={technicians.find(tec => tec.id === t.assignedTechnicianId)?.avatar} className="w-6 h-6 rounded-md border border-[#ededed]" alt="" />
                        <span className="text-[11px] font-bold text-[#4b5563]">{technicians.find(tec => tec.id === t.assignedTechnicianId)?.name.split(' ')[0]}</span>
                      </div>
                    </td>
                    <td className="text-right">
                      <span className={`px-2 py-0.5 rounded border text-[10px] font-black uppercase tracking-tight ${getStatusChip(t.status)}`}>
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
        /* Calendar View */
        <div className="sb-card p-0 overflow-hidden animate-sb-entry border-[#ededed]">
          <div className="p-6 border-b border-[#ededed] flex items-center justify-between bg-[#fcfcfc]">
            <h2 className="text-sm font-bold text-[#1c1c1c] uppercase tracking-widest">
              {currentDate.toLocaleString('fr-FR', { month: 'long', year: 'numeric' })}
            </h2>
            <div className="flex gap-1">
              <button onClick={handlePrevMonth} className="p-2 hover:bg-white border border-transparent hover:border-[#ededed] rounded-md"><ChevronLeft size={16}/></button>
              <button onClick={() => setCurrentDate(new Date())} className="px-3 text-[10px] font-bold uppercase hover:bg-white border border-transparent hover:border-[#ededed] rounded-md">Aujourd'hui</button>
              <button onClick={handleNextMonth} className="p-2 hover:bg-white border border-transparent hover:border-[#ededed] rounded-md"><ChevronRight size={16}/></button>
            </div>
          </div>
          <div className="grid grid-cols-7 border-b border-[#ededed] bg-[#f8f9fa]">
            {['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map(day => (
              <div key={day} className="py-2 text-center text-[10px] font-black text-[#686868] uppercase border-r border-[#ededed] last:border-r-0">{day}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {daysInMonth.map((date, i) => {
              const dayInterventions = date ? filteredMaintenance.filter(m => new Date(m.createdAt).toDateString() === date.toDateString()) : [];
              const isToday = date?.toDateString() === new Date().toDateString();
              
              return (
                <div key={i} className={`min-h-[120px] p-2 border-r border-b border-[#ededed] transition-colors ${!date ? 'bg-[#fcfcfc]' : 'hover:bg-[#fcfcfc]'} ${i % 7 === 6 ? 'border-r-0' : ''}`}>
                  {date && (
                    <>
                      <div className="flex justify-between items-start mb-2">
                        <span className={`text-xs font-black ${isToday ? 'w-6 h-6 bg-[#3ecf8e] text-white flex items-center justify-center rounded-full' : 'text-[#686868]'}`}>
                          {date.getDate()}
                        </span>
                        {dayInterventions.length > 0 && <span className="text-[9px] font-bold text-[#3ecf8e]">{dayInterventions.length} intervention(s)</span>}
                      </div>
                      <div className="space-y-1">
                        {dayInterventions.slice(0, 3).map(m => (
                          <div 
                            key={m.id} 
                            onClick={() => setSelectedMaintenance(m)}
                            className="text-[9px] p-1 bg-white border border-[#ededed] rounded shadow-sm truncate font-bold text-[#1c1c1c] cursor-pointer hover:border-[#3ecf8e]"
                          >
                            {m.customerName}
                          </div>
                        ))}
                        {dayInterventions.length > 3 && <p className="text-[8px] text-[#686868] font-bold text-center">+{dayInterventions.length - 3} autres</p>}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Drawer & Modal for Reports */}
      <Drawer isOpen={!!selectedMaintenance} onClose={() => setSelectedMaintenance(null)} title="Dossier Maintenance" icon={<ClipboardCheck size={18}/>}>
        {selectedMaintenance && (
          <div className="space-y-8 animate-sb-entry">
            <div className="p-6 bg-[#f8f9fa] border border-[#ededed] rounded-xl">
               <div className="flex items-center gap-2 text-[#3ecf8e] mb-3">
                  <Activity size={14} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Rapport de terrain</span>
               </div>
               <h3 className="text-xl font-bold text-[#1c1c1c]">{selectedMaintenance.productName}</h3>
               <p className="text-xs text-[#686868] font-mono mt-1 uppercase">S/N: {selectedMaintenance.serialNumber || 'NON RENSEIGNÉ'}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="p-4 bg-white border border-[#ededed] rounded-lg">
                  <p className="text-[10px] font-black text-[#686868] uppercase mb-1">Localisation</p>
                  <p className="text-sm font-bold text-[#1c1c1c] flex items-center gap-2"><MapPin size={14} className="text-[#3ecf8e]"/> {selectedMaintenance.location || 'Site indéfini'}</p>
               </div>
               <div className="p-4 bg-white border border-[#ededed] rounded-lg">
                  <p className="text-[10px] font-black text-[#686868] uppercase mb-1">Date prévisionnelle</p>
                  <p className="text-sm font-bold text-[#1c1c1c] flex items-center gap-2"><CalendarIcon size={14} className="text-[#3ecf8e]"/> {new Date(selectedMaintenance.createdAt).toLocaleDateString()}</p>
               </div>
            </div>

            <section className="space-y-4">
               <h4 className="text-[11px] font-black text-[#686868] uppercase tracking-widest border-b border-[#ededed] pb-2">Rapport Technique</h4>
               {selectedMaintenance.interventionReport?.equipmentStatus ? (
                 <div className="space-y-4">
                    <div className="p-4 bg-[#f0fdf4] border border-[#dcfce7] rounded-lg">
                       <p className="text-[10px] font-black text-[#16a34a] uppercase mb-1">État matériel constaté</p>
                       <p className="text-sm font-bold text-[#1c1c1c]">{selectedMaintenance.interventionReport.equipmentStatus}</p>
                    </div>
                    <div className="space-y-2">
                       <p className="text-[10px] font-black text-[#686868] uppercase">Actions menées</p>
                       <div className="flex flex-wrap gap-2">
                          {selectedMaintenance.interventionReport.actionsTaken?.map((a, i) => (
                            <span key={i} className="px-2 py-1 bg-[#f8f9fa] border border-[#ededed] text-[10px] font-bold rounded">{a}</span>
                          ))}
                       </div>
                    </div>
                    <div className="p-4 bg-[#fcfcfc] border border-[#ededed] rounded-lg">
                       <p className="text-[10px] font-black text-[#686868] uppercase mb-1">Recommandations</p>
                       <p className="text-[12px] text-[#4b5563] italic">"{selectedMaintenance.interventionReport.recommendations || 'Aucune recommandation.'}"</p>
                    </div>
                 </div>
               ) : (
                 <div className="flex flex-col items-center justify-center py-10 border-2 border-dashed border-[#ededed] rounded-xl bg-[#fcfcfc] text-center">
                    <Wrench size={32} className="text-[#dadce0] mb-4" />
                    <p className="text-xs text-[#686868] font-bold uppercase tracking-widest mb-4">Aucun rapport enregistré</p>
                    <button onClick={() => handleOpenReport(selectedMaintenance)} className="btn-sb-primary">Remplir le rapport</button>
                 </div>
               )}
            </section>

            {selectedMaintenance.interventionReport?.equipmentStatus && (
              <button onClick={() => handleOpenReport(selectedMaintenance)} className="btn-sb-outline w-full justify-center gap-2 h-12 font-black uppercase text-[11px] tracking-widest">
                <Edit3 size={14}/><span>Modifier le rapport</span>
              </button>
            )}
          </div>
        )}
      </Drawer>

      <Modal isOpen={isInterventionModalOpen} onClose={() => setIsInterventionModalOpen(false)} title="Édition Rapport d'Intervention">
         <form onSubmit={handleSaveReport} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-[#686868] uppercase">État final du matériel</label>
                  <select 
                    className="w-full h-11"
                    value={reportData.equipmentStatus}
                    onChange={e => setReportData({...reportData, equipmentStatus: e.target.value as any})}
                  >
                     <option value="Excellent">Excellent</option>
                     <option value="Bon">Bon / Opérationnel</option>
                     <option value="Critique">Critique / Réparation nécessaire</option>
                     <option value="À remplacer">À remplacer impérativement</option>
                  </select>
               </div>
               <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-[#686868] uppercase">Durée de l'intervention (Minutes)</label>
                  <input 
                    type="number" className="w-full h-11" placeholder="ex: 45" 
                    onChange={e => setReportData({...reportData, durationMs: parseInt(e.target.value) * 60000})}
                  />
               </div>
            </div>

            <div className="space-y-1.5">
               <label className="text-[10px] font-black text-[#686868] uppercase">Actions entreprises (séparées par des virgules)</label>
               <textarea 
                  rows={2} className="w-full" placeholder="ex: Nettoyage filtres, Recharge gaz..." 
                  value={reportData.actionsTaken?.join(', ')}
                  onChange={e => setReportData({...reportData, actionsTaken: e.target.value.split(',').map(s => s.trim())})}
               />
            </div>

            <div className="space-y-1.5">
               <label className="text-[10px] font-black text-[#686868] uppercase">Recommandations client</label>
               <textarea 
                  rows={3} className="w-full" placeholder="Préconisations pour le client..." 
                  value={reportData.recommendations}
                  onChange={e => setReportData({...reportData, recommendations: e.target.value})}
               />
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-[#ededed]">
               <button type="button" onClick={() => setIsInterventionModalOpen(false)} className="btn-sb-outline h-11 px-6">Annuler</button>
               <button type="submit" disabled={isSaving} className="btn-sb-primary h-11 px-8 shadow-md">
                  {isSaving ? <RefreshCw className="animate-spin" size={16}/> : 'Valider le Rapport'}
               </button>
            </div>
         </form>
      </Modal>
    </div>
  );
};

export default MaintenanceLog;
