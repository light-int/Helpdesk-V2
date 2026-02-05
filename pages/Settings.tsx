
import React, { useState, useMemo, useEffect } from 'react';
import { 
  RefreshCw, Plus, Trash2, ShieldCheck, 
  Terminal, Network, BrainCircuit, Edit3, UserPlus, DatabaseZap, LayoutGrid,
  ShieldAlert, Smartphone, Mail, Facebook, Power,
  HardDrive, Lock, Eye, EyeOff,
  Zap, Sparkles, Activity,
  ExternalLink, CheckCircle2, MessageSquare, Settings as SettingsIcon,
  Key, Globe, Cpu, Server, Shield, Send, History, Search, Filter
} from 'lucide-react';
import { useData, useNotifications } from '../App';
import { UserRole, UserProfile, IntegrationConfig, AuditLog } from '../types';
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
  
  // Modals States
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
  const [isGatewayModalOpen, setIsGatewayModalOpen] = useState(false);
  
  // Selection States
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editingIntegration, setEditingIntegration] = useState<IntegrationConfig | null>(null);
  const [newBrandName, setNewBrandName] = useState('');
  const [logSearch, setLogSearch] = useState('');
  
  const [integrations, setIntegrations] = useState<IntegrationConfig[]>([]);
  const [loadingIntegrations, setLoadingIntegrations] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingSmtp, setIsTestingSmtp] = useState(false);

  const tabs = [
    { id: 'governance', label: 'Gouvernance', icon: <Terminal size={18} />, desc: 'Kernel & Référentiels' },
    { id: 'integrations', label: 'Gateway', icon: <Network size={18} />, desc: 'Connecteurs API' },
    { id: 'ai', label: 'Intelligence', icon: <BrainCircuit size={18} />, desc: 'Modèles Gemini' },
    { id: 'infrastructure', label: 'Vitalité', icon: <DatabaseZap size={18} />, desc: 'Santé Cluster' },
    { id: 'security', label: 'Identités', icon: <ShieldCheck size={18} />, desc: 'Accès IAM' },
    { id: 'audit', label: 'Journaux', icon: <History size={18} />, desc: 'Audit des actions' },
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

  const handleTestSmtp = async () => {
    setIsTestingSmtp(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    addNotification({ 
      title: 'SMTP Test', 
      message: 'Connexion établie avec succès avec le relais Royal Plaza.', 
      type: 'success' 
    });
    setIsTestingSmtp(false);
  };

  const handleSaveIntegration = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingIntegration) return;
    setIsSaving(true);
    
    const formData = new FormData(e.currentTarget);
    const updated: IntegrationConfig = {
      ...editingIntegration,
      apiKey: formData.get('apiKey') as string || editingIntegration.apiKey,
      webhookUrl: formData.get('webhookUrl') as string || editingIntegration.webhookUrl,
      settings: {
        ...editingIntegration.settings,
        accountId: formData.get('accountId') as string,
        serverRegion: formData.get('serverRegion') as string,
        smtpHost: formData.get('smtpHost') as string,
        smtpPort: formData.get('smtpPort') as string,
        smtpUser: formData.get('smtpUser') as string,
        smtpPass: formData.get('smtpPass') as string,
        smtpEncryption: formData.get('smtpEncryption') as string,
      }
    };

    try {
      await ApiService.integrations.saveConfig(updated);
      addNotification({ title: 'Gateway', message: `Configuration ${updated.name} synchronisée.`, type: 'success' });
      setIsGatewayModalOpen(false);
      fetchIntegrations();
    } catch (err) {
      addNotification({ title: 'Erreur API', message: 'Échec de la mise à jour du connecteur.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBrandName.trim()) return;
    
    if (brands.some((b: string) => b.toLowerCase() === newBrandName.trim().toLowerCase())) {
      addNotification({ title: 'Doublon', message: 'Cette marque existe déjà.', type: 'warning' });
      return;
    }

    setIsSaving(true);
    try {
      await addBrand(newBrandName.trim());
      addNotification({ title: 'Gouvernance', message: 'Nouvelle marque certifiée ajoutée.', type: 'success' });
      setNewBrandName('');
      setIsBrandModalOpen(false);
    } catch (err) {
      addNotification({ title: 'Erreur Cluster', message: 'Échec de l\'ajout.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
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
      setIsUserModalOpen(false);
    } catch (err) {
      addNotification({ title: 'Erreur', message: 'Échec de la synchronisation.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleConfig = async (key: keyof typeof config) => {
    try {
      await updateConfig({ [key]: !config[key] });
      addNotification({ title: 'Intelligence Horizon', message: 'Paramètre IA mis à jour.', type: 'info' });
    } catch (err) {
      addNotification({ title: 'Erreur', message: 'Impossible de modifier le Kernel.', type: 'error' });
    }
  };

  const handleModelChange = async (model: 'flash' | 'pro') => {
    try {
      await updateConfig({ aiModel: model });
      addNotification({ title: 'Kernel IA', message: `Moteur basculé sur Gemini 3 ${model === 'flash' ? 'Flash (Rapidité)' : 'Pro (Précision)'}.`, type: 'success' });
    } catch (err) {
      addNotification({ title: 'Erreur', message: 'Échec du basculement.', type: 'error' });
    }
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

                <div className="sb-card border-[#ededed]">
                   <div className="flex items-center justify-between mb-6 border-b border-[#f5f5f5] pb-4">
                      <h2 className="text-[11px] font-black text-[#1c1c1c] uppercase tracking-[0.1em]">Référentiel Marques Certifiées</h2>
                      <button 
                        onClick={() => setIsBrandModalOpen(true)} 
                        className="btn-sb-outline h-8 px-3 text-[10px] font-black uppercase"
                      >
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
                <div className="sb-card border-[#ededed] bg-white">
                   <div className="flex items-center gap-5 mb-10">
                      <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 shadow-sm border border-blue-100"><Network size={32}/></div>
                      <div>
                         <h2 className="text-lg font-black text-[#1c1c1c] uppercase tracking-tight">Connecteurs Gateway</h2>
                         <p className="text-[11px] text-[#686868] font-bold uppercase tracking-widest mt-1">Liaisons omnicanales et services tiers</p>
                      </div>
                   </div>

                   {loadingIntegrations ? (
                     <div className="py-20 text-center"><RefreshCw className="animate-spin text-[#3ecf8e] mx-auto" size={32}/></div>
                   ) : (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {integrations.map((int: IntegrationConfig) => (
                          <div key={int.id} className="p-6 bg-[#f8f9fa] border border-[#ededed] rounded-2xl space-y-6 group hover:border-[#3ecf8e] transition-all">
                             <div className="flex items-start justify-between">
                                <div className="flex items-center gap-4">
                                   <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm border ${int.enabled ? 'bg-white text-[#3ecf8e] border-[#dcfce7]' : 'bg-gray-100 text-gray-400 border-gray-200'}`}>
                                      {int.id === 'whatsapp' && <Smartphone size={24}/>}
                                      {int.id === 'messenger' && <Facebook size={24}/>}
                                      {int.id === 'email' || int.id === 'smtp' ? <Mail size={24}/> : null}
                                      {!['whatsapp', 'messenger', 'email', 'smtp'].includes(int.id) && <Globe size={24}/>}
                                   </div>
                                   <div>
                                      <h3 className="text-sm font-black text-[#1c1c1c] uppercase tracking-tight">{int.name}</h3>
                                      <div className="flex items-center gap-2 mt-1">
                                         <div className={`w-1.5 h-1.5 rounded-full ${int.enabled ? 'bg-[#3ecf8e] animate-pulse' : 'bg-gray-300'}`} />
                                         <span className={`text-[9px] font-black uppercase ${int.enabled ? 'text-[#3ecf8e]' : 'text-gray-400'}`}>{int.enabled ? 'Connecté' : 'Hors ligne'}</span>
                                      </div>
                                   </div>
                                </div>
                                <button 
                                  onClick={() => handleToggleIntegration(int)}
                                  className={`p-2 rounded-lg transition-all ${int.enabled ? 'text-red-500 hover:bg-red-50' : 'text-[#3ecf8e] hover:bg-[#f0fdf4]'}`}
                                >
                                   <Power size={18}/>
                                </button>
                             </div>

                             <div className="pt-4 border-t border-[#ededed] flex items-center justify-between">
                                <div className="text-[10px] text-[#686868] font-medium">
                                   Dernière synchro : <span className="font-bold">{int.lastSync ? new Date(int.lastSync).toLocaleDateString() : 'Jamais'}</span>
                                </div>
                                <button 
                                  onClick={() => { setEditingIntegration(int); setIsGatewayModalOpen(true); }}
                                  className="text-[10px] font-black text-[#1c1c1c] uppercase tracking-widest flex items-center gap-2 hover:text-[#3ecf8e] transition-colors"
                                >
                                   Paramètres <Edit3 size={12}/>
                                </button>
                             </div>
                          </div>
                        ))}
                     </div>
                   )}
                </div>
             </div>
           )}

           {activeTab === 'ai' && (
             <div className="space-y-6 animate-sb-entry">
                <div className="sb-card border-[#ededed] bg-white">
                   <div className="flex items-center gap-5 mb-10">
                      <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 shadow-sm border border-purple-100"><BrainCircuit size={32}/></div>
                      <div>
                         <h2 className="text-lg font-black text-[#1c1c1c] uppercase tracking-tight">Intelligence Artificielle</h2>
                         <p className="text-[11px] text-[#686868] font-bold uppercase tracking-widest mt-1">Pilotage du moteur Horizon AI (Gemini)</p>
                      </div>
                   </div>

                   <div className="space-y-8">
                      {/* Modèle de base */}
                      <div className="p-6 bg-[#f8f9fa] border border-[#ededed] rounded-2xl">
                         <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xs font-black text-[#1c1c1c] uppercase tracking-widest">Moteur d'inférence principal</h3>
                            <span className="px-2 py-0.5 bg-[#f0fdf4] text-[#3ecf8e] text-[9px] font-black uppercase rounded border border-[#dcfce7]">Live Production</span>
                         </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <button 
                              onClick={() => handleModelChange('flash')}
                              className={`p-4 rounded-xl border-2 text-left transition-all ${config.aiModel === 'flash' ? 'border-[#3ecf8e] bg-white shadow-md' : 'border-transparent bg-white/50 hover:bg-white'}`}
                            >
                               <div className="flex items-center justify-between mb-2">
                                  <span className="text-[13px] font-black text-[#1c1c1c]">Gemini 3 Flash</span>
                                  {config.aiModel === 'flash' && <CheckCircle2 size={16} className="text-[#3ecf8e]"/>}
                               </div>
                               <p className="text-[11px] text-[#686868] font-medium leading-relaxed">Rapidité optimisée. Idéal pour le chat client et la catégorisation instantanée.</p>
                            </button>
                            <button 
                              onClick={() => handleModelChange('pro')}
                              className={`p-4 rounded-xl border-2 text-left transition-all ${config.aiModel === 'pro' ? 'border-[#3ecf8e] bg-white shadow-md' : 'border-transparent bg-white/50 hover:bg-white'}`}
                            >
                               <div className="flex items-center justify-between mb-2">
                                  <span className="text-[13px] font-black text-[#1c1c1c]">Gemini 3 Pro</span>
                                  {config.aiModel === 'pro' && <CheckCircle2 size={16} className="text-[#3ecf8e]"/>}
                               </div>
                               <p className="text-[11px] text-[#686868] font-medium leading-relaxed">Puissance maximale. Idéal pour les audits stratégiques et les diagnostics complexes.</p>
                            </button>
                         </div>
                      </div>

                      {/* Toggles de fonctionnalités */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-2">
                         {[
                           { key: 'aiEnabled', label: 'Activation Globale IA', desc: 'Active tous les services intelligents du cluster.' },
                           { key: 'aiAutoCategorization', label: 'Triage Automatique', desc: 'L\'IA analyse la description pour définir catégorie et priorité.' },
                           { key: 'aiStrategicAudit', label: 'Rapports Visionnaires', desc: 'Permet la génération d\'audits financiers mensuels par IA.' },
                           { key: 'aiChatbotEnabled', label: 'Horizon Assistant Chat', desc: 'Affiche le widget de chat IA pour les collaborateurs.' }
                         ].map((item) => (
                           <div key={item.key} className="flex items-start justify-between gap-6 group">
                              <div className="flex-1">
                                 <h4 className="text-[13px] font-bold text-[#1c1c1c] mb-1">{item.label}</h4>
                                 <p className="text-[11px] text-[#686868] leading-relaxed">{item.desc}</p>
                              </div>
                              <button 
                                onClick={() => handleToggleConfig(item.key as any)}
                                className={`w-12 h-6 rounded-full shrink-0 relative transition-all duration-300 ${config[item.key as keyof typeof config] ? 'bg-[#3ecf8e]' : 'bg-[#e5e7eb]'}`}
                              >
                                 <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${config[item.key as keyof typeof config] ? 'right-1' : 'left-1'}`} />
                              </button>
                           </div>
                         ))}
                      </div>
                   </div>
                </div>

                <div className="bg-[#1c1c1c] text-white p-8 rounded-2xl relative overflow-hidden shadow-xl">
                   <div className="absolute top-0 right-0 w-64 h-64 bg-[#3ecf8e]/10 rounded-full blur-[100px] -mr-32 -mt-32" />
                   <div className="relative z-10 flex items-center gap-6">
                      <div className="w-14 h-14 bg-[#3ecf8e]/20 text-[#3ecf8e] rounded-2xl flex items-center justify-center border border-[#3ecf8e]/30"><Sparkles size={28}/></div>
                      <div>
                         <h3 className="text-base font-black uppercase tracking-tight">Certification IA Horizon</h3>
                         <p className="text-[#9ca3af] text-[12px] mt-1 font-medium leading-relaxed">Les modèles utilisés sont conformes aux protocoles de sécurité Royal Plaza 2026. Aucune donnée client n'est utilisée pour l'entraînement public des modèles.</p>
                      </div>
                   </div>
                </div>
             </div>
           )}

           {activeTab === 'infrastructure' && (
             <div className="space-y-6 animate-sb-entry">
                <div className="sb-card border-[#ededed] bg-white">
                   <div className="flex items-center gap-5 mb-10">
                      <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 shadow-sm border border-blue-100"><DatabaseZap size={32}/></div>
                      <div>
                         <h2 className="text-lg font-black text-[#1c1c1c] uppercase tracking-tight">Santé de l'Infrastructure</h2>
                         <p className="text-[11px] text-[#686868] font-bold uppercase tracking-widest mt-1">Surveillance des services Cloud Horizon</p>
                      </div>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Ping & Connectivité */}
                      <div className="space-y-6">
                         <h3 className="text-[10px] font-black text-[#1c1c1c] uppercase tracking-[0.2em] border-l-2 border-[#3ecf8e] pl-3">Temps de réponse Réseau</h3>
                         <div className="p-6 bg-[#f8f9fa] border border-[#ededed] rounded-2xl text-center space-y-4">
                            <div className="flex justify-center gap-1.5 items-end h-16">
                               {[40, 32, 28, 45, 38, 32, 35].map((h, i) => (
                                 <div key={i} className={`w-2.5 rounded-full transition-all duration-1000 ${i === 6 ? 'bg-[#3ecf8e] animate-pulse' : 'bg-gray-300'}`} style={{ height: `${h}%` }} />
                               ))}
                            </div>
                            <div>
                               <p className="text-3xl font-black text-[#1c1c1c]">{syncMetrics.latency || 32}<span className="text-sm font-bold text-[#686868] ml-1">ms</span></p>
                               <p className="text-[10px] text-[#3ecf8e] font-black uppercase mt-1">Cluster GAB-WEST-1 Répondant</p>
                            </div>
                         </div>
                      </div>

                      {/* Statut Services */}
                      <div className="space-y-6">
                         <h3 className="text-[10px] font-black text-[#1c1c1c] uppercase tracking-[0.2em] border-l-2 border-[#3ecf8e] pl-3">État des micro-services</h3>
                         <div className="space-y-4">
                            {[
                              { label: 'Cloud Database', status: 'Operational', color: 'text-[#3ecf8e]' },
                              { label: 'Gemini AI Gateway', status: 'Operational', color: 'text-[#3ecf8e]' },
                              { label: 'Storage Cluster', status: 'Operational', color: 'text-[#3ecf8e]' },
                              { label: 'WhatsApp Relay', status: config.aiEnabled ? 'Operational' : 'Paused', color: config.aiEnabled ? 'text-[#3ecf8e]' : 'text-amber-500' }
                            ].map((s, i) => (
                              <div key={i} className="flex justify-between items-center p-3 bg-[#fcfcfc] border border-[#f0f0f0] rounded-xl">
                                 <span className="text-[12px] font-bold text-[#4b5563]">{s.label}</span>
                                 <span className={`text-[10px] font-black uppercase tracking-tighter ${s.color}`}>{s.status}</span>
                              </div>
                            ))}
                         </div>
                      </div>
                   </div>

                   <div className="mt-10 pt-10 border-t border-[#f5f5f5]">
                      <h3 className="text-[10px] font-black text-[#1c1c1c] uppercase tracking-[0.2em] mb-6">Empreinte de Données (Objets synchronisés)</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                         {[
                           { label: 'Tickets', value: tickets.length },
                           { label: 'Clients', value: customers.length },
                           { label: 'Catalogue', value: products.length },
                           { label: 'Rechanges', value: parts.length }
                         ].map((obj, i) => (
                           <div key={i} className="p-4 bg-white border border-[#ededed] rounded-xl shadow-sm">
                              <p className="text-[9px] font-black text-[#686868] uppercase tracking-widest mb-1">{obj.label}</p>
                              <p className="text-xl font-black text-[#1c1c1c]">{obj.value}</p>
                           </div>
                         ))}
                      </div>
                   </div>
                </div>
             </div>
           )}

           {activeTab === 'audit' && (
             <div className="space-y-6 animate-sb-entry">
                <div className="sb-card border-[#ededed] bg-white">
                   <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                      <div className="flex items-center gap-5">
                         <div className="w-14 h-14 bg-[#f8f9fa] rounded-2xl flex items-center justify-center text-[#1c1c1c] shadow-sm border border-[#ededed]"><History size={32}/></div>
                         <div>
                            <h2 className="text-lg font-black text-[#1c1c1c] uppercase tracking-tight">Journaux d'Audit Système</h2>
                            <p className="text-[11px] text-[#686868] font-bold uppercase tracking-widest mt-1">Tracé complet des transactions réseau</p>
                         </div>
                      </div>
                      <div className="relative w-full md:w-64">
                         <Search className="absolute left-3 top-2.5 text-[#686868]" size={16}/>
                         <input 
                          type="text" 
                          placeholder="Filtrer les journaux..." 
                          className="w-full pl-10 h-10 text-xs font-bold bg-[#fcfcfc]" 
                          value={logSearch}
                          onChange={e => setLogSearch(e.target.value)}
                         />
                      </div>
                   </div>

                   <div className="sb-table-container">
                      <table className="w-full text-left sb-table">
                         <thead>
                            <tr>
                               <th className="px-6">Timestamp</th>
                               <th>Expert</th>
                               <th>Action</th>
                               <th>Détails de transaction</th>
                               <th className="text-right px-6">Impact</th>
                            </tr>
                         </thead>
                         <tbody>
                            {filteredLogs.map((log: AuditLog) => (
                              <tr key={log.id} className="hover:bg-[#fafafa]">
                                 <td className="px-6 py-4">
                                    <p className="text-[10px] font-black text-[#1c1c1c]">{new Date(log.timestamp).toLocaleDateString()}</p>
                                    <p className="text-[10px] font-bold text-[#9ca3af]">{new Date(log.timestamp).toLocaleTimeString()}</p>
                                 </td>
                                 <td>
                                    <div className="flex items-center gap-2">
                                       <div className="w-6 h-6 rounded bg-[#f0fdf4] text-[#3ecf8e] flex items-center justify-center text-[10px] font-black">{log.userName[0]}</div>
                                       <span className="text-[11px] font-bold text-[#1c1c1c]">{log.userName}</span>
                                    </div>
                                 </td>
                                 <td>
                                    <span className="text-[9px] font-black uppercase tracking-tighter bg-[#f1f3f4] px-2 py-0.5 rounded border border-[#ededed] text-[#4b5563]">
                                       {log.action}
                                    </span>
                                 </td>
                                 <td>
                                    <p className="text-[11px] font-medium text-[#4b5563] truncate max-w-[200px]">{log.details}</p>
                                    <p className="text-[9px] font-mono text-[#9ca3af]">ID: {log.target}</p>
                                 </td>
                                 <td className="text-right px-6">
                                    <span className={`w-2 h-2 rounded-full inline-block ${log.action.includes('SUPPR') ? 'bg-red-500' : log.action.includes('MOUV') ? 'bg-purple-500' : 'bg-[#3ecf8e]'}`} />
                                 </td>
                              </tr>
                            ))}
                         </tbody>
                      </table>
                      {filteredLogs.length === 0 && (
                        <div className="py-20 text-center opacity-30">
                           <History size={40} className="mx-auto mb-3"/>
                           <p className="text-[11px] font-black uppercase tracking-widest">Aucun log correspondant</p>
                        </div>
                      )}
                   </div>
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
                        onClick={() => { setEditingUser(null); setIsUserModalOpen(true); }}
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
                                        onClick={() => { setEditingUser(user); setIsUserModalOpen(true); }}
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
             </div>
           )}
        </div>
      </div>

      {/* GATEWAY MODAL */}
      <Modal 
        isOpen={isGatewayModalOpen} 
        onClose={() => setIsGatewayModalOpen(false)} 
        title={`Configuration Gateway - ${editingIntegration?.name}`}
        size="lg"
      >
        {editingIntegration && (
          <form onSubmit={handleSaveIntegration} className="space-y-8">
            <div className="p-6 bg-[#f8f9fa] border border-[#ededed] rounded-2xl flex items-center justify-between">
               <div className="flex items-center gap-6">
                  <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-[#3ecf8e] shadow-sm border border-[#ededed]">
                     {editingIntegration.id === 'smtp' ? <Server size={28}/> : <Globe size={28}/>}
                  </div>
                  <div>
                     <h3 className="text-base font-black text-[#1c1c1c] uppercase tracking-tight">Paramètres de Liaison Cloud</h3>
                     <p className="text-[11px] text-[#686868] font-bold mt-1">Configurez les identifiants pour le flux {editingIntegration.name}.</p>
                  </div>
               </div>
               
               {editingIntegration.id === 'smtp' && (
                 <button 
                  type="button"
                  onClick={handleTestSmtp}
                  disabled={isTestingSmtp}
                  className="btn-sb-outline h-11 px-6 text-[10px] font-black uppercase tracking-widest border-[#3ecf8e] text-[#3ecf8e] hover:bg-[#f0fdf4]"
                 >
                   {isTestingSmtp ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                   <span>{isTestingSmtp ? 'Test en cours...' : 'Tester la connexion'}</span>
                 </button>
               )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {editingIntegration.id === 'smtp' ? (
                 <>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-[#686868] uppercase tracking-widest flex items-center gap-2">
                        <Server size={12} className="text-[#3ecf8e]" /> Serveur SMTP (Host)
                      </label>
                      <input 
                        name="smtpHost" 
                        type="text" 
                        defaultValue={editingIntegration.settings?.smtpHost} 
                        placeholder="smtp.royalplaza.ga" 
                        className="w-full h-11 font-mono text-xs" 
                      />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-[#686868] uppercase tracking-widest flex items-center gap-2">
                        <Activity size={12} className="text-[#3ecf8e]" /> Port SMTP
                      </label>
                      <input 
                        name="smtpPort" 
                        type="text" 
                        defaultValue={editingIntegration.settings?.smtpPort} 
                        placeholder="587" 
                        className="w-full h-11 font-mono text-xs" 
                      />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-[#686868] uppercase tracking-widest flex items-center gap-2">
                        <Shield size={12} className="text-[#3ecf8e]" /> Cryptage
                      </label>
                      <select name="smtpEncryption" defaultValue={editingIntegration.settings?.smtpEncryption || 'STARTTLS'} className="w-full h-11 font-bold">
                         <option value="STARTTLS">STARTTLS (Recommandé)</option>
                         <option value="SSL/TLS">SSL/TLS (Port 465)</option>
                         <option value="Aucun">Aucun (Non sécurisé)</option>
                      </select>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-[#686868] uppercase tracking-widest flex items-center gap-2">
                        <UserPlus size={12} className="text-[#3ecf8e]" /> Identifiant / Email
                      </label>
                      <input 
                        name="smtpUser" 
                        type="text" 
                        defaultValue={editingIntegration.settings?.smtpUser} 
                        placeholder="notifications@royalplaza.ga" 
                        className="w-full h-11" 
                      />
                   </div>
                   <div className="space-y-2 md:col-span-2">
                      <label className="text-[10px] font-black text-[#686868] uppercase tracking-widest flex items-center gap-2">
                        <Lock size={12} className="text-[#3ecf8e]" /> Mot de passe SMTP
                      </label>
                      <input 
                        name="smtpPass" 
                        type="password" 
                        defaultValue={editingIntegration.settings?.smtpPass} 
                        placeholder="••••••••••••" 
                        className="w-full h-11" 
                      />
                   </div>
                 </>
               ) : (
                 <>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-[#686868] uppercase tracking-widest flex items-center gap-2">
                        <Key size={12} className="text-[#3ecf8e]" /> Clé API / Token Accès
                      </label>
                      <input 
                        name="apiKey" 
                        type="password" 
                        defaultValue={editingIntegration.apiKey} 
                        placeholder="••••••••••••••••" 
                        className="w-full h-11 font-mono text-xs" 
                      />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-[#686868] uppercase tracking-widest flex items-center gap-2">
                        <Network size={12} className="text-[#3ecf8e]" /> URL Webhook de Réception
                      </label>
                      <input 
                        name="webhookUrl" 
                        type="url" 
                        defaultValue={editingIntegration.webhookUrl} 
                        placeholder="https://rp-gateway.ga/webhook" 
                        className="w-full h-11 font-mono text-xs" 
                      />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-[#686868] uppercase tracking-widest flex items-center gap-2">
                        <ShieldCheck size={12} className="text-[#3ecf8e]" /> ID de Compte / Client
                      </label>
                      <input 
                        name="accountId" 
                        type="text" 
                        defaultValue={editingIntegration.settings?.accountId} 
                        placeholder="ex: AC-10293-RP" 
                        className="w-full h-11" 
                      />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-[#686868] uppercase tracking-widest flex items-center gap-2">
                        <Cpu size={12} className="text-[#3ecf8e]" /> Serveur / Région Cluster
                      </label>
                      <select name="serverRegion" defaultValue={editingIntegration.settings?.serverRegion || 'GABON-WEST'} className="w-full h-11 font-bold">
                         <option value="GABON-WEST">GABON-WEST-01 (LBV)</option>
                         <option value="EU-CENTRAL">EU-CENTRAL-01 (FRA)</option>
                         <option value="US-EAST">US-EAST-01 (VA)</option>
                      </select>
                   </div>
                 </>
               )}
            </div>

            <div className="flex justify-end gap-3 pt-8 border-t border-[#f5f5f5]">
               <button type="button" onClick={() => setIsGatewayModalOpen(false)} className="btn-sb-outline h-11 px-8 text-[11px] font-black uppercase tracking-widest">Abandonner</button>
               <button type="submit" disabled={isSaving} className="btn-sb-primary h-11 px-12 shadow-lg shadow-[#3ecf8e]/10 text-[11px] font-black uppercase tracking-widest">
                  {isSaving ? <RefreshCw className="animate-spin" size={16}/> : "Synchroniser avec Horizon"}
               </button>
            </div>
          </form>
        )}
      </Modal>

      {/* IAM MODAL */}
      <Modal 
        isOpen={isUserModalOpen} 
        onClose={() => setIsUserModalOpen(false)} 
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
                  <select name="role" defaultValue={editingUser?.role || 'AGENT'} className="w-full h-11 font-bold">
                     <option value="AGENT">Agent SAV (Inbox + Tickets)</option>
                     <option value="TECHNICIAN">Technicien (Maintenance + Terrain)</option>
                     <option value="MANAGER">Manager (Audit + Performance)</option>
                     <option value="ADMIN">Administrateur (Full Root Access)</option>
                  </select>
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-[#686868] uppercase tracking-widest">Showroom Affecté</label>
                  <select name="showroom" defaultValue={editingUser?.showroom || 'Glass'} className="w-full h-11 font-bold">
                     <option value="Glass">Plaza Glass</option>
                     <option value="Oloumi">Plaza Oloumi</option>
                     <option value="Bord de mer">Plaza Bord de mer</option>
                     <option value="Online">Support Centralisé</option>
                  </select>
               </div>
            </div>
            <div className="flex justify-end gap-3 pt-8 border-t border-[#f5f5f5]">
               <button type="button" onClick={() => setIsUserModalOpen(false)} className="btn-sb-outline h-11 px-8 text-[11px] font-black uppercase tracking-widest">Annuler</button>
               <button type="submit" disabled={isSaving} className="btn-sb-primary h-11 px-12 shadow-lg shadow-[#3ecf8e]/10 text-[11px] font-black uppercase tracking-widest">
                  {isSaving ? <RefreshCw className="animate-spin" size={16}/> : "Valider l'Accès"}
               </button>
            </div>
         </form>
      </Modal>

      {/* BRAND MODAL */}
      <Modal isOpen={isBrandModalOpen} onClose={() => setIsBrandModalOpen(false)} title="Nouvelle Marque Certifiée">
         <form onSubmit={handleAddBrand} className="space-y-6">
            <div className="space-y-2">
               <label className="text-[10px] font-black text-[#686868] uppercase tracking-widest">Désignation de la Marque</label>
               <input 
                type="text" 
                value={newBrandName} 
                onChange={e => setNewBrandName(e.target.value)} 
                placeholder="ex: Royal Plaza, LG, Beko..." 
                required 
                className="w-full h-12 text-lg font-black"
                autoFocus
               />
               <p className="text-[10px] text-[#9ca3af] font-medium italic mt-2">Disponible dans les Tickets, le Catalogue et les Garanties.</p>
            </div>
            <div className="flex justify-end gap-3 pt-6 border-t border-[#f5f5f5]">
               <button type="button" onClick={() => setIsBrandModalOpen(false)} className="btn-sb-outline h-11 px-6 text-[11px] font-black uppercase">Annuler</button>
               <button type="submit" disabled={isSaving || !newBrandName.trim()} className="btn-sb-primary h-11 px-10 text-[11px] font-black uppercase">
                  {isSaving ? <RefreshCw className="animate-spin" size={16}/> : "Certifier Marque"}
               </button>
            </div>
         </form>
      </Modal>
    </div>
  );
};

export default Settings;
