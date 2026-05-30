import React, { useMemo, useEffect, useState } from 'react';
import {
  BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import {
  Activity, RefreshCw, Sparkles, TrendingUp, DollarSign,
  AlertTriangle, CheckCircle2, ShieldCheck, ArrowUpRight,
  Database, Zap, Star, Terminal, History, Box, User, AlertCircle,
  Wrench, Clock, MapPin, ChevronRight, Calendar, TrendingDown,
  PlayCircle, FileText, Award, Target, Trophy, Flame, ZapIcon,
  MoreHorizontal, Phone, Mail, Briefcase, Settings, LogOut, Users,
  ArrowRight, PlusCircle, Timer, ThumbsUp, MessageSquare, ShoppingBag,
  Percent, Eye, EyeOff, Layers, Building2, Warehouse, ListOrdered,
  CreditCard, Receipt, BarChart3, PieChart as PieChartIcon,
  Search, Filter, Download, Bell, Settings2,
  TrendingUp as TrendUpIcon, TrendingDown as TrendDownIcon
} from 'lucide-react';
import { useData, useUser, useNotifications } from '../App';
import { Ticket, ShowroomConfig, Technician, AuditLog, Part, CashRegisterEntry, CashRegisterSession } from '../types';
import Modal from '../components/Modal';
import SmallCard from '../components/SmallCard';
import ModuleTips from '../components/ModuleTips';
import { marked } from 'marked';
import { Link } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const _useData = (() => { try { return useData(); } catch { return { tickets: [], isLoading: false, refreshAll: () => { }, isSyncing: false, showrooms: [], syncMetrics: null, parts: [], customers: [], products: [], technicians: [], auditLogs: [], cashRegisterEntries: [], cashRegisterSessions: [] }; } })();
  const {
    tickets = [], isLoading = false, refreshAll = () => { }, isSyncing = false, showrooms = [],
    syncMetrics = null, parts = [], customers = [], products = [], technicians = [], auditLogs = [],
    cashRegisterEntries = [], cashRegisterSessions = []
  } = _useData;
  const { currentUser } = (() => { try { return useUser(); } catch { return { currentUser: null }; } })();
  const { addNotification } = (() => { try { return useNotifications(); } catch { return { addNotification: () => { } }; } })();

  const [isMounted, setIsMounted] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showAllLogs, setShowAllLogs] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'24h' | '7d' | '30d'>('30d');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<'revenue' | 'tickets' | 'efficiency'>('revenue');

  useEffect(() => { setIsMounted(true); }, []);

  // DEBUG: Log tickets received
  useEffect(() => {
  }, [tickets]);

  const isTechnician = currentUser?.role === 'TECHNICIAN';
  const isAgent = currentUser?.role === 'AGENT';
  const isManager = currentUser?.role === 'MANAGER' || currentUser?.role === 'ADMIN';

  const stats = useMemo(() => {
    let activeTickets = (tickets || []).filter((t: Ticket) => !t.isArchived);

    if (isTechnician) {
      activeTickets = activeTickets.filter((t: Ticket) => t.assignedTechnicianId === currentUser?.id);
    }

    // Filtrer selon la période sélectionnée
    const now = new Date();
    const periodFilter = (ticket: Ticket) => {
      if (!ticket?.createdAt) return false;
      const ticketDate = new Date(ticket.createdAt);
      if (isNaN(ticketDate.getTime())) return false;
      switch (selectedPeriod) {
        case '24h':
          return (now.getTime() - ticketDate.getTime()) <= 24 * 60 * 60 * 1000;
        case '7d':
          return (now.getTime() - ticketDate.getTime()) <= 7 * 24 * 60 * 60 * 1000;
        case '30d':
          return (now.getTime() - ticketDate.getTime()) <= 30 * 24 * 60 * 60 * 1000;
        default:
          return true;
      }
    };

    const periodTickets = activeTickets.filter(periodFilter);

    const totalRevenue = periodTickets.reduce((acc: number, t: Ticket) => acc + (t.financials?.grandTotal || 0), 0);
    const totalCosts = periodTickets.reduce((acc: number, t: Ticket) => {
      const f = t.financials;
      return acc + (f?.partsCost || 0) + (f?.laborCost || 0) + (f?.logisticsCost || 0);
    }, 0);
    const netMargin = totalRevenue - totalCosts;
    const marginRate = totalRevenue > 0 ? (netMargin / totalRevenue) * 100 : 0;
    const criticalTickets = periodTickets.filter((t: Ticket) => t.priority === 'Urgent' && t.status !== 'Fermé').length;
    const pendingTickets = periodTickets.filter((t: Ticket) => t.status === 'En cours' || t.status === 'En réparation').length;
    const completedToday = periodTickets.filter((t: Ticket) => {
      const today = new Date().toDateString();
      const statusClosed = t.status === 'Fermé' || t.status === 'Payé - Clôturé';
      const closedDate = t.lastUpdate ? new Date(t.lastUpdate).toDateString() : null;
      return statusClosed && closedDate === today;
    }).length;

    // Calculer les tendances
    const previousPeriodStart = new Date();
    switch (selectedPeriod) {
      case '24h':
        previousPeriodStart.setDate(previousPeriodStart.getDate() - 1);
        break;
      case '7d':
        previousPeriodStart.setDate(previousPeriodStart.getDate() - 7);
        break;
      case '30d':
        previousPeriodStart.setDate(previousPeriodStart.getDate() - 30);
        break;
    }

    const previousPeriodEnd = new Date();
    switch (selectedPeriod) {
      case '24h':
        previousPeriodEnd.setDate(previousPeriodEnd.getDate() - 1);
        break;
      case '7d':
        previousPeriodEnd.setDate(previousPeriodEnd.getDate() - 7);
        break;
      case '30d':
        previousPeriodEnd.setDate(previousPeriodEnd.getDate() - 30);
        break;
    }

    const previousTickets = activeTickets.filter((t: Ticket) => {
      const ticketDate = new Date(t.createdAt || '');
      return ticketDate >= previousPeriodStart && ticketDate < previousPeriodEnd;
    });

    const previousRevenue = previousTickets.reduce((acc: number, t: Ticket) => acc + (t.financials?.grandTotal || 0), 0);
    const revenueTrend = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;
    const previousCompleted = previousTickets.filter((t: Ticket) => {
      const statusClosed = t.status === 'Fermé' || t.status === 'Payé - Clôturé';
      return statusClosed;
    }).length;
    const completedTrend = previousCompleted > 0 ? ((completedToday - previousCompleted) / previousCompleted) * 100 : 0;

    // Weekly performance data
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d;
    });

    const weeklyData = last7Days.map(day => {
      const dayTickets = activeTickets.filter((t: Ticket) => {
        if (!t?.createdAt) return false;
        const tDate = new Date(t.createdAt);
        if (isNaN(tDate.getTime())) return false;
        return tDate.toDateString() === day.toDateString();
      });
      return {
        day: day.toLocaleDateString('fr-FR', { weekday: 'short' }),
        tickets: dayTickets.length,
        revenue: dayTickets.reduce((acc: number, t: Ticket) => acc + (t.financials?.grandTotal || 0), 0) / 1000,
        margin: dayTickets.reduce((acc: number, t: Ticket) => {
          const f = t.financials;
          const cost = (f?.partsCost || 0) + (f?.laborCost || 0) + (f?.logisticsCost || 0);
          return acc + ((f?.grandTotal || 0) - cost);
        }, 0) / 1000
      };
    });

    // Status distribution for pie chart
    const statusCounts = {
      'En cours': activeTickets.filter((t: Ticket) => t.status === 'En cours').length,
      'En réparation': activeTickets.filter((t: Ticket) => t.status === 'En réparation').length,
      'Devis envoyé': activeTickets.filter((t: Ticket) => t.status === 'Devis envoyé').length,
      'En attente de paiement': activeTickets.filter((t: Ticket) => t.status === 'En attente de paiement').length,
      'Terminé': activeTickets.filter((t: Ticket) => t.status === 'Terminé - Prêt à être payé').length,
      'Fermé': activeTickets.filter((t: Ticket) => t.status === 'Fermé').length
    };

    const statusData = Object.entries(statusCounts)
      .filter(([_, count]) => count > 0)
      .map(([name, value]) => ({ name, value }));

    const showroomData = (showrooms || []).map((s: ShowroomConfig) => {
      const srTickets = activeTickets.filter((t: Ticket) => t.showroom === s.id);
      const srRevenue = srTickets.reduce((acc: number, t: Ticket) => acc + (t.financials?.grandTotal || 0), 0);
      return {
        name: s.id,
        tickets: srTickets.length,
        revenue: srRevenue,
        active: srTickets.filter((t: Ticket) => t.status !== 'Fermé' && t.status !== 'Payé - Clôturé').length
      };
    }).filter((d: { tickets: number }) => d.tickets > 0 || !isTechnician);

    const techProfile = technicians.find((t: Technician) => t.id === currentUser?.id);

    // Today's assigned tickets
    const todayTickets = activeTickets
      .filter((t: Ticket) => t.status !== 'Fermé' && t.status !== 'Payé - Clôturé')
      .sort((a: Ticket, b: Ticket) => {
        const priorityOrder = { 'Urgent': 0, 'Haute': 1, 'Moyenne': 2, 'Basse': 3 };
        return (priorityOrder[a.priority as keyof typeof priorityOrder] || 2) - (priorityOrder[b.priority as keyof typeof priorityOrder] || 2);
      })
      .slice(0, 5);

    // Agent-specific stats
    const todayStr = new Date().toDateString();
    const newToday = activeTickets.filter((t: Ticket) => new Date(t.createdAt).toDateString() === todayStr).length;
    const waitingQuote = activeTickets.filter((t: Ticket) => t.status === 'En attente de devis').length;
    const waitingClient = activeTickets.filter((t: Ticket) => t.status === 'En attente client').length;
    const recentTickets = activeTickets
      .sort((a: Ticket, b: Ticket) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime())
      .slice(0, 6);

    // Manager-specific stats
    const totalParts = (parts || []).length;
    const criticalParts = (parts || []).filter((p: Part) => p.currentStock <= p.minStock && p.currentStock > 0).length;
    const outOfStockParts = (parts || []).filter((p: Part) => p.currentStock === 0).length;
    const totalCustomers = (customers || []).length;
    const totalProducts = (products || []).length;
    const activeTechnicians = (technicians || []).filter((t: Technician) => t.status === 'Disponible').length;
    const busyTechnicians = (technicians || []).filter((t: Technician) => t.status === 'En intervention').length;
    const slaBreached = activeTickets.filter((t: Ticket) => {
      if (t.status === 'Fermé' || t.status === 'Payé - Clôturé' || t.status === 'En attente client') return false;
      if (!t.createdAt) return false;
      const tCreated = new Date(t.createdAt);
      if (isNaN(tCreated.getTime())) return false;
      const ageHours = (new Date().getTime() - tCreated.getTime()) / (1000 * 60 * 60);
      return ageHours > 72 && t.priority === 'Urgent';
    }).length;
    const paidTickets = activeTickets.filter((t: Ticket) => t.financials?.isPaid);
    const paidRevenue = paidTickets.reduce((acc: number, t: Ticket) => acc + (t.financials?.grandTotal || 0), 0);
    const pendingRevenue = totalRevenue - paidRevenue;
    const collectionRate = totalRevenue > 0 ? (paidRevenue / totalRevenue) * 100 : 0;

    // Cash register stats pour la période
    const periodStart = new Date();
    switch (selectedPeriod) {
      case '24h': periodStart.setDate(periodStart.getDate() - 1); break;
      case '7d': periodStart.setDate(periodStart.getDate() - 7); break;
      case '30d': periodStart.setDate(periodStart.getDate() - 30); break;
    }
    const periodEntries = cashRegisterEntries.filter((e: CashRegisterEntry) =>
      new Date(e.timestamp) >= periodStart
    );
    const cashInflow = periodEntries.filter((e: CashRegisterEntry) => e.type === 'Acompte' || e.type === 'Solde').reduce((s: number, e: CashRegisterEntry) => s + e.amount, 0);
    const cashOutflow = periodEntries.filter((e: CashRegisterEntry) => e.type === 'Dépense' || e.type === 'Ajustement').reduce((s: number, e: CashRegisterEntry) => s + e.amount, 0);
    const cashNet = cashInflow - cashOutflow;

    // Session active aujourd'hui
    const todayKey = new Date().toDateString();
    const activeSessions = cashRegisterSessions.filter((s: CashRegisterSession) =>
      s.status === 'Ouverte' && new Date(s.openedAt).toDateString() === todayKey
    );
    const todayEntries = cashRegisterEntries.filter((e: CashRegisterEntry) =>
      new Date(e.timestamp).toDateString() === todayKey
    );
    const todayInflow = todayEntries.filter((e: CashRegisterEntry) => e.type === 'Acompte' || e.type === 'Solde').reduce((s: number, e: CashRegisterEntry) => s + e.amount, 0);
    const todayOutflow = todayEntries.filter((e: CashRegisterEntry) => e.type === 'Dépense' || e.type === 'Ajustement').reduce((s: number, e: CashRegisterEntry) => s + e.amount, 0);
    const todayNet = todayInflow - todayOutflow;

    return {
      totalRevenue, totalCosts, netMargin, marginRate,
      showroomData,
      criticalTickets,
      totalCount: periodTickets.length,
      pendingTickets,
      completedToday,
      rating: techProfile?.rating || 5.0,
      completed: techProfile?.completedTickets || 0,
      weeklyData,
      statusData,
      todayTickets,
      newToday,
      waitingQuote,
      waitingClient,
      recentTickets,
      totalParts, criticalParts, outOfStockParts,
      totalCustomers, totalProducts,
      activeTechnicians, busyTechnicians,
      slaBreached,
      paidRevenue, pendingRevenue, collectionRate,
      revenueTrend,
      completedTrend,
      efficiency: periodTickets.length > 0 ? (completedToday / periodTickets.length) * 100 : 0,
      avgTicketValue: periodTickets.length > 0 ? totalRevenue / periodTickets.length : 0,
      cashInflow, cashOutflow, cashNet,
      activeSessions: activeSessions.length,
      todayInflow, todayOutflow, todayNet
    };
  }, [tickets, showrooms, isTechnician, currentUser, technicians, parts, customers, products, selectedPeriod, cashRegisterEntries, cashRegisterSessions]);

  const getLogIcon = (action: string) => {
    switch (action) {
      case 'MAJ_TICKET': return <History className="text-blue-500" size={14} />;
      case 'MAJ_STOCK': return <Box className="text-[#3ecf8e]" size={14} />;
      case 'MOUV_STOCK': return <RefreshCw className="text-purple-500" size={14} />;
      case 'MAJ_CLIENT': return <User className="text-amber-500" size={14} />;
      default: return <Terminal className="text-[#686868]" size={14} />;
    }
  };

  const COLORS = ['#3ecf8e', '#3b82f6', '#f59e0b', '#f87171', '#1c1c1c', '#a78bfa', '#ec4899', '#14b8a6'];

  // Formater les montants en F CFA avec abréviation intelligente
  const formatCurrency = (amount: number): string => {
    if (amount === 0) return '0';
    const abs = Math.abs(amount);
    if (abs >= 1_000_000_000_000) return (amount / 1_000_000_000_000).toFixed(1).replace('.', ',') + ' Md F';
    if (abs >= 1_000_000_000) return (amount / 1_000_000_000).toFixed(1).replace('.', ',') + ' Md F';
    if (abs >= 1_000_000) return (amount / 1_000_000).toFixed(1).replace('.', ',') + ' M F';
    if (abs >= 1_000) return Math.round(amount).toLocaleString('fr-FR') + ' F';
    return Math.round(amount).toLocaleString('fr-FR') + ' F';
  };

  if (isLoading || !stats) return (
    <div className="h-[80vh] flex items-center justify-center">
      <div className="text-center">
        <RefreshCw className="text-[#3ecf8e] mx-auto mb-3 animate-spin" size={24} />
        <p className="text-[#686868] text-xs font-semibold">Chargement du tableau de bord...</p>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-5 animate-sb-entry pb-20">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#3ecf8e]/10 rounded-xl flex items-center justify-center text-[#3ecf8e]">
            <BarChart3 size={18} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
              {isTechnician ? 'Mon Pilotage' : isAgent ? 'Espace Agent' : isManager ? 'Pilotage Stratégique' : 'Tableau de bord'}
              </h1>
            <p className="text-xs text-[#686868] font-semibold uppercase tracking-wider mt-0.5">
              {isTechnician
                ? `Session ${currentUser?.name}`
                : isAgent
                  ? `Gestion des dossiers • Session ${currentUser?.name}`
                  : isManager
                    ? `${new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`
                    : 'Supervision du flux opérationnel'}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
          <div className="flex bg-white border border-[#e5e5e5] rounded-lg p-0.5 shadow-sm">
            {[
              { id: '24h', label: '24H' },
              { id: '7d', label: '7J' },
              { id: '30d', label: '30J' }
            ].map(period => (
              <button
                key={period.id}
                onClick={() => setSelectedPeriod(period.id as any)}
                className={`px-2.5 py-1 text-[9px] font-semibold rounded-md transition-all ${selectedPeriod === period.id
                  ? 'bg-[#3ecf8e] text-white shadow-sm'
                  : 'text-[#686868] hover:text-[#1c1c1c] hover:bg-[#f8f9fa]'
                  }`}
              >
                {period.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            {!isTechnician && !isAgent && (
              <span className={`hidden md:flex items-center gap-1 px-2 py-1 rounded-md text-[9px] font-semibold uppercase tracking-wider ${syncMetrics?.status === 'CONNECTED' ? 'bg-[#f0fdf4] text-[#16a34a] border border-[#dcfce7]' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                <span className={`w-1 h-1 rounded-full ${syncMetrics?.status === 'CONNECTED' ? 'bg-[#16a34a]' : 'bg-red-500'} animate-pulse`} />
                {syncMetrics?.status === 'CONNECTED' ? 'Synchro' : 'Off'}
              </span>
            )}
            <button onClick={() => setShowFilters(!showFilters)} className="btn-sb-outline h-7 px-2" title="Filtres">
              <Filter size={12} />
            </button>
            <button onClick={refreshAll} disabled={isSyncing} className="btn-sb-outline h-7 px-2">
              <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </header>

      {/* Module d'aide contextuel */}
      <ModuleTips
        moduleName="dashboard"
        storageKey="dashboard-tips"
        tips={[
          {
            id: "overview",
            title: "Vue d'ensemble",
            content: "Consultez vos indicateurs clés : revenus, tickets actifs, et performance de l'équipe."
          },
          {
            id: "temporal",
            title: "Analyse temporelle",
            content: "Utilisez le sélecteur de période pour analyser les tendances sur 24h, 7J ou 30J."
          },
          {
            id: "actions",
            title: "Actions rapides",
            content: "Accédez rapidement aux tickets, clients et ressources depuis le tableau de bord."
          }
        ]}
      />

      {isTechnician ? (
        <>
          {/* Profile Card */}
          <div className="bg-gradient-to-br from-[#1c1c1c] to-[#2d2d2d] rounded-lg p-3 text-white shadow-md">
            <div className="flex items-center gap-2">
              <div className="relative shrink-0">
                <div className="w-9 h-9 rounded-lg bg-[#3ecf8e] flex items-center justify-center text-sm font-semibold shadow-md shadow-[#3ecf8e]/20">
                  {currentUser?.name?.charAt(0).toUpperCase() || 'T'}
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#f59e0b] rounded-full flex items-center justify-center border-2 border-[#1c1c1c]">
                  <Trophy size={9} className="text-white" />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-sm font-semibold truncate">{currentUser?.name}</h2>
                  <span className="px-1.5 py-0.5 bg-[#3ecf8e]/20 text-[#3ecf8e] text-[9px] font-semibold uppercase rounded-full">
                    Niveau {Math.floor(stats.completed / 10) + 1}
                  </span>
                </div>
                <p className="text-[9px] text-white/60 mt-0.5">
                  {stats.completed} interventions
                </p>
                <div className="mt-1">
                  <div className="flex justify-between text-[9px] text-white/50 mb-0.5">
                    <span>Prochain niveau</span>
                    <span>{stats.completed % 10}/10</span>
                  </div>
                  <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[#3ecf8e] to-[#10b981] rounded-full transition-all duration-500" style={{ width: `${((stats.completed % 10) / 10) * 100}%` }} />
                  </div>
                </div>
              </div>

              <Link to="/tickets" className="hidden md:flex items-center gap-1 bg-white text-[#1c1c1c] px-2.5 py-1 rounded-lg font-semibold text-[10px] hover:bg-[#f8f9fa] transition-colors shadow-md">
                <PlayCircle size={12} />
                Travailler
              </Link>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-white/10">
              <div className="flex items-center gap-1.5">
                <div className={`w-5 h-5 rounded-md flex items-center justify-center ${stats.completedToday >= 1 ? 'bg-[#3ecf8e]/20 text-[#3ecf8e]' : 'bg-white/5 text-white/30'}`}>
                  <CheckCircle2 size={10} />
                </div>
                <div>
                  <p className="text-[9px] text-white/50">Obj. 1</p>
                  <p className="text-[9px] font-semibold">1 interv.</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <div className={`w-5 h-5 rounded-md flex items-center justify-center ${stats.completedToday >= 3 ? 'bg-[#3ecf8e]/20 text-[#3ecf8e]' : 'bg-white/5 text-white/30'}`}>
                  <Target size={10} />
                </div>
                <div>
                  <p className="text-[9px] text-white/50">Obj. 2</p>
                  <p className="text-[9px] font-semibold">3 interv.</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <div className={`w-5 h-5 rounded-md flex items-center justify-center ${stats.criticalTickets === 0 ? 'bg-[#3ecf8e]/20 text-[#3ecf8e]' : 'bg-white/5 text-white/30'}`}>
                  <Flame size={10} />
                </div>
                <div>
                  <p className="text-[9px] text-white/50">Bonus</p>
                  <p className="text-[9px] font-semibold">0 urgent</p>
                </div>
              </div>
            </div>
          </div>

          {stats.criticalTickets > 0 && (
            <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-lg p-3 text-white shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-white/20 rounded-md flex items-center justify-center">
                    <AlertTriangle size={14} />
                  </div>
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-wider opacity-80">Urgent</p>
                    <p className="text-xs font-semibold">{stats.criticalTickets} urgence{stats.criticalTickets > 1 ? 's' : ''}</p>
                  </div>
                </div>
                <Link to="/tickets" className="flex items-center gap-1 bg-white text-red-600 px-2 py-1 rounded-md font-semibold text-[9px] hover:bg-red-50 transition-colors">
                  Voir <ArrowRight size={10} />
                </Link>
              </div>
            </div>
          )}

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { label: 'En cours', value: stats.pendingTickets, icon: <Clock size={12} />, color: '#3ecf8e', subtext: 'À traiter' },
              { label: 'Urgences', value: stats.criticalTickets, icon: <AlertTriangle size={12} />, color: '#f87171', subtext: 'Prioritaires' },
              { label: "Aujourd'hui", value: stats.completedToday, icon: <CheckCircle2 size={12} />, color: '#1c1c1c', subtext: 'Terminés' },
              { label: 'Note', value: `${stats.rating}/5`, icon: <Star size={12} />, color: '#f59e0b', subtext: 'Qualité' }
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-lg p-3 border border-[#e5e5e5]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[8px] font-semibold text-[#686868] uppercase tracking-wider">{item.label}</p>
                    <h3 className="text-sm font-semibold text-[#1c1c1c] mt-0.5">{item.value}</h3>
                  </div>
                  <div className="p-1.5 bg-[#f8f9fa] rounded-md" style={{ color: item.color }}>
                    {item.icon}
                  </div>
                </div>
                <p className="text-[8px] text-[#9ca3af] mt-1">{item.subtext}</p>
              </div>
            ))}
          </div>

          {/* Today's Priority Tickets - Enhanced UX */}
          <div className="bg-white rounded-xl border border-[#e5e5e5] shadow-sm overflow-hidden">
            {/* Header with Filter Tabs */}
            <div className="p-3 border-b border-[#f0f0f0]">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-[#f0fdf4] rounded-md flex items-center justify-center">
                    <Calendar size={14} className="text-[#3ecf8e]" />
                  </div>
                  <div>
                    <h2 className="text-[12px] font-bold text-[#1c1c1c]">Mes Interventions</h2>
                    <p className="text-[9px] text-[#686868]">{stats.todayTickets.length} ticket{stats.todayTickets.length > 1 ? 's' : ''} en cours</p>
                  </div>
                </div>
                <Link
                  to="/tickets"
                  className="flex items-center gap-1 px-2.5 py-1 bg-[#f8f9fa] text-[#1c1c1c] rounded-lg text-[10px] font-semibold hover:bg-[#f0f0f0] transition-colors"
                >
                  Voir tout <ChevronRight size={12} />
                </Link>
              </div>

              {/* Quick Filter Pills */}
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                <button className="px-2.5 py-1 bg-[#1c1c1c] text-white rounded-full text-[9px] font-semibold whitespace-nowrap">
                  Tous ({stats.todayTickets.length})
                </button>
                <button className="px-2.5 py-1 bg-[#f8f9fa] text-[#686868] border border-[#e5e5e5] rounded-full text-[9px] font-semibold whitespace-nowrap">
                  En cours ({stats.todayTickets.filter((t: Ticket) => t.status === 'En réparation').length})
                </button>
                <button className="px-2.5 py-1 bg-red-50 text-red-600 border border-red-100 rounded-full text-[9px] font-semibold whitespace-nowrap">
                  Urgents ({stats.todayTickets.filter((t: Ticket) => t.priority === 'Urgent').length})
                </button>
              </div>
            </div>

            {stats.todayTickets.length === 0 ? (
              <div className="p-6 text-center">
                <div className="w-14 h-14 bg-[#f0fdf4] rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 size={24} className="text-[#3ecf8e]" />
                </div>
                <p className="text-sm font-bold text-[#1c1c1c]">Bravo ! 🎉</p>
                <p className="text-[11px] text-[#686868] mt-1">Toutes vos interventions sont terminées</p>
                <p className="text-[10px] text-[#9ca3af] mt-2">Prenez un moment de repos ou consultez l'historique</p>
                <Link
                  to="/historique"
                  className="inline-flex items-center gap-2 mt-3 px-3 py-1.5 bg-[#f8f9fa] text-[#1c1c1c] rounded-lg text-[10px] font-semibold hover:bg-[#f0f0f0] transition-colors"
                >
                  <History size={12} />
                  Voir l'historique
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-[#f5f5f5]">
                {stats.todayTickets.map((t: Ticket, index: number) => (
                  <Link
                    to={`/tickets?id=${t.id}`}
                    key={t.id}
                    className="flex items-center gap-2 p-3 hover:bg-[#fcfcfc] transition-all active:scale-[0.99] group"
                  >
                    {/* Priority & Index */}
                    <div className="relative shrink-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-semibold text-[10px] ${t.priority === 'Urgent' ? 'bg-red-100 text-red-600' :
                        t.priority === 'Haute' ? 'bg-amber-100 text-amber-600' :
                          'bg-[#f0fdf4] text-[#3ecf8e]'
                        }`}>
                        #{index + 1}
                      </div>
                      {t.priority === 'Urgent' && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                          <AlertTriangle size={8} className="text-white" />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[12px] font-semibold text-[#1c1c1c] truncate group-hover:text-[#3ecf8e] transition-colors">
                          {t.customerName}
                        </p>
                      </div>
                      <p className="text-[10px] text-[#686868] truncate">{t.productName || 'Matériel non spécifié'}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="flex items-center gap-1 text-[9px] text-[#9ca3af]">
                          <MapPin size={9} />
                          {t.location || t.showroom || 'Non spécifié'}
                        </span>
                        {t.customerPhone && (
                          <span className="flex items-center gap-1 text-[9px] text-[#3ecf8e]">
                            <Phone size={9} />
                            Disponible
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Side */}
                    <div className="flex flex-col items-end gap-1.5">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase ${t.status === 'En réparation' ? 'bg-blue-100 text-blue-600' :
                        t.status === 'En cours' ? 'bg-[#f0fdf4] text-[#16a34a]' :
                          t.status === 'Devis envoyé' ? 'bg-indigo-100 text-indigo-600' :
                            t.status === 'En attente de paiement' ? 'bg-amber-100 text-amber-600' :
                              'bg-[#f8f9fa] text-[#686868]'
                        }`}>
                        {t.status === 'En réparation' ? 'En cours' : t.status === 'En cours' ? 'À démarrer' : t.status}
                      </span>
                      <ChevronRight size={14} className="text-[#d1d5db] group-hover:text-[#3ecf8e] transition-colors" />
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* Footer CTA */}
            {stats.todayTickets.length > 0 && (
              <div className="p-3 bg-[#f8f9fa] border-t border-[#f0f0f0]">
                <Link
                  to="/tickets"
                  className="flex items-center justify-center gap-2 w-full py-2 bg-[#1c1c1c] text-white rounded-lg text-[11px] font-semibold hover:bg-[#2d2d2d] transition-colors active:scale-[0.98]"
                >
                  <PlayCircle size={14} />
                  Continuer le travail
                </Link>
              </div>
            )}
          </div>

          {/* Quick Actions - Mobile First */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Link to="/tickets" className="flex items-center gap-2 p-3 bg-[#1c1c1c] text-white rounded-lg shadow-sm active:scale-[0.98] transition-transform">
              <PlayCircle size={16} />
              <span className="text-[10px] font-semibold">Commencer</span>
            </Link>
            <Link to="/historique" className="flex items-center gap-2 p-3 bg-[#f0fdf4] text-[#1c1c1c] border border-[#dcfce7] rounded-lg shadow-sm active:scale-[0.98] transition-transform">
              <FileText size={16} className="text-[#3ecf8e]" />
              <span className="text-[10px] font-semibold">Historique</span>
            </Link>
            <Link to="/parts" className="flex items-center gap-2 p-3 bg-white border border-[#e5e5e5] rounded-lg shadow-sm active:scale-[0.98] transition-transform">
              <Box size={16} className="text-[#686868]" />
              <span className="text-[10px] font-semibold">Stock</span>
            </Link>
            <div className="flex items-center gap-2 p-3 bg-white border border-[#e5e5e5] rounded-lg shadow-sm">
              <Award size={16} className="text-[#f59e0b]" />
              <div>
                <span className="text-[10px] font-semibold">{stats.completed}</span>
                <p className="text-[9px] text-[#686868]">Total réalisé</p>
              </div>
            </div>
          </div>

          {/* Floating Action Button - Mobile Only */}
          <Link
            to="/tickets"
            className="md:hidden fixed bottom-4 right-4 w-12 h-12 bg-[#1c1c1c] text-white rounded-full shadow-md flex items-center justify-center z-50 active:scale-90 transition-transform"
          >
            <PlayCircle size={22} />
          </Link>

          {/* Performance Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Weekly Trend */}
            <div className="bg-white rounded-lg p-3 border border-[#e5e5e5] shadow-sm">
              <h3 className="text-[10px] font-semibold text-[#1c1c1c] uppercase tracking-widest mb-3 flex items-center gap-2">
                <TrendingUp size={12} className="text-[#3ecf8e]" />
                Tendance 7 Jours
              </h3>
              <div className="h-[160px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="day" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                      formatter={(value: number) => [`${value} tickets`, 'Volume']}
                    />
                    <Bar dataKey="tickets" fill="#3ecf8e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Status Distribution */}
            <div className="bg-white rounded-lg p-3 border border-[#e5e5e5] shadow-sm">
              <h3 className="text-[10px] font-semibold text-[#1c1c1c] uppercase tracking-widest mb-3 flex items-center gap-2">
                <Target size={12} className="text-[#3ecf8e]" />
                Répartition Statuts
              </h3>
              {stats.statusData.length > 0 ? (
                <div className="h-[160px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.statusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {stats.statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={['#3ecf8e', '#3b82f6', '#f59e0b', '#1c1c1c'][index % 4]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[160px] flex items-center justify-center text-[#9ca3af]">
                  <p className="text-[10px]">Aucune donnée disponible</p>
                </div>
              )}
            </div>
          </div>
        </>
      ) : isAgent ? (
        <>
          {/* Agent Header Card */}
          <div className="bg-gradient-to-br from-[#3b82f6] to-[#2563eb] rounded-lg p-3 md:p-4 text-white shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-white/20 flex items-center justify-center text-lg font-semibold backdrop-blur-sm border border-white/30">
                  {currentUser?.name?.charAt(0).toUpperCase() || 'A'}
                </div>
                <div>
                  <h2 className="text-sm md:text-base font-bold">{currentUser?.name}</h2>
                  <p className="text-[10px] md:text-[11px] text-white/80">Agent SAV • {currentUser?.showroom || 'Showroom principal'}</p>
                </div>
              </div>
              <Link
                to="/tickets"
                className="hidden md:flex items-center gap-1.5 bg-white text-[#2563eb] px-3 py-2 rounded-lg font-semibold text-[10px] hover:bg-[#f8f9fa] transition-colors shadow-md"
              >
                <PlusCircle size={14} />
                Nouveau Ticket
              </Link>
            </div>
          </div>

          {/* Agent KPI Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
            {[
              { label: "Aujourd'hui", value: stats.newToday, icon: <FileText size={14} />, color: '#3ecf8e', subtext: 'Créés' },
              { label: 'Attente Devis', value: stats.waitingQuote, icon: <Clock size={14} />, color: '#f59e0b', subtext: 'À coter' },
              { label: 'Attente Client', value: stats.waitingClient, icon: <User size={14} />, color: '#3b82f6', subtext: 'En pause' },
              { label: 'Urgences', value: stats.criticalTickets, icon: <AlertTriangle size={14} />, color: '#f87171', subtext: 'SLA Alert' }
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-lg p-2 md:p-3 border border-[#e5e5e5] shadow-sm card-interactive hover:border-[#3b82f6]/30 transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[9px] font-semibold text-[#686868] uppercase tracking-widest">{item.label}</p>
                    <h3 className="text-base md:text-lg font-semibold text-[#1c1c1c] mt-0.5">{item.value}</h3>
                  </div>
                  <div className="p-1.5 bg-[#f8f9fa] rounded-md" style={{ color: item.color }}>
                    {item.icon}
                  </div>
                </div>
                <p className="text-[9px] text-[#9ca3af] mt-1">{item.subtext}</p>
              </div>
            ))}
          </div>

          {/* Recent Tickets */}
          <div className="bg-white rounded-xl border border-[#e5e5e5] shadow-sm overflow-hidden">
            <div className="p-3 border-b border-[#f0f0f0]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-[#f0fdf4] rounded-md flex items-center justify-center">
                    <Activity size={14} className="text-[#3ecf8e]" />
                  </div>
                  <div>
                    <h2 className="text-[12px] font-bold text-[#1c1c1c]">Dossiers Récents</h2>
                    <p className="text-[9px] text-[#686868]">{stats.recentTickets.length} tickets actifs</p>
                  </div>
                </div>
                <Link
                  to="/tickets"
                  className="flex items-center gap-1 px-2.5 py-1 bg-[#f8f9fa] text-[#1c1c1c] rounded-lg text-[10px] font-semibold hover:bg-[#f0f0f0] transition-colors"
                >
                  Voir tout <ChevronRight size={12} />
                </Link>
              </div>
            </div>

            {stats.recentTickets.length === 0 ? (
              <div className="p-6 text-center">
                <div className="w-14 h-14 bg-[#f0fdf4] rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 size={24} className="text-[#3ecf8e]" />
                </div>
                <p className="text-sm font-bold text-[#1c1c1c]">Aucun dossier actif</p>
                <p className="text-[11px] text-[#686868] mt-1">Créez un nouveau ticket pour commencer</p>
                <Link
                  to="/tickets"
                  className="inline-flex items-center gap-2 mt-3 px-3 py-1.5 bg-[#1c1c1c] text-white rounded-lg text-[10px] font-semibold hover:bg-[#2d2d2d] transition-colors"
                >
                  <PlusCircle size={12} />
                  Créer un ticket
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-[#f5f5f5]">
                {stats.recentTickets.map((t: Ticket) => (
                  <Link
                    to={`/tickets?id=${t.id}`}
                    key={t.id}
                    className="flex items-center gap-2 p-3 hover:bg-[#fcfcfc] transition-all active:scale-[0.99] group"
                  >
                    <div className="relative shrink-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-semibold text-[10px] ${t.priority === 'Urgent' ? 'bg-red-100 text-red-600' :
                        t.priority === 'Haute' ? 'bg-amber-100 text-amber-600' :
                          'bg-[#f0fdf4] text-[#3ecf8e]'
                        }`}>
                        {t.id.slice(-3)}
                      </div>
                      {t.priority === 'Urgent' && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                          <AlertTriangle size={8} className="text-white" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[12px] font-semibold text-[#1c1c1c] truncate group-hover:text-[#3b82f6] transition-colors">
                          {t.customerName}
                        </p>
                      </div>
                      <p className="text-[10px] text-[#686868] truncate">{t.productName || 'Matériel non spécifié'}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="flex items-center gap-1 text-[9px] text-[#9ca3af]">
                          <MapPin size={9} />
                          {t.showroom || 'Non spécifié'}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase ${t.status === 'Nouveau' ? 'bg-blue-100 text-blue-600' :
                          t.status === 'En attente de devis' ? 'bg-amber-100 text-amber-600' :
                            t.status === 'Devis envoyé' ? 'bg-indigo-100 text-indigo-600' :
                          t.status === 'En attente de paiement' ? 'bg-amber-100 text-amber-600' :
                                t.status === 'En attente client' ? 'bg-purple-100 text-purple-600' :
                                  t.status === 'En réparation' ? 'bg-[#f0fdf4] text-[#16a34a]' :
                                    'bg-[#f8f9fa] text-[#686868]'
                          }`}>
                          {t.status}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5">
                      <span className="text-[9px] text-[#9ca3af] font-semibold">
                        {new Date(t.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                      </span>
                      <ChevronRight size={14} className="text-[#d1d5db] group-hover:text-[#3b82f6] transition-colors" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Link to="/tickets" className="flex items-center gap-2 p-3 bg-[#1c1c1c] text-white rounded-lg shadow-sm active:scale-[0.98] transition-transform">
              <PlusCircle size={16} />
              <span className="text-[10px] font-semibold">Créer Ticket</span>
            </Link>
            <Link to="/tickets" className="flex items-center gap-2 p-3 bg-[#f0fdf4] text-[#1c1c1c] border border-[#dcfce7] rounded-lg shadow-sm active:scale-[0.98] transition-transform">
              <FileText size={16} className="text-[#3ecf8e]" />
              <span className="text-[10px] font-semibold">Tickets</span>
            </Link>
            <Link to="/customers" className="flex items-center gap-2 p-3 bg-white border border-[#e5e5e5] rounded-lg shadow-sm active:scale-[0.98] transition-transform">
              <User size={16} className="text-[#3b82f6]" />
              <span className="text-[10px] font-semibold">Clients</span>
            </Link>
            <Link to="/parts" className="flex items-center gap-2 p-3 bg-white border border-[#e5e5e5] rounded-lg shadow-sm active:scale-[0.98] transition-transform">
              <Box size={16} className="text-[#686868]" />
              <span className="text-[10px] font-semibold">Stock</span>
            </Link>
          </div>

          {/* Technicians Dispatch */}
          <div className="bg-white rounded-lg p-3 border border-[#e5e5e5] shadow-sm">
            <h3 className="text-[10px] font-semibold text-[#1c1c1c] uppercase tracking-widest mb-3 flex items-center gap-2">
              <Users size={12} className="text-[#3b82f6]" />
              Dispatching Techniciens
            </h3>
            <div className="space-y-2">
              {(technicians || []).map((tech: Technician) => {
                const techActiveCount = (tickets || []).filter((t: Ticket) =>
                  t.assignedTechnicianId === tech.id && !t.isArchived && t.status !== 'Fermé' && t.status !== 'Payé - Clôturé'
                ).length;
                return (
                  <div key={tech.id} className="flex items-center gap-2 p-2 rounded-lg border border-[#f0f0f0] hover:border-[#3b82f6]/30 transition-all bg-[#fcfcfc]">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#f8f9fa] to-[#f0f0f0] flex items-center justify-center text-[10px] font-semibold border border-[#e5e5e5] text-[#1c1c1c]">
                      {tech.name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold text-[#1c1c1c] truncate">{tech.name}</p>
                      <p className="text-[9px] text-[#686868] truncate">{tech.specialty?.join(', ') || 'Généraliste'}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase ${tech.status === 'Disponible' ? 'bg-green-100 text-green-700' :
                        tech.status === 'En intervention' ? 'bg-amber-100 text-amber-700' :
                          'bg-gray-100 text-gray-500'
                        }`}>
                        {tech.status}
                      </span>
                      <span className="text-[9px] font-mono font-semibold text-[#686868] bg-[#f8f9fa] px-2 py-0.5 rounded border border-[#e5e5e5]">
                        {techActiveCount} actif{techActiveCount > 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                );
              })}
              {(technicians || []).length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-[#686868] opacity-40">
                  <Users size={24} className="mb-2" />
                  <p className="text-[10px] font-semibold uppercase tracking-widest">Aucun technicien enregistré</p>
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        /* ======= MANAGER / ADMIN VIEW — ENRICHED ======= */
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <SmallCard
              title="Chiffre d'Affaires"
              value={`${(stats.totalRevenue || 0).toLocaleString('fr-FR')} F`}
              sub={`${stats.totalCount} tickets actifs`}
              icon={<DollarSign size={14} />}
              color="#3ecf8e"
              trend={stats.revenueTrend ? { value: stats.revenueTrend, isPositive: stats.revenueTrend >= 0 } : undefined}
              tip="Revenu total généré sur la période sélectionnée"
            />
            <SmallCard
              title="Marge Nette"
              value={`${(stats.netMargin || 0).toLocaleString('fr-FR')} F`}
              sub={`Taux: ${stats.marginRate.toFixed(1)}%`}
              icon={<TrendingUp size={14} />}
              color="#3b82f6"
              tip="Bénéfice net après déduction des coûts"
            />
            <SmallCard
              title="Encaisse Période"
              value={`${(stats.cashNet || 0).toLocaleString('fr-FR')} F`}
              sub={`${stats.activeSessions} session${stats.activeSessions > 1 ? 's' : ''} active${stats.activeSessions > 1 ? 's' : ''}`}
              icon={<CreditCard size={14} />}
              color="#6366f1"
              tip="Solde net des entrées/sorties de caisse sur la période"
            />
            <SmallCard
              title="Tickets Actifs"
              value={stats.totalCount}
              sub={`${stats.criticalTickets} urgence${stats.criticalTickets > 1 ? 's' : ''} • ${stats.pendingTickets} en traitement`}
              icon={<Activity size={14} />}
              color="#f59e0b"
              tip="Nombre total de tickets non archivés"
            />
          </div>

          {/* Synthèse Caisse + Métriques */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Alertes critiques */}
            <div className="space-y-3">
              {stats.criticalTickets > 0 && (
                <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-lg p-3 text-white shadow-md animate-pulse">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-white/20 rounded-md flex items-center justify-center">
                        <AlertTriangle size={16} />
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider opacity-80">Attention requise</p>
                        <p className="text-base font-semibold">{stats.criticalTickets} urgence{stats.criticalTickets > 1 ? 's' : ''} en attente</p>
                      </div>
                    </div>
                    <Link
                      to="/tickets"
                      className="flex items-center gap-1 bg-white text-red-600 px-2.5 py-1.5 rounded-md font-semibold text-[10px] hover:bg-red-50 transition-colors"
                    >
                      Voir <ArrowRight size={12} />
                    </Link>
                  </div>
                </div>
              )}
              {/* Caisse du jour */}
              <div className="bg-white border border-[#e5e5e5] rounded-lg p-4 shadow-sm">
                <h3 className="text-[11px] font-semibold text-[#1c1c1c] uppercase tracking-widest mb-3 flex items-center gap-2">
                  <CreditCard size={14} className="text-[#6366f1]" /> Caisse du Jour
                </h3>
                <div className="space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-[#686868] font-semibold">Entrées</span>
                    <span className="text-[11px] font-semibold text-green-600">{(stats.todayInflow || 0).toLocaleString('fr-FR')} F</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-[#686868] font-semibold">Sorties</span>
                    <span className="text-[11px] font-semibold text-red-600">{(stats.todayOutflow || 0).toLocaleString('fr-FR')} F</span>
                  </div>
                  <div className="border-t border-[#e5e5e5] pt-2 flex justify-between items-center">
                    <span className="text-[10px] font-bold text-[#1c1c1c]">Net du jour</span>
                    <span className={`text-[13px] font-bold ${(stats.todayNet || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {(stats.todayNet || 0) >= 0 ? '+' : ''}{(stats.todayNet || 0).toLocaleString('fr-FR')} F
                    </span>
                  </div>
                </div>
              </div>
              {/* Actions rapides */}
              <div className="grid grid-cols-2 gap-2">
                <Link to="/tickets" className="flex items-center gap-2 p-3 bg-[#1c1c1c] text-white rounded-lg shadow-sm active:scale-[0.98] transition-transform">
                  <PlusCircle size={16} />
                  <span className="text-[10px] font-semibold">Nouveau Ticket</span>
                </Link>
                <Link to="/caisse" className="flex items-center gap-2 p-3 bg-[#f0fdf4] text-[#1c1c1c] border border-[#dcfce7] rounded-lg shadow-sm active:scale-[0.98] transition-transform">
                  <CreditCard size={16} className="text-[#3ecf8e]" />
                  <span className="text-[10px] font-semibold">Caisse</span>
                </Link>
                <Link to="/customers" className="flex items-center gap-2 p-3 bg-white border border-[#e5e5e5] rounded-lg shadow-sm active:scale-[0.98] transition-transform">
                  <User size={16} className="text-[#3b82f6]" />
                  <span className="text-[10px] font-semibold">Clients</span>
                </Link>
                <Link to="/finances" className="flex items-center gap-2 p-3 bg-white border border-[#e5e5e5] rounded-lg shadow-sm active:scale-[0.98] transition-transform">
                  <BarChart3 size={16} className="text-[#8b5cf6]" />
                  <span className="text-[10px] font-semibold">Finances</span>
                </Link>
              </div>
            </div>

            {/* Métriques clés */}
            <div className="lg:col-span-2 bg-white border border-[#e5e5e5] rounded-lg p-4 shadow-sm">
              <h3 className="text-[11px] font-semibold text-[#1c1c1c] uppercase tracking-widest mb-4 flex items-center gap-2">
                <BarChart3 size={14} className="text-[#6366f1]" /> Métriques Clés
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-[#f8f9fa] rounded-lg p-3">
                  <p className="text-[9px] text-[#686868] font-semibold uppercase tracking-wider">Panier moyen</p>
                  <p className="text-[15px] font-bold text-[#1c1c1c] mt-1">{(stats.avgTicketValue || 0).toLocaleString('fr-FR')} F</p>
                </div>
                <div className="bg-[#f8f9fa] rounded-lg p-3">
                  <p className="text-[9px] text-[#686868] font-semibold uppercase tracking-wider">Taux collecte</p>
                  <p className="text-[15px] font-bold text-[#3ecf8e] mt-1">{stats.collectionRate.toFixed(1)}%</p>
                </div>
                <div className="bg-[#f8f9fa] rounded-lg p-3">
                  <p className="text-[9px] text-[#686868] font-semibold uppercase tracking-wider">Techniciens</p>
                  <p className="text-[15px] font-bold text-[#1c1c1c] mt-1">{stats.activeTechnicians}/{technicians?.length || 0} <span className="text-[10px] font-semibold text-[#686868]">actifs</span></p>
                </div>
                <div className="bg-[#f8f9fa] rounded-lg p-3">
                  <p className="text-[9px] text-[#686868] font-semibold uppercase tracking-wider">SLA dépassé</p>
                  <p className={`text-[15px] font-bold mt-1 ${stats.slaBreached > 0 ? 'text-red-500' : 'text-[#3ecf8e]'}`}>{stats.slaBreached}</p>
                </div>
                <div className="bg-[#f8f9fa] rounded-lg p-3">
                  <p className="text-[9px] text-[#686868] font-semibold uppercase tracking-wider">Clients</p>
                  <p className="text-[15px] font-bold text-[#1c1c1c] mt-1">{stats.totalCustomers}</p>
                </div>
                <div className="bg-[#f8f9fa] rounded-lg p-3">
                  <p className="text-[9px] text-[#686868] font-semibold uppercase tracking-wider">Produits</p>
                  <p className="text-[15px] font-bold text-[#1c1c1c] mt-1">{stats.totalProducts}</p>
                </div>
                <div className="bg-[#f8f9fa] rounded-lg p-3">
                  <p className="text-[9px] text-[#686868] font-semibold uppercase tracking-wider">Stock critique</p>
                  <p className="text-[15px] font-bold text-amber-600 mt-1">{stats.criticalParts} pièces</p>
                </div>
                <div className="bg-[#f8f9fa] rounded-lg p-3">
                  <p className="text-[9px] text-[#686868] font-semibold uppercase tracking-wider">Rupture stock</p>
                  <p className="text-[15px] font-bold text-red-500 mt-1">{stats.outOfStockParts}</p>
                </div>
              </div>
              {/* Taux d'efficacité en barre */}
              <div className="mt-4">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[9px] text-[#686868] font-semibold uppercase">Efficacité</span>
                  <span className="text-[10px] font-bold">{stats.efficiency.toFixed(1)}%</span>
                </div>
                <div className="h-2 bg-[#e5e5e5] rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-[#3ecf8e] to-[#3b82f6] rounded-full transition-all duration-500" style={{ width: `${Math.min(stats.efficiency, 100)}%` }} />
                </div>
                <p className="text-[9px] text-[#686868] mt-1">{stats.completedToday} complété{stats.completedToday > 1 ? 's' : ''} aujourd'hui</p>
              </div>
            </div>
          </div>

          {/* Graphiques améliorés */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Graphique d'évolution */}
            <div className="sb-card p-4 border-3 border-[#e5e5e5] shadow-sm bg-white card-interactive">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-[11px] font-semibold text-[#1c1c1c] uppercase tracking-widest flex items-center gap-2">
                    <Activity size={14} className="text-[#3ecf8e]" /> Évolution des Revenus
                  </h2>
                  <p className="text-[10px] text-[#686868] mt-1 font-semibold">Analyse temporelle de la performance</p>
                </div>
                <div className="flex items-center gap-2">
                  {stats.revenueTrend > 0 ? (
                    <div className="flex items-center gap-1 px-2 py-1 bg-[#f0fdf4] text-[#16a34a] rounded-full border border-[#dcfce7]">
                      <ArrowUpRight size={10} />
                      <span className="text-[9px] font-semibold">+{stats.revenueTrend.toFixed(1)}%</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 px-2 py-1 bg-[#fef2f2] text-[#dc2626] rounded-full border border-[#fecaca]">
                      <TrendingDown size={10} />
                      <span className="text-[9px] font-semibold">{stats.revenueTrend.toFixed(1)}%</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.weeklyData}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3ecf8e" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3ecf8e" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis
                      dataKey="day"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#686868', fontSize: 10, fontWeight: '500' }}
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#686868', fontSize: 10 }}
                      tickFormatter={(v) => `${(v * 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: '10px',
                        border: '1px solid #e5e5e5',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                        fontSize: '10px',
                        fontWeight: '500'
                      }}
                      formatter={(value: any) => [(Number(value) * 1000 || 0).toLocaleString('fr-FR') + ' F', 'Revenu']}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#3ecf8e"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorRev)"
                      dot={{ fill: '#3ecf8e', strokeWidth: 2, r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Graphique circulaire */}
            <div className="sb-card p-4 border-3 border-[#e5e5e5] shadow-sm bg-white card-interactive">
              <div className="mb-4">
                <h2 className="text-[11px] font-semibold text-[#1c1c1c] uppercase tracking-widest flex items-center gap-2">
                  <PieChartIcon size={14} className="text-[#6366f1]" /> Répartition par Statut
                </h2>
                <p className="text-[10px] text-[#686868] mt-1 font-semibold">Distribution des tickets par état</p>
              </div>
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {stats.statusData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: any) => [Number(value) || 0, 'Tickets']}
                      contentStyle={{
                        borderRadius: '10px',
                        border: '1px solid #e5e5e5',
                        fontSize: '10px',
                        fontWeight: '500'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 space-y-1">
                {stats.statusData.slice(0, 4).map((c: any, i: number) => (
                  <div key={i} className="flex justify-between items-center py-1.5 border-b border-[#f8f9fa] last:border-none">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full border-2 border-white shadow-sm" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="text-[10px] font-semibold text-[#4b5563]">{c.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-semibold text-[#1c1c1c]">{c.value}</span>
                      <span className="text-[9px] text-[#686868] ml-2">{stats.totalCount > 0 ? ((c.value / stats.totalCount) * 100).toFixed(0) : 0}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sections additionnelles pour le manager */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Tickets récents */}
            <div className="sb-card border-3 border-[#e5e5e5] shadow-sm bg-white overflow-hidden">
              <div className="p-4 border-b border-[#e5e5e5] bg-[#f8f9fa]">
                <h2 className="text-[11px] font-semibold text-[#1c1c1c] uppercase tracking-widest flex items-center gap-2">
                  <FileText size={14} className="text-[#3ecf8e]" /> Tickets Récents
                </h2>
                <p className="text-[10px] text-[#686868] mt-1 font-semibold">Derniers tickets créés ou modifiés</p>
              </div>
              <div className="divide-y divide-[#f5f5f5] max-h-96 overflow-y-auto">
                {stats.recentTickets.slice(0, 5).map((t: Ticket) => (
                  <Link
                    to={`/tickets?id=${t.id}`}
                    key={t.id}
                    className="flex items-center gap-2 p-3 hover:bg-[#fcfcfc] transition-all active:scale-[0.99] group"
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-semibold text-[10px] ${t.priority === 'Urgent' ? 'bg-red-100 text-red-600' :
                      t.priority === 'Haute' ? 'bg-amber-100 text-amber-600' :
                        'bg-[#f0fdf4] text-[#3ecf8e]'
                      }`}>
                      {t.id.slice(-3)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-[#1c1c1c] truncate group-hover:text-[#3b82f6] transition-colors">
                        {t.customerName}
                      </p>
                      <p className="text-[10px] text-[#686868] truncate">{t.productName || 'Matériel non spécifié'}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase ${t.status === 'Nouveau' ? 'bg-blue-100 text-blue-600' :
                          t.status === 'En attente de devis' ? 'bg-amber-100 text-amber-600' :
                            t.status === 'En réparation' ? 'bg-[#f0fdf4] text-[#16a34a]' :
                              'bg-[#f8f9fa] text-[#686868]'
                          }`}>
                          {t.status}
                        </span>
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-[#d1d5db] group-hover:text-[#3b82f6] transition-colors" />
                  </Link>
                ))}
              </div>
            </div>

            {/* Dispatching techniciens */}
            <div className="sb-card border-3 border-[#e5e5e5] shadow-sm bg-white">
              <div className="p-4 border-b border-[#e5e5e5] bg-[#f8f9fa]">
                <h2 className="text-[11px] font-semibold text-[#1c1c1c] uppercase tracking-widest flex items-center gap-2">
                  <Users size={14} className="text-[#6366f1]" /> Équipe Technique
                </h2>
                <p className="text-[10px] text-[#686868] mt-1 font-semibold">Statut et charge des techniciens</p>
              </div>
              <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
                {(technicians || []).slice(0, 6).map((tech: Technician) => {
                  const techActiveCount = (tickets || []).filter((t: Ticket) =>
                    t.assignedTechnicianId === tech.id && !t.isArchived && t.status !== 'Fermé' && t.status !== 'Payé - Clôturé'
                  ).length;
                  return (
                    <div key={tech.id} className="flex items-center gap-2 p-2 rounded-lg border border-[#f0f0f0] hover:border-[#3b82f6]/30 transition-all bg-[#fcfcfc]">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#f8f9fa] to-[#f0f0f0] flex items-center justify-center text-[10px] font-semibold border border-[#e5e5e5] text-[#1c1c1c]">
                        {tech.name?.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-semibold text-[#1c1c1c] truncate">{tech.name}</p>
                        <p className="text-[9px] text-[#686868] truncate">{tech.specialty?.join(', ') || 'Généraliste'}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase ${tech.status === 'Disponible' ? 'bg-green-100 text-green-700' :
                          tech.status === 'En intervention' ? 'bg-amber-100 text-amber-700' :
                            'bg-gray-100 text-gray-500'
                          }`}>
                          {tech.status}
                        </span>
                        <span className="text-[9px] font-mono font-semibold text-[#686868] bg-[#f8f9fa] px-2 py-0.5 rounded border border-[#e5e5e5]">
                          {techActiveCount} actif{techActiveCount > 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

        </>
      )}
    </div>
  );
};

export default Dashboard;