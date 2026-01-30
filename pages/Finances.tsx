
import { useMemo, useState, useEffect } from 'react';
import { 
  TrendingUp, DollarSign, Activity, Sparkles, BrainCircuit, X,
  PieChart as PieIcon, BarChart3, Wallet, Map, Calendar,
  ClipboardList, Award, CheckCircle2, User, ChevronRight, 
  FileText, Loader2, FileDown, History, Trash2, CalendarDays, Eye,
  Package, Tag, Hash, Info, Briefcase, ArrowUpRight, LayoutDashboard,
  Layers, ShoppingCart, AlertCircle, TrendingDown, RefreshCw, SlidersHorizontal
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
  const { tickets: allTickets, showrooms, technicians, reports, saveReport, deleteReport, refreshAll, isLoading } = useData();
  const { addNotification } = useNotifications();
  
  const [activeTab, setActiveTab] = useState<'overview' | 'performance' | 'showrooms' | 'archives'>('overview');
  const [aiReportHtml, setAiReportHtml] = useState<string>('');
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
  
  useEffect(() => { refreshAll(); }, []);

  const stats = useMemo(() => {
    const filteredByDate = (allTickets || []).filter(t => {
      const ticketDate = t.createdAt.split('T')[0];
      return ticketDate >= startDate && ticketDate <= endDate;
    });

    const financialTickets = filteredByDate.filter(t => 
      t.financials && (t.status === 'Résolu' || t.status === 'Fermé')
    );
    
    const totalRev = financialTickets.reduce((acc, curr) => acc + (curr.financials?.grandTotal || 0), 0);
    const totalMargin = financialTickets.reduce((acc, curr) => acc + (curr.financials?.netMargin || 0), 0);
    
    const technicianFinancials = (technicians || []).map(tech => {
      const techTickets = filteredByDate.filter(t => t.assignedTechnicianId === tech.id);
      const closedOnPeriod = techTickets.filter(t => t.status === 'Résolu' || t.status === 'Fermé');
      const revenue = closedOnPeriod.reduce((acc, t) => acc + (t.financials?.grandTotal || 0), 0);
      const margin = closedOnPeriod.reduce((acc, t) => acc + (t.financials?.netMargin || 0), 0);
      return {
        id: tech.id, name: tech.name, avatar: tech.avatar,
        revenue, margin,
        closedTickets: closedOnPeriod.length,
        marginRate: revenue !== 0 ? (margin / revenue) * 100 : 0,
        detailedTickets: techTickets
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

    return { totalRev, totalMargin, technicianFinancials, trendData, count: financialTickets.length };
  }, [allTickets, showrooms, technicians, startDate, endDate]);

  const handleStrategicReport = async () => {
    if (!aiReady) return;
    setIsGenerating(true);
    addNotification({ title: 'Analyse IA', message: 'Compilation stratégique en cours...', type: 'info' });
    
    const aiPayload = {
      global: { ca: stats.totalRev, marge: stats.totalMargin, volume: stats.count },
      experts: stats.technicianFinancials.slice(0, 5)
    };

    try {
      const reportMarkdown = await generateStrategicReport(aiPayload);
      const htmlContent = marked.parse(reportMarkdown || '');
      const newReport: StrategicReport = {
        id: `REP-${Date.now()}`,
        title: `Audit Analytique Horizon - ${new Date().toLocaleDateString('fr-FR')}`,
        content: htmlContent as string,
        startDate, endDate,
        createdAt: new Date().toISOString()
      };
      await saveReport(newReport);
      setAiReportHtml(htmlContent as string);
      setShowAiModal(true);
    } catch (error) {
      addNotification({ title: 'Erreur IA', message: 'Échec de la génération analytique.', type: 'error' });
    } finally { setIsGenerating(false); }
  };

  const handleDownloadPDF = async () => {
    setIsExportingPDF(true);
    try {
      await generatePDFFromElement('strategic-audit-content', `Audit_Horizon_${new Date().getTime()}.pdf`);
    } catch (error) {
      addNotification({ title: 'Export PDF', message: 'Erreur lors de la génération.', type: 'error' });
    } finally { setIsExportingPDF(false); }
  };

  if (isLoading) return <div className="h-[80vh] flex items-center justify-center"><RefreshCw className="animate-spin text-[#1a73e8]" size={32} /></div>;

  return (
    <div className="space-y-8 animate-page-entry pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-light text-[#202124]">Performance Financière</h1>
          <p className="text-[10px] text-[#5f6368] font-black uppercase tracking-widest mt-1">Pilotage de la rentabilité Royal Plaza Horizon</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-3 bg-white border border-[#dadce0] px-4 h-11 shadow-sm">
            <Calendar size={14} className="text-[#1a73e8]" />
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="border-none p-0 text-[11px] font-black uppercase bg-transparent" />
            <span className="text-[#bdc1c6] font-bold">/</span>
            <input type="date" value={endDate} className="border-none p-0 text-[11px] font-black uppercase bg-transparent" onChange={e => setEndDate(e.target.value)} />
          </div>
          <button onClick={handleStrategicReport} disabled={isGenerating || !aiReady} className={`btn-google-primary h-11 px-6 shadow-xl ${aiReady ? 'shadow-blue-600/10' : 'bg-gray-400 opacity-60'}`}>
             <Sparkles size={18} className={isGenerating ? 'animate-pulse' : ''} /> <span>Audit IA</span>
          </button>
        </div>
      </header>

      <div className="flex items-center bg-[#f1f3f4] p-1 w-fit shadow-inner">
        {['overview', 'performance', 'archives'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab as any)} className={`px-8 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-white text-[#1a73e8] shadow-md' : 'text-[#5f6368] hover:text-[#202124]'}`}>
            {tab === 'overview' ? 'Synthèse' : tab === 'performance' ? 'Top Experts' : 'Archives'}
          </button>
        ))}
      </div>

      <div className="space-y-10">
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-in fade-in">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { label: 'Revenu Certifié', value: stats.totalRev, color: '#1a73e8', icon: <DollarSign size={20}/> },
                { label: 'Bénéfice Net', value: stats.totalMargin, color: '#188038', icon: <TrendingUp size={20}/> },
                { label: 'Indice Rentabilité', value: `${stats.totalRev > 0 ? ((stats.totalMargin/stats.totalRev)*100).toFixed(1) : 0}%`, color: '#f9ab00', icon: <Activity size={20}/> },
              ].map((s, i) => (
                <div key={i} className="stats-card border-b-4" style={{ borderBottomColor: s.color }}>
                   <p className="text-[10px] font-black text-[#5f6368] uppercase tracking-widest mb-1">{s.label}</p>
                   <h3 className="text-3xl font-bold text-[#202124] tracking-tight">{typeof s.value === 'number' ? s.value.toLocaleString() + ' F' : s.value}</h3>
                </div>
              ))}
            </div>
            <div className="google-card p-10 bg-white shadow-xl ring-1 ring-black/5">
               <h2 className="text-[11px] font-black text-[#3c4043] uppercase tracking-[0.2em] mb-10 flex items-center gap-3"><TrendingUp size={20} className="text-[#1a73e8]" /> Histogramme des Flux Cloud</h2>
               <div className="h-[400px]">
                 <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats.trendData}>
                      <defs>
                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#1a73e8" stopOpacity={0.1}/><stop offset="95%" stopColor="#1a73e8" stopOpacity={0}/></linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f3f4" />
                      <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#9aa0a6', fontSize: 10, fontWeight: 'bold'}} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#9aa0a6', fontSize: 10}} />
                      <Tooltip contentStyle={{border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', borderRadius: '0'}} />
                      <Area type="monotone" dataKey="revenue" stroke="#1a73e8" strokeWidth={4} fillOpacity={1} fill="url(#colorRev)" />
                    </AreaChart>
                 </ResponsiveContainer>
               </div>
            </div>
          </div>
        )}

        {activeTab === 'performance' && (
           <div className="google-card overflow-hidden shadow-xl animate-in slide-in-from-top-4">
             <table className="w-full text-left">
                <thead className="bg-[#f8f9fa] border-b text-[9px] font-black uppercase text-gray-400 tracking-[0.2em]">
                   <tr>
                      <th className="px-10 py-6">Expert Horizon</th>
                      <th className="px-10 py-6 text-center">Clôtures</th>
                      <th className="px-10 py-6 text-right">Revenue Brut</th>
                      <th className="px-10 py-6 text-right">Indice Marge</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-[#dadce0]">
                   {stats.technicianFinancials.map((tech) => (
                      <tr key={tech.id} className="hover:bg-[#f8faff] transition-all">
                         <td className="px-10 py-6">
                            <div className="flex items-center gap-4">
                               <img src={tech.avatar} className="w-11 h-11 border-2 border-white shadow-sm" alt="" />
                               <div><p className="text-sm font-black text-[#3c4043]">{tech.name}</p><p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Technicien Élite</p></div>
                            </div>
                         </td>
                         <td className="px-10 py-6 text-center font-black text-sm">{tech.closedTickets}</td>
                         <td className="px-10 py-6 text-right text-sm font-black text-[#1a73e8]">{tech.revenue.toLocaleString()} F</td>
                         <td className="px-10 py-6 text-right">
                            <div className="flex items-center justify-end gap-4">
                               <div className="w-24 h-1.5 bg-gray-100 overflow-hidden"><div className="h-full bg-blue-600 transition-all duration-1000" style={{ width: `${tech.marginRate}%` }} /></div>
                               <span className="text-[10px] font-black text-[#202124]">{tech.marginRate.toFixed(1)}%</span>
                            </div>
                         </td>
                      </tr>
                   ))}
                </tbody>
             </table>
           </div>
        )}

        {activeTab === 'archives' && (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in zoom-in-95">
              {reports.map(r => (
                 <div key={r.id} className="google-card p-8 hover:border-[#1a73e8] transition-all cursor-pointer group bg-white shadow-xl ring-1 ring-black/5" onClick={() => { setAiReportHtml(r.content); setShowAiModal(true); }}>
                    <div className="flex justify-between items-start mb-8">
                       <div className="p-4 bg-blue-50 text-[#1a73e8] border border-blue-100 group-hover:bg-[#1a73e8] group-hover:text-white transition-colors shadow-sm"><FileText size={32} /></div>
                       <button onClick={(e) => { e.stopPropagation(); if(window.confirm('Archiver définitivement ?')) deleteReport(r.id); }} className="p-2 text-gray-200 hover:text-red-600 transition-all"><Trash2 size={20}/></button>
                    </div>
                    <h3 className="text-base font-black uppercase text-[#202124] line-clamp-2 leading-tight tracking-tight">{r.title}</h3>
                    <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-50">
                       <div className="flex items-center gap-2 text-[9px] font-black text-gray-400 uppercase tracking-widest"><Calendar size={12}/> {new Date(r.createdAt).toLocaleDateString()}</div>
                       <span className="text-[9px] font-black text-[#1a73e8] flex items-center gap-2 uppercase tracking-[0.2em] group-hover:translate-x-2 transition-transform">Consulter <ChevronRight size={14}/></span>
                    </div>
                 </div>
              ))}
           </div>
        )}
      </div>

      <Modal isOpen={showAiModal} onClose={() => setShowAiModal(false)} title="Audit Stratégique Horizon" size="full">
         <div className="bg-[#202124] min-h-screen -m-10 p-16 flex flex-col items-center overflow-y-auto">
            <div className="fixed top-20 right-14 z-[120] flex gap-4">
               <button onClick={handleDownloadPDF} disabled={isExportingPDF} className="w-14 h-14 bg-[#1a73e8] text-white shadow-2xl flex items-center justify-center hover:scale-110 transition-all">
                 {isExportingPDF ? <Loader2 size={24} className="animate-spin" /> : <FileDown size={28} />}
               </button>
               <button onClick={() => setShowAiModal(false)} className="w-14 h-14 bg-white/10 text-white flex items-center justify-center hover:bg-white/30 transition-all shadow-2xl backdrop-blur-md"><X size={28}/></button>
            </div>
            <div id="strategic-audit-content" className="bg-white p-[80px] min-h-[1123px] w-[850px] shadow-2xl office-report-content animate-in zoom-in-95 relative" dangerouslySetInnerHTML={{ __html: aiReportHtml }} />
         </div>
      </Modal>
    </div>
  );
}
