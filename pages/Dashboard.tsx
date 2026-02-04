
import React, { useMemo, useEffect } from 'react';
import { 
  BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts';
import { 
  Activity, RefreshCw, Sparkles, TrendingUp, DollarSign,
  AlertTriangle, CheckCircle2, ShieldCheck, ArrowUpRight,
  Database, Zap, Star
} from 'lucide-react';
import { useData, useUser } from '../App';
import { Link } from 'react-router-dom';
import { Ticket, ShowroomConfig, Technician } from '../types';

const Dashboard: React.FC = () => {
  const { 
    tickets, isLoading, refreshAll, isSyncing, showrooms, 
    syncMetrics, parts, customers, products, technicians
  } = useData();
  const { currentUser } = useUser();
  
  useEffect(() => { refreshAll(); }, [refreshAll]);

  const isTechnician = currentUser?.role === 'TECHNICIAN';

  const stats = useMemo(() => {
    // --- LOGIQUE DE FILTRAGE PAR RÔLE ---
    let activeTickets = (tickets || []).filter((t: Ticket) => !t.isArchived);
    
    if (isTechnician) {
      activeTickets = activeTickets.filter((t: Ticket) => t.assignedTechnicianId === currentUser?.id);
    }

    const totalRevenue = activeTickets.reduce((acc: number, t: Ticket) => acc + (t.financials?.grandTotal || 0), 0);
    const criticalTickets = activeTickets.filter((t: Ticket) => t.priority === 'Urgent' && t.status !== 'Fermé').length;
    
    // Pour le graphique par showroom
    const showroomData = (showrooms || []).map((s: ShowroomConfig) => ({
      name: s.id,
      value: activeTickets.filter((t: Ticket) => t.showroom === s.id).length
    })).filter(d => d.value > 0 || !isTechnician); // Cacher les sites vides pour les techs

    // Trouver le profil tech correspondant pour les indicateurs de performance
    const techProfile = technicians.find((t: Technician) => t.id === currentUser?.id);

    return { 
      totalRevenue, 
      showroomData, 
      criticalTickets, 
      totalCount: activeTickets.length,
      rating: techProfile?.rating || 5.0,
      completed: techProfile?.completedTickets || 0
    };
  }, [tickets, showrooms, isTechnician, currentUser, technicians]);

  if (isLoading) return <div className="h-[80vh] flex items-center justify-center"><RefreshCw className="text-[#3ecf8e] animate-spin" size={32} /></div>;

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-sb-entry pb-10">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1c1c1c]">
            {isTechnician ? 'Mon Pilotage Technique' : 'Tableau de bord'}
          </h1>
          <p className="text-xs text-[#686868] mt-1">
            {isTechnician 
              ? `Supervision de vos activités techniques • Session ${currentUser?.name}`
              : 'Supervision du flux opérationnel Royal Plaza.'}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={refreshAll} disabled={isSyncing} className="btn-sb-outline h-9 px-3">
            <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
          </button>
          {!isTechnician && (
            <button className="btn-sb-primary h-9 px-4">
              <Sparkles size={14} /> <span>Générer Audit IA</span>
            </button>
          )}
        </div>
      </header>

      {/* KPI GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { 
            label: isTechnician ? 'Production C.A.' : 'Flux de Revenus', 
            value: `${(stats.totalRevenue/1000).toFixed(0)}k F`, 
            icon: <DollarSign size={16}/>, 
            color: '#3ecf8e' 
          },
          { 
            label: isTechnician ? 'Mes Dossiers' : 'Tickets en Cours', 
            value: stats.totalCount, 
            icon: <Activity size={16}/>, 
            color: '#1c1c1c' 
          },
          { 
            label: isTechnician ? 'Mes Urgences' : 'Urgences SLA', 
            value: stats.criticalTickets, 
            icon: <AlertTriangle size={16}/>, 
            color: '#f87171' 
          },
          { 
            label: isTechnician ? 'Note Qualité' : 'Santé Cluster', 
            value: isTechnician ? `${stats.rating}/5` : '100%', 
            icon: isTechnician ? <Star size={16}/> : <ShieldCheck size={16}/>, 
            color: '#3ecf8e' 
          }
        ].map((item, i) => (
          <div key={i} className="sb-card flex items-start justify-between shadow-sm border-[#ededed]">
            <div>
              <p className="text-[10px] font-black text-[#686868] uppercase tracking-widest">{item.label}</p>
              <h3 className="text-2xl font-black text-[#1c1c1c] mt-1">{item.value}</h3>
            </div>
            <div className="p-2.5 bg-[#f8f9fa] rounded-xl border border-[#f5f5f5]" style={{ color: item.color }}>
              {item.icon}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         <div className="lg:col-span-2 sb-card border-[#ededed] shadow-sm">
            <div className="flex items-center justify-between mb-8">
               <h2 className="text-[11px] font-black text-[#1c1c1c] uppercase tracking-widest">
                 {isTechnician ? 'Répartition de mes interventions' : 'Activité Logistique par Site'}
               </h2>
               <div className="p-1.5 bg-[#f8f9fa] rounded text-[#686868] border border-[#f5f5f5]"><TrendingUp size={14}/></div>
            </div>
            <div className="h-[300px]">
               <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.showroomData}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                     <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#686868', fontSize: 10, fontWeight: 'bold'}} dy={10} />
                     <YAxis axisLine={false} tickLine={false} tick={{fill: '#686868', fontSize: 10}} />
                     <Tooltip 
                        cursor={{fill: '#fcfcfc'}} 
                        contentStyle={{borderRadius: '8px', border: '1px solid #ededed', boxShadow: 'none', fontSize: '12px', fontWeight: 'bold'}} 
                     />
                     <Bar dataKey="value" fill="#3ecf8e" radius={[4, 4, 0, 0]} barSize={32} />
                  </BarChart>
               </ResponsiveContainer>
            </div>
         </div>

         <div className="sb-card border-[#ededed] shadow-sm flex flex-col">
            <h2 className="text-[11px] font-black text-[#1c1c1c] uppercase tracking-widest mb-6">
              {isTechnician ? 'Mes Urgences Immédiates' : "File d'Urgences Critiques"}
            </h2>
            <div className="space-y-3 flex-1 overflow-y-auto pr-1 custom-scrollbar">
               {(isTechnician 
                  ? tickets.filter((t: Ticket) => t.assignedTechnicianId === currentUser?.id && !t.isArchived && t.priority === 'Urgent')
                  : tickets.filter((t: Ticket) => !t.isArchived && t.priority === 'Urgent')
               ).slice(0, 5).map((t: Ticket) => (
                  <Link to={`/tickets?id=${t.id}`} key={t.id} className="block p-4 border border-[#ededed] rounded-xl hover:border-[#3ecf8e] transition-all group bg-[#fcfcfc]">
                     <div className="flex justify-between items-center mb-1.5">
                        <span className="text-[9px] font-black text-red-500 uppercase tracking-tighter bg-red-50 px-2 py-0.5 rounded">SLA ALERT</span>
                        <ArrowUpRight size={14} className="text-[#686868] group-hover:text-[#3ecf8e]" />
                     </div>
                     <p className="text-sm font-black text-[#1c1c1c] truncate">{t.customerName}</p>
                     <p className="text-[11px] text-[#686868] font-bold truncate mt-1">{t.productName || 'Matériel non spécifié'}</p>
                  </Link>
               ))}
               {(isTechnician ? stats.criticalTickets : tickets.filter((t: Ticket) => !t.isArchived && t.priority === 'Urgent').length) === 0 && (
                  <div className="flex flex-col items-center justify-center py-24 text-[#686868] opacity-30">
                     <CheckCircle2 size={40} className="mb-4" />
                     <p className="text-[11px] font-black uppercase tracking-widest text-center leading-relaxed">Aucun incident critique<br/>en attente</p>
                  </div>
               )}
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-10">
        <div className="sb-card flex items-center gap-6 border-[#ededed] shadow-sm hover:border-[#3ecf8e] transition-colors">
           <div className="w-14 h-14 rounded-2xl bg-[#f0fdf4] text-[#3ecf8e] flex items-center justify-center border border-[#dcfce7] shadow-sm">
              <Database size={28}/>
           </div>
           <div>
              <h2 className="text-[14px] font-black text-[#1c1c1c] uppercase tracking-tight">Cloud Infrastructure</h2>
              <p className="text-[11px] text-[#686868] font-bold mt-0.5">Cluster LBV-WEST • Ping: {syncMetrics.latency || 38}ms</p>
           </div>
        </div>
        <div className="sb-card flex items-center gap-6 border-[#ededed] shadow-sm hover:border-[#1c1c1c] transition-colors">
           <div className="w-14 h-14 rounded-2xl bg-[#f8f9fa] text-[#1c1c1c] flex items-center justify-center border border-[#ededed] shadow-sm">
              <Zap size={28}/>
           </div>
           <div>
              <h2 className="text-[14px] font-black text-[#1c1c1c] uppercase tracking-tight">
                {isTechnician ? 'Bilan Technique Global' : 'Empreinte de données'}
              </h2>
              <p className="text-[11px] text-[#686868] font-bold mt-0.5">
                {isTechnician 
                  ? `${stats.completed} Interventions réussies au total` 
                  : `${parts.length} Pièces • ${products.length} Produits • ${customers.length} Clients`}
              </p>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
