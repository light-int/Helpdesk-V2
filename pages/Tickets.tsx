
import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Plus, Search, RefreshCw, Filter, MoreHorizontal, 
  Sparkles, User, Clock, CheckCircle2, Ticket as TicketIcon,
  AlertCircle, DollarSign, X, ChevronRight, ClipboardCheck, Info,
  Calendar, CreditCard, FileText, Settings, Activity, Save, Package,
  Edit3, Trash2, UserPlus, MapPin, Printer, Share2, MessageSquare,
  TrendingUp, Truck, Wrench, Users, History, AlertTriangle, ShieldCheck, Lock,
  ShieldAlert, Tag, Hash, Archive, Eye, Smartphone, Briefcase, Play,
  Zap, Map, Layers, Target, Headphones, Receipt, Info as InfoIcon, FilterX, BellRing,
  SlidersHorizontal, LayoutGrid, ListFilter, MapPinned, ChevronLeft, ArrowUpRight,
  Timer, BarChart3, RotateCcw, Boxes, Shapes, CalendarDays, Sliders, ChevronDown, ChevronUp,
  CreditCard as PaymentIcon, Gauge, CheckCircle, Wallet, Send, PlayCircle, PlusCircle, MinusCircle,
  CalendarCheck, Target as ImpactIcon, Globe
} from 'lucide-react';
import { useData, useNotifications, useUser } from '../App';
import { Ticket, TicketStatus, TicketCategory, Showroom, UsedPart, Customer, Technician, FinancialDetail, InterventionReport, Part } from '../types';
import Modal from '../components/Modal';
import Drawer from '../components/Drawer';

const TICKETS_PER_PAGE = 20;

const Tickets: React.FC = () => {
  const { 
    tickets, refreshAll, isSyncing, technicians, products, 
    customers, saveTicket, saveCustomer, deleteTicket, showrooms, parts, addStockMovement 
  } = useData();
  const { currentUser } = useUser();
  const { addNotification } = useNotifications();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Tous');
  const [priorityFilter, setPriorityFilter] = useState<string>('Toutes');
  const [showroomFilter, setShowroomFilter] = useState<string>('Tous');
  const [categoryFilter, setCategoryFilter] = useState<string>('Toutes');
  
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  
  // États pour le Rapport d'Intervention
  const [reportActions, setReportActions] = useState<string[]>([]);
  const [reportParts, setReportParts] = useState<UsedPart[]>([]);
  const [reportStatus, setReportStatus] = useState<InterventionReport['equipmentStatus']>('Bon');
  const [currentAction, setCurrentAction] = useState('');

  const [currentPage, setCurrentPage] = useState(1);

  const canCreateTicket = currentUser?.role !== 'TECHNICIAN';
  const isManager = currentUser?.role === 'MANAGER' || currentUser?.role === 'ADMIN';

  // Helper colors
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Urgent': return 'bg-red-600';
      case 'Haute': return 'bg-orange-500';
      case 'Moyenne': return 'bg-blue-500';
      default: return 'bg-gray-400';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Nouveau': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'En cours': return 'bg-amber-50 text-amber-700 border-amber-300';
      case 'En attente d\'approbation': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Résolu': return 'bg-green-50 text-green-700 border-green-200';
      case 'Fermé': return 'bg-gray-100 text-gray-500 border-gray-300';
      default: return 'bg-gray-50 text-gray-500 border-gray-200';
    }
  };

  useEffect(() => { refreshAll(); }, []);

  useEffect(() => {
    const ticketId = searchParams.get('id');
    if (ticketId && (tickets || []).length > 0) {
      const found = tickets.find(t => t.id === ticketId);
      if (found) {
        setSelectedTicket(found);
        setSearchParams({}, { replace: true });
      }
    }
  }, [searchParams, tickets, setSearchParams]);

  const allFilteredTickets = useMemo(() => {
    return (tickets || []).filter(t => {
      if (t.isArchived) return false;
      
      if (currentUser?.role === 'TECHNICIAN') {
        const isMine = t.assignedTechnicianId === currentUser.id;
        const isNewInMyShowroom = t.status === 'Nouveau' && t.showroom === currentUser.showroom;
        if (!isMine && !isNewInMyShowroom) return false;
      }
      
      const matchesSearch = (t.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (t.id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (t.serialNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (t.productName || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'Tous' || t.status === statusFilter;
      const matchesPriority = priorityFilter === 'Toutes' || t.priority === priorityFilter;
      const matchesShowroom = showroomFilter === 'Tous' || t.showroom === showroomFilter;
      const matchesCategory = categoryFilter === 'Toutes' || t.category === categoryFilter;

      return matchesSearch && matchesStatus && matchesPriority && matchesShowroom && matchesCategory;
    }).sort((a, b) => {
      if (a.priority === 'Urgent' && b.priority !== 'Urgent') return -1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [tickets, searchTerm, statusFilter, priorityFilter, showroomFilter, categoryFilter, currentUser]);

  const paginatedTickets = useMemo(() => {
    const startIndex = (currentPage - 1) * TICKETS_PER_PAGE;
    return allFilteredTickets.slice(startIndex, startIndex + TICKETS_PER_PAGE);
  }, [allFilteredTickets, currentPage]);

  const handleIntervene = async () => {
    if (!selectedTicket || !currentUser) return;
    
    if (selectedTicket.status === 'Nouveau') {
      const updated: Ticket = { 
        ...selectedTicket, 
        status: 'En cours', 
        assignedTechnicianId: selectedTicket.assignedTechnicianId || currentUser.id, 
        lastUpdate: new Date().toISOString(),
        interventionReport: {
          ...selectedTicket.interventionReport,
          startedAt: new Date().toISOString()
        }
      };
      await saveTicket(updated);
      setSelectedTicket(updated);
      addNotification({ title: 'Intervention', message: 'Statut mis à jour : En cours.', type: 'info' });
    }
    
    setReportActions(selectedTicket.interventionReport?.actionsTaken || []);
    setReportParts(selectedTicket.interventionReport?.partsUsed || []);
    setReportStatus(selectedTicket.interventionReport?.equipmentStatus || 'Bon');
    setIsReportModalOpen(true);
  };

  const handleSaveReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;

    const updated: Ticket = {
      ...selectedTicket,
      status: 'En attente d\'approbation',
      lastUpdate: new Date().toISOString(),
      interventionReport: {
        ...selectedTicket.interventionReport,
        actionsTaken: reportActions,
        partsUsed: reportParts,
        equipmentStatus: reportStatus,
        performedAt: new Date().toISOString()
      }
    };

    try {
      await saveTicket(updated);
      for (const usedPart of reportParts) {
        await addStockMovement({
          partId: usedPart.id!,
          partName: usedPart.name,
          quantity: usedPart.quantity,
          type: 'OUT',
          reason: `Intervention Expert #${selectedTicket.id}`,
          performedBy: currentUser?.name || 'Technicien Horizon',
          ticketId: selectedTicket.id
        });
      }
      setIsReportModalOpen(false);
      setSelectedTicket(updated);
      addNotification({ title: 'Succès', message: 'Rapport technique synchronisé.', type: 'success' });
    } catch (err) {
      addNotification({ title: 'Erreur', message: 'Échec de synchronisation.', type: 'error' });
    }
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const customerPhone = formData.get('customerPhone') as string;
    const customerName = formData.get('customerName') as string;
    
    let targetCustomerId = editingTicket?.customerId;
    const existingCustomer = customers.find(c => c.phone === customerPhone);
    
    if (!existingCustomer) {
      const newId = `C-${Math.floor(10000 + Math.random() * 89999)}`;
      await saveCustomer({
        id: newId, name: customerName, phone: customerPhone, email: '', type: 'Particulier',
        address: formData.get('location') as string || '', status: 'Actif',
        totalSpent: 0, ticketsCount: 1, lastVisit: new Date().toISOString()
      });
      targetCustomerId = newId;
    } else {
      targetCustomerId = existingCustomer.id;
    }

    const ticketData: Ticket = {
      ...(editingTicket || {}),
      id: editingTicket?.id || `T-${Math.floor(1000 + Math.random() * 9000)}`,
      customerId: targetCustomerId,
      customerName,
      customerPhone,
      brand: formData.get('brand') as string,
      productName: formData.get('productName') as string,
      serialNumber: formData.get('serialNumber') as string,
      location: formData.get('location') as string,
      source: (formData.get('source') as any) || (editingTicket?.source || 'Phone'),
      showroom: (formData.get('showroom') as any) || (editingTicket?.showroom || 'Glass'),
      category: (formData.get('category') as any) || (editingTicket?.category || 'SAV'),
      status: (formData.get('status') as any) || (editingTicket?.status || 'Nouveau'),
      priority: (formData.get('priority') as any) || 'Moyenne',
      description: formData.get('description') as string,
      assignedTechnicianId: formData.get('assignedTechnicianId') as string || editingTicket?.assignedTechnicianId,
      clientImpact: (formData.get('clientImpact') as any) || 'Modéré',
      createdAt: editingTicket?.createdAt || new Date().toISOString(),
      lastUpdate: new Date().toISOString(),
    } as Ticket;

    await saveTicket(ticketData);
    setIsModalOpen(false);
    setEditingTicket(null);
    if (selectedTicket?.id === ticketData.id) setSelectedTicket(ticketData);
  };

  const renderStepper = (status: TicketStatus) => {
    const steps: TicketStatus[] = ['Nouveau', 'En cours', 'En attente d\'approbation', 'Résolu', 'Fermé'];
    const currentIdx = steps.indexOf(status);
    return (
      <div className="flex items-center justify-between w-full px-4 py-6">
        {steps.map((step, idx) => (
          <React.Fragment key={step}>
            <div className="flex flex-col items-center relative z-10">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${idx <= currentIdx ? 'bg-[#1a73e8] border-[#1a73e8] text-white' : 'bg-white border-gray-200 text-gray-300'}`}>
                {idx < currentIdx ? <CheckCircle size={14} /> : <span className="text-[10px] font-black">{idx + 1}</span>}
              </div>
              <p className={`text-[7px] font-black uppercase tracking-tighter mt-2 absolute -bottom-5 w-20 text-center ${idx <= currentIdx ? 'text-[#1a73e8]' : 'text-gray-300'}`}>{step}</p>
            </div>
            {idx < steps.length - 1 && <div className={`flex-1 h-[2px] mx-1 transition-all ${idx < currentIdx ? 'bg-[#1a73e8]' : 'bg-gray-100'}`} />}
          </React.Fragment>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-page-entry pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-light text-[#202124]">Tickets & SAV</h1>
          <p className="text-[10px] text-[#5f6368] font-black uppercase tracking-widest mt-1">Management Central Royal Plaza Horizon</p>
        </div>
        <div className="flex gap-3">
          <button onClick={refreshAll} className="btn-google-outlined h-11 px-4"><RefreshCw size={18} className={isSyncing ? 'animate-spin' : ''} /></button>
          {canCreateTicket && (
            <button onClick={() => { setEditingTicket(null); setIsModalOpen(true); }} className="btn-google-primary h-11 px-6 shadow-xl">
              <Plus size={20} /> <span>Nouveau Dossier</span>
            </button>
          )}
        </div>
      </header>

      {/* TABLEAU DES TICKETS */}
      <div className="google-card overflow-hidden border-none shadow-xl bg-white ring-1 ring-black/5">
        <div className="p-8 border-b border-gray-100 flex flex-col md:flex-row gap-6">
          <div className="relative flex-1">
             <Search className="absolute left-4 top-3.5 text-gray-400" size={20} />
             <input type="text" placeholder="Recherche client, matériel, ID..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-12 h-12 bg-gray-50 border-none text-sm font-bold" />
          </div>
          <div className="flex gap-2">
             <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="h-12 bg-gray-50 border-none text-[10px] font-black uppercase px-4"><option value="Tous">Tous les statuts</option><option value="Nouveau">Nouveau</option><option value="En cours">En cours</option><option value="Résolu">Résolu</option></select>
             <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} className="h-12 bg-gray-50 border-none text-[10px] font-black uppercase px-4"><option value="Toutes">Priorité</option><option value="Urgent">Urgent</option><option value="Haute">Haute</option></select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b bg-gray-50/50 text-[9px] font-black uppercase text-gray-400 tracking-widest">
                <th className="px-8 py-5">Identifiant</th>
                <th className="px-8 py-5">Client</th>
                <th className="px-8 py-5">Matériel</th>
                <th className="px-8 py-5 text-right">Statut Cloud</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedTickets.map(t => (
                <tr key={t.id} onClick={() => setSelectedTicket(t)} className={`hover:bg-blue-50/30 transition-colors cursor-pointer ${selectedTicket?.id === t.id ? 'bg-blue-50' : ''}`}>
                  <td className="px-8 py-5"><span className="text-sm font-black text-[#1a73e8]">#{t.id}</span></td>
                  <td className="px-8 py-5"><p className="text-sm font-bold text-gray-700">{t.customerName}</p><p className="text-[10px] font-mono text-gray-400">{t.customerPhone}</p></td>
                  <td className="px-8 py-5"><p className="text-xs font-bold text-gray-600">{t.productName}</p><p className="text-[9px] uppercase font-black text-blue-400">{t.brand}</p></td>
                  <td className="px-8 py-5 text-right"><span className={`px-4 py-1.5 border text-[9px] font-black uppercase tracking-widest ${getStatusColor(t.status)}`}>{t.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* DOSSIER TECHNIQUE DRAWER */}
      <Drawer
        isOpen={!!selectedTicket}
        onClose={() => setSelectedTicket(null)}
        title="Dossier Technique Expert"
        subtitle={`Réf: ${selectedTicket?.id} • Royal Plaza Horizon`}
        icon={<TicketIcon size={20} />}
        footer={
          <div className="flex gap-3">
             {currentUser?.role === 'TECHNICIAN' && (selectedTicket?.status === 'Nouveau' || selectedTicket?.status === 'En cours') && (
                <button onClick={handleIntervene} className="flex-[2] btn-google-primary bg-blue-600 hover:bg-blue-700 justify-center py-4 text-xs font-black uppercase tracking-widest shadow-xl">
                   <PlayCircle size={18} /> {selectedTicket.status === 'Nouveau' ? 'Intervenir (Démarrer)' : 'Rédiger le Rapport'}
                </button>
             )}
             {isManager && selectedTicket?.status === 'En attente d\'approbation' && (
                <button onClick={() => saveTicket({...selectedTicket, status: 'Résolu', lastUpdate: new Date().toISOString()})} className="flex-[2] btn-google-primary bg-purple-600 hover:bg-purple-700 justify-center py-4 text-xs font-black uppercase tracking-widest shadow-xl">
                   <ShieldCheck size={18} /> Certifier & Approuver
                </button>
             )}
             <button onClick={() => { setEditingTicket(selectedTicket); setIsModalOpen(true); }} className="flex-1 btn-google-outlined justify-center py-4 text-xs font-black uppercase tracking-widest"><Edit3 size={18} /> Modifier</button>
          </div>
        }
      >
        {selectedTicket && (
          <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-500 pb-20">
             {/* 1. ÉTAT DU DOSSIER */}
             <section className="bg-gray-50 p-6 border-y border-gray-100">
                {renderStepper(selectedTicket.status)}
             </section>

             {/* 2. ENTETE MATÉRIEL */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="p-8 bg-white border-2 border-gray-100 space-y-4">
                   <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 flex items-center justify-center text-white ${getPriorityColor(selectedTicket.priority)}`}>
                         <AlertTriangle size={20} />
                      </div>
                      <div>
                         <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Urgence Dossier</p>
                         <p className="text-sm font-black text-gray-800 uppercase">{selectedTicket.priority}</p>
                      </div>
                   </div>
                   <div className="pt-4 border-t border-gray-50">
                      <h3 className="text-xl font-black text-gray-900 leading-tight">{selectedTicket.productName}</h3>
                      <p className="text-xs font-bold text-blue-600 uppercase mt-1">{selectedTicket.brand} • S/N {selectedTicket.serialNumber || 'Non renseigné'}</p>
                   </div>
                </div>

                <div className="p-8 bg-gray-50 border border-gray-200 space-y-5">
                   <div className="flex justify-between items-center">
                      <span className="text-[9px] font-black text-gray-400 uppercase">Impact Client</span>
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 ${selectedTicket.clientImpact === 'Critique' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{selectedTicket.clientImpact || 'Modéré'}</span>
                   </div>
                   <div className="flex justify-between items-center">
                      <span className="text-[9px] font-black text-gray-400 uppercase">Ouverture</span>
                      <span className="text-[10px] font-bold text-gray-700">{new Date(selectedTicket.createdAt).toLocaleString()}</span>
                   </div>
                   <div className="flex justify-between items-center">
                      <span className="text-[9px] font-black text-gray-400 uppercase">Source du Flux</span>
                      <div className="flex items-center gap-2">
                        <Globe size={12} className="text-blue-500" />
                        <span className="text-[10px] font-black text-gray-700 uppercase">{selectedTicket.source}</span>
                      </div>
                   </div>
                   <div className="flex justify-between items-center">
                      <span className="text-[9px] font-black text-gray-400 uppercase">Point de Vente</span>
                      <span className="text-[10px] font-black text-gray-700 uppercase">{selectedTicket.showroom}</span>
                   </div>
                </div>
             </div>

             {/* 3. BLOC CLIENT & LOCALISATION */}
             <section className="space-y-4">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2"><User size={14} /> Titulaire du Dossier</h4>
                <div className="p-8 bg-white border border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-10">
                   <div className="space-y-6">
                      <div className="flex items-center gap-4">
                         <div className="w-12 h-12 bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600"><User size={24}/></div>
                         <div>
                            <p className="text-[9px] font-black text-gray-400 uppercase">Identité Client</p>
                            <p className="text-base font-black text-gray-800 uppercase tracking-tight">{selectedTicket.customerName}</p>
                         </div>
                      </div>
                      <div className="flex items-center gap-4">
                         <div className="w-12 h-12 bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-600"><Smartphone size={24}/></div>
                         <div>
                            <p className="text-[9px] font-black text-gray-400 uppercase">Contact Mobile</p>
                            <p className="text-base font-black text-gray-800 font-mono">{selectedTicket.customerPhone}</p>
                         </div>
                      </div>
                   </div>
                   <div className="bg-blue-50/50 p-6 border-l-4 border-blue-200">
                      <p className="text-[9px] font-black text-blue-600 uppercase mb-2 flex items-center gap-2"><MapPin size={12}/> Zone d'intervention</p>
                      <p className="text-sm font-bold text-gray-700 uppercase leading-relaxed">{selectedTicket.location || 'Showroom d''origine'}</p>
                   </div>
                </div>
             </section>

             {/* 4. DIAGNOSTIC INITIAL */}
             <section className="space-y-4">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2"><FileText size={14} /> Symptômes & Diagnostic Initial</h4>
                <div className="p-8 bg-[#fffdf5] border border-[#ffe082] relative">
                   <div className="absolute top-0 left-0 w-1 h-full bg-[#f9ab00]" />
                   <p className="text-gray-700 italic text-sm font-medium leading-relaxed">"{selectedTicket.description}"</p>
                </div>
             </section>

             {/* 5. EXPERT ASSIGNÉ */}
             <section className="space-y-4">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2"><Wrench size={14} /> Expertise Terrain</h4>
                <div className="p-6 bg-white border border-gray-100">
                   {selectedTicket.assignedTechnicianId ? (
                      <div className="flex items-center gap-5">
                         <img src={technicians.find(t => t.id === selectedTicket.assignedTechnicianId)?.avatar} className="w-14 h-14 border p-1" alt="" />
                         <div>
                            <p className="text-sm font-black text-gray-800 uppercase">{technicians.find(t => t.id === selectedTicket.assignedTechnicianId)?.name}</p>
                            <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest mt-1">Expert Horizon Certifié</p>
                         </div>
                      </div>
                   ) : <p className="text-xs font-bold text-gray-400 uppercase italic py-4">Aucun expert assigné pour le moment</p>}
                </div>
             </section>

             {/* 6. RAPPORT TECHNIQUE SI EXISTANT */}
             {selectedTicket.interventionReport && (selectedTicket.interventionReport.actionsTaken?.length || selectedTicket.interventionReport.partsUsed?.length) && (
                <section className="space-y-4 pt-10 border-t border-gray-100">
                   <h4 className="text-[10px] font-black text-green-600 uppercase tracking-[0.2em] flex items-center gap-2"><ShieldCheck size={16}/> Certification Technique</h4>
                   <div className="p-8 bg-green-50/30 border border-green-100">
                      <div className="flex justify-between items-center mb-6">
                         <span className="text-[9px] font-black text-green-700 uppercase">État de Santé Final</span>
                         <span className="text-xs font-black bg-white border px-3 py-1 text-green-800 uppercase tracking-tighter shadow-sm">{selectedTicket.interventionReport.equipmentStatus}</span>
                      </div>
                      <div className="space-y-3 mb-6">
                         {selectedTicket.interventionReport.actionsTaken?.map((a, i) => (
                            <div key={i} className="text-xs font-bold text-gray-700 flex items-start gap-3"><div className="w-1.5 h-1.5 bg-green-500 mt-1.5 shrink-0" /> {a}</div>
                         ))}
                      </div>
                      {selectedTicket.interventionReport.partsUsed?.length ? (
                         <div className="pt-6 border-t border-green-100">
                            <p className="text-[9px] font-black text-green-700 uppercase mb-4">Matériaux Utilisés</p>
                            <div className="grid grid-cols-1 gap-2">
                               {selectedTicket.interventionReport.partsUsed.map((p, i) => (
                                  <div key={i} className="flex justify-between items-center p-3 bg-white border border-green-50">
                                     <span className="text-xs font-black text-gray-700 uppercase">{p.name}</span>
                                     <span className="text-xs font-black text-blue-600">x{p.quantity}</span>
                                  </div>
                               ))}
                            </div>
                         </div>
                      ) : null}
                   </div>
                </section>
             )}
          </div>
        )}
      </Drawer>

      {/* MODAL RAPPORT TECHNIQUE */}
      <Modal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} title="Rapport Technique & Matériaux" size="lg">
         <form onSubmit={handleSaveReport} className="space-y-10">
            <section className="space-y-4">
               <h4 className="text-[10px] font-black uppercase text-[#5f6368] tracking-widest flex items-center gap-2"><Activity size={14} className="text-[#1a73e8]" /> Diagnostic Final</h4>
               <div className="grid grid-cols-4 gap-3">
                  {(['Excellent', 'Bon', 'Critique', 'À remplacer'] as const).map(s => (
                    <button type="button" key={s} onClick={() => setReportStatus(s)} className={`py-4 border-2 text-[9px] font-black uppercase transition-all ${reportStatus === s ? 'bg-[#1a73e8] border-[#1a73e8] text-white shadow-lg' : 'bg-white border-[#dadce0] text-[#5f6368] hover:border-[#1a73e8]'}`}>{s}</button>
                  ))}
               </div>
            </section>
            <section className="space-y-4">
               <h4 className="text-[10px] font-black uppercase text-[#5f6368] tracking-widest">Actions Effectuées</h4>
               <div className="flex gap-2">
                  <input type="text" value={currentAction} onChange={e => setCurrentAction(e.target.value)} placeholder="ex: Nettoyage circuit..." className="flex-1 bg-gray-50 border-none text-xs font-bold" />
                  <button type="button" onClick={() => { if(currentAction.trim()) { setReportActions([...reportActions, currentAction.trim()]); setCurrentAction(''); } }} className="w-10 h-10 bg-[#1a73e8] text-white flex items-center justify-center shadow-lg"><Plus size={20}/></button>
               </div>
               <div className="space-y-2">{reportActions.map((a, i) => (<div key={i} className="flex justify-between p-3 bg-white border border-gray-100 text-[10px] font-black uppercase"><span>{a}</span><button type="button" onClick={() => setReportActions(reportActions.filter((_, idx) => idx !== i))} className="text-red-400"><Trash2 size={14}/></button></div>))}</div>
            </section>
            <section className="space-y-4">
               <h4 className="text-[10px] font-black uppercase text-[#5f6368] tracking-widest">Pièces Débitées du Stock</h4>
               <select onChange={(e) => { const p = parts.find(it => it.id === e.target.value); if(p) setReportParts([...reportParts, { id: p.id, name: p.name, quantity: 1, unitPrice: p.unitPrice }]); }} className="w-full h-11 bg-gray-50 border-none text-xs font-bold" value=""><option value="">Chercher une pièce...</option>{parts.filter(p => p.currentStock > 0).map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}</select>
               <div className="space-y-2">{reportParts.map(p => (<div key={p.id} className="flex justify-between p-3 bg-white border border-gray-100 text-xs font-black uppercase"><span>{p.name}</span><div className="flex items-center gap-3"><button type="button" onClick={() => setReportParts(reportParts.filter(it => it.id !== p.id))} className="text-red-400"><X size={14}/></button></div></div>))}</div>
            </section>
            <div className="flex gap-3 pt-6 border-t border-gray-100"><button type="submit" className="flex-1 btn-google-primary justify-center py-4 text-xs font-black uppercase tracking-widest shadow-xl shadow-blue-600/20">Valider & Clôturer</button><button type="button" onClick={() => setIsReportModalOpen(false)} className="btn-google-outlined px-8 text-[10px] font-black uppercase">Abandonner</button></div>
         </form>
      </Modal>

      {/* MODAL ÉDITION DOSSIER */}
      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingTicket(null); }} title={editingTicket ? `Édition : ${editingTicket.id}` : "Nouveau Dossier SAV"} size="xl">
        <form onSubmit={handleSave} className="space-y-10">
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
              <div className="space-y-6">
                 <h3 className="text-[10px] font-black uppercase text-gray-400 border-b pb-2">Client</h3>
                 <div className="space-y-4">
                    <div className="space-y-1"><label className="text-[9px] font-black uppercase text-gray-500">Nom Complet</label><input name="customerName" type="text" defaultValue={editingTicket?.customerName} required className="w-full bg-gray-50 border-none font-bold" /></div>
                    <div className="space-y-1"><label className="text-[9px] font-black uppercase text-gray-500">Mobile GSM</label><input name="customerPhone" type="tel" defaultValue={editingTicket?.customerPhone} required className="w-full bg-gray-50 border-none font-black font-mono" /></div>
                    <div className="space-y-1"><label className="text-[9px] font-black uppercase text-gray-500">Localisation</label><input name="location" type="text" defaultValue={editingTicket?.location} className="w-full bg-gray-50 border-none font-bold" /></div>
                 </div>
              </div>
              <div className="space-y-6">
                 <h3 className="text-[10px] font-black uppercase text-gray-400 border-b pb-2">Matériel</h3>
                 <div className="space-y-4">
                    <div className="space-y-1"><label className="text-[9px] font-black uppercase text-gray-500">Désignation</label><input name="productName" type="text" defaultValue={editingTicket?.productName} required className="w-full bg-gray-50 border-none font-bold" /></div>
                    <div className="space-y-1"><label className="text-[9px] font-black uppercase text-gray-500">Marque</label><input name="brand" type="text" defaultValue={editingTicket?.brand} required className="w-full bg-gray-50 border-none font-bold" /></div>
                    <div className="space-y-1"><label className="text-[9px] font-black uppercase text-gray-500">N° de Série</label><input name="serialNumber" type="text" defaultValue={editingTicket?.serialNumber} className="w-full bg-gray-50 border-none font-mono font-black" /></div>
                 </div>
              </div>
              <div className="space-y-6">
                 <h3 className="text-[10px] font-black uppercase text-gray-400 border-b pb-2">Config</h3>
                 <div className="space-y-4">
                    <div className="space-y-1"><label className="text-[9px] font-black uppercase text-gray-500">Impact</label><select name="clientImpact" defaultValue={editingTicket?.clientImpact || 'Modéré'} className="w-full bg-gray-50 border-none font-black text-[10px] uppercase"><option value="Faible">Faible</option><option value="Modéré">Modéré</option><option value="Critique">Critique</option></select></div>
                    <div className="space-y-1"><label className="text-[9px] font-black uppercase text-gray-500">Expert</label><select name="assignedTechnicianId" defaultValue={editingTicket?.assignedTechnicianId || ''} className="w-full bg-gray-50 border-none font-black text-[10px] uppercase"><option value="">Non assigné</option>{technicians.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
                    <div className="space-y-1"><label className="text-[9px] font-black uppercase text-gray-500">Source</label><select name="source" defaultValue={editingTicket?.source || 'Phone'} className="w-full bg-gray-50 border-none font-black text-[10px] uppercase"><option value="Phone">Phone</option><option value="WhatsApp">WhatsApp</option><option value="Messenger">Messenger</option><option value="Interne">Interne</option></select></div>
                 </div>
              </div>
           </div>
           <div className="space-y-2 pt-6 border-t border-gray-100"><label className="text-[9px] font-black uppercase text-gray-500">Description des Symptômes</label><textarea name="description" required defaultValue={editingTicket?.description} className="w-full h-32 p-4 bg-gray-50 border-none font-medium" /></div>
           <div className="flex gap-4 pt-8 border-t border-gray-200"><button type="submit" className="btn-google-primary flex-1 justify-center py-5 text-xs font-black uppercase tracking-[0.2em] shadow-xl"><Save size={20} /> Valider le dossier</button><button type="button" onClick={() => setIsModalOpen(false)} className="btn-google-outlined px-12 font-black uppercase text-[10px]">Annuler</button></div>
        </form>
      </Modal>
    </div>
  );
};

export default Tickets;
