
import React, { useState, createContext, useContext, useEffect, useCallback } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import md5 from 'md5';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Inbox from './pages/Inbox';
import Tickets from './pages/Tickets';
import Customers from './pages/Customers';
import MaintenanceLog from './pages/MaintenanceLog';
import WarrantyLog from './pages/WarrantyLog';
import PartsInventory from './pages/PartsInventory';
import Finances from './pages/Finances';
import Technicians from './pages/Technicians';
import KnowledgeBase from './pages/KnowledgeBase';
import Settings from './pages/Settings';
import Products from './pages/Products';
import Documentation from './pages/Documentation';
import ProfilePage from './pages/Profile';
import LoginPage from './pages/Login';
import ChatWidget from './components/ChatWidget';
import { 
  X, AlertCircle, CheckCircle2, AlertTriangle, BellRing
} from 'lucide-react';
import { 
  Notification, UserProfile, Ticket, Product, Technician, 
  Part, WarrantyRecord, Intervention, Customer, ShowroomConfig, 
  SystemConfig, AuditLog, SyncMetrics, StrategicReport, StockMovement, 
  UserRole, TicketCategory 
} from './types';
import { PlazaDB } from './services/db';
import { ApiService } from './services/apiService';

// Define contexts for state sharing across the application
export const UserContext = createContext<{
  currentUser: UserProfile | null;
  login: (user: UserProfile) => void;
  logout: () => void;
  updateUser: (updates: Partial<UserProfile>) => Promise<void>;
} | null>(null);

export const NotificationContext = createContext<{
  notifications: Notification[];
  addNotification: (n: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  removeNotification: (id: string) => void;
} | null>(null);

export const DataContext = createContext<{
  tickets: Ticket[];
  products: Product[];
  technicians: Technician[];
  parts: Part[];
  warranties: WarrantyRecord[];
  customers: Customer[];
  users: UserProfile[];
  brands: string[];
  showrooms: ShowroomConfig[];
  reports: StrategicReport[];
  config: SystemConfig;
  syncMetrics: SyncMetrics;
  isSyncing: boolean;
  isLoading: boolean;
  refreshAll: () => Promise<void>;
  saveTicket: (ticket: Ticket) => Promise<void>;
  deleteTicket: (id: string) => Promise<void>;
  saveProduct: (product: Product) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  saveCustomer: (customer: Customer) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  saveTechnician: (tech: Technician) => Promise<void>;
  deleteTechnician: (id: string) => Promise<void>;
  saveShowroom: (s: ShowroomConfig) => Promise<void>;
  deleteShowroom: (id: string) => Promise<void>;
  updateConfig: (updates: Partial<SystemConfig>) => Promise<void>;
  saveReport: (report: StrategicReport) => Promise<void>;
  deleteReport: (id: string) => Promise<void>;
  saveUser: (user: UserProfile, techMeta?: any) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  addStockMovement: (movement: Omit<StockMovement, 'id' | 'date'>) => Promise<void>;
  deletePart: (id: string) => Promise<void>;
  deletePartsBulk: (ids: string[]) => Promise<void>;
  addBrand: (name: string) => Promise<void>;
  deleteBrand: (name: string) => Promise<void>;
  loadDemoData: () => Promise<void>;
} | null>(null);

// Custom hooks for easy context access
export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) throw new Error('useUser must be used within a UserProvider');
  return context;
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used within a NotificationProvider');
  return context;
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within a DataProvider');
  return context;
};

// Utility to generate Gravatar URL from email
export const getGravatarUrl = (email?: string) => {
  const hash = md5((email || 'anonymous').trim().toLowerCase());
  return `https://www.gravatar.com/avatar/${hash}?d=identicon`;
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => PlazaDB.load('currentUser', null));
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [warranties, setWarranties] = useState<WarrantyRecord[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [showrooms, setShowrooms] = useState<ShowroomConfig[]>([]);
  const [reports, setReports] = useState<StrategicReport[]>([]);
  const [config, setConfig] = useState<SystemConfig>({
    aiEnabled: true,
    aiModel: 'flash',
    aiAutoCategorization: true,
    aiStrategicAudit: true,
    aiChatbotEnabled: true,
    autoTranslate: false,
    sessionTimeout: 60,
    mfaRequired: false,
    syncFrequency: 'realtime',
    maintenanceMode: false,
    passwordComplexity: 'medium'
  });
  const [syncMetrics, setSyncMetrics] = useState<SyncMetrics>({ lastSuccess: null, latency: 0, status: 'CONNECTED', errorCount: 0 });
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const addNotification = useCallback((n: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newNotif = { ...n, id, timestamp: new Date().toISOString(), read: false } as Notification;
    setNotifications(prev => [newNotif, ...prev]);
    setTimeout(() => removeNotification(id), 5000);
  }, [removeNotification]);

  const refreshAll = useCallback(async () => {
    setIsSyncing(true);
    try {
      const [t, p, te, pa, w, c, b, s, r, cf, u] = await Promise.all([
        ApiService.tickets.getAll(),
        ApiService.products.getAll(),
        ApiService.technicians.getAll(),
        ApiService.parts.getAll(),
        ApiService.warranties.getAll(),
        ApiService.customers.getAll(),
        ApiService.brands.getAll(),
        ApiService.showrooms.getAll(),
        ApiService.reports.getAll(),
        ApiService.config.get(),
        ApiService.users.getAll()
      ]);
      setTickets(t);
      setProducts(p);
      setTechnicians(te);
      setParts(pa);
      setWarranties(w);
      setCustomers(c);
      setBrands(b);
      setShowrooms(s);
      setReports(r);
      if (cf) setConfig(cf);
      setUsers(u);
      setSyncMetrics({ lastSuccess: new Date().toISOString(), latency: 45, status: 'CONNECTED', errorCount: 0 });
    } catch (e) {
      setSyncMetrics(prev => ({ ...prev, status: 'ERROR', errorCount: prev.errorCount + 1 }));
    } finally {
      setIsSyncing(false);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const login = (user: UserProfile) => {
    setCurrentUser(user);
    PlazaDB.save('currentUser', user);
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
  };

  const updateUser = async (updates: Partial<UserProfile>) => {
    if (!currentUser) return;
    const updated = { ...currentUser, ...updates };
    await ApiService.users.save(updated);
    setCurrentUser(updated);
    PlazaDB.save('currentUser', updated);
  };

  const saveTicket = async (ticket: Ticket) => {
    await ApiService.tickets.saveAll([ticket]);
    await refreshAll();
  };

  const deleteTicket = async (id: string) => {
    await ApiService.tickets.delete(id);
    await refreshAll();
  };

  const saveProduct = async (product: Product) => {
    await ApiService.products.saveAll([product]);
    await refreshAll();
  };

  const deleteProduct = async (id: string) => {
    await ApiService.products.delete(id);
    await refreshAll();
  };

  const saveCustomer = async (customer: Customer) => {
    await ApiService.customers.saveAll([customer]);
    await refreshAll();
  };

  const deleteCustomer = async (id: string) => {
    await ApiService.customers.delete(id);
    await refreshAll();
  };

  const saveTechnician = async (tech: Technician) => {
    await ApiService.technicians.saveAll([tech]);
    await refreshAll();
  };

  const deleteTechnician = async (id: string) => {
    await ApiService.technicians.delete(id);
    await refreshAll();
  };

  const saveShowroom = async (s: ShowroomConfig) => {
    await ApiService.showrooms.save(s);
    await refreshAll();
  };

  const deleteShowroom = async (id: string) => {
    await ApiService.showrooms.delete(id);
    await refreshAll();
  };

  const updateConfig = async (updates: Partial<SystemConfig>) => {
    await ApiService.config.update(updates);
    await refreshAll();
  };

  const saveReport = async (report: StrategicReport) => {
    await ApiService.reports.save(report);
    await refreshAll();
  };

  const deleteReport = async (id: string) => {
    await ApiService.reports.delete(id);
    await refreshAll();
  };

  const saveUser = async (user: UserProfile, techMeta?: any) => {
    await ApiService.users.save(user);
    if (techMeta && user.role === 'TECHNICIAN') {
       const tech: Technician = {
         id: user.id,
         name: user.name,
         specialty: techMeta.specialties,
         avatar: user.avatar,
         phone: techMeta.phone,
         email: user.email!,
         activeTickets: 0,
         completedTickets: 0,
         avgResolutionTime: '0h',
         rating: 5,
         status: 'Disponible',
         performanceHistory: [],
         showroom: user.showroom
       };
       await ApiService.technicians.saveAll([tech]);
    }
    await refreshAll();
  };

  const deleteUser = async (id: string) => {
    await ApiService.users.delete(id);
    await ApiService.technicians.delete(id);
    await refreshAll();
  };

  const addStockMovement = async (movement: Omit<StockMovement, 'id' | 'date'>) => {
    const fullMovement: StockMovement = {
      ...movement,
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString()
    };
    await ApiService.stockMovements.saveAll([fullMovement]);
    
    // Update part stock locally
    const part = parts.find(p => p.id === movement.partId);
    if (part) {
      const newStock = movement.type === 'IN' ? part.currentStock + movement.quantity : part.currentStock - movement.quantity;
      await ApiService.parts.saveAll([{ ...part, currentStock: newStock }]);
    }
    await refreshAll();
  };

  const deletePart = async (id: string) => {
    await ApiService.parts.delete(id);
    await refreshAll();
  };

  const deletePartsBulk = async (ids: string[]) => {
    await ApiService.parts.deleteBulk(ids);
    await refreshAll();
  };

  const addBrand = async (name: string) => {
    await ApiService.brands.add(name);
    await refreshAll();
  };

  const deleteBrand = async (name: string) => {
    await ApiService.brands.delete(name);
    await refreshAll();
  };

  const loadDemoData = async () => {
    addNotification({ title: 'Simulateur', message: 'Chargement des données de démo...', type: 'info' });
    await refreshAll();
  };

  return (
    <UserContext.Provider value={{ currentUser, login, logout, updateUser }}>
      <NotificationContext.Provider value={{ notifications, addNotification, removeNotification }}>
        <DataContext.Provider value={{
          tickets, products, technicians, parts, warranties, customers, users, brands, showrooms,
          reports, config, syncMetrics, isSyncing, isLoading,
          refreshAll, saveTicket, deleteTicket, saveProduct, deleteProduct,
          saveCustomer, deleteCustomer, saveTechnician, deleteTechnician,
          saveShowroom, deleteShowroom, updateConfig, saveReport, deleteReport,
          saveUser, deleteUser, addStockMovement, deletePart, deletePartsBulk, 
          addBrand, deleteBrand, loadDemoData
        }}>
          <HashRouter>
            <div className="flex min-h-screen bg-[#f8f9fa] text-[#3c4043]">
              {currentUser ? (
                <>
                  <Sidebar />
                  <main className="flex-1 ml-64 p-10 min-h-screen relative overflow-x-hidden">
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/inbox" element={<Inbox />} />
                      <Route path="/tickets" element={<Tickets />} />
                      <Route path="/customers" element={<Customers />} />
                      <Route path="/maintenance" element={<MaintenanceLog />} />
                      <Route path="/warranties" element={<WarrantyLog />} />
                      <Route path="/parts" element={<PartsInventory />} />
                      <Route path="/finances" element={<Finances />} />
                      <Route path="/technicians" element={<Technicians />} />
                      <Route path="/products" element={<Products />} />
                      <Route path="/documentation" element={<Documentation />} />
                      <Route path="/profile" element={<ProfilePage />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route path="/knowledge" element={<KnowledgeBase />} />
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                    <ChatWidget />
                  </main>
                </>
              ) : (
                <div className="w-full">
                  <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="*" element={<Navigate to="/login" replace />} />
                  </Routes>
                </div>
              )}

              {/* TOASTS GOOGLE SHARP BLACK EDITION - CENTER BOTTOM */}
              <div className="fixed bottom-0 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-0 w-full max-w-xl px-0 pointer-events-none pb-8">
                {notifications.map((n) => (
                  <div 
                    key={n.id} 
                    className="bg-[#202124] text-white p-6 pr-16 shadow-2xl flex items-center gap-6 animate-toast-in pointer-events-auto relative border-b border-white/10"
                  >
                    <div style={{ color: n.type === 'success' ? '#81c995' : n.type === 'error' ? '#f28b82' : n.type === 'warning' ? '#fdd663' : '#8ab4f8' }}>
                      {n.type === 'success' && <CheckCircle2 size={28} />}
                      {n.type === 'error' && <AlertCircle size={28} />}
                      {n.type === 'warning' && <AlertTriangle size={28} />}
                      {n.type === 'info' && <BellRing size={28} />}
                    </div>
                    <div className="flex-1 min-w-0">
                       <p className="text-[13px] font-black tracking-widest uppercase">{n.title}</p>
                       <p className="text-[11px] text-gray-400 font-normal leading-relaxed mt-1">{n.message}</p>
                    </div>
                    <button 
                      onClick={() => removeNotification(n.id)} 
                      className="absolute right-6 top-1/2 -translate-y-1/2 p-2 hover:bg-white/10 transition-colors"
                    >
                      <X size={20} />
                    </button>
                    <div 
                      className="absolute bottom-0 left-0 h-1 toast-progress" 
                      style={{ backgroundColor: n.type === 'success' ? '#81c995' : n.type === 'error' ? '#f28b82' : n.type === 'warning' ? '#fdd663' : '#8ab4f8' }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </HashRouter>
        </DataContext.Provider>
      </NotificationContext.Provider>
    </UserContext.Provider>
  );
};

export default App;
