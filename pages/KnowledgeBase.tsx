
import React, { useState } from 'react';
import { Search, BookOpen, ChevronRight, Star, Lightbulb, MessageCircle } from 'lucide-react';
import { FAQ_DATA } from '../constants';

const KnowledgeBase: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  
  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-m3-entry pb-20">
      <header className="text-center py-10">
        <h1 className="text-4xl font-normal text-[#1f1f1f]">Comment pouvons-nous vous aider ?</h1>
        <p className="text-[#747775] mt-4 max-w-lg mx-auto font-medium">Explorez le centre de ressources techniques Royal Plaza pour des solutions instantanées.</p>
        <div className="max-w-2xl mx-auto mt-10 relative">
           <Search className="absolute left-6 top-5 text-[#444746]" size={24} />
           <input 
            type="text" placeholder="Rechercher une solution..." 
            className="w-full pl-16 h-16 bg-white border border-[#c4c7c5] rounded-full text-lg shadow-sm focus:ring-2 focus:ring-[#0b57d0] transition-all"
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {['Maintenance', 'Garantie', 'Installation', 'Paiement'].map((cat) => (
          <button key={cat} className="md-card bg-white border border-[#e3e3e3] hover:border-[#0b57d0] flex flex-col items-center gap-4 transition-all group p-8">
            <div className="w-12 h-12 bg-[#f0f4f9] rounded-2xl flex items-center justify-center text-[#747775] group-hover:text-[#0b57d0] transition-colors"><BookOpen size={24} /></div>
            <span className="text-sm font-bold text-[#1f1f1f]">{cat}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xs font-bold text-[#444746] uppercase tracking-[0.2em] mb-6">Guides de résolution rapides</h2>
          {FAQ_DATA.map((article) => (
            <div key={article.id} className="md-card bg-white border border-[#e3e3e3] hover:bg-[#f8fafd] cursor-pointer flex items-center justify-between p-6">
              <div>
                <span className="text-[10px] font-black text-[#0b57d0] uppercase tracking-widest bg-[#d3e3fd] px-3 py-1 rounded-full">{article.category}</span>
                <h3 className="text-base font-bold text-[#1f1f1f] mt-3">{article.title}</h3>
                <p className="text-sm text-[#747775] mt-1 line-clamp-1">{article.content}</p>
              </div>
              <ChevronRight size={20} className="text-[#c4c7c5]" />
            </div>
          ))}
        </div>

        <div className="space-y-6">
          <div className="md-card bg-[#fff7e0] border-[#ffe082] p-8">
            <div className="flex items-center gap-3 text-[#b06000] mb-4">
              <Lightbulb size={24} />
              <h3 className="text-sm font-bold uppercase tracking-widest">Le saviez-vous ?</h3>
            </div>
            <p className="text-sm text-[#5f6368] leading-relaxed font-medium">
              Un entretien préventif tous les 6 mois augmente la durée de vie de vos climatiseurs Beko de 40%.
            </p>
          </div>

          <div className="md-card bg-white border border-[#e3e3e3] p-8 text-center">
            <div className="w-14 h-14 bg-[#d3e3fd] text-[#0b57d0] rounded-full flex items-center justify-center mx-auto mb-6"><MessageCircle size={32}/></div>
            <h3 className="text-lg font-bold text-[#1f1f1f]">Assistance Directe</h3>
            <p className="text-xs text-[#747775] mt-2 mb-8 font-medium">Nos agents sont disponibles via la passerelle WhatsApp pour des diagnostics complexes.</p>
            <button className="btn-md-primary w-full justify-center h-14">Ouvrir un chat</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeBase;
