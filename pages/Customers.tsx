
import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Users, Search, Plus, Mail, Phone, Filter, 
  Edit3, Trash2, Save, Building2, User as UserIcon,
  AlertTriangle, X, CheckCircle2, Loader2, Eye, 
  History, CreditCard, Calendar, ArrowUpRight, MapPin,
  ClipboardList, Ticket as TicketIcon, BadgeCheck, ShieldAlert,
  MessageSquare, Wrench, Package, Activity, Hash, Tag, Lock,
  Archive, RotateCcw, AlertCircle, ChevronLeft, ChevronRight,
  FilterX, Smartphone, Briefcase, TrendingUp, DollarSign,
  LayoutGrid, ListFilter, SlidersHorizontal, UserPlus,
  Star, Trophy, Zap, ChevronUp, ChevronDown,
  // Fix: Added missing RefreshCw icon import
  RefreshCw
} from 'lucide-react';
import { useData, useNotifications, useUser } from '../App';
import { Customer, Ticket } from '../types';
import Modal from '../components/Modal';
import Drawer from '../components/Drawer';

const ITEMS_PER_PAGE = 20;

const Customers: React.FC = () => {
  const { customers, saveCustomer, deleteCustomer, refreshAll, tickets } = useData();
  const { currentUser } = useUser();
  const { addNotification } = useNotifications();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'Tous' | 'Particulier' | 'Entreprise'>('Tous');
  const [statusFilter, setStatusFilter] = useState<'Tous' | 'Actif' | 'VIP' | 'Litige'>('Tous');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerType, setCustomerType] = useState<'Particulier' | 'Entreprise'>('Particulier');

  useEffect(() => { refreshAll(); }, []);

  const stats = useMemo(() => {
    const valid = (customers || []).filter(c => !c.isArchived);
    return {
      total: valid.length,
      vips: valid.filter(c => c.status === 'VIP').length,
      b2b: valid.filter(c => c.type === 'Entreprise').length,
      highValue: valid.filter(c => c.totalSpent > 1000000).length
    };
  }, [customers]);

  const filtered = useMemo(() => {
    return (customers || []).filter(c => {
      if (c.isArchived) return false;
      const cleanSearch = searchTerm.toLowerCase();
      const matchesSearch = c.name.toLowerCase().includes(cleanSearch) || c.phone.includes(cleanSearch) || (c.companyName || '').toLowerCase().includes(cleanSearch);
      const matchesType = typeFilter === 'Tous' || c.type === typeFilter;
      const matchesStatus = statusFilter === 'Tous' || c.status === statusFilter;
      
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [customers, searchTerm, typeFilter, statusFilter]);

  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);

  const customerTickets = useMemo(() => {
    if (!selectedCustomer) return [];
    return tickets.filter(t => 
      t.customerPhone === selectedCustomer.phone || 
      t.customerName === selectedCustomer.name
    ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [selectedCustomer, tickets]);

  const isRecent = (dateStr?: string) => {
    if (!dateStr) return false;
    const now = new Date().getTime();
    const then = new Date(dateStr).getTime();
    return (now - then) < (7 * 24 * 60 * 60 * 1000);
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const customerData: Customer = {
      id: editingCustomer?.id || `C-${Math.floor(1000 + Math.random() * 899)}`,
      name: formData.get('name') as string,
      phone: formData.get('phone') as string,
      email: formData.get('email') as string,
      type: customerType,
      companyName: customerType === 'Entreprise' ? formData.get('companyName') as string : undefined,
      address: formData.get('address') as string,
      status: (formData.get('status') as any) || 'Actif',
      totalSpent: editingCustomer?.totalSpent || 0,
      ticketsCount: editingCustomer?.ticketsCount || 0,
      lastVisit: new Date().toISOString(),
      isArchived: false
    };

    await saveCustomer(customerData);
    setIsModalOpen(false);
    setEditingCustomer(null);
    addNotification({ title: 'CRM Cloud', message: `Base de données client mise à jour.`, type: 'success' });
    await refreshAll();
  };

  const resetFilters = () => {
    setSearchTerm('');
    setTypeFilter('Tous');
    setStatusFilter('Tous');
  };

  const openEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setCustomerType(customer.type as any);
    setIsModalOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'VIP': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Litige': return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  return (
    <div className="space-y-8 animate-page-entry pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-light text-[#202124]">Portefeuille Clients</h1>
          <p className="text-[10px] text-[#5f6368] font-black uppercase tracking-widest mt-1">Intelligence Clientèle Royal Plaza Horizon</p>
        </div>
        <div className="flex gap-3">
          <button onClick={refreshAll} className="btn-google-outlined h-11 px-4">
            <RefreshCw size={18} />
          </button>
          <button onClick={() => { setEditingCustomer(null); setIsModalOpen(true); }} className="btn-google-primary h-11 px-6 shadow-xl shadow-blue-600/10">
            <UserPlus size={20} /> <span>Ajouter un client</span>
          </button>
        </div>
      </header>

      {/* CRM KPIS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Base Totale', value: stats.total, icon: <Users size={20}/>, color: '#1a73e8' },
          { label: 'Segments B2B', value: stats.b2b, icon: <Building2 size={20}/>, color: '#188038' },
          { label: 'Comptes VIP', value: stats.vips, icon: <Trophy size={20}/>, color: '#f9ab00' },
          { label: 'Top Investisseurs', value: stats.highValue, icon: <Star size={20}/>, color: '#a142f4' }
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

      {/* SEARCH & FILTERS CONTROL CENTER */}
      <div className="google-card overflow-hidden border-none shadow-xl bg-white ring-1 ring-black/5">
        <div className="p-8 space-y-8">
           <div className="flex flex-col xl:flex-row gap-6">
              <div className="relative flex-1 group">
                 <Search className="absolute left-6 top-5 text-[#9aa0a6] group-focus-within:text-[#1a73e8] transition-colors" size={24} />
                 <input 
                  type="text" 
                  placeholder="Rechercher par nom, mobile ou entreprise..." 
                  className="w-full pl-16 h-16 bg-[#f8f9fa] border-none text-base font-bold shadow-inner transition-all placeholder:text-gray-400 placeholder:font-normal focus:bg-white focus:ring-2 focus:ring-blue-100"
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
                 {/* Type Filter - Icons Only */}
                 <div className="flex items-center bg-[#f1f3f4] p-1.5 shadow-inner">
                    {[
                      { id: 'Tous', icon: <ListFilter size={20} />, label: 'Tous les profils' },
                      { id: 'Particulier', icon: <UserIcon size={20} />, label: 'Particuliers uniquement' },
                      { id: 'Entreprise', icon: <Building2 size={20} />, label: 'B2B uniquement' }
                    ].map(item => (
                      <button 
                        key={item.id}
                        title={item.label}
                        onClick={() => setTypeFilter(item.id as any)}
                        className={`p-3.5 transition-all ${typeFilter === item.id ? 'bg-white text-[#1a73e8] shadow-md' : 'text-[#5f6368] hover:text-[#202124]'}`}
                      >
                        {item.icon}
                      </button>
                    ))}
                 </div>

                 <div className="flex items-center gap-4">
                    <button 
                      onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                      title="Filtres par statut"
                      className={`p-4.5 border-2 transition-all ${showAdvancedFilters ? 'bg-[#202124] border-[#202124] text-white shadow-lg' : 'bg-white border-[#dadce0] text-[#5f6368] hover:border-[#202124]'}`}
                    >
                      <SlidersHorizontal size={22} />
                    </button>

                    <div className="h-16 min-w-[180px] p-4 bg-white border border-blue-100 flex items-center justify-between shadow-sm relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-1 h-full bg-[#1a73e8]" />
                      <div className="shrink-0 mr-4">
                         <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                            <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest">Base CRM</span>
                         </div>
                         <p className="text-lg font-black text-[#202124] leading-none mt-1">{filtered.length} <span className="text-[10px] text-gray-400 font-bold">FICHES</span></p>
                      </div>
                      <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl"><LayoutGrid size={18}/></div>
                    </div>
                 </div>
                 
                 {(searchTerm || typeFilter !== 'Tous' || statusFilter !== 'Tous') && (
                    <button onClick={resetFilters} className="p-5 text-[#d93025] hover:bg-red-50 border-2 border-transparent transition-all group" title="Réinitialiser">
                       <RotateCcw size={24} className="group-hover:rotate-[-180deg] transition-transform duration-700" />
                    </button>
                 )}
              </div>
           </div>

           {showAdvancedFilters && (
              <div className="flex flex-wrap gap-4 pt-6 border-t border-[#f1f3f4] animate-in slide-in-from-top-2 duration-300">
                <p className="w-full text-[9px] font-black text-[#9aa0a6] uppercase tracking-[0.2em] mb-2">Filtrer par classification :</p>
                {['Tous', 'Actif', 'VIP', 'Litige'].map(status => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status as any)}
                    className={`px-6 py-2 border-2 text-[10px] font-black uppercase tracking-widest transition-all ${statusFilter === status ? 'bg-[#1a73e8] border-[#1a73e8] text-white' : 'bg-white border-[#dadce0] text-[#5f6368] hover:border-[#1a73e8]'}`}
                  >
                    {status}
                  </button>
                ))}
              </div>
           )}
        </div>

        {/* CUSTOMERS TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#dadce0] bg-[#f8f9fa] text-[#5f6368] text-[9px] font-black uppercase tracking-[0.2em]">
                <th className="px-10 py-6">Client & Type</th>
                <th className="px-10 py-6">Coordonnées Réelles</th>
                <th className="px-10 py-6 text-center">Historique SAV</th>
                <th className="px-10 py-6 text-center">Dernière Visite</th>
                <th className="px-10 py-6 text-right">Statut & Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#dadce0]">
              {paginatedCustomers.map((customer) => (
                <tr 
                  key={customer.id} 
                  onClick={() => setSelectedCustomer(customer)}
                  className={`hover:bg-[#f8faff] transition-colors group cursor-pointer ${selectedCustomer?.id === customer.id ? 'bg-[#e8f0fe]' : 'bg-white'}`}
                >
                  <td className="px-10 py-6">
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 rounded-[18px] bg-white border border-[#dadce0] flex items-center justify-center text-[#1a73e8] font-black text-base shadow-sm group-hover:shadow-md transition-all">
                          {customer.type === 'Entreprise' ? <Building2 size={24}/> : customer.name[0]}
                       </div>
                       <div>
                          <p className="text-sm font-black text-[#3c4043] group-hover:text-[#1a73e8] transition-colors">{customer.name}</p>
                          <p className="text-[10px] text-[#9aa0a6] font-bold uppercase tracking-widest mt-1">{customer.companyName || 'Compte Particulier'}</p>
                       </div>
                    </div>
                  </td>
                  <td className="px-10 py-6">
                    <div className="flex flex-col gap-1.5">
                       <div className="flex items-center gap-2 text-xs font-black text-[#3c4043] font-mono">
                          <Smartphone size={14} className="text-[#1a73e8]" /> {customer.phone}
                       </div>
                       <div className="flex items-center gap-2 text-[10px] text-[#5f6368] font-medium opacity-60">
                          <Mail size={12} /> {customer.email || '--'}
                       </div>
                    </div>
                  </td>
                  <td className="px-10 py-6 text-center">
                    <div className="inline-flex flex-col items-center">
                      <span className="text-sm font-black text-[#3c4043]">{customer.ticketsCount || 0}</span>
                      <span className="text-[9px] font-bold text-gray-400 uppercase">Dossiers</span>
                    </div>
                  </td>
                  <td className="px-10 py-6 text-center">
                    <div className="inline-flex items-center gap-2">
                      <Calendar size={12} className="text-gray-300" />
                      <span className="text-[11px] font-bold text-[#5f6368]">{customer.lastVisit ? new Date(customer.lastVisit).toLocaleDateString() : '--'}</span>
                    </div>
                  </td>
                  <td className="px-10 py-6 text-right">
                    <div className="flex items-center justify-end gap-6">
                       <span className={`px-4 py-1.5 border text-[9px] font-black uppercase tracking-widest shadow-sm ${getStatusBadge(customer.status)}`}>
                         {customer.status}
                       </span>
                       <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          <button onClick={(e) => { e.stopPropagation(); openEdit(customer); }} className="p-2.5 text-[#5f6368] hover:bg-white hover:text-[#1a73e8] border border-transparent hover:border-[#dadce0] transition-all"><Edit3 size={18} /></button>
                          <button onClick={(e) => { e.stopPropagation(); if(window.confirm('Archiver ce client ?')) deleteCustomer(customer.id); }} className="p-2.5 text-[#5f6368] hover:bg-red-50 hover:text-red-600 transition-all"><Trash2 size={18}/></button>
                       </div>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                   <td colSpan={5} className="py-40 text-center bg-white">
                      <div className="w-24 h-24 bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center mx-auto mb-8">
                        <Users size={48} className="text-gray-200" />
                      </div>
                      <p className="text-xs font-black text-gray-300 uppercase tracking-[0.4em]">Aucune fiche client identifiée</p>
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
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Affichage de {paginatedCustomers.length} sur {filtered.length} fiches</p>
            <div className="flex items-center gap-2">
               <button 
                disabled={currentPage === 1} 
                onClick={() => setCurrentPage(p => p - 1)}
                className="p-2 border bg-white disabled:opacity-30 hover:bg-gray-50 transition-all"
               >
                 <ChevronLeft size={20} />
               </button>
               <div className="px-4 font-black text-xs">{currentPage} / {totalPages}</div>
               <button 
                disabled={currentPage === totalPages} 
                onClick={() => setCurrentPage(p => p + 1)}
                className="p-2 border bg-white disabled:opacity-30 hover:bg-gray-50 transition-all"
               >
                 <ChevronRight size={20} />
               </button>
            </div>
          </div>
        )}
      </div>

      {/* DETAIL DRAWER */}
      <Drawer
        isOpen={!!selectedCustomer}
        onClose={() => setSelectedCustomer(null)}
        title={selectedCustomer?.name || ''}
        subtitle={`${selectedCustomer?.type} • Identifiant CRM: ${selectedCustomer?.id}`}
        icon={<Users size={20} />}
        footer={
          <div className="flex gap-3">
             <button className="flex-1 btn-google-primary justify-center py-4 text-xs font-black uppercase tracking-widest shadow-xl">
                <Plus size={16} /> Créer un Ticket SAV
             </button>
             <button onClick={() => selectedCustomer && openEdit(selectedCustomer)} className="p-4 bg-white border border-[#dadce0] text-[#5f6368] hover:bg-[#e8eaed] transition-all">
                <Edit3 size={20} />
             </button>
          </div>
        }
      >
        {selectedCustomer && (
          <div className="space-y-10">
             {/* CRM INDICATORS */}
             <div className="grid grid-cols-2 gap-4">
                <div className="p-6 bg-gradient-to-br from-blue-50 to-white border border-blue-100 rounded-[32px] shadow-sm">
                   <p className="text-[9px] font-black text-blue-700 uppercase mb-2 flex items-center gap-2"><DollarSign size={10}/> Volume d'affaires</p>
                   <p className="text-xl font-black text-blue-900">{selectedCustomer.totalSpent.toLocaleString()} <span className="text-xs">FCFA</span></p>
                </div>
                <div className="p-6 bg-gradient-to-br from-green-50 to-white border border-green-100 rounded-[32px] shadow-sm">
                   <p className="text-[9px] font-black text-green-700 uppercase tracking-widest mb-2 flex items-center gap-2"><BadgeCheck size={10}/> Fidélité</p>
                   <p className="text-xl font-black text-green-900">{selectedCustomer.ticketsCount} <span className="text-xs">OPÉRATIONS</span></p>
                </div>
             </div>

             {/* CONTACT INFO CARD */}
             <section className="space-y-4">
                <h3 className="text-[10px] font-black text-[#9aa0a6] uppercase tracking-[0.2em] flex items-center gap-2"><Smartphone size={16} /> Profil Vérifié Horizon</h3>
                <div className="p-8 bg-white border border-[#dadce0] rounded-[40px] space-y-6 shadow-sm">
                   <div className="flex items-center gap-6">
                      <div className="w-14 h-14 bg-[#f8f9fa] rounded-2xl border flex items-center justify-center text-[#1a73e8] shadow-inner"><Phone size={24}/></div>
                      <div>
                         <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Mobile GSM</p>
                         <p className="text-lg font-black text-[#3c4043] font-mono tracking-tighter">{selectedCustomer.phone}</p>
                      </div>
                   </div>
                   <div className="h-px bg-gray-100" />
                   <div className="flex items-center gap-6">
                      <div className="w-14 h-14 bg-[#f8f9fa] rounded-2xl border flex items-center justify-center text-[#1a73e8] shadow-inner"><Mail size={24}/></div>
                      <div className="flex-1 min-w-0">
                         <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Canal Email</p>
                         <p className="text-base font-bold text-[#3c4043] truncate">{selectedCustomer.email || 'Non renseigné'}</p>
                      </div>
                   </div>
                   <div className="h-px bg-gray-100" />
                   <div className="flex items-center gap-6">
                      <div className="w-14 h-14 bg-[#f8f9fa] rounded-2xl border flex items-center justify-center text-[#1a73e8] shadow-inner"><MapPin size={24}/></div>
                      <div>
                         <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Zone de Service</p>
                         <p className="text-base font-bold text-[#3c4043]">{selectedCustomer.address || 'Libreville'}</p>
                      </div>
                   </div>
                </div>
             </section>

             {/* TICKET TIMELINE */}
             <section className="space-y-4">
                <div className="flex items-center justify-between">
                   <h3 className="text-[10px] font-black text-[#9aa0a6] uppercase tracking-[0.2em] flex items-center gap-2"><History size={16} /> Journal des Dossiers SAV</h3>
                   <span className="text-[9px] font-black text-[#1a73e8] uppercase bg-blue-50 px-2 py-1 border border-blue-100 rounded-lg">{customerTickets.length} Entrées</span>
                </div>
                <div className="space-y-4">
                   {customerTickets.map(ticket => (
                     <div key={ticket.id} className="p-6 bg-white border border-[#dadce0] rounded-[32px] shadow-sm hover:border-[#1a73e8] transition-all group cursor-pointer">
                        <div className="flex justify-between items-start mb-4">
                           <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                 <span className="text-[10px] font-black text-[#1a73e8] uppercase bg-blue-50 px-2 py-0.5 rounded border border-blue-100 rounded">#{ticket.id}</span>
                                 <span className="text-[10px] font-bold text-gray-400 uppercase">• {ticket.category}</span>
                              </div>
                              <h4 className="text-sm font-black text-[#3c4043]">{ticket.productName}</h4>
                           </div>
                           <div className={`px-3 py-1 text-[9px] font-black uppercase border shadow-sm ${
                              ticket.status === 'Résolu' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-blue-50 text-blue-700 border-blue-100'
                           }`}>
                              {ticket.status}
                           </div>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-2xl border border-transparent group-hover:border-gray-200 transition-all mb-4">
                           <p className="text-[11px] text-gray-500 italic leading-relaxed">"{ticket.description}"</p>
                        </div>
                        <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                           <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400">
                              <Calendar size={12} /> {new Date(ticket.createdAt).toLocaleDateString('fr-FR', {day:'2-digit', month:'long', year:'numeric'})}
                           </div>
                           <div className="text-[10px] font-black text-[#1a73e8] flex items-center gap-1 group-hover:translate-x-1 transition-transform uppercase tracking-widest">
                              Consulter Audit <ArrowUpRight size={14}/>
                           </div>
                        </div>
                     </div>
                   ))}
                   {customerTickets.length === 0 && (
                     <div className="py-20 text-center border-2 border-dashed border-[#dadce0] rounded-[40px] bg-gray-50">
                        <MessageSquare size={48} className="mx-auto text-gray-200 mb-4 opacity-20" />
                        <p className="text-xs text-gray-400 font-black uppercase tracking-widest">Aucun historique technique</p>
                     </div>
                   )}
                </div>
             </section>
          </div>
        )}
      </Drawer>

      {/* MODAL CRM */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); setEditingCustomer(null); }} 
        title={editingCustomer ? `Expertise Profil : ${editingCustomer.id}` : "Inscription CRM Cloud Horizon"}
        size="lg"
      >
         <form onSubmit={handleSave} className="space-y-10">
            <div className="flex p-1.5 bg-[#f1f3f4] shadow-inner rounded-2xl">
               <button type="button" onClick={() => setCustomerType('Particulier')} className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${customerType === 'Particulier' ? 'bg-white shadow-md text-[#1a73e8]' : 'text-[#5f6368] hover:text-[#202124]'}`}>Compte Particulier</button>
               <button type="button" onClick={() => setCustomerType('Entreprise')} className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${customerType === 'Entreprise' ? 'bg-white shadow-md text-purple-700' : 'text-[#5f6368] hover:text-[#202124]'}`}>Compte Entreprise (B2B)</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-[#5f6368] uppercase ml-1 tracking-widest">Identité du Contact</label>
                  <input name="name" type="text" defaultValue={editingCustomer?.name} required className="h-12 bg-[#f8f9fa] border-none text-sm font-bold" placeholder="Nom complet" />
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-[#5f6368] uppercase ml-1 tracking-widest">Ligne Directe GSM</label>
                  <div className="relative">
                    <Smartphone className="absolute left-3 top-3.5 text-gray-400" size={18} />
                    <input name="phone" type="tel" defaultValue={editingCustomer?.phone} required placeholder="+241 ..." className="h-12 bg-[#f8f9fa] border-none pl-11 text-sm font-black tracking-tight" />
                  </div>
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-[#5f6368] uppercase ml-1 tracking-widest">Adresse de Correspondance</label>
                  <input name="email" type="email" defaultValue={editingCustomer?.email} className="h-12 bg-[#f8f9fa] border-none text-sm font-bold" placeholder="expert@exemple.ga" />
               </div>
               {customerType === 'Entreprise' ? (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-[#5f6368] uppercase ml-1 tracking-widest">Dénomination Sociale</label>
                    <input name="companyName" type="text" defaultValue={editingCustomer?.companyName} required className="h-12 bg-[#f8f9fa] border-none text-sm font-bold" placeholder="ex: CFAO Gabon SA" />
                  </div>
               ) : (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-[#5f6368] uppercase ml-1 tracking-widest">Classification Client</label>
                    <select name="status" defaultValue={editingCustomer?.status || 'Actif'} className="h-12 bg-[#f8f9fa] border-none text-[10px] font-black uppercase tracking-widest w-full px-4">
                       <option value="Actif">Client Standard</option>
                       <option value="VIP">Membre VIP Gold</option>
                       <option value="Litige">Suivi Contentieux</option>
                    </select>
                  </div>
               )}
               <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] font-black text-[#5f6368] uppercase ml-1 tracking-widest">Localisation Résidence / Siège</label>
                  <input name="address" type="text" defaultValue={editingCustomer?.address} placeholder="Quartier, Villa, Rue, Ville..." className="h-12 bg-[#f8f9fa] border-none text-sm font-bold w-full" />
               </div>
            </div>

            <div className="p-6 bg-blue-50 border border-dashed border-blue-200 rounded-3xl flex items-start gap-4">
               <ShieldAlert size={24} className="text-[#1a73e8] mt-1 shrink-0" />
               <div>
                  <p className="text-xs font-black text-blue-800 uppercase tracking-widest">Conformité RGPD / Horizon Privacy</p>
                  <p className="text-[10px] text-blue-600 mt-2 leading-relaxed font-medium uppercase">
                    Les données collectées ici sont strictement réservées à l'usage interne de Royal Plaza pour le suivi des prestations SAV et la facturation. Elles sont synchronisées en temps réel sur le cloud sécurisé Horizon.
                  </p>
               </div>
            </div>

            <div className="flex gap-4 pt-8 border-t border-[#dadce0]">
               <button type="submit" className="btn-google-primary flex-1 justify-center py-5 text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-blue-600/20">
                  <Save size={20} /> Valider la fiche CRM
               </button>
               <button type="button" onClick={() => { setIsModalOpen(false); setEditingCustomer(null); }} className="btn-google-outlined px-12 font-black uppercase text-[10px] tracking-widest">Annuler</button>
            </div>
         </form>
      </Modal>
    </div>
  );
};

export default Customers;
