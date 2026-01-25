
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Settings2, Shield, Database, RefreshCw, Plus, X, Trash2, 
  Key, Lock, UserCog, Search,
  CheckCircle2, AlertCircle, Clock, Smartphone, Users,
  History, Activity, Monitor, Globe, BrainCircuit, Sparkles,
  Zap, Save, MapPin, Phone, Store, ChevronRight, Edit3,
  Wifi, Server, CloudLightning, Info, ShieldCheck, Eye, EyeOff,
  UserPlus, UserMinus, ShieldAlert, Loader2, Fingerprint, LogIn,
  Wrench, CheckSquare, Square
} from 'lucide-react';
import { useData, useNotifications, useUser } from '../App';
import { UserRole, SystemConfig, ShowroomConfig, Showroom, UserProfile, TicketCategory, Technician } from '../types';
import { ApiService } from '../services/apiService';
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
  const [activeTab, setActiveTab] = useState<'general' | 'auth' | 'database' | 'ai'>('general');
  const [userSearch, setUserSearch] = useState('');
  
  // États des Modals
  const [isShowroomModalOpen, setIsShowroomModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isDeleteUserModalOpen, setIsDeleteUserModalOpen] = useState(false);
  
  // États d'édition et détails
  const [editingShowroom, setEditingShowroom] = useState<ShowroomConfig | null>(null);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [selectedUserForDetails, setSelectedUserForDetails] = useState<UserProfile | null>(null);
  const [connectionLogs, setConnectionLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [isSavingUser, setIsSavingUser] = useState(false);

  // States pour la partie Technicien dynamique
  const [selectedRole, setSelectedRole] = useState<UserRole>('AGENT');
  const [selectedSpecialties, setSelectedSpecialties] = useState<TicketCategory[]>([]);
  const [techPhone, setTechPhone] = useState('');

  // Configuration des onglets par rôle
  const tabs = useMemo(() => {
    const baseTabs = [
      { id: 'general', label: 'Général', icon: <Settings2 size={18} /> },
      { id: 'ai', label: 'Intelligence Artificielle', icon: <BrainCircuit size={18} /> },
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

  const filteredUsers = useMemo(() => {
    return (users || []).filter(u => 
      u.name.toLowerCase().includes(userSearch.toLowerCase()) || 
      u.email?.toLowerCase().includes(userSearch.toLowerCase())
    );
  }, [users, userSearch]);

  const fetchLogs = async (userId: string) => {
    setIsLoadingLogs(true);
    try {
      const logs = await ApiService.users.getConnectionLogs(userId);
      setConnectionLogs(logs);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (selectedUserForDetails) {
      fetchLogs(selectedUserForDetails.id);
    } else {
      setConnectionLogs([]);
    }
  }, [selectedUserForDetails]);

  const getRoleColor = (role: UserRole) => {
    switch(role) {
      case 'ADMIN': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'MANAGER': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'TECHNICIAN': return 'bg-orange-100 text-orange-700 border-orange-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
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
    
    // Si c'est un technicien, on pré-remplit les champs
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
    if (selectedUserForDetails?.id === userToDelete.id) setSelectedUserForDetails(null);
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
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
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
        <div className="w-full lg:w-64 space-y-1">
          {tabs.map(tab => (
            <button 
              key={tab.id} 
              onClick={() => setActiveTab(tab.id as any)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-r-full transition-colors text-sm font-medium ${
                activeTab === tab.id 
                  ? 'bg-[#e8f0fe] text-[#1a73e8]' 
                  : 'text-[#3c4043] hover:bg-[#f1f3f4]'
              }`}
            >
              <span className={activeTab === tab.id ? 'text-[#1a73e8]' : 'text-[#5f6368]'}>
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
                      <label className="text-xs font-medium text-[#5f6368]">Nom d'affichage SAV</label>
                      <input type="text" className="w-full" defaultValue="Royal Plaza - Horizon System" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-1.5">
                          <label className="text-xs font-medium text-[#5f6368]">Fuseau horaire</label>
                          <select className="w-full">
                             <option>(GMT+01:00) Afrique/Libreville</option>
                          </select>
                       </div>
                       <div className="space-y-1.5">
                          <label className="text-xs font-medium text-[#5f6368]">Fréquence Cloud</label>
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

          {activeTab === 'ai' && (
            <div className="google-card p-8 space-y-8">
               <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-[#e8f0fe] to-[#f8f9ff] border border-[#d2e3fc] rounded-lg">
                  <div className="p-3 bg-white rounded-full text-[#1a73e8] shadow-sm"><Sparkles size={24}/></div>
                  <div>
                    <h2 className="text-base font-medium text-[#1a73e8]">Gemini Intelligence Engine</h2>
                    <p className="text-xs text-[#5f6368]">Le moteur IA assiste le diagnostic et génère les rapports stratégiques.</p>
                  </div>
                  <div className="ml-auto">
                     <button 
                        onClick={() => updateConfig({ aiEnabled: !config.aiEnabled })}
                        className={`w-12 h-6 rounded-full relative transition-colors ${config.aiEnabled ? 'bg-[#1a73e8]' : 'bg-[#bdc1c6]'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${config.aiEnabled ? 'right-1' : 'left-1'}`} />
                      </button>
                  </div>
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
                            <span className={`px-2 py-0.5 rounded border text-[9px] font-bold uppercase ${getRoleColor(user.role as UserRole)}`}>{user.role}</span>
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

      {/* VOLET DÉTAILS UTILISATEUR */}
      {selectedUserForDetails && (
        <>
          <div className="fixed inset-0 bg-black/25 backdrop-blur-[2px] z-[60]" onClick={() => setSelectedUserForDetails(null)} />
          <div className="fixed right-0 top-0 h-screen w-[450px] bg-white z-[70] flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
             <div className="p-4 border-b bg-[#f8f9fa] flex items-center justify-between">
                <h2 className="text-xs font-black uppercase tracking-widest text-[#5f6368]">Fiche Collaborateur</h2>
                <button onClick={() => setSelectedUserForDetails(null)} className="p-1 hover:bg-gray-200 rounded-full"><X size={20}/></button>
             </div>
             <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                <div className="text-center space-y-4">
                   <img src={selectedUserForDetails.avatar} className="w-20 h-20 rounded-full mx-auto border-2 border-[#1a73e8] p-1" alt="" />
                   <div>
                      <h3 className="text-xl font-bold text-[#202124]">{selectedUserForDetails.name}</h3>
                      <p className="text-xs text-[#5f6368]">{selectedUserForDetails.email}</p>
                      <div className="flex justify-center gap-2 mt-2">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${getRoleColor(selectedUserForDetails.role as UserRole)}`}>{selectedUserForDetails.role}</span>
                        <span className="text-[9px] font-bold text-[#9aa0a6] uppercase flex items-center gap-1"><MapPin size={10} /> {selectedUserForDetails.showroom || 'Corporate'}</span>
                      </div>
                   </div>
                </div>
                <section className="space-y-4 pt-6 border-t">
                   <h4 className="text-[10px] font-black text-[#9aa0a6] uppercase tracking-[0.2em] flex items-center gap-2"><History size={14} /> Accès Récents</h4>
                   <div className="space-y-2">
                      {isLoadingLogs ? <div className="text-center py-4"><Loader2 className="animate-spin inline text-[#1a73e8]" size={16}/></div> : 
                        connectionLogs.length > 0 ? connectionLogs.map((log, i) => (
                        <div key={i} className="p-3 bg-[#f8f9fa] rounded-lg flex items-center justify-between border text-[11px]">
                           <span className="font-bold text-[#3c4043]">{new Date(log.timestamp).toLocaleDateString()}</span>
                           <span className="text-[#5f6368]">{new Date(log.timestamp).toLocaleTimeString()}</span>
                        </div>
                      )) : <p className="text-[10px] italic text-gray-400">Aucun historique.</p>}
                   </div>
                </section>
             </div>
             <div className="p-6 border-t flex gap-2">
                <button onClick={(e) => openEditUser(e, selectedUserForDetails)} className="btn-google-primary flex-1 justify-center text-xs">Modifier</button>
                <button onClick={(e) => handleDeleteUserClick(e, selectedUserForDetails)} disabled={currentUser?.id === selectedUserForDetails.id} className="p-3 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 disabled:opacity-20"><Trash2 size={20}/></button>
             </div>
          </div>
        </>
      )}

      {/* MODAL GESTION SHOWROOM */}
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

      {/* MODAL GESTION UTILISATEUR ENRICHI (DYNAMIQUE TECHNIQUE) */}
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

              {/* SECTION DYNAMIQUE TECHNICIEN */}
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
              <button type="submit" disabled={isSavingUser} className="btn-google-primary flex-1 justify-center py-4 text-xs font-black uppercase tracking-widest shadow-xl shadow-blue-600/10">
                {isSavingUser ? <Loader2 className="animate-spin" size={18}/> : editingUser ? 'Mettre à jour le compte' : 'Créer le compte synchronisé'}
              </button>
              <button type="button" onClick={() => setIsUserModalOpen(false)} className="btn-google-outlined px-8 uppercase text-[10px] font-black tracking-widest">Annuler</button>
           </div>
        </form>
      </Modal>

      {/* MODAL SUPPRESSION UTILISATEUR */}
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
