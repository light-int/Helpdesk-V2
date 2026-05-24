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
    // Local storage persistence has been removed - relies completely on API connection/DB
  },

  load: <T>(key: string, defaultValue: T): T => {
    return defaultValue;
  },

  init: () => {
    return {
      tickets: [],
      products: [],
      technicians: [],
      parts: [],
      warranties: [],
      interventions: [],
      customers: [],
      brands: ['LG', 'Beko', 'Samsung', 'Hisense', 'Royal Plaza'],
      users: []
    };
  },

  reset: () => {
    // Local storage has been removed
  }
};

export { STORAGE_KEYS };
