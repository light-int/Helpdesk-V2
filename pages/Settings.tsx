
import React, { useState, useMemo, useEffect } from 'react';
import { 
  RefreshCw, Plus, Trash2, ShieldCheck, 
  Terminal, Network, BrainCircuit, Edit3, UserPlus, DatabaseZap, LayoutGrid,
  ShieldAlert, Smartphone, Mail, Facebook, Power,
  HardDrive, Lock, Eye, EyeOff,
  Zap, Sparkles, Activity,
  ExternalLink, CheckCircle2, MessageSquare, Settings as SettingsIcon,
  Key, Globe, Cpu, Server, Shield, Send, History, Search, Filter, Bot,
  UserCheck, Timer, Database
} from 'lucide-react';
import { useData, useNotifications } from '../App';
import { UserRole, UserProfile, IntegrationConfig, AuditLog, AiProvider } from '../types';
import Modal from '../components/Modal';
import { ApiService } from '../services/apiService';

const Settings: React.FC = () => {
  const { 
    users, refreshAll, isSyncing, config, 
    updateConfig, syncMetrics, auditLogs,
    saveUser, deleteUser, brands, addBrand, deleteBrand, isLoading,
    parts, customers, products, tickets
  } = useData();
  const { addNotification } = useNotifications();
  
  const [activeTab, setActiveTab] = useState<'governance' | 'integrations' | 'ai' | 'infrastructure' | 'security' | 'audit'>('governance');
  const [isGatewayModalOpen, setIsGatewayModalOpen] = useState(false);
  const [editingIntegration, setEditingIntegration] = useState<IntegrationConfig | null>(null);
  const [integrations, setIntegrations] = useState<IntegrationConfig[]>([]);
  const [loadingIntegrations, setLoadingIntegrations] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');
  const [logSearch, setLogSearch] = useState('');

  const tabs = [
    { id: 'governance', label: 'Gouvernance', icon: <Terminal size={18} />, desc: 'Kernel & Référentiels' },
    { id: 'integrations', label: 'Gateway', icon: <Network size={18} />, desc: 'Connecteurs API' },
    { id: 'ai', label: 'Intelligence', icon: <BrainCircuit size={18} />, desc: 'Modèles IA' },
    { id: 'infrastructure', label: 'Vitalité', icon: <DatabaseZap size={18} />, desc: 'Santé Cluster' },
    { id: 'security', label: 'Identités', icon: <ShieldCheck size={18} />, desc: 'Accès IAM' },
    { id: 'audit', label: 'Journaux', icon: <History size={18} />, desc: 'Audit des actions' },
  ] as const;

  useEffect(() => {
    if (activeTab === 'integrations') fetchIntegrations();
  }, [activeTab]);

  const fetchIntegrations = async () => {
    setLoadingIntegrations(true);
    try {
      const data = await ApiService.integrations.getConfigs();
      setIntegrations(data);
    } catch (e) {
      addNotification({ title: 'Erreur', message: 'Échec chargement Gateway.', type: 'error' });
    } finally { setLoadingIntegrations(false); }
  };

  const handleToggleConfig = async (key: keyof typeof config) => {
    await updateConfig({ [key]: !config[key] });
    addNotification({ title: 'Système', message: 'Paramètre mis à jour.', type: 'info' });
  };

  const handleProviderChange = async (provider: AiProvider) => {
    const defaultModel = provider === 'google' ? 'flash' : 'qwen/qwen3-next-80b-a3b-instruct:free';
    await updateConfig({ aiProvider: provider, aiModel: defaultModel });
    addNotification({ title: 'Kernel IA', message: `Moteur basculé sur ${provider === 'google' ? 'Google Gemini' : 'OpenRouter'}.`, type: 'success' });
  };

  const handleSaveIntegration = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingIntegration) return;
    setIsSaving(true);
    const formData = new FormData(e.currentTarget);
    const updated = {
      ...editingIntegration,
      apiKey: formData.get('apiKey') as string,
      webhookUrl: formData.get('webhookUrl') as string,
      settings: { ...editingIntegration.settings }
    };
    try {
      await ApiService.integrations.saveConfig(updated);
      setIsGatewayModalOpen(false);
      fetchIntegrations();
      addNotification({ title: 'Gateway', message: 'Configuration sauvegardée avec succès.', type: 'success' });
    } catch (err) {
      addNotification({ title: 'Erreur', message: 'Échec de la sauvegarde Cloud.', type: 'error' });
    } finally { setIsSaving(false); }
  };

  const handleToggleIntegration = async (int: IntegrationConfig) => {
    const updated = { ...int, enabled: !int.enabled };
    await ApiService.integrations.saveConfig(updated);
    setIntegrations(prev => prev.map(i => i.id === int.id ? updated : i));
    addNotification({ 
      title: 'Gateway', 
      message: `${int.name} ${updated.enabled ? 'activé' : 'désactivé'}.`, 
      type: 'info' 
    });
  };

  const handleSaveUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    const formData = new FormData(e.currentTarget);
    const u: UserProfile = {
      id: editingUser?.id || `U-${Date.now().toString().slice(-4)}`,
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      password: (formData.get('password') as string) || editingUser?.password || 'plaza2026',
      role: formData.get('role') as UserRole,
      showroom: formData.get('showroom') as string,
      avatar: editingUser?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.get('name') as string)}&background=3ecf8e&color=ffffff`,
      status: 'Actif'
    };
    try {
      await saveUser(u);
      setIsUserModalOpen(false);
      addNotification({ title: 'IAM', message: 'Accès collaborateur synchronisé.', type: 'success' });
    } catch (err) {
      addNotification({ title: 'Erreur', message: 'Échec sauvegarde IAM.', type: 'error' });
    } finally { setIsSaving(false); }
  };

  const filteredLogs = useMemo(() => {
    return (auditLogs || []).filter((log: AuditLog) => 
      log.userName.toLowerCase().includes(logSearch.toLowerCase()) ||
      log.action.toLowerCase().includes(logSearch.toLowerCase()) ||
      log.details.toLowerCase().includes(logSearch.toLowerCase())
    );
  }, [auditLogs, logSearch]);

  if (isLoading) return <div className="h-[80vh] flex items-center justify-center"><RefreshCw className="animate-spin text-[#3ecf8e]" size={32} /></div>;

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-sb-entry pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1c1c1c]">Paramètres Cloud</h1>
          <p className="text-xs text-[#686868] mt-1">Console d'administration Royal Plaza Horizon.</p>
        </div>
        <button onClick={refreshAll} className="btn-sb-outline h-10 px-3"><RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''}/></button>
      </header>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        <div className="w-full lg:w-72 flex flex-col gap-1 shrink-0 bg-white border border-[#ededed] p-2 rounded-xl shadow-sm">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-4 px-4 py-3 rounded-lg transition-all text-left ${activeTab === tab.id ? 'bg-[#f8f9fa] text-[#1c1c1c]' : 'text-[#686868] hover:bg-[#fafafa]'}`}>
              <span className={activeTab === tab.id ? 'text-[#3ecf8e]' : ''}>{tab.icon}</span>
              <div className="flex-1">
                 <p className="text-[13px] font-bold">{tab.label}</p>
                 <p className="text-[10px] text-[#9ca3af] font-medium">{tab.desc}</p>
              </div>
            </button>
          ))}
        </div>

        <div className="flex-1 w-full space-y-6">
           {/* GOVERNANCE */}
           {activeTab === 'governance' && (
             <div className="space-y-6 animate-sb-entry">
                <div className="sb-card bg-white p-8">
                   <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-4">
                         <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-gray-600 border border-gray-100"><Terminal size={24}/></div>
                         <div><h2 className="text-sm font-black uppercase text-[#1c1c1c]">Référentiels du Kernel</h2><p className="text-[10px] text-[#686868] font-bold uppercase">Standards de données Royal Plaza</p></div>
                      </div>
                      <button onClick={() => setIsBrandModalOpen(true)} className="btn-sb-primary h-9 px-4 text-[11px] uppercase font-black tracking-widest"><Plus size={14}/> Ajouter Marque</button>
                   </div>
                   <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {brands.map((b: string) => (
                        <div key={b} className="flex items-center justify-between p-3 bg-[#f8f9fa] border border-[#ededed] rounded-xl group">
                           <span className="text-[11px] font-black text-[#1c1c1c] uppercase">{b}</span>
                           <button onClick={() => deleteBrand(b)} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={14}/></button>
                        </div>
                      ))}
                   </div>
                </div>
                <div className="sb-card bg-white p-8 space-y-8">
                   <h2 className="text-xs font-black uppercase text-[#1c1c1c] tracking-widest mb-6">Paramètres de sécurité Kernel</h2>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-[#686868] uppercase flex items-center gap-2"><Timer size={14}/> Timeout Session (Minutes)</label>
                         <input type="number" value={config.sessionTimeout} onChange={(e) => updateConfig({ sessionTimeout: parseInt(e.target.value) })} className="w-full h-11" />
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-[#686868] uppercase flex items-center gap-2"><Lock size={14}/> Complexité Mots de passe</label>
                         <select value={config.passwordComplexity} onChange={(e) => updateConfig({ passwordComplexity: e.target.value as any })} className="w-full h-11 font-bold">
                            <option value="low">Standard (Min 6)</option>
                            <option value="medium">Renforcé (Alphanumérique)</option>
                            <option value="high">Cluster (Maj+Car+Num)</option>
                         </select>
                      </div>
                   </div>
                   <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl flex gap-3">
                      <ShieldAlert className="text-amber-500 shrink-0" size={18}/>
                      <p className="text-[10px] text-amber-800 font-bold leading-relaxed">Les modifications critiques du Kernel nécessitent un redémarrage des sessions collaborateurs pour être effectives sur tout le cluster LBV-WEST.</p>
                   </div>
                </div>
             </div>
           )}

           {/* GATEWAY */}
           {activeTab === 'integrations' && (
             <div className="space-y-6 animate-sb-entry">
                <div className="sb-card border-[#ededed] bg-white">
                   <div className="flex items-center gap-5 mb-10">
                      <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 border border-blue-100"><Network size={32}/></div>
                      <div>
                         <h2 className="text-lg font-black text-[#1c1c1c] uppercase tracking-tight">Connecteurs Gateway</h2>
                         <p className="text-[11px] text-[#686868] font-bold uppercase mt-1">Liaisons omnicanales et services tiers</p>
                      </div>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {integrations.map((int: IntegrationConfig) => (
                        <div key={int.id} className={`p-6 bg-[#f8f9fa] border rounded-2xl space-y-6 group transition-all ${int.id === 'openrouter' ? 'border-purple-100 hover:border-purple-400' : 'border-[#ededed] hover:border-[#3ecf8e]'}`}>
                           <div className="flex items-start justify-between">
                              <div className="flex items-center gap-4">
                                 <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm border ${int.enabled ? 'bg-white text-[#3ecf8e] border-[#dcfce7]' : 'bg-gray-100 text-gray-400'}`}>
                                    {int.id === 'openrouter' ? <Bot size={24} className="text-purple-600"/> : <Globe size={24}/>}
                                 </div>
                                 <div>
                                    <h3 className="text-sm font-black text-[#1c1c1c] uppercase">{int.name}</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                       <div className={`w-1.5 h-1.5 rounded-full ${int.enabled ? 'bg-[#3ecf8e] animate-pulse' : 'bg-gray-300'}`} />
                                       <span className="text-[9px] font-black uppercase text-gray-400">{int.enabled ? 'Connecté' : 'Suspendu'}</span>
                                    </div>
                                 </div>
                              </div>
                              <button onClick={() => handleToggleIntegration(int)} className={`p-2 rounded-lg transition-colors ${int.enabled ? 'text-red-500 hover:bg-red-50' : 'text-[#3ecf8e] hover:bg-green-50'}`}>
                                 <Power size={18}/>
                              </button>
                           </div>
                           <div className="pt-4 border-t border-[#ededed] flex justify-end">
                              <button onClick={() => { setEditingIntegration(int); setIsGatewayModalOpen(true); }} className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:text-[#3ecf8e]">Configurer <Edit3 size={12}/></button>
                           </div>
                        </div>
                      ))}
                   </div>
                </div>
             </div>
           )}

           {/* INTELLIGENCE */}
           {activeTab === 'ai' && (
             <div className="space-y-6 animate-sb-entry">
                <div className="sb-card border-[#ededed] bg-white p-8">
                   <div className="flex items-center gap-5 mb-10">
                      <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 border border-purple-100"><BrainCircuit size={32}/></div>
                      <div><h2 className="text-lg font-black text-[#1c1c1c] uppercase tracking-tight">Intelligence Artificielle</h2><p className="text-[11px] text-[#686868] font-bold uppercase mt-1">Multi-LLM Provisioning</p></div>
                   </div>
                   <div className="space-y-8">
                      <div className="p-6 bg-[#f8f9fa] border border-[#ededed] rounded-2xl">
                         <h3 className="text-xs font-black text-[#1c1c1c] uppercase tracking-widest mb-6">Source d'inférence</h3>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <button onClick={() => handleProviderChange('google')} className={`p-4 rounded-xl border-2 text-left transition-all ${config.aiProvider === 'google' ? 'border-[#3ecf8e] bg-white shadow-md' : 'border-transparent bg-white/50'}`}>
                               <div className="flex items-center justify-between mb-2"><span className="text-[13px] font-black">Google Gemini SDK</span>{config.aiProvider === 'google' && <CheckCircle2 size={16} className="text-[#3ecf8e]"/>}</div>
                               <p className="text-[11px] text-[#686868]">Modèles Flash/Pro via connexion directe Google Cloud.</p>
                            </button>
                            <button onClick={() => handleProviderChange('openrouter')} className={`p-4 rounded-xl border-2 text-left transition-all ${config.aiProvider === 'openrouter' ? 'border-[#3ecf8e] bg-white shadow-md' : 'border-transparent bg-white/50'}`}>
                               <div className="flex items-center justify-between mb-2"><span className="text-[13px] font-black">OpenRouter Gateway</span>{config.aiProvider === 'openrouter' && <CheckCircle2 size={16} className="text-[#3ecf8e]"/>}</div>
                               <p className="text-[11px] text-[#686868]">Accès aux modèles Qwen, DeepSeek et Claude (Via Clé API).</p>
                            </button>
                         </div>
                      </div>
                      {config.aiProvider === 'openrouter' && (
                        <div className="p-5 bg-blue-50 border border-blue-100 rounded-xl space-y-3 animate-sb-entry">
                           <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Identifiant du modèle (Ex: qwen/qwen-2.5-72b-instruct)</label>
                           <div className="flex gap-2">
                              <input type="text" className="flex-1 h-11 bg-white border-blue-200" value={config.aiModel} onChange={(e) => updateConfig({ aiModel: e.target.value })} placeholder="tngtech/deepseek-r1t-chimera:free" />
                              <button onClick={() => updateConfig({ aiModel: "qwen/qwen3-next-80b-a3b-instruct:free" })} className="px-3 bg-white border border-blue-200 text-[10px] font-bold text-blue-600 rounded-lg hover:bg-blue-100">Default</button>
                           </div>
                        </div>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-2">
                         {[
                           { key: 'aiEnabled', label: 'Activation Globale IA', desc: 'Active tous les services intelligents.' },
                           { key: 'aiAutoCategorization', label: 'Triage Automatique', desc: 'Analyse des tickets par le LLM sélectionné.' },
                           { key: 'aiStrategicAudit', label: 'Rapports Visionnaires', desc: 'Génération d\'audits mensuels.' },
                           { key: 'aiChatbotEnabled', label: 'Horizon Assistant Chat', desc: 'Interface conversationnelle.' }
                         ].map((item) => (
                           <div key={item.key} className="flex items-start justify-between gap-6 group">
                              <div className="flex-1"><h4 className="text-[13px] font-bold text-[#1c1c1c] mb-1">{item.label}</h4><p className="text-[11px] text-[#686868] leading-relaxed">{item.desc}</p></div>
                              <button onClick={() => handleToggleConfig(item.key as any)} className={`w-12 h-6 rounded-full shrink-0 relative transition-all ${config[item.key as keyof typeof config] ? 'bg-[#3ecf8e]' : 'bg-[#e5e7eb]'}`}><div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${config[item.key as keyof typeof config] ? 'right-1' : 'left-1'}`} /></button>
                           </div>
                         ))}
                      </div>
                   </div>
                </div>
             </div>
           )}

           {/* INFRASTRUCTURE (VITALITÉ) */}
           {activeTab === 'infrastructure' && (
             <div className="space-y-6 animate-sb-entry">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                   <div className="sb-card bg-white p-6 border border-[#ededed] shadow-sm"><div className="flex justify-between items-start mb-4"><div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg"><Activity size={20}/></div><span className="text-[9px] font-black uppercase text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">Realtime</span></div><p className="text-[10px] font-black text-[#686868] uppercase tracking-widest">Latence Cluster</p><h3 className="text-2xl font-black text-[#1c1c1c] mt-1">{syncMetrics.latency || 32}ms</h3></div>
                   <div className="sb-card bg-white p-6 border border-[#ededed] shadow-sm"><div className="flex justify-between items-start mb-4"><div className="p-2.5 bg-[#f0fdf4] text-[#3ecf8e] rounded-lg"><Database size={20}/></div><span className="text-[9px] font-black uppercase text-[#3ecf8e] bg-[#f0fdf4] px-2 py-0.5 rounded border border-[#dcfce7]">Stable</span></div><p className="text-[10px] font-black text-[#686868] uppercase tracking-widest">Santé Database</p><h3 className="text-2xl font-black text-[#1c1c1c] mt-1">100%</h3></div>
                   <div className="sb-card bg-white p-6 border border-[#ededed] shadow-sm"><div className="flex justify-between items-start mb-4"><div className="p-2.5 bg-purple-50 text-purple-600 rounded-lg"><Server size={20}/></div></div><p className="text-[10px] font-black text-[#686868] uppercase tracking-widest">Région Cloud</p><h3 className="text-2xl font-black text-[#1c1c1c] mt-1">LBV-01</h3></div>
                </div>
                <div className="sb-card bg-white p-8">
                   <h2 className="text-xs font-black uppercase text-[#1c1c1c] tracking-widest mb-8">Statistiques de stockage (Cluster Horizon)</h2>
                   <div className="space-y-6">
                      {[
                        { label: 'Tickets SAV', count: tickets.length, color: 'bg-blue-500' },
                        { label: 'Catalogue Pièces', count: parts.length, color: 'bg-[#3ecf8e]' },
                        { label: 'Clients Plaza', count: customers.length, color: 'bg-amber-500' },
                        { label: 'Objets Produits', count: products.length, color: 'bg-purple-500' }
                      ].map((item) => (
                        <div key={item.label} className="space-y-2">
                           <div className="flex justify-between text-[11px] font-black uppercase"><span className="text-[#1c1c1c]">{item.label}</span><span className="text-[#686868]">{item.count} Entrées</span></div>
                           <div className="h-1.5 w-full bg-gray-50 rounded-full overflow-hidden border border-gray-100"><div className={`h-full ${item.color}`} style={{ width: `${Math.min(100, (item.count / 1000) * 100)}%` }} /></div>
                        </div>
                      ))}
                   </div>
                </div>
             </div>
           )}

           {/* SECURITY (IDENTITÉS) */}
           {activeTab === 'security' && (
             <div className="space-y-6 animate-sb-entry">
                <div className="sb-card bg-white p-8">
                   <div className="flex items-center justify-between mb-10">
                      <div className="flex items-center gap-4">
                         <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 border border-purple-100"><ShieldCheck size={24}/></div>
                         <div><h2 className="text-sm font-black uppercase text-[#1c1c1c]">Gestion des Accès IAM</h2><p className="text-[10px] text-[#686868] font-bold uppercase">Utilisateurs et accréditations</p></div>
                      </div>
                      <button onClick={() => { setEditingUser(null); setIsUserModalOpen(true); }} className="btn-sb-primary h-10 px-5 text-[11px] uppercase font-black tracking-widest shadow-lg shadow-[#3ecf8e]/20"><UserPlus size={16}/> Créer Accès</button>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {users.map((user: UserProfile) => (
                        <div key={user.id} className="p-5 bg-[#f8f9fa] border border-[#ededed] rounded-2xl flex items-center gap-4 group hover:border-[#3ecf8e] transition-all">
                           <img src={user.avatar} className="w-12 h-12 rounded-xl object-cover border border-[#ededed]" alt="" />
                           <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-black text-[#1c1c1c] truncate">{user.name}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                 <span className="text-[9px] font-black uppercase text-[#3ecf8e] bg-[#f0fdf4] px-1.5 rounded-sm border border-[#dcfce7]">{user.role}</span>
                                 <span className="text-[9px] text-[#9ca3af] font-bold truncate">{user.email}</span>
                              </div>
                           </div>
                           <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => { setEditingUser(user); setIsUserModalOpen(true); }} className="p-2 text-[#686868] hover:text-[#3ecf8e]"><Edit3 size={15}/></button>
                              <button onClick={() => deleteUser(user.id)} className="p-2 text-[#686868] hover:text-red-500"><Trash2 size={15}/></button>
                           </div>
                        </div>
                      ))}
                   </div>
                </div>
             </div>
           )}

           {/* AUDIT (JOURNAUX) */}
           {activeTab === 'audit' && (
             <div className="space-y-6 animate-sb-entry">
                <div className="sb-card bg-white p-8">
                   <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                      <div className="flex items-center gap-4">
                         <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 border border-blue-100"><History size={24}/></div>
                         <div><h2 className="text-sm font-black uppercase text-[#1c1c1c]">Traceur d'Audit</h2><p className="text-[10px] text-[#686868] font-bold uppercase">Journal inaltérable du cluster</p></div>
                      </div>
                      <div className="relative w-full md:w-64"><Search className="absolute left-3 top-2.5 text-[#686868]" size={14} /><input type="text" placeholder="Filtrer les actions..." className="w-full pl-9 h-9 text-xs" value={logSearch} onChange={e => setLogSearch(e.target.value)} /></div>
                   </div>
                   <div className="sb-table-container">
                      <table className="w-full text-left sb-table">
                         <thead><tr className="bg-[#fcfcfc]"><th className="px-6 py-3">Timestamp</th><th className="px-6 py-3">Expert</th><th className="px-6 py-3">Action</th><th className="px-6 py-3 text-right">Cible</th></tr></thead>
                         <tbody className="divide-y divide-[#f5f5f5]">
                            {filteredLogs.map((log: AuditLog) => (
                              <tr key={log.id} className="hover:bg-[#fcfcfc] transition-colors">
                                 <td className="px-6 py-4 text-[10px] font-mono text-[#686868] uppercase">{new Date(log.timestamp).toLocaleString()}</td>
                                 <td className="px-6 py-4"><p className="text-[12px] font-black text-[#1c1c1c]">{log.userName}</p></td>
                                 <td className="px-6 py-4"><span className="text-[11px] font-bold text-[#4b5563]">{log.details}</span></td>
                                 <td className="px-6 py-4 text-right"><span className="text-[10px] font-black text-[#3ecf8e] uppercase bg-[#f0fdf4] px-2 py-0.5 rounded border border-[#dcfce7]">{log.action}</span></td>
                              </tr>
                            ))}
                         </tbody>
                      </table>
                   </div>
                </div>
             </div>
           )}
        </div>
      </div>

      {/* MODAL USER IAM */}
      <Modal isOpen={isUserModalOpen} onClose={() => setIsUserModalOpen(false)} title={editingUser ? "Édition Accès Collaborateur" : "Ouverture Compte IAM"}>
         <form onSubmit={handleSaveUser} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="space-y-1.5"><label className="text-[10px] font-bold text-[#686868] uppercase">Identité complète</label><input name="name" type="text" defaultValue={editingUser?.name} required className="w-full h-11" placeholder="ex: Kevin Nguema" /></div>
               <div className="space-y-1.5"><label className="text-[10px] font-bold text-[#686868] uppercase">Email Cluster</label><input name="email" type="email" defaultValue={editingUser?.email} required className="w-full h-11" placeholder="user@royalplaza.ga" /></div>
               <div className="space-y-1.5"><label className="text-[10px] font-bold text-[#686868] uppercase">Accréditation</label><select name="role" defaultValue={editingUser?.role || 'AGENT'} className="w-full h-11 font-bold">
                  <option value="ADMIN">ADMIN (Accès Root)</option>
                  <option value="MANAGER">MANAGER (Audit & RH)</option>
                  <option value="AGENT">AGENT (SAV & Front)</option>
                  <option value="TECHNICIAN">TECHNICIEN (Terrain)</option>
               </select></div>
               <div className="space-y-1.5"><label className="text-[10px] font-bold text-[#686868] uppercase">Site Showroom</label><select name="showroom" defaultValue={editingUser?.showroom || 'Glass'} className="w-full h-11 font-bold">
                  <option value="Glass">Plaza Glass</option>
                  <option value="Oloumi">Plaza Oloumi</option>
                  <option value="Bord de mer">Plaza Bord de mer</option>
                  <option value="Online">Support Online</option>
               </select></div>
            </div>
            <div className="flex justify-end gap-3 pt-6 border-t">
               <button type="button" onClick={() => setIsUserModalOpen(false)} className="btn-sb-outline h-11 px-6">Fermer</button>
               <button type="submit" disabled={isSaving} className="btn-sb-primary h-11 px-8 shadow-lg shadow-[#3ecf8e]/20">{isSaving ? <RefreshCw className="animate-spin" size={16}/> : 'Synchroniser Identité'}</button>
            </div>
         </form>
      </Modal>

      {/* MODAL BRAND */}
      <Modal isOpen={isBrandModalOpen} onClose={() => setIsBrandModalOpen(false)} title="Nouvelle Marque Certifiée">
         <div className="space-y-6">
            <div className="space-y-2"><label className="text-[10px] font-bold text-[#686868] uppercase">Nom de la marque</label><input type="text" value={newBrandName} onChange={e => setNewBrandName(e.target.value)} className="w-full h-12" placeholder="ex: BEKO" /></div>
            <div className="flex justify-end gap-3 pt-4 border-t">
               <button onClick={() => setIsBrandModalOpen(false)} className="btn-sb-outline">Annuler</button>
               <button onClick={async () => { if(!newBrandName) return; await addBrand(newBrandName); setNewBrandName(''); setIsBrandModalOpen(false); }} className="btn-sb-primary h-11 px-8 shadow-md">Enregistrer</button>
            </div>
         </div>
      </Modal>

      {/* MODAL GATEWAY */}
      <Modal isOpen={isGatewayModalOpen} onClose={() => setIsGatewayModalOpen(false)} title={`Config Gateway - ${editingIntegration?.name}`}>
         {editingIntegration && (
           <form onSubmit={handleSaveIntegration} className="space-y-6">
              <div className="p-6 bg-[#f8f9fa] rounded-xl space-y-4">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase flex items-center gap-2">{editingIntegration.id === 'openrouter' ? <Key size={14} className="text-purple-600"/> : <Key size={14}/>} Clé API / Token de sécurité</label>
                    <input name="apiKey" type="password" defaultValue={editingIntegration.apiKey} className="w-full h-12" placeholder={editingIntegration.id === 'openrouter' ? "sk-or-v1-..." : "Token..."} required />
                    {editingIntegration.id === 'openrouter' && <p className="text-[10px] text-gray-500 font-medium">Récupérez votre clé sur openrouter.ai/keys</p>}
                 </div>
                 {editingIntegration.id !== 'openrouter' && (
                    <div className="space-y-2"><label className="text-[10px] font-black uppercase">URL Webhook / Point de terminaison</label><input name="webhookUrl" type="url" defaultValue={editingIntegration.webhookUrl} className="w-full h-12" /></div>
                 )}
              </div>
              <div className="flex justify-end gap-3 pt-6 border-t">
                 <button type="button" onClick={() => setIsGatewayModalOpen(false)} className="btn-sb-outline h-11 px-6">Fermer</button>
                 <button type="submit" className="btn-sb-primary h-11 px-8 shadow-lg shadow-[#3ecf8e]/20">Sauvegarder</button>
              </div>
           </form>
         )}
      </Modal>
    </div>
  );
};

export default Settings;
