
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Package, Search, Plus, 
  RefreshCw, Database, Trash2, Edit3,
  Upload, X, Save, Loader2,
  CheckCircle2, MapPin, AlertCircle,
  History, ArrowUpRight, ArrowDownLeft, Clock,
  CalendarDays, Ticket as TicketIcon, HardHat, ShieldCheck,
  // Added DollarSign to the imports from lucide-react
  Info, ChevronRight, Minus, Layers, DollarSign
} from 'lucide-react';
import { Part, StockMovement } from '../types';
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
        const bstr = evt.target?.result as string;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws);
        if (data.length > 0) {
          setImportData(data);
          // Correction de l'erreur TS ici en forçant le type objet
          setImportColumns(Object.keys(data[0] as object));
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

      {/* DASHBOARD */}
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
          </div>
        </div>
      )}

      {/* Détails Volets... */}
      {selectedPart && (
        <div className="fixed inset-0 z-[100] overflow-hidden flex justify-end">
           <div className="absolute inset-0 bg-black/40 backdrop-blur-[4px]" onClick={() => setSelectedPart(null)} />
           <div className="relative w-full max-w-[580px] bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
             <div className="p-5 border-b border-[#dadce0] flex items-center justify-between bg-[#f8f9fa]">
                <div className="flex items-center gap-3">
                   <Package className="text-[#1a73e8]" size={20} />
                   <h2 className="text-sm font-black uppercase">Fiche Article</h2>
                </div>
                <button onClick={() => setSelectedPart(null)}><X size={20}/></button>
             </div>
             <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
                <h3 className="text-2xl font-black">{selectedPart.name}</h3>
                {/* Historique spécifique */}
                <section className="space-y-4">
                   <h4 className="text-[10px] font-black uppercase flex items-center gap-2">
                      <History size={16} /> Journal des Flux
                   </h4>
                   <div className="space-y-3">
                      {partSpecificMovements.map(m => (
                        <div key={m.id} className="p-4 bg-white border border-[#dadce0] rounded-2xl flex items-center justify-between">
                           <div className="flex items-center gap-4">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${m.type === 'IN' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                 {m.type === 'IN' ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                              </div>
                              <div>
                                 <p className="text-xs font-black">{m.type === 'IN' ? 'Arrivage' : 'Sortie'}</p>
                                 <p className="text-[9px] text-[#5f6368]">{m.reason}</p>
                              </div>
                           </div>
                           <span className={`text-xs font-black ${m.type === 'IN' ? 'text-green-600' : 'text-red-600'}`}>{m.type === 'IN' ? '+' : '-'}{m.quantity}</span>
                        </div>
                      ))}
                   </div>
                </section>
             </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default PartsInventory;
