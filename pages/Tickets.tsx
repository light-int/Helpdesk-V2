
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
  CreditCard as PaymentIcon, Gauge
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
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  
  const [currentPage, setCurrentPage] = useState(1);

  const canCreateTicket = currentUser?.role !== 'TECHNICIAN';

  useEffect(() => { refreshAll(); }, []);

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
      
      // VISIBILITÉ TECHNIQUE AMÉLIORÉE
      if (currentUser?.role === 'TECHNICIAN') {
        // Le technicien voit :
        // 1. Ce qui lui est assigné
        const isMine = t.assignedTechnicianId === currentUser.id;
        // 2. Les nouveaux tickets de son showroom (pour auto-assignation)
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
    const relevant = tickets.filter(t => {
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
    const rawTechId = formData.get('assignedTechnicianId') as string;
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
    } as Ticket;

    try {
      await saveTicket(ticketData);
      setIsModalOpen(false);
      addNotification({ title: 'Horizon Sync', message: 'Dossier enregistré.', type: 'success' });
    } catch (err: any) {
      addNotification({ title: 'Erreur', message: 'Échec de la sauvegarde.', type: 'error' });
    }
  };

  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('Tous');
    setPriorityFilter('Toutes');
    setShowroomFilter('Tous');
    setCategoryFilter('Toutes');
    setDateRange('all');
  };

  return (
    <div className="space-y-8 animate-page-entry pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-light text-[#202124]">Tickets & SAV</h1>
          <p className="text-[10px] text-[#5f6368] font-black uppercase tracking-widest mt-1">
             {currentUser?.role === 'TECHNICIAN' ? `Missions pour ${currentUser.name}` : 'Management Central Royal Plaza Horizon'}
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
          { label: 'Flux SAV Actif', value: stats.total, color: '#1a73e8', icon: <Activity size={20}/>, tooltip: "Nombre total de dossiers non archivés" },
          { label: 'Urgences SLA', value: stats.urgent, color: '#d93025', icon: <Zap size={20}/>, tooltip: "Tickets prioritaires en attente de résolution" },
          { label: 'En Attente', value: stats.new, color: '#f9ab00', icon: <BellRing size={20}/>, tooltip: "Dossiers n'ayant pas encore d'expert assigné" },
          { label: 'Clôtures Hebdo', value: stats.closed, color: '#188038', icon: <CheckCircle2 size={20}/>, tooltip: "Tickets résolus cette semaine" }
        ].map((s, i) => (
          <div key={i} className="stats-card border-l-4" style={{ borderLeftColor: s.color }} title={s.tooltip}>
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

      {/* FILTER CONTROL CENTER */}
      <div className="google-card overflow-hidden border-none shadow-xl bg-white ring-1 ring-black/5">
        <div className="p-8 space-y-8">
           <div className="flex flex-col xl:flex-row gap-6">
              <div className="relative flex-1 group" title="Rechercher par client, ticket ID ou S/N">
                 <Search className="absolute left-6 top-5 text-[#9aa0a6] group-focus-within:text-[#1a73e8] transition-colors" size={24} />
                 <input 
                  type="text" 
                  placeholder="Rechercher par client, ticket ID, S/N..." 
                  className="w-full pl-16 h-16 bg-[#f8f9fa] border-none text-base font-bold shadow-inner transition-all focus:bg-white focus:ring-2 focus:ring-blue-100"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                 />
                 {searchTerm && (
                   <button onClick={() => setSearchTerm('')} className="absolute right-6 top-5 p-1 text-gray-400 hover:text-red-500">
                     <X size={22} />
                   </button>
                 )}
              </div>

              <div className="flex flex-wrap items-center gap-4">
                 <div className="flex items-center bg-[#f1f3f4] p-1.5 shadow-inner">
                    {[
                      { id: 'Tous', icon: <ListFilter size={20} />, label: 'Tous les tickets' },
                      { id: 'Nouveau', icon: <BellRing size={20} />, label: 'Nouveaux dossiers' },
                      { id: 'En cours', icon: <Clock size={20} />, label: 'Dossiers en cours' }
                    ].map(item => (
                      <button 
                        key={item.id}
                        title={item.label}
                        onClick={() => setStatusFilter(item.id)}
                        className={`p-3.5 transition-all ${statusFilter === item.id ? 'bg-white text-[#1a73e8] shadow-md' : 'text-[#5f6368] hover:text-[#202124]'}`}
                      >
                        {item.icon}
                      </button>
                    ))}
                 </div>

                 <div className="flex items-center gap-4">
                    <button 
                      onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                      title={showAdvancedFilters ? "Masquer les filtres avancés" : "Afficher filtres par Showroom / Urgence"}
                      className={`p-4.5 border-2 transition-all ${showAdvancedFilters ? 'bg-[#202124] border-[#202124] text-white shadow-lg' : 'bg-white border-[#dadce0] text-[#5f6368] hover:border-[#1a73e8]'}`}
                    >
                      <Sliders size={22} />
                    </button>

                    <div className="h-16 min-w-[180px] p-4 bg-white border border-blue-100 flex items-center justify-between shadow-sm relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-1 h-full bg-[#1a73e8]" />
                      <div className="shrink-0 mr-4">
                         <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                            <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest">Base de Données</span>
                         </div>
                         <p className="text-lg font-black text-[#202124] leading-none mt-1">{allFilteredTickets.length} <span className="text-[10px] text-gray-400 font-bold uppercase">Résultats</span></p>
                      </div>
                      <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl"><LayoutGrid size={18}/></div>
                    </div>
                 </div>
                 
                 {(searchTerm || statusFilter !== 'Tous' || priorityFilter !== 'Toutes' || showroomFilter !== 'Tous' || categoryFilter !== 'Toutes') && (
                    <button onClick={resetFilters} className="p-5 text-[#d93025] hover:bg-red-50 border-2 border-transparent transition-all group" title="Réinitialiser tous les filtres">
                       <RotateCcw size={24} className="group-hover:rotate-[-180deg] transition-transform duration-700" />
                    </button>
                 )}
              </div>
           </div>

           {showAdvancedFilters && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8 border-t border-[#f1f3f4] animate-in slide-in-from-top-4 duration-500">
                <div className="space-y-2">
                   <label className="text-[9px] font-black text-[#9aa0a6] uppercase tracking-[0.2em] ml-1 flex items-center gap-2"><MapPin size={12} /> Showroom émetteur</label>
                   <select 
                      value={showroomFilter} 
                      onChange={e => setShowroomFilter(e.target.value)}
                      className="w-full h-12 bg-[#f8f9fa] border-none text-[11px] font-black uppercase tracking-widest focus:ring-2 focus:ring-[#1a73e8] px-5"
                   >
                      <option value="Tous">Tous les showrooms</option>
                      {showrooms.map(s => <option key={s.id} value={s.id}>{s.id}</option>)}
                   </select>
                </div>

                <div className="space-y-2">
                   <label className="text-[9px] font-black text-[#9aa0a6] uppercase tracking-[0.2em] ml-1 flex items-center gap-2"><Zap size={12} /> Niveau d'urgence</label>
                   <select 
                      value={priorityFilter} 
                      onChange={e => setPriorityFilter(e.target.value)}
                      className="w-full h-12 bg-[#f8f9fa] border-none text-[11px] font-black uppercase tracking-widest focus:ring-2 focus:ring-[#1a73e8] px-5"
                   >
                      <option value="Toutes">Toutes priorités</option>
                      <option value="Urgent">Urgent SLA</option>
                      <option value="Haute">Haute</option>
                      <option value="Moyenne">Moyenne</option>
                   </select>
                </div>

                <div className="space-y-2">
                   <label className="text-[9px] font-black text-[#9aa0a6] uppercase tracking-[0.2em] ml-1 flex items-center gap-2"><Tag size={12} /> Catégorie technique</label>
                   <select 
                      value={categoryFilter} 
                      onChange={e => setCategoryFilter(e.target.value)}
                      className="w-full h-12 bg-[#f8f9fa] border-none text-[11px] font-black uppercase tracking-widest focus:ring-2 focus:ring-[#1a73e8] px-5"
                   >
                      <option value="Toutes">Toutes catégories</option>
                      <option value="SAV">SAV Classique</option>
                      <option value="Installation">Installation Magasin</option>
                      <option value="Maintenance">Maintenance préventive</option>
                   </select>
                </div>
              </div>
           )}
        </div>

        {/* LOG TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#dadce0] bg-[#f8f9fa] text-[#5f6368] text-[9px] font-black uppercase tracking-[0.2em]">
                <th className="px-10 py-6">Dossier & Canal</th>
                <th className="px-10 py-6">Client Bénéfiaciaire</th>
                <th className="px-10 py-6">Matériel & S/N</th>
                <th className="px-10 py-6 text-center">Urgence</th>
                <th className="px-10 py-6 text-right">Statut Cloud</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#dadce0]">
              {paginatedTickets.map((t) => (
                <tr 
                  key={t.id} 
                  onClick={() => setSelectedTicket(t)}
                  className={`hover:bg-[#f8faff] transition-colors group cursor-pointer ${selectedTicket?.id === t.id ? 'bg-[#e8f0fe]' : 'bg-white'}`}
                  title="Cliquer pour les détails complets"
                >
                  <td className="px-10 py-6">
                    <div className="flex items-center gap-3">
                       <span className="text-sm font-black text-[#1a73e8]">#{t.id}</span>
                       <span className="px-2 py-0.5 bg-gray-100 text-[8px] font-black text-gray-500 uppercase tracking-tighter border border-gray-200" title={`Source: ${t.source}`}>{t.source}</span>
                    </div>
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
                     <div className="flex items-center justify-center gap-3" title={`Priorité: ${t.priority}`}>
                        <div className={`w-2 h-2 rounded-full ${getPriorityColor(t.priority)} shadow-sm`} />
                        <span className="text-[9px] font-black uppercase tracking-widest text-[#5f6368]">{t.priority}</span>
                     </div>
                  </td>
                  <td className="px-10 py-6 text-right">
                    <span className={`px-4 py-1.5 border text-[9px] font-black uppercase tracking-widest shadow-sm ${getStatusColor(t.status)}`} title={`État du dossier: ${t.status}`}>
                      {t.status}
                    </span>
                  </td>
                </tr>
              ))}
              {allFilteredTickets.length === 0 && (
                <tr>
                   <td colSpan={5} className="py-40 text-center bg-white">
                      <div className="w-24 h-24 bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center mx-auto mb-8">
                        <Archive size={48} className="text-gray-200" />
                      </div>
                      <p className="text-xs font-black text-gray-300 uppercase tracking-[0.4em]">Aucun dossier identifié</p>
                      <button onClick={resetFilters} className="text-[#1a73e8] text-[10px] font-black uppercase mt-6 hover:underline underline-offset-4 decoration-2">Effacer les filtres</button>
                   </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        {totalPages > 1 && (
          <div className="px-10 py-6 bg-[#f8f9fa] border-t border-[#dadce0] flex items-center justify-between">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Affichage de {paginatedTickets.length} sur {allFilteredTickets.length} dossiers</p>
            <div className="flex items-center gap-2">
               <button 
                disabled={currentPage === 1} 
                onClick={() => setCurrentPage(p => p - 1)}
                className="p-2 border bg-white disabled:opacity-30 hover:bg-gray-50 transition-all"
                title="Page précédente"
               >
                 <ChevronLeft size={20} />
               </button>
               <div className="px-4 font-black text-xs">{currentPage} / {totalPages}</div>
               <button 
                disabled={currentPage === totalPages} 
                onClick={() => setCurrentPage(p => p + 1)}
                className="p-2 border bg-white disabled:opacity-30 hover:bg-gray-50 transition-all"
                title="Page suivante"
               >
                 <ChevronRight size={20} />
               </button>
            </div>
          </div>
        )}
      </div>

      {/* DETAIL DRAWER - ENHANCED */}
      <Drawer
        isOpen={!!selectedTicket}
        onClose={() => setSelectedTicket(null)}
        title="Commandement Technique SAV"
        subtitle={`Ticket #${selectedTicket?.id} • Showroom ${selectedTicket?.showroom}`}
        icon={<TicketIcon size={20} />}
        footer={
          <div className="flex gap-3">
             <button className="flex-1 btn-google-primary justify-center py-4 text-xs font-black uppercase tracking-widest shadow-xl shadow-blue-600/10">
                <Edit3 size={18} /> Modifier le Dossier
             </button>
             <button 
               onClick={() => { if(selectedTicket && window.confirm('Marquer ce dossier comme résolu et certifié ?')) { /* Logic */ setSelectedTicket(null); } }}
               className="p-4 bg-green-50 text-green-700 border border-green-100 rounded-none hover:bg-green-600 hover:text-white transition-all shadow-sm"
               title="Certifier la résolution"
             >
                <CheckCircle2 size={20} />
             </button>
          </div>
        }
      >
        {selectedTicket && (
          <div className="space-y-12 pb-20">
             {/* HEADER INFO TECH */}
             <div className="flex flex-col md:flex-row gap-8 items-start">
                <div className={`p-8 bg-gradient-to-br from-white to-[#f8f9fa] border border-[#dadce0] rounded-none shadow-sm flex-1 text-center`}>
                   <div className={`w-16 h-16 rounded-none flex items-center justify-center mx-auto mb-4 shadow-xl ${getPriorityColor(selectedTicket.priority)} text-white`}>
                      <ShieldAlert size={32} />
                   </div>
                   <h3 className="text-xl font-black text-[#202124] tracking-tight">{selectedTicket.productName}</h3>
                   <p className="text-[9px] font-black text-[#1a73e8] uppercase tracking-[0.2em] mt-1">{selectedTicket.brand} • S/N {selectedTicket.serialNumber || 'Non Saisie'}</p>
                   
                   <div className="mt-6 pt-6 border-t border-gray-100 grid grid-cols-2 gap-4">
                      <div>
                         <p className="text-[8px] font-black text-gray-400 uppercase mb-1">Impact Client</p>
                         <span className={`px-2 py-0.5 text-[9px] font-black uppercase border ${
                            selectedTicket.clientImpact === 'Critique' ? 'bg-red-50 text-red-700 border-red-200' : 
                            selectedTicket.clientImpact === 'Modéré' ? 'bg-orange-50 text-orange-700 border-orange-200' : 
                            'bg-blue-50 text-blue-700 border-blue-200'
                         }`}>
                           {selectedTicket.clientImpact || 'Faible'}
                         </span>
                      </div>
                      <div>
                         <p className="text-[8px] font-black text-gray-400 uppercase mb-1">Délai SLA</p>
                         <span className="text-[10px] font-bold text-[#3c4043]">{selectedTicket.status === 'Nouveau' ? 'J+0' : 'En cours'}</span>
                      </div>
                   </div>
                </div>

                <div className="w-full md:w-72 p-6 bg-white border border-[#dadce0] space-y-4">
                   <h4 className="text-[9px] font-black text-[#9aa0a6] uppercase tracking-widest flex items-center gap-2"><User size={14} /> Expert Assigné</h4>
                   {selectedTicket.assignedTechnicianId ? (
                      <div className="flex items-center gap-4">
                         <img src={technicians.find(t => t.id === selectedTicket.assignedTechnicianId)?.avatar} className="w-12 h-12 rounded-none border p-0.5 bg-white shadow-sm" alt="" />
                         <div>
                            <p className="text-sm font-black text-[#202124] leading-none">{technicians.find(t => t.id === selectedTicket.assignedTechnicianId)?.name}</p>
                            <p className="text-[9px] text-[#1a73e8] font-bold uppercase mt-1">Technicien Élite</p>
                         </div>
                      </div>
                   ) : (
                      <button className="w-full py-3 bg-blue-50 text-[#1a73e8] text-[9px] font-black uppercase tracking-widest hover:bg-[#1a73e8] hover:text-white transition-all border border-blue-100 flex items-center justify-center gap-2">
                         <UserPlus size={14}/> Assigner un expert
                      </button>
                   )}
                   <div className="pt-4 border-t border-gray-100">
                      <p className="text-[8px] font-black text-gray-400 uppercase mb-2">Canal d'ouverture</p>
                      <div className="flex items-center gap-2">
                         <span className="p-1.5 bg-gray-50 text-gray-600 border"><MessageSquare size={12}/></span>
                         <span className="text-[10px] font-black text-[#3c4043] uppercase tracking-tighter">{selectedTicket.source}</span>
                      </div>
                   </div>
                </div>
             </div>

             {/* CLIENT & DESCRIPTION */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <section className="space-y-4">
                   <h4 className="text-[10px] font-black text-[#9aa0a6] uppercase tracking-[0.2em] flex items-center gap-2"><Briefcase size={16} /> Titulaire du Contrat</h4>
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
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Contact Urgent</p>
                            <p className="text-base font-black text-[#3c4043] font-mono tracking-tighter">{selectedTicket.customerPhone}</p>
                         </div>
                      </div>
                      <div className="h-px bg-gray-100" />
                      <div className="flex items-center gap-6">
                         <div className="w-12 h-12 bg-[#f8f9fa] border flex items-center justify-center text-[#1a73e8] shadow-inner"><MapPin size={20}/></div>
                         <div>
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Localisation Site</p>
                            <p className="text-xs font-bold text-[#5f6368] uppercase leading-tight">{selectedTicket.location || selectedTicket.showroom}</p>
                         </div>
                      </div>
                   </div>
                </section>

                <section className="space-y-4">
                   <h4 className="text-[10px] font-black text-[#9aa0a6] uppercase tracking-[0.2em] flex items-center gap-2"><FileText size={16} /> Diagnostic Client & Sinistre</h4>
                   <div className="p-8 bg-[#fffcf5] border border-[#ffe082] shadow-sm italic text-sm text-gray-700 leading-relaxed font-medium relative h-full">
                      <div className="absolute top-4 right-4 text-amber-300 opacity-30"><Play size={40} fill="currentColor"/></div>
                      "{selectedTicket.description}"
                      {selectedTicket.purchaseDate && (
                         <div className="mt-10 pt-6 border-t border-amber-100 flex justify-between items-center not-italic">
                            <div>
                               <p className="text-[8px] font-black text-amber-600 uppercase tracking-widest mb-1">Date d'Acquisition</p>
                               <p className="text-xs font-bold text-[#3c4043]">{new Date(selectedTicket.purchaseDate).toLocaleDateString()}</p>
                            </div>
                            <div className="text-right">
                               <p className="text-[8px] font-black text-amber-600 uppercase tracking-widest mb-1">Protection</p>
                               <span className="px-2 py-0.5 bg-green-50 text-green-700 text-[9px] font-black uppercase border border-green-100">Garantie Plaza Care</span>
                            </div>
                         </div>
                      )}
                   </div>
                </section>
             </div>

             {/* FINANCIALS - ONLY IF SAV */}
             {selectedTicket.financials && (
               <section className="space-y-4">
                  <h4 className="text-[10px] font-black text-[#9aa0a6] uppercase tracking-[0.2em] flex items-center gap-2"><DollarSign size={16} /> Expertise Financière Horizon</h4>
                  <div className="p-10 bg-white border border-[#dadce0] shadow-sm relative overflow-hidden">
                     <div className="absolute top-0 right-0 w-32 h-32 bg-gray-50 rotate-45 translate-x-16 -translate-y-16" />
                     <div className="grid grid-cols-1 md:grid-cols-4 gap-10 relative z-10">
                        <div>
                           <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Composants & Pièces</p>
                           <p className="text-xl font-black text-[#3c4043]">{selectedTicket.financials.partsTotal.toLocaleString()} <span className="text-[10px]">F</span></p>
                        </div>
                        <div>
                           <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Main d'œuvre Expert</p>
                           <p className="text-xl font-black text-[#3c4043]">{selectedTicket.financials.laborTotal.toLocaleString()} <span className="text-[10px]">F</span></p>
                        </div>
                        <div>
                           <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Logistique & Dépl.</p>
                           <p className="text-xl font-black text-[#3c4043]">{selectedTicket.financials.travelFee.toLocaleString()} <span className="text-[10px]">F</span></p>
                        </div>
                        <div className="p-4 bg-blue-50 border border-blue-100">
                           <p className="text-[9px] font-black text-[#1a73e8] uppercase tracking-widest mb-2">Total Intervention HT</p>
                           <p className="text-2xl font-black text-[#1a73e8] tracking-tighter">{selectedTicket.financials.grandTotal.toLocaleString()} <span className="text-xs">F</span></p>
                           <div className="flex items-center gap-2 mt-3 pt-3 border-t border-blue-100">
                              <PaymentIcon size={12} className={selectedTicket.financials.isPaid ? 'text-green-600' : 'text-red-500'} />
                              <span className={`text-[9px] font-black uppercase ${selectedTicket.financials.isPaid ? 'text-green-600' : 'text-red-500'}`}>
                                 {selectedTicket.financials.isPaid ? 'Règlement Certifié' : 'En attente Paiement'}
                              </span>
                           </div>
                        </div>
                     </div>
                  </div>
               </section>
             )}

             {/* INTERVENTION REPORT */}
             <section className="space-y-4">
                <h4 className="text-[10px] font-black text-[#9aa0a6] uppercase tracking-[0.2em] flex items-center gap-2"><Wrench size={16} /> Rapport d'Intervention Expert</h4>
                {selectedTicket.interventionReport?.actionsTaken?.length ? (
                   <div className="p-8 bg-[#f8faff] border border-[#d2e3fc] space-y-8 shadow-sm">
                      <div className="flex items-center justify-between">
                         <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse" />
                            <p className="text-[10px] font-black text-blue-700 uppercase tracking-[0.3em]">Actions Certifiées Cloud</p>
                         </div>
                         <div className="text-right">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Condition Finale</p>
                            <span className="text-sm font-black text-[#202124] uppercase">{selectedTicket.interventionReport.equipmentStatus || 'Vérifié'}</span>
                         </div>
                      </div>
                      <div className="space-y-4">
                         {selectedTicket.interventionReport.actionsTaken.map((action, idx) => (
                            <div key={idx} className="flex gap-4 items-start group">
                               <div className="w-8 h-8 bg-white border border-[#dadce0] flex items-center justify-center shrink-0 text-[#1a73e8] shadow-sm"><CheckCircle2 size={16}/></div>
                               <div className="flex-1 pt-1.5 border-b border-gray-100 pb-4 group-last:border-none">
                                  <p className="text-xs font-bold text-[#3c4043] uppercase tracking-tighter leading-relaxed">{action}</p>
                               </div>
                            </div>
                         ))}
                      </div>

                      {selectedTicket.interventionReport.partsUsed?.length ? (
                         <div className="mt-10 p-6 bg-white border border-[#dadce0]">
                            <h5 className="text-[9px] font-black text-[#5f6368] uppercase tracking-widest mb-4 flex items-center gap-2"><Package size={14}/> Pièces Extraites de l'Inventaire</h5>
                            <div className="space-y-3">
                               {selectedTicket.interventionReport.partsUsed.map((part, pidx) => (
                                  <div key={pidx} className="flex justify-between items-center text-xs font-bold p-3 bg-gray-50 border-l-4 border-[#1a73e8]">
                                     <span className="text-[#3c4043]">{part.name}</span>
                                     <span className="text-[#1a73e8] uppercase font-black tracking-widest">Qty: {part.quantity} • {(part.unitPrice * part.quantity).toLocaleString()} F</span>
                                  </div>
                               ))}
                            </div>
                         </div>
                      ) : null}
                   </div>
                ) : (
                   <div className="py-20 text-center border-2 border-dashed border-[#dadce0] bg-gray-50/50">
                      <Clock size={40} className="mx-auto text-gray-200 mb-4 opacity-50" />
                      <p className="text-[10px] font-black text-[#9aa0a6] uppercase tracking-widest">Aucune donnée technique transmise</p>
                      <p className="text-[9px] text-gray-400 mt-2 font-medium">L'expert n'a pas encore validé son rapport terrain.</p>
                   </div>
                )}
             </section>
          </div>
        )}
      </Drawer>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Émission Dossier SAV Cloud" size="xl">
        <form onSubmit={handleSave} className="space-y-10">
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
              <div className="space-y-6">
                 <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#5f6368] border-b border-[#f1f3f4] pb-3 flex items-center gap-2"><User size={14}/> Profil Client</h3>
                 <div className="space-y-4">
                    <div className="space-y-1.5">
                       <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Identité Complète</label>
                       <input name="customerName" type="text" defaultValue={editingTicket?.customerName} required className="w-full h-11 bg-[#f8f9fa] border-none font-bold" placeholder="ex: Jean Mba" />
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Ligne Mobile</label>
                       <input name="customerPhone" type="tel" defaultValue={editingTicket?.customerPhone} required className="w-full h-11 bg-[#f8f9fa] border-none font-black font-mono" placeholder="+241 ..." />
                    </div>
                 </div>
              </div>
              <div className="space-y-6">
                 <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#5f6368] border-b border-[#f1f3f4] pb-3 flex items-center gap-2"><Package size={14}/> Matériel SAV</h3>
                 <div className="space-y-4">
                    <div className="space-y-1.5">
                       <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Désignation Produit</label>
                       <input name="productName" type="text" defaultValue={editingTicket?.productName} required className="w-full h-11 bg-[#f8f9fa] border-none font-bold" placeholder="ex: Split LG Dual Inverter" />
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-[9px] font-black text-gray-400 uppercase ml-1">N° de Série (S/N)</label>
                       <input name="serialNumber" type="text" defaultValue={editingTicket?.serialNumber} className="w-full h-11 bg-[#f8f9fa] border-none font-mono font-black" placeholder="ex: SN-LG-..." />
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
              <textarea name="description" required defaultValue={editingTicket?.description} className="w-full h-32 text-sm p-5 bg-[#f8f9fa] border-none font-medium focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all shadow-inner" placeholder="Décrire avec précision les symptômes signalés par le bénéficiaire..." />
           </div>
           
           <div className="p-6 bg-blue-50 border border-dashed border-blue-200 flex items-start gap-4 shadow-sm">
              <ShieldCheck size={24} className="text-[#1a73e8] mt-1 shrink-0" />
              <div>
                 <p className="text-xs font-black text-blue-800 uppercase tracking-widest">Certification Cloud Horizon</p>
                 <p className="text-[10px] text-blue-600 mt-2 leading-relaxed uppercase font-medium">
                   Ce dossier sera immédiatement notifié à l'expert assigné et archivé dans le flux décisionnel stratégique. Assurez-vous de la validité des coordonnées clients pour le suivi SLA.
                 </p>
              </div>
           </div>

           <div className="flex gap-4 pt-8 border-t border-[#dadce0]">
              <button type="submit" className="btn-google-primary flex-1 justify-center py-5 text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-blue-600/20">
                 <Save size={20} /> Valider le dossier
              </button>
              <button type="button" onClick={() => setIsModalOpen(false)} className="btn-google-outlined px-12 font-black uppercase text-[10px] tracking-widest">Annuler</button>
           </div>
        </form>
      </Modal>
    </div>
  );
};

export default Tickets;
