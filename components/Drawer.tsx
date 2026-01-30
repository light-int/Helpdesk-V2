
import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
}

const Drawer: React.FC<DrawerProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  subtitle, 
  icon, 
  children, 
  footer,
  width = '50%' 
}) => {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-[4px] animate-backdrop"
        onClick={onClose}
      />
      
      {/* Drawer Panel */}
      <div 
        className="absolute right-0 top-0 h-full bg-white shadow-[-25px_0_70px_-15px_rgba(0,0,0,0.3)] flex flex-col animate-royal-drawer w-full md:max-w-full"
        style={{ width: window.innerWidth < 768 ? '100%' : width, transition: 'width 0.3s ease-in-out' }}
      >
        {/* Header */}
        <div className="p-6 border-b border-[#dadce0] flex items-center justify-between bg-[#f8f9fa] shrink-0">
          <div className="flex items-center gap-4">
            {icon && (
              <div className="w-10 h-10 rounded-xl bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center border border-[#d2e3fc] shadow-sm">
                {icon}
              </div>
            )}
            <div>
              <h2 className="text-sm font-black text-[#202124] uppercase tracking-widest leading-none">{title}</h2>
              {subtitle && (
                <p className="text-[10px] text-[#5f6368] font-black uppercase tracking-[0.2em] mt-1.5">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-[#e8eaed] rounded-full text-[#5f6368] transition-all hover:rotate-90"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-white">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="p-6 border-t border-[#dadce0] bg-[#f8f9fa] shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.getElementById('modal-root')!
  );
};

export default Drawer;
