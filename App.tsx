
// @google/genai guidelines followed for service initialization and usage elsewhere.
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
  X, AlertCircle, CheckCircle2, Info, AlertTriangle
} from 'lucide-react';
import { Notification, UserProfile, Ticket, Product, Technician, Part, WarrantyRecord, Intervention, Customer, ShowroomConfig, SystemConfig, AuditLog, SyncMetrics, StrategicReport, StockMovement, UserRole, TicketCategory } from './types';
import { PlazaDB, STORAGE_KEYS } from './services/db';
import { ApiService } from './services/apiService';
import { MOCK_TICKETS, MOCK_PRODUCTS, MOCK_CUSTOMERS, MOCK_PARTS, MOCK_USERS, MOCK_TECHNICIANS, MOCK_INTERVENTIONS, MOCK_WARRANTIES, MOCK_SHOWROOMS } from './constants';

export const getGravatarUrl = (email?: string, size: number = 200) => {
  if (!email) return `https://ui-avatars.com/api/?name=User&background=1a73e8&color=ffffff&size=${size}`;
  const hash = md5(email.trim().toLowerCase());
  return `https://www.gravatar.cc/avatar/${hash}?s=${size}&d=identicon&r=g`;
};

const DEFAULT_CONFIG: SystemConfig = {
  aiEnabled: true,
  autoTranslate: false,
  sessionTimeout: 240,
  mfaRequired: false,
  syncFrequency: 'realtime',
  maintenanceMode: false,
  passwordComplexity: 'medium'
};

interface UserContextType {
  currentUser: UserProfile | null;
  login: (user: UserProfile) => void;
  logout: () => void;
  updateUser: (updates: Partial<UserProfile>) => Promise<void>;
}
const UserContext = createContext<UserContextType | undefined>(undefined);

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  removeNotification: (id: string) => void;
}
const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface DataContextType {
  tickets: Ticket[];
  setTickets: React.Dispatch<React.SetStateAction<Ticket[]>>;
  saveTicket: (ticket: Ticket) => Promise<void>;
  deleteTicket: (id: string) => Promise<void>;
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  saveProduct: (product: Product) => Promise<void>;
  saveProductsBulk: (products: Product[]) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  technicians: Technician[];
  setTechnicians: React.Dispatch<React.SetStateAction<Technician[]>>;
  saveTechnician: (technician: Technician) => Promise<void>;
  deleteTechnician: (id: string) => Promise<void>;
  parts: Part[];
  setParts: React.Dispatch<React.SetStateAction<Part[]>>;
  stockMovements: StockMovement[];
  addStockMovement: (movement: Omit<StockMovement, 'id' | 'date'>) => Promise<void>;
  warranties: WarrantyRecord[];
  setWarranties: React.Dispatch<React.SetStateAction<WarrantyRecord[]>>;
  saveWarranty: (warranty: WarrantyRecord) => Promise<void>;
  interventions: Intervention[];
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  saveCustomer: (customer: Customer) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  brands: string[];
  setBrands: React.Dispatch<React.SetStateAction<string[]>>;
  showrooms: ShowroomConfig[];
  setShowrooms: React.Dispatch<React.SetStateAction<ShowroomConfig[]>>;
  saveShowroom: (config: ShowroomConfig) => Promise<void>;
  deleteShowroom: (id: string) => Promise<void>;
  users: UserProfile[];
  setUsers: React.Dispatch<React.SetStateAction<UserProfile[]>>;
  saveUser: (user: UserProfile, techMeta?: { phone?: string, specialties?: TicketCategory[] }) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  reports: StrategicReport[];
  saveReport: (report: StrategicReport) => Promise<void>;
  deleteReport: (id: string) => Promise<void>;
  config: SystemConfig;
  updateConfig: (updates: Partial<SystemConfig>) => void;
  auditLogs: AuditLog[];
  addAuditLog: (action: string, target: string, details: string) => void;
  syncMetrics: SyncMetrics;
  isLoading: boolean;
  isSyncing: boolean;
  isCloudConnected: boolean;
  refreshAll: () => Promise<void>;
  loadDemoData: () => void;
  resetAll: () => void;
}
const DataContext = createContext<DataContextType | undefined>(undefined);

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) throw new Error('useUser must be used within UserProvider');
  return context;
};
export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used within NotificationProvider');
  return context;
};
export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within DataProvider');
  return context;
};

const ProtectedRoute: React.FC<{ children: React.ReactNode, roles?: UserRole[] }> = ({ children, roles }) => {
  const { currentUser } = useUser();
  if (!currentUser) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(currentUser.role)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => PlazaDB.load<UserProfile | null>('auth_user', null));
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCloudConnected, setIsCloudConnected] = useState(true);
  const [syncMetrics, setSyncMetrics] = useState<SyncMetrics>({ lastSuccess: null, latency: null, status: 'CONNECTED', errorCount: 0 });

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [warranties, setWarranties] = useState<WarrantyRecord[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [showrooms, setShowrooms] = useState<ShowroomConfig[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [reports, setReports] = useState<StrategicReport[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  
  const [config, setConfig] = useState<SystemConfig>(() => PlazaDB.load<SystemConfig>('system_config', DEFAULT_CONFIG));

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const addNotification = useCallback((n: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newNotif: Notification = { ...n, id, timestamp: new Date().toISOString(), read: false };
    setNotifications(prev => [newNotif, ...prev]);
    setTimeout(() => removeNotification(id), 6000);
  }, [removeNotification]);

  const refreshAll = async () => {
    setIsSyncing(true);
    setSyncMetrics(prev => ({ ...prev, status: 'SYNCING' }));
    const startTime = performance.now();
    try {
      const [t, p, tech, pt, mov, w, c, b, s, u, r, remoteConfig] = await Promise.all([
        ApiService.tickets.getAll(), ApiService.products.getAll(), ApiService.technicians.getAll(),
        ApiService.parts.getAll(), ApiService.stockMovements.getAll(), ApiService.warranties.getAll(), ApiService.customers.getAll(),
        ApiService.brands.getAll(), ApiService.showrooms.getAll(), ApiService.users.getAll(),
        ApiService.reports.getAll(), ApiService.config.get()
      ]);
      const endTime = performance.now();
      setTickets(t); setProducts(p); setTechnicians(tech); setParts(pt); setStockMovements(mov); setWarranties(w); setCustomers(c); setBrands(b); setShowrooms(s); setUsers(u); setReports(r);
      if (remoteConfig) setConfig(remoteConfig);
      setSyncMetrics({ lastSuccess: new Date().toISOString(), latency: Math.round(endTime - startTime), status: 'CONNECTED', errorCount: 0 });
      setIsCloudConnected(true);
    } catch (error) {
      setSyncMetrics(prev => ({ ...prev, status: 'ERROR', errorCount: prev.errorCount + 1 }));
      setIsCloudConnected(false);
    } finally { setIsSyncing(false); setIsLoading(false); }
  };

  const login = async (user: UserProfile) => { 
    const loginUser = { ...user, lastLogin: new Date().toISOString() }; 
    setCurrentUser(loginUser);
    PlazaDB.save('auth_user', loginUser);
    await ApiService.users.logConnection(user.id);
  };

  const logout = () => {
    setCurrentUser(null);
    PlazaDB.save('auth_user', null);
  };

  const updateUser = async (updates: Partial<UserProfile>) => {
    if (!currentUser) return;
    const updated = { ...currentUser, ...updates };
    setCurrentUser(updated);
    PlazaDB.save('auth_user', updated);
    await ApiService.users.save(updated);
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

  const saveProductsBulk = async (newProducts: Product[]) => {
    await ApiService.products.saveAll(newProducts);
    await refreshAll();
  };

  const deleteProduct = async (id: string) => {
    await ApiService.products.delete(id);
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

  const addStockMovement = async (movement: Omit<StockMovement, 'id' | 'date'>) => {
    const fullMovement: StockMovement = { ...movement, id: `MOV-${Date.now()}`, date: new Date().toISOString() };
    await ApiService.stockMovements.saveAll([fullMovement]);
    const part = parts.find(p => p.id === movement.partId);
    if (part) {
      const newStock = movement.type === 'IN' ? part.currentStock + movement.quantity : part.currentStock - movement.quantity;
      await ApiService.parts.saveAll([{ ...part, currentStock: newStock }]);
    }
    await refreshAll();
  };

  const saveWarranty = async (warranty: WarrantyRecord) => {
    await ApiService.warranties.saveAll([warranty]);
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

  const saveShowroom = async (showroom: ShowroomConfig) => {
    await ApiService.showrooms.save(showroom);
    await refreshAll();
  };

  const deleteShowroom = async (id: string) => {
    await ApiService.showrooms.delete(id);
    await refreshAll();
  };

  const saveUser = async (user: UserProfile, techMeta?: { phone?: string, specialties?: TicketCategory[] }) => {
    await ApiService.users.save(user);
    if (user.role === 'TECHNICIAN') {
      const existingTech = technicians.find(t => t.id === user.id);
      const techData: Technician = {
        id: user.id,
        name: user.name,
        email: user.email || '',
        phone: techMeta?.phone || existingTech?.phone || '',
        avatar: user.avatar,
        showroom: user.showroom,
        status: existingTech?.status || 'Disponible',
        specialty: techMeta?.specialties || existingTech?.specialty || ['SAV'],
        activeTickets: existingTech?.activeTickets || 0,
        completedTickets: existingTech?.completedTickets || 0,
        avgResolutionTime: existingTech?.avgResolutionTime || '0h',
        rating: existingTech?.rating || 5.0,
        nps: existingTech?.nps || 100,
        firstFixRate: existingTech?.firstFixRate || 100,
        performanceHistory: existingTech?.performanceHistory || []
      };
      await ApiService.technicians.saveAll([techData]);
    } else {
      const wasTech = technicians.find(t => t.id === user.id);
      if (wasTech) {
        await ApiService.technicians.delete(user.id);
      }
    }
    await refreshAll();
  };

  const deleteUser = async (id: string) => {
    await ApiService.users.delete(id);
    await ApiService.technicians.delete(id);
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

  const updateConfig = (updates: Partial<SystemConfig>) => {
    const updated = { ...config, ...updates };
    setConfig(updated);
    PlazaDB.save('system_config', updated);
    ApiService.config.update(updated);
  };

  const addAuditLog = (action: string, target: string, details: string) => {
    const log: AuditLog = { id: `LOG-${Date.now()}`, userId: currentUser?.id || 'SYS', userName: currentUser?.name || 'System', action, target, details, timestamp: new Date().toISOString() };
    setAuditLogs(prev => [log, ...prev]);
  };

  const loadDemoData = async () => {
    setIsSyncing(true);
    await ApiService.dangerouslyClearAll();
    await Promise.all([
      ApiService.tickets.saveAll(MOCK_TICKETS), ApiService.products.saveAll(MOCK_PRODUCTS),
      ApiService.customers.saveAll(MOCK_CUSTOMERS), ApiService.parts.saveAll(MOCK_PARTS),
      ApiService.technicians.saveAll(MOCK_TECHNICIANS), ApiService.warranties.saveAll(MOCK_WARRANTIES),
      ApiService.showrooms.save(MOCK_SHOWROOMS[0]), ApiService.showrooms.save(MOCK_SHOWROOMS[1]),
      ApiService.brands.saveAll(['LG', 'Beko', 'Samsung', 'Hisense', 'Royal Plaza'])
    ]);
    await refreshAll();
    addNotification({ title: 'Données Démo', message: 'L\'environnement a été réinitialisé avec les données de test.', type: 'info' });
    setIsSyncing(false);
  };

  const resetAll = async () => {
    if (window.confirm("Voulez-vous vraiment remettre à zéro toute la base de données Cloud ?")) {
      setIsSyncing(true);
      await ApiService.dangerouslyClearAll();
      PlazaDB.reset();
      window.location.reload();
    }
  };

  useEffect(() => {
    refreshAll();
  }, []);

  return (
    <UserContext.Provider value={{ currentUser, login, logout, updateUser }}>
      <NotificationContext.Provider value={{ notifications, addNotification, removeNotification }}>
        <DataContext.Provider value={{
          tickets, setTickets, saveTicket, deleteTicket,
          products, setProducts, saveProduct, saveProductsBulk, deleteProduct,
          technicians, setTechnicians, saveTechnician, deleteTechnician,
          parts, setParts, stockMovements, addStockMovement,
          warranties, setWarranties, saveWarranty,
          interventions: MOCK_INTERVENTIONS, customers, setCustomers, saveCustomer, deleteCustomer,
          brands, setBrands, showrooms, setShowrooms, saveShowroom, deleteShowroom,
          users, setUsers, saveUser, deleteUser,
          reports, saveReport, deleteReport,
          config, updateConfig, auditLogs, addAuditLog, syncMetrics,
          isLoading, isSyncing, isCloudConnected, refreshAll, loadDemoData, resetAll
        }}>
          <HashRouter>
            <div className="flex min-h-screen bg-[#f8f9fa] font-sans text-[#3c4043]">
              {currentUser ? (
                <>
                  <Sidebar />
                  <main className="flex-1 ml-64 p-8 min-h-screen relative">
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/inbox" element={<ProtectedRoute roles={['ADMIN', 'MANAGER', 'AGENT']}><Inbox /></ProtectedRoute>} />
                      <Route path="/tickets" element={<Tickets />} />
                      <Route path="/customers" element={<ProtectedRoute roles={['ADMIN', 'MANAGER', 'AGENT']}><Customers /></ProtectedRoute>} />
                      <Route path="/maintenance" element={<ProtectedRoute roles={['ADMIN', 'MANAGER', 'TECHNICIAN']}><MaintenanceLog /></ProtectedRoute>} />
                      <Route path="/warranties" element={<WarrantyLog />} />
                      <Route path="/parts" element={<ProtectedRoute roles={['ADMIN', 'MANAGER', 'TECHNICIAN']}><PartsInventory /></ProtectedRoute>} />
                      <Route path="/finances" element={<ProtectedRoute roles={['ADMIN', 'MANAGER']}><Finances /></ProtectedRoute>} />
                      <Route path="/technicians" element={<ProtectedRoute roles={['ADMIN', 'MANAGER']}><Technicians /></ProtectedRoute>} />
                      <Route path="/products" element={<ProtectedRoute roles={['ADMIN', 'MANAGER', 'AGENT']}><Products /></ProtectedRoute>} />
                      <Route path="/documentation" element={<Documentation />} />
                      <Route path="/knowledge" element={<KnowledgeBase />} />
                      <Route path="/profile" element={<ProfilePage />} />
                      <Route path="/settings" element={<ProtectedRoute roles={['ADMIN', 'MANAGER']}><Settings /></ProtectedRoute>} />
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

              <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3 w-80 pointer-events-none no-print">
                {notifications.map((n) => (
                  <div 
                    key={n.id} 
                    className="google-card p-4 flex gap-3 shadow-2xl animate-in slide-in-from-right-8 pointer-events-auto border-l-4 bg-white"
                    style={{ 
                      borderColor: n.type === 'success' ? '#34a853' : 
                                  n.type === 'error' ? '#ea4335' : 
                                  n.type === 'warning' ? '#fbbc04' : '#1a73e8' 
                    }}
                  >
                    <div style={{ color: n.type === 'success' ? '#34a853' : 
                                        n.type === 'error' ? '#ea4335' : 
                                        n.type === 'warning' ? '#fbbc04' : '#1a73e8' }}>
                      {n.type === 'success' && <CheckCircle2 size={20} />}
                      {n.type === 'error' && <AlertCircle size={20} />}
                      {n.type === 'warning' && <AlertTriangle size={20} />}
                      {n.type === 'info' && <Info size={20} />}
                    </div>
                    <div className="flex-1">
                       <p className="text-xs font-bold text-[#3c4043]">{n.title}</p>
                       <p className="text-[10px] text-[#5f6368] mt-0.5">{n.message}</p>
                    </div>
                    <button onClick={() => removeNotification(n.id)} className="text-[#dadce0] hover:text-[#5f6368] transition-colors h-fit">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </HashRouter>
          <div id="modal-root"></div>
        </DataContext.Provider>
      </NotificationContext.Provider>
    </UserContext.Provider>
  );
};

export default App;
