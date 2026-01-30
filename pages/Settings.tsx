
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Settings2, Shield, Database, RefreshCw, Plus, X, Trash2, 
  Key, Lock, UserCog, Search,
  CheckCircle2, AlertCircle, Clock, Smartphone, Users,
  History, Activity, Monitor, Globe, BrainCircuit, Sparkles,
  Zap, Save, MapPin, Phone, Store, ChevronRight, Edit3,
  Wifi, Server, CloudLightning, Info, ShieldCheck, Eye, EyeOff,
  UserPlus, UserMinus, ShieldAlert, Loader2, Fingerprint, LogIn,
  Wrench, CheckSquare, Square, MessageSquare, Facebook, Mail,
  Link, ExternalLink, Sliders, Cpu, Rocket, BarChart4
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
  for (let i = 0; i < 12; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
};

const Settings: React.FC = () => {
  const { brands, users, showrooms, refreshAll, isSyncing, config, updateConfig, saveShowroom, deleteShowroom, syncMetrics, saveUser, deleteUser, technicians } = useData();
  const { currentUser, updateUser: updateSession } = useUser();
  const { addNotification } = useNotifications();
  
  const [activeTab, setActiveTab] = useState<'general' | 'auth' | 'database' | 'ai' | 'integrations'>('general');
  const [userSearch, setUserSearch] = useState('');
  
  // États des Modals
  const [isShowroomModalOpen, setIsShowroomModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isDeleteUserModalOpen, setIsDeleteUserModalOpen] = useState(false);
  const [isIntegrationModalOpen, setIsIntegrationModalOpen] = useState(false);
  
  // États d'édition et détails
  const [editingShowroom, setEditingShowroom] = useState<ShowroomConfig | null>(null);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [selectedUserForDetails, setSelectedUserForDetails] = useState<UserProfile | null>(null);
  const [integrationConfigs, setIntegrationConfigs] = useState<IntegrationConfig[]>([]);
  const [editingIntegration, setEditingIntegration] = useState<IntegrationConfig | null>(null);
  const [isSavingIntegration, setIsSavingIntegration] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [isSavingUser, setIsSavingUser] = useState(false);

  // States pour la partie Technicien dynamique
  const [selectedRole, setSelectedRole] = useState<UserRole>('AGENT');
  const [selectedSpecialties, setSelectedSpecialties] = useState<TicketCategory[]>([]);
  const [techPhone, setTechPhone] = useState('');
  
  const aiReady = isAiOperational();

  // Configuration des onglets par rôle
  const tabs = useMemo(() => {
    const baseTabs = [
      { id: 'general', label: 'Général', icon: <Settings2 size={18} /> },
      { id: 'ai', label: 'IA Gemini', icon: <BrainCircuit size={18} /> },
      { id: 'integrations', label: 'Intégrations', icon: <MessageSquare size={18} /> },
    ];
    
    if (currentUser?.role === 'ADMIN') {
      return [
        ...baseTabs,
        { id: 'auth', label: 'Sécurité & Accès', icon: <Shield size={18} /> },
        { id: 'database', label: 'Données & Cloud', icon: <Database size={18} /> },
      ];
    }
    return baseTabs;
  }, [currentUser]);

  useEffect(() => {
    if (activeTab === 'integrations') {
      fetchIntegrations();
    }
  }, [activeTab]);

  const fetchIntegrations = async () => {
    try {
      const data = await ApiService.integrations.getConfigs();
      setIntegrationConfigs(data);
    } catch (e) {
      console.error(e);
    }
  };

  const filteredUsers = useMemo(() => {
    return (users || []).filter(u => 
      u.name.toLowerCase().includes(userSearch.toLowerCase()) || 
      u.email?.toLowerCase().includes(userSearch.toLowerCase())
    );
  }, [users, userSearch]);

  const handleIntegrationSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingIntegration) return;
    setIsSavingIntegration(true);
    const formData = new FormData(e.currentTarget);
    
    const updated: IntegrationConfig = {
      ...editingIntegration,
      enabled: formData.get('enabled') === 'on',
      apiKey: formData.get('apiKey') as string,
      webhookUrl: formData.get('webhookUrl') as string,
      settings: {
        ...editingIntegration.settings,
        region: formData.get('region'),
        appId: formData.get('appId')
      }
    };

    try {
      await ApiService.integrations.saveConfig(updated);
      setIsIntegrationModalOpen(false);
      setEditingIntegration(null);
      await fetchIntegrations();
      addNotification({ title: 'Intégration Cloud', message: `Flux ${updated.name} synchronisé.`, type: 'success' });
    } catch (e) {
      addNotification({ title: 'Erreur Sync', message: 'Échec de la mise à jour du connecteur.', type: 'error' });
    } finally {
      setIsSavingIntegration(false);
    }
  };

  const openAddShowroom = () => {
    setEditingShowroom(null);
    setIsShowroomModalOpen(true);
  };

  const openEditShowroom = (showroom: ShowroomConfig) => {
    setEditingShowroom(showroom);
    setIsShowroomModalOpen(true);
  };

  const handleShowroomSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const showroomData: ShowroomConfig = {
      id: formData.get('id') as Showroom,
      address: formData.get('address') as string,
      phone: formData.get('phone') as string,
      hours: formData.get('hours') as string,
      isOpen: formData.get('isOpen') === 'on'
    };
    await saveShowroom(showroomData);
    setIsShowroomModalOpen(false);
    setEditingShowroom(null);
    addNotification({ title: 'Showroom', message: 'Les paramètres du site ont été mis à jour.', type: 'success' });
  };

  const openAddUser = () => {
    setEditingUser(null);
    setSelectedRole('AGENT');
    setSelectedSpecialties(['SAV']);
    setTechPhone('');
    const pass = generateRandomPassword();
    setGeneratedPassword(pass);
    setShowPassword(true);
    setIsUserModalOpen(true);
  };

  const openEditUser = (e: React.MouseEvent, user: UserProfile) => {
    e.stopPropagation();
    setEditingUser(user);
    setSelectedRole(user.role);
    
    const techProfile = technicians.find(t => t.id === user.id);
    if (techProfile) {
      setSelectedSpecialties(techProfile.specialty);
      setTechPhone(techProfile.phone);
    } else {
      setSelectedSpecialties(['SAV']);
      setTechPhone('');
    }

    setGeneratedPassword(user.password || '');
    setShowPassword(false);
    setIsUserModalOpen(true);
  };

  const handleDeleteUserClick = (e: React.MouseEvent, user: UserProfile) => {
    e.stopPropagation();
    if (user.id === currentUser?.id) return;
    setUserToDelete(user);
    setIsDeleteUserModalOpen(true);
  };

  const handleConfirmDeleteUser = async () => {
    if (!userToDelete) return;
    await deleteUser(userToDelete.id);
    setIsDeleteUserModalOpen(false);
    setUserToDelete(null);
  };

  const toggleSpecialty = (cat: TicketCategory) => {
    setSelectedSpecialties(prev => 
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const handleUserSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSavingUser(true);
    
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    
    const userData: UserProfile = {
      id: editingUser?.id || `U-${Date.now()}-${Math.floor(100 + Math.random() * 899)}`,
      name: formData.get('name') as string,
      email: email,
      role: selectedRole,
      showroom: formData.get('showroom') as string,
      status: editingUser?.status || 'Actif',
      avatar: editingUser?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.get('name') as string)}&background=1a73e8&color=ffffff`,
      password: generatedPassword,
      mfaEnabled: editingUser?.mfaEnabled || false,
      preferences: editingUser?.preferences || {
        pushNotifications: true,
        darkModeAuto: false,
        weeklyEmail: true,
        criticalAlerts: true
      }
    };

    const techMeta = selectedRole === 'TECHNICIAN' ? {
      phone: techPhone,
      specialties: selectedSpecialties
    } : undefined;

    try {
      await saveUser(userData, techMeta);
      if (currentUser?.id === userData.id) updateSession(userData);
      setIsUserModalOpen(false);
      setEditingUser(null);
      addNotification({ title: 'Accès Horizon', message: `Le compte de ${userData.name} est à jour.`, type: 'success' });
    } catch (err) {
      addNotification({ title: 'Erreur', message: 'Échec de la sauvegarde Cloud.', type: 'error' });
    } finally {
      setIsSavingUser(false);
    }
  };

  return (
    <div className="space-y-6 animate-page-entry pb-20">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-normal text-[#3c4043]">Paramètres Horizon</h1>
          <p className="text-[#5f6368] text-sm">Contrôle de la gouvernance et de l'intelligence système.</p>
        </div>
        <button onClick={refreshAll} className="btn-google-outlined text-sm flex items-center gap-2">
           <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
           Synchroniser
        </button>
      </header>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* TAB NAV */}
        <div className="w-full lg:w-64 space-y-1 bg-white p-2 rounded-2xl border border-[#dadce0]">
          {tabs.map(tab => (
            <button 
              key={tab.id} 
              onClick={() => setActiveTab(tab.id as any)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-bold ${
                activeTab === tab.id 
                  ? 'bg-[#1a73e8] text-white shadow-lg shadow-blue-600/20' 
                  : 'text-[#5f6368] hover:bg-[#f1f3f4]'
              }`}
            >
              <span className={activeTab === tab.id ? 'text-white' : 'text-[#5f6368]'}>
                {tab.icon}
              </span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB CONTENT */}
        <div className="flex-1 w-full space-y-6">
          {activeTab === 'general' && (
            <div className="google-card p-8 space-y-8">
               <section>
                 <h2 className="text-base font-medium text-[#3c4043] mb-6">Identité de l'Instance</h2>
                 <div className="space-y-6 max-w-xl">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-[#5f6368] tracking-widest ml-1">Nom d'affichage SAV</label>
                      <input type="text" className="w-full" defaultValue="Royal Plaza - Horizon System" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase text-[#5f6368] tracking-widest ml-1">Fuseau horaire</label>
                          <select className="w-full">
                             <option>(GMT+01:00) Afrique/Libreville</option>
                          </select>
                       </div>
                       <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase text-[#5f6368] tracking-widest ml-1">Fréquence Cloud</label>
                          <select 
                            className="w-full" 
                            disabled={currentUser?.role !== 'ADMIN'}
                            value={config.syncFrequency}
                            onChange={(e) => updateConfig({ syncFrequency: e.target.value as any })}
                          >
                             <option value="realtime">Temps réel</option>
                             <option value="manual">Manuelle</option>
                          </select>
                       </div>
                    </div>
                 </div>
               </section>

               <section className="pt-8 border-t border-[#dadce0]">
                  <h2 className="text-base font-medium text-[#3c4043] mb-6 flex items-center gap-2">
                    <Monitor size={18} className="text-[#1a73e8]" /> États Opérationnels
                  </h2>
                  <div className="p-4 bg-[#f8f9fa] border border-[#dadce0] rounded-lg flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-[#3c4043]">Mode Maintenance</p>
                      <p className="text-[10px] text-[#5f6368]">Verrouiller les nouvelles écritures en base de données.</p>
                    </div>
                    <button 
                      disabled={currentUser?.role !== 'ADMIN'}
                      onClick={() => updateConfig({ maintenanceMode: !config.maintenanceMode })}
                      className={`w-10 h-5 rounded-full relative transition-colors ${config.maintenanceMode ? 'bg-[#d93025]' : 'bg-[#bdc1c6]'} ${currentUser?.role !== 'ADMIN' ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${config.maintenanceMode ? 'right-1' : 'left-1'}`} />
                    </button>
                  </div>
               </section>
            </div>
          )}

          {activeTab === 'integrations' && (
            <div className="space-y-6">
               <div className="google-card p-8">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                       <h2 className="text-lg font-black text-[#202124] uppercase tracking-tight">Intégrations Omnicanales</h2>
                       <p className="text-xs text-[#5f6368] mt-1">Connectez Royal Plaza aux réseaux sociaux et messageries réelles.</p>
                    </div>
                    <div className="p-2 bg-blue-50 text-[#1a73e8] rounded-xl"><Smartphone size={24}/></div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {integrationConfigs.map(integration => (
                      <div key={integration.id} className="p-6 bg-white border border-[#dadce0] rounded-3xl hover:border-[#1a73e8] transition-all group shadow-sm">
                        <div className="flex items-start justify-between mb-6">
                           <div className="flex items-center gap-4">
                              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-sm ${
                                integration.id === 'whatsapp' ? 'bg-green-50 text-green-600 border-green-100' :
                                integration.id === 'messenger' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                'bg-red-50 text-red-600 border-red-100'
                              }`}>
                                {integration.id === 'whatsapp' && <Smartphone size={24} />}
                                {integration.id === 'messenger' && <Facebook size={24} />}
                                {integration.id === 'email' && <Mail size={24} />}
                              </div>
                              <div>
                                 <h3 className="text-sm font-black text-[#3c4043]">{integration.name}</h3>
                                 <div className="flex items-center gap-2 mt-1">
                                    <div className={`w-2 h-2 rounded-full ${integration.enabled ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
                                    <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{integration.enabled ? 'Connecté' : 'Désactivé'}</span>
                                 </div>
                              </div>
                           </div>
                           <button 
                             onClick={() => { setEditingIntegration(integration); setIsIntegrationModalOpen(true); }}
                             className="p-2 text-[#5f6368] hover:bg-[#f1f3f4] rounded-xl transition-all"
                           >
                             <Sliders size={20} />
                           </button>
                        </div>
                        <div className="space-y-4">
                           <div className="p-3 bg-[#f8f9fa] rounded-xl border border-transparent text-[10px] text-[#5f6368] font-bold uppercase tracking-widest flex items-center justify-between">
                              <span>Flux Direct Cloud</span>
                              <CloudLightning size={14} className={integration.enabled ? 'text-blue-500' : 'text-gray-300'} />
                           </div>
                           <button 
                            onClick={() => { setEditingIntegration(integration); setIsIntegrationModalOpen(true); }}
                            className="w-full py-3 bg-[#f1f3f4] hover:bg-[#e8f0fe] text-[#5f6368] hover:text-[#1a73e8] rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all"
                           >
                             Configurer le connecteur
                           </button>
                        </div>
                      </div>
                    ))}
                  </div>
               </div>

               <div className="google-card p-8 border-l-4 border-[#1a73e8] bg-blue-50/30">
                  <div className="flex items-start gap-4">
                     <Info className="text-[#1a73e8] shrink-0 mt-1" size={24} />
                     <div>
                        <h4 className="text-sm font-black text-[#1a73e8] uppercase">Note de Synchronisation</h4>
                        <p className="text-xs text-[#5f6368] mt-2 leading-relaxed">
                           Les messages entrants via WhatsApp et Messenger sont automatiquement analysés par <strong>Gemini IA</strong> pour suggérer des tickets SAV prioritaires. Assurez-vous que vos Webhooks sont actifs sur les consoles développeurs respectives.
                        </p>
                     </div>
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="space-y-6">
               <div className="google-card p-8 space-y-8">
                  <div className="flex items-center gap-6 p-8 bg-gradient-to-r from-[#e8f0fe] to-[#f8f9ff] border border-[#d2e3fc] rounded-[40px] shadow-sm relative overflow-hidden">
                     <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100 rounded-full -mr-16 -mt-16 opacity-30" />
                     <div className="p-5 bg-white rounded-3xl text-[#1a73e8] shadow-xl border border-[#d2e3fc] z-10 animate-pulse">
                        <Cpu size={40}/>
                     </div>
                     <div className="z-10 flex-1">
                        <h2 className="text-xl font-black text-[#1a73e8] uppercase tracking-tighter">Moteur Horizon Intelligence</h2>
                        <p className="text-sm text-[#5f6368] font-medium mt-1">Gouvernance centralisée de l'IA générative Gemini.</p>
                        <div className="flex items-center gap-2 mt-3">
                           <div className={`w-2 h-2 rounded-full ${aiReady ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500'}`} />
                           <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{aiReady ? 'Connecté au Cloud Google AI' : 'API Non Configurée'}</span>
                        </div>
                     </div>
                     <div className="z-10">
                        <button 
                           onClick={() => updateConfig({ aiEnabled: !config.aiEnabled })}
                           className={`w-16 h-8 rounded-full relative transition-all shadow-inner ${config.aiEnabled ? 'bg-[#1a73e8]' : 'bg-[#bdc1c6]'}`}
                        >
                           <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-lg transition-all ${config.aiEnabled ? 'right-1' : 'left-1'}`} />
                        </button>
                     </div>
                  </div>

                  {config.aiEnabled && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-top-4 duration-500">
                       <section className="space-y-6">
                          <h3 className="text-[10px] font-black uppercase text-[#5f6368] tracking-widest flex items-center gap-2 px-2">
                             <Zap size={14} className="text-[#1a73e8]" /> Modules d'activation
                          </h3>
                          <div className="space-y-3">
                             {[
                                { id: 'aiChatbotEnabled', label: 'Chatbot d\'assistance', desc: 'Aide technique en temps réel via le widget.', icon: <MessageSquare size={16}/> },
                                { id: 'aiAutoCategorization', label: 'Auto-Classification', desc: 'Analyse et tri automatique des nouveaux tickets.', icon: <Sliders size={16}/> },
                                { id: 'aiStrategicAudit', label: 'Audits Stratégiques', desc: 'Génération de rapports de gouvernance.', icon: <BarChart4 size={16}/> },
                             ].map(module => (
                                <div key={module.id} className="p-4 bg-white border border-[#dadce0] rounded-2xl flex items-center justify-between hover:border-[#1a73e8] transition-all group">
                                   <div className="flex items-center gap-4">
                                      <div className="p-2 bg-gray-50 text-gray-400 group-hover:text-[#1a73e8] rounded-xl transition-colors">{module.icon}</div>
                                      <div>
                                         <p className="text-xs font-black text-[#3c4043] uppercase">{module.label}</p>
                                         <p className="text-[10px] text-[#5f6368]">{module.desc}</p>
                                      </div>
                                   </div>
                                   <button 
                                      onClick={() => updateConfig({ [module.id]: !(config as any)[module.id] })}
                                      className={`w-9 h-5 rounded-full relative transition-colors ${(config as any)[module.id] ? 'bg-[#1a73e8]' : 'bg-[#bdc1c6]'}`}
                                   >
                                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${(config as any)[module.id] ? 'right-0.5' : 'left-0.5'}`} />
                                   </button>
                                </div>
                             ))}
                          </div>
                       </section>

                       <section className="space-y-6">
                          <h3 className="text-[10px] font-black uppercase text-[#5f6368] tracking-widest flex items-center gap-2 px-2">
                             <Rocket size={14} className="text-[#1a73e8]" /> Profil de performance
                          </h3>
                          <div className="space-y-3">
                             {[
                                { id: 'flash', label: 'Mode Horizon (Flash)', desc: 'Optimisé pour la vitesse et les flux quotidiens.', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100' },
                                { id: 'pro', label: 'Mode Visionnaire (Pro)', desc: 'Analyse profonde, idéal pour les audits complexes.', color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100' },
                             ].map(model => (
                                <button 
                                   key={model.id}
                                   onClick={() => updateConfig({ aiModel: model.id as any })}
                                   className={`w-full p-5 rounded-2xl border-2 text-left transition-all relative ${config.aiModel === model.id ? `border-[#1a73e8] ${model.bg} shadow-lg shadow-blue-600/5` : 'border-transparent bg-white shadow-sm hover:border-gray-200'}`}
                                >
                                   <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                         <div className={`w-2 h-2 rounded-full ${model.id === 'flash' ? 'bg-green-500' : 'bg-purple-500'}`} />
                                         <p className={`text-xs font-black uppercase tracking-tight ${model.color}`}>{model.label}</p>
                                      </div>
                                      {config.aiModel === model.id && <CheckCircle2 size={18} className="text-[#1a73e8]" />}
                                   </div>
                                   <p className="text-[10px] text-[#5f6368] mt-2 leading-relaxed">{model.desc}</p>
                                </button>
                             ))}
                          </div>
                       </section>
                    </div>
                  )}
               </div>
            </div>
          )}

          {currentUser?.role === 'ADMIN' && activeTab === 'auth' && (
            <div className="space-y-6">
              <div className="google-card p-8">
                <h2 className="text-base font-medium text-[#3c4043] mb-6 flex items-center gap-2">
                  <Key size={18} className="text-[#1a73e8]" /> Politiques d'Accès
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-4 bg-[#f8f9fa] border border-[#dadce0] rounded-lg flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-[#3c4043]">Forcer le MFA</p>
                      <p className="text-[10px] text-[#5f6368]">Double authentification requise pour les privilèges.</p>
                    </div>
                    <button 
                      onClick={() => updateConfig({ mfaRequired: !config.mfaRequired })}
                      className={`w-10 h-5 rounded-full relative transition-colors ${config.mfaRequired ? 'bg-[#1a73e8]' : 'bg-[#bdc1c6]'}`}
                    >
                      <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${config.mfaRequired ? 'right-1' : 'left-1'}`} />
                    </button>
                  </div>
                  <div className="p-4 bg-[#f8f9fa] border border-[#dadce0] rounded-lg flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-[#3c4043]">Session Timeout</p>
                    </div>
                    <select 
                      value={config.sessionTimeout} 
                      onChange={e => updateConfig({ sessionTimeout: parseInt(e.target.value) })}
                      className="h-8 py-0 px-2 text-xs bg-white border-[#dadce0] rounded"
                    >
                      <option value={60}>1 heure</option>
                      <option value={240}>4 heures</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="google-card">
                <div className="p-6 border-b border-[#dadce0] flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-base font-medium text-[#3c4043]">Gestion des Comptes</h2>
                    <p className="text-[11px] text-[#5f6368]">Contrôle strict des collaborateurs et de leurs rôles.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 text-[#5f6368]" size={14} />
                      <input type="text" placeholder="Filtrer..." value={userSearch} onChange={e => setUserSearch(e.target.value)} className="pl-9 h-9 w-48 text-xs" />
                    </div>
                    <button onClick={openAddUser} className="btn-google-primary text-xs h-9">
                       <UserPlus size={16} /> Ajouter
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#dadce0] text-[#5f6368] font-bold uppercase bg-[#f8f9fa]">
                        <th className="px-6 py-3">Collaborateur</th>
                        <th className="px-6 py-3">Rôle</th>
                        <th className="px-6 py-3">Dernier Accès</th>
                        <th className="px-6 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#dadce0]">
                      {filteredUsers.map(user => (
                        <tr key={user.id} onClick={() => setSelectedUserForDetails(user)} className="hover:bg-[#f8f9fa] cursor-pointer group">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <img src={user.avatar} className="w-8 h-8 rounded-full border" alt="" />
                              <div>
                                <p className="font-bold text-[#3c4043]">{user.name}</p>
                                <p className="text-[10px] text-[#5f6368]">{user.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-0.5 rounded border text-[9px] font-bold uppercase bg-gray-100`}>{user.role}</span>
                          </td>
                          <td className="px-6 py-4 text-[#5f6368]">
                             {user.lastLogin ? new Date(user.lastLogin).toLocaleString('fr-FR', {dateStyle:'short', timeStyle:'short'}) : 'Jamais'}
                          </td>
                          <td className="px-6 py-4 text-right">
                             <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={(e) => openEditUser(e, user)} className="p-1 text-[#1a73e8]"><Edit3 size={14}/></button>
                                <button onClick={(e) => handleDeleteUserClick(e, user)} disabled={currentUser?.id === user.id} className="p-1 text-red-600 disabled:opacity-20"><Trash2 size={14}/></button>
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

          {currentUser?.role === 'ADMIN' && activeTab === 'database' && (
            <div className="space-y-6">
               <div className="google-card p-6 border-l-4 border-[#1a73e8]">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-sm font-bold text-[#3c4043] flex items-center gap-2"><Wifi size={16} className="text-[#1a73e8]" /> Cloud Supabase</h2>
                      <p className="text-[10px] text-[#5f6368]">État de la réplication des données techniques.</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                     <div className="p-4 bg-white border border-[#dadce0] rounded-lg">
                        <p className="text-[9px] font-black text-[#5f6368] uppercase tracking-widest mb-1">Ping</p>
                        <span className="text-xl font-bold text-[#1a73e8]">{syncMetrics.latency || '--'} ms</span>
                     </div>
                     <div className="p-4 bg-white border border-[#dadce0] rounded-lg">
                        <p className="text-[9px] font-black text-[#5f6368] uppercase tracking-widest mb-1">Status</p>
                        <span className={`text-[10px] font-black uppercase ${syncMetrics.status === 'CONNECTED' ? 'text-green-600' : 'text-red-600'}`}>{syncMetrics.status}</span>
                     </div>
                  </div>
               </div>

               <div className="google-card">
                  <div className="p-6 border-b border-[#dadce0] flex items-center justify-between">
                    <h2 className="text-sm font-bold text-[#3c4043] flex items-center gap-2"><Store size={18} className="text-[#1a73e8]" /> Réseau Showrooms</h2>
                    <button onClick={openAddShowroom} className="btn-google-primary text-xs h-8">Ajouter</button>
                  </div>
                  <div className="divide-y divide-[#dadce0]">
                    {showrooms.map(s => (
                      <div key={s.id} className="px-6 py-4 flex items-center justify-between hover:bg-[#f8f9fa] group">
                        <div className="flex items-center gap-4">
                           <MapPin size={18} className="text-[#1a73e8]" />
                           <div>
                              <p className="text-xs font-bold text-[#3c4043]">{s.id}</p>
                              <p className="text-[10px] text-[#5f6368]">{s.address}</p>
                           </div>
                        </div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                           <button onClick={() => openEditShowroom(s)} className="p-1.5 text-[#5f6368]"><Edit3 size={14}/></button>
                           <button onClick={() => { if(window.confirm(`Supprimer ${s.id} ?`)) deleteShowroom(s.id); }} className="p-1.5 text-red-600"><Trash2 size={14}/></button>
                        </div>
                      </div>
                    ))}
                  </div>
               </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL CONFIGURATION INTEGRATION */}
      <Modal 
        isOpen={isIntegrationModalOpen} 
        onClose={() => !isSavingIntegration && setIsIntegrationModalOpen(false)} 
        title={`Configuration : ${editingIntegration?.name}`}
        size="md"
      >
        {editingIntegration && (
          <form onSubmit={handleIntegrationSave} className="space-y-6">
             <div className="p-4 bg-[#f8f9fa] border border-[#dadce0] rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-sm bg-white`}>
                      {editingIntegration.id === 'whatsapp' && <Smartphone size={20} className="text-green-600" />}
                      {editingIntegration.id === 'messenger' && <Facebook size={20} className="text-blue-600" />}
                      {editingIntegration.id === 'email' && <Mail size={20} className="text-red-500" />}
                   </div>
                   <div>
                      <p className="text-xs font-black text-[#3c4043] uppercase">État de la connexion</p>
                      <p className="text-[10px] text-[#5f6368] uppercase font-bold tracking-widest">{editingIntegration.enabled ? 'Actif' : 'En pause'}</p>
                   </div>
                </div>
                <div className="flex items-center gap-2">
                   <span className="text-[10px] font-black uppercase text-[#5f6368]">Activer</span>
                   <input 
                    name="enabled" 
                    type="checkbox" 
                    defaultChecked={editingIntegration.enabled} 
                    className="w-5 h-5 rounded border-[#dadce0] text-[#1a73e8] focus:ring-[#1a73e8]"
                   />
                </div>
             </div>

             <div className="space-y-5">
                <div className="space-y-1.5">
                   <label className="text-[10px] font-black uppercase text-[#5f6368] tracking-widest ml-1">Clé API / Access Token</label>
                   <div className="relative">
                      <Lock className="absolute left-3 top-2.5 text-[#dadce0]" size={16} />
                      <input 
                        name="apiKey" 
                        type="password" 
                        defaultValue={editingIntegration.apiKey} 
                        placeholder="••••••••••••••••••••••••"
                        className="pl-10 h-11 bg-white font-mono text-sm" 
                      />
                   </div>
                </div>
                
                <div className="space-y-1.5">
                   <label className="text-[10px] font-black uppercase text-[#5f6368] tracking-widest ml-1">URL Webhook (Entrant)</label>
                   <div className="relative">
                      <Link className="absolute left-3 top-2.5 text-[#dadce0]" size={16} />
                      <input 
                        name="webhookUrl" 
                        type="url" 
                        defaultValue={editingIntegration.webhookUrl} 
                        placeholder="https://horizon-api.royalplaza.ga/webhooks/..."
                        className="pl-10 h-11 bg-white text-sm" 
                      />
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-[#5f6368] tracking-widest ml-1">ID Application</label>
                      <input 
                        name="appId" 
                        type="text" 
                        defaultValue={editingIntegration.settings?.appId} 
                        placeholder="ex: app_29384"
                        className="h-11 bg-white font-bold" 
                      />
                   </div>
                   <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-[#5f6368] tracking-widest ml-1">Région Cloud</label>
                      <select 
                        name="region" 
                        defaultValue={editingIntegration.settings?.region || 'ga-lbv-1'}
                        className="h-11 bg-white"
                      >
                         <option value="ga-lbv-1">Gabon (Libreville)</option>
                         <option value="eu-west-1">Europe (Paris)</option>
                         <option value="us-east-1">USA (Virginia)</option>
                      </select>
                   </div>
                </div>
             </div>

             <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-3">
                <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={18} />
                <p className="text-[10px] text-amber-700 font-medium leading-relaxed uppercase">
                   Toute modification de ces paramètres entraîne une déconnexion temporaire du flux omnicanal le temps de la validation du Handshake.
                </p>
             </div>

             <div className="flex gap-3 pt-6 border-t border-[#dadce0]">
                <button 
                  type="submit" 
                  disabled={isSavingIntegration}
                  className="btn-google-primary flex-1 justify-center py-4 text-xs font-black uppercase tracking-widest shadow-xl shadow-blue-600/20"
                >
                   {isSavingIntegration ? <Loader2 className="animate-spin" size={18} /> : <><Save size={18} /> Appliquer les réglages</>}
                </button>
                <button 
                  type="button" 
                  onClick={() => setIsIntegrationModalOpen(false)}
                  className="btn-google-outlined px-8 text-[10px] font-black uppercase tracking-widest"
                >
                   Abandonner
                </button>
             </div>
          </form>
        )}
      </Modal>
      
      <Modal isOpen={isShowroomModalOpen} onClose={() => setIsShowroomModalOpen(false)} title="Showroom Plaza">
        <form onSubmit={handleShowroomSave} className="space-y-6">
           <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1"><label className="text-xs font-bold text-[#5f6368]">ID Site</label><input name="id" type="text" defaultValue={editingShowroom?.id || ''} required readOnly={!!editingShowroom} className="bg-white" /></div>
              <div className="space-y-1"><label className="text-xs font-bold text-[#5f6368]">Mobile</label><input name="phone" type="text" defaultValue={editingShowroom?.phone || ''} required className="bg-white" /></div>
              <div className="col-span-2 space-y-1"><label className="text-xs font-bold text-[#5f6368]">Adresse</label><input name="address" type="text" defaultValue={editingShowroom?.address || ''} required className="bg-white" /></div>
              <div className="space-y-1"><label className="text-xs font-bold text-[#5f6368]">Horaires</label><input name="hours" type="text" defaultValue={editingShowroom?.hours || '08:30 - 18:30'} className="bg-white" /></div>
              <div className="flex items-center gap-2 pt-6"><input name="isOpen" type="checkbox" defaultChecked={editingShowroom?.isOpen ?? true} className="w-4 h-4" /><span className="text-xs font-bold">Actif</span></div>
           </div>
           <div className="flex gap-3 pt-6 border-t"><button type="submit" className="btn-google-primary flex-1 justify-center">Enregistrer</button><button type="button" onClick={() => setIsShowroomModalOpen(false)} className="btn-google-outlined flex-1">Annuler</button></div>
        </form>
      </Modal>

      <Modal isOpen={isUserModalOpen} onClose={() => !isSavingUser && setIsUserModalOpen(false)} title="Compte Collaborateur Horizon" size="lg">
        <form onSubmit={handleUserSave} className="space-y-6">
           <div className="grid grid-cols-2 gap-x-8 gap-y-5">
              <div className="space-y-1"><label className="text-[10px] font-black uppercase text-[#5f6368] tracking-widest">Nom complet</label><input name="name" type="text" defaultValue={editingUser?.name || ''} required className="bg-white h-11" /></div>
              <div className="space-y-1"><label className="text-[10px] font-black uppercase text-[#5f6368] tracking-widest">Email Professionnel</label><input name="email" type="email" defaultValue={editingUser?.email || ''} required className="bg-white h-11" /></div>
              
              <div className="space-y-1">
                 <label className="text-[10px] font-black uppercase text-[#5f6368] tracking-widest">Rôle Système</label>
                 <select 
                   value={selectedRole} 
                   onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                   className="bg-white h-11 border-[#dadce0] font-bold"
                 >
                    <option value="AGENT">AGENT SAV</option>
                    <option value="MANAGER">MANAGER / DIRECTION</option>
                    <option value="TECHNICIAN">EXPERT TECHNIQUE</option>
                    <option value="ADMIN">ADMINISTRATEUR IT</option>
                 </select>
              </div>

              <div className="space-y-1"><label className="text-[10px] font-black uppercase text-[#5f6368] tracking-widest">Affectation Site</label><select name="showroom" defaultValue={editingUser?.showroom || 'Glass'} className="bg-white h-11">{showrooms.map(s => <option key={s.id} value={s.id}>{s.id}</option>)}<option value="">Corporate</option></select></div>

              {selectedRole === 'TECHNICIAN' && (
                <div className="col-span-2 p-6 bg-[#fffcf5] border border-[#ffe082] rounded-2xl space-y-6 animate-in slide-in-from-top-2">
                   <div className="flex items-center gap-3 text-[#f57c00]">
                      <Wrench size={20} />
                      <h4 className="text-xs font-black uppercase tracking-[0.2em]">Spécificités Expert Technique</h4>
                   </div>
                   
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1.5">
                         <label className="text-[10px] font-black uppercase text-[#5f6368] tracking-widest">Mobile Direct Terrain</label>
                         <div className="relative">
                            <Phone className="absolute left-3 top-2.5 text-[#f57c00]" size={18} />
                            <input 
                              type="tel" 
                              value={techPhone}
                              onChange={(e) => setTechPhone(e.target.value)}
                              placeholder="+241 ..."
                              className="pl-10 h-11 bg-white font-bold border-[#ffe082] focus:border-[#f57c00]"
                            />
                         </div>
                      </div>
                      
                      <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase text-[#5f6368] tracking-widest">Domaines d'expertise</label>
                         <div className="grid grid-cols-2 gap-2">
                            {CATEGORIES.map(cat => (
                               <button 
                                key={cat} 
                                type="button"
                                onClick={() => toggleSpecialty(cat)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-[10px] font-bold transition-all ${
                                   selectedSpecialties.includes(cat) 
                                   ? 'bg-[#f57c00] text-white border-[#f57c00] shadow-sm' 
                                   : 'bg-white text-gray-500 border-gray-200 hover:border-[#f57c00]'
                                }`}
                               >
                                  {selectedSpecialties.includes(cat) ? <CheckSquare size={12}/> : <Square size={12}/>}
                                  {cat}
                               </button>
                            ))}
                         </div>
                      </div>
                   </div>
                </div>
              )}

              <div className="col-span-2 p-5 bg-[#f8f9fa] border rounded-xl space-y-4">
                 <div className="flex justify-between items-center"><span className="text-[10px] font-black uppercase text-[#5f6368] tracking-widest">Sécurité des accès</span><button type="button" onClick={() => setGeneratedPassword(generateRandomPassword())} className="text-[9px] font-bold text-[#1a73e8] uppercase hover:underline">Générer clé sécurisée</button></div>
                 <div className="relative"><input type={showPassword ? 'text' : 'password'} value={generatedPassword} onChange={e => setGeneratedPassword(e.target.value)} className="w-full h-11 font-mono text-center tracking-widest bg-white border-[#dadce0]" required /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-2.5 text-gray-400">{showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div>
              </div>
           </div>

           <div className="flex gap-3 pt-6 border-t border-[#dadce0]">
              <button type="submit" disabled={isSavingUser} className="btn-google-primary flex-1 justify-center py-4 text-xs font-black uppercase tracking-widest shadow-xl shadow-blue-600/20">
                {isSavingUser ? <Loader2 className="animate-spin" size={18}/> : editingUser ? 'Mettre à jour le compte' : 'Créer le compte synchronisé'}
              </button>
              <button type="button" onClick={() => setIsUserModalOpen(false)} className="btn-google-outlined px-8 uppercase text-[10px] font-black tracking-widest">Annuler</button>
           </div>
        </form>
      </Modal>

      <Modal isOpen={isDeleteUserModalOpen} onClose={() => setIsDeleteUserModalOpen(false)} title="Sécurité Accès Horizon" size="sm">
         <div className="space-y-6">
            <div className="flex items-start gap-4 p-4 bg-red-50 border border-red-100 rounded-xl">
               <ShieldAlert className="text-red-600 shrink-0 mt-1" size={24} />
               <div>
                  <p className="text-sm font-black text-red-700 uppercase">Révocation Définitive</p>
                  <p className="text-xs text-red-600 mt-1 leading-relaxed">
                     La suppression du compte de <span className="font-bold underline">{userToDelete?.name}</span> révoquera ses accès cloud et supprimera sa fiche expert si elle existe.
                  </p>
               </div>
            </div>
            <div className="flex gap-3">
               <button onClick={handleConfirmDeleteUser} className="btn-google-primary flex-1 bg-red-600 hover:bg-red-700 border-none justify-center py-3 text-xs font-black uppercase tracking-widest shadow-lg shadow-red-600/20">Supprimer</button>
               <button onClick={() => setIsDeleteUserModalOpen(false)} className="btn-google-outlined flex-1 text-xs font-black uppercase tracking-widest">Annuler</button>
            </div>
         </div>
      </Modal>
    </div>
  );
};

export default Settings;
