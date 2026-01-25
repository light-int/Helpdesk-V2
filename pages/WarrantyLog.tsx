
import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, Search, Filter, RefreshCw, Trash2, Loader2, Sparkles, Package, ShieldAlert
} from 'lucide-react';
import { useNotifications, useData } from '../App';

const WarrantyLog: React.FC = () => {
  const { warranties, isLoading, loadDemoData, refreshAll, isSyncing } = useData();
  const { addNotification } = useNotifications();
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => { refreshAll(); }, []);

  const filtered = warranties.filter(w => 
    w.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    w.serialNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) return <div className="h-[60vh] flex items-center justify-center"><Loader2 className="animate-spin text-[#1a73e8]" /></div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-normal text-[#3c4043]">Registre des Garanties</h1>
          <p className="text-[#5f6368] text-sm">Suivi des contrats de protection et validité S/N.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={refreshAll} className="btn-google-outlined">
            <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
          </button>
          <button className="btn-google-primary"><ShieldCheck size={18} /> Nouveau Contrat</button>
        </div>
      </header>

      <div className="google-card overflow-hidden">
        <div className="px-6 py-4 border-b border-[#dadce0] flex items-center justify-between bg-[#f8f9fa]">
           <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 text-[#5f6368]" size={16} />
              <input type="text" placeholder="Rechercher par client ou S/N..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 h-9" />
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#dadce0] bg-[#f8f9fa] text-[#5f6368] text-xs font-medium uppercase tracking-wider">
                <th className="px-6 py-4">Produit & S/N</th>
                <th className="px-6 py-4">Client</th>
                <th className="px-6 py-4">Expiration</th>
                <th className="px-6 py-4 text-center">Statut</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#dadce0]">
              {filtered.map(w => {
                const isExpired = new Date(w.expiryDate) < new Date();
                return (
                  <tr key={w.id} className="hover:bg-[#f1f3f4] transition-colors group">
                    <td className="px-6 py-4">
                       <div className="flex items-center gap-3">
                          <div className={`p-2 rounded ${isExpired ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                             <Package size={18} />
                          </div>
                          <div>
                             <p className="text-sm font-medium text-[#3c4043]">{w.product}</p>
                             <p className="text-[10px] text-[#5f6368] font-mono">{w.brand} • {w.serialNumber}</p>
                          </div>
                       </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-[#3c4043] font-medium">{w.customerName}</td>
                    <td className="px-6 py-4 text-sm text-[#5f6368] font-medium">{new Date(w.expiryDate).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-center">
                       <span className={`px-2 py-1 rounded-full text-[10px] font-medium ${
                         isExpired ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
                       }`}>
                         {isExpired ? 'Expiré' : 'Actif'}
                       </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                       <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="text-[10px] font-medium text-[#1a73e8] px-3 py-1 hover:bg-[#e8f0fe] rounded">SINISTRE</button>
                          <button className="p-2 text-[#5f6368] hover:text-red-600 rounded-full"><Trash2 size={16}/></button>
                       </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-20 text-center space-y-4">
               <ShieldAlert size={40} className="mx-auto text-[#dadce0]" />
               <p className="text-sm text-[#5f6368]">Aucun contrat trouvé.</p>
               <button onClick={loadDemoData} className="btn-google-outlined text-xs">Simuler des données</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WarrantyLog;
