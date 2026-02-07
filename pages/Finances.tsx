
import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp, DollarSign, Activity, Sparkles,
  PieChart as PieIcon, BarChart3, Calendar as CalendarIcon,
  ChevronRight, FileText, RefreshCw,
  ArrowUpRight, Target, Users, Landmark,
  Trophy, Star, ShoppingBag,
  ExternalLink, User as UserIcon, Terminal
} from 'lucide-react';
import {
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  BarChart, Bar, AreaChart, Area, Cell, PieChart, Pie
} from 'recharts';
import { useData, useNotifications } from '../App';
import { isAiOperational, generateStrategicReport } from '../services/geminiService';
import { marked } from 'marked';
import Modal from '../components/Modal';
import Drawer from '../components/Drawer';
import { Ticket, Technician, StrategicReport } from '../types';

const Finances: React.FC = () => {
  const navigate = useNavigate();
  const { tickets: allTickets, technicians, reports, refreshAll, isLoading, isSyncing } = useData();
  const { addNotification } = useNotifications();

  const [activeTab, setActiveTab] = useState<'overview' | 'experts' | 'archives'>('overview');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiReportHtml, setAiReportHtml] = useState('');
  const [selectedExpert, setSelectedExpert] = useState<any | null>(null);

  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => { refreshAll(); }, [refreshAll]);

  const stats = useMemo(() => {
    const financialTickets = (allTickets || []).filter((t: Ticket) => {
      const d = (t.createdAt || '').split('T')[0];
      return d >= startDate && d <= endDate && t.financials && (t.status === 'Résolu' || t.status === 'Fermé');
    });

    const totalRev = financialTickets.reduce((acc: number, curr: Ticket) => acc + (curr.financials?.grandTotal || 0), 0);
    const totalMargin = financialTickets.reduce((acc: number, curr: Ticket) => acc + (curr.financials?.netMargin || 0), 0);
    const totalParts = financialTickets.reduce((acc: number, curr: Ticket) => acc + (curr.financials?.partsTotal || 0), 0);
    const totalLabor = financialTickets.reduce((acc: number, curr: Ticket) => acc + (curr.financials?.laborTotal || 0), 0);

    const trendData = financialTickets.reduce((acc: any[], t: Ticket) => {
      const day = (t.createdAt || '').split('T')[0];
      const existing = acc.find(item => item.day === day);
      if (existing) { existing.revenue += (t.financials?.grandTotal || 0); }
      else { acc.push({ day, revenue: (t.financials?.grandTotal || 0) }); }
      return acc;
    }, []).sort((a: any, b: any) => a.day.localeCompare(b.day));

    const categoryData = financialTickets.reduce((acc: any[], t: Ticket) => {
      const cat = t.category || 'Non classé';
      const existing = acc.find(item => item.name === cat);
      if (existing) { existing.value += (t.financials?.grandTotal || 0); }
      else { acc.push({ name: cat, value: (t.financials?.grandTotal || 0) }); }
      return acc;
    }, []);

    const expertPerformance = (technicians || []).map((tech: Technician) => {
      const techTickets = financialTickets.filter((t: Ticket) => t.assignedTechnicianId === tech.id);
      const revenue = techTickets.reduce((acc: number, t: Ticket) => acc + (t.financials?.grandTotal || 0), 0);
      return {
        id: tech.id,
        name: tech.name.split(' ')[0],
        fullName: tech.name,
        avatar: tech.avatar,
        revenue,
        tickets: techTickets.length,
        avgTicket: techTickets.length > 0 ? revenue / techTickets.length : 0,
        rating: tech.rating || 5.0,
        recentTickets: techTickets.slice(0, 10)
      };
    }).sort((a: any, b: any) => b.revenue - a.revenue);

    return {
      totalRev, totalMargin, totalParts, totalLabor,
      trendData, categoryData, expertPerformance,
      count: financialTickets.length
    };
  }, [allTickets, technicians, startDate, endDate]);

  const handleAuditIA = async () => {
    if (!isAiOperational()) {
      addNotification({ title: 'Clé API manquante', message: 'Veuillez configurer votre clé Gemini dans les paramètres.', type: 'warning' });
      return;
    }
    setIsGenerating(true);
    try {
      setShowAiModal(true); // Open modal immediately for loading state
      const reportMarkdown = await generateStrategicReport({
        ca: stats.totalRev,
        marge: stats.totalMargin,
        volume: stats.count,
        parts: stats.totalParts,
        labor: stats.totalLabor
      });
      const htmlContent = marked.parse(reportMarkdown || '') as string;
      setAiReportHtml(htmlContent);
    } catch (e) {
      addNotification({ title: 'Erreur IA', message: 'Échec de génération du rapport.', type: 'error' });
      setShowAiModal(false); // Close modal on error
    } finally { setIsGenerating(false); }
  };

  const CHART_COLORS = ['#3ecf8e', '#1c1c1c', '#6366f1', '#f59e0b', '#ec4899', '#06b6d4'];

  if (isLoading) return <div className="h-[80vh] flex items-center justify-center"><RefreshCw className="animate-spin text-[#3ecf8e]" size={32} /></div>;

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-sb-entry pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1c1c1c] tracking-tight">Audit Financier</h1>
          <p className="text-xs text-[#686868] mt-1 font-medium">Monitoring de la rentabilité et de la performance opérationnelle.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-white border border-[#ededed] rounded-lg p-1.5 shadow-sm">
            <div className="flex items-center gap-2 px-2 border-r border-[#ededed]">
              <CalendarIcon size={14} className="text-[#686868]" />
              <input
                type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="bg-transparent border-none text-[11px] font-bold p-0 focus:ring-0 w-24 cursor-pointer"
              />
            </div>
            <div className="flex items-center gap-2 px-2">
              <input
                type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                className="bg-transparent border-none text-[11px] font-bold p-0 focus:ring-0 w-24 cursor-pointer"
              />
            </div>
          </div>
          <button onClick={handleAuditIA} disabled={isGenerating} className="btn-sb-primary h-11 px-5 shadow-sm">
            <Sparkles size={16} className={isGenerating ? 'animate-pulse' : ''} />
            <span className="text-xs font-bold">Audit Gemini Pro</span>
          </button>
          <button onClick={refreshAll} className="btn-sb-outline h-11 px-3">
            <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      <div className="flex gap-1 bg-[#f1f3f4] p-1 rounded-xl w-fit border border-[#ededed]">
        {[
          { id: 'overview', label: 'Dashboard Revenus', icon: <BarChart3 size={14} /> },
          { id: 'experts', label: 'Productivité Experts', icon: <Users size={14} /> },
          { id: 'archives', label: 'Historique Audits', icon: <FileText size={14} /> }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-2.5 text-[11px] font-black uppercase tracking-wider rounded-lg transition-all ${activeTab === tab.id ? 'bg-white shadow-sm text-[#3ecf8e]' : 'text-[#686868] hover:text-[#1c1c1c]'}`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-8 animate-sb-entry">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'C.A. Global', value: stats.totalRev, sub: `${stats.count} dossiers clos`, icon: <DollarSign />, color: 'text-[#3ecf8e]', bg: 'bg-[#f0fdf4]' },
              { label: 'Bénéfice Net', value: stats.totalMargin, sub: 'Marge opérationnelle', icon: <TrendingUp />, color: 'text-blue-500', bg: 'bg-[#eff6ff]' },
              { label: 'Logistique Pièces', value: stats.totalParts, sub: 'Vente rechanges', icon: <Landmark />, color: 'text-purple-500', bg: 'bg-[#f5f3ff]' },
              { label: 'Efficience', value: stats.totalRev > 0 ? `${((stats.totalMargin / stats.totalRev) * 100).toFixed(1)}%` : '0%', sub: 'Taux de marge brute', icon: <Target />, color: 'text-amber-500', bg: 'bg-[#fffbeb]' }
            ].map((s, i) => (
              <div key={i} className="sb-card p-6 border border-[#ededed] shadow-sm relative overflow-hidden group">
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-3 rounded-xl ${s.bg} ${s.color} shadow-sm group-hover:scale-110 transition-transform border border-white/50`}>
                    {React.cloneElement(s.icon as React.ReactElement, { size: 20 })}
                  </div>
                </div>
                <p className="text-[10px] font-black text-[#686868] uppercase tracking-widest">{s.label}</p>
                <h3 className="text-2xl font-black text-[#1c1c1c] mt-1 font-mono">
                  {typeof s.value === 'number' ? (s.value || 0).toLocaleString() + ' F' : s.value}
                </h3>
                <p className="text-[10px] text-[#9ca3af] mt-2 font-bold italic">{s.sub}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 sb-card p-8 border border-[#ededed] shadow-sm bg-white">
              <div className="flex items-center justify-between mb-10">
                <h2 className="text-[11px] font-black text-[#1c1c1c] uppercase tracking-widest flex items-center gap-2">
                  <Activity size={16} className="text-[#3ecf8e]" /> Chronologie des flux financiers
                </h2>
              </div>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.trendData}>
                    <defs>
                      <linearGradient id="colorRevFin" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3ecf8e" stopOpacity={0.1} />
                        <stop offset="95%" stopColor="#3ecf8e" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#686868', fontSize: 10, fontWeight: 'bold' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#686868', fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      contentStyle={{ borderRadius: '12px', border: '1px solid #ededed', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', fontSize: '11px', fontWeight: 'bold' }}
                      formatter={(value: any) => [(Number(value) || 0).toLocaleString() + ' F', 'Revenu']}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="#3ecf8e" strokeWidth={3} fillOpacity={1} fill="url(#colorRevFin)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="sb-card p-8 border border-[#ededed] flex flex-col shadow-sm bg-white">
              <h2 className="text-[11px] font-black text-[#1c1c1c] uppercase tracking-widest mb-8 flex items-center gap-2">
                <PieIcon size={16} className="text-[#3ecf8e]" /> Mix Catégoriel
              </h2>
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={85}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {stats.categoryData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => (Number(value) || 0).toLocaleString() + ' F'} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-auto space-y-2.5">
                {stats.categoryData.slice(0, 4).map((c: any, i: number) => (
                  <div key={i} className="flex justify-between items-center py-2 border-b border-[#f8f9fa] last:border-none">
                    <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                      <span className="text-[11px] font-bold text-[#4b5563]">{c.name}</span>
                    </div>
                    <span className="text-[11px] font-black text-[#1c1c1c]">{stats.totalRev > 0 ? ((c.value / stats.totalRev) * 100).toFixed(0) : 0}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'experts' && (
        <div className="space-y-8 animate-sb-entry">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="sb-card p-8 border border-[#ededed] shadow-sm bg-white">
              <h2 className="text-[11px] font-black text-[#1c1c1c] uppercase tracking-widest mb-8 flex items-center gap-2">
                <Trophy size={16} className="text-amber-400" /> Top 5 Génération de Valeur
              </h2>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.expertPerformance.slice(0, 5)} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f0f0f0" />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#686868', fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#1c1c1c', fontSize: 11, fontWeight: 'bold' }} />
                    <Tooltip
                      contentStyle={{ borderRadius: '12px', border: '1px solid #ededed' }}
                      formatter={(v: any) => (Number(v) || 0).toLocaleString() + ' F'}
                    />
                    <Bar dataKey="revenue" fill="#3ecf8e" radius={[0, 4, 4, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="sb-card p-8 border border-[#ededed] shadow-sm bg-white">
              <h2 className="text-[11px] font-black text-[#1c1c1c] uppercase tracking-widest mb-8 flex items-center gap-2">
                <Activity size={16} className="text-blue-500" /> Volume d'interventions Clôturées
              </h2>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.expertPerformance.slice(0, 5)}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#1c1c1c', fontSize: 11, fontWeight: 'bold' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#686868', fontSize: 10 }} />
                    <Tooltip contentStyle={{ borderRadius: '12px' }} />
                    <Bar dataKey="tickets" fill="#1c1c1c" radius={[4, 4, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="sb-table-container border border-[#ededed] shadow-sm bg-white">
            <table className="w-full text-left sb-table">
              <thead>
                <tr className="bg-[#fcfcfc]">
                  <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-[#686868]">Expert Technique</th>
                  <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-[#686868]">Volume</th>
                  <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-[#686868]">Indice</th>
                  <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-[#686868]">Panier</th>
                  <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-[#686868] text-right">CA Généré</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f5f5f5]">
                {stats.expertPerformance.map((tech: any, i: number) => (
                  <tr key={tech.id} onClick={() => setSelectedExpert(tech)} className="hover:bg-[#fcfcfc] group transition-colors cursor-pointer">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <img src={tech.avatar} className="w-10 h-10 rounded-xl border border-[#ededed] object-cover bg-white" alt="" />
                          <div className={`absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black shadow-sm ${i === 0 ? 'bg-amber-400 text-white' : 'bg-white text-[#686868] border border-[#ededed]'}`}>
                            {i + 1}
                          </div>
                        </div>
                        <div>
                          <p className="text-[14px] font-black text-[#1c1c1c]">{tech.fullName}</p>
                          <p className="text-[10px] text-[#3ecf8e] font-black uppercase tracking-tighter">Certifié Horizon</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <p className="text-[13px] font-bold text-[#1c1c1c]">{tech.tickets}</p>
                        <div className="w-16 h-1 bg-[#f0f0f0] rounded-full overflow-hidden">
                          <div className="h-full bg-[#1c1c1c]" style={{ width: `${Math.min(100, (tech.tickets / Math.max(1, ...stats.expertPerformance.map((e: any) => e.tickets))) * 100)}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-1.5">
                        <Star size={12} fill="#f59e0b" className="text-amber-500" />
                        <span className="text-[13px] font-black text-[#1c1c1c]">{(tech.rating || 0).toFixed(1)}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <p className="text-[13px] font-mono font-bold text-[#686868]">{(Math.round(tech.avgTicket) || 0).toLocaleString()} F</p>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex flex-col items-end">
                        <p className="text-[16px] font-black text-[#1c1c1c]">{(tech.revenue || 0).toLocaleString()} F</p>
                        <p className={`text-[9px] font-black uppercase tracking-widest mt-1 ${tech.revenue > stats.totalRev / (technicians.length || 1) ? 'text-[#3ecf8e]' : 'text-amber-500'}`}>
                          {tech.revenue > stats.totalRev / (technicians.length || 1) ? 'Over-Perf' : 'Standard'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'archives' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-sb-entry">
          {(reports || []).map((r: StrategicReport) => (
            <div
              key={r.id}
              className="sb-card bg-white border border-[#ededed] hover:border-[#3ecf8e] cursor-pointer transition-all group flex flex-col shadow-sm"
              onClick={() => { setAiReportHtml(r.content); setShowAiModal(true); }}
            >
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 bg-[#f8f9fa] rounded-2xl flex items-center justify-center text-[#3ecf8e] shadow-sm group-hover:scale-105 transition-transform border border-[#f5f5f5]">
                  <FileText size={24} />
                </div>
                <span className="px-2.5 py-1 bg-[#f0fdf4] text-[#3ecf8e] text-[9px] font-black uppercase rounded-full border border-[#dcfce7]">
                  Audit Certifié
                </span>
              </div>
              <h3 className="text-[14px] font-black text-[#1c1c1c] leading-snug">{r.title}</h3>
              <div className="mt-4 pt-4 border-t border-[#f5f5f5] flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <CalendarIcon size={12} className="text-[#9ca3af]" />
                  <span className="text-[10px] text-[#686868] font-bold uppercase tracking-tight">{new Date(r.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-[#686868] hover:bg-[#3ecf8e] hover:text-white transition-colors border border-[#ededed]">
                  <ChevronRight size={16} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showAiModal} onClose={() => setShowAiModal(false)} title="Intelligence Stratégique Horizon Pro" size="lg">
        {isGenerating ? (
          <div className="flex flex-col items-center justify-center py-20 text-center animate-pulse">
            <div className="w-16 h-16 bg-[#f0fdf4] rounded-full flex items-center justify-center text-[#3ecf8e] mb-6 shadow-sm border border-[#dcfce7]">
              <RefreshCw size={32} className="animate-spin" />
            </div>
            <h3 className="text-lg font-black text-[#1c1c1c] uppercase tracking-tight">Audit en cours</h3>
            <p className="text-[11px] text-[#686868] font-bold mt-2 uppercase tracking-widest">Le moteur Gemini 3 Pro analyse {stats.count} flux financiers...</p>
          </div>
        ) : (
          <>
            <div className="p-5 bg-[#f8f9fa] rounded-2xl border border-[#ededed] mb-8 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-[#1c1c1c] rounded-xl flex items-center justify-center text-[#3ecf8e] shadow-md">
                  <Terminal size={20} />
                </div>
                <div>
                  <p className="text-[11px] font-black text-[#1c1c1c] uppercase leading-none tracking-tight">Rapport Stratégique</p>
                  <p className="text-[10px] text-[#686868] font-bold mt-1.5 uppercase tracking-[0.2em]">Motorisé par Gemini 3 Pro</p>
                </div>
              </div>
            </div>
            <div className="prose prose-emerald max-w-none prose-sm leading-relaxed text-[#1c1c1c]" dangerouslySetInnerHTML={{ __html: aiReportHtml }} />
            <div className="mt-12 pt-8 border-t border-[#ededed] flex justify-end">
              <button onClick={() => setShowAiModal(false)} className="btn-sb-primary h-12 px-10 shadow-lg shadow-[#3ecf8e]/20 text-[11px] font-black uppercase tracking-widest">Clôturer l'Audit</button>
            </div>
          </>
        )}
      </Modal>

      <Drawer isOpen={!!selectedExpert} onClose={() => setSelectedExpert(null)} title="Performance Analytique" icon={<UserIcon size={18} />}>
        {selectedExpert && (
          <div className="space-y-8 animate-sb-entry pb-10">
            <div className="flex flex-col items-center text-center p-8 bg-[#f8f9fa] border border-[#ededed] rounded-2xl shadow-sm">
              <div className="relative mb-4">
                <img src={selectedExpert.avatar} className="w-24 h-24 rounded-3xl object-cover border-4 border-white shadow-xl bg-white" alt="" />
                <div className="absolute -bottom-2 -right-2 bg-amber-400 text-white p-1.5 rounded-xl border-2 border-white shadow-md">
                  <Trophy size={16} />
                </div>
              </div>
              <h3 className="text-2xl font-black text-[#1c1c1c] tracking-tight">{selectedExpert.fullName}</h3>
              <p className="text-[11px] text-[#3ecf8e] font-black uppercase tracking-[0.2em] mt-2 bg-[#f0fdf4] px-4 py-1.5 rounded-full border border-[#dcfce7]">
                Expert Technique Certifié
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-5 bg-white border border-[#ededed] rounded-2xl shadow-sm space-y-1">
                <p className="text-[10px] font-black text-[#686868] uppercase tracking-widest">C.A. Période</p>
                <p className="text-xl font-black text-[#1c1c1c] font-mono">{(selectedExpert.revenue || 0).toLocaleString()} F</p>
                <p className="text-[10px] text-[#3ecf8e] font-bold flex items-center gap-1 mt-1"><ArrowUpRight size={10} /> Part de revenu actif</p>
              </div>
              <div className="p-5 bg-white border border-[#ededed] rounded-2xl shadow-sm space-y-1">
                <p className="text-[10px] font-black text-[#686868] uppercase tracking-widest">Panier Moyen</p>
                <p className="text-xl font-black text-[#1c1c1c] font-mono">{(Math.round(selectedExpert.avgTicket) || 0).toLocaleString()} F</p>
                <p className="text-[10px] text-[#686868] font-bold mt-1">Valeur unitaire par ticket</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#ededed] pb-2">
                <h4 className="text-[11px] font-black text-[#686868] uppercase tracking-widest">Dossiers valorisés (Top 10)</h4>
                <span className="text-[10px] font-black text-[#3ecf8e] uppercase tracking-tighter">Cluster Live</span>
              </div>
              <div className="space-y-3">
                {selectedExpert.recentTickets && selectedExpert.recentTickets.length > 0 ? (
                  selectedExpert.recentTickets.map((t: Ticket) => (
                    <div key={t.id} className="flex items-center justify-between p-4 bg-[#fcfcfc] border border-[#ededed] rounded-xl group hover:border-[#3ecf8e] transition-colors shadow-sm">
                      <div className="flex flex-col gap-1">
                        <p className="text-[13px] font-black text-[#1c1c1c]">{t.customerName}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-[#686868]">{new Date(t.createdAt || '').toLocaleDateString()}</span>
                          <span className="text-[10px] text-[#3ecf8e] font-black uppercase tracking-tighter bg-[#f0fdf4] px-1.5 rounded-sm">• {t.category}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[14px] font-black text-[#1c1c1c] font-mono">{(t.financials?.grandTotal || 0).toLocaleString()} F</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center bg-[#fcfcfc] border-2 border-dashed border-[#ededed] rounded-2xl opacity-40">
                    <ShoppingBag size={32} className="mx-auto text-[#686868] mb-3" />
                    <p className="text-[11px] font-black text-[#686868] uppercase tracking-widest">Aucune donnée sur la période</p>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-6">
              <button
                onClick={() => navigate('/technicians')}
                className="btn-sb-outline w-full justify-center gap-3 h-14 text-[11px] font-black uppercase tracking-widest rounded-2xl"
              >
                <ExternalLink size={16} /><span>Consulter Profil RH</span>
              </button>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default Finances;
