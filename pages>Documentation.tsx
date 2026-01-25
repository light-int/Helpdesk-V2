
import React from 'react';
import { 
  Cloud, Lock, LayoutDashboard, MessageSquare, Users, Package, HardHat, Scale, FileDown, Printer, FileText
} from 'lucide-react';
import { useNotifications } from '../App';

const Documentation: React.FC = () => {
  const { addNotification } = useNotifications();

  const handleExportPDF = () => {
    addNotification({ title: 'Exportation', message: 'Préparation du manuel technique...', type: 'info' });
    setTimeout(() => window.print(), 500);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 max-w-5xl mx-auto print:p-0">
      <header className="flex items-center justify-between no-print">
        <div>
          <h1 className="text-2xl font-normal text-[#3c4043]">Documentation Horizon</h1>
          <p className="text-[#5f6368] text-sm">Manuel d'utilisation et procédures techniques.</p>
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
            Horizon utilise une architecture "Offline-First". Les données sont stockées localement pour garantir la rapidité en showroom, puis synchronisées avec le serveur central dès qu'une connexion est établie.
          </p>
        </div>

        <div className="google-card p-6">
          <div className="flex items-center gap-3 text-[#1a73e8] mb-4">
            <Lock size={20} />
            <h2 className="text-sm font-medium text-[#3c4043]">Sécurité & Rôles</h2>
          </div>
          <p className="text-xs text-[#5f6368] leading-relaxed">
            L'accès est segmenté par rôles : ADMIN (Accès total), MANAGER (Suivi financier), AGENT (Service client) et TECHNICIEN (Interventions).
          </p>
        </div>
      </div>

      <div className="google-card overflow-hidden">
        <div className="px-6 py-4 border-b border-[#dadce0] bg-[#f8f9fa]">
          <h2 className="text-sm font-medium text-[#3c4043]">Modules opérationnels</h2>
        </div>
        <div className="divide-y divide-[#dadce0]">
          {[
            { icon: <LayoutDashboard size={18}/>, name: 'Tableau de bord', desc: 'Analyse des KPI et du flux de tickets en temps réel.' },
            { icon: <MessageSquare size={18}/>, name: 'Inbox Omnicanale', desc: 'Centralisation WhatsApp, Messenger et Email.' },
            { icon: <Users size={18}/>, name: 'Base Clients', desc: 'Gestion du CRM et de l\'historique des interventions.' },
            { icon: <Package size={18}/>, name: 'Stocks & Pièces', desc: 'Inventaire et alertes de seuil critique.' },
          ].map((module, i) => (
            <div key={i} className="px-6 py-4 flex items-start gap-4 hover:bg-[#f8f9fa] transition-colors">
              <div className="text-[#1a73e8] mt-1">{module.icon}</div>
              <div>
                 <h3 className="text-sm font-medium text-[#3c4043]">{module.name}</h3>
                 <p className="text-xs text-[#5f6368] mt-1">{module.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Documentation;
