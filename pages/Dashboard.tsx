
import React, { useMemo, useEffect, useState } from 'react';
import { 
  BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, AreaChart, Area
} from 'recharts';
import { 
  Activity, RefreshCw, Sparkles, TrendingUp, DollarSign,
  AlertTriangle, CheckCircle2, Star, ArrowUpRight, UserCheck,
  ShieldCheck, Zap, Store, Users, Briefcase, Server, Wifi,
  Lock, Cpu, Database, ShieldAlert, Fingerprint, Globe,
  Terminal, CloudLightning, Gauge, MessageSquare, Sliders
} from 'lucide-react';
import { useData, useNotifications, useUser } from '../App';
import { isAiOperational } from '../services/geminiService';
import { Link } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const { 
    tickets, isLoading, refreshAll, isSyncing, technicians, showrooms, 
    syncMetrics, config, users, products, parts, customers
  } = useData();
  const { currentUser } = useUser();
  const { addNotification } = useNotifications();
  
  const aiReady = isAiOperational();
  const isAdmin = currentUser?.role === 'ADMIN';
  const isManager = currentUser?.role === 'MANAGER';
  const isTech = currentUser?.role === 'TECHNICIAN';

  useEffect(() => { refreshAll(); }, []);

  const stats = useMemo(() => {
    const roleFilteredTickets = (tickets || []).filter(t => {
      if (t.isArchived) return false;
      if (isTech) return t.assignedTechnicianId === currentUser?.id;
      return true;
    });

    const totalRevenue = roleFilteredTickets.reduce((acc, t) => acc + (t.financials?.grandTotal || 0), 0);
    const criticalTickets = roleFilteredTickets.filter(t => t.priority === 'Urgent' && t.status !== 'Fermé').length;
    const pendingApproval = roleFilteredTickets.filter(t => t.status === 'En attente d\'approbation').length;

    const categoryData = ['SAV', 'Installation', 'Maintenance', 'Livraison'].map(cat => ({
      name: cat,
      value: roleFilteredTickets.filter(t => t.category === cat).length,
    }));

    const showroomData = showrooms.map(s => ({
      name: s.id,
      value: tickets.filter(t => t.showroom === s.id && !t.isArchived).length
    }));

    // Metrics specifiques Admin
    const dbSize = (tickets.length + products.length + customers.length + parts.length);
    const mfaCoverage = (users.filter(u => u.mfaEnabled).length / (users.length || 1)) * 100;

    return { 
      totalRevenue, 
      categoryData, 
      showroomData, 
      criticalTickets, 
      pendingApproval, 
      totalCount: roleFilteredTickets.length,
      dbSize,
      mfaCoverage
    };
  }, [tickets, currentUser, isTech, showrooms, products, customers, parts, users]);

  if (isLoading) return (
    <div className="h-[80vh] flex items-center justify-center">
      <RefreshCw className="text-[#1a73e8] animate-spin" size={32} />
    </div>
  );

  // --- VUE ADMINISTRATEUR ---
  if (isAdmin) {
    return (
      <div className="space-y-8 animate-page-entry pb-20">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 text-[#1a73e8] mb-1">
               <Terminal size={20} />
               <span className="text-[10px] font-black uppercase tracking-[0.3em]">Horizon Root Access</span>
            </div>
            <h1 className="text-3xl font-light text-[#202124]">Console d'Administration</h1>
            <p className="text-[#5f6368] text-xs font-medium mt-1">Supervision Cloud & Gouvernance des identités Plaza</p>
          </div>
          <div className="flex gap-3">
            <Link to="/settings" className="btn-google-primary h-11 px-6 shadow-xl shadow-blue-600/10">
               <ShieldCheck size={18} /> <span>Gérer la Sécurité</span>
            </Link>
            <button onClick={refreshAll} disabled={isSyncing} className="btn-google-outlined h-11 px-4">
              <RefreshCw size={18} className={isSyncing ? 'animate-spin' : ''} />
            </button>
          </div>
        </header>

        {/* ADMIN INFRA KPIS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="stats-card bg-[#202124] border-none">
             <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-blue-500/10 text-blue-400"><Wifi size={20}/></div>
                <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Connecté</span>
             </div>
             <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Latence Supabase</p>
             <h3 className="text-3xl font-bold text-white mt-1">{syncMetrics.latency || 42} ms</h3>
          </div>
          <div className="stats-card bg-[#202124] border-none">
             <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-green-500/10 text-green-400"><Cpu size={20}/></div>
                <span className="text-[9px] font-black text-green-400 uppercase tracking-widest">Active</span>
             </div>
             <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Moteur IA Gemini</p>
             <h3 className="text-3xl font-bold text-white mt-1 uppercase">{config.aiModel}</h3>
          </div>
          <div className="stats-card bg-[#202124] border-none">
             <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-amber-500/10 text-amber-400"><Fingerprint size={20}/></div>
                <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest">MFA</span>
             </div>
             <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Couverture Sécurité</p>
             <h3 className="text-3xl font-bold text-white mt-1">{stats.mfaCoverage.toFixed(0)}%</h3>
          </div>
          <div className="stats-card bg-[#202124] border-none">
             <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-purple-500/10 text-purple-400"><Database size={20}/></div>
                <span className="text-[9px] font-black text-purple-400 uppercase tracking-widest">Cloud Storage</span>
             </div>
             <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Total Records</p>
             <h3 className="text-3xl font-bold text-white mt-1">{stats.dbSize}</h3>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           {/* LOGS DE CONNEXION */}
           <div className="lg:col-span-2 stats-card bg-white p-10">
              <h2 className="text-[11px] font-black text-[#202124] uppercase tracking-[0.2em] mb-8 flex items-center gap-3">
                 <Lock size={18} className="text-[#1a73e8]" /> 
                 Journal de sécurité & Accès
              </h2>
              <div className="space-y-4">
                 {users.filter(u => u.lastLogin).slice(0, 8).map(user => (
                    <div key={user.id} className="flex items-center justify-between p-4 bg-[#f8f9fa] border border-[#dadce0] hover:bg-white hover:shadow-lg transition-all">
                       <div className="flex items-center gap-4">
                          <img src={user.avatar} className="w-10 h-10 border p-0.5 bg-white" alt="" />
                          <div>
                             <p className="text-sm font-black text-[#3c4043] uppercase">{user.name}</p>
                             <p className="text-[10px] text-[#1a73e8] font-bold uppercase">{user.role} • {user.showroom || 'Corporate'}</p>
                          </div>
                       </div>
                       <div className="text-right">
                          <p className="text-xs font-black text-[#3c4043]">{new Date(user.lastLogin!).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                          <p className="text-[9px] text-[#9aa0a6] font-bold uppercase">{new Date(user.lastLogin!).toLocaleDateString()}</p>
                       </div>
                    </div>
                 ))}
                 <Link to="/settings" className="block text-center py-4 text-[10px] font-black text-[#1a73e8] uppercase tracking-widest hover:underline">
                    Consulter tous les logs système
                 </Link>
              </div>
           </div>

           {/* ÉTAT DE L'IA */}
           <div className="stats-card bg-[#f8f9fa] p-8 space-y-8">
              <h2 className="text-[11px] font-black text-[#202124] uppercase tracking-[0.2em] flex items-center gap-3">
                 <CloudLightning size={18} className="text-[#1a73e8]" /> 
                 Services Horizon IA
              </h2>
              
              <div className="space-y-6">
                 {[
                   { label: 'Chatbot Expert', enabled: config.aiChatbotEnabled, icon: <MessageSquare size={16}/> },
                   { label: 'Audit Stratégique', enabled: config.aiStrategicAudit, icon: <Activity size={16}/> },
                   { label: 'Auto-Classification', enabled: config.aiAutoCategorization, icon: <Sliders size={16}/> }
                 ].map((module, i) => (
                    <div key={i} className="flex items-center justify-between">
                       <div className="flex items-center gap-3">
                          <div className="p-2 bg-white border border-[#dadce0] text-[#5f6368]">{module.icon}</div>
                          <span className="text-xs font-bold text-[#3c4043]">{module.label}</span>
                       </div>
                       <div className={`w-3 h-3 rounded-full ${module.enabled && aiReady ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-red-400'}`} />
                    </div>
                 ))}
              </div>

              <div className="pt-8 border-t border-[#dadce0]">
                 <div className="p-4 bg-white border border-[#dadce0] relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-[#1a73e8]" />
                    <p className="text-[10px] font-black text-[#9aa0a6] uppercase tracking-widest">Mode Maintenance</p>
                    <div className="flex items-center justify-between mt-2">
                       <span className={`text-xs font-black uppercase ${config.maintenanceMode ? 'text-red-600' : 'text-green-600'}`}>
                          {config.maintenanceMode ? 'ACTIF (Verrouillage)' : 'INACTIF (LibRE)'}
                       </span>
                       <ShieldAlert size={18} className={config.maintenanceMode ? 'text-red-500' : 'text-gray-200'} />
                    </div>
                 </div>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-100 flex items-center gap-4">
                 <Globe size={24} className="text-[#1a73e8] shrink-0" />
                 <p className="text-[10px] text-blue-700 leading-relaxed font-bold uppercase">
                    Connecteur WhatsApp : <span className="underline">Opérationnel</span> (GABON-LBV-1)
                 </p>
              </div>
           </div>
        </div>
      </div>
    );
  }

  // --- VUE STANDARD (MANAGER / TECH) ---
  return (
    <div className="space-y-8 animate-page-entry pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-light text-[#202124]">
            {isTech ? `Console Expert : ${currentUser?.name}` : isManager ? 'Gouvernance Horizon' : 'Tableau de Bord'}
          </h1>
          <p className="text-[#5f6368] text-xs font-black uppercase tracking-widest mt-1">
            {isTech ? 'Suivi individuel des missions' : isManager ? 'Pilotage stratégique multi-sites Plaza' : 'Surveillance Cloud Horizon'}
          </p>
        </div>
        <div className="flex gap-3">
          {isManager && (
            <Link to="/finances" className="btn-google-outlined h-10 px-4 flex items-center gap-2">
               <TrendingUp size={16} /> <span>Analyse Marges</span>
            </Link>
          )}
          {isManager && (
            <button 
              disabled={isSyncing || !aiReady} 
              onClick={() => addNotification({ title: 'IA', message: 'Rapport en cours de compilation...', type: 'info' })}
              className={`btn-google-primary h-10 shadow-lg ${!aiReady ? 'bg-gray-400 cursor-not-allowed' : ''}`}
            >
               <Sparkles size={16} /> <span>Audit Stratégique</span>
            </button>
          )}
          <button onClick={refreshAll} disabled={isSyncing} className="btn-google-outlined h-10 px-4">
            <RefreshCw size={18} className={isSyncing ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      {/* KPIS DYNAMIQUE PAR RÔLE */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {isManager ? (
          <>
            <div className="stats-card border-b-4 border-[#1a73e8]">
               <div className="flex justify-between mb-4"><div className="p-2 bg-blue-50 text-[#1a73e8]"><DollarSign size={20}/></div><span className="text-[10px] font-black text-blue-400 uppercase">Revenu Global</span></div>
               <p className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest">CA Certifié HT</p>
               <h3 className="text-3xl font-bold text-[#202124] mt-1">{(stats.totalRevenue/1000).toFixed(0)}k F</h3>
            </div>
            <div className="stats-card border-b-4 border-[#188038]">
               <div className="flex justify-between mb-4"><div className="p-2 bg-green-50 text-[#188038]"><ShieldCheck size={20}/></div><span className="text-[10px] font-black text-green-400 uppercase">Qualité</span></div>
               <p className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest">Attente Approbation</p>
               <h3 className="text-3xl font-bold text-[#202124] mt-1">{stats.pendingApproval}</h3>
            </div>
            <div className="stats-card border-b-4 border-[#f9ab00]">
               <div className="flex justify-between mb-4"><div className="p-2 bg-amber-50 text-[#f9ab00]"><Users size={20}/></div><span className="text-[10px] font-black text-amber-400 uppercase">Ressources</span></div>
               <p className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest">Experts Terrain</p>
               <h3 className="text-3xl font-bold text-[#202124] mt-1">{technicians.length}</h3>
            </div>
            <div className="stats-card border-b-4 border-[#d93025]">
               <div className="flex justify-between mb-4"><div className="p-2 bg-red-50 text-[#d93025]"><AlertTriangle size={20}/></div><span className="text-[10px] font-black text-red-400 uppercase">SLA</span></div>
               <p className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest">Urgences Critiques</p>
               <h3 className="text-3xl font-bold text-[#202124] mt-1">{stats.criticalTickets}</h3>
            </div>
          </>
        ) : (
          [
            { label: isTech ? 'Mon CA Produit' : 'Flux Financier', value: `${(stats.totalRevenue/1000).toFixed(0)}k F`, color: '#1a73e8', icon: <DollarSign size={20}/> },
            { label: isTech ? 'Mes Missions' : 'Volume SAV', value: stats.totalCount, color: '#1a73e8', icon: <Activity size={20}/> },
            { label: 'Urgences', value: stats.criticalTickets, color: '#d93025', icon: <AlertTriangle size={20}/> },
            { label: 'Note Moyenne', value: '4.9', color: '#188038', icon: <Star size={20}/> }
          ].map((s, i) => (
            <div key={i} className="stats-card">
               <div className="flex justify-between items-start mb-4">
                 <div className="p-2 bg-gray-50 text-gray-500">{s.icon}</div>
                 <div className="text-[10px] font-bold text-gray-300 uppercase">Live</div>
               </div>
               <p className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest">{s.label}</p>
               <h3 className="text-3xl font-bold text-[#202124] mt-1 tracking-tighter">{s.value}</h3>
            </div>
          ))
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         <div className="lg:col-span-2 stats-card p-10 bg-white">
            <h2 className="text-[11px] font-black text-[#202124] uppercase tracking-[0.2em] mb-10 flex items-center gap-2">
               <TrendingUp size={18} className="text-[#1a73e8]" /> 
               {isManager ? 'Volume d\'activité par Showroom' : 'Répartition des interventions'}
            </h2>
            <div className="h-[350px]">
               <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={isManager ? stats.showroomData : stats.categoryData}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f3f4" />
                     <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#70757a', fontSize: 10, fontWeight: '900'}} dy={10} />
                     <YAxis axisLine={false} tickLine={false} tick={{fill: '#70757a', fontSize: 10}} />
                     <Tooltip cursor={{fill: '#f8f9fa'}} contentStyle={{border: '1px solid #dadce0', borderRadius: '0', fontSize: '12px'}} />
                     <Bar dataKey="value" fill="#1a73e8" barSize={40} />
                  </BarChart>
               </ResponsiveContainer>
            </div>
         </div>

         <div className="stats-card p-8 bg-[#fdfdfd]">
            <h2 className="text-[11px] font-black text-[#202124] uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
               <Zap size={18} className="text-[#f9ab00]" /> 
               {isManager ? 'Actions Prioritaires' : 'Mes Priorités'}
            </h2>
            <div className="space-y-3">
               {isManager && stats.pendingApproval > 0 && (
                 <div className="p-4 bg-purple-50 border border-purple-100 flex items-center justify-between mb-6">
                    <div>
                       <p className="text-[10px] font-black text-purple-700 uppercase">Qualité SAV</p>
                       <p className="text-xs font-bold text-purple-900 mt-1">{stats.pendingApproval} rapports à certifier</p>
                    </div>
                    <Link to="/tickets" className="p-2 bg-white text-purple-700 shadow-sm border border-purple-100"><ArrowUpRight size={16}/></Link>
                 </div>
               )}
               {tickets.filter(t => {
                  const matchesUser = isTech ? t.assignedTechnicianId === currentUser?.id : true;
                  return matchesUser && t.priority === 'Urgent' && t.status !== 'Fermé';
               }).slice(0, 5).map((t) => (
                  <Link to={`/tickets?id=${t.id}`} key={t.id} className="block p-4 border border-[#dadce0] bg-white hover:border-[#1a73e8] transition-all group">
                     <div className="flex justify-between items-start">
                        <span className="text-[9px] font-black text-[#1a73e8] uppercase bg-blue-50 px-2 py-0.5 border border-blue-100">#{t.id}</span>
                        <ArrowUpRight size={14} className="text-gray-300 group-hover:text-[#1a73e8]" />
                     </div>
                     <p className="text-sm font-black text-[#3c4043] mt-2 truncate uppercase">{t.customerName}</p>
                     <p className="text-[9px] text-[#5f6368] font-bold mt-1 uppercase tracking-tighter truncate">{t.productName} • {t.brand}</p>
                  </Link>
               ))}
               {stats.criticalTickets === 0 && (
                  <div className="py-20 text-center">
                     <CheckCircle2 size={40} className="mx-auto text-green-100 mb-4" />
                     <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Aucun incident critique</p>
                  </div>
               )}
            </div>
         </div>
      </div>
    </div>
  );
};

export default Dashboard;
