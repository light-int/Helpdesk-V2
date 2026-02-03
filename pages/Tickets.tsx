
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, Search, RefreshCw, Ticket as TicketIcon,
  Filter, MapPin, Edit3, CheckCircle2, Phone, 
  Calendar, ShieldCheck, User, Zap, Info,
  DollarSign, Wrench, ArrowRight, AlertTriangle,
  Mail, MessageSquare, Clock, FileCheck, BarChart4
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

  const isManager = currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER';

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

  const handleCloseTicket = async (ticket: Ticket) => {
    if (!ticket.interventionReport?.equipmentStatus) {
      addNotification({ 
        title: 'Clôture impossible', 
        message: 'Le technicien doit d\'abord soumettre son rapport d\'intervention.', 
        type: 'warning' 
      });
      return;
    }

    if (!window.confirm('Voulez-vous clôturer définitivement ce dossier SAV ?')) return;

    setIsSaving(true);
    try {
      const updated: Ticket = { 
        ...ticket, 
        status: 'Fermé', 
        lastUpdate: new Date().toISOString() 
      };
      await saveTicket(updated);
      addNotification({ title: 'Succès', message: 'Dossier SAV clôturé et archivé.', type: 'success' });
      setSelectedTicket(updated);
    } catch (err) {
      addNotification({ title: 'Erreur', message: 'Échec de la clôture.', type: 'error' });
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
          </div>
        )}
      </div>

      <div className="sb-table-container shadow-sm">
        <table className="w-full text-left sb-table">
          <thead>
            <tr>
              <th className="w-24">ID</th>
              <th>Client</th>
              <th>Matériel</th>
              <th>Rapport</th>
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
                  <p className="text-xs font-bold text-[#1c1c1c] truncate max-w-[180px]">{t.productName}</p>
                  <p className="text-[10px] text-[#3ecf8e] font-black uppercase tracking-tighter">{t.brand}</p>
                </td>
                <td>
                   {t.interventionReport?.equipmentStatus ? (
                     <div className="flex items-center gap-1.5 text-[#3ecf8e]">
                        <FileCheck size={14} />
                        <span className="text-[10px] font-black uppercase">Soumis</span>
                     </div>
                   ) : (
                     <div className="flex items-center gap-1.5 text-[#9ca3af]">
                        <Clock size={14} />
                        <span className="text-[10px] font-bold uppercase">Attente</span>
                     </div>
                   )}
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
        title="Audit Dossier SAV" 
        subtitle={`Réf: #${selectedTicket?.id}`} 
        icon={<BarChart4 size={18}/>}
        width="650px"
      >
        {selectedTicket && (
          <div className="space-y-8 animate-sb-entry pb-10">
            {/* Header Status Bar */}
            <div className="p-5 bg-[#f8f9fa] border border-[#ededed] rounded-2xl flex flex-col gap-4 shadow-sm">
               <div className="flex items-center justify-between">
                  <div className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border ${getStatusStyle(selectedTicket.status)}`}>
                    {selectedTicket.status}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase border ${getPriorityStyle(selectedTicket.priority)}`}>
                      Priorité {selectedTicket.priority}
                    </span>
                  </div>
               </div>
               <div className="grid grid-cols-2 gap-4 border-t border-[#ededed] pt-4">
                  <div className="flex items-center gap-2 text-[11px] font-bold text-[#686868]">
                    <Calendar size={14} className="text-[#3ecf8e]" />
                    <span>Ouvert le {new Date(selectedTicket.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] font-bold text-[#686868]">
                    <Clock size={14} className="text-[#3ecf8e]" />
                    <span>Dernier flux: {new Date(selectedTicket.lastUpdate).toLocaleTimeString()}</span>
                  </div>
               </div>
            </div>

            {/* Sections Client & Matériel */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <section className="space-y-3">
                <h4 className="text-[10px] font-black uppercase text-[#686868] tracking-widest flex items-center gap-2">
                  <User size={14} className="text-[#3ecf8e]"/> Profil Bénéficiaire
                </h4>
                <div className="p-4 bg-white border border-[#ededed] rounded-xl shadow-sm">
                   <p className="text-sm font-black text-[#1c1c1c]">{selectedTicket.customerName}</p>
                   <p className="text-xs font-bold text-[#3ecf8e] mt-0.5">{selectedTicket.customerPhone || '—'}</p>
                   <div className="mt-3 flex items-start gap-2 text-[11px] text-[#686868]">
                      <MapPin size={12} className="shrink-0 mt-0.5" />
                      <span className="font-medium italic">{selectedTicket.location || selectedTicket.showroom}</span>
                   </div>
                </div>
              </section>

              <section className="space-y-3">
                <h4 className="text-[10px] font-black uppercase text-[#686868] tracking-widest flex items-center gap-2">
                  <ShieldCheck size={14} className="text-[#3ecf8e]"/> Actif Technique
                </h4>
                <div className="p-4 bg-white border border-[#ededed] rounded-xl shadow-sm">
                   <p className="text-sm font-black text-[#1c1c1c] truncate">{selectedTicket.productName}</p>
                   <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-black text-[#3ecf8e] uppercase tracking-tighter bg-[#f0fdf4] px-1.5 rounded-sm border border-[#dcfce7]">{selectedTicket.brand}</span>
                      <span className="text-[10px] text-[#686868] font-bold">• {selectedTicket.category}</span>
                   </div>
                   <p className="text-[10px] font-mono font-bold text-[#686868] mt-2">S/N: {selectedTicket.serialNumber || '—'}</p>
                </div>
              </section>
            </div>

            {/* Rapport d'intervention (Manager view) */}
            <section className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#f5f5f5] pb-2">
                 <h4 className="text-[11px] font-black uppercase text-[#1c1c1c] tracking-widest flex items-center gap-2">
                   <Wrench size={16} className="text-[#3ecf8e]" /> Rapport Technique Expert
                 </h4>
                 {selectedTicket.assignedTechnicianId && (
                   <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-[#686868]">Par :</span>
                      <span className="text-[11px] font-black text-[#1c1c1c]">
                        {technicians.find((tec: Technician) => tec.id === selectedTicket.assignedTechnicianId)?.name}
                      </span>
                   </div>
                 )}
              </div>
              
              {selectedTicket.interventionReport?.equipmentStatus ? (
                <div className="space-y-4 animate-sb-entry">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-[#f0fdf4] border border-[#dcfce7] rounded-xl">
                       <p className="text-[9px] font-black text-[#16a34a] uppercase mb-1">État Final</p>
                       <p className="text-sm font-black text-[#1c1c1c]">{selectedTicket.interventionReport.equipmentStatus}</p>
                    </div>
                    <div className="p-4 bg-white border border-[#ededed] rounded-xl">
                       <p className="text-[9px] font-black text-[#686868] uppercase mb-1">Durée Tech</p>
                       <p className="text-sm font-black text-[#1c1c1c]">
                         {selectedTicket.interventionReport.durationMs ? `${Math.floor(selectedTicket.interventionReport.durationMs / 60000)} min` : '—'}
                       </p>
                    </div>
                  </div>
                  <div className="p-5 bg-[#fcfcfc] border border-dashed border-[#ededed] rounded-xl">
                    <p className="text-[10px] font-black text-[#686868] uppercase mb-2">Actions Certifiées</p>
                    <div className="flex flex-wrap gap-2">
                      {(selectedTicket.interventionReport.actionsTaken || []).map((a: string, i: number) => (
                        <span key={i} className="px-2 py-1 bg-white border border-[#ededed] text-[10px] font-bold text-[#1c1c1c] rounded shadow-xs">{a}</span>
                      ))}
                    </div>
                  </div>
                  <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-xl">
                    <p className="text-[10px] font-black text-amber-600 uppercase mb-2">Préconisations Expert</p>
                    <p className="text-[12px] text-[#1c1c1c] leading-relaxed italic">"{selectedTicket.interventionReport.recommendations || 'Aucune recommandation.'}"</p>
                  </div>
                </div>
              ) : (
                <div className="py-12 flex flex-col items-center justify-center border-2 border-dashed border-[#ededed] rounded-2xl bg-[#fcfcfc]">
                   <AlertTriangle size={32} className="text-amber-400 mb-3" />
                   <p className="text-[11px] font-black text-[#686868] uppercase tracking-widest text-center">Rapport technique en attente de soumission</p>
                   <p className="text-[10px] text-[#9ca3af] font-medium mt-1 italic">Le technicien doit certifier l'intervention avant clôture.</p>
                </div>
              )}
            </section>

            {/* Financial Bilan (MANAGER ONLY) */}
            {isManager && selectedTicket.financials && (
              <section className="space-y-4">
                <div className="flex items-center gap-2 border-b border-[#f5f5f5] pb-2">
                   <DollarSign size={16} className="text-[#3ecf8e]" />
                   <h4 className="text-[11px] font-black uppercase text-[#1c1c1c] tracking-widest">Bilan Financier & Marge</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-white border border-[#ededed] rounded-xl">
                     <p className="text-[9px] font-black text-[#686868] uppercase">Total Facturé</p>
                     <p className="text-lg font-black text-[#1c1c1c] font-mono mt-1">{(selectedTicket.financials.grandTotal || 0).toLocaleString()} F</p>
                  </div>
                  <div className="p-4 bg-white border border-[#ededed] rounded-xl">
                     <p className="text-[9px] font-black text-[#686868] uppercase">Coût Total (Parts+Lab)</p>
                     <p className="text-lg font-black text-red-500 font-mono mt-1">
                        {((selectedTicket.financials.partsCost || 0) + (selectedTicket.financials.laborCost || 0)).toLocaleString()} F
                     </p>
                  </div>
                  <div className="p-4 bg-[#f0fdf4] border border-[#dcfce7] rounded-xl">
                     <p className="text-[9px] font-black text-[#16a34a] uppercase">Marge Net</p>
                     <p className="text-lg font-black text-[#16a34a] font-mono mt-1">{(selectedTicket.financials.netMargin || 0).toLocaleString()} F</p>
                  </div>
                </div>
                <div className="p-3 bg-[#f8f9fa] border border-[#ededed] rounded-lg flex justify-between items-center">
                   <span className="text-[10px] font-black text-[#686868] uppercase">Statut Règlement</span>
                   <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${selectedTicket.financials.isPaid ? 'bg-[#3ecf8e] text-white' : 'bg-amber-500 text-white'}`}>
                      {selectedTicket.financials.isPaid ? 'Acquitté' : 'Solde restant'}
                   </span>
                </div>
              </section>
            )}

            {/* Actions Panel */}
            <div className="pt-10 grid grid-cols-2 gap-4 border-t border-[#f5f5f5]">
              <button 
                onClick={() => { setEditingTicket(selectedTicket); setIsModalOpen(true); }}
                className="btn-sb-outline h-14 justify-center font-black uppercase text-[11px] tracking-widest rounded-xl transition-all"
              >
                <Edit3 size={18}/><span>Ajuster Dossier</span>
              </button>
              
              <div className="relative group">
                <button 
                  onClick={() => handleCloseTicket(selectedTicket)}
                  disabled={!selectedTicket.interventionReport?.equipmentStatus || selectedTicket.status === 'Fermé'}
                  className={`w-full btn-sb-primary h-14 justify-center font-black uppercase text-[11px] tracking-widest rounded-xl shadow-lg transition-all ${
                    (!selectedTicket.interventionReport?.equipmentStatus || selectedTicket.status === 'Fermé') 
                      ? 'opacity-40 grayscale cursor-not-allowed shadow-none' 
                      : 'shadow-[#3ecf8e]/20'
                  }`}
                >
                  <CheckCircle2 size={18}/><span>{selectedTicket.status === 'Fermé' ? 'Dossier Clos' : 'Clôturer le Dossier'}</span>
                </button>
                
                {!selectedTicket.interventionReport?.equipmentStatus && (
                  <div className="absolute -top-12 left-0 right-0 hidden group-hover:block bg-[#1c1c1c] text-white text-[9px] font-black p-2 rounded text-center animate-sb-entry uppercase tracking-tighter">
                    Le rapport technicien est obligatoire
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </Drawer>

      {/* MODAL CREATION / EDITION (Inchangé mais pour référence) */}
      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingTicket(null); }} title={editingTicket ? `Modification Dossier ${editingTicket.id}` : "Ouverture de Dossier SAV"}>
        <form onSubmit={handleSaveTicket} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="space-y-1.5"><label className="text-[10px] font-bold text-[#686868] uppercase">Client</label><input name="customerName" type="text" defaultValue={editingTicket?.customerName} required className="w-full" /></div>
             <div className="space-y-1.5"><label className="text-[10px] font-bold text-[#686868] uppercase">Téléphone</label><input name="customerPhone" type="tel" defaultValue={editingTicket?.customerPhone} required className="w-full" /></div>
             <div className="space-y-1.5"><label className="text-[10px] font-bold text-[#686868] uppercase">Produit Horizon</label><input name="productName" list="prodList" type="text" defaultValue={editingTicket?.productName} required className="w-full" /><datalist id="prodList">{(products || []).map((p: Product) => <option key={p.id} value={p.name} />)}</datalist></div>
             <div className="space-y-1.5"><label className="text-[10px] font-bold text-[#686868] uppercase">Marque</label><select name="brand" defaultValue={editingTicket?.brand || 'LG'} className="w-full">{(brands || []).map((b: string) => <option key={b} value={b}>{b}</option>)}</select></div>
             <div className="space-y-1.5"><label className="text-[10px] font-bold text-[#686868] uppercase">S/N</label><input name="serialNumber" type="text" defaultValue={editingTicket?.serialNumber} placeholder="Numéro de série" className="w-full" /></div>
             <div className="space-y-1.5"><label className="text-[10px] font-bold text-[#686868] uppercase">Site / Ville</label><input name="location" type="text" defaultValue={editingTicket?.location} className="w-full" /></div>
             <div className="space-y-1.5">
               <label className="text-[10px] font-bold text-[#686868] uppercase">État Actuel</label>
               <select name="status" defaultValue={editingTicket?.status || 'Nouveau'} className="w-full">
                 <option value="Nouveau">Nouveau</option>
                 <option value="En cours">En cours</option>
                 <option value="Résolu">Résolu</option>
                 <option value="Fermé">Fermé (Archivé)</option>
               </select>
             </div>
             <div className="space-y-1.5">
               <label className="text-[10px] font-bold text-[#686868] uppercase">Priorité SLA</label>
               <select name="priority" defaultValue={editingTicket?.priority || 'Moyenne'} className="w-full">
                 <option value="Basse">Basse</option>
                 <option value="Moyenne">Moyenne</option>
                 <option value="Haute">Haute</option>
                 <option value="Urgent">Urgent</option>
               </select>
             </div>
             <div className="space-y-1.5">
               <label className="text-[10px] font-bold text-[#686868] uppercase">Showroom</label>
               <select name="showroom" defaultValue={editingTicket?.showroom || 'Glass'} className="w-full">
                 <option value="Glass">Plaza Glass</option>
                 <option value="Oloumi">Plaza Oloumi</option>
                 <option value="Bord de mer">Plaza Bord de mer</option>
                 <option value="Social Media">Vente Sociale</option>
               </select>
             </div>
             <div className="space-y-1.5">
               <label className="text-[10px] font-bold text-[#686868] uppercase">Catégorie</label>
               <select name="category" defaultValue={editingTicket?.category || 'SAV'} className="w-full">
                 <option value="SAV">SAV</option>
                 <option value="Installation">Installation</option>
                 <option value="Maintenance">Maintenance</option>
                 <option value="Livraison">Livraison</option>
               </select>
             </div>
             <div className="space-y-1.5 md:col-span-2">
               <label className="text-[10px] font-bold text-[#686868] uppercase">Expert Technique Affecté</label>
               <select name="technicianId" defaultValue={editingTicket?.assignedTechnicianId || ''} className="w-full">
                 <option value="">-- Aucun expert --</option>
                 {(technicians || []).map((t: Technician) => <option key={t.id} value={t.id}>{t.name}</option>)}
               </select>
             </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-[#686868] uppercase">Description du problème</label>
            <textarea name="description" rows={3} defaultValue={editingTicket?.description} required className="w-full resize-none" />
          </div>
          <div className="flex justify-end gap-3 pt-6 border-t">
            <button type="button" onClick={() => { setIsModalOpen(false); setEditingTicket(null); }} className="btn-sb-outline h-11 px-6">Annuler</button>
            <button type="submit" disabled={isSaving} className="btn-sb-primary h-11 px-10">
              {isSaving ? <RefreshCw className="animate-spin" size={16}/> : (editingTicket ? 'Mettre à jour' : 'Ouvrir le dossier')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Tickets;
