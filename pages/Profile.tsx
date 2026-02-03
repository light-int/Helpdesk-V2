
import React, { useState, useEffect } from 'react';
import { 
  User, Mail, Save, LogOut, RefreshCw, ShieldCheck, 
  Fingerprint, BadgeCheck, AtSign, Eye, EyeOff, Key
} from 'lucide-react';
import { useUser, useNotifications, useData, getGravatarUrl } from '../App';

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
      addNotification({ title: 'Profil', message: 'Synchronisation Cloud réussie.', type: 'success' });
    } catch (e) {
      addNotification({ title: 'Erreur', message: 'Échec de mise à jour.', type: 'error' });
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-m3-entry pb-20">
      <header className="flex justify-between items-end">
         <div>
            <h1 className="text-3xl font-normal text-[#1f1f1f]">Compte Expert</h1>
            <p className="text-sm text-[#747775] mt-1 font-medium">Identité Horizon sécurisée</p>
         </div>
         <div className="flex gap-2">
            {!isEditing ? (
              <button onClick={() => setIsEditing(true)} className="btn-md-tonal"><AtSign size={18} /> <span>Modifier</span></button>
            ) : (
              <div className="flex gap-2">
                 <button onClick={handleSave} className="btn-md-primary"><Save size={18}/> <span>Enregistrer</span></button>
                 <button onClick={() => setIsEditing(false)} className="btn-md-tonal">Annuler</button>
              </div>
            )}
         </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="md-card bg-white border border-[#e3e3e3] p-0 overflow-hidden shadow-sm">
            <div className="h-32 bg-gradient-to-r from-[#0b57d0] to-[#4285f4] relative">
               <div className="absolute -bottom-10 left-10 p-2 bg-white rounded-[24px] shadow-md">
                 <img src={currentUser.avatar} className="w-24 h-24 rounded-[16px] object-cover" alt="" />
               </div>
            </div>
            <div className="pt-14 px-10 pb-10 space-y-8">
               <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold text-[#1f1f1f]">{currentUser.name}</h2>
                  <BadgeCheck size={20} className="text-[#0b57d0]" />
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-[#f1f1f1]">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-[#747775] uppercase tracking-widest">Nom d'affichage</label>
                    <input type="text" disabled={!isEditing} className="w-full font-bold" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-[#747775] uppercase tracking-widest">Canal Email</label>
                    <input type="email" disabled={!isEditing} className="w-full font-bold" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                  </div>
               </div>
            </div>
          </div>

          <div className="md-card bg-[#f8fafd] border border-[#e3e3e3] p-10 space-y-6">
             <div className="flex items-center gap-4">
                <div className="p-3 bg-white rounded-2xl text-[#0b57d0] shadow-sm"><Key size={24}/></div>
                <div><h3 className="text-sm font-bold text-[#1f1f1f] uppercase tracking-widest">Contrôle de Sécurité</h3><p className="text-xs text-[#747775]">Gestion des clés d'accès</p></div>
             </div>
             <div className="p-6 bg-white rounded-[24px] border border-[#e3e3e3] relative">
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-6">
                      <div className="w-12 h-12 rounded-full bg-[#f0f4f9] flex items-center justify-center text-[#0b57d0]"><Fingerprint size={28}/></div>
                      <div className="flex-1">
                         <p className="text-[10px] font-black text-[#747775] uppercase mb-1">Clé de Session Cloud</p>
                         <input 
                           type={showPassword ? 'text' : 'password'} 
                           disabled={!isEditing} 
                           className="text-2xl font-mono font-black tracking-[0.4em] bg-transparent border-none p-0 w-full focus:ring-0" 
                           value={formData.password} 
                           onChange={e => setFormData({...formData, password: e.target.value})} 
                         />
                      </div>
                   </div>
                   <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-[#747775] hover:text-[#0b57d0] transition-colors">{showPassword ? <EyeOff size={22}/> : <Eye size={22}/>}</button>
                </div>
             </div>
          </div>
        </div>

        <div className="space-y-6">
           <div className="md-card bg-white border border-[#e3e3e3] p-8 space-y-6">
              <h3 className="text-xs font-bold text-[#1f1f1f] uppercase tracking-widest flex items-center gap-3 border-b pb-4"><ShieldCheck size={18} className="text-[#0b57d0]"/> Intégrité Session</h3>
              <div className="p-4 bg-[#f0f4f9] rounded-2xl flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full ${isSyncing ? 'bg-amber-500 animate-pulse' : 'bg-[#137333]'}`} />
                    <span className="text-xs font-bold text-[#444746] uppercase">Cloud Sync Active</span>
                 </div>
                 <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
              </div>
              <p className="text-[10px] text-[#747775] font-medium leading-relaxed">Votre session est authentifiée via le cluster GABON-LBV-1. Vos actions sont tracées dans le registre de gouvernance.</p>
           </div>
           <button onClick={logout} className="w-full flex items-center justify-center gap-3 py-5 bg-[#f9dedc] text-[#b3261e] rounded-[28px] text-xs font-bold uppercase tracking-widest hover:bg-[#f2b8b5] transition-all"><LogOut size={18}/> Déconnexion</button>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
