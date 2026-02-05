
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
  Part, WarrantyRecord, Customer, ShowroomConfig, 
  SystemConfig, SyncMetrics, StrategicReport, StockMovement, AuditLog 
} from './types';
import { PlazaDB } from './services/db';
import { ApiService } from './services/apiService';

// Contexts
export const UserContext = createContext<any>(null);
export const NotificationContext = createContext<any>(null);
export const DataContext = createContext<any>(null);

export const useUser = () => useContext(UserContext);
export const useNotifications = () => useContext(NotificationContext);
export const useData = () => useContext(DataContext);

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
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [config, setConfig] = useState<SystemConfig>({
    aiEnabled: true, aiModel: 'flash', aiAutoCategorization: true, aiStrategicAudit: true, 
    aiChatbotEnabled: true, autoTranslate: false, sessionTimeout: 60, mfaRequired: false, 
    syncFrequency: 'realtime', maintenanceMode: false, passwordComplexity: 'medium'
  });
  const [syncMetrics, setSyncMetrics] = useState<SyncMetrics>({ lastSuccess: null, latency: 0, status: 'CONNECTED', errorCount: 0 });
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const markNotificationAsRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const playNotificationSound = useCallback(() => {
    try {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3');
      audio.volume = 0.4;
      audio.play().catch(() => {
        // Ignorer les erreurs de lecture automatique bloquées par le navigateur
      });
    } catch (e) {
      console.warn("Audio feedback unavailable");
    }
  }, []);

  const addNotification = useCallback((n: any) => {
    const id = Math.random().toString(36).substr(2, 9);
    setNotifications(prev => [{ ...n, id, timestamp: new Date().toISOString(), read: false }, ...prev]);
    playNotificationSound();
  }, [playNotificationSound]);

  const refreshAll = useCallback(async () => {
    setIsSyncing(true);
    try {
      const [t, p, te, pa, w, c, b, s, r, cf, u, logs] = await Promise.all([
        ApiService.tickets.getAll(), ApiService.products.getAll(), ApiService.technicians.getAll(),
        ApiService.parts.getAll(), ApiService.warranties.getAll(), ApiService.customers.getAll(),
        ApiService.brands.getAll(), ApiService.showrooms.getAll(), ApiService.reports.getAll(),
        ApiService.config.get(), ApiService.users.getAll(), ApiService.audit.getLogs(20)
      ]);
      setTickets(t); setProducts(p); setTechnicians(te); setParts(pa); setWarranties(w);
      setCustomers(c); setBrands(b); setShowrooms(s); setReports(r); setAuditLogs(logs);
      if (cf) setConfig(cf); setUsers(u);
      setSyncMetrics({ lastSuccess: new Date().toISOString(), latency: 32, status: 'CONNECTED', errorCount: 0 });
    } catch (e) {
      setSyncMetrics(prev => ({ ...prev, status: 'ERROR', errorCount: prev.errorCount + 1 }));
    } finally { setIsSyncing(false); setIsLoading(false); }
  }, []);

  useEffect(() => { refreshAll(); }, [refreshAll]);

  const login = (user: UserProfile) => { setCurrentUser(user); PlazaDB.save('currentUser', user); };
  const logout = () => { setCurrentUser(null); localStorage.removeItem('currentUser'); };
  
  const updateUser = async (updates: Partial<UserProfile>) => {
    if (!currentUser) return;
    const updated = { ...currentUser, ...updates };
    await ApiService.users.save(updated);
    setCurrentUser(updated);
    PlazaDB.save('currentUser', updated);
  };

  const logActivity = async (action: string, target: string, details: string) => {
    if (!currentUser) return;
    await ApiService.audit.log({
      userId: currentUser.id,
      userName: currentUser.name,
      action,
      target,
      details
    });
  };

  const saveTicket = async (ticket: Ticket) => { 
    await ApiService.tickets.saveAll([ticket]); 
    await logActivity('MAJ_TICKET', ticket.id, `Ticket ${ticket.id} synchronisé.`);
    await refreshAll(); 
  };
  
  const saveCustomer = async (c: Customer) => { 
    await ApiService.customers.saveAll([c]); 
    await logActivity('MAJ_CLIENT', c.name, `Fiche client ${c.name} mise à jour.`);
    await refreshAll(); 
  };

  const savePart = async (part: Part) => { 
    await ApiService.parts.saveAll([part]); 
    await logActivity('MAJ_STOCK', part.name, `Article ${part.sku} modifié.`);
    await refreshAll(); 
  };

  const deletePart = async (id: string) => {
    await ApiService.parts.delete(id);
    await logActivity('SUPPR_STOCK', id, `Article retiré de l'inventaire.`);
    await refreshAll();
  };

  const saveProduct = async (p: Product) => {
    await ApiService.products.saveAll([p]);
    await logActivity('MAJ_PRODUIT', p.name, `Produit ${p.name} mis à jour.`);
    await refreshAll();
  };

  const deleteProduct = async (id: string) => {
    await ApiService.products.delete(id);
    await logActivity('SUPPR_PRODUIT', id, `Produit déréférencé.`);
    await refreshAll();
  };

  const saveTechnician = async (t: Technician) => {
    await ApiService.technicians.saveAll([t]);
    await logActivity('MAJ_TECH', t.name, `Profil technique de ${t.name} synchronisé.`);
    await refreshAll();
  };

  const deleteTechnician = async (id: string) => {
    await ApiService.technicians.delete(id);
    await logActivity('SUPPR_TECH', id, `Expert retiré de l'infrastructure.`);
    await refreshAll();
  };

  const saveWarranty = async (w: WarrantyRecord) => {
    await ApiService.warranties.saveAll([w]);
    await logActivity('MAJ_GARANTIE', w.serialNumber, `Contrat de garantie ${w.id} mis à jour.`);
    await refreshAll();
  };

  const deleteWarranty = async (id: string) => {
    await ApiService.warranties.delete(id);
    await logActivity('SUPPR_GARANTIE', id, `Certificat de garantie révoqué.`);
    await refreshAll();
  };

  const updateConfig = async (updates: Partial<SystemConfig>) => {
    await ApiService.config.update(updates);
    await logActivity('MAJ_CONFIG', 'GLOBAL', `Configuration système modifiée.`);
    await refreshAll();
  };

  const saveUser = async (u: UserProfile) => {
    await ApiService.users.save(u);
    await logActivity('MAJ_USER', u.name, `Accès utilisateur ${u.name} synchronisé.`);
    await refreshAll();
  };

  const deleteUser = async (id: string) => {
    await ApiService.users.delete(id);
    await logActivity('SUPPR_USER', id, `Accès collaborateur révoqué.`);
    await refreshAll();
  };

  const addBrand = async (name: string) => {
    await ApiService.brands.add(name);
    await logActivity('ADD_BRAND', name, `Nouvelle marque certifiée : ${name}.`);
    await refreshAll();
  };

  const deleteBrand = async (name: string) => {
    await ApiService.brands.delete(name);
    await logActivity('SUPPR_BRAND', name, `Marque ${name} retirée du référentiel.`);
    await refreshAll();
  };

  const addStockMovement = async (movement: any) => {
    const fullMov = { ...movement, id: Math.random().toString(36).substr(2, 9), date: new Date().toISOString() };
    await ApiService.stockMovements.saveAll([fullMov]);
    const part = parts.find(p => p.id === movement.partId);
    if (part) {
      const newStock = movement.type === 'IN' ? part.currentStock + movement.quantity : part.currentStock - movement.quantity;
      await ApiService.parts.saveAll([{ ...part, currentStock: newStock }]);
    }
    await logActivity('MOUV_STOCK', movement.partName, `${movement.type === 'IN' ? 'Entrée' : 'Sortie'} de ${movement.quantity} unités.`);
    await refreshAll();
  };

  const isTech = currentUser?.role === 'TECHNICIAN';

  return (
    <UserContext.Provider value={{ currentUser, login, logout, updateUser }}>
      <NotificationContext.Provider value={{ notifications, addNotification, removeNotification, markNotificationAsRead }}>
        <DataContext.Provider value={{
          tickets, products, technicians, parts, warranties, customers, users, brands, showrooms,
          reports, config, syncMetrics, isSyncing, isLoading, refreshAll, saveTicket, auditLogs,
          saveCustomer, savePart, addStockMovement, deletePart, saveProduct, deleteProduct,
          saveTechnician, deleteTechnician, saveWarranty, deleteWarranty, updateConfig,
          saveUser, deleteUser, addBrand, deleteBrand
        }}>
          <HashRouter>
            <div className="flex min-h-screen bg-[#f8f9fa]">
              {currentUser ? (
                <>
                  <Sidebar />
                  <main className="flex-1 ml-64 p-8 min-h-screen relative overflow-x-hidden">
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/inbox" element={!isTech ? <Inbox /> : <Navigate to="/maintenance" replace />} />
                      <Route path="/customers" element={!isTech ? <Customers /> : <Navigate to="/maintenance" replace />} />
                      <Route path="/products" element={!isTech ? <Products /> : <Navigate to="/maintenance" replace />} />
                      <Route path="/documentation" element={!isTech ? <Documentation /> : <Navigate to="/maintenance" replace />} />
                      <Route path="/tickets" element={<Tickets />} />
                      <Route path="/maintenance" element={currentUser.role === 'TECHNICIAN' ? <MaintenanceLog /> : <Navigate to="/" replace />} />
                      <Route path="/warranties" element={<WarrantyLog />} />
                      <Route path="/parts" element={<PartsInventory />} />
                      <Route path="/finances" element={!isTech ? <Finances /> : <Navigate to="/maintenance" replace />} />
                      <Route path="/technicians" element={!isTech ? <Technicians /> : <Navigate to="/maintenance" replace />} />
                      <Route path="/profile" element={<ProfilePage />} />
                      <Route path="/settings" element={!isTech ? <Settings /> : <Navigate to="/maintenance" replace />} />
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

              {/* Toast de notification instantané */}
              <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 w-full max-w-sm pointer-events-none">
                {notifications.filter(n => !n.read).slice(0, 3).map((n) => (
                  <div 
                    key={n.id} 
                    className="bg-white border border-[#ededed] shadow-2xl p-4 rounded-xl flex items-start gap-3 animate-sb-entry pointer-events-auto"
                  >
                    <div className="mt-0.5" style={{ color: n.type === 'success' ? '#3ecf8e' : n.type === 'error' ? '#f87171' : '#fbbf24' }}>
                      {n.type === 'success' && <CheckCircle2 size={18} />}
                      {n.type === 'error' && <AlertCircle size={18} />}
                      {n.type === 'warning' && <AlertTriangle size={18} />}
                      {n.type === 'info' && <BellRing size={18} />}
                    </div>
                    <div className="flex-1">
                       <p className="text-[13px] font-black text-[#1c1c1c]">{n.title}</p>
                       <p className="text-[11px] text-[#686868] mt-0.5 font-medium">{n.message}</p>
                    </div>
                    <button onClick={() => markNotificationAsRead(n.id)} className="text-[#686868] hover:text-[#1c1c1c] transition-colors">
                      <X size={14} />
                    </button>
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
