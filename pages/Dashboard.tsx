
import React, { useMemo, useEffect, useState } from 'react';
import { 
  BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, AreaChart, Area
} from 'recharts';
import { 
  Activity, RefreshCw, Zap, Sparkles, BrainCircuit, TrendingUp, Clock, Percent, DollarSign,
  AlertTriangle, CheckCircle2, X, ClipboardList, Star, Package,
  UserCheck, ArrowUpRight, Store, ShoppingBag, Plus, Users
} from 'lucide-react';
import { useData, useNotifications, useUser } from '../App';
import { generateStrategicReport } from '../services/geminiService';
import { Link } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const { 
    tickets, isLoading, refreshAll, isSyncing, showrooms, parts, 
    technicians, users, products, customers 
  } = useData();
  const { currentUser } = useUser();
  const { addNotification } = useNotifications();
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  useEffect(() => { refreshAll(); }, []);

  const stats = useMemo(() => {
    // Basic Global Stats
    const totalRevenue = tickets?.reduce((acc, t) => acc + (t.financials?.grandTotal || 0), 0) || 0;
    const totalMargin = tickets?.reduce((acc, t) => acc + (t.financials?.netMargin || 0), 0) || 0;
    const marginPercent = totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;
    
    // Technician Specific Stats
    const myTickets = tickets?.filter(t => t.assignedTechnicianId === currentUser?.id) || [];
    const myActive = myTickets.filter(t => t.status !== 'Fermé' && t.status !== 'Résolu').length;
    const myCompleted = myTickets.filter(t => t.status === 'Fermé' || t.status === 'Résolu').length;
    
    // Agent Specific Stats
    const newTickets = tickets?.filter(t => t.status === 'Nouveau').length || 0;
    const criticalTickets = tickets?.filter(t => t.priority === 'Urgent' && t.status !== 'Fermé').length || 0;

    // Infrastructure Stats
    const accountCount = users.length;
    const productCount = products.length;
    const customerCount = customers.length;
    const showroomCount = showrooms.length;

    // Charts
    const categoryData = ['SAV', 'Installation', 'Maintenance', 'Livraison'].map(cat => ({
      name: cat,
      value: tickets?.filter(t => t.category === cat).length || 0,
    }));

    const impactData = [
      { name: 'Critique', value: tickets?.filter(t => t.clientImpact === 'Critique').length || 0, color: '#d93025' },
      { name: 'Modéré', value: tickets?.filter(t => t.clientImpact === 'Modéré').length || 0, color: '#f9ab00' },
      { name: 'Standard', value: tickets?.filter(t => !t.clientImpact || t.clientImpact === 'Faible').length || 0, color: '#1a73e8' },
    ];

    const lowStockParts = parts.filter(p => p.currentStock <= p.minStock).length;

    return { 
      totalRevenue, totalMargin, marginPercent, categoryData, impactData, 
      myActive, myCompleted, newTickets, criticalTickets, lowStockParts,
      myTickets, accountCount, productCount, customerCount, showroomCount
    };
  }, [tickets, currentUser, parts, users, products, customers, showrooms]);

  const handleAiInsights = async () => {
    if (currentUser?.role !== 'ADMIN' && currentUser?.role !== 'MANAGER') {
       addNotification({ title: 'Accès Refusé', message: 'Seuls les administrateurs peuvent générer des audits stratégiques.', type: 'error' });
       return;
    }
    setIsGenerating(true);
    addNotification({ title: 'Analyse IA', message: 'Gemini examine les données opérationnelles...', type: 'info' });
    const report = await generateStrategicReport({ 
      ticketCount: tickets.length, 
      totalRevenue: stats.totalRevenue,
      marginPercent: stats.marginPercent,
      categories: stats.categoryData,
      impacts: stats.impactData
    });
    setAiReport(report ?? null);
    setIsGenerating(false);
  };

  if (isLoading) return (
    <div className="h-[80vh] flex items-center justify-center">
      <RefreshCw className="text-[#1a73e8] animate-spin" size={32} />
    </div>
  );

  // --- RENDU ADMIN / MANAGER ---
  const renderAdminDashboard = () => (
    <div className="space-y-10">
      {/* SECTION 1: KPIS OPÉRATIONNELS */}
      <section className="space-y-6">
        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-[#5f6368] ml-1">Performances Opérationnelles</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: 'Flux SAV Actif', value: tickets.length, trend: '+12%', icon: <Activity size={20}/>, color: '#1a73e8' },
            { label: 'Revenu Brut', value: `${(stats.totalRevenue/1000).toFixed(0)}k F`, trend: '+5%', icon: <DollarSign size={20}/>, color: '#1a73e8' },
            { label: 'Marge Nette', value: `${stats.marginPercent.toFixed(1)}%`, trend: 'Optimale', icon: <Percent size={20}/>, color: '#34a853' },
            { label: 'SLA Moyen', value: '4.2h', trend: '-15min', icon: <Clock size={20}/>, color: '#fbbc04' },
          ].map((s, i) => (
            <div key={i} className="google-card p-6 border-b-4" style={{ borderColor: s.color }}>
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 rounded-lg bg-[#f8f9fa]" style={{ color: s.color }}>{s.icon}</div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${s.trend.startsWith('+') ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{s.trend}</span>
              </div>
              <p className="text-[#5f6368] text-[10px] font-bold uppercase tracking-widest">{s.label}</p>
              <h3 className="text-2xl font-medium text-[#3c4043] mt-1">{s.value}</h3>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 2: INFRASTRUCTURE SYSTÈME */}
      <section className="space-y-6">
        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-[#5f6368] ml-1">Infrastructure Horizon Cloud</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Comptes Actifs', value: stats.accountCount, icon: <Users size={16}/>, color: '#a142f4', link: '/settings' },
            { label: 'Référentiel Produits', value: stats.productCount, icon: <ShoppingBag size={16}/>, color: '#1a73e8', link: '/products' },
            { label: 'Base Clients CRM', value: stats.customerCount, icon: <UserCheck size={16}/>, color: '#34a853', link: '/customers' },
            { label: 'Réseau Showrooms', value: stats.showroomCount, icon: <Store size={16}/>, color: '#ea4335', link: '/settings' },
          ].map((inf, i) => (
            <Link to={inf.link} key={i} className="google-card p-4 hover:shadow-md transition-all group flex items-center justify-between">
               <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center transition-colors group-hover:bg-white" style={{ color: inf.color }}>
                     {inf.icon}
                  </div>
                  <div>
                     <p className="text-[9px] font-black uppercase text-gray-400 tracking-wider">{inf.label}</p>
                     <p className="text-lg font-bold text-gray-700">{inf.value}</p>
                  </div>
               </div>
               <ArrowUpRight size={14} className="text-gray-300 group-hover:text-blue-600 transition-colors" />
            </Link>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 google-card p-8">
           <h2 className="text-sm font-medium text-[#3c4043] flex items-center gap-2 mb-8">
              <TrendingUp size={18} className="text-[#1a73e8]" /> Répartition des Activités SAV
           </h2>
           <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.categoryData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f3f4" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#5f6368', fontSize: 11}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#5f6368', fontSize: 11}} />
                  <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '8px', border: '1px solid #dadce0'}} />
                  <Bar dataKey="value" fill="#1a73e8" radius={[4, 4, 0, 0]} barSize={45} />
                </BarChart>
              </ResponsiveContainer>
           </div>
        </div>

        <div className="google-card p-8">
           <h2 className="text-sm font-medium text-[#3c4043] mb-8 flex items-center gap-2">
              <AlertTriangle size={18} className="text-red-600" /> Urgences Critiques
           </h2>
           <div className="space-y-4">
              {tickets.filter(t => t.priority === 'Urgent' && t.status !== 'Fermé').slice(0, 5).map(t => (
                <Link to="/tickets" key={t.id} className="block p-3 hover:bg-red-50 border border-transparent hover:border-red-100 rounded-xl transition-all group">
                   <div className="flex justify-between items-start">
                      <p className="text-xs font-bold text-red-700">#{t.id} • {t.customerName}</p>
                      <ArrowUpRight size={14} className="text-red-300 group-hover:text-red-600" />
                   </div>
                   <p className="text-[10px] text-red-600 mt-1 line-clamp-1">{t.description}</p>
                </Link>
              ))}
              {stats.criticalTickets === 0 && (
                <div className="text-center py-10">
                   <CheckCircle2 className="mx-auto text-green-200 mb-2" size={32} />
                   <p className="text-xs text-gray-400 font-medium">Aucun ticket critique</p>
                </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );

  // --- RENDU TECHNICIEN ---
  const renderTechnicianDashboard = () => {
    const myInfo = technicians.find(t => t.id === currentUser?.id);
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="google-card p-6 border-b-4 border-blue-600">
             <p className="text-[#5f6368] text-[10px] font-black uppercase tracking-widest mb-4">Mes Dossiers Actifs</p>
             <div className="flex items-center justify-between">
                <h3 className="text-3xl font-black text-[#1a73e8]">{stats.myActive}</h3>
                <ClipboardList className="text-blue-100" size={32} />
             </div>
          </div>
          <div className="google-card p-6 border-b-4 border-green-600">
             <p className="text-[#5f6368] text-[10px] font-black uppercase tracking-widest mb-4">Interventions Finies</p>
             <div className="flex items-center justify-between">
                <h3 className="text-3xl font-black text-green-600">{stats.myCompleted}</h3>
                <CheckCircle2 className="text-green-100" size={32} />
             </div>
          </div>
          <div className="google-card p-6 border-b-4 border-amber-500">
             <p className="text-[#5f6368] text-[10px] font-black uppercase tracking-widest mb-4">Ma Note Client</p>
             <div className="flex items-center justify-between">
                <h3 className="text-3xl font-black text-amber-600">{myInfo?.rating || '5.0'}</h3>
                <Star className="text-amber-100" size={32} fill="currentColor" />
             </div>
          </div>
          <div className="google-card p-6 border-b-4 border-red-600">
             <p className="text-[#5f6368] text-[10px] font-black uppercase tracking-widest mb-4">Alertes Pièces</p>
             <div className="flex items-center justify-between">
                <h3 className="text-3xl font-black text-red-600">{stats.lowStockParts}</h3>
                <Package className="text-red-100" size={32} />
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
           <div className="lg:col-span-2 google-card overflow-hidden">
              <div className="px-6 py-4 border-b border-[#dadce0] bg-[#f8f9fa] flex items-center justify-between">
                 <h2 className="text-xs font-black uppercase tracking-widest text-[#3c4043]">Mes interventions prioritaires</h2>
                 <Link to="/tickets" className="text-[10px] font-black text-[#1a73e8] hover:underline uppercase">Tout voir</Link>
              </div>
              <div className="divide-y divide-[#dadce0]">
                 {stats.myTickets.filter(t => t.status !== 'Fermé').slice(0, 5).map(t => (
                   <div key={t.id} className="p-4 flex items-center justify-between hover:bg-[#f8faff] transition-colors group">
                      <div className="flex items-center gap-4">
                         <div className={`w-2 h-2 rounded-full ${t.priority === 'Urgent' ? 'bg-red-500 animate-pulse' : 'bg-blue-400'}`} />
                         <div>
                            <p className="text-sm font-bold text-[#3c4043]">#{t.id} • {t.customerName}</p>
                            <p className="text-[10px] text-[#5f6368] font-medium">{t.category} • {t.productName}</p>
                         </div>
                      </div>
                      <div className="flex items-center gap-3">
                         <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border ${t.priority === 'Urgent' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                           {t.priority}
                         </span>
                         <ArrowUpRight size={16} className="text-[#dadce0] group-hover:text-[#1a73e8]" />
                      </div>
                   </div>
                 ))}
                 {stats.myActive === 0 && (
                   <div className="py-20 text-center text-gray-400">
                      <Zap className="mx-auto mb-2 opacity-20" size={40} />
                      <p className="text-xs font-bold uppercase tracking-widest">Aucun dossier en attente</p>
                   </div>
                 )}
              </div>
           </div>

           <div className="google-card p-8">
              <h2 className="text-xs font-black uppercase tracking-widest text-[#3c4043] mb-8">Ma Productivité Hebdo</h2>
              <div className="h-[200px]">
                 <ResponsiveContainer width="100%" height="100%">
                   <AreaChart data={myInfo?.performanceHistory || []}>
                     <defs>
                       <linearGradient id="colorRes" x1="0" y1="0" x2="0" y2="1">
                         <stop offset="5%" stopColor="#1a73e8" stopOpacity={0.1}/>
                         <stop offset="95%" stopColor="#1a73e8" stopOpacity={0}/>
                       </linearGradient>
                     </defs>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f3f4" />
                     <XAxis dataKey="day" hide />
                     <Tooltip />
                     <Area type="monotone" dataKey="resolved" stroke="#1a73e8" fillOpacity={1} fill="url(#colorRes)" strokeWidth={3} />
                   </AreaChart>
                 </ResponsiveContainer>
              </div>
              <div className="mt-8 p-4 bg-[#f8f9fa] rounded-2xl border border-[#dadce0]">
                 <p className="text-[10px] font-black text-[#5f6368] uppercase mb-1">Impact Client (NPS)</p>
                 <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-[#1a73e8]">{myInfo?.nps || 100}</span>
                    <span className="text-[10px] text-green-600 font-bold">Excellent</span>
                 </div>
              </div>
           </div>
        </div>
      </div>
    );
  };

  // --- RENDU AGENT SAV ---
  const renderAgentDashboard = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="google-card p-6 border-b-4 border-blue-600">
           <p className="text-[#5f6368] text-[10px] font-black uppercase tracking-widest mb-4">Nouveaux Dossiers</p>
           <div className="flex items-center justify-between">
              <h3 className="text-3xl font-black text-[#1a73e8]">{stats.newTickets}</h3>
              <Plus size={32} className="text-blue-100" />
           </div>
        </div>
        <div className="google-card p-6 border-b-4 border-red-600">
           <p className="text-[#5f6368] text-[10px] font-black uppercase tracking-widest mb-4">Urgences à Traiter</p>
           <div className="flex items-center justify-between">
              <h3 className="text-3xl font-black text-red-600">{stats.criticalTickets}</h3>
              <AlertTriangle className="text-red-100" size={32} />
           </div>
        </div>
        <div className="google-card p-6 border-b-4 border-green-600">
           <p className="text-[#5f6368] text-[10px] font-black uppercase tracking-widest mb-4">Messages Clients</p>
           <div className="flex items-center justify-between">
              <h3 className="text-3xl font-black text-green-600">En ligne</h3>
              <Activity className="text-green-100" size={32} />
           </div>
        </div>
        <div className="google-card p-6 border-b-4 border-purple-600">
           <p className="text-[#5f6368] text-[10px] font-black uppercase tracking-widest mb-4">Satisfaction Global</p>
           <div className="flex items-center justify-between">
              <h3 className="text-3xl font-black text-purple-600">4.8/5</h3>
              <UserCheck className="text-purple-100" size={32} />
           </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-normal text-[#3c4043]">
            {currentUser?.role === 'ADMIN' ? 'Gouvernance Horizon' : 
             currentUser?.role === 'TECHNICIAN' ? 'Tableau de Bord Expert' : 
             'Portail Agent SAV'}
          </h1>
          <p className="text-[#5f6368] text-sm">
            {currentUser?.role === 'ADMIN' ? 'Analyse exhaustive des performances Royal Plaza.' : 
             currentUser?.role === 'TECHNICIAN' ? 'Suivi de vos dossiers et de votre performance technique.' : 
             'Gestion du flux client et des nouveaux sinistres.'}
          </p>
        </div>
        <div className="flex gap-3">
          {(currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER') && (
            <button 
              onClick={handleAiInsights} 
              disabled={isGenerating}
              className="btn-google-outlined text-[#1a73e8] border-[#1a73e8] hover:bg-[#e8f0fe] flex items-center gap-2 h-10"
            >
               <Sparkles size={16} className={isGenerating ? 'animate-pulse' : ''} />
               Audit IA
            </button>
          )}
          <button onClick={refreshAll} disabled={isSyncing} className="btn-google-outlined flex items-center gap-2 h-10 px-4">
            <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
            Synchroniser
          </button>
        </div>
      </header>

      {/* AI REPORT OVERLAY */}
      {aiReport && (
        <div className="google-card p-10 border-l-4 border-[#1a73e8] bg-[#f8f9ff] animate-in slide-in-from-top-4 duration-300 relative">
          <button onClick={() => setAiReport(null)} className="absolute top-4 right-4 text-[#5f6368] hover:bg-[#e8eaed] p-2 rounded-full">
            <X size={20} />
          </button>
          <div className="flex items-center gap-3 text-[#1a73e8] mb-6">
            <BrainCircuit size={28} />
            <h2 className="text-xl font-medium uppercase tracking-tight">Audit Stratégique Gemini</h2>
          </div>
          <div className="text-sm text-[#3c4043] leading-relaxed whitespace-pre-wrap prose prose-sm max-w-none office-report-content">
            {aiReport}
          </div>
        </div>
      )}

      {/* CONDITIONAL CONTENT BASED ON ROLE */}
      {currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER' ? renderAdminDashboard() : 
       currentUser?.role === 'TECHNICIAN' ? renderTechnicianDashboard() : 
       renderAgentDashboard()}
    </div>
  );
};

export default Dashboard;
