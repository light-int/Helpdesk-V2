
import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Plus, Search, RefreshCw, Filter, MoreHorizontal, 
  // Ticket as TicketIcon used here to avoid conflict with Ticket interface
  Sparkles, User, Clock, CheckCircle2, Ticket as TicketIcon,
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
          <p className="text-[10px] text-[#5f6368] font-black uppercase tracking-widest mt-1">Management Central Royal Plaza Horizon</p>
        </div>
        <div className="flex gap-3">
          <button onClick={refreshAll} className="btn-google-outlined h-11 px-4" title="Actualiser le flux des dossiers SAV"><RefreshCw size={18} className={isSyncing ? 'animate-spin' : ''} /></button>
          {canCreateTicket && (
            <button onClick={() => { setEditingTicket(null); setIsModalOpen(true); }} className="btn-google-primary h-11 px-6 shadow-xl shadow-blue-600/10" title="Émettre un nouveau dossier SAV">
              <Plus size={20} /> <span>Nouveau Dossier</span>
            </button>
          )}
        </div>
      </header>

      {/* KPI GRID */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Flux SAV Actif', value: stats.total, color: '#1a73e8', icon: <Activity size={20}/>, title: "Nombre total de dossiers non archivés" },
          { label: 'Urgences SLA', value: stats.urgent, color: '#d93025', icon: <Zap size={20}/>, title: "Dossiers critiques nécessitant une action immédiate" },
          { label: 'En Attente', value: stats.new, color: '#f9ab00', icon: <BellRing size={20}/>, title: "Nouveaux dossiers non assignés" },
          { label: 'Clôtures Hebdo', value: stats.closed, color: '#188038', icon: <CheckCircle2 size={20}/>, title: "Volume de dossiers résolus sur la période" }
        ].map((s, i) => (
          <div key={i} className="stats-card border-l-4" style={{ borderLeftColor: s.color }} title={s.title}>
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
              <div className="relative flex-1 group" title="Recherche par client, identifiant ou numéro de série">
                 <Search className="absolute left-6 top-5 text-[#9aa0a6] group-focus-within:text-[#1a73e8] transition-colors" size={24} />
                 <input 
                  type="text" 
                  placeholder="Rechercher par client, ticket ID, S/N..." 
                  className="w-full pl-16 h-16 bg-[#f8f9fa] border-none text-base font-bold shadow-inner transition-all focus:bg-white focus:ring-2 focus:ring-blue-100"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                 />
                 {searchTerm && (
                   <button onClick={() => setSearchTerm('')} className="absolute right-6 top-5 p-1 text-gray-400 hover:text-red-500" title="Effacer le filtre">
                     <X size={22} />
                   </button>
                 )}
              </div>

              <div className="flex flex-wrap items-center gap-4">
                 <div className="flex items-center bg-[#f1f3f4] p-1.5 shadow-inner">
                    {[
                      { id: 'Tous', icon: <ListFilter size={20} />, label: 'Tous les tickets' },
                      { id: 'Nouveau', icon: <BellRing size={20} />, label: 'Dossiers Nouveaux' },
                      { id: 'En cours', icon: <Clock size={20} />, label: 'Interventions en cours' }
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
                      title={showAdvancedFilters ? "Masquer les options stratégiques" : "Afficher les filtres par showroom et priorité"}
                      className={`p-4.5 border-2 transition-all ${showAdvancedFilters ? 'bg-[#202124] border-[#202124] text-white shadow-lg' : 'bg-white border-[#dadce0] text-[#5f6368] hover:border-[#1a73e8]'}`}
                    >
                      <Sliders size={22} />
                    </button>

                    <div className="h-16 min-w-[180px] p-4 bg-white border border-blue-100 flex items-center justify-between shadow-sm relative overflow-hidden group" title="Dossiers correspondants aux critères">
                      <div className="absolute top-0 right-0 w-1 h-full bg-[#1a73e8]" />
                      <div className="shrink-0 mr-4">
                         <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                            <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest">Base de Données</span>
                         </div>
                         <p className="text-lg font-black text-[#202124] leading-none mt-1">{allFilteredTickets.length} <span className="text-[10px] text-gray-400 font-bold">FICHES</span></p>
                      </div>
                      <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl"><LayoutGrid size={18}/></div>
                    </div>
                 </div>
                 
                 {(searchTerm || statusFilter !== 'Tous' || priorityFilter !== 'Toutes' || showroomFilter !== 'Tous' || categoryFilter !== 'Toutes') && (
                    <button onClick={resetFilters} className="p-5 text-[#d93025] hover:bg-red-50 border-2 border-transparent transition-all group" title="Réinitialiser l'ensemble des filtres">
                       <RotateCcw size={24} className="group-hover:rotate-[-180deg] transition-transform duration-700" />
                    </button>
                 )}
              </div>
           </div>

           {showAdvancedFilters && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8 border-t border-[#f1f3f4] animate-in slide-in-from-top-4 duration-500">
                <div className="space-y-2">
                   <label className="text-[9px] font-black text-[#9aa0a6] uppercase tracking-[0.2em] ml-1 flex items-center gap-2" title="Source géographique de la demande"><MapPin size={12} /> Showroom émetteur</label>
                   <select 
                      value={showroomFilter} 
                      onChange={e => setShowroomFilter(e.target.value)}
                      className="w-full h-12 bg-[#f8f9fa] border-none text-[11px] font-black uppercase tracking-widest focus:ring-2 focus:ring-[#1a73e8] px-5"
                      title="Choisir un point de vente spécifique"
                   >
                      <option value="Tous">Tous les showrooms</option>
                      {showrooms.map(s => <option key={s.id} value={s.id}>{s.id}</option>)}
                   </select>
                </div>

                <div className="space-y-2">
                   <label className="text-[9px] font-black text-[#9aa0a6] uppercase tracking-[0.2em] ml-1 flex items-center gap-2" title="Niveau critique pour le respect du contrat de service"><Zap size={12} /> Niveau d'urgence</label>
                   <select 
                      value={priorityFilter} 
                      onChange={e => setPriorityFilter(e.target.value)}
                      className="w-full h-12 bg-[#f8f9fa] border-none text-[11px] font-black uppercase tracking-widest focus:ring-2 focus:ring-[#1a73e8] px-5"
                      title="Filtrer par degré d'urgence"
                   >
                      <option value="Toutes">Toutes priorités</option>
                      <option value="Urgent">Urgent SLA</option>
                      <option value="Haute">Haute</option>
                      <option value="Moyenne">Moyenne</option>
                   </select>
                </div>

                <div className="space-y-2">
                   <label className="text-[9px] font-black text-[#9aa0a6] uppercase tracking-[0.2em] ml-1 flex items-center gap-2" title="Type d'intervention nécessaire"><Tag size={12} /> Catégorie technique</label>
                   <select 
                      value={categoryFilter} 
                      onChange={e => setCategoryFilter(e.target.value)}
                      className="w-full h-12 bg-[#f8f9fa] border-none text-[11px] font-black uppercase tracking-widest focus:ring-2 focus:ring-[#1a73e8] px-5"
                      title="Filtrer par type de service"
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
                  title={`Consulter le dossier technique #${t.id}`}
                >
                  <td className="px-10 py-6">
                    <div className="flex items-center gap-3">
                       <span className="text-sm font-black text-[#1a73e8]">#{t.id}</span>
                       <span className="px-2 py-0.5 bg-gray-100 text-[8px] font-black text-gray-500 uppercase tracking-tighter border border-gray-200" title={`Demande reçue via ${t.source}`}>{t.source}</span>
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
                    <span className={`px-4 py-1.5 border text-[9px] font-black uppercase tracking-widest shadow-sm ${getStatusColor(t.status)}`} title={`État actuel du workflow: ${t.status}`}>
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

      {/* DETAIL DRAWER */}
      <Drawer
        isOpen={!!selectedTicket}
        onClose={() => setSelectedTicket(null)}
        title="Dossier Technique Expert"
        subtitle={`Ticket ID: ${selectedTicket?.id} • Showroom ${selectedTicket?.showroom}`}
        icon={<TicketIcon size={20} />}
        footer={
          <div className="flex gap-3">
             <button className="flex-1 btn-google-primary justify-center py-4 text-xs font-black uppercase tracking-widest shadow-xl shadow-blue-600/10" title="Consulter ou remplir les rapports de maintenance">
                <Wrench size={18} /> Rapports d'intervention
             </button>
             <button 
               onClick={() => { if(selectedTicket && window.confirm('Dossier résolu et certifié ?')) { /* Logic */ setSelectedTicket(null); } }}
               className="p-4 bg-green-50 text-green-700 border border-green-100 rounded-none hover:bg-green-600 hover:text-white transition-all shadow-sm"
               title="Marquer le dossier comme certifié et résolu"
             >
                <CheckCircle2 size={20} />
             </button>
          </div>
        }
      >
        {selectedTicket && (
          <div className="space-y-10">
             <div className="p-8 bg-gradient-to-br from-white to-[#f8f9fa] border border-[#dadce0] rounded-none shadow-sm flex flex-col items-center text-center" title="Identité visuelle du matériel sinistré">
                <div className={`w-20 h-20 rounded-none flex items-center justify-center mb-6 shadow-xl ${getPriorityColor(selectedTicket.priority)} text-white`}>
                   <ShieldAlert size={40} />
                </div>
                <h3 className="text-2xl font-black text-[#202124] tracking-tight">{selectedTicket.productName}</h3>
                <p className="text-[10px] font-black text-[#1a73e8] uppercase tracking-[0.2em] mt-2">{selectedTicket.brand} • S/N {selectedTicket.serialNumber || 'Non Saisie'}</p>
                <div className="mt-8 flex items-center gap-10">
                   <div className="text-center">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Ouverture</p>
                      <p className="text-sm font-bold text-[#3c4043]">{new Date(selectedTicket.createdAt).toLocaleDateString()}</p>
                   </div>
                   <div className="h-8 w-px bg-gray-200" />
                   <div className="text-center">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Source Flux</p>
                      <p className="text-sm font-black text-[#1a73e8] uppercase">{selectedTicket.source}</p>
                   </div>
                </div>
             </div>

             <section className="space-y-4">
                <h4 className="text-[10px] font-black text-[#9aa0a6] uppercase tracking-[0.2em] flex items-center gap-2"><User size={16} /> Informations Titulaire</h4>
                <div className="p-8 bg-white border border-[#dadce0] space-y-6 shadow-sm">
                   <div className="flex items-center gap-6" title="Nom complet du client enregistré">
                      <div className="w-14 h-14 bg-[#f8f9fa] border flex items-center justify-center text-[#1a73e8]"><User size={24}/></div>
                      <div>
                         <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nom du Client</p>
                         <p className="text-lg font-black text-[#3c4043]">{selectedTicket.customerName}</p>
                      </div>
                   </div>
                   <div className="h-px bg-gray-100" />
                   <div className="flex items-center gap-6" title="Ligne directe mobile">
                      <div className="w-14 h-14 bg-[#f8f9fa] border flex items-center justify-center text-[#1a73e8]"><Smartphone size={24}/></div>
                      <div>
                         <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Mobile Direct</p>
                         <p className="text-lg font-black text-[#3c4043] font-mono">{selectedTicket.customerPhone}</p>
                      </div>
                   </div>
                </div>
             </section>

             <section className="space-y-4">
                <h4 className="text-[10px] font-black text-[#9aa0a6] uppercase tracking-[0.2em] flex items-center gap-2"><FileText size={16} /> Description du Sinistre</h4>
                <div className="p-8 bg-[#fffcf5] border border-[#ffe082] shadow-sm italic text-sm text-gray-700 leading-relaxed font-medium" title="Symptômes et descriptif fournis par le client">
                   "{selectedTicket.description}"
                </div>
             </section>

             <section className="space-y-4">
                <h4 className="text-[10px] font-black text-[#9aa0a6] uppercase tracking-[0.2em] flex items-center gap-2"><History size={16} /> Chronologie des Actions</h4>
                <div className="py-12 text-center border-2 border-dashed border-[#dadce0] bg-gray-50/50">
                   <Clock size={40} className="mx-auto text-gray-200 mb-4 opacity-50" />
                   <p className="text-[10px] font-black text-[#9aa0a6] uppercase tracking-widest">Aucun rapport expert documenté</p>
                </div>
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
                       <input name="customerName" type="text" defaultValue={editingTicket?.customerName} required className="w-full h-11 bg-[#f8f9fa] border-none font-bold" placeholder="ex: Jean Mba" title="Nom et prénom du client" />
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Ligne Mobile</label>
                       <input name="customerPhone" type="tel" defaultValue={editingTicket?.customerPhone} required className="w-full h-11 bg-[#f8f9fa] border-none font-black font-mono" placeholder="+241 ..." title="Numéro de téléphone actif" />
                    </div>
                 </div>
              </div>
              <div className="space-y-6">
                 <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#5f6368] border-b border-[#f1f3f4] pb-3 flex items-center gap-2"><Package size={14}/> Matériel SAV</h3>
                 <div className="space-y-4">
                    <div className="space-y-1.5">
                       <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Désignation Produit</label>
                       <input name="productName" type="text" defaultValue={editingTicket?.productName} required className="w-full h-11 bg-[#f8f9fa] border-none font-bold" placeholder="ex: Split LG Dual Inverter" title="Nom commercial de l'article" />
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-[9px] font-black text-gray-400 uppercase ml-1">N° de Série (S/N)</label>
                       <input name="serialNumber" type="text" defaultValue={editingTicket?.serialNumber} className="w-full h-11 bg-[#f8f9fa] border-none font-mono font-black" placeholder="ex: SN-LG-..." title="Le numéro de série unique présent sur l'étiquette du produit" />
                    </div>
                 </div>
              </div>
              <div className="space-y-6">
                 <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#5f6368] border-b border-[#f1f3f4] pb-3 flex items-center gap-2"><Settings size={14}/> Configuration</h3>
                 <div className="space-y-4">
                    <div className="space-y-1.5">
                       <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Showroom Émetteur</label>
                       <select name="showroom" defaultValue={editingTicket?.showroom || 'Glass'} className="w-full h-11 bg-[#f8f9fa] border-none font-black text-[10px] uppercase" title="Point de vente traitant la demande">
                          {showrooms.map(s => <option key={s.id} value={s.id}>{s.id}</option>)}
                       </select>
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Expert Assigné</label>
                       <select name="assignedTechnicianId" defaultValue={editingTicket?.assignedTechnicianId || ''} className="w-full h-11 bg-[#f8f9fa] border-none text-[#1a73e8] font-black text-[10px] uppercase" title="Spécialiste en charge de l'intervention">
                          <option value="">Algorithme Auto-Assign</option>
                          {technicians.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                       </select>
                    </div>
                 </div>
              </div>
           </div>
           <div className="space-y-2 pt-6 border-t border-[#f1f3f4]">
              <label className="text-[9px] font-black text-gray-400 uppercase ml-1 tracking-widest">Diagnostic Préliminaire / Descriptif</label>
              <textarea name="description" required defaultValue={editingTicket?.description} className="w-full h-32 text-sm p-5 bg-[#f8f9fa] border-none font-medium focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all shadow-inner" placeholder="Décrire avec précision les symptômes signalés par le bénéficiaire..." title="Détail technique de la panne ou du service demandé" />
           </div>
           
           <div className="p-6 bg-blue-50 border border-dashed border-blue-200 flex items-start gap-4 shadow-sm" title="Certification de validité cloud">
              <ShieldCheck size={24} className="text-[#1a73e8] mt-1 shrink-0" />
              <div>
                 <p className="text-xs font-black text-blue-800 uppercase tracking-widest">Certification Cloud Horizon</p>
                 <p className="text-[10px] text-blue-600 mt-2 leading-relaxed uppercase font-medium">
                   Ce dossier sera immédiatement notifié à l'expert assigné et archivé dans le flux décisionnel stratégique. Assurez-vous de la validité des coordonnées clients pour le suivi SLA.
                 </p>
              </div>
           </div>

           <div className="flex gap-4 pt-8 border-t border-[#dadce0]">
              <button type="submit" className="btn-google-primary flex-1 justify-center py-5 text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-blue-600/20" title="Enregistrer et notifier l'expert technique">
                 <Save size={20} /> Valider le dossier
              </button>
              <button type="button" onClick={() => setIsModalOpen(false)} className="btn-google-outlined px-12 font-black uppercase text-[10px] tracking-widest" title="Annuler la saisie sans sauvegarder">Annuler</button>
           </div>
        </form>
      </Modal>
    </div>
  );
};

export default Tickets;
