import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, RefreshCw, MapPin, 
  Filter, CheckCircle2, 
  Clock, Activity, Wrench, ChevronLeft, ChevronRight,
  Edit3, ClipboardCheck, LayoutList, Calendar as CalendarIcon,
  Plus, Trash2, Package, Tag, AlertTriangle, Info, X, Zap,
  User, Phone, ShieldCheck, ClipboardList, Lock
} from 'lucide-react';
import { useData, useNotifications, useUser } from '../App';
import { Ticket, InterventionReport, Technician, Part, UsedPart } from '../types';
import Modal from '../components/Modal';
import Drawer from '../components/Drawer';

const PREDEFINED_ACTIONS = [
  "Nettoyage complet",
  "Contrôle circuit gaz",
  "Remplacement thermostat",
  "Mise à jour firmware",
  "Calibrage capteurs",
  "Serrage connectiques",
  "Test de charge",
  "Lubrification mécanique",
  "Dépoussiérage filtres",
  "Remplacement joints"
];

const MaintenanceLog: React.FC = () => {
  const { tickets, technicians, parts, isLoading, refreshAll, isSyncing, saveTicket, addStockMovement } = useData();
  const { currentUser } = useUser();
  const { addNotification } = useNotifications();
  
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Tous');
  const [techFilter, setTechFilter] = useState<string>('Tous');
  const [selectedMaintenance, setSelectedMaintenance] = useState<Ticket | null>(null);
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isInterventionModalOpen, setIsInterventionModalOpen] = useState(false);
  
  // State for report editor
  const [reportData, setReportData] = useState<Partial<InterventionReport>>({});
  const [usedParts, setUsedParts] = useState<UsedPart[]>([]);
  const [currentActionInput, setCurrentActionInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => { refreshAll(); }, [refreshAll]);

  const isTechnician = currentUser?.role === 'TECHNICIAN';

  const filteredMaintenance = useMemo(() => {
    return (tickets || []).filter((t: Ticket) => {
      const isTerrain = t.category === 'Maintenance' || t.category === 'Installation' || t.category === 'SAV';
      if (!isTerrain) return false;
      if (isTechnician && t.assignedTechnicianId !== currentUser?.id) return false;
      if (!isTechnician && techFilter !== 'Tous' && t.assignedTechnicianId !== techFilter) return false;
      
      const matchesSearch = (t.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (t.id || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'Tous' || t.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    }).sort((a: Ticket, b: Ticket) => new Date(b.lastUpdate || b.createdAt || '').getTime() - new Date(a.lastUpdate || a.createdAt || '').getTime());
  }, [tickets, searchTerm, statusFilter, techFilter, currentUser, isTechnician]);

  const techStats = useMemo(() => {
    const total = filteredMaintenance.length;
    const resolved = filteredMaintenance.filter((m: Ticket) => m.status === 'Résolu' || m.status === 'Fermé').length;
    return {
      active: filteredMaintenance.filter((m: Ticket) => m.status === 'En cours').length,
      pending: filteredMaintenance.filter((m: Ticket) => m.status === 'En attente d\'approbation' || m.status === 'Nouveau').length,
      rate: total > 0 ? Math.round((resolved / total) * 100) : 100
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

  const handleOpenReport = (ticket: Ticket) => {
    setSelectedMaintenance(ticket);
    
    // Initialisation sécurisée du rapport
    const existingReport = ticket.interventionReport || {};
    setReportData({
      equipmentStatus: existingReport.equipmentStatus || 'Bon',
      actionsTaken: existingReport.actionsTaken || [],
      recommendations: existingReport.recommendations || '',
      detailedDiagnostic: existingReport.detailedDiagnostic || '',
      repairProcedure: existingReport.repairProcedure || '',
      internalNotes: existingReport.internalNotes || '',
      isWarrantyValid: existingReport.isWarrantyValid ?? true,
      durationMs: existingReport.durationMs || 0,
      startedAt: existingReport.startedAt || new Date().toISOString()
    });
    setUsedParts(existingReport.partsUsed || []);
    setIsInterventionModalOpen(true);
  };

  const addAction = (action: string) => {
    const trimmed = action.trim();
    if (!trimmed) return;
    const currentActions = reportData.actionsTaken || [];
    if (!currentActions.includes(trimmed)) {
      setReportData({ ...reportData, actionsTaken: [...currentActions, trimmed] });
    }
    setCurrentActionInput('');
  };

  const removeAction = (index: number) => {
    const currentActions = [...(reportData.actionsTaken || [])];
    currentActions.splice(index, 1);
    setReportData({ ...reportData, actionsTaken: currentActions });
  };

  const handleAddPart = () => {
    setUsedParts([...usedParts, { name: '', quantity: 1, unitPrice: 0 }]);
  };

  const handleRemovePart = (index: number) => {
    setUsedParts(usedParts.filter((_, i) => i !== index));
  };

  const handlePartChange = (index: number, field: keyof UsedPart, value: any) => {
    const updated = [...usedParts];
    if (field === 'name') {
      const part = parts.find((p: Part) => p.name === value);
      if (part) {
        updated[index] = { ...updated[index], name: part.name, unitPrice: part.unitPrice, id: part.id };
      } else {
        updated[index] = { ...updated[index], [field]: value };
      }
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setUsedParts(updated);
  };

  const handleSaveReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMaintenance) return;

    if (!reportData.equipmentStatus) {
      addNotification({ title: 'Rapport incomplet', message: 'Veuillez sélectionner un diagnostic final.', type: 'warning' });
      return;
    }

    setIsSaving(true);
    const finalDuration = reportData.durationMs && !isNaN(reportData.durationMs) ? reportData.durationMs : 0;

    // Nettoyage des pièces : on ne garde que celles qui ont un nom
    const cleanedParts = usedParts.filter((p: UsedPart) => p.name.trim() !== '');

    const finalReport: InterventionReport = {
      ...reportData,
      durationMs: finalDuration,
      partsUsed: cleanedParts,
      performedAt: new Date().toISOString(),
      actionsTaken: reportData.actionsTaken || []
    };

    const updatedTicket: Ticket = {
      ...selectedMaintenance,
      status: 'En attente d\'approbation',
      lastUpdate: new Date().toISOString(),
      interventionReport: finalReport
    };

    try {
      // 1. Sauvegarde du ticket/rapport
      await saveTicket(updatedTicket);

      // 2. LOGIQUE DE RÉDUCTION DES STOCKS
      // On diminue le stock pour chaque pièce sélectionnée dans le catalogue
      // Uniquement si le ticket n'était pas déjà en attente (pour éviter les doubles décomptes en cas d'édit simple)
      if (selectedMaintenance.status !== 'En attente d\'approbation') {
        for (const p of cleanedParts) {
          if (p.id && p.quantity > 0) {
            try {
              await addStockMovement({
                partId: p.id,
                partName: p.name,
                quantity: p.quantity,
                type: 'OUT',
                reason: `Intervention Ticket #${selectedMaintenance.id}`,
                performedBy: currentUser?.name || 'Technicien Royal Plaza',
                ticketId: selectedMaintenance.id
              });
            } catch (stockErr) {
              console.error(`Échec décompte stock pour ${p.name}:`, stockErr);
            }
          }
        }
      }

      addNotification({ title: 'Certification réussie', message: 'Le rapport détaillé a été synchronisé et les stocks mis à jour.', type: 'success' });
      setIsInterventionModalOpen(false);
      setSelectedMaintenance(updatedTicket);
      refreshAll();
    } catch (err) {
      console.error("Submission Error:", err);
      addNotification({ title: 'Erreur Cluster', message: 'Échec de la transmission du rapport technique.', type: 'error' });
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
          <p className="text-xs text-[#686868] mt-1 font-medium">Gestion de vos interventions et rapports techniques certifiés.</p>
        </div>
        <div className="flex gap-2">
          <div className="flex bg-white border border-[#ededed] rounded-lg p-1 shadow-sm">
            <button onClick={() => setViewMode('list')} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold ${viewMode === 'list' ? 'bg-[#1c1c1c] text-white' : 'text-[#686868]'}`}><LayoutList size={14} /> Liste</button>
            <button onClick={() => setViewMode('calendar')} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold ${viewMode === 'calendar' ? 'bg-[#1c1c1c] text-white' : 'text-[#686868]'}`}><CalendarIcon size={14} /> Calendrier</button>
          </div>
          <button onClick={refreshAll} className="btn-sb-outline h-10 px-3"><RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} /></button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Missions Actives', value: techStats.active, icon: <Activity size={16}/>, color: 'text-blue-500' },
          { label: 'En attente validation', value: techStats.pending, icon: <Clock size={16}/>, color: 'text-amber-500' },
          { label: 'Taux Résolution', value: `${techStats.rate}%`, icon: <CheckCircle2 size={16}/>, color: 'text-[#3ecf8e]' }
        ].map((s, i) => (
          <div key={i} className="sb-card flex items-center gap-4 py-4 px-6 border-[#ededed] shadow-sm bg-white">
             <div className={`p-2.5 bg-[#f8f9fa] rounded-lg ${s.color}`}>{s.icon}</div>
             <div><p className="text-[10px] font-bold text-[#686868] uppercase tracking-widest">{s.label}</p><p className="text-xl font-black text-[#1c1c1c]">{s.value}</p></div>
          </div>
        ))}
      </div>

      {viewMode === 'list' ? (
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
                  <td className="font-mono text-[11px] font-black group-hover:text-[#3ecf8e]">#{t.id}</td>
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
                        <img src={(technicians || []).find((tec: Technician) => tec.id === t.assignedTechnicianId)?.avatar} className="w-7 h-7 rounded-lg border border-[#ededed] object-cover" alt="" />
                        <span className="text-[11px] font-black text-[#4b5563]">{(technicians || []).find((tec: Technician) => tec.id === t.assignedTechnicianId)?.name.split(' ')[0]}</span>
                      </div>
                    </td>
                  )}
                  <td className="text-right">
                    <span className={`px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${
                      t.status === 'Résolu' ? 'bg-[#f0fdf4] text-[#16a34a] border-[#dcfce7]' : 
                      t.status === 'En cours' ? 'bg-[#eff6ff] text-[#2563eb] border-[#dbeafe]' : 'bg-[#f9fafb] text-[#4b5563] border-[#f3f4f6]'
                    }`}>{t.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="sb-card p-0 border-[#ededed] shadow-sm bg-white overflow-hidden">
           <div className="p-6 border-b border-[#ededed] flex items-center justify-between bg-[#fcfcfc]">
              <h2 className="text-sm font-black text-[#1c1c1c] uppercase tracking-widest">{currentDate.toLocaleString('fr-FR', { month: 'long', year: 'numeric' })}</h2>
              <div className="flex gap-2">
                <button onClick={handlePrevMonth} className="p-2 hover:bg-white border border-[#ededed] rounded-lg"><ChevronLeft size={18}/></button>
                <button onClick={handleNextMonth} className="p-2 hover:bg-white border border-[#ededed] rounded-lg"><ChevronRight size={18}/></button>
              </div>
           </div>
           <div className="grid grid-cols-7 border-b border-[#ededed] bg-[#f8f9fa]">
              {['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map((day: string) => <div key={day} className="py-2.5 text-center text-[10px] font-black text-[#686868] uppercase border-r border-[#ededed] last:border-r-0">{day}</div>)}
           </div>
           <div className="grid grid-cols-7">
              {daysInMonth.map((date: Date | null, i: number) => {
                const dayInterventions = date ? filteredMaintenance.filter((m: Ticket) => new Date(m.createdAt || '').toDateString() === date.toDateString()) : [];
                return (
                  <div key={i} className={`min-h-[120px] p-2 border-r border-b border-[#ededed] ${!date ? 'bg-[#fcfcfc]' : 'bg-white'} ${i % 7 === 6 ? 'border-r-0' : ''}`}>
                    {date && (
                      <>
                        <p className="text-[11px] font-black text-[#686868] mb-2">{date.getDate()}</p>
                        <div className="space-y-1">
                          {dayInterventions.map((m: Ticket) => (
                            <div key={m.id} onClick={() => setSelectedMaintenance(m)} className="text-[9px] p-1 bg-[#f0fdf4] border border-[#dcfce7] rounded shadow-xs truncate font-black text-[#16a34a] cursor-pointer hover:border-[#3ecf8e]">
                               {m.customerName}
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
           </div>
        </div>
      )}

      <Drawer isOpen={!!selectedMaintenance} onClose={() => setSelectedMaintenance(null)} title="Détails Intervention" icon={<ClipboardCheck size={18}/>}>
        {selectedMaintenance && (
          <div className="space-y-8 pb-10">
            {/* --- SECTION BENEFICIAIRE (ACCES TECHNICIEN) --- */}
            <div className="space-y-4">
              <h4 className="text-[11px] font-black text-[#686868] uppercase tracking-widest flex items-center gap-2">
                <User size={14} className="text-[#3ecf8e]"/> Coordonnées Bénéficiaire
              </h4>
              <div className="p-5 bg-white border border-[#ededed] rounded-2xl shadow-sm space-y-4">
                 <div>
                    <p className="text-[10px] font-black text-[#9ca3af] uppercase mb-1">Identité Client</p>
                    <p className="text-base font-black text-[#1c1c1c]">{selectedMaintenance.customerName}</p>
                 </div>
                 <div className="grid grid-cols-2 gap-4 pt-2">
                    <a href={`tel:${selectedMaintenance.customerPhone}`} className="flex items-center gap-3 p-3 bg-[#f0fdf4] border border-[#dcfce7] rounded-xl group hover:bg-[#3ecf8e] transition-all">
                       <Phone size={16} className="text-[#3ecf8e] group-hover:text-white" />
                       <span className="text-[12px] font-black text-[#1c1c1c] group-hover:text-white">{selectedMaintenance.customerPhone || '—'}</span>
                    </a>
                    <div className="flex items-center gap-3 p-3 bg-[#f8f9fa] border border-[#ededed] rounded-xl">
                       <MapPin size={16} className="text-[#3ecf8e]" />
                       <span className="text-[11px] font-bold text-[#4b5563] truncate">{selectedMaintenance.location || selectedMaintenance.showroom}</span>
                    </div>
                 </div>
              </div>
            </div>

            <div className="p-6 bg-[#f8f9fa] border border-[#ededed] rounded-2xl">
               <div className="flex items-center gap-2 text-[#3ecf8e] mb-3">
                  <Activity size={14} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Certification Technique</span>
               </div>
               <h3 className="text-xl font-black text-[#1c1c1c]">{selectedMaintenance.productName || 'Matériel Royal Plaza'}</h3>
               <p className="text-xs text-[#686868] font-bold mt-1 uppercase">S/N: {selectedMaintenance.serialNumber || 'NON SPÉCIFIÉ'}</p>
            </div>

            <div className="space-y-6">
               <h4 className="text-[11px] font-black text-[#686868] uppercase tracking-widest border-b border-[#f5f5f5] pb-2">Rapport Expert</h4>
               {selectedMaintenance.interventionReport?.equipmentStatus ? (
                 <div className="space-y-5">
                    <div className="p-4 bg-[#f0fdf4] border border-[#dcfce7] rounded-xl">
                       <p className="text-[9px] font-black text-[#16a34a] uppercase mb-1">État Final Matériel</p>
                       <p className="text-sm font-black text-[#1c1c1c]">{selectedMaintenance.interventionReport.equipmentStatus}</p>
                    </div>

                    {selectedMaintenance.interventionReport.detailedDiagnostic && (
                      <div className="space-y-2">
                        <p className="text-[9px] font-black text-[#686868] uppercase">Diagnostic Technique</p>
                        <p className="text-xs text-[#4b5563] leading-relaxed bg-[#fcfcfc] p-3 rounded-lg border border-[#ededed] italic">
                          {selectedMaintenance.interventionReport.detailedDiagnostic}
                        </p>
                      </div>
                    )}

                    {selectedMaintenance.interventionReport.repairProcedure && (
                      <div className="space-y-2">
                        <p className="text-[9px] font-black text-[#686868] uppercase">Procédure appliquée</p>
                        <p className="text-xs text-[#4b5563] leading-relaxed bg-[#fcfcfc] p-3 rounded-lg border border-[#ededed]">
                          {selectedMaintenance.interventionReport.repairProcedure}
                        </p>
                      </div>
                    )}

                    {selectedMaintenance.interventionReport.actionsTaken && selectedMaintenance.interventionReport.actionsTaken.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[9px] font-black text-[#686868] uppercase">Check-list des points</p>
                        <div className="flex flex-wrap gap-2">
                          {selectedMaintenance.interventionReport.actionsTaken.map((a: string, idx: number) => (
                            <span key={idx} className="px-3 py-1 bg-[#fcfcfc] border border-[#ededed] rounded-lg text-[10px] font-bold text-[#1c1c1c]">{a}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {selectedMaintenance.interventionReport.partsUsed && selectedMaintenance.interventionReport.partsUsed.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[9px] font-black text-[#686868] uppercase">Pièces Remplacées</p>
                        <div className="flex flex-wrap gap-2">
                          {selectedMaintenance.interventionReport.partsUsed.map((p: UsedPart, idx: number) => (
                            <span key={idx} className="px-3 py-1 bg-white border border-[#ededed] rounded-lg text-[10px] font-black shadow-sm flex items-center gap-2">
                              <Package size={10} className="text-[#3ecf8e]"/> {p.name} (x{p.quantity})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                 </div>
               ) : (
                 <div className="flex flex-col items-center justify-center py-10 border-2 border-dashed border-[#ededed] rounded-2xl bg-[#fcfcfc]">
                    <AlertTriangle size={32} className="text-amber-400 mb-4" />
                    <p className="text-[11px] font-black text-[#686868] uppercase tracking-widest">Rapport en attente</p>
                 </div>
               )}
               <button onClick={() => handleOpenReport(selectedMaintenance)} className="btn-sb-primary w-full justify-center h-14 font-black uppercase text-[11px] tracking-widest rounded-xl shadow-lg shadow-[#3ecf8e]/10">
                 <Edit3 size={18}/> {selectedMaintenance.interventionReport?.equipmentStatus ? 'Ajuster Rapport' : 'Éditer Rapport'}
               </button>
            </div>
          </div>
        )}
      </Drawer>

      <Modal isOpen={isInterventionModalOpen} onClose={() => setIsInterventionModalOpen(false)} title="Rapport d'Expertise Technique Détaillé" size="lg">
         <form onSubmit={handleSaveReport} className="space-y-8 animate-sb-entry">
            {/* --- SECTION STATUT & TEMPS --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-[#686868] uppercase tracking-widest flex items-center gap-2"><Tag size={12} className="text-[#3ecf8e]"/> Diagnostic Final</label>
                  <select 
                    className="w-full h-12 font-bold px-4 rounded-xl border-[#ededed]" 
                    value={reportData.equipmentStatus} 
                    onChange={e => setReportData({...reportData, equipmentStatus: e.target.value as any})}
                    required
                  >
                     <option value="Excellent">Parfait État / Neuf</option>
                     <option value="Bon">Opérationnel / Réparé</option>
                     <option value="Critique">Critique (Réparation majeure requise)</option>
                     <option value="À remplacer">Déclassement définitif requis</option>
                  </select>
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-[#686868] uppercase tracking-widest flex items-center gap-2"><Clock size={12} className="text-[#3ecf8e]"/> Temps Passé (Minutes)</label>
                  <input 
                    type="number" 
                    className="w-full h-12 font-bold px-4 rounded-xl border-[#ededed]" 
                    placeholder="Minutes d'intervention" 
                    value={reportData.durationMs ? reportData.durationMs / 60000 : ''} 
                    onChange={e => {
                      const mins = parseInt(e.target.value);
                      setReportData({...reportData, durationMs: isNaN(mins) ? 0 : mins * 60000});
                    }} 
                  />
               </div>
            </div>

            {/* --- NOUVEAUX CHAMPS DÉTAILLÉS --- */}
            <div className="space-y-6 bg-[#fcfcfc] p-6 rounded-2xl border border-[#ededed]">
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-[#686868] uppercase tracking-widest flex items-center gap-2"><ClipboardList size={12} className="text-[#3ecf8e]"/> Diagnostic Approfondi</label>
                  <textarea 
                    rows={3} 
                    className="w-full font-bold p-4 rounded-xl border-[#ededed]" 
                    placeholder="Préciser l'origine technique du problème (ex: Court-circuit sur la carte de puissance dû à une surtension)..." 
                    value={reportData.detailedDiagnostic} 
                    onChange={e => setReportData({...reportData, detailedDiagnostic: e.target.value})} 
                  />
               </div>

               <div className="space-y-2">
                  <label className="text-[10px] font-black text-[#686868] uppercase tracking-widest flex items-center gap-2"><Wrench size={12} className="text-[#3ecf8e]"/> Procédure de Réparation</label>
                  <textarea 
                    rows={3} 
                    className="w-full font-bold p-4 rounded-xl border-[#ededed]" 
                    placeholder="Décrire les étapes de la réparation effectuée..." 
                    value={reportData.repairProcedure} 
                    onChange={e => setReportData({...reportData, repairProcedure: e.target.value})} 
                  />
               </div>

               <div className="flex items-center gap-4 py-2">
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id="warrantyCheck" 
                      checked={reportData.isWarrantyValid} 
                      onChange={e => setReportData({...reportData, isWarrantyValid: e.target.checked})}
                      className="w-4 h-4 text-[#3ecf8e] rounded" 
                    />
                    <label htmlFor="warrantyCheck" className="text-[10px] font-black text-[#1c1c1c] uppercase tracking-widest">Dossier sous garantie certifié</label>
                  </div>
               </div>
            </div>

            <div className="space-y-4">
               <label className="text-[10px] font-black text-[#686868] uppercase tracking-widest flex items-center gap-2"><Activity size={12} className="text-[#3ecf8e]"/> Points de contrôle menés</label>
               
               <div className="flex gap-2 mb-4">
                  <input 
                    type="text" 
                    className="flex-1 h-11 text-xs font-bold" 
                    placeholder="Saisir une action spécifique..." 
                    value={currentActionInput} 
                    onChange={e => setCurrentActionInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addAction(currentActionInput))}
                  />
                  <button type="button" onClick={() => addAction(currentActionInput)} className="btn-sb-primary h-11 px-4">
                    <Plus size={16}/>
                  </button>
               </div>

               <div className="bg-[#f8f9fa] border border-[#ededed] rounded-xl p-4 space-y-4">
                  <div>
                    <p className="text-[9px] font-black text-[#686868] uppercase mb-2">Suggestions Rapides</p>
                    <div className="flex flex-wrap gap-2">
                      {PREDEFINED_ACTIONS.map((action: string) => (
                        <button 
                          key={action} 
                          type="button" 
                          onClick={() => addAction(action)}
                          className="px-2.5 py-1.5 bg-white border border-[#ededed] rounded-lg text-[10px] font-bold text-[#1c1c1c] hover:border-[#3ecf8e] hover:text-[#3ecf8e] transition-colors flex items-center gap-1.5"
                        >
                          <Zap size={10} fill="currentColor"/> {action}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-[#ededed] pt-4">
                    <p className="text-[9px] font-black text-[#1c1c1c] uppercase mb-2">Actions Certifiées dans ce rapport</p>
                    <div className="flex flex-wrap gap-2 min-h-[40px]">
                      {(reportData.actionsTaken || []).map((a: string, idx: number) => (
                        <span key={idx} className="px-3 py-1.5 bg-[#1c1c1c] text-white rounded-lg text-[10px] font-bold flex items-center gap-2 animate-sb-entry">
                          {a}
                          <button type="button" onClick={() => removeAction(idx)} className="hover:text-red-400"><X size={12}/></button>
                        </span>
                      ))}
                      {(reportData.actionsTaken || []).length === 0 && (
                        <p className="text-[10px] text-[#9ca3af] italic">Aucune action ajoutée.</p>
                      )}
                    </div>
                  </div>
               </div>
            </div>

            <div className="space-y-4">
               <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-[#686868] uppercase tracking-widest flex items-center gap-2"><Package size={12} className="text-[#3ecf8e]"/> Consommation de Pièces</label>
                  <button type="button" onClick={handleAddPart} className="text-[10px] font-black text-[#3ecf8e] uppercase flex items-center gap-1 hover:bg-[#f0fdf4] px-2 py-1 rounded transition-colors"><Plus size={12}/> Ajouter Pièce</button>
               </div>
               <div className="space-y-3">
                  {usedParts.map((part: UsedPart, idx: number) => (
                    <div key={idx} className="flex gap-3 animate-sb-entry">
                       <div className="flex-1">
                          <input list="parts-list" className="w-full h-11 text-xs font-bold" placeholder="Rechercher une pièce dans le catalogue..." value={part.name} onChange={e => handlePartChange(idx, 'name', e.target.value)} />
                          <datalist id="parts-list">{(parts || []).map((p: Part) => <option key={p.id} value={p.name} />)}</datalist>
                       </div>
                       <div className="w-24">
                          <input type="number" className="w-full h-11 text-xs font-bold text-center" placeholder="Qté" value={part.quantity} onChange={e => handlePartChange(idx, 'quantity', parseInt(e.target.value))} />
                       </div>
                       <button type="button" onClick={() => handleRemovePart(idx)} className="p-3 text-[#686868] hover:text-red-50 border border-[#ededed] rounded-lg hover:bg-red-50 transition-colors"><Trash2 size={16}/></button>
                    </div>
                  ))}
                  {usedParts.length === 0 && <p className="text-[11px] text-[#9ca3af] font-medium italic py-4 text-center border-2 border-dashed border-[#f8f9fa] rounded-xl">Aucune pièce détachée utilisée déclarée.</p>}
               </div>
            </div>

            <div className="space-y-4">
               <label className="text-[10px] font-black text-[#686868] uppercase tracking-widest flex items-center gap-2"><ShieldCheck size={12} className="text-[#3ecf8e]"/> Préconisations Expert & Conseils Client</label>
               <textarea rows={2} className="w-full font-bold p-4 rounded-xl border-[#ededed]" placeholder="Conseils pour prolonger la durée de vie de l'appareil..." value={reportData.recommendations} onChange={e => setReportData({...reportData, recommendations: e.target.value})} />
            </div>

            <div className="space-y-4">
               <label className="text-[10px] font-black text-red-500 uppercase tracking-widest flex items-center gap-2"><Lock size={12} /> Notes Internes (Confidentiel)</label>
               <textarea rows={2} className="w-full font-bold p-4 rounded-xl border-red-100 bg-red-50/30" placeholder="Informations destinées uniquement au management (ex: Suspicion de mauvaise utilisation par le client)..." value={reportData.internalNotes} onChange={e => setReportData({...reportData, internalNotes: e.target.value})} />
            </div>

            <div className="flex justify-end gap-3 pt-8 border-t border-[#f5f5f5]">
               <button type="button" onClick={() => setIsInterventionModalOpen(false)} className="btn-sb-outline h-12 px-8 text-[11px] font-black uppercase rounded-xl">Abandonner</button>
               <button type="submit" disabled={isSaving} className="btn-sb-primary h-12 px-12 text-[11px] font-black uppercase rounded-xl shadow-lg shadow-[#3ecf8e]/20">
                  {isSaving ? <RefreshCw className="animate-spin" size={18}/> : 'Transmettre Rapport Complet'}
               </button>
            </div>
         </form>
      </Modal>
    </div>
  );
};

export default MaintenanceLog;
