import React, { useState, useMemo, useRef } from 'react';
import { Search, Package, RefreshCw, Filter, X, BadgeCheck, Clock, AlertTriangle, Upload, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useData, useNotifications } from '../App';
import { Product } from '../types';
import Drawer from '../components/Drawer';
import Modal from '../components/Modal';
import { SkeletonCard } from '../components/Skeleton';
import { ApiService } from '../services/apiService';
import * as XLSX from 'xlsx';

const Products: React.FC = () => {
  const { products, brands, isLoading, refreshAll, isSyncing } = (() => { try { return useData(); } catch { return { products: [], brands: [], isLoading: false, refreshAll: () => { }, isSyncing: false }; } })();

  const [searchTerm, setSearchTerm] = useState('');
  const [brandFilter, setBrandFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

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

  const categories = useMemo(() => {
    const cats = new Set((products || []).map((p: Product) => p.category).filter(Boolean));
    return Array.from(cats).sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    return (products || []).filter((p: Product) => {
      const q = searchTerm.toLowerCase();
      if (q && !p.name.toLowerCase().includes(q) && !p.brand.toLowerCase().includes(q) && !p.reference.toLowerCase().includes(q)) return false;
      if (brandFilter && p.brand !== brandFilter) return false;
      if (categoryFilter && p.category !== categoryFilter) return false;
      return true;
    });
  }, [products, searchTerm, brandFilter, categoryFilter]);

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
        const product: Product = existing || {
          id: `PR-IMP-${Date.now()}-${i}`,
          name: String(row[mapping.name] || 'Produit sans nom'),
          reference: ref,
          brand: String(row[mapping.brand] || 'Générique'),
          category: String(row[mapping.category] || 'General'),
          price: Number(row[mapping.price] || 0),
          purchasePrice: row[mapping.purchasePrice] ? Number(row[mapping.purchasePrice]) : undefined,
          warrantyMonths: Number(row[mapping.warrantyMonths] || 0),
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
    } catch (err) {
      addNotification({ title: 'Erreur Import', message: 'Échec de l\'opération massive.', type: 'error' });
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
          <button onClick={() => fileInputRef.current?.click()} className="btn-sb-outline h-10 px-4">
            <Upload size={16} /> Import XLS
          </button>
          <input type="file" ref={fileInputRef} accept=".xlsx,.xls" hidden onChange={handleFileSelect} />
          <button onClick={refreshAll} className="btn-sb-outline h-10 px-4">
            <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} /> Actualiser
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map((p: Product) => {
            const stock = getStockBadge(p.stockStatus);
            return (
              <div
                key={p.id}
                onClick={() => setSelectedProduct(p)}
                className="bg-white border border-[#e5e5e5] rounded-xl p-5 hover:border-[#3ecf8e]/30 hover:shadow-md transition-all cursor-pointer card-interactive"
              >
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

      <Drawer isOpen={!!selectedProduct} onClose={() => setSelectedProduct(null)} title="Détails Produit" icon={<Package size={16} />}>
        {selectedProduct && (
          <div className="space-y-6 animate-sb-entry">
            <div className="p-5 bg-[#f0fdf4] rounded-xl text-center border border-[#dcfce7]">
              <Package size={48} className="mx-auto text-[#3ecf8e] mb-3" />
              <h3 className="text-base font-semibold text-[#1c1c1c]">{selectedProduct.name}</h3>
              <p className="text-xs text-[#686868] font-semibold mt-1">{selectedProduct.brand} • {selectedProduct.reference}</p>
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
    </div>
  );
};

export default Products;
