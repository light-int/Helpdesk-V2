
import React, { useState } from 'react';
import { ArrowRight, ShieldCheck, Loader2, AlertCircle, LayoutGrid } from 'lucide-react';
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
      if (users.length === 0 && username.toLowerCase() === 'admin' && password === 'intxxl') {
        const firstAdmin: UserProfile = {
          id: 'U-ADMIN-01', name: 'Admin Root', role: 'ADMIN', 
          email: 'admin@royalplaza.ga', password: 'intxxl',
          avatar: 'https://ui-avatars.com/api/?name=Admin&background=0b57d0&color=ffffff', 
          status: 'Actif', showroom: 'Glass'
        };
        await ApiService.users.save(firstAdmin);
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
      setError("Communication interrompue avec le Cloud.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafd] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-[420px] animate-m3-entry">
        <div className="bg-white p-12 rounded-[40px] border border-[#e3e3e3] shadow-xl">
           <div className="mb-12 flex flex-col items-center gap-4">
              <div className="w-16 h-16 bg-[#d3e3fd] text-[#0b57d0] rounded-[24px] flex items-center justify-center shadow-sm">
                 <LayoutGrid size={32} />
              </div>
              <div className="text-center">
                <h1 className="text-2xl font-bold text-[#1f1f1f] tracking-tight">Horizon <span className="text-[#0b57d0] font-light">Cloud</span></h1>
                <p className="text-[10px] text-[#747775] font-black uppercase tracking-[0.3em] mt-1">Intelligence SAV v2.8</p>
              </div>
           </div>

           <form onSubmit={handleLogin} className="w-full space-y-6">
              <div className="space-y-4">
                <div className="space-y-1.5">
                   <label className="text-[10px] font-bold text-[#444746] uppercase tracking-widest ml-1">Identifiant Expert</label>
                   <input 
                    type="text" value={username} onChange={e => setUsername(e.target.value)}
                    className="w-full rounded-2xl h-12 bg-[#f0f4f9] border-none font-medium"
                    placeholder="Email ou Username" required
                   />
                </div>
                <div className="space-y-1.5">
                   <label className="text-[10px] font-bold text-[#444746] uppercase tracking-widest ml-1">Clé d'Accès</label>
                   <input 
                    type="password" value={password} onChange={e => setPassword(e.target.value)}
                    className="w-full rounded-2xl h-12 bg-[#f0f4f9] border-none font-medium"
                    placeholder="••••••••" required
                   />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-3 text-[11px] font-bold text-[#b3261e] bg-[#f9dedc] p-4 rounded-2xl">
                   <AlertCircle size={16} className="shrink-0" />
                   <span>{error}</span>
                </div>
              )}

              <button 
                type="submit" disabled={isLoading}
                className="btn-md-primary w-full justify-center h-14 mt-4 shadow-lg shadow-[#0b57d0]/20"
              >
                {isLoading ? <Loader2 size={24} className="animate-spin" /> : <>Se connecter <ArrowRight size={20}/></>}
              </button>
           </form>
        </div>

        <div className="flex justify-between items-center py-8 px-4 text-[9px] text-[#747775] font-black uppercase tracking-[0.2em]">
           <p>© 2026 GABON • CLOUD INFRA</p>
           <p className="flex items-center gap-2"><ShieldCheck size={12}/> Gouvernance Plaza</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
