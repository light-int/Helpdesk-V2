
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Package, Search, Plus, RefreshCw, Edit3, Trash2, 
  Minus, Layers, Activity, 
  BarChart3, MapPin, Upload, 
  AlertTriangle, Boxes, CheckCircle2,
  Zap, ArrowRight
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

  useEffect(() => { refreshAll(); }, [refreshAll]);

  const filteredParts = useMemo(() => {
    return (parts || []).filter((p: Part) => {
      const matchesSearch = (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (p.sku || '').toLowerCase().includes(searchTerm.toLowerCase());
      let matchesStatus = true;
      if (stockStatus === 'critical') matchesStatus = p.currentStock <= p.minStock && p.currentStock > 0;
      if (stockStatus === 'out') matchesStatus = p.currentStock === 0;
      return matchesSearch && matchesStatus;
    }).sort((a: Part, b: Part) => (a.currentStock <= a.minStock ? -1 : 1));
  }, [searchTerm, stockStatus, parts]);

  const stats = useMemo(() => {
    const totalParts = (parts || []).length;
    const critical = (parts || []).filter((p: Part) => p.currentStock <= p.minStock && p.currentStock > 0).length;
    const outOfStock = (parts || []).filter((p: Part) => p.currentStock === 0).length;
    const totalValuation = (parts || []).reduce((acc: number, p: Part) => acc + (p.currentStock * p.unitPrice), 0);
    return { totalParts, critical, outOfStock, totalValuation };
  }, [parts]);

  const handleAdjustStock = async (id: string, delta: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const part = parts.find((p: Part) => p.id === id);
    if (!part) return;
    
    if (delta < 0 && part.currentStock + delta < 0) {
      addNotification({ title: 'Alerte Stock', message: 'Opération impossible : Stock insuffisant.', type: 'warning' });
      return;
    }

    try {
      await addStockMovement({
        partId: part.id,
        partName: part.name,
        quantity: Math.abs(delta),
        type: delta > 0 ? 'IN' : 'OUT',
        reason: 'Ajustement manuel rapide',
        performedBy: currentUser?.name || 'Expert Cluster'
      });
      addNotification({ title: 'Inventaire mis à jour', message: `${part.name} : ${delta > 0 ? '+' : ''}${delta} unités.`, type: 'success' });
    } catch (err) {
      addNotification({ title: 'Erreur Logistique', message: 'Échec de la synchronisation du mouvement.', type: 'error' });
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
      addNotification({ title: 'Succès Catalogue', message: 'Fiche article enregistrée.', type: 'success' });
      setIsModalOpen(false);
    } catch (err) {
      addNotification({ title: 'Erreur Catalogue', message: 'Impossible de sauvegarder la pièce.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePart = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Voulez-vous supprimer cet article de l\'inventaire ?')) return;
    try {
      await deletePart(id);
      addNotification({ title: 'Article Retiré', message: 'Suppression effectuée.', type: 'info' });
      if (selectedPart?.id === id) setSelectedPart(null);
      setSelectedIds(prev => prev.filter(i => i !== id));
    } catch (err) {
      addNotification({ title: 'Erreur Cluster', message: 'Échec de la suppression.', type: 'error' });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Supprimer définitivement les ${selectedIds.length} articles sélectionnés ?`)) return;
    
    setIsSaving(true);
    try {
      await ApiService.parts.deleteBulk(selectedIds);
      addNotification({ title: 'Batch Delete', message: `${selectedIds.length} articles retirés de la base.`, type: 'success' });
      setSelectedIds([]);
      refreshAll();
    } catch (err) {
      addNotification({ title: 'Erreur Batch', message: 'Échec de l\'opération groupée.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('ALERTE : Voulez-vous VIDER TOTALEMENT l\'inventaire ? Cette action est irréversible.')) return;
    setIsSaving(true);
    try {
      const allIds = parts.map((p: Part) => p.id);
      await ApiService.parts.deleteBulk(allIds);
      addNotification({ title: 'Inventaire Purge', message: 'Tout le catalogue a été supprimé.', type: 'info' });
      refreshAll();
    } catch (err) {
      addNotification({ title: 'Erreur Purge', message: 'Échec du nettoyage.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleSelect = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredParts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredParts.map((p: Part) => p.id));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result as string;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[];
        
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
        addNotification({ title: 'Erreur Fichier', message: 'Format invalide ou corrompu.', type: 'error' });
      }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const processImport = async () => {
    if (!mapping.name || !mapping.sku) {
      addNotification({ title: 'Mapping requis', message: 'Nom et SKU sont obligatoires.', type: 'warning' });
      return;
    }

    setIsSaving(true);
    try {
      const importedParts: Part[] = rawImportData.map((row: any, i: number) => ({
        id: `PT-IMP-${Date.now()}-${i}`,
        name: String(row[mapping.name] || 'Article sans nom'),
        sku: String(row[mapping.sku] || `REF-${Date.now()}-${i}`),
        currentStock: Number(row[mapping.currentStock] || 0),
        minStock: Number(row[mapping.minStock] || 5),
        unitPrice: Number(row[mapping.unitPrice] || 0),
        location: String(row[mapping.location] || 'Magasin'),
        brand: String(row[mapping.brand] || 'Royal Plaza'),
        category: (row[mapping.category] || 'Consommable') as any
      }));

      await ApiService.parts.saveAll(importedParts);
      addNotification({ title: 'Batch Import', message: `${importedParts.length} articles synchronisés.`, type: 'success' });
      setIsMappingModalOpen(false);
      refreshAll();
    } catch (err) {
      addNotification({ title: 'Erreur Import', message: 'Échec de l\'opération massive.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="h-[80vh] flex items-center justify-center"><RefreshCw className="animate-spin text-[#3ecf8e]" size={32} /></div>;

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-sb-entry pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1c1c1c] tracking-tight">Stocks & Rechanges</h1>
          <p className="text-xs text-[#686868] mt-1 font-medium">Gestion du catalogue de composants techniques Plaza.</p>
        </div>
        <div className="flex gap-2">
          {parts.length > 0 && (
             <button onClick={handleClearAll} className="btn-sb-outline h-10 px-4 text-red-500 hover:bg-red-50 border-red-100">
               <Trash2 size={16} /> <span>Vider tout</span>
             </button>
          )}
          <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept=".xlsx, .xls, .csv" />
          <button onClick={() => fileInputRef.current?.click()} className="btn-sb-outline h-10 px-4">
             <Upload size={16} /> <span>Import Excel</span>
          </button>
          <button onClick={() => { setEditingPart(null); setIsModalOpen(true); }} className="btn-sb-primary h-10 px-4">
            <Plus size={16} /> <span>Nouvel Article</span>
          </button>
        </div>
      </header>

      {/* KPI Section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Articles Total', value: stats.totalParts, icon: <Boxes size={16}/>, color: 'text-blue-500' },
          { label: 'En Alerte', value: stats.critical, icon: <AlertTriangle size={16}/>, color: 'text-amber-500' },
          { label: 'En Rupture', value: stats.outOfStock, icon: <Zap size={16}/>, color: 'text-red-500' },
          { label: 'Valeur Totale', value: `${(stats.totalValuation / 1000000).toFixed(1)}M F`, icon: <BarChart3 size={16}/>, color: 'text-[#3ecf8e]' }
        ].map((s, i) => (
          <div key={i} className="sb-card flex items-center gap-4 py-4 px-6 border-[#ededed] shadow-sm">
             <div className={`p-2.5 bg-[#f8f9fa] rounded-xl border border-[#f5f5f5] ${s.color}`}>{s.icon}</div>
             <div>
                <p className="text-[10px] font-black text-[#686868] uppercase tracking-widest">{s.label}</p>
                <p className="text-xl font-black text-[#1c1c1c]">{s.value}</p>
             </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="relative group flex-1 w-full">
          <Search className="absolute left-3.5 top-3.5 text-[#686868]" size={18} />
          <input 
            type="text" placeholder="Recherche par désignation ou SKU..." 
            className="w-full pl-12 h-12 bg-white rounded-xl shadow-sm border-[#ededed]"
            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex bg-white p-1 rounded-xl shrink-0 border border-[#ededed] shadow-sm">
          {[
            { id: 'all', label: 'Catalogue', icon: <Layers size={14}/> },
            { id: 'critical', label: 'Alertes', icon: <AlertTriangle size={14}/> },
            { id: 'out', label: 'Ruptures', icon: <Zap size={14}/> }
          ].map(st => (
            <button 
              key={st.id} 
              onClick={() => setStockStatus(st.id as any)} 
              className={`flex items-center gap-2 px-6 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${stockStatus === st.id ? 'bg-[#1c1c1c] text-white shadow-md' : 'text-[#686868] hover:bg-[#f8f9fa]'}`}
            >
              {st.icon} {st.label}
            </button>
          ))}
        </div>
        <button onClick={refreshAll} className="btn-sb-outline h-12 px-4 rounded-xl shadow-sm">
          <RefreshCw size={18} className={isSyncing ? 'animate-spin' : ''} />
        </button>
      </div>

      {selectedIds.length > 0 && (
        <div className="bg-[#1c1c1c] text-white p-5 rounded-2xl flex items-center justify-between animate-sb-entry shadow-xl">
           <div className="flex items-center gap-5">
              <CheckCircle2 size={24} className="text-[#3ecf8e]" />
              <span className="text-sm font-black uppercase tracking-widest">{selectedIds.length} article(s) en file d'attente</span>
           </div>
           <div className="flex gap-3">
              <button onClick={() => setSelectedIds([])} className="px-5 py-2.5 text-[11px] font-black uppercase hover:bg-white/10 rounded-xl transition-colors">Désélectionner</button>
              <button onClick={handleBulkDelete} className="bg-red-500 hover:bg-red-600 px-6 py-2.5 text-[11px] font-black uppercase rounded-xl flex items-center gap-3 transition-all shadow-lg shadow-red-500/20">
                <Trash2 size={16}/> Supprimer Batch
              </button>
           </div>
        </div>
      )}

      <div className="sb-table-container shadow-sm border-[#ededed]">
        <table className="w-full text-left sb-table">
          <thead>
            <tr>
              <th className="w-10 px-5">
                <input type="checkbox" checked={selectedIds.length > 0 && selectedIds.length === filteredParts.length} onChange={toggleSelectAll} className="rounded-md border-[#ededed]" />
              </th>
              <th className="w-24">Cluster SKU</th>
              <th>Désignation & Marque</th>
              <th>Emplacement</th>
              <th className="text-center">Quantité</th>
              <th className="text-right">Unitaire</th>
              <th className="text-right px-5">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredParts.map((p: Part) => (
              <tr key={p.id} onClick={() => setSelectedPart(p)} className={`cursor-pointer group hover:bg-[#fafafa] ${selectedIds.includes(p.id) ? 'bg-[#f0fdf4]/50' : ''}`}>
                <td className="px-5" onClick={e => e.stopPropagation()}>
                  <input type="checkbox" checked={selectedIds.includes(p.id)} onChange={(e: React.ChangeEvent<HTMLInputElement>) => toggleSelect(p.id, e)} className="rounded-md border-[#ededed]" />
                </td>
                <td className="font-mono text-[10px] font-black text-[#686868] uppercase tracking-tighter">{p.sku}</td>
                <td className="py-5">
                  <p className="text-[13px] font-black text-[#1c1c1c]">{p.name}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-[9px] font-black text-[#3ecf8e] uppercase tracking-tighter bg-[#f0fdf4] px-1.5 rounded-sm border border-[#dcfce7]">{p.brand}</span>
                    <span className="text-[9px] text-[#686868] font-bold">• {p.category}</span>
                  </div>
                </td>
                <td>
                  <div className="flex items-center gap-1.5 text-[#686868] font-bold">
                    <MapPin size={12} className="text-[#3ecf8e]" />
                    <span className="text-[11px]">{p.location}</span>
                  </div>
                </td>
                <td onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-center gap-4">
                     <button 
                      onClick={() => handleAdjustStock(p.id, -1)} 
                      className="w-8 h-8 rounded-lg bg-white border border-[#ededed] flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-all shadow-sm"
                     >
                        <Minus size={14}/>
                     </button>
                     <span className={`text-[15px] font-black min-w-[32px] text-center ${p.currentStock <= p.minStock ? 'text-red-500' : 'text-[#1c1c1c]'}`}>
                        {p.currentStock}
                     </span>
                     <button 
                      onClick={() => handleAdjustStock(p.id, 1)} 
                      className="w-8 h-8 rounded-lg bg-white border border-[#ededed] flex items-center justify-center hover:bg-[#f0fdf4] hover:text-[#3ecf8e] transition-all shadow-sm"
                     >
                        <Plus size={14}/>
                     </button>
                  </div>
                </td>
                <td className="text-right font-mono text-[13px] font-black text-[#1c1c1c]">
                  {p.unitPrice.toLocaleString()} F
                </td>
                <td className="text-right px-5">
                   <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setEditingPart(p); setIsModalOpen(true); }}
                        className="p-2 text-[#686868] hover:text-[#3ecf8e] border border-[#ededed] rounded-lg bg-white transition-colors"
                      >
                        <Edit3 size={15}/>
                      </button>
                      <button 
                        onClick={(e) => handleDeletePart(p.id, e)}
                        className="p-2 text-[#686868] hover:text-red-500 border border-[#ededed] rounded-lg bg-white transition-colors"
                      >
                        <Trash2 size={15}/>
                      </button>
                   </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingPart ? "Correction Fiche Article" : "Intégration Catalogue Rechanges"}>
        <form onSubmit={handleSavePart} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-[#686868] uppercase tracking-widest">Désignation Technique</label>
              <input name="name" type="text" defaultValue={editingPart?.name} placeholder="ex: Compresseur Inverter 12k" required className="w-full h-11 px-4 rounded-xl border-[#ededed]" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-[#686868] uppercase tracking-widest">Code SKU Cluster</label>
              <input name="sku" type="text" defaultValue={editingPart?.sku} placeholder="ex: PART-LG-INV-01" required className="w-full h-11 px-4 rounded-xl border-[#ededed]" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-[#686868] uppercase tracking-widest">Marque Certifiée</label>
              <select name="brand" defaultValue={editingPart?.brand || 'LG'} className="w-full h-11 px-4 rounded-xl border-[#ededed]">
                 {(brands || []).map((b: string) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-[#686868] uppercase tracking-widest">Filière Technique</label>
              <select name="category" defaultValue={editingPart?.category || 'Mécanique'} className="w-full h-11 px-4 rounded-xl border-[#ededed]">
                <option value="Électronique">Électronique</option>
                <option value="Mécanique">Mécanique</option>
                <option value="Consommable">Consommable</option>
                <option value="Accessoire">Accessoire</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-[#686868] uppercase tracking-widest">Stock Initiale</label>
              <input name="currentStock" type="number" defaultValue={editingPart?.currentStock || 0} required className="w-full h-11 px-4 rounded-xl border-[#ededed]" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-[#686868] uppercase tracking-widest">Seuil d'Alerte SLA</label>
              <input name="minStock" type="number" defaultValue={editingPart?.minStock || 5} required className="w-full h-11 px-4 rounded-xl border-[#ededed]" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-[#686868] uppercase tracking-widest">Prix de Cession (F CFA)</label>
              <input name="unitPrice" type="number" defaultValue={editingPart?.unitPrice || 0} required className="w-full h-11 px-4 rounded-xl border-[#ededed]" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-[#686868] uppercase tracking-widest">Emplacement Logistique</label>
              <input name="location" type="text" defaultValue={editingPart?.location} placeholder="ex: Zone A1 - BDM" required className="w-full h-11 px-4 rounded-xl border-[#ededed]" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-8 border-t border-[#f5f5f5]">
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn-sb-outline h-12 px-8 text-[11px] font-black uppercase rounded-xl">Annuler</button>
            <button type="submit" disabled={isSaving} className="btn-sb-primary h-12 px-12 text-[11px] font-black uppercase rounded-xl shadow-lg shadow-[#3ecf8e]/20">
              {isSaving ? <RefreshCw className="animate-spin" size={16}/> : 'Enregistrer Article'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isMappingModalOpen} onClose={() => setIsMappingModalOpen(false)} title="Intelligence d'Importation" size="lg">
        <div className="space-y-8">
           <div className="flex items-start gap-5 p-6 bg-[#f0f9f4] border border-[#dcfce7] rounded-2xl shadow-sm">
              <CheckCircle2 className="text-[#3ecf8e] mt-1 shrink-0" size={24}/>
              <div>
                 <p className="text-sm font-black text-[#1c1c1c] uppercase tracking-tight">Fichier Structurel Analysé</p>
                 <p className="text-xs text-[#686868] font-bold mt-1">Veuillez mapper les champs Excel vers le kernel Plaza.</p>
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
              {[
                { key: 'name', label: 'Désignation', req: true },
                { key: 'sku', label: 'Identifiant SKU', req: true },
                { key: 'currentStock', label: 'Quantité Live', req: false },
                { key: 'unitPrice', label: 'P.U. Cession', req: false },
                { key: 'location', label: 'Emplacement', req: false },
                { key: 'brand', label: 'Marque', req: false },
                { key: 'category', label: 'Catégorie', req: false },
                { key: 'minStock', label: 'Seuil Alerte', req: false },
              ].map((field: any) => (
                <div key={field.key} className="space-y-1.5">
                   <label className="text-[10px] font-black text-[#686868] uppercase tracking-widest flex items-center justify-between">
                      <span>{field.label} {field.req && <span className="text-red-500">*</span>}</span>
                   </label>
                   <select 
                    className={`w-full h-11 px-4 rounded-xl font-bold border-[#ededed] ${mapping[field.key] ? 'border-[#3ecf8e] bg-[#f0fdf4]/50' : ''}`}
                    value={mapping[field.key]}
                    onChange={e => setMapping({...mapping, [field.key]: e.target.value})}
                   >
                      <option value="">-- Ignorer --</option>
                      {fileHeaders.map((h: string) => <option key={h} value={h}>{h}</option>)}
                   </select>
                </div>
              ))}
           </div>

           <div className="flex justify-end gap-3 pt-8 border-t border-[#f5f5f5]">
              <button onClick={() => setIsMappingModalOpen(false)} className="btn-sb-outline h-12 px-8 rounded-xl text-[11px] font-black uppercase tracking-widest">Abandonner</button>
              <button 
                onClick={processImport} 
                disabled={isSaving || !mapping.name || !mapping.sku} 
                className="btn-sb-primary h-12 px-12 rounded-xl shadow-lg shadow-[#3ecf8e]/20 text-[11px] font-black uppercase tracking-widest"
              >
                {isSaving ? <RefreshCw className="animate-spin" size={16}/> : <>Synchroniser {rawImportData.length} articles <ArrowRight size={16} className="ml-2"/></>}
              </button>
           </div>
        </div>
      </Modal>

      <Drawer isOpen={!!selectedPart} onClose={() => setSelectedPart(null)} title="Contrôle d'Inventaire" icon={<Package size={18}/>}>
        {selectedPart && (
          <div className="space-y-8 animate-sb-entry pb-10">
            <div className="p-10 bg-[#f8f9fa] border border-[#ededed] rounded-3xl flex flex-col items-center text-center shadow-sm relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-[#3ecf8e]/5 rounded-full blur-3xl -mr-16 -mt-16" />
               <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center text-[#3ecf8e] shadow-xl mb-6 border border-[#ededed] relative z-10">
                  <Package size={48} />
               </div>
               <h3 className="text-2xl font-black text-[#1c1c1c] tracking-tight relative z-10">{selectedPart.name}</h3>
               <p className="text-[11px] text-[#686868] font-black uppercase tracking-[0.3em] mt-2 relative z-10">SKU: {selectedPart.sku}</p>
               <div className="mt-6 flex gap-3 relative z-10">
                  <span className="px-4 py-1.5 bg-white border border-[#ededed] text-[10px] font-black uppercase rounded-xl shadow-sm text-[#1c1c1c]">{selectedPart.brand}</span>
                  <span className="px-4 py-1.5 bg-white border border-[#ededed] text-[10px] font-black uppercase rounded-xl shadow-sm text-[#1c1c1c]">{selectedPart.category}</span>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-6 bg-white border border-[#ededed] rounded-2xl shadow-sm space-y-2">
                 <p className="text-[10px] font-black text-[#686868] uppercase tracking-widest">État du Stock</p>
                 <div className="flex items-baseline gap-2">
                    <p className={`text-3xl font-black ${selectedPart.currentStock <= selectedPart.minStock ? 'text-red-500' : 'text-[#3ecf8e]'}`}>
                      {selectedPart.currentStock}
                    </p>
                    <span className="text-[11px] font-black text-[#686868] uppercase opacity-70">Unités</span>
                 </div>
                 <p className="text-[10px] text-[#686868] font-bold italic">Seuil critique: {selectedPart.minStock}</p>
              </div>
              <div className="p-6 bg-white border border-[#ededed] rounded-2xl shadow-sm space-y-2">
                 <p className="text-[10px] font-black text-[#686868] uppercase tracking-widest">Valeur Entrepôt</p>
                 <p className="text-xl font-black text-[#1c1c1c] font-mono tracking-tight">
                    {(selectedPart.currentStock * selectedPart.unitPrice).toLocaleString()} F
                 </p>
                 <p className="text-[10px] text-[#3ecf8e] font-black uppercase tracking-tighter">P.U. {selectedPart.unitPrice.toLocaleString()} F</p>
              </div>
            </div>

            <div className="space-y-4">
               <h4 className="text-[11px] font-black text-[#686868] uppercase tracking-widest border-b border-[#f5f5f5] pb-3">Localisation Cluster</h4>
               <div className="p-5 bg-[#fcfcfc] border border-[#ededed] rounded-2xl flex items-center gap-4 group">
                  <div className="w-10 h-10 rounded-xl bg-white border border-[#ededed] flex items-center justify-center text-[#3ecf8e] group-hover:scale-110 transition-transform"><MapPin size={20}/></div>
                  <div>
                    <p className="text-[14px] font-black text-[#1c1c1c]">{selectedPart.location}</p>
                    <p className="text-[10px] text-[#686868] font-black uppercase tracking-widest mt-0.5">Entrepôt Central Royal Plaza</p>
                  </div>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-8">
               <button 
                onClick={() => { setEditingPart(selectedPart); setIsModalOpen(true); }}
                className="btn-sb-outline h-14 justify-center font-black uppercase text-[11px] tracking-widest rounded-2xl"
               >
                  <Edit3 size={18}/><span>Ajuster Fiche</span>
               </button>
               <button 
                onClick={(e) => handleDeletePart(selectedPart.id, e)}
                className="btn-sb-outline h-14 justify-center font-black uppercase text-[11px] tracking-widest text-red-500 hover:bg-red-50 border-red-100 rounded-2xl"
               >
                  <Trash2 size={18}/><span>Supprimer</span>
               </button>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default PartsInventory;
