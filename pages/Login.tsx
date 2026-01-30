
import React, { useState } from 'react';
import { ArrowRight, ShieldCheck, Loader2, AlertCircle } from 'lucide-react';
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
      // Synchronisation Super Admin si nécessaire
      const users: UserProfile[] = await ApiService.users.getAll();
      
      // Si la base est vide ou si on tente l'admin par défaut
      if (users.length === 0 && username.toLowerCase() === 'admin' && password === 'intxxl') {
        const firstAdmin: UserProfile = {
          id: 'U-ADMIN-001', 
          name: 'Super Administrateur Horizon', 
          role: 'ADMIN', 
          email: 'admin@royalplaza.ga',
          password: 'intxxl',
          avatar: 'https://ui-avatars.com/api/?name=Admin&background=1a73e8&color=ffffff', 
          status: 'Actif', 
          showroom: 'Glass'
        };
        await ApiService.users.save(firstAdmin);
        await ApiService.users.logConnection(firstAdmin.id);
        login(firstAdmin);
        addNotification({ title: 'Initialisation Système', message: 'Compte Super Admin synchronisé avec le Cloud.', type: 'info' });
        return;
      }

      // Recherche utilisateur classique
      const user = users.find((u: UserProfile) => 
        (u.email?.toLowerCase() === username.toLowerCase() || u.name.toLowerCase() === username.toLowerCase()) && 
        u.password === password
      );

      if (user) {
        await ApiService.users.logConnection(user.id);
        login(user);
        addNotification({ title: 'Système Horizon', message: `Bienvenue, ${user.name}. Session authentifiée.`, type: 'success' });
      } else {
        setError("Identifiants non reconnus. Veuillez contacter l'administrateur IT.");
      }
    } catch (err) {
      console.error("Login sync error:", err);
      setError("Erreur critique de communication avec le Cloud Supabase.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-[420px] animate-in fade-in zoom-in-95 duration-500">
        <div className="bg-white p-10 border border-[#dadce0] shadow-md">
           <div className="mb-10 flex flex-col items-center gap-2">
              <div className="w-16 h-16 bg-[#1a73e8] flex items-center justify-center text-white mb-4">
                 <ShieldCheck size={36} />
              </div>
              <h1 className="text-2xl font-light text-[#3c4043] tracking-tight">
                Royal <span className="font-bold text-[#1a73e8]">Plaza</span>
              </h1>
              <p className="text-[10px] text-[#5f6368] uppercase tracking-[0.3em] font-black mt-1">Intelligence Helpdesk v2.8</p>
           </div>

           <form onSubmit={handleLogin} className="w-full space-y-6">
              <div className="space-y-5">
                <div className="space-y-1.5">
                   <label className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest ml-1">Identifiant Email</label>
                   <input 
                    type="text" value={username} onChange={e => setUsername(e.target.value)}
                    className="w-full"
                    placeholder="ex: admin@royalplaza.ga"
                    required
                   />
                </div>
                <div className="space-y-1.5">
                   <label className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest ml-1">Clé d'Accès</label>
                   <input 
                    type="password" value={password} onChange={e => setPassword(e.target.value)}
                    className="w-full"
                    placeholder="••••••••"
                    required
                   />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-3 text-[11px] font-bold text-[#d93025] bg-red-50 p-3 border border-red-100">
                   <AlertCircle size={16} className="shrink-0" />
                   <span>{error}</span>
                </div>
              )}

              <button 
                type="submit" disabled={isLoading}
                className="btn-google-primary w-full justify-center h-12 mt-4"
              >
                {isLoading ? <Loader2 size={20} className="animate-spin" /> : <>Se connecter <ArrowRight size={18}/></>}
              </button>
           </form>
        </div>

        <div className="flex justify-between items-center py-6 px-2 text-[9px] text-[#9aa0a6] font-bold uppercase tracking-widest">
           <p>© 2026 GABON • INFRASTRUCTURE CLOUD</p>
           <p>Gouvernance Royal Plaza</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
