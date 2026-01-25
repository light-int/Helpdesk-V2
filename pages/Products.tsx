
import React, { useState, useMemo, useRef } from 'react';
import { 
  Plus, Search, ShoppingBag, Filter, Upload, Edit3, Trash2, Save, X, Database, 
  CheckCircle2, Tag, ChevronRight, CheckSquare, Square,
  Loader2, Box, CreditCard, ShieldCheck, Package, ArrowUpRight,
  AlertTriangle, Info, Hash, Archive, BarChart3, Camera, DollarSign, History
} from 'lucide-react';
import { useData, useNotifications, useUser } from '../App';
import { Product, Ticket } from '../types';
import Modal from '../components/Modal';

const ITEMS_PER_PAGE = 12;

const Products: React.FC = () => {
  const { products, tickets, saveProduct, deleteProduct, brands } = useData();
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
      image: editingProduct?.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.get('name') as string)}&background=f1f3f4&color=1a73e8`
    };

    try {
      await saveProduct(productData);
      setIsModalOpen(false);
      setEditingProduct(null);
      addNotification({ title: 'Catalogue', message: 'Référence mise à jour avec succès.', type: 'success' });
    } catch (err) {
      addNotification({ title: 'Erreur', message: 'Échec de la sauvegarde Cloud.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  // Statistiques pour le volet de détails
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
          <button onClick={() => { setEditingProduct(null); setIsModalOpen(true); }} className="btn-google-primary shadow-lg shadow-blue-600/10">
            <Plus size={18} /> Nouveau Produit
          </button>
        )}
      </header>

      {/* RECHERCHE & FILTRES */}
      <div className="google-card p-4 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
           <Search className="absolute left-3 top-2.5 text-[#5f6368]" size={18} />
           <input 
            type="text" 
            placeholder="Rechercher une référence, un nom ou une marque..." 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
            className="pl-10 h-10 w-full" 
           />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="h-10 px-3 min-w-[160px] bg-white border-[#dadce0]">
             {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>
      </div>

      {/* GRILLE DE PRODUITS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {paginatedProducts.map((product) => (
          <div 
            key={product.id} 
            onClick={() => setSelectedProductForDetails(product)}
            className={`google-card p-5 group relative cursor-pointer border-l-4 transition-all hover:border-l-[#1a73e8] ${selectedIds.has(product.id) ? 'border-l-[#1a73e8] bg-[#e8f0fe]/30' : 'border-l-transparent'}`}
          >
            {isEditor && (
              <div onClick={(e) => toggleSelect(e, product.id)} className="absolute top-4 right-4 z-10">
                 {selectedIds.has(product.id) ? <CheckSquare size={18} className="text-[#1a73e8]" /> : <Square size={18} className="text-[#dadce0] group-hover:opacity-100 opacity-0 transition-opacity" />}
              </div>
            )}
            
            <div className="flex flex-col h-full">
              <div className="w-full h-32 bg-[#f8f9fa] rounded-lg mb-4 flex items-center justify-center overflow-hidden border border-[#f1f3f4]">
                {product.image ? (
                  <img src={product.image} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                ) : (
                  <Package size={40} className="text-[#dadce0]" />
                )}
              </div>

              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black text-[#1a73e8] uppercase tracking-widest">{product.brand}</span>
                  <span className="text-[9px] text-[#9aa0a6] font-bold">• {product.category}</span>
                </div>
                <h3 className="text-sm font-bold text-[#3c4043] line-clamp-2 leading-snug group-hover:text-[#1a73e8] transition-colors">{product.name}</h3>
                <p className="text-[10px] text-[#5f6368] font-mono mt-1">Ref: {product.reference}</p>
              </div>

              <div className="mt-4 pt-4 border-t border-[#f1f3f4] flex justify-between items-end">
                <div>
                  <p className="text-[8px] font-black text-[#9aa0a6] uppercase">Prix Public</p>
                  <span className="text-sm font-black text-[#3c4043]">{product.price.toLocaleString()} F</span>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {isEditor && (
                    <>
                      <button onClick={(e) => { e.stopPropagation(); setEditingProduct(product); setIsModalOpen(true); }} className="p-1.5 text-[#5f6368] hover:bg-[#e8f0fe] hover:text-[#1a73e8] rounded" title="Modifier"><Edit3 size={14}/></button>
                      <button onClick={(e) => handleDeleteIndividual(e, product)} className="p-1.5 text-[#5f6368] hover:bg-red-50 hover:text-red-600 rounded" title="Supprimer"><Trash2 size={14}/></button>
                    </>
                  )}
                  <button className="p-1.5 text-[#5f6368] hover:bg-[#f1f3f4] rounded"><ChevronRight size={14}/></button>
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
            className="p-2 border rounded-full disabled:opacity-30 hover:bg-[#f1f3f4]"
           >
             <ChevronRight size={20} className="rotate-180" />
           </button>
           <span className="text-xs font-bold text-[#5f6368]">Page {currentPage} sur {totalPages}</span>
           <button 
            disabled={currentPage === totalPages} 
            onClick={() => setCurrentPage(p => p + 1)}
            className="p-2 border rounded-full disabled:opacity-30 hover:bg-[#f1f3f4]"
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
             <div className="p-4 border-b bg-[#f8f9fa] flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <div className="w-8 h-8 rounded-lg bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center border border-[#d2e3fc]">
                      <Box size={18} />
                   </div>
                   <h2 className="text-xs font-black uppercase tracking-widest text-[#5f6368]">Fiche Produit Plaza</h2>
                </div>
                <button onClick={() => setSelectedProductForDetails(null)} className="p-1.5 hover:bg-gray-200 rounded-full transition-colors"><X size={20}/></button>
             </div>

             <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                <div className="space-y-6">
                   <div className="w-full aspect-video bg-[#f8f9fa] rounded-2xl border border-[#dadce0] flex items-center justify-center overflow-hidden">
                      {selectedProductForDetails.image ? (
                        <img src={selectedProductForDetails.image} className="w-full h-full object-contain" alt="" />
                      ) : (
                        <Package size={64} className="text-[#dadce0]" />
                      )}
                   </div>
                   <div>
                      <span className="text-[10px] font-black text-[#1a73e8] uppercase tracking-[0.2em]">{selectedProductForDetails.brand}</span>
                      <h3 className="text-2xl font-black text-[#202124] tracking-tight leading-tight">{selectedProductForDetails.name}</h3>
                      <p className="text-sm text-[#5f6368] font-medium mt-1">Référence Catalogue : <span className="font-mono text-[#1a73e8]">{selectedProductForDetails.reference}</span></p>
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="p-5 bg-blue-50 border border-blue-100 rounded-2xl">
                      <p className="text-[9px] font-black text-blue-700 uppercase tracking-widest mb-1">Garantie</p>
                      <div className="flex items-center gap-2">
                        <ShieldCheck size={18} className="text-blue-600" />
                        <span className="text-xl font-black text-blue-900">{selectedProductForDetails.warrantyMonths} <span className="text-[10px]">Mois</span></span>
                      </div>
                   </div>
                   <div className="p-5 bg-green-50 border border-green-100 rounded-2xl">
                      <p className="text-[9px] font-black text-green-700 uppercase tracking-widest mb-1">Prix Public</p>
                      <div className="flex items-center gap-2">
                        <CreditCard size={18} className="text-green-600" />
                        <span className="text-xl font-black text-green-900">{selectedProductForDetails.price.toLocaleString()} <span className="text-[10px]">F</span></span>
                      </div>
                   </div>
                </div>

                {/* Historique SAV pour ce produit */}
                <section className="space-y-4">
                   <h4 className="text-[10px] font-black text-[#9aa0a6] uppercase tracking-[0.2em] flex items-center gap-2">
                      <History size={16} /> Historique des Dossiers SAV
                   </h4>
                   <div className="space-y-3">
                      {productTickets.length > 0 ? productTickets.map(t => (
                        <div key={t.id} className="p-4 bg-white border border-[#dadce0] rounded-xl flex items-center justify-between hover:border-[#1a73e8] transition-all group">
                           <div>
                              <p className="text-xs font-bold text-[#3c4043]">Dossier #{t.id}</p>
                              <p className="text-[10px] text-[#5f6368] font-medium">{t.customerName}</p>
                           </div>
                           <span className={`text-[8px] font-black px-2 py-0.5 rounded border uppercase ${t.status === 'Résolu' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                             {t.status}
                           </span>
                        </div>
                      )) : (
                        <div className="p-8 text-center border-2 border-dashed border-[#dadce0] rounded-2xl">
                           <CheckCircle2 size={32} className="mx-auto text-green-100 mb-2" />
                           <p className="text-[10px] font-bold text-[#9aa0a6] uppercase">Aucun sinistre enregistré</p>
                        </div>
                      )}
                   </div>
                </section>
             </div>

             <div className="p-6 border-t bg-white flex gap-3">
                {isEditor && (
                  <button 
                    onClick={() => { setEditingProduct(selectedProductForDetails); setIsModalOpen(true); }}
                    className="flex-1 btn-google-primary justify-center py-4 text-xs font-black uppercase tracking-widest shadow-xl"
                  >
                    <Edit3 size={16} /> Modifier l'article
                  </button>
                )}
                <button 
                  onClick={() => setSelectedProductForDetails(null)}
                  className="flex-1 btn-google-outlined justify-center text-xs font-black uppercase tracking-widest"
                >
                  Fermer
                </button>
             </div>
          </div>
        </>
      )}

      {/* MODAL GESTION PRODUIT (CREATION/EDITION) */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => !isSaving && setIsModalOpen(false)} 
        title={editingProduct ? `Modifier la référence ${editingProduct.reference}` : "Nouvelle Référence Catalogue"}
        size="lg"
      >
        <form onSubmit={handleSaveProduct} className="space-y-6">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                 <label className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest">Référence Constructeur / Facture</label>
                 <input name="reference" type="text" defaultValue={editingProduct?.reference || ''} required placeholder="ex: LG-INV-450" className="bg-white font-mono uppercase" />
              </div>
              <div className="space-y-1.5">
                 <label className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest">Marque</label>
                 <select name="brand" defaultValue={editingProduct?.brand || 'LG'} className="bg-white font-bold">
                    {brands.map(b => <option key={b} value={b}>{b}</option>)}
                 </select>
              </div>
              <div className="md:col-span-2 space-y-1.5">
                 <label className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest">Nom Commercial Complet</label>
                 <input name="name" type="text" defaultValue={editingProduct?.name || ''} required placeholder="ex: Réfrigérateur LG InstaView 450L Silver" className="bg-white font-bold" />
              </div>
              <div className="space-y-1.5">
                 <label className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest">Domaine / Catégorie</label>
                 <select name="category" defaultValue={editingProduct?.category || 'Électroménager'} className="bg-white">
                    <option value="Électroménager">Électroménager</option>
                    <option value="Climatisation">Climatisation</option>
                    <option value="Électronique">Électronique</option>
                    <option value="Mobilier">Mobilier</option>
                    <option value="Bureau">Bureau</option>
                 </select>
              </div>
              <div className="space-y-1.5">
                 <label className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest">Durée Garantie (Mois)</label>
                 <input name="warrantyMonths" type="number" defaultValue={editingProduct?.warrantyMonths || 12} required className="bg-white font-black" />
              </div>
              <div className="md:col-span-2 space-y-1.5">
                 <label className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest">Prix Public Conseillé (FCFA)</label>
                 <div className="relative">
                    <input name="price" type="number" defaultValue={editingProduct?.price || 0} required className="bg-white h-12 text-lg font-black pl-10" />
                    <DollarSign size={20} className="absolute left-3 top-3 text-[#5f6368]" />
                 </div>
              </div>
           </div>

           <div className="p-5 bg-[#f8f9fa] border border-dashed border-[#dadce0] rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-[#1a73e8] border"><Camera size={24}/></div>
                 <div>
                    <p className="text-xs font-black text-[#3c4043] uppercase">Image du produit</p>
                    <p className="text-[10px] text-[#5f6368]">URL ou Identifiant Média Cloud</p>
                 </div>
              </div>
              <button type="button" className="text-[10px] font-black text-[#1a73e8] uppercase hover:underline">Modifier</button>
           </div>

           <div className="flex gap-3 pt-6 border-t border-[#dadce0]">
              <button type="submit" disabled={isSaving} className="btn-google-primary flex-1 justify-center py-4 shadow-xl shadow-blue-600/20 text-xs font-black uppercase tracking-widest">
                {isSaving ? <Loader2 size={18} className="animate-spin" /> : <><Save size={18} /> {editingProduct ? "Mettre à jour la fiche" : "Créer la référence"}</>}
              </button>
              <button type="button" onClick={() => setIsModalOpen(false)} className="btn-google-outlined px-10 uppercase text-[10px] font-black">Annuler</button>
           </div>
        </form>
      </Modal>
    </div>
  );
};

export default Products;
