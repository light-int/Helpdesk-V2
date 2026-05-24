
export type UserRole = 'ADMIN' | 'TECHNICIAN' | 'AGENT' | 'MANAGER';

export interface StrategicReport {
  id: string;
  title: string;
  content: string;
  startDate: string;
  endDate: string;
  createdAt: string;
  statsSnapshot?: any;
}

export interface SystemConfig {
  aiEnabled?: boolean;
  aiProvider?: 'google' | 'openrouter';
  aiModel?: string;
  aiAutoCategorization?: boolean;
  aiStrategicAudit?: boolean;
  aiChatbotEnabled?: boolean;
  autoTranslate?: boolean;
  sessionTimeout?: number;
  mfaRequired?: boolean;
  syncFrequency?: 'realtime' | 'manual' | 'hourly';
  maintenanceMode?: boolean;
  passwordComplexity?: 'low' | 'medium' | 'high';
  // Personalization settings
  theme?: 'light' | 'dark';
  accentColor?: string;
  emailNotifications?: boolean;
  desktopNotifications?: boolean;
  soundNotifications?: boolean;
  pushNotifications?: boolean;
  pushEndpoint?: string;
  // Integration settings
  apiKey?: string;
  webhooks?: { id: string, url: string, events: string[], active: boolean }[];
}

export interface IntegrationConfig {
  id: string;
  name: string;
  enabled: boolean;
  apiKey?: string;
  webhookUrl?: string;
  settings: any;
  lastSync?: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_type: 'client' | 'agent' | 'system';
  sender_name?: string;
  content: string;
  status: 'sent' | 'delivered' | 'read';
  timestamp: string;
  metadata?: any;
}

export interface Conversation {
  id: string;
  customer_id?: string;
  customer_name: string;
  customer_avatar?: string;
  source: 'WhatsApp' | 'Messenger' | 'Email';
  last_message: string;
  unread_count: number;
  status: 'open' | 'resolved' | 'archived';
  last_activity: string;
}

export interface UserPreferences {
  pushNotifications: boolean;
  darkModeAuto: boolean;
  weeklyEmail: boolean;
  criticalAlerts: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  role: UserRole;
  showroom?: string;
  avatar: string;
  status?: 'Actif' | 'Inactif' | 'En en attente';
  email?: string;
  phone?: string;
  password?: string;
  preferences?: UserPreferences;
  lastLogin?: string;
  mfaEnabled?: boolean;
  bio?: string;
}

export interface SyncMetrics {
  lastSuccess: string | null;
  latency: number | null;
  status: 'CONNECTED' | 'DISCONNECTED' | 'SYNCING' | 'ERROR';
  errorCount: number;
}

export type Showroom = string;

export interface ShowroomConfig {
  id: string;
  address: string;
  phone: string;
  isOpen: boolean;
  hours: string;
}

export interface Product {
  id: string;
  reference: string;
  name: string;
  brand: string;
  category: string;
  subcategory?: string;
  description?: string;
  price: number;
  purchasePrice?: number;
  warrantyMonths: number;
  stockStatus?: 'En stock' | 'Rupture' | 'Sur commande';
  supplier?: string;
  isActive?: boolean;
  isDiscontinued?: boolean;
  isFavorite?: boolean;
  minStock?: number;
  internalNotes?: string;
  image?: string;
  downtimeCostPerHour?: number;
}

export interface ProductPriceHistory {
  id: string;
  productId: string;
  price: number;
  purchasePrice?: number;
  createdAt: string;
}

export interface Part {
  id: string;
  name: string;
  sku: string;
  category: 'Électronique' | 'Mécanique' | 'Consommable' | 'Accessoire';
  brand: string;
  currentStock: number;
  minStock: number;
  unitPrice: number;
  purchasePrice?: number;
  condition?: 'Neuf' | 'Occasion';
  location: string;
  imageUrl?: string;
  reservedQuantity?: number;
  isKit?: boolean;
  kitComponents?: KitComponent[];
}

export interface KitComponent {
  partId: string;
  partName: string;
  quantity: number;
}

export interface PartSupplier {
  id: string;
  partId: string;
  supplierName: string;
  supplierSku?: string;
  purchasePrice: number;
  leadTimeDays?: number;
  isPreferred?: boolean;
}

export interface PartCompatibility {
  id: string;
  partId: string;
  productId: string;
  productName: string;
  productBrand: string;
}

export interface StockReservation {
  id: string;
  partId: string;
  ticketId: string;
  ticketNumber: string;
  quantity: number;
  reservedAt: string;
  reservedBy: string;
}

export interface PhysicalInventoryCount {
  id: string;
  partId: string;
  countedQuantity: number;
  expectedQuantity: number;
  difference: number;
  countedAt: string;
  countedBy: string;
  notes?: string;
}

export interface StockMovement {
  id: string;
  partId: string;
  partName: string;
  quantity: number;
  type: 'IN' | 'OUT';
  reason: string;
  date: string;
  performedBy: string;
  ticketId?: string;
}

export interface FinancialDetail {
  partsTotal: number;
  laborTotal: number;
  travelFee: number;
  discount: number;
  partsCost: number;
  laborCost: number;
  logisticsCost: number;
  grandTotal: number;
  netMargin: number;
  isPaid: boolean;
  paymentMethod?: 'Espèces' | 'Airtel Money' | 'Moov Money' | 'Virement' | 'Carte';
  paymentDate?: string;
  invoiceNumber?: string;
  status?: 'En attente' | 'Validé';
  advancePayment?: number;
  advancePaymentDate?: string;
  advancePayments?: {
    amount: number;
    date: string;
    method: 'Espèces' | 'Airtel Money' | 'Moov Money' | 'Virement' | 'Carte';
    recordedBy: string;
  }[];
  storeCredit?: number; // Avoir
  remainingToPay?: number;
}

export type TicketStatus = 'Nouveau' | 'En attente de devis' | 'Devis envoyé' | 'En attente de paiement' | 'En attente client' | 'En réparation' | 'En cours' | 'Terminé - Prêt à être payé' | 'Payé - Clôturé' | 'Fermé' | 'Archivé';
export type TicketCategory = 'Livraison' | 'Installation' | 'SAV' | 'Remboursement' | 'Information' | 'Maintenance' | 'Climatisation' | 'Électronique';

export interface UsedPart {
  id?: string;
  name: string;
  quantity: number;
  unitPrice: number; // Selling price
  purchasePrice?: number; // Cost price
}

export interface Prestation {
  id: string;
  name: string; // e.g. 'Livraison', 'Installation', 'Maintenance', 'Réparation'
  fixedCost: number;
}

export interface Quotation {
  id: string;
  prestations: Prestation[];
  totalAmount: number;
  status: 'Draft' | 'Sent' | 'Approved' | 'Rejected';
  createdAt: string;
}

export interface InterventionReport {
  equipmentStatus?: 'Excellent' | 'Bon' | 'Critique' | 'À remplacer';
  performedAt?: string;
  startedAt?: string;
  durationMs?: number;
  detailedDiagnostic?: string;
  repairProcedure?: string;
  internalNotes?: string;
  isWarrantyValid?: boolean;
  recommendations?: string;
  actionsTaken?: string[];
  partsUsed?: UsedPart[];
  photos?: {
    url: string;
    type: 'Before' | 'After' | 'Piece';
    caption?: string;
    timestamp: string;
  }[];
}

export interface TicketComment {
  id: string;
  ticketId: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
}

export interface InAppNotification {
  id: string;
  userId: string;
  type: 'ASSIGNMENT' | 'STATUS_CHANGE' | 'COMMENT' | 'SYSTEM';
  message: string;
  isRead: boolean;
  link?: string;
  createdAt: string;
}

export interface DiagnosticTemplate {
  id: string;
  category: string;
  title: string;
  content: string;
  recommendations?: string;
  createdAt: string;
}

export interface TicketAttachment {
  id: string;
  ticketId: string;
  fileName: string;
  fileUrl: string;
  fileType?: string;
  uploadedBy: string;
  createdAt: string;
}

export interface ClientCommunication {
  id: string;
  ticketId: string;
  type: 'CALL' | 'SMS' | 'EMAIL' | 'VISIT';
  summary: string;
  authorId: string;
  createdAt: string;
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  createdBy: string; // Agent ID who created the team
  createdAt: string;
  updatedAt?: string;
}

export interface Technician {
  id: string;
  name: string;
  specialty: TicketCategory[];
  avatar: string;
  phone: string;
  email: string;
  activeTickets: number;
  completedTickets: number;
  avgResolutionTime: string;
  rating: number;
  status: 'Disponible' | 'En intervention' | 'Hors ligne';
  nps?: number;
  performanceHistory?: { day: string, resolved: number }[];
  firstFixRate?: number;
  showroom?: string;
  teamId?: string; // Reference to the team assigned by agent
  // Enhanced features
  certifications?: string[]; // Badges: "iPhone Expert", "Samsung Certifié", etc.
  backupTechnicianId?: string; // Remplaçant en cas d'absence
  maxWorkload?: number; // Capacité max tickets (défaut: 5)
}

export interface TicketHistoryEntry {
  action: string;
  user: string;
  timestamp: string;
  details?: string;
}

export interface TicketTag {
  id: string;
  name: string;
  color: string;
  ticketId: string;
}

export interface SLAMetrics {
  createdAt: string;
  firstResponseAt?: string;
  resolvedAt?: string;
  breachedAt?: string;
  slaTargetHours: number;
  status: 'OnTrack' | 'AtRisk' | 'Breached';
}

export interface TicketMerge {
  id: string;
  sourceTicketId: string;
  targetTicketId: string;
  mergedAt: string;
  mergedBy: string;
}

export interface CustomerTimeline {
  id: string;
  customerId: string;
  type: 'TICKET' | 'CALL' | 'VISIT' | 'PURCHASE' | 'SUPPORT';
  title: string;
  description?: string;
  date: string;
  metadata?: any;
}

export interface CustomerSegment {
  id: string;
  customerId: string;
  segment: 'VIP' | 'Professionnel' | 'Particulier' | 'Nouveau' | 'Fidèle';
  assignedAt: string;
}

export interface CustomerPortal {
  id: string;
  customerId: string;
  accessToken: string;
  qrCode: string;
  expiresAt: string;
}

export interface CommunicationLog {
  id: string;
  customerId: string;
  type: 'EMAIL' | 'SMS' | 'CALL' | 'WHATSAPP' | 'VISIT';
  direction: 'IN' | 'OUT';
  content: string;
  sentAt: string;
  sentBy?: string;
}

export interface TechnicianSchedule {
  id: string;
  technicianId: string;
  ticketId?: string;
  title: string;
  startTime: string;
  endTime: string;
  type: 'INTERVENTION' | 'MAINTENANCE' | 'FORMATION' | 'CONGÉ';
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
}

export interface TechnicianMetrics {
  technicianId: string;
  period: string; // YYYY-MM
  ticketsResolved: number;
  avgResolutionTime: number; // minutes
  firstFixRate: number; // percentage
  customerSatisfaction: number; // NPS 0-10
  revenueGenerated: number;
}

export interface DashboardWidget {
  id: string;
  userId: string;
  type: 'TICKETS_STATUS' | 'REVENUE' | 'STOCK_ALERTS' | 'TECH_PERFORMANCE' | 'SLA_STATUS' | 'CUSTOMER_STATS';
  position: number;
  config?: any;
}

export interface AutomatedReport {
  id: string;
  name: string;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  recipients: string[];
  lastSentAt?: string;
  isActive: boolean;
  filters?: any;
}

export interface Ticket {
  id: string;
  productId?: string;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  source: 'WhatsApp' | 'Messenger' | 'Email' | 'Phone' | 'Interne';
  showroom: string;
  category: TicketCategory;
  status: TicketStatus;
  priority: 'Basse' | 'Moyenne' | 'Haute' | 'Urgent';
  productReference?: string;
  productName?: string;
  product?: string;
  brand?: string;
  serialNumber?: string;
  purchaseDate?: string;
  clientImpact?: 'Faible' | 'Modéré' | 'Critique';
  isEquipmentDown?: boolean;
  downTimeHours?: number;
  assignedTechnicianId?: string;
  createdBy?: string;
  createdAt: string;
  lastUpdate: string;
  diagnosedAt?: string;
  description: string;
  location?: string;
  interventionLocation?: 'chez le client' | 'à l\'atelier';
  financials?: FinancialDetail;
  interventionReport?: InterventionReport;
  quotation?: Quotation;
  isArchived?: boolean;
  invoiceNumber?: string;
  repairFlow?: 'Atelier' | 'Sur site' | 'Retour logistique' | 'Commande pièce' | 'Non réparable';
  history?: TicketHistoryEntry[];
  internalComments?: {
    user: string;
    text: string;
    timestamp: string;
  }[];
  isReopened?: boolean;
  reopeningReason?: string;
  reopenCount?: number;
  attachments?: TicketAttachment[];
  clientCommunications?: ClientCommunication[];
  // --- NEW FIELDS ---
  tags?: TicketTag[];
  slaMetrics?: SLAMetrics;
  parentTicketId?: string; // For merged tickets
  estimatedResolutionTime?: number; // minutes
}

export interface WarrantyRecord {
  id: string;
  productId?: string;
  customerId?: string;
  product: string;
  brand: string;
  serialNumber: string;
  customerName: string;
  purchaseDate: string;
  durationMonths: number;
  expiryDate: string;
  isExtensionAvailable?: boolean;
  invoiceNumber?: string;
  deviceType?: string;
  reference?: string;
}

export interface Intervention {
  id: string;
  technicianId: string;
  technicianName: string;
  zone: string;
  competence: string;
  date: string;
  startTime: string;
  endTime: string;
  partsUsed: string[];
  cost: number;
  customerRating: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  type: 'Particulier' | 'Entreprise';
  address: string;
  status: string;
  totalSpent: number;
  ticketsCount: number;
  lastVisit: string;
  companyName?: string;
  isArchived?: boolean;
  createdBy?: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: string;
  read: boolean;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  target: string;
  timestamp: string;
  details: string;
}

export interface Vehicle {
  id: string;
  plateNumber: string;
  model: string;
  status: 'Disponible' | 'En course' | 'En maintenance';
  driver?: string;
}

export interface TransportMission {
  id: string;
  ticketId: string;
  vehicleId: string;
  driver: string;
  destination: string;
  status: 'Planifié' | 'En cours' | 'Terminé';
  departureTime: string;
  arrivalTime?: string;
  notes?: string;
}

export interface WorkshopExpense {
  id: string;
  type: 'Salaire' | 'Loyer' | 'Transport' | 'Maintenance' | 'Autre';
  amount: number;
  date: string;
  description: string;
  recordedBy: string;
}

export interface FundTransfer {
  id: string;
  amount: number;
  date: string;
  status: 'En attente' | 'Validé' | 'Rejeté';
  fromAgent: string;
  toManager: string;
  notes?: string;
  sessionId?: string; // Nouveau: lien vers session de caisse
}

export interface CashRegister {
  id: string;
  name: string;
  location: string;
  isActive: boolean;
  defaultOperatorId?: string;
  showroom?: string; // Nouveau: showroom associé
}

export interface CashRegisterSession {
  id: string;
  cashRegisterId: string;
  cashRegisterName?: string;
  showroom?: string; // Nouveau: showroom associé
  status: 'Ouverte' | 'Fermée' | 'SUSPENDED';
  openedAt: string;
  closedAt?: string;
  openingBalance: number;
  closingBalance?: number;
  totalTheoretical?: number;
  totalReal?: number;
  variance?: number;
  notes?: string;
  openedBy: string;
  openedByName?: string;
  closedBy?: string;
  closedByName?: string;
  operatorId?: string;
  operatorName?: string;
  // Champs calculés (non stockés en DB)
  entries?: CashRegisterEntry[];
  totalEntries?: number;
  totalWithdrawals?: number;
  netCash?: number;
}

export interface CashRegisterEntry {
  id: string;
  sessionId: string;
  cashRegisterId?: string;
  ticketId?: string;
  customerName?: string; // Nouveau: nom du client
  type: 'Acompte' | 'Solde' | 'Dépense' | 'Ajustement';
  amount: number;
  method: 'Espèces' | 'Airtel Money' | 'Moov Money' | 'Virement' | 'Carte';
  timestamp: string;
  recordedBy: string;
  recordedByName?: string;
  notes?: string;
  verified?: boolean; // Nouveau: vérification
  verifiedBy?: string;
  verifiedAt?: string;
}

export interface CashSummary {
  totalAmount: number; // en centimes
  paymentMethods: {
    'Espèces': number;
    'Airtel Money': number;
    'Moov Money': number;
    'Virement': number;
    'Carte': number;
  };
  transactionCount: number;
  averageAmount: number; // en centimes
}

export interface DocumentTemplate {
  id: string;
  name: string;
  type: 'QUOTATION' | 'INVOICE' | 'BOTH';
  isActive: boolean;
  headerContent: string;
  footerContent: string;
  termsConditions: string;
  logoUrl?: string;
  primaryColor?: string;
  fontFamily?: string;
  createdAt: string;
}

// === CONTEXT TYPES ===

export interface NotificationPayload {
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export interface UINotification extends NotificationPayload {
  id: string;
  timestamp: string;
  read: boolean;
}

export interface UserContextValue {
  currentUser: UserProfile | null;
  login: (user: UserProfile) => void;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<UserProfile>) => Promise<void>;
}

export interface ModalNotification {
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning';
  actionLabel?: string;
  onAction?: () => void;
}

export interface NotificationContextValue {
  notifications: UINotification[];
  persistentNotifications: InAppNotification[];
  addNotification: (n: NotificationPayload) => void;
  showModalNotification: (n: ModalNotification) => void;
  removeNotification: (id: string) => void;
  markNotificationAsRead: (id: string) => Promise<void>;
  sendPersistentNotification: (userId: string, type: InAppNotification['type'], message: string, link?: string) => Promise<void>;
}

export interface PushSubscriptionDB {
  id: string;
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  createdAt: string;
}

export const VAPID_PUBLIC_KEY = 'BDehWoN2PXaSrsMRTRiGoH3_LaOFe8mgPS1o0_JZLKxpBLzPvm5ZEyhxMrDdgO2Z3E6z5kt3WrFTsFQSo-5vwbo';

export interface DataContextValue {
  tickets: Ticket[];
  products: Product[];
  technicians: Technician[];
  parts: Part[];
  warranties: WarrantyRecord[];
  customers: Customer[];
  users: UserProfile[];
  brands: string[];
  showrooms: ShowroomConfig[];
  config: SystemConfig | null;
  syncMetrics: SyncMetrics;
  isSyncing: boolean;
  isLoading: boolean;
  templates: DocumentTemplate[];
  prestations: Prestation[];
  refreshAll: () => Promise<void>;
  saveTicket: (ticket: Ticket) => Promise<void>;
  saveCustomer: (c: Customer) => Promise<void>;
  savePart: (part: Part) => Promise<void>;
  deletePart: (id: string) => Promise<void>;
  saveProduct: (p: Product) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  saveTechnician: (t: Technician) => Promise<void>;
  deleteTechnician: (id: string) => Promise<void>;
  saveWarranty: (w: WarrantyRecord) => Promise<void>;
  deleteWarranty: (id: string) => Promise<void>;
  updateConfig: (updates: Partial<SystemConfig>) => Promise<void>;
  saveUser: (u: UserProfile) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  addBrand: (name: string) => Promise<void>;
  deleteBrand: (name: string) => Promise<void>;
  savePrestation: (p: Prestation) => Promise<void>;
  deletePrestation: (id: string) => Promise<void>;
  saveTemplate: (t: DocumentTemplate) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  // Missing properties added
  stockMovements: StockMovement[];
  addStockMovement: (movement: any) => Promise<void>;
  teams: Team[];
  saveTeam: (team: Team) => Promise<void>;
  deleteTeam: (id: string) => Promise<void>;
  techSchedules: TechnicianSchedule[];
  techMetrics: TechnicianMetrics[];
  saveTechSchedule: (schedule: TechnicianSchedule) => Promise<void>;
  deleteTechSchedule: (id: string) => Promise<void>;
  cashRegisterSessions: CashRegisterSession[];
  cashRegisterEntries: CashRegisterEntry[];
  reports: StrategicReport[];
  auditLogs: AuditLog[];
  hardReset: () => Promise<void>;
}
