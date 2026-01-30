
import { useMemo, useState, useEffect } from 'react';
import { 
  TrendingUp, DollarSign, Activity, Sparkles, BrainCircuit, X,
  PieChart as PieIcon, BarChart3, Wallet, Map, Calendar,
  ClipboardList, Award, CheckCircle2, User, ChevronRight, 
  FileText, Loader2, FileDown, History, Trash2, CalendarDays, Eye,
  Package, Tag, Hash, Info, Briefcase, ArrowUpRight, LayoutDashboard,
  Layers, ShoppingCart, AlertCircle
} from 'lucide-react';
import { 
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, 
  BarChart as ReChartsBarChart, Bar, Cell, PieChart, Pie, AreaChart, Area 
} from 'recharts';
import { useData, useNotifications } from '../App';
import { generateStrategicReport, isAiOperational } from '../services/geminiService';
import { generatePDFFromElement } from '../services/pdfService';
import { marked } from 'marked';
import { StrategicReport } from '../types';
import Modal from '../components/Modal';
import Drawer from '../components/Drawer';

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
  
  const aiReady = isAiOperational();

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

    const trendData = financialTickets.reduce((acc: any[], t) => {
      const day = t.createdAt.split('T')[0];
      const existing = acc.find(item => item.day === day);
      if (existing) {
        existing.revenue += (t.financials?.grandTotal || 0);
        existing.margin += (t.financials?.netMargin || 0);
      } else {
        acc.push({ day, revenue: (t.financials?.grandTotal || 0), margin: (t.financials?.netMargin || 0) });
      }
      return acc;
    }, []).sort((a, b) => a.day.localeCompare(b.day));

    return { 
      totalRev, totalMargin, count: financialTickets.length, 
      totalInterventions: filteredByDate.length,
      breakdownData, showroomFinancials, technicianFinancials,
      trendData, dateRange: { start: startDate, end: endDate }
    };
  }, [allTickets, showrooms, technicians, startDate, endDate]);

  const selectedExpertData = useMemo(() => {
    if (!selectedTechId) return null;
    return stats.technicianFinancials.find(t => t.id === selectedTechId);
  }, [selectedTechId, stats.technicianFinancials]);

  const handleStrategicReport = async () => {
    if (!aiReady) {
      addNotification({ title: 'IA Inactive', message: 'Le service d\'audit nécessite une configuration Cloud.', type: 'warning' });
      return;
    }
    setIsGenerating(true);
    addNotification({ title: 'Génération de l\'audit', message: 'Compilation des flux financiers...', type: 'info' });
    
    const aiPayload = {
      periode: { debut: startDate, fin: endDate },
      global: { ca_total: stats.totalRev, marge_totale: stats.totalMargin },
      experts: stats.technicianFinancials.map(t => ({ nom: t.name, ca: t.revenue, marge: t.margin })),
      showrooms: stats.showroomFinancials
    };

    try {
      const reportMarkdown = await generateStrategicReport(aiPayload);
      const htmlContent = marked.parse(reportMarkdown || '');
      
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
      addNotification({ title: 'Rapport Archivé', message: 'Audit sauvegardé dans le cloud.', type: 'success' });
    } catch (error) {
      addNotification({ title: 'Erreur IA', message: 'Échec de la génération analytique.', type: 'error' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadPDF = async () => {
    setIsExportingPDF(true);
    addNotification({ title: 'Export PDF', message: 'Préparation du document...', type: 'info' });
    try {
      await generatePDFFromElement('strategic-audit-content', `Audit_Plaza_${startDate}_${endDate}.pdf`);
      addNotification({ title: 'Succès', message: 'Rapport téléchargé.', type: 'success' });
    } catch (error) {
      addNotification({ title: 'Erreur', message: 'Échec de la génération PDF.', type: 'error' });
    } finally {
      setIsExportingPDF(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 relative">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-normal text-[#3c4043]">Analytique Financière</h1>
          <p className="text-[#5f6368] text-sm">Pilotage financier et rentabilité Royal Plaza.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 bg-white border border-[#dadce0] rounded-xl px-4 h-11 shadow-sm">
            <Calendar size={14} className="text-[#1a73e8]" />
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="border-none p-0 text-xs font-black focus:ring-0 w-28 h-auto bg-transparent" />
            <span className="text-[#bdc1c6] mx-1">au</span>
            <input type="date" value={endDate} className="border-none p-0 text-xs font-black focus:ring-0 w-28 h-auto bg-transparent" onChange={e => setEndDate(e.target.value)} />
          </div>
          <button 
            onClick={handleStrategicReport} 
            disabled={isGenerating} 
            className={`btn-google-primary shadow-lg h-11 ${aiReady ? 'shadow-blue-600/10' : 'bg-gray-400 cursor-not-allowed opacity-60'}`}
          >
             <Sparkles size={16} className={isGenerating ? 'animate-pulse' : ''} /> {aiReady ? 'Audit IA' : 'IA Inactive'}
          </button>
        </div>
      </header>

      <div className="flex items-center gap-1 p-1 bg-[#f1f3f4] rounded-2xl w-fit">
        {['overview', 'performance', 'volume', 'history'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === tab ? 'bg-white text-[#1a73e8] shadow-sm' : 'text-[#5f6368] hover:bg-[#e8eaed]'
            }`}
          >
            {tab === 'overview' ? 'Vue d\'ensemble' : tab === 'performance' ? 'Top Experts' : tab === 'volume' ? 'Showrooms' : 'Archives'}
          </button>
        ))}
      </div>

      <div className="space-y-8">
        {activeTab === 'overview' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { label: 'Revenu Brut', value: stats.totalRev, color: '#1a73e8', icon: <DollarSign size={20}/> },
                { label: 'Marge Nette', value: stats.totalMargin, color: '#34a853', icon: <TrendingUp size={20}/> },
                { label: 'Rendement', value: `${stats.totalRev > 0 ? ((stats.totalMargin/stats.totalRev)*100).toFixed(1) : 0}%`, color: '#fbbc04', icon: <Activity size={20}/> },
              ].map((s, i) => (
                <div key={i} className="google-card p-6 border-b-4 flex items-center justify-between" style={{ borderColor: s.color }}>
                  <div>
                    <p className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest">{s.label}</p>
                    <h3 className="text-2xl font-bold text-[#3c4043] mt-2">{typeof s.value === 'number' ? s.value.toLocaleString() + ' F' : s.value}</h3>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-2xl text-gray-400">{s.icon}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 google-card p-8">
                 <h2 className="text-sm font-black text-[#3c4043] uppercase tracking-widest mb-8 flex items-center gap-3">
                   <TrendingUp size={18} className="text-[#1a73e8]" /> Tendance des Flux
                 </h2>
                 <div className="h-[350px]">
                   <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={stats.trendData}>
                        <defs>
                          <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#1a73e8" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#1a73e8" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f3f4" />
                        <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#5f6368', fontSize: 10}} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#5f6368', fontSize: 10}} />
                        <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)'}} />
                        <Area type="monotone" dataKey="revenue" stroke="#1a73e8" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                        <Area type="monotone" dataKey="margin" stroke="#34a853" strokeWidth={3} fill="transparent" />
                      </AreaChart>
                   </ResponsiveContainer>
                 </div>
              </div>

              <div className="google-card p-8 flex flex-col">
                 <h2 className="text-sm font-black text-[#3c4043] uppercase tracking-widest mb-8 flex items-center gap-3">
                   <PieIcon size={18} className="text-[#1a73e8]" /> Structure des Coûts
                 </h2>
                 <div className="flex-1 min-h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={stats.breakdownData}
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {stats.breakdownData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                 </div>
                 <div className="space-y-3 mt-4">
                    {stats.breakdownData.map((d, i) => (
                      <div key={i} className="flex items-center justify-between">
                         <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                            <span className="text-xs font-bold text-[#5f6368]">{d.name}</span>
                         </div>
                         <span className="text-xs font-black text-[#3c4043]">{d.value.toLocaleString()} F</span>
                      </div>
                    ))}
                 </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'performance' && (
           <div className="google-card overflow-hidden">
             <div className="px-8 py-5 border-b bg-[#f8f9fa] flex items-center justify-between">
                <h2 className="text-xs font-black text-[#5f6368] uppercase tracking-widest">Classement Rentabilité Experts</h2>
                <div className="flex items-center gap-2">
                   <span className="text-[10px] font-bold text-gray-400">BASÉ SUR {stats.count} CLÔTURES</span>
                </div>
             </div>
             <table className="w-full text-left">
                <thead className="bg-white border-b text-[10px] font-black uppercase text-gray-400">
                   <tr>
                      <th className="px-8 py-5">Expert Technique</th>
                      <th className="px-8 py-5 text-center">Volume traité</th>
                      <th className="px-8 py-5 text-right">CA Généré</th>
                      <th className="px-8 py-5 text-right">Marge Nette</th>
                      <th className="px-8 py-5 text-right">Performance</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-[#dadce0] text-sm">
                   {stats.technicianFinancials.map((tech, idx) => (
                      <tr key={tech.id} onClick={() => setSelectedTechId(tech.id)} className="hover:bg-[#f8faff] cursor-pointer group transition-all">
                         <td className="px-8 py-5">
                            <div className="flex items-center gap-4">
                               <span className="text-xs font-black text-gray-300 w-4">{idx + 1}</span>
                               <img src={tech.avatar} className="w-10 h-10 rounded-full border shadow-sm" alt="" />
                               <div>
                                  <p className="font-bold text-[#3c4043] group-hover:text-[#1a73e8]">{tech.name}</p>
                                  <p className="text-[10px] font-bold text-gray-400 uppercase">Expert Horizon</p>
                               </div>
                            </div>
                         </td>
                         <td className="px-8 py-5 text-center">
                            <span className="px-3 py-1 rounded-full bg-gray-100 text-[10px] font-black">{tech.closedTickets}</span>
                         </td>
                         <td className="px-8 py-5 text-right font-medium text-gray-500">{tech.revenue.toLocaleString()} F</td>
                         <td className="px-8 py-5 text-right font-black text-[#1a73e8]">{tech.margin.toLocaleString()} F</td>
                         <td className="px-8 py-5 text-right">
                            <div className="flex items-center justify-end gap-3">
                               <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-[#1a73e8]" style={{ width: `${tech.marginRate}%` }} />
                                </div>
                               <span className="text-xs font-black text-[#3c4043] min-w-[40px]">{tech.marginRate.toFixed(1)}%</span>
                            </div>
                         </td>
                      </tr>
                   ))}
                </tbody>
             </table>
           </div>
        )}

        {activeTab === 'volume' && (
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="google-card p-8">
                 <h2 className="text-sm font-black text-[#3c4043] uppercase tracking-widest mb-8">CA par Showroom</h2>
                 <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                       <ReChartsBarChart data={stats.showroomFinancials} layout="vertical" margin={{left: 40}}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f3f4" />
                          <XAxis type="number" hide />
                          <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#3c4043', fontWeight: 'bold'}} />
                          <Tooltip cursor={{fill: '#f8f9fa'}} contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)'}} />
                          <Bar dataKey="revenue" fill="#1a73e8" radius={[0, 8, 8, 0]} barSize={32} />
                       </ReChartsBarChart>
                    </ResponsiveContainer>
                 </div>
              </div>

              <div className="google-card p-8">
                 <h2 className="text-sm font-black text-[#3c4043] uppercase tracking-widest mb-8">Performance des Sites</h2>
                 <div className="space-y-6">
                    {stats.showroomFinancials.map(s => (
                       <div key={s.name} className="p-6 bg-[#f8f9fa] rounded-3xl border border-transparent hover:border-[#dadce0] transition-all">
                          <div className="flex justify-between items-start mb-4">
                             <div>
                                <h4 className="text-sm font-black text-[#3c4043]">{s.name}</h4>
                                <p className="text-[10px] text-[#5f6368] font-bold uppercase">{s.tickets} Dossiers Traités</p>
                             </div>
                             <span className="text-xs font-black text-[#1a73e8]">{s.revenue.toLocaleString()} F</span>
                          </div>
                          <div className="flex items-center gap-4">
                             <div className="flex-1 h-3 bg-white border rounded-full overflow-hidden">
                                <div className="h-full bg-[#34a853]" style={{ width: `${(s.margin / (s.revenue || 1)) * 100}%` }} />
                             </div>
                             <span className="text-[10px] font-black text-[#34a853] uppercase">{((s.margin / (s.revenue || 1)) * 100).toFixed(0)}% Rent.</span>
                          </div>
                       </div>
                    ))}
                 </div>
              </div>
           </div>
        )}

        {activeTab === 'history' && (
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {reports.map(r => (
                 <div key={r.id} className="google-card p-6 hover:border-[#1a73e8] transition-all cursor-pointer group" onClick={() => { setAiReportHtml(r.content); setShowAiModal(true); }}>
                    <div className="flex justify-between items-start mb-4">
                       <div className="p-3 bg-blue-50 text-[#1a73e8] rounded-2xl group-hover:bg-[#1a73e8] group-hover:text-white transition-colors">
                          <FileText size={24} />
                       </div>
                       <button onClick={(e) => { e.stopPropagation(); deleteReport(r.id); }} className="p-2 text-red-100 hover:text-red-600 hover:bg-red-50 rounded-full transition-all"><Trash2 size={16}/></button>
                    </div>
                    <h3 className="text-sm font-black uppercase text-[#3c4043] line-clamp-2 leading-tight">{r.title}</h3>
                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-50">
                       <p className="text-[10px] text-gray-400 font-bold uppercase">{new Date(r.createdAt).toLocaleDateString()}</p>
                       <span className="text-[10px] font-black text-[#1a73e8] flex items-center gap-1">CONSULTER <ChevronRight size={12}/></span>
                    </div>
                 </div>
              ))}
           </div>
        )}
      </div>

      <Drawer
        isOpen={!!selectedExpertData}
        onClose={() => setSelectedTechId(null)}
        title={selectedExpertData?.name || ''}
        subtitle="Rapport de Performance Financière"
        icon={<Award size={20} />}
      >
        {selectedExpertData && (
          <div className="space-y-8">
            <div className="grid grid-cols-2 gap-4">
               <div className="p-5 bg-gradient-to-br from-blue-50 to-white border border-blue-100 rounded-[32px] shadow-sm">
                  <p className="text-[10px] font-black text-blue-700 uppercase mb-2 tracking-widest">CA Réalisé</p>
                  <p className="text-xl font-black text-blue-900">{selectedExpertData.revenue.toLocaleString()} F</p>
               </div>
               <div className="p-5 bg-gradient-to-br from-green-50 to-white border border-green-100 rounded-[32px] shadow-sm">
                  <p className="text-[10px] font-black text-green-700 uppercase mb-2 tracking-widest">Marge Net</p>
                  <p className="text-xl font-black text-green-900">{selectedExpertData.margin.toLocaleString()} F</p>
               </div>
            </div>

            <section className="space-y-4">
               <h4 className="text-[11px] font-black text-[#9aa0a6] uppercase tracking-[0.2em] flex items-center gap-2">
                  <History size={18} /> Historique des Opérations
               </h4>
               <div className="space-y-3">
                  {selectedExpertData.detailedTickets.map(ticket => (
                    <div key={ticket.id} className="p-5 bg-white border border-[#dadce0] rounded-3xl hover:border-[#1a73e8] hover:shadow-lg transition-all group">
                       <div className="flex justify-between items-start mb-3">
                          <div>
                             <span className="text-[10px] font-black text-[#1a73e8] uppercase bg-blue-50 px-2 py-0.5 rounded border border-blue-100">#{ticket.id}</span>
                             <h5 className="text-sm font-black text-[#3c4043] mt-1 line-clamp-1">{ticket.customerName}</h5>
                          </div>
                          <span className={`text-[9px] font-black uppercase px-2 py-1 rounded border ${ticket.status === 'Résolu' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>{ticket.status}</span>
                       </div>
                       <div className="p-3 bg-gray-50 rounded-xl mb-3">
                          <p className="text-[10px] text-gray-500 font-medium italic truncate">"{ticket.description}"</p>
                       </div>
                       {ticket.financials && (
                         <div className="flex items-center justify-between text-[10px] font-bold text-gray-400 pt-3 border-t border-gray-100">
                            <span className="flex items-center gap-1"><Package size={10}/> Marge : {ticket.financials.netMargin.toLocaleString()} F</span>
                            <span className="text-[#3c4043] font-black">{ticket.financials.grandTotal.toLocaleString()} F TTC</span>
                         </div>
                       )}
                    </div>
                  ))}
               </div>
            </section>
          </div>
        )}
      </Drawer>

      <Modal isOpen={showAiModal} onClose={() => setShowAiModal(false)} title="Audit de Gouvernance Horizon" size="full">
         <div className="bg-[#202124] min-h-screen -m-10 p-12 flex flex-col items-center overflow-y-auto">
            <div className="fixed top-20 right-10 z-[120] flex gap-3">
               <button 
                onClick={handleDownloadPDF} 
                disabled={isExportingPDF}
                className="w-12 h-12 bg-[#1a73e8] text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
               >
                 {isExportingPDF ? <Loader2 size={24} className="animate-spin" /> : <FileDown size={24} />}
               </button>
               <button onClick={() => setShowAiModal(false)} className="w-12 h-12 bg-white/20 text-white rounded-full flex items-center justify-center hover:bg-white/30 transition-all shadow-xl"><X size={24}/></button>
            </div>
            <div id="strategic-audit-content" className="bg-white p-[60px] min-h-[1123px] w-[794px] shadow-2xl office-report-content animate-in fade-in zoom-in-95 duration-500" dangerouslySetInnerHTML={{ __html: aiReportHtml }} />
         </div>
      </Modal>
    </div>
  );
}
