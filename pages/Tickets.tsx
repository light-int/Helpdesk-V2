
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, Search, RefreshCw, Ticket as TicketIcon,
  Filter, Smartphone, User, Package, ChevronLeft, ChevronRight,
  Clock, AlertTriangle, CheckCircle2, DollarSign, Wrench,
  ShieldCheck, ArrowUpRight, MapPin, Tag, Smartphone as PhoneIcon,
  Calendar, Layers, Activity, Edit3
} from 'lucide-react';
import { useData, useNotifications, useUser } from '../App';
import { Ticket, TicketStatus, TicketCategory } from '../types';
import Drawer from '../components/Drawer';
import Modal from '../components/Modal';

const Tickets: React.FC = () => {
  const { tickets, technicians, products, brands, refreshAll, isSyncing, saveTicket } = useData();
  const { currentUser } = useUser();
  const { addNotification } = useNotifications();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Filtres
  const [statusFilter, setStatusFilter] = useState('Tous');
  const [categoryFilter, setCategoryFilter] = useState('Tous');
  const [priorityFilter, setPriorityFilter] = useState('Tous');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => { refreshAll(); }, []);

  const filtered = useMemo(() => {
    return (tickets || []).filter(t => {
      if (t.isArchived) return false;
      
      const matchesSearch = t.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (t.productName || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'Tous' || t.status === statusFilter;
      const matchesCategory = categoryFilter === 'Tous' || t.category === categoryFilter;
      const matchesPriority = priorityFilter === 'Tous' || t.priority === priorityFilter;
      
      return matchesSearch && matchesStatus && matchesCategory && matchesPriority;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [tickets, searchTerm, statusFilter, categoryFilter, priorityFilter]);

  const handleCreateTicket = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    const formData = new FormData(e.currentTarget);
    
    const newTicket: Ticket = {
      id: `T-${Date.now().toString().slice(-6)}`,
      customerName: formData.get('customerName') as string,
      customerPhone: formData.get('customerPhone') as string,
      source: formData.get('source') as any,
      showroom: formData.get('showroom') as string,
      category: formData.get('category') as TicketCategory,
      status: 'Nouveau',
      priority: formData.get('priority') as any,
      productName: formData.get('productName') as string,
      brand: formData.get('brand') as string,
      description: formData.get('description') as string,
      location: formData.get('location') as string,
      clientImpact: formData.get('clientImpact') as any,
      assignedTechnicianId: formData.get('technicianId') as string || undefined,
      createdAt: new Date().toISOString(),
      lastUpdate: new Date().toISOString(),
      financials: {
        partsTotal: 0, partsCost: 0, laborTotal: 0, laborCost: 0, travelFee: 5000, 
        logisticsCost: 2000, discount: 0, grandTotal: 5000, netMargin: 0, isPaid: false
      }
    };

    try {
      await saveTicket(newTicket);
      addNotification({ title: 'Succès', message: 'Nouveau ticket créé avec succès.', type: 'success' });
      setIsModalOpen(false);
    } catch (err) {
      addNotification({ title: 'Erreur', message: 'Impossible de créer le ticket.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Résolu': return 'bg-[#f0fdf4] text-[#16a34a] border-[#dcfce7]';
      case 'En cours': return 'bg-[#fffbeb] text-[#b45309] border-[#fef3c7]';
      case 'Nouveau': return 'bg-[#eff6ff] text-[#2563eb] border-[#dbeafe]';
      case 'Fermé': return 'bg-[#f9fafb] text-[#6b7280] border-[#f3f4f6]';
      default: return 'bg-[#f9fafb] text-[#4b5563] border-[#f3f4f6]';
    }
  };

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'Urgent': return 'text-red-500 bg-red-50 border-red-100';
      case 'Haute': return 'text-amber-600 bg-amber-50 border-amber-100';
      default: return 'text-blue-500 bg-blue-50 border-blue-100';
    }
  };

  const getImpactBadge = (impact: string) => {
    switch (impact) {
      case 'Critique': return 'text-red-600 bg-red-50';
      case 'Modéré': return 'text-amber-600 bg-amber-50';
      default: return 'text-gray-500 bg-gray-50';
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-sb-entry pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1c1c1c] tracking-tight">SAV & Interventions</h1>
          <p className="text-xs text-[#686868] mt-1 font-medium">Suivi centralisé des dossiers techniques et réclamations Royal Plaza.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={refreshAll} className="btn-sb-outline h-10 px-3">
             <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setIsModalOpen(true)} className="btn-sb-primary h-10 px-4">
            <Plus size={16} /> <span>Nouveau Ticket</span>
          </button>
        </div>
      </header>

      {/* FILTERS & SEARCH */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 text-[#686868]" size={16} />
            <input 
              type="text" 
              placeholder="Rechercher par ID, client ou matériel..." 
              className="w-full pl-10 h-11"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`btn-sb-outline h-11 px-4 ${showFilters ? 'border-[#3ecf8e] text-[#3ecf8e]' : ''}`}
          >
            <Filter size={16} /> <span className="text-xs">Filtres avancés</span>
          </button>
        </div>

        {showFilters && (
          <div className="sb-card p-4 flex flex-wrap gap-6 animate-sb-entry bg-[#fcfcfc]">
            <div className="space-y-1.5 min-w-[150px] flex-1">
              <label className="text-[10px] font-bold text-[#686868] uppercase">État</label>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full h-9 text-xs">
                <option value="Tous">Tous les statuts</option>
                <option value="Nouveau">Nouveau</option>
                <option value="En cours">En cours</option>
                <option value="En attente d'approbation">En attente</option>
                <option value="Résolu">Résolu</option>
                <option value="Fermé">Fermé</option>
              </select>
            </div>
            <div className="space-y-1.5 min-w-[150px] flex-1">
              <label className="text-[10px] font-bold text-[#686868] uppercase">Catégorie</label>
              <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="w-full h-9 text-xs">
                <option value="Tous">Toutes les catégories</option>
                <option value="SAV">SAV / Réparation</option>
                <option value="Installation">Installation</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Livraison">Livraison</option>
              </select>
            </div>
            <div className="space-y-1.5 min-w-[150px] flex-1">
              <label className="text-[10px] font-bold text-[#686868] uppercase">Priorité</label>
              <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} className="w-full h-9 text-xs">
                <option value="Tous">Toutes les priorités</option>
                <option value="Basse">Basse</option>
                <option value="Moyenne">Moyenne</option>
                <option value="Haute">Haute</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
            <div className="flex items-end">
              <button 
                onClick={() => { setStatusFilter('Tous'); setCategoryFilter('Tous'); setPriorityFilter('Tous'); setSearchTerm(''); }}
                className="btn-sb-outline h-9 text-[10px] font-bold px-3 uppercase"
              >
                Réinitialiser
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="sb-table-container">
        <table className="w-full text-left sb-table">
          <thead>
            <tr>
              <th className="w-24">ID</th>
              <th>Client</th>
              <th>Matériel</th>
              <th>Localisation</th>
              <th className="text-right">SLA / Statut</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => (
              <tr key={t.id} onClick={() => setSelectedTicket(t)} className="cursor-pointer group">
                <td className="font-mono text-[11px] font-black text-[#686868] uppercase tracking-tighter group-hover:text-[#3ecf8e]">
                  #{t.id}
                </td>
                <td>
                  <p className="text-[13px] font-black text-[#1c1c1c]">{t.customerName}</p>
                  <p className="text-[11px] text-[#686868] font-bold">{t.customerPhone}</p>
                </td>
                <td>
                  <div className="flex flex-col gap-0.5">
                     <p className="text-[12px] font-bold text-[#1c1c1c] truncate max-w-[200px]">{t.productName}</p>
                     <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-black text-[#3ecf8e] uppercase leading-none">{t.brand}</span>
                        <span className="text-[9px] text-[#686868] font-bold">• {t.category}</span>
                     </div>
                  </div>
                </td>
                <td>
                  <div className="flex items-center gap-1.5 text-[#686868]">
                    <MapPin size={12} className="shrink-0" />
                    <span className="text-[11px] font-medium truncate max-w-[150px]">{t.location || t.showroom}</span>
                  </div>
                </td>
                <td className="text-right">
                  <div className="flex flex-col items-end gap-1.5">
                     <span className={`px-1.5 py-0.5 rounded border text-[8px] font-black uppercase tracking-widest ${getPriorityStyle(t.priority)}`}>
                       {t.priority}
                     </span>
                     <span className={`px-2 py-0.5 rounded border text-[10px] font-black uppercase tracking-tight ${getStatusStyle(t.status)}`}>
                       {t.status}
                     </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="p-24 text-center space-y-3 opacity-40">
            <TicketIcon size={48} className="mx-auto text-[#686868]" />
            <p className="text-[13px] font-bold text-[#686868] uppercase tracking-widest">Aucun dossier trouvé</p>
          </div>
        )}
      </div>

      {/* Modal Nouveau Ticket */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Ouvrir un Dossier SAV">
        <form onSubmit={handleCreateTicket} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[#686868] uppercase">Nom du client</label>
                <input name="customerName" type="text" placeholder="ex: Jean Mba" required className="w-full" />
             </div>
             <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[#686868] uppercase">Téléphone de contact</label>
                <input name="customerPhone" type="tel" placeholder="+241 ..." required className="w-full" />
             </div>
             <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[#686868] uppercase">Type d'intervention</label>
                <select name="category" className="w-full">
                  <option value="SAV">SAV / Réparation</option>
                  <option value="Installation">Installation matériel</option>
                  <option value="Maintenance">Maintenance préventive</option>
                  <option value="Livraison">Livraison & Colisage</option>
                </select>
             </div>
             <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[#686868] uppercase">Showroom d'origine</label>
                <select name="showroom" className="w-full">
                  <option value="Glass">Plaza Glass</option>
                  <option value="Oloumi">Plaza Oloumi</option>
                  <option value="Bord de mer">Plaza Bord de Mer</option>
                  <option value="Social Media">Vente en ligne</option>
                </select>
             </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-[#ededed] pt-6">
             <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[#686868] uppercase">Produit Horizon</label>
                <input name="productName" list="prodList" type="text" placeholder="ex: Split Beko 1.5CV" required className="w-full" />
                <datalist id="prodList">
                   {products.map(p => <option key={p.id} value={p.name} />)}
                </datalist>
             </div>
             <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[#686868] uppercase">Marque</label>
                <select name="brand" className="w-full">
                   {brands.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
             </div>
             <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[#686868] uppercase">Priorité SLA</label>
                <select name="priority" className="w-full">
                  <option value="Moyenne">Moyenne</option>
                  <option value="Urgent">Urgent (24h)</option>
                  <option value="Haute">Haute (48h)</option>
                  <option value="Basse">Basse</option>
                </select>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#686868] uppercase">Impact Client</label>
              <select name="clientImpact" className="w-full">
                 <option value="Faible">Faible (Défaut mineur)</option>
                 <option value="Modéré">Modéré (Gêne d'usage)</option>
                 <option value="Critique">Critique (Arrêt total matériel)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#686868] uppercase">Source de la demande</label>
              <select name="source" className="w-full">
                 <option value="WhatsApp">WhatsApp Business</option>
                 <option value="Messenger">Messenger</option>
                 <option value="Phone">Appel Direct</option>
                 <option value="Email">Email / Support</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-[#686868] uppercase">Description de l'anomalie / Détails techniques</label>
            <textarea name="description" rows={3} placeholder="Détaillez la panne ou la demande..." required className="w-full" />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-[#686868] uppercase">Localisation précise (pour intervention terrain)</label>
            <input name="location" type="text" placeholder="ex: Akanda, Cité Shell, Villa 24" className="w-full" />
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-[#ededed]">
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn-sb-outline h-11 px-6">Annuler</button>
            <button type="submit" disabled={isSaving} className="btn-sb-primary h-11 px-8">
              {isSaving ? <RefreshCw className="animate-spin" size={16}/> : 'Créer le dossier'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Drawer Détail Ticket Enrichi */}
      <Drawer isOpen={!!selectedTicket} onClose={() => setSelectedTicket(null)} title="Dossier Technique SAV" subtitle={`Réf: #${selectedTicket?.id}`} icon={<TicketIcon size={18}/>}>
        {selectedTicket && (
          <div className="space-y-8 animate-sb-entry pb-10">
            {/* Status Bar */}
            <div className="flex items-center justify-between p-4 bg-[#f8f9fa] border border-[#ededed] rounded-lg shadow-sm">
               <div className="flex items-center gap-3">
                  <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${getStatusStyle(selectedTicket.status)}`}>
                    {selectedTicket.status}
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${getPriorityStyle(selectedTicket.priority).split(' ')[0]}`}>
                    {selectedTicket.priority}
                  </span>
               </div>
               <span className={`px-2 py-0.5 text-[9px] font-bold rounded ${getImpactBadge(selectedTicket.clientImpact || 'Faible')}`}>
                 Impact: {selectedTicket.clientImpact || 'Faible'}
               </span>
            </div>

            {/* Description & Equipment */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="p-5 bg-white border border-[#ededed] rounded-xl shadow-sm space-y-3">
                  <div className="flex items-center gap-2 text-[#686868]"><User size={14}/><p className="text-[10px] font-black uppercase tracking-widest">Client</p></div>
                  <div>
                    <p className="text-[14px] font-black text-[#1c1c1c] leading-none">{selectedTicket.customerName}</p>
                    <p className="text-[11px] text-[#3ecf8e] font-bold mt-1.5">{selectedTicket.customerPhone}</p>
                    <p className="text-[10px] text-[#686868] mt-2 italic flex items-center gap-1"><MapPin size={10}/> {selectedTicket.location || 'Site indéfini'}</p>
                  </div>
               </div>
               <div className="p-5 bg-white border border-[#ededed] rounded-xl shadow-sm space-y-3">
                  <div className="flex items-center gap-2 text-[#686868]"><Package size={14}/><p className="text-[10px] font-black uppercase tracking-widest">Matériel</p></div>
                  <div>
                    <p className="text-[14px] font-black text-[#1c1c1c] leading-none">{selectedTicket.productName}</p>
                    <p className="text-[11px] text-[#686868] font-bold mt-1.5 uppercase tracking-tighter">{selectedTicket.brand} • {selectedTicket.category}</p>
                    <p className="text-[10px] text-[#686868] mt-2 font-mono">S/N: {selectedTicket.serialNumber || 'NON RENSEIGNÉ'}</p>
                  </div>
               </div>
            </div>

            {/* Timeline & Details */}
            <div className="space-y-4">
              <h4 className="text-[11px] font-black text-[#686868] uppercase tracking-widest border-b border-[#ededed] pb-2">Journal du dossier</h4>
              <div className="space-y-3">
                <div className="p-4 bg-[#fcfcfc] border border-[#ededed] rounded-lg">
                   <p className="text-[10px] font-black text-[#686868] uppercase mb-2 flex items-center gap-2"><Calendar size={12}/> Chronologie</p>
                   <div className="flex flex-col gap-2">
                      <div className="flex justify-between text-[12px]">
                        <span className="text-[#686868]">Ouverture</span>
                        <span className="font-bold text-[#1c1c1c]">{new Date(selectedTicket.createdAt).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-[12px]">
                        <span className="text-[#686868]">Dernière action</span>
                        <span className="font-bold text-[#1c1c1c]">{new Date(selectedTicket.lastUpdate).toLocaleString()}</span>
                      </div>
                   </div>
                </div>
                <div className="p-4 bg-[#fcfcfc] border border-[#ededed] rounded-lg">
                   <p className="text-[10px] font-black text-[#686868] uppercase mb-2">Description incident</p>
                   <p className="text-[13px] text-[#1c1c1c] italic leading-relaxed">"{selectedTicket.description}"</p>
                </div>
              </div>
            </div>

            {/* Financial Analysis */}
            <section className="space-y-4">
               <div className="flex items-center justify-between border-b border-[#ededed] pb-2">
                  <h4 className="text-[11px] font-black text-[#686868] uppercase tracking-widest">Analyse Financière</h4>
                  <span className={`text-[10px] font-black uppercase ${selectedTicket.financials?.isPaid ? 'text-[#3ecf8e]' : 'text-amber-500'}`}>
                    {selectedTicket.financials?.isPaid ? 'Paiement Reçu' : 'Encaissement Attendu'}
                  </span>
               </div>
               <div className="space-y-3 px-1">
                  <div className="flex justify-between items-center text-[12px]">
                     <span className="text-[#686868]">Pièces & Rechanges</span>
                     <span className="font-bold text-[#1c1c1c]">{selectedTicket.financials?.partsTotal?.toLocaleString()} F</span>
                  </div>
                  <div className="flex justify-between items-center text-[12px]">
                     <span className="text-[#686868]">Expertise & Main d'œuvre</span>
                     <span className="font-bold text-[#1c1c1c]">{selectedTicket.financials?.laborTotal?.toLocaleString()} F</span>
                  </div>
                  <div className="flex justify-between items-center text-[12px]">
                     <span className="text-[#686868]">Frais Logistique & Déplacement</span>
                     <span className="font-bold text-[#1c1c1c]">{selectedTicket.financials?.travelFee?.toLocaleString()} F</span>
                  </div>
                  <div className="pt-3 border-t border-[#ededed] flex justify-between items-center">
                     <span className="text-[13px] font-black text-[#1c1c1c] uppercase tracking-widest">Net à Payer</span>
                     <span className="text-[18px] font-black text-[#3ecf8e]">{selectedTicket.financials?.grandTotal?.toLocaleString()} F</span>
                  </div>
               </div>
            </section>

            {/* Actions */}
            <div className="pt-6 grid grid-cols-2 gap-3">
               <button className="btn-sb-outline h-12 justify-center gap-2 font-black uppercase text-[11px] tracking-widest">
                  <Edit3 size={14}/><span>Modifier</span>
               </button>
               <button className="btn-sb-primary h-12 justify-center gap-2 font-black uppercase text-[11px] tracking-widest shadow-md">
                  <CheckCircle2 size={14}/><span>Résoudre Dossier</span>
               </button>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default Tickets;
