
import React from 'react';
import { 
  LayoutDashboard, Inbox, Ticket as TicketIcon, BookOpen, 
  Settings, Users, ClipboardCheck, ShieldCheck, Package, 
  Wallet, ShoppingBag, BookText, UserCircle
} from 'lucide-react';
import { Product, UserProfile, ShowroomConfig, Part, Ticket, Technician, Intervention, WarrantyRecord, Customer } from './types';

export const COLORS = {
  royal: '#1e3a8a',
  gold: '#d4af37',
  accent: '#fbbf24',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6'
};

export const DEFAULT_BRANDS = ['LG', 'Beko', 'Samsung', 'Hisense', 'Royal Plaza', 'BuroPlus', 'TCL', 'Midea'];

export const NAVIGATION = [
  { name: 'Tableau de bord', path: '/', icon: <LayoutDashboard size={20} /> },
  { name: 'Clients Plaza', path: '/customers', icon: <Users size={20} /> },
  { name: 'Catalogue Produits', path: '/products', icon: <ShoppingBag size={20} /> },
  { name: 'Boîte de réception', path: '/inbox', icon: <Inbox size={20} /> },
  { name: 'Tickets & SAV', path: '/tickets', icon: <TicketIcon size={20} /> },
  { name: 'Maintenance', path: '/maintenance', icon: <ClipboardCheck size={20} /> },
  { name: 'Finances', path: '/finances', icon: <Wallet size={20} /> },
  { name: 'Pièces Détachées', path: '/parts', icon: <Package size={20} /> },
  { name: 'Garanties', path: '/warranties', icon: <ShieldCheck size={20} /> },
  { name: 'Équipe Technique', path: '/technicians', icon: <Users size={20} /> },
  { name: 'Documentation', path: '/documentation', icon: <BookText size={20} /> },
  { name: 'Mon Profil', path: '/profile', icon: <UserCircle size={20} /> },
  { name: 'Paramètres', path: '/settings', icon: <Settings size={20} /> },
];

export const MOCK_CUSTOMERS: Customer[] = [
  { id: 'C-101', name: 'Jean Mba', phone: '+241 77 12 34 56', email: 'jean.mba@email.ga', type: 'Particulier', address: 'Quartier Glass, Libreville', status: 'VIP', totalSpent: 1250000, ticketsCount: 3, lastVisit: '2024-05-15' },
  { id: 'C-102', name: 'CFAO Gabon', phone: '+241 11 70 12 34', email: 'service.tech@cfao.ga', type: 'Entreprise', address: 'Zone Oloumi', status: 'Actif', totalSpent: 8450000, ticketsCount: 12, lastVisit: '2024-05-10', companyName: 'CFAO Motors' },
  { id: 'C-103', name: 'Sarah Obiang', phone: '+241 66 22 33 44', email: 'sarah.obiang@email.ga', type: 'Particulier', address: 'Akanda, Villa 45', status: 'Actif', totalSpent: 450000, ticketsCount: 1, lastVisit: '2024-05-18' },
  { id: 'C-104', name: 'BGFIBank', phone: '+241 11 00 00 00', email: 'maintenance@bgfibank.ga', type: 'Entreprise', address: 'Bord de Mer, Siège', status: 'VIP', totalSpent: 15600000, ticketsCount: 24, lastVisit: '2024-05-19', companyName: 'BGFI Gabon' },
];

export const MOCK_PRODUCTS: Product[] = [
  { id: 'PR-001', reference: 'LG-INV-450', name: 'Réfrigérateur LG InstaView 450L', brand: 'LG', category: 'Électroménager', price: 850000, warrantyMonths: 24, image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=200' },
  { id: 'PR-002', reference: 'BK-SPLIT-12', name: 'Split Beko 1.5 CV Artic', brand: 'Beko', category: 'Climatisation', price: 285000, warrantyMonths: 12, image: 'https://images.unsplash.com/photo-1631548484111-da4b03683f12?w=200' },
  { id: 'PR-003', reference: 'RP-DSK-EXEC', name: 'Bureau Exécutif Royal Wood', brand: 'Royal Plaza', category: 'Mobilier', price: 450000, warrantyMonths: 36, image: 'https://images.unsplash.com/photo-1518455027359-f3f816b1a22a?w=200' },
  { id: 'PR-004', reference: 'LG-LED-55', name: 'TV LG NanoCell 55"', brand: 'LG', category: 'Électronique', price: 525000, warrantyMonths: 12, image: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=200' },
];

export const MOCK_USERS: UserProfile[] = [
  { id: 'U-01', name: 'Admin Royal', role: 'ADMIN', avatar: 'https://i.pravatar.cc/150?u=admin', status: 'Actif', email: 'admin@royalplaza.ga' },
  { id: 'U-02', name: 'Manager Oloumi', role: 'MANAGER', avatar: 'https://i.pravatar.cc/150?u=manager', status: 'Actif', email: 'manager@royalplaza.ga', showroom: 'Oloumi' },
  { id: 'U-03', name: 'Agent SAV', role: 'AGENT', avatar: 'https://i.pravatar.cc/150?u=agent', status: 'Actif', email: 'agent@royalplaza.ga' },
  { id: 'U-04', name: 'Moussa Diallo', role: 'TECHNICIAN', avatar: 'https://i.pravatar.cc/150?u=moussa', status: 'Actif', email: 'moussa@royalplaza.ga' },
];

export const MOCK_TICKETS: Ticket[] = [
  {
    id: 'T-1001',
    customerName: 'Jean Mba',
    source: 'WhatsApp',
    showroom: 'Glass',
    category: 'SAV',
    status: 'Résolu',
    priority: 'Urgent',
    productReference: 'LG-INV-450',
    productName: 'Réfrigérateur LG InstaView 450L',
    product: 'Réfrigérateur LG InstaView 450L',
    brand: 'LG',
    assignedTechnicianId: 'TECH-01',
    description: 'Le congélateur ne produit plus de froid.',
    financials: { 
      partsTotal: 45000, partsCost: 32000, laborTotal: 25000, laborCost: 12000, logisticsCost: 5000, travelFee: 5000, discount: 0, 
      grandTotal: 75000, netMargin: 26000, isPaid: true 
    },
    createdAt: '2024-05-15T10:30:00Z',
    lastUpdate: '2024-05-20T10:30:00Z'
  },
  {
    id: 'T-1002',
    customerName: 'Sarah Obiang',
    source: 'Phone',
    showroom: 'Oloumi',
    category: 'Installation',
    status: 'Résolu',
    priority: 'Moyenne',
    productName: 'Split Beko 1.5 CV',
    brand: 'Beko',
    assignedTechnicianId: 'TECH-02',
    description: 'Installation pack complet dans villa Akanda.',
    financials: { 
      partsTotal: 15000, partsCost: 8000, laborTotal: 45000, laborCost: 15000, logisticsCost: 8000, travelFee: 10000, discount: 0, 
      grandTotal: 70000, netMargin: 39000, isPaid: true 
    },
    createdAt: '2024-05-18T09:00:00Z',
    lastUpdate: '2024-05-19T14:00:00Z'
  },
  {
    id: 'T-1003',
    customerName: 'CFAO Gabon',
    source: 'Email',
    showroom: 'Bord de mer',
    category: 'Maintenance',
    status: 'Résolu',
    priority: 'Basse',
    productName: 'Parc Climatisation BuroPlus',
    brand: 'BuroPlus',
    assignedTechnicianId: 'TECH-01',
    description: 'Maintenance préventive trimestrielle.',
    financials: { 
      partsTotal: 5000, partsCost: 2000, laborTotal: 120000, laborCost: 30000, logisticsCost: 10000, travelFee: 15000, discount: 10000, 
      grandTotal: 130000, netMargin: 88000, isPaid: false 
    },
    createdAt: '2024-05-10T08:00:00Z',
    lastUpdate: '2024-05-12T16:00:00Z'
  }
];

export const MOCK_TECHNICIANS: Technician[] = [
  { 
    id: 'TECH-01', name: 'Moussa Diallo', specialty: ['Installation', 'SAV'], avatar: 'https://i.pravatar.cc/150?u=moussa', phone: '+241 77 12 34 56', email: 'moussa@royalplaza.ga', activeTickets: 1, completedTickets: 124, avgResolutionTime: '3.2h', rating: 4.8, status: 'Disponible', nps: 78, firstFixRate: 92,
    performanceHistory: [{ day: 'Lun', resolved: 4 }, { day: 'Mar', resolved: 6 }, { day: 'Mer', resolved: 3 }, { day: 'Jeu', resolved: 5 }, { day: 'Ven', resolved: 7 }]
  },
  { 
    id: 'TECH-02', name: 'Kevin Nguema', specialty: ['Climatisation', 'Électronique'], avatar: 'https://i.pravatar.cc/150?u=kevin', phone: '+241 66 98 76 54', email: 'kevin@royalplaza.ga', activeTickets: 2, completedTickets: 89, avgResolutionTime: '4.5h', rating: 4.6, status: 'En intervention', nps: 72, firstFixRate: 85,
    performanceHistory: [{ day: 'Lun', resolved: 2 }, { day: 'Mar', resolved: 3 }, { day: 'Mer', resolved: 5 }, { day: 'Jeu', resolved: 2 }, { day: 'Ven', resolved: 4 }]
  }
];

export const MOCK_PARTS: Part[] = [
  { id: 'PT-001', name: 'Compresseur LG 12k BTU', sku: 'LG-COMP-12', category: 'Électronique', brand: 'LG', currentStock: 5, minStock: 2, unitPrice: 85000, location: 'Libreville - Glass A1' },
  { id: 'PT-002', name: 'Filtre à air Standard', sku: 'FLT-STD-AC', category: 'Consommable', brand: 'Beko', currentStock: 1, minStock: 10, unitPrice: 5000, location: 'Libreville - Oloumi B4' },
];

export const MOCK_WARRANTIES: WarrantyRecord[] = [
  { id: 'W-001', product: 'Réfrigérateur LG InstaView', brand: 'LG', serialNumber: 'SN-LG-99283-GA', customerName: 'Jean Mba', purchaseDate: '2023-05-10', durationMonths: 24, expiryDate: '2025-05-10', isExtensionAvailable: true },
];

export const MOCK_INTERVENTIONS: Intervention[] = [
  { id: 'INT-4021', technicianId: 'TECH-01', technicianName: 'Moussa Diallo', zone: 'Glass', competence: 'SAV', date: '2024-05-19', startTime: '09:00', endTime: '11:45', partsUsed: ['Compresseur LG'], cost: 85000, customerRating: 5 },
];

export const MOCK_SHOWROOMS: ShowroomConfig[] = [
  { id: 'Glass', address: 'Boulevard Quaben, Libreville', phone: '+241 11 72 00 01', isOpen: true, hours: '08:30 - 18:30' },
  { id: 'Oloumi', address: 'Zone Industrielle Oloumi, Libreville', phone: '+241 11 72 00 02', isOpen: true, hours: '08:00 - 17:30' },
];

export const FAQ_DATA = [
  { id: '1', category: 'Entretien', title: 'Nettoyage des filtres de climatisation', content: 'Il est recommandé de nettoyer les filtres de vos splits tous les mois.' },
];
