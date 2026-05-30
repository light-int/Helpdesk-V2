
import React, { useState, useMemo, useEffect } from 'react';
import {
  Plus, Search, RefreshCw, Ticket as TicketIcon,
  Filter, MapPin, Edit3, CheckCircle2, Phone,
  User, ShieldCheck, Zap, Info, ArrowRight,
  Clock, FileCheck, Package, ClipboardList, X, Trash2,
  Wrench, AlertTriangle, FileText, Lock, ListChecks, ShieldAlert, BadgeCheck,
  Printer, Wallet, Copy, MessageSquare, Send, Activity, AlertCircle,
  LayoutGrid, Tags, GitMerge, Timer, Tag, GripVertical, Truck
} from 'lucide-react';
import { useData, useNotifications, useUser } from '../App';
import { useSearchParams } from 'react-router-dom';
import { Ticket, TicketCategory, Product, Technician, ShowroomConfig, UsedPart, WarrantyRecord, Prestation, Customer, Part, TicketHistoryEntry, TicketComment, ClientCommunication, TicketAttachment, TicketTag, DocumentTemplate, CashRegisterSession, Vehicle, TransportMission } from '../types';
import { ApiService } from '../services/apiService';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  useDroppable
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const PRESTATION_TYPES: Prestation[] = [
  { id: 'P1', name: 'Livraison & Mise en service', fixedCost: 15000 },
  { id: 'P2', name: 'Installation Standard', fixedCost: 25000 },
  { id: 'P3', name: 'Maintenance Préventive', fixedCost: 35000 },
  { id: 'P4', name: 'Réparation Complexe', fixedCost: 45000 },
  { id: 'P5', name: 'Diagnostic à Domicile', fixedCost: 10000 }
];
import Drawer from '../components/Drawer';
import InterventionModal from '../components/InterventionModal';
import Modal from '../components/Modal';
import { Pause } from 'lucide-react';

// === ALLOWED STATUS TRANSITIONS ===
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  'Nouveau': ['En attente de devis', 'En réparation', 'En attente client', 'Fermé'],
  'En attente de devis': ['Devis envoyé', 'En réparation', 'En attente client', 'Fermé'],
  'Devis envoyé': ['En attente de paiement', 'En attente de devis', 'En réparation', 'En attente client', 'Fermé'],
  'En attente de paiement': ['En attente de devis', 'En réparation', 'En attente client', 'Terminé - Prêt à être payé', 'Payé - Clôturé', 'Fermé'],
  'En attente client': ['Nouveau', 'En attente de devis', 'En réparation'],
  'En réparation': ['Terminé - Prêt à être payé', 'En attente client', 'En attente de devis'],
  'Terminé - Prêt à être payé': ['Payé - Clôturé'],
  'Payé - Clôturé': ['Fermé'],
  'En cours': ['En attente de devis', 'En réparation', 'En attente client', 'Fermé'],
  'Fermé': []
};
const MAX_REOPEN_COUNT = 2;
import { Skeleton, SkeletonRow, SkeletonHeader } from '../components/Skeleton';
import { generatePDFFromElement, generateTicketDossier, generateInvoicePDF, printInvoice } from '../services/pdfService';
import { SmallCard } from '../components/SmallCard';
import { ModuleTips } from '../components/ModuleTips';

const TicketHistory = ({ history }: { history: TicketHistoryEntry[] }) => (
  <div className="space-y-4">
    <h4 className="text-[12px] font-semibold text-[#686868] uppercase tracking-widest border-b border-[#f5f5f5] pb-2">Journal d'Audit</h4>
    <div className="space-y-4">
      {history && history.length > 0 ? history.slice().reverse().map((entry, idx) => (
        <div key={idx} className="flex gap-4 group text-left">
          <div className="flex flex-col items-center">
            <div className="w-2 h-2 rounded-full bg-[#3ecf8e] mt-1 ring-4 ring-[#3ecf8e]/10" />
            <div className="w-px flex-1 bg-[#e5e5e5] my-1" />
          </div>
          <div className="pb-4 last:pb-0">
            <p className="text-[13px] font-semibold text-[#1c1c1c] mb-0.5">{entry.action}</p>
            {entry.details && <p className="text-[12px] text-[#4b5563] leading-relaxed font-semibold">{entry.details}</p>}
            <p className="text-[11px] text-[#9ca3af] mt-1 font-semibold">{entry.user} • {new Date(entry.timestamp).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        </div>
      )) : (
        <div className="py-4 text-center border-2 border-dashed border-[#f5f5f5] rounded-lg">
          <p className="text-[12px] text-[#9ca3af] font-semibold uppercase">Aucune activité</p>
        </div>
      )}
    </div>
  </div>
);

/**
 * Page de gestion des Tickets et du SAV.
 * Permet le suivi des dossiers techniques et l'affectation des techniciens.
 */
const Tickets: React.FC = () => {
  const _u = (() => { try { return useData(); } catch { return { tickets: [], products: [], brands: [], technicians: [], users: [], refreshAll: () => { }, isSyncing: false, saveTicket: () => { }, isLoading: false, showrooms: [], warranties: [], customers: [], parts: [], prestations: [], templates: [], cashRegisterSessions: [] }; } })();
  const {
    tickets = _u.tickets, products = _u.products, brands = _u.brands, technicians: rawTechnicians = _u.technicians, users: allUsers = _u.users, refreshAll = _u.refreshAll, isSyncing = _u.isSyncing, saveTicket = _u.saveTicket, isLoading = _u.isLoading,
    showrooms = _u.showrooms, warranties = _u.warranties, customers = _u.customers, parts = _u.parts, prestations = _u.prestations, templates = _u.templates,
    cashRegisterSessions = _u.cashRegisterSessions
  } = _u;

  // Merge users with role TECHNICIAN into the technicians list for dispatching
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
        status: 'Disponible' as const,
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

  const { currentUser } = (() => { try { return useUser(); } catch { return { currentUser: null }; } })();
  const { addNotification, sendPersistentNotification } = (() => { try { return useNotifications(); } catch { return { addNotification: () => { }, sendPersistentNotification: () => { } }; } })();
  const [searchParams] = useSearchParams();
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isInterventionModalOpen, setIsInterventionModalOpen] = useState(false);
  const [isCotationModalOpen, setIsCotationModalOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [statusFilter, setStatusFilter] = useState('Tous');
  const [categoryFilter, setCategoryFilter] = useState('Tous');
  const [priorityFilter, setPriorityFilter] = useState('Tous');
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState<'actifs' | 'clotures'>('actifs');
  const [slaFilter, setSlaFilter] = useState<'Tous' | 'Normal' | 'Attente' | 'Critique'>('Tous');

  // États pour la détection de garantie dans le formulaire
  const [formSN, setFormSN] = useState('');
  const [formProductName, setFormProductName] = useState('');
  const [formBrand, setFormBrand] = useState('LG');
  const [formPurchaseDate, setFormPurchaseDate] = useState('');
  const [formCustomerName, setFormCustomerName] = useState('');
  const [formCustomerPhone, setFormCustomerPhone] = useState('');

  const [formWarrantyInvoiceNumber, setFormWarrantyInvoiceNumber] = useState('');
  const [detectedProduct, setDetectedProduct] = useState<Product | null>(null);
  const [detectedWarranty, setDetectedWarranty] = useState<WarrantyRecord | null>(null);
  const [manualWarranty, setManualWarranty] = useState(false);
  const [searchInvoice, setSearchInvoice] = useState('');

  // States for Cotation
  const [pendingPrestations, setPendingPrestations] = useState<Prestation[]>([]);
  const [customPrestationName, setCustomPrestationName] = useState('');
  const [customPrestationCost, setCustomPrestationCost] = useState(0);
  const [selectedPrestationId, setSelectedPrestationId] = useState<string>('');
  const [manualDiscount, setManualDiscount] = useState(0);

  // States for Comments
  const [ticketComments, setTicketComments] = useState<TicketComment[]>([]);
  const [newComment, setNewComment] = useState('');

  // States for Communications & Attachments
  const [ticketCommunications, setTicketCommunications] = useState<ClientCommunication[]>([]);

  // --- ENHANCED FEATURES STATES ---
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [ticketTags, setTicketTags] = useState<TicketTag[]>([]);

  const allTags = useMemo(() => {
    const map = new Map<string, TicketTag>();
    (tickets || []).forEach((t: Ticket) => {
      (t.tags || []).forEach(tag => {
        if (!map.has(tag.name)) map.set(tag.name, tag);
      });
    });
    ticketTags.forEach(tag => {
      if (!map.has(tag.name)) map.set(tag.name, tag);
    });
    return Array.from(map.values());
  }, [tickets, ticketTags]);
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('');
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [mergeTargetId, setMergeTargetId] = useState('');
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3ecf8e');
  const [selectedTicketForTag, setSelectedTicketForTag] = useState<string | null>(null);
  const [ticketAttachments, setTicketAttachments] = useState<TicketAttachment[]>([]);
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);

  // --- TRANSPORT / LOGISTICS PLANNING STATES ---
  const [vehiclesList, setVehiclesList] = useState<Vehicle[]>([]);
  const [missionsList, setMissionsList] = useState<TransportMission[]>([]);
  const [activeMission, setActiveMission] = useState<TransportMission | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [driverName, setDriverName] = useState('');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [missionNotes, setMissionNotes] = useState('');
  const [missionStatus, setMissionStatus] = useState<'Planifié' | 'En cours' | 'Terminé'>('Planifié');
  const [isSavingMission, setIsSavingMission] = useState(false);

  // --- KANBAN DRAG & DROP STATES ---
  const [activeId, setActiveId] = useState<string | null>(null);

  const addTicketTag = (tag: any) => {
    setTicketTags(prev => [...prev, tag]);
  };

  const mergeTickets = (ticketId: string, targetId: string) => {
    // Logic for merging tickets
  };

  const activeTemplate = useMemo(() => {
    return (templates || []).find((t: DocumentTemplate) =>
      (selectedTicket?.quotation?.status === 'Approved' ? (t.type === 'INVOICE' || t.type === 'BOTH') : (t.type === 'QUOTATION' || t.type === 'BOTH'))
      && t.isActive
    ) || (templates || []).find((t: DocumentTemplate) => t.isActive);
  }, [templates, selectedTicket?.quotation?.status]);

  const docPrimaryColor = useMemo(() => activeTemplate?.primaryColor || '#1c1c1c', [activeTemplate]);
  const docLogo = useMemo(() => activeTemplate?.logoUrl || 'https://www.royalplaza.ga/wp-content/uploads/2021/04/RP-LOGO.png', [activeTemplate]);

  useEffect(() => { setIsMounted(true); }, []);

  const replaceVariables = (text: string) => {
    if (!text || !selectedTicket) return text;
    const total = ((selectedTicket?.interventionReport?.partsUsed?.reduce((s: number, p: UsedPart) => s + (Number(p.quantity) * Number(p.unitPrice)), 0) || 0) + pendingPrestations.reduce((s: number, p: Prestation) => s + Number(p.fixedCost), 0) - (selectedTicket?.financials?.discount || 0));
    const tech = technicians.find(t => t.id === selectedTicket.assignedTechnicianId)?.name || 'N/A';

    return text
      .replace(/{{client_nom}}/g, selectedTicket.customerName || '')
      .replace(/{{client_tel}}/g, selectedTicket.customerPhone || '')
      .replace(/{{ticket_id}}/g, selectedTicket.id || '')
      .replace(/{{date}}/g, new Date().toLocaleDateString('fr-FR'))
      .replace(/{{marque}}/g, selectedTicket.brand || '')
      .replace(/{{modele}}/g, selectedTicket.productName || '')
      .replace(/{{serie}}/g, selectedTicket.serialNumber || '')
      .replace(/{{total}}/g, total.toLocaleString() + ' FCFA')
      .replace(/{{tech}}/g, tech);
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeTicket = tickets.find((t: Ticket) => t.id === activeId);
    if (!activeTicket) return;

    // If dropped on a column (status), validate and update the ticket status
    const kanbanColumns = ['Nouveau', 'En réparation', 'En attente de devis', 'Devis envoyé', 'En attente de paiement', 'En attente client', 'Terminé - Prêt à être payé'];
    if (kanbanColumns.includes(overId)) {
      if (activeTicket.status !== overId) {
        // === TRANSITION GUARD ===
        const allowed = ALLOWED_TRANSITIONS[activeTicket.status] || [];
        if (!allowed.includes(overId)) {
          addNotification({
            title: 'Transition Bloquée',
            message: `Impossible de passer de "${activeTicket.status}" à "${overId}". Transitions autorisées : ${allowed.join(', ') || 'aucune'}.`,
            type: 'warning'
          });
          setActiveId(null);
          return;
        }
        const updatedTicket = { ...activeTicket, status: overId as any };
        await saveTicket(updatedTicket);
        addNotification({ title: 'Statut mis à jour', message: `Ticket déplacé vers ${overId}`, type: 'success' });
        refreshAll();
      }
    }

    setActiveId(null);
  };

  // Sortable Ticket Card Component
  const SortableTicketCard = ({ ticket }: { ticket: Ticket }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging
    } = useSortable({ id: ticket.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    return (
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        onClick={(e) => {
          if (!isDragging) setSelectedTicket(ticket);
        }}
        className="bg-white p-2 rounded-md border border-[#e5e5e5] cursor-grab active:cursor-grabbing hover:shadow-sm hover:border-[#d1d1d1] transition-all relative group"
      >
        <div className="absolute top-1 right-1 text-[#d1d1d1] group-hover:text-[#9ca3af]">
          <GripVertical size={8} />
        </div>
        <div className="flex items-center justify-between mb-1 pr-4">
          <span className="text-[9px] font-mono font-semibold text-[#3ecf8e]">#{ticket.id}</span>
          <span className={`px-1 py-0 rounded text-[7px] font-semibold uppercase ${getPriorityStyle(ticket.priority)}`}>
            {ticket.priority}
          </span>
        </div>
        <p className="text-[11px] font-semibold text-[#1c1c1c] truncate pr-2">{ticket.customerName}</p>
        <p className="text-[9px] text-[#686868] truncate">{ticket.productName || ticket.category}</p>
        <div className="flex items-center justify-between mt-1.5">
          <div className="flex items-center gap-1.5">
            <img
              src={technicians.find((tec: Technician) => tec.id === ticket.assignedTechnicianId)?.avatar || "https://ui-avatars.com/api/?name=Unassigned"}
              className="w-3 h-3 rounded-full border border-[#e5e5e5]"
              alt=""
            />
            <span className="text-[8px] text-[#686868]">
              {technicians.find((tec: Technician) => tec.id === ticket.assignedTechnicianId)?.name.split(' ')[0] || "Non assigné"}
            </span>
          </div>
          {ticket.tags && ticket.tags.length > 0 && (
            <div className="flex gap-0.5">
              {ticket.tags.slice(0, 2).map((tag: TicketTag) => (
                <span key={tag.id} className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color }} title={tag.name} />
              ))}
              {ticket.tags.length > 2 && <span className="text-[8px] text-[#9ca3af]">+{ticket.tags.length - 2}</span>}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Droppable Column Component
  const DroppableColumn = ({ status, children }: { status: string; children: React.ReactNode }) => {
    const { setNodeRef, isOver } = useDroppable({ id: status });

    return (
      <div
        ref={setNodeRef}
        className={`bg-[#f8f9fa] rounded-lg p-2.5 min-w-[260px] transition-all duration-200 ${isOver ? 'bg-[#f0fdf4] ring-1 ring-[#3ecf8e] shadow-md' : 'border border-[#e5e5e5]'}`}
      >
        {children}
      </div>
    );
  };

  const formRef = React.useRef<HTMLFormElement>(null);

  useEffect(() => { refreshAll(); }, [refreshAll]);

  // Auto-open ticket drawer from URL param (e.g. /tickets?id=T-123456)
  useEffect(() => {
    const ticketId = searchParams.get('id');
    if (ticketId && tickets && tickets.length > 0) {
      const match = tickets.find((t: Ticket) => t.id === ticketId);
      if (match) setSelectedTicket(match);
    }
  }, [searchParams, tickets]);

  // Réinitialiser la détection quand on ouvre/ferme le modal
  useEffect(() => {
    if (!isModalOpen) {
      setFormSN('');
      setFormProductName('');
      setFormBrand('LG');
      setFormPurchaseDate('');
      setFormCustomerName('');
      setFormCustomerPhone('');
      setDetectedProduct(null);
      setDetectedWarranty(null);
      setManualWarranty(false);
      setSearchInvoice('');
    } else if (editingTicket) {
      setFormSN(editingTicket.serialNumber || '');
      setFormProductName(editingTicket.productName || '');
      setFormBrand(editingTicket.brand || 'LG');
      setFormPurchaseDate(editingTicket.purchaseDate ? new Date(editingTicket.purchaseDate).toISOString().split('T')[0] : '');
      setFormCustomerName(editingTicket.customerName || '');
      setFormCustomerPhone(editingTicket.customerPhone || '');
      setManualWarranty(editingTicket.interventionReport?.isWarrantyValid || false);
    }
  }, [isModalOpen, editingTicket]);

  const handleExportPDF = async (ticket: Ticket) => {
    try {
      await generateTicketDossier(ticket);
      addNotification({ title: 'Export PDF', message: 'Le dossier SAV a été généré avec succès.', type: 'success' });
    } catch (e) {
      console.error('PDF Export Error:', e);
      addNotification({ title: 'Erreur Export', message: 'Échec de la génération du PDF.', type: 'error' });
    }
  };

  const handleReopen = async (ticketId: string) => {
    const ticket = tickets.find((t: Ticket) => t.id === ticketId) || selectedTicket;
    if (!ticket) return;

    const currentReopenCount = ticket.reopenCount || 0;

    // === REOPENING LIMITS ===
    if (currentReopenCount >= MAX_REOPEN_COUNT) {
      addNotification({ title: 'Limite Atteinte', message: `Ce dossier a déjà été réouvert ${MAX_REOPEN_COUNT} fois. Aucune réouverture supplémentaire n'est autorisée.`, type: 'error' });
      return;
    }
    if (currentReopenCount >= 1 && currentUser?.role !== 'MANAGER' && currentUser?.role !== 'ADMIN') {
      addNotification({ title: 'Accès Refusé', message: 'Seul un Manager ou Admin peut effectuer une 2ème réouverture.', type: 'warning' });
      return;
    }

    const reason = window.prompt(`Veuillez justifier la réouverture de ce dossier SAV (réouverture ${currentReopenCount + 1}/${MAX_REOPEN_COUNT}) :`);
    if (!reason || !reason.trim()) return;

    try {
      const updated: Ticket = {
        ...ticket,
        status: 'En cours' as any,
        isReopened: true,
        reopeningReason: reason,
        reopenCount: currentReopenCount + 1,
        lastUpdate: new Date().toISOString(),
        history: [
          ...(ticket.history || []),
          { action: `Réouverture (${currentReopenCount + 1}/${MAX_REOPEN_COUNT})`, user: currentUser?.name || 'Système', timestamp: new Date().toISOString(), details: reason }
        ]
      };
      await saveTicket(updated);
      addNotification({ title: 'Dossier Réouvert', message: `Réouverture ${currentReopenCount + 1}/${MAX_REOPEN_COUNT} effectuée.`, type: 'info' });
      setSelectedTicket(updated);
    } catch (e) {
      console.error('Reopen Error:', e);
      addNotification({ title: 'Erreur', message: 'Impossible de réouvrir le dossier.', type: 'error' });
    }
  };

  // Détection du produit dans le catalogue
  useEffect(() => {
    const match = products?.find((p: Product) => p.name === formProductName);
    if (match) {
      setDetectedProduct(match);
      setFormBrand(match.brand);
    } else {
      setDetectedProduct(null);
    }
  }, [formProductName, products]);

  // Calcul automatique de la validité de la garantie
  useEffect(() => {
    if (formSN.length > 4) {
      const match = warranties.find((w: WarrantyRecord) =>
        w.serialNumber.toLowerCase() === formSN.trim().toLowerCase()
      );
      if (match) {
        const isExpired = new Date(match.expiryDate) < new Date();
        setDetectedWarranty(!isExpired ? match : null);
        if (!isExpired) setManualWarranty(true);
        setFormProductName(match.product);
        setFormBrand(match.brand);
        setFormPurchaseDate(new Date(match.purchaseDate).toISOString().split('T')[0]);
        return;
      }
    }

    // Fallback: calcul basique via date d'achat + catalogue
    if (detectedProduct && formPurchaseDate) {
      const purchase = new Date(formPurchaseDate);
      const expiry = new Date(purchase);
      expiry.setMonth(expiry.getMonth() + (detectedProduct.warrantyMonths || 12));
      setManualWarranty(expiry > new Date());
    }
    setDetectedWarranty(null);
  }, [formSN, formPurchaseDate, detectedProduct, warranties]);

  // Recherche par numéro de facture
  useEffect(() => {
    if (searchInvoice.length > 2) {
      // Pour la démo, on cherche dans warranties le invoiceNumber ou S/N
      const match = warranties.find((w: WarrantyRecord) =>
        w.invoiceNumber?.toLowerCase() === searchInvoice.trim().toLowerCase() ||
        w.serialNumber?.toLowerCase().includes(searchInvoice.trim().toLowerCase())
      );
      if (match) {
        setFormSN(match.serialNumber);
        setFormCustomerName(match.customerName);
        setFormBrand(match.brand);
        setFormProductName(match.product);
        addNotification({ title: 'Facture Trouvée', message: 'Variables pré-remplies avec succès.', type: 'info' });
      }
    }
  }, [searchInvoice, warranties]);

  useEffect(() => {
    if (selectedTicket?.quotation) {
      setPendingPrestations(selectedTicket.quotation.prestations);
    } else {
      setPendingPrestations([]);
    }

    // Fetch comments
    if (selectedTicket?.id) {
      const fetchTicketDetails = async () => {
        setIsFetchingDetails(true);
        try {
          const [comments, comms, atts] = await Promise.all([
            ApiService.ticketComments.getByTicket(selectedTicket.id),
            ApiService.clientCommunications.getByTicket(selectedTicket.id),
            ApiService.ticketAttachments.getByTicket(selectedTicket.id)
          ]);
          setTicketComments(comments);
          setTicketCommunications(comms);
          setTicketAttachments(atts);
        } catch (e) {
          console.error("Error fetching ticket details", e);
        } finally {
          setIsFetchingDetails(false);
        }
      };
      fetchTicketDetails();
    } else {
      setTicketComments([]);
      setTicketCommunications([]);
      setTicketAttachments([]);
    }
  }, [selectedTicket?.id]);

  // --- TRANSPORT LOGISTICS: Load vehicles & missions when ticket selected ---
  useEffect(() => {
    if (!selectedTicket?.id) {
      setVehiclesList([]);
      setMissionsList([]);
      setActiveMission(null);
      setSelectedVehicleId('');
      setDriverName('');
      setDestinationAddress('');
      setMissionNotes('');
      setMissionStatus('Planifié');
      return;
    }
    if (selectedTicket.interventionLocation !== 'chez le client') {
      setActiveMission(null);
      return;
    }
    const fetchTransportData = async () => {
      try {
        const [vehicles, missions] = await Promise.all([
          ApiService.vehicles.getAll(),
          ApiService.transportMissions.getAll()
        ]);
        setVehiclesList(vehicles || []);
        setMissionsList(missions || []);
        const existing = (missions as TransportMission[] || []).find((m: TransportMission) => m.ticketId === selectedTicket.id);
        if (existing) {
          setActiveMission(existing);
          setSelectedVehicleId(existing.vehicleId || '');
          setDriverName(existing.driver || '');
          setDestinationAddress(existing.destination || '');
          setMissionNotes(existing.notes || '');
          setMissionStatus(existing.status || 'Planifié');
        } else {
          setActiveMission(null);
          setSelectedVehicleId('');
          // Pre-fill driver with assigned technician name
          const assignedTech = technicians.find((t: Technician) => t.id === selectedTicket.assignedTechnicianId);
          setDriverName(assignedTech?.name || '');
          // Pre-fill destination with client location
          setDestinationAddress(selectedTicket.location || '');
          setMissionNotes('');
          setMissionStatus('Planifié');
        }
      } catch (e) {
        console.error('Error fetching transport data:', e);
      }
    };
    fetchTransportData();
  }, [selectedTicket?.id, selectedTicket?.interventionLocation]);

  // --- TRANSPORT: Save or update transport mission ---
  const handleSaveTransportMission = async () => {
    if (!selectedTicket || !selectedVehicleId || !driverName.trim()) {
      addNotification({ title: 'Champs requis', message: 'Veuillez sélectionner un véhicule et saisir le nom du chauffeur.', type: 'warning' });
      return;
    }
    setIsSavingMission(true);
    try {
      const missionId = activeMission?.id || Math.random().toString(36).substr(2, 9);
      const mission: TransportMission = {
        id: missionId,
        ticketId: selectedTicket.id,
        vehicleId: selectedVehicleId,
        driver: driverName.trim(),
        destination: destinationAddress.trim(),
        status: missionStatus,
        departureTime: activeMission?.departureTime || new Date().toISOString(),
        arrivalTime: missionStatus === 'Terminé' ? new Date().toISOString() : undefined,
        notes: missionNotes.trim() || undefined
      };
      await ApiService.transportMissions.saveAll([mission]);

      // Update vehicle status accordingly
      const vehicle = vehiclesList.find((v: Vehicle) => v.id === selectedVehicleId);
      if (vehicle) {
        const updatedVehicle: Vehicle = {
          ...vehicle,
          status: missionStatus === 'Terminé' ? 'Disponible' : 'En course',
          driver: missionStatus === 'Terminé' ? undefined : driverName.trim()
        };
        await ApiService.vehicles.saveAll([updatedVehicle]);
        setVehiclesList(prev => prev.map(v => v.id === updatedVehicle.id ? updatedVehicle : v));
      }

      setActiveMission(mission);
      addNotification({
        title: activeMission ? 'Mission mise à jour' : 'Mission créée',
        message: `Mission logistique ${activeMission ? 'mise à jour' : 'enregistrée'} pour ${selectedTicket.customerName}.`,
        type: 'success'
      });
    } catch (e) {
      console.error('Error saving transport mission:', e);
      addNotification({ title: 'Erreur', message: 'Impossible d\'enregistrer la mission logistique.', type: 'error' });
    } finally {
      setIsSavingMission(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedTicket || !currentUser) return;
    try {
      const added = await ApiService.ticketComments.add({
        ticketId: selectedTicket.id,
        authorId: currentUser.id,
        authorName: currentUser.name,
        content: newComment.trim()
      });
      setTicketComments(prev => [...prev, added]);
      setNewComment('');

      // Notify assigned technician if commenter is someone else
      if (selectedTicket.assignedTechnicianId && currentUser.id !== selectedTicket.assignedTechnicianId) {
        await sendPersistentNotification(
          selectedTicket.assignedTechnicianId,
          'COMMENT',
          `${currentUser.name} a commenté le dossier ${selectedTicket.id}`,
          `/tickets?id=${selectedTicket.id}`
        );
      }
    } catch (e) {
      addNotification({ title: 'Erreur', message: 'Impossible d\'ajouter le commentaire.', type: 'error' });
    }
  };

  // Droits d'accès élargis pour la gestion (L'Agent gère, le Manager supervise)
  const canManage = currentUser?.role === 'ADMIN' || currentUser?.role === 'AGENT';
  const isSupervisor = currentUser?.role === 'MANAGER';
  const isTechnician = currentUser?.role === 'TECHNICIAN';
  const currentTech = (technicians || []).find((t: Technician) => t.email?.toLowerCase() === currentUser?.email?.toLowerCase());

  const filtered = useMemo(() => {
    return (tickets || []).filter((t: Ticket) => {
      if (activeTab === 'actifs' && t.status === 'Fermé') return false;
      if (activeTab === 'clotures' && t.status !== 'Fermé') return false;
      if (isTechnician && (!currentTech || t.assignedTechnicianId !== currentTech.id)) return false;

      const sw = searchTerm.toLowerCase();
      const matchesSearch = (t.customerName || '').toLowerCase().includes(sw) ||
        (t.id || '').toLowerCase().includes(sw) ||
        (t.productName || '').toLowerCase().includes(sw) ||
        (t.serialNumber || '').toLowerCase().includes(sw);

      const matchesStatus = statusFilter === 'Tous' || t.status === statusFilter;
      const matchesCategory = categoryFilter === 'Tous' || t.category === categoryFilter;
      const matchesPriority = priorityFilter === 'Tous' || t.priority === priorityFilter;

      let matchesSLA = true;
      if (slaFilter !== 'Tous' && t.status !== 'Fermé') {
        const ageHours = (new Date().getTime() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60);
        if (slaFilter === 'Normal') matchesSLA = ageHours < 48;
        else if (slaFilter === 'Attente') matchesSLA = ageHours >= 48 && ageHours < 72;
        else if (slaFilter === 'Critique') matchesSLA = ageHours >= 72;
      }

      // Tag filter
      const matchesTag = !selectedTagFilter || (t.tags || []).some(tag => tag.name === selectedTagFilter);

      return matchesSearch && matchesStatus && matchesCategory && matchesPriority && matchesSLA && matchesTag;
    }).sort((a: Ticket, b: Ticket) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime());
  }, [tickets, searchTerm, statusFilter, categoryFilter, priorityFilter, slaFilter, isTechnician, currentTech, activeTab, selectedTagFilter]);

  const addHistory = (ticket: Ticket, action: string, details?: string): Ticket => {
    const historyEntry = {
      action,
      user: currentUser?.name || 'Système',
      timestamp: new Date().toISOString(),
      details
    };
    return {
      ...ticket,
      history: [...(ticket.history || []), historyEntry]
    };
  };

  const handleNewTicketClick = () => {
    const userShowroom = currentUser?.showroom?.trim().toLowerCase();

    let activeSession = cashRegisterSessions?.find(s =>
      s.status === 'Ouverte' &&
      s.openedBy === currentUser?.id &&
      s.showroom &&
      s.showroom.trim().toLowerCase() === userShowroom
    );

    if (!activeSession) {
      activeSession = cashRegisterSessions?.find(s => s.status === 'Ouverte' && s.openedBy === currentUser?.id);
    }

    if (!activeSession) {
      addNotification({
        title: 'Caisse fermée',
        message: 'Vous devez ouvrir votre propre session de caisse dans le module "Caisse" avant de pouvoir créer un dossier SAV.',
        type: 'warning'
      });
      return;
    }

    setEditingTicket(null);
    setIsModalOpen(true);
  };

  const handleSaveTicket = async (e?: React.FormEvent<HTMLFormElement>) => {
    if (e) e.preventDefault();
    if (isTechnician) return;

    // VERROUILLAGE : Interdire modification si fermé
    if (editingTicket?.status === 'Fermé') {
      addNotification({ title: 'Accès Refusé', message: 'Ce dossier est clôturé et ne peut plus être modifié.', type: 'warning' });
      return;
    }

    setIsSaving(true);
    const formData = formRef.current ? new FormData(formRef.current) : new FormData();
    const phone = formCustomerPhone;
    const name = formCustomerName;

    // --- AUTO-ASSIGNMENT LOGIC (Enhanced with Skills Matching) ---
    let assignedTech = (formData.get('technicianId') as string) || '';

    const showroomVal = (formData.get('showroom') as string) || 'Glass';
    const ticketCategory = formData.get('category') as TicketCategory;
    const ticketLocation = (formData.get('location') as string) || '';

    if (!assignedTech) {
      const availableTechs = (technicians || []).filter((t: Technician) => t.status !== 'Hors ligne');
      if (availableTechs.length > 0) {
        const getWorkload = (techId: string) => tickets.filter((t: Ticket) => t.assignedTechnicianId === techId && !['Fermé', 'Payé - Clôturé'].includes(t.status)).length;

        // Score-based assignment algorithm
        const scoredTechs = availableTechs.map((tech: Technician) => {
          let score = 0;

          // 1. Workload score (40% weight) - lower is better
          const workload = getWorkload(tech.id);
          score += Math.max(0, 40 - workload * 8); // 40 pts for 0 tickets, decreasing

          // 2. Skills match score (30% weight)
          const techSpecialties = tech.specialty || [];
          if (ticketCategory && techSpecialties.includes(ticketCategory)) {
            score += 30; // Full match
          } else if (ticketCategory && techSpecialties.some((s: string) => ticketCategory.toLowerCase().includes(s.toLowerCase()))) {
            score += 15; // Partial match
          }

          // 3. Showroom proximity score (20% weight)
          if (tech.showroom === showroomVal) {
            score += 20;
          }

          // 4. Customer history score (10% weight)
          const previousTickets = tickets.filter((t: Ticket) =>
            t.customerName === name &&
            t.assignedTechnicianId === tech.id &&
            t.status === 'Fermé'
          );
          if (previousTickets.length > 0) {
            score += Math.min(10, previousTickets.length * 2); // 2 pts per previous success, max 10
          }

          return { tech, score, workload };
        });

        // Sort by score (higher is better), then by workload (lower is better)
        scoredTechs.sort((a: any, b: any) => {
          if (b.score !== a.score) return b.score - a.score;
          return a.workload - b.workload;
        });

        assignedTech = scoredTechs[0]?.tech?.id || availableTechs[0].id;

      }
    }

    const ticketData: Ticket = {
      ...editingTicket,
      id: editingTicket?.id || `T-${Date.now().toString().slice(-6)}`,
      productId: detectedProduct?.id,
      customerName: name,
      customerPhone: phone,
      source: (formData.get('source') as any) || 'Interne',
      showroom: showroomVal,
      category: formData.get('category') as TicketCategory,
      status: (formData.get('status') as any) || editingTicket?.status || 'Nouveau',
      priority: (formData.get('priority') as any) || 'Moyenne',
      productName: formProductName,
      brand: formBrand,
      serialNumber: formSN,
      purchaseDate: formPurchaseDate || undefined,
      description: formData.get('description') as string,
      location: formData.get('location') as string,
      interventionLocation: (formData.get('interventionLocation') as any) || 'à l\'atelier',
      clientImpact: (formData.get('clientImpact') as any) || 'Faible',
      isEquipmentDown: formData.get('isEquipmentDown') === 'on',
      assignedTechnicianId: assignedTech || undefined,
      createdAt: editingTicket?.createdAt || new Date().toISOString(),
      lastUpdate: new Date().toISOString(),
      interventionReport: {
        ...editingTicket?.interventionReport,
        isWarrantyValid: manualWarranty
      },
      financials: editingTicket?.financials || {
        partsTotal: 0, partsCost: 0, laborTotal: 0, laborCost: 0, travelFee: 5000,
        logisticsCost: 2000, discount: 0, grandTotal: 5000, netMargin: 0, isPaid: false,
        advancePayment: 0, remainingToPay: 5000, advancePayments: []
      },
      createdBy: editingTicket?.createdBy || currentUser?.id
    };

    ticketData.invoiceNumber = searchInvoice || ticketData.invoiceNumber;

    try {
      const phone = formData.get('customerPhone') as string;
      const name = formData.get('customerName') as string;
      const existingCustomer = customers?.find((c: Customer) =>
        (c.phone === phone && phone) ||
        ((c.name || '').toLowerCase() === (name || '').toLowerCase())
      );

      if (!existingCustomer && phone && name) {
        const newCustomer: Customer = {
          id: `CST-${Date.now().toString().slice(-6)}`, name, phone, email: '', type: 'Particulier',
          address: (formData.get('location') as string) || '', status: 'Actif', totalSpent: 0,
          ticketsCount: 1, lastVisit: new Date().toISOString(), companyName: '', isArchived: false,
          createdBy: currentUser?.id
        };
        ticketData.customerId = newCustomer.id;
        try { await ApiService.customers.saveAll([newCustomer]); } catch (e) { }
      } else if (existingCustomer) {
        ticketData.customerId = existingCustomer.id;
        existingCustomer.ticketsCount = (existingCustomer.ticketsCount || 0) + 1;
        existingCustomer.lastVisit = new Date().toISOString();
        try { await ApiService.customers.saveAll([existingCustomer]); } catch (e) { }
      }

      // Notify technician if assigned/changed
      const newAssignedId = ticketData.assignedTechnicianId;
      const oldAssignedId = editingTicket?.assignedTechnicianId;
      if (newAssignedId && newAssignedId !== oldAssignedId) {
        const tech = technicians.find((t: any) => t.id === newAssignedId);
        if (tech) {
          await sendPersistentNotification(
            newAssignedId,
            'ASSIGNMENT',
            `Nouveau dossier assigné: ${ticketData.id} (${ticketData.productName})`,
            `/tickets?id=${ticketData.id}`
          );
        }
      }

      // Ensure assigned technician exists in the technicians table (FK constraint)
      if (ticketData.assignedTechnicianId && !(rawTechnicians || []).some((t: Technician) => t.id === ticketData.assignedTechnicianId)) {
        const userTech = (allUsers || []).find((u: any) => u.id === ticketData.assignedTechnicianId);
        if (userTech) {
          await ApiService.technicians.saveAll([{
            id: userTech.id,
            name: userTech.name,
            email: userTech.email || '',
            phone: '',
            specialty: ['SAV'] as TicketCategory[],
            showroom: userTech.showroom || ticketData.showroom,
            avatar: userTech.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userTech.name)}&background=3ecf8e&color=ffffff`,
            status: 'Disponible' as const,
            activeTickets: 0,
            completedTickets: 0,
            avgResolutionTime: '0h',
            rating: 5.0,
            nps: 100,
            firstFixRate: 100,
            performanceHistory: [],
            maxWorkload: 5,
            teamId: undefined
          }]);
        }
      }

      await saveTicket(ticketData);
      addNotification({
        title: editingTicket ? 'Ticket Mis à jour' : 'Ticket Créé',
        message: `Dossier ${ticketData.id} synchronisé avec succès.`,
        type: 'success'
      });
      setIsModalOpen(false);
      setEditingTicket(null);
      setCurrentStep(1);
      if (selectedTicket?.id === ticketData.id) setSelectedTicket(ticketData);
    } catch (err: any) {
      console.error('Error saving ticket:', err);
      addNotification({
        title: 'Erreur',
        message: `Impossible de sauvegarder le dossier: ${err.message || JSON.stringify(err)}`,
        type: 'error'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReassign = async (ticketId: string, techId: string) => {
    const ticket = tickets.find((t: Ticket) => t.id === ticketId);
    if (!ticket || !currentUser) return;

    const tech = technicians.find((t: Technician) => t.id === techId);
    const oldTechId = ticket.assignedTechnicianId;

    const updatedTicket: Ticket = {
      ...ticket,
      assignedTechnicianId: techId,
      history: [
        ...(ticket.history || []),
        {
          action: 'Réassignation',
          user: currentUser.name,
          timestamp: new Date().toISOString(),
          details: `Dossier réassigné à ${tech ? tech.name : 'Inconnu'}`
        }
      ]
    };

    try {
      await saveTicket(updatedTicket);
      if (techId && techId !== oldTechId) {
        await sendPersistentNotification(
          techId,
          'ASSIGNMENT',
          `Dossier réassigné : ${updatedTicket.id} (${updatedTicket.productName})`,
          `/tickets?id=${updatedTicket.id}`
        );
      }
      setSelectedTicket(updatedTicket);
      addNotification({ title: 'Dossier Réassigné', message: `Technicien mis à jour avec succès.`, type: 'success' });
    } catch (e) {
      addNotification({ title: 'Erreur', message: 'Impossible de réassigner le dossier.', type: 'error' });
    }
  };

  const handleSetEnReparation = async () => {
    if (!selectedTicket) return;
    if (!window.confirm(`Passer le dossier #${selectedTicket.id} en "En réparation" ?`)) return;
    setIsSaving(true);
    try {
      const updated = addHistory(
        { ...selectedTicket, status: 'En réparation', lastUpdate: new Date().toISOString() },
        'Mise en réparation',
        `Ticket passé en "En réparation" après paiement.`
      );
      await saveTicket(updated);
      setSelectedTicket(updated);
      refreshAll();
      addNotification({ title: 'Statut mis à jour', message: `Le dossier #${selectedTicket.id} est en réparation.`, type: 'success' });
    } catch (err: any) {
      addNotification({ title: 'Erreur', message: err.message, type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCloseTicket = async (ticket: Ticket) => {
    if (!ticket.interventionReport?.equipmentStatus) {
      addNotification({ title: 'Clôture impossible', message: 'Le rapport d\'intervention doit être complété avant la clôture.', type: 'warning' });
      return;
    }
    // Vérification cotation obligatoire pour Manager et Agent
    const isManagerOrAgent = currentUser?.role === 'MANAGER' || currentUser?.role === 'AGENT';
    const hasValidQuotation = ticket.quotation?.status === 'Approved' && ticket.financials?.invoiceNumber;
    if (isManagerOrAgent && !hasValidQuotation) {
      addNotification({ title: 'Action Bloquée', message: 'Veuillez générer et valider la cotation (facture) avant la clôture.', type: 'warning' });
      return;
    }
    if (!window.confirm('Voulez-vous clôturer définitivement ce dossier SAV ? Toute manipulation ultérieure sera bloquée.')) return;
    setIsSaving(true);
    try {
      // --- Déduction de stock automatique ---
      if (ticket.interventionReport?.partsUsed && ticket.interventionReport.partsUsed.length > 0) {
        const partsToSave: Part[] = [];
        const movements: any[] = [];
        ticket.interventionReport.partsUsed.forEach(partUsed => {
          const dbPart = parts?.find((p: Part) => p.name === partUsed.name);
          if (dbPart) {
            const updatedPart = { ...dbPart, currentStock: Math.max(0, dbPart.currentStock - partUsed.quantity) };
            partsToSave.push(updatedPart);
            movements.push({
              id: `SM-OUT-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              partId: dbPart.id,
              type: 'OUT',
              quantity: partUsed.quantity,
              date: new Date().toISOString(),
              reason: `Intervention SAV Dossier #${ticket.id}`,
              author: currentUser?.name || 'Système',
              ticketId: ticket.id
            });
          }
        });
        if (partsToSave.length > 0) await ApiService.parts.saveAll(partsToSave);
        if (movements.length > 0) await ApiService.stockMovements.saveAll(movements);
      }

      const updated: Ticket = {
        ...ticket,
        status: 'Fermé',
        lastUpdate: new Date().toISOString()
      };
      await saveTicket(updated);
      addNotification({ title: 'Dossier Clôturé', message: 'Le SAV est désormais verrouillé en lecture seule.', type: 'success' });
      setSelectedTicket(updated);
      refreshAll();
    } catch (err) {
      addNotification({ title: 'Erreur', message: 'Échec de la clôture définitive.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddCotation = async (targetStatus: 'Draft' | 'Sent' | 'Approved' = 'Approved') => {
    if (!selectedTicket) return;
    setIsSaving(true);
    try {
      const partsTotal = selectedTicket.interventionReport?.partsUsed?.reduce((s: number, p: UsedPart) => s + (Number(p.quantity) * Number(p.unitPrice)), 0) || 0;
      const realPartsCost = selectedTicket.interventionReport?.partsUsed?.reduce((s: number, p: UsedPart) => s + (Number(p.quantity) * Number(p.purchasePrice || 0)), 0) || 0;
      const prestationsCost = pendingPrestations.reduce((s: number, p: Prestation) => s + Number(p.fixedCost), 0);
      const discount = Number(manualDiscount) || 0;
      const totalAmount = Math.max(0, partsTotal + prestationsCost - discount);

      let invoiceNum = selectedTicket.financials?.invoiceNumber;
      // On ne génère le numéro de facture QUE si on approuve le devis
      if (!invoiceNum && targetStatus === 'Approved') {
        try {
          invoiceNum = await ApiService.caisse.generateInvoiceNumber();
        } catch (e) {
          invoiceNum = `INV-${Date.now().toString().slice(-6)}`;
        }
      }

      const netMargin = totalAmount - realPartsCost - (prestationsCost * 0.1);

      // Calcul critique du restant à payer : total - (somme de tous les acomptes versés) - avoirs
      const totalAdvance = (selectedTicket.financials?.advancePayments || []).reduce((sum, ap) => sum + Number(ap.amount), 0) + (selectedTicket.financials?.advancePayment || 0);
      const remainingToPay = Math.max(0, totalAmount - totalAdvance - (selectedTicket.financials?.storeCredit || 0));

      let updated: Ticket = {
        ...selectedTicket,
        quotation: {
          id: selectedTicket.quotation?.id || `Q-${Date.now().toString().slice(-6)}`,
          prestations: pendingPrestations,
          totalAmount: totalAmount,
          status: targetStatus,
          createdAt: selectedTicket.quotation?.createdAt || new Date().toISOString()
        },
        financials: {
          ...selectedTicket.financials,
          travelFee: selectedTicket.financials?.travelFee ?? 5000,
          logisticsCost: selectedTicket.financials?.logisticsCost ?? 2000,
          discount: discount,
          netMargin: netMargin,
          paymentMethod: selectedTicket.financials?.paymentMethod || 'Espèces',
          partsTotal: partsTotal,
          partsCost: realPartsCost,
          laborTotal: prestationsCost,
          laborCost: prestationsCost,
          grandTotal: totalAmount,
          invoiceNumber: invoiceNum,
          remainingToPay: remainingToPay,
          isPaid: (targetStatus === 'Approved' && totalAmount === 0) ? true : (selectedTicket.financials?.isPaid || false),
          paymentDate: (targetStatus === 'Approved' && totalAmount === 0) ? new Date().toISOString() : (selectedTicket.financials?.paymentDate)
        },
        // Le statut du TICKET ne change que si c'est Approuvé
        status: targetStatus === 'Approved'
          ? (totalAmount === 0 ? 'Payé - Clôturé' : 'Terminé - Prêt à être payé')
          : selectedTicket.status,
        lastUpdate: new Date().toISOString()
      };

      updated = addHistory(updated, 'MAJ Devis', `Cotation mise à jour (${targetStatus}). Montant : ${totalAmount.toLocaleString()} FCFA.`);
      await saveTicket(updated);
      setSelectedTicket(updated);
      addNotification({
        title: targetStatus === 'Approved' ? 'Facture Générée' : 'Devis Mis à Jour',
        message: targetStatus === 'Approved' ? `Le devis est validé (Facture ${invoiceNum}).` : `Statut du devis : ${targetStatus}`,
        type: 'success'
      });
      if (targetStatus === 'Approved') {
        setIsCotationModalOpen(false);
      }
    } catch (err: any) {
      console.error('Erreur détaillée handleAddCotation:', err);
      addNotification({ title: 'Erreur', message: `Impossible d'enregistrer la cotation: ${err?.message || 'Erreur inconnue'}`, type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (!selectedTicket || !selectedTicket.financials) return;

    setIsSaving(true);
    try {
      // 1. Vérifier si une caisse est ouverte pour ce showroom
      const registers = await ApiService.caisse.getAllCashRegisters();
      const showroomRegister = registers.find(r => r.showroom === selectedTicket.showroom && r.isActive);

      if (!showroomRegister) {
        throw new Error(`Aucune caisse active trouvée pour le showroom ${selectedTicket.showroom}`);
      }

      const activeSession = await ApiService.caisse.getActiveSessionByCashRegister(showroomRegister.id);
      if (!activeSession) {
        throw new Error(`La caisse "${showroomRegister.name}" est fermée. Veuillez l'ouvrir en section Finance.`);
      }

      if (activeSession.openedBy !== currentUser?.id) {
        throw new Error(`Cette caisse a été ouverte par un autre agent. Vous ne pouvez encaisser que sur votre propre caisse.`);
      }

      const isWarranty = selectedTicket.interventionReport?.isWarrantyValid === true;
      const amountToPay = selectedTicket.financials.remainingToPay || 0;

      if (!window.confirm(
        isWarranty
          ? `Produit sous garantie — le montant de ${amountToPay.toLocaleString()} FCFA sera imputé à votre caisse (dépense). Confirmer ?`
          : `Confirmer le règlement de ${amountToPay.toLocaleString()} FCFA sur la caisse ${showroomRegister.name} ?`
      )) {
        setIsSaving(false);
        return;
      }

      let updated: Ticket = {
        ...selectedTicket,
        financials: {
          ...selectedTicket.financials,
          isPaid: true,
          remainingToPay: 0,
          paymentDate: new Date().toISOString(),
        },
        status: 'Payé - Clôturé',
        lastUpdate: new Date().toISOString()
      };

      updated = addHistory(
        updated,
        isWarranty ? 'Paiement Garantie' : 'Paiement Solde',
        isWarranty
          ? `Prise en charge garantie — ${amountToPay.toLocaleString()} FCFA imputé à la caisse (${showroomRegister.name}).`
          : `Solde de ${amountToPay.toLocaleString()} FCFA réglé en caisse (${showroomRegister.name}).`
      );

      // 2. Sauvegarder le ticket
      await saveTicket(updated);

      // 3. Créer l'entrée en caisse
      await ApiService.caisse.addEntry({
        sessionId: activeSession.id,
        cashRegisterId: showroomRegister.id,
        ticketId: selectedTicket.id,
        customerName: selectedTicket.customerName,
        type: isWarranty ? 'Dépense' : 'Solde',
        amount: amountToPay,
        method: isWarranty ? 'Espèces' : (selectedTicket.financials.paymentMethod || 'Espèces'),
        recordedBy: currentUser?.id || 'Inconnu',
        recordedByName: currentUser?.name || 'Inconnu',
        notes: isWarranty
          ? `Garantie Dossier #${selectedTicket.id} - Facture ${selectedTicket.financials.invoiceNumber || 'N/A'}`
          : `Solde Dossier #${selectedTicket.id} - Facture ${selectedTicket.financials.invoiceNumber || 'N/A'}`
      });

      // Ne pas incrémenter le total du client si c'est une prise en charge garantie
      if (!isWarranty && selectedTicket.customerId) {
        await ApiService.customers.updateTotalSpent(selectedTicket.customerId, amountToPay);
      }

      setSelectedTicket(updated);
      refreshAll();
      addNotification({
        title: isWarranty ? 'Garantie Appliquée' : 'Paiement Confirmé',
        message: isWarranty
          ? 'Montant imputé à la caisse (dépense garantie).'
          : 'Règlement validé et caisse mise à jour.',
        type: 'success'
      });
    } catch (err: any) {
      console.error('Erreur handleConfirmPayment:', err);
      addNotification({ title: 'Erreur Paiement', message: err.message || 'Échec de la validation.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrintInvoice = () => {
    if (!selectedTicket) return;
    const showroom = (showrooms || []).find((s: ShowroomConfig) => s.id === selectedTicket.showroom);
    printInvoice(selectedTicket, templates || [], showroom ? { address: showroom.address, phone: showroom.phone, hours: showroom.hours } : undefined);
  };

  const handleSendQuotation = async () => {
    if (!selectedTicket) return;
    setIsSaving(true);
    try {
      const partsTotal = selectedTicket.interventionReport?.partsUsed?.reduce((s: number, p: UsedPart) => s + (Number(p.quantity) * Number(p.unitPrice)), 0) || 0;
      const realPartsCost = selectedTicket.interventionReport?.partsUsed?.reduce((s: number, p: UsedPart) => s + (Number(p.quantity) * Number(p.purchasePrice || 0)), 0) || 0;
      const prestationsCost = pendingPrestations.reduce((s: number, p: Prestation) => s + Number(p.fixedCost), 0);
      const discount = Number(manualDiscount) || 0;
      const totalAmount = Math.max(0, partsTotal + prestationsCost - discount);
      const netMargin = totalAmount - realPartsCost - (prestationsCost * 0.1);
      const totalAdvance = (selectedTicket.financials?.advancePayments || []).reduce((sum, ap) => sum + Number(ap.amount), 0) + (selectedTicket.financials?.advancePayment || 0);
      const remainingToPay = Math.max(0, totalAmount - totalAdvance - (selectedTicket.financials?.storeCredit || 0));

      let updated: Ticket = {
        ...selectedTicket,
        status: 'Devis envoyé',
        quotation: {
          id: selectedTicket.quotation?.id || `Q-${Date.now().toString().slice(-6)}`,
          prestations: pendingPrestations,
          totalAmount: totalAmount,
          status: 'Sent',
          createdAt: selectedTicket.quotation?.createdAt || new Date().toISOString()
        },
        financials: {
          ...selectedTicket.financials,
          travelFee: selectedTicket.financials?.travelFee ?? 5000,
          logisticsCost: selectedTicket.financials?.logisticsCost ?? 2000,
          discount: discount,
          netMargin: netMargin,
          paymentMethod: selectedTicket.financials?.paymentMethod || 'Espèces',
          partsTotal: partsTotal,
          partsCost: realPartsCost,
          laborTotal: prestationsCost,
          laborCost: prestationsCost,
          grandTotal: totalAmount,
          remainingToPay: remainingToPay,
          invoiceNumber: selectedTicket.financials?.invoiceNumber,
          isPaid: selectedTicket.financials?.isPaid || false,
        },
        lastUpdate: new Date().toISOString()
      };

      updated = addHistory(updated, 'MAJ Devis', `Devis envoyé. Montant : ${totalAmount.toLocaleString()} FCFA.`);
      await saveTicket(updated);
      setSelectedTicket(updated);
      addNotification({ title: 'Devis Envoyé', message: `Le devis a été envoyé et le dossier passe en statut "Devis envoyé".`, type: 'success' });

      const showroom = (showrooms || []).find((s: ShowroomConfig) => s.id === updated.showroom);
      printInvoice(updated, templates || [], showroom ? { address: showroom.address, phone: showroom.phone, hours: showroom.hours } : undefined);
    } catch (err: any) {
      console.error('Erreur handleSendQuotation:', err);
      addNotification({ title: 'Erreur', message: `Impossible d'envoyer le devis: ${err?.message || 'Erreur inconnue'}`, type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleValidateQuotation = async () => {
    if (!selectedTicket || selectedTicket.quotation?.status !== 'Sent') return;
    setIsSaving(true);
    try {
      const partsTotal = selectedTicket.interventionReport?.partsUsed?.reduce((s: number, p: UsedPart) => s + (Number(p.quantity) * Number(p.unitPrice)), 0) || 0;
      const realPartsCost = selectedTicket.interventionReport?.partsUsed?.reduce((s: number, p: UsedPart) => s + (Number(p.quantity) * Number(p.purchasePrice || 0)), 0) || 0;
      const prestationsCost = pendingPrestations.reduce((s: number, p: Prestation) => s + Number(p.fixedCost), 0);
      const discount = Number(manualDiscount) || 0;
      const totalAmount = Math.max(0, partsTotal + prestationsCost - discount);
      const netMargin = totalAmount - realPartsCost - (prestationsCost * 0.1);
      const totalAdvance = (selectedTicket.financials?.advancePayments || []).reduce((sum, ap) => sum + Number(ap.amount), 0) + (selectedTicket.financials?.advancePayment || 0);
      const remainingToPay = Math.max(0, totalAmount - totalAdvance - (selectedTicket.financials?.storeCredit || 0));

      let invoiceNum = selectedTicket.financials?.invoiceNumber;
      if (!invoiceNum) {
        try {
          invoiceNum = await ApiService.caisse.generateInvoiceNumber();
        } catch (e) {
          invoiceNum = `INV-${Date.now().toString().slice(-6)}`;
        }
      }

      let updated: Ticket = {
        ...selectedTicket,
        status: 'En attente de paiement',
        quotation: {
          ...selectedTicket.quotation!,
          status: 'Approved',
        },
        financials: {
          ...selectedTicket.financials,
          travelFee: selectedTicket.financials?.travelFee ?? 5000,
          logisticsCost: selectedTicket.financials?.logisticsCost ?? 2000,
          discount: discount,
          netMargin: netMargin,
          partsTotal: selectedTicket.financials?.partsTotal || partsTotal,
          partsCost: selectedTicket.financials?.partsCost || realPartsCost,
          laborTotal: selectedTicket.financials?.laborTotal || prestationsCost,
          laborCost: selectedTicket.financials?.laborCost || prestationsCost,
          grandTotal: selectedTicket.financials?.grandTotal || totalAmount,
          isPaid: selectedTicket.financials?.isPaid || false,
          invoiceNumber: invoiceNum,
          remainingToPay: remainingToPay,
        },
        lastUpdate: new Date().toISOString()
      };

      updated = addHistory(updated, 'MAJ Devis', `Devis validé par le client. Montant : ${totalAmount.toLocaleString()} FCFA. En attente de paiement.`);
      await saveTicket(updated);
      setSelectedTicket(updated);
      addNotification({ title: 'Devis Validé', message: `Le devis a été validé. Facture ${invoiceNum}. En attente de paiement.`, type: 'success' });
    } catch (err: any) {
      console.error('Erreur handleValidateQuotation:', err);
      addNotification({ title: 'Erreur', message: `Impossible de valider le devis: ${err?.message || 'Erreur inconnue'}`, type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateInvoicePDF = async () => {
    if (!selectedTicket) return;
    try {
      const showroom = (showrooms || []).find((s: ShowroomConfig) => s.id === selectedTicket.showroom);
      await generateInvoicePDF(selectedTicket, templates || [], showroom ? { address: showroom.address, phone: showroom.phone, hours: showroom.hours } : undefined);
      addNotification({ title: 'Facture générée', message: 'La facture PDF a été téléchargée.', type: 'success' });
    } catch (e: any) {
      addNotification({ title: 'Erreur', message: e.message || 'Échec de la génération de la facture.', type: 'error' });
    }
  };

  const calculateSLALevel = (createdAt: string, status?: string) => {
    // === SLA FREEZE when waiting for client ===
    if (status === 'En attente client') {
      return { label: 'PAUSÉ', color: 'text-blue-600 bg-blue-100' };
    }
    const hours = (new Date().getTime() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
    if (hours > 72) return { label: 'CRITIQUE', color: 'text-red-600 bg-red-100' };
    if (hours > 24) return { label: 'ATTENTE', color: 'text-amber-600 bg-amber-100' };
    return { label: 'NORMAL', color: 'text-emerald-600 bg-emerald-100' };
  };

  const handleDuplicateTicket = (ticket: Ticket) => {
    const userShowroom = currentUser?.showroom?.trim().toLowerCase();

    let activeSession = cashRegisterSessions?.find(s =>
      s.status === 'Ouverte' &&
      s.openedBy === currentUser?.id &&
      s.showroom &&
      s.showroom.trim().toLowerCase() === userShowroom
    );

    if (!activeSession) {
      activeSession = cashRegisterSessions?.find(s => s.status === 'Ouverte' && s.openedBy === currentUser?.id);
    }

    if (!activeSession) {
      addNotification({
        title: 'Caisse fermée',
        message: 'Vous devez ouvrir votre propre session de caisse dans le module "Caisse" avant de pouvoir dupliquer un dossier SAV.',
        type: 'warning'
      });
      return;
    }

    const newId = `T-${Date.now().toString().slice(-6)}`;
    const duplicated: Ticket = {
      ...ticket,
      id: newId,
      status: 'Nouveau',
      createdAt: new Date().toISOString(),
      lastUpdate: new Date().toISOString(),
      interventionReport: undefined,
      quotation: undefined,
      financials: {
        partsTotal: 0,
        partsCost: 0,
        laborTotal: 0,
        laborCost: 0,
        travelFee: ticket.financials?.travelFee || 5000,
        logisticsCost: ticket.financials?.logisticsCost || 2000,
        discount: 0,
        grandTotal: ticket.financials?.grandTotal || 5000,
        netMargin: 0,
        isPaid: false,
        paymentDate: undefined,
        invoiceNumber: undefined,
        advancePayment: 0,
        advancePayments: [],
        remainingToPay: ticket.financials?.grandTotal || 5000
      },
      history: [{
        action: 'Duplication',
        user: currentUser?.name || 'Système',
        timestamp: new Date().toISOString(),
        details: `Copié depuis le dossier ${ticket.id}`
      }]
    };
    setEditingTicket(duplicated);
    setFormCustomerName(ticket.customerName || '');
    setFormCustomerPhone(ticket.customerPhone || '');
    setFormProductName(ticket.productName || '');
    setFormBrand(ticket.brand || 'LG');
    setIsModalOpen(true);
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Payé - Clôturé': return 'bg-[#f0fdf4] text-[#16a34a] border-[#dcfce7]';
      case 'En réparation': return 'bg-[#fffbeb] text-[#b45309] border-[#fef3c7]';
      case 'Terminé - Prêt à être payé': return 'bg-amber-50 text-amber-600 border-amber-200';
      case 'Nouveau': return 'bg-[#eff6ff] text-[#2563eb] border-[#dbeafe]';
      case 'Fermé': return 'bg-[#1c1c1c] text-white border-[#1c1c1c]';
      case 'En attente de devis': return 'bg-[#fff5f5] text-[#c53030] border-[#fed7d7]';
      case 'Devis envoyé': return 'bg-indigo-50 text-indigo-600 border-indigo-200';
      case 'En attente de paiement': return 'bg-amber-50 text-amber-600 border-amber-200';
      case 'En attente client': return 'bg-blue-50 text-blue-600 border-blue-200';
      default: return 'bg-[#f9fafb] text-[#4b5563] border-[#f3f4f6]';
    }
  };

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'Urgent': return 'text-red-500 bg-red-50 border-red-100';
      case 'Haute': return 'text-amber-600 bg-amber-50 border-amber-100';
      default: return 'text-blue-500 bg-blue-50 border-blue-100';
    }
  };

  if (!isMounted) return <div className="h-[80vh] flex items-center justify-center"><div className="animate-spin text-[#3ecf8e]" /></div>;

  return (
    <div className="max-w-7xl mx-auto space-y-5 animate-sb-entry pb-20">
      {isLoading ? (
        <SkeletonHeader />
      ) : (
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#3ecf8e]/10 rounded-xl flex items-center justify-center text-[#3ecf8e]">
              <TicketIcon size={18} />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
                {isTechnician ? 'Mes Dossiers SAV' : 'Dossiers SAV'}
              </h1>
              <p className="text-xs text-[#686868] font-semibold uppercase tracking-wider mt-0.5">
                {isTechnician ? 'Liste des interventions techniques qui vous sont affectées.' : 'Monitoring centralisé des interventions techniques Plaza.'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={refreshAll} className="btn-sb-outline h-9 px-2.5">
              <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
            </button>
            {canManage && (
              <button onClick={handleNewTicketClick} className="btn-sb-primary h-9 px-3">
                <Plus size={14} /> <span>Nouveau Dossier</span>
              </button>
            )}
          </div>
        </header>
      )}

      {/* MODULE TIPS */}
      <ModuleTips
        moduleName="Tickets & SAV"
        storageKey="tickets_sav"
        tips={[
          {
            id: 'tickets-1',
            title: 'Vue Liste vs Kanban',
            content: 'Utilisez la vue Kanban pour glisser-déposer les tickets entre les colonnes, ou la vue Liste pour un aperçu compact avec tous les détails.',
            target: 'Basculement de vue'
          },
          {
            id: 'tickets-2',
            title: 'Filtres intelligents',
            content: 'Combinez les filtres (statut, catégorie, priorité, tag) pour trouver rapidement les tickets. Les filtres actifs sont sauvegardés pour votre prochaine visite.',
            target: 'Section Filtres'
          },
          {
            id: 'tickets-3',
            title: 'Alertes SLA',
            content: 'Les tickets critiques (>72h) apparaissent en rouge. Traitez-les en priorité pour respecter les engagements de service.',
            target: 'KPI SLA Critique'
          },
          {
            id: 'tickets-4',
            title: 'Tags et fusion',
            content: 'Utilisez les tags pour organiser vos tickets. La fusion permet de regrouper les tickets liés au même client ou problème.',
            target: 'Gestion des tags'
          }
        ]}
      />

      {/* KPI DASHBOARD (MANAGER / ADMIN ONLY) */}
      {(currentUser?.role === 'MANAGER' || currentUser?.role === 'ADMIN') && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <SmallCard
            title="Tickets Actifs"
            value={tickets.filter((t: Ticket) => t.status !== 'Fermé').length}
            icon={<Activity size={14} />}
            color="#3ecf8e"
            tip="Nombre de tickets en cours de traitement"
          />
          <SmallCard
            title="SLA Critique"
            value={tickets.filter((t: Ticket) => t.status !== 'Fermé' && (new Date().getTime() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60) >= 72).length}
            icon={<AlertCircle size={14} />}
            color="#ef4444"
            tip="Tickets ouverts depuis plus de 72h - attention !"
          />
          <SmallCard
            title="Réouvertures"
            value={tickets.filter((t: Ticket) => t.isReopened).length}
            icon={<RefreshCw size={14} />}
            color="#f59e0b"
            tip="Tickets qui ont été rouverts après clôture"
          />
          <SmallCard
            title="Taux Devis"
            value={`${tickets.length > 0 ? Math.round((tickets.filter((t: Ticket) => t.quotation).length / tickets.length) * 100) : 0}%`}
            icon={<CheckCircle2 size={14} />}
            color="#3b82f6"
            tip="Pourcentage de tickets avec devis généré"
          />
        </div>
      )}

      {/* STATISTIQUES PAR STATUT */}
      <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 gap-1.5">
        {[
          { label: 'Nouveau', key: 'Nouveau', color: 'text-blue-600 bg-blue-50' },
          { label: 'En réparation', key: 'En réparation', color: 'text-purple-600 bg-purple-50' },
          { label: 'En attente', key: 'En attente de devis', color: 'text-amber-600 bg-amber-50' },
          { label: 'Devis envoyé', key: 'Devis envoyé', color: 'text-indigo-600 bg-indigo-50' },
          { label: 'À payer', key: 'Terminé - Prêt à être payé', color: 'text-orange-600 bg-orange-50' },
          { label: 'Payé', key: 'Payé - Clôturé', color: 'text-green-600 bg-green-50' },
          { label: 'Fermé', key: 'Fermé', color: 'text-gray-600 bg-gray-100' },
        ].map(({ label, key, color }) => {
          const count = tickets.filter((t: Ticket) => t.status === key).length;
          return (
            <button
              key={key}
              onClick={() => { setActiveTab('actifs'); setStatusFilter(key); }}
              className={`flex flex-col items-center justify-center p-2.5 rounded-lg border transition-all cursor-pointer bg-white shadow-sm ${statusFilter === key ? 'border-[#3ecf8e] ring-1 ring-[#3ecf8e]/30' : 'border-[#e5e5e5] hover:shadow-md'}`}
            >
              <span className={`text-lg font-bold leading-none ${color.split(' ')[0]}`}>{count}</span>
              <span className="text-[8px] font-semibold text-[#686868] uppercase mt-1 leading-tight text-center">{label}</span>
            </button>
          );
        })}
      </div>

      {/* ONGLETS TICKETS ACTIFS / CLÔTURÉS */}
      <div className="flex gap-1 border-b border-[#e5e5e5]">
        <button
          onClick={() => setActiveTab('actifs')}
          className={`px-3 py-2 text-[11px] font-semibold uppercase tracking-wide transition-all rounded-t-lg flex items-center gap-1.5 ${activeTab === 'actifs'
            ? 'text-[#3ecf8e] border-b-2 border-[#3ecf8e] bg-[#f0fdf4]'
            : 'text-[#686868] hover:text-[#1c1c1c] hover:bg-[#f8f9fa]'
            }`}
        >
          <Activity size={14} />
          Actifs
          <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-[#3ecf8e]/10 text-[#3ecf8e]">
            {tickets.filter((t: Ticket) => t.status !== 'Fermé').length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('clotures')}
          className={`px-3 py-2 text-[11px] font-semibold uppercase tracking-wide transition-all rounded-t-lg flex items-center gap-1.5 ${activeTab === 'clotures'
            ? 'text-[#1c1c1c] border-b-2 border-[#1c1c1c] bg-gray-100'
            : 'text-[#686868] hover:text-[#1c1c1c] hover:bg-[#f8f9fa]'
            }`}
        >
          <CheckCircle2 size={14} />
          Clôturés
          <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-gray-200 text-gray-600">
            {tickets.filter((t: Ticket) => t.status === 'Fermé').length}
          </span>
        </button>
      </div>

      <div className="space-y-3">
        {/* BARRE DE RECHERCHE ET FILTRES */}
        <div className="flex flex-col md:flex-row gap-2">
          <div className="relative flex-1 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af] group-focus-within:text-[#3ecf8e] transition-colors" size={14} />
            <input
              type="text"
              placeholder="Rechercher par ID, client, matériel ou S/N..."
              className="w-full pl-9 pr-3 h-9 rounded-lg border border-[#e5e5e5] text-xs focus:border-[#3ecf8e] focus:ring-2 focus:ring-[#3ecf8e]/20 transition-all"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`h-9 px-2.5 rounded-lg border text-xs font-semibold transition-all flex items-center gap-1.5 ${showFilters ? 'border-[#3ecf8e] text-[#3ecf8e] bg-[#f0fdf4]' : 'border-[#e5e5e5] text-[#686868] hover:border-[#d1d1d1]'}`}
            >
              <Filter size={12} />
              Filtres
              {(statusFilter !== 'Tous' || categoryFilter !== 'Tous' || priorityFilter !== 'Tous' || selectedTagFilter) && (
                <span className="w-2 h-2 rounded-full bg-[#3ecf8e]"></span>
              )}
            </button>
          </div>
        </div>

        {/* FILTRES AVANCÉS */}
        {showFilters && (
          <div className="bg-[#f8f9fa] rounded-lg border border-[#e5e5e5] p-3 animate-sb-entry">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-semibold text-[#686868] uppercase tracking-wide">Filtres actifs</span>
              <button
                onClick={() => { setStatusFilter('Tous'); setCategoryFilter('Tous'); setPriorityFilter('Tous'); setSelectedTagFilter(''); }}
                className="text-[11px] text-[#3ecf8e] hover:underline"
              >
                Réinitialiser
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-[#686868] uppercase">Statut</label>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full h-8 text-xs rounded-md border border-[#e5e5e5]">
                  <option value="Tous">Tous</option>
                  <option value="Nouveau">Nouveau</option>
                  <option value="En réparation">En réparation</option>
                  <option value="En attente de devis">En attente de devis</option>
                  <option value="Devis envoyé">Devis envoyé</option>
                  <option value="En attente de paiement">En attente de paiement</option>
                  <option value="En attente client">En attente client</option>
                  <option value="Terminé - Prêt à être payé">Terminé</option>
                  <option value="Payé - Clôturé">Payé</option>
                  <option value="Fermé">Fermé</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-[#686868] uppercase">Catégorie</label>
                <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="w-full h-8 text-xs rounded-md border border-[#e5e5e5]">
                  <option value="Tous">Toutes</option>
                  <option value="SAV">SAV</option>
                  <option value="Installation">Installation</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Livraison">Livraison</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-[#686868] uppercase">Priorité</label>
                <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} className="w-full h-8 text-xs rounded-md border border-[#e5e5e5]">
                  <option value="Tous">Toutes</option>
                  <option value="Urgent">Urgent</option>
                  <option value="Haute">Haute</option>
                  <option value="Moyenne">Moyenne</option>
                  <option value="Basse">Basse</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-[#686868] uppercase flex items-center gap-1">
                  <Tag size={8} /> Tag
                </label>
                <select value={selectedTagFilter} onChange={e => setSelectedTagFilter(e.target.value)} className="w-full h-8 text-xs rounded-md border border-[#e5e5e5]">
                  <option value="">Tous</option>
                  {(allTags || []).map((tag: TicketTag) => (
                    <option key={tag.id} value={tag.name}>{tag.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* VIEW MODE TOGGLE */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${viewMode === 'list' ? 'bg-[#3ecf8e] text-white' : 'bg-white border border-[#e5e5e5] text-[#686868]'}`}
          >
            <ListChecks size={12} /> Liste
          </button>
          <button
            onClick={() => setViewMode('kanban')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${viewMode === 'kanban' ? 'bg-[#3ecf8e] text-white' : 'bg-white border border-[#e5e5e5] text-[#686868]'}`}
          >
            <LayoutGrid size={12} /> Kanban
          </button>
        </div>
      </div>

      {/* LIST VIEW */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-lg border border-[#e5e5e5] shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-[#f8f9fa] border-b border-[#e5e5e5]">
              <tr>
                <th className="w-20 px-2 py-2 text-[11px] font-semibold text-[#686868] uppercase tracking-wide">ID</th>
                <th className="px-2 py-2 text-[11px] font-semibold text-[#686868] uppercase tracking-wide">Client & Site</th>
                <th className="px-2 py-2 text-[11px] font-semibold text-[#686868] uppercase tracking-wide">Produit</th>
                <th className="px-2 py-2 text-[11px] font-semibold text-[#686868] uppercase tracking-wide">Technicien</th>
                <th className="px-2 py-2 text-right text-[11px] font-semibold text-[#686868] uppercase tracking-wide">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f0f0]">
              {isLoading ? (
                [1, 2, 3].map((i) => <SkeletonRow key={i} />)
              ) : filtered.map((t: Ticket) => (
                <tr
                  key={t.id}
                  onClick={() => setSelectedTicket(t)}
                  className={`cursor-pointer group transition-all duration-200 hover:bg-[#f8f9fa] ${t.status === 'Fermé' ? 'bg-gray-50/50' : ''}`}
                >
                  <td className="px-2 py-2">
                    <span className="font-mono text-[11px] font-semibold text-[#3ecf8e] group-hover:scale-105 inline-block transition-transform">#{t.id}</span>
                  </td>
                  <td className="px-2 py-2">
                    <p className="text-[11px] font-semibold text-[#1c1c1c] group-hover:text-[#3ecf8e] transition-colors">{t.customerName}</p>
                    <p className="text-[11px] text-[#686868] flex items-center gap-1">
                      <MapPin size={9} className="text-[#9ca3af]" /> {t.showroom}
                    </p>
                  </td>
                  <td className="px-2 py-2">
                    <p className="text-[11px] font-semibold text-[#1c1c1c] truncate max-w-[140px]">{t.productName || t.category}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-semibold uppercase ${getPriorityStyle(t.priority)}`}>
                        {t.priority}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-semibold uppercase ${calculateSLALevel(t.createdAt, t.status).color}`}>
                        {calculateSLALevel(t.createdAt, t.status).label}
                      </span>
                      {t.serialNumber && <span className="text-[9px] font-mono text-[#9ca3af]">SN:{t.serialNumber.slice(-6)}</span>}
                    </div>
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-2">
                      <img
                        src={technicians.find((tec: Technician) => tec.id === t.assignedTechnicianId)?.avatar || "https://ui-avatars.com/api/?name=Unassigned"}
                        className="w-5 h-5 rounded-full border border-[#e5e5e5] object-cover group-hover:border-[#3ecf8e]/30 transition-colors"
                        alt=""
                      />
                      <span className="text-[10px] font-semibold text-[#4b5563]">
                        {technicians.find((tec: Technician) => tec.id === t.assignedTechnicianId)?.name.split(' ')[0] || "En attente"}
                      </span>
                    </div>
                  </td>
                  <td className="px-2 py-2 text-right">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wide ${getStatusStyle(t.status)}`}>
                      {t.status === 'Fermé' && <Lock size={9} className="inline mr-1" />}
                      {t.status === 'Terminé - Prêt à être payé' ? 'Terminé' : t.status === 'Payé - Clôturé' ? 'Payé' : t.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!isLoading && filtered.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-16 h-16 bg-[#f5f5f5] rounded-full flex items-center justify-center mx-auto mb-4">
                <TicketIcon size={24} className="text-[#9ca3af]" />
              </div>
              <p className="text-sm font-semibold text-[#686868]">Aucun dossier trouvé</p>
              <p className="text-xs text-[#9ca3af] mt-1">Essayez de modifier vos filtres</p>
            </div>
          ) : null}
        </div>
      )}

      {/* KANBAN VIEW */}
      {viewMode === 'kanban' && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={(event) => setActiveId(event.active.id as string)}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3 overflow-x-auto pb-4">
            {[
              { id: 'Nouveau', color: '#3ecf8e', icon: <Plus size={12} onClick={handleNewTicketClick} className="cursor-pointer" /> },
              { id: 'En attente de devis', color: '#f59e0b', icon: <FileText size={12} /> },
              { id: 'Devis envoyé', color: '#6366f1', icon: <Send size={12} /> },
              { id: 'En attente de paiement', color: '#f59e0b', icon: <Wallet size={12} /> },
              { id: 'En attente client', color: '#3b82f6', icon: <Pause size={12} /> },
              { id: 'En réparation', color: '#ea580c', icon: <Wrench size={12} /> },
              { id: 'Terminé - Prêt à être payé', color: '#8b5cf6', icon: <CheckCircle2 size={12} /> }
            ].map(({ id: status, color, icon }) => {
              const statusTickets = filtered.filter((t: Ticket) => t.status === status);
              return (
                <DroppableColumn key={status} status={status}>
                  <div className="flex items-center justify-between mb-2 pb-2 border-b border-[#e5e5e5]">
                    <div className="flex items-center gap-1.5">
                      <span style={{ color }}>{icon}</span>
                      <h3 className="text-[11px] font-semibold uppercase text-[#686868] tracking-wide">
                        {status === 'Terminé - Prêt à être payé' ? 'Terminé' : status}
                      </h3>
                    </div>
                    <span className="text-[10px] font-semibold text-[#1c1c1c] bg-white px-1.5 py-0.5 rounded-full border border-[#e5e5e5]">
                      {statusTickets.length}
                    </span>
                  </div>
                  <SortableContext items={statusTickets.map((t: Ticket) => t.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2 min-h-[80px]">
                      {statusTickets.map((t: Ticket) => (
                        <SortableTicketCard key={t.id} ticket={t} />
                      ))}
                      {statusTickets.length === 0 && (
                        <div className="p-2 text-center text-[10px] text-[#9ca3af] italic border border-dashed border-[#e5e5e5] rounded-lg bg-[#f8f9fa]/50">
                          Glisser les tickets ici
                        </div>
                      )}
                    </div>
                  </SortableContext>
                </DroppableColumn>
              );
            })}
          </div>
          <DragOverlay>
            {activeId ? (
              <div className="bg-white p-2 rounded-lg border border-[#3ecf8e] shadow-sm rotate-1 cursor-grabbing">
                {(() => {
                  const ticket = tickets.find((t: Ticket) => t.id === activeId);
                  if (!ticket) return null;
                  return (
                    <>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-mono font-semibold text-[#3ecf8e]">#{ticket.id}</span>
                        <span className={`px-1 py-0 rounded text-[7px] font-semibold uppercase ${getPriorityStyle(ticket.priority)}`}>
                          {ticket.priority}
                        </span>
                      </div>
                      <p className="text-[11px] font-semibold text-[#1c1c1c] truncate">{ticket.customerName}</p>
                      <p className="text-[9px] text-[#686868] truncate">{ticket.productName || ticket.category}</p>
                    </>
                  );
                })()}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      <Drawer
        isOpen={!!selectedTicket}
        onClose={() => setSelectedTicket(null)}
        title="Dossier SAV Plaza"
        subtitle={selectedTicket?.id ? `Réf. ${selectedTicket.id}` : undefined}
        icon={selectedTicket?.status === 'Fermé' ? <Lock size={14} /> : <TicketIcon size={14} />}
        variant="fullscreen"
        headerRight={selectedTicket && canManage ? (
          <div className="flex items-center gap-1.5">
            <button onClick={() => setSelectedTicketForTag(selectedTicket.id)} className="p-2 text-[#5f6368] hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="Tags"><Tags size={14} /></button>
            <button onClick={() => setIsMergeModalOpen(true)} className="p-2 text-[#5f6368] hover:text-purple-500 hover:bg-purple-50 rounded-lg transition-colors" title="Fusionner"><GitMerge size={14} /></button>
            <button onClick={() => handleDuplicateTicket(selectedTicket)} className="p-2 text-[#5f6368] hover:text-[#3ecf8e] hover:bg-[#f0fdf4] rounded-lg transition-colors" title="Dupliquer"><Copy size={14} /></button>
            <button onClick={() => handleExportPDF(selectedTicket)} className="p-2 text-[#5f6368] hover:text-[#3ecf8e] hover:bg-[#f0fdf4] rounded-lg transition-colors" title="Exporter PDF"><Printer size={14} /></button>
          </div>
        ) : undefined}
        footer={selectedTicket && selectedTicket.status !== 'Fermé' ? (
          <div className="flex items-center gap-3 w-full">
            {!isTechnician && (
              <button
                onClick={() => { setEditingTicket(selectedTicket); setIsModalOpen(true); }}
                className={`flex-1 min-w-0 btn-sb-outline h-10 justify-center font-semibold uppercase text-[11px] tracking-widest rounded-lg ${selectedTicket.status === 'Payé - Clôturé' ? 'opacity-40 cursor-not-allowed' : ''}`}
                disabled={selectedTicket.status === 'Payé - Clôturé'}
              >
                <Edit3 size={14} /> <span>Éditer</span>
              </button>
            )}
            {isTechnician && (
              (!selectedTicket.interventionReport?.equipmentStatus || ['Nouveau', 'En cours'].includes(selectedTicket.status)) && selectedTicket.status !== 'En réparation' && (
                <button
                  onClick={() => {
                    if (selectedTicket.quotation && selectedTicket.quotation.status !== 'Approved') {
                      addNotification({ title: 'Bloqué', message: 'Le client doit d\'abord accepter le devis.', type: 'warning' });
                      return;
                    }
                    setIsInterventionModalOpen(true);
                  }}
                  className="flex-1 min-w-0 btn-sb-primary h-10 justify-center font-semibold uppercase text-[11px] tracking-widest rounded-lg shadow-md shadow-[#3ecf8e]/20"
                >
                  <Wrench size={14} /> <span>Intervention</span>
                </button>
              )
            )}
            {(currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER' || currentUser?.role === 'AGENT') && selectedTicket.status === 'Terminé - Prêt à être payé' && !selectedTicket.financials?.isPaid && (
              <button
                onClick={handleConfirmPayment}
                disabled={isSaving}
                className="flex-1 min-w-0 btn-sb-primary h-10 justify-center font-semibold uppercase text-[11px] tracking-widest rounded-lg shadow-md shadow-amber-500/20 bg-amber-500 hover:bg-amber-600 border-amber-500"
              >
                {isSaving ? <RefreshCw className="animate-spin" size={14} /> : <><Wallet size={14} /> <span>Paiement</span></>}
              </button>
            )}
            {(currentUser?.role === 'AGENT') && selectedTicket.status === 'En attente de paiement' && !selectedTicket.financials?.isPaid && (
              <button
                onClick={handleConfirmPayment}
                disabled={isSaving}
                className="flex-1 min-w-0 btn-sb-primary h-10 justify-center font-semibold uppercase text-[11px] tracking-widest rounded-lg shadow-md shadow-amber-500/20 bg-amber-500 hover:bg-amber-600 border-amber-500"
              >
                {isSaving ? <RefreshCw className="animate-spin" size={14} /> : <><Wallet size={14} /> <span>Confirmer le paiement</span></>}
              </button>
            )}
            {(currentUser?.role === 'AGENT' || currentUser?.role === 'ADMIN') && (selectedTicket.status === 'En réparation' || selectedTicket.status === 'Payé - Clôturé' || selectedTicket.status === "En attente de devis" || (selectedTicket.status === 'Terminé - Prêt à être payé' && selectedTicket.financials?.isPaid)) && (
              <button
                onClick={() => handleCloseTicket(selectedTicket)}
                disabled={isSaving}
                className="flex-1 min-w-0 btn-sb-primary h-10 justify-center font-semibold uppercase text-[11px] tracking-widest rounded-lg shadow-md shadow-[#3ecf8e]/20 disabled:opacity-60"
              >
                {isSaving ? <RefreshCw className="animate-spin" size={14} /> : <><CheckCircle2 size={14} /> <span>Clôturer</span></>}
              </button>
            )}
            {isTechnician && selectedTicket.status === 'Payé - Clôturé' && selectedTicket.assignedTechnicianId === currentTech?.id && (
              <button
                onClick={handleSetEnReparation}
                disabled={isSaving}
                className="flex-1 min-w-0 h-10 justify-center font-semibold uppercase text-[11px] tracking-widest rounded-lg shadow-md shadow-blue-500/20 bg-blue-500 hover:bg-blue-600 border-blue-500 text-white btn-interactive flex items-center gap-2 px-4"
              >
                {isSaving ? <RefreshCw className="animate-spin" size={14} /> : <><Wrench size={14} /> <span>En réparation</span></>}
              </button>
            )}
          </div>
        ) : undefined}
      >
        {selectedTicket && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* ========== COLONNE GAUCHE : Fiche récap ========== */}
              <div className="lg:col-span-4 space-y-4">
                {/* Récapitulatif */}
                <div className="bg-white rounded-lg border border-[#e5e5e5] p-3 shadow-sm space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[10px] font-semibold text-[#686868] uppercase tracking-widest">Dossier SAV</p>
                      <h3 className="text-xl font-semibold text-[#1c1c1c]">#{selectedTicket.id}</h3>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider ${getStatusStyle(selectedTicket.status)}`}>
                        {selectedTicket.status}
                      </span>
                      {selectedTicket.priority === 'Urgent' && (
                        <span className="px-2 py-0.5 bg-red-100 text-red-600 rounded text-[9px] font-semibold uppercase">Urgent</span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2.5 bg-[#f8f9fa] rounded-lg">
                      <p className="text-[9px] font-semibold text-[#9ca3af] uppercase tracking-wider">Créé le</p>
                      <p className="text-[11px] font-semibold text-[#1c1c1c] mt-0.5">{new Date(selectedTicket.createdAt).toLocaleDateString('fr-FR')}</p>
                    </div>
                    <div className="p-2.5 bg-[#f8f9fa] rounded-lg">
                      <p className="text-[9px] font-semibold text-[#9ca3af] uppercase tracking-wider">Showroom</p>
                      <p className="text-[11px] font-semibold text-[#1c1c1c] mt-0.5">{selectedTicket.showroom}</p>
                    </div>
                    <div className="p-2.5 bg-[#f8f9fa] rounded-lg">
                      <p className="text-[9px] font-semibold text-[#9ca3af] uppercase tracking-wider">Canal</p>
                      <p className="text-[11px] font-semibold text-[#1c1c1c] mt-0.5">{selectedTicket.source}</p>
                    </div>
                    <div className="p-2.5 bg-[#f8f9fa] rounded-lg">
                      <p className="text-[9px] font-semibold text-[#9ca3af] uppercase tracking-wider">Catégorie</p>
                      <p className="text-[11px] font-semibold text-[#1c1c1c] mt-0.5">{selectedTicket.category}</p>
                    </div>
                  </div>

                  {selectedTicket.status === 'Fermé' && (
                    <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-100 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Lock size={12} className="text-amber-500 shrink-0" />
                        <p className="text-[10px] font-semibold text-amber-700">Dossier archivé en lecture seule</p>
                      </div>
                      {canManage && (
                        <button onClick={() => handleReopen(selectedTicket.id)} className="text-[10px] font-semibold text-amber-600 hover:text-amber-800 uppercase underline decoration-2 underline-offset-4 transition-all">
                          Réouvrir
                        </button>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-2">
                    {selectedTicket.interventionReport?.isWarrantyValid ? (
                      <span className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#f0fdf4] text-[#16a34a] rounded-lg text-[10px] font-semibold border border-[#dcfce7]">
                        <ShieldCheck size={10} /> Sous garantie
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 px-2.5 py-1.5 bg-red-50 text-red-500 rounded-lg text-[10px] font-semibold border border-red-100">
                        <ShieldAlert size={10} /> Hors garantie
                      </span>
                    )}
                  </div>
                </div>

                {/* Client */}
                <div className="bg-white rounded-lg border border-[#e5e5e5] p-3 shadow-sm space-y-2">
                  <h4 className="text-[11px] font-semibold text-[#686868] uppercase tracking-widest flex items-center gap-2">
                    <User size={12} className="text-[#3ecf8e]" /> Client
                  </h4>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#f0fdf4] flex items-center justify-center text-[#3ecf8e] font-semibold text-base">
                      {selectedTicket.customerName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-[#1c1c1c] truncate">{selectedTicket.customerName}</p>
                      <p className="text-[11px] text-[#686868] font-mono">{selectedTicket.customerPhone || 'N/A'}</p>
                    </div>
                  </div>
                  {selectedTicket.location && (
                    <div className="flex items-center gap-2 p-2.5 bg-[#f8f9fa] rounded-lg text-[12px] text-[#686868]">
                      <MapPin size={12} className="text-[#3ecf8e] shrink-0" />
                      {selectedTicket.location}
                    </div>
                  )}
                  {selectedTicket.interventionLocation && (
                    <div className="flex items-center gap-2 p-2.5 bg-[#f0fdf4] rounded-lg text-[12px] text-[#16a34a]">
                      <Wrench size={12} className="text-[#16a34a] shrink-0" />
                      Intervention : {selectedTicket.interventionLocation === 'chez le client' ? 'Chez le client' : 'À l\'atelier'}
                    </div>
                  )}
                </div>

                {/* Matériel */}
                <div className="bg-white rounded-lg border border-[#e5e5e5] p-3 shadow-sm space-y-2">
                  <h4 className="text-[11px] font-semibold text-[#686868] uppercase tracking-widest flex items-center gap-2">
                    <Package size={12} className="text-[#3ecf8e]" /> Matériel
                  </h4>
                  <div className="space-y-1">
                    <p className="text-[10px] text-[#3ecf8e] font-semibold uppercase">{selectedTicket.brand || 'Marque Standard'}</p>
                    <p className="text-[14px] font-semibold text-[#1c1c1c]">{selectedTicket.productName || selectedTicket.category}</p>
                    <p className="text-[11px] text-[#686868] font-mono font-semibold">S/N: {selectedTicket.serialNumber || 'Non répertorié'}</p>
                  </div>
                  <div className="p-3 bg-[#f8f9fa] rounded-lg">
                    <p className="text-[10px] font-semibold text-[#686868] uppercase mb-1">Symptôme rapporté</p>
                    <p className="text-[11px] text-[#4b5563] leading-relaxed italic">"{selectedTicket.description}"</p>
                  </div>
                </div>

                {/* Technicien */}
                {canManage && selectedTicket.status !== 'Fermé' && (
                  <div className="bg-white rounded-lg border border-[#e5e5e5] p-3 shadow-sm space-y-1.5">
                    <label className="text-[11px] font-semibold text-[#686868] uppercase tracking-widest flex items-center gap-2">
                      <Wrench size={10} className="text-[#3ecf8e]" /> Technicien
                    </label>
                    <select
                      value={selectedTicket.assignedTechnicianId || ''}
                      onChange={(e) => handleReassign(selectedTicket.id, e.target.value)}
                      className="w-full h-9 text-[11px] font-semibold rounded-lg border-[#e5e5e5] bg-[#fcfcfc] focus:bg-white transition-all shadow-sm"
                    >
                      <option value="">-- Non assigné --</option>
                      {technicians.map((t: Technician) => (
                        <option key={t.id} value={t.id}>{t.name} ({t.status})</option>
                      ))}
                    </select>
                  </div>
                )}

                {selectedTicket.interventionLocation === 'chez le client' && (
                  <div className="bg-white rounded-lg border border-[#e5e5e5] p-3 shadow-sm space-y-3">
                    <h4 className="text-[11px] font-semibold text-[#686868] uppercase tracking-widest flex items-center gap-2">
                      <Truck size={12} className="text-[#3ecf8e]" /> Planification Logistique
                    </h4>
                    <div className="space-y-2">
                      <select
                        value={selectedVehicleId}
                        onChange={(e) => setSelectedVehicleId(e.target.value)}
                        className="w-full h-9 text-[11px] font-semibold rounded-lg border-[#e5e5e5] bg-[#fcfcfc] focus:bg-white transition-all shadow-sm"
                      >
                        <option value="">-- Véhicule --</option>
                        {vehiclesList.filter((v: Vehicle) => v.status !== 'En maintenance').map((v: Vehicle) => (
                          <option key={v.id} value={v.id}>{v.model} ({v.plateNumber}) — {v.status}</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        placeholder="Chauffeur"
                        value={driverName}
                        onChange={(e) => setDriverName(e.target.value)}
                        className="w-full h-9 text-[11px] font-semibold rounded-lg border-[#e5e5e5] bg-[#fcfcfc] focus:bg-white transition-all shadow-sm px-3"
                      />
                      <input
                        type="text"
                        placeholder="Adresse de destination"
                        value={destinationAddress}
                        onChange={(e) => setDestinationAddress(e.target.value)}
                        className="w-full h-9 text-[11px] font-semibold rounded-lg border-[#e5e5e5] bg-[#fcfcfc] focus:bg-white transition-all shadow-sm px-3"
                      />
                      <div className="flex gap-2">
                        {(['Planifié', 'En cours', 'Terminé'] as const).map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setMissionStatus(s)}
                            className={`flex-1 h-7 text-[10px] font-semibold uppercase tracking-wider rounded-lg transition-all ${
                              missionStatus === s
                                ? s === 'Planifié' ? 'bg-[#f0fdf4] text-[#16a34a] border border-[#dcfce7]'
                                  : s === 'En cours' ? 'bg-amber-50 text-amber-600 border border-amber-200'
                                  : 'bg-gray-100 text-gray-600 border border-gray-200'
                                : 'bg-[#fcfcfc] text-[#9ca3af] border border-[#e5e5e5] hover:border-[#d1d1d1]'
                            }`}
                          >
                            {s === 'Planifié' ? 'Planifié' : s === 'En cours' ? 'En cours' : 'Terminé'}
                          </button>
                        ))}
                      </div>
                      <textarea
                        placeholder="Notes d'itinéraire (optionnel)"
                        value={missionNotes}
                        onChange={(e) => setMissionNotes(e.target.value)}
                        rows={2}
                        className="w-full text-[11px] font-semibold rounded-lg border-[#e5e5e5] bg-[#fcfcfc] focus:bg-white transition-all shadow-sm px-3 py-2 resize-none"
                      />
                      <button
                        onClick={handleSaveTransportMission}
                        disabled={isSavingMission || !selectedVehicleId || !driverName.trim()}
                        className="w-full h-9 flex items-center justify-center gap-2 text-[11px] font-semibold uppercase tracking-wider rounded-lg bg-[#1c1c1c] text-white hover:bg-[#333] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
                      >
                        {isSavingMission ? <RefreshCw size={12} className="animate-spin" /> : <Truck size={12} />}
                        {activeMission ? 'Mettre à jour' : 'Planifier la mission'}
                      </button>
                    </div>
                  </div>
                )}

              </div>

              {/* ========== COLONNE DROITE : Détails ========== */}
              <div className="lg:col-span-8 space-y-4">
                {/* Rapport d'Expertise */}
                {selectedTicket.interventionReport?.equipmentStatus && (
                  <div className="bg-white rounded-lg border border-[#e5e5e5] p-3 shadow-sm">
                    <div className="flex items-center gap-3 mb-3 pb-3 border-b border-[#f5f5f5]">
                      <div className="w-10 h-10 rounded-lg bg-[#f0fdf4] flex items-center justify-center">
                        <CheckCircle2 size={14} className="text-[#3ecf8e]" />
                      </div>
                      <div>
                        <h4 className="text-[13px] font-semibold text-[#1c1c1c]">Rapport d'expertise</h4>
                        <p className="text-[10px] text-[#686868]">
                          Intervenant : {technicians.find((t: Technician) => t.id === selectedTicket.assignedTechnicianId)?.name || 'Non assigné'}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* État final */}
                      <div className="p-4 bg-[#f0fdf4] rounded-lg border border-[#dcfce7] md:col-span-2">
                        <p className="text-[10px] font-semibold text-[#16a34a] uppercase tracking-wider mb-1">État final du matériel</p>
                        <p className="text-[16px] font-semibold text-[#1c1c1c]">{selectedTicket.interventionReport.equipmentStatus}</p>
                      </div>

                      {/* Diagnostic */}
                      {selectedTicket.interventionReport.detailedDiagnostic && (
                        <div className="p-4 bg-[#f8f9fa] rounded-lg">
                          <p className="text-[10px] font-semibold text-[#686868] uppercase tracking-wider mb-2 flex items-center gap-2">
                            <Info size={10} /> Diagnostic
                          </p>
                          <p className="text-[11px] text-[#4b5563] leading-relaxed">{selectedTicket.interventionReport.detailedDiagnostic}</p>
                        </div>
                      )}

                      {/* Travaux */}
                      {selectedTicket.interventionReport.repairProcedure && (
                        <div className="p-4 bg-[#f8f9fa] rounded-lg">
                          <p className="text-[10px] font-semibold text-[#686868] uppercase tracking-wider mb-2 flex items-center gap-2">
                            <Wrench size={10} /> Travaux effectués
                          </p>
                          <p className="text-[11px] text-[#4b5563] leading-relaxed">{selectedTicket.interventionReport.repairProcedure}</p>
                        </div>
                      )}

                      {/* Actions */}
                      {selectedTicket.interventionReport.actionsTaken && selectedTicket.interventionReport.actionsTaken.length > 0 && (
                        <div className="p-4 bg-[#f8f9fa] rounded-lg md:col-span-2">
                          <p className="text-[10px] font-semibold text-[#686868] uppercase tracking-wider mb-2">Actions menées</p>
                          <div className="flex flex-wrap gap-2">
                            {selectedTicket.interventionReport.actionsTaken.map((a: string, idx: number) => (
                              <span key={idx} className="px-3 py-1.5 bg-white text-[12px] font-semibold text-[#1c1c1c] rounded-lg border border-[#e5e5e5] shadow-sm flex items-center gap-1.5">
                                <CheckCircle2 size={10} className="text-[#3ecf8e]" /> {a}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Pièces */}
                      {selectedTicket.interventionReport.partsUsed && selectedTicket.interventionReport.partsUsed.length > 0 && (
                        <div className="p-4 bg-[#f8f9fa] rounded-lg md:col-span-2">
                          <p className="text-[10px] font-semibold text-[#686868] uppercase tracking-wider mb-2">Pièces consommées</p>
                          <div className="flex flex-wrap gap-2">
                            {selectedTicket.interventionReport.partsUsed.map((p: UsedPart, idx: number) => (
                              <span key={idx} className="px-3 py-1.5 bg-white text-[12px] font-semibold text-[#1c1c1c] rounded-lg border border-[#e5e5e5] flex items-center gap-2">
                                <Package size={10} className="text-[#3ecf8e]" />
                                {p.name}
                                <span className="text-[10px] text-[#9ca3af] font-mono">x{p.quantity}</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Préconisations */}
                      {selectedTicket.interventionReport.recommendations && (
                        <div className="p-4 bg-[#f8f9fa] rounded-lg md:col-span-2">
                          <p className="text-[10px] font-semibold text-[#686868] uppercase tracking-wider mb-2">Préconisations</p>
                          <p className="text-[11px] text-[#4b5563] leading-relaxed">{selectedTicket.interventionReport.recommendations}</p>
                        </div>
                      )}
                    </div>

                    {/* Photos */}
                    {selectedTicket.interventionReport.photos && selectedTicket.interventionReport.photos.length > 0 && (
                      <div className="mt-5 pt-5 border-t border-[#f5f5f5]">
                        <p className="text-[10px] font-semibold text-[#686868] uppercase tracking-wider mb-3">Photos d'intervention</p>
                        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                          {selectedTicket.interventionReport.photos.map((photo: { url: string; type: string; caption?: string }, idx: number) => (
                            <div key={idx} className="relative group aspect-square overflow-hidden rounded-lg border border-[#e5e5e5] bg-white cursor-pointer">
                              <img src={photo.url} alt={photo.type} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                                <p className="text-[9px] font-semibold text-white uppercase tracking-tighter">{photo.type}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Notes internes */}
                    {canManage && selectedTicket.interventionReport.internalNotes && (
                      <div className="mt-5 p-4 bg-red-50 border border-red-100 rounded-lg space-y-2">
                        <div className="flex items-center gap-2 text-red-500">
                          <Lock size={12} />
                          <p className="text-[10px] font-semibold uppercase tracking-widest">Notes de service internes</p>
                        </div>
                        <p className="text-[11px] text-red-700 leading-relaxed italic">{selectedTicket.interventionReport.internalNotes}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Cotation & Facturation */}
                {(canManage && (selectedTicket.status === "En attente de devis" || selectedTicket.quotation)) && (
                  <div className="bg-white rounded-lg border border-[#e5e5e5] p-3 shadow-sm">
                    <div className="flex items-center justify-between mb-3 pb-3 border-b border-[#f5f5f5]">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                          <FileText size={14} className="text-amber-500" />
                        </div>
                        <div>
                          <h4 className="text-[13px] font-semibold text-[#1c1c1c]">Cotation & Facturation</h4>
                          <p className="text-[10px] text-[#686868]">
                            {selectedTicket.quotation?.status === 'Approved' ? 'Devis validé & facturé' : 'Devis en attente de validation'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {selectedTicket.financials?.invoiceNumber && (
                          <>
                            <button onClick={handlePrintInvoice} className="flex items-center gap-1.5 px-3 h-9 bg-white border border-[#e5e5e5] rounded-lg text-[11px] font-semibold text-[#686868] hover:text-[#1c1c1c] hover:border-[#1c1c1c] transition-all" title="Imprimer la facture">
                              <Printer size={14} /> Imprimer
                            </button>
                            <button onClick={handleGenerateInvoicePDF} className="flex items-center gap-1.5 px-3 h-9 bg-white border border-[#e5e5e5] rounded-lg text-[11px] font-semibold text-[#686868] hover:text-[#3ecf8e] hover:border-[#3ecf8e]/30 hover:bg-[#f0fdf4] transition-all" title="Télécharger la facture PDF">
                              <FileText size={14} /> PDF
                            </button>
                          </>
                        )}
                        <button onClick={() => { setIsCotationModalOpen(true); setManualDiscount(selectedTicket?.financials?.discount || 0); }} className="btn-sb-outline h-9 px-4 text-[11px] font-semibold uppercase tracking-widest">
                          Ouvrir cotation
                        </button>
                      </div>
                    </div>

                    {/* Résumé financier */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                      <div className="p-3 bg-[#f8f9fa] rounded-lg text-center">
                        <p className="text-[9px] font-semibold text-[#9ca3af] uppercase tracking-wider">Pièces</p>
                        <p className="text-[12px] font-semibold text-[#1c1c1c] mt-1">
                          {(selectedTicket.interventionReport?.partsUsed?.reduce((s: number, p: UsedPart) => s + (Number(p.quantity) * Number(p.unitPrice)), 0) || 0).toLocaleString()} FCFA
                        </p>
                      </div>
                      <div className="p-3 bg-[#f8f9fa] rounded-lg text-center">
                        <p className="text-[9px] font-semibold text-[#9ca3af] uppercase tracking-wider">Main d'œuvre</p>
                        <p className="text-[12px] font-semibold text-[#1c1c1c] mt-1">
                          {(selectedTicket.quotation?.prestations?.reduce((s: number, p: Prestation) => s + Number(p.fixedCost), 0) || 0).toLocaleString()} FCFA
                        </p>
                      </div>
                      <div className="p-3 bg-red-50 rounded-lg text-center">
                        <p className="text-[9px] font-semibold text-red-400 uppercase tracking-wider">Remise</p>
                        <p className="text-[12px] font-semibold text-red-500 mt-1">
                          -{(selectedTicket.financials?.discount || 0).toLocaleString()} FCFA
                        </p>
                      </div>
                      <div className="p-3 bg-[#1c1c1c] rounded-lg text-center">
                        <p className="text-[9px] font-semibold text-white/60 uppercase tracking-wider">Total</p>
                        <p className="text-[12px] font-semibold text-white mt-1">
                          {(selectedTicket.quotation?.totalAmount || 0).toLocaleString()} FCFA
                        </p>
                      </div>
                    </div>

                    {selectedTicket.financials?.invoiceNumber && (
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-[10px] font-mono font-semibold text-[#3ecf8e] bg-[#f0fdf4] px-2 py-1 rounded-lg border border-[#dcfce7]">
                          Facture N° {selectedTicket.financials.invoiceNumber}
                        </span>
                      </div>
                    )}

                    {(selectedTicket.financials?.advancePayments || []).length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[10px] font-semibold text-[#686868] uppercase tracking-wider">Acomptes versés</p>
                        {selectedTicket.financials?.advancePayments?.map((p: { amount: number; method: string; date: string }, idx: number) => (
                          <div key={idx} className="flex justify-between items-center text-[11px] bg-emerald-50/50 p-2 rounded-lg border border-emerald-100/50">
                            <span className="font-semibold text-emerald-700 flex items-center gap-1.5">
                              <Wallet size={10} /> {p.amount.toLocaleString()} FCFA
                            </span>
                            <span className="text-[#686868] font-mono">{p.method} • {new Date(p.date).toLocaleDateString('fr-FR')}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Historique d'activité */}
                <div className="bg-white rounded-lg border border-[#e5e5e5] p-3 shadow-sm">
                  <TicketHistory history={selectedTicket.history || []} />
                </div>
              </div>
            </div>
          </div>
        )}
      </Drawer>
      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setCurrentStep(1); }} title={editingTicket ? "Édition du Dossier SAV" : "Création d'un Dossier SAV"}>
        <form ref={formRef} onSubmit={handleSaveTicket} className="space-y-4">
          <div className="flex items-center justify-between mb-6 pb-3 border-b border-[#e5e5e5]">
            <div className={`flex flex-col items-center gap-2 ${currentStep >= 1 ? 'opacity-100' : 'opacity-40'}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center font-semibold text-[11px] border-2 ${currentStep >= 1 ? 'bg-[#3ecf8e] border-[#3ecf8e] text-white' : 'bg-transparent border-[#e5e5e5] text-[#686868]'} transition-all`}>1</div>
              <span className="text-[9px] font-semibold uppercase tracking-widest text-[#1c1c1c] text-center">Identification<br />Client</span>
            </div>
            <div className={`h-0.5 flex-1 mx-4 ${currentStep >= 2 ? 'bg-[#3ecf8e]' : 'bg-[#e5e5e5]'} transition-all`} />
            <div className={`flex flex-col items-center gap-2 ${currentStep >= 2 ? 'opacity-100' : 'opacity-40'}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center font-semibold text-[11px] border-2 ${currentStep >= 2 ? 'bg-[#3ecf8e] border-[#3ecf8e] text-white' : 'bg-transparent border-[#e5e5e5] text-[#686868]'} transition-all`}>2</div>
              <span className="text-[9px] font-semibold uppercase tracking-widest text-[#1c1c1c] text-center">Matériel &<br />Garantie</span>
            </div>
            <div className={`h-0.5 flex-1 mx-4 ${currentStep >= 3 ? 'bg-[#3ecf8e]' : 'bg-[#e5e5e5]'} transition-all`} />
            <div className={`flex flex-col items-center gap-2 ${currentStep >= 3 ? 'opacity-100' : 'opacity-40'}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center font-semibold text-[11px] border-2 ${currentStep >= 3 ? 'bg-[#3ecf8e] border-[#3ecf8e] text-white' : 'bg-transparent border-[#e5e5e5] text-[#686868]'} transition-all`}>3</div>
              <span className="text-[9px] font-semibold uppercase tracking-widest text-[#1c1c1c] text-center">Plaintes &<br />Affectation</span>
            </div>
          </div>

          <div className="space-y-4">
            <div className={currentStep === 1 ? 'block' : 'hidden'}>
              <div className="space-y-4 animate-sb-entry pb-4">
                <h5 className="text-[10px] font-semibold text-[#1c1c1c] uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Search size={12} className="text-[#3ecf8e]" /> Recherche Facture & Garantie
                </h5>
                <div className="space-y-1.5 p-3 bg-[#f8f9fa] rounded-lg border border-[#e5e5e5]">
                  <label className="text-[10px] font-semibold text-[#686868] uppercase tracking-widest">N° de Facture Client (Optionnel)</label>
                  <input type="text" value={searchInvoice} onChange={e => setSearchInvoice(e.target.value)} placeholder="Ex: INV-12345" className="w-full text-xs h-9 px-3 shadow-sm border border-[#e5e5e5] rounded-lg" disabled={editingTicket?.status === 'Fermé'} />
                  <p className="text-[10px] text-[#686868]">Recherche automatique des informations client et garantie associées.</p>
                </div>

                <h5 className="text-[10px] font-semibold text-[#1c1c1c] uppercase tracking-widest mb-3 mt-4 flex items-center gap-2">
                  <User size={12} className="text-[#3ecf8e]" /> Identity Check
                </h5>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-[#686868] uppercase tracking-widest">Nom Complet / Entreprise</label>
                  <input name="customerName" type="text" value={formCustomerName} onChange={e => setFormCustomerName(e.target.value)} required className="w-full text-sm h-10 px-3 shadow-sm border border-[#e5e5e5] rounded-lg focus:border-[#3ecf8e]" disabled={editingTicket?.status === 'Fermé'} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-[#686868] uppercase tracking-widest">Numéro de Téléphone</label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-[#686868] text-xs font-semibold">+241</span>
                    <input name="customerPhone" type="tel" value={formCustomerPhone} onChange={e => setFormCustomerPhone(e.target.value)} required className="w-full text-sm h-10 pl-12 pr-3 shadow-sm border border-[#e5e5e5] rounded-lg" disabled={editingTicket?.status === 'Fermé'} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-[#686868] uppercase tracking-widest">Lieu de résidence</label>
                  <input name="location" type="text" defaultValue={editingTicket?.location} className="w-full text-sm h-10 px-3 shadow-sm border border-[#e5e5e5] rounded-lg" placeholder="ex: Libreville, Akanda..." disabled={editingTicket?.status === 'Fermé'} />
                </div>

              </div>
            </div>

            <div className={currentStep === 2 ? 'block' : 'hidden'}>
              <div className="space-y-4 animate-sb-entry pb-6">
                <h5 className="text-[10px] font-semibold text-[#1c1c1c] uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Package size={12} className="text-[#3ecf8e]" /> Enregistrement du Produit
                </h5>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-[#686868] uppercase tracking-widest">Catégorie Technique</label>
                  <select name="category" defaultValue={editingTicket?.category || 'Appareil Électroménager'} className="w-full h-10 rounded-lg text-xs font-semibold bg-[#fcfcfc] border-[#e5e5e5]" disabled={editingTicket?.status === 'Fermé'}>
                    <option value="Appareil Électroménager">Gros Électroménager</option>
                    <option value="Climatisation">Climatisation (Froid)</option>
                    <option value="Électronique">Électronique & TV</option>
                    <option value="Petit Électroménager">Petit Électroménager</option>
                  </select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-[#686868] uppercase tracking-widest">Modèle Matériel</label>
                    <datalist id="products-list">
                      {(products || []).map((p: Product) => <option key={p.id} value={p.name} />)}
                    </datalist>
                    <input
                      name="productName"
                      list="products-list"
                      type="text"
                      value={formProductName}
                      onChange={e => setFormProductName(e.target.value)}
                      placeholder="Saisir nom ou référence"
                      className="w-full h-10 rounded-lg text-xs shadow-sm border-[#e5e5e5]"
                      disabled={editingTicket?.status === 'Fermé'}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-[#686868] uppercase tracking-widest">Marque Certifiée</label>
                    <select name="brand" value={formBrand} onChange={e => setFormBrand(e.target.value)} className="w-full h-10 rounded-lg text-xs font-semibold bg-[#fcfcfc] border-[#e5e5e5]" disabled={editingTicket?.status === 'Fermé'}>
                      {(brands || []).map((b: string) => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-[#686868] uppercase tracking-widest flex items-center justify-between">
                    Numéro de Série (S/N)
                    {detectedWarranty && (
                      <span className="flex items-center gap-1 text-[9px] text-[#16a34a] font-semibold uppercase">
                        <ShieldCheck size={10} /> Validé
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    <input name="serialNumber" type="text" value={formSN} onChange={e => setFormSN(e.target.value)} placeholder="Vérification dans le registre..." required disabled={editingTicket?.status === 'Fermé'} className={`w-full font-mono font-semibold tracking-tight pr-10 h-10 rounded-lg border-[#e5e5e5] shadow-sm ${detectedWarranty ? 'border-[#16a34a] bg-[#f0fdf4]/50 text-[#16a34a]' : ''}`} />
                    <div className="absolute right-3 top-3">
                      {detectedWarranty ? <ShieldCheck size={14} className="text-[#16a34a] animate-pulse" /> : <Search size={14} className="text-[#686868]" />}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-[#686868] uppercase tracking-widest">Date d'achat (Approximative)</label>
                    <input
                      name="purchaseDate"
                      type="date"
                      value={formPurchaseDate}
                      onChange={e => setFormPurchaseDate(e.target.value)}
                      className="w-full h-10 rounded-lg text-xs border-[#e5e5e5]"
                      disabled={editingTicket?.status === 'Fermé'}
                    />
                  </div>
                  <div className="space-y-1.5 flex flex-col justify-end">
                    {detectedProduct && (
                      <div className="p-3 bg-[#f8f9fa] border border-dashed border-[#e5e5e5] rounded-lg flex items-center gap-2">
                        <BadgeCheck size={12} className="text-[#3ecf8e]" />
                        <p className="text-[10px] font-semibold text-[#686868] uppercase">Garantie catalogue : {detectedProduct.warrantyMonths} mois</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-4 border-t border-[#f5f5f5]">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input type="checkbox" checked={manualWarranty} onChange={e => setManualWarranty(e.target.checked)} disabled={editingTicket?.status === 'Fermé'} className="w-5 h-5 rounded border-[#e5e5e5] text-[#3ecf8e] focus:ring-[#3ecf8e]" />
                    <span className={`text-[11px] font-semibold uppercase tracking-widest ${manualWarranty ? 'text-[#16a34a]' : 'text-[#686868]'}`}>
                      {manualWarranty ? "Garantie Validée 🛡️" : "Appareil Hors Garantie"}
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input name="isEquipmentDown" type="checkbox" defaultChecked={editingTicket?.isEquipmentDown} disabled={editingTicket?.status === 'Fermé'} className="w-5 h-5 rounded border-red-200 text-red-500 focus:ring-red-500" />
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-[#1c1c1c] flex items-center gap-1">
                      <AlertTriangle size={12} className="text-red-500" /> Panne Bloquante (Machine à l'arrêt)
                    </span>
                  </label>
                </div>

                {/* Champ numéro de facture pour garantie */}
                {manualWarranty && (
                  <div className="space-y-1.5 pt-2 animate-sb-entry">
                    <label className="text-[10px] font-semibold text-[#686868] uppercase tracking-widest flex items-center gap-2">
                      <FileText size={10} className="text-[#3ecf8e]" /> Numéro de Facture d'Achat
                    </label>
                    <input
                      type="text"
                      value={formWarrantyInvoiceNumber}
                      onChange={e => setFormWarrantyInvoiceNumber(e.target.value)}
                      placeholder="Ex: FACT-2024-001234"
                      className="w-full h-9 rounded-lg font-mono text-xs border-[#e5e5e5] bg-[#f0fdf4]/30"
                      disabled={editingTicket?.status === 'Fermé'}
                    />
                    <p className="text-[10px] text-[#686868]">Facultatif - Pour traçabilité de la garantie</p>
                  </div>
                )}
              </div>
            </div>

            <div className={currentStep === 3 ? 'block' : 'hidden'}>
              <div className="space-y-4 animate-sb-entry pb-6">
                <h5 className="text-[10px] font-semibold text-[#1c1c1c] uppercase tracking-widest mb-3 flex items-center gap-2">
                  <CheckCircle2 size={12} className="text-[#3ecf8e]" /> Prise en charge & Diagnostic Manuel
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-[#686868] uppercase tracking-widest">Niveau d'Urgence</label>
                    <select name="priority" defaultValue={editingTicket?.priority || 'Moyenne'} className="w-full text-xs font-semibold h-10 rounded-lg bg-[#fcfcfc] border-[#e5e5e5]" disabled={editingTicket?.status === 'Fermé'}>
                      <option value="Basse">Normale / Basse</option>
                      <option value="Moyenne">Moyenne (Standard)</option>
                      <option value="Haute">Haute (Critique)</option>
                      <option value="Urgent">URGENT (VIP)</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-[#686868] uppercase tracking-widest">Canal d'Entrée</label>
                    <select name="source" defaultValue={editingTicket?.source || 'Interne'} className="w-full text-xs h-10 rounded-lg bg-[#fcfcfc] border-[#e5e5e5]" disabled={editingTicket?.status === 'Fermé'}>
                      <option value="WhatsApp">Ligne WhatsApp Support</option>
                      <option value="Messenger">Messenger Plaza</option>
                      <option value="Email">Support central Email</option>
                      <option value="Phone">Appel Téléphonique</option>
                      <option value="Interne">Au Guichet SAV</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-[#686868] uppercase tracking-widest">Plaza Showroom de rattachement</label>
                    <select name="showroom" defaultValue={editingTicket?.showroom || currentUser?.showroom || 'Glass'} className="w-full text-xs h-10 rounded-lg bg-[#fcfcfc] border-[#e5e5e5]" disabled={editingTicket?.status === 'Fermé'}>
                      {(showrooms || []).map((s: ShowroomConfig) => <option key={s.id} value={s.id}>{s.id}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-[#686868] uppercase tracking-widest">Sévérité sur le Client</label>
                    <select name="clientImpact" defaultValue={editingTicket?.clientImpact || 'Faible'} className="w-full text-xs h-10 rounded-lg bg-[#fcfcfc] border-[#e5e5e5]" disabled={editingTicket?.status === 'Fermé'}>
                      <option value="Faible">Faible / Gêne mineure</option>
                      <option value="Modéré">Dispositif partiellement utilisable</option>
                      <option value="Critique">Arrêt total de service</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5 p-3 bg-[#f8f9fa] rounded-lg border border-[#e5e5e5] shadow-inner mt-3">
                  <label className="text-[10px] font-semibold text-[#1c1c1c] uppercase tracking-widest flex justify-between">
                    Technicien Technique
                    <span className="text-[#3ecf8e]">Mode Dispatching Auto activé</span>
                  </label>
                  <p className="text-[11px] text-[#686868] mb-1.5">Laissez vide pour affecter le technicien automatiquement en fonction de la charge de travail de votre showroom.</p>
                  <select
                    name="technicianId"
                    defaultValue={editingTicket?.assignedTechnicianId}
                    className="w-full text-xs font-semibold bg-white h-10 rounded-lg shadow-sm border-[#e5e5e5]"
                    disabled={editingTicket?.status === 'Fermé'}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        e.stopPropagation();
                      }
                    }}
                  >
                    <option value="">-- Affectation Automatique par le système --</option>
                    {(technicians || []).map((tec: Technician) => <option key={tec.id} value={tec.id}>{tec.name} ({tec.status})</option>)}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-[#686868] uppercase tracking-widest">Lieu de l'intervention</label>
                  <select name="interventionLocation" defaultValue={editingTicket?.interventionLocation || 'à l\'atelier'} className="w-full text-xs font-semibold h-10 rounded-lg bg-[#fcfcfc] border-[#e5e5e5]" disabled={editingTicket?.status === 'Fermé'}>
                    <option value="chez le client">Chez le client</option>
                    <option value="à l'atelier">À l'atelier</option>
                  </select>
                </div>

                <div className="space-y-1.5 pt-4">
                  <label className="text-[10px] font-semibold text-[#686868] uppercase tracking-widest">Symptômes rapportés par le client</label>
                  <textarea name="description" rows={2} defaultValue={editingTicket?.description} placeholder="Ex: Le code compresseur affiche E02 et s'éteint après 5 minutes..." required className="w-full rounded-lg border-[#e5e5e5] shadow-sm p-3 text-xs" disabled={editingTicket?.status === 'Fermé'} />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-[#f5f5f5]">
            <div className="flex gap-2">
              {currentStep > 1 && (
                <button type="button" onClick={() => setCurrentStep(prev => prev - 1)} className="btn-sb-outline h-9 px-6 text-[11px] font-semibold uppercase rounded-lg border-[#e5e5e5] shadow-sm">Précédent</button>
              )}
            </div>
            <div className="flex gap-2">
              {currentStep < 3 ? (
                <button
                  type="button"
                  onClick={() => {
                    if (currentStep === 1) {
                      if (!formCustomerName.trim() || !formCustomerPhone.trim()) {
                        addNotification({ title: 'Champs requis', message: 'Veuillez renseigner le nom et le téléphone du client.', type: 'warning' });
                        return;
                      }
                    }
                    if (currentStep === 2) {
                      if (!formProductName.trim() || !formSN.trim()) {
                        addNotification({ title: 'Champs requis', message: 'Veuillez renseigner le modèle et le numéro de série.', type: 'warning' });
                        return;
                      }
                    }
                    setCurrentStep(prev => prev + 1);
                  }}
                  className="bg-[#1c1c1c] text-white hover:bg-black h-9 px-8 text-[11px] font-semibold uppercase rounded-lg flex items-center justify-center shadow-md transition-all"
                >
                  Suivant <ArrowRight size={14} className="ml-2" />
                </button>
              ) : (
                <>
                  {editingTicket?.status !== 'Fermé' && (
                    <button
                      type="button"
                      onClick={() => handleSaveTicket()}
                      disabled={isSaving}
                      className="btn-sb-primary h-9 px-10 text-[11px] font-semibold uppercase rounded-lg shadow-md shadow-[#3ecf8e]/20 hover:scale-105 transition-transform"
                    >
                      {isSaving ? <RefreshCw className="animate-spin" size={14} /> : (editingTicket ? 'Enregistrer Dossier' : 'Lancer le Diagnostic')}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isCotationModalOpen}
        onClose={() => { setIsCotationModalOpen(false); }}
        title="Cotation et Facturation"
        size="lg"
      >
        <div className="space-y-4 print:p-4 modal-content-to-print">
          {/* Header Impression (Visible uniquement à l'impression) */}
          <div className="hidden print:block border-b-2 border-gray-900 pb-4 mb-4">
            <div className="flex justify-between items-start">
              <div className="flex items-start gap-4">
                <div className="w-20 h-20 bg-gray-50 rounded-lg flex items-center justify-center overflow-hidden border border-gray-100">
                  <img src={docLogo} className="w-full h-full object-contain" alt="Logo" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold uppercase text-gray-900" style={{ color: docPrimaryColor }}>HELP DESK ROYAL PLAZA</h1>
                  <p className="text-sm font-semibold text-gray-600">Service Après-Vente & Maintenance</p>
                  <div className="mt-4 text-[11px] font-semibold text-gray-500 whitespace-pre-line leading-tight">
                    {replaceVariables(activeTemplate?.headerContent || '')}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <h2 className="text-xl font-semibold text-gray-900">
                  {selectedTicket?.quotation?.status === 'Approved' ? `FACTURE #${selectedTicket?.financials?.invoiceNumber}` : `DEVIS PRO-FORMA #${selectedTicket?.id}`}
                </h2>
                <p className="text-xs font-semibold text-gray-600 mt-1">Date : {new Date().toLocaleDateString('fr-FR')}</p>
              </div>
            </div>
          </div>

          {/* Badge de Statut du Devis (Caché à l'impression) */}
          <div className="flex justify-between items-center print:hidden">
            <div className="flex items-center gap-2">
              <FileText size={14} className="text-[#3ecf8e]" />
              <h3 className="text-xs font-semibold uppercase tracking-widest text-[#1c1c1c]">Dossier Commercial #{selectedTicket?.id}</h3>
            </div>
            <span className={`px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-tighter ${selectedTicket?.quotation?.status === 'Approved' ? 'bg-green-100 text-green-700' :
              selectedTicket?.quotation?.status === 'Sent' ? 'bg-blue-100 text-blue-700' :
                'bg-gray-100 text-gray-700'
              }`}>
              Devis : {selectedTicket?.quotation?.status || 'Brouillon'}
            </span>
          </div>

          <div className="p-3 bg-white border border-[#e5e5e5] rounded-lg space-y-3 shadow-sm relative overflow-hidden">
            {/* Watermark for Pro-forma */}
            {selectedTicket?.quotation?.status !== 'Approved' && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] rotate-[-35deg] select-none">
                <span className="text-[121px] font-semibold">PRO-FORMA</span>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-[10px] font-semibold text-[#686868] uppercase flex items-center gap-2"><Package size={10} /> Pièces consommées (Rapport Technique)</p>
              {selectedTicket?.interventionReport?.partsUsed?.map((p: UsedPart, idx: number) => (
                <div key={idx} className="flex justify-between items-center text-[11px] bg-[#f8f9fa] border border-dashed border-[#e5e5e5] p-2 rounded-lg">
                  <span className="font-semibold">{p.name} <span className="text-[#686868] font-normal">x{p.quantity}</span></span>
                  <span className="font-mono font-semibold">{(Number(p.quantity) * Number(p.unitPrice)).toLocaleString()} FCFA</span>
                </div>
              ))}
              {(!selectedTicket?.interventionReport?.partsUsed || selectedTicket?.interventionReport.partsUsed.length === 0) && (
                <p className="text-[11px] italic text-[#686868] bg-[#f8f9fa] p-2 rounded-lg border border-[#e5e5e5]">Aucune pièce n'a été utilisée lors de l'intervention.</p>
              )}
            </div>

            <div className="space-y-2 pt-4 border-t border-[#f5f5f5]">
              <p className="text-[10px] font-semibold text-[#686868] uppercase flex items-center gap-2"><Wrench size={10} /> Prestations de Main d'œuvre</p>
              {pendingPrestations.map((p, idx) => (
                <div key={idx} className="flex justify-between items-center text-[11px] bg-[#f8f9fa] border border-[#e5e5e5] p-2 rounded-lg animate-sb-entry">
                  <span className="font-semibold">{p.name}</span>
                  <div className="flex items-center gap-4">
                    <span className="font-mono font-semibold">{Number(p.fixedCost).toLocaleString()} FCFA</span>
                    {selectedTicket?.quotation?.status !== 'Approved' && (
                      <button onClick={() => setPendingPrestations(prev => prev.filter((_, i) => i !== idx))} className="text-red-500 hover:scale-110 transition">
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {selectedTicket?.quotation?.status !== 'Approved' && (
                <div className="space-y-2 mt-3 p-3 bg-[#fcfcfc] border border-[#e5e5e5] rounded-lg">
                  <div className="flex gap-2">
                    <select
                      value={selectedPrestationId}
                      onChange={e => setSelectedPrestationId(e.target.value)}
                      className="flex-1 text-xs h-9 rounded-lg border-[#e5e5e5] bg-white focus:ring-2 focus:ring-[#3ecf8e]/20 transition-all font-semibold"
                    >
                      <option value="">-- Prestations catalogue --</option>
                      {prestations.map((pt: Prestation) => (
                        <option key={pt.id} value={pt.id}>{pt.name} ({pt.fixedCost} FCFA)</option>
                      ))}
                    </select>
                    <button
                      disabled={!selectedPrestationId}
                      onClick={() => {
                        const pt = prestations.find((p: Prestation) => p.id === selectedPrestationId);
                        if (pt) {
                          setPendingPrestations([...pendingPrestations, pt]);
                          setSelectedPrestationId('');
                        }
                      }}
                      className="btn-sb-primary h-9 px-3 rounded-lg"
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center" aria-hidden="true">
                      <div className="w-full border-t border-[#e5e5e5]"></div>
                    </div>
                    <div className="relative flex justify-center">
                      <span className="px-2 bg-[#fcfcfc] text-[10px] font-semibold text-[#686868] uppercase">Ou Ajout manuel</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Libellé prestation libre..."
                      className="flex-1 text-xs h-9 rounded-lg border-[#e5e5e5] bg-white font-semibold"
                      value={customPrestationName}
                      onChange={e => setCustomPrestationName(e.target.value)}
                    />
                    <input
                      type="number"
                      placeholder="Prix"
                      className="w-24 text-xs h-9 rounded-lg border-[#e5e5e5] bg-white font-mono font-semibold"
                      value={customPrestationCost || ''}
                      onChange={e => setCustomPrestationCost(Number(e.target.value))}
                    />
                    <button
                      disabled={!customPrestationName || customPrestationCost <= 0}
                      onClick={() => {
                        setPendingPrestations([...pendingPrestations, {
                          id: `CUSTOM-${Date.now()}`,
                          name: customPrestationName,
                          fixedCost: customPrestationCost
                        }]);
                        setCustomPrestationName('');
                        setCustomPrestationCost(0);
                      }}
                      className="btn-sb-outline h-9 px-3 rounded-lg border-[#3ecf8e] text-[#3ecf8e]"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-[#f5f5f5] space-y-3">
              {selectedTicket?.quotation?.status !== 'Approved' && (
                <div>
                  <label className="block text-[9px] font-semibold uppercase text-[#686868] mb-1.5 tracking-widest">Remise (FCFA)</label>
                  <input
                    type="number"
                    min={0}
                    value={manualDiscount}
                    onChange={e => setManualDiscount(Math.max(0, Number(e.target.value)))}
                    className="w-full h-9 focus-ring px-3 bg-gray-50 border-none rounded-lg font-semibold font-mono text-sm"
                    placeholder="0"
                  />
                </div>
              )}
              <div className="flex justify-between items-center text-[#686868]">
                <span className="text-[10px] font-semibold uppercase tracking-widest">Remise</span>
                <span className="text-xs font-semibold text-red-500">
                  -{(manualDiscount || 0).toLocaleString()} FCFA
                </span>
              </div>

              <div className="flex justify-between items-center bg-[#1c1c1c] text-white p-3 rounded-lg" style={{ backgroundColor: docPrimaryColor }}>
                <span className="text-[11px] font-semibold uppercase tracking-widest">Total Net à Payer</span>
                <span className="text-xl font-semibold relative">
                  {Math.max(0, (selectedTicket?.interventionReport?.partsUsed?.reduce((s: number, p: UsedPart) => s + (Number(p.quantity) * Number(p.unitPrice)), 0) || 0) + pendingPrestations.reduce((s: number, p: Prestation) => s + Number(p.fixedCost), 0) - (manualDiscount || 0)).toLocaleString()} FCFA
                  {selectedTicket?.financials?.isPaid && (
                    <span className="absolute -top-10 -right-4 text-[36px] text-green-500/30 font-semibold rotate-[-15deg] pointer-events-none select-none">
                      PAYÉ
                    </span>
                  )}
                </span>
              </div>
            </div>

            {/* --- Détails Acomptes / Reste à Payer --- */}
            <div className="pt-4 space-y-2">
              {((selectedTicket?.financials?.advancePayments || []).length > 0 || (selectedTicket?.financials?.advancePayment || 0) > 0) && (
                <div className="flex justify-between items-center text-[#16a34a] bg-green-50/50 p-2 rounded-lg">
                  <span className="text-[10px] font-semibold uppercase flex items-center gap-2"><Wallet size={10} /> Acomptes déjà versés</span>
                  <span className="text-xs font-mono font-semibold">
                    -{((selectedTicket?.financials?.advancePayments || []).reduce((s: number, a: any) => s + Number(a.amount), 0) + (selectedTicket?.financials?.advancePayment || 0)).toLocaleString()} FCFA
                  </span>
                </div>
              )}

              {(selectedTicket?.financials?.storeCredit || 0) > 0 && (
                <div className="flex justify-between items-center text-[#686868] bg-gray-50 p-2 rounded-lg">
                  <span className="text-[10px] font-semibold uppercase flex items-center gap-2"><BadgeCheck size={10} /> Avoir déduit</span>
                  <span className="text-xs font-mono font-semibold">-{(selectedTicket?.financials?.storeCredit || 0).toLocaleString()} FCFA</span>
                </div>
              )}

              <div className="pt-3 border-t-2 border-dashed border-[#e5e5e5] flex justify-between items-center">
                <span className="text-[11px] font-semibold uppercase text-[#1c1c1c] tracking-widest">Reste à Recouvrer</span>
                <span className="text-xl font-mono font-semibold text-[#f87171]">
                  {Math.max(0,
                    ((selectedTicket?.interventionReport?.partsUsed?.reduce((s: number, p: UsedPart) => s + (Number(p.quantity) * Number(p.unitPrice)), 0) || 0) + pendingPrestations.reduce((s: number, p: Prestation) => s + Number(p.fixedCost), 0) - (manualDiscount || 0)) -
                    ((selectedTicket?.financials?.advancePayments || []).reduce((s: number, a: { amount: number }) => s + Number(a.amount), 0) + (selectedTicket?.financials?.advancePayment || 0)) -
                    (selectedTicket?.financials?.storeCredit || 0)
                  ).toLocaleString()} FCFA
                </span>
              </div>
            </div>

            {/* --- Template Terms & Footer --- */}
            <div className="space-y-4 print:space-y-6 pt-4 border-t border-[#f5f5f5]">
              {activeTemplate?.termsConditions && (
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 italic text-[11px] text-gray-600 whitespace-pre-line">
                  <p className="font-semibold uppercase not-italic mb-1 text-[10px] tracking-widest opacity-50">Conditions Générales</p>
                  {replaceVariables(activeTemplate.termsConditions)}
                </div>
              )}

              {activeTemplate?.footerContent && (
                <div className="text-center pt-6 border-t border-[#f5f5f5] text-[10px] font-semibold text-gray-400 uppercase tracking-tighter whitespace-pre-line leading-tight">
                  {replaceVariables(activeTemplate.footerContent)}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap justify-center md:justify-end gap-2 pt-4 border-t border-[#f5f5f5]">
            <button onClick={() => setIsCotationModalOpen(false)} className="btn-sb-outline h-10 px-6 text-[11px] font-semibold uppercase rounded-lg">Fermer</button>

            {/* Boutons d'action conditionnels */}
            {selectedTicket?.quotation?.status !== 'Approved' && (
              <>
                <button
                  onClick={() => handleAddCotation('Draft')}
                  disabled={isSaving}
                  className="btn-sb-outline h-10 px-5 text-[11px] font-semibold uppercase rounded-lg border-gray-300 text-gray-600 hover:bg-gray-50"
                >
                  {isSaving ? <RefreshCw className="animate-spin" size={12} /> : 'Enregistrer Brouillon'}
                </button>

                {selectedTicket?.status === 'En attente de devis' && (
                  <button
                    onClick={handleSendQuotation}
                    disabled={isSaving}
                    className="btn-sb-primary h-10 px-5 text-[11px] font-semibold uppercase rounded-lg shadow-md shadow-[#3ecf8e]/20 flex items-center gap-2"
                  >
                    {isSaving ? <RefreshCw className="animate-spin" size={14} /> : <><Send size={14} /> Envoyer le devis</>}
                  </button>
                )}
              </>
            )}

            {selectedTicket?.quotation?.status === 'Sent' && (
              <>
                <button
                  onClick={handleValidateQuotation}
                  disabled={isSaving}
                  className="btn-sb-primary h-10 px-5 text-[11px] font-semibold uppercase rounded-lg shadow-md shadow-emerald-500/20 bg-emerald-500 hover:bg-emerald-600 border-emerald-500 flex items-center gap-2"
                >
                  {isSaving ? <RefreshCw className="animate-spin" size={14} /> : <><CheckCircle2 size={14} /> Devis validé</>}
                </button>
                <button
                  onClick={handlePrintInvoice}
                  className="btn-sb-outline h-10 px-5 text-[11px] font-semibold uppercase rounded-lg flex items-center gap-2 border-amber-500 text-amber-600 hover:bg-amber-50"
                >
                  <Printer size={14} /> Imprimer Pro-forma
                </button>
              </>
            )}

            {selectedTicket?.quotation?.status === 'Approved' && (
              <>
                <button
                  onClick={handlePrintInvoice}
                  className="btn-sb-outline h-10 px-5 text-[11px] font-semibold uppercase rounded-lg flex items-center gap-2 border-amber-500 text-amber-600 hover:bg-amber-50"
                >
                  <Printer size={14} /> Imprimer Facture
                </button>
                <button
                  onClick={handleGenerateInvoicePDF}
                  className="btn-sb-outline h-10 px-5 text-[11px] font-semibold uppercase rounded-lg flex items-center gap-2 border-[#3ecf8e] text-[#3ecf8e] hover:bg-[#f0fdf4]"
                >
                  <FileText size={14} /> PDF Facture
                </button>
              </>
            )}

            {selectedTicket?.quotation?.status !== 'Approved' && (
              <button
                onClick={() => handleAddCotation('Approved')}
                disabled={isSaving || pendingPrestations.length === 0}
                className="btn-sb-primary h-10 px-8 text-[11px] font-semibold uppercase rounded-lg shadow-md shadow-[#3ecf8e]/20 flex items-center gap-2"
              >
                {isSaving ? <RefreshCw className="animate-spin" size={14} /> : <><CheckCircle2 size={14} /> Valider Rapport & Facture</>}
              </button>
            )}
          </div>
        </div>
      </Modal>
      {/* MODALE D'INTERVENTION PARTAGÉE */}
      {
        selectedTicket && (
          <InterventionModal
            isOpen={isInterventionModalOpen}
            onClose={() => setIsInterventionModalOpen(false)}
            ticket={selectedTicket}
            onSuccess={(updated) => {
              setSelectedTicket(updated);
            }}
          />
        )
      }

      {/* MODALE DE GESTION DES TAGS */}
      <Modal
        isOpen={!!selectedTicketForTag}
        onClose={() => { setSelectedTicketForTag(null); setNewTagName(''); setNewTagColor('#3ecf8e'); }}
        title="Gérer les Tags"
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold text-[#686868] mb-2">Tags existants:</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {(allTags || []).map((tag: TicketTag) => (
                <button
                  key={tag.id}
                  onClick={() => {
                    const ticket = tickets.find((t: Ticket) => t.id === selectedTicketForTag);
                    if (ticket) {
                      const hasTag = (ticket.tags || []).some((t: TicketTag) => t.name === tag.name);
                      const updatedTags = hasTag
                        ? (ticket.tags || []).filter((t: TicketTag) => t.name !== tag.name)
                        : [...(ticket.tags || []), tag];
                      saveTicket({ ...ticket, tags: updatedTags });
                      addNotification({ title: 'Tag', message: hasTag ? 'Tag retiré' : 'Tag ajouté', type: 'success' });
                    }
                  }}
                  className="px-2 py-1 rounded text-xs font-semibold border transition-all hover:scale-105"
                  style={{
                    backgroundColor: tag.color + '20',
                    color: tag.color,
                    borderColor: tag.color
                  }}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          </div>
          <div className="border-t border-[#e5e5e5] pt-4">
            <p className="text-xs font-semibold text-[#686868] mb-2">Nouveau tag:</p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Nom du tag"
                value={newTagName}
                onChange={e => setNewTagName(e.target.value)}
                className="flex-1 h-9 px-3 rounded-lg border border-[#e5e5e5] text-xs"
              />
              <input
                type="color"
                value={newTagColor}
                onChange={e => setNewTagColor(e.target.value)}
                className="w-9 h-9 rounded-lg border border-[#e5e5e5] cursor-pointer"
              />
              <button
                onClick={() => {
                  if (newTagName.trim()) {
                    addTicketTag({
                      id: `TAG-${Date.now()}`,
                      name: newTagName.trim(),
                      color: newTagColor,
                      ticketId: selectedTicketForTag || ''
                    });
                    setNewTagName('');
                    addNotification({ title: 'Tag', message: 'Nouveau tag créé', type: 'success' });
                  }
                }}
                className="btn-sb-primary px-3 h-9"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* MODALE DE FUSION DE TICKETS */}
      <Modal
        isOpen={isMergeModalOpen}
        onClose={() => { setIsMergeModalOpen(false); setMergeTargetId(''); }}
        title="Fusionner avec un autre ticket"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-[#686868]">
            Sélectionnez le ticket principal où fusionner le ticket actuel.
            Les données seront consolidées et le ticket actuel sera archivé.
          </p>
          <select
            value={mergeTargetId}
            onChange={e => setMergeTargetId(e.target.value)}
            className="w-full h-10 rounded-lg border border-[#e5e5e5] px-3"
          >
            <option value="">-- Choisir un ticket --</option>
            {tickets.filter((t: Ticket) => t.id !== selectedTicket?.id && t.status !== 'Fermé').map((t: Ticket) => (
              <option key={t.id} value={t.id}>#{t.id} - {t.customerName} ({t.productName || t.category})</option>
            ))}
          </select>
          <div className="flex justify-end gap-3 pt-4">
            <button onClick={() => { setIsMergeModalOpen(false); setMergeTargetId(''); }} className="btn-sb-outline h-10 px-5">
              Annuler
            </button>
            <button
              onClick={() => {
                if (selectedTicket && mergeTargetId) {
                  mergeTickets(selectedTicket.id, mergeTargetId);
                  setIsMergeModalOpen(false);
                  setSelectedTicket(null);
                  addNotification({ title: 'Fusion', message: 'Tickets fusionnés avec succès', type: 'success' });
                }
              }}
              disabled={!mergeTargetId}
              className="btn-sb-primary h-10 px-5 bg-purple-500 hover:bg-purple-600 shadow-md shadow-purple-500/20 disabled:opacity-50"
            >
              <GitMerge size={14} className="mr-2" /> Fusionner
            </button>
          </div>
        </div>
      </Modal>
      {/* --- Styles d'impression --- */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @media print {
          body * { visibility: hidden; }
          .modal-content-to-print, .modal-content-to-print * { visibility: visible; }
          .modal-content-to-print {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20px;
          }
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          .print-watermark {
            display: flex !important;
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-45deg);
            font-size: 120px;
            font-weight: 900;
            color: rgba(0,0,0,0.05);
            pointer-events: none;
            z-index: -1;
            white-space: nowrap;
          }
        }
        .print-only { display: none; }
      `}} />
    </div>
  );
};

export default Tickets;
