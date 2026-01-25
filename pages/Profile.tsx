
import React, { useState, useEffect } from 'react';
import { 
  User, Mail, Phone, MapPin, Camera, 
  Shield, Key, Bell, Palette, Save, 
  LogOut, UserCircle, RefreshCw,
  Cloud, Server, Lightbulb, Eye, EyeOff,
  UserCheck, AtSign, Fingerprint
} from 'lucide-react';
import { useUser, useNotifications, useData, getGravatarUrl } from '../App';
import { UserPreferences } from '../types';

const ProfilePage: React.FC = () => {
  const { currentUser, updateUser, logout } = useUser();
  const { isSyncing } = useData();
  const { addNotification } = useNotifications();
  const [isEditing, setIsEditing] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    name: currentUser?.name || '',
    email: currentUser?.email || '',
    password: currentUser?.password || '',
    bio: currentUser?.bio || "Collaborateur Royal Plaza."
  });

  useEffect(() => {
    if (currentUser) {
      setFormData(prev => ({
        ...prev,
        name: currentUser.name,
        email: currentUser.email || '',
        password: currentUser.password || '',
      }));
    }
  }, [currentUser]);

  if (!currentUser) return null;

  const handleSave = async () => {
    try {
      await updateUser({ 
        name: formData.name, 
        email: formData.email,
        password: formData.password,
        avatar: getGravatarUrl(formData.email)
      });
      setIsEditing(false);
      setIsUpdatingPassword(false);
      addNotification({ title: 'Profil mis à jour', message: 'Vos identifiants ont été synchronisés avec le Cloud.', type: 'success' });
    } catch (e) {
      addNotification({ title: 'Erreur', message: 'Échec de la mise à jour Cloud.', type: 'error' });
    }
  };

  const togglePreference = (key: keyof UserPreferences) => {
    const currentPrefs = currentUser.preferences || {
      pushNotifications: true,
      darkModeAuto: false,
      weeklyEmail: true,
      criticalAlerts: true
    };
    const newPrefs = { ...currentPrefs, [key]: !currentPrefs[key] };
    updateUser({ preferences: newPrefs });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl mx-auto pb-20">
      <header className="flex items-center justify-between">
         <div>
            <h1 className="text-2xl font-normal text-[#3c4043]">Mon Profil Expert</h1>
            <p className="text-sm text-[#5f6368]">Gérez votre identité et vos accès au système Horizon.</p>
         </div>
         <div className="flex gap-2">
            {!isEditing ? (
              <button onClick={() => setIsEditing(true)} className="btn-google-outlined flex items-center gap-2">
                <AtSign size={16} /> Modifier mes accès
              </button>
            ) : (
              <div className="flex gap-2">
                 <button onClick={handleSave} className="btn-google-primary"><Save size={18}/> Enregistrer les changements</button>
                 <button onClick={() => setIsEditing(false)} className="btn-google-outlined">Annuler</button>
              </div>
            )}
         </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* IDENTITÉ VISUELLE */}
          <div className="google-card p-8 flex flex-col md:flex-row items-center md:items-start gap-8">
            <div className="relative group">
              <img src={currentUser.avatar} className="w-32 h-32 rounded-full border-4 border-white shadow-xl" alt="" />
              <button className="absolute bottom-1 right-1 p-2.5 bg-[#1a73e8] text-white rounded-full shadow-lg hover:scale-110 transition-transform">
                <Camera size={16} />
              </button>
            </div>
            <div className="flex-1 space-y-6 w-full text-center md:text-left">
              <div className="space-y-1">
                 <h2 className="text-xl font-bold text-[#202124]">{currentUser.name}</h2>
                 <p className="text-xs font-black text-[#1a73e8] uppercase tracking-widest flex items-center justify-center md:justify-start gap-2">
                    <Shield size={14} /> Rôle : {currentUser.role} • Showroom : {currentUser.showroom || 'Corporate'}
                 </p>
                 <div className="flex items-center justify-center md:justify-start gap-2 mt-2">
                    <span className="text-[10px] bg-green-50 text-green-700 px-2 py-0.5 rounded border border-green-100 font-bold uppercase">Connecté</span>
                    <span className="text-[10px] text-gray-400 font-mono">ID: {currentUser.id}</span>
                 </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                 <div className="space-y-1.5">
                   <label className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest ml-1">Identité affichée</label>
                   <input type="text" disabled={!isEditing} className={`w-full h-11 ${!isEditing ? 'bg-gray-50 border-transparent cursor-not-allowed' : 'bg-white'}`} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                 </div>
                 <div className="space-y-1.5">
                   <label className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest ml-1">Email / Identifiant</label>
                   <input type="email" disabled={!isEditing} className={`w-full h-11 ${!isEditing ? 'bg-gray-50 border-transparent cursor-not-allowed' : 'bg-white'}`} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                 </div>
              </div>
            </div>
          </div>

          {/* SÉCURITÉ & ACCÈS (MODIFICATION PASSWORD) */}
          <div className={`google-card p-8 transition-all ${isEditing ? 'border-[#1a73e8] shadow-lg shadow-blue-600/5' : ''}`}>
             <div className="flex items-center justify-between mb-8">
                <h2 className="text-sm font-bold text-[#3c4043] flex items-center gap-2">
                   <Key size={18} className="text-[#1a73e8]"/> Sécurité des accès
                </h2>
                {isEditing && (
                  <div className="flex items-center gap-2">
                     <span className="text-[10px] font-black text-amber-600 uppercase">Mode Édition Actif</span>
                     <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  </div>
                )}
             </div>

             <div className="space-y-6">
                <div className="flex items-start gap-4 p-5 bg-[#f8f9fa] border border-[#dadce0] rounded-2xl relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full -mr-12 -mt-12" />
                   <div className="w-12 h-12 bg-white rounded-xl shadow-sm border flex items-center justify-center text-[#1a73e8] shrink-0 z-10">
                      <Fingerprint size={24} />
                   </div>
                   <div className="flex-1 z-10">
                      <p className="text-xs font-black text-[#5f6368] uppercase tracking-widest mb-2">Clé d'authentification</p>
                      <div className="relative max-w-sm">
                         <input 
                           type={showPassword ? 'text' : 'password'} 
                           disabled={!isEditing}
                           className={`w-full h-12 pr-12 text-lg font-mono font-black tracking-widest rounded-xl transition-all ${
                              !isEditing 
                              ? 'bg-transparent border-none p-0 cursor-default' 
                              : 'bg-white border-[#dadce0] p-4 focus:border-[#1a73e8]'
                           }`}
                           value={formData.password}
                           onChange={e => setFormData({...formData, password: e.target.value})}
                         />
                         {isEditing && (
                           <button 
                             type="button" 
                             onClick={() => setShowPassword(!showPassword)}
                             className="absolute right-3 top-3 text-[#5f6368] hover:text-[#1a73e8]"
                           >
                              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                           </button>
                         )}
                      </div>
                      {!isEditing && <p className="text-[10px] text-gray-400 mt-2 font-medium">Mot de passe masqué par défaut. Utilisez "Modifier mes accès" pour le changer.</p>}
                   </div>
                </div>

                {isEditing && (
                   <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-2xl animate-in slide-in-from-top-2">
                      <Lightbulb size={20} className="text-[#1a73e8] shrink-0 mt-0.5" />
                      <p className="text-[11px] text-blue-700 leading-relaxed font-medium">
                         Conseil Horizon : Utilisez au moins 12 caractères mélangeant des chiffres et des symboles pour une sécurité optimale de votre instance Royal Plaza.
                      </p>
                   </div>
                )}
             </div>
          </div>
        </div>

        {/* SIDEBAR PROFIL */}
        <div className="space-y-6">
          <div className="google-card p-6 bg-gradient-to-br from-white to-[#f8f9fa] border-l-4 border-[#1a73e8]">
             <h3 className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest mb-4 flex items-center gap-2">
                <Server size={14} className="text-[#1a73e8]" /> Synchronisation Cloud
             </h3>
             <div className="flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full ${isSyncing ? 'bg-amber-500 animate-pulse' : 'bg-green-500'}`} />
                <p className="text-xs font-bold text-[#3c4043]">{isSyncing ? 'Handshake en cours...' : 'Session Cloud Active'}</p>
             </div>
             <p className="text-[10px] text-gray-400 mt-2 italic">Vos accès sont répliqués sur tous les points de vente Royal Plaza.</p>
          </div>

          <div className="google-card p-6 space-y-4">
             <h3 className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest mb-2 flex items-center gap-2">
                <Bell size={14} className="text-[#1a73e8]" /> Alertes Opérationnelles
             </h3>
             <div className="space-y-3">
                {[
                  { id: 'pushNotifications', label: 'Push Dossiers Urgents' },
                  { id: 'criticalAlerts', label: 'Alertes Stocks' },
                ].map((pref) => {
                  const isChecked = currentUser.preferences ? (currentUser.preferences as any)[pref.id] : false;
                  return (
                    <div key={pref.id} className="flex items-center justify-between py-1">
                        <span className="text-xs font-medium text-[#3c4043]">{pref.label}</span>
                        <button 
                          onClick={() => togglePreference(pref.id as any)}
                          className={`w-9 h-4.5 rounded-full relative transition-colors ${isChecked ? 'bg-[#1a73e8]' : 'bg-[#bdc1c6]'}`}
                        >
                          <div className={`absolute top-0.5 w-3.5 h-3.5 bg-white rounded-full shadow-sm transition-all ${isChecked ? 'right-0.5' : 'left-0.5'}`} />
                        </button>
                    </div>
                  );
                })}
             </div>
          </div>

          <div className="google-card p-6 space-y-4">
             <button onClick={logout} className="w-full flex items-center justify-center gap-3 py-4 bg-red-50 text-red-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all shadow-sm">
                <LogOut size={16} /> Fermer la session Horizon
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
