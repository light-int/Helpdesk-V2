
import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  ShieldCheck, Search, Filter, RefreshCw, Trash2, Loader2, Sparkles, Package, 
  ShieldAlert, Calendar, User, Hash, FileSpreadsheet, Plus, X, ChevronRight, 
  AlertTriangle, CheckCircle2, Clock, Info, Shield, ArrowUpRight, History, 
  Download, FileDown, RotateCcw, SlidersHorizontal, ListFilter, MapPin, 
  Building2, BadgeCheck, Timer, CalendarDays,
  // Fix: Added missing icon imports
  ChevronUp, ChevronDown, Save
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useNotifications, useData, useUser } from '../App';
import { WarrantyRecord } from '../types';
import Modal from '../components/Modal';
import Drawer from '../components/Drawer';

const WarrantyLog: React.FC = () => {
  const { warranties, isLoading, refreshAll, isSyncing, saveTicket, showrooms } = useData();
  const { currentUser } = useUser();
  const { addNotification } = useNotifications();
  
  // États de filtrage
  const [searchTerm, setSearchTerm] = useState('');
  const [brandFilter, setBrandFilter] = useState('Tous');
  const [statusFilter, setStatusFilter] = useState('Tous');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const [selectedWarranty, setSelectedWarranty] = useState<WarrantyRecord | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => { refreshAll(); }, []);

  const filteredWarranties = useMemo(() => {
    return warranties.filter(w => {
      const matchesSearch = (w.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (w.serialNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (w.product || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const isExpired = new Date(w.expiryDate) < new Date();
      const statusMatch = statusFilter === 'Tous' || 
                        (statusFilter === 'Actif' && !isExpired) || 
                        (statusFilter === 'Expiré' && isExpired);
      
      const brandMatch = brandFilter === 'Tous' || w.brand === brandFilter;

      return matchesSearch && statusMatch && brandMatch;
    }).sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());
  }, [warranties, searchTerm, statusFilter, brandFilter]);

  const stats = useMemo(() => {
    const total = warranties.length;
    const active = warranties.filter(w => new Date(w.expiryDate) >= new Date()).length;
    const expiringSoon = warranties.filter(w => {
      const expiry = new Date(w.expiryDate);
      const today = new Date();
      const diffDays = (expiry.getTime() - today.getTime()) / (1000 * 3600 * 24);
      return diffDays > 0 && diffDays <= 30;
    }).length;
    const expired = total - active;
    
    return { total, active, expiringSoon, expired };
  }, [warranties]);

  const brands = useMemo(() => {
    const b = new Set<string>();
    warranties.forEach(w => { if(w.brand) b.add(w.brand); });
    return ['Tous', ...Array.from(b)].sort();
  }, [warranties]);

  const handleExportXLSX = () => {
    const exportData = filteredWarranties.map(w => ({
      'ID Contrat': w.id,
      'Produit': w.product,
      'Marque': w.brand,
      'N° de Série': w.serialNumber,
      'Client': w.customerName,
      'Date Achat': w.purchaseDate,
      'Durée (Mois)': w.durationMonths,
      'Date Expiration': w.expiryDate,
      'Statut': new Date(w.expiryDate) >= new Date() ? 'Actif' : 'Expiré'
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Garanties Plaza");
    XLSX.writeFile(wb, `RP_Garanties_${new Date().toISOString().split('T')[0]}.xlsx`);
    addNotification({ title: 'Exportation', message: 'Registre des garanties exporté.', type: 'success' });
  };

  const getRemainingTime = (expiryStr: string) => {
    const expiry = new Date(expiryStr);
    const today = new Date();
    const diffTime = expiry.getTime() - today.getTime();
    if (diffTime < 0) return { label: 'Expiré', percent: 0, color: 'bg-red-500' };
    
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays > 365) return { label: `${Math.floor(diffDays/365)} an(s)`, percent: 100, color: 'bg-green-500' };
    if (diffDays > 30) return { label: `${Math.floor(diffDays/30)} mois`, percent: 60, color: 'bg-blue-500' };
    return { label: `${diffDays} jours`, percent: 20, color: 'bg-orange-500' };
  };

  const resetFilters = () => {
    setSearchTerm('');
    setBrandFilter('Tous');
    setStatusFilter('Tous');
  };

  if (isLoading) return <div className="h-[80vh] flex items-center justify-center"><Loader2 className="animate-spin text-[#1a73e8]" size={32} /></div>;

  return (
    <div className="space-y-8 animate-page-entry pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-light text-[#202124]">Registre des Garanties</h1>
          <p className="text-[10px] text-[#5f6368] font-black uppercase tracking-widest mt-1">Management des contrats de protection Royal Plaza</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={handleExportXLSX} className="btn-google-outlined h-11 px-6 flex items-center gap-3">
             <FileSpreadsheet size={18} className="text-[#188038]" /> <span>Exporter Registre</span>
          </button>
          <button onClick={() => setIsModalOpen(true)} className="btn-google-primary h-11 px-6 shadow-xl shadow-blue-600/10">
            <Plus size={20} /> <span>Nouveau Contrat</span>
          </button>
          <button onClick={refreshAll} className="btn-google-outlined h-11 px-4">
            <RefreshCw size={18} className={isSyncing ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      {/* KPIS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Protection Active', value: stats.active, icon: <ShieldCheck size={20}/>, color: '#1a73e8' },
          { label: 'Alertes Expiration', value: stats.expiringSoon, icon: <Timer size={20}/>, color: '#f9ab00' },
          { label: 'Contrats Clos', value: stats.expired, icon: <ShieldAlert size={20}/>, color: '#d93025' },
          { label: 'Total Enregistré', value: stats.total, icon: <Package size={20}/>, color: '#3c4043' }
        ].map((s, i) => (
          <div key={i} className="stats-card border-l-4" style={{ borderLeftColor: s.color }}>
             <div className="flex justify-between items-start">
               <div>
                 <p className="text-[10px] font-black text-[#5f6368] uppercase tracking-[0.15em] mb-1">{s.label}</p>
                 <h3 className="text-3xl font-bold text-[#202124] tracking-tight">{s.value}</h3>
               </div>
               <div className="p-2 bg-gray-50 text-gray-400">{s.icon}</div>
             </div>
          </div>
        ))}
      </div>

      {/* FILTER CONTROL CENTER */}
      <div className="google-card overflow-hidden border-none shadow-xl bg-white ring-1 ring-black/5">
        <div className="p-10 space-y-8">
           <div className="flex flex-col xl:flex-row gap-8">
              <div className="relative flex-1 group">
                 <Search className="absolute left-6 top-5 text-[#9aa0a6] group-focus-within:text-[#1a73e8] transition-colors" size={24} />
                 <input 
                  type="text" 
                  placeholder="Rechercher par n° de série, client ou produit..." 
                  className="w-full pl-16 h-16 bg-[#f8f9fa] border-none text-base font-bold shadow-inner transition-all placeholder:text-gray-400 placeholder:font-normal focus:bg-white focus:ring-2 focus:ring-blue-100"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                 />
                 {searchTerm && (
                   <button onClick={() => setSearchTerm('')} className="absolute right-6 top-5 p-1 text-gray-400 hover:text-red-500">
                     <X size={22} />
                   </button>
                 )}
              </div>

              <div className="flex flex-wrap items-center gap-6">
                 <div className="flex items-center bg-[#f1f3f4] p-1.5 shadow-inner">
                    {['Tous', 'Actif', 'Expiré'].map(status => (
                      <button 
                        key={status}
                        onClick={() => setStatusFilter(status)}
                        className={`px-8 py-3.5 text-[10px] font-black uppercase tracking-widest transition-all ${statusFilter === status ? 'bg-white text-[#1a73e8] shadow-md' : 'text-[#5f6368] hover:text-[#202124]'}`}
                      >
                        {status}
                      </button>
                    ))}
                 </div>

                 <div className="flex items-center gap-4">
                    <button 
                      onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                      className={`p-4.5 border-2 transition-all group flex items-center gap-3 ${showAdvancedFilters ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white border-[#dadce0] text-[#5f6368] hover:border-[#1a73e8]'}`}
                    >
                      <SlidersHorizontal size={22} />
                      <span className="text-[10px] font-black uppercase tracking-widest hidden md:inline">Options de tri</span>
                      {showAdvancedFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>

                    <div className="h-16 min-w-[200px] p-4 bg-white border border-blue-100 flex items-center justify-between shadow-sm relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-1 h-full bg-[#1a73e8]" />
                      <div className="shrink-0 mr-4">
                         <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                            <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest">Base de Données</span>
                         </div>
                         <p className="text-lg font-black text-[#202124] leading-none mt-1">{filteredWarranties.length} <span className="text-[10px] text-gray-400 font-bold uppercase">Résultats</span></p>
                      </div>
                      <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl"><BadgeCheck size={20}/></div>
                    </div>
                 </div>
                 
                 {searchTerm || statusFilter !== 'Tous' || brandFilter !== 'Tous' ? (
                    <button onClick={resetFilters} className="p-5 text-[#d93025] hover:bg-red-50 border-2 border-transparent transition-all group" title="Réinitialiser">
                       <RotateCcw size={24} className="group-hover:rotate-[-180deg] transition-transform duration-700" />
                    </button>
                 ) : null}
              </div>
           </div>

           {showAdvancedFilters && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8 border-t border-[#f1f3f4] animate-in slide-in-from-top-4 duration-500">
                <div className="space-y-2">
                   <label className="text-[9px] font-black text-[#9aa0a6] uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                     <Building2 size={12} /> Constructeur
                   </label>
                   <div className="relative">
                      <select 
                        value={brandFilter} 
                        onChange={e => setBrandFilter(e.target.value)}
                        className="w-full h-12 bg-[#f8f9fa] border-none text-[11px] font-black uppercase tracking-widest focus:ring-2 focus:ring-[#1a73e8] appearance-none px-5"
                      >
                          {brands.map(b => <option key={b} value={b}>{b}</option>)}
                      </select>
                      <ChevronDown className="absolute right-4 top-4 text-gray-400 pointer-events-none" size={16} />
                   </div>
                </div>

                <div className="col-span-2 flex items-end">
                   <div className="w-full p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-start gap-4">
                      <Info size={20} className="text-[#1a73e8] shrink-0 mt-0.5" />
                      <p className="text-[10px] text-blue-700 leading-relaxed font-bold uppercase">
                        Les garanties sont automatiquement synchronisées lors de la création d'un dossier de vente. Toute intervention SAV sur une unité expirée doit faire l'objet d'un devis préalable.
                      </p>
                   </div>
                </div>
              </div>
           )}
        </div>

        {/* LOG TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#dadce0] bg-[#f8f9fa] text-[#5f6368] text-[9px] font-black uppercase tracking-[0.2em]">
                <th className="px-10 py-6">Produit & Identification</th>
                <th className="px-10 py-6">Client Bénéficiaire</th>
                <th className="px-10 py-6">Expiration</th>
                <th className="px-10 py-6 text-center">Temps Restant</th>
                <th className="px-10 py-6 text-right">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#dadce0]">
              {filteredWarranties.map((w) => {
                const rem = getRemainingTime(w.expiryDate);
                const isExpired = rem.label === 'Expiré';
                return (
                  <tr 
                    key={w.id} 
                    onClick={() => setSelectedWarranty(w)}
                    className={`hover:bg-[#f8faff] transition-colors group cursor-pointer ${selectedWarranty?.id === w.id ? 'bg-[#e8f0fe]' : 'bg-white'}`}
                  >
                    <td className="px-10 py-6">
                       <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 flex items-center justify-center border ${isExpired ? 'bg-red-50 text-red-300' : 'bg-green-50 text-green-600'} transition-colors`}>
                            <ShieldCheck size={20} />
                          </div>
                          <div>
                            <p className="text-sm font-black text-[#3c4043] group-hover:text-[#1a73e8] transition-colors">{w.product}</p>
                            <p className="text-[10px] font-mono text-[#9aa0a6] mt-1 font-bold uppercase tracking-widest">{w.brand} • S/N: {w.serialNumber}</p>
                          </div>
                       </div>
                    </td>
                    <td className="px-10 py-6">
                      <p className="text-sm font-bold text-[#3c4043]">{w.customerName}</p>
                      <p className="text-[9px] text-[#5f6368] font-bold mt-1 uppercase tracking-widest">ID Contrat: {w.id}</p>
                    </td>
                    <td className="px-10 py-6">
                       <p className="text-xs font-black text-[#3c4043]">{new Date(w.expiryDate).toLocaleDateString('fr-FR', {day:'2-digit', month:'long', year:'numeric'})}</p>
                       <p className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter mt-1">Acquis le {new Date(w.purchaseDate).toLocaleDateString()}</p>
                    </td>
                    <td className="px-10 py-6">
                       <div className="flex flex-col items-center min-w-[120px]">
                          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mb-2">
                             <div className={`h-full ${rem.color} transition-all duration-1000`} style={{ width: `${rem.percent}%` }} />
                          </div>
                          <span className={`text-[10px] font-black uppercase tracking-tighter ${isExpired ? 'text-red-500' : 'text-[#3c4043]'}`}>{rem.label}</span>
                       </div>
                    </td>
                    <td className="px-10 py-6 text-right">
                       <span className={`px-5 py-2 border text-[9px] font-black uppercase tracking-widest inline-block shadow-sm ${
                         isExpired ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'
                       }`}>
                         {isExpired ? 'Expiré' : 'Actif'}
                       </span>
                    </td>
                  </tr>
                );
              })}
              {filteredWarranties.length === 0 && (
                <tr>
                   <td colSpan={5} className="py-40 text-center bg-white">
                      <div className="w-24 h-24 bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center mx-auto mb-8">
                        <ShieldAlert size={48} className="text-gray-200" />
                      </div>
                      <p className="text-xs font-black text-gray-300 uppercase tracking-[0.4em]">Aucune garantie identifiée</p>
                      <button onClick={resetFilters} className="text-[#1a73e8] text-[10px] font-black uppercase mt-6 hover:underline underline-offset-4 decoration-2">Effacer tous les filtres</button>
                   </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAIL DRAWER FOR WARRANTY */}
      <Drawer
        isOpen={!!selectedWarranty}
        onClose={() => setSelectedWarranty(null)}
        title="Détails du Contrat de Protection"
        subtitle={`Contrat ID: ${selectedWarranty?.id}`}
        icon={<ShieldCheck size={20} />}
        footer={
          <div className="flex gap-3">
             <button className="flex-1 btn-google-primary justify-center py-4 text-xs font-black uppercase tracking-widest shadow-xl">
                <ArrowUpRight size={18} /> Déclarer un Sinistre
             </button>
             <button 
               onClick={() => { if(window.confirm('Révoquer ce contrat ?')) setSelectedWarranty(null); }}
               className="p-4 bg-red-50 text-red-600 border border-red-100 rounded-2xl hover:bg-red-600 hover:text-white transition-all"
             >
                <Trash2 size={20} />
             </button>
          </div>
        }
      >
        {selectedWarranty && (
          <div className="space-y-10">
             <div className="p-8 bg-gradient-to-br from-white to-[#f8f9fa] border border-[#dadce0] rounded-[40px] shadow-sm flex flex-col items-center text-center">
                <div className={`w-20 h-20 rounded-[30px] flex items-center justify-center mb-6 shadow-xl ${new Date(selectedWarranty.expiryDate) < new Date() ? 'bg-red-50 text-red-600 shadow-red-200' : 'bg-green-50 text-green-600 shadow-green-200'}`}>
                   <Shield size={40} />
                </div>
                <h3 className="text-2xl font-black text-[#202124] tracking-tight">{selectedWarranty.product}</h3>
                <p className="text-xs font-black text-[#1a73e8] uppercase tracking-[0.2em] mt-2">{selectedWarranty.brand} • S/N {selectedWarranty.serialNumber}</p>
                <div className="mt-8 flex items-center gap-10">
                   <div className="text-center">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Acquisition</p>
                      <p className="text-sm font-bold text-[#3c4043]">{new Date(selectedWarranty.purchaseDate).toLocaleDateString()}</p>
                   </div>
                   <div className="h-8 w-px bg-gray-200" />
                   <div className="text-center">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Échéance</p>
                      <p className="text-sm font-bold text-[#3c4043]">{new Date(selectedWarranty.expiryDate).toLocaleDateString()}</p>
                   </div>
                </div>
             </div>

             <section className="space-y-4">
                <h4 className="text-[10px] font-black text-[#9aa0a6] uppercase tracking-[0.2em] flex items-center gap-2">
                   <User size={16} /> Informations Titulaire
                </h4>
                <div className="p-6 bg-white border border-[#dadce0] rounded-3xl space-y-4 shadow-sm">
                   <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-[#f8f9fa] rounded-xl border flex items-center justify-center text-[#5f6368]"><User size={20}/></div>
                      <div>
                         <p className="text-[9px] font-black text-gray-400 uppercase">Nom du Client</p>
                         <p className="text-sm font-black text-[#3c4043]">{selectedWarranty.customerName}</p>
                      </div>
                   </div>
                   <div className="flex items-center gap-4 pt-4 border-t border-gray-50">
                      <div className="w-10 h-10 bg-[#f8f9fa] rounded-xl border flex items-center justify-center text-[#5f6368]"><MapPin size={20}/></div>
                      <div>
                         <p className="text-[9px] font-black text-gray-400 uppercase">Enregistré à</p>
                         <p className="text-sm font-black text-[#3c4043]">Showroom Glass (Libreville)</p>
                      </div>
                   </div>
                </div>
             </section>

             <section className="space-y-4">
                <h4 className="text-[10px] font-black text-[#9aa0a6] uppercase tracking-[0.2em] flex items-center gap-2">
                   <History size={16} /> Historique de Service
                </h4>
                <div className="py-12 text-center border-2 border-dashed border-[#dadce0] rounded-[40px] bg-gray-50/50">
                   <CheckCircle2 size={40} className="mx-auto text-green-200 mb-4 opacity-50" />
                   <p className="text-[10px] font-black text-[#9aa0a6] uppercase tracking-widest">Aucune intervention déclarée à ce jour</p>
                   <p className="text-[9px] text-gray-400 mt-2 italic">L'unité conserve son intégrité d'origine.</p>
                </div>
             </section>

             <div className="p-6 bg-blue-50 border border-blue-100 rounded-3xl">
                <div className="flex items-start gap-4">
                   <Sparkles size={20} className="text-[#1a73e8] shrink-0 mt-0.5" />
                   <div>
                      <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest">Extension de Garantie</p>
                      <p className="text-xs text-blue-600 mt-2 leading-relaxed">
                        Ce matériel est éligible à une extension de protection de 12 mois supplémentaires. Contactez le service financier pour obtenir un devis de prolongation Horizon Care.
                      </p>
                   </div>
                </div>
             </div>
          </div>
        )}
      </Drawer>

      {/* MODAL CREATION GARANTIE */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Émission de Nouveau Contrat"
        size="lg"
      >
        <form className="space-y-10">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
              <div className="space-y-1.5">
                 <label className="text-[10px] font-black uppercase text-[#5f6368] tracking-widest ml-1">Référence Matériel</label>
                 <div className="relative">
                    <Search className="absolute left-3 top-2.5 text-[#dadce0]" size={18} />
                    <input type="text" placeholder="Rechercher produit..." className="w-full h-11 bg-[#f8f9fa] border-none pl-10 font-bold" />
                 </div>
              </div>
              <div className="space-y-1.5">
                 <label className="text-[10px] font-black uppercase text-[#5f6368] tracking-widest ml-1">Numéro de Série (S/N)</label>
                 <input type="text" required placeholder="ex: SN-LG-982..." className="w-full h-11 bg-white font-mono uppercase font-black" />
              </div>
              <div className="space-y-1.5">
                 <label className="text-[10px] font-black uppercase text-[#5f6368] tracking-widest ml-1">Titulaire du contrat</label>
                 <input type="text" required placeholder="Nom complet du client" className="w-full h-11 bg-white" />
              </div>
              <div className="space-y-1.5">
                 <label className="text-[10px] font-black uppercase text-[#5f6368] tracking-widest ml-1">Date d'achat / Activation</label>
                 <input type="date" required className="w-full h-11 bg-white font-black" />
              </div>
              <div className="space-y-1.5">
                 <label className="text-[10px] font-black uppercase text-[#5f6368] tracking-widest ml-1">Durée de Protection (Mois)</label>
                 <select className="w-full h-11 bg-white font-black">
                    <option value="12">12 MOIS (Standard)</option>
                    <option value="24">24 MOIS (Expert)</option>
                    <option value="36">36 MOIS (Plaza Care+)</option>
                 </select>
              </div>
              <div className="space-y-1.5">
                 <label className="text-[10px] font-black uppercase text-[#5f6368] tracking-widest ml-1">Showroom émetteur</label>
                 <select className="w-full h-11 bg-white font-black">
                    {showrooms.map(s => <option key={s.id} value={s.id}>{s.id}</option>)}
                 </select>
              </div>
           </div>

           <div className="p-6 bg-gray-50 border border-dashed border-gray-200 rounded-3xl flex items-start gap-4">
              <ShieldCheck size={24} className="text-green-600 mt-1" />
              <div>
                 <p className="text-xs font-black text-[#3c4043] uppercase tracking-widest">Validation Juridique Horizon</p>
                 <p className="text-[10px] text-[#5f6368] mt-2 leading-relaxed uppercase font-medium">
                   En validant ce contrat, vous certifiez que le matériel a été inspecté et que le numéro de série concorde avec la facture originale. Tout abus d'activation peut entraîner une révocation d'accès expert.
                 </p>
              </div>
           </div>

           <div className="flex gap-4 pt-8 border-t border-[#dadce0]">
              <button type="button" className="flex-1 btn-google-primary justify-center py-5 text-xs font-black uppercase tracking-[0.2em] shadow-xl">
                 <Save size={20} /> Certifier le Contrat Cloud
              </button>
              <button type="button" onClick={() => setIsModalOpen(false)} className="btn-google-outlined px-12 font-black uppercase text-[10px] tracking-widest">Annuler</button>
           </div>
        </form>
      </Modal>
    </div>
  );
};

export default WarrantyLog;
