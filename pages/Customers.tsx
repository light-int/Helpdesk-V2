
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Users, Search, Plus, UserPlus, RefreshCw, 
  ChevronLeft, ChevronRight, Edit3, Trash2,
  Building2, User as UserIcon, Mail, Smartphone,
  TrendingUp, CreditCard, ShieldCheck, MoreVertical,
  ExternalLink, Filter, X
} from 'lucide-react';
import { useData, useNotifications, useUser } from '../App';
import { Customer } from '../types';
import Modal from '../components/Modal';
import Drawer from '../components/Drawer';

const ITEMS_PER_PAGE = 10;

const Customers: React.FC = () => {
  const { customers, saveCustomer, refreshAll, isLoading, isSyncing } = useData();
  const { addNotification } = useNotifications();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  // Filtres
  const [typeFilter, setTypeFilter] = useState('Tous');
  const [statusFilter, setStatusFilter] = useState('Tous');

  useEffect(() => { refreshAll(); }, []);

  const filtered = useMemo(() => {
    return (customers || []).filter(c => {
      if (c.isArchived) return false;
      
      const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            c.phone.includes(searchTerm) ||
                            (c.companyName || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = typeFilter === 'Tous' || c.type === typeFilter;
      const matchesStatus = statusFilter === 'Tous' || c.status === statusFilter;
      
      return matchesSearch && matchesType && matchesStatus;
    }).sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0));
  }, [customers, searchTerm, typeFilter, statusFilter]);

  const stats = useMemo(() => {
    const total = filtered.length;
    const vips = filtered.filter(c => c.status === 'VIP').length;
    const totalSpent = filtered.reduce((acc, c) => acc + (c.totalSpent || 0), 0);
    return { total, vips, avgSpent: total > 0 ? totalSpent / total : 0 };
  }, [filtered]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    const formData = new FormData(e.currentTarget);
    const data: Customer = {
      id: editingCustomer?.id || `C-${Date.now()}`,
      name: formData.get('name') as string,
      phone: formData.get('phone') as string,
      email: formData.get('email') as string,
      type: formData.get('type') as any,
      address: formData.get('address') as string,
      status: formData.get('status') as string,
      companyName: formData.get('companyName') as string,
      totalSpent: editingCustomer?.totalSpent || 0,
      ticketsCount: editingCustomer?.ticketsCount || 0,
      lastVisit: editingCustomer?.lastVisit || new Date().toISOString()
    };
    
    try {
      await saveCustomer(data);
      addNotification({ title: 'Succès', message: 'Fiche client synchronisée.', type: 'success' });
      setIsModalOpen(false);
    } catch (err) {
      addNotification({ title: 'Erreur', message: 'Échec de la sauvegarde.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'VIP': return 'bg-[#fffbeb] text-[#b45309] border-[#fef3c7]';
      case 'Litige': return 'bg-[#fff1f2] text-[#e11d48] border-[#ffe4e6]';
      case 'Actif': return 'bg-[#f0fdf4] text-[#16a34a] border-[#dcfce7]';
      default: return 'bg-[#f9fafb] text-[#4b5563] border-[#f3f4f6]';
    }
  };

  const getInitialColor = (name: string) => {
    const colors = ['bg-blue-100 text-blue-600', 'bg-purple-100 text-purple-600', 'bg-emerald-100 text-emerald-600', 'bg-pink-100 text-pink-600'];
    const index = (name || 'A').charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-sb-entry pb-20">
      {/* Header Section */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1c1c1c] tracking-tight">Clients Plaza</h1>
          <p className="text-xs text-[#686868] mt-1 font-medium">Gérez votre base de données CRM et segmentez vos clients.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={refreshAll} className="btn-sb-outline h-10 px-3">
             <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => { setEditingCustomer(null); setIsModalOpen(true); }} className="btn-sb-primary h-10 px-4">
            <UserPlus size={16} /> <span>Ajouter un client</span>
          </button>
        </div>
      </header>

      {/* KPI Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Clients', value: stats.total, icon: <Users size={16}/>, color: 'text-blue-500' },
          { label: 'Segments VIP', value: stats.vips, icon: <StarIcon size={16}/>, color: 'text-amber-500' },
          { label: 'Dépense Moyenne', value: `${stats.avgSpent.toLocaleString()} F`, icon: <CreditCard size={16}/>, color: 'text-[#3ecf8e]' }
        ].map((s, i) => (
          <div key={i} className="sb-card flex items-center gap-4 py-4 px-6">
             <div className={`p-2.5 bg-[#f8f9fa] rounded-md ${s.color}`}>{s.icon}</div>
             <div>
                <p className="text-[10px] font-bold text-[#686868] uppercase tracking-widest">{s.label}</p>
                <p className="text-xl font-bold text-[#1c1c1c]">{s.value}</p>
             </div>
          </div>
        ))}
      </div>

      {/* Filter & Search Bar */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 text-[#686868]" size={16} />
            <input 
              type="text" 
              placeholder="Nom, téléphone ou entreprise..." 
              className="w-full pl-10 h-11"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`btn-sb-outline h-11 px-4 ${showAdvancedFilters ? 'bg-[#f0f9f4] border-[#3ecf8e]' : ''}`}
          >
            <Filter size={16} /> <span className="text-xs">Filtres</span>
          </button>
        </div>

        {showAdvancedFilters && (
          <div className="sb-card p-4 flex flex-wrap gap-4 animate-sb-entry bg-[#fcfcfc]">
            <div className="space-y-1.5 flex-1 min-w-[200px]">
              <label className="text-[10px] font-bold text-[#686868] uppercase">Type de compte</label>
              <select 
                value={typeFilter} 
                onChange={e => setTypeFilter(e.target.value)}
                className="w-full h-9 text-xs"
              >
                <option value="Tous">Tous les types</option>
                <option value="Particulier">Particulier</option>
                <option value="Entreprise">Entreprise</option>
              </select>
            </div>
            <div className="space-y-1.5 flex-1 min-w-[200px]">
              <label className="text-[10px] font-bold text-[#686868] uppercase">Segmentation</label>
              <select 
                value={statusFilter} 
                onChange={e => setStatusFilter(e.target.value)}
                className="w-full h-9 text-xs"
              >
                <option value="Tous">Tous les statuts</option>
                <option value="VIP">VIP</option>
                <option value="Actif">Actif</option>
                <option value="Litige">Litige</option>
              </select>
            </div>
            <div className="flex items-end">
              <button 
                onClick={() => { setTypeFilter('Tous'); setStatusFilter('Tous'); setSearchTerm(''); }}
                className="btn-sb-outline h-9 text-[10px] font-bold px-3 uppercase"
              >
                Réinitialiser
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Table */}
      <div className="sb-table-container">
        <table className="w-full text-left sb-table">
          <thead>
            <tr>
              <th className="w-1/3">Client & Entreprise</th>
              <th>Contact</th>
              <th>Dépenses Totales</th>
              <th>Segment</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((c) => (
              <tr key={c.id} onClick={() => setSelectedCustomer(c)} className="cursor-pointer group">
                <td>
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-md flex items-center justify-center font-bold text-sm ${getInitialColor(c.name)} border border-white/50 shadow-sm`}>
                      {c.name ? c.name[0] : '?'}
                    </div>
                    <div>
                      <p className="font-bold text-[#1c1c1c] text-sm">{c.name}</p>
                      <p className="text-[11px] text-[#686868] font-medium">{c.companyName || 'Particulier'}</p>
                    </div>
                  </div>
                </td>
                <td>
                  <p className="text-xs font-semibold text-[#1c1c1c]">{c.phone}</p>
                  <p className="text-[11px] text-[#686868] truncate max-w-[150px]">{c.email || '—'}</p>
                </td>
                <td>
                  <p className="text-sm font-bold text-[#1c1c1c]">{c.totalSpent?.toLocaleString()} F</p>
                  <p className="text-[10px] text-[#686868] uppercase font-bold tracking-tighter">{c.ticketsCount} interventions</p>
                </td>
                <td>
                   <span className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-tight ${getStatusBadge(c.status)}`}>
                     {c.status}
                   </span>
                </td>
                <td className="text-right">
                  <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setEditingCustomer(c); setIsModalOpen(true); }}
                      className="p-1.5 text-[#686868] hover:text-[#3ecf8e] hover:bg-[#f0fdf4] rounded"
                    >
                      <Edit3 size={14}/>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {/* Pagination Section */}
        <div className="px-6 py-4 bg-[#fcfcfc] border-t border-[#ededed] flex items-center justify-between">
          <p className="text-[11px] text-[#686868] font-medium">Affichage de {paginated.length} sur {filtered.length} clients</p>
          <div className="flex items-center gap-1">
            <button 
              disabled={currentPage === 1} 
              onClick={() => setCurrentPage(p => p - 1)} 
              className="p-1 text-[#686868] hover:bg-white border border-transparent hover:border-[#ededed] rounded disabled:opacity-30"
            >
              <ChevronLeft size={16}/>
            </button>
            <div className="flex gap-1 px-2">
               {[...Array(Math.min(5, totalPages))].map((_, i) => (
                 <button 
                  key={i} 
                  onClick={() => setCurrentPage(i + 1)}
                  className={`w-7 h-7 text-[11px] font-bold rounded flex items-center justify-center transition-all ${currentPage === i + 1 ? 'bg-[#3ecf8e] text-white' : 'text-[#686868] hover:bg-white'}`}
                 >
                   {i + 1}
                 </button>
               ))}
            </div>
            <button 
              disabled={currentPage === totalPages} 
              onClick={() => setCurrentPage(p => p + 1)} 
              className="p-1 text-[#686868] hover:bg-white border border-transparent hover:border-[#ededed] rounded disabled:opacity-30"
            >
              <ChevronRight size={16}/>
            </button>
          </div>
        </div>
      </div>

      {/* Modal d'ajout / édition */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingCustomer ? "Modifier Client" : "Nouveau Client"}
      >
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#686868] uppercase">Nom Complet</label>
              <input name="name" type="text" defaultValue={editingCustomer?.name} placeholder="ex: Jean Mba" required className="w-full" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#686868] uppercase">Téléphone</label>
              <input name="phone" type="tel" defaultValue={editingCustomer?.phone} placeholder="+241 ..." required className="w-full" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#686868] uppercase">Email</label>
              <input name="email" type="email" defaultValue={editingCustomer?.email} placeholder="contact@email.ga" className="w-full" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#686868] uppercase">Entreprise (Optionnel)</label>
              <input name="companyName" type="text" defaultValue={editingCustomer?.companyName} placeholder="Nom société" className="w-full" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#686868] uppercase">Type de client</label>
              <select name="type" defaultValue={editingCustomer?.type || 'Particulier'} className="w-full">
                <option value="Particulier">Particulier</option>
                <option value="Entreprise">Entreprise</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#686868] uppercase">Statut</label>
              <select name="status" defaultValue={editingCustomer?.status || 'Actif'} className="w-full">
                <option value="Actif">Actif</option>
                <option value="VIP">VIP</option>
                <option value="Litige">Litige</option>
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-[#686868] uppercase">Adresse de facturation</label>
            <textarea name="address" rows={2} defaultValue={editingCustomer?.address} placeholder="Quartier, Ville..." className="w-full" />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn-sb-outline">Annuler</button>
            <button type="submit" disabled={isSaving} className="btn-sb-primary">
              {isSaving ? <RefreshCw className="animate-spin" size={14}/> : 'Enregistrer la fiche'}
            </button>
          </div>
        </form>
      </Modal>

      <Drawer 
        isOpen={!!selectedCustomer} 
        onClose={() => setSelectedCustomer(null)} 
        title="Fiche Profil Client" 
        subtitle={`ID: ${selectedCustomer?.id}`}
        icon={<UserIcon size={16}/>}
      >
        {selectedCustomer && (
          <div className="space-y-8 animate-sb-entry">
            <div className="flex flex-col items-center text-center p-8 bg-[#f8f9fa] border border-[#ededed] rounded-lg">
               <div className={`w-20 h-20 rounded-xl flex items-center justify-center text-3xl font-black mb-4 shadow-sm border border-white ${getInitialColor(selectedCustomer.name)}`}>
                 {selectedCustomer.name ? selectedCustomer.name[0] : '?'}
               </div>
               <h3 className="text-xl font-bold text-[#1c1c1c] tracking-tight">{selectedCustomer.name}</h3>
               <p className="text-[11px] text-[#3ecf8e] font-black uppercase tracking-widest mt-1 border border-[#3ecf8e]/20 px-2 py-0.5 rounded bg-[#3ecf8e]/5">
                 {selectedCustomer.status} • {selectedCustomer.type}
               </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 border border-[#ededed] rounded-lg bg-white">
                <p className="text-[10px] font-bold text-[#686868] uppercase tracking-widest mb-1">Volume d'affaires</p>
                <p className="text-base font-bold text-[#1c1c1c]">{selectedCustomer.totalSpent.toLocaleString()} F</p>
              </div>
              <div className="p-4 border border-[#ededed] rounded-lg bg-white">
                <p className="text-[10px] font-bold text-[#686868] uppercase tracking-widest mb-1">Dossiers SAV</p>
                <p className="text-base font-bold text-[#1c1c1c]">{selectedCustomer.ticketsCount} Interventions</p>
              </div>
            </div>

            <div className="space-y-4">
               <h4 className="text-[11px] font-bold text-[#686868] uppercase tracking-widest border-b border-[#ededed] pb-2">Informations de contact</h4>
               <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-[#fcfcfc] border border-[#ededed] rounded-md">
                    <Smartphone className="text-[#3ecf8e]" size={16}/> 
                    <span className="text-sm font-bold text-[#1c1c1c]">{selectedCustomer.phone}</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-[#fcfcfc] border border-[#ededed] rounded-md">
                    <Mail className="text-[#3ecf8e]" size={16}/> 
                    <span className="text-sm font-medium text-[#1c1c1c] truncate">{selectedCustomer.email || 'Non renseigné'}</span>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-[#fcfcfc] border border-[#ededed] rounded-md">
                    <Building2 className="text-[#3ecf8e] mt-0.5" size={16} /> 
                    <span className="text-sm font-medium text-[#1c1c1c] leading-relaxed">{selectedCustomer.address || 'Adresse inconnue'}</span>
                  </div>
               </div>
            </div>

            <button className="btn-sb-outline w-full justify-center gap-2 h-11">
               <ExternalLink size={14} /> <span>Voir l'historique des tickets</span>
            </button>
          </div>
        )}
      </Drawer>
    </div>
  );
};

// Sub-component for icons
const StarIcon = ({ size, className }: { size: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

export default Customers;
