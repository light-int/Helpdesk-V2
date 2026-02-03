
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Settings2, RefreshCw, Plus, Trash2, ShieldCheck, 
  Terminal, Network, Cpu, BrainCircuit, Store, 
  ChevronRight, Edit3, UserPlus, DatabaseZap, LayoutGrid,
  ShieldAlert, Radio, Bot, Smartphone, Mail, Facebook, Power,
  CloudLightning, HardDrive, Key, Fingerprint, Lock, Eye, EyeOff,
  Zap, Sparkles, User, BadgeCheck, Globe, Clock, History, Activity,
  ExternalLink, CheckCircle2, AlertCircle, MessageSquare
} from 'lucide-react';
import { useData, useNotifications, useUser } from '../App';
import { UserRole, ShowroomConfig, UserProfile, IntegrationConfig } from '../types';
import Modal from '../components/Modal';
import { ApiService } from '../services/apiService';

const Settings: React.FC = () => {
  const { 
    users, showrooms, refreshAll, isSyncing, config, 
    updateConfig, saveShowroom, deleteShowroom, syncMetrics, 
    saveUser, deleteUser, brands, addBrand, deleteBrand, isLoading
  } = useData();
  const { currentUser } = useUser();
  const { addNotification } = useNotifications();
  
  const [activeTab, setActiveTab] = useState<'governance' | 'integrations' | 'ai' | 'infrastructure' | 'security'>('governance');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  
  const [integrations, setIntegrations] = useState<IntegrationConfig[]>([]);
  const [loadingIntegrations, setLoadingIntegrations] = useState(false);

  const tabs = [
    { id: 'governance', label: 'Gouvernance', icon: <Terminal size={18} />, desc: 'Kernel & Référentiels' },
    { id: 'integrations', label: 'Gateway', icon: <Network size={18} />, desc: 'Connecteurs API' },
    { id: 'ai', label: 'Intelligence', icon: <BrainCircuit size={18} />, desc: 'Modèles Gemini' },
    { id: 'infrastructure', label: 'Vitalité', icon: <DatabaseZap size={18} />, desc: 'Santé Cluster' },
    { id: 'security', label: 'Identités', icon: <ShieldCheck size={18} />, desc: 'Accès IAM' },
  ];

  useEffect(() => {
    if (activeTab === 'integrations') {
      fetchIntegrations();
    }
  }, [activeTab]);

  const fetchIntegrations = async () => {
    setLoadingIntegrations(true);
    try {
      const data = await ApiService.integrations.getConfigs();
      setIntegrations(data);
    } catch (e) {
      addNotification({ title: 'Erreur', message: 'Impossible de charger les connecteurs.', type: 'error' });
    } finally {
      setLoadingIntegrations(false);
    }
  };

  const handleToggleIntegration = async (int: IntegrationConfig) => {
    try {
      const updated = { ...int, enabled: !int.enabled };
      await ApiService.integrations.saveConfig(updated);
      setIntegrations(prev => prev.map(item => item.id === int.id ? updated : item));
      addNotification({ 
        title: int.name, 
        message: updated.enabled ? 'Connecteur activé.' : 'Connecteur suspendu.', 
        type: updated.enabled ? 'success' : 'info' 
      });
    } catch (e) {
      addNotification({ title: 'Erreur', message: 'Échec de la modification.', type: 'error' });
    }
  };

  const handleSaveUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const userData: UserProfile = {
      id: editingUser?.id || `U-${Date.now()}`,
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      password: (formData.get('password') as string) || editingUser?.password || 'plaza123',
      role: formData.get('role') as UserRole,
      showroom: formData.get('showroom') as string,
      status: 'Actif',
      avatar: editingUser?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.get('name') as string)}&background=3ecf8e&color=ffffff`
    };

    try {
      await saveUser(userData);
      addNotification({ title: 'IAM', message: 'Utilisateur synchronisé.', type: 'success' });
      setIsModalOpen(false);
    } catch (err) {
      addNotification({ title: 'Erreur', message: 'Échec de la synchronisation.', type: 'error' });
    }
  };

  const handleToggleConfig = async (key: keyof typeof config) => {
    try {
      await updateConfig({ [key]: !config[key] });
      addNotification({ title: 'Système', message: 'Configuration mise à jour.', type: 'info' });
    } catch (err) {
      addNotification({ title: 'Erreur', message: 'Impossible de modifier le Kernel.', type: 'error' });
    }
  };

  if (isLoading) return <div className="h-[80vh] flex items-center justify-center"><RefreshCw className="animate-spin text-[#3ecf8e]" size={32} /></div>;

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-sb-entry pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1c1c1c] tracking-tight">Pilotage Système</h1>
          <p className="text-xs text-[#686868] mt-1 font-medium">Gouvernance stratégique et administration de l'écosystème Royal Plaza.</p>
        </div>
        <button onClick={refreshAll} className="btn-sb-outline h-10 px-3">
          <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
        </button>
      </header>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* SETTINGS RAIL */}
        <div className="w-full lg:w-72 flex flex-col gap-1 shrink-0 bg-white border border-[#ededed] p-2 rounded-xl shadow-sm">
          {tabs.map(tab => (
            <button 
              key={tab.id} 
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-4 px-4 py-3 rounded-lg transition-all text-left group relative ${
                activeTab === tab.id 
                  ? 'bg-[#f8f9fa] text-[#1c1c1c]' 
                  : 'text-[#686868] hover:bg-[#fafafa] hover:text-[#1c1c1c]'
              }`}
            >
              {activeTab === tab.id && <div className="absolute left-0 top-2 bottom-2 w-1 bg-[#3ecf8e] rounded-r-full" />}
              <span className={`${activeTab === tab.id ? 'text-[#3ecf8e]' : 'text-[#686868] group-hover:text-[#1c1c1c]'}`}>{tab.icon}</span>
              <div className="flex-1 min-w-0">
                 <p className="text-[13px] font-bold truncate">{tab.label}</p>
                 <p className="text-[10px] text-[#9ca3af] font-medium truncate">{tab.desc}</p>
              </div>
            </button>
          ))}
        </div>

        {/* SETTINGS CONTENT */}
        <div className="flex-1 w-full space-y-6">
           {activeTab === 'governance' && (
             <div className="space-y-6 animate-sb-entry">
                <div className="sb-card border-[#ededed]">
                   <div className="flex items-center gap-4 mb-8">
                      <div className="w-12 h-12 bg-[#f0fdf4] rounded-xl flex items-center justify-center text-[#3ecf8e] shadow-sm"><LayoutGrid size={24}/></div>
                      <div>
                         <h2 className="text-base font-black text-[#1c1c1c] uppercase tracking-tight">Souveraineté Cloud</h2>
                         <p className="text-[11px] text-[#686868] font-bold">Kernel Horizon v2.8 • LBV-Cluster-01</p>
                      </div>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-[#686868] uppercase tracking-widest">Nom de l'Instance</label>
                        <input type="text" className="w-full h-11 font-bold" defaultValue="Royal Plaza HQ" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-[#686868] uppercase tracking-widest">Région de Service</label>
                        <div className="h-11 bg-[#f8f9fa] border border-[#ededed] rounded-lg px-4 flex items-center text-xs font-black text-[#1c1c1c]">GABON (AF-WEST-1)</div>
                      </div>
                   </div>
                </div>

                <div className="sb-card border-red-100 bg-[#fff1f2]/30 flex items-center justify-between">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-red-500 shadow-sm border border-red-50"><ShieldAlert size={24}/></div>
                      <div>
                         <h2 className="text-sm font-black text-[#1c1c1c] uppercase tracking-widest">Maintenance Root</h2>
                         <p className="text-[11px] text-red-500 font-bold">Verrouillage global des écritures Cloud</p>
                      </div>
                   </div>
                   <button 
                    onClick={() => handleToggleConfig('maintenanceMode')} 
                    className={`w-12 h-6 rounded-full relative transition-all duration-300 ${config.maintenanceMode ? 'bg-red-500' : 'bg-[#e5e7eb]'}`}
                   >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${config.maintenanceMode ? 'right-1' : 'left-1'}`} />
                   </button>
                </div>

                <div className="sb-card border-[#ededed]">
                   <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xs font-black text-[#1c1c1c] uppercase tracking-widest">Référentiel Marques</h2>
                      <button onClick={() => {
                        const name = prompt('Nom de la nouvelle marque :');
                        if (name) addBrand(name);
                      }} className="btn-sb-outline h-8 px-3 text-[10px] uppercase font-black tracking-widest">
                        <Plus size={12}/> Ajouter
                      </button>
                   </div>
                   <div className="flex flex-wrap gap-2">
                      {brands.map(b => (
                        <div key={b} className="group px-4 py-2 bg-[#f8f9fa] border border-[#ededed] rounded-lg flex items-center gap-3 transition-all hover:border-[#3ecf8e]">
                           <span className="text-xs font-bold text-[#1c1c1c]">{b}</span>
                           <button onClick={() => deleteBrand(b)} className="text-[#9ca3af] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                              <Trash2 size={12}/>
                           </button>
                        </div>
                      ))}
                   </div>
                </div>
             </div>
           )}

           {activeTab === 'integrations' && (
             <div className="space-y-6 animate-sb-entry">
                <div className="sb-card border-[#ededed] bg-white">
                   <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-4">
                         <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 shadow-sm border border-blue-100"><Network size={24}/></div>
                         <div>
                            <h2 className="text-base font-black text-[#1c1c1c] uppercase tracking-tight">Connecteurs Gateway</h2>
                            <p className="text-[11px] text-[#686868] font-bold">Passerelles omnicanales vers les clients</p>
                         </div>
                      </div>
                      <button onClick={fetchIntegrations} className="p-2 hover:bg-[#f8f9fa] rounded-lg text-[#686868]">
                         <RefreshCw size={16} className={loadingIntegrations ? 'animate-spin' : ''} />
                      </button>
                   </div>

                   <div className="grid grid-cols-1 gap-4">
                      {integrations.length > 0 ? integrations.map((int) => (
                        <div key={int.id} className={`sb-card border-[#ededed] hover:border-[#d1d1d1] transition-all p-6 ${!int.enabled ? 'opacity-70 bg-[#fafafa]' : ''}`}>
                           <div className="flex flex-col md:flex-row md:items-center gap-6">
                              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm border ${
                                int.id === 'whatsapp' ? 'bg-[#f0fdf4] text-green-600 border-green-100' : 
                                int.id === 'messenger' ? 'bg-blue-50 text-blue-600 border-blue-100' : 
                                'bg-amber-50 text-amber-600 border-amber-100'
                              }`}>
                                 {int.id === 'whatsapp' && <Smartphone size={28}/>}
                                 {int.id === 'messenger' && <Facebook size={28}/>}
                                 {int.id === 'email' && <Mail size={28}/>}
                              </div>
                              <div className="flex-1">
                                 <div className="flex items-center gap-3">
                                    <h3 className="text-[15px] font-black text-[#1c1c1c]">{int.name}</h3>
                                    {int.enabled ? (
                                      <span className="flex items-center gap-1 text-[9px] font-black uppercase text-[#3ecf8e] bg-[#f0fdf4] px-2 py-0.5 rounded border border-[#dcfce7]">
                                         <CheckCircle2 size={10}/> Connecté
                                      </span>
                                    ) : (
                                      <span className="flex items-center gap-1 text-[9px] font-black uppercase text-[#686868] bg-[#f5f5f5] px-2 py-0.5 rounded border border-[#ededed]">
                                         <Activity size={10}/> Inactif
                                      </span>
                                    )}
                                 </div>
                                 <p className="text-[11px] text-[#686868] mt-1 font-medium">Synchronisation automatique des tickets via {int.name}.</p>
                              </div>
                              <div className="flex items-center gap-3">
                                 <button className="btn-sb-outline h-9 px-4 text-[10px] font-black uppercase tracking-widest">Configurer</button>
                                 <button 
                                  onClick={() => handleToggleIntegration(int)}
                                  className={`w-12 h-6 rounded-full relative transition-all duration-300 ${int.enabled ? 'bg-[#3ecf8e]' : 'bg-[#e5e7eb]'}`}
                                 >
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${int.enabled ? 'right-1' : 'left-1'}`} />
                                 </button>
                              </div>
                           </div>
                           
                           {int.enabled && (
                             <div className="mt-6 pt-6 border-t border-[#f5f5f5] grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                   <label className="text-[9px] font-black text-[#686868] uppercase">Endpoint Webhook</label>
                                   <div className="h-9 bg-[#f8f9fa] border border-[#ededed] rounded-lg px-3 flex items-center justify-between group">
                                      <span className="text-[10px] font-mono text-[#1c1c1c] truncate">{int.webhookUrl || 'https://api.royalplaza.ga/hooks/' + int.id}</span>
                                      <ExternalLink size={12} className="text-[#9ca3af] group-hover:text-[#3ecf8e] cursor-pointer" />
                                   </div>
                                </div>
                                <div className="space-y-1.5">
                                   <label className="text-[9px] font-black text-[#686868] uppercase">Dernière activité</label>
                                   <p className="text-[11px] font-bold text-[#1c1c1c] h-9 flex items-center">{int.lastSync ? new Date(int.lastSync).toLocaleString() : 'En attente de ping...'}</p>
                                </div>
                             </div>
                           )}
                        </div>
                      )) : (
                        <div className="p-20 text-center border-2 border-dashed border-[#ededed] rounded-2xl opacity-50">
                           <Network size={40} className="mx-auto mb-4" />
                           <p className="text-[12px] font-black text-[#1c1c1c] uppercase tracking-widest">Initialisation des connecteurs...</p>
                        </div>
                      )}
                   </div>
                </div>

                <div className="sb-card bg-[#1c1c1c] text-white p-8">
                   <div className="flex items-center gap-6">
                      <div className="w-16 h-16 bg-[#3ecf8e]/20 text-[#3ecf8e] rounded-2xl flex items-center justify-center border border-[#3ecf8e]/30 shadow-lg shadow-[#3ecf8e]/10">
                         <MessageSquare size={32}/>
                      </div>
                      <div className="flex-1">
                         <h3 className="text-lg font-bold tracking-tight">Nouveau canal ?</h3>
                         <p className="text-[13px] text-[#9ca3af] mt-1">Vous souhaitez intégrer un flux CRM personnalisé (ex: Telegram, Instagram) ?</p>
                      </div>
                      <button className="bg-[#3ecf8e] text-[#1c1c1c] font-black uppercase text-[10px] tracking-widest h-10 px-6 rounded-lg hover:bg-[#34b27b] transition-colors">
                        Documentation API
                      </button>
                   </div>
                </div>
             </div>
           )}

           {activeTab === 'ai' && (
             <div className="space-y-6 animate-sb-entry">
                <div className="sb-card border-[#ededed] p-10">
                   <div className="flex items-center justify-between mb-10">
                      <div className="flex items-center gap-5">
                         <div className="w-14 h-14 bg-[#f5f3ff] rounded-2xl flex items-center justify-center text-purple-600 shadow-sm border border-purple-50"><BrainCircuit size={32}/></div>
                         <div>
                            <h2 className="text-lg font-black text-[#1c1c1c] uppercase tracking-tight leading-none">Intelligence Gemini</h2>
                            <p className="text-[11px] text-[#686868] font-bold mt-2 uppercase tracking-widest">Protocoles d'inférence stratégique</p>
                         </div>
                      </div>
                      <button 
                        onClick={() => handleToggleConfig('aiEnabled')}
                        className={`w-12 h-6 rounded-full relative transition-all duration-300 ${config.aiEnabled ? 'bg-purple-600' : 'bg-[#e5e7eb]'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${config.aiEnabled ? 'right-1' : 'left-1'}`} />
                      </button>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {[
                        { id: 'flash', label: 'Horizon Flash', desc: 'Inférence instantanée (Latence < 50ms)', icon: <Zap className="text-green-500"/>, color: 'border-green-100 bg-green-50/20' },
                        { id: 'pro', label: 'Horizon Pro', desc: 'Raisonnement expert & Audit stratégique', icon: <Sparkles className="text-purple-600"/>, color: 'border-purple-100 bg-purple-50/20' }
                      ].map(m => (
                        <button 
                          key={m.id} 
                          onClick={() => updateConfig({ aiModel: m.id as any })} 
                          className={`p-6 border-2 text-left flex gap-5 rounded-2xl transition-all ${config.aiModel === m.id ? 'border-[#3ecf8e] bg-[#f0fdf4]' : 'border-[#ededed] hover:border-[#3ecf8e]/30'}`}
                        >
                           <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm bg-white border border-[#ededed]`}>{m.icon}</div>
                           <div>
                              <p className="text-sm font-black text-[#1c1c1c]">{m.label}</p>
                              <p className="text-[10px] text-[#686868] font-bold mt-1 uppercase tracking-tight">{m.desc}</p>
                           </div>
                        </button>
                      ))}
                   </div>

                   <div className="mt-10 space-y-4">
                      <h3 className="text-[10px] font-black text-[#686868] uppercase tracking-[0.2em] border-b border-[#f5f5f5] pb-2">Fonctionnalités Cognitives</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                        {[
                          { key: 'aiAutoCategorization', label: 'Auto-catégorisation SAV' },
                          { key: 'aiStrategicAudit', label: 'Génération d\'audits mensuels' },
                          { key: 'aiChatbotEnabled', label: 'Assistance conversationnelle' },
                          { key: 'autoTranslate', label: 'Traduction multi-lingue' }
                        ].map((feat) => (
                          <div key={feat.key} className="flex items-center justify-between p-4 bg-[#fcfcfc] border border-[#ededed] rounded-xl hover:border-[#3ecf8e] transition-colors">
                             <span className="text-xs font-bold text-[#1c1c1c]">{feat.label}</span>
                             <button 
                              onClick={() => handleToggleConfig(feat.key as any)}
                              className={`w-10 h-5 rounded-full relative transition-all duration-300 ${config[feat.key as keyof typeof config] ? 'bg-[#3ecf8e]' : 'bg-[#e5e7eb]'}`}
                             >
                                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${config[feat.key as keyof typeof config] ? 'right-0.5' : 'left-0.5'}`} />
                             </button>
                          </div>
                        ))}
                      </div>
                   </div>
                </div>
             </div>
           )}

           {activeTab === 'infrastructure' && (
              <div className="sb-card border-[#ededed] space-y-10 animate-sb-entry">
                 <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-[#eff6ff] rounded-xl flex items-center justify-center text-blue-600 border border-blue-50"><DatabaseZap size={32}/></div>
                    <div>
                       <h2 className="text-lg font-black text-[#1c1c1c] uppercase tracking-tight">Santé Infrastructure</h2>
                       <p className="text-[11px] text-[#686868] font-bold mt-2 uppercase tracking-widest">Monitoring temps réel du cluster Plaza-LBV</p>
                    </div>
                 </div>
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                       { label: 'Latence Cloud', value: `${syncMetrics.latency || 42}ms`, icon: <Activity size={14}/>, color: 'text-blue-600', bg: 'bg-blue-50' },
                       { label: 'Uptime Global', value: '99.98%', icon: <Power size={14}/>, color: 'text-[#3ecf8e]', bg: 'bg-[#f0fdf4]' },
                       { label: 'Stockage DB', value: '124MB', icon: <HardDrive size={14}/>, color: 'text-purple-600', bg: 'bg-[#f5f3ff]' },
                       { label: 'Sync Status', value: 'LIVE', icon: <RefreshCw size={14}/>, color: 'text-amber-600', bg: 'bg-[#fffbeb]' }
                    ].map((s, i) => (
                       <div key={i} className="p-5 border border-[#ededed] rounded-xl bg-[#fcfcfc] shadow-sm flex flex-col gap-3">
                          <div className={`w-8 h-8 rounded-lg ${s.bg} ${s.color} flex items-center justify-center`}>{s.icon}</div>
                          <div>
                            <p className="text-[9px] font-black text-[#686868] uppercase tracking-widest">{s.label}</p>
                            <p className={`text-xl font-black mt-1 ${s.color}`}>{s.value}</p>
                          </div>
                       </div>
                    ))}
                 </div>
                 
                 <div className="p-6 bg-[#f8f9fa] border border-[#ededed] rounded-xl space-y-4">
                    <h3 className="text-[10px] font-black text-[#1c1c1c] uppercase tracking-[0.2em] flex items-center gap-2"><History size={14}/> Journal des Synchro</h3>
                    <div className="space-y-3">
                       {[1, 2, 3].map(i => (
                         <div key={i} className="flex items-center justify-between text-[11px] py-2 border-b border-[#ededed] last:border-none">
                            <div className="flex items-center gap-3">
                               <div className="w-1.5 h-1.5 rounded-full bg-[#3ecf8e]" />
                               <span className="font-bold text-[#1c1c1c]">Update Table::Tickets</span>
                            </div>
                            <span className="text-[#9ca3af]">Aujourd'hui, 12:4{i}</span>
                         </div>
                       ))}
                    </div>
                 </div>
              </div>
           )}

           {activeTab === 'security' && (
             <div className="space-y-6 animate-sb-entry">
                <div className="sb-card border-[#ededed]">
                   <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-4">
                         <div className="w-12 h-12 bg-[#f0fdf4] rounded-xl flex items-center justify-center text-[#3ecf8e] shadow-sm"><ShieldCheck size={24}/></div>
                         <div>
                            <h2 className="text-base font-black text-[#1c1c1c] uppercase tracking-tight">Accès & Identités (IAM)</h2>
                            <p className="text-[11px] text-[#686868] font-bold uppercase tracking-widest">Gestion des comptes collaborateurs</p>
                         </div>
                      </div>
                      <button 
                        onClick={() => { setEditingUser(null); setIsModalOpen(true); }}
                        className="btn-sb-primary h-10 px-4"
                      >
                        <UserPlus size={16}/> <span>Créer Accès</span>
                      </button>
                   </div>

                   <div className="sb-table-container">
                      <table className="w-full text-left sb-table">
                         <thead>
                            <tr>
                               <th>Collaborateur</th>
                               <th>Rôle</th>
                               <th>Affectation</th>
                               <th className="text-right">Action</th>
                            </tr>
                         </thead>
                         <tbody>
                            {users.map(user => (
                              <tr key={user.id}>
                                 <td>
                                    <div className="flex items-center gap-3">
                                       <img src={user.avatar} className="w-8 h-8 rounded-lg border border-[#ededed]" alt="" />
                                       <div>
                                          <p className="text-[13px] font-bold text-[#1c1c1c]">{user.name}</p>
                                          <p className="text-[11px] text-[#686868]">{user.email}</p>
                                       </div>
                                    </div>
                                 </td>
                                 <td>
                                    <span className={`px-2 py-0.5 rounded border text-[9px] font-black uppercase tracking-widest ${user.role === 'ADMIN' ? 'bg-[#fff1f2] text-red-500 border-red-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                                       {user.role}
                                    </span>
                                 </td>
                                 <td>
                                    <p className="text-[11px] font-bold text-[#1c1c1c]">{user.showroom || 'Libreville HQ'}</p>
                                 </td>
                                 <td className="text-right">
                                    <div className="flex justify-end gap-1">
                                       <button 
                                        onClick={() => { setEditingUser(user); setIsModalOpen(true); }}
                                        className="p-1.5 text-[#686868] hover:text-[#3ecf8e] transition-colors"
                                       >
                                          <Edit3 size={14}/>
                                       </button>
                                       <button 
                                        onClick={() => { if(window.confirm('Révoquer cet accès ?')) deleteUser(user.id); }}
                                        className="p-1.5 text-[#686868] hover:text-red-500 transition-colors"
                                       >
                                          <Trash2 size={14}/>
                                       </button>
                                    </div>
                                 </td>
                              </tr>
                            ))}
                         </tbody>
                      </table>
                   </div>
                </div>

                <div className="sb-card border-[#ededed] p-8">
                   <h3 className="text-xs font-black text-[#1c1c1c] uppercase tracking-widest flex items-center gap-3 mb-6">
                      <Lock size={16} className="text-[#3ecf8e]"/> Sécurité Globale
                   </h3>
                   <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-[#f8f9fa] border border-[#ededed] rounded-xl">
                         <div>
                            <p className="text-xs font-bold text-[#1c1c1c]">Authentification Multi-Facteurs (MFA)</p>
                            <p className="text-[10px] text-[#686868] font-medium mt-1">Exiger un code de validation pour chaque connexion Expert.</p>
                         </div>
                         <button 
                          onClick={() => handleToggleConfig('mfaRequired')}
                          className={`w-10 h-5 rounded-full relative transition-all duration-300 ${config.mfaRequired ? 'bg-[#3ecf8e]' : 'bg-[#e5e7eb]'}`}
                         >
                            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${config.mfaRequired ? 'right-0.5' : 'left-0.5'}`} />
                         </button>
                      </div>
                   </div>
                </div>
             </div>
           )}
        </div>
      </div>

      {/* IAM MODAL */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingUser ? "Édition Accès Collaborateur" : "Création Nouvel Accès Expert"}
      >
         <form onSubmit={handleSaveUser} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-[#686868] uppercase">Nom Complet</label>
                  <input name="name" type="text" defaultValue={editingUser?.name} placeholder="ex: Kevin Nguema" required className="w-full" />
               </div>
               <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-[#686868] uppercase">Email Royal Plaza</label>
                  <input name="email" type="email" defaultValue={editingUser?.email} placeholder="email@royalplaza.ga" required className="w-full" />
               </div>
               <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-[#686868] uppercase">Rôle Système</label>
                  <select name="role" defaultValue={editingUser?.role || 'AGENT'} className="w-full">
                     <option value="AGENT">Agent SAV (Inbox + Tickets)</option>
                     <option value="TECHNICIAN">Technicien (Maintenance + Planning)</option>
                     <option value="MANAGER">Manager (Audit + RH)</option>
                     <option value="ADMIN">Administrateur (Full Root)</option>
                  </select>
               </div>
               <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-[#686868] uppercase">Showroom d'affectation</label>
                  <select name="showroom" defaultValue={editingUser?.showroom || 'Glass'} className="w-full">
                     <option value="Glass">Plaza Glass</option>
                     <option value="Oloumi">Plaza Oloumi</option>
                     <option value="Bord de mer">Plaza Bord de mer</option>
                     <option value="Online">Support Centralisé</option>
                  </select>
               </div>
               <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-[#686868] uppercase">Clé d'accès temporaire</label>
                  <input name="password" type="password" placeholder="Laissez vide pour garder l'actuel" className="w-full" />
               </div>
            </div>
            <div className="flex justify-end gap-3 pt-6 border-t border-[#ededed]">
               <button type="button" onClick={() => setIsModalOpen(false)} className="btn-sb-outline h-11 px-6">Annuler</button>
               <button type="submit" className="btn-sb-primary h-11 px-10 shadow-md">
                  Valider l'Accès
               </button>
            </div>
         </form>
      </Modal>
    </div>
  );
};

export default Settings;
