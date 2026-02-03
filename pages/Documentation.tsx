
import React from 'react';
import { 
  BookOpen, Lock, Wrench, Package, Zap, 
  ChevronRight, Printer, Search, ShieldCheck,
  Terminal, FileText, HelpCircle, ArrowUpRight
} from 'lucide-react';
import { useNotifications } from '../App';

const Documentation: React.FC = () => {
  const { addNotification } = useNotifications();

  const sections = [
    { 
      title: "Sécurité & Accès", 
      icon: <Lock />, 
      bg: "bg-blue-50", 
      color: "text-blue-600", 
      items: ["Gestion des Rôles IAM", "Double Authentification Cloud", "Audit des Sessions Actives"] 
    },
    { 
      title: "SAV & Flux Opérationnels", 
      icon: <Wrench />, 
      bg: "bg-[#f0fdf4]", 
      color: "text-[#3ecf8e]", 
      items: ["Triage Intelligent par IA", "Protocoles d'Intervention", "Clôture Financière Dossiers"] 
    },
    { 
      title: "Stock & Rechanges", 
      icon: <Package />, 
      bg: "bg-amber-50", 
      color: "text-amber-600", 
      items: ["Standardisation SKU", "Seuils d'Alerte Critique", "Traçabilité des Mouvements"] 
    },
    { 
      title: "Moteur IA Gemini", 
      icon: <Zap />, 
      bg: "bg-purple-50", 
      color: "text-purple-700", 
      items: ["Configuration Pro vs Flash", "Génération d'Audits Stratégiques", "Assistance Conversationnelle"] 
    }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-sb-entry pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1c1c1c] tracking-tight">Horizon Wiki</h1>
          <p className="text-xs text-[#686868] mt-1 font-medium">Documentation technique et procédures opérationnelles Royal Plaza.</p>
        </div>
        <button 
          onClick={() => window.print()} 
          className="btn-sb-outline h-10 px-4 group"
        >
          <Printer size={16} className="group-hover:text-[#3ecf8e]" /> <span>Imprimer Procedure</span>
        </button>
      </header>

      {/* Search Documentation */}
      <div className="relative group no-print">
         <Search className="absolute left-4 top-3.5 text-[#686868] group-focus-within:text-[#3ecf8e] transition-colors" size={20} />
         <input 
            type="text" 
            placeholder="Rechercher une procédure technique (ex: Nettoyage split, Code erreur LG...)" 
            className="w-full pl-12 h-12 bg-white border border-[#ededed] rounded-lg text-sm shadow-sm focus:border-[#3ecf8e] transition-all" 
         />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sections.map((sec, i) => (
          <div key={i} className="sb-card hover:border-[#3ecf8e] transition-all group border-[#ededed]">
             <div className="flex items-center gap-4 mb-6">
                <div className={`w-12 h-12 ${sec.bg} ${sec.color} rounded-xl flex items-center justify-center shadow-sm`}>
                  {React.cloneElement(sec.icon as React.ReactElement, { size: 22 })}
                </div>
                <h2 className="text-base font-bold text-[#1c1c1c]">{sec.title}</h2>
             </div>
             <ul className="space-y-1">
                {sec.items.map((item, idx) => (
                  <li key={idx} className="flex items-center justify-between p-3 rounded-md hover:bg-[#f8f9fa] cursor-pointer group/item transition-colors">
                     <span className="text-xs font-bold text-[#4b5563] group-hover/item:text-[#1c1c1c]">{item}</span>
                     <ArrowUpRight size={14} className="text-[#dadce0] group-hover/item:text-[#3ecf8e] transition-all" />
                  </li>
                ))}
             </ul>
          </div>
        ))}
      </div>

      {/* Useful links / FAQ style */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Glossaire Technique', icon: <FileText size={18}/> },
          { label: 'Codes Erreurs Marques', icon: <Terminal size={18}/> },
          { label: 'Support Itinérant', icon: <HelpCircle size={18}/> }
        ].map((item, i) => (
          <button key={i} className="btn-sb-outline h-14 justify-between w-full px-6 font-bold text-xs uppercase tracking-widest">
            <div className="flex items-center gap-3">
              <span className="text-[#3ecf8e]">{item.icon}</span>
              {item.label}
            </div>
            <ChevronRight size={14} className="text-[#686868]"/>
          </button>
        ))}
      </div>

      {/* Certification Footer */}
      <section className="bg-[#1c1c1c] text-white p-10 rounded-2xl overflow-hidden relative shadow-xl">
         <div className="absolute top-0 right-0 w-64 h-64 bg-[#3ecf8e]/10 rounded-full blur-[100px] -mr-32 -mt-32" />
         <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
            <div className="w-20 h-20 bg-[#3ecf8e]/20 text-[#3ecf8e] rounded-3xl flex items-center justify-center shadow-2xl border border-[#3ecf8e]/30">
               <ShieldCheck size={40}/>
            </div>
            <div className="flex-1 text-center md:text-left">
               <h3 className="text-xl font-bold tracking-tight">Certification Expert Horizon</h3>
               <p className="text-[#9ca3af] mt-2 text-sm leading-relaxed max-w-2xl">
                 Les guides présents dans ce Wiki respectent les standards de qualité ISO-Plaza. 
                 Toute modification des protocoles officiels nécessite une validation par le Responsable Technique.
               </p>
            </div>
            <button className="bg-[#3ecf8e] text-[#1c1c1c] font-black uppercase text-[11px] tracking-widest px-8 h-12 rounded-lg hover:bg-[#34b27b] transition-colors shadow-lg shadow-[#3ecf8e]/20">
               Demander Accès Root
            </button>
         </div>
      </section>
    </div>
  );
};

export default Documentation;
