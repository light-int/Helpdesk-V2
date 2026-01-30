
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
  CreditCard as PaymentIcon, Gauge, CheckCircle, Wallet, Send
} from 'lucide-react';
import { useData, useNotifications, useUser } from '../App';
import { Ticket, TicketStatus, TicketCategory, Showroom, UsedPart, Customer, Technician, FinancialDetail } from '../types';
import Modal from '../components/Modal';
import Drawer from '../components/Drawer';

const TICKETS_PER_PAGE = 20;

const Tickets: React.FC = () => {
  const { 
    tickets, refreshAll, isSyncing, technicians, products, 
    customers, saveTicket, saveCustomer, deleteTicket, showrooms 
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
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  
  const [currentPage, setCurrentPage] = useState(1);

  const canCreateTicket = currentUser?.role !== 'TECHNICIAN';
  const isManager = currentUser?.role === 'MANAGER' || currentUser?.role === 'ADMIN';

  useEffect(() => { refreshAll(); }, []);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, statusFilter, priorityFilter, showroomFilter, categoryFilter, dateRange]);

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

      let matchesDate = true;
      if (dateRange !== 'all') {
        const ticketDate = new Date(t.createdAt);
        const now = new Date();
        if (dateRange === 'today') {
          matchesDate = ticketDate.toDateString() === now.toDateString();
        } else if (dateRange === 'week') {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          matchesDate = ticketDate >= weekAgo;
        } else if (dateRange === 'month') {
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          matchesDate = ticketDate >= monthAgo;
        }
      }

      return matchesSearch && matchesStatus && matchesPriority && matchesShowroom && matchesCategory && matchesDate;
    }).sort((a, b) => {
      if (a.priority === 'Urgent' && b.priority !== 'Urgent') return -1;
      if (a.priority !== 'Urgent' && b.priority === 'Urgent') return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [tickets, searchTerm, statusFilter, priorityFilter, showroomFilter, categoryFilter, dateRange, currentUser]);

  const paginatedTickets = useMemo(() => {
    const startIndex = (currentPage - 1) * TICKETS_PER_PAGE;
    return allFilteredTickets.slice(startIndex, startIndex + TICKETS_PER_PAGE);
  }, [allFilteredTickets, currentPage]);

  const totalPages = Math.ceil(allFilteredTickets.length / TICKETS_PER_PAGE);

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Résolu': return 'bg-green-50 text-green-700 border-green-200';
      case 'Fermé': return 'bg-gray-50 text-gray-500 border-gray-300';
      case 'Nouveau': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'En cours': return 'bg-amber-50 text-amber-700 border-amber-300';
      case 'En attente d\'approbation': return 'bg-purple-50 text-purple-700 border-purple-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-300';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Urgent': return 'bg-red-600';
      case 'Haute': return 'bg-orange-500';
      case 'Moyenne': return 'bg-blue-500';
      default: return 'bg-gray-300';
    }
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const customerPhone = formData.get('customerPhone') as string;
    const customerName = formData.get('customerName') as string;
    const rawTechId = formData.get('assignedTechnicianId') as string;

    // 1. GESTION DU CLIENT (Création automatique)
    let targetCustomerId = editingTicket?.customerId;
    const existingCustomer = (customers || []).find(c => c.phone === customerPhone);
    
    if (existingCustomer) {
      targetCustomerId = existingCustomer.id;
    } else {
      const newCustomerId = `C-${Math.floor(10000 + Math.random() * 89999)}`;
      const newCustomer: Customer = {
        id: newCustomerId,
        name: customerName,
        phone: customerPhone,
        email: formData.get('email') as string || '',
        type: 'Particulier',
        address: formData.get('location') as string || '',
        status: 'Actif',
        totalSpent: 0,
        ticketsCount: 1,
        lastVisit: new Date().toISOString()
      };
      await saveCustomer(newCustomer);
      targetCustomerId = newCustomerId;
      addNotification({ title: 'CRM Cloud', message: `Nouveau profil client créé pour ${customerName}`, type: 'info' });
    }

    // 2. ALGORITHME AUTO-ASSIGN (Basé sur la charge réelle)
    let finalTechId = rawTechId && technicians.some(t => t.id === rawTechId) ? rawTechId : undefined;

    if (!finalTechId && !editingTicket) {
      const availableTechs = technicians.filter(t => t.status === 'Disponible');
      if (availableTechs.length > 0) {
        // Calcul de charge dynamique
        const bestTech = [...availableTechs].sort((a, b) => {
          const loadA = tickets.filter(t => t.assignedTechnicianId === a.id && (t.status === 'En cours' || t.status === 'Nouveau')).length;
          const loadB = tickets.filter(t => t.assignedTechnicianId === b.id && (t.status === 'En cours' || t.status === 'Nouveau')).length;
          if (loadA !== loadB) return loadA - loadB;
          return (b.rating || 0) - (a.rating || 0);
        })[0];
        finalTechId = bestTech.id;
      }
    }

    // 3. ENREGISTREMENT DU TICKET
    const ticketData: Ticket = {
      ...(editingTicket || {}),
      id: editingTicket?.id || `T-${Math.floor(1000 + Math.random() * 9000)}`,
      customerId: targetCustomerId,
      customerName: customerName,
      customerPhone: customerPhone,
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
      assignedTechnicianId: finalTechId || editingTicket?.assignedTechnicianId,
      createdAt: editingTicket?.createdAt || new Date().toISOString(),
      lastUpdate: new Date().toISOString(),
    } as Ticket;

    try {
      await saveTicket(ticketData);
      setIsModalOpen(false);
      setEditingTicket(null);
      if (selectedTicket?.id === ticketData.id) setSelectedTicket(ticketData);
      addNotification({ title: 'Horizon Sync', message: 'Dossier SAV synchronisé.', type: 'success' });
    } catch (err) {
      addNotification({ title: 'Erreur Cloud', message: 'Échec de la sauvegarde.', type: 'error' });
    }
  };

  const handleApprove = async () => {
    if (!selectedTicket || !isManager) return;
    const updated: Ticket = { ...selectedTicket, status: 'Résolu', lastUpdate: new Date().toISOString() };
    await saveTicket(updated);
    setSelectedTicket(updated);
    addNotification({ title: 'Management', message: 'Intervention validée et certifiée.', type: 'success' });
  };

  const handleCloseTicket = async () => {
    if (!selectedTicket || !isManager) return;
    const updated: Ticket = { ...selectedTicket, status: 'Fermé', lastUpdate: new Date().toISOString() };
    await saveTicket(updated);
    setSelectedTicket(updated);
    addNotification({ title: 'Archive Cloud', message: 'Dossier clos administrativement.', type: 'info' });
  };

  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('Tous');
    setPriorityFilter('Toutes');
    setShowroomFilter('Tous');
    setCategoryFilter('Toutes');
    setDateRange('all');
  };

  const renderStepper = (status: TicketStatus) => {
    const steps: TicketStatus[] = ['Nouveau', 'En cours', 'En attente d\'approbation', 'Résolu', 'Fermé'];
    const currentIdx = steps.indexOf(status);

    return (
      <div className="flex items-center justify-between w-full px-4 py-8 overflow-hidden">
        {steps.map((step, idx) => (
          <React.Fragment key={step}>
            <div className="flex flex-col items-center relative z-10">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                idx <= currentIdx ? 'bg-[#1a73e8] border-[#1a73e8] text-white' : 'bg-white border-gray-200 text-gray-300'
              }`}>
                {idx < currentIdx ? <CheckCircle size={16} /> : <span className="text-[10px] font-black">{idx + 1}</span>}
              </div>
              <p className={`text-[8px] font-black uppercase tracking-tighter mt-2 absolute -bottom-6 w-20 text-center ${
                idx <= currentIdx ? 'text-[#1a73e8]' : 'text-gray-300'
              }`}>{step}</p>
            </div>
            {idx < steps.length - 1 && (
              <div className={`flex-1 h-[2px] mx-2 transition-all ${idx < currentIdx ? 'bg-[#1a73e8]' : 'bg-gray-100'}`} />
            )}
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
          <p className="text-[10px] text-[#5f6368] font-black uppercase tracking-widest mt-1">
             {currentUser?.role === 'TECHNICIAN' ? `Missions de : ${currentUser.name}` : 'Management Central Royal Plaza Horizon'}
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={refreshAll} className="btn-google-outlined h-11 px-4" title="Actualiser la liste"><RefreshCw size={18} className={isSyncing ? 'animate-spin' : ''} /></button>
          {canCreateTicket && (
            <button onClick={() => { setEditingTicket(null); setIsModalOpen(true); }} className="btn-google-primary h-11 px-6 shadow-xl shadow-blue-600/10" title="Émettre un dossier SAV">
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

      {/* FILTER CENTER */}
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

              <div className="flex flex-wrap items-center gap-4">
                 <div className="flex items-center bg-[#f1f3f4] p-1.5 shadow-inner">
                    {['Tous', 'Nouveau', 'En cours'].map(item => (
                      <button 
                        key={item}
                        onClick={() => setStatusFilter(item)}
                        className={`px-6 py-3.5 text-[10px] font-black uppercase transition-all ${statusFilter === item ? 'bg-white text-[#1a73e8] shadow-md' : 'text-[#5f6368] hover:text-[#202124]'}`}
                      >
                        {item}
                      </button>
                    ))}
                 </div>

                 <div className="flex items-center gap-4">
                    <button 
                      onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                      className={`p-4.5 border-2 transition-all ${showAdvancedFilters ? 'bg-[#202124] border-[#202124] text-white shadow-lg' : 'bg-white border-[#dadce0] text-[#5f6368] hover:border-[#1a73e8]'}`}
                    >
                      <Sliders size={22} />
                    </button>
                    <div className="h-16 min-w-[150px] p-4 bg-white border border-blue-100 flex items-center justify-between shadow-sm">
                      <p className="text-lg font-black text-[#202124]">{allFilteredTickets.length} <span className="text-[10px] text-gray-400 font-bold uppercase">Résultats</span></p>
                    </div>
                 </div>
                 
                 {(searchTerm || statusFilter !== 'Tous') && (
                    <button onClick={resetFilters} className="p-5 text-[#d93025] hover:bg-red-50 border-2 border-transparent transition-all group">
                       <RotateCcw size={24} className="group-hover:rotate-[-180deg] transition-transform duration-700" />
                    </button>
                 )}
              </div>
           </div>
        </div>

        {/* LOG TABLE */}
        <div className="google-card overflow-hidden border-none shadow-xl bg-white ring-1 ring-black/5">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#dadce0] bg-[#f8f9fa] text-[#5f6368] text-[9px] font-black uppercase tracking-[0.2em]">
                <th className="px-10 py-6">Dossier</th>
                <th className="px-10 py-6">Client Bénéfiaciaire</th>
                <th className="px-10 py-6">Matériel & S/N</th>
                <th className="px-10 py-6 text-center">Urgence</th>
                <th className="px-10 py-6 text-right">Statut Cloud</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#dadce0]">
              {(paginatedTickets || []).map((t) => (
                <tr 
                  key={t.id} 
                  onClick={() => setSelectedTicket(t)}
                  className={`hover:bg-[#f8faff] transition-colors group cursor-pointer ${selectedTicket?.id === t.id ? 'bg-[#e8f0fe]' : 'bg-white'}`}
                >
                  <td className="px-10 py-6">
                    <span className="text-sm font-black text-[#1a73e8]">#{t.id}</span>
                  </td>
                  <td className="px-10 py-6">
                    <p className="text-sm font-black text-[#3c4043] group-hover:text-[#1a73e8] transition-colors">{t.customerName}</p>
                    <p className="text-[10px] text-[#9aa0a6] font-mono font-bold mt-1 uppercase tracking-widest">{t.customerPhone}</p>
                  </td>
                  <td className="px-10 py-6">
                    <p className="text-xs font-black text-[#3c4043] leading-none">{t.productName}</p>
                    <p className="text-[9px] text-gray-400 font-bold uppercase mt-1.5 tracking-tighter">{t.brand} • S/N: {t.serialNumber || 'NON SPECIFIÉ'}</p>
                  </td>
                  <td className="px-10 py-6">
                     <div className="flex items-center justify-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${getPriorityColor(t.priority)} shadow-sm`} />
                        <span className="text-[9px] font-black uppercase tracking-widest text-[#5f6368]">{t.priority}</span>
                     </div>
                  </td>
                  <td className="px-10 py-6 text-right">
                    <span className={`px-4 py-1.5 border text-[9px] font-black uppercase tracking-widest shadow-sm ${getStatusColor(t.status)}`}>
                      {t.status}
                    </span>
                  </td>
                </tr>
              ))}
              {allFilteredTickets.length === 0 && (
                <tr>
                   <td colSpan={5} className="py-40 text-center bg-white">
                      <Archive size={48} className="text-gray-200 mx-auto mb-8" />
                      <p className="text-xs font-black text-gray-300 uppercase tracking-[0.4em]">Aucun dossier identifié</p>
                   </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAIL DRAWER */}
      <Drawer
        isOpen={!!selectedTicket}
        onClose={() => setSelectedTicket(null)}
        title="Dossier Technique Expert"
        subtitle={`Ticket #${selectedTicket?.id} • Showroom ${selectedTicket?.showroom}`}
        icon={<TicketIcon size={20} />}
        footer={
          <div className="flex gap-3">
             {selectedTicket?.status === 'En attente d\'approbation' && isManager && (
                <button 
                  onClick={handleApprove}
                  className="flex-[2] btn-google-primary bg-purple-600 hover:bg-purple-700 justify-center py-4 text-xs font-black uppercase tracking-widest shadow-xl"
                >
                   <ShieldCheck size={18} /> Approuver l'intervention
                </button>
             )}
             {selectedTicket?.status === 'Résolu' && isManager && (
                <button 
                  onClick={handleCloseTicket}
                  className="flex-[2] btn-google-primary bg-gray-800 hover:bg-black justify-center py-4 text-xs font-black uppercase tracking-widest shadow-xl"
                >
                   <Lock size={18} /> Clôturer Administrativement
                </button>
             )}
             {selectedTicket?.status === 'En cours' && currentUser?.id === selectedTicket.assignedTechnicianId && (
                <button 
                  onClick={() => { if(selectedTicket) saveTicket({...selectedTicket, status: 'En attente d\'approbation'}); }}
                  className="flex-[2] btn-google-primary bg-amber-600 hover:bg-amber-700 justify-center py-4 text-xs font-black uppercase tracking-widest shadow-xl"
                >
                   <Send size={18} /> Soumettre le rapport
                </button>
             )}
             <button 
               onClick={() => { setEditingTicket(selectedTicket); setIsModalOpen(true); }}
               className="flex-1 btn-google-outlined justify-center py-4 text-xs font-black uppercase tracking-widest"
             >
                <Edit3 size={18} /> Modifier
             </button>
          </div>
        }
      >
        {selectedTicket && (
          <div className="space-y-12 pb-20">
             {/* Stepper */}
             <section className="bg-[#f8f9fa] border border-[#dadce0] p-6 shadow-inner">
                {renderStepper(selectedTicket.status)}
             </section>

             {/* HEADER INFO TECH */}
             <div className="flex flex-col md:flex-row gap-8 items-start">
                <div className={`p-8 bg-gradient-to-br from-white to-[#f8f9fa] border border-[#dadce0] flex-1 text-center`}>
                   <div className={`w-16 h-16 rounded-none flex items-center justify-center mx-auto mb-4 shadow-xl ${getPriorityColor(selectedTicket.priority)} text-white`}>
                      <ShieldAlert size={32} />
                   </div>
                   <h3 className="text-xl font-black text-[#202124] tracking-tight">{selectedTicket.productName}</h3>
                   <p className="text-[9px] font-black text-[#1a73e8] uppercase tracking-[0.2em] mt-1">{selectedTicket.brand} • S/N {selectedTicket.serialNumber || 'Non Saisie'}</p>
                </div>

                <div className="w-full md:w-72 p-6 bg-white border border-[#dadce0] space-y-4">
                   <h4 className="text-[9px] font-black text-[#9aa0a6] uppercase tracking-widest flex items-center gap-2"><User size={14} /> Expert Horizon</h4>
                   {selectedTicket.assignedTechnicianId ? (
                      <div className="flex items-center gap-4">
                         <img src={technicians.find(t => t.id === selectedTicket.assignedTechnicianId)?.avatar} className="w-12 h-12 rounded-none border p-0.5 bg-white shadow-sm" alt="" />
                         <div>
                            <p className="text-sm font-black text-[#202124] leading-none">{technicians.find(t => t.id === selectedTicket.assignedTechnicianId)?.name}</p>
                            <p className="text-[9px] text-[#1a73e8] font-bold uppercase mt-1">Technicien Élite</p>
                         </div>
                      </div>
                   ) : (
                      <p className="text-[10px] text-gray-400 font-bold uppercase">Non assigné</p>
                   )}
                </div>
             </div>

             {/* CLIENT & DESCRIPTION */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <section className="space-y-4">
                   <h4 className="text-[10px] font-black text-[#9aa0a6] uppercase tracking-[0.2em] flex items-center gap-2"><Briefcase size={16} /> Titulaire du Dossier</h4>
                   <div className="p-8 bg-white border border-[#dadce0] space-y-6 shadow-sm">
                      <div className="flex items-center gap-6">
                         <div className="w-12 h-12 bg-[#f8f9fa] border flex items-center justify-center text-[#1a73e8] shadow-inner"><User size={20}/></div>
                         <div>
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Identité Client</p>
                            <p className="text-base font-black text-[#3c4043]">{selectedTicket.customerName}</p>
                         </div>
                      </div>
                      <div className="h-px bg-gray-100" />
                      <div className="flex items-center gap-6">
                         <div className="w-12 h-12 bg-[#f8f9fa] border flex items-center justify-center text-[#1a73e8] shadow-inner"><Smartphone size={20}/></div>
                         <div>
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Contact GSM</p>
                            <p className="text-base font-black text-[#3c4043] font-mono tracking-tighter">{selectedTicket.customerPhone}</p>
                         </div>
                      </div>
                   </div>
                </section>

                <section className="space-y-4">
                   <h4 className="text-[10px] font-black text-[#9aa0a6] uppercase tracking-[0.2em] flex items-center gap-2"><FileText size={16} /> Diagnostic & Descriptif</h4>
                   <div className="p-8 bg-[#fffcf5] border border-[#ffe082] shadow-sm italic text-sm text-gray-700 leading-relaxed font-medium relative h-full">
                      "{selectedTicket.description}"
                   </div>
                </section>
             </div>
          </div>
        )}
      </Drawer>

      {/* TICKET EDIT MODAL */}
      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingTicket(null); }} title={editingTicket ? `Expertise Dossier : ${editingTicket.id}` : "Émission Dossier SAV Cloud"} size="xl">
        <form onSubmit={handleSave} className="space-y-10">
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
              <div className="space-y-6">
                 <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#5f6368] border-b border-[#f1f3f4] pb-3 flex items-center gap-2"><User size={14}/> Profil Client</h3>
                 <div className="space-y-4">
                    <div className="space-y-1.5">
                       <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Identité Complète</label>
                       <input name="customerName" type="text" defaultValue={editingTicket?.customerName} required className="w-full h-11 bg-[#f8f9fa] border-none font-bold" />
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Ligne Mobile (Synchronisation)</label>
                       <input name="customerPhone" type="tel" defaultValue={editingTicket?.customerPhone} required className="w-full h-11 bg-[#f8f9fa] border-none font-black font-mono" placeholder="+241 ..." />
                    </div>
                 </div>
              </div>
              <div className="space-y-6">
                 <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#5f6368] border-b border-[#f1f3f4] pb-3 flex items-center gap-2"><Package size={14}/> Matériel SAV</h3>
                 <div className="space-y-4">
                    <div className="space-y-1.5">
                       <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Désignation Produit</label>
                       <input name="productName" type="text" defaultValue={editingTicket?.productName} required className="w-full h-11 bg-[#f8f9fa] border-none font-bold" />
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Constructeur / Marque</label>
                       <input name="brand" type="text" defaultValue={editingTicket?.brand} required className="w-full h-11 bg-[#f8f9fa] border-none font-bold" />
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-[9px] font-black text-gray-400 uppercase ml-1">N° de Série (S/N)</label>
                       <input name="serialNumber" type="text" defaultValue={editingTicket?.serialNumber} className="w-full h-11 bg-[#f8f9fa] border-none font-mono font-black" />
                    </div>
                 </div>
              </div>
              <div className="space-y-6">
                 <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#5f6368] border-b border-[#f1f3f4] pb-3 flex items-center gap-2"><Settings size={14}/> Configuration</h3>
                 <div className="space-y-4">
                    <div className="space-y-1.5">
                       <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Showroom Émetteur</label>
                       <select name="showroom" defaultValue={editingTicket?.showroom || 'Glass'} className="w-full h-11 bg-[#f8f9fa] border-none font-black text-[10px] uppercase">
                          {showrooms.map(s => <option key={s.id} value={s.id}>{s.id}</option>)}
                       </select>
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Expert Assigné</label>
                       <select name="assignedTechnicianId" defaultValue={editingTicket?.assignedTechnicianId || ''} className="w-full h-11 bg-[#f8f9fa] border-none text-[#1a73e8] font-black text-[10px] uppercase">
                          <option value="">Algorithme Auto-Assign</option>
                          {technicians.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                       </select>
                    </div>
                 </div>
              </div>
           </div>
           <div className="space-y-2 pt-6 border-t border-[#f1f3f4]">
              <label className="text-[9px] font-black text-gray-400 uppercase ml-1 tracking-widest">Diagnostic Préliminaire / Descriptif</label>
              <textarea name="description" required defaultValue={editingTicket?.description} className="w-full h-32 text-sm p-5 bg-[#f8f9fa] border-none font-medium" />
           </div>

           <div className="flex gap-4 pt-8 border-t border-[#dadce0]">
              <button type="submit" className="btn-google-primary flex-1 justify-center py-5 text-xs font-black uppercase tracking-[0.2em] shadow-xl">
                 <Save size={20} /> {editingTicket ? 'Actualiser le dossier' : 'Valider le nouveau dossier'}
              </button>
              <button type="button" onClick={() => setIsModalOpen(false)} className="btn-google-outlined px-12 font-black uppercase text-[10px]">Annuler</button>
           </div>
        </form>
      </Modal>
    </div>
  );
};

export default Tickets;
