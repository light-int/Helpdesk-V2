
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Users, Search, Plus, Mail, Phone, Filter, 
  Edit3, Trash2, Save, Building2, User as UserIcon,
  AlertTriangle, X, CheckCircle2, Loader2, Eye, 
  History, CreditCard, Calendar, ArrowUpRight, MapPin,
  ClipboardList, Ticket as TicketIcon, BadgeCheck, ShieldAlert,
  MessageSquare, Wrench, Package, Activity, Hash, Tag, Lock,
  Archive, RotateCcw, AlertCircle, ChevronLeft, ChevronRight,
  FilterX, Smartphone, Briefcase, TrendingUp, DollarSign
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
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerType, setCustomerType] = useState<'Particulier' | 'Entreprise'>('Particulier');

  useEffect(() => { refreshAll(); }, []);

  const filtered = useMemo(() => {
    return (customers || []).filter(c => {
      if (c.isArchived) return false;
      const cleanSearch = searchTerm.toLowerCase();
      return c.name.toLowerCase().includes(cleanSearch) || c.phone.includes(cleanSearch);
    });
  }, [customers, searchTerm]);

  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

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
    return (now - then) < (24 * 60 * 60 * 1000);
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
      status: editingCustomer?.status || 'Actif',
      totalSpent: editingCustomer?.totalSpent || 0,
      ticketsCount: editingCustomer?.ticketsCount || 0,
      lastVisit: new Date().toISOString(),
      isArchived: false
    };

    await saveCustomer(customerData);
    setIsModalOpen(false);
    setEditingCustomer(null);
    addNotification({ title: 'CRM Horizon', message: `Fiche de ${customerData.name} synchronisée.`, type: 'success' });
    await refreshAll();
  };

  const openEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setCustomerType(customer.type as any);
    setIsModalOpen(true);
  };

  const getTicketStatusColor = (status: string) => {
    switch (status) {
      case 'Résolu': return 'bg-green-50 text-green-700 border-green-100';
      case 'Fermé': return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'Nouveau': return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'En cours': return 'bg-amber-50 text-amber-700 border-amber-100';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="relative h-[calc(100vh-100px)] flex flex-col space-y-6 animate-page-entry">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-normal text-[#3c4043]">Base Clients CRM</h1>
          <p className="text-[#5f6368] text-sm">Répertoire centralisé et historique des dossiers Royal Plaza.</p>
        </div>
        <button onClick={() => { setEditingCustomer(null); setIsModalOpen(true); }} className="btn-google-primary shadow-lg shadow-blue-600/10">
          <Plus size={18} /> Nouveau Client
        </button>
      </header>

      <div className="google-card overflow-hidden flex-1 flex flex-col">
        <div className="px-8 py-5 border-b border-[#dadce0] bg-[#f8f9fa] flex items-center gap-6">
           <div className="relative flex-1">
              <Search className="absolute left-4 top-3 text-[#5f6368]" size={20} />
              <input 
                type="text" 
                placeholder="Rechercher un client par nom ou mobile..." 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
                className="w-full pl-12 h-11 rounded-2xl !border-[#dadce0]" 
              />
           </div>
        </div>
        
        <div className="overflow-y-auto flex-1 custom-scrollbar">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-white z-10">
              <tr className="border-b border-[#dadce0] bg-[#f8f9fa] text-[#5f6368] text-[10px] font-black uppercase tracking-widest">
                <th className="px-8 py-5">Client & Profil</th>
                <th className="px-8 py-5">Coordonnées</th>
                <th className="px-8 py-5 text-center">Tickets</th>
                <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#dadce0]">
              {paginatedCustomers.map((customer, idx) => (
                <tr 
                  key={customer.id} 
                  onClick={() => setSelectedCustomer(customer)}
                  className={`hover:bg-[#f8faff] transition-all cursor-pointer group ${selectedCustomer?.id === customer.id ? 'bg-[#e8f0fe]' : ''} animate-in fade-in slide-in-from-bottom-2`}
                  style={{ animationDelay: `${idx * 0.03}s`, animationFillMode: 'both' }}
                >
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                       <div className="w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm border bg-white text-[#1a73e8] border-[#d2e3fc] shadow-sm group-hover:scale-110 transition-transform">
                         {customer.type === 'Entreprise' ? <Building2 size={20}/> : customer.name[0]}
                       </div>
                       <div>
                          <div className="flex items-center gap-3">
                            <p className="text-sm font-black text-[#3c4043]">{customer.name}</p>
                            {isRecent(customer.lastVisit) && <span className="badge-new">RÉCENT</span>}
                          </div>
                          <p className="text-[10px] text-[#5f6368] font-bold uppercase tracking-widest">{customer.type} • {customer.companyName || 'Compte Personnel'}</p>
                       </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex flex-col gap-1">
                       <div className="flex items-center gap-2 text-xs font-black text-[#3c4043] font-mono">
                          <Smartphone size={14} className="text-[#1a73e8]" /> {customer.phone}
                       </div>
                       <div className="flex items-center gap-2 text-[10px] text-[#5f6368] font-medium">
                          <Mail size={12} /> {customer.email || 'Pas d\'email'}
                       </div>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-center">
                    <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-[10px] font-black border border-gray-200">
                      {customer.ticketsCount || 0} DOSSIERS
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                       <button onClick={(e) => { e.stopPropagation(); setSelectedCustomer(customer); }} className="p-2.5 text-[#5f6368] hover:bg-white hover:text-[#1a73e8] rounded-xl shadow-sm border border-transparent hover:border-[#dadce0]"><Eye size={20} /></button>
                       <button onClick={(e) => { e.stopPropagation(); openEdit(customer); }} className="p-2.5 text-[#5f6368] hover:bg-white hover:text-[#1a73e8] rounded-xl shadow-sm border border-transparent hover:border-[#dadce0]"><Edit3 size={20} /></button>
                       <button onClick={(e) => { e.stopPropagation(); if(window.confirm('Archiver ce client ?')) deleteCustomer(customer.id); }} className="p-2.5 text-[#5f6368] hover:bg-red-50 hover:text-red-600 rounded-xl transition-all"><Trash2 size={20}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAIL DRAWER PORTALED */}
      <Drawer
        isOpen={!!selectedCustomer}
        onClose={() => setSelectedCustomer(null)}
        title={selectedCustomer?.name || ''}
        subtitle={`${selectedCustomer?.type} • ID: ${selectedCustomer?.id}`}
        icon={<Users size={20} />}
        footer={
          <div className="flex gap-3">
             <button className="flex-1 btn-google-primary justify-center py-4 text-xs font-black uppercase tracking-widest shadow-xl">
                <Plus size={16} /> Nouveau Dossier SAV
             </button>
             <button onClick={() => selectedCustomer && openEdit(selectedCustomer)} className="p-4 bg-white border border-[#dadce0] text-[#5f6368] rounded-2xl hover:bg-[#e8eaed] transition-all">
                <Edit3 size={20} />
             </button>
          </div>
        }
      >
        {selectedCustomer && (
          <div className="space-y-10">
             {/* QUICK STATS */}
             <div className="grid grid-cols-2 gap-4">
                <div className="p-5 bg-gradient-to-br from-blue-50 to-white border border-blue-100 rounded-3xl shadow-sm">
                   <p className="text-[9px] font-black text-blue-700 uppercase tracking-widest mb-2 flex items-center gap-2"><DollarSign size={10}/> Total Investi</p>
                   <p className="text-xl font-black text-blue-900">{selectedCustomer.totalSpent.toLocaleString()} <span className="text-xs">F</span></p>
                </div>
                <div className="p-5 bg-gradient-to-br from-purple-50 to-white border border-purple-100 rounded-3xl shadow-sm">
                   <p className="text-[9px] font-black text-purple-700 uppercase tracking-widest mb-2 flex items-center gap-2"><TicketIcon size={10}/> Volume SAV</p>
                   <p className="text-xl font-black text-purple-900">{selectedCustomer.ticketsCount} <span className="text-xs">Dossiers</span></p>
                </div>
             </div>

             {/* CONTACT SECTION */}
             <section className="space-y-4">
                <h3 className="text-[10px] font-black text-[#9aa0a6] uppercase tracking-[0.2em] flex items-center gap-2"><Smartphone size={16} /> Coordonnées Certifiées</h3>
                <div className="p-6 bg-[#f8f9fa] border border-[#dadce0] rounded-3xl space-y-4">
                   <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white rounded-xl border flex items-center justify-center text-[#1a73e8]"><Phone size={20}/></div>
                      <div>
                         <p className="text-[9px] font-black text-gray-400 uppercase">Numéro de Mobile</p>
                         <p className="text-sm font-black text-[#3c4043] font-mono tracking-wider">{selectedCustomer.phone}</p>
                      </div>
                   </div>
                   <div className="flex items-center gap-4 pt-4 border-t border-gray-200/50">
                      <div className="w-10 h-10 bg-white rounded-xl border flex items-center justify-center text-[#1a73e8]"><Mail size={20}/></div>
                      <div className="flex-1 min-w-0">
                         <p className="text-[9px] font-black text-gray-400 uppercase">Adresse Email</p>
                         <p className="text-sm font-bold text-[#3c4043] truncate">{selectedCustomer.email || 'Non renseignée'}</p>
                      </div>
                   </div>
                   <div className="flex items-center gap-4 pt-4 border-t border-gray-200/50">
                      <div className="w-10 h-10 bg-white rounded-xl border flex items-center justify-center text-[#1a73e8]"><MapPin size={20}/></div>
                      <div>
                         <p className="text-[9px] font-black text-gray-400 uppercase">Localisation / Livraison</p>
                         <p className="text-sm font-bold text-[#3c4043]">{selectedCustomer.address || 'Aucune adresse enregistrée'}</p>
                      </div>
                   </div>
                </div>
             </section>

             {/* TICKET HISTORY */}
             <section className="space-y-4">
                <div className="flex items-center justify-between">
                   <h3 className="text-[10px] font-black text-[#9aa0a6] uppercase tracking-[0.2em] flex items-center gap-2"><History size={16} /> Historique des Dossiers</h3>
                   <span className="text-[10px] font-black text-[#1a73e8] uppercase bg-blue-50 px-2 py-0.5 rounded border border-blue-100">{customerTickets.length} Opérations</span>
                </div>
                <div className="space-y-3">
                   {customerTickets.map(ticket => (
                     <div key={ticket.id} className="p-5 bg-white border border-[#dadce0] rounded-3xl shadow-sm hover:border-[#1a73e8] transition-all group cursor-pointer">
                        <div className="flex justify-between items-start mb-3">
                           <div>
                              <div className="flex items-center gap-2 mb-1">
                                 <span className="text-[10px] font-black text-[#1a73e8] uppercase">#{ticket.id}</span>
                                 <span className="text-[10px] font-bold text-gray-400">• {ticket.category}</span>
                              </div>
                              <h4 className="text-xs font-black text-[#3c4043]">{ticket.productName}</h4>
                           </div>
                           <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase border ${getTicketStatusColor(ticket.status)}`}>
                              {ticket.status}
                           </span>
                        </div>
                        <div className="p-3 bg-[#f8f9fa] rounded-xl border border-transparent group-hover:border-[#f1f3f4] transition-all mb-3">
                           <p className="text-[10px] text-gray-500 italic line-clamp-2">"{ticket.description}"</p>
                        </div>
                        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                           <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400">
                              <Calendar size={12} /> {new Date(ticket.createdAt).toLocaleDateString()}
                           </div>
                           <div className="text-[10px] font-black text-[#1a73e8] flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                              AUDIT COMPLET <ArrowUpRight size={12}/>
                           </div>
                        </div>
                     </div>
                   ))}
                   {customerTickets.length === 0 && (
                     <div className="py-20 text-center border-2 border-dashed border-[#dadce0] rounded-[40px] bg-gray-50">
                        <ClipboardList size={40} className="mx-auto text-gray-200 mb-4" />
                        <p className="text-xs text-gray-400 font-black uppercase tracking-widest">Aucun historique SAV</p>
                     </div>
                   )}
                </div>
             </section>
          </div>
        )}
      </Drawer>

      {/* MODAL CREATION/EDITION CLIENT */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); setEditingCustomer(null); }} 
        title={editingCustomer ? "Mise à jour Fiche CRM" : "Nouveau Client CRM Horizon"}
        size="lg"
      >
         <form onSubmit={handleSave} className="space-y-6">
            <div className="flex p-1 bg-[#f1f3f4] rounded-2xl">
               <button type="button" onClick={() => setCustomerType('Particulier')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${customerType === 'Particulier' ? 'bg-white shadow-sm text-[#1a73e8]' : 'text-[#5f6368]'}`}>Compte Particulier</button>
               <button type="button" onClick={() => setCustomerType('Entreprise')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${customerType === 'Entreprise' ? 'bg-white shadow-sm text-purple-700' : 'text-[#5f6368]'}`}>Compte Entreprise (B2B)</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
               <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-[#5f6368] uppercase ml-1 tracking-widest">Nom / Contact Principal</label>
                  <input name="name" type="text" defaultValue={editingCustomer?.name} required className="h-11 bg-white" placeholder="ex: Jean Mba" />
               </div>
               <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-[#5f6368] uppercase ml-1 tracking-widest">Mobile GSM Certifié</label>
                  <input name="phone" type="tel" defaultValue={editingCustomer?.phone} required placeholder="+241 ..." className="h-11 bg-white font-bold" />
               </div>
               <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-[#5f6368] uppercase ml-1 tracking-widest">Email Contact</label>
                  <input name="email" type="email" defaultValue={editingCustomer?.email} className="h-11 bg-white" placeholder="contact@email.com" />
               </div>
               {customerType === 'Entreprise' ? (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-[#5f6368] uppercase ml-1 tracking-widest">Raison Sociale</label>
                    <input name="companyName" type="text" defaultValue={editingCustomer?.companyName} required className="h-11 bg-white font-bold" />
                  </div>
               ) : (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-[#5f6368] uppercase ml-1 tracking-widest">Type de Profil</label>
                    <select className="h-11 bg-white">
                       <option>Standard</option>
                       <option>VIP Gold</option>
                       <option>Collaborateur</option>
                    </select>
                  </div>
               )}
               <div className="md:col-span-2 space-y-1.5">
                  <label className="text-[10px] font-black text-[#5f6368] uppercase ml-1 tracking-widest">Adresse de Résidence / Livraison</label>
                  <input name="address" type="text" defaultValue={editingCustomer?.address} placeholder="Quartier, Villa, Proximité..." className="h-11 bg-white" />
               </div>
            </div>
            <div className="flex gap-4 pt-8 border-t border-[#dadce0]">
               <button type="submit" className="btn-google-primary flex-1 justify-center py-4 text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-blue-600/20">
                  <Save size={18} /> {editingCustomer ? 'Enregistrer les Modifications' : 'Créer la Fiche CRM Cloud'}
               </button>
               <button type="button" onClick={() => { setIsModalOpen(false); setEditingCustomer(null); }} className="btn-google-outlined px-10 font-black uppercase text-[10px] tracking-widest">Abandonner</button>
            </div>
         </form>
      </Modal>
    </div>
  );
};

export default Customers;
