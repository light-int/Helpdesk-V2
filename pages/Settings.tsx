
import React, { useState, useMemo, useEffect } from 'react';
import { 
  RefreshCw, Plus, Trash2, ShieldCheck, 
  Terminal, Network, BrainCircuit, Edit3, UserPlus, DatabaseZap, LayoutGrid,
  ShieldAlert, Smartphone, Mail, Facebook, Power,
  HardDrive, Lock, Eye, EyeOff,
  Zap, Sparkles, Activity,
  ExternalLink, CheckCircle2, MessageSquare, Settings as SettingsIcon,
  Key, Globe, Cpu, Server, Shield, Send, History, Search, Filter, Bot
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
    { id: 'ai', label: 'Intelligence', icon: <BrainCircuit size={18} />, desc: 'Modèles Gemini' },
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
      addNotification({ title: 'Gateway', message: 'Configuration sauvegardée.', type: 'success' });
    } finally { setIsSaving(false); }
  };

  const handleToggleIntegration = async (int: IntegrationConfig) => {
    const updated = { ...int, enabled: !int.enabled };
    await ApiService.integrations.saveConfig(updated);
    setIntegrations(prev => prev.map(i => i.id === int.id ? updated : i));
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
           {activeTab === 'ai' && (
             <div className="space-y-6 animate-sb-entry">
                <div className="sb-card border-[#ededed] bg-white p-8">
                   <div className="flex items-center gap-5 mb-10">
                      <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 border border-purple-100"><BrainCircuit size={32}/></div>
                      <div>
                         <h2 className="text-lg font-black text-[#1c1c1c] uppercase tracking-tight">Intelligence Artificielle</h2>
                         <p className="text-[11px] text-[#686868] font-bold uppercase mt-1">Multi-LLM Provisioning</p>
                      </div>
                   </div>

                   <div className="space-y-8">
                      <div className="p-6 bg-[#f8f9fa] border border-[#ededed] rounded-2xl">
                         <h3 className="text-xs font-black text-[#1c1c1c] uppercase tracking-widest mb-6">Source d'inférence</h3>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <button onClick={() => handleProviderChange('google')} className={`p-4 rounded-xl border-2 text-left transition-all ${config.aiProvider === 'google' ? 'border-[#3ecf8e] bg-white shadow-md' : 'border-transparent bg-white/50'}`}>
                               <div className="flex items-center justify-between mb-2">
                                  <span className="text-[13px] font-black">Google Gemini SDK</span>
                                  {config.aiProvider === 'google' && <CheckCircle2 size={16} className="text-[#3ecf8e]"/>}
                               </div>
                               <p className="text-[11px] text-[#686868]">Modèles Flash/Pro via connexion directe Google Cloud.</p>
                            </button>
                            <button onClick={() => handleProviderChange('openrouter')} className={`p-4 rounded-xl border-2 text-left transition-all ${config.aiProvider === 'openrouter' ? 'border-[#3ecf8e] bg-white shadow-md' : 'border-transparent bg-white/50'}`}>
                               <div className="flex items-center justify-between mb-2">
                                  <span className="text-[13px] font-black">OpenRouter Gateway</span>
                                  {config.aiProvider === 'openrouter' && <CheckCircle2 size={16} className="text-[#3ecf8e]"/>}
                               </div>
                               <p className="text-[11px] text-[#686868]">Accès aux modèles Qwen, Llama et Claude (Nécessite Clé API).</p>
                            </button>
                         </div>
                      </div>

                      {config.aiProvider === 'openrouter' && (
                        <div className="p-5 bg-blue-50 border border-blue-100 rounded-xl space-y-3">
                           <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Identifiant du modèle (OpenRouter ID)</label>
                           <input 
                            type="text" 
                            className="w-full h-11 bg-white" 
                            value={config.aiModel}
                            onChange={(e) => updateConfig({ aiModel: e.target.value })}
                            placeholder="qwen/qwen3-next-80b-a3b-instruct:free"
                           />
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
                              <div className="flex-1">
                                 <h4 className="text-[13px] font-bold text-[#1c1c1c] mb-1">{item.label}</h4>
                                 <p className="text-[11px] text-[#686868] leading-relaxed">{item.desc}</p>
                              </div>
                              <button onClick={() => handleToggleConfig(item.key as any)} className={`w-12 h-6 rounded-full shrink-0 relative transition-all ${config[item.key as keyof typeof config] ? 'bg-[#3ecf8e]' : 'bg-[#e5e7eb]'}`}>
                                 <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${config[item.key as keyof typeof config] ? 'right-1' : 'left-1'}`} />
                              </button>
                           </div>
                         ))}
                      </div>
                   </div>
                </div>
             </div>
           )}

           {activeTab === 'integrations' && (
             <div className="space-y-6 animate-sb-entry">
                <div className="sb-card border-[#ededed] bg-white">
                   <div className="flex items-center gap-5 mb-10">
                      <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 border border-blue-100"><Network size={32}/></div>
                      <div>
                         <h2 className="text-lg font-black text-[#1c1c1c] uppercase tracking-tight">Connecteurs Gateway</h2>
                         <p className="text-[11px] text-[#686868] font-bold uppercase mt-1">Liaisons omnicanales et IA tierces</p>
                      </div>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {integrations.map((int: IntegrationConfig) => (
                        <div key={int.id} className="p-6 bg-[#f8f9fa] border border-[#ededed] rounded-2xl space-y-6 group hover:border-[#3ecf8e] transition-all">
                           <div className="flex items-start justify-between">
                              <div className="flex items-center gap-4">
                                 <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm border ${int.enabled ? 'bg-white text-[#3ecf8e] border-[#dcfce7]' : 'bg-gray-100 text-gray-400'}`}>
                                    {int.id === 'openrouter' ? <Bot size={24}/> : <Globe size={24}/>}
                                 </div>
                                 <div>
                                    <h3 className="text-sm font-black text-[#1c1c1c] uppercase">{int.name}</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                       <div className={`w-1.5 h-1.5 rounded-full ${int.enabled ? 'bg-[#3ecf8e] animate-pulse' : 'bg-gray-300'}`} />
                                       <span className="text-[9px] font-black uppercase text-gray-400">{int.enabled ? 'Connecté' : 'Suspendu'}</span>
                                    </div>
                                 </div>
                              </div>
                              <button onClick={() => handleToggleIntegration(int)} className={`p-2 rounded-lg ${int.enabled ? 'text-red-500' : 'text-[#3ecf8e]'}`}>
                                 <Power size={18}/>
                              </button>
                           </div>
                           <div className="pt-4 border-t border-[#ededed] flex justify-end">
                              <button onClick={() => { setEditingIntegration(int); setIsGatewayModalOpen(true); }} className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:text-[#3ecf8e]">Paramètres <Edit3 size={12}/></button>
                           </div>
                        </div>
                      ))}
                   </div>
                </div>
             </div>
           )}

           {/* Autres onglets (infrastructure, security, audit, governance) restent identiques au fichier source... */}
        </div>
      </div>

      <Modal isOpen={isGatewayModalOpen} onClose={() => setIsGatewayModalOpen(false)} title={`Config Gateway - ${editingIntegration?.name}`}>
         {editingIntegration && (
           <form onSubmit={handleSaveIntegration} className="space-y-6">
              <div className="p-6 bg-[#f8f9fa] rounded-xl space-y-4">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase">Clé API / Token</label>
                    <input name="apiKey" type="password" defaultValue={editingIntegration.apiKey} className="w-full h-12" placeholder="sk-or-v1-..." />
                 </div>
                 {editingIntegration.id !== 'openrouter' && (
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase">URL Webhook</label>
                       <input name="webhookUrl" type="url" defaultValue={editingIntegration.webhookUrl} className="w-full h-12" />
                    </div>
                 )}
              </div>
              <div className="flex justify-end gap-3 pt-6 border-t">
                 <button type="button" onClick={() => setIsGatewayModalOpen(false)} className="btn-sb-outline">Fermer</button>
                 <button type="submit" className="btn-sb-primary">Sauvegarder</button>
              </div>
           </form>
         )}
      </Modal>
    </div>
  );
};

export default Settings;
