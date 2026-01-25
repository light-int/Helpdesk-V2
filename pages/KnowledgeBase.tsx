
import React, { useState } from 'react';
import { Search, BookOpen, ChevronRight, Star, ExternalLink, Lightbulb, Filter } from 'lucide-react';
import { FAQ_DATA } from '../constants';

const KnowledgeBase: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  
  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 max-w-5xl mx-auto">
      <header className="text-center py-10 space-y-4">
        <h1 className="text-3xl font-normal text-[#3c4043]">Comment pouvons-nous vous aider ?</h1>
        <div className="max-w-xl mx-auto relative">
           <Search className="absolute left-4 top-3.5 text-[#5f6368]" size={20} />
           <input 
            type="text" 
            placeholder="Rechercher dans la base de connaissances..." 
            className="w-full pl-12 h-12 bg-white text-base shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {['Entretien', 'Utilisation', 'Garantie', 'Livraison'].map((cat) => (
          <button key={cat} className="google-card p-6 flex flex-col items-center gap-3 hover:bg-[#e8f0fe] hover:border-[#1a73e8] transition-all group">
            <div className="text-[#5f6368] group-hover:text-[#1a73e8]"><BookOpen size={24} /></div>
            <span className="text-sm font-medium text-[#3c4043]">{cat}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-8">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-base font-medium text-[#3c4043] mb-4">Articles récents</h2>
          {FAQ_DATA.map((article) => (
            <div key={article.id} className="google-card p-5 hover:bg-[#f1f3f4] cursor-pointer transition-colors group flex items-center justify-between">
              <div>
                <span className="text-[10px] font-medium text-[#1a73e8] uppercase tracking-wider">{article.category}</span>
                <h3 className="text-sm font-medium text-[#3c4043] mt-1">{article.title}</h3>
                <p className="text-xs text-[#5f6368] mt-2 line-clamp-1">{article.content}</p>
              </div>
              <ChevronRight size={18} className="text-[#dadce0] group-hover:text-[#1a73e8]" />
            </div>
          ))}
        </div>

        <div className="space-y-6">
          <div className="google-card p-6 bg-[#fff7e0] border-[#ffe082]">
            <div className="flex items-center gap-3 text-[#f57c00] mb-3">
              <Lightbulb size={20} />
              <h3 className="text-sm font-medium">Le saviez-vous ?</h3>
            </div>
            <p className="text-xs text-[#5f6368] leading-relaxed">
              Un entretien régulier des filtres de votre climatiseur LG permet de réduire votre consommation électrique jusqu'à 15%.
            </p>
          </div>

          <div className="google-card p-6 space-y-4">
            <h3 className="text-sm font-medium text-[#3c4043] flex items-center gap-2">
              <Star className="text-[#fbbc04]" size={18} fill="currentColor" /> Support direct
            </h3>
            <p className="text-xs text-[#5f6368]">
              Nos experts sont disponibles pour répondre à vos questions techniques via WhatsApp ou au showroom Glass.
            </p>
            <button className="btn-google-primary w-full justify-center">Contacter le support</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeBase;
