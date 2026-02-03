
import React, { useState, useMemo, useEffect } from 'react';
import { 
  ShieldCheck, Search, RefreshCw, Plus, FileSpreadsheet,
  ShieldAlert, ChevronLeft, ChevronRight, X, SlidersHorizontal,
  RotateCcw, MapPin, Building2, BadgeCheck, Timer, Edit3, Trash2,
  Calendar, Package, User, CheckCircle2, AlertCircle
} from 'lucide-react';
import { useNotifications, useData, useUser } from '../App';
import { WarrantyRecord } from '../types';
import Modal from '../components/Modal';
import Drawer from '../components/Drawer';

const WarrantyLog: React.FC = () => {
  const { warranties, products, brands, isLoading, refreshAll, isSyncing, saveWarranty, deleteWarranty } = useData();
  const { addNotification } = useNotifications();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'expired'>('all');
  const [selectedWarranty, setSelectedWarranty] = useState<WarrantyRecord | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWarranty, setEditingWarranty] = useState<WarrantyRecord | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => { refreshAll(); }, []);

  const filteredWarranties = useMemo(() => {
    return (warranties || []).filter(w => {
      const isExpired = new Date(w.expiryDate) < new Date();
      const matchesSearch = (w.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (w.serialNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (w.product || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      let matchesTab = true;
      if (activeTab === 'active') matchesTab = !isExpired;
      if (activeTab === 'expired') matchesTab = isExpired;
      
      return matchesSearch && matchesTab;
    }).sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());
  }, [warranties, searchTerm, activeTab]);

  const stats = useMemo(() => {
    const total = warranties.length;
    const active = warranties.filter(w => new Date(w.expiryDate) >= new Date()).length;
    const expired = total - active;
    return { total, active, expired };
  }, [warranties]);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    const formData = new FormData(e.currentTarget);
    
    const purchaseDate = formData.get('purchaseDate') as string;
    const duration = parseInt(formData.get('durationMonths') as string);
    
    // Calcul de l'expiration
    const expiry = new Date(purchaseDate);
    expiry.setMonth(expiry.getMonth() + duration);

    const data: WarrantyRecord = {
      id: editingWarranty?.id || `W-${Date.now()}`,
      product: formData.get('product') as string,
      brand: formData.get('brand') as string,
      serialNumber: formData.get('serialNumber') as string,
      customerName: formData.get('customerName') as string,
      purchaseDate: purchaseDate,
      durationMonths: duration,
      expiryDate: expiry.toISOString().split('T')[0],
      isExtensionAvailable: formData.get('extension') === 'on'
    };

    try {
      await saveWarranty(data);
      addNotification({ title: 'Succès', message: 'Contrat Horizon synchronisé.', type: 'success' });
      setIsModalOpen(false);
    } catch (err) {
      addNotification({ title: 'Erreur', message: 'Impossible de sauvegarder le contrat.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Voulez-vous vraiment révoquer ce contrat de garantie ?')) return;
    try {
      await deleteWarranty(id);
      addNotification({ title: 'Supprimé', message: 'Contrat retiré du registre.', type: 'info' });
      if (selectedWarranty?.id === id) setSelectedWarranty(null);
    } catch (err) {
      addNotification({ title: 'Erreur', message: 'Échec de la suppression.', type: 'error' });
    }
  };

  const getStatusBadge = (expiry: string) => {
    const isExpired = new Date(expiry) < new Date();
    if (isExpired) return 'bg-[#fff1f2] text-[#e11d48] border-[#ffe4e6]';
    return 'bg-[#f0fdf4] text-[#16a34a] border-[#dcfce7]';
  };

  if (isLoading) return <div className="h-[80vh] flex items-center justify-center"><RefreshCw className="animate-spin text-[#3ecf8e]" size={32} /></div>;

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-sb-entry pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1c1c1c] tracking-tight">Registre Garanties</h1>
          <p className="text-xs text-[#686868] mt-1 font-medium">Management des contrats Horizon Care et protections matérielles.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={refreshAll} className="btn-sb-outline h-10 px-3">
             <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => { setEditingWarranty(null); setIsModalOpen(true); }} className="btn-sb-primary h-10 px-4">
            <ShieldCheck size={16} /> <span>Émettre un contrat</span>
          </button>
        </div>
      </header>

      {/* KPI Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Protections Actives', value: stats.active, icon: <ShieldCheck size={16}/>, color: 'text-[#3ecf8e]', bg: 'bg-[#f0fdf4]' },
          { label: 'Contrats Expirés', value: stats.expired, icon: <ShieldAlert size={16}/>, color: 'text-red-500', bg: 'bg-[#fff1f2]' },
          { label: 'Registre Total', value: stats.total, icon: <BadgeCheck size={16}/>, color: 'text-blue-500', bg: 'bg-[#eff6ff]' }
        ].map((s, i) => (
          <div key={i} className="sb-card flex items-center gap-4 py-4 px-6 border-[#ededed]">
             <div className={`p-3 rounded-xl ${s.bg} ${s.color} shadow-sm`}>{s.icon}</div>
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
            type="text" placeholder="Rechercher par S/N, client ou produit..." 
            className="w-full pl-10 h-12 bg-white"
            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex bg-[#f1f3f4] p-1 rounded-lg shrink-0 border border-[#ededed]">
          {[
            { id: 'all', label: 'Tout', icon: <Package size={12}/> },
            { id: 'active', label: 'Actifs', icon: <CheckCircle2 size={12}/> },
            { id: 'expired', label: 'Expirés', icon: <AlertCircle size={12}/> }
          ].map(st => (
            <button 
              key={st.id} 
              onClick={() => setActiveTab(st.id as any)} 
              className={`flex items-center gap-2 px-6 py-2 text-[10px] font-black uppercase rounded-md transition-all ${activeTab === st.id ? 'bg-white shadow-sm text-[#1c1c1c]' : 'text-[#686868] hover:text-[#1c1c1c]'}`}
            >
              {st.icon} {st.label}
            </button>
          ))}
        </div>
      </div>

      <div className="sb-table-container">
        <table className="w-full text-left sb-table">
          <thead>
            <tr>
              <th>Produit & S/N</th>
              <th>Propriétaire</th>
              <th>Acquisition</th>
              <th>Échéance</th>
              <th className="text-right">Protection</th>
            </tr>
          </thead>
          <tbody>
            {filteredWarranties.map((w) => {
              const isExpired = new Date(w.expiryDate) < new Date();
              return (
                <tr key={w.id} onClick={() => setSelectedWarranty(w)} className="cursor-pointer group hover:bg-[#fafafa]">
                  <td>
                    <p className="text-[13px] font-bold text-[#1c1c1c]">{w.product}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                       <span className="text-[9px] font-black text-[#3ecf8e] uppercase leading-none">{w.brand}</span>
                       <span className="text-[10px] font-mono text-[#686868]">#{w.serialNumber}</span>
                    </div>
                  </td>
                  <td>
                    <p className="text-[13px] font-bold text-[#1c1c1c]">{w.customerName}</p>
                  </td>
                  <td>
                    <div className="flex items-center gap-2 text-[#686868]">
                       <Calendar size={12} />
                       <span className="text-[11px] font-bold">{new Date(w.purchaseDate).toLocaleDateString()}</span>
                    </div>
                  </td>
                  <td>
                    <div className={`flex items-center gap-2 ${isExpired ? 'text-red-500' : 'text-[#1c1c1c]'}`}>
                       <Timer size={12} />
                       <span className="text-[11px] font-black">{new Date(w.expiryDate).toLocaleDateString()}</span>
                    </div>
                  </td>
                  <td className="text-right">
                     <span className={`px-2 py-0.5 rounded border text-[10px] font-black uppercase tracking-tight ${getStatusBadge(w.expiryDate)}`}>
                        {isExpired ? 'Protection Expirée' : 'Sous Protection'}
                     </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filteredWarranties.length === 0 && (
          <div className="p-24 text-center space-y-3 opacity-40">
            <ShieldCheck size={48} className="mx-auto text-[#686868]" />
            <p className="text-[13px] font-bold text-[#686868] uppercase tracking-widest">Aucun contrat trouvé</p>
          </div>
        )}
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingWarranty ? "Modifier Contrat" : "Émission Contrat Horizon Care"}
      >
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#686868] uppercase">Produit Horizon</label>
              <input name="product" type="text" list="prodList" defaultValue={editingWarranty?.product} placeholder="ex: Split LG Artic" required className="w-full" />
              <datalist id="prodList">
                 {products.map(p => <option key={p.id} value={p.name} />)}
              </datalist>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#686868] uppercase">Marque</label>
              <select name="brand" defaultValue={editingWarranty?.brand || 'LG'} className="w-full">
                 {brands.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#686868] uppercase">Numéro de Série (S/N)</label>
              <input name="serialNumber" type="text" defaultValue={editingWarranty?.serialNumber} placeholder="S/N..." required className="w-full font-mono uppercase" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#686868] uppercase">Client Bénéficiaire</label>
              <input name="customerName" type="text" defaultValue={editingWarranty?.customerName} placeholder="Nom complet client" required className="w-full" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#686868] uppercase">Date d'Acquisition</label>
              <input name="purchaseDate" type="date" defaultValue={editingWarranty?.purchaseDate || new Date().toISOString().split('T')[0]} required className="w-full" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#686868] uppercase">Durée Garantie (Mois)</label>
              <select name="durationMonths" defaultValue={editingWarranty?.durationMonths || 12} className="w-full">
                 <option value="6">6 Mois</option>
                 <option value="12">12 Mois (Standard)</option>
                 <option value="24">24 Mois (Horizon Plus)</option>
                 <option value="36">36 Mois (VIP)</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 bg-[#f8f9fa] rounded-lg border border-[#ededed]">
             <input type="checkbox" name="extension" id="extension" defaultChecked={editingWarranty?.isExtensionAvailable} className="rounded" />
             <label htmlFor="extension" className="text-xs font-bold text-[#1c1c1c] cursor-pointer">Activer l'option d'extension de garantie après terme</label>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-[#ededed]">
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn-sb-outline h-11 px-6">Annuler</button>
            <button type="submit" disabled={isSaving} className="btn-sb-primary h-11 px-8">
              {isSaving ? <RefreshCw className="animate-spin" size={14}/> : 'Enregistrer Contrat'}
            </button>
          </div>
        </form>
      </Modal>

      <Drawer isOpen={!!selectedWarranty} onClose={() => setSelectedWarranty(null)} title="Certificat Horizon Care" icon={<ShieldCheck size={18}/>}>
        {selectedWarranty && (
          <div className="space-y-8 animate-sb-entry pb-10">
            <div className="p-8 bg-[#f8f9fa] border border-[#ededed] rounded-xl flex flex-col items-center text-center">
               <div className={`w-20 h-20 rounded-3xl flex items-center justify-center shadow-sm mb-4 border ${new Date(selectedWarranty.expiryDate) < new Date() ? 'bg-white text-red-500 border-red-100' : 'bg-white text-[#3ecf8e] border-[#dcfce7]'}`}>
                  <ShieldCheck size={40} />
               </div>
               <h3 className="text-xl font-bold text-[#1c1c1c] tracking-tight">{selectedWarranty.product}</h3>
               <p className="text-[11px] text-[#686868] font-black uppercase tracking-[0.2em] mt-2">
                 Contrat N° {selectedWarranty.id}
               </p>
               <div className="mt-4 flex gap-2">
                  <span className="px-3 py-1 bg-white border border-[#ededed] text-[9px] font-black uppercase rounded-full shadow-sm">
                    {selectedWarranty.brand}
                  </span>
                  <span className="px-3 py-1 bg-white border border-[#ededed] text-[9px] font-black uppercase rounded-full shadow-sm">
                    S/N {selectedWarranty.serialNumber}
                  </span>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-5 bg-white border border-[#ededed] rounded-xl shadow-sm space-y-1">
                 <p className="text-[10px] font-black text-[#686868] uppercase tracking-widest">Date de début</p>
                 <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-[#3ecf8e]" />
                    <p className="text-base font-bold text-[#1c1c1c]">{new Date(selectedWarranty.purchaseDate).toLocaleDateString()}</p>
                 </div>
              </div>
              <div className="p-5 bg-white border border-[#ededed] rounded-xl shadow-sm space-y-1">
                 <p className="text-[10px] font-black text-[#686868] uppercase tracking-widest">Fin de protection</p>
                 <div className="flex items-center gap-2">
                    <Timer size={14} className={new Date(selectedWarranty.expiryDate) < new Date() ? 'text-red-500' : 'text-[#3ecf8e]'} />
                    <p className={`text-base font-black ${new Date(selectedWarranty.expiryDate) < new Date() ? 'text-red-500' : 'text-[#1c1c1c]'}`}>
                       {new Date(selectedWarranty.expiryDate).toLocaleDateString()}
                    </p>
                 </div>
              </div>
            </div>

            <section className="space-y-4">
               <h4 className="text-[11px] font-black text-[#686868] uppercase tracking-widest border-b border-[#ededed] pb-2">Informations Bénéficiaire</h4>
               <div className="p-4 bg-[#fcfcfc] border border-[#ededed] rounded-lg flex items-center gap-3">
                  <User size={18} className="text-[#3ecf8e]"/>
                  <div>
                    <p className="text-[13px] font-bold text-[#1c1c1c]">{selectedWarranty.customerName}</p>
                    <p className="text-[10px] text-[#686868] uppercase font-bold tracking-tight">Client Certifié Plaza</p>
                  </div>
               </div>
            </section>

            <div className="grid grid-cols-2 gap-3 pt-6">
               <button 
                onClick={() => { setEditingWarranty(selectedWarranty); setIsModalOpen(true); }}
                className="btn-sb-outline h-12 justify-center font-black uppercase text-[11px] tracking-widest"
               >
                  <Edit3 size={14}/><span>Modifier</span>
               </button>
               <button 
                onClick={(e) => handleDelete(selectedWarranty.id, e)}
                className="btn-sb-outline h-12 justify-center font-black uppercase text-[11px] tracking-widest text-red-500 hover:bg-red-50 hover:border-red-200"
               >
                  <Trash2 size={14}/><span>Révoquer</span>
               </button>
            </div>
            
            <button className="btn-sb-primary w-full h-12 justify-center font-black uppercase text-[11px] tracking-widest shadow-md">
               <FileSpreadsheet size={16}/> Imprimer Certificat PDF
            </button>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default WarrantyLog;
