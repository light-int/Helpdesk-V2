
import { createClient } from '@supabase/supabase-js';
import { Ticket, Product, Customer, Part, UserProfile, Technician, WarrantyRecord, ShowroomConfig, SystemConfig, StrategicReport, StockMovement } from '../types';

const SUPABASE_URL = 'https://vdovdwdgqfgxoothhnvo.supabase.co';
const SUPABASE_KEY = 'sb_publishable_aDdviGljTQwmWPPTqKc5Og_BOdN-bvJ';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const safeFetch = async <T>(promise: any, fallback: T): Promise<T> => {
  try {
    const { data, error } = await promise;
    if (error) {
      console.warn("Supabase Fetch Error:", error.message);
      return fallback;
    }
    return (data || fallback) as T;
  } catch (e) {
    console.error("Network Exception:", e);
    return fallback;
  }
};

const cleanObject = (obj: any, allowedKeys: string[]) => {
  const cleaned: any = {};
  allowedKeys.forEach(key => {
    if (obj[key] !== undefined) cleaned[key] = obj[key];
  });
  return cleaned;
};

const TICKET_COLUMNS = [
  'id', 'customerName', 'customerPhone', 'source', 'showroom', 'category', 'status', 'priority', 
  'productReference', 'productName', 'serialNumber', 'description', 'assignedTechnicianId', 
  'createdAt', 'lastUpdate', 'financials', 'customerId', 'brand', 'purchaseDate', 'location', 
  'clientImpact', 'interventionReport', 'isArchived'
];

const CUSTOMER_COLUMNS = [
  'id', 'name', 'phone', 'email', 'type', 'address', 'status', 'totalSpent', 
  'ticketsCount', 'lastVisit', 'companyName', 'isArchived'
];

const USER_COLUMNS = [
  'id', 'name', 'email', 'password', 'role', 'showroom', 'avatar', 'status', 'preferences', 'lastLogin', 'mfaEnabled'
];

const TECHNICIAN_COLUMNS = [
  'id', 'name', 'specialty', 'avatar', 'phone', 'email', 'status', 'rating', 'nps', 
  'firstFixRate', 'completedTickets', 'activeTickets', 'avgResolutionTime', 'performanceHistory', 'showroom'
];

export const ApiService = {
  dangerouslyClearAll: async () => {
    const tables = ['tickets', 'customers', 'parts', 'products', 'users', 'technicians', 'warranties', 'brands', 'showrooms', 'strategic_reports', 'stock_movements', 'user_connections'];
    for (const table of tables) {
      try {
        await supabase.from(table).delete().not('id', 'is', null);
      } catch (e) {}
    }
  },

  config: {
    get: async (): Promise<SystemConfig | null> => {
      return await safeFetch(supabase.from('system_config').select('*').eq('id', 'GLOBAL').single() as any, null);
    },
    update: async (updates: Partial<SystemConfig>) => {
      return supabase.from('system_config').update(updates).eq('id', 'GLOBAL');
    }
  },

  reports: {
    getAll: async (): Promise<StrategicReport[]> => await safeFetch(supabase.from('strategic_reports').select('*').order('createdAt', { ascending: false }) as any, []),
    save: async (report: StrategicReport) => supabase.from('strategic_reports').upsert(report),
    delete: async (id: string) => supabase.from('strategic_reports').delete().eq('id', id)
  },

  brands: {
    getAll: async (): Promise<string[]> => {
      const data = await safeFetch(supabase.from('brands').select('name').order('name') as any, []);
      return (data as any[]).map(item => typeof item === 'object' && item !== null ? item.name : item);
    },
    saveAll: async (brands: string[]) => {
      await supabase.from('brands').delete().not('name', 'is', null);
      await supabase.from('brands').insert(brands.map(name => ({ name })));
    }
  },

  showrooms: {
    getAll: async (): Promise<ShowroomConfig[]> => {
      const data = await safeFetch(supabase.from('showrooms').select('*').order('id') as any, []);
      return (data as any[]).map(row => ({
        id: row.id,
        address: row.address || '',
        phone: row.phone || '',
        hours: row.hours || '',
        isOpen: row.is_active ?? true 
      }));
    },
    save: async (config: ShowroomConfig) => {
      const payload = {
        id: config.id,
        address: config.address,
        phone: config.phone,
        hours: config.hours,
        is_active: config.isOpen 
      };
      return supabase.from('showrooms').upsert(payload);
    },
    delete: async (id: string) => supabase.from('showrooms').delete().eq('id', id)
  },

  tickets: {
    getAll: async () => await safeFetch(supabase.from('tickets').select('*').order('createdAt', { ascending: false }) as any, []),
    saveAll: async (tickets: Ticket[]) => { 
      if (tickets.length > 0) {
        const cleanedTickets = tickets.map(t => cleanObject(t, TICKET_COLUMNS));
        const { error } = await supabase.from('tickets').upsert(cleanedTickets);
        if (error) throw error;
      } 
    },
    delete: async (id: string) => supabase.from('tickets').delete().eq('id', id)
  },

  products: {
    getAll: async () => await safeFetch(supabase.from('products').select('*').order('name') as any, []),
    saveAll: async (products: Product[]) => { if (products.length > 0) await supabase.from('products').upsert(products); },
    delete: async (id: string) => supabase.from('products').delete().eq('id', id)
  },

  customers: {
    getAll: async () => await safeFetch(supabase.from('customers').select('*').order('name') as any, []),
    saveAll: async (customers: Customer[]) => { 
      if (customers.length > 0) {
        const cleanedCustomers = customers.map(c => cleanObject(c, CUSTOMER_COLUMNS));
        const { error } = await supabase.from('customers').upsert(cleanedCustomers);
        if (error) throw error;
      }
    },
    delete: async (id: string) => supabase.from('customers').delete().eq('id', id)
  },

  parts: {
    getAll: async () => await safeFetch(supabase.from('parts').select('*').order('name') as any, []),
    saveAll: async (parts: Part[]) => { if (parts.length > 0) await supabase.from('parts').upsert(parts); },
    delete: async (id: string) => supabase.from('parts').delete().eq('id', id)
  },

  stockMovements: {
    getAll: async (): Promise<StockMovement[]> => await safeFetch(supabase.from('stock_movements').select('*').order('date', { ascending: false }) as any, []),
    saveAll: async (movements: StockMovement[]) => { if (movements.length > 0) await supabase.from('stock_movements').upsert(movements); }
  },

  technicians: {
    getAll: async () => await safeFetch(supabase.from('technicians').select('*').order('name') as any, []),
    saveAll: async (technicians: Technician[]) => { 
      if (technicians.length > 0) {
        const cleanedTechs = technicians.map(t => cleanObject(t, TECHNICIAN_COLUMNS));
        const { error } = await supabase.from('technicians').upsert(cleanedTechs);
        if (error) throw error;
      }
    },
    delete: async (id: string) => supabase.from('technicians').delete().eq('id', id)
  },

  warranties: {
    getAll: async () => await safeFetch(supabase.from('warranties').select('*').order('purchaseDate', { ascending: false }) as any, []),
    saveAll: async (warranties: WarrantyRecord[]) => { if (warranties.length > 0) await supabase.from('warranties').upsert(warranties); },
    delete: async (id: string) => supabase.from('warranties').delete().eq('id', id)
  },

  users: {
    getAll: async (): Promise<UserProfile[]> => await safeFetch(supabase.from('users').select('*') as any, []),
    save: async (user: UserProfile) => {
      const cleaned = cleanObject(user, USER_COLUMNS);
      const { data, error } = await supabase.from('users').upsert(cleaned);
      if (error) {
        console.error("Database upsert error:", error);
        throw error;
      }
      return data;
    },
    delete: async (id: string) => supabase.from('users').delete().eq('id', id),
    logConnection: async (userId: string) => {
      return supabase.from('user_connections').insert({
        user_id: userId,
        timestamp: new Date().toISOString(),
        metadata: {
          userAgent: navigator.userAgent,
          platform: navigator.platform
        }
      });
    },
    getConnectionLogs: async (userId: string) => {
      return await safeFetch(supabase.from('user_connections').select('*').eq('user_id', userId).order('timestamp', { ascending: false }).limit(20) as any, []);
    }
  }
};
