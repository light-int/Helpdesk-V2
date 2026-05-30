import React, { useState, useEffect, useMemo } from 'react';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import { useUser, useData, useNotifications } from '../App';
import { ApiService } from '../services/apiService';
import {
  CashRegister, CashRegisterSession, CashRegisterEntry, FundTransfer,
  UserProfile, AuditLog, ShowroomConfig
} from '../types';
import {
  Calculator, FileText, ArrowLeftRight, History, Settings,
  Plus, Minus, Check, X, AlertTriangle, DollarSign, Building2,
  User as UserIcon, Calendar, Filter, Download, Printer,
  TrendingUp, TrendingDown, Wallet, CreditCard, Banknote,
  PiggyBank, Shield, Edit, Trash2, Eye, Save, XCircle, Search,
  LogOut, ChevronDown, Edit2, ArrowLeft, Loader2, ArrowUpRight, Lock, Unlock, Archive
} from 'lucide-react';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import LoadingModal from '../components/LoadingModal';

type Tab = 'active' | 'journal' | 'transfers' | 'history' | 'settings' | 'audit';

const Caisse: React.FC = () => {
  const { currentUser } = useUser();
  const { cashRegisterSessions, cashRegisterEntries, refreshAll, users, showrooms } = useData();
  const { showModalNotification } = useNotifications();


  const [activeTab, setActiveTab] = useState<Tab>('active');
  const [cashRegisters, setCashRegisters] = useState<CashRegister[]>([]);
  const [selectedRegister, setSelectedRegister] = useState<CashRegister | null>(null);
  const [activeSession, setActiveSession] = useState<CashRegisterSession | null>(null);
  const [sessionEntries, setSessionEntries] = useState<CashRegisterEntry[]>([]);
  const [transfers, setTransfers] = useState<FundTransfer[]>([]);
  const [historySessions, setHistorySessions] = useState<CashRegisterSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<CashRegisterSession | null>(null);
  const [sessionEntriesDetail, setSessionEntriesDetail] = useState<CashRegisterEntry[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Form states
  const [openingBalance, setOpeningBalance] = useState<string>('');
  const [operatorId, setOperatorId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [entryAmount, setEntryAmount] = useState<string>('');
  const [entryType, setEntryType] = useState<'Acompte' | 'Solde' | 'Dépense' | 'Ajustement'>('Acompte');
  const [entryMethod, setEntryMethod] = useState<'Espèces' | 'Airtel Money' | 'Moov Money' | 'Virement' | 'Carte'>('Espèces');
  const [entryTicketId, setEntryTicketId] = useState<string>('');
  const [entryCustomerName, setEntryCustomerName] = useState<string>('');
  const [closingBalance, setClosingBalance] = useState<string>('');
  const [closeNotes, setCloseNotes] = useState<string>('');
  const [transferAmount, setTransferAmount] = useState<string>('');
  const [transferTo, setTransferTo] = useState<string>('');
  const [transferNotes, setTransferNotes] = useState<string>('');

  // UI states
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [entryModalMode, setEntryModalMode] = useState<'inflow' | 'outflow'>('inflow');
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [newRegisterName, setNewRegisterName] = useState('');
  const [newRegisterLocation, setNewRegisterLocation] = useState('');
  const [newRegisterShowroom, setNewRegisterShowroom] = useState('');
  const [editingRegister, setEditingRegister] = useState<CashRegister | null>(null);
  const [showEditRegisterModal, setShowEditRegisterModal] = useState(false);
  const [showHistoryDetail, setShowHistoryDetail] = useState(false);
  const [showJournalDetail, setShowJournalDetail] = useState(false);
  const [selectedJournalEntry, setSelectedJournalEntry] = useState<CashRegisterEntry | null>(null);

  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; label: string; message: string; mode: 'delete' | 'archive' } | null>(null);

  // Filters
  const [journalStartDate, setJournalStartDate] = useState<string>('');
  const [journalEndDate, setJournalEndDate] = useState<string>('');
  const [journalMethodFilter, setJournalMethodFilter] = useState<string>('all');
  const [journalTypeFilter, setJournalTypeFilter] = useState<string>('all');
  const [journalRegisterFilter, setJournalRegisterFilter] = useState<string>('all');
  const [transfersRegisterFilter, setTransfersRegisterFilter] = useState<string>('all');
  const [historyRegisterFilter, setHistoryRegisterFilter] = useState<string>('all');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0
    }).format(amount).replace('XAF', 'FCFA');
  };

  const findUserById = (id: string): UserProfile | null => {
    return users.find(u => u.id === id) || null;
  };

  const resetRegisterForm = () => {
    setNewRegisterName('');
    setNewRegisterLocation('');
    setNewRegisterShowroom('');
    setOperatorId('');
    setEditingRegister(null);
  };

  // Load Data
  useEffect(() => { loadCashRegisters(); }, []);

  useEffect(() => {
    if (selectedRegister) loadActiveSession(selectedRegister.id);
    else { setActiveSession(null); setSessionEntries([]); }
  }, [selectedRegister, cashRegisterSessions]);

  useEffect(() => {
    if (activeSession) loadSessionEntries(activeSession.id);
  }, [activeSession]);

  useEffect(() => {
    if (activeTab === 'transfers') loadTransfers();
    if (activeTab === 'history') loadHistory();
    if (activeTab === 'audit' && currentUser?.role === 'ADMIN') loadAuditLogs();
  }, [activeTab]);

  const loadAuditLogs = async () => {
    setLoadingMessage('Chargement des logs d\'audit...');
    setLoading(true);
    try {
      const logs = await ApiService.audit.getLogs(200);
      setAuditLogs(logs);
    } catch (e: any) { showModalNotification({ title: 'Erreur', message: e.message, type: 'error' }); }
    finally { setLoading(false); }
  };

  const loadCashRegisters = async () => {
    setLoadingMessage('Chargement des caisses...');
    setLoading(true);
    try {
      let registers = await ApiService.caisse.getAllCashRegisters();
      if (currentUser?.role === 'AGENT') {
        registers = registers.filter(r => r.defaultOperatorId === currentUser.id);
      }
      setCashRegisters(registers);
      if (registers.length > 0 && !selectedRegister) {
        const userRegister = registers.find(r => r.showroom === currentUser?.showroom);
        setSelectedRegister(userRegister || registers[0]);
      }
    } catch (err: any) { showModalNotification({ title: 'Erreur', message: 'Erreur chargement caisses', type: 'error' }); }
    finally { setLoading(false); }
  };

  const loadActiveSession = async (registerId: string) => {
    setLoadingMessage('Chargement de la session...');
    setLoading(true);
    try {
      const session = await ApiService.caisse.getActiveSessionByCashRegister(registerId);
      setActiveSession(session);
    } catch (err: any) { showModalNotification({ title: 'Erreur', message: 'Erreur session', type: 'error' }); }
    finally { setLoading(false); }
  };

  const loadSessionEntries = async (sessionId: string) => {
    try {
      const entries = await ApiService.caisse.getEntriesBySession(sessionId);
      setSessionEntries(entries);
    } catch (err: any) { showModalNotification({ title: 'Erreur', message: 'Erreur entrées', type: 'error' }); }
  };

  const loadTransfers = async () => {
    setLoadingMessage('Chargement des transferts...');
    setLoading(true);
    try {
      const allTransfers = await ApiService.transfers.getAll();
      setTransfers(allTransfers);
    } catch (err: any) { showModalNotification({ title: 'Erreur', message: 'Erreur transferts', type: 'error' }); }
    finally { setLoading(false); }
  };

  const loadHistory = async () => {
    setLoadingMessage('Chargement de l\'historique...');
    setLoading(true);
    try {
      const allSessions = await ApiService.caisse.getAllSessions();
      setHistorySessions(allSessions.filter(s =>
        s.status === 'Fermée'
      ).sort((a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime()));
    } catch (err: any) { showModalNotification({ title: 'Erreur', message: 'Erreur historique', type: 'error' }); }
    finally { setLoading(false); }
  };

  const loadHistorySessionDetail = async (session: CashRegisterSession) => {
    setLoadingMessage('Chargement des détails...');
    setLoading(true);
    try {
      setSelectedSession(session);
      const entries = await ApiService.caisse.getEntriesBySession(session.id);
      setSessionEntriesDetail(entries);
      setShowHistoryDetail(true);
    } catch (err: any) {
      showModalNotification({ title: 'Erreur', message: 'Erreur lors du chargement des détails', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Permission checks
  const canOpenSession = currentUser && ['AGENT', 'MANAGER', 'ADMIN'].includes(currentUser.role);
  const canCloseSession = currentUser && ['AGENT', 'MANAGER', 'ADMIN'].includes(currentUser.role);

  // Handlers
  const handleOpenSession = async () => {
    if (!selectedRegister) {
      showModalNotification({ title: 'Erreur', message: 'Veuillez sélectionner une caisse.', type: 'error' });
      return;
    }
    if (openingBalance === '') {
      showModalNotification({ title: 'Erreur', message: 'Veuillez entrer un fond de caisse initial.', type: 'error' });
      return;
    }
    const balance = parseFloat(openingBalance);
    setShowOpenModal(false);
    setLoadingMessage('Ouverture de la session...');
    setLoading(true);
    try {
      await ApiService.caisse.openSession({
        cashRegisterId: selectedRegister.id,
        cashRegisterName: selectedRegister.name,
        openingBalance: balance,
        status: 'Ouverte',
        openedBy: currentUser!.id,
        openedByName: currentUser!.name,
        operatorId: operatorId || currentUser!.id,
        operatorName: operatorId ? (findUserById(operatorId))?.name || 'Unknown' : currentUser!.name,
        notes: notes,
        showroom: selectedRegister.showroom || undefined
      });
      setOpeningBalance(''); setOperatorId(''); setNotes('');
      await refreshAll();
      setLoading(false);
      showModalNotification({ title: 'Succès', message: 'Session ouverte avec succès', type: 'success' });
    } catch (err: any) {
      setLoading(false);
      showModalNotification({ title: 'Erreur', message: err.message, type: 'error' });
    }
  };

  const handleAddEntry = async () => {
    if (!activeSession || !entryAmount || !selectedRegister) return;
    setShowEntryModal(false);
    setLoadingMessage('Enregistrement de l\'entrée...');
    setLoading(true);
    try {
      await ApiService.caisse.addEntry({
        sessionId: activeSession.id,
        cashRegisterId: selectedRegister.id,
        ticketId: entryType === 'Dépense' ? undefined : (entryTicketId || undefined),
        customerName: entryCustomerName || undefined,
        type: entryType,
        amount: parseFloat(entryAmount),
        method: entryMethod,
        recordedBy: currentUser!.id,
        recordedByName: currentUser!.name,
        notes: entryType === 'Dépense' ? (entryTicketId || `Saisie manuelle: ${entryType}`) : `Saisie manuelle: ${entryType}`
      });
      setEntryAmount(''); setEntryTicketId(''); setEntryCustomerName('');
      await refreshAll();
      if (activeSession) await loadSessionEntries(activeSession.id);
      setLoading(false);
      showModalNotification({ title: 'Succès', message: 'Entrée enregistrée avec succès', type: 'success' });
    } catch (err: any) {
      setLoading(false);
      showModalNotification({ title: 'Erreur', message: err.message, type: 'error' });
    }
  };

  const handleCloseSession = async () => {
    if (!activeSession) return;
    if (!closingBalance || parseFloat(closingBalance) <= 0) {
      showModalNotification({ title: 'Champ requis', message: 'Veuillez saisir le montant réel en caisse pour clôturer la session.', type: 'warning' });
      return;
    }
    const closing = parseFloat(closingBalance);
    const totalTheoretical = activeSession.openingBalance + sessionEntries.reduce((sum, e) => sum + (e.type === 'Dépense' ? -e.amount : e.amount), 0);
    setShowCloseModal(false);
    setLoadingMessage('Fermeture de la session...');
    setLoading(true);
    try {
      await ApiService.caisse.closeSession(activeSession.id, {
        closingBalance: closing,
        totalReal: closing,
        totalTheoretical,
        closedBy: currentUser!.id,
        closedByName: currentUser!.name,
        notes: closeNotes
      });
      setClosingBalance(''); setCloseNotes('');
      await refreshAll();
      setLoading(false);
      showModalNotification({ title: 'Succès', message: 'Session clôturée avec succès', type: 'success' });
    } catch (err: any) {
      setLoading(false);
      showModalNotification({ title: 'Erreur', message: err.message, type: 'error' });
    }
  };

  const handleCreateTransfer = async () => {
    if (!transferAmount || !transferTo) return;
    setShowTransferModal(false);
    setLoadingMessage('Création du transfert...');
    setLoading(true);
    try {
      await ApiService.transfers.save({
        amount: parseFloat(transferAmount),
        date: new Date().toISOString(),
        status: 'En attente',
        fromAgent: currentUser!.id,
        toManager: transferTo,
        notes: transferNotes,
        sessionId: activeSession?.id
      });
      setTransferAmount(''); setTransferTo(''); setTransferNotes('');
      await loadTransfers();
      setLoading(false);
      showModalNotification({ title: 'Succès', message: 'Transfert créé avec succès', type: 'success' });
    } catch (err: any) {
      setLoading(false);
      showModalNotification({ title: 'Erreur', message: err.message, type: 'error' });
    }
  };

  const handleValidateTransfer = async (id: string, status: 'Validé' | 'Rejeté') => {
    setLoadingMessage(`Mise à jour du transfert...`);
    setLoading(true);
    try {
      await ApiService.transfers.updateStatus(id, status);
      await loadTransfers();
      setLoading(false);
      showModalNotification({ title: 'Succès', message: `Transfert ${status} avec succès`, type: 'success' });
    } catch (err: any) {
      setLoading(false);
      showModalNotification({ title: 'Erreur', message: err.message, type: 'error' });
    }
  };

  const handleSaveRegister = async () => {
    setShowRegisterModal(false);
    setShowEditRegisterModal(false);
    setLoadingMessage(editingRegister ? 'Mise à jour de la caisse...' : 'Création de la caisse...');
    setLoading(true);
    try {
      if (editingRegister) {
        await ApiService.caisse.updateCashRegister(editingRegister.id, {
          name: newRegisterName,
          location: newRegisterLocation,
          defaultOperatorId: operatorId || undefined,
          showroom: newRegisterShowroom || undefined
        });
      } else {
        await ApiService.caisse.saveCashRegister({
          name: newRegisterName,
          location: newRegisterLocation,
          isActive: true,
          defaultOperatorId: operatorId || undefined,
          showroom: newRegisterShowroom || undefined
        });
      }
      resetRegisterForm();
      await loadCashRegisters();
      setLoading(false);
      showModalNotification({ title: 'Succès', message: editingRegister ? 'Caisse mise à jour avec succès' : 'Caisse créée avec succès', type: 'success' });
    } catch (err: any) {
      setLoading(false);
      showModalNotification({ title: 'Erreur', message: err.message, type: 'error' });
    }
  };

  const handleDeleteRegister = (id: string) => {
    const register = cashRegisters.find(r => r.id === id);
    const isAgent = currentUser?.role === 'AGENT';
    if (isAgent) {
      setDeleteConfirm({
        id,
        label: register?.name || 'cette caisse',
        mode: 'archive',
        message: `Voulez-vous vraiment archiver la caisse "${register?.name || 'cette caisse'}" ? Elle ne sera plus disponible pour de nouvelles sessions.`
      });
    } else {
      setDeleteConfirm({
        id,
        label: register?.name || 'cette caisse',
        mode: 'delete',
        message: `Voulez-vous vraiment désactiver la caisse "${register?.name || 'cette caisse'}" ? Elle ne sera plus disponible pour de nouvelles sessions.`
      });
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;
    const { mode } = deleteConfirm;
    const isArchive = mode === 'archive';
    setDeleteConfirm(null);
    setLoadingMessage(isArchive ? 'Archivage de la caisse...' : 'Désactivation de la caisse...');
    setLoading(true);
    try {
      await ApiService.caisse.updateCashRegister(deleteConfirm.id, { isActive: false });
      await loadCashRegisters();
      setLoading(false);
      showModalNotification({ title: 'Succès', message: isArchive ? 'Caisse archivée avec succès' : 'Caisse désactivée avec succès', type: 'success' });
    } catch (err: any) {
      setLoading(false);
      showModalNotification({ title: 'Erreur', message: err.message, type: 'error' });
    }
  };

  // Computed
  const sessionTotals = useMemo(() => {
    const entries = sessionEntries;
    const totalIn = entries.filter(e => e.type !== 'Dépense' && e.type !== 'Ajustement').reduce((s, e) => s + e.amount, 0);
    const totalOut = entries.filter(e => e.type === 'Dépense').reduce((s, e) => s + e.amount, 0);
    return { totalIn, totalOut, net: totalIn - totalOut };
  }, [sessionEntries]);

  // PDF Export
  const exportSessionPDF = async (session: CashRegisterSession) => {
    try {
      let entries = sessionEntries;
      if (session.id !== activeSession?.id) entries = await ApiService.caisse.getEntriesBySession(session.id);

      const doc = new jsPDF();
      doc.setFontSize(18); doc.text('Rapport de clôture - Z de Caisse', 105, 20, { align: 'center' });
      doc.setFontSize(10);
      let y = 40;
      doc.text(`Caisse: ${session.cashRegisterName}`, 20, y); y += 7;
      doc.text(`Ouverte le: ${new Date(session.openedAt).toLocaleString()}`, 20, y); y += 7;
      doc.text(`Fermée le: ${session.closedAt ? new Date(session.closedAt).toLocaleString() : 'N/A'}`, 20, y); y += 15;

      doc.text(`Fond initial: ${formatCurrency(session.openingBalance)}`, 20, y); y += 7;
      doc.text(`Solde réel: ${formatCurrency(session.closingBalance || 0)}`, 20, y); y += 7;
      doc.text(`Écart: ${formatCurrency(session.variance || 0)}`, 20, y); y += 15;

      doc.text('Journal des opérations', 20, y); y += 10;
      entries.forEach(e => {
        doc.text(`${new Date(e.timestamp).toLocaleTimeString()} - ${e.type} - ${e.method} - ${formatCurrency(e.amount)}`, 20, y);
        y += 7; if (y > 270) { doc.addPage(); y = 20; }
      });

      doc.save(`Z_${session.cashRegisterName}_${new Date().toISOString().split('T')[0]}.pdf`);
      showModalNotification({ title: 'Succès', message: 'PDF généré avec succès', type: 'success' });
    } catch (err: any) { showModalNotification({ title: 'Erreur', message: 'Erreur lors de la génération du PDF', type: 'error' }); }
  };

  const renderAudit = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Journal d'Audit Financier</h2>
      </div>
      <div className="bg-white rounded-xl border border-[#e5e5e5] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#fcfcfc] text-[9px] uppercase tracking-widest text-[#686868]">
                <th className="p-3 font-semibold">Date</th>
                <th className="p-3 font-semibold">Utilisateur</th>
                <th className="p-3 font-semibold">Action</th>
                <th className="p-3 font-semibold">Cible</th>
                <th className="p-3 font-semibold">Détails</th>
              </tr>
            </thead>
            <tbody className="text-sm font-semibold">
              {auditLogs.map((log) => (
                <tr key={log.id} className="border-b border-[#f5f5f5] hover:bg-[#fcfcfc] transition-colors">
                  <td className="p-3 whitespace-nowrap text-[#686868]">{new Date(log.timestamp).toLocaleString()}</td>
                  <td className="p-3"><div className="flex items-center gap-2"><div className="w-6 h-6 bg-[#1c1c1c] text-white rounded-full flex items-center justify-center text-[9px]">{log.userName.charAt(0)}</div>{log.userName}</div></td>
                  <td className="p-3"><span className="px-2 py-1 rounded bg-gray-100 text-xs font-semibold">{log.action}</span></td>
                  <td className="p-3">{log.target}</td>
                  <td className="p-3 text-[#686868]">{log.details}</td>
                </tr>
              ))}
              {auditLogs.length === 0 && (
                <tr><td colSpan={5} className="p-3 text-center text-[#686868]">Aucun log trouvé ou chargement...</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // Sections
  const renderDashboard = () => {
    const today = new Date().toISOString().split('T')[0];
    const todayEntries = cashRegisterEntries.filter(e =>
      e.timestamp.startsWith(today) &&
      (!selectedRegister || e.cashRegisterId === selectedRegister.id)
    );
    const caToday = todayEntries.filter(e => e.type !== 'Dépense').reduce((s, e) => s + e.amount, 0);
    const expToday = todayEntries.filter(e => e.type === 'Dépense').reduce((s, e) => s + e.amount, 0);
    const distribution = todayEntries.reduce((acc: any, e) => {
      if (e.type !== 'Dépense') acc[e.method] = (acc[e.method] || 0) + e.amount;
      return acc;
    }, {});
    const methods = Object.entries(distribution) as [string, number][];
    const maxVal = Math.max(...methods.map(([_, v]) => v), 1);

    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
        <div className="sb-card p-4 hover-lift">
          <div className="text-[9px] font-semibold uppercase text-[#686868] tracking-widest mb-1">CA du jour</div>
          <div className="text-base font-semibold text-[#3ecf8e] font-mono">{formatCurrency(caToday)}</div>
        </div>
        <div className="sb-card p-4 hover-lift">
          <div className="text-[9px] font-semibold uppercase text-[#686868] tracking-widest mb-1">Dépenses jour</div>
          <div className="text-base font-semibold text-red-600 font-mono">{formatCurrency(expToday)}</div>
        </div>
        <div className="sb-card p-4 col-span-2 hover-lift">
          <div className="text-[9px] font-semibold uppercase text-[#686868] mb-2 tracking-widest">Répartition (Ventes)</div>
          <div className="flex gap-2 items-end h-10">
            {methods.map(([m, v]) => (
              <div key={m} className="flex-1 bg-[#f0fdf4] relative group h-full flex flex-col justify-end rounded-sm overflow-hidden">
                <div className="bg-[#3ecf8e] transition-all duration-500 ease-out" style={{ height: `${(v / maxVal) * 100}%` }}></div>
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 text-white text-[8px] p-1 rounded z-10 whitespace-nowrap">{m}: {formatCurrency(v)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderActiveSession = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-base font-bold">Session Active</h2>
        {cashRegisters.length > 0 && (
          <div className="flex gap-2">
            {cashRegisters.map(r => (
              <button key={r.id} onClick={() => setSelectedRegister(r)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${selectedRegister?.id === r.id ? 'bg-[#1c1c1c] text-white' : 'bg-white border border-[#e5e5e5] text-[#686868]'}`}>
                {r.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {cashRegisters.length === 0 ? (
        <div className="sb-card p-3 text-center animate-scale-in">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-[#e5e5e5]">
            <Building2 size={32} className="text-[#ccc]" />
          </div>
          <h3 className="text-sm font-semibold tracking-tight mb-2 uppercase">Aucune Caisse Configurée</h3>
          <p className="text-xs text-[#686868] mb-6 font-semibold">Vous devez d'abord créer au moins une caisse dans les paramètres pour pouvoir gérer les sessions.</p>
          <button
            onClick={() => setActiveTab('settings')}
            className="btn-sb-primary btn-interactive h-10 px-4 rounded-lg text-[9px] font-semibold uppercase tracking-widest shadow-lg shadow-[#3ecf8e]/20"
          >
            Aller aux paramètres
          </button>
        </div>
      ) : (
        <>
          {renderDashboard()}

          {!activeSession ? (
            <div className="sb-card p-3 text-center animate-scale-in">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-[#e5e5e5]">
                <Wallet size={32} className="text-[#ccc] animate-bounce-soft" />
              </div>
              <h3 className="text-sm font-semibold tracking-tight mb-2 uppercase">Session Inactive</h3>
              <p className="text-xs text-[#686868] mb-6 font-semibold">Veuillez ouvrir une session pour démarrer les opérations sur {selectedRegister?.name}.</p>
              {canOpenSession && (
                <div className="space-y-4">
                  <button
                    onClick={() => {
                      setOperatorId(currentUser?.id || '');
                      setShowOpenModal(true);
                    }}
                    className="btn-sb-primary btn-interactive h-10 px-4 rounded-lg text-[9px] font-semibold uppercase tracking-widest shadow-lg shadow-[#3ecf8e]/20"
                  >
                    Ouvrir la session de caisse
                  </button>
                  <div className="flex items-center justify-center gap-2 text-[9px] text-[#9ca3af] font-semibold uppercase tracking-widest">
                    <Shield size={12} />
                    <span>Les entrées/sorties seront accessibles après ouverture</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 animate-sb-entry">
              <div className="sb-card hover-lift p-4">
                <h3 className="text-[9px] font-semibold uppercase tracking-widest mb-4 flex items-center gap-2 text-[#686868]"><Calculator size={14} /> Infos Session</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center"><span className="text-[#686868] font-semibold">Ouverte par</span><span className="font-semibold">{activeSession.openedByName}</span></div>
                  <div className="flex justify-between items-center"><span className="text-[#686868] font-semibold">Opérateur</span><span className="font-semibold">{activeSession.operatorName}</span></div>
                  <div className="flex justify-between items-center"><span className="text-[#686868] font-semibold">Showroom</span><span className="font-semibold text-[#3ecf8e]">{activeSession.showroom || '-'}</span></div>
                  <div className="flex justify-between border-t border-[#f5f5f5] pt-3"><span className="text-[#686868] font-semibold">Fond initial</span><span className="font-semibold font-mono">{formatCurrency(activeSession.openingBalance)}</span></div>
                </div>
              </div>
              <div className="sb-card hover-lift border-l-4 border-l-[#3ecf8e] p-4">
                <h3 className="text-[9px] font-semibold uppercase tracking-widest mb-4 flex items-center gap-2 text-[#686868]"><TrendingUp size={14} /> État Actuel</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center text-green-600"><span className="font-semibold">Total Entrées</span><span className="font-semibold font-mono">+{formatCurrency(sessionTotals.totalIn)}</span></div>
                  <div className="flex justify-between items-center text-red-600"><span className="font-semibold">Total Sorties</span><span className="font-semibold font-mono">-{formatCurrency(sessionTotals.totalOut)}</span></div>
                  <div className="flex justify-between border-t border-[#f5f5f5] pt-3 items-center">
                    <span className="text-[9px] font-semibold uppercase text-[#686868]">Net Caisse</span>
                    <span className="text-base font-semibold font-mono text-[#1c1c1c] tracking-tighter">{formatCurrency(sessionTotals.net + activeSession.openingBalance)}</span>
                  </div>
                </div>
              </div>
              <div className="sb-card p-4 flex flex-col gap-2">
                <div className="flex gap-2">
                  <button onClick={() => { setEntryType('Acompte'); setEntryModalMode('inflow'); setShowEntryModal(true); }} className="flex-1 bg-[#3ecf8e] text-white rounded-lg font-semibold text-[9px] uppercase tracking-widest flex items-center justify-center gap-1.5 py-3 btn-interactive shadow-sm hover-lift"><Plus size={14} /> Encaissement</button>
                  <button onClick={() => { setEntryType('Dépense'); setEntryModalMode('outflow'); setShowEntryModal(true); }} className="flex-1 bg-white border border-red-200 text-red-600 transition-colors rounded-lg font-semibold text-[9px] uppercase tracking-widest flex items-center justify-center gap-1.5 py-3 hover:bg-red-50 hover-lift"><Minus size={14} /> Dépense</button>
                </div>
                {canCloseSession && (
                  <button onClick={() => setShowCloseModal(true)} className="w-full py-3 bg-[#1c1c1c] text-white rounded-lg font-semibold text-[9px] uppercase tracking-widest flex items-center justify-center gap-1.5 btn-interactive hover-lift"><XCircle size={14} /> Clôturer la Session</button>
                )}
                <button onClick={() => exportSessionPDF(activeSession)} className="w-full py-3 bg-[#f8f9fa] border border-[#e5e5e5] text-[#1c1c1c] rounded-lg font-semibold text-[9px] uppercase tracking-widest flex items-center justify-center gap-1.5 hover:bg-[#e5e5e5] hover-lift transition-colors"><Printer size={14} /> Export Z (PDF)</button>
              </div>

              <div className="lg:col-span-3 sb-table-container overflow-hidden animate-sb-entry shadow-sm">
                <div className="p-4 border-b border-[#f5f5f5] font-semibold uppercase text-[9px] tracking-widest flex items-center gap-2 bg-[#fcfcfc] text-[#686868]">
                  <div className="w-6 h-6 rounded-md bg-gray-100 flex items-center justify-center"><FileText size={12} /></div>
                  Journal des Opérations
                </div>
                <table className="w-full text-xs">
                  <thead className="bg-[#f8f9fa]">
                    <tr className="text-left text-[9px] uppercase font-semibold text-[#686868]">
                      <th className="p-3">Heure</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Méthode</th>
                      <th className="p-3">Client</th>
                      <th className="p-3 text-right">Montant</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {sessionEntries.map(e => (
                      <tr key={e.id} className="hover:bg-[#f8f9fa]">
                        <td className="p-3">{new Date(e.timestamp).toLocaleTimeString()}</td>
                        <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold ${e.type === 'Dépense' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>{e.type}</span></td>
                        <td className="p-3">{e.method}</td>
                        <td className="p-3 text-[#686868]">{e.customerName || '-'}</td>
                        <td className={`p-3 text-right font-semibold ${e.type === 'Dépense' ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(e.type === 'Dépense' ? -e.amount : e.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );

  const handleExportJournalXLS = () => {
    const filtered = cashRegisterEntries.filter(e => {
      if (journalRegisterFilter !== 'all' && e.cashRegisterId !== journalRegisterFilter) return false;
      if (journalStartDate && e.timestamp.split('T')[0] < journalStartDate) return false;
      if (journalEndDate && e.timestamp.split('T')[0] > journalEndDate) return false;
      if (journalMethodFilter !== 'all' && e.method !== journalMethodFilter) return false;
      if (journalTypeFilter !== 'all' && e.type !== journalTypeFilter) return false;
      return true;
    });

    const rows = filtered.map(e => ({
      Date: new Date(e.timestamp).toLocaleString('fr-FR'),
      Caisse: cashRegisters.find(r => r.id === e.cashRegisterId)?.name || e.cashRegisterId?.slice(0, 8) || '',
      Type: e.type,
      Méthode: e.method || '',
      Client: e.customerName || '',
      Notes: e.notes || e.ticketId || '',
      Montant: e.type === 'Dépense' ? -e.amount : e.amount,
      'Enregistré par': e.recordedByName || ''
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const colWidths = [
      { wch: 20 }, { wch: 18 }, { wch: 12 }, { wch: 14 },
      { wch: 20 }, { wch: 30 }, { wch: 14 }, { wch: 18 }
    ];
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Journal Caisse');

    const dateRange = journalStartDate || journalEndDate
      ? `_${journalStartDate || 'debut'}_${journalEndDate || 'fin'}`
      : '';
    XLSX.writeFile(wb, `Journal_Caisse${dateRange}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const renderJournal = () => (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 p-2 bg-gray-50 border border-[#e5e5e5] rounded-xl shadow-sm">
        <div className="flex bg-white border border-[#e5e5e5] rounded-lg p-0.5 shadow-sm h-8">
          <div className="flex items-center gap-1.5 px-2 border-r border-[#e5e5e5]">
            <Calendar size={10} className="text-[#686868]" />
            <input
              type="date" value={journalStartDate} onChange={e => setJournalStartDate(e.target.value)}
              className="bg-transparent border-none text-[10px] font-semibold p-0 focus:ring-0 w-[88px] cursor-pointer"
            />
          </div>
          <div className="flex items-center gap-1.5 px-2">
            <input
              type="date" value={journalEndDate} onChange={e => setJournalEndDate(e.target.value)}
              className="bg-transparent border-none text-[10px] font-semibold p-0 focus:ring-0 w-[88px] cursor-pointer"
            />
          </div>
        </div>

        <span className="hidden sm:block w-px h-5 bg-[#e5e5e5]" />

        <div className="flex bg-white border border-[#e5e5e5] rounded-lg px-2 h-8 items-center shadow-sm">
          <Filter size={10} className="text-[#686868] mr-1.5" />
          <select
            value={journalRegisterFilter}
            onChange={e => setJournalRegisterFilter(e.target.value)}
            className="bg-transparent border-none text-[10px] font-semibold p-0 focus:ring-0 w-28 cursor-pointer focus:outline-none"
          >
            <option value="all">Toutes Caisses</option>
            {cashRegisters.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>

        <span className="hidden sm:block w-px h-5 bg-[#e5e5e5]" />

        <div className="flex bg-white border border-[#e5e5e5] rounded-lg px-2 h-8 items-center shadow-sm">
          <Filter size={10} className="text-[#686868] mr-1.5" />
          <select
            value={journalMethodFilter}
            onChange={e => setJournalMethodFilter(e.target.value)}
            className="bg-transparent border-none text-[10px] font-semibold p-0 focus:ring-0 w-28 cursor-pointer focus:outline-none"
          >
            <option value="all">Toutes Méthodes</option>
            <option value="Espèces">Espèces</option>
            <option value="Airtel Money">Airtel Money</option>
            <option value="Moov Money">Moov Money</option>
            <option value="Virement">Virement</option>
            <option value="Carte">Carte</option>
          </select>
        </div>

        <span className="hidden sm:block w-px h-5 bg-[#e5e5e5]" />

        <div className="flex bg-white border border-[#e5e5e5] rounded-lg px-2 h-8 items-center shadow-sm">
          <FileText size={10} className="text-[#686868] mr-1.5" />
          <select
            value={journalTypeFilter}
            onChange={e => setJournalTypeFilter(e.target.value)}
            className="bg-transparent border-none text-[10px] font-semibold p-0 focus:ring-0 w-24 cursor-pointer focus:outline-none"
          >
            <option value="all">Tous Types</option>
            <option value="Acompte">Acompte</option>
            <option value="Solde">Solde</option>
            <option value="Dépense">Dépense</option>
            <option value="Ajustement">Ajustement</option>
          </select>
        </div>

        <span className="hidden sm:block w-px h-5 bg-[#e5e5e5]" />

        <button onClick={handleExportJournalXLS} className="flex items-center gap-1.5 px-3 h-8 bg-white border border-[#e5e5e5] rounded-lg shadow-sm text-[10px] font-semibold text-[#686868] hover:text-[#3ecf8e] hover:border-[#3ecf8e] transition-all">
          <Download size={12} /> XLS
        </button>
      </div>
      <div className="bg-white rounded-xl border border-[#e5e5e5] overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-[#f8f9fa] text-[9px] uppercase font-semibold text-[#686868]">
            <tr><th className="p-3 text-left">Date</th><th className="p-3 text-left">Caisse</th><th className="p-3 text-left">Type</th><th className="p-3 text-left">Méthode</th><th className="p-3 text-left">Client</th><th className="p-3 text-left">Notes</th><th className="p-3 text-right">Montant</th><th className="p-3 text-left">Par</th></tr>
          </thead>
          <tbody className="divide-y">
            {cashRegisterEntries.filter(e => {
              if (journalRegisterFilter !== 'all' && e.cashRegisterId !== journalRegisterFilter) return false;
              if (journalStartDate && e.timestamp.split('T')[0] < journalStartDate) return false;
              if (journalEndDate && e.timestamp.split('T')[0] > journalEndDate) return false;
              if (journalMethodFilter !== 'all' && e.method !== journalMethodFilter) return false;
              if (journalTypeFilter !== 'all' && e.type !== journalTypeFilter) return false;
              return true;
            }).map(e => (
              <tr key={e.id} className="hover:bg-[#f8f9fa] cursor-pointer" onClick={() => { setSelectedJournalEntry(e); setShowJournalDetail(true); }}>
                <td className="p-3 whitespace-nowrap">{new Date(e.timestamp).toLocaleString('fr-FR')}</td>
                <td className="p-3 font-semibold">{cashRegisters.find(r => r.id === e.cashRegisterId)?.name || e.cashRegisterId?.slice(0, 8)}</td>
                <td className="p-3">{e.type}</td>
                <td className="p-3 text-[#686868]">{e.method || '-'}</td>
                <td className="p-3 text-[#686868]">{e.customerName || '-'}</td>
                <td className="p-3 text-[#686868] max-w-[160px] truncate" title={e.notes || e.ticketId || ''}>{e.notes || e.ticketId || '-'}</td>
                <td className={`p-3 text-right font-semibold whitespace-nowrap ${e.type === 'Dépense' ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(e.amount)}</td>
                <td className="p-3 text-[#686868] text-[9px] font-semibold">{e.recordedByName || findUserById(e.recordedBy)?.name || e.recordedBy?.slice(0, 6)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderJournalDetailModal = () => selectedJournalEntry && (
    <Modal isOpen={showJournalDetail} onClose={() => setShowJournalDetail(false)} title="Détail de l'opération" size="md">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
          <div>
            <p className="text-[8px] uppercase font-semibold text-gray-400 mb-1">Date</p>
            <p className="text-xs font-semibold">{new Date(selectedJournalEntry.timestamp).toLocaleString('fr-FR')}</p>
          </div>
          <div>
            <p className="text-[8px] uppercase font-semibold text-gray-400 mb-1">Caisse</p>
            <p className="text-xs font-semibold">{cashRegisters.find(r => r.id === selectedJournalEntry.cashRegisterId)?.name || selectedJournalEntry.cashRegisterId?.slice(0, 8)}</p>
          </div>
          <div>
            <p className="text-[8px] uppercase font-semibold text-gray-400 mb-1">Type</p>
            <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase ${selectedJournalEntry.type === 'Dépense' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>{selectedJournalEntry.type}</span>
          </div>
          <div>
            <p className="text-[8px] uppercase font-semibold text-gray-400 mb-1">Méthode</p>
            <p className="text-xs font-semibold">{selectedJournalEntry.method || '-'}</p>
          </div>
          <div>
            <p className="text-[8px] uppercase font-semibold text-gray-400 mb-1">Montant</p>
            <p className={`text-sm font-bold font-mono ${selectedJournalEntry.type === 'Dépense' ? 'text-red-600' : 'text-green-600'}`}>{selectedJournalEntry.type === 'Dépense' ? '-' : '+'}{formatCurrency(selectedJournalEntry.amount)}</p>
          </div>
          <div>
            <p className="text-[8px] uppercase font-semibold text-gray-400 mb-1">Client</p>
            <p className="text-xs font-semibold">{selectedJournalEntry.customerName || '-'}</p>
          </div>
          <div>
            <p className="text-[8px] uppercase font-semibold text-gray-400 mb-1">N° Ticket</p>
            <p className="text-xs font-semibold font-mono">{selectedJournalEntry.ticketId || '-'}</p>
          </div>
          <div>
            <p className="text-[8px] uppercase font-semibold text-gray-400 mb-1">Enregistré par</p>
            <p className="text-xs font-semibold">{selectedJournalEntry.recordedByName || findUserById(selectedJournalEntry.recordedBy)?.name || selectedJournalEntry.recordedBy?.slice(0, 6)}</p>
          </div>
        </div>
        {selectedJournalEntry.notes && (
          <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-100">
            <p className="text-[8px] uppercase font-semibold text-amber-600 mb-1.5">
              {selectedJournalEntry.type === 'Dépense' ? 'Motif de la dépense' : 'Notes'}
            </p>
            <p className="text-sm font-semibold text-amber-900">{selectedJournalEntry.notes}</p>
          </div>
        )}
        {selectedJournalEntry.verified !== undefined && (
          <div className="pt-2 border-t border-gray-100 text-[9px] text-gray-400">
            {selectedJournalEntry.verified ? (
              <span className="text-green-600">✓ Vérifié{selectedJournalEntry.verifiedBy ? ` par ${findUserById(selectedJournalEntry.verifiedBy)?.name || selectedJournalEntry.verifiedBy}` : ''}{selectedJournalEntry.verifiedAt ? ` le ${new Date(selectedJournalEntry.verifiedAt).toLocaleString('fr-FR')}` : ''}</span>
            ) : (
              <span className="text-amber-600">⚠ Non vérifié</span>
            )}
          </div>
        )}
      </div>
    </Modal>
  );

  const renderTransfers = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-base font-bold">Transferts de fonds</h2>
        <div className="flex items-center gap-2">
          <select
            value={transfersRegisterFilter}
            onChange={e => setTransfersRegisterFilter(e.target.value)}
            className="bg-white border border-[#e5e5e5] rounded-lg px-2 h-8 text-[10px] font-semibold focus:ring-0 cursor-pointer"
          >
            <option value="all">Toutes Caisses</option>
            {cashRegisters.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
          <button onClick={() => setShowTransferModal(true)} className="px-3 py-1.5 bg-[#3ecf8e] text-white rounded-lg text-xs font-semibold flex items-center gap-2"><Plus size={14} /> Nouveau Transfert</button>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-[#e5e5e5] overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-[#f8f9fa] text-[9px] uppercase font-semibold text-[#686868]">
            <tr><th className="p-3 text-left">Date</th><th className="p-3 text-right">Montant</th><th className="p-3 text-left">De</th><th className="p-3 text-left">Vers</th><th className="p-3 text-left">Statut</th><th className="p-3"></th></tr>
          </thead>
          <tbody className="divide-y">
            {transfers.filter(t => {
              if (transfersRegisterFilter === 'all') return true;
              return cashRegisterSessions.some(s => s.id === t.sessionId && s.cashRegisterId === transfersRegisterFilter);
            }).map(t => (
              <tr key={t.id} className="hover:bg-[#f8f9fa]">
                <td className="p-3">{new Date(t.date).toLocaleDateString()}</td>
                <td className="p-3 text-right font-semibold">{formatCurrency(t.amount)}</td>
                <td className="p-3">{findUserById(t.fromAgent)?.name || t.fromAgent}</td>
                <td className="p-3">{findUserById(t.toManager)?.name || t.toManager}</td>
                <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold ${t.status === 'Validé' ? 'bg-green-100 text-green-600' : t.status === 'Rejeté' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'}`}>{t.status}</span></td>
                <td className="p-3">
                  {t.status === 'En attente' && currentUser?.id === t.toManager && (
                    <div className="flex gap-2">
                      <button onClick={() => handleValidateTransfer(t.id, 'Validé')} className="p-1 text-green-600 hover:bg-green-50 rounded"><Check size={14} /></button>
                      <button onClick={() => handleValidateTransfer(t.id, 'Rejeté')} className="p-1 text-red-600 hover:bg-red-50 rounded"><X size={14} /></button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderHistory = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-base font-bold">Historique des Sessions</h2>
        <select
          value={historyRegisterFilter}
          onChange={e => setHistoryRegisterFilter(e.target.value)}
          className="bg-white border border-[#e5e5e5] rounded-lg px-2 h-8 text-[10px] font-semibold focus:ring-0 cursor-pointer"
        >
          <option value="all">Toutes Caisses</option>
          {cashRegisters.map(r => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {historySessions.filter(s => historyRegisterFilter === 'all' || s.cashRegisterId === historyRegisterFilter).map(s => (
          <div key={s.id} className="bg-white p-4 rounded-xl border border-[#e5e5e5] shadow-sm relative hover:border-[#3ecf8e] transition-colors group">
            <div className="flex justify-between mb-3">
              <div className="flex flex-col">
                <span className="text-[9px] font-semibold uppercase text-[#686868]">{s.cashRegisterName}</span>
                <span className="text-[9px] font-semibold text-[#3ecf8e]">{s.showroom || 'Showroom inconnu'}</span>
              </div>
              <div className="flex gap-1">
                <button onClick={() => exportSessionPDF(s)} className="p-1.5 bg-[#f8f9fa] rounded-lg hover:bg-[#e5e5e5]" title="Imprimer"><Printer size={14} /></button>
                <button onClick={() => loadHistorySessionDetail(s)} className="p-1.5 bg-[#3ecf8e]/10 text-[#3ecf8e] rounded-lg hover:bg-[#3ecf8e]/20" title="Détails"><Eye size={14} /></button>
              </div>
            </div>
            <div className="space-y-1 text-xs mb-3">
              <div className="font-semibold flex items-center gap-1.5"><Calendar size={12} className="text-[#686868]" /> {new Date(s.openedAt).toLocaleDateString()}</div>
              <div className="text-[#686868] text-[9px] flex items-center gap-1.5"><UserIcon size={12} /> {s.operatorName || s.openedByName}</div>
            </div>
            <div className="grid grid-cols-2 gap-2 border-t pt-3">
              <div><div className="text-[8px] uppercase text-[#686868]">Solde Réel</div><div className="font-semibold text-xs">{formatCurrency(s.closingBalance || 0)}</div></div>
              <div><div className="text-[8px] uppercase text-[#686868]">Écart</div><div className={`font-semibold text-xs ${Math.abs(s.variance || 0) > 100 ? 'text-red-600' : 'text-green-600'}`}>
                {s.variance! > 0 ? '+' : ''}{formatCurrency(s.variance || 0)}
              </div></div>
            </div>
            <button
              onClick={() => loadHistorySessionDetail(s)}
              className="absolute inset-x-0 bottom-0 py-2 bg-[#fcfcfc] border-t border-[#f1f1f1] text-[9px] font-semibold uppercase tracking-widest text-[#686868] opacity-0 group-hover:opacity-100 transition-opacity rounded-b-2xl"
            >
              Cliquer pour voir le journal
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  const renderHistoryDetailModal = () => selectedSession && (
    <Modal isOpen={showHistoryDetail} onClose={() => setShowHistoryDetail(false)} title={`Détails Session - ${selectedSession.cashRegisterName}`} size="lg">
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
          <div><p className="text-[8px] uppercase font-semibold text-gray-400">Ouverture</p><p className="text-xs font-semibold">{new Date(selectedSession.openedAt).toLocaleString()}</p></div>
          <div><p className="text-[8px] uppercase font-semibold text-gray-400">Fermeture</p><p className="text-xs font-semibold">{selectedSession.closedAt ? new Date(selectedSession.closedAt).toLocaleString() : '-'}</p></div>
          <div><p className="text-[8px] uppercase font-semibold text-gray-400">Opérateur</p><p className="text-xs font-semibold">{selectedSession.operatorName}</p></div>
          <div><p className="text-[8px] uppercase font-semibold text-gray-400">Solde Initial</p><p className="text-xs font-semibold font-mono">{formatCurrency(selectedSession.openingBalance)}</p></div>
        </div>

        <div className="sb-table-container overflow-hidden border border-[#f1f1f1] rounded-xl">
          <div className="p-3 bg-[#fcfcfc] border-b border-[#f1f1f1] flex items-center justify-between">
            <h4 className="text-[9px] font-semibold uppercase tracking-widest text-[#686868]">Journal des opérations</h4>
            <span className="text-[9px] font-semibold px-2 py-0.5 bg-gray-100 rounded-full">{sessionEntriesDetail.length} opérations</span>
          </div>
          <div className="max-h-[400px] overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr className="text-left text-[9px] uppercase font-semibold text-[#686868] border-b">
                  <th className="p-3">Heure</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Méthode</th>
                  <th className="p-3">Client/Com</th>
                  <th className="p-3 text-right">Montant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sessionEntriesDetail.map(e => (
                  <tr key={e.id} className="hover:bg-gray-50/50">
                    <td className="p-3 text-[9px]">{new Date(e.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-[8px] font-semibold uppercase ${e.type === 'Dépense' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>{e.type}</span></td>
                    <td className="p-3 font-semibold text-gray-600">{e.method}</td>
                    <td className="p-3">
                      <div className="flex flex-col">
                        <span className="font-semibold text-[9px]">{e.customerName || '-'}</span>
                        {e.notes && <span className="text-[9px] text-gray-400 italic">{e.notes}</span>}
                      </div>
                    </td>
                    <td className={`p-3 text-right font-mono font-semibold ${e.type === 'Dépense' ? 'text-red-600' : 'text-green-600'}`}>{e.type === 'Dépense' ? '-' : '+'}{formatCurrency(e.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button onClick={() => setShowHistoryDetail(false)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-[9px] font-semibold uppercase tracking-widest transition-all">
            Fermer
          </button>
        </div>
      </div>
    </Modal>
  );

  const renderSettings = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-base font-bold">Paramètres Caisse</h2>
        <button onClick={() => { if (currentUser?.role === 'AGENT') setOperatorId(currentUser.id); setShowRegisterModal(true); }} className="px-4 py-2 bg-[#3ecf8e] text-white rounded-lg text-xs font-semibold flex items-center gap-2"><Plus size={14} /> Nouvelle Caisse</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {cashRegisters.map(r => (
          <div key={r.id} className="bg-white p-3 rounded-xl border border-[#e5e5e5] shadow-sm">
            <div className="flex justify-between items-start mb-3">
              <div><h3 className="font-bold text-sm">{r.name}</h3><p className="text-[9px] text-[#686868]">{r.location}</p></div>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold ${r.isActive ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'}`}>{r.isActive ? 'Active' : 'Inhibée'}</span>
            </div>
            <div className="text-[9px] text-[#686868] mb-4">
              Default Operator: {findUserById(r.defaultOperatorId || '')?.name || 'Aucun'}
            </div>
            <div className="flex gap-2">
              <button onClick={() => {
                setEditingRegister(r); setNewRegisterName(r.name); setNewRegisterLocation(r.location); setNewRegisterShowroom(r.showroom || ''); setOperatorId(r.defaultOperatorId || ''); setShowEditRegisterModal(true);
              }} className="flex-1 px-3 py-1.5 bg-[#f8f9fa] rounded-lg text-xs font-semibold hover:bg-[#e5e5e5] flex items-center justify-center gap-1"><Edit size={12} /> Modifier</button>
              <button onClick={() => handleDeleteRegister(r.id)} className={`p-1.5 rounded-lg ${currentUser?.role === 'AGENT' ? 'text-amber-600 hover:bg-amber-50' : 'text-red-600 hover:bg-red-50'}`}>{currentUser?.role === 'AGENT' ? <Archive size={14} /> : <Trash2 size={14} />}</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Modals
  const renderOpenModal = () => {
    if (!showOpenModal) return null;
    return (
      <Modal
        isOpen={showOpenModal}
        onClose={() => setShowOpenModal(false)}
        title="Ouverture de Session"
        size="sm"
      >
        <div className="space-y-4 animate-scale-in">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-[#f0fdf4] rounded-lg flex items-center justify-center text-[#3ecf8e]">
              <Banknote size={14} />
            </div>
            <h3 className="text-base font-semibold tracking-tight uppercase">Nouvelle Session</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[9px] font-semibold uppercase text-[#686868] mb-1.5 tracking-widest">Caisse sélectionnée</label>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border-sb border-[#e5e5e5]">
                <Building2 size={14} className="text-[#3ecf8e]" />
                <span className="font-semibold text-sm tracking-tight">{selectedRegister?.name}</span>
              </div>
            </div>

            <div>
              <label className="block text-[9px] font-semibold uppercase text-[#686868] mb-1.5 tracking-widest">Fond de caisse initial (FCFA)</label>
              <input
                type="number"
                value={openingBalance}
                onChange={e => setOpeningBalance(e.target.value)}
                className="w-full h-12 focus-ring px-4 bg-gray-50 border-none rounded-lg font-semibold font-mono text-sm"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-[9px] font-semibold uppercase text-[#686868] mb-1.5 tracking-widest">Opérateur de session</label>
              <select
                value={operatorId}
                onChange={e => setOperatorId(e.target.value)}
                className="w-full h-12 focus-ring px-4 bg-gray-50 border-none rounded-lg font-semibold appearance-none"
              >
                {currentUser && <option value={currentUser.id}>👤 {currentUser.name} (Moi)</option>}
                {users.filter(u => u.showroom === selectedRegister?.showroom && u.id !== currentUser?.id).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <button
              onClick={() => setShowOpenModal(false)}
              className="flex-1 h-10 border-sb border-[#e5e5e5] rounded-lg text-[11px] font-semibold uppercase tracking-widest hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleOpenSession}
              disabled={loading}
              className="flex-1 h-10 bg-[#3ecf8e] text-white rounded-lg text-[11px] font-semibold uppercase tracking-widest btn-interactive shadow-lg shadow-[#3ecf8e]/20"
            >
              {loading ? 'Traitement...' : 'Ouvrir la caisse'}
            </button>
          </div>
        </div>
      </Modal>
    );
  };

  const renderEntryModal = () => showEntryModal && (
    <Modal
      isOpen={showEntryModal}
      onClose={() => setShowEntryModal(false)}
      title={entryModalMode === 'outflow' ? 'Sortie de Caisse' : 'Entrée de Caisse'}
      size="sm"
    >
      <div className="space-y-4 animate-scale-in">
        <div className="flex items-center gap-3 mb-2">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${entryModalMode === 'outflow' ? 'bg-red-50 text-red-600' : 'bg-[#f0fdf4] text-[#3ecf8e]'}`}>
            {entryModalMode === 'outflow' ? <Minus size={14} /> : <Plus size={14} />}
          </div>
          <h3 className={`text-base font-semibold tracking-tight uppercase ${entryModalMode === 'outflow' ? 'text-red-600' : 'text-[#3ecf8e]'}`}>
            {entryModalMode === 'outflow' ? 'Saisir une Dépense' : 'Nouvel Encaissement'}
          </h3>
        </div>

        <div className="space-y-5">
          <div className="flex gap-2">
            {(entryModalMode === 'inflow' ? ['Acompte', 'Solde'] : ['Dépense']).map(t => (
              <button
                key={t}
                onClick={() => setEntryType(t as any)}
                className={`flex-1 h-10 rounded-lg text-[9px] font-semibold uppercase tracking-widest transition-all ${entryType === t ? (entryModalMode === 'outflow' ? 'bg-red-600 text-white shadow-lg shadow-red-200' : 'bg-[#1c1c1c] text-white shadow-lg shadow-gray-200') : 'bg-gray-50 text-[#686868] hover:bg-gray-100'}`}
              >
                {t}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-[9px] font-semibold uppercase tracking-widest text-[#686868] mb-1.5">Montant (FCFA)</label>
            <input
              type="number"
              value={entryAmount}
              onChange={e => setEntryAmount(e.target.value)}
              className="w-full h-12 px-4 focus-ring bg-gray-50 border-none rounded-lg font-semibold font-mono text-base"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-[9px] font-semibold uppercase tracking-widest text-[#686868] mb-1.5">Méthode de Paiement</label>
            <select
              value={entryMethod}
              onChange={e => setEntryMethod(e.target.value as any)}
              className="w-full h-12 px-4 focus-ring bg-gray-50 border-none rounded-lg font-semibold"
            >
              {['Espèces', 'Airtel Money', 'Moov Money', 'Virement', 'Carte'].map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          {(entryModalMode === 'inflow' || entryType === 'Solde') && (
            <div>
              <label className="block text-[9px] font-semibold uppercase tracking-widest text-[#686868] mb-1.5">Nom du client</label>
              <input
                type="text"
                value={entryCustomerName}
                onChange={e => setEntryCustomerName(e.target.value)}
                className="w-full h-12 px-4 focus-ring bg-gray-50 border-none rounded-lg font-semibold"
                placeholder="Ex: Jean Dupont"
              />
            </div>
          )}

          <div>
            <label className="block text-[9px] font-semibold uppercase tracking-widest text-[#686868] mb-1.5">
              {entryModalMode === 'outflow' ? 'Motif de la Dépense' : 'Référence / N° Ticket'}
            </label>
            <input
              type="text"
              value={entryTicketId}
              onChange={e => setEntryTicketId(e.target.value)}
              className="w-full h-12 px-4 focus-ring bg-gray-50 border-none rounded-lg font-semibold"
              placeholder={entryModalMode === 'outflow' ? 'Ex: Achats fournitures...' : 'Ex: T-12345'}
            />
          </div>
        </div>

        <div className="flex gap-3 mt-4">
          <button
            onClick={() => setShowEntryModal(false)}
            className="flex-1 h-10 border-sb border-[#e5e5e5] rounded-lg text-[11px] font-semibold uppercase tracking-widest hover:bg-gray-50"
          >
            Annuler
          </button>
          <button
            onClick={handleAddEntry}
            disabled={loading}
            className={`flex-1 h-10 text-white rounded-lg text-[11px] font-semibold uppercase tracking-widest btn-interactive shadow-lg ${entryModalMode === 'outflow' ? 'bg-red-600 shadow-red-100' : 'bg-[#3ecf8e] shadow-[#3ecf8e]/20'}`}
          >
            {loading ? 'Enregistrement...' : 'Valider'}
          </button>
        </div>
      </div>
    </Modal>
  );

  const renderCloseModal = () => showCloseModal && (
    <Modal
      isOpen={showCloseModal}
      onClose={() => setShowCloseModal(false)}
      title="Clôture de Session"
      size="sm"
    >
      <div className="space-y-4 animate-scale-in">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center text-red-600">
            <Lock size={14} />
          </div>
          <h3 className="text-base font-semibold tracking-tight uppercase text-red-600">Fermer la Caisse</h3>
        </div>

        <p className="text-[13px] text-[#686868] font-semibold leading-relaxed">
          Veuillez compter physiquement le montant total en caisse pour valider la session.
        </p>

        <div className="space-y-4">
          <div className="p-3 bg-gray-50 rounded-xl border-sb border-[#e5e5e5] space-y-1">
            <div className="flex justify-between text-[9px] font-semibold uppercase text-[#9ca3af] tracking-widest">
              <span>Solde Théorique attendu</span>
            </div>
            <div className="text-2xl font-semibold tracking-tight">
              {activeSession && formatCurrency(activeSession.openingBalance + sessionTotals.net)}
            </div>
          </div>

          <div>
            <label className="block text-[9px] font-semibold uppercase text-[#686868] mb-1.5 tracking-widest">Montant Réel Constaté (FCFA)</label>
            <input
              type="number"
              value={closingBalance}
              onChange={e => setClosingBalance(e.target.value)}
              className="w-full h-12 focus-ring px-4 bg-white border-none rounded-lg font-semibold font-mono text-base"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-[9px] font-semibold uppercase text-[#686868] mb-1.5 tracking-widest">Commentaires de clôture</label>
            <textarea
              value={closeNotes}
              onChange={e => setCloseNotes(e.target.value)}
              className="w-full h-24 focus-ring p-4 bg-white border-none rounded-lg font-semibold resize-none"
              placeholder="Observations, écarts éventuels..."
            />
          </div>
        </div>

        <div className="flex gap-3 mt-4">
          <button
            onClick={() => setShowCloseModal(false)}
            className="flex-1 h-10 border-sb border-[#e5e5e5] rounded-lg text-[11px] font-semibold uppercase tracking-widest hover:bg-gray-50"
          >
            Annuler
          </button>
          <button
            onClick={handleCloseSession}
            disabled={loading}
            className="flex-1 h-10 bg-red-600 text-white rounded-lg text-[11px] font-semibold uppercase tracking-widest btn-interactive shadow-lg shadow-red-100"
          >
            {loading ? 'Fermeture...' : 'Confirmer la Clôture'}
          </button>
        </div>
      </div>
    </Modal>
  );

  const renderTransferModal = () => showTransferModal && (
    <Modal
      isOpen={showTransferModal}
      onClose={() => setShowTransferModal(false)}
      title="Nouveau Transfert"
      size="sm"
    >
      <div className="space-y-4 animate-scale-in">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
            <ArrowUpRight size={14} />
          </div>
          <h3 className="text-base font-semibold tracking-tight uppercase text-blue-600">Transfert de fonds</h3>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-[9px] font-semibold uppercase text-[#686868] mb-1.5 tracking-widest">Montant à transférer (FCFA)</label>
            <input
              type="number"
              value={transferAmount}
              onChange={e => setTransferAmount(e.target.value)}
              className="w-full h-12 focus-ring px-4 bg-gray-50 border-none rounded-lg font-semibold font-mono text-base"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-[9px] font-semibold uppercase text-[#686868] mb-1.5 tracking-widest">Destinataire (Manager)</label>
            <select
              value={transferTo}
              onChange={e => setTransferTo(e.target.value)}
              className="w-full h-12 focus-ring px-4 bg-gray-50 border-none rounded-lg font-semibold appearance-none"
            >
              <option value="">Sélectionner un manager...</option>
              {users.filter(u => u.role === 'MANAGER' || u.role === 'ADMIN').map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[9px] font-semibold uppercase text-[#686868] mb-1.5 tracking-widest">Notes / Référence</label>
            <textarea
              value={transferNotes}
              onChange={e => setTransferNotes(e.target.value)}
              className="w-full h-24 focus-ring p-4 bg-gray-50 border-none rounded-lg font-semibold resize-none"
              placeholder="Détails du transfert..."
            />
          </div>
        </div>

        <div className="flex gap-3 mt-4">
          <button
            onClick={() => setShowTransferModal(false)}
            className="flex-1 h-10 border-sb border-[#e5e5e5] rounded-lg text-[11px] font-semibold uppercase tracking-widest hover:bg-gray-50"
          >
            Annuler
          </button>
          <button
            onClick={handleCreateTransfer}
            disabled={loading}
            className="flex-1 h-10 bg-blue-600 text-white rounded-lg text-[11px] font-semibold uppercase tracking-widest btn-interactive shadow-lg shadow-blue-100"
          >
            {loading ? 'Traitement...' : 'Déclencher le Transfert'}
          </button>
        </div>
      </div>
    </Modal>
  );

  const renderRegisterModal = () => (showRegisterModal || showEditRegisterModal) && (
    <Modal
      isOpen={showRegisterModal || showEditRegisterModal}
      onClose={() => {
        setShowRegisterModal(false);
        setShowEditRegisterModal(false);
        resetRegisterForm();
      }}
      title={showEditRegisterModal ? 'Modification de Caisse' : 'Nouvelle Caisse'}
      size="sm"
    >
      <div className="space-y-4 animate-scale-in">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-[#f0fdf4] rounded-lg flex items-center justify-center text-[#3ecf8e]">
            <Building2 size={14} />
          </div>
          <h3 className="text-base font-semibold tracking-tight uppercase">
            {showEditRegisterModal ? 'Paramètres Caisse' : 'Ajouter une Caisse'}
          </h3>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-[9px] font-semibold uppercase text-[#686868] mb-1.5 tracking-widest">Nom de la caisse</label>
            <input
              type="text"
              value={newRegisterName}
              onChange={e => setNewRegisterName(e.target.value)}
              className="w-full h-12 focus-ring px-4 bg-gray-50 border-none rounded-lg font-semibold"
              placeholder="Ex: Caisse Principale"
            />
          </div>

          <div>
            <label className="block text-[9px] font-semibold uppercase text-[#686868] mb-1.5 tracking-widest">Localisation</label>
            <input
              type="text"
              value={newRegisterLocation}
              onChange={e => setNewRegisterLocation(e.target.value)}
              className="w-full h-12 focus-ring px-4 bg-gray-50 border-none rounded-lg font-semibold"
              placeholder="Ex: Accueil Showroom"
            />
          </div>

          <div>
            <label className="block text-[9px] font-semibold uppercase text-[#686868] mb-1.5 tracking-widest">Showroom</label>
            <select
              value={newRegisterShowroom}
              onChange={e => setNewRegisterShowroom(e.target.value)}
              className="w-full h-12 focus-ring px-4 bg-gray-50 border-none rounded-lg font-semibold appearance-none"
            >
              <option value="">Tous les showrooms</option>
              {(showrooms || []).map((s: ShowroomConfig) => (
                <option key={s.id} value={s.id}>{s.id}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[9px] font-semibold uppercase text-[#686868] mb-1.5 tracking-widest">Opérateur par défaut</label>
            {currentUser?.role === 'AGENT' ? (
              <input type="text" value={currentUser?.name || 'Moi'} readOnly className="w-full h-12 px-4 bg-gray-100 border-none rounded-lg font-semibold text-[#686868] cursor-not-allowed" />
            ) : (
              <select
                value={operatorId}
                onChange={e => setOperatorId(e.target.value)}
                className="w-full h-12 focus-ring px-4 bg-gray-50 border-none rounded-lg font-semibold appearance-none"
              >
                <option value="">Sélectionner (Facultatif)</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            )}
          </div>
        </div>

        <div className="flex gap-3 mt-4">
          <button
            onClick={() => {
              setShowRegisterModal(false);
              setShowEditRegisterModal(false);
              resetRegisterForm();
            }}
            className="flex-1 h-10 border-sb border-[#e5e5e5] rounded-lg text-[11px] font-semibold uppercase tracking-widest hover:bg-gray-50"
          >
            Annuler
          </button>
          <button
            onClick={handleSaveRegister}
            disabled={loading}
            className="flex-1 h-10 bg-[#1c1c1c] text-white rounded-lg text-[11px] font-semibold uppercase tracking-widest btn-interactive shadow-lg shadow-gray-200"
          >
            {loading ? '...' : (showEditRegisterModal ? 'Mettre à jour' : 'Enregistrer')}
          </button>
        </div>
      </div>
    </Modal>
  );

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-3 space-y-5 animate-sb-entry pb-20">
      <header className="space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#3ecf8e]/10 rounded-xl flex items-center justify-center text-[#3ecf8e]">
              <Calculator size={18} />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
                Gestion de Caisse
              </h1>
              <p className="text-xs text-[#686868] font-semibold uppercase tracking-wider mt-0.5">Trésorerie et flux financiers en temps réel.</p>
            </div>
          </div>
        </div>

        <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit overflow-x-auto">
          {(['active', 'journal', 'transfers', 'history', 'settings', ...(currentUser?.role === 'ADMIN' ? ['audit'] : [])] as Tab[]).map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`flex items-center gap-2 px-6 py-2 text-[9px] font-semibold uppercase tracking-widest rounded-lg transition-all ${activeTab === t ? 'bg-white shadow-sm text-[#1c1c1c]' : 'text-[#686868] hover:text-[#1c1c1c]'}`}>
              {t === 'active' && 'Session'}
              {t === 'journal' && 'Journal'}
              {t === 'transfers' && 'Transferts'}
              {t === 'history' && 'Historique'}
              {t === 'settings' && 'Paramètres'}
              {t === 'audit' && 'Audit'}
            </button>
          ))}
        </div>
      </header>

      {activeTab === 'active' && renderActiveSession()}
      {activeTab === 'journal' && renderJournal()}
      {activeTab === 'transfers' && renderTransfers()}
      {activeTab === 'history' && renderHistory()}
      {activeTab === 'settings' && renderSettings()}
      {activeTab === 'audit' && currentUser?.role === 'ADMIN' && renderAudit()}

      {renderOpenModal()}
      {renderEntryModal()}
      {renderCloseModal()}
      {renderJournalDetailModal()}
      {renderTransferModal()}
      {renderRegisterModal()}
      {renderHistoryDetailModal()}

      <LoadingModal isOpen={loading} message={loadingMessage} />

      <ConfirmModal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleConfirmDelete}
        title={deleteConfirm?.mode === 'archive' ? "Archiver la caisse" : "Désactiver la caisse"}
        message={deleteConfirm?.message || ''}
        confirmText={deleteConfirm?.mode === 'archive' ? "Archiver" : "Désactiver"}
      />
    </div>
  );
};

export default Caisse;
