
import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Users, Search, UserPlus, RefreshCw,
  ChevronLeft, ChevronRight, Edit3,
  Building2, User as UserIcon, Mail, Smartphone,
  CreditCard, ExternalLink, Filter,
  Upload, Download, ArrowRight, CheckCircle2,
  // Enhanced features icons
  Tag, Clock, MessageSquare, QrCode, History, Star, TrendingUp, Calendar,
  Phone, Mail as MailIcon, Smartphone as SmartphoneIcon, MapPin, Plus
} from 'lucide-react';
import { useData, useNotifications, useUser } from '../App';
import { Customer, CustomerTimeline, CustomerSegment, CommunicationLog } from '../types';
import Modal from '../components/Modal';
import Drawer from '../components/Drawer';
import { SkeletonHeader, SkeletonRow } from '../components/Skeleton';
import { SmallCard } from '../components/SmallCard';
import { ModuleTips } from '../components/ModuleTips';
import { ApiService } from '../services/apiService';
import * as XLSX from 'xlsx';

const ITEMS_PER_PAGE = 10;

const Customers: React.FC = () => {
  const _useData = (() => { try { return useData(); } catch { return { customers: [], saveCustomer: () => { }, refreshAll: () => { }, isLoading: false, isSyncing: false, tickets: [] }; } })();
  const {
    customers = [], saveCustomer = () => { }, refreshAll = () => { }, isLoading = false, isSyncing = false,
    tickets = []
  } = _useData;
  const customerTimeline: any[] = [];
  const customerSegments: any[] = [];
  const communicationLogs: any[] = [];
  const addTimelineEntry = async (entry: any) => { };
  const generateCustomerPortal = async (customerId: string) => { };
  const addCommunicationLog = async (log: any) => { };
  const { addNotification, showModalNotification } = (() => { try { return useNotifications(); } catch { return { addNotification: () => { }, showModalNotification: () => { } }; } })();
  const { currentUser } = (() => { try { return useUser(); } catch { return { currentUser: null }; } })();

  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  // Filtres
  const [typeFilter, setTypeFilter] = useState('Tous');
  const [statusFilter, setStatusFilter] = useState('Tous');
  const [segmentFilter, setSegmentFilter] = useState('Tous');

  // --- ENHANCED FEATURES STATES ---
  const [activeTab, setActiveTab] = useState<'infos' | 'timeline' | 'communications'>('infos');
  const [newTimelineEntry, setNewTimelineEntry] = useState({ type: 'CALL' as const, title: '', description: '' });
  const [newCommunication, setNewCommunication] = useState({ type: 'CALL' as const, content: '', direction: 'OUT' as const });
  const [isPortalGenerating, setIsPortalGenerating] = useState(false);
  const [customerPortal, setCustomerPortal] = useState<any>(null);

  // Import/Export State
  const [isMappingModalOpen, setIsMappingModalOpen] = useState(false);
  const [rawImportData, setRawImportData] = useState<any[]>([]);
  const [fileHeaders, setFileHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({
    name: '', phone: '', email: '', companyName: '',
    type: '', address: '', status: ''
  });
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { refreshAll(); }, [refreshAll]);

  // Helper functions for enhanced features
  const getCustomerSegments = (customerId: string): string[] => {
    return (customerSegments || []).filter((s: any) => s.customerId === customerId).map((s: any) => s.segment);
  };

  const getCustomerTimeline = (customerId: string): any[] => {
    return (customerTimeline || []).filter((t: any) => t.customerId === customerId).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const getCustomerCommunications = (customerId: string): any[] => {
    return (communicationLogs || []).filter((c: any) => c.customerId === customerId).sort((a: any, b: any) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
  };

  const getCustomerTickets = (customerId: string) => {
    return (tickets || []).filter((t: any) => t.customerId === customerId || t.customerPhone === selectedCustomer?.phone);
  };

  const filtered = useMemo(() => {
    return (customers || []).filter((c: Customer) => {
      if (c.isArchived) return false;

      const matchesSearch = (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.phone || '').includes(searchTerm) ||
        (c.companyName || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType = typeFilter === 'Tous' || c.type === typeFilter;
      const matchesStatus = statusFilter === 'Tous' || c.status === statusFilter;

      // Segment filter
      const segments = getCustomerSegments(c.id);
      const matchesSegment = segmentFilter === 'Tous' || segments.includes(segmentFilter as any);

      return matchesSearch && matchesType && matchesStatus && matchesSegment;
    }).sort((a: Customer, b: Customer) => (b.totalSpent || 0) - (a.totalSpent || 0));
  }, [customers, searchTerm, typeFilter, statusFilter, segmentFilter, customerSegments]);

  const stats = useMemo(() => {
    const total = filtered.length;
    const vips = filtered.filter((c: Customer) => getCustomerSegments(c.id).includes('VIP')).length;
    const pros = filtered.filter((c: Customer) => getCustomerSegments(c.id).includes('Professionnel')).length;
    const totalSpent = filtered.reduce((acc: number, c: Customer) => acc + (c.totalSpent || 0), 0);
    return { total, vips, pros, avgSpent: total > 0 ? totalSpent / total : 0 };
  }, [filtered, customerSegments]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    const formData = new FormData(e.currentTarget);
    const data: Customer = {
      id: editingCustomer?.id || `C-${Date.now()}`,
      name: formData.get('name') as string,
      phone: formData.get('phone') as string,
      email: formData.get('email') as string,
      type: formData.get('type') as any,
      address: formData.get('address') as string,
      status: formData.get('status') as string,
      companyName: formData.get('companyName') as string,
      totalSpent: editingCustomer?.totalSpent || 0,
      ticketsCount: editingCustomer?.ticketsCount || 0,
      lastVisit: editingCustomer?.lastVisit || new Date().toISOString(),
      createdBy: editingCustomer?.createdBy || currentUser?.id
    };

    try {
      await saveCustomer(data);
      showModalNotification({ title: 'Enregistré ✓', message: 'Fiche client synchronisée.', type: 'success' });
    } catch {
      showModalNotification({ title: 'Échec', message: 'Échec de la sauvegarde.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isCSV = file.name.toLowerCase().endsWith('.csv');
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        let wb;
        if (isCSV) {
          const text = evt.target?.result as string;
          wb = XLSX.read(text, { type: 'string', raw: true });
        } else {
          const data = new Uint8Array(evt.target?.result as ArrayBuffer);
          wb = XLSX.read(data, { type: 'array', raw: true });
        }
        if (!wb.SheetNames || wb.SheetNames.length === 0) throw new Error('Aucune feuille trouvée');
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        if (!ws) throw new Error('Feuille vide');
        const rawData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as any[][];
        if (rawData.length < 2) throw new Error('Fichier sans données');
        const headers = (rawData[0] as string[]).map(h => String(h || '').trim());
        const dataRows = rawData.slice(1).filter((r: any[]) => r.some((c: any) => String(c || '').trim()));
        if (dataRows.length === 0) throw new Error('Aucune ligne de données valide');
        setFileHeaders(headers);
        const newMapping = { ...mapping };
        headers.forEach(h => {
          const low = h.toLowerCase();
          if (low.includes('nom') || low.includes('name') || low.includes('identité') || low.includes('client')) newMapping.name = h;
          if (low.includes('tél') || low.includes('phone') || low.includes('mobile') || low.includes('tel')) newMapping.phone = h;
          if (low.includes('email') || low.includes('courriel') || low.includes('mail')) newMapping.email = h;
          if (low.includes('société') || low.includes('company') || low.includes('entreprise') || low.includes('raison')) newMapping.companyName = h;
          if (low.includes('type') || low.includes('catégorie') || low.includes('categorie')) newMapping.type = h;
          if (low.includes('adresse') || low.includes('address') || low.includes('localisation')) newMapping.address = h;
          if (low.includes('statut') || low.includes('status') || low.includes('segment')) newMapping.status = h;
        });
        setMapping(newMapping);
        const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
        setRawImportData(dataRows.length > 0 && headers.length > 0
          ? dataRows.map((r: any[]) => headers.reduce((obj: any, h, i) => { obj[h] = r[i]; return obj; }, {}))
          : rows);
        setIsMappingModalOpen(true);
      } catch (err: any) {
        console.error('Import error:', err);
        addNotification({ title: 'Erreur Fichier', message: err?.message || 'Format invalide ou corrompu.', type: 'error' });
      }
    };
    if (isCSV) reader.readAsText(file);
    else reader.readAsArrayBuffer(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const processImport = async () => {
    if (!mapping.name && !mapping.phone) {
      addNotification({ title: 'Mapping requis', message: 'Nom ou Téléphone sont obligatoires.', type: 'warning' });
      return;
    }
    setIsImporting(true);
    try {
      const finalCustomers: Customer[] = [];
      rawImportData.forEach((row: any, i: number) => {
        const phone = String(row[mapping.phone] || '');
        const existingRow: Customer | undefined = customers.find((c: any) =>
          (phone && c.phone === phone) || c.name === (row[mapping.name] || '')
        ) as any;
        const rowTotalSpent = existingRow?.totalSpent || 0;
        const rowTicketsCount = existingRow?.ticketsCount || 0;
        const rowLastVisit = existingRow?.lastVisit || new Date().toISOString();
        const customer: Customer = existingRow || {
          id: `C-IMP-${Date.now()}-${i}`,
          name: String(row[mapping.name] || 'Client sans nom'),
          phone: phone || `+241-IMP-${i}`,
          email: row[mapping.email] ? String(row[mapping.email]) : '',
          companyName: row[mapping.companyName] ? String(row[mapping.companyName]) : '',
          type: (row[mapping.type] === 'Entreprise' ? 'Entreprise' : 'Particulier') as any,
          address: row[mapping.address] ? String(row[mapping.address]) : '',
          status: (row[mapping.status] === 'VIP' ? 'VIP' : row[mapping.status] === 'Litige' ? 'Litige' : 'Actif') as any,
          totalSpent: rowTotalSpent,
          ticketsCount: rowTicketsCount,
          lastVisit: rowLastVisit
        };
        if (existingRow) Object.assign(customer, { ...existingRow, name: customer.name, phone: customer.phone });
        if (!customer.createdBy) customer.createdBy = currentUser?.id;
        finalCustomers.push(customer);
      });
      if (finalCustomers.length > 0) await ApiService.customers.saveAll(finalCustomers);
      addNotification({ title: 'Import Clients', message: `${finalCustomers.length} clients synchronisés.`, type: 'success' });
      setIsMappingModalOpen(false);
      refreshAll();
    } catch (err: any) {
      console.error('Import process error:', err);
      addNotification({ title: 'Erreur Import', message: err?.details || err?.message || 'Échec de l\'opération massive.', type: 'error' });
    } finally {
      setIsImporting(false);
    }
  };

  const handleExportXLS = () => {
    const data = filtered.map((c: Customer) => ({
      'Nom': c.name,
      'Téléphone': c.phone,
      'Email': c.email || '',
      'Société': c.companyName || '',
      'Type': c.type,
      'Adresse': c.address || '',
      'Statut': c.status,
      'Total Dépensé': c.totalSpent || 0,
      'Tickets': c.ticketsCount || 0,
      'Dernière Visite': c.lastVisit ? new Date(c.lastVisit).toLocaleDateString('fr-FR') : ''
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Clients');
    XLSX.writeFile(wb, `Clients_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'VIP': return 'bg-[#fffbeb] text-[#b45309] border-[#fef3c7]';
      case 'Litige': return 'bg-[#fff1f2] text-[#e11d48] border-[#ffe4e6]';
      case 'Actif': return 'bg-[#f0fdf4] text-[#16a34a] border-[#dcfce7]';
      default: return 'bg-[#f9fafb] text-[#4b5563] border-[#f3f4f6]';
    }
  };

  const getInitialColor = (name: string) => {
    const colors = ['bg-blue-100 text-blue-600', 'bg-purple-100 text-purple-600', 'bg-emerald-100 text-emerald-600', 'bg-pink-100 text-pink-600'];
    const index = (name || 'A').charCodeAt(0) % colors.length;
    return colors[index];
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
                Répertoire Clients
              </h1>
              <p className="text-xs text-[#686868] font-semibold uppercase tracking-wider mt-0.5">Gestion des fiches clients et historique d'achat</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => fileInputRef.current?.click()} className="btn-sb-outline h-8 px-3 text-xs">
              <Upload size={14} /> Import
            </button>
            <input type="file" ref={fileInputRef} accept=".xlsx,.xls,.csv" hidden onChange={handleFileSelect} />
            <button onClick={handleExportXLS} className="btn-sb-outline h-8 px-3 text-xs">
              <Download size={14} /> XLS
            </button>
            <button onClick={refreshAll} className="btn-sb-outline h-8 px-3 text-xs">
              <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
            </button>
            {currentUser?.role !== 'MANAGER' && (
              <button onClick={() => { setEditingCustomer(null); setIsModalOpen(true); }} className="btn-sb-primary h-8 px-4 text-xs">
                <UserPlus size={14} /> <span>Nouveau Client</span>
              </button>
            )}
          </div>
        </header>
      )}

      {/* Module Tips */}
      <ModuleTips
        moduleName="Répertoire Clients"
        storageKey="customers_module"
        tips={[
          {
            id: 'customers-1',
            title: 'Segmentation clients',
            content: 'Les clients sont classés en segments (VIP, Professionnel, Standard) selon leur historique d\'achat. Utilisez les filtres pour cibler des groupes spécifiques.',
            target: 'Filtres de segmentation'
          },
          {
            id: 'customers-2',
            title: 'Recherche intelligente',
            content: 'La recherche fonctionne sur le nom, le téléphone, l\'email et le nom de l\'entreprise. Les résultats sont triés par montant total dépensé.',
            target: 'Barre de recherche'
          },
          {
            id: 'customers-3',
            title: 'Fiche client complète',
            content: 'Cliquez sur un client pour voir sa fiche détaillée avec l\'historique des achats, les communications, les tickets SAV et le portail client.',
            target: 'Tableau des clients'
          },
          {
            id: 'customers-4',
            title: 'Timeline et suivis',
            content: 'Enregistrez les interactions avec vos clients (appels, emails, visites) dans leur timeline pour un suivi commercial efficace.',
            target: 'Onglet Timeline'
          }
        ]}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <SmallCard
          title="Total Clients"
          value={stats.total}
          icon={<Users size={14} />}
          color="#1c1c1c"
          tip="Nombre total de clients actifs dans le répertoire"
        />
        <SmallCard
          title="VIP"
          value={stats.vips}
          icon={<Star size={14} />}
          color="#f59e0b"
          tip="Clients segment VIP - priorité haute"
        />
        <SmallCard
          title="Professionnels"
          value={stats.pros}
          icon={<Building2 size={14} />}
          color="#3b82f6"
          tip="Clients de type entreprise ou professionnel"
        />
        <SmallCard
          title="Dépense Moyenne"
          value={`${Math.round(stats.avgSpent).toLocaleString()} F`}
          icon={<CreditCard size={14} />}
          color="#22c55e"
          tip="Montant moyen dépensé par client"
        />
        <SmallCard
          title="CA Total"
          value={`${(filtered.reduce((acc: number, c: Customer) => acc + (c.totalSpent || 0), 0) / 1000000).toFixed(1)}M F`}
          icon={<TrendingUp size={14} />}
          color="#8b5cf6"
          tip="Chiffre d'affaires total des clients filtrés"
        />
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af] group-focus-within:text-[#3ecf8e] transition-colors" size={14} />
          <input
            type="text"
            placeholder="Rechercher par nom, téléphone, email, entreprise..."
            className="w-full pl-10 pr-4 h-8 rounded-lg border border-[#e5e5e5] text-sm focus:border-[#3ecf8e] focus:ring-2 focus:ring-[#3ecf8e]/20 transition-all"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <button
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          className={`h-8 px-3 rounded-lg border text-xs font-semibold transition-all flex items-center gap-2 ${showAdvancedFilters ? 'border-[#3ecf8e] text-[#3ecf8e] bg-[#f0fdf4]' : 'border-[#e5e5e5] text-[#686868] hover:border-[#d1d1d1]'}`}
        >
          <Filter size={14} /> Filtres
          {(typeFilter !== 'Tous' || statusFilter !== 'Tous' || segmentFilter !== 'Tous') && (
            <span className="w-2 h-2 rounded-full bg-[#3ecf8e]"></span>
          )}
        </button>
      </div>

      {showAdvancedFilters && (
        <div className="bg-[#f8f9fa] rounded-lg border border-[#e5e5e5] p-3 animate-sb-entry">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold text-[#686868] uppercase tracking-wide">Filtres actifs</span>
            <button
              onClick={() => { setTypeFilter('Tous'); setStatusFilter('Tous'); setSegmentFilter('Tous'); setSearchTerm(''); }}
              className="text-[11px] text-[#3ecf8e] hover:underline"
            >
              Réinitialiser
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-[9px] font-semibold text-[#686868] uppercase">Type de compte</label>
              <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="w-full h-8 text-xs rounded-md border border-[#e5e5e5]">
                <option value="Tous">Tous</option>
                <option value="Particulier">Particulier</option>
                <option value="Entreprise">Entreprise</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-semibold text-[#686868] uppercase">Segment</label>
              <select value={segmentFilter} onChange={e => setSegmentFilter(e.target.value)} className="w-full h-8 text-xs rounded-md border border-[#e5e5e5]">
                <option value="Tous">Tous</option>
                <option value="VIP">VIP</option>
                <option value="Professionnel">Professionnel</option>
                <option value="Standard">Standard</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-semibold text-[#686868] uppercase">Statut</label>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full h-8 text-xs rounded-md border border-[#e5e5e5]">
                <option value="Tous">Tous</option>
                <option value="Actif">Actif</option>
                <option value="Inactif">Inactif</option>
                <option value="Litige">Litige</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg border border-[#e5e5e5] overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-[#f8f9fa] border-b border-[#e5e5e5]">
            <tr>
              <th className="w-1/3 px-2 py-2 text-[11px] font-bold text-[#686868] uppercase tracking-wide">Client & Structure</th>
              <th className="px-2 py-2 text-[11px] font-bold text-[#686868] uppercase tracking-wide">Coordonnées</th>
              <th className="px-2 py-2 text-[11px] font-bold text-[#686868] uppercase tracking-wide">Consommation</th>
              <th className="px-2 py-2 text-[11px] font-bold text-[#686868] uppercase tracking-wide">Segment</th>
              <th className="px-2 py-2 text-right text-[11px] font-bold text-[#686868] uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f0f0f0]">
            {paginated.map((c: Customer) => (
              <tr
                key={c.id}
                onClick={() => setSelectedCustomer(c)}
                className="cursor-pointer group transition-all duration-200 hover:bg-[#f8f9fa]"
              >
                <td className="px-2 py-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-semibold text-sm ${getInitialColor(c.name)} border border-white`}>
                      {c.name ? c.name[0] : '?'}
                    </div>
                    <div>
                      <p className="text-[12px] font-semibold text-[#1c1c1c] group-hover:text-[#3ecf8e] transition-colors">{c.name}</p>
                      <p className="text-[11px] text-[#9ca3af]">{c.companyName || 'Particulier'}</p>
                    </div>
                  </div>
                </td>
                <td className="px-2 py-2">
                  <div className="flex items-center gap-1.5 text-[#1c1c1c]">
                    <SmartphoneIcon size={10} className="text-[#9ca3af]" />
                    <span className="text-xs font-semibold">{c.phone}</span>
                  </div>
                  {c.email && (
                    <div className="flex items-center gap-1.5 text-[#686868] mt-0.5">
                      <Mail size={10} className="text-[#9ca3af]" />
                      <span className="text-[11px] truncate max-w-[150px]">{c.email}</span>
                    </div>
                  )}
                </td>
                <td className="px-2 py-2">
                  <p className="text-sm font-semibold text-[#1c1c1c]">{(c.totalSpent || 0).toLocaleString()} F</p>
                  <p className="text-[9px] text-[#9ca3af] uppercase">{c.ticketsCount || 0} ticket{c.ticketsCount > 1 ? 's' : ''} SAV</p>
                </td>
                <td className="px-2 py-2">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase ${getStatusBadge(c.status)}`}>
                    {c.status}
                  </span>
                </td>
                <td className="px-2 py-2 text-right">
                  <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingCustomer(c); setIsModalOpen(true); }}
                      className="p-1.5 text-[#686868] hover:text-[#3ecf8e] border border-[#e5e5e5] rounded hover:border-[#3ecf8e]/30 bg-white transition-all"
                    >
                      <Edit3 size={12} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="px-4 py-3 bg-[#f8f9fa] border-t border-[#e5e5e5] flex items-center justify-between">
          <p className="text-[11px] text-[#686868] font-semibold">{paginated.length} sur {filtered.length}</p>
          <div className="flex items-center gap-1">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
              className="p-1 text-[#686868] hover:bg-white border border-transparent hover:border-[#e5e5e5] rounded disabled:opacity-30"
            >
              <ChevronLeft size={14} />
            </button>
            <div className="flex gap-1 px-1">
              {[...Array(Math.min(5, totalPages))].map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`w-6 h-6 text-[11px] font-semibold rounded flex items-center justify-center transition-all ${currentPage === i + 1 ? 'bg-[#3ecf8e] text-white' : 'text-[#686868] hover:bg-white'}`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
              className="p-1 text-[#686868] hover:bg-white border border-transparent hover:border-[#e5e5e5] rounded disabled:opacity-30"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {paginated.length === 0 && (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-[#f5f5f5] rounded-full flex items-center justify-center mx-auto mb-3">
              <Users size={16} className="text-[#9ca3af]" />
            </div>
            <p className="text-sm font-semibold text-[#686868]">Aucun client trouvé</p>
            <p className="text-xs text-[#9ca3af] mt-0.5">Modifiez vos critères de recherche</p>
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingCustomer ? "Édition Fiche Client" : "Création Fiche Client"}>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-[#686868] uppercase">Identité complète</label>
              <input name="name" type="text" defaultValue={editingCustomer?.name} placeholder="ex: Jean Mba" required className="w-full" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-[#686868] uppercase">Téléphone</label>
              <input name="phone" type="tel" defaultValue={editingCustomer?.phone} placeholder="+241 ..." required className="w-full" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-[#686868] uppercase">Email</label>
              <input name="email" type="email" defaultValue={editingCustomer?.email} placeholder="contact@email.ga" className="w-full" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-[#686868] uppercase">Raison sociale (B2B)</label>
              <input name="companyName" type="text" defaultValue={editingCustomer?.companyName} placeholder="Optionnel" className="w-full" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-[#686868] uppercase">Catégorie</label>
              <select name="type" defaultValue={editingCustomer?.type || 'Particulier'} className="w-full">
                <option value="Particulier">Particulier</option>
                <option value="Entreprise">Entreprise</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-[#686868] uppercase">Segmentation</label>
              <select name="status" defaultValue={editingCustomer?.status || 'Actif'} className="w-full">
                <option value="Actif">Actif</option>
                <option value="VIP">VIP</option>
                <option value="Litige">Litige</option>
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-[#686868] uppercase">Localisation / Adresse</label>
            <textarea name="address" rows={2} defaultValue={editingCustomer?.address} placeholder="Quartier, Ville..." className="w-full" />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn-sb-outline">Annuler</button>
            <button type="submit" disabled={isSaving} className="btn-sb-primary">
              {isSaving ? <RefreshCw className="animate-spin" size={14} /> : 'Enregistrer la fiche'}
            </button>
          </div>
        </form>
      </Modal>

      <Drawer
        isOpen={!!selectedCustomer}
        onClose={() => setSelectedCustomer(null)}
        title="Dossier Client 360°"
        subtitle={`Réf: ${selectedCustomer?.id}`}
        icon={<UserIcon size={14} />}
      >
        {selectedCustomer && (
          <div className="space-y-4 animate-sb-entry">
            {/* HEADER */}
            <div className="flex flex-col items-center text-center p-4 bg-[#f8f9fa] border border-[#e5e5e5] rounded-lg">
              <div className={`w-16 h-16 rounded-lg flex items-center justify-center text-3xl font-semibold mb-3 border border-white ${getInitialColor(selectedCustomer.name)}`}>
                {selectedCustomer.name ? selectedCustomer.name[0] : '?'}
              </div>
              <h3 className="text-base font-bold text-[#1c1c1c] tracking-tight">{selectedCustomer.name}</h3>
              <p className="text-[12px] text-[#686868] font-semibold">{selectedCustomer.companyName || 'Particulier'}</p>

              {/* Segments */}
              <div className="flex flex-wrap gap-2 mt-3 justify-center">
                {getCustomerSegments(selectedCustomer.id).map((segment: string) => (
                  <span key={segment} className={`px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase ${segment === 'VIP' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                      segment === 'Professionnel' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                        'bg-gray-100 text-gray-700 border border-gray-200'
                    }`}>
                    <Star size={10} className="inline mr-1" /> {segment}
                  </span>
                ))}
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase bg-[#3ecf8e]/10 text-[#3ecf8e] border border-[#3ecf8e]/20">
                  {selectedCustomer.type}
                </span>
              </div>

              {/* QR Portal Button */}
              <button
                onClick={async () => {
                  setIsPortalGenerating(true);
                  try {
                    const portal = await generateCustomerPortal(selectedCustomer.id);
                    setCustomerPortal(portal);
                    addNotification({ title: 'Portail', message: 'QR Code généré avec succès', type: 'success' });
                  } catch (e) {
                    addNotification({ title: 'Erreur', message: 'Impossible de générer le portail', type: 'error' });
                  } finally {
                    setIsPortalGenerating(false);
                  }
                }}
                disabled={isPortalGenerating}
                className="mt-4 flex items-center gap-2 px-4 py-2 bg-white border border-[#e5e5e5] rounded-lg text-xs font-semibold text-[#686868] hover:text-[#3ecf8e] hover:border-[#3ecf8e] transition-all"
              >
                {isPortalGenerating ? <RefreshCw className="animate-spin" size={14} /> : <QrCode size={14} />}
                Générer QR Portail Client
              </button>
            </div>

            {/* STATS CARDS */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 border border-[#e5e5e5] rounded-lg bg-white text-center">
                <p className="text-[9px] font-semibold text-[#686868] uppercase">Total Dépenses</p>
                <p className="text-sm font-semibold text-[#1c1c1c]">{(selectedCustomer.totalSpent || 0).toLocaleString()} F</p>
              </div>
              <div className="p-3 border border-[#e5e5e5] rounded-lg bg-white text-center">
                <p className="text-[9px] font-semibold text-[#686868] uppercase">Interventions</p>
                <p className="text-sm font-semibold text-[#1c1c1c]">{getCustomerTickets(selectedCustomer.id).length}</p>
              </div>
              <div className="p-3 border border-[#e5e5e5] rounded-lg bg-white text-center">
                <p className="text-[9px] font-semibold text-[#686868] uppercase">Dernier Contact</p>
                <p className="text-sm font-semibold text-[#1c1c1c]">{selectedCustomer.lastVisit ? new Date(selectedCustomer.lastVisit).toLocaleDateString('fr-FR') : '—'}</p>
              </div>
            </div>

            {/* TABS */}
            <div className="flex gap-1 bg-[#f8f9fa] p-1 rounded-lg border border-[#e5e5e5]">
              {[
                { id: 'infos', label: 'Infos', icon: <UserIcon size={12} /> },
                { id: 'timeline', label: 'Timeline', icon: <History size={12} /> },
                { id: 'communications', label: 'Comms', icon: <MessageSquare size={12} /> }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-semibold uppercase transition-all ${activeTab === tab.id ? 'bg-white text-[#1c1c1c]' : 'text-[#686868] hover:text-[#1c1c1c]'
                    }`}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>

            {/* TAB: INFOS */}
            {activeTab === 'infos' && (
              <div className="space-y-4 animate-sb-entry">
                <div className="space-y-3">
                  <h4 className="text-[12px] font-semibold text-[#686868] uppercase tracking-widest">Coordonnées</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 p-3 bg-white border border-[#e5e5e5] rounded-lg">
                      <SmartphoneIcon className="text-[#3ecf8e]" size={14} />
                      <span className="text-sm font-semibold text-[#1c1c1c]">{selectedCustomer.phone}</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-white border border-[#e5e5e5] rounded-lg">
                      <MailIcon className="text-[#3ecf8e]" size={14} />
                      <span className="text-sm font-semibold text-[#1c1c1c]">{selectedCustomer.email || '—'}</span>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-white border border-[#e5e5e5] rounded-lg">
                      <MapPin className="text-[#3ecf8e] mt-0.5" size={14} />
                      <span className="text-sm font-semibold text-[#1c1c1c]">{selectedCustomer.address || '—'}</span>
                    </div>
                  </div>
                </div>

                {/* Tickets History */}
                <div className="space-y-3">
                  <h4 className="text-[12px] font-semibold text-[#686868] uppercase tracking-widest">Historique Tickets</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {getCustomerTickets(selectedCustomer.id).length === 0 ? (
                      <p className="text-xs text-[#686868] italic">Aucun ticket</p>
                    ) : (
                      getCustomerTickets(selectedCustomer.id).map((ticket: any) => (
                        <div key={ticket.id} className="p-3 bg-white border border-[#e5e5e5] rounded-lg">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold">#{ticket.id}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${ticket.status === 'Fermé' ? 'bg-gray-100 text-gray-600' : 'bg-green-100 text-green-600'
                              }`}>{ticket.status}</span>
                          </div>
                          <p className="text-xs text-[#686868] mt-1">{ticket.productName || ticket.category}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: TIMELINE */}
            {activeTab === 'timeline' && (
              <div className="space-y-4 animate-sb-entry">
                <div className="space-y-3">
                  <h4 className="text-[12px] font-semibold text-[#686868] uppercase tracking-widest">Parcours Client</h4>
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {getCustomerTimeline(selectedCustomer.id).length === 0 ? (
                      <p className="text-xs text-[#686868] italic">Aucun événement enregistré</p>
                    ) : (
                      getCustomerTimeline(selectedCustomer.id).map((entry: any, idx: number) => (
                        <div key={entry.id || idx} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <div className="w-2 h-2 rounded-full bg-[#3ecf8e]" />
                            <div className="w-px flex-1 bg-[#e5e5e5]" />
                          </div>
                          <div className="pb-4">
                            <p className="text-xs font-semibold text-[#1c1c1c]">{entry.title}</p>
                            <p className="text-[11px] text-[#686868]">{entry.description}</p>
                            <p className="text-[9px] text-[#9ca3af] mt-1">{new Date(entry.date).toLocaleDateString('fr-FR')}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Add Timeline Entry */}
                <div className="border-t border-[#e5e5e5] pt-4 space-y-2">
                  <p className="text-[11px] font-semibold text-[#686868] uppercase">Ajouter un événement</p>
                  <select
                    value={newTimelineEntry.type}
                    onChange={e => setNewTimelineEntry({ ...newTimelineEntry, type: e.target.value as any })}
                    className="w-full h-8 text-xs rounded-lg border border-[#e5e5e5]"
                  >
                    <option value="CALL">Appel</option>
                    <option value="VISIT">Visite</option>
                    <option value="PURCHASE">Achat</option>
                    <option value="SUPPORT">Support</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Titre"
                    value={newTimelineEntry.title}
                    onChange={e => setNewTimelineEntry({ ...newTimelineEntry, title: e.target.value })}
                    className="w-full h-8 text-xs rounded-lg border border-[#e5e5e5] px-3"
                  />
                  <input
                    type="text"
                    placeholder="Description"
                    value={newTimelineEntry.description}
                    onChange={e => setNewTimelineEntry({ ...newTimelineEntry, description: e.target.value })}
                    className="w-full h-8 text-xs rounded-lg border border-[#e5e5e5] px-3"
                  />
                  <button
                    onClick={() => {
                      if (newTimelineEntry.title) {
                        addTimelineEntry({
                          id: `TL-${Date.now()}`,
                          customerId: selectedCustomer.id,
                          type: newTimelineEntry.type,
                          title: newTimelineEntry.title,
                          description: newTimelineEntry.description,
                          date: new Date().toISOString()
                        });
                        setNewTimelineEntry({ type: 'CALL', title: '', description: '' });
                        addNotification({ title: 'Timeline', message: 'Événement ajouté', type: 'success' });
                      }
                    }}
                    className="btn-sb-primary w-full h-8 text-xs"
                  >
                    <Plus size={12} /> Ajouter
                  </button>
                </div>
              </div>
            )}

            {/* TAB: COMMUNICATIONS */}
            {activeTab === 'communications' && (
              <div className="space-y-4 animate-sb-entry">
                <div className="space-y-3">
                  <h4 className="text-[12px] font-semibold text-[#686868] uppercase tracking-widest">Historique Communications</h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {getCustomerCommunications(selectedCustomer.id).length === 0 ? (
                      <p className="text-xs text-[#686868] italic">Aucune communication enregistrée</p>
                    ) : (
                      getCustomerCommunications(selectedCustomer.id).map((comm: any, idx: number) => (
                        <div key={comm.id || idx} className={`p-3 border rounded-lg ${comm.direction === 'OUT' ? 'bg-blue-50 border-blue-100' : 'bg-gray-50 border-gray-100'
                          }`}>
                          <div className="flex items-center justify-between">
                            <span className={`text-[11px] font-semibold ${comm.direction === 'OUT' ? 'text-blue-700' : 'text-gray-700'}`}>
                              {comm.type} {comm.direction === 'OUT' ? '(Sortant)' : '(Entrant)'}
                            </span>
                            <span className="text-[9px] text-[#9ca3af]">{new Date(comm.sentAt).toLocaleDateString('fr-FR')}</span>
                          </div>
                          <p className="text-xs text-[#1c1c1c] mt-1">{comm.content}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Add Communication */}
                <div className="border-t border-[#e5e5e5] pt-4 space-y-2">
                  <p className="text-[11px] font-semibold text-[#686868] uppercase">Nouvelle communication</p>
                  <div className="flex gap-2">
                    <select
                      value={newCommunication.type}
                      onChange={e => setNewCommunication({ ...newCommunication, type: e.target.value as any })}
                      className="h-8 text-xs rounded-lg border border-[#e5e5e5]"
                    >
                      <option value="CALL">Appel</option>
                      <option value="EMAIL">Email</option>
                      <option value="SMS">SMS</option>
                      <option value="WHATSAPP">WhatsApp</option>
                    </select>
                    <select
                      value={newCommunication.direction}
                      onChange={e => setNewCommunication({ ...newCommunication, direction: e.target.value as any })}
                      className="h-8 text-xs rounded-lg border border-[#e5e5e5]"
                    >
                      <option value="OUT">Sortant</option>
                      <option value="IN">Entrant</option>
                    </select>
                  </div>
                  <textarea
                    placeholder="Contenu..."
                    value={newCommunication.content}
                    onChange={e => setNewCommunication({ ...newCommunication, content: e.target.value })}
                    className="w-full h-20 text-xs rounded-lg border border-[#e5e5e5] p-2 resize-none"
                  />
                  <button
                    onClick={() => {
                      if (newCommunication.content) {
                        addCommunicationLog({
                          id: `COMM-${Date.now()}`,
                          customerId: selectedCustomer.id,
                          type: newCommunication.type,
                          direction: newCommunication.direction,
                          content: newCommunication.content,
                          sentAt: new Date().toISOString(),
                          sentBy: currentUser?.name
                        });
                        setNewCommunication({ type: 'CALL', content: '', direction: 'OUT' });
                        addNotification({ title: 'Communication', message: 'Log ajouté', type: 'success' });
                      }
                    }}
                    className="btn-sb-primary w-full h-8 text-xs"
                  >
                    <MessageSquare size={12} /> Enregistrer
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </Drawer>

      <Modal isOpen={isMappingModalOpen} onClose={() => setIsMappingModalOpen(false)} title="Mapping d'Import Clients" size="lg">
        <div className="space-y-8">
          <div className="flex items-start gap-5 p-3 bg-[#f0f9f4] border border-[#dcfce7] rounded-xl shadow-sm">
            <CheckCircle2 className="text-[#3ecf8e] mt-1 shrink-0" size={14} />
            <div>
              <p className="text-sm font-semibold text-[#1c1c1c] uppercase tracking-tight">Fichier Analyse</p>
              <p className="text-xs text-[#686868] font-semibold mt-1">{rawImportData.length} lignes détectées. Mappez les colonnes Excel vers les champs clients.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
            {[
              { key: 'name', label: 'Nom complet', req: true },
              { key: 'phone', label: 'Téléphone', req: true },
              { key: 'email', label: 'Email', req: false },
              { key: 'companyName', label: 'Société', req: false },
              { key: 'type', label: 'Type (Particulier/Entreprise)', req: false },
              { key: 'address', label: 'Adresse', req: false },
              { key: 'status', label: 'Statut', req: false },
            ].map((field: any) => (
              <div key={field.key} className="space-y-1.5">
                <label className="text-[9px] font-semibold text-[#686868] uppercase tracking-wide flex items-center justify-between">
                  <span>{field.label} {field.req && <span className="text-red-500">*</span>}</span>
                </label>
                <select
                  className={`w-full h-11 px-4 rounded-lg font-semibold border-[#e5e5e5] ${mapping[field.key] ? 'border-[#3ecf8e] bg-[#f0fdf4]/50' : ''}`}
                  value={mapping[field.key]}
                  onChange={e => setMapping({ ...mapping, [field.key]: e.target.value })}
                >
                  <option value="">-- Ignorer --</option>
                  {fileHeaders.map((h: string) => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-3 pt-8 border-t border-[#f5f5f5]">
            <button onClick={() => setIsMappingModalOpen(false)} className="btn-sb-outline h-10 px-8 rounded-lg text-[12px] font-semibold uppercase tracking-widest">Annuler</button>
            <button
              onClick={processImport}
              disabled={isImporting || (!mapping.name && !mapping.phone)}
              className="btn-sb-primary h-10 px-12 rounded-lg shadow-lg shadow-[#3ecf8e]/20 text-[12px] font-semibold uppercase tracking-widest"
            >
              {isImporting ? <RefreshCw className="animate-spin" size={16} /> : <><span>Importer {rawImportData.length} clients</span> <ArrowRight size={16} className="ml-2" /></>}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

const StarIcon = ({ size, className }: { size: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

export default Customers;
