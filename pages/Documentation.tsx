
import React from 'react';
import { 
  BookOpen, Lock, Wrench, Package, Zap, 
  ChevronRight, Printer, Search, ShieldCheck
} from 'lucide-react';
import { useNotifications } from '../App';

const Documentation: React.FC = () => {
  const { addNotification } = useNotifications();

  const sections = [
    { title: "Sécurité & Accès", icon: <Lock />, bg: "bg-[#d3e3fd]", color: "text-[#0b57d0]", items: ["Rôles IAM", "MFA Cloud", "Audit Sessions"] },
    { title: "SAV & Flux", icon: <Wrench />, bg: "bg-[#c4eed0]", color: "text-[#137333]", items: ["Triage IA", "Interventions", "Clôture"] },
    { title: "Stock & Rechanges", icon: <Package />, bg: "bg-[#ffdec2]", color: "text-[#b06000]", items: ["SKU Management", "Seuils Alerte", "Traçabilité"] },
    { title: "Moteur Gemini", icon: <Zap />, bg: "bg-[#f8f0ff]", color: "text-purple-700", items: ["Modèles Pro/Flash", "Strategic Audits", "Chat Assist"] }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-m3-entry pb-20">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-normal text-[#1f1f1f]">Horizon Wiki</h1>
          <p className="text-sm text-[#747775] mt-1">Documentation technique et opérationnelle</p>
        </div>
        <button onClick={() => window.print()} className="btn-md-tonal"><Printer size={18} /> <span>Imprimer</span></button>
      </header>

      <div className="relative group no-print">
         <Search className="absolute left-6 top-5 text-[#444746]" size={24} />
         <input type="text" placeholder="Rechercher une procédure technique..." className="w-full pl-16 h-16 bg-[#f0f4f9] border-none rounded-[28px] text-lg focus:bg-white focus:ring-2 focus:ring-[#0b57d0] transition-all" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {sections.map((sec, i) => (
          <div key={i} className="md-card bg-white border border-[#e3e3e3] hover:border-[#0b57d0] transition-all group">
             <div className="flex items-center gap-5 mb-8">
                <div className={`w-14 h-14 ${sec.bg} ${sec.color} rounded-2xl flex items-center justify-center shadow-sm`}>
                  {React.cloneElement(sec.icon as React.ReactElement, { size: 28 })}
                </div>
                <h2 className="text-lg font-bold text-[#1f1f1f]">{sec.title}</h2>
             </div>
             <ul className="space-y-2">
                {sec.items.map((item, idx) => (
                  <li key={idx} className="flex items-center justify-between p-3 rounded-xl hover:bg-[#f0f4f9] cursor-pointer group/item transition-colors">
                     <span className="text-sm font-medium text-[#444746] group-hover/item:text-[#0b57d0]">{item}</span>
                     <ChevronRight size={16} className="text-[#c4c7c5] group-hover/item:text-[#0b57d0] transition-all" />
                  </li>
                ))}
             </ul>
          </div>
        ))}
      </div>

      <section className="md-card bg-[#1f1f1f] text-white p-12 overflow-hidden relative">
         <div className="absolute top-0 right-0 w-64 h-64 bg-[#0b57d0]/20 rounded-full blur-3xl -mr-32 -mt-32" />
         <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
            <div className="w-20 h-20 bg-[#0b57d0] rounded-3xl flex items-center justify-center shadow-2xl"><ShieldCheck size={40}/></div>
            <div className="flex-1 text-center md:text-left">
               <h3 className="text-2xl font-bold tracking-tight">Certification Horizon Expert</h3>
               <p className="text-[#c4c7c5] mt-2 leading-relaxed">Les guides présents dans ce Wiki respectent les directives de qualité Royal Plaza. Toute modification nécessite une clé d'accès Administrateur.</p>
            </div>
            <button className="btn-md-primary bg-white !text-[#1f1f1f] hover:bg-[#f0f4f9] border-none px-10 h-14">Support IT</button>
         </div>
      </section>
    </div>
  );
};

export default Documentation;
