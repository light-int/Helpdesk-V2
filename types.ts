
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
  aiEnabled: boolean;
  aiProvider: 'google' | 'openrouter';
  aiModel: string; // 'flash' | 'pro' | 'openai/gpt-4o' | etc.
  aiAutoCategorization: boolean;
  aiStrategicAudit: boolean;
  aiChatbotEnabled: boolean;
  autoTranslate: boolean;
  sessionTimeout: number; 
  mfaRequired: boolean;
  syncFrequency: 'realtime' | 'manual' | 'hourly';
  maintenanceMode: boolean;
  passwordComplexity: 'low' | 'medium' | 'high';
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

export interface DashboardWidget {
  id: string;
  label: string;
  visible: boolean;
}

export interface UserPreferences {
  pushNotifications: boolean;
  darkModeAuto: boolean;
  weeklyEmail: boolean;
  criticalAlerts: boolean;
  dashboardWidgets?: DashboardWidget[];
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
  price: number;
  warrantyMonths: number;
  image?: string;
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
  location: string;
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
}

export type TicketStatus = 'Nouveau' | 'En cours' | 'En attente d\'approbation' | 'Résolu' | 'Fermé';
export type TicketCategory = 'Livraison' | 'Installation' | 'SAV' | 'Remboursement' | 'Information' | 'Maintenance' | 'Climatisation' | 'Électronique';

export interface UsedPart {
  id?: string;
  name: string;
  quantity: number;
  unitPrice: number;
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
}

export interface Ticket {
  id: string;
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
  assignedTechnicianId?: string;
  createdAt: string;
  lastUpdate: string;
  description: string;
  location?: string;
  financials?: FinancialDetail;
  interventionReport?: InterventionReport;
  isArchived?: boolean;
}

export interface WarrantyRecord {
  id: string;
  product: string;
  brand: string;
  serialNumber: string;
  customerName: string;
  purchaseDate: string;
  durationMonths: number;
  expiryDate: string;
  isExtensionAvailable?: boolean;
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
