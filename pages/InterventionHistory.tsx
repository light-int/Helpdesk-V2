
import React, { useState, useMemo, useEffect } from 'react';
import {
  Search, RefreshCw, MapPin,
  Filter, CheckCircle2,
  Clock, Activity, Wrench, ChevronLeft, ChevronRight,
  Edit3, ClipboardCheck, LayoutList, Calendar as CalendarIcon,
  Plus, Trash2, Package, Tag, AlertTriangle, Info, X, Zap,
  User, Phone, ShieldCheck, ClipboardList, Lock
} from 'lucide-react';
import { useData, useNotifications, useUser } from '../App';
import { Ticket, InterventionReport, Technician, Part, UsedPart } from '../types';
import Modal from '../components/Modal';
import Drawer from '../components/Drawer';
import InterventionModal from '../components/InterventionModal';

const PREDEFINED_ACTIONS = [
  "Nettoyage complet",
  "Contrôle circuit gaz",
  "Remplacement thermostat",
  "Mise à jour firmware",
  "Calibrage capteurs",
  "Serrage connectiques",
  "Test de charge",
  "Lubrification mécanique",
  "Dépoussiérage filtres",
  "Remplacement joints"
];

const InterventionHistory: React.FC = () => {
  const { tickets, technicians, parts, isLoading, refreshAll, isSyncing, saveTicket, addStockMovement } = (() => { try { return useData(); } catch { return { tickets: [], technicians: [], parts: [], isLoading: false, refreshAll: () => {}, isSyncing: false, saveTicket: () => {}, addStockMovement: () => {} }; } })();
  const { currentUser } = (() => { try { return useUser(); } catch { return { currentUser: null }; } })();
  const { addNotification } = (() => { try { return useNotifications(); } catch { return { addNotification: () => {} }; } })();

  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Tous');
  const [techFilter, setTechFilter] = useState<string>('Tous');
  const [selectedMaintenance, setSelectedMaintenance] = useState<Ticket | null>(null);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [isInterventionModalOpen, setIsInterventionModalOpen] = useState(false);

  useEffect(() => { refreshAll(); }, [refreshAll]);

  const isTechnician = currentUser?.role === 'TECHNICIAN';
  const currentTech = (technicians || []).find((t: Technician) => t.email?.toLowerCase() === currentUser?.email?.toLowerCase());

  const filteredMaintenance = useMemo(() => {
    return (tickets || []).filter((t: Ticket) => {
      const isTerrain = t.category === 'Maintenance' || t.category === 'Installation' || t.category === 'SAV' || t.category === 'Climatisation' || t.category === 'Électronique';
      if (!isTerrain) return false;

      // FIX: Use technician record ID instead of user account ID
      if (isTechnician) {
        if (!currentTech || t.assignedTechnicianId !== currentTech.id) return false;
      }

      if (!isTechnician && techFilter !== 'Tous' && t.assignedTechnicianId !== techFilter) return false;

      const matchesSearch = (t.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.id || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'Tous' || t.status === statusFilter;

      return matchesSearch && matchesStatus;
    }).sort((a: Ticket, b: Ticket) => new Date(b.lastUpdate || b.createdAt || '').getTime() - new Date(a.lastUpdate || a.createdAt || '').getTime());
  }, [tickets, searchTerm, statusFilter, techFilter, currentUser, isTechnician, technicians, currentTech]);

  const techStats = useMemo(() => {
    const total = filteredMaintenance.length;
    const resolved = filteredMaintenance.filter((m: Ticket) => m.status === 'Payé - Clôturé' || m.status === 'Fermé').length;
    return {
      active: filteredMaintenance.filter((m: Ticket) => m.status === 'En réparation').length,
      pending: filteredMaintenance.filter((m: Ticket) => m.status === "En attente de devis" || m.status === 'Devis envoyé' || m.status === 'En attente de paiement' || m.status === 'Nouveau' || m.status === 'En attente client').length,
      rate: total > 0 ? Math.round((resolved / total) * 100) : 100
    };
  }, [filteredMaintenance]);

  const daysInMonth = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= lastDate; i++) days.push(new Date(year, month, i));
    return days;
  }, [currentDate]);

  const handleOpenReport = (ticket: Ticket) => {
    if (ticket.status === 'Fermé') {
      addNotification({ title: 'Lecture Seule', message: 'Ce rapport est archivé et ne peut plus être modifié.', type: 'info' });
    }
    setSelectedMaintenance(ticket);
    setIsInterventionModalOpen(true);
  };

  const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  if (isLoading) return <div className="h-[80vh] flex items-center justify-center"><RefreshCw className="animate-spin text-[#3ecf8e]" size={32} /></div>;

  return (
    <div className="max-w-7xl mx-auto space-y-5 animate-sb-entry pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#3ecf8e]/10 rounded-xl flex items-center justify-center text-[#3ecf8e]">
            <ClipboardCheck size={18} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
              {isTechnician ? 'Mes Interventions' : 'Historique Intervention Terrain'}
              </h1>
            <p className="text-xs text-[#686868] font-semibold uppercase tracking-wider mt-0.5">Journal certifié de toutes les interventions techniques et rapports.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex bg-white border border-[#e5e5e5] rounded-lg p-1 shadow-sm">
            <button onClick={() => setViewMode('list')} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold ${viewMode === 'list' ? 'bg-[#1c1c1c] text-white' : 'text-[#686868]'}`}><LayoutList size={14} /> Liste</button>
            <button onClick={() => setViewMode('calendar')} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold ${viewMode === 'calendar' ? 'bg-[#1c1c1c] text-white' : 'text-[#686868]'}`}><CalendarIcon size={14} /> Calendrier</button>
          </div>
          <button onClick={refreshAll} className="btn-sb-outline h-10 px-3"><RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} /></button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Missions Actives', value: techStats.active, icon: <Activity size={16} />, color: 'text-blue-500' },
          { label: 'En attente validation', value: techStats.pending, icon: <Clock size={16} />, color: 'text-amber-500' },
          { label: 'Taux Résolution', value: `${techStats.rate}%`, icon: <CheckCircle2 size={16} />, color: 'text-[#3ecf8e]' }
        ].map((s, i) => (
          <div key={i} className="sb-card flex items-center gap-3 p-3 border-[#e5e5e5] shadow-sm bg-white">
            <div className={`p-2.5 bg-[#f8f9fa] rounded-lg ${s.color}`}>{s.icon}</div>
            <div><p className="text-[10px] font-semibold text-[#686868] uppercase tracking-wide">{s.label}</p><p className="text-sm font-semibold text-[#1c1c1c]">{s.value}</p></div>
          </div>
        ))}
      </div>

      {viewMode === 'list' ? (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block sb-table-container shadow-sm">
            <table className="w-full text-left sb-table">
              <thead>
                <tr>
                  <th className="w-24">ID</th>
                  <th>Client & Secteur</th>
                  <th>Matériel</th>
                  {!isTechnician && <th>Technicien</th>}
                  <th className="text-right">État</th>
                </tr>
              </thead>
              <tbody>
                {filteredMaintenance.map((t: Ticket) => (
                  <tr key={t.id} onClick={() => setSelectedMaintenance(t)} className={`cursor-pointer group hover:bg-[#fafafa] ${t.status === 'Fermé' ? 'opacity-70' : ''}`}>
                    <td className="font-mono text-[12px] font-semibold group-hover:text-[#3ecf8e]">#{t.id}</td>
                    <td>
                      <p className="text-[12px] font-semibold text-[#1c1c1c]">{t.customerName}</p>
                      <p className="text-[12px] text-[#686868] flex items-center gap-1.5 font-semibold"><MapPin size={10} className="text-[#3ecf8e]" /> {t.location || t.showroom}</p>
                    </td>
                    <td>
                      <p className="text-[13px] font-semibold text-[#1c1c1c] truncate max-w-[180px]">{t.productName || 'Matériel non spécifié'}</p>
                      <p className="text-[11px] text-[#3ecf8e] font-semibold uppercase tracking-tighter">{t.brand}</p>
                    </td>
                    {!isTechnician && (
                      <td>
                        <div className="flex items-center gap-2">
                          <img src={(technicians || []).find((tec: Technician) => tec.id === t.assignedTechnicianId)?.avatar} className="w-7 h-7 rounded-lg border border-[#e5e5e5] object-cover" alt="" />
                          <span className="text-[12px] font-semibold text-[#4b5563]">{(technicians || []).find((tec: Technician) => tec.id === t.assignedTechnicianId)?.name.split(' ')[0]}</span>
                        </div>
                      </td>
                    )}
                    <td className="text-right">
                      <span className={`px-2.5 py-1 rounded-full border text-[11px] font-semibold uppercase tracking-widest ${t.status === 'Payé - Clôturé' ? 'bg-[#f0fdf4] text-[#16a34a] border-[#dcfce7]' :
                        t.status === 'En réparation' ? 'bg-[#eff6ff] text-[#2563eb] border-[#dbeafe]' :
                          t.status === 'Fermé' ? 'bg-[#1c1c1c] text-white border-[#1c1c1c]' :
                            t.status === 'Devis envoyé' ? 'bg-indigo-50 text-indigo-600 border-indigo-200' :
                              t.status === 'En attente de paiement' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                                'bg-[#f9fafb] text-[#4b5563] border-[#f3f4f6]'
                        }`}>{t.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {filteredMaintenance.map((t: Ticket) => (
              <div key={t.id} onClick={() => setSelectedMaintenance(t)} className={`bg-white border border-[#e5e5e5] rounded-lg p-4 shadow-sm active:scale-[0.98] transition-transform ${t.status === 'Fermé' ? 'opacity-70' : ''}`}>
                <div className="flex justify-between items-start mb-3">
                  <span className="font-mono text-[12px] font-semibold text-[#686868]">#{t.id}</span>
                  <span className={`px-2 py-1 rounded-full border text-[10px] font-semibold uppercase ${t.status === 'Payé - Clôturé' ? 'bg-[#f0fdf4] text-[#16a34a] border-[#dcfce7]' :
                    t.status === 'En réparation' ? 'bg-[#eff6ff] text-[#2563eb] border-[#dbeafe]' :
                      t.status === 'Fermé' ? 'bg-[#1c1c1c] text-white border-[#1c1c1c]' :
                        t.status === 'Devis envoyé' ? 'bg-indigo-50 text-indigo-600 border-indigo-200' :
                          t.status === 'En attente de paiement' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                            'bg-[#f9fafb] text-[#4b5563] border-[#f3f4f6]'
                    }`}>{t.status}</span>
                </div>
                <div className="space-y-2">
                  <div>
                    <p className="text-[15px] font-semibold text-[#1c1c1c]">{t.customerName}</p>
                    <p className="text-[12px] text-[#686868] flex items-center gap-1"><MapPin size={10} className="text-[#3ecf8e]" /> {t.location || t.showroom}</p>
                  </div>
                  <div className="pt-2 border-t border-[#f0f0f0]">
                    <p className="text-[13px] font-semibold text-[#1c1c1c]">{t.productName || 'Matériel non spécifié'}</p>
                    <p className="text-[11px] text-[#3ecf8e] font-semibold uppercase">{t.brand}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="sb-card p-0 border-[#e5e5e5] shadow-sm bg-white overflow-hidden">
          <div className="p-3 border-b border-[#e5e5e5] flex items-center justify-between bg-[#fcfcfc]">
            <h2 className="text-sm font-semibold text-[#1c1c1c] uppercase tracking-widest">{currentDate.toLocaleString('fr-FR', { month: 'long', year: 'numeric' })}</h2>
            <div className="flex gap-2">
              <button onClick={handlePrevMonth} className="p-2 hover:bg-white border border-[#e5e5e5] rounded-lg"><ChevronLeft size={14} /></button>
              <button onClick={handleNextMonth} className="p-2 hover:bg-white border border-[#e5e5e5] rounded-lg"><ChevronRight size={14} /></button>
            </div>
          </div>
          <div className="grid grid-cols-7 border-b border-[#e5e5e5] bg-[#f8f9fa]">
            {['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map((day: string) => <div key={day} className="py-2.5 text-center text-[11px] font-semibold text-[#686868] uppercase border-r border-[#e5e5e5] last:border-r-0">{day}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {daysInMonth.map((date: Date | null, i: number) => {
              const dayInterventions = date ? filteredMaintenance.filter((m: Ticket) => new Date(m.createdAt || '').toDateString() === date.toDateString()) : [];
              return (
                <div key={i} className={`min-h-[120px] p-2 border-r border-b border-[#e5e5e5] ${!date ? 'bg-[#fcfcfc]' : 'bg-white'} ${i % 7 === 6 ? 'border-r-0' : ''}`}>
                  {date && (
                    <>
                      <p className="text-[12px] font-semibold text-[#686868] mb-2">{date.getDate()}</p>
                      <div className="space-y-1">
                        {dayInterventions.map((m: Ticket) => (
                          <div key={m.id} onClick={() => setSelectedMaintenance(m)} className="text-[10px] p-1 bg-[#f0fdf4] border border-[#dcfce7] rounded shadow-xs truncate font-semibold text-[#16a34a] cursor-pointer hover:border-[#3ecf8e]">
                            {m.customerName}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Drawer isOpen={!!selectedMaintenance} onClose={() => setSelectedMaintenance(null)} title="Détails Historique" icon={selectedMaintenance?.status === 'Fermé' ? <Lock size={14} /> : <ClipboardCheck size={14} />}>
        {selectedMaintenance && (
          <div className="space-y-8 pb-10">
            <div className="space-y-4">
              <h4 className="text-[12px] font-semibold text-[#686868] uppercase tracking-widest flex items-center gap-2">
                <User size={12} className="text-[#3ecf8e]" /> Coordonnées Bénéficiaire
              </h4>
              <div className="p-5 bg-white border border-[#e5e5e5] rounded-lg shadow-sm space-y-4">
                <div>
                  <p className="text-[11px] font-semibold text-[#9ca3af] uppercase mb-1">Identité Client</p>
                  <p className="text-base font-semibold text-[#1c1c1c]">{selectedMaintenance.customerName}</p>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <a href={`tel:${selectedMaintenance.customerPhone}`} className="flex items-center gap-3 p-3 bg-[#f0fdf4] border border-[#dcfce7] rounded-lg group hover:bg-[#3ecf8e] transition-all">
                    <Phone size={16} className="text-[#3ecf8e] group-hover:text-white" />
                    <span className="text-[13px] font-semibold text-[#1c1c1c] group-hover:text-white">{selectedMaintenance.customerPhone || '—'}</span>
                  </a>
                  <div className="flex items-center gap-3 p-3 bg-[#f8f9fa] border border-[#e5e5e5] rounded-lg">
                    <MapPin size={16} className="text-[#3ecf8e]" />
                    <span className="text-[12px] font-semibold text-[#4b5563] truncate">{selectedMaintenance.location || selectedMaintenance.showroom}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className={`p-3 border rounded-lg ${selectedMaintenance.status === 'Fermé' ? 'bg-[#1c1c1c] border-[#1c1c1c] text-white' : 'bg-[#f8f9fa] border-[#e5e5e5]'}`}>
              <div className="flex items-center gap-2 text-[#3ecf8e] mb-3">
                {selectedMaintenance.status === 'Fermé' ? <Lock size={14} /> : <Activity size={12} />}
                <span className="text-[11px] font-semibold uppercase tracking-widest">Certification Technique</span>
              </div>
              <h3 className="text-base font-semibold">{selectedMaintenance.productName || 'Matériel Royal Plaza'}</h3>
              <p className={`text-xs font-semibold mt-1 uppercase ${selectedMaintenance.status === 'Fermé' ? 'text-[#9ca3af]' : 'text-[#686868]'}`}>S/N: {selectedMaintenance.serialNumber || 'NON SPÉCIFIÉ'}</p>
            </div>

            <div className="space-y-4">
              <h4 className="text-[12px] font-semibold text-[#686868] uppercase tracking-widest border-b border-[#f5f5f5] pb-2">Rapport Technicien</h4>
              {selectedMaintenance.interventionReport?.equipmentStatus ? (
                <div className="space-y-5">
                  <div className="p-4 bg-[#f0fdf4] border border-[#dcfce7] rounded-lg">
                    <p className="text-[10px] font-semibold text-[#16a34a] uppercase mb-1">État Final Matériel</p>
                    <p className="text-sm font-semibold text-[#1c1c1c]">{selectedMaintenance.interventionReport.equipmentStatus}</p>
                  </div>

                  {selectedMaintenance.interventionReport.detailedDiagnostic && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-semibold text-[#686868] uppercase">Diagnostic Technique</p>
                      <p className="text-xs text-[#4b5563] leading-relaxed bg-[#fcfcfc] p-3 rounded-lg border border-[#e5e5e5] italic">
                        {selectedMaintenance.interventionReport.detailedDiagnostic}
                      </p>
                    </div>
                  )}

                  {selectedMaintenance.interventionReport.repairProcedure && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-semibold text-[#686868] uppercase">Procédure appliquée</p>
                      <p className="text-xs text-[#4b5563] leading-relaxed bg-[#fcfcfc] p-3 rounded-lg border border-[#e5e5e5]">
                        {selectedMaintenance.interventionReport.repairProcedure}
                      </p>
                    </div>
                  )}

                  {selectedMaintenance.interventionReport.actionsTaken && selectedMaintenance.interventionReport.actionsTaken.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-semibold text-[#686868] uppercase">Check-list des points</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedMaintenance.interventionReport.actionsTaken.map((a: string, idx: number) => (
                          <span key={idx} className="px-3 py-1 bg-[#fcfcfc] border border-[#e5e5e5] rounded-lg text-[11px] font-semibold text-[#1c1c1c]">{a}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedMaintenance.interventionReport.partsUsed && selectedMaintenance.interventionReport.partsUsed.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-semibold text-[#686868] uppercase">Pièces Remplacées</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedMaintenance.interventionReport.partsUsed.map((p: UsedPart, idx: number) => (
                          <span key={idx} className="px-3 py-1 bg-white border border-[#e5e5e5] rounded-lg text-[11px] font-semibold shadow-sm flex items-center gap-2">
                            <Package size={10} className="text-[#3ecf8e]" /> {p.name} (x{p.quantity})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 border-2 border-dashed border-[#e5e5e5] rounded-lg bg-[#fcfcfc]">
                  <AlertTriangle size={32} className="text-amber-400 mb-4" />
                  <p className="text-[12px] font-semibold text-[#686868] uppercase tracking-widest">Aucun rapport technique archivé</p>
                </div>
              )}

              {/* BOUTON ÉDITION BLOQUÉ SI FERMÉ */}
              {selectedMaintenance.status !== 'Fermé' ? (
                <button onClick={() => handleOpenReport(selectedMaintenance)} className="btn-sb-primary w-full justify-center h-14 font-semibold uppercase text-[12px] tracking-widest rounded-lg shadow-md shadow-[#3ecf8e]/10">
                  <Edit3 size={14} /> {selectedMaintenance.interventionReport?.equipmentStatus ? 'Ajuster Rapport' : 'Éditer Rapport'}
                </button>
              ) : (
                <div className="p-4 bg-gray-100 rounded-lg flex items-center justify-center gap-2 border border-gray-200">
                  <Lock size={16} className="text-gray-500" />
                  <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">Rapport Scellé par Clôture</span>
                </div>
              )}
            </div>
          </div>
        )}
      </Drawer>

      {selectedMaintenance && (
        <InterventionModal
          isOpen={isInterventionModalOpen}
          onClose={() => setIsInterventionModalOpen(false)}
          ticket={selectedMaintenance}
          onSuccess={(updated) => {
            setSelectedMaintenance(updated);
          }}
        />
      )}
    </div>
  );
};

export default InterventionHistory;
