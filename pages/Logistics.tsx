import React, { useState, useMemo, useEffect } from 'react';
import { Truck, Search, Plus, RefreshCw, Edit3, Trash2, Save, X, AlertCircle, CheckCircle2, BarChart3, List, Calendar, TrendingUp, TrendingDown, Activity, Users, User, Link2, Phone, Mail, Fingerprint, Clock, MapPin, TicketIcon } from 'lucide-react';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell, PieChart, Pie } from 'recharts';
import { Vehicle, TransportMission, Ticket, Technician, Driver } from '../types';
import { useNotifications, useUser } from '../App';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import { ApiService } from '../services/apiService';

const VEHICLE_STATUSES: { value: Vehicle['status']; label: string; color: string }[] = [
  { value: 'Disponible', label: 'Disponible', color: '#16a34a' },
  { value: 'En course', label: 'En course', color: '#d97706' },
  { value: 'En maintenance', label: 'En maintenance', color: '#dc2626' },
  { value: 'En panne', label: 'En panne', color: '#7f1d1d' },
];

const STATUS_BADGES: Record<Vehicle['status'], { label: string; class: string }> = {
  'Disponible': { label: 'Disponible', class: 'bg-[#f0fdf4] text-[#16a34a]' },
  'En course': { label: 'En course', class: 'bg-amber-50 text-amber-600' },
  'En maintenance': { label: 'En maintenance', class: 'bg-red-50 text-red-500' },
  'En panne': { label: 'En panne', class: 'bg-[#7f1d1d]/10 text-[#7f1d1d]' },
};

const DRIVER_STATUSES: { value: Driver['status']; label: string; class: string }[] = [
  { value: 'Disponible', label: 'Disponible', class: 'bg-[#f0fdf4] text-[#16a34a]' },
  { value: 'En mission', label: 'En mission', class: 'bg-amber-50 text-amber-600' },
  { value: 'Absent', label: 'Absent', class: 'bg-red-50 text-red-500' },
];

type SubTab = 'vehicules' | 'chauffeurs' | 'affectations';

const Logistics: React.FC = () => {
  const { addNotification } = (() => { try { return useNotifications(); } catch { return { addNotification: () => {} }; } })();
  const { currentUser } = (() => { try { return useUser(); } catch { return { currentUser: null }; } })();

  const canManage = currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER' || currentUser?.role === 'AGENT';
  const isManager = currentUser?.role === 'MANAGER' || currentUser?.role === 'ADMIN';

  // --- Data state ---
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [missions, setMissions] = useState<TransportMission[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // --- UI state ---
  const [subTab, setSubTab] = useState<SubTab>('vehicules');
  const [searchTerm, setSearchTerm] = useState('');

  // --- Vehicle state ---
  const [vehicleTab, setVehicleTab] = useState<'liste' | 'stats' | 'historique'>('liste');
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [isSavingVehicle, setIsSavingVehicle] = useState(false);
  const [deleteVehicleConfirm, setDeleteVehicleConfirm] = useState<{ id: string; label: string } | null>(null);
  const [vehicleForm, setVehicleForm] = useState({ plateNumber: '', model: '', status: 'Disponible' as Vehicle['status'], driver: '' });
  const [historyVehicle, setHistoryVehicle] = useState<Vehicle | null>(null);

  // --- Driver state ---
  const [driverTab, setDriverTab] = useState<'liste' | 'stats'>('liste');
  const [driverSearch, setDriverSearch] = useState('');
  const [driverStatusFilter, setDriverStatusFilter] = useState<string>('');
  const [isDriverModalOpen, setIsDriverModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [isSavingDriver, setIsSavingDriver] = useState(false);
  const [deleteDriverConfirm, setDeleteDriverConfirm] = useState<{ id: string; label: string } | null>(null);
  const [driverForm, setDriverForm] = useState({ name: '', phone: '', email: '', licenseNumber: '', status: 'Disponible' as Driver['status'] });

  // --- Assignment state ---
  const [assignmentVehicleId, setAssignmentVehicleId] = useState<string | null>(null);
  const [assignmentDriverId, setAssignmentDriverId] = useState<string>('');

  // ============== LOAD ==============
  const loadData = async () => {
    try {
      const [vData, dData, mData, tData, techData] = await Promise.all([
        ApiService.vehicles.getAll(),
        ApiService.drivers.getAll(),
        ApiService.transportMissions.getAll(),
        ApiService.tickets.getAll(),
        ApiService.technicians.getAll(),
      ]);
      setVehicles(vData || []);
      setDrivers(dData || []);
      setMissions(mData || []);
      setTickets(tData || []);
      setTechnicians(techData || []);
    } catch (e) {
      console.error('Error loading logistics data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const refresh = () => { setIsSyncing(true); loadData().finally(() => setIsSyncing(false)); };

  // ============== VEHICLE LOGIC ==============
  const filteredVehicles = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return vehicles.filter((v: Vehicle) =>
      !q || v.plateNumber.toLowerCase().includes(q) || v.model.toLowerCase().includes(q) || v.driver?.toLowerCase().includes(q)
    );
  }, [vehicles, searchTerm]);

  const openNewVehicle = () => {
    setEditingVehicle(null);
    setVehicleForm({ plateNumber: '', model: '', status: 'Disponible', driver: '' });
    setIsVehicleModalOpen(true);
  };

  const openEditVehicle = (v: Vehicle) => {
    setEditingVehicle(v);
    setVehicleForm({ plateNumber: v.plateNumber, model: v.model, status: v.status, driver: v.driver || '' });
    setIsVehicleModalOpen(true);
  };

  const handleSaveVehicle = async () => {
    if (!vehicleForm.plateNumber.trim() || !vehicleForm.model.trim()) {
      addNotification({ title: 'Champs requis', message: 'Immatriculation et Modèle sont obligatoires.', type: 'warning' });
      return;
    }
    setIsSavingVehicle(true);
    try {
      const vehicle: Vehicle = {
        id: editingVehicle?.id || `VH-${Date.now()}`,
        plateNumber: vehicleForm.plateNumber.trim(),
        model: vehicleForm.model.trim(),
        status: vehicleForm.status,
        driver: vehicleForm.driver.trim() || undefined,
      };
      await ApiService.vehicles.saveAll([vehicle]);
      addNotification({ title: editingVehicle ? 'Véhicule modifié' : 'Véhicule ajouté', message: `${vehicle.plateNumber} — OK.`, type: 'success' });
      setIsVehicleModalOpen(false);
      await loadData();
    } catch (err: any) {
      addNotification({ title: 'Erreur', message: err?.message || 'Échec de l\'enregistrement.', type: 'error' });
    } finally {
      setIsSavingVehicle(false);
    }
  };

  const handleDeleteVehicle = async () => {
    if (!deleteVehicleConfirm) return;
    try {
      await ApiService.vehicles.delete(deleteVehicleConfirm.id);
      addNotification({ title: 'Supprimé', message: 'Véhicule supprimé.', type: 'success' });
      await loadData();
    } catch {
      addNotification({ title: 'Erreur', message: 'Échec de la suppression.', type: 'error' });
    } finally {
      setDeleteVehicleConfirm(null);
    }
  };

  const getVehicleMission = (vehicleId: string): TransportMission | null => {
    const active = missions.filter((m: TransportMission) =>
      m.vehicleId === vehicleId && m.status !== 'Terminé'
    );
    return active.length > 0 ? active.sort((a, b) => b.departureTime.localeCompare(a.departureTime))[0] : null;
  };

  const getTicketInfo = (ticketId: string): Ticket | null => {
    return tickets.find((t: Ticket) => t.id === ticketId) || null;
  };

  const getTechName = (techId?: string): string => {
    if (!techId) return '—';
    const tech = technicians.find((t: Technician) => t.id === techId);
    return tech?.name || techId;
  };

  // --- Vehicle Stats ---
  const now = new Date();
  const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - now.getDay()); startOfWeek.setHours(0,0,0,0);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const vehicleStats = useMemo(() => {
    const statusCount = { 'Disponible': 0, 'En course': 0, 'En maintenance': 0, 'En panne': 0 } as Record<string, number>;
    vehicles.forEach((v: Vehicle) => { statusCount[v.status] = (statusCount[v.status] || 0) + 1; });

    const missionsThisMonth = missions.filter((m: TransportMission) => new Date(m.departureTime) >= startOfMonth);
    const completedMissions = missions.filter((m: TransportMission) => m.status === 'Terminé');

    const pieData = VEHICLE_STATUSES.map(s => ({ name: s.label, value: statusCount[s.value] || 0, color: s.color })).filter(d => d.value > 0);

    const missionsByDay: Record<string, number> = {};
    completedMissions.forEach((m: TransportMission) => {
      const day = new Date(m.departureTime).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
      missionsByDay[day] = (missionsByDay[day] || 0) + 1;
    });
    const dailyData = Object.entries(missionsByDay).slice(-14).map(([day, count]) => ({ day, count }));

    const vehicleMissionCount: Record<string, number> = {};
    completedMissions.forEach((m: TransportMission) => {
      vehicleMissionCount[m.vehicleId] = (vehicleMissionCount[m.vehicleId] || 0) + 1;
    });
    const topVehicles = Object.entries(vehicleMissionCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, count]) => {
        const v = vehicles.find((x: Vehicle) => x.id === id);
        return { name: v ? `${v.model} (${v.plateNumber})` : id, count };
      });

    return { statusCount, pieData, missionsThisMonth: missionsThisMonth.length, completedMissions: completedMissions.length, dailyData, topVehicles };
  }, [vehicles, missions]);

  // --- Driver Stats ---
  const driverStats = useMemo(() => {
    const statusCount = { 'Disponible': 0, 'En mission': 0, 'Absent': 0 } as Record<string, number>;
    drivers.forEach((d: Driver) => { statusCount[d.status] = (statusCount[d.status] || 0) + 1; });

    const missionsThisMonth = missions.filter((m: TransportMission) => new Date(m.departureTime) >= startOfMonth);
    const completedMissions = missions.filter((m: TransportMission) => m.status === 'Terminé');

    const pieData = DRIVER_STATUSES.map(s => ({
      name: s.label,
      value: statusCount[s.value] || 0,
      color: s.value === 'Disponible' ? '#16a34a' : s.value === 'En mission' ? '#d97706' : '#dc2626'
    })).filter(d => d.value > 0);

    const driverMissionCount: Record<string, number> = {};
    completedMissions.forEach((m: TransportMission) => {
      if (!m.driver) return;
      driverMissionCount[m.driver] = (driverMissionCount[m.driver] || 0) + 1;
    });
    const topDrivers = Object.entries(driverMissionCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => {
        const d = drivers.find((x: Driver) => x.name === name);
        return { name, count, phone: d?.phone };
      });

    return { statusCount, pieData, missionsThisMonth: missionsThisMonth.length, topDrivers };
  }, [drivers, missions]);

  // ============== DRIVER LOGIC ==============
  const getDriverActiveMission = (driverName: string): TransportMission | null => {
    const active = missions.filter((m: TransportMission) =>
      m.driver === driverName && m.status !== 'Terminé'
    );
    return active.length > 0 ? active.sort((a, b) => b.departureTime.localeCompare(a.departureTime))[0] : null;
  };

  const filteredDrivers = useMemo(() => {
    const q = driverSearch.toLowerCase();
    return drivers.filter((d: Driver) => {
      if (driverStatusFilter && d.status !== driverStatusFilter) return false;
      return !q || d.name.toLowerCase().includes(q) || d.phone?.toLowerCase().includes(q) || d.licenseNumber?.toLowerCase().includes(q);
    });
  }, [drivers, driverSearch, driverStatusFilter]);

  const openNewDriver = () => {
    setEditingDriver(null);
    setDriverForm({ name: '', phone: '', email: '', licenseNumber: '', status: 'Disponible' });
    setIsDriverModalOpen(true);
  };

  const openEditDriver = (d: Driver) => {
    setEditingDriver(d);
    setDriverForm({ name: d.name, phone: d.phone || '', email: d.email || '', licenseNumber: d.licenseNumber || '', status: d.status });
    setIsDriverModalOpen(true);
  };

  const handleSaveDriver = async () => {
    if (!driverForm.name.trim()) {
      addNotification({ title: 'Champ requis', message: 'Le nom du chauffeur est obligatoire.', type: 'warning' });
      return;
    }
    setIsSavingDriver(true);
    try {
      const driver: Driver = {
        id: editingDriver?.id || `DR-${Date.now()}`,
        name: driverForm.name.trim(),
        phone: driverForm.phone.trim() || undefined,
        email: driverForm.email.trim() || undefined,
        licenseNumber: driverForm.licenseNumber.trim() || undefined,
        status: driverForm.status,
        vehicleId: editingDriver?.vehicleId,
      };
      await ApiService.drivers.saveAll([driver]);
      addNotification({ title: editingDriver ? 'Chauffeur modifié' : 'Chauffeur ajouté', message: `${driver.name} — OK.`, type: 'success' });
      setIsDriverModalOpen(false);
      await loadData();
    } catch (err: any) {
      console.error('Save driver error:', err);
      addNotification({ title: 'Erreur', message: err?.message || 'Échec de l\'enregistrement.', type: 'error' });
    } finally {
      setIsSavingDriver(false);
    }
  };

  const handleDeleteDriver = async () => {
    if (!deleteDriverConfirm) return;
    try {
      const driver = drivers.find((d: Driver) => d.id === deleteDriverConfirm.id);
      if (driver?.vehicleId) {
        const vehicle = vehicles.find((v: Vehicle) => v.id === driver.vehicleId);
        if (vehicle) {
          vehicle.driver = undefined;
          await ApiService.vehicles.saveAll([vehicle]);
        }
      }
      await ApiService.drivers.delete(deleteDriverConfirm.id);
      addNotification({ title: 'Supprimé', message: 'Chauffeur supprimé.', type: 'success' });
      await loadData();
    } catch (err: any) {
      console.error('Delete driver error:', err);
      addNotification({ title: 'Erreur', message: err?.message || 'Échec de la suppression.', type: 'error' });
    } finally {
      setDeleteDriverConfirm(null);
    }
  };

  // ============== ASSIGNMENT LOGIC ==============
  const handleAssignDriverToVehicle = async (vehicleId: string, newDriverId: string) => {
    try {
      const vehicle = vehicles.find((v: Vehicle) => v.id === vehicleId);
      if (!vehicle) return;

      const oldDriver = drivers.find((d: Driver) => d.vehicleId === vehicleId);
      const newDriver = newDriverId ? drivers.find((d: Driver) => d.id === newDriverId) : null;

      const updates: any[] = [];

      // Unassign old driver
      if (oldDriver && oldDriver.id !== newDriverId) {
        updates.push(ApiService.drivers.saveAll([{ ...oldDriver, vehicleId: undefined }]));
      }

      // Update vehicle driver field
      const updatedVehicle = { ...vehicle, driver: newDriver?.name };
      updates.push(ApiService.vehicles.saveAll([updatedVehicle]));

      // Assign new driver's vehicleId
      if (newDriver) {
        updates.push(ApiService.drivers.saveAll([{ ...newDriver, vehicleId }]));
      }

      await Promise.all(updates);
      addNotification({ title: 'Affectation mise à jour', message: `${updatedVehicle.plateNumber} → ${newDriver?.name || 'Aucun'}`, type: 'success' });
      await loadData();
      setAssignmentVehicleId(null);
      setAssignmentDriverId('');
    } catch (err: any) {
      addNotification({ title: 'Erreur', message: err?.message || 'Échec de l\'affectation.', type: 'error' });
    }
  };

  const startAssignment = (vehicleId: string, currentDriverId?: string) => {
    setAssignmentVehicleId(vehicleId);
    setAssignmentDriverId(currentDriverId || '');
  };

  // ============== SUB-TABS ==============
  const subTabs: { id: SubTab; label: string; icon: React.ReactNode }[] = [
    { id: 'vehicules', label: 'Véhicules', icon: <Truck size={14} /> },
    { id: 'chauffeurs', label: 'Chauffeurs', icon: <User size={14} /> },
    { id: 'affectations', label: 'Affectations', icon: <Link2 size={14} /> },
  ];

  // Total counts for header
  const totalDrivers = drivers.length;
  const availableDrivers = drivers.filter((d: Driver) => d.status === 'Disponible').length;
  const assignedVehicles = vehicles.filter((v: Vehicle) => v.driver).length;

  // ============== RENDER ==============
  return (
    <div className="max-w-7xl mx-auto space-y-5 animate-sb-entry pb-20">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#3ecf8e]/10 rounded-xl flex items-center justify-center text-[#3ecf8e]">
            <Truck size={18} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Logistique</h1>
            <p className="text-xs text-[#686868] font-semibold uppercase tracking-wider mt-0.5">
              {vehicles.length} véhicules • {totalDrivers} chauffeurs • {assignedVehicles} affectés
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {subTab === 'vehicules' && canManage && (
            <button onClick={openNewVehicle} className="btn-sb-primary h-10 px-4">
              <Plus size={16} /> Nouveau véhicule
            </button>
          )}
          {subTab === 'chauffeurs' && canManage && (
            <button onClick={openNewDriver} className="btn-sb-primary h-10 px-4">
              <Plus size={16} /> Nouveau chauffeur
            </button>
          )}
          <button onClick={refresh} className="btn-sb-outline h-10 px-4">
            <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      {/* Sub-tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit overflow-x-auto">
        {subTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setSubTab(tab.id)}
            className={`flex items-center gap-2 px-6 py-2 text-[9px] font-semibold uppercase tracking-widest rounded-lg transition-all ${
              subTab === tab.id ? 'bg-white shadow-sm text-[#1c1c1c]' : 'text-[#686868] hover:text-[#1c1c1c]'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ============ VÉHICULES ============ */}
      {subTab === 'vehicules' && (
        <>
          {/* Vehicle sub-tabs: Liste / Stats / Historique */}
          <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit overflow-x-auto">
            {[
              { id: 'liste' as const, label: 'Liste', icon: <List size={14} /> },
              { id: 'historique' as const, label: 'Historique', icon: <Clock size={14} /> },
              ...(isManager ? [{ id: 'stats' as const, label: 'Statistiques', icon: <BarChart3 size={14} /> }] : []),
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setVehicleTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-1.5 text-[9px] font-semibold uppercase tracking-widest rounded-lg transition-all ${
                  vehicleTab === tab.id ? 'bg-white shadow-sm text-[#1c1c1c]' : 'text-[#686868] hover:text-[#1c1c1c]'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Stats */}
          {vehicleTab === 'stats' && isManager && (
            <div className="space-y-4 animate-sb-entry">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Disponibles', value: vehicleStats.statusCount['Disponible'] || 0, icon: <CheckCircle2 size={16} />, color: 'text-[#16a34a]', bg: 'bg-[#f0fdf4]' },
                  { label: 'En course', value: vehicleStats.statusCount['En course'] || 0, icon: <TrendingUp size={16} />, color: 'text-amber-600', bg: 'bg-amber-50' },
                  { label: 'Maintenance / Panne', value: (vehicleStats.statusCount['En maintenance'] || 0) + (vehicleStats.statusCount['En panne'] || 0), icon: <AlertCircle size={16} />, color: 'text-red-500', bg: 'bg-red-50' },
                  { label: 'Missions / mois', value: vehicleStats.missionsThisMonth, icon: <Calendar size={16} />, color: 'text-[#3ecf8e]', bg: 'bg-[#f0fdf4]' },
                ].map(kpi => (
                  <div key={kpi.label} className="bg-white border border-[#e5e5e5] rounded-xl p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <div className={`p-2 rounded-lg ${kpi.bg}`}>
                        <span className={kpi.color}>{kpi.icon}</span>
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-[#1c1c1c]">{kpi.value}</p>
                    <p className="text-[11px] font-semibold text-[#686868] uppercase tracking-wider mt-1">{kpi.label}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white border border-[#e5e5e5] rounded-xl p-4 shadow-sm">
                  <h3 className="text-[11px] font-semibold text-[#686868] uppercase tracking-widest flex items-center gap-2 mb-4">
                    <Activity size={12} className="text-[#3ecf8e]" /> Répartition par statut
                  </h3>
                  {vehicleStats.pieData.length > 0 ? (
                    <div className="flex items-center gap-6">
                      <div className="w-48 h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={vehicleStats.pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3}>
                              {vehicleStats.pieData.map((entry, idx) => (
                                <Cell key={idx} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="space-y-2">
                        {VEHICLE_STATUSES.map(s => {
                          const count = vehicleStats.statusCount[s.value] || 0;
                          if (count === 0) return null;
                          return (
                            <div key={s.value} className="flex items-center gap-2 text-[12px] font-semibold">
                              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                              <span className="text-[#686868]">{s.label}</span>
                              <span className="text-[#1c1c1c] ml-auto">{count}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-[#686868] text-center py-8">Aucune donnée</p>
                  )}
                </div>
                <div className="bg-white border border-[#e5e5e5] rounded-xl p-4 shadow-sm">
                  <h3 className="text-[11px] font-semibold text-[#686868] uppercase tracking-widest flex items-center gap-2 mb-4">
                    <TrendingUp size={12} className="text-[#3ecf8e]" /> Véhicules les plus utilisés
                  </h3>
                  {vehicleStats.topVehicles.length > 0 ? (
                    <div className="space-y-3">
                      {vehicleStats.topVehicles.map((v, idx) => (
                        <div key={v.name} className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-lg bg-[#f8f9fa] flex items-center justify-center text-[10px] font-bold text-[#686868]">{idx + 1}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-[12px] font-semibold text-[#1c1c1c] truncate">{v.name}</p>
                            <div className="w-full h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
                              <div className="h-full bg-[#3ecf8e] rounded-full" style={{ width: `${Math.min(100, (v.count / Math.max(...vehicleStats.topVehicles.map(x => x.count))) * 100)}%` }} />
                            </div>
                          </div>
                          <span className="text-[12px] font-bold text-[#1c1c1c]">{v.count} missions</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[#686868] text-center py-8">Aucune mission terminée</p>
                  )}
                </div>
                <div className="bg-white border border-[#e5e5e5] rounded-xl p-4 shadow-sm lg:col-span-2">
                  <h3 className="text-[11px] font-semibold text-[#686868] uppercase tracking-widest flex items-center gap-2 mb-4">
                    <BarChart3 size={12} className="text-[#3ecf8e]" /> Missions par jour (14 derniers jours)
                  </h3>
                  {vehicleStats.dailyData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={vehicleStats.dailyData}>
                        <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#686868' }} axisLine={false} tickLine={false} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#686868' }} axisLine={false} tickLine={false} />
                        <Tooltip />
                        <Bar dataKey="count" radius={[4, 4, 0, 0]} fill="#3ecf8e" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-sm text-[#686868] text-center py-8">Aucune mission terminée récemment</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Vehicle History */}
          {vehicleTab === 'historique' && (
            <>
              {isLoading ? (
                <div className="bg-white border border-[#e5e5e5] rounded-xl p-6 animate-pulse">
                  <div className="h-6 bg-gray-200 rounded w-1/3 mb-4" />
                  {[1,2,3].map(i => <div key={i} className="h-12 bg-gray-100 rounded mb-2" />)}
                </div>
              ) : vehicles.length === 0 ? (
                <div className="text-center py-20">
                  <Clock size={48} className="mx-auto text-[#d1d1d1] mb-4" />
                  <p className="text-sm font-semibold text-[#686868]">Aucun véhicule</p>
                </div>
              ) : (
                <div className="bg-white border border-[#e5e5e5] rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#e5e5e5] bg-[#f8f9fa]">
                        <th className="text-left px-5 py-3 text-[9px] font-semibold uppercase tracking-widest text-[#686868]">Véhicule</th>
                        <th className="text-left px-5 py-3 text-[9px] font-semibold uppercase tracking-widest text-[#686868]">Chauffeur</th>
                        <th className="text-left px-5 py-3 text-[9px] font-semibold uppercase tracking-widest text-[#686868]">Statut</th>
                        <th className="text-left px-5 py-3 text-[9px] font-semibold uppercase tracking-widest text-[#686868]">Dernière course</th>
                        <th className="text-right px-5 py-3 text-[9px] font-semibold uppercase tracking-widest text-[#686868]">Courses</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vehicles.map((v: Vehicle) => {
                        const vehicleMissions = missions.filter((m: TransportMission) => m.vehicleId === v.id);
                        const lastMission = vehicleMissions.length > 0
                          ? vehicleMissions.reduce((latest, m) => new Date(m.departureTime) > new Date(latest.departureTime) ? m : latest)
                          : null;
                        const badge = STATUS_BADGES[v.status];
                        return (
                          <tr
                            key={v.id}
                            onClick={() => setHistoryVehicle(v)}
                            className="border-b border-[#e5e5e5] last:border-b-0 hover:bg-[#fafafa] transition-colors cursor-pointer"
                          >
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div className="p-1.5 bg-[#f0fdf4] rounded-lg">
                                  <Truck size={16} className="text-[#3ecf8e]" />
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-[#1c1c1c]">{v.model}</p>
                                  <p className="text-[11px] text-[#686868] font-semibold">{v.plateNumber}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <span className={`text-sm font-semibold ${v.driver ? 'text-[#1c1c1c]' : 'text-[#d1d1d1]'}`}>
                                {v.driver || '—'}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${badge.class}`}>{badge.label}</span>
                            </td>
                            <td className="px-5 py-4">
                              <span className="text-sm text-[#686868]">
                                {lastMission ? new Date(lastMission.departureTime).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-right">
                              <span className="text-sm font-bold text-[#1c1c1c]">{vehicleMissions.length}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* Vehicle History Detail Modal */}
          <Modal isOpen={!!historyVehicle} onClose={() => setHistoryVehicle(null)} title={historyVehicle ? `${historyVehicle.model} (${historyVehicle.plateNumber})` : ''} size="xl">
            {historyVehicle && (() => {
              const v = historyVehicle;
              const vehicleMissions = missions.filter((m: TransportMission) => m.vehicleId === v.id);
              const completedMissions = vehicleMissions.filter((m: TransportMission) => m.status === 'Terminé');
              const lastMission = vehicleMissions.length > 0
                ? vehicleMissions.reduce((latest, m) => new Date(m.departureTime) > new Date(latest.departureTime) ? m : latest)
                : null;

              // Chauffeurs attribués (inferred from missions)
              const driverAssignments: { name: string; firstMission: string; lastMission: string; count: number }[] = [];
              const driverMap = new Map<string, { first: string; last: string; count: number }>();
              vehicleMissions.forEach((m: TransportMission) => {
                if (!m.driver) return;
                const existing = driverMap.get(m.driver);
                if (existing) {
                  existing.count++;
                  if (new Date(m.departureTime) < new Date(existing.first)) existing.first = m.departureTime;
                  if (new Date(m.departureTime) > new Date(existing.last)) existing.last = m.departureTime;
                } else {
                  driverMap.set(m.driver, { first: m.departureTime, last: m.departureTime, count: 1 });
                }
              });
              driverMap.forEach((val, name) => {
                driverAssignments.push({ name, firstMission: val.first, lastMission: val.last, count: val.count });
              });
              driverAssignments.sort((a, b) => new Date(b.lastMission).getTime() - new Date(a.lastMission).getTime());

              // Opérations
              const operations = vehicleMissions
                .filter((m: TransportMission) => m.ticketId)
                .sort((a, b) => new Date(b.departureTime).getTime() - new Date(a.departureTime).getTime())
                .map((m: TransportMission) => {
                  const ticket = tickets.find((t: Ticket) => t.id === m.ticketId);
                  return {
                    ticketId: m.ticketId,
                    destination: m.destination,
                    customer: ticket?.customerName || '—',
                    date: m.departureTime,
                    driver: m.driver,
                    status: m.status,
                  };
                });

              const badge = STATUS_BADGES[v.status];

              return (
                <div className="space-y-6">
                  {/* En-tête */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${badge.class}`}>{badge.label}</div>
                      {v.driver && (
                        <span className="text-[11px] text-[#686868] font-semibold flex items-center gap-1">
                          <User size={11} /> {v.driver}
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-[#1c1c1c]">{vehicleMissions.length} missions</p>
                      {lastMission && (
                        <p className="text-[11px] text-[#686868] font-semibold">
                          Dernière course : {new Date(lastMission.departureTime).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Chauffeurs attribués */}
                  <div>
                    <h4 className="text-[10px] font-semibold text-[#686868] uppercase tracking-widest mb-3 flex items-center gap-1.5">
                      <User size={12} className="text-[#3ecf8e]" /> Chauffeurs attribués ({driverAssignments.length})
                    </h4>
                    {driverAssignments.length > 0 ? (
                      <div className="bg-[#f8f9fa] rounded-xl overflow-hidden">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-[#e5e5e5]">
                              <th className="text-left px-4 py-2 text-[9px] font-semibold uppercase tracking-widest text-[#686868]">Chauffeur</th>
                              <th className="text-left px-4 py-2 text-[9px] font-semibold uppercase tracking-widest text-[#686868]">Première mission</th>
                              <th className="text-left px-4 py-2 text-[9px] font-semibold uppercase tracking-widest text-[#686868]">Dernière mission</th>
                              <th className="text-right px-4 py-2 text-[9px] font-semibold uppercase tracking-widest text-[#686868]">Courses</th>
                            </tr>
                          </thead>
                          <tbody>
                            {driverAssignments.map(d => (
                              <tr key={d.name} className="border-b border-[#e5e5e5] last:border-b-0">
                                <td className="px-4 py-2.5 text-[12px] font-semibold text-[#1c1c1c]">{d.name}</td>
                                <td className="px-4 py-2.5 text-[12px] text-[#686868]">{new Date(d.firstMission).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                                <td className="px-4 py-2.5 text-[12px] text-[#686868]">{new Date(d.lastMission).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                                <td className="px-4 py-2.5 text-[12px] font-bold text-[#1c1c1c] text-right">{d.count}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-[12px] text-[#686868]">Aucune mission enregistrée</p>
                    )}
                  </div>

                  {/* Opérations */}
                  <div>
                    <h4 className="text-[10px] font-semibold text-[#686868] uppercase tracking-widest mb-3 flex items-center gap-1.5">
                      <MapPin size={12} className="text-[#3ecf8e]" /> Opérations effectuées ({operations.length})
                    </h4>
                    {operations.length > 0 ? (
                      <div className="bg-[#f8f9fa] rounded-xl overflow-hidden">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-[#e5e5e5]">
                              <th className="text-left px-4 py-2 text-[9px] font-semibold uppercase tracking-widest text-[#686868]">Ticket</th>
                              <th className="text-left px-4 py-2 text-[9px] font-semibold uppercase tracking-widest text-[#686868]">Lieu</th>
                              <th className="text-left px-4 py-2 text-[9px] font-semibold uppercase tracking-widest text-[#686868]">Client</th>
                              <th className="text-left px-4 py-2 text-[9px] font-semibold uppercase tracking-widest text-[#686868]">Date</th>
                              <th className="text-left px-4 py-2 text-[9px] font-semibold uppercase tracking-widest text-[#686868]">Statut</th>
                            </tr>
                          </thead>
                          <tbody>
                            {operations.map(op => (
                              <tr key={`${op.ticketId}-${op.date}`} className="border-b border-[#e5e5e5] last:border-b-0">
                                <td className="px-4 py-2.5">
                                  <span className="text-[12px] font-semibold text-[#3ecf8e]">{op.ticketId}</span>
                                </td>
                                <td className="px-4 py-2.5 text-[12px] text-[#686868]">{op.destination || '—'}</td>
                                <td className="px-4 py-2.5 text-[12px] text-[#1c1c1c]">{op.customer}</td>
                                <td className="px-4 py-2.5 text-[12px] text-[#686868]">{new Date(op.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                                <td className="px-4 py-2.5">
                                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                                    op.status === 'Terminé' ? 'bg-[#f0fdf4] text-[#16a34a]' : op.status === 'En cours' ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-[#686868]'
                                  }`}>
                                    {op.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-[12px] text-[#686868]">Aucune opération enregistrée</p>
                    )}
                  </div>
                </div>
              );
            })()}
          </Modal>
          {vehicleTab === 'liste' && (
            <>
              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#686868]" />
                  <input
                    type="text"
                    placeholder="Rechercher par immatriculation, modèle, chauffeur..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full h-11 pl-10 pr-4"
                  />
                </div>
              </div>

              {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1,2,3,4,5,6].map(i => (
                    <div key={i} className="bg-white border border-[#e5e5e5] rounded-xl p-5 animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-1/2 mb-3" />
                      <div className="h-3 bg-gray-200 rounded w-3/4 mb-2" />
                      <div className="h-3 bg-gray-200 rounded w-1/3" />
                    </div>
                  ))}
                </div>
              ) : filteredVehicles.length === 0 ? (
                <div className="text-center py-20">
                  <Truck size={48} className="mx-auto text-[#d1d1d1] mb-4" />
                  <p className="text-sm font-semibold text-[#686868]">Aucun véhicule trouvé</p>
                  <p className="text-xs text-[#686868] mt-1">
                    {searchTerm ? 'Essayez de modifier votre recherche.' : 'Ajoutez un véhicule avec le bouton "Nouveau véhicule".'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredVehicles.map((v: Vehicle) => {
                    const badge = STATUS_BADGES[v.status];
                    const mission = getVehicleMission(v.id);
                    const ticket = mission ? getTicketInfo(mission.ticketId) : null;
                    return (
                      <div key={v.id} className="bg-white border border-[#e5e5e5] rounded-xl p-5 hover:border-[#3ecf8e]/30 hover:shadow-md transition-all card-interactive relative group">
                        <div className="absolute top-3 right-3 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {canManage && (
                            <>
                              <button onClick={() => openEditVehicle(v)} className="p-1.5 bg-white border border-[#e5e5e5] rounded-md hover:bg-[#f8f9fa] text-[#686868] hover:text-[#1c1c1c] transition-all shadow-sm">
                                <Edit3 size={13} />
                              </button>
                              <button onClick={() => setDeleteVehicleConfirm({ id: v.id, label: `${v.model} (${v.plateNumber})` })} className="p-1.5 bg-white border border-[#e5e5e5] rounded-md hover:bg-red-50 text-[#686868] hover:text-red-500 transition-all shadow-sm">
                                <Trash2 size={13} />
                              </button>
                            </>
                          )}
                        </div>
                        <div className="flex items-start justify-between mb-3">
                          <div className="p-2.5 bg-[#f0fdf4] rounded-lg">
                            <Truck size={20} className="text-[#3ecf8e]" />
                          </div>
                          <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${badge.class}`}>{badge.label}</span>
                        </div>
                        <h3 className="font-semibold text-sm text-[#1c1c1c] leading-tight">{v.model}</h3>
                        <p className="text-[11px] text-[#686868] font-semibold mt-1">{v.plateNumber}</p>
                        {v.driver && (
                          <div className="flex items-center gap-1.5 mt-3 text-[11px] text-[#686868] font-semibold">
                            <span className="flex items-center gap-1"><AlertCircle size={11} className="text-[#3ecf8e]" /> {v.driver}</span>
                          </div>
                        )}
                        {mission && (
                          <div className="mt-3 pt-3 border-t border-amber-100 space-y-1">
                            <div className="flex items-center gap-1 text-[11px] font-semibold text-amber-700">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                              En mission — {mission.status === 'Planifié' ? 'Planifié' : 'En cours'}
                            </div>
                            {mission.destination && (
                              <p className="text-[11px] text-amber-600 font-semibold flex items-center gap-1">
                                <AlertCircle size={10} /> {mission.destination}
                              </p>
                            )}
                            {ticket && (
                              <p className="text-[11px] text-amber-600 font-semibold flex items-center gap-1">
                                Ticket: {ticket.id} — {ticket.customerName}
                                {ticket.assignedTechnicianId && (
                                  <>{' • '}Technicien: {getTechName(ticket.assignedTechnicianId)}</>
                                )}
                              </p>
                            )}
                            <p className="text-[11px] text-amber-600 font-semibold flex items-center gap-1">
                              Chauffeur: {mission.driver || '—'}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ============ CHAUFFEURS ============ */}
      {subTab === 'chauffeurs' && (
        <>
          {/* Driver sub-tabs: Liste / Stats */}
          <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit overflow-x-auto">
            {[
              { id: 'liste' as const, label: 'Liste', icon: <List size={14} /> },
              ...(isManager ? [{ id: 'stats' as const, label: 'Statistiques', icon: <BarChart3 size={14} /> }] : []),
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setDriverTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-1.5 text-[9px] font-semibold uppercase tracking-widest rounded-lg transition-all ${
                  driverTab === tab.id ? 'bg-white shadow-sm text-[#1c1c1c]' : 'text-[#686868] hover:text-[#1c1c1c]'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Driver Stats */}
          {driverTab === 'stats' && isManager && (
            <div className="space-y-4 animate-sb-entry">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Total chauffeurs', value: drivers.length, icon: <Users size={16} />, color: 'text-[#3ecf8e]', bg: 'bg-[#f0fdf4]' },
                  { label: 'Disponibles', value: driverStats.statusCount['Disponible'] || 0, icon: <CheckCircle2 size={16} />, color: 'text-[#16a34a]', bg: 'bg-[#f0fdf4]' },
                  { label: 'En mission', value: driverStats.statusCount['En mission'] || 0, icon: <TrendingUp size={16} />, color: 'text-amber-600', bg: 'bg-amber-50' },
                  { label: 'Missions / mois', value: driverStats.missionsThisMonth, icon: <Calendar size={16} />, color: 'text-[#3ecf8e]', bg: 'bg-[#f0fdf4]' },
                ].map(kpi => (
                  <div key={kpi.label} className="bg-white border border-[#e5e5e5] rounded-xl p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <div className={`p-2 rounded-lg ${kpi.bg}`}>
                        <span className={kpi.color}>{kpi.icon}</span>
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-[#1c1c1c]">{kpi.value}</p>
                    <p className="text-[11px] font-semibold text-[#686868] uppercase tracking-wider mt-1">{kpi.label}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Pie Chart - Driver Status */}
                <div className="bg-white border border-[#e5e5e5] rounded-xl p-4 shadow-sm">
                  <h3 className="text-[11px] font-semibold text-[#686868] uppercase tracking-widest flex items-center gap-2 mb-4">
                    <Activity size={12} className="text-[#3ecf8e]" /> Répartition par statut
                  </h3>
                  {driverStats.pieData.length > 0 ? (
                    <div className="flex items-center gap-6">
                      <div className="w-48 h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={driverStats.pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3}>
                              {driverStats.pieData.map((entry, idx) => (
                                <Cell key={idx} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="space-y-2">
                        {DRIVER_STATUSES.map(s => {
                          const count = driverStats.statusCount[s.value] || 0;
                          if (count === 0) return null;
                          const color = s.value === 'Disponible' ? '#16a34a' : s.value === 'En mission' ? '#d97706' : '#dc2626';
                          return (
                            <div key={s.value} className="flex items-center gap-2 text-[12px] font-semibold">
                              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                              <span className="text-[#686868]">{s.label}</span>
                              <span className="text-[#1c1c1c] ml-auto">{count}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-[#686868] text-center py-8">Aucune donnée</p>
                  )}
                </div>

                {/* Top Drivers */}
                <div className="bg-white border border-[#e5e5e5] rounded-xl p-4 shadow-sm">
                  <h3 className="text-[11px] font-semibold text-[#686868] uppercase tracking-widest flex items-center gap-2 mb-4">
                    <TrendingUp size={12} className="text-[#3ecf8e]" /> Chauffeurs les plus actifs
                  </h3>
                  {driverStats.topDrivers.length > 0 ? (
                    <div className="space-y-3">
                      {driverStats.topDrivers.map((d, idx) => (
                        <div key={d.name} className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-lg bg-[#f8f9fa] flex items-center justify-center text-[10px] font-bold text-[#686868]">{idx + 1}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-[12px] font-semibold text-[#1c1c1c] truncate">{d.name}</p>
                            {d.phone && <p className="text-[10px] text-[#686868]">{d.phone}</p>}
                            <div className="w-full h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
                              <div className="h-full bg-[#3ecf8e] rounded-full" style={{ width: `${Math.min(100, (d.count / Math.max(...driverStats.topDrivers.map(x => x.count))) * 100)}%` }} />
                            </div>
                          </div>
                          <span className="text-[12px] font-bold text-[#1c1c1c]">{d.count} missions</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[#686868] text-center py-8">Aucune mission terminée</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Driver List */}
          {driverTab === 'liste' && (
            <>
              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#686868]" />
                  <input
                    type="text"
                    placeholder="Rechercher par nom, téléphone, permis..."
                    value={driverSearch}
                    onChange={e => setDriverSearch(e.target.value)}
                    className="w-full h-11 pl-10 pr-4"
                  />
                </div>
                <select
                  value={driverStatusFilter}
                  onChange={e => setDriverStatusFilter(e.target.value)}
                  className="w-full md:w-48 h-11 px-4 rounded-lg border border-[#e5e5e5] text-sm"
                >
                  <option value="">Tous les statuts</option>
                  {DRIVER_STATUSES.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1,2,3].map(i => (
                    <div key={i} className="bg-white border border-[#e5e5e5] rounded-xl p-5 animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-1/2 mb-3" />
                      <div className="h-3 bg-gray-200 rounded w-3/4 mb-2" />
                      <div className="h-3 bg-gray-200 rounded w-1/3" />
                    </div>
                  ))}
                </div>
              ) : filteredDrivers.length === 0 ? (
                <div className="text-center py-20">
                  <User size={48} className="mx-auto text-[#d1d1d1] mb-4" />
                  <p className="text-sm font-semibold text-[#686868]">Aucun chauffeur trouvé</p>
                  <p className="text-xs text-[#686868] mt-1">
                    {driverSearch || driverStatusFilter ? 'Essayez de modifier vos filtres.' : 'Ajoutez un chauffeur avec le bouton "Nouveau chauffeur".'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredDrivers.map((d: Driver) => {
                    const badge = DRIVER_STATUSES.find(s => s.value === d.status) || DRIVER_STATUSES[0];
                    const assignedVehicle = d.vehicleId ? vehicles.find((v: Vehicle) => v.id === d.vehicleId) : null;
                    const activeMission = getDriverActiveMission(d.name);
                    const missionTicket = activeMission ? getTicketInfo(activeMission.ticketId) : null;
                    return (
                      <div key={d.id} className="bg-white border border-[#e5e5e5] rounded-xl p-5 hover:border-[#3ecf8e]/30 hover:shadow-md transition-all card-interactive relative group">
                        <div className="absolute top-3 right-3 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {canManage && (
                            <>
                              <button onClick={() => openEditDriver(d)} className="p-1.5 bg-white border border-[#e5e5e5] rounded-md hover:bg-[#f8f9fa] text-[#686868] hover:text-[#1c1c1c] transition-all shadow-sm">
                                <Edit3 size={13} />
                              </button>
                              <button onClick={() => setDeleteDriverConfirm({ id: d.id, label: d.name })} className="p-1.5 bg-white border border-[#e5e5e5] rounded-md hover:bg-red-50 text-[#686868] hover:text-red-500 transition-all shadow-sm">
                                <Trash2 size={13} />
                              </button>
                            </>
                          )}
                        </div>
                        <div className="flex items-start justify-between mb-3">
                          <div className="p-2.5 bg-[#f0fdf4] rounded-lg">
                            <User size={20} className="text-[#3ecf8e]" />
                          </div>
                          <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${badge.class}`}>{badge.label}</span>
                        </div>
                        <h3 className="font-semibold text-sm text-[#1c1c1c] leading-tight">{d.name}</h3>
                        <div className="mt-3 space-y-1.5">
                          {d.phone && (
                            <div className="flex items-center gap-1.5 text-[11px] text-[#686868] font-semibold">
                              <Phone size={11} className="text-[#3ecf8e]" /> {d.phone}
                            </div>
                          )}
                          {d.email && (
                            <div className="flex items-center gap-1.5 text-[11px] text-[#686868] font-semibold">
                              <Mail size={11} className="text-[#3ecf8e]" /> {d.email}
                            </div>
                          )}
                          {d.licenseNumber && (
                            <div className="flex items-center gap-1.5 text-[11px] text-[#686868] font-semibold">
                              <Fingerprint size={11} className="text-[#3ecf8e]" /> Permis: {d.licenseNumber}
                            </div>
                          )}
                        </div>
                        {assignedVehicle && (
                          <div className="mt-3 pt-3 border-t border-[#e5e5e5]">
                            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#3ecf8e]">
                              <Truck size={11} /> {assignedVehicle.model} ({assignedVehicle.plateNumber})
                            </div>
                          </div>
                        )}
                        {activeMission && (
                          <div className="mt-3 pt-3 border-t border-amber-100 space-y-1">
                            <div className="flex items-center gap-1 text-[11px] font-semibold text-amber-700">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                              Mission {activeMission.status === 'Planifié' ? 'planifiée' : 'en cours'}
                            </div>
                            {activeMission.destination && (
                              <p className="text-[11px] text-amber-600 font-semibold flex items-center gap-1">
                                <AlertCircle size={10} /> {activeMission.destination}
                              </p>
                            )}
                            {missionTicket && (
                              <p className="text-[11px] text-amber-600 font-semibold flex items-center gap-1">
                                Ticket: {missionTicket.id} — {missionTicket.customerName}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ============ AFFECTATIONS ============ */}
      {subTab === 'affectations' && (
        <>
          {isLoading ? (
            <div className="bg-white border border-[#e5e5e5] rounded-xl p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-1/3 mb-4" />
              {[1,2,3].map(i => <div key={i} className="h-12 bg-gray-100 rounded mb-2" />)}
            </div>
          ) : vehicles.length === 0 ? (
            <div className="text-center py-20">
              <Link2 size={48} className="mx-auto text-[#d1d1d1] mb-4" />
              <p className="text-sm font-semibold text-[#686868]">Aucun véhicule à affecter</p>
              <p className="text-xs text-[#686868] mt-1">Ajoutez d'abord des véhicules et des chauffeurs.</p>
            </div>
          ) : (
            <div className="bg-white border border-[#e5e5e5] rounded-xl overflow-hidden shadow-sm">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#e5e5e5] bg-[#f8f9fa]">
                    <th className="text-left px-5 py-3 text-[9px] font-semibold uppercase tracking-widest text-[#686868]">Véhicule</th>
                    <th className="text-left px-5 py-3 text-[9px] font-semibold uppercase tracking-widest text-[#686868]">Statut</th>
                    <th className="text-left px-5 py-3 text-[9px] font-semibold uppercase tracking-widest text-[#686868]">Chauffeur actuel</th>
                    <th className="text-left px-5 py-3 text-[9px] font-semibold uppercase tracking-widest text-[#686868]">Nouveau chauffeur</th>
                    <th className="text-right px-5 py-3 text-[9px] font-semibold uppercase tracking-widest text-[#686868]">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicles.map((v: Vehicle) => {
                    const badge = STATUS_BADGES[v.status];
                    const currentDriver = v.driver;
                    const currentDriverEntry = drivers.find((d: Driver) => d.name === currentDriver);
                    const isEditing = assignmentVehicleId === v.id;
                    return (
                      <tr key={v.id} className="border-b border-[#e5e5e5] last:border-b-0 hover:bg-[#fafafa] transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="p-1.5 bg-[#f0fdf4] rounded-lg">
                              <Truck size={16} className="text-[#3ecf8e]" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-[#1c1c1c]">{v.model}</p>
                              <p className="text-[11px] text-[#686868] font-semibold">{v.plateNumber}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${badge.class}`}>{badge.label}</span>
                        </td>
                        <td className="px-5 py-4">
                          {currentDriver ? (
                            <span className="text-sm font-semibold text-[#1c1c1c]">{currentDriver}</span>
                          ) : (
                            <span className="text-sm text-[#d1d1d1]">—</span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          {isEditing ? (
                            <select
                              value={assignmentDriverId}
                              onChange={e => setAssignmentDriverId(e.target.value)}
                              className="w-full h-10 px-3 rounded-lg border border-[#e5e5e5] text-sm"
                            >
                              <option value="">Aucun chauffeur</option>
                              {drivers
                                .filter((d: Driver) => d.status !== 'Absent')
                                .map((d: Driver) => (
                                  <option key={d.id} value={d.id}>{d.name} {d.vehicleId && d.vehicleId !== v.id ? '(déjà affecté)' : ''}</option>
                                ))}
                            </select>
                          ) : (
                            <span className="text-sm text-[#686868]">
                              {currentDriver ? 'Cliquez sur Modifier' : 'Non affecté'}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right">
                          {isEditing ? (
                            <div className="flex justify-end gap-1">
                              <button
                                onClick={() => handleAssignDriverToVehicle(v.id, assignmentDriverId)}
                                className="px-3 py-1.5 bg-[#3ecf8e] text-white text-[10px] font-semibold uppercase tracking-widest rounded-lg hover:bg-[#3ecf8e]/90 transition-all"
                              >
                                <Save size={13} />
                              </button>
                              <button
                                onClick={() => { setAssignmentVehicleId(null); setAssignmentDriverId(''); }}
                                className="px-3 py-1.5 bg-gray-100 text-[#686868] text-[10px] font-semibold uppercase tracking-widest rounded-lg hover:bg-gray-200 transition-all"
                              >
                                <X size={13} />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => startAssignment(v.id, currentDriverEntry?.id)}
                              className="px-3 py-1.5 bg-[#f0fdf4] text-[#16a34a] text-[10px] font-semibold uppercase tracking-widest rounded-lg hover:bg-[#f0fdf4]/80 transition-all"
                            >
                              <Edit3 size={13} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white border border-[#e5e5e5] rounded-xl p-4 shadow-sm">
              <p className="text-2xl font-bold text-[#1c1c1c]">{vehicles.length}</p>
              <p className="text-[11px] font-semibold text-[#686868] uppercase tracking-wider mt-1">Véhicules</p>
            </div>
            <div className="bg-white border border-[#e5e5e5] rounded-xl p-4 shadow-sm">
              <p className="text-2xl font-bold text-[#1c1c1c]">{availableDrivers}</p>
              <p className="text-[11px] font-semibold text-[#686868] uppercase tracking-wider mt-1">Chauffeurs disponibles</p>
            </div>
            <div className="bg-white border border-[#e5e5e5] rounded-xl p-4 shadow-sm">
              <p className="text-2xl font-bold text-[#1c1c1c]">{assignedVehicles}</p>
              <p className="text-[11px] font-semibold text-[#686868] uppercase tracking-wider mt-1">Véhicules affectés</p>
            </div>
          </div>
        </>
      )}

      {/* ============ VEHICLE MODAL ============ */}
      <Modal isOpen={isVehicleModalOpen} onClose={() => setIsVehicleModalOpen(false)} title={editingVehicle ? 'Modifier le véhicule' : 'Nouveau véhicule'} size="md">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-[#686868] uppercase tracking-wide">Immatriculation <span className="text-red-500">*</span></label>
            <input value={vehicleForm.plateNumber} onChange={e => setVehicleForm({ ...vehicleForm, plateNumber: e.target.value })} className="w-full h-11 px-4 rounded-lg border border-[#e5e5e5] text-sm" placeholder="AA-123-BB" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-[#686868] uppercase tracking-wide">Modèle <span className="text-red-500">*</span></label>
            <input value={vehicleForm.model} onChange={e => setVehicleForm({ ...vehicleForm, model: e.target.value })} className="w-full h-11 px-4 rounded-lg border border-[#e5e5e5] text-sm" placeholder="Toyota Hilux" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-[#686868] uppercase tracking-wide">Statut</label>
            <select value={vehicleForm.status} onChange={e => setVehicleForm({ ...vehicleForm, status: e.target.value as Vehicle['status'] })} className="w-full h-11 px-4 rounded-lg border border-[#e5e5e5] text-sm">
              {VEHICLE_STATUSES.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-[#686868] uppercase tracking-wide">Chauffeur</label>
            <input value={vehicleForm.driver} onChange={e => setVehicleForm({ ...vehicleForm, driver: e.target.value })} className="w-full h-11 px-4 rounded-lg border border-[#e5e5e5] text-sm" placeholder="Nom du chauffeur" />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-8 border-t border-[#f5f5f5] mt-6">
          <button onClick={() => setIsVehicleModalOpen(false)} className="btn-sb-outline h-11 px-8 rounded-lg text-[12px] font-semibold uppercase tracking-widest">Annuler</button>
          <button onClick={handleSaveVehicle} disabled={isSavingVehicle} className="btn-sb-primary h-11 px-10 rounded-lg text-[12px] font-semibold uppercase tracking-widest flex items-center gap-2">
            {isSavingVehicle ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
            {editingVehicle ? 'Modifier' : 'Ajouter'}
          </button>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={!!deleteVehicleConfirm}
        onClose={() => setDeleteVehicleConfirm(null)}
        onConfirm={handleDeleteVehicle}
        title="Supprimer le véhicule"
        message={`Êtes-vous sûr de vouloir supprimer ${deleteVehicleConfirm?.label || 'ce véhicule'} ?`}
        confirmText="Supprimer"
      />

      {/* ============ DRIVER MODAL ============ */}
      <Modal isOpen={isDriverModalOpen} onClose={() => setIsDriverModalOpen(false)} title={editingDriver ? 'Modifier le chauffeur' : 'Nouveau chauffeur'} size="md">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-[#686868] uppercase tracking-wide">Nom <span className="text-red-500">*</span></label>
            <input value={driverForm.name} onChange={e => setDriverForm({ ...driverForm, name: e.target.value })} className="w-full h-11 px-4 rounded-lg border border-[#e5e5e5] text-sm" placeholder="Jean Dupont" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-[#686868] uppercase tracking-wide">Téléphone</label>
            <input value={driverForm.phone} onChange={e => setDriverForm({ ...driverForm, phone: e.target.value })} className="w-full h-11 px-4 rounded-lg border border-[#e5e5e5] text-sm" placeholder="+241 XX XX XX XX" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-[#686868] uppercase tracking-wide">Email</label>
            <input value={driverForm.email} onChange={e => setDriverForm({ ...driverForm, email: e.target.value })} className="w-full h-11 px-4 rounded-lg border border-[#e5e5e5] text-sm" placeholder="email@example.com" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-[#686868] uppercase tracking-wide">Permis de conduire</label>
            <input value={driverForm.licenseNumber} onChange={e => setDriverForm({ ...driverForm, licenseNumber: e.target.value })} className="w-full h-11 px-4 rounded-lg border border-[#e5e5e5] text-sm" placeholder="GA-12345" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-[#686868] uppercase tracking-wide">Statut</label>
            <select value={driverForm.status} onChange={e => setDriverForm({ ...driverForm, status: e.target.value as Driver['status'] })} className="w-full h-11 px-4 rounded-lg border border-[#e5e5e5] text-sm">
              {DRIVER_STATUSES.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-8 border-t border-[#f5f5f5] mt-6">
          <button onClick={() => setIsDriverModalOpen(false)} className="btn-sb-outline h-11 px-8 rounded-lg text-[12px] font-semibold uppercase tracking-widest">Annuler</button>
          <button onClick={handleSaveDriver} disabled={isSavingDriver} className="btn-sb-primary h-11 px-10 rounded-lg text-[12px] font-semibold uppercase tracking-widest flex items-center gap-2">
            {isSavingDriver ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
            {editingDriver ? 'Modifier' : 'Ajouter'}
          </button>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={!!deleteDriverConfirm}
        onClose={() => setDeleteDriverConfirm(null)}
        onConfirm={handleDeleteDriver}
        title="Supprimer le chauffeur"
        message={`Êtes-vous sûr de vouloir supprimer ${deleteDriverConfirm?.label || 'ce chauffeur'} ?`}
        confirmText="Supprimer"
      />
    </div>
  );
};

export default Logistics;
