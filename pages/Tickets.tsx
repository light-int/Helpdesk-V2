
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
  SlidersHorizontal, LayoutGrid, ListFilter, MapPinned, ChevronLeft
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

  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => { 
    refreshAll();
    const interval = setInterval(() => setCurrentTime(new Date()), 10000);
    return () => clearInterval(interval);
  }, []);

  // Réinitialiser la page quand les filtres changent
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, priorityFilter, showroomFilter]);

  // Détection du ticket via l'URL
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

  const openAddModal = () => {
    setEditingTicket(null);
    setIsModalOpen(true);
  };

  const openEditModal = (ticket: Ticket) => {
    setEditingTicket(ticket);
    setIsModalOpen(true);
  };

  const allFilteredTickets = useMemo(() => {
    let baseList = tickets.filter(t => {
      if (t.isArchived) return false;
      if (currentUser?.role === 'TECHNICIAN' && t.assignedTechnicianId !== currentUser.id) {
        return false;
      }
      
      const matchesSearch = (t.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (t.id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (t.serialNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (t.productName || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'Tous' || t.status === statusFilter;
      const matchesPriority = priorityFilter === 'Toutes' || t.priority === priorityFilter;
      const matchesShowroom = showroomFilter === 'Tous' || t.showroom === showroomFilter;

      return matchesSearch && matchesStatus && matchesPriority && matchesShowroom;
    });

    return [...baseList].sort((a, b) => {
      if (a.priority === 'Urgent' && b.priority !== 'Urgent') return -1;
      if (a.priority !== 'Urgent' && b.priority === 'Urgent') return 1;
      if (a.status === 'Nouveau' && b.status !== 'Nouveau') return -1;
      if (a.status !== 'Nouveau' && b.status === 'Nouveau') return 1;
      const aIsClosed = a.status === 'Résolu' || a.status === 'Fermé';
      const bIsClosed = b.status === 'Résolu' || b.status === 'Fermé';
      if (!aIsClosed && bIsClosed) return -1;
      if (aIsClosed && !bIsClosed) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [tickets, searchTerm, statusFilter, priorityFilter, showroomFilter, currentUser]);

  const paginatedTickets = useMemo(() => {
    const startIndex = (currentPage - 1) * TICKETS_PER_PAGE;
    return allFilteredTickets.slice(startIndex, startIndex + TICKETS_PER_PAGE);
  }, [allFilteredTickets, currentPage]);

  const totalPages = Math.ceil(allFilteredTickets.length / TICKETS_PER_PAGE);

  const urgentCount = useMemo(() => tickets.filter(t => t.priority === 'Urgent' && t.status !== 'Fermé').length, [tickets]);
  const newCount = useMemo(() => tickets.filter(t => t.status === 'Nouveau').length, [tickets]);

  const isRecent = (dateStr: string) => {
    if (!dateStr) return false;
    const ticketDate = new Date(dateStr).getTime();
    const now = new Date().getTime();
    return (now - ticketDate) < (24 * 60 * 60 * 1000); 
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return null;
    const mins = Math.floor(ms / 60000);
    const hours = Math.floor(mins / 60);
    const rMins = mins % 60;
    return hours > 0 ? `${hours}h ${rMins}min` : `${rMins}min`;
  };

  const getLiveDuration = (startedAt?: string) => {
    if (!startedAt) return null;
    const diff = currentTime.getTime() - new Date(startedAt).getTime();
    return formatDuration(diff);
  };

  const handleStartIntervention = async (ticket: Ticket) => {
    const updated: Ticket = {
      ...ticket,
      status: 'En cours',
      lastUpdate: new Date().toISOString(),
      interventionReport: {
        ...ticket.interventionReport,
        startedAt: new Date().toISOString()
      }
    };
    await saveTicket(updated);
    setSelectedTicket(updated);
    addNotification({ title: 'Chrono Démarré', message: `L'intervention sur le dossier #${ticket.id} a débuté.`, type: 'info' });
  };

  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('Tous');
    setPriorityFilter('Toutes');
    setShowroomFilter('Tous');
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const custName = formData.get('customerName') as string;
    const custPhone = formData.get('customerPhone') as string;
    
    if (!custName || !custPhone) {
        addNotification({ title: 'Saisie Incomplète', message: 'Le nom et le mobile sont obligatoires.', type: 'warning' });
        return;
    }

    const existingCustomer = customers.find(c => c.phone === custPhone);
    const customerData: Customer = {
      id: existingCustomer?.id || `C-${Math.floor(1000 + Math.random() * 9000)}`,
      name: custName,
      phone: custPhone,
      email: existingCustomer?.email || (formData.get('email') as string) || '',
      type: existingCustomer?.type || 'Particulier',
      address: existingCustomer?.address || (formData.get('location') as string) || '',
      status: 'Actif',
      totalSpent: (existingCustomer?.totalSpent || 0),
      ticketsCount: (existingCustomer?.ticketsCount || 0) + (editingTicket ? 0 : 1),
      lastVisit: new Date().toISOString(),
      isArchived: false
    };

    const ticketData: Ticket = {
      ...(editingTicket || {}),
      id: editingTicket?.id || `T-${Math.floor(1000 + Math.random() * 9000)}`,
      customerId: customerData.id,
      customerName: custName,
      customerPhone: custPhone,
      brand: formData.get('brand') as string,
      productName: formData.get('productName') as string,
      serialNumber: formData.get('serialNumber') as string,
      purchaseDate: formData.get('purchaseDate') as string,
      location: formData.get('location') as string,
      clientImpact: (formData.get('clientImpact') as any) || 'Faible',
      source: (formData.get('source') as any) || editingTicket?.source || 'WhatsApp',
      showroom: (formData.get('showroom') as any) || editingTicket?.showroom || 'Glass',
      category: (formData.get('category') as any) || editingTicket?.category || 'SAV',
      status: (formData.get('status') as any) || editingTicket?.status || 'Nouveau',
      priority: (formData.get('priority') as any) || editingTicket?.priority || 'Moyenne',
      description: formData.get('description') as string,
      assignedTechnicianId: formData.get('assignedTechnicianId') as string || editingTicket?.assignedTechnicianId,
      createdAt: editingTicket?.createdAt || new Date().toISOString(),
      lastUpdate: new Date().toISOString(),
      financials: editingTicket?.financials || {
        partsTotal: 0, partsCost: 0, laborTotal: 0, laborCost: 0, logisticsCost: 0, 
        travelFee: 5000, discount: 0, grandTotal: 5000, netMargin: 3000, isPaid: false
      },
      isArchived: editingTicket?.isArchived || false
    } as Ticket;

    try {
      await saveCustomer(customerData);
      await saveTicket(ticketData);
      setIsModalOpen(false);
      setEditingTicket(null);
      setSelectedTicket(null);
      addNotification({ 
        title: 'Cloud Horizon', 
        message: `Dossier #${ticketData.id} synchronisé.`, 
        type: 'success' 
      });
      await refreshAll();
    } catch (err) {
      addNotification({ title: 'Erreur Sync', message: 'Vérifiez la structure Cloud.', type: 'error' });
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Archiver ce dossier ?")) {
      await deleteTicket(id);
      setSelectedTicket(null);
      addNotification({ title: 'Dossier Archivé', message: 'Ticket déplacé vers les archives.', type: 'info' });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Résolu': return 'bg-green-100 text-green-700 border-green-200';
      case 'Fermé': return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'En attente d\'approbation': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'Nouveau': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'En cours': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="relative flex flex-col space-y-6 animate-page-entry pb-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-normal text-[#3c4043]">Tickets & SAV</h1>
          <p className="text-[#5f6368] text-sm font-medium">Gestion opérationnelle du matériel Royal Plaza.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={refreshAll} className="btn-google-outlined h-11 px-4 text-[#5f6368] hover:text-[#1a73e8]" title="Actualiser">
              <RefreshCw size={18} className={isSyncing ? 'animate-spin' : ''} />
          </button>
          {currentUser?.role !== 'TECHNICIAN' && (
            <button onClick={openAddModal} className="btn-google-primary shadow-lg shadow-blue-600/10 h-11">
              <Plus size={18} /> Ouvrir Dossier
            </button>
          )}
        </div>
      </header>

      {/* BANNIÈRE ALERTE */}
      {(urgentCount > 0 || newCount > 0) && (
        <div className={`p-4 rounded-2xl flex items-center justify-between animate-in slide-in-from-top-4 duration-500 border-2 shadow-sm ${urgentCount > 0 ? 'bg-red-50 border-red-100 text-red-700' : 'bg-blue-50 border-blue-100 text-blue-700'}`}>
          <div className="flex items-center gap-4">
            <div className={`p-2 rounded-xl bg-white shadow-sm ${urgentCount > 0 ? 'text-red-600' : 'text-blue-600'}`}>
               <BellRing size={20} className={urgentCount > 0 ? 'animate-bounce' : ''} />
            </div>
            <div>
               <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Alerte Flux Horizon</p>
               <p className="text-sm font-bold">
                 {urgentCount > 0 ? `${urgentCount} dossier(s) URGENT(S) détecté(s).` : `${newCount} nouveau(x) dossier(s) à qualifier.`}
               </p>
            </div>
          </div>
          <button onClick={() => { setPriorityFilter(urgentCount > 0 ? 'Urgent' : 'Toutes'); setStatusFilter(urgentCount === 0 ? 'Nouveau' : 'Tous'); }} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-white shadow-sm hover:scale-105 transition-all ${urgentCount > 0 ? 'text-red-600' : 'text-blue-600'}`}>
            Traiter maintenant
          </button>
        </div>
      )}

      {/* FILTRES COMPACTS STYLE GOOGLE */}
      <div className="bg-white border border-[#dadce0] rounded-[24px] shadow-sm overflow-hidden">
        <div className="p-4 flex flex-col lg:flex-row gap-4">
           <div className="relative flex-1">
              <Search className="absolute left-4 top-3.5 text-[#9aa0a6]" size={18} />
              <input 
               type="text" 
               placeholder="Rechercher dossier, client, S/N..." 
               value={searchTerm} 
               onChange={e => setSearchTerm(e.target.value)} 
               className="w-full pl-12 h-12 bg-[#f8f9fa] border-transparent focus:bg-white !rounded-2xl text-[13px] font-medium" 
              />
           </div>

           <div className="flex flex-wrap gap-2">
              <div className="relative min-w-[140px]">
                 <ListFilter className="absolute left-3 top-3.5 text-[#5f6368]" size={15} />
                 <select 
                    value={statusFilter} 
                    onChange={e => setStatusFilter(e.target.value)} 
                    className={`pl-10 pr-4 h-12 text-[10px] font-black uppercase !rounded-2xl transition-all appearance-none cursor-pointer border-[#dadce0] ${statusFilter !== 'Tous' ? 'bg-blue-50 border-[#1a73e8] text-[#1a73e8]' : 'bg-white'}`}
                 >
                    <option value="Tous">États (Tous)</option>
                    <option value="Nouveau">🔵 Nouveaux</option>
                    <option value="En cours">🟡 En cours</option>
                    <option value="En attente d'approbation">🟣 En attente</option>
                    <option value="Résolu">🟢 Résolus</option>
                    <option value="Fermé">⚪ Fermés</option>
                 </select>
              </div>

              <div className="relative min-w-[140px]">
                 <SlidersHorizontal className="absolute left-3 top-3.5 text-[#5f6368]" size={15} />
                 <select 
                    value={priorityFilter} 
                    onChange={e => setPriorityFilter(e.target.value)} 
                    className={`pl-10 pr-4 h-12 text-[10px] font-black uppercase !rounded-2xl transition-all appearance-none cursor-pointer border-[#dadce0] ${priorityFilter !== 'Toutes' ? 'bg-amber-50 border-amber-500 text-amber-700' : 'bg-white'}`}
                 >
                    <option value="Toutes">Priorités (Toutes)</option>
                    <option value="Urgent">🔴 Urgent</option>
                    <option value="Haute">Haute</option>
                    <option value="Moyenne">Moyenne</option>
                    <option value="Basse">Basse</option>
                 </select>
              </div>

              <div className="relative min-w-[140px]">
                 <MapPinned className="absolute left-3 top-3.5 text-[#5f6368]" size={15} />
                 <select 
                    value={showroomFilter} 
                    onChange={e => setShowroomFilter(e.target.value)} 
                    className={`pl-10 pr-4 h-12 text-[10px] font-black uppercase !rounded-2xl transition-all appearance-none cursor-pointer border-[#dadce0] ${showroomFilter !== 'Tous' ? 'bg-gray-100 border-[#1a73e8] text-[#1a73e8]' : 'bg-white'}`}
                 >
                    <option value="Tous">Sites (Tous)</option>
                    {showrooms.map(s => <option key={s.id} value={s.id}>{s.id}</option>)}
                 </select>
              </div>

              <button 
                onClick={resetFilters} 
                className="btn-google-outlined h-12 px-4 !rounded-2xl hover:bg-red-50 hover:text-red-600 transition-all group"
                title="Effacer filtres"
              >
                 <FilterX size={18} />
              </button>
           </div>
        </div>
        <div className="px-6 py-2 bg-[#f8f9fa] border-t border-[#dadce0] flex items-center justify-between">
           <span className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest flex items-center gap-1.5">
              <LayoutGrid size={12} /> {allFilteredTickets.length} Dossiers au total
           </span>
           <div className="text-[10px] font-bold text-gray-400 uppercase">
              Actualisé : {currentTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
           </div>
        </div>
      </div>

      {/* TABLEAU SANS SCROLL INTERNE AVEC PAGINATION */}
      <div className="google-card overflow-hidden shadow-xl border-none">
        <table className="w-full text-left">
          <thead className="bg-white border-b border-[#dadce0]">
            <tr className="text-[#5f6368] text-[10px] font-black uppercase tracking-widest">
              <th className="px-8 py-5">ID & Showroom</th>
              <th className="px-8 py-5">Client & Matériel</th>
              <th className="px-8 py-5">Expert Assigné</th>
              <th className="px-8 py-5 text-center">État opérationnel</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#dadce0]">
            {paginatedTickets.map((ticket, idx) => (
              <tr 
                key={ticket.id} 
                onClick={() => setSelectedTicket(ticket)}
                className={`hover:bg-[#f8faff] transition-all cursor-pointer group ${selectedTicket?.id === ticket.id ? 'bg-[#e8f0fe]' : ''} ${ticket.priority === 'Urgent' ? 'border-l-4 border-l-red-500' : ''}`}
              >
                <td className="px-8 py-5">
                  <div className="flex items-center gap-2">
                     <span className="font-black text-[#1a73e8]">#{ticket.id}</span>
                     {isRecent(ticket.createdAt) && <span className="badge-new">NOUVEAU</span>}
                     {ticket.priority === 'Urgent' && <span className="px-2 py-0.5 bg-red-600 text-white text-[8px] font-black rounded-full animate-pulse">URGENT</span>}
                  </div>
                  <p className="text-[9px] text-[#5f6368] font-black uppercase mt-1 tracking-wider">{ticket.showroom}</p>
                </td>
                <td className="px-8 py-5">
                  <p className="text-sm font-bold text-[#3c4043] group-hover:text-[#1a73e8] transition-colors">{ticket.customerName}</p>
                  <p className="text-[10px] text-[#5f6368] truncate max-w-[250px] mt-0.5 italic flex items-center gap-2">
                      <Tag size={10} className="text-[#1a73e8]" /> {ticket.brand} • {ticket.productName}
                  </p>
                </td>
                <td className="px-8 py-5">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#f1f3f4] flex items-center justify-center text-[#5f6368] border border-[#dadce0]">
                      <User size={14} />
                    </div>
                    <span className="text-xs font-bold text-[#5f6368]">
                      {technicians.find(tech => tech.id === ticket.assignedTechnicianId)?.name || 'En attente...'}
                    </span>
                  </div>
                </td>
                <td className="px-8 py-5 text-center">
                  <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase border shadow-sm ${getStatusColor(ticket.status)}`}>
                    {ticket.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {allFilteredTickets.length === 0 && (
            <div className="py-32 text-center bg-gray-50/30">
                <Archive size={48} className="mx-auto text-gray-200 mb-4" />
                <p className="text-sm font-black text-gray-400 uppercase tracking-widest">Aucun dossier trouvé</p>
            </div>
        )}

        {/* PAGINATION FIXÉE EN BAS DU CARD (STYLE GOOGLE) */}
        {totalPages > 1 && (
          <div className="px-8 py-4 bg-[#f8f9fa] border-t border-[#dadce0] flex items-center justify-between">
            <p className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest">
              Dossiers {(currentPage - 1) * TICKETS_PER_PAGE + 1} - {Math.min(currentPage * TICKETS_PER_PAGE, allFilteredTickets.length)} sur {allFilteredTickets.length}
            </p>
            <div className="flex items-center gap-2">
               <button 
                disabled={currentPage === 1}
                onClick={(e) => { e.stopPropagation(); setCurrentPage(p => p - 1); window.scrollTo({top: 0, behavior: 'smooth'}); }}
                className="p-2 rounded-lg border border-[#dadce0] bg-white text-[#5f6368] disabled:opacity-30 hover:bg-[#f1f3f4] transition-all"
               >
                 <ChevronLeft size={18} />
               </button>
               <div className="flex gap-1">
                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      key={i}
                      onClick={() => { setCurrentPage(i + 1); window.scrollTo({top: 0, behavior: 'smooth'}); }}
                      className={`w-8 h-8 rounded-lg text-[10px] font-black transition-all ${currentPage === i + 1 ? 'bg-[#1a73e8] text-white shadow-md' : 'bg-white text-[#5f6368] border border-[#dadce0] hover:bg-[#f1f3f4]'}`}
                    >
                      {i + 1}
                    </button>
                  ))}
               </div>
               <button 
                disabled={currentPage === totalPages}
                onClick={(e) => { e.stopPropagation(); setCurrentPage(p => p + 1); window.scrollTo({top: 0, behavior: 'smooth'}); }}
                className="p-2 rounded-lg border border-[#dadce0] bg-white text-[#5f6368] disabled:opacity-30 hover:bg-[#f1f3f4] transition-all"
               >
                 <ChevronRight size={18} />
               </button>
            </div>
          </div>
        )}
      </div>

      {/* DRAWER DETAILS */}
      <Drawer
        isOpen={!!selectedTicket}
        onClose={() => setSelectedTicket(null)}
        title={`Dossier #${selectedTicket?.id}`}
        subtitle={`${selectedTicket?.category} • ${selectedTicket?.showroom}`}
        icon={<FileText size={20} />}
        footer={
          <div className="flex gap-3">
             {currentUser?.role === 'TECHNICIAN' && selectedTicket?.assignedTechnicianId === currentUser.id ? (
                <>
                  {selectedTicket.status === 'Nouveau' ? (
                    <button onClick={() => handleStartIntervention(selectedTicket)} className="flex-1 btn-google-primary justify-center py-4 text-xs font-black uppercase tracking-widest shadow-xl bg-green-600">
                       <Play size={16} /> Démarrer intervention
                    </button>
                  ) : (
                    <button className="flex-1 btn-google-primary justify-center py-4 text-xs font-black uppercase tracking-widest shadow-xl">
                       <Wrench size={16} /> Rapport
                    </button>
                  )}
                </>
              ) : (
                <>
                  <button onClick={() => selectedTicket && openEditModal(selectedTicket)} className="flex-1 btn-google-outlined justify-center text-xs font-black uppercase tracking-widest">Modifier</button>
                  <button onClick={() => selectedTicket && handleDelete(selectedTicket.id)} className="p-4 bg-red-50 text-red-600 rounded-2xl hover:bg-red-600 hover:text-white transition-all"><Trash2 size={20}/></button>
                </>
              )}
          </div>
        }
      >
        {selectedTicket && (
          <div className="space-y-10 animate-in fade-in duration-300">
             <div className="grid grid-cols-2 gap-4">
                <div className="p-5 bg-white border border-[#dadce0] rounded-3xl shadow-sm">
                   <p className="text-[9px] font-black text-[#5f6368] uppercase mb-2">État Dossier</p>
                   <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase border inline-block ${getStatusColor(selectedTicket.status)}`}>{selectedTicket.status}</span>
                </div>
                <div className="p-5 bg-white border border-[#dadce0] rounded-3xl shadow-sm">
                   <p className="text-[9px] font-black text-[#5f6368] uppercase mb-2">Chrono Intervention</p>
                   <span className="text-sm font-black text-[#3c4043]">{selectedTicket.status === 'En cours' ? 'En direct...' : formatDuration(selectedTicket.interventionReport?.durationMs) || 'Non démarré'}</span>
                </div>
             </div>
             <section className="space-y-4">
                <h3 className="text-[10px] font-black text-[#9aa0a6] uppercase tracking-[0.2em] flex items-center gap-2"><User size={16} /> Fiche Client</h3>
                <div className="p-6 bg-[#f8f9fa] border border-[#dadce0] rounded-3xl space-y-4">
                   <p className="text-base font-black text-[#3c4043]">{selectedTicket.customerName}</p>
                   <div className="flex items-center gap-3 text-xs font-black text-[#1a73e8] font-mono tracking-wider"><Smartphone size={16} /> {selectedTicket.customerPhone}</div>
                </div>
             </section>
             <section className="space-y-4">
                <h3 className="text-[10px] font-black text-[#9aa0a6] uppercase tracking-[0.2em] flex items-center gap-2"><Package size={16} /> Équipement</h3>
                <div className="p-6 bg-white border border-[#dadce0] rounded-3xl shadow-sm space-y-3">
                   <span className="text-[9px] font-black text-[#1a73e8] uppercase bg-blue-50 px-2 py-0.5 rounded">{selectedTicket.brand}</span>
                   <h4 className="text-lg font-black text-[#3c4043]">{selectedTicket.productName}</h4>
                   <p className="text-[9px] text-gray-400 font-black uppercase">S/N : <span className="text-xs font-mono font-black text-[#3c4043]">{selectedTicket.serialNumber || 'NON SPÉCIFIÉ'}</span></p>
                </div>
             </section>
          </div>
        )}
      </Drawer>

      {/* MODAL CREATION - CORRECTION PADDINGS ICÔNES */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingTicket ? `Modification #${editingTicket.id}` : "Nouvelle Demande Horizon"}
        size="xl"
      >
         <form onSubmit={handleSave} className="space-y-8 animate-in fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
               <div className="space-y-5">
                  <div className="flex items-center gap-2 border-b pb-2"><User size={16} className="text-[#1a73e8]"/><h3 className="text-[10px] font-black uppercase text-gray-700">Client</h3></div>
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-[#5f6368] uppercase ml-1">Identité Client</label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-3.5 text-[#dadce0]" size={16} />
                        <input name="customerName" type="text" required defaultValue={editingTicket?.customerName} placeholder="Nom complet" className="!pl-11" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-[#5f6368] uppercase ml-1">Mobile GSM</label>
                      <div className="relative">
                        <Smartphone className="absolute left-3.5 top-3.5 text-[#dadce0]" size={16} />
                        <input name="customerPhone" type="tel" required defaultValue={editingTicket?.customerPhone} placeholder="+241 ..." className="!pl-11 font-bold" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-[#5f6368] uppercase ml-1">Canal Entrée</label>
                      <div className="relative">
                        <MessageSquare className="absolute left-3.5 top-3.5 text-[#dadce0]" size={16} />
                        <select name="source" defaultValue={editingTicket?.source || 'WhatsApp'} className="!pl-11">
                          <option value="WhatsApp">WhatsApp</option>
                          <option value="Phone">Appel</option>
                          <option value="Email">Email</option>
                          <option value="Interne">Showroom</option>
                        </select>
                      </div>
                    </div>
                  </div>
               </div>

               <div className="space-y-5">
                  <div className="flex items-center gap-2 border-b pb-2"><Package size={16} className="text-purple-600"/><h3 className="text-[10px] font-black uppercase text-gray-700">Équipement</h3></div>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                       <div className="space-y-1">
                        <label className="text-[10px] font-black text-[#5f6368] uppercase ml-1">Marque</label>
                        <select name="brand" defaultValue={editingTicket?.brand || 'LG'}>
                           {['LG', 'Beko', 'Samsung', 'Hisense', 'Royal Plaza'].map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-[#5f6368] uppercase ml-1">Catégorie</label>
                        <select name="category" defaultValue={editingTicket?.category || 'SAV'}>
                           <option value="SAV">SAV</option>
                           <option value="Installation">Installation</option>
                           <option value="Maintenance">Maintenance</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-[#5f6368] uppercase ml-1">Désignation</label>
                      <div className="relative">
                        <Tag className="absolute left-3.5 top-3.5 text-[#dadce0]" size={16} />
                        <input name="productName" type="text" required defaultValue={editingTicket?.productName} placeholder="ex: Split LG 1.5CV" className="!pl-11" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-[#5f6368] uppercase ml-1">S/N Appareil</label>
                      <div className="relative">
                        <Hash className="absolute left-3.5 top-3.5 text-[#dadce0]" size={16} />
                        <input name="serialNumber" type="text" defaultValue={editingTicket?.serialNumber} placeholder="SN-..." className="!pl-11 font-mono text-xs uppercase" />
                      </div>
                    </div>
                  </div>
               </div>

               <div className="space-y-5">
                  <div className="flex items-center gap-2 border-b pb-2"><Target size={16} className="text-amber-600"/><h3 className="text-[10px] font-black uppercase text-gray-700">Logistique</h3></div>
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-[#5f6368] uppercase ml-1">Quartier / Zone</label>
                      <div className="relative">
                        <MapPin className="absolute left-3.5 top-3.5 text-[#dadce0]" size={16} />
                        <input name="location" type="text" defaultValue={editingTicket?.location} placeholder="Localisation..." className="!pl-11" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                       <div className="space-y-1">
                        <label className="text-[10px] font-black text-[#5f6368] uppercase ml-1">Priorité</label>
                        <select name="priority" defaultValue={editingTicket?.priority || 'Moyenne'} className="font-bold">
                           <option value="Basse">Basse</option>
                           <option value="Moyenne">Moyenne</option>
                           <option value="Urgent">Urgent</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-[#5f6368] uppercase ml-1">Showroom</label>
                        <select name="showroom" defaultValue={editingTicket?.showroom || 'Glass'}>
                          {showrooms.map(s => <option key={s.id} value={s.id}>{s.id}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-[#5f6368] uppercase ml-1">Assignation</label>
                      <div className="relative">
                        <Wrench className="absolute left-3.5 top-3.5 text-[#dadce0]" size={16} />
                        <select name="assignedTechnicianId" defaultValue={editingTicket?.assignedTechnicianId || ''} className="!pl-11 font-bold text-blue-700">
                          <option value="">Affectation auto</option>
                          {technicians.map(tech => <option key={tech.id} value={tech.id}>{tech.name}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
               </div>
            </div>

            <div className="space-y-2 pt-4 border-t">
               <label className="text-[10px] font-black text-[#5f6368] uppercase ml-1 flex items-center gap-2"><InfoIcon size={14}/> Diagnostic initial</label>
               <textarea name="description" required defaultValue={editingTicket?.description} className="h-32 resize-none text-sm" placeholder="Symptômes signalés par le client..." />
            </div>

            <div className="flex gap-4 pt-6 border-t">
               <button type="submit" className="btn-google-primary flex-1 justify-center py-5 text-sm font-black uppercase tracking-widest shadow-xl shadow-blue-600/20">
                  <Save size={20} /> {editingTicket ? "Mettre à jour" : "Ouvrir Dossier"}
               </button>
               <button type="button" onClick={() => setIsModalOpen(false)} className="btn-google-outlined px-12 font-black uppercase text-[10px]">Abandonner</button>
            </div>
         </form>
      </Modal>
    </div>
  );
};

export default Tickets;
