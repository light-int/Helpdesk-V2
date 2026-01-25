
import React, { useState } from 'react';
import { 
  FileText, Printer, Cloud, Shield, Ticket as TicketIcon, 
  Wallet, HardHat, ShieldCheck, Zap, Trophy, 
  BookOpen, Code2, Server, Globe, Cpu, 
  Layers, CheckCircle2, AlertCircle, Info,
  Search, ExternalLink, Download, ArrowUpRight,
  Settings, Users, Briefcase, Activity, Package,
  ShoppingBag, Trash2, Upload, Database, ChevronRight,
  ClipboardCheck, ClipboardList, BarChart3, Lock, UserPlus, Wrench, 
  AlertTriangle, Filter, CheckSquare, ShieldAlert, X, Hash, Tag,
  Wifi, Award
} from 'lucide-react';
import { useNotifications } from '../App';

const Documentation: React.FC = () => {
  const { addNotification } = useNotifications();
  const [activeTab, setActiveTab] = useState<string>('intro');

  const handleExportPDF = () => {
    addNotification({ 
      title: 'Système Horizon', 
      message: 'Préparation du manuel technique pour impression...', 
      type: 'info' 
    });
    setTimeout(() => window.print(), 500);
  };

  const tabs = [
    { id: 'intro', label: 'Vue d\'ensemble', icon: <Globe size={18} /> },
    { id: 'workflow', label: 'Workflow SAV', icon: <Layers size={18} /> },
    { id: 'products', label: 'Guide Catalogue', icon: <ShoppingBag size={18} /> },
    { id: 'finance', label: 'Analytique Finance', icon: <Wallet size={18} /> },
    { id: 'tech', label: 'Architecture', icon: <Cpu size={18} /> },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-24 max-w-6xl mx-auto print:m-0 print:max-w-none">
      
      {/* HEADER */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 no-print">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[#1a73e8]">
            <BookOpen size={24} />
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Manuel Opérationnel v3.1</span>
          </div>
          <h1 className="text-3xl font-black text-[#202124] uppercase tracking-tight">Documentation Horizon</h1>
          <p className="text-[#5f6368] text-sm font-medium">Standard d'excellence pour la gestion de l'équipement de maison et bureau.</p>
        </div>
        <button 
          onClick={handleExportPDF}
          className="btn-google-primary px-8 py-3 shadow-lg shadow-blue-600/20"
        >
          <Printer size={18} /> Imprimer le Manuel
        </button>
      </header>

      {/* NAVIGATION INTERACTIVE */}
      <div className="flex items-center gap-1 p-1 bg-[#f1f3f4] rounded-xl no-print">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-3 py-3 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === tab.id 
                ? 'bg-white text-[#1a73e8] shadow-sm' 
                : 'text-[#5f6368] hover:bg-white/50'
            }`}
          >
            {tab.icon}
            <span className="hidden md:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="space-y-12">
        
        {/* SECTION: WORKFLOW SAV GLOBAL */}
        {activeTab === 'workflow' && (
          <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-500">
            <div className="bg-[#202124] text-white p-10 rounded-3xl relative overflow-hidden">
               <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600 rounded-full blur-[120px] opacity-20 -translate-y-1/2 translate-x-1/2" />
               <h2 className="text-2xl font-black uppercase tracking-[0.2em] mb-12 flex items-center gap-4">
                  <Activity className="text-blue-400" /> Le Cycle de Vie du Ticket
               </h2>
               
               <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative z-10">
                  {[
                    { title: "Saisie & Diagnostic", desc: "Ouverture du dossier via WhatsApp/Email. L'IA Gemini analyse la panne et définit la priorité.", icon: <Zap /> },
                    { title: "Dispatch Expert", desc: "Assignation au technicien selon sa spécialité (Clim, Frigo, Mobilier) et sa charge actuelle.", icon: <UserPlus /> },
                    { title: "Rapport Technique", desc: "Saisie terrain des pièces utilisées et actions menées. Calcul automatique de la marge.", icon: <Wrench /> },
                    { title: "Audit & Clôture", desc: "Validation manager du paiement et des stocks. Passage en statut 'Fermé' définitif.", icon: <ShieldCheck /> }
                  ].map((step, i) => (
                    <div key={i} className="flex flex-col gap-4">
                       <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center font-black text-xl shadow-lg">{i+1}</div>
                       <h4 className="text-xs font-black uppercase tracking-widest text-blue-400">{step.title}</h4>
                       <p className="text-[11px] text-gray-400 leading-relaxed">{step.desc}</p>
                    </div>
                  ))}
               </div>
            </div>
          </div>
        )}

        {/* SECTION: CATALOGUE PRODUITS */}
        {activeTab === 'products' && (
          <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-500">
            <div className="google-card p-10 bg-white shadow-xl">
               <div className="flex items-center gap-6 mb-10">
                  <div className="w-16 h-16 bg-[#e8f0fe] rounded-2xl flex items-center justify-center text-[#1a73e8]">
                    <ShoppingBag size={32} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-[#202124] uppercase tracking-tight">Le Catalogue Produits</h2>
                    <p className="text-[#5f6368] text-sm">Référentiel unique pour la traçabilité des équipements.</p>
                  </div>
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                  <section className="space-y-6">
                    <h3 className="text-xs font-black text-[#202124] uppercase tracking-widest border-b pb-4">Fonctionnalités de la page</h3>
                    <div className="space-y-6">
                       <div className="flex gap-4">
                          <div className="p-3 bg-[#f8f9fa] rounded-xl text-[#1a73e8] h-fit"><Search size={20}/></div>
                          <div>
                             <p className="text-xs font-black uppercase text-[#202124]">Recherche Prédictive</p>
                             <p className="text-[11px] text-[#5f6368] mt-1 leading-relaxed">Filtre instantané sur les références constructeurs, les noms commerciaux et les marques.</p>
                          </div>
                       </div>
                       <div className="flex gap-4">
                          <div className="p-3 bg-[#f8f9fa] rounded-xl text-[#1a73e8] h-fit"><Upload size={20}/></div>
                          <div>
                             <p className="text-xs font-black uppercase text-[#202124]">Importation XLSX</p>
                             <p className="text-[11px] text-[#5f6368] mt-1 leading-relaxed">Assistant intelligent pour injecter massivement des catalogues fournisseurs.</p>
                          </div>
                       </div>
                    </div>
                  </section>

                  <section className="space-y-6">
                    <h3 className="text-xs font-black text-[#202124] uppercase tracking-widest border-b pb-4">Intégrité des données</h3>
                    <div className="p-6 bg-amber-50 border border-amber-200 rounded-3xl">
                       <p className="text-[11px] text-amber-700 leading-relaxed">
                         Le système empêche la suppression d'un produit si celui-ci possède un historique SAV actif. Cela garantit la traçabilité des numéros de série vendus.
                       </p>
                    </div>
                  </section>
               </div>
            </div>
          </div>
        )}

        {/* SECTION: ANALYTIQUE FINANCE */}
        {activeTab === 'finance' && (
          <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-500">
             <div className="google-card p-10">
                <div className="flex items-center gap-6 mb-12">
                  <div className="w-16 h-16 bg-[#e6f4ea] rounded-2xl flex items-center justify-center text-[#34a853]">
                    <BarChart3 size={32} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-[#202124] uppercase tracking-tight">Pilotage Financier</h2>
                    <p className="text-[#5f6368] text-sm">Gouvernance de la marge et des performances RH.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="p-8 bg-[#f8f9fa] border border-[#dadce0] rounded-3xl space-y-4">
                      <div className="flex items-center gap-3 text-[#1a73e8]">
                        <Award size={20} />
                        <h4 className="text-xs font-black uppercase tracking-widest">Onglet Performance Élite</h4>
                      </div>
                      <p className="text-[11px] text-[#5f6368] leading-relaxed">
                        Analyse la rentabilité nette par technicien. Calcule le CA brut généré, les coûts (pièces/déplacement) et déduit la marge réelle. Permet de piloter les primes de rendement.
                      </p>
                   </div>
                   <div className="p-8 bg-[#f8f9fa] border border-[#dadce0] rounded-3xl space-y-4">
                      <div className="flex items-center gap-3 text-[#fbbc04]">
                        <ClipboardList size={20} />
                        <h4 className="text-xs font-black uppercase tracking-widest">Onglet Volume Expert</h4>
                      </div>
                      <p className="text-[11px] text-[#5f6368] leading-relaxed">
                        Mesure l'activité brute des experts. Même si une intervention n'est pas rentable (SAV sous garantie complexe), elle est comptabilisée ici pour valoriser le volume de travail terrain.
                      </p>
                   </div>
                </div>
             </div>
          </div>
        )}

        {/* ARCHITECTURE */}
        {activeTab === 'tech' && (
          <div className="google-card p-10 space-y-8 animate-in slide-in-from-bottom-4">
             <div className="flex items-center gap-4">
                <Server size={28} className="text-[#1a73e8]" />
                <h3 className="text-xl font-black text-[#202124] uppercase tracking-tight">Sécurité & Résilience Cloud</h3>
             </div>
             <p className="text-sm text-[#5f6368] leading-relaxed max-w-2xl font-medium">
               Horizon fonctionne sur une architecture <strong>Offline-Sync</strong> via Supabase et PostgreSQL v16.
             </p>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
                <div className="p-4 bg-green-50 border border-green-100 rounded-xl flex items-center gap-3">
                   <Lock size={18} className="text-green-600" />
                   <span className="text-[10px] font-black uppercase text-green-800">Accès RLS Actif</span>
                </div>
                <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-center gap-3">
                   <Database size={18} className="text-blue-600" />
                   <span className="text-[10px] font-black uppercase text-blue-800">AES-256 Cloud</span>
                </div>
                <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl flex items-center gap-3">
                   <Wifi size={18} className="text-amber-600" />
                   <span className="text-[10px] font-black uppercase text-amber-800">Sync Real-time</span>
                </div>
             </div>
          </div>
        )}
      </div>

      <footer className="pt-16 border-t-2 border-[#f1f3f4] flex flex-col md:flex-row items-center justify-between gap-10 no-print">
         <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#202124] flex items-center justify-center text-white">
               <ShieldCheck size={24} />
            </div>
            <div>
               <p className="text-xs font-black uppercase tracking-widest text-[#202124]">Royal Plaza Horizon System</p>
               <p className="text-[10px] font-medium text-[#5f6368]">Certification Qualité LG & Beko West Africa.</p>
            </div>
         </div>
      </footer>
    </div>
  );
};

export default Documentation;
