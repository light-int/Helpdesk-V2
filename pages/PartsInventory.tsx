
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Package, Search, Filter, Plus, 
  RefreshCw, Database, Trash2, Edit3,
  Upload, FileSpreadsheet, X, Save, Loader2, Sparkles, Server,
  CheckCircle2, Tag, Hash, MapPin, Archive, AlertTriangle,
  TrendingDown, TrendingUp, DollarSign, Activity, ChevronRight,
  Minus, AlertCircle, History, ArrowUpRight, ArrowDownLeft, Clock,
  CalendarDays, User, Ticket as TicketIcon, HardHat, ShieldCheck,
  Briefcase, Info, ExternalLink, Calendar, Box, Layers
} from 'lucide-react';
import { Part, StockMovement, Ticket } from '../types';
import { useNotifications, useData, useUser } from '../App';
import Modal from '../components/Modal';
import * as XLSX from 'xlsx';

const PartsInventory: React.FC = () => {
  const { parts, setParts, brands, isLoading, loadDemoData, refreshAll, isSyncing, stockMovements, addStockMovement, tickets } = useData();
  const { currentUser } = useUser();
  const { addNotification } = useNotifications();
  
  const [activeTab, setActiveTab] = useState<'inventory' | 'history'>('inventory');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<string>('Tous');
  
  // États des Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingPart, setEditingPart] = useState<Part | null>(null);
  const [selectedMovement, setSelectedMovement] = useState<StockMovement | null>(null);
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);

  // Mapping States pour l'import
  const [importData, setImportData] = useState<any[]>([]);
  const [importColumns, setImportColumns] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({
    name: '',
    sku: '',
    brand: '',
    category: '',
    currentStock: '',
    minStock: '',
    unitPrice: '',
    location: ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { refreshAll(); }, []);

  // Calculs du Gestionnaire de Stock
  const inventoryStats = useMemo(() => {
    const totalRefs = parts.length;
    const lowStockCount = parts.filter(p => p.currentStock <= p.minStock && p.currentStock > 0).length;
    const outOfStockCount = parts.filter(p => p.currentStock === 0).length;
    const totalValue = parts.reduce((acc, p) => acc + (p.unitPrice * p.currentStock), 0);
    return { totalRefs, lowStockCount, outOfStockCount, totalValue };
  }, [parts]);

  const filteredParts = useMemo(() => {
    return (parts || []).filter(p => 
      (selectedBrand === 'Tous' || p.brand === selectedBrand) && 
      (p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
       p.sku.toLowerCase().includes(searchTerm.toLowerCase()))
    ).sort((a, b) => (a.currentStock <= a.minStock ? -1 : 1)); 
  }, [searchTerm, selectedBrand, parts]);

  const filteredMovements = useMemo(() => {
    return stockMovements.filter(m => 
       m.partName.toLowerCase().includes(searchTerm.toLowerCase()) ||
       m.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
       (m.ticketId && m.ticketId.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [stockMovements, searchTerm]);

  // Mouvements spécifiques pour la pièce sélectionnée
  const partSpecificMovements = useMemo(() => {
    if (!selectedPart) return [];
    return stockMovements
      .filter(m => m.partId === selectedPart.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [selectedPart, stockMovements]);

  const handleAdjustStock = async (id: string, delta: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const part = parts.find(p => p.id === id);
    if (!part) return;

    const type = delta > 0 ? 'IN' : 'OUT';
    const quantity = Math.abs(delta);
    const reason = type === 'IN' ? 'Réajustement manuel (Arrivage)' : 'Réajustement manuel (Démarque)';

    await addStockMovement({
      partId: part.id,
      partName: part.name,
      quantity,
      type,
      reason,
      performedBy: currentUser?.name || 'Admin Horizon'
    });

    if (part.currentStock + delta <= part.minStock) {
      addNotification({ title: 'Alerte Stock', message: `Niveau critique pour : ${part.name}`, type: 'warning' });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws);
        if (data.length > 0) {
          setImportData(data);
          setImportColumns(Object.keys(data[0]));
          setIsImportModalOpen(true);
        } else {
          addNotification({ title: 'Erreur', message: 'Le fichier est vide.', type: 'warning' });
        }
      } catch (err) {
        addNotification({ title: 'Erreur', message: 'Fichier invalide ou corrompu.', type: 'error' });
      }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const runImport = async () => {
    const partsToImport: Part[] = importData.map(row => ({
      id: `PT-${Math.floor(Math.random() * 1000000)}`,
      name: String(row[mapping.name] || 'Pièce sans nom'),
      sku: String(row[mapping.sku] || `SKU-${Date.now()}`),
      brand: String(row[mapping.brand] || 'Inconnu'),
      category: (row[mapping.category] as any) || 'Mécanique',
      currentStock: parseInt(row[mapping.currentStock]) || 0,
      minStock: parseInt(row[mapping.minStock]) || 5,
      unitPrice: parseFloat(row[mapping.unitPrice]) || 0,
      location: String(row[mapping.location] || 'Entrepôt central')
    }));

    for (const p of partsToImport) {
       await addStockMovement({
          partId: p.id,
          partName: p.name,
          quantity: p.currentStock,
          type: 'IN',
          reason: 'Importation initiale Excel',
          performedBy: currentUser?.name || 'Système Horizon'
       });
    }

    setParts(prev => [...prev, ...partsToImport]);
    setIsImportModalOpen(false);
    setImportData([]);
    addNotification({ title: 'Succès Importation', message: `${partsToImport.length} articles intégrés au stock.`, type: 'success' });
  };

  const openAddModal = () => {
    setEditingPart(null);
    setIsModalOpen(true);
  };

  const openEditModal = (e: React.MouseEvent, p: Part) => {
    e.stopPropagation();
    setEditingPart(p);
    setIsModalOpen(true);
  };

  const handleSavePart = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const initialQty = parseInt(formData.get('currentStock') as string) || 0;
    
    const partData: Part = {
      id: editingPart?.id || `PT-${Math.floor(Math.random() * 100000)}`,
      name: formData.get('name') as string,
      sku: formData.get('sku') as string,
      brand: formData.get('brand') as string,
      category: formData.get('category') as any,
      currentStock: initialQty,
      minStock: parseInt(formData.get('minStock') as string) || 5,
      unitPrice: parseFloat(formData.get('unitPrice') as string) || 0,
      location: formData.get('location') as string
    };

    if (!editingPart && initialQty > 0) {
       await addStockMovement({
          partId: partData.id,
          partName: partData.name,
          quantity: initialQty,
          type: 'IN',
          reason: 'Initialisation manuelle du stock',
          performedBy: currentUser?.name || 'Admin'
       });
    }

    const newParts = editingPart 
      ? parts.map(p => p.id === partData.id ? partData : p)
      : [...parts, partData];
    
    setParts(newParts);
    setIsModalOpen(false);
    addNotification({ title: 'Inventaire', message: `L'article ${partData.name} a été enregistré.`, type: 'success' });
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm("Voulez-vous supprimer cet article de l'inventaire ?")) {
      setParts(parts.filter(p => p.id !== id));
      addNotification({ title: 'Suppression', message: 'Article retiré du stock.', type: 'info' });
    }
  };

  // Trouver le ticket lié pour les détails de traçabilité
  const linkedTicket = useMemo(() => {
    if (!selectedMovement?.ticketId) return null;
    return tickets.find(t => t.id === selectedMovement.ticketId);
  }, [selectedMovement, tickets]);

  if (isLoading) return <div className="h-[60vh] flex items-center justify-center"><Loader2 className="animate-spin text-[#1a73e8]" /></div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-normal text-[#3c4043]">Gestionnaire de Stock Expert</h1>
          <p className="text-[#5f6368] text-sm">Contrôle de l'inventaire technique et traçabilité des flux.</p>
        </div>
        <div className="flex gap-3">
          <label className="btn-google-outlined cursor-pointer flex items-center gap-2 text-xs h-10 px-4">
            <Upload size={14} /> Import Excel
            <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .csv" onChange={handleFileUpload} />
          </label>
          <button onClick={refreshAll} className="btn-google-outlined h-10 px-3">
            <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
          </button>
          <button onClick={openAddModal} className="btn-google-primary shadow-lg shadow-blue-600/20 h-10 px-5 text-xs font-black uppercase tracking-widest"><Plus size={16} /> Nouvel Article</button>
        </div>
      </header>

      {/* TABLEAU DE BORD INVENTAIRE */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         <div className="google-card p-6 border-l-4 border-blue-600">
            <p className="text-[#5f6368] text-[10px] font-black uppercase tracking-widest flex items-center gap-2"><Package size={14}/> Références Actives</p>
            <h3 className="text-2xl font-black text-[#3c4043] mt-2">{inventoryStats.totalRefs}</h3>
         </div>
         <div className="google-card p-6 border-l-4 border-orange-500">
            <p className="text-orange-600 text-[10px] font-black uppercase tracking-widest flex items-center gap-2"><AlertCircle size={14}/> Stock Critique</p>
            <h3 className="text-2xl font-black text-[#3c4043] mt-2">{inventoryStats.lowStockCount}</h3>
         </div>
         <div className="google-card p-6 border-l-4 border-red-600">
            <p className="text-red-600 text-[10px] font-black uppercase tracking-widest flex items-center gap-2"><X size={14}/> Rupture de Stock</p>
            <h3 className="text-2xl font-black text-[#3c4043] mt-2">{inventoryStats.outOfStockCount}</h3>
         </div>
         <div className="google-card p-6 border-l-4 border-green-600 bg-green-50/10">
            <p className="text-green-600 text-[10px] font-black uppercase tracking-widest flex items-center gap-2"><DollarSign size={14}/> Valeur du Stock</p>
            <h3 className="text-2xl font-black text-[#3c4043] mt-2">{inventoryStats.totalValue.toLocaleString()} <span className="text-[10px]">F</span></h3>
         </div>
      </div>

      {/* TABS NAVIGATION */}
      <div className="flex items-center gap-1 p-1 bg-[#f1f3f4] rounded-lg">
        <button 
          onClick={() => setActiveTab('inventory')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'inventory' ? 'bg-white text-[#1a73e8] shadow-sm' : 'text-[#5f6368] hover:bg-white/50'}`}
        >
          <Database size={16} /> Catalogue Actuel
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'history' ? 'bg-white text-[#1a73e8] shadow-sm' : 'text-[#5f6368] hover:bg-white/50'}`}
        >
          <History size={16} /> Registre des Flux & Expertises
        </button>
      </div>

      {activeTab === 'inventory' && (
        <div className="google-card overflow-hidden animate-in fade-in duration-300">
          <div className="px-6 py-4 border-b border-[#dadce0] flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#f8f9fa]">
            <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-2.5 text-[#5f6368]" size={16} />
                <input type="text" placeholder="Rechercher par nom ou SKU..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 h-10 shadow-sm" />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
                {['Tous', ...brands].map(b => (
                  <button 
                    key={b} 
                    onClick={() => setSelectedBrand(b)}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-tighter transition-all shrink-0 ${
                      selectedBrand === b ? 'bg-[#1a73e8] text-white shadow-md' : 'bg-white text-[#5f6368] border border-[#dadce0] hover:bg-[#f1f3f4]'
                    }`}
                  >
                    {b}
                  </button>
                ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#dadce0] bg-[#f8f9fa] text-[#5f6368] text-[10px] font-black uppercase tracking-widest">
                  <th className="px-6 py-4">Article & Emplacement</th>
                  <th className="px-6 py-4 text-center">Niveau de Stock</th>
                  <th className="px-6 py-4 text-center">Statut Santé</th>
                  <th className="px-6 py-4 text-right">Valorisation</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#dadce0]">
                {filteredParts.map(p => {
                  const isCritical = p.currentStock <= p.minStock && p.currentStock > 0;
                  const isOut = p.currentStock === 0;
                  
                  return (
                    <tr 
                      key={p.id} 
                      onClick={() => setSelectedPart(p)}
                      className={`hover:bg-[#e8f0fe] transition-colors group cursor-pointer ${isOut ? 'bg-red-50/10' : ''} ${selectedPart?.id === p.id ? 'bg-[#e8f0fe]' : ''}`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                           <div className={`p-2.5 rounded-lg border shadow-sm ${isOut ? 'bg-red-100 text-red-600 border-red-200' : isCritical ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-blue-50 text-[#1a73e8] border-blue-100'}`}>
                              <Package size={20} />
                           </div>
                           <div>
                              <p className="text-sm font-bold text-[#3c4043] group-hover:text-[#1a73e8] transition-colors">{p.name}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                 <span className="text-[10px] text-[#5f6368] font-mono bg-white px-1.5 border rounded uppercase">{p.sku}</span>
                                 <span className="text-[10px] text-[#5f6368] flex items-center gap-1 font-medium"><MapPin size={10} /> {p.location}</span>
                              </div>
                           </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                         <div className="flex items-center justify-center gap-4" onClick={e => e.stopPropagation()}>
                            <button 
                              onClick={(e) => handleAdjustStock(p.id, -1, e)}
                              className="w-7 h-7 flex items-center justify-center rounded-full bg-white border border-[#dadce0] text-[#5f6368] hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all shadow-sm"
                            >
                               <Minus size={14} />
                            </button>
                            <div className="flex flex-col items-center min-w-[40px]">
                               <span className={`text-lg font-black ${isOut ? 'text-red-600' : isCritical ? 'text-orange-600' : 'text-[#1a73e8]'}`}>
                                  {p.currentStock}
                               </span>
                               <span className="text-[8px] text-gray-400 font-bold uppercase tracking-tighter">Min: {p.minStock}</span>
                            </div>
                            <button 
                              onClick={(e) => handleAdjustStock(p.id, 1, e)}
                              className="w-7 h-7 flex items-center justify-center rounded-full bg-white border border-[#dadce0] text-[#5f6368] hover:bg-green-50 hover:text-green-600 hover:border-green-200 transition-all shadow-sm"
                            >
                               <Plus size={14} />
                            </button>
                         </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                         <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-sm ${
                           isOut ? 'bg-red-600 text-white border-red-700' :
                           isCritical ? 'bg-orange-100 text-orange-700 border-orange-200' :
                           'bg-green-100 text-green-700 border-green-200'
                         }`}>
                           {isOut ? 'Rupture' : isCritical ? 'Critique' : 'Stock OK'}
                         </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className="text-sm font-black text-[#3c4043]">{(p.unitPrice * p.currentStock).toLocaleString()} F</p>
                        <p className="text-[9px] text-[#5f6368] font-medium uppercase">{p.unitPrice.toLocaleString()} F / unité</p>
                      </td>
                      <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                           <button onClick={(e) => openEditModal(e, p)} className="p-2 text-[#5f6368] hover:bg-white hover:text-[#1a73e8] rounded-full shadow-sm border border-transparent hover:border-[#dadce0] transition-all"><Edit3 size={18}/></button>
                           <button onClick={(e) => handleDelete(e, p.id)} className="p-2 text-[#5f6368] hover:bg-red-50 hover:text-red-600 rounded-full transition-all"><Trash2 size={18}/></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredParts.length === 0 && (
              <div className="py-24 text-center space-y-4">
                 <div className="w-20 h-20 bg-[#f1f3f4] rounded-full flex items-center justify-center mx-auto mb-6">
                    <Server size={32} className="text-[#dadce0]" />
                 </div>
                 <p className="text-sm font-black text-[#5f6368] uppercase tracking-widest">Aucun article trouvé</p>
                 <button onClick={loadDemoData} className="text-[#1a73e8] text-xs font-bold uppercase hover:underline">Charger les données de test</button>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="google-card overflow-hidden animate-in fade-in duration-300">
           <div className="px-6 py-4 border-b border-[#dadce0] bg-[#f8f9fa] flex items-center justify-between">
              <h2 className="text-xs font-black text-[#3c4043] uppercase tracking-[0.2em] flex items-center gap-2">
                 <History size={16} className="text-[#1a73e8]" /> Traçabilité des Mouvements (SAV & Stock)
              </h2>
              <div className="relative">
                 <Search className="absolute left-3 top-2.5 text-[#5f6368]" size={14} />
                 <input type="text" placeholder="Filtrer par pièce, ticket ou expert..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 h-9 w-64 text-xs font-bold" />
              </div>
           </div>
           
           <div className="overflow-x-auto">
             <table className="w-full text-left">
               <thead>
                 <tr className="border-b border-[#dadce0] bg-[#f8f9fa] text-[#5f6368] text-[9px] font-black uppercase tracking-widest">
                   <th className="px-6 py-4">Date & Heure</th>
                   <th className="px-6 py-4">Article</th>
                   <th className="px-6 py-4 text-center">Qté</th>
                   <th className="px-6 py-4 text-center">N° Dossier</th>
                   <th className="px-6 py-4">Motif Opérationnel</th>
                   <th className="px-6 py-4 text-right">Expert Responsable</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-[#dadce0]">
                 {filteredMovements.map(m => (
                   <tr 
                    key={m.id} 
                    onClick={() => setSelectedMovement(m)}
                    className="hover:bg-[#e8f0fe] transition-colors group cursor-pointer"
                   >
                     <td className="px-6 py-4">
                        <div className="flex flex-col">
                           <span className="text-xs font-bold text-[#3c4043]">{new Date(m.date).toLocaleDateString('fr-FR')}</span>
                           <span className="text-[9px] text-[#5f6368] flex items-center gap-1 font-black"><Clock size={10}/> {new Date(m.date).toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                     </td>
                     <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                           <div className={`w-2 h-2 rounded-full ${m.type === 'IN' ? 'bg-green-500' : 'bg-red-500'}`} />
                           <span className="text-sm font-black text-[#3c4043] group-hover:text-[#1a73e8]">{m.partName}</span>
                        </div>
                     </td>
                     <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-black ${m.type === 'IN' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                           {m.type === 'IN' ? '+' : '-'}{m.quantity}
                        </span>
                     </td>
                     <td className="px-6 py-4 text-center">
                        {m.ticketId ? (
                           <div className="flex items-center justify-center gap-1.5 text-[10px] font-black text-[#1a73e8] bg-white px-2 py-1 rounded-md border border-[#d2e3fc] shadow-sm">
                              <TicketIcon size={12} />
                              #{m.ticketId}
                           </div>
                        ) : (
                           <span className="text-[9px] text-gray-300 font-bold uppercase tracking-widest">Stock Pur</span>
                        )}
                     </td>
                     <td className="px-6 py-4">
                        <p className="text-xs text-[#5f6368] font-medium italic line-clamp-1">"{m.reason}"</p>
                     </td>
                     <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                           <div className="flex flex-col items-end">
                              <span className="text-[10px] font-black text-[#3c4043] uppercase tracking-tighter">{m.performedBy}</span>
                              <span className="text-[8px] text-[#1a73e8] font-bold uppercase tracking-widest">Traceur ID #{m.id.split('-').pop()}</span>
                           </div>
                           <div className="p-1.5 bg-white rounded-full text-[#5f6368] group-hover:text-[#1a73e8] shadow-sm border border-[#dadce0]">
                              <ChevronRight size={14} />
                           </div>
                        </div>
                     </td>
                   </tr>
                 ))}
                 {filteredMovements.length === 0 && (
                   <tr>
                     <td colSpan={6} className="py-24 text-center">
                        <div className="w-16 h-16 bg-[#f8f9fa] rounded-full flex items-center justify-center mx-auto mb-4 border border-[#dadce0]">
                           <History size={32} className="text-[#dadce0]" />
                        </div>
                        <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Aucun historique de traçabilité</p>
                     </td>
                   </tr>
                 )}
               </tbody>
             </table>
           </div>
        </div>
      )}

      {/* VOLET DÉTAILS ARTICLE (INVENTAIRE) */}
      {selectedPart && (
        <>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[60] animate-in fade-in" onClick={() => setSelectedPart(null)} />
          <div className="fixed right-0 top-0 h-screen w-[580px] bg-white z-[70] flex flex-col shadow-[-20px_0_50px_-10px_rgba(0,0,0,0.2)] animate-in slide-in-from-right duration-300">
             <div className="p-5 border-b border-[#dadce0] flex items-center justify-between bg-[#f8f9fa]">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-xl bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center shadow-sm border border-[#d2e3fc]">
                      <Package size={20} />
                   </div>
                   <div>
                      <h2 className="text-sm font-black text-[#3c4043] uppercase tracking-widest">Fiche Article</h2>
                      <p className="text-[10px] text-[#5f6368] font-black uppercase tracking-[0.2em]">Réf interne : {selectedPart.id}</p>
                   </div>
                </div>
                <div className="flex gap-2">
                   <button onClick={(e) => openEditModal(e, selectedPart)} className="p-2 hover:bg-[#e8eaed] rounded-full text-[#1a73e8] transition-colors"><Edit3 size={18}/></button>
                   <button onClick={() => setSelectedPart(null)} className="p-2 hover:bg-[#e8eaed] rounded-full text-[#5f6368] transition-colors"><X size={20}/></button>
                </div>
             </div>

             <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar pb-32">
                
                {/* Header Identité */}
                <div className="space-y-4">
                   <div className="space-y-1">
                      <p className="text-xs font-black text-[#1a73e8] uppercase tracking-[0.2em]">{selectedPart.brand}</p>
                      <h3 className="text-2xl font-black text-[#3c4043] leading-tight">{selectedPart.name}</h3>
                      <div className="pt-2 flex items-center gap-3">
                         <span className="px-3 py-1 bg-[#f1f3f4] text-[#5f6368] text-[10px] font-black rounded-full uppercase tracking-widest border border-[#dadce0]">
                           {selectedPart.category}
                         </span>
                         <span className="text-[10px] text-[#5f6368] font-mono font-bold uppercase">SKU: {selectedPart.sku}</span>
                      </div>
                   </div>
                </div>

                {/* Grid KPIs */}
                <div className="grid grid-cols-2 gap-4">
                   <div className="p-5 bg-white border border-[#dadce0] rounded-2xl shadow-sm">
                      <p className="text-[9px] font-black text-[#5f6368] uppercase tracking-widest mb-2">Quantité Actuelle</p>
                      <div className="flex items-baseline gap-2">
                         <span className={`text-3xl font-black ${selectedPart.currentStock <= selectedPart.minStock ? 'text-orange-600' : 'text-blue-600'}`}>
                            {selectedPart.currentStock}
                         </span>
                         <span className="text-[10px] font-bold text-[#9aa0a6] uppercase tracking-tighter">Unités</span>
                      </div>
                      <div className="w-full h-1 bg-[#f1f3f4] rounded-full mt-3 overflow-hidden">
                         <div 
                          className={`h-full transition-all duration-700 ${selectedPart.currentStock <= selectedPart.minStock ? 'bg-orange-500' : 'bg-blue-500'}`} 
                          style={{ width: `${Math.min((selectedPart.currentStock / (selectedPart.minStock * 3)) * 100, 100)}%` }}
                         />
                      </div>
                   </div>
                   <div className="p-5 bg-white border border-[#dadce0] rounded-2xl shadow-sm">
                      <p className="text-[9px] font-black text-[#5f6368] uppercase tracking-widest mb-2">Valeur Inventoriée</p>
                      <div className="flex items-baseline gap-1">
                         <span className="text-xl font-black text-[#3c4043]">{(selectedPart.unitPrice * selectedPart.currentStock).toLocaleString()}</span>
                         <span className="text-[9px] font-bold text-[#9aa0a6] uppercase">FCFA</span>
                      </div>
                      <p className="text-[9px] text-[#5f6368] mt-2 font-medium">Prix unitaire : {selectedPart.unitPrice.toLocaleString()} F</p>
                   </div>
                </div>

                {/* Localisation & Spec */}
                <section className="space-y-4">
                   <h4 className="text-[10px] font-black text-[#9aa0a6] uppercase tracking-[0.2em] flex items-center gap-2">
                      <Layers size={16} /> Spécifications de Stock
                   </h4>
                   <div className="bg-[#f8f9fa] border border-[#dadce0] rounded-2xl divide-y divide-[#dadce0]">
                      <div className="p-4 flex items-center justify-between">
                         <span className="text-xs font-bold text-[#5f6368]">Emplacement</span>
                         <span className="text-xs font-black text-[#3c4043] flex items-center gap-2"><MapPin size={12} className="text-[#1a73e8]"/> {selectedPart.location}</span>
                      </div>
                      <div className="p-4 flex items-center justify-between">
                         <span className="text-xs font-bold text-[#5f6368]">Seuil d'alerte critique</span>
                         <span className="text-xs font-black text-red-600">{selectedPart.minStock} unités</span>
                      </div>
                   </div>
                </section>

                {/* Historique spécifique */}
                <section className="space-y-4">
                   <h4 className="text-[10px] font-black text-[#9aa0a6] uppercase tracking-[0.2em] flex items-center gap-2">
                      <History size={16} /> Journal des Flux pour cet article
                   </h4>
                   <div className="space-y-3">
                      {partSpecificMovements.length > 0 ? (
                        partSpecificMovements.map(m => (
                          <div key={m.id} className="p-4 bg-white border border-[#dadce0] rounded-2xl shadow-sm flex items-center justify-between hover:border-[#1a73e8] transition-all group">
                             <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${m.type === 'IN' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                                   {m.type === 'IN' ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                                </div>
                                <div>
                                   <div className="flex items-center gap-2">
                                      <p className="text-xs font-black text-[#3c4043]">{m.type === 'IN' ? 'Arrivage' : 'Consommation'}</p>
                                      <span className={`text-[10px] font-black ${m.type === 'IN' ? 'text-green-600' : 'text-red-600'}`}>{m.type === 'IN' ? '+' : '-'}{m.quantity}</span>
                                   </div>
                                   <p className="text-[9px] text-[#5f6368] font-bold mt-0.5 line-clamp-1">{m.reason}</p>
                                </div>
                             </div>
                             <div className="text-right">
                                <p className="text-[9px] font-black text-[#3c4043]">{new Date(m.date).toLocaleDateString()}</p>
                                <p className="text-[8px] text-[#9aa0a6] uppercase tracking-tighter">{m.performedBy}</p>
                             </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-8 text-center border-2 border-dashed border-[#dadce0] rounded-2xl">
                           <Activity size={24} className="mx-auto text-gray-300 mb-2" />
                           <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Aucun mouvement enregistré</p>
                        </div>
                      )}
                   </div>
                </section>

             </div>

             <div className="p-6 border-t border-[#dadce0] bg-[#f8f9fa] flex gap-3">
                <button 
                  onClick={() => { setSelectedPart(null); openAddModal(); }}
                  className="btn-google-outlined flex-1 justify-center text-[10px] font-black uppercase tracking-widest"
                >
                  Ajouter Nouveau
                </button>
                <button 
                  onClick={(e) => openEditModal(e, selectedPart)}
                  className="btn-google-primary flex-1 justify-center py-4 shadow-xl shadow-blue-600/20 text-xs font-black uppercase tracking-widest"
                >
                  <Edit3 size={18} /> Éditer la Fiche
                </button>
             </div>
          </div>
        </>
      )}

      {/* VOLET DE TRAÇABILITÉ DÉTAILLÉE DU MOUVEMENT (HISTORIQUE) */}
      {selectedMovement && (
        <>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[60] animate-in fade-in" onClick={() => setSelectedMovement(null)} />
          <div className="fixed right-0 top-0 h-screen w-[550px] bg-white z-[70] flex flex-col shadow-[-20px_0_50px_-10px_rgba(0,0,0,0.2)] animate-in slide-in-from-right duration-300">
             <div className="p-5 border-b border-[#dadce0] flex items-center justify-between bg-[#f8f9fa]">
                <div className="flex items-center gap-3">
                   <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm border ${selectedMovement.type === 'IN' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                      <Activity size={20} />
                   </div>
                   <div>
                      <h2 className="text-sm font-black text-[#3c4043] uppercase tracking-widest">Traçabilité Mouvement</h2>
                      <p className="text-[10px] text-[#5f6368] font-black uppercase tracking-[0.2em]">ID Unique : {selectedMovement.id}</p>
                   </div>
                </div>
                <button onClick={() => setSelectedMovement(null)} className="p-2 hover:bg-[#e8eaed] rounded-full text-[#5f6368] transition-colors"><X size={20}/></button>
             </div>

             <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar pb-32">
                
                {/* Section Header Mouvement */}
                <div className="space-y-6">
                   <div className="flex items-center justify-between">
                      <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm ${selectedMovement.type === 'IN' ? 'bg-green-600 text-white border-green-700' : 'bg-red-600 text-white border-red-700'}`}>
                         {selectedMovement.type === 'IN' ? 'Flux Entrant (Arrivage)' : 'Flux Sortant (Consommation)'}
                      </span>
                      <div className="flex items-center gap-2 text-[#5f6368]">
                         <CalendarDays size={14} />
                         <span className="text-xs font-black uppercase">{new Date(selectedMovement.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                      </div>
                   </div>

                   <div className="google-card p-6 bg-gradient-to-br from-white to-[#f8f9fa] border-l-4 border-[#1a73e8]">
                      <div className="flex items-start gap-4">
                         <div className="w-12 h-12 bg-white rounded-xl shadow-sm border flex items-center justify-center text-[#1a73e8] shrink-0"><Package size={24} /></div>
                         <div className="space-y-1">
                            <p className="text-xl font-black text-[#3c4043] leading-tight">{selectedMovement.partName}</p>
                            <div className="flex items-center gap-3">
                               <span className="text-[10px] font-black text-[#1a73e8] uppercase bg-blue-50 px-2 py-0.5 rounded border border-blue-100">SKU: {parts.find(p => p.id === selectedMovement.partId)?.sku || 'REF-EXT'}</span>
                               <span className="text-[10px] font-bold text-[#5f6368] uppercase tracking-tighter flex items-center gap-1"><MapPin size={10}/> {parts.find(p => p.id === selectedMovement.partId)?.location || 'Non spécifié'}</span>
                            </div>
                         </div>
                      </div>
                   </div>
                </div>

                {/* Section Volume et Audit Contextuel */}
                <div className="grid grid-cols-2 gap-4">
                   <div className="p-5 bg-white border border-[#dadce0] rounded-2xl shadow-sm">
                      <p className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest mb-2">Quantité Impactée</p>
                      <div className="flex items-baseline gap-2">
                         <span className={`text-3xl font-black ${selectedMovement.type === 'IN' ? 'text-green-600' : 'text-red-600'}`}>
                            {selectedMovement.type === 'IN' ? '+' : '-'}{selectedMovement.quantity}
                         </span>
                         <span className="text-[10px] font-bold text-[#9aa0a6] uppercase">Unités</span>
                      </div>
                   </div>
                   <div className="p-5 bg-white border border-[#dadce0] rounded-2xl shadow-sm">
                      <p className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest mb-2">Expert Responsable</p>
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-full bg-[#f1f3f4] flex items-center justify-center text-[#1a73e8]"><HardHat size={16} /></div>
                         <p className="text-xs font-black text-[#3c4043] uppercase tracking-tighter">{selectedMovement.performedBy}</p>
                      </div>
                   </div>
                </div>

                {/* Motif du mouvement */}
                <section className="space-y-4">
                   <h3 className="text-[11px] font-black text-[#9aa0a6] uppercase tracking-[0.2em] flex items-center gap-2">
                      <Info size={16} /> Justification Opérationnelle
                   </h3>
                   <div className="p-5 bg-[#fff8e1] border border-[#ffe082] rounded-2xl">
                      <p className="text-sm text-[#795548] leading-relaxed font-bold italic">
                         "{selectedMovement.reason}"
                      </p>
                   </div>
                </section>

                {/* FOCUS TICKET SAV : TRAÇABILITÉ CROISÉE */}
                {selectedMovement.ticketId ? (
                   <section className="space-y-4">
                      <h3 className="text-[11px] font-black text-[#9aa0a6] uppercase tracking-[0.2em] flex items-center gap-2">
                         <ShieldCheck size={16} className="text-[#1a73e8]" /> Détails de l'Intervention SAV
                      </h3>
                      {linkedTicket ? (
                         <div className="google-card p-6 border-l-4 border-[#1a73e8] shadow-md space-y-6">
                            <div className="flex justify-between items-start">
                               <div>
                                  <div className="flex items-center gap-2 text-[#1a73e8] mb-1">
                                     <TicketIcon size={14} />
                                     <span className="text-xs font-black uppercase">Dossier #{linkedTicket.id}</span>
                                  </div>
                                  <h4 className="text-sm font-black text-[#3c4043]">{linkedTicket.customerName}</h4>
                                  <p className="text-[10px] text-[#5f6368] font-bold uppercase tracking-widest mt-1">{linkedTicket.category} • {linkedTicket.showroom}</p>
                               </div>
                               <span className={`px-2.5 py-1 rounded text-[9px] font-black uppercase tracking-tighter border ${
                                  linkedTicket.status === 'Résolu' || linkedTicket.status === 'Fermé' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-blue-50 text-blue-700 border-blue-100'
                               }`}>
                                  {linkedTicket.status}
                               </span>
                            </div>

                            <div className="p-4 bg-[#f8f9fa] rounded-xl border border-[#f1f3f4]">
                               <p className="text-[9px] font-black text-[#9aa0a6] uppercase mb-2">Matériel Concerné</p>
                               <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-white shadow-sm border flex items-center justify-center text-[#1a73e8]"><Briefcase size={16} /></div>
                                  <div>
                                     <p className="text-xs font-bold text-[#3c4043]">{linkedTicket.productName}</p>
                                     <p className="text-[9px] text-[#5f6368] font-mono">S/N: {linkedTicket.serialNumber || 'NON-COMMUNIQUÉ'}</p>
                                  </div>
                               </div>
                            </div>

                            <button className="w-full flex items-center justify-center gap-2 py-3 bg-white border border-[#dadce0] text-[#1a73e8] rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#f8f9fa] transition-all shadow-sm">
                               <ExternalLink size={14} /> Ouvrir la fiche SAV complète
                            </button>
                         </div>
                      ) : (
                         <div className="p-6 text-center border-2 border-dashed border-[#dadce0] rounded-2xl">
                            <AlertTriangle size={24} className="mx-auto text-amber-500 mb-2" />
                            <p className="text-xs font-bold text-gray-400 uppercase">Le dossier SAV #{selectedMovement.ticketId} a été retiré du système.</p>
                         </div>
                      )}
                   </section>
                ) : (
                   <section className="space-y-4">
                      <h3 className="text-[11px] font-black text-[#9aa0a6] uppercase tracking-[0.2em] flex items-center gap-2">
                         <Database size={16} /> Contexte Hors-SAV
                      </h3>
                      <div className="p-6 bg-gray-50 border border-dashed border-gray-300 rounded-2xl flex items-center gap-4">
                         <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-gray-400 shadow-sm"><Archive size={20} /></div>
                         <p className="text-xs font-bold text-gray-500 italic uppercase">Ce mouvement concerne une gestion d'inventaire interne (Inventaire tournant, bris de pièce ou arrivage direct).</p>
                      </div>
                   </section>
                )}
             </div>

             <div className="p-6 border-t border-[#dadce0] bg-white">
                <button 
                  onClick={() => setSelectedMovement(null)}
                  className="w-full btn-google-outlined justify-center py-4 text-[10px] font-black uppercase tracking-[0.2em] shadow-sm"
                >
                   Fermer la Traçabilité
                </button>
             </div>
          </div>
        </>
      )}

      {/* MODAL AJOUT / ÉDITION PIÈCE */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingPart ? `Modification Fiche : ${editingPart.name}` : "Intégration d'un Nouvel Article"}
        size="lg"
      >
        <form onSubmit={handleSavePart} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest">Désignation technique</label>
              <input name="name" type="text" defaultValue={editingPart?.name || ''} required placeholder="ex: Compresseur LG 12000 BTU" className="bg-white font-bold" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest">Référence SKU / Part-Number</label>
              <input name="sku" type="text" defaultValue={editingPart?.sku || ''} required placeholder="SKU-XXXX" className="bg-white font-mono uppercase" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest">Marque d'origine</label>
              <select name="brand" defaultValue={editingPart?.brand || 'LG'} className="bg-white font-bold">
                {brands.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest">Domaine Technique</label>
              <select name="category" defaultValue={editingPart?.category || 'Mécanique'} className="bg-white font-bold">
                <option value="Électronique">Électronique</option>
                <option value="Mécanique">Mécanique</option>
                <option value="Consommable">Consommable</option>
                <option value="Accessoire">Accessoire</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest">Emplacement Précis</label>
              <input name="location" type="text" defaultValue={editingPart?.location || ''} placeholder="ex: Showroom Glass - Rayon B12" className="bg-white" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest">Stock Disponible</label>
              <input name="currentStock" type="number" defaultValue={editingPart?.currentStock || 0} required className="bg-white font-black text-blue-700" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest">Seuil d'Alerte</label>
              <input name="minStock" type="number" defaultValue={editingPart?.minStock || 5} required className="bg-white font-black text-red-600" />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest">Prix de Valorisation (FCFA)</label>
              <input name="unitPrice" type="number" defaultValue={editingPart?.unitPrice || 0} required className="bg-white h-12 text-lg font-black" />
            </div>
          </div>
          <div className="flex gap-3 pt-6 border-t border-[#dadce0]">
            <button type="submit" className="btn-google-primary flex-1 justify-center py-4 shadow-xl shadow-blue-600/20 text-xs font-black uppercase tracking-widest">
              <Save size={18} /> Valider l'Enregistrement
            </button>
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn-google-outlined flex-1 uppercase text-[10px] font-black tracking-widest">Annuler</button>
          </div>
        </form>
      </Modal>

      {/* MODAL ASSISTANT IMPORTATION PIÈCES */}
      <Modal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} title="Assistant d'Intégration Stock Massive" size="lg">
        <div className="space-y-6">
           <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-[#1a73e8] shadow-sm"><Database size={24} /></div>
              <div>
                 <p className="text-xs font-black text-blue-700 uppercase tracking-widest">Analyse du fichier effectuée</p>
                 <p className="text-[10px] text-blue-600 font-bold uppercase">{importData.length} références détectées prêtes pour l'import.</p>
              </div>
           </div>
           
           <div className="google-card overflow-hidden">
              <table className="w-full text-left border-collapse">
                 <thead>
                    <tr className="bg-[#f8f9fa] border-b border-[#dadce0] text-[9px] font-black text-[#5f6368] uppercase tracking-widest">
                       <th className="px-6 py-3">Donnée Horizon</th>
                       <th className="px-6 py-3">Colonne Fichier Excel</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-[#dadce0]">
                    {[
                      { key: 'name', label: 'Désignation', required: true },
                      { key: 'sku', label: 'Réf SKU', required: true },
                      { key: 'brand', label: 'Marque', required: false },
                      { key: 'category', label: 'Domaine', required: false },
                      { key: 'currentStock', label: 'Quantité', required: true },
                      { key: 'unitPrice', label: 'Prix Unitaire', required: true },
                      { key: 'location', label: 'Localisation', required: false },
                    ].map((field) => (
                      <tr key={field.key} className="hover:bg-[#f8f9fa] transition-colors">
                        <td className="px-6 py-4">
                           <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-[#3c4043]">{field.label}</span>
                              {field.required && <span className="text-red-500 font-black">*</span>}
                           </div>
                        </td>
                        <td className="px-6 py-4">
                           <select 
                             className="w-full h-9 bg-white text-xs font-medium border-[#dadce0] rounded shadow-sm focus:border-[#1a73e8]" 
                             value={mapping[field.key]} 
                             onChange={(e) => setMapping(prev => ({ ...prev, [field.key]: e.target.value }))}
                           >
                              <option value="">-- Ignorer --</option>
                              {importColumns.map(col => <option key={col} value={col}>{col}</option>)}
                           </select>
                        </td>
                      </tr>
                    ))}
                 </tbody>
              </table>
           </div>
           
           <div className="flex gap-3 pt-4">
              <button 
                onClick={runImport} 
                className="btn-google-primary flex-1 justify-center py-4 uppercase text-xs font-black shadow-xl" 
                disabled={!mapping.name || !mapping.sku || !mapping.currentStock || !mapping.unitPrice}
              >
                <CheckCircle2 size={18} /> Lancer l'Intégration
              </button>
              <button onClick={() => setIsImportModalOpen(false)} className="btn-google-outlined px-10 uppercase text-xs font-black">Abandonner</button>
           </div>
        </div>
      </Modal>
    </div>
  );
};

export default PartsInventory;
