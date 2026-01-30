
import React, { useState, useMemo, useRef } from 'react';
import { 
  Plus, Search, ShoppingBag, Filter, Upload, Edit3, Trash2, Save, X, Database, 
  CheckCircle2, Tag, ChevronRight, CheckSquare, Square,
  Loader2, Box, CreditCard, ShieldCheck, Package, ArrowUpRight,
  AlertTriangle, Info, Hash, Archive, BarChart3, Camera, DollarSign, History,
  Link as LinkIcon, Image as ImageIcon
} from 'lucide-react';
import { useData, useNotifications, useUser } from '../App';
import { Product, Ticket } from '../types';
import Modal from '../components/Modal';

const ITEMS_PER_PAGE = 12;

const Products: React.FC = () => {
  const { products, tickets, saveProduct, deleteProduct, brands, refreshAll } = useData();
  const { currentUser } = useUser();
  const { addNotification } = useNotifications();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Toutes');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedProductForDetails, setSelectedProductForDetails] = useState<Product | null>(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string>('');

  const isEditor = currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER';

  // LOGIQUE DE FILTRAGE
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

  // ACTIONS
  const toggleSelect = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!isEditor) return;
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedIds(newSelected);
  };

  const openAddModal = () => {
    setEditingProduct(null);
    setPreviewImageUrl('');
    setIsModalOpen(true);
  };

  const openEditModal = (product: Product, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingProduct(product);
    setPreviewImageUrl(product.image || '');
    setIsModalOpen(true);
  };

  const handleDeleteIndividual = async (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    if (!isEditor) return;
    if (window.confirm(`Supprimer définitivement la référence ${product.reference} ?`)) {
      await deleteProduct(product.id);
      addNotification({ title: 'Catalogue', message: 'Produit supprimé du cloud.', type: 'info' });
      if (selectedProductForDetails?.id === product.id) setSelectedProductForDetails(null);
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
    } finally {
      setIsSaving(false);
    }
  };

  const productTickets = useMemo(() => {
    if (!selectedProductForDetails) return [];
    return tickets.filter(t => t.productReference === selectedProductForDetails.reference);
  }, [selectedProductForDetails, tickets]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-normal text-[#3c4043]">Catalogue Produits</h1>
          <p className="text-[#5f6368] text-sm">Gestion des références et garanties constructeurs.</p>
        </div>
        {isEditor && (
          <button onClick={openAddModal} className="btn-google-primary shadow-lg shadow-blue-600/10 h-11">
            <Plus size={18} /> Nouveau Produit
          </button>
        )}
      </header>

      {/* RECHERCHE & FILTRES */}
      <div className="google-card p-4 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
           <Search className="absolute left-3 top-3 text-[#5f6368]" size={18} />
           <input 
            type="text" 
            placeholder="Rechercher une référence, un nom ou une marque..." 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
            className="pl-10 h-11 w-full" 
           />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="h-11 px-4 min-w-[160px] bg-white border-[#dadce0] rounded-xl font-bold">
             {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>
      </div>

      {/* GRILLE DE PRODUITS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {paginatedProducts.map((product) => (
          <div 
            key={product.id} 
            onClick={() => setSelectedProductForDetails(product)}
            className={`google-card p-4 group relative cursor-pointer border-2 transition-all hover:border-[#1a73e8] flex flex-col ${selectedIds.has(product.id) ? 'border-[#1a73e8] bg-[#e8f0fe]/30' : 'border-transparent'}`}
          >
            {isEditor && (
              <div onClick={(e) => toggleSelect(e, product.id)} className="absolute top-3 right-3 z-10">
                 {selectedIds.has(product.id) ? <CheckSquare size={18} className="text-[#1a73e8]" /> : <Square size={18} className="text-[#dadce0] group-hover:opacity-100 opacity-0 transition-opacity" />}
              </div>
            )}
            
            <div className="w-full aspect-square bg-[#f8f9fa] rounded-2xl mb-4 flex items-center justify-center overflow-hidden border border-[#f1f3f4] relative">
              {product.image ? (
                <img 
                  src={product.image} 
                  alt={product.name} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                  onError={(e) => { (e.target as any).src = 'https://placehold.co/400x400?text=Produit+Plaza'; }}
                />
              ) : (
                <div className="flex flex-col items-center gap-3 opacity-20 group-hover:opacity-40 transition-opacity">
                  <ImageIcon size={64} className="text-[#dadce0]" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-center px-4">Image non disponible</span>
                </div>
              )}
              <div className="absolute top-3 left-3">
                 <span className="text-[8px] font-black text-[#1a73e8] uppercase bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg border border-blue-100 shadow-sm">{product.brand}</span>
              </div>
            </div>

            <div className="space-y-1 flex-1">
              <span className="text-[9px] text-[#9aa0a6] font-black uppercase tracking-widest">{product.category}</span>
              <h3 className="text-sm font-bold text-[#3c4043] line-clamp-2 leading-snug mt-1 group-hover:text-[#1a73e8] transition-colors">{product.name}</h3>
              <p className="text-[10px] text-[#5f6368] font-mono mt-1 opacity-50">Ref: {product.reference}</p>
            </div>

            <div className="mt-4 pt-4 border-t border-[#f1f3f4] flex justify-between items-center">
              <div>
                <p className="text-[8px] font-black text-[#9aa0a6] uppercase tracking-tighter">Prix Horizon</p>
                <span className="text-base font-black text-[#1a73e8]">{product.price.toLocaleString()} F</span>
              </div>
              <div className="flex gap-1">
                {isEditor && (
                  <button onClick={(e) => openEditModal(product, e)} className="p-2 text-[#5f6368] hover:bg-[#e8f0fe] hover:text-[#1a73e8] rounded-xl transition-all" title="Modifier">
                    <Edit3 size={16}/>
                  </button>
                )}
                <div className="p-2 text-[#dadce0] group-hover:text-[#1a73e8] transition-all">
                  <ChevronRight size={18}/>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 pt-8">
           <button 
            disabled={currentPage === 1} 
            onClick={() => setCurrentPage(p => p - 1)}
            className="p-2.5 border rounded-full disabled:opacity-30 hover:bg-[#f1f3f4] transition-all active:scale-90"
           >
             <ChevronRight size={20} className="rotate-180" />
           </button>
           <span className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest">Page {currentPage} / {totalPages}</span>
           <button 
            disabled={currentPage === totalPages} 
            onClick={() => setCurrentPage(p => p + 1)}
            className="p-2.5 border rounded-full disabled:opacity-30 hover:bg-[#f1f3f4] transition-all active:scale-90"
           >
             <ChevronRight size={20} />
           </button>
        </div>
      )}

      {/* VOLET DÉTAILS PRODUIT */}
      {selectedProductForDetails && (
        <>
          <div className="fixed inset-0 bg-black/25 backdrop-blur-[2px] z-[60] animate-in fade-in" onClick={() => setSelectedProductForDetails(null)} />
          <div className="fixed right-0 top-0 h-screen w-[500px] bg-white z-[70] flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
             <div className="p-6 border-b bg-[#f8f9fa] flex items-center justify-between">
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 rounded-2xl bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center border border-[#d2e3fc] shadow-sm">
                      <Box size={20} />
                   </div>
                   <div>
                      <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#5f6368]">Catalogue Horizon</h2>
                      <p className="text-sm font-black text-[#202124]">Fiche Technique Plaza</p>
                   </div>
                </div>
                <button onClick={() => setSelectedProductForDetails(null)} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><X size={20}/></button>
             </div>

             <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                <div className="space-y-6">
                   <div className="w-full aspect-video bg-[#f8f9fa] rounded-[32px] border border-[#dadce0] flex items-center justify-center overflow-hidden shadow-inner">
                      {selectedProductForDetails.image ? (
                        <img src={selectedProductForDetails.image} className="w-full h-full object-contain p-4" alt={selectedProductForDetails.name} />
                      ) : (
                        <div className="flex flex-col items-center gap-2 opacity-20">
                          <Package size={64} className="text-[#dadce0]" />
                          <p className="text-[10px] font-black uppercase tracking-widest text-center px-10">Image non disponible pour cette référence</p>
                        </div>
                      )}
                   </div>
                   <div>
                      <span className="text-[10px] font-black text-[#1a73e8] uppercase tracking-[0.3em] bg-blue-50 px-3 py-1 rounded-full border border-blue-100">{selectedProductForDetails.brand}</span>
                      <h3 className="text-2xl font-black text-[#202124] tracking-tight leading-tight mt-4">{selectedProductForDetails.name}</h3>
                      <p className="text-sm text-[#5f6368] font-medium mt-2 flex items-center gap-2">
                        <Hash size={14} className="text-gray-300"/> Référence Catalogue : <span className="font-mono font-black text-[#1a73e8]">{selectedProductForDetails.reference}</span>
                      </p>
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="p-6 bg-blue-50 border border-blue-100 rounded-[32px] shadow-sm">
                      <p className="text-[9px] font-black text-blue-700 uppercase tracking-widest mb-2">Garantie Plaza</p>
                      <div className="flex items-center gap-3">
                        <ShieldCheck size={20} className="text-blue-600" />
                        <span className="text-2xl font-black text-blue-900">{selectedProductForDetails.warrantyMonths} <span className="text-xs font-bold">MOIS</span></span>
                      </div>
                   </div>
                   <div className="p-6 bg-green-50 border border-green-100 rounded-[32px] shadow-sm">
                      <p className="text-[9px] font-black text-green-700 uppercase tracking-widest mb-2">Prix de Vente</p>
                      <div className="flex items-center gap-3">
                        <CreditCard size={20} className="text-green-600" />
                        <span className="text-2xl font-black text-green-900">{selectedProductForDetails.price.toLocaleString()} <span className="text-xs font-bold">F</span></span>
                      </div>
                   </div>
                </div>

                <section className="space-y-4">
                   <h4 className="text-[11px] font-black text-[#9aa0a6] uppercase tracking-[0.2em] flex items-center gap-2">
                      <History size={16} /> Registre des Sinistres SAV
                   </h4>
                   <div className="space-y-3">
                      {productTickets.length > 0 ? productTickets.map(t => (
                        <div key={t.id} className="p-5 bg-white border border-[#dadce0] rounded-[24px] flex items-center justify-between hover:border-[#1a73e8] transition-all group">
                           <div>
                              <p className="text-xs font-black text-[#3c4043]">Dossier #{t.id}</p>
                              <p className="text-[10px] text-[#5f6368] font-bold mt-0.5">{t.customerName}</p>
                           </div>
                           <span className={`text-[8px] font-black px-3 py-1 rounded-full border uppercase tracking-widest ${t.status === 'Résolu' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                             {t.status}
                           </span>
                        </div>
                      )) : (
                        <div className="p-10 text-center border-2 border-dashed border-[#dadce0] rounded-[40px] bg-gray-50/50">
                           <CheckCircle2 size={32} className="mx-auto text-green-100 mb-3" />
                           <p className="text-[10px] font-black text-[#9aa0a6] uppercase tracking-widest">Aucune panne enregistrée sur ce modèle</p>
                        </div>
                      )}
                   </div>
                </section>
             </div>

             <div className="p-6 border-t bg-white flex gap-3">
                {isEditor && (
                  <button 
                    onClick={() => openEditModal(selectedProductForDetails)}
                    className="flex-1 btn-google-primary justify-center py-4 text-[11px] font-black uppercase tracking-widest shadow-xl"
                  >
                    <Edit3 size={16} /> Éditer la fiche
                  </button>
                )}
                <button 
                  onClick={() => setSelectedProductForDetails(null)}
                  className="flex-1 btn-google-outlined justify-center text-[11px] font-black uppercase tracking-widest"
                >
                  Fermer
                </button>
             </div>
          </div>
        </>
      )}

      {/* MODAL GESTION PRODUIT */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => !isSaving && setIsModalOpen(false)} 
        title={editingProduct ? `Mise à jour Cloud : ${editingProduct.reference}` : "Nouvelle Entrée au Catalogue"}
        size="lg"
      >
        <form onSubmit={handleSaveProduct} className="space-y-6">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                 <label className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest ml-1">Référence Unique</label>
                 <input name="reference" type="text" defaultValue={editingProduct?.reference || ''} required placeholder="ex: LG-INV-450" className="bg-white font-mono uppercase h-11" />
              </div>
              <div className="space-y-1.5">
                 <label className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest ml-1">Constructeur</label>
                 <select name="brand" defaultValue={editingProduct?.brand || 'LG'} className="bg-white font-black h-11">
                    {brands.map(b => <option key={b} value={b}>{b}</option>)}
                 </select>
              </div>
              <div className="md:col-span-2 space-y-1.5">
                 <label className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest ml-1">Nom Commercial du Produit</label>
                 <input name="name" type="text" defaultValue={editingProduct?.name || ''} required placeholder="ex: Réfrigérateur LG InstaView 450L Silver" className="bg-white font-black h-11" />
              </div>
              <div className="space-y-1.5">
                 <label className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest ml-1">URL Visuel (Haute Déf)</label>
                 <div className="relative">
                    <input 
                      type="url" 
                      value={previewImageUrl} 
                      onChange={(e) => setPreviewImageUrl(e.target.value)}
                      placeholder="https://images.unsplash.com/..." 
                      className="bg-white pl-10 h-11" 
                    />
                    <LinkIcon size={14} className="absolute left-3.5 top-3.5 text-gray-300" />
                 </div>
              </div>
              <div className="space-y-1.5">
                 <label className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest ml-1">Secteur d'Activité</label>
                 <select name="category" defaultValue={editingProduct?.category || 'Électroménager'} className="bg-white h-11 font-bold">
                    <option value="Électroménager">Électroménager</option>
                    <option value="Climatisation">Climatisation</option>
                    <option value="Électronique">Électronique</option>
                    <option value="Mobilier">Mobilier</option>
                    <option value="Bureau">Bureau</option>
                 </select>
              </div>
              <div className="space-y-1.5">
                 <label className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest ml-1">Validité Garantie (Mois)</label>
                 <input name="warrantyMonths" type="number" defaultValue={editingProduct?.warrantyMonths || 12} required className="bg-white font-black h-11" />
              </div>
              <div className="md:col-span-2 space-y-1.5">
                 <label className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest ml-1">Prix de Vente Conseillé (FCFA)</label>
                 <div className="relative">
                    <input name="price" type="number" defaultValue={editingProduct?.price || 0} required className="bg-white h-12 text-xl font-black pl-11 border-blue-200 focus:border-[#1a73e8]" />
                    <DollarSign size={20} className="absolute left-3.5 top-3 text-[#1a73e8]" />
                 </div>
              </div>
           </div>

           <div className="p-6 bg-[#f8f9fa] border border-dashed border-[#dadce0] rounded-3xl flex items-center gap-8">
              <div className="w-28 h-28 bg-white rounded-2xl flex items-center justify-center text-[#1a73e8] border shadow-sm overflow-hidden shrink-0 group">
                 {previewImageUrl ? (
                    <img src={previewImageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform" alt="Preview" onError={() => setPreviewImageUrl('')} />
                 ) : (
                    <Camera size={40} className="opacity-10" />
                 )}
              </div>
              <div>
                 <p className="text-xs font-black text-[#3c4043] uppercase tracking-widest">Prévisualisation Horizon</p>
                 <p className="text-[10px] text-[#5f6368] mt-2 leading-relaxed">
                    {previewImageUrl ? "Visuel détecté. Il sera affiché sur tous les terminaux Horizon après synchronisation." : "Veuillez coller une URL d'image (HTTPS) pour faciliter l'identification visuelle du produit par les agents."}
                 </p>
              </div>
           </div>

           <div className="flex gap-4 pt-8 border-t border-[#dadce0]">
              <button type="submit" disabled={isSaving} className="btn-google-primary flex-1 justify-center py-4 shadow-xl shadow-blue-600/20 text-[11px] font-black uppercase tracking-widest">
                {isSaving ? <Loader2 className="animate-spin" size={18} /> : <><Save size={18} /> {editingProduct ? "Mettre à jour le catalogue" : "Inscrire la référence"}</>}
              </button>
              <button type="button" onClick={() => setIsModalOpen(false)} className="btn-google-outlined px-10 uppercase text-[10px] font-black tracking-widest">Annuler</button>
           </div>
        </form>
      </Modal>
    </div>
  );
};

export default Products;
