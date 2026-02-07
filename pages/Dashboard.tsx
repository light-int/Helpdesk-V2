
import React, { useMemo, useEffect } from 'react';
import {
  BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts';
import {
  Activity, RefreshCw, Sparkles, TrendingUp, DollarSign,
  AlertTriangle, CheckCircle2, ShieldCheck, ArrowUpRight,
  Database, Zap, Star, Terminal, History, Box, User, AlertCircle
} from 'lucide-react';
import { useData, useUser } from '../App';
import { Link } from 'react-router-dom';
import { Ticket, ShowroomConfig, Technician, AuditLog } from '../types';
import Modal from '../components/Modal';
import { marked } from 'marked';
import { isAiOperational, generateStrategicReport } from '../services/geminiService';
import { useNotifications } from '../App';

const Dashboard: React.FC = () => {
  const {
    tickets, isLoading, refreshAll, isSyncing, showrooms,
    syncMetrics, parts, customers, products, technicians, auditLogs
  } = useData();
  const { currentUser } = useUser();
  const { addNotification } = useNotifications();

  const [isGeneratingAudit, setIsGeneratingAudit] = React.useState(false);
  const [showAuditModal, setShowAuditModal] = React.useState(false);
  const [auditHtml, setAuditHtml] = React.useState('');

  useEffect(() => { refreshAll(); }, [refreshAll]);

  const isTechnician = currentUser?.role === 'TECHNICIAN';

  const stats = useMemo(() => {
    let activeTickets = (tickets || []).filter((t: Ticket) => !t.isArchived);

    if (isTechnician) {
      activeTickets = activeTickets.filter((t: Ticket) => t.assignedTechnicianId === currentUser?.id);
    }

    const totalRevenue = activeTickets.reduce((acc: number, t: Ticket) => acc + (t.financials?.grandTotal || 0), 0);
    const criticalTickets = activeTickets.filter((t: Ticket) => t.priority === 'Urgent' && t.status !== 'Fermé').length;

    const showroomData = (showrooms || []).map((s: ShowroomConfig) => ({
      name: s.id,
      value: activeTickets.filter((t: Ticket) => t.showroom === s.id).length
    })).filter((d: { name: string; value: number }) => d.value > 0 || !isTechnician);

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

  const getLogIcon = (action: string) => {
    switch (action) {
      case 'MAJ_TICKET': return <History className="text-blue-500" size={14} />;
      case 'MAJ_STOCK': return <Box className="text-[#3ecf8e]" size={14} />;
      case 'MOUV_STOCK': return <RefreshCw className="text-purple-500" size={14} />;
      case 'MAJ_CLIENT': return <User className="text-amber-500" size={14} />;
      default: return <Terminal className="text-[#686868]" size={14} />;
    }
  };

  const handleAuditIA = async () => {
    if (!isAiOperational()) {
      addNotification({ title: 'Clé API manquante', message: 'Veuillez configurer votre clé dans les paramètres.', type: 'warning' });
      return;
    }
    setIsGeneratingAudit(true);
    setShowAuditModal(true);
    try {
      const reportMarkdown = await generateStrategicReport({
        revenue: stats.totalRevenue,
        pending: stats.totalCount,
        critical: stats.criticalTickets,
        systemHealth: stats.rating
      });
      const htmlContent = marked.parse(reportMarkdown || '') as string;
      setAuditHtml(htmlContent);
    } catch (e) {
      addNotification({ title: 'Erreur IA', message: 'Échec de génération du rapport.', type: 'error' });
      setShowAuditModal(false);
    } finally { setIsGeneratingAudit(false); }
  };

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
            <button onClick={handleAuditIA} disabled={isGeneratingAudit} className="btn-sb-primary h-9 px-4">
              <Sparkles size={14} className={isGeneratingAudit ? 'animate-pulse' : ''} /> <span>Générer Audit IA</span>
            </button>
          )}
        </div>
      </header>

      {/* KPI GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: isTechnician ? 'Production C.A.' : 'Flux de Revenus', value: `${(stats.totalRevenue / 1000).toFixed(0)}k F`, icon: <DollarSign size={16} />, color: '#3ecf8e' },
          { label: isTechnician ? 'Mes Dossiers' : 'Tickets en Cours', value: stats.totalCount, icon: <Activity size={16} />, color: '#1c1c1c' },
          { label: isTechnician ? 'Mes Urgences' : 'Urgences SLA', value: stats.criticalTickets, icon: <AlertTriangle size={16} />, color: '#f87171' },
          { label: isTechnician ? 'Note Qualité' : 'Santé Cluster', value: isTechnician ? `${stats.rating}/5` : '100%', icon: isTechnician ? <Star size={16} /> : <ShieldCheck size={16} />, color: '#3ecf8e' }
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
        <div className="lg:col-span-2 sb-card border-[#ededed] shadow-sm flex flex-col bg-white">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-[11px] font-black text-[#1c1c1c] uppercase tracking-widest flex items-center gap-2">
              <History size={16} className="text-[#3ecf8e]" /> Flux d'Activité Réseau
            </h2>
            <span className="text-[10px] font-black text-[#686868] uppercase tracking-tighter bg-[#f8f9fa] px-2 py-0.5 rounded border border-[#ededed]">Cluster LBV-Live</span>
          </div>

          <div className="space-y-4 flex-1 overflow-y-auto max-h-[350px] pr-2 custom-scrollbar">
            {auditLogs && auditLogs.length > 0 ? auditLogs.map((log: AuditLog) => (
              <div key={log.id} className="flex items-start gap-4 p-3 hover:bg-[#fcfcfc] rounded-xl transition-all border border-transparent hover:border-[#f0f0f0] group">
                <div className="w-8 h-8 rounded-lg bg-[#f8f9fa] flex items-center justify-center shrink-0 border border-[#ededed] group-hover:scale-110 transition-transform">
                  {getLogIcon(log.action)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline">
                    <p className="text-[12px] font-black text-[#1c1c1c] truncate">
                      <span className="text-[#3ecf8e] font-black">{log.userName}</span> {log.details}
                    </p>
                    <span className="text-[9px] font-bold text-[#9ca3af] uppercase tracking-tighter whitespace-nowrap ml-2">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-[10px] text-[#686868] font-bold mt-0.5 opacity-60">ID: {log.target} • {log.action}</p>
                </div>
              </div>
            )) : (
              <div className="h-full flex flex-col items-center justify-center opacity-30 py-20">
                <History size={40} className="mb-4" />
                <p className="text-[11px] font-black uppercase tracking-widest text-center">En attente de transactions...</p>
              </div>
            )}
          </div>
        </div>

        <div className="sb-card border-[#ededed] shadow-sm flex flex-col bg-white">
          <h2 className="text-[11px] font-black text-[#1c1c1c] uppercase tracking-widest mb-6 flex items-center gap-2">
            <AlertCircle size={16} className="text-red-500" /> File d'Urgences Critiques
          </h2>
          <div className="space-y-3 flex-1 overflow-y-auto pr-1 custom-scrollbar">
            {(isTechnician
              ? tickets.filter((t: Ticket) => t.assignedTechnicianId === currentUser?.id && !t.isArchived && t.priority === 'Urgent')
              : tickets.filter((t: Ticket) => !t.isArchived && t.priority === 'Urgent')
            ).slice(0, 5).map((t: Ticket) => (
              <Link to={`/tickets?id=${t.id}`} key={t.id} className="block p-4 border border-[#ededed] rounded-xl hover:border-[#3ecf8e] transition-all group bg-[#fcfcfc]">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[9px] font-black text-red-500 uppercase tracking-tighter bg-red-50 px-2 py-0.5 rounded border border-red-100">SLA ALERT</span>
                  <ArrowUpRight size={14} className="text-[#686868] group-hover:text-[#3ecf8e]" />
                </div>
                <p className="text-sm font-black text-[#1c1c1c] truncate">{t.customerName}</p>
                <p className="text-[11px] text-[#686868] font-bold truncate mt-1">{t.productName || 'Matériel non spécifié'}</p>
              </Link>
            ))}
            {(isTechnician ? stats.criticalTickets : tickets.filter((t: Ticket) => !t.isArchived && t.priority === 'Urgent').length) === 0 && (
              <div className="flex flex-col items-center justify-center py-24 text-[#686868] opacity-30">
                <CheckCircle2 size={40} className="mb-4" />
                <p className="text-[11px] font-black uppercase tracking-widest text-center leading-relaxed">Aucun incident critique<br />en attente</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-10">
        <div className="sb-card flex items-center gap-6 border-[#ededed] shadow-sm hover:border-[#3ecf8e] transition-colors bg-white p-8">
          <div className="w-14 h-14 rounded-2xl bg-[#f0fdf4] text-[#3ecf8e] flex items-center justify-center border border-[#dcfce7] shadow-sm">
            <Database size={28} />
          </div>
          <div>
            <h2 className="text-[14px] font-black text-[#1c1c1c] uppercase tracking-tight">Cloud Infrastructure</h2>
            <p className="text-[11px] text-[#686868] font-bold mt-0.5">Cluster LBV-WEST • Ping: {syncMetrics.latency || 38}ms</p>
          </div>
        </div>
        <div className="sb-card flex items-center gap-6 border-[#ededed] shadow-sm hover:border-[#1c1c1c] transition-colors bg-white p-8">
          <div className="w-14 h-14 rounded-2xl bg-[#f8f9fa] text-[#1c1c1c] flex items-center justify-center border border-[#ededed] shadow-sm">
            <Zap size={28} />
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

      <Modal isOpen={showAuditModal} onClose={() => !isGeneratingAudit && setShowAuditModal(false)} title="Intelligence & Supervision Horizon" size="lg">
        {isGeneratingAudit ? (
          <div className="flex flex-col items-center justify-center py-24 text-center animate-pulse">
            <div className="w-20 h-20 bg-[#f0fdf4] rounded-full flex items-center justify-center text-[#3ecf8e] mb-8 shadow-sm border border-[#dcfce7]">
              <RefreshCw size={40} className="animate-spin" />
            </div>
            <h3 className="text-xl font-black text-[#1c1c1c] uppercase tracking-tight">Audit Système en cours</h3>
            <p className="text-xs text-[#686868] font-bold mt-3 uppercase tracking-widest">Analyse des flux opérationnels et financiers...</p>
            <p className="text-[10px] text-[#9ca3af] mt-4 font-mono">Ne fermez pas cette fenêtre</p>
          </div>
        ) : (
          <>
            <div className="p-5 bg-[#f8f9fa] rounded-2xl border border-[#ededed] mb-8 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-[#1c1c1c] rounded-xl flex items-center justify-center text-[#3ecf8e] shadow-md">
                  <Terminal size={20} />
                </div>
                <div>
                  <p className="text-[11px] font-black text-[#1c1c1c] uppercase leading-none tracking-tight">Rapport de Supervision</p>
                  <p className="text-[10px] text-[#686868] font-bold mt-1.5 uppercase tracking-[0.2em]">Généré par Horizon AI</p>
                </div>
              </div>
            </div>
            <div className="prose prose-emerald max-w-none prose-sm leading-relaxed text-[#1c1c1c]" dangerouslySetInnerHTML={{ __html: auditHtml }} />
            <div className="mt-12 pt-8 border-t border-[#ededed] flex justify-end">
              <button onClick={() => setShowAuditModal(false)} className="btn-sb-primary h-12 px-10 shadow-lg shadow-[#3ecf8e]/20 text-[11px] font-black uppercase tracking-widest">Fermer</button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
};

export default Dashboard;
