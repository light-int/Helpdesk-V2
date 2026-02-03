
import React, { useState } from 'react';
import { ArrowRight, ShieldCheck, Loader2, AlertCircle, Terminal, Lock, User } from 'lucide-react';
import { useUser, useNotifications } from '../App';
import { UserProfile } from '../types';
import { ApiService } from '../services/apiService';

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login } = useUser();
  const { addNotification } = useNotifications();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      const users: UserProfile[] = await ApiService.users.getAll();
      
      // Fallback local admin if database is unreachable or empty
      if ((!users || users.length === 0) && username.toLowerCase() === 'admin' && password === 'intxxl') {
        const firstAdmin: UserProfile = {
          id: 'U-ADMIN-01', name: 'Admin Root', role: 'ADMIN', 
          email: 'admin@royalplaza.ga', password: 'intxxl',
          avatar: 'https://ui-avatars.com/api/?name=Admin&background=3ecf8e&color=ffffff', 
          status: 'Actif', showroom: 'Glass'
        };
        try { await ApiService.users.save(firstAdmin); } catch(e) {}
        login(firstAdmin);
        return;
      }

      const user = users.find((u: UserProfile) => 
        (u.email?.toLowerCase() === username.toLowerCase() || u.name.toLowerCase() === username.toLowerCase()) && 
        u.password === password
      );

      if (user) {
        await ApiService.users.logConnection(user.id);
        login(user);
        addNotification({ title: 'Authentification', message: `Expert ${user.name} connecté au cluster.`, type: 'success' });
      } else {
        setError("Identifiants non valides sur l'infrastructure Horizon.");
      }
    } catch (err) {
      setError("Communication interrompue avec le Cloud Plaza.");
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

      <div className="w-full max-w-[420px] animate-sb-entry relative z-10">
        
        {/* BRANDING TOP */}
        <div className="mb-10 flex flex-col items-center gap-4">
          <div className="w-14 h-14 bg-[#1c1c1c] rounded-2xl flex items-center justify-center text-[#3ecf8e] shadow-2xl border border-[#3ecf8e]/20 group transition-transform hover:scale-105">
            <Terminal size={32} />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-[#1c1c1c] tracking-tight uppercase">
              Royal <span className="text-[#3ecf8e]">Plaza</span>
            </h1>
            <p className="text-[11px] text-[#686868] font-black uppercase tracking-[0.3em] mt-1.5 opacity-70">Horizon Pro Console v2.8</p>
          </div>
        </div>

        {/* LOGIN CARD */}
        <div className="sb-card shadow-2xl border-[#ededed] p-10 md:p-12 bg-white rounded-2xl relative">
          <div className="mb-10">
            <h2 className="text-xl font-black text-[#1c1c1c] tracking-tight">Connexion Expert</h2>
            <p className="text-[13px] text-[#686868] mt-2 font-medium">Authentifiez-vous pour accéder au cluster SAV.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#1c1c1c] uppercase tracking-[0.2em] flex items-center gap-2">
                  <User size={12} className="text-[#3ecf8e]" /> Identifiant Système
                </label>
                <input 
                  type="text" 
                  value={username} 
                  onChange={e => setUsername(e.target.value)}
                  className="w-full h-12 bg-[#fcfcfc] border-[#ededed] focus:border-[#3ecf8e] transition-all font-bold text-sm px-4 rounded-xl"
                  placeholder="Email professionnel" 
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#1c1c1c] uppercase tracking-[0.2em] flex items-center gap-2">
                  <Lock size={12} className="text-[#3ecf8e]" /> Clé d'Accès
                </label>
                <input 
                  type="password" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)}
                  className="w-full h-12 bg-[#fcfcfc] border-[#ededed] focus:border-[#3ecf8e] transition-all font-bold text-sm px-4 rounded-xl"
                  placeholder="••••••••" 
                  required
                />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-3 text-[11px] font-bold text-red-600 bg-red-50 p-4 rounded-xl border border-red-100 animate-sb-entry">
                <AlertCircle size={18} className="shrink-0 mt-0.5 text-red-500" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            <button 
              type="submit" 
              disabled={isLoading}
              className="btn-sb-primary w-full justify-center h-12 mt-6 shadow-xl shadow-[#3ecf8e]/20 group rounded-xl text-[12px] font-black uppercase tracking-widest"
            >
              {isLoading ? (
                <Loader2 size={24} className="animate-spin" />
              ) : (
                <>
                  <span>Ouvrir la session</span> 
                  <ArrowRight size={20} className="group-hover:translate-x-1.5 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-[#f5f5f5] text-center">
            <p className="text-[10px] text-[#9ca3af] font-bold leading-relaxed uppercase tracking-tight">
              Usage interne restreint • Protocoles ISO-Plaza 2026
            </p>
          </div>
        </div>

        {/* FOOTER INFO */}
        <div className="mt-10 flex justify-between items-center px-4">
          <p className="text-[10px] text-[#9ca3af] font-black uppercase tracking-widest">© GABON • INFRA 01</p>
          <div className="flex items-center gap-2 text-[10px] text-[#3ecf8e] font-black uppercase tracking-widest bg-[#f0fdf4] px-3 py-1 rounded-full border border-[#dcfce7]">
            <ShieldCheck size={14}/> 
            <span>Gouvernance Plaza</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
