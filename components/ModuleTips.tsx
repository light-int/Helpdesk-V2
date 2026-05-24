
import React, { useState, useEffect } from 'react';
import { Lightbulb, X, ChevronRight, ChevronLeft, Sparkles } from 'lucide-react';

interface Tip {
  id: string;
  title: string;
  content: string;
  target?: string;
}

interface ModuleTipsProps {
  moduleName: string;
  tips: Tip[];
  storageKey: string;
}

export const ModuleTips: React.FC<ModuleTipsProps> = ({ moduleName, tips, storageKey }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);
  const [hasBeenDismissed, setHasBeenDismissed] = useState(false);

  useEffect(() => {
    // Vérifier si l'utilisateur a déjà vu les tips
    const dismissed = localStorage.getItem(`tips_dismissed_${storageKey}`);
    if (!dismissed) {
      setIsVisible(true);
    } else {
      setHasBeenDismissed(true);
    }
  }, [storageKey]);

  const handleDismiss = () => {
    localStorage.setItem(`tips_dismissed_${storageKey}`, 'true');
    setIsVisible(false);
    setHasBeenDismissed(true);
  };

  const handleNext = () => {
    setCurrentTipIndex((prev) => (prev + 1) % tips.length);
  };

  const handlePrev = () => {
    setCurrentTipIndex((prev) => (prev - 1 + tips.length) % tips.length);
  };

  const handleReopen = () => {
    setIsVisible(true);
    setIsMinimized(false);
  };

  if (!isVisible && hasBeenDismissed) {
    // Bouton flottant pour rouvrir les tips
    return (
      <button
        onClick={handleReopen}
        className="fixed bottom-6 left-72 z-40 p-3 bg-[#1c1c1c] text-white rounded-full shadow-lg border border-[#3ecf8e]/30 hover:scale-110 hover:shadow-xl transition-all duration-300 group"
        title="Conseils d'utilisation"
      >
        <Lightbulb size={18} className="group-hover:text-[#3ecf8e] transition-colors" />
      </button>
    );
  }

  if (!isVisible) return null;

  const currentTip = tips[currentTipIndex];

  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-6 left-72 z-40 px-4 py-2 bg-[#1c1c1c] text-white rounded-full shadow-lg border border-[#3ecf8e]/30 hover:scale-105 transition-all duration-300 flex items-center gap-2"
      >
        <Lightbulb size={14} className="text-[#3ecf8e]" />
        <span className="text-[12px] font-bold">Conseils</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 left-72 z-40 w-80 animate-sb-entry">
      <div className="bg-white rounded-2xl shadow-2xl border border-[#e5e5e5] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1c1c1c] to-[#2d2d2d] p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-[#3ecf8e]/20 rounded-lg">
              <Sparkles size={14} className="text-[#3ecf8e]" />
            </div>
            <div>
              <h4 className="text-[11px] font-semibold text-white uppercase tracking-wider">
                Guide {moduleName}
              </h4>
              <p className="text-[10px] text-white/60">
                Conseil {currentTipIndex + 1} sur {tips.length}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMinimized(true)}
              className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all"
              title="Minimiser"
            >
              <span className="text-lg leading-none">−</span>
            </button>
            <button
              onClick={handleDismiss}
              className="p-1.5 text-white/60 hover:text-white hover:bg-red-500/20 rounded-lg transition-all"
              title="Fermer définitivement"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <h5 className="text-[13px] font-bold text-[#1c1c1c] mb-2 flex items-center gap-2">
            <span 
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: '#3ecf8e' }}
            />
            {currentTip.title}
          </h5>
          <p className="text-[12px] text-[#686868] leading-relaxed">
            {currentTip.content}
          </p>
          {currentTip.target && (
            <p className="text-[10px] text-[#3ecf8e] mt-2 font-semibold">
              → {currentTip.target}
            </p>
          )}
        </div>

        {/* Footer / Navigation */}
        <div className="px-4 py-3 bg-[#f8f9fa] border-t-[3px] border-[#e5e5e5] flex items-center justify-between">
          <button
            onClick={handlePrev}
            className="p-1.5 text-[#686868] hover:text-[#1c1c1c] hover:bg-white rounded-lg transition-all disabled:opacity-50"
            disabled={tips.length <= 1}
          >
            <ChevronLeft size={16} />
          </button>

          {/* Indicateurs de progression */}
          <div className="flex items-center gap-1.5">
            {tips.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentTipIndex(index)}
                className={`
                  h-1.5 rounded-full transition-all duration-300
                  ${index === currentTipIndex 
                    ? 'w-6 bg-[#3ecf8e]' 
                    : 'w-1.5 bg-[#d1d1d1] hover:bg-[#9ca3af]'
                  }
                `}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            className="p-1.5 text-[#686868] hover:text-[#1c1c1c] hover:bg-white rounded-lg transition-all disabled:opacity-50"
            disabled={tips.length <= 1}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModuleTips;
