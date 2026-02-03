
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Settings2, RefreshCw, Plus, Trash2, ShieldCheck, 
  Terminal, Network, Cpu, BrainCircuit, Store, 
  ChevronRight, Edit3, UserPlus, DatabaseZap, LayoutGrid,
  ShieldAlert, Radio, Bot, Smartphone, Mail, Facebook, Power,
  CloudLightning, HardDrive, Key, Fingerprint, Lock, Eye, EyeOff,
  Zap, Sparkles
} from 'lucide-react';
import { useData, useNotifications, useUser } from '../App';
import { UserRole, ShowroomConfig, UserProfile, IntegrationConfig } from '../types';
import Modal from '../components/Modal';

const Settings: React.FC = () => {
  const { 
    users, showrooms, refreshAll, isSyncing, config, 
    updateConfig, saveShowroom, deleteShowroom, syncMetrics, 
    saveUser, deleteUser, brands, addBrand, deleteBrand
  } = useData();
  const { currentUser } = useUser();
  
  const [activeTab, setActiveTab] = useState<'governance' | 'integrations' | 'ai' | 'infrastructure' | 'security'>('governance');
  
  const tabs = [
    { id: 'governance', label: 'Gouvernance', icon: <Terminal size={20} />, desc: 'Kernel Cloud' },
    { id: 'integrations', label: 'Gateway', icon: <Network size={20} />, desc: 'Connecteurs API' },
    { id: 'ai', label: 'Intelligence', icon: <BrainCircuit size={20} />, desc: 'Modèles Gemini' },
    { id: 'infrastructure', label: 'Vitalité', icon: <DatabaseZap size={20} />, desc: 'Santé Cluster' },
    { id: 'security', label: 'Identités', icon: <ShieldCheck size={20} />, desc: 'Accès IAM' },
  ];

  return (
    <div className="space-y-8 animate-m3-entry pb-20">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-normal text-[#1f1f1f]">Pilotage Système</h1>
          <p className="text-sm text-[#747775] mt-1 font-medium">Gouvernance stratégique Royal Plaza Horizon</p>
        </div>
        <button onClick={refreshAll} className="p-3 bg-[#f0f4f9] hover:bg-[#e1e3e1] rounded-full transition-colors">
          <RefreshCw size={20} className={isSyncing ? 'animate-spin' : ''} />
        </button>
      </header>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* SETTINGS RAIL M3 */}
        <div className="w-full lg:w-64 flex flex-col gap-2 shrink-0">
          {tabs.map(tab => (
            <button 
              key={tab.id} 
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-4 px-6 py-4 rounded-[20px] transition-all text-left ${
                activeTab === tab.id 
                  ? 'bg-[#d3e3fd] text-[#041e49]' 
                  : 'text-[#444746] hover:bg-[#e1e3e1]'
              }`}
            >
              <span className={activeTab === tab.id ? 'text-[#0b57d0]' : 'text-[#747775]'}>{tab.icon}</span>
              <div className="flex-1 min-w-0">
                 <p className="text-sm font-bold truncate">{tab.label}</p>
                 <p className="text-[10px] opacity-60 truncate">{tab.desc}</p>
              </div>
            </button>
          ))}
        </div>

        {/* SETTINGS CONTENT M3 */}
        <div className="flex-1 w-full animate-m3-entry">
           {activeTab === 'governance' && (
             <div className="space-y-6">
                <div className="md-card bg-white border border-[#e3e3e3]">
                   <div className="flex items-center gap-4 mb-8">
                      <div className="w-12 h-12 bg-[#f0f4f9] rounded-2xl flex items-center justify-center text-[#0b57d0]"><LayoutGrid size={24}/></div>
                      <div>
                         <h2 className="text-lg font-bold text-[#1f1f1f]">Souveraineté Cloud</h2>
                         <p className="text-xs text-[#747775]">Kernel Horizon v2.8 certifié LBV-1</p>
                      </div>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-[#747775] uppercase tracking-widest ml-1">Alias de l'Instance</label>
                        <input type="text" className="w-full h-12 font-bold" defaultValue="Royal Plaza HQ" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-[#747775] uppercase tracking-widest ml-1">Résidence Données</label>
                        <div className="h-12 bg-[#f0f4f9] rounded-lg px-4 flex items-center text-sm font-bold text-[#0b57d0]">Gabon Central (LBV-S1)</div>
                      </div>
                   </div>
                </div>

                <div className="md-card bg-[#fdf8f8] border border-[#f9dedc] flex items-center justify-between">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-[#b3261e] shadow-sm"><ShieldAlert size={24}/></div>
                      <div>
                         <h2 className="text-sm font-bold text-[#1f1f1f] uppercase tracking-widest">Maintenance Root</h2>
                         <p className="text-xs text-[#b3261e]">Verrouillage complet des écritures Cloud</p>
                      </div>
                   </div>
                   <button onClick={() => updateConfig({ maintenanceMode: !config.maintenanceMode })} className={`w-14 h-8 rounded-full relative transition-all ${config.maintenanceMode ? 'bg-[#b3261e]' : 'bg-[#e1e3e1]'}`}>
                      <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all shadow-sm ${config.maintenanceMode ? 'right-1' : 'left-1'}`} />
                   </button>
                </div>
             </div>
           )}

           {activeTab === 'ai' && (
             <div className="space-y-6">
                <div className="md-card bg-white border border-[#e3e3e3] p-10">
                   <div className="flex items-center justify-between mb-10">
                      <div className="flex items-center gap-5">
                         <div className="w-14 h-14 bg-[#f8f0ff] rounded-3xl flex items-center justify-center text-purple-700 shadow-sm"><BrainCircuit size={32}/></div>
                         <div><h2 className="text-xl font-bold text-[#1f1f1f]">Gemini Intelligence</h2><p className="text-xs text-[#747775]">Modèles d'inférence stratégique</p></div>
                      </div>
                      <button onClick={() => updateConfig({ aiEnabled: !config.aiEnabled })} className={`w-14 h-8 rounded-full relative transition-all ${config.aiEnabled ? 'bg-purple-600' : 'bg-[#e1e3e1]'}`}>
                        <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all shadow-sm ${config.aiEnabled ? 'right-1' : 'left-1'}`} />
                      </button>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {[
                        { id: 'flash', label: 'Horizon Flash', desc: 'Inférence instantanée', icon: <Zap className="text-green-600"/> },
                        { id: 'pro', label: 'Horizon Pro', desc: 'Raisonnement expert', icon: <Sparkles className="text-purple-600"/> }
                      ].map(m => (
                        <button key={m.id} onClick={() => updateConfig({ aiModel: m.id as any })} className={`p-6 border-2 text-left flex gap-5 rounded-[24px] transition-all ${config.aiModel === m.id ? 'border-purple-600 bg-purple-50' : 'border-[#f0f4f9] bg-[#f8f9fa] hover:border-purple-200'}`}>
                           <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">{m.icon}</div>
                           <div>
                              <p className="text-sm font-bold text-[#1f1f1f]">{m.label}</p>
                              <p className="text-[10px] text-[#747775] font-medium">{m.desc}</p>
                           </div>
                        </button>
                      ))}
                   </div>
                </div>
             </div>
           )}

           {activeTab === 'infrastructure' && (
              <div className="md-card bg-white border border-[#e3e3e3] space-y-10">
                 <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-[#e6f4ea] rounded-3xl flex items-center justify-center text-[#137333]"><DatabaseZap size={32}/></div>
                    <div><h2 className="text-lg font-bold">Santé Infrastructure</h2><p className="text-xs text-[#747775]">Monitoring temps réel du cluster GAB-LBV</p></div>
                 </div>
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {[
                       { label: 'Ping', value: '42ms', color: 'text-[#0b57d0]' },
                       { label: 'Uptime', value: '99.9%', color: 'text-[#137333]' },
                       { label: 'Storage', value: '124MB', color: 'text-purple-600' },
                       { label: 'Sync', value: 'Live', color: 'text-amber-600' }
                    ].map((s, i) => (
                       <div key={i} className="p-5 bg-[#f0f4f9] rounded-2xl">
                          <p className="text-[10px] font-black text-[#747775] uppercase">{s.label}</p>
                          <p className={`text-xl font-bold mt-1 ${s.color}`}>{s.value}</p>
                       </div>
                    ))}
                 </div>
              </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
