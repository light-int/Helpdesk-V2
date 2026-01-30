
import React, { useState, useMemo, useEffect } from 'react';
import { 
  ClipboardList, Search, RefreshCw, CalendarDays, MapPin, ArrowUpRight, Filter, 
  MoreHorizontal, X, User, History, Package, CheckCircle2, 
  Clock, Activity, FileText, Wrench, ChevronLeft, ChevronRight, Plus, Trash2, Save,
  AlertTriangle, CheckSquare, ShieldCheck, Hash, Tag, Calendar, ShieldQuestion, Lock
} from 'lucide-react';
import { useData, useNotifications, useUser } from '../App';
import { Ticket, UsedPart, InterventionReport } from '../types';
import Modal from '../components/Modal';

const MaintenanceLog: React.FC = () => {
  const { tickets, technicians, isLoading, refreshAll, isSyncing, parts, saveTicket, addStockMovement } = useData();
  const { currentUser } = useUser();
  const { addNotification } = useNotifications();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMaintenance, setSelectedMaintenance] = useState<Ticket | null>(null);
  
  // États Calendrier
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());

  // États Formulaire Intervention
  const [isInterventionModalOpen, setIsInterventionModalOpen] = useState(false);
  const [actionsTaken, setActionsTaken] = useState<string[]>([]);
  const [usedParts, setUsedParts] = useState<UsedPart[]>([]);
  const [recommendations, setRecommendations] = useState('');
  const [equipmentStatus, setEquipmentStatus] = useState<InterventionReport['equipmentStatus']>('Bon');
  const [currentAction, setCurrentAction] = useState('');

  useEffect(() => { refreshAll(); }, []);

  const maintenance = useMemo(() => {
    return tickets.filter(t => 
      (t.category === 'Maintenance' || t.category === 'Installation' || t.category === 'SAV') &&
      (currentUser?.role === 'TECHNICIAN' ? t.assignedTechnicianId === currentUser.id : true) &&
      (t.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
       t.id.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [tickets, searchTerm, currentUser]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Résolu': return 'bg-green-100 text-green-700 border-green-200';
      case 'Fermé': return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'En attente d\'approbation': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'En cours': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-blue-100 text-blue-700 border-blue-200';
    }
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return null;
    const mins = Math.floor(ms / 60000);
    const hours = Math.floor(mins / 60);
    const rMins = mins % 60;
    return hours > 0 ? `${hours}h ${rMins}min` : `${rMins}min`;
  };

  const getEquipmentStatusColor = (status?: string) => {
    switch (status) {
      case 'Excellent': return 'bg-green-100 text-green-700 border-green-200';
      case 'Bon': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Critique': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'À remplacer': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-400 border-gray-200';
    }
  };

  // Logique du Calendrier
  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const totalDays = daysInMonth(year, month);
    const startOffset = firstDayOfMonth(year, month);
    const days = [];
    
    for (let i = 0; i < startOffset; i++) days.push(null);
    for (let i = 1; i <= totalDays; i++) days.push(i);
    
    return days;
  }, [currentDate]);

  const getTicketsForDay = (day: number | null) => {
    if (!day) return [];
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return maintenance.filter(t => t.createdAt.startsWith(dateStr));
  };

  // Logique Rapport Intervention
  const openInterventionForm = () => {
    if (!selectedMaintenance || selectedMaintenance.status === 'Fermé') return;
    setActionsTaken(selectedMaintenance.interventionReport?.actionsTaken || []);
    setUsedParts(selectedMaintenance.interventionReport?.partsUsed || []);
    setRecommendations(selectedMaintenance.interventionReport?.recommendations || '');
    setEquipmentStatus(selectedMaintenance.interventionReport?.equipmentStatus || 'Bon');
    setIsInterventionModalOpen(true);
  };

  const handleSaveIntervention = async () => {
    if (!selectedMaintenance) return;

    // Calcul du nouveau total des pièces
    const partsTotal = usedParts.reduce((sum, p) => sum + (p.unitPrice * p.quantity), 0);
    
    // CALCUL DE LA DURÉE
    const now = new Date();
    let durationMs = selectedMaintenance.interventionReport?.durationMs || 0;
    if (selectedMaintenance.interventionReport?.startedAt) {
       durationMs = now.getTime() - new Date(selectedMaintenance.interventionReport.startedAt).getTime();
    }

    const updatedTicket: Ticket = {
      ...selectedMaintenance,
      status: 'En attente d\'approbation',
      lastUpdate: now.toISOString(),
      interventionReport: {
        ...selectedMaintenance.interventionReport,
        actionsTaken,
        partsUsed: usedParts,
        recommendations,
        equipmentStatus,
        performedAt: now.toISOString(),
        durationMs
      },
      financials: {
        ...selectedMaintenance.financials!,
        partsTotal,
        grandTotal: (selectedMaintenance.financials?.laborTotal || 0) + (selectedMaintenance.financials?.travelFee || 0) + partsTotal
      }
    };

    try {
      // DÉCRÉMENTATION DU STOCK
      const oldParts = selectedMaintenance.interventionReport?.partsUsed || [];
      for (const p of usedParts) {
        if (!p.id) continue;
        const previouslySubtracted = oldParts.find(op => op.id === p.id)?.quantity || 0;
        const delta = p.quantity - previouslySubtracted;
        if (delta > 0) {
          await addStockMovement({
            partId: p.id,
            partName: p.name,
            quantity: delta,
            type: 'OUT',
            reason: `Traitement Ticket #${selectedMaintenance.id}`,
            performedBy: currentUser?.name || 'Technicien Horizon',
            ticketId: selectedMaintenance.id
          });
        }
      }

      await saveTicket(updatedTicket);
      setIsInterventionModalOpen(false);
      setSelectedMaintenance(updatedTicket);
      addNotification({ 
        title: 'Rapport technique clos', 
        message: `Durée calculée : ${formatDuration(durationMs)}. En attente de validation manager.`, 
        type: 'success' 
      });
    } catch (err) {
      addNotification({ 
        title: 'Erreur', 
        message: 'Échec de la mise à jour du dossier technique.', 
        type: 'error' 
      });
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="relative h-[calc(100vh-100px)] flex flex-col space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-normal text-[#3c4043]">Maintenance & Planning</h1>
          <p className="text-[#5f6368] text-sm">Suivi du parc installé et interventions préventives.</p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
             <Search className="absolute left-3 top-2.5 text-[#5f6368]" size={18} />
             <input 
              type="text" 
              placeholder="Rechercher dossier..." 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              className="w-64 pl-10 h-10 bg-white shadow-sm" 
             />
          </div>
          <button onClick={() => setIsCalendarOpen(true)} className="btn-google-outlined flex items-center gap-2">
            <CalendarDays size={16} /> Calendrier
          </button>
          <button onClick={refreshAll} className="btn-google-outlined">
             <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      {/* DASHBOARD MINI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="google-card p-6 border-b-4 border-[#1a73e8]">
            <p className="text-[#5f6368] text-[10px] font-black uppercase tracking-widest">Dossiers SAV/Maintenance</p>
            <h3 className="text-2xl font-bold text-[#3c4043] mt-2">{maintenance.length}</h3>
         </div>
         <div className="google-card p-6 border-b-4 border-[#a142f4]">
            <p className="text-[#5f6368] text-[10px] font-black uppercase tracking-widest">Attente Approbation</p>
            <h3 className="text-2xl font-bold text-[#a142f4] mt-2">
              {maintenance.filter(m => m.status === 'En attente d\'approbation').length}
            </h3>
         </div>
         <div className="google-card p-6 border-b-4 border-[#34a853]">
            <p className="text-[#5f6368] text-[10px] font-black uppercase tracking-widest">Productivité Technique</p>
            <h3 className="text-2xl font-bold text-[#3c4043] mt-2">En ligne</h3>
         </div>
      </div>

      <div className="google-card overflow-hidden flex-1 flex flex-col">
        <div className="px-6 py-4 border-b border-[#dadce0] flex items-center justify-between bg-[#f8f9fa]">
           <h2 className="text-xs font-black text-[#5f6368] uppercase tracking-widest">Registre des Interventions Terrain</h2>
           <button className="text-[#5f6368] hover:bg-[#e8eaed] p-2 rounded-full"><Filter size={18} /></button>
        </div>
        <div className="overflow-y-auto flex-1 custom-scrollbar">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-white z-10 border-b border-[#dadce0]">
              <tr className="text-[#5f6368] text-[10px] font-black uppercase tracking-widest">
                <th className="px-6 py-4">Dossier #</th>
                <th className="px-6 py-4">Client & Showroom</th>
                <th className="px-6 py-4">Technicien Assigné</th>
                <th className="px-6 py-4 text-center">Durée</th>
                <th className="px-6 py-4 text-center">État</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#dadce0]">
              {maintenance.map((t) => {
                const tech = technicians.find(tec => tec.id === t.assignedTechnicianId);
                return (
                  <tr 
                    key={t.id} 
                    onClick={() => setSelectedMaintenance(t)}
                    className={`hover:bg-[#f8f9fa] transition-colors group cursor-pointer ${selectedMaintenance?.id === t.id ? 'bg-[#e8f0fe]' : ''}`}
                  >
                    <td className="px-6 py-5">
                      <span className="font-bold text-[#1a73e8]">#{t.id}</span>
                      <p className="text-[9px] text-[#5f6368] font-bold uppercase mt-1">{t.category}</p>
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-sm font-bold text-[#3c4043]">{t.customerName}</p>
                      <p className="text-[10px] text-[#5f6368] flex items-center gap-1 mt-0.5 font-medium"><MapPin size={10}/> {t.showroom}</p>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        {tech ? (
                          <>
                            <img src={tech.avatar} className="w-6 h-6 rounded-full border border-[#dadce0]" alt="" />
                            <span className="text-xs font-bold text-[#3c4043]">{tech.name}</span>
                          </>
                        ) : (
                          <span className="text-xs text-[#9aa0a6] italic font-medium">Non assigné</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                       <span className="text-xs font-black text-[#5f6368]">
                         {t.interventionReport?.durationMs ? formatDuration(t.interventionReport.durationMs) : '--'}
                       </span>
                    </td>
                    <td className="px-6 py-5 text-center">
                       <span className={`px-2 py-1 rounded border text-[10px] font-black uppercase ${getStatusColor(t.status)}`}>
                         {t.status}
                       </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL CALENDRIER DYNAMIQUE */}
      <Modal isOpen={isCalendarOpen} onClose={() => setIsCalendarOpen(false)} title="Planning de Maintenance Horizon" size="lg">
         <div className="space-y-6">
            <div className="flex items-center justify-between bg-[#f8f9fa] p-4 rounded-xl border border-[#dadce0]">
               <h3 className="text-lg font-bold text-[#3c4043] capitalize">
                  {currentDate.toLocaleString('fr-FR', { month: 'long', year: 'numeric' })}
               </h3>
               <div className="flex gap-2">
                  <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))} className="p-2 hover:bg-[#e8eaed] rounded-full transition-all"><ChevronLeft size={20}/></button>
                  <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))} className="p-2 hover:bg-[#e8eaed] rounded-full transition-all"><ChevronRight size={20}/></button>
               </div>
            </div>

            <div className="grid grid-cols-7 gap-px bg-[#dadce0] border border-[#dadce0] rounded-xl overflow-hidden shadow-sm">
               {['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map(d => (
                 <div key={d} className="bg-[#f8f9fa] py-2 text-center text-[10px] font-black text-[#5f6368] uppercase tracking-widest">{d}</div>
               ))}
               {calendarDays.map((day, idx) => {
                 const dayTickets = getTicketsForDay(day);
                 return (
                   <div key={idx} className="bg-white min-h-[100px] p-2 hover:bg-[#f8f9ff] transition-colors relative">
                      <span className={`text-xs font-bold ${day ? 'text-[#3c4043]' : 'text-transparent'}`}>{day}</span>
                      <div className="mt-1 space-y-1">
                         {dayTickets.map(ticket => (
                           <div 
                            key={ticket.id} 
                            onClick={() => { setSelectedMaintenance(ticket); setIsCalendarOpen(false); }}
                            className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase truncate cursor-pointer border ${ticket.status === 'Résolu' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-blue-50 text-[#1a73e8] border-[#d2e3fc]'}`}
                           >
                              {ticket.id} • {ticket.customerName.split(' ')[0]}
                           </div>
                         ))}
                      </div>
                   </div>
                 );
               })}
            </div>
         </div>
      </Modal>

      {/* DETAIL DRAWER FOR MAINTENANCE */}
      {selectedMaintenance && (
        <>
          <div className="fixed inset-0 bg-black/25 backdrop-blur-[2px] z-[60] animate-in fade-in" onClick={() => setSelectedMaintenance(null)} />
          <div className="fixed right-0 top-0 h-screen w-[550px] bg-white z-[70] flex flex-col shadow-[-15px_0_40px_-10px_rgba(0,0,0,0.15)] animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="p-4 border-b border-[#dadce0] flex items-center justify-between bg-[#f8f9fa]">
              <div className="flex items-center gap-3">
                 <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${getStatusColor(selectedMaintenance.status)}`}>
                   <ClipboardList size={16} />
                 </div>
                 <div>
                    <h2 className="text-sm font-bold text-[#3c4043] uppercase tracking-widest">Maintenance #{selectedMaintenance.id}</h2>
                    <p className="text-[10px] text-[#5f6368] font-black uppercase tracking-[0.2em]">{selectedMaintenance.category} • {selectedMaintenance.showroom}</p>
                 </div>
              </div>
              <button onClick={() => setSelectedMaintenance(null)} className="p-2 hover:bg-[#e8eaed] rounded-full text-[#5f6368] transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar pb-32">
              
              {/* Chrono Alert */}
              {selectedMaintenance.status === 'En cours' && (
                <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-center gap-4 animate-pulse">
                   <Clock className="text-amber-600" size={28} />
                   <div>
                      <p className="text-xs font-black text-amber-700 uppercase tracking-widest">Intervention en cours</p>
                      <p className="text-[10px] text-amber-600 font-medium italic">L'expert a activé le chronomètre technique.</p>
                   </div>
                </div>
              )}

              {/* Status Banner */}
              {selectedMaintenance.interventionReport?.equipmentStatus && (
                <div className={`p-4 rounded-2xl border-2 flex items-center justify-between ${getEquipmentStatusColor(selectedMaintenance.interventionReport.equipmentStatus)}`}>
                   <div className="flex items-center gap-3">
                      <ShieldCheck size={24} />
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest opacity-70">État post-intervention</p>
                        <p className="text-sm font-black uppercase">{selectedMaintenance.interventionReport.equipmentStatus}</p>
                      </div>
                   </div>
                   {selectedMaintenance.interventionReport.durationMs && (
                      <div className="text-right">
                         <p className="text-[9px] font-black uppercase opacity-70">Temps passé</p>
                         <p className="text-xs font-black">{formatDuration(selectedMaintenance.interventionReport.durationMs)}</p>
                      </div>
                   )}
                </div>
              )}

              {/* SECTION: DATES & PLANNING */}
              <section className="space-y-4">
                <h3 className="text-[10px] font-black text-[#9aa0a6] uppercase tracking-[0.2em] flex items-center gap-2">
                  <Calendar size={16} /> Chronologie du dossier
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-[#f8f9fa] border border-[#dadce0] rounded-2xl">
                    <p className="text-[9px] font-black text-[#5f6368] uppercase mb-1">Démarrage expert</p>
                    <p className="text-xs font-bold text-[#3c4043]">{selectedMaintenance.interventionReport?.startedAt ? formatDate(selectedMaintenance.interventionReport.startedAt) : '--'}</p>
                  </div>
                  <div className="p-4 bg-[#f0f4ff] border border-[#d2e3fc] rounded-2xl">
                    <p className="text-[9px] font-black text-[#1a73e8] uppercase mb-1">Clôture technique</p>
                    <p className="text-xs font-bold text-[#3c4043]">{selectedMaintenance.interventionReport?.performedAt ? formatDate(selectedMaintenance.interventionReport.performedAt) : '--'}</p>
                  </div>
                </div>
              </section>

              {/* SECTION: ÉQUIPEMENT CONCERNÉ */}
              <section className="space-y-4">
                <h3 className="text-[10px] font-black text-[#9aa0a6] uppercase tracking-[0.2em] flex items-center gap-2">
                  <Package size={16} /> Informations Équipement
                </h3>
                <div className="p-5 bg-white border border-[#dadce0] rounded-2xl shadow-sm space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[#f1f3f4] flex items-center justify-center text-[#5f6368]">
                      <Activity size={24} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Tag size={12} className="text-[#1a73e8]" />
                        <p className="text-[10px] font-black text-[#1a73e8] uppercase">{selectedMaintenance.brand || 'Marque inconnue'}</p>
                      </div>
                      <h4 className="text-sm font-bold text-[#3c4043]">{selectedMaintenance.productName || 'Désignation non spécifiée'}</h4>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-[#f1f3f4] flex justify-between items-center">
                    <div className="flex items-center gap-2">
                       <Hash size={14} className="text-[#5f6368]" />
                       <span className="text-[10px] font-black text-[#5f6368] uppercase tracking-wider">S/N:</span>
                       <span className="text-xs font-mono font-bold text-[#3c4043]">{selectedMaintenance.serialNumber || 'N/A'}</span>
                    </div>
                    <div className="text-[10px] font-black text-[#9aa0a6] uppercase bg-[#f8f9fa] px-2 py-1 rounded">
                      Ref: {selectedMaintenance.productReference || 'Direct'}
                    </div>
                  </div>
                </div>
              </section>

              {/* Technician Info */}
              <section className="space-y-4">
                <h3 className="text-[10px] font-black text-[#9aa0a6] uppercase tracking-[0.2em] flex items-center gap-2">
                  <User size={16} /> Expert en charge
                </h3>
                <div className={`p-5 border rounded-2xl transition-all ${selectedMaintenance.status === 'Fermé' ? 'bg-gray-50 border-gray-200 opacity-80 cursor-default' : 'bg-[#f8f9fa] border-[#dadce0]'}`}>
                   {selectedMaintenance.assignedTechnicianId ? (
                     <div className="flex items-center gap-4">
                        <img 
                          src={technicians.find(t => t.id === selectedMaintenance.assignedTechnicianId)?.avatar} 
                          className="w-14 h-14 rounded-full border-2 border-[#1a73e8] p-0.5" 
                          alt="" 
                        />
                        <div className="flex-1">
                           <p className="text-sm font-bold text-[#3c4043]">{technicians.find(t => t.id === selectedMaintenance.assignedTechnicianId)?.name}</p>
                           <p className="text-[10px] text-[#1a73e8] font-black uppercase tracking-widest">Technicien Certifié Horizon</p>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-[10px] font-bold border ${getStatusColor(selectedMaintenance.status)}`}>
                           {selectedMaintenance.status}
                        </div>
                     </div>
                   ) : (
                     <div className="flex items-center gap-3 text-[#5f6368] py-2">
                        <div className="w-12 h-12 rounded-full bg-[#f1f3f4] flex items-center justify-center border-2 border-dashed border-[#dadce0]">
                           <User size={24} className="opacity-40" />
                        </div>
                        <p className="text-xs font-bold italic">En attente d'expert...</p>
                     </div>
                   )}
                </div>
              </section>

              {/* Intervention History */}
              <section className="space-y-4">
                <h3 className="text-[10px] font-black text-[#9aa0a6] uppercase tracking-[0.2em] flex items-center gap-2">
                  <History size={16} /> Rapport d'Intervention Technique
                </h3>
                
                <div className="space-y-4">
                   {selectedMaintenance.interventionReport && (selectedMaintenance.interventionReport.actionsTaken?.length || selectedMaintenance.interventionReport.partsUsed?.length || selectedMaintenance.interventionReport.recommendations) ? (
                     <div 
                        onClick={selectedMaintenance.status !== 'Fermé' ? openInterventionForm : undefined}
                        className={selectedMaintenance.status !== 'Fermé' ? 'cursor-pointer' : 'cursor-default'}
                     >
                        {/* Recommendations Highlight */}
                        {selectedMaintenance.interventionReport.recommendations && (
                          <div className="p-5 bg-blue-50 border border-blue-100 rounded-t-2xl">
                             <p className="text-[10px] font-black text-[#1a73e8] uppercase mb-2 flex items-center gap-2">
                                <Activity size={14} /> Observations de l'expert
                             </p>
                             <p className="text-xs text-[#3c4043] leading-relaxed font-medium">
                               {selectedMaintenance.interventionReport.recommendations}
                             </p>
                          </div>
                        )}

                        <div className="p-5 bg-white border border-[#dadce0] rounded-2xl shadow-sm space-y-4">
                           <div className="flex items-center justify-between">
                              <p className="text-[10px] font-black text-[#5f6368] uppercase tracking-wider">Travaux réalisés</p>
                              {selectedMaintenance.status === 'Fermé' && <Lock size={12} className="text-[#9aa0a6]" />}
                           </div>
                           <ul className="space-y-3">
                              {selectedMaintenance.interventionReport.actionsTaken?.map((action, idx) => (
                                <li key={idx} className="flex gap-3 text-xs text-[#3c4043] font-medium items-start">
                                   <div className="w-2 h-2 rounded-full bg-[#1a73e8] mt-1 shrink-0" />
                                   {action}
                                </li>
                              ))}
                           </ul>
                        </div>

                        {selectedMaintenance.interventionReport.partsUsed && selectedMaintenance.interventionReport.partsUsed.length > 0 && (
                          <div className="p-5 bg-[#f8f9fa] border border-[#dadce0] rounded-b-2xl mt-4">
                              <p className="text-[10px] font-black text-[#5f6368] uppercase mb-4 tracking-wider">Pièces & Composants</p>
                              <div className="flex flex-wrap gap-2">
                                {selectedMaintenance.interventionReport.partsUsed.map((part, idx) => (
                                  <span key={idx} className="px-3 py-1.5 bg-white border border-[#dadce0] rounded-xl text-[10px] font-bold text-[#3c4043] flex items-center gap-2 shadow-sm">
                                      <Package size={12} className="text-[#1a73e8]" />
                                      {part.name} <span className="text-[#9aa0a6]">x{part.quantity}</span>
                                  </span>
                                ))}
                              </div>
                          </div>
                        )}
                     </div>
                   ) : (
                     <div className={`p-10 text-center border-2 border-dashed rounded-2xl transition-all ${selectedMaintenance.status === 'Fermé' ? 'bg-gray-50 border-gray-200 cursor-default' : 'border-[#dadce0] group hover:border-[#1a73e8] cursor-pointer'}`} 
                          onClick={selectedMaintenance.status !== 'Fermé' ? openInterventionForm : undefined}>
                        <Activity className={`mx-auto mb-3 ${selectedMaintenance.status === 'Fermé' ? 'text-gray-300' : 'text-[#bdc1c6] group-hover:text-[#1a73e8]'}`} size={32} />
                        <p className={`text-xs font-bold uppercase tracking-widest ${selectedMaintenance.status === 'Fermé' ? 'text-gray-400' : 'text-[#9aa0a6] group-hover:text-[#1a73e8]'}`}>
                           {selectedMaintenance.status === 'Fermé' ? 'Rapport Verrouillé' : 'Rapport non complété'}
                        </p>
                        <p className="text-[9px] text-[#bdc1c6] mt-1">
                           {selectedMaintenance.status === 'Fermé' ? 'Modification impossible sur un dossier clos.' : 'Cliquer pour documenter l\'intervention.'}
                        </p>
                     </div>
                   )}
                </div>
              </section>

              {/* Maintenance Details */}
              <section className="space-y-4">
                <h3 className="text-[10px] font-black text-[#9aa0a6] uppercase tracking-[0.2em] flex items-center gap-2">
                  <FileText size={16} /> Contexte du dossier
                </h3>
                <div className="p-5 bg-white border border-[#dadce0] rounded-2xl shadow-sm space-y-4">
                   <div>
                      <p className="text-[10px] text-[#9aa0a6] font-bold uppercase mb-1">Description Initiale</p>
                      <p className="text-xs text-[#3c4043] leading-relaxed font-medium italic">"{selectedMaintenance.description}"</p>
                   </div>
                </div>
              </section>
            </div>

            {/* Actions Footer */}
            <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-[#dadce0] bg-white">
              {selectedMaintenance.status !== 'Fermé' ? (
                <button 
                  onClick={openInterventionForm}
                  className="w-full btn-google-primary justify-center py-3.5 text-xs font-black uppercase tracking-[0.2em] shadow-lg shadow-[#1a73e8]/20"
                >
                  <Wrench size={16} /> {selectedMaintenance.interventionReport ? 'Modifier le Rapport Technique' : 'Générer Rapport d\'Entretien'}
                </button>
              ) : (
                <div className="flex items-center justify-center gap-3 py-3.5 bg-gray-100 text-gray-500 rounded-lg text-xs font-black uppercase tracking-widest border border-gray-200">
                   <Lock size={16} /> Clôture Administrative Confirmée
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* MODAL RAPPORT D'INTERVENTION ENRICHI */}
      <Modal
        isOpen={isInterventionModalOpen}
        onClose={() => setIsInterventionModalOpen(false)}
        title="Dossier Technique Expert Royal Plaza"
        size="lg"
      >
        <div className="space-y-8">
           {/* Info Temps au rapport */}
           <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2 text-blue-700">
                 <Clock size={18} />
                 <span className="text-xs font-black uppercase tracking-widest">Chronographe technique</span>
              </div>
              <span className="text-sm font-black text-blue-900">
                 {selectedMaintenance?.interventionReport?.startedAt ? `Temps de travail : ${formatDuration(new Date().getTime() - new Date(selectedMaintenance.interventionReport.startedAt).getTime())}` : 'Temps non chronométré'}
              </span>
           </div>

           {/* Section État du Matériel */}
           <section className="space-y-4">
              <h4 className="text-xs font-black uppercase tracking-widest text-[#3c4043] flex items-center gap-2">
                <ShieldCheck size={16} className="text-[#1a73e8]" /> Diagnostic d'état post-intervention
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                 {(['Excellent', 'Bon', 'Critique', 'À remplacer'] as const).map(status => (
                   <button
                    key={status}
                    onClick={() => setEquipmentStatus(status)}
                    className={`py-3 px-2 rounded-xl border-2 text-[10px] font-black uppercase transition-all ${
                      equipmentStatus === status 
                      ? (status === 'Excellent' ? 'bg-green-600 border-green-600 text-white' : 
                         status === 'Bon' ? 'bg-blue-600 border-blue-600 text-white' :
                         status === 'Critique' ? 'bg-orange-600 border-orange-600 text-white' :
                         'bg-red-600 border-red-600 text-white')
                      : 'bg-white border-[#dadce0] text-[#5f6368] hover:border-[#1a73e8]'
                    }`}
                   >
                     {status}
                   </button>
                 ))}
              </div>
           </section>

           <section className="space-y-4">
              <h4 className="text-xs font-black uppercase tracking-widest text-[#3c4043] flex items-center gap-2">
                <History size={16} className="text-[#1a73e8]" /> Étapes de dépannage / maintenance
              </h4>
              <div className="flex gap-2">
                 <input 
                    type="text" 
                    value={currentAction}
                    onChange={(e) => setCurrentAction(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (() => { if(currentAction.trim()) { setActionsTaken([...actionsTaken, currentAction.trim()]); setCurrentAction(''); } })()}
                    placeholder="Action réalisée (ex: Nettoyage bloc évaporateur)..."
                    className="flex-1 bg-white h-11"
                 />
                 <button onClick={() => { if(currentAction.trim()) { setActionsTaken([...actionsTaken, currentAction.trim()]); setCurrentAction(''); } }} className="btn-google-primary px-4"><Plus size={18} /></button>
              </div>
              <div className="space-y-2 max-h-[150px] overflow-y-auto">
                 {actionsTaken.map((action, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-[#f8f9fa] border border-[#dadce0] rounded-xl group">
                       <span className="text-xs text-[#3c4043] font-medium">{action}</span>
                       <button onClick={() => setActionsTaken(actionsTaken.filter((_, i) => i !== idx))} className="text-[#9aa0a6] hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14} /></button>
                    </div>
                 ))}
              </div>
           </section>

           <section className="space-y-4">
              <h4 className="text-xs font-black uppercase tracking-widest text-[#3c4043] flex items-center gap-2">
                <FileText size={16} className="text-[#1a73e8]" /> Observations détaillées & Recommandations
              </h4>
              <textarea
                value={recommendations}
                onChange={(e) => setRecommendations(e.target.value)}
                className="w-full h-32 bg-white resize-none"
                placeholder="Détails techniques, cause de la panne, conseils d'utilisation pour le client..."
              ></textarea>
           </section>

           <section className="space-y-4">
              <h4 className="text-xs font-black uppercase tracking-widest text-[#3c4043] flex items-center gap-2">
                <Package size={16} className="text-[#1a73e8]" /> Pièces & Composants facturés
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="h-[180px] overflow-y-auto border border-[#dadce0] rounded-xl bg-[#f8f9fa] divide-y divide-[#dadce0]">
                    {parts.map(p => (
                       <button key={p.id} onClick={() => {
                          const existing = usedParts.find(up => up.id === p.id);
                          if (existing) setUsedParts(usedParts.map(up => up.id === p.id ? { ...up, quantity: up.quantity + 1 } : up));
                          else setUsedParts([...usedParts, { id: p.id, name: p.name, quantity: 1, unitPrice: p.unitPrice }]);
                       }} className="w-full text-left p-3 hover:bg-white flex items-center justify-between group transition-colors">
                          <div>
                             <p className="text-xs font-bold text-[#3c4043]">{p.name}</p>
                             <p className="text-[10px] text-[#5f6368]">{p.brand} • Stock: {p.currentStock}</p>
                          </div>
                          <Plus size={14} className="text-[#1a73e8] opacity-0 group-hover:opacity-100" />
                       </button>
                    ))}
                 </div>
                 <div className="space-y-2 max-h-[180px] overflow-y-auto">
                    {usedParts.map((p, idx) => (
                       <div key={idx} className="flex items-center justify-between p-3 bg-white border border-[#dadce0] rounded-xl shadow-sm">
                          <div className="flex-1"><p className="text-xs font-bold text-[#3c4043]">{p.name}</p></div>
                          <div className="flex items-center gap-3">
                             <div className="flex items-center gap-2 bg-[#f1f3f4] px-2 py-1 rounded-lg">
                                <button onClick={() => setUsedParts(usedParts.map((item, i) => i === idx ? { ...item, quantity: Math.max(1, item.quantity - 1) } : item))} className="text-[#5f6368]">-</button>
                                <span className="text-xs font-black min-w-[20px] text-center">{p.quantity}</span>
                                <button onClick={() => setUsedParts(usedParts.map((item, i) => i === idx ? { ...item, quantity: item.quantity + 1 } : item))} className="text-[#5f6368]">+</button>
                             </div>
                             <button onClick={() => setUsedParts(usedParts.filter((_, i) => i !== idx))} className="text-red-500 hover:bg-red-50 p-1.5 rounded-full"><X size={14} /></button>
                          </div>
                       </div>
                    ))}
                 </div>
              </div>
           </section>

           <div className="flex gap-4 pt-8 border-t border-[#dadce0]">
              <button onClick={handleSaveIntervention} className="btn-google-primary flex-1 justify-center py-4 text-sm font-black uppercase tracking-[0.2em] shadow-lg shadow-[#1a73e8]/20">
                 <Save size={18} /> Soumettre au Manager pour Clôture
              </button>
              <button onClick={() => setIsInterventionModalOpen(false)} className="btn-google-outlined px-8 font-black uppercase text-[10px]">Annuler</button>
           </div>
        </div>
      </Modal>
    </div>
  );
};

export default MaintenanceLog;
