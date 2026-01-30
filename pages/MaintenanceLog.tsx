
import React, { useState, useMemo, useEffect } from 'react';
import { 
  ClipboardList, Search, RefreshCw, CalendarDays, MapPin, ArrowUpRight, Filter, 
  MoreHorizontal, X, User, History, Package, CheckCircle2, 
  Clock, Activity, FileText, Wrench, ChevronLeft, ChevronRight, Plus, Trash2, Save,
  AlertTriangle, CheckSquare, ShieldCheck, Hash, Tag, Calendar, ShieldQuestion, Lock,
  LayoutList, LayoutGrid, Timer, Settings2, SlidersHorizontal, RotateCcw,
  ChevronDown, ChevronUp, Boxes, MapPinned, Users, FileSpreadsheet, Download,
  FileDown, Edit3, ClipboardCheck
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useData, useNotifications, useUser } from '../App';
import { Ticket, UsedPart, InterventionReport } from '../types';
import Modal from '../components/Modal';
import Drawer from '../components/Drawer';

const MaintenanceLog: React.FC = () => {
  const { tickets, technicians, isLoading, refreshAll, isSyncing, parts, saveTicket, addStockMovement, showrooms } = useData();
  const { currentUser } = useUser();
  const { addNotification } = useNotifications();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Tous');
  const [techFilter, setTechFilter] = useState<string>('Tous');
  const [showroomFilter, setShowroomFilter] = useState<string>('Tous');
  const [dateRange, setDateRange] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const [selectedMaintenance, setSelectedMaintenance] = useState<Ticket | null>(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());

  const [isInterventionModalOpen, setIsInterventionModalOpen] = useState(false);
  const [actionsTaken, setActionsTaken] = useState<string[]>([]);
  const [usedParts, setUsedParts] = useState<UsedPart[]>([]);
  const [recommendations, setRecommendations] = useState('');
  const [equipmentStatus, setEquipmentStatus] = useState<InterventionReport['equipmentStatus']>('Bon');
  const [currentAction, setCurrentAction] = useState('');

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
      const matchesShowroom = showroomFilter === 'Tous' || t.showroom === showroomFilter;

      let matchesDate = true;
      if (dateRange !== 'all') {
        const ticketDate = new Date(t.createdAt);
        const now = new Date();
        if (dateRange === 'today') matchesDate = ticketDate.toDateString() === now.toDateString();
        else if (dateRange === 'week') {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          matchesDate = ticketDate >= weekAgo;
        } else if (dateRange === 'month') {
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          matchesDate = ticketDate >= monthAgo;
        }
      }

      return matchesSearch && matchesStatus && matchesShowroom && matchesDate;
    }).sort((a, b) => new Date(b.lastUpdate || b.createdAt).getTime() - new Date(a.lastUpdate || a.createdAt).getTime());
  }, [tickets, searchTerm, statusFilter, techFilter, showroomFilter, dateRange, currentUser]);

  const stats = useMemo(() => ([
    { label: 'Opérations Terrain', value: filteredMaintenance.length, icon: <Activity size={20}/>, color: '#1a73e8', title: "Volume d'interventions hors showroom" },
    { label: 'Attente Approbation', value: filteredMaintenance.filter(m => m.status === 'En attente d\'approbation').length, icon: <Timer size={20}/>, color: '#a142f4', title: "Rapports terminés à valider par le management" },
    { label: 'Experts Actifs', value: technicians.filter(t => t.status === 'En intervention').length, icon: <User size={20}/>, color: '#f9ab00', title: "Techniciens actuellement déployés" },
    { label: 'Urgences Terrain', value: filteredMaintenance.filter(m => m.priority === 'Urgent').length, icon: <AlertTriangle size={20}/>, color: '#d93025', title: "Dossiers terrain prioritaires" }
  ]), [filteredMaintenance, technicians]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Résolu': return 'bg-green-50 text-green-700 border-green-200';
      case 'Fermé': return 'bg-gray-50 text-gray-600 border-gray-300';
      case 'En attente d\'approbation': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'En cours': return 'bg-amber-50 text-amber-700 border-amber-300';
      default: return 'bg-blue-50 text-blue-700 border-blue-200';
    }
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
      }
    };

    try {
      await saveTicket(updatedTicket);
      setIsInterventionModalOpen(false);
      setSelectedMaintenance(updatedTicket);
      addNotification({ title: 'Rapport Clos', message: 'Dossier transmis pour validation.', type: 'success' });
    } catch (err) {
      addNotification({ title: 'Erreur', message: 'Échec de la synchronisation.', type: 'error' });
    }
  };

  if (isLoading) return <div className="h-[80vh] flex items-center justify-center"><RefreshCw className="animate-spin text-[#1a73e8]" size={32} /></div>;

  return (
    <div className="space-y-8 animate-page-entry pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-light text-[#202124]">Maintenance & Terrain</h1>
          <p className="text-[10px] text-[#5f6368] font-black uppercase tracking-widest mt-1">Management opérationnel Royal Plaza Horizon</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setIsCalendarOpen(true)} className="btn-google-outlined h-11 px-6 flex items-center gap-3" title="Consulter le calendrier des interventions programmées">
            <CalendarDays size={18} /> <span>Planning Expert</span>
          </button>
          <button onClick={refreshAll} className="btn-google-outlined h-11 px-4" title="Actualiser le journal terrain"><RefreshCw size={18} /></button>
        </div>
      </header>

      {/* MONITORING GRID */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
         {stats.map((stat, i) => (
           <div key={i} className="stats-card border-l-4 border-none shadow-xl bg-white ring-1 ring-black/5" style={{ borderLeft: `4px solid ${stat.color}` }} title={stat.title}>
              <div className="flex justify-between items-start">
                 <div>
                    <p className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest mb-1">{stat.label}</p>
                    <h3 className="text-3xl font-bold text-[#202124] tracking-tighter">{stat.value}</h3>
                 </div>
                 <div className="p-2.5 bg-gray-50 text-gray-400">{stat.icon}</div>
              </div>
           </div>
         ))}
      </div>

      {/* FILTER CENTER */}
      <div className="google-card overflow-hidden border-none shadow-xl bg-white ring-1 ring-black/5 p-8">
         <div className="flex flex-col xl:flex-row gap-8">
            <div className="relative flex-1 group" title="Chercher par client ou par quartier de destination">
               <Search className="absolute left-6 top-5 text-[#9aa0a6] group-focus-within:text-[#1a73e8] transition-colors" size={24} />
               <input 
                type="text" 
                placeholder="Rechercher un dossier par client ou localisation..." 
                className="w-full pl-16 h-16 bg-[#f8f9fa] border-none text-base font-bold shadow-inner transition-all focus:bg-white focus:ring-2 focus:ring-blue-100"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
               />
            </div>
            <div className="flex items-center gap-4">
               <div className="flex bg-[#f1f3f4] p-1 shadow-inner">
                  {['Tous', 'En cours', 'En attente d\'approbation'].map(st => (
                    <button 
                      key={st} 
                      onClick={() => setStatusFilter(st)}
                      className={`px-6 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${statusFilter === st ? 'bg-white text-[#1a73e8] shadow-md' : 'text-[#5f6368] hover:text-[#202124]'}`}
                      title={st === 'Tous' ? "Afficher toutes les interventions terrain" : st === 'En cours' ? "Dossiers dont l'expert est sur site" : "Dossiers terminés attendant validation"}
                    >
                      {st === 'Tous' ? 'Flux Global' : st === 'En cours' ? 'Sur Site' : 'Rapports'}
                    </button>
                  ))}
               </div>
               <button 
                 onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                 title={showAdvancedFilters ? "Masquer les critères avancés" : "Plus de critères (Showroom, Expert)"}
                 className={`p-4.5 border-2 transition-all ${showAdvancedFilters ? 'bg-blue-600 text-white border-blue-600 shadow-lg' : 'bg-white border-[#dadce0] text-[#5f6368] hover:border-[#1a73e8]'}`}
               >
                 <SlidersHorizontal size={22} />
               </button>
            </div>
         </div>

         {showAdvancedFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-[#f1f3f4] mt-8 animate-in slide-in-from-top-4 duration-500">
               <div className="space-y-2">
                  <label className="text-[9px] font-black text-[#9aa0a6] uppercase tracking-widest flex items-center gap-2" title="Point de vente à l'origine du dossier"><MapPinned size={12} /> Zone Showroom</label>
                  <select value={showroomFilter} onChange={e => setShowroomFilter(e.target.value)} className="w-full h-12 bg-[#f8f9fa] border-none text-[11px] font-black uppercase focus:ring-2 focus:ring-[#1a73e8] appearance-none px-5" title="Sélectionner un site physique">
                      <option value="Tous">Tous les sites</option>
                      {showrooms.map(s => <option key={s.id} value={s.id}>{s.id}</option>)}
                  </select>
               </div>
               <div className="space-y-2">
                  <label className="text-[9px] font-black text-[#9aa0a6] uppercase tracking-widest flex items-center gap-2" title="Technicien assigné à la mission"><Users size={12} /> Expert Assigné</label>
                  <select value={techFilter} onChange={e => setTechFilter(e.target.value)} className="w-full h-12 bg-[#f8f9fa] border-none text-[11px] font-black uppercase focus:ring-2 focus:ring-[#1a73e8] appearance-none px-5" title="Filtrer par intervenant technique">
                      <option value="Tous">Tous les experts</option>
                      {technicians.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
               </div>
            </div>
         )}
      </div>

      <div className="google-card overflow-hidden border-none shadow-xl bg-white ring-1 ring-black/5">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#dadce0] bg-[#f8f9fa] text-[#5f6368] text-[9px] font-black uppercase tracking-[0.2em]">
                <th className="px-10 py-6">ID Dossier & Date</th>
                <th className="px-10 py-6">Client & Localisation</th>
                <th className="px-10 py-6">Expert Horizon</th>
                <th className="px-10 py-6 text-center">Type Opé.</th>
                <th className="px-10 py-6 text-right">État Terrain</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#dadce0]">
              {filteredMaintenance.map((t) => (
                <tr 
                  key={t.id} 
                  onClick={() => setSelectedMaintenance(t)}
                  className={`hover:bg-[#f8faff] transition-colors group cursor-pointer ${selectedMaintenance?.id === t.id ? 'bg-[#e8f0fe]' : 'bg-white'}`}
                  title={`Détails techniques de l'intervention #${t.id}`}
                >
                  <td className="px-10 py-6">
                    <p className="font-black text-[#1a73e8] text-sm">#{t.id}</p>
                    <p className="text-[9px] text-[#9aa0a6] font-bold mt-1.5 uppercase tracking-widest">{new Date(t.createdAt).toLocaleDateString()}</p>
                  </td>
                  <td className="px-10 py-6">
                    <p className="text-sm font-black text-[#3c4043] group-hover:text-[#1a73e8] transition-colors">{t.customerName}</p>
                    <div className="text-[10px] text-[#5f6368] flex items-center gap-2 mt-1.5 uppercase tracking-tighter">
                      <MapPin size={10} className="text-[#9aa0a6]" /> <span>{t.location || t.showroom}</span>
                    </div>
                  </td>
                  <td className="px-10 py-6">
                    <div className="flex items-center gap-3" title={`Expert: ${technicians.find(tec => tec.id === t.assignedTechnicianId)?.name || 'Non assigné'}`}>
                       <img src={technicians.find(tec => tec.id === t.assignedTechnicianId)?.avatar} className="w-9 h-9 rounded-none border border-[#dadce0] p-0.5 bg-white shadow-sm" alt="" />
                       <span className="text-xs font-black text-[#5f6368]">{technicians.find(tec => tec.id === t.assignedTechnicianId)?.name || 'En attente'}</span>
                    </div>
                  </td>
                  <td className="px-10 py-6 text-center">
                    <span className="text-[10px] font-black text-[#5f6368] uppercase tracking-tighter" title={`Catégorie de mission: ${t.category}`}>{t.category}</span>
                  </td>
                  <td className="px-10 py-6 text-right">
                    <span className={`px-5 py-2 border text-[9px] font-black uppercase tracking-widest inline-block shadow-sm ${getStatusColor(t.status)}`} title={`État actuel: ${t.status}`}>
                       {t.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* DRAWER MAINTENANCE */}
      <Drawer
        isOpen={!!selectedMaintenance}
        onClose={() => setSelectedMaintenance(null)}
        title="Diagnostic & Intervention Terrain"
        subtitle={`Dossier #${selectedMaintenance?.id} • Expert: ${technicians.find(te => te.id === selectedMaintenance?.assignedTechnicianId)?.name}`}
        icon={<Wrench size={20} />}
        footer={
          <div className="flex gap-3">
             {selectedMaintenance?.status !== 'Fermé' ? (
               <button 
                onClick={openInterventionForm}
                className="flex-1 btn-google-primary justify-center py-4 text-xs font-black uppercase tracking-widest shadow-xl"
                title="Rédiger les actions effectuées et pièces remplacées"
               >
                 <Edit3 size={18} /> Documenter le Rapport
               </button>
             ) : (
               <div className="flex-1 py-4 bg-gray-100 text-gray-400 text-xs font-black uppercase text-center border border-gray-200 flex items-center justify-center gap-2" title="Ce dossier est verrouillé">
                 <Lock size={16} /> Archive Technique Clôturée
               </div>
             )}
          </div>
        }
      >
        {selectedMaintenance && (
          <div className="space-y-10">
             <section className="p-8 bg-[#f8f9fa] border border-[#dadce0] space-y-4">
                <div className="flex items-start gap-4">
                   <div className="p-3 bg-white border border-[#dadce0] shadow-sm"><Package size={24} className="text-[#1a73e8]" /></div>
                   <div>
                      <span className="text-[9px] font-black text-[#1a73e8] uppercase bg-blue-50 px-2 py-0.5 border border-blue-100">{selectedMaintenance.brand}</span>
                      <h4 className="text-lg font-black text-[#202124] mt-2 leading-tight">{selectedMaintenance.productName}</h4>
                      <p className="text-[10px] font-mono text-[#5f6368] mt-1 font-black uppercase tracking-wider" title="Numéro d'identification unique du châssis">S/N: {selectedMaintenance.serialNumber || 'NON SPECIFIÉ'}</p>
                   </div>
                </div>
             </section>

             <section className="space-y-4">
                <h3 className="text-[10px] font-black text-[#9aa0a6] uppercase tracking-[0.2em] flex items-center gap-2"><ShieldCheck size={16} /> État du matériel post-opération</h3>
                {selectedMaintenance.interventionReport?.equipmentStatus ? (
                   <div className={`p-6 flex items-center justify-between border-l-8 ${selectedMaintenance.interventionReport.equipmentStatus === 'Excellent' ? 'bg-green-50 border-green-600' : 'bg-blue-50 border-blue-600'}`} title="Résultat du diagnostic final">
                      <div>
                         <p className="text-[9px] font-black uppercase text-[#5f6368] mb-1">Condition diagnostiquée</p>
                         <p className="text-xl font-black uppercase tracking-tight text-[#202124]">{selectedMaintenance.interventionReport.equipmentStatus}</p>
                      </div>
                   </div>
                ) : (
                   <div className="p-12 text-center border-2 border-dashed border-[#dadce0] bg-gray-50/50">
                      <ShieldQuestion size={40} className="mx-auto text-gray-200 mb-3 opacity-50" />
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">En attente de diagnostic expert</p>
                   </div>
                )}
             </section>

             <section className="space-y-4">
                <h3 className="text-[10px] font-black text-[#9aa0a6] uppercase tracking-[0.2em] flex items-center gap-2"><History size={16} /> Journal des Actions Menées</h3>
                {selectedMaintenance.interventionReport?.actionsTaken?.length ? (
                   <div className="space-y-3">
                      {selectedMaintenance.interventionReport.actionsTaken.map((action, i) => (
                         <div key={i} className="p-4 bg-white border border-[#dadce0] text-xs font-bold text-[#3c4043] flex items-center gap-4 uppercase tracking-tighter" title="Action technique validée">
                            <div className="w-1.5 h-1.5 bg-[#1a73e8]" /> {action}
                         </div>
                      ))}
                   </div>
                ) : (
                   <div className="py-10 text-center border-2 border-dashed border-[#dadce0] bg-gray-50/50">
                      <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Aucune étape enregistrée</p>
                   </div>
                )}
             </section>
          </div>
        )}
      </Drawer>

      {/* MODAL RAPPORT TECHNIQUE */}
      <Modal isOpen={isInterventionModalOpen} onClose={() => setIsInterventionModalOpen(false)} title="Saisie du Rapport Expert Horizon" size="lg">
         <div className="space-y-10 animate-in fade-in">
            <section className="space-y-4">
               <h4 className="text-[10px] font-black uppercase text-[#5f6368] tracking-widest flex items-center gap-2"><Activity size={14} className="text-[#1a73e8]" /> Diagnostic Matériel</h4>
               <div className="grid grid-cols-4 gap-3">
                  {(['Excellent', 'Bon', 'Critique', 'À remplacer'] as const).map(status => (
                    <button key={status} onClick={() => setEquipmentStatus(status)} className={`py-4 border-2 text-[9px] font-black uppercase tracking-tighter transition-all ${equipmentStatus === status ? 'bg-[#1a73e8] border-[#1a73e8] text-white shadow-lg' : 'bg-white border-[#dadce0] text-[#5f6368] hover:border-[#1a73e8]'}`} title={`Évaluation de santé: ${status}`}>{status}</button>
                  ))}
               </div>
            </section>
            <section className="space-y-4">
               <h4 className="text-[10px] font-black uppercase text-[#5f6368] tracking-widest flex items-center gap-2"><ClipboardCheck size={14} className="text-[#1a73e8]" /> Travaux Effectués</h4>
               <div className="flex gap-2 bg-[#f8f9fa] p-2 border border-[#dadce0]">
                  <input type="text" value={currentAction} onChange={e => setCurrentAction(e.target.value)} onKeyDown={e => e.key === 'Enter' && (() => { if(currentAction.trim()) { setActionsTaken([...actionsTaken, currentAction.trim()]); setCurrentAction(''); } })()} placeholder="Ajouter une action (ex: Nettoyage bloc)..." className="flex-1 bg-transparent border-none text-xs font-bold focus:ring-0" title="Saisir manuellement une tâche technique effectuée" />
                  <button onClick={() => { if(currentAction.trim()) { setActionsTaken([...actionsTaken, currentAction.trim()]); setCurrentAction(''); } }} className="w-10 h-10 bg-[#1a73e8] text-white border-none flex items-center justify-center shadow-lg" title="Enregistrer cette action technique"><Plus size={20}/></button>
               </div>
               <div className="space-y-2">
                  {actionsTaken.map((action, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-white border border-[#dadce0] group hover:border-[#1a73e8] transition-all shadow-sm">
                       <span className="text-[10px] text-[#3c4043] font-black uppercase">{action}</span>
                       <button onClick={() => setActionsTaken(actionsTaken.filter((_, idx) => idx !== i))} className="text-[#dadce0] hover:text-red-600 transition-colors" title="Retirer cette action"><Trash2 size={16}/></button>
                    </div>
                  ))}
               </div>
            </section>
            <div className="flex gap-4 pt-8 border-t border-[#dadce0]">
               <button onClick={handleSaveIntervention} className="flex-1 btn-google-primary justify-center py-5 text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-blue-600/20" title="Transmettre le rapport technique pour archivage et validation management"><Save size={20} /> Valider le Rapport Expert</button>
               <button onClick={() => setIsInterventionModalOpen(false)} className="btn-google-outlined px-12 font-black uppercase text-[10px] tracking-widest" title="Quitter sans enregistrer le rapport">Abandonner</button>
            </div>
         </div>
      </Modal>

      {/* CALENDAR MODAL */}
      <Modal isOpen={isCalendarOpen} onClose={() => setIsCalendarOpen(false)} title="Planning Central Terrain" size="lg">
         <div className="space-y-8 animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between bg-[#f8f9fa] p-6 border border-[#dadce0]">
               <h3 className="text-xl font-light text-[#202124] capitalize">{currentDate.toLocaleString('fr-FR', { month: 'long', year: 'numeric' })}</h3>
               <div className="flex gap-1 border border-[#dadce0] bg-white">
                  <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))} className="p-3 hover:bg-gray-100 transition-colors border-none" title="Mois précédent"><ChevronLeft size={20}/></button>
                  <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))} className="p-3 hover:bg-gray-100 transition-colors border-l border-[#dadce0]" title="Mois suivant"><ChevronRight size={20}/></button>
               </div>
            </div>
            <div className="grid grid-cols-7 gap-px bg-[#dadce0] border border-[#dadce0] shadow-xl">
               {['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map(d => (
                 <div key={d} className="bg-[#f8f9fa] py-3 text-center text-[10px] font-black text-[#5f6368] uppercase tracking-[0.2em] border-b border-[#dadce0]">{d}</div>
               ))}
               {Array.from({ length: 35 }).map((_, idx) => (
                 <div key={idx} className="bg-white min-h-[120px] p-2 hover:bg-[#f8f9ff] transition-colors relative group border border-transparent hover:border-blue-100" title={`Cliquer pour programmer une intervention le ${idx + 1}`}>
                    <span className="text-[10px] font-black text-[#dadce0] group-hover:text-[#1a73e8]">{idx + 1}</span>
                 </div>
               ))}
            </div>
         </div>
      </Modal>
    </div>
  );
};

export default MaintenanceLog;
