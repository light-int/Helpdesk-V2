
import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Plus, Search, RefreshCw, Filter, MoreHorizontal, 
  Sparkles, User, Clock, CheckCircle2, 
  AlertCircle, DollarSign, X, ChevronRight, ClipboardCheck, Info,
  Calendar, CreditCard, FileText, Settings, Activity, Save, Package,
  Edit3, Trash2, UserPlus, MapPin, Printer, Share2, MessageSquare,
  TrendingUp, Truck, Wrench, Users, History, AlertTriangle, ShieldCheck, Lock,
  ShieldAlert, Tag, Hash, Archive, Eye, Smartphone, Briefcase, Play,
  Zap, Map, Layers, Target, Headphones, Receipt, Info as InfoIcon, FilterX, BellRing,
  SlidersHorizontal, LayoutGrid, ListFilter, MapPinned, ChevronLeft, ArrowUpRight,
  Timer, BarChart3, RotateCcw, Boxes, Shapes, CalendarDays
} from 'lucide-react';
import { useData, useNotifications, useUser } from '../App';
import { Ticket, TicketStatus, TicketCategory, Showroom, UsedPart, Customer } from '../types';
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

  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const [currentPage, setCurrentPage] = useState(1);

  // Droits d'accès
  const canCreateTicket = currentUser?.role !== 'TECHNICIAN';

  useEffect(() => { 
    refreshAll();
    const interval = setInterval(() => setCurrentTime(new Date()), 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, statusFilter, priorityFilter, showroomFilter, categoryFilter, dateRange]);

  useEffect(() => {
    const ticketId = searchParams.get('id');
    if (ticketId && tickets.length > 0) {
      const found = tickets.find(t => t.id === ticketId);
      if (found) {
        setSelectedTicket(found);
        setSearchParams({}, { replace: true });
      }
    }
  }, [searchParams, tickets, setSearchParams]);

  const allFilteredTickets = useMemo(() => {
    return tickets.filter(t => {
      if (t.isArchived) return false;
      if (currentUser?.role === 'TECHNICIAN' && t.assignedTechnicianId !== currentUser.id) return false;
      
      const matchesSearch = (t.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (t.id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (t.serialNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (t.productName || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'Tous' || t.status === statusFilter;
      const matchesPriority = priorityFilter === 'Toutes' || t.priority === priorityFilter;
      const matchesShowroom = showroomFilter === 'Tous' || t.showroom === showroomFilter;
      const matchesCategory = categoryFilter === 'Toutes' || t.category === categoryFilter;

      // Filter by date
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

  const stats = useMemo(() => ({
    total: tickets.filter(t => !t.isArchived).length,
    urgent: tickets.filter(t => t.priority === 'Urgent' && t.status !== 'Fermé').length,
    new: tickets.filter(t => t.status === 'Nouveau').length,
    closed: tickets.filter(t => (t.status === 'Résolu' || t.status === 'Fermé')).length
  }), [tickets]);

  const hasActiveFilters = searchTerm !== '' || statusFilter !== 'Tous' || priorityFilter !== 'Toutes' || showroomFilter !== 'Tous' || categoryFilter !== 'Toutes' || dateRange !== 'all';

  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('Tous');
    setPriorityFilter('Toutes');
    setShowroomFilter('Tous');
    setCategoryFilter('Toutes');
    setDateRange('all');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Résolu': return 'bg-green-50 text-green-700 border-green-200';
      case 'Fermé': return 'bg-gray-50 text-gray-500 border-gray-300';
      case 'En attente d\'approbation': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Nouveau': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'En cours': return 'bg-amber-50 text-amber-700 border-amber-300';
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
    
    // FIX BUG 23503: Sanitisation de l'ID technicien pour éviter violation FK
    const rawTechId = formData.get('assignedTechnicianId') as string;
    // Si vide ou n'existe pas dans la liste des techniciens chargés, on met undefined (Supabase mettra null)
    const finalTechId = rawTechId && technicians.some(t => t.id === rawTechId) ? rawTechId : undefined;

    const ticketData: Ticket = {
      ...(editingTicket || {}),
      id: editingTicket?.id || `T-${Math.floor(1000 + Math.random() * 9000)}`,
      customerName: formData.get('customerName') as string,
      customerPhone: formData.get('customerPhone') as string,
      brand: formData.get('brand') as string,
      productName: formData.get('productName') as string,
      serialNumber: formData.get('serialNumber') as string,
      location: formData.get('location') as string,
      source: (formData.get('source') as any) || 'WhatsApp',
      showroom: (formData.get('showroom') as any) || 'Glass',
      category: (formData.get('category') as any) || 'SAV',
      status: (formData.get('status') as any) || 'Nouveau',
      priority: (formData.get('priority') as any) || 'Moyenne',
      description: formData.get('description') as string,
      assignedTechnicianId: finalTechId,
      createdAt: editingTicket?.createdAt || new Date().toISOString(),
      lastUpdate: new Date().toISOString(),
      financials: editingTicket?.financials || {
        partsTotal: 0, partsCost: 0, laborTotal: 0, laborCost: 0, logisticsCost: 0, 
        travelFee: 5000, discount: 0, grandTotal: 5000, netMargin: 3000, isPaid: false
      }
    } as Ticket;

    try {
      await saveTicket(ticketData);
      setIsModalOpen(false);
      addNotification({ title: 'Horizon Sync', message: `Ticket #${ticketData.id} enregistré.`, type: 'success' });
    } catch (err: any) {
      console.error("Save error:", err);
      // Notification d'erreur explicite pour l'utilisateur
      addNotification({ 
        title: 'Erreur d\'intégrité', 
        message: "L'expert sélectionné est introuvable ou invalide. Le dossier n'a pas pu être sauvegardé.", 
        type: 'error' 
      });
    }
  };

  return (
    <div className="space-y-8 animate-page-entry pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-light text-[#202124]">Tickets & Opérations SAV</h1>
          <p className="text-[10px] text-[#5f6368] font-black uppercase tracking-widest mt-1">Management du flux technique Royal Plaza</p>
        </div>
        <div className="flex gap-3">
          <button onClick={refreshAll} className="btn-google-outlined h-11 px-4"><RefreshCw size={18} className={isSyncing ? 'animate-spin' : ''} /></button>
          
          {/* RÈGLE MÉTIER : Un technicien ne peut pas créer de ticket */}
          {canCreateTicket && (
            <button onClick={() => { setEditingTicket(null); setIsModalOpen(true); }} className="btn-google-primary h-11 px-6 shadow-xl shadow-blue-600/10">
              <Plus size={20} /> <span>Ouvrir un Dossier</span>
            </button>
          )}
        </div>
      </header>

      {/* MONITORING DASHBOARD - MINI */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Flux SAV Actif', value: stats.total, color: '#1a73e8', icon: <Activity size={20}/> },
          { label: 'Urgences SLA', value: stats.urgent, color: '#d93025', icon: <Zap size={20}/> },
          { label: 'Nouveaux Dossiers', value: stats.new, color: '#1a73e8', icon: <BellRing size={20}/> },
          { label: 'Résolutions Mois', value: stats.closed, color: '#188038', icon: <CheckCircle2 size={20}/> }
        ].map((s, i) => (
          <div key={i} className="stats-card border-l-4" style={{ borderLeftColor: s.color }}>
             <div className="flex justify-between items-start">
               <div>
                 <p className="text-[10px] font-black text-[#5f6368] uppercase tracking-[0.15em] mb-1">{s.label}</p>
                 <h3 className="text-3xl font-bold text-[#202124] tracking-tighter">{s.value}</h3>
               </div>
               <div className="p-2 bg-gray-50 text-gray-400 group-hover:text-blue-600 transition-colors">{s.icon}</div>
             </div>
          </div>
        ))}
      </div>

      {/* COMMAND CENTER FILTERS - ENHANCED CARD */}
      <div className="google-card overflow-hidden border-none shadow-lg">
        <div className="p-8 space-y-6 bg-white">
           <div className="flex flex-col xl:flex-row gap-6">
              <div className="relative flex-1 group">
                 <Search className="absolute left-5 top-4.5 text-[#9aa0a6] group-focus-within:text-[#1a73e8] transition-colors" size={24} />
                 <input 
                  type="text" 
                  placeholder="Rechercher par client, ticket ID, série ou modèle..." 
                  className="w-full pl-14 h-16 bg-[#f8f9fa] border-2 border-transparent focus:border-[#1a73e8] focus:bg-white focus:ring-0 text-base font-bold shadow-inner transition-all placeholder:text-gray-400 placeholder:font-normal"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                 />
                 {searchTerm && (
                   <button onClick={() => setSearchTerm('')} className="absolute right-5 top-5 p-1 text-gray-400 hover:text-red-500 transition-colors">
                     <X size={20} />
                   </button>
                 )}
              </div>

              <div className="flex flex-wrap items-center gap-4">
                 <div className="flex items-center bg-[#f1f3f4] p-1.5">
                    {[
                      { id: 'Tous', label: 'Tout le flux' },
                      { id: 'Nouveau', label: 'Nouveaux' },
                      { id: 'En cours', label: 'En cours' },
                      { id: 'Résolu', label: 'Résolus' }
                    ].map(status => (
                      <button 
                        key={status.id}
                        onClick={() => setStatusFilter(status.id)}
                        className={`px-6 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${statusFilter === status.id ? 'bg-white text-[#1a73e8] shadow-md' : 'text-[#5f6368] hover:text-[#202124]'}`}
                      >
                        {status.label}
                      </button>
                    ))}
                 </div>

                 <div className="flex items-center bg-[#f1f3f4] p-1.5">
                    {[
                      { id: 'all', label: 'Toute date' },
                      { id: 'today', label: 'Auj.' },
                      { id: 'week', label: '7 Jours' },
                      { id: 'month', label: '30 Jours' }
                    ].map(range => (
                      <button 
                        key={range.id}
                        onClick={() => setDateRange(range.id as any)}
                        className={`px-4 py-3 text-[9px] font-black uppercase tracking-widest transition-all ${dateRange === range.id ? 'bg-[#202124] text-white shadow-md' : 'text-[#5f6368] hover:text-[#202124]'}`}
                      >
                        {range.label}
                      </button>
                    ))}
                 </div>
                 
                 {hasActiveFilters && (
                    <button 
                      onClick={resetFilters} 
                      className="p-4 text-[#d93025] hover:bg-red-50 border-2 border-transparent hover:border-red-100 transition-all group"
                      title="Réinitialiser tous les filtres"
                    >
                       <RotateCcw size={22} className="group-hover:rotate-[-180deg] transition-transform duration-500" />
                    </button>
                 )}
              </div>
           </div>

           {hasActiveFilters && (
              <div className="flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-1 duration-300">
                 {statusFilter !== 'Tous' && (
                   <span className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-[#1a73e8] text-[9px] font-black uppercase border border-blue-100">
                     Statut: {statusFilter} <button onClick={() => setStatusFilter('Tous')}><X size={12}/></button>
                   </span>
                 )}
                 {priorityFilter !== 'Toutes' && (
                   <span className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 text-orange-700 text-[9px] font-black uppercase border border-orange-100">
                     Priorité: {priorityFilter} <button onClick={() => setPriorityFilter('Toutes')}><X size={12}/></button>
                   </span>
                 )}
                 {showroomFilter !== 'Tous' && (
                   <span className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 text-purple-700 text-[9px] font-black uppercase border border-purple-100">
                     Point: {showroomFilter} <button onClick={() => setShowroomFilter('Tous')}><X size={12}/></button>
                   </span>
                 )}
                 {categoryFilter !== 'Toutes' && (
                   <span className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 text-[9px] font-black uppercase border border-emerald-100">
                     Expertise: {categoryFilter} <button onClick={() => setCategoryFilter('Toutes')}><X size={12}/></button>
                   </span>
                 )}
                 {dateRange !== 'all' && (
                   <span className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-700 text-[9px] font-black uppercase border border-gray-200">
                     Période: {dateRange} <button onClick={() => setDateRange('all')}><X size={12}/></button>
                   </span>
                 )}
              </div>
           )}

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 pt-6 border-t border-[#f1f3f4]">
              <div className="space-y-1.5">
                 <label className="text-[9px] font-black text-[#9aa0a6] uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                   <SlidersHorizontal size={12} /> Niveau d'Urgence
                 </label>
                 <div className="relative">
                   <select 
                      value={priorityFilter} 
                      onChange={e => setPriorityFilter(e.target.value)}
                      className="w-full h-12 bg-[#f8f9fa] border-none text-[11px] font-black uppercase tracking-widest focus:ring-2 focus:ring-[#1a73e8] cursor-pointer"
                   >
                      <option value="Toutes">Toutes Priorités</option>
                      <option value="Urgent" className="text-red-600">Urgent SLA</option>
                      <option value="Haute">Priorité Haute</option>
                      <option value="Moyenne">Priorité Moyenne</option>
                      <option value="Basse">Priorité Basse</option>
                   </select>
                 </div>
              </div>

              <div className="space-y-1.5">
                 <label className="text-[9px] font-black text-[#9aa0a6] uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                   <MapPinned size={12} /> Point de Vente
                 </label>
                 <div className="relative">
                   <select 
                      value={showroomFilter} 
                      onChange={e => setShowroomFilter(e.target.value)}
                      className="w-full h-12 bg-[#f8f9fa] border-none text-[11px] font-black uppercase tracking-widest focus:ring-2 focus:ring-[#1a73e8] cursor-pointer"
                   >
                      <option value="Tous">Tous les Showrooms</option>
                      {showrooms.map(s => <option key={s.id} value={s.id}>{s.id}</option>)}
                   </select>
                 </div>
              </div>

              <div className="space-y-1.5">
                 <label className="text-[9px] font-black text-[#9aa0a6] uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                   <Shapes size={12} /> Domaine Technique
                 </label>
                 <div className="relative">
                   <select 
                      value={categoryFilter} 
                      onChange={e => setCategoryFilter(e.target.value)}
                      className="w-full h-12 bg-[#f8f9fa] border-none text-[11px] font-black uppercase tracking-widest focus:ring-2 focus:ring-[#1a73e8] cursor-pointer"
                   >
                      <option value="Toutes">Toutes les Catégories</option>
                      <option value="SAV">SAV Classique</option>
                      <option value="Climatisation">Climatisation</option>
                      <option value="Électronique">Électronique</option>
                      <option value="Installation">Installation</option>
                      <option value="Maintenance">Maintenance Pro</option>
                   </select>
                 </div>
              </div>

              <div className="flex items-end">
                 <div className="w-full p-4 bg-blue-50 border border-blue-100 flex items-center justify-between shadow-inner relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-12 h-12 bg-blue-100 rotate-45 translate-x-6 -translate-y-6 opacity-20 group-hover:opacity-40 transition-opacity" />
                    <div>
                       <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-2">
                         <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" /> Résultats Horizon
                       </p>
                       <p className="text-lg font-black text-blue-700 leading-none mt-1">{allFilteredTickets.length} <span className="text-[10px]">Dossiers</span></p>
                    </div>
                    <div className="p-2 bg-white text-blue-600 shadow-sm"><LayoutGrid size={18}/></div>
                 </div>
              </div>
           </div>
        </div>

        {/* DATA GRID */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white border-b border-[#dadce0] text-[9px] font-black text-[#5f6368] uppercase tracking-[0.2em]">
                <th className="px-8 py-5">ID & Canal</th>
                <th className="px-8 py-5">Client & Coordonnées</th>
                <th className="px-8 py-5">Matériel & Constructeur</th>
                <th className="px-8 py-5 text-center">Priorité</th>
                <th className="px-8 py-5 text-right">Statut Opé.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#dadce0]">
              {paginatedTickets.map((t) => (
                <tr 
                  key={t.id} 
                  onClick={() => setSelectedTicket(t)}
                  className={`hover:bg-[#f8faff] transition-colors group cursor-pointer relative ${selectedTicket?.id === t.id ? 'bg-[#e8f0fe]' : ''}`}
                >
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                       <span className="text-xs font-black text-[#1a73e8]">#{t.id}</span>
                       <span className="px-2 py-0.5 bg-gray-100 text-[8px] font-black text-gray-500 uppercase tracking-tighter border border-gray-200">{t.source}</span>
                    </div>
                    <p className="text-[9px] text-gray-400 font-bold mt-1 uppercase tracking-widest">{t.showroom}</p>
                  </td>
                  <td className="px-8 py-5">
                    <p className="text-sm font-bold text-[#3c4043] group-hover:text-[#1a73e8] transition-colors">{t.customerName}</p>
                    <p className="text-[10px] text-[#5f6368] font-mono mt-0.5">{t.customerPhone}</p>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                       <div className={`w-8 h-8 flex items-center justify-center border border-gray-100 group-hover:bg-white transition-colors ${t.status === 'Résolu' ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-[#1a73e8]'}`}>
                          <Package size={16} />
                       </div>
                       <div>
                          <p className="text-xs font-bold text-[#3c4043] leading-tight">{t.productName}</p>
                          <span className="text-[9px] font-black text-[#1a73e8] uppercase tracking-tighter">{t.brand}</span>
                       </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                     <div className="flex items-center justify-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${getPriorityColor(t.priority)} ${t.priority === 'Urgent' ? 'animate-pulse' : ''}`} />
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#5f6368]">{t.priority}</span>
                     </div>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <span className={`px-4 py-1.5 border text-[9px] font-black uppercase tracking-widest ${getStatusColor(t.status)}`}>
                      {t.status}
                    </span>
                  </td>
                </tr>
              ))}
              {allFilteredTickets.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-32 text-center bg-white">
                    <Archive size={48} className="mx-auto text-gray-100 mb-4" />
                    <p className="text-xs font-black text-gray-300 uppercase tracking-[0.2em]">Aucun dossier correspondant</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        {totalPages > 1 && (
           <div className="px-8 py-4 bg-[#f8f9fa] border-t border-[#dadce0] flex items-center justify-between">
              <p className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest">
                Dossiers {(currentPage - 1) * TICKETS_PER_PAGE + 1} - {Math.min(currentPage * TICKETS_PER_PAGE, allFilteredTickets.length)} sur {allFilteredTickets.length}
              </p>
              <div className="flex gap-1">
                 <button onClick={() => setCurrentPage(p => Math.max(1, p-1))} className="p-2 hover:bg-white border border-transparent hover:border-[#dadce0] transition-all"><ChevronLeft size={18}/></button>
                 <button onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} className="p-2 hover:bg-white border border-transparent hover:border-[#dadce0] transition-all"><ChevronRight size={18}/></button>
              </div>
           </div>
        )}
      </div>

      {/* TICKET DETAILS DRAWER */}
      <Drawer
        isOpen={!!selectedTicket}
        onClose={() => setSelectedTicket(null)}
        title={`Dossier Opérationnel #${selectedTicket?.id}`}
        subtitle={`${selectedTicket?.category} • Enregistré le ${selectedTicket ? new Date(selectedTicket.createdAt).toLocaleDateString() : ''}`}
        icon={<FileText size={20} />}
        footer={
          <div className="flex gap-3">
             <button onClick={() => { setSelectedTicket(null); setEditingTicket(selectedTicket); setIsModalOpen(true); }} className="flex-1 btn-google-outlined justify-center py-4 text-xs font-black uppercase tracking-widest">Modifier la Fiche</button>
             {currentUser?.role === 'ADMIN' && (
                <button onClick={() => { if(window.confirm('Archiver ce dossier ?')) deleteTicket(selectedTicket!.id); setSelectedTicket(null); }} className="p-4 bg-red-50 text-red-600 border border-red-100 hover:bg-red-600 hover:text-white transition-all">
                  <Trash2 size={20} />
                </button>
             )}
          </div>
        }
      >
        {selectedTicket && (
          <div className="space-y-12 pb-10">
             <div className="grid grid-cols-2 gap-4">
                <div className="p-6 bg-white border border-[#dadce0] shadow-sm space-y-2">
                   <p className="text-[9px] font-black text-[#9aa0a6] uppercase tracking-widest">Statut Horizon</p>
                   <span className={`px-4 py-1.5 border text-[10px] font-black uppercase inline-block ${getStatusColor(selectedTicket.status)}`}>{selectedTicket.status}</span>
                </div>
                <div className="p-6 bg-white border border-[#dadce0] shadow-sm space-y-2">
                   <p className="text-[9px] font-black text-[#9aa0a6] uppercase tracking-widest">Niveau d'Urgence</p>
                   <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${getPriorityColor(selectedTicket.priority)}`} />
                      <span className="text-sm font-black text-[#3c4043] uppercase">{selectedTicket.priority}</span>
                   </div>
                </div>
             </div>

             <section className="space-y-4">
                <h3 className="text-[10px] font-black text-[#9aa0a6] uppercase tracking-[0.2em] flex items-center gap-2"><Package size={16} /> Passeport Équipement</h3>
                <div className="p-8 bg-[#f8f9fa] border border-[#dadce0] space-y-6">
                   <div className="flex items-start gap-6">
                      <div className="w-16 h-16 bg-white border border-[#dadce0] flex items-center justify-center text-[#1a73e8] shrink-0"><Wrench size={32}/></div>
                      <div className="flex-1 min-w-0">
                         <span className="text-[9px] font-black text-[#1a73e8] uppercase bg-blue-50 px-2 py-0.5 border border-blue-100">{selectedTicket.brand}</span>
                         <h4 className="text-xl font-black text-[#202124] mt-2 tracking-tight truncate">{selectedTicket.productName}</h4>
                         <p className="text-xs font-mono text-[#5f6368] mt-1 font-bold">S/N: {selectedTicket.serialNumber || 'NON DÉFINI'}</p>
                      </div>
                   </div>
                   <div className="pt-6 border-t border-[#dadce0] grid grid-cols-2 gap-8">
                      <div>
                         <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Date d'Achat</p>
                         <p className="text-sm font-bold text-[#3c4043]">{selectedTicket.purchaseDate || '-- / -- / --'}</p>
                      </div>
                      <div>
                         <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Localisation</p>
                         <p className="text-sm font-bold text-[#3c4043] flex items-center gap-2"><MapPin size={14} className="text-[#1a73e8]"/> {selectedTicket.location || 'Non précisée'}</p>
                      </div>
                   </div>
                </div>
             </section>

             <section className="space-y-4">
                <h3 className="text-[10px] font-black text-[#9aa0a6] uppercase tracking-[0.2em] flex items-center gap-2"><History size={16} /> Diagnostic & Symptômes</h3>
                <div className="p-8 bg-white border border-[#dadce0] shadow-sm italic text-sm text-[#3c4043] leading-relaxed relative">
                   <div className="absolute top-0 left-0 w-1 h-full bg-[#1a73e8]" />
                   "{selectedTicket.description}"
                </div>
             </section>

             <section className="space-y-4">
                <h3 className="text-[10px] font-black text-[#9aa0a6] uppercase tracking-[0.2em] flex items-center gap-2"><Users size={16} /> Expert Assigné</h3>
                <div className="p-6 border border-[#dadce0] bg-white flex items-center justify-between">
                   {selectedTicket.assignedTechnicianId ? (
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-[#f8f9fa] border border-[#dadce0] flex items-center justify-center text-[#1a73e8]"><User size={24}/></div>
                        <div>
                           <p className="text-sm font-black text-[#3c4043]">{technicians.find(tech => tech.id === selectedTicket.assignedTechnicianId)?.name}</p>
                           <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Technicien Certifié Horizon</p>
                        </div>
                     </div>
                   ) : (
                     <p className="text-xs font-bold text-gray-400 italic">En attente d'affectation Cloud...</p>
                   )}
                   <button className="p-2 text-[#1a73e8] hover:bg-blue-50 transition-colors"><MessageSquare size={18}/></button>
                </div>
             </section>
          </div>
        )}
      </Drawer>

      {/* TICKET FORM MODAL */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingTicket ? `Révision Dossier #${editingTicket.id}` : "Nouvelle Demande d'Intervention"}
        size="xl"
      >
        <form onSubmit={handleSave} className="space-y-10">
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
              {/* SECTION CLIENT */}
              <div className="space-y-6">
                 <div className="flex items-center gap-3 border-b border-[#dadce0] pb-3">
                    <Users size={18} className="text-[#1a73e8]"/>
                    <h3 className="text-[11px] font-black uppercase tracking-widest text-[#202124]">Identification Client</h3>
                 </div>
                 <div className="space-y-4">
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest ml-1">Nom Complet</label>
                       <input name="customerName" type="text" defaultValue={editingTicket?.customerName} required className="w-full h-11 bg-white font-bold" />
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest ml-1">Mobile GSM</label>
                       <input name="customerPhone" type="tel" defaultValue={editingTicket?.customerPhone} required className="w-full h-11 bg-white font-bold" placeholder="+241 ..." />
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest ml-1">Canal d'Entrée</label>
                       <select name="source" defaultValue={editingTicket?.source || 'WhatsApp'} className="w-full h-11 bg-white font-bold">
                          <option value="WhatsApp">WhatsApp</option>
                          <option value="Phone">Appel Téléphonique</option>
                          <option value="Email">Email Support</option>
                          <option value="Interne">Showroom / Interne</option>
                       </select>
                    </div>
                 </div>
              </div>

              {/* SECTION MATÉRIEL */}
              <div className="space-y-6">
                 <div className="flex items-center gap-3 border-b border-[#dadce0] pb-3">
                    <Package size={18} className="text-purple-600"/>
                    <h3 className="text-[11px] font-black uppercase tracking-widest text-[#202124]">Spécifications Produit</h3>
                 </div>
                 <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                       <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest ml-1">Marque</label>
                          <select name="brand" defaultValue={editingTicket?.brand || 'LG'} className="w-full h-11 bg-white font-bold">
                             {['LG', 'Beko', 'Samsung', 'Hisense', 'Royal Plaza', 'BuroPlus', 'TCL', 'Midea'].map(b => <option key={b} value={b}>{b}</option>)}
                          </select>
                       </div>
                       <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest ml-1">Catégorie</label>
                          <select name="category" defaultValue={editingTicket?.category || 'SAV'} className="w-full h-11 bg-white font-bold">
                             <option value="SAV">SAV</option>
                             <option value="Installation">Installation</option>
                             <option value="Maintenance">Maintenance</option>
                          </select>
                       </div>
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest ml-1">Modèle / Désignation</label>
                       <input name="productName" type="text" defaultValue={editingTicket?.productName} required className="w-full h-11 bg-white font-bold" placeholder="ex: Split LG 1.5CV Artic" />
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest ml-1">Numéro de Série (S/N)</label>
                       <input name="serialNumber" type="text" defaultValue={editingTicket?.serialNumber} className="w-full h-11 bg-white font-mono uppercase" placeholder="SN-..." />
                    </div>
                 </div>
              </div>

              {/* SECTION LOGISTIQUE */}
              <div className="space-y-6">
                 <div className="flex items-center gap-3 border-b border-[#dadce0] pb-3">
                    <Target size={18} className="text-orange-600"/>
                    <h3 className="text-[11px] font-black uppercase tracking-widest text-[#202124]">Logistique & Assignation</h3>
                 </div>
                 <div className="space-y-4">
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest ml-1">Showroom de Rattachement</label>
                       <select name="showroom" defaultValue={editingTicket?.showroom || 'Glass'} className="w-full h-11 bg-white font-bold">
                          {showrooms.map(s => <option key={s.id} value={s.id}>{s.id}</option>)}
                       </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                       <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest ml-1">Niveau Priorité</label>
                          <select name="priority" defaultValue={editingTicket?.priority || 'Moyenne'} className="w-full h-11 bg-white font-bold text-red-600">
                             <option value="Basse">Basse</option>
                             <option value="Moyenne">Moyenne</option>
                             <option value="Haute">Haute</option>
                             <option value="Urgent">Urgent</option>
                          </select>
                       </div>
                       <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest ml-1">Expert Assigné</label>
                          <select name="assignedTechnicianId" defaultValue={editingTicket?.assignedTechnicianId || ''} className="w-full h-11 bg-white font-bold text-[#1a73e8]">
                             <option value="">Affectation Auto</option>
                             {technicians.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                          </select>
                       </div>
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest ml-1">Quartier / Zone d'Intervention</label>
                       <input name="location" type="text" defaultValue={editingTicket?.location} className="w-full h-11 bg-white" placeholder="ex: Akanda, Villa 402" />
                    </div>
                 </div>
              </div>
           </div>

           <div className="space-y-3 pt-6 border-t border-[#dadce0]">
              <label className="text-[10px] font-black text-[#5f6368] uppercase tracking-[0.2em] ml-1">Diagnostic Initial & Notes Client</label>
              <textarea name="description" required defaultValue={editingTicket?.description} className="w-full h-32 bg-white text-sm font-medium resize-none p-4" placeholder="Décrire les symptômes rapportés par le client..." />
           </div>

           <div className="flex gap-4 pt-8 border-t border-[#dadce0]">
              <button type="submit" className="btn-google-primary flex-1 justify-center py-5 text-xs font-black uppercase tracking-[0.2em] shadow-xl">
                 <Save size={20} /> {editingTicket ? 'Mettre à jour le Dossier' : 'Ouvrir le Dossier Cloud'}
              </button>
              <button type="button" onClick={() => setIsModalOpen(false)} className="btn-google-outlined px-12 font-black uppercase text-[10px] tracking-widest">Abandonner</button>
           </div>
        </form>
      </Modal>
    </div>
  );
};

export default Tickets;
