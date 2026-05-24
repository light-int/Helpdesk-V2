import { createClient } from '@supabase/supabase-js';
import { Ticket, Product, Customer, Part, UserProfile, Technician, WarrantyRecord, ShowroomConfig, SystemConfig, StrategicReport, StockMovement, Conversation, Message, IntegrationConfig, AuditLog, Prestation, Team, CashRegister, CashRegisterSession, CashRegisterEntry, WorkshopExpense, FundTransfer, InAppNotification, TicketComment, DiagnosticTemplate, TicketAttachment, ClientCommunication, DocumentTemplate, PushSubscriptionDB } from '../types';

// Import shared supabase client
import { supabase } from './supabaseClient';
const supabaseAuthClient = supabase;

console.log('[apiService] Using supabase client from supabaseClient.ts');

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
  'id', 'customerId', 'customerName', 'customerPhone', 'source', 'showroom',
  'category', 'status', 'priority', 'productReference', 'productName', 'brand',
  'serialNumber', 'purchaseDate', 'clientImpact', 'assignedTechnicianId',
  'createdAt', 'lastUpdate', 'description', 'location', 'interventionLocation', 'financials',
  'interventionReport', 'quotation', 'isArchived', 'createdBy'
];

const CUSTOMER_COLUMNS = [
  'id', 'name', 'phone', 'email', 'type', 'address', 'status', 'totalSpent',
  'ticketsCount', 'lastVisit', 'companyName', 'isArchived', 'createdBy'
];

const USER_COLUMNS = [
  'id', 'name', 'email', 'password', 'role', 'showroom', 'avatar', 'status', 'preferences', 'lastLogin', 'mfaEnabled'
];

const TECHNICIAN_COLUMNS = [
  'id', 'name', 'specialty', 'avatar', 'phone', 'email', 'status', 'rating', 'nps',
  'first_fix_rate', 'completed_tickets', 'active_tickets', 'avg_resolution_time', 'performance_history', 'showroom', 'teamId'
];

const TEAM_COLUMNS = ['id', 'name', 'description', 'createdBy', 'createdAt', 'updatedAt'];

export const ApiService = {
  audit: {
    getLogs: async (limit = 50): Promise<AuditLog[]> => {
      return await safeFetch(supabase.from('audit_logs').select('*').order('timestamp', { ascending: false }).limit(limit), []);
    },
    log: async (log: any) => {
      if (log.userId === 'U-ADMIN-01') return;
      const payload = {
        id: crypto.randomUUID(),
        userId: log.userId,
        userName: log.userName,
        action: log.action,
        target: log.target,
        details: log.details,
        timestamp: new Date().toISOString()
      };
      const { error } = await supabase.from('audit_logs').insert(payload);
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
      return supabase.from('system_config').upsert({ id: 'GLOBAL', ...updates });
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
    delete: async (id: string) => await supabase.from('tickets').delete().eq('id', id),
    reopen: async (ticketId: string, reason: string, user: string): Promise<void> => {
      const { data: ticket } = await supabase.from('tickets').select('*').eq('id', ticketId).single();
      if (!ticket) throw new Error('Ticket not found');
      const updatedHistory = [
        ...(ticket.history || []),
        {
          action: 'Réouverture',
          user,
          timestamp: new Date().toISOString(),
          details: `Dossier réouvert : ${reason}`
        }
      ];
      const { error } = await supabase.from('tickets').update({
        status: 'En cours',
        is_reopened: true,
        reopening_reason: reason,
        history: updatedHistory
      }).eq('id', ticketId);
      if (error) throw error;
    }
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

  productPriceHistory: {
    getByProduct: async (productId: string) => {
      const { data } = await supabase.from('product_price_history').select('*').eq('productId', productId).order('createdAt', { ascending: false });
      return (data || []) as any[];
    },
    add: async (entry: { productId: string; price: number; purchasePrice?: number; createdBy?: string }) => {
      await supabase.from('product_price_history').insert({ id: `PH-${Date.now()}`, ...entry, createdAt: new Date().toISOString() });
    }
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
    delete: async (id: string) => await supabase.from('customers').delete().eq('id', id),
    updateTotalSpent: async (id: string, amount: number) => {
      const { data: current, error: fetchError } = await supabase.from('customers').select('totalSpent').eq('id', id).single();
      if (fetchError) throw fetchError;
      const newTotal = (Number(current?.totalSpent) || 0) + amount;
      const { error: updateError } = await supabase
        .from('customers')
        .update({ totalSpent: newTotal })
        .eq('id', id);
      if (updateError) throw updateError;
    }
  },

  parts: {
    getAll: async () => await safeFetch(supabase.from('parts').select('*').order('name'), []),
    saveAll: async (parts: Part[]) => { if (parts.length > 0) await supabase.from('parts').upsert(parts); },
    delete: async (id: string) => await supabase.from('parts').delete().eq('id', id),
    deleteBulk: async (ids: string[]) => {
      const { error } = await supabase.from('parts').delete().in('id', ids);
      if (error) throw error;
    }
  },

  partSuppliers: {
    getAll: async () => await safeFetch(supabase.from('part_suppliers').select('*').order('purchasePrice'), []),
    saveAll: async (rows: any[]) => { if (rows.length > 0) await supabase.from('part_suppliers').upsert(rows); },
    deleteByPart: async (partId: string) => { await supabase.from('part_suppliers').delete().eq('partId', partId); }
  },

  partCompatibility: {
    getAll: async () => await safeFetch(supabase.from('part_compatibility').select('*'), []),
    saveAll: async (rows: any[]) => { if (rows.length > 0) await supabase.from('part_compatibility').upsert(rows); },
    deleteByPart: async (partId: string) => { await supabase.from('part_compatibility').delete().eq('partId', partId); }
  },

  stockReservations: {
    getAll: async () => await safeFetch(supabase.from('stock_reservations').select('*').order('reservedAt', { ascending: false }), []),
    saveAll: async (rows: any[]) => { if (rows.length > 0) await supabase.from('stock_reservations').upsert(rows); },
    delete: async (id: string) => { await supabase.from('stock_reservations').delete().eq('id', id); }
  },

  physicalInventoryCounts: {
    getAll: async () => await safeFetch(supabase.from('physical_inventory_counts').select('*').order('countedAt', { ascending: false }), []),
    saveAll: async (rows: any[]) => { if (rows.length > 0) await supabase.from('physical_inventory_counts').upsert(rows); }
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

  teams: {
    getAll: async (): Promise<Team[]> => {
      const data = await safeFetch(supabase.from('teams').select('*').order('name'), []);
      return (data as any[]).map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        createdBy: row.created_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
    },
    getByCreator: async (agentId: string): Promise<Team[]> => {
      const data = await safeFetch(supabase.from('teams').select('*').eq('created_by', agentId).order('name'), []);
      return (data as any[]).map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        createdBy: row.created_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
    },
    save: async (team: Team) => {
      const payload = {
        id: team.id,
        name: team.name,
        description: team.description,
        created_by: team.createdBy
      };
      return supabase.from('teams').upsert(payload);
    },
    delete: async (id: string) => {
      const { error } = await supabase.from('teams').delete().eq('id', id);
      if (error) throw error;
    }
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
  },
  prestations: {
    getAll: async (): Promise<Prestation[]> => {
      const data = await safeFetch(supabase.from('prestations').select('*').order('name'), []);
      return (data as any[]).map(p => ({
        id: p.id,
        name: p.name,
        fixedCost: p.fixed_cost
      }));
    },
    save: async (p: Prestation) => {
      const payload = {
        id: p.id,
        name: p.name,
        fixed_cost: p.fixedCost
      };
      const { error } = await supabase.from('prestations').upsert(payload);
      if (error) throw error;
    },
    delete: async (id: string) => await supabase.from('prestations').delete().eq('id', id)
  },

  vehicles: {
    getAll: async () => await safeFetch(supabase.from('vehicles').select('*').order('created_at', { ascending: false }), []),
    saveAll: async (vehicles: any[]) => { if (vehicles.length > 0) await supabase.from('vehicles').upsert(vehicles); },
    delete: async (id: string) => await supabase.from('vehicles').delete().eq('id', id)
  },

  transportMissions: {
    getAll: async () => await safeFetch(supabase.from('transport_missions').select('*').order('created_at', { ascending: false }), []),
    saveAll: async (missions: any[]) => { if (missions.length > 0) await supabase.from('transport_missions').upsert(missions); },
    delete: async (id: string) => await supabase.from('transport_missions').delete().eq('id', id)
  },

  caisse: {
    // --- GESTION DES CAISSES PHYSIQUES ---
    getAllCashRegisters: async (): Promise<CashRegister[]> => {
      const data = await safeFetch(supabase.from('cash_registers').select('*').eq('is_active', true).order('name', { ascending: true }), []);
      return (data as any[]).map((row: any) => ({
        id: row.id,
        name: row.name,
        location: row.location,
        isActive: row.is_active,
        defaultOperatorId: row.default_operator_id,
        showroom: row.showroom,
      }));
    },
    saveCashRegister: async (register: Omit<CashRegister, 'id'>) => {
      const payload = {
        name: register.name,
        location: register.location,
        is_active: register.isActive,
        default_operator_id: register.defaultOperatorId,
        showroom: register.showroom
      };
      const { data, error } = await supabase.from('cash_registers').insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    updateCashRegister: async (id: string, updates: Partial<CashRegister>) => {
      const payload: any = {};
      if (updates.name !== undefined) payload.name = updates.name;
      if (updates.location !== undefined) payload.location = updates.location;
      if (updates.isActive !== undefined) payload.is_active = updates.isActive;
      if (updates.defaultOperatorId !== undefined) payload.default_operator_id = updates.defaultOperatorId;
      if (updates.showroom !== undefined) payload.showroom = updates.showroom;
      const { error } = await supabase.from('cash_registers').update(payload).eq('id', id);
      if (error) throw error;
    },

    // --- GESTION DES SESSIONS DE CAISSE ---
    getActiveSessions: async (): Promise<CashRegisterSession[]> => {
      const { data, error } = await supabase.from('cash_register_sessions').select('*').eq('status', 'Ouverte');
      if (error) throw error;
      return (data as any[]).map(row => ({
        id: row.id,
        cashRegisterId: row.cash_register_id,
        cashRegisterName: row.cash_register_name,
        showroom: row.showroom,
        status: row.status,
        openedAt: row.opened_at,
        closedAt: row.closed_at,
        openingBalance: row.opening_balance,
        closingBalance: row.closing_balance,
        totalReal: row.total_real,
        totalTheoretical: row.total_theoretical,
        variance: row.total_real !== null && row.total_theoretical !== null ? row.total_real - row.total_theoretical : undefined,
        openedBy: row.opened_by,
        openedByName: row.opened_by_name,
        closedBy: row.closed_by,
        closedByName: row.closed_by_name,
        operatorId: row.operator_id,
        operatorName: row.operator_name,
        notes: row.notes
      }));
    },
    getActiveSessionByCashRegister: async (cashRegisterId: string): Promise<CashRegisterSession | null> => {
      const raw = await safeFetch<any>(
        supabase.from('cash_register_sessions').select('*').eq('cash_register_id', cashRegisterId).eq('status', 'Ouverte').maybeSingle(),
        null
      );
      if (!raw) return null;
      return {
        id: raw.id,
        cashRegisterId: raw.cash_register_id,
        cashRegisterName: raw.cash_register_name,
        showroom: raw.showroom,
        status: raw.status,
        openedAt: raw.opened_at,
        closedAt: raw.closed_at,
        openingBalance: raw.opening_balance,
        closingBalance: raw.closing_balance,
        totalReal: raw.total_real,
        totalTheoretical: raw.total_theoretical,
        variance: raw.total_real != null && raw.total_theoretical != null ? raw.total_real - raw.total_theoretical : undefined,
        openedBy: raw.opened_by,
        openedByName: raw.opened_by_name,
        closedBy: raw.closed_by,
        closedByName: raw.closed_by_name,
        operatorId: raw.operator_id,
        operatorName: raw.operator_name,
        notes: raw.notes
      };
    },
    openSession: async (session: Omit<CashRegisterSession, 'id' | 'openedAt'>) => {
      // PROACTIVELY ensure the operator exists in public.users to prevent FK violation
      if (session.operatorId) {
        const { data: existingUser } = await supabase.from('users').select('id').eq('id', session.operatorId).maybeSingle();
        if (!existingUser) {
          console.log(`[openSession] Operator ${session.operatorId} not found in public.users. Creating JIT profile...`);
          await supabase.from('users').insert({
            id: session.operatorId,
            name: session.operatorName || 'Opérateur Système',
            email: session.operatorName?.includes('@') ? session.operatorName : `${session.operatorId}@local.internal`,
            role: 'AGENT',
            status: 'Actif',
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${session.operatorId}`
          });
        }
      }

      const payload = {
        cash_register_id: session.cashRegisterId,
        cash_register_name: session.cashRegisterName,
        status: 'Ouverte',
        opened_at: new Date().toISOString(),
        opening_balance: session.openingBalance,
        opened_by: session.openedBy,
        opened_by_name: session.openedByName,
        operator_id: session.operatorId,
        operator_name: session.operatorName,
        notes: session.notes,
        showroom: session.showroom
      };
      const { data, error } = await supabase.from('cash_register_sessions').insert(payload).select().single();
      if (error) throw error;

      await ApiService.audit.log({
        userId: session.openedBy,
        userName: session.openedByName || 'Unknown',
        action: 'OPEN_SESSION',
        target: `Caisse: ${session.cashRegisterName}`,
        details: `Ouverture de caisse avec solde initial: ${session.openingBalance} FCFA`
      });

      return data;
    },
    closeSession: async (id: string, closingData: { closingBalance: number, totalReal: number, totalTheoretical: number, closedBy: string, closedByName?: string, notes?: string }) => {
      const payload = {
        status: 'Fermée',
        closed_at: new Date().toISOString(),
        closing_balance: closingData.closingBalance,
        total_real: closingData.totalReal,
        total_theoretical: closingData.totalTheoretical,
        closed_by: closingData.closedBy,
        closed_by_name: closingData.closedByName,
        notes: closingData.notes
      };
      const { error } = await supabase.from('cash_register_sessions').update(payload).eq('id', id);
      if (error) throw error;

      await ApiService.audit.log({
        userId: closingData.closedBy,
        userName: closingData.closedByName || 'Système',
        action: 'CLOSE_SESSION',
        target: `Session: ${id}`,
        details: `Clôture. Solde final: ${closingData.closingBalance} FCFA, Écart: ${(closingData.totalReal - closingData.totalTheoretical)} FCFA`
      });
    },
    addEntry: async (entry: Omit<CashRegisterEntry, 'id' | 'timestamp'>) => {
      const payload = {
        id: crypto.randomUUID(),
        session_id: entry.sessionId,
        cash_register_id: entry.cashRegisterId,
        ticket_id: entry.ticketId,
        type: entry.type,
        amount: entry.amount,
        method: entry.method,
        timestamp: new Date().toISOString(),
        recorded_by: entry.recordedBy,
        recorded_by_name: entry.recordedByName,
        customer_name: entry.customerName,
        notes: entry.notes
      };
      const { data, error } = await supabase.from('cash_register_entries').insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    getEntriesBySession: async (sessionId: string): Promise<CashRegisterEntry[]> => {
      const { data, error } = await supabase.from('cash_register_entries').select('*').eq('session_id', sessionId).order('timestamp', { ascending: false });
      if (error) throw error;
      return (data as any[]).map(row => ({
        id: row.id,
        sessionId: row.session_id,
        cashRegisterId: row.cash_register_id,
        ticketId: row.ticket_id,
        customerName: row.customer_name,
        type: row.type,
        amount: row.amount,
        method: row.method,
        timestamp: row.timestamp,
        recordedBy: row.recorded_by,
        recordedByName: row.recorded_by_name,
        notes: row.notes,
        verified: row.verified,
        verifiedBy: row.verified_by,
        verifiedAt: row.verified_at
      }));
    },
    getSessionWithEntries: async (sessionId: string): Promise<(CashRegisterSession & { entries: CashRegisterEntry[] }) | null> => {
      const { data: sessionData, error: sessionError } = await supabase
        .from('cash_register_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();
      if (sessionError) throw sessionError;
      if (!sessionData) return null;
      const { data: entriesData, error: entriesError } = await supabase
        .from('cash_register_entries')
        .select('*')
        .eq('session_id', sessionId)
        .order('timestamp', { ascending: false });
      if (entriesError) throw entriesError;
      const entries: CashRegisterEntry[] = (entriesData || []).map((row: any) => ({
        id: row.id,
        sessionId: row.session_id,
        cashRegisterId: row.cash_register_id,
        ticketId: row.ticket_id,
        customerName: row.customer_name,
        type: row.type,
        amount: row.amount,
        method: row.method,
        timestamp: row.timestamp,
        recordedBy: row.recorded_by,
        recordedByName: row.recorded_by_name,
        notes: row.notes,
        verified: row.verified,
        verifiedBy: row.verified_by,
        verifiedAt: row.verified_at
      }));
      const totalReal = entries.reduce((sum, e) => sum + Number(e.amount), 0);
      return {
        ...sessionData,
        id: sessionData.id,
        cashRegisterId: sessionData.cash_register_id,
        cashRegisterName: sessionData.cash_register_name,
        showroom: sessionData.showroom,
        status: sessionData.status,
        openedAt: sessionData.opened_at,
        closedAt: sessionData.closed_at,
        openingBalance: sessionData.opening_balance,
        closingBalance: sessionData.closing_balance,
        totalReal,
        totalTheoretical: sessionData.total_theoretical,
        variance: sessionData.total_real !== null && sessionData.total_theoretical !== null ? sessionData.total_real - sessionData.total_theoretical : undefined,
        openedBy: sessionData.opened_by,
        openedByName: sessionData.opened_by_name,
        closedBy: sessionData.closed_by,
        closedByName: sessionData.closed_by_name,
        operatorId: sessionData.operator_id,
        operatorName: sessionData.operator_name,
        notes: sessionData.notes,
        entries
      };
    },
    getAllSessions: async (cashRegisterId?: string): Promise<CashRegisterSession[]> => {
      let query = supabase.from('cash_register_sessions').select('*').order('opened_at', { ascending: false });
      if (cashRegisterId) {
        query = query.eq('cash_register_id', cashRegisterId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data as any[]).map(row => ({
        id: row.id,
        cashRegisterId: row.cash_register_id,
        cashRegisterName: row.cash_register_name,
        showroom: row.showroom,
        status: row.status,
        openedAt: row.opened_at,
        closedAt: row.closed_at,
        openingBalance: row.opening_balance,
        closingBalance: row.closing_balance,
        totalReal: row.total_real,
        totalTheoretical: row.total_theoretical,
        variance: row.total_real !== null && row.total_theoretical !== null ? row.total_real - row.total_theoretical : undefined,
        openedBy: row.opened_by,
        openedByName: row.opened_by_name,
        closedBy: row.closed_by,
        closedByName: row.closed_by_name,
        operatorId: row.operator_id,
        operatorName: row.operator_name,
        notes: row.notes
      }));
    },
    getWeeklyEntries: async (startDate: string, endDate: string, cashRegisterId?: string): Promise<CashRegisterEntry[]> => {
      let query = supabase
        .from('cash_register_entries')
        .select('*')
        .gte('timestamp', startDate)
        .lte('timestamp', endDate)
        .order('timestamp', { ascending: false });
      if (cashRegisterId) {
        query = query.eq('cash_register_id', cashRegisterId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data as any[]).map(row => ({
        id: row.id,
        sessionId: row.session_id,
        cashRegisterId: row.cash_register_id,
        ticketId: row.ticket_id,
        customerName: row.customer_name,
        type: row.type,
        amount: row.amount,
        method: row.method,
        timestamp: row.timestamp,
        recordedBy: row.recorded_by,
        recordedByName: row.recorded_by_name,
        notes: row.notes,
        verified: row.verified,
        verifiedBy: row.verified_by,
        verifiedAt: row.verified_at
      }));
    },
    getAllEntries: async (): Promise<CashRegisterEntry[]> => {
      const { data, error } = await supabase.from('cash_register_entries').select('*').order('timestamp', { ascending: false });
      if (error) throw error;
      return (data as any[]).map(row => ({
        id: row.id,
        sessionId: row.session_id,
        cashRegisterId: row.cash_register_id,
        ticketId: row.ticket_id,
        customerName: row.customer_name,
        type: row.type,
        amount: row.amount,
        method: row.method,
        timestamp: row.timestamp,
        recordedBy: row.recorded_by,
        recordedByName: row.recorded_by_name,
        notes: row.notes,
        verified: row.verified,
        verifiedBy: row.verified_by,
        verifiedAt: row.verified_at
      }));
    },
    generateInvoiceNumber: async (): Promise<string> => {
      const year = new Date().getFullYear();
      const { data, error } = await supabase.rpc('generate_invoice_number');
      if (error) throw error;
      return `FAC-${year}-${data.toString().padStart(4, '0')}`;
    }
  },

  expenses: {
    getAll: async (): Promise<WorkshopExpense[]> => {
      const { data, error } = await supabase.from('workshop_expenses').select('*').order('date', { ascending: false });
      if (error) throw error;
      return (data as any[]).map((row: any) => ({
        id: row.id,
        type: row.type,
        amount: row.amount,
        date: row.date,
        description: row.description,
        recordedBy: row.recorded_by
      }));
    },
    save: async (expense: Partial<WorkshopExpense>): Promise<WorkshopExpense> => {
      const payload = {
        id: expense.id || crypto.randomUUID(),
        type: expense.type,
        amount: expense.amount,
        date: expense.date,
        description: expense.description,
        recorded_by: expense.recordedBy
      };
      const { data, error } = await supabase.from('workshop_expenses').upsert(payload).select().single();
      if (error) {
        console.error("Supabase Save Expense Error:", error);
        throw error;
      }
      return {
        id: data.id,
        type: data.type,
        amount: data.amount,
        date: data.date,
        description: data.description,
        recordedBy: data.recorded_by
      };
    },
    delete: async (id: string): Promise<void> => {
      const { error } = await supabase.from('workshop_expenses').delete().eq('id', id);
      if (error) throw error;
    }
  },

  transfers: {
    getAll: async (): Promise<FundTransfer[]> => {
      const { data, error } = await supabase.from('fund_transfers').select('*').order('date', { ascending: false });
      if (error) throw error;
      return (data as any[]).map(row => ({
        id: row.id,
        amount: row.amount,
        date: row.date,
        status: row.status,
        fromAgent: row.from_agent,
        toManager: row.to_manager,
        notes: row.notes
      }));
    },
    save: async (transfer: Partial<FundTransfer>): Promise<FundTransfer> => {
      const payload = {
        id: transfer.id || crypto.randomUUID(),
        amount: transfer.amount,
        date: transfer.date,
        status: transfer.status,
        from_agent: transfer.fromAgent,
        to_manager: transfer.toManager,
        notes: transfer.notes
      };
      const { data, error } = await supabase.from('fund_transfers').upsert(payload).select().single();
      if (error) {
        console.error("Supabase Save Transfer Error:", error);
        throw error;
      }

      if (!transfer.id) {
        await ApiService.audit.log({
          userId: transfer.fromAgent || '',
          userName: 'Opérateur',
          action: 'FUND_TRANSFER',
          target: `Manager: ${transfer.toManager}`,
          details: `Transfert de fonds initié: ${transfer.amount} FCFA`
        });
      }

      return {
        id: data.id,
        amount: data.amount,
        date: data.date,
        status: data.status,
        fromAgent: data.from_agent,
        toManager: data.to_manager,
        notes: data.notes
      };
    },
    updateStatus: async (id: string, status: 'Validé' | 'Rejeté'): Promise<void> => {
      const { error } = await supabase.from('fund_transfers').update({ status }).eq('id', id);
      if (error) throw error;
    }
  },
  notifications: {
    getByUser: async (userId: string): Promise<InAppNotification[]> => {
      const data = await safeFetch(supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }), []);
      return data.map((n: any) => ({
        id: n.id,
        userId: n.user_id,
        type: n.type,
        message: n.message,
        isRead: n.is_read,
        link: n.link,
        createdAt: n.created_at
      }));
    },
    markAsRead: async (id: string) => {
      await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    },
    send: async (notif: Omit<InAppNotification, 'id' | 'createdAt' | 'isRead'>) => {
      await supabase.from('notifications').insert({
        user_id: notif.userId,
        type: notif.type,
        message: notif.message,
        link: notif.link,
        is_read: false
      });
    }
  },
  ticketComments: {
    getByTicket: async (ticketId: string): Promise<TicketComment[]> => {
      const data = await safeFetch(supabase.from('ticket_comments').select('*').eq('ticket_id', ticketId).order('created_at', { ascending: true }), []);
      return data.map((c: any) => ({
        id: c.id,
        ticketId: c.ticket_id,
        authorId: c.author_id,
        authorName: c.author_name,
        content: c.content,
        createdAt: c.created_at
      }));
    },
    add: async (comment: Omit<TicketComment, 'id' | 'createdAt'>) => {
      const { data, error } = await supabase.from('ticket_comments').insert({
        ticket_id: comment.ticketId,
        author_id: comment.authorId,
        author_name: comment.authorName,
        content: comment.content
      }).select().single();
      if (error) throw error;
      return data;
    }
  },
  diagnosticTemplates: {
    getAll: async (): Promise<DiagnosticTemplate[]> => {
      const data = await safeFetch(supabase.from('diagnostic_templates').select('*').order('category'), []);
      return data.map((t: any) => ({
        id: t.id,
        category: t.category,
        title: t.title || `${t.category} - Template`,
        content: t.content || t.text || '',
        recommendations: t.recommendations,
        createdAt: t.created_at
      }));
    }
  },
  clientCommunications: {
    getByTicket: async (ticketId: string): Promise<ClientCommunication[]> => {
      const data = await safeFetch(supabase.from('client_communications').select('*').eq('ticket_id', ticketId).order('created_at', { ascending: false }), []);
      return data.map((c: any) => ({
        id: c.id,
        ticketId: c.ticket_id,
        type: c.type,
        summary: c.summary,
        authorId: c.author_id,
        createdAt: c.created_at
      }));
    },
    add: async (comm: Omit<ClientCommunication, 'id' | 'createdAt'>) => {
      const { data, error } = await supabase.from('client_communications').insert({
        ticket_id: comm.ticketId,
        type: comm.type,
        summary: comm.summary,
        author_id: comm.authorId
      }).select().single();
      if (error) throw error;
      return data;
    }
  },
  ticketAttachments: {
    getByTicket: async (ticketId: string): Promise<TicketAttachment[]> => {
      const data = await safeFetch(supabase.from('ticket_attachments').select('*').eq('ticket_id', ticketId).order('created_at', { ascending: false }), []);
      return data.map((a: any) => ({
        id: a.id,
        ticketId: a.ticket_id,
        fileName: a.file_name,
        fileUrl: a.file_url,
        fileType: a.file_type,
        uploadedBy: a.uploaded_by,
        createdAt: a.created_at
      }));
    },
    add: async (attachment: Omit<TicketAttachment, 'id' | 'createdAt'>) => {
      const { data, error } = await supabase.from('ticket_attachments').insert({
        ticket_id: attachment.ticketId,
        file_name: attachment.fileName,
        file_url: attachment.fileUrl,
        file_type: attachment.fileType,
        uploaded_by: attachment.uploadedBy
      }).select().single();
      if (error) throw error;
      return data;
    }
  },

  // --- MODULE TICKETS ENHANCED ---
  ticketTags: {
    getAll: async () => await safeFetch(supabase.from('ticket_tags').select('*').order('createdAt', { ascending: false }), []),
    saveAll: async (rows: any[]) => { if (rows.length > 0) await supabase.from('ticket_tags').upsert(rows); },
    delete: async (id: string) => { await supabase.from('ticket_tags').delete().eq('id', id); }
  },

  slaMetrics: {
    getAll: async () => await safeFetch(supabase.from('sla_metrics').select('*'), []),
    saveAll: async (rows: any[]) => { if (rows.length > 0) await supabase.from('sla_metrics').upsert(rows); },
    deleteByTicket: async (ticketId: string) => { await supabase.from('sla_metrics').delete().eq('ticketId', ticketId); }
  },

  ticketMerges: {
    getAll: async () => await safeFetch(supabase.from('ticket_merges').select('*').order('mergedAt', { ascending: false }), []),
    saveAll: async (rows: any[]) => { if (rows.length > 0) await supabase.from('ticket_merges').upsert(rows); },
    merge: async (sourceId: string, targetId: string, mergedBy: string) => {
      const { error } = await supabase.from('ticket_merges').insert({
        sourceTicketId: sourceId,
        targetTicketId: targetId,
        mergedBy
      });
      if (error) throw error;
    }
  },

  // --- MODULE CLIENTS ENHANCED ---
  customerTimeline: {
    getAll: async () => await safeFetch(supabase.from('customer_timeline').select('*').order('date', { ascending: false }), []),
    getByCustomer: async (customerId: string) => await safeFetch(supabase.from('customer_timeline').select('*').eq('customerId', customerId).order('date', { ascending: false }), []),
    saveAll: async (rows: any[]) => { if (rows.length > 0) await supabase.from('customer_timeline').upsert(rows); },
    add: async (entry: any) => { await supabase.from('customer_timeline').insert(entry); }
  },

  customerSegments: {
    getAll: async () => await safeFetch(supabase.from('customer_segments').select('*'), []),
    getByCustomer: async (customerId: string) => await safeFetch(supabase.from('customer_segments').select('*').eq('customerId', customerId), []),
    saveAll: async (rows: any[]) => { if (rows.length > 0) await supabase.from('customer_segments').upsert(rows); }
  },

  customerPortals: {
    getAll: async () => await safeFetch(supabase.from('customer_portals').select('*'), []),
    getByCustomer: async (customerId: string) => await safeFetch(supabase.from('customer_portals').select('*').eq('customerId', customerId).single(), null),
    generate: async (customerId: string) => {
      const token = `PORTAL-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      const { data, error } = await supabase.from('customer_portals').insert({
        customerId,
        accessToken: token,
        qrCode: null,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      }).select().single();
      if (error) throw error;
      return data;
    }
  },

  communicationLogs: {
    getAll: async () => await safeFetch(supabase.from('communication_logs').select('*').order('sentAt', { ascending: false }), []),
    getByCustomer: async (customerId: string) => await safeFetch(supabase.from('communication_logs').select('*').eq('customerId', customerId).order('sentAt', { ascending: false }), []),
    add: async (log: any) => { await supabase.from('communication_logs').insert(log); }
  },

  // --- MODULE TECHNICIENS ENHANCED ---
  technicianSchedules: {
    getAll: async () => await safeFetch(supabase.from('technician_schedules').select('*').order('startTime'), []),
    getByTechnician: async (technicianId: string) => await safeFetch(supabase.from('technician_schedules').select('*').eq('technicianId', technicianId).order('startTime'), []),
    saveAll: async (rows: any[]) => { if (rows.length > 0) await supabase.from('technician_schedules').upsert(rows); },
    delete: async (id: string) => { await supabase.from('technician_schedules').delete().eq('id', id); }
  },

  technicianMetrics: {
    getAll: async () => await safeFetch(supabase.from('technician_metrics').select('*').order('period', { ascending: false }), []),
    getByTechnician: async (technicianId: string) => await safeFetch(supabase.from('technician_metrics').select('*').eq('technicianId', technicianId).order('period', { ascending: false }), []),
    saveAll: async (rows: any[]) => { if (rows.length > 0) await supabase.from('technician_metrics').upsert(rows); }
  },

  // --- MODULE DASHBOARD ---
  dashboardWidgets: {
    getAll: async () => await safeFetch(supabase.from('dashboard_widgets').select('*').order('position'), []),
    getByUser: async (userId: string) => await safeFetch(supabase.from('dashboard_widgets').select('*').eq('userId', userId).order('position'), []),
    saveAll: async (rows: any[]) => { if (rows.length > 0) await supabase.from('dashboard_widgets').upsert(rows); },
    delete: async (id: string) => { await supabase.from('dashboard_widgets').delete().eq('id', id); }
  },

  automatedReports: {
    getAll: async () => await safeFetch(supabase.from('automated_reports').select('*'), []),
    saveAll: async (rows: any[]) => { if (rows.length > 0) await supabase.from('automated_reports').upsert(rows); },
    delete: async (id: string) => { await supabase.from('automated_reports').delete().eq('id', id); }
  },

  analytics: {
    getTicketsSummary: async () => await safeFetch(supabase.from('view_tickets_summary').select('*'), []),
    getTechPerformance: async () => await safeFetch(supabase.from('view_tech_performance_current_month').select('*'), [])
  },
  templates: {
    getAll: async (): Promise<DocumentTemplate[]> => {
      const data = await safeFetch(supabase.from('document_templates').select('*').order('created_at', { ascending: false }), []);
      return (data as any[]).map(row => ({
        id: row.id,
        name: row.name,
        type: row.type,
        isActive: row.is_active,
        headerContent: row.header_content,
        footerContent: row.footer_content,
        termsConditions: row.terms_conditions,
        logoUrl: row.logo_url,
        primaryColor: row.primary_color,
        fontFamily: row.font_family,
        createdAt: row.created_at
      }));
    },
    save: async (template: DocumentTemplate) => {
      const payload = {
        id: template.id,
        name: template.name,
        type: template.type,
        is_active: template.isActive,
        header_content: template.headerContent,
        footer_content: template.footerContent,
        terms_conditions: template.termsConditions,
        logo_url: template.logoUrl,
        primary_color: template.primaryColor,
        font_family: template.fontFamily,
        updated_at: new Date().toISOString()
      };
      if (template.isActive) {
        // Deactivate other templates of the same type if this one is active
        await supabase.from('document_templates').update({ is_active: false }).eq('type', template.type);
      }
      return supabase.from('document_templates').upsert(payload);
    },
    delete: async (id: string) => await supabase.from('document_templates').delete().eq('id', id)
  },
  system: {
    hardReset: async () => {
      const tables = [
        'tickets',
        'customers',
        'products',
        'parts',
        'stock_movements',
        'technicians',
        'warranties',
        'user_connections',
        'audit_logs',
        'strategic_reports',
        'conversations',
        'messages',
        'cash_registers',
        'cash_register_sessions',
        'cash_register_entries',
        'workshop_expenses',
        'fund_transfers',
        'notifications',
        'prestations',
        'document_templates',
        'vehicles',
        'transport_missions'
      ];

      for (const table of tables) {
        try {
          // Utiliser une condition toujours vraie pour contourner la protection Supabase qui empêche DELETE sans filtre
          const { error } = await supabase.from(table).delete().neq('id', 'HARD-RESET-NON-EXISTENT-ID');
          if (error) {
            console.warn(`[HardReset] Error clearing ${table}:`, error.message);
          }
        } catch (e) {
          console.error(`[HardReset] Exception clearing ${table}:`, e);
        }
      }

      // Réinitialiser la configuration système par défaut
      await supabase.from('system_config').upsert({
        id: 'GLOBAL',
        aiEnabled: true, aiProvider: 'google', aiModel: 'flash', aiAutoCategorization: true, aiStrategicAudit: true,
        aiChatbotEnabled: true, autoTranslate: false, sessionTimeout: 60, mfaRequired: false,
        syncFrequency: 'realtime', maintenanceMode: false, passwordComplexity: 'medium'
      });

      // Enregistrer l'opération dans l'audit (après avoir vidé la table)
      await supabase.from('audit_logs').insert({
        action: 'HARD_RESET',
        entity_id: 'SYSTEM',
        author: 'ADMIN',
        details: 'Réinitialisation complète de la base de données opérationnelle.',
        timestamp: new Date().toISOString()
      });

      return true;
    }
  },
  pushSubscriptions: {
    save: async (userId: string, subscription: PushSubscription): Promise<void> => {
      const sub = subscription.toJSON();
      await supabase.from('push_subscriptions').upsert({
        user_id: userId,
        endpoint: sub.endpoint || '',
        p256dh: (sub.keys as any)?.p256dh || '',
        auth: (sub.keys as any)?.auth || '',
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });
    },
    getByUser: async (userId: string): Promise<PushSubscriptionDB | null> => {
      const { data } = await supabase.from('push_subscriptions').select('*').eq('user_id', userId).single();
      if (!data) return null;
      return {
        id: data.id,
        userId: data.user_id,
        endpoint: data.endpoint,
        p256dh: data.p256dh,
        auth: data.auth,
        createdAt: data.created_at
      };
    },
    remove: async (userId: string): Promise<void> => {
      await supabase.from('push_subscriptions').delete().eq('user_id', userId);
    }
  }
};

export default ApiService;
