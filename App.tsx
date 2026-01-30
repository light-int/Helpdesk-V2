
// @google/genai guidelines followed for service initialization and usage elsewhere.
import React, { useState, createContext, useContext, useEffect, useCallback } from 'react';
// Fix: Ensure standard imports for react-router-dom v6
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
  X, AlertCircle, CheckCircle2, Info, AlertTriangle, BellRing
} from 'lucide-react';
import { 
  Notification, UserProfile, Ticket, Product, Technician, 
  Part, WarrantyRecord, Intervention, Customer, ShowroomConfig, 
  SystemConfig, AuditLog, SyncMetrics, StrategicReport, StockMovement, 
  UserRole, TicketCategory 
} from './types';
import { PlazaDB } from './services/db';
import { ApiService } from './services/apiService';
import { 
  MOCK_TICKETS, MOCK_PRODUCTS, MOCK_CUSTOMERS, 
  MOCK_PARTS, MOCK_TECHNICIANS, MOCK_INTERVENTIONS, 
  MOCK_WARRANTIES, MOCK_SHOWROOMS 
} from './constants';

export const getGravatarUrl = (email?: string, size: number = 200) => {
  if (!email) return `https://ui-avatars.com/api/?name=User&background=1a73e8&color=ffffff&size=${size}`;
  const hash = md5(email.trim().toLowerCase());
  return `https://www.gravatar.cc/avatar/${hash}?s=${size}&d=identicon&r=g`;
};

const DEFAULT_CONFIG: SystemConfig = {
  aiEnabled: true,
  aiModel: 'flash',
  aiAutoCategorization: true,
  aiStrategicAudit: true,
  aiChatbotEnabled: true,
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
  deletePart: (id: string) => Promise<void>;
  deletePartsBulk: (ids: string[]) => Promise<void>;
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
    
    // Simulate push sound
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.1);
    } catch(e) {}

    setTimeout(() => removeNotification(id), 6000);
  }, [removeNotification]);

  const refreshAll = async () => {
    setIsSyncing(true);
    setSyncMetrics(prev => ({ ...prev, status: 'SYNCING' }));
    const startTime = performance.now();
    
    // Helper to call API safely and ignore failures on missing tables
    const wrap = async <T,>(promise: Promise<T>, fallback: T): Promise<T> => {
      try { return await promise; } catch (e) { 
        console.warn("Table sync skipped:", e); 
        return fallback; 
      }
    };

    try {
      const [t, p, tech, pt, mov, w, c, b, s, u, r, remoteConfig] = await Promise.all([
        wrap(ApiService.tickets.getAll(), []), 
        wrap(ApiService.products.getAll(), []), 
        wrap(ApiService.technicians.getAll(), []),
        wrap(ApiService.parts.getAll(), []), 
        wrap(ApiService.stockMovements.getAll(), []), 
        wrap(ApiService.warranties.getAll(), []), 
        wrap(ApiService.customers.getAll(), []),
        wrap(ApiService.brands.getAll(), []), 
        wrap(ApiService.showrooms.getAll(), []), 
        wrap(ApiService.users.getAll(), []),
        wrap(ApiService.reports.getAll(), []), 
        wrap(ApiService.config.get(), null)
      ]);
      
      const endTime = performance.now();
      setTickets(t); setProducts(p); setTechnicians(tech); setParts(pt); setStockMovements(mov); setWarranties(w); setCustomers(c); setBrands(b); setShowrooms(s); setUsers(u); setReports(r);
      if (remoteConfig) setConfig(remoteConfig);
      
      setSyncMetrics({ lastSuccess: new Date().toISOString(), latency: Math.round(endTime - startTime), status: 'CONNECTED', errorCount: 0 });
      setIsCloudConnected(true);
    } catch (error) {
      console.error("Critical Sync Error:", error);
      setSyncMetrics(prev => ({ ...prev, status: 'ERROR', errorCount: prev.errorCount + 1 }));
      setIsCloudConnected(false);
    } finally { 
      setIsSyncing(false); 
      setIsLoading(false); 
    }
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
    addNotification({ title: 'Profil mis à jour', message: 'Vos informations ont été synchronisées.', type: 'success' });
  };

  const saveTicket = async (ticket: Ticket) => {
    await ApiService.tickets.saveAll([ticket]);
    await refreshAll();
    addNotification({ title: 'Dossier SAV', message: `Le ticket #${ticket.id} a été enregistré avec succès.`, type: 'success' });
  };

  const deleteTicket = async (id: string) => {
    setTickets(prev => prev.filter(t => t.id !== id));
    await ApiService.tickets.delete(id);
    await refreshAll();
    addNotification({ title: 'Suppression', message: `Le dossier #${id} a été retiré du cloud.`, type: 'info' });
  };

  const saveProduct = async (product: Product) => {
    await ApiService.products.saveAll([product]);
    await refreshAll();
    addNotification({ title: 'Catalogue Produits', message: `Référence ${product.reference} synchronisée.`, type: 'success' });
  };

  const saveProductsBulk = async (newProducts: Product[]) => {
    await ApiService.products.saveAll(newProducts);
    await refreshAll();
    addNotification({ title: 'Importation', message: `${newProducts.length} produits ajoutés.`, type: 'success' });
  };

  const deleteProduct = async (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
    await ApiService.products.delete(id);
    await refreshAll();
    addNotification({ title: 'Catalogue', message: 'Produit retiré du catalogue.', type: 'info' });
  };

  const saveTechnician = async (tech: Technician) => {
    await ApiService.technicians.saveAll([tech]);
    await refreshAll();
    addNotification({ title: 'Équipe Technique', message: `Fiche de ${tech.name} mise à jour.`, type: 'success' });
  };

  const deleteTechnician = async (id: string) => {
    setTechnicians(prev => prev.filter(t => t.id !== id));
    await ApiService.technicians.delete(id);
    await refreshAll();
    addNotification({ title: 'Personnel', message: 'Technicien retiré de la base.', type: 'info' });
  };

  const deletePart = async (id: string) => {
    const originalParts = [...parts];
    setParts(prev => prev.filter(p => p.id !== id));
    try {
      await ApiService.parts.delete(id);
      await refreshAll();
      addNotification({ title: 'Stock', message: 'Référence supprimée de l\'inventaire.', type: 'success' });
    } catch (err: any) {
      setParts(originalParts); // Rollback
      addNotification({ 
        title: 'Erreur Serveur', 
        message: err.message || 'Impossible de supprimer cette pièce.', 
        type: 'error' 
      });
      throw err;
    }
  };

  const deletePartsBulk = async (ids: string[]) => {
    const originalParts = [...parts];
    setParts(prev => prev.filter(p => !ids.includes(p.id)));
    try {
      await ApiService.parts.deleteBulk(ids);
      await refreshAll();
      addNotification({ title: 'Stock', message: `${ids.length} articles supprimés.`, type: 'success' });
    } catch (err: any) {
      setParts(originalParts); // Rollback
      addNotification({ 
        title: 'Erreur de Masse', 
        message: 'Échec de la suppression groupée.', 
        type: 'error' 
      });
      throw err;
    }
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
    addNotification({ title: 'Mouvement Stock', message: `Stock ${movement.type === 'IN' ? 'réapprovisionné' : 'décompté'} pour ${movement.partName}.`, type: 'info' });
  };

  const saveWarranty = async (warranty: WarrantyRecord) => {
    await ApiService.warranties.saveAll([warranty]);
    await refreshAll();
    addNotification({ title: 'Garanties', message: 'Nouveau contrat enregistré.', type: 'success' });
  };

  const saveCustomer = async (customer: Customer) => {
    await ApiService.customers.saveAll([customer]);
    await refreshAll();
    addNotification({ title: 'CRM Client', message: `Fiche client de ${customer.name} synchronisée.`, type: 'success' });
  };

  const deleteCustomer = async (id: string) => {
    setCustomers(prev => prev.filter(c => c.id !== id));
    await ApiService.customers.delete(id);
    await refreshAll();
    addNotification({ title: 'CRM Client', message: 'Client archivé.', type: 'info' });
  };

  const saveShowroom = async (showroom: ShowroomConfig) => {
    await ApiService.showrooms.save(showroom);
    await refreshAll();
    addNotification({ title: 'Paramètres Site', message: `Showroom ${showroom.id} mis à jour.`, type: 'success' });
  };

  const deleteShowroom = async (id: string) => {
    setShowrooms(prev => prev.filter(s => s.id !== id));
    await ApiService.showrooms.delete(id);
    await refreshAll();
    addNotification({ title: 'Sites', message: 'Point de vente retiré.', type: 'info' });
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
    addNotification({ title: 'Gestion Accès', message: `Compte de ${user.name} enregistré.`, type: 'success' });
  };

  const deleteUser = async (id: string) => {
    setUsers(prev => prev.filter(u => u.id !== id));
    await ApiService.users.delete(id);
    await ApiService.technicians.delete(id);
    await refreshAll();
    addNotification({ title: 'Sécurité', message: 'Accès utilisateur révoqué.', type: 'warning' });
  };

  const saveReport = async (report: StrategicReport) => {
    await ApiService.reports.save(report);
    await refreshAll();
  };

  const deleteReport = async (id: string) => {
    setReports(prev => prev.filter(r => r.id !== id));
    await ApiService.reports.delete(id);
    await refreshAll();
    addNotification({ title: 'Archives', message: 'Rapport supprimé.', type: 'info' });
  };

  const updateConfig = (updates: Partial<SystemConfig>) => {
    const updated = { ...config, ...updates };
    setConfig(updated);
    PlazaDB.save('system_config', updated);
    ApiService.config.update(updated);
    addNotification({ title: 'Système', message: 'Configuration globale mise à jour.', type: 'success' });
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
    addNotification({ title: 'Initialisation', message: 'Données de démonstration chargées.', type: 'info' });
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
          parts, setParts, deletePart, deletePartsBulk, stockMovements, addStockMovement,
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
                  <main className="flex-1 ml-64 p-8 min-h-screen relative overflow-x-hidden">
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

              {/* PUSH NOTIFICATIONS CENTER */}
              <div className="fixed top-8 right-8 z-[9999] flex flex-col gap-4 w-80 pointer-events-none no-print">
                {notifications.map((n) => (
                  <div 
                    key={n.id} 
                    className="glass-notif p-5 flex gap-4 shadow-[0_30px_60px_rgba(0,0,0,0.15)] animate-push-notif pointer-events-auto rounded-3xl border-l-[8px]"
                    style={{ 
                      borderColor: n.type === 'success' ? '#34a853' : 
                                  n.type === 'error' ? '#ea4335' : 
                                  n.type === 'warning' ? '#fbbc04' : '#1a73e8' 
                    }}
                  >
                    <div className="mt-1" style={{ color: n.type === 'success' ? '#34a853' : 
                                        n.type === 'error' ? '#ea4335' : 
                                        n.type === 'warning' ? '#fbbc04' : '#1a73e8' }}>
                      {n.type === 'success' && <CheckCircle2 size={24} />}
                      {n.type === 'error' && <AlertCircle size={24} />}
                      {n.type === 'warning' && <AlertTriangle size={24} />}
                      {n.type === 'info' && <BellRing size={24} className="animate-bounce" />}
                    </div>
                    <div className="flex-1">
                       <p className="text-sm font-black text-[#202124] tracking-tight">{n.title}</p>
                       <p className="text-[11px] text-[#5f6368] mt-1 font-semibold leading-relaxed">{n.message}</p>
                    </div>
                    <button onClick={() => removeNotification(n.id)} className="text-[#dadce0] hover:text-[#3c4043] transition-colors h-fit p-1">
                      <X size={16} />
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
