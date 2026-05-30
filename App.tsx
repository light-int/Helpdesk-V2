
import React, { useState, createContext, useContext, useEffect, useCallback } from 'react';
import { HashRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import md5 from 'md5';
import Sidebar from './components/Sidebar';
import Modal from './components/Modal';
import NotificationModal from './components/NotificationModal';
import Dashboard from './pages/Dashboard';
import Inbox from './pages/Inbox';
import Tickets from './pages/Tickets';
import Products from './pages/Products';
import Customers from './pages/Customers';
import InterventionHistory from './pages/InterventionHistory';
import WarrantyLog from './pages/WarrantyLog';
import PartsInventory from './pages/PartsInventory';
import Finances from './pages/Finances';
import Technicians from './pages/Technicians';
import Settings from './pages/Settings';
import ProfilePage from './pages/Profile';
import LoginPage from './pages/Login';
import Caisse from './pages/Caisse';
import Logistics from './pages/Logistics';
import {
  X, AlertCircle, CheckCircle2, AlertTriangle, BellRing, Wrench, ArrowRight
} from 'lucide-react';
import {
  InAppNotification, UserProfile, Ticket, Product, Technician,
  Part, WarrantyRecord, Customer, ShowroomConfig,
  SystemConfig, SyncMetrics, Prestation, DocumentTemplate,
  UserContextValue, NotificationContextValue, DataContextValue,
  Team, TechnicianSchedule, TechnicianMetrics, StockMovement, StrategicReport, AuditLog, CashRegisterSession, CashRegisterEntry,
  ModalNotification
} from './types';
import { PlazaDB } from './services/db';
import { ApiService } from './services/apiService';
import { supabase } from './services/supabaseClient';
import './services/supabaseClient';

// Contexts
export const UserContext = createContext<UserContextValue | null>(null);
export const NotificationContext = createContext<NotificationContextValue | null>(null);
export const DataContext = createContext<DataContextValue | null>(null);

export const useUser = () => {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used within UserContext.Provider');
  return ctx;
};
export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationContext.Provider');
  return ctx;
};
export const useData = () => {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataContext.Provider');
  return ctx;
};

export const getGravatarUrl = (email?: string) => {
  const hash = md5((email || 'anonymous').trim().toLowerCase());
  return `https://www.gravatar.com/avatar/${hash}?d=identicon`;
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('helpdesk_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email) {
        try {
          const usersList = await ApiService.users.getAll();
          const user = usersList.find((u: UserProfile) => u.email?.toLowerCase() === session.user?.email?.toLowerCase());
          if (user) {
            setCurrentUser(user);
            localStorage.setItem('helpdesk_user', JSON.stringify(user));
          }
        } catch (e) {
          // Ignore
        }
      }
    };
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        localStorage.removeItem('helpdesk_user');
      }
    });

    return () => subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then(() => {
      }).catch((err) => {
        console.warn('[SW] Registration failed:', err);
      });
    }
  }, []);
  const [uiNotifications, setUiNotifications] = useState<any[]>([]); // Transient UI Toasts
  const [persistentNotifications, setPersistentNotifications] = useState<InAppNotification[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [warranties, setWarranties] = useState<WarrantyRecord[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [prestations, setPrestations] = useState<Prestation[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [showrooms, setShowrooms] = useState<ShowroomConfig[]>([]);
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [techSchedules, setTechSchedules] = useState<TechnicianSchedule[]>([]);
  const [techMetrics, setTechMetrics] = useState<TechnicianMetrics[]>([]);
  const [reports, setReports] = useState<StrategicReport[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [cashRegisterSessions, setCashRegisterSessions] = useState<CashRegisterSession[]>([]);
  const [cashRegisterEntries, setCashRegisterEntries] = useState<CashRegisterEntry[]>([]);

  const [config, setConfig] = useState<SystemConfig>({
    aiEnabled: true, aiProvider: 'google', aiModel: 'flash', aiAutoCategorization: true, aiStrategicAudit: true,
    aiChatbotEnabled: true, autoTranslate: false, sessionTimeout: 60, mfaRequired: false,
    syncFrequency: 'realtime', maintenanceMode: false, passwordComplexity: 'medium',
    theme: 'light', accentColor: '#000000',
    emailNotifications: true, desktopNotifications: true, soundNotifications: true, pushNotifications: false
  });
  const [syncMetrics, setSyncMetrics] = useState<SyncMetrics>({ lastSuccess: null, latency: 0, status: 'CONNECTED', errorCount: 0 });
  const [showTechWelcomeModal, setShowTechWelcomeModal] = useState(false);
  const [pendingTechTickets, setPendingTechTickets] = useState<Ticket[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [modalNotif, setModalNotif] = useState<ModalNotification | null>(null);

  const removeNotification = useCallback((id: string) => {
    setUiNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const markNotificationAsRead = useCallback(async (id: string) => {
    // UI Notification mark as read
    setUiNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    // Persistent Notification mark as read (if exists)
    const pNotif = persistentNotifications.find(n => n.id === id);
    if (pNotif) {
      await ApiService.notifications.markAsRead(id);
      setPersistentNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    }
  }, [persistentNotifications]);

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
    setUiNotifications(prev => [{ ...n, id, timestamp: new Date().toISOString(), read: false }, ...prev]);
    playNotificationSound();
    setTimeout(() => removeNotification(id), 5000);
  }, [playNotificationSound, removeNotification]);

  const showModalNotification = useCallback((n: ModalNotification) => {
    setModalNotif(n);
  }, []);

  const sendBrowserNotification = useCallback((title: string, message: string, link?: string) => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SHOW_NOTIFICATION',
        payload: { title, message, link }
      });
    }
  }, []);

  const sendPersistentNotification = useCallback(async (userId: string, type: InAppNotification['type'], message: string, link?: string) => {
    await ApiService.notifications.send({ userId, type, message, link });
    // If it's for the current user, refresh + show browser notification
    if (userId === currentUser?.id) {
      const updated = await ApiService.notifications.getByUser(userId);
      setPersistentNotifications(updated);
      sendBrowserNotification(type === 'ASSIGNMENT' ? 'Nouvelle affectation' : 'Horizon Pro', message, link);
    }
    // If a push endpoint is configured, send push via Edge Function
    if (config?.pushEndpoint) {
      try {
        await fetch(config.pushEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            title: type === 'ASSIGNMENT' ? 'Nouvelle affectation' : 'Horizon Pro',
            message,
            link
          }),
        });
      } catch (err) {
        console.warn('[Push] Edge Function call failed:', err);
      }
    }
  }, [currentUser, sendBrowserNotification, config?.pushEndpoint]);

  const refreshAll = useCallback(async () => {
    setIsSyncing(true);
    try {
      const [t, p, te, pa, w, c, b, s, cf, u, pr, templatesData, cashSessions, cashEntries] = await Promise.all([
        ApiService.tickets.getAll(),
        ApiService.products.getAll(),
        ApiService.technicians.getAll(),
        ApiService.parts.getAll(),
        ApiService.warranties.getAll(),
        ApiService.customers.getAll(),
        ApiService.brands.getAll(),
        ApiService.showrooms.getAll(),
        ApiService.config.get(),
        ApiService.users.getAll(),
        ApiService.prestations.getAll(),
        ApiService.templates.getAll(),
        ApiService.caisse.getAllSessions(),
        ApiService.caisse.getAllEntries()
      ]);

      // Si logged in, fetch personal persistent notifications
      let pNotifs: InAppNotification[] = [];
      if (currentUser?.id) {
        pNotifs = await ApiService.notifications.getByUser(currentUser.id);
      }

      setTickets(t);
      setProducts(p);
      setTechnicians(te);
      setParts(pa);
      setWarranties(w);
      setCustomers(currentUser?.role === 'AGENT' ? c.filter((x: Customer) => x.createdBy === currentUser.id) : c);
      setTickets(currentUser?.role === 'AGENT' ? t.filter((x: Ticket) => x.createdBy === currentUser.id) : t);
      setBrands(b);
      setShowrooms(s);
      setPrestations(pr);
      setTemplates(templatesData);
      setCashRegisterSessions(cashSessions);
      setCashRegisterEntries(cashEntries);
      setPersistentNotifications(pNotifs);
      if (cf) setConfig(prev => ({ ...prev, ...cf }));
      setUsers(u);
      setSyncMetrics({ lastSuccess: new Date().toISOString(), latency: 32, status: 'CONNECTED', errorCount: 0 });
    } catch (e) {
      setSyncMetrics(prev => ({ ...prev, status: 'ERROR', errorCount: prev.errorCount + 1 }));
    } finally { setIsSyncing(false); setIsLoading(false); }
  }, [currentUser]);

  useEffect(() => { refreshAll(); }, [refreshAll]);

  // Apply personalization globally
  useEffect(() => {
    if (!config) return;
    const root = document.documentElement;
    if (config.accentColor) {
      root.style.setProperty('--sb-primary', config.accentColor);
      // Generate a simpler hover (85% brightness)
      root.style.setProperty('--sb-primary-hover', config.accentColor + 'dd');
    }

    if (config.theme === 'dark') {
      root.classList.add('theme-dark');
      root.classList.remove('theme-light');
      root.classList.add('vercel-mode');
      root.style.setProperty('--sb-bg', '#000000');
      root.style.setProperty('--sb-card-bg', '#111111');
      root.style.setProperty('--sb-text-main', '#ededed');
      root.style.setProperty('--sb-text-muted', '#888888');
      root.style.setProperty('--sb-border', '#222222');
      if (!config.accentColor) {
        root.style.setProperty('--sb-primary', '#ffffff');
        root.style.setProperty('--sb-primary-hover', '#cccccc');
      }
    } else {
      root.classList.add('theme-light');
      root.classList.remove('theme-dark');
      root.classList.add('vercel-mode');
      root.style.setProperty('--sb-bg', '#fafafa');
      root.style.setProperty('--sb-card-bg', '#ffffff');
      root.style.setProperty('--sb-text-main', '#111111');
      root.style.setProperty('--sb-text-muted', '#888888');
      root.style.setProperty('--sb-border', '#eaeaea');
      if (!config.accentColor) {
        root.style.setProperty('--sb-primary', '#000000');
        root.style.setProperty('--sb-primary-hover', '#333333');
      }
    }
  }, [config]);

  // Notification de seuil critique pour pièces détachées (Manager & Agent uniquement)
  const notifiedCriticalParts = React.useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!currentUser || !parts.length) return;
    const isManagerOrAgent = currentUser.role === 'MANAGER' || currentUser.role === 'ADMIN' || currentUser.role === 'AGENT';
    if (!isManagerOrAgent) return;

    const criticalParts = parts.filter((p: Part) => p.currentStock <= p.minStock && p.currentStock > 0);
    criticalParts.forEach((part: Part) => {
      const key = `${part.id}-${part.currentStock}`;
      if (!notifiedCriticalParts.current.has(key)) {
        notifiedCriticalParts.current.add(key);
        addNotification({
          title: 'Stock Critique',
          message: `La pièce "${part.name}" (SKU: ${part.sku}) a atteint le seuil critique (${part.currentStock}/${part.minStock}).`,
          type: 'warning'
        });
      }
    });
  }, [parts, currentUser, addNotification]);

  // === SLA AUTO-ESCALATION ===
  const notifiedSLATickets = React.useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!currentUser || !tickets.length || !users.length) return;
    const isManagerOrAdmin = currentUser.role === 'MANAGER' || currentUser.role === 'ADMIN';
    if (!isManagerOrAdmin) return;

    const SLA_BREACH_HOURS = 72;
    const now = new Date().getTime();
    const closedStatuses = ['Fermé', 'Payé - Clôturé'];
    const pausedStatuses = ['En attente client'];

    const breachedTickets = tickets.filter((t: Ticket) => {
      if (closedStatuses.includes(t.status) || pausedStatuses.includes(t.status)) return false;
      const ageHours = (now - new Date(t.createdAt).getTime()) / (1000 * 60 * 60);
      return ageHours > SLA_BREACH_HOURS;
    });

    breachedTickets.forEach((ticket: Ticket) => {
      const key = `sla-${ticket.id}`;
      if (!notifiedSLATickets.current.has(key)) {
        notifiedSLATickets.current.add(key);
        // Notify all managers
        const managers = users.filter((u: UserProfile) => u.role === 'MANAGER');
        managers.forEach((mgr: UserProfile) => {
          sendPersistentNotification(
            mgr.id,
            'SYSTEM',
            `⚠️ SLA dépassé : Le dossier ${ticket.id} (${ticket.customerName}) est ouvert depuis plus de 72h.`,
            `/tickets?id=${ticket.id}`
          );
        });
        addNotification({
          title: '⚠️ SLA Critique',
          message: `Le dossier ${ticket.id} (${ticket.customerName}) dépasse le seuil SLA de 72h.`,
          type: 'error'
        });
      }
    });
  }, [tickets, currentUser, users, addNotification, sendPersistentNotification]);

  const login = (user: UserProfile) => {
    setCurrentUser(user);
    localStorage.setItem('helpdesk_user', JSON.stringify(user));

    // Check for pending tickets if technician
    if (user.role === 'TECHNICIAN' && tickets) {
      const assigned = tickets.filter((t: Ticket) =>
        t.assignedTechnicianId === user.id &&
        t.status !== 'Fermé' &&
        t.status !== 'Payé - Clôturé'
      );
      if (assigned.length > 0) {
        setPendingTechTickets(assigned);
        setShowTechWelcomeModal(true);
      }
    }
  };
  const logout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('helpdesk_user');
    setCurrentUser(null);
  };

  const updateUser = async (updates: Partial<UserProfile>) => {
    if (!currentUser) return;
    const updated = { ...currentUser, ...updates };
    await ApiService.users.save(updated);
    setCurrentUser(updated);
    localStorage.setItem('helpdesk_user', JSON.stringify(updated));
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
    try {
      await ApiService.tickets.saveAll([ticket]);
    } catch (err: any) {
      console.error('Erreur saveTicket (saveAll):', err);
      throw new Error(`Erreur sauvegarde ticket: ${err?.message || 'Erreur inconnue'}`);
    }
    try {
      await logActivity('MAJ_TICKET', ticket.id, `Ticket ${ticket.id} synchronisé.`);
    } catch (err: any) {
      console.error('Erreur saveTicket (logActivity):', err);
      // On ne bloque pas si le log échoue
    }
    try {
      await refreshAll();
    } catch (err: any) {
      console.error('Erreur saveTicket (refreshAll):', err);
      // On ne bloque pas si le refresh échoue
    }
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

    // Cascade : mise à jour des garanties existantes pour ce produit
    // On cherche par ID si possible, sinon par nom exact (pour capturer les anciennes fiches)
    const relatedWarranties = (warranties || []).filter(w =>
      w.productId === p.id || (w.product || '').toLowerCase() === p.name.toLowerCase()
    );

    if (relatedWarranties.length > 0) {
      // Mettre à jour toutes les garanties existantes liées à ce produit
      const updatedWarranties: WarrantyRecord[] = relatedWarranties.map(w => {
        // Validation de la date d'achat
        const purchase = w.purchaseDate ? new Date(w.purchaseDate) : null;
        if (!purchase || isNaN(purchase.getTime())) {
          // Si la date est invalide, créer une nouvelle date d'expiration à partir d'aujourd'hui
          const fallbackExpiry = new Date();
          fallbackExpiry.setMonth(fallbackExpiry.getMonth() + p.warrantyMonths);
          return {
            ...w,
            productId: p.id,
            product: p.name,
            brand: p.brand,
            durationMonths: p.warrantyMonths,
            expiryDate: fallbackExpiry.toISOString().split('T')[0]
          };
        }

        const expiry = new Date(purchase);
        expiry.setMonth(expiry.getMonth() + p.warrantyMonths);
        return {
          ...w,
          productId: p.id,
          product: p.name,
          brand: p.brand,
          durationMonths: p.warrantyMonths,
          expiryDate: expiry.toISOString().split('T')[0]
        };
      });
      await ApiService.warranties.saveAll(updatedWarranties);
      await logActivity('MAJ_PRODUIT', p.name, `Produit ${p.name} mis à jour. ${updatedWarranties.length} garantie(s) synchronisée(s).`);
    } else {
      // Aucune garantie existante pour ce produit
      // Note : On ne peut pas créer automatiquement une garantie car il manque
      // des infos obligatoires (numéro de série, client, date d'achat)
      await logActivity('MAJ_PRODUIT', p.name, `Produit ${p.name} mis à jour. Aucune garantie associée trouvée.`);
    }

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
    // Supprimer la fiche technique et le profil utilisateur associé
    await ApiService.technicians.delete(id);
    await ApiService.users.delete(id);
    await logActivity('SUPPR_TECH', id, `Suppression de la fiche technique et révocation des accès.`);
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
    // NOTE: Le stock est déjà mis à jour par le composant appelant (handleQuickAdjust, handleSaveReport, etc.)
    // Cette fonction ne fait qu'enregistrer l'historique du mouvement pour éviter les doubles décrémentations.
    await logActivity('MOUV_STOCK', movement.partName, `${movement.type === 'IN' ? 'Entrée' : 'Sortie'} de ${movement.quantity} unités.`);
    await refreshAll();
  };

  const savePrestation = async (p: Prestation) => {
    await ApiService.prestations.save(p);
    await logActivity('MAJ_TARIF', p.name, `Tarif prestation ${p.name} mis à jour.`);
    await refreshAll();
  };

  const deletePrestation = async (id: string) => {
    await ApiService.prestations.delete(id);
    await logActivity('SUPPR_TARIF', id, `Prestation supprimée du référentiel.`);
    await refreshAll();
  };

  const saveShowroom = async (s: ShowroomConfig) => {
    await ApiService.showrooms.save(s);
    await logActivity('MAJ_SHOWROOM', s.id, `Showroom ${s.id} mis à jour.`);
    await refreshAll();
  };

  const deleteShowroom = async (id: string) => {
    await ApiService.showrooms.delete(id);
    await logActivity('SUPPR_SHOWROOM', id, `Showroom supprimé.`);
    await refreshAll();
  };

  const saveTemplate = async (t: DocumentTemplate) => {
    await ApiService.templates.save(t);
    await refreshAll();
  };

  const deleteTemplate = async (id: string) => {
    await ApiService.templates.delete(id);
    await refreshAll();
  };

  const saveTeam = async (team: Team) => {
    await ApiService.teams.save(team);
    await logActivity('MAJ_EQUIPE', team.name, `Équipe ${team.name} mise à jour.`);
    await refreshAll();
  };

  const deleteTeam = async (id: string) => {
    await ApiService.teams.delete(id);
    await logActivity('SUPPR_EQUIPE', id, `Équipe supprimée du référentiel.`);
    await refreshAll();
  };

  const saveTechSchedule = async (schedule: TechnicianSchedule) => {
    // await ApiService.techSchedules.save(schedule);
    await logActivity('MAJ_PLANNING', schedule.technicianId, `Planning technicien mis à jour.`);
    await refreshAll();
  };

  const deleteTechSchedule = async (id: string) => {
    // await ApiService.techSchedules.delete(id);
    await logActivity('SUPPR_PLANNING', id, `Événement planning supprimé.`);
    await refreshAll();
  };

  const hardReset = async () => {
    await ApiService.system.hardReset();
    await refreshAll();
  };

  const isTech = currentUser?.role === 'TECHNICIAN';

  return (
    <UserContext.Provider value={{ currentUser, login, logout, updateUser }}>
      <NotificationContext.Provider value={{
        notifications: uiNotifications,
        persistentNotifications,
        addNotification,
        showModalNotification,
        removeNotification,
        markNotificationAsRead,
        sendPersistentNotification
      }}>
        <DataContext.Provider value={{
          tickets, products, technicians, parts, warranties, customers, users, brands, showrooms,
          config, syncMetrics, isSyncing, isLoading, templates,
          refreshAll, saveTicket, saveCustomer, savePart, deletePart, saveProduct, deleteProduct,
          saveTechnician, deleteTechnician, saveWarranty, deleteWarranty, updateConfig,
          saveUser, deleteUser, addBrand, deleteBrand, prestations, savePrestation, deletePrestation,
          saveShowroom, deleteShowroom,
          saveTemplate, deleteTemplate,
          stockMovements, addStockMovement, teams, saveTeam, deleteTeam,
          techSchedules, techMetrics, saveTechSchedule, deleteTechSchedule,
          reports, auditLogs, cashRegisterSessions, cashRegisterEntries,
          hardReset: async () => {
            await ApiService.system.hardReset();
            await refreshAll();
          }
        }}>
          <HashRouter>
            <div className="flex min-h-screen bg-[#f8f9fa]">
              {currentUser ? (
                <>
                  <Sidebar />
                  <main className="flex-1 md:ml-64 p-4 md:p-8 pt-20 md:pt-8 min-h-screen relative overflow-x-hidden">
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/inbox" element={!isTech ? <Inbox /> : <Navigate to="/historique" replace />} />
                      <Route path="/customers" element={!isTech ? <Customers /> : <Navigate to="/historique" replace />} />
                      <Route path="/tickets" element={<Tickets />} />
                      <Route path="/historique" element={currentUser?.role === 'TECHNICIAN' ? <InterventionHistory /> : <Navigate to="/" replace />} />
                       <Route path="/products" element={!isTech ? <Products /> : <Navigate to="/historique" replace />} />
                       <Route path="/warranties" element={<WarrantyLog />} />
                       <Route path="/parts" element={<PartsInventory />} />
                       <Route path="/logistics" element={<Logistics />} />
                      <Route path="/finances" element={currentUser?.role === 'MANAGER' ? <Finances /> : <Navigate to="/historique" replace />} />
                      <Route path="/technicians" element={!isTech ? <Technicians /> : <Navigate to="/historique" replace />} />
                      <Route path="/profile" element={<ProfilePage />} />
                      <Route path="/settings" element={!isTech ? <Settings /> : <Navigate to="/historique" replace />} />
                      <Route path="/caisse" element={!isTech ? <Caisse /> : <Navigate to="/" replace />} />
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
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
              <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-2 w-full max-w-sm pointer-events-none">
                {uiNotifications.filter(n => !n.read).slice(0, 3).map((n) => (
                  <div
                    key={n.id}
                    className="bg-white border border-[#e5e5e5] shadow-md p-3 rounded-lg flex items-start gap-3 animate-sb-entry pointer-events-auto"
                  >
                    <div className="mt-0.5" style={{ color: n.type === 'success' ? '#3ecf8e' : n.type === 'error' ? '#f87171' : '#fbbf24' }}>
                      {n.type === 'success' && <CheckCircle2 size={16} />}
                      {n.type === 'error' && <AlertCircle size={16} />}
                      {n.type === 'warning' && <AlertTriangle size={16} />}
                      {n.type === 'info' && <BellRing size={16} />}
                    </div>
                    <div className="flex-1">
                      <p className="text-[12px] font-semibold text-[#1c1c1c]">{n.title}</p>
                      <p className="text-[12px] text-[#686868] mt-0.5 font-semibold">{n.message}</p>
                    </div>
                    <button onClick={() => markNotificationAsRead(n.id)} className="text-[#686868] hover:text-[#1c1c1c] transition-colors">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Technician Welcome Modal */}
              <Modal
                isOpen={showTechWelcomeModal}
                onClose={() => setShowTechWelcomeModal(false)}
                title={`Bienvenue ${currentUser?.name || ''}`}
                size="md"
              >
                <div className="space-y-4 animate-sb-entry">
                  <div className="p-3 bg-[#f0fdf4] border border-[#3ecf8e]/20 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-[#3ecf8e]/10 rounded-lg flex items-center justify-center">
                        <Wrench size={18} className="text-[#3ecf8e]" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#1c1c1c]">{pendingTechTickets.length} demande(s) en attente</p>
                        <p className="text-sm text-[#686868]">Vous avez des interventions à traiter</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar">
                    {pendingTechTickets.slice(0, 5).map((ticket) => (
                      <div key={ticket.id} className="p-3 bg-[#f8f9fa] border border-[#e5e5e5] rounded-lg hover:bg-[#f0fdf4]/30 transition-colors">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-sm font-semibold text-[#1c1c1c]">{ticket.product || 'Produit non spécifié'}</p>
                            <p className="text-xs text-[#686868] mt-1">{ticket.brand || 'Marque non spécifiée'} - {ticket.category || 'Non classé'}</p>
                            <p className="text-xs text-[#9ca3af] mt-1">Client: {ticket.customerName || 'Non spécifié'}</p>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-[11px] font-semibold uppercase ${ticket.priority === 'Urgent' ? 'bg-red-100 text-red-600' :
                            ticket.priority === 'Haute' ? 'bg-amber-100 text-amber-600' :
                              'bg-[#f0fdf4] text-[#16a34a]'
                            }`}>
                            {ticket.priority || 'Normal'}
                          </span>
                        </div>
                      </div>
                    ))}
                    {pendingTechTickets.length > 5 && (
                      <p className="text-center text-xs text-[#686868] py-2">
                        + {pendingTechTickets.length - 5} autres demandes...
                      </p>
                    )}
                  </div>

                  <div className="flex gap-3 pt-4 border-t">
                    <button
                      onClick={() => setShowTechWelcomeModal(false)}
                      className="flex-1 btn-sb-outline"
                    >
                      Fermer
                    </button>
                    <Link
                      to="/tickets"
                      onClick={() => setShowTechWelcomeModal(false)}
                      className="flex-1 btn-sb-primary flex items-center justify-center gap-2"
                    >
                      Voir les tickets <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              </Modal>

              {/* Success/Error/Warning Modal Notification */}
              {modalNotif && (
                <NotificationModal
                  isOpen={!!modalNotif}
                  onClose={() => setModalNotif(null)}
                  title={modalNotif.title}
                  message={modalNotif.message}
                  type={modalNotif.type}
                  actionLabel={modalNotif.actionLabel}
                  onAction={() => {
                    if (modalNotif.onAction) modalNotif.onAction();
                    setModalNotif(null);
                  }}
                />
              )}
            </div>
          </HashRouter>
        </DataContext.Provider>
      </NotificationContext.Provider>
    </UserContext.Provider>
  );
};

export default App;
