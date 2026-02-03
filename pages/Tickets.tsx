
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, Search, RefreshCw, Ticket as TicketIcon,
  Filter, MapPin, Edit3, CheckCircle2, Phone, 
  Calendar, ShieldCheck, User, Zap, Info,
  DollarSign, Wrench, ArrowRight, AlertTriangle,
  Mail, MessageSquare, Clock
} from 'lucide-react';
import { useData, useNotifications, useUser } from '../App';
import { Ticket, TicketCategory, Product, Technician } from '../types';
import Drawer from '../components/Drawer';
import Modal from '../components/Modal';

const Tickets: React.FC = () => {
  const { tickets, products, brands, technicians, refreshAll, isSyncing, saveTicket } = useData();
  const { currentUser } = useUser();
  const { addNotification } = useNotifications();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Filtres
  const [statusFilter, setStatusFilter] = useState('Tous');
  const [categoryFilter, setCategoryFilter] = useState('Tous');
  const [priorityFilter, setPriorityFilter] = useState('Tous');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => { refreshAll(); }, [refreshAll]);

  const filtered = useMemo(() => {
    return (tickets || []).filter((t: Ticket) => {
      if (t.isArchived) return false;
      
      const matchesSearch = (t.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (t.id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (t.productName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (t.serialNumber || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'Tous' || t.status === statusFilter;
      const matchesCategory = categoryFilter === 'Tous' || t.category === categoryFilter;
      const matchesPriority = priorityFilter === 'Tous' || t.priority === priorityFilter;
      
      return matchesSearch && matchesStatus && matchesCategory && matchesPriority;
    }).sort((a: Ticket, b: Ticket) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime());
  }, [tickets, searchTerm, statusFilter, categoryFilter, priorityFilter]);

  const handleSaveTicket = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    const formData = new FormData(e.currentTarget);
    
    const ticketData: Ticket = {
      id: editingTicket?.id || `T-${Date.now().toString().slice(-6)}`,
      customerName: formData.get('customerName') as string,
      customerPhone: formData.get('customerPhone') as string,
      source: (formData.get('source') as any) || 'Interne',
      showroom: formData.get('showroom') as string,
      category: formData.get('category') as TicketCategory,
      status: (formData.get('status') as any) || editingTicket?.status || 'Nouveau',
      priority: (formData.get('priority') as any) || 'Moyenne',
      productName: formData.get('productName') as string,
      brand: formData.get('brand') as string,
      serialNumber: formData.get('serialNumber') as string,
      description: formData.get('description') as string,
      location: formData.get('location') as string,
      clientImpact: (formData.get('clientImpact') as any) || 'Faible',
      assignedTechnicianId: (formData.get('technicianId') as string) || undefined,
      createdAt: editingTicket?.createdAt || new Date().toISOString(),
      lastUpdate: new Date().toISOString(),
      financials: editingTicket?.financials || {
        partsTotal: 0, partsCost: 0, laborTotal: 0, laborCost: 0, travelFee: 5000, 
        logisticsCost: 2000, discount: 0, grandTotal: 5000, netMargin: 0, isPaid: false
      }
    };

    try {
      await saveTicket(ticketData);
      addNotification({ 
        title: editingTicket ? 'Ticket Mis à jour' : 'Ticket Créé', 
        message: `Dossier ${ticketData.id} synchronisé avec succès.`, 
        type: 'success' 
      });
      setIsModalOpen(false);
      setEditingTicket(null);
      if (selectedTicket?.id === ticketData.id) setSelectedTicket(ticketData);
    } catch (err) {
      addNotification({ title: 'Erreur', message: 'Impossible de sauvegarder le dossier.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Résolu': return 'bg-[#f0fdf4] text-[#16a34a] border-[#dcfce7]';
      case 'En cours': return 'bg-[#fffbeb] text-[#b45309] border-[#fef3c7]';
      case 'Nouveau': return 'bg-[#eff6ff] text-[#2563eb] border-[#dbeafe]';
      case 'Fermé': return 'bg-[#f9fafb] text-[#4b5563] border-[#f3f4f6]';
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

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'Critique': return 'text-red-600';
      case 'Modéré': return 'text-amber-600';
      default: return 'text-blue-600';
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-sb-entry pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1c1c1c] tracking-tight">Dossiers SAV</h1>
          <p className="text-xs text-[#686868] mt-1 font-medium">Monitoring centralisé des interventions techniques Plaza.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={refreshAll} className="btn-sb-outline h-10 px-3">
            <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => { setEditingTicket(null); setIsModalOpen(true); }} className="btn-sb-primary h-10 px-4">
            <Plus size={16} /> <span>Ouvrir Ticket</span>
          </button>
        </div>
      </header>

      <div className="space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 text-[#686868]" size={16} />
            <input 
              type="text" 
              placeholder="Rechercher par ID, client, matériel ou S/N..." 
              className="w-full pl-10 h-11" 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
            />
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)} 
            className={`btn-sb-outline h-11 px-4 ${showFilters ? 'border-[#3ecf8e] text-[#3ecf8e]' : ''}`}
          >
            <Filter size={16} /> <span className="text-xs">Filtres</span>
          </button>
        </div>

        {showFilters && (
          <div className="sb-card p-4 flex flex-wrap gap-6 animate-sb-entry bg-[#fcfcfc]">
            <div className="space-y-1.5 flex-1 min-w-[150px]">
              <label className="text-[10px] font-bold text-[#686868] uppercase">État du dossier</label>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full h-9 text-xs">
                <option value="Tous">Tous</option>
                <option value="Nouveau">Nouveau</option>
                <option value="En cours">En cours</option>
                <option value="Résolu">Résolu</option>
                <option value="Fermé">Fermé</option>
              </select>
            </div>
            <div className="space-y-1.5 flex-1 min-w-[150px]">
              <label className="text-[10px] font-bold text-[#686868] uppercase">Priorité SLA</label>
              <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} className="w-full h-9 text-xs">
                <option value="Tous">Tous</option>
                <option value="Urgent">Urgent</option>
                <option value="Haute">Haute</option>
                <option value="Moyenne">Moyenne</option>
                <option value="Basse">Basse</option>
              </select>
            </div>
            <div className="space-y-1.5 flex-1 min-w-[150px]">
              <label className="text-[10px] font-bold text-[#686868] uppercase">Catégorie technique</label>
              <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="w-full h-9 text-xs">
                <option value="Tous">Toutes</option>
                <option value="SAV">SAV</option>
                <option value="Installation">Installation</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Livraison">Livraison</option>
              </select>
            </div>
          </div>
        )}
      </div>

      <div className="sb-table-container shadow-sm">
        <table className="w-full text-left sb-table">
          <thead>
            <tr>
              <th className="w-24">ID</th>
              <th>Client</th>
              <th>Matériel & Marque</th>
              <th>Zone / Site</th>
              <th>Priorité</th>
              <th className="text-right">Statut</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t: Ticket) => (
              <tr key={t.id} onClick={() => setSelectedTicket(t)} className="cursor-pointer group hover:bg-[#fafafa]">
                <td className="font-mono text-[11px] font-black group-hover:text-[#3ecf8e]">#{t.id}</td>
                <td>
                  <p className="font-bold text-sm text-[#1c1c1c]">{t.customerName}</p>
                  <p className="text-[11px] text-[#686868]">{t.customerPhone}</p>
                </td>
                <td>
                  <p className="text-xs font-bold text-[#1c1c1c] truncate max-w-[200px]">{t.productName}</p>
                  <p className="text-[10px] text-[#3ecf8e] font-black uppercase tracking-tighter">{t.brand}</p>
                </td>
                <td>
                  <div className="flex items-center gap-1.5 text-[#686868]">
                    <MapPin size={12} className="text-[#3ecf8e]" />
                    <span className="text-[11px] font-medium">{t.location || t.showroom}</span>
                  </div>
                </td>
                <td>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${getPriorityStyle(t.priority)}`}>
                    {t.priority}
                  </span>
                </td>
                <td className="text-right">
                  <span className={`px-2 py-0.5 rounded border text-[10px] font-black uppercase tracking-tight ${getStatusStyle(t.status)}`}>
                    {t.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* DRAWER VUE DÉTAILLÉE POUR MANAGER */}
      <Drawer 
        isOpen={!!selectedTicket} 
        onClose={() => setSelectedTicket(null)} 
        title="Supervision Technique Dossier" 
        subtitle={`Réf: #${selectedTicket?.id}`} 
        icon={<TicketIcon size={18}/>}
        width="600px"
      >
        {selectedTicket && (
          <div className="space-y-8 animate-sb-entry pb-10">
            {/* Header Status Bar */}
            <div className="p-5 bg-[#f8f9fa] border border-[#ededed] rounded-2xl flex flex-col gap-4 shadow-sm">
               <div className="flex items-center justify-between">
                  <div className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border ${getStatusStyle(selectedTicket.status)}`}>
                    {selectedTicket.status}
                  </div>
                  <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase border ${getPriorityStyle(selectedTicket.priority)}`}>
                    Priorité {selectedTicket.priority}
                  </span>
               </div>
            </div>

            {/* Financial Summary */}
            {selectedTicket.financials && (
              <section className="space-y-4">
                <div className="flex items-center gap-2 border-b border-[#f5f5f5] pb-2">
                   <DollarSign size={16} className="text-[#3ecf8e]" />
                   <h4 className="text-[11px] font-black uppercase text-[#1c1c1c] tracking-widest">Bilan Financier</h4>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-[#f0fdf4] border border-[#dcfce7] rounded-xl flex items-center justify-between">
                     <span className="text-[10px] font-black text-[#16a34a] uppercase">Total Devis</span>
                     <span className="text-[14px] font-black text-[#16a34a] font-mono">{(selectedTicket.financials.grandTotal || 0).toLocaleString()} F</span>
                  </div>
                </div>
              </section>
            )}

            {/* Manager Actions */}
            <div className="pt-10 grid grid-cols-2 gap-3 border-t border-[#f5f5f5]">
              <button 
                onClick={() => { setEditingTicket(selectedTicket); setIsModalOpen(true); }}
                className="btn-sb-outline h-14 justify-center font-black uppercase text-[11px] tracking-widest rounded-2xl"
              >
                <Edit3 size={18}/><span>Ajuster Dossier</span>
              </button>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default Tickets;
