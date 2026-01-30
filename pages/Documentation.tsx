
import React from 'react';
import { 
  Cloud, Lock, LayoutDashboard, MessageSquare, Users, Package, Printer
} from 'lucide-react';
import { useNotifications } from '../App';

const Documentation: React.FC = () => {
  const { addNotification } = useNotifications();

  const handleExportPDF = () => {
    addNotification({ title: 'Exportation', message: 'Preparation du manuel...', type: 'info' });
    setTimeout(() => window.print(), 500);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 max-w-5xl mx-auto print:p-0">
      <header className="flex items-center justify-between no-print">
        <div>
          <h1 className="text-2xl font-normal text-[#3c4043]">Documentation Horizon</h1>
          <p className="text-[#5f6368] text-sm">Manuel d'utilisation Royal Plaza.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExportPDF} className="btn-google-outlined flex items-center gap-2">
            <Printer size={16} /> Imprimer
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="google-card p-6">
          <div className="flex items-center gap-3 text-[#1a73e8] mb-4">
            <Cloud size={20} />
            <h2 className="text-sm font-medium text-[#3c4043]">Cloud & Synchronisation</h2>
          </div>
          <p className="text-xs text-[#5f6368] leading-relaxed">
            Horizon utilise une architecture Offline-First. Les donnees sont synchronisees avec le serveur central des qu'une connexion est etablie.
          </p>
        </div>

        <div className="google-card p-6">
          <div className="flex items-center gap-3 text-[#1a73e8] mb-4">
            <Lock size={20} />
            <h2 className="text-sm font-medium text-[#3c4043]">Securite</h2>
          </div>
          <p className="text-xs text-[#5f6368] leading-relaxed">
            L'acces est segmente par roles : ADMIN, MANAGER, AGENT et TECHNICIEN.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Documentation;
