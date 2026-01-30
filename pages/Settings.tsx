
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Settings2, Database, RefreshCw, Plus, Trash2, 
  Lock, UserCog, Search, CheckCircle2, 
  Smartphone, History, Activity, Monitor, 
  Globe, BrainCircuit, Sparkles, Zap, MapPin, 
  Store, ChevronRight, Edit3, Wifi, 
  ShieldCheck, Eye, EyeOff, UserPlus, UserMinus, 
  ShieldAlert, Loader2, Fingerprint, LogIn, 
  Facebook, Mail, FileCode, Layers, Gauge, Radio, 
  Microscope, DatabaseZap, Signal, Box, HeartPulse, 
  GlobeLock, Terminal, Network, Cpu, Rocket, BarChart3,
  PlusCircle, Bot, Share2, MessageSquare, CloudLightning
} from 'lucide-react';
import { useData, useNotifications, useUser } from '../App';
import { UserRole, ShowroomConfig, UserProfile, IntegrationConfig } from '../types';
import { ApiService } from '../services/apiService';
import { isAiOperational } from '../services/geminiService';
import Modal from '../components/Modal';

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
    users, showrooms, refreshAll, isSyncing, config, 
    updateConfig, saveShowroom, deleteShowroom, syncMetrics, 
    saveUser, deleteUser, tickets, customers, parts 
  } = useData();
  const { currentUser } = useUser();
  const { addNotification } = useNotifications();
  
  const [activeTab, setActiveTab] = useState<'governance' | 'security' | 'ai' | 'integrations' | 'infrastructure' | 'showrooms'>('governance');
  const [userSearch, setUserSearch] = useState('');
  const [connectionLogs, setConnectionLogs] = useState<any[]>([]);
  
  // States for Modals
  const [isShowroomModalOpen, setIsShowroomModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isDeleteUserModalOpen, setIsDeleteUserModalOpen] = useState(false);
  const [isIntegrationModalOpen, setIsIntegrationModalOpen] = useState(false);
  const [isAddIntegrationModalOpen, setIsAddIntegrationModalOpen] = useState(false);
  
  // Editing States
  const [editingShowroom, setEditingShowroom] = useState<ShowroomConfig | null>(null);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [integrationConfigs, setIntegrationConfigs] = useState<IntegrationConfig[]>([]);
  const [editingIntegration, setEditingIntegration] = useState<IntegrationConfig | null>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>('AGENT');

  const aiReady = isAiOperational();

  // Changed BarChart4 to BarChart3 as BarChart4 does not exist in lucide-react
  const tabs = useMemo(() => [
    { id: 'governance', label: 'Gouvernance Root', icon: <Terminal size={18} />, desc: 'Souveraineté Cloud' },
    { id: 'integrations', label: 'Fluent Gateway', icon: <Network size={18} />, desc: 'API, Social & AI' },
    { id: 'ai', label: 'Gemini Intelligence', icon: <BrainCircuit size={18} />, desc: 'Inférence & Modèles' },
    { id: 'infrastructure', label: 'Cloud & Vitalité', icon: <DatabaseZap size={18} />, desc: 'Santé Supabase' },
    { id: 'showrooms', label: 'Réseau Physique', icon: <Store size={18} />, desc: 'Showrooms GAB-LBV' },
    { id: 'security', label: 'Identités & IAM', icon: <ShieldCheck size={18} />, desc: 'Gestion des Accès' },
  ], []);

  useEffect(() => {
    if (activeTab === 'security') fetchLogs();
    if (activeTab === 'integrations') fetchIntegrations();
  }, [activeTab]);

  const fetchLogs = async () => {
    try {
      const logs = await ApiService.users.getConnectionLogs(currentUser?.id || '');
      setConnectionLogs(logs);
    } catch (e) { console.error(e); }
  };

  const fetchIntegrations = async () => {
    try {
      const data = await ApiService.integrations.getConfigs();
      setIntegrationConfigs(data);
    } catch (e) { console.error(e); }
  };

  const filteredUsers = useMemo(() => {
    return (users || []).filter(u => 
      u.name.toLowerCase().includes(userSearch.toLowerCase()) || 
      (u.email || '').toLowerCase().includes(userSearch.toLowerCase())
    );
  }, [users, userSearch]);

  const securityStats = useMemo(() => {
    const total = users.length || 1;
    const mfa = users.filter(u => u.mfaEnabled).length;
    return { 
      mfaPercent: (mfa / total) * 100, 
      adminCount: users.filter(u => u.role === 'ADMIN').length, 
      activeSessions: users.filter(u => u.status === 'Actif').length 
    };
  }, [users]);

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
      status: (formData.get('status') as any) || 'Actif',
      avatar: editingUser?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.get('name') as string)}&background=1a73e8&color=ffffff`,
      password: generatedPassword,
      mfaEnabled: formData.get('mfaEnabled') === 'on'
    };
    try {
      await saveUser(userData);
      setIsUserModalOpen(false);
      setEditingUser(null);
      addNotification({ title: 'IAM Sync', message: `Identité ${userData.name} synchronisée.`, type: 'success' });
    } catch (err) {
      addNotification({ title: 'Erreur', message: 'Échec de la sauvegarde IAM.', type: 'error' });
    } finally { setIsSavingUser(false); }
  };

  return (
    <div className="space-y-8 animate-page-entry pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 text-[#1a73e8] mb-1">
             <Settings2 size={20} />
             <span className="text-[10px] font-black uppercase tracking-[0.3em]">Root Operations Console</span>
          </div>
          <h1 className="text-3xl font-light text-[#202124]">Pilotage Système</h1>
          <p className="text-[#5f6368] text-sm font-medium mt-1">Gouvernance stratégique et surveillance des flux Royal Plaza Horizon.</p>
        </div>
        <div className="flex gap-3">
          <div className={`flex items-center gap-3 px-4 py-2 border ${syncMetrics.status === 'CONNECTED' ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
             <div className={`w-2 h-2 rounded-full ${syncMetrics.status === 'CONNECTED' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
             <span className="text-[10px] font-black uppercase tracking-widest">{syncMetrics.status} Cloud Sync</span>
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
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
               <div className="google-card p-10 space-y-10 border-t-8 border-[#1a73e8]">
                  <div className="flex items-center justify-between">
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-50 flex items-center justify-center text-[#1a73e8] shadow-inner"><Terminal size={24}/></div>
                        <div>
                           <h2 className="text-xl font-black text-[#202124] uppercase tracking-tighter leading-none">Souveraineté & Résidence Cloud</h2>
                           <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">Conformité des données Horizon Royal Plaza</p>
                        </div>
                     </div>
                     <span className="px-3 py-1 bg-blue-50 text-blue-600 border border-blue-100 text-[9px] font-black uppercase tracking-widest">Kernel v2.8-stable</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                     <section className="space-y-6">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black uppercase text-[#5f6368] tracking-widest ml-1">Alias Instance Corporate</label>
                           <input type="text" className="w-full h-12 bg-gray-50 border-none font-black text-sm" defaultValue="Royal Plaza - Libreville HQ" />
                           <p className="text-[9px] text-gray-400 font-bold uppercase ml-1 italic">Utilisé pour l'identification des rapports financiers.</p>
                        </div>
                        <div className="p-6 bg-[#f8f9ff] border border-blue-100 space-y-4 shadow-sm">
                           <div className="flex items-center gap-3">
                              <GlobeLock size={20} className="text-[#1a73e8]"/>
                              <h4 className="text-[10px] font-black text-blue-700 uppercase tracking-widest">Conformité Territoriale</h4>
                           </div>
                           <p className="text-xs font-bold text-blue-900 leading-relaxed uppercase">Zone : GABON CENTRAL LBV-1 (CERTIFIÉ)</p>
                           <p className="text-[10px] text-blue-600 font-medium leading-relaxed">Infrastructure cloud conforme aux directives de souveraineté des données de l'ANINF.</p>
                        </div>
                     </section>
                     <section className="space-y-6">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black uppercase text-[#5f6368] tracking-widest ml-1">Fréquence du Heartbeat (Sync)</label>
                           <select value={config.syncFrequency} onChange={(e) => updateConfig({ syncFrequency: e.target.value as any })} className="w-full h-12 bg-gray-50 border-none font-black text-sm">
                              <option value="realtime">WebSocket Temps Réel (0.5s)</option>
                              <option value="hourly">Batch Horaire (Lissage)</option>
                              <option value="manual">On-Demand uniquement</option>
                           </select>
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black uppercase text-[#5f6368] tracking-widest ml-1">Conservation des Logs d'Audit</label>
                           <select className="w-full h-12 bg-gray-50 border-none font-black text-sm">
                              <option>365 Jours (Courant)</option>
                              <option>10 Ans (Juridique Plaza)</option>
                              <option>Illimité (Audit Expert)</option>
                           </select>
                        </div>
                     </section>
                  </div>
               </div>

               <div className="p-10 bg-[#fffcf5] border border-[#ffe082] flex items-center justify-between shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#f9ab00]/5 rounded-full -mr-16 -mt-16 blur-2xl" />
                  <div className="flex items-center gap-6 relative z-10">
                     <div className="w-14 h-14 bg-white border border-[#ffe082] text-[#f57c00] flex items-center justify-center shadow-lg"><ShieldAlert size={32}/></div>
                     <div>
                        <p className="text-sm font-black text-[#202124] uppercase tracking-tighter leading-none">Verrouillage de Maintenance Global</p>
                        <p className="text-[10px] text-[#5f6368] font-medium leading-relaxed mt-2 uppercase tracking-tight">Si activé, l'écriture sur le Cloud est réservée aux Administrateurs Root.</p>
                     </div>
                  </div>
                  <button onClick={() => updateConfig({ maintenanceMode: !config.maintenanceMode })} className={`w-20 h-10 rounded-full relative transition-all shadow-inner border-2 ${config.maintenanceMode ? 'bg-red-600 border-red-700' : 'bg-gray-200 border-gray-300'}`}>
                     <div className={`absolute top-1 w-6 h-6 bg-white transition-all shadow-md ${config.maintenanceMode ? 'right-1' : 'left-1'}`} />
                  </button>
               </div>
            </div>
          )}

          {/* TAB: FLUENT GATEWAY (CONNECTIONS) */}
          {activeTab === 'integrations' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
               <div className="google-card p-10 space-y-12 bg-white shadow-2xl">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-10">
                     <div className="flex items-center gap-5">
                        <div className="w-16 h-16 bg-gray-50 border border-[#dadce0] flex items-center justify-center text-[#1a73e8] shadow-inner"><Radio size={32} className="animate-pulse"/></div>
                        <div>
                           <h2 className="text-2xl font-black text-[#202124] uppercase tracking-tighter leading-none">Fluent Gateway Hub</h2>
                           <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">Passerelle omnicanale Social, Messagerie & AI</p>
                        </div>
                     </div>
                     <button onClick={() => setIsAddIntegrationModalOpen(true)} className="btn-google-primary h-12 px-8 text-[11px] font-black uppercase tracking-widest shadow-xl shadow-blue-600/20">
                        <PlusCircle size={20}/> Connecter AI/API
                     </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                     {integrationConfigs.map(integration => (
                        <div key={integration.id} className="p-10 bg-white border border-[#dadce0] hover:border-[#1a73e8] transition-all flex flex-col group shadow-lg relative">
                           <div className="flex items-center justify-between mb-10">
                              <div className={`w-16 h-16 border flex items-center justify-center shadow-md ${integration.enabled ? 'bg-blue-50 text-[#1a73e8] border-blue-100' : 'bg-gray-50 text-gray-400 border-gray-100'}`}>
                                 {integration.id === 'whatsapp' ? <Smartphone size={32}/> : integration.id === 'messenger' ? <Facebook size={32}/> : <Mail size={32}/>}
                              </div>
                              <div className="flex flex-col items-end">
                                 <span className={`text-[9px] font-black uppercase px-3 py-1 border shadow-sm ${integration.enabled ? 'bg-green-50 text-green-600 border-green-200' : 'bg-gray-50 text-gray-400 border-gray-100'}`}>{integration.enabled ? 'Streaming' : 'Pipeline Inhibé'}</span>
                                 <p className="text-[10px] text-gray-300 font-bold mt-3 uppercase tracking-tighter">Latence: {Math.floor(Math.random() * 20) + 10}ms</p>
                              </div>
                           </div>
                           <h3 className="text-base font-black text-[#202124] uppercase tracking-tight mb-2">{integration.name}</h3>
                           <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-10">Protocole: JSON/HTTPS Gateway</p>
                           
                           <div className="mt-auto space-y-4">
                              <div className="flex justify-between text-[10px] font-black text-gray-400 uppercase tracking-widest"><span>Débit (Throughput)</span><span className="text-blue-600">{integration.enabled ? '8.4 req/s' : '0.0 req/s'}</span></div>
                              <div className="h-1.5 bg-gray-50 rounded-full overflow-hidden shadow-inner"><div className={`h-full bg-blue-500 transition-all duration-1000 ${integration.enabled ? 'w-3/4 animate-pulse' : 'w-0'}`} /></div>
                              <button onClick={() => { setEditingIntegration(integration); setIsIntegrationModalOpen(true); }} className="w-full py-4 bg-[#f8f9fa] text-[10px] font-black uppercase tracking-[0.2em] border border-transparent hover:border-[#dadce0] transition-all group-hover:bg-[#1a73e8] group-hover:text-white group-hover:shadow-xl shadow-blue-600/20">Paramétrer la Connectivité</button>
                           </div>
                        </div>
                     ))}
                     
                     {/* OTHER AI CONNECTOR CARD */}
                     <div className="p-10 bg-gray-50 border border-dashed border-[#dadce0] hover:border-[#1a73e8] transition-all flex flex-col items-center justify-center text-center group shadow-sm opacity-60 hover:opacity-100">
                        <div className="w-16 h-16 bg-white border border-gray-100 flex items-center justify-center text-gray-300 group-hover:text-[#1a73e8] shadow-sm mb-6 transition-colors">
                           <Bot size={32}/>
                        </div>
                        <h3 className="text-[11px] font-black text-[#3c4043] uppercase tracking-[0.2em]">Add AI Provider</h3>
                        <p className="text-[9px] text-[#9aa0a6] font-bold uppercase mt-2">Connecter un modèle de langage tiers (OpenAI, Claude, Llama)</p>
                        <button onClick={() => setIsAddIntegrationModalOpen(true)} className="mt-8 px-6 py-3 border border-[#dadce0] text-[8px] font-black uppercase tracking-widest hover:bg-white transition-all">Provisionner AI Slot</button>
                     </div>
                  </div>
               </div>
            </div>
          )}

          {/* TAB: GEMINI INTELLIGENCE */}
          {activeTab === 'ai' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
               <div className="google-card p-10 space-y-12 border-t-8 border-purple-600 bg-white shadow-2xl">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-10">
                     <div className="flex items-center gap-6">
                        <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center text-white shadow-2xl relative overflow-hidden group">
                           <div className="absolute inset-0 bg-white/10 translate-x-full group-hover:translate-x-0 transition-transform duration-500" />
                           <BrainCircuit size={40} className="relative z-10 animate-pulse" />
                        </div>
                        <div>
                           <h2 className="text-2xl font-black text-[#202124] uppercase tracking-tighter leading-none">Moteur Gemini Intelligence</h2>
                           <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-2">Pilotage de l'inférence stratégique Royal Plaza</p>
                        </div>
                     </div>
                     <button onClick={() => updateConfig({ aiEnabled: !config.aiEnabled })} className={`w-20 h-10 rounded-full relative transition-all shadow-inner border-2 ${config.aiEnabled ? 'bg-purple-600 border-purple-700' : 'bg-gray-200 border-gray-300'}`}>
                        <div className={`absolute top-1 w-6 h-6 bg-white transition-all shadow-md ${config.aiEnabled ? 'right-1' : 'left-1'}`} />
                     </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                     <div className="p-8 bg-[#fdf8ff] border border-purple-100 space-y-4 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-2 text-purple-200 group-hover:text-purple-400 transition-colors"><Gauge size={40}/></div>
                        <p className="text-[10px] font-black text-purple-600 uppercase tracking-widest">Latence Inférence</p>
                        <div className="flex items-end gap-3"><h3 className="text-4xl font-black text-[#202124] tracking-tighter">1.1s</h3><span className="text-[9px] text-green-600 font-black uppercase mb-1">Optimal</span></div>
                        <div className="h-1.5 bg-purple-100 w-full rounded-full overflow-hidden"><div className="h-full bg-purple-600 w-4/5" /></div>
                     </div>
                     <div className="p-8 bg-[#fdf8ff] border border-purple-100 space-y-4 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-2 text-purple-200 group-hover:text-purple-400 transition-colors"><Cpu size={40}/></div>
                        <p className="text-[10px] font-black text-purple-600 uppercase tracking-widest">Budget Jetons (Mois)</p>
                        <div className="flex items-end gap-3"><h3 className="text-4xl font-black text-[#202124] tracking-tighter">14k</h3><span className="text-[9px] text-gray-400 font-bold uppercase mb-1">/ 1M Limit</span></div>
                        <div className="h-1.5 bg-purple-100 w-full rounded-full overflow-hidden"><div className="h-full bg-purple-600 w-1/6" /></div>
                     </div>
                     <div className="p-8 bg-[#fdf8ff] border border-purple-100 space-y-4 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-2 text-purple-200 group-hover:text-purple-400 transition-colors"><Layers size={40}/></div>
                        <p className="text-[10px] font-black text-purple-600 uppercase tracking-widest">Ancrage Local (Grounding)</p>
                        <div className="flex items-end gap-3"><h3 className="text-4xl font-black text-[#202124] tracking-tighter">Active</h3><span className="text-[9px] text-gray-400 font-bold uppercase mb-1">catalog.db</span></div>
                        <div className="h-1.5 bg-purple-100 w-full rounded-full overflow-hidden"><div className="h-full bg-purple-600 w-full" /></div>
                     </div>
                  </div>

                  <section className="pt-10 border-t border-gray-100">
                     <h3 className="text-[11px] font-black uppercase text-gray-400 tracking-[0.2em] mb-8 flex items-center gap-3"><Rocket size={18} className="text-purple-600"/> Optimisation du Modèle Stratégique</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {[
                           { id: 'flash', label: 'Vitesse Horizon (Flash)', desc: 'Idéal pour le triage instantané des flux WhatsApp et le chat standard.', icon: <Zap className="text-green-500"/> },
                           { id: 'pro', label: 'Analyse Expert (Pro)', desc: 'Recommandé pour les audits financiers complexes et les résumés techniques.', icon: <Sparkles className="text-purple-600"/> }
                        ].map(model => (
                           <button key={model.id} onClick={() => updateConfig({ aiModel: model.id as any })} className={`p-8 border-2 text-left flex gap-6 transition-all group ${config.aiModel === model.id ? `border-indigo-600 bg-indigo-50 shadow-xl` : 'border-gray-50 bg-white hover:border-gray-200'}`}>
                              <div className="w-16 h-16 bg-white flex items-center justify-center border border-gray-100 shadow-md group-hover:scale-110 transition-transform">{model.icon}</div>
                              <div className="flex-1 min-w-0">
                                 <p className="text-sm font-black text-[#202124] uppercase tracking-tighter">{model.label}</p>
                                 <p className="text-[10px] text-gray-500 font-bold mt-2 uppercase leading-relaxed">{model.desc}</p>
                              </div>
                              {config.aiModel === model.id && <div className="p-1 bg-indigo-600 text-white rounded-full shadow-lg"><CheckCircle2 size={16}/></div>}
                           </button>
                        ))}
                     </div>
                  </section>
               </div>
            </div>
          )}

          {/* TAB: CLOUD & VITALITÉ (INFRASTRUCTURE) */}
          {activeTab === 'infrastructure' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
               <div className="google-card p-10 border-l-8 border-[#1a73e8] bg-white shadow-2xl space-y-12">
                  <div className="flex items-center justify-between">
                     <div className="flex items-center gap-5">
                        <DatabaseZap size={32} className="text-[#1a73e8]" />
                        <div><h2 className="text-xl font-black text-[#202124] uppercase tracking-tighter leading-none">Statut Vital Instance Supabase Cloud</h2><p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">Surveillance temps réel de l'architecture Horizon</p></div>
                     </div>
                     <div className="flex items-center gap-3 px-4 py-2 bg-green-50 border border-green-100 text-green-700 shadow-sm">
                        <HeartPulse size={16} className="animate-pulse"/>
                        <span className="text-[9px] font-black uppercase tracking-widest">Health: Operational</span>
                     </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                     {[
                        { label: 'Ping Latency', value: `${syncMetrics.latency || 42}ms`, desc: 'Vers GAB-LBV-1', icon: <Wifi size={18}/>, color: 'text-blue-600' },
                        { label: 'Cloud Storage', value: '124.8MB', desc: 'Quota: 1.5GB', icon: <Box size={18}/>, color: 'text-purple-600' },
                        { label: 'CPU Pool Charge', value: '14%', desc: 'Clusters Dynamiques', icon: <Activity size={18}/>, color: 'text-amber-600' },
                        { label: 'Instance RAM', value: '1.2GB', desc: 'Dédiée Horizon', icon: <Microscope size={18}/>, color: 'text-indigo-600' }
                     ].map((stat, idx) => (
                        <div key={idx} className="p-8 bg-gray-50 border border-gray-100 space-y-3 shadow-inner group hover:bg-white hover:border-gray-200 transition-all">
                           <div className={`flex items-center gap-2 ${stat.color}`}>{stat.icon} <span className="text-[9px] font-black uppercase tracking-widest">{stat.label}</span></div>
                           <p className="text-3xl font-black text-[#202124] tracking-tighter group-hover:scale-105 transition-transform origin-left">{stat.value}</p>
                           <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">{stat.desc}</p>
                        </div>
                     ))}
                  </div>

                  <section className="space-y-8 pt-10 border-t border-gray-100">
                     <div className="flex items-center justify-between border-b border-gray-50 pb-4">
                        <h3 className="text-[11px] font-black uppercase text-gray-400 tracking-[0.2em]">Répartition des Enregistrements Cloud</h3>
                        <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest">Total: {(tickets.length + customers.length + parts.length).toLocaleString()} Objets</span>
                     </div>
                     <div className="space-y-6">
                        {[
                           { name: 'Registre Tickets SAV', rows: tickets.length, color: 'bg-blue-500', max: 5000 },
                           { name: 'Portefeuille CRM Clients', rows: customers.length, color: 'bg-green-500', max: 2000 },
                           { name: 'Inventaire Pièces Détachées', rows: parts.length, color: 'bg-amber-500', max: 1000 },
                        ].map((table, i) => (
                           <div key={i} className="flex items-center gap-10">
                              <span className="w-48 text-[11px] font-black text-[#3c4043] uppercase tracking-tighter shrink-0">{table.name}</span>
                              <div className="flex-1 h-3 bg-gray-50 rounded-full overflow-hidden shadow-inner"><div className={`h-full ${table.color} transition-all duration-1000`} style={{ width: `${Math.min(100, (table.rows / table.max) * 100)}%` }} /></div>
                              <span className="w-24 text-right text-[11px] font-black text-[#202124] uppercase">{table.rows} <span className="text-gray-300">/ {table.max}</span></span>
                           </div>
                        ))}
                     </div>
                  </section>
               </div>
            </div>
          )}

          {/* TAB: SHOWROOMS (PHYSIQUE) */}
          {activeTab === 'showrooms' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
               <div className="google-card p-10 bg-white shadow-2xl space-y-12">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-10">
                     <div className="flex items-center gap-5">
                        <div className="w-16 h-16 bg-blue-50 border border-blue-100 flex items-center justify-center text-[#1a73e8] shadow-inner"><MapPin size={32}/></div>
                        <div><h2 className="text-2xl font-black text-[#202124] uppercase tracking-tighter leading-none">Réseau d'Exploitation Physique</h2><p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">Gestion technique des showrooms Royal Plaza Gabon</p></div>
                     </div>
                     <button onClick={() => { setEditingShowroom(null); setIsShowroomModalOpen(true); }} className="btn-google-primary h-12 px-8 text-[11px] font-black uppercase tracking-widest shadow-xl shadow-blue-600/20"><Plus size={20} /> Nouveau Site</button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                     {showrooms.map(s => (
                        <div key={s.id} className="p-10 bg-white border border-[#dadce0] group hover:border-[#1a73e8] transition-all relative flex flex-col shadow-lg overflow-hidden">
                           <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 z-10">
                              <button onClick={() => { setEditingShowroom(s); setIsShowroomModalOpen(true); }} className="p-2.5 bg-white border border-[#dadce0] text-blue-600 hover:bg-blue-50 shadow-sm"><Edit3 size={18}/></button>
                              <button onClick={() => { if(window.confirm(`Supprimer définitivement ${s.id} ?`)) deleteShowroom(s.id); }} className="p-2.5 bg-white border border-[#dadce0] text-red-600 hover:bg-red-50 shadow-sm"><Trash2 size={18}/></button>
                           </div>
                           <div className="flex items-start gap-8 mb-10">
                              <div className="w-20 h-20 bg-gray-50 border border-gray-100 flex items-center justify-center text-[#1a73e8] shadow-inner shrink-0 group-hover:scale-105 transition-transform"><Store size={40}/></div>
                              <div className="space-y-2">
                                 <h3 className="text-2xl font-black text-[#202124] uppercase leading-tight tracking-tighter">{s.id}</h3>
                                 <p className="text-[11px] text-gray-400 font-bold uppercase flex items-center gap-2"><MapPin size={12} className="text-[#1a73e8]"/> {s.address}</p>
                                 <div className="flex items-center gap-3 mt-4">
                                    <div className={`px-3 py-1 border text-[9px] font-black uppercase tracking-widest shadow-sm ${s.isOpen ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>{s.isOpen ? 'Opérationnel' : 'Maintenance'}</div>
                                 </div>
                              </div>
                           </div>
                           <div className="grid grid-cols-3 gap-4 pt-10 border-t border-gray-50 mt-auto">
                              <div className="text-center p-4 bg-gray-50 border border-gray-100 group-hover:bg-white transition-colors"><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">IoT Stat.</p><p className="text-sm font-black text-green-600 flex items-center justify-center gap-1"><Signal size={14}/> LIVE</p></div>
                              <div className="text-center p-4 bg-gray-50 border border-gray-100 group-hover:bg-white transition-colors"><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Density</p><p className="text-sm font-black text-[#202124]">84%</p></div>
                              <div className="text-center p-4 bg-gray-50 border border-gray-100 group-hover:bg-white transition-colors"><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Experts</p><p className="text-sm font-black text-blue-600">8</p></div>
                           </div>
                        </div>
                     ))}
                  </div>
               </div>
            </div>
          )}

          {/* TAB: IAM (SECURITY) */}
          {activeTab === 'security' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="stats-card border-none bg-white p-8 shadow-xl">
                     <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-blue-50 text-[#1a73e8] border border-blue-100 shadow-sm"><ShieldCheck size={24}/></div>
                        <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">IAM Health</span>
                     </div>
                     <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Taux Adoption MFA</p>
                     <div className="flex items-end gap-3 mt-1">
                        <h3 className="text-3xl font-black text-[#202124] tracking-tighter">{securityStats.mfaPercent.toFixed(0)}%</h3>
                        <div className="flex-1 h-2 bg-gray-100 mb-2 relative overflow-hidden"><div className="h-full bg-blue-600 transition-all duration-1000" style={{ width: `${securityStats.mfaPercent}%` }} /></div>
                     </div>
                  </div>
                  <div className="stats-card border-none bg-white p-8 shadow-xl">
                     <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-red-50 text-red-600 border border-red-100 shadow-sm"><Lock size={24}/></div>
                        <span className="text-[9px] font-black text-red-600 uppercase tracking-widest">Root Access</span>
                     </div>
                     <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Comptes ADMIN</p>
                     <h3 className="text-3xl font-black text-[#202124] tracking-tighter mt-1">{securityStats.adminCount}</h3>
                  </div>
                  <div className="stats-card border-none bg-white p-8 shadow-xl">
                     <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-green-50 text-green-600 border border-green-100 shadow-sm"><Activity size={24}/></div>
                        <span className="text-[9px] font-black text-green-600 uppercase tracking-widest">Active Sessions</span>
                     </div>
                     <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Authentifiés</p>
                     <h3 className="text-3xl font-black text-[#202124] tracking-tighter mt-1">{securityStats.activeSessions}</h3>
                  </div>
               </div>

               <div className="google-card p-10 bg-white shadow-2xl">
                  <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6">
                     <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-gray-50 border border-[#dadce0] flex items-center justify-center text-[#5f6368] shadow-inner"><UserCog size={32}/></div>
                        <div><h2 className="text-lg font-black text-[#202124] uppercase tracking-tighter leading-none">Gestionnaire d'Identités (IAM)</h2><p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">Contrôle granulaire des accès Horizon</p></div>
                     </div>
                     <div className="flex items-center gap-3">
                        <div className="relative"><Search className="absolute left-4 top-3 text-gray-400" size={16} /><input type="text" placeholder="Rechercher..." value={userSearch} onChange={e => setUserSearch(e.target.value)} className="pl-12 h-11 w-64 text-xs bg-gray-50 border-none font-bold" /></div>
                        <button onClick={() => { setEditingUser(null); setGeneratedPassword(generateRandomPassword()); setIsUserModalOpen(true); }} className="btn-google-primary h-11 text-[10px] font-black px-6 shadow-xl shadow-blue-600/20 transition-transform active:scale-95"><UserPlus size={18} /> Nouveau</button>
                     </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     {filteredUsers.map(user => (
                        <div key={user.id} className={`p-6 border-2 transition-all flex flex-col group ${user.status === 'Inactif' ? 'bg-gray-50 border-gray-100 grayscale opacity-60' : 'bg-white border-gray-50 hover:border-[#1a73e8] shadow-sm hover:shadow-xl'}`}>
                           <div className="flex items-start justify-between mb-6">
                              <div className="flex items-center gap-4">
                                 <div className="relative">
                                    <img src={user.avatar} className="w-16 h-16 border-2 border-white shadow-lg p-0.5 bg-white" alt="" />
                                    {user.mfaEnabled && <div className="absolute -bottom-1 -right-1 bg-green-500 text-white p-1 shadow-md border-2 border-white"><Fingerprint size={12} /></div>}
                                 </div>
                                 <div>
                                    <h3 className="text-sm font-black text-[#202124] uppercase tracking-tight">{user.name}</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                       <span className={`px-2 py-0.5 border text-[8px] font-black uppercase tracking-widest ${user.role === 'ADMIN' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>{user.role}</span>
                                       <span className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter">• {user.showroom || 'Corporate'}</span>
                                    </div>
                                 </div>
                              </div>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                 <button onClick={() => { setEditingUser(user); setGeneratedPassword(user.password || ''); setIsUserModalOpen(true); }} className="p-2 text-blue-600 hover:bg-blue-50" title="Modifier"><Edit3 size={16}/></button>
                                 <button onClick={() => { setUserToDelete(user); setIsDeleteUserModalOpen(true); }} disabled={user.id === currentUser?.id} className="p-2 text-red-600 hover:bg-red-50 disabled:opacity-0" title="Révoquer"><UserMinus size={16}/></button>
                              </div>
                           </div>
                           <div className="mt-auto pt-4 border-t border-gray-50 flex items-center justify-between">
                              <div className={`flex items-center gap-1.5 px-2 py-0.5 border text-[8px] font-black uppercase tracking-widest ${user.mfaEnabled ? 'bg-green-50 text-green-700 border-green-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                                 {user.mfaEnabled ? <ShieldCheck size={10}/> : <ShieldAlert size={10}/>} {user.mfaEnabled ? 'MFA ACTIVE' : 'NO MFA'}
                              </div>
                              <span className="text-[8px] font-black text-gray-300 uppercase tracking-tighter">Last Login: {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Jamais'}</span>
                           </div>
                        </div>
                     ))}
                  </div>
               </div>

               <div className="google-card p-10 bg-[#202124] border-none shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl -mr-32 -mt-32" />
                  <div className="flex items-center justify-between mb-8 relative z-10">
                     <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-500/10 text-blue-400 border border-blue-500/20"><History size={20}/></div>
                        <div><h2 className="text-[11px] font-black text-white uppercase tracking-[0.2em]">Journal de Surveillance Authentifiée</h2><p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-1">Audit des dernières sessions cloud Horizon</p></div>
                     </div>
                     <button onClick={fetchLogs} className="text-[9px] font-black text-blue-400 uppercase tracking-widest hover:underline flex items-center gap-2"><RefreshCw size={12}/> Actualiser</button>
                  </div>
                  <div className="space-y-1 relative z-10">
                     {connectionLogs.length > 0 ? connectionLogs.slice(0, 5).map((log, i) => (
                        <div key={i} className="flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 transition-colors border-b border-white/5 group">
                           <div className="flex items-center gap-6">
                              <div className="w-10 h-10 border border-white/10 flex items-center justify-center text-blue-400/50 group-hover:text-blue-400 transition-colors"><LogIn size={18}/></div>
                              <div>
                                 <p className="text-[10px] font-black text-white uppercase tracking-tighter">Session Expert Établie</p>
                                 <div className="flex items-center gap-3 mt-1 text-[9px] font-bold text-gray-500 uppercase">
                                    <span className="flex items-center gap-1.5"><Monitor size={10}/> {log.metadata?.platform || 'Horizon Engine'}</span>
                                    <span className="flex items-center gap-1.5"><Globe size={10}/> {log.metadata?.userAgent?.split(' ')[0] || 'App Client'}</span>
                                 </div>
                              </div>
                           </div>
                           <div className="text-right">
                              <p className="text-[11px] font-black text-white">{new Date(log.timestamp).toLocaleTimeString()}</p>
                              <p className="text-[9px] font-bold text-blue-400 uppercase tracking-tighter">{new Date(log.timestamp).toLocaleDateString()}</p>
                           </div>
                        </div>
                     )) : (
                        <div className="py-20 text-center border-2 border-dashed border-white/10"><p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Aucune trame de session identifiée</p></div>
                     )}
                  </div>
               </div>
            </div>
          )}

        </div>
      </div>

      {/* MODAL CONFIGURATION FLUENT GATEWAY */}
      <Modal isOpen={isIntegrationModalOpen} onClose={() => setIsIntegrationModalOpen(false)} title={`Console Fluent Gateway : ${editingIntegration?.name}`} size="md">
        {editingIntegration && (
          <form onSubmit={async (e) => {
             e.preventDefault();
             const formData = new FormData(e.currentTarget);
             const updated = { ...editingIntegration, enabled: formData.get('enabled') === 'on', apiKey: formData.get('apiKey') as string, webhookUrl: formData.get('webhookUrl') as string };
             await ApiService.integrations.saveConfig(updated);
             setIsIntegrationModalOpen(false);
             fetchIntegrations();
             addNotification({ title: 'Gateway Sync', message: 'Paramètres réseau synchronisés.', type: 'success' });
          }} className="space-y-12 animate-in slide-in-from-bottom-4">
             <div className="p-10 bg-blue-50 border border-blue-100 flex items-center justify-between shadow-inner">
                <div className="flex items-center gap-6">
                   <div className="w-16 h-16 bg-white border border-blue-200 flex items-center justify-center text-[#1a73e8] shadow-2xl"><Globe size={32} className="animate-spin [animation-duration:8s]"/></div>
                   <div><p className="text-sm font-black text-[#202124] uppercase tracking-tighter">Statut de la Transmission</p><p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest mt-2">{editingIntegration.enabled ? 'Streaming actif vers GAB-LBV' : 'Pipeline Inhibé'}</p></div>
                </div>
                <input type="checkbox" name="enabled" defaultChecked={editingIntegration.enabled} className="w-8 h-8 rounded text-[#1a73e8] border-2 border-blue-200 shadow-md" />
             </div>
             <div className="space-y-8">
                <div className="space-y-2"><label className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] ml-1">Clé Privée de Sécurité (Bearer Token)</label><input name="apiKey" type="password" defaultValue={editingIntegration.apiKey} className="h-14 bg-gray-50 border-none font-mono text-base shadow-inner tracking-[0.2em]" placeholder="••••••••••••••••" /></div>
                <div className="space-y-2"><label className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] ml-1">Endpoint Destination Webhook (Target URL)</label><input name="webhookUrl" type="url" defaultValue={editingIntegration.webhookUrl} className="h-14 bg-gray-50 border-none font-bold text-sm shadow-inner" placeholder="https://api.gateway.ga/v1/..." /></div>
             </div>
             <div className="flex gap-4 pt-10 border-t border-gray-100"><button type="submit" className="flex-1 btn-google-primary justify-center py-6 text-xs font-black uppercase tracking-[0.3em] shadow-2xl shadow-blue-600/30 transition-transform active:scale-95"><RefreshCw size={24}/> Certifier le Connecteur</button></div>
          </form>
        )}
      </Modal>

      {/* MODAL ADD INTEGRATION / AI */}
      <Modal isOpen={isAddIntegrationModalOpen} onClose={() => setIsAddIntegrationModalOpen(false)} title="Provisionnement Fluent Gateway" size="md">
         <div className="space-y-10">
            <div className="p-8 bg-[#f8f9ff] border border-blue-100 space-y-4 shadow-inner">
               <div className="flex items-center gap-3"><CloudLightning size={24} className="text-[#1a73e8]"/><h4 className="text-[11px] font-black text-blue-700 uppercase tracking-widest">Connecteur Cloud Externe</h4></div>
               <p className="text-xs font-bold text-blue-900 leading-relaxed uppercase">Provisionner un slot pour un service de messagerie ou un moteur d'IA tiers.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {[
                  { id: 'whatsapp_new', label: 'WhatsApp Business API', icon: <Smartphone/>, color: 'text-green-600' },
                  { id: 'fb_new', label: 'Meta Messenger Gateway', icon: <Facebook/>, color: 'text-blue-600' },
                  { id: 'mail_new', label: 'Enterprise SMTP/IMAP', icon: <Mail/>, color: 'text-red-500' },
                  { id: 'ai_new', label: 'LLM Agent (Other AI)', icon: <Bot/>, color: 'text-purple-600' },
               ].map(item => (
                  <button key={item.id} className="p-8 bg-white border border-[#dadce0] hover:border-[#1a73e8] transition-all flex items-center gap-5 group shadow-sm">
                     <div className={`p-4 bg-gray-50 ${item.color} border border-transparent shadow-inner group-hover:bg-white transition-colors`}>{item.icon}</div>
                     <span className="text-[10px] font-black text-[#202124] uppercase tracking-widest">{item.label}</span>
                  </button>
               ))}
            </div>
            <div className="pt-8 border-t border-gray-100 flex justify-end">
               <button onClick={() => setIsAddIntegrationModalOpen(false)} className="btn-google-outlined px-12 font-black uppercase text-[10px] tracking-widest">Annuler</button>
            </div>
         </div>
      </Modal>

      {/* MODAL USER IAM */}
      <Modal isOpen={isUserModalOpen} onClose={() => !isSavingUser && setIsUserModalOpen(false)} title="Console IAM : Profil Système" size="lg">
        <form onSubmit={handleUserSave} className="space-y-10 animate-in slide-in-from-top-4">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
              <div className="space-y-2"><label className="text-[10px] font-black uppercase text-[#5f6368] tracking-widest ml-1">Identité Expert</label><input name="name" type="text" defaultValue={editingUser?.name || ''} required className="h-12 bg-gray-50 border-none font-black text-sm uppercase" /></div>
              <div className="space-y-2"><label className="text-[10px] font-black uppercase text-[#5f6368] tracking-widest ml-1">Canal Email Corporatif</label><input name="email" type="email" defaultValue={editingUser?.email || ''} required className="h-12 bg-gray-50 border-none font-bold text-sm" /></div>
              <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase text-[#5f6368] tracking-widest ml-1">Rôle & Privilèges Système</label>
                 <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value as UserRole)} className="h-12 bg-gray-50 border-none font-black text-[11px] uppercase tracking-widest px-4 w-full">
                    <option value="AGENT">AGENT SAV (Standard Ops)</option><option value="MANAGER">MANAGER (Exploitation)</option><option value="TECHNICIAN">TECHNICIEN (Expert Terrain)</option><option value="ADMIN">ADMINISTRATEUR (Full Root)</option>
                 </select>
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase text-[#5f6368] tracking-widest ml-1">Site Physique d'Affectation</label>
                 <select name="showroom" defaultValue={editingUser?.showroom || 'Glass'} className="h-12 bg-gray-50 border-none font-black text-[11px] uppercase tracking-widest px-4 w-full">
                    {showrooms.map(s => <option key={s.id} value={s.id}>{s.id}</option>)}
                    <option value="">Corporate / Mobile</option>
                 </select>
              </div>
              <div className="col-span-2 space-y-6 pt-10 border-t border-gray-100">
                 <div className="flex items-center justify-between">
                    <label className="text-[11px] font-black uppercase text-[#202124] tracking-[0.2em]">Sécurité des Accès</label>
                    <button type="button" onClick={() => setGeneratedPassword(generateRandomPassword())} className="text-[10px] font-black text-[#1a73e8] uppercase hover:underline tracking-widest">Régénérer Clé</button>
                 </div>
                 <div className="relative">
                    <input type={showPassword ? 'text' : 'password'} value={generatedPassword} onChange={e => setGeneratedPassword(e.target.value)} className="w-full h-16 bg-gray-50 border-none font-mono text-center text-2xl tracking-[0.4em] font-black" required />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-6 top-4 text-gray-400 p-1 hover:text-[#1a73e8]">{showPassword ? <EyeOff size={24}/> : <Eye size={24}/>}</button>
                 </div>
                 <div className="flex items-center gap-4 p-6 bg-blue-50 border border-blue-100 shadow-inner">
                    <input type="checkbox" name="mfaEnabled" defaultChecked={editingUser?.mfaEnabled} className="w-7 h-7 rounded text-[#1a73e8] border-2 border-blue-200" />
                    <div><p className="text-xs font-black text-[#202124] uppercase tracking-tight leading-none">Forcer l'Authentification Multi-Facteurs (MFA)</p><p className="text-[10px] text-blue-600 font-bold uppercase tracking-tighter mt-2 leading-relaxed">Niveau de protection certifié Horizon v2. Recommandé pour tout accès distant.</p></div>
                 </div>
              </div>
           </div>
           <div className="flex gap-4 pt-10 border-t border-gray-100"><button type="submit" disabled={isSavingUser} className="flex-1 btn-google-primary justify-center py-6 text-xs font-black uppercase tracking-[0.3em] shadow-2xl shadow-blue-600/30">{isSavingUser ? <Loader2 className="animate-spin" size={24}/> : <><ShieldCheck size={24}/> Enregistrer l'Identité</>}</button></div>
        </form>
      </Modal>

      {/* MODAL SHOWROOM (SITE OPS) */}
      <Modal isOpen={isShowroomModalOpen} onClose={() => setIsShowroomModalOpen(false)} title="Exploitation : Fiche Site Physique" size="md">
        <form onSubmit={async (e) => {
           e.preventDefault();
           const formData = new FormData(e.currentTarget);
           await saveShowroom({ id: formData.get('id') as string, address: formData.get('address') as string, phone: formData.get('phone') as string, hours: formData.get('hours') as string, isOpen: formData.get('isOpen') === 'on' });
           setIsShowroomModalOpen(false);
           addNotification({ title: 'Exploitation Site', message: 'Paramètres showroom synchronisés.', type: 'success' });
        }} className="space-y-12">
           <div className="grid grid-cols-2 gap-8">
              <div className="space-y-2"><label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">ID Unique Horizon Site</label><input name="id" type="text" defaultValue={editingShowroom?.id} required className="h-12 bg-gray-50 border-none font-black text-sm uppercase" /></div>
              <div className="space-y-2"><label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Ligne Directe Manager</label><input name="phone" type="tel" defaultValue={editingShowroom?.phone} required className="h-12 bg-gray-50 border-none font-black font-mono text-sm" /></div>
              <div className="col-span-2 space-y-2"><label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Adresse Géo-Référencée</label><input name="address" type="text" defaultValue={editingShowroom?.address} required className="h-12 bg-gray-50 border-none font-bold text-sm uppercase" /></div>
              <div className="space-y-2"><label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Amplitude d'Exploitation</label><input name="hours" type="text" defaultValue={editingShowroom?.hours} className="h-12 bg-gray-50 border-none font-bold text-sm" placeholder="08:30 - 18:30" /></div>
              <div className="flex items-center gap-4 pt-10"><input name="isOpen" type="checkbox" defaultChecked={editingShowroom?.isOpen ?? true} className="w-7 h-7 rounded text-[#1a73e8] border-2 border-gray-200 shadow-md" /><span className="text-[11px] font-black uppercase text-[#202124] tracking-widest">Site Ouvert aux Clients</span></div>
           </div>
           <div className="flex gap-4 pt-10 border-t border-gray-100"><button type="submit" className="flex-1 btn-google-primary justify-center py-6 text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-blue-600/30">Valider l'Implantation</button></div>
        </form>
      </Modal>

      {/* MODAL DELETE IAM */}
      <Modal isOpen={isDeleteUserModalOpen} onClose={() => setIsDeleteUserModalOpen(false)} title="Alerte Sécurité IAM" size="sm">
         <div className="space-y-10 text-center p-6">
            <div className="w-24 h-24 bg-red-50 text-red-600 flex items-center justify-center mx-auto shadow-2xl shadow-red-200 relative overflow-hidden group"><ShieldAlert size={48} className="relative z-10 group-hover:scale-110 transition-transform duration-500" /><div className="absolute inset-0 bg-red-100 translate-y-full group-hover:translate-y-0 transition-transform" /></div>
            <div>
               <h3 className="text-xl font-black text-[#202124] uppercase tracking-tighter leading-none">Révoquer l'Identité ?</h3>
               <p className="text-[10px] text-gray-500 font-bold uppercase leading-relaxed mt-4 tracking-tight px-4">
                  La suppression de <span className="text-red-600 underline decoration-2 underline-offset-4">{userToDelete?.name}</span> invalidera tous ses jetons de session sur le réseau Horizon.
               </p>
            </div>
            <div className="flex gap-3 pt-6">
               <button onClick={async () => { if(userToDelete) await deleteUser(userToDelete.id); setIsDeleteUserModalOpen(false); }} className="flex-1 py-5 bg-red-600 text-white text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-red-600/30 transition-transform active:scale-95">Révoquer l'Accès</button>
               <button onClick={() => setIsDeleteUserModalOpen(false)} className="flex-1 py-5 bg-gray-100 text-gray-500 text-[11px] font-black uppercase tracking-widest border border-gray-200">Annuler</button>
            </div>
         </div>
      </Modal>

    </div>
  );
};

export default Settings;
