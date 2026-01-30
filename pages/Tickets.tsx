
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
  CreditCard as PaymentIcon, Gauge, CheckCircle, Wallet, Send, PlayCircle, PlusCircle, MinusCircle
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
  const [dateRange, setDateRange] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFinancesModalOpen, setIsFinancesModalOpen] = useState(false);
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

  const stats = useMemo(() => {
    const relevant = (tickets || []).filter(t => {
      if (t.isArchived) return false;
      if (currentUser?.role === 'TECHNICIAN') return t.assignedTechnicianId === currentUser.id;
      return true;
    });
    return {
      total: relevant.length,
      urgent: relevant.filter(t => t.priority === 'Urgent' && t.status !== 'Fermé').length,
      new: relevant.filter(t => t.status === 'Nouveau').length,
      closed: relevant.filter(t => (t.status === 'Résolu' || t.status === 'Fermé')).length
    };
  }, [tickets, currentUser]);

  const handleIntervene = async () => {
    if (!selectedTicket || !currentUser) return;
    
    // Si le ticket est "Nouveau", on le passe "En cours" en base de données
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
    
    // Initialisation des états du rapport pour le modal
    setReportActions(selectedTicket.interventionReport?.actionsTaken || []);
    setReportParts(selectedTicket.interventionReport?.partsUsed || []);
    setReportStatus(selectedTicket.interventionReport?.equipmentStatus || 'Bon');
    setIsReportModalOpen(true);
  };

  const addPartToReport = (partId: string) => {
    const part = parts.find(p => p.id === partId);
    if (!part) return;
    
    if (reportParts.find(p => p.id === partId)) {
        addNotification({ title: 'Info', message: 'Cette pièce est déjà dans le rapport.', type: 'warning' });
        return;
    }

    const used: UsedPart = {
      id: part.id,
      name: part.name,
      quantity: 1,
      unitPrice: part.unitPrice
    };
    setReportParts([...reportParts, used]);
  };

  const updatePartQuantity = (id: string, delta: number) => {
    setReportParts(prev => prev.map(p => {
      if (p.id === id) {
        const newQty = Math.max(1, p.quantity + delta);
        return { ...p, quantity: newQty };
      }
      return p;
    }));
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
      // 1. Enregistrement du ticket
      await saveTicket(updated);
      
      // 2. Synchronisation des stocks (Décrémentation réelle)
      for (const usedPart of reportParts) {
        await addStockMovement({
          partId: usedPart.id!,
          partName: usedPart.name,
          quantity: usedPart.quantity,
          type: 'OUT',
          reason: `Consommation Ticket #${selectedTicket.id}`,
          performedBy: currentUser?.name || 'Expert Terrain',
          ticketId: selectedTicket.id
        });
      }

      setIsReportModalOpen(false);
      setSelectedTicket(updated);
      addNotification({ title: 'Rapport Transmis', message: 'Dossier synchronisé et stocks mis à jour.', type: 'success' });
    } catch (err) {
      addNotification({ title: 'Erreur', message: 'Échec de la synchronisation du rapport technique.', type: 'error' });
    }
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const customerPhone = formData.get('customerPhone') as string;
    const customerName = formData.get('customerName') as string;
    const rawTechId = formData.get('assignedTechnicianId') as string;

    // SYNCHRONISATION CRM AUTOMATIQUE
    let targetCustomerId = editingTicket?.customerId;
    const existingCustomer = (customers || []).find(c => c.phone === customerPhone);
    
    if (!existingCustomer) {
      const newCustomerId = `C-${Math.floor(10000 + Math.random() * 89999)}`;
      await saveCustomer({
        id: newCustomerId,
        name: customerName,
        phone: customerPhone,
        email: '',
        type: 'Particulier',
        address: formData.get('location') as string || '',
        status: 'Actif',
        totalSpent: 0,
        ticketsCount: 1,
        lastVisit: new Date().toISOString()
      });
      targetCustomerId = newCustomerId;
      addNotification({ title: 'CRM Cloud', message: `Nouveau client ${customerName} créé.`, type: 'info' });
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
      assignedTechnicianId: rawTechId || editingTicket?.assignedTechnicianId,
      createdAt: editingTicket?.createdAt || new Date().toISOString(),
      lastUpdate: new Date().toISOString(),
    } as Ticket;

    await saveTicket(ticketData);
    setIsModalOpen(false);
    setEditingTicket(null);
    if (selectedTicket?.id === ticketData.id) setSelectedTicket(ticketData);
    addNotification({ title: 'Horizon Sync', message: 'Dossier SAV synchronisé avec succès.', type: 'success' });
  };

  const renderStepper = (status: TicketStatus) => {
    const steps: TicketStatus[] = ['Nouveau', 'En cours', 'En attente d\'approbation', 'Résolu', 'Fermé'];
    const currentIdx = steps.indexOf(status);
    return (
      <div className="flex items-center justify-between w-full px-4 py-8">
        {steps.map((step, idx) => (
          <React.Fragment key={step}>
            <div className="flex flex-col items-center relative z-10">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${idx <= currentIdx ? 'bg-[#1a73e8] border-[#1a73e8] text-white' : 'bg-white border-gray-200 text-gray-300'}`}>
                {idx < currentIdx ? <CheckCircle size={16} /> : <span className="text-[10px] font-black">{idx + 1}</span>}
              </div>
              <p className={`text-[8px] font-black uppercase tracking-tighter mt-2 absolute -bottom-6 w-20 text-center ${idx <= currentIdx ? 'text-[#1a73e8]' : 'text-gray-300'}`}>{step}</p>
            </div>
            {idx < steps.length - 1 && <div className={`flex-1 h-[2px] mx-2 transition-all ${idx < currentIdx ? 'bg-[#1a73e8]' : 'bg-gray-100'}`} />}
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
            <button onClick={() => { setEditingTicket(null); setIsModalOpen(true); }} className="btn-google-primary h-11 px-6 shadow-xl shadow-blue-600/10">
              <Plus size={20} /> <span>Nouveau Dossier</span>
            </button>
          )}
        </div>
      </header>

      {/* KPI GRID */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Flux SAV Actif', value: stats.total, color: '#1a73e8', icon: <Activity size={20}/> },
          { label: 'Urgences SLA', value: stats.urgent, color: '#d93025', icon: <Zap size={20}/> },
          { label: 'En Attente', value: stats.new, color: '#f9ab00', icon: <BellRing size={20}/> },
          { label: 'Clôtures Hebdo', value: stats.closed, color: '#188038', icon: <CheckCircle2 size={20}/> }
        ].map((s, i) => (
          <div key={i} className="stats-card border-l-4" style={{ borderLeftColor: s.color }}>
             <div className="flex justify-between items-start">
               <div>
                 <p className="text-[10px] font-black text-[#5f6368] uppercase tracking-[0.15em] mb-1">{s.label}</p>
                 <h3 className="text-3xl font-bold text-[#202124] tracking-tight">{s.value}</h3>
               </div>
               <div className="p-2 bg-gray-50 text-gray-400">{s.icon}</div>
             </div>
          </div>
        ))}
      </div>

      <div className="google-card overflow-hidden border-none shadow-xl bg-white ring-1 ring-black/5 p-8">
           <div className="flex flex-col xl:flex-row gap-6">
              <div className="relative flex-1 group">
                 <Search className="absolute left-6 top-5 text-[#9aa0a6] group-focus-within:text-[#1a73e8] transition-colors" size={24} />
                 <input 
                  type="text" 
                  placeholder="Rechercher par client, ticket ID, S/N..." 
                  className="w-full pl-16 h-16 bg-[#f8f9fa] border-none text-base font-bold shadow-inner transition-all focus:bg-white focus:ring-2 focus:ring-blue-100"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                 />
              </div>
              <div className="flex items-center gap-4">
                 {['Tous', 'Nouveau', 'En cours'].map(item => (
                   <button key={item} onClick={() => setStatusFilter(item)} className={`px-6 py-3.5 text-[10px] font-black uppercase transition-all ${statusFilter === item ? 'bg-[#1a73e8] text-white shadow-md' : 'bg-gray-100 text-[#5f6368] hover:text-[#202124]'}`}>{item}</button>
                 ))}
              </div>
           </div>
      </div>

      <div className="google-card overflow-hidden border-none shadow-xl bg-white ring-1 ring-black/5">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#dadce0] bg-[#f8f9fa] text-[#5f6368] text-[9px] font-black uppercase tracking-[0.2em]">
                <th className="px-10 py-6">ID & Source</th>
                <th className="px-10 py-6">Client</th>
                <th className="px-10 py-6">Matériel</th>
                <th className="px-10 py-6 text-center">Urgence</th>
                <th className="px-10 py-6 text-right">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#dadce0]">
              {paginatedTickets.map((t) => (
                <tr key={t.id} onClick={() => setSelectedTicket(t)} className={`hover:bg-[#f8faff] transition-colors group cursor-pointer ${selectedTicket?.id === t.id ? 'bg-[#e8f0fe]' : 'bg-white'}`}>
                  <td className="px-10 py-6"><span className="text-sm font-black text-[#1a73e8]">#{t.id}</span></td>
                  <td className="px-10 py-6"><p className="text-sm font-black text-[#3c4043]">{t.customerName}</p><p className="text-[10px] text-[#9aa0a6] font-mono font-bold">{t.customerPhone}</p></td>
                  <td className="px-10 py-6"><p className="text-xs font-black text-[#3c4043]">{t.productName}</p><p className="text-[9px] text-gray-400 font-bold uppercase">{t.brand} • S/N: {t.serialNumber || '--'}</p></td>
                  <td className="px-10 py-6 text-center"><span className={`inline-block w-2 h-2 rounded-full mr-2 ${getPriorityColor(t.priority)}`} /><span className="text-[9px] font-black uppercase text-[#5f6368]">{t.priority}</span></td>
                  <td className="px-10 py-6 text-right"><span className={`px-4 py-1.5 border text-[9px] font-black uppercase tracking-widest ${getStatusColor(t.status)}`}>{t.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAIL DRAWER */}
      <Drawer
        isOpen={!!selectedTicket}
        onClose={() => setSelectedTicket(null)}
        title="Dossier SAV Expert"
        subtitle={`Ticket #${selectedTicket?.id}`}
        icon={<TicketIcon size={20} />}
        footer={
          <div className="flex gap-3">
             {currentUser?.role === 'TECHNICIAN' && (selectedTicket?.status === 'Nouveau' || selectedTicket?.status === 'En cours') && (
                <button 
                  onClick={handleIntervene}
                  className="flex-[2] btn-google-primary bg-blue-600 hover:bg-blue-700 justify-center py-4 text-xs font-black uppercase tracking-widest shadow-xl"
                >
                   <PlayCircle size={18} /> {selectedTicket.status === 'Nouveau' ? 'Intervenir (Démarrer)' : 'Rapport d\'Intervention'}
                </button>
             )}
             {isManager && selectedTicket?.status === 'En attente d\'approbation' && (
                <button 
                  onClick={() => saveTicket({...selectedTicket, status: 'Résolu', lastUpdate: new Date().toISOString()})}
                  className="flex-[2] btn-google-primary bg-purple-600 hover:bg-purple-700 justify-center py-4 text-xs font-black uppercase tracking-widest shadow-xl"
                >
                   <ShieldCheck size={18} /> Certifier & Approuver
                </button>
             )}
             <button onClick={() => { setEditingTicket(selectedTicket); setIsModalOpen(true); }} className="flex-1 btn-google-outlined justify-center py-4 text-xs font-black uppercase tracking-widest"><Edit3 size={18} /> Modifier</button>
          </div>
        }
      >
        {selectedTicket && (
          <div className="space-y-10">
             <section className="bg-[#f8f9fa] border border-[#dadce0] p-6">{renderStepper(selectedTicket.status)}</section>
             <div className="flex gap-8 items-start">
                <div className="p-8 bg-gradient-to-br from-white to-[#f8f9fa] border border-[#dadce0] flex-1 text-center">
                   <div className={`w-16 h-16 rounded-none flex items-center justify-center mx-auto mb-4 shadow-xl ${getPriorityColor(selectedTicket.priority)} text-white`}><ShieldAlert size={32} /></div>
                   <h3 className="text-xl font-black text-[#202124] tracking-tight">{selectedTicket.productName}</h3>
                   <p className="text-[9px] font-black text-[#1a73e8] uppercase tracking-[0.2em] mt-1">{selectedTicket.brand} • S/N {selectedTicket.serialNumber || 'Non Saisie'}</p>
                </div>
                <div className="w-72 p-6 bg-white border border-[#dadce0] space-y-4">
                   <h4 className="text-[9px] font-black text-[#9aa0a6] uppercase tracking-widest flex items-center gap-2"><User size={14} /> Expert Assigné</h4>
                   {selectedTicket.assignedTechnicianId ? (
                      <div className="flex items-center gap-4">
                         <img src={technicians.find(t => t.id === selectedTicket.assignedTechnicianId)?.avatar} className="w-12 h-12 rounded-none border p-0.5 bg-white shadow-sm" alt="" />
                         <p className="text-sm font-black text-[#202124]">{technicians.find(t => t.id === selectedTicket.assignedTechnicianId)?.name}</p>
                      </div>
                   ) : <p className="text-[10px] text-gray-400 font-bold">Non assigné</p>}
                </div>
             </div>
             <div className="grid grid-cols-2 gap-10">
                <div className="space-y-4">
                   <h4 className="text-[10px] font-black text-[#9aa0a6] uppercase tracking-[0.2em]">Bénéficiaire</h4>
                   <div className="p-6 bg-white border border-[#dadce0] space-y-4 shadow-sm">
                      <p className="text-base font-black text-[#3c4043]">{selectedTicket.customerName}</p>
                      <p className="text-base font-black text-[#3c4043] font-mono">{selectedTicket.customerPhone}</p>
                      <p className="text-xs font-bold text-[#5f6368] uppercase">{selectedTicket.location || selectedTicket.showroom}</p>
                   </div>
                </div>
                <div className="space-y-4">
                   <h4 className="text-[10px] font-black text-[#9aa0a6] uppercase tracking-[0.2em]">Diagnostic Initial</h4>
                   <div className="p-6 bg-[#fffcf5] border border-[#ffe082] italic text-sm text-gray-700 leading-relaxed font-medium">"{selectedTicket.description}"</div>
                </div>
             </div>

             {/* RAPPORTS D'INTERVENTION AFFICHÉS DANS LE DRAWER */}
             {selectedTicket.interventionReport && (selectedTicket.interventionReport.actionsTaken?.length || selectedTicket.interventionReport.partsUsed?.length) && (
                <section className="space-y-4 pt-10 border-t border-gray-100">
                   <h4 className="text-[10px] font-black text-[#9aa0a6] uppercase tracking-[0.2em] flex items-center gap-2"><Wrench size={16}/> Rapport Terrain Expert</h4>
                   <div className="p-8 bg-[#f8faff] border border-[#d2e3fc] space-y-6">
                      <div className="flex justify-between items-center">
                         <span className="text-[9px] font-black text-blue-700 uppercase tracking-widest">Actions Certifiées</span>
                         <span className="text-xs font-black text-[#202124] uppercase border px-2 py-0.5 bg-white border-blue-100">{selectedTicket.interventionReport.equipmentStatus}</span>
                      </div>
                      <div className="space-y-3">
                         {selectedTicket.interventionReport.actionsTaken?.map((action, i) => (
                            <div key={i} className="text-xs font-bold text-[#3c4043] flex items-start gap-3"><div className="w-1.5 h-1.5 bg-blue-500 mt-1 shrink-0" /> {action}</div>
                         ))}
                      </div>
                      {selectedTicket.interventionReport.partsUsed?.length ? (
                         <div className="mt-6 pt-6 border-t border-blue-100">
                            <p className="text-[9px] font-black text-blue-700 uppercase mb-4">Matériaux Utilisés</p>
                            <div className="space-y-2">
                               {selectedTicket.interventionReport.partsUsed.map((p, i) => (
                                  <div key={i} className="flex justify-between text-xs font-black bg-white p-3 border border-blue-50 shadow-sm">
                                     <div className="flex items-center gap-3">
                                        <Package size={14} className="text-gray-400" />
                                        <span>{p.name}</span>
                                     </div>
                                     <span className="text-blue-600 font-mono">x{p.quantity}</span>
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

      {/* MODAL RAPPORT D'INTERVENTION (TECH ONLY) */}
      <Modal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} title="Saisie des Matériaux & Rapport Technique" size="lg">
         <form onSubmit={handleSaveReport} className="space-y-10">
            <section className="space-y-4">
               <h4 className="text-[10px] font-black uppercase text-[#5f6368] tracking-widest flex items-center gap-2"><ShieldCheck size={14} className="text-[#1a73e8]" /> Diagnostic Matériel Final</h4>
               <div className="grid grid-cols-4 gap-3">
                  {(['Excellent', 'Bon', 'Critique', 'À remplacer'] as const).map(s => (
                    <button type="button" key={s} onClick={() => setReportStatus(s)} className={`py-4 border-2 text-[9px] font-black uppercase tracking-tighter transition-all ${reportStatus === s ? 'bg-[#1a73e8] border-[#1a73e8] text-white shadow-lg' : 'bg-white border-[#dadce0] text-[#5f6368] hover:border-[#1a73e8]'}`}>{s}</button>
                  ))}
               </div>
            </section>

            <section className="space-y-4">
               <h4 className="text-[10px] font-black uppercase text-[#5f6368] tracking-widest flex items-center gap-2"><Activity size={14} className="text-[#1a73e8]" /> Actions Techniques Réalisées</h4>
               <div className="flex gap-2 bg-[#f8f9fa] p-2 border border-[#dadce0]">
                  <input type="text" value={currentAction} onChange={e => setCurrentAction(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), currentAction.trim() && (setReportActions([...reportActions, currentAction.trim()]), setCurrentAction('')))} placeholder="ex: Nettoyage bloc évaporateur..." className="flex-1 bg-transparent border-none text-xs font-bold focus:ring-0" />
                  <button type="button" onClick={() => { if(currentAction.trim()) { setReportActions([...reportActions, currentAction.trim()]); setCurrentAction(''); } }} className="w-10 h-10 bg-[#1a73e8] text-white flex items-center justify-center shadow-lg"><Plus size={20}/></button>
               </div>
               <div className="space-y-2">
                  {reportActions.map((action, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-white border border-[#dadce0] shadow-sm">
                       <span className="text-[10px] text-[#3c4043] font-black uppercase">{action}</span>
                       <button type="button" onClick={() => setReportActions(reportActions.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-600"><Trash2 size={16}/></button>
                    </div>
                  ))}
               </div>
            </section>

            <section className="space-y-4">
               <h4 className="text-[10px] font-black uppercase text-[#5f6368] tracking-widest flex items-center gap-2"><Package size={14} className="text-[#1a73e8]" /> Matériaux & Pièces Utilisés (Stock Plaza)</h4>
               <div className="space-y-4">
                  <div className="space-y-1.5">
                     <label className="text-[9px] font-black text-gray-400 uppercase">Rechercher un composant dans la base</label>
                     <select 
                       onChange={(e) => addPartToReport(e.target.value)} 
                       className="w-full h-12 bg-[#f8f9fa] border-none font-bold text-xs"
                       value=""
                     >
                        <option value="">Sélectionner un article du catalogue...</option>
                        {parts.filter(p => p.currentStock > 0).map(p => (
                           <option key={p.id} value={p.id}>{p.name} ({p.sku}) - Dispo: {p.currentStock}</option>
                        ))}
                     </select>
                  </div>
                  
                  <div className="space-y-3">
                     {reportParts.map((p) => (
                        <div key={p.id} className="flex items-center justify-between p-4 bg-white border-2 border-[#f1f3f4] shadow-sm">
                           <div className="flex-1">
                              <p className="text-[10px] font-black text-[#202124] uppercase">{p.name}</p>
                              <p className="text-[9px] text-blue-600 font-bold uppercase mt-1">Référentiel Cloud Horizon</p>
                           </div>
                           <div className="flex items-center gap-6">
                              <div className="flex items-center gap-3">
                                 <button type="button" onClick={() => updatePartQuantity(p.id!, -1)} className="p-1 text-gray-400 hover:text-red-600"><MinusCircle size={20}/></button>
                                 <span className="text-sm font-black w-6 text-center">{p.quantity}</span>
                                 <button type="button" onClick={() => updatePartQuantity(p.id!, 1)} className="p-1 text-gray-400 hover:text-blue-600"><PlusCircle size={20}/></button>
                              </div>
                              <button type="button" onClick={() => setReportParts(reportParts.filter(item => item.id !== p.id))} className="text-red-300 hover:text-red-600 ml-4"><X size={20}/></button>
                           </div>
                        </div>
                     ))}
                     {reportParts.length === 0 && (
                        <div className="p-10 text-center border-2 border-dashed border-[#dadce0] bg-gray-50/30">
                           <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Aucun matériau déclaré</p>
                        </div>
                     )}
                  </div>
               </div>
            </section>

            <div className="flex gap-4 pt-8 border-t border-[#dadce0]">
               <button type="submit" className="flex-1 btn-google-primary justify-center py-5 text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-blue-600/20"><Save size={20} /> Valider le Rapport & Mettre à jour les stocks</button>
               <button type="button" onClick={() => setIsReportModalOpen(false)} className="btn-google-outlined px-12 font-black uppercase text-[10px]">Abandonner</button>
            </div>
         </form>
      </Modal>

      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingTicket(null); }} title={editingTicket ? `Édition : ${editingTicket.id}` : "Nouveau Dossier SAV Cloud"} size="xl">
        <form onSubmit={handleSave} className="space-y-10">
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
              <div className="space-y-6">
                 <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#5f6368] border-b pb-3 flex items-center gap-2"><User size={14}/> Profil Client</h3>
                 <div className="space-y-4">
                    <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-400 uppercase">Nom Complet</label><input name="customerName" type="text" defaultValue={editingTicket?.customerName} required className="w-full h-11 bg-[#f8f9fa] border-none font-bold" /></div>
                    <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-400 uppercase">Mobile GSM (Synchronisation)</label><input name="customerPhone" type="tel" defaultValue={editingTicket?.customerPhone} required className="w-full h-11 bg-[#f8f9fa] border-none font-black font-mono" placeholder="+241 ..." /></div>
                 </div>
              </div>
              <div className="space-y-6">
                 <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#5f6368] border-b pb-3 flex items-center gap-2"><Package size={14}/> Matériel SAV</h3>
                 <div className="space-y-4">
                    <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-400 uppercase">Désignation</label><input name="productName" type="text" defaultValue={editingTicket?.productName} required className="w-full h-11 bg-[#f8f9fa] border-none font-bold" /></div>
                    <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-400 uppercase">Marque</label><input name="brand" type="text" defaultValue={editingTicket?.brand} required className="w-full h-11 bg-[#f8f9fa] border-none font-bold" /></div>
                    <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-400 uppercase">N° de Série (S/N)</label><input name="serialNumber" type="text" defaultValue={editingTicket?.serialNumber} className="w-full h-11 bg-[#f8f9fa] border-none font-mono font-black" /></div>
                 </div>
              </div>
              <div className="space-y-6">
                 <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#5f6368] border-b pb-3 flex items-center gap-2"><Settings size={14}/> Configuration</h3>
                 <div className="space-y-4">
                    <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-400 uppercase">Showroom Émetteur</label><select name="showroom" defaultValue={editingTicket?.showroom || 'Glass'} className="w-full h-11 bg-[#f8f9fa] border-none font-black text-[10px] uppercase">{showrooms.map(s => <option key={s.id} value={s.id}>{s.id}</option>)}</select></div>
                    <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-400 uppercase">Expert Assigné</label><select name="assignedTechnicianId" defaultValue={editingTicket?.assignedTechnicianId || ''} className="w-full h-11 bg-[#f8f9fa] border-none text-[#1a73e8] font-black text-[10px] uppercase"><option value="">-- Algorithme Auto-Assign --</option>{technicians.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
                 </div>
              </div>
           </div>
           <div className="space-y-2 pt-6 border-t border-[#f1f3f4]"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Diagnostic Préliminaire / Descriptif des Symptômes</label><textarea name="description" required defaultValue={editingTicket?.description} className="w-full h-32 text-sm p-5 bg-[#f8f9fa] border-none font-medium" /></div>
           <div className="flex gap-4 pt-8 border-t border-[#dadce0]"><button type="submit" className="btn-google-primary flex-1 justify-center py-5 text-xs font-black uppercase tracking-[0.2em] shadow-xl"><Save size={20} /> Valider & Synchroniser le dossier</button><button type="button" onClick={() => setIsModalOpen(false)} className="btn-google-outlined px-12 font-black uppercase text-[10px]">Annuler</button></div>
        </form>
      </Modal>
    </div>
  );
};

export default Tickets;
