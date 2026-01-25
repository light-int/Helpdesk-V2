
import { useMemo, useState, useEffect } from 'react';
import { 
  TrendingUp, DollarSign, Activity, Sparkles, BrainCircuit, X,
  PieChart as PieIcon, BarChart3, Wallet, Map, Calendar,
  ClipboardList, Award, CheckCircle2, User, ChevronRight, 
  FileText, Loader2, FileDown, History, Trash2, CalendarDays, Eye
} from 'lucide-react';
import { XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart as ReChartsBarChart, Bar, Cell } from 'recharts';
import { useData, useNotifications } from '../App';
import { generateStrategicReport } from '../services/geminiService';
import { generatePDFFromElement } from '../services/pdfService';
import { marked } from 'marked';
import { StrategicReport } from '../types';
import Modal from '../components/Modal';

export default function Finances() {
  const { tickets: allTickets, showrooms, technicians, reports, saveReport, deleteReport, refreshAll } = useData();
  const { addNotification } = useNotifications();
  
  const [activeTab, setActiveTab] = useState<'overview' | 'performance' | 'volume' | 'history'>('overview');
  const [aiReportHtml, setAiReportHtml] = useState<string>('');
  const [currentReportMeta, setCurrentReportMeta] = useState<{start: string, end: string} | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [selectedTechId, setSelectedTechId] = useState<string | null>(null);
  const [showAiModal, setShowAiModal] = useState(false);
  
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  
  useEffect(() => { 
    refreshAll(); 
  }, []);

  const stats = useMemo(() => {
    const filteredByDate = allTickets.filter(t => {
      const ticketDate = t.createdAt.split('T')[0];
      return ticketDate >= startDate && ticketDate <= endDate;
    });

    const financialTickets = filteredByDate.filter(t => 
      t.financials && (t.status === 'Résolu' || t.status === 'Fermé')
    );
    
    const totalRev = financialTickets.reduce((acc, curr) => acc + (curr.financials?.grandTotal || 0), 0);
    const totalMargin = financialTickets.reduce((acc, curr) => acc + (curr.financials?.netMargin || 0), 0);
    
    const totalParts = financialTickets.reduce((acc, curr) => acc + (curr.financials?.partsTotal || 0), 0);
    const totalLabor = financialTickets.reduce((acc, curr) => acc + (curr.financials?.laborTotal || 0), 0);
    const totalLogistics = financialTickets.reduce((acc, curr) => acc + (curr.financials?.travelFee || 0), 0);

    const breakdownData = [
      { name: 'Pièces', value: totalParts, color: '#1a73e8' },
      { name: 'Main d\'œuvre', value: totalLabor, color: '#34a853' },
      { name: 'Logistique', value: totalLogistics, color: '#fbbc04' },
    ];

    const showroomFinancials = showrooms.map(s => {
      const showroomTickets = filteredByDate.filter(t => t.showroom === s.id);
      const rev = showroomTickets.reduce((acc, t) => acc + (t.financials?.grandTotal || 0), 0);
      const marg = showroomTickets.reduce((acc, t) => acc + (t.financials?.netMargin || 0), 0);
      return {
        name: s.id,
        revenue: rev,
        margin: marg,
        tickets: showroomTickets.length
      };
    });

    const technicianFinancials = technicians.map(tech => {
      const techTickets = filteredByDate.filter(t => t.assignedTechnicianId === tech.id);
      const closedOnPeriod = techTickets.filter(t => t.status === 'Résolu' || t.status === 'Fermé');
      const revenue = closedOnPeriod.reduce((acc, t) => acc + (t.financials?.grandTotal || 0), 0);
      const margin = closedOnPeriod.reduce((acc, t) => acc + (t.financials?.netMargin || 0), 0);
      
      return {
        id: tech.id,
        name: tech.name,
        avatar: tech.avatar,
        revenue,
        margin,
        tickets: techTickets.length, 
        closedTickets: closedOnPeriod.length,
        marginRate: revenue !== 0 ? (margin / revenue) * 100 : 0,
        detailedTickets: techTickets, 
        performanceTickets: closedOnPeriod 
      };
    }).sort((a, b) => b.revenue - a.revenue);

    return { 
      totalRev, 
      totalMargin, 
      count: financialTickets.length, 
      totalInterventions: filteredByDate.length,
      breakdownData, 
      showroomFinancials, 
      technicianFinancials,
      dateRange: { start: startDate, end: endDate }
    };
  }, [allTickets, showrooms, technicians, startDate, endDate]);

  const selectedExpertData = useMemo(() => {
    if (!selectedTechId) return null;
    return stats.technicianFinancials.find(t => t.id === selectedTechId);
  }, [selectedTechId, stats.technicianFinancials]);

  const handleStrategicReport = async () => {
    setIsGenerating(true);
    addNotification({ title: 'Génération de l\'audit', message: 'Compilation des flux financiers et techniques...', type: 'info' });
    
    const aiPayload = {
      periode: { debut: startDate, fin: endDate },
      global: { 
        ca_total: stats.totalRev, 
        marge_totale: stats.totalMargin, 
        volume_global: stats.totalInterventions,
        taux_marge_global: stats.totalRev > 0 ? (stats.totalMargin / stats.totalRev) * 100 : 0
      },
      experts: stats.technicianFinancials.map(t => ({
        nom: t.name,
        ca: t.revenue,
        marge: t.margin,
        volume: t.tickets,
        clotures: t.closedTickets,
        rendement: t.marginRate
      })),
      showrooms: stats.showroomFinancials
    };

    try {
      const reportMarkdown = await generateStrategicReport(aiPayload);
      const htmlContent = marked.parse ? marked.parse(reportMarkdown || '') : (marked as any)(reportMarkdown || '');
      
      const newReport: StrategicReport = {
        id: `REP-${Date.now()}`,
        title: `Audit Stratégique ${new Date(startDate).toLocaleDateString('fr-FR', {month: 'long', year: 'numeric'})}`,
        content: htmlContent as string,
        startDate,
        endDate,
        createdAt: new Date().toISOString(),
        statsSnapshot: { totalRev: stats.totalRev, totalMargin: stats.totalMargin }
      };
      
      await saveReport(newReport);
      
      setAiReportHtml(htmlContent as string);
      setCurrentReportMeta({ start: startDate, end: endDate });
      setShowAiModal(true);
      addNotification({ title: 'Rapport Archivé', message: 'L\'audit a été sauvegardé dans l\'historique cloud.', type: 'success' });
    } catch (error) {
      console.error(error);
      addNotification({ title: 'Erreur IA', message: 'Impossible de générer le rapport analytique.', type: 'error' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleViewArchivedReport = (report: StrategicReport) => {
    setAiReportHtml(report.content);
    setCurrentReportMeta({ start: report.startDate, end: report.endDate });
    setShowAiModal(true);
  };

  const handleDownloadPDF = async () => {
    setIsExportingPDF(true);
    addNotification({ title: 'Impression PDF', message: 'Finalisation du document Office...', type: 'info' });
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await generatePDFFromElement('strategic-audit-content', `Audit_Plaza_Horizon_${startDate}.pdf`);
      addNotification({ title: 'Succès', message: 'Rapport exporté au format A4.', type: 'success' });
    } catch (err) {
      addNotification({ title: 'Erreur', message: 'Échec de la conversion PDF.', type: 'error' });
    } finally {
      setIsExportingPDF(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 relative">
      
      {(isGenerating || isExportingPDF) && (
        <div className="fixed inset-0 bg-[#202124]/70 backdrop-blur-md z-[10000] flex flex-col items-center justify-center cursor-wait">
          <div className="bg-white p-12 rounded-[40px] shadow-2xl flex flex-col items-center gap-8 max-w-md text-center">
             <div className="relative">
                <div className="relative bg-white p-6 rounded-full shadow-lg border border-[#f1f3f4]">
                  {isExportingPDF ? <FileDown size={64} className="text-[#1a73e8]" /> : <BrainCircuit size={64} className="text-[#1a73e8]" />}
                </div>
                <Loader2 size={100} className="text-[#1a73e8] animate-spin absolute -top-[18px] -left-[18px] opacity-10" />
             </div>
             <div className="space-y-3">
                <h2 className="text-2xl font-black text-[#202124] uppercase tracking-tight">
                  {isExportingPDF ? 'Préparation PDF' : 'Analyse Stratégique'}
                </h2>
                <p className="text-sm text-[#5f6368] font-medium leading-relaxed">
                  {isExportingPDF 
                    ? "Capture haute fidélité des tableaux et graphiques..." 
                    : "Gemini traite l'historique des opérations Plaza..."}
                </p>
             </div>
          </div>
        </div>
      )}

      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-normal text-[#3c4043]">Analytique Financière & Volume</h1>
          <p className="text-[#5f6368] text-sm">Gouvernance des flux Royal Plaza par showroom et expert.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 bg-white border border-[#dadce0] rounded-md px-3 h-10 shadow-sm">
            <Calendar size={14} className="text-[#1a73e8]" />
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="border-none p-0 text-xs font-bold focus:ring-0 w-28 h-auto bg-transparent" />
            <span className="text-[#bdc1c6] mx-1">au</span>
            <input type="date" value={endDate} className="border-none p-0 text-xs font-bold focus:ring-0 w-28 h-auto bg-transparent" onChange={e => setEndDate(e.target.value)} />
          </div>
          <button onClick={handleStrategicReport} disabled={isGenerating} className="btn-google-primary bg-gradient-to-r from-indigo-600 to-blue-600 border-none flex items-center gap-3 shadow-lg h-10 px-6">
             <Sparkles size={16} className="text-yellow-300" />
             <span className="font-bold text-xs uppercase tracking-widest">Audit Stratégique IA</span>
          </button>
        </div>
      </header>

      <div className="flex items-center gap-1 p-1 bg-[#f1f3f4] rounded-lg">
        {[
          { id: 'overview', label: 'Vue d\'ensemble', icon: <BarChart3 size={16}/> },
          { id: 'performance', label: 'Performance Élite', icon: <Award size={16}/> },
          { id: 'volume', label: 'Volume Expert', icon: <ClipboardList size={16}/> },
          { id: 'history', label: 'Historique Audits', icon: <History size={16}/> }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === tab.id 
                ? 'bg-white text-[#1a73e8] shadow-sm' 
                : 'text-[#5f6368] hover:bg-white/50'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="space-y-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { label: 'Revenu Brut Période', value: `${stats.totalRev.toLocaleString()} FCFA`, icon: <DollarSign size={20}/>, color: '#1a73e8' },
                { label: 'Marge Nette Réelle', value: `${stats.totalMargin.toLocaleString()} FCFA`, icon: <TrendingUp size={20}/>, color: '#34a853' },
                { label: 'Taux de Marge Moyen', value: `${stats.totalRev > 0 ? ((stats.totalMargin/stats.totalRev)*100).toFixed(1) : 0}%`, icon: <Wallet size={20}/>, color: '#fbbc04' },
              ].map((s, i) => (
                <div key={i} className="google-card p-6 border-l-4" style={{ borderColor: s.color }}>
                  <p className="text-[#5f6368] text-[10px] font-black uppercase tracking-[0.2em]">{s.label}</p>
                  <h3 className="text-xl font-bold text-[#3c4043] mt-2 tracking-tight">{s.value}</h3>
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
               <div className="google-card p-8">
                  <h2 className="text-sm font-black uppercase tracking-widest text-[#3c4043] mb-8 flex items-center gap-2"><Map size={18} className="text-[#1a73e8]" /> Profit par Showroom</h2>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ReChartsBarChart data={stats.showroomFinancials}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f3f4" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#5f6368', fontSize: 11, fontWeight: 'bold'}} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#5f6368', fontSize: 11}} />
                        <Tooltip formatter={(value: number) => `${value.toLocaleString()} FCFA`} />
                        <Bar dataKey="revenue" name="CA Brut" fill="#1a73e8" radius={[4, 4, 0, 0]} barSize={30} />
                        <Bar dataKey="margin" name="Marge Nette" fill="#34a853" radius={[4, 4, 0, 0]} barSize={30} />
                      </ReChartsBarChart>
                    </ResponsiveContainer>
                  </div>
               </div>
               <div className="google-card p-8">
                  <h2 className="text-sm font-black uppercase tracking-widest text-[#3c4043] mb-8 flex items-center gap-2"><PieIcon size={18} className="text-[#1a73e8]" /> Structure des Coûts</h2>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ReChartsBarChart data={stats.breakdownData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f3f4" />
                        <XAxis type="number" axisLine={false} tickLine={false} tick={{fill: '#5f6368', fontSize: 10}} />
                        <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#3c4043', fontSize: 11, fontWeight: 'bold'}} width={100} />
                        <Tooltip formatter={(value: number) => `${value.toLocaleString()} FCFA`} />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={32}>
                          {stats.breakdownData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                        </Bar>
                      </ReChartsBarChart>
                    </ResponsiveContainer>
                  </div>
               </div>
            </div>
          </div>
        )}

        {activeTab === 'performance' && (
          <section className="google-card overflow-hidden">
            <div className="p-8">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#dadce0] text-[#5f6368] font-black uppercase tracking-widest text-[9px]">
                    <th className="pb-4">Expert Royal Plaza</th>
                    <th className="pb-4 text-center">Clôtures</th>
                    <th className="pb-4 text-right">CA Brut</th>
                    <th className="pb-4 text-right">Marge Nette</th>
                    <th className="pb-4 text-right">Taux de Rendement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#dadce0]">
                  {stats.technicianFinancials.map(tech => (
                    <tr 
                      key={tech.id} 
                      onClick={() => setSelectedTechId(tech.id)}
                      className={`hover:bg-[#e8f0fe] transition-all cursor-pointer group active:bg-[#d2e3fc] ${selectedTechId === tech.id ? 'bg-[#e8f0fe]' : ''}`}
                    >
                      <td className="py-4 px-2 font-black text-[#3c4043]">
                         <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-full bg-[#f1f3f4] flex items-center justify-center text-[#5f6368] border border-[#dadce0]">
                             <User size={14} />
                           </div>
                           {tech.name}
                         </div>
                      </td>
                      <td className="py-4 text-center font-bold text-[#5f6368]">{tech.closedTickets}</td>
                      <td className="py-4 text-right font-bold text-[#1a73e8]">{tech.revenue.toLocaleString()} FCFA</td>
                      <td className={`py-4 text-right font-bold ${tech.margin < 0 ? 'text-red-600' : 'text-[#34a853]'}`}>{tech.margin.toLocaleString()} FCFA</td>
                      <td className="py-4 text-right pr-4">
                        <div className="flex items-center justify-end gap-3">
                          <span className={`px-3 py-1 rounded-full font-black text-[10px] ${tech.marginRate > 40 ? 'bg-green-100 text-green-700' : 'bg-blue-50 text-blue-700'}`}>
                            {tech.marginRate.toFixed(1)}%
                          </span>
                          <ChevronRight size={16} className="text-[#dadce0] group-hover:text-[#1a73e8] transition-all" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeTab === 'volume' && (
          <section className="google-card overflow-hidden">
            <div className="p-8">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#dadce0] text-[#5f6368] font-black uppercase tracking-widest text-[9px]">
                    <th className="pb-4">Expert Royal Plaza</th>
                    <th className="pb-4 text-center">Interventions Total</th>
                    <th className="pb-4 text-center">Taux de Résolution</th>
                    <th className="pb-4 text-right">État du flux</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#dadce0]">
                  {stats.technicianFinancials.map(tech => (
                    <tr 
                      key={tech.id} 
                      onClick={() => setSelectedTechId(tech.id)}
                      className={`hover:bg-[#f8f9fa] cursor-pointer group transition-all active:bg-[#f1f3f4] ${selectedTechId === tech.id ? 'bg-[#e8f0fe]' : ''}`}
                    >
                      <td className="py-4 px-2 font-black text-[#3c4043]">
                         <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-full bg-[#f1f3f4] flex items-center justify-center text-[#5f6368] border border-[#dadce0]"><User size={14} /></div>
                           {tech.name}
                         </div>
                      </td>
                      <td className="py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                           <span className="text-lg font-black text-[#3c4043]">{tech.tickets}</span>
                           <Activity size={14} className="text-[#1a73e8]" />
                        </div>
                      </td>
                      <td className="py-4 text-center">
                        <div className="w-24 mx-auto bg-gray-100 h-1.5 rounded-full overflow-hidden">
                           <div className="h-full bg-[#1a73e8]" style={{ width: `${tech.tickets > 0 ? (tech.closedTickets / tech.tickets) * 100 : 0}%` }} />
                        </div>
                        <p className="text-[8px] font-black text-[#5f6368] mt-1 uppercase">{tech.tickets > 0 ? ((tech.closedTickets/tech.tickets)*100).toFixed(0) : 0}% Clôturés</p>
                      </td>
                      <td className="py-4 text-right pr-4">
                        <div className="flex items-center justify-end gap-3">
                           <span className="text-[10px] font-bold text-[#34a853] flex items-center justify-end gap-1"><CheckCircle2 size={12} /> Flux Opérationnel</span>
                           <ChevronRight size={16} className="text-[#dadce0] group-hover:text-[#1a73e8] transition-all" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeTab === 'history' && (
          <div className="space-y-4">
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {reports.map(report => (
                  <div key={report.id} className="google-card group hover:border-[#1a73e8] transition-all p-6 relative">
                     <div className="flex justify-between items-start mb-6">
                        <div className="w-12 h-12 bg-blue-50 text-[#1a73e8] rounded-2xl flex items-center justify-center">
                           <FileText size={24} />
                        </div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); if(window.confirm('Supprimer ce rapport des archives ?')) deleteReport(report.id); }}
                          className="p-2 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-full transition-all"
                        >
                           <Trash2 size={18} />
                        </button>
                     </div>
                     <div className="space-y-1 mb-6">
                        <h3 className="text-sm font-black text-[#3c4043] uppercase tracking-tight line-clamp-1">{report.title}</h3>
                        <p className="text-[10px] text-gray-400 font-bold uppercase flex items-center gap-1">
                           <CalendarDays size={10} /> Généré le {new Date(report.createdAt).toLocaleDateString()}
                        </p>
                     </div>
                     <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                        <div className="flex flex-col">
                           <p className="text-[9px] font-black text-gray-400 uppercase">Marge Période</p>
                           <p className="text-xs font-black text-green-700">{report.statsSnapshot?.totalMargin?.toLocaleString() || '--'} F</p>
                        </div>
                        <button 
                          onClick={() => handleViewArchivedReport(report)}
                          className="flex items-center gap-2 px-4 py-2 bg-[#f1f3f4] text-[#3c4043] rounded-lg text-[10px] font-black uppercase tracking-widest group-hover:bg-[#1a73e8] group-hover:text-white transition-all shadow-sm"
                        >
                           Consulter <Eye size={12} />
                        </button>
                     </div>
                  </div>
                ))}
             </div>
             {reports.length === 0 && (
               <div className="py-20 text-center google-card">
                  <History size={48} className="mx-auto text-gray-200 mb-4" />
                  <p className="text-sm text-gray-400 font-bold uppercase tracking-widest">Aucun audit archivé</p>
                  <p className="text-[10px] text-gray-300 mt-1 uppercase">Les rapports générés apparaîtront ici automatiquement.</p>
               </div>
             )}
          </div>
        )}
      </div>

      <Modal 
        isOpen={!!selectedExpertData} 
        onClose={() => setSelectedTechId(null)} 
        title={`Analyse Performance : ${selectedExpertData?.name}`}
        size="lg"
      >
        {selectedExpertData && (
          <div className="space-y-10 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="p-6 bg-gradient-to-br from-blue-50 to-white border border-blue-100 rounded-[24px] shadow-sm">
                  <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest mb-2">Chiffre d'Affaires</p>
                  <div className="flex items-baseline gap-2">
                     <span className="text-3xl font-black text-blue-900">{selectedExpertData.revenue.toLocaleString()}</span>
                     <span className="text-xs font-bold text-blue-400">FCFA</span>
                  </div>
               </div>
               <div className="p-6 bg-gradient-to-br from-green-50 to-white border border-green-100 rounded-[24px] shadow-sm">
                  <p className="text-[10px] font-black text-green-700 uppercase tracking-widest mb-2">Marge Nette</p>
                  <div className="flex items-baseline gap-2">
                     <span className="text-3xl font-black text-green-900">{selectedExpertData.margin.toLocaleString()}</span>
                     <span className="text-xs font-bold text-green-400">FCFA</span>
                  </div>
               </div>
            </div>

            <section className="space-y-6">
               <div className="flex items-center justify-between">
                  <h4 className="text-[11px] font-black text-[#9aa0a6] uppercase tracking-[0.2em] flex items-center gap-2">
                     <History size={18} className="text-[#1a73e8]" /> Journal Exhaustif de la Période
                  </h4>
                  <span className="px-3 py-1 bg-[#f1f3f4] text-[#5f6368] text-[10px] font-black rounded-full uppercase">
                     {selectedExpertData.detailedTickets.length} Dossiers
                  </span>
               </div>
               
               <div className="space-y-4">
                  {selectedExpertData.detailedTickets.map(ticket => (
                    <div key={ticket.id} className="p-6 bg-white border border-[#dadce0] rounded-3xl hover:border-[#1a73e8] hover:shadow-md transition-all group">
                       <div className="flex justify-between items-start mb-4">
                          <div>
                             <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] font-black text-[#1a73e8] uppercase bg-blue-50 px-2 py-0.5 rounded border border-blue-100">#{ticket.id}</span>
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{ticket.category}</span>
                             </div>
                             <h5 className="text-sm font-black text-[#3c4043]">{ticket.customerName}</h5>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border ${
                            ticket.status === 'Résolu' || ticket.status === 'Fermé' 
                              ? 'bg-green-50 text-green-700 border-green-100' 
                              : 'bg-amber-50 text-amber-600 border-amber-100'
                          }`}>
                            {ticket.status}
                          </span>
                       </div>
                       
                       <div className="p-4 bg-[#f8f9fa] rounded-2xl border border-transparent group-hover:border-[#f1f3f4] transition-all">
                          <p className="text-[10px] text-[#9aa0a6] font-black uppercase mb-2">Objet du Dossier</p>
                          <p className="text-xs text-[#5f6368] leading-relaxed font-medium italic">"{ticket.description}"</p>
                       </div>

                       {ticket.financials && (
                          <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
                             <div className="flex flex-col">
                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Profit Net</span>
                                <span className="text-sm font-black text-green-700">+{ticket.financials.netMargin.toLocaleString()} F</span>
                             </div>
                             <div className="flex flex-col text-right">
                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Montant Client</span>
                                <span className="text-sm font-black text-[#1a73e8]">{ticket.financials.grandTotal.toLocaleString()} F</span>
                             </div>
                          </div>
                       )}
                    </div>
                  ))}
               </div>
            </section>
            <div className="pt-6 border-t">
              <button 
                onClick={() => setSelectedTechId(null)}
                className="w-full btn-google-outlined justify-center py-4 text-xs font-black uppercase tracking-widest"
              >
                Fermer l'Analyse Expert
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal 
        isOpen={showAiModal} 
        onClose={() => setShowAiModal(false)} 
        title="Visionneur de Gouvernance Horizon" 
        size="full"
      >
        <div className="bg-[#202124] min-h-screen -m-6 p-12 flex flex-col items-center overflow-y-auto custom-scrollbar">
          
          <div className="fixed top-20 right-10 z-[120] flex flex-col gap-3 no-print">
             <button 
               onClick={handleDownloadPDF} 
               disabled={isExportingPDF}
               className="w-14 h-14 bg-[#1a73e8] text-white rounded-full shadow-2xl hover:scale-110 transition-all flex items-center justify-center group"
               title="Exporter en PDF"
             >
                {isExportingPDF ? <Loader2 className="animate-spin" /> : <FileDown size={24} />}
             </button>
             <button 
               onClick={() => setShowAiModal(false)}
               className="w-14 h-14 bg-white/10 text-white backdrop-blur-md border border-white/20 rounded-full shadow-2xl hover:bg-white hover:text-[#202124] transition-all flex items-center justify-center"
               title="Fermer"
             >
                <X size={24} />
             </button>
          </div>

          <div 
            id="strategic-audit-content" 
            className="bg-white shadow-[0_0_100px_rgba(0,0,0,0.5)] p-[60px] min-h-[1123px] w-[794px] overflow-visible relative flex flex-col box-border animate-in slide-in-from-bottom-8 duration-700"
          >
             <div className="flex items-center justify-between border-b-2 border-gray-100 pb-12 mb-12">
                <div className="space-y-1">
                   <p className="text-[16px] font-black text-blue-700 tracking-[0.3em] uppercase">Royal Plaza Gabon</p>
                   <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Audit de Gouvernance Opérationnelle</p>
                </div>
                <div className="text-right">
                   <p className="text-[11px] font-black text-gray-700 uppercase tracking-tight">Période : {currentReportMeta ? new Date(currentReportMeta.start).toLocaleDateString() : 'N/A'} - {currentReportMeta ? new Date(currentReportMeta.end).toLocaleDateString() : 'N/A'}</p>
                   <p className="text-[10px] font-bold text-gray-400 uppercase">Généré par Horizon Intelligence</p>
                </div>
             </div>

             <div className="mb-14">
                <h2 className="text-[15pt] font-black text-blue-900 uppercase tracking-widest mb-8 border-l-4 border-blue-600 pl-5">I. Synthèse Financière Réelle</h2>
                <div className="grid grid-cols-3 gap-6">
                   <div className="p-6 bg-blue-50 border border-blue-100 rounded-2xl">
                      <p className="text-[10px] font-black text-blue-400 uppercase mb-2">Chiffre d'Affaires Brut</p>
                      <p className="text-[18px] font-black text-blue-900">{stats.totalRev.toLocaleString()} FCFA</p>
                   </div>
                   <div className="p-6 bg-green-50 border border-green-100 rounded-2xl">
                      <p className="text-[10px] font-black text-green-400 uppercase mb-2">Marge Nette de l'Activité</p>
                      <p className="text-[18px] font-black text-blue-900">{stats.totalMargin.toLocaleString()} FCFA</p>
                   </div>
                   <div className="p-6 bg-amber-50 border border-amber-100 rounded-2xl">
                      <p className="text-[10px] font-black text-amber-400 uppercase mb-2">Performance Marge</p>
                      <p className="text-[18px] font-black text-amber-900">{stats.totalRev > 0 ? ((stats.totalMargin/stats.totalRev)*100).toFixed(1) : 0}%</p>
                   </div>
                </div>
             </div>

             <div className="mb-14">
                <div className="flex items-center gap-3 mb-6">
                   <Award className="text-blue-600" size={24} />
                   <h3 className="text-[12pt] font-black text-gray-800 uppercase tracking-widest">II. Rendement Individuel Experts</h3>
                </div>
                <table className="w-full text-left border-collapse">
                   <thead>
                      <tr className="bg-gray-100 border-y border-gray-200 text-[10px] font-black text-gray-500 uppercase">
                         <th className="px-5 py-3">Expert Technique</th>
                         <th className="px-5 py-3 text-center">Clôtures</th>
                         <th className="px-5 py-3 text-right">CA Brut</th>
                         <th className="px-5 py-3 text-right">Marge Net</th>
                         <th className="px-5 py-3 text-right">Rendement</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100 text-[11px]">
                      {stats.technicianFinancials.map(tech => (
                        <tr key={tech.id}>
                           <td className="px-5 py-3 font-bold text-gray-800">{tech.name}</td>
                           <td className="px-5 py-3 text-center font-medium">{tech.closedTickets}</td>
                           <td className="px-5 py-3 text-right font-bold text-blue-700">{tech.revenue.toLocaleString()} F</td>
                           <td className="px-5 py-3 text-right font-bold text-green-700">{tech.margin.toLocaleString()} F</td>
                           <td className="px-5 py-3 text-right font-black text-gray-900">{tech.marginRate.toFixed(1)}%</td>
                        </tr>
                      ))}
                   </tbody>
                </table>
             </div>

             <div className="mt-10 border-t-4 border-blue-900/10 pt-14 flex-1">
                <div className="flex items-center gap-4 mb-10">
                   <BrainCircuit className="text-indigo-600" size={32} />
                   <h2 className="text-[15pt] font-black text-indigo-900 uppercase tracking-widest">III. Audit Stratégique Gemini</h2>
                </div>
                <div 
                  className="office-report-content max-w-none text-[12pt] leading-[1.7]"
                  dangerouslySetInnerHTML={{ __html: aiReportHtml }}
                />
             </div>
             
             <div className="mt-20 pt-10 border-t border-gray-100 flex justify-between items-center opacity-40 shrink-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Document Certifié Horizon v2.7 • Confidentiel Plaza</p>
                <div className="flex items-center gap-4">
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Page 1 / 1</p>
                  <img src="https://ui-avatars.com/api/?name=RP&background=1a73e8&color=fff" className="w-6 h-6 rounded" alt="" />
                </div>
             </div>
          </div>

          <div className="h-20 shrink-0" />
        </div>
      </Modal>
    </div>
  );
}
