
import React, { useState, useMemo, useEffect } from 'react';
import {
  ShieldCheck, Search, RefreshCw,
  ShieldAlert, BadgeCheck, Timer, Edit3, Trash2,
  Package, CheckCircle2, AlertCircle
} from 'lucide-react';
import { useNotifications, useData } from '../App';
import { WarrantyRecord, Product, Ticket, Customer } from '../types';
import Modal from '../components/Modal';
import Drawer from '../components/Drawer';
import { SkeletonHeader, SkeletonCard } from '../components/Skeleton';
import { SmallCard } from '../components/SmallCard';
import { ModuleTips } from '../components/ModuleTips';
import { useSearchParams } from 'react-router-dom';
import ConfirmModal from '../components/ConfirmModal';

const WarrantyLog: React.FC = () => {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => { setIsMounted(true); }, []);

  const { warranties, products, brands, customers, tickets, isLoading, refreshAll, isSyncing, saveWarranty, deleteWarranty } = (() => { try { return useData(); } catch { return { warranties: [], products: [], brands: [], customers: [], tickets: [], isLoading: false, refreshAll: () => { }, isSyncing: false, saveWarranty: () => { }, deleteWarranty: () => { } }; } })();
  const { addNotification } = (() => { try { return useNotifications(); } catch { return { addNotification: () => { } }; } })();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'expired'>('all');
  const [selectedWarranty, setSelectedWarranty] = useState<WarrantyRecord | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWarranty, setEditingWarranty] = useState<WarrantyRecord | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; label: string; message: string } | null>(null);

  const [formProduct, setFormProduct] = useState('');
  const [formBrand, setFormBrand] = useState('LG');
  const [formSN, setFormSN] = useState('');
  const [formCustomerName, setFormCustomerName] = useState('');
  const [formDurationMonths, setFormDurationMonths] = useState<number>(12);
  const [formInvoice, setFormInvoice] = useState('');
  const [formDeviceType, setFormDeviceType] = useState('Smartphone');
  const [formReference, setFormReference] = useState('');
  const [formExpiryDate, setFormExpiryDate] = useState('');
  const [isPrefilledFromUrl, setIsPrefilledFromUrl] = useState(false);

  useEffect(() => { refreshAll(); }, [refreshAll]);

  // Pre-fill from URL params when coming from product page
  useEffect(() => {
    const productFromUrl = searchParams.get('product');
    const brandFromUrl = searchParams.get('brand');
    const durationFromUrl = searchParams.get('duration');

    if (productFromUrl) {
      setFormProduct(productFromUrl);
      if (brandFromUrl) setFormBrand(brandFromUrl);
      if (durationFromUrl) setFormDurationMonths(parseInt(durationFromUrl) || 12);
      setIsPrefilledFromUrl(true);
      setIsModalOpen(true);
      // Clear params after reading
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (!isModalOpen) {
      setFormProduct('');
      setFormBrand('LG');
      setFormSN('');
      setFormCustomerName('');
      setFormDurationMonths(12);
      setFormInvoice('');
      setFormDeviceType('Smartphone');
      setFormReference('');
      setFormExpiryDate('');
      setIsPrefilledFromUrl(false);
    } else if (editingWarranty) {
      setFormProduct(editingWarranty.product);
      setFormBrand(editingWarranty.brand);
      setFormSN(editingWarranty.serialNumber);
      setFormCustomerName(editingWarranty.customerName);
      setFormDurationMonths(editingWarranty.durationMonths);
      setFormInvoice(editingWarranty.invoiceNumber || '');
      setFormDeviceType(editingWarranty.deviceType || 'Smartphone');
      setFormReference(editingWarranty.reference || '');
      setFormExpiryDate(editingWarranty.expiryDate || '');
    }
    // Si isModalOpen est true mais qu'on vient de l'URL (prefilled), ne rien faire
    // Les valeurs pré-remplies sont déjà dans les state
  }, [isModalOpen, editingWarranty]);

  // Sync brand and duration when product is selected
  useEffect(() => {
    const selected = products?.find((p: Product) => p.name === formProduct);
    if (selected) {
      setFormBrand(selected.brand);
      setFormDurationMonths(selected.warrantyMonths || 12);
    }
  }, [formProduct, products]);

  const suggestedSNs = useMemo((): string[] => {
    if (!formProduct) return [];
    const serials = (tickets || [])
      .filter((t: Ticket) => (t.productName || t.product || '').toLowerCase() === formProduct.toLowerCase())
      .map((t: Ticket) => t.serialNumber)
      .filter((sn: string | undefined): sn is string => !!sn);
    return Array.from(new Set(serials));
  }, [formProduct, tickets]);

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
    const expiryDate = formExpiryDate || (() => {
      const d = new Date(purchaseDate);
      d.setMonth(d.getMonth() + parseInt(formData.get('durationMonths') as string) || 12);
      return d.toISOString().split('T')[0];
    })();
    const duration = Math.max(1, Math.round((new Date(expiryDate).getTime() - new Date(purchaseDate).getTime()) / (1000 * 60 * 60 * 24 * 30)));

    const custMatch = (customers || []).find((c: Customer) => c.name === formCustomerName);

    const matchedProduct = products?.find((p: Product) =>
      p.name.toLowerCase() === formProduct.toLowerCase()
    );

    if (!matchedProduct) {
      addNotification({ title: 'Erreur', message: `Produit "${formProduct}" non trouvé dans le catalogue.`, type: 'error' });
      setIsSaving(false);
      return;
    }

    const data: WarrantyRecord = {
      id: editingWarranty?.id || `W-${Date.now()}`,
      productId: matchedProduct.id,
      customerId: custMatch?.id,
      product: matchedProduct.name,
      brand: formBrand || matchedProduct.brand,
      serialNumber: formSN,
      customerName: formCustomerName,
      invoiceNumber: formInvoice,
      deviceType: formDeviceType,
      reference: formReference,
      purchaseDate: purchaseDate,
      durationMonths: duration,
      expiryDate: expiryDate,
      isExtensionAvailable: formData.get('extension') === 'on'
    };

    try {
      await saveWarranty(data);
      addNotification({ title: 'Succès', message: 'Garantie enregistrée.', type: 'success' });
      setIsModalOpen(false);
      await refreshAll(); // Rafraîchir la liste des garanties
    } catch (err) {
      addNotification({ title: 'Erreur', message: 'Échec sauvegarde.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const warranty = warranties.find(w => w.id === id);
    setDeleteConfirm({
      id,
      label: `la garantie #${warranty?.id}`,
      message: `Voulez-vous vraiment révoquer ce certificat de garantie pour ${warranty?.product} (#${warranty?.serialNumber}) ? Cette action est définitive.`
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteWarranty(deleteConfirm.id);
      addNotification({ title: 'Supprimé', message: 'Garantie retirée.', type: 'info' });
      if (selectedWarranty?.id === deleteConfirm.id) setSelectedWarranty(null);
    } catch (err) {
      addNotification({ title: 'Erreur', message: 'Échec suppression.', type: 'error' });
    } finally {
      setDeleteConfirm(null);
    }
  };

  if (!isMounted) return <div className="h-[80vh] flex items-center justify-center"><div className="animate-spin text-[#3ecf8e]" /></div>;

  return (
    <div className="max-w-7xl mx-auto space-y-5 animate-sb-entry pb-20">
      {/* Header */}
      {isLoading ? (
        <SkeletonHeader />
      ) : (
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#3ecf8e]/10 rounded-xl flex items-center justify-center text-[#3ecf8e]">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
                Registre Garanties
              </h1>
              <p className="text-xs text-[#686868] font-semibold uppercase tracking-wider mt-0.5">Contrats de protection et gestion des garanties.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={refreshAll} className="btn-sb-outline h-9 px-3 text-xs">
              <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
            </button>
            <button onClick={() => { setEditingWarranty(null); setIsModalOpen(true); }} className="btn-sb-primary h-9 px-4 text-xs">
              <ShieldCheck size={14} /> <span>Nouveau Contrat</span>
            </button>
          </div>
        </header>
      )}

      {/* Module Tips */}
      <ModuleTips
        moduleName="Registre Garanties"
        storageKey="warranty_log"
        tips={[
          {
            id: 'warranty-1',
            title: 'Statut des garanties',
            content: 'Les contrats sont automatiquement classés comme Actifs ou Expirés selon la date d\'échéance. Filtrez rapidement pour voir les garanties qui nécessitent une attention.',
            target: 'Filtres Actifs/Expirés'
          },
          {
            id: 'warranty-2',
            title: 'Suggestions automatiques',
            content: 'Lors de la création d\'un contrat, les numéros de série déjà utilisés dans les tickets SAV sont suggérés automatiquement pour éviter les erreurs de saisie.',
            target: 'Formulaire de création'
          },
          {
            id: 'warranty-3',
            title: 'Durée et extension',
            content: 'La durée par défaut est définie par produit. Vous pouvez activer l\'option d\'extension pour permettre au client de prolonger la protection après expiration.',
            target: 'Options de garantie'
          }
        ]}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <SmallCard
          title="Contrats Total"
          value={stats.total}
          icon={<BadgeCheck size={14} />}
          color="#3b82f6"
          tip="Nombre total de contrats de garantie enregistrés"
        />
        <SmallCard
          title="Actives"
          value={stats.active}
          icon={<ShieldCheck size={14} />}
          color="#22c55e"
          tip="Garanties encore valides et actives"
        />
        <SmallCard
          title="Expirées"
          value={stats.expired}
          icon={<ShieldAlert size={14} />}
          color="#ef4444"
          tip="Garanties ayant dépassé leur date d'échéance"
        />
        <SmallCard
          title="Extensibles"
          value={warranties?.filter((w: WarrantyRecord) => w.isExtensionAvailable).length || 0}
          icon={<CheckCircle2 size={14} />}
          color="#f59e0b"
          tip="Contrats éligibles à une extension de garantie"
        />
        <SmallCard
          title="Expirent ce mois"
          value={warranties?.filter((w: WarrantyRecord) => {
            const expiry = new Date(w.expiryDate || '');
            const now = new Date();
            return expiry.getMonth() === now.getMonth() && expiry.getFullYear() === now.getFullYear() && expiry >= now;
          }).length || 0}
          icon={<Timer size={14} />}
          color="#8b5cf6"
          tip="Garanties arrivant à échéance ce mois-ci"
        />
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af] group-focus-within:text-[#3ecf8e] transition-colors" size={16} />
          <input
            type="text"
            placeholder="Rechercher par S/N, client, produit..."
            className="w-full pl-10 pr-4 h-10 rounded-lg border border-[#e5e5e5] text-sm focus:border-[#3ecf8e] focus:ring-2 focus:ring-[#3ecf8e]/20 transition-all"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-1 bg-[#f8f9fa] p-1 rounded-lg border border-[#e5e5e5]">
          {[
            { id: 'all', label: 'Tous', icon: <Package size={12} /> },
            { id: 'active', label: 'Actifs', icon: <CheckCircle2 size={12} />, color: '#22c55e' },
            { id: 'expired', label: 'Expirés', icon: <AlertCircle size={12} />, color: '#ef4444' }
          ].map(st => (
            <button
              key={st.id}
              onClick={() => setActiveTab(st.id as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold uppercase tracking-wide transition-all ${activeTab === st.id
                ? st.id === 'active' ? 'bg-green-50 text-green-600 border border-green-200' :
                  st.id === 'expired' ? 'bg-red-50 text-red-600 border border-red-200' :
                    'bg-white text-[#1c1c1c] shadow-sm border border-[#e5e5e5]'
                : 'text-[#686868] hover:text-[#1c1c1c]'
                }`}
            >
              {st.icon} {st.label}
              <span className="text-[11px] font-semibold">
                {st.id === 'all' ? stats.total :
                  st.id === 'active' ? stats.active : stats.expired}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-[#e5e5e5] shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-[#f8f9fa] border-b border-[#e5e5e5]">
            <tr>
              <th className="px-3 py-2.5 text-[11px] font-semibold text-[#686868] uppercase tracking-wide">Produit & S/N</th>
              <th className="px-3 py-2.5 text-[11px] font-semibold text-[#686868] uppercase tracking-wide">Bénéficiaire</th>
              <th className="px-3 py-2.5 text-[11px] font-semibold text-[#686868] uppercase tracking-wide">Échéance</th>
              <th className="px-3 py-2.5 text-right text-[11px] font-semibold text-[#686868] uppercase tracking-wide">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f0f0f0]">
            {filteredWarranties.map((w: WarrantyRecord) => {
              const isExpired = new Date(w.expiryDate || '') < new Date();
              const daysUntilExpiry = Math.ceil((new Date(w.expiryDate || '').getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

              return (
                <tr
                  key={w.id}
                  onClick={() => setSelectedWarranty(w)}
                  className="cursor-pointer group transition-all duration-200 hover:bg-[#f8f9fa]"
                >
                  <td className="px-3 py-2.5">
                    <p className="text-[13px] font-semibold text-[#1c1c1c] group-hover:text-[#3ecf8e] transition-colors">{w.product}</p>
                    <p className="text-[11px] font-mono text-[#9ca3af]">#{w.serialNumber}</p>
                  </td>
                  <td className="px-3 py-2.5">
                    <p className="text-[13px] font-semibold text-[#1c1c1c]">{w.customerName}</p>
                    {w.isExtensionAvailable && (
                      <span className="text-[9px] text-[#f59e0b] font-semibold">Extension disponible</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className={`flex items-center gap-1.5 ${isExpired ? 'text-red-500' : daysUntilExpiry <= 30 ? 'text-amber-500' : 'text-[#1c1c1c]'}`}>
                      <Timer size={12} />
                      <span className="text-[12px] font-semibold">{new Date(w.expiryDate).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })}</span>
                    </div>
                    {!isExpired && daysUntilExpiry <= 30 && (
                      <span className="text-[9px] text-amber-500">{daysUntilExpiry}j restants</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${isExpired
                      ? 'bg-red-50 text-red-500'
                      : daysUntilExpiry <= 30
                        ? 'bg-amber-50 text-amber-600'
                        : 'bg-green-50 text-green-600'
                      }`}>
                      {isExpired ? 'Expiré' : 'Actif'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filteredWarranties.length === 0 && (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-[#f5f5f5] rounded-full flex items-center justify-center mx-auto mb-3">
              <ShieldCheck size={16} className="text-[#9ca3af]" />
            </div>
            <p className="text-sm font-semibold text-[#686868]">Aucune garantie trouvée</p>
            <p className="text-xs text-[#9ca3af] mt-0.5">Modifiez vos critères de recherche</p>
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nouveau Certificat de Garantie">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-[#686868] uppercase tracking-widest">Facture / Numéro</label>
              <input name="invoiceNumber" type="text" value={formInvoice} onChange={e => setFormInvoice(e.target.value)} placeholder="Ex: FAC-2025-001" className="w-full h-11" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-[#686868] uppercase tracking-widest">Date d'achat</label>
              <input name="purchaseDate" type="date" defaultValue={editingWarranty?.purchaseDate} required className="w-full h-11" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-[#686868] uppercase tracking-widest">Type d'appareil</label>
              <select name="deviceType" value={formDeviceType} onChange={e => setFormDeviceType(e.target.value)} className="w-full h-11 font-semibold bg-[#fcfcfc]">
                {['Smartphone', 'Tablette', 'PC Portable', 'PC Bureau', 'TV', 'Électroménager', 'Audio', 'Accessoire'].map((t: string) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-[#686868] uppercase tracking-widest">Marque</label>
              <select name="brand" value={formBrand} onChange={e => setFormBrand(e.target.value)} className="w-full h-11 font-semibold bg-[#fcfcfc]">
                {(brands || []).map((b: string) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-[#686868] uppercase tracking-widest">Référence</label>
              <input name="reference" type="text" value={formReference} onChange={e => setFormReference(e.target.value)} placeholder="Ex: iPhone 14 Pro, Galaxy S23" className="w-full h-11" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-[#686868] uppercase tracking-widest flex items-center justify-between">
                N° de série
                {suggestedSNs.length > 0 && <span className="text-[9px] text-[#3ecf8e] font-semibold uppercase">Suggestions</span>}
              </label>
              <input name="serialNumber" type="text" list="snList" value={formSN} onChange={e => setFormSN(e.target.value)} required className="w-full h-11 font-mono" />
              <datalist id="snList">{suggestedSNs.map((sn: string) => <option key={sn} value={sn} />)}</datalist>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-[#686868] uppercase tracking-widest">Garantie jusqu'au</label>
              <input name="expiryDate" type="date" value={formExpiryDate} onChange={e => setFormExpiryDate(e.target.value)} className="w-full h-11" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-[#686868] uppercase tracking-widest">Bénéficiaire (Client)</label>
              <input name="customerName" type="text" list="custList" value={formCustomerName} onChange={e => setFormCustomerName(e.target.value)} required className="w-full h-11" />
              <datalist id="custList">{(customers || []).map((c: any) => <option key={c.id} value={c.name} />)}</datalist>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input name="extension" type="checkbox" defaultChecked={editingWarranty?.isExtensionAvailable} className="rounded" />
            <label className="text-xs font-semibold text-[#686868] uppercase">Extension disponible</label>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn-sb-outline">Annuler</button>
            <button type="submit" disabled={isSaving} className="btn-sb-primary">
              {isSaving ? <RefreshCw className="animate-spin" size={14} /> : 'Enregistrer'}
            </button>
          </div>
        </form>
      </Modal>

      <Drawer isOpen={!!selectedWarranty} onClose={() => setSelectedWarranty(null)} title="Détails Garantie" icon={<ShieldCheck size={16} />}>
        {selectedWarranty && (
          <div className="space-y-8 animate-sb-entry">
            <div className="p-4 bg-[#f8f9fa] border border-[#e5e5e5] rounded-lg text-center">
              <ShieldCheck size={48} className="mx-auto text-[#3ecf8e] mb-4" />
              <h3 className="text-base font-semibold text-[#1c1c1c]">{selectedWarranty.product}</h3>
              <p className="text-xs text-[#686868] font-mono mt-1">S/N: {selectedWarranty.serialNumber}</p>
            </div>
            {(selectedWarranty.invoiceNumber || selectedWarranty.deviceType || selectedWarranty.reference) && (
              <div className="grid grid-cols-3 gap-3">
                {selectedWarranty.invoiceNumber && (
                  <div className="p-3 border border-[#e5e5e5] rounded-lg">
                    <p className="text-[10px] font-semibold text-[#686868] uppercase mb-1">Facture</p>
                    <p className="text-xs font-semibold text-[#1c1c1c]">{selectedWarranty.invoiceNumber}</p>
                  </div>
                )}
                {selectedWarranty.deviceType && (
                  <div className="p-3 border border-[#e5e5e5] rounded-lg">
                    <p className="text-[10px] font-semibold text-[#686868] uppercase mb-1">Type</p>
                    <p className="text-xs font-semibold text-[#1c1c1c]">{selectedWarranty.deviceType}</p>
                  </div>
                )}
                {selectedWarranty.reference && (
                  <div className="p-3 border border-[#e5e5e5] rounded-lg">
                    <p className="text-[10px] font-semibold text-[#686868] uppercase mb-1">Réf.</p>
                    <p className="text-xs font-semibold text-[#1c1c1c]">{selectedWarranty.reference}</p>
                  </div>
                )}
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 border border-[#e5e5e5] rounded-lg">
                <p className="text-[11px] font-semibold text-[#686868] uppercase mb-1">Achat</p>
                <p className="text-sm font-semibold text-[#1c1c1c]">{new Date(selectedWarranty.purchaseDate || '').toLocaleDateString()}</p>
              </div>
              <div className="p-4 border border-[#e5e5e5] rounded-lg">
                <p className="text-[11px] font-semibold text-[#686868] uppercase mb-1">Expiration</p>
                <p className="text-sm font-semibold text-[#1c1c1c]">{new Date(selectedWarranty.expiryDate || '').toLocaleDateString()}</p>
              </div>
            </div>
            <div className="pt-6 flex gap-3">
              <button onClick={() => { setEditingWarranty(selectedWarranty); setIsModalOpen(true); }} className="btn-sb-outline flex-1 justify-center"><Edit3 size={14} /> Modifier</button>
              <button onClick={(e) => handleDelete(selectedWarranty.id, e)} className="btn-sb-outline flex-1 justify-center text-red-500 border-red-100 hover:bg-red-50"><Trash2 size={14} /> Supprimer</button>
            </div>
          </div>
        )}
      </Drawer>
      {/* ======= MODAL: CONFIRMATION SUPPRESSION ======= */}
      <ConfirmModal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleConfirmDelete}
        message={deleteConfirm?.message || ''}
      />
    </div>
  );
};

export default WarrantyLog;
