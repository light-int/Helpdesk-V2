
import React, { useState, useMemo, useEffect } from 'react';
import { 
  ClipboardList, Search, RefreshCw, CalendarDays, MapPin, ArrowUpRight, Filter, 
  MoreHorizontal, X, User, History, Package, CheckCircle2, 
  Clock, Activity, FileText, Wrench, ChevronLeft, ChevronRight, Plus, Trash2, Save,
  AlertTriangle, CheckSquare, ShieldCheck, Hash, Tag, Calendar, ShieldQuestion, Lock,
  LayoutList, LayoutGrid, Timer, Settings2, SlidersHorizontal
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
    ).sort((a, b) => new Date(b.lastUpdate || b.createdAt).getTime() - new Date(a.lastUpdate || a.createdAt).getTime());
  }, [tickets, searchTerm, currentUser]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Résolu': return 'bg-green-50 text-green-700 border-green-200';
      case 'Fermé': return 'bg-gray-50 text-gray-600 border-gray-300';
      case 'En attente d\'approbation': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'En cours': return 'bg-amber-50 text-amber-700 border-amber-300';
      default: return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return null;
    const mins = Math.floor(ms / 60000);
    const hours = Math.floor(mins / 60);
    const rMins = mins % 60;
    return hours > 0 ? `${hours}h ${rMins}m` : `${rMins}m`;
  };

  const getEquipmentStatusColor = (status?: string) => {
    switch (status) {
      case 'Excellent': return 'bg-green-600 text-white';
      case 'Bon': return 'bg-blue-600 text-white';
      case 'Critique': return 'bg-orange-600 text-white';
      case 'À remplacer': return 'bg-red-600 text-white';
      default: return 'bg-gray-100 text-gray-500';
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
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    const dateStr = `${year}-${month}-${d}`;
    return maintenance.filter(t => t.createdAt.startsWith(dateStr));
  };

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

    const partsTotal = usedParts.reduce((sum, p) => sum + (p.unitPrice * p.quantity), 0);
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
            reason: `Dossier #${selectedMaintenance.id}`,
            performedBy: currentUser?.name || 'Système Horizon',
            ticketId: selectedMaintenance.id
          });
        }
      }

      await saveTicket(updatedTicket);
      setIsInterventionModalOpen(false);
      setSelectedMaintenance(updatedTicket);
      addNotification({ title: 'Rapport Clos', message: 'Dossier transmis pour validation finale.', type: 'success' });
    } catch (err) {
      addNotification({ title: 'Erreur', message: 'Impossible d\'enregistrer le rapport.', type: 'error' });
    }
  };

  const formatDateShort = (dateStr?: string) => {
    if (!dateStr) return '--';
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
  };

  return (
    <div className="space-y-8 animate-page-entry pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-light text-[#202124]">Maintenance & Terrain</h1>
          <p className="text-[10px] text-[#5f6368] font-black uppercase tracking-widest mt-1">Planification des interventions techniques Royal Plaza</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-4 top-3 text-[#9aa0a6] group-focus-within:text-[#1a73e8] transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Rechercher un dossier technique..." 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              className="w-80 pl-12 h-11 bg-white border-[#dadce0] focus:ring-0 focus:border-[#1a73e8] shadow-sm" 
            />
          </div>
          <button onClick={() => setIsCalendarOpen(true)} className="btn-google-outlined h-11 px-6 flex items-center gap-3">
            <CalendarDays size={18} /> <span>Calendrier</span>
          </button>
          <button onClick={refreshAll} className="btn-google-outlined h-11 px-4">
             <RefreshCw size={18} className={isSyncing ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      {/* KPIS GOUVERNANCE MAINTENANCE */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         {[
           { label: 'Flux SAV Actif', value: maintenance.length, icon: <Activity size={20}/>, color: '#1a73e8' },
           { label: 'Attente Approbation', value: maintenance.filter(m => m.status === 'En attente d\'approbation').length, icon: <Timer size={20}/>, color: '#a142f4' },
           { label: 'Experts Disponibles', value: technicians.filter(t => t.status === 'Disponible').length, icon: <User size={20}/>, color: '#188038' }
         ].map((stat, i) => (
           <div key={i} className="stats-card border-l-4" style={{ borderLeftColor: stat.color }}>
              <div className="flex justify-between items-start">
                 <div>
                    <p className="text-[10px] font-black text-[#5f6368] uppercase tracking-[0.15em] mb-1">{stat.label}</p>
                    <h3 className="text-3xl font-bold text-[#202124] tracking-tighter">{stat.value}</h3>
                 </div>
                 <div className="p-2.5 bg-gray-50 text-gray-400">{stat.icon}</div>
              </div>
           </div>
         ))}
      </div>

      <div className="google-card overflow-hidden">
        <div className="px-8 py-5 border-b border-[#dadce0] flex items-center justify-between bg-[#f8f9fa]">
           <div className="flex items-center gap-3">
              <div className="w-1.5 h-6 bg-[#1a73e8]" />
              <h2 className="text-[11px] font-black text-[#202124] uppercase tracking-widest">Journal des Opérations Terrain</h2>
           </div>
           <div className="flex gap-2">
              <button className="p-2 text-[#5f6368] hover:bg-gray-100 transition-colors"><LayoutList size={18} /></button>
              <button className="p-2 text-[#9aa0a6] hover:bg-gray-100 transition-colors"><SlidersHorizontal size={18} /></button>
           </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#dadce0] bg-white text-[#5f6368] text-[9px] font-black uppercase tracking-widest">
                <th className="px-8 py-4">ID & Date</th>
                <th className="px-8 py-4">Client & Zone</th>
                <th className="px-8 py-4">Expert Technique</th>
                <th className="px-8 py-4 text-center">Intervention</th>
                <th className="px-8 py-4 text-right">Statut Opé.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#dadce0]">
              {maintenance.map((t) => {
                const tech = technicians.find(tec => tec.id === t.assignedTechnicianId);
                return (
                  <tr 
                    key={t.id} 
                    onClick={() => setSelectedMaintenance(t)}
                    className={`hover:bg-[#f8faff] transition-colors group cursor-pointer ${selectedMaintenance?.id === t.id ? 'bg-[#e8f0fe]' : ''}`}
                  >
                    <td className="px-8 py-5">
                      <p className="font-black text-[#1a73e8]">#{t.id}</p>
                      <p className="text-[9px] text-[#9aa0a6] font-bold mt-1 uppercase">{formatDateShort(t.createdAt)}</p>
                    </td>
                    <td className="px-8 py-5">
                      <p className="text-sm font-bold text-[#3c4043] group-hover:text-[#1a73e8] transition-colors">{t.customerName}</p>
                      <p className="text-[10px] text-[#5f6368] flex items-center gap-1.5 mt-1">
                        <MapPin size={10} className="text-[#9aa0a6]" /> {t.location || t.showroom}
                      </p>
                    </td>
                    <td className="px-8 py-5">
                      {tech ? (
                        <div className="flex items-center gap-3">
                           <img src={tech.avatar} className="w-8 h-8 rounded-full border border-[#dadce0] p-0.5 bg-white" alt="" />
                           <span className="text-xs font-bold text-[#5f6368]">{tech.name}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 text-gray-300">
                           <div className="w-8 h-8 rounded-full border-2 border-dashed border-gray-200 flex items-center justify-center"><User size={12}/></div>
                           <span className="text-[10px] font-bold uppercase italic">Non assigné</span>
                        </div>
                      )}
                    </td>
                    <td className="px-8 py-5 text-center">
                       <div className="inline-flex flex-col items-center">
                          <span className="text-[10px] font-black text-[#5f6368] uppercase tracking-tighter">{t.category}</span>
                          {t.interventionReport?.durationMs && (
                             <span className="text-[9px] text-[#1a73e8] font-bold">{formatDuration(t.interventionReport.durationMs)}</span>
                          )}
                       </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                       <span className={`px-4 py-1.5 border text-[9px] font-black uppercase tracking-widest ${getStatusColor(t.status)}`}>
                         {t.status}
                       </span>
                    </td>
                  </tr>
                );
              })}
              {maintenance.length === 0 && (
                <tr>
                   <td colSpan={5} className="py-24 text-center">
                      <ClipboardList size={48} className="mx-auto text-gray-100 mb-4" />
                      <p className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Aucun dossier technique en cours</p>
                   </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAIL DRAWER FOR MAINTENANCE */}
      {selectedMaintenance && (
        <>
          <div className="fixed inset-0 bg-[#202124]/40 backdrop-blur-[2px] z-[60] animate-in fade-in" onClick={() => setSelectedMaintenance(null)} />
          <div className="fixed right-0 top-0 h-screen w-[550px] bg-white z-[70] flex flex-col shadow-2xl animate-in slide-in-from-right duration-500 border-l border-[#dadce0]">
            <div className="p-6 border-b border-[#dadce0] flex items-center justify-between bg-[#f8f9fa]">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 bg-white text-[#1a73e8] flex items-center justify-center border border-[#dadce0] shadow-sm">
                   <Settings2 size={24} />
                 </div>
                 <div>
                    <h2 className="text-xs font-black text-[#202124] uppercase tracking-[0.2em]">Dossier Terrain #{selectedMaintenance.id}</h2>
                    <p className="text-[10px] text-[#1a73e8] font-black uppercase mt-1 tracking-widest">{selectedMaintenance.category} • {selectedMaintenance.showroom}</p>
                 </div>
              </div>
              <button onClick={() => setSelectedMaintenance(null)} className="p-2 hover:bg-gray-200 transition-colors text-[#5f6368]">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar pb-32">
              {/* Chrono Alert */}
              {selectedMaintenance.status === 'En cours' && (
                <div className="p-6 bg-blue-50 border border-blue-100 flex items-center gap-6 animate-pulse shadow-sm">
                   <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-[#1a73e8] shadow-sm"><Timer size={24} /></div>
                   <div>
                      <p className="text-xs font-black text-[#1a73e8] uppercase tracking-widest">Chronographe Actif</p>
                      <p className="text-[10px] text-[#5f6368] font-medium mt-1 uppercase italic leading-tight">L'expert a validé le démarrage sur site. Temps réel décompté.</p>
                   </div>
                </div>
              )}

              {/* Status Section */}
              <section className="space-y-4">
                <h3 className="text-[10px] font-black text-[#9aa0a6] uppercase tracking-[0.2em] flex items-center gap-2">
                  <ShieldCheck size={16} /> Diagnostic post-Opération
                </h3>
                {selectedMaintenance.interventionReport?.equipmentStatus ? (
                  <div className={`p-6 flex items-center justify-between border-l-8 ${getEquipmentStatusColor(selectedMaintenance.interventionReport.equipmentStatus)}`}>
                    <div>
                      <p className="text-[9px] font-black uppercase opacity-70 mb-1">Condition du matériel</p>
                      <p className="text-lg font-black uppercase tracking-tight">{selectedMaintenance.interventionReport.equipmentStatus}</p>
                    </div>
                    {selectedMaintenance.interventionReport.durationMs && (
                      <div className="text-right">
                         <p className="text-[9px] font-black uppercase opacity-70 mb-1">Durée certifiée</p>
                         <p className="text-lg font-black">{formatDuration(selectedMaintenance.interventionReport.durationMs)}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-8 text-center border-2 border-dashed border-[#dadce0] bg-gray-50/50">
                    <ShieldQuestion size={32} className="mx-auto text-gray-200 mb-3" />
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Diagnostic en attente de l'expert</p>
                  </div>
                )}
              </section>

              {/* Équipement Section */}
              <section className="space-y-4">
                <h3 className="text-[10px] font-black text-[#9aa0a6] uppercase tracking-[0.2em] flex items-center gap-2">
                  <Package size={16} /> Identification Matériel
                </h3>
                <div className="p-6 bg-[#f8f9fa] border border-[#dadce0] space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-white border border-[#dadce0] shadow-sm"><Wrench size={20} className="text-[#1a73e8]" /></div>
                    <div>
                      <span className="text-[9px] font-black text-[#1a73e8] uppercase bg-blue-50 px-2 py-0.5 border border-blue-100">{selectedMaintenance.brand || 'Marque'}</span>
                      <h4 className="text-base font-bold text-[#202124] mt-2 leading-tight">{selectedMaintenance.productName || 'Sans désignation'}</h4>
                      <p className="text-[10px] font-mono text-[#5f6368] mt-1 font-black uppercase tracking-wider">S/N: {selectedMaintenance.serialNumber || 'NON SPECIFIÉ'}</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Technician Section */}
              <section className="space-y-4">
                <h3 className="text-[10px] font-black text-[#9aa0a6] uppercase tracking-[0.2em] flex items-center gap-2">
                  <User size={16} /> Responsable Technique
                </h3>
                <div className="p-6 border border-[#dadce0] bg-white flex items-center justify-between">
                   {selectedMaintenance.assignedTechnicianId ? (
                     <div className="flex items-center gap-4">
                        <img 
                          src={technicians.find(t => t.id === selectedMaintenance.assignedTechnicianId)?.avatar} 
                          className="w-14 h-14 border-2 border-[#1a73e8] p-0.5" 
                          alt="" 
                        />
                        <div>
                           <p className="text-sm font-bold text-[#3c4043]">{technicians.find(t => t.id === selectedMaintenance.assignedTechnicianId)?.name}</p>
                           <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">Expert Horizon Certifié</p>
                        </div>
                     </div>
                   ) : (
                     <p className="text-xs font-bold text-gray-400 italic">Aucun expert assigné pour le moment.</p>
                   )}
                   <span className={`px-3 py-1 border text-[9px] font-black uppercase ${getStatusColor(selectedMaintenance.status)}`}>{selectedMaintenance.status}</span>
                </div>
              </section>

              {/* Report History Section */}
              <section className="space-y-4">
                <h3 className="text-[10px] font-black text-[#9aa0a6] uppercase tracking-[0.2em] flex items-center gap-2">
                  <History size={16} /> Registre d'Intervention
                </h3>
                
                {selectedMaintenance.interventionReport && (selectedMaintenance.interventionReport.actionsTaken?.length || selectedMaintenance.interventionReport.partsUsed?.length) ? (
                   <div className="space-y-6">
                      <div className="p-6 bg-white border border-[#dadce0] shadow-sm space-y-4">
                         <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                           <h5 className="text-[10px] font-black uppercase text-[#5f6368]">Actions menées</h5>
                           {selectedMaintenance.status === 'Fermé' && <Lock size={12} className="text-gray-300" />}
                         </div>
                         <ul className="space-y-3">
                            {selectedMaintenance.interventionReport.actionsTaken?.map((action, idx) => (
                              <li key={idx} className="flex gap-3 text-xs text-[#3c4043] font-medium leading-relaxed">
                                 <div className="w-1.5 h-1.5 bg-[#1a73e8] mt-1.5 shrink-0" /> {action}
                              </li>
                            ))}
                         </ul>
                      </div>

                      {selectedMaintenance.interventionReport.partsUsed && selectedMaintenance.interventionReport.partsUsed.length > 0 && (
                        <div className="p-6 bg-[#f8f9fa] border border-[#dadce0]">
                            <h5 className="text-[10px] font-black uppercase text-[#5f6368] mb-4">Composants & Rechanges</h5>
                            <div className="flex flex-wrap gap-2">
                              {selectedMaintenance.interventionReport.partsUsed.map((part, idx) => (
                                <span key={idx} className="px-3 py-2 bg-white border border-[#dadce0] text-[10px] font-bold text-[#3c4043] flex items-center gap-3 shadow-sm uppercase tracking-tighter">
                                    <Package size={12} className="text-[#1a73e8]" />
                                    {part.name} <span className="text-[#1a73e8] font-black">x{part.quantity}</span>
                                </span>
                              ))}
                            </div>
                        </div>
                      )}
                   </div>
                ) : (
                  <div 
                    onClick={selectedMaintenance.status !== 'Fermé' ? openInterventionForm : undefined}
                    className={`p-12 text-center border-2 border-dashed border-[#dadce0] transition-all ${selectedMaintenance.status !== 'Fermé' ? 'hover:bg-blue-50/30 hover:border-[#1a73e8] cursor-pointer group' : 'bg-gray-50'}`}
                  >
                    <Activity className={`mx-auto mb-4 ${selectedMaintenance.status !== 'Fermé' ? 'text-gray-200 group-hover:text-[#1a73e8]' : 'text-gray-300'}`} size={40} />
                    <p className={`text-xs font-black uppercase tracking-widest ${selectedMaintenance.status !== 'Fermé' ? 'text-gray-400 group-hover:text-[#1a73e8]' : 'text-gray-300'}`}>Rapport technique vide</p>
                    {selectedMaintenance.status !== 'Fermé' && <p className="text-[9px] text-[#9aa0a6] mt-2 font-bold uppercase underline tracking-widest">Cliquer pour documenter</p>}
                  </div>
                )}
              </section>
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-8 border-t border-[#dadce0] bg-white flex gap-3">
              {selectedMaintenance.status !== 'Fermé' ? (
                <button 
                  onClick={openInterventionForm}
                  className="flex-1 btn-google-primary justify-center py-4 text-xs font-black uppercase tracking-[0.2em] shadow-xl"
                >
                  <Wrench size={18} /> {selectedMaintenance.interventionReport ? 'Modifier le Rapport' : 'Générer le Rapport Expert'}
                </button>
              ) : (
                <div className="flex-1 py-4 bg-gray-100 text-gray-400 text-xs font-black uppercase tracking-[0.2em] text-center border border-gray-200 flex items-center justify-center gap-2">
                   <Lock size={16} /> Dossier Technique Clos
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* MODAL RAPPORT TECHNIQUE OPTIMISÉ */}
      <Modal
        isOpen={isInterventionModalOpen}
        onClose={() => setIsInterventionModalOpen(false)}
        title="Formulaire d'Intervention Expert Horizon"
        size="lg"
      >
        <div className="space-y-10 animate-in fade-in">
           {/* Section État du Matériel */}
           <section className="space-y-4">
              <h4 className="text-[10px] font-black uppercase text-[#5f6368] tracking-widest flex items-center gap-2">
                <ShieldCheck size={14} className="text-[#1a73e8]" /> Diagnostic Final
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                 {(['Excellent', 'Bon', 'Critique', 'À remplacer'] as const).map(status => (
                   <button
                    key={status}
                    onClick={() => setEquipmentStatus(status)}
                    className={`py-4 px-2 border-2 text-[10px] font-black uppercase transition-all tracking-tighter ${
                      equipmentStatus === status 
                      ? 'bg-[#1a73e8] border-[#1a73e8] text-white shadow-lg'
                      : 'bg-white border-[#dadce0] text-[#5f6368] hover:border-[#1a73e8]'
                    }`}
                   >
                     {status}
                   </button>
                 ))}
              </div>
           </section>

           <section className="space-y-4">
              <h4 className="text-[10px] font-black uppercase text-[#5f6368] tracking-widest flex items-center gap-2">
                <History size={14} className="text-[#1a73e8]" /> Étapes Réalisées
              </h4>
              <div className="flex gap-2 bg-[#f8f9fa] p-2 border border-[#dadce0]">
                 <input 
                    type="text" 
                    value={currentAction}
                    onChange={(e) => setCurrentAction(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (() => { if(currentAction.trim()) { setActionsTaken([...actionsTaken, currentAction.trim()]); setCurrentAction(''); } })()}
                    placeholder="Ajouter une action (ex: Nettoyage bloc condensateur)..."
                    className="flex-1 bg-transparent border-none text-xs font-bold focus:ring-0"
                 />
                 <button onClick={() => { if(currentAction.trim()) { setActionsTaken([...actionsTaken, currentAction.trim()]); setCurrentAction(''); } }} className="w-10 h-10 bg-white border border-[#dadce0] flex items-center justify-center hover:bg-[#1a73e8] hover:text-white transition-all"><Plus size={20} /></button>
              </div>
              <div className="space-y-2 max-h-[160px] overflow-y-auto custom-scrollbar">
                 {actionsTaken.map((action, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-white border border-[#dadce0] group hover:border-[#1a73e8] transition-all">
                       <span className="text-xs text-[#3c4043] font-bold uppercase">{action}</span>
                       <button onClick={() => setActionsTaken(actionsTaken.filter((_, i) => i !== idx))} className="text-[#dadce0] hover:text-red-600 transition-colors"><Trash2 size={16} /></button>
                    </div>
                 ))}
                 {actionsTaken.length === 0 && <p className="text-[10px] text-gray-400 italic text-center py-4 font-bold uppercase">Aucune action documentée</p>}
              </div>
           </section>

           <section className="space-y-4">
              <h4 className="text-[10px] font-black uppercase text-[#5f6368] tracking-widest flex items-center gap-2">
                <FileText size={14} className="text-[#1a73e8]" /> Observations & Recommandations Client
              </h4>
              <textarea
                value={recommendations}
                onChange={(e) => setRecommendations(e.target.value)}
                className="w-full h-32 bg-white text-xs font-medium border-[#dadce0] focus:border-[#1a73e8] focus:ring-0 resize-none p-4"
                placeholder="Préciser la cause de la panne et les conseils d'utilisation..."
              ></textarea>
           </section>

           <section className="space-y-4">
              <h4 className="text-[10px] font-black uppercase text-[#5f6368] tracking-widest flex items-center gap-2">
                <Package size={14} className="text-[#1a73e8]" /> Composants Sortis du Stock
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="h-[200px] overflow-y-auto border border-[#dadce0] bg-[#f8f9fa] divide-y divide-[#dadce0] custom-scrollbar">
                    {parts.map(p => (
                       <button key={p.id} onClick={() => {
                          const existing = usedParts.find(up => up.id === p.id);
                          if (existing) setUsedParts(usedParts.map(up => up.id === p.id ? { ...up, quantity: up.quantity + 1 } : up));
                          else setUsedParts([...usedParts, { id: p.id, name: p.name, quantity: 1, unitPrice: p.unitPrice }]);
                       }} className="w-full text-left p-4 hover:bg-white flex items-center justify-between group transition-all">
                          <div>
                             <p className="text-xs font-black text-[#3c4043] uppercase tracking-tighter">{p.name}</p>
                             <p className="text-[9px] text-[#1a73e8] font-bold uppercase mt-0.5">{p.brand} • Stock: {p.currentStock}</p>
                          </div>
                          <Plus size={16} className="text-[#1a73e8] opacity-0 group-hover:opacity-100 transition-opacity" />
                       </button>
                    ))}
                 </div>
                 <div className="space-y-3 max-h-[200px] overflow-y-auto custom-scrollbar pr-1">
                    {usedParts.map((p, idx) => (
                       <div key={idx} className="flex items-center justify-between p-4 bg-white border border-[#dadce0] shadow-sm">
                          <p className="text-[10px] font-black text-[#3c4043] uppercase flex-1">{p.name}</p>
                          <div className="flex items-center gap-4">
                             <div className="flex items-center border border-[#dadce0]">
                                <button onClick={() => setUsedParts(usedParts.map((item, i) => i === idx ? { ...item, quantity: Math.max(1, item.quantity - 1) } : item))} className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 text-[#5f6368]">-</button>
                                <span className="w-8 text-center text-xs font-black">{p.quantity}</span>
                                <button onClick={() => setUsedParts(usedParts.map((item, i) => i === idx ? { ...item, quantity: item.quantity + 1 } : item))} className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 text-[#5f6368]">+</button>
                             </div>
                             <button onClick={() => setUsedParts(usedParts.filter((_, i) => i !== idx))} className="text-red-500 hover:text-red-700 transition-colors p-1"><X size={18} /></button>
                          </div>
                       </div>
                    ))}
                    {usedParts.length === 0 && <div className="h-full flex flex-col items-center justify-center opacity-20 py-10"><Package size={32} /><p className="text-[10px] font-black uppercase mt-2">Aucune pièce sélectionnée</p></div>}
                 </div>
              </div>
           </section>

           <div className="flex gap-4 pt-8 border-t border-[#dadce0]">
              <button onClick={handleSaveIntervention} className="flex-1 btn-google-primary justify-center py-5 text-xs font-black uppercase tracking-[0.2em] shadow-xl">
                 <Save size={20} /> Transmettre au Management
              </button>
              <button onClick={() => setIsInterventionModalOpen(false)} className="btn-google-outlined px-12 font-black uppercase text-[10px] tracking-widest transition-colors">Annuler</button>
           </div>
        </div>
      </Modal>

      {/* MODAL CALENDRIER SHARP */}
      <Modal isOpen={isCalendarOpen} onClose={() => setIsCalendarOpen(false)} title="Planning Central Horizon" size="lg">
         <div className="space-y-8 animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between bg-[#f8f9fa] p-6 border border-[#dadce0]">
               <h3 className="text-xl font-light text-[#202124] capitalize">
                  {currentDate.toLocaleString('fr-FR', { month: 'long', year: 'numeric' })}
               </h3>
               <div className="flex gap-1 border border-[#dadce0] bg-white">
                  <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))} className="p-3 hover:bg-gray-100 transition-colors"><ChevronLeft size={20}/></button>
                  <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))} className="p-3 hover:bg-gray-100 transition-colors border-l border-[#dadce0]"><ChevronRight size={20}/></button>
               </div>
            </div>

            <div className="grid grid-cols-7 gap-px bg-[#dadce0] border border-[#dadce0] shadow-xl">
               {['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map(d => (
                 <div key={d} className="bg-[#f8f9fa] py-3 text-center text-[10px] font-black text-[#5f6368] uppercase tracking-[0.2em] border-b border-[#dadce0]">{d}</div>
               ))}
               {calendarDays.map((day, idx) => {
                 const dayTickets = getTicketsForDay(day);
                 return (
                   <div key={idx} className="bg-white min-h-[120px] p-2 hover:bg-[#f8f9ff] transition-colors relative group">
                      <span className={`text-xs font-black ${day ? 'text-[#dadce0] group-hover:text-[#1a73e8]' : 'text-transparent'}`}>{day}</span>
                      <div className="mt-2 space-y-1">
                         {dayTickets.map(ticket => (
                           <div 
                            key={ticket.id} 
                            onClick={() => { setSelectedMaintenance(ticket); setIsCalendarOpen(false); }}
                            className={`px-2 py-1 text-[8px] font-black uppercase truncate cursor-pointer border ${ticket.status === 'Résolu' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-blue-50 text-[#1a73e8] border-blue-100 shadow-sm'}`}
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
    </div>
  );
};

export default MaintenanceLog;
