
import React, { useState, useMemo, useEffect } from 'react';
import { 
  ShieldCheck, Search, RefreshCw, Plus, FileSpreadsheet,
  ShieldAlert, ChevronLeft, ChevronRight, X, SlidersHorizontal,
  RotateCcw, MapPin, Building2, BadgeCheck, Timer
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useNotifications, useData, useUser } from '../App';
import { WarrantyRecord } from '../types';
import Modal from '../components/Modal';
import Drawer from '../components/Drawer';

const WarrantyLog: React.FC = () => {
  const { warranties, isLoading, refreshAll, isSyncing, showrooms } = useData();
  const { addNotification } = useNotifications();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Tous');
  const [selectedWarranty, setSelectedWarranty] = useState<WarrantyRecord | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => { refreshAll(); }, []);

  const filteredWarranties = useMemo(() => {
    return (warranties || []).filter(w => {
      const matchesSearch = (w.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (w.serialNumber || '').toLowerCase().includes(searchTerm.toLowerCase());
      const isExpired = new Date(w.expiryDate) < new Date();
      const statusMatch = statusFilter === 'Tous' || (statusFilter === 'Actif' && !isExpired) || (statusFilter === 'Expiré' && isExpired);
      return matchesSearch && statusMatch;
    });
  }, [warranties, searchTerm, statusFilter]);

  const stats = {
    total: warranties.length,
    active: warranties.filter(w => new Date(w.expiryDate) >= new Date()).length
  };

  const getStatusChip = (expiry: string) => {
    const isExpired = new Date(expiry) < new Date();
    return isExpired ? 'bg-[#f9dedc] text-[#b3261e]' : 'bg-[#c4eed0] text-[#072711]';
  };

  if (isLoading) return <div className="h-[80vh] flex items-center justify-center"><RefreshCw className="animate-spin text-[#0b57d0]" size={32} /></div>;

  return (
    <div className="space-y-8 animate-m3-entry pb-20">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-normal text-[#1f1f1f]">Registre Garanties</h1>
          <p className="text-sm text-[#747775] mt-1">Management des contrats Horizon</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setIsModalOpen(true)} className="btn-md-primary"><Plus size={18} /> <span>Émettre</span></button>
          <button onClick={refreshAll} className="p-3 hover:bg-[#e1e3e1] rounded-full"><RefreshCw size={20} className={isSyncing ? 'animate-spin' : ''}/></button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Protection Active', value: stats.active, icon: <ShieldCheck />, color: '#0b57d0', bg: 'bg-[#d3e3fd]' },
          { label: 'Contrats Total', value: stats.total, icon: <BadgeCheck />, color: '#137333', bg: 'bg-[#c4eed0]' }
        ].map((s, i) => (
          <div key={i} className="md-card flex items-center gap-5 border border-transparent">
            <div className={`w-12 h-12 ${s.bg} rounded-2xl flex items-center justify-center`} style={{ color: s.color }}>
              {React.cloneElement(s.icon as React.ReactElement, { size: 22 })}
            </div>
            <div>
              <p className="text-[10px] font-bold text-[#747775] uppercase tracking-widest">{s.label}</p>
              <h3 className="text-2xl font-bold text-[#1f1f1f]">{s.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="relative group max-w-2xl">
        <Search className="absolute left-4 top-4 text-[#444746]" size={20} />
        <input 
          type="text" placeholder="N° de série ou client..." 
          className="w-full pl-14 h-14 bg-[#f0f4f9] border-none rounded-full focus:bg-white focus:ring-2 focus:ring-[#0b57d0] transition-all"
          value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="md-table-container">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#f8fafd]">
              <th className="px-8 py-4 text-xs font-bold text-[#444746] uppercase">Produit & S/N</th>
              <th className="px-8 py-4 text-xs font-bold text-[#444746] uppercase">Client</th>
              <th className="px-8 py-4 text-xs font-bold text-[#444746] uppercase">Expiration</th>
              <th className="px-8 py-4 text-xs font-bold text-[#444746] uppercase text-right">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f0f4f9]">
            {filteredWarranties.map((w) => (
              <tr key={w.id} onClick={() => setSelectedWarranty(w)} className="cursor-pointer hover:bg-[#f0f4f9] transition-colors">
                <td className="px-8 py-5">
                  <p className="text-sm font-bold text-[#1f1f1f]">{w.product}</p>
                  <p className="text-[10px] font-mono text-[#747775] uppercase">S/N: {w.serialNumber}</p>
                </td>
                <td className="px-8 py-5 text-sm font-medium text-[#444746]">{w.customerName}</td>
                <td className="px-8 py-5">
                  <p className="text-xs font-bold text-[#1f1f1f]">{new Date(w.expiryDate).toLocaleDateString()}</p>
                  <p className="text-[10px] text-[#747775] uppercase">Acquis le {new Date(w.purchaseDate).toLocaleDateString()}</p>
                </td>
                <td className="px-8 py-5 text-right">
                  <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${getStatusChip(w.expiryDate)}`}>
                    {new Date(w.expiryDate) < new Date() ? 'Expiré' : 'Actif'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Drawer isOpen={!!selectedWarranty} onClose={() => setSelectedWarranty(null)} title="Contrat Horizon Care" icon={<ShieldCheck size={20}/>}>
        {selectedWarranty && (
          <div className="space-y-8 animate-m3-entry">
            <div className="flex flex-col items-center text-center p-8 bg-[#f0f4f9] rounded-[40px]">
               <div className={`w-20 h-20 rounded-[30px] flex items-center justify-center mb-4 shadow-sm ${new Date(selectedWarranty.expiryDate) < new Date() ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                 <ShieldCheck size={40} />
               </div>
               <h3 className="text-2xl font-bold text-[#1f1f1f] tracking-tight">{selectedWarranty.product}</h3>
               <p className="text-sm text-[#0b57d0] font-bold uppercase tracking-widest mt-2">{selectedWarranty.brand} • S/N {selectedWarranty.serialNumber}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="p-6 bg-white border border-[#c4c7c5] rounded-[24px]">
                <p className="text-[10px] font-black text-[#747775] uppercase mb-1">Activation</p>
                <p className="text-sm font-bold">{new Date(selectedWarranty.purchaseDate).toLocaleDateString()}</p>
              </div>
              <div className="p-6 bg-white border border-[#c4c7c5] rounded-[24px]">
                <p className="text-[10px] font-black text-[#747775] uppercase mb-1">Expiration</p>
                <p className="text-sm font-bold">{new Date(selectedWarranty.expiryDate).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default WarrantyLog;
