
import React, { useState, useEffect, useMemo } from 'react';
import {
  Users, Star, Activity, UserPlus, RefreshCw, Edit3, Trash2,
  BadgeCheck, Trophy, ChevronRight, Mail, Phone, MapPin, Zap, Plus, Users2, X, Lock,
  // Enhanced features
  Calendar, Clock, TrendingUp, BarChart3, CalendarDays, Timer, Award,
  Package, User as UserIcon, Mail as MailIcon, AlertTriangle,
  // Manager view
  LayoutDashboard, Gauge, CircleDollarSign, BarChart2, Target, Eye
} from 'lucide-react';
import {
  BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { useNotifications, useData, useUser } from '../App';
import { Technician, Team, TechnicianSchedule, TechnicianMetrics, Ticket, TicketCategory } from '../types';
import Modal from '../components/Modal';
import Drawer from '../components/Drawer';
import { SkeletonHeader, SkeletonCard } from '../components/Skeleton';
import { SmallCard } from '../components/SmallCard';
import { ModuleTips } from '../components/ModuleTips';
import ConfirmModal from '../components/ConfirmModal';

const Technicians: React.FC = () => {
  const _u = (() => { try { return useData(); } catch { return { technicians: [], users: [], saveUser: () => { }, isLoading: false, refreshAll: () => { }, isSyncing: false, saveTechnician: () => { }, deleteTechnician: () => { }, teams: [], saveTeam: () => { }, deleteTeam: () => { }, tickets: [], techSchedules: [], techMetrics: [], saveTechSchedule: () => { }, deleteTechSchedule: () => { } }; } })();
  const {
    technicians: rawTechnicians = _u.technicians, users: allUsers = _u.users, isLoading = _u.isLoading, refreshAll = _u.refreshAll, isSyncing = _u.isSyncing,
    saveTechnician = _u.saveTechnician, deleteTechnician = _u.deleteTechnician, saveUser = _u.saveUser,
    teams: apiTeams = _u.teams, saveTeam = _u.saveTeam, deleteTeam = _u.deleteTeam, tickets = _u.tickets,
    techSchedules = _u.techSchedules, techMetrics = _u.techMetrics, saveTechSchedule = _u.saveTechSchedule, deleteTechSchedule = _u.deleteTechSchedule,
  } = _u;
  const { currentUser } = (() => { try { return useUser(); } catch { return { currentUser: null }; } })();
  const { addNotification, showModalNotification } = (() => { try { return useNotifications(); } catch { return { addNotification: () => { }, showModalNotification: () => { } }; } })();

  const [selectedTech, setSelectedTech] = useState<Technician | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTech, setEditingTech] = useState<Technician | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [isTeamSaving, setIsTeamSaving] = useState(false);
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'infos' | 'planning' | 'performance'>('infos');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<TechnicianSchedule | null>(null);
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [managerView, setManagerView] = useState<'overview' | 'performances' | 'disponibilites'>('overview');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; type: 'tech' | 'team'; label: string; message: string } | null>(null);

  const canManageRH = currentUser?.role === 'ADMIN' || currentUser?.role === 'AGENT';
  const canManageTeams = currentUser?.role === 'ADMIN' || currentUser?.role === 'AGENT';
  const isSupervisor = currentUser?.role === 'MANAGER' || currentUser?.role === 'ADMIN';

  // Merge users with role TECHNICIAN (from Settings) into the technicians list
  const technicians: Technician[] = useMemo(() => {
    const techIds = new Set((rawTechnicians || []).map((t: Technician) => t.id));
    const missingTechUsers = (allUsers || []).filter((u: any) => u.role === 'TECHNICIAN' && !techIds.has(u.id));
    return [
      ...(rawTechnicians || []),
      ...missingTechUsers.map((u: any): Technician => ({
        id: u.id,
        name: u.name,
        email: u.email || '',
        phone: '',
        specialty: ['SAV'] as TicketCategory[],
        showroom: u.showroom || '',
        avatar: u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=3ecf8e&color=ffffff`,
        status: 'Disponible',
        activeTickets: 0,
        completedTickets: 0,
        avgResolutionTime: '0h',
        rating: 5.0,
        nps: 100,
        firstFixRate: 100,
        performanceHistory: [],
        maxWorkload: 5,
        teamId: undefined
      }))
    ];
  }, [rawTechnicians, allUsers]);

  // Teams created by current user (Agent or Manager)
  const myTeams = (apiTeams || []).filter((t: Team) => t.createdBy === currentUser?.id);

  useEffect(() => { refreshAll(); }, [refreshAll]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Disponible': return 'bg-[#3ecf8e]';
      case 'En intervention': return 'bg-amber-500';
      default: return 'bg-[#686868]';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Disponible': return 'bg-[#f0fdf4] text-[#16a34a] border-[#dcfce7]';
      case 'En intervention': return 'bg-[#fffbeb] text-[#b45309] border-[#fef3c7]';
      default: return 'bg-[#f9fafb] text-[#4b5563] border-[#f3f4f6]';
    }
  };

  // --- ENHANCED FEATURES HELPERS ---
  const getTechSchedules = (techId: string) => {
    return (techSchedules || []).filter((s: any) => s.technicianId === techId)
      .sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  };

  const getTechMetrics = (techId: string): TechnicianMetrics | null => {
    const currentPeriod = new Date().toISOString().slice(0, 7); // YYYY-MM
    return (techMetrics || []).find((m: any) => m.technicianId === techId && m.period === currentPeriod) || null;
  };

  const getWeekDays = () => {
    const days = [];
    const today = new Date(selectedDate);
    const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const getSchedulesForDay = (techId: string, date: Date) => {
    const dayStr = date.toISOString().split('T')[0];
    return getTechSchedules(techId).filter((s: any) => s.startTime.startsWith(dayStr));
  };

  const calculatePerformanceScore = (tech: Technician) => {
    const metrics = getTechMetrics(tech.id);
    if (!metrics) return null;
    return {
      resolution: Math.min(100, (metrics.ticketsResolved || 0) * 5),
      speed: Math.min(100, 100 - ((metrics.avgResolutionTime || 0) / 60)),
      quality: metrics.firstFixRate || 0,
      satisfaction: (metrics.customerSatisfaction || 0) * 10
    };
  };

  // --- MANAGER VIEW HELPERS ---
  const getTechActiveTickets = (techId: string) => {
    return filterTicketsByDate((tickets || [])).filter((t: Ticket) =>
      t.assignedTechnicianId === techId &&
      !['Fermé', 'Payé - Clôturé', 'Archivé'].includes(t.status)
    );
  };

  const getTechRevenue = (techId: string) => {
    return filterTicketsByDate((tickets || [])).filter((t: Ticket) =>
      t.assignedTechnicianId === techId &&
      (t.status === 'Fermé' || t.status === 'Payé - Clôturé')
    ).reduce((sum: number, t: Ticket) => sum + (t.financials?.grandTotal || 0), 0);
  };

  const getTechResolvedThisPeriod = (techId: string) => {
    return filterTicketsByDate((tickets || [])).filter((t: Ticket) =>
      t.assignedTechnicianId === techId &&
      (t.status === 'Fermé' || t.status === 'Payé - Clôturé')
    ).length;
  };

  const getSurchargedTechs = () => {
    return (technicians || []).filter((tech: Technician) => {
      const activeCount = getTechActiveTickets(tech.id).length;
      const maxCap = tech.maxWorkload || 5;
      return activeCount > maxCap;
    });
  };

  const getOfflineTechs = () => {
    return (technicians || []).filter((tech: Technician) => tech.status === 'Hors ligne');
  };

  // --- STATUS FILTER HELPERS ---
  const getAvailableTechs = () => {
    return (technicians || []).filter((tech: Technician) => tech.status === 'Disponible');
  };

  const getTechsInIntervention = () => {
    return (technicians || []).filter((tech: Technician) => tech.status === 'En intervention');
  };

  // --- STATUS COLOR HELPERS ---
  const getStatusDotColor = (status: string) => {
    switch (status) {
      case 'Disponible': return 'bg-[#3ecf8e]';
      case 'En intervention': return 'bg-amber-500';
      default: return 'bg-gray-400';
    }
  };

  const getStatusBadgeStyles = (status: string) => {
    switch (status) {
      case 'Disponible': return 'bg-[#f0fdf4] text-[#16a34a]';
      case 'En intervention': return 'bg-[#fffbeb] text-[#b45309]';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const getTeamPerformanceData = () => {
    return (technicians || []).map((tech: Technician) => {
      const active = getTechActiveTickets(tech.id).length;
      const resolved = getTechResolvedThisPeriod(tech.id);
      const revenue = getTechRevenue(tech.id);
      const maxCap = tech.maxWorkload || 5;
      return {
        name: tech.name.split(' ')[0],
        fullName: tech.name,
        active,
        resolved,
        revenue: Math.round(revenue / 1000),
        rating: tech.rating || 0,
        nps: tech.nps || 0,
        firstFix: tech.firstFixRate || 0,
        capacity: maxCap,
        load: active,
        status: tech.status,
        overload: active > maxCap
      };
    });
  };

  const getStatusDistribution = () => {
    const statuses = ['Disponible', 'En intervention', 'Hors ligne'];
    const data = statuses.map(status => ({
      name: status,
      value: (technicians || []).filter((t: Technician) => t.status === status).length
    })).filter(d => d.value > 0);
    return data;
  };

  const COLORS_PIE = ['#3ecf8e', '#f59e0b', '#686868'];

  // --- DATE FILTER HELPERS ---
  const getDateRange = () => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    switch (dateFilter) {
      case 'today':
        return { start: today, end: today };
      case 'week':
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        return {
          start: weekStart.toISOString().split('T')[0],
          end: weekEnd.toISOString().split('T')[0]
        };
      case 'month':
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return {
          start: monthStart.toISOString().split('T')[0],
          end: monthEnd.toISOString().split('T')[0]
        };
      case 'custom':
        return {
          start: customStartDate || today,
          end: customEndDate || today
        };
      default:
        return { start: '', end: '' };
    }
  };

  const filterTicketsByDate = (ticketsToFilter: Ticket[]) => {
    const { start, end } = getDateRange();
    if (!start && !end) return ticketsToFilter;

    return ticketsToFilter.filter(ticket => {
      const ticketDate = ticket.createdAt.split('T')[0];
      if (start && ticketDate < start) return false;
      if (end && ticketDate > end) return false;
      return true;
    });
  };

  // --- PARTS USAGE HELPER ---
  const getTechPartsUsage = (techId: string) => {
    const techTickets = filterTicketsByDate((tickets || [])).filter((t: Ticket) =>
      t.assignedTechnicianId === techId &&
      t.status === 'Fermé' &&
      t.interventionReport?.partsUsed &&
      t.interventionReport.partsUsed.length > 0
    );

    const partsUsage: Record<string, { name: string; quantity: number; totalCost: number }> = {};

    techTickets.forEach((ticket: Ticket) => {
      ticket.interventionReport?.partsUsed?.forEach((part: any) => {
        if (partsUsage[part.name]) {
          partsUsage[part.name].quantity += part.quantity || 1;
          partsUsage[part.name].totalCost += (part.quantity || 1) * (part.unitPrice || 0);
        } else {
          partsUsage[part.name] = {
            name: part.name,
            quantity: part.quantity || 1,
            totalCost: (part.quantity || 1) * (part.unitPrice || 0)
          };
        }
      });
    });

    return Object.values(partsUsage).sort((a, b) => b.quantity - a.quantity);
  };

  const handleSaveTech = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    const formData = new FormData(e.currentTarget);

    // Parse certifications from comma-separated string
    const certificationsInput = formData.get('certifications') as string;
    const certifications = certificationsInput ? certificationsInput.split(',').map(c => c.trim()).filter(Boolean) : editingTech?.certifications || [];

    const techData: Technician = {
      id: editingTech?.id || `TECH-${Date.now()}`,
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      specialty: editingTech?.specialty || ['SAV', 'Installation'],
      showroom: formData.get('showroom') as string,
      status: (formData.get('status') as any) || 'Disponible',
      avatar: editingTech?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.get('name') as string)}&background=3ecf8e&color=ffffff`,
      activeTickets: editingTech?.activeTickets || 0,
      completedTickets: editingTech?.completedTickets || 0,
      avgResolutionTime: editingTech?.avgResolutionTime || '0h',
      rating: editingTech?.rating || 5.0,
      nps: editingTech?.nps || 100,
      firstFixRate: editingTech?.firstFixRate || 100,
      performanceHistory: editingTech?.performanceHistory || [],
      // Enhanced fields
      certifications: certifications,
      backupTechnicianId: (formData.get('backupTechnicianId') as string) || editingTech?.backupTechnicianId,
      maxWorkload: parseInt(formData.get('maxWorkload') as string) || editingTech?.maxWorkload || 5
    };

    try {
      const techId = editingTech?.id || `TECH-${Date.now()}`;
      techData.id = techId;

      // 1. Sauvegarder la fiche technicien
      await saveTechnician(techData);

      // 2. Si nouveau technicien, créer aussi son compte utilisateur
      if (!editingTech) {
        const password = formData.get('password') as string;
        if (password) {
          await saveUser({
            id: techId, // Utiliser le même ID pour lier les deux
            name: techData.name,
            email: techData.email,
            password: password,
            role: 'TECHNICIAN',
            status: 'Actif',
            avatar: techData.avatar,
            showroom: techData.showroom
          });
          showModalNotification({ title: 'Compte Créé ✓', message: `Le compte technicien pour ${techData.name} est prêt. Il peut désormais se connecter.`, type: 'success' });
        }
      }

      setIsModalOpen(false);
    } catch (err) {
      showModalNotification({ title: 'Échec', message: 'La sauvegarde a échoué. Veuillez réessayer.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTech = (id: string) => {
    const tech = technicians.find(t => t.id === id);
    setDeleteConfirm({
      id,
      type: 'tech',
      label: tech?.name || 'ce technicien',
      message: `Voulez-vous vraiment retirer ${tech?.name || 'ce technicien'} de l'équipe technique ? Cette action est irréversible.`
    });
  };

  const handleDeleteTeam = (teamId: string) => {
    const team = apiTeams.find(t => t.id === teamId);
    setDeleteConfirm({
      id: teamId,
      type: 'team',
      label: team?.name || 'cette équipe',
      message: `Voulez-vous vraiment supprimer l'équipe "${team?.name || 'cette équipe'}" ? Les techniciens associés seront désassignés.`
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      if (deleteConfirm.type === 'tech') {
        await deleteTechnician(deleteConfirm.id);
        showModalNotification({ title: 'Supprimé ✓', message: 'Le collaborateur a été retiré de l\'équipe et ses accès révoqués.', type: 'success' });
        setSelectedTech(null);
      } else {
        // Unassign technicians from this team
        const teamTechs = (technicians || []).filter((t: Technician) => t.teamId === deleteConfirm.id);
        for (const tech of teamTechs) {
          await saveTechnician({ ...tech, teamId: undefined });
        }
        await deleteTeam(deleteConfirm.id);
        showModalNotification({ title: 'Équipe Supprimée ✓', message: 'L\'équipe a été supprimée et les techniciens désassignés.', type: 'success' });
        refreshAll();
      }
    } catch (err) {
      showModalNotification({ title: 'Échec', message: 'L\'opération a échoué. Veuillez réessayer.', type: 'error' });
    } finally {
      setDeleteConfirm(null);
    }
  };

  // Team management functions for Agents
  const handleSaveTeam = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canManageTeams || !currentUser) return;
    setIsTeamSaving(true);
    const formData = new FormData(e.currentTarget);
    const teamData: Team = {
      id: editingTeam?.id || `TEAM-${Date.now()}`,
      name: formData.get('teamName') as string,
      description: formData.get('teamDescription') as string,
      createdBy: currentUser.id,
      createdAt: editingTeam?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    try {
      await saveTeam(teamData);
      setIsTeamModalOpen(false);
      setEditingTeam(null);
      addNotification({ title: 'Équipe', message: `Équipe "${teamData.name}" sauvegardée.`, type: 'success' });
      refreshAll();
    } catch (err) {
      addNotification({ title: 'Erreur', message: 'Échec de la sauvegarde de l\'équipe.', type: 'error' });
    } finally {
      setIsTeamSaving(false);
    }
  };

  const handleAssignToTeam = async (techId: string, teamId: string | null) => {
    if (!canManageTeams) return;
    const tech = (technicians || []).find((t: Technician) => t.id === techId);
    if (!tech) return;

    // Check if technician is already in another team created by this agent
    if (tech.teamId && tech.teamId !== teamId) {
      const currentTeam = myTeams.find((t: Team) => t.id === tech.teamId);
      if (currentTeam) {
        addNotification({
          title: 'Assignation impossible',
          message: `Ce technicien est déjà dans l'équipe "${currentTeam.name}". Désassignez-le d'abord.`,
          type: 'warning'
        });
        return;
      }
    }

    try {
      await saveTechnician({ ...tech, teamId: teamId || undefined });
      addNotification({
        title: 'Assignation',
        message: teamId ? `Technicien assigné à l'équipe.` : `Technicien retiré de l'équipe.`,
        type: 'success'
      });
      refreshAll();
      if (selectedTech?.id === techId) {
        setSelectedTech({ ...tech, teamId: teamId || undefined });
      }
    } catch (err) {
      addNotification({ title: 'Erreur', message: 'Échec de l\'assignation.', type: 'error' });
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-5 animate-sb-entry pb-20">
      {/* Header */}
      {isLoading ? (
        <SkeletonHeader />
      ) : (
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#3ecf8e]/10 rounded-xl flex items-center justify-center text-[#3ecf8e]">
              <Users size={18} />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
                Équipe Technique
              </h1>
              <p className="text-xs text-[#686868] font-semibold uppercase tracking-wider mt-0.5">Gestion des collaborateurs et ressources SAV.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={refreshAll} className="h-8 w-8 flex items-center justify-center bg-white border border-[#e5e5e5] text-[#686868] rounded-lg hover:bg-[#fafafa] transition-colors btn-interactive shadow-sm">
              <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
            </button>
            {canManageRH && currentUser?.role !== 'MANAGER' && (
              <button onClick={() => { setEditingTech(null); setIsModalOpen(true); }} className="btn-sb-primary h-8 px-4 shadow-lg shadow-[#3ecf8e]/20 btn-interactive">
                <UserPlus size={14} /> <span className="text-[9px] font-semibold uppercase tracking-widest">Nouveau</span>
              </button>
            )}
            {canManageTeams && currentUser?.role !== 'MANAGER' && (
              <button onClick={() => { setEditingTeam(null); setIsTeamModalOpen(true); }} className="btn-sb-primary h-8 px-4 bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-600/20 btn-interactive">
                <Users2 size={14} /> <span className="text-[9px] font-semibold uppercase tracking-widest">Équipes</span>
              </button>
            )}
          </div>
        </header>
      )}

      {/* MANAGER VIEW TOGGLE */}
      {isSupervisor && (
        <div className="space-y-4">
          {/* Date Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-[11px] font-semibold text-[#686868] uppercase tracking-wide">Période:</span>
            <div className="flex items-center gap-1.5 bg-gray-100/50 border border-gray-100 rounded-lg p-1 shadow-inner mr-2">
              {[
                { id: 'all', label: 'Tout' },
                { id: 'today', label: 'Aujourd\'hui' },
                { id: 'week', label: 'Cette semaine' },
                { id: 'month', label: 'Ce mois' },
                { id: 'custom', label: 'Personnalisé' }
              ].map(filter => (
                <button
                  key={filter.id}
                  onClick={() => setDateFilter(filter.id as any)}
                  className={`px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all ${dateFilter === filter.id ? 'bg-[#3ecf8e] text-white' : 'text-[#686868] hover:text-[#1c1c1c]'
                    }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            {/* Custom Date Range */}
            {dateFilter === 'custom' && (
              <div className="flex items-center gap-2 ml-auto">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-2.5 py-1.5 border border-[#e5e5e5] rounded-lg text-[12px] focus:outline-none focus:ring-2 focus:ring-[#3ecf8e]/20"
                  placeholder="Début"
                />
                <span className="text-[#686868] text-[12px]">au</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-2.5 py-1.5 border border-[#e5e5e5] rounded-lg text-[12px] focus:outline-none focus:ring-2 focus:ring-[#3ecf8e]/20"
                  placeholder="Fin"
                />
              </div>
            )}

            {/* Current Period Display */}
            {dateFilter !== 'all' && (
              <div className="ml-auto text-[11px] text-[#686868] bg-[#f8f9fa] px-3 py-1.5 rounded-lg border border-[#e5e5e5]">
                {(() => {
                  const { start, end } = getDateRange();
                  if (dateFilter === 'today') return `Aujourd'hui`;
                  if (dateFilter === 'week') return `Semaine du ${new Date(start).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`;
                  if (dateFilter === 'month') return new Date(start).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
                  if (dateFilter === 'custom') return `${new Date(start).toLocaleDateString('fr-FR')} - ${new Date(end).toLocaleDateString('fr-FR')}`;
                  return '';
                })()}
              </div>
            )}
          </div>

          {/* View Tabs */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl border border-transparent w-fit">
            {[
              { id: 'overview', label: 'Vue d\'ensemble', icon: <LayoutDashboard size={14} /> },
              { id: 'performances', label: 'Performances', icon: <BarChart2 size={14} /> },
              { id: 'disponibilites', label: 'Disponibilités', icon: <Gauge size={14} /> }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setManagerView(tab.id as any)}
                className={`flex items-center gap-2 px-6 py-2 text-[9px] font-semibold uppercase tracking-widest rounded-lg transition-all ${managerView === tab.id ? 'bg-white shadow-sm text-[#1c1c1c]' : 'text-[#686868] hover:text-[#1c1c1c]'
                  }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Module Tips */}
      <ModuleTips
        moduleName="Équipe Technique"
        storageKey="technicians_module"
        tips={[
          {
            id: 'tech-1',
            title: 'Filtrage par équipe',
            content: 'Utilisez les filtres d\'équipe pour organiser les techniciens par groupes fonctionnels. Les Agents peuvent créer et gérer des équipes de travail.',
            target: 'Filtres équipes'
          },
          {
            id: 'tech-2',
            title: 'Statut en temps réel',
            content: 'Le point de couleur sur l\'avatar indique le statut : vert = disponible, orange = en intervention, gris = indisponible.',
            target: 'Indicateurs de statut'
          },
          {
            id: 'tech-3',
            title: 'Fiche détaillée',
            content: 'Cliquez sur une carte pour accéder à la fiche complète : planning hebdomadaire, métriques de performance, historique d\'intervention et pièces utilisées.',
            target: 'Cartes techniciens'
          },
          {
            id: 'tech-4',
            title: 'Performance et NPS',
            content: 'Le NPS (Net Promoter Score) et les étoiles reflètent la satisfaction client. Les métriques mensuelles montrent les tickets résolus et le temps moyen d\'intervention.',
            target: 'Métriques de performance'
          },
          {
            id: 'tech-5',
            title: 'Vue Manager',
            content: 'Les Managers peuvent basculer entre Vue d\'ensemble, Performances et Disponibilités pour suivre l\'équipe en temps réel. Les alertes de surcharge apparaissent automatiquement.',
            target: 'Onglets Manager'
          }
        ]}
      />

      {/* Team Filter for Agents and Managers */}
      {canManageTeams && myTeams.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-[11px] font-semibold text-[#686868] uppercase tracking-wide">Filtrer par équipe:</span>
          <button
            onClick={() => setSelectedTeamFilter(null)}
            className={`px-2.5 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${!selectedTeamFilter ? 'bg-[#3ecf8e] text-white' : 'bg-white text-[#686868] border border-[#e5e5e5] hover:border-[#d1d1d1]'}`}
          >
            Tous
          </button>
          {myTeams.map((team: Team) => (
            <button
              key={team.id}
              onClick={() => setSelectedTeamFilter(team.id)}
              className={`px-2.5 py-1.5 rounded-lg text-[12px] font-semibold transition-all flex items-center gap-1.5 ${selectedTeamFilter === team.id ? 'bg-purple-600 text-white' : 'bg-white text-[#686868] border border-[#e5e5e5] hover:border-[#d1d1d1]'}`}
            >
              <Users2 size={11} />
              {team.name}
              <span className="bg-white/20 px-1 py-0.5 rounded text-[9px]">
                {(technicians || []).filter((t: Technician) => t.teamId === team.id).length}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {isLoading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <SmallCard
              title="Effectif"
              value={(technicians || []).length}
              icon={<Users size={14} />}
              color="#3b82f6"
              tip="Nombre total de techniciens"
            />
            <SmallCard
              title="En Mission"
              value={getTechsInIntervention().length}
              icon={<Activity size={14} />}
              color="#f59e0b"
              tip="Techniciens actuellement en intervention"
            />
            <SmallCard
              title="NPS Moyen"
              value={`${Math.round((technicians || []).reduce((sum: number, t: Technician) => sum + (t.nps || 0), 0) / ((technicians || []).length || 1))}`}
              icon={<Star size={14} />}
              color="#8b5cf6"
              tip="Net Promoter Score moyen de l'équipe"
            />
            <SmallCard
              title="Disponibilité"
              value={`${Math.round((getAvailableTechs().length / (technicians || []).length) * 100) || 0}%`}
              icon={<Zap size={14} />}
              color="#8b5cf6"
              tip="Pourcentage de techniciens disponibles"
            />
          </>
        )}
      </div>

      {/* MANAGER DASHBOARD */}
      {isSupervisor && !isLoading && (
        <div className="space-y-5 animate-sb-entry">
          {/* Alertes Manager */}
          {getSurchargedTechs().length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center shrink-0">
                <AlertTriangle size={16} className="text-red-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-700">{getSurchargedTechs().length} technicien{getSurchargedTechs().length > 1 ? 's' : ''} en surcharge</p>
                <p className="text-xs text-red-600 mt-0.5">
                  {getSurchargedTechs().map((t: Technician) => `${t.name} (${getTechActiveTickets(t.id).length}/${t.maxWorkload || 5} tickets)`).join(', ')}
                </p>
              </div>
            </div>
          )}

          {getOfflineTechs().length > 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-start gap-3">
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                <Users size={16} className="text-gray-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-700">{getOfflineTechs().length} technicien{getOfflineTechs().length > 1 ? 's' : ''} hors ligne</p>
                <p className="text-xs text-gray-600 mt-0.5">
                  {getOfflineTechs().map((t: Technician) => t.name).join(', ')}
                </p>
              </div>
            </div>
          )}

          {/* Vue Overview */}
          {managerView === 'overview' && (
            <div className="space-y-5">
              {/* KPI Manager */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <SmallCard
                  title="Tickets Actifs"
                  value={filterTicketsByDate((tickets || [])).filter((t: Ticket) => t.assignedTechnicianId && !['Fermé', 'Payé - Clôturé', 'Archivé'].includes(t.status)).length}
                  icon={<Activity size={14} />}
                  color="#3b82f6"
                  tip="Total des tickets en cours assignés à l'équipe"
                />
                <SmallCard
                  title="Revenus Période"
                  value={`${Math.round((technicians || []).reduce((sum: number, t: Technician) => sum + getTechRevenue(t.id), 0) / 1000)}k F`}
                  icon={<CircleDollarSign size={14} />}
                  color="#22c55e"
                  tip="Chiffre d'affaires généré par l'équipe sur la période sélectionnée"
                />
                <SmallCard
                  title="Résolus Période"
                  value={(technicians || []).reduce((sum: number, t: Technician) => sum + getTechResolvedThisPeriod(t.id), 0)}
                  icon={<Target size={14} />}
                  color="#f59e0b"
                  tip="Nombre total de tickets résolus sur la période sélectionnée"
                />
                <SmallCard
                  title="Charge Moyenne"
                  value={`${Math.round((technicians || []).reduce((sum: number, t: Technician) => sum + getTechActiveTickets(t.id).length, 0) / ((technicians || []).length || 1))}/${Math.round((technicians || []).reduce((sum: number, t: Technician) => sum + (t.maxWorkload || 5), 0) / ((technicians || []).length || 1))}`}
                  icon={<Gauge size={14} />}
                  color="#8b5cf6"
                  tip="Charge moyenne par technicien / capacité moyenne"
                />
              </div>

              {/* Graphiques Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-lg p-4 border border-[#e5e5e5] shadow-sm">
                  <h3 className="text-[11px] font-semibold text-[#1c1c1c] uppercase tracking-widest mb-4 flex items-center gap-2">
                    <BarChart2 size={14} className="text-[#3ecf8e]" />
                    Tickets Résolus ce Mois
                  </h3>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={getTeamPerformanceData()}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis hide />
                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} formatter={(value: number) => [`${value} tickets`, 'Résolus']} />
                        <Bar dataKey="resolved" fill="#3ecf8e" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white rounded-lg p-4 border border-[#e5e5e5] shadow-sm">
                  <h3 className="text-[11px] font-semibold text-[#1c1c1c] uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Activity size={14} className="text-[#3b82f6]" />
                    Répartition des Statuts
                  </h3>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={getStatusDistribution()} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value">
                          {getStatusDistribution().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS_PIE[index % COLORS_PIE.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex justify-center gap-4 mt-2">
                    {getStatusDistribution().map((entry, index) => (
                      <div key={entry.name} className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS_PIE[index % COLORS_PIE.length] }} />
                        <span className="text-[9px] text-[#686868] font-semibold">{entry.name} ({entry.value})</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Tableau récap overview */}
              <div className="bg-white rounded-lg border border-[#e5e5e5] shadow-sm overflow-hidden">
                <div className="p-4 border-b border-[#f0f0f0]">
                  <h3 className="text-[12px] font-semibold text-[#1c1c1c] flex items-center gap-2">
                    <Eye size={16} className="text-[#3ecf8e]" />
                    Suivi d'Équipe en Temps Réel
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-[#f8f9fa] text-[9px] font-semibold text-[#686868] uppercase tracking-wider">
                        <th className="px-4 py-3">Technicien</th>
                        <th className="px-4 py-3 text-center">Statut</th>
                        <th className="px-4 py-3 text-center">Charge</th>
                        <th className="px-4 py-3 text-center">Résolus</th>
                        <th className="px-4 py-3 text-center">Revenus</th>
                        <th className="px-4 py-3 text-center">NPS</th>
                        <th className="px-4 py-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f5f5f5]">
                      {getTeamPerformanceData().map((tech: { fullName: string; status: string; load: number; capacity: number; overload: boolean; resolved: number; revenue: number; rating: number }) => (
                        <tr key={tech.fullName} className="hover:bg-[#fcfcfc] transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className={`w-2.5 h-2.5 rounded-full ${getStatusDotColor(tech.status)}`} />
                              <span className="text-sm font-semibold text-[#1c1c1c]">{tech.fullName}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase ${getStatusBadgeStyles(tech.status)}`}>
                              {tech.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <span className={`text-sm font-semibold ${tech.overload ? 'text-red-600' : 'text-[#1c1c1c]'}`}>
                                {tech.load}/{tech.capacity}
                              </span>
                              {tech.overload && <AlertTriangle size={12} className="text-red-500" />}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center text-sm font-semibold text-[#3ecf8e]">{tech.resolved}</td>
                          <td className="px-4 py-3 text-center text-sm font-semibold text-[#1c1c1c]">{tech.revenue}k F</td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1 text-amber-500">
                              <Star size={10} fill="currentColor" />
                              <span className="text-sm font-semibold">{tech.rating.toFixed(1)}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => setSelectedTech((technicians || []).find((t: Technician) => t.name === tech.fullName) || null)}
                              className="text-[11px] font-semibold text-[#3ecf8e] hover:underline"
                            >
                              Voir fiche
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Vue Performances */}
          {managerView === 'performances' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-lg p-4 border border-[#e5e5e5] shadow-sm">
                  <h3 className="text-[11px] font-semibold text-[#1c1c1c] uppercase tracking-widest mb-4 flex items-center gap-2">
                    <TrendingUp size={14} className="text-[#3ecf8e]" />
                    First Fix Rate (%)
                  </h3>
                  <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={getTeamPerformanceData()} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={60} />
                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} formatter={(value: number) => [`${value}%`, 'First Fix']} />
                        <Bar dataKey="firstFix" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white rounded-lg p-4 border border-[#e5e5e5] shadow-sm">
                  <h3 className="text-[11px] font-semibold text-[#1c1c1c] uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Star size={14} className="text-amber-500" />
                    NPS & Rating
                  </h3>
                  <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={getTeamPerformanceData()}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis hide />
                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                        <Bar dataKey="rating" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Rating /5" />
                        <Bar dataKey="nps" fill="#3ecf8e" radius={[4, 4, 0, 0]} name="NPS" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Performance Table */}
              <div className="bg-white rounded-lg border border-[#e5e5e5] shadow-sm overflow-hidden">
                <div className="p-4 border-b border-[#f0f0f0]">
                  <h3 className="text-[12px] font-semibold text-[#1c1c1c] flex items-center gap-2">
                    <Trophy size={16} className="text-[#f59e0b]" />
                    Classement des Performances
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-[#f8f9fa] text-[9px] font-semibold text-[#686868] uppercase tracking-wider">
                        <th className="px-4 py-3">Rang</th>
                        <th className="px-4 py-3">Technicien</th>
                        <th className="px-4 py-3 text-center">Tickets Résolus</th>
                        <th className="px-4 py-3 text-center">Revenus</th>
                        <th className="px-4 py-3 text-center">Rating</th>
                        <th className="px-4 py-3 text-center">First Fix</th>
                        <th className="px-4 py-3 text-center">NPS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f5f5f5]">
                      {[...getTeamPerformanceData()]
                        .sort((a, b) => b.resolved - a.resolved)
                        .map((tech, idx) => (
                          <tr key={tech.fullName} className="hover:bg-[#fcfcfc] transition-colors">
                            <td className="px-4 py-3">
                              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-semibold ${idx === 0 ? 'bg-amber-100 text-amber-700' :
                                idx === 1 ? 'bg-gray-100 text-gray-600' :
                                  idx === 2 ? 'bg-orange-100 text-orange-700' :
                                    'bg-[#f8f9fa] text-[#9ca3af]'
                                }`}>
                                {idx + 1}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm font-semibold text-[#1c1c1c]">{tech.fullName}</td>
                            <td className="px-4 py-3 text-center text-sm font-semibold text-[#3ecf8e]">{tech.resolved}</td>
                            <td className="px-4 py-3 text-center text-sm font-semibold text-[#1c1c1c]">{tech.revenue}k F</td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center gap-1 text-amber-500">
                                <Star size={10} fill="currentColor" />
                                <span className="text-sm font-semibold">{tech.rating.toFixed(1)}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center text-sm font-semibold text-blue-600">{tech.firstFix}%</td>
                            <td className="px-4 py-3 text-center text-sm font-semibold text-[#3ecf8e]">{tech.nps}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Vue Disponibilités */}
          {managerView === 'disponibilites' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <SmallCard
                  title="Disponibles"
                  value={getAvailableTechs().length}
                  icon={<Zap size={14} />}
                  color="#3ecf8e"
                  tip="Prêts à prendre une nouvelle intervention"
                />
                <SmallCard
                  title="En Mission"
                  value={getTechsInIntervention().length}
                  icon={<Activity size={14} />}
                  color="#f59e0b"
                  tip="Actuellement sur le terrain"
                />
                <SmallCard
                  title="Hors Ligne"
                  value={getOfflineTechs().length}
                  icon={<Users size={14} />}
                  color="#686868"
                  tip="Indisponibles actuellement"
                />
                <SmallCard
                  title="Surchargés"
                  value={getSurchargedTechs().length}
                  icon={<AlertTriangle size={14} />}
                  color="#ef4444"
                  tip="Dépassement de la capacité max de tickets"
                />
              </div>

              {/* Cartes de disponibilité détaillées */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(technicians || []).map((tech: Technician) => {
                  const active = getTechActiveTickets(tech.id).length;
                  const maxCap = tech.maxWorkload || 5;
                  const loadPercent = Math.min(100, Math.round((active / maxCap) * 100));
                  const isOverloaded = active > maxCap;
                  return (
                    <div key={tech.id} className={`bg-white rounded-lg border shadow-sm p-4 transition-all ${isOverloaded ? 'border-red-300' : 'border-[#e5e5e5]'
                      }`}>
                      <div className="flex items-center gap-3 mb-3">
                        <img src={tech.avatar} className="w-8 h-8 rounded-lg object-cover border border-[#e5e5e5]" alt="" />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold text-[#1c1c1c] truncate">{tech.name}</h4>
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase ${getStatusBadgeStyles(tech.status)}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${getStatusDotColor(tech.status)}`} />
                            {tech.status}
                          </span>
                        </div>
                      </div>

                      {/* Charge bar */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-[9px] font-semibold">
                          <span className="text-[#686868]">Charge active</span>
                          <span className={isOverloaded ? 'text-red-600' : 'text-[#1c1c1c]'}>{active} / {maxCap} tickets</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${isOverloaded ? 'bg-red-500' :
                              loadPercent >= 80 ? 'bg-amber-500' :
                                'bg-[#3ecf8e]'
                              }`}
                            style={{ width: `${loadPercent}%` }}
                          />
                        </div>
                        {isOverloaded && (
                          <p className="text-[9px] text-red-600 font-semibold flex items-center gap-1">
                            <AlertTriangle size={10} /> Surcharge détectée
                          </p>
                        )}
                      </div>

                      {/* Détails rapides */}
                      <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-[#f0f0f0]">
                        <div className="text-center">
                          <p className="text-[9px] text-[#686868] font-semibold uppercase">Spécialité</p>
                          <p className="text-[11px] font-semibold text-[#1c1c1c] truncate">{tech.specialty?.[0] || 'N/A'}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[9px] text-[#686868] font-semibold uppercase">Rating</p>
                          <p className="text-[11px] font-semibold text-amber-500">{tech.rating?.toFixed(1) || '-'}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[9px] text-[#686868] font-semibold uppercase">Total</p>
                          <p className="text-[11px] font-semibold text-[#3ecf8e]">{tech.completedTickets || 0}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Technician Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(technicians || [])
          .filter((tech: Technician) => !selectedTeamFilter || tech.teamId === selectedTeamFilter)
          .map((tech: Technician) => {
            const techTeam = myTeams.find((t: Team) => t.id === tech.teamId);
            return (
              <div
                key={tech.id}
                onClick={() => setSelectedTech(tech)}
                className="bg-white rounded-lg border border-[#e5e5e5] shadow-sm p-4 group hover:border-[#3ecf8e] hover:shadow-md transition-all cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <div className="relative shrink-0">
                    <img
                      src={tech.avatar}
                      className="w-12 h-12 rounded-lg object-cover border border-[#e5e5e5] bg-[#f8f9fa]"
                      alt=""
                    />
                    <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${getStatusColor(tech.status)}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-[15px] font-semibold text-[#1c1c1c] group-hover:text-[#3ecf8e] transition-colors truncate">{tech.name}</h3>
                        <p className="text-[11px] text-[#9ca3af] flex items-center gap-1 mt-0.5">
                          <MapPin size={10} className="text-[#3ecf8e]" />
                          {tech.showroom || 'Secteur Libreville'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 text-amber-500 shrink-0">
                        <Star size={10} fill="currentColor" />
                        <span className="text-[11px] font-semibold">{tech.rating.toFixed(1)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-semibold uppercase ${getStatusBadge(tech.status)}`}>
                        {tech.status}
                      </span>
                      {techTeam && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-purple-50 text-purple-600 rounded text-[9px] font-semibold">
                          <Users2 size={8} /> {techTeam.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div className="p-2 bg-[#f8f9fa] rounded-lg text-center">
                    <p className="text-[9px] font-semibold text-[#686868] uppercase">En cours</p>
                    <p className="text-base font-semibold text-[#1c1c1c]">{tech.activeTickets}</p>
                  </div>
                  <div className="p-2 bg-[#f8f9fa] rounded-lg text-center">
                    <p className="text-[9px] font-semibold text-[#686868] uppercase">Clôturés</p>
                    <p className="text-base font-semibold text-[#3ecf8e]">{tech.completedTickets}</p>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-[#f0f0f0] flex justify-between items-center">
                  <div className="flex gap-1.5">
                    <div className="w-7 h-7 rounded-md bg-[#f8f9fa] border border-[#e5e5e5] flex items-center justify-center text-[#9ca3af] hover:text-[#3ecf8e] hover:border-[#3ecf8e]/30 transition-colors">
                      <Mail size={12} />
                    </div>
                    <div className="w-7 h-7 rounded-md bg-[#f8f9fa] border border-[#e5e5e5] flex items-center justify-center text-[#9ca3af] hover:text-[#3ecf8e] hover:border-[#3ecf8e]/30 transition-colors">
                      <Phone size={12} />
                    </div>
                  </div>
                  <span className="text-[9px] font-semibold text-[#686868] flex items-center gap-1 group-hover:text-[#3ecf8e] transition-colors">
                    Fiche <ChevronRight size={12} />
                  </span>
                </div>
              </div>
            );
          })}

        {(technicians || []).filter((tech: Technician) => !selectedTeamFilter || tech.teamId === selectedTeamFilter).length === 0 && (
          <div className="col-span-full text-center py-8">
            <div className="w-12 h-12 bg-[#f5f5f5] rounded-full flex items-center justify-center mx-auto mb-3">
              <Users size={16} className="text-[#9ca3af]" />
            </div>
            <p className="text-sm font-semibold text-[#686868]">Aucun technicien trouvé</p>
            <p className="text-xs text-[#9ca3af] mt-0.5">Modifiez vos critères de filtre</p>
          </div>
        )}
      </div>

      <Drawer isOpen={!!selectedTech} onClose={() => setSelectedTech(null)} title="Fiche Technicien" subtitle={selectedTech?.name} icon={<BadgeCheck size={14} />}>
        {selectedTech && (
          <div className="space-y-4 animate-sb-entry pb-10">
            {/* HEADER */}
            <div className="flex flex-col items-center text-center p-3 bg-[#f8f9fa] border border-[#e5e5e5] rounded-xl shadow-sm">
              <div className="relative mb-3">
                <img src={selectedTech.avatar} className="w-24 h-24 rounded-xl object-cover border-4 border-white shadow-lg bg-white" alt="" />
                <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${getStatusColor(selectedTech.status)}`} />
              </div>
              <h3 className="text-base font-semibold text-[#1c1c1c] tracking-tight">{selectedTech.name}</h3>
              <p className="text-[12px] text-[#3ecf8e] font-semibold uppercase tracking-widest mt-1">
                {selectedTech.status}
              </p>
            </div>

            {/* TABS */}
            <div className="flex gap-1 bg-[#f8f9fa] p-1 rounded-lg border border-[#e5e5e5]">
              {[
                { id: 'infos', label: 'Infos', icon: <UserIcon size={12} /> },
                { id: 'planning', label: 'Planning', icon: <Calendar size={12} /> },
                { id: 'performance', label: 'Perf', icon: <TrendingUp size={12} /> }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-semibold uppercase transition-all ${activeTab === tab.id ? 'bg-white text-[#1c1c1c] shadow-sm' : 'text-[#686868] hover:text-[#1c1c1c]'
                    }`}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>

            {/* TAB: INFOS */}
            {activeTab === 'infos' && (
              <div className="space-y-4 animate-sb-entry">
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-white border border-[#e5e5e5] rounded-lg text-center">
                    <p className="text-[9px] font-semibold text-[#686868] uppercase">NPS</p>
                    <p className="text-lg font-semibold text-[#3ecf8e]">{selectedTech.nps || 0}</p>
                  </div>
                  <div className="p-3 bg-white border border-[#e5e5e5] rounded-lg text-center">
                    <p className="text-[9px] font-semibold text-[#686868] uppercase">Fix Rate</p>
                    <p className="text-lg font-semibold text-blue-600">{selectedTech.firstFixRate || 0}%</p>
                  </div>
                  <div className="p-3 bg-white border border-[#e5e5e5] rounded-lg text-center">
                    <p className="text-[9px] font-semibold text-[#686868] uppercase">Rating</p>
                    <p className="text-lg font-semibold text-amber-500">{selectedTech.rating?.toFixed(1) || '0.0'}</p>
                  </div>
                </div>

                {/* Alert: Workload Overload */}
                {(() => {
                  const currentWorkload = (tickets || []).filter((t: Ticket) => t.assignedTechnicianId === selectedTech.id && !['Fermé', 'Payé - Clôturé'].includes(t.status)).length;
                  const maxCap = selectedTech.maxWorkload || 5;
                  if (currentWorkload > maxCap) {
                    return (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
                        <AlertTriangle size={16} className="text-red-500 shrink-0" />
                        <div>
                          <p className="text-[12px] font-semibold text-red-700">Surcharge détectée !</p>
                          <p className="text-[11px] text-red-600">{currentWorkload} tickets actifs (capacité max: {maxCap}). Risque de retard.</p>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

                <section className="space-y-3">
                  <h4 className="text-[12px] font-semibold text-[#686868] uppercase tracking-widest">Compétences</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedTech.specialty?.map((s: string) => (
                      <span key={s} className="px-2 py-1 bg-[#f0fdf4] border border-[#dcfce7] rounded-lg text-[11px] font-semibold text-[#16a34a]">{s}</span>
                    ))}
                  </div>
                </section>

                {/* Certifications & Badges */}
                {selectedTech.certifications && selectedTech.certifications.length > 0 && (
                  <section className="space-y-3">
                    <h4 className="text-[12px] font-semibold text-[#686868] uppercase tracking-widest flex items-center gap-2">
                      <Award size={12} /> Certifications
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedTech.certifications.map((cert: string) => (
                        <span key={cert} className="px-2 py-1 bg-amber-50 border border-amber-200 rounded-lg text-[11px] font-semibold text-amber-700 flex items-center gap-1">
                          <Award size={10} /> {cert}
                        </span>
                      ))}
                    </div>
                  </section>
                )}

                <section className="space-y-3">
                  <h4 className="text-[12px] font-semibold text-[#686868] uppercase tracking-widest">Coordonnées</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 p-3 bg-white border border-[#e5e5e5] rounded-lg">
                      <MailIcon size={14} className="text-[#3ecf8e]" />
                      <span className="text-sm">{selectedTech.email}</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-white border border-[#e5e5e5] rounded-lg">
                      <Phone size={14} className="text-[#3ecf8e]" />
                      <span className="text-sm">{selectedTech.phone}</span>
                    </div>
                  </div>
                </section>

                {/* Backup / Remplaçant */}
                {selectedTech.backupTechnicianId && (
                  <section className="space-y-3">
                    <h4 className="text-[12px] font-semibold text-[#686868] uppercase tracking-widest flex items-center gap-2">
                      <Users2 size={12} /> Remplaçant
                    </h4>
                    {(() => {
                      const backupTech = technicians?.find((t: Technician) => t.id === selectedTech.backupTechnicianId);
                      if (!backupTech) return <p className="text-xs text-[#686868] italic">Remplaçant non trouvé</p>;
                      return (
                        <div
                          className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-100 rounded-lg cursor-pointer hover:bg-blue-100 transition-all"
                          onClick={() => { setSelectedTech(null); setTimeout(() => setSelectedTech(backupTech), 150); }}
                        >
                          <img src={backupTech.avatar} className="w-8 h-8 rounded-lg object-cover border border-blue-200" alt="" />
                          <div className="flex-1">
                            <p className="text-xs font-semibold text-blue-700">{backupTech.name}</p>
                            <p className="text-[11px] text-blue-500">{backupTech.status} • Tickets actifs: {backupTech.activeTickets || 0}</p>
                          </div>
                          <ChevronRight size={14} className="text-blue-400" />
                        </div>
                      );
                    })()}
                  </section>
                )}

                {canManageTeams && myTeams.length > 0 && (
                  <section className="space-y-3">
                    <h4 className="text-[12px] font-semibold text-[#686868] uppercase tracking-widest flex items-center gap-2">
                      <Users2 size={12} /> Équipe
                    </h4>
                    {selectedTech.teamId ? (
                      <div className="flex items-center justify-between p-3 bg-purple-50 border border-purple-100 rounded-lg">
                        <span className="text-xs font-semibold text-purple-700">{myTeams.find((t: Team) => t.id === selectedTech.teamId)?.name}</span>
                        <button onClick={() => handleAssignToTeam(selectedTech.id, null)} className="text-[11px] text-purple-600 hover:underline">Retirer</button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {myTeams.map((team: Team) => (
                          <button
                            key={team.id}
                            onClick={() => handleAssignToTeam(selectedTech.id, team.id)}
                            className="px-3 py-1.5 bg-white border border-[#e5e5e5] hover:bg-purple-50 rounded-lg text-[11px] font-semibold"
                          >
                            {team.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </section>
                )}

                {/* Parts Usage History */}
                <section className="space-y-3">
                  <h4 className="text-[12px] font-semibold text-[#686868] uppercase tracking-widest flex items-center gap-2">
                    <Package size={12} /> Pièces Utilisées
                  </h4>
                  {(() => {
                    const partsUsage = getTechPartsUsage(selectedTech.id);
                    if (partsUsage.length === 0) {
                      return <p className="text-xs text-[#686868] italic">Aucune pièce utilisée enregistrée</p>;
                    }
                    return (
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {partsUsage.slice(0, 5).map((part, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 bg-white border border-[#e5e5e5] rounded-lg">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                                <Package size={14} className="text-blue-500" />
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-[#1c1c1c] truncate max-w-[120px]">{part.name}</p>
                                <p className="text-[11px] text-[#686868]">{part.quantity} unité(s)</p>
                              </div>
                            </div>
                            <p className="text-xs font-semibold text-[#3ecf8e]">{part.totalCost.toLocaleString()} F</p>
                          </div>
                        ))}
                        {partsUsage.length > 5 && (
                          <p className="text-[11px] text-[#686868] text-center">+{partsUsage.length - 5} autres pièces...</p>
                        )}
                      </div>
                    );
                  })()}
                </section>
              </div>
            )}

            {/* TAB: PLANNING */}
            {activeTab === 'planning' && (
              <div className="space-y-4 animate-sb-entry">
                <div className="flex items-center justify-between">
                  <h4 className="text-[12px] font-semibold text-[#686868] uppercase tracking-widest">Planning Hebdomadaire</h4>
                  <button
                    onClick={() => setIsScheduleModalOpen(true)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-[#3ecf8e] text-white rounded-lg text-[11px] font-semibold"
                  >
                    <Plus size={12} /> Ajouter
                  </button>
                </div>

                {/* Week View */}
                <div className="grid grid-cols-7 gap-1">
                  {getWeekDays().map((day, idx) => {
                    const daySchedules = getSchedulesForDay(selectedTech.id, day);
                    const isToday = day.toDateString() === new Date().toDateString();
                    return (
                      <div key={idx} className={`p-2 rounded-lg border ${isToday ? 'bg-[#3ecf8e]/10 border-[#3ecf8e]' : 'bg-white border-[#e5e5e5]'}`}>
                        <p className="text-[9px] font-semibold text-center uppercase">{['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'][day.getDay()]}</p>
                        <p className="text-[11px] text-center text-[#686868]">{day.getDate()}</p>
                        <div className="mt-2 space-y-1">
                          {daySchedules.slice(0, 2).map((s: any) => (
                            <div key={s.id} className={`p-1 rounded text-[9px] font-semibold truncate ${s.type === 'INTERVENTION' ? 'bg-blue-100 text-blue-700' :
                              s.type === 'MAINTENANCE' ? 'bg-amber-100 text-amber-700' :
                                s.type === 'CONGÉ' ? 'bg-red-100 text-red-700' :
                                  'bg-gray-100 text-gray-700'
                              }`}>
                              {s.title}
                            </div>
                          ))}
                          {daySchedules.length > 2 && (
                            <p className="text-[9px] text-[#686868] text-center">+{daySchedules.length - 2}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Carte des interventions du jour */}
                {(() => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const tomorrow = new Date(today);
                  tomorrow.setDate(tomorrow.getDate() + 1);

                  const todayTickets = filterTicketsByDate((tickets || [])).filter((t: Ticket) => {
                    if (t.assignedTechnicianId !== selectedTech.id) return false;
                    if (t.status === 'Fermé') return false;
                    const ticketDate = new Date(t.createdAt);
                    return ticketDate >= today && ticketDate < tomorrow;
                  });

                  if (todayTickets.length === 0) return null;

                  return (
                    <div className="space-y-2">
                      <h5 className="text-[11px] font-semibold text-[#686868] uppercase flex items-center gap-1">
                        <MapPin size={12} /> Itinéraire du jour ({todayTickets.length} interventions)
                      </h5>
                      <div className="space-y-2 max-h-48 overflow-y-auto bg-blue-50/50 border border-blue-100 rounded-lg p-3">
                        {todayTickets.map((ticket: Ticket, idx: number) => (
                          <div key={ticket.id} className="flex items-center gap-3 p-2 bg-white rounded-lg border border-blue-100">
                            <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0">
                              {idx + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[12px] font-semibold text-[#1c1c1c] truncate">{ticket.customerName}</p>
                              <p className="text-[11px] text-[#686868] truncate">{ticket.location || 'Adresse non spécifiée'}</p>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-semibold shrink-0 ${ticket.priority === 'Urgent' ? 'bg-red-100 text-red-700' :
                              ticket.priority === 'Haute' ? 'bg-orange-100 text-orange-700' :
                                ticket.priority === 'Moyenne' ? 'bg-amber-100 text-amber-700' :
                                  'bg-green-100 text-green-700'
                              }`}>
                              {ticket.priority}
                            </span>
                          </div>
                        ))}
                        {todayTickets.length > 1 && (
                          <div className="text-center pt-1">
                            <p className="text-[9px] text-blue-600 font-semibold">💡 {todayTickets.length} arrêts • Optimiser l'itinéraire</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Upcoming Events */}
                <div className="space-y-2">
                  <h5 className="text-[11px] font-semibold text-[#686868] uppercase">Prochains événements</h5>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {getTechSchedules(selectedTech.id).slice(0, 5).map((s: any) => (
                      <div key={s.id} className="flex items-center justify-between p-3 bg-white border border-[#e5e5e5] rounded-lg">
                        <div>
                          <p className="text-xs font-semibold">{s.title}</p>
                          <p className="text-[11px] text-[#686868]">{new Date(s.startTime).toLocaleDateString('fr-FR')} {new Date(s.startTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-semibold ${s.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                          s.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>{s.type}</span>
                      </div>
                    ))}
                    {getTechSchedules(selectedTech.id).length === 0 && (
                      <p className="text-xs text-[#686868] italic">Aucun événement planifié</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: PERFORMANCE */}
            {activeTab === 'performance' && (
              <div className="space-y-4 animate-sb-entry">
                {(() => {
                  const metrics = getTechMetrics(selectedTech.id);
                  const scores = calculatePerformanceScore(selectedTech);
                  if (!metrics) return <p className="text-xs text-[#686868] italic text-center py-8">Aucune métrique pour cette période</p>;
                  return (
                    <>
                      {/* Score Cards */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-4 bg-[#f0fdf4] border border-[#dcfce7] rounded-lg text-center">
                          <p className="text-[9px] font-semibold text-[#686868] uppercase">Tickets Résolus</p>
                          <p className="text-2xl font-semibold text-[#16a34a]">{metrics.ticketsResolved}</p>
                        </div>
                        <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg text-center">
                          <p className="text-[9px] font-semibold text-[#686868] uppercase">Revenus Générés</p>
                          <p className="text-2xl font-semibold text-blue-600">{((metrics.revenueGenerated || 0) / 100).toLocaleString()} F</p>
                        </div>
                      </div>

                      {/* Metrics Bars */}
                      <div className="space-y-4">
                        <h4 className="text-[12px] font-semibold text-[#686868] uppercase tracking-widest">Métriques Détaillées</h4>

                        <div className="space-y-3">
                          <div>
                            <div className="flex justify-between text-[11px] mb-1">
                              <span className="font-semibold">First Fix Rate</span>
                              <span className="text-[#3ecf8e]">{metrics.firstFixRate?.toFixed(0)}%</span>
                            </div>
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-[#3ecf8e] rounded-full" style={{ width: `${metrics.firstFixRate}%` }} />
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between text-[11px] mb-1">
                              <span className="font-semibold">Temps Moyen Résolution</span>
                              <span className="text-blue-500">{Math.round((metrics.avgResolutionTime || 0) / 60)}h</span>
                            </div>
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, 100 - ((metrics.avgResolutionTime || 0) / 360))}%` }} />
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between text-[11px] mb-1">
                              <span className="font-semibold">Satisfaction Client (NPS)</span>
                              <span className="text-amber-500">{metrics.customerSatisfaction?.toFixed(1)}/10</span>
                            </div>
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-amber-500 rounded-full" style={{ width: `${(metrics.customerSatisfaction || 0) * 10}%` }} />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Period Info */}
                      <div className="p-3 bg-gray-50 border border-gray-100 rounded-lg">
                        <p className="text-[11px] text-[#686868] text-center">
                          Période: <span className="font-semibold">{metrics.period}</span>
                        </p>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-4">
              <button onClick={() => { setEditingTech(selectedTech); setIsModalOpen(true); }} className="btn-sb-outline h-9 text-[11px] font-semibold uppercase">Modifier</button>
              <button onClick={() => handleDeleteTech(selectedTech.id)} className="btn-sb-outline h-9 text-[11px] font-semibold uppercase text-red-500 hover:bg-red-50 border-red-100">Supprimer</button>
            </div>
          </div>
        )}
      </Drawer>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingTech ? "Mise à jour Technicien" : "Ouverture Fiche RH Technicien"}>
        <form onSubmit={handleSaveTech} className="space-y-5 p-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5"><label className="text-[11px] font-semibold text-[#686868] uppercase">Identité Technicien</label><input name="name" type="text" defaultValue={editingTech?.name} placeholder="Nom complet" required className="w-full" /></div>
            <div className="space-y-1.5"><label className="text-[11px] font-semibold text-[#686868] uppercase">Email Pro</label><input name="email" type="email" defaultValue={editingTech?.email} placeholder="email@royalplaza.ga" required className="w-full" /></div>
            <div className="space-y-1.5"><label className="text-[11px] font-semibold text-[#686868] uppercase">Mobile</label><input name="phone" type="tel" defaultValue={editingTech?.phone} placeholder="+241 ..." required className="w-full" /></div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-[#686868] uppercase">Showroom</label>
              <select name="showroom" defaultValue={editingTech?.showroom || 'Glass'} className="w-full">
                <option value="Glass">Plaza Glass</option>
                <option value="Oloumi">Plaza Oloumi</option>
                <option value="Bord de mer">Plaza Bord de mer</option>
                <option value="Libreville">Mobile</option>
              </select>
            </div>
            {/* Enhanced fields */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-[#686868] uppercase">Remplaçant (Backup)</label>
              <select name="backupTechnicianId" defaultValue={editingTech?.backupTechnicianId || ''} className="w-full">
                <option value="">-- Aucun --</option>
                {technicians?.filter((t: Technician) => t.id !== editingTech?.id).map((t: Technician) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-[#686868] uppercase">Capacité max (tickets)</label>
              <input name="maxWorkload" type="number" min="1" max="20" defaultValue={editingTech?.maxWorkload || 5} className="w-full" />
            </div>
            {!editingTech && (
              <div className="space-y-1.5 md:col-span-2 bg-[#3ecf8e]/5 p-4 rounded-xl border border-[#3ecf8e]/10">
                <label className="text-[10px] font-bold text-[#1c1c1c] uppercase tracking-widest flex items-center gap-2">
                  <Lock size={12} className="text-[#3ecf8e]" />
                  Mot de passe provisoire (Création de compte)
                </label>
                <input
                  name="password"
                  type="text" // Texte clair pour que l'admin puisse le noter/partager au tech
                  placeholder="Définir un mot de passe pour la première connexion"
                  required={!editingTech}
                  className="w-full h-11 bg-white border-[#e5e5e5] focus:border-[#3ecf8e] text-sm px-4 rounded-xl mt-2"
                />
                <p className="text-[9px] text-[#686868] mt-2 font-semibold">Ce mot de passe sera utilisé par le technicien lors de sa première connexion.</p>
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-[#686868] uppercase">Certifications (séparées par virgule)</label>
            <input
              name="certifications"
              type="text"
              defaultValue={editingTech?.certifications?.join(', ') || ''}
              placeholder="Ex: iPhone Expert, Samsung Certifié, Interventions urgentes"
              className="w-full"
            />
          </div>
          <div className="flex justify-end gap-3 pt-6 border-t border-[#e5e5e5]">
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn-sb-outline">Annuler</button>
            <button type="submit" disabled={isSaving} className="btn-sb-primary h-9 px-10 shadow-md">{isSaving ? <RefreshCw className="animate-spin" size={16} /> : 'Valider Profil'}</button>
          </div>
        </form>
      </Modal>

      {/* Team Management Modal for Agents */}
      <Modal isOpen={isTeamModalOpen} onClose={() => setIsTeamModalOpen(false)} title="Gestion des Équipes">
        <div className="space-y-4">
          {/* Create Team Form */}
          <form onSubmit={handleSaveTeam} className="space-y-4 p-4 bg-purple-50 border border-purple-100 rounded-lg">
            <h3 className="text-[12px] font-semibold text-purple-700 uppercase tracking-widest">
              {editingTeam ? 'Modifier Équipe' : 'Nouvelle Équipe'}
            </h3>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[#686868] uppercase">Nom de l'équipe</label>
                <input
                  name="teamName"
                  type="text"
                  defaultValue={editingTeam?.name}
                  placeholder="Ex: Équipe A - SAV Glass"
                  required
                  className="w-full h-11 px-4 rounded-lg border-[#e5e5e5]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[#686868] uppercase">Description</label>
                <input
                  name="teamDescription"
                  type="text"
                  defaultValue={editingTeam?.description}
                  placeholder="Description optionnelle..."
                  className="w-full h-11 px-4 rounded-lg border-[#e5e5e5]"
                />
              </div>
            </div>
            <div className="flex gap-2">
              {editingTeam && (
                <button
                  type="button"
                  onClick={() => setEditingTeam(null)}
                  className="btn-sb-outline flex-1 h-8 text-[12px]"
                >
                  Annuler Modif
                </button>
              )}
              <button
                type="submit"
                disabled={isTeamSaving}
                className="btn-sb-primary flex-1 h-8 bg-purple-600 hover:bg-purple-700 text-[12px]"
              >
                {isTeamSaving ? <RefreshCw className="animate-spin" size={14} /> : editingTeam ? 'Sauvegarder' : 'Créer Équipe'}
              </button>
            </div>
          </form>

          {/* Team List */}
          <div className="space-y-3">
            <h3 className="text-[12px] font-semibold text-[#1c1c1c] uppercase tracking-widest">
              Mes Équipes ({myTeams.length})
            </h3>
            {myTeams.length === 0 ? (
              <p className="text-[12px] text-[#686868] text-center py-6">Aucune équipe créée. Créez votre première équipe ci-dessus.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {myTeams.map((team: Team) => {
                  const teamTechs = (technicians || []).filter((t: Technician) => t.teamId === team.id);
                  return (
                    <div key={team.id} className="flex items-center justify-between p-3 bg-white border border-[#e5e5e5] rounded-lg">
                      <div>
                        <p className="text-[13px] font-semibold text-[#1c1c1c]">{team.name}</p>
                        {team.description && <p className="text-[11px] text-[#686868]">{team.description}</p>}
                        <p className="text-[9px] text-purple-600 font-semibold mt-1">{teamTechs.length} technicien{teamTechs.length > 1 ? 's' : ''}</p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setEditingTeam(team)}
                          className="p-2 text-[#686868] hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
                          title="Modifier"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteTeam(team.id)}
                          className="p-2 text-[#686868] hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          title="Supprimer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-[#e5e5e5]">
            <button
              type="button"
              onClick={() => setIsTeamModalOpen(false)}
              className="btn-sb-outline w-full h-9"
            >
              Fermer
            </button>
          </div>
        </div>
      </Modal>

      {/* Schedule Modal */}
      <Modal isOpen={isScheduleModalOpen} onClose={() => { setIsScheduleModalOpen(false); setEditingSchedule(null); }} title="Planifier un événement" size="md">
        <form onSubmit={(e) => {
          e.preventDefault();
          if (selectedTech) {
            const formData = new FormData(e.currentTarget);
            const schedule: TechnicianSchedule = {
              id: editingSchedule?.id || `SCHED-${Date.now()}`,
              technicianId: selectedTech.id,
              ticketId: formData.get('ticketId') as string || undefined,
              title: formData.get('title') as string,
              startTime: formData.get('startTime') as string,
              endTime: formData.get('endTime') as string,
              type: formData.get('type') as any,
              status: 'PLANNED'
            };
            saveTechSchedule(schedule);
            setIsScheduleModalOpen(false);
            addNotification({ title: 'Planning', message: 'Événement planifié', type: 'success' });
          }
        }} className="space-y-4">
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-[#686868] uppercase">Titre</label>
              <input name="title" required className="w-full h-11 rounded-lg border border-[#e5e5e5] px-4" placeholder="Ex: Intervention Client X" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[#686868] uppercase">Début</label>
                <input name="startTime" type="datetime-local" required className="w-full h-11 rounded-lg border border-[#e5e5e5] px-4 text-xs" />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[#686868] uppercase">Fin</label>
                <input name="endTime" type="datetime-local" required className="w-full h-11 rounded-lg border border-[#e5e5e5] px-4 text-xs" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-[#686868] uppercase">Type</label>
              <select name="type" required className="w-full h-11 rounded-lg border border-[#e5e5e5] px-4 text-xs">
                <option value="INTERVENTION">Intervention</option>
                <option value="MAINTENANCE">Maintenance</option>
                <option value="FORMATION">Formation</option>
                <option value="CONGÉ">Congé</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => { setIsScheduleModalOpen(false); setEditingSchedule(null); }} className="btn-sb-outline h-9 px-6">Annuler</button>
            <button type="submit" className="btn-sb-primary h-9 px-6">Planifier</button>
          </div>
        </form>
      </Modal>
      {/* ======= MODAL: CONFIRMATION SUPPRESSION ======= */}
      <ConfirmModal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleConfirmDelete}
        message={deleteConfirm?.message || ''}
      />
    </div>
  );
};

export default Technicians;
