
import React, { useState, useMemo, useEffect } from 'react';
import { 
  RefreshCw, Plus, Trash2, ShieldCheck, 
  Terminal, Network, BrainCircuit, Edit3, UserPlus, DatabaseZap, LayoutGrid,
  ShieldAlert, Smartphone, Mail, Facebook, Power,
  HardDrive, Lock, Eye, EyeOff,
  Zap, Sparkles, Activity,
  ExternalLink, CheckCircle2, MessageSquare
} from 'lucide-react';
import { useData, useNotifications } from '../App';
import { UserRole, UserProfile, IntegrationConfig } from '../types';
import Modal from '../components/Modal';
import { ApiService } from '../services/apiService';

const Settings: React.FC = () => {
  const { 
    users, refreshAll, isSyncing, config, 
    updateConfig, syncMetrics, 
    saveUser, deleteUser, brands, addBrand, deleteBrand, isLoading
  } = useData();
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
  ] as const;

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
      setIntegrations(prev => prev.map((item: IntegrationConfig) => item.id === int.id ? updated : item));
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
          <h1 className="text-2xl font-bold text-[#1c1c1c] tracking-tight">Paramètres Cloud</h1>
          <p className="text-xs text-[#686868] mt-1 font-medium">Administration de l'écosystème technique Royal Plaza.</p>
        </div>
        <button onClick={refreshAll} className="btn-sb-outline h-10 px-3">
          <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
        </button>
      </header>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* SIDE RAIL */}
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

        {/* MAIN PANEL */}
        <div className="flex-1 w-full space-y-6">
           {activeTab === 'governance' && (
             <div className="space-y-6 animate-sb-entry">
                <div className="sb-card border-[#ededed]">
                   <div className="flex items-center gap-4 mb-8">
                      <div className="w-12 h-12 bg-[#f0fdf4] rounded-xl flex items-center justify-center text-[#3ecf8e] shadow-sm"><LayoutGrid size={24}/></div>
                      <div>
                         <h2 className="text-base font-black text-[#1c1c1c] uppercase tracking-tight">Kernel Horizon</h2>
                         <p className="text-[11px] text-[#686868] font-bold">Instance v2.8.4 • Cloud GABON-WEST-1</p>
                      </div>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-[#686868] uppercase tracking-widest">Instance Label</label>
                        <input type="text" className="w-full h-11 font-bold" defaultValue="Royal Plaza Headquarters" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-[#686868] uppercase tracking-widest">Zone de Routage</label>
                        <div className="h-11 bg-[#f8f9fa] border border-[#ededed] rounded-lg px-4 flex items-center text-xs font-black text-[#1c1c1c]">LBV_CLUSTER_CENTRAL</div>
                      </div>
                   </div>
                </div>

                <div className="sb-card border-red-100 bg-[#fff1f2]/20 flex items-center justify-between p-6">
                   <div className="flex items-center gap-4">
                      <div className="w-11 h-11 bg-white rounded-lg flex items-center justify-center text-red-500 shadow-sm border border-red-50"><ShieldAlert size={22}/></div>
                      <div>
                         <h2 className="text-sm font-bold text-[#1c1c1c]">Mode Maintenance</h2>
                         <p className="text-[11px] text-red-500 font-bold uppercase tracking-tighter">Verrouillage total des accès API</p>
                      </div>
                   </div>
                   <button 
                    onClick={() => handleToggleConfig('maintenanceMode')} 
                    className={`w-11 h-6 rounded-full relative transition-all duration-300 ${config.maintenanceMode ? 'bg-red-500' : 'bg-[#e5e7eb]'}`}
                   >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${config.maintenanceMode ? 'right-1' : 'left-1'}`} />
                   </button>
                </div>

                <div className="sb-card border-[#ededed]">
                   <div className="flex items-center justify-between mb-6 border-b border-[#f5f5f5] pb-4">
                      <h2 className="text-[11px] font-black text-[#1c1c1c] uppercase tracking-[0.1em]">Référentiel Marques Certifiées</h2>
                      <button onClick={() => {
                        const name = prompt('Nom de la marque :');
                        if (name) addBrand(name);
                      }} className="btn-sb-outline h-8 px-3 text-[10px] font-black uppercase">
                        <Plus size={12}/> Ajouter
                      </button>
                   </div>
                   <div className="flex flex-wrap gap-2">
                      {brands.map((b: string) => (
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
                <div className="sb-card border-[#ededed] bg-white p-8">
                   <div className="flex items-center justify-between mb-10">
                      <div className="flex items-center gap-5">
                         <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 shadow-sm border border-blue-100"><Network size={32}/></div>
                         <div>
                            <h2 className="text-lg font-black text-[#1c1c1c] uppercase tracking-tight">Gateway Omnicanale</h2>
                            <p className="text-[11px] text-[#686868] font-bold uppercase tracking-widest mt-1">Pilotage des flux d'interactions clients</p>
                         </div>
                      </div>
                      <button onClick={fetchIntegrations} className="p-2.5 hover:bg-[#f8f9fa] rounded-xl text-[#686868] border border-[#ededed] transition-all">
                         <RefreshCw size={18} className={loadingIntegrations ? 'animate-spin' : ''} />
                      </button>
                   </div>

                   <div className="grid grid-cols-1 gap-6">
                      {integrations.length > 0 ? integrations.map((int: IntegrationConfig) => (
                        <div key={int.id} className={`p-6 border border-[#ededed] rounded-2xl transition-all hover:shadow-md bg-white flex flex-col ${!int.enabled ? 'opacity-60 grayscale-[0.5]' : ''}`}>
                           <div className="flex flex-col md:flex-row md:items-center gap-6">
                              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm border-2 ${
                                int.id === 'whatsapp' ? 'bg-[#f0fdf4] text-green-600 border-green-50' : 
                                int.id === 'messenger' ? 'bg-blue-50 text-blue-600 border-blue-100' : 
                                'bg-amber-50 text-amber-600 border-amber-50'
                              }`}>
                                 {int.id === 'whatsapp' && <Smartphone size={32}/>}
                                 {int.id === 'messenger' && <Facebook size={32}/>}
                                 {int.id === 'email' && <Mail size={32}/>}
                              </div>
                              <div className="flex-1">
                                 <div className="flex items-center gap-3">
                                    <h3 className="text-lg font-black text-[#1c1c1c]">{int.name}</h3>
                                    {int.enabled ? (
                                      <span className="flex items-center gap-1.5 text-[10px] font-black uppercase text-[#3ecf8e] bg-[#f0fdf4] px-2.5 py-1 rounded-full border border-[#dcfce7]">
                                         <div className="w-1.5 h-1.5 rounded-full bg-[#3ecf8e] animate-pulse" /> Live
                                      </span>
                                    ) : (
                                      <span className="flex items-center gap-1.5 text-[10px] font-black uppercase text-[#686868] bg-[#f5f5f5] px-2.5 py-1 rounded-full border border-[#ededed]">
                                         Off
                                      </span>
                                    )}
                                 </div>
                                 <p className="text-[12px] text-[#686868] mt-1.5 font-medium leading-relaxed">
                                   Connecteur pour le flux {int.id === 'whatsapp' ? 'des messageries directes mobiles' : int.id === 'messenger' ? 'des interactions sociales Facebook' : 'du support mail centralisé'}.
                                 </p>
                              </div>
                              <div className="flex items-center gap-4">
                                 <button className="btn-sb-outline h-10 px-5 text-[11px] font-black uppercase tracking-widest border-[#ededed]">Paramètres</button>
                                 <button 
                                  onClick={() => handleToggleIntegration(int)}
                                  className={`w-12 h-6 rounded-full relative transition-all duration-300 ${int.enabled ? 'bg-[#3ecf8e]' : 'bg-[#e5e7eb]'}`}
                                 >
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${int.enabled ? 'right-1' : 'left-1'}`} />
                                 </button>
                              </div>
                           </div>
                           
                           {int.enabled && (
                             <div className="mt-8 pt-6 border-t border-[#f5f5f5] grid grid-cols-1 md:grid-cols-3 gap-6 animate-sb-entry">
                                <div className="space-y-1.5">
                                   <label className="text-[10px] font-black text-[#686868] uppercase tracking-widest">Route API</label>
                                   <div className="h-10 bg-[#f8f9fa] border border-[#ededed] rounded-lg px-3 flex items-center justify-between group cursor-pointer hover:border-[#3ecf8e] transition-colors">
                                      <span className="text-[10px] font-mono text-[#1c1c1c] truncate font-bold">{int.webhookUrl || `https://rp-gateway.ga/${int.id}`}</span>
                                      <ExternalLink size={14} className="text-[#9ca3af] group-hover:text-[#3ecf8e]" />
                                   </div>
                                </div>
                                <div className="space-y-1.5">
                                   <label className="text-[10px] font-black text-[#686868] uppercase tracking-widest">Activité</label>
                                   <p className="text-[11px] font-bold text-[#1c1c1c] h-10 flex items-center gap-2">
                                     <Activity size={12} className="text-[#3ecf8e]"/>
                                     {int.lastSync ? new Date(int.lastSync).toLocaleString() : 'Jamais synchronisé'}
                                   </p>
                                </div>
                                <div className="space-y-1.5">
                                   <label className="text-[10px] font-black text-[#686868] uppercase tracking-widest">Intégrité</label>
                                   <div className="h-10 flex items-center gap-2">
                                      <CheckCircle2 size={14} className="text-[#3ecf8e]"/>
                                      <span className="text-[11px] font-bold text-[#1c1c1c]">SSL Certifié v3</span>
                                   </div>
                                </div>
                             </div>
                           )}
                        </div>
                      )) : (
                        <div className="p-24 text-center border-2 border-dashed border-[#ededed] rounded-2xl opacity-40">
                           <Network size={48} className="mx-auto mb-4 text-[#686868]" />
                           <p className="text-[13px] font-black text-[#1c1c1c] uppercase tracking-widest">Chargement de la Gateway...</p>
                        </div>
                      )}
                   </div>
                </div>

                <div className="sb-card bg-[#1c1c1c] text-white p-10 rounded-2xl relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-64 h-64 bg-[#3ecf8e]/10 rounded-full blur-[100px] -mr-32 -mt-32" />
                   <div className="flex items-center gap-8 relative z-10">
                      <div className="w-16 h-16 bg-[#3ecf8e]/20 text-[#3ecf8e] rounded-3xl flex items-center justify-center border border-[#3ecf8e]/30 shadow-lg">
                         <MessageSquare size={36}/>
                      </div>
                      <div className="flex-1">
                         <h3 className="text-xl font-bold tracking-tight">Développement Custom ?</h3>
                         <p className="text-[14px] text-[#9ca3af] mt-1 max-w-lg">Vous pouvez intégrer vos propres connecteurs de messagerie via nos Webhooks certifiés Horizon.</p>
                      </div>
                      <button className="bg-[#3ecf8e] text-[#1c1c1c] font-black uppercase text-[11px] tracking-widest h-12 px-8 rounded-xl hover:bg-[#34b27b] transition-colors shadow-lg shadow-[#3ecf8e]/20">
                        Documentation Dev
                      </button>
                   </div>
                </div>
             </div>
           )}

           {activeTab === 'ai' && (
             <div className="space-y-6 animate-sb-entry">
                <div className="sb-card border-[#ededed] p-10 bg-white">
                   <div className="flex items-center justify-between mb-12">
                      <div className="flex items-center gap-6">
                         <div className="w-16 h-16 bg-[#f5f3ff] rounded-2xl flex items-center justify-center text-purple-600 shadow-sm border border-purple-100"><BrainCircuit size={36}/></div>
                         <div>
                            <h2 className="text-xl font-black text-[#1c1c1c] uppercase tracking-tight">Intelligence Gemini</h2>
                            <p className="text-[11px] text-[#686868] font-bold mt-1 uppercase tracking-widest">Modèles d'inférence stratégique</p>
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
                        { id: 'flash', label: 'Gemini 3 Flash', desc: 'Inférence instantanée (Latence < 50ms)', icon: <Zap className="text-green-500"/> },
                        { id: 'pro', label: 'Gemini 3 Pro', desc: 'Raisonnement expert & Audit stratégique', icon: <Sparkles className="text-purple-600"/> }
                      ].map(m => (
                        <button 
                          key={m.id} 
                          onClick={() => updateConfig({ aiModel: m.id as any })} 
                          className={`p-8 border-2 text-left flex gap-6 rounded-2xl transition-all ${config.aiModel === m.id ? 'border-[#3ecf8e] bg-[#f0fdf4]' : 'border-[#ededed] hover:border-[#3ecf8e]/30'}`}
                        >
                           <div className={`w-14 h-14 rounded-xl flex items-center justify-center shadow-sm bg-white border border-[#ededed]`}>{m.icon}</div>
                           <div className="flex-1">
                              <p className="text-lg font-black text-[#1c1c1c]">{m.label}</p>
                              <p className="text-[11px] text-[#686868] font-bold mt-1.5 uppercase tracking-tight leading-relaxed">{m.desc}</p>
                           </div>
                        </button>
                      ))}
                   </div>
                </div>
             </div>
           )}

           {activeTab === 'infrastructure' && (
              <div className="sb-card border-[#ededed] space-y-12 animate-sb-entry bg-white p-10">
                 <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-[#eff6ff] rounded-2xl flex items-center justify-center text-blue-600 border border-blue-100 shadow-sm"><DatabaseZap size={36}/></div>
                    <div>
                       <h2 className="text-xl font-black text-[#1c1c1c] uppercase tracking-tight">Santé Infrastructure</h2>
                       <p className="text-[11px] text-[#686868] font-bold mt-1 uppercase tracking-widest">Monitoring temps réel du cluster Plaza-LBV</p>
                    </div>
                 </div>
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {[
                       { label: 'Latence Cloud', value: `${syncMetrics.latency || 42}ms`, icon: <Activity size={16}/>, color: 'text-blue-600', bg: 'bg-blue-50' },
                       { label: 'Uptime Global', value: '99.98%', icon: <Power size={16}/>, color: 'text-[#3ecf8e]', bg: 'bg-[#f0fdf4]' },
                       { label: 'Stockage DB', value: '124MB', icon: <HardDrive size={16}/>, color: 'text-purple-600', bg: 'bg-[#f5f3ff]' },
                       { label: 'Sync Status', value: 'LIVE', icon: <RefreshCw size={16}/>, color: 'text-amber-600', bg: 'bg-[#fffbeb]' }
                    ].map((s, i) => (
                       <div key={i} className="p-6 border border-[#ededed] rounded-2xl bg-[#fcfcfc] shadow-sm flex flex-col gap-4 group hover:border-[#3ecf8e] transition-colors">
                          <div className={`w-10 h-10 rounded-xl ${s.bg} ${s.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>{s.icon}</div>
                          <div>
                            <p className="text-[10px] font-black text-[#686868] uppercase tracking-widest">{s.label}</p>
                            <p className={`text-2xl font-black mt-1 ${s.color}`}>{s.value}</p>
                          </div>
                       </div>
                    ))}
                 </div>
              </div>
           )}

           {activeTab === 'security' && (
             <div className="space-y-6 animate-sb-entry">
                <div className="sb-card border-[#ededed] bg-white">
                   <div className="flex items-center justify-between mb-10 px-2">
                      <div className="flex items-center gap-5">
                         <div className="w-14 h-14 bg-[#f0fdf4] rounded-2xl flex items-center justify-center text-[#3ecf8e] shadow-sm border border-[#dcfce7]"><ShieldCheck size={32}/></div>
                         <div>
                            <h2 className="text-lg font-black text-[#1c1c1c] uppercase tracking-tight">Accès & Identités (IAM)</h2>
                            <p className="text-[11px] text-[#686868] font-bold uppercase tracking-widest mt-1">Gestion centralisée des experts</p>
                         </div>
                      </div>
                      <button 
                        onClick={() => { setEditingUser(null); setIsModalOpen(true); }}
                        className="btn-sb-primary h-11 px-6 shadow-lg shadow-[#3ecf8e]/10"
                      >
                        <UserPlus size={18}/> <span>Créer Accès</span>
                      </button>
                   </div>

                   <div className="sb-table-container">
                      <table className="w-full text-left sb-table">
                         <thead>
                            <tr>
                               <th>Collaborateur</th>
                               <th>Rôle Système</th>
                               <th>Site</th>
                               <th className="text-right px-8">Actions</th>
                            </tr>
                         </thead>
                         <tbody>
                            {users.map((user: UserProfile) => (
                              <tr key={user.id} className="group">
                                 <td className="py-5">
                                    <div className="flex items-center gap-4">
                                       <img src={user.avatar} className="w-10 h-10 rounded-xl border border-[#ededed] object-cover" alt="" />
                                       <div>
                                          <p className="text-[14px] font-black text-[#1c1c1c]">{user.name}</p>
                                          <p className="text-[11px] text-[#686868] font-medium">{user.email}</p>
                                       </div>
                                    </div>
                                 </td>
                                 <td>
                                    <span className={`px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${user.role === 'ADMIN' ? 'bg-[#fff1f2] text-red-500 border-red-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                                       {user.role}
                                    </span>
                                 </td>
                                 <td>
                                    <p className="text-[12px] font-bold text-[#1c1c1c]">{user.showroom || 'Libreville HQ'}</p>
                                 </td>
                                 <td className="text-right px-8">
                                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                       <button 
                                        onClick={() => { setEditingUser(user); setIsModalOpen(true); }}
                                        className="p-2 text-[#686868] hover:text-[#3ecf8e] transition-colors border border-[#ededed] rounded-lg"
                                       >
                                          <Edit3 size={16}/>
                                       </button>
                                       <button 
                                        onClick={() => { if(window.confirm('Révoquer cet accès ?')) deleteUser(user.id); }}
                                        className="p-2 text-[#686868] hover:text-red-500 transition-colors border border-[#ededed] rounded-lg"
                                       >
                                          <Trash2 size={16}/>
                                       </button>
                                    </div>
                                 </td>
                              </tr>
                            ))}
                         </tbody>
                      </table>
                   </div>
                </div>

                <div className="sb-card border-[#ededed] p-10 bg-white">
                   <h3 className="text-xs font-black text-[#1c1c1c] uppercase tracking-[0.2em] flex items-center gap-4 mb-8">
                      <Lock size={18} className="text-[#3ecf8e]"/> Sécurité Globale Cloud
                   </h3>
                   <div className="space-y-4">
                      <div className="flex items-center justify-between p-5 bg-[#f8f9fa] border border-[#ededed] rounded-2xl group hover:border-[#3ecf8e] transition-colors">
                         <div>
                            <p className="text-sm font-black text-[#1c1c1c]">Authentification Multi-Facteurs (MFA)</p>
                            <p className="text-[11px] text-[#686868] font-medium mt-1">Exiger un jeton de validation Horizon pour chaque connexion Expert.</p>
                         </div>
                         <button 
                          onClick={() => handleToggleConfig('mfaRequired')}
                          className={`w-11 h-6 rounded-full relative transition-all duration-300 ${config.mfaRequired ? 'bg-[#3ecf8e]' : 'bg-[#e5e7eb]'}`}
                         >
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${config.mfaRequired ? 'right-1' : 'left-1'}`} />
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
        title={editingUser ? "Édition Accès Expert" : "Ouverture Compte Expert"}
      >
         <form onSubmit={handleSaveUser} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-[#686868] uppercase tracking-widest">Nom Complet</label>
                  <input name="name" type="text" defaultValue={editingUser?.name} placeholder="ex: Kevin Nguema" required className="w-full h-11" />
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-[#686868] uppercase tracking-widest">Email Horizon</label>
                  <input name="email" type="email" defaultValue={editingUser?.email} placeholder="email@royalplaza.ga" required className="w-full h-11" />
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-[#686868] uppercase tracking-widest">Accréditation</label>
                  <select name="role" defaultValue={editingUser?.role || 'AGENT'} className="w-full h-11">
                     <option value="AGENT">Agent SAV (Inbox + Tickets)</option>
                     <option value="TECHNICIAN">Technicien (Maintenance + Terrain)</option>
                     <option value="MANAGER">Manager (Audit + Performance)</option>
                     <option value="ADMIN">Administrateur (Full Root Access)</option>
                  </select>
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-[#686868] uppercase tracking-widest">Showroom Affecté</label>
                  <select name="showroom" defaultValue={editingUser?.showroom || 'Glass'} className="w-full h-11">
                     <option value="Glass">Plaza Glass</option>
                     <option value="Oloumi">Plaza Oloumi</option>
                     <option value="Bord de mer">Plaza Bord de mer</option>
                     <option value="Online">Support Centralisé</option>
                  </select>
               </div>
               <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] font-black text-[#686868] uppercase tracking-widest">Clé d'Accès Temporaire</label>
                  <input name="password" type="password" placeholder="•••••••• (Laissez vide pour conserver l'actuelle)" className="w-full h-11" />
               </div>
            </div>
            <div className="flex justify-end gap-3 pt-8 border-t border-[#f5f5f5]">
               <button type="button" onClick={() => setIsModalOpen(false)} className="btn-sb-outline h-11 px-8 text-[11px] font-black uppercase tracking-widest">Annuler</button>
               <button type="submit" className="btn-sb-primary h-11 px-12 shadow-lg shadow-[#3ecf8e]/10 text-[11px] font-black uppercase tracking-widest">
                  Valider l'Accès
               </button>
            </div>
         </form>
      </Modal>
    </div>
  );
};

export default Settings;
