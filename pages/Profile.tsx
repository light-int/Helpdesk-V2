
import React, { useState, useEffect } from 'react';
import { 
  User, Mail, Save, LogOut, RefreshCw, ShieldCheck, 
  Fingerprint, BadgeCheck, AtSign, Eye, EyeOff, Key,
  Smartphone, MapPin, Building2, Zap
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
      await updateUser({ 
        name: formData.name, 
        email: formData.email, 
        password: formData.password, 
        avatar: getGravatarUrl(formData.email) 
      });
      setIsEditing(false);
      addNotification({ title: 'Profil mis à jour', message: 'Vos informations ont été synchronisées sur le Cloud Horizon.', type: 'success' });
    } catch (e) {
      addNotification({ title: 'Erreur', message: 'Échec de la mise à jour du profil.', type: 'error' });
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10 animate-sb-entry pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
         <div>
            <h1 className="text-2xl font-bold text-[#1c1c1c] tracking-tight">Espace Collaborateur</h1>
            <p className="text-xs text-[#686868] mt-1 font-medium">Gestion de votre identité numérique et accès Horizon Pro.</p>
         </div>
         <div className="flex gap-2">
            {!isEditing ? (
              <button onClick={() => setIsEditing(true)} className="btn-sb-outline h-10 px-4">
                <Edit3 size={16} /> <span>Modifier Profil</span>
              </button>
            ) : (
              <div className="flex gap-2">
                 <button onClick={handleSave} className="btn-sb-primary h-10 px-4 shadow-sm">
                   <Save size={16}/> <span>Sauvegarder</span>
                 </button>
                 <button onClick={() => setIsEditing(false)} className="btn-sb-outline h-10 px-4">Annuler</button>
              </div>
            )}
         </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Identity Section */}
        <div className="lg:col-span-2 space-y-8">
          <div className="sb-card p-0 overflow-hidden border-[#ededed] shadow-sm">
            <div className="h-28 bg-[#1c1c1c] relative">
               <div className="absolute top-0 right-0 p-6 opacity-10">
                  <ShieldCheck size={120} className="text-[#3ecf8e]" />
               </div>
               <div className="absolute -bottom-12 left-8 p-1.5 bg-white rounded-2xl shadow-md border border-[#ededed]">
                 <img src={currentUser.avatar} className="w-24 h-24 rounded-xl object-cover" alt="" />
               </div>
            </div>
            <div className="pt-16 px-8 pb-8 space-y-8 bg-white">
               <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-[#1c1c1c]">{currentUser.name}</h2>
                      <BadgeCheck size={18} className="text-[#3ecf8e]" />
                    </div>
                    <p className="text-[10px] text-[#3ecf8e] font-black uppercase tracking-widest mt-1">Expert Certifié Royal Plaza</p>
                  </div>
                  <span className="px-3 py-1 bg-[#f0fdf4] text-[#16a34a] border border-[#dcfce7] text-[10px] font-black uppercase rounded-full">
                    {currentUser.role}
                  </span>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-[#f5f5f5]">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-[#686868] uppercase tracking-widest flex items-center gap-2">
                      <User size={12} /> Nom Complet
                    </label>
                    <input 
                      type="text" 
                      disabled={!isEditing} 
                      className={`w-full h-11 transition-all ${!isEditing ? 'bg-[#fcfcfc] border-transparent cursor-not-allowed font-semibold' : ''}`} 
                      value={formData.name} 
                      onChange={e => setFormData({...formData, name: e.target.value})} 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-[#686868] uppercase tracking-widest flex items-center gap-2">
                      <Mail size={12} /> Email Professionnel
                    </label>
                    <input 
                      type="email" 
                      disabled={!isEditing} 
                      className={`w-full h-11 transition-all ${!isEditing ? 'bg-[#fcfcfc] border-transparent cursor-not-allowed font-semibold' : ''}`} 
                      value={formData.email} 
                      onChange={e => setFormData({...formData, email: e.target.value})} 
                    />
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-[#686868] uppercase tracking-widest flex items-center gap-2">
                      <Building2 size={12} /> Showroom Affecté
                    </label>
                    <div className="h-11 px-4 bg-[#f8f9fa] border border-[#ededed] rounded-lg flex items-center text-xs font-bold text-[#1c1c1c]">
                      Plaza {currentUser.showroom || 'Libreville HQ'}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-[#686868] uppercase tracking-widest flex items-center gap-2">
                      <Zap size={12} /> Statut Interne
                    </label>
                    <div className="h-11 px-4 bg-[#f8f9fa] border border-[#ededed] rounded-lg flex items-center text-xs font-bold text-[#1c1c1c]">
                      Connecté • LBV-Cluster-1
                    </div>
                  </div>
               </div>
            </div>
          </div>

          <div className="sb-card bg-white border-[#ededed] p-8 space-y-6 shadow-sm">
             <div className="flex items-center gap-4">
                <div className="p-3 bg-[#f8f9fa] rounded-xl text-[#1c1c1c] border border-[#ededed] shadow-sm"><Key size={20}/></div>
                <div>
                  <h3 className="text-sm font-bold text-[#1c1c1c] uppercase tracking-widest">Sécurité du Compte</h3>
                  <p className="text-[10px] text-[#686868] font-medium">Clés d'accès et authentification</p>
                </div>
             </div>
             
             <div className="p-5 bg-[#fcfcfc] rounded-xl border border-[#ededed] relative group">
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-6">
                      <div className="w-12 h-12 rounded-lg bg-white border border-[#ededed] flex items-center justify-center text-[#3ecf8e] shadow-sm"><Fingerprint size={24}/></div>
                      <div className="flex-1">
                         <p className="text-[9px] font-black text-[#686868] uppercase mb-1">Mot de passe Horizon</p>
                         <input 
                           type={showPassword ? 'text' : 'password'} 
                           disabled={!isEditing} 
                           className={`text-xl font-mono font-black tracking-[0.4em] bg-transparent border-none p-0 w-full focus:ring-0 ${!isEditing ? 'cursor-not-allowed' : ''}`} 
                           value={formData.password} 
                           onChange={e => setFormData({...formData, password: e.target.value})} 
                         />
                      </div>
                   </div>
                   <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)} 
                    className="p-2 text-[#686868] hover:text-[#1c1c1c] transition-colors"
                   >
                     {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                   </button>
                </div>
             </div>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
           <div className="sb-card bg-white border-[#ededed] p-6 space-y-6 shadow-sm">
              <h3 className="text-[11px] font-black text-[#1c1c1c] uppercase tracking-[0.1em] flex items-center gap-3 border-b border-[#f5f5f5] pb-4">
                <Activity size={16} className="text-[#3ecf8e]"/> Intégrité Session
              </h3>
              
              <div className="space-y-4">
                <div className="p-4 bg-[#f0fdf4] rounded-xl flex items-center justify-between border border-[#dcfce7]">
                   <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-amber-500 animate-pulse' : 'bg-[#3ecf8e]'}`} />
                      <span className="text-[11px] font-bold text-[#16a34a] uppercase">Synchronisé</span>
                   </div>
                   <RefreshCw size={14} className={`text-[#16a34a] ${isSyncing ? 'animate-spin' : ''}`} />
                </div>
                
                <div className="space-y-2">
                   <div className="flex justify-between text-[11px]">
                      <span className="text-[#686868] font-medium">Dernière connexion</span>
                      <span className="text-[#1c1c1c] font-bold">{new Date().toLocaleDateString()}</span>
                   </div>
                   <div className="flex justify-between text-[11px]">
                      <span className="text-[#686868] font-medium">Infrastructure</span>
                      <span className="text-[#1c1c1c] font-bold">Gabon-West-1</span>
                   </div>
                   <div className="flex justify-between text-[11px]">
                      <span className="text-[#686868] font-medium">Protocole IP</span>
                      <span className="text-[#1c1c1c] font-bold">IPv4 Certifié</span>
                   </div>
                </div>
              </div>

              <p className="text-[10px] text-[#686868] font-medium leading-relaxed bg-[#f8f9fa] p-3 rounded-lg border border-[#ededed]">
                Votre session est authentifiée. Toute action de modification est tracée dans le registre de gouvernance Royal Plaza.
              </p>
           </div>

           <button 
            onClick={logout} 
            className="w-full flex items-center justify-center gap-3 py-4 bg-white border border-red-100 text-red-500 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-red-50 transition-all shadow-sm group"
           >
             <LogOut size={16} className="group-hover:-translate-x-1 transition-transform" /> Déconnexion Session
           </button>
        </div>
      </div>
    </div>
  );
};

// Internal icon for Edit
const Edit3 = ({ size, className }: { size: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 20h9"></path>
    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
  </svg>
);

const Activity = ({ size, className }: { size: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
  </svg>
);

export default ProfilePage;
