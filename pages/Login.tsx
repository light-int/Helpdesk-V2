
import React, { useState } from 'react';
import { ArrowRight, ShieldCheck, Loader2, AlertCircle, Terminal, Lock, User } from 'lucide-react';
import { useUser, useNotifications } from '../App';
import { UserProfile } from '../types';
import { ApiService } from '../services/apiService';
import { supabase } from '../services/supabaseClient';

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login } = (() => { try { return useUser(); } catch { return { login: () => { } }; } })();
  const { addNotification } = (() => { try { return useNotifications(); } catch { return { addNotification: () => { } }; } })();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // 1. Essayer l'authentification Supabase Auth standard
      const { data, error: supaError } = await supabase.auth.signInWithPassword({
        email: username,
        password: password
      });

      if (supaError) {
        console.warn('[Login] Supabase Auth failed, checking database fallback...', supaError.message);

        // 2. Mécanisme de repli : Vérifier manuellement dans la table public.users
        // Cela permet aux comptes créés par l'Admin via l'UI (qui ne sont pas dans Auth) de se connecter.
        const { data: dbUsers, error: dbError } = await supabase
          .from('users')
          .select('*')
          .eq('email', username)
          .eq('password', password) // Comparaison directe (les passwords sont stockés en clair ou hashés manuellement par l'admin)
          .maybeSingle();

        if (dbError || !dbUsers) {
          setError(`Accès refusé: Identifiants invalides.`);
          setIsLoading(false);
          return;
        }

        // Login réussi via fallback
        const user = dbUsers as UserProfile;
        await ApiService.users.logConnection(user.id);
        login(user);
        addNotification({
          title: 'Authentification (Base)',
          message: `Session ouverte pour ${user.name} via registre local.`,
          type: 'success'
        });
        return;
      }

      // 3. Si Auth standard réussie, récupérer ou créer le profil
      const users: UserProfile[] = await ApiService.users.getAll();
      const user = users.find((u: UserProfile) =>
        u.email?.toLowerCase() === data.user?.email?.toLowerCase()
      );

      if (user) {
        await ApiService.users.logConnection(user.id);
        login(user);
        addNotification({ title: 'Authentification', message: `Technicien ${user.name} connecté au cluster.`, type: 'success' });
      } else {
        // Just-In-Time Provisioning: Create profile if missing
        console.log('[Login] Profile missing, creating JIT profile...');
        const newUser: UserProfile = {
          id: data.user.id,
          email: data.user.email!,
          name: data.user.email!.split('@')[0],
          role: 'AGENT',
          status: 'Actif',
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.user.id}`
        };

        try {
          await ApiService.users.save(newUser);
          await ApiService.users.logConnection(newUser.id);
          login(newUser);
          addNotification({ title: 'Profil Initialisé', message: 'Votre compte a été synchronisé automatiquement.', type: 'success' });
        } catch (initErr: any) {
          console.error('[Login] JIT Error:', initErr);
          setError(`Auth OK, mais impossible de créer votre profil: ${initErr.message}`);
        }
      }
    } catch (err: any) {
      setError(`Communication interrompue: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col items-center justify-center p-6 selection:bg-[#3ecf8e]/30 relative overflow-hidden">
      {/* Background patterns */}
      <div className="absolute top-0 left-0 w-full h-full opacity-[0.03] pointer-events-none">
        <div className="absolute top-10 left-10 w-96 h-96 bg-[#3ecf8e] rounded-full blur-[100px]" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-600 rounded-full blur-[100px]" />
      </div>

      <div className="w-full max-w-[380px] animate-sb-entry relative z-10">

        {/* BRANDING TOP */}
        <div className="mb-6 flex flex-col items-center gap-3">
          <div className="w-11 h-11 bg-[#1c1c1c] rounded-xl flex items-center justify-center text-[#3ecf8e] shadow-lg border border-[#3ecf8e]/20 group transition-transform hover:scale-105">
            <Terminal size={24} />
          </div>
          <div className="text-center">
            <h1 className="text-lg font-semibold text-[#1c1c1c] tracking-tight uppercase">
              Royal <span className="text-[#3ecf8e]">Plaza</span>
            </h1>
            <p className="text-[10px] text-[#686868] font-semibold uppercase tracking-[0.2em] mt-1 opacity-70">Horizon Pro Console v2.8</p>
          </div>
        </div>

        {/* LOGIN CARD */}
        <div className="bg-white border border-[#e5e5e5] rounded-xl shadow-lg p-6 md:p-8 relative">
          <div className="mb-6">
            <h2 className="text-base font-semibold text-[#1c1c1c] tracking-tight">Connexion</h2>
            <p className="text-[12px] text-[#686868] mt-1 font-semibold">Authentifiez-vous pour accéder au cluster SAV.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-[#1c1c1c] uppercase tracking-[0.15em] flex items-center gap-2">
                  <User size={11} className="text-[#3ecf8e]" /> Identifiant
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full h-10 bg-[#fcfcfc] border-[#e5e5e5] focus:border-[#3ecf8e] transition-all text-sm px-3 rounded-md"
                  placeholder="Email professionnel"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-[#1c1c1c] uppercase tracking-[0.15em] flex items-center gap-2">
                  <Lock size={11} className="text-[#3ecf8e]" /> Mot de passe
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full h-10 bg-[#fcfcfc] border-[#e5e5e5] focus:border-[#3ecf8e] transition-all text-sm px-3 rounded-md"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 text-[11px] font-semibold text-red-600 bg-red-50 p-3 rounded-lg border border-red-100 animate-sb-entry">
                <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-500" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="btn-sb-primary w-full justify-center h-10 mt-2 shadow-md shadow-[#3ecf8e]/20 group text-[12px] font-semibold uppercase tracking-widest"
            >
              {isLoading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <>
                  <span>Ouvrir la session</span>
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-[#e5e5e5] text-center">
            <p className="text-[10px] text-[#9ca3af] font-semibold leading-relaxed uppercase tracking-tight">
              Usage interne restreint
            </p>
          </div>
        </div>

        {/* FOOTER INFO */}
        <div className="mt-6 flex justify-between items-center px-2">
          <p className="text-[10px] text-[#9ca3af] font-semibold uppercase tracking-widest">© GABON • INFRA 01</p>
          <div className="flex items-center gap-1.5 text-[10px] text-[#3ecf8e] font-semibold uppercase tracking-widest bg-[#f0fdf4] px-2 py-0.5 rounded-full border border-[#dcfce7]">
            <ShieldCheck size={12} />
            <span>Gouvernance Plaza</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
