
import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Package, Search, Plus, RefreshCw, Edit3, Trash2,
  Minus, Layers, Activity,
  BarChart3, MapPin, Upload,
  AlertTriangle, Boxes, CheckCircle2, AlertCircle,
  Zap, ArrowRight, Sparkles, Filter,
  History, BarChart2, TrendingUp, TrendingDown,
  ChevronLeft, ChevronRight, Download, ArrowUpRight, ArrowDownLeft,
  Printer, Image, ScanLine, Star, Wrench, Link2, ShoppingCart, ClipboardList
} from 'lucide-react';
import {
  BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell, PieChart, Pie, Legend
} from 'recharts';
import { Part, Product, PartSupplier, StockReservation } from '../types';
import { useNotifications, useData, useUser } from '../App';
import Modal from '../components/Modal';
import Drawer from '../components/Drawer';
import { ApiService } from '../services/apiService';
import { SkeletonHeader, SkeletonCard, SkeletonRow } from '../components/Skeleton';
import * as XLSX from 'xlsx';
import { SmallCard } from '../components/SmallCard';
import { ModuleTips } from '../components/ModuleTips';
import ConfirmModal from '../components/ConfirmModal';

const PartsInventory: React.FC = () => {
  const { parts, brands, stockMovements, isLoading, refreshAll, addStockMovement, isSyncing, deletePart, savePart } = (() => { try { return useData(); } catch { return { parts: [], brands: [], stockMovements: [], isLoading: false, refreshAll: () => { }, addStockMovement: () => { }, isSyncing: false, deletePart: () => { }, savePart: () => { } }; } })();
  const { currentUser } = (() => { try { return useUser(); } catch { return { currentUser: null }; } })();
  const { addNotification, showModalNotification } = (() => { try { return useNotifications(); } catch { return { addNotification: () => { }, showModalNotification: () => { } }; } })();

  const [searchTerm, setSearchTerm] = useState('');
  const [stockStatus, setStockStatus] = useState<'all' | 'critical' | 'out'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPart, setEditingPart] = useState<Part | null>(null);
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'liste' | 'stats' | 'historique' | 'inventaire'>('liste');
  const [historyFilter, setHistoryFilter] = useState<'ALL' | 'IN' | 'OUT'>('ALL');

  // Bulk Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // --- FEATURE 1: Stock Alerts (computed in useMemo) ---
  const [alertBadge, setAlertBadge] = useState(0);

  // --- FEATURE 4: Part Compatibility ---
  const [compatMap, setCompatMap] = useState<Record<string, { productId: string; productName: string; productBrand: string }[]>>({});

  // --- FEATURE 5: Barcode Modal ---
  const [barcodePart, setBarcodePart] = useState<Part | null>(null);

  // --- FEATURE 6: Part Suppliers ---
  const [partSuppliers, setPartSuppliers] = useState<Record<string, PartSupplier[]>>({});
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [supplierForm, setSupplierForm] = useState({ supplierName: '', supplierSku: '', purchasePrice: 0, leadTimeDays: 7, isPreferred: false });

  // --- FEATURE 7: Physical Inventory Mode ---
  const [inventoryCounts, setInventoryCounts] = useState<Record<string, number>>({});
  const [inventoryProgress, setInventoryProgress] = useState(0);
  const [isInventoryMode, setIsInventoryMode] = useState(false);

  // --- FEATURE 8: Kit Builder ---
  const [kitComponents, setKitComponents] = useState<{ partId: string; partName: string; quantity: number }[]>([]);
  const [isKitModalOpen, setIsKitModalOpen] = useState(false);

  // --- FEATURE 9: Reservations ---
  const [reservations, setReservations] = useState<StockReservation[]>([]);
  const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);
  const [reservationForm, setReservationForm] = useState({ ticketId: '', ticketNumber: '', quantity: 1 });

  // Mapping Import State
  const [isMappingModalOpen, setIsMappingModalOpen] = useState(false);
  const [rawImportData, setRawImportData] = useState<any[]>([]);
  const [fileHeaders, setFileHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({
    name: '', sku: '', currentStock: '', minStock: '', unitPrice: '', location: '', brand: '', category: ''
  });

  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; label: string; message: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { refreshAll(); }, [refreshAll]);

  // --- FEATURE 1: Alertes Stock ---
  useEffect(() => {
    const criticalCount = (parts || []).filter((p: Part) => p.currentStock <= p.minStock && p.currentStock > 0).length;
    const outCount = (parts || []).filter((p: Part) => p.currentStock === 0).length;
    setAlertBadge(criticalCount + outCount);
  }, [parts]);

  // --- Chargement données supplémentaires ---
  useEffect(() => {
    const loadData = async () => {
      try {
        const [suppliers, compat, reserv] = await Promise.all([
          ApiService.partSuppliers.getAll(),
          ApiService.partCompatibility.getAll(),
          ApiService.stockReservations.getAll()
        ]);
        const suppMap: Record<string, PartSupplier[]> = {};
        suppliers.forEach((s: any) => { suppMap[s.partId] = suppMap[s.partId] || []; suppMap[s.partId].push(s); });
        setPartSuppliers(suppMap);
        const compMap: Record<string, any[]> = {};
        compat.forEach((c: any) => { compMap[c.partId] = compMap[c.partId] || []; compMap[c.partId].push(c); });
        setCompatMap(compMap);
        setReservations(reserv as StockReservation[]);
      } catch (e) { console.warn("Données supplémentaires indisponibles (fournisseurs, compatibilité, réservations):", e); }
    };
    loadData();
  }, [parts]);

  const filteredParts = useMemo(() => {
    return (parts || []).filter((p: Part) => {
      const matchesSearch = (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.sku || '').toLowerCase().includes(searchTerm.toLowerCase());
      let matchesStatus = true;
      if (stockStatus === 'critical') matchesStatus = p.currentStock <= p.minStock && p.currentStock > 0;
      if (stockStatus === 'out') matchesStatus = p.currentStock === 0;
      return matchesSearch && matchesStatus;
    }).sort((a: Part, b: Part) => (a.currentStock <= a.minStock ? -1 : 1));
  }, [searchTerm, stockStatus, parts]);

  const stats = useMemo(() => {
    const totalParts = (parts || []).length;
    const critical = (parts || []).filter((p: Part) => p.currentStock <= p.minStock && p.currentStock > 0).length;
    const outOfStock = (parts || []).filter((p: Part) => p.currentStock === 0).length;
    const totalValuation = (parts || []).reduce((acc: number, p: Part) => acc + (p.currentStock * p.unitPrice), 0);

    const categoryDataMap: Record<string, number> = {};
    (parts || []).forEach((p: Part) => {
      categoryDataMap[p.category] = (categoryDataMap[p.category] || 0) + (p.currentStock * p.unitPrice);
    });

    const categoryChartData = Object.entries(categoryDataMap).map(([name, value]) => ({ name, value }));
    const recentMovements = (stockMovements || []).slice(0, 5);

    return { totalParts, critical, outOfStock, totalValuation, categoryChartData, recentMovements };
  }, [parts, stockMovements]);

  const COLORS_CHART = ['#3ecf8e', '#60a5fa', '#fbbf24', '#f87171', '#a78bfa'];



  const handleSavePart = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    const formData = new FormData(e.currentTarget);

    const partData: Part = {
      id: editingPart?.id || `PT-${Date.now()}`,
      name: formData.get('name') as string,
      sku: formData.get('sku') as string,
      category: formData.get('category') as any,
      brand: formData.get('brand') as string,
      currentStock: Number(formData.get('currentStock')),
      minStock: Number(formData.get('minStock')),
      unitPrice: Number(formData.get('unitPrice')),
      purchasePrice: Number(formData.get('purchasePrice')),
      condition: formData.get('condition') as any,
      location: formData.get('location') as string,
      isKit: editingPart?.isKit || false,
      kitComponents: editingPart?.kitComponents || [],
      reservedQuantity: editingPart?.reservedQuantity || 0,
      imageUrl: editingPart?.imageUrl
    };

    try {
      await savePart(partData);
      showModalNotification({ title: 'Enregistré ✓', message: 'Fiche article enregistrée.', type: 'success' });
      setIsModalOpen(false);
    } catch (err) {
      showModalNotification({ title: 'Échec', message: 'Impossible de sauvegarder la pièce.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  // --- FEATURE 2: Mouvements rapides +/- ---
  const handleQuickAdjust = async (part: Part, delta: number, reason: string) => {
    const newStock = Math.max(0, part.currentStock + delta);
    await savePart({ ...part, currentStock: newStock });
    // addStockMovement enregistre l'historique (sans toucher au stock car déjà fait ci-dessus)
    await addStockMovement({
      id: `SM-${Date.now()}`,
      partId: part.id,
      partName: part.name,
      quantity: Math.abs(delta),
      type: delta > 0 ? 'IN' : 'OUT',
      reason,
      date: new Date().toISOString(),
      performedBy: currentUser?.name || 'Système'
    });
    addNotification({ title: 'Stock ajusté', message: `${part.name}: ${delta > 0 ? '+' : ''}${delta}`, type: 'success' });
  };

  // --- FEATURE 3: Prévisions réappro (basé sur vélocité) ---
  const getReorderSuggestion = (part: Part) => {
    const partMovements = (stockMovements || []).filter((m: any) => m.partId === part.id && m.type === 'OUT');
    const totalOut = partMovements.reduce((sum: number, m: any) => sum + m.quantity, 0);
    const avgMonthly = totalOut / 3; // Sur 3 mois de données
    const suggestQty = Math.max(part.minStock * 2 - part.currentStock, Math.ceil(avgMonthly * 2));
    return { avgMonthly: Math.round(avgMonthly), suggestQty: Math.max(0, suggestQty) };
  };

  // --- FEATURE 5: Génération étiquette (SVG Code-barre) ---
  const generateBarcodeSVG = (sku: string) => {
    const bars = sku.split('').map((c, i) => {
      const width = (c.charCodeAt(0) % 3) + 1;
      return `<rect x="${i * 4}" y="0" width="${width}" height="40" fill="#1c1c1c"/>`;
    }).join('');
    return `<svg viewBox="0 0 ${sku.length * 4} 50" class="w-full h-full">${bars}<text x="50%" y="48" text-anchor="middle" font-size="8" font-family="monospace">${sku}</text></svg>`;
  };

  // --- FEATURE 6: Gestion fournisseurs ---
  const handleAddSupplier = async () => {
    if (!selectedPart || !supplierForm.supplierName) return;
    const newSupp = { id: `SUP-${Date.now()}`, partId: selectedPart.id, ...supplierForm };
    const existing = partSuppliers[selectedPart.id] || [];
    await ApiService.partSuppliers.saveAll([...existing, newSupp]);
    setPartSuppliers({ ...partSuppliers, [selectedPart.id]: [...existing, newSupp] });
    setIsSupplierModalOpen(false);
    addNotification({ title: 'Fournisseur', message: 'Ajouté avec succès', type: 'success' });
  };

  // --- FEATURE 7: Mode inventaire physique ---
  const handleInventoryCount = (partId: string, count: number) => {
    setInventoryCounts({ ...inventoryCounts, [partId]: count });
    const counted = Object.keys(inventoryCounts).length + (count >= 0 ? 1 : 0);
    setInventoryProgress(Math.round((counted / (parts || []).length) * 100));
  };

  const submitInventoryCounts = async () => {
    const counts = Object.entries(inventoryCounts).map(([partId, countedQty]) => {
      const part = (parts || []).find((p: Part) => p.id === partId);
      return {
        id: `PIC-${Date.now()}-${partId}`,
        partId,
        countedQuantity: countedQty,
        expectedQuantity: part?.currentStock || 0,
        difference: countedQty - (part?.currentStock || 0),
        countedAt: new Date().toISOString(),
        countedBy: currentUser?.name || 'Inventaire'
      };
    });
    await ApiService.physicalInventoryCounts.saveAll(counts);
    setIsInventoryMode(false);
    setInventoryCounts({});
    addNotification({ title: 'Inventaire', message: `${counts.length} articles comptabilisés`, type: 'success' });
  };

  // --- FEATURE 8: Kit Builder ---
  const handleAddKitComponent = (componentPart: Part, qty: number) => {
    setKitComponents([...kitComponents, { partId: componentPart.id, partName: componentPart.name, quantity: qty }]);
  };

  const handleSaveKit = async () => {
    if (!editingPart) return;
    await savePart({ ...editingPart, isKit: true, kitComponents });
    setIsKitModalOpen(false);
    addNotification({ title: 'Kit', message: 'Assemblage sauvegardé', type: 'success' });
  };

  // --- FEATURE 9: Réservations ---
  const handleAddReservation = async () => {
    if (!selectedPart || !reservationForm.ticketId) return;
    const newRes: StockReservation = {
      id: `RES-${Date.now()}`,
      partId: selectedPart.id,
      ...reservationForm,
      reservedAt: new Date().toISOString(),
      reservedBy: currentUser?.name || 'Système'
    };
    await ApiService.stockReservations.saveAll([...reservations, newRes]);
    await savePart({ ...selectedPart, reservedQuantity: (selectedPart.reservedQuantity || 0) + reservationForm.quantity });
    setReservations([...reservations, newRes]);
    setIsReservationModalOpen(false);
    addNotification({ title: 'Réservation', message: `${reservationForm.quantity} unités réservées`, type: 'success' });
    refreshAll();
  };

  const handleDeletePart = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const part = parts.find(p => p.id === id);
    setDeleteConfirm({
      id,
      label: part?.name || 'cet article',
      message: `Êtes-vous sûr de vouloir supprimer ${part?.name || 'cet article'} de l'inventaire ? Cette action est irréversible.`
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deletePart(deleteConfirm.id);
      showModalNotification({ title: 'Supprimé ✓', message: 'L\'article a été retiré de l\'inventaire.', type: 'success' });
      if (selectedPart?.id === deleteConfirm.id) setSelectedPart(null);
    } catch (err) {
      showModalNotification({ title: 'Échec', message: 'Échec de la suppression.', type: 'error' });
    } finally {
      setDeleteConfirm(null);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result as string;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[];

        if (data.length > 0) {
          const headers = (data[0] as string[]).map(h => String(h || ''));
          setFileHeaders(headers);

          const newMapping = { ...mapping };
          headers.forEach(h => {
            const low = h.toLowerCase();
            if (low.includes('nom') || low.includes('name') || low.includes('désignation')) newMapping.name = h;
            if (low.includes('sku') || low.includes('réf') || low.includes('ref')) newMapping.sku = h;
            if (low.includes('stock') || low.includes('quantité') || low.includes('qty')) newMapping.currentStock = h;
            if (low.includes('min') || low.includes('alerte')) newMapping.minStock = h;
            if (low.includes('prix') || low.includes('price') || low.includes('pu')) newMapping.unitPrice = h;
            if (low.includes('emplacement') || low.includes('loc') || low.includes('rayon')) newMapping.location = h;
            if (low.includes('marque') || low.includes('brand')) newMapping.brand = h;
            if (low.includes('cat')) newMapping.category = h;
          });
          setMapping(newMapping);

          const rows = XLSX.utils.sheet_to_json(ws);
          setRawImportData(rows);
          setIsMappingModalOpen(true);
        }
      } catch (err) {
        addNotification({ title: 'Erreur Fichier', message: 'Format invalide ou corrompu.', type: 'error' });
      }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const processImport = async () => {
    if (!mapping.name || !mapping.sku) {
      addNotification({ title: 'Mapping requis', message: 'Nom et SKU sont obligatoires.', type: 'warning' });
      return;
    }

    setIsSaving(true);
    try {
      const finalParts: Part[] = [];
      const movements: any[] = [];

      rawImportData.forEach((row: any, i: number) => {
        const sku = String(row[mapping.sku] || `REF-${Date.now()}-${i}`);
        const existing = parts.find((p: Part) => p.sku === sku || p.name === row[mapping.name]);
        const addedQty = Number(row[mapping.currentStock] || 0);

        let partToSave: Part;
        if (existing) {
          partToSave = { ...existing, currentStock: existing.currentStock + addedQty };
        } else {
          partToSave = {
            id: `PT-IMP-${Date.now()}-${i}`,
            name: String(row[mapping.name] || 'Article sans nom'),
            sku: sku,
            currentStock: addedQty,
            minStock: Number(row[mapping.minStock] || 5),
            unitPrice: Number(row[mapping.unitPrice] || 0),
            purchasePrice: Number(row[mapping.unitPrice] || 0) * 0.7, // Estimate if mapped purchase price not exist
            condition: 'Neuf',
            location: String(row[mapping.location] || 'Magasin'),
            brand: String(row[mapping.brand] || 'Royal Plaza'),
            category: (row[mapping.category] || 'Consommable') as any
          }
        }
        finalParts.push(partToSave);

        if (addedQty > 0) {
          movements.push({
            id: `SM-IMP-${Date.now()}-${i}`,
            partId: partToSave.id,
            partName: partToSave.name,
            type: 'IN',
            quantity: addedQty,
            date: new Date().toISOString(),
            reason: existing ? 'Réapprov. Excel' : 'Import Excel Initial',
            performedBy: currentUser?.name || 'Système'
          });
        }
      });

      if (finalParts.length > 0) await ApiService.parts.saveAll(finalParts);
      if (movements.length > 0) await ApiService.stockMovements.saveAll(movements);

      addNotification({ title: 'Batch Import', message: `${finalParts.length} articles synchronisés.`, type: 'success' });
      setIsMappingModalOpen(false);
      refreshAll();
    } catch (err) {
      addNotification({ title: 'Erreur Import', message: 'Échec de l\'opération massive.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-5 animate-sb-entry pb-20">
      {isLoading ? (
        <SkeletonHeader />
      ) : (
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#3ecf8e]/10 rounded-xl flex items-center justify-center text-[#3ecf8e]">
              <Package size={18} />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
                Stock Pièces Détachées
              </h1>
              <p className="text-xs text-[#686868] font-semibold uppercase tracking-wider mt-0.5">Inventaire centralisé des composants et consommables.</p>
            </div>
          </div>
          <div className="flex gap-2">
            {/* Badge Alertes */}
            {alertBadge > 0 && (
              <button onClick={() => setStockStatus('critical')} className="h-8 px-3 bg-red-50 border border-red-200 text-red-600 rounded-lg flex items-center gap-2 animate-pulse">
                <AlertTriangle size={16} /> <span className="text-xs font-semibold">{alertBadge}</span>
              </button>
            )}
            <button onClick={refreshAll} className="btn-sb-outline h-8 px-3">
              <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
            </button>
            <button onClick={() => setIsInventoryMode(!isInventoryMode)} className={`btn-sb-outline h-8 px-3 hidden md:flex items-center gap-2 ${isInventoryMode ? 'bg-[#3ecf8e] text-white border-[#3ecf8e]' : ''}`}>
              <ClipboardList size={16} /> <span>Inventaire</span>
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="btn-sb-outline h-8 px-3 hidden md:flex items-center gap-2">
              <Upload size={16} /> <span>Import XLS</span>
            </button>
            <input type="file" ref={fileInputRef} accept=".xlsx,.xls" hidden onChange={handleFileSelect} />
            {currentUser?.role !== 'MANAGER' && (
              <button onClick={() => { setEditingPart(null); setIsModalOpen(true); }} className="btn-sb-primary h-8 px-3 hidden md:flex">
                <Plus size={16} /> <span>Nouvelle Réf.</span>
              </button>
            )}
          </div>
        </header>
      )}

      {/* Module Tips */}
      <ModuleTips
        moduleName="Pièces Détachées"
        storageKey="parts_inventory"
        tips={[
          {
            id: 'parts-1',
            title: 'Alertes de stock',
            content: 'Les pièces en rupture (stock 0) et en seuil critique (stock ≤ minimum) sont signalées par des badges colorés. Cliquez sur le badge d\'alerte rouge pour filtrer automatiquement.',
            target: 'Badge Alertes'
          },
          {
            id: 'parts-2',
            title: 'Mode Inventaire',
            content: 'Activez le mode Inventaire pour faire un comptage physique. Ce mode permet de scanner les codes-barres et de saisir les quantités réelles rapidement.',
            target: 'Bouton Inventaire'
          },
          {
            id: 'parts-3',
            title: 'Historique des mouvements',
            content: 'Consultez l\'onglet Historique Flux pour voir toutes les entrées et sorties de stock. Cela permet de tracer les consommations et les réapprovisionnements.',
            target: 'Onglet Historique'
          },
          {
            id: 'parts-4',
            title: 'Gestion des fournisseurs',
            content: 'Chaque pièce peut avoir plusieurs fournisseurs. Enregistrez les prix d\'achat et les délais de livraison pour optimiser vos réapprovisionnements.',
            target: 'Fournisseurs'
          }
        ]}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <SmallCard
          title="Total Pièces"
          value={parts?.length || 0}
          icon={<Package size={14} />}
          color="#1c1c1c"
          tip="Nombre total de références dans l'inventaire"
        />
        <SmallCard
          title="En Stock OK"
          value={parts?.filter((p: Part) => p.currentStock > p.minStock).length || 0}
          icon={<CheckCircle2 size={14} />}
          color="#22c55e"
          tip="Pièces avec stock suffisant"
        />
        <SmallCard
          title="Seuil Critique"
          value={parts?.filter((p: Part) => p.currentStock <= p.minStock && p.currentStock > 0).length || 0}
          icon={<AlertCircle size={14} />}
          color="#f59e0b"
          tip="Pièces à réapprovisionner rapidement"
        />
        <SmallCard
          title="Rupture"
          value={parts?.filter((p: Part) => p.currentStock === 0).length || 0}
          icon={<AlertTriangle size={14} />}
          color="#ef4444"
          tip="Pièces en rupture totale de stock"
        />
        <SmallCard
          title="Valeur Stock"
          value={`${(parts?.reduce((sum: number, p: Part) => sum + (p.currentStock * (p.unitPrice || 0)), 0) / 1000000).toFixed(1)}M`}
          icon={<BarChart3 size={14} />}
          color="#3b82f6"
          tip="Valeur totale du stock (prix de vente)"
        />
        <SmallCard
          title="Mouv. Aujourd'hui"
          value={stockMovements?.filter((m: any) => new Date(m.date).toDateString() === new Date().toDateString()).length || 0}
          icon={<Activity size={14} />}
          color="#8b5cf6"
          tip="Mouvements de stock enregistrés aujourd'hui"
        />
      </div>

      {/* Sub-menu tabs */}
      <div className="flex gap-1 bg-[#f8f9fa] p-1 rounded-lg border border-[#e5e5e5] w-fit">
        {[
          { id: 'liste' as const, label: 'Inventaire', icon: <Package size={14} /> },
          { id: 'stats' as const, label: 'Stats', icon: <BarChart2 size={14} /> },
          { id: 'historique' as const, label: 'Flux', icon: <History size={14} /> },
          { id: 'inventaire' as const, label: 'Comptage', icon: <ClipboardList size={14} /> },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] font-semibold uppercase tracking-wide transition-all ${activeTab === tab.id
              ? 'bg-white text-[#1c1c1c] shadow-sm border border-[#e5e5e5]'
              : 'text-[#686868] hover:text-[#1c1c1c]'
              }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ======= TAB: LISTE DES PIÈCES ======= */}
      {activeTab === 'liste' && (
        <div className="space-y-4 animate-sb-entry">
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af] group-focus-within:text-[#3ecf8e] transition-colors" size={16} />
              <input
                type="text"
                placeholder="Rechercher par désignation, SKU, marque..."
                className="w-full pl-10 pr-4 h-10 rounded-lg border border-[#e5e5e5] text-sm focus:border-[#3ecf8e] focus:ring-2 focus:ring-[#3ecf8e]/20 transition-all"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              {[
                { id: 'all', label: 'Tous', icon: <Layers size={12} /> },
                { id: 'critical', label: 'Alertes', icon: <AlertTriangle size={12} />, color: '#f59e0b' },
                { id: 'out', label: 'Ruptures', icon: <Zap size={12} />, color: '#ef4444' }
              ].map(st => (
                <button
                  key={st.id}
                  onClick={() => setStockStatus(st.id as any)}
                  className={`h-8 px-3 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${stockStatus === st.id
                    ? st.id === 'critical' ? 'bg-amber-50 text-amber-600 border border-amber-200' :
                      st.id === 'out' ? 'bg-red-50 text-red-600 border border-red-200' :
                        'bg-[#3ecf8e] text-white'
                    : 'bg-white border border-[#e5e5e5] text-[#686868] hover:border-[#d1d1d1]'
                    }`}
                >
                  {st.icon} {st.label}
                  {st.id !== 'all' && (
                    <span className="ml-0.5 text-[11px] font-semibold">
                      {st.id === 'critical'
                        ? parts?.filter((p: Part) => p.currentStock <= p.minStock && p.currentStock > 0).length || 0
                        : parts?.filter((p: Part) => p.currentStock === 0).length || 0}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-lg border border-[#e5e5e5] shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-[#f8f9fa] border-b border-[#e5e5e5]">
                <tr>
                  <th className="w-20 px-2 py-2 text-[11px] font-semibold text-[#686868] uppercase tracking-wide">SKU</th>
                  <th className="px-2 py-2 text-[11px] font-semibold text-[#686868] uppercase tracking-wide">Désignation</th>
                  <th className="px-2 py-2 text-[11px] font-semibold text-[#686868] uppercase tracking-wide">Emplacement</th>
                  <th className="px-2 py-2 text-center text-[11px] font-semibold text-[#686868] uppercase tracking-wide">Stock</th>
                  <th className="px-2 py-2 text-right text-[11px] font-semibold text-[#686868] uppercase tracking-wide">Prix</th>
                  <th className="px-2 py-2 text-right text-[11px] font-semibold text-[#686868] uppercase tracking-wide">Marge</th>
                  <th className="px-2 py-2 text-right text-[11px] font-semibold text-[#686868] uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f0f0]">
                {filteredParts.map((p: Part) => (
                  <tr
                    key={p.id}
                    onClick={() => setSelectedPart(p)}
                    className="cursor-pointer group transition-all duration-200 hover:bg-[#f8f9fa]"
                  >
                    <td className="px-2 py-2">
                      <span className="font-mono text-[11px] font-semibold text-[#686868]">{p.sku}</span>
                    </td>
                    <td className="px-2 py-2">
                      <p className="text-[13px] font-semibold text-[#1c1c1c] group-hover:text-[#3ecf8e] transition-colors">{p.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[9px] font-semibold text-[#3ecf8e] uppercase bg-[#f0fdf4] px-1 rounded">{p.brand}</span>
                        <span className="text-[9px] text-[#9ca3af]">• {p.category}</span>
                      </div>
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-1 text-[#686868]">
                        <MapPin size={10} className="text-[#9ca3af]" />
                        <span className="text-[11px]">{p.location}</span>
                      </div>
                    </td>
                    <td className="px-2 py-2" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleQuickAdjust(p, -1, 'Ajustement rapide')}
                          className="w-5 h-5 rounded bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 text-xs"
                          title="-1"
                        >-</button>
                        <span className={`text-[12px] font-semibold min-w-[28px] text-center ${p.currentStock <= p.minStock ? 'text-red-500' : 'text-[#1c1c1c]'}`}>
                          {p.currentStock}
                        </span>
                        <button
                          onClick={() => handleQuickAdjust(p, 1, 'Ajustement rapide')}
                          className="w-5 h-5 rounded bg-green-50 text-green-600 flex items-center justify-center hover:bg-green-100 text-xs"
                          title="+1"
                        >+</button>
                      </div>
                      {(p.reservedQuantity || 0) > 0 && (
                        <span className="text-[9px] text-amber-500 block text-center">{p.reservedQuantity} réservé</span>
                      )}
                    </td>
                    <td className="px-2 py-2 text-right">
                      <p className="text-[12px] font-semibold text-[#1c1c1c]">{p.unitPrice.toLocaleString()} F</p>
                      <p className="text-[9px] text-[#9ca3af]">A: {(p.purchasePrice || 0).toLocaleString()} F</p>
                    </td>
                    <td className="px-2 py-2 text-right">
                      <span className="text-[12px] font-semibold text-[#3ecf8e]">+{((p.unitPrice || 0) - (p.purchasePrice || 0)).toLocaleString()} F</span>
                    </td>
                    <td className="px-2 py-2 text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => { e.stopPropagation(); setBarcodePart(p); }}
                          className="p-1.5 text-[#686868] hover:text-blue-500 border border-[#e5e5e5] rounded bg-white hover:border-blue-200 transition-all"
                          title="Étiquette"
                        >
                          <Printer size={12} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditingPart(p); setIsKitModalOpen(true); }}
                          className="p-1.5 text-[#686868] hover:text-purple-500 border border-[#e5e5e5] rounded bg-white hover:border-purple-200 transition-all"
                          title="Kit"
                        >
                          <Boxes size={12} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditingPart(p); setIsModalOpen(true); }}
                          className="p-1.5 text-[#686868] hover:text-[#3ecf8e] border border-[#e5e5e5] rounded bg-white hover:border-[#3ecf8e]/30 transition-all"
                        >
                          <Edit3 size={12} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeletePart(p.id); }}
                          className="p-1.5 text-[#686868] hover:text-red-500 border border-[#e5e5e5] rounded bg-white hover:border-red-200 transition-all"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredParts.length === 0 && (
              <div className="text-center py-8">
                <div className="w-10 h-10 bg-[#f5f5f5] rounded-full flex items-center justify-center mx-auto mb-3">
                  <Package size={16} className="text-[#9ca3af]" />
                </div>
                <p className="text-sm font-semibold text-[#686868]">Aucune pièce trouvée</p>
                <p className="text-xs text-[#9ca3af] mt-0.5">Modifiez vos critères de recherche</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======= TAB: STATISTIQUES ======= */}
      {activeTab === 'stats' && (
        <div className="space-y-8 animate-sb-entry">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { label: 'Références Total', value: stats.totalParts, icon: <Boxes size={16} />, color: 'text-blue-500' },
              { label: 'Alerte Réappro', value: stats.critical, icon: <AlertTriangle size={16} />, color: 'text-amber-500' },
              { label: 'Rupture Sèche', value: stats.outOfStock, icon: <Zap size={16} />, color: 'text-red-500' },
              { label: 'Valeur Inventaire', value: `${(stats.totalValuation / 1000).toFixed(0)}k F`, icon: <BarChart3 size={16} />, color: 'text-[#3ecf8e]' }
            ].map((s, i) => (
              <div key={i} className="sb-card flex items-center gap-3 p-4 border-[#e5e5e5] shadow-sm bg-white hover:border-[#3ecf8e] transition-colors">
                <div className={`p-2.5 bg-[#f8f9fa] rounded-lg border border-[#f5f5f5] ${s.color}`}>{s.icon}</div>
                <div>
                  <p className="text-[9px] font-semibold text-[#686868] uppercase tracking-wide">{s.label}</p>
                  <p className="text-lg font-semibold text-[#1c1c1c]">{s.value}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="sb-card p-3 bg-white border-[#e5e5e5] shadow-sm flex flex-col gap-4">
              <div>
                <h4 className="text-[12px] font-semibold text-[#686868] uppercase tracking-widest mb-1">Valeur par Catégorie</h4>
                <p className="text-xs text-[#999]">Répartition financière du stock technique.</p>
              </div>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.categoryChartData}
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {stats.categoryChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS_CHART[index % COLORS_CHART.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="sb-card p-3 bg-white border-[#e5e5e5] shadow-sm md:col-span-2">
              <div>
                <h4 className="text-[12px] font-semibold text-[#686868] uppercase tracking-widest mb-1">Investissement par Marque (Top 5)</h4>
                <p className="text-xs text-[#999]">Valeur monétaire immobilisée par fabricant.</p>
              </div>
              <div className="h-[300px] w-full mt-6">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={
                    (Object.entries(
                      (parts || []).reduce((acc: Record<string, number>, p: Part) => {
                        acc[p.brand] = (acc[p.brand] || 0) + (p.currentStock * p.unitPrice);
                        return acc;
                      }, {} as Record<string, number>)
                    ) as [string, number][]).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, value]) => ({ name, value }))
                  }>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                    <YAxis hide />
                    <Tooltip
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      formatter={(value: number) => [`${value.toLocaleString()} F`, 'Valeur']}
                    />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {stats.categoryChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill="#3ecf8e" fillOpacity={0.8} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="sb-card p-3 bg-white border-[#e5e5e5] shadow-sm">
              <h4 className="text-[12px] font-semibold text-[#686868] uppercase tracking-widest mb-6">Mouvements Récents</h4>
              <div className="space-y-4">
                {(stats.recentMovements || []).length > 0 ? stats.recentMovements.map((m: any) => (
                  <div key={m.id} className="flex items-center justify-between p-3 bg-[#f8f9fa] rounded-lg border border-[#e5e5e5]">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${m.type === 'IN' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                        {m.type === 'IN' ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}
                      </div>
                      <div>
                        <p className="text-[13px] font-semibold text-[#1c1c1c]">{m.partName}</p>
                        <p className="text-[11px] text-[#686868] font-semibold">{new Date(m.date).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-semibold ${m.type === 'IN' ? 'text-green-600' : 'text-red-600'}`}>
                        {m.type === 'IN' ? '+' : '-'}{m.quantity}
                      </p>
                      <p className="text-[9px] font-semibold text-[#999] uppercase">{m.performedBy}</p>
                    </div>
                  </div>
                )) : (
                  <p className="text-center py-10 text-xs text-[#999] font-semibold italic">Aucun mouvement récent enregistré.</p>
                )}
              </div>
            </div>

            <div className="sb-card p-3 bg-[#1c1c1c] text-white shadow-xl shadow-black/20 relative overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#3ecf8e]/10 rounded-full blur-3xl -mr-32 -mt-32" />
              <div>
                <h4 className="text-[11px] font-semibold text-[#3ecf8e] uppercase tracking-[0.2em] mb-4 relative z-10">Résumé Technique</h4>
                <div className="space-y-4 relative z-10">
                  <p className="text-lg font-semibold leading-tight">
                    Le stock technique est actuellement valorisé à <span className="text-[#3ecf8e]">{stats.totalValuation.toLocaleString()} F CFA</span>.
                  </p>
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                    <div>
                      <p className="text-[9px] text-white/50 uppercase font-semibold">Santé Stock</p>
                      <p className="text-base font-semibold">{stats.totalParts > 0 ? Math.round(((stats.totalParts - stats.critical) / stats.totalParts) * 100) : 0}%</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-white/50 uppercase font-semibold">Alerte SLA</p>
                      <p className="text-base font-semibold text-amber-400">{stats.critical} <span className="text-[11px]">réf.</span></p>
                    </div>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('liste')}
                className="mt-8 flex items-center justify-center gap-2 w-full py-4 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl transition-all font-semibold text-[12px] uppercase tracking-widest"
              >
                <Filter size={14} /> Voir les alertes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======= TAB: HISTORIQUE ======= */}
      {activeTab === 'historique' && (
        <div className="space-y-4 animate-sb-entry">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex bg-white p-1 rounded-lg border border-[#e5e5e5] shadow-sm">
              {[
                { id: 'ALL', label: 'Tous Flux' },
                { id: 'IN', label: 'Entrées' },
                { id: 'OUT', label: 'Sorties' },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setHistoryFilter(f.id as any)}
                  className={`px-6 py-2 text-[11px] font-semibold uppercase rounded-lg transition-all ${historyFilter === f.id ? 'bg-[#1c1c1c] text-white' : 'text-[#686868] hover:bg-[#f8f9fa]'}`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const data = stockMovements.map((m: any) => ({
                    Date: new Date(m.date).toLocaleString(),
                    Article: m.partName,
                    Type: m.type,
                    Quantité: m.quantity,
                    Auteur: m.performedBy,
                    Motif: m.reason
                  }));
                  const ws = XLSX.utils.json_to_sheet(data);
                  const wb = XLSX.utils.book_new();
                  XLSX.utils.book_append_sheet(wb, ws, "Historique Flux");
                  XLSX.writeFile(wb, `Plaza_Stock_History_${new Date().toISOString().split('T')[0]}.xlsx`);
                }}
                className="btn-sb-outline h-9 px-6 rounded-lg text-[11px] font-semibold uppercase tracking-widest"
              >
                <Download size={14} /> Exporter Excel
              </button>
            </div>
          </div>

          <div className="sb-table-container shadow-sm border-[#e5e5e5]">
            <table className="w-full text-left sb-table">
              <thead>
                <tr>
                  <th className="px-4">Date & Heure</th>
                  <th>Article</th>
                  <th>Type</th>
                  <th className="text-center">Quantité</th>
                  <th>Auteur</th>
                  <th>Motif</th>
                </tr>
              </thead>
              <tbody>
                {(stockMovements || [])
                  .filter((m: any) => historyFilter === 'ALL' || m.type === historyFilter)
                  .map((m: any) => (
                    <tr key={m.id}>
                      <td className="px-4">
                        <p className="text-[13px] font-semibold text-[#1c1c1c]">{new Date(m.date).toLocaleDateString()}</p>
                        <p className="text-[11px] font-semibold text-[#999]">{new Date(m.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </td>
                      <td>
                        <p className="text-[12px] font-semibold text-[#1c1c1c]">{m.partName}</p>
                      </td>
                      <td>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-tighter border ${m.type === 'IN'
                          ? 'bg-green-50 text-green-600 border-green-100'
                          : 'bg-red-50 text-red-600 border-red-100'
                          }`}>
                          {m.type === 'IN' ? <ArrowDownLeft size={10} /> : <ArrowUpRight size={10} />}
                          {m.type === 'IN' ? 'Entrée' : 'Sortie'}
                        </span>
                      </td>
                      <td className="text-center">
                        <span className={`text-[15px] font-semibold ${m.type === 'IN' ? 'text-green-600' : 'text-red-600'}`}>
                          {m.type === 'IN' ? '+' : '-'}{m.quantity}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-[#f0f0f0] border border-[#e5e5e5] flex items-center justify-center text-[11px] font-semibold">{m.performedBy?.[0] || 'U'}</div>
                          <span className="text-[12px] font-semibold text-[#686868]">{m.performedBy}</span>
                        </div>
                      </td>
                      <td className="max-w-xs truncate text-[12px] text-[#686868] font-semibold">{m.reason}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======= MODALS & DRAWERS ======= */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingPart ? "Correction Fiche Article" : "Intégration Catalogue Rechanges"}>
        <form onSubmit={handleSavePart} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[9px] font-semibold text-[#686868] uppercase tracking-wide">Désignation Technique</label>
              <input name="name" type="text" defaultValue={editingPart?.name} placeholder="ex: Compresseur Inverter 12k" required className="w-full h-11 px-4 rounded-lg border-[#e5e5e5]" />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-semibold text-[#686868] uppercase tracking-wide">Code SKU Cluster</label>
              <input name="sku" type="text" defaultValue={editingPart?.sku} placeholder="ex: PART-LG-INV-01" required className="w-full h-11 px-4 rounded-lg border-[#e5e5e5]" />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-semibold text-[#686868] uppercase tracking-wide">Marque Certifiée</label>
              <select name="brand" defaultValue={editingPart?.brand || 'LG'} className="w-full h-11 px-4 rounded-lg border-[#e5e5e5]">
                {(brands || []).map((b: string) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-semibold text-[#686868] uppercase tracking-wide">Filière Technique</label>
              <select name="category" defaultValue={editingPart?.category || 'Mécanique'} className="w-full h-11 px-4 rounded-lg border-[#e5e5e5]">
                <option value="Électronique">Électronique</option>
                <option value="Mécanique">Mécanique</option>
                <option value="Consommable">Consommable</option>
                <option value="Accessoire">Accessoire</option>
              </select>
            </div>
            <div className="space-y-2 group">
              <label className="text-[9px] font-semibold text-[#686868] uppercase tracking-wide flex justify-between">
                <span>Stock Actuel</span>
                <span className="text-[#3ecf8e] normal-case bg-[#f0fdf4] px-1 rounded">Maj par import</span>
              </label>
              <input name="currentStock" type="number" defaultValue={editingPart?.currentStock || 0} readOnly required className="w-full h-11 px-4 rounded-lg border-[#e5e5e5] bg-[#f8f9fa] cursor-not-allowed text-[#686868] font-semibold" />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-semibold text-[#686868] uppercase tracking-wide">Seuil d'Alerte SLA</label>
              <input name="minStock" type="number" defaultValue={editingPart?.minStock || 5} required className="w-full h-11 px-4 rounded-lg border-[#e5e5e5]" />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-semibold text-[#686868] uppercase tracking-wide">État du Produit</label>
              <select name="condition" defaultValue={editingPart?.condition || 'Neuf'} className="w-full h-11 px-4 rounded-lg border-[#e5e5e5]">
                <option value="Neuf">Neuf</option>
                <option value="Occasion">Occasion</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-semibold text-[#686868] uppercase tracking-wide">Prix d'Achat (F CFA)</label>
              <input name="purchasePrice" type="number" defaultValue={editingPart?.purchasePrice || 0} required className="w-full h-11 px-4 rounded-lg border-[#e5e5e5]" />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-semibold text-[#686868] uppercase tracking-wide">Prix de Cession (F CFA)</label>
              <input name="unitPrice" type="number" defaultValue={editingPart?.unitPrice || 0} required className="w-full h-11 px-4 rounded-lg border-[#e5e5e5]" />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-semibold text-[#686868] uppercase tracking-wide">Emplacement Logistique</label>
              <input name="location" type="text" defaultValue={editingPart?.location} placeholder="ex: Zone A1 - BDM" required className="w-full h-11 px-4 rounded-lg border-[#e5e5e5]" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-8 border-t border-[#f5f5f5]">
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn-sb-outline h-10 px-8 text-[12px] font-semibold uppercase rounded-lg">Annuler</button>
            <button type="submit" disabled={isSaving} className="btn-sb-primary h-10 px-12 text-[12px] font-semibold uppercase rounded-lg shadow-lg shadow-[#3ecf8e]/20">
              {isSaving ? <RefreshCw className="animate-spin" size={16} /> : 'Enregistrer Article'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isMappingModalOpen} onClose={() => setIsMappingModalOpen(false)} title="Intelligence d'Importation" size="lg">
        <div className="space-y-8">
          <div className="flex items-start gap-5 p-3 bg-[#f0f9f4] border border-[#dcfce7] rounded-xl shadow-sm">
            <CheckCircle2 className="text-[#3ecf8e] mt-1 shrink-0" size={14} />
            <div>
              <p className="text-sm font-semibold text-[#1c1c1c] uppercase tracking-tight">Fichier Structurel Analysé</p>
              <p className="text-xs text-[#686868] font-semibold mt-1">Veuillez mapper les champs Excel vers le kernel Plaza.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
            {[
              { key: 'name', label: 'Désignation', req: true },
              { key: 'sku', label: 'Identifiant SKU', req: true },
              { key: 'currentStock', label: 'Quantité Live', req: false },
              { key: 'unitPrice', label: 'P.U. Cession', req: false },
              { key: 'location', label: 'Emplacement', req: false },
              { key: 'brand', label: 'Marque', req: false },
              { key: 'category', label: 'Catégorie', req: false },
              { key: 'minStock', label: 'Seuil Alerte', req: false },
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
            <button onClick={() => setIsMappingModalOpen(false)} className="btn-sb-outline h-10 px-8 rounded-lg text-[12px] font-semibold uppercase tracking-widest">Abandonner</button>
            <button
              onClick={processImport}
              disabled={isSaving || !mapping.name || !mapping.sku}
              className="btn-sb-primary h-10 px-12 rounded-lg shadow-lg shadow-[#3ecf8e]/20 text-[12px] font-semibold uppercase tracking-widest"
            >
              {isSaving ? <RefreshCw className="animate-spin" size={16} /> : <>Synchroniser {rawImportData.length} articles <ArrowRight size={16} className="ml-2" /></>}
            </button>
          </div>
        </div>
      </Modal>

      {/* ======= TAB: INVENTAIRE PHYSIQUE ======= */}
      {activeTab === 'inventaire' && (
        <div className="space-y-4 animate-sb-entry">
          <div className="p-4 bg-[#3ecf8e]/10 border border-[#3ecf8e]/20 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ClipboardList className="text-[#3ecf8e]" size={18} />
              <div>
                <p className="text-sm font-semibold text-[#1c1c1c]">Mode Comptage Physique</p>
                <p className="text-xs text-[#686868]">Progression: {inventoryProgress}% ({Object.keys(inventoryCounts).length} / {(parts || []).length} articles)</p>
              </div>
            </div>
            <div className="w-48 h-2 bg-white rounded-full overflow-hidden">
              <div className="h-full bg-[#3ecf8e] transition-all" style={{ width: `${inventoryProgress}%` }} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(parts || []).map((p: Part) => (
              <div key={p.id} className="p-4 bg-white border border-[#e5e5e5] rounded-lg">
                <p className="text-sm font-semibold text-[#1c1c1c]">{p.name}</p>
                <p className="text-xs text-[#686868] font-mono">{p.sku}</p>
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-xs text-[#686868]">Stock théorique: {p.currentStock}</span>
                  <input
                    type="number"
                    placeholder="Compté"
                    className="w-20 h-9 text-center border rounded"
                    value={inventoryCounts[p.id] || ''}
                    onChange={e => handleInventoryCount(p.id, Number(e.target.value))}
                  />
                  {inventoryCounts[p.id] !== undefined && (
                    <span className={`text-xs font-semibold ${inventoryCounts[p.id] === p.currentStock ? 'text-green-500' : 'text-red-500'}`}>
                      {inventoryCounts[p.id] === p.currentStock ? '✓' : `Écart: ${inventoryCounts[p.id] - p.currentStock}`}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end">
            <button onClick={submitInventoryCounts} className="btn-sb-primary">
              <CheckCircle2 size={16} /> Finaliser l'inventaire
            </button>
          </div>
        </div>
      )}

      {/* ======= DRAWER: DÉTAILS PIÈCE ======= */}
      <Drawer isOpen={!!selectedPart} onClose={() => setSelectedPart(null)} title="Contrôle d'Inventaire" icon={<Package size={14} />}>
        {selectedPart && (
          <div className="space-y-8 animate-sb-entry pb-10">
            <div className="p-10 bg-[#f8f9fa] border border-[#e5e5e5] rounded-3xl flex flex-col items-center text-center shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#3ecf8e]/5 rounded-full blur-3xl -mr-16 -mt-16" />
              {selectedPart.imageUrl ? (
                <img src={selectedPart.imageUrl} alt={selectedPart.name} className="w-20 h-20 object-cover rounded-3xl shadow-xl mb-6" />
              ) : (
                <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center text-[#3ecf8e] shadow-xl mb-6 border border-[#e5e5e5] relative z-10">
                  <Package size={48} />
                </div>
              )}
              <h3 className="text-2xl font-semibold text-[#1c1c1c] tracking-tight relative z-10">{selectedPart.name}</h3>
              <p className="text-[12px] text-[#686868] font-semibold uppercase tracking-[0.3em] mt-2 relative z-10">SKU: {selectedPart.sku}</p>
              <div className="mt-6 flex gap-3 relative z-10">
                <span className="px-4 py-1.5 bg-white border border-[#e5e5e5] text-[11px] font-semibold uppercase rounded-lg shadow-sm text-[#1c1c1c]">{selectedPart.brand}</span>
                <span className="px-4 py-1.5 bg-white border border-[#e5e5e5] text-[11px] font-semibold uppercase rounded-lg shadow-sm text-[#1c1c1c]">{selectedPart.category}</span>
                {selectedPart.isKit && <span className="px-4 py-1.5 bg-purple-50 border border-purple-200 text-purple-600 text-[11px] font-semibold uppercase rounded-lg">KIT</span>}
              </div>
            </div>

            {/* --- Prévisions Réappro --- */}
            {(() => {
              const { avgMonthly, suggestQty } = getReorderSuggestion(selectedPart);
              if (suggestQty <= 0) return null;
              return (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp size={14} className="text-amber-600" />
                    <span className="text-xs font-semibold text-amber-700 uppercase">Suggestion Réapprovisionnement</span>
                  </div>
                  <p className="text-sm text-amber-800">
                    Conso moyenne: <strong>{avgMonthly}</strong>/mois • Suggéré: <strong>{suggestQty} unités</strong>
                  </p>
                </div>
              );
            })()}

            {/* --- Fournisseurs --- */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-[12px] font-semibold text-[#686868] uppercase tracking-widest">Fournisseurs</h4>
                <button onClick={() => setIsSupplierModalOpen(true)} className="text-[11px] text-[#3ecf8e] font-semibold">+ Ajouter</button>
              </div>
              {(partSuppliers[selectedPart.id] || []).length === 0 ? (
                <p className="text-xs text-[#9ca3af] italic">Aucun fournisseur enregistré</p>
              ) : (
                <div className="space-y-2">
                  {(partSuppliers[selectedPart.id] || []).map((s: PartSupplier) => (
                    <div key={s.id} className={`p-3 rounded-lg border ${s.isPreferred ? 'bg-green-50 border-green-200' : 'bg-white border-[#e5e5e5]'}`}>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold">{s.supplierName}</span>
                        {s.isPreferred && <Star size={12} className="text-green-500 fill-green-500" />}
                      </div>
                      <p className="text-xs text-[#686868]">{s.purchasePrice.toLocaleString()} F • {s.leadTimeDays}j</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* --- Compatibilité Produits --- */}
            <div className="space-y-3">
              <h4 className="text-[12px] font-semibold text-[#686868] uppercase tracking-widest">Compatibilité Produits</h4>
              {(compatMap[selectedPart.id] || []).length === 0 ? (
                <p className="text-xs text-[#9ca3af] italic">Non associé à des produits</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {(compatMap[selectedPart.id] || []).map((c, idx) => (
                    <span key={idx} className="px-3 py-1 bg-blue-50 text-blue-700 text-xs rounded-full">
                      {c.productName}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* --- Réservations --- */}
            {selectedPart.reservedQuantity ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <ShoppingCart size={14} className="text-amber-600" />
                  <span className="text-xs font-semibold text-amber-700">{selectedPart.reservedQuantity} unités réservées</span>
                </div>
              </div>
            ) : null}

            {/* --- Kit Components --- */}
            {selectedPart.isKit && selectedPart.kitComponents && (
              <div className="space-y-3">
                <h4 className="text-[12px] font-semibold text-purple-600 uppercase tracking-widest">Composants du Kit</h4>
                <div className="space-y-2">
                  {selectedPart.kitComponents.map((c, idx) => (
                    <div key={idx} className="p-3 bg-purple-50 border border-purple-100 rounded-lg flex justify-between">
                      <span className="text-sm">{c.partName}</span>
                      <span className="text-sm font-semibold">× {c.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-4">
              <button onClick={() => setBarcodePart(selectedPart)} className="btn-sb-outline h-10 justify-center">
                <Printer size={14} /> Étiquette
              </button>
              <button onClick={() => setIsReservationModalOpen(true)} className="btn-sb-outline h-10 justify-center">
                <ShoppingCart size={14} /> Réserver
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4">
              <button onClick={() => { setEditingPart(selectedPart); setIsModalOpen(true); }} className="btn-sb-outline h-10 justify-center font-semibold uppercase text-[12px] tracking-widest rounded-xl">
                <Edit3 size={14} /><span>Ajuster Fiche</span>
              </button>
              <button onClick={() => handleDeletePart(selectedPart.id)} className="btn-sb-outline h-10 justify-center font-semibold uppercase text-[12px] tracking-widest text-red-500 hover:bg-red-50 border-red-100 rounded-xl">
                <Trash2 size={14} /><span>Supprimer</span>
              </button>
            </div>
          </div>
        )}
      </Drawer>

      {/* ======= MODAL: ÉTIQUETTE / CODE-BARRE ======= */}
      <Modal isOpen={!!barcodePart} onClose={() => setBarcodePart(null)} title="Étiquette Article" size="sm">
        {barcodePart && (
          <div className="space-y-4 text-center">
            <div className="w-64 h-32 mx-auto bg-white border-2 border-[#1c1c1c] p-4 flex flex-col items-center justify-center">
              <div dangerouslySetInnerHTML={{ __html: generateBarcodeSVG(barcodePart.sku) }} />
            </div>
            <div>
              <p className="text-lg font-semibold text-[#1c1c1c]">{barcodePart.name}</p>
              <p className="text-sm text-[#686868] font-mono">{barcodePart.sku}</p>
              <p className="text-xs text-[#9ca3af]">{barcodePart.location}</p>
            </div>
            <button onClick={() => window.print()} className="btn-sb-primary w-full">
              <Printer size={16} /> Imprimer
            </button>
          </div>
        )}
      </Modal>

      {/* ======= MODAL: KIT BUILDER ======= */}
      <Modal isOpen={isKitModalOpen} onClose={() => setIsKitModalOpen(false)} title="Composer un Kit" size="lg">
        <div className="space-y-4">
          <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <p className="text-sm font-semibold text-purple-800">Sélectionnez les composants du kit</p>
          </div>
          <div className="grid grid-cols-2 gap-4 max-h-60 overflow-y-auto">
            {(parts || []).filter((p: Part) => p.id !== editingPart?.id && !p.isKit).map((p: Part) => (
              <div key={p.id} className="p-3 border rounded-lg flex justify-between items-center">
                <div>
                  <p className="text-sm font-semibold">{p.name}</p>
                  <p className="text-xs text-[#686868]">{p.sku}</p>
                </div>
                <button onClick={() => handleAddKitComponent(p, 1)} className="px-3 py-1 bg-purple-100 text-purple-700 rounded text-xs font-semibold">+</button>
              </div>
            ))}
          </div>
          {kitComponents.length > 0 && (
            <div className="p-4 bg-purple-50 rounded-lg">
              <p className="text-xs font-semibold text-purple-800 mb-2">Composants sélectionnés:</p>
              <div className="space-y-1">
                {kitComponents.map((c, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span>{c.partName}</span>
                    <span>× {c.quantity}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="flex justify-end gap-3">
            <button onClick={() => setIsKitModalOpen(false)} className="btn-sb-outline">Annuler</button>
            <button onClick={handleSaveKit} className="btn-sb-primary bg-purple-500 hover:bg-purple-600 shadow-purple-500/20">Sauvegarder le Kit</button>
          </div>
        </div>
      </Modal>

      {/* ======= MODAL: FOURNISSEURS ======= */}
      <Modal isOpen={isSupplierModalOpen} onClose={() => setIsSupplierModalOpen(false)} title="Ajouter Fournisseur">
        <div className="space-y-4">
          <input placeholder="Nom fournisseur" value={supplierForm.supplierName} onChange={e => setSupplierForm({ ...supplierForm, supplierName: e.target.value })} className="w-full h-11 rounded-lg border-[#e5e5e5]" />
          <input placeholder="Référence fournisseur (SKU)" value={supplierForm.supplierSku} onChange={e => setSupplierForm({ ...supplierForm, supplierSku: e.target.value })} className="w-full h-11 rounded-lg border-[#e5e5e5]" />
          <div className="grid grid-cols-2 gap-4">
            <input type="number" placeholder="Prix d'achat" value={supplierForm.purchasePrice} onChange={e => setSupplierForm({ ...supplierForm, purchasePrice: Number(e.target.value) })} className="w-full h-11 rounded-lg border-[#e5e5e5]" />
            <input type="number" placeholder="Délai (jours)" value={supplierForm.leadTimeDays} onChange={e => setSupplierForm({ ...supplierForm, leadTimeDays: Number(e.target.value) })} className="w-full h-11 rounded-lg border-[#e5e5e5]" />
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={supplierForm.isPreferred} onChange={e => setSupplierForm({ ...supplierForm, isPreferred: e.target.checked })} />
            <span className="text-sm">Fournisseur préféré</span>
          </label>
          <div className="flex justify-end gap-3 pt-4">
            <button onClick={() => setIsSupplierModalOpen(false)} className="btn-sb-outline">Annuler</button>
            <button onClick={handleAddSupplier} className="btn-sb-primary">Ajouter</button>
          </div>
        </div>
      </Modal>

      {/* ======= MODAL: RÉSERVATION ======= */}
      <Modal isOpen={isReservationModalOpen} onClose={() => setIsReservationModalOpen(false)} title="Réserver du Stock">
        <div className="space-y-4">
          <p className="text-sm text-[#686868]">Réserver pour le ticket:</p>
          <input placeholder="N° Ticket (ex: TK-123)" value={reservationForm.ticketNumber} onChange={e => setReservationForm({ ...reservationForm, ticketNumber: e.target.value, ticketId: e.target.value })} className="w-full h-11 rounded-lg border-[#e5e5e5]" />
          <input type="number" placeholder="Quantité à réserver" value={reservationForm.quantity} onChange={e => setReservationForm({ ...reservationForm, quantity: Number(e.target.value) })} className="w-full h-11 rounded-lg border-[#e5e5e5]" />
          <div className="flex justify-end gap-3 pt-4">
            <button onClick={() => setIsReservationModalOpen(false)} className="btn-sb-outline">Annuler</button>
            <button onClick={handleAddReservation} className="btn-sb-primary bg-amber-500 hover:bg-amber-600 shadow-amber-500/20">Réserver</button>
          </div>
        </div>
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

export default PartsInventory;
