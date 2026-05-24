
import React, { useState } from 'react';
import { HelpCircle, X, Sparkles } from 'lucide-react';

interface SmallCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color?: string;
  tip?: string;
  tipTitle?: string;
  sub?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  onClick?: () => void;
  className?: string;
}

export const SmallCard: React.FC<SmallCardProps> = ({
  title,
  value,
  icon,
  color = '#3ecf8e',
  tip,
  tipTitle = 'Astuce',
  sub,
  trend,
  onClick,
  className = ''
}) => {
  const [showTip, setShowTip] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={`
        relative bg-white p-3 rounded-xl
        border border-[#e5e5e5]
        shadow-sm hover:shadow-md
        transition-all duration-200 ease-out
        hover-lift overflow-hidden group
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      <div className="relative flex flex-col h-full justify-between z-10">
        <div className="flex justify-between items-start mb-2">
          <div
            className={`
              w-7 h-7 rounded-lg flex items-center justify-center
              transition-transform group-hover:scale-110
            `}
            style={{
              color,
              backgroundColor: `${color}15`,
            }}
          >
            {React.cloneElement(icon as React.ReactElement, { size: 14 })}
          </div>

          {trend && (
            <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-semibold ${trend.isPositive ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
              {trend.isPositive ? '↑' : '↓'} {trend.value}%
            </div>
          )}
        </div>

        <div>
          <p className="text-[9px] font-semibold text-[#686868] uppercase tracking-[0.08em] mb-0.5">
            {title}
          </p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-base font-semibold text-[#1c1c1c] font-mono tracking-tight transition-all duration-200 group-hover:scale-105 origin-left">
              {value}
            </h3>
          </div>

          {sub && (
            <div className="flex items-center gap-1.5 mt-1">
              <div className="w-1 h-1 rounded-full" style={{ backgroundColor: color }}></div>
              <p className="text-[9px] text-[#9ca3af] font-semibold italic">{sub}</p>
            </div>
          )}
        </div>
      </div>

      {tip && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowTip(!showTip);
          }}
          className={`
            absolute top-2 right-2 p-1 rounded-lg
            transition-all duration-200 z-20
            ${showTip ? 'bg-[#3ecf8e] text-white' : 'text-gray-300 hover:text-[#3ecf8e] hover:bg-[#f0fdf4]'}
            opacity-0 group-hover:opacity-100
          `}
        >
          <HelpCircle size={12} />
        </button>
      )}

      {showTip && tip && (
        <div className="absolute inset-0 bg-[#1c1c1c]/95 backdrop-blur-sm z-30 p-4 flex flex-col animate-scale-in rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Sparkles size={11} className="text-[#3ecf8e]" />
              <span className="text-[9px] font-semibold uppercase tracking-widest text-[#3ecf8e]">{tipTitle}</span>
            </div>
            <button onClick={() => setShowTip(false)} className="p-1 hover:bg-white/10 rounded-full transition-colors text-white">
              <X size={12} />
            </button>
          </div>
          <p className="text-[10px] leading-relaxed text-gray-300 font-semibold">{tip}</p>
          <div className="mt-auto">
            <button onClick={() => setShowTip(false)} className="w-full py-1.5 bg-[#3ecf8e] text-[#1c1c1c] rounded-lg text-[9px] font-semibold uppercase tracking-widest">Compris</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SmallCard;
