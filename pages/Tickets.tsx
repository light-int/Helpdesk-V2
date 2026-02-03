
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, Search, RefreshCw, Ticket as TicketIcon,
  Filter, MapPin, Edit3, CheckCircle2
} from 'lucide-react';
import { useData, useNotifications } from '../App';
import { Ticket, TicketCategory, Product } from '../types';
import Drawer from '../components/Drawer';
import Modal from '../components/Modal';

const Tickets: React.FC = () => {
  const { tickets, products, brands, refreshAll, isSyncing, saveTicket } = useData();
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

  useEffect(() => { refreshAll(); }, [refreshAll]);

  const filtered = useMemo(() => {
    return (tickets || []).filter((t: Ticket) => {
      if (t.isArchived) return false;
      
      const matchesSearch = t.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (t.productName || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'Tous' || t.status === statusFilter;
      const matchesCategory = categoryFilter === 'Tous' || t.category === categoryFilter;
      const matchesPriority = priorityFilter === 'Tous' || t.priority === priorityFilter;
      
      return matchesSearch && matchesStatus && matchesCategory && matchesPriority;
    }).sort((a: Ticket, b: Ticket) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime());
  }, [tickets, searchTerm, statusFilter, categoryFilter, priorityFilter]);

  const handleCreateTicket = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    const formData = new FormData(e.currentTarget);
    
    const newTicket: Ticket = {
      id: `T-${Date.now().toString().slice(-6)}`,
      customerName: formData.get('customerName') as string,
      customerPhone: formData.get('customerPhone') as string,
      source: (formData.get('source') as any) || 'Interne',
      showroom: formData.get('showroom') as string,
      category: formData.get('category') as TicketCategory,
      status: 'Nouveau',
      priority: (formData.get('priority') as any) || 'Moyenne',
      productName: formData.get('productName') as string,
      brand: formData.get('brand') as string,
      description: formData.get('description') as string,
      location: formData.get('location') as string,
      clientImpact: (formData.get('clientImpact') as any) || 'Faible',
      assignedTechnicianId: (formData.get('technicianId') as string) || undefined,
      createdAt: new Date().toISOString(),
      lastUpdate: new Date().toISOString(),
      financials: {
        partsTotal: 0, partsCost: 0, laborTotal: 0, laborCost: 0, travelFee: 5000, 
        logisticsCost: 2000, discount: 0, grandTotal: 5000, netMargin: 0, isPaid: false
      }
    };

    try {
      await saveTicket(newTicket);
      addNotification({ title: 'Succès', message: 'Nouveau ticket créé.', type: 'success' });
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

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-sb-entry pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1c1c1c] tracking-tight">Dossiers SAV</h1>
          <p className="text-xs text-[#686868] mt-1 font-medium">Monitoring centralisé des interventions techniques Plaza.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={refreshAll} className="btn-sb-outline h-10 px-3"><RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} /></button>
          <button onClick={() => setIsModalOpen(true)} className="btn-sb-primary h-10 px-4"><Plus size={16} /> <span>Ouvrir Ticket</span></button>
        </div>
      </header>

      <div className="space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 text-[#686868]" size={16} />
            <input type="text" placeholder="Rechercher par ID, client ou matériel..." className="w-full pl-10 h-11" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          <button onClick={() => setShowFilters(!showFilters)} className={`btn-sb-outline h-11 px-4 ${showFilters ? 'border-[#3ecf8e] text-[#3ecf8e]' : ''}`}><Filter size={16} /> <span className="text-xs">Filtres</span></button>
        </div>

        {showFilters && (
          <div className="sb-card p-4 flex flex-wrap gap-6 animate-sb-entry bg-[#fcfcfc]">
            <div className="space-y-1.5 flex-1 min-w-[150px]"><label className="text-[10px] font-bold text-[#686868] uppercase">État</label><select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full h-9 text-xs"><option value="Tous">Tous</option><option value="Nouveau">Nouveau</option><option value="En cours">En cours</option><option value="Résolu">Résolu</option></select></div>
            <div className="space-y-1.5 flex-1 min-w-[150px]"><label className="text-[10px] font-bold text-[#686868] uppercase">Priorité</label><select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} className="w-full h-9 text-xs"><option value="Tous">Tous</option><option value="Urgent">Urgent</option><option value="Moyenne">Moyenne</option></select></div>
          </div>
        )}
      </div>

      <div className="sb-table-container">
        <table className="w-full text-left sb-table">
          <thead><tr><th>ID</th><th>Client</th><th>Matériel</th><th>Zone</th><th className="text-right">Statut</th></tr></thead>
          <tbody>
            {filtered.map((t: Ticket) => (
              <tr key={t.id} onClick={() => setSelectedTicket(t)} className="cursor-pointer group">
                <td className="font-mono text-[11px] font-black group-hover:text-[#3ecf8e]">#{t.id}</td>
                <td><p className="font-bold text-sm">{t.customerName}</p><p className="text-[11px] text-[#686868]">{t.customerPhone}</p></td>
                <td><p className="text-xs font-bold">{t.productName}</p><p className="text-[10px] text-[#3ecf8e] font-black uppercase">{t.brand}</p></td>
                <td><div className="flex items-center gap-1.5 text-[#686868]"><MapPin size={12}/><span className="text-[11px] font-medium">{t.location || t.showroom}</span></div></td>
                <td className="text-right"><span className={`px-2 py-0.5 rounded border text-[10px] font-black uppercase tracking-tight ${getStatusStyle(t.status)}`}>{t.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nouveau Dossier SAV">
        <form onSubmit={handleCreateTicket} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="space-y-1.5"><label className="text-[10px] font-bold text-[#686868] uppercase">Client</label><input name="customerName" type="text" required className="w-full" /></div>
             <div className="space-y-1.5"><label className="text-[10px] font-bold text-[#686868] uppercase">Contact</label><input name="customerPhone" type="tel" required className="w-full" /></div>
             <div className="space-y-1.5"><label className="text-[10px] font-bold text-[#686868] uppercase">Produit</label><input name="productName" list="prodList" type="text" required className="w-full" /><datalist id="prodList">{(products || []).map((p: Product) => <option key={p.id} value={p.name} />)}</datalist></div>
             <div className="space-y-1.5"><label className="text-[10px] font-bold text-[#686868] uppercase">Marque</label><select name="brand" className="w-full">{(brands || []).map((b: string) => <option key={b} value={b}>{b}</option>)}</select></div>
          </div>
          <div className="space-y-1.5"><label className="text-[10px] font-bold text-[#686868] uppercase">Détails Anomalie</label><textarea name="description" rows={3} required className="w-full" /></div>
          <div className="flex justify-end gap-3 pt-6 border-t"><button type="button" onClick={() => setIsModalOpen(false)} className="btn-sb-outline">Annuler</button><button type="submit" disabled={isSaving} className="btn-sb-primary h-11 px-8">{isSaving ? <RefreshCw className="animate-spin" size={16}/> : 'Créer Dossier'}</button></div>
        </form>
      </Modal>

      <Drawer isOpen={!!selectedTicket} onClose={() => setSelectedTicket(null)} title="Dossier Technique" subtitle={`Réf: #${selectedTicket?.id}`} icon={<TicketIcon size={18}/>}>
        {selectedTicket && (
          <div className="space-y-8 animate-sb-entry pb-10">
            <div className="p-4 bg-[#f8f9fa] border border-[#ededed] rounded-lg flex items-center justify-between"><div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${getStatusStyle(selectedTicket.status)}`}>{selectedTicket.status}</div><span className={`text-[10px] font-bold uppercase ${getPriorityStyle(selectedTicket.priority).split(' ')[0]}`}>{selectedTicket.priority}</span></div>
            <div className="grid grid-cols-2 gap-4"><div className="p-5 bg-white border border-[#ededed] rounded-xl shadow-sm space-y-2"><p className="text-[10px] font-black uppercase text-[#686868]">Client</p><p className="font-black text-[#1c1c1c]">{selectedTicket.customerName}</p></div><div className="p-5 bg-white border border-[#ededed] rounded-xl shadow-sm space-y-2"><p className="text-[10px] font-black uppercase text-[#686868]">Matériel</p><p className="font-black text-[#1c1c1c]">{selectedTicket.productName}</p></div></div>
            <div className="space-y-3"><h4 className="text-[11px] font-black uppercase text-[#686868] border-b pb-2">Journal</h4><div className="p-4 bg-[#fcfcfc] border rounded-lg italic text-[13px]">"{selectedTicket.description}"</div></div>
            <div className="pt-6 grid grid-cols-2 gap-3"><button className="btn-sb-outline h-12 justify-center font-black uppercase text-[11px] tracking-widest"><Edit3 size={14}/><span>Modifier</span></button><button className="btn-sb-primary h-12 justify-center font-black uppercase text-[11px] tracking-widest shadow-md"><CheckCircle2 size={14}/><span>Résoudre</span></button></div>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default Tickets;
