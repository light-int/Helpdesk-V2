
import React, { useState, useMemo, useEffect } from 'react';
import { 
  ShieldCheck, Search, RefreshCw, 
  ShieldAlert, BadgeCheck, Timer, Edit3, Trash2,
  Package, CheckCircle2, AlertCircle
} from 'lucide-react';
import { useNotifications, useData } from '../App';
import { WarrantyRecord, Product } from '../types';
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

  useEffect(() => { refreshAll(); }, [refreshAll]);

  const filteredWarranties = useMemo(() => {
    return (warranties || []).filter((w: WarrantyRecord) => {
      const isExpired = new Date(w.expiryDate || '') < new Date();
      const matchesSearch = (w.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (w.serialNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (w.product || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      let matchesTab = true;
      if (activeTab === 'active') matchesTab = !isExpired;
      if (activeTab === 'expired') matchesTab = isExpired;
      
      return matchesSearch && matchesTab;
    }).sort((a: WarrantyRecord, b: WarrantyRecord) => new Date(b.purchaseDate || '').getTime() - new Date(a.purchaseDate || '').getTime());
  }, [warranties, searchTerm, activeTab]);

  const stats = useMemo(() => {
    const total = (warranties || []).length;
    const active = (warranties || []).filter((w: WarrantyRecord) => new Date(w.expiryDate || '') >= new Date()).length;
    const expired = total - active;
    return { total, active, expired };
  }, [warranties]);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    const formData = new FormData(e.currentTarget);
    
    const purchaseDate = formData.get('purchaseDate') as string;
    const duration = parseInt(formData.get('durationMonths') as string);
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
      addNotification({ title: 'Succès', message: 'Garantie enregistrée.', type: 'success' });
      setIsModalOpen(false);
    } catch (err) {
      addNotification({ title: 'Erreur', message: 'Échec sauvegarde.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Révoquer ce certificat ?')) return;
    try {
      await deleteWarranty(id);
      addNotification({ title: 'Supprimé', message: 'Garantie retirée.', type: 'info' });
      if (selectedWarranty?.id === id) setSelectedWarranty(null);
    } catch (err) {
      addNotification({ title: 'Erreur', message: 'Échec suppression.', type: 'error' });
    }
  };

  if (isLoading) return <div className="h-[80vh] flex items-center justify-center"><RefreshCw className="animate-spin text-[#3ecf8e]" size={32} /></div>;

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-sb-entry pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div><h1 className="text-2xl font-bold text-[#1c1c1c] tracking-tight">Registre Garanties</h1><p className="text-xs text-[#686868] mt-1 font-medium">Contrats de protection Horizon Care.</p></div>
        <div className="flex gap-2"><button onClick={refreshAll} className="btn-sb-outline h-10 px-3"><RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} /></button><button onClick={() => { setEditingWarranty(null); setIsModalOpen(true); }} className="btn-sb-primary h-10 px-4"><ShieldCheck size={16} /> <span>Émettre Contrat</span></button></div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[{ label: 'Actives', value: stats.active, icon: <ShieldCheck size={16}/>, color: 'text-[#3ecf8e]', bg: 'bg-[#f0fdf4]' }, { label: 'Expirés', value: stats.expired, icon: <ShieldAlert size={16}/>, color: 'text-red-500', bg: 'bg-[#fff1f2]' }, { label: 'Total', value: stats.total, icon: <BadgeCheck size={16}/>, color: 'text-blue-500', bg: 'bg-[#eff6ff]' }].map((s, i) => (
          <div key={i} className="sb-card flex items-center gap-4 py-4 px-6 border-[#ededed] shadow-sm"><div className={`p-3 rounded-xl ${s.bg} ${s.color}`}>{s.icon}</div><div><p className="text-[10px] font-bold text-[#686868] uppercase tracking-widest">{s.label}</p><p className="text-xl font-black text-[#1c1c1c]">{s.value}</p></div></div>
        ))}
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="relative group flex-1 w-full"><Search className="absolute left-3 top-3.5 text-[#686868]" size={18} /><input type="text" placeholder="S/N, client ou produit..." className="w-full pl-10 h-12 bg-white" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
        <div className="flex bg-[#f1f3f4] p-1 rounded-lg shrink-0 border border-[#ededed]">
          {[ { id: 'all', label: 'Tout', icon: <Package size={12}/> }, { id: 'active', label: 'Actifs', icon: <CheckCircle2 size={12}/> }, { id: 'expired', label: 'Expirés', icon: <AlertCircle size={12}/> } ].map(st => (
            <button key={st.id} onClick={() => setActiveTab(st.id as any)} className={`flex items-center gap-2 px-6 py-2 text-[10px] font-black uppercase rounded-md transition-all ${activeTab === st.id ? 'bg-white shadow-sm text-[#1c1c1c]' : 'text-[#686868] hover:text-[#1c1c1c]'}`}>{st.icon} {st.label}</button>
          ))}
        </div>
      </div>

      <div className="sb-table-container">
        <table className="w-full text-left sb-table">
          <thead><tr><th>Produit & S/N</th><th>Bénéficiaire</th><th>Échéance</th><th className="text-right">Protection</th></tr></thead>
          <tbody>
            {filteredWarranties.map((w: WarrantyRecord) => {
              const isExpired = new Date(w.expiryDate || '') < new Date();
              return (
                <tr key={w.id} onClick={() => setSelectedWarranty(w)} className="cursor-pointer group hover:bg-[#fafafa]">
                  <td><p className="text-[13px] font-bold">{w.product}</p><p className="text-[10px] font-mono text-[#686868]">#{w.serialNumber}</p></td>
                  <td><p className="text-[13px] font-bold">{w.customerName}</p></td>
                  <td><div className={`flex items-center gap-2 ${isExpired ? 'text-red-500' : 'text-[#1c1c1c]'}`}><Timer size={12}/><span className="text-[11px] font-black">{new Date(w.expiryDate).toLocaleDateString()}</span></div></td>
                  <td className="text-right"><span className={`px-2 py-0.5 rounded border text-[10px] font-black uppercase ${isExpired ? 'bg-red-50 text-red-500 border-red-100' : 'bg-green-50 text-green-600 border-green-100'}`}>{isExpired ? 'Expiré' : 'Actif'}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nouveau Certificat de Garantie">
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5"><label className="text-[10px] font-bold text-[#686868] uppercase">Produit</label><input name="product" type="text" list="pList" required className="w-full" /><datalist id="pList">{(products || []).map((p: Product) => <option key={p.id} value={p.name} />)}</datalist></div>
            <div className="space-y-1.5"><label className="text-[10px] font-bold text-[#686868] uppercase">Marque</label><select name="brand" className="w-full">{(brands || []).map((b: string) => <option key={b} value={b}>{b}</option>)}</select></div>
            <div className="space-y-1.5"><label className="text-[10px] font-bold text-[#686868] uppercase">Numéro de Série</label><input name="serialNumber" type="text" defaultValue={editingWarranty?.serialNumber} required className="w-full" /></div>
            <div className="space-y-1.5"><label className="text-[10px] font-bold text-[#686868] uppercase">Client</label><input name="customerName" type="text" defaultValue={editingWarranty?.customerName} required className="w-full" /></div>
            <div className="space-y-1.5"><label className="text-[10px] font-bold text-[#686868] uppercase">Date d'achat</label><input name="purchaseDate" type="date" defaultValue={editingWarranty?.purchaseDate} required className="w-full" /></div>
            <div className="space-y-1.5"><label className="text-[10px] font-bold text-[#686868] uppercase">Durée (Mois)</label><input name="durationMonths" type="number" defaultValue={editingWarranty?.durationMonths || 12} required className="w-full" /></div>
          </div>
          <div className="flex items-center gap-2">
            <input name="extension" type="checkbox" defaultChecked={editingWarranty?.isExtensionAvailable} className="rounded" />
            <label className="text-xs font-bold text-[#686868] uppercase">Extension disponible</label>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn-sb-outline">Annuler</button>
            <button type="submit" disabled={isSaving} className="btn-sb-primary">
              {isSaving ? <RefreshCw className="animate-spin" size={14}/> : 'Enregistrer'}
            </button>
          </div>
        </form>
      </Modal>

      <Drawer isOpen={!!selectedWarranty} onClose={() => setSelectedWarranty(null)} title="Détails Garantie" icon={<ShieldCheck size={16}/>}>
        {selectedWarranty && (
          <div className="space-y-8 animate-sb-entry">
            <div className="p-8 bg-[#f8f9fa] border border-[#ededed] rounded-lg text-center">
              <ShieldCheck size={48} className="mx-auto text-[#3ecf8e] mb-4" />
              <h3 className="text-xl font-bold text-[#1c1c1c]">{selectedWarranty.product}</h3>
              <p className="text-xs text-[#686868] font-mono mt-1">S/N: {selectedWarranty.serialNumber}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 border border-[#ededed] rounded-lg">
                <p className="text-[10px] font-bold text-[#686868] uppercase mb-1">Achat</p>
                <p className="text-sm font-bold text-[#1c1c1c]">{new Date(selectedWarranty.purchaseDate || '').toLocaleDateString()}</p>
              </div>
              <div className="p-4 border border-[#ededed] rounded-lg">
                <p className="text-[10px] font-bold text-[#686868] uppercase mb-1">Expiration</p>
                <p className="text-sm font-bold text-[#1c1c1c]">{new Date(selectedWarranty.expiryDate || '').toLocaleDateString()}</p>
              </div>
            </div>
            <div className="pt-6 flex gap-3">
              <button onClick={() => { setEditingWarranty(selectedWarranty); setIsModalOpen(true); }} className="btn-sb-outline flex-1 justify-center"><Edit3 size={14}/> Modifier</button>
              <button onClick={(e) => handleDelete(selectedWarranty.id, e)} className="btn-sb-outline flex-1 justify-center text-red-500 border-red-100 hover:bg-red-50"><Trash2 size={14}/> Supprimer</button>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default WarrantyLog;
