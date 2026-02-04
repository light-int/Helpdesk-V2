
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, Search, RefreshCw, Ticket as TicketIcon,
  Filter, MapPin, Edit3, CheckCircle2, Phone, 
  User, ShieldCheck, Zap, Info, ArrowRight,
  Clock, FileCheck, Package, ClipboardList, X, Trash2,
  Wrench, AlertTriangle, FileText, Lock, ListChecks
} from 'lucide-react';
import { useData, useNotifications, useUser } from '../App';
import { Ticket, TicketCategory, Product, Technician, ShowroomConfig, UsedPart } from '../types';
import Drawer from '../components/Drawer';
import Modal from '../components/Modal';

/**
 * Page de gestion des Tickets et du SAV.
 * Permet le suivi des dossiers techniques et l'affectation des experts.
 */
const Tickets: React.FC = () => {
  const { tickets, products, brands, technicians, refreshAll, isSyncing, saveTicket, isLoading, showrooms } = useData();
  const { currentUser } = useUser();
  const { addNotification } = useNotifications();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [statusFilter, setStatusFilter] = useState('Tous');
  const [categoryFilter, setCategoryFilter] = useState('Tous');
  const [priorityFilter, setPriorityFilter] = useState('Tous');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => { refreshAll(); }, [refreshAll]);

  // Droits d'accès élargis pour la gestion
  const canManage = currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER' || currentUser?.role === 'AGENT';
  const isTechnician = currentUser?.role === 'TECHNICIAN';

  const filtered = useMemo(() => {
    return (tickets || []).filter((t: Ticket) => {
      if (t.isArchived) return false;
      // Les techniciens ne voient que leurs dossiers
      if (isTechnician && t.assignedTechnicianId !== currentUser?.id) return false;
      
      const matchesSearch = (t.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (t.id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (t.productName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (t.serialNumber || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'Tous' || t.status === statusFilter;
      const matchesCategory = categoryFilter === 'Tous' || t.category === categoryFilter;
      const matchesPriority = priorityFilter === 'Tous' || t.priority === priorityFilter;
      
      return matchesSearch && matchesStatus && matchesCategory && matchesPriority;
    }).sort((a: Ticket, b: Ticket) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime());
  }, [tickets, searchTerm, statusFilter, categoryFilter, priorityFilter, isTechnician, currentUser?.id]);

  const handleSaveTicket = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isTechnician) return;
    
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
      addNotification({ title: 'Clôture impossible', message: 'Le rapport d\'intervention est manquant.', type: 'warning' });
      return;
    }
    if (!window.confirm('Voulez-vous clôturer définitivement ce dossier SAV ?')) return;
    setIsSaving(true);
    try {
      const updated: Ticket = { ...ticket, status: 'Fermé', lastUpdate: new Date().toISOString() };
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
      case "En attente d'approbation": return 'bg-[#fff5f5] text-[#c53030] border-[#fed7d7]';
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
          <h1 className="text-2xl font-bold text-[#1c1c1c] tracking-tight">
            {isTechnician ? 'Mes Dossiers SAV' : 'Dossiers SAV'}
          </h1>
          <p className="text-xs text-[#686868] mt-1 font-medium">
            {isTechnician ? 'Liste des interventions techniques qui vous sont affectées.' : 'Monitoring centralisé des interventions techniques Plaza.'}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={refreshAll} className="btn-sb-outline h-10 px-3">
            <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
          </button>
          {!isTechnician && (
            <button onClick={() => { setEditingTicket(null); setIsModalOpen(true); }} className="btn-sb-primary h-10 px-4">
              <Plus size={16} /> <span>Ouvrir Ticket</span>
            </button>
          )}
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
                <option value="En attente d'approbation">En attente d'approbation</option>
                <option value="Résolu">Résolu</option>
                <option value="Fermé">Fermé</option>
              </select>
            </div>
            <div className="space-y-1.5 flex-1 min-w-[150px]">
              <label className="text-[10px] font-bold text-[#686868] uppercase">Catégorie</label>
              <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="w-full h-9 text-xs">
                <option value="Tous">Toutes</option>
                <option value="SAV">SAV</option>
                <option value="Installation">Installation</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Livraison">Livraison</option>
              </select>
            </div>
            <div className="space-y-1.5 flex-1 min-w-[150px]">
              <label className="text-[10px] font-bold text-[#686868] uppercase">Priorité</label>
              <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} className="w-full h-9 text-xs">
                <option value="Tous">Toutes</option>
                <option value="Urgent">Urgent</option>
                <option value="Haute">Haute</option>
                <option value="Moyenne">Moyenne</option>
                <option value="Basse">Basse</option>
              </select>
            </div>
          </div>
        )}
      </div>

      <div className="sb-table-container">
        <table className="w-full text-left sb-table">
          <thead>
            <tr>
              <th className="w-24">ID</th>
              <th>Client & Site</th>
              <th>Produit</th>
              <th>Expert</th>
              <th className="text-right">Statut</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t: Ticket) => (
              <tr key={t.id} onClick={() => setSelectedTicket(t)} className="cursor-pointer group hover:bg-[#fafafa]">
                <td className="font-mono text-[11px] font-black group-hover:text-[#3ecf8e]">#{t.id}</td>
                <td>
                  <p className="text-[13px] font-black text-[#1c1c1c]">{t.customerName}</p>
                  <p className="text-[11px] text-[#686868] flex items-center gap-1 font-bold">
                    <MapPin size={10} className="text-[#3ecf8e]"/> {t.showroom}
                  </p>
                </td>
                <td>
                  <p className="text-[12px] font-black text-[#1c1c1c] truncate max-w-[150px]">{t.productName || t.category}</p>
                  <span className={`px-2 py-0.5 rounded border text-[9px] font-black uppercase ${getPriorityStyle(t.priority)}`}>
                    {t.priority}
                  </span>
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    <img 
                      src={technicians.find((tec: Technician) => tec.id === t.assignedTechnicianId)?.avatar || "https://ui-avatars.com/api/?name=Unassigned"} 
                      className="w-7 h-7 rounded-lg border border-[#ededed] object-cover" 
                      alt="" 
                    />
                    <span className="text-[11px] font-black text-[#4b5563]">
                      {technicians.find((tec: Technician) => tec.id === t.assignedTechnicianId)?.name.split(' ')[0] || "En attente"}
                    </span>
                  </div>
                </td>
                <td className="text-right">
                  <span className={`px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${getStatusStyle(t.status)}`}>
                    {t.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-20 text-center space-y-4 opacity-30">
            <TicketIcon size={48} className="mx-auto text-[#686868]" />
            <p className="text-sm font-bold text-[#686868] uppercase tracking-widest">Aucun dossier trouvé</p>
          </div>
        )}
      </div>

      <Drawer 
        isOpen={!!selectedTicket} 
        onClose={() => setSelectedTicket(null)} 
        title="Dossier SAV Plaza" 
        icon={<TicketIcon size={18}/>}
      >
        {selectedTicket && (
          <div className="space-y-8 pb-10">
            <div className="flex items-center justify-between p-6 bg-[#f8f9fa] border border-[#ededed] rounded-2xl shadow-sm">
              <div>
                <p className="text-[10px] font-black text-[#686868] uppercase tracking-[0.2em] mb-1">Identifiant Dossier</p>
                <h3 className="text-xl font-black text-[#1c1c1c]">#{selectedTicket.id}</h3>
              </div>
              <span className={`px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${getStatusStyle(selectedTicket.status)}`}>
                {selectedTicket.status}
              </span>
            </div>

            <section className="space-y-4">
              <h4 className="text-[11px] font-black text-[#686868] uppercase tracking-widest border-b border-[#f5f5f5] pb-2">Identité Client</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-white border border-[#ededed] rounded-xl flex items-center gap-3">
                  <User size={16} className="text-[#3ecf8e]"/>
                  <div>
                    <p className="text-[10px] text-[#686868] font-bold uppercase">Client</p>
                    <p className="text-[13px] font-black text-[#1c1c1c]">{selectedTicket.customerName}</p>
                  </div>
                </div>
                <div className="p-4 bg-white border border-[#ededed] rounded-xl flex items-center gap-3">
                  <Phone size={16} className="text-[#3ecf8e]"/>
                  <div>
                    <p className="text-[10px] text-[#686868] font-bold uppercase">Téléphone</p>
                    <p className="text-[13px] font-black text-[#1c1c1c]">{selectedTicket.customerPhone || "N/A"}</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h4 className="text-[11px] font-black text-[#686868] uppercase tracking-widest border-b border-[#f5f5f5] pb-2">Audit Technique</h4>
              <div className="p-5 bg-white border border-[#ededed] rounded-2xl space-y-4 shadow-sm">
                <div>
                  <p className="text-[10px] text-[#3ecf8e] font-black uppercase mb-1">{selectedTicket.brand || "Marque Standard"}</p>
                  <p className="text-base font-black text-[#1c1c1c]">{selectedTicket.productName || selectedTicket.category}</p>
                  <p className="text-[11px] text-[#686868] font-mono mt-1 font-bold">SERIAL: {selectedTicket.serialNumber || "NON RÉPERTORIÉ"}</p>
                </div>
                <div className="pt-4 border-t border-[#f5f5f5]">
                   <p className="text-[10px] font-black text-[#686868] uppercase mb-2">Symptôme rapporté</p>
                   <p className="text-[13px] text-[#4b5563] leading-relaxed font-medium italic">"{selectedTicket.description}"</p>
                </div>
              </div>
            </section>

            {selectedTicket.interventionReport?.equipmentStatus && (
              <section className="space-y-6">
                <h4 className="text-[11px] font-black text-[#686868] uppercase tracking-widest border-b border-[#f5f5f5] pb-2">Rapport d'Expertise Certifié</h4>
                
                <div className="p-6 bg-[#f0fdf4] border border-[#dcfce7] rounded-2xl shadow-sm space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-[#16a34a]"/>
                      <p className="text-[11px] font-black text-[#16a34a] uppercase tracking-widest">État Final</p>
                    </div>
                    {selectedTicket.interventionReport.isWarrantyValid && (
                      <span className="px-2 py-0.5 bg-white text-[#16a34a] text-[9px] font-black rounded border border-[#dcfce7] uppercase">Sous Garantie</span>
                    )}
                  </div>
                  
                  <p className="text-[15px] font-black text-[#1c1c1c]">{selectedTicket.interventionReport.equipmentStatus}</p>

                  {selectedTicket.interventionReport.detailedDiagnostic && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-[#686868]"><Info size={12}/><p className="text-[9px] font-black uppercase">Analyse Technique</p></div>
                      <p className="text-[12px] text-[#4b5563] leading-relaxed bg-white/50 p-3 rounded-xl border border-[#dcfce7]">{selectedTicket.interventionReport.detailedDiagnostic}</p>
                    </div>
                  )}

                  {selectedTicket.interventionReport.repairProcedure && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-[#686868]"><Wrench size={12}/><p className="text-[9px] font-black uppercase">Travaux effectués</p></div>
                      <p className="text-[12px] text-[#4b5563] leading-relaxed bg-white/50 p-3 rounded-xl border border-[#dcfce7]">{selectedTicket.interventionReport.repairProcedure}</p>
                    </div>
                  )}

                  {/* --- AFFICHAGE DES ACTIONS EFFECTUÉES --- */}
                  {selectedTicket.interventionReport.actionsTaken && selectedTicket.interventionReport.actionsTaken.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-[#686868]"><ListChecks size={12}/><p className="text-[9px] font-black uppercase">Actions menées</p></div>
                      <div className="flex flex-wrap gap-2">
                        {selectedTicket.interventionReport.actionsTaken.map((a: string, idx: number) => (
                          <span key={idx} className="px-2.5 py-1.5 bg-white text-[10px] font-bold text-[#16a34a] rounded-lg border border-[#dcfce7] shadow-sm flex items-center gap-1.5">
                            <CheckCircle2 size={10} /> {a}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedTicket.interventionReport.partsUsed && selectedTicket.interventionReport.partsUsed.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-[#686868]"><Package size={12}/><p className="text-[9px] font-black uppercase">Consommation de pièces</p></div>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedTicket.interventionReport.partsUsed.map((p: UsedPart, idx: number) => (
                          <span key={idx} className="px-2 py-1 bg-white text-[10px] font-bold rounded-lg border border-[#dcfce7]">{p.name} (x{p.quantity})</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedTicket.interventionReport.recommendations && (
                    <div className="space-y-2 pt-4 border-t border-white/50">
                      <p className="text-[12px] text-[#4b5563] leading-relaxed"><strong>Préconisations :</strong> {selectedTicket.interventionReport.recommendations}</p>
                    </div>
                  )}
                </div>

                {canManage && selectedTicket.interventionReport.internalNotes && (
                   <div className="p-5 bg-red-50 border border-red-100 rounded-2xl space-y-3">
                      <div className="flex items-center gap-2 text-red-500">
                        <Lock size={14}/>
                        <p className="text-[10px] font-black uppercase tracking-widest">Notes de Service Internes</p>
                      </div>
                      <p className="text-[12px] text-red-700 leading-relaxed italic">{selectedTicket.interventionReport.internalNotes}</p>
                   </div>
                )}
              </section>
            )}

            <div className="pt-8 grid grid-cols-2 gap-3">
              {!isTechnician && selectedTicket.status !== 'Fermé' && (
                <button 
                  onClick={() => { setEditingTicket(selectedTicket); setIsModalOpen(true); }}
                  className="btn-sb-outline h-12 justify-center font-black uppercase text-[11px] tracking-widest rounded-xl"
                >
                  <Edit3 size={16}/> <span>Éditer Dossier</span>
                </button>
              )}
              {/* Clôture autorisée pour Admin, Manager et Agent sur les dossiers résolus ou en attente */}
              {canManage && (selectedTicket.status === 'Résolu' || selectedTicket.status === "En attente d'approbation") && (
                <button 
                  onClick={() => handleCloseTicket(selectedTicket)}
                  className="btn-sb-primary h-12 justify-center font-black uppercase text-[11px] tracking-widest rounded-xl shadow-lg shadow-[#3ecf8e]/20"
                >
                  <CheckCircle2 size={16}/> <span>Certifier & Fermer</span>
                </button>
              )}
            </div>
          </div>
        )}
      </Drawer>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); setEditingTicket(null); }} 
        title={editingTicket ? "Mise à jour Dossier" : "Création Nouveau Ticket SAV"}
      >
        <form onSubmit={handleSaveTicket} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#686868] uppercase tracking-widest">Identité Client</label>
              <input name="customerName" type="text" defaultValue={editingTicket?.customerName} placeholder="Nom complet" required className="w-full" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#686868] uppercase tracking-widest">Numéro Mobile</label>
              <input name="customerPhone" type="tel" defaultValue={editingTicket?.customerPhone} placeholder="+241 ..." required className="w-full" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#686868] uppercase tracking-widest">Type d'Intervention</label>
              <select name="category" defaultValue={editingTicket?.category || 'SAV'} className="w-full">
                <option value="SAV">SAV / Réparation</option>
                <option value="Installation">Installation</option>
                <option value="Maintenance">Maintenance préventive</option>
                <option value="Livraison">Livraison & Mise en service</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#686868] uppercase tracking-widest">Priorité Opérationnelle</label>
              <select name="priority" defaultValue={editingTicket?.priority || 'Moyenne'} className="w-full">
                <option value="Basse">Basse</option>
                <option value="Moyenne">Moyenne</option>
                <option value="Haute">Haute</option>
                <option value="Urgent">URGENT / CRITIQUE</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#686868] uppercase tracking-widest">Site Showroom</label>
              <select name="showroom" defaultValue={editingTicket?.showroom || 'Glass'} className="w-full">
                {showrooms?.map((s: ShowroomConfig) => <option key={s.id} value={s.id}>{s.id}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#686868] uppercase tracking-widest">Canal d'Entrée</label>
              <select name="source" defaultValue={editingTicket?.source || 'Interne'} className="w-full">
                <option value="WhatsApp">WhatsApp support</option>
                <option value="Messenger">Messenger Plaza</option>
                <option value="Email">Support central (Email)</option>
                <option value="Phone">Accueil téléphonique</option>
                <option value="Interne">Comptoir Boutique</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#686868] uppercase tracking-widest">Modèle Matériel</label>
              <input name="productName" type="text" defaultValue={editingTicket?.productName} placeholder="ex: Split LG ArtCool 12k" className="w-full" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#686868] uppercase tracking-widest">Marque Certifiée</label>
              <select name="brand" defaultValue={editingTicket?.brand || 'LG'} className="w-full">
                {brands?.map((b: string) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#686868] uppercase tracking-widest">Expert Technique</label>
              <select name="technicianId" defaultValue={editingTicket?.assignedTechnicianId} className="w-full">
                <option value="">-- Non affecté --</option>
                {technicians?.map((tec: Technician) => <option key={tec.id} value={tec.id}>{tec.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#686868] uppercase tracking-widest">Sévérité Impact</label>
              <select name="clientImpact" defaultValue={editingTicket?.clientImpact || 'Faible'} className="w-full">
                <option value="Faible">Faible impact</option>
                <option value="Modéré">Dysfonctionnement partiel</option>
                <option value="Critique">Arrêt total de service</option>
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-[#686868] uppercase tracking-widest">Description des symptômes</label>
            <textarea name="description" rows={3} defaultValue={editingTicket?.description} placeholder="Saisir les détails rapportés par le client..." required className="w-full" />
          </div>
          <div className="flex justify-end gap-3 pt-6 border-t border-[#f5f5f5]">
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn-sb-outline h-11 px-8 text-[11px] font-black uppercase rounded-xl">Annuler</button>
            <button type="submit" disabled={isSaving} className="btn-sb-primary h-11 px-12 text-[11px] font-black uppercase rounded-xl shadow-lg shadow-[#3ecf8e]/20">
              {isSaving ? <RefreshCw className="animate-spin" size={16}/> : (editingTicket ? 'Valider Mise à jour' : 'Émettre Ticket')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Tickets;
