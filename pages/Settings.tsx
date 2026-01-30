
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Settings2, Shield, Database, RefreshCw, Plus, X, Trash2, 
  Key, Lock, UserCog, Search, CheckCircle2, AlertCircle, 
  Clock, Smartphone, Users, History, Activity, Monitor, 
  Globe, BrainCircuit, Sparkles, Zap, Save, MapPin, Phone, 
  Store, ChevronRight, Edit3, Wifi, Server, CloudLightning, 
  Info, ShieldCheck, Eye, EyeOff, UserPlus, UserMinus, 
  ShieldAlert, Loader2, Fingerprint, LogIn, Wrench, 
  CheckSquare, Square, MessageSquare, Facebook, Mail,
  Link, ExternalLink, Sliders, Cpu, Rocket, BarChart4,
  HardDrive, ShieldQuestion, Globe2, Network, Terminal
} from 'lucide-react';
import { useData, useNotifications, useUser } from '../App';
import { UserRole, SystemConfig, ShowroomConfig, Showroom, UserProfile, TicketCategory, Technician, IntegrationConfig } from '../types';
import { ApiService } from '../services/apiService';
import { isAiOperational } from '../services/geminiService';
import Modal from '../components/Modal';

const CATEGORIES: TicketCategory[] = ['Livraison', 'Installation', 'SAV', 'Remboursement', 'Maintenance', 'Climatisation', 'Électronique'];

const generateRandomPassword = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+";
  let pass = "";
  for (let i = 0; i < 14; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
};

const Settings: React.FC = () => {
  const { 
    brands, users, showrooms, refreshAll, isSyncing, config, 
    updateConfig, saveShowroom, deleteShowroom, syncMetrics, 
    saveUser, deleteUser, technicians, tickets, products, customers 
  } = useData();
  const { currentUser, updateUser: updateSession } = useUser();
  const { addNotification } = useNotifications();
  
  const [activeTab, setActiveTab] = useState<'governance' | 'security' | 'ai' | 'integrations' | 'infrastructure' | 'showrooms'>('governance');
  const [userSearch, setUserSearch] = useState('');
  
  // États des Modals
  const [isShowroomModalOpen, setIsShowroomModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isDeleteUserModalOpen, setIsDeleteUserModalOpen] = useState(false);
  const [isIntegrationModalOpen, setIsIntegrationModalOpen] = useState(false);
  
  // États d'édition
  const [editingShowroom, setEditingShowroom] = useState<ShowroomConfig | null>(null);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [integrationConfigs, setIntegrationConfigs] = useState<IntegrationConfig[]>([]);
  const [editingIntegration, setEditingIntegration] = useState<IntegrationConfig | null>(null);
  const [isSavingIntegration, setIsSavingIntegration] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  // States pour la partie Technicien dynamique
  const [selectedRole, setSelectedRole] = useState<UserRole>('AGENT');
  const [selectedSpecialties, setSelectedSpecialties] = useState<TicketCategory[]>([]);
  const [techPhone, setTechPhone] = useState('');
  
  const aiReady = isAiOperational();

  // Configuration des onglets par rôle
  const tabs = useMemo(() => [
    { id: 'governance', label: 'Gouvernance', icon: <Terminal size={18} />, desc: 'Identité de l\'instance' },
    { id: 'security', label: 'Sécurité & Accès', icon: <ShieldCheck size={18} />, desc: 'Comptes et politiques' },
    { id: 'ai', label: 'Intelligence Gemini', icon: <BrainCircuit size={18} />, desc: 'Moteur IA Horizon' },
    { id: 'integrations', label: 'Connecteurs Flux', icon: <Network size={18} />, desc: 'WhatsApp & Messenger' },
    { id: 'infrastructure', label: 'Cloud & Santé', icon: <HardDrive size={18} />, desc: 'Base de données Supabase' },
    { id: 'showrooms', label: 'Réseau Physique', icon: <Store size={18} />, desc: 'Sites et magasins' },
  ], []);

  useEffect(() => {
    if (activeTab === 'integrations') {
      fetchIntegrations();
    }
  }, [activeTab]);

  const fetchIntegrations = async () => {
    try {
      const data = await ApiService.integrations.getConfigs();
      setIntegrationConfigs(data);
    } catch (e) { console.error(e); }
  };

  const handleClearDatabase = async () => {
    if (!window.confirm("CRITIQUE : Cette action supprimera TOUTES les données de Royal Plaza. Voulez-vous vraiment continuer ?")) return;
    setIsClearing(true);
    try {
      await ApiService.dangerouslyClearAll();
      addNotification({ title: 'Maintenance Cloud', message: 'La base de données a été réinitialisée.', type: 'info' });
      window.location.reload();
    } catch (e) {
      addNotification({ title: 'Erreur', message: 'Réinitialisation échouée.', type: 'error' });
    } finally { setIsClearing(false); }
  };

  const filteredUsers = useMemo(() => {
    return (users || []).filter(u => 
      u.name.toLowerCase().includes(userSearch.toLowerCase()) || 
      u.email?.toLowerCase().includes(userSearch.toLowerCase())
    );
  }, [users, userSearch]);

  const handleUserSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSavingUser(true);
    const formData = new FormData(e.currentTarget);
    const userData: UserProfile = {
      id: editingUser?.id || `U-${Date.now()}`,
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      role: selectedRole,
      showroom: formData.get('showroom') as string,
      status: editingUser?.status || 'Actif',
      avatar: editingUser?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.get('name') as string)}&background=1a73e8&color=ffffff`,
      password: generatedPassword,
      mfaEnabled: formData.get('mfaEnabled') === 'on'
    };

    const techMeta = selectedRole === 'TECHNICIAN' ? { phone: techPhone, specialties: selectedSpecialties } : undefined;

    try {
      await saveUser(userData, techMeta);
      setIsUserModalOpen(false);
      setEditingUser(null);
      addNotification({ title: 'Accès Horizon', message: `Le compte de ${userData.name} est à jour.`, type: 'success' });
    } catch (err) {
      addNotification({ title: 'Erreur', message: 'Échec de la sauvegarde Cloud.', type: 'error' });
    } finally { setIsSavingUser(false); }
  };

  return (
    <div className="space-y-8 animate-page-entry pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 text-[#1a73e8] mb-1">
             <Settings2 size={20} />
             <span className="text-[10px] font-black uppercase tracking-[0.3em]">Root Configuration</span>
          </div>
          <h1 className="text-3xl font-light text-[#202124]">Console de Gouvernance</h1>
          <p className="text-[#5f6368] text-sm font-medium mt-1">Supervision technique et stratégique de Royal Plaza Horizon.</p>
        </div>
        <div className="flex gap-3">
          <div className={`flex items-center gap-3 px-4 py-2 border ${syncMetrics.status === 'CONNECTED' ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
             <div className={`w-2 h-2 rounded-full ${syncMetrics.status === 'CONNECTED' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
             <span className="text-[10px] font-black uppercase tracking-widest">{syncMetrics.status} Cloud</span>
          </div>
          <button onClick={refreshAll} className="btn-google-outlined h-11 px-4">
            <RefreshCw size={18} className={isSyncing ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row gap-10 items-start">
        {/* SIDEBAR NAVIGATION */}
        <div className="w-full lg:w-72 space-y-1 shrink-0">
          {tabs.map(tab => (
            <button 
              key={tab.id} 
              onClick={() => setActiveTab(tab.id as any)}
              className={`w-full flex items-center gap-4 px-6 py-5 border transition-all text-left group ${
                activeTab === tab.id 
                  ? 'bg-[#1a73e8] border-[#1a73e8] text-white shadow-xl shadow-blue-600/10' 
                  : 'bg-white border-[#dadce0] text-[#5f6368] hover:bg-[#f8f9fa] hover:border-[#bdc1c6]'
              }`}
            >
              <div className={`${activeTab === tab.id ? 'text-white' : 'text-[#1a73e8]'} transition-colors`}>
                {tab.icon}
              </div>
              <div className="flex-1 min-w-0">
                 <p className="text-xs font-black uppercase tracking-widest">{tab.label}</p>
                 <p className={`text-[9px] font-bold mt-0.5 truncate ${activeTab === tab.id ? 'text-white/60' : 'text-gray-400'}`}>
                   {tab.desc}
                 </p>
              </div>
              <ChevronRight size={14} className={`opacity-0 group-hover:opacity-100 transition-all ${activeTab === tab.id ? 'translate-x-1' : ''}`} />
            </button>
          ))}
        </div>

        {/* CONTENT AREA */}
        <div className="flex-1 w-full space-y-8 min-w-0">
          
          {/* TAB: GOVERNANCE */}
          {activeTab === 'governance' && (
            <div className="google-card p-10 space-y-10 animate-in fade-in slide-in-from-right-4">
               <section>
                 <div className="flex items-center gap-3 mb-8">
                    <Terminal size={20} className="text-[#1a73e8]" />
                    <h2 className="text-[11px] font-black text-[#202124] uppercase tracking-[0.2em]">Identité & Flux Global</h2>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-10 max-w-4xl">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase text-[#5f6368] tracking-widest ml-1">Nom d'affichage Instance</label>
                       <input type="text" className="w-full h-12 bg-gray-50 border-none font-bold" defaultValue="Royal Plaza - Horizon System" />
                       <p className="text-[9px] text-gray-400 font-bold uppercase ml-1">Utilisé pour les en-têtes de rapports et emails.</p>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase text-[#5f6368] tracking-widest ml-1">Région Opérationnelle</label>
                       <select className="w-full h-12 bg-gray-50 border-none font-bold">
                          <option>Gabon (Libreville)</option>
                          <option>Gabon (Port-Gentil)</option>
                       </select>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase text-[#5f6368] tracking-widest ml-1">Fréquence de Synchronisation</label>
                       <select 
                        value={config.syncFrequency}
                        onChange={(e) => updateConfig({ syncFrequency: e.target.value as any })}
                        className="w-full h-12 bg-gray-50 border-none font-bold"
                       >
                          <option value="realtime">Temps Réel (Websocket)</option>
                          <option value="hourly">Horaire (Batch)</option>
                          <option value="manual">Manuelle (On-Demand)</option>
                       </select>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase text-[#5f6368] tracking-widest ml-1">Expiration Sessions</label>
                       <select 
                        value={config.sessionTimeout}
                        onChange={(e) => updateConfig({ sessionTimeout: parseInt(e.target.value) })}
                        className="w-full h-12 bg-gray-50 border-none font-bold"
                       >
                          <option value={60}>1 Heure d'inactivité</option>
                          <option value={240}>4 Heures d'inactivité</option>
                          <option value={1440}>24 Heures (Persistant)</option>
                       </select>
                    </div>
                 </div>
               </section>

               <section className="pt-10 border-t border-[#dadce0]">
                  <div className="p-8 bg-[#fffcf5] border border-[#ffe082] flex items-center justify-between">
                     <div className="flex items-center gap-5">
                        <div className="p-3 bg-white border border-[#ffe082] text-[#f57c00]"><ShieldAlert size={24}/></div>
                        <div>
                           <p className="text-xs font-black text-[#202124] uppercase">Verrouillage de Maintenance</p>
                           <p className="text-[10px] text-[#5f6368] font-medium leading-relaxed mt-1">Si activé, l'écriture de nouveaux tickets et modifications clients sera suspendue pour tous sauf les ADMINS.</p>
                        </div>
                     </div>
                     <button 
                        onClick={() => updateConfig({ maintenanceMode: !config.maintenanceMode })}
                        className={`w-16 h-8 rounded-full relative transition-all ${config.maintenanceMode ? 'bg-red-600 shadow-lg' : 'bg-gray-200'}`}
                     >
                        <div className={`absolute top-1 w-6 h-6 bg-white transition-all ${config.maintenanceMode ? 'right-1' : 'left-1'}`} />
                     </button>
                  </div>
               </section>
            </div>
          )}

          {/* TAB: SECURITY */}
          {activeTab === 'security' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
               <div className="google-card p-10">
                  <div className="flex items-center justify-between mb-10">
                     <div className="flex items-center gap-3">
                        <Users size={20} className="text-[#1a73e8]" />
                        <h2 className="text-[11px] font-black text-[#202124] uppercase tracking-[0.2em]">Gouvernance des Identités</h2>
                     </div>
                     <div className="flex gap-3">
                        <div className="relative">
                           <Search className="absolute left-3 top-2.5 text-gray-400" size={14} />
                           <input type="text" placeholder="Rechercher..." value={userSearch} onChange={e => setUserSearch(e.target.value)} className="pl-9 h-9 w-48 text-xs bg-gray-50 border-none font-bold" />
                        </div>
                        <button onClick={() => { setEditingUser(null); setGeneratedPassword(generateRandomPassword()); setIsUserModalOpen(true); }} className="btn-google-primary h-9 text-[10px] font-black">
                           <UserPlus size={14} /> Ajouter
                        </button>
                     </div>
                  </div>

                  <div className="overflow-x-auto -mx-10">
                     <table className="w-full text-left border-collapse">
                        <thead>
                           <tr className="bg-gray-50 border-y border-[#dadce0] text-[9px] font-black uppercase text-gray-500 tracking-widest">
                              <th className="px-10 py-4">Collaborateur</th>
                              <th className="px-10 py-4">Rôle Système</th>
                              <th className="px-10 py-4">Showroom</th>
                              <th className="px-10 py-4">Sécurité MFA</th>
                              <th className="px-10 py-4 text-right">Dernière activité</th>
                              <th className="px-10 py-4"></th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                           {filteredUsers.map(user => (
                              <tr key={user.id} className="hover:bg-[#f8faff] transition-colors group">
                                 <td className="px-10 py-5">
                                    <div className="flex items-center gap-4">
                                       <img src={user.avatar} className="w-9 h-9 border p-0.5" alt="" />
                                       <div>
                                          <p className="text-sm font-black text-[#3c4043] uppercase tracking-tight">{user.name}</p>
                                          <p className="text-[10px] text-gray-400 font-mono">{user.email}</p>
                                       </div>
                                    </div>
                                 </td>
                                 <td className="px-10 py-5">
                                    <span className={`px-2 py-0.5 border text-[9px] font-black uppercase tracking-tighter ${
                                       user.role === 'ADMIN' ? 'bg-red-50 text-red-600 border-red-100' : 
                                       user.role === 'MANAGER' ? 'bg-purple-50 text-purple-600 border-purple-100' : 
                                       'bg-blue-50 text-blue-600 border-blue-100'
                                    }`}>
                                       {user.role}
                                    </span>
                                 </td>
                                 <td className="px-10 py-5 text-[10px] font-black text-gray-500 uppercase">{user.showroom || 'Corporate'}</td>
                                 <td className="px-10 py-5">
                                    <div className="flex items-center gap-2">
                                       {user.mfaEnabled ? (
                                          <div className="flex items-center gap-1.5 text-green-600">
                                             <ShieldCheck size={14} />
                                             <span className="text-[9px] font-black uppercase">Actif</span>
                                          </div>
                                       ) : (
                                          <div className="flex items-center gap-1.5 text-gray-300">
                                             <ShieldQuestion size={14} />
                                             <span className="text-[9px] font-black uppercase">Standard</span>
                                          </div>
                                       )}
                                    </div>
                                 </td>
                                 <td className="px-10 py-5 text-right">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">
                                       {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Jamais connecté'}
                                    </p>
                                 </td>
                                 <td className="px-10 py-5 text-right">
                                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                       <button onClick={(e) => { e.stopPropagation(); setEditingUser(user); setGeneratedPassword(user.password || ''); setIsUserModalOpen(true); }} className="p-2 text-blue-600 hover:bg-blue-50 transition-colors"><Edit3 size={16}/></button>
                                       <button onClick={(e) => { e.stopPropagation(); setUserToDelete(user); setIsDeleteUserModalOpen(true); }} disabled={user.id === currentUser?.id} className="p-2 text-red-600 hover:bg-red-50 disabled:opacity-0 transition-colors"><Trash2 size={16}/></button>
                                    </div>
                                 </td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                  </div>
               </div>
            </div>
          )}

          {/* TAB: AI ENGINE */}
          {activeTab === 'ai' && (
            <div className="google-card p-10 space-y-10 animate-in fade-in slide-in-from-right-4">
               <div className="flex items-center gap-6 p-8 bg-gradient-to-r from-[#e8f0fe] to-[#f8f9ff] border border-[#d2e3fc] relative overflow-hidden">
                  <div className="p-5 bg-white shadow-xl text-[#1a73e8] border border-[#d2e3fc] z-10 animate-pulse"><Cpu size={40}/></div>
                  <div className="flex-1 z-10">
                     <h2 className="text-xl font-black text-[#1a73e8] uppercase tracking-tighter">Moteur d'Intelligence Horizon</h2>
                     <p className="text-sm text-[#5f6368] font-medium mt-1">Gouvernance centralisée des flux Gemini AI.</p>
                     <div className="flex items-center gap-2 mt-3">
                        <div className={`w-2 h-2 rounded-full ${aiReady ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500'}`} />
                        <span className="text-[9px] font-black uppercase text-gray-400 tracking-widest">{aiReady ? 'Opérationnel - Cloud Google AI' : 'API Interrompue'}</span>
                     </div>
                  </div>
                  <button 
                     onClick={() => updateConfig({ aiEnabled: !config.aiEnabled })}
                     className={`w-16 h-8 rounded-full relative transition-all shadow-inner z-10 ${config.aiEnabled ? 'bg-[#1a73e8]' : 'bg-[#bdc1c6]'}`}
                  >
                     <div className={`absolute top-1 w-6 h-6 bg-white transition-all ${config.aiEnabled ? 'right-1' : 'left-1'}`} />
                  </button>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <section className="space-y-6">
                     <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-widest flex items-center gap-2"><Zap size={14} className="text-[#1a73e8]" /> Activation par Module</h3>
                     <div className="space-y-3">
                        {[
                           { id: 'aiChatbotEnabled', label: 'Assistant Live (Widget)', desc: 'Support technique direct via le chat.', icon: <MessageSquare size={16}/> },
                           { id: 'aiAutoCategorization', label: 'Triage Automatique', desc: 'Analyse et priorisation des tickets entrants.', icon: <Sliders size={16}/> },
                           { id: 'aiStrategicAudit', label: 'Audits Stratégiques', desc: 'Génération de rapports décisionnels mensuels.', icon: <BarChart4 size={16}/> },
                        ].map(module => (
                           <div key={module.id} className="p-4 bg-white border border-[#dadce0] flex items-center justify-between hover:border-[#1a73e8] transition-all">
                              <div className="flex items-center gap-4">
                                 <div className="p-2 bg-gray-50 text-gray-400 group-hover:text-[#1a73e8]">{module.icon}</div>
                                 <div>
                                    <p className="text-xs font-black text-[#3c4043] uppercase tracking-tight">{module.label}</p>
                                    <p className="text-[9px] text-gray-400 font-medium">{module.desc}</p>
                                 </div>
                              </div>
                              <button 
                                 onClick={() => updateConfig({ [module.id]: !(config as any)[module.id] })}
                                 className={`w-9 h-5 rounded-full relative transition-colors ${(config as any)[module.id] ? 'bg-[#1a73e8]' : 'bg-gray-200'}`}
                              >
                                 <div className={`absolute top-0.5 w-4 h-4 bg-white transition-all ${(config as any)[module.id] ? 'right-0.5' : 'left-0.5'}`} />
                              </button>
                           </div>
                        ))}
                     </div>
                  </section>

                  <section className="space-y-6">
                     <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-widest flex items-center gap-2"><Rocket size={14} className="text-[#1a73e8]" /> Optimisation du Modèle</h3>
                     <div className="space-y-3">
                        {[
                           { id: 'flash', label: 'Vitesse Horizon (Flash)', desc: 'Recommandé pour l\'usage quotidien et le triage.', color: 'text-green-600', bg: 'bg-green-50' },
                           { id: 'pro', label: 'Vision Stratégique (Pro)', desc: 'Idéal pour les audits financiers complexes.', color: 'text-purple-600', bg: 'bg-purple-50' },
                        ].map(model => (
                           <button 
                              key={model.id}
                              onClick={() => updateConfig({ aiModel: model.id as any })}
                              className={`w-full p-5 border-2 text-left transition-all ${config.aiModel === model.id ? `border-[#1a73e8] ${model.bg}` : 'border-transparent bg-white shadow-sm hover:border-gray-200'}`}
                           >
                              <div className="flex items-center justify-between">
                                 <p className={`text-xs font-black uppercase tracking-tight ${model.color}`}>{model.label}</p>
                                 {config.aiModel === model.id && <CheckCircle2 size={16} className="text-[#1a73e8]" />}
                              </div>
                              <p className="text-[10px] text-gray-500 mt-2 font-medium">{model.desc}</p>
                           </button>
                        ))}
                     </div>
                  </section>
               </div>
            </div>
          )}

          {/* TAB: INFRASTRUCTURE */}
          {activeTab === 'infrastructure' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
               <div className="google-card p-10 border-l-8 border-[#1a73e8]">
                  <div className="flex items-center gap-3 mb-8">
                     <Server size={20} className="text-[#1a73e8]" />
                     <h2 className="text-[11px] font-black text-[#202124] uppercase tracking-[0.2em]">État du Cloud Supabase</h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                     <div className="p-6 bg-gray-50 border border-gray-100">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Ping Latence</p>
                        <p className="text-3xl font-black text-[#1a73e8] tracking-tighter">{syncMetrics.latency || 0} <span className="text-xs uppercase">ms</span></p>
                        <div className="flex items-center gap-2 mt-2 text-green-600">
                           <Wifi size={12}/> <span className="text-[9px] font-black uppercase">Stable</span>
                        </div>
                     </div>
                     <div className="p-6 bg-gray-50 border border-gray-100">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Objets Stockés</p>
                        <p className="text-3xl font-black text-[#202124] tracking-tighter">{(tickets.length + products.length + customers.length)}</p>
                        <p className="text-[9px] font-black text-gray-400 uppercase mt-2">Tickets, Produits & CRM</p>
                     </div>
                     <div className="p-6 bg-gray-50 border border-gray-100">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Uptime Service</p>
                        <p className="text-3xl font-black text-[#188038] tracking-tighter">99.9%</p>
                        <p className="text-[9px] font-black text-gray-400 uppercase mt-2">Réseau GABON-LBV-1</p>
                     </div>
                  </div>
               </div>

               <div className="google-card p-10 border-l-8 border-red-600 bg-red-50/10">
                  <div className="flex items-center gap-3 mb-4">
                     <ShieldAlert size={20} className="text-red-600" />
                     <h2 className="text-[11px] font-black text-red-700 uppercase tracking-[0.2em]">Maintenance Critique</h2>
                  </div>
                  <p className="text-xs text-red-600 font-medium leading-relaxed max-w-2xl mb-8">
                     Attention : Les actions ci-dessous sont irréversibles et impactent l'ensemble du réseau Royal Plaza. La réinitialisation vide le Cloud Horizon de toutes ses données transactionnelles.
                  </p>
                  <button 
                     onClick={handleClearDatabase}
                     disabled={isClearing}
                     className="btn-google-primary bg-red-600 hover:bg-red-700 h-12 px-8 shadow-xl shadow-red-600/20"
                  >
                     {isClearing ? <Loader2 className="animate-spin" size={18}/> : <Trash2 size={18}/>}
                     <span>Purger l'ensemble du Cloud</span>
                  </button>
               </div>
            </div>
          )}

          {/* TAB: SHOWROOMS */}
          {activeTab === 'showrooms' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
               <div className="google-card p-10">
                  <div className="flex items-center justify-between mb-10">
                     <div className="flex items-center gap-3">
                        <Store size={20} className="text-[#1a73e8]" />
                        <h2 className="text-[11px] font-black text-[#202124] uppercase tracking-[0.2em]">Cartographie des Points de Vente</h2>
                     </div>
                     <button onClick={() => { setEditingShowroom(null); setIsShowroomModalOpen(true); }} className="btn-google-primary h-9 text-[10px] font-black">
                        <Plus size={16} /> Nouveau Site
                     </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     {showrooms.map(s => (
                        <div key={s.id} className="p-8 bg-white border border-[#dadce0] group hover:border-[#1a73e8] transition-all relative">
                           <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                              <button onClick={() => { setEditingShowroom(s); setIsShowroomModalOpen(true); }} className="p-2 text-blue-600 hover:bg-blue-50"><Edit3 size={16}/></button>
                              <button onClick={() => { if(window.confirm(`Supprimer ${s.id} ?`)) deleteShowroom(s.id); }} className="p-2 text-red-600 hover:bg-red-50"><Trash2 size={16}/></button>
                           </div>
                           <div className="flex items-start gap-5">
                              <div className="p-4 bg-gray-50 text-[#1a73e8] border border-gray-100"><MapPin size={24}/></div>
                              <div className="space-y-1">
                                 <h3 className="text-base font-black text-[#202124] uppercase">{s.id}</h3>
                                 <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tight">{s.address}</p>
                                 <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-50">
                                    <div className="flex items-center gap-2 text-[9px] font-black text-gray-400 uppercase"><Clock size={12}/> {s.hours}</div>
                                    <div className="flex items-center gap-2 text-[9px] font-black text-gray-400 uppercase"><Phone size={12}/> {s.phone}</div>
                                 </div>
                                 <div className="mt-4">
                                    <span className={`px-2 py-0.5 border text-[8px] font-black uppercase tracking-widest ${s.isOpen ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                                       {s.isOpen ? 'Ouvert' : 'Fermé'}
                                    </span>
                                 </div>
                              </div>
                           </div>
                        </div>
                     ))}
                  </div>
               </div>
            </div>
          )}

          {/* TAB: INTEGRATIONS */}
          {activeTab === 'integrations' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
               <div className="google-card p-10">
                  <div className="flex items-center gap-3 mb-10">
                     <Globe2 size={20} className="text-[#1a73e8]" />
                     <h2 className="text-[11px] font-black text-[#202124] uppercase tracking-[0.2em]">Connecteurs Omnicanaux</h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                     {integrationConfigs.map(integration => (
                        <div key={integration.id} className="p-8 bg-white border border-[#dadce0] hover:border-[#1a73e8] transition-all flex flex-col shadow-sm">
                           <div className="flex items-center justify-between mb-8">
                              <div className={`w-14 h-14 border flex items-center justify-center ${
                                 integration.id === 'whatsapp' ? 'bg-green-50 text-green-600 border-green-100' : 
                                 integration.id === 'messenger' ? 'bg-blue-50 text-blue-600 border-blue-100' : 
                                 'bg-red-50 text-red-600 border-red-100'
                              }`}>
                                 {integration.id === 'whatsapp' ? <Smartphone size={28}/> : 
                                  integration.id === 'messenger' ? <Facebook size={28}/> : <Mail size={28}/>}
                              </div>
                              <div className={`w-3 h-3 rounded-full ${integration.enabled ? 'bg-green-500 animate-pulse' : 'bg-gray-200'}`} />
                           </div>
                           <h3 className="text-sm font-black text-[#202124] uppercase mb-1">{integration.name}</h3>
                           <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-6">Connecteur de flux direct</p>
                           <button 
                              onClick={() => { setEditingIntegration(integration); setIsIntegrationModalOpen(true); }}
                              className="mt-auto w-full py-3 bg-gray-50 hover:bg-blue-50 text-[10px] font-black text-gray-500 hover:text-[#1a73e8] border border-transparent hover:border-blue-100 uppercase tracking-widest transition-all"
                           >
                              Paramétrer l'API
                           </button>
                        </div>
                     ))}
                  </div>
               </div>
            </div>
          )}

        </div>
      </div>

      {/* MODAL USER EDIT/ADD */}
      <Modal isOpen={isUserModalOpen} onClose={() => !isSavingUser && setIsUserModalOpen(false)} title="Profil Utilisateur Système" size="lg">
        <form onSubmit={handleUserSave} className="space-y-8 animate-in slide-in-from-top-4">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
              <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase text-[#5f6368] tracking-widest ml-1">Nom du Collaborateur</label>
                 <input name="name" type="text" defaultValue={editingUser?.name || ''} required className="h-12 bg-gray-50 border-none font-black" />
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase text-[#5f6368] tracking-widest ml-1">Adresse Email Pro</label>
                 <input name="email" type="email" defaultValue={editingUser?.email || ''} required className="h-12 bg-gray-50 border-none font-bold" />
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase text-[#5f6368] tracking-widest ml-1">Rôle Système</label>
                 <select 
                   value={selectedRole} 
                   onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                   className="h-12 bg-gray-50 border-none font-black"
                 >
                    <option value="AGENT">AGENT SAV</option>
                    <option value="MANAGER">MANAGER DIRECTION</option>
                    <option value="TECHNICIAN">EXPERT TECHNIQUE</option>
                    <option value="ADMIN">ADMINISTRATEUR IT</option>
                 </select>
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase text-[#5f6368] tracking-widest ml-1">Showroom Affecté</label>
                 <select name="showroom" defaultValue={editingUser?.showroom || 'Glass'} className="h-12 bg-gray-50 border-none font-black">
                    {showrooms.map(s => <option key={s.id} value={s.id}>{s.id}</option>)}
                    <option value="">Corporate / Mobile</option>
                 </select>
              </div>

              {selectedRole === 'TECHNICIAN' && (
                <div className="col-span-2 p-8 bg-blue-50 border border-blue-100 space-y-6">
                   <div className="flex items-center gap-3 text-blue-700">
                      <Wrench size={20} />
                      <h4 className="text-xs font-black uppercase tracking-widest">Spécificités Expert Terrain</h4>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase text-blue-600 tracking-widest">Mobile Direct Expert</label>
                         <input type="tel" value={techPhone} onChange={(e) => setTechPhone(e.target.value)} placeholder="+241..." className="h-12 bg-white border-blue-100 font-bold" />
                      </div>
                      <div className="space-y-3">
                         <label className="text-[10px] font-black uppercase text-blue-600 tracking-widest">Expertises Validées</label>
                         <div className="grid grid-cols-2 gap-2">
                            {CATEGORIES.slice(0, 4).map(cat => (
                               <button 
                                key={cat} type="button" onClick={() => setSelectedSpecialties(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat])}
                                className={`flex items-center gap-2 p-3 text-[9px] font-black uppercase transition-all ${selectedSpecialties.includes(cat) ? 'bg-blue-600 text-white' : 'bg-white text-blue-400 border border-blue-100'}`}
                               >
                                  {selectedSpecialties.includes(cat) ? <CheckSquare size={12}/> : <Square size={12}/>} {cat}
                               </button>
                            ))}
                         </div>
                      </div>
                   </div>
                </div>
              )}

              <div className="col-span-2 space-y-4 pt-6 border-t border-gray-100">
                 <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase text-[#5f6368] tracking-widest">Sécurité des Accès</label>
                    <button type="button" onClick={() => setGeneratedPassword(generateRandomPassword())} className="text-[9px] font-black text-[#1a73e8] uppercase hover:underline">Régénérer Clé</button>
                 </div>
                 <div className="relative">
                    <input type={showPassword ? 'text' : 'password'} value={generatedPassword} onChange={e => setGeneratedPassword(e.target.value)} className="w-full h-14 bg-gray-50 border-none font-mono text-center text-xl tracking-[0.3em] font-black" required />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-3 text-gray-400 p-1 hover:text-[#1a73e8]">
                       {showPassword ? <EyeOff size={20}/> : <Eye size={20}/>}
                    </button>
                 </div>
                 <div className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-100">
                    <input type="checkbox" name="mfaEnabled" defaultChecked={editingUser?.mfaEnabled} className="w-5 h-5 rounded border-gray-300 text-[#1a73e8]" />
                    <div>
                       <p className="text-[10px] font-black text-[#3c4043] uppercase">Forcer la Double Authentification (MFA)</p>
                       <p className="text-[9px] text-gray-400 font-medium">Requis pour l'accès aux modules d'audit et finances.</p>
                    </div>
                 </div>
              </div>
           </div>

           <div className="flex gap-4 pt-8 border-t border-gray-100">
              <button type="submit" disabled={isSavingUser} className="flex-1 btn-google-primary justify-center py-5 text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-blue-600/20">
                {isSavingUser ? <Loader2 className="animate-spin" size={20}/> : <><Save size={20}/> Mettre à jour les privilèges</>}
              </button>
              <button type="button" onClick={() => setIsUserModalOpen(false)} className="btn-google-outlined px-12 text-[10px] font-black uppercase">Abandonner</button>
           </div>
        </form>
      </Modal>

      {/* MODAL CONFIGURATION INTEGRATION */}
      <Modal isOpen={isIntegrationModalOpen} onClose={() => !isSavingIntegration && setIsIntegrationModalOpen(false)} title={`Config Connecteur : ${editingIntegration?.name}`} size="md">
        {editingIntegration && (
          <form onSubmit={async (e) => {
             e.preventDefault();
             setIsSavingIntegration(true);
             const formData = new FormData(e.currentTarget);
             const updated = { ...editingIntegration, enabled: formData.get('enabled') === 'on', apiKey: formData.get('apiKey') as string, webhookUrl: formData.get('webhookUrl') as string };
             await ApiService.integrations.saveConfig(updated);
             setIsIntegrationModalOpen(false);
             fetchIntegrations();
             setIsSavingIntegration(false);
             addNotification({ title: 'Intégration Sync', message: 'Connecteur mis à jour.', type: 'success' });
          }} className="space-y-8 animate-in slide-in-from-bottom-4">
             <div className="p-6 bg-gray-50 border border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-white border border-gray-100 flex items-center justify-center text-[#1a73e8] shadow-sm"><Globe size={24}/></div>
                   <div>
                      <p className="text-xs font-black text-[#202124] uppercase">Flux Opérationnel</p>
                      <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">{editingIntegration.enabled ? 'Connecté' : 'Hors-Ligne'}</p>
                   </div>
                </div>
                <input type="checkbox" name="enabled" defaultChecked={editingIntegration.enabled} className="w-6 h-6 rounded text-[#1a73e8]" />
             </div>
             <div className="space-y-6">
                <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Clé Secrète API / Token</label>
                   <input name="apiKey" type="password" defaultValue={editingIntegration.apiKey} className="h-12 bg-gray-50 border-none font-mono text-sm" placeholder="••••••••••••••••" />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">URL Entrante Webhook</label>
                   <input name="webhookUrl" type="url" defaultValue={editingIntegration.webhookUrl} className="h-12 bg-gray-50 border-none font-bold text-xs" placeholder="https://..." />
                </div>
             </div>
             <div className="flex gap-3 pt-6 border-t border-gray-100">
                <button type="submit" disabled={isSavingIntegration} className="flex-1 btn-google-primary justify-center py-4 text-xs font-black uppercase shadow-xl shadow-blue-600/20">
                   {isSavingIntegration ? <Loader2 size={18} className="animate-spin"/> : <><RefreshCw size={18}/> Valider le Connecteur</>}
                </button>
             </div>
          </form>
        )}
      </Modal>

      {/* MODAL SHOWROOM */}
      <Modal isOpen={isShowroomModalOpen} onClose={() => setIsShowroomModalOpen(false)} title="Fiche Site Physique">
        <form onSubmit={async (e) => {
           e.preventDefault();
           const formData = new FormData(e.currentTarget);
           await saveShowroom({ 
             id: formData.get('id') as string, 
             address: formData.get('address') as string, 
             phone: formData.get('phone') as string, 
             hours: formData.get('hours') as string, 
             isOpen: formData.get('isOpen') === 'on' 
           });
           setIsShowroomModalOpen(false);
           addNotification({ title: 'Réseau Plaza', message: 'Showroom mis à jour.', type: 'success' });
        }} className="space-y-8">
           <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1"><label className="text-[10px] font-black uppercase text-gray-400">ID Showroom</label><input name="id" type="text" defaultValue={editingShowroom?.id} required className="h-11 bg-gray-50 border-none font-black" /></div>
              <div className="space-y-1"><label className="text-[10px] font-black uppercase text-gray-400">Mobile Direct</label><input name="phone" type="tel" defaultValue={editingShowroom?.phone} required className="h-11 bg-gray-50 border-none font-black" /></div>
              <div className="col-span-2 space-y-1"><label className="text-[10px] font-black uppercase text-gray-400">Adresse Complète</label><input name="address" type="text" defaultValue={editingShowroom?.address} required className="h-11 bg-gray-50 border-none font-bold" /></div>
              <div className="space-y-1"><label className="text-[10px] font-black uppercase text-gray-400">Horaires</label><input name="hours" type="text" defaultValue={editingShowroom?.hours} className="h-11 bg-gray-50 border-none font-bold" /></div>
              <div className="flex items-center gap-3 pt-6"><input name="isOpen" type="checkbox" defaultChecked={editingShowroom?.isOpen ?? true} className="w-5 h-5 rounded" /><span className="text-[10px] font-black uppercase text-gray-500">Site Actif</span></div>
           </div>
           <div className="flex gap-3 pt-8 border-t border-gray-100"><button type="submit" className="flex-1 btn-google-primary justify-center">Enregistrer le Site</button></div>
        </form>
      </Modal>

      {/* MODAL DELETE USER */}
      <Modal isOpen={isDeleteUserModalOpen} onClose={() => setIsDeleteUserModalOpen(false)} title="Alerte Sécurité" size="sm">
         <div className="space-y-8 text-center p-4">
            <div className="w-20 h-20 bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-red-200"><ShieldAlert size={40}/></div>
            <h3 className="text-lg font-black text-[#202124] uppercase tracking-tighter leading-none">Révoquer définitivement ?</h3>
            <p className="text-xs text-gray-500 font-medium leading-relaxed uppercase">
               La suppression du compte de <span className="text-red-600 font-black underline">{userToDelete?.name}</span> révoquera immédiatement tous ses accès au cloud Royal Plaza.
            </p>
            <div className="flex gap-3 pt-4">
               <button onClick={async () => { if(userToDelete) await deleteUser(userToDelete.id); setIsDeleteUserModalOpen(false); }} className="flex-1 py-4 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-red-600/20">Révoquer Accès</button>
               <button onClick={() => setIsDeleteUserModalOpen(false)} className="flex-1 py-4 bg-gray-100 text-gray-500 text-[10px] font-black uppercase tracking-widest border border-gray-200">Annuler</button>
            </div>
         </div>
      </Modal>

    </div>
  );
};

export default Settings;
