
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Users, Search, Plus, Mail, Phone, Filter, 
  Edit3, Trash2, Save, Building2, User as UserIcon,
  AlertTriangle, X, CheckCircle2, Loader2, Eye, 
  History, CreditCard, Calendar, ArrowUpRight, MapPin,
  ClipboardList, Ticket as TicketIcon, BadgeCheck, ShieldAlert,
  MessageSquare, Wrench, Package, Activity, Hash, Tag, Lock,
  Archive, RotateCcw, AlertCircle, ChevronLeft, ChevronRight,
  FilterX
} from 'lucide-react';
import { useData, useNotifications } from '../App';
import { Customer, Ticket } from '../types';
import Modal from '../components/Modal';

const ITEMS_PER_PAGE = 20;

const Customers: React.FC = () => {
  const { customers, saveCustomer, deleteCustomer, tickets } = useData();
  const { addNotification } = useNotifications();
  
  // États de recherche et filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [showArchived, setShowArchived] = useState(false); 
  const [filterType, setFilterType] = useState<string>('Tous');
  const [filterStatus, setFilterStatus] = useState<string>('Tous');
  const [showFilterBar, setShowFilterBar] = useState(false);
  
  // États de pagination
  const [currentPage, setCurrentPage] = useState(1);
  
  // États des Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isFullHistoryModalOpen, setIsFullHistoryModalOpen] = useState(false);
  
  // États de sélection
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [previewTicket, setPreviewTicket] = useState<Ticket | null>(null);
  
  const [customerType, setCustomerType] = useState<'Particulier' | 'Entreprise'>('Particulier');
  const [isDeleting, setIsDeleting] = useState(false);

  // RÉINITIALISATION PAGINATION
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, showArchived, filterType, filterStatus]);

  // LOGIQUE DE FILTRAGE COMBINÉE
  const filtered = useMemo(() => {
    const cleanSearch = searchTerm.toLowerCase().trim();
    return (customers || []).filter(c => {
      // 1. Filtre Archive
      const matchesArchiveStatus = showArchived ? c.isArchived === true : !c.isArchived;
      if (!matchesArchiveStatus) return false;

      // 2. Filtre Type
      if (filterType !== 'Tous' && c.type !== filterType) return false;

      // 3. Filtre Statut
      if (filterStatus !== 'Tous' && c.status !== filterStatus) return false;

      // 4. Recherche Textuelle
      const matchesSearch = 
        c.name.toLowerCase().includes(cleanSearch) || 
        c.phone.replace(/\s/g, '').includes(cleanSearch.replace(/\s/g, '')) ||
        (c.companyName && c.companyName.toLowerCase().includes(cleanSearch)) ||
        c.id.toLowerCase().includes(cleanSearch);
      
      return matchesSearch;
    });
  }, [customers, searchTerm, showArchived, filterType, filterStatus]);

  // LOGIQUE DE PAGINATION
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  const normalize = (p?: string) => (p || '').replace(/[^0-9]/g, '').slice(-9);

  const getCustomerTickets = (customerId: string, customerPhone: string) => {
    const targetNorm = normalize(customerPhone);
    return tickets.filter(t => 
      (t.customerId === customerId) || 
      (targetNorm !== '' && normalize(t.customerPhone) === targetNorm)
    ).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  };

  const openAddModal = () => {
    setEditingCustomer(null);
    setCustomerType('Particulier');
    setIsModalOpen(true);
  };

  const openEditModal = (customer: Customer) => {
    if (customer.isArchived) return;
    setEditingCustomer(customer);
    setCustomerType(customer.type);
    setIsModalOpen(true);
  };

  const confirmDelete = (e: React.MouseEvent, customer: Customer) => {
    e.stopPropagation();
    setCustomerToDelete(customer);
    setIsDeleteModalOpen(true);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setFilterType('Tous');
    setFilterStatus('Tous');
  };

  const handleArchive = async () => {
    if (!customerToDelete) return;
    setIsDeleting(true);
    try {
      await deleteCustomer(customerToDelete.id);
      setIsDeleteModalOpen(false);
      setCustomerToDelete(null);
      if (selectedCustomer?.id === customerToDelete.id) setSelectedCustomer(null);
    } catch (err) {
      addNotification({ title: 'Erreur', message: 'L\'archivage a échoué.', type: 'error' });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRestore = async (e: React.MouseEvent, customer: Customer) => {
    e.stopPropagation();
    try {
      const restoredCustomer: Customer = {
        ...customer,
        status: 'Actif',
        isArchived: false
      };
      await saveCustomer(restoredCustomer);
      addNotification({ title: 'Client Restauré', message: `${customer.name} est de retour.`, type: 'success' });
    } catch (e) {}
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newCustomer: Customer = {
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
      lastVisit: editingCustomer?.lastVisit || new Date().toISOString().split('T')[0],
      isArchived: editingCustomer?.isArchived || false
    };

    try {
      await saveCustomer(newCustomer);
      setIsModalOpen(false);
      setEditingCustomer(null);
      addNotification({ title: 'Fiche Client', message: `Le client ${newCustomer.name} a été enregistré.`, type: 'success' });
    } catch (err) {
      addNotification({ title: 'Erreur', message: 'Impossible de sauvegarder le client.', type: 'error' });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'VIP': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Litige': return 'bg-red-100 text-red-700 border-red-200';
      case 'Client supprimé': return 'bg-gray-200 text-gray-700 border-gray-300 font-black';
      default: return 'bg-green-100 text-green-700 border-green-200';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-normal text-[#3c4043]">
            {showArchived ? 'Archives CRM' : 'Base Clients Horizon'}
          </h1>
          <p className="text-[#5f6368] text-sm">
            {showArchived ? 'Historique des comptes supprimés.' : 'Gestion centralisée du carnet d\'adresses.'}
          </p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setShowArchived(!showArchived)} 
            className={`flex items-center gap-2 px-5 py-2 rounded-md font-bold text-xs uppercase tracking-widest transition-all border-2 ${
              showArchived 
              ? 'bg-[#202124] text-white border-[#202124] shadow-md' 
              : 'bg-white text-[#5f6368] border-[#dadce0] hover:bg-[#f8f9fa]'
            }`}
          >
            {showArchived ? <Users size={16} /> : <Archive size={16} />}
            {showArchived ? 'Fiches Actives' : 'Voir les Archives'}
          </button>
          
          {!showArchived && (
            <button onClick={openAddModal} className="btn-google-primary shadow-sm active:scale-95">
              <Plus size={18} /> Nouveau Client
            </button>
          )}
        </div>
      </header>

      {showArchived && (
        <div className="bg-amber-50 border-l-4 border-amber-400 p-4 flex items-center gap-4 animate-in slide-in-from-top-2 shadow-sm">
           <AlertCircle className="text-amber-600" size={20} />
           <p className="text-xs font-bold text-amber-800 uppercase tracking-widest">
              Mode Consultation Archive : Les modifications sont désactivées.
           </p>
        </div>
      )}

      <div className={`google-card overflow-hidden flex flex-col ${showArchived ? 'opacity-95 border-amber-200 bg-amber-50/10' : ''}`}>
        {/* BARRE DE RECHERCHE & TOGGLE FILTRES */}
        <div className="px-6 py-4 border-b border-[#dadce0] flex items-center justify-between bg-[#f8f9fa] gap-4">
           <div className="flex items-center gap-3 flex-1">
              <div className="relative flex-1 max-w-md">
                 <Search className="absolute left-3 top-2.5 text-[#5f6368]" size={16} />
                 <input 
                  type="text" 
                  placeholder="Rechercher (Nom, Mobile, ID...)" 
                  value={searchTerm} 
                  onChange={e => setSearchTerm(e.target.value)} 
                  className="pl-10 h-10" 
                 />
              </div>
              <button 
                onClick={() => setShowFilterBar(!showFilterBar)}
                className={`p-2 rounded-full transition-colors ${showFilterBar ? 'bg-[#1a73e8] text-white' : 'text-[#5f6368] hover:bg-[#e8eaed]'}`}
                title="Plus de filtres"
              >
                <Filter size={20} />
              </button>
              {(filterType !== 'Tous' || filterStatus !== 'Tous') && (
                <button onClick={resetFilters} className="text-[#1a73e8] text-xs font-bold uppercase flex items-center gap-1 hover:underline">
                  <FilterX size={14} /> Effacer les filtres
                </button>
              )}
           </div>
           <span className="text-xs text-[#5f6368] font-black uppercase tracking-widest hidden sm:block">
            {filtered.length} fiches trouvées
           </span>
        </div>

        {/* BARRE DE FILTRES AVANCÉS */}
        {showFilterBar && (
          <div className="px-6 py-4 bg-[#f1f3f4]/50 border-b border-[#dadce0] grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-top-2">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest">Type de client</label>
              <select 
                value={filterType} 
                onChange={(e) => setFilterType(e.target.value)}
                className="h-9 text-xs bg-white border-[#dadce0] rounded-md"
              >
                <option value="Tous">Tous les types</option>
                <option value="Particulier">Particulier</option>
                <option value="Entreprise">Entreprise</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest">Statut CRM</label>
              <select 
                value={filterStatus} 
                onChange={(e) => setFilterStatus(e.target.value)}
                className="h-9 text-xs bg-white border-[#dadce0] rounded-md"
              >
                <option value="Tous">Tous les statuts</option>
                <option value="Actif">Actif</option>
                <option value="VIP">VIP</option>
                <option value="Litige">Litige</option>
              </select>
            </div>
          </div>
        )}
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#dadce0] bg-[#f8f9fa] text-[#5f6368] text-[10px] font-bold uppercase tracking-wider">
                <th className="px-6 py-4">Client / Société</th>
                <th className="px-6 py-4 text-center">Profil</th>
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#dadce0]">
              {paginatedCustomers.map(customer => (
                <tr 
                  key={customer.id} 
                  onClick={() => setSelectedCustomer(customer)}
                  className={`hover:bg-[#f8f9fa] transition-colors group cursor-pointer ${customer.isArchived ? 'bg-gray-50/50' : ''}`}
                >
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-4">
                       <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border ${customer.isArchived ? 'bg-gray-100 text-gray-400 border-gray-200' : customer.type === 'Entreprise' ? 'bg-purple-50 text-purple-600 border-purple-100' : 'bg-[#e8f0fe] text-[#1a73e8] border-[#d2e3fc]'}`}>
                         {customer.type === 'Entreprise' ? <Building2 size={18}/> : customer.name[0]}
                       </div>
                       <div>
                          <div className="flex items-center gap-2">
                            <p className={`text-sm font-bold ${customer.isArchived ? 'text-gray-400 line-through decoration-gray-300' : 'text-[#3c4043]'}`}>{customer.name}</p>
                            <span className="text-[9px] text-[#5f6368] font-mono font-bold">#{customer.id}</span>
                          </div>
                          {customer.companyName && <p className="text-[10px] text-purple-700 font-bold uppercase tracking-tight">{customer.companyName}</p>}
                       </div>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter ${getStatusColor(customer.status)}`}>
                        {customer.status}
                      </span>
                      <span className="text-[8px] text-[#5f6368] font-bold uppercase">{customer.type}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="space-y-1">
                       <div className="flex items-center gap-2 text-xs font-medium text-[#3c4043]"><Phone size={12} className={customer.isArchived ? 'text-gray-400' : 'text-[#1a73e8]'} /> {customer.phone}</div>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                       <button onClick={(e) => { e.stopPropagation(); setSelectedCustomer(customer); }} className="p-2 text-[#5f6368] hover:bg-[#e8f0fe] hover:text-[#1a73e8] rounded-full" title="Détails"><Eye size={18} /></button>
                       {customer.isArchived ? (
                         <button onClick={(e) => handleRestore(e, customer)} className="p-2 text-green-600 hover:bg-green-50 rounded-full" title="Restaurer"><RotateCcw size={16} /></button>
                       ) : (
                         <>
                           <button onClick={(e) => { e.stopPropagation(); openEditModal(customer); }} className="p-2 text-[#5f6368] hover:bg-[#e8f0fe] rounded-full" title="Modifier"><Edit3 size={16} /></button>
                           <button 
                              onClick={(e) => confirmDelete(e, customer)} 
                              className="p-2 text-[#5f6368] hover:bg-orange-50 hover:text-orange-600 rounded-full transition-colors" 
                              title="Déplacer aux archives"
                            >
                              <Archive size={16} />
                            </button>
                         </>
                       )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filtered.length === 0 && (
            <div className="py-24 text-center">
               <Users size={48} className="mx-auto text-[#dadce0] mb-4" />
               <p className="text-[#5f6368] text-sm font-medium uppercase tracking-widest">Aucune fiche correspondante</p>
               <button onClick={resetFilters} className="mt-4 text-[#1a73e8] text-xs font-bold uppercase hover:underline">Réinitialiser les filtres</button>
            </div>
          )}
        </div>

        {/* PAGINATION CONTROLS */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-[#dadce0] bg-[#f8f9fa] flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-[10px] text-[#5f6368] font-black uppercase tracking-widest">
              Affichage {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} sur {filtered.length} clients
            </span>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-md border border-[#dadce0] bg-white text-[#5f6368] disabled:opacity-30 hover:bg-[#f1f3f4] transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                  // Logic to show only some pages if many
                  if (totalPages > 5 && (page < currentPage - 2 || page > currentPage + 2)) {
                    if (page === 1 || page === totalPages) return <span key={page} className="px-2 text-[#5f6368]">.</span>;
                    return null;
                  }
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-8 h-8 rounded-md text-xs font-bold transition-all ${
                        currentPage === page 
                          ? 'bg-[#1a73e8] text-white shadow-md' 
                          : 'bg-white text-[#5f6368] border border-[#dadce0] hover:bg-[#f1f3f4]'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
              </div>

              <button 
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-md border border-[#dadce0] bg-white text-[#5f6368] disabled:opacity-30 hover:bg-[#f1f3f4] transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* DETAIL DRAWER */}
      {selectedCustomer && (
        <>
          <div className="fixed inset-0 bg-black/25 backdrop-blur-[2px] z-[60] animate-in fade-in" onClick={() => setSelectedCustomer(null)} />
          <div className="fixed right-0 top-0 h-screen w-[580px] bg-white z-[70] flex flex-col shadow-[-15px_0_40px_-10px_rgba(0,0,0,0.15)] animate-in slide-in-from-right duration-300">
             <div className={`p-4 border-b border-[#dadce0] flex items-center justify-between ${selectedCustomer.isArchived ? 'bg-amber-50/30' : 'bg-[#f8f9fa]'}`}>
                <div className="flex items-center gap-3">
                   <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${selectedCustomer.isArchived ? 'bg-amber-100 text-amber-600' : 'bg-[#e8f0fe] text-[#1a73e8]'}`}><BadgeCheck size={18} /></div>
                   <div>
                      <h2 className="text-sm font-bold text-[#3c4043] uppercase tracking-widest">{selectedCustomer.isArchived ? 'Fiche Archive (Masquée)' : 'Fiche CRM Client'}</h2>
                      <p className="text-[10px] text-[#5f6368] font-black uppercase tracking-widest">ID: {selectedCustomer.id}</p>
                   </div>
                </div>
                <div className="flex gap-2">
                   {!selectedCustomer.isArchived && <button onClick={() => { setSelectedCustomer(null); openEditModal(selectedCustomer); }} className="p-2 hover:bg-[#e8eaed] rounded-full text-[#1a73e8]"><Edit3 size={18}/></button>}
                   <button onClick={() => setSelectedCustomer(null)} className="p-2 hover:bg-[#e8eaed] rounded-full text-[#5f6368]"><X size={18}/></button>
                </div>
             </div>

             <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar pb-24">
                <div className="flex items-center gap-6">
                   <div className={`w-24 h-24 rounded-2xl flex items-center justify-center font-black text-4xl border-4 border-white shadow-md ${selectedCustomer.isArchived ? 'bg-gray-100 text-gray-400 grayscale' : selectedCustomer.type === 'Entreprise' ? 'bg-purple-100 text-purple-700' : 'bg-[#e8f0fe] text-[#1a73e8]'}`}>
                      {selectedCustomer.type === 'Entreprise' ? <Building2 size={40}/> : selectedCustomer.name[0]}
                   </div>
                   <div className="space-y-1 flex-1">
                      <h3 className={`text-2xl font-black tracking-tight ${selectedCustomer.isArchived ? 'text-gray-400' : 'text-[#3c4043]'}`}>{selectedCustomer.name}</h3>
                      <p className="text-xs text-[#5f6368] font-bold uppercase tracking-widest flex items-center gap-2">
                         {selectedCustomer.type} • {selectedCustomer.companyName || 'Compte Personnel'}
                      </p>
                      <div className="pt-2">
                         <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusColor(selectedCustomer.status)}`}>
                           {selectedCustomer.status}
                         </span>
                      </div>
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="p-5 bg-[#f8f9fa] border border-[#dadce0] rounded-2xl">
                      <p className="text-[9px] font-black text-[#5f6368] uppercase tracking-widest mb-1">Historique Dossiers</p>
                      <div className="flex items-center gap-2">
                         <TicketIcon size={18} className="text-[#1a73e8]" />
                         <span className="text-2xl font-black text-[#3c4043]">{selectedCustomer.ticketsCount}</span>
                      </div>
                   </div>
                   <div className="p-5 bg-green-50 border border-green-100 rounded-2xl">
                      <p className="text-[9px] font-black text-green-700 uppercase tracking-widest mb-1">Chiffre d'affaires</p>
                      <div className="flex items-center gap-2">
                         <CreditCard size={18} className="text-green-600" />
                         <span className="text-xl font-black text-green-700">{(selectedCustomer.totalSpent || 0).toLocaleString()} <span className="text-[10px]">FCFA</span></span>
                      </div>
                   </div>
                </div>

                <section className="space-y-4">
                   <h4 className="text-[10px] font-black text-[#9aa0a6] uppercase tracking-[0.2em] flex items-center gap-2">
                      <Phone size={16} /> Coordonnées
                   </h4>
                   <div className="space-y-4 bg-white border border-[#dadce0] rounded-2xl p-6 shadow-sm">
                      <div className="flex items-center gap-4">
                         <div className="w-10 h-10 bg-[#f1f3f4] rounded-xl flex items-center justify-center text-[#5f6368]"><Phone size={18}/></div>
                         <div><p className="text-[9px] font-black text-[#5f6368] uppercase tracking-widest">Mobile Direct</p><p className="text-sm font-bold text-[#3c4043]">{selectedCustomer.phone}</p></div>
                      </div>
                   </div>
                </section>

                <section className="space-y-4">
                   <div className="flex items-center justify-between">
                      <h4 className="text-[10px] font-black text-[#9aa0a6] uppercase tracking-[0.2em] flex items-center gap-2">
                         <History size={16} /> Historique des Dossiers {selectedCustomer.isArchived && '(Archivés)'}
                      </h4>
                      <button onClick={() => setIsFullHistoryModalOpen(true)} className="text-[9px] font-black text-[#1a73e8] uppercase hover:underline">Voir les {getCustomerTickets(selectedCustomer.id, selectedCustomer.phone).length} dossiers</button>
                   </div>
                   <div className="space-y-3">
                      {getCustomerTickets(selectedCustomer.id, selectedCustomer.phone).slice(0, 3).map(ticket => (
                        <div key={ticket.id} onClick={(e) => { e.stopPropagation(); setPreviewTicket(ticket); }} className="p-4 bg-white border border-[#dadce0] rounded-2xl flex items-center justify-between hover:border-[#1a73e8] cursor-pointer transition-all group shadow-sm">
                           <div className="flex items-center gap-4">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${getStatusColor(ticket.status)}`}><ClipboardList size={18} /></div>
                              <div>
                                 <p className="text-xs font-bold text-[#3c4043]">#{ticket.id} • {ticket.category}</p>
                                 <p className="text-[10px] text-[#5f6368]">{new Date(ticket.createdAt).toLocaleDateString()}</p>
                              </div>
                           </div>
                           <div className="flex items-center gap-3">
                              <span className={`text-[9px] font-black px-2 py-1 rounded border uppercase ${getStatusColor(ticket.status)}`}>{ticket.status}</span>
                              <ArrowUpRight size={16} className="text-[#dadce0] group-hover:text-[#1a73e8]" />
                           </div>
                        </div>
                      ))}
                   </div>
                </section>
             </div>

             <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-[#dadce0] bg-white flex gap-3">
                {selectedCustomer.isArchived ? (
                  <button onClick={(e) => { handleRestore(e, selectedCustomer); setSelectedCustomer(null); }} className="flex-1 btn-google-primary justify-center py-4 bg-green-600 hover:bg-green-700 text-xs font-black uppercase tracking-widest border-none shadow-xl"><RotateCcw size={16} /> Restaurer le dossier</button>
                ) : (
                  <button onClick={() => setIsContactModalOpen(true)} className="flex-1 btn-google-primary justify-center py-4 text-xs font-black uppercase tracking-widest"><Phone size={16} /> Contacter le client</button>
                )}
                {!selectedCustomer.isArchived && <button onClick={(e) => confirmDelete(e, selectedCustomer)} className="p-3 bg-orange-50 text-orange-600 rounded-xl hover:bg-orange-100 transition-colors"><Archive size={24} /></button>}
             </div>
          </div>
        </>
      )}

      {/* MODAL ARCHIVAGE CONFIRMATION */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => !isDeleting && setIsDeleteModalOpen(false)} title="Confirmation d'Archivage" size="sm">
        <div className="space-y-6">
          <div className="flex items-start gap-4 p-4 bg-orange-50 border border-orange-100 rounded-lg">
             <AlertTriangle className="text-orange-600 shrink-0 mt-1" size={24} />
             <div>
                <p className="text-sm font-bold text-orange-700">Déplacer vers les archives</p>
                <p className="text-xs text-orange-600 mt-1">
                   Le client <span className="font-bold underline">{customerToDelete?.name}</span> sera masqué mais restera consultable.
                </p>
             </div>
          </div>
          <div className="flex gap-3">
             <button onClick={handleArchive} disabled={isDeleting} className="btn-google-primary flex-1 bg-orange-600 hover:bg-orange-700 border-none justify-center py-3">
                {isDeleting ? <Loader2 size={18} className="animate-spin" /> : 'Archiver maintenant'}
             </button>
             <button onClick={() => setIsDeleteModalOpen(false)} className="btn-google-outlined flex-1">Annuler</button>
          </div>
        </div>
      </Modal>

      {/* MODAL GESTION CLIENT */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingCustomer ? `Modifier : ${editingCustomer.name}` : "Nouveau Client Plaza"}>
        <form onSubmit={handleSave} className="space-y-6">
           <div className="flex p-1 bg-[#f1f3f4] rounded-lg">
              <button type="button" onClick={() => setCustomerType('Particulier')} className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${customerType === 'Particulier' ? 'bg-white shadow-sm text-[#1a73e8]' : 'text-[#5f6368]'}`}>Particulier</button>
              <button type="button" onClick={() => setCustomerType('Entreprise')} className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${customerType === 'Entreprise' ? 'bg-white shadow-sm text-purple-700' : 'text-[#5f6368]'}`}>Entreprise</button>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
              <div className="space-y-1.5"><label className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest">{customerType === 'Entreprise' ? 'Contact Principal' : 'Nom Complet'}</label><input name="name" type="text" defaultValue={editingCustomer?.name || ''} required className="bg-white" /></div>
              <div className="space-y-1.5"><label className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest">Mobile</label><input name="phone" type="tel" defaultValue={editingCustomer?.phone || ''} required className="bg-white font-bold" /></div>
              {customerType === 'Entreprise' && <div className="md:col-span-2 space-y-1.5"><label className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest">Raison Sociale</label><input name="companyName" type="text" defaultValue={editingCustomer?.companyName || ''} required className="bg-white" /></div>}
              <div className="space-y-1.5"><label className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest">Statut</label><select name="status" defaultValue={editingCustomer?.status || 'Actif'} className="bg-white"><option value="Actif">Actif</option><option value="VIP">VIP</option><option value="Litige">Litige</option></select></div>
              <div className="md:col-span-2 space-y-1.5"><label className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest">Adresse</label><input name="address" type="text" defaultValue={editingCustomer?.address || ''} required className="bg-white" /></div>
           </div>
           <div className="flex gap-3 pt-6 border-t border-[#dadce0]"><button type="submit" className="btn-google-primary flex-1 justify-center py-3"><Save size={18} />{editingCustomer ? 'Mettre à jour' : 'Créer la fiche'}</button><button type="button" onClick={() => setIsModalOpen(false)} className="btn-google-outlined flex-1">Annuler</button></div>
        </form>
      </Modal>

      {/* MODAL CONTACT CLIENT */}
      <Modal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} title="Mise en relation client" size="sm">
        <div className="space-y-6 text-center">
           <div className="w-16 h-16 bg-[#e8f0fe] text-[#1a73e8] rounded-full flex items-center justify-center mx-auto shadow-sm"><Phone size={32} /></div>
           <div><p className="text-sm font-bold text-[#3c4043]">{selectedCustomer?.name}</p><p className="text-xs text-[#5f6368] mt-1">{selectedCustomer?.phone}</p></div>
           <div className="space-y-3 pt-4">
              <a href={`tel:${selectedCustomer?.phone}`} className="w-full flex items-center justify-center gap-3 py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-md transition-all">
                <Phone size={20} /> Appel GSM Direct
              </a>
              <a href={`https://wa.me/${selectedCustomer?.phone?.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="w-full flex items-center justify-center gap-3 py-4 bg-[#25D366] text-white rounded-xl font-bold hover:bg-[#128C7E] shadow-md transition-all">
                <MessageSquare size={20} /> Message WhatsApp
              </a>
           </div>
           <button onClick={() => setIsContactModalOpen(false)} className="w-full py-3 text-[10px] font-black uppercase tracking-widest text-[#5f6368] pt-6">Fermer</button>
        </div>
      </Modal>

      {/* MODAL: TOUT L'HISTORIQUE CLIENT */}
      <Modal isOpen={isFullHistoryModalOpen} onClose={() => setIsFullHistoryModalOpen(false)} title={`Historique Complet : ${selectedCustomer?.name}`} size="lg">
         <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
            {selectedCustomer && getCustomerTickets(selectedCustomer.id, selectedCustomer.phone).map(ticket => (
              <div key={ticket.id} onClick={() => { setPreviewTicket(ticket); }} className="p-4 bg-white border border-[#dadce0] rounded-xl flex items-center justify-between hover:border-[#1a73e8] cursor-pointer group shadow-sm transition-all">
                <div className="flex items-center gap-4">
                   <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${getStatusColor(ticket.status)}`}><Hash size={14} /></div>
                   <div>
                      <p className="text-xs font-bold text-[#3c4043]">Dossier #{ticket.id} • {ticket.category}</p>
                      <p className="text-[10px] text-[#5f6368]">{new Date(ticket.createdAt).toLocaleDateString()} • {ticket.productName || 'Matériel Plaza'}</p>
                   </div>
                </div>
                <div className="flex items-center gap-3">
                   <span className={`text-[8px] font-black px-2 py-1 rounded border uppercase ${getStatusColor(ticket.status)}`}>{ticket.status}</span>
                   <ArrowUpRight size={14} className="text-[#dadce0] group-hover:text-[#1a73e8]" />
                </div>
              </div>
            ))}
         </div>
      </Modal>
    </div>
  );
};

export default Customers;
