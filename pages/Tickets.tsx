
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, Search, RefreshCw, Filter, MoreHorizontal, 
  Sparkles, User, Clock, CheckCircle2, 
  AlertCircle, DollarSign, X, ChevronRight, ClipboardCheck, Info,
  Calendar, CreditCard, FileText, Settings, Activity, Save, Package,
  Edit3, Trash2, UserPlus, MapPin, Printer, Share2, MessageSquare,
  TrendingUp, Truck, Wrench, Users, History, AlertTriangle, ShieldCheck, Lock,
  ShieldAlert, Tag, Hash, Archive
} from 'lucide-react';
import { useData, useNotifications, useUser } from '../App';
import { analyzeTicketDescription } from '../services/geminiService';
import { Ticket, TicketStatus, TicketCategory, Showroom, UsedPart } from '../types';
import Modal from '../components/Modal';

const Tickets: React.FC = () => {
  const { tickets, refreshAll, isSyncing, technicians, products, customers, saveTicket, deleteTicket, showrooms, parts } = useData();
  const { currentUser } = useUser();
  const { addNotification } = useNotifications();
  const [searchTerm, setSearchTerm] = useState('');
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isInterventionModalOpen, setIsInterventionModalOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);

  // States pour le formulaire d'intervention
  const [actionsTaken, setActionsTaken] = useState<string[]>([]);
  const [usedParts, setUsedParts] = useState<UsedPart[]>([]);
  const [currentAction, setCurrentAction] = useState('');

  useEffect(() => { refreshAll(); }, []);

  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      if (t.isArchived) return false;

      // Filtrage par rôle pour les techniciens : seulement leurs dossiers assignés
      if (currentUser?.role === 'TECHNICIAN' && t.assignedTechnicianId !== currentUser.id) {
        return false;
      }

      const matchesSearch = t.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          t.serialNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          t.productName?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });
  }, [tickets, searchTerm, currentUser]);

  const handleAiAnalysis = async (e: React.MouseEvent, ticket: Ticket) => {
    e.stopPropagation();
    setAnalyzingId(ticket.id);
    const analysis = await analyzeTicketDescription(ticket.description);
    setAnalyzingId(null);
    if (analysis) {
      addNotification({ 
        title: `Analyse Ticket #${ticket.id}`, 
        message: `Suggéré : ${analysis.category} (${analysis.priority}). Résumé : ${analysis.summary}`, 
        type: 'info' 
      });
    }
  };

  const openAddModal = () => {
    setEditingTicket(null);
    setIsModalOpen(true);
  };

  const openEditModal = (t: Ticket) => {
    setEditingTicket(t);
    setIsModalOpen(true);
  };

  const openInterventionForm = (e: React.MouseEvent, t: Ticket) => {
    e.stopPropagation();
    if (t.status === 'Fermé' || t.isArchived) return;
    if (!t.assignedTechnicianId) {
      addNotification({ title: 'Assignation requise', message: 'Veuillez assigner un technicien avant de remplir le rapport.', type: 'warning' });
      return;
    }
    setEditingTicket(t);
    setActionsTaken(t.interventionReport?.actionsTaken || []);
    setUsedParts(t.interventionReport?.partsUsed || []);
    setIsInterventionModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const productRef = formData.get('productReference') as string;
    const product = products.find(p => p.reference === productRef);
    
    const ticketData: Ticket = {
      id: editingTicket?.id || `T-${Math.floor(1000 + Math.random() * 9000)}`,
      customerName: formData.get('customerName') as string,
      customerPhone: formData.get('customerPhone') as string,
      source: (formData.get('source') as any) || 'WhatsApp',
      showroom: (formData.get('showroom') as any) || 'Glass',
      category: (formData.get('category') as any) || 'SAV',
      status: (formData.get('status') as any) || 'Nouveau',
      priority: (formData.get('priority') as any) || 'Moyenne',
      productReference: productRef,
      productName: product?.name || formData.get('productName') as string,
      brand: product?.brand || (formData.get('brand') as string),
      serialNumber: formData.get('serialNumber') as string,
      purchaseDate: formData.get('purchaseDate') as string,
      description: formData.get('description') as string,
      location: formData.get('location') as string,
      assignedTechnicianId: formData.get('assignedTechnicianId') as string || undefined,
      createdAt: editingTicket?.createdAt || new Date().toISOString(),
      lastUpdate: new Date().toISOString(),
      financials: editingTicket?.financials || {
        partsTotal: 0, partsCost: 0, laborTotal: 0, laborCost: 0, logisticsCost: 0, 
        travelFee: 5000, discount: 0, grandTotal: 5000, netMargin: 3000, isPaid: false
      },
      isArchived: editingTicket?.isArchived || false
    };

    try {
      await saveTicket(ticketData);
      setIsModalOpen(false);
      setEditingTicket(null);
      addNotification({ title: 'Succès', message: 'Dossier SAV enregistré.', type: 'success' });
    } catch (err) {
      addNotification({ title: 'Erreur', message: 'Échec de la sauvegarde.', type: 'error' });
    }
  };

  const handleSaveIntervention = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTicket) return;

    const partsTotal = usedParts.reduce((sum, p) => sum + (p.unitPrice * p.quantity), 0);
    
    const updatedTicket: Ticket = {
      ...editingTicket,
      status: 'En attente d\'approbation',
      lastUpdate: new Date().toISOString(),
      interventionReport: {
        ...editingTicket.interventionReport,
        actionsTaken: actionsTaken,
        partsUsed: usedParts,
        performedAt: new Date().toISOString()
      },
      financials: {
        ...editingTicket.financials!,
        partsTotal: partsTotal,
        grandTotal: (editingTicket.financials?.laborTotal || 0) + (editingTicket.financials?.travelFee || 0) + partsTotal
      }
    };

    try {
      await saveTicket(updatedTicket);
      setIsInterventionModalOpen(false);
      if (selectedTicket?.id === updatedTicket.id) setSelectedTicket(updatedTicket);
      addNotification({ title: 'Rapport technique', message: 'Rapport soumis pour validation administrative.', type: 'info' });
    } catch (err) {
      console.error(err);
    }
  };

  const handleFinalClosure = async () => {
    if (!selectedTicket || !selectedTicket.interventionReport) return;
    
    const updatedTicket: Ticket = {
      ...selectedTicket,
      status: 'Fermé',
      lastUpdate: new Date().toISOString(),
    };

    try {
      await saveTicket(updatedTicket);
      setSelectedTicket(updatedTicket);
      addNotification({ title: 'Dossier Fermé', message: 'Le ticket a été clôturé définitivement.', type: 'success' });
    } catch (err) {
      console.error(err);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Urgent': return 'text-red-600 bg-red-50 border-red-100';
      case 'Haute': return 'text-orange-600 bg-orange-50 border-orange-100';
      case 'Moyenne': return 'text-blue-600 bg-blue-50 border-blue-100';
      default: return 'text-gray-600 bg-gray-50 border-gray-100';
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

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const hasInterventionReport = selectedTicket?.interventionReport && 
                                (selectedTicket.interventionReport.actionsTaken?.length || 0) > 0;

  return (
    <div className="relative h-[calc(100vh-100px)] flex flex-col space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-normal text-[#3c4043]">Tickets & SAV</h1>
          <p className="text-[#5f6368] text-sm">
            {currentUser?.role === 'TECHNICIAN' ? 'Gestion de vos dossiers assignés.' : 'Gestion opérationnelle des dossiers Horizon.'}
          </p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
             <Search className="absolute left-3 top-2.5 text-[#5f6368]" size={18} />
             <input 
              type="text" 
              placeholder="Rechercher (ID, Client)..." 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              className="w-64 pl-10 h-10 bg-white shadow-sm" 
             />
          </div>
          {currentUser?.role !== 'TECHNICIAN' && (
            <button onClick={openAddModal} className="btn-google-primary shadow-sm hover:shadow-md transition-all active:scale-95">
              <Plus size={18} /> Nouveau Dossier
            </button>
          )}
        </div>
      </header>

      <div className="google-card overflow-hidden flex-1 flex flex-col">
        <div className="px-6 py-3 border-b border-[#dadce0] flex items-center justify-between bg-[#f8f9fa]">
           <div className="flex items-center gap-4">
              <button className="text-[#5f6368] hover:bg-[#e8eaed] p-2 rounded-full transition-colors"><Filter size={18} /></button>
              <span className="text-xs font-black text-[#5f6368] uppercase tracking-widest">{filteredTickets.length} Dossiers</span>
           </div>
           <button onClick={refreshAll} className="text-[#5f6368] hover:bg-[#e8eaed] p-2 rounded-full transition-colors">
              <RefreshCw size={18} className={isSyncing ? 'animate-spin' : ''} />
           </button>
        </div>
        
        <div className="overflow-y-auto flex-1">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-white z-10 border-b border-[#dadce0]">
              <tr className="text-[#5f6368] text-[10px] font-black uppercase tracking-widest">
                <th className="px-6 py-4">Dossier / Showroom</th>
                <th className="px-6 py-4">Client / Produit</th>
                <th className="px-6 py-4">Technicien</th>
                <th className="px-6 py-4 text-center">Priorité</th>
                <th className="px-6 py-4 text-center">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#dadce0]">
              {filteredTickets.map((ticket) => (
                <tr 
                  key={ticket.id} 
                  onClick={() => setSelectedTicket(ticket)}
                  className={`hover:bg-[#f8f9fa] transition-colors cursor-pointer group ${selectedTicket?.id === ticket.id ? 'bg-[#e8f0fe]' : ''}`}
                >
                  <td className="px-6 py-4">
                    <span className="font-bold text-[#1a73e8]">#{ticket.id}</span>
                    <p className="text-[10px] text-[#5f6368] font-bold uppercase mt-0.5">{ticket.showroom}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-[#3c4043]">{ticket.customerName}</p>
                    <p className="text-[10px] text-[#5f6368] truncate max-w-[180px] mt-0.5 italic">{ticket.productName}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#f1f3f4] flex items-center justify-center text-[#5f6368] border border-[#dadce0]">
                        <User size={12} />
                      </div>
                      <span className="text-xs font-medium text-[#5f6368]">
                        {technicians.find(tech => tech.id === ticket.assignedTechnicianId)?.name || 'Non assigné'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2 py-1 rounded border text-[10px] font-black uppercase tracking-tighter ${getPriorityColor(ticket.priority)}`}>
                      {ticket.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold border ${getStatusColor(ticket.status)}`}>
                      {ticket.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAIL DRAWER */}
      {selectedTicket && (
        <>
          <div className="fixed inset-0 bg-black/25 backdrop-blur-[2px] z-[60] animate-in fade-in" onClick={() => setSelectedTicket(null)} />
          <div className="fixed right-0 top-0 h-screen w-[600px] bg-white z-[70] flex flex-col shadow-[-15px_0_40px_-10px_rgba(0,0,0,0.15)] animate-in slide-in-from-right duration-300">
            <div className="p-4 border-b border-[#dadce0] flex items-center justify-between bg-[#f8f9fa]">
              <div className="flex items-center gap-3">
                 <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${getStatusColor(selectedTicket.status)}`}>
                   <ClipboardCheck size={16} />
                 </div>
                 <div>
                    <h2 className="text-sm font-bold text-[#3c4043] uppercase tracking-[0.1em]">Dossier #{selectedTicket.id}</h2>
                    <p className="text-[10px] text-[#5f6368] font-black uppercase tracking-widest">{selectedTicket.category} • {selectedTicket.showroom}</p>
                 </div>
              </div>
              <div className="flex gap-1">
                {!selectedTicket.isArchived && selectedTicket.status !== 'Fermé' && currentUser?.role !== 'TECHNICIAN' && (
                  <button onClick={() => { setSelectedTicket(null); openEditModal(selectedTicket); }} className="p-2 hover:bg-[#e8eaed] rounded-full text-[#1a73e8] transition-colors" title="Modifier">
                    <Edit3 size={18} />
                  </button>
                )}
                <button onClick={() => setSelectedTicket(null)} className="p-2 hover:bg-[#e8eaed] rounded-full text-[#5f6368] transition-colors" title="Fermer">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar pb-32">
              <div className="grid grid-cols-2 gap-4">
                 <div className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-1 text-center ${getPriorityColor(selectedTicket.priority)}`}>
                    <p className="text-[10px] font-black uppercase opacity-60">Priorité SLA</p>
                    <p className="text-sm font-black uppercase">{selectedTicket.priority}</p>
                 </div>
                 <div className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-1 text-center ${getStatusColor(selectedTicket.status)}`}>
                    <p className="text-[10px] font-black uppercase opacity-60">État Actuel</p>
                    <p className="text-sm font-black uppercase">{selectedTicket.status}</p>
                 </div>
              </div>

              <section className="space-y-4">
                <h3 className="text-[10px] font-black text-[#9aa0a6] uppercase tracking-[0.2em] flex items-center gap-2">
                  <Package size={16} /> Informations Équipement
                </h3>
                <div className="p-5 bg-white border border-[#dadce0] rounded-2xl shadow-sm space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[#f1f3f4] flex items-center justify-center text-[#5f6368]">
                      <Activity size={24} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Tag size={12} className="text-[#1a73e8]" />
                        <p className="text-[10px] font-black text-[#1a73e8] uppercase">{selectedTicket.brand || 'Marque inconnue'}</p>
                      </div>
                      <h4 className="text-sm font-bold text-[#3c4043]">{selectedTicket.productName || 'Matériel Plaza'}</h4>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-[#f1f3f4] flex justify-between items-center">
                    <div className="flex items-center gap-2">
                       <Hash size={14} className="text-[#5f6368]" />
                       <span className="text-[10px] font-black text-[#5f6368] uppercase tracking-wider">S/N:</span>
                       <span className="text-xs font-mono font-bold text-[#3c4043]">{selectedTicket.serialNumber || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <h3 className="text-[11px] font-black text-[#5f6368] uppercase tracking-[0.2em] flex items-center gap-2">
                  <UserPlus size={16} /> Technicien Responsable
                </h3>
                <div 
                  onClick={!selectedTicket.isArchived && selectedTicket.status !== 'Fermé' ? (e) => openInterventionForm(e, selectedTicket) : undefined}
                  className={`p-5 bg-white border rounded-2xl shadow-sm flex items-center gap-4 transition-all group ${selectedTicket.isArchived || selectedTicket.status === 'Fermé' ? 'border-gray-200 bg-gray-50/50 opacity-80 cursor-default' : 'border-[#dadce0] cursor-pointer hover:border-[#1a73e8] hover:bg-[#f8faff]'}`}
                >
                   {selectedTicket.assignedTechnicianId ? (
                     <>
                        <img 
                          src={technicians.find(t => t.id === selectedTicket.assignedTechnicianId)?.avatar} 
                          className="w-14 h-14 rounded-full border-2 border-[#1a73e8] p-0.5 shadow-sm" 
                          alt="" 
                        />
                        <div className="flex-1">
                           <p className="text-sm font-black text-[#3c4043]">{technicians.find(t => t.id === selectedTicket.assignedTechnicianId)?.name}</p>
                           <p className="text-[10px] font-black uppercase tracking-widest text-[#1a73e8]">Expert Certifié</p>
                        </div>
                     </>
                   ) : (
                     <p className="text-xs font-bold text-gray-400">Non assigné - Cliquer pour intervenir</p>
                   )}
                </div>
              </section>

              <section className="space-y-4">
                <h3 className="text-[11px] font-black text-[#5f6368] uppercase tracking-[0.2em] flex items-center gap-2">
                  <History size={16} /> Rapport d'Intervention Technique
                </h3>
                <div className="space-y-4">
                   {hasInterventionReport ? (
                     <div className="space-y-4">
                        <div className={`p-5 bg-white border rounded-2xl shadow-sm ${selectedTicket.status === 'Fermé' ? 'border-gray-200' : 'border-[#dadce0]'}`}>
                           <ul className="space-y-3">
                              {selectedTicket.interventionReport?.actionsTaken?.map((action, idx) => (
                                <li key={idx} className="flex gap-3 text-xs text-[#3c4043] font-medium items-start">
                                   <div className="w-2 h-2 rounded-full mt-1 shrink-0 bg-[#1a73e8]" />
                                   {action}
                                </li>
                              ))}
                           </ul>
                        </div>
                     </div>
                   ) : (
                     <p className="text-xs text-gray-400 italic">Aucun rapport technique disponible.</p>
                   )}
                </div>
              </section>
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-[#dadce0] bg-white flex flex-col gap-3">
              {selectedTicket.status === 'Fermé' ? (
                <div className="flex items-center justify-center gap-3 py-4 text-sm font-black uppercase tracking-[0.2em] bg-gray-100 text-gray-500 rounded-lg border border-gray-200">
                   <ShieldCheck size={20} /> Dossier Clôturé
                </div>
              ) : currentUser?.role !== 'TECHNICIAN' ? (
                <button 
                  onClick={handleFinalClosure}
                  disabled={!hasInterventionReport}
                  className={`w-full flex items-center justify-center gap-3 py-4 text-sm font-black uppercase tracking-[0.2em] shadow-lg transition-all ${
                    hasInterventionReport 
                    ? 'bg-green-600 text-white hover:bg-green-700 shadow-green-600/20' 
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                  }`}
                >
                  <Lock size={18} /> Clôturer Administrativement
                </button>
              ) : (
                <button 
                  onClick={(e) => openInterventionForm(e, selectedTicket)}
                  className="w-full flex items-center justify-center gap-3 py-4 text-sm font-black uppercase tracking-[0.2em] bg-[#1a73e8] text-white hover:bg-[#174ea6] shadow-lg"
                >
                  <Wrench size={18} /> Saisir Intervention Terrain
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* MODAL GESTION TICKET (CREATION/EDITION) */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingTicket ? `Édition Dossier #${editingTicket.id}` : "Ouverture d'un nouveau dossier SAV"}
        size="lg"
      >
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#5f6368] uppercase tracking-widest">Nom du Client</label>
              <input name="customerName" type="text" defaultValue={editingTicket?.customerName || ''} required className="bg-white" placeholder="Nom complet" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#5f6368] uppercase tracking-widest">Mobile Client</label>
              <input name="customerPhone" type="tel" defaultValue={editingTicket?.customerPhone || ''} required className="bg-white" placeholder="+241 ..." />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#5f6368] uppercase tracking-widest">Showroom Responsable</label>
              <select name="showroom" defaultValue={editingTicket?.showroom || 'Glass'} className="bg-white">
                {showrooms.map(s => <option key={s.id} value={s.id}>{s.id}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#5f6368] uppercase tracking-widest">Technicien Assigné</label>
              <select name="assignedTechnicianId" defaultValue={editingTicket?.assignedTechnicianId || ''} className="bg-white">
                <option value="">-- Non assigné --</option>
                {technicians.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#5f6368] uppercase tracking-widest">Priorité Opérationnelle</label>
              <select name="priority" defaultValue={editingTicket?.priority || 'Moyenne'} className="bg-white">
                <option value="Basse">Basse</option>
                <option value="Moyenne">Moyenne</option>
                <option value="Haute">Haute</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#5f6368] uppercase tracking-widest">Catégorie</label>
              <select name="category" defaultValue={editingTicket?.category || 'SAV'} className="bg-white">
                <option value="SAV">SAV / Réparation</option>
                <option value="Installation">Installation</option>
                <option value="Livraison">Livraison</option>
                <option value="Maintenance">Maintenance</option>
              </select>
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-[#5f6368] uppercase tracking-widest">Description du problème / Diagnostic initial</label>
              <textarea name="description" defaultValue={editingTicket?.description || ''} required className="bg-white h-24 resize-none" placeholder="Détails techniques..." />
            </div>
          </div>
          <div className="flex gap-3 pt-6 border-t border-[#dadce0]">
            <button type="submit" className="btn-google-primary flex-1 justify-center py-3">
              <Save size={18} /> Enregistrer le dossier
            </button>
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn-google-outlined flex-1">Annuler</button>
          </div>
        </form>
      </Modal>

      {/* MODAL RAPPORT D'INTERVENTION */}
      <Modal
        isOpen={isInterventionModalOpen}
        onClose={() => setIsInterventionModalOpen(false)}
        title="Rapport Technique Expert"
        size="lg"
      >
        <div className="space-y-8">
           <section className="space-y-4">
              <h4 className="text-xs font-black uppercase tracking-widest text-[#3c4043] flex items-center gap-2">
                <History size={16} className="text-[#1a73e8]" /> Actions menées sur le terrain
              </h4>
              <div className="flex gap-2">
                 <input 
                    type="text" 
                    value={currentAction}
                    onChange={(e) => setCurrentAction(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (() => { if(currentAction.trim()) { setActionsTaken([...actionsTaken, currentAction.trim()]); setCurrentAction(''); } })()}
                    placeholder="Action réalisée..."
                    className="flex-1 bg-white"
                 />
                 <button onClick={() => { if(currentAction.trim()) { setActionsTaken([...actionsTaken, currentAction.trim()]); setCurrentAction(''); } }} className="btn-google-primary px-4"><Plus size={18} /></button>
              </div>
              <div className="space-y-2">
                 {actionsTaken.map((action, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-[#f8f9fa] border border-[#dadce0] rounded-xl group">
                       <span className="text-xs text-[#3c4043] font-medium">{action}</span>
                       <button onClick={() => setActionsTaken(actionsTaken.filter((_, i) => i !== idx))} className="text-[#9aa0a6] hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14} /></button>
                    </div>
                 ))}
              </div>
           </section>

           <section className="space-y-4">
              <h4 className="text-xs font-black uppercase tracking-widest text-[#3c4043] flex items-center gap-2">
                <Package size={16} className="text-[#1a73e8]" /> Pièces facturées
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="h-[180px] overflow-y-auto border border-[#dadce0] rounded-xl bg-[#f8f9fa] divide-y divide-[#dadce0]">
                    {parts.map(p => (
                       <button key={p.id} onClick={() => {
                          const existing = usedParts.find(up => up.id === p.id);
                          if (existing) setUsedParts(usedParts.map(up => up.id === p.id ? { ...up, quantity: up.quantity + 1 } : up));
                          else setUsedParts([...usedParts, { id: p.id, name: p.name, quantity: 1, unitPrice: p.unitPrice }]);
                       }} className="w-full text-left p-3 hover:bg-white flex items-center justify-between group transition-colors">
                          <div><p className="text-xs font-bold text-[#3c4043]">{p.name}</p><p className="text-[10px] text-[#5f6368]">{p.brand}</p></div>
                          <Plus size={14} className="text-[#1a73e8] opacity-0 group-hover:opacity-100" />
                       </button>
                    ))}
                 </div>
                 <div className="space-y-2 overflow-y-auto max-h-[180px]">
                    {usedParts.map((p, idx) => (
                       <div key={idx} className="flex items-center justify-between p-3 bg-white border border-[#dadce0] rounded-xl">
                          <span className="text-xs font-bold text-[#3c4043]">{p.name}</span>
                          <div className="flex items-center gap-2">
                             <span className="text-xs font-black">x{p.quantity}</span>
                             <button onClick={() => setUsedParts(usedParts.filter((_, i) => i !== idx))} className="text-red-500 p-1"><X size={14} /></button>
                          </div>
                       </div>
                    ))}
                 </div>
              </div>
           </section>

           <div className="flex gap-4 pt-8 border-t border-[#dadce0]">
              <button onClick={handleSaveIntervention} className="btn-google-primary flex-1 justify-center py-4">
                 <Save size={18} /> Soumettre le rapport
              </button>
              <button onClick={() => setIsInterventionModalOpen(false)} className="btn-google-outlined px-8">Annuler</button>
           </div>
        </div>
      </Modal>
    </div>
  );
};

export default Tickets;
