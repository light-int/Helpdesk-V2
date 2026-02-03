
import React, { useState } from 'react';
import { ArrowRight, ShieldCheck, Loader2, AlertCircle, LayoutGrid, Terminal, Lock, User } from 'lucide-react';
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
      if ((users.length === 0 || !users) && username.toLowerCase() === 'admin' && password === 'intxxl') {
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
        addNotification({ title: 'Authentification', message: `Heureux de vous revoir, ${user.name}.`, type: 'success' });
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
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col items-center justify-center p-6 selection:bg-[#3ecf8e]/30">
      <div className="w-full max-w-[400px] animate-sb-entry">
        
        {/* BRANDING TOP */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="w-10 h-10 bg-[#1c1c1c] rounded-lg flex items-center justify-center text-[#3ecf8e] shadow-lg">
            <Terminal size={22} />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold text-[#1c1c1c] tracking-tight uppercase">
              Royal <span className="text-[#3ecf8e]">Plaza</span>
            </h1>
            <p className="text-[10px] text-[#686868] font-black uppercase tracking-[0.2em] mt-1">Horizon Pro v2.8</p>
          </div>
        </div>

        {/* LOGIN CARD */}
        <div className="sb-card shadow-xl border-[#ededed] p-8 md:p-10">
          <div className="mb-8">
            <h2 className="text-lg font-bold text-[#1c1c1c]">Connexion Expert</h2>
            <p className="text-xs text-[#686868] mt-1 font-medium">Accédez à votre console de gestion SAV.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-[#1c1c1c] uppercase tracking-widest flex items-center gap-2">
                  <User size={12} className="text-[#3ecf8e]" /> Identifiant
                </label>
                <input 
                  type="text" 
                  value={username} 
                  onChange={e => setUsername(e.target.value)}
                  className="w-full h-11 bg-white border-[#ededed] focus:border-[#3ecf8e] transition-all font-medium"
                  placeholder="Email ou Username" 
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-[#1c1c1c] uppercase tracking-widest flex items-center gap-2">
                  <Lock size={12} className="text-[#3ecf8e]" /> Clé d'Accès
                </label>
                <input 
                  type="password" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)}
                  className="w-full h-11 bg-white border-[#ededed] focus:border-[#3ecf8e] transition-all font-medium"
                  placeholder="••••••••" 
                  required
                />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-3 text-[11px] font-bold text-red-600 bg-red-50 p-4 rounded-lg border border-red-100 animate-sb-entry">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button 
              type="submit" 
              disabled={isLoading}
              className="btn-sb-primary w-full justify-center h-11 mt-4 shadow-lg shadow-[#3ecf8e]/10 group"
            >
              {isLoading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <>
                  <span>Authentification</span> 
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-[#f5f5f5]">
            <p className="text-[10px] text-[#9ca3af] text-center font-medium leading-relaxed">
              En vous connectant, vous acceptez les protocoles de sécurité et de confidentialité Royal Plaza.
            </p>
          </div>
        </div>

        {/* FOOTER INFO */}
        <div className="mt-8 flex justify-between items-center px-2">
          <p className="text-[9px] text-[#9ca3af] font-black uppercase tracking-widest">© 2026 GABON • INFRA CLOUD</p>
          <div className="flex items-center gap-1.5 text-[9px] text-[#3ecf8e] font-black uppercase tracking-widest">
            <ShieldCheck size={12}/> 
            <span>Gouvernance Plaza</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
