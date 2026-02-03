
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
  SystemConfig, SyncMetrics, StrategicReport, StockMovement 
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

  const addNotification = useCallback((n: any) => {
    const id = Math.random().toString(36).substr(2, 9);
    setNotifications(prev => [{ ...n, id, timestamp: new Date().toISOString(), read: false }, ...prev]);
    setTimeout(() => removeNotification(id), 4000);
  }, [removeNotification]);

  const refreshAll = useCallback(async () => {
    setIsSyncing(true);
    try {
      const [t, p, te, pa, w, c, b, s, r, cf, u] = await Promise.all([
        ApiService.tickets.getAll(), ApiService.products.getAll(), ApiService.technicians.getAll(),
        ApiService.parts.getAll(), ApiService.warranties.getAll(), ApiService.customers.getAll(),
        ApiService.brands.getAll(), ApiService.showrooms.getAll(), ApiService.reports.getAll(),
        ApiService.config.get(), ApiService.users.getAll()
      ]);
      setTickets(t); setProducts(p); setTechnicians(te); setParts(pa); setWarranties(w);
      setCustomers(c); setBrands(b); setShowrooms(s); setReports(r);
      if (cf) setConfig(cf); setUsers(u);
      setSyncMetrics({ lastSuccess: new Date().toISOString(), latency: 32, status: 'CONNECTED', errorCount: 0 });
    } catch (e) {
      setSyncMetrics(prev => ({ ...prev, status: 'ERROR', errorCount: prev.errorCount + 1 }));
    } finally { setIsSyncing(false); setIsLoading(false); }
  }, []);

  useEffect(() => { refreshAll(); }, [refreshAll]);

  const login = (user: UserProfile) => { setCurrentUser(user); PlazaDB.save('currentUser', user); };
  const logout = () => { setCurrentUser(null); localStorage.removeItem('currentUser'); };
  const updateUser = async (updates: any) => {
    if (!currentUser) return;
    const updated = { ...currentUser, ...updates };
    await ApiService.users.save(updated);
    setCurrentUser(updated); PlazaDB.save('currentUser', updated);
  };

  const saveTicket = async (ticket: Ticket) => { await ApiService.tickets.saveAll([ticket]); await refreshAll(); };
  const saveTechnician = async (tech: Technician) => { await ApiService.technicians.saveAll([tech]); await refreshAll(); };
  const deleteTechnician = async (id: string) => { await ApiService.technicians.delete(id); await refreshAll(); };
  const saveShowroom = async (s: ShowroomConfig) => { await ApiService.showrooms.save(s); await refreshAll(); };
  const saveCustomer = async (c: Customer) => { await ApiService.customers.saveAll([c]); await refreshAll(); };
  const saveProduct = async (p: Product) => { await ApiService.products.saveAll([p]); await refreshAll(); };
  const deleteProduct = async (id: string) => { await ApiService.products.delete(id); await refreshAll(); };
  const savePart = async (part: Part) => { await ApiService.parts.saveAll([part]); await refreshAll(); };
  const deletePart = async (id: string) => { await ApiService.parts.delete(id); await refreshAll(); };
  const saveWarranty = async (w: WarrantyRecord) => { await ApiService.warranties.saveAll([w]); await refreshAll(); };
  const deleteWarranty = async (id: string) => { await ApiService.warranties.delete(id); await refreshAll(); };
  const updateConfig = async (updates: any) => { await ApiService.config.update(updates); await refreshAll(); };
  
  const saveUser = async (user: UserProfile) => { await ApiService.users.save(user); await refreshAll(); };
  const deleteUser = async (id: string) => { await ApiService.users.delete(id); await refreshAll(); };
  const addBrand = async (name: string) => { await ApiService.brands.add(name); await refreshAll(); };
  const deleteBrand = async (name: string) => { await ApiService.brands.delete(name); await refreshAll(); };

  const addStockMovement = async (movement: any) => {
    const fullMov = { ...movement, id: Math.random().toString(36).substr(2, 9), date: new Date().toISOString() };
    await ApiService.stockMovements.saveAll([fullMov]);
    const part = parts.find(p => p.id === movement.partId);
    if (part) {
      const newStock = movement.type === 'IN' ? part.currentStock + movement.quantity : part.currentStock - movement.quantity;
      await ApiService.parts.saveAll([{ ...part, currentStock: newStock }]);
    }
    await refreshAll();
  };

  return (
    <UserContext.Provider value={{ currentUser, login, logout, updateUser }}>
      <NotificationContext.Provider value={{ notifications, addNotification, removeNotification }}>
        <DataContext.Provider value={{
          tickets, products, technicians, parts, warranties, customers, users, brands, showrooms,
          reports, config, syncMetrics, isSyncing, isLoading, refreshAll, saveTicket, 
          saveTechnician, deleteTechnician, saveShowroom, saveCustomer, saveProduct, deleteProduct, 
          savePart, deletePart, saveWarranty, deleteWarranty, updateConfig, addStockMovement,
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
                      <Route path="/inbox" element={<Inbox />} />
                      <Route path="/tickets" element={<Tickets />} />
                      <Route path="/customers" element={<Customers />} />
                      <Route 
                        path="/maintenance" 
                        element={currentUser.role === 'TECHNICIAN' ? <MaintenanceLog /> : <Navigate to="/" replace />} 
                      />
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

              {/* SUPABASE STYLE TOASTS */}
              <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 w-full max-sm pointer-events-none">
                {notifications.map((n) => (
                  <div 
                    key={n.id} 
                    className="bg-white border border-[#ededed] shadow-lg p-4 rounded-lg flex items-start gap-3 animate-sb-entry pointer-events-auto"
                  >
                    <div className="mt-0.5" style={{ color: n.type === 'success' ? '#3ecf8e' : n.type === 'error' ? '#f87171' : '#fbbf24' }}>
                      {n.type === 'success' && <CheckCircle2 size={18} />}
                      {n.type === 'error' && <AlertCircle size={18} />}
                      {n.type === 'warning' && <AlertTriangle size={18} />}
                      {n.type === 'info' && <BellRing size={18} />}
                    </div>
                    <div className="flex-1">
                       <p className="text-[13px] font-bold text-[#1c1c1c]">{n.title}</p>
                       <p className="text-[12px] text-[#686868] mt-0.5">{n.message}</p>
                    </div>
                    <button onClick={() => removeNotification(n.id)} className="text-[#686868] hover:text-[#1c1c1c] transition-colors">
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
