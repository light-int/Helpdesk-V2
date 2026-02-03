
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Package, Search, Plus, RefreshCw, Edit3, Trash2, 
  Minus, Layers, DollarSign, Activity, ChevronRight,
  TrendingDown, Zap, BarChart3, MapPin, Tag, Upload, 
  FileDown, Filter, X, AlertTriangle, Boxes, CheckCircle2,
  Table as TableIcon, ArrowRight, Settings2
} from 'lucide-react';
import { Part } from '../types';
import { useNotifications, useData, useUser } from '../App';
import Modal from '../components/Modal';
import Drawer from '../components/Drawer';
import { ApiService } from '../services/apiService';
import * as XLSX from 'xlsx';

const PartsInventory: React.FC = () => {
  const { parts, brands, isLoading, refreshAll, addStockMovement, isSyncing, deletePart, savePart } = useData();
  const { currentUser } = useUser();
  const { addNotification } = useNotifications();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [stockStatus, setStockStatus] = useState<'all' | 'critical' | 'out'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPart, setEditingPart] = useState<Part | null>(null);
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Bulk Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Mapping Import State
  const [isMappingModalOpen, setIsMappingModalOpen] = useState(false);
  const [rawImportData, setRawImportData] = useState<any[]>([]);
  const [fileHeaders, setFileHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({
    name: '', sku: '', currentStock: '', minStock: '', unitPrice: '', location: '', brand: '', category: ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { refreshAll(); }, []);

  const filteredParts = useMemo(() => {
    return (parts || []).filter(p => {
      const matchesSearch = (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (p.sku || '').toLowerCase().includes(searchTerm.toLowerCase());
      let matchesStatus = true;
      if (stockStatus === 'critical') matchesStatus = p.currentStock <= p.minStock && p.currentStock > 0;
      if (stockStatus === 'out') matchesStatus = p.currentStock === 0;
      return matchesSearch && matchesStatus;
    }).sort((a, b) => (a.currentStock <= a.minStock ? -1 : 1));
  }, [searchTerm, stockStatus, parts]);

  const stats = useMemo(() => {
    const totalParts = parts.length;
    const critical = parts.filter(p => p.currentStock <= p.minStock && p.currentStock > 0).length;
    const outOfStock = parts.filter(p => p.currentStock === 0).length;
    const totalValuation = parts.reduce((acc, p) => acc + (p.currentStock * p.unitPrice), 0);
    return { totalParts, critical, outOfStock, totalValuation };
  }, [parts]);

  const handleAdjustStock = async (id: string, delta: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const part = parts.find(p => p.id === id);
    if (!part) return;
    
    if (delta < 0 && part.currentStock + delta < 0) {
      addNotification({ title: 'Attention', message: 'Le stock ne peut pas être négatif.', type: 'warning' });
      return;
    }

    try {
      await addStockMovement({
        partId: part.id,
        partName: part.name,
        quantity: Math.abs(delta),
        type: delta > 0 ? 'IN' : 'OUT',
        reason: 'Ajustement rapide manuel',
        performedBy: currentUser?.name || 'Expert'
      });
      addNotification({ title: 'Stock mis à jour', message: `${part.name} : ${delta > 0 ? '+' : ''}${delta}`, type: 'success' });
    } catch (err) {
      addNotification({ title: 'Erreur', message: 'Échec de la mise à jour du stock.', type: 'error' });
    }
  };

  const handleSavePart = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    const formData = new FormData(e.currentTarget);
    
    const partData: Part = {
      id: editingPart?.id || `PT-${Date.now()}`,
      name: formData.get('name') as string,
      sku: formData.get('sku') as string,
      category: formData.get('category') as any,
      brand: formData.get('brand') as string,
      currentStock: Number(formData.get('currentStock')),
      minStock: Number(formData.get('minStock')),
      unitPrice: Number(formData.get('unitPrice')),
      location: formData.get('location') as string
    };

    try {
      await savePart(partData);
      addNotification({ title: 'Succès', message: 'Pièce enregistrée dans le catalogue.', type: 'success' });
      setIsModalOpen(false);
    } catch (err) {
      addNotification({ title: 'Erreur', message: 'Impossible de sauvegarder la pièce.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePart = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Confirmer la suppression définitive de cette pièce ?')) return;
    try {
      await deletePart(id);
      addNotification({ title: 'Supprimé', message: 'La pièce a été retirée de l\'inventaire.', type: 'info' });
      if (selectedPart?.id === id) setSelectedPart(null);
      setSelectedIds(prev => prev.filter(i => i !== id));
    } catch (err) {
      addNotification({ title: 'Erreur', message: 'Échec de la suppression.', type: 'error' });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Supprimer définitivement les ${selectedIds.length} articles sélectionnés ?`)) return;
    
    setIsSaving(true);
    try {
      await ApiService.parts.deleteBulk(selectedIds);
      addNotification({ title: 'Suppression groupée', message: `${selectedIds.length} articles retirés.`, type: 'success' });
      setSelectedIds([]);
      refreshAll();
    } catch (err) {
      addNotification({ title: 'Erreur', message: 'Échec de la suppression groupée.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('ATTENTION : Voulez-vous vraiment VIDER TOUT l\'inventaire ? Cette action est irréversible.')) return;
    setIsSaving(true);
    try {
      const allIds = parts.map(p => p.id);
      await ApiService.parts.deleteBulk(allIds);
      addNotification({ title: 'Inventaire vidé', message: 'Toutes les pièces ont été supprimées.', type: 'info' });
      refreshAll();
    } catch (err) {
      addNotification({ title: 'Erreur', message: 'Échec du nettoyage de l\'inventaire.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredParts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredParts.map(p => p.id));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
        
        if (data.length > 0) {
          const headers = (data[0] as string[]).map(h => String(h || ''));
          setFileHeaders(headers);
          
          const newMapping = { ...mapping };
          headers.forEach(h => {
            const low = h.toLowerCase();
            if (low.includes('nom') || low.includes('name') || low.includes('désignation')) newMapping.name = h;
            if (low.includes('sku') || low.includes('réf') || low.includes('ref')) newMapping.sku = h;
            if (low.includes('stock') || low.includes('quantité') || low.includes('qty')) newMapping.currentStock = h;
            if (low.includes('min') || low.includes('alerte')) newMapping.minStock = h;
            if (low.includes('prix') || low.includes('price') || low.includes('pu')) newMapping.unitPrice = h;
            if (low.includes('emplacement') || low.includes('loc') || low.includes('rayon')) newMapping.location = h;
            if (low.includes('marque') || low.includes('brand')) newMapping.brand = h;
            if (low.includes('cat')) newMapping.category = h;
          });
          setMapping(newMapping);
          
          const rows = XLSX.utils.sheet_to_json(ws);
          setRawImportData(rows);
          setIsMappingModalOpen(true);
        }
      } catch (err) {
        addNotification({ title: 'Erreur Fichier', message: 'Le format du fichier est invalide.', type: 'error' });
      }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const processImport = async () => {
    if (!mapping.name || !mapping.sku) {
      addNotification({ title: 'Mapping incomplet', message: 'Le nom et la référence (SKU) sont obligatoires.', type: 'warning' });
      return;
    }

    setIsSaving(true);
    try {
      const importedParts: Part[] = rawImportData.map((row, i) => ({
        id: `PT-IMP-${Date.now()}-${i}`,
        name: String(row[mapping.name] || 'Sans nom'),
        sku: String(row[mapping.sku] || `SKU-${Date.now()}-${i}`),
        currentStock: Number(row[mapping.currentStock] || 0),
        minStock: Number(row[mapping.minStock] || 5),
        unitPrice: Number(row[mapping.unitPrice] || 0),
        location: String(row[mapping.location] || 'Magasin Central'),
        brand: String(row[mapping.brand] || 'Royal Plaza'),
        category: (row[mapping.category] || 'Consommable') as any
      }));

      await ApiService.parts.saveAll(importedParts);
      addNotification({ title: 'Import Réussi', message: `${importedParts.length} pièces synchronisées.`, type: 'success' });
      setIsMappingModalOpen(false);
      refreshAll();
    } catch (err) {
      addNotification({ title: 'Erreur Import', message: 'Échec de l\'enregistrement massif.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="h-[80vh] flex items-center justify-center"><RefreshCw className="animate-spin text-[#3ecf8e]" size={32} /></div>;

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-sb-entry pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1c1c1c] tracking-tight">Pièces & Rechanges</h1>
          <p className="text-xs text-[#686868] mt-1 font-medium">Gestion centralisée des stocks techniques et composants SAV.</p>
        </div>
        <div className="flex gap-2">
          {parts.length > 0 && (
             <button onClick={handleClearAll} className="btn-sb-outline h-10 px-4 text-red-500 hover:bg-red-50 border-red-100">
               <Trash2 size={16} /> <span>Vider tout</span>
             </button>
          )}
          <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept=".xlsx, .xls, .csv" />
          <button onClick={() => fileInputRef.current?.click()} className="btn-sb-outline h-10 px-4">
             <Upload size={16} /> <span>Importer CSV/Excel</span>
          </button>
          <button onClick={() => { setEditingPart(null); setIsModalOpen(true); }} className="btn-sb-primary h-10 px-4">
            <Plus size={16} /> <span>Nouvel Article</span>
          </button>
        </div>
      </header>

      {/* KPI Section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Catalogue total', value: stats.totalParts, icon: <Boxes size={16}/>, color: 'text-blue-500' },
          { label: 'Articles en alerte', value: stats.critical, icon: <AlertTriangle size={16}/>, color: 'text-amber-500' },
          { label: 'Ruptures sèches', value: stats.outOfStock, icon: <Zap size={16}/>, color: 'text-red-500' },
          { label: 'Valeur Inventaire', value: `${(stats.totalValuation / 1000000).toFixed(1)}M F`, icon: <BarChart3 size={16}/>, color: 'text-[#3ecf8e]' }
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

      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="relative group flex-1 w-full">
          <Search className="absolute left-3 top-3.5 text-[#686868]" size={18} />
          <input 
            type="text" placeholder="Rechercher par nom, SKU ou marque..." 
            className="w-full pl-10 h-12 bg-white"
            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex bg-[#f1f3f4] p-1 rounded-lg shrink-0 border border-[#ededed]">
          {[
            { id: 'all', label: 'Tout', icon: <Layers size={12}/> },
            { id: 'critical', label: 'Alertes', icon: <AlertTriangle size={12}/> },
            { id: 'out', label: 'Ruptures', icon: <Zap size={12}/> }
          ].map(st => (
            <button 
              key={st.id} 
              onClick={() => setStockStatus(st.id as any)} 
              className={`flex items-center gap-2 px-6 py-2 text-[10px] font-black uppercase rounded-md transition-all ${stockStatus === st.id ? 'bg-white shadow-sm text-[#1c1c1c]' : 'text-[#686868] hover:text-[#1c1c1c]'}`}
            >
              {st.icon} {st.label}
            </button>
          ))}
        </div>
        <button onClick={refreshAll} className="btn-sb-outline h-12 px-3">
          <RefreshCw size={18} className={isSyncing ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.length > 0 && (
        <div className="bg-[#1c1c1c] text-white p-4 rounded-lg flex items-center justify-between animate-sb-entry shadow-lg">
           <div className="flex items-center gap-4">
              <CheckCircle2 size={20} className="text-[#3ecf8e]" />
              <span className="text-sm font-bold">{selectedIds.length} article(s) sélectionné(s)</span>
           </div>
           <div className="flex gap-2">
              <button onClick={() => setSelectedIds([])} className="px-4 py-2 text-xs font-bold hover:bg-white/10 rounded transition-colors">Annuler</button>
              <button onClick={handleBulkDelete} className="bg-red-500 hover:bg-red-600 px-4 py-2 text-xs font-bold rounded flex items-center gap-2 transition-colors">
                <Trash2 size={14}/> Supprimer la sélection
              </button>
           </div>
        </div>
      )}

      <div className="sb-table-container">
        <table className="w-full text-left sb-table">
          <thead>
            <tr>
              <th className="w-10 px-4">
                <input type="checkbox" checked={selectedIds.length > 0 && selectedIds.length === filteredParts.length} onChange={toggleSelectAll} className="rounded" />
              </th>
              <th className="w-24">SKU</th>
              <th>Désignation & Marque</th>
              <th>Emplacement</th>
              <th className="text-center">Quantité</th>
              <th className="text-right">Prix Unitaire</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredParts.map((p) => (
              <tr key={p.id} onClick={() => setSelectedPart(p)} className={`cursor-pointer group ${selectedIds.includes(p.id) ? 'bg-[#f0fdf4]' : ''}`}>
                <td className="px-4" onClick={e => e.stopPropagation()}>
                  <input type="checkbox" checked={selectedIds.includes(p.id)} onChange={(e) => toggleSelect(p.id, e as any)} className="rounded" />
                </td>
                <td className="font-mono text-[11px] font-black text-[#686868] uppercase">{p.sku}</td>
                <td>
                  <p className="text-[13px] font-bold text-[#1c1c1c]">{p.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[9px] font-black text-[#3ecf8e] uppercase leading-none">{p.brand}</span>
                    <span className="text-[9px] text-[#686868] font-bold">• {p.category}</span>
                  </div>
                </td>
                <td>
                  <div className="flex items-center gap-1.5 text-[#686868]">
                    <MapPin size={12} />
                    <span className="text-[11px] font-medium">{p.location}</span>
                  </div>
                </td>
                <td onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-center gap-3">
                     <button 
                      onClick={() => handleAdjustStock(p.id, -1)} 
                      className="w-7 h-7 rounded bg-[#f8f9fa] border border-[#ededed] flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-colors"
                     >
                        <Minus size={14}/>
                     </button>
                     <span className={`text-[15px] font-black min-w-[30px] text-center ${p.currentStock <= p.minStock ? 'text-red-500' : 'text-[#1c1c1c]'}`}>
                        {p.currentStock}
                     </span>
                     <button 
                      onClick={() => handleAdjustStock(p.id, 1)} 
                      className="w-7 h-7 rounded bg-[#f8f9fa] border border-[#ededed] flex items-center justify-center hover:bg-[#f0fdf4] hover:text-[#3ecf8e] transition-colors"
                     >
                        <Plus size={14}/>
                     </button>
                  </div>
                </td>
                <td className="text-right font-mono text-[13px] font-bold text-[#1c1c1c]">
                  {p.unitPrice.toLocaleString()} F
                </td>
                <td className="text-right">
                   <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setEditingPart(p); setIsModalOpen(true); }}
                        className="p-1.5 text-[#686868] hover:text-[#3ecf8e] rounded"
                      >
                        <Edit3 size={14}/>
                      </button>
                      <button 
                        onClick={(e) => handleDeletePart(p.id, e)}
                        className="p-1.5 text-[#686868] hover:text-red-500 rounded"
                      >
                        <Trash2 size={14}/>
                      </button>
                   </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredParts.length === 0 && (
          <div className="p-24 text-center space-y-3 opacity-40">
            <Package size={48} className="mx-auto text-[#686868]" />
            <p className="text-[13px] font-bold text-[#686868] uppercase tracking-widest">Aucun article trouvé</p>
          </div>
        )}
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingPart ? "Modifier l'Article" : "Nouvel Article Stock"}
      >
        <form onSubmit={handleSavePart} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#686868] uppercase">Désignation</label>
              <input name="name" type="text" defaultValue={editingPart?.name} placeholder="ex: Compresseur LG 12k" required className="w-full" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#686868] uppercase">Référence SKU</label>
              <input name="sku" type="text" defaultValue={editingPart?.sku} placeholder="ex: COMP-LG-V1" required className="w-full" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#686868] uppercase">Marque</label>
              <select name="brand" defaultValue={editingPart?.brand || 'LG'} className="w-full">
                 {brands.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#686868] uppercase">Catégorie</label>
              <select name="category" defaultValue={editingPart?.category || 'Mécanique'} className="w-full">
                <option value="Électronique">Électronique</option>
                <option value="Mécanique">Mécanique</option>
                <option value="Consommable">Consommable</option>
                <option value="Accessoire">Accessoire</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#686868] uppercase">Stock Actuel</label>
              <input name="currentStock" type="number" defaultValue={editingPart?.currentStock || 0} placeholder="0" required className="w-full" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#686868] uppercase">Seuil d'alerte</label>
              <input name="minStock" type="number" defaultValue={editingPart?.minStock || 5} placeholder="5" required className="w-full" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#686868] uppercase">Prix Unitaire (F CFA)</label>
              <input name="unitPrice" type="number" defaultValue={editingPart?.unitPrice || 0} placeholder="0" required className="w-full" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#686868] uppercase">Emplacement Magasin</label>
              <input name="location" type="text" defaultValue={editingPart?.location} placeholder="ex: Rayon A1 - Glass" required className="w-full" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-[#ededed]">
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn-sb-outline">Annuler</button>
            <button type="submit" disabled={isSaving} className="btn-sb-primary">
              {isSaving ? <RefreshCw className="animate-spin" size={14}/> : 'Enregistrer Article'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Import Mapping Modal */}
      <Modal 
        isOpen={isMappingModalOpen} 
        onClose={() => setIsMappingModalOpen(false)} 
        title="Configuration de l'Importation"
        size="lg"
      >
        <div className="space-y-8">
           <div className="flex items-start gap-4 p-4 bg-[#f0f9f4] border border-[#dcfce7] rounded-lg">
              <CheckCircle2 className="text-[#3ecf8e] mt-1 shrink-0" size={20}/>
              <div>
                 <p className="text-sm font-bold text-[#1c1c1c]">Fichier analysé avec succès</p>
                 <p className="text-xs text-[#4b5563]">Veuillez mapper vos colonnes Excel aux champs de l'inventaire Plaza.</p>
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
              {[
                { key: 'name', label: 'Désignation / Nom', req: true },
                { key: 'sku', label: 'Référence / SKU', req: true },
                { key: 'currentStock', label: 'Stock Actuel', req: false },
                { key: 'unitPrice', label: 'Prix Unitaire', req: false },
                { key: 'location', label: 'Emplacement', req: false },
                { key: 'brand', label: 'Marque', req: false },
                { key: 'category', label: 'Catégorie', req: false },
                { key: 'minStock', label: 'Seuil Alerte', req: false },
              ].map(field => (
                <div key={field.key} className="space-y-1.5">
                   <label className="text-[10px] font-black text-[#686868] uppercase flex items-center justify-between">
                      <span>{field.label} {field.req && <span className="text-red-500">*</span>}</span>
                      <span className="text-[9px] lowercase opacity-40 italic">Système</span>
                   </label>
                   <select 
                    className={`w-full h-10 ${mapping[field.key] ? 'border-[#3ecf8e] bg-[#f0fdf4]/50' : ''}`}
                    value={mapping[field.key]}
                    onChange={e => setMapping({...mapping, [field.key]: e.target.value})}
                   >
                      <option value="">-- Ignorer --</option>
                      {fileHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                   </select>
                </div>
              ))}
           </div>

           <div className="p-4 border border-[#ededed] rounded-lg bg-[#fcfcfc]">
              <p className="text-[10px] font-black text-[#686868] uppercase mb-3 flex items-center gap-2">
                <TableIcon size={12}/> Aperçu des données sources
              </p>
              <div className="overflow-x-auto max-h-40 custom-scrollbar">
                 <table className="w-full text-[10px] text-left border-collapse">
                    <thead>
                       <tr className="bg-[#f8f9fa] border-b border-[#ededed]">
                          {fileHeaders.slice(0, 5).map(h => <th key={h} className="py-2 px-3 font-bold text-[#1c1c1c] border-r border-[#ededed]">{h}</th>)}
                       </tr>
                    </thead>
                    <tbody>
                       {rawImportData.slice(0, 5).map((row, i) => (
                         <tr key={i} className="border-b border-[#f5f5f5] last:border-none">
                            {fileHeaders.slice(0, 5).map(h => <td key={h} className="py-2 px-3 text-[#686868] border-r border-[#ededed]">{String(row[h] || '')}</td>)}
                         </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
           </div>

           <div className="flex justify-end gap-3 pt-6 border-t border-[#ededed]">
              <button onClick={() => setIsMappingModalOpen(false)} className="btn-sb-outline h-11 px-6">Annuler</button>
              <button 
                onClick={processImport} 
                disabled={isSaving || !mapping.name || !mapping.sku} 
                className="btn-sb-primary h-11 px-10 shadow-md"
              >
                {isSaving ? <RefreshCw className="animate-spin" size={16}/> : <>Importer {rawImportData.length} articles <ArrowRight size={14}/></>}
              </button>
           </div>
        </div>
      </Modal>

      <Drawer isOpen={!!selectedPart} onClose={() => setSelectedPart(null)} title="Fiche Technique Pièce" icon={<Package size={18}/>}>
        {selectedPart && (
          <div className="space-y-8 animate-sb-entry pb-10">
            <div className="p-8 bg-[#f8f9fa] border border-[#ededed] rounded-xl flex flex-col items-center text-center">
               <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center text-[#3ecf8e] shadow-sm mb-4 border border-[#ededed]">
                  <Package size={40} />
               </div>
               <h3 className="text-xl font-bold text-[#1c1c1c] tracking-tight">{selectedPart.name}</h3>
               <p className="text-[11px] text-[#686868] font-black uppercase tracking-[0.2em] mt-2">
                 SKU: {selectedPart.sku}
               </p>
               <div className="mt-4 flex gap-2">
                  <span className="px-3 py-1 bg-white border border-[#ededed] text-[9px] font-black uppercase rounded-full shadow-sm">
                    {selectedPart.brand}
                  </span>
                  <span className="px-3 py-1 bg-white border border-[#ededed] text-[9px] font-black uppercase rounded-full shadow-sm">
                    {selectedPart.category}
                  </span>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-5 bg-white border border-[#ededed] rounded-xl shadow-sm space-y-1">
                 <p className="text-[10px] font-black text-[#686868] uppercase tracking-widest">Stock Disponible</p>
                 <div className="flex items-baseline gap-2">
                    <p className={`text-2xl font-black ${selectedPart.currentStock <= selectedPart.minStock ? 'text-red-500' : 'text-[#1c1c1c]'}`}>
                      {selectedPart.currentStock}
                    </p>
                    <span className="text-[10px] text-[#686868] font-bold">unités</span>
                 </div>
                 <p className="text-[10px] text-[#686868] italic">Seuil alerte: {selectedPart.minStock}</p>
              </div>
              <div className="p-5 bg-white border border-[#ededed] rounded-xl shadow-sm space-y-1">
                 <p className="text-[10px] font-black text-[#686868] uppercase tracking-widest">Valeur Stockée</p>
                 <p className="text-2xl font-black text-[#1c1c1c] font-mono">
                    {(selectedPart.currentStock * selectedPart.unitPrice).toLocaleString()} F
                 </p>
                 <p className="text-[10px] text-[#3ecf8e] font-bold">Basé sur PU {selectedPart.unitPrice.toLocaleString()} F</p>
              </div>
            </div>

            <div className="space-y-4">
               <h4 className="text-[11px] font-black text-[#686868] uppercase tracking-widest border-b border-[#ededed] pb-2">Localisation Logistique</h4>
               <div className="p-4 bg-[#fcfcfc] border border-[#ededed] rounded-lg flex items-center gap-3">
                  <MapPin size={18} className="text-[#3ecf8e]"/>
                  <div>
                    <p className="text-[13px] font-bold text-[#1c1c1c]">{selectedPart.location}</p>
                    <p className="text-[10px] text-[#686868] uppercase font-bold tracking-tight">Magasin Central Royal Plaza</p>
                  </div>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-6">
               <button 
                onClick={() => { setEditingPart(selectedPart); setIsModalOpen(true); }}
                className="btn-sb-outline h-12 justify-center font-black uppercase text-[11px] tracking-widest"
               >
                  <Edit3 size={14}/><span>Modifier</span>
               </button>
               <button 
                onClick={(e) => handleDeletePart(selectedPart.id, e)}
                className="btn-sb-outline h-12 justify-center font-black uppercase text-[11px] tracking-widest text-red-500 hover:bg-red-50 hover:border-red-200"
               >
                  <Trash2 size={14}/><span>Supprimer</span>
               </button>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default PartsInventory;
