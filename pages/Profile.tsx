
import React, { useState, useEffect } from 'react';
import {
  User, Mail, Save, LogOut, RefreshCw, ShieldCheck,
  Fingerprint, BadgeCheck, Eye, EyeOff, Key,
  Building2, Zap, LayoutGrid, Smartphone, MapPin, Bell, BellRing
} from 'lucide-react';
import { useUser, useNotifications, useData, getGravatarUrl } from '../App';
import { supabase } from '../services/supabaseClient';
import { VAPID_PUBLIC_KEY } from '../types';
import { subscribeToPush, unsubscribeFromPush, getPushPermissionStatus } from '../services/pushNotifications';

const ProfilePage: React.FC = () => {
  const _u = (() => { try { return useUser(); } catch { return { currentUser: null, updateUser: () => { }, logout: () => { } }; } })();
  const { currentUser = _u.currentUser, updateUser = _u.updateUser, logout = _u.logout } = _u;
  const { isSyncing } = (() => { try { return useData(); } catch { return { isSyncing: false }; } })();
  const { addNotification } = (() => { try { return useNotifications(); } catch { return { addNotification: () => { } }; } })();
  const [isEditing, setIsEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission | 'unsupported'>(getPushPermissionStatus());
  const [isPushSubscribing, setIsPushSubscribing] = useState(false);
  const [isPushEnabled, setIsPushEnabled] = useState(false);

  const [formData, setFormData] = useState({
    name: currentUser?.name || '',
    email: currentUser?.email || '',
    password: currentUser?.password || '',
    confirmPassword: ''
  });

  useEffect(() => {
    if (currentUser) {
      setFormData({
        name: currentUser.name,
        email: currentUser.email || '',
        password: currentUser.password || '',
        confirmPassword: ''
      });
    }
  }, [currentUser]);

  useEffect(() => {
    setPushPermission(getPushPermissionStatus());
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          setIsPushEnabled(!!sub);
        });
      });
    }
  }, []);

  const handleTogglePush = async () => {
    if (!currentUser) return;
    setIsPushSubscribing(true);
    try {
      if (isPushEnabled) {
        await unsubscribeFromPush(currentUser.id);
        setIsPushEnabled(false);
        addNotification({ title: 'Notifications désactivées', message: 'Vous ne recevrez plus de notifications push.', type: 'info' });
      } else {
        const ok = await subscribeToPush(currentUser.id, VAPID_PUBLIC_KEY);
        if (ok) {
          setIsPushEnabled(true);
          setPushPermission('granted');
          addNotification({ title: 'Notifications activées', message: 'Vous recevrez les alertes en temps réel.', type: 'success' });
        } else {
          setPushPermission(getPushPermissionStatus());
          addNotification({ title: 'Permission refusée', message: 'Autorisez les notifications dans les paramètres de votre navigateur.', type: 'warning' });
        }
      }
    } catch (err) {
      addNotification({ title: 'Erreur', message: 'Impossible de configurer les notifications push.', type: 'error' });
    } finally {
      setIsPushSubscribing(false);
    }
  };

  if (!currentUser) return null;

  const handleSave = async () => {
    if (formData.password !== currentUser?.password && formData.password !== formData.confirmPassword) {
      addNotification({ title: 'Erreur', message: 'Les mots de passe ne correspondent pas.', type: 'error' });
      return;
    }

    try {
      // 1. Mettre à jour les métadonnées dans la table public.users
      await updateUser({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        avatar: getGravatarUrl(formData.email)
      });

      // 2. Mettre à jour le mot de passe réel dans Supabase Auth si modifié
      if (formData.password !== currentUser?.password && formData.password.length >= 6) {
        const { error } = await supabase.auth.updateUser({
          password: formData.password
        });
        if (error) throw error;
      }

      setIsEditing(false);
      addNotification({ title: 'Profil mis à jour', message: 'Vos informations et votre accès ont été sécurisés.', type: 'success' });
    } catch (e: any) {
      console.error('Update Profile Error:', e);
      addNotification({ title: 'Erreur', message: e.message || 'Échec de la mise à jour du profil.', type: 'error' });
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-5 animate-sb-entry pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#3ecf8e]/10 rounded-xl flex items-center justify-center text-[#3ecf8e]">
            <User size={18} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
              Espace Collaborateur
            </h1>
            <p className="text-xs text-[#686868] font-semibold uppercase tracking-wider mt-0.5">Identité numérique et accès sécurisé Horizon Pro.</p>
          </div>
        </div>
        <div className="flex gap-2">
          {!isEditing ? (
            <button onClick={() => setIsEditing(true)} className="btn-sb-outline h-10 px-4">
              <Edit3 size={16} /> <span>Modifier Profil</span>
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={handleSave} className="btn-sb-primary h-10 px-4 shadow-sm">
                <Save size={16} /> <span>Sauvegarder</span>
              </button>
              <button onClick={() => setIsEditing(false)} className="btn-sb-outline h-10 px-4">Annuler</button>
            </div>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-8">
          {/* Identity Card */}
          <div className="sb-card p-0 overflow-hidden border-[#e5e5e5] shadow-sm bg-white">
            <div className="h-32 bg-[#1c1c1c] relative">
              <div className="absolute top-0 right-0 p-3 opacity-10">
                <ShieldCheck size={140} className="text-[#3ecf8e]" />
              </div>
              <div className="absolute -bottom-14 left-8 p-1.5 bg-white rounded-lg shadow-md border border-[#e5e5e5]">
                <img src={currentUser.avatar} className="w-28 h-28 rounded-lg object-cover bg-[#f8f9fa]" alt="" />
              </div>
            </div>
            <div className="pt-20 px-8 pb-8 space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-bold text-[#1c1c1c]">{currentUser.name}</h2>
                    <BadgeCheck size={16} className="text-[#3ecf8e]" />
                  </div>
                  <p className="text-[11px] text-[#3ecf8e] font-semibold uppercase tracking-[0.2em] mt-1">Technicien Certifié Royal Plaza • GABON</p>
                </div>
                <div className="flex flex-col items-end">
                  <span className="px-3 py-1 bg-[#f0fdf4] text-[#16a34a] border border-[#dcfce7] text-[11px] font-semibold uppercase rounded-full">
                    {currentUser.role}
                  </span>
                  <p className="text-[10px] text-[#686868] mt-1 font-semibold">Niveau d'accréditation 4</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-6 border-t border-[#f5f5f5]">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-[#686868] uppercase tracking-widest flex items-center gap-2">
                    <User size={12} /> Nom Complet
                  </label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    className={`w-full h-11 transition-all ${!isEditing ? 'bg-[#fcfcfc] border-transparent cursor-not-allowed font-semibold' : 'bg-white border-[#e5e5e5]'}`}
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-[#686868] uppercase tracking-widest flex items-center gap-2">
                    <Mail size={12} /> Email Professionnel
                  </label>
                  <input
                    type="email"
                    disabled={!isEditing}
                    className={`w-full h-11 transition-all ${!isEditing ? 'bg-[#fcfcfc] border-transparent cursor-not-allowed font-semibold' : 'bg-white border-[#e5e5e5]'}`}
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-[#686868] uppercase tracking-widest flex items-center gap-2">
                    <Building2 size={12} /> Showroom Affecté
                  </label>
                  <div className="h-11 px-4 bg-[#f8f9fa] border border-[#e5e5e5] rounded-lg flex items-center text-xs font-semibold text-[#1c1c1c]">
                    Plaza {currentUser.showroom || 'Libreville HQ'}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-[#686868] uppercase tracking-widest flex items-center gap-2">
                    <Zap size={12} /> Statut Cluster
                  </label>
                  <div className="h-11 px-4 bg-[#f8f9fa] border border-[#e5e5e5] rounded-lg flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#3ecf8e] animate-pulse" />
                    <span className="text-xs font-semibold text-[#1c1c1c]">Actif • GAB-Cluster-01</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Push Notifications */}
          <div className="sb-card bg-white border-[#e5e5e5] p-4 space-y-4 shadow-sm">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-lg border shadow-sm ${isPushEnabled ? 'bg-[#f0fdf4] text-[#3ecf8e] border-[#dcfce7]' : 'bg-[#f8f9fa] text-[#686868] border-[#e5e5e5]'}`}>
                {isPushEnabled ? <BellRing size={16} /> : <Bell size={16} />}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#1c1c1c] uppercase tracking-widest">Alertes Temps Réel</h3>
                <p className="text-[11px] text-[#686868] font-semibold">Notifications push mobile & bureau</p>
              </div>
            </div>
            <div className="p-5 bg-[#fcfcfc] rounded-lg border border-[#e5e5e5] space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Smartphone size={18} className={isPushEnabled ? 'text-[#3ecf8e]' : 'text-[#686868]'} />
                  <div>
                    <p className="text-[12px] font-semibold text-[#1c1c1c]">Notifications système</p>
                    <p className="text-[10px] text-[#686868] font-semibold">
                      {pushPermission === 'unsupported'
                        ? 'Navigateur non compatible'
                        : pushPermission === 'denied'
                          ? 'Bloqué (réinitialisez la permission dans les paramètres du navigateur)'
                          : isPushEnabled
                            ? 'Activé — vous recevrez les affectations et alertes en temps réel'
                            : 'Désactivé — activez pour recevoir les notifications push'}
                    </p>
                  </div>
                </div>
                {pushPermission !== 'unsupported' && (
                  <button
                    onClick={handleTogglePush}
                    disabled={isPushSubscribing}
                    className={`relative w-12 h-7 rounded-full transition-colors duration-300 flex-shrink-0 ${isPushEnabled ? 'bg-[#3ecf8e]' : 'bg-gray-200'}`}
                  >
                    {isPushSubscribing ? (
                      <RefreshCw size={12} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white animate-spin" />
                    ) : (
                      <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform duration-300 ${isPushEnabled ? 'left-6' : 'left-1'}`} />
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Security Management */}
          <div className="sb-card bg-white border-[#e5e5e5] p-4 space-y-4 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-[#f8f9fa] rounded-lg text-[#1c1c1c] border border-[#e5e5e5] shadow-sm"><Key size={16} /></div>
              <div>
                <h3 className="text-sm font-semibold text-[#1c1c1c] uppercase tracking-widest">Contrôle de Sécurité</h3>
                <p className="text-[11px] text-[#686868] font-semibold">Identifiants et authentification Horizon</p>
              </div>
            </div>

            <div className="p-5 bg-[#fcfcfc] rounded-lg border border-[#e5e5e5] space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-12 h-12 rounded-lg bg-white border border-[#e5e5e5] flex items-center justify-center text-[#3ecf8e] shadow-sm"><Fingerprint size={18} /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-semibold text-[#686868] uppercase mb-1">Clé d'Accès Système (Nouveau)</p>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      disabled={!isEditing}
                      className={`text-base font-mono font-semibold tracking-[0.4em] bg-transparent border-none p-0 w-full focus:ring-0 ${!isEditing ? 'cursor-not-allowed opacity-50' : 'text-[#3ecf8e]'}`}
                      value={formData.password}
                      onChange={e => setFormData({ ...formData, password: e.target.value })}
                      placeholder="••••••••"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-2 text-[#686868] hover:text-[#1c1c1c] transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {isEditing && (
                <div className="pt-4 border-t border-[#f0f0f0] animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-[#3ecf8e]/5 border border-[#3ecf8e]/10 flex items-center justify-center text-[#3ecf8e]"><RefreshCw size={16} /></div>
                    <div className="flex-1">
                      <p className="text-[10px] font-semibold text-[#3ecf8e] uppercase mb-1">Confirmer la nouvelle Clé</p>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        className="text-base font-mono font-semibold tracking-[0.4em] bg-transparent border-none p-0 w-full focus:ring-0 text-[#1c1c1c]"
                        value={formData.confirmPassword}
                        onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                        placeholder="••••••••"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-4">
          <div className="sb-card bg-white border-[#e5e5e5] p-3 space-y-4 shadow-sm">
            <h3 className="text-[12px] font-semibold text-[#1c1c1c] uppercase tracking-[0.1em] flex items-center gap-3 border-b border-[#f5f5f5] pb-4">
              <ActivityIcon size={16} className="text-[#3ecf8e]" /> Monitoring Session
            </h3>

            <div className="space-y-4">
              <div className="p-4 bg-[#f0fdf4] rounded-lg flex items-center justify-between border border-[#dcfce7]">
                <div className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${isSyncing ? 'bg-amber-500 animate-pulse' : 'bg-[#3ecf8e]'}`} />
                  <span className="text-[12px] font-semibold text-[#16a34a] uppercase">Connecté</span>
                </div>
                <RefreshCw size={14} className={`text-[#16a34a] ${isSyncing ? 'animate-spin' : ''}`} />
              </div>

              <div className="space-y-2.5">
                <div className="flex justify-between text-[12px]">
                  <span className="text-[#686868] font-semibold">Session IP</span>
                  <span className="text-[#1c1c1c] font-semibold">197.234.xx.xx</span>
                </div>
                <div className="flex justify-between text-[12px]">
                  <span className="text-[#686868] font-semibold">Agent Web</span>
                  <span className="text-[#1c1c1c] font-semibold">V8 Engine</span>
                </div>
                <div className="flex justify-between text-[12px]">
                  <span className="text-[#686868] font-semibold">Cryptage</span>
                  <span className="text-[#1c1c1c] font-semibold">AES-256</span>
                </div>
                <div className="flex justify-between text-[12px]">
                  <span className="text-[#686868] font-semibold">Uptime</span>
                  <span className="text-[#1c1c1c] font-semibold">99.9%</span>
                </div>
              </div>
            </div>

            <div className="bg-[#f8f9fa] p-4 rounded-lg border border-[#e5e5e5]">
              <p className="text-[11px] text-[#686868] font-semibold leading-relaxed italic">
                "Votre identité est vérifiée. Chaque modification de paramètre stratégique est tracée par le kernel Horizon Pro."
              </p>
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-3 py-4 bg-white border border-red-100 text-red-500 rounded-lg text-[12px] font-semibold uppercase tracking-widest hover:bg-red-50 transition-all shadow-sm group"
          >
            <LogOut size={16} className="group-hover:-translate-x-1 transition-transform" /> Mettre fin à la session
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

const ActivityIcon = ({ size, className }: { size: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
  </svg>
);

export default ProfilePage;
