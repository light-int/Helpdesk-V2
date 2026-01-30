
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
      const users: UserProfile[] = await ApiService.users.getAll();
      const user = users.find((u: UserProfile) => 
        (u.email?.toLowerCase() === username.toLowerCase() || u.name.toLowerCase() === username.toLowerCase()) && 
        u.password === password
      );

      if (user) {
        await new Promise(r => setTimeout(r, 800));
        login(user);
        addNotification({ title: 'Système Horizon', message: `Content de vous revoir, ${user.name}.`, type: 'success' });
      } 
      else if (users.length === 0 && username.toLowerCase() === 'admin' && password === 'intxxl') {
        const firstAdmin: UserProfile = {
          id: 'U-01', 
          name: 'Administrateur Principal', 
          role: 'ADMIN', 
          email: 'admin@royalplaza.ga',
          password: 'intxxl',
          avatar: 'https://i.pravatar.cc/150?u=admin', 
          status: 'Actif', 
          showroom: 'Glass'
        };
        await ApiService.users.save(firstAdmin);
        login(firstAdmin);
        addNotification({ title: 'Initialisation', message: 'Compte Administrateur créé dans le Cloud.', type: 'info' });
      }
      else {
        setError("Identifiants incorrects ou compte introuvable.");
      }
    } catch (err) {
      setError("Erreur de communication avec le serveur Cloud.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-[450px] space-y-8 animate-in fade-in zoom-in-95 duration-500">
        <div className="bg-white p-8 md:p-10 google-card flex flex-col items-center">
           <div className="mb-8 flex flex-col items-center gap-2">
              <div className="w-16 h-16 bg-[#1a73e8] rounded-2xl flex items-center justify-center text-white mb-4 shadow-xl shadow-blue-600/20">
                 <ShieldCheck size={32} />
              </div>
              <h1 className="text-2xl font-normal text-[#3c4043]">
                Royal <span className="font-medium">Plaza</span>
              </h1>
              <p className="text-lg text-[#202124] mt-1 font-medium">Connexion Horizon</p>
              <p className="text-xs text-[#5f6368] uppercase tracking-widest font-black">Accès Restreint Personnel</p>
           </div>

           <form onSubmit={handleLogin} className="w-full space-y-6">
              <div className="space-y-4">
                <div className="space-y-1.5">
                   <label className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest ml-1">Identifiant ou Email</label>
                   <input 
                    type="text" value={username} onChange={e => setUsername(e.target.value)}
                    className="w-full h-12 text-base !border-[#dadce0]"
                    placeholder="ex: admin@royalplaza.ga"
                    required
                   />
                </div>
                <div className="space-y-1.5">
                   <label className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest ml-1">Mot de passe</label>
                   <input 
                    type="password" value={password} onChange={e => setPassword(e.target.value)}
                    className="w-full h-12 text-base !border-[#dadce0]"
                    placeholder="••••••••"
                    required
                   />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-3 text-xs font-bold text-[#d93025] bg-red-50 p-4 rounded-lg border border-red-100 animate-shake">
                   <AlertCircle size={18} className="shrink-0" />
                   <span>{error}</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-6">
                 <button type="button" className="text-sm font-bold text-[#1a73e8] hover:bg-[#e8f0fe] px-4 py-2 rounded-lg transition-colors">
                    Aide
                 </button>
                 <button 
                  type="submit" disabled={isLoading}
                  className="btn-google-primary min-w-[140px] justify-center py-3.5 shadow-lg shadow-blue-600/20"
                >
                  {isLoading ? <Loader2 size={18} className="animate-spin" /> : <div className="flex items-center gap-2">Se connecter <ArrowRight size={16}/></div>}
                </button>
              </div>
           </form>
        </div>

        <div className="flex justify-between items-center px-4 text-[10px] text-[#5f6368] font-black uppercase tracking-widest">
           <div className="flex gap-6">
              <button className="hover:text-[#1a73e8] transition-colors">Support</button>
              <button className="hover:text-[#1a73e8] transition-colors">Confidentialité</button>
           </div>
           <p>© 2026 GABON • HORIZON v2.7</p>
        </div>
      </div>
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake { animation: shake 0.2s ease-in-out 0s 2; }
      `}</style>
    </div>
  );
};

export default LoginPage;
