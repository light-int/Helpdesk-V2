
import React, { useMemo, useEffect } from 'react';
import { 
  BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts';
import { 
  Activity, RefreshCw, Sparkles, TrendingUp, DollarSign,
  AlertTriangle, CheckCircle2, ShieldCheck, ArrowUpRight,
  Database, Zap
} from 'lucide-react';
import { useData, useNotifications, useUser } from '../App';
import { Link } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const { 
    tickets, isLoading, refreshAll, isSyncing, showrooms, 
    syncMetrics, parts, customers, products
  } = useData();
  
  useEffect(() => { refreshAll(); }, []);

  const stats = useMemo(() => {
    const activeTickets = (tickets || []).filter(t => !t.isArchived);
    const totalRevenue = activeTickets.reduce((acc, t) => acc + (t.financials?.grandTotal || 0), 0);
    const criticalTickets = activeTickets.filter(t => t.priority === 'Urgent' && t.status !== 'Fermé').length;
    const showroomData = showrooms.map(s => ({
      name: s.id,
      value: tickets.filter(t => t.showroom === s.id && !t.isArchived).length
    }));
    return { totalRevenue, showroomData, criticalTickets, totalCount: activeTickets.length };
  }, [tickets, showrooms]);

  if (isLoading) return <div className="h-[80vh] flex items-center justify-center"><RefreshCw className="text-[#3ecf8e] animate-spin" size={32} /></div>;

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-sb-entry pb-10">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1c1c1c]">Tableau de bord</h1>
          <p className="text-xs text-[#686868] mt-1">Surveillance globale de l'écosystème Plaza.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={refreshAll} disabled={isSyncing} className="btn-sb-outline h-9 px-3">
            <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
          </button>
          <button className="btn-sb-primary h-9 px-4">
            <Sparkles size={14} /> <span>Audit Stratégique</span>
          </button>
        </div>
      </header>

      {/* KPI GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Revenu Global', value: `${(stats.totalRevenue/1000).toFixed(0)}k F`, icon: <DollarSign size={16}/>, color: '#3ecf8e' },
          { label: 'Flux SAV Actif', value: stats.totalCount, icon: <Activity size={16}/>, color: '#1c1c1c' },
          { label: 'Alertes SLA', value: stats.criticalTickets, icon: <AlertTriangle size={16}/>, color: '#f87171' },
          { label: 'Santé Système', value: '100%', icon: <ShieldCheck size={16}/>, color: '#3ecf8e' }
        ].map((item, i) => (
          <div key={i} className="sb-card flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold text-[#686868] uppercase tracking-wider">{item.label}</p>
              <h3 className="text-2xl font-bold text-[#1c1c1c] mt-1">{item.value}</h3>
            </div>
            <div className="p-2 bg-[#f8f9fa] rounded" style={{ color: item.color }}>
              {item.icon}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         <div className="lg:col-span-2 sb-card">
            <div className="flex items-center justify-between mb-8">
               <h2 className="text-xs font-bold text-[#1c1c1c] uppercase tracking-widest">Activité par Showroom</h2>
               <div className="p-1.5 bg-[#f8f9fa] rounded text-[#686868]"><TrendingUp size={14}/></div>
            </div>
            <div className="h-[300px]">
               <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.showroomData}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                     <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#686868', fontSize: 10}} dy={10} />
                     <YAxis axisLine={false} tickLine={false} tick={{fill: '#686868', fontSize: 10}} />
                     <Tooltip 
                        cursor={{fill: '#fcfcfc'}} 
                        contentStyle={{borderRadius: '8px', border: '1px solid #ededed', boxShadow: 'none', fontSize: '12px'}} 
                     />
                     <Bar dataKey="value" fill="#3ecf8e" radius={[4, 4, 0, 0]} barSize={32} />
                  </BarChart>
               </ResponsiveContainer>
            </div>
         </div>

         <div className="sb-card flex flex-col">
            <h2 className="text-xs font-bold text-[#1c1c1c] uppercase tracking-widest mb-6">Urgences Critiques</h2>
            <div className="space-y-3 flex-1 overflow-y-auto pr-1 custom-scrollbar">
               {tickets.filter(t => !t.isArchived && t.priority === 'Urgent').slice(0, 5).map((t) => (
                  <Link to={`/tickets?id=${t.id}`} key={t.id} className="block p-3 border border-[#ededed] rounded hover:border-[#3ecf8e] transition-all group">
                     <div className="flex justify-between items-center mb-1">
                        <span className="text-[9px] font-bold text-red-500 uppercase tracking-tighter">SLA Alert</span>
                        <ArrowUpRight size={12} className="text-[#686868] group-hover:text-[#3ecf8e]" />
                     </div>
                     <p className="text-sm font-bold text-[#1c1c1c] truncate">{t.customerName}</p>
                     <p className="text-[11px] text-[#686868] truncate mt-0.5">{t.productName}</p>
                  </Link>
               ))}
               {stats.criticalTickets === 0 && (
                  <div className="flex flex-col items-center justify-center py-20 text-[#686868] opacity-50">
                     <CheckCircle2 size={32} className="mb-3" />
                     <p className="text-[10px] font-bold uppercase">Aucune alerte</p>
                  </div>
               )}
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="sb-card flex items-center gap-6">
           <div className="w-12 h-12 rounded bg-[#f0fdf4] text-[#3ecf8e] flex items-center justify-center border border-[#dcfce7]">
              <Database size={24}/>
           </div>
           <div>
              <h2 className="text-sm font-bold text-[#1c1c1c]">Infrastructure Cloud</h2>
              <p className="text-[11px] text-[#686868] mt-0.5">Connecté à Supabase LBV-1. Latence: {syncMetrics.latency || 38}ms</p>
           </div>
        </div>
        <div className="sb-card flex items-center gap-6">
           <div className="w-12 h-12 rounded bg-[#f8f9fa] text-[#1c1c1c] flex items-center justify-center border border-[#ededed]">
              <Zap size={24}/>
           </div>
           <div>
              <h2 className="text-sm font-bold text-[#1c1c1c]">Empreinte de données</h2>
              <p className="text-[11px] text-[#686868] mt-0.5">{parts.length} Pièces • {products.length} Produits • {customers.length} Clients</p>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
