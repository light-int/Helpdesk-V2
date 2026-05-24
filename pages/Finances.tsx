
import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp, DollarSign, Activity, Sparkles,
  PieChart as PieIcon, BarChart3, Calendar as CalendarIcon,
  ChevronRight, FileText, RefreshCw,
  ArrowUpRight, Target, Users, Landmark,
  Trophy, Star, ShoppingBag,
  ExternalLink, User as UserIcon, Terminal,
  Wallet, ArrowUpRight as ArrowUp, ArrowDownRight
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
import { Ticket, Technician, StrategicReport, CashRegister, CashRegisterEntry } from '../types';
import { ApiService } from '../services/apiService';

const CustomTooltip = ({ active, payload, label, currency = 'F' }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#1c1c1c] text-white p-3 rounded-lg shadow-lg border border-white/10 animate-scale-in">
        <p className="text-[9px] font-semibold uppercase tracking-widest text-gray-400 mb-1">{label}</p>
        {payload.map((p: any, i: number) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.color || p.fill }} />
            <p className="text-xs font-semibold font-mono">
              {p.value?.toLocaleString()} <span className="text-[9px] text-gray-400">{currency}</span>
            </p>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const AnimatedNumber = ({ value, currency = '', duration = 1000 }: { value: number | string, currency?: string, duration?: number }) => {
  const [displayValue, setDisplayValue] = useState(0);
  const target = typeof value === 'number' ? value : parseFloat(value.toString().replace(/[^0-9.-]+/g, '')) || 0;

  useEffect(() => {
    let startTimestamp: number | null = null;
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      setDisplayValue(Math.floor(progress * target));
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    window.requestAnimationFrame(step);
  }, [target, duration]);

  return <span>{displayValue.toLocaleString()}{currency && <span className="text-[0.6em] ml-0.5 opacity-50">{currency}</span>}</span>;
};

const MiniSparkline = ({ data, color }: { data: any[], color: string }) => (
  <div className="h-10 w-24">
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <Area type="monotone" dataKey="revenue" stroke={color} fill={color} fillOpacity={0.1} strokeWidth={2} isAnimationActive={false} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  </div>
);

const Finances: React.FC = () => {
  const _u = (() => { try { return useData(); } catch { return { tickets: [], technicians: [], reports: [], cashRegisterSessions: [], cashRegisterEntries: [], refreshAll: () => { }, isLoading: false, isSyncing: false }; } })();
  const { tickets: allTickets = _u.tickets, technicians = _u.technicians, reports = _u.reports, cashRegisterSessions = _u.cashRegisterSessions, cashRegisterEntries = _u.cashRegisterEntries, refreshAll = _u.refreshAll, isLoading = _u.isLoading, isSyncing = _u.isSyncing } = _u;
  const { addNotification } = (() => { try { return useNotifications(); } catch { return { addNotification: () => { } }; } })();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'overview' | 'experts' | 'archives'>('overview');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiReportHtml, setAiReportHtml] = useState('');
  const [selectedExpert, setSelectedExpert] = useState<any | null>(null);
  const [drilldownTickets, setDrilldownTickets] = useState<Ticket[]>([]);
  const [showDrilldown, setShowDrilldown] = useState(false);
  const [drilldownTitle, setDrilldownTitle] = useState('');
  const [selectedShowroom, setSelectedShowroom] = useState<string>('all');

  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  // Session synchronization
  const [cashRegisters, setCashRegisters] = useState<CashRegister[]>([]);
  const [selectedRegisterId, setSelectedRegisterId] = useState<string>('');
  const [sessionEntries, setSessionEntries] = useState<CashRegisterEntry[]>([]);

  useEffect(() => {
    ApiService.caisse.getAllCashRegisters().then(regs => {
      setCashRegisters(regs);
      if (regs.length > 0) setSelectedRegisterId(regs[0].id);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedRegisterId) { setSessionEntries([]); return; }
    const activeSession = cashRegisterSessions.find((s: any) => s.cashRegisterId === selectedRegisterId && s.status === 'Ouverte');
    if (activeSession) {
      ApiService.caisse.getEntriesBySession(activeSession.id).then(setSessionEntries).catch(() => setSessionEntries([]));
    } else {
      setSessionEntries([]);
    }
  }, [selectedRegisterId, cashRegisterSessions]);

  const sessionTotals = useMemo(() => {
    const totalIn = sessionEntries.filter(e => e.type !== 'Dépense').reduce((sum, e) => sum + e.amount, 0);
    const totalOut = sessionEntries.filter(e => e.type === 'Dépense').reduce((sum, e) => sum + e.amount, 0);
    const activeSession = cashRegisterSessions.find((s: any) => s.cashRegisterId === selectedRegisterId && s.status === 'Ouverte');
    return { totalIn, totalOut, net: totalIn - totalOut, openingBalance: activeSession?.openingBalance || 0, count: sessionEntries.length };
  }, [sessionEntries, cashRegisterSessions, selectedRegisterId]);

  const setPeriod = (period: 'today' | '7d' | '30d' | 'year') => {
    const end = new Date();
    const start = new Date();
    if (period === 'today') { /* same day */ }
    else if (period === '7d') start.setDate(start.getDate() - 7);
    else if (period === '30d') start.setDate(start.getDate() - 30);
    else if (period === 'year') start.setFullYear(start.getFullYear() - 1);

    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

  const availableShowrooms = useMemo(() => {
    const set = new Set((allTickets || []).map(t => t.showroom).filter(Boolean));
    return Array.from(set).sort() as string[];
  }, [allTickets]);

  useEffect(() => { refreshAll(); }, [refreshAll]);

  const stats = useMemo(() => {
    const financialTickets = (allTickets || []).filter((t: Ticket) => {
      const d = (t.createdAt || '').split('T')[0];
      const dateMatch = d >= startDate && d <= endDate;
      const showroomMatch = selectedShowroom === 'all' || t.showroom === selectedShowroom;
      return dateMatch && showroomMatch && t.financials && (t.status === 'Terminé - Prêt à être payé' || t.status === 'Payé - Clôturé' || t.status === 'Fermé');
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

    // Simple forecasting: average daily revenue of the last 7 days projected for the next 3 days
    const last7Days = trendData.slice(-7);
    const avgDaily = last7Days.length > 0
      ? last7Days.reduce((acc, curr) => acc + curr.revenue, 0) / last7Days.length
      : 0;

    const forecastData = [...trendData];
    if (trendData.length > 0) {
      const lastDate = new Date(trendData[trendData.length - 1].day);
      for (let i = 1; i <= 3; i++) {
        const nextDate = new Date(lastDate);
        nextDate.setDate(lastDate.getDate() + i);
        forecastData.push({
          day: nextDate.toISOString().split('T')[0],
          revenue: 0, // baseline for area
          forecast: avgDaily * (1 + (Math.random() * 0.2 - 0.1)) // simple noisy average
        });
      }
    }

    const expertPerformance = (technicians || []).map((tech: Technician) => {
      const techTickets = financialTickets.filter((t: Ticket) => t.assignedTechnicianId === tech.id);
      const revenue = techTickets.reduce((acc: number, t: Ticket) => acc + (t.financials?.grandTotal || 0), 0);
      const margin = techTickets.reduce((acc: number, t: Ticket) => acc + (t.financials?.netMargin || 0), 0);
      return {
        id: tech.id,
        name: tech.name.split(' ')[0],
        fullName: tech.name,
        avatar: tech.avatar,
        revenue,
        margin,
        tickets: techTickets.length,
        avgTicket: techTickets.length > 0 ? revenue / techTickets.length : 0,
        rating: tech.rating || 5.0,
        recentTickets: techTickets.slice(0, 10)
      };
    }).sort((a: any, b: any) => b.revenue - a.revenue);

    return {
      totalRev, totalMargin, totalParts, totalLabor,
      trendData, categoryData, expertPerformance,
      forecastData,
      count: financialTickets.length
    };
  }, [allTickets, technicians, startDate, endDate, selectedShowroom]);

  const prevStats = useMemo(() => {
    const activeStart = new Date(startDate);
    const activeEnd = new Date(endDate);
    const diff = activeEnd.getTime() - activeStart.getTime();
    const prevEnd = new Date(activeStart.getTime() - (24 * 60 * 60 * 1000));
    const prevStart = new Date(prevEnd.getTime() - diff);

    const s1 = prevStart.toISOString().split('T')[0];
    const e1 = prevEnd.toISOString().split('T')[0];

    const prevTickets = (allTickets || []).filter((t: Ticket) => {
      const d = (t.createdAt || '').split('T')[0];
      return d >= s1 && d <= e1 && t.financials;
    });

    const totalRev = prevTickets.reduce((acc: number, curr: Ticket) => acc + (curr.financials?.grandTotal || 0), 0);
    const totalMargin = prevTickets.reduce((acc: number, curr: Ticket) => acc + (curr.financials?.netMargin || 0), 0);

    return { totalRev, totalMargin, count: prevTickets.length };
  }, [allTickets, startDate, endDate]);

  const getDelta = (curr: number, prev: number) => {
    if (prev === 0) return null;
    const delta = ((curr - prev) / prev) * 100;
    return {
      value: delta.toFixed(1),
      isPositive: delta >= 0
    };
  };

  const handleDrilldown = (data: any, type: 'category' | 'trend') => {
    let filtered: Ticket[] = [];
    let title = '';

    if (type === 'category') {
      const catName = data.activePayload?.[0]?.payload?.name || data.name;
      filtered = (allTickets || []).filter(t => t.category === catName);
      title = `Détails : ${catName}`;
    } else {
      const day = data.activePayload?.[0]?.payload?.day;
      filtered = (allTickets || []).filter(t => (t.createdAt || '').split('T')[0] === day);
      title = `Flux du ${new Date(day).toLocaleDateString()}`;
    }

    setDrilldownTickets(filtered);
    setDrilldownTitle(title);
    setShowDrilldown(true);
  };

  const handleExportCSV = () => {
    const data = (allTickets || []).filter((t: Ticket) => {
      const d = (t.createdAt || '').split('T')[0];
      const showroomMatch = selectedShowroom === 'all' || t.showroom === selectedShowroom;
      return d >= startDate && d <= endDate && showroomMatch;
    }).map(t => ({
      ID: t.id,
      Date: new Date(t.createdAt).toLocaleDateString(),
      Client: t.customerName,
      Showroom: t.showroom || '-',
      Categorie: t.category,
      Total: t.financials?.grandTotal || 0,
      Marge: t.financials?.netMargin || 0,
      Pieces: t.financials?.partsTotal || 0,
      MO: t.financials?.laborTotal || 0,
      Statut: t.status
    }));

    if (data.length === 0) {
      addNotification({ title: 'Export Impossible', message: 'Aucune donnée à exporter sur cette période.', type: 'warning' });
      return;
    }

    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(obj => Object.values(obj).map(v => `"${v}"`).join(','));
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Export_Finances_${startDate}_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addNotification({ title: 'Export Réussi', message: 'Le fichier CSV a été téléchargé.', type: 'success' });
  };

  const handleAuditIA = async () => {
    if (!isAiOperational()) {
      addNotification({ title: 'Clé API manquante', message: 'Veuillez configurer votre clé Gemini dans les paramètres.', type: 'warning' });
      return;
    }
    setIsGenerating(true);
    try {
      setShowAiModal(true);
      const reportMarkdown = await generateStrategicReport({
        ca: stats.totalRev,
        marge: stats.totalMargin,
        volume: stats.count,
        tickets: [],
        techniciens: [],
        periode: `${startDate} au ${endDate}`
      });
      const htmlContent = marked.parse(reportMarkdown || '') as string;
      setAiReportHtml(htmlContent);
    } catch (e) {
      addNotification({ title: 'Erreur IA', message: 'Échec de génération du rapport.', type: 'error' });
      setShowAiModal(false);
    } finally { setIsGenerating(false); }
  };

  const CHART_COLORS = ['#3ecf8e', '#1c1c1c', '#6366f1', '#f59e0b', '#ec4899', '#06b6d4'];

  if (isLoading) return <div className="h-[80vh] flex items-center justify-center"><RefreshCw className="animate-spin text-[#3ecf8e]" size={32} /></div>;

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-3 space-y-5 animate-sb-entry pb-20">
      <header className="space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#3ecf8e]/10 rounded-xl flex items-center justify-center text-[#3ecf8e]">
              <TrendingUp size={18} />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
                Audit Financier
                </h1>
              <p className="text-xs text-[#686868] font-semibold uppercase tracking-wider mt-0.5">Performance et rentabilité opérationnelle.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleExportCSV} className="h-9 px-3 flex items-center gap-1.5 bg-white border border-[#e5e5e5] text-[#686868] rounded-lg hover:bg-[#fafafa] transition-colors btn-interactive shadow-sm" title="Exporter CSV">
              <ShoppingBag size={12} />
              <span className="text-[8px] font-semibold uppercase tracking-widest">Export</span>
            </button>
            <button onClick={handleAuditIA} disabled={isGenerating} className="btn-sb-primary h-9 px-3 shadow-md shadow-[#3ecf8e]/20 btn-interactive">
              <Sparkles size={12} className={isGenerating ? 'animate-pulse' : ''} />
              <span className="text-[8px] font-semibold uppercase tracking-widest">Audit Gemini</span>
            </button>
            <button onClick={refreshAll} className="h-9 w-9 flex items-center justify-center bg-white border border-[#e5e5e5] text-[#686868] rounded-lg hover:bg-[#fafafa] transition-colors btn-interactive shadow-sm">
              <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 p-2 bg-gray-50 border border-[#e5e5e5] rounded-xl shadow-sm">
          <div className="flex items-center gap-1 bg-white border border-[#e5e5e5] rounded-lg p-0.5 shadow-sm">
            {[
              { id: 'today', label: 'Jour' },
              { id: '7d', label: '7J' },
              { id: '30d', label: '30J' },
              { id: 'year', label: 'Année' }
            ].map(p => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id as any)}
                className={`px-2.5 py-1 text-[9px] font-semibold uppercase rounded-lg transition-all ${startDate.includes(new Date().toISOString().split('T')[0]) && p.id === 'today' ? 'bg-white shadow-sm text-[#1c1c1c] border border-[#e5e5e5]' : 'text-[#686868] hover:text-[#1c1c1c]'}`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <span className="hidden sm:block w-px h-5 bg-[#e5e5e5]" />

          <div className="flex bg-white border border-[#e5e5e5] rounded-lg p-0.5 shadow-sm h-8">
            <div className="flex items-center gap-1.5 px-2 border-r border-[#e5e5e5]">
              <CalendarIcon size={10} className="text-[#686868]" />
              <input
                type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="bg-transparent border-none text-[10px] font-semibold p-0 focus:ring-0 w-[88px] cursor-pointer"
              />
            </div>
            <div className="flex items-center gap-1.5 px-2">
              <input
                type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                className="bg-transparent border-none text-[10px] font-semibold p-0 focus:ring-0 w-[88px] cursor-pointer"
              />
            </div>
          </div>

          <span className="hidden sm:block w-px h-5 bg-[#e5e5e5]" />

          <div className="flex bg-white border border-[#e5e5e5] rounded-lg px-2 h-8 items-center shadow-sm">
            <Landmark size={10} className="text-[#686868] mr-1.5" />
            <select
              value={selectedShowroom}
              onChange={e => setSelectedShowroom(e.target.value)}
              className="bg-transparent border-none text-[10px] font-semibold p-0 focus:ring-0 w-28 cursor-pointer focus:outline-none"
            >
              <option value="all">Tous Showrooms</option>
              {availableShowrooms.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <span className="hidden sm:block w-px h-5 bg-[#e5e5e5]" />

          <div className="flex bg-white border border-[#e5e5e5] rounded-lg px-2 h-8 items-center shadow-sm">
            <Wallet size={10} className="text-[#686868] mr-1.5" />
            <select
              value={selectedRegisterId}
              onChange={e => setSelectedRegisterId(e.target.value)}
              className="bg-transparent border-none text-[10px] font-semibold p-0 focus:ring-0 w-32 cursor-pointer focus:outline-none"
            >
              <option value="">Toutes Caisses</option>
              {cashRegisters.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
        </div>
      </header>

      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
        {[
          { id: 'overview', label: 'Dashboard', icon: <BarChart3 size={14} /> },
          { id: 'experts', label: 'Experts', icon: <Users size={14} /> },
          { id: 'archives', label: 'Historique', icon: <FileText size={14} /> }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-2 text-[9px] font-semibold uppercase tracking-widest rounded-lg transition-all ${activeTab === tab.id ? 'bg-white shadow-sm text-[#1c1c1c]' : 'text-[#686868] hover:text-[#1c1c1c]'}`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {
        activeTab === 'overview' && (
          <div className="space-y-4 animate-sb-entry">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'C.A. Global', value: stats.totalRev, sub: `${stats.count} dossiers clos`, delta: getDelta(stats.totalRev, prevStats.totalRev), icon: <DollarSign />, color: '#3ecf8e', bg: 'bg-[#f0fdf4]', spark: true },
                { label: 'Bénéfice Net', value: stats.totalMargin, sub: 'Marge opé.', delta: getDelta(stats.totalMargin, prevStats.totalMargin), icon: <TrendingUp />, color: '#3b82f6', bg: 'bg-[#eff6ff]', spark: true },
                { label: 'Parts & Rechanges', value: stats.totalParts, sub: 'Logistique', delta: null, icon: <Landmark />, color: '#8b5cf6', bg: 'bg-[#f5f3ff]', spark: false },
                { label: 'Efficience', value: stats.totalRev > 0 ? `${((stats.totalMargin / stats.totalRev) * 100).toFixed(1)}%` : '0%', sub: 'Taux de marge', delta: null, icon: <Target />, color: '#f59e0b', bg: 'bg-[#fffbeb]', spark: false }
              ].map((s, i) => (
                <div key={i} className="sb-card p-5 relative overflow-hidden group hover-lift border border-[#e5e5e5] transition-all duration-300 hover:shadow-md hover:shadow-gray-100">
                  <div className="flex justify-between items-start mb-4 relative z-10">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${s.bg} shadow-sm group-hover:scale-110 transition-transform`} style={{ color: s.color }}>
                      {React.cloneElement(s.icon as React.ReactElement, { size: 16 })}
                    </div>
                    {s.spark && (
                      <div className="opacity-40 group-hover:opacity-100 transition-opacity">
                        <MiniSparkline data={stats.trendData.slice(-10)} color={s.color} />
                      </div>
                    )}
                    {s.delta && !s.spark && (
                      <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold ${s.delta.isPositive ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                        {s.delta.isPositive ? '+' : ''}{s.delta.value}%
                      </div>
                    )}
                  </div>
                  <div className="relative z-10">
                    <p className="text-[9px] font-semibold text-[#686868] uppercase tracking-[0.1em] mb-0.5">{s.label}</p>
                    <div className="flex items-baseline gap-2">
                      <h3 className="text-base font-semibold text-[#1c1c1c] font-mono tracking-tighter">
                        {typeof s.value === 'number' ? <AnimatedNumber value={s.value} currency="F" /> : s.value}
                      </h3>
                      {s.delta && s.spark && (
                        <span className={`text-[9px] font-semibold ${s.delta.isPositive ? 'text-[#3ecf8e]' : 'text-red-500'}`}>
                          {s.delta.isPositive ? '↑' : '↓'} {s.delta.value}%
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-2">
                      <div className="w-1 h-1 rounded-full bg-[#3ecf8e]"></div>
                      <p className="text-[9px] text-[#9ca3af] font-semibold italic">{s.sub}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {selectedRegisterId && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="sb-card p-4 border border-[#e5e5e5] bg-[#f0fdf4]/30">
                  <p className="text-[9px] font-semibold uppercase tracking-widest text-[#686868] flex items-center gap-2"><Wallet size={12} /> Session Active</p>
                  <p className="text-xs font-semibold mt-1">{cashRegisters.find(r => r.id === selectedRegisterId)?.name || '—'}</p>
                  <p className="text-[9px] text-[#686868]">{cashRegisterSessions.find((s: any) => s.cashRegisterId === selectedRegisterId && s.status === 'Ouverte') ? 'Ouverte' : 'Fermée'}</p>
                </div>
                <div className="sb-card p-4 border border-[#e5e5e5]">
                  <p className="text-[9px] font-semibold uppercase tracking-widest text-green-600 flex items-center gap-2"><ArrowUp size={12} /> Entrées</p>
                  <p className="text-base font-bold font-mono">{(sessionTotals.totalIn || 0).toLocaleString()} F</p>
                  <p className="text-[9px] text-[#686868]">{sessionTotals.count} opérations</p>
                </div>
                <div className="sb-card p-4 border border-[#e5e5e5]">
                  <p className="text-[9px] font-semibold uppercase tracking-widest text-red-600 flex items-center gap-2"><ArrowDownRight size={12} /> Sorties</p>
                  <p className="text-base font-bold font-mono">{(sessionTotals.totalOut || 0).toLocaleString()} F</p>
                </div>
                <div className="sb-card p-4 border border-[#e5e5e5] bg-[#f0fdf4]/30">
                  <p className="text-[9px] font-semibold uppercase tracking-widest text-[#686868] flex items-center gap-2"><TrendingUp size={12} /> Net Caisse</p>
                  <p className={`text-base font-bold font-mono ${sessionTotals.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {(sessionTotals.net >= 0 ? '+' : '')}{(sessionTotals.net || 0).toLocaleString()} F
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 sb-card p-4 border-sb border-[#e5e5e5] bg-white hover-lift">
                <div className="flex items-center justify-between mb-10">
                  <h2 className="text-[11px] font-semibold text-[#1c1c1c] uppercase tracking-[0.2em] flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#f0fdf4] text-[#3ecf8e] flex items-center justify-center"><Activity size={16} /></div>
                    Chronologie des flux
                  </h2>
                  <div className="flex items-center gap-2 px-3 py-1 bg-gray-50 rounded-full text-[9px] font-semibold text-[#686868] border border-[#f0f0f0]">TEMPS RÉEL</div>
                </div>
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats.forecastData}>
                      <defs>
                        <linearGradient id="colorRevFin" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3ecf8e" stopOpacity={0.3} />
                          <stop offset="60%" stopColor="#3ecf8e" stopOpacity={0.1} />
                          <stop offset="95%" stopColor="#3ecf8e" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#9ca3af" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#9ca3af" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 9, fontWeight: '800' }} dy={10} tickFormatter={(str) => {
                        const d = new Date(str);
                        return d.toLocaleDateString([], { day: '2-digit', month: 'short' });
                      }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 9, fontWeight: '800' }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#3ecf8e', strokeWidth: 1, strokeDasharray: '4 4' }} />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke="#3ecf8e"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorRevFin)"
                        animationDuration={2000}
                        activeDot={{ r: 6, stroke: 'white', strokeWidth: 2, fill: '#3ecf8e' }}
                        onClick={(data) => handleDrilldown(data, 'trend')}
                        connectNulls
                      />
                      <Area
                        type="monotone"
                        dataKey="forecast"
                        stroke="#9ca3af"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        fillOpacity={1}
                        fill="url(#colorForecast)"
                        animationDuration={3000}
                        connectNulls
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="sb-card p-3 border border-[#e5e5e5] flex flex-col hover-lift bg-white">
                <h2 className="text-[9px] font-semibold text-[#1c1c1c] uppercase tracking-[0.15em] mb-6 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#eff6ff] text-blue-500 flex items-center justify-center shadow-inner"><PieIcon size={16} /></div>
                  Mix Catégoriel
                </h2>
                <div className="h-[180px] w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={90}
                        paddingAngle={10}
                        dataKey="value"
                        animationDuration={1500}
                        stroke="none"
                        onClick={(data) => handleDrilldown(data, 'category')}
                      >
                        {stats.categoryData.map((_: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} className="hover:opacity-80 transition-opacity cursor-pointer focus:outline-none" />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle">
                        <tspan x="50%" dy="-1.2em" className="text-[9px] font-semibold fill-gray-400 uppercase tracking-widest">Total</tspan>
                        <tspan x="50%" dy="1.5em" className="text-lg font-semibold fill-[#1c1c1c] font-mono">{(stats.totalRev / 1000).toFixed(0)}k</tspan>
                      </text>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-6 space-y-2">
                  {stats.categoryData.slice(0, 4).map((c: any, i: number) => (
                    <div key={i} className="flex justify-between items-center py-2 border-b border-[#f8f9fa] last:border-none group/item hover:bg-gray-50 rounded-lg px-2 -mx-2 transition-colors">
                      <div className="flex items-center gap-2.5">
                        <div className="w-2 h-2 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                        <span className="text-[9px] font-semibold text-[#4b5563] group-hover/item:text-[#1c1c1c] transition-colors uppercase tracking-tight">{c.name}</span>
                      </div>
                      <span className="text-[11px] font-semibold text-[#1c1c1c] font-mono">{stats.totalRev > 0 ? ((c.value / stats.totalRev) * 100).toFixed(0) : 0}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )
      }

      {
        activeTab === 'experts' && (
          <div className="space-y-8 animate-sb-entry">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="sb-card p-4 border-sb border-[#e5e5e5] shadow-sm bg-white">
                <h2 className="text-[11px] font-semibold text-[#1c1c1c] uppercase tracking-[0.2em] mb-8 flex items-center gap-3"><Trophy size={16} className="text-amber-400" /> Top Valeur Générée</h2>
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.expertPerformance.slice(0, 5)} layout="vertical" margin={{ left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f0f0f0" />
                      <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#686868', fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#1c1c1c', fontSize: 11, fontWeight: 'bold' }} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e5e5e5' }} formatter={(v: any) => (Number(v) || 0).toLocaleString() + ' F'} />
                      <Bar dataKey="revenue" fill="#3ecf8e" radius={[0, 4, 4, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="sb-card p-4 border-sb border-[#e5e5e5] shadow-sm bg-white">
                <h2 className="text-[11px] font-semibold text-[#1c1c1c] uppercase tracking-[0.2em] mb-8 flex items-center gap-3"><Activity size={16} className="text-blue-500" /> Volume Interventions</h2>
                <div className="h-[220px]">
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

            <div className="sb-table-container animate-sb-entry shadow-sm border border-[#e5e5e5]">
              <div className="px-6 py-4 border-b border-[#f5f5f5] bg-[#fcfcfc] flex items-center justify-between">
                <h2 className="text-[9px] font-semibold text-[#1c1c1c] uppercase tracking-[0.15em] flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shadow-inner"><Target size={14} /></div>
                  Efficience par Expert
                </h2>
                <div className="flex items-center gap-2"><div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"></div><span className="text-[8px] font-semibold text-[#686868] uppercase tracking-widest">Temps Réel</span></div>
              </div>
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[9px] uppercase font-semibold text-[#686868] border-b border-[#f0f0f0] bg-[#f8f9fa]">
                      <th className="px-6 py-3">Expert</th>
                      <th className="px-6 py-3 text-center">Dossiers</th>
                      <th className="px-6 py-3 text-right">C.A. Généré</th>
                      <th className="px-6 py-3 text-right">Marge Brute</th>
                      <th className="px-6 py-3 text-right">Ratio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.expertPerformance.map((e: any, idx: number) => (
                      <tr key={e.id || idx} className="border-b border-[#f5f5f5] hover:bg-[#fafafa] transition-colors group cursor-pointer" onClick={() => setSelectedExpert(e)}>
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-2.5">
                            <img src={e.avatar} className="w-7 h-7 rounded-lg object-cover border border-[#eee] shadow-sm" alt="" />
                            <span className="font-semibold text-[11px] text-[#1c1c1c] group-hover:text-[#3ecf8e] transition-colors">{e.fullName}</span>
                          </div>
                        </td>
                        <td className="px-6 py-3 text-center font-semibold text-[#686868] text-[11px]">{e.tickets}</td>
                        <td className="px-6 py-3 text-right font-semibold font-mono text-[#1c1c1c] text-[11px]">{(e.revenue || 0).toLocaleString()}</td>
                        <td className="px-6 py-3 text-right font-semibold font-mono text-[#3ecf8e] text-[11px]">+{(e.margin || 0).toLocaleString()}</td>
                        <td className="px-6 py-3 text-right">
                          <div className="flex items-center justify-end gap-3">
                            <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden hidden md:block">
                              <div className={`h-full transition-all duration-1000 ${e.margin / e.revenue > 0.4 ? 'bg-[#3ecf8e]' : 'bg-blue-500'}`}
                                style={{ width: `${Math.min(100, (e.revenue > 0 ? (e.margin / e.revenue) * 100 : 0))}%` }} />
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold tracking-tighter ${e.margin / e.revenue > 0.4 ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                              {e.revenue > 0 ? ((e.margin / e.revenue) * 100).toFixed(0) : 0}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )
      }

      {
        activeTab === 'archives' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-sb-entry">
            {(reports || []).map((r: StrategicReport) => (
              <div key={r.id} className="sb-card bg-white border-sb border-[#e5e5e5] hover:border-[#3ecf8e] cursor-pointer transition-all group flex flex-col shadow-sm" onClick={() => { setAiReportHtml(r.content); setShowAiModal(true); }}>
                <div className="flex justify-between items-start mb-6">
                  <div className="w-12 h-12 bg-[#f8f9fa] rounded-xl flex items-center justify-center text-[#3ecf8e] shadow-sm group-hover:scale-105 transition-transform border border-[#f5f5f5]"><FileText size={18} /></div>
                  <span className="px-2.5 py-1 bg-[#f0fdf4] text-[#3ecf8e] text-[9px] font-semibold uppercase rounded-full border border-[#dcfce7]">Audit Certifié</span>
                </div>
                <h3 className="text-[12px] font-semibold text-[#1c1c1c] leading-snug">{r.title}</h3>
                <div className="mt-4 pt-4 border-t border-[#f5f5f5] flex justify-between items-center">
                  <div className="flex items-center gap-2"><CalendarIcon size={12} className="text-[#9ca3af]" /><span className="text-[9px] text-[#686868] font-semibold uppercase tracking-tight">{new Date(r.createdAt).toLocaleDateString()}</span></div>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-[#686868] hover:bg-[#3ecf8e] hover:text-white transition-colors border border-[#e5e5e5]"><ChevronRight size={16} /></div>
                </div>
              </div>
            ))}
          </div>
        )
      }

      <Modal isOpen={showAiModal} onClose={() => setShowAiModal(false)} title="Audit Stratégique Horizon AI" size="lg">
        {isGenerating ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="relative mb-8">
              <div className="w-20 h-20 bg-[#3ecf8e]/10 rounded-full flex items-center justify-center text-[#3ecf8e] shadow-inner">
                <RefreshCw size={40} className="animate-spin" />
              </div>
              <div className="absolute inset-0 border-4 border-t-[#3ecf8e] border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
            </div>
            <h3 className="text-base font-semibold text-[#1c1c1c] uppercase tracking-tighter">Analyse Cognitive en Cours</h3>
            <p className="text-[9px] text-[#686868] font-semibold mt-3 uppercase tracking-[0.25em] max-w-[280px] leading-relaxed">Le moteur Horizon-7 traite actuellement {stats.count} segments de données financières...</p>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="p-3 bg-[#1c1c1c] rounded-xl border border-white/10 shadow-lg relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#3ecf8e]/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-[#3ecf8e]/20 transition-colors"></div>
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-12 h-12 bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg flex items-center justify-center text-[#3ecf8e] shadow-md">
                  <Terminal size={22} />
                </div>
                <div>
                  <p className="text-[12px] font-semibold text-white uppercase tracking-tight">Intelligence Stratégique</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[9px] text-[#3ecf8e] font-semibold uppercase tracking-[0.2em] px-2 py-0.5 bg-[#3ecf8e]/10 rounded-full">Pro Model v4.0</span>
                    <span className="text-[9px] text-gray-400 font-semibold uppercase tracking-widest">{new Date().toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="prose prose-sm max-w-none prose-headings:text-[#1c1c1c] prose-headings:font-semibold prose-headings:uppercase prose-headings:tracking-widest prose-headings:border-l-4 prose-headings:border-[#3ecf8e] prose-headings:pl-4 prose-p:text-gray-600 prose-p:leading-relaxed prose-strong:text-[#1c1c1c] prose-strong:font-semibold bg-white p-4 rounded-xl border border-[#e5e5e5] shadow-sm selection:bg-[#3ecf8e]/20"
              dangerouslySetInnerHTML={{ __html: aiReportHtml }} />

            <div className="flex justify-end pt-4">
              <button
                onClick={() => setShowAiModal(false)}
                className="px-10 h-14 bg-[#1c1c1c] text-white rounded-xl text-[11px] font-semibold uppercase tracking-[0.2em] hover:bg-[#333] transition-all btn-interactive shadow-md shadow-gray-200"
              >
                Clôturer l'Analyse
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Drawer isOpen={!!selectedExpert} onClose={() => setSelectedExpert(null)} title="Performance Analytique" icon={<UserIcon size={18} />}>
        {selectedExpert && (
          <div className="space-y-8 animate-sb-entry pb-10">
            <div className="flex flex-col items-center text-center p-4 bg-[#f8f9fa] border-sb border-[#e5e5e5] rounded-3xl shadow-sm">
              <div className="relative mb-4">
                <img src={selectedExpert.avatar} className="w-24 h-24 rounded-3xl object-cover border-4 border-white shadow-md bg-white" alt="" />
                <div className="absolute -bottom-2 -right-2 bg-amber-400 text-white p-1.5 rounded-lg border-2 border-white shadow-sm"><Trophy size={16} /></div>
              </div>
              <h3 className="text-2xl font-semibold text-[#1c1c1c] tracking-tight">{selectedExpert.fullName}</h3>
              <p className="text-[11px] text-[#3ecf8e] font-semibold uppercase tracking-[0.2em] mt-2 bg-[#f0fdf4] px-4 py-1.5 rounded-full border border-[#dcfce7]">Technicien Certifié</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="sb-card p-5 space-y-1"><p className="text-[9px] font-semibold text-[#686868] uppercase tracking-widest">C.A. Période</p><p className="text-base font-semibold text-[#1c1c1c] font-mono">{(selectedExpert.revenue || 0).toLocaleString()} F</p></div>
              <div className="sb-card p-5 space-y-1"><p className="text-[9px] font-semibold text-[#686868] uppercase tracking-widest">Panier Moyen</p><p className="text-base font-semibold text-[#1c1c1c] font-mono">{(Math.round(selectedExpert.avgTicket) || 0).toLocaleString()} F</p></div>
            </div>
            <div className="space-y-4">
              <h4 className="text-[11px] font-semibold text-[#686868] uppercase tracking-widest border-b border-[#eee] pb-2">Dossiers récents</h4>
              <div className="space-y-3">
                {selectedExpert.recentTickets?.map((t: Ticket) => (
                  <div key={t.id} className="flex items-center justify-between p-4 bg-[#fcfcfc] border border-[#e5e5e5] rounded-lg group hover:border-[#3ecf8e] transition-colors">
                    <div className="flex flex-col gap-1">
                      <p className="text-[13px] font-semibold text-[#1c1c1c]">{t.customerName}</p>
                      <span className="text-[9px] text-[#3ecf8e] font-semibold uppercase tracking-tighter bg-[#f0fdf4] px-1.5 w-fit rounded-sm">{t.category}</span>
                    </div>
                    <p className="text-[12px] font-semibold text-[#1c1c1c] font-mono">{(t.financials?.grandTotal || 0).toLocaleString()} F</p>
                  </div>
                )) || <p className="text-center text-xs text-gray-400">Aucun ticket récent</p>}
              </div>
            </div>
            <button onClick={() => navigate('/technicians')} className="btn-sb-outline w-full justify-center h-14 text-[11px] font-semibold uppercase tracking-widest rounded-xl btn-interactive"><ExternalLink size={16} /><span>Profil RH</span></button>
          </div>
        )}
      </Drawer>

      <Drawer isOpen={showDrilldown} onClose={() => setShowDrilldown(false)} title={drilldownTitle} icon={<Activity size={18} />}>
        <div className="space-y-4 animate-sb-entry pb-20">
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 mb-6">
            <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-widest">Résumé</p>
            <p className="text-sm font-semibold text-gray-700">{drilldownTickets.length} dossiers identifiés sur cette sélection.</p>
          </div>
          <div className="space-y-3">
            {drilldownTickets.map(t => (
              <div
                key={t.id}
                onClick={() => navigate(`/tickets?id=${t.id}`)}
                className="p-4 bg-white border border-[#e5e5e5] rounded-xl hover:border-[#3ecf8e] hover:shadow-sm transition-all cursor-pointer group"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="text-[12px] font-semibold text-[#1c1c1c] group-hover:text-[#3ecf8e] transition-colors">{t.customerName}</h4>
                    <span className="text-[9px] text-[#686868] font-semibold">Ref: #{t.id.slice(0, 8)}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-[12px] font-semibold font-mono text-[#1c1c1c]">{(t.financials?.grandTotal || 0).toLocaleString()} F</p>
                    <p className="text-[9px] text-[#3ecf8e] font-semibold uppercase">+{t.financials?.netMargin?.toLocaleString()} F</p>
                  </div>
                </div>
                <div className="flex justify-between items-center mt-3 pt-3 border-t border-[#f8f9fa]">
                  <span className="px-2 py-0.5 bg-gray-100 text-[#686868] text-[8px] font-semibold uppercase rounded-md">{t.category}</span>
                  <div className="flex items-center gap-1.5 text-[9px] text-[#9ca3af] font-semibold">
                    <CalendarIcon size={10} />
                    {new Date(t.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Drawer>
    </div>
  );
};

export default Finances;
