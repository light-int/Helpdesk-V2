
import { createClient } from '@supabase/supabase-js';
import { Ticket, Product, Customer, Part, UserProfile, Technician, WarrantyRecord, ShowroomConfig, SystemConfig, StrategicReport, StockMovement, Conversation, Message, IntegrationConfig, AuditLog } from '../types';

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
    if (obj[key] !== undefined && obj[key] !== null) cleaned[key] = obj[key];
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
  'first_fix_rate', 'completed_tickets', 'active_tickets', 'avg_resolution_time', 'performance_history', 'showroom'
];

export const ApiService = {
  dangerouslyClearAll: async () => {
    const tables = ['tickets', 'customers', 'parts', 'products', 'users', 'technicians', 'warranties', 'brands', 'showrooms', 'strategic_reports', 'stock_movements', 'user_connections', 'conversations', 'messages', 'integration_configs', 'audit_logs'];
    for (const table of tables) {
      try {
        await supabase.from(table).delete().not('id', 'is', null);
      } catch (e) {}
    }
  },

  audit: {
    getLogs: async (limit = 50): Promise<AuditLog[]> => {
      return await safeFetch(supabase.from('audit_logs').select('*').order('timestamp', { ascending: false }).limit(limit), []);
    },
    log: async (log: Omit<AuditLog, 'id' | 'timestamp'>) => {
      const { error } = await supabase.from('audit_logs').insert({
        ...log,
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString()
      });
      if (error) console.error("Audit log error:", error);
    }
  },

  integrations: {
    getConfigs: async (): Promise<IntegrationConfig[]> => {
      const data = await safeFetch(supabase.from('integration_configs').select('*').order('name'), []);
      return data.map((item: any) => ({
        id: item.id,
        name: item.name,
        enabled: item.enabled,
        apiKey: item.api_key,
        webhookUrl: item.webhook_url,
        settings: item.settings,
        lastSync: item.last_sync
      }));
    },
    saveConfig: async (config: IntegrationConfig) => {
      const payload = {
        id: config.id,
        name: config.name,
        enabled: config.enabled,
        api_key: config.apiKey,
        webhook_url: config.webhookUrl,
        settings: config.settings,
        updated_at: new Date().toISOString()
      };
      const { error } = await supabase.from('integration_configs').upsert(payload);
      if (error) throw error;
    }
  },

  inbox: {
    getConversations: async (): Promise<Conversation[]> => await safeFetch(supabase.from('conversations').select('*').order('last_activity', { ascending: false }), []),
    getMessages: async (conversationId: string): Promise<Message[]> => await safeFetch(supabase.from('messages').select('*').eq('conversation_id', conversationId).order('timestamp', { ascending: true }), []),
    // Fix: Added missing markAsRead method to support Inbox.tsx
    markAsRead: async (conversationId: string) => {
      const { error } = await supabase.from('conversations').update({ unread_count: 0 }).eq('id', conversationId);
      if (error) throw error;
    },
    sendMessage: async (message: Omit<Message, 'id' | 'timestamp'>) => {
      const { data, error } = await supabase.from('messages').insert(message).select().single();
      if (error) throw error;
      await supabase.from('conversations').update({ 
        last_message: message.content, 
        last_activity: new Date().toISOString() 
      }).eq('id', message.conversation_id);
      return data;
    }
  },

  config: {
    get: async (): Promise<SystemConfig | null> => {
      return await safeFetch(supabase.from('system_config').select('*').eq('id', 'GLOBAL').single(), null);
    },
    update: async (updates: Partial<SystemConfig>) => {
      return supabase.from('system_config').update(updates).eq('id', 'GLOBAL');
    }
  },

  reports: {
    getAll: async (): Promise<StrategicReport[]> => await safeFetch(supabase.from('strategic_reports').select('*').order('createdAt', { ascending: false }), []),
    save: async (report: StrategicReport) => supabase.from('strategic_reports').upsert(report)
  },

  brands: {
    getAll: async (): Promise<string[]> => {
      const data = await safeFetch(supabase.from('brands').select('name').order('name'), []);
      return (data as any[]).map(item => typeof item === 'object' && item !== null ? item.name : item);
    },
    add: async (name: string) => {
      const { error } = await supabase.from('brands').insert({ name });
      if (error) throw error;
    },
    // Fix: Added missing delete method for brands
    delete: async (name: string) => await supabase.from('brands').delete().eq('name', name)
  },

  showrooms: {
    getAll: async (): Promise<ShowroomConfig[]> => {
      const data = await safeFetch(supabase.from('showrooms').select('*').order('id'), []);
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
    }
  },

  tickets: {
    getAll: async () => await safeFetch(supabase.from('tickets').select('*').order('createdAt', { ascending: false }), []),
    saveAll: async (tickets: Ticket[]) => { 
      if (tickets.length > 0) {
        const cleanedTickets = tickets.map(t => cleanObject(t, TICKET_COLUMNS));
        const { error } = await supabase.from('tickets').upsert(cleanedTickets);
        if (error) throw error;
      } 
    },
    delete: async (id: string) => await supabase.from('tickets').delete().eq('id', id)
  },

  products: {
    getAll: async (): Promise<Product[]> => {
      const data = await safeFetch(supabase.from('products').select('*').order('name'), []);
      return (data as any[]).map(p => ({
        ...p,
        image: p.image || p.image_url || null
      }));
    },
    saveAll: async (products: Product[]) => { if (products.length > 0) await supabase.from('products').upsert(products); },
    delete: async (id: string) => await supabase.from('products').delete().eq('id', id)
  },

  customers: {
    getAll: async () => await safeFetch(supabase.from('customers').select('*').order('name'), []),
    saveAll: async (customers: Customer[]) => { 
      if (customers.length > 0) {
        const cleanedCustomers = customers.map(c => cleanObject(c, CUSTOMER_COLUMNS));
        const { error } = await supabase.from('customers').upsert(cleanedCustomers);
        if (error) throw error;
      }
    },
    delete: async (id: string) => await supabase.from('customers').delete().eq('id', id)
  },

  parts: {
    getAll: async () => await safeFetch(supabase.from('parts').select('*').order('name'), []),
    saveAll: async (parts: Part[]) => { if (parts.length > 0) await supabase.from('parts').upsert(parts); },
    delete: async (id: string) => await supabase.from('parts').delete().eq('id', id),
    // Fix: Added missing deleteBulk method to support PartsInventory.tsx
    deleteBulk: async (ids: string[]) => {
      const { error } = await supabase.from('parts').delete().in('id', ids);
      if (error) throw error;
    }
  },

  stockMovements: {
    getAll: async (): Promise<StockMovement[]> => await safeFetch(supabase.from('stock_movements').select('*').order('date', { ascending: false }), []),
    saveAll: async (movements: StockMovement[]) => { if (movements.length > 0) await supabase.from('stock_movements').upsert(movements); }
  },

  technicians: {
    getAll: async (): Promise<Technician[]> => {
      const data = await safeFetch(supabase.from('technicians').select('*').order('name'), []);
      return (data as any[]).map(t => ({
        ...t,
        avatar: t.avatar || t.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(t.name)}&background=1a73e8&color=ffffff`
      }));
    },
    saveAll: async (technicians: Technician[]) => { 
      if (technicians.length > 0) {
        const cleanedTechs = technicians.map(t => cleanObject(t, TECHNICIAN_COLUMNS));
        const { error } = await supabase.from('technicians').upsert(cleanedTechs);
        if (error) throw error;
      }
    },
    // Fix: Added missing delete method for technicians
    delete: async (id: string) => await supabase.from('technicians').delete().eq('id', id)
  },

  warranties: {
    getAll: async () => await safeFetch(supabase.from('warranties').select('*').order('purchaseDate', { ascending: false }), []),
    saveAll: async (warranties: WarrantyRecord[]) => { if (warranties.length > 0) await supabase.from('warranties').upsert(warranties); },
    delete: async (id: string) => await supabase.from('warranties').delete().eq('id', id)
  },

  users: {
    getAll: async (): Promise<UserProfile[]> => await safeFetch(supabase.from('users').select('*').order('name'), []),
    save: async (user: UserProfile) => {
      const cleaned = cleanObject(user, USER_COLUMNS);
      const { data, error } = await supabase.from('users').upsert(cleaned);
      if (error) throw error;
      return data;
    },
    // Fix: Added missing delete method for users
    delete: async (id: string) => await supabase.from('users').delete().eq('id', id),
    logConnection: async (userId: string) => {
      const now = new Date().toISOString();
      await supabase.from('user_connections').insert({
        user_id: userId,
        timestamp: now,
        metadata: { userAgent: navigator.userAgent, platform: navigator.platform }
      });
      await supabase.from('users').update({ lastLogin: now }).eq('id', userId);
    }
  }
};
