import React, { useState, useMemo, useEffect } from 'react';
import { Truck, Search, Plus, RefreshCw, Edit3, Trash2, Save, X, AlertCircle, CheckCircle2, BarChart3, List, Calendar, TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell, PieChart, Pie } from 'recharts';
import { Vehicle, TransportMission, Ticket, Technician } from '../types';
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

const Vehicles: React.FC = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [missions, setMissions] = useState<TransportMission[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'liste' | 'stats'>('liste');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; label: string } | null>(null);
  const [form, setForm] = useState({ plateNumber: '', model: '', status: 'Disponible' as Vehicle['status'], driver: '' });

  const { addNotification } = (() => { try { return useNotifications(); } catch { return { addNotification: () => {} }; } })();
  const { currentUser } = (() => { try { return useUser(); } catch { return { currentUser: null }; } })();

  const canManage = currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER' || currentUser?.role === 'AGENT';
  const isManager = currentUser?.role === 'MANAGER' || currentUser?.role === 'ADMIN';

  const loadVehicles = async () => {
    try {
      const [data, missionsData, ticketsData, techsData] = await Promise.all([
        ApiService.vehicles.getAll(),
        ApiService.transportMissions.getAll(),
        ApiService.tickets.getAll(),
        ApiService.technicians.getAll(),
      ]);
      setVehicles(data || []);
      setMissions(missionsData || []);
      setTickets(ticketsData || []);
      setTechnicians(techsData || []);
    } catch (e) {
      console.error('Error loading vehicles:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadVehicles(); }, []);

  const filteredVehicles = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return vehicles.filter((v: Vehicle) =>
      !q || v.plateNumber.toLowerCase().includes(q) || v.model.toLowerCase().includes(q) || v.driver?.toLowerCase().includes(q)
    );
  }, [vehicles, searchTerm]);

  const openNewVehicle = () => {
    setEditingVehicle(null);
    setForm({ plateNumber: '', model: '', status: 'Disponible', driver: '' });
    setIsModalOpen(true);
  };

  const openEditVehicle = (v: Vehicle) => {
    setEditingVehicle(v);
    setForm({ plateNumber: v.plateNumber, model: v.model, status: v.status, driver: v.driver || '' });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.plateNumber.trim() || !form.model.trim()) {
      addNotification({ title: 'Champs requis', message: 'Immatriculation et Modèle sont obligatoires.', type: 'warning' });
      return;
    }
    setIsSaving(true);
    try {
      const vehicle: Vehicle = {
        id: editingVehicle?.id || `VH-${Date.now()}`,
        plateNumber: form.plateNumber.trim(),
        model: form.model.trim(),
        status: form.status,
        driver: form.driver.trim() || undefined,
      };
      await ApiService.vehicles.saveAll([vehicle]);
      addNotification({ title: editingVehicle ? 'Véhicule modifié' : 'Véhicule ajouté', message: `${vehicle.plateNumber} — OK.`, type: 'success' });
      setIsModalOpen(false);
      await loadVehicles();
    } catch (err: any) {
      addNotification({ title: 'Erreur', message: err?.message || 'Échec de l\'enregistrement.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await ApiService.vehicles.delete(deleteConfirm.id);
      addNotification({ title: 'Supprimé', message: 'Véhicule supprimé.', type: 'success' });
      await loadVehicles();
    } catch {
      addNotification({ title: 'Erreur', message: 'Échec de la suppression.', type: 'error' });
    } finally {
      setDeleteConfirm(null);
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

  // --- Statistiques ---
  const now = new Date();
  const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - now.getDay()); startOfWeek.setHours(0,0,0,0);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const stats = useMemo(() => {
    const statusCount = { 'Disponible': 0, 'En course': 0, 'En maintenance': 0, 'En panne': 0 } as Record<string, number>;
    vehicles.forEach((v: Vehicle) => { statusCount[v.status] = (statusCount[v.status] || 0) + 1; });

    const missionsThisWeek = missions.filter((m: TransportMission) => new Date(m.departureTime) >= startOfWeek);
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

    return { statusCount, pieData, missionsThisWeek: missionsThisWeek.length, missionsThisMonth: missionsThisMonth.length, completedMissions: completedMissions.length, dailyData, topVehicles };
  }, [vehicles, missions]);

  const tabs = [
    { id: 'liste' as const, label: 'Liste', icon: <List size={14} /> },
    ...(isManager ? [{ id: 'stats' as const, label: 'Statistiques', icon: <BarChart3 size={14} /> }] : []),
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-5 animate-sb-entry pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#3ecf8e]/10 rounded-xl flex items-center justify-center text-[#3ecf8e]">
            <Truck size={18} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Véhicules</h1>
            <p className="text-xs text-[#686868] font-semibold uppercase tracking-wider mt-0.5">
              {vehicles.length} véhicule(s) • {stats.missionsThisMonth} missions ce mois
            </p>
          </div>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <button onClick={openNewVehicle} className="btn-sb-primary h-10 px-4">
              <Plus size={16} /> Nouveau véhicule
            </button>
            <button onClick={() => { setIsSyncing(true); loadVehicles().finally(() => setIsSyncing(false)); }} className="btn-sb-outline h-10 px-4">
              <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
            </button>
          </div>
        )}
      </header>

      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-6 py-2 text-[9px] font-semibold uppercase tracking-widest rounded-lg transition-all ${
              activeTab === tab.id ? 'bg-white shadow-sm text-[#1c1c1c]' : 'text-[#686868] hover:text-[#1c1c1c]'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'stats' && isManager && (
        <div className="space-y-4 animate-sb-entry">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Disponibles', value: stats.statusCount['Disponible'] || 0, icon: <CheckCircle2 size={16} />, color: 'text-[#16a34a]', bg: 'bg-[#f0fdf4]' },
              { label: 'En course', value: stats.statusCount['En course'] || 0, icon: <TrendingUp size={16} />, color: 'text-amber-600', bg: 'bg-amber-50' },
              { label: 'Maintenance / Panne', value: (stats.statusCount['En maintenance'] || 0) + (stats.statusCount['En panne'] || 0), icon: <AlertCircle size={16} />, color: 'text-red-500', bg: 'bg-red-50' },
              { label: 'Missions / mois', value: stats.missionsThisMonth, icon: <Calendar size={16} />, color: 'text-[#3ecf8e]', bg: 'bg-[#f0fdf4]' },
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
            {/* Pie Chart - Status Distribution */}
            <div className="bg-white border border-[#e5e5e5] rounded-xl p-4 shadow-sm">
              <h3 className="text-[11px] font-semibold text-[#686868] uppercase tracking-widest flex items-center gap-2 mb-4">
                <Activity size={12} className="text-[#3ecf8e]" /> Répartition par statut
              </h3>
              {stats.pieData.length > 0 ? (
                <div className="flex items-center gap-6">
                  <div className="w-48 h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={stats.pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3}>
                          {stats.pieData.map((entry, idx) => (
                            <Cell key={idx} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2">
                    {VEHICLE_STATUSES.map(s => {
                      const count = stats.statusCount[s.value] || 0;
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

            {/* Top Vehicles */}
            <div className="bg-white border border-[#e5e5e5] rounded-xl p-4 shadow-sm">
              <h3 className="text-[11px] font-semibold text-[#686868] uppercase tracking-widest flex items-center gap-2 mb-4">
                <TrendingUp size={12} className="text-[#3ecf8e]" /> Véhicules les plus utilisés
              </h3>
              {stats.topVehicles.length > 0 ? (
                <div className="space-y-3">
                  {stats.topVehicles.map((v, idx) => (
                    <div key={v.name} className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-lg bg-[#f8f9fa] flex items-center justify-center text-[10px] font-bold text-[#686868]">{idx + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold text-[#1c1c1c] truncate">{v.name}</p>
                        <div className="w-full h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
                          <div className="h-full bg-[#3ecf8e] rounded-full" style={{ width: `${Math.min(100, (v.count / Math.max(...stats.topVehicles.map(x => x.count))) * 100)}%` }} />
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

            {/* Daily Missions Bar Chart */}
            <div className="bg-white border border-[#e5e5e5] rounded-xl p-4 shadow-sm lg:col-span-2">
              <h3 className="text-[11px] font-semibold text-[#686868] uppercase tracking-widest flex items-center gap-2 mb-4">
                <BarChart3 size={12} className="text-[#3ecf8e]" /> Missions par jour (14 derniers jours)
              </h3>
              {stats.dailyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={stats.dailyData}>
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

      {activeTab === 'liste' && (
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
                          <button onClick={() => setDeleteConfirm({ id: v.id, label: `${v.model} (${v.plateNumber})` })} className="p-1.5 bg-white border border-[#e5e5e5] rounded-md hover:bg-red-50 text-[#686868] hover:text-red-500 transition-all shadow-sm">
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

      {/* Vehicle Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingVehicle ? 'Modifier le véhicule' : 'Nouveau véhicule'} size="md">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-[#686868] uppercase tracking-wide">Immatriculation <span className="text-red-500">*</span></label>
            <input value={form.plateNumber} onChange={e => setForm({ ...form, plateNumber: e.target.value })} className="w-full h-11 px-4 rounded-lg border border-[#e5e5e5] text-sm" placeholder="AA-123-BB" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-[#686868] uppercase tracking-wide">Modèle <span className="text-red-500">*</span></label>
            <input value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} className="w-full h-11 px-4 rounded-lg border border-[#e5e5e5] text-sm" placeholder="Toyota Hilux" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-[#686868] uppercase tracking-wide">Statut</label>
            <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as Vehicle['status'] })} className="w-full h-11 px-4 rounded-lg border border-[#e5e5e5] text-sm">
              {VEHICLE_STATUSES.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-[#686868] uppercase tracking-wide">Chauffeur</label>
            <input value={form.driver} onChange={e => setForm({ ...form, driver: e.target.value })} className="w-full h-11 px-4 rounded-lg border border-[#e5e5e5] text-sm" placeholder="Nom du chauffeur" />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-8 border-t border-[#f5f5f5] mt-6">
          <button onClick={() => setIsModalOpen(false)} className="btn-sb-outline h-11 px-8 rounded-lg text-[12px] font-semibold uppercase tracking-widest">Annuler</button>
          <button onClick={handleSave} disabled={isSaving} className="btn-sb-primary h-11 px-10 rounded-lg text-[12px] font-semibold uppercase tracking-widest flex items-center gap-2">
            {isSaving ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
            {editingVehicle ? 'Modifier' : 'Ajouter'}
          </button>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title="Supprimer le véhicule"
        message={`Êtes-vous sûr de vouloir supprimer ${deleteConfirm?.label || 'ce véhicule'} ?`}
        confirmText="Supprimer"
      />
    </div>
  );
};

export default Vehicles;
