
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
  Timer, BarChart3, RotateCcw, Boxes, Shapes, CalendarDays, Sliders, ChevronDown, ChevronUp
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
      if (currentUser?.role === 'TECHNICIAN' && t.assignedTechnicianId !== currentUser.id) return false;
      
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
      addNotification({ title: 'Horizon Sync', message: 'Dossier enregistre.', type: 'success' });
    } catch (err: any) {
      addNotification({ title: 'Erreur', message: 'Echec de la sauvegarde.', type: 'error' });
    }
  };

  return (
    <div className="space-y-8 animate-page-entry pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-light text-[#202124]">Tickets & SAV</h1>
          <p className="text-[10px] text-[#5f6368] font-black uppercase tracking-widest mt-1">Management Royal Plaza</p>
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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'SAV Actif', value: stats.total, color: '#1a73e8', icon: <Activity size={20}/> },
          { label: 'Urgent SLA', value: stats.urgent, color: '#d93025', icon: <Zap size={20}/> },
          { label: 'Nouveaux', value: stats.new, color: '#1a73e8', icon: <BellRing size={20}/> },
          { label: 'Resolus', value: stats.closed, color: '#188038', icon: <CheckCircle2 size={20}/> }
        ].map((s, i) => (
          <div key={i} className="stats-card border-l-4" style={{ borderLeftColor: s.color }}>
             <div className="flex justify-between items-start">
               <div>
                 <p className="text-[10px] font-black text-[#5f6368] uppercase tracking-[0.15em] mb-1">{s.label}</p>
                 <h3 className="text-3xl font-bold text-[#202124] tracking-tighter">{s.value}</h3>
               </div>
               <div className="p-2 bg-gray-50 text-gray-400 transition-colors">{s.icon}</div>
             </div>
          </div>
        ))}
      </div>

      <div className="google-card overflow-hidden border-none shadow-lg">
        <div className="p-8 space-y-6 bg-white">
           <div className="flex flex-col xl:flex-row gap-6">
              <div className="relative flex-1 group">
                 <Search className="absolute left-5 top-4 text-[#9aa0a6] group-focus-within:text-[#1a73e8] transition-colors" size={24} />
                 <input 
                  type="text" 
                  placeholder="Rechercher par client, ticket ID..." 
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
                      { id: 'Tous', label: 'Tout' },
                      { id: 'Nouveau', label: 'Nouveaux' },
                      { id: 'En cours', label: 'En cours' }
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

                 <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                      className={`p-4 border-2 transition-all group flex items-center gap-2 ${showAdvancedFilters ? 'bg-blue-50 border-blue-200 text-[#1a73e8]' : 'bg-white border-[#f1f3f4] text-[#5f6368] hover:border-gray-300'}`}
                    >
                      <SlidersHorizontal size={22} />
                      <span className="text-[10px] font-black uppercase tracking-widest hidden md:inline">{showAdvancedFilters ? 'Masquer' : 'Filtres'}</span>
                      {showAdvancedFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>

                    <div className="h-14 min-w-[180px] p-3 bg-blue-50 border border-blue-100 flex items-center justify-between shadow-inner relative overflow-hidden group">
                      <div className="shrink-0">
                         <div className="flex items-center gap-2">
                            <div className="w-1 h-1 bg-blue-500 rounded-full animate-pulse" />
                            <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest">Horizon</span>
                         </div>
                         <p className="text-sm font-black text-blue-700 leading-none mt-1">{allFilteredTickets.length} <span className="text-[10px]">Dossiers</span></p>
                      </div>
                      <div className="p-2 bg-white text-blue-600 shadow-sm"><LayoutGrid size={18}/></div>
                    </div>
                 </div>
                 
                 {hasActiveFilters && (
                    <button 
                      onClick={resetFilters} 
                      className="p-4 text-[#d93025] hover:bg-red-50 border-2 border-transparent transition-all group"
                    >
                       <RotateCcw size={22} className="group-hover:rotate-[-180deg] transition-transform duration-500" />
                    </button>
                 )}
              </div>
           </div>

           {showAdvancedFilters && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-6 border-t border-[#f1f3f4] animate-in slide-in-from-top-2 duration-300">
                <div className="space-y-1.5">
                   <label className="text-[9px] font-black text-[#9aa0a6] uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                     <SlidersHorizontal size={12} /> Priorite
                   </label>
                   <select 
                      value={priorityFilter} 
                      onChange={e => setPriorityFilter(e.target.value)}
                      className="w-full h-12 bg-[#f8f9fa] border-none text-[11px] font-black uppercase tracking-widest focus:ring-2 focus:ring-[#1a73e8] cursor-pointer"
                   >
                      <option value="Toutes">Toutes Priorites</option>
                      <option value="Urgent">Urgent</option>
                      <option value="Haute">Haute</option>
                      <option value="Moyenne">Moyenne</option>
                   </select>
                </div>

                <div className="space-y-1.5">
                   <label className="text-[9px] font-black text-[#9aa0a6] uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                     <MapPinned size={12} /> Showroom
                   </label>
                   <select 
                      value={showroomFilter} 
                      onChange={e => setShowroomFilter(e.target.value)}
                      className="w-full h-12 bg-[#f8f9fa] border-none text-[11px] font-black uppercase tracking-widest focus:ring-2 focus:ring-[#1a73e8] cursor-pointer"
                   >
                      <option value="Tous">Tous</option>
                      {showrooms.map(s => <option key={s.id} value={s.id}>{s.id}</option>)}
                   </select>
                </div>

                <div className="space-y-1.5">
                   <label className="text-[9px] font-black text-[#9aa0a6] uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                     <Shapes size={12} /> Categorie
                   </label>
                   <select 
                      value={categoryFilter} 
                      onChange={e => setCategoryFilter(e.target.value)}
                      className="w-full h-12 bg-[#f8f9fa] border-none text-[11px] font-black uppercase tracking-widest focus:ring-2 focus:ring-[#1a73e8] cursor-pointer"
                   >
                      <option value="Toutes">Toutes les Categories</option>
                      <option value="SAV">SAV</option>
                      <option value="Installation">Installation</option>
                      <option value="Maintenance">Maintenance</option>
                   </select>
                </div>
              </div>
           )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white border-b border-[#dadce0] text-[9px] font-black text-[#5f6368] uppercase tracking-[0.2em]">
                <th className="px-8 py-5">ID & Canal</th>
                <th className="px-8 py-5">Client</th>
                <th className="px-8 py-5">Materiel</th>
                <th className="px-8 py-5 text-center">Priorite</th>
                <th className="px-8 py-5 text-right">Statut</th>
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
                       <span className="px-2 py-0.5 bg-gray-100 text-[8px] font-black text-gray-500 uppercase tracking-tighter">{t.source}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <p className="text-sm font-bold text-[#3c4043] group-hover:text-[#1a73e8] transition-colors">{t.customerName}</p>
                    <p className="text-[10px] text-[#5f6368] font-mono">{t.customerPhone}</p>
                  </td>
                  <td className="px-8 py-5">
                    <p className="text-xs font-bold text-[#3c4043]">{t.productName}</p>
                    <span className="text-[9px] font-black text-[#1a73e8] uppercase">{t.brand}</span>
                  </td>
                  <td className="px-8 py-5">
                     <div className="flex items-center justify-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${getPriorityColor(t.priority)}`} />
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
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Formulaire SAV" size="xl">
        <form onSubmit={handleSave} className="space-y-10">
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
              <div className="space-y-6">
                 <h3 className="text-[11px] font-black uppercase tracking-widest text-[#202124] border-b pb-2">Client</h3>
                 <div className="space-y-4">
                    <input name="customerName" type="text" defaultValue={editingTicket?.customerName} required className="w-full h-11" placeholder="Nom" />
                    <input name="customerPhone" type="tel" defaultValue={editingTicket?.customerPhone} required className="w-full h-11" placeholder="Mobile" />
                 </div>
              </div>
              <div className="space-y-6">
                 <h3 className="text-[11px] font-black uppercase tracking-widest text-[#202124] border-b pb-2">Materiel</h3>
                 <div className="space-y-4">
                    <input name="productName" type="text" defaultValue={editingTicket?.productName} required className="w-full h-11" placeholder="Modele" />
                    <input name="serialNumber" type="text" defaultValue={editingTicket?.serialNumber} className="w-full h-11 font-mono" placeholder="S/N" />
                 </div>
              </div>
              <div className="space-y-6">
                 <h3 className="text-[11px] font-black uppercase tracking-widest text-[#202124] border-b pb-2">Assignation</h3>
                 <div className="space-y-4">
                    <select name="showroom" defaultValue={editingTicket?.showroom || 'Glass'} className="w-full h-11">
                       {showrooms.map(s => <option key={s.id} value={s.id}>{s.id}</option>)}
                    </select>
                    <select name="assignedTechnicianId" defaultValue={editingTicket?.assignedTechnicianId || ''} className="w-full h-11 text-[#1a73e8]">
                       <option value="">Auto-Assignation</option>
                       {technicians.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                 </div>
              </div>
           </div>
           <div className="space-y-3 pt-6 border-t">
              <textarea name="description" required defaultValue={editingTicket?.description} className="w-full h-32 text-sm p-4" placeholder="Description de la panne..." />
           </div>
           <div className="flex gap-4 pt-8 border-t">
              <button type="submit" className="btn-google-primary flex-1 justify-center py-5 text-xs font-black uppercase shadow-xl">
                 <Save size={20} /> Valider
              </button>
              <button type="button" onClick={() => setIsModalOpen(false)} className="btn-google-outlined px-12 uppercase text-[10px]">Annuler</button>
           </div>
        </form>
      </Modal>
    </div>
  );
};

export default Tickets;
