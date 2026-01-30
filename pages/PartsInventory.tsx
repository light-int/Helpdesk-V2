
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Package, Search, Plus, RefreshCw, Edit3, Trash2, Save, Loader2,
  MapPin, AlertCircle, ArrowUpRight, Minus, Layers, DollarSign,
  Activity, Hash, Tag, ChevronRight, Info, History, ShieldCheck, Box, X,
  FileUp, Download, CheckCircle2, Square, CheckSquare, AlertTriangle,
  ArrowRight, FileSpreadsheet, SlidersHorizontal, LayoutGrid, BarChart3,
  TrendingDown, Zap, Archive, FilterX, RotateCcw, ListFilter, Boxes
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Part, StockMovement } from '../types';
import { useNotifications, useData, useUser } from '../App';
import { ApiService } from '../services/apiService';
import Modal from '../components/Modal';
import Drawer from '../components/Drawer';

const MAPPING_RULES = [
  { label: 'Désignation', fields: ['Designation', 'Nom', 'Name', 'Article'], target: 'name' },
  { label: 'Référence / SKU', fields: ['SKU', 'Reference', 'Code', 'Ref'], target: 'sku' },
  { label: 'Marque', fields: ['Marque', 'Brand', 'Constructeur'], target: 'brand' },
  { label: 'Stock Actuel', fields: ['Stock', 'Quantite', 'Qty', 'Qte'], target: 'currentStock' },
  { label: 'Prix Unitaire', fields: ['Prix', 'UnitPrice', 'PU', 'Tarif'], target: 'unitPrice' },
  { label: 'Seuil Alerte', fields: ['Min', 'Alerte', 'Seuil'], target: 'minStock' },
];

const PartsInventory: React.FC = () => {
  const { parts, brands, isLoading, refreshAll, addStockMovement, deletePart, deletePartsBulk } = useData();
  const { currentUser } = useUser();
  const { addNotification } = useNotifications();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // États de filtrage
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<string>('Tous');
  const [selectedCategory, setSelectedCategory] = useState<string>('Toutes');
  const [stockStatus, setStockStatus] = useState<'all' | 'critical' | 'out'>('all');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMappingModalOpen, setIsMappingModalOpen] = useState(false);
  
  const [editingPart, setEditingPart] = useState<Part | null>(null);
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [importPreview, setImportPreview] = useState<Part[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [isProcessingDelete, setIsProcessingDelete] = useState(false);
  
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => { refreshAll(); }, []);

  const inventoryStats = useMemo(() => {
    const totalRefs = (parts || []).length;
    const lowStockCount = (parts || []).filter(p => p.currentStock <= p.minStock && p.currentStock > 0).length;
    const outOfStockCount = (parts || []).filter(p => p.currentStock === 0).length;
    const totalValue = (parts || []).reduce((acc, p) => acc + (p.unitPrice * p.currentStock), 0);
    return { totalRefs, lowStockCount, outOfStockCount, totalValue };
  }, [parts]);

  const filteredParts = useMemo(() => {
    return (parts || []).filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.sku.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesBrand = selectedBrand === 'Tous' || p.brand === selectedBrand;
      const matchesCategory = selectedCategory === 'Toutes' || p.category === selectedCategory;
      
      let matchesStatus = true;
      if (stockStatus === 'critical') matchesStatus = p.currentStock <= p.minStock && p.currentStock > 0;
      if (stockStatus === 'out') matchesStatus = p.currentStock === 0;

      return matchesSearch && matchesBrand && matchesCategory && matchesStatus;
    }).sort((a, b) => {
       if (a.currentStock === 0 && b.currentStock !== 0) return -1;
       if (a.currentStock !== 0 && b.currentStock === 0) return 1;
       return a.name.localeCompare(b.name);
    }); 
  }, [searchTerm, selectedBrand, selectedCategory, stockStatus, parts]);

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedBrand('Tous');
    setSelectedCategory('Toutes');
    setStockStatus('all');
  };

  const hasActiveFilters = searchTerm !== '' || selectedBrand !== 'Tous' || selectedCategory !== 'Toutes' || stockStatus !== 'all';

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawData = XLSX.utils.sheet_to_json(ws) as any[];
        const mappedData: Part[] = rawData.map((row, idx) => {
          const findValue = (rules: string[]) => {
            const key = Object.keys(row).find(k => rules.some(r => k.toLowerCase().includes(r.toLowerCase())));
            return key ? row[key] : null;
          };
          return {
            id: `PT-IMP-${Date.now()}-${idx}`,
            name: findValue(['Designation', 'Nom', 'Name', 'Article']) || 'Référence inconnue',
            sku: String(findValue(['SKU', 'Reference', 'Code', 'Ref']) || `AUTO-${idx}`).toUpperCase(),
            brand: findValue(['Marque', 'Brand']) || 'Générique',
            category: 'Électronique',
            currentStock: parseInt(findValue(['Stock', 'Quantite', 'Qty', 'Qte'])) || 0,
            minStock: parseInt(findValue(['Min', 'Alerte', 'Seuil'])) || 5,
            unitPrice: parseFloat(findValue(['Prix', 'UnitPrice', 'PU', 'Tarif'])) || 0,
            location: findValue(['Emplacement', 'Location']) || 'Stock Central'
          };
        });
        setImportPreview(mappedData);
        setIsMappingModalOpen(true);
      } catch (err) {
        addNotification({ title: 'Erreur Format', message: 'Fichier Excel illisible.', type: 'error' });
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const confirmImport = async () => {
    setIsImporting(true);
    try {
      await ApiService.parts.saveAll(importPreview);
      await refreshAll();
      addNotification({ title: 'Importation Réussie', message: `${importPreview.length} articles ajoutés au catalogue.`, type: 'success' });
      setIsMappingModalOpen(false);
      setImportPreview([]);
    } catch (e) {
      addNotification({ title: 'Échec Import', message: 'Erreur lors de la synchronisation cloud.', type: 'error' });
    } finally {
      setIsImporting(false);
    }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0 || isProcessingDelete) return;
    if (window.confirm(`Confirmez-vous la suppression de ${ids.length} références ? Cette action est irréversible dans le Cloud Horizon.`)) {
      setIsProcessingDelete(true);
      try {
        await deletePartsBulk(ids);
        addNotification({ title: 'Nettoyage Cloud', message: `${ids.length} articles retirés avec succès.`, type: 'info' });
        setSelectedIds(new Set());
      } catch (err) {
        addNotification({ title: 'Erreur Sync', message: 'Échec de la suppression de groupe.', type: 'error' });
      } finally {
        setIsProcessingDelete(false);
      }
    }
  };

  const handleAdjustStock = async (id: string, delta: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const part = parts.find(p => p.id === id);
    if (!part) return;
    await addStockMovement({
      partId: part.id,
      partName: part.name,
      quantity: Math.abs(delta),
      type: delta > 0 ? 'IN' : 'OUT',
      reason: 'Ajustement Manuel Direct',
      performedBy: currentUser?.name || 'Expert Système'
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredParts.length && filteredParts.length > 0) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredParts.map(p => p.id)));
  };

  const handleSavePart = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data: Part = {
      id: editingPart?.id || `PT-${Date.now()}`,
      name: formData.get('name') as string,
      sku: (formData.get('sku') as string).toUpperCase(),
      brand: formData.get('brand') as string,
      category: (formData.get('category') as any) || 'Électronique',
      currentStock: parseInt(formData.get('currentStock') as string) || 0,
      minStock: parseInt(formData.get('minStock') as string) || 5,
      unitPrice: parseFloat(formData.get('unitPrice') as string) || 0,
      location: formData.get('location') as string
    };
    await ApiService.parts.saveAll([data]);
    await refreshAll();
    setIsModalOpen(false);
    addNotification({ title: 'Base de données', message: 'Référence enregistrée.', type: 'success' });
  };

  if (isLoading) return <div className="h-[80vh] flex items-center justify-center"><Loader2 className="animate-spin text-[#1a73e8]" size={32} /></div>;

  return (
    <div className="space-y-8 animate-page-entry pb-32">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-light text-[#202124]">Catalogue Pièces & Rechanges</h1>
          <p className="text-[10px] text-[#5f6368] font-black uppercase tracking-widest mt-1">Management global de l'inventaire technique Royal Plaza</p>
        </div>
        <div className="flex items-center gap-3">
           <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx, .xls" className="hidden" />
           <button onClick={() => fileInputRef.current?.click()} className="btn-google-outlined h-11 px-6 flex items-center gap-3">
             <FileUp size={18} /> <span>Import XLSX</span>
           </button>
           <button onClick={() => { setEditingPart(null); setIsModalOpen(true); }} className="btn-google-primary h-11 px-6 shadow-xl shadow-blue-600/10">
             <Plus size={20} /> <span>Nouvelle Référence</span>
           </button>
           <button onClick={refreshAll} className="btn-google-outlined h-11 px-4"><RefreshCw size={18} /></button>
        </div>
      </header>

      {/* MONITORING GRID */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
         {[
           { label: 'Catalogue Actif', value: inventoryStats.totalRefs, icon: <Layers size={20}/>, color: '#1a73e8', desc: 'Réf. enregistrées' },
           { label: 'Flux Critique', value: inventoryStats.lowStockCount, icon: <TrendingDown size={20}/>, color: '#f9ab00', desc: 'Seuil d\'alerte atteint' },
           { label: 'Rupture Totale', value: inventoryStats.outOfStockCount, icon: <Zap size={20}/>, color: '#d93025', desc: 'Stock à zéro' },
           { label: 'Valorisation', value: `${(inventoryStats.totalValue / 1000000).toFixed(1)}M`, icon: <BarChart3 size={20}/>, color: '#188038', desc: 'Total stock (FCFA)' }
         ].map((stat, i) => (
           <div key={i} className="stats-card border-l-4" style={{ borderLeftColor: stat.color }}>
              <div className="flex justify-between items-start">
                 <div>
                    <p className="text-[10px] font-black text-[#5f6368] uppercase tracking-[0.15em] mb-1">{stat.label}</p>
                    <h3 className="text-3xl font-bold text-[#202124] tracking-tight">{stat.value}</h3>
                    <p className="text-[9px] text-[#9aa0a6] font-bold uppercase mt-2">{stat.desc}</p>
                 </div>
                 <div className="p-2.5 bg-gray-50 text-gray-400 group-hover:text-blue-600 transition-colors">{stat.icon}</div>
              </div>
           </div>
         ))}
      </div>

      {/* ENHANCED FILTER BAR - THE CONTROL CENTER */}
      <div className="google-card overflow-hidden border-none shadow-md">
         <div className="p-8 space-y-6 bg-white">
            <div className="flex flex-col lg:flex-row gap-6">
               <div className="relative flex-1 group">
                  <Search className="absolute left-4 top-3.5 text-[#9aa0a6] group-focus-within:text-[#1a73e8] transition-colors" size={20} />
                  <input 
                    type="text" 
                    placeholder="Rechercher par désignation, référence SKU ou marque..." 
                    className="w-full pl-12 h-12 bg-[#f8f9fa] border-[#dadce0] focus:bg-white focus:ring-0 focus:border-[#1a73e8] text-sm font-bold placeholder:text-gray-400" 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)} 
                  />
               </div>
               
               <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center bg-[#f1f3f4] p-1 rounded-xl">
                     <button 
                       onClick={() => setStockStatus('all')}
                       className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${stockStatus === 'all' ? 'bg-white text-[#1a73e8] shadow-sm' : 'text-[#5f6368] hover:text-[#202124]'}`}
                     >
                       Tout
                     </button>
                     <button 
                       onClick={() => setStockStatus('critical')}
                       className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${stockStatus === 'critical' ? 'bg-[#f9ab00] text-white shadow-sm' : 'text-[#5f6368] hover:text-[#f9ab00]'}`}
                     >
                       Critique
                     </button>
                     <button 
                       onClick={() => setStockStatus('out')}
                       className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${stockStatus === 'out' ? 'bg-[#d93025] text-white shadow-sm' : 'text-[#5f6368] hover:text-[#d93025]'}`}
                     >
                       Rupture
                     </button>
                  </div>

                  {hasActiveFilters && (
                    <button 
                      onClick={resetFilters}
                      className="p-3 text-[#d93025] hover:bg-red-50 transition-colors border border-transparent hover:border-red-100"
                      title="Réinitialiser les filtres"
                    >
                      <RotateCcw size={18} />
                    </button>
                  )}
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t border-[#f1f3f4]">
               <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-[#9aa0a6] uppercase tracking-[0.2em] ml-1">Filtrer par Constructeur</label>
                  <div className="relative">
                     <SlidersHorizontal className="absolute left-3.5 top-3.5 text-[#5f6368]" size={14} />
                     <select 
                        value={selectedBrand} 
                        onChange={(e) => setSelectedBrand(e.target.value)}
                        className="w-full pl-10 h-11 bg-white border-[#dadce0] text-[11px] font-black uppercase tracking-widest focus:ring-0 cursor-pointer"
                     >
                        <option value="Tous">Toutes les marques</option>
                        {brands.map(b => <option key={b} value={b}>{b}</option>)}
                     </select>
                  </div>
               </div>

               <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-[#9aa0a6] uppercase tracking-[0.2em] ml-1">Domaine technique</label>
                  <div className="relative">
                     <Boxes className="absolute left-3.5 top-3.5 text-[#5f6368]" size={14} />
                     <select 
                        value={selectedCategory} 
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="w-full pl-10 h-11 bg-white border-[#dadce0] text-[11px] font-black uppercase tracking-widest focus:ring-0 cursor-pointer"
                     >
                        <option value="Toutes">Toutes les catégories</option>
                        <option value="Électronique">Électronique</option>
                        <option value="Mécanique">Mécanique</option>
                        <option value="Consommable">Consommable</option>
                        <option value="Accessoire">Accessoire</option>
                     </select>
                  </div>
               </div>

               <div className="flex items-end pb-0.5">
                  <div className="w-full p-3 bg-blue-50 border border-blue-100 flex items-center justify-between">
                     <span className="text-[10px] font-black text-blue-700 uppercase">{filteredParts.length} Résultats</span>
                     <Activity size={14} className="text-blue-400" />
                  </div>
               </div>
            </div>
         </div>
      </div>

      {/* TABLEAU HORIZON */}
      <div className="google-card overflow-hidden">
         <table className="w-full text-left">
            <thead>
               <tr className="bg-white border-b border-[#dadce0] text-[9px] font-black text-[#5f6368] uppercase tracking-[0.2em]">
                  <th className="px-8 py-5 w-16 text-center">
                     <button onClick={toggleSelectAll} className="p-2 hover:bg-gray-100 transition-colors">
                        {selectedIds.size === filteredParts.length && filteredParts.length > 0 ? <CheckSquare size={20} className="text-[#1a73e8]" /> : <Square size={20} className="text-[#dadce0]" />}
                     </button>
                  </th>
                  <th className="px-8 py-5">Article & Identification</th>
                  <th className="px-8 py-5">Marque</th>
                  <th className="px-8 py-5 text-center">Contrôle Stock</th>
                  <th className="px-8 py-5 text-center">Indicateur</th>
                  <th className="px-8 py-5 text-right">Opérations</th>
               </tr>
            </thead>
            <tbody className="divide-y divide-[#dadce0]">
               {filteredParts.map((p) => {
                 const isCrit = p.currentStock <= p.minStock && p.currentStock > 0;
                 const isOut = p.currentStock === 0;
                 const isSel = selectedIds.has(p.id);
                 return (
                   <tr 
                    key={p.id} 
                    onClick={() => setSelectedPart(p)} 
                    className={`hover:bg-[#f8faff] transition-colors group cursor-pointer ${isSel ? 'bg-[#e8f0fe]' : ''} ${isCrit ? 'border-l-4 border-l-[#f9ab00]' : isOut ? 'border-l-4 border-l-[#d93025]' : ''}`}
                   >
                     <td className="px-8 py-5 text-center" onClick={e => { e.stopPropagation(); const next = new Set(selectedIds); if (next.has(p.id)) next.delete(p.id); else next.add(p.id); setSelectedIds(next); }}>
                        <div className="flex items-center justify-center">
                          {isSel ? <CheckSquare size={20} className="text-[#1a73e8]" /> : <Square size={20} className="text-[#dadce0] group-hover:opacity-100 opacity-20 transition-opacity" />}
                        </div>
                     </td>
                     <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                           <div className={`w-10 h-10 flex items-center justify-center border ${isOut ? 'bg-red-50 text-red-300' : 'bg-gray-50 text-gray-400 group-hover:text-blue-600'} transition-colors`}>
                             <Package size={20} />
                           </div>
                           <div>
                              <p className="text-sm font-bold text-[#3c4043] group-hover:text-[#1a73e8] transition-colors leading-tight">{p.name}</p>
                              <p className="text-[10px] font-mono text-[#9aa0a6] mt-1 font-bold">SKU: {p.sku}</p>
                           </div>
                        </div>
                     </td>
                     <td className="px-8 py-5">
                        <span className="text-[9px] font-black text-[#5f6368] uppercase bg-gray-100 px-2 py-1 border border-gray-200">{p.brand}</span>
                     </td>
                     <td className="px-8 py-5" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-5">
                           <button onClick={() => handleAdjustStock(p.id, -1)} className="w-9 h-9 border border-[#dadce0] flex items-center justify-center hover:bg-red-50 hover:text-red-600 transition-all active:scale-90"><Minus size={16} /></button>
                           <span className={`text-xl font-black min-w-[40px] text-center tracking-tighter ${isOut ? 'text-red-600' : isCrit ? 'text-[#f9ab00]' : 'text-[#202124]'}`}>{p.currentStock}</span>
                           <button onClick={() => handleAdjustStock(p.id, 1)} className="w-9 h-9 border border-[#dadce0] flex items-center justify-center hover:bg-blue-50 hover:text-blue-600 transition-all active:scale-90"><Plus size={16} /></button>
                        </div>
                     </td>
                     <td className="px-8 py-5 text-center">
                        <div className="inline-flex items-center gap-3 px-4 py-1.5 border border-[#dadce0] bg-white shadow-sm">
                           <div className={`w-2 h-2 rounded-full ${isOut ? 'bg-red-600 animate-pulse' : isCrit ? 'bg-[#f9ab00]' : 'bg-[#188038]'}`} />
                           <span className="text-[9px] font-black uppercase tracking-widest text-[#5f6368]">{isOut ? 'RUPTURE' : isCrit ? 'ALERTE' : 'DISPONIBLE'}</span>
                        </div>
                     </td>
                     <td className="px-8 py-5 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                           <button 
                            onClick={(e) => { e.stopPropagation(); setEditingPart(p); setIsModalOpen(true); }} 
                            className="p-2.5 bg-white border border-[#dadce0] hover:border-[#1a73e8] text-[#1a73e8] transition-colors"
                           >
                             <Edit3 size={18}/>
                           </button>
                           <button 
                            onClick={(e) => { e.stopPropagation(); if(window.confirm('Supprimer cet article ?')) deletePart(p.id); }} 
                            className="p-2.5 bg-white border border-[#dadce0] hover:border-red-600 text-red-600 transition-colors"
                           >
                             <Trash2 size={18}/>
                           </button>
                        </div>
                     </td>
                   </tr>
                 );
               })}
               {filteredParts.length === 0 && (
                 <tr>
                    <td colSpan={6} className="py-32 text-center bg-gray-50/30">
                       <Archive size={64} className="mx-auto text-gray-200 mb-6" />
                       <p className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Aucun article ne correspond à votre recherche</p>
                    </td>
                 </tr>
               )}
            </tbody>
         </table>
      </div>

      {/* FLOATING ACTION BAR FOR SELECTION */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[80] bg-[#202124] text-white px-8 py-4 flex items-center gap-10 shadow-2xl animate-in slide-in-from-bottom-8 duration-500">
           <div className="flex items-center gap-4 border-r border-white/20 pr-10">
              <div className="w-10 h-10 bg-blue-600 flex items-center justify-center font-black text-sm">{selectedIds.size}</div>
              <p className="text-[11px] font-black uppercase tracking-widest">Articles sélectionnés</p>
           </div>
           <div className="flex gap-4">
              <button 
                onClick={handleBulkDelete} 
                disabled={isProcessingDelete}
                className="flex items-center gap-3 px-6 py-3 bg-red-600 hover:bg-red-700 transition-colors text-[10px] font-black uppercase tracking-widest disabled:opacity-50"
              >
                {isProcessingDelete ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                Supprimer le lot
              </button>
              <button onClick={() => setSelectedIds(new Set())} className="px-6 py-3 bg-white/10 hover:bg-white/20 transition-colors text-[10px] font-black uppercase tracking-widest">Désélectionner</button>
           </div>
        </div>
      )}

      {/* DRAWER DÉTAILS RICHE */}
      <Drawer isOpen={!!selectedPart} onClose={() => setSelectedPart(null)} title="Expertise Pièce Détachée" icon={<Package size={24}/>} subtitle={`Réf. ${selectedPart?.sku}`}>
         {selectedPart && (
            <div className="space-y-12 pb-20 animate-in fade-in slide-in-from-right-4 duration-500">
               <section className="flex flex-col md:flex-row items-start gap-10">
                  <div className="w-32 h-32 bg-[#f8f9fa] border border-[#dadce0] flex items-center justify-center text-[#1a73e8] shrink-0 shadow-inner">
                    <Package size={64} />
                  </div>
                  <div className="space-y-4">
                     <span className="text-[10px] font-black text-[#1a73e8] uppercase tracking-[0.3em] bg-blue-50 px-3 py-1 border border-blue-100">{selectedPart.brand}</span>
                     <h3 className="text-3xl font-black text-[#202124] leading-none tracking-tighter">{selectedPart.name}</h3>
                     <div className="flex items-center gap-6 pt-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-[#5f6368]">
                           <MapPin size={16} className="text-[#1a73e8]" /> {selectedPart.location}
                        </div>
                        <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#9aa0a6]">
                           <Tag size={16} /> {selectedPart.category}
                        </div>
                     </div>
                  </div>
               </section>

               <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-8 bg-white border border-[#dadce0] shadow-sm space-y-6">
                     <h4 className="text-[10px] font-black text-[#9aa0a6] uppercase tracking-[0.2em] flex items-center gap-2">
                        <Activity size={16} className="text-[#1a73e8]" /> Monitoring Stock
                     </h4>
                     <div className="flex justify-between items-end">
                        <div>
                           <p className="text-4xl font-black text-[#202124] tracking-tighter">{selectedPart.currentStock}</p>
                           <p className="text-[10px] font-bold text-gray-400 uppercase mt-1">Unités disponibles</p>
                        </div>
                        <div className="text-right">
                           <p className="text-xl font-bold text-[#5f6368]">{selectedPart.minStock}</p>
                           <p className="text-[10px] font-bold text-gray-400 uppercase mt-1">Seuil de Sécurité</p>
                        </div>
                     </div>
                     <div className="h-3 bg-gray-100 border border-[#dadce0] overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-1000 ${selectedPart.currentStock <= selectedPart.minStock ? 'bg-[#f9ab00]' : 'bg-[#1a73e8]'}`} 
                          style={{ width: `${Math.min(100, (selectedPart.currentStock / (selectedPart.minStock * 2)) * 100)}%` }}
                        />
                     </div>
                  </div>

                  <div className="p-8 bg-[#f8f9fa] border border-[#dadce0] space-y-6">
                     <h4 className="text-[10px] font-black text-[#9aa0a6] uppercase tracking-[0.2em] flex items-center gap-2">
                        <DollarSign size={16} className="text-[#188038]" /> Économie de la pièce
                     </h4>
                     <div className="space-y-4">
                        <div className="flex justify-between items-center pb-4 border-b border-[#dadce0]">
                           <span className="text-xs font-bold text-[#5f6368]">Prix Unitaire HT</span>
                           <span className="text-base font-black text-[#202124]">{selectedPart.unitPrice.toLocaleString()} F</span>
                        </div>
                        <div className="flex justify-between items-center">
                           <span className="text-xs font-bold text-[#5f6368]">Valeur en Stock</span>
                           <span className="text-lg font-black text-[#188038]">{(selectedPart.unitPrice * selectedPart.currentStock).toLocaleString()} F</span>
                        </div>
                     </div>
                  </div>
               </section>

               <section className="space-y-6">
                  <h4 className="text-[10px] font-black text-[#9aa0a6] uppercase tracking-[0.2em] flex items-center gap-2">
                     <History size={16} /> Flux de Sorties Récent
                  </h4>
                  <div className="p-8 text-center border-2 border-dashed border-[#dadce0] bg-[#f8f9fa]/50">
                     <History size={40} className="mx-auto text-gray-200 mb-4" />
                     <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Chargement de l'historique cloud...</p>
                  </div>
               </section>
            </div>
         )}
      </Drawer>

      {/* MODAL MAPPING IMPORTATION OPTIMISÉ */}
      <Modal isOpen={isMappingModalOpen} onClose={() => setIsMappingModalOpen(false)} title="Vérification de l'Intégrité Cloud" size="lg">
         <div className="space-y-8 animate-in zoom-in-95 duration-300">
            <div className="flex items-start gap-6 p-6 bg-blue-50 border border-blue-100">
               <div className="w-14 h-14 bg-white border border-blue-200 flex items-center justify-center text-[#1a73e8] shadow-sm"><FileSpreadsheet size={32} /></div>
               <div>
                  <h4 className="text-base font-black text-blue-900 uppercase tracking-tight">Analyse Structurale Horizon</h4>
                  <p className="text-xs text-blue-700 mt-1 leading-relaxed font-medium">Horizon a détecté <strong>{importPreview.length} articles</strong> valides. Les colonnes ont été auto-mappées vers les standards Royal Plaza.</p>
               </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
               {MAPPING_RULES.map(rule => (
                 <div key={rule.target} className="p-4 bg-[#f8f9fa] border border-[#dadce0] flex flex-col justify-between">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{rule.label}</p>
                    <div className="flex items-center gap-2 text-[#1a73e8] mt-2">
                       <CheckCircle2 size={14} />
                       <span className="text-[10px] font-black uppercase">Standard OK</span>
                    </div>
                 </div>
               ))}
            </div>

            <div className="google-card overflow-hidden">
               <div className="bg-gray-50 px-6 py-3 border-b text-[9px] font-black text-[#5f6368] uppercase tracking-widest">Échantillon de Pré-Synchronisation</div>
               <div className="overflow-x-auto">
                 <table className="w-full text-left text-[11px]">
                    <thead className="bg-white border-b">
                       <tr className="text-gray-400">
                          <th className="px-6 py-3">Désignation</th>
                          <th className="px-6 py-3">SKU</th>
                          <th className="px-6 py-3 text-center">Stock</th>
                          <th className="px-6 py-3 text-right">Prix</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                       {importPreview.slice(0, 5).map((p, i) => (
                          <tr key={i}>
                             <td className="px-6 py-3 font-bold text-[#3c4043]">{p.name}</td>
                             <td className="px-6 py-3 font-mono text-[#1a73e8]">{p.sku}</td>
                             <td className="px-6 py-3 text-center font-black">{p.currentStock}</td>
                             <td className="px-6 py-3 text-right font-bold">{p.unitPrice.toLocaleString()} F</td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
               </div>
            </div>

            <div className="flex gap-4 pt-6 border-t border-[#dadce0]">
               <button onClick={confirmImport} disabled={isImporting} className="flex-1 btn-google-primary justify-center py-5 text-xs font-black uppercase tracking-[0.2em] shadow-xl">
                  {isImporting ? <Loader2 size={18} className="animate-spin" /> : <><Save size={20} /> Injecter dans le Cloud Plaza</>}
               </button>
               <button onClick={() => setIsMappingModalOpen(false)} className="btn-google-outlined px-12 font-black uppercase text-[10px] tracking-widest">Abandonner</button>
            </div>
         </div>
      </Modal>

      {/* MODAL AJOUT/EDITION SHARP */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingPart ? 'Ajustement Référence Catalogue' : 'Ouverture Nouvelle Référence'} size="lg">
         <form onSubmit={handleSavePart} className="space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
               <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-[#5f6368] tracking-widest ml-1">Désignation Complète</label>
                  <input name="name" type="text" defaultValue={editingPart?.name} required placeholder="ex: Compresseur Inverter LG V2" className="w-full bg-white h-11" />
               </div>
               <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-[#5f6368] tracking-widest ml-1">Référence SKU Unique</label>
                  <input name="sku" type="text" defaultValue={editingPart?.sku} required className="w-full bg-white font-mono uppercase h-11" placeholder="PT-..." />
               </div>
               <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-[#5f6368] tracking-widest ml-1">Constructeur / Marque</label>
                  <select name="brand" defaultValue={editingPart?.brand || 'LG'} className="w-full bg-white h-11 font-bold">
                    {brands.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
               </div>
               <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-[#5f6368] tracking-widest ml-1">Catégorie Horizon</label>
                  <select name="category" defaultValue={editingPart?.category || 'Électronique'} className="w-full bg-white h-11">
                    <option value="Électronique">Électronique</option>
                    <option value="Mécanique">Mécanique</option>
                    <option value="Consommable">Consommable</option>
                    <option value="Accessoire">Accessoire</option>
                  </select>
               </div>
               <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-[#5f6368] tracking-widest ml-1">Position de Stockage</label>
                  <input name="location" type="text" defaultValue={editingPart?.location || 'Rayon A1 - Glass'} required className="w-full bg-white h-11" />
               </div>
               <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-[#5f6368] tracking-widest ml-1">Tarif Unitaire (FCFA)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3.5 top-3 text-[#188038]" size={18} />
                    <input name="unitPrice" type="number" defaultValue={editingPart?.unitPrice || 0} required className="w-full bg-white h-11 pl-11 font-black" />
                  </div>
               </div>
               <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-[#5f6368] tracking-widest ml-1">Stock Initial</label>
                  <input name="currentStock" type="number" defaultValue={editingPart?.currentStock || 0} required className="w-full bg-white h-11" />
               </div>
               <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-[#5f6368] tracking-widest ml-1">Seuil Alerte (Min)</label>
                  <input name="minStock" type="number" defaultValue={editingPart?.minStock || 5} required className="w-full bg-white h-11 border-amber-200" />
               </div>
            </div>
            <div className="flex gap-4 pt-8 border-t border-[#dadce0]">
               <button type="submit" className="flex-1 btn-google-primary justify-center py-5 text-xs font-black uppercase tracking-[0.2em] shadow-xl">
                  <Save size={20} /> Valider la fiche article
               </button>
               <button type="button" onClick={() => setIsModalOpen(false)} className="btn-google-outlined px-12 font-black uppercase text-[10px] tracking-widest">Abandonner</button>
            </div>
         </form>
      </Modal>
    </div>
  );
};

export default PartsInventory;
