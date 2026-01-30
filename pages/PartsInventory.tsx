
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Package, Search, Plus, RefreshCw, Edit3, Trash2, Save, Loader2,
  MapPin, AlertCircle, ArrowUpRight, Minus, Layers, DollarSign,
  Activity, Hash, Tag, ChevronRight, Info, History, ShieldCheck, Box, X,
  FileUp, Download, CheckCircle2, Square, CheckSquare, AlertTriangle,
  ArrowRight, FileSpreadsheet, SlidersHorizontal, LayoutGrid, BarChart3,
  TrendingDown, Zap, Archive, FilterX, RotateCcw, ListFilter, Boxes, MapPinned,
  ChevronDown, ChevronUp
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Part, StockMovement } from '../types';
import { useNotifications, useData, useUser } from '../App';
import { ApiService } from '../services/apiService';
import Modal from '../components/Modal';
import Drawer from '../components/Drawer';

const PartsInventory: React.FC = () => {
  const { parts, brands, isLoading, refreshAll, addStockMovement, deletePart, deletePartsBulk } = useData();
  const { currentUser } = useUser();
  const { addNotification } = useNotifications();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<string>('Tous');
  const [selectedCategory, setSelectedCategory] = useState<string>('Toutes');
  const [selectedLocation, setSelectedLocation] = useState<string>('Tous');
  const [stockStatus, setStockStatus] = useState<'all' | 'critical' | 'out'>('all');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMappingModalOpen, setIsMappingModalOpen] = useState(false);
  const [editingPart, setEditingPart] = useState<Part | null>(null);
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
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
      const matchesLocation = selectedLocation === 'Tous' || p.location === selectedLocation;
      
      let matchesStatus = true;
      if (stockStatus === 'critical') matchesStatus = p.currentStock <= p.minStock && p.currentStock > 0;
      if (stockStatus === 'out') matchesStatus = p.currentStock === 0;

      return matchesSearch && matchesBrand && matchesCategory && matchesLocation && matchesStatus;
    }).sort((a, b) => {
       if (a.currentStock === 0 && b.currentStock !== 0) return -1;
       return a.name.localeCompare(b.name);
    }); 
  }, [searchTerm, selectedBrand, selectedCategory, selectedLocation, stockStatus, parts]);

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
    addNotification({ title: 'Mouvement Stock', message: `Mise à jour Cloud Horizon : ${part.name} (${delta > 0 ? '+' : ''}${delta})`, type: 'info' });
  };

  /**
   * Enregistre ou met à jour une pièce dans l'inventaire.
   */
  const handleSavePart = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const partData: Part = {
      id: editingPart?.id || `PT-${Math.floor(1000 + Math.random() * 9000)}`,
      name: formData.get('name') as string,
      sku: formData.get('sku') as string,
      brand: formData.get('brand') as string,
      category: (formData.get('category') as any) || 'Consommable',
      currentStock: Number(formData.get('currentStock')) || 0,
      minStock: Number(formData.get('minStock')) || 0,
      unitPrice: Number(formData.get('unitPrice')) || 0,
      location: formData.get('location') as string,
    };

    try {
      await ApiService.parts.saveAll([partData]);
      await refreshAll();
      setIsModalOpen(false);
      setEditingPart(null);
      addNotification({ title: 'Inventaire', message: 'Fiche article synchronisée.', type: 'success' });
    } catch (err) {
      addNotification({ title: 'Erreur', message: 'Échec de la sauvegarde Cloud.', type: 'error' });
    }
  };

  if (isLoading) return <div className="h-[80vh] flex items-center justify-center"><RefreshCw className="animate-spin text-[#1a73e8]" size={32} /></div>;

  return (
    <div className="space-y-8 animate-page-entry pb-32">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-light text-[#202124]">Pièces & Rechanges</h1>
          <p className="text-[10px] text-[#5f6368] font-black uppercase tracking-widest mt-1">Management global de l'inventaire Royal Plaza Horizon</p>
        </div>
        <div className="flex items-center gap-3">
           <button onClick={() => { setEditingPart(null); setIsModalOpen(true); }} className="btn-google-primary h-11 px-6 shadow-xl shadow-blue-600/10" title="Référencer un nouveau composant ou pièce détachée">
             <Plus size={20} /> <span>Nouvelle Référence</span>
           </button>
           <button onClick={refreshAll} className="btn-google-outlined h-11 px-4" title="Actualiser les niveaux de stock"><RefreshCw size={18} /></button>
        </div>
      </header>

      {/* KPI GRID */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
         {[
           { label: 'Catalogue Actif', value: inventoryStats.totalRefs, icon: <Layers size={20}/>, color: '#1a73e8', title: "Nombre total de pièces référencées" },
           { label: 'Flux Critique', value: inventoryStats.lowStockCount, icon: <TrendingDown size={20}/>, color: '#f9ab00', title: "Articles sous le seuil d'alerte" },
           { label: 'Ruptures Totales', value: inventoryStats.outOfStockCount, icon: <Zap size={20}/>, color: '#d93025', title: "Articles épuisés" },
           { label: 'Valorisation Stock', value: `${(inventoryStats.totalValue / 1000000).toFixed(1)}M`, icon: <BarChart3 size={20}/>, color: '#188038', title: "Valeur marchande totale de l'inventaire HT" }
         ].map((stat, i) => (
           <div key={i} className="stats-card border-l-4 border-none shadow-xl bg-white ring-1 ring-black/5" style={{ borderLeft: `4px solid ${stat.color}` }} title={stat.title}>
              <div className="flex justify-between items-start">
                 <div>
                    <p className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest mb-1">{stat.label}</p>
                    <h3 className="text-3xl font-bold text-[#202124] tracking-tighter">{stat.value}</h3>
                 </div>
                 <div className="p-2.5 bg-gray-50 text-gray-400">{stat.icon}</div>
              </div>
           </div>
         ))}
      </div>

      {/* SEARCH & FILTERS */}
      <div className="google-card overflow-hidden border-none shadow-xl bg-white ring-1 ring-black/5 p-8">
        <div className="flex flex-col xl:flex-row gap-6">
           <div className="relative flex-1 group" title="Recherche par désignation ou référence fabriquant">
              <Search className="absolute left-6 top-5 text-[#9aa0a6] group-focus-within:text-[#1a73e8] transition-colors" size={24} />
              <input 
                type="text" 
                placeholder="Rechercher une pièce par désignation, référence SKU..." 
                className="w-full pl-16 h-16 bg-[#f8f9fa] border-none text-base font-bold shadow-inner transition-all focus:bg-white focus:ring-2 focus:ring-blue-100" 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
              />
           </div>
           <div className="flex items-center gap-4">
              <div className="flex bg-[#f1f3f4] p-1 shadow-inner">
                 {[
                   { id: 'all', label: 'Tout', title: "Voir tout le catalogue" },
                   { id: 'critical', label: 'Alertes', title: "Voir uniquement les pièces à commander" },
                   { id: 'out', label: 'Ruptures', title: "Voir les articles hors stock" }
                 ].map(st => (
                   <button 
                     key={st.id} 
                     onClick={() => setStockStatus(st.id as any)}
                     className={`px-8 py-3.5 text-[10px] font-black uppercase tracking-widest transition-all ${stockStatus === st.id ? 'bg-white text-[#1a73e8] shadow-md' : 'text-[#5f6368] hover:text-[#202124]'}`}
                     title={st.title}
                   >
                     {st.label}
                   </button>
                 ))}
              </div>
           </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="google-card overflow-hidden border-none shadow-xl bg-white ring-1 ring-black/5">
         <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
               <thead>
                  <tr className="border-b border-[#dadce0] bg-[#f8f9fa] text-[#5f6368] text-[9px] font-black uppercase tracking-[0.2em]">
                     <th className="px-10 py-6">Article & Identification</th>
                     <th className="px-10 py-6">Constructeur</th>
                     <th className="px-10 py-6 text-center">Contrôle Stock</th>
                     <th className="px-10 py-6 text-center">Indicateur</th>
                     <th className="px-10 py-6 text-right">Actions</th>
               </tr>
            </thead>
            <tbody className="divide-y divide-[#dadce0]">
               {filteredParts.map((p) => {
                 const isCrit = p.currentStock <= p.minStock && p.currentStock > 0;
                 const isOut = p.currentStock === 0;
                 return (
                   <tr key={p.id} onClick={() => setSelectedPart(p)} className="hover:bg-[#f8faff] transition-colors group cursor-pointer bg-white" title={`Inspecter la fiche de: ${p.name}`}>
                     <td className="px-10 py-6">
                        <div className="flex items-center gap-5">
                           <div className={`w-12 h-12 flex items-center justify-center border ${isOut ? 'bg-red-50 text-red-300' : 'bg-gray-50 text-gray-400 group-hover:text-blue-600'} transition-colors`}>
                             <Package size={24} />
                           </div>
                           <div>
                              <p className="text-sm font-black text-[#3c4043] group-hover:text-[#1a73e8] transition-colors leading-tight">{p.name}</p>
                              <p className="text-[10px] font-mono text-[#9aa0a6] mt-1.5 font-bold uppercase tracking-widest">SKU: {p.sku}</p>
                           </div>
                        </div>
                     </td>
                     <td className="px-10 py-6">
                        <span className="text-[10px] font-black text-[#5f6368] uppercase bg-gray-100 px-3 py-1 border border-gray-200" title={`Constructeur: ${p.brand}`}>{p.brand}</span>
                     </td>
                     <td className="px-10 py-6" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-6">
                           <button onClick={() => handleAdjustStock(p.id, -1)} className="w-10 h-10 border border-[#dadce0] flex items-center justify-center hover:bg-red-50 hover:text-red-600 transition-all shadow-sm" title="Diminuer le stock de 1 unité (Sortie directe)"><Minus size={18} /></button>
                           <span className={`text-2xl font-black min-w-[50px] text-center tracking-tighter ${isOut ? 'text-red-600' : isCrit ? 'text-[#f9ab00]' : 'text-[#202124]'}`} title="Quantité actuelle en magasin">{p.currentStock}</span>
                           <button onClick={() => handleAdjustStock(p.id, 1)} className="w-10 h-10 border border-[#dadce0] flex items-center justify-center hover:bg-blue-50 hover:text-blue-600 transition-all shadow-sm" title="Augmenter le stock de 1 unité (Entrée directe)"><Plus size={18} /></button>
                        </div>
                     </td>
                     <td className="px-10 py-6 text-center">
                        <div className="inline-flex items-center gap-3 px-5 py-2 border border-[#dadce0] bg-white shadow-sm" title={`État logistique: ${isOut ? 'RUPTURE' : isCrit ? 'ALERTE' : 'DISPONIBLE'}`}>
                           <div className={`w-2 h-2 rounded-full ${isOut ? 'bg-red-600 animate-pulse' : isCrit ? 'bg-[#f9ab00]' : 'bg-[#188038]'}`} />
                           <span className="text-[10px] font-black uppercase tracking-widest text-[#5f6368]">{isOut ? 'RUPTURE' : isCrit ? 'ALERTE' : 'DISPONIBLE'}</span>
                        </div>
                     </td>
                     <td className="px-10 py-6 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                           <button onClick={(e) => { e.stopPropagation(); setEditingPart(p); setIsModalOpen(true); }} className="p-2.5 bg-white border border-[#dadce0] hover:border-[#1a73e8] text-[#1a73e8] transition-colors shadow-sm" title="Modifier la référence technique"><Edit3 size={18}/></button>
                           <button onClick={(e) => { e.stopPropagation(); if(window.confirm('Supprimer cet article ?')) deletePart(p.id); }} className="p-2.5 bg-white border border-[#dadce0] hover:border-red-600 text-red-600 transition-colors shadow-sm" title="Supprimer définitivement l'article"><Trash2 size={18}/></button>
                        </div>
                     </td>
                   </tr>
                 );
               })}
            </tbody>
         </table>
      </div>
    </div>

      <Drawer isOpen={!!selectedPart} onClose={() => setSelectedPart(null)} title="Audit Fiche Pièce" icon={<Package size={20}/>} subtitle={`Réf. ${selectedPart?.sku}`}>
         {selectedPart && (
            <div className="space-y-12 pb-20">
               <section className="flex flex-col md:flex-row items-start gap-10">
                  <div className="w-32 h-32 bg-[#f8f9fa] border border-[#dadce0] flex items-center justify-center text-[#1a73e8] shrink-0 shadow-inner">
                    <Package size={64} />
                  </div>
                  <div className="space-y-4">
                     <span className="text-[10px] font-black text-[#1a73e8] uppercase tracking-[0.3em] bg-blue-50 px-3 py-1 border border-blue-100">{selectedPart.brand}</span>
                     <h3 className="text-3xl font-black text-[#202124] leading-none tracking-tighter uppercase">{selectedPart.name}</h3>
                     <div className="flex items-center gap-6 pt-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-[#5f6368]" title="Emplacement physique dans l'entrepôt">
                           <MapPin size={16} className="text-[#1a73e8]" /> {selectedPart.location}
                        </div>
                        <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#9aa0a6]" title="Catégorie de composant">
                           <Tag size={16} /> {selectedPart.category}
                        </div>
                     </div>
                  </div>
               </section>

               <div className="grid grid-cols-2 gap-6">
                  <div className="p-8 bg-white border border-[#dadce0] shadow-sm space-y-6" title="Indicateurs de seuils de commande">
                     <h4 className="text-[10px] font-black text-[#9aa0a6] uppercase tracking-[0.2em] flex items-center gap-2"><Activity size={16} className="text-[#1a73e8]" /> État Stocks</h4>
                     <div className="flex justify-between items-end">
                        <div>
                           <p className="text-4xl font-black text-[#202124] tracking-tighter">{selectedPart.currentStock}</p>
                           <p className="text-[10px] font-bold text-gray-400 uppercase mt-1">Disponibles</p>
                        </div>
                        <div className="text-right">
                           <p className="text-xl font-bold text-[#5f6368]">{selectedPart.minStock}</p>
                           <p className="text-[10px] font-bold text-gray-400 uppercase mt-1">Seuil Alerte</p>
                        </div>
                     </div>
                  </div>
                  <div className="p-8 bg-gradient-to-br from-white to-green-50 border border-green-100 shadow-sm space-y-6" title="Estimation financière de l'actif immobilisé">
                     <h4 className="text-[10px] font-black text-green-700 uppercase tracking-[0.2em] flex items-center gap-2"><DollarSign size={16} /> Valorisation</h4>
                     <div>
                        <p className="text-3xl font-black text-green-900 tracking-tighter">{(selectedPart.unitPrice * selectedPart.currentStock).toLocaleString()} F</p>
                        <p className="text-[10px] font-bold text-green-600 uppercase mt-1">Valeur Actuelle HT</p>
                     </div>
                  </div>
               </div>
            </div>
         )}
      </Drawer>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingPart ? 'Modification Référence' : 'Création Fiche Article'} size="lg">
         <form onSubmit={handleSavePart} className="space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-[#5f6368] tracking-widest ml-1">Désignation</label>
                  <input name="name" type="text" defaultValue={editingPart?.name} required className="w-full bg-[#f8f9fa] border-none font-bold h-12" title="Nom technique de la pièce" />
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-[#5f6368] tracking-widest ml-1">SKU Unique</label>
                  <input name="sku" type="text" defaultValue={editingPart?.sku} required className="w-full bg-[#f8f9fa] border-none font-black font-mono uppercase h-12" title="Référence constructeur ou interne unique" />
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-[#5f6368] tracking-widest ml-1">Constructeur</label>
                  <select name="brand" defaultValue={editingPart?.brand || 'LG'} className="w-full bg-[#f8f9fa] border-none font-black h-12" title="Marque de la pièce">
                    {brands.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-[#5f6368] tracking-widest ml-1">Catégorie</label>
                  <select name="category" defaultValue={editingPart?.category || 'Consommable'} className="w-full bg-[#f8f9fa] border-none font-black h-12" title="Type de pièce">
                    <option value="Électronique">Électronique</option>
                    <option value="Mécanique">Mécanique</option>
                    <option value="Consommable">Consommable</option>
                    <option value="Accessoire">Accessoire</option>
                  </select>
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-[#5f6368] tracking-widest ml-1">Stock Actuel</label>
                  <input name="currentStock" type="number" defaultValue={editingPart?.currentStock || 0} required className="w-full bg-[#f8f9fa] border-none font-bold h-12" title="Quantité physiquement présente" />
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-[#5f6368] tracking-widest ml-1">Seuil Alerte</label>
                  <input name="minStock" type="number" defaultValue={editingPart?.minStock || 5} required className="w-full bg-[#f8f9fa] border-none font-bold h-12" title="Niveau déclenchant une alerte de réapprovisionnement" />
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-[#5f6368] tracking-widest ml-1">Prix Unitaire (F)</label>
                  <input name="unitPrice" type="number" defaultValue={editingPart?.unitPrice || 0} required className="w-full bg-[#f8f9fa] border-none font-bold h-12" title="Prix d'achat unitaire HT" />
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-[#5f6368] tracking-widest ml-1">Position Rayon</label>
                  <input name="location" type="text" defaultValue={editingPart?.location || 'Stock Central'} required className="w-full bg-[#f8f9fa] border-none font-bold h-12" title="Coordonnées de l'emplacement de stockage" />
               </div>
            </div>
            <div className="flex gap-4 pt-8 border-t border-[#dadce0]">
               <button type="submit" className="flex-1 btn-google-primary justify-center py-5 text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-blue-600/20" title="Valider et synchroniser la pièce avec le cloud"><Save size={20} /> Certifier la fiche</button>
               <button type="button" onClick={() => setIsModalOpen(false)} className="btn-google-outlined px-12 font-black uppercase text-[10px] tracking-widest" title="Annuler sans sauvegarder">Annuler</button>
            </div>
         </form>
      </Modal>
    </div>
  );
};

export default PartsInventory;
