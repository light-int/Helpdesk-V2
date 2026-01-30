
import React, { useState, useEffect } from 'react';
import { 
  User, Mail, Phone, MapPin, Camera, 
  Shield, Key, Bell, Palette, Save, 
  LogOut, UserCircle, RefreshCw,
  Cloud, Server, Lightbulb, Eye, EyeOff,
  UserCheck, AtSign, Fingerprint, BadgeCheck,
  ShieldAlert, Activity, LayoutGrid, CheckCircle2
} from 'lucide-react';
import { useUser, useNotifications, useData, getGravatarUrl } from '../App';
import { UserPreferences } from '../types';

const ProfilePage: React.FC = () => {
  const { currentUser, updateUser, logout } = useUser();
  const { isSyncing } = useData();
  const { addNotification } = useNotifications();
  const [isEditing, setIsEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    name: currentUser?.name || '',
    email: currentUser?.email || '',
    password: currentUser?.password || ''
  });

  useEffect(() => {
    if (currentUser) {
      setFormData(prev => ({ ...prev, name: currentUser.name, email: currentUser.email || '', password: currentUser.password || '' }));
    }
  }, [currentUser]);

  if (!currentUser) return null;

  const handleSave = async () => {
    try {
      await updateUser({ name: formData.name, email: formData.email, password: formData.password, avatar: getGravatarUrl(formData.email) });
      setIsEditing(false);
      addNotification({ title: 'Session Cloud', message: 'Profil synchronisé.', type: 'success' });
    } catch (e) {
      addNotification({ title: 'Erreur', message: 'Échec de la mise à jour.', type: 'error' });
    }
  };

  return (
    <div className="space-y-8 animate-page-entry pb-20 max-w-5xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
         <div>
            <h1 className="text-3xl font-light text-[#202124]">Mon Compte Expert</h1>
            <p className="text-[10px] text-[#5f6368] font-black uppercase tracking-widest mt-1">Identité & Paramètres Personnels Horizon</p>
         </div>
         <div className="flex gap-3">
            {!isEditing ? (
              <button onClick={() => setIsEditing(true)} className="btn-google-outlined h-11 px-6 flex items-center gap-3"><AtSign size={18} /> <span>Modifier</span></button>
            ) : (
              <div className="flex gap-3">
                 <button onClick={handleSave} className="btn-google-primary h-11 px-6 shadow-xl shadow-blue-600/10"><Save size={18}/> Enregistrer</button>
                 <button onClick={() => setIsEditing(false)} className="btn-google-outlined h-11 px-6">Annuler</button>
              </div>
            )}
         </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-10">
          <div className="google-card overflow-hidden border-none shadow-xl bg-white ring-1 ring-black/5">
            <div className="h-32 bg-gradient-to-r from-[#1a73e8] to-[#174ea6] relative">
               <div className="absolute -bottom-12 left-10 p-1 bg-white shadow-xl rounded-none"><img src={currentUser.avatar} className="w-32 h-32 rounded-none object-cover" alt="" /></div>
            </div>
            <div className="pt-20 px-10 pb-10 space-y-8">
              <div className="flex items-center gap-3">
                 <h2 className="text-2xl font-black text-[#202124] tracking-tight uppercase">{currentUser.name}</h2>
                 <BadgeCheck size={20} className="text-[#1a73e8]" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-gray-50">
                 <div className="space-y-2"><label className="text-[9px] font-black text-[#5f6368] uppercase tracking-[0.2em]">Nom d'affichage</label><input type="text" disabled={!isEditing} className="w-full h-12 px-5 font-bold disabled:bg-gray-50" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
                 <div className="space-y-2"><label className="text-[9px] font-black text-[#5f6368] uppercase tracking-[0.2em]">Canal Email</label><input type="email" disabled={!isEditing} className="w-full h-12 px-5 font-bold disabled:bg-gray-50" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} /></div>
              </div>
            </div>
          </div>
          <div className="google-card p-10 bg-white shadow-xl ring-1 ring-black/5 space-y-10">
             <h2 className="text-[11px] font-black text-[#3c4043] uppercase tracking-[0.2em] flex items-center gap-3"><Key size={20} className="text-[#1a73e8]"/> Contrôle des Accès</h2>
             <div className="p-8 bg-[#f8f9fa] border border-[#dadce0] relative overflow-hidden">
                <div className="flex items-center gap-8 relative z-10">
                   <div className="w-16 h-16 bg-white shadow-lg border flex items-center justify-center text-[#1a73e8] shrink-0"><Fingerprint size={32} /></div>
                   <div className="flex-1 space-y-4">
                      <p className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest">Clé de session</p>
                      <input type={showPassword ? 'text' : 'password'} disabled={!isEditing} className="w-full h-14 text-2xl font-mono font-black tracking-[0.4em] bg-transparent border-none p-0 disabled:opacity-40" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                   </div>
                </div>
             </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="google-card p-8 bg-white border-l-4 border-[#1a73e8] shadow-xl ring-1 ring-black/5">
             <h3 className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest mb-6 flex items-center gap-3"><Server size={16} className="text-[#1a73e8]" /> Synchronisation</h3>
             <div className="flex items-center justify-between bg-gray-50 p-4 border border-gray-100">
                <div className="flex items-center gap-3">
                   <div className={`w-2.5 h-2.5 rounded-full ${isSyncing ? 'bg-amber-500 animate-pulse' : 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]'}`} />
                   <p className="text-[10px] font-black text-[#3c4043] uppercase tracking-widest">Connecté Cloud</p>
                </div>
                <Activity size={14} className="text-gray-300" />
             </div>
             <p className="text-[10px] text-gray-400 mt-6 font-bold uppercase text-center">Infrastructure Horizon GABON-LBV-1</p>
          </div>
          <div className="google-card p-8 bg-white shadow-xl ring-1 ring-black/5">
             <button onClick={logout} className="w-full flex items-center justify-center gap-4 py-5 bg-red-50 text-red-600 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-red-600 hover:text-white transition-all shadow-sm"><LogOut size={18} /> Déconnexion</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
