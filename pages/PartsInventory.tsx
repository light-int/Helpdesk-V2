
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Package, Search, Plus, RefreshCw, Edit3, Trash2, Save, Loader2,
  MapPin, AlertCircle, ArrowUpRight, Minus, Layers, DollarSign,
  Activity, Hash, Tag, ChevronRight, Info, History, ShieldCheck, Box, X,
  FileUp, Download, CheckCircle2, Square, CheckSquare, AlertTriangle,
  ArrowRight, FileSpreadsheet
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Part, StockMovement } from '../types';
import { useNotifications, useData, useUser } from '../App';
import { ApiService } from '../services/apiService';
import Modal from '../components/Modal';
import Drawer from '../components/Drawer';

/**
 * Moteur de Mapping Royal Plaza
 */
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
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<string>('Tous');
  
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
    return (parts || []).filter(p => 
      (selectedBrand === 'Tous' || p.brand === selectedBrand) && 
      (p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
       p.sku.toLowerCase().includes(searchTerm.toLowerCase()))
    ).sort((a, b) => (a.currentStock <= a.minStock ? -1 : 1)); 
  }, [searchTerm, selectedBrand, parts]);

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
    
    if (window.confirm(`Voulez-vous supprimer définitivement ces ${ids.length} articles du Cloud Royal Plaza ?`)) {
      setIsProcessingDelete(true);
      try {
        await deletePartsBulk(ids);
        addNotification({ title: 'Synchronisation Cloud', message: `${ids.length} articles retirés de la base.`, type: 'info' });
        setSelectedIds(new Set());
      } catch (err) {
        addNotification({ title: 'Erreur Sync', message: 'Impossible de supprimer les éléments du serveur.', type: 'error' });
      } finally {
        setIsProcessingDelete(false);
      }
    }
  };

  const handleIndividualDelete = async (e: React.MouseEvent, part: Part) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (window.confirm(`Supprimer définitivement ${part.name} du catalogue ?`)) {
      try {
        addNotification({ title: 'Cloud Horizon', message: 'Demande de suppression envoyée...', type: 'info' });
        await deletePart(part.id);
        addNotification({ title: 'Catalogue mis à jour', message: 'L\'article a été retiré de la base de données.', type: 'success' });
        if (selectedPart?.id === part.id) setSelectedPart(null);
      } catch (err) {
        // L'erreur est déjà gérée dans App.tsx avec une notification spécifique
        console.error("Delete failed in View:", err);
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
      reason: 'Ajustement Manuel',
      performedBy: currentUser?.name || 'Admin'
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredParts.length && filteredParts.length > 0) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredParts.map(p => p.id)));
  };

  const toggleSelectOne = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
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
    addNotification({ title: 'Succès', message: 'Article enregistré.', type: 'success' });
  };

  if (isLoading) return <div className="h-[60vh] flex items-center justify-center"><Loader2 className="animate-spin text-[#1a73e8]" /></div>;

  return (
    <div className="space-y-6 animate-page-entry pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-normal text-[#3c4043]">Inventaire Pièces Détachées</h1>
          <p className="text-sm text-[#5f6368]">Gestion granulaire et importation par mapping intelligent.</p>
        </div>
        <div className="flex items-center gap-3">
           <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx, .xls" className="hidden" />
           <button onClick={() => fileInputRef.current?.click()} className="btn-google-outlined h-10 px-4">
             <FileUp size={16} /><span className="ml-2">Import XLSX</span>
           </button>
           <button onClick={() => { setEditingPart(null); setIsModalOpen(true); }} className="btn-google-primary h-10">
             <Plus size={18} /> Nouvelle Pièce
           </button>
        </div>
      </header>

      {/* STATS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
         {[
           { label: 'Références', value: inventoryStats.totalRefs, color: '#1a73e8', icon: <Layers size={20}/> },
           { label: 'Stock Critique', value: inventoryStats.lowStockCount, color: '#f9ab00', icon: <AlertCircle size={20}/> },
           { label: 'Ruptures', value: inventoryStats.outOfStockCount, color: '#d93025', icon: <X size={20}/> },
           { label: 'Valeur Stock', value: `${(inventoryStats.totalValue / 1000).toFixed(0)}k`, color: '#188038', icon: <DollarSign size={20}/> }
         ].map((stat, i) => (
           <div key={i} className="google-card p-6 border-b-4" style={{ borderColor: stat.color }}>
              <div className="flex justify-between items-center">
                 <div>
                    <p className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest">{stat.label}</p>
                    <h3 className="text-2xl font-bold text-[#3c4043] mt-1">{stat.value}</h3>
                 </div>
                 <div className="p-3 rounded-xl bg-[#f8f9fa]" style={{ color: stat.color }}>{stat.icon}</div>
              </div>
           </div>
         ))}
      </div>

      {/* ACTION BAR FOR SELECTION */}
      {selectedIds.size > 0 && (
        <div className="bg-[#202124] text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between animate-in slide-in-from-top-4 duration-300">
           <div className="flex items-center gap-4 ml-4">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center font-black text-xs">{selectedIds.size}</div>
              <p className="text-sm font-bold uppercase tracking-widest">Articles sélectionnés</p>
           </div>
           <div className="flex gap-3">
              <button 
                onClick={handleBulkDelete} 
                disabled={isProcessingDelete}
                className="flex items-center gap-2 px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50"
              >
                {isProcessingDelete ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                Supprimer le groupe
              </button>
              <button onClick={() => setSelectedIds(new Set())} className="px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-black uppercase tracking-widest">Annuler</button>
           </div>
        </div>
      )}

      {/* FILTRES */}
      <div className="google-card p-4 flex flex-col md:flex-row gap-4 items-center">
         <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 text-[#5f6368]" size={18} />
            <input type="text" placeholder="Rechercher..." className="pl-10 h-10 w-full" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
         </div>
         <div className="flex gap-2 overflow-x-auto">
            {['Tous', ...brands].map(brand => (
              <button key={brand} onClick={() => setSelectedBrand(brand)} className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${selectedBrand === brand ? 'bg-[#1a73e8] text-white border-[#1a73e8]' : 'bg-white text-[#5f6368] border-[#dadce0]'}`}>
                {brand}
              </button>
            ))}
         </div>
      </div>

      {/* TABLEAU */}
      <div className="google-card overflow-hidden">
         <table className="w-full text-left">
            <thead>
               <tr className="bg-[#f8f9fa] border-b text-[10px] font-black text-[#5f6368] uppercase tracking-widest">
                  <th className="px-6 py-4 w-12 text-center">
                     <button onClick={toggleSelectAll} className="flex items-center justify-center w-full">
                        {selectedIds.size === filteredParts.length && filteredParts.length > 0 ? <CheckSquare size={20} /> : <Square size={20} />}
                     </button>
                  </th>
                  <th className="px-6 py-4">Désignation</th>
                  <th className="px-6 py-4">Marque</th>
                  <th className="px-6 py-4 text-center">Stock</th>
                  <th className="px-6 py-4 text-center">Statut</th>
                  <th className="px-6 py-4 text-right">Actions</th>
               </tr>
            </thead>
            <tbody className="divide-y">
               {filteredParts.map((p) => {
                 const isCrit = p.currentStock <= p.minStock && p.currentStock > 0;
                 const isOut = p.currentStock === 0;
                 const isSel = selectedIds.has(p.id);
                 return (
                   <tr key={p.id} onClick={() => setSelectedPart(p)} className={`hover:bg-[#f8f9fa] cursor-pointer group ${isSel ? 'bg-blue-50' : ''}`}>
                     <td className="px-6 py-4 text-center" onClick={e => toggleSelectOne(e, p.id)}>
                        <div className="flex items-center justify-center">
                          {isSel ? <CheckSquare size={20} className="text-[#1a73e8]" /> : <Square size={20} className="text-[#dadce0] group-hover:opacity-100 opacity-0" />}
                        </div>
                     </td>
                     <td className="px-6 py-4">
                        <p className="text-sm font-bold text-[#3c4043]">{p.name}</p>
                        <p className="text-[10px] font-mono text-[#5f6368]">{p.sku}</p>
                     </td>
                     <td className="px-6 py-4">
                        <span className="text-[10px] font-black bg-gray-100 px-2 py-0.5 rounded">{p.brand}</span>
                     </td>
                     <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-4">
                           <button onClick={() => handleAdjustStock(p.id, -1)} className="w-7 h-7 rounded-full border flex items-center justify-center hover:bg-red-50"><Minus size={14} /></button>
                           <span className="text-base font-black min-w-[30px] text-center">{p.currentStock}</span>
                           <button onClick={() => handleAdjustStock(p.id, 1)} className="w-7 h-7 rounded-full border flex items-center justify-center hover:bg-blue-50"><Plus size={14} /></button>
                        </div>
                     </td>
                     <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                           <div className={`w-2 h-2 rounded-full ${isOut ? 'bg-red-600' : isCrit ? 'bg-orange-500' : 'bg-green-500'}`} />
                           <span className="text-[10px] font-black uppercase tracking-widest">{isOut ? 'Rupture' : isCrit ? 'Alerte' : 'En Stock'}</span>
                        </div>
                     </td>
                     <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2 opacity-50 md:opacity-0 group-hover:opacity-100 transition-all">
                           <button 
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setEditingPart(p); setIsModalOpen(true); }} 
                            className="p-2.5 bg-white border border-[#dadce0] hover:border-[#1a73e8] rounded-xl text-[#1a73e8] shadow-sm relative z-20 pointer-events-auto"
                           >
                             <Edit3 size={16}/>
                           </button>
                           <button 
                            type="button"
                            onClick={(e) => handleIndividualDelete(e, p)} 
                            className="p-2.5 bg-white border border-[#dadce0] hover:border-red-600 rounded-xl text-red-600 shadow-sm relative z-20 pointer-events-auto"
                           >
                             <Trash2 size={16}/>
                           </button>
                        </div>
                     </td>
                   </tr>
                 );
               })}
            </tbody>
         </table>
         {filteredParts.length === 0 && (
           <div className="py-32 text-center">
              <Package size={48} className="mx-auto text-gray-200 mb-4" />
              <p className="text-sm font-black text-gray-400 uppercase tracking-widest">Aucune pièce trouvée</p>
           </div>
         )}
      </div>

      {/* MODAL MAPPING IMPORTATION */}
      <Modal isOpen={isMappingModalOpen} onClose={() => setIsMappingModalOpen(false)} title="Vérification du Mapping Royal Plaza" size="lg">
         <div className="space-y-6">
            <div className="flex items-start gap-4 p-5 bg-blue-50 border border-blue-100 rounded-2xl">
               <FileSpreadsheet className="text-[#1a73e8] shrink-0" size={32} />
               <div>
                  <h4 className="text-sm font-black text-blue-900 uppercase">Analyse du fichier réussie</h4>
                  <p className="text-xs text-blue-700 mt-1">Horizon a détecté {importPreview.length} articles. Veuillez vérifier les colonnes ci-dessous avant l'injection Cloud.</p>
               </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
               {MAPPING_RULES.map(rule => (
                 <div key={rule.target} className="p-4 bg-white border border-[#dadce0] rounded-xl shadow-sm">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">{rule.label}</p>
                    <div className="flex items-center gap-2 text-[#1a73e8]">
                       <CheckCircle2 size={14} />
                       <span className="text-xs font-bold">Mapping Automatique</span>
                    </div>
                 </div>
               ))}
            </div>

            <div className="google-card overflow-hidden">
               <div className="bg-gray-50 px-4 py-2 border-b text-[10px] font-black text-gray-500 uppercase">Aperçu des 5 premières lignes</div>
               <table className="w-full text-left text-[11px]">
                  <thead className="bg-gray-100 border-b">
                     <tr>
                        <th className="px-4 py-2">Désignation</th>
                        <th className="px-4 py-2">SKU</th>
                        <th className="px-4 py-2">Stock</th>
                        <th className="px-4 py-2">Prix</th>
                     </tr>
                  </thead>
                  <tbody>
                     {importPreview.slice(0, 5).map((p, i) => (
                        <tr key={i} className="border-b last:border-0">
                           <td className="px-4 py-2 font-bold">{p.name}</td>
                           <td className="px-4 py-2 font-mono">{p.sku}</td>
                           <td className="px-4 py-2">{p.currentStock}</td>
                           <td className="px-4 py-2">{p.unitPrice.toLocaleString()} F</td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>

            <div className="flex gap-3 pt-4 border-t">
               <button onClick={confirmImport} disabled={isImporting} className="flex-1 btn-google-primary justify-center py-4 text-xs font-black uppercase tracking-widest shadow-xl">
                  {isImporting ? <Loader2 size={18} className="animate-spin" /> : <><Save size={18} /> Confirmer l'importation Cloud</>}
               </button>
               <button onClick={() => setIsMappingModalOpen(false)} className="btn-google-outlined px-10">Annuler</button>
            </div>
         </div>
      </Modal>

      {/* DRAWER DÉTAILS */}
      <Drawer isOpen={!!selectedPart} onClose={() => setSelectedPart(null)} title="Fiche Technique" icon={<Package size={20}/>}>
         {selectedPart && (
            <div className="space-y-10">
               <div className="flex items-center gap-6">
                  <div className="w-20 h-20 bg-[#f8f9fa] rounded-3xl border flex items-center justify-center text-[#1a73e8] shadow-sm"><Package size={40} /></div>
                  <div>
                     <span className="text-[10px] font-black text-[#1a73e8] uppercase tracking-widest">{selectedPart.brand}</span>
                     <h3 className="text-xl font-bold text-[#3c4043] leading-tight">{selectedPart.name}</h3>
                     <p className="text-xs text-[#5f6368] mt-1 flex items-center gap-1"><MapPin size={12}/> {selectedPart.location}</p>
                  </div>
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div className="p-5 bg-[#f8f9fa] border rounded-2xl">
                     <p className="text-[9px] font-black text-[#5f6368] uppercase mb-2">P.U. Unitaire</p>
                     <p className="text-2xl font-black text-[#3c4043]">{selectedPart.unitPrice.toLocaleString()} <span className="text-xs">F</span></p>
                  </div>
                  <div className="p-5 bg-blue-50 border border-blue-100 rounded-2xl">
                     <p className="text-[9px] font-black text-[#1a73e8] uppercase mb-2">Valorisation</p>
                     <p className="text-2xl font-black text-[#1a73e8]">{(selectedPart.unitPrice * selectedPart.currentStock).toLocaleString()} <span className="text-xs">F</span></p>
                  </div>
               </div>

               <div className="p-6 bg-red-50 border border-red-100 rounded-2xl flex items-center justify-between">
                  <div>
                     <p className="text-xs font-black text-red-700 uppercase">Zone de Risque</p>
                     <p className="text-[10px] text-red-600 mt-1 uppercase font-bold tracking-widest">Retrait définitif de l'inventaire</p>
                  </div>
                  <button 
                    onClick={(e) => handleIndividualDelete(e, selectedPart)}
                    className="p-3 bg-red-600 text-white rounded-xl hover:bg-red-700 shadow-lg shadow-red-600/20 transition-all active:scale-90"
                  >
                     <Trash2 size={20} />
                  </button>
               </div>
            </div>
         )}
      </Drawer>

      {/* MODAL AJOUT/EDIT */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingPart ? 'Modifier la pièce' : 'Nouvelle Référence'}>
         <form onSubmit={handleSavePart} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="space-y-1"><label className="text-[10px] font-black uppercase text-[#5f6368] ml-1">Désignation</label><input name="name" type="text" defaultValue={editingPart?.name} required /></div>
               <div className="space-y-1"><label className="text-[10px] font-black uppercase text-[#5f6368] ml-1">SKU</label><input name="sku" type="text" defaultValue={editingPart?.sku} required className="uppercase font-mono" /></div>
               <div className="space-y-1"><label className="text-[10px] font-black uppercase text-[#5f6368] ml-1">Marque</label><select name="brand" defaultValue={editingPart?.brand || 'LG'}>{brands.map(b => <option key={b} value={b}>{b}</option>)}</select></div>
               <div className="space-y-1"><label className="text-[10px] font-black uppercase text-[#5f6368] ml-1">Prix (F)</label><input name="unitPrice" type="number" defaultValue={editingPart?.unitPrice || 0} required /></div>
               <div className="space-y-1"><label className="text-[10px] font-black uppercase text-[#5f6368] ml-1">Stock</label><input name="currentStock" type="number" defaultValue={editingPart?.currentStock || 0} required /></div>
               <div className="space-y-1"><label className="text-[10px] font-black uppercase text-[#5f6368] ml-1">Alerte Min</label><input name="minStock" type="number" defaultValue={editingPart?.minStock || 5} required /></div>
            </div>
            <div className="flex gap-3 pt-6 border-t">
               <button type="submit" className="flex-1 btn-google-primary justify-center shadow-xl shadow-blue-600/20">Enregistrer</button>
               <button type="button" onClick={() => setIsModalOpen(false)} className="btn-google-outlined px-10">Annuler</button>
            </div>
         </form>
      </Modal>
    </div>
  );
};

export default PartsInventory;
