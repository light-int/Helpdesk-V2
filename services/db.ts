
import { Ticket, Product, Technician, Part, WarrantyRecord, Intervention, Customer, UserProfile } from '../types';

const STORAGE_KEYS = {
  TICKETS: 'plaza_tickets',
  PRODUCTS: 'plaza_products',
  TECHNICIANS: 'plaza_technicians',
  PARTS: 'plaza_parts',
  WARRANTIES: 'plaza_warranties',
  INTERVENTIONS: 'plaza_interventions',
  CUSTOMERS: 'plaza_customers',
  BRANDS: 'plaza_brands',
  USERS: 'plaza_users',
  INIT: 'plaza_initialized_v5'
};

export const PlazaDB = {
  save: (key: string, data: any) => {
    localStorage.setItem(key, JSON.stringify(data));
  },

  load: <T>(key: string, defaultValue: T): T => {
    const stored = localStorage.getItem(key);
    try {
      return stored ? JSON.parse(stored) : defaultValue;
    } catch (e) {
      return defaultValue;
    }
  },

  // Retourne des tableaux vides par défaut pour permettre le mode "Zéro Donnée"
  init: () => {
    return {
      tickets: PlazaDB.load<Ticket[]>(STORAGE_KEYS.TICKETS, []),
      products: PlazaDB.load<Product[]>(STORAGE_KEYS.PRODUCTS, []),
      technicians: PlazaDB.load<Technician[]>(STORAGE_KEYS.TECHNICIANS, []),
      parts: PlazaDB.load<Part[]>(STORAGE_KEYS.PARTS, []),
      warranties: PlazaDB.load<WarrantyRecord[]>(STORAGE_KEYS.WARRANTIES, []),
      interventions: PlazaDB.load<Intervention[]>(STORAGE_KEYS.INTERVENTIONS, []),
      customers: PlazaDB.load<Customer[]>(STORAGE_KEYS.CUSTOMERS, []),
      brands: PlazaDB.load<string[]>(STORAGE_KEYS.BRANDS, ['LG', 'Beko', 'Samsung', 'Hisense', 'Royal Plaza']),
      users: PlazaDB.load<UserProfile[]>(STORAGE_KEYS.USERS, [])
    };
  },

  reset: () => {
    Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
    localStorage.removeItem('plaza_initialized');
    localStorage.removeItem('plaza_initialized_v2');
    localStorage.removeItem('plaza_initialized_v3');
    localStorage.removeItem('plaza_initialized_v4');
    localStorage.removeItem('plaza_initialized_v5');
  }
};

export { STORAGE_KEYS };
