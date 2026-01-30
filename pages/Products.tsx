
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Plus, Search, ShoppingBag, Filter, Upload, Edit3, Trash2, Save, X, Database, 
  CheckCircle2, Tag, ChevronLeft, ChevronRight, CheckSquare, Square,
  Loader2, Box, CreditCard, ShieldCheck, Package, ArrowUpRight,
  AlertTriangle, Info, Hash, Archive, BarChart3, Camera, DollarSign, History,
  Link as LinkIcon, Image as ImageIcon, RefreshCw, LayoutGrid, ListFilter,
  FileDown, FileSpreadsheet, ArrowRight
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useData, useNotifications, useUser } from '../App';
import { Product, Ticket } from '../types';
import Modal from '../components/Modal';
import Drawer from '../components/Drawer';

const ITEMS_PER_PAGE = 12;

const Products: React.FC = () => {
  const { products, tickets, saveProduct, deleteProduct, brands, refreshAll, isLoading } = useData();
  const { currentUser } = useUser();
  const { addNotification } = useNotifications();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Toutes');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMappingModalOpen, setIsMappingModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string>('');

  // États pour l'import Excel
  const [importData, setImportData] = useState<any[]>([]);
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({
    reference: '',
    name: '',
    brand: '',
    price: '',
    category: '',
    warrantyMonths: ''
  });

  const isEditor = currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER';

  useEffect(() => { refreshAll(); }, []);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    (products || []).forEach(p => { if (p.category) cats.add(p.category); });
    return ['Toutes', ...Array.from(cats)].sort();
  }, [products]);

  const filtered = useMemo(() => {
    return (products || []).filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.brand.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'Toutes' || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);

  // LOGIQUE IMPORT EXCEL
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);
      if (data.length > 0) {
        setImportData(data);
        setExcelHeaders(Object.keys(data[0] as object));
        setIsMappingModalOpen(true);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleFinalImport = async () => {
    setIsSaving(true);
    let successCount = 0;
    try {
      for (const row of importData) {
        const newProduct: Product = {
          id: `PR-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          reference: String(row[mapping.reference] || ''),
          name: String(row[mapping.name] || ''),
          brand: String(row[mapping.brand] || 'Royal Plaza'),
          price: parseFloat(row[mapping.price]) || 0,
          category: String(row[mapping.category] || 'Général'),
          warrantyMonths: parseInt(row[mapping.warrantyMonths]) || 12
        };
        if (newProduct.reference && newProduct.name) {
          await saveProduct(newProduct);
          successCount++;
        }
      }
      addNotification({ title: 'Importation Terminée', message: `${successCount} références injectées dans le cloud.`, type: 'success' });
      setIsMappingModalOpen(false);
      await refreshAll();
    } catch (err) {
      addNotification({ title: 'Erreur Import', message: 'Échec de la synchronisation des données Excel.', type: 'error' });
    } finally {
      setIsSaving(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSaveProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    const formData = new FormData(e.currentTarget);
    const productData: Product = {
      id: editingProduct?.id || `PR-${Date.now()}`,
      reference: formData.get('reference') as string,
      name: formData.get('name') as string,
      brand: formData.get('brand') as string,
      category: formData.get('category') as string,
      price: parseFloat(formData.get('price') as string || '0'),
      warrantyMonths: parseInt(formData.get('warrantyMonths') as string || '12'),
      image: previewImageUrl || undefined
    };
    try {
      await saveProduct(productData);
      setIsModalOpen(false);
      setEditingProduct(null);
      addNotification({ title: 'Catalogue', message: 'Référence mise à jour avec succès.', type: 'success' });
      await refreshAll();
    } catch (err) {
      addNotification({ title: 'Erreur', message: 'Échec de la sauvegarde Cloud.', type: 'error' });
    } finally { setIsSaving(false); }
  };

  if (isLoading) return <div className="h-[80vh] flex items-center justify-center"><Loader2 className="animate-spin text-[#1a73e8]" size={32} /></div>;

  return (
    <div className="space-y-8 animate-page-entry pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-light text-[#202124]">Catalogue Produits</h1>
          <p className="text-[10px] text-[#5f6368] font-black uppercase tracking-widest mt-1">Référentiel Technique & Garanties Royal Plaza</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx, .xls, .csv" className="hidden" />
          {isEditor && (
            <>
              <button onClick={() => fileInputRef.current?.click()} className="btn-google-outlined h-11 px-6">
                <FileSpreadsheet size={18} className="text-[#188038]" /> <span>Import Excel</span>
              </button>
              <button onClick={() => { setEditingProduct(null); setPreviewImageUrl(''); setIsModalOpen(true); }} className="btn-google-primary h-11 px-6 shadow-xl shadow-blue-600/10">
                <Plus size={20} /> <span>Nouveau Produit</span>
              </button>
            </>
          )}
          <button onClick={refreshAll} className="btn-google-outlined h-11 px-4">
            <RefreshCw size={18} />
          </button>
        </div>
      </header>

      {/* KPIS RAPIDES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="stats-card border-l-4 border-blue-600">
          <p className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest mb-1">Total Références</p>
          <h3 className="text-3xl font-bold text-[#202124]">{products.length}</h3>
        </div>
        <div className="stats-card border-l-4 border-green-600">
          <p className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest mb-1">Constructeurs</p>
          <h3 className="text-3xl font-bold text-[#202124]">{brands.length}</h3>
        </div>
        <div className="stats-card border-l-4 border-amber-500">
          <p className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest mb-1">En Sav Associé</p>
          <h3 className="text-3xl font-bold text-[#202124]">{tickets.length}</h3>
        </div>
      </div>

      {/* RECHERCHE & FILTRES */}
      <div className="google-card overflow-hidden border-none shadow-xl bg-white ring-1 ring-black/5">
        <div className="p-8 flex flex-col md:flex-row gap-6 items-center">
          <div className="relative flex-1 w-full group">
             <Search className="absolute left-6 top-4 text-[#9aa0a6] group-focus-within:text-[#1a73e8] transition-colors" size={24} />
             <input 
              type="text" 
              placeholder="Rechercher une référence, un nom ou une marque..." 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              className="w-full pl-16 h-14 bg-[#f8f9fa] border-none text-base font-bold shadow-inner focus:bg-white focus:ring-2 focus:ring-blue-100" 
             />
          </div>
          <div className="flex gap-4 w-full md:w-auto">
             <div className="relative flex-1 md:min-w-[220px]">
                <select 
                  value={selectedCategory} 
                  onChange={(e) => setSelectedCategory(e.target.value)} 
                  className="w-full h-14 bg-[#f1f3f4] border-none text-[10px] font-black uppercase tracking-widest px-6 appearance-none cursor-pointer hover:bg-[#e8eaed] transition-colors"
                >
                   {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
                <Filter className="absolute right-5 top-5 text-gray-400 pointer-events-none" size={16} />
             </div>
          </div>
        </div>
      </div>

      {/* GRILLE DE PRODUITS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {paginatedProducts.map((product) => (
          <div 
            key={product.id} 
            onClick={() => setSelectedProduct(product)}
            className="group bg-white border border-[#dadce0] cursor-pointer hover:border-[#1a73e8] transition-all flex flex-col relative overflow-hidden"
          >
            <div className="aspect-square bg-[#f8f9fa] flex items-center justify-center overflow-hidden border-b border-[#f1f3f4] relative">
              {product.image ? (
                <img 
                  src={product.image} 
                  alt={product.name} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" 
                />
              ) : (
                <ImageIcon size={64} className="text-[#dadce0] opacity-30" />
              )}
              <div className="absolute top-4 left-4">
                 <span className="text-[8px] font-black text-[#1a73e8] uppercase bg-white/90 backdrop-blur-md px-2 py-1 border border-blue-100 shadow-sm">{product.brand}</span>
              </div>
            </div>
            <div className="p-6 space-y-2 flex-1">
              <span className="text-[9px] text-[#9aa0a6] font-black uppercase tracking-[0.2em]">{product.category}</span>
              <h3 className="text-sm font-black text-[#3c4043] line-clamp-2 leading-snug group-hover:text-[#1a73e8] transition-colors">{product.name}</h3>
              <p className="text-[10px] text-[#5f6368] font-mono mt-2 opacity-50 uppercase">SKU: {product.reference}</p>
            </div>
            <div className="px-6 py-4 border-t border-[#f1f3f4] flex justify-between items-center bg-[#fcfcfc]">
              <div>
                <p className="text-[8px] font-black text-[#9aa0a6] uppercase tracking-tighter">Prix Horizon</p>
                <span className="text-base font-black text-[#202124]">{product.price.toLocaleString()} F</span>
              </div>
              <div className="p-2 text-[#dadce0] group-hover:text-[#1a73e8] transition-all"><ChevronRight size={20}/></div>
            </div>
          </div>
        ))}
      </div>

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-6 pt-10">
           <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="p-3 border bg-white disabled:opacity-30 hover:bg-gray-50 transition-all shadow-sm"><ChevronLeft size={24} /></button>
           <span className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest">Page {currentPage} de {totalPages}</span>
           <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="p-3 border bg-white disabled:opacity-30 hover:bg-gray-50 transition-all shadow-sm"><ChevronRight size={24} /></button>
        </div>
      )}

      {/* MODAL MAPPING IMPORT */}
      <Modal isOpen={isMappingModalOpen} onClose={() => setIsMappingModalOpen(false)} title="Mapping Colonnes Excel Horizon" size="lg">
         <div className="space-y-8">
            <div className="p-6 bg-blue-50 border border-blue-200 flex items-start gap-4">
               <Info className="text-blue-600 mt-1" size={20} />
               <div>
                  <p className="text-xs font-black text-blue-900 uppercase">Configuration de l'Injecteur</p>
                  <p className="text-[10px] text-blue-700 mt-1">Veuillez faire correspondre les en-têtes de votre fichier Excel aux champs système de Royal Plaza.</p>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {[
                 { id: 'reference', label: 'Référence / SKU', required: true },
                 { id: 'name', label: 'Désignation Commerciale', required: true },
                 { id: 'brand', label: 'Marque / Constructeur', required: false },
                 { id: 'price', label: 'Prix de Vente (TTC)', required: false },
                 { id: 'category', label: 'Catégorie Produit', required: false },
                 { id: 'warrantyMonths', label: 'Garantie (Mois)', required: false }
               ].map(field => (
                 <div key={field.id} className="space-y-2">
                    <label className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest ml-1">
                      {field.label} {field.required && <span className="text-red-500">*</span>}
                    </label>
                    <select 
                      value={mapping[field.id]} 
                      onChange={e => setMapping({...mapping, [field.id]: e.target.value})}
                      className="w-full h-11 bg-white border-[#dadce0] font-bold text-xs"
                    >
                       <option value="">-- Ignorer ce champ --</option>
                       {excelHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                 </div>
               ))}
            </div>

            <div className="flex gap-4 pt-8 border-t border-[#dadce0]">
               <button onClick={handleFinalImport} disabled={isSaving || !mapping.reference || !mapping.name} className="flex-1 btn-google-primary justify-center py-5 text-xs font-black uppercase tracking-[0.2em] shadow-xl">
                 {isSaving ? <Loader2 size={20} className="animate-spin" /> : <><Upload size={20} /> Lancer l'injection Cloud</>}
               </button>
               <button onClick={() => setIsMappingModalOpen(false)} className="btn-google-outlined px-12 font-black uppercase text-[10px]">Annuler</button>
            </div>
         </div>
      </Modal>

      {/* DRAWER DETAILS */}
      <Drawer
        isOpen={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        title="Fiche Technique Horizon"
        subtitle={`Réf: ${selectedProduct?.reference}`}
        icon={<ShoppingBag size={20} />}
        footer={
          <div className="flex gap-3">
             <button onClick={() => setSelectedProduct(null)} className="flex-1 btn-google-outlined justify-center py-4 text-xs font-black uppercase tracking-widest">Fermer</button>
             {isEditor && (
               <button onClick={() => { if(selectedProduct) { setEditingProduct(selectedProduct); setPreviewImageUrl(selectedProduct.image || ''); setIsModalOpen(true); setSelectedProduct(null); } }} className="flex-1 btn-google-primary justify-center py-4 text-xs font-black uppercase tracking-widest shadow-xl">
                 <Edit3 size={18} /> Modifier
               </button>
             )}
          </div>
        }
      >
        {selectedProduct && (
          <div className="space-y-10">
             <div className="w-full aspect-video bg-[#f8f9fa] border border-[#dadce0] flex items-center justify-center overflow-hidden shadow-inner">
                {selectedProduct.image ? <img src={selectedProduct.image} className="w-full h-full object-contain p-4" alt="" /> : <ImageIcon size={80} className="text-[#dadce0] opacity-20" />}
             </div>
             <div className="space-y-6">
                <div>
                   <span className="text-[10px] font-black text-[#1a73e8] uppercase tracking-[0.3em] bg-blue-50 px-3 py-1 border border-blue-100">{selectedProduct.brand}</span>
                   <h3 className="text-3xl font-black text-[#202124] tracking-tighter leading-tight mt-4">{selectedProduct.name}</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div className="p-6 bg-blue-50 border border-blue-100 rounded-none shadow-sm">
                      <p className="text-[9px] font-black text-blue-700 uppercase tracking-widest mb-2 flex items-center gap-2"><ShieldCheck size={10}/> Protection</p>
                      <p className="text-2xl font-black text-blue-900">{selectedProduct.warrantyMonths} <span className="text-xs font-bold uppercase">Mois</span></p>
                   </div>
                   <div className="p-6 bg-green-50 border border-green-100 rounded-none shadow-sm">
                      <p className="text-[9px] font-black text-green-700 uppercase tracking-widest mb-2 flex items-center gap-2"><DollarSign size={10}/> Prix TTC</p>
                      <p className="text-2xl font-black text-green-900">{selectedProduct.price.toLocaleString()} <span className="text-xs font-bold uppercase">F</span></p>
                   </div>
                </div>
             </div>
          </div>
        )}
      </Drawer>

      {/* MODAL ÉDITION MANUELLE */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Édition Catalogue Horizon" size="lg">
        <form onSubmit={handleSaveProduct} className="space-y-10">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest ml-1">Référence Unique</label>
                 <input name="reference" type="text" defaultValue={editingProduct?.reference} required className="h-12 bg-[#f8f9fa] border-none font-mono uppercase font-black" />
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest ml-1">Constructeur</label>
                 <select name="brand" defaultValue={editingProduct?.brand || 'LG'} className="h-12 bg-[#f8f9fa] border-none font-black px-4">
                    {brands.map(b => <option key={b} value={b}>{b}</option>)}
                 </select>
              </div>
              <div className="md:col-span-2 space-y-2">
                 <label className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest ml-1">Nom Commercial</label>
                 <input name="name" type="text" defaultValue={editingProduct?.name} required className="h-12 bg-[#f8f9fa] border-none font-black" />
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest ml-1">URL Visuel HD</label>
                 <input type="url" value={previewImageUrl} onChange={e => setPreviewImageUrl(e.target.value)} className="h-12 bg-[#f8f9fa] border-none text-xs" placeholder="https://..." />
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest ml-1">Prix Public (F)</label>
                 <input name="price" type="number" defaultValue={editingProduct?.price} className="h-12 bg-[#f8f9fa] border-none font-black text-blue-600" />
              </div>
           </div>
           <div className="flex gap-4 pt-8 border-t border-[#dadce0]">
              <button type="submit" disabled={isSaving} className="btn-google-primary flex-1 justify-center py-5 text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-blue-600/20">
                {isSaving ? <Loader2 className="animate-spin" size={20}/> : <><Save size={20} /> Valider la fiche</>}
              </button>
              <button type="button" onClick={() => setIsModalOpen(false)} className="btn-google-outlined px-12 font-black uppercase text-[10px] tracking-widest">Annuler</button>
           </div>
        </form>
      </Modal>
    </div>
  );
};

export default Products;
