
import React, { useMemo, useEffect, useState } from 'react';
import { 
  BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts';
import { 
  Activity, RefreshCw, Sparkles, TrendingUp, DollarSign,
  AlertTriangle, CheckCircle2, Star, ArrowUpRight
} from 'lucide-react';
import { useData, useNotifications, useUser } from '../App';
import { generateStrategicReport, isAiOperational } from '../services/geminiService';
import { Link } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const { 
    tickets, isLoading, refreshAll, isSyncing 
  } = useData();
  const { currentUser } = useUser();
  const { addNotification } = useNotifications();
  const [isGenerating, setIsGenerating] = useState(false);
  
  const aiReady = isAiOperational();

  useEffect(() => { refreshAll(); }, []);

  const stats = useMemo(() => {
    const validTickets = (tickets || []).filter(t => !t.isArchived);
    const totalRevenue = validTickets.reduce((acc, t) => acc + (t.financials?.grandTotal || 0), 0) || 0;
    const criticalTickets = validTickets.filter(t => t.priority === 'Urgent' && t.status !== 'Fermé').length || 0;

    const categoryData = ['SAV', 'Installation', 'Maintenance', 'Livraison'].map(cat => ({
      name: cat,
      value: validTickets.filter(t => t.category === cat).length || 0,
    }));

    return { totalRevenue, categoryData, criticalTickets, totalCount: validTickets.length };
  }, [tickets]);

  if (isLoading) return (
    <div className="h-[80vh] flex items-center justify-center">
      <RefreshCw className="text-[#1a73e8] animate-spin" size={32} />
    </div>
  );

  return (
    <div className="space-y-8 animate-page-entry pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-light text-[#202124]">Tableau de Bord</h1>
          <p className="text-[#5f6368] text-xs font-bold uppercase tracking-widest mt-1">Surveillance Cloud Horizon • Libreville</p>
        </div>
        <div className="flex gap-3">
          {(currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER') && (
            <button 
              disabled={isGenerating || !aiReady} 
              className={`btn-google-primary h-10 ${!aiReady ? 'bg-gray-400 cursor-not-allowed' : ''}`}
            >
               <Sparkles size={16} /> Audit IA
            </button>
          )}
          <button onClick={refreshAll} disabled={isSyncing} className="btn-google-outlined h-10 px-4">
            <RefreshCw size={18} className={isSyncing ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      {/* STRATEGIC KPIS - SHARP EDITION */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Chiffre d\'Affaires', value: `${(stats.totalRevenue/1000).toFixed(0)}k`, color: '#1a73e8', icon: <DollarSign size={20}/> },
          { label: 'Volume SAV Actif', value: stats.totalCount, color: '#1a73e8', icon: <Activity size={20}/> },
          { label: 'Urgences SLA', value: stats.criticalTickets, color: '#d93025', icon: <AlertTriangle size={20}/> },
          { label: 'Satisfaction Client', value: '4.9', color: '#188038', icon: <Star size={20}/> }
        ].map((s, i) => (
          <div key={i} className="stats-card">
             <div className="flex justify-between items-start mb-4">
               <div className="p-2 bg-gray-50 text-gray-500">{s.icon}</div>
               <div className="text-[10px] font-bold text-gray-400 uppercase">Aujourd'hui</div>
             </div>
             <p className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest">{s.label}</p>
             <h3 className="text-3xl font-bold text-[#202124] mt-2 tracking-tight">{s.value}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         <div className="lg:col-span-2 stats-card p-10 bg-white">
            <h2 className="text-xs font-black text-[#202124] uppercase tracking-widest mb-10">Flux d'Interventions par Pôle</h2>
            <div className="h-[350px]">
               <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.categoryData}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f3f4" />
                     <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fill: '#70757a', fontSize: 11, fontWeight: '500'}} 
                        dy={10} 
                     />
                     <YAxis axisLine={false} tickLine={false} tick={{fill: '#70757a', fontSize: 11}} />
                     <Tooltip 
                       cursor={{fill: '#f8f9fa'}} 
                       contentStyle={{border: '1px solid #dadce0', borderRadius: '0'}} 
                     />
                     <Bar dataKey="value" fill="#1a73e8" barSize={32} />
                  </BarChart>
               </ResponsiveContainer>
            </div>
         </div>

         <div className="stats-card p-6 bg-[#fdfdfd]">
            <h2 className="text-xs font-black text-[#202124] uppercase tracking-widest mb-6">Urgences Critiques</h2>
            <div className="space-y-2">
               {tickets.filter(t => t.priority === 'Urgent' && t.status !== 'Fermé').slice(0, 5).map((t) => (
                  <Link to={`/tickets?id=${t.id}`} key={t.id} className="block p-4 border border-[#dadce0] bg-white hover:border-[#1a73e8] transition-all group">
                     <div className="flex justify-between items-start">
                        <span className="text-[10px] font-black text-[#1a73e8]">#{t.id}</span>
                        <ArrowUpRight size={14} className="text-gray-300 group-hover:text-[#1a73e8]" />
                     </div>
                     <p className="text-sm font-bold text-[#3c4043] mt-2 truncate">{t.customerName}</p>
                     <p className="text-[10px] text-[#5f6368] font-medium mt-0.5">{t.productName}</p>
                  </Link>
               ))}
               {stats.criticalTickets === 0 && (
                  <div className="py-20 text-center">
                     <CheckCircle2 size={40} className="mx-auto text-gray-200 mb-4" />
                     <p className="text-xs font-bold text-gray-400 uppercase">Flux Nominal</p>
                  </div>
               )}
            </div>
         </div>
      </div>
    </div>
  );
};

export default Dashboard;
