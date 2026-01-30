
import React, { useMemo, useEffect, useState } from 'react';
import { 
  BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts';
import { 
  Activity, RefreshCw, Sparkles, BrainCircuit, TrendingUp, DollarSign,
  AlertTriangle, CheckCircle2, X, Star, ArrowUpRight, ShieldAlert, ShieldX
} from 'lucide-react';
import { useData, useNotifications, useUser } from '../App';
import { generateStrategicReport, isAiOperational } from '../services/geminiService';
import { Link } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const { 
    tickets, isLoading, refreshAll, isSyncing, config 
  } = useData();
  const { currentUser } = useUser();
  const { addNotification } = useNotifications();
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const aiReady = isAiOperational();
  const auditAllowed = config.aiEnabled && config.aiStrategicAudit;

  useEffect(() => { refreshAll(); }, []);

  const stats = useMemo(() => {
    const validTickets = tickets || [];
    const totalRevenue = validTickets.reduce((acc, t) => acc + (t.financials?.grandTotal || 0), 0) || 0;
    const totalMargin = validTickets.reduce((acc, t) => acc + (t.financials?.netMargin || 0), 0) || 0;
    const marginPercent = totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;
    
    const criticalTickets = validTickets.filter(t => t.priority === 'Urgent' && t.status !== 'Fermé').length || 0;

    const categoryData = ['SAV', 'Installation', 'Maintenance', 'Livraison'].map(cat => ({
      name: cat,
      value: validTickets.filter(t => t.category === cat).length || 0,
    }));

    return { 
      totalRevenue, totalMargin, marginPercent, categoryData, criticalTickets
    };
  }, [tickets]);

  const handleAiInsights = async () => {
    if (!aiReady) {
       addNotification({ 
         title: 'IA Inactive', 
         message: 'Le moteur Gemini n\'est pas configuré.', 
         type: 'warning' 
       });
       return;
    }
    if (!auditAllowed) {
       addNotification({ 
         title: 'Fonction Désactivée', 
         message: 'L\'audit stratégique a été désactivé dans les paramètres IA.', 
         type: 'error' 
       });
       return;
    }
    if (currentUser?.role !== 'ADMIN' && currentUser?.role !== 'MANAGER') {
       addNotification({ title: 'Accès Refusé', message: 'Seuls les administrateurs peuvent générer des audits.', type: 'error' });
       return;
    }
    setIsGenerating(true);
    addNotification({ title: 'Analyse IA', message: `Moteur ${config.aiModel === 'pro' ? 'Visionnaire' : 'Horizon'} en action...`, type: 'info' });
    try {
        const report = await generateStrategicReport({ 
          ticketCount: tickets.length, 
          totalRevenue: stats.totalRevenue,
          marginPercent: stats.marginPercent,
          categories: stats.categoryData,
        }, config.aiModel);
        setAiReport(report || null);
    } catch(e) {
        addNotification({ title: 'Erreur IA', message: 'Échec de la communication avec Gemini.', type: 'error' });
    } finally {
        setIsGenerating(false);
    }
  };

  if (isLoading) return (
    <div className="h-[80vh] flex items-center justify-center">
      <RefreshCw className="text-[#1a73e8] animate-spin" size={32} />
    </div>
  );

  return (
    <div className="space-y-10 animate-page-entry pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-normal text-[#3c4043]">
            {currentUser?.role === 'ADMIN' ? 'Gouvernance Horizon' : 
             currentUser?.role === 'TECHNICIAN' ? 'Tableau de Bord Expert' : 
             'Portail Agent SAV'}
          </h1>
          <p className="text-[#5f6368] text-sm font-medium">Analyse des flux Royal Plaza Gabon.</p>
        </div>
        <div className="flex gap-3">
          {(currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER') && (
            <button 
              onClick={handleAiInsights} 
              disabled={isGenerating} 
              className={`btn-google-outlined h-10 ${(aiReady && auditAllowed) ? 'text-[#1a73e8] border-[#1a73e8] hover:bg-[#e8f0fe]' : 'text-gray-400 border-gray-200 opacity-50'}`}
              title={!aiReady ? "Clé API Gemini manquante" : !auditAllowed ? "Désactivé dans les réglages" : "Générer un audit stratégique"}
            >
               {(!aiReady || !auditAllowed) ? <ShieldX size={16} /> : <Sparkles size={16} className={isGenerating ? 'animate-pulse' : ''} />}
               <span className="ml-2">{!(aiReady && auditAllowed) ? 'IA Désactivée' : 'Audit Stratégique IA'}</span>
            </button>
          )}
          <button onClick={refreshAll} disabled={isSyncing} className="btn-google-outlined h-10 px-4">
            <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      {aiReport && (
        <div className="google-card p-10 border-l-8 border-[#1a73e8] bg-blue-50/30 animate-in fade-in zoom-in-95 duration-500 relative">
          <button onClick={() => setAiReport(null)} className="absolute top-6 right-6 text-[#5f6368] hover:bg-white p-2 rounded-full shadow-sm"><X size={20} /></button>
          <div className="flex items-center gap-3 text-[#1a73e8] mb-8">
            <BrainCircuit size={32} className="animate-pulse" />
            <h2 className="text-xl font-black uppercase tracking-tight">Audit Stratégique Horizon Intelligence</h2>
          </div>
          <div className="text-sm text-[#3c4043] leading-loose whitespace-pre-wrap prose prose-blue max-w-none">
            {aiReport}
          </div>
        </div>
      )}

      {/* STATS TILES */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Revenue Brut', value: `${(stats.totalRevenue/1000).toFixed(0)}k F`, color: '#1a73e8', icon: <DollarSign size={20}/> },
          { label: 'Flux SAV', value: tickets.length, color: '#a142f4', icon: <Activity size={20}/> },
          { label: 'Urgences', value: stats.criticalTickets, color: '#d93025', icon: <AlertTriangle size={20}/> },
          { label: 'Note Moyenne', value: '4.8/5', color: '#188038', icon: <Star size={20}/> }
        ].map((s, i) => (
          <div key={i} className="google-card p-6 border-b-4" style={{ borderColor: s.color }}>
             <div className="flex justify-between items-center mb-4">
               <div className="p-2.5 rounded-xl bg-gray-50" style={{ color: s.color }}>{s.icon}</div>
               <span className="text-[10px] font-black text-gray-300 tracking-tighter">LIVE FEED</span>
             </div>
             <p className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest">{s.label}</p>
             <h3 className="text-2xl font-bold text-[#3c4043] mt-1">{s.value}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         <div className="lg:col-span-2 google-card p-8">
            <h2 className="text-sm font-black text-[#3c4043] uppercase tracking-widest mb-10 flex items-center gap-3">
               <TrendingUp size={18} className="text-[#1a73e8]" /> Répartition des Activités
            </h2>
            <div className="h-[350px]">
               <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.categoryData}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f3f4" />
                     <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#5f6368', fontSize: 11, fontWeight: 'bold'}} dy={10} />
                     <YAxis axisLine={false} tickLine={false} tick={{fill: '#5f6368', fontSize: 11}} />
                     <Tooltip cursor={{fill: '#f8f9fa'}} contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)'}} />
                     <Bar dataKey="value" fill="#1a73e8" radius={[8, 8, 0, 0]} barSize={50} />
                  </BarChart>
               </ResponsiveContainer>
            </div>
         </div>

         <div className="google-card p-8 bg-[#f8f9fa] border-none shadow-inner">
            <h2 className="text-sm font-black text-[#3c4043] uppercase tracking-widest mb-8">Urgences Critiques</h2>
            <div className="space-y-4">
               {tickets.filter(t => t.priority === 'Urgent' && t.status !== 'Fermé').slice(0, 4).map((t, i) => (
                  <Link to={`/tickets?id=${t.id}`} key={t.id} className="block p-4 bg-white rounded-2xl border border-red-100 hover:shadow-md transition-all group">
                     <div className="flex justify-between items-start">
                        <p className="text-xs font-black text-red-600">#{t.id}</p>
                        <ArrowUpRight size={14} className="text-red-200 group-hover:text-red-600" />
                     </div>
                     <p className="text-sm font-bold text-gray-800 mt-1 line-clamp-1">{t.customerName}</p>
                     <p className="text-[10px] text-gray-400 mt-1 uppercase font-bold tracking-widest">{t.productName}</p>
                  </Link>
               ))}
               {stats.criticalTickets === 0 && (
                  <div className="text-center py-20 opacity-30">
                     <CheckCircle2 size={48} className="mx-auto mb-4" />
                     <p className="text-xs font-black uppercase">Flux sécurisé</p>
                  </div>
               )}
            </div>
         </div>
      </div>
    </div>
  );
};

export default Dashboard;
