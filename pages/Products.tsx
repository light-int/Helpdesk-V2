
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Plus, Search, RefreshCw, ShoppingBag, Edit3, Trash2, 
  ChevronLeft, ChevronRight, Image as ImageIcon, Tag,
  ShieldCheck, ArrowRight, Upload, Filter, X, FileText
} from 'lucide-react';
import { useData, useNotifications, useUser } from '../App';
import { Product } from '../types';
import Modal from '../components/Modal';
import Drawer from '../components/Drawer';
import * as XLSX from 'xlsx';

const ITEMS_PER_PAGE = 12;

const Products: React.FC = () => {
  const { products, refreshAll, isLoading, isSyncing, brands, saveProduct, deleteProduct } = useData();
  const { addNotification } = useNotifications();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  const [brandFilter, setBrandFilter] = useState('Tous');
  const [categoryFilter, setCategoryFilter] = useState('Tous');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { refreshAll(); }, []);

  const categories = useMemo(() => {
    const cats = new Set((products || []).map(p => p.category));
    return Array.from(cats).filter(Boolean);
  }, [products]);

  const filtered = useMemo(() => {
    return (products || []).filter(p => {
      const matchesSearch = (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (p.reference || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesBrand = brandFilter === 'Tous' || p.brand === brandFilter;
      const matchesCategory = categoryFilter === 'Tous' || p.category === categoryFilter;
      
      return matchesSearch && matchesBrand && matchesCategory;
    });
  }, [products, searchTerm, brandFilter, categoryFilter]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        
        let count = 0;
        for (const row of data as any[]) {
          // Mapping intelligent pour supporter plusieurs formats de colonnes
          const newProd: Product = {
            id: `PR-IMP-${Date.now()}-${count}`,
            name: row.name || row.Nom || row.Désignation || 'Sans nom',
            reference: String(row.reference || row.Référence || row.Ref || `REF-${count}`),
            brand: row.brand || row.Marque || 'Inconnue',
            category: row.category || row.Catégorie || 'Divers',
            price: Number(row.price || row.Prix || 0),
            warrantyMonths: Number(row.warranty || row.Garantie || row['Garantie (Mois)'] || 12),
            image: row.image || row.Image || row.URL || row.image_url || null
          };
          await saveProduct(newProd);
          count++;
        }
        addNotification({ title: 'Import Réussi', message: `${count} produits ajoutés au catalogue.`, type: 'success' });
        refreshAll();
      } catch (err) {
        addNotification({ title: 'Erreur', message: 'Le format du fichier Excel/CSV est invalide.', type: 'error' });
      }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSaveProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    const formData = new FormData(e.currentTarget);
    const data: Product = {
      id: editingProduct?.id || `PR-${Date.now()}`,
      name: formData.get('name') as string,
      reference: formData.get('reference') as string,
      brand: formData.get('brand') as string,
      category: formData.get('category') as string,
      price: Number(formData.get('price')),
      warrantyMonths: Number(formData.get('warrantyMonths')),
      image: formData.get('image') as string || editingProduct?.image
    };
    
    try {
      await saveProduct(data);
      addNotification({ title: 'Catalogue', message: 'Produit synchronisé avec succès.', type: 'success' });
      setIsModalOpen(false);
    } catch (err) {
      addNotification({ title: 'Erreur', message: 'Échec de la sauvegarde.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Retirer ce produit du catalogue ?')) return;
    try {
      await deleteProduct(id);
      addNotification({ title: 'Catalogue', message: 'Produit supprimé.', type: 'info' });
      setSelectedProduct(null);
    } catch (err) {
      addNotification({ title: 'Erreur', message: 'Impossible de supprimer ce produit.', type: 'error' });
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-sb-entry pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1c1c1c] tracking-tight">Catalogue Produits</h1>
          <p className="text-xs text-[#686868] mt-1 font-medium">Référentiel matériel et marques partenaires Royal Plaza.</p>
        </div>
        <div className="flex gap-2">
          <input type="file" ref={fileInputRef} onChange={handleImportExcel} className="hidden" accept=".xlsx, .xls, .csv" />
          <button onClick={() => fileInputRef.current?.click()} className="btn-sb-outline h-10 px-4">
            <Upload size={14} /> <span>Importer</span>
          </button>
          <button onClick={() => { setEditingProduct(null); setIsModalOpen(true); }} className="btn-sb-primary h-10 px-4">
            <Plus size={16} /> <span>Nouveau Produit</span>
          </button>
        </div>
      </header>

      <div className="space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 text-[#686868]" size={16} />
            <input 
              type="text" 
              placeholder="Rechercher un modèle, une référence..." 
              className="w-full pl-10 h-11"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`btn-sb-outline h-11 px-4 ${showFilters ? 'border-[#3ecf8e] text-[#3ecf8e]' : ''}`}
          >
            <Filter size={16} /> <span className="text-xs">Filtres</span>
          </button>
          <button onClick={refreshAll} className="btn-sb-outline h-11 px-3">
             <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
          </button>
        </div>

        {showFilters && (
          <div className="sb-card p-4 flex flex-wrap gap-6 animate-sb-entry bg-[#fcfcfc]">
            <div className="space-y-1.5 min-w-[180px]">
              <label className="text-[10px] font-bold text-[#686868] uppercase">Marque</label>
              <select value={brandFilter} onChange={e => setBrandFilter(e.target.value)} className="w-full h-9 text-xs">
                <option value="Tous">Toutes les marques</option>
                {brands.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div className="space-y-1.5 min-w-[180px]">
              <label className="text-[10px] font-bold text-[#686868] uppercase">Catégorie</label>
              <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="w-full h-9 text-xs">
                <option value="Tous">Toutes les catégories</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex items-end">
              <button 
                onClick={() => { setBrandFilter('Tous'); setCategoryFilter('Tous'); setSearchTerm(''); }}
                className="btn-sb-outline h-9 text-[10px] font-bold px-3 uppercase"
              >
                Réinitialiser
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {paginated.map((p) => (
          <div 
            key={p.id} 
            onClick={() => setSelectedProduct(p)}
            className="sb-card group cursor-pointer flex flex-col p-0 border border-[#ededed] hover:border-[#3ecf8e] transition-all duration-300"
          >
            <div className="aspect-square bg-white flex items-center justify-center overflow-hidden relative border-b border-[#f5f5f5]">
              {p.image ? (
                <img src={p.image} alt={p.name} className="w-full h-full object-contain p-6 group-hover:scale-105 transition-transform duration-500" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-[#dadce0]">
                  <ImageIcon size={48} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Image indisponible</span>
                </div>
              )}
              <div className="absolute top-3 left-3">
                <span className="px-2 py-1 bg-white/90 backdrop-blur-sm border border-[#ededed] text-[#1c1c1c] text-[9px] font-bold uppercase rounded shadow-sm">
                  {p.brand}
                </span>
              </div>
            </div>
            <div className="p-4 flex-1 flex flex-col gap-2">
              <p className="text-[9px] font-bold text-[#3ecf8e] uppercase tracking-widest leading-none">{p.category}</p>
              <h3 className="text-[13px] font-bold text-[#1c1c1c] leading-snug line-clamp-2">{p.name}</h3>
              <p className="text-[10px] font-mono text-[#686868]">{p.reference}</p>
              <div className="mt-auto pt-4 flex items-center justify-between">
                <span className="text-[15px] font-black text-[#1c1c1c]">{p.price?.toLocaleString()} F</span>
                <div className="w-8 h-8 rounded bg-[#f8f9fa] border border-[#ededed] flex items-center justify-center text-[#686868] group-hover:bg-[#3ecf8e] group-hover:text-white group-hover:border-[#3ecf8e] transition-all">
                  <ArrowRight size={14} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 pt-10">
          <button 
            disabled={currentPage === 1} 
            onClick={() => setCurrentPage(p => p - 1)} 
            className="btn-sb-outline h-9 px-3 disabled:opacity-30"
          >
            <ChevronLeft size={16}/>
          </button>
          <span className="text-[11px] font-bold text-[#686868] uppercase tracking-widest">Page {currentPage} / {totalPages}</span>
          <button 
            disabled={currentPage === totalPages} 
            onClick={() => setCurrentPage(p => p + 1)} 
            className="btn-sb-outline h-9 px-3 disabled:opacity-30"
          >
            <ChevronRight size={16}/>
          </button>
        </div>
      )}

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingProduct ? "Modifier le Produit" : "Ajouter au Catalogue"}
      >
        <form onSubmit={handleSaveProduct} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#686868] uppercase">Nom du produit</label>
              <input name="name" type="text" defaultValue={editingProduct?.name} placeholder="ex: TV LG 55 OLED" required className="w-full" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#686868] uppercase">Référence catalogue</label>
              <input name="reference" type="text" defaultValue={editingProduct?.reference} placeholder="ex: REF-10293" required className="w-full" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#686868] uppercase">Marque</label>
              <select name="brand" defaultValue={editingProduct?.brand || 'LG'} className="w-full">
                {brands.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#686868] uppercase">Catégorie</label>
              <input name="category" list="cats" defaultValue={editingProduct?.category} placeholder="ex: Électroménager" required className="w-full" />
              <datalist id="cats">
                {categories.map(c => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#686868] uppercase">Prix Public (F CFA)</label>
              <input name="price" type="number" defaultValue={editingProduct?.price} placeholder="0" required className="w-full" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#686868] uppercase">Garantie (Mois)</label>
              <input name="warrantyMonths" type="number" defaultValue={editingProduct?.warrantyMonths || 12} placeholder="12" required className="w-full" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-[#686868] uppercase">URL de l'image</label>
            <input name="image" type="url" defaultValue={editingProduct?.image} placeholder="https://..." className="w-full" />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-[#ededed]">
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn-sb-outline">Annuler</button>
            <button type="submit" disabled={isSaving} className="btn-sb-primary">
              {isSaving ? <RefreshCw className="animate-spin" size={14}/> : 'Enregistrer'}
            </button>
          </div>
        </form>
      </Modal>

      <Drawer isOpen={!!selectedProduct} onClose={() => setSelectedProduct(null)} title="Fiche Produit" icon={<ShoppingBag size={16}/>}>
        {selectedProduct && (
          <div className="space-y-8 animate-sb-entry">
            <div className="w-full aspect-video bg-white rounded-lg border border-[#ededed] flex items-center justify-center p-8 overflow-hidden">
               {selectedProduct.image ? <img src={selectedProduct.image} className="w-full h-full object-contain" alt="" /> : <ImageIcon size={64} className="text-[#dadce0]" />}
            </div>
            <div className="flex justify-between items-start">
              <div>
                 <h3 className="text-xl font-bold text-[#1c1c1c] tracking-tight leading-tight">{selectedProduct.name}</h3>
                 <p className="text-xs text-[#686868] font-mono mt-1 uppercase font-semibold">REF: {selectedProduct.reference}</p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => { setEditingProduct(selectedProduct); setIsModalOpen(true); }}
                  className="p-2 border border-[#ededed] rounded hover:border-[#3ecf8e] text-[#686868] hover:text-[#3ecf8e] transition-colors"
                >
                  <Edit3 size={16} />
                </button>
                <button 
                  onClick={() => handleDelete(selectedProduct.id)}
                  className="p-2 border border-[#ededed] rounded hover:border-red-500 text-[#686868] hover:text-red-500 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-5 bg-[#f8f9fa] border border-[#ededed] rounded-lg">
                <div className="flex items-center gap-2 text-[#3ecf8e] mb-2"><Tag size={12}/><p className="text-[9px] font-bold uppercase tracking-widest">Tarif Public</p></div>
                <p className="text-lg font-black text-[#1c1c1c]">{selectedProduct.price?.toLocaleString()} F</p>
              </div>
              <div className="p-5 bg-[#f8f9fa] border border-[#ededed] rounded-lg">
                <div className="flex items-center gap-2 text-[#3ecf8e] mb-2"><ShieldCheck size={12}/><p className="text-[9px] font-bold uppercase tracking-widest">Garantie</p></div>
                <p className="text-lg font-black text-[#1c1c1c]">{selectedProduct.warrantyMonths} Mois</p>
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default Products;
