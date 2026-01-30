
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, Search, RefreshCw, Filter, MoreHorizontal, 
  Sparkles, User, Clock, CheckCircle2, 
  AlertCircle, DollarSign, X, ChevronRight, ClipboardCheck, Info,
  Calendar, CreditCard, FileText, Settings, Activity, Save, Package,
  Edit3, Trash2, UserPlus, MapPin, Printer, Share2, MessageSquare,
  TrendingUp, Truck, Wrench, Users, History, AlertTriangle, ShieldCheck, Lock,
  ShieldAlert, Tag, Hash, Archive, Eye, Smartphone, Briefcase, Play,
  Zap, Map, Layers, Target, Headphones
} from 'lucide-react';
import { useData, useNotifications, useUser } from '../App';
import { Ticket, TicketStatus, TicketCategory, Showroom, UsedPart, Customer } from '../types';
import Modal from '../components/Modal';
import Drawer from '../components/Drawer';

const Tickets: React.FC = () => {
  const { 
    tickets, refreshAll, isSyncing, technicians, products, 
    customers, saveTicket, saveCustomer, deleteTicket, showrooms 
  } = useData();
  const { currentUser } = useUser();
  const { addNotification } = useNotifications();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => { 
    refreshAll();
    const interval = setInterval(() => setCurrentTime(new Date()), 10000);
    return () => clearInterval(interval);
  }, []);

  const openAddModal = () => {
    setEditingTicket(null);
    setIsModalOpen(true);
  };

  const openEditModal = (ticket: Ticket) => {
    setEditingTicket(ticket);
    setIsModalOpen(true);
  };

  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      if (t.isArchived) return false;
      if (currentUser?.role === 'TECHNICIAN' && t.assignedTechnicianId !== currentUser.id) {
        return false;
      }
      const matchesSearch = (t.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (t.id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (t.serialNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (t.productName || '').toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });
  }, [tickets, searchTerm, currentUser]);

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
        message: `Dossier #${ticketData.id} synchronisé avec le CRM.`, 
        type: 'success' 
      });
      await refreshAll();
    } catch (err) {
      addNotification({ title: 'Erreur Sync', message: 'Vérifiez la structure de votre base Cloud.', type: 'error' });
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Archiver définitivement ce dossier ?")) {
      await deleteTicket(id);
      setSelectedTicket(null);
      addNotification({ title: 'Dossier Archivé', message: 'Le ticket a été déplacé vers les archives cloud.', type: 'info' });
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
    <div className="relative h-[calc(100vh-100px)] flex flex-col space-y-6 animate-page-entry">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-normal text-[#3c4043]">Tickets & SAV</h1>
          <p className="text-[#5f6368] text-sm">Gestion des dossiers synchronisée avec le CRM Horizon.</p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
             <Search className="absolute left-3 top-3 text-[#5f6368]" size={18} />
             <input 
              type="text" 
              placeholder="Rechercher..." 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              className="w-64 pl-10 h-11 bg-white shadow-sm !border-[#dadce0]" 
             />
          </div>
          {currentUser?.role !== 'TECHNICIAN' && (
            <button onClick={openAddModal} className="btn-google-primary shadow-lg shadow-blue-600/10 h-11">
              <Plus size={18} /> Ouvrir Dossier
            </button>
          )}
        </div>
      </header>

      <div className="google-card overflow-hidden flex-1 flex flex-col shadow-xl border-none">
        <div className="px-6 py-3 border-b border-[#dadce0] flex items-center justify-between bg-[#f8f9fa]">
           <div className="flex items-center gap-4">
              <span className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest">{filteredTickets.length} Dossiers Actifs</span>
           </div>
           <button onClick={refreshAll} className="text-[#5f6368] hover:bg-[#e8eaed] p-2 rounded-full transition-colors active:scale-90">
              <RefreshCw size={18} className={isSyncing ? 'animate-spin' : ''} />
           </button>
        </div>
        
        <div className="overflow-y-auto flex-1 custom-scrollbar">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-white z-10 border-b border-[#dadce0]">
              <tr className="text-[#5f6368] text-[10px] font-black uppercase tracking-widest">
                <th className="px-6 py-4">ID & Showroom</th>
                <th className="px-6 py-4">Client & Matériel</th>
                <th className="px-6 py-4">Expert Assigné</th>
                <th className="px-6 py-4 text-center">État</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#dadce0]">
              {filteredTickets.map((ticket, idx) => (
                <tr 
                  key={ticket.id} 
                  onClick={() => setSelectedTicket(ticket)}
                  className={`hover:bg-[#f8faff] transition-all cursor-pointer group ${selectedTicket?.id === ticket.id ? 'bg-[#e8f0fe]' : ''} animate-in fade-in slide-in-from-bottom-2 ${ticket.priority === 'Urgent' ? 'border-l-4 border-l-red-500' : ''}`}
                  style={{ animationDelay: `${idx * 0.04}s`, animationFillMode: 'both' }}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                       <span className="font-black text-[#1a73e8]">#{ticket.id}</span>
                       {isRecent(ticket.createdAt) && <span className="badge-new">NOUVEAU</span>}
                       {ticket.priority === 'Urgent' && <span className="px-2 py-0.5 bg-red-600 text-white text-[8px] font-black rounded-full animate-pulse">URGENT</span>}
                    </div>
                    <p className="text-[9px] text-[#5f6368] font-black uppercase mt-1 tracking-wider">{ticket.showroom}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-[#3c4043] group-hover:text-[#1a73e8] transition-colors">{ticket.customerName}</p>
                    <p className="text-[10px] text-[#5f6368] truncate max-w-[250px] mt-0.5 italic flex items-center gap-2">
                        <Tag size={10} className="text-[#1a73e8]" /> {ticket.brand} • {ticket.productName}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#f1f3f4] flex items-center justify-center text-[#5f6368] border border-[#dadce0]">
                        <User size={14} />
                      </div>
                      <span className="text-xs font-bold text-[#5f6368]">
                        {technicians.find(tech => tech.id === ticket.assignedTechnicianId)?.name || 'Non assigné'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase border shadow-sm ${getStatusColor(ticket.status)}`}>
                      {ticket.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredTickets.length === 0 && (
              <div className="py-32 text-center">
                  <Archive size={48} className="mx-auto text-gray-200 mb-4" />
                  <p className="text-sm font-black text-gray-400 uppercase tracking-widest">Aucun dossier trouvé</p>
              </div>
          )}
        </div>
      </div>

      {/* DETAIL DRAWER */}
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
                    <button 
                      onClick={() => handleStartIntervention(selectedTicket)}
                      className="flex-1 btn-google-primary justify-center py-4 text-xs font-black uppercase tracking-widest shadow-xl bg-green-600 hover:bg-green-700"
                    >
                       <Play size={16} /> Démarrer l'intervention
                    </button>
                  ) : (
                    <button className="flex-1 btn-google-primary justify-center py-4 text-xs font-black uppercase tracking-widest shadow-xl">
                       <Wrench size={16} /> Rapporter Intervention
                    </button>
                  )}
                </>
              ) : (
                <>
                  <button onClick={() => selectedTicket && openEditModal(selectedTicket)} className="flex-1 btn-google-outlined justify-center text-xs font-black uppercase tracking-widest">Modifier le Dossier</button>
                  <button onClick={() => selectedTicket && handleDelete(selectedTicket.id)} className="p-4 bg-red-50 text-red-600 rounded-2xl hover:bg-red-600 hover:text-white transition-all"><Trash2 size={20}/></button>
                </>
              )}
          </div>
        }
      >
        {selectedTicket && (
          <div className="space-y-10 animate-in fade-in duration-300">
             {/* STATUS & CHRONO */}
             <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-white border border-[#dadce0] rounded-2xl">
                   <p className="text-[9px] font-black text-[#5f6368] uppercase mb-2 tracking-widest">État Actuel</p>
                   <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${getStatusColor(selectedTicket.status)}`}>{selectedTicket.status}</span>
                </div>
                <div className="p-4 bg-white border border-[#dadce0] rounded-2xl">
                   <p className="text-[9px] font-black text-[#5f6368] uppercase mb-2 tracking-widest flex items-center gap-2"><Clock size={12} className="text-[#1a73e8]"/> Chrono Intervention</p>
                   {selectedTicket.status === 'En cours' ? (
                     <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-[#1a73e8] animate-pulse">● {getLiveDuration(selectedTicket.interventionReport?.startedAt)}</span>
                     </div>
                   ) : selectedTicket.interventionReport?.durationMs ? (
                     <span className="text-sm font-black text-[#3c4043]">{formatDuration(selectedTicket.interventionReport.durationMs)}</span>
                   ) : (
                     <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest italic">Non démarré</span>
                   )}
                </div>
             </div>

             {/* CUSTOMER INFO */}
             <section className="space-y-4">
                <h3 className="text-[10px] font-black text-[#9aa0a6] uppercase tracking-[0.2em] flex items-center gap-2"><User size={16} /> Informations Client</h3>
                <div className="p-5 bg-[#f8f9fa] border border-[#dadce0] rounded-2xl space-y-3 shadow-sm">
                   <div>
                      <p className="text-[9px] text-[#5f6368] font-bold uppercase">Contact Principal</p>
                      <p className="text-sm font-black text-[#3c4043]">{selectedTicket.customerName}</p>
                   </div>
                   <div className="flex items-center gap-4 pt-3 border-t border-[#dadce0]/50">
                      <div className="flex items-center gap-2"><Smartphone size={14} className="text-[#1a73e8]" /><span className="text-xs font-bold text-[#3c4043] font-mono">{selectedTicket.customerPhone}</span></div>
                      <div className="flex items-center gap-2"><MapPin size={14} className="text-[#1a73e8]" /><span className="text-xs font-bold text-[#5f6368]">{selectedTicket.location || selectedTicket.showroom}</span></div>
                   </div>
                </div>
             </section>

             {/* PRODUCT INFO */}
             <section className="space-y-4">
                <h3 className="text-[10px] font-black text-[#9aa0a6] uppercase tracking-[0.2em] flex items-center gap-2"><Package size={16} /> Équipement & Diagnostic</h3>
                <div className="p-5 bg-white border border-[#dadce0] rounded-2xl space-y-4 shadow-md">
                   <div className="flex items-start justify-between">
                      <div>
                         <span className="text-[10px] font-black text-[#1a73e8] uppercase tracking-widest">{selectedTicket.brand}</span>
                         <h4 className="text-sm font-bold text-[#3c4043]">{selectedTicket.productName}</h4>
                      </div>
                      <div className="text-right">
                         <p className="text-[9px] text-[#5f6368] font-bold uppercase">N/S</p>
                         <p className="text-xs font-mono font-black text-[#3c4043]">{selectedTicket.serialNumber || 'NON SPÉCIFIÉ'}</p>
                      </div>
                   </div>
                   <div className="p-4 bg-[#f8f9fa] border border-dashed border-[#dadce0] rounded-xl italic text-xs leading-relaxed text-[#5f6368]">
                      "{selectedTicket.description}"
                   </div>
                </div>
             </section>

             {/* ASSIGNED TECH */}
             <section className="space-y-4">
                <h3 className="text-[10px] font-black text-[#9aa0a6] uppercase tracking-[0.2em] flex items-center gap-2"><Briefcase size={16} /> Expert Technique</h3>
                <div className="p-5 bg-[#f8f9fa] border border-[#dadce0] rounded-2xl flex items-center justify-between shadow-sm">
                   {selectedTicket.assignedTechnicianId ? (
                     <div className="flex items-center gap-3">
                        <img src={technicians.find(t => t.id === selectedTicket.assignedTechnicianId)?.avatar} className="w-10 h-10 rounded-full border border-[#dadce0]" alt="" />
                        <div>
                           <p className="text-xs font-bold text-[#3c4043]">{technicians.find(t => t.id === selectedTicket.assignedTechnicianId)?.name}</p>
                           <p className="text-[9px] text-[#1a73e8] font-black uppercase">Expert Horizon Certifié</p>
                        </div>
                     </div>
                   ) : (
                     <p className="text-xs text-gray-400 italic">Aucun expert assigné pour le moment.</p>
                   )}
                </div>
             </section>
          </div>
        )}
      </Drawer>

      {/* MODAL CREATION/EDITION */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingTicket ? `Audit Dossier #${editingTicket.id}` : "Ouverture de Dossier SAV Horizon Cloud"}
        size="xl"
      >
         <form onSubmit={handleSave} className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
               
               <div className="space-y-6">
                  <div className="flex items-center gap-3 border-b pb-3">
                     <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center"><User size={18}/></div>
                     <h3 className="text-xs font-black uppercase tracking-widest text-gray-700">Information Client</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest ml-1">Nom du Client</label>
                      <input name="customerName" type="text" required defaultValue={editingTicket?.customerName} placeholder="Nom complet" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest ml-1">Mobile GSM</label>
                      <input name="customerPhone" type="tel" required defaultValue={editingTicket?.customerPhone} placeholder="+241 ..." className="font-bold" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest ml-1">Source de la demande</label>
                      <select name="source" defaultValue={editingTicket?.source || 'WhatsApp'}>
                        <option value="WhatsApp">WhatsApp Business</option>
                        <option value="Phone">Appel Téléphonique</option>
                        <option value="Email">Email SAV</option>
                        <option value="Interne">Showroom / Boutique</option>
                        <option value="Messenger">Messenger Plaza</option>
                      </select>
                    </div>
                  </div>
               </div>

               <div className="space-y-6">
                  <div className="flex items-center gap-3 border-b pb-3">
                     <div className="w-8 h-8 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center"><Package size={18}/></div>
                     <h3 className="text-xs font-black uppercase tracking-widest text-gray-700">Détails Équipement</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                       <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest ml-1">Marque</label>
                        <select name="brand" defaultValue={editingTicket?.brand || 'LG'}>
                           <option value="LG">LG</option>
                           <option value="Beko">Beko</option>
                           <option value="Samsung">Samsung</option>
                           <option value="Hisense">Hisense</option>
                           <option value="Royal Plaza">Royal Plaza</option>
                           <option value="Générique">Générique</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest ml-1">Catégorie</label>
                        <select name="category" defaultValue={editingTicket?.category || 'SAV'}>
                           <option value="SAV">SAV / Panne</option>
                           <option value="Installation">Installation</option>
                           <option value="Livraison">Livraison</option>
                           <option value="Maintenance">Maintenance</option>
                           <option value="Information">Demande Info</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest ml-1">Désignation Produit</label>
                      <input name="productName" type="text" required defaultValue={editingTicket?.productName} placeholder="ex: Réfrigérateur LG 450L" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest ml-1">Numéro de Série (S/N)</label>
                      <input name="serialNumber" type="text" defaultValue={editingTicket?.serialNumber} placeholder="SN-..." className="font-mono text-xs uppercase" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest ml-1">Date d'achat approximative</label>
                      <input name="purchaseDate" type="date" defaultValue={editingTicket?.purchaseDate} />
                    </div>
                  </div>
               </div>

               <div className="space-y-6">
                  <div className="flex items-center gap-3 border-b pb-3">
                     <div className="w-8 h-8 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center"><Target size={18}/></div>
                     <h3 className="text-xs font-black uppercase tracking-widest text-gray-700">Logistique & SLA</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest ml-1">Zone Géographique / Ville</label>
                      <input name="location" type="text" defaultValue={editingTicket?.location} placeholder="ex: Akanda, Libreville Nord" className="font-bold" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                       <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest ml-1">Priorité</label>
                        <select name="priority" defaultValue={editingTicket?.priority || 'Moyenne'} className="font-bold">
                           <option value="Basse">🟢 Basse</option>
                           <option value="Moyenne">🟡 Moyenne</option>
                           <option value="Haute">🟠 Haute</option>
                           <option value="Urgent">🔴 Urgent</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest ml-1">Impact Client</label>
                        <select name="clientImpact" defaultValue={editingTicket?.clientImpact || 'Faible'}>
                           <option value="Faible">Faible</option>
                           <option value="Modéré">Modéré</option>
                           <option value="Critique">🚨 Critique</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest ml-1">Showroom Responsable</label>
                      <select name="showroom" defaultValue={editingTicket?.showroom || 'Glass'}>
                        {showrooms.map(s => <option key={s.id} value={s.id}>{s.id}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest ml-1">Expert Assigné</label>
                      <select name="assignedTechnicianId" defaultValue={editingTicket?.assignedTechnicianId || ''} className="font-bold text-blue-700">
                        <option value="">-- En attente d'assignation --</option>
                        {technicians.map(tech => <option key={tech.id} value={tech.id}>{tech.name}</option>)}
                      </select>
                    </div>
                  </div>
               </div>
            </div>

            <div className="space-y-4 pt-6 border-t">
               <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-50 text-gray-600 rounded-lg flex items-center justify-center"><FileText size={18}/></div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-gray-700">Diagnostic Initial & Symptômes</h3>
               </div>
               <textarea 
                  name="description" 
                  required 
                  defaultValue={editingTicket?.description} 
                  className="h-32 resize-none text-sm font-medium leading-relaxed" 
                  placeholder="Décrivez précisément la panne ou la demande du client..." 
               />
            </div>

            <div className="flex gap-4 pt-6 border-t border-[#dadce0]">
               <button type="submit" className="btn-google-primary flex-1 justify-center py-5 text-sm font-black uppercase tracking-widest shadow-xl shadow-blue-600/20">
                  <Save size={20} /> {editingTicket ? "Appliquer les Modifications Cloud" : "Ouvrir le Dossier dans Horizon"}
               </button>
               <button type="button" onClick={() => setIsModalOpen(false)} className="btn-google-outlined px-12 font-black uppercase text-xs tracking-widest">Abandonner</button>
            </div>
         </form>
      </Modal>
    </div>
  );
};

export default Tickets;
