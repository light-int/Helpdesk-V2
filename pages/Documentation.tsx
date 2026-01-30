
import React from 'react';
import { 
  Cloud, Lock, MessageSquare, Users, Package, Printer,
  BookOpen, ShieldCheck, Zap, Server, Globe, Search, ChevronRight,
  ArrowUpRight, FileText, Wrench
} from 'lucide-react';
import { useNotifications } from '../App';

const Documentation: React.FC = () => {
  const { addNotification } = useNotifications();

  const handleExportPDF = () => {
    addNotification({ title: 'Exportation', message: 'Préparation du manuel technique...', type: 'info' });
    setTimeout(() => window.print(), 500);
  };

  const sections = [
    { title: "Accès & Sécurité", icon: <Lock size={24} />, color: "text-[#1a73e8]", items: ["Gestion des rôles", "Sessions cloud", "Audit des logs"] },
    { title: "Flux SAV & Maintenance", icon: <Wrench size={24} />, color: "text-[#188038]", items: ["Ouverture dossiers", "Rapports d'intervention", "Clôture financière"] },
    { title: "Inventaire & Stock", icon: <Package size={24} />, color: "text-[#f9ab00]", items: ["Importation Excel", "Alertes SLA", "Traçabilité"] },
    { title: "Intelligence IA", icon: <Zap size={24} />, color: "text-[#a142f4]", items: ["Auto-classification", "Audits stratégiques", "Assistance Live"] }
  ];

  return (
    <div className="space-y-12 animate-page-entry pb-20 max-w-6xl mx-auto print:p-0">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 no-print">
        <div>
           <div className="flex items-center gap-3 text-[#1a73e8] mb-2"><BookOpen size={24} /><span className="text-[10px] font-black uppercase tracking-[0.4em]">Horizon Wiki</span></div>
           <h1 className="text-3xl font-light text-[#202124]">Base de Connaissances</h1>
           <p className="text-sm text-[#5f6368] mt-2 font-medium">Manuel opérationnel Royal Plaza Gabon.</p>
        </div>
        <button onClick={handleExportPDF} className="btn-google-outlined h-11 px-6 shadow-sm"><Printer size={18} /> <span>Imprimer Manuel</span></button>
      </header>

      <div className="relative no-print group">
         <Search className="absolute left-6 top-5 text-[#9aa0a6] group-focus-within:text-[#1a73e8] transition-colors" size={24} />
         <input type="text" placeholder="Rechercher une procédure..." className="w-full h-16 pl-16 bg-white border border-[#dadce0] text-base font-bold shadow-xl shadow-gray-100/50 focus:ring-2 focus:ring-blue-100 transition-all" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {sections.map((section, idx) => (
          <div key={idx} className="bg-white border border-[#dadce0] p-10 space-y-8 hover:border-[#1a73e8] transition-all shadow-sm">
             <div className="flex items-center gap-5">
                <div className={`p-4 bg-[#f8f9fa] ${section.color} border border-transparent shadow-inner`}>{section.icon}</div>
                <h2 className="text-lg font-black text-[#202124] uppercase tracking-tight">{section.title}</h2>
             </div>
             <ul className="space-y-4">
                {section.items.map((item, i) => (
                  <li key={i} className="flex items-center justify-between group cursor-pointer border-b border-gray-50 pb-3 hover:border-blue-100 transition-colors">
                     <span className="text-sm text-[#5f6368] group-hover:text-[#1a73e8] transition-colors font-medium">{item}</span>
                     <ChevronRight size={16} className="text-gray-200 group-hover:text-[#1a73e8] transition-all translate-x-0 group-hover:translate-x-1" />
                  </li>
                ))}
             </ul>
          </div>
        ))}
      </div>

      <section className="bg-[#202124] text-white p-12 space-y-8 shadow-2xl relative overflow-hidden">
         <div className="absolute top-0 right-0 w-64 h-64 bg-[#1a73e8] rounded-full -mr-32 -mt-32 opacity-20 blur-3xl" />
         <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
            <div className="w-20 h-20 bg-[#1a73e8] flex items-center justify-center shadow-2xl"><ShieldCheck size={40} /></div>
            <div className="flex-1 space-y-2 text-center md:text-left">
               <h2 className="text-xl font-black uppercase tracking-tight">Certification Horizon Expert</h2>
               <p className="text-sm text-gray-400 leading-relaxed font-medium">Toutes les procédures documentées ici respectent les standards de qualité Royal Plaza. L'accès aux réglages avancés nécessite une validation ADMIN.</p>
            </div>
            <button className="btn-google-primary bg-white text-[#202124] hover:bg-gray-100 border-none px-8 py-4 font-black no-print">IT Support</button>
         </div>
      </section>
    </div>
  );
};

export default Documentation;
