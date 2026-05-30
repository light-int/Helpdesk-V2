import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Package, RefreshCw, Filter, X, BadgeCheck, Clock, AlertTriangle, Upload, ArrowRight, CheckCircle2, Trash2, Plus, Edit3, Save, ChevronDown, ChevronLeft, LayoutGrid, List } from 'lucide-react';
import { useData, useNotifications } from '../App';
import { Product } from '../types';
import Drawer from '../components/Drawer';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import { SkeletonCard } from '../components/Skeleton';
import { ApiService } from '../services/apiService';
import * as XLSX from 'xlsx';

const Products: React.FC = () => {
  const { products, brands, isLoading, refreshAll, isSyncing } = (() => { try { return useData(); } catch { return { products: [], brands: [], isLoading: false, refreshAll: () => { }, isSyncing: false }; } })();

  const [searchTerm, setSearchTerm] = useState('');
  const [brandFilter, setBrandFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Sort state
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'warranty'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 24;

  // Create/Edit product modal
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({ name: '', reference: '', brand: '', category: '', subcategory: '', price: 0, purchasePrice: 0, warrantyMonths: 0, supplier: '', stockStatus: 'En stock' as string, description: '' });

  // Bulk delete state
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<{ ids: string[] } | null>(null);

  // Mapping Import State
  const [isMappingModalOpen, setIsMappingModalOpen] = useState(false);
  const [rawImportData, setRawImportData] = useState<any[]>([]);
  const [fileHeaders, setFileHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({
    name: '', reference: '', brand: '', category: '',
    price: '', purchasePrice: '', warrantyMonths: '', supplier: '',
    stockStatus: '', subcategory: '', description: ''
  });
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addNotification } = (() => { try { return useNotifications(); } catch { return { addNotification: () => {} }; } })();

  const handleBulkDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await ApiService.products.deleteBulk(deleteConfirm.ids);
      addNotification({ title: 'Suppression', message: `${deleteConfirm.ids.length} produit(s) supprimé(s).`, type: 'success' });
      setSelectedProductIds([]);
      setSelectedProduct(null);
      refreshAll();
    } catch {
      addNotification({ title: 'Erreur', message: 'Échec de la suppression.', type: 'error' });
    } finally {
      setDeleteConfirm(null);
    }
  };

  const toggleSelectAll = () => {
    if (selectedProductIds.length === paginatedProducts.length) setSelectedProductIds([]);
    else setSelectedProductIds(paginatedProducts.map((p: Product) => p.id));
  };

  const toggleSelectProduct = (id: string) => {
    setSelectedProductIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const openNewProduct = () => {
    setEditingProduct(null);
    setForm({ name: '', reference: '', brand: '', category: '', subcategory: '', price: 0, purchasePrice: 0, warrantyMonths: 0, supplier: '', stockStatus: 'En stock', description: '' });
    setIsProductModalOpen(true);
  };

  const openEditProduct = (p: Product, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingProduct(p);
    setForm({
      name: p.name, reference: p.reference, brand: p.brand, category: p.category,
      subcategory: p.subcategory || '', price: p.price, purchasePrice: p.purchasePrice || 0,
      warrantyMonths: p.warrantyMonths, supplier: p.supplier || '',
      stockStatus: p.stockStatus || 'En stock', description: p.description || '',
    });
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = async () => {
    if (!form.name || !form.reference) {
      addNotification({ title: 'Champs requis', message: 'Nom et Référence sont obligatoires.', type: 'warning' });
      return;
    }
    setIsSaving(true);
    try {
      const product: Product = {
        id: editingProduct?.id || `PR-${Date.now()}`,
        name: form.name,
        reference: form.reference,
        brand: form.brand || 'Générique',
        category: form.category || 'General',
        price: Number(form.price) || 0,
        warrantyMonths: Number(form.warrantyMonths) || 0,
        purchasePrice: Number(form.purchasePrice) || undefined,
        supplier: form.supplier || undefined,
        stockStatus: form.stockStatus as any || undefined,
        subcategory: form.subcategory || undefined,
        description: form.description || undefined,
      };
      await ApiService.products.saveAll([product]);
      addNotification({ title: editingProduct ? 'Produit modifié' : 'Produit créé', message: `${product.name} — OK.`, type: 'success' });
      setIsProductModalOpen(false);
      setSelectedProduct(null);
      refreshAll();
    } catch (err: any) {
      addNotification({ title: 'Erreur', message: err?.message || 'Échec de l\'enregistrement.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProduct = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await ApiService.products.delete(id);
      addNotification({ title: 'Supprimé', message: 'Produit supprimé.', type: 'success' });
      if (selectedProduct?.id === id) setSelectedProduct(null);
      refreshAll();
    } catch {
      addNotification({ title: 'Erreur', message: 'Échec de la suppression.', type: 'error' });
    }
  };

  const toggleSort = (field: typeof sortBy) => {
    if (sortBy === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortDir('asc'); }
  };

  const sortOptions = [
    { value: 'name', label: 'Nom' },
    { value: 'price', label: 'Prix' },
    { value: 'warranty', label: 'Garantie' },
  ] as const;

  const categories = useMemo(() => {
    const cats = new Set((products || []).map((p: Product) => p.category).filter(Boolean));
    return Array.from(cats).sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    return (products || [])
      .filter((p: Product) => {
        const q = searchTerm.toLowerCase();
        if (q && !p.name.toLowerCase().includes(q) && !p.brand.toLowerCase().includes(q) && !p.reference.toLowerCase().includes(q)) return false;
        if (brandFilter && p.brand !== brandFilter) return false;
        if (categoryFilter && p.category !== categoryFilter) return false;
        return true;
      })
      .sort((a: Product, b: Product) => {
        const dir = sortDir === 'asc' ? 1 : -1;
        if (sortBy === 'price') return (a.price - b.price) * dir;
        if (sortBy === 'warranty') return (a.warrantyMonths - b.warrantyMonths) * dir;
        return a.name.localeCompare(b.name) * dir;
      });
  }, [products, searchTerm, brandFilter, categoryFilter, sortBy, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedProducts = useMemo(() => {
    return filteredProducts.slice((safePage - 1) * pageSize, safePage * pageSize);
  }, [filteredProducts, safePage, pageSize]);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, brandFilter, categoryFilter, sortBy, sortDir]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isCSV = file.name.toLowerCase().endsWith('.csv');
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        let wb;
        if (isCSV) {
          const text = evt.target?.result as string;
          wb = XLSX.read(text, { type: 'string', raw: true });
        } else {
          const data = new Uint8Array(evt.target?.result as ArrayBuffer);
          wb = XLSX.read(data, { type: 'array', raw: true });
        }
        if (!wb.SheetNames || wb.SheetNames.length === 0) throw new Error('Aucune feuille trouvée');
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        if (!ws) throw new Error('Feuille vide');
        const rawData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as any[][];
        if (rawData.length < 2) throw new Error('Fichier sans données');
        const headers = (rawData[0] as string[]).map(h => String(h || '').trim());
        const dataRows = rawData.slice(1).filter((r: any[]) => r.some((c: any) => String(c || '').trim()));
        if (dataRows.length === 0) throw new Error('Aucune ligne de données valide');
        setFileHeaders(headers);
        const newMapping = { ...mapping };
        headers.forEach(h => {
          const low = h.toLowerCase();
          if (low.includes('nom') || low.includes('name') || low.includes('désignation')) newMapping.name = h;
          if (low.includes('réf') || low.includes('ref') || low.includes('reference') || low.includes('sku')) newMapping.reference = h;
          if (low.includes('marque') || low.includes('brand')) newMapping.brand = h;
          if (low.includes('cat')) newMapping.category = h;
          if (low.includes('prix') || low.includes('price')) { if (!newMapping.purchasePrice && low.includes('achat') || low.includes('cost') || low.includes('coût')) newMapping.purchasePrice = h; else newMapping.price = h; }
          if (low.includes('garantie') || low.includes('warranty')) newMapping.warrantyMonths = h;
          if (low.includes('fournisseur') || low.includes('supplier')) newMapping.supplier = h;
          if (low.includes('stock')) { if (low.includes('status') || low.includes('état')) newMapping.stockStatus = h; }
          if (low.includes('sous-cat') || low.includes('subcat')) newMapping.subcategory = h;
          if (low.includes('description') || low.includes('desc')) newMapping.description = h;
        });
        setMapping(newMapping);
        const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
        setRawImportData(dataRows.length > 0 && headers.length > 0
          ? dataRows.map((r: any[]) => headers.reduce((obj: any, h, i) => { obj[h] = r[i]; return obj; }, {}))
          : rows);
        setIsMappingModalOpen(true);
      } catch (err: any) {
        console.error('Import error:', err);
        addNotification({ title: 'Erreur Fichier', message: err?.message || 'Format invalide ou corrompu.', type: 'error' });
      }
    };
    if (isCSV) reader.readAsText(file);
    else reader.readAsArrayBuffer(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const processImport = async () => {
    if (!mapping.name && !mapping.reference) {
      addNotification({ title: 'Mapping requis', message: 'Nom ou Référence sont obligatoires.', type: 'warning' });
      return;
    }
    setIsImporting(true);
    try {
      const finalProducts: Product[] = [];
      rawImportData.forEach((row: any, i: number) => {
        const ref = String(row[mapping.reference] || `REF-${Date.now()}-${i}`);
        const existing = products.find((p: Product) => p.reference === ref || p.name === row[mapping.name]);

        const parsePrice = (val: any): number => {
          if (!val) return 0;
          const cleaned = String(val).replace(/[^0-9,.-]/g, '').replace(',', '.');
          return parseFloat(cleaned) || 0;
        };
        const parseWarranty = (val: any): number => {
          if (!val) return 0;
          const cleaned = String(val).replace(/[^0-9]/g, '');
          return parseInt(cleaned, 10) || 0;
        };

        const product: Product = existing || {
          id: `PR-IMP-${Date.now()}-${i}`,
          name: String(row[mapping.name] || 'Produit sans nom'),
          reference: ref,
          brand: String(row[mapping.brand] || 'Générique'),
          category: String(row[mapping.category] || 'General'),
          price: parsePrice(row[mapping.price]),
          purchasePrice: row[mapping.purchasePrice] ? parsePrice(row[mapping.purchasePrice]) : undefined,
          warrantyMonths: parseWarranty(row[mapping.warrantyMonths]),
          supplier: row[mapping.supplier] ? String(row[mapping.supplier]) : undefined,
          stockStatus: row[mapping.stockStatus] as any || undefined,
          subcategory: row[mapping.subcategory] ? String(row[mapping.subcategory]) : undefined,
          description: row[mapping.description] ? String(row[mapping.description]) : undefined,
        };
        if (existing) Object.assign(product, { ...existing, ...product });
        finalProducts.push(product);
      });
      if (finalProducts.length > 0) await ApiService.products.saveAll(finalProducts);
      addNotification({ title: 'Import Produits', message: `${finalProducts.length} produits synchronisés.`, type: 'success' });
      setIsMappingModalOpen(false);
      refreshAll();
    } catch (err: any) {
      addNotification({ title: 'Erreur Import', message: err?.message || 'Échec de l\'opération massive.', type: 'error' });
      console.error('Import error:', err);
    } finally {
      setIsImporting(false);
    }
  };

  const getStockBadge = (status?: string) => {
    switch (status) {
      case 'En stock': return { label: 'En stock', class: 'bg-[#f0fdf4] text-[#16a34a]' };
      case 'Rupture': return { label: 'Rupture', class: 'bg-red-50 text-red-500' };
      case 'Sur commande': return { label: 'Sur commande', class: 'bg-amber-50 text-amber-600' };
      default: return { label: 'N/A', class: 'bg-[#f8f9fa] text-[#686868]' };
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-5 animate-sb-entry pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#3ecf8e]/10 rounded-xl flex items-center justify-center text-[#3ecf8e]">
            <Package size={18} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Catalogue Produits</h1>
            <p className="text-xs text-[#686868] font-semibold uppercase tracking-wider mt-0.5">
              {(products || []).length} produits référencés
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={openNewProduct} className="btn-sb-primary h-10 px-4">
            <Plus size={16} /> Nouveau
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="btn-sb-outline h-10 px-4">
            <Upload size={16} /> Import XLS
          </button>
          <input type="file" ref={fileInputRef} accept=".xlsx,.xls" hidden onChange={handleFileSelect} />
          <button onClick={refreshAll} className="btn-sb-outline h-10 px-4">
            <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#686868]" />
          <input
            type="text"
            placeholder="Rechercher par nom, marque, référence..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full h-11 pl-10 pr-4"
          />
        </div>
        <select
          value={brandFilter}
          onChange={e => setBrandFilter(e.target.value)}
          className="w-full md:w-48 h-11"
        >
          <option value="">Toutes les marques</option>
          {(brands || []).map((b: string) => <option key={b} value={b}>{b}</option>)}
        </select>
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="w-full md:w-48 h-11"
        >
          <option value="">Toutes les catégories</option>
          {categories.map((c: string) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex gap-1">
          {sortOptions.map(opt => (
            <button key={opt.value} onClick={() => toggleSort(opt.value)}
              className={`h-9 px-3 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1 ${sortBy === opt.value ? 'bg-[#1c1c1c] text-white' : 'bg-white border border-[#e5e5e5] text-[#686868] hover:border-[#d1d1d1]'}`}
            >
              {opt.label} {sortBy === opt.value && <ChevronDown size={13} className={`transition-transform ${sortDir === 'desc' ? 'rotate-180' : ''}`} />}
            </button>
          ))}
        </div>
        <div className="flex bg-white border border-[#e5e5e5] rounded-lg p-0.5 ml-auto">
          <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-[#1c1c1c] text-white' : 'text-[#686868] hover:text-[#1c1c1c]'}`} title="Vue grille"><LayoutGrid size={15} /></button>
          <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-[#1c1c1c] text-white' : 'text-[#686868] hover:text-[#1c1c1c]'}`} title="Vue liste"><List size={15} /></button>
        </div>
      </div>

      {(searchTerm || brandFilter || categoryFilter) && (
        <div className="flex items-center gap-2 text-xs text-[#686868] font-semibold">
          <Filter size={12} /> Filtres actifs
          {searchTerm && <span className="px-2 py-1 bg-[#f8f9fa] rounded">"{searchTerm}"</span>}
          {brandFilter && (
            <button onClick={() => setBrandFilter('')} className="px-2 py-1 bg-[#f8f9fa] rounded flex items-center gap-1 hover:bg-red-50">
              {brandFilter} <X size={12} />
            </button>
          )}
          {categoryFilter && (
            <button onClick={() => setCategoryFilter('')} className="px-2 py-1 bg-[#f8f9fa] rounded flex items-center gap-1 hover:bg-red-50">
              {categoryFilter} <X size={12} />
            </button>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1,2,3,4,5,6,7,8].map(i => <SkeletonCard key={i} />)}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-20">
          <Package size={48} className="mx-auto text-[#d1d1d1] mb-4" />
          <p className="text-sm font-semibold text-[#686868]">Aucun produit trouvé</p>
          <p className="text-xs text-[#686868] mt-1">Essayez de modifier vos filtres de recherche.</p>
        </div>
      ) : (
        <>
          {filteredProducts.length > 0 && (
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs text-[#686868] font-semibold cursor-pointer select-none">
                <input type="checkbox" checked={selectedProductIds.length === paginatedProducts.length && paginatedProducts.length > 0} onChange={toggleSelectAll} className="w-4 h-4 rounded border-[#d1d1d1] text-[#3ecf8e] focus:ring-[#3ecf8e]/30 cursor-pointer" />
                Tout sélectionner ({paginatedProducts.length})
              </label>
              {selectedProductIds.length > 0 && (
                <button
                  onClick={() => setDeleteConfirm({ ids: selectedProductIds })}
                  className="flex items-center gap-1.5 px-3 h-8 bg-red-50 text-red-600 border border-red-200 rounded-lg text-[11px] font-semibold hover:bg-red-100 transition-all"
                >
                  <Trash2 size={14} /> Supprimer ({selectedProductIds.length})
                </button>
              )}
          </div>
        )}
        {viewMode === 'grid' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {paginatedProducts.map((p: Product) => {
            const stock = getStockBadge(p.stockStatus);
            return (
          <div
            key={p.id}
            onClick={() => setSelectedProduct(p)}
            className="bg-white border border-[#e5e5e5] rounded-xl p-5 hover:border-[#3ecf8e]/30 hover:shadow-md transition-all cursor-pointer card-interactive relative group"
          >
            <div onClick={e => { e.stopPropagation(); toggleSelectProduct(p.id); }} className="absolute top-3 left-3 z-10">
              <input type="checkbox" checked={selectedProductIds.includes(p.id)} onChange={() => {}} className="w-4 h-4 rounded border-[#d1d1d1] text-[#3ecf8e] focus:ring-[#3ecf8e]/30 cursor-pointer" />
            </div>
            <div className="absolute top-3 right-3 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={(e) => openEditProduct(p, e)} className="p-1.5 bg-white border border-[#e5e5e5] rounded-md hover:bg-[#f8f9fa] text-[#686868] hover:text-[#1c1c1c] transition-all shadow-sm">
                <Edit3 size={13} />
              </button>
              <button onClick={(e) => handleDeleteProduct(p.id, e)} className="p-1.5 bg-white border border-[#e5e5e5] rounded-md hover:bg-red-50 text-[#686868] hover:text-red-500 transition-all shadow-sm">
                <Trash2 size={13} />
              </button>
            </div>
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2.5 bg-[#f0fdf4] rounded-lg">
                    <Package size={20} className="text-[#3ecf8e]" />
                  </div>
                  <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${stock.class}`}>
                    {stock.label}
                  </span>
                </div>
                <h3 className="font-semibold text-sm text-[#1c1c1c] leading-tight">{p.name}</h3>
                <p className="text-[11px] text-[#686868] font-semibold mt-1">{p.brand} • {p.reference}</p>
                <div className="flex items-center gap-3 mt-3 text-[11px] text-[#686868] font-semibold">
                  <span className="flex items-center gap-1">
                    <BadgeCheck size={11} className="text-[#3ecf8e]" />
                    {p.category}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={11} />
                    {p.warrantyMonths} mois
                  </span>
                </div>
                <div className="mt-4 pt-3 border-t border-[#f5f5f5] flex items-center justify-between">
                  <span className="text-base font-bold text-[#1c1c1c]">
                    {new Intl.NumberFormat('fr-FR').format(p.price)} FCFA
                  </span>
                  {p.isDiscontinued && (
                    <span className="flex items-center gap-1 text-[10px] text-red-500 font-semibold">
                      <AlertTriangle size={10} /> Abandonné
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        )}
        {viewMode === 'list' && (
        <div className="bg-white rounded-xl border border-[#e5e5e5] shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-[#f8f9fa] border-b border-[#e5e5e5]">
              <tr>
                <th className="w-10 px-3 py-3"><input type="checkbox" checked={selectedProductIds.length === paginatedProducts.length && paginatedProducts.length > 0} onChange={toggleSelectAll} className="w-4 h-4 rounded border-[#d1d1d1] text-[#3ecf8e]" /></th>
                <th className="px-3 py-3 text-[11px] font-semibold text-[#686868] uppercase tracking-wide">Produit</th>
                <th className="px-3 py-3 text-[11px] font-semibold text-[#686868] uppercase tracking-wide hidden md:table-cell">Catégorie</th>
                <th className="px-3 py-3 text-[11px] font-semibold text-[#686868] uppercase tracking-wide hidden lg:table-cell">Garantie</th>
                <th className="px-3 py-3 text-[11px] font-semibold text-[#686868] uppercase tracking-wide">Stock</th>
                <th className="px-3 py-3 text-right text-[11px] font-semibold text-[#686868] uppercase tracking-wide">Prix</th>
                <th className="px-3 py-3 text-right w-20"> </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f0f0]">
          {paginatedProducts.map((p: Product) => {
                const stock = getStockBadge(p.stockStatus);
                return (
                  <tr key={p.id} onClick={() => setSelectedProduct(p)} className="cursor-pointer group transition-all hover:bg-[#f8f9fa]">
                    <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={selectedProductIds.includes(p.id)} onChange={() => toggleSelectProduct(p.id)} className="w-4 h-4 rounded border-[#d1d1d1] text-[#3ecf8e]" />
                    </td>
                    <td className="px-3 py-3">
                      <p className="text-[13px] font-semibold text-[#1c1c1c] group-hover:text-[#3ecf8e] transition-colors">{p.name}</p>
                      <p className="text-[11px] text-[#686868] font-semibold">{p.brand} • {p.reference}</p>
                    </td>
                    <td className="px-3 py-3 hidden md:table-cell">
                      <span className="text-[12px] text-[#686868]">{p.category}</span>
                    </td>
                    <td className="px-3 py-3 hidden lg:table-cell">
                      <span className="text-[12px] text-[#686868] flex items-center gap-1"><Clock size={12} /> {p.warrantyMonths} mois</span>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${stock.class}`}>{stock.label}</span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className="text-[13px] font-bold text-[#1c1c1c]">{new Intl.NumberFormat('fr-FR').format(p.price)} FCFA</span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                        <button onClick={(e) => openEditProduct(p, e)} className="p-1.5 text-[#686868] hover:text-[#3ecf8e] border border-[#e5e5e5] rounded bg-white hover:border-[#3ecf8e]/30 transition-all"><Edit3 size={13} /></button>
                        <button onClick={(e) => handleDeleteProduct(p.id, e)} className="p-1.5 text-[#686868] hover:text-red-500 border border-[#e5e5e5] rounded bg-white hover:border-red-200 transition-all"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredProducts.length === 0 && (
            <div className="text-center py-12">
              <Package size={36} className="mx-auto text-[#d1d1d1] mb-3" />
              <p className="text-sm font-semibold text-[#686868]">Aucun produit trouvé</p>
            </div>
          )}
        </div>
      )}
      </> 
      )}

      {filteredProducts.length > pageSize && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-[#686868] font-semibold">
            {filteredProducts.length} produit(s) — Page {safePage}/{totalPages}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className="h-8 px-3 rounded-lg text-[11px] font-semibold border border-[#e5e5e5] bg-white text-[#686868] disabled:opacity-30 disabled:cursor-not-allowed hover:border-[#d1d1d1] transition-all flex items-center gap-1"
            >
              <ChevronLeft size={14} /> Précédent
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const start = Math.max(1, Math.min(safePage - 3, totalPages - 6));
              const page = start + i;
              if (page > totalPages) return null;
              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 rounded-lg text-[11px] font-semibold transition-all ${page === safePage ? 'bg-[#1c1c1c] text-white' : 'border border-[#e5e5e5] bg-white text-[#686868] hover:border-[#d1d1d1]'}`}
                >
                  {page}
                </button>
              );
            })}
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              className="h-8 px-3 rounded-lg text-[11px] font-semibold border border-[#e5e5e5] bg-white text-[#686868] disabled:opacity-30 disabled:cursor-not-allowed hover:border-[#d1d1d1] transition-all flex items-center gap-1"
            >
              Suivant <ChevronLeft size={14} className="rotate-180" />
            </button>
          </div>
        </div>
      )}

      <Drawer isOpen={!!selectedProduct} onClose={() => setSelectedProduct(null)} title="Détails Produit" icon={<Package size={16} />}>
        {selectedProduct && (
          <div className="space-y-6 animate-sb-entry">
            <div className="p-5 bg-[#f0fdf4] rounded-xl text-center border border-[#dcfce7] relative">
              <Package size={48} className="mx-auto text-[#3ecf8e] mb-3" />
              <h3 className="text-base font-semibold text-[#1c1c1c]">{selectedProduct.name}</h3>
              <p className="text-xs text-[#686868] font-semibold mt-1">{selectedProduct.brand} • {selectedProduct.reference}</p>
              <button onClick={(e) => { setSelectedProduct(null); openEditProduct(selectedProduct, e); }} className="absolute top-3 right-3 p-2 bg-white border border-[#e5e5e5] rounded-lg hover:bg-[#f8f9fa] transition-all shadow-sm">
                <Edit3 size={14} className="text-[#686868]" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 border border-[#e5e5e5] rounded-lg">
                <p className="text-[10px] font-semibold text-[#686868] uppercase mb-1">Catégorie</p>
                <p className="text-sm font-semibold text-[#1c1c1c]">{selectedProduct.category}</p>
              </div>
              <div className="p-4 border border-[#e5e5e5] rounded-lg">
                <p className="text-[10px] font-semibold text-[#686868] uppercase mb-1">Sous-catégorie</p>
                <p className="text-sm font-semibold text-[#1c1c1c]">{selectedProduct.subcategory || '—'}</p>
              </div>
              <div className="p-4 border border-[#e5e5e5] rounded-lg">
                <p className="text-[10px] font-semibold text-[#686868] uppercase mb-1">Prix</p>
                <p className="text-sm font-bold text-[#1c1c1c]">{new Intl.NumberFormat('fr-FR').format(selectedProduct.price)} FCFA</p>
              </div>
              <div className="p-4 border border-[#e5e5e5] rounded-lg">
                <p className="text-[10px] font-semibold text-[#686868] uppercase mb-1">Garantie</p>
                <p className="text-sm font-semibold text-[#1c1c1c]">{selectedProduct.warrantyMonths} mois</p>
              </div>
              <div className="p-4 border border-[#e5e5e5] rounded-lg">
                <p className="text-[10px] font-semibold text-[#686868] uppercase mb-1">Stock</p>
                <p className={`text-sm font-semibold ${getStockBadge(selectedProduct.stockStatus).class}`}>
                  {selectedProduct.stockStatus || 'N/A'}
                </p>
              </div>
              <div className="p-4 border border-[#e5e5e5] rounded-lg">
                <p className="text-[10px] font-semibold text-[#686868] uppercase mb-1">Fournisseur</p>
                <p className="text-sm font-semibold text-[#1c1c1c]">{selectedProduct.supplier || '—'}</p>
              </div>
            </div>
            {selectedProduct.description && (
              <div className="p-4 bg-[#f8f9fa] rounded-lg">
                <p className="text-[10px] font-semibold text-[#686868] uppercase mb-1">Description</p>
                <p className="text-xs text-[#1c1c1c] leading-relaxed">{selectedProduct.description}</p>
              </div>
            )}
          </div>
        )}
      </Drawer>

      {/* Create/Edit Product Modal */}
      <Modal isOpen={isProductModalOpen} onClose={() => setIsProductModalOpen(false)} title={editingProduct ? 'Modifier le produit' : 'Nouveau produit'} size="lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-[#686868] uppercase tracking-wide">Nom <span className="text-red-500">*</span></label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full h-11 px-4 rounded-lg border border-[#e5e5e5] text-sm" placeholder="Nom du produit" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-[#686868] uppercase tracking-wide">Référence <span className="text-red-500">*</span></label>
            <input value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} className="w-full h-11 px-4 rounded-lg border border-[#e5e5e5] text-sm" placeholder="SKU-001" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-[#686868] uppercase tracking-wide">Marque</label>
            <input value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} className="w-full h-11 px-4 rounded-lg border border-[#e5e5e5] text-sm" placeholder="Marque" list="brands-list" />
            <datalist id="brands-list">{(brands || []).map((b: string) => <option key={b} value={b} />)}</datalist>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-[#686868] uppercase tracking-wide">Catégorie</label>
            <input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full h-11 px-4 rounded-lg border border-[#e5e5e5] text-sm" placeholder="Catégorie" list="cats-list" />
            <datalist id="cats-list">{categories.map((c: string) => <option key={c} value={c} />)}</datalist>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-[#686868] uppercase tracking-wide">Prix vente (F CFA)</label>
            <input type="number" value={form.price} onChange={e => setForm({ ...form, price: Number(e.target.value) })} className="w-full h-11 px-4 rounded-lg border border-[#e5e5e5] text-sm" min={0} />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-[#686868] uppercase tracking-wide">Prix achat (F CFA)</label>
            <input type="number" value={form.purchasePrice} onChange={e => setForm({ ...form, purchasePrice: Number(e.target.value) })} className="w-full h-11 px-4 rounded-lg border border-[#e5e5e5] text-sm" min={0} />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-[#686868] uppercase tracking-wide">Garantie (mois)</label>
            <input type="number" value={form.warrantyMonths} onChange={e => setForm({ ...form, warrantyMonths: Number(e.target.value) })} className="w-full h-11 px-4 rounded-lg border border-[#e5e5e5] text-sm" min={0} />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-[#686868] uppercase tracking-wide">Statut stock</label>
            <select value={form.stockStatus} onChange={e => setForm({ ...form, stockStatus: e.target.value })} className="w-full h-11 px-4 rounded-lg border border-[#e5e5e5] text-sm">
              <option value="En stock">En stock</option>
              <option value="Rupture">Rupture</option>
              <option value="Sur commande">Sur commande</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-[#686868] uppercase tracking-wide">Fournisseur</label>
            <input value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })} className="w-full h-11 px-4 rounded-lg border border-[#e5e5e5] text-sm" placeholder="Fournisseur" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-[#686868] uppercase tracking-wide">Sous-catégorie</label>
            <input value={form.subcategory} onChange={e => setForm({ ...form, subcategory: e.target.value })} className="w-full h-11 px-4 rounded-lg border border-[#e5e5e5] text-sm" placeholder="Sous-catégorie" />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-[10px] font-semibold text-[#686868] uppercase tracking-wide">Description</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} className="w-full px-4 py-3 rounded-lg border border-[#e5e5e5] text-sm resize-none" placeholder="Description du produit..." />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-8 border-t border-[#f5f5f5] mt-6">
          <button onClick={() => setIsProductModalOpen(false)} className="btn-sb-outline h-11 px-8 rounded-lg text-[12px] font-semibold uppercase tracking-widest">Annuler</button>
          <button onClick={handleSaveProduct} disabled={isSaving} className="btn-sb-primary h-11 px-10 rounded-lg text-[12px] font-semibold uppercase tracking-widest flex items-center gap-2">
            {isSaving ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
            {editingProduct ? 'Modifier' : 'Créer'}
          </button>
        </div>
      </Modal>

      {/* Mapping Import Modal */}
      <Modal isOpen={isMappingModalOpen} onClose={() => setIsMappingModalOpen(false)} title="Mapping d'Import Produits" size="lg">
        <div className="space-y-8">
          <div className="flex items-start gap-5 p-3 bg-[#f0f9f4] border border-[#dcfce7] rounded-xl shadow-sm">
            <CheckCircle2 className="text-[#3ecf8e] mt-1 shrink-0" size={14} />
            <div>
              <p className="text-sm font-semibold text-[#1c1c1c] uppercase tracking-tight">Fichier Analyse</p>
              <p className="text-xs text-[#686868] font-semibold mt-1">{rawImportData.length} lignes détectées. Mappez les colonnes Excel vers les champs du catalogue.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
            {[
              { key: 'name', label: 'Nom/Désignation', req: true },
              { key: 'reference', label: 'Référence/SKU', req: true },
              { key: 'brand', label: 'Marque', req: false },
              { key: 'category', label: 'Catégorie', req: false },
              { key: 'price', label: 'Prix Vente', req: false },
              { key: 'purchasePrice', label: 'Prix Achat', req: false },
              { key: 'warrantyMonths', label: 'Garantie (mois)', req: false },
              { key: 'supplier', label: 'Fournisseur', req: false },
              { key: 'stockStatus', label: 'État Stock', req: false },
              { key: 'subcategory', label: 'Sous-catégorie', req: false },
              { key: 'description', label: 'Description', req: false },
            ].map((field: any) => (
              <div key={field.key} className="space-y-1.5">
                <label className="text-[9px] font-semibold text-[#686868] uppercase tracking-wide flex items-center justify-between">
                  <span>{field.label} {field.req && <span className="text-red-500">*</span>}</span>
                </label>
                <select
                  className={`w-full h-11 px-4 rounded-lg font-semibold border-[#e5e5e5] ${mapping[field.key] ? 'border-[#3ecf8e] bg-[#f0fdf4]/50' : ''}`}
                  value={mapping[field.key]}
                  onChange={e => setMapping({ ...mapping, [field.key]: e.target.value })}
                >
                  <option value="">-- Ignorer --</option>
                  {fileHeaders.map((h: string) => <option key={h} value={h}>{h}</option>)}
        </select>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-3 pt-8 border-t border-[#f5f5f5]">
            <button onClick={() => setIsMappingModalOpen(false)} className="btn-sb-outline h-10 px-8 rounded-lg text-[12px] font-semibold uppercase tracking-widest">Annuler</button>
            <button
              onClick={processImport}
              disabled={isImporting || (!mapping.name && !mapping.reference)}
              className="btn-sb-primary h-10 px-12 rounded-lg shadow-lg shadow-[#3ecf8e]/20 text-[12px] font-semibold uppercase tracking-widest"
            >
              {isImporting ? <RefreshCw className="animate-spin" size={16} /> : <><span>Importer {rawImportData.length} produits</span> <ArrowRight size={16} className="ml-2" /></>}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleBulkDelete}
        title="Supprimer des produits"
        message={`Êtes-vous sûr de vouloir supprimer ${deleteConfirm?.ids.length || 0} produit(s) du catalogue ?`}
        confirmText={`Supprimer (${deleteConfirm?.ids.length || 0})`}
      />
    </div>
  );
};

export default Products;
